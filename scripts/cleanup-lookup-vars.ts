import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupLookupVariables() {
  console.log('🧹 CLEANUP: Supprimer les variables sur les champs lookup\n');

  try {
    const nodes = await prisma.treeBranchLeafNode.findMany({
      where: { label: { in: ['Orientation', 'Inclinaison'] } }
    });

    console.log(`📍 Trouvé ${nodes.length} nœud(s)\n`);

    for (const node of nodes) {
      console.log(`🔄 "${node.label}" (${node.id})`);
      
      const updated = await prisma.treeBranchLeafNode.update({
        where: { id: node.id },
        data: {
          // Garder la lookup
          hasTable: true,
          
          // Supprimer les données/variables
          hasData: false,
          data_activeId: null,
          data_displayFormat: null,
          data_instances: null,
          data_precision: null,
          data_unit: null,
          data_visibleToUser: null,
          
          // Garder seulement la liaison à la table
          linkedTableIds: node.linkedTableIds,
          linkedVariableIds: [],  // Vider les variables liées
          
          updatedAt: new Date()
        }
      });

      console.log(`   ✅ Nettoyé:`);
      console.log(`      - hasData: false`);
      console.log(`      - hasTable: true`);
      console.log(`      - linkedVariableIds: []`);
      console.log('');
    }

    console.log('✅ CLEANUP TERMINÉ');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupLookupVariables();
