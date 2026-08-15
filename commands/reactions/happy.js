const { replyImage } = require('../../helpers/reply');
module.exports = { name:"happy", category:"reactions", description:"happy (image)",
  async execute(sock,msg){ try{ const r=await fetch("https://api.waifu.pics/sfw/happy"); const d=await r.json();
    return replyImage(sock,msg.key.remoteJid,{url:d.url},"😄",msg); }catch{ return sock.sendMessage(msg.key.remoteJid,{text:"Erreur"},{quoted:msg}); } } };
