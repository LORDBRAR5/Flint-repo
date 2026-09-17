import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { Pool } from 'pg';
import crypto from 'node:crypto';

const app=Fastify({logger:true});
const db=new Pool({connectionString:process.env.DATABASE_URL});
const PORT=Number(process.env.PORT||4000);
const DASHBOARD_URL=process.env.DASHBOARD_URL||'https://dash.atxcloud.ggff.net';
const PTERO_URL=(process.env.PTERODACTYL_URL||'').replace(/\/$/,'');
const PTERO_KEY=process.env.PTERODACTYL_APPLICATION_KEY||'';
const COOKIE_SECRET=process.env.ATXCLOUD_COOKIE_SECRET||'';

await app.register(cookie,{secret:COOKIE_SECRET||undefined});
await app.register(cors,{origin:DASHBOARD_URL,credentials:true});
await app.register(rateLimit,{max:120,timeWindow:'1 minute'});

function fail(status:number,message:string):never{throw Object.assign(new Error(message),{statusCode:status});}
function user(req:any){const raw=req.cookies.atx_session;if(!raw)return null;try{return JSON.parse(Buffer.from(raw,'base64url').toString())}catch{return null}}
async function requireUser(req:any){const u=user(req);if(!u?.discordId)fail(401,'authentication_required');const r=await db.query('select id,discord_id,username,email,coins,blacklisted from users where discord_id=$1',[u.discordId]);if(!r.rows[0])fail(404,'account_not_found');if(r.rows[0].blacklisted)fail(403,'account_blacklisted');return r.rows[0]}
function ptero(path:string,init:RequestInit={}){if(!PTERO_KEY)fail(503,'pterodactyl_not_configured');return fetch(PTERO_URL+path,{...init,headers:{Accept:'application/json','Content-Type':'application/json','Authorization':`Bearer ${PTERO_KEY}`,...(init.headers||{})}})}

app.get('/health',async()=>({ok:true,service:'atxcloud-api'}));
app.get('/ready',async()=>{await db.query('select 1');const r=await ptero('/api/application/nodes?per_page=1');if(!r.ok)fail(503,'pterodactyl_unavailable');return {ok:true,database:true,pterodactyl:true}});
app.get('/me',async(req)=>requireUser(req));
app.get('/servers',async(req)=>{const u=await requireUser(req);const r=await db.query('select id,public_id,name,type,status,ptero_server_id,node_id,egg_id,created_at from servers where owner_id=$1 or id in(select server_id from server_access where user_id=$1) order by created_at desc',[u.id]);return r.rows});
app.get('/servers/:id',async(req:any)=>{const u=await requireUser(req);const r=await db.query('select s.* from servers s where s.id=$1 and (s.owner_id=$2 or exists(select 1 from server_access a where a.server_id=s.id and a.user_id=$2))',[req.params.id,u.id]);if(!r.rows[0])fail(404,'server_not_found');return r.rows[0]});
app.post('/servers/:id/power',async(req:any)=>{const u=await requireUser(req);const s=await db.query('select s.* from servers s where s.id=$1 and (s.owner_id=$2 or exists(select 1 from server_access a where a.server_id=s.id and a.user_id=$2))',[req.params.id,u.id]);if(!s.rows[0])fail(404,'server_not_found');const action=(req.body as any)?.action;if(!['start','stop','restart','kill'].includes(action))fail(400,'invalid_action');const r=await ptero(`/api/client/servers/${s.rows[0].ptero_identifier}/power`,{method:'POST',body:JSON.stringify({signal:action==='restart'?'restart':action})});if(!r.ok)fail(r.status,'pterodactyl_power_failed');return {ok:true,action}});
app.post('/coins/gift',async(req:any)=>{const u=await requireUser(req);const {userId,amount}=req.body as any;if(!Number.isSafeInteger(amount)||amount<=0)fail(400,'invalid_amount');if(userId===u.id)fail(400,'self_transfer');const c=await db.connect();try{await c.query('begin');const lock=await c.query('select id,coins,blacklisted from users where id in($1,$2) for update',[u.id,userId]);const from=lock.rows.find(x=>x.id===u.id),to=lock.rows.find(x=>x.id===userId);if(!to)fail(404,'target_not_found');if(from.coins<amount)fail(409,'insufficient_coins');if(to.blacklisted)fail(403,'target_blacklisted');const key=crypto.randomUUID();await c.query('update users set coins=coins-$1 where id=$2',[amount,u.id]);await c.query('update users set coins=coins+$1 where id=$2',[amount,userId]);await c.query('insert into coin_ledger(idempotency_key,user_id,actor_id,amount,type,reference) values($1,$2,$2,$3,$4,$5),($6,$7,$2,$8,$4,$5)',[key,u.id,-amount,'gift',userId,key+':credit',userId,amount]);await c.query('commit');return {ok:true}}catch(e){await c.query('rollback');throw e}finally{c.release()}});

app.setErrorHandler((e:any,_req,reply)=>reply.code(e.statusCode||500).send({error:e.message||'internal_error'}));
await app.listen({host:'0.0.0.0',port:PORT});