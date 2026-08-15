const {replyText}=require('../../helpers/reply'); const {isSenderAdmin}=require('../../lib/groupHelpers');
const fs=require('fs'),path=require('path'); const WF=path.join(__dirname,'../../data/warnings.json');
module.exports={name:"resetwarn",aliases:["unwarn","clearwarn"],category:"moderation",description:"Reset warns — .resetwarn @user",
async execute(sock,msg){
  const jid=msg.key.remoteJid; if(!jid.endsWith('@g.us'))return replyText(sock,jid,"Groupe only.",msg);
  if(!(await isSenderAdmin(sock,jid,msg)))return replyText(sock,jid,"Admins only.",msg);
  const m=msg.message?.extendedTextMessage?.contextInfo?.mentionedJid||[];
  if(!m.length)return replyText(sock,jid,"Mentionne quelqu'un.",msg);
  const t=m[0]; let w={}; try{w=JSON.parse(fs.readFileSync(WF,'utf8'));}catch{}
  if(w[jid])delete w[jid][t]; fs.writeFileSync(WF,JSON.stringify(w,null,2));
  return replyText(sock,jid,`✅ Warns de @${t.replace(/@.*$/,'').split(':')[0]} reset.`,msg,[t]);
}};
