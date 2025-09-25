#!/usr/bin/env node
// Matrix de tests heuristique Prix Kw/h
// Lance plusieurs combinaisons de noms de clés pour voir lesquelles déclenchent le calcul.

const http = require('http');
const CONDITION_ID = '043e8767-0042-4032-9a11-34a013b542d0';
const PORT = process.env.API_PORT || process.env.PORT || 5173;
const HOST = 'localhost';
const TOKEN = process.env.TOKEN;

const scenarios = [
  {
    label: 'Base labels FR complets',
    fieldValues: {
      'Facture annuelle électricité': '1200',
      'Consommation annuelle électricité': '4000'
    }
  },
  {
    label: 'Sans accents / minuscules',
    fieldValues: {
      'facture annuelle electricite': '1600',
      'consommation annuelle electricite': '5000'
    }
  },
  {
    label: 'Clés normalisées compactes',
    fieldValues: {
      'factureannuelleelectricite': '2000',
      'consommationannuelleelectricite': '8000'
    }
  },
  {
    label: 'Préfixes mirror + labels',
    fieldValues: {
      '__mirror_data_Facture annuelle électricité': '1800',
      '__mirror_data_Consommation annuelle électricité': '6000'
    }
  },
  {
    label: 'Valeurs avec € et espaces',
    fieldValues: {
      'Facture annuelle électricité': ' 2 400 € ',
      'Consommation annuelle électricité': ' 10 000 '
    }
  },
  {
    label: 'Valeur zéro (doit échouer)',
    fieldValues: {
      'Facture annuelle électricité': '0',
      'Consommation annuelle électricité': '6000'
    }
  },
  {
    label: 'Valeur non numérique (échoue)',
    fieldValues: {
      'Facture annuelle électricité': 'ABC',
      'Consommation annuelle électricité': '5000'
    }
  }
];

function post(path, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) };
    if (TOKEN) {
      headers['Authorization'] = 'Bearer ' + TOKEN;
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
  console.log('===== MATRIX TEST Prix Kw/h =====');
  if (!TOKEN) {
    console.log('⚠️  Aucun TOKEN fourni (env TOKEN). Les requêtes renverront sûrement 401.');
  }
  for (const sc of scenarios) {
    const resp = await post(`/api/treebranchleaf/evaluate/condition/${CONDITION_ID}`, { fieldValues: sc.fieldValues });
    const calc = resp?.data?.calculatedValue || resp?.data?.evaluation?.details?.calculatedValue;
    const diag = resp?.data?.evaluation?.details?.fallbackDiagnostics;
    console.log(`\n▶️ Scenario: ${sc.label}`);
    console.log('Input:', sc.fieldValues);
    console.log('Status:', resp.status, 'Calculated:', calc);
    console.log('Diagnostics:', diag);
  }
})();