const {replyText}=require('../../helpers/reply'); const fs=require('fs'),path=require('path');
const WF=path.join(__dirname,'../../data/warnings.json');
module.exports={name:"warnings",aliases:["warns"],category:"moderation",description:"Voir warns — .warnings @user",
async execute(sock,msg){
  const jid=msg.key.remoteJid; if(!jid.endsWith('@g.us'))return replyText(sock,jid,"Groupe only.",msg);
  const m=msg.message?.extendedTextMessage?.contextInfo?.mentionedJid||[];
  const t=m[0]||msg.key.participant||msg.key.remoteJid;
  let w={}; try{w=JSON.parse(fs.readFileSync(WF,'utf8'));}catch{}
  const c=w[jid]?.[t]||0, n=t.replace(/@.*$/,'').split(':')[0];
  return replyText(sock,jid,`⚠️ @${n} a *${c}* warn(s).`,msg,[t]);
}};
