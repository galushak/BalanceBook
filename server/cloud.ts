import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {join,basename} from 'node:path';
import type {Store} from './store';
const execute=promisify(execFile);
// The remote is operator configured, never accepted from an HTTP request.
// Only a crypt remote is permitted so the app cannot upload plaintext archives.
export async function copyCloudBackups(store:Store){
 const remote=process.env.RCLONE_REMOTE;if(!remote)return;
 const rows:any[]=store.db.prepare("SELECT * FROM backups WHERE cloud_status != 'copied' ORDER BY created_at DESC LIMIT 3").all();
 if(!rows.length)return;
 try{
  if(!/^[a-zA-Z0-9_-]+:$/.test(remote))throw Error('configuration');
  const {stdout}=await execute('rclone',['config','dump'],{timeout:15000,maxBuffer:1024*1024,windowsHide:true});
  const config=JSON.parse(stdout);if(config[remote.slice(0,-1)]?.type!=='crypt')throw Error('encryption');
  for(const row of rows){try{
   await execute('rclone',['copyto',join(store.dir,'backups',basename(row.filename)),remote+'balancebook/'+basename(row.filename),'--retries','2','--low-level-retries','2'],{timeout:300000,maxBuffer:1024*1024,windowsHide:true});
   store.db.prepare('UPDATE backups SET cloud_status=? WHERE id=?').run('copied',row.id);
  }catch{store.db.prepare('UPDATE backups SET cloud_status=? WHERE id=?').run('failed · check rclone access',row.id);}}
 }catch{for(const row of rows)store.db.prepare('UPDATE backups SET cloud_status=? WHERE id=?').run('failed · crypt remote required',row.id);}
}
