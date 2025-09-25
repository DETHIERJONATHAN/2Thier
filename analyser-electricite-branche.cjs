#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function analyseElectriciteBrancheSection() {
  console.log('🔍 === ANALYSE BRANCHE ÉLECTRICITÉ + SECTION DONNÉES ===\n');

  try {
    // 1. Trouver l'arbre principal (celui que vous utilisez)
    const mainTree = await prisma.treeBranchLeafTree.findFirst({
      orderBy: { createdAt: 'desc' } // Le plus récent
    });

    if (!mainTree) {
      console.log('❌ Aucun arbre trouvé');
      return;
    }

    console.log(`🌳 Arbre principal: "${mainTree.name}" (ID: ${mainTree.id})\n`);

    // 2. Récupérer TOUS les nœuds de cet arbre
    const allNodes = await prisma.treeBranchLeafNode.findMany({
      where: { treeId: mainTree.id },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }]
    });

    console.log(`📊 Total nœuds dans l'arbre: ${allNodes.length}\n`);

    // 3. Chercher la branche "Électricité"
    const brancheElectricite = allNodes.find(node => 
      node.label && (
        node.label.toLowerCase().includes('électr') || 
        node.label.toLowerCase().includes('electr')
      )
    );

    if (!brancheElectricite) {
      console.log('❌ Branche Électricité non trouvée');
      console.log('\n📋 Toutes les branches disponibles:');
      allNodes.filter(node => node.type === 'branch').forEach(branch => {
        console.log(`  🌿 "${branch.label}" (${branch.type})`);
      });
      return;
    }

    console.log(`⚡ Branche Électricité trouvée: "${brancheElectricite.label}" (${brancheElectricite.type})`);
    console.log(`📝 ID: ${brancheElectricite.id}\n`);

    // 4. Chercher la section "Données" dans cette branche
    const sectionDonnees = allNodes.find(node => 
      node.parentId === brancheElectricite.id && 
      node.label && (
        node.label === 'Données' || 
        node.label.includes('Données') ||
        node.title === 'Données' ||
        (node.title && node.title.includes('Données'))
      )
    );

    if (!sectionDonnees) {
      console.log('❌ Section "Données" non trouvée dans la branche Électricité');
      console.log('\n📋 Toutes les sections de la branche Électricité:');
      allNodes.filter(node => node.parentId === brancheElectricite.id).forEach(section => {
        console.log(`  📦 "${section.label}" (${section.type})`);
      });
      return;
    }

    console.log(`📦 Section "Données" trouvée: "${sectionDonnees.label}" (${sectionDonnees.type})`);
    console.log(`📝 ID: ${sectionDonnees.id}`);
    console.log(`📝 Title: ${sectionDonnees.title || 'Non défini'}`);
    console.log(`📝 Description: ${sectionDonnees.description || 'Aucune'}\n`);

    // 5. Analyser les champs de cette section
    const champsSection = allNodes.filter(node => node.parentId === sectionDonnees.id);
    console.log(`🔗 Champs dans la section "Données": ${champsSection.length}\n`);

    champsSection.forEach((champ, index) => {
      console.log(`  ${index + 1}. 🔗 "${champ.label}" (${champ.type})`);
      console.log(`      📝 ID: ${champ.id}`);
      console.log(`      📝 TBL Field: ${champ.tblFieldName || 'Non défini'}`);
      console.log(`      📝 Order: ${champ.order}`);
      if (champ.configuration) {
        console.log(`      ⚙️ Config: ${JSON.stringify(champ.configuration, null, 2).replace(/\n/g, '\n      ')}`);
      }
      console.log('');
    });

    // 6. Analyser comment cette section est détectée comme "section données"
    console.log('🎯 === CRITÈRES DE DÉTECTION SECTION DONNÉES ===');
    console.log(`✓ Label contient "Données": ${sectionDonnees.label.includes('Données')}`);
    console.log(`✓ Title contient "Données": ${(sectionDonnees.title || '').includes('Données')}`);
    console.log(`✓ Type est "section": ${sectionDonnees.type === 'section'}`);
    console.log(`✓ Label exact "Données": ${sectionDonnees.label === 'Données'}`);
    console.log(`✓ Est une section TreeBranchLeaf: ${sectionDonnees.type === 'section' ? 'OUI' : 'NON'}`);

    // 7. Comment cette section devient-elle une "section données" dans le rendu ?
    console.log('\n🎨 === LOGIQUE DE RENDU SECTION DONNÉES ===');
    console.log('Dans TBLSectionRenderer.tsx, cette section sera détectée comme:');
    const isDataSectionTitle = sectionDonnees.title === 'Données' || (sectionDonnees.title && sectionDonnees.title.includes('Données'));
    const isDataSectionLabel = sectionDonnees.label === 'Données' || sectionDonnees.label.includes('Données');
    const isDataSectionType = sectionDonnees.type === 'section';
    
    console.log(`  🔍 section.title === 'Données': ${isDataSectionTitle}`);
    console.log(`  🔍 section.title.includes('Données'): ${isDataSectionTitle}`);
    console.log(`  🔍 section.isDataSection: sera ${isDataSectionType ? 'true' : 'false'} (si notre logique fonctionne)`);
    
    console.log('\n✅ CONCLUSION: Cette section devrait être automatiquement une "section données" !');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyseElectriciteBrancheSection();