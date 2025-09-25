#!/usr/bin/env node
// Récupère un token utilisable pour les scripts de test.
// Stratégie:
// 1. Tentative POST /api/auth/login (mode simplifié) avec email fourni (ou par défaut)
// 2. Si réponse contient token => affiche et export optionnel
// 3. Sinon fallback POST /api/login si existe (legacy) avec email+password si fournis
// 4. Tente aussi de lire Set-Cookie: token=...
// USAGE:
//   node scripts/get-token.cjs --email=jonathan.dethier@2thier.be [--password=xxx] [--export]

const http = require('http');

const HOST = process.env.HOST || 'localhost';
const PORT = process.env.API_PORT || process.env.PORT || 5173;

// Parse args
const args = process.argv.slice(2);
const argMap = Object.fromEntries(args.map(a => {
  const [k,v] = a.replace(/^--/, '').split('=');
  return [k, v === undefined ? true : v];
}));

const email = argMap.email || 'jonathan.dethier@2thier.be';
const password = argMap.password || argMap.pass || null;
const doExport = !!argMap.export;

function request(method, path, bodyObj) {
  return new Promise((resolve, reject) => {
    const body = bodyObj ? JSON.stringify(bodyObj) : '';
    const headers = { 'Content-Type': 'application/json' };
    if (body) headers['Content-Length'] = Buffer.byteLength(body);
    const req = http.request({ hostname: HOST, port: PORT, path, method, headers }, res => {
      const setCookie = res.headers['set-cookie'] || [];
      let chunks='';
      res.on('data', d => chunks += d);
      res.on('end', () => {
        let data = null;
        try { data = JSON.parse(chunks); } catch {}
        resolve({ status: res.statusCode, data, raw: chunks, setCookie });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function extractCookieToken(setCookieArr) {
  for (const c of setCookieArr) {
    if (!c) continue;
    const m = c.match(/token=([^;]+)/);
    if (m) return m[1];
  }
  return null;
}

(async () => {
  console.log(`🔎 Tentative récupération token sur http://${HOST}:${PORT}`);
  console.log(`➡️  Essai #1: POST /api/auth/login (email+password si fourni) email=${email}`);
  let body1 = password ? { email, password } : { email, password: 'dummy' };
  let resp = await request('POST', '/api/auth/login', body1);
  let token = resp?.data?.token || extractCookieToken(resp.setCookie);
  if (token) {
    console.log('✅ Token obtenu (méthode auth/login)');
  } else {
    console.log('⚠️  Pas de token dans /api/auth/login (status', resp.status + ')');
    console.log('Réponse:', resp.data || resp.raw);
    // Essai /api/login (legacy) -- accepte peut-être email seul si mode dev
    if (password) {
      console.log(`➡️  Essai #2: POST /api/login (legacy) email+password`);
      resp = await request('POST', '/api/login', { email, password });
      token = resp?.data?.token || extractCookieToken(resp.setCookie);
      if (token) {
        console.log('✅ Token obtenu via /api/login');
      } else {
        console.log('❌ Toujours pas de token (status', resp.status + ')');
        console.log('Réponse:', resp.data || resp.raw);
        process.exit(1);
      }
    } else {
      console.log('➡️  Essai #2: POST /api/login (legacy) email seul');
      resp = await request('POST', '/api/login', { email });
      token = resp?.data?.token || extractCookieToken(resp.setCookie);
      if (token) {
        console.log('✅ Token obtenu via /api/login (email seul)');
      } else {
        console.log('❌ Pas de token via /api/login non plus (status', resp.status + ')');
        console.log('Réponse:', resp.data || resp.raw);
        process.exit(1);
      }
    }
  }

  if (!token) {
    console.log('❌ Impossible d’obtenir un token. Abandon.');
    process.exit(1);
  }

  console.log('\n🔐 TOKEN (tronqué):', token.substring(0, 30) + '...');
  if (doExport) {
    // Affiche commande powershell prête à copier
    console.log(`\nPour PowerShell, exécute: \n$Env:TOKEN = "${token}"`);
  }
  console.log('\n➡️  Pour relancer tests: npm run test:kwh');
})();
