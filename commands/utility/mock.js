const {replyText}=require('../../helpers/reply');
module.exports={name:"mock",category:"utility",description:"Mock text",
async execute(s,m,a){const t=a.join(' ');if(!t)return replyText(s,m.key.remoteJid,"Ex: .mock hi",m);
return replyText(s,m.key.remoteJid,t.split('').map((c,i)=>i%2?c.toUpperCase():c.toLowerCase()).join(''),m);}};
