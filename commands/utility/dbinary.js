const {replyText}=require('../../helpers/reply');
module.exports={name:"dbinary",category:"utility",description:"Binaire→Texte",
async execute(s,m,a){const b=a.join(' ').trim();if(!b)return replyText(s,m.key.remoteJid,"Ex: .dbinary 0110",m);
try{return replyText(s,m.key.remoteJid,"🔓 "+b.split(' ').map(x=>String.fromCharCode(parseInt(x,2))).join(''),m);}catch{return replyText(s,m.key.remoteJid,"Invalide",m);}}};
