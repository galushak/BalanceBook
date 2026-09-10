import {assert,id,cents,occurrences,dateAdd,today,buildEvent} from '../shared/domain';
import {suggestMerchant,learnedAliases,merchantKey} from '../shared/merchants';

const stamp=()=>new Date().toISOString();
function audit(s:any,collection:string,before:any,after:any){s.revisions.push({id:id(),entityId:after.id,entityType:collection,action:'bank-sync',before:before?structuredClone(before):null,after:structuredClone(after),at:stamp(),actor:'plaid'});}
function put(s:any,collection:string,value:any){const i=s[collection].findIndex(v=>v.id===value.id),before=i<0?null:s[collection][i];const after={...value,version:(before?.version||0)+1,createdAt:before?.createdAt||stamp(),updatedAt:stamp()};audit(s,collection,before,after);if(i<0)s[collection].push(after);else s[collection][i]=after;return after;}
function label(s:any,collection:string,name:string){return s[collection].find(v=>v.active&&v.name.toLowerCase()===name.toLowerCase())||put(s,collection,{id:id(),name,active:true});}
const amount=(e:any,account:string)=>e.entries.filter(v=>v.accountId===account).reduce((n,v)=>n+v.amount,0);
const near=(a:string,b:string)=>Math.abs(Date.parse(a)-Date.parse(b))<=7*86400000;
const refs=(e:any)=>e.bank?.refs||[];
const refId=(item:any,t:any)=>`${item.itemId}:${t.transaction_id}`;

export function importAccounts(s:any,item:any,accounts:any[]){
 // Preserve the deliberate "Do not import" selections on existing connections.
 if(!item.firstMode){item.excluded=(item.accounts||[]).filter(a=>!item.mapping[a.id]).map(a=>a.id);item.firstMode=true;}
 item.accounts=accounts.map(a=>({id:a.account_id,name:a.name,mask:a.mask,type:a.type,subtype:a.subtype,currency:a.balances.iso_currency_code}));
 for(const remote of accounts){
  if(item.excluded?.includes(remote.account_id)||remote.balances.iso_currency_code!=='USD'||!['depository','credit'].includes(remote.type))continue;
  let a=s.accounts.find(a=>a.id===item.mapping[remote.account_id]);
  if(!a){a={id:id(),name:remote.name,type:remote.type==='credit'?'CREDIT_CARD':remote.subtype==='savings'?'SAVINGS':'CHECKING',institution:'Plaid',opening:0,trackingStart:'1970-01-01',archived:false,order:s.accounts.length,everUsed:false,details:{}};item.mapping[remote.account_id]=a.id;}
  const sign=remote.type==='credit'?-1:1;
  const current=remote.balances.current==null?a.details?.plaid?.current:sign*cents(String(remote.balances.current));
  assert(Number.isSafeInteger(current),'The bank has not supplied a current balance yet. Try syncing again shortly.');
  put(s,'accounts',{...a,name:remote.name,details:{...a.details,plaid:{itemId:item.itemId,remoteId:remote.account_id,current,available:remote.balances.available==null?null:sign*cents(String(remote.balances.available)),asOf:stamp(),bankName:remote.name}}});
 }
}

