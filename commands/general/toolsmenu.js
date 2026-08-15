const config=require('../../config'); const {replyText}=require('../../helpers/reply');
module.exports={name:"toolsmenu",aliases:["menutools"],category:"general",description:"Menu outils",
async execute(sock,msg,args,commands){ const p=config.prefix||'.';
  const list=[...commands.values()].filter(c=>['tools','utility','search'].includes(c.category)).map(c=>`\`${p}${c.name}\``).join(' · ');
  return replyText(sock,msg.key.remoteJid,`🛠 *MENU OUTILS*\n━━━━━━━━━━━━━━\n${list}`,msg); }};
