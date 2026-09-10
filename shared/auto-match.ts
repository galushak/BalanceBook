import {suggestMerchant,learnedAliases} from './merchants';

// Only link unique, competing-row-free matches with a complete merchant name.
export function autoMatch(s:any,session:any){
 if(session.status!=='OPEN')return session;
 const norm=(v:string)=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const used=new Set(s.reconciliations.filter(r=>r.accountId===session.accountId&&r.id!==session.id).flatMap(r=>r.items.filter(i=>i.status==='LINKED').flatMap(i=>i.linkedTransactionIds||[i.linkedTransactionId])));
 session.items.filter(i=>i.status==='LINKED').forEach(i=>(i.linkedTransactionIds||[i.linkedTransactionId]).forEach(id=>used.add(id)));
 const choices=new Map<any,any[]>();
 for(const row of session.items.filter(i=>i.status==='UNMATCHED')){
  choices.set(row,s.events.filter(e=>e.status==='ACTIVE'&&!used.has(e.id)&&e.type!=='ADJUSTMENT'&&e.payee!=='Balance Adjustment'&&e.entries.some(a=>a.accountId===session.accountId&&a.amount===row.amount)&&Math.abs(Date.parse(e.date)-Date.parse(row.date))<=Math.min(3,session.tolerance??3)*86400000));
 }
 const items=session.items.map(row=>{
  const candidates=choices.get(row)||[];
  if(row.autoMatchDisabled||candidates.length!==1)return row;
  const e=candidates[0];
  if([...choices.values()].filter(list=>list.some(v=>v.id===e.id)).length!==1)return row;
  const name=norm(e.payee),guess=norm(suggestMerchant(row.description,s.payees,learnedAliases(s),session.accountId).name),raw=norm(row.description);
  if(name.length<3||!(guess===name||(` ${raw} `).includes(` ${name} `)))return row;
  return {...row,status:'LINKED',linkedTransactionId:e.id,autoMatched:true,match:'Automatically matched'};
 });
 return {...session,items};
}
