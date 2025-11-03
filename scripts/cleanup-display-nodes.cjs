const { PrismaClient } = require('@prisma/client');

(async () => {
  const prisma = new PrismaClient();
  try {
    console.log('⛏️  Cleanup display nodes/variables start');

    // 1) Supprimer les variables display-var-*
    const displayVars = await prisma.treeBranchLeafNodeVariable.findMany({
      where: { id: { startsWith: 'display-var-' } },
      select: { id: true, nodeId: true }
    });
    console.log(`Found ${displayVars.length} display variables to delete`);

    for (const v of displayVars) {
      try {
        await prisma.treeBranchLeafNodeVariable.delete({ where: { id: v.id } });
        console.log(`  ✓ Deleted variable ${v.id}`);
      } catch (e) {
        console.warn(`  ⚠️ Failed deleting variable ${v.id}:`, e.message);
      }
    }

    // 2) Supprimer les nœuds display-* de type leaf_field
    const displayNodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        id: { startsWith: 'display-' },
        type: 'leaf_field'
      },
      select: { id: true }
    });
    console.log(`Found ${displayNodes.length} display nodes to delete`);

    for (const n of displayNodes) {
      try {
        await prisma.treeBranchLeafNode.delete({ where: { id: n.id } });
        console.log(`  ✓ Deleted node ${n.id}`);
      } catch (e) {
        console.warn(`  ⚠️ Failed deleting node ${n.id}:`, e.message);
      }
    }

    console.log('✅ Cleanup done');
  } catch (e) {
    console.error('❌ Cleanup error:', e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
