import { FastifyInstance } from 'fastify';
import { query } from './db';

export async function registerAccountRoutes(app:FastifyInstance,auth:(req:any,res:any)=>Promise<any>){
  app.get('/account',async(req,res)=>{
    const u=await auth(req,res); if(!u)return res.code(401).send({error:'unauthorized'});
    const [summary,ledger]=await Promise.all([
      query<any>(`SELECT COALESCE(sum(amount) FILTER(WHERE amount>0),0)::bigint earned,COALESCE(sum(-amount) FILTER(WHERE amount<0),0)::bigint spent FROM coin_ledger WHERE user_id=$1`,[u.id]),
      query<any>('SELECT amount,type,reference,created_at FROM coin_ledger WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100',[u.id])
    ]);
    return {user:{id:u.id,discordId:u.discord_id,username:u.username,email:u.email,coins:u.coins,createdAt:u.created_at,blacklisted:u.blacklisted},coinSummary:summary.rows[0],ledger:ledger.rows};
  });
  app.get('/coins/ledger',async(req,res)=>{
    const u=await auth(req,res); if(!u)return res.code(401).send({error:'unauthorized'});
    const limit=Math.min(100,Math.max(1,Number(req.query?.limit)||50));
    const r=await query<any>('SELECT amount,type,reference,created_at FROM coin_ledger WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2',[u.id,limit]);
    return {balance:u.coins,ledger:r.rows};
  });
}
