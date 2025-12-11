import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const [variableId, sourceRefArg] = process.argv.slice(2);

const uuidRegex = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/gi;
const nodeRegex = /(node_[a-z0-9_-]+)/gi;
const sharedRefRegex = /(shared-ref-[a-z0-9-]+)/gi;

function extractNodeIdsFromCondition(conditionSet) {
  const ids = new Set();
  if (!conditionSet || typeof conditionSet !== 'object') return ids;
  const str = JSON.stringify(conditionSet);
  let m;
  while ((m = /@value\.([a-f0-9-]{36})/gi.exec(str)) !== null) ids.add(m[1]);
  while ((m = /@value\.(shared-ref-[a-z0-9-]+)/gi.exec(str)) !== null) ids.add(m[1]);
  return ids;
}

function extractNodeIdsFromFormula(tokens) {
  const ids = new Set();
  if (!tokens) return ids;
  const arr = Array.isArray(tokens)
    ? tokens
    : typeof tokens === 'string'
      ? JSON.parse(tokens)
      : [];
  for (const t of arr) {
    if (t && typeof t === 'object') {
      if (t.fieldId) ids.add(t.fieldId);
      if (t.nodeId) ids.add(t.nodeId);
      if (t.ref && typeof t.ref === 'string') {
        const m = /@value\.([a-f0-9-]{36})/.exec(t.ref);
        if (m) ids.add(m[1]);
      }
    }
  }
  return ids;
}

function extractNodeIdsFromTable(tableLike) {
  const ids = new Set();
  if (!tableLike || typeof tableLike !== 'object') return ids;
  const str = JSON.stringify(tableLike);
  let m;
  while ((m = uuidRegex.exec(str)) !== null) ids.add(m[1]);
  while ((m = nodeRegex.exec(str)) !== null) ids.add(m[1]);
  while ((m = sharedRefRegex.exec(str)) !== null) ids.add(m[1]);
  return ids;
}

async function linkVariable(variableId, sourceRef) {
  let nodeIds = new Set();

  if (sourceRef.startsWith('condition:') || sourceRef.startsWith('node-condition:')) {
    const conditionId = sourceRef.replace('condition:', '').replace('node-condition:', '');
    const condition = await prisma.treeBranchLeafNodeCondition.findUnique({
      where: { id: conditionId },
      select: { conditionSet: true },
    });
    if (condition) nodeIds = extractNodeIdsFromCondition(condition.conditionSet);
  } else if (sourceRef.startsWith('node-formula:') || sourceRef.startsWith('formula:')) {
    const formulaId = sourceRef.replace('node-formula:', '').replace('formula:', '');
    const formula = await prisma.treeBranchLeafNodeFormula.findUnique({
      where: { id: formulaId },
      select: { tokens: true },
    });
    if (formula) nodeIds = extractNodeIdsFromFormula(formula.tokens);
  } else if (
    sourceRef.startsWith('table:') ||
    sourceRef.startsWith('table.') ||
    sourceRef.startsWith('@table.') ||
    sourceRef.startsWith('@table:') ||
    sourceRef.startsWith('node-table:')
  ) {
    const tableId = sourceRef
      .replace(/^table:/, '')
      .replace(/^table\./, '')
      .replace(/^@table:/, '')
      .replace(/^@table\./, '')
      .replace(/^node-table:/, '');

    const table = await prisma.treeBranchLeafNodeTable.findUnique({
      where: { id: tableId },
      select: { meta: true, tableRows: true, tableColumns: true },
    });
    if (table) nodeIds = extractNodeIdsFromTable({
      meta: table.meta,
      rows: table.tableRows,
      columns: table.tableColumns,
    });
  } else {
    // direct field id
    const isUuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(sourceRef);
    const isNode = /^node_[a-z0-9_-]+$/i.test(sourceRef);
    const isShared = /^shared-ref-[a-z0-9-]+$/i.test(sourceRef);
    if (isUuid || isNode || isShared) nodeIds = new Set([sourceRef]);
  }

  console.log(`Found ${nodeIds.size} node(s):`, [...nodeIds]);
  for (const nodeId of nodeIds) {
    const current = await prisma.treeBranchLeafNode.findUnique({
      where: { id: nodeId },
      select: { linkedVariableIds: true },
    });
    if (!current) {
      console.warn(`  ⚠️ node ${nodeId} not found, skipping`);
      continue;
    }
    const next = Array.from(new Set([...(current.linkedVariableIds || []), variableId]));
    await prisma.treeBranchLeafNode.update({
      where: { id: nodeId },
      data: { linkedVariableIds: next },
    });
    console.log(`  ✅ ${nodeId} linkedVariableIds += ${variableId}`);
  }
}

async function main() {
  if (!variableId) {
    console.error('Usage: node scripts/link-variable-now.mjs <variableId> [sourceRefOverride]');
    process.exit(1);
  }
  const variable = await prisma.treeBranchLeafNodeVariable.findUnique({
    where: { id: variableId },
    select: { sourceRef: true },
  });
  if (!variable && !sourceRefArg) {
    console.error('Variable not found and no sourceRef override provided.');
    process.exit(1);
  }
  const sourceRef = sourceRefArg || variable?.sourceRef;
  if (!sourceRef) {
    console.error('No sourceRef available.');
    process.exit(1);
  }
  console.log(`Linking variable ${variableId} with sourceRef=${sourceRef}`);
  await linkVariable(variableId, sourceRef);
  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
