const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createFinalCorrectTrigger() {
  try {
    console.log('🔧 Création du trigger final avec types JSONB corrects...\n');
    
    // 1. Supprimer l'ancien trigger
    console.log('1. Suppression de l\'ancien trigger...');
    await prisma.$executeRaw`DROP TRIGGER IF EXISTS auto_populate_trigger ON "TreeBranchLeafSubmission"`;
    
    // 2. Supprimer l'ancienne fonction  
    console.log('2. Suppression de l\'ancienne fonction...');
    await prisma.$executeRaw`DROP FUNCTION IF EXISTS auto_populate_submission_data() CASCADE`;
    
    // 3. Créer une fonction avec les bons types JSONB
    console.log('3. Création de la fonction avec types JSONB corrects...');
    await prisma.$executeRaw`
      CREATE OR REPLACE FUNCTION auto_populate_submission_data()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO "TreeBranchLeafSubmissionData" (
          id,
          "submissionId",
          "nodeId", 
          value,
          "createdAt",
          "lastResolved",
          "operationDetail",
          "operationResult",
          "operationSource",
          "sourceRef",
          "fieldLabel",
          "isVariable",
          "variableDisplayName",
          "variableKey",
          "variableUnit"
        ) VALUES (
          gen_random_uuid()::text,
          NEW.id,
          'auto-generated-node',
          'AUTO_POPULATED_BY_TRIGGER',
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP,
          '{"detail": "Auto-generated via PostgreSQL trigger", "timestamp": "' || CURRENT_TIMESTAMP || '"}'::jsonb,
          '{"result": "Successfully created with automatic population", "status": "completed"}'::jsonb,
          'PostgreSQL_Trigger',
          'trigger_auto_populate',
          'Auto-populated Field',
          true,
          'Automatically Generated Data',
          'auto_generated',
          'trigger_units'
        );
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    // 4. Créer le nouveau trigger
    console.log('4. Création du nouveau trigger...');
    await prisma.$executeRaw`
      CREATE TRIGGER auto_populate_trigger
      AFTER INSERT ON "TreeBranchLeafSubmission"
      FOR EACH ROW
      EXECUTE FUNCTION auto_populate_submission_data();
    `;
    
    console.log('✅ Trigger final avec types JSONB corrects créé !');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createFinalCorrectTrigger();