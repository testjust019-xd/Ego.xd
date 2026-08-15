const config=require('../../config'); const {replyText}=require('../../helpers/reply');
module.exports={name:"aimenu",aliases:["menuai"],category:"general",description:"Menu IA",
async execute(sock,msg,args,commands){ const p=config.prefix||'.';
  const list=[...commands.values()].filter(c=>c.category==='ai').map(c=>`\`${p}${c.name}\``).join(' · ');
  return replyText(sock,msg.key.remoteJid,`🧠 *MENU IA*\n━━━━━━━━━━━━━━\n${list}`,msg); }};
