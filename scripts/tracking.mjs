#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import Ajv from 'ajv';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {parseCsv} from './lib/csv.mjs';
import {table} from './lib/format.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const ajv=new Ajv({allErrors:true,strict:true,validateFormats:true});
const policy=e=>hash(JSON.stringify([e.owner,e.purpose,e.retention_days,e.consent_required]));
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const required=(v,k)=>{if(typeof v!=='string'||!v.trim())throw Error(`Required: ${k}`);return v.trim();};
const date=v=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||new Date(v+'T00:00:00Z').toISOString().slice(0,10)!==v)throw Error('Invalid calendar date');return v;};
const instant=v=>{if(!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(v)||!Number.isFinite(Date.parse(v)))throw Error('Use an ISO timestamp with timezone');date(v.slice(0,10));if(Date.parse(v)>Date.now()+60000)throw Error('Evidence cannot be in the future');return new Date(v).toISOString();};
function schemaCheck(s){if(!obj(s)||s.type!=='object')throw Error('Contract must be an object JSON Schema');if(JSON.stringify(s).includes('"$async"'))throw Error('Async schemas are not supported');ajv.compile(s);return s;}
function bool(s){if(!['true','false'].includes(s))throw Error('Use true or false');return s==='true';}
function int(s){if(!/^\d+$/.test(String(s))||!Number.isSafeInteger(Number(s)))throw Error('Expected nonnegative safe integer');return Number(s);}
async function tx(db,fn){await db.exec('BEGIN');try{const v=await fn();await db.exec('COMMIT');return v;}catch(e){await db.exec('ROLLBACK');throw e;}}
async function audit(db,actor,action,id,details={}){await db.query('insert into activity(actor,action,record_id,details) values($1,$2,$3,$4)',[actor,action,id,JSON.stringify(details)]);}
export async function resolve(db,kind,q){
 required(q,kind);const rows=await db.query(`select id,${kind==='issues'?'title':'name'} name from ${kind} order by 2`);
 const exact=rows.filter(r=>r.id===q||r.name.toLowerCase()===q.toLowerCase());
 const matches=exact.length?exact:rows.filter(r=>r.id.startsWith(q.toLowerCase())||r.name.toLowerCase().includes(q.toLowerCase()));
 if(matches.length!==1){const e=Error(`${kind}: ${matches.length?'ambiguous':'not found'}: ${q}`);e.candidates=matches.length?matches:rows;throw e;}return matches[0].id;
}
export const reads={
 destinations:'select id,name,environment from destinations order by name',
 events:'select * from v_events order by destination,name',
 contracts:'select e.name,c.revision,c.schema,c.needs_review,c.author from v_contracts c join events e on e.id=c.event_id order by e.name',
 coverage:'select * from v_coverage order by destination,name',
 drift:'select release,destination,event_name,observed_at,code,property,finding from v_drift order by observed_at desc,code',
 'recent-checks':'select r.id,d.name destination,r.release,r.sample_count,r.created_at from check_runs r join destinations d on d.id=r.destination_id order by r.created_at desc',
 traffic:'select name,destination,hit_day,hits from v_traffic order by destination,name,hit_day',
 quiet:"select name,destination,last_observed,current_samples from v_coverage where last_observed is null or last_observed<now()-interval '7 days' order by name",
 compliance:'select name,rule,finding from v_compliance order by name,rule',
 'vendor-warnings':'select name,destination,warning from v_vendor_warnings order by name',
 issues:'select i.id,e.name event,i.title,i.owner,i.due_on,i.status,i.resolution from issues i join events e on e.id=i.event_id order by i.due_on',
 overdue:'select * from v_overdue order by due_on',
 activity:'select actor,action,record_id,details,created_at from activity order by created_at desc,id'
};
const help={...Object.fromEntries(Object.keys(reads).map(k=>[k,'Read recorded '+k])),
 event:'event <name-or-id>',
 'add-destination':'--name=store --environment=STAGING --actor=name',
 'add-event':'--destination=name --name=event --actor=name',
 'set-policy':'<event> --owner=name --purpose=text --retention-days=30 --consent-required=true --actor=name',
 'set-contract':'<event> --file=schema.json --reason=text --actor=name',
 import:'import trackingplan --file=export.csv|export.json --destination=name --actor=name [--dry-run]',
 validate:'--file=captures.json --destination=name --release=name --actor=name',
 'release-review':'--destination=name --release=name (latest batch, complete current-contract coverage, no findings, fresh evidence, policies and no open issues)',
 'log-issue':'<event> --title=text --owner=name --due=YYYY-MM-DD --actor=name',
 'close-issue':'<issue> --resolution=text --actor=name',
 'weekly-review':'Write a private review draft from drift, coverage and overdue work',
 'draft-fix':'<event> Write a private correction brief from recorded evidence',
 export:'--out=new-file.json Export every record and original imports',
 help:'Every command supports --json; flags use --name=value'};
