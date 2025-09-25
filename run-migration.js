/**
 * 🚀 Script de lancement de la migration sécurisée
 * 
 * Utilisation:
 * node run-migration.js
 */

const { SecureIDMigration } = require('./migration-ids-secure');

async function main() {
  console.log('🛡️  DÉMARRAGE DE LA MIGRATION SÉCURISÉE');
  console.log('======================================\n');
  
  const migration = new SecureIDMigration();
  
  try {
    // Exécute la migration complète
    await migration.run();
    
    console.log('\n🎉 MIGRATION TERMINÉE AVEC SUCCÈS!');
    console.log('\nProchaines étapes:');
    console.log('1. ✅ Vérifier le rapport de migration');
    console.log('2. 🔗 Connecter TBL au système TBL Bridge'); 
    console.log('3. 🧪 Tester la liaison des données');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n💥 ÉCHEC DE LA MIGRATION:', error);
    console.log('\n🔄 Les backups sont disponibles pour rollback');
    
    process.exit(1);
  }
}

// Vérification de sécurité
console.log('⚠️  AVERTISSEMENT DE SÉCURITÉ');
console.log('============================');
console.log('Cette migration va modifier TOUS les IDs dans la base de données.');
console.log('Un backup automatique sera créé avant toute modification.');
console.log('');
console.log('Voulez-vous continuer? (Ctrl+C pour annuler)');
console.log('Appuyez sur Entrée pour continuer...');

// Attend la confirmation en production
if (process.env.NODE_ENV === 'production') {
  process.stdin.once('data', () => {
    main();
  });
} else {
  // En développement, lance directement
  main();
}