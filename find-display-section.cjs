const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function findDisplaySection() {
  console.log('🔍 RECHERCHE DE LA SECTION CHAMPS D\'AFFICHAGE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // 1. CHERCHER AVEC DIFFÉRENTS TERMES
    console.log('\n📋 === RECHERCHE PAR MOTS-CLÉS ===');
    
    const searchTerms = [
      'affichage',
      'affichages', 
      'display',
      'données',
      'champ',
      'champs'
    ];

    for (const term of searchTerms) {
      const nodes = await prisma.treeBranchLeafNode.findMany({
        where: { 
          label: { contains: term, mode: 'insensitive' }
        }
      });
      
      if (nodes.length > 0) {
        console.log(`\n🔍 Résultats pour "${term}":`);
        nodes.forEach(node => {
          console.log(`   - "${node.label}" (${node.id})`);
        });
      }
    }

    // 2. CHERCHER TOUS LES NŒUDS AVEC DES VARIABLES
    console.log('\n📊 === NŒUDS AVEC VARIABLES ===');
    
    const nodesWithVariables = await prisma.treeBranchLeafNode.findMany({
      include: {
        TreeBranchLeafNodeVariable: true
      }
    });

    const displayNodes = nodesWithVariables.filter(node => 
      node.TreeBranchLeafNodeVariable && node.TreeBranchLeafNodeVariable.length > 0
    );

    console.log(`\n📋 ${displayNodes.length} nœud(s) avec variables trouvé(s):`);
    
    for (const node of displayNodes) {
      console.log(`\n🔧 "${node.label}" (${node.id})`);
      console.log(`   - Variables: ${node.TreeBranchLeafNodeVariable.length}`);
      
      node.TreeBranchLeafNodeVariable.forEach(v => {
        console.log(`     * "${v.displayName}" - exposedKey: ${v.exposedKey}`);
      });
      
      // Vérifier si c'est la section qui contient "Orientation-Inclinaison-1"
      const hasOrientationVar = node.TreeBranchLeafNodeVariable.some(v => 
        v.displayName && v.displayName.includes('Orientation-Inclinaison-1')
      );
      
      if (hasOrientationVar) {
        console.log('   🎯 *** CETTE SECTION CONTIENT ORIENTATION-INCLINAISON-1 ! ***');
      }
    }

    // 3. RECHERCHE SPÉCIFIQUE POUR ORIENTATION-INCLINAISON-1
    console.log('\n🎯 === RECHERCHE ORIENTATION-INCLINAISON-1 ===');
    
    const orientationVar = await prisma.treeBranchLeafNodeVariable.findFirst({
      where: { 
        displayName: { contains: 'Orientation-Inclinaison-1', mode: 'insensitive' }
      },
      include: {
        TreeBranchLeafNode: true
      }
    });

    if (orientationVar) {
      console.log(`\n✅ Variable trouvée: "${orientationVar.displayName}"`);
      console.log(`   - ID: ${orientationVar.id}`);
      console.log(`   - exposedKey: ${orientationVar.exposedKey}`);
      console.log(`   - Nœud parent: "${orientationVar.TreeBranchLeafNode.label}"`);
      console.log(`   - Nœud parent ID: ${orientationVar.TreeBranchLeafNode.id}`);
    } else {
      console.log('❌ Variable Orientation-Inclinaison-1 non trouvée');
    }

  } catch (error) {
    console.error('❌ Erreur lors de la recherche:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findDisplaySection();