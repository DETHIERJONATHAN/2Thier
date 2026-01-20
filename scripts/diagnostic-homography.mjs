#!/usr/bin/env node

/**
 * 🎯 Script de diagnostic HOMOGRAPHIE
 * Teste si le problème vient de la transformation perspective
 * 
 * Porte réelle: 82 × 202 cm
 * Marqueur: AprilTag Métré V2.0 (16×16cm, mais détecté 89.3×92.9px d'asymétrie 3.9%)
 */

const PORTE_REELLE = { largeur: 82, hauteur: 202 };
const MARQUEUR_REEL = { largeur: 16, hauteur: 16 }; // cm
const MARQUEUR_PIXELS = { largeur: 89.3, hauteur: 92.9 }; // asymétrie 3.9%!
const ASYMETRIE = 0.9613; // (89.3 / 92.9 = 0.9613)

// Résultats RANSAC observés
const resultatsObserves = [
  { largeur: 108.28, hauteur: 209.07, inliers: 102 },
  { largeur: 99.55, hauteur: 211.46, inliers: 102 },
  { largeur: 86.44, hauteur: 201.20, inliers: 101 },
  { largeur: 83.47, hauteur: 179.31, inliers: 100 }
];

console.log('='.repeat(80));
console.log('🔍 DIAGNOSTIC HOMOGRAPHIE - INSTABILITÉ RANSAC');
console.log('='.repeat(80));

console.log('\n📐 DONNÉES ATTENDUES:');
console.log(`   Porte réelle:        ${PORTE_REELLE.largeur} × ${PORTE_REELLE.hauteur} cm`);
console.log(`   Marqueur réel:       ${MARQUEUR_REEL.largeur} × ${MARQUEUR_REEL.hauteur} cm`);
console.log(`   Ratio porte/marqueur: ${(PORTE_REELLE.largeur / MARQUEUR_REEL.largeur).toFixed(2)}x (largeur) × ${(PORTE_REELLE.hauteur / MARQUEUR_REEL.hauteur).toFixed(2)}x (hauteur)`);

console.log('\n🎯 MARQUEUR DÉTECTÉ:');
console.log(`   Pixels:              ${MARQUEUR_PIXELS.largeur.toFixed(1)} × ${MARQUEUR_PIXELS.hauteur.toFixed(1)} px`);
console.log(`   Asymétrie:           ${((1 - ASYMETRIE) * 100).toFixed(1)}% (carré attendu)`);

console.log('\n📊 RÉSULTATS RANSAC OBSERVÉS:');
console.log('-'.repeat(80));

resultatsObserves.forEach((r, i) => {
  const erreurLargeur = Math.abs(r.largeur - PORTE_REELLE.largeur);
  const erreurHauteur = Math.abs(r.hauteur - PORTE_REELLE.hauteur);
  const erreurLargeurPct = (erreurLargeur / PORTE_REELLE.largeur * 100).toFixed(1);
  const erreurHauteurPct = (erreurHauteur / PORTE_REELLE.hauteur * 100).toFixed(1);

  console.log(`\n${i + 1}. RANSAC Call #${i + 1}:`);
  console.log(`   Résultat:     ${r.largeur.toFixed(2)} × ${r.hauteur.toFixed(2)} cm`);
  console.log(`   Erreur:       ${erreurLargeur.toFixed(2)} cm (${erreurLargeurPct}%) × ${erreurHauteur.toFixed(2)} cm (${erreurHauteurPct}%)`);
  console.log(`   Inliers:      ${r.inliers}/230 points (${(r.inliers / 230 * 100).toFixed(1)}%)`);
  console.log(`   ` + (erreurHauteur < 10 ? '✅ ACCEPTABLE' : '🔴 TRÈS MAUVAIS'));
});

// Analyse statistique
console.log('\n\n📈 ANALYSE STATISTIQUE:');
console.log('-'.repeat(80));

const largeurs = resultatsObserves.map(r => r.largeur);
const hauteurs = resultatsObserves.map(r => r.hauteur);

const avgLargeur = largeurs.reduce((a, b) => a + b) / largeurs.length;
const avgHauteur = hauteurs.reduce((a, b) => a + b) / hauteurs.length;
const stdLargeur = Math.sqrt(largeurs.reduce((a, b) => a + Math.pow(b - avgLargeur, 2)) / largeurs.length);
const stdHauteur = Math.sqrt(hauteurs.reduce((a, b) => a + Math.pow(b - avgHauteur, 2)) / hauteurs.length);

console.log(`\nLargeur (attendu: ${PORTE_REELLE.largeur} cm):`);
console.log(`   Moyenne:      ${avgLargeur.toFixed(2)} cm`);
console.log(`   Écart-type:   ${stdLargeur.toFixed(2)} cm (${(stdLargeur / avgLargeur * 100).toFixed(1)}%)`);
console.log(`   Min/Max:      ${Math.min(...largeurs).toFixed(2)} / ${Math.max(...largeurs).toFixed(2)} cm`);
console.log(`   Erreur moy:   ${Math.abs(avgLargeur - PORTE_REELLE.largeur).toFixed(2)} cm (${(Math.abs(avgLargeur - PORTE_REELLE.largeur) / PORTE_REELLE.largeur * 100).toFixed(1)}%)`);

