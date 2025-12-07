import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixOrientationInclinaison() {
  console.log('🔧 FIX: Orientation et Inclinaison\n');

  try {
    // Trouver les nœuds "Orientation" et "Inclinaison"
    const orientationNode = await prisma.treeBranchLeafNode.findFirst({
      where: { label: { contains: 'Orientation' } }
    });

    const inclinaisonNode = await prisma.treeBranchLeafNode.findFirst({
      where: { label: { contains: 'Inclinaison' } }
    });

    const nodesToFix = [orientationNode, inclinaisonNode].filter(Boolean);
    console.log(`📍 Nœuds trouvés: ${nodesToFix.length}`);

    for (const node of nodesToFix) {
      if (!node) continue;

      console.log(`\n🔍 Analyse: "${node.label}" (${node.id})`);
      console.log(`   fieldType: ${node.fieldType}`);
      console.log(`   hasData: ${node.hasData}`);
      console.log(`   hasFormula: ${node.hasFormula}`);
      console.log(`   hasCondition: ${node.hasCondition}`);

      // Supprimer TOUTES les variables et formules associées
      const variables = await prisma.treeBranchLeafNodeVariable.findMany({
        where: { nodeId: node.id }
      });

      if (variables.length > 0) {
        console.log(`   ❌ ${variables.length} variable(s) trouvée(s) - SUPPRESSION`);
        await prisma.treeBranchLeafNodeVariable.deleteMany({
          where: { nodeId: node.id }
        });
      }

      const formulas = await prisma.treeBranchLeafNodeFormula.findMany({
        where: { nodeId: node.id }
      });

      if (formulas.length > 0) {
        console.log(`   ❌ ${formulas.length} formule(s) trouvée(s) - SUPPRESSION`);
        await prisma.treeBranchLeafNodeFormula.deleteMany({
          where: { nodeId: node.id }
        });
      }

      // Nettoyer les propriétés data du nœud
      const updated = await prisma.treeBranchLeafNode.update({
        where: { id: node.id },
        data: {
          hasData: false,
          hasFormula: false,
          data_activeId: null,
          data_displayFormat: null,
          data_precision: null,
          data_unit: null,
          data_visibleToUser: null,
          data_instances: {},
          linkedVariableIds: [],
          linkedTableIds: [],
          linkedFormulaIds: [],
          updatedAt: new Date()
        }
      });

      console.log(`   ✅ Nettoyé - fieldType: ${updated.fieldType}`);
    }

    console.log(`\n✅ FIX TERMINÉ`);
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixOrientationInclinaison();
