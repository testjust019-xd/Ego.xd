const { replyImage } = require('../../helpers/reply');
module.exports = { name:"cuddle", category:"reactions", description:"cuddle (image)",
  async execute(sock,msg){ try{ const r=await fetch("https://api.waifu.pics/sfw/cuddle"); const d=await r.json();
    return replyImage(sock,msg.key.remoteJid,{url:d.url},"🥰",msg); }catch{ return sock.sendMessage(msg.key.remoteJid,{text:"Erreur"},{quoted:msg}); } } };
