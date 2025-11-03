/**
 * Script pour analyser les références partagées dans TreeBranchLeafNode
 * Les sharedReferenceId/sharedReferenceIds pointent vers des IDs dans la même table
 */

const { PrismaClient } = require('@prisma/client');

async function analyzeSharedReferences() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 ANALYSE DES RÉFÉRENCES PARTAGÉES');
    console.log('===================================\n');

    // 1. Compter les nœuds avec des références partagées
    console.log('📊 STATISTIQUES RÉFÉRENCES PARTAGÉES');
    console.log('------------------------------------');
    
    const totalNodes = await prisma.treeBranchLeafNode.count();
    console.log(`Total nœuds: ${totalNodes}`);
    
    const nodesWithSingleRef = await prisma.treeBranchLeafNode.count({
      where: {
        sharedReferenceId: { not: null }
      }
    });
    console.log(`Nœuds avec sharedReferenceId: ${nodesWithSingleRef}`);
    
    const nodesWithMultipleRefs = await prisma.treeBranchLeafNode.count({
      where: {
        sharedReferenceIds: { isEmpty: false }
      }
    });
    console.log(`Nœuds avec sharedReferenceIds: ${nodesWithMultipleRefs}`);

    // 2. Analyser les nœuds avec références partagées
    console.log('\n🎯 NŒUDS AVEC RÉFÉRENCES PARTAGÉES');
    console.log('----------------------------------');
    
    const nodesWithRefs = await prisma.treeBranchLeafNode.findMany({
      where: {
        OR: [
          { sharedReferenceId: { not: null } },
          { sharedReferenceIds: { isEmpty: false } }
        ]
      },
      select: {
        id: true,
        label: true,
        type: true,
        sharedReferenceId: true,
        sharedReferenceIds: true,
        sharedReferenceName: true
      },
      take: 10 // Limiter pour éviter trop d'output
    });

    console.log(`Trouvé ${nodesWithRefs.length} nœuds avec références (premiers 10):`);
    
    for (const node of nodesWithRefs) {
      console.log(`\n🔗 Nœud: ${node.label} (${node.id})`);
      console.log(`   Type: ${node.type}`);
      
      if (node.sharedReferenceId) {
        console.log(`   → Référence unique: ${node.sharedReferenceId}`);
        
        // Vérifier si la référence existe
        const targetNode = await prisma.treeBranchLeafNode.findUnique({
          where: { id: node.sharedReferenceId },
          select: { id: true, label: true, type: true }
        });
        
        if (targetNode) {
          console.log(`     ✅ Cible trouvée: ${targetNode.label} (${targetNode.type})`);
        } else {
          console.log(`     ❌ Cible manquante!`);
        }
      }
      
      if (node.sharedReferenceIds && Array.isArray(node.sharedReferenceIds)) {
        console.log(`   → Références multiples: [${node.sharedReferenceIds.join(', ')}]`);
        
        for (const refId of node.sharedReferenceIds.slice(0, 3)) { // Limiter à 3
          const targetNode = await prisma.treeBranchLeafNode.findUnique({
            where: { id: refId },
            select: { id: true, label: true, type: true }
          });
          
          if (targetNode) {
            console.log(`     ✅ ${refId}: ${targetNode.label} (${targetNode.type})`);
          } else {
            console.log(`     ❌ ${refId}: Cible manquante!`);
          }
        }
      }
      
      if (node.sharedReferenceName) {
        console.log(`   📝 Nom de référence: "${node.sharedReferenceName}"`);
      }
    }

    // 3. Chercher spécifiquement les nœuds liés au problème
    console.log('\n🎯 RECHERCHE DES NŒUDS PROBLÉMATIQUES');
    console.log('------------------------------------');
    
    const problemNodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        OR: [
          { label: { contains: 'GRD' } },
          { label: { contains: 'Prix' } },
          { label: { contains: 'Kwh' } },
          { label: { contains: 'facade' } },
          { label: { contains: 'M²' } },
          { sharedReferenceName: { contains: 'GRD' } },
          { sharedReferenceName: { contains: 'Prix' } },
          { sharedReferenceName: { contains: 'Kwh' } }
        ]
      },
      select: {
        id: true,
        label: true,
        type: true,
        sharedReferenceId: true,
        sharedReferenceIds: true,
        sharedReferenceName: true,
        parentId: true
      }
    });

    console.log(`Trouvé ${problemNodes.length} nœuds liés au problème:`);
    
    for (const node of problemNodes) {
      console.log(`\n🔍 ${node.label} (${node.id})`);
      console.log(`   Type: ${node.type}, Parent: ${node.parentId}`);
      
      if (node.sharedReferenceId || (node.sharedReferenceIds && node.sharedReferenceIds.length > 0)) {
        console.log(`   🔗 A des références partagées`);
      }
      
      if (node.sharedReferenceName) {
        console.log(`   📝 Nom: "${node.sharedReferenceName}"`);
      }
    }

    // 4. Analyser les nœuds Versant et Rectangle
    console.log('\n🎯 ANALYSE VERSANT ET RECTANGLE');
    console.log('-------------------------------');
    
    const versantNodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        OR: [
          { label: { contains: 'Versant' } },
          { label: { contains: 'Rectangle' } },
          { label: { contains: 'Mesure simple' } }
        ]
      },
      select: {
        id: true,
        label: true,
        type: true,
        parentId: true
      }
    });

    console.log(`Trouvé ${versantNodes.length} nœuds Versant/Rectangle:`);
    versantNodes.forEach(node => {
      console.log(`- ${node.label} (${node.id}) - Type: ${node.type}, Parent: ${node.parentId}`);
    });

    console.log('\n✅ Analyse terminée!');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeSharedReferences();