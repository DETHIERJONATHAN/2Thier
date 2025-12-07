import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('\n🔍 [SEARCH] Cherchant tous les repeaters...\n');
    
    const repeaters = await prisma.treeBranchLeafNode.findMany({
      where: { type: 'leaf_repeater' },
      select: { 
        id: true, 
        label: true,
        metadata: true
      }
    });

    console.log(`Found ${repeaters.length} repeaters:\n`);
    
    for (const repeater of repeaters) {
      console.log(`📌 ${repeater.label} (${repeater.id})`);
      
      if (repeater.metadata) {
        const meta = typeof repeater.metadata === 'string'
          ? JSON.parse(repeater.metadata)
          : repeater.metadata;
        
        if (meta.repeater?.templateNodeIds || meta.repeaterConfig?.templateNodeIds) {
          const config = meta.repeater || meta.repeaterConfig;
          console.log(`   ✅ Has ${config.templateNodeIds.length} template nodes`);
        } else {
          console.log(`   ❌ No template nodes configured`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
