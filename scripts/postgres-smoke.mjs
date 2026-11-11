import assert from 'node:assert/strict';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {migrate} from './migrate.mjs';
import {seed} from './seed.mjs';
import {run,reads} from './paid-search.mjs';
import path from 'node:path';
if(!process.env.DATABASE_URL)throw Error('Use a disposable PostgreSQL database');
const db=await getDb();try{
 await migrate(db);assert.equal((await db.query('select count(*) n from accounts'))[0].n,0,'Use an empty test database');await seed(db);
 for(const cmd of Object.keys(reads))assert.ok(Array.isArray(await run(db,[cmd])));
 const pacing=await run(db,['budget-pacing']);assert.equal(Number(pacing.find(x=>x.ref==='PLAN-SEARCH').projected_cents),720000);
 await run(db,['import','optmyzr'],{file:path.join(REPO_ROOT,'fixtures/optmyzr-accounts.csv'),platform:'google',from:'2026-01-01',to:'2026-01-10'});
 await run(db,['approve','ACT-SEARCH'],{by:'Test owner',evidence:'Test decision'});await run(db,['complete','ACT-SEARCH'],{evidence:'Test complete'});
 console.log('PASS: PostgreSQL migrations, seed, every read, exact-cycle arithmetic, import and approval transition');
}finally{await db.close();}
