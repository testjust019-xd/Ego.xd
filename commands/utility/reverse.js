const {replyText}=require('../../helpers/reply');
module.exports={name:"reverse",category:"utility",description:"Inverse texte",
async execute(s,m,a){const t=a.join(' ');if(!t)return replyText(s,m.key.remoteJid,"Ex: .reverse hi",m);
return replyText(s,m.key.remoteJid,"🔄 "+t.split('').reverse().join(''),m);}};
