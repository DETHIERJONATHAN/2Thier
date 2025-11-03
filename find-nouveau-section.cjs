const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Chercher "Nouveau Section"...\n');
  
  // Chercher tous les "Nouveau Section"
  const sections = await prisma.treeBranchLeafNode.findMany({
    where: { label: 'Nouveau Section' },
    take: 20
  });
  
  console.log(`✅ Trouvé ${sections.length} "Nouveau Section"\n`);
  
  for (const section of sections) {
    console.log(`📌 ${section.label}`);
    console.log(`   ID: ${section.id}`);
    console.log(`   parentId: ${section.parentId}`);
    console.log(`   type: ${section.type}`);
    console.log(`   treeId: ${section.treeId}`);
    
    // Chercher le parent
    const parent = await prisma.treeBranchLeafNode.findUnique({
      where: { id: section.parentId || '' }
    });
    
    if (parent) {
      console.log(`   parent -> ${parent.label} (${parent.type})`);
    }
    
    // Chercher les enfants
    const children = await prisma.treeBranchLeafNode.findMany({
      where: { parentId: section.id },
      take: 10
    });
    
    console.log(`   Enfants: ${children.length}`);
    children.forEach(c => {
      console.log(`     - ${c.label} [${c.type}]`);
      if (c.linkedVariableIds && c.linkedVariableIds.length > 0) {
        console.log(`       vars: ${JSON.stringify(c.linkedVariableIds)}`);
      }
    });
    
    console.log();
  }
  
  // Chercher Orientation
  console.log('\n🔍 Chercher "Orientation":\n');
  const orientation = await prisma.treeBranchLeafNode.findMany({
    where: { label: { contains: 'Orientation' } },
    take: 10
  });
  
  for (const node of orientation) {
    console.log(`📌 ${node.label}`);
    console.log(`   ID: ${node.id}`);
    console.log(`   type: ${node.type}`);
    console.log(`   parentId: ${node.parentId}`);
    if (node.linkedVariableIds) {
      console.log(`   linkedVariableIds: ${JSON.stringify(node.linkedVariableIds)}`);
    }
    console.log();
  }
  
  // Chercher les variables Orientation
  console.log('\n🔍 Chercher variables "Orientation":\n');
  const orientationVars = await prisma.treeBranchLeafNodeVariable.findMany({
    where: { displayName: { contains: 'Orientation' } },
    take: 10
  });
  
  for (const v of orientationVars) {
    console.log(`📌 ${v.displayName}`);
    console.log(`   ID: ${v.id}`);
    console.log(`   exposedKey: ${v.exposedKey}`);
    console.log(`   sourceRef: ${v.sourceRef}`);
    console.log();
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
