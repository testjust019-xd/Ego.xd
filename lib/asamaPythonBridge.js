/**
 * Pont optionnel vers tools/anime-downloader (Python).
 * Utilisé en fallback si le scraper JS échoue.
 */
const { execFile } = require('child_process');
const util = require('util');
const path = require('path');
const fs = require('fs');

const execFileAsync = util.promisify(execFile);
const ROOT = path.join(__dirname, '..', 'tools', 'anime-downloader');

function pythonAvailable() {
  return new Promise(async (resolve) => {
    for (const bin of ['python3', 'python']) {
      try {
        await execFileAsync(bin, ['--version'], { timeout: 5000 });
        return resolve(bin);
      } catch (_) {}
    }
    resolve(null);
  });
}

/**
 * Recherche minimaliste via un script inline (n'ouvre pas le CLI interactif).
 * Retourne [] si indisponible.
 */
async function searchViaPython(query) {
  const py = await pythonAvailable();
  if (!py || !fs.existsSync(ROOT)) return [];

  const script = `
import json, sys
sys.path.insert(0, ${JSON.stringify(ROOT)})
q = ${JSON.stringify(query)}
results = []
try:
    from src.utils.search.search_anime import search_nakanime
    results = search_nakanime(q) or []
except Exception as e:
    print(json.dumps({"error": str(e)}), file=sys.stderr)
    results = []
# normalize
out = []
for r in results[:10]:
    out.append({"title": r.get("title") or "?", "url": r.get("url") or "", "site": r.get("site") or "py"})
print(json.dumps(out))
`;
  try {
    const { stdout } = await execFileAsync(py, ['-c', script], {
      timeout: 20000,
      cwd: ROOT,
      maxBuffer: 2 * 1024 * 1024
    });
    const data = JSON.parse(stdout.trim() || '[]');
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('[asamaPythonBridge]', err.message);
    return [];
  }
}

module.exports = { searchViaPython, pythonAvailable, ROOT };
