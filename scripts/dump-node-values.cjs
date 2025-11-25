const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const nodeId = process.argv[2];

if (!nodeId) {
  console.error('Usage: node scripts/dump-node-values.cjs <nodeId>');
  process.exit(1);
}

(async () => {
  try {
    const rows = await prisma.treeBranchLeafSubmissionData.findMany({
      where: { nodeId },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    if (rows.length === 0) {
      console.log('Aucune valeur enregistrée pour ce nœud.');
      return;
    }
    rows.forEach(row => {
      console.log('────────────────────────────');
      console.log('SubmissionId:', row.submissionId);
      console.log('Value:', row.value);
      console.log('CreatedAt:', row.createdAt);
      console.log('LastResolved:', row.lastResolved);
      console.log('OperationSource:', row.operationSource);
      console.log('OperationResult:', JSON.stringify(row.operationResult));
    });
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
})();
