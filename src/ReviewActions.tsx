import {splitMatches} from '../shared/split-match';
import {ReplaceAdjustment} from './ReplaceAdjustment';
import React,{useState} from 'react';
import {Button,Modal,Money,Select,Field} from './components';
import {suggestMerchant,learnedAliases} from '../shared/merchants';
import {dateAdd,money} from '../shared/domain';

export function adjustmentFor(state:any,session:any,item:any){
 if(item.amount>=0||item.suggestions?.length)return null;
 return state.events.find(e=>{
  if(e.status!=='ACTIVE'||!(e.type==='ADJUSTMENT'||e.payee==='Balance Adjustment'))return false;
  const effect=e.entries.find(a=>a.accountId===session.accountId)?.amount;
  if(!effect||effect>=0||item.date>e.date||item.date<dateAdd(e.date,-10))return false;
  const rows=session.items.filter(i=>i.amount<0&&i.status!=='LINKED'&&i.status!=='IGNORED'&&!i.suggestions?.length&&i.date<=e.date&&i.date>=dateAdd(e.date,-10));
  return rows.length>=1&&rows.reduce((n,i)=>n+i.amount,0)===effect;
 });
}

export function ReviewActions({state:s,session,item,updateItem,add,openTx,l}:any){
 const [replacing,setReplacing]=useState(false),[more,setMore]=useState(false),[finding,setFinding]=useState(false),[selected,setSelected]=useState(''),[search,setSearch]=useState(''),[busy,setBusy]=useState(false);
 const candidates=(item.suggestions||[]).map(v=>s.events.find(e=>e.id===v.id&&e.status==='ACTIVE')).filter(Boolean);
 const splits=splitMatches(s,session,item);const split=splits.length===1?splits[0]:null;
 const matchSplit=async()=>{if(!split)return;setBusy(true);try{await l.mutate('reconciliations','match-split',{rowId:item.id,principalId:split.principal.id,interestId:split.interest.id},session.id,{baseVersion:session.version});setFinding(false);l.setNotice('Bank withdrawal matched to principal and interest. Balances unchanged.');}catch(e:any){l.setError(e.message)}finally{setBusy(false)}};
 const match=candidates[0],adjustment=adjustmentFor(s,session,item),linked=s.events.find(e=>e.id===item.linkedTransactionId);
 const work=async(patch:any)=>{setBusy(true);try{await updateItem(item,patch)}finally{setBusy(false);setMore(false)}};
 const link=async(e:any)=>{const effect=e.entries.filter(a=>a.accountId===session.accountId).reduce((n,a)=>n+a.amount,0);const difference=item.amount-effect;if(difference&&!await l.confirm(`Bank amount ${money(item.amount)} differs from ledger amount ${money(effect)} by ${money(Math.abs(difference))}. Link them without changing either amount? The difference will remain flagged for review.`))return;await work({status:'LINKED',linkedTransactionId:e.id,reconciliationWarning:difference?`Amount difference: bank ${money(item.amount)}, ledger ${money(effect)}. Ledger unchanged.`:undefined});setFinding(false)};
 const [adding,setAdding]=useState(false);const addition=()=>{setMore(false);setAdding(true)};
 if(item.status==='LINKED')return <div className="csv-decision"><strong>Already recorded</strong>{(item.linkedTransactionIds||[item.linkedTransactionId]).map(id=>{const tx=s.events.find(e=>e.id===id);return tx&&<Button key={id} onClick={()=>openTx(tx)}>{item.linkedTransactionIds?tx.type==='DEBT_PAYMENT'?'View principal':'View interest':'View transaction'}</Button>})}</div>;
 if(item.status==='IGNORED')return <div className="csv-decision"><strong>Skipped</strong>{session.status==='OPEN'&&<Button onClick={()=>work({status:'UNMATCHED'})} disabled={busy}>Review again</Button>}</div>;
 if(session.status!=='OPEN')return <span>Left unresolved</span>;
 return <div className="csv-decision">
  {split?<><strong>Matches your split loan payment</strong><small>{split.loan.name} � {split.principal.date}</small><small>Principal {money(split.principal.amount)} + interest {money(split.interest.amount)} = {money(-item.amount)}</small><Button primary disabled={busy} onClick={matchSplit}>Match split payment</Button></>:adjustment?<><strong>May already be covered</strong><small>Unmatched purchases total {money(adjustment.amount)}, matching the adjustment dated {adjustment.date}. Check it before adding.</small><Button primary onClick={()=>setReplacing(true)}>Replace part of adjustment</Button></>:match?<><strong>Likely already recorded</strong><small>{match.payee} · {match.date} · {money(match.amount)}</small><Button primary disabled={busy} onClick={()=>link(match)}>{match.type==='TRANSFER'?'Match existing transfer':'Confirm match'}</Button></>:<><strong>No matching transaction found</strong><Button primary onClick={addition}>Add transaction</Button></>}
  <button className="link" aria-expanded={more} onClick={()=>setMore(!more)}>Other options</button>
  {adding&&<ReplaceAdjustment l={l} session={session} item={item} onClose={()=>setAdding(false)}/>}
  {replacing&&adjustment&&<ReplaceAdjustment l={l} session={session} item={item} adjustment={adjustment} onClose={()=>setReplacing(false)}/>}
  {more&&<div className="csv-other">{adjustment&&<Button onClick={()=>openTx(adjustment)}>View adjustment</Button>}<Button onClick={()=>{setFinding(true);setMore(false)}}>Find another match</Button>{(match||adjustment)&&<Button onClick={async()=>{if(!await l.confirm('Adding creates a new transaction and changes your balance. Check that this purchase is not already recorded or covered by an adjustment. Continue?'))return;addition()}}>Add as new transaction</Button>}<Button disabled={busy} onClick={()=>work({status:'IGNORED'})}>Skip this row</Button></div>}
  {finding&&<Modal title="Find an existing transaction" onClose={()=>setFinding(false)}><p>Selecting a match links this statement row without adding another transaction.</p>{split&&<div className="banner"><strong>{split.loan.name}: principal + interest</strong><p>{money(split.principal.amount)} + {money(split.interest.amount)} = {money(-item.amount)}. Both entries stay unchanged.</p><Button primary disabled={busy} onClick={matchSplit}>Match split payment</Button></div>}<Field label="Search existing transactions"><input autoComplete="off" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Payee, date, or amount"/></Field><p>Showing transactions on this account, nearest dates first. Amounts may differ.</p><Field label="Existing transaction"><Select value={selected} onChange={e=>setSelected(e.target.value)} options={[{value:'',label:'Choose a transaction'},...s.events.filter(e=>e.status==='ACTIVE'&&e.entries.some(a=>a.accountId===session.accountId&&Math.sign(a.amount)===Math.sign(item.amount))&&(!search||`${e.payee} ${e.date} ${money(e.amount)}`.toLowerCase().includes(search.toLowerCase()))).sort((a,b)=>Math.abs(Date.parse(a.date)-Date.parse(item.date))-Math.abs(Date.parse(b.date)-Date.parse(item.date))).map(e=>({value:e.id,label:`${e.date} - ${e.payee} - ${money(e.amount)}`}))]}/></Field>{selected&&<Button onClick={()=>openTx(s.events.find(e=>e.id===selected))}>View or edit transaction</Button>}<Button primary disabled={!selected||busy} onClick={()=>link(s.events.find(e=>e.id===selected))}>Confirm match</Button></Modal>}
 </div>;
}
