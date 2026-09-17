import axios, { AxiosInstance } from 'axios';

const base = () => (process.env.PTERODACTYL_URL || '').replace(/\/$/,'');
function app():AxiosInstance { return axios.create({baseURL:`${base()}/api/application`,timeout:20000,headers:{Authorization:`Bearer ${process.env.PTERODACTYL_APPLICATION_KEY}`,Accept:'Application/vnd.pterodactyl.v1+json','Content-Type':'application/json'}}); }
function client(key:string):AxiosInstance { return axios.create({baseURL:`${base()}/api/client`,timeout:20000,headers:{Authorization:`Bearer ${key}`,Accept:'Application/vnd.pterodactyl.v1+json','Content-Type':'application/json'}}); }

export type PteroPower='start'|'stop'|'restart'|'kill';
export async function findUser(externalId:string){ const r=await app().get('/users',{params:{'filter[external_id]':externalId,'per_page':1}}); return r.data.data?.[0]?.attributes ?? null; }
export async function updateUser(id:number, body:Record<string,unknown>){ return (await app().patch(`/users/${id}`,body)).data.attributes; }
export async function createUser(body:Record<string,unknown>){ return (await app().post('/users',body)).data.attributes; }
export async function deleteUser(id:number){ await app().delete(`/users/${id}`); }
export async function listUsers(){ const out:any[]=[]; for(let page=1;;page++){ const r=await app().get('/users',{params:{page}}); out.push(...r.data.data.map((x:any)=>x.attributes)); if(!r.data.meta?.pagination || page>=r.data.meta.pagination.total_pages) return out; } }
export async function getServer(id:number){ return (await app().get(`/servers/${id}`)).data.attributes; }
export async function listServers(){ const out:any[]=[]; for(let page=1;;page++){ const r=await app().get('/servers',{params:{page}}); out.push(...r.data.data.map((x:any)=>x.attributes)); if(!r.data.meta?.pagination || page>=r.data.meta.pagination.total_pages) return out; } }
export async function createServer(body:Record<string,unknown>){ return (await app().post('/servers',body)).data.attributes; }
export async function deleteServer(id:number){ await app().delete(`/servers/${id}`); }
export async function suspendServer(id:number){ await app().post(`/servers/${id}/suspend`); }
export async function unsuspendServer(id:number){ await app().post(`/servers/${id}/unsuspend`); }
export async function listNodes(){ const r=await app().get('/nodes',{params:{per_page:100}}); return r.data.data.map((x:any)=>x.attributes); }
export async function listNests(){ const r=await app().get('/nests',{params:{include:'eggs',per_page:100}}); return r.data.data.map((x:any)=>x.attributes); }
export async function listAllocations(nodeId:number){ const r=await app().get(`/nodes/${nodeId}/allocations`,{params:{per_page:100}}); return r.data.data.map((x:any)=>x.attributes); }
export async function power(identifier:string,key:string,signal:PteroPower){ await client(key).post(`/servers/${identifier}/power`,{signal}); }
export async function resources(identifier:string,key:string){ return (await client(key).get(`/servers/${identifier}/resources`)).data.attributes; }
export async function serverDetails(identifier:string,key:string){ return (await client(key).get(`/servers/${identifier}`)).data.attributes; }
