import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCSV} from '../server/csv';
import {matchItems} from '../server/documents';
import {blankState} from '../shared/domain';

test('Discover purchases, refunds and payments use ledger signs and match the correct activity',()=>{
 const csv='Trans. Date,Post Date,Description,Amount,Category\n08/01/2026,08/02/2026,Shop,43.40,Restaurants\n08/04/2026,08/06/2026,Shop,-43.40,Refund\n08/14/2026,08/14/2026,Payment,-711.70,Payments';
 const parsed=parseCSV(csv);assert.deepEqual(parsed.issues,[]);assert.equal(parsed.format,'Discover');assert.equal(parsed.invertAmount,true);
 assert.deepEqual(parsed.items.map(i=>i.amount),[-4340,4340,71170]);
 const s=blankState();s.events=[
  {id:'purchase',status:'ACTIVE',date:'2026-08-01',payee:'Shop',entries:[{accountId:'card',amount:-4340}]},
  {id:'refund',status:'ACTIVE',date:'2026-08-04',payee:'Shop',entries:[{accountId:'card',amount:4340}]},
  {id:'payment',status:'ACTIVE',date:'2026-08-14',payee:'Payment',entries:[{accountId:'card',amount:71170}]}
 ] as any;
 assert.deepEqual(matchItems(s,'card',parsed.items).map(i=>i.suggestions[0]?.id),['purchase','refund','payment']);
 assert.deepEqual(parseCSV(csv,{invertAmount:false}).items.map(i=>i.amount),[4340,-4340,-71170]);
 assert.equal(parseCSV('Date,Description,Amount\n08/01/2026,Income,43.40').items[0].amount,4340);
});

test('Arrow metadata, signed debits, quoted merchant memo and bank IDs survive preview',()=>{
 const csv='"Account Name : Test"\r\n"Account Number : XXXX0000"\r\n"Date Range : 08/11/2026-09/09/2026"\r\nTransaction Number,Date,Description,Memo,Amount Debit,Amount Credit,Balance,Check Number,Fees  \r\nabc,08/28/2026,Purchase,"Store, town",-12.34,,100,,\r\ndef,08/28/2026,Payroll,,,50.00,150,,\r\n';
 const p=parseCSV(csv);assert.deepEqual(p.issues,[]);assert.equal(p.metadata.length,3);assert.deepEqual(p.items.map(i=>i.amount),[-1234,5000]);assert.equal(p.items[0].description,'Purchase · Store, town');assert.equal(p.items[0].sourceId,'abc');assert.equal(p.items[0].sourceRow,5);assert.equal(p.items[0].date,'2026-08-28');
});
test('invalid, ambiguous and repeated source rows are reported instead of silently posted',()=>{
 const p=parseCSV('Transaction ID,Date,Description,Debit,Credit\na,02/30/2026,Bad,10,\nb,08/20/2026,Both,10,2\nc,08/20/2026,Missing,,\nd,08/20/2026,Valid,2,\nd,08/20/2026,Duplicate,2,');
 assert.equal(p.items.length,1);assert.equal(p.issues.length,4);
});
test('signed amounts, parentheses, DMY mapping and explicit disabled columns',()=>{
 const p=parseCSV('Date,Description,Amount,Debit,Credit\n20/08/2026,Shop,"(1,234.56)",,',{dateFormat:'DMY'});assert.equal(p.items[0].amount,-123456);
 assert.equal(parseCSV('Date,Description,Amount\n08/20/2026,Card,10.00',{invertAmount:true}).items[0].amount,-1000);
 assert.equal(parseCSV('Date,Description,Amount,Debit,Credit\n08/20/2026,Shop,999,3,',{amount:''}).items[0].amount,-300);
 assert.equal(parseCSV('Date,Description\n08/20/2026,Shop').items.length,0);
});
test('repeated imports recognize a linked bank ID only for the same account and active amount',()=>{
 const s=blankState();s.events=[{id:'tx',status:'ACTIVE',date:'2026-08-20',payee:'Shop',entries:[{accountId:'a',amount:-1000}]} as any];
 s.reconciliations=[{accountId:'a',items:[{sourceId:'bank1',status:'LINKED',linkedTransactionId:'tx'}]} as any];
 const row={sourceId:'bank1',date:'2026-08-20',amount:-1000,status:'UNMATCHED',description:'Shop'};const before=JSON.stringify(s);
 assert.equal(matchItems(s,'a',[row])[0].status,'LINKED');assert.equal(matchItems(s,'b',[row])[0].status,'UNMATCHED');assert.equal(matchItems(s,'a',[{...row,amount:-2000}])[0].status,'UNMATCHED');assert.equal(JSON.stringify(s),before);
});
