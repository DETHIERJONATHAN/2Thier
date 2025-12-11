// Find variables whose capacities (condition/formula/table) reference a given node/shared-ref
// Usage: node scripts/find-vars-by-node.mjs <nodeIdOrSharedRef>
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const target = process.argv[2];
if (!target) {
  console.error('Usage: node scripts/find-vars-by-node.mjs <nodeIdOrSharedRef>');
  process.exit(1);
}

function scanStr(str, needle) {
  if (!str) return false;
  return str.includes(needle);
}

function extractNodeIdsFromCondition(conditionSet) {
  const ids = new Set();
  if (!conditionSet || typeof conditionSet !== 'object') return ids;
  const str = JSON.stringify(conditionSet);
  let m;
  const uuidRegex = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/gi;
  while ((m = uuidRegex.exec(str)) !== null) ids.add(m[1]);
  const nodeRegex = /(node_[a-z0-9_-]+)/gi;
  while ((m = nodeRegex.exec(str)) !== null) ids.add(m[1]);
  const sharedRegex = /(shared-ref-[a-z0-9-]+)/gi;
  while ((m = sharedRegex.exec(str)) !== null) ids.add(m[1]);
  return ids;
}

function extractNodeIdsFromFormula(tokens) {
  const ids = new Set();
  if (!tokens) return ids;
  let arr;
  if (typeof tokens === 'string') {
    try { arr = JSON.parse(tokens); } catch { return ids; }
  } else if (Array.isArray(tokens)) {
    arr = tokens;
  } else {
    return ids;
  }
  for (const t of arr) {
    if (t && typeof t === 'object') {
      if (t.fieldId) ids.add(t.fieldId);
      if (t.nodeId) ids.add(t.nodeId);
      if (t.ref && typeof t.ref === 'string') {
        const m = t.ref.match(/@value\.([a-f0-9-]+)/);
        if (m) ids.add(m[1]);
      }
    }
  }
  const str = JSON.stringify(arr);
  let m;
  const uuidRegex = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/gi;
  while ((m = uuidRegex.exec(str)) !== null) ids.add(m[1]);
  const nodeRegex = /(node_[a-z0-9_-]+)/gi;
  while ((m = nodeRegex.exec(str)) !== null) ids.add(m[1]);
  const sharedRegex = /(shared-ref-[a-z0-9-]+)/gi;
  while ((m = sharedRegex.exec(str)) !== null) ids.add(m[1]);
  return ids;
}

function extractNodeIdsFromTable(meta, rows, columns) {
  const ids = new Set();
  const str = JSON.stringify({ meta, rows, columns });
  let m;
  const uuidRegex = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/gi;
  while ((m = uuidRegex.exec(str)) !== null) ids.add(m[1]);
  const nodeRegex = /(node_[a-z0-9_-]+)/gi;
  while ((m = nodeRegex.exec(str)) !== null) ids.add(m[1]);
  const sharedRegex = /(shared-ref-[a-z0-9-]+)/gi;
  while ((m = sharedRegex.exec(str)) !== null) ids.add(m[1]);
  return ids;
}

async function main() {
  const vars = await prisma.treeBranchLeafNodeVariable.findMany({
    select: { id: true, sourceRef: true }
  });

  const conditions = new Map();
  const formulas = new Map();
  const tables = new Map();

  // Preload capacities referenced by variables
  const condIds = Array.from(new Set(vars.filter(v=>v.sourceRef?.startsWith('condition:')||v.sourceRef?.startsWith('node-condition:')).map(v=>v.sourceRef.replace('condition:','').replace('node-condition:',''))));
  const formulaIds = Array.from(new Set(vars.filter(v=>v.sourceRef?.startsWith('formula:')||v.sourceRef?.startsWith('node-formula:')).map(v=>v.sourceRef.replace('formula:','').replace('node-formula:',''))));
  const tableIds = Array.from(new Set(vars.filter(v=>v.sourceRef?.startsWith('table:')||v.sourceRef?.startsWith('table.')||v.sourceRef?.startsWith('@table.')||v.sourceRef?.startsWith('@table:')||v.sourceRef?.startsWith('node-table:')).map(v=>v.sourceRef.replace(/^table:/,'').replace(/^table\./,'').replace(/^@table:/,'').replace(/^@table\./,'').replace(/^node-table:/,''))));

  if (condIds.length) {
    const rows = await prisma.treeBranchLeafNodeCondition.findMany({ where: { id: { in: condIds } }, select: { id: true, conditionSet: true } });
    rows.forEach(r => conditions.set(r.id, r.conditionSet));
  }
  if (formulaIds.length) {
    const rows = await prisma.treeBranchLeafNodeFormula.findMany({ where: { id: { in: formulaIds } }, select: { id: true, tokens: true } });
    rows.forEach(r => formulas.set(r.id, r.tokens));
  }
  if (tableIds.length) {
    const rows = await prisma.treeBranchLeafNodeTable.findMany({ where: { id: { in: tableIds } }, select: { id: true, meta: true, tableRows: true, tableColumns: true } });
    rows.forEach(r => tables.set(r.id, r));
  }

  const hits = [];

  for (const v of vars) {
    const sr = v.sourceRef || '';
    if (sr.startsWith('condition:') || sr.startsWith('node-condition:')) {
      const cid = sr.replace('condition:','').replace('node-condition:','');
      const cond = conditions.get(cid);
      const ids = extractNodeIdsFromCondition(cond);
      if (ids.has(target)) hits.push({ variableId: v.id, capacity: 'condition', capacityId: cid });
    } else if (sr.startsWith('formula:') || sr.startsWith('node-formula:')) {
      const fid = sr.replace('formula:','').replace('node-formula:','');
      const tok = formulas.get(fid);
      const ids = extractNodeIdsFromFormula(tok);
      if (ids.has(target)) hits.push({ variableId: v.id, capacity: 'formula', capacityId: fid });
    } else if (sr.startsWith('table:') || sr.startsWith('table.') || sr.startsWith('@table.') || sr.startsWith('@table:') || sr.startsWith('node-table:')) {
      const tid = sr.replace(/^table:/,'').replace(/^table\./,'').replace(/^@table:/,'').replace(/^@table\./,'').replace(/^node-table:/,'');
      const tbl = tables.get(tid);
      if (tbl) {
        const ids = extractNodeIdsFromTable(tbl.meta, tbl.tableRows, tbl.tableColumns);
        if (ids.has(target)) hits.push({ variableId: v.id, capacity: 'table', capacityId: tid });
      }
    }
  }

  console.log('Target:', target);
  if (!hits.length) {
    console.log('No variable found referencing this node in its capacity.');
  } else {
    console.log('Variables referencing this node via capacity:');
    hits.forEach(h => console.log(`  var=${h.variableId} capacity=${h.capacity}:${h.capacityId}`));
  }

  await prisma.$disconnect();
}

main().catch(e=>{console.error(e); process.exit(1);});
