import { FastifyInstance } from 'fastify';
import { query, tx } from './db';
import * as ptero from './ptero';

async function staff(req:any,res:any){
  const u=req.user;
  if(!u) return null;
  const m=process.env.STAFF_ROLE_IDS ? await fetch(`https://discord.com/api/guilds/${process.env.DISCORD_GUILD_ID}/members/${u.discord_id}`,{headers:{Authorization:`Bot ${process.env.DISCORD_BOT_TOKEN}`}}) : null;
  if(!m?.ok) return null;
  const member:any=await m.json();
  const allowed=(process.env.STAFF_ROLE_IDS||'').split(',').map(x=>x.trim()).filter(Boolean);
  return allowed.some(x=>member.roles?.includes(x)) ? u : null;
}

async function audit(actor:any,action:string,targetType:string,targetId:string,metadata:any={}){
  await query('INSERT INTO audit_logs(actor_user_id,actor_discord_id,action,target_type,target_id,metadata) VALUES($1,$2,$3,$4,$5,$6)',[actor.id,actor.discord_id,action,targetType,targetId,metadata]);
}

export async function registerStaffRoutes(app:FastifyInstance, auth:(req:any,res:any)=>Promise<any>){
  app.addHook('preHandler',async(req:any,res:any)=>{
    if(req.url.startsWith('/staff/')){
      const u=await auth(req,res); if(!u)return res.code(401).send({error:'unauthorized'});
      req.user=u; if(!await staff(req,res))return res.code(403).send({error:'staff_required'});
    }
  });

  app.get('/staff/accounts',async(req:any)=>{
    const r=await query<any>('SELECT id,discord_id,username,email,coins,blacklisted,created_at,updated_at FROM users ORDER BY created_at DESC');
    return {accounts:r.rows.map(x=>({id:x.id,user:x.username,discordId:x.discord_id,email:x.email,coins:x.coins,blacklisted:x.blacklisted,createdAt:x.created_at,updatedAt:x.updated_at}))};
  });

  app.get('/staff/servers',async()=>{
    const r=await query<any>(`SELECT s.public_id,s.name,s.category,s.version,s.suspended,s.created_at,u.username owner,n.name node FROM servers s JOIN users u ON u.id=s.owner_id LEFT JOIN nodes n ON n.id=s.node_id WHERE s.deleted_at IS NULL ORDER BY s.created_at DESC`);
    return {servers:r.rows};
  });

  app.get('/staff/users/:id',async(req:any,res:any)=>{
    const u=await query<any>('SELECT id,discord_id,username,email,coins,blacklisted,created_at,updated_at FROM users WHERE id=$1',[req.params.id]);
    if(!u.rows[0])return res.code(404).send({error:'user_not_found'});
    const s=await query<any>('SELECT public_id,name,category,version,suspended,node_id,created_at FROM servers WHERE owner_id=$1 AND deleted_at IS NULL ORDER BY created_at DESC',[req.params.id]);
    const earned=await query<any>("SELECT COALESCE(sum(amount) FILTER(WHERE amount>0),0)::bigint n, COALESCE(sum(-amount) FILTER(WHERE amount<0),0)::bigint spent FROM coin_ledger WHERE user_id=$1",[req.params.id]);
    return {user:u.rows[0],servers:s.rows,coinSummary:earned.rows[0]};
  });

  app.post('/staff/users/:id/action',async(req:any,res:any)=>{
    const actor=req.user; const action=String(req.body?.action||'');
    const target=await query<any>('SELECT * FROM users WHERE id=$1',[req.params.id]);
    if(!target.rows[0])return res.code(404).send({error:'user_not_found'});
    try{
      if(action==='blacklist'||action==='unblacklist'){
        const value=action==='blacklist'; await query('UPDATE users SET blacklisted=$1,updated_at=now() WHERE id=$2',[value,req.params.id]);
        if(value && target.rows[0].ptero_user_id) await ptero.updateUser(target.rows[0].ptero_user_id,{root_admin:false});
      } else if(action==='delete'){
        const owned=await query<any>('SELECT ptero_server_id FROM servers WHERE owner_id=$1 AND deleted_at IS NULL',[req.params.id]);
        for(const s of owned.rows) if(s.ptero_server_id) await ptero.deleteServer(Number(s.ptero_server_id));
        if(target.rows[0].ptero_user_id) await ptero.deleteUser(Number(target.rows[0].ptero_user_id));
        await tx(async(c)=>{await c.query('UPDATE servers SET deleted_at=now(),updated_at=now() WHERE owner_id=$1 AND deleted_at IS NULL',[req.params.id]);await c.query('DELETE FROM sessions WHERE user_id=$1',[req.params.id]);await c.query('DELETE FROM users WHERE id=$1',[req.params.id]);});
      } else if(action==='reset-coins'){
        await tx(async(c)=>{const r=await c.query<any>('SELECT coins FROM users WHERE id=$1 FOR UPDATE',[req.params.id]);const amount=-Number(r.rows[0].coins);if(amount){await c.query('UPDATE users SET coins=0,updated_at=now() WHERE id=$1',[req.params.id]);await c.query('INSERT INTO coin_ledger(idempotency_key,user_id,actor_id,amount,type,reference) VALUES(gen_random_uuid()::text,$1,$2,$3,\'admin_adjustment\',\'staff reset\')',[req.params.id,actor.id,amount]);}});
      } else if(action==='add-coins'||action==='remove-coins'){
        const amount=Math.abs(Number(req.body?.amount)); if(!Number.isSafeInteger(amount)||amount<=0)return res.code(400).send({error:'invalid_amount'}); const delta=action==='add-coins'?amount:-amount;
        await tx(async(c)=>{const r=await c.query<any>('SELECT coins FROM users WHERE id=$1 FOR UPDATE',[req.params.id]);const next=Number(r.rows[0].coins)+delta;if(next<0)throw Object.assign(new Error('negative_balance'),{statusCode:409});await c.query('UPDATE users SET coins=$1,updated_at=now() WHERE id=$2',[next,req.params.id]);await c.query('INSERT INTO coin_ledger(idempotency_key,user_id,actor_id,amount,type,reference) VALUES(gen_random_uuid()::text,$1,$2,$3,\'admin_adjustment\',$4)',[req.params.id,actor.id,delta,String(req.body?.reason||'staff adjustment')]);});
      } else return res.code(400).send({error:'unsupported_action'});
      await audit(actor,`staff.user.${action}`,'user',String(req.params.id),{amount:req.body?.amount});
      return {ok:true};
    }catch(e:any){return res.code(e.statusCode||502).send({error:e.message||'operation_failed'});}
  });

  app.post('/staff/servers/:id/action',async(req:any,res:any)=>{
    const actor=req.user; const action=String(req.body?.action||''); const r=await query<any>('SELECT * FROM servers WHERE public_id=$1 AND deleted_at IS NULL',[req.params.id]); if(!r.rows[0])return res.code(404).send({error:'server_not_found'}); const s=r.rows[0];
    try{
      if(action==='suspend'||action==='unsuspend'){const value=action==='suspend';if(value)await ptero.suspendServer(Number(s.ptero_server_id));else await ptero.unsuspendServer(Number(s.ptero_server_id));await query('UPDATE servers SET suspended=$1,updated_at=now() WHERE id=$2',[value,s.id]);}
      else if(action==='delete'){await ptero.deleteServer(Number(s.ptero_server_id));await query('UPDATE servers SET deleted_at=now(),updated_at=now() WHERE id=$1',[s.id]);}
      else if(['start','stop','restart','kill'].includes(action)){if(s.suspended)return res.code(409).send({error:'server_suspended'});if(!process.env.PTERODACTYL_CLIENT_KEY)return res.code(503).send({error:'client_key_not_configured'});await ptero.power(s.ptero_identifier,process.env.PTERODACTYL_CLIENT_KEY,action as any);}
      else if(action==='transfer'){const target=await query<any>('SELECT id FROM users WHERE discord_id=$1 OR username=$1',[String(req.body?.target)]);if(!target.rows[0])return res.code(404).send({error:'target_user_not_found'});await query('UPDATE servers SET owner_id=$1,updated_at=now() WHERE id=$2',[target.rows[0].id,s.id]);}
      else return res.code(400).send({error:'unsupported_action'});
      await audit(actor,`staff.server.${action}`,'server',s.public_id,{target:req.body?.target});return {ok:true};
    }catch(e:any){return res.code(e.statusCode||502).send({error:e.message||'operation_failed'});}
  });

  app.post('/staff/purge',async(req:any,res:any)=>{
    const actor=req.user; const node=String(req.body?.node||'all'); const mode=String(req.body?.mode||'offline');
    const where:string[]=['s.deleted_at IS NULL']; const values:any[]=[]; let i=1;
    if(node!=='all'){where.push(`n.ptero_node_id=$${i++}`);values.push(Number(node));}
    if(mode==='suspended')where.push('s.suspended=true');
    else if(mode==='offline')where.push('s.suspended=false');
    else if(mode==='blacklisted')where.push('u.blacklisted=true'); else return res.code(400).send({error:'invalid_mode'});
    const found=await query<any>(`SELECT s.* FROM servers s JOIN users u ON u.id=s.owner_id LEFT JOIN nodes n ON n.id=s.node_id WHERE ${where.join(' AND ')} ORDER BY s.id`,values);
    if(req.body?.confirm!==true)return {confirmRequired:true,count:found.rowCount,mode,node};
    let deleted=0,failed=0;
    for(const s of found.rows){try{await ptero.deleteServer(Number(s.ptero_server_id));await query('UPDATE servers SET deleted_at=now(),updated_at=now() WHERE id=$1',[s.id]);deleted++;}catch{failed++;}}
    await audit(actor,'staff.server.purge','servers',node,{mode,matched:found.rowCount,deleted,failed});
    return {ok:true,matched:found.rowCount,deleted,failed};
  });

  app.get('/staff/stats/extended',async()=>{
    const [users,black,servers,mc,code,run,susp,nodes]=await Promise.all([
      query('SELECT count(*)::int n FROM users'),query('SELECT count(*)::int n FROM users WHERE blacklisted'),query('SELECT count(*)::int n FROM servers WHERE deleted_at IS NULL'),query("SELECT count(*)::int n FROM servers WHERE category='minecraft' AND deleted_at IS NULL"),query("SELECT count(*)::int n FROM servers WHERE category='code' AND deleted_at IS NULL"),query('SELECT count(*)::int n FROM servers WHERE deleted_at IS NULL AND suspended=false'),query('SELECT count(*)::int n FROM servers WHERE deleted_at IS NULL AND suspended=true'),query<any>('SELECT id,name,ptero_node_id,enabled,minecraft_slot_total,code_slot_total FROM nodes ORDER BY name')
    ]);
    return {users:users.rows[0].n,blacklisted:black.rows[0].n,totalServers:servers.rows[0].n,minecraft:{total:mc.rows[0].n,running:run.rows[0].n,suspended:susp.rows[0].n},code:{total:code.rows[0].n,running:run.rows[0].n,suspended:susp.rows[0].n},nodes:nodes.rows};
  });
}
