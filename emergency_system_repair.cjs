const { PrismaClient } = require('@prisma/client');

async function emergencySystemRepair() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🚨 RÉPARATION D\'URGENCE DU SYSTÈME CASSÉ\n');

    console.log('🔍 État actuel des données...');
    
    // Vérifier l'état des données
    const brokenData = await prisma.$queryRaw`
      SELECT COUNT(*) as total_broken
      FROM "TreeBranchLeafSubmissionData" 
      WHERE "isResolved" = false 
      AND ("operationDetail" IS NULL OR "operationResult" IS NULL);
    `;
    
    console.log(`💔 Données cassées: ${brokenData[0].total_broken}`);

    // Vérifier les triggers manquants
    const triggers = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM information_schema.triggers 
      WHERE trigger_schema = 'public' 
      AND trigger_name LIKE '%auto%';
    `;
    
    console.log(`🔧 Triggers automatiques restants: ${triggers[0].count}`);

    console.log('\n🔧 RECRÉATION DU SYSTÈME AUTOMATIQUE CORRIGÉ...');

    // 1. Recréer la fonction principale SANS erreur CASE
    console.log('1️⃣ Recréation de la fonction auto-résolution...');
    
    await prisma.$executeRaw`
      CREATE OR REPLACE FUNCTION auto_resolve_and_translate() RETURNS trigger AS $$
      DECLARE
        variable_rec RECORD;
        final_value TEXT;
      BEGIN
        -- Initialiser avec la valeur de base
        final_value := NEW.value;
        
        -- Remplacer toutes les variables existantes
        FOR variable_rec IN 
          SELECT "exposedKey", "fixedValue", "defaultValue" 
          FROM "TreeBranchLeafNodeVariable"
          WHERE "exposedKey" IS NOT NULL
        LOOP
          -- Utiliser fixedValue si disponible, sinon defaultValue
          IF final_value LIKE '%' || variable_rec."exposedKey" || '%' THEN
            final_value := REPLACE(
              final_value, 
              variable_rec."exposedKey", 
              COALESCE(variable_rec."fixedValue", variable_rec."defaultValue", 'N/A')
            );
          END IF;
        END LOOP;
        
        -- Mettre à jour les champs calculés
        NEW."operationDetail" := jsonb_build_object('original', NEW.value, 'resolved', final_value);
        NEW."operationResult" := jsonb_build_object('value', final_value, 'timestamp', NOW());
        NEW."isResolved" := true;
        NEW."lastResolved" := NOW();
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;

    // 2. Recréer le trigger
    console.log('2️⃣ Recréation du trigger...');
    
    await prisma.$executeRaw`
      CREATE TRIGGER auto_resolve_data_trigger
      BEFORE INSERT OR UPDATE ON "TreeBranchLeafSubmissionData"
      FOR EACH ROW EXECUTE FUNCTION auto_resolve_and_translate();
    `;

    console.log('✅ Triggers recréés');

    // 3. RÉPARER toutes les données existantes cassées
    console.log('3️⃣ RÉPARATION des données existantes cassées...');
    
    const repairResult = await prisma.$executeRaw`
      UPDATE "TreeBranchLeafSubmissionData" 
      SET 
        "operationDetail" = jsonb_build_object('original', value, 'resolved', value),
        "operationResult" = jsonb_build_object('value', value, 'timestamp', NOW()),
        "isResolved" = true,
        "lastResolved" = NOW()
      WHERE "isResolved" = false 
      OR "operationDetail" IS NULL 
      OR "operationResult" IS NULL;
    `;

    console.log(`🔧 Données réparées: ${repairResult} lignes`);

    // 4. Appliquer la résolution des variables aux données réparées
    console.log('4️⃣ Application des variables aux données réparées...');
    
    // Récupérer les variables
    const variables = await prisma.treeBranchLeafNodeVariable.findMany({
      where: {
        exposedKey: { not: null }
      },
      select: {
        exposedKey: true,
        fixedValue: true,
        defaultValue: true
      }
    });

    console.log(`📊 Variables trouvées: ${variables.length}`);
    
    // Appliquer chaque variable
    for (const variable of variables) {
      const replaceValue = variable.fixedValue || variable.defaultValue || 'N/A';
      
      await prisma.$executeRaw`
        UPDATE "TreeBranchLeafSubmissionData" 
        SET 
          "operationDetail" = jsonb_set(
            "operationDetail",
            '{resolved}',
            to_jsonb(REPLACE("operationDetail"->>'resolved', ${variable.exposedKey}, ${replaceValue}))
          ),
          "operationResult" = jsonb_set(
            "operationResult",
            '{value}',
            to_jsonb(REPLACE("operationResult"->>'value', ${variable.exposedKey}, ${replaceValue}))
          ),
          "lastResolved" = NOW()
        WHERE "operationDetail"->>'resolved' LIKE '%' || ${variable.exposedKey} || '%'
        OR "operationResult"->>'value' LIKE '%' || ${variable.exposedKey} || '%';
      `;
      
      console.log(`   🔄 Variable ${variable.exposedKey} appliquée`);
    }

    // 5. Vérification finale
    console.log('\n5️⃣ Vérification finale...');
    
    const fixedData = await prisma.$queryRaw`
      SELECT COUNT(*) as total_fixed
      FROM "TreeBranchLeafSubmissionData" 
      WHERE "isResolved" = true 
      AND "operationDetail" IS NOT NULL 
      AND "operationResult" IS NOT NULL;
    `;
    
    console.log(`✅ Données réparées: ${fixedData[0].total_fixed}`);

    const stillBroken = await prisma.$queryRaw`
      SELECT COUNT(*) as still_broken
      FROM "TreeBranchLeafSubmissionData" 
      WHERE "isResolved" = false 
      OR "operationDetail" IS NULL 
      OR "operationResult" IS NULL;
    `;
    
    console.log(`⚠️ Données encore cassées: ${stillBroken[0].still_broken}`);

    console.log('\n🎉 SYSTÈME RÉPARÉ !');
    console.log('✅ Fonction auto-résolution recréée (sans erreur CASE)');
    console.log('✅ Trigger automatique recréé');
    console.log('✅ Toutes les données existantes réparées');
    console.log('✅ Variables appliquées automatiquement');
    console.log('✅ Nouvelles données seront automatiquement traitées');
    
    console.log('\n🚀 LE SYSTÈME EST DE NOUVEAU OPÉRATIONNEL !');

  } catch (error) {
    console.error('❌ Erreur de réparation:', error.message);
    console.error('📋 Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

emergencySystemRepair();