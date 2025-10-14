#!/usr/bin/env node
/**
 * 🔍 SCRIPT DE VÉRIFICATION - Utilisation correcte des réponses API
 * 
 * Ce script détecte les mauvaises pratiques dans l'utilisation de l'API :
 * - PUT/PATCH sans récupération de response.data
 * - Mise à jour locale avec les données envoyées au lieu de la réponse
 * - fetchSections() inutiles après une modification
 * 
 * Usage: node scripts/verify-api-response-usage.cjs
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const SRC_DIR = path.join(__dirname, '..', 'src');
const ISSUES = [];

// Patterns à détecter
const PATTERNS = {
  // ❌ Appel PUT/PATCH sans capture de réponse
  uncapturedApiCall: /(?:api\.put|api\.patch)\s*\(/g,
  
  // ❌ setSections avec données envoyées (pas response.data)
  wrongSetSections: /setSections\s*\([^)]*content:\s*(?:updatedContent|newContent|partialData)/g,
  
  // ❌ fetchSections() après PUT/PATCH (inefficace)
  fetchAfterUpdate: /(api\.put|api\.patch)[\s\S]{0,200}fetchSections\s*\(/g,
  
  // ✅ Utilisation correcte de response.data
  correctUsage: /(?:const|let)\s+(?:response|result|res)\s*=\s*await\s+api\.(?:put|patch)[\s\S]{0,300}response\.data/g,
};

/**
 * 🔍 Analyser un fichier
 */
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(SRC_DIR, filePath);
  
  // Ignorer les fichiers de backup
  if (relativePath.includes('.backup') || relativePath.includes('.bak')) {
    return;
  }
  
  // Détecter les appels PUT/PATCH
  const apiCalls = content.match(/(?:api\.put|api\.patch)\s*\([^)]*website-sections/g);
  if (!apiCalls || apiCalls.length === 0) {
    return;
  }
  
  console.log(`\n📄 Analyse: ${relativePath}`);
  console.log(`   Appels PUT/PATCH détectés: ${apiCalls.length}`);
  
  // Vérifier chaque appel
  apiCalls.forEach((call, index) => {
    const callIndex = content.indexOf(call);
    const contextBefore = content.substring(Math.max(0, callIndex - 100), callIndex);
    const contextAfter = content.substring(callIndex, Math.min(content.length, callIndex + 500));
    
    // ✅ Vérifier si response.data est utilisé
    const hasResponseCapture = /(?:const|let)\s+(?:response|result|res)\s*=\s*await/.test(contextBefore);
    const usesResponseData = /response\.data|result\.data|res\.data/.test(contextAfter);
    
    // ❌ Vérifier si fetchSections() est appelé juste après
    const fetchesAfter = /fetchSections\s*\(/.test(contextAfter);
    
    // ❌ Vérifier si setSections utilise les données envoyées
    const usesSentData = /setSections\s*\([^)]*(?:updatedContent|newContent|partialData)/.test(contextAfter);
    
    // Calcul du statut
    let status = '✅ OK';
    const warnings = [];
    
    if (!hasResponseCapture) {
      status = '⚠️ ATTENTION';
      warnings.push('Pas de capture de response');
    }
    
    if (!usesResponseData && hasResponseCapture) {
      status = '❌ BUG';
      warnings.push('response.data non utilisé');
    }
    
    if (fetchesAfter) {
      status = '⚠️ INEFFICACE';
      warnings.push('fetchSections() après PUT/PATCH (inefficace)');
    }
    
    if (usesSentData) {
      status = '❌ BUG CRITIQUE';
      warnings.push('setSections utilise les données envoyées au lieu de response.data');
    }
    
    console.log(`   ${status} Appel #${index + 1}:`);
    if (warnings.length > 0) {
      warnings.forEach(w => console.log(`      - ${w}`));
      ISSUES.push({
        file: relativePath,
        call: call.trim(),
        warnings,
        status
      });
    }
  });
}

/**
 * 🔍 Scanner tous les fichiers
 */
function scanFiles() {
  console.log('🔍 VÉRIFICATION DE L\'UTILISATION DES RÉPONSES API\n');
  console.log('=' .repeat(70));
  
  // Scanner tous les fichiers .tsx et .ts
  const files = glob.sync(`${SRC_DIR}/**/*.{ts,tsx}`, {
    ignore: [
      '**/node_modules/**',
      '**/*.test.{ts,tsx}',
      '**/*.spec.{ts,tsx}',
      '**/*.backup*',
      '**/*.bak'
    ]
  });
  
  console.log(`📁 ${files.length} fichiers à analyser\n`);
  
  files.forEach(analyzeFile);
}

/**
 * 📊 Afficher le rapport final
 */
function printReport() {
  console.log('\n' + '='.repeat(70));
  console.log('📊 RAPPORT FINAL\n');
  
  if (ISSUES.length === 0) {
    console.log('✅ AUCUN PROBLÈME DÉTECTÉ !');
    console.log('   Toutes les utilisations de l\'API sont correctes.\n');
    return;
  }
  
  console.log(`❌ ${ISSUES.length} PROBLÈME(S) DÉTECTÉ(S) :\n`);
  
  // Grouper par type de problème
  const critical = ISSUES.filter(i => i.status.includes('CRITIQUE'));
  const bugs = ISSUES.filter(i => i.status.includes('BUG') && !i.status.includes('CRITIQUE'));
  const warnings = ISSUES.filter(i => i.status.includes('ATTENTION') || i.status.includes('INEFFICACE'));
  
  if (critical.length > 0) {
    console.log(`🔴 ${critical.length} BUG(S) CRITIQUE(S):`);
    critical.forEach(issue => {
      console.log(`   📄 ${issue.file}`);
      issue.warnings.forEach(w => console.log(`      - ${w}`));
    });
    console.log();
  }
  
  if (bugs.length > 0) {
    console.log(`🟠 ${bugs.length} BUG(S):`);
    bugs.forEach(issue => {
      console.log(`   📄 ${issue.file}`);
      issue.warnings.forEach(w => console.log(`      - ${w}`));
    });
    console.log();
  }
  
  if (warnings.length > 0) {
    console.log(`🟡 ${warnings.length} AVERTISSEMENT(S):`);
    warnings.forEach(issue => {
      console.log(`   📄 ${issue.file}`);
      issue.warnings.forEach(w => console.log(`      - ${w}`));
    });
    console.log();
  }
  
  console.log('=' .repeat(70));
  console.log('\n💡 RECOMMANDATIONS:');
  console.log('   1. Toujours capturer la réponse: const response = await api.put(...)');
  console.log('   2. Utiliser response.data pour mettre à jour l\'état local');
  console.log('   3. Éviter fetchSections() après un PUT/PATCH (inefficace)');
  console.log('   4. Le backend fait le merge, le frontend doit utiliser les données mergées\n');
}

// Exécution
try {
  scanFiles();
  printReport();
  
  // Code de sortie selon les résultats
  if (ISSUES.some(i => i.status.includes('CRITIQUE') || i.status.includes('BUG'))) {
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Erreur lors de l\'analyse:', error);
  process.exit(1);
}
