const config=require('../../config'); const {replyText}=require('../../helpers/reply');
module.exports={name:"groupmenu",aliases:["gmenu"],category:"general",description:"Menu groupes",
async execute(sock,msg,args,commands){ const p=config.prefix||'.';
  const list=[...commands.values()].filter(c=>['groups','moderation'].includes(c.category)).map(c=>`\`${p}${c.name}\``).join(' · ');
  return replyText(sock,msg.key.remoteJid,`👥 *MENU GROUPES*\n━━━━━━━━━━━━━━\n${list}`,msg); }};
