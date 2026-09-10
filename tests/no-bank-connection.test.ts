import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store} from '../server/store';
import {createApp} from '../server/index';

test('bank connection endpoints are gone and CSP permits only local scripts and connections',async()=>{
 const store=new Store(mkdtempSync(join(tmpdir(),'bb-no-bank-'))),{app}=await createApp(store);
 try{
  const setup=await app.inject({method:'POST',url:'/api/v1/setup',headers:{'x-requested-with':'balancebook'},payload:{email:'test@example.com',password:'TestOwner2026!',demo:false}});
  assert.equal(setup.statusCode,200);const headers={cookie:'bb_session='+setup.cookies[0].value,'x-requested-with':'balancebook'};
  for(const path of ['','/config','/link','/exchange','/accounts','/map','/sync','/disconnect']){
   const response=await app.inject({method:path?'POST':'GET',url:'/api/v1/plaid'+path,headers,...(path?{payload:{}}:{})});assert.equal(response.statusCode,404);
  }
  const response=await app.inject({url:'/api/v1/state',headers});assert.equal(response.statusCode,200);
  const csp=String(response.headers['content-security-policy']);assert.match(csp,/script-src 'self';/);assert.match(csp,/connect-src 'self';/);assert.match(csp,/frame-src 'none';/);assert.ok(!csp.includes('plaid'));
 }finally{await app.close();store.close();}
});
