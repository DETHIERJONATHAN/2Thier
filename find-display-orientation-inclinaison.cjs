#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  console.log('🔍 RECHERCHE DES NŒUDS DISPLAY ORIENTATION-INCLINAISON\n');

  // L'original Orientation-inclinaison a linkedVariableIds: ['89160843-6d16-48d6-864c-bed84798011d']
  const originalVarId = '89160843-6d16-48d6-864c-bed84798011d';
  
  console.log('1️⃣ RECHERCHE DU NŒUD DISPLAY ORIGINAL:');
  const originalDisplay = await prisma.treeBranchLeafNode.findUnique({
    where: { id: `display-${originalVarId}` },
    select: {
      id: true,
      label: true,
      parentId: true,
      linkedVariableIds: true,
      metadata: true
    }
  });

  if (originalDisplay) {
    console.log(`   ✅ TROUVÉ: ${originalDisplay.label} (${originalDisplay.id})`);
    console.log(`   ParentId: ${originalDisplay.parentId}`);
    console.log(`   linkedVariableIds: ${JSON.stringify(originalDisplay.linkedVariableIds)}`);
  } else {
    console.log(`   ❌ NON TROUVÉ: display-${originalVarId}`);
  }

  console.log('\n2️⃣ RECHERCHE DU NŒUD DISPLAY COPIE (-1):');
  const copyDisplayId = `display-${originalVarId}-1`;
  const copyDisplay = await prisma.treeBranchLeafNode.findUnique({
    where: { id: copyDisplayId },
    select: {
      id: true,
      label: true,
      parentId: true,
      linkedVariableIds: true,
      metadata: true
    }
  });

  if (copyDisplay) {
    console.log(`   ✅ TROUVÉ: ${copyDisplay.label} (${copyDisplay.id})`);
    console.log(`   ParentId: ${copyDisplay.parentId}`);
    console.log(`   linkedVariableIds: ${JSON.stringify(copyDisplay.linkedVariableIds)}`);
    
    // Parent
    if (copyDisplay.parentId) {
      const parent = await prisma.treeBranchLeafNode.findUnique({
        where: { id: copyDisplay.parentId },
        select: { id: true, label: true, metadata: true }
      });
      console.log(`   Parent: ${parent?.label} (${parent?.id})`);
      console.log(`   Parent sourceTemplateId: ${parent?.metadata?.sourceTemplateId || 'N/A'}`);
    }
  } else {
    console.log(`   ❌ NON TROUVÉ: ${copyDisplayId}`);
    console.log(`\n   Le nœud display de la copie devrait être créé !`);
  }

  console.log('\n3️⃣ COMPARAISON AVEC M FAÇADE:');
  const mFacadeVarId = 'f73895e7-1145-4597-88fa-1d3b84a39259';
  console.log(`   M façade linkedVariableIds: ["${mFacadeVarId}"]`);
  console.log(`   M façade-1 display ID: display-${mFacadeVarId}-1`);
  
  const mFacadeDisplay = await prisma.treeBranchLeafNode.findUnique({
    where: { id: `display-${mFacadeVarId}-1` },
    select: { id: true, label: true, createdAt: true }
  });
  
  if (mFacadeDisplay) {
    console.log(`   ✅ M façade-1 display existe: ${mFacadeDisplay.label}`);
    console.log(`   Créé: ${mFacadeDisplay.createdAt}`);
  }

  console.log('\n4️⃣ DIAGNOSTIC:');
  console.log(`   Variable originale orientation-inclinaison: ${originalVarId}`);
  console.log(`   Nœud display original attendu: display-${originalVarId}`);
  console.log(`   Nœud display copie attendu: display-${originalVarId}-1`);
  
  if (!originalDisplay) {
    console.log('\n   ❌ PROBLÈME: Le nœud display ORIGINAL n\'existe pas !');
    console.log('   Sans le display original, la copie ne peut pas être créée.');
  }

  await prisma.$disconnect();
})();
