import { PrismaClient, Prisma } from '@prisma/client';

/**
 * This script removes the accidental data capability that was attached to the
 * user input field "Orientation". Keeping that capability forces the UI to
 * render the backend lookup result instead of the select widget. By cleaning
 * the metadata and variables, the field goes back to behaving like a regular
 * select that still fetches its options from the lookup configuration.
 */
const prisma = new PrismaClient();

const BASE_ORIENTATION_NODE_ID = '22de1a53-2185-4669-8f6a-0544a54bfcb3';
const ORIENTATION_COPY_SUFFIXES = ['-1', '-2'];

const orientationNodeIds = [
  BASE_ORIENTATION_NODE_ID,
  ...ORIENTATION_COPY_SUFFIXES.map(suffix => `${BASE_ORIENTATION_NODE_ID}${suffix}`)
];

async function cleanOrientationNode(nodeId: string) {
  const node = await prisma.treeBranchLeafNode.findUnique({ where: { id: nodeId } });
  if (!node) {
    console.log(`[skip] Node ${nodeId} introuvable, rien à nettoyer.`);
    return;
  }

  const metadata = (node.metadata ?? {}) as Record<string, any>;
  if (metadata.capabilities?.datas) {
    delete metadata.capabilities.datas;
    if (Object.keys(metadata.capabilities).length === 0) {
      delete metadata.capabilities;
    }
  }

  await prisma.treeBranchLeafNodeVariable.deleteMany({ where: { nodeId } });

  await prisma.treeBranchLeafNode.update({
    where: { id: nodeId },
    data: {
      hasData: false,
      data_activeId: null,
      data_displayFormat: null,
      data_exposedKey: null,
      data_instances: Prisma.JsonNull,
      data_precision: null,
      data_unit: null,
      data_visibleToUser: false,
      metadata: metadata as Prisma.JsonValue
    }
  });

  console.log(`[clean] Node ${nodeId} nettoyé.`);
}

async function main() {
  try {
    for (const nodeId of orientationNodeIds) {
      await cleanOrientationNode(nodeId);
    }
  } catch (error) {
    console.error('[error] Échec du nettoyage:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
