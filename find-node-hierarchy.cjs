const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function findNodeHierarchy() {
  console.log('🌳 RECHERCHE DE LA HIÉRARCHIE DES NŒUDS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // 1. RECHERCHER TOUS LES NŒUDS QUI MENTIONNENT CES CHAMPS
    console.log('\n🔍 === RECHERCHE PAR CONTENU ===');
    
    const searchTerms = ['toiture', 'longueur', 'rampant', 'orientation', 'inclinaison'];
    
    for (const term of searchTerms) {
      const nodes = await prisma.treeBranchLeafNode.findMany({
        where: { 
          label: { contains: term, mode: 'insensitive' }
        },
        orderBy: { label: 'asc' }
      });
      
      if (nodes.length > 0) {
        console.log(`\n📋 Nœuds contenant "${term}" (${nodes.length}):`);
        nodes.forEach(node => {
          const hasParent = node.parentNodeId ? '👶' : '🌳';
          console.log(`   ${hasParent} "${node.label}" (${node.id})`);
          if (node.parentNodeId) {
            console.log(`      Parent: ${node.parentNodeId}`);
          }
        });
      }
    }

    // 2. RECHERCHER LES CONTENEURS/SECTIONS QUI POURRAIENT ÊTRE LES PARENTS
    console.log('\n📦 === RECHERCHE DES CONTENEURS ===');
    
    const containerTerms = ['section', 'groupe', 'container', 'champ', 'données', 'affichage'];
    
    for (const term of containerTerms) {
      const containers = await prisma.treeBranchLeafNode.findMany({
        where: { 
          label: { contains: term, mode: 'insensitive' }
        }
      });
      
      if (containers.length > 0) {
        console.log(`\n📦 Conteneurs "${term}" (${containers.length}):`);
        for (const container of containers) {
        const children = await prisma.treeBranchLeafNode.findMany({
          where: { parentId: container.id },
          select: { id: true, label: true }
        });          console.log(`   📦 "${container.label}" (${container.id})`);
          console.log(`      Enfants: ${children.length}`);
          
          children.forEach(child => {
            console.log(`        - "${child.label}" (${child.id})`);
          });
        }
      }
    }

    // 3. RECHERCHER COMMENT ORIENTATION-INCLINAISON-1 A ÉTÉ CRÉÉ
    console.log('\n🎯 === ANALYSE DU NŒUD DUPLIQUÉ EXISTANT ===');
    
    const duplicatedNode = await prisma.treeBranchLeafNode.findFirst({
      where: { 
        label: 'Orientation-Inclinaison-1'
      }
    });
    
    if (duplicatedNode) {
      console.log(`\n✅ "${duplicatedNode.label}" (${duplicatedNode.id})`);
      console.log(`   - parentId: ${duplicatedNode.parentId}`);
      console.log(`   - metadata: ${JSON.stringify(duplicatedNode.metadata)}`);
      
      if (duplicatedNode.parentId) {
        const parent = await prisma.treeBranchLeafNode.findUnique({
          where: { id: duplicatedNode.parentId }
        });
        console.log(`   - Parent: "${parent ? parent.label : 'NON TROUVÉ'}"`);
        
        // Vérifier si l'original est aussi sous ce parent
        const originalInSameParent = await prisma.treeBranchLeafNode.findFirst({
          where: { 
            parentId: duplicatedNode.parentId,
            label: 'Orientation-Inclinaison',
            NOT: { label: { contains: '-' } }
          }
        });
        
        if (originalInSameParent) {
          console.log(`   ✅ Original trouvé sous le même parent: "${originalInSameParent.label}"`);
        } else {
          console.log(`   ❌ Original PAS trouvé sous le même parent`);
        }
      }
    }

    // 4. VÉRIFIER LA STRUCTURE COMPLETE
    console.log('\n🌳 === STRUCTURE ARBORESCENTE ===');
    
    const rootNodes = await prisma.treeBranchLeafNode.findMany({
      where: { parentId: null },
      select: { id: true, label: true, organizationId: true }
    });
    
    console.log(`\n🌳 Nœuds racines: ${rootNodes.length}`);
    
    for (const root of rootNodes.slice(0, 3)) { // Limiter à 3 pour éviter trop de sortie
      console.log(`\n🌳 "${root.label}" (${root.id})`);
      
      const level1 = await prisma.treeBranchLeafNode.findMany({
        where: { parentId: root.id },
        select: { id: true, label: true }
      });
      
      console.log(`   📁 Niveau 1: ${level1.length} enfants`);
      
      for (const child1 of level1.slice(0, 3)) {
        console.log(`     📄 "${child1.label}"`);
        
        const level2 = await prisma.treeBranchLeafNode.findMany({
          where: { parentId: child1.id },
          select: { id: true, label: true }
        });
        
        if (level2.length > 0) {
          console.log(`        📁 ${level2.length} sous-enfants`);
          level2.slice(0, 2).forEach(child2 => {
            console.log(`          📄 "${child2.label}"`);
          });
        }
      }
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findNodeHierarchy();