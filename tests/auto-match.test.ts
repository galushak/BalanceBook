import test from 'node:test';
import assert from 'node:assert/strict';
import {autoMatch} from '../shared/auto-match';
const event={id:'tx',status:'ACTIVE',type:'EXPENSE',date:'2026-08-01',payee:'Amazon',entries:[{accountId:'card',amount:-1000}]};
const row={id:'row',status:'UNMATCHED',date:'2026-08-02',amount:-1000,description:'AMAZON.COM*123 SEATTLE WA'};
const state={events:[event],reconciliations:[],payees:[]};
const session={id:'session',status:'OPEN',accountId:'card',items:[row],tolerance:3};
test('unique matching merchant, signed amount, account and nearby date link without ledger edits',()=>{
 const before=JSON.stringify(state);const result=autoMatch(state,session);
 assert.equal(result.items[0].linkedTransactionId,'tx');assert.equal(result.items[0].autoMatched,true);assert.equal(JSON.stringify(state),before);assert.equal(session.items[0].status,'UNMATCHED');
});
test('ambiguous, competing, wrong merchant, sign, account, stale date and undone matches remain unresolved',()=>{
 for(const patch of [{description:'Other store'},{amount:1000},{date:'2026-08-09'},{autoMatchDisabled:true}])assert.equal(autoMatch(state,{...session,items:[{...row,...patch}]}).items[0].status,'UNMATCHED');
 assert.equal(autoMatch(state,{...session,accountId:'other'}).items[0].status,'UNMATCHED');
 assert.ok(autoMatch(state,{...session,items:[row,{...row,id:'row2'}]}).items.every(i=>i.status==='UNMATCHED'));
 assert.equal(autoMatch({...state,events:[event,{...event,id:'tx2'}]},session).items[0].status,'UNMATCHED');
 assert.equal(autoMatch({...state,reconciliations:[{id:'prior',accountId:'card',items:[{status:'LINKED',linkedTransactionId:'tx'}]}]},session).items[0].status,'UNMATCHED');
});
