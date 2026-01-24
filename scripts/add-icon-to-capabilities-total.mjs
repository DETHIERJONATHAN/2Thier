import { db } from '../src/lib/database.js';

async function addIconToCapabilities() {
  try {
    console.log('🔄 Ajout de l\'icône dans capabilities.datas pour le Total...\n');

    const totalNode = await db.treeBranchLeafNode.findUnique({
      where: { id: 'c8139b2c-b0a8-44e7-8448-137fd2fb8e23-sum-total' }
    });

    if (!totalNode) {
      console.log('❌ Champ Total non trouvé');
      return;
    }

    console.log(`📊 Champ: ${totalNode.label}`);
    
    const metadata = { ...totalNode.metadata };
    const icon = '⚡';

    // S'assurer que capabilities existe
    if (!metadata.capabilities) {
      metadata.capabilities = {};
    }

    // Ajouter capabilities.datas avec l'icône
    metadata.capabilities.datas = [{
      id: `data_${totalNode.id}`,
      config: {
        icon: icon,
        sourceRef: `node-variable:${metadata.sourceVariableId}-sum-total`
      }
    }];

    // Mettre à jour
    await db.treeBranchLeafNode.update({
      where: { id: totalNode.id },
      data: { metadata }
    });

    console.log(`✅ Icône ajoutée dans metadata.capabilities.datas:`);
    console.log(JSON.stringify(metadata.capabilities.datas, null, 2));
    console.log('\n🎉 Total devrait maintenant afficher ⚡ au lieu de 💧');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await db.$disconnect();
  }
}

addIconToCapabilities();
