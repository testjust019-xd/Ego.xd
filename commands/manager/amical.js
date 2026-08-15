const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const managerDB = require('../../lib/managerDB');
const engine = require('../../lib/managerEngine');

const RESULT_LABEL = { win: '✅ VICTOIRE', draw: '➖ MATCH NUL', loss: '❌ DÉFAITE' };

module.exports = {
  name: 'amical',
  category: 'manager',
  description: 'Match amical en live — .amical',

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);
    const club = managerDB.getClub(senderJid);

    if (!club) {
      return replyText(sock, jid, "Tu n'as pas encore de club. Tape .club <nom> pour en créer un.", msg);
    }
    if (club.squad.length < 5) {
      return replyText(sock, jid, 'Il te faut au moins 5 joueurs. Va sur .marche.', msg);
    }

    const now = Date.now();
    if (now - club.lastMatch < engine.MATCH_COOLDOWN_MS) {
      const minutes = Math.ceil((engine.MATCH_COOLDOWN_MS - (now - club.lastMatch)) / 60000);
      return replyText(sock, jid, `⏳ Équipe en récupération. Reviens dans ${minutes} min.`, msg);
    }

    const inv = { ...(club.inventory || {}) };
    let clubForSim = club;
    if ((inv.talisman || 0) > 0) {
      inv.talisman -= 1;
      if (inv.talisman <= 0) delete inv.talisman;
      clubForSim = { ...club, reputation: engine.clamp((club.reputation || 50) + 8, 0, 100) };
    }

    const opp = engine.generateNpcClub(clubForSim);
    const sim = engine.simulateRealMatch(clubForSim, opp);

    // Résultat du point de vue du joueur (A = toi)
    let resultKey = 'draw';
    if (sim.result === 'A') resultKey = 'win';
    else if (sim.result === 'B') resultKey = 'loss';

    const stadium = engine.STADIUM_TIERS[club.stadiumTier] || engine.STADIUM_TIERS[1];
    const baseReward = 15_000 + (stadium.tier || 1) * 8_000;
    const rewardMult = resultKey === 'win' ? 1.5 : resultKey === 'draw' ? 1.0 : 0.5;
    const reward = Math.round(baseReward * rewardMult * (0.85 + Math.random() * 0.3));
    const repChange = resultKey === 'win' ? 2 : resultKey === 'loss' ? -1 : 0;

    const s = club.stats || { played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, points: 0 };
    const newStats = {
      played: s.played + 1,
      wins: s.wins + (resultKey === 'win' ? 1 : 0),
      draws: s.draws + (resultKey === 'draw' ? 1 : 0),
      losses: s.losses + (resultKey === 'loss' ? 1 : 0),
      gf: s.gf + sim.goalsA,
      ga: s.ga + sim.goalsB,
      points: s.points + (resultKey === 'win' ? 3 : resultKey === 'draw' ? 1 : 0)
    };

    managerDB.updateClub(senderJid, {
      budget: club.budget + reward,
      reputation: engine.clamp((club.reputation || 50) + repChange, 0, 100),
      stats: newStats,
      inventory: inv,
      lastMatch: now
    });

    const send = (text) => replyText(sock, jid, text, msg);
    await engine.narrateLiveMatch(send, club.name, opp.name, sim);

    let final =
      engine.formatMatchReport(club.name, opp.name, sim) +
      `\n${RESULT_LABEL[resultKey]}\n` +
      `💰 Recette : +${reward.toLocaleString('fr-FR')} €`;
    if (repChange) final += `\n🏆 Réputation : ${repChange > 0 ? '+' : ''}${repChange}`;
    if ((club.inventory || {}).talisman !== inv.talisman) {
      final += `\n🔮 Talisman consommé`;
    }

    return replyText(sock, jid, final, msg);
  }
};
