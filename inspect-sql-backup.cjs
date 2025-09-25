const fs = require('fs');

console.log('🔍 INSPECTION DIRECTE DU BACKUP SQL');
console.log('==================================');

try {
  const sqlFile = 'sauvegarde-prisma/crm-backup-2025-09-01_22-15-45-343Z.sql';
  const content = fs.readFileSync(sqlFile, 'utf8');
  const lines = content.split('\n');
  
  console.log('📄 PREMIÈRES 20 LIGNES:');
  console.log('------------------------');
  lines.slice(0, 20).forEach((line, i) => {
    console.log(`${String(i+1).padStart(3)}: ${line.substring(0, 80)}`);
  });
  
  console.log('\n📄 LIGNES 500-520 (milieu):');
  console.log('---------------------------');
  lines.slice(500, 520).forEach((line, i) => {
    console.log(`${String(i+501).padStart(3)}: ${line.substring(0, 80)}`);
  });
  
  console.log('\n📄 DERNIÈRES 20 LIGNES:');
  console.log('------------------------');
  lines.slice(-20).forEach((line, i) => {
    console.log(`${String(lines.length-20+i+1).padStart(3)}: ${line.substring(0, 80)}`);
  });
  
  // Chercher des patterns de données
  console.log('\n🔍 RECHERCHE DE PATTERNS:');
  console.log('-------------------------');
  
  const patterns = [
    'INSERT',
    'VALUES',
    'COPY',
    'FROM stdin',
    '\\.',
    'CREATE TABLE',
    'DROP TABLE',
    'email',
    'user',
    'organization'
  ];
  
  patterns.forEach(pattern => {
    const matches = lines.filter(line => line.toLowerCase().includes(pattern.toLowerCase()));
    if (matches.length > 0) {
      console.log(`🎯 "${pattern}": ${matches.length} occurrences`);
      if (matches.length <= 3) {
        matches.forEach(match => {
          console.log(`    → ${match.substring(0, 60)}...`);
        });
      }
    }
  });
  
} catch (error) {
  console.error('❌ Erreur:', error.message);
}
