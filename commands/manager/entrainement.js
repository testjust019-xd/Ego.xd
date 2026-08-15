const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const managerDB = require('../../lib/managerDB');
const engine = require('../../lib/managerEngine');

module.exports = {
  name: "entrainement",
  category: "manager",
  description: "Entraîne ton équipe pour progresser — .entrainement",

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);
    const club = managerDB.getClub(senderJid);

    if (!club) {
      return replyText(sock, jid, "Tu n'as pas encore de club. Tape .club <nom> pour en créer un.", msg);
    }

    const now = Date.now();
    if (now - club.lastTrain < engine.TRAIN_COOLDOWN_MS) {
      const remaining = engine.TRAIN_COOLDOWN_MS - (now - club.lastTrain);
      const minutes = Math.ceil(remaining / 60000);
      return replyText(sock, jid, `⏳ Équipe encore fatiguée. Reviens dans ${minutes} min.`, msg);
    }

    const inv = { ...(club.inventory || {}) };
    const freeTrain = (inv.boost_train || 0) > 0;
    const cost = freeTrain ? 0 : engine.TRAIN_COST;

    if (club.budget < cost) {
      return replyText(sock, jid, `💸 Il te faut ${engine.TRAIN_COST.toLocaleString('fr-FR')} € pour organiser une session d'entraînement.`, msg);
    }

    let squad = club.squad.map(p => ({ ...p }));
    let trained = engine.trainSquad(squad);
    // Staff d'entraînement : second passage (gains x2 effet)
    if (freeTrain) {
      const extra = engine.trainSquad(squad);
      const map = new Map(trained.map(t => [t.name, t.gain]));
      for (const t of extra) map.set(t.name, (map.get(t.name) || 0) + t.gain);
      trained = [...map.entries()].map(([name, gain]) => ({ name, gain }));
      inv.boost_train -= 1;
      if (inv.boost_train <= 0) delete inv.boost_train;
    }

    managerDB.updateClub(senderJid, {
      budget: club.budget - cost,
      squad,
      inventory: inv,
      lastTrain: now
    });

    if (!trained.length) {
      const costLine = freeTrain ? "🎁 Staff d'entraînement utilisé" : `💰 -${engine.TRAIN_COST.toLocaleString('fr-FR')} €`;
      return replyText(sock, jid, `🏋️ Séance terminée, mais tes joueurs sont déjà au max de leur potentiel actuel.\n${costLine}`, msg);
    }

    let text = `🏋️ *Séance d'entraînement terminée*\n\n`;
    trained.forEach(t => { text += `📈 ${t.name} +${t.gain} OVR\n`; });
    text += freeTrain ? '\n🎁 Staff d\'entraînement utilisé (gains boostés)' : `\n💰 -${engine.TRAIN_COST.toLocaleString('fr-FR')} €`;

    return replyText(sock, jid, text, msg);
  }
};
