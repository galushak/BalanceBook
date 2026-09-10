import Papa from 'papaparse';
import {cents,id,validDate} from '../shared/domain';

// Bank exports can put account metadata before their actual header row.
export function parseCSV(text:string,mapping:any={}) {
 const raw=Papa.parse<string[]>(text.replace(/^\uFEFF/,''),{skipEmptyLines:'greedy'});
 const aliases={date:['date','transaction date','posted date','posting date','post date'],description:['description','payee','merchant','name'],memo:['memo','notes'],amount:['amount','total'],debit:['amount debit','debit','withdrawal','withdrawals'],credit:['amount credit','credit','deposit','deposits'],sourceId:['transaction number','transaction id','reference number']};
 const normalize=(v:string)=>v.trim().toLowerCase();
 const headerIndex=raw.data.findIndex(row=>row.length>1&&row.some(h=>aliases.date.includes(normalize(h))||h===mapping.date));
 const headers=(raw.data[headerIndex<0?0:headerIndex]||[]).map(h=>h.trim());
 const discover=['trans. date','post date','description','amount','category'].every(h=>headers.some(v=>normalize(v)===h));
 const invertAmount=mapping.invertAmount??discover;
 const columns=Object.fromEntries(Object.entries(aliases).map(([key,names])=>[key,Object.hasOwn(mapping,key)?mapping[key]:headers.find(h=>names.includes(normalize(h)))||'']));
 const issues:string[]=raw.errors.map(e=>`CSV error: ${e.message}`),items:any[]=[];
 if(headerIndex<0)issues.push('No date header found. Select the date column and apply mapping.');
 if(new Set(headers).size!==headers.length)issues.push('Duplicate column headers: rename them before importing.');
 if(!columns.date||(!columns.amount&&!columns.debit&&!columns.credit))issues.push('Select a date column and an amount column, or debit/credit columns.');
 if(issues.length)return {headers,columns,items,issues,metadata:[],preview:[]};
 const value=(row:string[],key:string)=>String(row[headers.indexOf(columns[key])]||'').trim();
 const amount=(v:string)=>cents(v.replace(/^\((.*)\)$/,'-$1').replace(/^\+/,''));
 const seen=new Set<string>();
 for(const [offset,row] of raw.data.slice(headerIndex+1).entries()) {
  const line=headerIndex+offset+2;
  try {
   if(row.length!==headers.length)throw new Error('column count differs from header');
   let date=value(row,'date');
   if(!validDate(date)){const parts=date.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4}|\d{2})$/);if(parts){const [,a,b,y]=parts;date=`${y.length===2?'20'+y:y}-${(mapping.dateFormat==='DMY'?b:a).padStart(2,'0')}-${(mapping.dateFormat==='DMY'?a:b).padStart(2,'0')}`;}}
   if(!validDate(date))throw new Error('invalid date');
   const debit=value(row,'debit'),credit=value(row,'credit');
   if(!columns.amount&&!debit&&!credit)throw new Error('missing amount');
   if(!columns.amount&&debit&&credit&&amount(debit)!==0&&amount(credit)!==0)throw new Error('both debit and credit contain amounts');
   const signed=columns.amount?amount(value(row,'amount'))*(invertAmount?-1:1):Math.abs(amount(credit||'0'))-Math.abs(amount(debit||'0'));
   if(!signed)throw new Error('zero amount');
   const description=value(row,'description'),memo=value(row,'memo'),sourceId=value(row,'sourceId');
   if(!description&&!memo)throw new Error('missing description');
   if(sourceId&&seen.has(sourceId))throw new Error('duplicate transaction number in this file');
   if(sourceId)seen.add(sourceId);
   items.push({id:id(),date,description:[description,memo].filter(Boolean).join(' · '),amount:signed,sourceId,sourceRow:line,status:'UNMATCHED'});
  }catch(e:any){issues.push(`Row ${line}: ${e.message}.`);}
 }
 return {headers,columns,items,issues,invertAmount,format:discover?'Discover':'Generic CSV',metadata:raw.data.slice(0,headerIndex).map(r=>r.join(' ')),preview:raw.data.slice(headerIndex+1,headerIndex+6)};
}
