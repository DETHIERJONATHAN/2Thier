const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

(async () => {
  try {
    console.log('📋 EXEMPLES OPERATIONRESULT ACTUELS\n');
    
    const examples = await prisma.treeBranchLeafSubmissionData.findMany({
      where: {
        isVariable: true,
        operationResult: { not: null }
      },
      select: {
        variableKey: true,
        operationResult: true,
        value: true
      },
      take: 3
    });
    
    examples.forEach((ex, i) => {
      console.log(`${i + 1}. Variable: ${ex.variableKey}`);
      console.log(`   Valeur actuelle: ${ex.value}`);
      console.log(`   OperationResult: ${JSON.stringify(ex.operationResult)}\n`);
    });
    
  } catch(e) {
    console.log('Erreur:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();