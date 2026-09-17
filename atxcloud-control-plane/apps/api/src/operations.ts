import crypto from 'node:crypto';
import { query, tx } from './db';
import * as ptero from './ptero';

export function operationKey(prefix='op'){return `${prefix}_${crypto.randomBytes(18).toString('hex')}`;}

export async function recordOperation(type:string,actorId:number,targetType:string,targetId:string,metadata:any={}){
  const key=operationKey(type);
  await query('INSERT INTO operation_jobs(idempotency_key,type,actor_user_id,target_type,target_id,status,metadata) VALUES($1,$2,$3,$4,$5,$6,$7)',[key,type,actorId,targetType,targetId,'queued',metadata]);
  return key;
}

export async function softDeleteServer(publicId:string, actorId:number, staff=false){
  return tx(async c=>{
    const r=await c.query<any>('SELECT * FROM servers WHERE public_id=$1 AND deleted_at IS NULL FOR UPDATE',[publicId]);
    if(!r.rows[0])throw Object.assign(new Error('server_not_found'),{statusCode:404});
    if(!staff && r.rows[0].owner_id!==actorId)throw Object.assign(new Error('owner_required'),{statusCode:403});
    try{await ptero.deleteServer(r.rows[0].ptero_server_id);}catch(e){throw Object.assign(new Error('pterodactyl_delete_failed'),{statusCode:502,cause:e});}
    await c.query('UPDATE servers SET deleted_at=now(),updated_at=now() WHERE id=$1',[r.rows[0].id]);
    return r.rows[0];
  });
}

export async function setServerSuspended(publicId:string,suspended:boolean,actorId:number,staff=true){
  return tx(async c=>{
    const r=await c.query<any>('SELECT * FROM servers WHERE public_id=$1 AND deleted_at IS NULL FOR UPDATE',[publicId]);
    if(!r.rows[0])throw Object.assign(new Error('server_not_found'),{statusCode:404});
    if(!staff && r.rows[0].owner_id!==actorId)throw Object.assign(new Error('staff_required'),{statusCode:403});
    if(suspended)await ptero.suspendServer(r.rows[0].ptero_server_id);else await ptero.unsuspendServer(r.rows[0].ptero_server_id);
    await c.query('UPDATE servers SET suspended=$1,updated_at=now() WHERE id=$2',[suspended,r.rows[0].id]);
    return {publicId,suspended};
  });
}
