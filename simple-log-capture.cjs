const { spawn } = require('child_process');
const fs = require('fs');

console.log('🎯 [SIMPLE-CAPTURE] Capture simple des logs...\n');

// Créer un fichier de log
const timestamp = Date.now();
const logFile = `server-debug-${timestamp}.txt`;
const logStream = fs.createWriteStream(logFile);

console.log(`📝 Logs capturés dans: ${logFile}`);
console.log('🚀 Démarrage du serveur...\n');

// Démarrer le serveur
const server = spawn('npm', ['run', 'dev'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: true
});

let debugLogsFound = false;

// Capturer stdout
server.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(`[STDOUT] ${output}`);
  logStream.write(`[${new Date().toISOString()}] [STDOUT] ${output}`);
  
  // Détecter nos logs de debug
  if (output.includes('[DEBUG-ROUTE]') || output.includes('[DEBUG-DEEP-COPY]')) {
    console.log('🔍 *** DEBUG LOG DÉTECTÉ! ***');
    debugLogsFound = true;
  }
});

// Capturer stderr  
server.stderr.on('data', (data) => {
  const output = data.toString();
  process.stderr.write(`[STDERR] ${output}`);
  logStream.write(`[${new Date().toISOString()}] [STDERR] ${output}`);
});

// Gérer la fermeture
server.on('close', (code) => {
  console.log(`\n📋 Serveur arrêté (code: ${code})`);
  logStream.end();
  
  console.log(`📝 Logs sauvés: ${logFile}`);
  
  if (debugLogsFound) {
    console.log('✅ Logs de debug capturés!');
  } else {
    console.log('⚠️ Aucun log de debug trouvé');
    console.log('💡 Utilisez le bouton repeat dans l\'interface pour déclencher les logs');
  }
});

// Arrêter proprement avec Ctrl+C
process.on('SIGINT', () => {
  console.log('\n🛑 Arrêt en cours...');
  server.kill('SIGINT');
});

console.log('💡 Instructions:');
console.log('   1. Attendez que le serveur démarre');
console.log('   2. Utilisez le bouton repeat dans l\'interface web');
console.log('   3. Appuyez sur Ctrl+C pour arrêter la capture');
console.log('   4. Consultez le fichier de log généré\n');