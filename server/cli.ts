import {Store} from './store';
import argon2 from 'argon2';
import {readFileSync} from 'node:fs';
const store=new Store();const action=process.argv[2];
if(action==='backup'){console.log(store.backup().filename)}
else if(action==='restore'){if(process.argv[4]!=='--confirm')throw new Error('Usage: npm run recovery -- restore /path/backup.zip --confirm');console.log(store.restore(readFileSync(process.argv[3])))}
else if(action==='reset-password'){const password=process.env.RECOVERY_PASSWORD;if(!password||password.length<10)throw new Error('Set RECOVERY_PASSWORD to a password of at least 10 characters. It is never printed.');const owner=store.meta('owner');if(!owner)throw new Error('No owner configured.');store.setMeta('owner',{...owner,password:await argon2.hash(password,{type:argon2.argon2id,memoryCost:19456,timeCost:2,parallelism:1})});store.db.exec('DELETE FROM sessions');console.log('Password reset; sessions invalidated.');}
else throw new Error('Choose backup, restore, or reset-password.');store.close();
