const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function rollbackChanges() {
  console.log('🚨 ANNULATION URGENTE DES MODIFICATIONS');
  console.log('=====================================');
  
  const fieldId = '10bfb6d2-67ae-49a8-8d49-fc6dafa3f74e';
  
  console.log('🔧 RESTAURATION DE LA VARIABLE...');
  
  // Remettre la variable comme elle était avant
  const restored = await prisma.treeBranchLeafNodeVariable.update({
    where: { nodeId: fieldId },
    data: {
      sourceType: 'tree', // C'était 'tree' avant, pas 'condition'
      // On garde le sourceRef car il était déjà correct
    }
  });
  
  console.log('✅ Variable restaurée:');
  console.log(`   sourceType: ${restored.sourceType}`);
  console.log(`   sourceRef: ${restored.sourceRef}`);
  
  console.log('\n🎯 ÉTAT ACTUEL APRÈS RESTAURATION:');
  const variable = await prisma.treeBranchLeafNodeVariable.findUnique({
    where: { nodeId: fieldId }
  });
  
  console.log(`   ID: ${variable.id}`);
  console.log(`   sourceRef: ${variable.sourceRef}`);
  console.log(`   sourceType: ${variable.sourceType}`);
  
  console.log('\n✅ Le champ est restauré à son état d\'origine !');
}

rollbackChanges()
  .then(() => {
    console.log('\n🙏 Restauration terminée - Désolé pour cette erreur !');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur lors de la restauration:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });