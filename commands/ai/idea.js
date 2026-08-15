const config=require('../../config'); const {replyText}=require('../../helpers/reply');
module.exports={name:"idea",aliases:["idee2","brainstorm"],category:"ai",description:"Génère des idées — .idea <sujet>",minRank:'C',dailyLimit:true,
async execute(sock,msg,args){
  const jid=msg.key.remoteJid, topic=args.join(' ').trim();
  if(!topic) return replyText(sock,jid,"💡 Ex: `.idea idées TikTok`",msg);
  if(!config.groq?.apiKey||config.groq.apiKey==='TA_CLE_GROQ_ICI') return replyText(sock,jid,"⚠️ groq.apiKey requis",msg);
  await replyText(sock,jid,"💡 Idées…",msg);
  try{
    const res=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",
      headers:{"Authorization":`Bearer ${config.groq.apiKey}`,"Content-Type":"application/json"},
      body:JSON.stringify({model:config.groq.model||"llama-3.3-70b-versatile",
        messages:[{role:"system",content:"Génère 8-10 idées créatives en français."},{role:"user",content:`Idées pour: ${topic}`}],
        max_tokens:1000,temperature:0.9})});
    const data=await res.json(); return replyText(sock,jid,`💡 *${topic}*\n\n${data.choices?.[0]?.message?.content||'Échec.'}`,msg);
  }catch{return replyText(sock,jid,"❌ Erreur.",msg);}
}};
