#!/usr/bin/env node

/**
 * 🚀 MONITEUR DE PERFORMANCE CRM
 * 
 * Analyse les logs du serveur pour extraire les métriques de performance :
 * - Temps de réponse par endpoint
 * - Requêtes lentes (> 1s)
 * - Nombre de requêtes par endpoint
 * - Distribution des temps de réponse
 */

import { spawn } from 'child_process';
import chalk from 'chalk';

// Métriques collectées
const metrics = {
  endpoints: new Map(), // endpoint → { count, totalTime, min, max, times[] }
  slowRequests: [],     // Requêtes > 1s
  totalRequests: 0
};

console.log(chalk.bold.cyan('\n🚀 MONITEUR DE PERFORMANCE CRM\n'));
console.log(chalk.gray('Analyse des logs du serveur en temps réel...\n'));
console.log(chalk.yellow('Appuyez sur Ctrl+C pour afficher les statistiques\n'));

// Lancer npm run dev et capturer les logs
const npmDev = spawn('npm', ['run', 'dev'], { 
  cwd: process.cwd(),
  shell: true 
});

npmDev.stdout.on('data', (data) => {
  const lines = data.toString().split('\n');
  
  lines.forEach(line => {
    // Pattern pour les logs HTTP : "HTTP GET /api/xxx 200 123ms"
    const httpMatch = line.match(/HTTP (GET|POST|PUT|DELETE|PATCH) (\/[^\s]+) (\d+) (\d+)ms/);
    
    if (httpMatch) {
      const [, method, endpoint, status, timeMs] = httpMatch;
      const time = parseInt(timeMs);
      
      // Nettoyer l'endpoint (enlever les query params et IDs)
      const cleanEndpoint = endpoint
        .replace(/\?.*$/, '')
        .replace(/\/[a-f0-9-]{20,}/g, '/:id')
        .replace(/\/tbl-\d+-[a-z0-9]+/g, '/:submissionId')
        .replace(/\/\d+/g, '/:id');
      
      const key = `${method} ${cleanEndpoint}`;
      
      // Initialiser les métriques pour cet endpoint
      if (!metrics.endpoints.has(key)) {
        metrics.endpoints.set(key, {
          count: 0,
          totalTime: 0,
          min: Infinity,
          max: 0,
          times: []
        });
      }
      
      const endpointMetrics = metrics.endpoints.get(key);
      endpointMetrics.count++;
      endpointMetrics.totalTime += time;
      endpointMetrics.min = Math.min(endpointMetrics.min, time);
      endpointMetrics.max = Math.max(endpointMetrics.max, time);
      endpointMetrics.times.push(time);
      
      metrics.totalRequests++;
      
      // Détecter les requêtes lentes
      if (time > 1000) {
        metrics.slowRequests.push({
          endpoint: key,
          time,
          timestamp: new Date().toISOString()
        });
        console.log(chalk.red(`🐌 SLOW: ${key} - ${time}ms`));
      } else if (time > 500) {
        console.log(chalk.yellow(`⚠️  ${key} - ${time}ms`));
      } else if (time > 200) {
        console.log(chalk.gray(`→ ${key} - ${time}ms`));
      } else {
        console.log(chalk.green(`✓ ${key} - ${time}ms`));
      }
    }
  });
  
  process.stdout.write(data);
});

npmDev.stderr.on('data', (data) => {
  process.stderr.write(data);
});

// Afficher les statistiques à la fin
process.on('SIGINT', () => {
  console.log(chalk.bold.cyan('\n\n📊 STATISTIQUES DE PERFORMANCE\n'));
  console.log(chalk.gray('═'.repeat(80)));
  
  console.log(chalk.bold.white(`\nTotal de requêtes analysées: ${metrics.totalRequests}\n`));
  
  // Trier par temps moyen décroissant
  const sortedEndpoints = Array.from(metrics.endpoints.entries())
    .sort((a, b) => (b[1].totalTime / b[1].count) - (a[1].totalTime / a[1].count));
  
  console.log(chalk.bold.yellow('🏆 TOP 10 ENDPOINTS LES PLUS LENTS (temps moyen)\n'));
  console.log(chalk.gray('─'.repeat(80)));
  
  sortedEndpoints.slice(0, 10).forEach(([endpoint, stats], i) => {
    const avg = Math.round(stats.totalTime / stats.count);
    const p95 = calculatePercentile(stats.times, 95);
    
    const color = avg > 1000 ? chalk.red 
                : avg > 500 ? chalk.yellow 
                : avg > 200 ? chalk.cyan
                : chalk.green;
    
    console.log(color(
      `${i + 1}. ${endpoint}\n` +
      `   Appels: ${stats.count} | ` +
      `Moy: ${avg}ms | ` +
      `Min: ${stats.min}ms | ` +
      `Max: ${stats.max}ms | ` +
      `P95: ${p95}ms\n`
    ));
  });
  
  // Requêtes les plus fréquentes
  const sortedByCount = Array.from(metrics.endpoints.entries())
    .sort((a, b) => b[1].count - a[1].count);
  
  console.log(chalk.bold.cyan('\n📈 TOP 10 ENDPOINTS LES PLUS APPELÉS\n'));
  console.log(chalk.gray('─'.repeat(80)));
  
  sortedByCount.slice(0, 10).forEach(([endpoint, stats], i) => {
    const avg = Math.round(stats.totalTime / stats.count);
    console.log(
      `${i + 1}. ${endpoint}\n` +
      `   Appels: ${chalk.bold(stats.count)} | ` +
      `Temps moyen: ${avg}ms | ` +
      `Temps total: ${stats.totalTime}ms\n`
    );
  });
  
  // Requêtes lentes
  if (metrics.slowRequests.length > 0) {
    console.log(chalk.bold.red(`\n🐌 REQUÊTES LENTES (> 1s) - ${metrics.slowRequests.length} détectées\n`));
    console.log(chalk.gray('─'.repeat(80)));
    
    metrics.slowRequests.slice(0, 10).forEach((req, i) => {
      console.log(chalk.red(
        `${i + 1}. ${req.endpoint} - ${req.time}ms @ ${req.timestamp}`
      ));
    });
  }
  
  console.log(chalk.gray('\n' + '═'.repeat(80) + '\n'));
  
  npmDev.kill();
  process.exit(0);
});

// Fonction utilitaire pour calculer le percentile
function calculatePercentile(arr, percentile) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index];
}
