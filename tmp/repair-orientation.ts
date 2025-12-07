import { PrismaClient } from '@prisma/client';
import { deepCopyNodeInternal } from '../src/components/TreeBranchLeaf/treebranchleaf-new/api/repeat/services/deep-copy-service.js';
import type { MinimalReq } from '../src/components/TreeBranchLeaf/treebranchleaf-new/api/repeat/services/shared-helpers.js';

const prisma = new PrismaClient();

const ORIENTATION_NODE_ID = '22de1a53-2185-4669-8f6a-0544a54bfcb3';
const ORIENTATION_COPY_ID = `${ORIENTATION_NODE_ID}-1`;
const ORIENTATION_DISPLAY_ID = `${ORIENTATION_NODE_ID}-1-display`;

async function deleteCorruptedCopy() {
  const existing = await prisma.treeBranchLeafNode.findUnique({
    where: { id: ORIENTATION_COPY_ID },
    select: { id: true, metadata: true }
  });

  if (!existing) {
    console.log('[info] Aucun noeud copy existant a nettoyer.');
    return;
  }

  console.log('[cleanup] Suppression du noeud existant pour recreer une copie propre...');

  console.log('[cleanup] Suppression du noeud owner et du display auto-cree...');
  await prisma.treeBranchLeafNodeTable.deleteMany({ where: { nodeId: { in: [ORIENTATION_COPY_ID, ORIENTATION_DISPLAY_ID] } } });
  await prisma.treeBranchLeafNodeFormula.deleteMany({ where: { nodeId: { in: [ORIENTATION_COPY_ID, ORIENTATION_DISPLAY_ID] } } });
  await prisma.treeBranchLeafNodeCondition.deleteMany({ where: { nodeId: { in: [ORIENTATION_COPY_ID, ORIENTATION_DISPLAY_ID] } } });
  await prisma.treeBranchLeafNodeVariable.deleteMany({ where: { nodeId: { in: [ORIENTATION_COPY_ID, ORIENTATION_DISPLAY_ID] } } });
  await prisma.treeBranchLeafNode.deleteMany({ where: { id: { in: [ORIENTATION_DISPLAY_ID, ORIENTATION_COPY_ID] } } });
  console.log('[cleanup] Noeuds supprimés.');
}

async function recreateOrientationCopy() {
  const req: MinimalReq = { user: { isSuperAdmin: true } };
  console.log('[copy] Recreation du noeud Orientation-1 via deepCopyNodeInternal...');
  const result = await deepCopyNodeInternal(prisma, req, ORIENTATION_NODE_ID, { forcedSuffix: 1 });
  console.log('[copy] Duplication terminee:', result);
}

async function main() {
  try {
    await deleteCorruptedCopy();
    await recreateOrientationCopy();
  } catch (error) {
    console.error('[error] Erreur durant la reparation:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
