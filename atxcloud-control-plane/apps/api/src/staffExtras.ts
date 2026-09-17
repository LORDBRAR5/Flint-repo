import { FastifyInstance } from 'fastify';
import { query, tx } from './db';
import * as ptero from './ptero';
import { timingEqual } from './security';

async function staff(req:any){
  const secret=String(req.headers['x-atx-internal-secret']||'');
  if(!timingEqual(secret,process.env.ATXCLOUD_INTERNAL_SECRET||'')) return null;
  const discordId=String(req.headers['x-discord-user']||'');
  const u=(await query<any>('SELECT * FROM users WHERE discord_id=$1 AND blacklisted=false',[discordId])).rows[0];
  if(!u) return null;
  const member=await fetch(`https://discord.com/api/guilds/${process.env.DISCORD_GUILD_ID}/members/${discordId}`,{headers:{Authorization:`Bot ${process.env.DISCORD_BOT_TOKEN}`}});
  if(!member.ok) return null;
  const body:any=await member.json();
  const roles=(process.env.STAFF_ROLE_IDS||'').split(',').map(x=>x.trim()).filter(Boolean);
  return roles.some(x=>body.roles?.includes(x))?u:null;
}

export async function registerStaffExtras(app:FastifyInstance){
  app.post('/internal/staff/transfer-server',async(req:any,res)=>{
    const actor=await staff(req); if(!actor)return res.code(403).send({error:'staff_required'});
    const publicId=String(req.body?.serverId||'');
    const targetDiscord=String(req.body?.targetDiscordId||'');
    if(!publicId||!targetDiscord)return res.code(400).send({error:'serverId_and_target_required'});
    const target=(await query<any>('SELECT id,blacklisted,ptero_user_id FROM users WHERE discord_id=$1',[targetDiscord])).rows[0];
    if(!target)return res.code(404).send({error:'target_account_not_found'});
    if(target.blacklisted)return res.code(403).send({error:'target_blacklisted'});
    const server=(await query<any>('SELECT * FROM servers WHERE public_id=$1 AND deleted_at IS NULL',[publicId])).rows[0];
    if(!server)return res.code(404).send({error:'server_not_found'});
    if(!target.ptero_user_id)return res.code(409).send({error:'target_pterodactyl_account_missing'});
    if(!server.ptero_server_id)return res.code(409).send({error:'pterodactyl_server_missing'});
    try{
      await ptero.updateServer(Number(server.ptero_server_id),{user:Number(target.ptero_user_id)});
      await tx(async c=>{
        await c.query('UPDATE servers SET owner_id=$1,updated_at=now() WHERE id=$2',[target.id,server.id]);
        await c.query('DELETE FROM server_access WHERE server_id=$1',[server.id]);
      });
      await query('INSERT INTO audit_logs(actor_user_id,actor_discord_id,action,target_type,target_id,metadata) VALUES($1,$2,$3,$4,$5,$6)',[actor.id,actor.discord_id,'staff.server.transfer','server',publicId,{targetDiscord}]);
      return {ok:true,serverId:publicId,targetDiscordId:targetDiscord};
    }catch(e:any){return res.code(e.statusCode||502).send({error:e.message||'transfer_failed'});}
  });

  app.get('/internal/staff/capacity',async(req:any,res)=>{
    if(!await staff(req))return res.code(403).send({error:'staff_required'});
    const nodes=await query<any>('SELECT id,name,ptero_node_id,enabled,minecraft_slot_total,code_slot_total FROM nodes ORDER BY name');
    const servers=await query<any>('SELECT node_id,category,count(*)::int count FROM servers WHERE deleted_at IS NULL GROUP BY node_id,category');
    return {nodes:nodes.rows.map((n:any)=>{
      const mc=servers.rows.find((s:any)=>s.node_id===n.id&&s.category==='minecraft')?.count||0;
      const code=servers.rows.find((s:any)=>s.node_id===n.id&&s.category==='code')?.count||0;
      return {...n,minecraft:{used:mc,total:n.minecraft_slot_total,available:Math.max(0,n.minecraft_slot_total-mc)},code:{used:code,total:n.code_slot_total,available:Math.max(0,n.code_slot_total-code)}};
    })};
  });
}
