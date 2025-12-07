#!/usr/bin/env node

/**
 * Script qui lance le serveur et filtre UNIQUEMENT les logs [repeat-*]
 * Parfait pour déboguer sans le spam de tous les autres logs
 */

import { spawn } from 'child_process';

const projectRoot = process.cwd();

console.log('🚀 Lancement du serveur avec filtrage des logs repeat...\n');

// Utiliser npm run dev:server à la place
const server = spawn('npm', ['run', 'dev:server'], {
  cwd: projectRoot,
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: true
});

// Colorer les logs
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function processLine(line) {
  // Filtrer UNIQUEMENT les logs repeat
  if (line.includes('[repeat-') || line.includes('ERROR') || line.includes('error')) {
    if (line.includes('[repeat-route]')) {
      console.log(`${colors.green}[ROUTE]${colors.reset} ${line}`);
    } else if (line.includes('[repeat-service]')) {
      console.log(`${colors.blue}[SERVICE]${colors.reset} ${line}`);
    } else if (line.includes('[repeat-blueprint-builder]')) {
      console.log(`${colors.cyan}[BLUEPRINT]${colors.reset} ${line}`);
    } else if (line.includes('[repeat-executor]')) {
      console.log(`${colors.yellow}[EXECUTOR]${colors.reset} ${line}`);
    } else if (line.includes('error') || line.includes('ERROR')) {
      console.log(`${colors.red}[ERROR]${colors.reset} ${line}`);
    } else {
      console.log(`[REPEAT] ${line}`);
    }
  }
  
  // Aussi afficher les messages de démarrage du serveur
  if (line.includes('ready on') || line.includes('Express server') || line.includes('Database') || line.includes('PORT')) {
    console.log(`${colors.green}✓${colors.reset} ${line}`);
  }
}

server.stdout.on('data', (data) => {
  const lines = data.toString().split('\n');
  lines.forEach(line => {
    if (line.trim()) processLine(line);
  });
});

server.stderr.on('data', (data) => {
  const lines = data.toString().split('\n');
  lines.forEach(line => {
    if (line.trim()) {
      console.log(`${colors.red}ERROR${colors.reset} ${line}`);
    }
  });
});

server.on('close', (code) => {
  console.log(`\n${colors.red}✗ Serveur arrêté (code: ${code})${colors.reset}`);
  process.exit(code);
});

process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}⏸ Arrêt du serveur...${colors.reset}`);
  server.kill();
  process.exit(0);
});

console.log(`${colors.green}✓ Serveur lancé - en attente de logs repeat...${colors.reset}`);
console.log(`${colors.yellow}💡 Cliquez maintenant "Ajouter toit" dans le navigateur${colors.reset}\n`);