function normaliseImport(raw,filename){
 let data;
 if(filename.toLowerCase().endsWith('.csv')){
 const rows=parseCsv(raw);const groups=new Map();
 for(const row of rows){for(const key of ['Destination','Event Name','Property Name','Type','Presence'])if(!(key in row))throw Error(`Missing CSV header ${key}`);
 const provider=required(row.Destination,'Destination'),name=required(row['Event Name'],'Event Name'),key=provider+'\0'+name;
 if(!groups.has(key))groups.set(key,{provider,name,properties:[],warnings:[],daily_hits_data:{}});
 const e=groups.get(key);const hits=Object.fromEntries(Object.entries(row).filter(([k])=>/^\d{4}-\d{2}-\d{2}$/.test(k)).filter(([,v])=>v!=='').map(([k,v])=>[date(k),int(v)]));
 const warnings=(row.Warnings||'').split(';').filter(Boolean).map(message=>({message}));
 if(row['Property Name'])e.properties.push({property_name:row['Property Name'],type:row.Type,presence:row.Presence,description:row.Description||'',daily_hits_data:hits,warnings});
 else {if(e._eventRow)throw Error('Duplicate CSV event row');e._eventRow=true;Object.assign(e,{description:row.Description||'',status:row.Status||'',daily_hits_data:hits,warnings});}
 }
 data=[...groups.values()];
 }else{
 const doc=JSON.parse(raw);if(!obj(doc.events))throw Error('Expected Trackingplan Export API object with events grouped by provider');
 data=Object.entries(doc.events).flatMap(([provider,events])=>{if(!Array.isArray(events))throw Error('Expected provider event array');return events.map(e=>({...e,provider}));});
 }
 if(!data.length)throw Error('Export contains no events');
 const seen=new Set();
 for(const e of data){required(e.name,'event name');required(e.provider,'provider');const key=e.provider+'\0'+e.name;if(seen.has(key))throw Error('Duplicate event in export');seen.add(key);
 if(e.properties!==undefined&&!Array.isArray(e.properties))throw Error('Expected property array');
 const pnames=new Set();for(const p of e.properties||[]){required(p.property_name,'property name');if(pnames.has(p.property_name))throw Error('Duplicate property');pnames.add(p.property_name);}
 for(const item of [e,...(e.properties||[])]){if(item.daily_hits_data!==undefined&&!obj(item.daily_hits_data))throw Error('Invalid daily hits');for(const [day,n] of Object.entries(item.daily_hits_data||{})){date(day);int(n);}if(item.warnings!==undefined&&!Array.isArray(item.warnings))throw Error('Invalid warnings');}
 }
 return data;
}
function importSchema(e){const properties=Object.fromEntries((e.properties||[]).map(p=>[p.property_name,p.presence==='forbidden'?false:['string','number','boolean','object','array'].includes(p.type)?{type:p.type}:{}]));
 return {type:'object',properties,required:(e.properties||[]).filter(p=>p.presence==='required').map(p=>p.property_name),additionalProperties:false};}
