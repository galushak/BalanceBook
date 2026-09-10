import test from 'node:test';
import assert from 'node:assert/strict';
import {blankState,applyMutation} from '../shared/domain';
import {splitMatches} from '../shared/split-match';
test('one bank debit links both loan entries without changing principal, interest or balances',()=>{
 const s:any=blankState();s.accounts=[{id:'funds',name:'Checking'},{id:'loan',name:'Discover Loan',type:'LOAN'}];
 s.events=[{id:'p',type:'DEBT_PAYMENT',status:'ACTIVE',date:'2026-08-25',amount:21673,principal:21673,interest:0,accountId:'funds',toAccountId:'loan',entries:[{accountId:'funds',amount:-21673},{accountId:'loan',amount:21673}]},{id:'i',type:'EXPENSE',status:'ACTIVE',date:'2026-08-25',amount:21438,accountId:'funds',payee:'Discover Loan Interest',entries:[{accountId:'funds',amount:-21438}]}];
 const row={id:'row',status:'UNMATCHED',date:'2026-08-26',amount:-43111,description:'DISCOVER/TELEPHONE KARSON'};
 const session={id:'review',status:'OPEN',accountId:'funds',version:1,items:[row]};s.reconciliations=[session];
 assert.equal(splitMatches(s,session,row).length,1);
 const mutation:any={id:'test-split',epoch:s.epoch,collection:'reconciliations',action:'match-split',entityId:'review',baseVersion:1,deviceId:'test',data:{rowId:'row',principalId:'p',interestId:'i'}};
 const next=applyMutation(s,mutation);assert.deepEqual(next.events,s.events);assert.deepEqual(next.reconciliations[0].items[0].linkedTransactionIds,['p','i']);assert.equal(next.reconciliations[0].items[0].status,'LINKED');assert.equal(row.status,'UNMATCHED');
 assert.equal(splitMatches(s,session,{...row,amount:-43112}).length,0);
 assert.equal(splitMatches(s,{...session,accountId:'wrong'},row).length,0);
 const used=structuredClone(s);used.reconciliations.push({accountId:'funds',items:[{status:'LINKED',linkedTransactionId:'i'}]});assert.equal(splitMatches(used,session,row).length,0);
 const ambiguous=structuredClone(s);ambiguous.events.push({...s.events[1],id:'i2'});assert.throws(()=>applyMutation(ambiguous,mutation),/unique/);
});
