import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {blankState,buildEvent,balance,totals,validDate,today,classification,assert} from '../shared/domain';
import type {State,Tx,AccountType} from '../shared/types';

// Read-only conversion. Installation is a separate step after reconciliation.
export function importBudgety(path:string){
 const db=new DatabaseSync(path,{readOnly:true});
 try{
  assert(Object.values(db.prepare('PRAGMA integrity_check').get())[0]==='ok','Source database integrity check failed.');
  assert(!db.prepare('PRAGMA foreign_key_check').all().length,'Source database has broken references.');
  const tableNames=new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r=>r.name));
  const read=(name:string):any[]=>tableNames.has(name)?db.prepare(`SELECT * FROM ${name} ORDER BY id`).all():[];
  for(const name of ['recurring','recurring_log','budgets','paystubs'])assert(!read(name).length,`Nonempty ${name} needs a migration mapping before importing.`);
  const accounts=read('accounts'),transactions=read('transactions'),planned=read('planned_transactions'),categories=read('categories'),payees=read('payees'),goals=read('savings_goals');
  assert(accounts.length>0,'No accounts found.');
  const s=blankState(),now=new Date().toISOString(),sourceHash=createHash('sha256').update(readFileSync(path)).digest('hex');
  s.settings={...s.settings,demo:false,theme:'dark',autoPost:false};
  const base=(id:string)=>({id,version:1,createdAt:now,updatedAt:now});
  const aid=(id:any)=>'budgety-account-'+id,cid=(id:any)=>'budgety-category-'+id,pid=(id:any)=>'budgety-payee-'+id;
  const amount=(value:any)=>{const n=Number(value),c=Math.round(n*100);assert(Number.isFinite(n)&&Number.isSafeInteger(c)&&Math.abs(c/100-n)<0.000001,'Invalid source currency precision.');return c};
  const dates=transactions.map(t=>t.date).sort(),start=dates[0]||today();
  assert(validDate(start),'Invalid source start date.');
  const types:Record<string,AccountType>={checking:'CHECKING',savings:'SAVINGS',wallet:'WALLET',credit_card:'CREDIT_CARD',loan:'LOAN'};
  for(const a of accounts){assert(types[a.account_type],'Unsupported account type.');assert(!!a.is_budget_account===!['credit_card','loan'].includes(a.account_type),'Budget/debt flag conflicts with account type.');s.accounts.push({...base(aid(a.id)),name:a.name,type:types[a.account_type],institution:'',opening:amount(a.starting_balance),trackingStart:start,archived:false,order:s.accounts.length,everUsed:false,details:{budgety:{sourceId:a.id,minimumBalance:a.minimum_balance,warningBalance:a.warning_balance,monthlyLimitEnabled:!!a.monthly_limit_enabled,monthlyLimit:a.monthly_limit}}})}
  for(const c of categories)s.categories.push({...base(cid(c.id)),name:c.name,active:true});
  for(const p of payees)s.payees.push({...base(pid(p.id)),name:p.name,active:true});
  const ensureCategory=(t:any)=>{if(t.category_id!=null){assert(s.categories.some(c=>c.id===cid(t.category_id)),'Missing category.');return cid(t.category_id)}let c=s.categories.find(c=>c.id==='budgety-uncategorized');if(!c){c={...base('budgety-uncategorized'),name:'Uncategorized',active:true};s.categories.push(c)}return c.id};
  const ensurePayee=(t:any)=>{const existing=s.payees.find(p=>p.id===pid(t.payee_id))||s.payees.find(p=>p.name.toLowerCase()===(t.payee||'').trim().toLowerCase());if(existing)return existing.id;const name=String(t.payee||'Unknown payee').trim();const p={...base('budgety-payee-extra-'+s.payees.length),name,active:true};s.payees.push(p);return p.id};
  const input=(t:any)=>{assert(['expense','income','transfer'].includes(t.type),'Unsupported transaction type.');assert(validDate(t.date),'Invalid source transaction date.');const a=s.accounts.find(a=>a.id===aid(t.account_id));assert(a,'Missing source account.');const n=amount(t.amount);assert(n>0,'Non-positive source transaction requires review.');const d:any={date:t.date,accountId:a.id,amount:n,notes:t.notes||''};if(t.type==='transfer'){const dest=s.accounts.find(a=>a.id===aid(t.transfer_account_id));assert(dest&&a.id!==dest.id,'Transfer needs a distinct destination.');d.type=['LOAN','CREDIT_CARD'].includes(dest.type)?'DEBT_PAYMENT':'TRANSFER';d.toAccountId=dest.id;if(dest.type==='LOAN'){d.principal=n;d.interest=0;d.subtype='REGULAR'}}else{d.type=t.type.toUpperCase();d.payeeId=ensurePayee(t);d.categoryId=ensureCategory(t)}return d};
  const exceptions:any[]=[];
  for(const t of transactions){
   const recordId='budgety-transaction-'+t.id,goalAllocation=t.source_savings_goal_id!=null||t.destination_savings_goal_id!=null,unlinked=t.type==='transfer'&&t.transfer_account_id==null&&!goalAllocation;
   let e:Tx;
   if(goalAllocation||unlinked){assert(t.type==='transfer','Unexpected savings allocation type.');const reason=goalAllocation?'Budgety savings-goal allocation. This earmarked money already in the account; it did not change the account balance.':'Budgety transfer has no destination account. Only the original withdrawal is preserved; no destination balance has been invented.';assert(s.accounts.some(a=>a.id===aid(t.account_id))&&validDate(t.date),'Invalid historical reference.');e={...base(recordId),type:'TRANSFER',date:t.date,accountId:aid(t.account_id),amount:amount(t.amount),payee:t.payee||'Imported transfer',category:goalAllocation?'Savings goal allocation':'Transfers',notes:t.notes||'',status:'ACTIVE',entries:goalAllocation?[]:[{accountId:aid(t.account_id),amount:-amount(t.amount)}],imported:{source:'Budgety',recordId:t.id,original:t,readOnly:true,reason}};exceptions.push({id:recordId,sourceId:t.id,reason});}
   else{e=buildEvent(s,{...input(t),id:recordId});e.imported={source:'Budgety',recordId:t.id,original:t};if(t.type!=='transfer'){e.payee=t.payee||s.payees.find(p=>p.id===e.payeeId)!.name;e.category=t.category_id==null?'Uncategorized':categories.find(c=>c.id===t.category_id).name}}
   assert(e.entries.every(l=>Number.isSafeInteger(l.amount)),'Invalid imported entries.');s.events.push(e);for(const a of s.accounts)if(a.id===e.accountId||e.entries.some(l=>l.accountId===a.id))a.everUsed=true;
   s.revisions.push({id:recordId+'-import',entityId:e.id,entityType:'events',action:'import-budgety',before:null,after:e,at:now,actor:'budgety-import'});
  }
  const frequency:any={daily:['days',1],weekly:['weeks',1],biweekly:['weeks',2],monthly:['months',1],yearly:['years',1],annually:['years',1]};
  for(const p of planned){const f=p.is_recurring?frequency[p.frequency]:['days',1];assert(f,'Unsupported planned frequency.');const d=input(p);buildEvent(s,d,undefined,true);const rule:any={...base('budgety-planned-'+p.id),label:p.payee||'Imported scheduled item',template:d,start:p.date,unit:f[0],interval:f[1],mode:'FIXED',status:'ACTIVE',notifyDays:3,autoSplit:false,imported:{source:'Budgety',recordId:p.id,original:p}};delete rule.template.date;if(!p.is_recurring)rule.count=1;else if(p.remaining_occurrences!=null){assert(Number.isInteger(p.remaining_occurrences)&&p.remaining_occurrences>0,'Invalid remaining occurrences.');rule.count=p.remaining_occurrences}s.rules.push(rule);s.revisions.push({id:rule.id+'-import',entityId:rule.id,entityType:'rules',action:'import-budgety',before:null,after:rule,at:now,actor:'budgety-import'})}
  for(const g of goals){const a=s.accounts.find(a=>a.id===aid(g.account_id));assert(a,'Goal account missing.');const history=transactions.filter(t=>t.source_savings_goal_id===g.id||t.destination_savings_goal_id===g.id);const saved=amount(g.saved_amount)+history.reduce((sum,t)=>sum+(t.destination_savings_goal_id===g.id?amount(t.amount):0)-(t.source_savings_goal_id===g.id?amount(t.amount):0),0);a.details.importedSavingsGoals??=[];a.details.importedSavingsGoals.push({id:g.id,name:g.name,target:amount(g.target_amount),saved,targetDate:g.target_date,closed:!!g.is_closed,notes:g.notes,original:g,transactionIds:history.map(t=>'budgety-transaction-'+t.id)})}
  for(const a of accounts)s.accounts.find(v=>v.id===aid(a.id))!.archived=!!a.is_archived;
  for(const c of categories)s.categories.find(v=>v.id===cid(c.id))!.active=!c.is_archived;
  for(const p of payees){const label=s.payees.find(v=>v.id===pid(p.id))!;label.active=!p.manually_inactive||s.rules.some(r=>r.template.payeeId===label.id)}
  // Independent source balance calculation follows Budgety's ledger semantics.
  const reconciliation=accounts.map(a=>{const source=amount(a.starting_balance)+transactions.reduce((sum,t)=>{const n=amount(t.amount);if(t.type==='income'&&t.account_id===a.id)return sum+n;if(t.type==='expense'&&t.account_id===a.id)return sum-n;if(t.type==='transfer'&&t.source_savings_goal_id==null&&t.destination_savings_goal_id==null)return sum-(t.account_id===a.id?n:0)+(t.transfer_account_id===a.id?n:0);return sum},0);const imported=balance(s,aid(a.id));assert(source===imported,`Account ${a.id} balance mismatch.`);return {sourceId:a.id,name:a.name,sourceCents:source,importedCents:imported,differenceCents:imported-source}});
  assert(s.events.length===transactions.length&&s.rules.length===planned.length,'Record count mismatch.');
  const sourceSpent=transactions.filter(t=>t.type==='expense').reduce((n,t)=>n+amount(t.amount),0),importedSpent=s.events.reduce((n,e)=>n+classification(e).spent,0);
  return {state:s,report:{sourceHash,importedAt:now,counts:{accounts:s.accounts.length,transactions:s.events.length,scheduled:s.rules.length,sourcePayees:payees.length,payees:s.payees.length,categories:s.categories.length,savingsGoals:goals.length},reconciliation,totals:totals(s),exceptions,reporting:{sourceSpentCents:sourceSpent,balancebookSpentCents:importedSpent,note:'Balancebook includes loan principal payments in Spent. Budgety classified those as transfers. Separate source interest expenses remain separate.'},savingsGoalNote:'Savings allocations are preserved as reference records, not additional cash accounts. Available Funds sums the actual account balances.'}};
 }finally{db.close()}
}
