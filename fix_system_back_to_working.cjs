const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateSystemWithSelectIntelligence() {
  try {
    console.log('🔧 MISE À JOUR DU SYSTÈME AVEC INTELLIGENCE SELECT\n');
    console.log('='.repeat(60));
    
    console.log('1️⃣ SUPPRESSION DES FONCTIONS COMPLEXES INUTILES...');
    
    // Supprimer les fonctions que j'ai créées par erreur
    await prisma.$executeRaw`
      DROP FUNCTION IF EXISTS discover_missing_variables();
    `;
    
    await prisma.$executeRaw`
      DROP FUNCTION IF EXISTS auto_create_all_missing_variables(TEXT);
    `;
    
    console.log('✅ Fonctions inutiles supprimées');
    
    console.log('\n2️⃣ REMISE DU TRIGGER SIMPLE ORIGINAL...');
    
    // Remettre le trigger simple qui marchait
    await prisma.$executeRaw`
      DROP TRIGGER IF EXISTS auto_create_variables_trigger ON "TreeBranchLeafSubmission";
    `;
    
    await prisma.$executeRaw`
      CREATE OR REPLACE FUNCTION auto_create_variables_for_submission()
      RETURNS TRIGGER AS $$
      BEGIN
          -- Créer les variables pour toutes les variables EXISTANTES
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
            COALESCE(node."label", 'Variable ' || var."exposedKey"),
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
          ON CONFLICT ("id") DO NOTHING;
          
          RAISE NOTICE 'Variables créées pour devis %', NEW.id;
          
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    await prisma.$executeRaw`
      CREATE TRIGGER auto_create_variables_trigger
          AFTER INSERT ON "TreeBranchLeafSubmission"
          FOR EACH ROW
          EXECUTE FUNCTION auto_create_variables_for_submission();
    `;
    
    console.log('✅ Trigger simple remis en place');
    
    console.log('\n3️⃣ AJOUT DE LA FONCTION INTELLIGENTE POUR SELECT...');
    
    // Ajouter la fonction de résolution SELECT intelligente
    await prisma.$executeRaw`
      CREATE OR REPLACE FUNCTION resolve_select_with_options(node_id TEXT, submission_id TEXT)
      RETURNS TEXT AS $$
      DECLARE
        select_node_label TEXT;
        option_value TEXT;
        opened_field_label TEXT;
        field_data_value TEXT;
      BEGIN
        -- 1. Récupérer le label du champ SELECT
        SELECT label INTO select_node_label
        FROM "TreeBranchLeafNode"
        WHERE id = node_id;
        
        IF select_node_label IS NULL THEN
          RETURN '[SELECT NON TROUVÉ: ' || node_id || ']';
        END IF;
        
        -- 2. Trouver quelle option est sélectionnée
        SELECT value INTO option_value
        FROM "TreeBranchLeafSubmissionData"
        WHERE "nodeId" = node_id 
          AND "submissionId" = submission_id 
          AND "isVariable" = false;
        
        IF option_value IS NULL THEN
          RETURN '"' || select_node_label || '" (aucune option sélectionnée)';
        END IF;
        
        -- 3. Vérifier si l'option pointe vers un autre champ (UUID format)
        IF option_value ~ '^[a-f0-9-]{36}$' THEN
          -- Récupérer le label du champ ouvert
          SELECT label INTO opened_field_label
          FROM "TreeBranchLeafNode"
          WHERE id = option_value;
          
          IF opened_field_label IS NULL THEN
            RETURN '"' || select_node_label || '" → [Option inconnue: ' || option_value || ']';
          END IF;
          
          -- 4. Récupérer la valeur saisie dans le champ ouvert
          SELECT value INTO field_data_value
          FROM "TreeBranchLeafSubmissionData"
          WHERE "nodeId" = option_value 
            AND "submissionId" = submission_id 
            AND "isVariable" = false;
          
          -- 5. Construire le résultat intelligent
          IF field_data_value IS NOT NULL AND field_data_value != '' THEN
            RETURN '"' || select_node_label || '" → "' || opened_field_label || '" (' || field_data_value || ')';
          ELSE
            RETURN '"' || select_node_label || '" → "' || opened_field_label || '" (vide)';
          END IF;
        ELSE
          -- Option simple (pas un UUID)
          RETURN '"' || select_node_label || '" = ' || option_value;
        END IF;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    console.log('✅ Fonction SELECT intelligente ajoutée');
    
    console.log('\n4️⃣ MISE À JOUR DU TRIGGER DE TRADUCTION...');
    
    // Mettre à jour le trigger de traduction pour utiliser la fonction SELECT
    await prisma.$executeRaw`
      CREATE OR REPLACE FUNCTION auto_resolve_tree_branch_leaf_operations()
      RETURNS TRIGGER AS $$
      DECLARE
        node_label TEXT;
        var_key TEXT;
        var_display_name TEXT;
        var_unit TEXT;
        var_exists BOOLEAN := FALSE;
      BEGIN
        -- Auto-remplir fieldLabel si nodeId fourni
        IF NEW."nodeId" IS NOT NULL AND NEW."fieldLabel" IS NULL THEN
          SELECT label INTO node_label
          FROM "TreeBranchLeafNode"
          WHERE "id" = NEW."nodeId";
          
          IF node_label IS NOT NULL THEN
            NEW."fieldLabel" := node_label;
          END IF;
        END IF;
        
        -- Auto-remplir les informations de variables si nodeId fourni
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
        
        -- NOUVEAU: Traduction intelligente pour les SELECT
        IF NEW."isVariable" = TRUE AND NEW."operationDetail" IS NULL THEN
          -- Vérifier si c'est un champ SELECT (type = branch)
          IF EXISTS (
            SELECT 1 FROM "TreeBranchLeafNode" 
            WHERE id = NEW."nodeId" AND type = 'branch'
          ) THEN
            -- Utiliser la résolution SELECT intelligente
            NEW."operationDetail" := json_build_object(
              'translatedValue', resolve_select_with_options(NEW."nodeId", NEW."submissionId"),
              'originalValue', NEW."value",
              'method', 'select_intelligent'
            );
          ELSE
            -- Traduction normale pour les autres champs
            NEW."operationDetail" := json_build_object(
              'translatedValue', '"' || COALESCE(var_display_name, node_label) || '" (' || COALESCE(NEW."value", '0') || ')',
              'originalValue', NEW."value",
              'method', 'standard'
            );
          END IF;
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    console.log('✅ Trigger de traduction mis à jour avec intelligence SELECT');
    
    console.log('\n5️⃣ TEST DU SYSTÈME AMÉLIORÉ...');
    
    // Tester avec le champ SELECT existant
    const testNodeId = 'node_1757366229542_r791f4qk7';
    const testSubmissionId = await prisma.treeBranchLeafSubmissionData.findFirst({
      where: { nodeId: testNodeId },
      select: { submissionId: true }
    });
    
    if (testSubmissionId) {
      console.log(`🧪 Test avec nodeId: ${testNodeId}`);
      console.log(`🧪 Test avec submissionId: ${testSubmissionId.submissionId}`);
      
      const testResult = await prisma.$queryRaw`
        SELECT resolve_select_with_options(${testNodeId}, ${testSubmissionId.submissionId}) as result;
      `;
      
      console.log(`🎯 Résultat test: ${testResult[0].result}`);
    }
    
    console.log('\n✅ SYSTÈME REMIS EN ÉTAT ET AMÉLIORÉ !');
    console.log('🎯 Les variables existantes sont utilisées');
    console.log('🎯 Les SELECT avec options sont résolus intelligemment');
    console.log('🎯 Pas de création automatique de variables inutiles');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

console.log('🚀 REMISE EN ÉTAT DU SYSTÈME...\n');
updateSystemWithSelectIntelligence();