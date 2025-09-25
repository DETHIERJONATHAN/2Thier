const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  console.log('🎯 ANALYSE DE CE QUE FAIT LE CHAMP QUI FONCTIONNE');
  console.log('================================================');
  
  // Le champ qui fonctionne
  const workingField = await prisma.treeBranchLeafNode.findUnique({
    where: { id: '10bfb6d2-67ae-49a8-8d49-fc6dafa3f74e' },
    include: {
      TreeBranchLeafNodeVariable: true,
      TreeBranchLeafNodeFormula: true
    }
  });
  
  console.log('✅ LE CHAMP QUI FONCTIONNE UTILISE :');
  console.log('----------------------------------');
  console.log(`1. tbl_capacity = ${workingField.tbl_capacity}`);
  console.log(`2. variable.sourceRef = ${workingField.TreeBranchLeafNodeVariable?.sourceRef}`);
  console.log(`3. Il a une formule : ${workingField.TreeBranchLeafNodeFormula.length > 0}`);
  if (workingField.TreeBranchLeafNodeFormula.length > 0) {
    console.log(`   Formule ID: ${workingField.TreeBranchLeafNodeFormula[0].id}`);
  }
  console.log('');
  
  // Maintenant regardons les autres champs avec formules
  console.log('❌ LES AUTRES CHAMPS AVEC FORMULES :');
  console.log('-----------------------------------');
  
  const otherFields = await prisma.treeBranchLeafNode.findMany({
    where: {
      AND: [
        { id: { not: '10bfb6d2-67ae-49a8-8d49-fc6dafa3f74e' } },
        { TreeBranchLeafNodeFormula: { some: {} } }
      ]
    },
    include: {
      TreeBranchLeafNodeVariable: true,
      TreeBranchLeafNodeFormula: true
    },
    take: 5
  });
  
  for (const field of otherFields) {
    console.log(`🔍 ${field.label} (${field.id}):`);
    console.log(`   tbl_capacity = ${field.tbl_capacity}`);
    console.log(`   variable.sourceRef = ${field.TreeBranchLeafNodeVariable?.sourceRef || 'AUCUNE'}`);
    console.log(`   nombre formules = ${field.TreeBranchLeafNodeFormula.length}`);
    console.log('');
  }
  
  console.log('💡 SOLUTION SIMPLE :');
  console.log('===================');
  console.log('Il faut JUSTE copier ce que fait le champ qui fonctionne !');
  console.log('1. Mettre tbl_capacity = 2 pour tous les champs avec formules');
  console.log('2. Connecter leurs variables au même système avec sourceRef approprié');
  
  await prisma.$disconnect();
})();