// Diagnostic script: given a capacity id (condition or formula), finds variables using it
// and checks whether referenced nodes have the variable id in linkedVariableIds.
// Usage: node scripts/debug-capacity-variable-links.mjs <capacityId>

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const [capacityId] = process.argv.slice(2);

if (!capacityId) {
  console.error('Usage: node scripts/debug-capacity-variable-links.mjs <capacityId>');
  process.exit(1);
}

function extractNodeIdsFromCondition(conditionSet) {
  const ids = new Set();
  if (!conditionSet || typeof conditionSet !== 'object') return ids;
  const str = JSON.stringify(conditionSet);

  const uuidRegex = /@value\.([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/gi;
  let match;
  while ((match = uuidRegex.exec(str)) !== null) ids.add(match[1]);

  const nodeRegex = /@value\.(node_[a-z0-9_-]+)/gi;
  while ((match = nodeRegex.exec(str)) !== null) ids.add(match[1]);

  const sharedRefRegex = /@value\.(shared-ref-[a-z0-9-]+)/gi;
  while ((match = sharedRefRegex.exec(str)) !== null) ids.add(match[1]);

  // actions[].nodeIds
  try {
    const obj = JSON.parse(str);
    const extractFromActions = (actions) => {
      if (!Array.isArray(actions)) return;
      for (const action of actions) {
        if (Array.isArray(action?.nodeIds)) {
          for (const nid of action.nodeIds) {
            if (typeof nid !== 'string') continue;
            const clean = nid
              .replace(/^condition:/, '')
              .replace(/^node-formula:/, '')
              .replace(/^node-condition:/, '')
              .replace(/^table:/, '');
            if (clean !== nid) continue; // skip capacity refs
            ids.add(nid);
          }
        }
      }
    };
    if (Array.isArray(obj?.branches)) {
      for (const br of obj.branches) extractFromActions(br?.actions);
    }
    if (Array.isArray(obj?.fallback?.actions)) extractFromActions(obj.fallback.actions);
  } catch (e) {
    // ignore parse errors
  }

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
  return ids;
}

async function main() {
  const variables = await prisma.treeBranchLeafNodeVariable.findMany({
    where: {
      OR: [
        { sourceRef: `condition:${capacityId}` },
        { sourceRef: `node-condition:${capacityId}` },
        { sourceRef: `formula:${capacityId}` },
        { sourceRef: `node-formula:${capacityId}` },
      ],
    },
    select: { id: true, sourceRef: true },
  });

  if (variables.length === 0) {
    console.log('No variables found referencing this capacity.');
    return;
  }

  console.log(`Found ${variables.length} variable(s) using capacity ${capacityId}`);

  for (const v of variables) {
    let nodeIds = new Set();
    if (v.sourceRef.startsWith('condition:') || v.sourceRef.startsWith('node-condition:')) {
      const condition = await prisma.treeBranchLeafNodeCondition.findUnique({
        where: { id: capacityId },
        select: { conditionSet: true },
      });
      if (condition) nodeIds = extractNodeIdsFromCondition(condition.conditionSet);
    } else if (v.sourceRef.startsWith('formula:') || v.sourceRef.startsWith('node-formula:')) {
      const formula = await prisma.treeBranchLeafNodeFormula.findUnique({
        where: { id: capacityId },
        select: { tokens: true },
      });
      if (formula) nodeIds = extractNodeIdsFromFormula(formula.tokens);
    }

    console.log(`\nVariable ${v.id} sourceRef=${v.sourceRef}`);
    console.log(`  Referenced nodes: ${Array.from(nodeIds).join(', ') || '(none)'}`);

    if (nodeIds.size === 0) continue;

    const nodes = await prisma.treeBranchLeafNode.findMany({
      where: { id: { in: Array.from(nodeIds) } },
      select: { id: true, label: true, linkedVariableIds: true },
    });

    for (const n of nodes) {
      const has = (n.linkedVariableIds || []).includes(v.id);
      console.log(`  Node ${n.id} ${n.label || ''} linkedVariableIds contains var? ${has}`);
      if (!has) {
        console.log(`    ❌ missing link for variable ${v.id}`);
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
