const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { isSenderAdmin } = require('../../lib/groupHelpers');
const managerDB = require('../../lib/managerDB');
const engine = require('../../lib/managerEngine');

function clubName(jid) {
  const c = managerDB.getClub(jid);
  return c ? c.name : 'Club inconnu';
}

function currentRoundFixtures(cup) {
  if (!cup.rounds || !cup.rounds.length) return [];
  // premier tour avec des matchs non joués (ou non bye)
  for (const round of cup.rounds) {
    const pending = round.filter(f => !f.played && f.home && f.away);
    if (pending.length) return { round, pending };
    // aussi matchs où home/away viennent d'être remplis
    const ready = round.filter(f => !f.played && f.home && f.away);
    if (ready.length) return { round, pending: ready };
  }
  return { round: null, pending: [] };
}

module.exports = {
  name: 'coupe',
  category: 'manager',
  description: 'Coupe à élimination directe du groupe — .coupe creer/rejoindre/lancer/jouer/tableau/reset',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);

    if (!jid.endsWith('@g.us')) {
      return replyText(sock, jid, 'La coupe ne marche que dans un groupe WhatsApp.', msg);
    }

    const sub = (args[0] || '').toLowerCase();
    const cup = managerDB.getCup(jid);

    if (sub === 'creer') {
      if (cup) {
        return replyText(sock, jid, `Une coupe existe déjà : *${cup.name}*. Utilise .coupe reset.`, msg);
      }
      const myClub = managerDB.getClub(senderJid);
      if (!myClub) return replyText(sock, jid, 'Crée d\'abord ton club avec .club <nom>.', msg);
      const name = args.slice(1).join(' ').trim() || 'Coupe du groupe';
      managerDB.createCup(jid, {
        name, status: 'open', members: [senderJid],
        rounds: [], createdAt: Date.now(), createdBy: senderJid
      });
      return replyText(sock, jid, `🏆 *${name}* créée !\nRejoins avec .coupe rejoindre, puis .coupe lancer (min. 4 clubs).`, msg);
    }

    if (!cup) {
      return replyText(sock, jid, 'Aucune coupe. Crée-en une : .coupe creer <nom>', msg);
    }

    if (sub === 'rejoindre') {
      if (cup.status !== 'open') {
        return replyText(sock, jid, 'Inscriptions fermées (tableau déjà lancé).', msg);
      }
      const myClub = managerDB.getClub(senderJid);
      if (!myClub) return replyText(sock, jid, 'Crée d\'abord ton club (.club <nom>).', msg);
      if (cup.members.includes(senderJid)) {
        return replyText(sock, jid, 'Tu es déjà inscrit.', msg);
      }
      const members = [...cup.members, senderJid];
      managerDB.updateCup(jid, { members });
      return replyText(sock, jid, `✅ *${myClub.name}* inscrit à *${cup.name}* (${members.length} clubs).`, msg);
    }

    if (sub === 'lancer') {
      if (cup.status !== 'open') {
        return replyText(sock, jid, 'Le tableau est déjà lancé. Voir .coupe tableau', msg);
      }
      if (cup.members.length < 4) {
        return replyText(sock, jid, 'Il faut au moins 4 clubs pour lancer une coupe.', msg);
      }
      const rounds = engine.generateKnockoutBracket(cup.members);
      managerDB.updateCup(jid, { status: 'started', rounds });
      return replyText(sock, jid,
        `🎯 Tableau de *${cup.name}* généré !\n` +
        `${cup.members.length} clubs, élimination directe (prolongations + TAB si besoin).\n` +
        `Joue ton match avec .coupe jouer — vois le tableau avec .coupe tableau.`,
        msg
      );
    }

    if (sub === 'jouer') {
      if (cup.status !== 'started') {
        return replyText(sock, jid, 'Tableau pas encore lancé (.coupe lancer).', msg);
      }
      if (!cup.members.includes(senderJid)) {
        return replyText(sock, jid, 'Tu n\'es pas inscrit à cette coupe.', msg);
      }

      // trouver le match du joueur dans le tour courant
      let fixture = null;
      let roundIdx = -1;
      let fixIdx = -1;
      for (let r = 0; r < cup.rounds.length; r++) {
        for (let i = 0; i < cup.rounds[r].length; i++) {
          const f = cup.rounds[r][i];
          if (!f.played && f.home && f.away && (f.home === senderJid || f.away === senderJid)) {
            fixture = f; roundIdx = r; fixIdx = i; break;
          }
        }
        if (fixture) break;
        // si ce tour a encore des matchs non joués, on ne passe pas au suivant
        const stillPending = cup.rounds[r].some(f => !f.played && f.home && f.away);
        const waitingSlots = cup.rounds[r].some(f => !f.played && (!f.home || !f.away) && !f.bye);
        if (stillPending || waitingSlots) break;
      }

      if (!fixture) {
        return replyText(sock, jid, 'Tu n\'as pas de match de coupe en attente pour le moment.', msg);
      }

      const homeClub = managerDB.getClub(fixture.home);
      const awayClub = managerDB.getClub(fixture.away);
      if (!homeClub || !awayClub) {
        fixture.played = true;
        fixture.winner = homeClub ? fixture.home : fixture.away;
        managerDB.updateCup(jid, { rounds: cup.rounds });
        return replyText(sock, jid, 'Club manquant — forfait.', msg);
      }

      const sim = engine.simulateRealMatch(homeClub, awayClub, { knockout: true });
      await engine.narrateLiveMatch(
        (text) => replyText(sock, jid, text, msg),
        homeClub.name,
        awayClub.name,
        sim
      );
      fixture.played = true;
      fixture.homeGoals = sim.goalsA;
      fixture.awayGoals = sim.goalsB;
      fixture.winner = sim.result === 'A' ? fixture.home : fixture.away;
      fixture.penalties = !!sim.penalties;

      // propager winner vers tour suivant
      if (roundIdx < cup.rounds.length - 1) {
        const next = cup.rounds[roundIdx + 1];
        const nextIdx = Math.floor(fixIdx / 2);
        if (next[nextIdx]) {
          if (fixIdx % 2 === 0) next[nextIdx].home = fixture.winner;
          else next[nextIdx].away = fixture.winner;
        }
      }

      const rewards = engine.COMPETITION_REWARDS.cup;
      const winnerJid = fixture.winner;
      const loserJid = winnerJid === fixture.home ? fixture.away : fixture.home;
      const wClub = managerDB.getClub(winnerJid);
      const lClub = managerDB.getClub(loserJid);
      if (wClub) managerDB.updateClub(winnerJid, { budget: wClub.budget + rewards.win });
      if (lClub) managerDB.updateClub(loserJid, { budget: lClub.budget + rewards.loss });

      managerDB.updateCup(jid, { rounds: cup.rounds });

      // finale terminée ?
      const lastRound = cup.rounds[cup.rounds.length - 1];
      const finale = lastRound && lastRound[0];
      let extra = '';
      if (finale && finale.played && finale.winner) {
        extra = `\n\n👑 *Champion de la coupe : ${clubName(finale.winner)}* !`;
        managerDB.updateCup(jid, { status: 'finished', rounds: cup.rounds });
      }

      let report = engine.formatMatchReport(homeClub.name, awayClub.name, sim);
      report += `\n🏆 Qualifié : *${clubName(fixture.winner)}* (+${rewards.win.toLocaleString('fr-FR')} €)`;
      report += extra;
      return replyText(sock, jid, report, msg);
    }

    if (sub === 'tableau' || !sub) {
      if (cup.status === 'open') {
        let text = `🏆 *${cup.name}* (inscriptions)\n\n`;
        cup.members.forEach((j, i) => { text += `${i + 1}. ${clubName(j)}\n`; });
        text += `\n.min 4 clubs → .coupe lancer`;
        return replyText(sock, jid, text, msg);
      }
      const labels = ['Finale', 'Demi-finales', 'Quarts', '8es', '16es', '32es'];
      let text = `🏆 *Tableau — ${cup.name}*\n\n`;
      for (let r = 0; r < cup.rounds.length; r++) {
        const depth = cup.rounds.length - 1 - r;
        const label = labels[depth] || `Tour ${r + 1}`;
        text += `*${label}*\n`;
        for (const f of cup.rounds[r]) {
          if (f.bye) {
            text += `→ ${clubName(f.home)} (exempt)\n`;
          } else if (f.played) {
            text += `${clubName(f.home)} ${f.homeGoals}-${f.awayGoals} ${clubName(f.away)} → ${clubName(f.winner)}\n`;
          } else {
            text += `${f.home ? clubName(f.home) : '???'} vs ${f.away ? clubName(f.away) : '???'}\n`;
          }
        }
        text += '\n';
      }
      text += 'Joue avec .coupe jouer';
      return replyText(sock, jid, text, msg);
    }

    if (sub === 'reset') {
      if (!(await isSenderAdmin(sock, jid, msg)) && senderJid !== cup.createdBy) {
        return replyText(sock, jid, 'Seul un admin ou le créateur peut reset.', msg);
      }
      managerDB.deleteCup(jid);
      return replyText(sock, jid, '🔄 Coupe supprimée.', msg);
    }

    return replyText(sock, jid, 'Utilisation : .coupe creer/rejoindre/lancer/jouer/tableau/reset', msg);
  }
};
