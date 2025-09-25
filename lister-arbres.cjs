#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function listerTousLesArbres() {
  console.log('🔍 === LISTE DE TOUS LES ARBRES ===\n');

  try {
    const allTrees = await prisma.treeBranchLeafTree.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        category: true
      },
      orderBy: { name: 'asc' }
    });

    console.log(`📊 Total arbres trouvés: ${allTrees.length}\n`);

    allTrees.forEach((tree, index) => {
      console.log(`${index + 1}. 🌳 "${tree.name}"`);
      console.log(`   📝 ID: ${tree.id}`);
      console.log(`   📝 Description: ${tree.description || 'Aucune'}`);
      console.log(`   📝 Catégorie: ${tree.category || 'Aucune'}`);
      console.log('');
    });

    // Chercher spécifiquement ceux qui contiennent "électr" (insensible à la casse)
    const arbresElectr = allTrees.filter(tree => 
      tree.name.toLowerCase().includes('électr') || 
      tree.name.toLowerCase().includes('electr') ||
      (tree.description && tree.description.toLowerCase().includes('électr')) ||
      (tree.description && tree.description.toLowerCase().includes('electr'))
    );

    console.log(`🔍 Arbres contenant "électr": ${arbresElectr.length}`);
    arbresElectr.forEach(tree => {
      console.log(`  ⚡ "${tree.name}" (ID: ${tree.id})`);
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listerTousLesArbres();