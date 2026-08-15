const { replyText } = require('../../helpers/reply');
const { isOwner } = require('../../lib/groupHelpers');
const { getSenderJid, digitsOnly } = require('../../lib/senderUtils');
const peopleDB = require('../../lib/peopleDB');
const { createPremiumGroup, getSock } = require('../../lib/groupFactory');
const config = require('../../config');
const { getUserRank, meetsRank } = require('../../lib/rankGate');

function isStaff(msg, sock) {
  if (isOwner(msg, sock)) return true;
  const sender = digitsOnly(getSenderJid(sock, msg));
  return (config.staffNumbers || []).some((n) => digitsOnly(n) === sender);
}

function parseArgs(args) {
  let n = 0;
  let name = null;
  let tag = null;
  let minRank = null;
  const rest = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (/^\d+$/.test(a) && !n) {
      n = parseInt(a, 10);
      continue;
    }
    if (a === '--tag' && args[i + 1]) {
      tag = args[++i].toLowerCase();
      continue;
    }
    if (a === '--minrank' && args[i + 1]) {
      minRank = args[++i];
      continue;
    }
    if (a === '--name' && args[i + 1]) {
      name = args[++i];
      // collect until next --
      while (args[i + 1] && !args[i + 1].startsWith('--')) {
        name += ' ' + args[++i];
      }
      continue;
    }
    rest.push(a);
  }
  if (!name && rest.length) name = rest.join(' ');
  return { n, name, tag, minRank };
}

module.exports = {
  name: 'getgroup',
  aliases: ['gengroup', 'factory'],
  category: 'groups',
  description: 'Crée un groupe premium et ajoute N personnes du pool sur ~24h — .getgroup 50 --tag foot',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const sender = getSenderJid(sock, msg);

    // Rang S+ (ou staff / owner)
    if (!isStaff(msg, sock)) {
      try {
        const rank = getUserRank(sender);
        if (!meetsRank(rank, 'S')) {
          return replyText(sock, jid, '🔒 `.getgroup` réservé *rang S+* (ou staff / owner).\nTon rang : *' + rank + '*', msg);
        }
      } catch {
        return replyText(sock, jid, '🔒 Permission insuffisante.', msg);
      }
    }

    // Limite 4 créations / semaine (getgroup + creategroup)
    const factoryLimit = require('../../lib/factoryLimit');
    const lim = factoryLimit.check(sender, 4);
    if (!lim.ok) {
      return replyText(
        sock,
        jid,
        `⏳ Limite Group Factory : *4 / semaine*.\nDéjà utilisés : *${lim.used}/4*\nRéessai dans ~${lim.retryInHours} h.`,
        msg
      );
    }

    if (!getSock()) {
      return replyText(sock, jid, 'Bot principal pas prêt. Réessaie dans quelques secondes.', msg);
    }

    const { n, name, tag, minRank } = parseArgs(args);
    if (!n || n < 1 || n > 100) {
      return replyText(
        sock,
        jid,
        'Usage : `.getgroup 50`\nOptions : `--tag foot` `--minrank B` `--name "Mon groupe"`\nMax 100. Ajouts étalés ~24 h. Tu entres *admin à la fin*.',
        msg
      );
    }

    const pool = peopleDB.queryPool({
      tag,
      minRank,
      excludeJids: [sender]
    });

    if (!pool.length) {
      return replyText(
        sock,
        jid,
        `Pool vide pour ces filtres.\nLes gens doivent faire \`.optin\` (+ \`.settag\` si filtre tag).\nStats : \`.pool\``,
        msg
      );
    }

    // shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const picked = pool.slice(0, n).map((p) => p.jid);
    const groupName = (name || `EGO Factory ${Date.now().toString(36).slice(-4)}`).slice(0, 60);

    await replyText(
      sock,
      jid,
      `⚙️ *GROUP FACTORY*\nDemande : *${n}*\nPool filtré : *${pool.length}*\nTirés : *${picked.length}*\nNom : *${groupName}*\n\nCréation en cours…`,
      msg
    );

    try {
      const rec = await createPremiumGroup({
        name: groupName,
        creatorJid: sender,
        queueJids: picked,
        immediateJids: [],
        filters: { tag, minRank, requested: n },
        source: 'getgroup',
        durationMs: 24 * 60 * 60 * 1000,
        deferCreator: true,
        batchSize: 2
      });

      factoryLimit.record(sender);
      return replyText(
        sock,
        jid,
        `✅ Groupe lancé (en construction).\nCode : *${rec.inviteCode}*\nFile : ${picked.length} sur ~24 h\nTu seras *admin à la fin* uniquement.\nProgression en DM.\nQuota semaine : *${lim.used + 1}/4*`,
        msg
      );
    } catch (err) {
      console.error('[getgroup]', err);
      return replyText(sock, jid, `Erreur création : ${err.message}`, msg);
    }
  }
};
