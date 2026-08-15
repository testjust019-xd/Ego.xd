const config=require('../../config'); const {replyText}=require('../../helpers/reply');
module.exports={name:"story",aliases:["histoire2","conte"],category:"ai",description:"Génère une histoire — .story <thème>",minRank:'C',dailyLimit:true,
async execute(sock,msg,args){
  const jid=msg.key.remoteJid, theme=args.join(' ').trim()||"aventure";
  if(!config.groq?.apiKey||config.groq.apiKey==='TA_CLE_GROQ_ICI') return replyText(sock,jid,"⚠️ groq.apiKey requis",msg);
  await replyText(sock,jid,"📖 Histoire…",msg);
  try{
    const res=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",
      headers:{"Authorization":`Bearer ${config.groq.apiKey}`,"Content-Type":"application/json"},
      body:JSON.stringify({model:config.groq.model||"llama-3.3-70b-versatile",
        messages:[{role:"system",content:"Conteur. Histoires captivantes en français, 300-500 mots."},{role:"user",content:`Histoire sur: ${theme}`}],
        max_tokens:1200,temperature:0.85})});
    const data=await res.json(); let a=data.choices?.[0]?.message?.content||"Échec.";
    if(a.length>4000)a=a.slice(0,3900)+"..."; return replyText(sock,jid,`📖 *${theme}*\n\n${a}`,msg);
  }catch{return replyText(sock,jid,"❌ Erreur.",msg);}
}};
