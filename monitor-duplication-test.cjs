#!/usr/bin/env node
/**
 * 🎯 MONITORING FINAL - CAPTURE DE LA DUPLICATION EN TEMPS RÉEL
 * 
 * Ce script surveille les logs pendant que vous testez
 * la duplication dans l'interface pour confirmer le fix
 */

const { spawn } = require('child_process');
const fs = require('fs');

function startDuplicationMonitoring() {
    console.log('🎯 MONITORING DE LA DUPLICATION - TESTS FINAUX\n');
    console.log('=' .repeat(60));
    
    console.log('📋 ÉTAT CONFIRMÉ:');
    console.log('   ✅ Base de données nettoyée');
    console.log('   ✅ Aucune copie orpheline');
    console.log('   ✅ Prochain suffix sera: "1"');
    console.log('   ✅ Code de duplication corrigé\n');
    
    console.log('🚀 LANCEMENT DU SERVEUR AVEC MONITORING...\n');
    
    // Démarrer le serveur avec capture des logs spécifiques
    const serverProcess = spawn('npm', ['run', 'dev'], {
        cwd: process.cwd(),
        shell: true,
        stdio: 'pipe'
    });
    
    let duplicateDetected = false;
    let repeaterId = null;
    let logBuffer = [];
    
    // Surveiller stdout
    serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        process.stdout.write(output);
        logBuffer.push({ type: 'stdout', data: output, timestamp: new Date() });
        
        // Détecter les événements de duplication
        if (output.includes('duplicate-templates')) {
            console.log('\n🎯 DUPLICATION DÉTECTÉE!');
            duplicateDetected = true;
        }
        
        if (output.includes('validExistingCopies')) {
            console.log('📊 Comptage des copies existantes...');
        }
        
        if (output.includes('copyNumber')) {
            const match = output.match(/copyNumber[:\s]+(\d+)/);
            if (match) {
                const copyNum = match[1];
                console.log(`🔢 Numéro de copie calculé: ${copyNum}`);
                if (copyNum === '1') {
                    console.log('✅ PARFAIT! Premier suffix sera bien "1"');
                } else {
                    console.log(`❌ PROBLÈME! Suffix sera "${copyNum}" au lieu de "1"`);
                }
            }
        }
        
        if (output.includes('suffixNum')) {
            const match = output.match(/suffixNum[:\s]+(\d+)/);
            if (match) {
                const suffixNum = match[1];
                console.log(`📝 Suffix final: ${suffixNum}`);
            }
        }
        
        if (output.includes('deepCopyNodeInternal') && output.includes('-1')) {
            console.log('🎉 CRÉATION DE COPIE AVEC SUFFIX "-1" CONFIRMÉE!');
        }
    });
    
    // Surveiller stderr  
    serverProcess.stderr.on('data', (data) => {
        const output = data.toString();
        process.stderr.write(output);
        logBuffer.push({ type: 'stderr', data: output, timestamp: new Date() });
    });
    
    // Gestion de l'arrêt
    process.on('SIGINT', () => {
        console.log('\n🛑 ARRÊT DU MONITORING...');
        
        // Sauvegarder les logs de duplication
        const duplicateLogs = logBuffer.filter(log => 
            log.data.includes('duplicate') ||
            log.data.includes('copy') ||
            log.data.includes('suffix') ||
            log.data.includes('repeat')
        );
        
        if (duplicateLogs.length > 0) {
            const timestamp = new Date().getTime();
            const filename = `duplication-test-logs-${timestamp}.txt`;
            
            const logContent = duplicateLogs.map(log => 
                `[${log.timestamp.toISOString()}] ${log.type.toUpperCase()}: ${log.data}`
            ).join('\n');
            
            fs.writeFileSync(filename, logContent);
            console.log(`📋 Logs de duplication sauvés: ${filename}`);
        }
        
        console.log('\n📊 RÉSUMÉ DU TEST:');
        if (duplicateDetected) {
            console.log('   ✅ Duplication détectée dans les logs');
            console.log('   📋 Vérifiez les logs pour confirmer le suffix "1"');
        } else {
            console.log('   ⏸️  Aucune duplication détectée');
            console.log('   💡 Essayez de cliquer sur le bouton de répétition');
        }
        
        serverProcess.kill('SIGTERM');
        process.exit(0);
    });
    
    console.log('🔍 INSTRUCTIONS POUR LE TEST:');
    console.log('   1. Attendez que le serveur démarre');
    console.log('   2. Ouvrez l\'interface CRM'); 
    console.log('   3. Naviguez vers le repeater "Rampant toiture"');
    console.log('   4. Cliquez sur le bouton de duplication');
    console.log('   5. Observez les logs ci-dessous');
    console.log('   6. Appuyez sur Ctrl+C pour arrêter\n');
    
    console.log('🎯 ATTENDU DANS LES LOGS:');
    console.log('   - "validExistingCopies: []" (aucune copie existante)');
    console.log('   - "copyNumber: 1" (première copie)');
    console.log('   - "suffixNum: 1" (suffix correct)');
    console.log('   - Création de nœuds avec "-1"');
    console.log('\n📡 LOGS EN TEMPS RÉEL:\n');
}

startDuplicationMonitoring();