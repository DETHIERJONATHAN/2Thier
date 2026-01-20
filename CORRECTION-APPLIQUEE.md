# ✅ Correction du Bug AprilTag V2.0 - APPLIQUÉE

**Date:** 17 janvier 2026, 20:20  
**Statut:** ✅ CHANGEMENTS APPLIQUÉS

---

## 📋 Problème Identifié

Les coins AprilTag V2.0 étaient définis avec un **offset de (25,40)mm** au lieu de (0,0):
- ❌ AVANT: TL=(25,40), TR=(185,40), BR=(185,200), BL=(25,200)
- ✅ APRÈS: TL=(0,0), TR=(160,0), BR=(160,160), BL=(0,160)

Cet offset était la **cause racine** de:
- ⚠️ RANSAC quality = 70.8% (au lieu de >85%)
- ⚠️ Inliers = 101/226 (au lieu de >113)
- ⚠️ Reprojection error = 5.36mm (au lieu de <3mm)
- ⚠️ Mesures instables ±3cm

---

## 🔧 Fichiers Modifiés

### `/workspaces/2Thier/src/lib/metre-a4-v2-detector.ts`

**Changement 1 - Ligne 71: `corners` definition**
```typescript
// ❌ AVANT:
corners: {
  topLeft:     { x: 25,  y: 40 },
  topRight:    { x: 185, y: 40 },
  bottomRight: { x: 185, y: 200 },
  bottomLeft:  { x: 25,  y: 200 }
}

// ✅ APRÈS:
corners: {
  topLeft:     { x: 0,   y: 0 },
  topRight:    { x: 160, y: 0 },
  bottomRight: { x: 160, y: 160 },
  bottomLeft:  { x: 0,   y: 160 }
}
```

**Changement 2 - Ligne 128: `cornerCrosses.positions`**
```typescript
// ❌ AVANT:
positions: [
  { x: 25,  y: 40 },
  { x: 185, y: 40 },
  { x: 185, y: 200 },
  { x: 25,  y: 200 }
]

// ✅ APRÈS:
positions: [
  { x: 0,   y: 0 },
  { x: 160, y: 0 },
  { x: 160, y: 160 },
  { x: 0,   y: 160 }
]
```

**Changement 3 - Ligne 374: `realCorners` calculation**
```typescript
// ❌ AVANT:
const realCorners: Point2D[] = [
  { x: tagCenter.x - tagHalf, y: tagCenter.y - tagHalf }, // TL (25, 40)
  { x: tagCenter.x + tagHalf, y: tagCenter.y - tagHalf }, // TR (185, 40)
  { x: tagCenter.x + tagHalf, y: tagCenter.y + tagHalf }, // BR (185, 200)
  { x: tagCenter.x - tagHalf, y: tagCenter.y + tagHalf }  // BL (25, 200)
];

// ✅ APRÈS:
const realCorners: Point2D[] = [
  specs.centralAprilTag.corners.topLeft,      // TL (0, 0)
  specs.centralAprilTag.corners.topRight,     // TR (160, 0)
  specs.centralAprilTag.corners.bottomRight,  // BR (160, 160)
  specs.centralAprilTag.corners.bottomLeft    // BL (0, 160)
];
```

---

## 📊 Impact Attendu

| Métrique | Avant | Après | Cible |
|----------|-------|-------|-------|
| RANSAC Quality | 70.8% | >85% | >75% |
| Inliers | 101/226 | >180/226 | >113 |
| Reprojection Error | 5.36mm | <2mm | <3mm |
| Measurement Stability | ±3cm | ±1-2mm | ±1-2mm |

---

## 🧪 Tests à Effectuer

### 1️⃣ Vider le cache du navigateur
```bash
# Hard refresh: Ctrl+Shift+R (Windows/Linux) ou Cmd+Shift+R (Mac)
```

### 2️⃣ Prendre une nouvelle photo du test
- Prendre 3 photos du même objet (ex: porte 82×202cm)
- Vérifier que les mesures sont **cohérentes** entre les 3 tentatives

### 3️⃣ Vérifier les logs du serveur
```bash
# Chercher ce diagnostic:
# ✅ [DIAGNOSTIC] COINS APRILTAG REÇUS DU FRONTEND (AVANT FILTRAGE):
#    [0] TL pixel: (...) → real: (0, 0) mm        ← DOIT ÊTRE (0,0) !
#    [1] TR pixel: (...) → real: (160, 0) mm      ← DOIT ÊTRE (160,0) !
#    [2] BR pixel: (...) → real: (160, 160) mm    ← DOIT ÊTRE (160,160) !
#    [3] BL pixel: (...) → real: (0, 160) mm      ← DOIT ÊTRE (0,160) !
```

### 4️⃣ Vérifier les métriques RANSAC
```bash
# Chercher:
# ✅ RANSAC: XXX/226 inliers après 10000 itérations
# 🎯 Qualité: YY.Y%
#
# DOIT ÊTRE: >180 inliers et >85% qualité
```

---

## ⚡ Prochaines Étapes

1. **Vérifier les logs** - Confirmer que les coins sont maintenant (0,0)-(160,160)
2. **Tester une mesure** - Vérifier que RANSAC quality a augmenté
3. **Comparer avec avant** - S'assurer que la stabilité s'est améliorée
4. **Itérer si nécessaire** - Si RANSAC quality reste basse, investiguer d'autres facteurs

---

## 📝 Notes Importantes

- ✅ **Serveur relancé automatiquement** (tsx watch détecte les changements)
- ⚠️ **Cache navigateur doit être vidé** (Ctrl+Shift+R) pour charger le nouveau code frontend
- 🎯 **Test recommendation**: Prendre plusieurs photos du même objet pour valider stabilité

---

Generated: 2026-01-17 20:20 UTC
