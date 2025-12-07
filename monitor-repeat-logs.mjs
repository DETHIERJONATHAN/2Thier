#!/usr/bin/env node

/**
 * Script pour monitorer les logs du serveur en temps réel
 * Filtre et affiche uniquement les logs liés à repeat/duplication
 */

import { spawn } from 'child_process';
import { EOL } from 'os';

const keywords = [
  'repeat',
  'executor',
  'duplication',
  'deepCopy',
  'ERROR',
  'error',
  'Error',
  'REPEAT-EXECUTOR',
  'repeat-route',
  'repeat-executor',
  'repeat-service',
];

console.log('🔍 Monitoring logs du serveur...');
console.log('Recherche de logs contenant: repeat, executor, duplication, ERROR');
console.log('=' .repeat(60));
console.log('');

const child = spawn('npm', ['run', 'dev'], {
  cwd: 'c:\\Users\\dethi\\OneDrive\\Desktop\\CRM SAVE\\crm',
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: true
});

let buffer = '';

const processOutput = (line) => {
  if (!line.trim()) return;
  
  // Vérifie si la ligne contient l'un des keywords
  const hasKeyword = keywords.some(kw => 
    line.toLowerCase().includes(kw.toLowerCase())
  );
  
  if (hasKeyword) {
    console.log(line);
  }
};

child.stdout.on('data', (data) => {
  buffer += data.toString();
  const lines = buffer.split(EOL);
  
  // Traiter toutes les lignes sauf la dernière (incomplète)
  for (let i = 0; i < lines.length - 1; i++) {
    processOutput(lines[i]);
  }
  
  // Garder la dernière ligne incomplète
  buffer = lines[lines.length - 1];
});

child.stderr.on('data', (data) => {
  const line = data.toString();
  console.error('STDERR:', line);
});

process.on('SIGINT', () => {
  console.log('\n\n🛑 Arrêt du monitoring');
  child.kill();
  process.exit(0);
});
