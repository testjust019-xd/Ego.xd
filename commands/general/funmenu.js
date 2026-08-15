const config=require('../../config'); const {replyText}=require('../../helpers/reply');
module.exports={name:"funmenu",aliases:["menufun"],category:"general",description:"Menu fun",
async execute(sock,msg,args,commands){ const p=config.prefix||'.';
  const fun=[...commands.values()].filter(c=>c.category==='fun').map(c=>`\`${p}${c.name}\``).join(' · ');
  const reac=[...commands.values()].filter(c=>c.category==='reactions').map(c=>`\`${p}${c.name}\``).join(' · ');
  return replyText(sock,msg.key.remoteJid,`🎉 *MENU FUN*\n━━━━━━━━━━━━━━\n*Fun*\n${fun}\n\n*Réactions*\n${reac}`,msg); }};