function shape(v,depth=0){if(depth>12)return 'depth-limit';if(Array.isArray(v))return {array_items:[...new Set(v.map(x=>x===null?'null':Array.isArray(x)?'array':typeof x))]};if(obj(v))return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,shape(x,depth+1)]));return v===null?'null':typeof v;}
function personalFields(v,at=''){const out=[];if(obj(v)||Array.isArray(v))for(const [k,x] of Object.entries(v)){const p=at+'/'+k;if(/^(email|email_address|phone|telephone|full_name|first_name|last_name|ip_address|address)$/i.test(k))out.push({code:'PERSONAL-FIELD',path:p,message:'Review personal-data field'});out.push(...personalFields(x,p));}return out;}
export async function run(db,command,args=[],f={}){
 if(command in reads)return db.query(reads[command]);
 if(command==='help')return Object.entries(help).map(([command,usage])=>({command,usage}));
 if(command==='event'){const id=await resolve(db,'events',args[0]);return {event:(await db.query('select * from v_events where id=$1',[id]))[0],contract:await db.query('select * from v_contracts where event_id=$1',[id]),observations:await db.query('select * from observations where event_id=$1 order by observed_at desc',[id]),issues:await db.query('select * from issues where event_id=$1',[id])};}
 if(command==='release-review'){
 const did=await resolve(db,'destinations',f.destination);required(f.release,'release');
 const runs=await db.query('select * from check_runs where destination_id=$1 and release=$2 order by created_at desc,id desc limit 1',[did,f.release]);
 const events=await db.query('select e.*,c.id contract_id,c.needs_review from events e left join v_contracts c on c.event_id=e.id where e.destination_id=$1',[did]);
 const obs=runs.length?await db.query('select * from observations where run_id=$1',[runs[0].id]):[];
 const blockers=[];if(!events.length)blockers.push('No events defined');if(!runs.length)blockers.push('No captured batch');
 for(const e of events){const own=obs.filter(o=>o.event_id===e.id&&o.contract_id===e.contract_id);if(own.some(o=>o.policy_digest!==policy(e)))blockers.push(`${e.name}: policy changed since validation`);if(!own.length)blockers.push(`${e.name}: no current-contract samples`);
 if(!e.contract_id||e.needs_review)blockers.push(`${e.name}: contract needs review`);
 if(!e.owner.trim()||!e.purpose.trim()||!e.retention_days)blockers.push(`${e.name}: missing owner, purpose or retention policy`);
 if(own.some(o=>Date.parse(o.observed_at)<Date.now()-7*86400000))blockers.push(`${e.name}: stale capture`);
 }
 if(obs.some(o=>o.findings.length))blockers.push('Captured batch has findings');
 if(obs.some(o=>Date.parse(o.observed_at)<Date.now()-7*86400000)&&!blockers.includes('Stale captures'))blockers.push('Stale captures');
 const issues=await db.query("select i.id from issues i join events e on e.id=i.event_id where e.destination_id=$1 and i.status='open'",[did]);if(issues.length)blockers.push(`${issues.length} open corrective actions`);
 return {release:f.release,eligible:blockers.length===0,blockers,sample_count:obs.length,note:'Recorded evidence review only; no deployment or legal approval'};
 }
 if(command==='weekly-review'||command==='draft-fix'){
 const sections=command==='weekly-review'?{drift:await run(db,'drift'),coverage:await run(db,'coverage'),overdue:await run(db,'overdue')}:await run(db,'event',args);
 const dir=path.join(process.env.OUTPUT_DIR||REPO_ROOT,'drafts');fs.mkdirSync(dir,{recursive:true,mode:0o700});const file=path.join(dir,`${command}-${randomUUID()}.md`);
 fs.writeFileSync(file,`# ${command==='weekly-review'?'Weekly tracking review':'Correction brief'}\n\nDraft for review. No message has been sent.\n\n`+JSON.stringify(sections,null,2)+'\n',{flag:'wx',mode:0o600});return {file};
 }
 if(command==='export'){
 required(f.out,'out');const result={format:'tracking-assurance-v1',exported_at:new Date().toISOString()};
 await tx(db,async()=>{await db.exec('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');for(const t of ['destinations','events','contracts','imports','check_runs','observations','issues','activity'])result[t]=await db.query(`select * from ${t} order by id`);});
 fs.writeFileSync(path.resolve(f.out),JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});return {file:path.resolve(f.out),tables:8};
 }
 if(!(command in help))throw Error(`Unknown command: ${command}`);
 const actor=required(f.actor,'actor');
 return tx(db,async()=>{
 let result,id;
 if(command==='add-destination'){
 result=(await db.query('insert into destinations(name,environment) values($1,$2) returning id,name,environment',[required(f.name,'name'),required(f.environment,'environment')]))[0];id=result.id;
 }else if(command==='add-event'){
 const did=await resolve(db,'destinations',f.destination);result=(await db.query('insert into events(destination_id,name) values($1,$2) returning id,name',[did,required(f.name,'name')]))[0];id=result.id;
 }else if(command==='set-policy'){
 id=await resolve(db,'events',args[0]);result=(await db.query('update events set owner=$1,purpose=$2,retention_days=$3,consent_required=$4 where id=$5 returning id,name,owner,purpose,retention_days,consent_required',[required(f.owner,'owner'),required(f.purpose,'purpose'),int(required(f['retention-days'],'retention-days')),bool(required(f['consent-required'],'consent-required')),id]))[0];
 }else if(command==='set-contract'){
 id=await resolve(db,'events',args[0]);await db.query('select id from events where id=$1 for update',[id]);const s=schemaCheck(JSON.parse(fs.readFileSync(required(f.file,'file'),'utf8')));
 result=(await db.query('insert into contracts(event_id,revision,schema,author,reason) select $1,coalesce(max(revision),0)+1,$2,$3,$4 from contracts where event_id=$1 returning id,revision',[id,JSON.stringify(s),actor,required(f.reason,'reason')]))[0];
 }else if(command==='import'){
 if(args[0]!=='trackingplan')throw Error('Supported import: trackingplan');const did=await resolve(db,'destinations',f.destination);await db.query('select id from destinations where id=$1 for update',[did]);
 const raw=fs.readFileSync(required(f.file,'file'),'utf8'),digest=hash(raw),data=normaliseImport(raw,f.file);
 const previous=await db.query('select id,imported_count from imports where destination_id=$1 and digest=$2',[did,digest]);if(previous.length)return {unchanged:true,...previous[0]};
 const providers=[...new Set(data.map(e=>e.provider))];if(providers.length!==1)throw Error('Export one destination/provider at a time to preserve destination identity');
 const existing=await db.query('select name from events where destination_id=$1',[did]);if(data.some(e=>existing.some(x=>x.name===e.name)))throw Error('Event already exists: import into a fresh destination or reconcile explicitly; no silent overwrite');
 if(f['dry-run'])return {dry_run:true,events:data.length,provider:providers[0],needs_review:true};
 for(const e of data){const eid=(await db.query('insert into events(destination_id,name,source) values($1,$2,$3) returning id',[did,e.name,JSON.stringify(e)]))[0].id;
 await db.query('insert into contracts(event_id,revision,schema,needs_review,author,reason) values($1,1,$2,true,$3,$4)',[eid,JSON.stringify(importSchema(e)),actor,'Imported rules require review; regex, enum values and validation expressions are not supplied by this export']);}
 result=(await db.query('insert into imports(destination_id,digest,source_format,source_content,imported_count,actor) values($1,$2,$3,$4,$5,$6) returning id,imported_count',[did,digest,path.extname(f.file),raw,data.length,actor]))[0];id=result.id;
 }else if(command==='validate'){
 const did=await resolve(db,'destinations',f.destination);await db.query('select id from destinations where id=$1 for update',[did]);const raw=fs.readFileSync(required(f.file,'file'),'utf8'),samples=JSON.parse(raw);
 if(!Array.isArray(samples)||!samples.length||samples.length>10000)throw Error('Capture must be an array of 1 to 10000 samples');required(f.release,'release');
 const events=await db.query('select e.*,c.id contract_id,c.schema,c.needs_review from events e left join v_contracts c on c.event_id=e.id where e.destination_id=$1',[did]);
 id=(await db.query('insert into check_runs(destination_id,release,digest,actor,sample_count) values($1,$2,$3,$4,$5) returning id',[did,f.release,hash(raw),actor,samples.length]))[0].id;
 let failed=0;
 for(const s of samples){required(s.event,'event');if(!obj(s.properties))throw Error('Each capture requires an object properties');const at=instant(required(s.observed_at,'observed_at'));const consent=s.consent||'unknown';if(!['granted','denied','unknown'].includes(consent))throw Error('Invalid consent');
 const e=events.find(e=>e.name===s.event),findings=[];
 if(!e)findings.push({code:'UNKNOWN-EVENT',path:'',message:'No event contract'});
 else{if(!e.contract_id||e.needs_review)findings.push({code:'UNREVIEWED',path:'',message:'Contract needs review'});
 if(e.schema){const validate=ajv.compile(e.schema);if(!validate(s.properties))for(const err of validate.errors)findings.push({code:'SCHEMA',path:err.instancePath,message:err.message});}
 if(e.consent_required&&consent!=='granted')findings.push({code:'CONSENT',path:'',message:'Consent required by local policy'});}
 findings.push(...personalFields(s.properties));if(findings.length)failed++;
 await db.query('insert into observations(run_id,event_id,contract_id,event_name,observed_at,consent,shape,findings,sample_digest,policy_digest) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[id,e?.id||null,e?.contract_id||null,s.event,at,consent,JSON.stringify(shape(s.properties)),JSON.stringify(findings),hash(JSON.stringify(s)),e?policy(e):null]);
 }result={id,samples:samples.length,failed,passed:samples.length-failed};
 }else if(command==='log-issue'){
 const eid=await resolve(db,'events',args[0]);result=(await db.query('insert into issues(event_id,title,owner,due_on) values($1,$2,$3,$4) returning id,title,owner,due_on',[eid,required(f.title,'title'),required(f.owner,'owner'),date(required(f.due,'due'))]))[0];id=result.id;
 }else if(command==='close-issue'){
 id=await resolve(db,'issues',args[0]);result=(await db.query("update issues set status='closed',resolution=$1 where id=$2 and status='open' returning id,status",[required(f.resolution,'resolution'),id]))[0];if(!result)throw Error('Issue is already closed');
 }else throw Error(`Unknown write: ${command}`);
 await audit(db,actor,command,id,result);return result;
 });
}
export function format(result){if(Array.isArray(result)){if(!result.length)return '  (none)';return table(result,Object.keys(result[0]).map(key=>({key,label:key,width:80,format:v=>obj(v)||Array.isArray(v)?JSON.stringify(v):v instanceof Date?v.toISOString():v})));}return JSON.stringify(result,null,2);}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const argv=process.argv.slice(2),args=[],f={};for(const a of argv){if(a.startsWith('--')){const n=a.indexOf('=');const k=a.slice(2,n<0?undefined:n);if(k in f)throw Error('Duplicate flag '+k);f[k]=n<0?true:a.slice(n+1);}else args.push(a);}
 const db=await getDb();try{const result=await run(db,args.shift()||'help',args,f);console.log(f.json?JSON.stringify(result,null,2):format(result));}
 catch(e){if(f.json)console.log(JSON.stringify({error:e.message,candidates:e.candidates||[]}));else{console.error(e.message);if(e.candidates)console.error(format(e.candidates));}process.exitCode=1;}finally{await db.close();}
}
