# 📄 Architecture Feuille A4 - Système de Mesure Intelligent

> **Décision stratégique** : Abandon d'ArUco au profit d'une feuille A4 standard avec marqueurs imprimés  
> Date : 13 janvier 2026

---

## 🎯 Concept

**Feuille A4 = Référence de mesure universelle**

Une simple feuille A4 imprimée contenant :
- ✅ **Logo de l'entreprise** (branding)
- ✅ **QR Code** (lien vers l'app, tracking, infos client)
- ✅ **Zone de calibration** (dimensions connues : 21cm × 29.7cm)
- ✅ **Instructions visuelles** (guide pour l'utilisateur)

---

## 🔧 Workflow Technique

### 1️⃣ Capture Photo
```
Utilisateur → SmartCamera → 3 photos de l'objet + feuille A4
```

### 2️⃣ Détection Automatique
```typescript
// src/lib/marker-detector.ts
MarkerDetector.detect(photo) {
  1. Cherche pixels TRÈS blancs (brightness > 200)
  2. Calcule bounding box de la zone blanche
  3. Valide ratio hauteur/largeur ≈ 1.41 (A4)
  4. Rejette si zone = toute l'image (fond clair)
  5. Retourne 4 coins du rectangle A4
}
```

### 3️⃣ Sélection Meilleure Photo
```typescript
// src/api/measurement-reference.ts - ultra-fusion-detect
for each photo {
  - Détecte feuille A4
  - Score qualité (netteté, contraste, taille A4)
  - Sélectionne la meilleure
}
```

### 4️⃣ Calibration & Mesure
```
A4 détectée → Homographie (perspective) → Pixels to CM
Zone mesure → Coins détectés → Dimensions réelles
```

---

## 📐 Avantages vs ArUco

| Critère | ArUco Magenta | Feuille A4 |
|---------|---------------|------------|
| **Impression** | Marqueur spécial couleur | N'importe quelle imprimante |
| **Coût** | Encre couleur | Papier blanc standard |
| **Robustesse** | Sensible à l'éclairage magenta | Détection blanc = plus facile |
| **Branding** | ❌ Pas possible | ✅ Logo entreprise |
| **Tracking** | ❌ Pas de QR | ✅ QR Code intégré |
| **Taille** | Petite (16.8cm) | Grande (29.7cm) = meilleures mesures |
| **Précision** | Coins magenta sub-pixel | Rectangle blanc + Sharp refinement |

---

## 🎨 Design de la Feuille A4

```
┌─────────────────────────────────────┐
│  📱 QR CODE         🏢 LOGO          │ ← En-tête
│      2THIER                          │
├─────────────────────────────────────┤
│                                      │
│     👇 INSTRUCTIONS VISUELLES        │
│     "Placez l'objet à côté          │
│      de cette feuille"               │
│                                      │
│     ┌──────────────────┐            │
│     │  ZONE CALIBRATION │            │ ← Rectangle de référence
│     │    21 × 29.7 cm   │            │   (dimensions connues)
│     └──────────────────┘            │
│                                      │
│     🎯 Zone de mesure automatique   │
│                                      │
└─────────────────────────────────────┘
   21 cm × 29.7 cm (format A4 standard)
```

---

## 🚀 Évolutions Futures

### Phase 1 : Détection de base (ACTUEL)
- ✅ Détection feuille A4 blanche
- ✅ Validation ratio 1.41
- ✅ 4 coins identifiés

### Phase 2 : Amélioration précision
- 🔄 Détection contours Sharp (sub-pixel)
- 🔄 Homographie avec RANSAC
- 🔄 Correction distorsion perspective

### Phase 3 : Intelligence
- 📋 Reconnaissance QR Code automatique
- 📋 Extraction données client
- 📋 Détection logo (vérification authenticité)
- 📋 OCR instructions

### Phase 4 : Mesures multiples
- 📋 Détection objets multiples dans la scène
- 📋 Mesures 3D (profondeur via triangulation)
- 📋 Export CAD/DXF

---

## 🔬 Seuils de Détection Actuels

```typescript
// src/lib/marker-detector.ts

BRIGHTNESS_THRESHOLD = 200  // Pixels blancs (sur 255)
RGB_VARIATION = 60          // Max diff RGB (neutre)
MIN_PIXELS = 50             // Minimum pour considérer comme A4
A4_RATIO_MIN = 1.15         // Ratio min (tolérance)
A4_RATIO_MAX = 1.70         // Ratio max (tolérance)
A4_RATIO_IDEAL = 1.414      // 29.7 / 21
MAX_IMAGE_OCCUPATION = 0.98 // Si >98% = fond clair rejeté
```

### Ajustements possibles :
- **Fond clair** : Réduire `BRIGHTNESS_THRESHOLD` à 180-190
- **Ombre forte** : Augmenter `RGB_VARIATION` à 80
- **Photo lointaine** : Réduire `MIN_PIXELS` à 30
- **Photo proche** : Assouplir `MAX_IMAGE_OCCUPATION` à 0.99

---

## 📊 Logs de Débogage

```
🔍 MarkerDetector.detect: 1536x2048
📄 DÉTECTION FEUILLE A4 UNIQUEMENT (logo + QR code + zone mesure)
📄 [A4] DÉTECTION FEUILLE BLANCHE - Cherche rectangle A4 blanc...
   ⬜ 20814 pixels blancs détectés (seuil: 200)
   📊 Zone blanche: 85% pixels, 99% × 85% dimensions
   📐 Zone: 1520×1741px (ratio: 1.41, 99% × 85% de l'image)
   🎯 FEUILLE A4 DÉTECTÉE !
   📐 Dimensions: 1520×1741px
   📏 Ratio: 1.41 (A4 idéal: 1.41, tolérance: 1.15-1.70)
   📊 Occupation image: 99% × 85%
   ✅ Coins: TL(8,153) → TR(1528,153) → BR(1528,1894) → BL(8,1894)
✅ 1 feuille(s) A4 détectée(s) - 4 coins identifiés
```

---

## 🛠️ Fichiers Modifiés

| Fichier | Modification |
|---------|--------------|
| `src/lib/marker-detector.ts` | Simplifié `detect()`, retiré ArUco, focus A4 |
| `src/api/measurement-reference.ts` | Pipeline ultra-fusion-detect optimisé pour A4 |
| `src/components/TBLImageFieldWithAI.tsx` | Messages UI adaptés (feuille A4) |

---

## ✅ Checklist Déploiement

- [x] Retirer toutes références ArUco du code
- [x] Optimiser détection A4 (seuils adaptatifs)
- [x] Messages utilisateur clairs ("Placez feuille A4")
- [ ] Design template A4 imprimable (PDF)
- [ ] Génération QR Code dynamique par client
- [ ] Intégration logo entreprise
- [ ] Tests éclairage variés
- [ ] Documentation utilisateur finale

---

*Architecture validée le 13 janvier 2026*
