const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function compareTooltipIds() {
  try {
    console.log('🔍 [COMPARAISON] Recherche des nœuds avec tooltips...\n');
    
    // Rechercher les nœuds spécifiques trouvés dans les logs
    const specificNodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        id: {
          in: ['node_1757366229534_x6jxzmvmu', 'node_1757366229590_6xhv22a3a']
        }
      },
      select: {
        id: true,
        label: true,
        text_helpTooltipType: true,
        text_helpTooltipText: true,
        text_helpTooltipImage: true
      }
    });

    console.log('🎯 [NŒUDS SPÉCIFIQUES] Détails des nœuds avec tooltips trouvés dans les logs serveur:');
    specificNodes.forEach(node => {
      console.log(`┌── ID: ${node.id}`);
      console.log(`├── Label: ${node.label || 'Sans label'}`);
      console.log(`├── Type tooltip: ${node.text_helpTooltipType || 'Aucun'}`);
      console.log(`├── Texte tooltip: ${node.text_helpTooltipText ? `${node.text_helpTooltipText.length} caractères` : 'Aucun'}`);
      console.log(`└── Image tooltip: ${node.text_helpTooltipImage ? `${node.text_helpTooltipImage.length} caractères` : 'Aucune'}`);
      console.log('');
    });

    if (specificNodes.length === 0) {
      console.log('❌ [ERREUR] Aucun des nœuds spécifiques trouvé dans la base !');
      
      // Recherche alternative avec un filtre moins strict
      console.log('🔍 [RECHERCHE ALTERNATIVE] Cherchons tous les nœuds avec tooltip...');
      const allTooltipNodes = await prisma.treeBranchLeafNode.findMany({
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
          text_helpTooltipImage: true
        },
        take: 10
      });

      console.log(`📊 [RÉSULTAT ALTERNATIF] ${allTooltipNodes.length} nœuds trouvés (max 10 affichés):`);
      allTooltipNodes.forEach((node, index) => {
        console.log(`${index + 1}. ID: ${node.id}`);
        console.log(`   Label: ${node.label || 'Sans label'}`);
        console.log(`   Type: ${node.text_helpTooltipType || 'Aucun'}`);
        console.log(`   Texte: ${node.text_helpTooltipText ? `${node.text_helpTooltipText.length} car.` : 'Aucun'}`);
        console.log(`   Image: ${node.text_helpTooltipImage ? `${node.text_helpTooltipImage.length} car.` : 'Aucune'}`);
        console.log('---');
      });
    }

  } catch (error) {
    console.error('❌ [ERREUR]', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

compareTooltipIds();