const DEFAULT_PLAYIT_PLUGIN_URL='https://github.com/playit-cloud/playit-minecraft-plugin/releases/latest/download/playit-minecraft-plugin.jar';

export type MinecraftPluginPolicy={enabled:boolean;url:string;filename:string};

function csv(name:string){return new Set((process.env[name]||'').split(',').map(v=>v.trim()).filter(Boolean));}

/**
 * AtxCloud never creates or claims a Playit account/tunnel. This module only
 * bootstraps the public Minecraft plugin into /plugins so the server owner can
 * complete Playit setup themselves.
 */
export function playitPolicy():MinecraftPluginPolicy{
  const enabled=!['0','false','off'].includes(String(process.env.ATXCLOUD_PLAYIT_PLUGIN_ENABLED||'1').toLowerCase());
  const url=String(process.env.ATXCLOUD_PLAYIT_PLUGIN_URL||DEFAULT_PLAYIT_PLUGIN_URL).trim();
  if(!/^https:\/\//i.test(url)||url.includes("'")) throw new Error('invalid_playit_plugin_url');
  return {enabled,url,filename:String(process.env.ATXCLOUD_PLAYIT_PLUGIN_FILENAME||'playit-minecraft-plugin.jar')};
}

export function isPluginCapableMinecraftSoftware(category:string,software:string){
  if(String(category).toLowerCase()!=='minecraft')return false;
  const s=String(software).toLowerCase();
  return ['paper','purpur','spigot','bukkit','folia'].some(v=>s.includes(v));
}

/** Prefixes a Pterodactyl startup command with a one-time plugin bootstrap. */
export function withPlayitPluginBootstrap(startup:string,category:string,software:string){
  const policy=playitPolicy();
  if(!policy.enabled||!isPluginCapableMinecraftSoftware(category,software))return startup;
  const filename=policy.filename.replace(/[^A-Za-z0-9._-]/g,'');
  if(!filename)return startup;
  const url=policy.url;
  return `mkdir -p plugins && if [ ! -s "plugins/${filename}" ]; then echo '[AtxCloud] Installing Playit Minecraft plugin into plugins/'; curl --fail --location --proto '=https' --tlsv1.2 --retry 3 --connect-timeout 10 --max-time 90 '${url}' -o 'plugins/${filename}'; fi && exec ${startup}`;
}

export function pluginInstallNotice(category:string,software:string){
  if(!isPluginCapableMinecraftSoftware(category,software))return null;
  return 'Playit plugin is included in plugins/. AtxCloud does not create or configure a Playit tunnel; claim/configure it yourself from the plugin setup instructions.';
}
