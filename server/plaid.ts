import {randomBytes,createCipheriv,createDecipheriv,createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {z} from 'zod';
import {Store} from './store';
import {assert,DomainError,id,applyMutation,cents} from '../shared/domain';
import {matchItems} from './documents';

export class PlaidVault {
 constructor(private store:Store){}
 private key(){const path=join(this.store.dir,'plaid.key');if(!existsSync(path)&&(this.store.meta('plaid:config')||this.store.meta('plaid:items')))throw new DomainError('Restore the server plaid.key file to unlock Plaid connections.',503);if(!existsSync(path))writeFileSync(path,randomBytes(32),{mode:0o600,flag:'wx'});return readFileSync(path);}
 seal(value:any){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',this.key(),iv);const data=Buffer.concat([cipher.update(JSON.stringify(value)),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),data]).toString('base64');}
 open(value:string){try{const b=Buffer.from(value,'base64'),d=createDecipheriv('aes-256-gcm',this.key(),b.subarray(0,12));d.setAuthTag(b.subarray(12,28));return JSON.parse(Buffer.concat([d.update(b.subarray(28)),d.final()]).toString());}catch{throw new DomainError('Plaid encryption key is unavailable. Restore the server plaid.key file before using connections.',503);}}
 get(key:string,fallback:any){const v=this.store.meta('plaid:'+key);return v?this.open(v):fallback;}
 set(key:string,value:any){this.store.setMeta('plaid:'+key,this.seal(value));}
}

export async function collectSync(call:any,token:string,cursor?:string){
 for(let retry=0;retry<3;retry++){
  let next=cursor;const changes:any[]=[];
  try{for(let page=0;page<100;page++){
   const r=await call('/transactions/sync',{access_token:token,...(next?{cursor:next}:{}),count:500});
   changes.push(...r.added.map(t=>({t})),...r.modified.map(t=>({t})),...r.removed.map(t=>({t,removed:true})));
   next=r.next_cursor;if(!r.has_more)return {changes,cursor:next};
  }throw new DomainError('Too many transaction pages. Try syncing again.',400);
  }catch(e:any){if(e.plaidCode==='TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION'&&retry<2)continue;throw e;}
 }
}

export function publishPlaid(s:any,item:any){
 let state=s;const now=new Date().toISOString();let count=0;
 for(const [remote,local] of Object.entries(item.mapping) as [string,string][]){
  const rows:any[]=[];
  for(const [tid,record] of Object.entries(item.transactions) as [string,any][]){
   const t=record.t;if(t.account_id!==remote||t.pending)continue;
   assert(record.removed||t.iso_currency_code==='USD','A bank transaction has an unsupported currency. No updates were saved.');
   const fingerprint=JSON.stringify(record);if(item.published[tid]===fingerprint)continue;
   const sourceId='plaid:'+item.itemId+':'+tid;
   const previous=state.reconciliations.filter(r=>r.accountId===local).flatMap(r=>r.items).find(r=>r.sourceId===sourceId);
   const amount=-cents(String(t.amount??0));
   if(!amount&&!record.removed)continue;
   const warning=previous&&(record.removed?'Bank removed this transaction. Review the existing ledger entry; it was not changed.':'Bank updated this transaction. Review the existing ledger entry; it was not changed.');
   if(record.removed&&!previous){item.published[tid]=fingerprint;continue;}
   rows.push({id:id(),sourceId,date:t.date||previous?.date,description:t.merchant_name||t.name||previous?.description||'Bank transaction',amount:record.removed?previous.amount:amount,status:previous?.linkedTransactionId?'LINKED':record.removed?'IGNORED':'UNMATCHED',linkedTransactionId:previous?.linkedTransactionId,linkedTransactionIds:previous?.linkedTransactionIds,providerWarning:warning||undefined,autoMatchDisabled:!!warning,bankName:t.name,currency:t.iso_currency_code});
   item.published[tid]=fingerprint;
  }
  if(!rows.length)continue;
  // Keep unresolved rows in their original review, updating their bank values in place.
  const fresh:any[]=[];
  for(const row of rows){
   const owner=state.reconciliations.find(r=>r.status==='OPEN'&&r.items.some(i=>i.sourceId===row.sourceId));
   if(owner){state=applyMutation(state,{id:id(),epoch:state.epoch,collection:'reconciliations',action:'update',entityId:owner.id,baseVersion:owner.version,deviceId:'plaid',data:{...owner,items:owner.items.map(old=>old.sourceId===row.sourceId?{...row,id:old.id}:old)}});}
   else fresh.push(row);
  }
  if(fresh.length){const sessionId=id();state=applyMutation(state,{id:id(),epoch:state.epoch,collection:'reconciliations',action:'create',entityId:sessionId,deviceId:'plaid',data:{accountId:local,attachmentId:'',source:'plaid',periodStart:fresh.map(r=>r.date).sort()[0],periodEnd:fresh.map(r=>r.date).sort().at(-1),status:'OPEN',notes:'Plaid bank sync '+now,tolerance:3,items:matchItems(state,local,fresh).map((r,i)=>fresh[i].providerWarning?fresh[i]:r)}});}
  count+=rows.length;
 }
 return {state,count};
}

export function registerPlaid(app:any,store:Store,transport?:any){
 const vault=new PlaidVault(store);let busy=false;
 const locked=(fn:any)=>async(req:any)=>{if(busy)throw new DomainError('A bank operation is already running. Try again shortly.',409);busy=true;const epoch=store.state().epoch;try{return await fn(req,()=>assert(store.state().epoch===epoch,'Ledger was restored during this operation. Retry.'));}finally{busy=false;}};
 const items=()=>vault.get('items',[]);
 const call=async(path:string,body:any)=>{
  const config=vault.get('config',null);assert(config,'Configure Plaid first.');
  if(transport)return transport(path,body);
  let r:any;try{r=await fetch(`https://${config.environment}.plaid.com${path}`,{method:'POST',headers:{'Content-Type':'application/json','Plaid-Version':'2020-09-14'},body:JSON.stringify({client_id:config.clientId,secret:config.secret,...body}),signal:AbortSignal.timeout(45000)});}catch{throw new DomainError('Plaid could not be reached. Try again shortly.',502);}
  const data=await r.json();if(!r.ok){const e:any=new DomainError('Plaid: '+(data.error_code||'REQUEST_FAILED')+'. '+(data.error_code==='ITEM_LOGIN_REQUIRED'?'Use Reconnect bank.':'Check your Plaid configuration or try again.'),400);e.plaidCode=data.error_code;throw e;}return data;
 };
 app.get('/api/v1/plaid',()=>{const config=vault.get('config',null);return {configured:!!config,environment:config?.environment,redirectUri:(process.env.APP_ORIGIN||'http://localhost:3080')+'/plaid/oauth',items:items().map(({accessToken,transactions,published,...v})=>v)};});
 app.post('/api/v1/plaid/config',locked(async(req:any)=>{const config=z.object({clientId:z.string().regex(/^[a-f0-9]{24}$/),secret:z.string().min(20).max(200),environment:z.enum(['sandbox','production'])}).parse(req.body);const old=vault.get('config',null);assert(!items().length||old?.environment===config.environment&&old?.clientId===config.clientId,'Disconnect banks before changing Plaid account or environment.');vault.set('config',config);return {ok:true};}));
 app.post('/api/v1/plaid/link',locked(async(req:any)=>{const item=req.body?.itemId&&items().find(i=>i.itemId===req.body.itemId);assert(!req.body?.itemId||item,'Connection not found.');const token=await call('/link/token/create',{client_name:'Balancebook',language:'en',country_codes:['US'],user:{client_user_id:createHash('sha256').update(store.meta('owner').email).digest('hex')},redirect_uri:(process.env.APP_ORIGIN||'http://localhost:3080')+'/plaid/oauth',...(item?{access_token:item.accessToken}:{products:['transactions'],transactions:{days_requested:90}})});return {linkToken:token.link_token};}));
 app.post('/api/v1/plaid/exchange',locked(async(req:any,check:any)=>{
  const d=z.object({publicToken:z.string().min(10).max(500)}).parse(req.body);
  const prior=vault.get('exchanges',{}),key=createHash('sha256').update(d.publicToken).digest('hex');if(prior[key])return {ok:true};
  const token=await call('/item/public_token/exchange',{public_token:d.publicToken});check();
  // Persist immediately: failure to fetch accounts must not lose a consumed public token.
  const all=items();if(!all.some(i=>i.itemId===token.item_id))all.push({itemId:token.item_id,accessToken:token.access_token,accounts:[],mapping:{},transactions:{},published:{},lastSync:null});
  store.transaction(()=>{vault.set('items',all);vault.set('exchanges',{...prior,[key]:true});});return {ok:true};
 }));
 app.post('/api/v1/plaid/accounts',locked(async(req:any,check:any)=>{const all=items(),item=all.find(i=>i.itemId===req.body?.itemId);assert(item,'Connection not found.');const r=await call('/accounts/get',{access_token:item.accessToken});check();item.accounts=r.accounts.map(a=>({id:a.account_id,name:a.name,mask:a.mask,type:a.type,subtype:a.subtype,currency:a.balances.iso_currency_code}));vault.set('items',all);return {ok:true};}));
 app.post('/api/v1/plaid/map',locked(async(req:any)=>{const d=z.object({itemId:z.string(),mapping:z.record(z.string(),z.string())}).parse(req.body),all=items(),item=all.find(i=>i.itemId===d.itemId);assert(item,'Connection not found.');const s=store.state();for(const [remote,local] of Object.entries(d.mapping)){if(!local){delete d.mapping[remote];continue;}const a=item.accounts.find(a=>a.id===remote);assert(a&&['credit','depository'].includes(a.type)&&a.currency==='USD','Only USD checking, savings and credit card accounts are supported.');assert(s.accounts.some(a=>a.id===local&&!a.archived),'Choose an active Balancebook account.');assert(!item.mapping[remote]||item.mapping[remote]===local,'A mapped bank account cannot be reassigned. Disconnect first.');assert(!all.some(i=>Object.entries(i.mapping).some(([r,l])=>l===local&&(i.itemId!==item.itemId||r!==remote))),'That ledger account is already connected.');}assert(new Set(Object.values(d.mapping)).size===Object.values(d.mapping).length,'Map each bank account to a separate ledger account.');item.mapping={...item.mapping,...d.mapping};vault.set('items',all);return {ok:true};}));
 app.post('/api/v1/plaid/sync',locked(async(req:any,check:any)=>{const all=items(),item=all.find(i=>i.itemId===req.body?.itemId);assert(item,'Connection not found.');assert(Object.keys(item.mapping).length,'Map bank accounts first.');const result=await collectSync(call,item.accessToken,item.cursor);check();for(const {t,removed} of result.changes){const old=item.transactions[t.transaction_id];item.transactions[t.transaction_id]={t:removed?{...old?.t,...t}:t,removed:!!removed};}item.cursor=result.cursor;item.lastSync=new Date().toISOString();let count=0;store.transaction(()=>{const result=publishPlaid(store.state(),item);count=result.count;store.save(result.state);vault.set('items',all);});return {count};}));
 app.post('/api/v1/plaid/disconnect',locked(async(req:any,check:any)=>{const all=items(),item=all.find(i=>i.itemId===req.body?.itemId);assert(item,'Connection not found.');await call('/item/remove',{access_token:item.accessToken});check();vault.set('items',all.filter(i=>i.itemId!==item.itemId));return {ok:true};}));
}
