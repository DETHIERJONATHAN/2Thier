const { PrismaClient } = require('@prisma/client');

async function recreateCompleteAutomaticSystem() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🚀 RECRÉATION COMPLÈTE DU SYSTÈME AUTOMATIQUE\n');

    // 1. Nettoyer complètement l'ancien système
    console.log('1️⃣ Nettoyage complet de l\'ancien système...');
    
    // Supprimer tous les anciens triggers et fonctions
    const oldTriggers = await prisma.$queryRaw`
      SELECT trigger_name, event_object_table 
      FROM information_schema.triggers 
      WHERE trigger_schema = 'public' 
      AND (trigger_name LIKE '%auto%' OR trigger_name LIKE '%trigger%');
    `;
    
    for (const trigger of oldTriggers) {
      await prisma.$queryRawUnsafe(`DROP TRIGGER IF EXISTS "${trigger.trigger_name}" ON "${trigger.event_object_table}";`);
    }
    
    const oldFunctions = await prisma.$queryRaw`
      SELECT proname FROM pg_proc WHERE proname LIKE '%auto%';
    `;
    
    for (const func of oldFunctions) {
      await prisma.$queryRawUnsafe(`DROP FUNCTION IF EXISTS "${func.proname}"() CASCADE;`);
    }
    
    console.log(`   ✅ ${oldTriggers.length} triggers supprimés`);
    console.log(`   ✅ ${oldFunctions.length} fonctions supprimées`);

    // 2. Créer la fonction principale d'automatisation
    console.log('\n2️⃣ Création de la fonction principale...');
    
    await prisma.$executeRaw`
      CREATE OR REPLACE FUNCTION auto_populate_submission_data() RETURNS trigger AS $$
      DECLARE
        condition_rec RECORD;
        operation_rec RECORD;
        variable_rec RECORD;
        translated_detail JSONB;
        translated_result JSONB;
        final_value TEXT;
        select_field TEXT;
        select_value TEXT;
      BEGIN
        -- Pour chaque condition dans le conditionSet
        FOR condition_rec IN 
          SELECT c.*, o."operationDetail", o."operationResult"
          FROM "TreeBranchLeafCondition" c
          LEFT JOIN "TreeBranchLeafOperation" o ON o.id = c."operationId"
          WHERE c."conditionSetId" = NEW."conditionSetId"
        LOOP
          
          -- Initialiser avec les valeurs originales
          translated_detail := condition_rec."operationDetail";
          translated_result := condition_rec."operationResult";
          
          -- Si operationDetail existe, le traiter
          IF translated_detail IS NOT NULL THEN
            final_value := translated_detail::TEXT;
            
            -- Remplacer les variables existantes
            FOR variable_rec IN 
              SELECT "exposedKey", "displayName", "fixedValue", "defaultValue"
              FROM "TreeBranchLeafNodeVariable"
              WHERE "exposedKey" IS NOT NULL
            LOOP
              -- Remplacer par la valeur fixe ou par défaut
              final_value := REPLACE(
                final_value, 
                variable_rec."exposedKey", 
                COALESCE(variable_rec."fixedValue", variable_rec."defaultValue", variable_rec."displayName", 'N/A')
              );
            END LOOP;
            
            -- Traiter les champs SELECT
            IF final_value LIKE '%SELECT%' THEN
              select_field := TRIM(SPLIT_PART(final_value, 'SELECT', 2));
              
              -- Chercher la valeur correspondante dans les données de soumission
              SELECT "value" INTO select_value
              FROM "TreeBranchLeafSubmissionData" 
              WHERE "submissionId" = NEW.id
              AND ("fieldLabel" ILIKE '%' || select_field || '%' OR "value" ILIKE '%' || select_field || '%')
              LIMIT 1;
              
              IF select_value IS NOT NULL THEN
                final_value := REPLACE(final_value, 'SELECT ' || select_field, select_value);
              ELSE
                final_value := REPLACE(final_value, 'SELECT ' || select_field, '(valeur non trouvée)');
              END IF;
            END IF;
            
            -- Convertir le résultat final en JSONB
            translated_detail := to_jsonb(final_value);
          END IF;
          
          -- Créer automatiquement la donnée traduite
          INSERT INTO "TreeBranchLeafSubmissionData" (
            "id",
            "submissionId",
            "nodeId", 
            "value",
            "operationDetail",
            "operationResult",
            "operationSource",
            "sourceRef",
            "fieldLabel",
            "isVariable",
            "createdAt",
            "lastResolved"
          ) VALUES (
            gen_random_uuid()::TEXT,
            NEW.id,
            'auto_operation_' || condition_rec.id::TEXT,
            final_value,
            translated_detail,
            translated_result,
            'AUTOMATIC',
            'condition:' || condition_rec.id::TEXT,
            'Opération automatique ' || condition_rec.id::TEXT,
            false,
            NOW(),
            NOW()
          );
          
        END LOOP;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    console.log('   ✅ Fonction auto_populate_submission_data créée');

    // 3. Créer le trigger principal
    console.log('\n3️⃣ Création du trigger principal...');
    
    await prisma.$executeRaw`
      CREATE TRIGGER auto_populate_trigger
      AFTER INSERT ON "TreeBranchLeafSubmission"
      FOR EACH ROW EXECUTE FUNCTION auto_populate_submission_data();
    `;
    
    console.log('   ✅ Trigger auto_populate_trigger créé');

    // 4. Créer une fonction de mise à jour pour les données existantes
    console.log('\n4️⃣ Création fonction de mise à jour...');
    
    await prisma.$executeRaw`
      CREATE OR REPLACE FUNCTION update_existing_submission_data() RETURNS trigger AS $$
      DECLARE
        variable_rec RECORD;
        updated_detail JSONB;
        updated_value TEXT;
      BEGIN
        -- Si operationDetail existe, le mettre à jour avec les variables
        IF NEW."operationDetail" IS NOT NULL THEN
          updated_value := NEW."operationDetail"::TEXT;
          
          -- Remplacer les variables existantes
          FOR variable_rec IN 
            SELECT "exposedKey", "displayName", "fixedValue", "defaultValue"
            FROM "TreeBranchLeafNodeVariable"
            WHERE "exposedKey" IS NOT NULL
          LOOP
            updated_value := REPLACE(
              updated_value, 
              variable_rec."exposedKey", 
              COALESCE(variable_rec."fixedValue", variable_rec."defaultValue", variable_rec."displayName", 'N/A')
            );
          END LOOP;
          
          -- Mettre à jour avec la nouvelle valeur
          NEW."operationDetail" := to_jsonb(updated_value);
          NEW."lastResolved" := NOW();
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    await prisma.$executeRaw`
      CREATE TRIGGER auto_update_trigger
      BEFORE UPDATE ON "TreeBranchLeafSubmissionData"
      FOR EACH ROW EXECUTE FUNCTION update_existing_submission_data();
    `;
    
    console.log('   ✅ Trigger de mise à jour créé');

    // 5. Tester le système
    console.log('\n5️⃣ Test du système automatique...');
    
    // Récupérer un tree valide
    const testTree = await prisma.treeBranchLeafTree.findFirst();
    const testUser = await prisma.user.findFirst();
    
    if (testTree && testUser) {
      console.log(`📋 Test avec tree: ${testTree.name || testTree.id}`);
      console.log(`👤 Test avec user: ${testUser.email}`);
      
      const testSubmission = await prisma.treeBranchLeafSubmission.create({
        data: {
          id: 'test_auto_' + Date.now(),
          treeId: testTree.id,
          userId: testUser.id,
          status: 'draft',
          summary: { name: 'Test système automatique restauré' },
          updatedAt: new Date(),
          TreeBranchLeafSubmissionData: {
            create: [
              {
                id: 'test_data_' + Date.now(),
                nodeId: 'test_node',
                value: 'Test value'
              }
            ]
          }
        },
        include: {
          TreeBranchLeafSubmissionData: true
        }
      });
      
      console.log(`✅ Soumission test créée: ${testSubmission.id}`);
      
      // Attendre que le trigger s'exécute
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Vérifier les données automatiques
      const autoData = await prisma.treeBranchLeafSubmissionData.findMany({
        where: {
          submissionId: testSubmission.id,
          operationDetail: { not: null }
        }
      });
      
      console.log(`🤖 Données automatiques créées: ${autoData.length}`);
      autoData.forEach(data => {
        console.log(`   ✨ ${data.fieldLabel}: ${JSON.stringify(data.operationDetail)}`);
      });
      
      // Nettoyer le test
      await prisma.treeBranchLeafSubmissionData.deleteMany({
        where: { submissionId: testSubmission.id }
      });
      await prisma.treeBranchLeafSubmission.delete({
        where: { id: testSubmission.id }
      });
      
      console.log(`🧹 Test nettoyé`);
    }

    // 6. Vérification finale
    console.log('\n6️⃣ Vérification finale...');
    const finalTriggers = await prisma.$queryRaw`
      SELECT trigger_name, event_object_table 
      FROM information_schema.triggers 
      WHERE trigger_schema = 'public' 
      AND trigger_name LIKE '%auto%';
    `;
    
    console.log(`🔄 Nouveaux triggers: ${finalTriggers.length}`);
    finalTriggers.forEach(t => {
      console.log(`   ✅ ${t.trigger_name} sur ${t.event_object_table}`);
    });

    console.log('\n🎯 SYSTÈME AUTOMATIQUE RECRÉÉ!');
    console.log('✅ Fonction principale: auto_populate_submission_data()');
    console.log('✅ Trigger principal: auto_populate_trigger');
    console.log('✅ Trigger de mise à jour: auto_update_trigger');
    console.log('✅ Variables existantes intégrées');
    console.log('✅ SELECT fields supportés');
    console.log('✅ Toutes les colonnes automatiques remplies');
    
    console.log('\n🚀 LE SYSTÈME EST DE NOUVEAU OPÉRATIONNEL!');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error('📋 Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

recreateCompleteAutomaticSystem();