const config=require('../../config'); const {replyText}=require('../../helpers/reply');
module.exports={name:"code",aliases:["coding","dev"],category:"ai",description:"Génère/corrige du code — .code <demande>",minRank:'C',dailyLimit:true,
async execute(sock,msg,args){
  const jid=msg.key.remoteJid,p=args.join(' ').trim();
  if(!p) return replyText(sock,jid,"💻 Ex: `.code tri rapide en JS`",msg);
  if(!config.groq?.apiKey||config.groq.apiKey==='TA_CLE_GROQ_ICI') return replyText(sock,jid,"⚠️ groq.apiKey requis",msg);
  await replyText(sock,jid,"💻 Code…",msg);
  try{
    const res=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",
      headers:{"Authorization":`Bearer ${config.groq.apiKey}`,"Content-Type":"application/json"},
      body:JSON.stringify({model:config.groq.model||"llama-3.3-70b-versatile",
        messages:[{role:"system",content:"Expert dev. Français. Code propre + explication courte."},{role:"user",content:p.slice(0,6000)}],
        max_tokens:2500,temperature:0.3})});
    const data=await res.json(); let a=data.choices?.[0]?.message?.content||"Échec.";
    if(a.length>4000)a=a.slice(0,3900)+"..."; return replyText(sock,jid,a,msg);
  }catch{return replyText(sock,jid,"❌ Erreur.",msg);}
}};
