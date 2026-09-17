import {FastifyInstance} from 'fastify';
import {query} from './db';
import * as ptero from './ptero';

async function server(req:any,res:any){
  const u=req.user;
  const r=await query<any>(`SELECT s.* FROM servers s WHERE s.public_id=$1 AND s.deleted_at IS NULL AND (s.owner_id=$2 OR EXISTS(SELECT 1 FROM server_access a WHERE a.server_id=s.id AND a.user_id=$2))`,[String(req.params.id),u.id]);
  return r.rows[0]||null;
}

export async function registerServerControlRoutes(app:FastifyInstance,auth:(req:any,res:any)=>Promise<any>){
  app.addHook('preHandler',async(req:any,res:any)=>{
    if(!req.url.startsWith('/control/'))return;
    const u=await auth(req,res);if(!u)return res.code(401).send({error:'unauthorized'});req.user=u;
    if(u.blacklisted)return res.code(403).send({error:'blacklisted'});
  });
  app.get('/control/servers/:id/files',async(req:any,res:any)=>{const s=await server(req,res);if(!s)return res.code(404).send({error:'server_not_found'});try{return {directory:String(req.query?.directory||'/'),files:await ptero.listFiles(s.ptero_identifier,process.env.PTERODACTYL_CLIENT_KEY!,String(req.query?.directory||'/'))};}catch(e){const z=ptero.pteroError(e);return res.code(z.statusCode).send({error:z.message});}});
  app.get('/control/servers/:id/file',async(req:any,res:any)=>{const s=await server(req,res);if(!s)return res.code(404).send({error:'server_not_found'});const file=String(req.query?.path||'');if(!file.startsWith('/'))return res.code(400).send({error:'absolute_path_required'});try{return {path:file,content:await ptero.getFile(s.ptero_identifier,process.env.PTERODACTYL_CLIENT_KEY!,file)};}catch(e){const z=ptero.pteroError(e);return res.code(z.statusCode).send({error:z.message});}});
  app.put('/control/servers/:id/file',async(req:any,res:any)=>{const s=await server(req,res);if(!s)return res.code(404).send({error:'server_not_found'});const file=String(req.body?.path||'');if(!file.startsWith('/'))return res.code(400).send({error:'absolute_path_required'});try{await ptero.writeFile(s.ptero_identifier,process.env.PTERODACTYL_CLIENT_KEY!,file,String(req.body?.content??''));return {ok:true};}catch(e){const z=ptero.pteroError(e);return res.code(z.statusCode).send({error:z.message});}});
  app.post('/control/servers/:id/console',async(req:any,res:any)=>{const s=await server(req,res);if(!s)return res.code(404).send({error:'server_not_found'});if(s.suspended)return res.code(409).send({error:'server_suspended'});const command=String(req.body?.command||'').trim();if(!command||command.length>4096)return res.code(400).send({error:'invalid_command'});try{await ptero.sendCommand(s.ptero_identifier,process.env.PTERODACTYL_CLIENT_KEY!,command);return {ok:true};}catch(e){const z=ptero.pteroError(e);return res.code(z.statusCode).send({error:z.message});}});
}
