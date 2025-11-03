#!/usr/bin/env node
/**
 * Script pour supprimer toutes les variables créées par le script précédent
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🗑️ SUPPRESSION DES VARIABLES CRÉÉES');
  console.log('=' .repeat(50));

  // 1. Récupérer toutes les variables avec des exposedKey qui commencent par "var_"
  const variablesToDelete = await prisma.treeBranchLeafNodeVariable.findMany({
    where: {
      exposedKey: {
        startsWith: 'var_'
      }
    },
    select: {
      id: true,
      nodeId: true,
      exposedKey: true,
      TreeBranchLeafNode: {
        select: {
          label: true,
          linkedVariableIds: true
        }
      }
    }
  });

  console.log(`📊 Variables à supprimer: ${variablesToDelete.length}`);

  let deletedCount = 0;
  let updatedNodesCount = 0;

  for (const variable of variablesToDelete) {
    try {
      console.log(`\n🗑️ Suppression: "${variable.TreeBranchLeafNode?.label}" (${variable.exposedKey})`);
      
      // Retirer l'ID de la variable du linkedVariableIds du nœud
      const currentLinkedIds = variable.TreeBranchLeafNode?.linkedVariableIds || [];
      const newLinkedIds = currentLinkedIds.filter(id => id !== variable.id);
      
      // Mettre à jour le nœud pour retirer la variable de linkedVariableIds
      await prisma.treeBranchLeafNode.update({
        where: { id: variable.nodeId },
        data: { 
          linkedVariableIds: newLinkedIds,
          hasData: false, // Retirer le flag hasData
          updatedAt: new Date()
        }
      });

      console.log(`   🔗 linkedVariableIds mis à jour: [${newLinkedIds.join(', ')}]`);
      updatedNodesCount++;

      // Supprimer la variable
      await prisma.treeBranchLeafNodeVariable.delete({
        where: { id: variable.id }
      });

      console.log(`   ✅ Variable supprimée: ${variable.id}`);
      deletedCount++;

    } catch (error) {
      console.error(`   ❌ Erreur pour "${variable.exposedKey}":`, error.message);
    }
  }

  console.log('\n📈 RÉSUMÉ:');
  console.log('=' .repeat(50));
  console.log(`Variables supprimées: ${deletedCount}`);
  console.log(`Nœuds mis à jour: ${updatedNodesCount}`);

  // Vérification finale
  const remainingVariables = await prisma.treeBranchLeafNodeVariable.count();
  console.log(`Variables restantes: ${remainingVariables}`);

  await prisma.$disconnect();
}

main().catch(console.error);