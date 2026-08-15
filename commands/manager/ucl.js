const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { isSenderAdmin } = require('../../lib/groupHelpers');
const managerDB = require('../../lib/managerDB');
const engine = require('../../lib/managerEngine');

function clubName(jid) {
  const c = managerDB.getClub(jid);
  return c ? c.name : 'Club inconnu';
}

module.exports = {
  name: 'ucl',
  category: 'manager',
  description: 'Ligue des Champions du groupe — .ucl creer/rejoindre/groupes/jouer/classement/phases/reset',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);

    if (!jid.endsWith('@g.us')) {
      return replyText(sock, jid, 'L\'UCL ne marche que dans un groupe WhatsApp.', msg);
    }

    const sub = (args[0] || '').toLowerCase();
    const ucl = managerDB.getUcl(jid);

    if (sub === 'creer') {
      if (ucl) return replyText(sock, jid, `UCL déjà active : *${ucl.name}*. .ucl reset pour recommencer.`, msg);
      const myClub = managerDB.getClub(senderJid);
      if (!myClub) return replyText(sock, jid, 'Crée d\'abord ton club (.club <nom>).', msg);
      const name = args.slice(1).join(' ').trim() || 'Ligue des Champions';
      managerDB.createUcl(jid, {
        name, status: 'open', members: [senderJid],
        groups: {}, fixtures: [], knockout: null,
        createdAt: Date.now(), createdBy: senderJid
      });
      return replyText(sock, jid, `⭐ *${name}* créée !\n.min 4 clubs → .ucl rejoindre puis .ucl groupes`, msg);
    }

    if (!ucl) return replyText(sock, jid, 'Pas d\'UCL. Lance .ucl creer <nom>', msg);

    if (sub === 'rejoindre') {
      if (ucl.status !== 'open') return replyText(sock, jid, 'Inscriptions fermées.', msg);
      const myClub = managerDB.getClub(senderJid);
      if (!myClub) return replyText(sock, jid, 'Crée ton club d\'abord.', msg);
      if (ucl.members.includes(senderJid)) return replyText(sock, jid, 'Déjà inscrit.', msg);
      const members = [...ucl.members, senderJid];
      managerDB.updateUcl(jid, { members });
      return replyText(sock, jid, `✅ *${myClub.name}* en UCL (${members.length}).`, msg);
    }

    if (sub === 'groupes') {
      if (ucl.status !== 'open') return replyText(sock, jid, 'Groupes déjà formés. Voir .ucl classement', msg);
      if (ucl.members.length < 4) return replyText(sock, jid, 'Minimum 4 clubs.', msg);

      // répartir en groupes de 3-4
      const shuffled = [...ucl.members];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = engine.randInt(0, i);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const groupCount = Math.max(1, Math.floor(shuffled.length / 4));
      const groups = {};
      const labels = 'ABCDEFGH';
      for (let g = 0; g < groupCount; g++) groups[labels[g]] = [];
      shuffled.forEach((m, i) => {
        groups[labels[i % groupCount]].push(m);
      });

      // fixtures aller simple dans chaque groupe
      const fixtures = [];
      for (const [label, members] of Object.entries(groups)) {
        const gf = engine.generateFixtures(members);
        for (const f of gf) {
          fixtures.push({ ...f, group: label });
        }
      }

      const standings = {};
      for (const [label, members] of Object.entries(groups)) {
        standings[label] = engine.initStandings(members);
      }

      managerDB.updateUcl(jid, { status: 'groups', groups, fixtures, standings });
      let text = `⭐ Groupes de *${ucl.name}*\n\n`;
      for (const [label, members] of Object.entries(groups)) {
        text += `*Groupe ${label}*\n`;
        members.forEach(m => { text += `• ${clubName(m)}\n`; });
        text += '\n';
      }
      text += `${fixtures.length} matchs de poule. Joue avec .ucl jouer`;
      return replyText(sock, jid, text, msg);
    }

    if (sub === 'jouer') {
      if (ucl.status === 'open') return replyText(sock, jid, 'Forme d\'abord les groupes (.ucl groupes).', msg);
      if (!ucl.members.includes(senderJid)) return replyText(sock, jid, 'Tu n\'es pas inscrit.', msg);

      if (ucl.status === 'groups') {
        const fixture = ucl.fixtures.find(f => !f.played && (f.home === senderJid || f.away === senderJid));
        if (!fixture) return replyText(sock, jid, 'Plus de match de poule pour toi.', msg);

        const homeClub = managerDB.getClub(fixture.home);
        const awayClub = managerDB.getClub(fixture.away);
        if (!homeClub || !awayClub) {
          fixture.played = true;
          managerDB.updateUcl(jid, { fixtures: ucl.fixtures });
          return replyText(sock, jid, 'Club manquant — forfait.', msg);
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

        const st = ucl.standings[fixture.group];
        if (st) {
          const h = st[fixture.home], a = st[fixture.away];
          if (h && a) {
            h.played++; a.played++;
            h.gf += sim.goalsA; h.ga += sim.goalsB;
            a.gf += sim.goalsB; a.ga += sim.goalsA;
            if (sim.result === 'A') { h.wins++; h.points += 3; a.losses++; }
            else if (sim.result === 'B') { a.wins++; a.points += 3; h.losses++; }
            else { h.draws++; a.draws++; h.points++; a.points++; }
          }
        }

        const rewards = engine.COMPETITION_REWARDS.ucl;
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

        managerDB.updateUcl(jid, { fixtures: ucl.fixtures, standings: ucl.standings });

        // auto-passage en phases finales si toutes les poules jouées
        const remaining = ucl.fixtures.filter(f => !f.played).length;
        let extra = '';
        if (remaining === 0) {
          // top 2 de chaque groupe
          const qualifiers = [];
          for (const [label, table] of Object.entries(ucl.standings)) {
            const ranked = Object.entries(table)
              .map(([j, s]) => ({ jid: j, ...s }))
              .sort((x, y) => (y.points - x.points) || ((y.gf - y.ga) - (x.gf - x.ga)));
            if (ranked[0]) qualifiers.push(ranked[0].jid);
            if (ranked[1]) qualifiers.push(ranked[1].jid);
          }
          if (qualifiers.length >= 2) {
            const rounds = engine.generateKnockoutBracket(qualifiers);
            managerDB.updateUcl(jid, { status: 'knockout', knockout: rounds, fixtures: ucl.fixtures, standings: ucl.standings });
            extra = `\n\n⭐ Poules terminées ! ${qualifiers.length} clubs en phases finales.\n.ucl phases pour le tableau, .ucl jouer pour continuer.`;
          }
        }

        let report = engine.formatMatchReport(homeClub.name, awayClub.name, sim);
        report += `\n⭐ Groupe ${fixture.group}`;
        report += extra;
        return replyText(sock, jid, report, msg);
      }

      // knockout phase
      if (ucl.status === 'knockout' && ucl.knockout) {
        let fixture = null, roundIdx = -1, fixIdx = -1;
        for (let r = 0; r < ucl.knockout.length; r++) {
          for (let i = 0; i < ucl.knockout[r].length; i++) {
            const f = ucl.knockout[r][i];
            if (!f.played && f.home && f.away && (f.home === senderJid || f.away === senderJid)) {
              fixture = f; roundIdx = r; fixIdx = i; break;
            }
          }
          if (fixture) break;
          if (ucl.knockout[r].some(f => !f.played && f.home && f.away)) break;
        }
        if (!fixture) return replyText(sock, jid, 'Pas de match de phase finale pour toi.', msg);

        const homeClub = managerDB.getClub(fixture.home);
        const awayClub = managerDB.getClub(fixture.away);
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

        if (roundIdx < ucl.knockout.length - 1) {
          const next = ucl.knockout[roundIdx + 1];
          const nextIdx = Math.floor(fixIdx / 2);
          if (next[nextIdx]) {
            if (fixIdx % 2 === 0) next[nextIdx].home = fixture.winner;
            else next[nextIdx].away = fixture.winner;
          }
        }

        const rewards = engine.COMPETITION_REWARDS.ucl;
        const w = managerDB.getClub(fixture.winner);
        const lJid = fixture.winner === fixture.home ? fixture.away : fixture.home;
        const l = managerDB.getClub(lJid);
        if (w) managerDB.updateClub(fixture.winner, { budget: w.budget + rewards.win * 1.5 });
        if (l) managerDB.updateClub(lJid, { budget: l.budget + rewards.loss });

        let extra = '';
        const finale = ucl.knockout[ucl.knockout.length - 1][0];
        if (finale && finale.played && finale.winner) {
          extra = `\n\n👑 *Vainqueur de l'UCL : ${clubName(finale.winner)}* !`;
          managerDB.updateUcl(jid, { status: 'finished', knockout: ucl.knockout });
        } else {
          managerDB.updateUcl(jid, { knockout: ucl.knockout });
        }

        let report = engine.formatMatchReport(homeClub.name, awayClub.name, sim);
        report += `\n⭐ Qualifié : *${clubName(fixture.winner)}*`;
        report += extra;
        return replyText(sock, jid, report, msg);
      }

      return replyText(sock, jid, 'Compétition terminée ou état inconnu.', msg);
    }

    if (sub === 'classement' || !sub) {
      if (ucl.status === 'open') {
        let text = `⭐ *${ucl.name}* (inscriptions)\n\n`;
        ucl.members.forEach((j, i) => { text += `${i + 1}. ${clubName(j)}\n`; });
        return replyText(sock, jid, text, msg);
      }
      if (!ucl.standings) return replyText(sock, jid, 'Pas encore de classements.', msg);
      let text = `⭐ *Classements — ${ucl.name}*\n\n`;
      for (const [label, table] of Object.entries(ucl.standings)) {
        text += `*Groupe ${label}*\n`;
        const rows = Object.entries(table)
          .map(([j, s]) => ({ name: clubName(j), ...s }))
          .sort((x, y) => (y.points - x.points) || ((y.gf - y.ga) - (x.gf - x.ga)));
        rows.forEach((r, i) => {
          const diff = r.gf - r.ga;
          text += `${i + 1}. ${r.name} — ${r.points} pts (diff ${diff >= 0 ? '+' : ''}${diff})\n`;
        });
        text += '\n';
      }
      const rem = (ucl.fixtures || []).filter(f => !f.played).length;
      text += `${rem} match(s) de poule restant(s).`;
      return replyText(sock, jid, text, msg);
    }

    if (sub === 'phases') {
      if (!ucl.knockout) return replyText(sock, jid, 'Phases finales pas encore lancées (termine les poules).', msg);
      let text = `⭐ *Phases finales — ${ucl.name}*\n\n`;
      const labels = ['Finale', 'Demi-finales', 'Quarts', '8es', '16es'];
      for (let r = 0; r < ucl.knockout.length; r++) {
        const depth = ucl.knockout.length - 1 - r;
        text += `*${labels[depth] || 'Tour ' + (r + 1)}*\n`;
        for (const f of ucl.knockout[r]) {
          if (f.bye) text += `→ ${clubName(f.home)} (exempt)\n`;
          else if (f.played) text += `${clubName(f.home)} ${f.homeGoals}-${f.awayGoals} ${clubName(f.away)} → ${clubName(f.winner)}\n`;
          else text += `${f.home ? clubName(f.home) : '???'} vs ${f.away ? clubName(f.away) : '???'}\n`;
        }
        text += '\n';
      }
      return replyText(sock, jid, text, msg);
    }

    if (sub === 'reset') {
      if (!(await isSenderAdmin(sock, jid, msg)) && senderJid !== ucl.createdBy) {
        return replyText(sock, jid, 'Admin ou créateur uniquement.', msg);
      }
      managerDB.deleteUcl(jid);
      return replyText(sock, jid, '🔄 UCL réinitialisée.', msg);
    }

    return replyText(sock, jid, 'Utilisation : .ucl creer/rejoindre/groupes/jouer/classement/phases/reset', msg);
  }
};
