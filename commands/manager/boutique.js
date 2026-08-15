const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const managerDB = require('../../lib/managerDB');
const engine = require('../../lib/managerEngine');

module.exports = {
  name: 'boutique',
  category: 'manager',
  description: 'Boutique du club — .boutique / .boutique acheter <id>',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);
    const club = managerDB.getClub(senderJid);

    if (!club) {
      return replyText(sock, jid, "Tu n'as pas encore de club. Tape .club <nom>.", msg);
    }

    const sub = (args[0] || '').toLowerCase();
    const items = engine.SHOP_ITEMS;

    if (!sub || sub === 'liste') {
      let text = `🛒 *Boutique Manager*\nBudget : ${club.budget.toLocaleString('fr-FR')} €\n\n`;
      Object.values(items).forEach((it, i) => {
        text += `*${it.id}*\n${it.name} — ${it.price.toLocaleString('fr-FR')} €\n_${it.desc}_\n\n`;
      });
      text += 'Achète avec : `.boutique acheter <id>`\nEx: `.boutique acheter boost_moral`';
      const inv = club.inventory || {};
      const keys = Object.keys(inv).filter(k => inv[k] > 0);
      if (keys.length) {
        text += '\n\n*Inventaire*\n';
        keys.forEach(k => { text += `• ${items[k]?.name || k} x${inv[k]}\n`; });
      }
      return replyText(sock, jid, text, msg);
    }

    if (sub === 'acheter') {
      const id = (args[1] || '').toLowerCase();
      const item = items[id];
      if (!item) {
        return replyText(sock, jid, `Article inconnu. IDs : ${Object.keys(items).join(', ')}`, msg);
      }
      if (club.budget < item.price) {
        return replyText(sock, jid, `💸 Il te faut ${item.price.toLocaleString('fr-FR')} € (tu as ${club.budget.toLocaleString('fr-FR')} €).`, msg);
      }

      let updates = { budget: club.budget - item.price };
      let resultMsg = '';

      if (item.id === 'boost_moral') {
        const squad = club.squad.map(p => ({ ...p, morale: engine.clamp((p.morale || 70) + 15, 0, 100) }));
        updates.squad = squad;
        resultMsg = '💪 Moral de tout l\'effectif +15 !';
      } else if (item.id === 'scout_jeune') {
        const gen = engine.generatePlayer(engine.randInt(55, 68));
        // forcer profil jeune
        gen.age = engine.randInt(17, 21);
        gen.potential = engine.clamp(gen.rating + engine.randInt(10, 22), gen.rating, 95);
        gen.price = engine.calcPlayerValue(gen);
        gen.morale = 80;
        updates.squad = [...club.squad, gen];
        resultMsg = `🌟 Jeune recruté : *${gen.name}* — ${gen.pos} ${gen.rating} OVR (pot. ${gen.potential}) • ${gen.age} ans`;
      } else if (item.id === 'medecin') {
        updates.lastTrain = 0;
        updates.lastMatch = 0;
        updates.lastPvp = 0;
        resultMsg = '🏥 Cooldowns match / entraînement / PvP réinitialisés !';
      } else if (item.id === 'boost_rep') {
        updates.reputation = engine.clamp((club.reputation || 50) + 5, 0, 100);
        resultMsg = `📢 Réputation : ${updates.reputation}/100`;
      } else if (item.id === 'agent') {
        let market = engine.refreshMarketIfNeeded(managerDB.getMarket());
        const star = engine.generatePlayer(engine.randInt(75, 85));
        market.players.unshift(star);
        if (market.players.length > 8) market.players.pop();
        managerDB.setMarket(market);
        resultMsg = `🕵️ Agent star : *${star.name}* (${star.rating} OVR) est apparu sur .marche !`;
      } else if (item.type === 'consumable') {
        const inv = { ...(club.inventory || {}) };
        inv[item.id] = (inv[item.id] || 0) + 1;
        updates.inventory = inv;
        resultMsg = `📦 *${item.name}* ajouté à l'inventaire (x${inv[item.id]}).\nUtilisé automatiquement au prochain moment opportun.`;
      } else {
        resultMsg = `✅ *${item.name}* acheté.`;
      }

      managerDB.updateClub(senderJid, updates);
      return replyText(sock, jid,
        `${resultMsg}\n💰 -${item.price.toLocaleString('fr-FR')} € (reste ${(club.budget - item.price).toLocaleString('fr-FR')} €)`,
        msg
      );
    }

    return replyText(sock, jid, 'Utilisation : .boutique | .boutique acheter <id>', msg);
  }
};
