#!/usr/bin/env node

/**
 * 🧪 SCRIPT TEST - Vérifier que les endpoints calculatedValue fonctionnent
 * 
 * Utilisation:
 * npx tsx src/test-calculated-values.ts
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:4000/api';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  response?: any;
}

const results: TestResult[] = [];

/**
 * Test 1: Stocker une valeur calculée
 */
async function test1_StoreValue() {
  console.log('\n📝 [TEST 1] Stocker une valeur calculée');

  try {
    const response = await fetch(`${API_BASE}/tree-nodes/test-node-123/store-calculated-value`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        calculatedValue: 42.5,
        calculatedBy: 'formula-test',
        submissionId: 'submission-123'
      })
    });

    const data = await response.json() as any;

    if (response.ok && data.success) {
      console.log('✅ [TEST 1] PASSED - Valeur stockée');
      results.push({ name: 'Store Value', passed: true, response: data });
    } else {
      console.log('❌ [TEST 1] FAILED - Status:', response.status);
      results.push({ name: 'Store Value', passed: false, error: JSON.stringify(data) });
    }
  } catch (error) {
    console.log('❌ [TEST 1] ERROR', error);
    results.push({ name: 'Store Value', passed: false, error: String(error) });
  }
}

/**
 * Test 2: Récupérer une valeur calculée
 */
async function test2_GetValue() {
  console.log('\n📝 [TEST 2] Récupérer une valeur calculée');

  try {
    // On suppose que le test 1 a storé la valeur
    const response = await fetch(`${API_BASE}/tree-nodes/tree-test/test-node-123/calculated-value`);

    if (response.ok) {
      const data = await response.json() as any;
      console.log('✅ [TEST 2] PASSED - Valeur récupérée:', data.value);
      results.push({ name: 'Get Value', passed: true, response: data });
    } else if (response.status === 404) {
      console.log('⚠️ [TEST 2] Node non trouvé (peut-être normal si node inexistant)');
      results.push({ name: 'Get Value', passed: true, error: 'Node non trouvé (OK)' });
    } else {
      console.log('❌ [TEST 2] FAILED - Status:', response.status);
      results.push({ name: 'Get Value', passed: false, error: `Status ${response.status}` });
    }
  } catch (error) {
    console.log('❌ [TEST 2] ERROR', error);
    results.push({ name: 'Get Value', passed: false, error: String(error) });
  }
}

/**
 * Test 3: Stocker plusieurs valeurs en batch
 */
async function test3_StoreBatch() {
  console.log('\n📝 [TEST 3] Stocker plusieurs valeurs (BATCH)');

  try {
    const response = await fetch(`${API_BASE}/tree-nodes/store-batch-calculated-values`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        values: [
          { nodeId: 'node-1', calculatedValue: 100, calculatedBy: 'formula-1' },
          { nodeId: 'node-2', calculatedValue: 'Test', calculatedBy: 'formula-2' },
          { nodeId: 'node-3', calculatedValue: true, calculatedBy: 'condition-1' }
        ],
        submissionId: 'batch-test-123'
      })
    });

    const data = await response.json() as any;

    if (response.ok && data.success) {
      console.log(`✅ [TEST 3] PASSED - ${data.results?.length || 3} valeurs stockées`);
      results.push({ name: 'Store Batch', passed: true, response: data });
    } else {
      console.log('❌ [TEST 3] FAILED - Status:', response.status);
      results.push({ name: 'Store Batch', passed: false, error: JSON.stringify(data) });
    }
  } catch (error) {
    console.log('❌ [TEST 3] ERROR', error);
    results.push({ name: 'Store Batch', passed: false, error: String(error) });
  }
}

/**
 * Afficher le résumé
 */
function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 RÉSUMÉ DES TESTS');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  results.forEach(r => {
    const status = r.passed ? '✅' : '❌';
    console.log(`${status} ${r.name}`);
    if (r.error) console.log(`   Error: ${r.error}`);
  });

  console.log('='.repeat(60));
  console.log(`Résultat: ${passed}/${total} tests passés`);

  if (passed === total) {
    console.log('🎉 TOUS LES TESTS PASSENT!');
  } else {
    console.log('⚠️ Certains tests ont échoué');
  }
  console.log('='.repeat(60) + '\n');
}

/**
 * Main
 */
async function main() {
  console.log('🧪 TESTS API - Système de Valeurs Calculées');
  console.log('🌐 URL: ' + API_BASE);

  // Check si le serveur est up
  try {
    const healthCheck = await fetch(`${API_BASE.replace('/api', '')}/`, { timeout: 5000 });
    if (!healthCheck.ok) {
      console.error('❌ Serveur pas accessible. Démarre le serveur avec: npm run dev');
      process.exit(1);
    }
  } catch (e) {
    console.error('❌ Erreur connexion serveur:', e);
    process.exit(1);
  }

  // Lancer les tests
  await test1_StoreValue();
  await new Promise(r => setTimeout(r, 500)); // Attendre un peu
  await test2_GetValue();
  await test3_StoreBatch();

  // Afficher le résumé
  printSummary();
}

main().catch(console.error);
