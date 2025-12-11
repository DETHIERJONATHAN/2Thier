/**
 * 🔥 TEST DE QUALITÉ - Vérifier que la copie ne casse RIEN
 * 
 * Teste la "foirure" de la copie:
 * - Variables orphelines
 * - Références cassées
 * - IDs non mappés
 * - Données manquantes
 * - Incohérences d'état
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n');
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' '.repeat(20) + '🔥 TEST DE QUALITÉ - COPIE FOIREUSE' + ' '.repeat(23) + '║');
  console.log('╚' + '═'.repeat(78) + '╝\n');

  const results = {
    totalProblems: 0,
    categories: {}
  };

  try {
    // 1️⃣ TROUVER TOUS LES NŒUDS "RAMPANT"
    const allRampantNodes = await prisma.treeBranchLeafNode.findMany({
      where: { label: { contains: 'Rampant' } }
    });

    console.log(`\n📌 NŒUDS TROUVÉS: ${allRampantNodes.length}\n`);
    console.log('─'.repeat(80));

    for (const node of allRampantNodes) {
      const nodeType = node.id.includes('-') ? 'COPIE' : 'ORIGINAL';
      console.log(`\n[${nodeType}] ${node.label} (${node.id})`);
    }

    // 2️⃣ TROUVER LE NŒUD ORIGINAL
    const originalNode = allRampantNodes.find(n => !n.id.includes('-'));

    if (!originalNode) {
      console.log('\n❌ Impossible de trouver le nœud original');
      return;
    }

    console.log(`\n\n${'═'.repeat(80)}`);
    console.log(`📍 ANALYSE: Nœud ORIGINAL`);
    console.log(`${'═'.repeat(80)}\n`);

    // Données de l'original
    const originalVars = await prisma.treeBranchLeafNodeVariable.findMany({
      where: { nodeId: originalNode.id }
    });
    const originalFormulas = await prisma.treeBranchLeafNodeFormula.findMany({
      where: { nodeId: originalNode.id }
    });
    const originalConditions = await prisma.treeBranchLeafNodeCondition.findMany({
      where: { nodeId: originalNode.id }
    });

    console.log(`📊 État ORIGINAL:`);
    console.log(`   Variables: ${originalVars.length}`);
    console.log(`   Formules: ${originalFormulas.length}`);
    console.log(`   Conditions: ${originalConditions.length}`);

    // 3️⃣ ANALYSER CHAQUE COPIE
    const copiedNodes = allRampantNodes.filter(n => n.id.includes('-'));

    console.log(`\n\n${'═'.repeat(80)}`);
    console.log(`📋 ANALYSE: COPIES (${copiedNodes.length})`);
    console.log(`${'═'.repeat(80)}`);

    for (const copiedNode of copiedNodes) {
      console.log(`\n\n📌 COPIE: ${copiedNode.label}`);
      console.log(`   ID: ${copiedNode.id}`);
      console.log(`   Parent: ${copiedNode.parentId}`);
      console.log('   ' + '─'.repeat(76));

      // Récupérer les données de la copie
      const copiedVars = await prisma.treeBranchLeafNodeVariable.findMany({
        where: { nodeId: copiedNode.id }
      });
      const copiedFormulas = await prisma.treeBranchLeafNodeFormula.findMany({
        where: { nodeId: copiedNode.id }
      });
      const copiedConditions = await prisma.treeBranchLeafNodeCondition.findMany({
        where: { nodeId: copiedNode.id }
      });

      // Vérifier les décalages
      const varMismatch = originalVars.length !== copiedVars.length;
      const formulaMismatch = originalFormulas.length !== copiedFormulas.length;
      const conditionMismatch = originalConditions.length !== copiedConditions.length;

      console.log(`\n   📊 Décalage du nombre d'éléments:`);
      console.log(`      Variables:  ${copiedVars.length}/${originalVars.length} ${varMismatch ? '❌ DÉCALAGE!' : '✅'}`);
      console.log(`      Formules:   ${copiedFormulas.length}/${originalFormulas.length} ${formulaMismatch ? '❌ DÉCALAGE!' : '✅'}`);
      console.log(`      Conditions: ${copiedConditions.length}/${originalConditions.length} ${conditionMismatch ? '❌ DÉCALAGE!' : '✅'}`);

      if (varMismatch || formulaMismatch || conditionMismatch) {
        results.totalProblems++;
        if (!results.categories['decalage']) results.categories['decalage'] = [];
        results.categories['decalage'].push(copiedNode.id);
      }

      // 4️⃣ VÉRIFIER LES RÉFÉRENCES CASSÉES DANS LES FORMULES
      console.log(`\n   📐 Vérification des formules:`);

      for (const copiedFormula of copiedFormulas) {
        let formulaOk = true;

        // Vérifier l'opération
        if (!copiedFormula.operation || copiedFormula.operation.trim() === '') {
          console.log(`      ❌ "${copiedFormula.name || '?'}": OPÉRATION VIDE!`);
          formulaOk = false;
          results.totalProblems++;
        }

        // Vérifier les variables liées
        if (copiedFormula.linkedVariableIds && copiedFormula.linkedVariableIds.length > 0) {
          for (const varId of copiedFormula.linkedVariableIds) {
            const varExists = await prisma.treeBranchLeafNodeVariable.findUnique({
              where: { id: varId }
            });
            if (!varExists) {
              console.log(`      ❌ "${copiedFormula.name || '?'}": Variable CASSÉE ${varId}`);
              formulaOk = false;
              results.totalProblems++;
            }
          }
        } else {
          if (copiedFormula.operation) {
            console.log(`      ⚠️  "${copiedFormula.name || '?'}": Aucune variable liée`);
          }
        }

        if (formulaOk && copiedFormula.operation) {
          console.log(`      ✅ "${copiedFormula.name || '?'}": OK`);
        }
      }

      // 5️⃣ VÉRIFIER LES VARIABLES ORPHELINES
      console.log(`\n   📋 Vérification des variables:`);

      for (const copiedVar of copiedVars) {
        let varOk = true;

        // Vérifier le sourceRef
        if (copiedVar.sourceRef) {
          // Extraire l'ID du sourceRef
          let refId = copiedVar.sourceRef;
          if (copiedVar.sourceRef.includes(':')) {
            refId = copiedVar.sourceRef.split(':')[1];
          }

          // Vérifier que la capacité existe
          if (copiedVar.sourceRef.includes('node-formula:')) {
            const formula = await prisma.treeBranchLeafNodeFormula.findUnique({
              where: { id: refId }
            });
            if (!formula) {
              console.log(`      ❌ "${copiedVar.exposedKey}": FORMULE ORPHELINE ${refId}`);
              varOk = false;
              results.totalProblems++;
            }
          } else if (copiedVar.sourceRef.includes('condition:') || copiedVar.sourceRef.includes('node-condition:')) {
            const condition = await prisma.treeBranchLeafNodeCondition.findUnique({
              where: { id: refId }
            });
            if (!condition) {
              console.log(`      ❌ "${copiedVar.exposedKey}": CONDITION ORPHELINE ${refId}`);
              varOk = false;
              results.totalProblems++;
            }
          }
        }

        if (varOk) {
          console.log(`      ✅ "${copiedVar.exposedKey}": OK`);
        }
      }

      // 6️⃣ VÉRIFIER LES MÉTADONNÉES
      console.log(`\n   🏷️  Métadonnées:`);
      if (copiedNode.metadata && typeof copiedNode.metadata === 'object') {
        console.log(`      copiedFromNodeId: ${copiedNode.metadata.copiedFromNodeId || 'MANQUANT ❌'}`);
        console.log(`      copySuffix: ${copiedNode.metadata.copySuffix || 'MANQUANT ❌'}`);
      } else {
        console.log(`      ⚠️  Métadonnées vides ou invalides`);
      }
    }

    // 7️⃣ RAPPORT FINAL
    console.log(`\n\n${'═'.repeat(80)}`);
    console.log(`📊 RÉSUMÉ DES PROBLÈMES`);
    console.log(`${'═'.repeat(80)}\n`);

    if (results.totalProblems === 0) {
      console.log('✅ Aucun problème détecté - Les copies sont de bonne qualité!\n');
    } else {
      console.log(`❌ TOTAL PROBLÈMES DÉTECTÉS: ${results.totalProblems}\n`);

      for (const [category, nodeIds] of Object.entries(results.categories)) {
        console.log(`   🔴 ${category}: ${nodeIds.length} nœud(s) affecté(s)`);
        for (const nodeId of nodeIds as string[]) {
          console.log(`      - ${nodeId}`);
        }
      }
    }

    console.log('\n' + '═'.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(error => {
  console.error('ERREUR CRITIQUE:', error);
  process.exit(1);
});
