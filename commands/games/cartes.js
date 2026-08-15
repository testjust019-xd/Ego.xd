const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { getUser, updateUser } = require('../../lib/database');
const cards = require('../../lib/cardEngine');
const { createGameLink } = require('../../helpers/gameWeb');

const lastPack = new Map();

module.exports = {
  name: 'cartes',
  category: 'games',
  description: 'Collection de cartes — .cartes / pack / vendre / album',

  minRank: 'E',
  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);
    const user = getUser(senderJid);
    const collection = Array.isArray(user.cards) ? user.cards : [];

    const sub = (args[0] || '').toLowerCase();

    // ─── Ouvrir un pack ───
    if (sub === 'pack' || sub === 'ouvrir') {
      const now = Date.now();
      if (now - (lastPack.get(senderJid) || 0) < cards.PACK_COOLDOWN_MS) {
        const sec = Math.ceil((cards.PACK_COOLDOWN_MS - (now - lastPack.get(senderJid))) / 1000);
        return replyText(sock, jid, `⏳ Prochain pack dans ${sec}s.`, msg);
      }
      if ((user.balance || 0) < cards.PACK_COST) {
        return replyText(sock, jid,
          `💸 Un pack coûte *${cards.PACK_COST} pts* (tu as ${user.balance || 0}).\nGagne des points avec .daily / .work / .loterie`,
          msg
        );
      }

      const opened = cards.openPack();
      const newCards = [...collection, ...opened];
      updateUser(senderJid, {
        balance: (user.balance || 0) - cards.PACK_COST,
        cards: newCards
      });
      lastPack.set(senderJid, now);

      let text = `🎴 *Pack ouvert !* (-${cards.PACK_COST} pts)\n\n`;
      opened.forEach((c, i) => {
        text += cards.formatCard(c, i + 1) + '\n';
      });
      text += `\n📦 Collection : ${newCards.length} cartes\n💰 Solde : ${(user.balance || 0) - cards.PACK_COST} pts`;
      text += `\n\nVends avec \`.cartes vendre <n°>\` (voir \`.cartes\`)`;
      return replyText(sock, jid, text, msg);
    }

    // ─── Vendre une carte ───
    if (sub === 'vendre' || sub === 'sell') {
      const index = parseInt(args[1], 10) - 1;
      if (isNaN(index) || index < 0 || index >= collection.length) {
        return replyText(sock, jid,
          `Utilisation : \`.cartes vendre <n°>\`\nRegarde ta collection avec \`.cartes\` (1-${collection.length || 0}).`,
          msg
        );
      }
      const card = collection[index];
      const price = cards.sellPrice(card);
      const newCollection = collection.filter((_, i) => i !== index);
      const newBal = (user.balance || 0) + price;
      updateUser(senderJid, { balance: newBal, cards: newCollection });

      const meta = cards.RARITIES[card.rarity];
      return replyText(sock, jid,
        `💰 Carte vendue : ${meta.emoji} *${card.name}*\n+${price} pts\n` +
        `📦 Reste ${newCollection.length} cartes · Solde ${newBal} pts`,
        msg
      );
    }

    // ─── Vendre toutes les communes ───
    if (sub === 'vendtout' || sub === 'sellall') {
      const rarityFilter = (args[1] || 'common').toLowerCase();
      const key = ['common', 'rare', 'epic', 'legendary'].includes(rarityFilter)
        ? rarityFilter
        : (rarityFilter === 'commun' ? 'common' : rarityFilter === 'epique' ? 'epic' : 'common');

      const toSell = collection.filter(c => c.rarity === key);
      if (!toSell.length) {
        return replyText(sock, jid, `Aucune carte ${cards.RARITIES[key]?.label || key} à vendre.`, msg);
      }
      const gain = toSell.reduce((s, c) => s + cards.sellPrice(c), 0);
      const kept = collection.filter(c => c.rarity !== key);
      const newBal = (user.balance || 0) + gain;
      updateUser(senderJid, { balance: newBal, cards: kept });
      return replyText(sock, jid,
        `💰 ${toSell.length} carte(s) *${cards.RARITIES[key].label}* vendues → +${gain} pts\n` +
        `📦 Reste ${kept.length} · Solde ${newBal}`,
        msg
      );
    }

    // ─── Album / stats ───
    if (sub === 'album' || sub === 'stats') {
      const stats = cards.collectionStats(collection);
      const unique = new Set(collection.map(c => c.id)).size;
      const total = cards.CARD_POOL.length;
      let text = `📕 *Album*\nCartes : ${collection.length} (${unique}/${total} uniques)\n\n`;
      for (const [key, meta] of Object.entries(cards.RARITIES)) {
        text += `${meta.emoji} ${meta.label} : ${stats[key] || 0}\n`;
      }
      text += `\nPack : \`.cartes pack\` (${cards.PACK_COST} pts, ${cards.PACK_SIZE} cartes)`;
      return replyText(sock, jid, text, msg);
    }

    // ─── Liste collection ───
    if (!sub || sub === 'liste' || sub === 'collection') {
      if (!collection.length) {
        return replyText(sock, jid,
          `🎴 *Collection vide*\nOuvre un pack : \`.cartes pack\` (${cards.PACK_COST} pts)\n` +
          `Autres : \`.cartes album\` · \`.cartes vendre <n>\` · \`.cartes vendtout common\``,
          msg
        );
      }

      // tri rareté puis nom
      const order = { legendary: 0, epic: 1, rare: 2, common: 3 };
      const sorted = collection
        .map((c, i) => ({ ...c, _i: i }))
        .sort((a, b) => (order[a.rarity] - order[b.rarity]) || a.name.localeCompare(b.name));

      let text = `🎴 *Ta collection* (${collection.length})\n💰 ${user.balance || 0} pts\n\n`;
      // afficher avec index ORIGINAL pour vendre
      collection.forEach((c, i) => {
        text += cards.formatCard(c, i + 1) + '\n';
      });
      if (text.length > 3500) {
        text = text.slice(0, 3400) + '\n…\n(utilise `.cartes album` pour le résumé)';
      }
      text += `\n\`.cartes pack\` · \`.cartes vendre <n°>\` · \`.cartes vendtout common\``;

      const { links } = createGameLink({
      chatJid: jid,
        type: 'cards',
        minRank: 'E',
        players: [{ jid: senderJid, role: 'p1' }],
        ttlMs: 60 * 60 * 1000,
        state: {
          title: 'Ta collection',
          cards: sorted.map(c => ({ name: c.name, rarity: cards.RARITIES[c.rarity]?.label, emoji: cards.RARITIES[c.rarity]?.emoji }))
        }
      });
      text += `\n🔗 Voir l'album en visuel : ${links.p1}`;

      return replyText(sock, jid, text, msg);
    }

    return replyText(sock, jid,
      'Utilisation :\n' +
      '• `.cartes` — collection\n' +
      '• `.cartes pack` — ouvrir un pack\n' +
      '• `.cartes vendre <n°>` — vendre une carte\n' +
      '• `.cartes vendtout common` — vendre toutes les communes\n' +
      '• `.cartes album` — stats',
      msg
    );
  }
};
