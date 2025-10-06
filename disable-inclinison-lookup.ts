import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function disableLookup() {
  try {
    const fieldId = '4aad6a8f-6bba-42aa-bd3a-4de1f182075a';

    console.log('🔧 Désactivation du lookup pour le champ Inclinison...\n');

    // 1. Supprimer la configuration SELECT (table lookup)
    console.log('1️⃣ Suppression de TreeBranchLeafSelectConfig...');
    await prisma.treeBranchLeafSelectConfig.deleteMany({
      where: { nodeId: fieldId }
    });
    console.log('✅ TreeBranchLeafSelectConfig supprimé\n');

    // 2. Récupérer le node actuel pour modifier metadata
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: fieldId }
    });

    if (!node) {
      console.error('❌ Champ non trouvé');
      return;
    }

    // 3. Nettoyer metadata.capabilities.table
    const metadata = node.metadata as any || {};
    if (metadata.capabilities?.table) {
      delete metadata.capabilities.table;
    }

    console.log('2️⃣ Mise à jour du node...');
    await prisma.treeBranchLeafNode.update({
      where: { id: fieldId },
      data: {
        hasTable: false,
        table_activeId: null,
        table_instances: null,
        metadata
      }
    });
    console.log('✅ Node mis à jour (hasTable=false)\n');

    console.log('🎉 Lookup désactivé avec succès !');
    console.log('Le champ "Inclinison" est maintenant un champ texte normal.');
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

disableLookup();
