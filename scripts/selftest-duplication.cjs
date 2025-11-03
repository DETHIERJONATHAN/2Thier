#!/usr/bin/env node
/*
  Smoke-test duplication & display creation via HTTP API
  Usage (PowerShell):
  node scripts/selftest-duplication.cjs --base http://localhost:4000 --nodeId <NODE_ID> --variableId <VARIABLE_ID> --suffix 1 [--noDuplicateNode] [--targetNodeId <ID>]
*/

const { exit } = require('process');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        args[key] = true;
      } else {
        args[key] = next;
        i++;
      }
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const base = args.base || 'http://localhost:4000';
  const nodeId = args.nodeId;
  const variableId = args.variableId;
  const suffix = args.suffix ? Number(args.suffix) : 1;
  const noDuplicateNode = Boolean(args.noDuplicateNode);
  const targetNodeId = args.targetNodeId || undefined;

  if (!nodeId || !variableId) {
    console.error('Usage: --nodeId <NODE_ID> --variableId <VARIABLE_ID> [--suffix 1] [--noDuplicateNode] [--targetNodeId <ID>]');
    exit(2);
  }

  const url = `${base}/api/treebranchleaf/nodes/${encodeURIComponent(nodeId)}/copy-linked-variable`;
  const body = {
    variableId,
    newSuffix: suffix,
    duplicateNode: !noDuplicateNode,
    ...(targetNodeId ? { targetNodeId } : {})
  };

  console.log('→ POST', url);
  console.log('Body:', body);

  // Global fetch is available in Node 18+
  if (typeof fetch !== 'function') {
    console.error('This script requires Node.js >= 18 (global fetch).');
    exit(3);
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }

  console.log('Status:', res.status);
  console.log('Response:', json);

  if (!res.ok || !json || json.success === false || json.error) {
    console.error('❌ copy-linked-variable failed');
    exit(1);
  }

  const newVarId = json.variableId;
  if (!newVarId) {
    console.error('❌ Missing variableId in response');
    exit(1);
  }

  // Check display existence
  const displayId = `display-${newVarId}`;
  const getUrl = `${base}/api/treebranchleaf/nodes/${encodeURIComponent(displayId)}`;
  console.log('→ GET', getUrl);
  const getRes = await fetch(getUrl);
  const getText = await getRes.text();
  let getJson;
  try { getJson = JSON.parse(getText); } catch { getJson = { raw: getText }; }
  console.log('Status:', getRes.status);
  console.log('Response:', getJson);

  if (getRes.status !== 200) {
    console.error('❌ Display node not found');
    exit(1);
  }

  console.log('✅ Smoke test passed. Variable and display created.');
  exit(0);
}

main().catch((e) => {
  console.error('Unexpected error:', e);
  exit(1);
});
