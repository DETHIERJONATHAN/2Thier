#!/usr/bin/env node
/**
 * 🔍 CAPTURE EN TEMPS RÉEL - PROBLÈME PERSISTANT SUFFIX -2
 * 
 * Script pour capturer exactement ce qui se passe lors de la duplication
 */

const { spawn } = require('child_process');
const fs = require('fs');

console.log('🔍 CAPTURE LIVE - PROBLÈME SUFFIX -2 PERSISTANT\n');
console.log('📋 PROBLÈME: Le système crée encore Rampant toiture-2 malgré le nettoyage');
console.log('🎯 OBJECTIF: Capturer les logs de duplication pour identifier la cause\n');

let logEntries = [];
let duplicateCount = 0;

// Démarrer le serveur
console.log('🚀 Démarrage du serveur avec monitoring...\n');
const server = spawn('npm', ['run', 'dev'], {
    shell: true,
    stdio: 'pipe'
});

// Filtres pour capturer les logs pertinents
const relevantPatterns = [
    /duplicate-templates/i,
    /validExistingCopies/i,
    /copyNumber/i,
    /suffixNum/i,
    /deepCopyNodeInternal/i,
    /rampant/i,
    /toiture/i,
    /-1/,
    /-2/,
    /POST.*repeat/i
];

function isRelevantLog(text) {
    return relevantPatterns.some(pattern => pattern.test(text));
}

function processLogLine(line, source) {
    const timestamp = new Date().toISOString();
    
    if (isRelevantLog(line)) {
        const entry = `[${timestamp}] ${source}: ${line}`;
        logEntries.push(entry);
        
        // Affichage en temps réel des logs pertinents
        console.log(`🔍 ${entry}`);
        
        // Détecter les duplications
        if (line.includes('duplicate-templates')) {
            duplicateCount++;
            console.log(`\n🎯 DUPLICATION #${duplicateCount} DÉTECTÉE!\n`);
        }
        
        // Analyser les suffix
        if (line.includes('-1') || line.includes('-2')) {
            console.log(`📝 SUFFIX DÉTECTÉ: ${line.trim()}`);
        }
        
        // Analyser le copyNumber
        const copyMatch = line.match(/copyNumber[:\s]*(\d+)/i);
        if (copyMatch) {
            const num = copyMatch[1];
            console.log(`🔢 COPY NUMBER: ${num}`);
            if (num !== '1') {
                console.log(`❌ PROBLÈME: copyNumber=${num} au lieu de 1!`);
            }
        }
        
        // Analyser le suffixNum
        const suffixMatch = line.match(/suffixNum[:\s]*(\d+)/i);
        if (suffixMatch) {
            const num = suffixMatch[1];
            console.log(`📄 SUFFIX NUM: ${num}`);
            if (num !== '1') {
                console.log(`❌ PROBLÈME: suffixNum=${num} au lieu de 1!`);
            }
        }
    }
}

server.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
        if (line.trim()) {
            processLogLine(line.trim(), 'STDOUT');
        }
    });
    
    // Afficher aussi tout le output
    process.stdout.write(data);
});

server.stderr.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
        if (line.trim()) {
            processLogLine(line.trim(), 'STDERR');
        }
    });
    
    process.stderr.write(data);
});

// Gestion de l'arrêt propre
process.on('SIGINT', () => {
    console.log('\n\n🛑 ARRÊT DU MONITORING...');
    
    if (logEntries.length > 0) {
        const filename = `duplication-debug-${Date.now()}.txt`;
        fs.writeFileSync(filename, logEntries.join('\n'));
        console.log(`📋 ${logEntries.length} logs sauvés dans ${filename}`);
        
        // Analyse rapide
        console.log('\n📊 ANALYSE RAPIDE:');
        const copyNumberLogs = logEntries.filter(log => /copyNumber/i.test(log));
        const suffixLogs = logEntries.filter(log => /suffixNum/i.test(log));
        
        console.log(`   - Logs copyNumber: ${copyNumberLogs.length}`);
        console.log(`   - Logs suffixNum: ${suffixLogs.length}`);
        console.log(`   - Total duplications: ${duplicateCount}`);
        
        if (copyNumberLogs.length > 0) {
            console.log('\n🔍 COPY NUMBERS DÉTECTÉS:');
            copyNumberLogs.forEach(log => console.log(`   ${log}`));
        }
        
        if (suffixLogs.length > 0) {
            console.log('\n📄 SUFFIX NUMS DÉTECTÉS:');
            suffixLogs.forEach(log => console.log(`   ${log}`));
        }
    }
    
    console.log('\n🎯 INSTRUCTIONS SUIVANTES:');
    console.log('   1. Analysez les logs copyNumber et suffixNum');
    console.log('   2. Si copyNumber > 1, le problème est dans le comptage');
    console.log('   3. Si suffixNum > 1, le problème est dans le calcul du suffix');
    console.log('   4. Corrigez la logique identifiée');
    
    server.kill();
    process.exit(0);
});

console.log('📋 INSTRUCTIONS:');
console.log('   1. Attendez que le serveur démarre complètement');
console.log('   2. Ouvrez l\'interface CRM dans votre navigateur');
console.log('   3. Naviguez vers "Rampant toiture"');
console.log('   4. Cliquez sur le bouton de duplication');
console.log('   5. Observez les logs ci-dessous en temps réel');
console.log('   6. Appuyez sur Ctrl+C quand vous avez fini\n');

console.log('🔍 MONITORING EN COURS...\n');
console.log('=' .repeat(80));