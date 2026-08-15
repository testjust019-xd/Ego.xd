const config=require('../../config'); const {replyText}=require('../../helpers/reply');
module.exports={name:"modmenu",aliases:["menumod"],category:"moderation",description:"Menu modération",
async execute(sock,msg,args,commands){
  const p=config.prefix||'.';
  const mods=[...commands.values()].filter(c=>c.category==='moderation'||c.category==='groups').sort((a,b)=>a.name.localeCompare(b.name));
  let t=`🛡 *MENU MODÉRATION*\n━━━━━━━━━━━━━━━━\n`;
  for(const c of mods) t+=`• \`${p}${c.name}\` — ${(c.description||'').split('—')[0].trim().slice(0,35)}\n`;
  return replyText(sock,msg.key.remoteJid,t,msg);
}};
