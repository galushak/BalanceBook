import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store} from '../server/store';
import {createApp} from '../server/index';

test('bank connection settings require authentication and allow the Plaid Link origin',async()=>{
 const store=new Store(mkdtempSync(join(tmpdir(),'bb-no-bank-'))),{app}=await createApp(store);
 try{
  const setup=await app.inject({method:'POST',url:'/api/v1/setup',headers:{'x-requested-with':'balancebook'},payload:{email:'test@example.com',password:'TestOwner2026!',demo:false}});
  assert.equal(setup.statusCode,200);const headers={cookie:'bb_session='+setup.cookies[0].value,'x-requested-with':'balancebook'};
  assert.equal((await app.inject('/api/v1/plaid')).statusCode,401);
  assert.equal((await app.inject({url:'/api/v1/plaid',headers})).json().configured,false);
  const response=await app.inject({url:'/api/v1/state',headers});assert.equal(response.statusCode,200);
  const csp=String(response.headers['content-security-policy']);assert.ok(csp.includes('https://cdn.plaid.com'));assert.ok(!csp.includes('script-src *'));
 }finally{await app.close();store.close();}
});
