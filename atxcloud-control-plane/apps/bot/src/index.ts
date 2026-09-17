import {Client,GatewayIntentBits,REST,Routes,SlashCommandBuilder,ActionRowBuilder,StringSelectMenuBuilder,ButtonBuilder,ButtonStyle,EmbedBuilder,ChatInputCommandInteraction,Interaction} from 'discord.js';

const API=(process.env.API_URL||'http://api:4000').replace(/\/$/,'');
const bot=new Client({intents:[GatewayIntentBits.Guilds]});
const commands=[
 new SlashCommandBuilder().setName('manage-server').setDescription('Manage your AtxCloud servers'),
 new SlashCommandBuilder().setName('my-account').setDescription('View your AtxCloud account'),
 new SlashCommandBuilder().setName('gift-coins').setDescription('Transfer coins').addUserOption(o=>o.setName('user').setDescription('Recipient').setRequired(true)).addIntegerOption(o=>o.setName('coins').setDescription('Amount').setRequired(true).setMinValue(1)),
 new SlashCommandBuilder().setName('share-access').setDescription('Share server access').addStringOption(o=>o.setName('server').setDescription('Server ID').setRequired(true)).addUserOption(o=>o.setName('user').setDescription('User').setRequired(true)),
 new SlashCommandBuilder().setName('remove-access').setDescription('Remove server access').addStringOption(o=>o.setName('server').setDescription('Server ID').setRequired(true)).addUserOption(o=>o.setName('user').setDescription('User').setRequired(true)),
 new SlashCommandBuilder().setName('staff-accounts').setDescription('Staff: list accounts'),
 new SlashCommandBuilder().setName('staff-servers').setDescription('Staff: list servers'),
 new SlashCommandBuilder().setName('staff-manage-user').setDescription('Staff: manage a user').addUserOption(o=>o.setName('user').setDescription('User').setRequired(true)),
 new SlashCommandBuilder().setName('staff-manage-server').setDescription('Staff: manage a server').addStringOption(o=>o.setName('server').setDescription('Server ID').setRequired(true)),
 new SlashCommandBuilder().setName('staff-stats').setDescription('Staff: system statistics'),
 new SlashCommandBuilder().setName('staff-purge-servers').setDescription('Staff: purge servers').addStringOption(o=>o.setName('type').setDescription('Selection').setRequired(true).addChoices({name:'Suspended',value:'suspended'},{name:'Offline',value:'offline'},{name:'Blacklisted',value:'blacklisted'}))
].map(x=>x.toJSON());

async function api(path:string,init:any={}){const r=await fetch(`${API}${path}`,{...init,headers:{'content-type':'application/json',...(init.headers||{})}});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||`API ${r.status}`);return data;}
function onlyUser(i:Interaction,id:string){return i.user.id===id;}
function manageEmbed(s:any,r:any){const mem=r?.current??r;return new EmbedBuilder().setTitle(s.name).setDescription(`Server ID: **${s.public_id}**\nSoftware: **${s.egg_id}**\nVersion: **${s.version||'Not set'}**\nStatus: **${mem?.state||'unknown'}**\nRAM: **${mem?.memory_bytes?Math.round(mem.memory_bytes/1048576):0} MB**\nCPU: **${mem?.cpu_absolute||0}%**\nDisk: **${mem?.disk_bytes?Math.round(mem.disk_bytes/1073741824*100)/100:0} GB**`).setColor(0xe0002a);}
function powerRow(id:string,user:string){return new ActionRowBuilder<ButtonBuilder>().addComponents(...(['start','stop','restart','kill'] as const).map(x=>new ButtonBuilder().setCustomId(`power:${user}:${id}:${x}`).setLabel(x[0].toUpperCase()+x.slice(1)).setStyle(x==='kill'?ButtonStyle.Danger:x==='start'?ButtonStyle.Success:ButtonStyle.Secondary)));}

bot.once('ready',async()=>{const rest=new REST({version:'10'}).setToken(process.env.DISCORD_BOT_TOKEN!);await rest.put(Routes.applicationGuildCommands(bot.user!.id,process.env.DISCORD_GUILD_ID!),{body:commands});console.log(`AtxCloud bot ready as ${bot.user?.tag}`);});

