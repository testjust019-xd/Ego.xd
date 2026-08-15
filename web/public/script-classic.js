const form = document.getElementById('pair-form');
const phoneInput = document.getElementById('phone');
const generateBtn = document.getElementById('generate-btn');
const result = document.getElementById('result');
const statSessions = document.getElementById('stat-sessions');
const statConnected = document.getElementById('stat-connected');

async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    const data = await res.json();
    statSessions.textContent = data.totalSessions;
    statConnected.textContent = data.connected;
  } catch {
    statSessions.textContent = '0';
    statConnected.textContent = '0';
  }
}

function showResult(type, html) {
  result.className = `result ${type}`;
  result.innerHTML = html;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const phoneNumber = phoneInput.value.replace(/[^0-9]/g, '');

  if (!phoneNumber) {
    showResult('error', "Entre un numéro valide.");
    return;
  }

  generateBtn.disabled = true;
  generateBtn.textContent = "Génération en cours...";
  result.className = 'result hidden';

  try {
    const res = await fetch('/api/pair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber })
    });
    const data = await res.json();

    if (data.error) {
      showResult('error', data.error);
    } else {
      showResult('success', `
        Code d'appairage généré :
        <span class="result-code">${data.code}</span>
        Sur ton téléphone : WhatsApp → Appareils liés → Lier avec un numéro de téléphone → entre ce code.
      `);
      loadStats();
    }
  } catch (err) {
    showResult('error', "Erreur de connexion au serveur.");
  } finally {
    generateBtn.disabled = false;
    generateBtn.innerHTML = '<span class="btn-icon">⛓</span> Générer le code';
  }
});

loadStats();
setInterval(loadStats, 15000);
