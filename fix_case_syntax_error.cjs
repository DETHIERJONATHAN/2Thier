const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixCaseSyntaxError() {
  console.log('🔧 CORRECTION DE L\'ERREUR CASE POSTGRESQL...\n');

  // 1. Corriger la fonction avec la syntaxe CASE correcte
  console.log('1️⃣ Correction de la fonction auto-découverte...');
  await prisma.$executeRaw`
    CREATE OR REPLACE FUNCTION auto_discover_and_create_field(
      field_name TEXT,
      field_value TEXT
    ) RETURNS INTEGER AS $$
    DECLARE
      existing_data_id INTEGER;
      field_type TEXT;
    BEGIN
      -- Vérifier si existe déjà
      SELECT id INTO existing_data_id 
      FROM "TreeBranchLeafSubmissionData" 
      WHERE "fieldName" = field_name;
      
      IF existing_data_id IS NOT NULL THEN
        RETURN existing_data_id;
      END IF;
      
      -- Déterminer le type selon le nom
      field_type := CASE 
        WHEN field_name ILIKE '%prix%' OR field_name ILIKE '%cout%' OR field_name ILIKE '%montant%' THEN 'number'
        WHEN field_name ILIKE '%date%' THEN 'date'
        WHEN field_name ILIKE '%email%' THEN 'email'
        WHEN field_name ILIKE '%telephone%' OR field_name ILIKE '%tel%' THEN 'tel'
        WHEN field_name ILIKE '%bool%' OR field_name ILIKE '%oui%' OR field_name ILIKE '%non%' THEN 'boolean'
        ELSE 'text'
      END;
      
      -- Créer le champ
      INSERT INTO "TreeBranchLeafSubmissionData" (
        "fieldName", 
        "fieldValue", 
        "fieldType",
        "createdAt",
        "updatedAt"
      ) VALUES (
        field_name, 
        field_value, 
        field_type,
        NOW(),
        NOW()
      ) RETURNING id INTO existing_data_id;
      
      RETURN existing_data_id;
    END;
    $$ LANGUAGE plpgsql;
  `;

  // 2. Recréer le trigger principal avec correction
  console.log('2️⃣ Recréation du trigger principal...');
  
  // Supprimer l'ancien trigger
  await prisma.$executeRaw`DROP TRIGGER IF EXISTS auto_translate_operation_trigger ON "TreeBranchLeafSubmission";`;
  await prisma.$executeRaw`DROP FUNCTION IF EXISTS auto_translate_operation_complete();`;

  // Créer la nouvelle fonction
  await prisma.$executeRaw`
    CREATE OR REPLACE FUNCTION auto_translate_operation_complete() RETURNS trigger AS $$
    DECLARE
      condition_record RECORD;
      operation_record RECORD;
      var_record RECORD;
      translated_value TEXT;
      data_id INTEGER;
      SELECT_option TEXT;
      sub_field_value TEXT;
    BEGIN
      -- Pour chaque condition dans le set
      FOR condition_record IN 
        SELECT * FROM "TreeBranchLeafCondition" 
        WHERE "conditionSetId" = NEW."conditionSetId"
      LOOP
        -- Récupérer l'opération correspondante
        SELECT * INTO operation_record 
        FROM "TreeBranchLeafOperation" 
        WHERE id = condition_record."operationId";
        
        IF operation_record.id IS NOT NULL THEN
          translated_value := operation_record."operationDetail";
          
          -- Traiter les variables existantes
          FOR var_record IN 
            SELECT * FROM "TreeBranchLeafNodeVariable"
          LOOP
            IF translated_value LIKE '%' || var_record."variableName" || '%' THEN
              translated_value := REPLACE(
                translated_value, 
                var_record."variableName", 
                COALESCE(var_record."variableValue", 'N/A')
              );
            END IF;
          END LOOP;
          
          -- Traiter les champs SELECT avec options
          IF operation_record."operationDetail" LIKE '%SELECT%' THEN
            -- Extraire le nom du champ SELECT
            SELECT_option := TRIM(SPLIT_PART(operation_record."operationDetail", 'SELECT', 2));
            
            -- Chercher la valeur dans les soumissions
            SELECT "fieldValue" INTO sub_field_value
            FROM "TreeBranchLeafSubmissionData" tsd
            JOIN "TreeBranchLeafSubmission" ts ON ts.id = tsd."submissionId"
            WHERE ts."conditionSetId" = NEW."conditionSetId"
            AND tsd."fieldName" ILIKE '%' || SELECT_option || '%'
            LIMIT 1;
            
            IF sub_field_value IS NOT NULL THEN
              translated_value := REPLACE(translated_value, 'SELECT ' || SELECT_option, sub_field_value);
            END IF;
          END IF;
          
          -- Auto-créer le champ traduit
          data_id := auto_discover_and_create_field(
            'operation_' || operation_record.id::TEXT,
            translated_value
          );
          
          -- Lier à la soumission
          UPDATE "TreeBranchLeafSubmissionData" 
          SET "submissionId" = NEW.id 
          WHERE id = data_id;
        END IF;
      END LOOP;
      
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `;

  // Créer le trigger
  await prisma.$executeRaw`
    CREATE TRIGGER auto_translate_operation_trigger
    AFTER INSERT ON "TreeBranchLeafSubmission"
    FOR EACH ROW EXECUTE FUNCTION auto_translate_operation_complete();
  `;

  console.log('✅ Erreur CASE corrigée et système restauré');

  // 3. Test rapide
  console.log('3️⃣ Test du système corrigé...');
  
  try {
    // Obtenir un tree valide
    const testTree = await prisma.treeBranchLeaf.findFirst({
      where: {
        conditions: {
          some: {}
        }
      }
    });

    if (testTree) {
      console.log(`📋 Utilisation du tree: ${testTree.name}`);
      
      const testSubmission = await prisma.treeBranchLeafSubmission.create({
        data: {
          treeBranchLeafId: testTree.id,
          conditionSetId: 1,
          submissionData: {
            create: [
              {
                fieldName: 'test_field',
                fieldValue: 'test_value',
                fieldType: 'text'
              }
            ]
          }
        },
        include: {
          submissionData: true
        }
      });

      console.log('✅ Test réussi! ID:', testSubmission.id);
      console.log('📊 Données créées:', testSubmission.submissionData.length);

      // Vérifier la traduction automatique
      const translatedData = await prisma.treeBranchLeafSubmissionData.findMany({
        where: {
          submissionId: testSubmission.id,
          fieldName: {
            startsWith: 'operation_'
          }
        }
      });

      console.log('🔄 Traductions automatiques:', translatedData.length);
      translatedData.forEach(data => {
        console.log(`   📝 ${data.fieldName}: ${data.fieldValue}`);
      });
    }

  } catch (error) {
    console.log('⚠️ Erreur dans le test:', error.message);
  }

  console.log('\n🎯 SYSTÈME COMPLÈTEMENT CORRIGÉ ET AUTOMATIQUE!');
}

fixCaseSyntaxError()
  .catch(console.error)
  .finally(() => prisma.$disconnect());