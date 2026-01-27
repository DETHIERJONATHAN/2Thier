#!/usr/bin/env node

/**
 * 🎯 ANALYSEUR DE TRIGGERS - OPTIMISATION DISPLAY FIELDS
 * 
 * Analyse les logs backend pour vérifier :
 * - Combien de display fields sont recalculés par requête
 * - Combien sont skippés grâce aux triggers
 * - Ratio d'optimisation des triggers
 * - Temps gagné grâce aux triggers
 */

import { spawn } from 'child_process';
import chalk from 'chalk';

const stats = {
  evaluations: [],
  triggers: {
    matched: 0,
    filtered: 0,
    noTriggers: 0,
    autosave: 0
  },
  displayFieldsCalculated: 0,
  displayFieldsSkipped: 0,
  changedFieldIds: new Map() // changedFieldId → count
};

console.log(chalk.bold.magenta('\n🎯 ANALYSEUR DE TRIGGERS - OPTIMISATION DISPLAY FIELDS\n'));
console.log(chalk.gray('Analyse en temps réel des optimisations de triggers...\n'));
console.log(chalk.yellow('Modifiez des champs dans le CRM pour voir l\'optimisation en action'));
console.log(chalk.yellow('Appuyez sur Ctrl+C pour voir les statistiques\n'));

const npmDev = spawn('npm', ['run', 'dev'], { 
  cwd: process.cwd(),
  shell: true 
});

let currentEvaluation = null;

npmDev.stdout.on('data', (data) => {
  const lines = data.toString().split('\n');
  
  lines.forEach(line => {
    // Détecter le début d'une évaluation
    const triggerMatch = line.match(/🎯 \[TRIGGER DEBUG\] changedFieldId reçu du frontend: "(.+?)"/);
    if (triggerMatch) {
      if (currentEvaluation) {
        stats.evaluations.push(currentEvaluation);
      }
      
      const changedFieldId = triggerMatch[1];
      currentEvaluation = {
        changedFieldId,
        matched: 0,
        filtered: 0,
        noTriggers: 0,
        autosave: 0,
        timestamp: new Date()
      };
      
      stats.changedFieldIds.set(
        changedFieldId,
        (stats.changedFieldIds.get(changedFieldId) || 0) + 1
      );
      
      const color = changedFieldId === 'NULL' ? chalk.red : chalk.green;
      console.log(color(`\n🎯 Évaluation: changedFieldId="${changedFieldId}"`));
    }
    
    // Détecter les triggers matchés
    if (line.includes('✅ [TRIGGER MATCH]')) {
      if (currentEvaluation) currentEvaluation.matched++;
      stats.triggers.matched++;
      stats.displayFieldsCalculated++;
      
      const match = line.match(/Display field .+? \((.+?)\) recalculé/);
      if (match) {
        console.log(chalk.green(`  ✅ Recalculé: ${match[1]}`));
      }
    }
    
    // Détecter les triggers filtrés
    if (line.includes('⏸️ [TRIGGER FILTER]')) {
      if (currentEvaluation) currentEvaluation.filtered++;
      stats.triggers.filtered++;
      stats.displayFieldsSkipped++;
      
      const match = line.match(/Display field .+? \((.+?)\) skippé/);
      if (match) {
        console.log(chalk.gray(`  ⏸️  Skippé: ${match[1]}`));
      }
    }
    
    // Détecter les champs sans triggers
    if (line.includes('⏸️ [NO TRIGGERS]')) {
      if (currentEvaluation) currentEvaluation.noTriggers++;
      stats.triggers.noTriggers++;
      stats.displayFieldsSkipped++;
      
      const match = line.match(/Display field .+? \((.+?)\) skippé/);
      if (match) {
        console.log(chalk.yellow(`  ⏸️  Pas de triggers: ${match[1]}`));
      }
    }
    
    // Détecter les autosaves
    if (line.includes('⏸️ [AUTOSAVE]')) {
      if (currentEvaluation) currentEvaluation.autosave++;
      stats.triggers.autosave++;
      stats.displayFieldsSkipped++;
      
      const match = line.match(/Display field .+? \((.+?)\) skippé/);
      if (match) {
        console.log(chalk.cyan(`  ⏸️  Autosave: ${match[1]}`));
      }
    }
    
    // Détecter le stockage final
    const storeMatch = line.match(/🎯 \[DISPLAY FIELDS\] Stockage de (\d+) display fields/);
    if (storeMatch && currentEvaluation) {
      const stored = parseInt(storeMatch[1]);
      currentEvaluation.stored = stored;
      
      const total = currentEvaluation.matched + currentEvaluation.filtered + 
                   currentEvaluation.noTriggers + currentEvaluation.autosave;
      const efficiency = total > 0 ? ((currentEvaluation.filtered + currentEvaluation.noTriggers + currentEvaluation.autosave) / total * 100).toFixed(1) : 0;
      
      console.log(chalk.bold.white(`  📊 Total: ${stored} calculés, ${total - stored} skippés (${efficiency}% optimisés)\n`));
    }
  });
  
  process.stdout.write(data);
});

