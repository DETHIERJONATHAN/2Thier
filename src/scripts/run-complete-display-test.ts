#!/usr/bin/env node

/**
 * 🚀 SCRIPT PRINCIPAL - Test complet des champs d'affichage
 * 
 * Lance tous les tests nécessaires pour diagnostiquer les problèmes
 * d'affichage des champs calculés et des copies.
 * 
 * Usage: npx tsx src/scripts/run-complete-display-test.ts
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

function runScript(scriptPath: string): Promise<void> {
  return new Promise((resolve) => {
    console.log(`\n🚀 Exécution: ${scriptPath}`);
    console.log('=' .repeat(60));
    
    const fullPath = path.resolve(scriptPath);
    if (!existsSync(fullPath)) {
      console.log(`❌ Script non trouvé: ${fullPath}`);
      resolve();
      return;
    }

    const child = spawn('npx', ['tsx', fullPath], {
      stdio: 'inherit',
      shell: true
    });

    child.on('close', (code) => {
      console.log('=' .repeat(60));
      if (code === 0) {
        console.log(`✅ ${scriptPath} terminé avec succès`);
        resolve();
      } else {
        console.log(`❌ ${scriptPath} terminé avec code ${code}`);
        resolve(); // Continuer même en cas d'erreur
      }
    });

    child.on('error', (error) => {
      console.log(`❌ Erreur lors de l'exécution de ${scriptPath}:`, error);
      resolve(); // Continuer même en cas d'erreur
    });
  });
}

async function main() {
  console.log('🧪 === TEST COMPLET CHAMPS D\'AFFICHAGE ===');
  console.log('Ce script va exécuter tous les tests de diagnostic en séquence.\n');

  const scripts = [
    // 1. Créer des données de test
    {
      path: 'src/scripts/create-test-display-data.ts',
      description: '🏗️  Création des données de test'
    },
    
    // 2. Diagnostic général
    {
      path: 'src/scripts/debug-display-fields.ts',
      description: '🔍 Diagnostic général des champs d\'affichage'
    },
    
    // 3. Tests en temps réel
    {
      path: 'src/scripts/test-display-real-time.ts',
      description: '🧪 Tests d\'affichage en temps réel'
    },
    
    // 4. Tests API
    {
      path: 'src/scripts/test-display-api.ts',
      description: '🌐 Tests des endpoints API'
    }
  ];

  let completedScripts = 0;
  const startTime = Date.now();

  for (const script of scripts) {
    console.log(`\n📋 ${completedScripts + 1}/${scripts.length}: ${script.description}`);
    
    try {
      await runScript(script.path);
      completedScripts++;
    } catch (error) {
      console.log(`❌ Erreur lors de l'exécution de ${script.path}:`, error);
    }
    
    // Pause entre les scripts
    if (completedScripts < scripts.length) {
      console.log('\n⏸️  Pause de 2 secondes...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  
  console.log('\n🎉 === RÉSUMÉ FINAL ===');
  console.log(`✅ Scripts exécutés: ${completedScripts}/${scripts.length}`);
  console.log(`⏱️  Temps total: ${totalTime}s`);
  
  if (completedScripts === scripts.length) {
    console.log('\n🎯 ANALYSE TERMINÉE !');
    console.log('Vous devriez maintenant avoir :');
    console.log('1. 📊 Des données de test complètes');
    console.log('2. 🔍 Un diagnostic détaillé du système');
    console.log('3. 🧪 Des tests de fonctionnement en temps réel');
    console.log('4. 🌐 Une validation des endpoints API');
    
    console.log('\n🔧 PROCHAINES ÉTAPES:');
    console.log('- Analyser les logs pour identifier les problèmes');
    console.log('- Vérifier les valeurs calculées vs. affichées');
    console.log('- Corriger les dysfonctionnements identifiés');
  } else {
    console.log('\n⚠️  Certains scripts ont échoué.');
    console.log('Vérifiez les logs ci-dessus pour identifier les problèmes.');
  }
}

main().catch(console.error);