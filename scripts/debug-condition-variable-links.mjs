import { PrismaClient } from '@prisma/client';

function extractNodeIdsFromCondition(conditionSet) {
  const ids = new Set();
  if (!conditionSet || typeof conditionSet !== 'object') return ids;
  const str = JSON.stringify(conditionSet);
  // Pattern @value.<uuid>
  const uuidRegex = /@value\.([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/gi;
  let match;
  while ((match = uuidRegex.exec(str)) !== null) ids.add(match[1]);
  // Pattern nodeIds in actions
  const obj = conditionSet;
  const extractFromActions = (actions) => {
    if (!Array.isArray(actions)) return;
    for (const action of actions) {
      if (Array.isArray(action.nodeIds)) {
        for (const nodeId of action.nodeIds) {
          if (typeof nodeId === 'string') {
            const cleanId = nodeId
              .replace(/^condition:/, '')
              .replace(/^node-formula:/, '')
              .replace(/^node-condition:/, '')
              .replace(/^table:/, '');
            if (cleanId && cleanId !== nodeId) continue;
            ids.add(nodeId);
          }
        }
      }
    }
  };
  if (Array.isArray(obj.branches)) {
    for (const branch of obj.branches) {
      if (Array.isArray(branch.actions)) extractFromActions(branch.actions);
    }
  }
  if (obj.fallback && Array.isArray(obj.fallback.actions)) {
    extractFromActions(obj.fallback.actions);
  }
  return ids;
}

const prisma = new PrismaClient();

const [conditionIdArg, variableIdArg] = process.argv.slice(2);

async function main() {
  if (!conditionIdArg) {
    console.error('Usage: node scripts/debug-condition-variable-links.mjs <conditionId> [variableId]');
    process.exit(1);
  }

  const condition = await prisma.treeBranchLeafNodeCondition.findUnique({
    where: { id: conditionIdArg },
    select: { conditionSet: true }
  });
  if (!condition) {
    console.error('Condition not found');
    process.exit(1);
  }
  const nodeIds = extractNodeIdsFromCondition(condition.conditionSet);
  console.log('Condition nodeIds:', [...nodeIds]);
  console.log('Condition raw:', JSON.stringify(condition.conditionSet, null, 2));

  if (variableIdArg) {
    const varNodeLinks = await prisma.treeBranchLeafNode.findMany({
      where: { id: { in: [...nodeIds] } },
      select: { id: true, linkedVariableIds: true }
    });
    for (const n of varNodeLinks) {
      const has = (n.linkedVariableIds || []).includes(variableIdArg);
      console.log(`Node ${n.id} has var? ${has} ->`, n.linkedVariableIds || []);
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
