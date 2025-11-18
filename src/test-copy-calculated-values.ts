#!/usr/bin/env node

/**
 * 🧪 SCRIPT - Vérifier que les copies de champs d'affichage lisent la valeur calculée
 *
 * Usage:
 * npx tsx src/test-copy-calculated-values.ts
 *
 * Configurez les constantes ci-dessous pour indiquer l'arbre, le node original et la copie
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:4000/api';

const TREE_ID = process.env.TREE_ID || 'tree-test';
const ORIGINAL_NODE_ID = process.env.ORIGINAL_NODE_ID || 'original-node-id';
const COPIED_NODE_ID = process.env.COPIED_NODE_ID || 'copied-node-id';

async function getCalculatedValue(treeId: string, nodeId: string) {
  try {
    const res = await fetch(`${API_BASE}/tree-nodes/${treeId}/${nodeId}/calculated-value`);
    if (!res.ok) return { ok: false, status: res.status, body: await res.text() };
    const json = await res.json();
    return { ok: true, json };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

async function main() {
  console.log('🧪 Vérification copies -> valeur calculée');
  console.log(`👉 TREE_ID: ${TREE_ID}`);
  console.log(`👉 ORIGINAL_NODE: ${ORIGINAL_NODE_ID}`);
  console.log(`👉 COPIED_NODE: ${COPIED_NODE_ID}`);

  const orig = await getCalculatedValue(TREE_ID, ORIGINAL_NODE_ID);
  const copy = await getCalculatedValue(TREE_ID, COPIED_NODE_ID);

  console.log('--- Résultats ---');
  console.log('Original:', orig);
  console.log('Copy:', copy);

  if (orig.ok && copy.ok) {
    const equal = JSON.stringify(orig.json.value) === JSON.stringify(copy.json.value);
    console.log(equal ? '✅ Les valeurs sont identiques' : '⚠️ Les valeurs diffèrent');
  } else if (orig.ok && !copy.ok) {
    console.log('⚠️ Original a une valeur mais la copie ne répond pas');
  } else if (!orig.ok && copy.ok) {
    console.log('⚠️ La copie a une valeur mais l original non');
  } else {
    console.log('⚠️ Les deux requêtes ont échoué');
  }
}

main().catch(console.error);
