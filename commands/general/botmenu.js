const config=require('../../config'); const {replyText}=require('../../helpers/reply');
module.exports={name:"botmenu",aliases:["menubot"],category:"general",description:"Menu bot",
async execute(sock,msg,args,commands){ const p=config.prefix||'.';
  const list=[...commands.values()].filter(c=>c.category==='general').map(c=>`\`${p}${c.name}\``).join(' · ');
  return replyText(sock,msg.key.remoteJid,`⛩ *MENU BOT*\n━━━━━━━━━━━━━━\n${list}\n\n_.aimenu .groupmenu .funmenu .toolsmenu .fullmenu_`,msg); }};
