/**
 * Script de test pour simuler la logique de copie des capacités
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCopyLogic() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TEST DE LA LOGIQUE DE COPIE DES CAPACITÉS');
  console.log('='.repeat(80) + '\n');

  try {
    // Test 1: Trouver une variable avec formule
    console.log('TEST 1: Variable avec formule\n');
    
    const varWithFormula = await prisma.treeBranchLeafNodeVariable.findFirst({
      where: {
        sourceRef: {
          startsWith: 'node-formula:'
        }
      }
    });

    if (varWithFormula) {
      console.log(`✅ Variable trouvée: ${varWithFormula.exposedKey}`);
      console.log(`   ID: ${varWithFormula.id}`);
      console.log(`   NodeID: ${varWithFormula.nodeId}`);
      console.log(`   SourceRef: ${varWithFormula.sourceRef}`);

      // Test de recherche de la formule
      console.log('\n   🔍 Test 1: Recherche par ID (ANCIEN CODE - BUGUÉ)');
      const testById = await prisma.treeBranchLeafNodeFormula.findUnique({
        where: { id: varWithFormula.nodeId }
      });
      console.log(`   Résultat: ${testById ? '✅ TROUVÉ' : '❌ NON TROUVÉ'}`);
      if (testById) {
        console.log(`   Formule: ${testById.name} (ID: ${testById.id}, NodeID: ${testById.nodeId})`);
      }

      console.log('\n   🔍 Test 2: Recherche par NodeID (NOUVEAU CODE - CORRECT)');
      const testByNodeId = await prisma.treeBranchLeafNodeFormula.findFirst({
        where: { nodeId: varWithFormula.nodeId }
      });
      console.log(`   Résultat: ${testByNodeId ? '✅ TROUVÉ' : '❌ NON TROUVÉ'}`);
      if (testByNodeId) {
        console.log(`   Formule: ${testByNodeId.name} (ID: ${testByNodeId.id}, NodeID: ${testByNodeId.nodeId})`);
      }

      // Simulation de copie
      console.log('\n   🔧 Simulation de copie:');
      if (testByNodeId) {
        const suffix = 1;
        const newNodeId = `${varWithFormula.nodeId}-${suffix}`;
        const newId = `${testByNodeId.id}-${suffix}`;
        
        console.log(`   Nouveau NodeID: ${newNodeId}`);
        console.log(`   Nouveau ID: ${newId}`);
        console.log(`   ✅ LOGIQUE CORRECTE`);
      } else {
        console.log(`   ❌ IMPOSSIBLE DE COPIER - Formule non trouvée`);
      }
    } else {
      console.log('❌ Aucune variable avec formule trouvée');
    }

    // Test 2: Trouver une variable avec condition
    console.log('\n\n' + '─'.repeat(80));
    console.log('TEST 2: Variable avec condition\n');
    
    const varWithCondition = await prisma.treeBranchLeafNodeVariable.findFirst({
      where: {
        sourceRef: {
          startsWith: 'node-condition:'
        }
      }
    });

    if (varWithCondition) {
      console.log(`✅ Variable trouvée: ${varWithCondition.exposedKey}`);
      console.log(`   ID: ${varWithCondition.id}`);
      console.log(`   NodeID: ${varWithCondition.nodeId}`);
      console.log(`   SourceRef: ${varWithCondition.sourceRef}`);

      console.log('\n   🔍 Test 1: Recherche par ID (ANCIEN CODE - BUGUÉ)');
      const testById = await prisma.treeBranchLeafNodeCondition.findUnique({
        where: { id: varWithCondition.nodeId }
      });
      console.log(`   Résultat: ${testById ? '✅ TROUVÉ' : '❌ NON TROUVÉ'}`);

      console.log('\n   🔍 Test 2: Recherche par NodeID (NOUVEAU CODE - CORRECT)');
      const testByNodeId = await prisma.treeBranchLeafNodeCondition.findFirst({
        where: { nodeId: varWithCondition.nodeId }
      });
      console.log(`   Résultat: ${testByNodeId ? '✅ TROUVÉ' : '❌ NON TROUVÉ'}`);
      if (testByNodeId) {
        console.log(`   Condition: ${testByNodeId.name} (ID: ${testByNodeId.id}, NodeID: ${testByNodeId.nodeId})`);
      }
    } else {
      console.log('❌ Aucune variable avec condition trouvée');
    }

    // Test 3: Trouver une variable avec table
    console.log('\n\n' + '─'.repeat(80));
    console.log('TEST 3: Variable avec table\n');
    
    const varWithTable = await prisma.treeBranchLeafNodeVariable.findFirst({
      where: {
        sourceRef: {
          startsWith: 'node-table:'
        }
      }
    });

    if (varWithTable) {
      console.log(`✅ Variable trouvée: ${varWithTable.exposedKey}`);
      console.log(`   ID: ${varWithTable.id}`);
      console.log(`   NodeID: ${varWithTable.nodeId}`);
      console.log(`   SourceRef: ${varWithTable.sourceRef}`);

      console.log('\n   🔍 Test 1: Recherche par ID (ANCIEN CODE - BUGUÉ)');
      const testById = await prisma.treeBranchLeafNodeTable.findUnique({
        where: { id: varWithTable.nodeId }
      });
      console.log(`   Résultat: ${testById ? '✅ TROUVÉ' : '❌ NON TROUVÉ'}`);

      console.log('\n   🔍 Test 2: Recherche par NodeID (NOUVEAU CODE - CORRECT)');
      const testByNodeId = await prisma.treeBranchLeafNodeTable.findFirst({
        where: { nodeId: varWithTable.nodeId }
      });
      console.log(`   Résultat: ${testByNodeId ? '✅ TROUVÉ' : '❌ NON TROUVÉ'}`);
      if (testByNodeId) {
        console.log(`   Table: ${testByNodeId.name} (ID: ${testByNodeId.id}, NodeID: ${testByNodeId.nodeId})`);
      }
    } else {
      console.log('❌ Aucune variable avec table trouvée');
    }

    console.log('\n\n' + '='.repeat(80));
    console.log('📊 CONCLUSION\n');
    console.log('Si les recherches "par ID" (ancien code) échouent et les recherches');
    console.log('"par NodeID" (nouveau code) réussissent, alors le fix est correct.\n');
    console.log('Le serveur doit être redémarré pour que les changements prennent effet.');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ ERREUR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCopyLogic();
