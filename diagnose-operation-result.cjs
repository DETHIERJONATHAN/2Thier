/**
 * 🔍 DIAGNOSTIC - OPERATION RESULT FORMAT
 * 
 * Vérifie le format des operationResult dans TreeBranchLeafSubmissionData
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function diagnoseOperationResults() {
  console.log('🔍 [DIAGNOSTIC] Analyse des operationResult\n');

  try {
    // Récupérer directement les données avec operationResult
    const allData = await prisma.treeBranchLeafSubmissionData.findMany({
      select: {
        id: true,
        submissionId: true,
        nodeId: true,
        fieldLabel: true,
        value: true,
        operationSource: true,
        operationResult: true,
        operationDetail: true,
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

    if (allData.length === 0) {
      console.log('❌ [DIAGNOSTIC] Aucune donnée TreeBranchLeafSubmissionData trouvée\n');
      return;
    }

    console.log(`✅ [DIAGNOSTIC] ${allData.length} entrée(s) trouvée(s)\n`);

    console.log(`✅ [DIAGNOSTIC] ${allData.length} entrée(s) trouvée(s)\n`);

    for (const data of allData) {
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
        console.log(`       ⚠️  C'EST UN OBJET! (problème pour affichage)`);
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

    const allData = await prisma.treeBranchLeafSubmissionData.findMany({
      select: {
        operationResult: true
      },
      take: 100
    });

    let stringCount = 0;
    let objectCount = 0;
    let nullCount = 0;
    let otherCount = 0;

    for (const d of allData) {
      const type = typeof d.operationResult;
      if (type === 'string') stringCount++;
      else if (type === 'object' && d.operationResult !== null) objectCount++;
      else if (d.operationResult === null) nullCount++;
      else otherCount++;
    }

    const total = allData.length;
    console.log(`Total analysé: ${total} entrées\n`);
    console.log(`   ✅ String (OK): ${stringCount} (${Math.round(stringCount/total*100)}%)`);
    console.log(`   ⚠️  Object (PROBLÈME): ${objectCount} (${Math.round(objectCount/total*100)}%)`);
    console.log(`   ⚪ Null: ${nullCount} (${Math.round(nullCount/total*100)}%)`);
    console.log(`   ❓ Autre: ${otherCount} (${Math.round(otherCount/total*100)}%)`);

    console.log('\n💡 RECOMMANDATION:');
    if (objectCount > 0) {
      console.log('   Le problème [object Object] vient des operationResult qui sont des objets.');
      console.log('   Solution: Extraire le champ "text" ou "humanText" de l\'objet,');
      console.log('   OU convertir l\'objet en string dans operation-interpreter.ts\n');
    } else {
      console.log('   Tous les operationResult sont au bon format (string).\n');
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
