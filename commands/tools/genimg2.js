const config = require('../../config');
const { replyText, replyImage } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { getModel } = require('../../lib/modelPrefs');

/** Pollinations — gratuit, souvent sans clé (API principale) */
async function tryPollinations(prompt) {
  const key = config.pollinations?.apiKey;
  const encoded = encodeURIComponent(prompt.slice(0, 400));
  // seed aléatoire pour éviter le cache
  const seed = Math.floor(Math.random() * 1e9);
  let url = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&seed=${seed}&nologo=true`;
  if (key && key !== 'TA_CLE_POLLINATIONS_ICI') {
    url += `&key=${encodeURIComponent(key)}`;
  }

  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'image/*' },
    redirect: 'follow'
  });

  if (!res.ok) {
    return { ok: false, error: `Pollinations (${res.status})` };
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('image') && !contentType.includes('octet-stream')) {
    // parfois JSON d'erreur
    const t = await res.text().catch(() => '');
    return { ok: false, error: `Pollinations : réponse non-image (${t.slice(0, 120)})` };
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 1000) {
    return { ok: false, error: 'Pollinations : image trop petite / invalide.' };
  }
  return { ok: true, buffer, source: 'Pollinations' };
}

/** Hugging Face Inference API — fallback */
async function tryHuggingFace(prompt, senderJid) {
  const apiKey = config.huggingFace?.apiKey;
  if (!apiKey || apiKey === 'TA_CLE_HF_ICI') {
    return { ok: false, skip: true };
  }

  const model =
    getModel('huggingFace', senderJid) ||
    config.huggingFace?.model ||
    'black-forest-labs/FLUX.1-schnell';
  const endpoint = `https://api-inference.huggingface.co/models/${model}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'image/png'
    },
    body: JSON.stringify({
      inputs: prompt.slice(0, 500),
      parameters: { num_inference_steps: 4 }
    })
  });

  const contentType = res.headers.get('content-type') || '';

  if (!res.ok) {
    let detail = '';
    try {
      const errJson = await res.json();
      detail = errJson.error || errJson.message || JSON.stringify(errJson).slice(0, 200);
    } catch {
      detail = await res.text().catch(() => '');
    }
    if (res.status === 503 || /loading/i.test(detail)) {
      return { ok: false, error: '⏳ Modèle HF en cours de chargement. Réessaie dans 20-30 s.' };
    }
    return { ok: false, error: `Hugging Face (${res.status}) : ${detail || 'inconnu'}` };
  }

  if (contentType.includes('application/json')) {
    const data = await res.json();
    return {
      ok: false,
      error: `Hugging Face : réponse inattendue (${JSON.stringify(data).slice(0, 150)})`
    };
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 1000) {
    return { ok: false, error: 'Hugging Face : image invalide.' };
  }
  return { ok: true, buffer, source: 'Hugging Face', model };
}

/** DeepAI — optionnel uniquement si une vraie clé est configurée (API devenue payante) */
async function tryDeepAI(prompt) {
  const apiKey = config.deepai?.apiKey;
  if (!apiKey || apiKey === 'TA_CLE_DEEPAI_ICI') {
    return { ok: false, skip: true };
  }

  const res = await fetch('https://api.deepai.org/api/text2img', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text: prompt.slice(0, 500) })
  });

  if (!res.ok) {
    let detail = '';
    try {
      const errJson = await res.json();
      detail = errJson.error || errJson.status || JSON.stringify(errJson).slice(0, 200);
    } catch {
      detail = await res.text().catch(() => '');
    }
    return { ok: false, error: `DeepAI (${res.status}) : ${detail || 'inconnu'}` };
  }

  const data = await res.json();
  if (!data.output_url) {
    return { ok: false, error: 'DeepAI : réponse sans image.' };
  }

  const imgRes = await fetch(data.output_url);
  if (!imgRes.ok) {
    return { ok: false, error: "DeepAI : téléchargement de l'image échoué." };
  }
  const buffer = Buffer.from(await imgRes.arrayBuffer());
  if (buffer.length < 1000) {
    return { ok: false, error: 'DeepAI : image invalide.' };
  }
  return { ok: true, buffer, source: 'DeepAI' };
}

module.exports = {
  name: 'genimg2',
  category: 'tools',
  description: 'Génère une image (Pollinations → HF → DeepAI) — .genimg2 <prompt>',
  minRank: 'B',
  dailyLimit: true,
  cooldown: 8,

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const prompt = args.join(' ').trim();

    if (!prompt) {
      return replyText(
        sock,
        jid,
        'Utilisation : `.genimg2 <description>`\nEx: `.genimg2 portrait anime pluie néon`',
        msg
      );
    }

    const senderJid = getSenderJid(sock, msg);
    await replyText(sock, jid, '🎨 Génération en cours…', msg);

    // 1) Pollinations (gratuit)
    const pol = await tryPollinations(prompt).catch(err => ({
      ok: false,
      error: `Pollinations : ${err.message}`
    }));
    if (pol.ok) {
      return replyImage(sock, jid, pol.buffer, `🎨 ${prompt.slice(0, 80)}`, msg);
    }
    console.warn('[genimg2] Pollinations:', pol.error);

    // 2) Hugging Face
    const hf = await tryHuggingFace(prompt, senderJid).catch(err => ({
      ok: false,
      error: `Hugging Face : ${err.message}`
    }));
    if (hf.ok) {
      return replyImage(sock, jid, hf.buffer, `🧠 ${prompt.slice(0, 80)}`, msg);
    }
    if (!hf.skip) console.warn('[genimg2] HF:', hf.error);

    // 3) DeepAI si clé fournie
    const dai = await tryDeepAI(prompt).catch(err => ({
      ok: false,
      error: `DeepAI : ${err.message}`
    }));
    if (dai.ok) {
      return replyImage(sock, jid, dai.buffer, `🖼 ${prompt.slice(0, 80)}`, msg);
    }

    const errs = [pol.error, !hf.skip && hf.error, !dai.skip && dai.error]
      .filter(Boolean)
      .map(e => `• ${e}`)
      .join('\n');

    return replyText(
      sock,
      jid,
      '❌ Impossible de générer l\'image pour le moment.\n\n' +
        (errs || 'Aucune API disponible.') +
        '\n\n_Vérifie les clés dans config.js (huggingFace / pollinations) ou réessaie plus tard._',
      msg
    );
  }
};
