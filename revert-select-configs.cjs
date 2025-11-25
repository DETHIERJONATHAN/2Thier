const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function revertSelectConfigs() {
  console.log('🔄 ANNULATION DES MODIFICATIONS\n');
  console.log('='.repeat(100));

  // 1. Remettre Inclinaison original à keyRow: "Orientation" (comme avant)
  console.log('\n📊 1. Inclinaison ORIGINAL - Retour à keyRow: "Orientation"');
  await prisma.treeBranchLeafSelectConfig.update({
    where: { nodeId: '682ef657-4af8-45ac-8cd5-153a56a8bb74' },
    data: {
      keyRow: 'Orientation',
      keyColumn: null,
      updatedAt: new Date()
    }
  });
  console.log('✅ Restauré');

  // 2. Remettre Inclinaison-1 à keyColumn: "Orientation"
  console.log('\n📊 2. Inclinaison-1 - Retour à keyColumn: "Orientation"');
  await prisma.treeBranchLeafSelectConfig.update({
    where: { nodeId: '682ef657-4af8-45ac-8cd5-153a56a8bb74-1' },
    data: {
      keyRow: null,
      keyColumn: 'Orientation',
      updatedAt: new Date()
    }
  });
  console.log('✅ Restauré');

  console.log('\n\n✅ RESTAURATION TERMINÉE !');
  console.log('Les configurations sont revenues à leur état d\'origine.');
  console.log('Rechargez la page pour voir les données revenir.');

  await prisma.$disconnect();
}

revertSelectConfigs().catch(console.error);
