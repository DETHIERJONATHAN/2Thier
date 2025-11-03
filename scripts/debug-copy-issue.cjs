/**
 * Script de diagnostic complet pour comprendre le problème de copie des capacités
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 DIAGNOSTIC COMPLET - COPIE DES CAPACITÉS');
  console.log('='.repeat(80) + '\n');

  try {
    // ÉTAPE 1: Trouver les variables du repeater "Versant"
    console.log('📋 ÉTAPE 1: Variables du repeater "Versant"\n');
    
    const versantRepeater = await prisma.treeBranchLeafNode.findFirst({
      where: {
        type: 'repeater',
        data: {
          path: '$.exposedKey',
          equals: 'versant'
        }
      }
    });

    if (!versantRepeater) {
      console.log('❌ Repeater "Versant" non trouvé');
      return;
    }

    console.log(`✅ Repeater trouvé: ${versantRepeater.id}`);

    const variables = await prisma.treeBranchLeafNodeVariable.findMany({
      where: {
        node: {
          parentId: versantRepeater.id
        }
      },
      include: {
        node: true
      }
    });

    console.log(`\n📊 ${variables.length} variables trouvées\n`);

    for (const variable of variables) {
      console.log('─'.repeat(80));
      console.log(`\n🔹 Variable: ${variable.exposedKey}`);
      console.log(`   ID: ${variable.id}`);
      console.log(`   NodeID: ${variable.nodeId}`);
      console.log(`   SourceRef: ${variable.sourceRef}`);
      console.log(`   Type Node: ${variable.node?.type}`);

      // Analyser le sourceRef
      if (variable.sourceRef) {
        const parts = variable.sourceRef.split(':');
        const type = parts[0];
        
        console.log(`\n   📌 Type de capacité: ${type}`);

        if (type === 'node-formula') {
          // Chercher la formule
          console.log(`\n   🔍 Recherche formule avec nodeId: ${variable.nodeId}`);
          
          const formulaById = await prisma.treeBranchLeafNodeFormula.findUnique({
            where: { id: variable.nodeId }
          });
          
          const formulaByNodeId = await prisma.treeBranchLeafNodeFormula.findFirst({
            where: { nodeId: variable.nodeId }
          });

          console.log(`\n   Recherche par ID (${variable.nodeId}):`);
          if (formulaById) {
            console.log(`   ✅ TROUVÉ: ${formulaById.name}`);
            console.log(`      ID: ${formulaById.id}`);
            console.log(`      NodeID: ${formulaById.nodeId}`);
          } else {
            console.log(`   ❌ NON TROUVÉ`);
          }

          console.log(`\n   Recherche par NodeID (${variable.nodeId}):`);
          if (formulaByNodeId) {
            console.log(`   ✅ TROUVÉ: ${formulaByNodeId.name}`);
            console.log(`      ID: ${formulaByNodeId.id}`);
            console.log(`      NodeID: ${formulaByNodeId.nodeId}`);
          } else {
            console.log(`   ❌ NON TROUVÉ`);
          }

        } else if (type === 'node-condition') {
          console.log(`\n   🔍 Recherche condition avec nodeId: ${variable.nodeId}`);
          
          const conditionById = await prisma.treeBranchLeafNodeCondition.findUnique({
            where: { id: variable.nodeId }
          });
          
          const conditionByNodeId = await prisma.treeBranchLeafNodeCondition.findFirst({
            where: { nodeId: variable.nodeId }
          });

          console.log(`\n   Recherche par ID (${variable.nodeId}):`);
          if (conditionById) {
            console.log(`   ✅ TROUVÉ: ${conditionById.name}`);
            console.log(`      ID: ${conditionById.id}`);
            console.log(`      NodeID: ${conditionById.nodeId}`);
          } else {
            console.log(`   ❌ NON TROUVÉ`);
          }

          console.log(`\n   Recherche par NodeID (${variable.nodeId}):`);
          if (conditionByNodeId) {
            console.log(`   ✅ TROUVÉ: ${conditionByNodeId.name}`);
            console.log(`      ID: ${conditionByNodeId.id}`);
            console.log(`      NodeID: ${conditionByNodeId.nodeId}`);
          } else {
            console.log(`   ❌ NON TROUVÉ`);
          }

        } else if (type === 'node-table') {
          console.log(`\n   🔍 Recherche table avec nodeId: ${variable.nodeId}`);
          
          const tableById = await prisma.treeBranchLeafNodeTable.findUnique({
            where: { id: variable.nodeId }
          });
          
          const tableByNodeId = await prisma.treeBranchLeafNodeTable.findFirst({
            where: { nodeId: variable.nodeId }
          });

          console.log(`\n   Recherche par ID (${variable.nodeId}):`);
          if (tableById) {
            console.log(`   ✅ TROUVÉ: ${tableById.name}`);
            console.log(`      ID: ${tableById.id}`);
            console.log(`      NodeID: ${tableById.nodeId}`);
          } else {
            console.log(`   ❌ NON TROUVÉ`);
          }

          console.log(`\n   Recherche par NodeID (${variable.nodeId}):`);
          if (tableByNodeId) {
            console.log(`   ✅ TROUVÉ: ${tableByNodeId.name}`);
            console.log(`      ID: ${tableByNodeId.id}`);
            console.log(`      NodeID: ${tableByNodeId.nodeId}`);
          } else {
            console.log(`   ❌ NON TROUVÉ`);
          }
        }
      } else {
        console.log(`   ⚠️  Pas de sourceRef - Variable simple`);
      }
    }

    // ÉTAPE 2: Vérifier les variables avec suffixe -1
    console.log('\n\n' + '='.repeat(80));
    console.log('📋 ÉTAPE 2: Variables COPIÉES (avec suffixe -1)\n');
    
    const copiedVariables = await prisma.treeBranchLeafNodeVariable.findMany({
      where: {
        node: {
          parentId: versantRepeater.id
        },
        OR: [
          { exposedKey: { endsWith: '-1' } },
          { id: { endsWith: '-1' } },
          { nodeId: { endsWith: '-1' } }
        ]
      },
      include: {
        node: true
      }
    });

    console.log(`📊 ${copiedVariables.length} variables copiées trouvées\n`);

    for (const variable of copiedVariables) {
      console.log('─'.repeat(80));
      console.log(`\n🔹 Variable copiée: ${variable.exposedKey}`);
      console.log(`   ID: ${variable.id}`);
      console.log(`   NodeID: ${variable.nodeId}`);
      console.log(`   SourceRef: ${variable.sourceRef}`);

      if (variable.sourceRef) {
        const parts = variable.sourceRef.split(':');
        const type = parts[0];
        
        console.log(`\n   📌 Type de capacité: ${type}`);
        console.log(`   🔍 Recherche capacité copiée avec nodeId: ${variable.nodeId}`);

        if (type === 'node-formula') {
          const formula = await prisma.treeBranchLeafNodeFormula.findFirst({
            where: { nodeId: variable.nodeId }
          });

          if (formula) {
            console.log(`   ✅ FORMULE COPIÉE TROUVÉE: ${formula.name}`);
            console.log(`      ID: ${formula.id}`);
            console.log(`      NodeID: ${formula.nodeId}`);
          } else {
            console.log(`   ❌ FORMULE COPIÉE NON TROUVÉE`);
          }

        } else if (type === 'node-condition') {
          const condition = await prisma.treeBranchLeafNodeCondition.findFirst({
            where: { nodeId: variable.nodeId }
          });

          if (condition) {
            console.log(`   ✅ CONDITION COPIÉE TROUVÉE: ${condition.name}`);
            console.log(`      ID: ${condition.id}`);
            console.log(`      NodeID: ${condition.nodeId}`);
          } else {
            console.log(`   ❌ CONDITION COPIÉE NON TROUVÉE`);
          }

        } else if (type === 'node-table') {
          const table = await prisma.treeBranchLeafNodeTable.findFirst({
            where: { nodeId: variable.nodeId }
          });

          if (table) {
            console.log(`   ✅ TABLE COPIÉE TROUVÉE: ${table.name}`);
            console.log(`      ID: ${table.id}`);
            console.log(`      NodeID: ${table.nodeId}`);
          } else {
            console.log(`   ❌ TABLE COPIÉE NON TROUVÉE`);
          }
        }
      }
    }

    // ÉTAPE 3: Résumé
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 RÉSUMÉ DU DIAGNOSTIC\n');

    const totalVars = variables.length;
    const copiedVars = copiedVariables.length;
    
    console.log(`Variables originales: ${totalVars}`);
    console.log(`Variables copiées: ${copiedVars}`);

    if (copiedVars === 0) {
      console.log('\n⚠️  Aucune variable copiée trouvée - La copie n\'a pas eu lieu');
    } else {
      console.log(`\n✅ Variables copiées trouvées - Vérifier les capacités ci-dessus`);
    }

    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('\n❌ ERREUR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
