import { PoolClient } from 'pg';
import { tx } from './db';

const keyPattern=/^[A-Za-z0-9._:-]{8,160}$/;

export async function transferCoins(fromUserId:string,toUserId:string,amount:number,idempotencyKey:string) {
  if (!Number.isSafeInteger(amount) || amount <= 0) throw Object.assign(new Error('invalid_amount'), { statusCode:400 });
  if (fromUserId === toUserId) throw Object.assign(new Error('self_transfer'), { statusCode:400 });
  if (!keyPattern.test(idempotencyKey)) throw Object.assign(new Error('invalid_idempotency_key'), { statusCode:400 });
  return tx(async (c:PoolClient) => {
    const prior = await c.query<any>('SELECT reference FROM coin_ledger WHERE idempotency_key=$1 LIMIT 1',[idempotencyKey]);
    if (prior.rows[0]) return { idempotent:true, reference:prior.rows[0].reference };
    const ids=[fromUserId,toUserId].sort();
    const users=await c.query<any>('SELECT id,coins,blacklisted FROM users WHERE id=ANY($1::uuid[]) FOR UPDATE',[ids]);
    const from=users.rows.find(x=>x.id===fromUserId), to=users.rows.find(x=>x.id===toUserId);
    if(!from || !to) throw Object.assign(new Error('account_not_found'),{statusCode:404});
    if(from.blacklisted || to.blacklisted) throw Object.assign(new Error('blacklisted_account'),{statusCode:403});
    if(Number(from.coins)<amount) throw Object.assign(new Error('insufficient_coins'),{statusCode:409});
    await c.query('UPDATE users SET coins=coins-$1,updated_at=now() WHERE id=$2',[amount,fromUserId]);
    await c.query('UPDATE users SET coins=coins+$1,updated_at=now() WHERE id=$2',[amount,toUserId]);
    await c.query('INSERT INTO coin_ledger(idempotency_key,user_id,actor_id,amount,type,reference) VALUES($1,$2,$3,$4,$5,$6)',[idempotencyKey,fromUserId,fromUserId,-amount,'gift',toUserId]);
    await c.query('INSERT INTO coin_ledger(idempotency_key,user_id,actor_id,amount,type,reference) VALUES($1,$2,$3,$4,$5,$6)',[`${idempotencyKey}:credit`,toUserId,fromUserId,amount,'gift',fromUserId]);
    return {idempotent:false};
  });
}

export async function adjustCoins(actorId:string,targetId:string,amount:number,reason:string,idempotencyKey:string){
  if(!keyPattern.test(idempotencyKey)) throw Object.assign(new Error('invalid_idempotency_key'),{statusCode:400});
  return tx(async c=>{
    const prior=await c.query('SELECT 1 FROM coin_ledger WHERE idempotency_key=$1',[idempotencyKey]);
    if(prior.rowCount)return {idempotent:true};
    const r=await c.query<any>('SELECT id,coins,blacklisted FROM users WHERE id=$1 FOR UPDATE',[targetId]);
    if(!r.rows[0])throw Object.assign(new Error('account_not_found'),{statusCode:404});
    const next=Number(r.rows[0].coins)+amount;
    if(next<0)throw Object.assign(new Error('negative_balance'),{statusCode:409});
    await c.query('UPDATE users SET coins=$1,updated_at=now() WHERE id=$2',[next,targetId]);
    await c.query('INSERT INTO coin_ledger(idempotency_key,user_id,actor_id,amount,type,reference) VALUES($1,$2,$3,$4,$5,$6)',[idempotencyKey,targetId,actorId,amount,'admin_adjustment',reason.slice(0,500)]);
    return {idempotent:false,balance:next};
  });
}
