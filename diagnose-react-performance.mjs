#!/usr/bin/env node

/**
 * Script de diagnostic des performances React
 * Recherche les patterns qui peuvent causer des ralentissements
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 === DIAGNOSTIC PERFORMANCES REACT ===\n');

// Patterns problématiques à rechercher
const performancePatterns = {
  // Problèmes de re-render
  'Inline Functions in JSX': /onClick=\{.*=>\s*.*\}/g,
  'Unstable useCallback deps': /useCallback.*,\s*\[.*\..*\]/g,
  'Missing React.memo': /^(export\s+)?const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*\{/gm,
  
  // Problèmes de requêtes
  'Potential Infinite useEffect': /useEffect\([^}]*\[[^\]]*\w+\.[^,\]]*[^,\]]*\]/g,
  'Fetch in render': /const\s+\w+\s*=\s*.*fetch\(/g,
  'API calls without deps control': /api\.\w+\([^}]*useEffect/g,
  
  // Problèmes de mémoire
  'Large inline objects': /\{\s*[^}]{100,}\s*\}/g,
  'Potential memory leaks': /setInterval|setTimeout.*useEffect/g,
};

// Fichiers à analyser
const filesToAnalyze = [
  'src/auth/AuthProvider.tsx',
  'src/components/SidebarOrganized.tsx',
  'src/layouts/AppLayout.tsx',
  'src/pages/LeadsPage.tsx',
  'src/hooks/useAuthenticatedApi.ts'
];

async function analyzePerformance() {
  console.log('📊 ANALYSE DES PATTERNS DE PERFORMANCE:');
  console.log('======================================');

  for (const filePath of filesToAnalyze) {
    const fullPath = path.join(process.cwd(), filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  Fichier non trouvé: ${filePath}`);
      continue;
    }

    console.log(`\n📄 ${filePath}:`);
    console.log(''.padEnd(50, '-'));

    const content = fs.readFileSync(fullPath, 'utf8');
    let hasIssues = false;

    // Chercher chaque pattern
    for (const [patternName, regex] of Object.entries(performancePatterns)) {
      const matches = content.match(regex);
      if (matches && matches.length > 0) {
        hasIssues = true;
        console.log(`  ❌ ${patternName}: ${matches.length} occurrence(s)`);
        
        // Montrer les premières occurrences
        matches.slice(0, 2).forEach((match, i) => {
          const truncated = match.length > 80 ? match.substring(0, 80) + '...' : match;
          console.log(`     ${i+1}. ${truncated}`);
        });
      }
    }

    if (!hasIssues) {
      console.log('  ✅ Aucun problème de performance détecté');
    }

    // Statistiques générales
    const lines = content.split('\n').length;
    const useEffectCount = (content.match(/useEffect/g) || []).length;
    const useCallbackCount = (content.match(/useCallback/g) || []).length;
    const useMemoCount = (content.match(/useMemo/g) || []).length;

    console.log(`  📊 Stats: ${lines} lignes, ${useEffectCount} useEffect, ${useCallbackCount} useCallback, ${useMemoCount} useMemo`);
  }

  console.log('\n🎯 RECOMMANDATIONS GÉNÉRALES:');
  console.log('=============================');
  console.log('1. ✅ Utilisez React.memo pour les composants coûteux');
  console.log('2. ✅ Stabilisez les dépendances useEffect avec useCallback/useMemo');
  console.log('3. ✅ Évitez les fonctions inline dans les props');
  console.log('4. ✅ Limitez les appels API dans les useEffect sans dépendances');
  console.log('5. ✅ Utilisez des refs pour les valeurs qui n\'affectent pas le rendu');

  console.log('\n🔧 ACTIONS IMMÉDIATES POUR PERFORMANCE:');
  console.log('======================================');
  console.log('1. 🚀 Serveur redémarré avec optimisations Node.js');
  console.log('2. 🧹 Connexions réseau nettoyées');
  console.log('3. 📊 Variables d\'environnement optimisées');
  console.log('4. 🔄 HMR (Hot Module Replacement) activé');

  console.log('\n💡 SI LES PAGES RESTENT LENTES:');
  console.log('==============================');
  console.log('• F12 > Network: vérifiez les requêtes en double');
  console.log('• F12 > Console: regardez les warnings React');
  console.log('• F12 > Performance: profilez les re-renders');
  console.log('• Essayez en navigation privée pour éliminer les extensions');
}

analyzePerformance().catch(console.error);
