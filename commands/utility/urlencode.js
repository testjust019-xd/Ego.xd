const {replyText}=require('../../helpers/reply');
module.exports={name:"urlencode",category:"utility",description:"Encode URL",
async execute(s,m,a){const t=a.join(' ');if(!t)return replyText(s,m.key.remoteJid,"Ex: .urlencode hi",m);
return replyText(s,m.key.remoteJid,"🔗 `"+encodeURIComponent(t)+"`",m);}};
