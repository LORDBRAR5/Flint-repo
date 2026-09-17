import { query } from './db';

export type Actor = { id:string; discord_id:string; blacklisted:boolean };

export async function canManageServer(actor: Actor, publicId: string) {
  if (actor.blacklisted) return false;
  const r = await query<any>(`SELECT s.id,s.owner_id,s.suspended FROM servers s WHERE s.public_id=$1 AND s.deleted_at IS NULL AND (s.owner_id=$2 OR EXISTS (SELECT 1 FROM server_access a WHERE a.server_id=s.id AND a.user_id=$2))`, [publicId, actor.id]);
  return r.rows[0] ?? null;
}

export async function canOwnServer(actor: Actor, publicId: string) {
  if (actor.blacklisted) return false;
  const r = await query<any>(`SELECT s.id,s.owner_id,s.suspended FROM servers s WHERE s.public_id=$1 AND s.owner_id=$2 AND s.deleted_at IS NULL`, [publicId, actor.id]);
  return r.rows[0] ?? null;
}

export function staffRoleAllowed(memberRoles: string[] = [], configured = '') {
  const allowed = configured.split(',').map(x => x.trim()).filter(Boolean);
  return allowed.length > 0 && allowed.some(role => memberRoles.includes(role));
}
