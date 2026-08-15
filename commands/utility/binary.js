const {replyText}=require('../../helpers/reply');
module.exports={name:"binary",aliases:["bin"],category:"utility",description:"Texte→Binaire",
async execute(s,m,a){const t=a.join(' ');if(!t)return replyText(s,m.key.remoteJid,"Ex: .binary hi",m);
return replyText(s,m.key.remoteJid,`🔢 \`${t.split('').map(c=>c.charCodeAt(0).toString(2).padStart(8,'0')).join(' ')}\``,m);}};
