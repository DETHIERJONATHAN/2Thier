/**
 * 🔎 Script pour trouver les IDs des nodes Orientation
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findOrientationNodes() {
  console.log('\n🔎 RECHERCHE DES NODES "ORIENTATION"...\n');

  try {
    const nodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        label: {
          contains: 'Orientation',
          mode: 'insensitive'
        }
      },
      include: {
        TreeBranchLeafNodeTable: {
          include: {
            tableColumns: {
              select: { name: true, columnIndex: true }
            }
          }
        }
      }
    });

    console.log(`✅ ${nodes.length} node(s) trouvé(s)\n`);

    nodes.forEach((node, idx) => {
      console.log(`${idx + 1}. "${node.label}"`);
      console.log(`   ID: ${node.id}`);
      console.log(`   Repeater ID: ${node.repeaterId}`);
      console.log(`   Tables: ${node.TreeBranchLeafNodeTable.length}`);
      
      node.TreeBranchLeafNodeTable.forEach(table => {
        console.log(`     - "${table.name}" (${table.tableColumns.length} colonnes)`);
        table.tableColumns.forEach(col => {
          console.log(`       [${col.columnIndex}] ${col.name}`);
        });
      });
      console.log();
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findOrientationNodes();
