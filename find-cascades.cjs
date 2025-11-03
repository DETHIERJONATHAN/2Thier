const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findCascades() {
  const cascades = await prisma.treeBranchLeafNode.findMany({
    where: {
      select_options: {
        not: null
      }
    },
    select: {
      id: true,
      label: true,
      type: true,
      fieldType: true,
      select_options: true,
      sharedReferenceIds: true,
      metadata: true
    },
    take: 10
  });

  console.log(`\n📋 ${cascades.length} champs avec select_options trouvés:\n`);

  for (const c of cascades) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📌 ${c.label} (${c.id})`);
    console.log(`   Type: ${c.type}`);
    
    if (c.metadata && c.metadata.originalFieldId) {
      console.log(`   🔄 COPIE`);
    }

    if (c.select_options && Array.isArray(c.select_options)) {
      console.log(`   📊 ${c.select_options.length} options`);
      
      c.select_options.forEach((opt, i) => {
        if (opt.metadata && opt.metadata.sharedReferenceIds) {
          console.log(`      Option ${i} "${opt.label}": 🔗 ${opt.metadata.sharedReferenceIds.length} sharedRefs`);
        }
      });
    }
  }

  await prisma.$disconnect();
}

findCascades();
