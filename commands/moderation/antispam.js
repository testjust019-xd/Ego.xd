const {replyText}=require('../../helpers/reply'); const {isSenderAdmin}=require('../../lib/groupHelpers');
const {getGroupSettings,setGroupSetting}=require('../../lib/groupSettings');
module.exports={name:"antispam",category:"moderation",description:"Anti-spam — .antispam on/off",
async execute(sock,msg,args){
  const jid=msg.key.remoteJid; if(!jid.endsWith('@g.us'))return replyText(sock,jid,"Groupe only.",msg);
  if(!(await isSenderAdmin(sock,jid,msg)))return replyText(sock,jid,"Admins only.",msg);
  const c=(args[0]||'').toLowerCase();
  if(c!=='on'&&c!=='off')return replyText(sock,jid,`🚫 Anti-Spam: ${getGroupSettings(jid).antispam?'ON':'OFF'}\n.antispam on/off`,msg);
  setGroupSetting(jid,'antispam',c==='on'); return replyText(sock,jid,`✅ Anti-spam ${c}`,msg);
}};
