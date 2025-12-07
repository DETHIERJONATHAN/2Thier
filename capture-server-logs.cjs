const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function captureServerLogsAndTest() {
  console.log('🎯 [LOG-CAPTURE] Capture des logs serveur et test automatique...\n');

  // 1. Créer un fichier de log avec timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFile = path.join(__dirname, `server-logs-${timestamp}.txt`);
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });

  console.log(`📝 Logs capturés dans: ${logFile}`);

  // 2. Démarrer le serveur avec capture des logs
  console.log('🚀 Démarrage du serveur...');
  
  const serverProcess = spawn('npm', ['run', 'dev'], {
    cwd: __dirname,
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true
  });

  // 3. Capturer stdout et stderr
  serverProcess.stdout.on('data', (data) => {
    const logLine = data.toString();
    console.log(`[SERVER-OUT] ${logLine.trim()}`);
    logStream.write(`[${new Date().toISOString()}] [STDOUT] ${logLine}`);
  });

  serverProcess.stderr.on('data', (data) => {
    const logLine = data.toString();
    console.log(`[SERVER-ERR] ${logLine.trim()}`);
    logStream.write(`[${new Date().toISOString()}] [STDERR] ${logLine}`);
  });

  // 4. Attendre que le serveur soit prêt
  console.log('⏳ Attente du démarrage du serveur...');
  
  let serverReady = false;
  const checkServerReady = () => {
    return new Promise((resolve) => {
      const http = require('http');
      const req = http.get('http://localhost:3001/health', { timeout: 1000 }, (res) => {
        if (res.statusCode === 200 || res.statusCode === 404) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    });
  };

  // Attendre max 30 secondes
  for (let i = 0; i < 30; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (await checkServerReady()) {
      serverReady = true;
      console.log('✅ Serveur prêt !');
      break;
    }
    console.log(`⏳ Tentative ${i+1}/30...`);
  }

  if (!serverReady) {
    console.log('❌ Serveur non accessible après 30s');
    serverProcess.kill();
    logStream.end();
    return;
  }

  // 5. Effectuer le test API avec capture des logs
  console.log('\n🧪 Test de l\'API duplicate-templates...');
  logStream.write(`\n[${new Date().toISOString()}] [TEST] Début test API duplicate-templates\n`);

  try {
    const fetch = require('node-fetch').default || require('node-fetch');
    
    const apiUrl = 'http://localhost:3001/api/treebranchleaf/nodes/dd3a4c6b-26b8-40b9-aa9a-67b1e5a01e5b/duplicate-templates';
    const payload = {
      templateNodeIds: ['9c9f42b2-e0df-4726-8a81-997c0dee71bc']
    };

    console.log(`📡 POST ${apiUrl}`);
    logStream.write(`[${new Date().toISOString()}] [TEST] POST ${apiUrl}\n`);
    logStream.write(`[${new Date().toISOString()}] [TEST] Payload: ${JSON.stringify(payload)}\n`);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fake-token'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    
    console.log(`📊 Réponse (${response.status}):`, JSON.stringify(result, null, 2));
    logStream.write(`[${new Date().toISOString()}] [TEST] Response ${response.status}: ${JSON.stringify(result)}\n`);

    // 6. Attendre un peu pour capturer tous les logs du traitement
    console.log('⏳ Attente des logs de traitement (5s)...');
    await new Promise(resolve => setTimeout(resolve, 5000));

  } catch (apiError) {
    console.log(`❌ Erreur API: ${apiError.message}`);
    logStream.write(`[${new Date().toISOString()}] [TEST] API Error: ${apiError.message}\n`);
  }

  // 7. Arrêter le serveur et fermer les logs
  console.log('\n🛑 Arrêt du serveur...');
  serverProcess.kill();
  logStream.end();

  // 8. Analyser les logs capturés
  console.log('\n📋 ANALYSE DES LOGS CAPTURÉS:');
  
  try {
    const logContent = fs.readFileSync(logFile, 'utf8');
    
    // Chercher nos logs de debug spécifiques
    const debugRouteLines = logContent.split('\n').filter(line => 
      line.includes('[DEBUG-ROUTE]')
    );
    
    const debugDeepCopyLines = logContent.split('\n').filter(line => 
      line.includes('[DEBUG-DEEP-COPY]')
    );

    console.log('\n🔍 Logs de debug ROUTE:');
    debugRouteLines.forEach(line => console.log(line));

    console.log('\n🔍 Logs de debug DEEP-COPY:');
    debugDeepCopyLines.forEach(line => console.log(line));

    // Chercher les erreurs
    const errorLines = logContent.split('\n').filter(line => 
      line.toLowerCase().includes('error') || 
      line.toLowerCase().includes('erreur') ||
      line.includes('❌')
    );

    if (errorLines.length > 0) {
      console.log('\n❌ Erreurs détectées:');
      errorLines.forEach(line => console.log(line));
    }

    // Analyser si le problème "-2" est présent
    const suffix2Lines = logContent.split('\n').filter(line => 
      line.includes('copySuffix: 2') || 
      line.includes('suffixe -2') ||
      line.includes('toiture-2')
    );

    if (suffix2Lines.length > 0) {
      console.log('\n🚨 PROBLÈME "-2" DÉTECTÉ:');
      suffix2Lines.forEach(line => console.log(line));
    } else {
      console.log('\n✅ Aucun problème "-2" détecté dans les logs');
    }

    console.log(`\n📝 Logs complets sauvés dans: ${logFile}`);
    console.log(`📖 Pour consulter: notepad "${logFile}"`);

  } catch (readError) {
    console.log(`❌ Erreur lecture logs: ${readError.message}`);
  }
}

captureServerLogsAndTest().catch(console.error);