export function importTransactions(input:any,item:any){
 const s=structuredClone(input);let count=0;
 const active=Object.values(item.transactions).filter((r:any)=>!r.removed).map((r:any)=>r.t).sort((a:any,b:any)=>Number(a.pending)-Number(b.pending));
 for(const t of active as any[]){
  const account=item.mapping[t.account_id];if(!account||t.iso_currency_code!=='USD')continue;
  const signed=-cents(String(t.amount));if(!signed)continue;
  const key=refId(item,t),prior=t.pending_transaction_id?`${item.itemId}:${t.pending_transaction_id}`:'';
  // Posted replacement owns its pending authorization; do not recreate it later in this batch.
  if(t.pending&&active.some((p:any)=>p.pending_transaction_id===t.transaction_id))continue;
  let e=s.events.find(e=>refs(e).some(r=>r.id===key||prior&&r.id===prior));
  const merchant=suggestMerchant(t.merchant_name||t.name,s.payees,learnedAliases(s),account).name||t.merchant_name||t.name||'Bank transaction';
  const possible=s.events.filter(e=>e.status==='ACTIVE'&&amount(e,account)===signed&&near(e.date,t.date)&&!refs(e).some(r=>r.accountId===account)&&!e.bank?.separateFrom?.includes(key));
  const exact=possible.filter(e=>merchantKey(e.payee)===merchantKey(merchant));
  // Only unique merchant + amount + date matches settle automatically.
  if(!e&&exact.length===1)e=exact[0];
  if(!e){
   const legacy=s.reconciliations.flatMap(r=>r.items).find(r=>r.sourceId==='plaid:'+item.itemId+':'+t.transaction_id&&r.linkedTransactionId);
   if(legacy&&!legacy.linkedTransactionIds?.length)e=s.events.find(e=>e.id===legacy.linkedTransactionId&&e.status==='ACTIVE'&&amount(e,account)===signed);
  }
  const bankRef={id:key,accountId:account,pending:!!t.pending,date:t.date,amount:signed,description:t.name,transactionId:t.transaction_id};
  if(e){
   const before=e;const oldRef=refs(e).find(r=>r.id===key||r.id===prior);
   if(e.bank&&!e.bank.manual&&possible.length)e={...e,bank:{...e.bank,candidates:possible.map(v=>v.id),attention:'Possible manual entry — match it or keep both.'}};
   const changed=oldRef&&oldRef.amount!==signed;
   // A bank correction may not silently destroy a user-entered loan split.
   if(changed&&e.entries.length>1){e={...e,bank:{...e.bank,attention:'Bank amount changed. Review the payment split.',refs:refs(e).filter(r=>r.id!==key&&r.id!==prior).concat(bankRef)}};}
   else {e={...e,date:e.entries.length>1&&e.accountId!==account?e.date:t.date,amount:e.entries.length>1?e.amount:Math.abs(signed),entries:e.entries.map(v=>v.accountId===account?{...v,amount:signed}:v),bank:{...e.bank,manual:e.bank?.manual??!e.bank,refs:refs(e).filter(r=>r.id!==key&&r.id!==prior).concat(bankRef)}};}
   e.bank.refs.sort((a,b)=>a.id.localeCompare(b.id));e.status='ACTIVE';e.settlement=e.bank.refs.some(r=>r.pending)?'BANK_PENDING':'POSTED';
   if(JSON.stringify({...before,version:0,updatedAt:''})!==JSON.stringify({...e,version:0,updatedAt:''})){put(s,'events',e);count++;}
  }else{
   const p=label(s,'payees',merchant),category=label(s,'categories',(t.personal_finance_category?.primary||'Uncategorized').replaceAll('_',' ').toLowerCase().replace(/^./,c=>c.toUpperCase()));
   e=put(s,'events',{id:id(),type:signed<0?'EXPENSE':'INCOME',date:t.date,accountId:account,amount:Math.abs(signed),payee:p.name,payeeId:p.id,category:category.name,categoryId:category.id,notes:'',status:'ACTIVE',entries:[{accountId:account,amount:signed}],settlement:t.pending?'BANK_PENDING':'POSTED',bank:{manual:false,excludeReports:/^TRANSFER_/.test(t.personal_finance_category?.primary||'')||t.personal_finance_category?.detailed==='LOAN_PAYMENTS_CREDIT_CARD_PAYMENT',refs:[bankRef],...(possible.length?{candidates:possible.map(e=>e.id),attention:'Possible manual entry — match it or keep both.'}:{})}});count++;
  }
  for(const r of s.reconciliations){let changed=false;const rows=r.items.map(row=>{if(row.sourceId!=='plaid:'+item.itemId+':'+t.transaction_id||row.status==='LINKED'&&row.linkedTransactionId===e.id)return row;changed=true;return {...row,status:'LINKED',linkedTransactionId:e.id,match:'Imported from bank',autoMatched:true};});if(changed)put(s,'reconciliations',{...r,items:rows});}
 }
 for(const record of Object.values(item.transactions) as any[]){if(!record.removed)continue;const key=refId(item,record.t);const e=s.events.find(e=>e.status==='ACTIVE'&&refs(e).some(r=>r.id===key));if(!e)continue;
  const remaining=refs(e).filter(r=>r.id!==key);if(e.bank.manual){put(s,'events',{...e,settlement:remaining.length?'POSTED':'AWAITING_BANK',bank:{...e.bank,refs:remaining,attention:'Bank removed its entry. Check whether your manual transaction still applies.'}});}
  else if(remaining.length){const r=remaining[0];put(s,'events',{...e,type:r.amount<0?'EXPENSE':'INCOME',accountId:r.accountId,toAccountId:undefined,date:r.date,amount:Math.abs(r.amount),entries:remaining.map(r=>({accountId:r.accountId,amount:r.amount})),settlement:remaining.some(r=>r.pending)?'BANK_PENDING':'POSTED',bank:{...e.bank,refs:remaining,excludeReports:true}});}
  else put(s,'events',{...e,status:'VOIDED',bank:{...e.bank,removed:true}});
 }
 mergeInternalTransfers(s);
 fulfillStreams(s,item);
 for(const a of s.accounts.filter(a=>a.details?.plaid?.itemId===item.itemId)){
  const posted=s.events.filter(e=>e.status==='ACTIVE'&&refs(e).some(r=>r.accountId===a.id&&!r.pending));
  const net=posted.reduce((n,e)=>n+amount(e,a.id),0);
  // Historical baseline is reconstructed from the bank snapshot and supplied posted history.
  put(s,'accounts',{...a,opening:a.details.plaid.current-net,trackingStart:posted.map(e=>e.date).sort()[0]||today(s.settings.timezone),everUsed:posted.length>0});
 }
 return {state:s,count};
}

