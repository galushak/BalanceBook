import React,{createContext,useContext,useRef,useState,useEffect} from 'react';
import {Modal,Button,Field} from './components';
type Options={title?:string;confirmLabel?:string;danger?:boolean;initialValue?:string;inputLabel?:string};
type Request={id:number;kind:'confirm'|'prompt';message:string;options:Options;resolve:(v:any)=>void};
const DialogContext=createContext<any>(null);
export function DialogProvider({children}:React.PropsWithChildren){
 const queue=useRef<Request[]>([]),sequence=useRef(0),[current,setCurrent]=useState<Request|null>(null);
 const ask=(kind:Request['kind'],message:string,options:Options={})=>new Promise<any>(resolve=>{const r={id:++sequence.current,kind,message,options,resolve};queue.current.push(r);if(queue.current.length===1)setCurrent(r)});
 const finish=(value:any)=>{const item=queue.current.shift();setCurrent(queue.current[0]||null);item?.resolve(value)};
 const dismissAll=()=>{const requests=queue.current.splice(0);setCurrent(null);for(const r of requests)r.resolve(r.kind==='confirm'?false:null)};
 useEffect(()=>()=>{for(const r of queue.current)r.resolve(r.kind==='confirm'?false:null);queue.current=[]},[]);
 return <DialogContext.Provider value={{confirm:(message:string,options?:Options)=>ask('confirm',message,options),prompt:(message:string,initialValue='')=>ask('prompt',message,{initialValue}),dismissAll}}>{children}{current&&<DecisionDialog key={current.id} request={current} finish={finish}/>}</DialogContext.Provider>;
}
function DecisionDialog({request:r,finish}:any){const [value,setValue]=useState(r.options.initialValue||'');const cancel=()=>finish(r.kind==='confirm'?false:null);return <Modal title={r.options.title||(r.kind==='confirm'?'Confirm action':'Enter details')} onClose={cancel}><form autoComplete="off" onSubmit={e=>{e.preventDefault();finish(r.kind==='confirm'?true:value)}}><p className="dialog-message">{r.message}</p>{r.kind==='prompt'&&<Field label={r.options.inputLabel||'Value'}><input autoComplete="off" autoFocus value={value} onChange={e=>setValue(e.target.value)}/></Field>}<div className="form-actions"><Button type="button" onClick={cancel}>Cancel</Button><Button type="submit" primary={!r.options.danger} danger={r.options.danger}>{r.options.confirmLabel||(r.kind==='prompt'?'Save':'Continue')}</Button></div></form></Modal>}
export function useDialogs(){const value=useContext(DialogContext);if(!value)throw new Error('DialogProvider is required');return value;}
