import {Client,GatewayIntentBits,EmbedBuilder} from 'discord.js';
const API=(process.env.API_URL||'http://api:4000').replace(/\/$/,'');const SECRET=process.env.ATXCLOUD_INTERNAL_SECRET||'';
const c=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMessages,GatewayIntentBits.MessageContent]});
async function api(path:string,id:string){const r=await fetch(`${API}${path}`,{headers:{'x-atx-internal-secret':SECRET,'x-discord-user':id}});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Request failed');return d;}
c.on('messageCreate',async m=>{if(m.author.bot||!m.content.startsWith('a!'))return;const [cmd,...args]=m.content.slice(2).trim().split(/\s+/);try{
 if(cmd==='my-account'){const x=await api('/internal/me',m.author.id);return m.reply({embeds:[new EmbedBuilder().setTitle('AtxCloud Account').setDescription(`User: **${x.user.username}**\nCoins: **${x.user.coins}**\nServers: **${x.servers.length}**`).setColor(0xe0002a)]});}
 if(cmd==='manage-server'){const x=await api('/internal/servers',m.author.id);return m.reply(x.length?x.slice(0,20).map((s:any)=>`**${s.name}** • ${s.public_id} • ${s.suspended?'suspended':'available'}`).join('\n'):'You do not have any servers.');}
 if(cmd==='gift-coins'&&args[0]&&Number.isInteger(Number(args[1]))){const target=args[0].replace(/[<@!>]/g,''),coins=Number(args[1]);return m.reply(`Use **/gift-coins** for a confirmation-protected transfer of **${coins}** coins to <@${target}>.`);}
 if(cmd==='share-access'||cmd==='remove-access')return m.reply(`Use **/${cmd}** for the protected confirmation flow.`);
} catch(e:any){await m.reply(e.message||'Operation failed');}});
c.login(process.env.DISCORD_BOT_TOKEN);