bot.on('interactionCreate',async(i)=>{try{
 if(i.isButton()){
  const [kind,user,server,signal]=i.customId.split(':'); if(kind==='power'){if(!onlyUser(i,user))return i.reply({content:'This control panel belongs to another user.',ephemeral:true});await i.deferUpdate();try{await api(`/servers/${server}/power`,{method:'POST',body:JSON.stringify({signal})});const fresh=await api(`/servers/${server}`);return i.editReply({embeds:[manageEmbed(fresh.server,fresh.resource)],components:[powerRow(server,user)]});}catch(e:any){return i.followUp({content:e.message,ephemeral:true});}}
 }
 if(!i.isChatInputCommand())return;
 if(i.commandName==='manage-server'){const list=await api('/servers');if(!list.length)return i.reply({content:'You do not have any servers.',ephemeral:true});const menu=new StringSelectMenuBuilder().setCustomId(`select:${i.user.id}`).setPlaceholder('Select a server').addOptions(list.slice(0,25).map((s:any)=>({label:s.name.slice(0,100),value:s.public_id,description:s.public_id})));return i.reply({content:'Select a server to manage.',components:[new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],ephemeral:false});}
 if(i.isChatInputCommand()&&i.commandName==='my-account'){const m=await api('/me');const e=new EmbedBuilder().setTitle('AtxCloud Account').setDescription(`User: **${m.user.username}**\nEmail: **${m.user.email||'Not available'}**\nCoins: **${m.user.coins}**\nServers: **${m.servers.length}**\nCreated: **${new Date(m.user.createdAt).toLocaleString()}**`).setColor(0xe0002a);return i.reply({embeds:[e],components:[new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(`reset:${i.user.id}`).setLabel('Reset password').setStyle(ButtonStyle.Secondary))]});}
 if(i.commandName==='gift-coins'){const target=i.options.getUser('user',true),coins=i.options.getInteger('coins',true);const yes=new ButtonBuilder().setCustomId(`gift:${i.user.id}:${target.id}:${coins}`).setLabel('Confirm transfer').setStyle(ButtonStyle.Danger);return i.reply({content:`Transfer **${coins}** coins to ${target}?`,components:[new ActionRowBuilder<ButtonBuilder>().addComponents(yes)]});}
 if(i.commandName==='share-access'||i.commandName==='remove-access'){const server=i.options.getString('server',true),target=i.options.getUser('user',true);const action=i.commandName==='share-access'?'add':'remove';const b=new ButtonBuilder().setCustomId(`access:${i.user.id}:${action}:${server}:${target.id}`).setLabel('Confirm').setStyle(ButtonStyle.Danger);return i.reply({content:`Confirm **${action}** access for ${target} on **${server}**?`,components:[new ActionRowBuilder<ButtonBuilder>().addComponents(b)]});}
 if(i.commandName.startsWith('staff-')){return staff(i);}
 }catch(e:any){if(i.isRepliable())return i.replied||i.deferred?i.followUp({content:e.message||'Operation failed',ephemeral:true}):i.reply({content:e.message||'Operation failed',ephemeral:true});}}
});

bot.on('interactionCreate',async(i)=>{if(!i.isStringSelectMenu()||!i.customId.startsWith('select:'))return;const user=i.customId.split(':')[1];if(i.user.id!==user)return i.reply({content:'This control belongs to another user.',ephemeral:true});const s=await api(`/servers/${i.values[0]}`);return i.update({content:'Live server controls',embeds:[manageEmbed(s.server,s.resource)],components:[powerRow(s.server.public_id,user)]});});

async function staff(i:ChatInputCommandInteraction){
 const m=await api('/me');if(!m.staff)return i.reply({content:'Staff access required.',ephemeral:true});
 if(i.commandName==='staff-stats'){const s=await api('/staff/stats');return i.reply({embeds:[new EmbedBuilder().setTitle('AtxCloud Staff Stats').setDescription(`Users: **${s.users}**\nBlacklisted: **${s.blacklisted}**\nMinecraft servers: **${s.minecraftServers}**\nBot/Code servers: **${s.codeServers}**\nRunning: **${s.running}**\nSuspended: **${s.suspended}**`).setColor(0xe0002a)]});}
 return i.reply({content:'This staff operation is wired to the central control plane. The detailed admin surface is available from the dashboard.',ephemeral:true});
}

bot.login(process.env.DISCORD_BOT_TOKEN);
