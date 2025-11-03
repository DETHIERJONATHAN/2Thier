#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const variableId = process.argv[2];
    if (!variableId) {
      console.error('Usage: node scripts/verify-tbl-display-node.cjs <variableId>');
      process.exit(1);
    }

    const variable = await prisma.treeBranchLeafNodeVariable.findUnique({
      where: { id: variableId },
      select: { id: true, nodeId: true, displayName: true, exposedKey: true, TreeBranchLeafNode: { select: { treeId: true } } }
    });
    if (!variable) {
      console.error('Variable non trouvée:', variableId);
      process.exit(2);
    }

    const treeId = variable.TreeBranchLeafNode.treeId;

    // Chercher des nœuds d'affichage (leaf+data) référencant cette variable
    const nodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        treeId,
        linkedVariableIds: { has: variable.id },
      },
      select: { id: true, parentId: true, type: true, subType: true, label: true }
    });

    const dataNodes = nodes.filter(n => (n.type === 'leaf' && n.subType === 'data'));

    console.log('Variable:', {
      id: variable.id,
      nodeId: variable.nodeId,
      displayName: variable.displayName,
      exposedKey: variable.exposedKey,
      treeId,
    });

    if (dataNodes.length === 0) {
      console.log('❌ Aucun nœud leaf(data) trouvé lié à cette variable.');
    } else {
      console.log(`✅ ${dataNodes.length} nœud(s) leaf(data) trouvé(s):`);
      for (const n of dataNodes) {
        console.log(` - ${n.id} [parent=${n.parentId}] label="${n.label}"`);
      }
    }
  } catch (e) {
    console.error('Erreur:', e);
    process.exit(10);
  } finally {
    await prisma.$disconnect();
  }
}

main();
