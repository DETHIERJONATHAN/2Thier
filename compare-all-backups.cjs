const fs = require('fs');

console.log('🔍 ANALYSE DE TOUS LES BACKUPS DISPONIBLES');
console.log('==========================================');

const backupFiles = [
  'backup-complet-2025-09-04T23-54-25-574Z-simple.json',
  'backup-complet-2025-09-04T23-54-25-574Z-compact.json',
  'backup-ultra-secure-2025-09-01T22-30-07-637Z-complet.json',
  'backup-ultra-secure-2025-09-01T22-30-07-637Z-simple.json',
  'backup-ultra-secure-2025-09-01T22-46-05-151Z-complet.json',
  'backup-ultra-secure-2025-09-01T22-46-05-151Z-simple.json',
  'donnees-prisma-2025-09-01T22-20-15-186Z.json',
  'donnees-prisma-2025-09-01T22-23-26-391Z.json',
  'donnees-prisma-2025-09-01T22-23-43-693Z.json'
];

let bestBackup = null;
let maxRecords = 0;

for (const fileName of backupFiles) {
  const filePath = `sauvegarde-prisma/${fileName}`;
  
  try {
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      let totalRecords = 0;
      
      console.log(`\n📁 ${fileName}`);
      console.log('---'.repeat(20));
      
      Object.keys(data).forEach(table => {
        const count = data[table] ? data[table].length : 0;
        totalRecords += count;
        if (count > 0) {
          console.log(`   📋 ${table}: ${count} enregistrements`);
        }
      });
      
      console.log(`   📊 TOTAL: ${totalRecords} enregistrements`);
      
      if (totalRecords > maxRecords) {
        maxRecords = totalRecords;
        bestBackup = fileName;
      }
    } else {
      console.log(`❌ ${fileName} - fichier introuvable`);
    }
  } catch (error) {
    console.log(`❌ ${fileName} - erreur: ${error.message}`);
  }
}

console.log('\n🏆 MEILLEUR BACKUP TROUVÉ:');
console.log('==========================');
console.log(`📁 ${bestBackup}`);
console.log(`📊 ${maxRecords} enregistrements au total`);
