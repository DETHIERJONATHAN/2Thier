#!/usr/bin/env node
/**
 * 🔍 SCRIPT DIAGNOSTIC: ANALYSE DÉTAILLÉE DES COINS APRILTAG
 * 
 * Problème identifié dans les logs:
 * - AprilTag coins reçus (25,40) à (185,200) au lieu de (0,0) à (160,160)
 * - DÉCALAGE de (25,40) mm - ce ne sont PAS les coins du carré !
 * - Ces coordonnées semblent être une région intérieure du AprilTag V2.0
 */

import fs from 'fs';

// Données issues des logs du backend
const aprilTagData = {
  expected: {
    tl: [0, 0],
    tr: [160, 0],
    br: [160, 160],
    bl: [0, 160],
    description: "Carré parfait 160×160mm"
  },
  received_frontend: {
    tl: [25, 40],
    tr: [185, 40],
    br: [185, 200],
    bl: [25, 200],
    description: "Région décalée/intérieure"
  },
  pixels_detected: {
    tl: [745.9, 580.3],
    tr: [908.9, 578.1],
    br: [909.1, 745.3],
    bl: [749.2, 749.0],
    description: "Coins en pixels détectés par vision"
  }
};

// Analyse géométrique
console.log('================================================================================');
console.log('🔬 [DIAGNOSTIC APRILTAG CORNERS] Analyse détaillée');
console.log('================================================================================\n');

console.log('📐 COINS ATTENDUS (carré parfait 16×16cm = 160×160mm):');
console.log('   TL: (0, 0) mm');
console.log('   TR: (160, 0) mm');
console.log('   BR: (160, 160) mm');
console.log('   BL: (0, 160) mm');
console.log('   ✅ Géométrie: Carré parfait (ratio 1:1)');
console.log();

console.log('📐 COINS REÇUS DU FRONTEND:');
console.log(`   TL: (${aprilTagData.received_frontend.tl}) mm`);
console.log(`   TR: (${aprilTagData.received_frontend.tr}) mm`);
console.log(`   BR: (${aprilTagData.received_frontend.br}) mm`);
console.log(`   BL: (${aprilTagData.received_frontend.bl}) mm`);
console.log();

// Calcul du décalage
const offset_x = aprilTagData.received_frontend.tl[0] - aprilTagData.expected.tl[0];
const offset_y = aprilTagData.received_frontend.tl[1] - aprilTagData.expected.tl[1];
console.log(`⚠️  DÉCALAGE DÉTECTÉ:`);
console.log(`   X: ${offset_x} mm (offset vers la droite)`);
console.log(`   Y: ${offset_y} mm (offset vers le bas)`);
console.log();

// Dimensions reçues
const width_received = aprilTagData.received_frontend.tr[0] - aprilTagData.received_frontend.tl[0];
const height_received = aprilTagData.received_frontend.bl[1] - aprilTagData.received_frontend.tl[1];
console.log(`📏 DIMENSIONS REÇUES:`);
console.log(`   Largeur: ${width_received}mm (attendu: 160mm, écart: ${((width_received-160)/160*100).toFixed(1)}%)`);
console.log(`   Hauteur: ${height_received}mm (attendu: 160mm, écart: ${((height_received-160)/160*100).toFixed(1)}%)`);
console.log();

// Analyse géométrique
const tl = aprilTagData.received_frontend.tl;
const tr = aprilTagData.received_frontend.tr;
const br = aprilTagData.received_frontend.br;
const bl = aprilTagData.received_frontend.bl;

const top_edge = tr[0] - tl[0];
const bottom_edge = br[0] - bl[0];
const left_edge = bl[1] - tl[1];
const right_edge = br[1] - tr[1];

console.log(`📐 VÉRIFICATION QUADRILATÈRE:`);
console.log(`   Côté haut: ${top_edge}mm`);
console.log(`   Côté bas: ${bottom_edge}mm`);
console.log(`   Côté gauche: ${left_edge}mm`);
console.log(`   Côté droit: ${right_edge}mm`);
console.log();

