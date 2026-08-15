const config=require('../../config'); const {replyText}=require('../../helpers/reply'); const {getSenderJid}=require('../../lib/senderUtils');
module.exports={name:"broadcast",aliases:["bc"],category:"general",description:"Owner broadcast — .broadcast <texte>",
async execute(sock,msg,args){
  const jid=msg.key.remoteJid, sender=getSenderJid(sock,msg);
  const number=sender.replace(/@.*$/,'').split(':')[0];
  const isOwner=(config.ownerNumbers||[]).some(n=>number.includes(n)||n.includes(number));
  if(!isOwner) return replyText(sock,jid,"❌ Owner only.",msg);
  const text=args.join(' '); if(!text) return replyText(sock,jid,"Ex: .broadcast Annonce...",msg);
  await replyText(sock,jid,"📢 Broadcast…",msg);
  try{ const groups=await sock.groupFetchAllParticipating(); let ok=0,fail=0;
    for(const g of Object.keys(groups)){ try{ await sock.sendMessage(g,{text:`📢 *Broadcast*\n\n${text}\n\n_— ${config.botName||'EGO.XD'}_`}); ok++; await new Promise(r=>setTimeout(r,800)); }catch{fail++;} }
    return replyText(sock,jid,`✅ OK: ${ok} | Fail: ${fail}`,msg);
  }catch{ return replyText(sock,jid,"Erreur.",msg); }
}};
