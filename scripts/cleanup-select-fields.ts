import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupSelectFields() {
  console.log('🧹 NETTOYAGE: Suppression des variables inutiles des champs SELECT\n');

  try {
    // 1️⃣ Trouver tous les nœuds avec type "SELECT" qui ont des variables inutiles
    const selectNodesWithVars = await prisma.treeBranchLeafNode.findMany({
      where: {
        fieldType: 'SELECT',
        hasData: true, // Ont des données/variables activées
      },
      include: {
        TreeBranchLeafNodeVariable: true,
      },
    });

    console.log(`📍 Trouvé ${selectNodesWithVars.length} champs SELECT avec variables\n`);

    for (const node of selectNodesWithVars) {
      console.log(`🔍 "${node.label}" (${node.id})`);

      // Supprimer les variables inutiles
      if (node.TreeBranchLeafNodeVariable.length > 0) {
        console.log(`   ❌ Suppression de ${node.TreeBranchLeafNodeVariable.length} variable(s)`);
        await prisma.treeBranchLeafNodeVariable.deleteMany({
          where: { nodeId: node.id },
        });
      }

      // Nettoyer les propriétés data du nœud
      const cleaned = await prisma.treeBranchLeafNode.update({
        where: { id: node.id },
        data: {
          hasData: false,
          data_activeId: null,
          data_displayFormat: null,
          data_precision: null,
          data_unit: null,
          data_visibleToUser: null,
          data_instances: {},
          updatedAt: new Date(),
        },
      });

      console.log(`   ✅ Nettoyé - hasData=false\n`);
    }

    // 2️⃣ Afficher les champs qui restent problématiques
    console.log('\n📋 Vérification finale...\n');
    const problemNodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        fieldType: 'SELECT',
        hasData: true,
      },
    });

    if (problemNodes.length === 0) {
      console.log('✅ Aucun champ SELECT avec variables - CLEAN !');
    } else {
      console.log(`⚠️ ${problemNodes.length} champ(s) SELECT encore problématique(s):`);
      problemNodes.forEach(n => console.log(`   - ${n.label}`));
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupSelectFields();
