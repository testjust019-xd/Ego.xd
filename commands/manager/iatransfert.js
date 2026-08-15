const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const managerDB = require('../../lib/managerDB');
const engine = require('../../lib/managerEngine');
const config = require('../../config');

function localAdvice(club, market, listings) {
  const squad = [...club.squad].sort((a, b) => b.rating - a.rating);
  const byPos = {};
  for (const p of squad) {
    byPos[p.pos] = byPos[p.pos] || [];
    byPos[p.pos].push(p);
  }

  const lines = [];
  lines.push(`📊 *Analyse IA — ${club.name}*`);
  lines.push(`Budget : ${club.budget.toLocaleString('fr-FR')} € · Effectif : ${squad.length} · Force ~${Math.round(engine.calcClubPower(club))}/100\n`);

  // postes faibles
  const need = [];
  for (const pos of engine.POSITIONS) {
    const list = byPos[pos] || [];
    if (!list.length) need.push({ pos, reason: 'aucun joueur' });
    else if (list[0].rating < 60) need.push({ pos, reason: `meilleur à ${list[0].rating} OVR seulement` });
  }
  if (need.length) {
    lines.push('*Postes prioritaires*');
    need.slice(0, 5).forEach(n => lines.push(`• ${n.pos} — ${n.reason}`));
    lines.push('');
  }

  // à vendre (vieux + bas potentiel ou surplus)
  const sell = squad.filter(p => p.age >= 30 || (p.rating >= p.potential && p.rating < 62));
  if (sell.length) {
    lines.push('*Candidats à vendre*');
    sell.slice(0, 4).forEach(p => {
      lines.push(`• ${p.name} (${p.pos} ${p.rating} OVR, ${p.age} ans) — val. ~${p.price.toLocaleString('fr-FR')} €`);
    });
    lines.push('');
  }

  // opportunités marché NPC
  if (market?.players?.length) {
    const affordable = market.players
      .filter(p => p.price <= club.budget)
      .sort((a, b) => (b.potential - b.rating) - (a.potential - a.rating) || b.rating - a.rating);
    if (affordable.length) {
      lines.push('*Opportunités .marche*');
      affordable.slice(0, 4).forEach((p, i) => {
        const idx = market.players.indexOf(p) + 1;
        lines.push(`${i + 1}. [${idx}] ${p.name} — ${p.pos} ${p.rating}→${p.potential} · ${p.price.toLocaleString('fr-FR')} €`);
      });
      lines.push('');
    }
  }

  // listings public
  if (listings?.length) {
    const good = listings
      .filter(l => l.price <= club.budget && l.sellerJid !== club._jid)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0));
    if (good.length) {
      lines.push('*Mercato public intéressant*');
      good.slice(0, 3).forEach(l => {
        lines.push(`• \`${l.id}\` ${l.playerName} ${l.rating || '?'} OVR — ${l.price.toLocaleString('fr-FR')} €`);
      });
      lines.push('');
    }
  }

  // plan d'action
  lines.push('*Plan suggéré*');
  if (need.length && club.budget > 50000) {
    lines.push(`1. Cible un ${need[0].pos} sur .marche ou .mercato`);
  }
  if (sell.length) {
    lines.push(`2. Liste ${sell[0].name} : \`.mercato lister <n°> <prix>\``);
  }
  if (club.budget > 100000) {
    lines.push('3. Regarde `.boutique scout_jeune` pour le long terme');
  } else {
    lines.push('3. Enchaîne `.amical` + `.recette` pour remonter le budget');
  }
  lines.push('\n_Conseil local (sans API). Avec clé Groq : analyse plus fine._');

  return lines.join('\n');
}

async function groqAdvice(club, market, listings, question) {
  const squadSummary = [...club.squad]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 15)
    .map(p => `${p.name}|${p.pos}|${p.rating}|pot${p.potential}|${p.age}a|${p.price}`)
    .join('\n');
  const marketSummary = (market?.players || [])
    .map((p, i) => `${i + 1}. ${p.name}|${p.pos}|${p.rating}|pot${p.potential}|${p.price}`)
    .join('\n');
  const listSummary = (listings || [])
    .slice(0, 10)
    .map(l => `${l.id}|${l.playerName}|${l.rating}|${l.price}`)
    .join('\n');

  const system = `Tu es un directeur sportif expert Football Manager. Réponds en français, concis (max 25 lignes), avec des actions concrètes (.recruter N, .mercato, .vendre, .boutique).`;
  const user = `Club: ${club.name}
Budget: ${club.budget} €
Réputation: ${club.reputation}
Formation: ${club.formation}
Force estimée: ${Math.round(engine.calcClubPower(club))}

Effectif (nom|pos|ovr|pot|âge|valeur):
${squadSummary}

Marché NPC:
${marketSummary || 'vide'}

Annonces mercato public:
${listSummary || 'aucune'}

Question manager: ${question || 'Que me conseilles-tu pour renforcer le club ?'}`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.groq.apiKey}`
    },
    body: JSON.stringify({
      model: config.groq.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      temperature: 0.5,
      max_tokens: 700
    })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'Groq error');
  return data.choices?.[0]?.message?.content || 'Pas de réponse.';
}

module.exports = {
  name: 'iatransfert',
  category: 'manager',
  description: 'IA directeur sportif — .iatransfert [question]',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);
    const club = managerDB.getClub(senderJid);
    if (!club) {
      return replyText(sock, jid, "Crée d'abord un club avec .club <nom>.", msg);
    }

    let market = engine.refreshMarketIfNeeded(managerDB.getMarket());
    managerDB.setMarket(market);
    const listings = managerDB.getListings();
    const question = args.join(' ').trim();

    const hasGroq = config.groq?.apiKey && config.groq.apiKey !== 'TA_CLE_GROQ_ICI';

    if (hasGroq) {
      try {
        await replyText(sock, jid, '🧠 Analyse transfert (Groq)…', msg);
        const answer = await groqAdvice(club, market, listings, question);
        return replyText(sock, jid, `🧠 *IA Transfert*\n\n${answer}`, msg);
      } catch (err) {
        console.error('[iatransfert]', err);
        // fallback local
      }
    }

    const text = localAdvice({ ...club, _jid: senderJid }, market, listings);
    return replyText(sock, jid, text, msg);
  }
};
