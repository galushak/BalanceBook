import React,{createContext,useContext,useEffect,useId,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Check,ChevronDown} from 'lucide-react';

export const FieldLabelContext=createContext<string|undefined>(undefined);
type Option={value:string;label:string;disabled?:boolean;custom?:boolean};
export function Select(props:any){return <Dropdown {...props}/>}
export function ComboBox(props:any){return <Dropdown {...props} editable/>}

function Dropdown({options,value='',onChange,editable=false,disabled=false,className='',name,id,...props}:any){
 const fieldLabel=useContext(FieldLabelContext),listId=useId(),controlId=useId();
 const trigger=useRef<any>(null),menu=useRef<HTMLDivElement>(null),[open,setOpen]=useState(false),[active,setActive]=useState(-1),[position,setPosition]=useState<any>(null),[host,setHost]=useState<HTMLElement|null>(null);
 const typeahead=useRef({text:'',time:0});
 const choices:Option[]=options.map((o:any)=>typeof o==='string'?{value:o,label:o}:{...o,value:String(o.value)});
 const selected=choices.find(o=>o.value===String(value));
 const filtered=editable?choices.filter(o=>o.label.toLowerCase().includes(String(value).toLowerCase())):choices;
 const rows:Option[]=editable&&String(value).trim()&&!choices.some(o=>o.label.toLowerCase()===String(value).trim().toLowerCase())?[...filtered,{value:String(value).trim(),label:`Use “${String(value).trim()}”`,custom:true}]:filtered;
 const signature=rows.map(o=>o.value+'|'+o.disabled).join('\n');
 const optionId=(i:number)=>listId+'-'+i;
 function show(last=false){if(disabled)return;setHost(trigger.current.closest('[role="dialog"]')||document.body);setOpen(true);const current=rows.findIndex(o=>o.value===String(value)&&!o.disabled);setActive(last?rows.findLastIndex(o=>!o.disabled):current>=0?current:rows.findIndex(o=>!o.disabled))}
 function choose(o:Option){if(o.disabled)return;onChange?.({target:{value:o.value,name},currentTarget:{value:o.value,name}});setOpen(false);trigger.current.focus()}
 useEffect(()=>{if(open)setActive(rows.findIndex(o=>o.value===String(value)&&!o.disabled))},[signature]);
 useLayoutEffect(()=>{if(!open)return;const place=()=>{const r=trigger.current.getBoundingClientRect(),width=Math.min(Math.max(r.width,200),window.innerWidth-16),below=window.innerHeight-r.bottom-12,above=r.top-12,up=below<Math.min(260,rows.length*40+12)&&above>below,maxHeight=Math.min(300,Math.max(80,up?above:below));setPosition({position:'fixed',left:Math.max(8,Math.min(r.left,window.innerWidth-width-8)),width,maxHeight,...(up?{bottom:window.innerHeight-r.top+5}:{top:r.bottom+5})})};place();window.addEventListener('resize',place);window.addEventListener('scroll',place,true);return()=>{window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true)}},[open,signature]);
 useEffect(()=>{if(!open)return;const outside=(e:PointerEvent)=>{if(!trigger.current?.parentElement.contains(e.target)&&!menu.current?.contains(e.target as Node))setOpen(false)};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside)},[open]);
 useEffect(()=>{if(open&&active>=0)menu.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({block:'nearest'})},[active,open]);
 function keydown(e:React.KeyboardEvent){
  if(e.key==='Escape'&&open){e.preventDefault();e.stopPropagation();setOpen(false);return}
  if(e.key==='Tab'){setOpen(false);return}
  if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();if(!open){show(e.key==='ArrowUp');return}const delta=e.key==='ArrowDown'?1:-1;let next=active;for(let i=0;i<rows.length;i++){next=(next+delta+rows.length)%rows.length;if(!rows[next].disabled){setActive(next);break}}return}
  if(open&&(!editable||e.ctrlKey)&&['Home','End'].includes(e.key)){e.preventDefault();setActive(e.key==='Home'?rows.findIndex(o=>!o.disabled):rows.findLastIndex(o=>!o.disabled));return}
  if(e.key==='Enter'||(!editable&&e.key===' ')){if(open){e.preventDefault();if(rows[active])choose(rows[active]);else setOpen(false)}else if(!editable){e.preventDefault();show()}return}
  if(!editable&&e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();const now=Date.now(),text=now-typeahead.current.time>700?e.key:typeahead.current.text+e.key;typeahead.current={text,time:now};if(!open)show();const match=rows.findIndex(o=>!o.disabled&&o.label.toLowerCase().startsWith(text.toLowerCase()));if(match>=0)setActive(match)}
 }
 const common={...props,id:id||controlId,ref:trigger,role:'combobox','aria-expanded':open,'aria-haspopup':'listbox' as const,'aria-controls':open?listId:undefined,'aria-activedescendant':open&&active>=0?optionId(active):undefined,'aria-labelledby':props['aria-label']?undefined:(props['aria-labelledby']||fieldLabel),disabled,onKeyDown:keydown,onBlur:(e:React.FocusEvent)=>{if(!menu.current?.contains(e.relatedTarget as Node))setOpen(false)}};
 return <span className={`app-select ${editable?'editable ':''}${className}`}>
  {editable?<input {...common} className="app-combobox-input" autoComplete="off" spellCheck={false} value={value} name={name} aria-autocomplete="list" onFocus={()=>show()} onClick={()=>{if(!open)show()}} onChange={e=>{onChange?.(e);if(!open)show();setActive(-1)}}/>:<button {...common} type="button" className="app-select-trigger" onClick={()=>open?setOpen(false):show()}><span>{selected?.label||'Choose…'}</span><ChevronDown size={15}/></button>}
  {editable&&<ChevronDown className="combobox-chevron" size={15}/>}
  {!editable&&name&&<input type="hidden" name={name} value={value}/>}
  {open&&host&&position&&createPortal(<div ref={menu} role="listbox" id={listId} aria-label={props['aria-label']?`${props['aria-label']} options`:undefined} aria-labelledby={props['aria-label']?undefined:fieldLabel} className="app-dropdown-menu" style={position} onPointerDown={e=>e.preventDefault()}>{rows.length?rows.map((o,i)=><div id={optionId(i)} key={o.value} role="option" aria-selected={o.value===String(value)} aria-disabled={o.disabled||undefined} data-index={i} className={`app-dropdown-option ${active===i?'highlighted ':''}${o.custom?'custom-option':''}`} onPointerMove={()=>{if(!o.disabled)setActive(i)}} onClick={e=>{e.stopPropagation();choose(o)}}><span>{o.label}</span>{o.value===String(value)&&!o.custom&&<Check size={14}/>}</div>):<div className="app-dropdown-empty">No options available</div>}</div>,host)}
 </span>;
}
