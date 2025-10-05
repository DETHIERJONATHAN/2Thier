const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function findTooltips() {
  try {
    console.log('🔍 Recherche des champs avec tooltips...');
    
    // Chercher tous les champs qui ont des tooltips configurés
    const nodesWithTooltips = await prisma.treeBranchLeafNode.findMany({
      where: {
        OR: [
          { text_helpTooltipType: { not: null } },
          { text_helpTooltipText: { not: null } },
          { text_helpTooltipImage: { not: null } }
        ]
      },
      select: {
        id: true,
        label: true,
        text_helpTooltipType: true,
        text_helpTooltipText: true,
        text_helpTooltipImage: true,
        treeId: true,
        TreeBranchLeafTree: {
          select: {
            name: true
          }
        }
      }
    });
    
    console.log(`✅ Trouvé ${nodesWithTooltips.length} champ(s) avec tooltips:`);
    
    nodesWithTooltips.forEach((node, index) => {
      console.log(`\n${index + 1}. Champ: "${node.label}" (ID: ${node.id})`);
      console.log(`   Arbre: ${node.TreeBranchLeafTree?.name || 'Inconnu'}`);
      console.log(`   Type tooltip: ${node.text_helpTooltipType || 'null'}`);
      console.log(`   Texte tooltip: ${node.text_helpTooltipText || 'null'}`);
      console.log(`   Image tooltip: ${node.text_helpTooltipImage || 'null'}`);
    });
    
    if (nodesWithTooltips.length === 0) {
      console.log('❌ Aucun champ avec tooltip trouvé.');
      console.log('💡 Créons un tooltip pour un champ existant...');
      
      // Chercher un champ dans l'arbre TBL actuel
      const tblNodes = await prisma.treeBranchLeafNode.findMany({
        where: {
          treeId: 'cmf1mwoz10005gooked1j6orn' // ID de l'arbre TBL visible dans les logs
        },
        select: {
          id: true,
          label: true,
          type: true
        },
        take: 5
      });
      
      console.log('\n🎯 Champs disponibles dans l\'arbre TBL:');
      tblNodes.forEach((node, index) => {
        console.log(`${index + 1}. "${node.label}" (${node.id}) - Type: ${node.type}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findTooltips();