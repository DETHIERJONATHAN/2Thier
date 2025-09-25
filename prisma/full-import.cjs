const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Début de l\'import des données...');
  
  const data = JSON.parse(fs.readFileSync('database-export.json', 'utf-8'));
  
  // Ordre d'import pour respecter les contraintes de clés étrangères
  const importOrder = [
    'Organization',
    'User', 
    'Role',
    'UserOrganization',
    'MailSettings',
    'Email',
    'Module',
    'OrganizationModule',
    'Permission',
    'RolePermission',
    'Lead',
    'Activity',
    'Notification',
    'ValidationRule',
    'FormulaDependency',
    // Ajouter d'autres tables selon le besoin
  ];

  let totalImported = 0;

  for (const tableName of importOrder) {
    if (data[tableName] && data[tableName].rows && Array.isArray(data[tableName].rows)) {
      try {
        console.log(`📋 Import de la table ${tableName}...`);
        
        // Vider la table d'abord
        const modelName = tableName.charAt(0).toLowerCase() + tableName.slice(1);
        
        if (prisma[modelName]) {
          await prisma[modelName].deleteMany({});
          console.log(`🗑️ Table ${tableName} vidée`);
          
          // Importer les données
          let imported = 0;
          for (const row of data[tableName].rows) {
            try {
              // Convertir les dates string en objets Date
              const processedRow = { ...row };
              for (const [key, value] of Object.entries(processedRow)) {
                if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
                  processedRow[key] = new Date(value);
                }
                // Convertir les chaînes JSON en objets/arrays si nécessaire
                if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
                  try {
                    processedRow[key] = JSON.parse(value);
                  } catch {
                    // Garder la valeur string si le parsing échoue
                  }
                }
              }
              
              await prisma[modelName].create({ data: processedRow });
              imported++;
            } catch (rowError) {
              console.warn(`⚠️ Erreur import ligne ${tableName}:`, rowError.message);
            }
          }
          
          console.log(`✅ ${tableName}: ${imported}/${data[tableName].rows.length} lignes importées`);
          totalImported += imported;
        } else {
          console.warn(`⚠️ Modèle Prisma '${modelName}' non trouvé, table ${tableName} ignorée`);
        }
        
      } catch (tableError) {
        console.error(`❌ Erreur import table ${tableName}:`, tableError.message);
      }
    } else {
      console.log(`⏭️ Table ${tableName} non trouvée ou vide dans le fichier`);
    }
  }

  console.log(`🎉 Import terminé: ${totalImported} lignes au total importées`);
}

main()
  .catch(e => { 
    console.error('❌ Erreur générale:', e); 
    process.exit(1); 
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
