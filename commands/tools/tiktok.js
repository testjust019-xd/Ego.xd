const { replyText } = require('../../helpers/reply');
const { downloadVideo } = require('../../lib/videoDownloader');
module.exports = {
  name: "tiktok", aliases: ["tt","tiktokdl"], category: "tools",
  description: "Télécharge TikTok — .tiktok <lien>", minRank:'E', dailyLimit:true,
  async execute(sock,msg,args){
    const jid=msg.key.remoteJid;
    const url=args.find(a=>/tiktok\.com|vm\.tiktok|vt\.tiktok|douyin/.test(a))||args[0];
    if(!url||!/tiktok|douyin/.test(url)) return replyText(sock,jid,"❌ Lien TikTok valide requis.\nEx: `.tiktok https://vm.tiktok.com/xxxxx`",msg);
    await replyText(sock,jid,"⬇️ *TikTok* — téléchargement…",msg);
    try{
      const buffer=await downloadVideo(url,40);
      if(!buffer||buffer.length<1000) return replyText(sock,jid,"❌ Impossible (privé / trop lourd).",msg);
      await sock.sendMessage(jid,{video:buffer,mimetype:'video/mp4',caption:'✅ *TikTok*\n_EGO.XD_'},{quoted:msg});
    }catch(e){ console.error('[tiktok]',e.message); return replyText(sock,jid,`❌ ${e.message?.slice(0,100)||'Erreur'}`,msg); }
  }
};
