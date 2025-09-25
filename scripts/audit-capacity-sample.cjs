// Génère un échantillon OperationDetail/Result pour une capacité donnée
// Usage:
//   node scripts/audit-capacity-sample.cjs --submissionId <SID> --sourceRef <formula:ID|condition:ID|table:ID>

const { PrismaClient } = require('@prisma/client');

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--submissionId') out.submissionId = argv[++i];
    else if (a === '--sourceRef') out.sourceRef = argv[++i];
  }
  return out;
}

async function main() {
  const { submissionId, sourceRef } = parseArgs(process.argv);
  if (!submissionId || !sourceRef) {
    console.error('❌ --submissionId et --sourceRef requis');
    process.exit(1);
  }
  const prisma = new PrismaClient();
  try {
    const sub = await prisma.treeBranchLeafSubmission.findUnique({ where: { id: submissionId }, select: { treeId: true, Lead: { select: { organizationId: true } } } });
    if (!sub) {
      console.error('❌ Submission introuvable');
      process.exit(1);
    }
    const { CapacityCalculator } = require('../src/components/TreeBranchLeaf/treebranchleaf-new/TBL-prisma/conditions/capacity-calculator.cjs');
    console.error('⚠️ capacity-calculator.cjs non disponible; compilez TS vers CJS ou utilisez l\'API HTTP');
  } catch (e) {
    console.error('❌ ERREUR audit sample:', e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(() => process.exit(1));