function mergeInternalTransfers(s:any){
 const eligible=()=>s.events.filter(e=>e.status==='ACTIVE'&&!e.bank?.manual&&e.entries.length===1&&refs(e).some(r=>/\bTRANSFER\b/i.test(r.description)));
 for(const source of eligible().filter(e=>e.entries[0].amount<0)){
  if(s.accounts.find(a=>a.id===source.accountId)?.type==='CREDIT_CARD')continue;
  const candidates=eligible().filter(e=>e.accountId!==source.accountId&&e.entries[0].amount===-source.entries[0].amount&&Math.abs(Date.parse(e.date)-Date.parse(source.date))<=3*86400000);
  if(candidates.length!==1)continue;const dest=candidates[0];
  if(eligible().filter(e=>e.accountId!==dest.accountId&&e.entries[0].amount===-dest.entries[0].amount&&Math.abs(Date.parse(e.date)-Date.parse(dest.date))<=3*86400000).length!==1)continue;
  const a=s.accounts.find(a=>a.id===source.accountId),b=s.accounts.find(a=>a.id===dest.accountId);if(!a||!b||b.type==='LOAN')continue;
  const combined=[...refs(source),...refs(dest)].sort((a,b)=>a.id.localeCompare(b.id));
  put(s,'events',{...source,type:b.type==='CREDIT_CARD'?'DEBT_PAYMENT':'TRANSFER',toAccountId:b.id,payee:`${a.name} → ${b.name}`,category:b.type==='CREDIT_CARD'?'Credit Card Payments':'Transfers',payeeId:undefined,categoryId:undefined,entries:[...source.entries,...dest.entries],notes:[source.notes,dest.notes].filter(Boolean).join('\n'),settlement:combined.some(r=>r.pending)?'BANK_PENDING':'POSTED',bank:{...source.bank,refs:combined,excludeReports:false}});
  put(s,'events',{...dest,status:'VOIDED',bank:{...dest.bank,refs:[],mergedInto:source.id}});
  for(const attachment of s.attachments.filter(a=>a.entityId===dest.id))attachment.entityId=source.id;
  for(const r of s.reconciliations)if(r.items.some(v=>v.linkedTransactionId===dest.id))put(s,'reconciliations',{...r,items:r.items.map(v=>v.linkedTransactionId===dest.id?{...v,linkedTransactionId:source.id}:v)});
 }
}

