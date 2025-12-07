// Chercher tous les repeaters
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

(async () => {
  const repeaters = await prisma.treeBranchLeafNode.findMany({
    where: { type: 'leaf_repeater' },
    select: { id: true, label: true, type: true }
  });
  
  console.log('🔍 TOUS LES REPEATERS TROUVÉS:\n');
  repeaters.forEach(r => {
    console.log(`  • ${r.label} (${r.id})`);
  });
  
  // Aussi chercher par label
  console.log('\n🔍 CHERCHER "toit" PAR LABEL ANYWHERE:\n');
  const toits = await prisma.treeBranchLeafNode.findMany({
    where: { label: { contains: 'toit', mode: 'insensitive' } },
    select: { id: true, label: true, type: true, parentId: true }
  });
  
  toits.forEach(t => {
    console.log(`  • ${t.label} (${t.type}) parent=${t.parentId}`);
  });
  
  await prisma.$disconnect();
})();
