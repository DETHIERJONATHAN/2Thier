import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

console.log('\n🔍 DIAGNOSTIC: Nœuds affichage orphelins après suppression du répéteur\n');
console.log('='.repeat(80));

// Le repeater et section parent
const REPEATER_ID = 'd1d8810d-232b-46e0-a5dd-9ee889ad9fc0';
const DISPLAY_PARENT_ID = '4ebf1e15-a0fd-483f-b94e-ee05abfa82e8';

const section = await prisma.treeBranchLeafNode.findUnique({
  where: { id: DISPLAY_PARENT_ID },
  select: { 
    label: true,
    id: true,
    other_TreeBranchLeafNode: { // Children of this section
      select: {
        id: true,
        label: true,
        type: true,
        metadata: true,
        parentId: true
      }
    }
  }
});

console.log(`📍 Section parent: "${section?.label}" (${DISPLAY_PARENT_ID})\n`);

if (section?.other_TreeBranchLeafNode) {
  const children = section.other_TreeBranchLeafNode;
  
  console.log(`👶 ${children.length} enfants directs:\n`);
  
  for (const child of children) {
    const meta = typeof child.metadata === 'object' ? child.metadata : {};
    const isDisplay = child.type === 'leaf_display';
    const suffix = child.label?.match(/-(\d+)$/)?.[1] || 'BASE';
    const copiedFromId = meta?.copiedFromNodeId || 'N/A';
    
    console.log(`${isDisplay ? '📺' : '📄'} ${child.label} (${child.type})`);
    console.log(`   ID: ${child.id}`);
    console.log(`   Suffix: ${suffix}`);
    console.log(`   Metadata.copiedFromNodeId: ${copiedFromId}`);
    console.log('');
  }
}

console.log('='.repeat(80));

await prisma.$disconnect();
