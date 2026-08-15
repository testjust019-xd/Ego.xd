const config=require('../../config'); const {replyText}=require('../../helpers/reply');
const {getActiveTheme,listThemes}=require('../../lib/themeManager');
module.exports={name:"themes",aliases:["listthemes"],category:"general",description:"Liste les thèmes — .themes",
async execute(sock,msg){
  const cur=getActiveTheme(); let t=`🎨 *Thèmes*\nActuel: *${cur.displayName||cur.name}*\n━━━━━━━━━━━━━━━━\n\n`;
  for(const n of listThemes()){ const th=config.themes[n]||{}; t+=`• \`${n}\` — ${th.displayName||n}${n===(cur.name||'')?' ← actif':''}\n`; }
  t+=`\nChanger: \`.settheme <nom>\` (owner)`;
  return replyText(sock,msg.key.remoteJid,t,msg);
}};
