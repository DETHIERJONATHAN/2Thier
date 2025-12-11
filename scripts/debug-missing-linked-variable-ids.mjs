// Diagnostic script: checks if nodes referenced by table capacities have the variable id in linkedVariableIds.
// Usage: node scripts/debug-missing-linked-variable-ids.mjs <nodeId1> <nodeId2> ...
// It scans variables whose sourceRef points to a table, extracts referenced nodeIds from the tableData,
// and reports when a referenced node is missing the variable id in linkedVariableIds.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TARGET_NODE_IDS = process.argv.slice(2).filter(Boolean);

function extractNodeIdsFromTable(tableData) {
  const ids = new Set();
  if (!tableData || typeof tableData !== 'object') return ids;
  const str = JSON.stringify(tableData);
  const uuidRegex = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/gi;
  let match;
  while ((match = uuidRegex.exec(str)) !== null) ids.add(match[1]);
  const nodeRegex = /(node_[a-z0-9_-]+)/gi;
  while ((match = nodeRegex.exec(str)) !== null) ids.add(match[1]);
  const sharedRefRegex = /(shared-ref-[a-z0-9-]+)/gi;
  while ((match = sharedRefRegex.exec(str)) !== null) ids.add(match[1]);
  return ids;
}

function normalizeTableId(sourceRef) {
  if (!sourceRef) return null;
  if (sourceRef.startsWith('table:')) return sourceRef.replace('table:', '');
  if (sourceRef.startsWith('table.')) return sourceRef.replace('table.', '');
  if (sourceRef.startsWith('@table.')) return sourceRef.replace('@table.', '');
  if (sourceRef.startsWith('@table:')) return sourceRef.replace('@table:', '');
  if (sourceRef.startsWith('node-table:')) return sourceRef.replace('node-table:', '');
  return null;
}

async function main() {
  if (TARGET_NODE_IDS.length === 0) {
    console.error('Pass at least one nodeId to inspect.');
    process.exit(1);
  }

  console.log('Targets:', TARGET_NODE_IDS.join(', '));

  const [nodes, vars] = await Promise.all([
    prisma.treeBranchLeafNode.findMany({
      where: { id: { in: TARGET_NODE_IDS } },
      select: { id: true, label: true, linkedVariableIds: true },
    }),
    prisma.treeBranchLeafNodeVariable.findMany({
      where: {
        OR: [
          { sourceRef: { startsWith: 'table:' } },
          { sourceRef: { startsWith: 'table.' } },
          { sourceRef: { startsWith: '@table.' } },
          { sourceRef: { startsWith: '@table:' } },
          { sourceRef: { startsWith: 'node-table:' } },
        ],
      },
      select: { id: true, nodeId: true, sourceRef: true },
    }),
  ]);

  console.log(`Loaded ${nodes.length} target node(s) and ${vars.length} table-backed variable(s).`);

  // Preload tables
  const tableIds = Array.from(
    new Set(vars.map((v) => normalizeTableId(v.sourceRef)).filter(Boolean))
  );
  const tables = await prisma.treeBranchLeafNodeTable.findMany({
    where: { id: { in: tableIds } },
    select: { id: true, meta: true },
  });
  const tableMap = new Map(tables.map((t) => [t.id, t]));

  // Build referenced nodes per variable
  const diagnostics = [];
  for (const v of vars) {
    const tableId = normalizeTableId(v.sourceRef);
    const table = tableId ? tableMap.get(tableId) : null;
    if (!table) continue;
    const refNodes = extractNodeIdsFromTable(table.meta);
    diagnostics.push({ variableId: v.id, sourceRef: v.sourceRef, tableId, refNodes });
  }

  for (const node of nodes) {
    const missing = [];
    for (const diag of diagnostics) {
      if (diag.refNodes.has(node.id)) {
        const hasLink = (node.linkedVariableIds || []).includes(diag.variableId);
        if (!hasLink) missing.push(diag);
      }
    }
    console.log('\nNode', node.id, node.label || '');
    console.log('  linkedVariableIds:', node.linkedVariableIds || []);
    if (missing.length === 0) {
      console.log('  ✅ All table-backed variable links present.');
    } else {
      console.log(`  ❌ Missing ${missing.length} link(s):`);
      for (const m of missing) {
        console.log(
          `    variable=${m.variableId} sourceRef=${m.sourceRef} table=${m.tableId}`
        );
      }
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
