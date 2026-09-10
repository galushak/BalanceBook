import {learnedAliases} from '../shared/merchants';
import React from 'react';
import {Money,Button} from './components';
import {MerchantDescription} from './MerchantDescription';
import {ReviewActions} from './ReviewActions';
export function ReviewRows({s,session,updateItem,add,openTx,l}:any){
 const automatic=session.items.filter(i=>i.status==='LINKED'&&i.autoMatched&&!i.providerWarning);
 const table=(items:any[])=> <div className="table-scroll"><table><thead><tr><th>Date</th><th>Description</th><th>Statement amount</th><th>Next step</th></tr></thead><tbody>{items.map(item=><tr key={item.id}><td>{item.date}</td><td><MerchantDescription description={item.description} payees={s.payees} aliases={learnedAliases(s)} accountId={session.accountId}/></td><td><Money value={item.amount}/></td><td>{item.reconciliationWarning&&<p className="negative">{item.reconciliationWarning}</p>}{item.providerWarning&&<p role="alert" className="negative">{item.providerWarning}</p>}<ReviewActions state={s} session={session} item={item} updateItem={updateItem} add={add} openTx={openTx} l={l}/>{item.autoMatched&&session.status==='OPEN'&&<Button onClick={()=>updateItem(item,{status:'UNMATCHED',linkedTransactionId:undefined,autoMatched:false,autoMatchDisabled:true})}>Undo automatic match</Button>}</td></tr>)}</tbody></table></div>;
 return <>{table(session.items.filter(i=>!(i.status==='LINKED'&&i.autoMatched&&!i.providerWarning)))}{automatic.length>0&&<details><summary>Automatically matched ({automatic.length})</summary><p>Linked to existing transactions. No balances changed.</p>{table(automatic)}</details>}</>;
}