export function fulfillStreams(s:any,item:any){
 for(const rule of s.rules.filter(r=>r.plaid?.itemId===item.itemId)){
  const stream=item.streams?.find(v=>v.stream_id===rule.plaid.streamId);if(!stream)continue;
  for(const e of s.events.filter(e=>e.status==='ACTIVE'&&!e.occurrenceId&&refs(e).some(r=>stream.transaction_ids?.includes(r.transactionId)||r.pending&&r.accountId===item.mapping[stream.account_id]&&merchantKey(e.payee)===merchantKey(stream.merchant_name||stream.description)))){
   const choices=occurrences(s,dateAdd(e.date,7)).filter(o=>o.ruleId===rule.id&&!['POSTED','SKIPPED'].includes(o.status)&&near(o.due,e.date));
   if(choices.length===1){
    const o=choices[0];let event=e;
    if(!e.bank.manual&&['TRANSFER','DEBT_PAYMENT'].includes(o.template.type)){
     try{const built=buildEvent(s,{...o.template,date:e.date,amount:e.amount},undefined,true);event={...e,...built,id:e.id,createdAt:e.createdAt,bank:{...e.bank,manual:true,excludeReports:false,attention:undefined},settlement:e.settlement};}
     catch{put(s,'events',{...e,bank:{...e.bank,attention:'Payment arrived but the scheduled split needs updating. Edit the rule, then sync again.'}});continue;}
    }
    put(s,'events',{...event,occurrenceId:o.id});
   }
  }
 }
}

export function resolveBankMatch(input:any,eventId:string,manualId?:string){
 const s=structuredClone(input),bank=s.events.find(e=>e.id===eventId&&e.status==='ACTIVE'&&e.bank),manual=s.events.find(e=>e.id===manualId&&e.status==='ACTIVE');assert(bank,'Bank transaction no longer exists.');
 if(!manualId){for(const cid of bank.bank.candidates||[]){const e=s.events.find(e=>e.id===cid);if(e)put(s,'events',{...e,bank:{...e.bank,manual:true,separateFrom:[...(e.bank?.separateFrom||[]),...refs(bank).map(r=>r.id)]}});}put(s,'events',{...bank,bank:{...bank.bank,candidates:[],attention:undefined}});}
 else {assert(manual&&bank.bank.candidates?.includes(manualId),'Choose one of the matching manual entries.');assert(refs(bank).every(r=>amount(manual,r.accountId)===r.amount&&!refs(manual).some(v=>v.accountId===r.accountId)),'The amount or bank link changed. Sync and review again.');if(manual.payeeId){const before=structuredClone(s.settings);const aliases=s.settings.merchantAliases||[];for(const ref of refs(bank))for(const description of [ref.description,bank.payee]){const key=merchantKey(description),aliasId=ref.accountId+'|'+key;const i=aliases.findIndex(a=>a.id===aliasId);const alias={id:aliasId,accountId:ref.accountId,key,payeeId:manual.payeeId};if(i<0)aliases.push(alias);else aliases[i]=alias;}s.settings={...s.settings,merchantAliases:aliases,version:(s.settings.version||0)+1};s.revisions.push({id:id(),entityId:'settings',entityType:'settings',action:'learn-bank-match',before,after:structuredClone(s.settings),at:stamp(),actor:'owner'});}
 put(s,'events',{...manual,date:bank.date,settlement:bank.settlement,bank:{...manual.bank,manual:true,refs:[...refs(manual),...refs(bank)]}});put(s,'events',{...bank,status:'VOIDED',bank:{...bank.bank,refs:[],candidates:[],attention:undefined,mergedInto:manual.id}});for(const r of s.reconciliations)if(r.items.some(v=>v.linkedTransactionId===bank.id))put(s,'reconciliations',{...r,items:r.items.map(v=>v.linkedTransactionId===bank.id?{...v,linkedTransactionId:manual.id}:v)});}
 return s;
}