npmDev.stderr.on('data', (data) => {
  process.stderr.write(data);
});

process.on('SIGINT', () => {
  if (currentEvaluation) {
    stats.evaluations.push(currentEvaluation);
  }
  
  console.log(chalk.bold.magenta('\n\n📊 STATISTIQUES D\'OPTIMISATION DES TRIGGERS\n'));
  console.log(chalk.gray('═'.repeat(80)));
  
  const totalDisplayFields = stats.displayFieldsCalculated + stats.displayFieldsSkipped;
  const efficiency = totalDisplayFields > 0 
    ? ((stats.displayFieldsSkipped / totalDisplayFields) * 100).toFixed(1) 
    : 0;
  
  console.log(chalk.bold.white(`\nTotal d'évaluations: ${stats.evaluations.length}\n`));
  
  console.log(chalk.bold.cyan('🎯 RÉSUMÉ DES DISPLAY FIELDS\n'));
  console.log(`  Calculés: ${chalk.green(stats.displayFieldsCalculated)}`);
  console.log(`  Skippés:  ${chalk.yellow(stats.displayFieldsSkipped)}`);
  console.log(`  Total:    ${chalk.white(totalDisplayFields)}`);
  console.log(chalk.bold.green(`  \n  Efficacité: ${efficiency}% des display fields évités grâce aux triggers 🚀\n`));
  
  console.log(chalk.bold.yellow('\n📈 DÉTAIL DES TRIGGERS\n'));
  console.log(`  ✅ Triggers matchés (recalcul):           ${chalk.green(stats.triggers.matched)}`);
  console.log(`  ⏸️  Triggers filtrés (pas de match):      ${chalk.gray(stats.triggers.filtered)}`);
  console.log(`  ⏸️  Pas de triggers (skip):               ${chalk.yellow(stats.triggers.noTriggers)}`);
  console.log(`  ⏸️  Autosave (pas de recalcul):           ${chalk.cyan(stats.triggers.autosave)}\n`);
  
  console.log(chalk.bold.magenta('\n🔥 CHAMPS MODIFIÉS (changedFieldId)\n'));
  console.log(chalk.gray('─'.repeat(80)));
  
  const sortedFields = Array.from(stats.changedFieldIds.entries())
    .sort((a, b) => b[1] - a[1]);
  
  sortedFields.forEach(([fieldId, count], i) => {
    const color = fieldId === 'NULL' ? chalk.red : chalk.green;
    console.log(color(`${i + 1}. ${fieldId} - ${count} fois`));
  });
  
  console.log(chalk.gray('\n' + '═'.repeat(80) + '\n'));
  
  npmDev.kill();
  process.exit(0);
});
