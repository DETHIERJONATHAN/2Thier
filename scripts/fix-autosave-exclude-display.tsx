/**
 * 🎯 FIX AUTOSAVE: Exclure les champs display du rechargement
 * 
 * PROBLÈME:
 * - Lors du chargement d'un devis, TOUS les champs sont rechargés dans formData
 * - Les champs display (calculatedValue) sont écrasés avec des valeurs statiques
 * - Les champs display doivent rester dynamiques et calculer automatiquement
 * 
 * SOLUTION:
 * - Filtrer les champs display lors du rechargement
 * - Ne charger que les champs de saisie (non-display) dans formData
 * - Les champs display liront leur valeur depuis calculatedValue (dynamique)
 */

import { db } from '../src/lib/database';

async function main() {
  console.log('🔍 Analyse du système de rechargement...\n');

  // 1. Identifier tous les champs display
  const displayFields = await db.treeBranchLeafNode.findMany({
    where: {
      type: {
        in: ['branch', 'leaf_field', 'leaf_option_field']
      },
      OR: [
        { subType: 'data' }, // Les branches de type data
        { metadata: { path: ['field', 'display'], equals: true } }, // Champs marqués display
        { metadata: { path: ['isDisplay'], equals: true } },
        // Autres indicateurs de champs display
      ]
    },
    select: {
      id: true,
      label: true,
      type: true,
      subType: true,
      hasFormula: true,
      hasTable: true,
      hasCondition: true,
      metadata: true
    }
  });

  console.log(`📊 Trouvé ${displayFields.length} champs display/calculés:\n`);
  
  displayFields.forEach(field => {
    console.log(`   - ${field.label} (${field.type}/${field.subType})`);
    console.log(`     ID: ${field.id}`);
    console.log(`     Capacités: Formula=${field.hasFormula}, Table=${field.hasTable}, Condition=${field.hasCondition}`);
    console.log('');
  });

  // 2. Créer une fonction helper pour détecter les champs display
  const displayFieldIds = new Set(displayFields.map(f => f.id));

  console.log('\n📝 IDs des champs display à exclure du rechargement:');
  console.log(JSON.stringify(Array.from(displayFieldIds), null, 2));

  console.log('\n💡 INSTRUCTIONS POUR LE FIX:');
  console.log('');
  console.log('Dans /src/components/TreeBranchLeaf/treebranchleaf-new/TBL/TBL.tsx');
  console.log('Ligne ~2177, dans handleSelectDevis(), MODIFIER:');
  console.log('');
  console.log('❌ AVANT:');
  console.log('  submission.TreeBranchLeafSubmissionData.forEach((item) => {');
  console.log('    if (item.value !== undefined && item.value !== null && item.value !== \'\') {');
  console.log('      formattedData[item.nodeId] = item.value; // ← Charge TOUT, même display!');
  console.log('    }');
  console.log('  });');
  console.log('');
  console.log('✅ APRÈS:');
  console.log('  // IDs des champs display à exclure');
  console.log('  const displayFieldIds = new Set([');
  displayFieldIds.forEach(id => console.log(`    '${id}',`));
  console.log('  ]);');
  console.log('');
  console.log('  submission.TreeBranchLeafSubmissionData.forEach((item) => {');
  console.log('    // ✅ EXCLURE les champs display du rechargement');
  console.log('    if (displayFieldIds.has(item.nodeId)) {');
  console.log('      console.log(`🚫 [TBL] Skip display field: ${item.nodeId}`);');
  console.log('      return; // Ne PAS recharger les champs display');
  console.log('    }');
  console.log('');
  console.log('    if (item.value !== undefined && item.value !== null && item.value !== \'\') {');
  console.log('      formattedData[item.nodeId] = item.value;');
  console.log('    }');
  console.log('  });');
  console.log('');
  console.log('✅ Résultat:');
  console.log('   - Les champs de SAISIE sont rechargés avec les valeurs sauvegardées');
  console.log('   - Les champs DISPLAY restent vides et calculent automatiquement via calculatedValue');
  console.log('   - Les champs display afficheront les valeurs à jour basées sur les formules/conditions');

  console.log('\n✅ Analyse terminée!');
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
