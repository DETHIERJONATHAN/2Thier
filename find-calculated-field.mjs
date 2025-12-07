import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findCalculatedField() {
  console.log('🔍 RECHERCHE CHAMPS AVEC CALCULS');
  console.log('================================\n');
  
  try {
    // Chercher tous les nœuds du repeater qui ont des calculs
    const repeaterNodeId = '1f4db31a-4474-462f-af6c-f798b7e3534a';
    
    // Récupérer tous les enfants du repeater
    const allChildren = await prisma.treeBranchLeafNode.findMany({
      where: {
        OR: [
          { parentId: repeaterNodeId },
          { parentId: repeaterNodeId + '-1' }
        ]
      },
      select: {
        id: true,
        label: true,
        parentId: true,
        TreeBranchLeafNodeFormula: { select: { id: true } },
        TreeBranchLeafNodeCondition: { select: { id: true } },
        TreeBranchLeafNodeTable: { select: { id: true } },
        TreeBranchLeafSelectConfig: { select: { id: true } }
      }
    });
    
    console.log(`Trouvé ${allChildren.length} nœuds enfants du repeater\n`);
    
    allChildren.forEach(node => {
      const hasFormulas = node.TreeBranchLeafNodeFormula && node.TreeBranchLeafNodeFormula.length > 0;
      const hasConditions = node.TreeBranchLeafNodeCondition && node.TreeBranchLeafNodeCondition.length > 0;
      const hasTables = node.TreeBranchLeafNodeTable && node.TreeBranchLeafNodeTable.length > 0;
      const hasSelects = node.TreeBranchLeafSelectConfig && node.TreeBranchLeafSelectConfig.length > 0;
      const hasAny = hasFormulas || hasConditions || hasTables || hasSelects;
      
      if (hasAny) {
        console.log(`✅ ${node.label} (${node.id})`);
        if (hasFormulas) console.log(`   • Formulas: ${node.TreeBranchLeafNodeFormula?.length}`);
        if (hasConditions) console.log(`   • Conditions: ${node.TreeBranchLeafNodeCondition?.length}`);
        if (hasTables) console.log(`   • Tables: ${node.TreeBranchLeafNodeTable?.length}`);
        if (hasSelects) console.log(`   • SelectConfigs: ${node.TreeBranchLeafSelectConfig?.length}`);
      } else {
        console.log(`❌ ${node.label} (${node.id}) - AUCUN CALCUL`);
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

findCalculatedField().catch(console.error);