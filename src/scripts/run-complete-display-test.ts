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
import { logger } from '../lib/logger';

function runScript(scriptPath: string): Promise<void> {
  return new Promise((resolve) => {
    logger.debug(`\n🚀 Exécution: ${scriptPath}`);
    logger.debug('=' .repeat(60));
    
    const fullPath = path.resolve(scriptPath);
    if (!existsSync(fullPath)) {
      logger.debug(`❌ Script non trouvé: ${fullPath}`);
      resolve();
      return;
    }

    const child = spawn('npx', ['tsx', fullPath], {
      stdio: 'inherit',
      shell: true
    });

    child.on('close', (code) => {
      logger.debug('=' .repeat(60));
      if (code === 0) {
        logger.debug(`✅ ${scriptPath} terminé avec succès`);
        resolve();
      } else {
        logger.debug(`❌ ${scriptPath} terminé avec code ${code}`);
        resolve(); // Continuer même en cas d'erreur
      }
    });

    child.on('error', (error) => {
      logger.debug(`❌ Erreur lors de l'exécution de ${scriptPath}:`, error);
      resolve(); // Continuer même en cas d'erreur
    });
  });
}

async function main() {
  logger.debug('🧪 === TEST COMPLET CHAMPS D\'AFFICHAGE ===');
  logger.debug('Ce script va exécuter tous les tests de diagnostic en séquence.\n');

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
    logger.debug(`\n📋 ${completedScripts + 1}/${scripts.length}: ${script.description}`);
    
    try {
      await runScript(script.path);
      completedScripts++;
    } catch (error) {
      logger.debug(`❌ Erreur lors de l'exécution de ${script.path}:`, error);
    }
    
    // Pause entre les scripts
    if (completedScripts < scripts.length) {
      logger.debug('\n⏸️  Pause de 2 secondes...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  
  logger.debug('\n🎉 === RÉSUMÉ FINAL ===');
  logger.debug(`✅ Scripts exécutés: ${completedScripts}/${scripts.length}`);
  logger.debug(`⏱️  Temps total: ${totalTime}s`);
  
  if (completedScripts === scripts.length) {
    logger.debug('\n🎯 ANALYSE TERMINÉE !');
    logger.debug('Vous devriez maintenant avoir :');
    logger.debug('1. 📊 Des données de test complètes');
    logger.debug('2. 🔍 Un diagnostic détaillé du système');
    logger.debug('3. 🧪 Des tests de fonctionnement en temps réel');
    logger.debug('4. 🌐 Une validation des endpoints API');
    
    logger.debug('\n🔧 PROCHAINES ÉTAPES:');
    logger.debug('- Analyser les logs pour identifier les problèmes');
    logger.debug('- Vérifier les valeurs calculées vs. affichées');
    logger.debug('- Corriger les dysfonctionnements identifiés');
  } else {
    logger.debug('\n⚠️  Certains scripts ont échoué.');
    logger.debug('Vérifiez les logs ci-dessus pour identifier les problèmes.');
  }
}

main().catch(logger.error);