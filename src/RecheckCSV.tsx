import React,{useState} from 'react';
import {api} from './ledger';
import {Button} from './components';

export function RecheckCSV({session,l}:any){
 const [busy,setBusy]=useState(false);
 const attachment=l.state.attachments.find(a=>a.id===session.attachmentId);
 if(attachment?.mime!=='text/csv'||session.status!=='OPEN'||session.items.some(i=>i.status!=='UNMATCHED'))return null;
 async function recheck(){
  setBusy(true);
  try{
   const parsed=await api('/parse-statement',{attachmentId:session.attachmentId,accountId:session.accountId,tolerance:session.tolerance??3});
   if(parsed.format!=='Discover')throw new Error('Automatic rechecking currently supports Discover exports. For other formats, start a new import preview to verify your column mapping.');
   if(parsed.issues?.length||parsed.items.length!==session.items.length)throw new Error('The file needs a new import preview. This review has not been changed.');
   const items=parsed.items.map(item=>({...item,id:session.items.find(old=>old.sourceRow===item.sourceRow)?.id||item.id}));
   await l.mutate('reconciliations','update',{...session,items},session.id,{baseVersion:session.version});
   l.setNotice('CSV amounts and match suggestions rechecked. No ledger transactions changed.');
  }catch(e:any){l.setError(e.message)}finally{setBusy(false)}
 }
 return <Button disabled={busy||!l.online} onClick={recheck}>{busy?'Rechecking…':'Recheck CSV'}</Button>;
}
