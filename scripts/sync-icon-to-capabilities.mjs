import { db } from '../src/lib/database.js';

async function syncIconToCapabilities() {
  try {
    console.log('🔄 Synchronisation icône vers capabilities.datas...\n');

    // Récupérer le champ Total
    const totalNode = await db.treeBranchLeafNode.findUnique({
      where: { id: 'c8139b2c-b0a8-44e7-8448-137fd2fb8e23-sum-total' }
    });

    if (!totalNode) {
      console.log('❌ Champ Total non trouvé');
      return;
    }

    console.log(`📊 Champ trouvé: ${totalNode.label}`);
    console.log(`   metadata.icon actuel: ${totalNode.metadata.icon || 'N/A'}`);

    // Copier l'icône de metadata.icon vers metadata.capabilities.datas[].config.icon
    const metadata = { ...totalNode.metadata };
    
    if (!metadata.capabilities) {
      metadata.capabilities = {};
    }
    
    if (!metadata.capabilities.datas || !Array.isArray(metadata.capabilities.datas)) {
      metadata.capabilities.datas = [];
    }

    // Mettre à jour ou créer une entrée data avec l'icône
    if (metadata.capabilities.datas.length === 0) {
      metadata.capabilities.datas.push({
        id: 'data_total',
        config: {
          icon: '⚡'
        }
      });
    } else {
      // Mettre à jour toutes les entrées existantes
      metadata.capabilities.datas = metadata.capabilities.datas.map(data => ({
        ...data,
        config: {
          ...(data.config || {}),
          icon: '⚡'
        }
      }));
    }

    // Sauvegarder
    await db.treeBranchLeafNode.update({
      where: { id: totalNode.id },
      data: { metadata }
    });

    console.log('\n✅ Icône synchronisée vers capabilities.datas');
    console.log(`   Nouvelles capabilities.datas:`, JSON.stringify(metadata.capabilities.datas, null, 2));

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await db.$disconnect();
  }
}

syncIconToCapabilities();
