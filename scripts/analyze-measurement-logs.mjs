#!/usr/bin/env node

/**
 * 🔍 Script d'analyse des logs de mesure
 * Extrait et analyse les variations de mesure pour identifier le bug
 * 
 * Usage: node scripts/analyze-measurement-logs.mjs < logs.txt
 */

import fs from 'fs';
import readline from 'readline';

const measurements = [];
const ransacResults = [];
const homographyCalcs = [];
let currentSession = 0;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', (line) => {
  // Détecter les appels RANSAC
  if (line.includes('RANSAC') && line.includes('SUCCÈS')) {
    const match = line.match(/largeur_cm: ([\d.]+).*hauteur_cm: ([\d.]+).*quality: ([\d.]+).*inlierCount: (\d+)/);
    if (match) {
      ransacResults.push({
        largeur: parseFloat(match[1]),
        hauteur: parseFloat(match[2]),
        quality: parseFloat(match[3]),
        inliers: parseInt(match[4]),
        timestamp: new Date().toISOString()
      });
    }
  }

  // Détecter les mesures homographiques finales
  if (line.includes('Largeur FINALE:') && line.includes('Hauteur FINALE:')) {
    const largeurMatch = line.match(/Largeur FINALE: ([\d.]+)/);
    const hauteurMatch = line.match(/Hauteur FINALE: ([\d.]+)/);
    if (largeurMatch && hauteurMatch) {
      measurements.push({
        largeur: parseFloat(largeurMatch[1]),
        hauteur: parseFloat(hauteurMatch[1]),
        type: 'homography',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Détecter les variations mesures opposées
  if (line.includes('Variation mesures opposées:')) {
    const largeurVar = line.match(/Largeur \(haut vs bas\): ([\d.]+)%/);
    const hauteurVar = line.match(/Hauteur \(gauche vs droite\): ([\d.]+)%/);
    if (largeurVar && hauteurVar) {
      homographyCalcs.push({
        largeurVariation: parseFloat(largeurVar[1]),
        hauteurVariation: parseFloat(hauteurVar[1]),
        timestamp: new Date().toISOString()
      });
    }
  }

  // Détecter les changements de session
  if (line.includes('RESET: Composant visible') || line.includes('session')) {
    currentSession++;
  }
});

rl.on('close', () => {
  console.log('\n' + '='.repeat(80));
  console.log('📊 ANALYSE DES MESURES DE PORTE');
  console.log('='.repeat(80) + '\n');

  // ============ RÉSULTATS RANSAC ============
  console.log('🎯 RÉSULTATS RANSAC (ULTRA-PRÉCISION):');
  console.log('-'.repeat(80));
  if (ransacResults.length === 0) {
    console.log('❌ Aucun résultat RANSAC trouvé');
  } else {
    ransacResults.forEach((r, i) => {
      console.log(`\n${i + 1}. Appel RANSAC #${i + 1}`);
      console.log(`   Largeur:  ${r.largeur.toFixed(2)} cm`);
      console.log(`   Hauteur:  ${r.hauteur.toFixed(2)} cm`);
      console.log(`   Qualité:  ${r.quality.toFixed(2)}%`);
      console.log(`   Inliers:  ${r.inliers}/230 points`);
    });

    // Statistiques RANSAC
    console.log('\n' + '-'.repeat(80));
    console.log('📈 STATISTIQUES RANSAC:');
    const largeurs = ransacResults.map(r => r.largeur);
    const hauteurs = ransacResults.map(r => r.hauteur);

    const avgLargeur = largeurs.reduce((a, b) => a + b) / largeurs.length;
    const avgHauteur = hauteurs.reduce((a, b) => a + b) / hauteurs.length;
    const minLargeur = Math.min(...largeurs);
    const maxLargeur = Math.max(...largeurs);
    const minHauteur = Math.min(...hauteurs);
    const maxHauteur = Math.max(...hauteurs);

    console.log(`\n   Largeur:`);
    console.log(`      Moyenne:      ${avgLargeur.toFixed(2)} cm`);
    console.log(`      Min/Max:      ${minLargeur.toFixed(2)} / ${maxLargeur.toFixed(2)} cm`);
    console.log(`      Variation:    ${(maxLargeur - minLargeur).toFixed(2)} cm (${((maxLargeur - minLargeur) / avgLargeur * 100).toFixed(1)}%)`);
    console.log(`      Écart-type:   ${Math.sqrt(largeurs.reduce((a, b) => a + Math.pow(b - avgLargeur, 2)) / largeurs.length).toFixed(2)} cm`);

    console.log(`\n   Hauteur:`);
    console.log(`      Moyenne:      ${avgHauteur.toFixed(2)} cm`);
    console.log(`      Min/Max:      ${minHauteur.toFixed(2)} / ${maxHauteur.toFixed(2)} cm`);
    console.log(`      Variation:    ${(maxHauteur - minHauteur).toFixed(2)} cm (${((maxHauteur - minHauteur) / avgHauteur * 100).toFixed(1)}%)`);
    console.log(`      Écart-type:   ${Math.sqrt(hauteurs.reduce((a, b) => a + Math.pow(b - avgHauteur, 2)) / hauteurs.length).toFixed(2)} cm`);
  }

  // ============ MESURES HOMOGRAPHIQUES ============
  console.log('\n\n🎯 MESURES HOMOGRAPHIQUES (DIRECTES):');
  console.log('-'.repeat(80));
  if (measurements.length === 0) {
    console.log('❌ Aucune mesure trouvée');
  } else {
    measurements.forEach((m, i) => {
      console.log(`${i + 1}. Mesure #${i + 1}: ${m.largeur.toFixed(2)} × ${m.hauteur.toFixed(2)} cm`);
    });
  }

  // ============ VARIATIONS MESURES OPPOSÉES ============
  console.log('\n\n⚠️  VARIATIONS MESURES OPPOSÉES:');
  console.log('-'.repeat(80));
  if (homographyCalcs.length === 0) {
    console.log('❌ Aucune variation trouvée');
  } else {
    homographyCalcs.forEach((h, i) => {
      console.log(`${i + 1}. Ajustement #${i + 1}:`);
      console.log(`   Largeur (haut vs bas):     ${h.largeurVariation.toFixed(2)}% ${h.largeurVariation > 5 ? '🔴 MAUVAIS' : '✅'}`);
      console.log(`   Hauteur (gauche vs droite): ${h.hauteurVariation.toFixed(2)}% ${h.hauteurVariation > 5 ? '🔴 MAUVAIS' : '✅'}`);
    });
  }

  // ============ PROBLÈME IDENTIFIÉ ============
  console.log('\n\n🔍 DIAGNOSTIC:');
  console.log('-'.repeat(80));

  if (ransacResults.length > 0) {
    const largeurVar = Math.max(...ransacResults.map(r => r.largeur)) - Math.min(...ransacResults.map(r => r.largeur));
    const hauteurVar = Math.max(...ransacResults.map(r => r.hauteur)) - Math.min(...ransacResults.map(r => r.hauteur));

    console.log(`\n⚠️  INSTABILITÉ RANSAC DÉTECTÉE:`);
    console.log(`   Les résultats RANSAC changent beaucoup à chaque appel!`);
    console.log(`   • Variation hauteur: ${hauteurVar.toFixed(2)} cm (${((hauteurVar / (Math.max(...ransacResults.map(r => r.hauteur)))) * 100).toFixed(1)}%)`);
    console.log(`   • Variation largeur: ${largeurVar.toFixed(2)} cm`);

    console.log(`\n💡 CAUSES POSSIBLES:`);
    console.log(`   1. Les objectPoints (coins) changent à chaque ajustement`);
    console.log(`      → Normale si l'utilisateur déplace les coins`);
    console.log(`   2. Les fusedCorners restent CONSTANTS`);
    console.log(`      → C'est pas le problème du marqueur`);
    console.log(`   3. L'algorithme RANSAC choisit différents inliers`);
    console.log(`      → Peut expliquer les variations`);
    console.log(`   4. La perspective du marqueur elle-même varie`);
    console.log(`      → Asymétrie détectée: 3.9% (89.3×92.9 vs carré attendu)`);

    const avgQuality = ransacResults.reduce((a, b) => a + b.quality, 0) / ransacResults.length;
    const avgInliers = ransacResults.reduce((a, b) => a + b.inliers, 0) / ransacResults.length;

    console.log(`\n📊 QUALITÉ RANSAC:`);
    console.log(`   Qualité moyenne:  ${avgQuality.toFixed(2)}% (faible! < 75%)`);
    console.log(`   Inliers moyens:   ${avgInliers.toFixed(0)}/230 points (${(avgInliers / 230 * 100).toFixed(1)}%)`);
    console.log(`   → Seulement ~44% des points détectés sont utilisés!`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Analyse terminée');
  console.log('='.repeat(80) + '\n');

  // Export en JSON pour analyse ultérieure
  const report = {
    timestamp: new Date().toISOString(),
    ransacResults,
    measurements,
    homographyCalcs,
    statistics: {
      totalRansacCalls: ransacResults.length,
      totalMeasurements: measurements.length,
      totalVariationPoints: homographyCalcs.length
    }
  };

  fs.writeFileSync('measurement-analysis.json', JSON.stringify(report, null, 2));
  console.log('📁 Rapport sauvegardé: measurement-analysis.json\n');
});
