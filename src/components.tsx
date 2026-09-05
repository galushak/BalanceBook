import React from 'react';
import {createPortal} from 'react-dom';
import {X,ArrowUpDown,ChevronDown} from 'lucide-react';
import {money} from '../shared/domain';
import {FieldLabelContext} from './Dropdown';
export {Select,ComboBox} from './Dropdown';
export const Money=({value,signed=false,className=''}:{value:number;signed?:boolean;className?:string})=><span className={`money ${value<0?'negative':value>0?'positive':''} ${className}`}>{money(value,signed)}</span>;
export const Button=({children,primary=false,danger=false,...p}:any)=><button {...p} className={`${primary?'primary ':''}${danger?'danger ':''}${p.className||''}`}>{children}</button>;
export function Panel({title,action,children,className=''}:any){return <section className={'panel '+className}><header className="panel-header"><h2>{title}</h2>{action}</header><div className="panel-body">{children}</div></section>}
export function Field({label,children,hint,required=false}:any){const labelId=React.useId();return <FieldLabelContext.Provider value={labelId}><label className="field"><span id={labelId}>{label}{required&&<small className="required"> *</small>}</span>{children}{hint&&<small>{hint}</small>}</label></FieldLabelContext.Provider>}
const modalStack:HTMLElement[]=[];
let originalOverflow='';
export function Modal({title,children,onClose,wide=false}:any){
 const root=React.useRef<HTMLElement>(null),close=React.useRef(onClose);close.current=onClose;
 React.useEffect(()=>{const dialog=root.current!,previous=document.activeElement as HTMLElement;
  if(!modalStack.length){originalOverflow=document.body.style.overflow;document.body.style.overflow='hidden';document.getElementById('root')?.setAttribute('inert','')}
  modalStack.push(dialog);const background=modalStack.at(-2);if(background)background.inert=true;
  (dialog.querySelector<HTMLElement>('[autofocus]')||dialog).focus();
  const keydown=(e:KeyboardEvent)=>{if(modalStack.at(-1)!==dialog)return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close.current();return}if(e.key!=='Tab')return;
   const els=Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')).filter(el=>el.tabIndex>=0&&el.getClientRects().length>0&&!el.closest('[inert]'));
   if(!els.length){e.preventDefault();dialog.focus();return}const first=els[0],last=els.at(-1)!;
   if(e.shiftKey&&(document.activeElement===first||document.activeElement===dialog)){e.preventDefault();last.focus()}else if(!e.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){e.preventDefault();first.focus()}
  };document.addEventListener('keydown',keydown);
  return()=>{document.removeEventListener('keydown',keydown);const index=modalStack.indexOf(dialog);if(index>=0)modalStack.splice(index,1);const top=modalStack.at(-1);if(top)top.inert=false;else{document.body.style.overflow=originalOverflow;document.getElementById('root')?.removeAttribute('inert')}if(previous?.isConnected&&!previous.closest('[inert]'))previous.focus()};
 },[]);
 return createPortal(<div className="modal-backdrop"><section ref={root} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} className={'modal '+(wide?'wide':'')}><header><h2>{title}</h2><button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={18}/></button></header><div className="modal-content">{children}</div></section></div>,document.body);
}
export const Empty=({children,action}:any)=><div className="empty"><p>{children}</p>{action}</div>;
export const Badge=({children,tone=''}:any)=><span className={'badge '+tone}>{children}</span>;
export function Title({title,sub,actions}:any){return <div className="page-title"><div><h1>{title}</h1>{sub&&<p>{sub}</p>}</div><div className="actions">{actions}</div></div>}
export function MiniChart({rows}:{rows:{label:string;value:number}[]}){if(!rows.length)return <Empty>No figures for this selection.</Empty>;const step=rows.length>60?Math.ceil(rows.length/60):1;const pts=rows.filter((_,i)=>i%step===0);const min=Math.min(0,...pts.map(p=>p.value)),max=Math.max(1,...pts.map(p=>p.value));const points=pts.map((p,i)=>`${15+i/(pts.length-1||1)*770},${160-(p.value-min)/(max-min)*140}`).join(' ');return <svg className="chart" viewBox="0 0 800 180" role="img" aria-label="Balance chart. Exact values appear in the accompanying table."><line x1="15" x2="785" y1="160" y2="160" stroke="var(--line)"/><polyline points={points} fill="none" stroke="var(--accent)" strokeWidth="2.5"/>{pts.length===1&&<circle cx="15" cy="20" r="4" fill="var(--accent)"/>}</svg>}
