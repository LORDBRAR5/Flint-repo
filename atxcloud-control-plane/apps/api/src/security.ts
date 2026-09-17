import crypto from 'node:crypto';

export function randomToken(bytes=32){ return crypto.randomBytes(bytes).toString('base64url'); }
export function hashToken(v:string){ return crypto.createHash('sha256').update(v).digest('hex'); }
export function timingEqual(a:string,b:string){ const aa=Buffer.from(a),bb=Buffer.from(b); return aa.length===bb.length && crypto.timingSafeEqual(aa,bb); }
export function publicId(prefix='Stone'){ return `${prefix}${crypto.randomInt(1000,10000)}`; }
export function password(){ return crypto.randomBytes(18).toString('base64url'); }
