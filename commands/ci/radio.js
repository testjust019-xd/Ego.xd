const { replyText } = require('../../helpers/reply');

const STATIONS = {
  'nostalgie': 'https://nostalgiecotedivoire.ice.infomaniak.ch/nostalgiecotedivoire-128.mp3',
  'jam': 'https://stream.zeno.fm/0r0xa792kwzuv',
  'radio': 'https://stream.zeno.fm/0r0xa792kwzuv',
  'african': 'https://stream.zeno.fm/0r0xa792kwzuv',
};

module.exports = {
  name: 'radio',
  category: 'ci',
  description: 'Lien stream radio ivoirienne — .radio [station]',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const name = (args[0] || 'nostalgie').toLowerCase();
    const url = STATIONS[name] || STATIONS.nostalgie;
    return replyText(sock, jid,
      `📻 *Radio*\nStation : *${name}*\n\n🔗 ${url}\n\n_Ouvre le lien dans un lecteur audio. Streams publics — dispo variable._\nStations : ${Object.keys(STATIONS).join(', ')}`,
      msg
    );
  }
};
