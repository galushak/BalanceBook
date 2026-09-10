import test from 'node:test';
import assert from 'node:assert/strict';
import {learnedAliases,suggestMerchant} from '../shared/merchants';
import {autoMatch} from '../shared/auto-match';
test('confirmed aliases recognize changing Google references without confusing subscriptions',()=>{
 const payees=[{id:'p',name:'KGTech GSuite',active:true},{id:'q',name:'Other',active:true}];
 const event={id:'old',status:'ACTIVE',type:'EXPENSE',payeeId:'p',payee:'KGTech GSuite',date:'2026-09-01',entries:[{accountId:'a',amount:-1797}]};
 const row={status:'LINKED',linkedTransactionId:'old',amount:-1797,description:'GOOGLE *WORKSPACE KGTE CC@GOOGLE.COMCAP1O3VIM3'};
 const s:any={payees,settings:{},events:[event,{...event,id:'new',date:'2026-10-01'}],reconciliations:[{accountId:'a',items:[row]}]};
 const aliases=learnedAliases(s);const desc='GOOGLE *WORKSPACE KGTE CC@GOOGLE.COMCHANGED';
 assert.equal(suggestMerchant(desc,payees,aliases,'a').name,'KGTech GSuite');
 assert.equal(suggestMerchant(desc,payees,aliases,'b').name,'');
 assert.equal(suggestMerchant(desc.replace('KGTE','FORG'),payees,aliases,'a').name,'');
 const next={id:'next',accountId:'a',status:'OPEN',items:[{status:'UNMATCHED',date:'2026-10-01',amount:-1797,description:desc}]};
 assert.equal(autoMatch(s,next).items[0].linkedTransactionId,'new');
 s.settings.merchantAliases=[{...aliases[0],disabled:true}];assert.equal(autoMatch(s,next).items[0].status,'UNMATCHED');
 s.settings.merchantAliases=[{...aliases[0],payeeId:'q'}];assert.equal(suggestMerchant(desc,payees,learnedAliases(s),'a').name,'Other');
 s.settings={};s.reconciliations[0].items[0]={...row,autoMatched:true};assert.equal(learnedAliases(s).length,0);
});
