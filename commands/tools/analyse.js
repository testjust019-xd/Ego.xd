const { replyText } = require('../../helpers/reply');
const { execFile } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');
const execFileAsync = util.promisify(execFile);

async function getUrlMetadata(url) {
  try {
    const { stdout } = await execFileAsync('yt-dlp', ['--dump-json','--no-download','--no-playlist', url], { timeout: 25000 });
    return JSON.parse(stdout);
  } catch { return null; }
}
function fmt(n){ if(n==null)return '?'; n=Number(n); if(n>=1e9)return(n/1e9).toFixed(1)+'B'; if(n>=1e6)return(n/1e6).toFixed(1)+'M'; if(n>=1e3)return(n/1e3).toFixed(1)+'K'; return String(n); }
function fmtDate(ts){ if(!ts)return '?'; try{ return new Date(ts*1000).toLocaleDateString('fr-FR',{year:'numeric',month:'long',day:'numeric'}); }catch{return '?';} }

module.exports = {
  name: "analyse", aliases: ["analyze","videoinfo","mediainfo","info"], category: "tools",
  description: "Analyse vidéo (lien OU répondre à une vidéo) — .analyse [lien]", dailyLimit:true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const url = args.find(a => /^https?:\/\//.test(a));

    if (url) {
      await replyText(sock, jid, "🔍 Analyse du lien…", msg);
      const meta = await getUrlMetadata(url);
      if (!meta) return replyText(sock, jid, "❌ Impossible d'analyser ce lien.", msg);
      const text = `📊 *Analyse Médias*\n━━━━━━━━━━━━━━━━\n📌 *Titre:* ${meta.title||'?'}\n👤 *Auteur:* ${meta.uploader||meta.channel||meta.creator||'?'}\n📅 *Publié:* ${fmtDate(meta.timestamp||meta.release_timestamp)}\n👁 *Vues:* ${fmt(meta.view_count)}\n❤️ *Likes:* ${fmt(meta.like_count)}\n💬 *Commentaires:* ${fmt(meta.comment_count)}\n⏱ *Durée:* ${meta.duration?Math.floor(meta.duration/60)+'m '+Math.floor(meta.duration%60)+'s':'?'}\n📐 *Résolution:* ${meta.width&&meta.height?meta.width+'x'+meta.height:'?'}\n🏷 *Plateforme:* ${meta.extractor||meta.extractor_key||'?'}\n🔗 ${meta.webpage_url||url}\n━━━━━━━━━━━━━━━━\n_EGO.XD_`;
      return replyText(sock, jid, text, msg);
    }

    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const videoMsg = quoted?.videoMessage || msg.message?.videoMessage;
    if (!videoMsg) return replyText(sock, jid, "❌ Réponds à une *vidéo* ou donne un *lien* :\n`.analyse` (sur une vidéo)\n`.analyse https://...`", msg);

    await replyText(sock, jid, "🔍 Analyse technique…", msg);
    const tempFile = path.join(os.tmpdir(), `analyse_${Date.now()}.mp4`);
    try {
      let buffer;
      try {
        const dl = await sock.downloadMediaMessage({
          key: msg.message?.extendedTextMessage?.contextInfo
            ? { remoteJid:jid, id:msg.message.extendedTextMessage.contextInfo.stanzaId, participant:msg.message.extendedTextMessage.contextInfo.participant }
            : msg.key,
          message: quoted || msg.message
        });
        if (Buffer.isBuffer(dl)) buffer = dl;
        else if (dl && typeof dl[Symbol.asyncIterator]==='function') {
          const chunks=[]; for await (const c of dl) chunks.push(c); buffer=Buffer.concat(chunks);
        }
      } catch(e){ console.error('[analyse dl]', e.message); }
      if (!Buffer.isBuffer(buffer) || buffer.length < 500)
        return replyText(sock, jid, "❌ Impossible de récupérer la vidéo.", msg);
      fs.writeFileSync(tempFile, buffer);
      let info={};
      try {
        const { stdout } = await execFileAsync('ffprobe', ['-v','quiet','-print_format','json','-show_format','-show_streams', tempFile]);
        info = JSON.parse(stdout);
      } catch {
        const stats=fs.statSync(tempFile);
        return replyText(sock,jid,`📊 Taille: ${(stats.size/1024/1024).toFixed(2)} Mo\n_Installe ffprobe pour plus_`,msg);
      }
      const format=info.format||{}, vs=(info.streams||[]).find(s=>s.codec_type==='video')||{}, as=(info.streams||[]).find(s=>s.codec_type==='audio')||{};
      const duration=parseFloat(format.duration||0);
      const sizeMB=(parseInt(format.size||buffer.length)/1024/1024).toFixed(2);
      const bitrate=format.bit_rate?Math.round(parseInt(format.bit_rate)/1000)+' kb/s':'?';
      const res=vs.width&&vs.height?`${vs.width}x${vs.height}`:'?';
      let fps='?'; try{ if(vs.r_frame_rate) fps=eval(vs.r_frame_rate).toFixed(1);}catch{}
      const text=`📊 *Analyse Technique*\n━━━━━━━━━━━━━━━━\n⏱ Durée: ${Math.floor(duration/60)}m ${Math.floor(duration%60)}s\n📦 Taille: ${sizeMB} Mo\n📐 Résolution: ${res}\n🎞 FPS: ${fps}\n🎥 Codec: ${vs.codec_name||'?'}\n🔊 Audio: ${as.codec_name||'aucun'}\n📶 Bitrate: ${bitrate}\n━━━━━━━━━━━━━━━━\n💡 Vues/likes/date → \`.analyse <lien>\``;
      return replyText(sock, jid, text, msg);
    } catch(e){ console.error('[analyse]',e); return replyText(sock,jid,"❌ Erreur d'analyse.",msg); }
    finally { try{fs.unlinkSync(tempFile);}catch{} }
  }
};
