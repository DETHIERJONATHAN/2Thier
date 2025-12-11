/**
 * 🔥 SCRIPT D'ANALYSE COMPLET - Rampant toiture
 * Pourquoi les calculs ne se font pas? Pourquoi la copie est foireuse?
 * 
 * Ce script trace CHAQUE ÉTAPE de la copie et identifie les problèmes
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n\n');
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' '.repeat(20) + '🔥 DEBUG COMPLET RAMPANT TOITURE 🔥' + ' '.repeat(22) + '║');
  console.log('╚' + '═'.repeat(78) + '╝\n');

  try {
    // ══════════════════════════════════════════════════════════════════════
    // ÉTAPE 1: Trouver le nœud "Rampant toiture" ORIGINAL
    // ══════════════════════════════════════════════════════════════════════
    console.log('📍 ÉTAPE 1: Recherche du nœud ORIGINAL "Rampant toiture"');
    console.log('─'.repeat(80));

    const originalNode = await prisma.treeBranchLeafNode.findFirst({
      where: {
        label: 'Rampant toiture',
        metadata: {
          equals: {},
          // Chercher celui SANS copySuffix ou métadonnées de copie
        }
      }
    });

    if (!originalNode) {
      console.log('❌ ERREUR: Nœud "Rampant toiture" original non trouvé!');
      return;
    }

    console.log(`✅ Trouvé: ${originalNode.label} (ID: ${originalNode.id})`);
    console.log(`   Type: ${originalNode.type}`);
    console.log(`   hasFormula: ${originalNode.hasFormula}`);
    console.log(`   hasCondition: ${originalNode.hasCondition}`);
    console.log(`   linkedFormulaIds: ${JSON.stringify(originalNode.linkedFormulaIds)}`);
    console.log(`   linkedConditionIds: ${JSON.stringify(originalNode.linkedConditionIds)}`);

    // ══════════════════════════════════════════════════════════════════════
    // ÉTAPE 2: Vérifier les VARIABLES du nœud original
    // ══════════════════════════════════════════════════════════════════════
    console.log('\n📋 ÉTAPE 2: Variables du nœud ORIGINAL');
    console.log('─'.repeat(80));

    const originalVariables = await prisma.treeBranchLeafNodeVariable.findMany({
      where: { nodeId: originalNode.id }
    });

    console.log(`Trouvé ${originalVariables.length} variables:\n`);

    for (const variable of originalVariables) {
      console.log(`  🔹 Variable: ${variable.exposedKey}`);
      console.log(`     ID: ${variable.id}`);
      console.log(`     sourceType: ${variable.sourceType}`);
      console.log(`     sourceRef: ${variable.sourceRef}`);
      console.log(`     value: ${variable.value}`);
      console.log(`     type: ${variable.type}`);
    }

    // ══════════════════════════════════════════════════════════════════════
    // ÉTAPE 3: Vérifier les FORMULES du nœud original
    // ══════════════════════════════════════════════════════════════════════
    console.log('\n📐 ÉTAPE 3: Formules du nœud ORIGINAL');
    console.log('─'.repeat(80));

    const originalFormulas = await prisma.treeBranchLeafNodeFormula.findMany({
      where: { nodeId: originalNode.id }
    });

    console.log(`Trouvé ${originalFormulas.length} formules:\n`);

    for (const formula of originalFormulas) {
      console.log(`  📊 Formule: ${formula.name || '(sans nom)'}`);
      console.log(`     ID: ${formula.id}`);
      console.log(`     label: ${formula.label}`);
      console.log(`     operation: ${formula.operation}`);
      console.log(`     linkedVariableIds: ${JSON.stringify(formula.linkedVariableIds)}`);
      
      // Analyser la formule
      if (!formula.operation || formula.operation.trim() === '') {
        console.log(`     ⚠️ PROBLÈME: Aucune opération définie!`);
      }
      if (!formula.linkedVariableIds || formula.linkedVariableIds.length === 0) {
        console.log(`     ⚠️ PROBLÈME: Aucune variable liée!`);
      }
    }

    // ══════════════════════════════════════════════════════════════════════
    // ÉTAPE 4: Vérifier les CONDITIONS du nœud original
    // ══════════════════════════════════════════════════════════════════════
    console.log('\n🔀 ÉTAPE 4: Conditions du nœud ORIGINAL');
    console.log('─'.repeat(80));

    const originalConditions = await prisma.treeBranchLeafNodeCondition.findMany({
      where: { nodeId: originalNode.id }
    });

    console.log(`Trouvé ${originalConditions.length} conditions:\n`);

    for (const condition of originalConditions) {
      console.log(`  🎯 Condition: ${condition.name || '(sans nom)'}`);
      console.log(`     ID: ${condition.id}`);
      console.log(`     label: ${condition.label}`);
      console.log(`     condition: ${condition.condition}`);
      console.log(`     linkedVariableIds: ${JSON.stringify(condition.linkedVariableIds)}`);

      if (!condition.condition || condition.condition.trim() === '') {
        console.log(`     ⚠️ PROBLÈME: Condition vide!`);
      }
    }

    // ══════════════════════════════════════════════════════════════════════
    // ÉTAPE 5: Trouver les COPIES du nœud original
    // ══════════════════════════════════════════════════════════════════════
    console.log('\n📋 ÉTAPE 5: Nœuds COPIÉS du nœud ORIGINAL');
    console.log('─'.repeat(80));

    const copiedNodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        metadata: {
          path: ['copiedFromNodeId'],
          equals: originalNode.id
        }
      }
    });

    console.log(`Trouvé ${copiedNodes.length} copies:\n`);

    if (copiedNodes.length === 0) {
      console.log('❌ ERREUR: Aucune copie trouvée du nœud original!');
      return;
    }

    for (const copiedNode of copiedNodes) {
      console.log(`\n  📌 COPIE: ${copiedNode.label} (ID: ${copiedNode.id})`);
      console.log(`     parentId: ${copiedNode.parentId}`);
      console.log(`     hasFormula: ${copiedNode.hasFormula}`);
      console.log(`     hasCondition: ${copiedNode.hasCondition}`);
      console.log(`     linkedFormulaIds: ${JSON.stringify(copiedNode.linkedFormulaIds)}`);
      console.log(`     linkedConditionIds: ${JSON.stringify(copiedNode.linkedConditionIds)}`);
      
      // Vérifier les métadonnées
      if (copiedNode.metadata && typeof copiedNode.metadata === 'object') {
        console.log(`     metadata.copiedFromNodeId: ${copiedNode.metadata.copiedFromNodeId}`);
        console.log(`     metadata.copySuffix: ${copiedNode.metadata.copySuffix}`);
      }

      // ══════════════════════════════════════════════════════════════════
      // ÉTAPE 5a: Vérifier les VARIABLES de la COPIE
      // ══════════════════════════════════════════════════════════════════
      console.log(`\n     📋 Variables de la copie:`);

      const copiedVariables = await prisma.treeBranchLeafNodeVariable.findMany({
        where: { nodeId: copiedNode.id }
      });

      console.log(`     Trouvé ${copiedVariables.length} variables:\n`);

      for (const variable of copiedVariables) {
        console.log(`       🔹 ${variable.exposedKey}`);
        console.log(`          ID: ${variable.id}`);
        console.log(`          sourceRef: ${variable.sourceRef}`);
        console.log(`          value: ${variable.value}`);
      }

      if (copiedVariables.length === 0) {
        console.log(`       ❌ ERREUR: Aucune variable copiée!`);
      }

      // ══════════════════════════════════════════════════════════════════
      // ÉTAPE 5b: Vérifier les FORMULES de la COPIE
      // ══════════════════════════════════════════════════════════════════
      console.log(`\n     📐 Formules de la copie:`);

      const copiedFormulas = await prisma.treeBranchLeafNodeFormula.findMany({
        where: { nodeId: copiedNode.id }
      });

      console.log(`     Trouvé ${copiedFormulas.length} formules:\n`);

      for (const formula of copiedFormulas) {
        console.log(`       📊 ${formula.name || '(sans nom)'}`);
        console.log(`          ID: ${formula.id}`);
        console.log(`          operation: ${formula.operation}`);
        console.log(`          linkedVariableIds: ${JSON.stringify(formula.linkedVariableIds)}`);

        if (!formula.operation) {
          console.log(`          ❌ ERREUR: Opération vide!`);
        }

        // Vérifier si les linkedVariableIds pointent vers les BONNES variables
        if (formula.linkedVariableIds && formula.linkedVariableIds.length > 0) {
          for (const varId of formula.linkedVariableIds) {
            const var_exists = await prisma.treeBranchLeafNodeVariable.findUnique({
              where: { id: varId }
            });
            
            if (!var_exists) {
              console.log(`          ❌ ERREUR: Variable liée ${varId} N'EXISTE PAS!`);
            }
          }
        }
      }

      if (copiedFormulas.length === 0) {
        console.log(`       ❌ ERREUR: Aucune formule copiée!`);
      }

      // ══════════════════════════════════════════════════════════════════
      // ÉTAPE 5c: Vérifier les CONDITIONS de la COPIE
      // ══════════════════════════════════════════════════════════════════
      console.log(`\n     🔀 Conditions de la copie:`);

      const copiedConditions = await prisma.treeBranchLeafNodeCondition.findMany({
        where: { nodeId: copiedNode.id }
      });

      console.log(`     Trouvé ${copiedConditions.length} conditions:\n`);

      for (const condition of copiedConditions) {
        console.log(`       🎯 ${condition.name || '(sans nom)'}`);
        console.log(`          ID: ${condition.id}`);
        console.log(`          condition: ${condition.condition}`);
        console.log(`          linkedVariableIds: ${JSON.stringify(condition.linkedVariableIds)}`);
      }

      if (copiedConditions.length === 0) {
        console.log(`       ❌ ERREUR: Aucune condition copiée!`);
      }
    }

    // ══════════════════════════════════════════════════════════════════════
    // ÉTAPE 6: ANALYSE COMPARATIVE
    // ══════════════════════════════════════════════════════════════════════
    console.log('\n\n📊 ÉTAPE 6: ANALYSE COMPARATIVE ORIGINAL vs COPIE');
    console.log('─'.repeat(80));

    const firstCopy = copiedNodes[0];
    if (firstCopy) {
      console.log(`\nComparaison entre:\n  Original: ${originalNode.id}\n  Copie: ${firstCopy.id}\n`);

      // Vérifier les variables
      const originalVarCount = originalVariables.length;
      const copiedVarCount = await prisma.treeBranchLeafNodeVariable.count({
        where: { nodeId: firstCopy.id }
      });

      console.log(`📋 VARIABLES:`);
      console.log(`   Original: ${originalVarCount}`);
      console.log(`   Copie: ${copiedVarCount}`);
      if (originalVarCount !== copiedVarCount) {
        console.log(`   ❌ DÉCALAGE: ${originalVarCount - copiedVarCount} variables manquantes`);
      }

      // Vérifier les formules
      const originalFormulaCount = originalFormulas.length;
      const copiedFormulaCount = await prisma.treeBranchLeafNodeFormula.count({
        where: { nodeId: firstCopy.id }
      });

      console.log(`\n📐 FORMULES:`);
      console.log(`   Original: ${originalFormulaCount}`);
      console.log(`   Copie: ${copiedFormulaCount}`);
      if (originalFormulaCount !== copiedFormulaCount) {
        console.log(`   ❌ DÉCALAGE: ${originalFormulaCount - copiedFormulaCount} formules manquantes`);
      }

      // Vérifier les conditions
      const originalConditionCount = originalConditions.length;
      const copiedConditionCount = await prisma.treeBranchLeafNodeCondition.count({
        where: { nodeId: firstCopy.id }
      });

      console.log(`\n🔀 CONDITIONS:`);
      console.log(`   Original: ${originalConditionCount}`);
      console.log(`   Copie: ${copiedConditionCount}`);
      if (originalConditionCount !== copiedConditionCount) {
        console.log(`   ❌ DÉCALAGE: ${originalConditionCount - copiedConditionCount} conditions manquantes`);
      }
    }

    // ══════════════════════════════════════════════════════════════════════
    // ÉTAPE 7: LOGS DU SYSTÈME POUR COMPRENDRE LES ERREURS
    // ══════════════════════════════════════════════════════════════════════
    console.log('\n\n⚠️  ÉTAPE 7: ANALYSE DES PROBLÈMES POTENTIELS');
    console.log('─'.repeat(80));

    const issues = [];

    if (originalFormulas.length > 0) {
      const copiedCount = await prisma.treeBranchLeafNodeFormula.count({
        where: { 
          metadata: {
            path: ['copiedFromFormulaId'],
            equals: originalFormulas[0].id
          }
        }
      });

      if (copiedCount === 0) {
        issues.push(`🔴 Les formules du nœud original n'ont pas été copiées`);
      }
    }

    if (originalVariables.length > 0) {
      const copiedCount = await prisma.treeBranchLeafNodeVariable.count({
        where: { 
          metadata: {
            path: ['copiedFromVariableId'],
            equals: originalVariables[0].id
          }
        }
      });

      if (copiedCount === 0) {
        issues.push(`🔴 Les variables du nœud original n'ont pas été copiées`);
      }
    }

    if (issues.length === 0) {
      console.log('✅ Aucun problème majeur détecté');
    } else {
      issues.forEach(issue => console.log(`   ${issue}`));
    }

    console.log('\n\n' + '╔' + '═'.repeat(78) + '╗');
    console.log('║' + ' '.repeat(30) + '✅ ANALYSE TERMINÉE' + ' '.repeat(30) + '║');
    console.log('╚' + '═'.repeat(78) + '╝\n');

  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(error => {
  console.error('ERREUR CRITIQUE:', error);
  process.exit(1);
});
