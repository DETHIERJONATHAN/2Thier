const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Recherche de toutes les sections...\n');
    
    const sections = await prisma.treeBranchLeafNode.findMany({
      where: {
        type: 'leaf_section'
      },
      select: {
        id: true,
        label: true,
        type: true,
        fieldType: true
      }
    });

    console.log(`📋 Sections trouvées: ${sections.length}\n`);
    sections.forEach((s, idx) => {
      console.log(`${idx + 1}. "${s.label}" (${s.id})`);
      console.log(`   Type: ${s.type}, FieldType: ${s.fieldType}`);
    });

    // Chercher aussi les cascaders
    console.log('\n\n🔍 Recherche de tous les cascaders...\n');
    
    const cascaders = await prisma.treeBranchLeafNode.findMany({
      where: {
        fieldType: 'leaf_cascader'
      },
      select: {
        id: true,
        label: true,
        type: true,
        fieldType: true,
        parentId: true
      }
    });

    console.log(`📋 Cascaders trouvés: ${cascaders.length}\n`);
    cascaders.forEach((c, idx) => {
      console.log(`${idx + 1}. "${c.label}" (${c.id})`);
      console.log(`   ParentId: ${c.parentId}`);
    });

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