// Vérification ratio
const ratio_width = width_received / height_received;
console.log(`📊 RATIO W/H: ${ratio_width.toFixed(4)} (attendu: 1.0000 pour carré)`);
if (Math.abs(ratio_width - 1.0) > 0.01) {
  console.log(`   ❌ PROBLÈME: Ce n'est PAS un carré !`);
} else {
  console.log(`   ✅ OK: C'est un carré`);
}
console.log();

// ANALYSE CRITIQUE: Où viennent ces coordonnées (25,40) à (185,200) ?
console.log('🔍 ANALYSE CRITIQUE - D\'OÙ VIENNENT CES COORDONNÉES ?');
console.log('================================================================================');
console.log();

console.log('Hypothèse 1: RÉGION INTÉRIEURE du AprilTag V2.0');
console.log('   - AprilTag structure: 1 centre + 4 coins + ~81 modules');
console.log('   - Les coins détectés (25,40)-(185,200) pourraient être:');
console.log('     * La région contenant les 81 modules (sans bordure)');
console.log('     * ou une région de détection intérieure');
console.log('   - Pixels détectés: 230 points (✅ correct: 1+4+81+144 autres)');
console.log();

console.log('Hypothèse 2: TRANSFORMATION INCORRECTE');
console.log('   - Le frontend transforme-t-il les coins en mm ?');
console.log('   - Y a-t-il une homographie pré-appliquée ?');
console.log('   - Les coordonnées sont-elles dans un repère différent ?');
console.log();

console.log('Hypothèse 3: CONFIGURATION ERRONÉE du MARQUEUR');
console.log('   - La détection AprilTag retourne-t-elle les bons coins ?');
console.log('   - Y a-t-il 2 repères différents utilisés ?');
console.log();

// Données en pixels
console.log('📍 PIXELS DÉTECTÉS (vision):');
const px_tl = aprilTagData.pixels_detected.tl;
const px_tr = aprilTagData.pixels_detected.tr;
const px_br = aprilTagData.pixels_detected.br;
const px_bl = aprilTagData.pixels_detected.bl;

console.log(`   TL: (${px_tl}) px`);
console.log(`   TR: (${px_tr}) px`);
console.log(`   BR: (${px_br}) px`);
console.log(`   BL: (${px_bl}) px`);
console.log();

// Conversion pixels → mm
const px_width = px_tr[0] - px_tl[0];
const px_height = px_bl[1] - px_tl[1];
console.log(`📏 DIMENSIONS EN PIXELS:`);
console.log(`   Largeur: ${px_width.toFixed(1)}px`);
console.log(`   Hauteur: ${px_height.toFixed(1)}px`);
console.log();

const ratio_px = px_width / px_height;
console.log(`   Ratio: ${ratio_px.toFixed(4)} (attendu: 1.0 pour carré)`);
if (Math.abs(ratio_px - 1.0) > 0.05) {
  console.log(`   ⚠️  Distorsion perspective: ${((ratio_px-1)*100).toFixed(1)}%`);
}
console.log();

// Calcul du scale pixel/mm (CRITIQUE!)
const scale_expected = px_width / 160;  // Si l'image fait 160mm de large
console.log(`📐 SCALE PIXEL/MM (assuming 160mm real width):`);
console.log(`   ${scale_expected.toFixed(3)} px/mm`);
console.log();

// VÉRIFICATION: Les coordonnées reçues sont-elles transformées ?
console.log('🔬 VÉRIFICATION: Transformation des coins');
console.log('================================================================================');
console.log();

// Si on applique la scale inverse
const recalc_width_px = width_received * scale_expected;
const recalc_height_px = height_received * scale_expected;

