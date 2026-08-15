const config=require('../../config'); const {replyText}=require('../../helpers/reply');
module.exports={name:"fullmenu",aliases:["allmenu","listall"],category:"general",description:"Menu complet — .fullmenu",
async execute(sock,msg,args,commands){
  const jid=msg.key.remoteJid; const byCat={};
  for(const cmd of commands.values()){ const c=(cmd.category||'other').toLowerCase(); if(!byCat[c])byCat[c]=[]; byCat[c].push(cmd.name); }
  let text=`╔══ *EGO.XD FULL MENU* ══╗\nv${config.version} · ${commands.size} skills\n\n`;
  for(const [cat,list] of Object.entries(byCat).sort()) text+=`━━━━ ${cat.toUpperCase()} ━━━━\n`+list.sort().map(n=>`◉ ➤ ${n}`).join('\n')+'\n\n';
  text+=`> © EGO.XD`;
  if(text.length>4000){ const mid=text.lastIndexOf('\n',2000); await replyText(sock,jid,text.slice(0,mid),msg); return replyText(sock,jid,text.slice(mid),msg); }
  return replyText(sock,jid,text,msg);
}};
