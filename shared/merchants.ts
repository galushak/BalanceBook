// Conservative suggestions only: original statement descriptions remain unchanged.
export function suggestMerchant(description:string,payees:{id:string;name:string;active:boolean}[]=[],aliases:any[]=[],accountId=''){
 const raw=String(description||'');
 const alias=aliases.find(a=>a.accountId===accountId&&a.key===merchantKey(raw)&&!a.disabled);
 const learned=alias&&payees.find(p=>p.active&&p.id===alias.payeeId);
 if(learned)return {name:learned.name,payeeId:learned.id,recognized:true};
 const rules:[RegExp,string][]=[
  [/\b(?:AMAZON(?:\.COM)?|AMZN)(?=[*\s./]|$)/i,'Amazon'],
  [/\b7\s*BREW\b/i,'7 Brew'],
  [/\bWAL[ -]?MART\b|\bWM SUPERCENTER\b/i,'Walmart'],
  [/\bMARKET\s*32\b|\bPCHOPPER\b|\bPRICE CHOPPER\b/i,'Price Chopper'],
  [/\bSTEWART'?S\b/i,"Stewart's"],
  [/\bCHOPSTICKS\b/i,'Chopsticks'],
  [/\bTARGET\b/i,'Target'],
  [/\bHANNAFORD\b/i,'Hannaford'],
  [/\bAUDIBLE\b/i,'Audible'],
 ];
 // Transfers and payroll require explicit account/payee review.
 if(/\bTRANSFER\b|\bPAYROLL\b/i.test(raw))return {name:'',payeeId:'',recognized:false};
 const canonical=rules.find(([pattern])=>pattern.test(raw))?.[1];
 const norm=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
 const existing=canonical?payees.find(p=>p.active&&norm(p.name)===norm(canonical)):payees.find(p=>p.active&&p.name.trim().toLowerCase()===raw.trim().toLowerCase());
 const name=existing?.name||canonical||'';
 return {name,payeeId:existing?.id||'',recognized:!!name};
}

export function merchantKey(description:string){
 // Google appends a changing reference immediately after its contact domain.
 return String(description||'').toUpperCase().replace(/CC@GOOGLE\.COM.*$/,'').replace(/[^A-Z0-9]+/g,' ').trim();
}

export function learnedAliases(s:any){
 const grouped=new Map<string,any>();
 for(const session of s.reconciliations)for(const row of session.items){
  if(row.status!=='LINKED'||row.autoMatched||row.match==='Previously linked bank transaction')continue;
  const e=s.events.find(e=>e.id===row.linkedTransactionId&&e.status==='ACTIVE'&&['EXPENSE','INCOME','REFUND'].includes(e.type)&&e.entries.some(a=>a.accountId===session.accountId&&a.amount===row.amount));
  const payee=e&&s.payees.find(p=>p.active&&(p.id===e.payeeId||p.name===e.payee));
  const key=merchantKey(row.description);if(!payee||key.length<3)continue;
  const id=session.accountId+'|'+key,existing=grouped.get(id);
  grouped.set(id,{id,accountId:session.accountId,key,payeeId:payee.id,disabled:existing?.disabled||!!(existing&&existing.payeeId!==payee.id)});
 }
 for(const override of s.settings?.merchantAliases||[])grouped.set(override.id,override);
 return [...grouped.values()];
}
