#!/usr/bin/env node
// Génère un token dev puis exécute les scénarios Prix kWh directement (sans dépendre de scripts séparés)

const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const http = require('http');

const prisma = new PrismaClient();

const CONDITION_ID = '043e8767-0042-4032-9a11-34a013b542d0';
const HOST = process.env.HOST || 'localhost';
const PORT = process.env.API_PORT || process.env.PORT || 5173;
const EMAIL = process.env.KWH_EMAIL || 'jonathan.dethier@2thier.be';
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key';

const scenarios = [
  { label: 'Base labels FR complets', fv: { 'Facture annuelle électricité': '1200', 'Consommation annuelle électricité': '4000' } },
  { label: 'Sans accents / minuscules', fv: { 'facture annuelle electricite': '1600', 'consommation annuelle electricite': '5000' } },
  { label: 'Clés compactes', fv: { 'factureannuelleelectricite': '2000', 'consommationannuelleelectricite': '8000' } },
  { label: 'Préfixes mirror', fv: { '__mirror_data_Facture annuelle électricité': '1800', '__mirror_data_Consommation annuelle électricité': '6000' } },
  { label: 'Valeurs avec € et espaces', fv: { 'Facture annuelle électricité': ' 2 400 € ', 'Consommation annuelle électricité': ' 10 000 ' } },
  { label: 'Valeur zéro', fv: { 'Facture annuelle électricité': '0', 'Consommation annuelle électricité': '6000' } },
  { label: 'Valeur non numérique', fv: { 'Facture annuelle électricité': 'ABC', 'Consommation annuelle électricité': '5000' } }
];

function post(path, token, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) };
    if (token) { headers.Authorization = 'Bearer ' + token; headers.Cookie = 'token=' + token; }
    const req = http.request({ hostname: HOST, port: PORT, method: 'POST', path, headers }, res => {
      let chunks='';
      res.on('data', d => chunks+=d);
      res.on('end', () => {
        let data=null; try { data = JSON.parse(chunks); } catch {}
        resolve({ status: res.statusCode, data, raw: chunks });
      });
    });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

(async () => {
  console.log('🔐 Génération token dev pour', EMAIL);
  const user = await prisma.user.findFirst({ where: { email: EMAIL }, select: { id:true, email:true, role:true } });
  if (!user) { console.error('❌ Utilisateur introuvable'); process.exit(1); }
  const token = jwt.sign({ userId: user.id, email: user.email, role: user.role || 'user' }, JWT_SECRET, { expiresIn: '8h' });
  console.log('✅ Token généré (prefix):', token.slice(0,25)+'...');
  console.log('\n===== TEST SCÉNARIOS Prix Kw/h =====');
  for (const sc of scenarios) {
    const resp = await post(`/api/treebranchleaf/evaluate/condition/${CONDITION_ID}`, token, { fieldValues: sc.fv });
    const calc = resp?.data?.calculatedValue || resp?.data?.evaluation?.details?.calculatedValue || resp?.data?.evaluation?.calculatedValue;
    const diag = resp?.data?.evaluation?.details?.fallbackDiagnostics;
    console.log(`\n▶️ ${sc.label}`);
    console.log('Input:', sc.fv);
    console.log('Status:', resp.status, 'Calculated:', calc);
    if (diag) console.log('Diagnostics keysScanned:', diag.keysScanned?.length, 'heuristic:', diag.heuristic);
  }
  await prisma.$disconnect();
})();
