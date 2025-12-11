import { PrismaClient } from '@prisma/client';

/**
 * Scan TreeBranchLeafNode for data_activeId and verify linkedVariableIds contains it (and suffixed variants).
 * Prints nodes where data_activeId is missing from linkedVariableIds, or where linkedVariableIds has unsuffixed IDs
 * but node label ends with a numeric suffix.
 *
 * Usage (PowerShell):
 *   npx ts-node ./scripts/diagnostics/check-linked-variables.ts
 */

const prisma = new PrismaClient();

const numSuffix = /-\d+$/;

async function main() {
  const nodes = await prisma.treeBranchLeafNode.findMany({
    select: {
      id: true,
      label: true,
      linkedVariableIds: true,
      data_activeId: true,
      metadata: true,
    },
  });

  const missing: any[] = [];
  const unsuffixed: any[] = [];

  for (const n of nodes) {
    const linked = Array.isArray(n.linkedVariableIds) ? n.linkedVariableIds : [];
    const active = n.data_activeId as string | null;

    if (active && !linked.includes(active)) {
      missing.push({ id: n.id, label: n.label, data_activeId: active, linkedVariableIds: linked });
    }

    // Heuristic: if node label is suffixed, but linkedVariableIds entries are not suffixed
    if (n.label && numSuffix.test(n.label)) {
      const unsfx = linked.filter((id) => id && !numSuffix.test(id));
      if (unsfx.length > 0) {
        unsuffixed.push({ id: n.id, label: n.label, unsuffixed: unsfx, linkedVariableIds: linked });
      }
    }
  }

  console.log(`Total nodes: ${nodes.length}`);
  console.log(`Nodes missing data_activeId in linkedVariableIds: ${missing.length}`);
  for (const m of missing) {
    console.log(`- ${m.id} [${m.label}] data_activeId=${m.data_activeId} linkedVariableIds=${m.linkedVariableIds.join(',')}`);
  }

  console.log(`\nNodes with unsuffixed linkedVariableIds (label has numeric suffix): ${unsuffixed.length}`);
  for (const u of unsuffixed) {
    console.log(`- ${u.id} [${u.label}] unsuffixed=${u.unsuffixed.join(',')} all=${u.linkedVariableIds.join(',')}`);
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
