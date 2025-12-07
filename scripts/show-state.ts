/**
 * 🔍 SCRIPT SIMPLIFIÉ - Juste afficher les données
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyze() {
  console.log(`\n========================================`);
  console.log(`🔍 ÉTAT DES TABLES ET LINKED IDS`);
  console.log(`========================================\n`);

  try {
    // Tables avec lookup
    const tables = await prisma.treeBranchLeafNodeTable.findMany({
      where: {
        meta: {
          path: ['lookup'],
          not: null
        }
      }
    });

    console.log(`📊 TABLES AVEC LOOKUP:\n`);
    for (const table of tables) {
      const meta = table.meta as any;
      console.log(`📋 "${table.name}"`);
      console.log(`   ID: ${table.id}`);
      console.log(`   Meta lookup:`, JSON.stringify(meta?.lookup, null, 2));

      // Chercher le nœud propriétaire
      const owner = await prisma.treeBranchLeafNode.findUnique({
        where: { id: table.nodeId }
      });

      if (owner) {
        console.log(`   Owner Node linkedTableIds: ${JSON.stringify(owner.linkedTableIds)}`);
        console.log(`   Owner Node linkedVariableIds: ${JSON.stringify(owner.linkedVariableIds)}`);
      }
      console.log();
    }

    // Tous les Selects
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📌 TOUS LES CHAMPS SELECT (qui référencent @table.*)\n`);

    const allNodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        type: 'select'
      },
      select: {
        id: true,
        label: true,
        linkedTableIds: true,
        linkedVariableIds: true,
        hasData: true,
        type: true
      }
    });

    // Pour chaque select, chercher sa config
    for (const node of allNodes) {
      const selectCfg = await prisma.treeBranchLeafSelectConfig.findUnique({
        where: { nodeId: node.id }
      });

      if (selectCfg) {
        const meta = selectCfg.metadata as any;
        const sourceRef = meta?.sourceRef || 'NO_SOURCE';

        if (sourceRef.includes('@table.')) {
          console.log(`📌 "${node.label}"`);
          console.log(`   sourceRef: ${sourceRef}`);
          console.log(`   linkedTableIds: ${JSON.stringify(node.linkedTableIds)}`);
          console.log(`   linkedVariableIds: ${JSON.stringify(node.linkedVariableIds)}`);
          console.log(`   hasData: ${node.hasData}`);
          console.log();
        }
      }
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyze();
