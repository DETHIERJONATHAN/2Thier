import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function findOrientationTable() {
  try {
    console.log('🔍 Recherche des tables avec "Orientation"...\n');
    
    const tables = await prisma.treeBranchLeafNodeTable.findMany({
      where: {
        name: { contains: 'Orientation', mode: 'insensitive' }
      },
      include: {
        TreeBranchLeafNode: {
          select: { id: true, label: true }
        }
      }
    });
    
    if (tables.length === 0) {
      console.log('❌ Aucune table avec "Orientation" trouvée\n');
      
      // Chercher toutes les tables
      console.log('📊 Toutes les tables disponibles:');
      const allTables = await prisma.treeBranchLeafNodeTable.findMany({
        select: { id: true, name: true }
      });
      allTables.forEach((t, i) => {
        console.log(`[${i}] ${t.name} (${t.id})`);
      });
      return;
    }
    
    tables.forEach((table, i) => {
      console.log(`[${i}] Table: ${table.name}`);
      console.log(`    ID: ${table.id}`);
      console.log(`    Nœud: ${table.TreeBranchLeafNode?.label || 'N/A'} (${table.nodeId})`);
      console.log(`    Dimensions: ${table.columnsCount}c x ${table.rowsCount}l`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

findOrientationTable();
