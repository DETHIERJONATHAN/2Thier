import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function compareConditions() {
  const suffixedId = '065651f1-0f33-47cc-8270-fbffaccade0b-1';
  const baseId = '065651f1-0f33-47cc-8270-fbffaccade0b';
  
  const [suffixed, base] = await Promise.all([
    prisma.treeBranchLeafNodeCondition.findUnique({ 
      where: { id: suffixedId },
      select: { id: true, name: true, conditionSet: true, nodeId: true }
    }),
    prisma.treeBranchLeafNodeCondition.findUnique({ 
      where: { id: baseId },
      select: { id: true, name: true, conditionSet: true, nodeId: true }
    })
  ]);
  
  console.log('=== Condition SUFFIXÉE (-1) ===');
  console.log('ID:', suffixed?.id);
  console.log('Name:', suffixed?.name);
  console.log('NodeId:', suffixed?.nodeId);
  console.log('ConditionSet (first branch when):', JSON.stringify(suffixed?.conditionSet?.branches?.[0]?.when, null, 2)?.slice(0, 500));
  
  console.log('\n=== Condition BASE ===');
  console.log('ID:', base?.id);
  console.log('Name:', base?.name);
  console.log('NodeId:', base?.nodeId);
  console.log('ConditionSet (first branch when):', JSON.stringify(base?.conditionSet?.branches?.[0]?.when, null, 2)?.slice(0, 500));
  
  // Comparer les refs dans les branches
  const getRefsFromBranch = (branch) => {
    const refs = [];
    if (branch?.when?.left) refs.push({ type: 'left', ref: branch.when.left });
    if (branch?.when?.right) refs.push({ type: 'right', ref: branch.when.right });
    if (branch?.then) refs.push({ type: 'then', ref: branch.then });
    return refs;
  };
  
  console.log('\n=== REFS dans les branches (suffixée) ===');
  (suffixed?.conditionSet?.branches || []).forEach((b, i) => {
    console.log(`Branch ${i}:`, getRefsFromBranch(b));
  });
  
  console.log('\n=== REFS dans les branches (base) ===');
  (base?.conditionSet?.branches || []).forEach((b, i) => {
    console.log(`Branch ${i}:`, getRefsFromBranch(b));
  });
}

compareConditions()
  .then(() => prisma.$disconnect())
  .catch(e => { console.error(e); process.exit(1); });
