import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixSelectFieldTypes() {
  console.log('🔧 FIX: Restaurer fieldType=SELECT pour les champs lookup\n');

  try {
    // Trouver tous les nœuds avec fieldType null mais avec config lookup
    const brokenNodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        AND: [
          { fieldType: null },
          { label: { in: ['Orientation', 'Inclinaison'] } }
        ]
      }
    });

    console.log(`📍 Trouvé ${brokenNodes.length} nœud(s) avec fieldType=null\n`);

    for (const node of brokenNodes) {
      console.log(`🔄 Restauration: "${node.label}" (${node.id})`);

      const fixed = await prisma.treeBranchLeafNode.update({
        where: { id: node.id },
        data: {
          fieldType: 'SELECT',
          updatedAt: new Date()
        }
      });

      console.log(`   ✅ fieldType restauré à: ${fixed.fieldType}\n`);
    }

    console.log(`✅ FIX TERMINÉ`);
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSelectFieldTypes();
