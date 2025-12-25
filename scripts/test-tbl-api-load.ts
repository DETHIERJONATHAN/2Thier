/**
 * 🔍 Script de diagnostic - Charge API TBL
 * 
 * Ce script analyse pourquoi TBL fait autant de requêtes API au chargement
 * et propose des solutions de batching.
 */

import { db } from '../src/lib/database';

async function analyzeTreeNodes() {
  console.log('🔍 Analyse de la structure TBL...\n');
  
  // Récupérer le tree principal
  const tree = await db.treeBranchLeafTree.findFirst({
    orderBy: { createdAt: 'desc' }
  });
  
  if (!tree) {
    console.log('❌ Aucun tree trouvé');
    return;
  }
  
  console.log(`📦 Tree: ${tree.name} (${tree.id})`);
  
  // Compter les noeuds
  const nodesCount = await db.treeBranchLeafNode.count({
    where: { treeId: tree.id }
  });
  
  // Compter les noeuds avec formules
  const nodesWithFormulas = await db.nodeFormula.groupBy({
    by: ['nodeId'],
    _count: true
  });
  
  // Compter les noeuds calculés
  const calculatedNodes = await db.treeBranchLeafNode.count({
    where: {
      treeId: tree.id,
      OR: [
        { fieldType: 'calculated' },
        { fieldType: { contains: 'calc' } }
      ]
    }
  });
  
  console.log(`\n📊 Statistiques:`);
  console.log(`   - Noeuds totaux: ${nodesCount}`);
  console.log(`   - Noeuds avec formules: ${nodesWithFormulas.length}`);
  console.log(`   - Noeuds calculés: ${calculatedNodes}`);
  
  // Estimer les requêtes API
  const estimatedRequests = {
    nodeData: nodesCount,                    // /nodes/{id}/data
    formulas: nodesWithFormulas.length,      // /nodes/{id}/formulas  
    calculatedValue: calculatedNodes,        // /tree-nodes/{id}/calculated-value
    selectConfig: Math.floor(nodesCount * 0.3), // ~30% sont des selects
  };
  
  const totalEstimated = Object.values(estimatedRequests).reduce((a, b) => a + b, 0);
  
  console.log(`\n📈 Requêtes API estimées au chargement:`);
  console.log(`   - Node data: ${estimatedRequests.nodeData}`);
  console.log(`   - Formulas: ${estimatedRequests.formulas}`);
  console.log(`   - Calculated values: ${estimatedRequests.calculatedValue}`);
  console.log(`   - Select configs: ${estimatedRequests.selectConfig}`);
  console.log(`   ━━━━━━━━━━━━━━━━━━`);
  console.log(`   TOTAL: ~${totalEstimated} requêtes`);
  
  console.log(`\n💡 Recommandations:`);
  if (totalEstimated > 50) {
    console.log(`   ⚠️ Trop de requêtes! Implémenter du batching:`);
    console.log(`   1. GET /api/treebranchleaf/trees/{treeId}/all-formulas (batch)`);
    console.log(`   2. GET /api/treebranchleaf/trees/{treeId}/all-calculated-values (batch)`);
    console.log(`   3. Précharger les select-config dans le tree principal`);
  } else {
    console.log(`   ✅ Nombre de requêtes acceptable`);
  }
  
  console.log(`\n✅ Analyse terminée`);
}

// Exécuter
analyzeTreeNodes()
  .catch(console.error)
  .finally(() => process.exit(0));
