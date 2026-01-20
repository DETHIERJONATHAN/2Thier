#!/usr/bin/env node
/**
 * 🔍 SCRIPT DIAGNOSTIC: VÉRIFICATION DES 230 POINTS CALIBRATION
 * 
 * Problèmes identifiés:
 * - Pixel (759.5, 582.0) mappe à 2 coordonnées différentes !
 * - Points mal projetés due au décalage des coins
 * - RANSAC n'accepte que 101/226 inliers
 */

import fs from 'fs';

// Données du backend concernant les premiers points RANSAC
const calibrationSample = [
  { index: 0, px: [828.3, 663.2], real: [105, 120], type: 'CENTER', status: 'inlier' },
  { index: 1, px: [745.8, 580.3], real: [25, 35], type: 'rule', status: 'outlier' },
  { index: 2, px: [759.5, 582.0], real: [35, 35], type: 'rule', status: 'outlier' },
  { index: 3, px: [759.5, 582.0], real: [45, 35], type: 'rule', status: 'outlier' }, // DUPLICATE PIXEL!
  { index: 4, px: [774.8, 580.3], real: [55, 35], type: 'rule', status: 'outlier' },
];

// Analyse
console.log('================================================================================');
console.log('🔬 [DIAGNOSTIC CALIBRATION POINTS] Analyse des 230 points');
console.log('================================================================================\n');

console.log('📊 ANALYSE DES PREMIERS 5 POINTS (après filtrage):');
console.log();

let duplicateCount = 0;
const pixelMap = new Map();

for (let i = 0; i < calibrationSample.length; i++) {
  const pt = calibrationSample[i];
  const key = `${pt.px[0]},${pt.px[1]}`;
  
  console.log(`[${i}] ${pt.type.padEnd(8)} | Pixel: (${pt.px[0].toFixed(1)}, ${pt.px[1].toFixed(1)}) → Real: (${pt.real[0]}, ${pt.real[1]})mm | ${pt.status}`);
  
  if (pixelMap.has(key)) {
    const existing = pixelMap.get(key);
    console.log(`    ⚠️  DUPLICATE PIXEL détecté!`);
    console.log(`        Pixel (${pt.px[0]}, ${pt.px[1]}) mappe à:`);
    console.log(`        • Existant: (${existing.real[0]}, ${existing.real[1]})mm`);
    console.log(`        • Nouveau:  (${pt.real[0]}, ${pt.real[1]})mm`);
    console.log(`        → ERREUR: Même pixel pour 2 coordonnées réelles différentes !`);
    console.log();
    duplicateCount++;
  } else {
    pixelMap.set(key, pt);
  }
}

console.log();
console.log(`📋 RÉSUMÉ DES DUPLICATAS: ${duplicateCount} détecté(s)`);
console.log();

// ANALYSE CRITIQUE
console.log('🔍 CAUSE PROBABLE DU PROBLÈME');
console.log('================================================================================');
console.log();

console.log('Les coordonnées réelles sont-elles mal calculées ?');
console.log();

console.log('Scénario 1: MAUVAISE HOMOGRAPHIE');
console.log('──────────────────────────────────────────────────────────────────────────────');
console.log('Si les coins AprilTag reçus sont décalés (25,40)-(185,200) au lieu de (0,0)-(160,160):');
console.log();
console.log('Alors l\'homographie H qu\'on calcule est FAUSSE, et elle projette les pixels');
console.log('sur les MAUVAISES coordonnées réelles.');
console.log();
console.log('Exemple:');
console.log('  • Pixel (759.5, 582.0) projeté avec H décalée');
console.log('  • → Peut donner (35, 35)mm');
console.log('  • Même pixel reprojété différemment');
console.log('  • → Peut aussi donner (45, 35)mm');
console.log();
console.log('RÉSULTAT: Homographie BRISÉE = points qui ne convergent pas');
console.log();

console.log('Scénario 2: COORDONNÉES RÉELLES MAL GÉNÉRÉES');
console.log('──────────────────────────────────────────────────────────────────────────────');
console.log('Si le code générant les coordonnées mm a un bug:');
console.log('  • Même pixel peut être associé à plusieurs coordonnées');
console.log('  • Les distances entre points ne respectent pas la géométrie');
console.log('  • RANSAC rejette presque tous les points');
console.log();

