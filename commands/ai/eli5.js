const config=require('../../config'); const {replyText}=require('../../helpers/reply');
module.exports={name:"eli5",aliases:["explique","simple"],category:"ai",description:"Explique simplement — .eli5 <sujet>",minRank:'C',dailyLimit:true,
async execute(sock,msg,args){
  const jid=msg.key.remoteJid, topic=args.join(' ').trim();
  if(!topic) return replyText(sock,jid,"🧒 Ex: `.eli5 la blockchain`",msg);
  if(!config.groq?.apiKey||config.groq.apiKey==='TA_CLE_GROQ_ICI') return replyText(sock,jid,"⚠️ groq.apiKey requis",msg);
  await replyText(sock,jid,"🧒 Explication…",msg);
  try{
    const res=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",
      headers:{"Authorization":`Bearer ${config.groq.apiKey}`,"Content-Type":"application/json"},
      body:JSON.stringify({model:config.groq.model||"llama-3.3-70b-versatile",
        messages:[{role:"system",content:"Explique simplement, comme à un enfant de 10 ans. Français + analogies."},{role:"user",content:`Explique: ${topic}`}],
        max_tokens:800,temperature:0.6})});
    const data=await res.json(); return replyText(sock,jid,`🧒 *${topic}*\n\n${data.choices?.[0]?.message?.content||'Échec.'}`,msg);
  }catch{return replyText(sock,jid,"❌ Erreur.",msg);}
}};
