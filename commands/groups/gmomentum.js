const { replyText } = require('../../helpers/reply');
const { getGroupActivity } = require('../../lib/activityTracker');

const BLOCKS = ' ▁▂▃▄▅▆▇█';
const DAY_NAMES = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MONTH_NAMES = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

function pad(n) {
  return String(n).padStart(2, '0');
}
function hourKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}`;
}
function dayKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function monthKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

function sparkline(values) {
  const max = Math.max(1, ...values);
  return values.map(v => {
    const level = v === 0 ? 0 : Math.max(1, Math.round((v / max) * 8));
    return BLOCKS[level];
  }).join('');
}

function trendText(current, previous) {
  if (previous === 0) return current > 0 ? '▲ nouveau' : '▬ stable';
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct > 5) return `▲ +${pct}%`;
  if (pct < -5) return `▼ ${pct}%`;
  return '▬ stable';
}

function hourlyValuesFor(activity, dayDate) {
  const values = [];
  for (let h = 0; h < 24; h++) {
    const d = new Date(dayDate);
    d.setHours(h, 0, 0, 0);
    values.push(activity.hourly[hourKey(d)] || 0);
  }
  return values;
}

function buildDayView(activity, offsetDays, label) {
  const now = new Date();
  const target = new Date(now);
  target.setDate(target.getDate() - offsetDays);

  const values = hourlyValuesFor(activity, target);
  const total = values.reduce((a, b) => a + b, 0);
  const peakIdx = values.indexOf(Math.max(...values));

  const prevTarget = new Date(target);
  prevTarget.setDate(prevTarget.getDate() - 1);
  const prevValues = hourlyValuesFor(activity, prevTarget);
  const prevTotal = prevValues.reduce((a, b) => a + b, 0);

  let text = `📈 *Group Momentum — ${label}*\n\n`;
  text += `Total : ${total} messages\n`;
  if (total > 0) text += `Pic : ${pad(peakIdx)}h (${values[peakIdx]} msgs)\n`;
  text += `Tendance vs veille : ${trendText(total, prevTotal)}\n\n`;
  text += `00h ${sparkline(values)} 23h`;
  return text;
}

function buildWeekView(activity) {
  const now = new Date();
  const values = [];
  const labels = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    values.push(activity.daily[dayKey(d)] || 0);
    labels.push(DAY_NAMES[d.getDay()]);
  }
  const total = values.reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...values);

  let text = `📈 *Group Momentum — 7 derniers jours*\n\n`;
  text += `Total : ${total} messages\n\n`;
  values.forEach((v, i) => {
    const barLen = Math.round((v / max) * 10);
    text += `${labels[i]} ${'█'.repeat(barLen).padEnd(10, '▁')} ${v}\n`;
  });
  return text.trim();
}

function buildMonthView(activity) {
  const now = new Date();
  const values = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    values.push(activity.daily[dayKey(d)] || 0);
  }
  const total = values.reduce((a, b) => a + b, 0);
  const avg = (total / 30).toFixed(1);

  let text = `📈 *Group Momentum — 30 derniers jours*\n\n`;
  text += `Total : ${total} messages\n`;
  text += `Moyenne : ${avg}/jour\n\n`;
  text += `il y a 30j ${sparkline(values)} auj`;
  return text;
}

function buildYearView(activity) {
  const now = new Date();
  const values = [];
  const labels = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    values.push(activity.monthly[monthKey(d)] || 0);
    labels.push(MONTH_NAMES[d.getMonth()]);
  }
  const total = values.reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...values);

  let text = `📈 *Group Momentum — 12 derniers mois*\n\n`;
  text += `Total : ${total} messages\n\n`;
  values.forEach((v, i) => {
    const barLen = Math.round((v / max) * 10);
    text += `${labels[i]} ${'█'.repeat(barLen).padEnd(10, '▁')} ${v}\n`;
  });
  return text.trim();
}

module.exports = {
  name: 'gmomentum',
  category: 'groups',
  description: "Intensité du groupe (mini-graphique) — .gmomentum day/yesterday/week/month/year",

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (!jid?.endsWith('@g.us')) {
      return replyText(sock, jid, '⚠️ Commande utilisable uniquement dans un groupe.', msg);
    }

    const period = (args[0] || 'week').toLowerCase();
    const activity = getGroupActivity(jid);

    let text;
    switch (period) {
      case 'day':
      case 'today':
      case 'jour':
        text = buildDayView(activity, 0, "Aujourd'hui");
        break;
      case 'yesterday':
      case 'hier':
        text = buildDayView(activity, 1, 'Hier');
        break;
      case 'week':
      case 'semaine':
        text = buildWeekView(activity);
        break;
      case 'month':
      case 'mois':
        text = buildMonthView(activity);
        break;
      case 'year':
      case 'annee':
      case 'année':
        text = buildYearView(activity);
        break;
      default:
        return replyText(sock, jid,
          'Utilisation : `.gmomentum <periode>`\n' +
          'Périodes : `day` · `yesterday` · `week` · `month` · `year`',
          msg
        );
    }

    text += `\n\n_Filtres : day · yesterday · week · month · year_`;
    return replyText(sock, jid, text, msg);
  }
};