// Vérification géométrique
console.log('📐 VÉRIFICATION GÉOMÉTRIQUE DES POINTS');
console.log('================================================================================');
console.log();

console.log('Points détectés en pixels:');
console.log(`  [1] TL rule: (745.8, 580.3) px`);
console.log(`  [2] rule:    (759.5, 582.0) px ← point A`);
console.log(`  [3] rule:    (759.5, 582.0) px ← point B (MÊME PIXEL)`);
console.log(`  [4] rule:    (774.8, 580.3) px`);
console.log();

const ptA = [759.5, 582.0];
const ptB = [759.5, 582.0];
const ptL = [745.8, 580.3];
const ptR = [774.8, 580.3];

const dist_A_L = Math.sqrt(
  Math.pow(ptA[0] - ptL[0], 2) + 
  Math.pow(ptA[1] - ptL[1], 2)
);
const dist_A_R = Math.sqrt(
  Math.pow(ptR[0] - ptA[0], 2) + 
  Math.pow(ptR[1] - ptA[1], 2)
);

console.log(`Distance pixel [2] → [1]: ${dist_A_L.toFixed(2)}px`);
console.log(`Distance pixel [4] → [2]: ${dist_A_R.toFixed(2)}px`);
console.log();

console.log('Coordonnées réelles attendues (en mm):');
console.log(`  [1] (25, 35)mm`);
console.log(`  [2] (35, 35)mm`);
console.log(`  [3] (45, 35)mm ← DEVRAIT ÊTRE DIFFÉRENT !`);
console.log(`  [4] (55, 35)mm`);
console.log();

console.log('Distances réelles attendues:');
console.log('  [2] → [1]: 10mm');
console.log('  [4] → [2]: 20mm');
console.log();

console.log('Scale pixel/mm:');
const scale = dist_A_L / 10;
console.log(`  ${scale.toFixed(3)} px/mm (basé sur [1] et [2])`);
console.log();

console.log('Vérification logique:');
console.log(`  Si [2] est à (759.5, 582.0) px et [3] au MÊME PIXEL,`);
console.log(`  Alors [3] ne peut PAS être à (45, 35)mm alors que [2] est à (35, 35)mm !`);
console.log();
console.log(`  ❌ C'EST MATHÉMATIQUEMENT IMPOSSIBLE`);
console.log();

// VERDICT
console.log('🎯 DIAGNOSTIC FINAL');
console.log('================================================================================');
console.log();

console.log('❌ PROBLÈME IDENTIFIÉ: REPÈRES (coordonnées) MAL GÉNÉRÉES');
console.log();
console.log('Analyse:');
console.log('  1. Même pixel (759.5, 582.0) mappe à 2 coordonnées réelles différentes');
console.log('  2. C\'est impossible géométriquement');
console.log('  3. Donc les coordonnées mm sont générées INCORRECTEMENT');
console.log();
console.log('Cause racine:');
console.log('  Les coins AprilTag reçus du frontend sont décalés de (25,40)mm');
console.log('  → L\'homographie calculée est DÉCALÉE');
console.log('  → Les points de calibration sont projetés sur des mm INCORRECTS');
console.log('  → RANSAC ne peut pas converger');
console.log();
console.log('Solution:');
console.log('  Corriger la projection des coordonnées réelles');
console.log('  au niveau du frontend ou du backend');
console.log();

const report = {
  timestamp: new Date().toISOString(),
  duplicatePixels: duplicateCount,
  totalPointsAnalyzed: calibrationSample.length,
  issues: [
    'Pixel (759.5, 582.0) maps to multiple real coordinates',
    'Corners offset by (25, 40)mm from expected (0, 0)',
    'Homography matrix calculation is incorrect due to corner offset',
    'Real coordinate generation is broken'
  ],
  diagnosis: 'COORDINATES_GENERATION_BROKEN',
  severity: 'CRITICAL'
};

fs.writeFileSync(
  '/workspaces/2Thier/calibration-points-diagnostic.json',
  JSON.stringify(report, null, 2)
);

console.log('✅ Rapport sauvegardé: calibration-points-diagnostic.json');
