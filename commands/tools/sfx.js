const { replyText, playSfx, replyAudio } = require('../../helpers/reply');
const { MAP, resolveSfx, DIR } = require('../../lib/sfx');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'sfx',
  aliases: ['sound', 'sons'],
  category: 'tools',
  description: 'Joue un effet sonore — .sfx <nom> | .sfx list',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const name = (args[0] || '').toLowerCase();

    if (!name || name === 'list' || name === 'ls' || name === 'help') {
      const keys = Object.keys(MAP);
      let text = `🎧 *SFX — effets sonores*\n\n`;
      for (const k of keys) {
        const f = resolveSfx(k);
        const ok = f ? '✅' : '❌';
        text += `${ok} \`.sfx ${k}\`\n`;
      }
      text += `\n_Ex: .sfx ping · .sfx arise · .sfx gate_`;
      return replyText(sock, jid, text, msg);
    }

    const file = resolveSfx(name);
    if (!file) {
      return replyText(
        sock, jid,
        `❌ SFX inconnu : *${name}*\nUtilise \`.sfx list\` pour voir les sons.`,
        msg
      );
    }

    await playSfx(sock, jid, name, msg, 1);
  }
};
