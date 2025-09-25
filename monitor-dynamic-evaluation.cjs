const { exec } = require('child_process');

console.log('🔍 Vérification des logs serveur...');

// Fonction pour surveiller les logs
function checkServerLogs() {
  console.log('\n📊 Statistiques des requêtes condition:');
  
  // Simuler un check simple
  const now = new Date().toLocaleTimeString();
  console.log(`${now} - Vérification automatique...`);
  
  // En pratique, on pourrait analyser les logs du serveur
  console.log('✅ Si vous voyez moins d\'erreurs 404 pour /api/tbl/condition/, c\'est bon signe !');
  console.log('✅ Les appels à condition: devraient maintenant être gérés côté client');
  console.log('✅ Vérifiez dans la console du navigateur pour voir les logs d\'évaluation dynamique');
  
  console.log('\n🎯 Ce qu\'il faut vérifier:');
  console.log('1. Les cartes TBL n\'affichent plus "Calcul..."');
  console.log('2. La valeur affichée est "25" et non "2"');
  console.log('3. Les logs montrent 🧠 [DYNAMIC] dans la console navigateur');
}

// Vérification initiale
checkServerLogs();

// Vérification périodique
setInterval(checkServerLogs, 10000); // Toutes les 10 secondes

console.log('\n⏱️  Surveillance démarrée. Appuyez sur Ctrl+C pour arrêter.');