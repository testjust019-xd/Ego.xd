const {replyText}=require('../../helpers/reply'); const {isSenderAdmin}=require('../../lib/groupHelpers');
const fs=require('fs'),path=require('path'); const WF=path.join(__dirname,'../../data/warnings.json');
function load(){try{return JSON.parse(fs.readFileSync(WF,'utf8'));}catch{return{};}}
function save(d){fs.writeFileSync(WF,JSON.stringify(d,null,2));}
module.exports={name:"warn",category:"moderation",description:"Avertir — .warn @user [raison]",
async execute(sock,msg,args){
  const jid=msg.key.remoteJid; if(!jid.endsWith('@g.us'))return replyText(sock,jid,"Groupe only.",msg);
  if(!(await isSenderAdmin(sock,jid,msg)))return replyText(sock,jid,"Admins only.",msg);
  const m=msg.message?.extendedTextMessage?.contextInfo?.mentionedJid||[];
  if(!m.length)return replyText(sock,jid,".warn @user raison",msg);
  const t=m[0], reason=args.filter(a=>!a.startsWith('@')).join(' ')||'Aucune';
  const w=load(); if(!w[jid])w[jid]={}; if(!w[jid][t])w[jid][t]=0; w[jid][t]++; save(w);
  const n=t.replace(/@.*$/,'').split(':')[0], c=w[jid][t];
  return replyText(sock,jid,`⚠️ *WARN* @${n}\nRaison: ${reason}\nTotal: *${c}/3*${c>=3?'\n🚨 Kick recommandé':''}`,msg,[t]);
}};
