const { spawn } = require('child_process');
const fs = require('fs');

async function quickLogCapture() {
  console.log('⚡ [QUICK-CAPTURE] Capture rapide des logs serveur...\n');

  // Tuer tous les processus Node.js existants
  console.log('🛑 Arrêt des processus Node.js existants...');
  try {
    const killProcess = spawn('taskkill', ['/f', '/im', 'node.exe'], { shell: true });
    await new Promise(resolve => {
      killProcess.on('close', resolve);
      setTimeout(resolve, 2000); // Timeout après 2s
    });
  } catch (e) {
    console.log('ℹ️ Aucun processus Node.js à arrêter');
  }

  console.log('🚀 Démarrage du serveur avec capture logs...');

  const serverProcess = spawn('npm', ['run', 'dev'], {
    cwd: process.cwd(),
    stdio: 'pipe',
    shell: true
  });

  const logs = [];
  let foundDebugLogs = false;

  // Capturer en temps réel
  serverProcess.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.log(`[OUT] ${line}`);
        logs.push(`[OUT] ${line}`);
        
        // Détecter nos logs de debug
        if (line.includes('[DEBUG-ROUTE]') || line.includes('[DEBUG-DEEP-COPY]')) {
          foundDebugLogs = true;
          console.log('🔍 DEBUG LOG DÉTECTÉ! ^^^');
        }
      }
    });
  });

  serverProcess.stderr.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.log(`[ERR] ${line}`);
        logs.push(`[ERR] ${line}`);
      }
    });
  });

  // Attendre le démarrage puis faire un test
  console.log('⏳ Attente 10s pour démarrage...');
  await new Promise(resolve => setTimeout(resolve, 10000));

  console.log('\n🧪 Test API maintenant...');
  
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    // Nettoyer d'abord
    await prisma.treeBranchLeafNode.deleteMany({
      where: {
        parentId: 'dd3a4c6b-26b8-40b9-aa9a-67b1e5a01e5b',
        metadata: {
          path: ['sourceTemplateId'],
          equals: '9c9f42b2-e0df-4726-8a81-997c0dee71bc'
        }
      }
    });
    
    console.log('🧹 Base nettoyée');
    
    // Maintenant faire l'appel API
    const fetch = require('node-fetch').default || require('node-fetch');
    
    const response = await fetch('http://localhost:3001/api/treebranchleaf/nodes/dd3a4c6b-26b8-40b9-aa9a-67b1e5a01e5b/duplicate-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateNodeIds: ['9c9f42b2-e0df-4726-8a81-997c0dee71bc']
      })
    });
    
    const result = await response.json();
    console.log(`📊 Résultat: ${JSON.stringify(result, null, 2)}`);
    
    await prisma.$disconnect();
    
  } catch (testError) {
    console.log(`❌ Erreur test: ${testError.message}`);
  }

  // Attendre encore 5s pour capturer les logs de traitement
  console.log('⏳ Capture logs traitement (5s)...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Arrêter et analyser
  serverProcess.kill();
  
  console.log('\n📋 ANALYSE LOGS:');
  
  const debugRouteLogs = logs.filter(log => log.includes('[DEBUG-ROUTE]'));
  const debugDeepCopyLogs = logs.filter(log => log.includes('[DEBUG-DEEP-COPY]'));
  
  console.log('\n🔍 DEBUG-ROUTE logs:');
  debugRouteLogs.forEach(log => console.log(`  ${log}`));
  
  console.log('\n🔍 DEBUG-DEEP-COPY logs:');  
  debugDeepCopyLogs.forEach(log => console.log(`  ${log}`));
  
  if (!foundDebugLogs) {
    console.log('\n⚠️ AUCUN LOG DE DEBUG TROUVÉ!');
    console.log('   → Le serveur n\'utilise pas la version compilée avec les logs');
    console.log('   → Essayez: npm run build:server puis relancez ce script');
  }
  
  // Sauvegarder tous les logs
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFile = `quick-logs-${timestamp}.txt`;
  fs.writeFileSync(logFile, logs.join('\n'));
  console.log(`\n📝 Logs sauvés: ${logFile}`);
}

quickLogCapture().catch(console.error);