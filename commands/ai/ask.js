const config = require('../../config');
const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
module.exports = {
  name:"ask", aliases:["question","demande","q"], category:"ai",
  description:"Question IA (Groq→Gemini) — .ask <question>", minRank:'C', dailyLimit:true,
  async execute(sock,msg,args){
    const jid=msg.key.remoteJid, q=args.join(' ').trim();
    if(!q) return replyText(sock,jid,"🧠 Ex: `.ask explique le freestyle`",msg);
    const hasGroq=config.groq?.apiKey&&config.groq.apiKey!=='TA_CLE_GROQ_ICI';
    const hasGemini=config.gemini?.apiKey&&config.gemini.apiKey!=='TA_CLE_GEMINI_ICI';
    if(!hasGroq&&!hasGemini) return replyText(sock,jid,"⚠️ Configure groq.apiKey ou gemini.apiKey dans config.js",msg);
    await replyText(sock,jid,"🧠 Réflexion…",msg);
    try{
      let answer=null;
      if(hasGroq){
        const res=await fetch("https://api.groq.com/openai/v1/chat/completions",{
          method:"POST", headers:{"Authorization":`Bearer ${config.groq.apiKey}`,"Content-Type":"application/json"},
          body:JSON.stringify({model:config.groq.model||"llama-3.3-70b-versatile",
            messages:[{role:"system",content:`Assistant du bot ${config.botName||'EGO.XD'}. Réponds en français, clair et utile.`},{role:"user",content:q.slice(0,7000)}],
            max_tokens:2000, temperature:0.7})});
        const data=await res.json(); answer=data.choices?.[0]?.message?.content;
      }
      if(!answer&&hasGemini){
        const {chatCompletion}=require('../../lib/aiHelper');
        answer=await chatCompletion({provider:'gemini',senderJid:getSenderJid(sock,msg),system:`Assistant ${config.botName||'EGO.XD'}. Français.`,user:q.slice(0,8000),max_tokens:2500});
      }
      if(!answer) return replyText(sock,jid,"❌ Pas de réponse.",msg);
      if(answer.length>4000) answer=answer.slice(0,3900)+"\n\n_[tronqué]_";
      return replyText(sock,jid,answer,msg);
    }catch(e){ console.error('[ask]',e); return replyText(sock,jid,"❌ Erreur IA.",msg); }
  }
};
