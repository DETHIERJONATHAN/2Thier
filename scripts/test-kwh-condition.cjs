#!/usr/bin/env node
// Script de test direct pour l'endpoint Prix Kw/h
// Permet d'isoler l'API sans passer par le frontend et vérifier l'heuristique

const http = require('http');

const CONDITION_ID = '043e8767-0042-4032-9a11-34a013b542d0';
// Permettre de surcharger le port via API_PORT sinon fallback PORT sinon 5173
const PORT = process.env.API_PORT || process.env.PORT || 5173; // Adapter si API différente
const HOST = 'localhost';
const TOKEN = process.env.TOKEN; // JWT à fournir: export TOKEN=... (PowerShell: $Env:TOKEN="...")

// Jeu d'essai minimal
const payload = {
  fieldValues: {
    'Facture annuelle électricité': '1800',
    'Consommation annuelle électricité': '6000',
    '__mirror_data_Facture annuelle électricité': '1800',
    '__mirror_data_Consommation annuelle électricité': '6000'
  }
};

function post(path, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    };
    if (TOKEN) {
      headers['Authorization'] = 'Bearer ' + TOKEN;
      // Beaucoup de routes lisent le cookie 'token'
      headers['Cookie'] = `token=${TOKEN}`;
    }

    const req = http.request({ hostname: HOST, port: PORT, path, method: 'POST', headers }, res => {
      let chunks = '';
      res.on('data', d => chunks += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(chunks) }); }
        catch { resolve({ status: res.statusCode, raw: chunks }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

(async () => {
  console.log('▶️ Test condition Prix Kw/h sur', `http://${HOST}:${PORT}`);
  if (!TOKEN) {
    console.log('⚠️  Aucun TOKEN fourni (env TOKEN). Les routes protégées renverront probablement 401.');
  }
  console.log('Payload envoyé:', payload);
  try {
    const resp = await post(`/api/treebranchleaf/evaluate/condition/${CONDITION_ID}`, payload);
    console.log('⬅️ Réponse status:', resp.status);
    console.dir(resp.data || resp.raw, { depth: 6 });
  } catch (e) {
    console.error('❌ Erreur requête:', e.message);
  }
})();