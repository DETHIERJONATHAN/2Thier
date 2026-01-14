# 📋 BACKLOG V1.3 — Améliorations Métré A4

## 🎯 Objectif V1.3
Rendre le système de calibration **infaillible en conditions réelles** (chantier, environnement difficile)

---

## 🔴 PRIORITÉ 1 : Détection non-planéité feuille

**Problème :**
Feuille A4 ondulée/courbée sur mur crépi = homographie fausse → erreur mesure jusqu'à 10-15cm sur 3m

**Solution technique :**
1. **Analyse variance distances entre points dispersés**
   ```typescript
   // Pseudo-code
   function detectWarpedness(points: Point2D[], homography: Matrix): number {
     const expectedDistances = calculateExpectedDistances(points, layout.json);
     const actualDistances = calculateActualDistances(points, homography);
     const variance = calculateVariance(expectedDistances, actualDistances);
     return variance; // Si >seuil → alerte
   }
   ```

2. **Triangulation 3D simplifiée**
   - Utiliser les 14 points dispersés + ChArUco coins
   - Calculer déviations Z (profondeur) relatives
   - Si déviation >3mm sur 210mm → feuille courbée

3. **Seuils alertes**
   - Variance < 2% : ✅ Feuille plane
   - Variance 2-5% : ⚠️ Warning "Aplatir la feuille"
   - Variance > 5% : 🔴 Rejet "Feuille trop courbée"

**Fichiers impactés :**
- `src/lib/marker-detector.ts` : ajouter méthode `detectPlanarity()`
- `src/api/measurement-reference.ts` : validation post-homographie
- `public/printable/metre-a4-v1.2.layout.json` : référence positions attendues

**Estimation :** 3-5 jours (R&D + tests)

---

## 🟡 PRIORITÉ 2 : Binarisation adaptative (CLAHE)

**Statut actuel :**
✅ Sharp preprocessing déjà bon (`normalize()` + `sharpen()` + `modulate()`)

**Amélioration possible :**
Ajouter CLAHE (Contrast Limited Adaptive Histogram Equalization) pour reflets néons/flash

**Solution :**
```typescript
// Utiliser opencv.js ou sharp avec histogramme adaptatif
const enhancedBuffer = await sharp(imageBuffer)
  .normalize() // Auto-contraste global
  .sharpen({ sigma: 2, m1: 1.5 })
  .modulate({ brightness: 1.1, saturation: 1.5 })
  // TODO: Ajouter CLAHE local (tiles 8x8, clip limit 2.0)
  .toBuffer();
```

**Bibliothèque recommandée :**
- Option 1 : OpenCV.js (CLAHE natif)
- Option 2 : Sharp custom pipeline avec `convolve()`

**Fichiers impactés :**
- `src/api/measurement-reference.ts` ligne 782

**Estimation :** 1-2 jours (tests multiples environnements lumière)

---

## 🟢 PRIORITÉ 3 : UI Guidage distance

**Problème :**
Utilisateur prend photo trop loin → résolution ChArUco insuffisante

**Solution frontend :**
```typescript
// Calcul % surface feuille dans frame caméra
const sheetArea = (boundingBox.width * boundingBox.height);
const frameArea = (videoWidth * videoHeight);
const coveragePercent = (sheetArea / frameArea) * 100;

// Feedback visuel temps réel
if (coveragePercent < 15) {
  overlay.text = "📏 Rapprochez-vous";
  overlay.color = "red";
} else if (coveragePercent > 60) {
  overlay.text = "📏 Trop proche, reculez";
  overlay.color = "orange";
} else {
  overlay.text = "✅ Distance parfaite";
  overlay.color = "green";
}
```

**Seuils optimaux :**
- 20-50% frame = zone idéale (ChArUco résolution suffisante)
- <15% = trop loin (risque flou, pixels insuffisants)
- >60% = trop proche (coins coupés)

**Fichiers impactés :**
- Frontend React (nouveau composant `CameraGuidance.tsx`)
- Hook `useAuthenticatedApi` pour upload photo

**Estimation :** 2h frontend + 30min UX tests

---

## 📊 ROADMAP V1.3

| Tâche | Priorité | Estimation | Dépendances |
|-------|----------|------------|-------------|
| Détection planéité | 🔴 P1 | 3-5j | Layout JSON |
| CLAHE adaptatif | 🟡 P2 | 1-2j | Tests terrain |
| UI guidage distance | 🟢 P3 | 2h | Frontend ready |

**Total effort :** ~1 semaine sprint

---

## ✅ CRITÈRES VALIDATION V1.3

### Tests terrain obligatoires :
1. ✅ Feuille plane mur lisse → précision ±2mm
2. ✅ Feuille ondulée détectée → alerte utilisateur
3. ✅ Photo avec reflet néon → CLAHE compense
4. ✅ Photo 5m distance → UI guide rapprochement
5. ✅ Photo oblique 45° → homographie toujours valide

### Métriques succès :
- Taux rejet fausses mesures : >95% (vs 80% V1.2)
- Temps calibration moyen : <2s (inchangé)
- Taux succès détection conditions difficiles : >90% (vs 70% V1.2)

---

## 📝 NOTES TECHNIQUES

**Formule variance distances (détection planéité) :**
```
Pour chaque paire points (i,j):
  expected_dist[i,j] = distance_euclidienne(layout.points[i], layout.points[j])
  actual_dist[i,j] = distance_pixels(detected[i], detected[j]) / scale_factor
  error[i,j] = abs(expected_dist[i,j] - actual_dist[i,j])

Variance globale = sqrt(sum(error²) / n_pairs)
Seuil alerte = 2% × diagonal_A4 = 2% × 364mm = 7.3mm
```

**Référence IA (verdict 9/10) :**
> "Le point manquant pour le 10/10 serait une gestion explicite de la détection de la non-planéité du papier (via analyse 3D des points dispersés), car c'est la source d'erreur physique #1 sur chantier."

---

**Auteur :** 2Thier CRM Team  
**Date :** 2026-01-13  
**Version métré :** V1.2 (baseline pour tests V1.3)
