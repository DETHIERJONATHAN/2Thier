/**
 * 🔍 DIAGNOSTIC - OPERATION RESULT FORMAT V2
 * 
 * Vérifie le format des operationResult dans TreeBranchLeafSubmissionData
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function diagnoseOperationResults() {
  console.log('🔍 [DIAGNOSTIC] Analyse des operationResult\n');

  try {
    // Récupérer directement les données avec operationResult
    const dataEntries = await prisma.treeBranchLeafSubmissionData.findMany({
      select: {
        id: true,
        submissionId: true,
        nodeId: true,
        fieldLabel: true,
        value: true,
        operationSource: true,
        operationResult: true,
        TreeBranchLeafNode: {
          select: {
            label: true,
            type: true
          }
        }
      },
      orderBy: {
        id: 'desc'
      },
      take: 20
    });

    if (dataEntries.length === 0) {
      console.log('❌ [DIAGNOSTIC] Aucune donnée TreeBranchLeafSubmissionData trouvée\n');
      return;
    }

    console.log(`✅ [DIAGNOSTIC] ${dataEntries.length} entrée(s) trouvée(s)\n`);

    for (const data of dataEntries) {
      console.log('═══════════════════════════════════════════════════════════════');
      console.log(`─── ${data.fieldLabel || data.TreeBranchLeafNode?.label || 'Sans label'} ───`);
      console.log(`    Submission: ${data.submissionId}`);
      console.log(`    NodeId: ${data.nodeId}`);
      console.log(`    Type: ${data.TreeBranchLeafNode?.type || 'N/A'}`);
      console.log(`    Source: ${data.operationSource || 'N/A'}`);
      
      // Analyser la value
      console.log(`\n    📊 VALUE:`);
      console.log(`       Type: ${typeof data.value}`);
      console.log(`       Contenu: ${JSON.stringify(data.value, null, 2)}`);
      
      // Analyser operationResult
      console.log(`\n    🎯 OPERATION RESULT:`);
      console.log(`       Type: ${typeof data.operationResult}`);
      
      if (typeof data.operationResult === 'object' && data.operationResult !== null) {
        console.log(`       ⚠️  C'EST UN OBJET! (problème [object Object])`);
        console.log(`       Contenu: ${JSON.stringify(data.operationResult, null, 2)}`);
        
        // Si c'est un objet, chercher les champs possibles
        const obj = data.operationResult;
        if ('text' in obj) console.log(`       ✓ Contient "text": ${obj.text}`);
        if ('value' in obj) console.log(`       ✓ Contient "value": ${obj.value}`);
        if ('result' in obj) console.log(`       ✓ Contient "result": ${obj.result}`);
        if ('humanText' in obj) console.log(`       ✓ Contient "humanText": ${obj.humanText}`);
      } else if (typeof data.operationResult === 'string') {
        console.log(`       ✅ C'EST UNE STRING (OK pour affichage)`);
        const truncated = data.operationResult.length > 100 
          ? data.operationResult.substring(0, 100) + '...' 
          : data.operationResult;
        console.log(`       Contenu: "${truncated}"`);
      } else {
        console.log(`       Contenu: ${data.operationResult}`);
      }
      
      console.log('\n');
    }

    // Statistiques globales
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 STATISTIQUES GLOBALES');
    console.log('═══════════════════════════════════════════════════════════════\n');

    let stringCount = 0;
    let objectCount = 0;
    let nullCount = 0;
    let otherCount = 0;

    for (const d of dataEntries) {
      const type = typeof d.operationResult;
      if (type === 'string') stringCount++;
      else if (type === 'object' && d.operationResult !== null) objectCount++;
      else if (d.operationResult === null) nullCount++;
      else otherCount++;
    }

    const total = dataEntries.length;
    console.log(`Total analysé: ${total} entrées\n`);
    console.log(`   ✅ String (OK): ${stringCount} (${Math.round(stringCount/total*100)}%)`);
    console.log(`   ⚠️  Object (PROBLÈME [object Object]): ${objectCount} (${Math.round(objectCount/total*100)}%)`);
    console.log(`   ⚪ Null: ${nullCount} (${Math.round(nullCount/total*100)}%)`);
    console.log(`   ❓ Autre: ${otherCount}`);

    console.log('\n💡 SOLUTION:');
    if (objectCount > 0) {
      console.log('   ❌ PROBLÈME DÉTECTÉ: operationResult contient des objets!');
      console.log('   📝 Le frontend affiche [object Object] car il essaie de convertir');
      console.log('      un objet JavaScript en string avec toString()');
      console.log('\n   🔧 FIX À APPLIQUER:');
      console.log('      1. Dans operation-interpreter.ts:');
      console.log('         - operationResult doit TOUJOURS être une STRING');
      console.log('         - Si c\'est un objet, extraire obj.humanText ou obj.text');
      console.log('      2. OU dans le frontend:');
      console.log('         - Vérifier si operationResult est un objet');
      console.log('         - Extraire le bon champ avant affichage\n');
    } else {
      console.log('   ✅ Tous les operationResult sont au bon format (string).\n');
    }

  } catch (error) {
    console.error('❌ [DIAGNOSTIC] Erreur:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécution
diagnoseOperationResults()
  .then(() => {
    console.log('🎉 [DIAGNOSTIC] Script terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 [DIAGNOSTIC] Erreur fatale:', error);
    process.exit(1);
  });
