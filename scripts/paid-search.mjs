#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {parseCsv,pick} from './lib/csv.mjs';
import {table as textTable} from './lib/format.mjs';
import {page,table,record,writeOut} from './lib/render.mjs';

export const reads={
 accounts:'select ref,name,platform,external_id,currency,owner from accounts order by ref',
 performance:'select ref,name,currency,period_start,period_end,cost_cents,conversions,cpa_cents,roas,age_days from latest_performance order by ref',
 'budget-pacing':'select ref,name,currency,measured_through,budget_cents,cost_cents,projected_cents,remaining_cents,required_daily_cents,review from budget_pacing order by ref',
 'zero-conversions':'select ref,name,currency,period_start,period_end,cost_cents,clicks,conversions from latest_performance where cost_cents>0 and conversions=0 order by ref',
 'stale-exports':'select ref,name,period_end,age_days from latest_performance where period_end is null or age_days>2 order by ref',
 'approval-queue':"select x.ref,a.name,x.title,x.owner,x.due_date,x.proposed_change,x.rationale from actions x join accounts a on a.id=x.account_id where x.status='proposed' order by x.due_date,x.ref",
 'overdue-actions':'select * from overdue_actions order by due_date,ref',
 actions:'select x.ref,a.name,x.title,x.owner,x.due_date,x.status from actions x join accounts a on a.id=x.account_id order by x.ref',
 compliance:'select * from compliance_findings order by ref,rule',
 attention:'select * from attention order by kind,ref',
 'morning-review':'select * from attention order by kind,ref',
 notes:'select a.ref,n.author,n.body,n.created_at from notes n join accounts a on a.id=n.account_id order by n.created_at,n.id',
 audit:'select relation_name,record_id,operation,created_at,before_record,after_record from audit_events order by created_at desc,id limit 100',
 'currency-totals':'select currency,period_start,period_end,count(*) accounts,count(cost_cents) accounts_with_cost,count(conversions) accounts_with_conversions,sum(cost_cents) cost_cents,sum(conversions) conversions from latest_performance where period_end is not null group by currency,period_start,period_end order by currency,period_start,period_end',
 'missing-metrics':'select ref,name,period_start,period_end,cost_cents,conversions,conversion_value_cents from latest_performance where cost_cents is null or conversions is null or conversion_value_cents is null order by ref'
};
export const backupTables=['accounts','snapshots','budget_plans','actions','notes','audit_events'];
export function date(v,label='date') {if(!/^\d{4}-\d{2}-\d{2}$/.test(v||'')||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)throw Error(`${label} must be a real YYYY-MM-DD date`);return v;}
function required(v,label){if(typeof v!=='string'||!v.trim())throw Error(`${label} is required`);return v.trim();}
function numeric(v,label,{integer=false,money=false}={}){
 if(v===null||v===undefined||String(v).trim()===''||/^(--|n\/a|na)$/i.test(String(v).trim()))return null;
 let s=String(v).trim();
 if(money)s=s.replace(/^(?:[A-Z]{3}\s*|(?:US|NZ|AU|A)?\$\s*|€|£)/,'');
 if(!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(s))throw Error(`${label} must be a non-negative number in dot-decimal format`);
 s=s.replaceAll(',','');
 if(money&&!/^\d+(\.\d{1,2})?$/.test(s))throw Error(`${label} has more than two decimal places`);
 const n=Number(s)*(money?100:1), value=money?Math.round(n):n;
 if(!Number.isFinite(value)||value>9000000000000||(integer&&!Number.isInteger(value)))throw Error(`${label} is outside its supported range`);
 return value;
}
export async function resolve(db,entity,query){
 if(!['accounts','actions'].includes(entity))throw Error('Unknown record type');
 required(query,'record');const name=entity==='accounts'?'name':'title';
 let rows=await db.query(`select * from ${entity} where lower(ref)=lower($1) or id::text=$1`,[query]);
 if(!rows.length)rows=await db.query(`select * from ${entity} where starts_with(id::text,lower($1)) or position(lower($1) in lower(${name}))>0 order by ref`,[query]);
 if(rows.length!==1)throw Error(rows.length?`Ambiguous ${entity}:\n${rows.map(r=>`${r.ref} | ${r[name]} | ${r.id}`).join('\n')}`:`No ${entity} record matches ${query}`);
 return rows[0];
}
async function insert(db,t,data){const keys=Object.keys(data);return (await db.query(`insert into ${t} (${keys.join(',')}) values (${keys.map((_,i)=>'$'+(i+1)).join(',')}) returning *`,keys.map(k=>data[k])))[0];}
function fields(data,allowed){for(const k of Object.keys(data))if(!allowed.includes(k))throw Error(`Unknown field: ${k}`);}
export async function importOptmyzr(db,o){
 const from=date(o.from,'--from'),to=date(o.to,'--to');if(to<from||to>new Date().toISOString().slice(0,10))throw Error('Export dates must be ordered and not in the future');
 if(!['google','microsoft','meta','amazon','linkedin','yahoo'].includes(o.platform))throw Error('--platform must name one supported platform; export each platform separately');
 const rows=parseCsv(fs.readFileSync(required(o.file,'--file'),'utf8'));if(!rows.length)throw Error('CSV has no account rows');
 const map=o.map?JSON.parse(fs.readFileSync(o.map,'utf8')):{};
 const canonical=['Account Id','Account Name','Currency','Account Owner','Tags','Notes','Monthly Budget','Cost','Impr','Clicks','Conv','Conv Val','Quality Score'];
 fields(map,canonical);for(const [k,v]of Object.entries(map))if(typeof v!=='string'||!Object.hasOwn(rows[0],v))throw Error(`Mapped column missing for ${k}`);
 const get=(r,k,...aliases)=>pick(r,map[k]||k,...(map[k]?[]:aliases));
 for(const k of ['Account Id','Account Name','Currency','Cost'])if(!Object.keys(rows[0]).some(h=>h.toLowerCase()===(map[k]||k).toLowerCase()))throw Error(`Required export column missing: ${k}`);
 const seen=new Set();let accounts=0,snapshots=0;
 await db.exec('BEGIN');try{
 for(const r of rows){
  const ext=required(get(r,'Account Id'),'Account Id');if(seen.has(ext))throw Error(`Duplicate account in export: ${ext}`);seen.add(ext);
  const name=required(get(r,'Account Name'),'Account Name');const currency=required(get(r,'Currency'),'Currency').toUpperCase();if(!/^[A-Z]{3}$/.test(currency))throw Error('Currency must be a three-letter code');
  let a=(await db.query('select * from accounts where platform=$1 and external_id=$2',[o.platform,ext]))[0];
  if(a&&a.currency!==currency)throw Error(`Currency changed for ${ext}; separate the account history before importing`);
  if(!a){a=await insert(db,'accounts',{ref:`${o.platform}:${ext}`,platform:o.platform,external_id:ext,name,currency,owner:get(r,'Account Owner','Owner'),tags:get(r,'Tags'),vendor_notes:get(r,'Notes')});accounts++;}
  else await db.query('update accounts set name=$1,tags=$2,vendor_notes=$3 where id=$4',[name,get(r,'Tags'),get(r,'Notes'),a.id]);
  const data={account_id:a.id,period_start:from,period_end:to,cost_cents:numeric(get(r,'Cost'),'Cost',{money:true}),impressions:numeric(get(r,'Impr','Impressions'),'Impr',{integer:true}),clicks:numeric(get(r,'Clicks'),'Clicks',{integer:true}),conversions:numeric(get(r,'Conv','Conversions'),'Conv'),conversion_value_cents:numeric(get(r,'Conv Val','Conversion Value'),'Conv Val',{money:true}),reported_budget_cents:numeric(get(r,'Monthly Budget'),'Monthly Budget',{money:true}),quality_score:numeric(get(r,'Quality Score'),'Quality Score'),raw_export:JSON.stringify(r),source:'Optmyzr All Accounts Dashboard CSV'};
  const keys=Object.keys(data);await db.query(`insert into snapshots (${keys.join(',')}) values (${keys.map((_,i)=>'$'+(i+1)).join(',')}) on conflict(account_id,period_start,period_end) do update set ${keys.filter(k=>!['account_id','period_start','period_end'].includes(k)).map(k=>`${k}=excluded.${k}`).join(',')}`,keys.map(k=>data[k]));snapshots++;
 }
 await db.exec(o['dry-run']?'ROLLBACK':'COMMIT');return {rows:rows.length,new_accounts:accounts,snapshots,dry_run:!!o['dry-run'],period_start:from,period_end:to};
 }catch(e){await db.exec('ROLLBACK');throw e;}
}
export async function reportPack(db,q){const a=await resolve(db,'accounts',q);return {account:a,performance:await db.query('select * from snapshots where account_id=$1 order by period_end desc,period_start desc',[a.id]),budgets:await db.query('select * from budget_pacing where id in(select id from budget_plans where account_id=$1)',[a.id]),actions:await db.query('select * from actions where account_id=$1 order by due_date,ref',[a.id]),notes:await db.query('select author,body,created_at from notes where account_id=$1 order by created_at,id',[a.id])};}
function csv(rows){if(!rows.length)return '';const keys=Object.keys(rows[0]);const quote=v=>'"'+String(v===null?'':typeof v==='object'?JSON.stringify(v):v).replaceAll('"','""')+'"';return [keys,...rows.map(r=>keys.map(k=>r[k]))].map(r=>r.map(quote).join(',')).join('\r\n')+'\r\n';}
export async function run(db,args,o={}){
 const [cmd='help',arg,q]=args;
 const routeOptions={add:['data'],update:['data'],approve:['by','evidence'],complete:['evidence'],reject:['evidence'],log:['by','text'],import:['file','platform','from','to','dry-run','map'],export:['dir'],restore:['file']};
 fields(o,['json',...(routeOptions[cmd]||[])]);
 if(q||args.length>2)throw Error('Too many positional arguments');
 if(o['dry-run']!==undefined&&o['dry-run']!==true)throw Error('--dry-run is a boolean flag');
 if(reads[cmd])return db.query(reads[cmd]);
 if(cmd==='help')return {reads:Object.keys(reads),commands:['report-pack <account>','weekly-review','add account|budget|action --data=<JSON>','update <account> --data=<JSON>','approve <action> --by=<name> --evidence=<text>','complete <action> --evidence=<text>','reject <action> --evidence=<reason>','log <account> --by=<name> --text=<note>','import optmyzr --file=<CSV> --platform=google --from=YYYY-MM-DD --to=YYYY-MM-DD [--dry-run] [--map=<JSON file>]','export --dir=<new directory>','restore --file=<snapshot.json>','draft-report <account>','draft-weekly-review'],json:'Every route accepts --json'};
 if(cmd==='report-pack')return reportPack(db,arg);
 if(cmd==='weekly-review'||cmd==='draft-weekly-review'){
  const data={pacing:await db.query(reads['budget-pacing']),approvals:await db.query(reads['approval-queue']),overdue:await db.query(reads['overdue-actions'])};
  if(cmd==='weekly-review')return data;
  return {file:writeOut('drafts',`weekly-review-${Date.now()}`,page({title:'Weekly paid search review',subtitle:'Private working draft. No campaign changes made.',sections:Object.entries(data).map(([title,rows])=>({title,html:table(rows)}))}))};
 }
 if(cmd==='draft-report'){
  const data=await reportPack(db,arg);const sections=[{title:'Account',html:record(data.account,['name','platform','currency','owner'])},...Object.entries(data).filter(([k])=>k!=='account').map(([title,rows])=>({title,html:table(rows)}))];
  return {file:writeOut('drafts',`account-${data.account.id}-${Date.now()}`,page({title:'Account review draft',subtitle:'Exported evidence only. No campaign changes made. Review before sharing.',sections}))};
 }
 if(cmd==='import'){if(arg!=='optmyzr')throw Error('Supported import: optmyzr');return importOptmyzr(db,o);}
 if(cmd==='add'){
  const d=JSON.parse(required(o.data,'--data'));if(!d||typeof d!=='object'||Array.isArray(d))throw Error('--data must be an object');
  if(arg==='account'){fields(d,['ref','name','platform','external_id','currency','owner','purpose','access_review_due','retention_review_due']);for(const k of ['ref','name','platform','external_id','currency'])required(d[k],k);for(const k of ['access_review_due','retention_review_due'])if(d[k])date(d[k],k);return insert(db,'accounts',d);}
  if(!['budget','action'].includes(arg))throw Error('Add account, budget or action');
  const a=await resolve(db,'accounts',d.account);delete d.account;d.account_id=a.id;
  if(arg==='budget'){
   fields(d,['account_id','ref','period_start','period_end','budget_cents','approved_by','approval_evidence']);date(d.period_start);date(d.period_end);if(d.period_end<d.period_start)throw Error('Budget dates reversed');
   if((await db.query('select ref from budget_plans where account_id=$1 and period_start<=$3 and period_end>=$2',[a.id,d.period_start,d.period_end])).length)throw Error('Budget periods must not overlap');
   if(!Number.isSafeInteger(d.budget_cents)||d.budget_cents<=0)throw Error('budget_cents must be a positive integer');
   for(const k of ['ref','approved_by','approval_evidence'])required(d[k],k);return insert(db,'budget_plans',d);
  }
  fields(d,['account_id','ref','title','owner','due_date','proposed_change','rationale']);date(d.due_date);for(const k of ['ref','title','owner','proposed_change','rationale'])required(d[k],k);return insert(db,'actions',d);
 }
 if(cmd==='update'){
  const a=await resolve(db,'accounts',arg);const d=JSON.parse(required(o.data,'--data'));fields(d,['owner','purpose','access_review_due','retention_review_due']);
  const keys=Object.keys(d);if(!keys.length)throw Error('No fields to update');for(const k of keys){if(k.endsWith('_due'))date(d[k],k);else required(d[k],k);}
  return (await db.query(`update accounts set ${keys.map((k,i)=>k+'=$'+(i+1)).join(',')} where id=$${keys.length+1} returning *`,[...keys.map(k=>d[k]),a.id]))[0];
 }
 if(['approve','complete','reject'].includes(cmd)){
  const a=await resolve(db,'actions',arg);const evidence=required(o.evidence,'--evidence');
  if(cmd==='approve'){if(a.status!=='proposed')throw Error('Only proposed actions can be approved');return(await db.query("update actions set status='approved',approved_by=$1,approval_evidence=$2 where id=$3 and status='proposed' returning *",[required(o.by,'--by'),evidence,a.id]))[0]||Promise.reject(Error('Action changed; reread it'));}
  if(cmd==='complete'){if(a.status!=='approved')throw Error('Only approved actions can be completed');return(await db.query("update actions set status='completed',completion_evidence=$1 where id=$2 and status='approved' returning *",[evidence,a.id]))[0]||Promise.reject(Error('Action changed; reread it'));}
  if(a.status!=='proposed')throw Error('Only proposed actions can be rejected');return(await db.query("update actions set status='rejected',completion_evidence=$1 where id=$2 and status='proposed' returning *",[evidence,a.id]))[0]||Promise.reject(Error('Action changed; reread it'));
 }
 if(cmd==='log'){const a=await resolve(db,'accounts',arg);return insert(db,'notes',{account_id:a.id,author:required(o.by,'--by'),body:required(o.text,'--text')});}
 if(cmd==='export'){
  const dir=path.resolve(required(o.dir,'--dir'));if(fs.existsSync(dir))throw Error('Export directory must not already exist');
  const data={format:'paid-search-v1',exported_at:new Date().toISOString(),tables:{}};
  await db.exec('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');try{for(const t of backupTables)data.tables[t]=await db.query(`select * from ${t} order by id`);await db.exec('COMMIT');}catch(e){await db.exec('ROLLBACK');throw e;}
  fs.mkdirSync(dir,{recursive:true,mode:0o700});fs.writeFileSync(path.join(dir,'snapshot.json'),JSON.stringify(data,null,2)+'\n',{mode:0o600});for(const t of backupTables)fs.writeFileSync(path.join(dir,t+'.csv'),csv(data.tables[t]),{mode:0o600});return {directory:dir,counts:Object.fromEntries(backupTables.map(t=>[t,data.tables[t].length]))};
 }
 if(cmd==='restore'){
  const data=JSON.parse(fs.readFileSync(required(o.file,'--file'),'utf8'));if(data.format!=='paid-search-v1'||!data.tables)throw Error('Unsupported backup');
  fields(data.tables,backupTables);for(const t of backupTables)if(!Array.isArray(data.tables[t]))throw Error(`Missing backup table ${t}`);
  await db.exec('BEGIN');try{
   for(const t of backupTables)if((await db.query(`select 1 from ${t} limit 1`)).length)throw Error('Restore requires an empty migrated database');
   for(const t of backupTables){
    const columns=await db.query("select column_name,data_type from information_schema.columns where table_schema='public' and table_name=$1",[t]);
    for(const row of data.tables[t]){fields(row,columns.map(c=>c.column_name));const clean={...row};for(const c of columns)if(c.data_type==='jsonb'&&clean[c.column_name]!=null)clean[c.column_name]=JSON.stringify(clean[c.column_name]);await insert(db,t,clean);}
    // Insert triggers generated provisional audit rows. Replace only in this empty, transactional restore.
    if(t==='notes')await db.exec('delete from audit_events');
   }
   await db.exec('COMMIT');return {restored:true,counts:Object.fromEntries(backupTables.map(t=>[t,data.tables[t].length]))};
  }catch(e){await db.exec('ROLLBACK');throw e;}
 }
 throw Error(`Unknown command: ${cmd}`);
}
export function display(value){if(Array.isArray(value)){if(!value.length)return '(none)';const keys=Object.keys(value[0]);return textTable(value,keys.map(key=>({key,label:key,width:60,format:v=>v===null?'unknown':typeof v==='object'?JSON.stringify(v):String(v)})));}return JSON.stringify(value,null,2);}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 let db;try{const args=[],o={};for(const token of process.argv.slice(2)){if(token.startsWith('--')){const at=token.indexOf('=');const k=token.slice(2,at<0?undefined:at);if(Object.hasOwn(o,k))throw Error(`Repeated option ${k}`);o[k]=at<0?true:token.slice(at+1);}else args.push(token);}
 const allowed=['json','data','by','evidence','text','file','platform','from','to','dry-run','map','dir'];fields(o,allowed);
 db=await getDb();const result=await run(db,args,o);console.log(o.json?JSON.stringify(result,null,2):display(result));
 }catch(e){console.error(e.message);process.exitCode=1;}finally{if(db)await db.close();}
}
