#!/usr/bin/env node

/**
 * 🔴 ANALYSE ROOT CAUSE DU BUG
 * 
 * Le problème identifié dans ultra-precision-ransac.ts ligne ~100-110
 */

console.log('='.repeat(90));
console.log('🔴 ROOT CAUSE ANALYSIS - Pourquoi les mesures sont instables');
console.log('='.repeat(90));

console.log(`
\n1️⃣  RANSAC PICKING ALÉATOIREMENT

   Code: ultra-precision-ransac.ts, ligne 95-110
   
   for (let iter = 0; iter < maxIterations; iter++) {
     const indices = randomSampleIndices(srcPoints.length, 4); ❌ ALÉATOIRE!
     const sample4Src = indices.map(i => srcPoints[i]);
     const sample4Dst = indices.map(i => dstPoints[i]);
     
     // Calculer homographie avec ces 4 points aléatoires
     const H = computeHomographyDLT(sample4Src, sample4Dst);
   }

   Problème:
   • À chaque appel /ultra-precision-compute, RANSAC choisit des points différents
   • Même si les 230 points détectés sont IDENTIQUES
   • → Homographies différentes = mesures différentes (82-108cm pour 82cm réel!)
   
   Evidence:
   • Appel 1: 108.28 cm (inliers 102/230)
   • Appel 2: 99.55 cm  (inliers 102/230)
   • Appel 3: 86.44 cm  (inliers 101/230)  ✅ Proche de la vraie valeur
   • Appel 4: 83.47 cm  (inliers 100/230)  ✅ Très proche

\n2️⃣  RANSAC SÉLECTIONNE SEULEMENT 40-44% DES POINTS

   Code: ultra-precision-ransac.ts, ligne 65-70
   
   const inlierThresholdMm = Math.max(3.0, ...); // 3mm seuil
   const minInliers = srcPoints.length < 30
     ? Math.max(6, Math.floor(srcPoints.length * 0.35)) // 35%
     : Math.max(12, Math.floor(srcPoints.length * 0.50)); // 50%

   Avec 230 points détectés:
   • Seuil minimum: 230 * 0.35 = 80 inliers ✅
   • Réel: 100-102 inliers = 43-44% seulement
   • Données supprimées: 128-130 points (55-56%)!

   Pourquoi 130 points sont rejetés?
   → Asymétrie du marqueur 3.9% (89.3 × 92.9 px) se propage!

\n3️⃣  ASYMÉTRIE MARQUEUR AMPLIFIÉE

   Code: ultra-precision-ransac.ts, ligne 925-935 (measurement-reference.ts)
   
   Détecté: 89.3 × 92.9 px (asymétrie 3.9%)
   Réel: 16 × 16 cm (carré parfait)
   
   SANS correction homographique:
   Marqueur 16×16cm à 89.3×92.9px
   → Porte 82×202cm à ???
   
   Si vous utilisez le ratio simple:
   - Largeur: (82cm / 16cm) = 5.125×
   - Hauteur: (202cm / 16cm) = 12.625×
   
   Et le marqueur est asymétrique de 3.9%:
   - Erreur largeur: +5% (à cause de 89.3px)
   - Erreur hauteur: -3% (à cause de 92.9px)
   
   Sur une porte 82×202:
   - Largeur FAUX: 82 * 1.05 = 86cm ❌
   - Hauteur FAUX: 202 * 0.97 = 196cm ❌

\n4️⃣  HOMOGRAPHIE NE CORRIGE PAS ENTIÈREMENT

   Code: ultra-precision-ransac.ts, ligne 116-125
   
   // Compter inliers avec cette homographie
   const inlierIndices: number[] = [];
   for (let i = 0; i < srcPoints.length; i++) {
     const transformed = applyHomography(H, srcPoints[i]);
     const errorMm = distance(transformed, dstPoints[i]);
     if (errorMm < inlierThresholdMm) { ❌ SEUIL 3MM!
       inlierIndices.push(i);
     }
   }

   Problème:
   • Seuil 3mm est TROP STRICT pour 230 points décorrélés
   • Les dots dispersés ont probablement 2-5mm d'erreur naturelle
   • Les coins AprilTag (filtrés ligne 912) ont ~9-14mm d'erreur
   • → Beaucoup de bons points sont rejetés comme outliers!

\n5️⃣  RÉSULTAT FINAL: INSTABILITÉ CERTIFIÉE

   Chaque appel:
   ✅ ~102 inliers sélectionnés (sur 230)
   ✅ Homographie calculée avec ces inliers
   ❌ Mais les 102 points varient aléatoirement
   ❌ → Homographies différentes
   ❌ → Mesures différentes: 83-108cm pour 82cm!
   ❌ → Variations jusqu'à ±25cm (30% d'erreur!)

`);

console.log('\n' + '='.repeat(90));
console.log('💡 SOLUTIONS');
console.log('='.repeat(90));

