const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createCompleteAutomaticSystem() {
  try {
    console.log('🚀 CRÉATION DU SYSTÈME 100% AUTOMATIQUE\n');
    console.log('='.repeat(60));
    
    console.log('1️⃣ CRÉATION TRIGGER AUTO-DÉCOUVERTE CHAMPS...');
    
    // Trigger qui détecte automatiquement TOUS les nouveaux champs et crée leurs variables
    await prisma.$executeRaw`
      CREATE OR REPLACE FUNCTION auto_create_missing_variables()
      RETURNS INTEGER AS $$
      DECLARE
        field_record RECORD;
        new_exposed_key TEXT;
        created_count INTEGER := 0;
        counter INTEGER := 1;
      BEGIN
        -- Parcourir TOUS les champs qui n'ont pas de variable
        FOR field_record IN 
          SELECT n.id, n.label, n.type, n."fieldType"
          FROM "TreeBranchLeafNode" n
          LEFT JOIN "TreeBranchLeafNodeVariable" v ON n.id = v."nodeId"
          WHERE v."nodeId" IS NULL 
            AND n."isActive" = true
            AND n."isVisible" = true
            AND n.type != 'section'  -- Exclure les sections
        LOOP
          -- Générer exposedKey intelligent basé sur le label
          new_exposed_key := 'AUTO_' || UPPER(REGEXP_REPLACE(
            COALESCE(field_record.label, 'FIELD'), 
            '[^a-zA-Z0-9]', '_', 'g'
          ));
          new_exposed_key := LEFT(new_exposed_key, 40);
          
          -- Assurer l'unicité
          WHILE EXISTS (SELECT 1 FROM "TreeBranchLeafNodeVariable" WHERE "exposedKey" = new_exposed_key) LOOP
            new_exposed_key := LEFT(new_exposed_key, 35) || '_' || counter;
            counter := counter + 1;
          END LOOP;
          
          -- Créer la variable automatiquement
          BEGIN
            INSERT INTO "TreeBranchLeafNodeVariable" (
              "id",
              "nodeId",
              "exposedKey",
              "displayName",
              "displayFormat",
              "unit",
              "precision",
              "visibleToUser",
              "isReadonly",
              "sourceType",
              "sourceRef",
              "createdAt",
              "updatedAt"
            ) VALUES (
              'auto_' || field_record.id,
              field_record.id,
              new_exposed_key,
              COALESCE(field_record.label, 'Variable auto'),
              CASE 
                WHEN field_record."fieldType" = 'number' THEN 'number'
                ELSE 'text'
              END,
              CASE 
                WHEN field_record."fieldType" = 'number' THEN 'unité'
                ELSE NULL
              END,
              CASE 
                WHEN field_record."fieldType" = 'number' THEN 2
                ELSE NULL
              END,
              true,
              false,
              'auto_created',
              'auto:' || field_record.id,
              NOW(),
              NOW()
            );
            
            created_count := created_count + 1;
            RAISE NOTICE 'AUTO-CRÉÉ variable % pour champ "%"', new_exposed_key, field_record.label;
            
          EXCEPTION 
            WHEN OTHERS THEN
              RAISE NOTICE 'Erreur auto-création pour %: %', field_record.id, SQLERRM;
          END;
        END LOOP;
        
        RETURN created_count;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    console.log('✅ Fonction auto-découverte créée');
    
    console.log('\n2️⃣ TRIGGER COMPLET POUR NOUVEAUX DEVIS...');
    
    // Trigger principal qui fait TOUT automatiquement
    await prisma.$executeRaw`
      DROP TRIGGER IF EXISTS auto_create_variables_trigger ON "TreeBranchLeafSubmission";
    `;
    
    await prisma.$executeRaw`
      CREATE OR REPLACE FUNCTION complete_auto_system_for_submission()
      RETURNS TRIGGER AS $$
      DECLARE
        auto_created_count INTEGER;
        existing_var_count INTEGER;
      BEGIN
        RAISE NOTICE 'SYSTÈME AUTO: Nouveau devis % - Traitement complet...', NEW.id;
        
        -- 1. AUTO-DÉCOUVERTE: Créer les variables manquantes
        SELECT auto_create_missing_variables() INTO auto_created_count;
        RAISE NOTICE 'AUTO-DÉCOUVERTE: % nouvelles variables créées', auto_created_count;
        
        -- 2. RÉCUPÉRATION: Toutes les variables existantes (anciennes + nouvelles)
        INSERT INTO "TreeBranchLeafSubmissionData" (
          "id",
          "submissionId", 
          "nodeId",
          "value",
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
          COALESCE(node."label", var."displayName"),
          true,
          var."exposedKey",
          var."displayName",
          var."unit",
          node."label",
          var."sourceRef",
          NOW()
        FROM "TreeBranchLeafNodeVariable" var
        JOIN "TreeBranchLeafNode" node ON var."nodeId" = node.id
        WHERE var."nodeId" NOT IN (
          SELECT "nodeId" 
          FROM "TreeBranchLeafSubmissionData" 
          WHERE "submissionId" = NEW.id AND "isVariable" = true
        )
        ON CONFLICT ("id") DO UPDATE SET
          "isVariable" = true,
          "variableKey" = EXCLUDED."variableKey",
          "variableDisplayName" = EXCLUDED."variableDisplayName",
          "variableUnit" = EXCLUDED."variableUnit",
          "sourceRef" = EXCLUDED."sourceRef";
        
        GET DIAGNOSTICS existing_var_count = ROW_COUNT;
        RAISE NOTICE 'RÉCUPÉRATION: % variables intégrées au devis', existing_var_count;
        
        -- 3. TRADUCTION: Marquer pour traduction automatique
        UPDATE "TreeBranchLeafSubmissionData" 
        SET "lastResolved" = NULL
        WHERE "submissionId" = NEW.id AND "isVariable" = true;
        
        RAISE NOTICE 'SYSTÈME AUTO TERMINÉ: Devis % prêt avec % variables (% auto-créées)', 
          NEW.id, existing_var_count, auto_created_count;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    await prisma.$executeRaw`
      CREATE TRIGGER auto_create_variables_trigger
          AFTER INSERT ON "TreeBranchLeafSubmission"
          FOR EACH ROW
          EXECUTE FUNCTION complete_auto_system_for_submission();
    `;
    
    console.log('✅ Trigger complet créé');
    
    console.log('\n3️⃣ AMÉLIORATION TRADUCTION AUTO...');
    
    // Améliorer le trigger de traduction pour gérer TOUT automatiquement
    await prisma.$executeRaw`
      CREATE OR REPLACE FUNCTION auto_resolve_tree_branch_leaf_operations()
      RETURNS TRIGGER AS $$
      DECLARE
        node_label TEXT;
        node_type TEXT;
        var_key TEXT;
        var_display_name TEXT;
        var_unit TEXT;
        var_exists BOOLEAN := FALSE;
        translated_value TEXT;
      BEGIN
        -- Auto-remplir fieldLabel si manquant
        IF NEW."nodeId" IS NOT NULL AND NEW."fieldLabel" IS NULL THEN
          SELECT label INTO node_label
          FROM "TreeBranchLeafNode"
          WHERE "id" = NEW."nodeId";
          
          IF node_label IS NOT NULL THEN
            NEW."fieldLabel" := node_label;
          END IF;
        END IF;
        
        -- Auto-remplir variables si manquant
        IF NEW."nodeId" IS NOT NULL AND (NEW."variableKey" IS NULL OR NEW."isVariable" IS NULL) THEN
          SELECT 
            v."exposedKey",
            v."displayName", 
            v."unit",
            TRUE
          INTO var_key, var_display_name, var_unit, var_exists
          FROM "TreeBranchLeafNodeVariable" v
          WHERE v."nodeId" = NEW."nodeId";
          
          IF var_exists THEN
            NEW."variableKey" := var_key;
            NEW."variableDisplayName" := var_display_name;
            NEW."variableUnit" := var_unit;
            NEW."isVariable" := TRUE;
          ELSE
            NEW."isVariable" := FALSE;
          END IF;
        END IF;
        
        -- TRADUCTION AUTOMATIQUE INTELLIGENTE
        IF NEW."isVariable" = TRUE AND NEW."operationDetail" IS NULL THEN
          -- Récupérer le type de node
          SELECT type INTO node_type
          FROM "TreeBranchLeafNode"
          WHERE id = NEW."nodeId";
          
          -- SELECT avec options: Résolution intelligente
          IF node_type = 'branch' THEN
            translated_value := resolve_select_with_options(NEW."nodeId", NEW."submissionId");
            NEW."operationDetail" := json_build_object(
              'translatedValue', translated_value,
              'originalValue', NEW."value",
              'method', 'select_intelligent',
              'autoGenerated', true
            );
          ELSE
            -- Champs normaux: Traduction standard
            translated_value := '"' || COALESCE(var_display_name, node_label, 'Variable') || '" (' || COALESCE(NEW."value", '0') || ')';
            NEW."operationDetail" := json_build_object(
              'translatedValue', translated_value,
              'originalValue', NEW."value",
              'method', 'standard',
              'autoGenerated', true
            );
          END IF;
          
          -- Marquer comme résolu
          NEW."lastResolved" := NOW();
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    console.log('✅ Traduction automatique améliorée');
    
    console.log('\n4️⃣ TRIGGER AUTO POUR NOUVELLES DONNÉES...');
    
    // Trigger qui met automatiquement à jour quand des données sont encodées
    await prisma.$executeRaw`
      DROP TRIGGER IF EXISTS auto_update_on_data_change ON "TreeBranchLeafSubmissionData";
    `;
    
    await prisma.$executeRaw`
      CREATE OR REPLACE FUNCTION auto_update_on_data_change()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Si c'est une variable et que la valeur change
        IF NEW."isVariable" = true AND (OLD."value" IS NULL OR NEW."value" != OLD."value") THEN
          -- Forcer une nouvelle traduction
          NEW."lastResolved" := NULL;
          NEW."operationDetail" := NULL;
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    await prisma.$executeRaw`
      CREATE TRIGGER auto_update_on_data_change
          BEFORE UPDATE ON "TreeBranchLeafSubmissionData"
          FOR EACH ROW
          EXECUTE FUNCTION auto_update_on_data_change();
    `;
    
    console.log('✅ Auto-update sur changement de données');
    
    console.log('\n5️⃣ TEST DU SYSTÈME COMPLET...');
    
    // Test complet
    const testTree = await prisma.treeBranchLeafTree.findFirst();
    if (testTree) {
      console.log('🧪 Création d\'un devis test...');
      
      const testSubmission = await prisma.treeBranchLeafSubmission.create({
        data: {
          id: `complete_auto_test_${Date.now()}`,
          treeId: testTree.id,
          status: 'draft',
          updatedAt: new Date()
        }
      });
      
      console.log(`   ✅ Devis créé: ${testSubmission.id}`);
      
      // Attendre le traitement automatique
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Vérifier les résultats
      const [variableCount, submissionDataCount] = await Promise.all([
        prisma.treeBranchLeafNodeVariable.count(),
        prisma.treeBranchLeafSubmissionData.count({
          where: { submissionId: testSubmission.id, isVariable: true }
        })
      ]);
      
      console.log(`   📊 Variables totales après auto-création: ${variableCount}`);
      console.log(`   📊 Variables dans le devis: ${submissionDataCount}`);
      
      // Nettoyer
      await prisma.treeBranchLeafSubmission.delete({
        where: { id: testSubmission.id }
      });
      console.log('   🧹 Test nettoyé');
    }
    
    console.log('\n🎉 SYSTÈME 100% AUTOMATIQUE CRÉÉ !');
    console.log('='.repeat(60));
    console.log('✅ Auto-découverte des nouveaux champs');
    console.log('✅ Auto-création des variables manquantes');
    console.log('✅ Auto-récupération de toutes les variables');
    console.log('✅ Auto-résolution des SELECT avec options');
    console.log('✅ Auto-traduction intelligente');
    console.log('✅ Auto-update quand données changent');
    console.log('');
    console.log('🚀 RÉSULTAT: Créez un champ, créez un devis → TOUT SE FAIT AUTOMATIQUEMENT !');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

console.log('🚀 CRÉATION DU SYSTÈME COMPLÈTEMENT AUTOMATIQUE...\n');
createCompleteAutomaticSystem();