// Script pour surveiller les logs de duplication en temps réel
const { spawn } = require('child_process');

console.log('🔍 === SURVEILLANCE DUPLICATION ACTIVE ===');
console.log('📋 En attente de l\'action "Ajouter Versant"...');
console.log('🎯 Filtrage des logs pour /duplicate-templates et erreurs...\n');

// Lancer les logs en temps réel
const logProcess = spawn('npm', ['run', 'dev'], { cwd: process.cwd() });

logProcess.stdout.on('data', (data) => {
  const output = data.toString();
  
  // Filtrer pour les logs pertinents à la duplication
  if (output.includes('duplicate-templates') || 
      output.includes('deepCopyNodeInternal') ||
      output.includes('copyVariableWithCapacities') ||
      output.includes('TreeBranchLeafNode') ||
      output.includes('ERROR') ||
      output.includes('ERRO') ||
      output.includes('FAIL') ||
      output.includes('prisma:error') ||
      output.includes('Transaction failed') ||
      output.includes('rollback')) {
    
    console.log(`🚨 [DUPLICATION] ${new Date().toLocaleTimeString()}`);
    console.log(output);
    console.log('---'.repeat(20));
  }
});

logProcess.stderr.on('data', (data) => {
  console.log(`❌ [ERROR] ${data.toString()}`);
});

process.on('SIGINT', () => {
  console.log('\n✅ Surveillance terminée');
  logProcess.kill();
  process.exit(0);
});