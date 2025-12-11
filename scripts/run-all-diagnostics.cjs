#!/usr/bin/env node

/**
 * 🔥 ORCHESTRATEUR DE DIAGNOSTICS
 * 
 * Lance tous les scripts de diagnostic dans le bon ordre pour identifier
 * rapidement pourquoi la copie est foireuse et les calculs ne se font pas
 * 
 * Usage: node run-all-diagnostics.cjs
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('\n');
console.log('╔' + '═'.repeat(78) + '╗');
console.log('║' + ' '.repeat(15) + '🔥 ORCHESTRATEUR DE DIAGNOSTICS - RAMPANT TOITURE 🔥' + ' '.repeat(10) + '║');
console.log('╚' + '═'.repeat(78) + '╝\n');

const diagnostics = [
  {
    name: 'DIAGNOSTIC COMPLET',
    file: 'debug-rampant-copy-complete.cjs',
    description: 'Analyse complète du nœud original et de ses copies'
  },
  {
    name: 'QUALITÉ DE COPIE',
    file: 'test-copy-quality.cjs',
    description: 'Vérifie les références cassées et les données manquantes'
  },
  {
    name: 'CALCULS',
    file: 'diagnose-calculations-failing.cjs',
    description: 'Teste pourquoi les formules ne calculent pas'
  },
  {
    name: 'MAPPAGES',
    file: 'analyze-copy-mappings.cjs',
    description: 'Analyse les Maps des IDs pendant la copie'
  }
];

async function runDiagnostic(diagnostic, index) {
  console.log(`\n${'━'.repeat(80)}`);
  console.log(`[${index + 1}/${diagnostics.length}] ${diagnostic.name}`);
  console.log(`${'━'.repeat(80)}`);
  console.log(`📝 ${diagnostic.description}\n`);

  const filePath = path.join(__dirname, diagnostic.file);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Fichier non trouvé: ${filePath}`);
    return false;
  }

  try {
    execSync(`node "${filePath}"`, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`\n❌ Diagnostic échoué: ${error.message}`);
    return false;
  }
}

async function main() {
  const results = [];

  for (let i = 0; i < diagnostics.length; i++) {
    const success = await runDiagnostic(diagnostics[i], i);
    results.push({
      name: diagnostics[i].name,
      success
    });
  }

  // RÉSUMÉ FINAL
  console.log('\n\n');
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' '.repeat(30) + '📊 RÉSUMÉ FINAL' + ' '.repeat(34) + '║');
  console.log('╚' + '═'.repeat(78) + '╝\n');

  for (const result of results) {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.name}`);
  }

  const allSuccess = results.every(r => r.success);
  
  console.log('\n' + '═'.repeat(80));
  if (allSuccess) {
    console.log('✅ TOUS LES DIAGNOSTICS SONT TERMINÉS');
  } else {
    console.log('⚠️  CERTAINS DIAGNOSTICS ONT ÉCHOUÉ');
  }
  console.log('═'.repeat(80) + '\n');

  process.exit(allSuccess ? 0 : 1);
}

main().catch(error => {
  console.error('ERREUR CRITIQUE:', error);
  process.exit(1);
});
