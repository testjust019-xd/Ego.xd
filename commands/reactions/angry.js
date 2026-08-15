const { replyImage } = require('../../helpers/reply');
module.exports = { name:"angry", category:"reactions", description:"angry (image)",
  async execute(sock,msg){ try{ const r=await fetch("https://api.waifu.pics/sfw/angry"); const d=await r.json();
    return replyImage(sock,msg.key.remoteJid,{url:d.url},"😠",msg); }catch{ return sock.sendMessage(msg.key.remoteJid,{text:"Erreur"},{quoted:msg}); } } };
