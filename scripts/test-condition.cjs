#!/usr/bin/env node
/*
  Testeur de conditions TBL
  Usage:
    node scripts/test-condition.cjs <condition|node> <id> [--then key=val,...] [--else key=val,...]

  Exemples:
    node scripts/test-condition.cjs condition 043e8767-... --then consommation=1000,facture=350 --else consommation=0,facture=350
    node scripts/test-condition.cjs node 10bfb6d2-... --then consommation=1000,facture=350 --else consommation=0,facture=350
*/

const jwt = require('jsonwebtoken');
const fetch = global.fetch || ((...args) => import('node-fetch').then(({ default: f }) => f(...args)));

const BASE = 'http://localhost:4000/api/treebranchleaf';
const ORG = process.env.ORG_ID || '1757366075154-i554z93kl';
const USER_ID = process.env.USER_ID || '1757366075163-2vdibc2ve';
const SECRET_CANDIDATES = (process.env.JWT_SECRET ? [process.env.JWT_SECRET] : []).concat([
  'your-secret-key',
  'dev_secret_key',
  'development-secret-key',
  'secret_key_for_jwt',
  'prod_secret_key',
  'd4Gj_s7K-zP9vY2qB1rA8cE5tF3hN6wL_mXoVbIuZnYkHlJgUeRdTpS'
]);

function parseFieldsArg(arg) {
  if (!arg) return null;
  // Support JSON direct
  if ((arg.startsWith('{') && arg.endsWith('}')) || (arg.startsWith('[') && arg.endsWith(']'))) {
    try { return JSON.parse(arg); } catch { /* ignore */ }
  }
  // Format key=val,key=val
  const obj = {};
  for (const pair of arg.split(',')) {
    const [k, v] = pair.split('=').map(s => (s || '').trim());
    if (!k) continue;
    if (v === undefined) { obj[k] = null; continue; }
    const n = Number(v);
    obj[k] = Number.isFinite(n) ? n : v;
  }
  return obj;
}

async function authedFetch(url, options, secrets = SECRET_CANDIDATES) {
  let last = { status: null, json: null };
  for (const secret of secrets) {
    const token = jwt.sign(
      { userId: USER_ID, email: 'jonathan.dethier@2thier.be', organizationId: ORG, isSuperAdmin: true, role: 'super_admin' },
      secret,
      { expiresIn: '10m' }
    );
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-organization-id': ORG,
          ...(options && options.headers ? options.headers : {})
        }
      });
      const text = await res.text();
      let json; try { json = JSON.parse(text); } catch { json = { text }; }
      if (res.status !== 401) {
        return { ok: true, status: res.status, json, secretUsed: secret };
      }
      last = { status: res.status, json };
    } catch (e) {
      last = { status: 'NETWORK_ERROR', json: { error: e.message } };
    }
  }
  return { ok: false, ...last };
}

async function getNodeInfo(nodeId) {
  return authedFetch(`${BASE}/nodes/${nodeId}`, { method: 'GET' });
}

async function getNodeData(treeId, nodeId) {
  return authedFetch(`${BASE}/trees/${treeId}/nodes/${nodeId}/data`, { method: 'GET' });
}

async function evalCondition(conditionId, fieldValues) {
  return authedFetch(`${BASE}/evaluate/condition/${conditionId}`, {
    method: 'POST',
    body: JSON.stringify({ fieldValues, testMode: true })
  });
}

async function evalVariable(nodeId, fieldValues) {
  return authedFetch(`${BASE}/evaluate/variable/${nodeId}`, {
    method: 'POST',
    body: JSON.stringify({ fieldValues })
  });
}

function printSection(title, data) {
  console.log(`\n===== ${title} =====`);
  console.log(JSON.stringify(data, null, 2));
}

async function main() {
  const mode = process.argv[2]; // 'condition' | 'node'
  const id = process.argv[3];
  const thenIdx = process.argv.indexOf('--then');
  const elseIdx = process.argv.indexOf('--else');
  const thenArg = thenIdx > -1 ? process.argv[thenIdx + 1] : null;
  const elseArg = elseIdx > -1 ? process.argv[elseIdx + 1] : null;

  if (!mode || !id || !['condition', 'node'].includes(mode)) {
    console.error('Usage: node scripts/test-condition.cjs <condition|node> <id> [--then key=val,...] [--else key=val,...]');
    process.exit(1);
  }

  const thenValues = parseFieldsArg(thenArg) || { consommation: 1000, facture: 350 };
  const elseValues = parseFieldsArg(elseArg) || { consommation: 0, facture: 350 };

  if (mode === 'condition') {
    const r1 = await evalCondition(id, thenValues);
    if (!r1.ok) { console.error('Condition THEN test failed', r1); process.exit(1); }
    console.log('SECRET_USED', r1.secretUsed.substring(0, 6) + '...');
    printSection('CONDITION THEN', { status: r1.status, result: r1.json });

    const r2 = await evalCondition(id, elseValues);
    printSection('CONDITION ELSE', { status: r2.status, result: r2.json });
    process.exit(0);
  }

  // mode === 'node'
  const info = await getNodeInfo(id);
  if (!info.ok) { console.error('Node info failed', info); process.exit(1); }
  const { treeId, label } = info.json || {};
  printSection('NODE INFO', info.json);

  if (!treeId) {
    console.error('treeId introuvable pour ce node');
  } else {
    const data = await getNodeData(treeId, id);
    printSection('NODE DATA', data.json);
  }

  const v1 = await evalVariable(id, thenValues);
  if (!v1.ok) { console.error('Variable THEN test failed', v1); process.exit(1); }
  console.log('SECRET_USED', v1.secretUsed.substring(0, 6) + '...');
  printSection('VARIABLE THEN', { status: v1.status, result: v1.json });

  const v2 = await evalVariable(id, elseValues);
  printSection('VARIABLE ELSE', { status: v2.status, result: v2.json });
}

main();
