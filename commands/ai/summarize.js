const config=require('../../config'); const {replyText}=require('../../helpers/reply');
module.exports={name:"summarize",aliases:["resume2","sum","resumer"],category:"ai",description:"Résume un texte — .summarize <texte>",minRank:'C',dailyLimit:true,
async execute(sock,msg,args){
  const jid=msg.key.remoteJid,t=args.join(' ').trim();
  if(!t||t.length<50) return replyText(sock,jid,"📝 Texte trop court.",msg);
  if(!config.groq?.apiKey||config.groq.apiKey==='TA_CLE_GROQ_ICI') return replyText(sock,jid,"⚠️ groq.apiKey requis",msg);
  await replyText(sock,jid,"📝 Résumé…",msg);
  try{
    const res=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",
      headers:{"Authorization":`Bearer ${config.groq.apiKey}`,"Content-Type":"application/json"},
      body:JSON.stringify({model:config.groq.model||"llama-3.3-70b-versatile",
        messages:[{role:"system",content:"Résume en français, clair et concis."},{role:"user",content:`Résume:\n${t.slice(0,6000)}`}],
        max_tokens:800,temperature:0.4})});
    const data=await res.json(); return replyText(sock,jid,`📝 *Résumé*\n\n${data.choices?.[0]?.message?.content||'Échec.'}`,msg);
  }catch{return replyText(sock,jid,"❌ Erreur.",msg);}
}};