export function linkStream(input:any,item:any,streamId:string,ruleId?:string){
 const s=structuredClone(input),stream=item.streams?.find(v=>v.stream_id===streamId);assert(stream,'Recurring stream unavailable. Sync first.');const accountId=item.mapping[stream.account_id];assert(accountId,'Import this account first.');
 const linked=s.rules.find(r=>r.plaid?.itemId===item.itemId&&r.plaid.streamId===streamId);if(linked)return s;
 let rule=ruleId&&s.rules.find(r=>r.id===ruleId);if(ruleId)assert(rule&&rule.template.accountId===accountId&&!rule.plaid,'Choose an unlinked recurring rule for this account.');
 if(!rule){const frequency:any={WEEKLY:['weeks',1],BIWEEKLY:['weeks',2],MONTHLY:['months',1],ANNUALLY:['years',1]};assert(frequency[stream.frequency],'Create a recurring rule with your preferred dates, then link this stream to it.');assert(stream.predicted_next_date,'Plaid has not predicted the next date. Create a rule and link it instead.');const signed=-cents(String(stream.last_amount?.amount??stream.average_amount?.amount));assert(signed,'This stream has no usable amount.');const p=label(s,'payees',stream.merchant_name||stream.description),c=label(s,'categories',signed<0?'Uncategorized':'Income');rule={id:id(),label:p.name,start:stream.predicted_next_date,unit:frequency[stream.frequency][0],interval:frequency[stream.frequency][1],mode:'FIXED',status:'ACTIVE',notifyDays:3,autoSplit:false,template:{type:signed<0?'EXPENSE':'INCOME',accountId,amount:Math.abs(signed),payeeId:p.id,categoryId:c.id,payee:p.name,category:c.name,notes:''}};}
 put(s,'rules',{...rule,plaid:{itemId:item.itemId,streamId}});fulfillStreams(s,item);return s;
}

export function repairPaymentSplit(input:any,eventId:string,principal:number,interest:number){
 const s=structuredClone(input),e=s.events.find(e=>e.id===eventId&&e.status==='ACTIVE');assert(e?.type==='DEBT_PAYMENT'&&e.principal!==undefined&&e.bank?.attention,'This payment does not need a split correction.');
 const source=refs(e).find(r=>r.accountId===e.accountId);assert(source&&source.amount<0,'The bank payment is unavailable. Sync first.');const total=-source.amount;
 assert(Number.isSafeInteger(principal)&&principal>=0&&Number.isSafeInteger(interest)&&interest>=0&&principal+interest===total,'Principal plus interest must equal the bank payment.');
 assert(refs(e).every(r=>r.accountId===e.accountId||r.amount===principal),'Principal must agree with the connected loan account.');
 put(s,'events',{...e,amount:total,principal,interest,entries:[{accountId:e.accountId,amount:-total},{accountId:e.toAccountId,amount:principal}],bank:{...e.bank,attention:undefined}});
 for(const a of s.accounts.filter(a=>a.details?.plaid&&[e.accountId,e.toAccountId].includes(a.id))){const net=s.events.filter(v=>v.status==='ACTIVE'&&refs(v).some(r=>r.accountId===a.id&&!r.pending)).reduce((n,v)=>n+amount(v,a.id),0);put(s,'accounts',{...a,opening:a.details.plaid.current-net});}return s;
}
