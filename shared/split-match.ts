export function splitMatches(s:any,session:any,row:any){
 if(row.status!=='UNMATCHED'||row.amount>=0)return [];
 const used=new Set(s.reconciliations.filter(r=>r.accountId===session.accountId).flatMap(r=>r.items.filter(i=>i.status==='LINKED').flatMap(i=>i.linkedTransactionIds||[i.linkedTransactionId])));
 const norm=(v:string)=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const nearby=s.events.filter(e=>e.status==='ACTIVE'&&!used.has(e.id)&&Math.abs(Date.parse(e.date)-Date.parse(row.date))<=3*86400000);
 const pairs:any[]=[];
 for(const p of nearby.filter(e=>e.type==='DEBT_PAYMENT'&&e.principal===e.amount&&e.interest===0&&e.accountId===session.accountId)){
  const loan=s.accounts.find(a=>a.id===p.toAccountId&&a.type==='LOAN');if(!loan)continue;
  const lender=norm(loan.name);if(!lender.split(' ').filter(w=>w!=='loan'&&w.length>2).some(w=>norm(row.description).split(' ').includes(w)))continue;
  for(const interest of nearby.filter(e=>e.type==='EXPENSE'&&e.accountId===session.accountId&&e.date===p.date&&norm(e.payee)===lender+' interest')){
   const total=[p,interest].reduce((n,e)=>n+e.entries.filter(a=>a.accountId===session.accountId).reduce((v,a)=>v+a.amount,0),0);
   if(total===row.amount)pairs.push({principal:p,interest,loan});
  }
 }
 return pairs;
}
