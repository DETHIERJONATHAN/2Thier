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
import { db } from '../lib/database';
import { logger } from '../lib/logger';

const prisma = db;
const API_BASE = 'http://localhost:4000/api';

interface ApiTestResult {
  endpoint: string;
  status: number;
  success: boolean;
  data?: unknown;
  error?: string;
  responseTime: number;
}

async function testEndpoint(url: string, options: unknown = {}): Promise<ApiTestResult> {
  const startTime = Date.now();
  
  try {
    logger.debug(`🌐 Testing: ${url}`);
    
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

    logger.debug(`   Status: ${response.status} (${responseTime}ms)`);
    if (success && data) {
      logger.debug(`   ✅ Success:`, typeof data === 'object' ? Object.keys(data) : data);
    } else {
      logger.debug(`   ❌ Error:`, data?.error || response.statusText);
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
    logger.debug(`   ❌ Request failed: ${error}`);
    
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
  logger.debug('🌐 === TEST ENDPOINTS API D\'AFFICHAGE ===\n');

  try {
    // 1. Vérifier qu'on a des données de test
    logger.debug('🔍 1. Vérification données de test...');
    
    const tree = await prisma.treeBranchLeafTree.findFirst({
      where: { name: { contains: 'Test Affichage' } },
      orderBy: { createdAt: 'desc' }
    });

    if (!tree) {
      logger.debug('❌ Aucune donnée de test trouvée.');
      logger.debug('Exécutez d\'abord: npx tsx src/scripts/create-test-display-data.ts');
      return;
    }

    logger.debug(`✅ Arbre de test trouvé: ${tree.name} (${tree.id})`);

    // 2. Récupérer les nœuds de test
    const nodes = await prisma.treeBranchLeafNode.findMany({
      where: { treeId: tree.id },
      select: { id: true, label: true, type: true, calculatedValue: true }
    });

    logger.debug(`📊 ${nodes.length} nœuds trouvés`);

    const results: ApiTestResult[] = [];

    // 3. Tester l'endpoint des nœuds d'arbre
    logger.debug('\n🌳 3. Test GET /api/treebranchleaf/trees/:treeId/nodes');
    const nodesResult = await testEndpoint(`${API_BASE}/treebranchleaf/trees/${tree.id}/nodes`);
    results.push(nodesResult);

    if (nodesResult.success) {
      logger.debug(`   📊 Nœuds retournés: ${Array.isArray(nodesResult.data) ? nodesResult.data.length : 'Format inattendu'}`);
    }

    // 4. Tester l'endpoint des arbres
    logger.debug('\n🌳 4. Test GET /api/treebranchleaf/trees');
    const treesResult = await testEndpoint(`${API_BASE}/treebranchleaf/trees`);
    results.push(treesResult);

    // 5. Tester les valeurs calculées pour chaque nœud
    logger.debug('\n💾 5. Test calculated-value pour chaque nœud...');
    
    for (const node of nodes.slice(0, 5)) { // Limiter à 5 pour éviter le spam
      const calcResult = await testEndpoint(`${API_BASE}/tree-nodes/${tree.id}/${node.id}/calculated-value`);
      results.push(calcResult);
      
      if (calcResult.success) {
        logger.debug(`      Nœud ${node.label}: ${JSON.stringify(calcResult.data?.value || 'pas de valeur')}`);
      }
    }

    // 6. Tester un endpoint de stockage si on peut
    logger.debug('\n💾 6. Test POST store-calculated-value...');
    
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
    logger.debug('\n📝 7. Test soumissions...');
    
    const submission = await prisma.treeBranchLeafSubmission.findFirst({
      where: { treeId: tree.id }
    });

    if (submission) {
      const submissionResult = await testEndpoint(`${API_BASE}/treebranchleaf/submissions/${submission.id}`);
      results.push(submissionResult);
    }

    // 8. Résumé des résultats
    logger.debug('\n📊 === RÉSUMÉ DES TESTS ===');
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

    logger.debug(`✅ Succès: ${successful}/${results.length}`);
    logger.debug(`❌ Échecs: ${failed}/${results.length}`);
    logger.debug(`⏱️  Temps de réponse moyen: ${avgResponseTime.toFixed(0)}ms`);

    // 9. Détails des échecs
    const failures = results.filter(r => !r.success);
    if (failures.length > 0) {
      logger.debug('\n❌ DÉTAILS DES ÉCHECS:');
      failures.forEach(f => {
        logger.debug(`   ${f.endpoint}`);
        logger.debug(`      Status: ${f.status}`);
        logger.debug(`      Error: ${f.error || f.data}`);
      });
    }

    // 10. Recommandations
    logger.debug('\n🔧 === RECOMMANDATIONS ===');
    
    if (failed === 0) {
      logger.debug('✅ Tous les tests API ont réussi !');
      logger.debug('   → Les endpoints d\'affichage fonctionnent correctement');
    } else {
      logger.debug('❌ Certains endpoints échouent:');
      
      const calc404 = failures.find(f => f.endpoint.includes('calculated-value') && f.status === 404);
      if (calc404) {
        logger.debug('   → Endpoint calculated-value non trouvé (404)');
        logger.debug('   → Vérifier que le controller est monté dans api-server.ts');
      }

      const calc500 = failures.find(f => f.endpoint.includes('calculated-value') && f.status === 500);
      if (calc500) {
        logger.debug('   → Erreur serveur sur calculated-value (500)');
        logger.debug('   → Vérifier les logs serveur et la base de données');
      }

      const authErrors = failures.filter(f => f.status === 401 || f.status === 403);
      if (authErrors.length > 0) {
        logger.debug('   → Erreurs d\'authentification');
        logger.debug('   → Vérifier les headers x-organization-id et l\'auth middleware');
      }
    }

    logger.debug('\n🎯 Pour déboguer plus en détail:');
    logger.debug('   npx tsx src/scripts/debug-display-fields.ts');
    logger.debug('   npx tsx src/scripts/test-display-real-time.ts');

  } catch (error) {
    logger.error('❌ Erreur pendant les tests API:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(logger.error);