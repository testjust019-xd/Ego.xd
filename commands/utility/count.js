const {replyText}=require('../../helpers/reply');
module.exports={name:"count",category:"utility",description:"Compte carac/mots",
async execute(s,m,a){const t=a.join(' ');if(!t)return replyText(s,m.key.remoteJid,"Ex: .count hi",m);
return replyText(s,m.key.remoteJid,`📊 ${t.length} carac | ${t.replace(/\s/g,'').length} sans espace | ${t.trim().split(/\s+/).length} mots`,m);}};
