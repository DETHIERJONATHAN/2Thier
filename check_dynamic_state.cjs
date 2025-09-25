const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDynamicState() {
  try {
    console.log('🔍 VÉRIFICATION DE L\'ÉTAT DYNAMIQUE DU SYSTÈME\n');
    
    // 1. Vérifier les variables existantes
    const existingVariables = await prisma.treeBranchLeafNodeVariable.count();
    console.log('📊 Variables actuellement définies:', existingVariables);
    
    // 2. Vérifier les champs total
    const totalFields = await prisma.treeBranchLeafNode.count({
      where: { isActive: true, isVisible: true }
    });
    console.log('📊 Champs actifs total:', totalFields);
    
    // 3. Champs SANS variables
    const fieldsWithoutVariables = await prisma.treeBranchLeafNode.count({
      where: {
        isActive: true,
        isVisible: true,
        TreeBranchLeafNodeVariable: { is: null }
      }
    });
    console.log('❌ Champs SANS variables:', fieldsWithoutVariables);
    
    console.log('\n🎯 ÉTAT ACTUEL:');
    if (fieldsWithoutVariables > 0) {
      console.log('⚠️  PAS COMPLÈTEMENT DYNAMIQUE');
      console.log('   - Si vous créez un nouveau champ SANS créer sa variable');
      console.log('   - Il ne sera PAS traité automatiquement dans les devis');
      console.log('   - Il faut créer manuellement sa TreeBranchLeafNodeVariable');
    } else {
      console.log('✅ COMPLÈTEMENT DYNAMIQUE');
      console.log('   - Tous les champs ont leur variable');
      console.log('   - Nouveaux devis traiteront tout automatiquement');
    }
    
    console.log('\n📝 POUR NOUVEAU CHAMP:');
    console.log('1. Créer le champ dans TreeBranchLeafNode');
    console.log('2. Créer sa variable dans TreeBranchLeafNodeVariable');
    console.log('3. Nouveau devis → Automatiquement traité !');
    
    console.log('\n🤔 QUESTION: Voulez-vous que je crée un système qui:');
    console.log('   - Détecte automatiquement les nouveaux champs');
    console.log('   - Crée automatiquement leur variable associée');
    console.log('   - Rende le système 100% automatique ?');
    
    // Lister quelques champs sans variables
    if (fieldsWithoutVariables > 0) {
      console.log('\n📋 EXEMPLES DE CHAMPS SANS VARIABLES:');
      const examples = await prisma.treeBranchLeafNode.findMany({
        where: {
          isActive: true,
          isVisible: true,
          TreeBranchLeafNodeVariable: { is: null }
        },
        select: {
          id: true,
          label: true,
          type: true
        },
        take: 5
      });
      
      examples.forEach((field, i) => {
        console.log(`   ${i + 1}. "${field.label}" (${field.type})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDynamicState();