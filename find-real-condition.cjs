const { PrismaClient } = require('@prisma/client');

async function findRealCondition() {
  const prisma = new PrismaClient();
  
  console.log('🔍 Recherche de la vraie condition...\n');
  
  // 1. Récupérer le nœud "Rampant toiture" avec ses métadonnées complètes
  const rampantToiture = await prisma.treeBranchLeafNode.findUnique({
    where: { id: '9c9f42b2-e0df-4726-8a81-997c0dee71bc' },
    select: {
      id: true,
      label: true,
      calculatedValue: true,
      metadata: true
    }
  });
  
  if (rampantToiture && rampantToiture.metadata) {
    console.log('📋 Métadonnées "Rampant toiture":');
    console.log(JSON.stringify(rampantToiture.metadata, null, 2));
    
    // Extraire la sourceRef de la condition
    const capabilities = rampantToiture.metadata.capabilities;
    if (capabilities && capabilities.datas && capabilities.datas[0]) {
      const sourceRef = capabilities.datas[0].config.sourceRef;
      console.log(`\n🎯 SourceRef trouvée: ${sourceRef}`);
      
      // Extraire l'ID de condition depuis sourceRef
      const conditionMatch = sourceRef.match(/condition:(.+)/);
      if (conditionMatch) {
        const conditionId = conditionMatch[1];
        console.log(`🔍 ID de condition: ${conditionId}`);
        
        // Chercher cette condition
        const condition = await prisma.treeBranchLeafNode.findUnique({
          where: { id: conditionId },
          select: {
            id: true,
            label: true,
            calculatedValue: true,
            metadata: true
          }
        });
        
        if (condition) {
          console.log('\n📋 Condition trouvée:');
          console.log(`  - ID: ${condition.id}`);
          console.log(`  - Label: ${condition.label}`);
          console.log(`  - Valeur: ${condition.calculatedValue}`);
          console.log(`  - Metadata:`, JSON.stringify(condition.metadata, null, 2));
        } else {
          console.log(`\n❌ Condition ${conditionId} non trouvée en base`);
        }
      }
    }
  }
  
  // 2. Chercher toutes les conditions dans l'arbre
  console.log('\n🔍 Toutes les conditions dans l\'arbre:');
  const allConditions = await prisma.treeBranchLeafNode.findMany({
    where: {
      treeId: 'cmf1mwoz10005gooked1j6orn',
      OR: [
        { type: 'condition' },
        { label: { contains: 'condition' } },
        { calculatedValue: { contains: 'condition' } }
      ]
    },
    select: {
      id: true,
      label: true,
      type: true,
      calculatedValue: true
    },
    take: 10
  });
  
  console.log(`📋 ${allConditions.length} conditions trouvées:`);
  allConditions.forEach(cond => {
    console.log(`  - ${cond.label} (${cond.type}) - ID: ${cond.id}`);
    console.log(`    Valeur: ${cond.calculatedValue || 'VIDE'}`);
  });
  
  await prisma.$disconnect();
}

findRealCondition().catch(console.error);