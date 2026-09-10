import test from 'node:test';
import assert from 'node:assert/strict';
import {blankState,balance,buildEvent,classification,occurrences,applyMutation} from '../shared/domain';
import {importAccounts,importTransactions,resolveBankMatch,linkStream,repairPaymentSplit} from '../server/plaid-first';

const remote=(current=100)=>({account_id:'remote',name:'Bank checking',type:'depository',subtype:'checking',balances:{current,available:current-10,iso_currency_code:'USD'}});
const bankTx=(overrides:any={})=>({transaction_id:'p',account_id:'remote',amount:10,date:'2026-09-01',name:'Amazon',merchant_name:'Amazon',pending:true,iso_currency_code:'USD',...overrides});
function fixture(){const s:any=blankState(),item:any={itemId:'item',accounts:[],mapping:{},transactions:{}};importAccounts(s,item,[remote()]);s.payees.push({id:'p',name:'Amazon',active:true});s.categories.push({id:'c',name:'Shopping',active:true});return {s,item,a:item.mapping.remote};}
function manual(s:any,a:string,payee='p'){const e=buildEvent(s,{type:'EXPENSE',date:'2026-09-01',accountId:a,amount:1000,payeeId:payee,categoryId:'c',notes:'Keep receipt'});s.events.push(e);return e;}
test('manual -> pending -> posted stays one transaction and subtracts exactly once',()=>{
 let {s,item,a}=fixture();const e=manual(s,a);assert.equal(e.settlement,'AWAITING_BANK');assert.equal(balance(s,a),9000);
 item.transactions.p={t:bankTx()};s=importTransactions(s,item).state;assert.equal(s.events.length,1);assert.equal(s.events[0].id,e.id);assert.equal(s.events[0].settlement,'BANK_PENDING');assert.equal(balance(s,a),9000);
 item.transactions.p.removed=true;item.transactions.posted={t:bankTx({transaction_id:'posted',pending:false,pending_transaction_id:'p'})};importAccounts(s,item,[remote(90)]);s=importTransactions(s,item).state;
 assert.equal(balance(s,a),9000);assert.equal(s.events.length,1);assert.equal(s.events[0].notes,'Keep receipt');assert.equal(s.events[0].category,'Shopping');assert.equal(s.events[0].settlement,'POSTED');assert.equal(importTransactions(s,item).count,0);
 assert.throws(()=>buildEvent(s,{...s.events[0],amount:1500},s.events[0]),/managed by sync/);
});
test('automatic accounts preserve explicit exclusions and historical balance comes from posted history',()=>{
 const {s,item,a}=fixture();item.accounts.push({id:'excluded'});delete item.firstMode;importAccounts(s,item,[remote(90),{...remote(500),account_id:'excluded'}]);assert.equal(s.accounts.length,1);
 item.transactions.posted={t:bankTx({pending:false})};const next=importTransactions(s,item).state;assert.equal(balance(next,a),9000);assert.equal(next.accounts[0].opening,10000);assert.equal(balance(next,a,'2026-09-01'),9000);assert.equal(next.events.length,1);
});
test('ambiguous matches are reviewable and resolving preserves manual metadata without duplicate balance',()=>{
 let {s,item,a}=fixture();s.payees.push({id:'other',name:'My Amazon purchase',active:true});const e=manual(s,a,'other');item.transactions.p={t:bankTx({pending:false})};importAccounts(s,item,[remote(90)]);s=importTransactions(s,item).state;
 const bank=s.events.find(v=>v.id!==e.id);assert.deepEqual(bank.bank.candidates,[e.id]);s=resolveBankMatch(s,bank.id,e.id);assert.equal(s.events.filter(v=>v.status==='ACTIVE').length,1);assert.equal(balance(s,a),9000);assert.equal(s.events.find(v=>v.id===e.id).notes,'Keep receipt');assert.equal(importTransactions(s,item).state.events.filter(v=>v.status==='ACTIVE').length,1);
});
test('removed authorization returns a manual purchase to awaiting bank while bank-only removal voids',()=>{
 let {s,item,a}=fixture();manual(s,a);item.transactions.p={t:bankTx()};s=importTransactions(s,item).state;item.transactions.p.removed=true;s=importTransactions(s,item).state;assert.equal(s.events[0].settlement,'AWAITING_BANK');assert.equal(balance(s,a),9000);
 const f=fixture();f.item.transactions.p={t:bankTx()};let n=importTransactions(f.s,f.item).state;f.item.transactions.p.removed=true;n=importTransactions(n,f.item).state;assert.equal(n.events[0].status,'VOIDED');assert.equal(balance(n,f.a),10000);
});
test('recurring link keeps rule overrides, applies loan split and fulfills without a second payment',()=>{
 let {s,item,a}=fixture();s.accounts.push({id:'loan',name:'Loan',type:'LOAN',opening:-50000,trackingStart:'2026-01-01',details:{}});s.rules.push({id:'r',version:1,label:'My loan',start:'2026-09-01',unit:'months',interval:1,mode:'FIXED',status:'ACTIVE',autoSplit:false,template:{type:'DEBT_PAYMENT',accountId:a,toAccountId:'loan',amount:1000,principal:800,interest:200,notes:'Keep split'}});
 item.streams=[{stream_id:'stream',account_id:'remote',transaction_ids:['p'],frequency:'MONTHLY',predicted_next_date:'2026-10-01'}];s=linkStream(s,item,'stream','r');item.transactions.p={t:bankTx({pending:false})};s=importTransactions(s,item).state;
 assert.equal(s.rules[0].label,'My loan');assert.equal(s.rules[0].template.principal,800);assert.equal(s.events.length,1);assert.equal(s.events[0].principal,800);assert.equal(balance(s,'loan'),-49200);assert.equal(occurrences(s,'2026-09-01')[0].status,'POSTED');assert.equal(linkStream(s,item,'stream').rules.length,1);
});
test('bank transfer categories do not inflate income and spending',()=>{
 const {s,item}=fixture();item.transactions.p={t:bankTx({pending:false,personal_finance_category:{primary:'TRANSFER_OUT'}})};const n=importTransactions(s,item).state;assert.deepEqual(classification(n.events[0]),{income:0,spent:0});
});
test('opposite bank transfer entries merge despite a wrong bank category, repeat without duplicates',()=>{
 let {s,item,a}=fixture();importAccounts(s,item,[remote(),{...remote(200),account_id:'savings',name:'Bank savings'}]);const b=item.mapping.savings;
 item.transactions.out={t:bankTx({transaction_id:'out',pending:false,name:'INTERNET TRANSFER TO SAVINGS',merchant_name:null,personal_finance_category:{primary:'LOAN_PAYMENTS'}})};
 item.transactions.in={t:bankTx({transaction_id:'in',pending:false,account_id:'savings',amount:-10,name:'INTERNET TRANSFER FROM CHECKING',merchant_name:null,personal_finance_category:{primary:'TRANSFER_IN'}})};
 s=importTransactions(s,item).state;assert.equal(s.events.filter(e=>e.status==='ACTIVE').length,1);const e=s.events.find(e=>e.status==='ACTIVE');assert.equal(e.type,'TRANSFER');assert.equal(e.bank.refs.length,2);assert.equal(balance(s,a),10000);assert.equal(balance(s,b),20000);assert.deepEqual(classification(e),{income:0,spent:0});assert.equal(importTransactions(s,item).count,0);
});
test('a manual purchase entered after import is offered for matching',()=>{
 let {s,item,a}=fixture();item.transactions.p={t:bankTx({pending:false})};s=importTransactions(s,item).state;const e=manual(s,a);s=importTransactions(s,item).state;const bank=s.events.find(v=>v.id!==e.id);assert.deepEqual(bank.bank.candidates,[e.id]);s=resolveBankMatch(s,bank.id,e.id);assert.equal(s.events.filter(e=>e.status==='ACTIVE').length,1);assert.equal(importTransactions(s,item).count,0);
});
test('a changed bank loan amount has a validated split repair and retains its occurrence',()=>{
 let {s,item,a}=fixture();s.accounts.push({id:'loan',name:'Loan',type:'LOAN',opening:-50000,trackingStart:'2026-01-01',details:{}});const e=buildEvent(s,{type:'DEBT_PAYMENT',date:'2026-09-01',accountId:a,toAccountId:'loan',amount:1000,principal:800,interest:200,occurrenceId:'rule:0'});s.events.push(e);item.transactions.p={t:bankTx({pending:false})};s=importTransactions(s,item).state;const bank=s.events.find(v=>v.id!==e.id);s=resolveBankMatch(s,bank.id,e.id);item.transactions.p.t.amount=11;s=importTransactions(s,item).state;
 assert.match(s.events.find(v=>v.id===e.id).bank.attention,/split/);assert.throws(()=>repairPaymentSplit(s,e.id,800,200),/must equal/);s=repairPaymentSplit(s,e.id,850,250);assert.equal(s.events.find(v=>v.id===e.id).amount,1100);assert.equal(s.events.find(v=>v.id===e.id).occurrenceId,'rule:0');assert.equal(s.events.find(v=>v.id===e.id).bank.attention,undefined);assert.equal(importTransactions(s,item).count,0);
});
