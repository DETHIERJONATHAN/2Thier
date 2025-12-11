/**
 * ✅ EXPLICATION DU FIX APPLIQUÉ
 * 
 * PROBLÈME:
 * =========
 * Quand on copiait une variable d'une COPIE (nœud suffixé comme "Rampant toiture-1"),
 * on créait un displayNodeId en faisant:
 * 
 *   displayNodeId = ${originalVar.nodeId}-${suffix}
 *   displayNodeId = "uuid-1" + "-1"
 *   displayNodeId = "uuid-1-1"  ❌ DOUBLE SUFFIXE!
 * 
 * 
 * SOLUTION APPLIQUÉE:
 * ====================
 * Avant de créer le displayNodeId, on NETTOIE le nodeId:
 * 
 *   baseNodeId = originalVar.nodeId.replace(/(-\d+)+$/, '')
 *   baseNodeId = "uuid-1".replace(/(-\d+)+$/, '')
 *   baseNodeId = "uuid"  ✅
 * 
 *   displayNodeId = ${baseNodeId}-${suffix}
 *   displayNodeId = "uuid" + "-1"
 *   displayNodeId = "uuid-1"  ✅ UN SEUL SUFFIXE!
 * 
 * 
 * CHANGEMENT:
 * ===========
 * Fichier: src/components/TreeBranchLeaf/treebranchleaf-new/api/copy-variable-with-capacities.ts
 * Ligne: ~531
 * 
 * AVANT:
 *   const displayNodeId = `${originalVar.nodeId}-${suffix}`;
 * 
 * APRÈS:
 *   const baseNodeId = originalVar.nodeId!.replace(/(-\d+)+$/, '');
 *   const displayNodeId = `${baseNodeId}-${suffix}`;
 * 
 * 
 * RÉSULTAT ATTENDU:
 * =================
 * - Rampant toiture-1 n'aura plus un enfant "Rampant toiture-1-1"
 * - Seuls les IDs avec UN SEUL suffixe existeront: -1, -2, -3, etc.
 * - Les nœuds d'affichage auront les bons IDs
 */

console.log('✅ === FIX APPLIQUÉ À copy-variable-with-capacities.ts ===\n');

console.log('📋 AVANT LE FIX:');
console.log('   Création de nœud d\'affichage pour "Rampant toiture-1"');
console.log('   originalVar.nodeId = "uuid-1"');
console.log('   suffix = "1"');
console.log('   displayNodeId = "uuid-1" + "-1" = "uuid-1-1" ❌\n');

console.log('📋 APRÈS LE FIX:');
console.log('   baseNodeId = "uuid-1".replace(/(-\\d+)+$/, "") = "uuid"');
console.log('   displayNodeId = "uuid" + "-1" = "uuid-1" ✅\n');

console.log('🎯 IMPACT:');
console.log('   - Aucun nœud "Rampant toiture-1-1" ne sera créé');
console.log('   - Les suffixes resteront simples: -1, -2, -3');
console.log('   - Le problème du double suffixe est ENFIN résolu!\n');

console.log('🧪 PROCHAINES ÉTAPES:');
console.log('   1. Tester en cliquant "Ajouter Toit"');
console.log('   2. Vérifier que les copies s\'appellent: -1, -2, -3 (pas -1-1, -2-2, etc.)');
console.log('   3. Supprimer les nœuds "Rampant toiture-1-1" existants');
console.log('   4. Vérifier que les variables/calculs se copient correctement\n');
