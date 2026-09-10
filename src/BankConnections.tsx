import React,{useEffect,useState,useRef} from 'react';
import {api} from './ledger';
import {Button,Modal,Field,Select} from './components';
let sdk:Promise<void>|undefined;
function loadPlaid(){return sdk??=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.plaid.com/link/v2/stable/link-initialize.js';script.nonce=document.querySelector<HTMLMetaElement>('meta[name=plaid-nonce]')?.content||'';script.onload=()=>resolve();script.onerror=()=>{sdk=undefined;reject(new Error('Could not load Plaid. Check your connection.'));};document.head.appendChild(script);});}
export function BankConnections({l}:any){
 const [open,setOpen]=useState(location.pathname==='/plaid/oauth'),[data,setData]=useState<any>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[configure,setConfigure]=useState(false),[config,setConfig]=useState({clientId:'',secret:'',environment:'production'}),[maps,setMaps]=useState<any>({});const resumed=useRef(false);
 async function refresh(){const d=await api('/plaid');setData(d);setMaps(Object.fromEntries(d.items.map(i=>[i.itemId,i.mapping])));}
 async function run(fn:any){setBusy(true);setError('');try{await fn();await refresh();await l.sync();}catch(e:any){setError(e.message)}finally{setBusy(false)}}
 function clearReturn(){sessionStorage.removeItem('bb-plaid-link');sessionStorage.removeItem('bb-plaid-update');if(location.pathname==='/plaid/oauth')history.replaceState({},'', '/');}
 async function connect(itemId?:string,resume=false){
  setBusy(true);setError('');try{
   await loadPlaid();const token=resume?sessionStorage.getItem('bb-plaid-link'):(await api('/plaid/link',{itemId})).linkToken;
   if(!token)throw new Error('Bank sign-in expired. Start Connect bank again.');
   if(!resume){sessionStorage.setItem('bb-plaid-link',token);sessionStorage.setItem('bb-plaid-update',itemId||'');}
   const update=resume?sessionStorage.getItem('bb-plaid-update'):itemId;
   const handler=(window as any).Plaid.create({token,...(resume?{receivedRedirectUri:location.href}:{}),onSuccess:async(publicToken:string)=>{
    handler.destroy();clearReturn();await run(async()=>{if(!update)await api('/plaid/exchange',{publicToken});const d=await api('/plaid');for(const i of d.items.filter(i=>!i.accounts.length||i.itemId===update))await api('/plaid/sync',{itemId:i.itemId});l.setNotice('Bank connected. Accounts, balances and available transactions imported.');});
   },onExit:(e:any)=>{handler.destroy();setBusy(false);clearReturn();if(e)setError('Plaid: '+(e.display_message||e.error_code||'Bank connection was not completed.'));}});handler.open();
  }catch(e:any){setError(e.message);setBusy(false);}
 }
 useEffect(()=>{if(open&&l.online)void refresh().catch(e=>setError(e.message));},[open]);
 useEffect(()=>{if(open&&location.pathname==='/plaid/oauth'&&location.search.includes('oauth_state_id')&&!resumed.current){resumed.current=true;void connect(undefined,true);}},[open]);
 return <><Button onClick={()=>setOpen(true)}>Bank connections</Button>{open&&<Modal title="Bank connections" wide onClose={()=>{if(!busy)setOpen(false)}}><p>Plaid imports account names, bank balances and transactions. Manual purchases affect your working balance while awaiting bank confirmation. Sync runs every six hours; you can also sync here.</p>{error&&<div role="alert" className="banner error">{error}</div>}{data&&<>
 <p>{data.configured?`Plaid ${data.environment}`:'Plaid is not configured.'} · Online connection required</p>
 <Button disabled={busy||!l.online} onClick={()=>setConfigure(!configure)}>Configure Plaid</Button>
 {configure&&<form onSubmit={e=>{e.preventDefault();void run(async()=>{await api('/plaid/config',config);setConfig({...config,secret:''});setConfigure(false);});}}><Field label="Client ID"><input autoComplete="off" value={config.clientId} onChange={e=>setConfig({...config,clientId:e.target.value})} required/></Field><Field label="Secret"><input type="password" autoComplete="new-password" value={config.secret} onChange={e=>setConfig({...config,secret:e.target.value})} required/></Field><Field label="Environment"><Select value={config.environment} onChange={e=>setConfig({...config,environment:e.target.value})} options={[{value:'production',label:'Production / Trial'},{value:'sandbox',label:'Sandbox (test data)'}]}/></Field><p>Saved encrypted on your server. The secret is never returned to this form.</p><p>Add this allowed redirect URI in Plaid Dashboard: <code>{data.redirectUri}</code></p><Button type="submit" disabled={busy}>Save configuration</Button></form>}
 <Button primary disabled={busy||!l.online||!data.configured} onClick={()=>connect()}>Connect bank</Button>
 <p>Sync retrieves data already available from Plaid. Initial transactions may take a few minutes. It does not request the paid on-demand Refresh add-on.</p>
 {data.items.map(item=><section key={item.itemId} className="panel"><h3>{item.accounts[0]?.name||'Connected bank'}</h3><p>Last sync: {item.lastSync?new Date(item.lastSync).toLocaleString():'Not synced yet'}</p>{item.accounts.map(a=><Field key={a.id} label={`${a.name} · ${a.mask||a.subtype||a.type}`}><Select disabled={busy||!!item.mapping[a.id]} value={maps[item.itemId]?.[a.id]||''} onChange={e=>setMaps({...maps,[item.itemId]:{...maps[item.itemId],[a.id]:e.target.value}})} options={[{value:'',label:'Do not import'},...l.state.accounts.filter(a=>!a.archived).map(a=>({value:a.id,label:a.name}))]}/></Field>)}<Button disabled={busy} onClick={()=>run(()=>api('/plaid/accounts',{itemId:item.itemId}))}>Reload bank accounts</Button><Button disabled={busy} onClick={()=>run(()=>api('/plaid/map',{itemId:item.itemId,mapping:maps[item.itemId]||{}}))}>Save account mapping</Button><Button primary disabled={busy||!Object.keys(item.mapping).length} onClick={()=>run(async()=>{const r=await api('/plaid/sync',{itemId:item.itemId});l.setNotice(`${r.count} bank transactions imported or updated.`);})}>Sync transactions</Button><Button disabled={busy} onClick={()=>connect(item.itemId)}>Reconnect bank</Button><Button disabled={busy} onClick={async()=>{if(await l.confirm('Disconnect this bank from Plaid? Imported reviews and ledger transactions will remain.'))void run(()=>api('/plaid/disconnect',{itemId:item.itemId}));}}>Disconnect</Button></section>)}
 </>}</Modal>}</>;
}
