const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createDynamicAutoVariableSystem() {
  try {
    console.log('⚙️  SYSTÈME D\'AUTO-CRÉATION DYNAMIQUE DES VARIABLES\n');
    console.log('='.repeat(60));
    
    // 1. CRÉER LA FONCTION DE DÉCOUVERTE DYNAMIQUE
    console.log('\n1️⃣ CRÉATION FONCTION DE DÉCOUVERTE DYNAMIQUE:');
    console.log('-'.repeat(50));
    
    await createDynamicDiscoveryFunction();
    
    // 2. CRÉER LA FONCTION D'AUTO-CRÉATION INTELLIGENTE
    console.log('\n2️⃣ CRÉATION FONCTION D\'AUTO-CRÉATION INTELLIGENTE:');
    console.log('-'.repeat(50));
    
    await createIntelligentAutoCreationFunction();
    
    // 3. CRÉER LE TRIGGER ÉTENDU
    console.log('\n3️⃣ CRÉATION TRIGGER ÉTENDU:');
    console.log('-'.repeat(50));
    
    await createExtendedTrigger();
    
    // 4. TESTER LE SYSTÈME
    console.log('\n4️⃣ TEST DU SYSTÈME:');
    console.log('-'.repeat(50));
    
    await testDynamicSystem();
    
    console.log('\n✅ SYSTÈME DYNAMIQUE CRÉÉ AVEC SUCCÈS !');
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    throw error;
  }
}

async function createDynamicDiscoveryFunction() {
  console.log('📜 Création de la fonction de découverte dynamique...');
  
  await prisma.$executeRaw`
    CREATE OR REPLACE FUNCTION discover_missing_variables()
    RETURNS TABLE(
      node_id TEXT,
      node_label TEXT,
      node_type TEXT,
      field_type TEXT,
      suggested_key TEXT,
      source_type TEXT,
      source_ref TEXT,
      priority TEXT,
      context TEXT
    ) AS $$
    DECLARE
      node_record RECORD;
      suggested_key TEXT;
      context_info TEXT;
      source_type_val TEXT;
      source_ref_val TEXT;
      priority_val TEXT;
    BEGIN
      -- DÉCOUVRIR TOUS LES CHAMPS SANS VARIABLES
      FOR node_record IN 
        SELECT n.id, n.label, n.type, n."fieldType", n."hasFormula", n."hasCondition", n."isVisible", n."isActive"
        FROM "TreeBranchLeafNode" n
        LEFT JOIN "TreeBranchLeafNodeVariable" v ON n.id = v."nodeId"
        WHERE v."nodeId" IS NULL 
          AND n."isActive" = true
          AND n."isVisible" = true
      LOOP
        -- GÉNÉRER EXPOSEDKEY INTELLIGENT
        suggested_key := 'AUTO_' || UPPER(REGEXP_REPLACE(COALESCE(node_record.label, 'VAR'), '[^a-zA-Z0-9]', '_', 'g'));
        suggested_key := LEFT(suggested_key, 40) || '_' || EXTRACT(epoch FROM NOW())::TEXT;
        
        -- DÉTERMINER LE TYPE DE SOURCE ET PRIORITÉ
        IF node_record.type = 'branch' THEN
          source_type_val := 'select_field';
          source_ref_val := 'select:' || node_record.id;
          priority_val := 'medium';
          context_info := 'Champ SELECT principal';
        ELSIF node_record."hasFormula" = true THEN
          source_type_val := 'formula_field';
          source_ref_val := 'formula_field:' || node_record.id;
          priority_val := 'high';
          context_info := 'Champ avec formules attachées';
        ELSIF node_record."hasCondition" = true THEN
          source_type_val := 'condition_field';
          source_ref_val := 'condition_field:' || node_record.id;
          priority_val := 'high';
          context_info := 'Champ avec conditions attachées';
        ELSIF node_record.type LIKE '%option%' THEN
          source_type_val := 'option_field';
          source_ref_val := 'option:' || node_record.id;
          priority_val := 'low';
          context_info := 'Champ d''option';
        ELSE
          source_type_val := 'standard_field';
          source_ref_val := 'field:' || node_record.id;
          priority_val := 'medium';
          context_info := 'Champ standard';
        END IF;
        
        -- RETOURNER LA DÉCOUVERTE
        node_id := node_record.id;
        node_label := node_record.label;
        node_type := node_record.type;
        field_type := node_record."fieldType";
        suggested_key := suggested_key;
        source_type := source_type_val;
        source_ref := source_ref_val;
        priority := priority_val;
        context := context_info;
        
        RETURN NEXT;
      END LOOP;
      
      RETURN;
    END;
    $$ LANGUAGE plpgsql;
  `;
  
  console.log('✅ Fonction de découverte créée');
}

