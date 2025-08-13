const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 IMPORT COMPLET - TOUTES LES TABLES');
  console.log('=' .repeat(50));
  
  const data = JSON.parse(fs.readFileSync('database-export.json', 'utf-8'));
  
  // Ordre d'import pour respecter les contraintes de clés étrangères
  // Tables de base d'abord, puis tables avec références
  const importOrder = [
    // Tables de base (pas de dépendances)
    'Organization',
    'User', 
    'FieldType',
    'Module',
    
    // Tables avec organisation/user comme FK
    'Role',
    'UserOrganization', 
    'OrganizationModuleStatus',
    'OrganizationRoleStatus',
    'MailSettings',
    'Email',
    'Permission',
    'RolePermission',
    'UserPermission',
    'Lead',
    'Activity',
    'Notification',
    'Invitation',
    'UserService',
    'Informations',
    
    // Structure des formulaires (hiérarchique)
    'Block',
    'Section', 
    'Field',
    'FieldOption',
    'FieldCondition',
    'FieldDependency', 
    'FieldFormula',
    'FieldModule',
    'FieldSubField',
    'FieldSubFieldOption',
    'FieldValidation',
    
    // Soumissions et validations
    'FormSubmission',
    'FormSubmissionData',
    'ValidationRule',
    'FormulaDependency',
  ];

  let totalImported = 0;
  let totalExpected = 0;
  const importResults = {};

  // Calculer le total attendu
  for (const tableName of Object.keys(data)) {
    if (data[tableName] && data[tableName].rows && Array.isArray(data[tableName].rows)) {
      totalExpected += data[tableName].rows.length;
    }
  }
  
  console.log(`📊 Total lignes à importer: ${totalExpected}`);
  console.log('');

  for (const tableName of importOrder) {
    if (data[tableName] && data[tableName].rows && Array.isArray(data[tableName].rows)) {
      try {
        console.log(`📋 Import: ${tableName} (${data[tableName].rows.length} lignes)...`);
        
        // Conversion nom table -> nom modèle Prisma
        let modelName = tableName.charAt(0).toLowerCase() + tableName.slice(1);
        
        // Corrections spécifiques pour les noms de modèles
        const modelNameMapping = {
          'organizationModuleStatus': 'organizationModuleStatus',
          'organizationRoleStatus': 'organizationRoleStatus', 
          'userOrganization': 'userOrganization',
          'rolePermission': 'rolePermission',
          'userPermission': 'userPermission',
          'mailSettings': 'mailSettings',
          'fieldType': 'fieldType',
          'fieldOption': 'fieldOption',
          'fieldCondition': 'fieldCondition',
          'fieldDependency': 'fieldDependency',
          'fieldFormula': 'fieldFormula',
          'fieldModule': 'fieldModule',
          'fieldSubField': 'fieldSubField',
          'fieldSubFieldOption': 'fieldSubFieldOption',
          'fieldValidation': 'fieldValidation',
          'formSubmission': 'formSubmission',
          'formSubmissionData': 'formSubmissionData',
          'validationRule': 'validationRule',
          'formulaDependency': 'formulaDependency',
          'userService': 'userService',
        };
        
        if (modelNameMapping[modelName]) {
          modelName = modelNameMapping[modelName];
        }
        
        if (prisma[modelName]) {
          // Vider la table d'abord
          await prisma[modelName].deleteMany({});
          console.log(`  🗑️ Table ${tableName} vidée`);
          
          // Importer les données ligne par ligne
          let imported = 0;
          let errors = 0;
          
          for (const row of data[tableName].rows) {
            try {
              // Traitement des données
              const processedRow = { ...row };
              
              for (const [key, value] of Object.entries(processedRow)) {
                // Conversion des dates ISO string vers Date
                if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
                  processedRow[key] = new Date(value);
                }
                
                // Conversion des JSON strings vers objects/arrays
                if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
                  try {
                    processedRow[key] = JSON.parse(value);
                  } catch {
                    // Garder la valeur string si le parsing JSON échoue
                  }
                }
                
                // Conversion des "null" string vers null
                if (value === "null") {
                  processedRow[key] = null;
                }
                
                // Conversion des boolean strings
                if (value === "true") processedRow[key] = true;
                if (value === "false") processedRow[key] = false;
              }
              
              await prisma[modelName].create({ data: processedRow });
              imported++;
              
            } catch (rowError) {
              errors++;
              console.warn(`    ⚠️ Erreur ligne ${imported + errors}: ${rowError.message}`);
            }
          }
          
          const successRate = ((imported / data[tableName].rows.length) * 100).toFixed(1);
          console.log(`  ✅ ${imported}/${data[tableName].rows.length} importées (${successRate}%)`);
          
          if (errors > 0) {
            console.log(`  ❌ ${errors} erreurs`);
          }
          
          totalImported += imported;
          importResults[tableName] = { imported, total: data[tableName].rows.length, errors };
          
        } else {
          console.warn(`  ⚠️ Modèle Prisma '${modelName}' non trouvé, table ${tableName} ignorée`);
          importResults[tableName] = { imported: 0, total: data[tableName].rows.length, errors: 0, skipped: true };
        }
        
      } catch (tableError) {
        console.error(`  ❌ Erreur table ${tableName}: ${tableError.message}`);
        importResults[tableName] = { imported: 0, total: data[tableName].rows.length, errors: 1 };
      }
      
      console.log(''); // Ligne vide pour la lisibilité
    }
  }

  // Import des tables restantes (non listées dans importOrder)
  const processedTables = new Set(importOrder);
  const remainingTables = Object.keys(data).filter(table => !processedTables.has(table));
  
  if (remainingTables.length > 0) {
    console.log('🔍 TABLES SUPPLÉMENTAIRES TROUVÉES:');
    for (const tableName of remainingTables) {
      if (data[tableName] && data[tableName].rows && Array.isArray(data[tableName].rows)) {
        console.log(`  📦 ${tableName}: ${data[tableName].rows.length} lignes (non importée - modèle manquant?)`);
      }
    }
    console.log('');
  }

  // Résumé final
  console.log('🎯 RÉSUMÉ FINAL');
  console.log('=' .repeat(50));
  console.log(`📊 Total importé: ${totalImported}/${totalExpected} lignes`);
  console.log(`📈 Taux de réussite: ${((totalImported / totalExpected) * 100).toFixed(1)}%`);
  console.log('');
  
  console.log('📋 Détail par table:');
  Object.entries(importResults).forEach(([table, result]) => {
    const status = result.skipped ? '⏭️' : result.imported === result.total ? '✅' : result.imported > 0 ? '⚠️' : '❌';
    const details = result.skipped ? 'ignorée' : `${result.imported}/${result.total}`;
    console.log(`  ${status} ${table}: ${details}`);
  });
}

main()
  .catch(e => { 
    console.error('❌ ERREUR GÉNÉRALE:', e); 
    process.exit(1); 
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('🔌 Connexion Prisma fermée');
  });
