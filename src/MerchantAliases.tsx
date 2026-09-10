import React,{useState} from 'react';
import {learnedAliases} from '../shared/merchants';
import {Button,Modal,Select} from './components';
export function MerchantAliases({l}:any){
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false);
 const aliases=learnedAliases(l.state);
 async function save(alias:any,patch:any){setBusy(true);try{
  const settings=l.state.settings;
  await l.mutate('settings','update',{...settings,merchantAliases:[...(settings.merchantAliases||[]).filter(a=>a.id!==alias.id),{...alias,...patch}]},'settings',{baseVersion:settings.version||0});
 }catch(e:any){l.setError(e.message)}finally{setBusy(false)}}
 return <><Button onClick={()=>setOpen(true)}>Learned payees</Button>{open&&<Modal title="Learned payees" onClose={()=>setOpen(false)}><p>Confirmed matches teach payee names for future imports on the same account. Removing an alias stops using it without changing transactions.</p>{!aliases.length&&<p>No learned payees yet. Confirm a match to teach one.</p>}{aliases.map(a=><div key={a.id}><strong>{a.key}</strong><p>{l.state.accounts.find(v=>v.id===a.accountId)?.name}{a.disabled?' · Disabled':''}</p><Select aria-label={'Payee for '+a.key} value={a.payeeId} disabled={busy} onChange={e=>save(a,{payeeId:e.target.value,disabled:false})} options={l.state.payees.filter(p=>p.active).map(p=>({value:p.id,label:p.name}))}/><Button disabled={busy} onClick={()=>save(a,{disabled:!a.disabled})}>{a.disabled?'Enable':'Remove alias'}</Button></div>)}</Modal>}</>;
}
