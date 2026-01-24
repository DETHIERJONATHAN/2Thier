import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkIconLocation() {
  try {
    console.log('🔍 Vérification de l'emplacement des icônes...\n');

    // Récupérer les 3 champs Puissance
    const nodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        OR: [
          { id: 'c8139b2c-b0a8-44e7-8448-137fd2fb8e23' }, // Puissance WC
          { id: 'c8139b2c-b0a8-44e7-8448-137fd2fb8e23-1' }, // Puissance WC-1
          { id: 'c8139b2c-b0a8-44e7-8448-137fd2fb8e23-sum-total' }, // Total
        ]
      },
      select: {
        id: true,
        label: true,
        metadata: true
      }
    });

    for (const node of nodes) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📊 Champ: ${node.label}`);
      console.log(`   ID: ${node.id}`);
      
      const metadata = node.metadata;
      
      // Icône directe dans metadata
      console.log(`\n   1️⃣ metadata.icon: ${metadata.icon || '❌ NON DÉFINIE'}`);
      
      // Icône dans capabilities.datas
      if (metadata.capabilities?.datas) {
        console.log(`\n   2️⃣ metadata.capabilities.datas:`);
        metadata.capabilities.datas.forEach((data, idx) => {
          console.log(`      [${idx}] id: ${data.id}`);
          console.log(`          config.icon: ${data.config?.icon || '❌ NON DÉFINIE'}`);
          console.log(`          config.sourceRef: ${data.config?.sourceRef || 'N/A'}`);
        });
      } else {
        console.log(`\n   2️⃣ metadata.capabilities.datas: ❌ NON PRÉSENT`);
      }
      
      // Icône dans advancedConfig
      if (metadata.advancedConfig?.icon) {
        console.log(`\n   3️⃣ metadata.advancedConfig.icon: ${metadata.advancedConfig.icon}`);
      }
    }

    console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ Vérification terminée`);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkIconLocation();
