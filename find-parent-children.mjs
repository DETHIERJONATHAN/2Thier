import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findParentAndChildren() {
  console.log('\n🔍 VÉRIFIER LE PARENT ET SES ENFANTS\n');

  const parent = await prisma.treeBranchLeafNode.findUnique({
    where: { id: 'c40d8353-923f-49ac-a3db-91284de99654' },
    select: { 
      id: true, 
      label: true, 
      type: true,
      repeater_templateNodeIds: true
    }
  });

  console.log(`👨‍👧‍👦 Parent: "${parent?.label}" (${parent?.type})`);
  console.log(`   ID: ${parent?.id}`);
  console.log(`   repeater_templateNodeIds: ${parent?.repeater_templateNodeIds}\n`);

  const children = await prisma.treeBranchLeafNode.findMany({
    where: { parentId: 'c40d8353-923f-49ac-a3db-91284de99654' },
    select: { 
      id: true, 
      label: true, 
      type: true, 
      linkedVariableIds: true,
      metadata: true
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`👶 Enfants du parent (${children.length}):\n`);

  for (const child of children) {
    const hasVars = child.linkedVariableIds ? Array.isArray(child.linkedVariableIds) ? child.linkedVariableIds.length : '?' : 0;
    console.log(`   📌 "${child.label}" (${child.type})`);
    console.log(`      ID: ${child.id}`);
    console.log(`      linkedVariableIds: ${hasVars} vars`);
    if (child.linkedVariableIds && Array.isArray(child.linkedVariableIds)) {
      child.linkedVariableIds.forEach((v, i) => console.log(`         ${i+1}. ${v}`));
    }
    console.log('');
  }

  await prisma.$disconnect();
}

findParentAndChildren().catch(e => console.error(e));
