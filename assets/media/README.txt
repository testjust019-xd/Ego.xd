Médias automatiques par commande
================================

Place un fichier qui porte le NOM de la commande :

  assets/media/ping.mp4
  assets/media/menu.png
  assets/media/welcome.mp3
  assets/media/antilink.jpg
  assets/media/kick.webp

Extensions reconnues
--------------------
Image : .png .jpg .jpeg .webp
Vidéo : .mp4 .webm .gif .mov
Audio : .mp3 .ogg .m4a .opus .wav

Tu peux aussi faire un sous-dossier :
  assets/media/ping/intro.mp4
  assets/media/ping/sound.mp3

Ordre d'envoi
-------------
1. audio (ambiance, sans légende longue)
2. vidéo avec le texte en légende  — prioritaire
3. sinon image avec le texte en légende
4. sinon texte seul

Compat : assets/menu/menu.png (etc.) marche encore pour .menu

Dans le code d'une commande :
  const { replyMedia } = require('../../helpers/reply');
  return replyMedia(sock, jid, 'ping', '🏓 Pong !', msg);
  // ou avec le nom de la commande :
  return replyMedia(sock, jid, module.exports.name, texte, msg);
