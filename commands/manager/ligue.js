const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { isSenderAdmin } = require('../../lib/groupHelpers');
const managerDB = require('../../lib/managerDB');
const engine = require('../../lib/managerEngine');

function clubName(jid) {
  const c = managerDB.getClub(jid);
  return c ? c.name : "Club inconnu";
}

module.exports = {
  name: "ligue",
  category: "manager",
  description: "Championnat entre managers du groupe — .ligue creer/rejoindre/calendrier/jouer/classement/reset",

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);

    if (!jid.endsWith('@g.us')) {
      return replyText(sock, jid, "Le mode ligue ne marche que dans un groupe WhatsApp.", msg);
    }

    const sub = (args[0] || '').toLowerCase();
    const league = managerDB.getLeague(jid);

    // ─── .ligue creer <nom> ───
    if (sub === 'creer') {
      if (league) {
        return replyText(sock, jid, `Une ligue existe déjà dans ce groupe : *${league.name}*. Utilise .ligue reset pour repartir à zéro.`, msg);
      }
      const myClub = managerDB.getClub(senderJid);
      if (!myClub) {
        return replyText(sock, jid, "Crée d'abord ton club avec .club <nom>.", msg);
      }
      const name = args.slice(1).join(' ').trim() || "Ligue du groupe";
      managerDB.createLeague(jid, {
        name, status: 'open', members: [senderJid],
        fixtures: [], standings: {}, createdAt: Date.now(), createdBy: senderJid
      });
      return replyText(sock, jid, `🏆 *${name}* créée !\nLes autres managers peuvent rejoindre avec .ligue rejoindre, puis lance .ligue calendrier quand vous êtes prêts.`, msg);
    }

    if (!league) {
      return replyText(sock, jid, "Aucune ligue dans ce groupe. Crée-en une avec .ligue creer <nom> (il faut d'abord avoir un club : .club <nom>).", msg);
    }

    // ─── .ligue rejoindre ───
    if (sub === 'rejoindre') {
      if (league.status !== 'open') {
        return replyText(sock, jid, "Le calendrier a déjà été généré, impossible de rejoindre cette saison.", msg);
      }
      const myClub = managerDB.getClub(senderJid);
      if (!myClub) {
        return replyText(sock, jid, "Crée d'abord ton club avec .club <nom>.", msg);
      }
      if (league.members.includes(senderJid)) {
        return replyText(sock, jid, "Tu es déjà inscrit à cette ligue.", msg);
      }
      const members = [...league.members, senderJid];
      managerDB.updateLeague(jid, { members });
      return replyText(sock, jid, `✅ *${myClub.name}* rejoint *${league.name}* ! (${members.length} clubs inscrits)`, msg);
    }

    // ─── .ligue calendrier ───
    if (sub === 'calendrier') {
      if (league.status === 'open') {
        if (league.members.length < 2) {
          return replyText(sock, jid, "Il faut au moins 2 managers inscrits pour lancer le calendrier.", msg);
        }
        const fixtures = engine.generateFixtures(league.members);
        const standings = engine.initStandings(league.members);
        managerDB.updateLeague(jid, { status: 'started', fixtures, standings });
        return replyText(sock, jid,
          `📅 Calendrier généré pour *${league.name}* !\n` +
          `${fixtures.length} matchs au programme. Chacun joue son prochain match avec .ligue jouer.`,
          msg
        );
      }
      const upcoming = league.fixtures.filter(f => !f.played).slice(0, 10);
      if (!upcoming.length) {
        return replyText(sock, jid, "Tous les matchs de la saison ont été joués ! Tape .ligue classement pour voir le résultat final, ou .ligue reset pour une nouvelle saison.", msg);
      }
      let text = `📅 *Matchs restants — ${league.name}*\n\n`;
      upcoming.forEach(f => { text += `${clubName(f.home)} vs ${clubName(f.away)}\n`; });
      return replyText(sock, jid, text, msg);
    }

    // ─── .ligue jouer ───
    if (sub === 'jouer') {
      if (league.status !== 'started') {
        return replyText(sock, jid, "Le calendrier n'a pas encore été généré (.ligue calendrier).", msg);
      }
      if (!league.members.includes(senderJid)) {
        return replyText(sock, jid, "Tu n'es pas inscrit à cette ligue.", msg);
      }
      const fixture = league.fixtures.find(f => !f.played && (f.home === senderJid || f.away === senderJid));
      if (!fixture) {
        return replyText(sock, jid, "Tu n'as plus de match programmé pour cette saison !", msg);
      }

      const homeClub = managerDB.getClub(fixture.home);
      const awayClub = managerDB.getClub(fixture.away);
      if (!homeClub || !awayClub) {
        fixture.played = true; // évite un blocage si un club a été supprimé
        managerDB.updateLeague(jid, { fixtures: league.fixtures });
        return replyText(sock, jid, "Un des deux clubs n'existe plus, match annulé (forfait).", msg);
      }

      const sim = engine.simulateRealMatch(homeClub, awayClub);
      await engine.narrateLiveMatch(
        (text) => replyText(sock, jid, text, msg),
        homeClub.name,
        awayClub.name,
        sim
      );
      fixture.played = true;
      fixture.homeGoals = sim.goalsA;
      fixture.awayGoals = sim.goalsB;

      const standings = league.standings;
      if (!standings[fixture.home]) standings[fixture.home] = { played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, points: 0 };
      if (!standings[fixture.away]) standings[fixture.away] = { played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, points: 0 };

      const h = standings[fixture.home], a = standings[fixture.away];
      h.played++; a.played++;
      h.gf += sim.goalsA; h.ga += sim.goalsB;
      a.gf += sim.goalsB; a.ga += sim.goalsA;

      let resultLine;
      if (sim.result === 'A') { h.wins++; h.points += 3; a.losses++; resultLine = `🏆 ${homeClub.name} gagne !`; }
      else if (sim.result === 'B') { a.wins++; a.points += 3; h.losses++; resultLine = `🏆 ${awayClub.name} gagne !`; }
      else { h.draws++; a.draws++; h.points++; a.points++; resultLine = "➖ Match nul."; }

      managerDB.updateLeague(jid, { fixtures: league.fixtures, standings });

      let report = engine.formatMatchReport(homeClub.name, awayClub.name, sim);
      report += `
${resultLine}`;
      const rewards = engine.COMPETITION_REWARDS.league;
      if (sim.result === 'A') {
        managerDB.updateClub(fixture.home, { budget: homeClub.budget + rewards.win });
        managerDB.updateClub(fixture.away, { budget: awayClub.budget + rewards.loss });
      } else if (sim.result === 'B') {
        managerDB.updateClub(fixture.away, { budget: awayClub.budget + rewards.win });
        managerDB.updateClub(fixture.home, { budget: homeClub.budget + rewards.loss });
      } else {
        managerDB.updateClub(fixture.home, { budget: homeClub.budget + rewards.draw });
        managerDB.updateClub(fixture.away, { budget: awayClub.budget + rewards.draw });
      }
      return replyText(sock, jid, report, msg);
    }

    // ─── .ligue classement ───
    if (sub === 'classement' || !sub) {
      if (league.status === 'open') {
        let text = `🏆 *${league.name}* (inscriptions ouvertes)\n\n*Managers inscrits :*\n`;
        league.members.forEach((j, i) => { text += `${i + 1}. ${clubName(j)}\n`; });
        text += `\nRejoins avec .ligue rejoindre, ou lance .ligue calendrier.`;
        return replyText(sock, jid, text, msg);
      }

      const rows = Object.entries(league.standings)
        .map(([j, s]) => ({ jid: j, name: clubName(j), ...s }))
        .sort((x, y) => (y.points - x.points) || ((y.gf - y.ga) - (x.gf - x.ga)));

      let text = `🏆 *Classement — ${league.name}*\n\n`;
      rows.forEach((r, i) => {
        const diff = r.gf - r.ga;
        text += `${i + 1}. *${r.name}* — ${r.points} pts (${r.wins}V ${r.draws}N ${r.losses}D, diff ${diff >= 0 ? '+' : ''}${diff})\n`;
      });
      const remaining = league.fixtures.filter(f => !f.played).length;
      text += `\n${remaining} match(s) restant(s). Tape .ligue jouer pour disputer le tien.`;
      return replyText(sock, jid, text, msg);
    }

    // ─── .ligue reset ───
    if (sub === 'reset') {
      if (!(await isSenderAdmin(sock, jid, msg)) && senderJid !== league.createdBy) {
        return replyText(sock, jid, "Seul l'admin du groupe ou le créateur de la ligue peut la réinitialiser.", msg);
      }
      managerDB.deleteLeague(jid);
      return replyText(sock, jid, "🔄 Ligue supprimée. Tape .ligue creer <nom> pour démarrer une nouvelle saison.", msg);
    }

    return replyText(sock, jid, "Utilisation : .ligue creer/rejoindre/calendrier/jouer/classement/reset", msg);
  }
};