async function createIntelligentAutoCreationFunction() {
  console.log('📜 Création de la fonction d\'auto-création intelligente...');
  
  await prisma.$executeRaw`
    CREATE OR REPLACE FUNCTION auto_create_all_missing_variables(submission_id TEXT)
    RETURNS INTEGER AS $$
    DECLARE
      discovery_record RECORD;
      created_count INTEGER := 0;
      unique_key TEXT;
      counter INTEGER := 1;
    BEGIN
      -- UTILISER LA FONCTION DE DÉCOUVERTE
      FOR discovery_record IN 
        SELECT * FROM discover_missing_variables()
      LOOP
        -- GÉNÉRER UN EXPOSEDKEY UNIQUE
        unique_key := discovery_record.suggested_key;
        
        -- VÉRIFIER L'UNICITÉ ET AJUSTER SI NÉCESSAIRE
        WHILE EXISTS (SELECT 1 FROM "TreeBranchLeafNodeVariable" WHERE "exposedKey" = unique_key) LOOP
          unique_key := discovery_record.suggested_key || '_' || counter;
          counter := counter + 1;
        END LOOP;
        
        BEGIN
          -- CRÉER LA VARIABLE
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
            'auto_' || discovery_record.node_id || '_' || EXTRACT(epoch FROM NOW())::TEXT,
            discovery_record.node_id,
            unique_key,
            COALESCE(discovery_record.node_label, 'Variable auto-générée'),
            CASE 
              WHEN discovery_record.field_type = 'number' THEN 'number'
              ELSE 'text'
            END,
            CASE 
              WHEN discovery_record.field_type = 'number' THEN 'unité'
              ELSE NULL
            END,
            CASE 
              WHEN discovery_record.field_type = 'number' THEN 2
              ELSE NULL
            END,
            true,
            false,
            discovery_record.source_type,
            discovery_record.source_ref,
            NOW(),
            NOW()
          );
          
          -- CRÉER L'ENREGISTREMENT DANS SUBMISSIONDATA
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
            "operationSource",
            "createdAt"
          ) VALUES (
            discovery_record.node_id,
            submission_id,
            discovery_record.node_id,
            COALESCE(discovery_record.node_label, 'Auto-généré'),
            true,
            unique_key,
            COALESCE(discovery_record.node_label, 'Variable auto-générée'),
            CASE 
              WHEN discovery_record.field_type = 'number' THEN 'unité'
              ELSE NULL
            END,
            discovery_record.node_label,
            discovery_record.source_ref,
            CASE 
              WHEN discovery_record.source_type LIKE '%formula%' THEN 'formula'::OperationSource
              WHEN discovery_record.source_type LIKE '%condition%' THEN 'condition'::OperationSource
              ELSE NULL
            END,
            NOW()
          ) ON CONFLICT ("id") DO UPDATE SET
            "isVariable" = true,
            "variableKey" = unique_key,
            "variableDisplayName" = COALESCE(discovery_record.node_label, 'Variable auto-générée'),
            "sourceRef" = discovery_record.source_ref;
          
          created_count := created_count + 1;
          
          RAISE NOTICE 'Auto-créé variable % pour node % (%), type: %', 
            unique_key, discovery_record.node_id, discovery_record.node_label, discovery_record.source_type;
            
        EXCEPTION 
          WHEN OTHERS THEN
            RAISE NOTICE 'Erreur création variable pour %: %', discovery_record.node_id, SQLERRM;
        END;
      END LOOP;
      
      RETURN created_count;
    END;
    $$ LANGUAGE plpgsql;
  `;
  
  console.log('✅ Fonction d\'auto-création intelligente créée');
}

