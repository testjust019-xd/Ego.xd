const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { listNotes, addNote, clearNotes } = require('../../lib/notesDB');

module.exports = {
  name: 'note',
  category: 'tools',
  description: 'Notes personnelles — .note [add <txt>|list|clear]',

  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const sender = getSenderJid(sock, msg);
    const sub = (args[0] || 'list').toLowerCase();

    if (sub === 'clear' || sub === 'reset') {
      clearNotes(sender);
      return replyText(sock, jid, '🗑 Notes effacées.', msg);
    }
    if (sub === 'add' || sub === 'ajouter') {
      const text = args.slice(1).join(' ').trim();
      if (!text) return replyText(sock, jid, '`.note add texte`', msg);
      addNote(sender, text);
      return replyText(sock, jid, '✅ Note enregistrée.', msg);
    }
    // list (default) — also allow .note mon texte as shortcut add
    if (args.length && !['list', 'liste', 'add', 'ajouter', 'clear', 'reset'].includes(sub)) {
      addNote(sender, args.join(' '));
      return replyText(sock, jid, '✅ Note enregistrée.', msg);
    }
    const notes = listNotes(sender);
    if (!notes.length) return replyText(sock, jid, 'Aucune note. `.note add ...`', msg);
    let text = `📝 *Tes notes*\n\n`;
    notes.forEach((n, i) => {
      text += `${i + 1}. ${n.text}\n`;
    });
    return replyText(sock, jid, text.trim(), msg);
  }
};
