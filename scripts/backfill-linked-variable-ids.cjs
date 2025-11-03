/**
 * ðŸ"§ SCRIPT DE MIGRATION: Remplir linkedVariableIds
 * 
 * Ce script analyse toutes les variables (TreeBranchLeafNodeVariable)
 * et met Ã  jour le champ linkedVariableIds du nÅ"ud propriÃ©taire
 * 
 * POURQUOI ?
 * ----------
 * Les variables existent dans la table TreeBranchLeafNodeVariable avec nodeId,
 * mais les nÅ"uds (TreeBranchLeafNode) n'ont pas leur linkedVariableIds Ã  jour.
 * 
 * Ce script rÃ©tablit la cohÃ©rence bidirectionnelle.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('ðŸš€ DÃ©marrage du backfill linkedVariableIds...\n');

  try {
    // 1ï¸âƒ£ RÃ©cupÃ©rer toutes les variables
    console.log('ðŸ" Chargement de toutes les variables...');
    const allVariables = await prisma.treeBranchLeafNodeVariable.findMany({
      select: {
        id: true,
        nodeId: true,
        exposedKey: true,
        displayName: true
      }
    });

    console.log(`âœ… ${allVariables.length} variables trouvÃ©es\n`);

    // 2ï¸âƒ£ Grouper par nodeId
    const variablesByNode = new Map();
    for (const variable of allVariables) {
      if (!variable.nodeId) continue;
      
      if (!variablesByNode.has(variable.nodeId)) {
        variablesByNode.set(variable.nodeId, []);
      }
      variablesByNode.get(variable.nodeId).push(variable.id);
    }

    console.log(`ðŸ"Š ${variablesByNode.size} nÅ"uds ont des variables associÃ©es\n`);

    // 3ï¸âƒ£ Mettre Ã  jour chaque nÅ"ud
    let updateCount = 0;
    let errorCount = 0;

    for (const [nodeId, variableIds] of variablesByNode.entries()) {
      try {
        // VÃ©rifier si le nÅ"ud existe
        const node = await prisma.treeBranchLeafNode.findUnique({
          where: { id: nodeId },
          select: { id: true, label: true, linkedVariableIds: true }
        });

        if (!node) {
          console.warn(`âš ï¸ NÅ"ud ${nodeId} introuvable (${variableIds.length} variables orphelines)`);
          errorCount++;
          continue;
        }

        // Mettre Ã  jour linkedVariableIds (sans doublons)
        const existingIds = node.linkedVariableIds || [];
        const allIds = [...new Set([...existingIds, ...variableIds])];

        await prisma.treeBranchLeafNode.update({
          where: { id: nodeId },
          data: { linkedVariableIds: { set: allIds } }
        });

        console.log(`âœ… NÅ"ud "${node.label}" (${nodeId}): ${variableIds.length} variables liÃ©es`);
        updateCount++;

      } catch (error) {
        console.error(`âŒ Erreur pour nÅ"ud ${nodeId}:`, error.message);
        errorCount++;
      }
    }

    // 4ï¸âƒ£ RÃ©sumÃ©
    console.log('\n' + '='.repeat(80));
    console.log('ðŸ"Š RÃ‰SUMÃ‰ DU BACKFILL');
    console.log('='.repeat(80));
    console.log(`âœ… NÅ"uds mis Ã  jour: ${updateCount}`);
    console.log(`âŒ Erreurs: ${errorCount}`);
    console.log(`ðŸ"¦ Total variables: ${allVariables.length}`);
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\nâŒ ERREUR GLOBALE:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    console.log('\nðŸŽ‰ Backfill terminÃ© avec succÃ¨s !');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nâŒ Ã‰chec du backfill:', error);
    process.exit(1);
  });
