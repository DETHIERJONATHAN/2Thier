/**
 * 🔍 Script de comparaison entre anciens champs (qui fonctionnent) et nouveaux (qui ne fonctionnent pas)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function compareFields() {
  try {
    console.log('\n🔍 ===== COMPARAISON ANCIENS vs NOUVEAUX CHAMPS =====\n');

    // 1. Chercher un ancien champ avec formule qui FONCTIONNE
    console.log('1️⃣ Recherche d\'un ANCIEN champ avec formule qui fonctionne...\n');
    const oldWorkingFields = await prisma.treebranchleafNode.findMany({
      where: {
        type: 'field',
        AND: [
          {
            OR: [
              { capabilities: { path: ['formula'], not: null } },
              { capabilities: { path: ['condition'], not: null } },
            ],
          },
        ],
      },
      orderBy: {
        createdAt: 'asc', // Les plus anciens d'abord
      },
      take: 3,
    });

    console.log(`✅ Trouvé ${oldWorkingFields.length} anciens champs:\n`);
    oldWorkingFields.forEach((field, i) => {
      console.log(`\n--- ANCIEN CHAMP ${i + 1} ---`);
      console.log('ID:', field.id);
      console.log('Label:', field.label);
      console.log('Créé le:', field.createdAt);
      console.log('fieldConfig:', JSON.stringify(field.fieldConfig, null, 2));
      console.log('capabilities:', JSON.stringify(field.capabilities, null, 2));
      console.log('properties:', JSON.stringify(field.properties, null, 2));
    });

    // 2. Chercher les nouveaux champs avec formule qui NE FONCTIONNENT PAS
    console.log('\n\n2️⃣ Recherche des NOUVEAUX champs avec formule qui ne fonctionnent pas...\n');
    const newBrokenFields = await prisma.treebranchleafNode.findMany({
      where: {
        type: 'field',
        AND: [
          {
            OR: [
              { capabilities: { path: ['formula'], not: null } },
              { capabilities: { path: ['condition'], not: null } },
            ],
          },
        ],
      },
      orderBy: {
        createdAt: 'desc', // Les plus récents d'abord
      },
      take: 3,
    });

    console.log(`✅ Trouvé ${newBrokenFields.length} nouveaux champs:\n`);
    newBrokenFields.forEach((field, i) => {
      console.log(`\n--- NOUVEAU CHAMP ${i + 1} ---`);
      console.log('ID:', field.id);
      console.log('Label:', field.label);
      console.log('Créé le:', field.createdAt);
      console.log('fieldConfig:', JSON.stringify(field.fieldConfig, null, 2));
      console.log('capabilities:', JSON.stringify(field.capabilities, null, 2));
      console.log('properties:', JSON.stringify(field.properties, null, 2));
    });

    // 3. Comparer les différences
    console.log('\n\n3️⃣ ===== ANALYSE DES DIFFÉRENCES =====\n');
    
    if (oldWorkingFields.length > 0 && newBrokenFields.length > 0) {
      const oldField = oldWorkingFields[0];
      const newField = newBrokenFields[0];

      console.log('🔍 Comparaison du plus ancien vs le plus récent:\n');

      // Comparer fieldConfig
      console.log('📋 fieldConfig:');
      console.log('  ANCIEN:', oldField.fieldConfig ? 'Présent' : 'Absent');
      console.log('  NOUVEAU:', newField.fieldConfig ? 'Présent' : 'Absent');
      
      if (oldField.fieldConfig && newField.fieldConfig) {
        const oldKeys = Object.keys(oldField.fieldConfig);
        const newKeys = Object.keys(newField.fieldConfig);
        console.log('  Clés dans ANCIEN:', oldKeys);
        console.log('  Clés dans NOUVEAU:', newKeys);
      }

      // Comparer capabilities
      console.log('\n🎯 capabilities:');
      console.log('  ANCIEN:', oldField.capabilities ? 'Présent' : 'Absent');
      console.log('  NOUVEAU:', newField.capabilities ? 'Présent' : 'Absent');
      
      if (oldField.capabilities && newField.capabilities) {
        const oldKeys = Object.keys(oldField.capabilities);
        const newKeys = Object.keys(newField.capabilities);
        console.log('  Clés dans ANCIEN:', oldKeys);
        console.log('  Clés dans NOUVEAU:', newKeys);
      }

      // Comparer properties
      console.log('\n⚙️ properties:');
      console.log('  ANCIEN:', oldField.properties ? 'Présent' : 'Absent');
      console.log('  NOUVEAU:', newField.properties ? 'Présent' : 'Absent');
      
      if (oldField.properties && newField.properties) {
        const oldKeys = Object.keys(oldField.properties);
        const newKeys = Object.keys(newField.properties);
        console.log('  Clés dans ANCIEN:', oldKeys);
        console.log('  Clés dans NOUVEAU:', newKeys);
      }

      // Vérifier les différences spécifiques
      console.log('\n🔎 Différences spécifiques détectées:');
      
      // displayConfig ?
      const oldHasDisplayConfig = oldField.fieldConfig?.displayConfig;
      const newHasDisplayConfig = newField.fieldConfig?.displayConfig;
      if (oldHasDisplayConfig && !newHasDisplayConfig) {
        console.log('  ⚠️ ANCIEN a displayConfig, NOUVEAU n\'en a pas !');
      } else if (!oldHasDisplayConfig && newHasDisplayConfig) {
        console.log('  ⚠️ NOUVEAU a displayConfig, ANCIEN n\'en a pas !');
      }

      // Type de champ ?
      const oldFieldType = oldField.fieldConfig?.type;
      const newFieldType = newField.fieldConfig?.type;
      if (oldFieldType !== newFieldType) {
        console.log(`  ⚠️ Type différent: ANCIEN="${oldFieldType}", NOUVEAU="${newFieldType}"`);
      }
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

compareFields();
