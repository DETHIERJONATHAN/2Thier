#!/usr/bin/env node

/**
 * 🚀 DÉMARRAGE RAPIDE - Diagnostic Rampant toiture
 * 
 * Exécute le diagnostic complet étape par étape avec explications
 */

const readline = require('readline');
const { execSync } = require('child_process');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.clear();
  console.log('\n');
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' '.repeat(25) + '🚀 DIAGNOSTIC RAMPANT TOITURE' + ' '.repeat(24) + '║');
  console.log('╚' + '═'.repeat(78) + '╝\n');

  console.log('Bienvenue! Ce script va vous aider à diagnostiquer pourquoi:');
  console.log('  ❌ Les calculs ne se font pas');
  console.log('  ❌ La copie est foireuse\n');

  const steps = [
    {
      name: 'ÉTAPE 1: Diagnostic Complet',
      file: 'debug-rampant-copy-complete.cjs',
      description: 'Analyse la structure complète du nœud original et de ses copies',
      questions: [
        '✅ Le nœud "Rampant toiture" original a-t-il été trouvé?',
        '✅ Les variables originales existent-elles?',
        '✅ Les copies du nœud ont-elles le même nombre de variables?'
      ]
    },
    {
      name: 'ÉTAPE 2: Qualité de la Copie',
      file: 'test-copy-quality.cjs',
      description: 'Vérifie les références cassées et les données manquantes',
      questions: [
        '✅ Aucun problème majeur détecté?',
        '✅ Les variables sont complètes?',
        '✅ Les formules ont des opérations?'
      ]
    },
    {
      name: 'ÉTAPE 3: Diagnostic des Calculs',
      file: 'diagnose-calculations-failing.cjs',
      description: 'Teste pourquoi les formules ne calculent pas',
      questions: [
        '✅ Les formules ont-elles une opération valide?',
        '✅ Les variables liées existent-elles?',
        '✅ L\'évaluation des formules fonctionne-t-elle?'
      ]
    },
    {
      name: 'ÉTAPE 4: Analyse des Mappages',
      file: 'analyze-copy-mappings.cjs',
      description: 'Analyse les Maps des IDs pendant la copie',
      questions: [
        '✅ Taux de mappage à 100% pour formules?',
        '✅ Taux de mappage à 100% pour conditions?',
        '✅ Taux de mappage à 100% pour variables?'
      ]
    }
  ];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    console.log(`\n${'═'.repeat(80)}`);
    console.log(`${step.name} (${i + 1}/${steps.length})`);
    console.log(`${'═'.repeat(80)}\n`);

    console.log(`📝 ${step.description}\n`);
    console.log('Paramètres à vérifier:');
    for (const q of step.questions) {
      console.log(`   ${q}`);
    }

    console.log('\n');
    const runStep = await question(`Exécuter cette étape? (o/n) `);

    if (runStep.toLowerCase() === 'o') {
      console.log(`\n🔄 Exécution de ${step.file}...\n`);
      try {
        execSync(`node scripts/${step.file}`, { stdio: 'inherit' });
        console.log(`\n✅ ${step.name} terminée\n`);
      } catch (error) {
        console.log(`\n❌ Erreur lors de l'exécution\n`);
      }

      const continueNext = await question('\nContinuer vers l\'étape suivante? (o/n) ');
      if (continueNext.toLowerCase() !== 'o') {
        console.log('\n🛑 Diagnostic arrêté\n');
        break;
      }
    }
  }

  console.log('\n');
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' '.repeat(30) + '📊 DIAGNOSTIC TERMINÉ' + ' '.repeat(27) + '║');
  console.log('╚' + '═'.repeat(78) + '╝\n');

  console.log('Prochaines étapes:');
  console.log('  1. Consulter DIAGNOSTIC-RAMPANT-TOITURE.md');
  console.log('  2. Vérifier les causes racines identifiées');
  console.log('  3. Appliquer les fixes');
  console.log('  4. Re-tester avec run-all-diagnostics.cjs\n');

  rl.close();
}

main().catch(console.error);
