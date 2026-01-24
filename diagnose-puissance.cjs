const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function diagnosePuissance() {
  try {
    // 1. Chercher le node original "Puissance WC"
    const originalNode = await prisma.treeBranchLeafNode.findFirst({
      where: {
        label: { contains: 'Puissance' }
      }
    });

    console.log('\n=== NODE ORIGINAL PUISSANCE ===');
    console.log('ID:', originalNode?.id);
    console.log('Label:', originalNode?.label);
    console.log('hasTable:', originalNode?.hasTable);
    console.log('table_activeId:', originalNode?.table_activeId);
    console.log('Metadata:', JSON.stringify(originalNode?.metadata, null, 2));

    // 2. Chercher les nodes dupliqués "Puissance-1"
    const duplicatedNode = await prisma.treeBranchLeafNode.findFirst({
      where: {
        label: 'Puissance-1'
      }
    });

    console.log('\n=== NODE DUPLIQUÉ PUISSANCE-1 ===');
    console.log('Trouvé:', !!duplicatedNode);
    if (duplicatedNode) {
      console.log('ID:', duplicatedNode.id);
      console.log('Label:', duplicatedNode.label);
      console.log('hasTable:', duplicatedNode.hasTable);
      console.log('table_activeId:', duplicatedNode.table_activeId);
      console.log('Metadata:', JSON.stringify(duplicatedNode.metadata, null, 2));
    } else {
      console.log('❌ Node Puissance-1 N\'EXISTE PAS!');
    }

    // 3. Si le node dupliqué existe, chercher sa SelectConfig
    if (duplicatedNode && duplicatedNode.table_activeId) {
      const selectConfig = await prisma.treeBranchLeafSelectConfig.findFirst({
        where: {
          table_id: duplicatedNode.table_activeId
        }
      });

      console.log('\n=== SELECT CONFIG DUPLIQUÉ ===');
      console.log('Trouvé:', !!selectConfig);
      if (selectConfig) {
        console.log('Config:', JSON.stringify(selectConfig.config, null, 2));
      }
    }

  } catch (error) {
    console.error('Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

diagnosePuissance();
