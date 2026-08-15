const {replyText}=require('../../helpers/reply'); const {isSenderAdmin}=require('../../lib/groupHelpers');
const {getGroupSettings,setGroupSetting}=require('../../lib/groupSettings');
module.exports={name:"antilink",aliases:["antilien"],category:"moderation",description:"Anti-lien — .antilink on/off/strict/warn",
async execute(sock,msg,args){
  const jid=msg.key.remoteJid; if(!jid.endsWith('@g.us'))return replyText(sock,jid,"Groupe only.",msg);
  if(!(await isSenderAdmin(sock,jid,msg)))return replyText(sock,jid,"Admins only.",msg);
  const c=(args[0]||'').toLowerCase(), cur=getGroupSettings(jid);
  if(!c||c==='status')return replyText(sock,jid,`🔗 Anti-Link: ${cur.antilink?'ON':'OFF'} (${cur.antilinkMode||'—'})\n.on .off .strict .warn`,msg);
  if(c==='off'){setGroupSetting(jid,'antilink',false);setGroupSetting(jid,'antilinkMode','off');return replyText(sock,jid,"✅ OFF",msg);}
  if(!['on','strict','warn'].includes(c))return replyText(sock,jid,"on|off|strict|warn",msg);
  setGroupSetting(jid,'antilink',true); setGroupSetting(jid,'antilinkMode',c==='on'?'delete':c);
  return replyText(sock,jid,`✅ Anti-link *${c.toUpperCase()}*`,msg);
}};
