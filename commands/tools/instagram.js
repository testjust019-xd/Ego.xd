const { replyText } = require('../../helpers/reply');
const { downloadVideo } = require('../../lib/videoDownloader');
module.exports = {
  name: "instagram", aliases: ["ig","insta","igdl"], category: "tools",
  description: "Télécharge Instagram public — .instagram <lien>", minRank:'E', dailyLimit:true,
  async execute(sock,msg,args){
    const jid=msg.key.remoteJid;
    const url=args.find(a=>/instagram\.com|instagr\.am/.test(a))||args[0];
    if(!url||!/instagr/.test(url)) return replyText(sock,jid,"❌ Lien Instagram public requis.",msg);
    await replyText(sock,jid,"⬇️ *Instagram* — téléchargement…",msg);
    try{
      const buffer=await downloadVideo(url,40);
      if(!buffer||buffer.length<1000) return replyText(sock,jid,"❌ Impossible (privé / expiré).",msg);
      await sock.sendMessage(jid,{video:buffer,mimetype:'video/mp4',caption:'✅ *Instagram*\n_EGO.XD_'},{quoted:msg});
    }catch(e){ return replyText(sock,jid,`❌ ${e.message?.slice(0,100)||'Erreur'}`,msg); }
  }
};
