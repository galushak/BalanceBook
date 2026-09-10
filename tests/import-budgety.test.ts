import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {importBudgety} from '../server/import-budgety';
import {applyMutation,balance,classification} from '../shared/domain';

function fixture(){const dir=mkdtempSync(join(tmpdir(),'budgety-import-')),path=join(dir,'source.db'),db=new DatabaseSync(path);db.exec(`
 CREATE TABLE accounts(id INTEGER PRIMARY KEY,name TEXT,account_type TEXT,is_budget_account INTEGER,starting_balance NUMERIC,is_archived INTEGER);
 INSERT INTO accounts VALUES(1,'Checking','checking',1,1000.25,0),(2,'Loan','loan',0,-2000,0);
 CREATE TABLE categories(id INTEGER PRIMARY KEY,name TEXT,is_archived INTEGER);INSERT INTO categories VALUES(1,'Bills',0);
 CREATE TABLE payees(id INTEGER PRIMARY KEY,name TEXT,manually_inactive INTEGER);INSERT INTO payees VALUES(1,'Merchant',1);
 CREATE TABLE transactions(id INTEGER PRIMARY KEY,date TEXT,payee TEXT,type TEXT,amount NUMERIC,notes TEXT,account_id INTEGER,category_id INTEGER,transfer_account_id INTEGER,payee_id INTEGER,source_savings_goal_id INTEGER,destination_savings_goal_id INTEGER);
 INSERT INTO transactions VALUES(1,'2025-01-01','Merchant old label','expense',10.15,'Retain notes',1,1,NULL,1,NULL,NULL),(2,'2025-01-02','Loan principal','transfer',100,'',1,NULL,2,NULL,NULL,NULL),(3,'2025-01-03','Old external transfer','transfer',25,'',1,NULL,NULL,NULL,NULL,NULL),(4,'2025-01-04','Allocation','transfer',50,'',1,NULL,NULL,NULL,NULL,1),(5,'2025-01-05','Income','income',30,'',1,NULL,NULL,NULL,NULL,NULL);
 CREATE TABLE planned_transactions(id INTEGER PRIMARY KEY,date TEXT,payee TEXT,type TEXT,amount NUMERIC,notes TEXT,account_id INTEGER,category_id INTEGER,transfer_account_id INTEGER,is_recurring INTEGER,frequency TEXT,remaining_occurrences INTEGER);
 INSERT INTO planned_transactions VALUES(1,'2027-01-15','Merchant','expense',5,'',1,1,NULL,1,'biweekly',4);
 CREATE TABLE savings_goals(id INTEGER PRIMARY KEY,account_id INTEGER,name TEXT,target_amount NUMERIC,saved_amount NUMERIC,target_date TEXT,notes TEXT,is_closed INTEGER);
 INSERT INTO savings_goals VALUES(1,1,'Repairs',500,0,'2027-12-31','',0);
 `);db.close();return {path,cleanup:()=>rmSync(dir,{recursive:true,force:true})}}
test('Budgety conversion preserves exact balances, history, labels and schedule start without double counting allocations',()=>{const f=fixture();try{const before=readFileSync(f.path),{state:s,report}=importBudgety(f.path);assert.deepEqual(readFileSync(f.path),before);assert.equal(s.events.length,5);assert.equal(balance(s,'budgety-account-1'),89510);assert.equal(balance(s,'budgety-account-2'),-190000);assert.ok(report.reconciliation.every(r=>r.differenceCents===0));assert.equal(s.events[0].payee,'Merchant old label');assert.equal(s.events[0].notes,'Retain notes');assert.equal(s.rules[0].start,'2027-01-15');assert.equal(s.rules[0].interval,2);assert.equal(s.rules[0].count,4);assert.equal(s.accounts[0].details.importedSavingsGoals[0].saved,5000);assert.equal(s.settings.demo,false);assert.equal(s.settings.autoPost,false);assert.equal(s.rules[0].autoSplit,false);assert.equal(s.revisions.length,6)}finally{f.cleanup()}});
test('Legacy references cannot be changed and loan principal preserves account effects with explicit reporting difference',()=>{const f=fixture();try{const {state:s}=importBudgety(f.path),loan=s.events[1],orphan=s.events[2],allocation=s.events[3];assert.equal(loan.type,'DEBT_PAYMENT');assert.equal(loan.principal,10000);assert.equal(loan.interest,0);assert.equal(classification(loan).spent,10000);assert.equal(classification(orphan).spent,0);assert.equal(orphan.entries.length,1);assert.equal(allocation.entries.length,0);for(const e of [orphan,allocation])for(const action of ['update','void','restore'])assert.throws(()=>applyMutation(s,{id:'test-change',epoch:s.epoch,collection:'events',entityId:e.id,baseVersion:e.version,action,data:e,deviceId:'test'}),/read-only/)}finally{f.cleanup()}});
test('Unsupported recurrence stops conversion instead of dropping records',()=>{const f=fixture();try{const db=new DatabaseSync(f.path);db.exec("UPDATE planned_transactions SET frequency='unsupported'");db.close();assert.throws(()=>importBudgety(f.path),/Unsupported planned frequency/)}finally{f.cleanup()}});
