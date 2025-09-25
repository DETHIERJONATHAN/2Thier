#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function analyseNoeudsElectricitéEtTBL() {
  console.log('🔍 === ANALYSE NŒUDS ÉLECTRICITÉ vs NOUVELLES SECTIONS ===\n');

  try {
    // 1. Trouver l'arbre principal
    const mainTree = await prisma.treeBranchLeafTree.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (!mainTree) {
      console.log('❌ Aucun arbre trouvé');
      return;
    }

    console.log(`🌳 Arbre principal: "${mainTree.name}" (ID: ${mainTree.id})\n`);

    // 2. Récupérer TOUS les nœuds
    const allNodes = await prisma.treeBranchLeafNode.findMany({
      where: { treeId: mainTree.id },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }]
    });

    console.log(`📊 Total nœuds: ${allNodes.length}\n`);

    // 3. Analyser les nœuds d'Électricité (ceux qui fonctionnent)
    console.log('⚡ === ANALYSE ÉLECTRICITÉ (QUI FONCTIONNE) ===');
    
    // IDs vus dans les logs TBL
    const electriciteIds = [
      'node_1757366229578_c9yf18eho',
      'node_1757366229581_0r5xyvcoe'
    ];

    electriciteIds.forEach(id => {
      const node = allNodes.find(n => n.id === id);
      if (node) {
        console.log(`✅ ${id} : "${node.label}" (${node.type})`);
        console.log(`   📝 Parent: ${node.parentId}`);
        console.log(`   📝 TBL Field: ${node.tblFieldName || 'Non défini'}`);
        console.log(`   📝 Order: ${node.order}`);
        console.log(`   📝 CreatedAt: ${node.createdAt.toISOString()}`);
        
        // Trouver le parent
        const parent = allNodes.find(n => n.id === node.parentId);
        if (parent) {
          console.log(`   👆 Parent: "${parent.label}" (${parent.type})`);
          
          // Trouver le grand-parent
          const grandParent = allNodes.find(n => n.id === parent.parentId);
          if (grandParent) {
            console.log(`   👆👆 Grand-parent: "${grandParent.label}" (${grandParent.type})`);
          }
        }
      } else {
        console.log(`❌ ${id} : INTROUVABLE`);
      }
      console.log('');
    });

    // 4. Analyser les nouvelles sections (qui ne fonctionnent pas)
    console.log('🆕 === ANALYSE NOUVELLES SECTIONS (QUI NE FONCTIONNENT PAS) ===');
    
    // Trouver les sections récemment créées
    const recentNodes = allNodes
      .filter(node => node.createdAt > new Date('2024-01-01'))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10);

    console.log(`📊 10 nœuds les plus récents:`);
    recentNodes.forEach((node, index) => {
      console.log(`${index + 1}. 🔗 "${node.label}" (${node.type}) [${node.id}]`);
      console.log(`   📝 Parent: ${node.parentId}`);
      console.log(`   📝 TBL Field: ${node.tblFieldName || 'Non défini'}`);
      console.log(`   📝 Order: ${node.order}`);
      console.log(`   📝 CreatedAt: ${node.createdAt.toISOString()}`);
      
      // Si c'est une section, analyser ses enfants
      if (node.type === 'section') {
        const children = allNodes.filter(n => n.parentId === node.id);
        console.log(`   👶 Enfants: ${children.length}`);
        children.forEach(child => {
          console.log(`     - "${child.label}" (${child.type}) [${child.id}]`);
        });
      }
      console.log('');
    });

    // 5. Comparer les critères TBL
    console.log('🔍 === CRITÈRES DE DÉTECTION TBL ===');
    
    // Analyser pourquoi Électricité est détecté et pas les nouvelles sections
    const sectionsElectricite = allNodes.filter(node => 
      node.parentId && 
      allNodes.find(p => p.id === node.parentId && p.label && p.label.toLowerCase().includes('électr'))
    );
    
    console.log(`📊 Nœuds dans Électricité: ${sectionsElectricite.length}`);
    sectionsElectricite.forEach(node => {
      console.log(`  🔗 "${node.label}" (${node.type}) [${node.id}]`);
      if (electriciteIds.includes(node.id)) {
        console.log(`    ✅ DÉTECTÉ par TBL`);
      } else {
        console.log(`    ❌ NON détecté par TBL`);
      }
    });

    // Nouvelles sections
    const nouvellesSections = allNodes.filter(node => 
      node.type === 'section' && 
      node.createdAt > new Date('2024-01-01')
    );
    
    console.log(`\n📊 Nouvelles sections: ${nouvellesSections.length}`);
    nouvellesSections.forEach(section => {
      console.log(`  📦 "${section.label}" (${section.type}) [${section.id}]`);
      const children = allNodes.filter(n => n.parentId === section.id);
      console.log(`    👶 Enfants: ${children.length}`);
      children.forEach(child => {
        console.log(`      - "${child.label}" (${child.type}) [${child.id}]`);
        if (child.tblFieldName) {
          console.log(`        🎯 TBL Field: ${child.tblFieldName}`);
        }
      });
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyseNoeudsElectricitéEtTBL();