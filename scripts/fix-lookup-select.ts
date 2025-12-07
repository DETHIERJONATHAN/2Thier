import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixLookupFields() {
  console.log('🔧 FIX LOOKUP: Restaurer Orientation et Inclinaison comme SELECT avec lookup\n');

  try {
    // 1. Trouver les nœuds lookup
    const nodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        label: { in: ['Orientation', 'Inclinaison'] }
      },
      select: {
        id: true,
        label: true,
        fieldType: true,
        metadata: true
      }
    });

    console.log(`📍 Trouvé ${nodes.length} nœud(s)\n`);

    for (const node of nodes) {
      console.log(`🔄 ${node.label}:`);

      // Vérifier si c'est un lookup
      const meta = node.metadata as any;
      const isLookup = meta?.lookup?.enabled || meta?.lookup?.columnLookupEnabled || meta?.lookup?.rowLookupEnabled;

      if (!isLookup) {
        console.log(`   ⚠️ Pas de lookup trouvé`);
        continue;
      }

      console.log(`   ✅ Lookup détecté`);

      // Restaurer fieldType à SELECT
      if (node.fieldType !== 'SELECT') {
        const updated = await prisma.treeBranchLeafNode.update({
          where: { id: node.id },
          data: {
            fieldType: 'SELECT',
            // NE PAS créer de variables ni de display
            hasData: false,
            hasFormula: false,
            data_activeId: null,
            data_instances: {},
            updatedAt: new Date()
          }
        });
        console.log(`   ✅ fieldType restauré à SELECT`);
        console.log(`   ✅ Variables/Formulas supprimées`);
      }

      // Afficher la config lookup
      if (isLookup) {
        console.log(`   📋 Lookup config: ${JSON.stringify(meta.lookup).substring(0, 150)}...`);
      }
      console.log('');
    }

    console.log('✅ FIX TERMINÉ - Les lookups restent simples SELECT');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixLookupFields();
