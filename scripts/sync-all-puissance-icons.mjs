import { db } from '../src/lib/database.js';

async function syncAllPuissanceIcons() {
  try {
    console.log('🔄 Synchronisation des icônes pour tous les champs Puissance...\n');

    const nodeIds = [
      'c8139b2c-b0a8-44e7-8448-137fd2fb8e23',       // Puissance WC
      'c8139b2c-b0a8-44e7-8448-137fd2fb8e23-1',     // Puissance WC-1
      'c8139b2c-b0a8-44e7-8448-137fd2fb8e23-sum-total' // Total
    ];

    for (const nodeId of nodeIds) {
      const node = await db.treeBranchLeafNode.findUnique({
        where: { id: nodeId }
      });

      if (!node) {
        console.log(`❌ Champ ${nodeId} non trouvé`);
        continue;
      }

      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📊 Champ: ${node.label}`);
      console.log(`   metadata.icon actuel: ${node.metadata.icon || 'N/A'}`);

      // Copier l'icône de metadata.icon vers metadata.capabilities.datas[].config.icon
      const metadata = { ...node.metadata };
      
      if (!metadata.capabilities) {
        metadata.capabilities = {};
      }
      
      if (!metadata.capabilities.datas || !Array.isArray(metadata.capabilities.datas)) {
        metadata.capabilities.datas = [];
      }

      // Mettre à jour ou créer une entrée data avec l'icône
      if (metadata.capabilities.datas.length === 0) {
        metadata.capabilities.datas.push({
          id: `data_${nodeId}`,
          config: {
            icon: '⚡'
          }
        });
        console.log(`   ✅ Nouvelle entrée datas créée avec icône ⚡`);
      } else {
        // Mettre à jour toutes les entrées existantes
        metadata.capabilities.datas = metadata.capabilities.datas.map(data => ({
          ...data,
          config: {
            ...(data.config || {}),
            icon: '⚡'
          }
        }));
        console.log(`   ✅ ${metadata.capabilities.datas.length} entrée(s) datas mise(s) à jour avec icône ⚡`);
      }

      // Sauvegarder
      await db.treeBranchLeafNode.update({
        where: { id: node.id },
        data: { metadata }
      });
    }

    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Synchronisation terminée pour tous les champs Puissance');
    console.log('');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await db.$disconnect();
  }
}

syncAllPuissanceIcons();
