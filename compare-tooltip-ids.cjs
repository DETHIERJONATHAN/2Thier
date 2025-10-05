const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function compareTooltipIds() {
  try {
    console.log('🔍 [COMPARAISON] Recherche des nœuds avec tooltips...\n');
    
    // Récupérer tous les nœuds avec des tooltips depuis TreeBranchLeafNode
    const nodesWithTooltips = await prisma.treeBranchLeafNode.findMany({
      where: {
        AND: [
          {
            OR: [
              { text_helpTooltipType: { not: null } },
              { text_helpTooltipType: { not: 'none' } }
            ]
          },
          {
            OR: [
              { text_helpTooltipText: { not: null } },
              { text_helpTooltipImage: { not: null } }
            ]
          }
        ]
      },
      select: {
        id: true,
        label: true,
        text_name: true,
        text_helpTooltipType: true,
        text_helpTooltipText: true,
        text_helpTooltipImage: true
      }
    });

    console.log(`📊 [RÉSULTAT] ${nodesWithTooltips.length} nœuds avec tooltips trouvés\n`);

    nodesWithTooltips.forEach((node, index) => {
      console.log(`${index + 1}. NODE ID: ${node.id}`);
      console.log(`   Nom: ${node.label || node.text_name || 'Sans nom'}`);
      console.log(`   Type tooltip: ${node.text_helpTooltipType}`);
      console.log(`   Texte tooltip: ${node.text_helpTooltipText ? `${node.text_helpTooltipText.length} caractères` : 'Aucun'}`);
      console.log(`   Image tooltip: ${node.text_helpTooltipImage ? `${node.text_helpTooltipImage.length} caractères` : 'Aucune'}`);
      console.log('');
    });

    // Comparer avec ce qui est dans les logs client
    console.log('🔍 [COMPARAISON CLIENT] IDs vus dans les logs du navigateur:');
    console.log('   - "Consommation annuelle électricité" devrait correspondre à node_1757366229534_x6jxzmvmu');
    console.log('   - "Puissance compteur" devrait correspondre à node_1757366229590_6xhv22a3a');
    console.log('');

    // Rechercher ces nœuds spécifiques
    const specificNodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        id: {
          in: ['node_1757366229534_x6jxzmvmu', 'node_1757366229590_6xhv22a3a']
        }
      },
      select: {
        id: true,
        label: true,
        text_name: true,
        text_helpTooltipType: true,
        text_helpTooltipText: true,
        text_helpTooltipImage: true
      }
    });

    console.log('🎯 [NŒUDS SPÉCIFIQUES] Détails des nœuds avec tooltips:');
    specificNodes.forEach(node => {
      console.log(`ID: ${node.id}`);
      console.log(`Nom: ${node.label || node.text_name || 'Sans nom'}`);
      console.log(`Type: ${node.text_helpTooltipType}`);
      console.log(`Texte: ${node.text_helpTooltipText ? node.text_helpTooltipText.substring(0, 100) + '...' : 'Aucun'}`);
      console.log(`Image: ${node.text_helpTooltipImage ? `${node.text_helpTooltipImage.length} caractères` : 'Aucune'}`);
      console.log('---');
    });

  } catch (error) {
    console.error('❌ [ERREUR]', error);
  } finally {
    await prisma.$disconnect();
  }
}

compareTooltipIds();