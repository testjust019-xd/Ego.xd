const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const DATA = path.join(__dirname, '..', 'data');
const OUT = path.join(__dirname, '..', 'backups');

function createBackup() {
  fs.mkdirSync(OUT, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dest = path.join(OUT, `data-${stamp}.zip`);
  try {
    execSync(`zip -q -r "${dest}" .`, { cwd: DATA });
    return dest;
  } catch (e) {
    // fallback: copy json files into a folder archive name
    const folder = path.join(OUT, `data-${stamp}`);
    fs.mkdirSync(folder, { recursive: true });
    for (const f of fs.readdirSync(DATA)) {
      if (f.endsWith('.json')) fs.copyFileSync(path.join(DATA, f), path.join(folder, f));
    }
    return folder;
  }
}

function listBackups() {
  try {
    return fs.readdirSync(OUT).filter((f) => f.startsWith('data-')).sort().reverse();
  } catch { return []; }
}

module.exports = { createBackup, listBackups, OUT };
