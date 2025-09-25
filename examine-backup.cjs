const fs = require('fs');

console.log('🔍 Examen de la structure du backup...');

const data = JSON.parse(fs.readFileSync('sauvegarde-prisma/backup-complet-2025-09-04T23-54-25-574Z-simple.json', 'utf8'));

console.log('📊 Tables trouvées:');
Object.keys(data).forEach(key => {
  console.log(`  ${key}: ${Array.isArray(data[key]) ? data[key].length : 'non-array'} enregistrements`);
});

// Examiner les utilisateurs
if (data.user && data.user.length > 0) {
  console.log('\n👤 Exemple d\'utilisateur:');
  console.log(JSON.stringify(data.user[0], null, 2));
}

// Examiner les organisations
if (data.organization && data.organization.length > 0) {
  console.log('\n🏢 Exemple d\'organisation:');
  console.log(JSON.stringify(data.organization[0], null, 2));
}
