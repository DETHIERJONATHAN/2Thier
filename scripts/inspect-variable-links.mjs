import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const varId = process.argv[2];
if (!varId) {
  console.error('Usage: node scripts/inspect-variable-links.mjs <variableId>');
  process.exit(1);
}

function extractNodeIdsFromCondition(conditionSet) {
  const ids = new Set();
  if (!conditionSet || typeof conditionSet !== 'object') return ids;
  const str = JSON.stringify(conditionSet);
  let m;
  const uuidRegex = /@value\.([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/gi;
  while ((m = uuidRegex.exec(str)) !== null) ids.add(m[1]);
  const nodeRegex = /@value\.(node_[a-z0-9_-]+)/gi;
  while ((m = nodeRegex.exec(str)) !== null) ids.add(m[1]);
  const sharedRegex = /@value\.(shared-ref-[a-z0-9-]+)/gi;
  while ((m = sharedRegex.exec(str)) !== null) ids.add(m[1]);
  // actions nodeIds
  try {
    const obj = JSON.parse(str);
    const pull = (actions) => {
      if (!Array.isArray(actions)) return;
      for (const a of actions) {
        if (Array.isArray(a?.nodeIds)) {
          for (const nid of a.nodeIds) {
            if (typeof nid !== 'string') continue;
            const clean = nid
              .replace(/^condition:/, '')
              .replace(/^node-formula:/, '')
              .replace(/^node-condition:/, '')
              .replace(/^table:/, '');
            if (clean !== nid) continue;
            ids.add(nid);
          }
        }
      }
    };
    if (Array.isArray(obj?.branches)) for (const br of obj.branches) pull(br?.actions);
    if (Array.isArray(obj?.fallback?.actions)) pull(obj.fallback.actions);
  } catch (e) {}
  return ids;
}

async function main() {
  const variable = await prisma.treeBranchLeafNodeVariable.findUnique({
    where: { id: varId },
    select: { id: true, sourceRef: true, nodeId: true },
  });
  console.log('variable:', variable);
  if (!variable?.sourceRef) {
    await prisma.$disconnect();
    return;
  }
  if (variable.sourceRef.startsWith('condition:') || variable.sourceRef.startsWith('node-condition:')) {
    const condId = variable.sourceRef.replace('condition:', '').replace('node-condition:', '');
    const cond = await prisma.treeBranchLeafNodeCondition.findUnique({
      where: { id: condId },
      select: { conditionSet: true },
    });
    const ids = extractNodeIdsFromCondition(cond?.conditionSet);
    console.log('conditionId:', condId);
    console.log('refs in conditionSet:', [...ids]);
    if (ids.size) {
      const nodes = await prisma.treeBranchLeafNode.findMany({
        where: { id: { in: [...ids] } },
        select: { id: true, label: true, linkedVariableIds: true },
      });
      console.log('nodes status:');
      for (const n of nodes) {
        const has = (n.linkedVariableIds || []).includes(varId);
        console.log(' ', n.id, n.label || '', 'linkedVariableIds has var?', has);
      }
    }
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
