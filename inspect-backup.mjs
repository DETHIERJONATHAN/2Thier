import fs from 'fs';

try {
  console.log('Lecture du fichier de sauvegarde...');
  const content = fs.readFileSync('backup-complete-27-08-2025-1756252940911.json', 'utf8');
  
  console.log('Taille du fichier:', content.length, 'caractères');
  console.log('Premiers 1000 caractères:');
  console.log(content.substring(0, 1000));
  
  console.log('\n\nDerniers 1000 caractères:');
  console.log(content.substring(content.length - 1000));
  
  // Essayer de parser
  try {
    const backupData = JSON.parse(content);
    console.log('\n\n=== STRUCTURE DU JSON ===');
    console.log('Type:', typeof backupData);
    console.log('Est un array?', Array.isArray(backupData));
    console.log('Clés principales:', Object.keys(backupData));
  } catch (parseError) {
    console.error('Erreur de parsing JSON:', parseError.message);
  }
  
} catch (error) {
  console.error('Erreur:', error.message);
}
