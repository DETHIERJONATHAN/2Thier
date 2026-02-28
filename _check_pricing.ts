import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const templates = await prisma.documentTemplate.findMany({
    select: { id: true, name: true, DocumentSection: { select: { config: true } } }
  });

  for (const tpl of templates) {
    for (const sec of tpl.DocumentSection) {
      const config = (sec.config || {}) as any;
      const modules = config.modules || [];
      for (const mod of modules) {
        if (mod.type === 'PRICING_TABLE') {
          console.log('\nTemplate:', tpl.name, '(', tpl.id, ')');
          console.log('PRICING_TABLE config:', JSON.stringify(mod.config, null, 2));
        }
      }
    }
  }

  // Also check the latest generated document with submissionId
  const doc = await prisma.generatedDocument.findFirst({
    orderBy: { createdAt: 'desc' },
    where: { submissionId: { not: null } },
    select: { id: true, submissionId: true }
  });

  if (doc?.submissionId) {
    console.log('\n=== LATEST DOC ===');
    console.log('docId:', doc.id, 'submissionId:', doc.submissionId);

    // Check what SubmissionData exists with sourceRef containing "formula"
    const formulaData = await prisma.treeBranchLeafSubmissionData.findMany({
      where: {
        submissionId: doc.submissionId,
        sourceRef: { contains: 'formula' }
      },
      select: { nodeId: true, sourceRef: true, value: true, operationSource: true }
    });
    console.log('\n=== SubmissionData with formula refs ===');
    for (const d of formulaData) {
      console.log(`  nodeId: ${d.nodeId} | sourceRef: ${d.sourceRef} | value: ${d.value} | opSource: ${d.operationSource}`);
    }

    // Check ALL submission data (count)
    const allCount = await prisma.treeBranchLeafSubmissionData.count({
      where: { submissionId: doc.submissionId }
    });
    console.log(`\nTotal SubmissionData records for this submission: ${allCount}`);

    // Check SubmissionData that has "Variable manquante" in value
    const missing = await prisma.treeBranchLeafSubmissionData.findMany({
      where: {
        submissionId: doc.submissionId,
        value: { contains: 'Variable manquante' }
      },
      select: { nodeId: true, sourceRef: true, value: true }
    });
    console.log('\n=== SubmissionData with "Variable manquante" ===');
    for (const d of missing) {
      console.log(`  nodeId: ${d.nodeId} | sourceRef: ${d.sourceRef} | value: ${d.value}`);
    }

    // Check data whose sourceRef starts with "node-formula:"
    const nfData = await prisma.treeBranchLeafSubmissionData.findMany({
      where: {
        submissionId: doc.submissionId,
        sourceRef: { startsWith: 'node-formula:' }
      },
      select: { nodeId: true, sourceRef: true, value: true }
    });
    console.log('\n=== SubmissionData where sourceRef starts with "node-formula:" ===');
    for (const d of nfData) {
      console.log(`  nodeId: ${d.nodeId} | sourceRef: ${d.sourceRef} | value: ${d.value}`);
    }
  }

  await prisma.$disconnect();
}
main();
