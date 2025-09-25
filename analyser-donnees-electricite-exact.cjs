#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function analyseExacteDonneesElectricite() {
  console.log('🔍 === ANALYSE EXACTE : SECTION DONNÉES ÉLECTRICITÉ vs NOUVELLES SECTIONS ===\n');

  try {
    // 1. Récupérer TOUS les nœuds
    const allNodes = await prisma.treeBranchLeafNode.findMany({
      where: { treeId: 'cmf1mwoz10005gooked1j6orn' },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }]
    });

    console.log(`📊 Total nœuds: ${allNodes.length}\n`);

    // 2. Analyser la branche Électricité
    const electricite = allNodes.find(node => 
      node.type === 'branch' && 
      node.label && (
        node.label.toLowerCase().includes('électr') || 
        node.label.toLowerCase().includes('electr')
      )
    );

    if (!electricite) {
      console.log('❌ Branche Électricité non trouvée');
      return;
    }

    console.log(`⚡ BRANCHE ÉLECTRICITÉ TROUVÉE:`);
    console.log(`   📝 ID: ${electricite.id}`);
    console.log(`   📝 Label: "${electricite.label}"`);
    console.log(`   📝 Type: ${electricite.type}`);
    console.log(`   📝 Parent: ${electricite.parentId}`);
    console.log(`   📝 Order: ${electricite.order}`);
    console.log(`   📝 CreatedAt: ${electricite.createdAt.toISOString()}`);
    console.log('');

    // 3. Analyser la section "Données" d'Électricité
    const sectionDonnees = allNodes.find(node => 
      node.parentId === electricite.id && 
      node.label === 'Données'
    );

    if (!sectionDonnees) {
      console.log('❌ Section "Données" non trouvée dans Électricité');
      return;
    }

    console.log(`📦 SECTION "DONNÉES" D'ÉLECTRICITÉ (QUI FONCTIONNE):`);
    console.log(`   📝 ID: ${sectionDonnees.id}`);
    console.log(`   📝 Label: "${sectionDonnees.label}"`);
    console.log(`   📝 Type: ${sectionDonnees.type}`);
    console.log(`   📝 Parent: ${sectionDonnees.parentId} (Électricité)`);
    console.log(`   📝 Order: ${sectionDonnees.order}`);
    console.log(`   📝 CreatedAt: ${sectionDonnees.createdAt.toISOString()}`);
    console.log(`   📝 TBL Field Name: ${sectionDonnees.tblFieldName || 'Non défini'}`);
    console.log(`   📝 Configuration: ${sectionDonnees.configuration ? JSON.stringify(sectionDonnees.configuration, null, 2) : 'Aucune'}`);
    console.log(`   📝 Description: ${sectionDonnees.description || 'Aucune'}`);
    console.log('');

    // 4. Analyser les champs de la section "Données" d'Électricité
    const champsElectricite = allNodes.filter(node => 
      node.parentId === sectionDonnees.id
    );

    console.log(`🔗 CHAMPS DE LA SECTION "DONNÉES" D'ÉLECTRICITÉ: ${champsElectricite.length}`);
    champsElectricite.forEach((champ, index) => {
      console.log(`   ${index + 1}. "${champ.label}" (${champ.type})`);
      console.log(`      📝 ID: ${champ.id}`);
      console.log(`      📝 Parent: ${champ.parentId}`);
      console.log(`      📝 Order: ${champ.order}`);
      console.log(`      📝 TBL Field Name: ${champ.tblFieldName || 'Non défini'}`);
      console.log(`      📝 Configuration: ${champ.configuration ? JSON.stringify(champ.configuration, null, 2) : 'Aucune'}`);
      console.log(`      📝 CreatedAt: ${champ.createdAt.toISOString()}`);
      console.log('');
    });

    // 5. Analyser les nouvelles sections (qui ne fonctionnent pas)
    console.log(`🆕 NOUVELLES SECTIONS (QUI NE FONCTIONNENT PAS):`);
    
    const nouvellesSections = allNodes.filter(node => 
      node.type === 'section' && 
      node.createdAt > new Date('2024-01-01') &&
      node.id !== sectionDonnees.id
    );

    nouvellesSections.forEach((section, index) => {
      console.log(`   ${index + 1}. SECTION "${section.label}" (${section.type})`);
      console.log(`      📝 ID: ${section.id}`);
      console.log(`      📝 Parent: ${section.parentId}`);
      console.log(`      📝 Order: ${section.order}`);
      console.log(`      📝 TBL Field Name: ${section.tblFieldName || 'Non défini'}`);
      console.log(`      📝 Configuration: ${section.configuration ? JSON.stringify(section.configuration, null, 2) : 'Aucune'}`);
      console.log(`      📝 CreatedAt: ${section.createdAt.toISOString()}`);

      // Ses champs
      const champsSection = allNodes.filter(node => node.parentId === section.id);
      console.log(`      👶 CHAMPS: ${champsSection.length}`);
      champsSection.forEach((champ, champIndex) => {
        console.log(`         ${champIndex + 1}. "${champ.label}" (${champ.type})`);
        console.log(`            📝 ID: ${champ.id}`);
        console.log(`            📝 TBL Field Name: ${champ.tblFieldName || 'Non défini'}`);
        console.log(`            📝 Configuration: ${champ.configuration ? JSON.stringify(champ.configuration, null, 2) : 'Aucune'}`);
        console.log(`            📝 CreatedAt: ${champ.createdAt.toISOString()}`);
      });
      console.log('');
    });

    // 6. COMPARAISON POINT PAR POINT
    console.log(`🔍 === COMPARAISON DÉTAILLÉE ===`);
    console.log(`\n📋 CRITÈRES DE LA SECTION "DONNÉES" QUI FONCTIONNE:`);
    console.log(`   ✅ Label: "${sectionDonnees.label}"`);
    console.log(`   ✅ Type: ${sectionDonnees.type}`);
    console.log(`   ✅ Parent: Électricité (branch)`);
    console.log(`   ✅ Order: ${sectionDonnees.order}`);
    console.log(`   ✅ TBL Field Name: ${sectionDonnees.tblFieldName || 'Non défini'}`);
    console.log(`   ✅ Age: ${Math.floor((new Date() - sectionDonnees.createdAt) / (1000 * 60 * 60 * 24))} jours`);

    console.log(`\n📋 CRITÈRES DES NOUVELLES SECTIONS QUI NE FONCTIONNENT PAS:`);
    nouvellesSections.forEach((section, index) => {
      console.log(`   ${index + 1}. "${section.label}"`);
      console.log(`      📝 Type: ${section.type} ${section.type === sectionDonnees.type ? '✅' : '❌'}`);
      console.log(`      📝 TBL Field Name: ${section.tblFieldName || 'Non défini'} ${(section.tblFieldName || 'Non défini') === (sectionDonnees.tblFieldName || 'Non défini') ? '✅' : '❌'}`);
      console.log(`      📝 Age: ${Math.floor((new Date() - section.createdAt) / (1000 * 60 * 60 * 24))} jours`);
    });

    // 7. RECOMMANDATIONS
    console.log(`\n🎯 === RECOMMANDATIONS ===`);
    console.log(`Pour que les nouvelles sections fonctionnent comme "Données", il faut:`);
    console.log(`1. ✅ Type: section (déjà correct)`);
    console.log(`2. 🔍 Vérifier pourquoi TBL ne les détecte pas`);
    console.log(`3. 🔍 Possible différence dans la logique de traitement TBL`);

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyseExacteDonneesElectricite();