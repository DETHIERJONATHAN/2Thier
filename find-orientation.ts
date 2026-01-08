import { db } from './src/lib/database';

async function main() {
  // Chercher le node orientation
  const orientationNodes = await db.treeBranchLeafNode.findMany({
    where: { 
      label: { contains: 'Orientation', mode: 'insensitive' }
    },
    select: { id: true, label: true, hasTable: true }
  });
  
  console.log('Nodes contenant "Orientation":', orientationNodes.length);
  for (const n of orientationNodes) {
    console.log(' -', n.id, '|', n.label, '| hasTable:', n.hasTable);
  }
  
  // Chercher la table Import O-I
  const oiTable = await db.treeBranchLeafNodeTable.findFirst({
    where: { name: { contains: 'Import O-I', mode: 'insensitive' } },
    select: { id: true, nodeId: true, name: true }
  });
  
  console.log('\nTable Import O-I:', oiTable);
  
  if (oiTable?.nodeId) {
    const ownerNode = await db.treeBranchLeafNode.findUnique({
      where: { id: oiTable.nodeId },
      select: { id: true, label: true, hasTable: true }
    });
    console.log('Propriétaire de la table:', ownerNode);
  }
}
main();
