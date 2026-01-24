import { db } from '../src/lib/database.js';

async function checkMetadataIcon() {
  try {
    console.log('🔍 Vérification des icônes dans metadata...\n');

    // Récupérer les 3 champs Puissance
    const nodes = await db.treeBranchLeafNode.findMany({
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
      console.log(`\n   ✅ metadata.icon: ${metadata.icon || '❌ NON DÉFINIE'}`);
      
      // Icône dans capabilities.datas
      if (metadata.capabilities?.datas) {
        console.log(`\n   📦 metadata.capabilities.datas (${metadata.capabilities.datas.length} entrées):`);
        metadata.capabilities.datas.forEach((data, idx) => {
          console.log(`\n      [${idx}] id: ${data.id}`);
          console.log(`          config.icon: ${data.config?.icon || '❌ NON DÉFINIE'}`);
          console.log(`          config.sourceRef: ${data.config?.sourceRef || 'N/A'}`);
        });
      } else {
        console.log(`\n   📦 metadata.capabilities.datas: ❌ NON PRÉSENT`);
      }
    }

    console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ Vérification terminée\n`);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await db.$disconnect();
  }
}

checkMetadataIcon();
