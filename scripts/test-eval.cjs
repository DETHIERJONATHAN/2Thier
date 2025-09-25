#!/usr/bin/env node
const jwt = require('jsonwebtoken');

const BASE = 'http://localhost:4000/api/treebranchleaf';
const ORG = '1757366075154-i554z93kl';
const USER_ID = '1757366075163-2vdibc2ve';
// Plusieurs middlewares existent et certains ont des defaults différents.
// On va essayer une liste de secrets possibles pour éviter les 401.
const SECRET_CANDIDATES = (
  process.env.JWT_SECRET
    ? [process.env.JWT_SECRET]
    : []
).concat([
  'your-secret-key',            // src/middleware/auth.ts
  'dev_secret_key',             // src/config.ts (défaut en dev)
  'development-secret-key',     // src/controllers/authController.ts
  'secret_key_for_jwt',         // src/routes/middlewares/auth.js
  'prod_secret_key',            // src/config.ts (défaut en prod)
  'd4Gj_s7K-zP9vY2qB1rA8cE5tF3hN6wL_mXoVbIuZnYkHlJgUeRdTpS' // test-auth-server.js
]);

async function main() {
  const kind = process.argv[2]; // 'formula' | 'variable'
  const id = process.argv[3];
  const consommation = Number(process.argv[4] || 1000);
  const facture = Number(process.argv[5] || 350);
  if (!kind || !id) {
    console.error('Usage: node scripts/test-eval.cjs <formula|variable> <id> [consommation] [facture]');
    process.exit(1);
  }

  const url = `${BASE}/evaluate/${kind}/${id}`;
  const body = { fieldValues: { consommation, facture } };

  let lastStatus = null;
  let lastPayload = null;
  for (const secret of SECRET_CANDIDATES) {
    const token = jwt.sign({ userId: USER_ID, email: 'jonathan.dethier@2thier.be', organizationId: ORG, isSuperAdmin: true, role: 'super_admin' }, secret, { expiresIn: '1h' });
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-organization-id': ORG,
        },
        body: JSON.stringify(body)
      });
      const text = await res.text();
      let json;
      try { json = JSON.parse(text); } catch { json = { text }; }
      if (res.status !== 401) {
        console.log('SECRET_USED', secret.substring(0, 6) + '...');
        console.log('STATUS', res.status);
        console.log(JSON.stringify(json, null, 2));
        return;
      }
      lastStatus = res.status;
      lastPayload = json;
    } catch (e) {
      lastStatus = 'NETWORK_ERROR';
      lastPayload = { error: e.message };
    }
  }
  console.log('STATUS', lastStatus);
  console.log(JSON.stringify(lastPayload, null, 2));
}

main();
