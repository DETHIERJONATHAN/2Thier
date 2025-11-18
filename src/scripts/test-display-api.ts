#!/usr/bin/env node

/**
 * 🌐 SCRIPT TEST API - Endpoints d'affichage
 * 
 * Teste tous les endpoints API liés aux champs d'affichage:
 * - GET /api/tree-nodes/:treeId/:nodeId/calculated-value
 * - GET /api/treebranchleaf/trees/:treeId/nodes (pour vérifier les nœuds)
 * - Autres endpoints liés
 * 
 * Usage: npx tsx src/scripts/test-display-api.ts
 */

import fetch from 'node-fetch';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE = 'http://localhost:4000/api';

interface ApiTestResult {
  endpoint: string;
  status: number;
  success: boolean;
  data?: any;
  error?: string;
  responseTime: number;
}

async function testEndpoint(url: string, options: any = {}): Promise<ApiTestResult> {
  const startTime = Date.now();
  
  try {
    console.log(`🌐 Testing: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'x-organization-id': 'test-org-placeholder',
        ...options.headers
      },
      ...options
    });
    
    const responseTime = Date.now() - startTime;
    const success = response.ok;
    
    let data;
    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    console.log(`   Status: ${response.status} (${responseTime}ms)`);
    if (success && data) {
      console.log(`   ✅ Success:`, typeof data === 'object' ? Object.keys(data) : data);
    } else {
      console.log(`   ❌ Error:`, data?.error || response.statusText);
    }

    return {
      endpoint: url,
      status: response.status,
      success,
      data: data || response.statusText,
      responseTime
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.log(`   ❌ Request failed: ${error}`);
    
    return {
      endpoint: url,
      status: 0,
      success: false,
      error: String(error),
      responseTime
    };
  }
}

async function main() {
  console.log('🌐 === TEST ENDPOINTS API D\'AFFICHAGE ===\n');

  try {
    // 1. Vérifier qu'on a des données de test
    console.log('🔍 1. Vérification données de test...');
    
    const tree = await prisma.treeBranchLeafTree.findFirst({
      where: { name: { contains: 'Test Affichage' } },
      orderBy: { createdAt: 'desc' }
    });

    if (!tree) {
      console.log('❌ Aucune donnée de test trouvée.');
      console.log('Exécutez d\'abord: npx tsx src/scripts/create-test-display-data.ts');
      return;
    }

    console.log(`✅ Arbre de test trouvé: ${tree.name} (${tree.id})`);

    // 2. Récupérer les nœuds de test
    const nodes = await prisma.treeBranchLeafNode.findMany({
      where: { treeId: tree.id },
      select: { id: true, label: true, type: true, calculatedValue: true }
    });

    console.log(`📊 ${nodes.length} nœuds trouvés`);

    const results: ApiTestResult[] = [];

    // 3. Tester l'endpoint des nœuds d'arbre
    console.log('\n🌳 3. Test GET /api/treebranchleaf/trees/:treeId/nodes');
    const nodesResult = await testEndpoint(`${API_BASE}/treebranchleaf/trees/${tree.id}/nodes`);
    results.push(nodesResult);

    if (nodesResult.success) {
      console.log(`   📊 Nœuds retournés: ${Array.isArray(nodesResult.data) ? nodesResult.data.length : 'Format inattendu'}`);
    }

    // 4. Tester l'endpoint des arbres
    console.log('\n🌳 4. Test GET /api/treebranchleaf/trees');
    const treesResult = await testEndpoint(`${API_BASE}/treebranchleaf/trees`);
    results.push(treesResult);

    // 5. Tester les valeurs calculées pour chaque nœud
    console.log('\n💾 5. Test calculated-value pour chaque nœud...');
    
    for (const node of nodes.slice(0, 5)) { // Limiter à 5 pour éviter le spam
      const calcResult = await testEndpoint(`${API_BASE}/tree-nodes/${tree.id}/${node.id}/calculated-value`);
      results.push(calcResult);
      
      if (calcResult.success) {
        console.log(`      Nœud ${node.label}: ${JSON.stringify(calcResult.data?.value || 'pas de valeur')}`);
      }
    }

    // 6. Tester un endpoint de stockage si on peut
    console.log('\n💾 6. Test POST store-calculated-value...');
    
    const firstNode = nodes[0];
    if (firstNode) {
      const storeResult = await testEndpoint(`${API_BASE}/tree-nodes/${firstNode.id}/store-calculated-value`, {
        method: 'POST',
        body: JSON.stringify({
          calculatedValue: 'TEST-VALUE-123',
          calculatedBy: 'api-test'
        })
      });
      results.push(storeResult);
    }

    // 7. Tester l'endpoint des soumissions
    console.log('\n📝 7. Test soumissions...');
    
    const submission = await prisma.treeBranchLeafSubmission.findFirst({
      where: { treeId: tree.id }
    });

    if (submission) {
      const submissionResult = await testEndpoint(`${API_BASE}/treebranchleaf/submissions/${submission.id}`);
      results.push(submissionResult);
    }

    // 8. Résumé des résultats
    console.log('\n📊 === RÉSUMÉ DES TESTS ===');
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

    console.log(`✅ Succès: ${successful}/${results.length}`);
    console.log(`❌ Échecs: ${failed}/${results.length}`);
    console.log(`⏱️  Temps de réponse moyen: ${avgResponseTime.toFixed(0)}ms`);

    // 9. Détails des échecs
    const failures = results.filter(r => !r.success);
    if (failures.length > 0) {
      console.log('\n❌ DÉTAILS DES ÉCHECS:');
      failures.forEach(f => {
        console.log(`   ${f.endpoint}`);
        console.log(`      Status: ${f.status}`);
        console.log(`      Error: ${f.error || f.data}`);
      });
    }

    // 10. Recommandations
    console.log('\n🔧 === RECOMMANDATIONS ===');
    
    if (failed === 0) {
      console.log('✅ Tous les tests API ont réussi !');
      console.log('   → Les endpoints d\'affichage fonctionnent correctement');
    } else {
      console.log('❌ Certains endpoints échouent:');
      
      const calc404 = failures.find(f => f.endpoint.includes('calculated-value') && f.status === 404);
      if (calc404) {
        console.log('   → Endpoint calculated-value non trouvé (404)');
        console.log('   → Vérifier que le controller est monté dans api-server.ts');
      }

      const calc500 = failures.find(f => f.endpoint.includes('calculated-value') && f.status === 500);
      if (calc500) {
        console.log('   → Erreur serveur sur calculated-value (500)');
        console.log('   → Vérifier les logs serveur et la base de données');
      }

      const authErrors = failures.filter(f => f.status === 401 || f.status === 403);
      if (authErrors.length > 0) {
        console.log('   → Erreurs d\'authentification');
        console.log('   → Vérifier les headers x-organization-id et l\'auth middleware');
      }
    }

    console.log('\n🎯 Pour déboguer plus en détail:');
    console.log('   npx tsx src/scripts/debug-display-fields.ts');
    console.log('   npx tsx src/scripts/test-display-real-time.ts');

  } catch (error) {
    console.error('❌ Erreur pendant les tests API:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);