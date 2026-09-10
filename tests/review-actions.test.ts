import test from 'node:test';
import assert from 'node:assert/strict';
import {adjustmentFor} from '../src/ReviewActions';
test('only flag grouped unmatched outflows that equal an existing account adjustment',()=>{
 const e={id:'adjustment',status:'ACTIVE',type:'EXPENSE',payee:'Balance Adjustment',date:'2026-08-28',amount:3000,entries:[{accountId:'a',amount:-3000}]};
 const first={date:'2026-08-24',amount:-1000,suggestions:[]},second={date:'2026-08-20',amount:-2000,suggestions:[]};
 const s={events:[e]},r={accountId:'a',items:[first,second]};
 assert.equal(adjustmentFor(s,r,first)?.id,'adjustment');
 assert.equal(adjustmentFor(s,{...r,accountId:'b'},first),undefined);
 assert.equal(adjustmentFor(s,{...r,items:[first]},first),undefined);
 assert.equal(adjustmentFor(s,r,{...first,suggestions:[{id:'matched'}]}),null);
 assert.equal(adjustmentFor({events:[{...e,status:'VOIDED'}]},r,first),undefined);
});
