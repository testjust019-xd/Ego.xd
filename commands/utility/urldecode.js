const {replyText}=require('../../helpers/reply');
module.exports={name:"urldecode",category:"utility",description:"Decode URL",
async execute(s,m,a){const t=a.join(' ');if(!t)return replyText(s,m.key.remoteJid,"Ex: .urldecode hi%20",m);
try{return replyText(s,m.key.remoteJid,"🔓 "+decodeURIComponent(t),m);}catch{return replyText(s,m.key.remoteJid,"Fail",m);}}};
