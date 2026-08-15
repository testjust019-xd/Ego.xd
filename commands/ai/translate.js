const {replyText}=require('../../helpers/reply');
module.exports={name:"tr",aliases:["trad","translate","traduire"],category:"ai",description:"Traduction — .tr <texte> ou .tr fr|en <texte>",dailyLimit:true,
async execute(sock,msg,args){
  const jid=msg.key.remoteJid; if(!args.length) return replyText(sock,jid,"🌐 Ex: `.tr Hello` ou `.tr fr|en Bonjour`",msg);
  let langpair="en|fr", text=args.join(' ');
  if(args[0]&&/^[a-z]{2}\|[a-z]{2}$/i.test(args[0])){ langpair=args[0].toLowerCase(); text=args.slice(1).join(' '); }
  if(!text) return replyText(sock,jid,"Donne un texte.",msg);
  try{
    const res=await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0,500))}&langpair=${langpair}`);
    const data=await res.json(); const t=data.responseData?.translatedText;
    if(!t) return replyText(sock,jid,"❌ Échec.",msg);
    return replyText(sock,jid,`🌐 *${langpair}*\n${t}`,msg);
  }catch{return replyText(sock,jid,"❌ Erreur.",msg);}
}};