console.log(`
✅ SOLUTION 1: SEEDER LE GÉNÉRATEUR ALÉATOIRE

   Code à ajouter dans computeUltraPrecisionHomography():
   
   // AVANT la boucle RANSAC
   let seed = hashSourcePoints(srcPoints);
   let prng = seededRandom(seed);
   
   for (let iter = 0; iter < maxIterations; iter++) {
     const indices = randomSampleIndicesSeeded(srcPoints.length, 4, prng);
     // ...
   }
   
   Avantages:
   ✅ Mêmes points détectés → mêmes indices RANSAC → même homographie
   ✅ Mesures STABLES (répétable)
   ✅ Facile à implémenter
   
   Inconvénients:
   ❌ Si données d'entrée changent légèrement (1 point en plus), tout change
   
✅ SOLUTION 2: UTILISER TOUS LES POINTS (PAS RANSAC)

   Remplacer RANSAC par une seule optimisation LM sur TOUS les 230 points:
   
   // Au lieu de:
   //   for (let iter = 0; iter < maxIterations; iter++)
   //     const indices = randomSampleIndices(...);
   
   // Faire:
   const H = initializeHomographyDLT(srcPoints, dstPoints);
   const HRefined = levenbergMarquardtOptimize(
     H,
     srcPoints,
     dstPoints,
     maxIterations = 1000,
     tolerance = 1e-6
   );
   
   Avantages:
   ✅ Déterministe (pas d'aléatoire)
   ✅ Plus précis (utilise TOUS les 230 points)
   ✅ Converge toujours vers optimum global
   
   Inconvénients:
   ❌ Sensible aux outliers (si points corrompus)
   
✅ SOLUTION 3: FUSION RANSAC + TOUTS LES POINTS

   1. RANSAC pour identifier les inliers (100-102 points)
   2. LM UNIQUEMENT sur les inliers
   3. Vérifier stabilité en re-testant les outliers
   
   Code:
   
   // Étape 1: RANSAC classique
   const inlierIndices = ransacFindInliers(srcPoints, dstPoints, ...);
   
   // Étape 2: LM sur inliers uniquement
   const inlierSrc = inlierIndices.map(i => srcPoints[i]);
   const inlierDst = inlierIndices.map(i => dstPoints[i]);
   const HRefined = levenbergMarquardtOptimize(H, inlierSrc, inlierDst);
   
   // Étape 3: Vérifier outliers restants
   const finalInliers = [];
   for (let i = 0; i < srcPoints.length; i++) {
     const error = distance(applyHomography(HRefined, srcPoints[i]), dstPoints[i]);
     if (error < 5mm) { // Seuil moins strict
       finalInliers.push(i);
     }
   }
   
   Avantages:
   ✅ Robuste aux mauvais points (RANSAC filtre)
   ✅ Converge vers optimum global (LM sur inliers)
   ✅ Résultats stables (pas aléatoire après RANSAC)
   
✅ SOLUTION 4: CORRIGER ASYMÉTRIE MARQUEUR EN AMONT

   Détecté: 89.3 × 92.9 px = asymétrie 0.9613
   
   Avant RANSAC, normaliser:
   
   srcPointsNormalized = srcPoints.map(p => ({
     x: p.x * Math.sqrt(1 / 0.9613), // Compenser largeur
     y: p.y,
     ...
   }));
   
   const H = computeHomography(srcPointsNormalized, dstPoints);
   
   Avantages:
   ✅ Élimine l'asymétrie à la source
   ✅ Les 230 points deviennent plus cohérents
   ✅ Plus d'inliers, meilleure homographie
   
✅ SOLUTION 5: VALIDER RÉSULTAT AVEC CONTRAINTES

   Après calcul, vérifier:
   
   const largeur = result.largeur_cm;
   const hauteur = result.hauteur_cm;
   
   // Ratio porte doit être > 1.0 (hauteur > largeur)
   if (hauteur / largeur < 1.5) {
     return error("Ratios invalides détectés");
   }
   
   // Incertitude ne doit pas dépasser 5cm
   if (result.uncertainty > 5) {
     return error("Incertitude trop élevée");
   }
   
   Avantages:
   ✅ Détecte immédiatement les résultats aberrants
   ✅ Force l'utilisateur à retirer et refaire si nécessaire
`);

console.log('\n' + '='.repeat(90));
console.log('🎯 RECOMMANDATION');
console.log('='.repeat(90));

console.log(`
Implémenter SOLUTION 3 (RANSAC + LM sur inliers):

1. Garder RANSAC pour filtrer les mauvais points (robustesse)
2. Appliquer LM UNIQUEMENT sur les inliers (stabilité)
3. Seeder RANSAC avec hash des données d'entrée (déterminisme)

Résultat attendu:
✅ Mesures stables: écart < 2cm (au lieu de ±25cm)
✅ Déterministe: même données = même résultat toujours
✅ Robuste: tolère les 55-56% d'outliers détectés

Pour la porte 82×202:
✅ Attendu: 82 × 202 cm
✅ Tolérance: 80-84 × 200-204 cm
✅ Actuellement: 83-108 × 179-211 cm ❌

`);

console.log('='.repeat(90) + '\n');