async function createExtendedTrigger() {
  console.log('📜 Création du trigger étendu...');
  
  // Supprimer l'ancien trigger
  await prisma.$executeRaw`
    DROP TRIGGER IF EXISTS auto_create_variables_trigger ON "TreeBranchLeafSubmission";
  `;
  
  // Créer la nouvelle fonction de trigger
  await prisma.$executeRaw`
    CREATE OR REPLACE FUNCTION auto_create_variables_then_translate()
    RETURNS TRIGGER AS $$
    DECLARE
      created_count INTEGER;
      existing_count INTEGER;
    BEGIN
      RAISE NOTICE 'TRIGGER ÉTENDU: Nouveau devis créé %', NEW.id;
      
      -- 1. COMPTER LES VARIABLES EXISTANTES
      SELECT COUNT(*) INTO existing_count
      FROM "TreeBranchLeafNodeVariable";
      
      RAISE NOTICE 'Variables existantes dans le système: %', existing_count;
      
      -- 2. AUTO-DÉCOUVRIR ET CRÉER LES VARIABLES MANQUANTES
      SELECT auto_create_all_missing_variables(NEW.id) INTO created_count;
      
      RAISE NOTICE 'Variables auto-créées: %', created_count;
      
      -- 3. CRÉER LES ENREGISTREMENTS POUR TOUTES LES VARIABLES (EXISTANTES + NOUVELLES)
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
      ON CONFLICT ("id") DO UPDATE SET
        "isVariable" = true,
        "variableKey" = EXCLUDED."variableKey",
        "variableDisplayName" = EXCLUDED."variableDisplayName",
        "variableUnit" = EXCLUDED."variableUnit",
        "sourceRef" = EXCLUDED."sourceRef";
      
      -- 4. MARQUER POUR TRADUCTION
      UPDATE "TreeBranchLeafSubmissionData" 
      SET "lastResolved" = NULL
      WHERE "submissionId" = NEW.id AND "isVariable" = true;
      
      RAISE NOTICE 'TRIGGER ÉTENDU TERMINÉ: Devis % configuré avec découverte dynamique', NEW.id;
      
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `;
  
  // Créer le nouveau trigger
  await prisma.$executeRaw`
    CREATE TRIGGER auto_create_variables_trigger
        AFTER INSERT ON "TreeBranchLeafSubmission"
        FOR EACH ROW
        EXECUTE FUNCTION auto_create_variables_then_translate();
  `;
  
  console.log('✅ Trigger étendu créé');
}

async function testDynamicSystem() {
  console.log('🧪 Test du système dynamique...');
  
  try {
    // 1. Tester la fonction de découverte
    console.log('\n📋 Test de la découverte dynamique:');
    const discoveries = await prisma.$queryRaw`
      SELECT * FROM discover_missing_variables() LIMIT 10;
    `;
    
    console.log(`   🔍 Variables manquantes découvertes: ${discoveries.length}`);
    discoveries.forEach((discovery, i) => {
      console.log(`   ${i + 1}. ${discovery.node_label} (${discovery.node_type}) → ${discovery.suggested_key}`);
      console.log(`      Source: ${discovery.source_type}, Priorité: ${discovery.priority}`);
    });
    
    // 2. Créer un devis test pour déclencher le système
    console.log('\n🧪 Création d\'un devis test...');
    
    const testTree = await prisma.treeBranchLeafTree.findFirst();
    if (!testTree) {
      console.log('   ⚠️  Aucun arbre trouvé pour le test');
      return;
    }
    
    const testSubmission = await prisma.treeBranchLeafSubmission.create({
      data: {
        id: `test_dynamic_${Date.now()}`,
        treeId: testTree.id,
        status: 'draft'
      }
    });
    
    console.log(`   ✅ Devis test créé: ${testSubmission.id}`);
    
    // 3. Vérifier que les variables ont été créées
    await new Promise(resolve => setTimeout(resolve, 1000)); // Attendre le trigger
    
    const createdVariables = await prisma.treeBranchLeafSubmissionData.findMany({
      where: {
        submissionId: testSubmission.id,
        isVariable: true
      },
      select: {
        id: true,
        variableKey: true,
        variableDisplayName: true,
        sourceRef: true
      }
    });
    
    console.log(`   📊 Variables créées automatiquement: ${createdVariables.length}`);
    createdVariables.slice(0, 5).forEach((variable, i) => {
      console.log(`   ${i + 1}. ${variable.variableKey} - "${variable.variableDisplayName}"`);
      console.log(`      Source: ${variable.sourceRef}`);
    });
    
    // 4. Nettoyer le test
    await prisma.treeBranchLeafSubmission.delete({
      where: { id: testSubmission.id }
    });
    
    console.log('   🧹 Test nettoyé');
    
  } catch (error) {
    console.log(`   ❌ Erreur test: ${error.message}`);
  }
}

console.log('🚀 CRÉATION DU SYSTÈME DYNAMIQUE COMPLET...\n');

createDynamicAutoVariableSystem()
  .catch(error => {
    console.error('💥 Erreur fatale:', error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });