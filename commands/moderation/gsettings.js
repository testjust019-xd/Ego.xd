const {replyText}=require('../../helpers/reply'); const {getGroupSettings}=require('../../lib/groupSettings');
module.exports={name:"gsettings",aliases:["gs"],category:"moderation",description:"Réglages groupe — .gsettings",
async execute(sock,msg){
  const jid=msg.key.remoteJid; if(!jid.endsWith('@g.us'))return replyText(sock,jid,"Groupe only.",msg);
  const s=getGroupSettings(jid); const on=v=>v?'ON ✅':'OFF ❌';
  return replyText(sock,jid,`⚙️ *Réglages*\n🔗 Antilink: ${on(s.antilink)} (${s.antilinkMode||'—'})\n🚫 Antispam: ${on(s.antispam)}\n🤖 Antibot: ${on(s.antibot)}\n🗑 Antidelete: ${on(s.antidelete)}\n👋 Welcome: ${on(s.welcome)}\n👋 Goodbye: ${on(s.goodbye)}`,msg);
}};
