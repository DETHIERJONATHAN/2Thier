const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findOriginalVariable() {
  try {
    console.log('\n🔍 Recherche de la variable originale: 89160843-6d16-48d6-864c-bed84798011d\n');
    
    const originalVarId = '89160843-6d16-48d6-864c-bed84798011d';
    
    const var1 = await prisma.treeBranchLeafNodeVariable.findUnique({
      where: { id: originalVarId }
    }).catch(() => null);
    
    if (var1) {
      console.log('✅ VARIABLE TROUVÉE!');
      console.log(JSON.stringify(var1, null, 2));
    } else {
      console.log('❌ Variable NOT found in DB');
    }
    
    // Chercher TOUS les variables
    console.log('\n\n📊 TOUTES les variables en DB:\n');
    const allVars = await prisma.treeBranchLeafNodeVariable.findMany({
      select: {
        id: true,
        nodeId: true,
        exposedKey: true,
        displayName: true,
        defaultValue: true
      },
      take: 20
    });
    
    console.log(`Total: ${allVars.length}`);
    allVars.forEach(v => {
      console.log(`  • ${v.id} (Node: ${v.nodeId}, Key: ${v.exposedKey}, Name: ${v.displayName})`);
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

findOriginalVariable();
