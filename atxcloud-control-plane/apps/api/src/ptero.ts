import axios, { AxiosInstance } from 'axios';

const base = () => (process.env.PTERODACTYL_URL || '').replace(/\/$/, '');
const headers = (key:string) => ({ Authorization:`Bearer ${key}`, Accept:'Application/vnd.pterodactyl.v1+json', 'Content-Type':'application/json' });
function app():AxiosInstance { return axios.create({baseURL:`${base()}/api/application`,timeout:20000,headers:headers(process.env.PTERODACTYL_APPLICATION_KEY || '')}); }
function client(key:string):AxiosInstance { return axios.create({baseURL:`${base()}/api/client`,timeout:20000,headers:headers(key)}); }

export type PteroPower='start'|'stop'|'restart'|'kill';
export type PteroPage<T>={data:T[];meta?:{pagination?:{total_pages:number}}};
export type PteroFile={name:string,size:number,mode:string,mimetype?:string,is_file:boolean,is_symlink?:boolean};

async function pages<T>(path:string, params:Record<string,unknown>={}):Promise<T[]> {const out:T[]=[];for(let page=1;;page++){const r=await app().get(path,{params:{...params,page,per_page:100}}) as {data:PteroPage<T>};out.push(...(r.data.data||[]));const total=r.data.meta?.pagination?.total_pages;if(!total||page>=total)return out;}}
export async function findUser(externalId:string){const r=await app().get('/users',{params:{'filter[external_id]':externalId,'per_page':1}});return r.data.data?.[0]?.attributes??null;}
export async function getUser(id:number){return (await app().get(`/users/${id}`)).data.attributes;}
export async function updateUser(id:number,body:Record<string,unknown>){return (await app().patch(`/users/${id}`,body)).data.attributes;}
export async function createUser(body:Record<string,unknown>){return (await app().post('/users',body)).data.attributes;}
export async function deleteUser(id:number){await app().delete(`/users/${id}`);}
export async function listUsers(){return pages<any>('/users');}
export async function getServer(id:number){return (await app().get(`/servers/${id}`)).data.attributes;}
export async function listServers(){return pages<any>('/servers');}
export async function createServer(body:Record<string,unknown>){return (await app().post('/servers',body)).data.attributes;}
export async function updateServer(id:number,body:Record<string,unknown>){return (await app().patch(`/servers/${id}`,body)).data.attributes;}
export async function deleteServer(id:number){await app().delete(`/servers/${id}`);}
export async function suspendServer(id:number){await app().post(`/servers/${id}/suspend`);}
export async function unsuspendServer(id:number){await app().post(`/servers/${id}/unsuspend`);}
export async function listNodes(){return pages<any>('/nodes');}
export async function getNode(id:number){return (await app().get(`/nodes/${id}`)).data.attributes;}
export async function createNode(body:Record<string,unknown>){return (await app().post('/nodes',body)).data.attributes;}
export async function updateNode(id:number,body:Record<string,unknown>){return (await app().patch(`/nodes/${id}`,body)).data.attributes;}
export async function deleteNode(id:number){await app().delete(`/nodes/${id}`);}
export async function listNests(){return pages<any>('/nests',{include:'eggs'});}
export async function getNest(id:number){return (await app().get(`/nests/${id}`,{params:{include:'eggs'}})).data.attributes;}
export async function listEggs(nestId:number){return pages<any>(`/nests/${nestId}/eggs`);}
export async function getEgg(nestId:number,eggId:number){return (await app().get(`/nests/${nestId}/eggs/${eggId}`)).data.attributes;}
export async function listAllocations(nodeId:number){return pages<any>(`/nodes/${nodeId}/allocations`);}
export async function power(identifier:string,key:string,signal:PteroPower){await client(key).post(`/servers/${identifier}/power`,{signal});}
export async function resources(identifier:string,key:string){return (await client(key).get(`/servers/${identifier}/resources`)).data.attributes;}
export async function runtimeState(identifier:string,key:string){const r=await resources(identifier,key);return {state:String(r.current_state||r.state||'unknown'),current:r.current||null,resource:r};}
export async function serverDetails(identifier:string,key:string){return (await client(key).get(`/servers/${identifier}`)).data.attributes;}
export async function sendCommand(identifier:string,key:string,command:string){await client(key).post(`/servers/${identifier}/command`,{command});}
export async function listFiles(identifier:string,key:string,directory='/'){return (await client(key).get(`/servers/${identifier}/files/list`,{params:{directory}})).data.data.map((x:any)=>x.attributes as PteroFile);}
export async function getFile(identifier:string,key:string,file:string){return (await client(key).get(`/servers/${identifier}/files/contents`,{params:{file}})).data;}
export async function writeFile(identifier:string,key:string,file:string,content:string){await client(key).post(`/servers/${identifier}/files/write`,content,{params:{file},headers:{...headers(key),'Content-Type':'text/plain'}});}
export async function deleteFiles(identifier:string,key:string,root:string,files:string[]){await client(key).post(`/servers/${identifier}/files/delete`,{root,files});}
export async function createFolder(identifier:string,key:string,root:string,name:string){await client(key).post(`/servers/${identifier}/files/create-folder`,{root,name});}
export async function renameFiles(identifier:string,key:string,root:string,files:{from:string;to:string}[]){await client(key).put(`/servers/${identifier}/files/rename`,{root,files});}
export async function listBackups(identifier:string,key:string){return (await client(key).get(`/servers/${identifier}/backups`)).data.data.map((x:any)=>x.attributes);}
export async function createBackup(identifier:string,key:string,name?:string){return (await client(key).post(`/servers/${identifier}/backups`,name?{name}:{})).data.attributes;}
export async function deleteBackup(identifier:string,key:string,backupId:string){await client(key).delete(`/servers/${identifier}/backups/${backupId}`);}
export async function restoreBackup(identifier:string,key:string,backupId:string){await client(key).post(`/servers/${identifier}/backups/${backupId}/restore`);}
export async function updateStartup(identifier:string,key:string,body:Record<string,unknown>){return (await client(key).put(`/servers/${identifier}/startup`,body)).data.attributes;}
export async function listServerDatabases(identifier:string,key:string){return (await client(key).get(`/servers/${identifier}/databases`)).data.data.map((x:any)=>x.attributes);}
export async function listServerAllocations(identifier:string,key:string){return (await client(key).get(`/servers/${identifier}/network/allocations`)).data.data.map((x:any)=>x.attributes);}
export function pteroError(error:unknown){const e:any=error;const status=e?.response?.status;const detail=e?.response?.data?.errors?.[0]?.detail||e?.message||'Pterodactyl request failed';return Object.assign(new Error(detail),{statusCode:status&&status>=400&&status<600?status:502,pteroStatus:status,pteroData:e?.response?.data});}
