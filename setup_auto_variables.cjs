const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupAutoVariableCreation() {
  try {
    console.log('🔧 CONFIGURATION AUTO-CRÉATION VARIABLES PAR DEVIS\n');
    
    // 1. Exécuter le SQL de création des triggers étape par étape
    console.log('📜 Création de la fonction auto_create_variables_for_submission...');
    await prisma.$executeRaw`
      CREATE OR REPLACE FUNCTION auto_create_variables_for_submission()
      RETURNS TRIGGER AS $$
      BEGIN
          INSERT INTO "TreeBranchLeafSubmissionData" (
              id,
              "submissionId",
              "nodeId", 
              value,
              "isVariable",
              "variableKey",
              "variableDisplayName",
              "variableUnit",
              "fieldLabel",
              "sourceRef",
              "createdAt"
          )
          SELECT 
              var."nodeId", 
              NEW.id,
              var."nodeId",
              NULL,
              true,
              var."exposedKey",
              var."displayName", 
              var.unit,
              node.label,
              var."sourceRef",
              NOW()
          FROM "TreeBranchLeafNodeVariable" var
          JOIN "TreeBranchLeafNode" node ON var."nodeId" = node.id
          WHERE var."nodeId" NOT IN (
              SELECT "nodeId" 
              FROM "TreeBranchLeafSubmissionData" 
              WHERE "submissionId" = NEW.id AND "isVariable" = true
          );
          
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    console.log('✅ Fonction créée');
    
    console.log('📜 Suppression de l\'ancien trigger...');
    await prisma.$executeRaw`
      DROP TRIGGER IF EXISTS auto_create_variables_trigger ON "TreeBranchLeafSubmission";
    `;
    
    console.log('📜 Création du nouveau trigger...');
    await prisma.$executeRaw`
      CREATE TRIGGER auto_create_variables_trigger
          AFTER INSERT ON "TreeBranchLeafSubmission"
          FOR EACH ROW
          EXECUTE FUNCTION auto_create_variables_for_submission();
    `;
    
    console.log('📜 Création de la fonction de nettoyage...');
    await prisma.$executeRaw`
      CREATE OR REPLACE FUNCTION cleanup_variables_for_submission()
      RETURNS TRIGGER AS $$
      BEGIN
          DELETE FROM "TreeBranchLeafSubmissionData" 
          WHERE "submissionId" = OLD.id AND "isVariable" = true;
          
          RETURN OLD;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    console.log('📜 Création du trigger de nettoyage...');
    await prisma.$executeRaw`
      DROP TRIGGER IF EXISTS cleanup_variables_trigger ON "TreeBranchLeafSubmission";
    `;
    
    await prisma.$executeRaw`
      CREATE TRIGGER cleanup_variables_trigger
          BEFORE DELETE ON "TreeBranchLeafSubmission"
          FOR EACH ROW
          EXECUTE FUNCTION cleanup_variables_for_submission();
    `;
    
    console.log('✅ Tous les triggers créés avec succès\n');
    
    // 2. Test : créer un nouveau devis pour voir si ça marche
    console.log('🧪 TEST : Création d\'un nouveau devis...');
    
    // Récupérer des IDs existants pour le test
    const existingData = await prisma.treeBranchLeafSubmissionData.findFirst({
      include: {
        TreeBranchLeafSubmission: true
      }
    });
    
    if (!existingData) {
      console.log('❌ Aucune donnée existante trouvée pour le test');
      return;
    }
    
    const testSubmission = await prisma.treeBranchLeafSubmission.create({
      data: {
        id: `test-devis-${Date.now()}`,
        treeId: existingData.TreeBranchLeafSubmission.treeId,
        organizationId: existingData.TreeBranchLeafSubmission.organizationId,
        userId: existingData.TreeBranchLeafSubmission.userId
      }
    });
    
    console.log(`✅ Devis test créé: ${testSubmission.id}`);
    
    // 3. Vérifier que les variables ont été auto-créées
    await new Promise(resolve => setTimeout(resolve, 1000)); // Attendre 1 seconde
    
    const autoCreatedVariables = await prisma.treeBranchLeafSubmissionData.findMany({
      where: {
        submissionId: testSubmission.id,
        isVariable: true
      },
      select: {
        id: true,
        nodeId: true,
        variableKey: true,
        value: true,
        operationDetail: true
      }
    });
    
    console.log(`\n📊 RÉSULTAT : ${autoCreatedVariables.length} variables auto-créées`);
    
    autoCreatedVariables.forEach((variable, i) => {
      console.log(`${i + 1}. 🔑 ${variable.variableKey}`);
      console.log(`   🆔 ID: ${variable.id}`);
      console.log(`   🔗 nodeId: ${variable.nodeId}`);
      console.log(`   💎 value: ${variable.value || 'NULL (à compléter)'}`);
      console.log(`   📋 operationDetail: ${variable.operationDetail ? 'Présent' : 'Absent'}\n`);
    });
    
    // 4. Test de mise à jour d'une valeur
    if (autoCreatedVariables.length > 0) {
      const firstVar = autoCreatedVariables[0];
      console.log(`🔄 TEST : Mise à jour de la valeur pour ${firstVar.variableKey}...`);
      
      await prisma.treeBranchLeafSubmissionData.update({
        where: { id: firstVar.id },
        data: { value: '123.45' }
      });
      
      console.log(`✅ Valeur mise à jour : ${firstVar.variableKey} = "123.45"`);
      
      // Vérifier la traduction avec la vraie valeur
      const updated = await prisma.treeBranchLeafSubmissionData.findUnique({
        where: { id: firstVar.id }
      });
      
      console.log(`💎 Nouvelle valeur stockée: "${updated.value}"`);
    }
    
    // 5. Test de suppression (nettoyage auto)
    console.log(`\n🗑️  TEST : Suppression du devis test...`);
    await prisma.treeBranchLeafSubmission.delete({
      where: { id: testSubmission.id }
    });
    
    // Vérifier que les variables ont été nettoyées
    const remainingVars = await prisma.treeBranchLeafSubmissionData.count({
      where: {
        submissionId: testSubmission.id,
        isVariable: true
      }
    });
    
    console.log(`✅ Nettoyage automatique : ${remainingVars} variables restantes (devrait être 0)`);
    
    console.log('\n🎉 CONFIGURATION TERMINÉE !');
    console.log('✨ À partir de maintenant :');
    console.log('   • Chaque nouveau devis → variables auto-créées');
    console.log('   • Suppression devis → variables auto-nettoyées');
    console.log('   • Les valeurs saisies sont liées au devis spécifique');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupAutoVariableCreation();