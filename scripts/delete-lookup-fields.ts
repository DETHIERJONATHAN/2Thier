import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteLookupDisplayFields() {
  console.log('🗑️ SUPPRESSION: Champs "Lookup Table Column/ROW" inutiles\n');

  try {
    // Trouver et supprimer les champs avec label commençant par "Lookup Table"
    const lookupFields = await prisma.treeBranchLeafNode.findMany({
      where: {
        label: {
          startsWith: 'Lookup Table'
        }
      },
      select: {
        id: true,
        label: true,
        parentId: true
      }
    });

    console.log(`📍 Trouvé ${lookupFields.length} champ(s) à supprimer\n`);

    for (const field of lookupFields) {
      console.log(`🗑️ Suppression: "${field.label}" (${field.id})`);

      // Supprimer les variables associées
      await prisma.treeBranchLeafNodeVariable.deleteMany({
        where: { nodeId: field.id }
      });

      // Supprimer les formules associées
      await prisma.treeBranchLeafNodeFormula.deleteMany({
        where: { nodeId: field.id }
      });

      // Supprimer les conditions associées
      await prisma.treeBranchLeafNodeCondition.deleteMany({
        where: { nodeId: field.id }
      });

      // Supprimer le nœud lui-même
      await prisma.treeBranchLeafNode.delete({
        where: { id: field.id }
      });

      console.log(`   ✅ Supprimé\n`);
    }

    console.log(`✅ SUPPRESSION TERMINÉE - ${lookupFields.length} champ(s) supprimé(s)`);

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteLookupDisplayFields();
