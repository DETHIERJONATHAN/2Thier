const { PrismaClient } = require('@prisma/client');

async function restoreAndCreateNew() {
  const prisma = new PrismaClient();

  try {
    console.log('🔧 RESTAURATION + CRÉATION DE NOUVEAUX ENREGISTREMENTS\n');

    // 1. RESTAURER - Remettre les champs variables à NULL pour les 4 submissions modifiées
    console.log('🔄 ÉTAPE 1: Restauration des données originales...');
    
    const restoreResult = await prisma.treeBranchLeafSubmissionData.updateMany({
      where: { 
        variableKey: { not: null }
      },
      data: {
        variableKey: null,
        variableDisplayName: null,
        variableUnit: null,
        isVariable: false
      }
    });
    
    console.log(`✅ ${restoreResult.count} submissions restaurées à leur état original`);

    // 2. CRÉER - Nouveaux enregistrements avec les variables
    console.log('\n➕ ÉTAPE 2: Création de nouveaux enregistrements avec variables...');
    
    const variables = await prisma.treeBranchLeafNodeVariable.findMany();
    const firstSubmission = await prisma.treeBranchLeafSubmission.findFirst();
    
    if (!firstSubmission) {
      throw new Error('Aucune submission trouvée pour créer les nouveaux enregistrements');
    }

    const newRecords = [];
    
    for (const variable of variables) {
      const newId = `var-${variable.id}-${Date.now()}`;
      
      const newRecord = await prisma.treeBranchLeafSubmissionData.create({
        data: {
          id: newId,
          submissionId: firstSubmission.id,
          nodeId: variable.nodeId,  // Utiliser le nodeId de la variable
          value: `Variable: ${variable.exposedKey}`,
          variableKey: variable.exposedKey,
          variableDisplayName: variable.displayName,
          variableUnit: variable.unit,
          isVariable: true
        }
      });
      
      newRecords.push(newRecord);
      console.log(`✅ Créé: ${newId} → ${variable.exposedKey}`);
    }

    // 3. VÉRIFICATION FINALE
    console.log('\n📊 VÉRIFICATION FINALE:');
    
    const totalSubmissions = await prisma.treeBranchLeafSubmissionData.count();
    const withVariables = await prisma.treeBranchLeafSubmissionData.count({
      where: { variableKey: { not: null } }
    });
    
    console.log(`   - Total submissions: ${totalSubmissions}`);
    console.log(`   - Avec variables: ${withVariables}`);
    console.log(`   - Nouveaux créés: ${newRecords.length}`);

    // 4. AFFICHER LES NOUVEAUX ENREGISTREMENTS
    console.log('\n📝 NOUVEAUX ENREGISTREMENTS CRÉÉS:');
    newRecords.forEach((record, index) => {
      console.log(`${index + 1}. ID: ${record.id}`);
      console.log(`   - variableKey: "${record.variableKey}"`);
      console.log(`   - variableDisplayName: "${record.variableDisplayName}"`);
      console.log(`   - variableUnit: "${record.variableUnit}"`);
      console.log(`   - value: "${record.value}"`);
      console.log('');
    });

    console.log('🎉 SUCCESS: Données restaurées + Nouveaux enregistrements créés !');
    console.log('👉 Rafraîchissez Prisma Studio pour voir les résultats');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restoreAndCreateNew();