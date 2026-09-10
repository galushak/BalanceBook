import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import Fastify from 'fastify';
import {Store} from '../server/store';
import {PlaidVault,collectSync,publishPlaid,registerPlaid} from '../server/plaid';
import {blankState} from '../shared/domain';
test('pagination restarts from original cursor and returns a complete batch',async()=>{
 let calls=0;const cursors:any[]=[];const result=await collectSync(async(_p,b)=>{cursors.push(b.cursor);calls++;if(calls===2)throw Object.assign(new Error('changed'),{plaidCode:'TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION'});return {added:[{transaction_id:String(calls)}],modified:[],removed:[],next_cursor:calls===1||calls===3?'page2':'done',has_more:calls===1||calls===3};},'secret','start');
 assert.deepEqual(cursors,['start','page2','start','page2']);assert.equal(result.cursor,'done');assert.deepEqual(result.changes.map(c=>c.t.transaction_id),['3','4']);
});
test('posted bank data is review only, idempotent, and changes/removals preserve ledger',()=>{
 const s:any=blankState();s.accounts=[{id:'a',archived:false}];
 const t={transaction_id:'t',account_id:'remote',amount:12.34,date:'2026-09-01',name:'Shop',pending:false,iso_currency_code:'USD'};
 const item:any={itemId:'bank',mapping:{remote:'a'},published:{},transactions:{t:{t,removed:false},pending:{t:{...t,transaction_id:'pending',pending:true}}}};
 let r=publishPlaid(s,item);assert.equal(r.count,1);assert.equal(r.state.events.length,0);assert.equal(r.state.reconciliations[0].items[0].amount,-1234);assert.equal(publishPlaid(r.state,item).count,0);
 const row=r.state.reconciliations[0].items[0];row.status='LINKED';row.linkedTransactionId='ledger';r.state.events=[{id:'ledger',status:'ACTIVE',entries:[{accountId:'a',amount:-1234}]}];const before=JSON.stringify(r.state.events);
 item.transactions.t={t:{...t,amount:15},removed:false};r=publishPlaid(r.state,item);assert.match(r.state.reconciliations[0].items[0].providerWarning,/updated/);assert.equal(JSON.stringify(r.state.events),before);
 item.transactions.t.removed=true;r=publishPlaid(r.state,item);assert.match(r.state.reconciliations[0].items[0].providerWarning,/removed/);assert.equal(JSON.stringify(r.state.events),before);
});
test('private encrypted tokens, mapping checks, cursor rollback and API sync retries',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'bb-plaid-')),store=new Store(dir),app=Fastify();let fail=false;
 store.setMeta('owner',{email:'test@example.com'});let s=store.state();s.accounts=[{id:'a',archived:false} as any];store.save(s);
 registerPlaid(app,store,async(path,body)=>{
  if(path==='/item/public_token/exchange')return {item_id:'bank',access_token:'PRIVATE_ACCESS_TOKEN'};
  if(path==='/accounts/get')return {accounts:[{account_id:'remote',name:'Checking',type:'depository',balances:{iso_currency_code:'USD'}}]};
  if(path==='/transactions/sync'){if(fail)throw new Error('network');return {added:[{transaction_id:'t',account_id:'remote',name:'Shop',date:'2026-09-01',amount:10,iso_currency_code:'USD'}],modified:[],removed:[],next_cursor:'cursor1',has_more:false};}
  if(path==='/item/remove')return {};
 });
 const post=async(path:string,payload:any)=>app.inject({method:'POST',url:'/api/v1/plaid/'+path,payload});
 try{
  assert.equal((await post('config',{clientId:'a'.repeat(24),secret:'TEST_SECRET_NOT_REAL_12345',environment:'sandbox'})).statusCode,200);
  assert.equal((await post('exchange',{publicToken:'public-test-1234'})).statusCode,200);await post('exchange',{publicToken:'public-test-1234'});
  await post('accounts',{itemId:'bank'});assert.equal((await post('map',{itemId:'bank',mapping:{remote:'a'}})).statusCode,200);
  fail=true;assert.equal((await post('sync',{itemId:'bank'})).statusCode,500);assert.equal(new PlaidVault(store).get('items',[])[0].cursor,undefined);assert.equal(store.state().reconciliations.length,0);
  fail=false;assert.equal((await post('sync',{itemId:'bank'})).json().count,1);assert.equal((await post('sync',{itemId:'bank'})).json().count,0);
  const status=(await app.inject('/api/v1/plaid')).body;assert.ok(!status.includes('PRIVATE_ACCESS_TOKEN'));assert.ok(!JSON.stringify(store.state()).includes('PRIVATE_ACCESS_TOKEN'));assert.ok(!readFileSync(join(dir,'balancebook.sqlite')).includes(Buffer.from('PRIVATE_ACCESS_TOKEN')));
  await post('disconnect',{itemId:'bank'});assert.equal((await app.inject('/api/v1/plaid')).json().items.length,0);assert.equal(store.state().reconciliations.length,1);
 }finally{await app.close();store.close();rmSync(dir,{recursive:true,force:true});}
});
test('selected-account pulls leave other account rows unpublished until selected',()=>{const s:any=blankState();s.accounts=[{id:'a'},{id:'b'}];const make=(account_id:string)=>({t:{transaction_id:account_id,account_id,amount:10,date:'2026-09-01',name:'Shop',iso_currency_code:'USD'}});const item:any={itemId:'bank',mapping:{ra:'a',rb:'b'},published:{},transactions:{ra:make('ra'),rb:make('rb')}};let r=publishPlaid(s,item,'a');assert.equal(r.count,1);assert.equal(r.state.reconciliations[0].accountId,'a');assert.equal(item.published.rb,undefined);r=publishPlaid(r.state,item,'b');assert.equal(r.count,1);assert.equal(r.state.reconciliations.length,2);assert.equal(publishPlaid(r.state,item,'a').count,0);assert.equal(r.state.events.length,0);});
test('deleted reviews are recreated once with saved ledger links, completed reviews stay in history',()=>{const s:any=blankState();s.accounts=[{id:'a'}];const item:any={itemId:'bank',mapping:{remote:'a'},published:{},transactions:{t:{t:{transaction_id:'t',account_id:'remote',amount:10,date:'2026-09-01',name:'Shop',iso_currency_code:'USD'}}}};let r=publishPlaid(s,item);const session=r.state.reconciliations[0];session.status='COMPLETE';assert.equal(publishPlaid(r.state,item).count,0);session.items[0].status='LINKED';session.items[0].linkedTransactionId='existing';r.state.events=[{id:'existing',status:'ACTIVE',entries:[{accountId:'a',amount:-1000}]}];r.state.revisions.push({entityType:'reconciliations',action:'delete',before:structuredClone(session)});r.state.reconciliations=[];const before=JSON.stringify(r.state.events);r=publishPlaid(r.state,item);assert.equal(r.count,1);assert.equal(r.state.reconciliations[0].items[0].linkedTransactionId,'existing');assert.equal(JSON.stringify(r.state.events),before);assert.equal(publishPlaid(r.state,item).count,0);});