console.log(`Coordonnées reçues converties en pixels (scale=${scale_expected.toFixed(3)}):`);
console.log(`   Largeur reçue: ${width_received}mm × ${scale_expected.toFixed(3)} = ${recalc_width_px.toFixed(1)}px`);
console.log(`   Hauteur reçue: ${height_received}mm × ${scale_expected.toFixed(3)} = ${recalc_height_px.toFixed(1)}px`);
console.log();

// Décalage en pixels
const offset_px_x = offset_x * scale_expected;
const offset_px_y = offset_y * scale_expected;
console.log(`Décalage reçu converti en pixels:`);
console.log(`   X: ${offset_x}mm × ${scale_expected.toFixed(3)} = ${offset_px_x.toFixed(1)}px`);
console.log(`   Y: ${offset_y}mm × ${scale_expected.toFixed(3)} = ${offset_px_y.toFixed(1)}px`);
console.log();

// VERDICT
console.log('🎯 DIAGNOSTIC');
console.log('================================================================================');
console.log();

const hasCorrectSize = Math.abs(width_received - 160) < 2 && Math.abs(height_received - 160) < 2;
const hasOffset = offset_x > 10 || offset_y > 10;
const hasSkew = Math.abs(ratio_width - 1.0) > 0.02;

console.log('PROBLÈMES IDENTIFIÉS:');
console.log();

if (hasOffset) {
  console.log(`❌ 1. DÉCALAGE (offset) de (${offset_x}, ${offset_y})mm`);
  console.log(`     Les coins ne commencent pas à (0,0) comme attendu`);
  console.log(`     → Cela crée une FAUSSE HOMOGRAPHIE`);
  console.log();
}

if (hasSkew) {
  console.log(`❌ 2. DISTORSION (skew) - ratio=${ratio_width.toFixed(4)} au lieu de 1.0`);
  console.log(`     Le quadrilatère reçu n'est PAS un carré`);
  console.log(`     → Cela amplifie les erreurs RANSAC`);
  console.log();
}

if (!hasCorrectSize) {
  console.log(`❌ 3. TAILLE INCORRECTE`);
  console.log(`     Reçu: ${width_received}×${height_received}mm vs attendu: 160×160mm`);
  console.log();
}

console.log('ROOT CAUSE:');
console.log('═══════════════════════════════════════════════════════════════════════════════');
if (hasOffset) {
  console.log('🔴 LES COINS REÇUS NE CORRESPONDENT PAS AU CARRÉ DE RÉFÉRENCE!');
  console.log();
  console.log('Le frontend envoie les coordonnées d\'une région intérieure (25,40)-(185,200)');
  console.log('au lieu des coins du carré complet (0,0)-(160,160).');
  console.log();
  console.log('Cela cause:');
  console.log('  • Homographie DÉCALÉE et DÉFORMÉE');
  console.log('  • Points de calibration MAL PROJETÉS');
  console.log('  • RANSAC trouve trop peu d\'inliers (101/226 ← trop bas)');
  console.log('  • Erreur reprojection: 5.36mm (← trop haute, cible <3mm)');
  console.log('  • Qualité: 70.8% (← marginale, cible >75%)');
  console.log();
  console.log('C\'EST UN PROBLÈME DE REPÈRES, PAS DE MATHÉMATIQUES!');
  console.log('═══════════════════════════════════════════════════════════════════════════════');
}

// Sauvegarde rapport
const report = {
  timestamp: new Date().toISOString(),
  apriltag_expected: aprilTagData.expected,
  apriltag_received: aprilTagData.received_frontend,
  apriltag_pixels: aprilTagData.pixels_detected,
  offset: { x: offset_x, y: offset_y },
  dimensions: { width: width_received, height: height_received },
  ratio: ratio_width,
  hasOffset,
  hasSkew,
  hasCorrectSize,
  diagnosis: 'CORNERS_OFFSET_DETECTED'
};

fs.writeFileSync(
  '/workspaces/2Thier/apriltag-corners-diagnostic.json',
  JSON.stringify(report, null, 2)
);

console.log('\n✅ Rapport sauvegardé: apriltag-corners-diagnostic.json');