console.log(`\nHauteur (attendu: ${PORTE_REELLE.hauteur} cm):`);
console.log(`   Moyenne:      ${avgHauteur.toFixed(2)} cm`);
console.log(`   Écart-type:   ${stdHauteur.toFixed(2)} cm (${(stdHauteur / avgHauteur * 100).toFixed(1)}%)`);
console.log(`   Min/Max:      ${Math.min(...hauteurs).toFixed(2)} / ${Math.max(...hauteurs).toFixed(2)} cm`);
console.log(`   Erreur moy:   ${Math.abs(avgHauteur - PORTE_REELLE.hauteur).toFixed(2)} cm (${(Math.abs(avgHauteur - PORTE_REELLE.hauteur) / PORTE_REELLE.hauteur * 100).toFixed(1)}%)`);

// Déterminer le problème
console.log('\n\n🔴 PROBLÈME IDENTIFIÉ:');
console.log('-'.repeat(80));

console.log(`\n1️⃣  RANSAC PICKING POINTS ALÉATOIREMENT`);
console.log(`   • Seulement ${(100 / 230 * 100).toFixed(1)}% des 230 points sont utilisés`);
console.log(`   • Le nombre d'inliers diminue: 102 → 100 points`);
console.log(`   • Différents inliers = différentes homographies = résultats différents`);

console.log(`\n2️⃣  ASYMÉTRIE MARQUEUR NON COMPENSÉE`);
console.log(`   • Détecté: 89.3×92.9 px au lieu de carré 16×16cm`);
console.log(`   • Asymétrie: ${((1 - ASYMETRIE) * 100).toFixed(1)}%`);
console.log(`   • ⚠️  Cette asymétrie s'amplifie sur objets plus grands!`);
console.log(`   • Ratio objet: largeur=${(PORTE_REELLE.largeur / MARQUEUR_REEL.largeur).toFixed(2)}x vs hauteur=${(PORTE_REELLE.hauteur / MARQUEUR_REEL.hauteur).toFixed(2)}x`);
console.log(`   • Distorsion amplifiée: ${((1 - ASYMETRIE) * (PORTE_REELLE.hauteur / MARQUEUR_REEL.hauteur)).toFixed(1)}cm!`);

console.log(`\n3️⃣  PERSPECTIVE DÉTECTÉE`);
console.log(`   • Variations mesures opposées: 6-13% (> 5% = perspective détectée)`);
console.log(`   • Le système applique une homographie pour corriger`);
console.log(`   • ❌ MAIS: l'homographie amplifie l'asymétrie du marqueur!`);

console.log(`\n4️⃣  FUSEDCORNERS STABLES`);
console.log(`   • Les fusedCorners (48.6%, 28.3%) ne changent JAMAIS`);
console.log(`   • C'est normal - c'est juste le marqueur détecté une fois`);
console.log(`   • Changent: les objectPoints (coins porte dessinés par utilisateur)`);

// Solution
console.log('\n\n💡 SOLUTIONS:');
console.log('-'.repeat(80));

console.log(`\n✅ Solution 1: RANSAC + LM (Levenberg-Marquardt)`);
console.log(`   • Utiliser TOUS les 230 points, pas juste les inliers`);
console.log(`   • LM affine itérativement la meilleure homographie`);
console.log(`   • Actuellement: ${(resultatsObserves[0].inliers / 230 * 100).toFixed(1)}% des points → ${((230 - resultatsObserves[0].inliers) / 230 * 100).toFixed(1)}% ignorés!`);

console.log(`\n✅ Solution 2: Corriger asymétrie marqueur`);
console.log(`   • Détecter et normaliser le ratio W/H du marqueur`);
console.log(`   • Appliquer correcteur: w *= sqrt(1/asymétrie) = w *= ${Math.sqrt(1/ASYMETRIE).toFixed(4)}`);
console.log(`   • Compenser AVANT calcul homographie`);

console.log(`\n✅ Solution 3: Calibration multi-points`);
console.log(`   • Utiliser plusieurs mesures référence (pas juste le marqueur)`);
console.log(`   • Ajouter détection coins de porte automatique`);
console.log(`   • Valider avec distance points → lignes attendues`);

console.log(`\n✅ Solution 4: Validation post-RANSAC`);
console.log(`   • Si résultat > 10% d'erreur estimée: rejeter`);
console.log(`   • Forcer l'utilisateur à relancer`);
console.log(`   • Ou utiliser moyenne mobile: (ancien + nouveau) / 2`);

console.log('\n' + '='.repeat(80));
console.log('✅ Diagnostic terminé');
console.log('='.repeat(80) + '\n');
