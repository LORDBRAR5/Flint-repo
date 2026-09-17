import {Pool,PoolClient,QueryResult,QueryResultRow} from 'pg';
export const pool=new Pool({connectionString:process.env.DATABASE_URL,max:20,idleTimeoutMillis:30000});
export async function tx<T>(fn:(c:PoolClient)=>Promise<T>):Promise<T>{const c=await pool.connect();try{await c.query('BEGIN');const value=await fn(c);await c.query('COMMIT');return value}catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}}
export async function query<T extends QueryResultRow=any>(text:string,values?:unknown[]):Promise<QueryResult<T>>{return pool.query<T>(text,values)}
