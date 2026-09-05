import type {State} from './types';
import {classification,dateAdd,today,debt,validDate} from './domain';
export function reportRows(s:State,f:any){return s.events.filter(e=>e.status==='ACTIVE'&&e.date>=(f.from||'0000-01-01')&&e.date<=(f.to||'9999-12-31')&&(!f.account||e.entries.some(l=>l.accountId===f.account))&&(!f.category||e.categoryId===f.category)&&(!f.payee||e.payeeId===f.payee));}
export function reportData(s:State,f:any){
 const events=reportRows(s,f),kind=f.kind||'category';let rows:any[]=[];
 if(kind==='category'||kind==='payee'){
  const m=new Map<string,number>();for(const e of events){const v=classification(e).spent;if(v)m.set(e[kind]||'Other',(m.get(e[kind])||0)+v);}rows=[...m].map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value);
 }else if(kind==='cashflow'){
  const sums=events.reduce((t,e)=>{const c=classification(e);return {income:t.income+c.income,spent:t.spent+c.spent}},{income:0,spent:0});rows=[{label:'Income',value:sums.income},{label:'Spent',value:sums.spent}];
 }else{
  const accounts=s.accounts.filter(a=>f.account?a.id===f.account:!a.archived&&(kind==='networth'||!debt(a)));
  const from=f.from||dateAdd(today(s.settings.timezone),-30),to=f.to||today(s.settings.timezone);
  if(!validDate(from)||!validDate(to)||from>to)return {rows,events};
  const allowed=new Set(accounts.map(a=>a.id)),changes=new Map<string,number>();
  for(const a of accounts)changes.set(a.trackingStart,(changes.get(a.trackingStart)||0)+a.opening);
  for(const e of s.events)if(e.status==='ACTIVE')for(const entry of e.entries)if(allowed.has(entry.accountId))changes.set(e.date,(changes.get(e.date)||0)+entry.amount);
  let value=[...changes].filter(([date])=>date<from).reduce((n,[,v])=>n+v,0),d=from;
  for(let i=0;d<=to&&i<36600;i++,d=dateAdd(d,1)){value+=changes.get(d)||0;rows.push({label:d,value});}
 }
 return {rows,events};
}
