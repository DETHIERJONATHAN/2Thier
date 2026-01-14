# 📐 MÉTRÉ A4 V1.2 - MISE EN PLACE COMPLÈTE

> **Document de référence** pour la nouvelle architecture propre de détection et calibration du Métré A4 V1.2  
> **Date** : 14 janvier 2026  
> **Status** : Implémentation en cours  
> **Vision** : Système ULTRA-PROPRE utilisant UNIQUEMENT 2 modules propres + backend minimaliste

---

## 🎯 VISION GÉNÉRALE

### Ancien système ❌
- Code volumineux et entrelacé
- Multiples anciennes approches (Gemini, RANSAC, magic clustering...)
- Données mal encodées/transformées
- Dimensions incorrectes (13×13cm au lieu de 13×21.7cm)

### Nouveau système ✅
- **2 modules ultra-propres** : détection + sélection photo
- **Backend minimaliste** : juste des routes API simples
- **Frontend intact** : utilise les mêmes APIs, mais elles retournent les BONNES données
- **Zéro régression** : le visuel du frontend ne change pas

---

## 📦 LES 2 MODULES PROPRES

### 1️⃣ `metre-a4-complete-detector.ts`
**Localisation** : `/workspaces/2Thier/src/lib/metre-a4-complete-detector.ts`

**Responsabilité** : Détection 100% autonome des points de calibration AprilTag Métré V1.2

**Entrée** :
```typescript
imageData: Uint8ClampedArray | Buffer  // Image RGBA
width: number                            // Largeur pixels
height: number                           // Hauteur pixels
```

**Sortie** :
```typescript
{
  success: boolean;
  points: UltraPrecisionPoint[];  // 4 AprilTags + 12 dots + 25 ChArUco = 41+ points
  breakdown: {
    aprilTags: 4,
    referenceDots: 12,
    charucoCorners: 25,
    total: 41
  };
  aprilTagCenters: [TL, TR, BL, BR];  // 4 coins en pixels
  homography: {
    matrix: number[][];                  // Matrice 3×3
    quality: number;                     // 0-100
    reprojectionErrorMm: number;         // Erreur en mm
  };
  estimatedPrecision: "±0.5mm" | "±1mm" | "±2mm" | "±5mm";
}
```

**Flux interne** :
1. Détecte AprilTags TAG36H11 aux 4 coins (IDs: 2, 7, 14, 21)
2. Détecte 12 points noirs dispersés (4mm diamètre)
3. Détecte 25 coins internes ChArUco 6×6
4. Calcule homographie robuste (105+ points possibles)
5. Retourne résultat avec qualité

**Dimensions hardcodées** :
- AprilTag Métré V1.2 : **130mm × 217mm** (13.0cm × 21.7cm)
- Espacement centres AprilTags : **130mm horizontale, 217mm verticale**
- Cela fait un ratio **0.598** (NOT 1.0)

---

### 2️⃣ `photo-quality-analyzer.ts`
**Localisation** : `/workspaces/2Thier/src/lib/photo-quality-analyzer.ts`

**Responsabilité** : Sélection intelligente de la meilleure photo parmi N

**Entrée** :
```typescript
photos: PhotoCandidate[] = [{
  id: string;
  imageData: Uint8ClampedArray | Buffer;
  width: number;
  height: number;
  detection: MetreA4CompleteDetectionResult;  // Résultat de meter-a4-complete-detector
  timestamp: number;
}]
```

**Sortie** :
```typescript
{
  bestPhoto: PhotoCandidate;
  bestScore: PhotoQualityScore;  // Score 0-100
  allScores: PhotoQualityScore[];
  stats: {
    totalPhotos: number;
    averageScore: number;
    scoreRange: [min, max];
    improvement: number;  // % amélioration vs moyenne
  };
}
```

**Critères de scoring** (0-100) :
- **Netteté (40%)** : Force des bords, contraste local, variance Laplacian
- **Qualité homographie (35%)** : Erreur reprojection, ratio inliers RANSAC, couverture spatiale
- **Conditions capture (25%)** : Angle de vue, uniformité éclairage, flou de mouvement

**Résultat** :
- Score total = moyenne pondérée des 3 critères
- Avertissements si détection mauvaise
- Amélioration % vs moyenne des autres photos

---

## 🏗️ ARCHITECTURE BACKEND NOUVELLE

### Route 1️⃣ : `POST /api/measurement-reference/ultra-fusion-detect`

**Objectif** : Détecter AprilTags sur N photos et sélectionner la meilleure

**Entrée** :
```typescript
{
  photos: [{
    base64: string;        // Image en base64
    mimeType: string;      // "image/jpeg"
    metadata?: object;     // Optionnel
  }]
  // Minimum 1 photo, mais 3+ pour sélection optimale
}
```

**Flux interne** :
1. Pour chaque photo :
   - Décoder base64 → RGBA
   - Appeler `detectMetreA4Complete(rgba, width, height)`
   - Créer `PhotoCandidate` avec résultat
2. Appeler `selectBestPhoto(candidates)`
3. Formater réponse pour frontend

**Sortie** :
```typescript
{
  success: true;
  method: "ultra-precision-best-photo";
  bestPhotoBase64: string;
  fusedCorners: {
    topLeft: { x: 0-100, y: 0-100 };    // En pourcentages
    topRight: { x, y };
    bottomRight: { x, y };
    bottomLeft: { x, y };
  };
  detectionMethod: "AprilTag-Metre-V1.2-Ultra";
  markerSizeCm: 13.0;
  markerHeightCm: 21.7;  // 🎯 NOUVEAU : Hauteur explicite
  homographyMatrix: number[][];
  reprojectionErrorMm: number;
  ultraPrecision: {
    totalPoints: 41+;
    aprilTags: 4;
    referenceDots: 12;
    charucoCorners: 25;
    quality: 0-100;
    estimatedPrecision: "±0.5mm";
  };
  bestPhoto: {
    index: 0;
    score: 85.3;
    sharpness: 90;
    homographyQuality: 88;
    captureConditions: 75;
    warnings: [];
  };
}
```

---

### Route 2️⃣ : `POST /api/measurement-reference/compute-dimensions-simple`

**Objectif** : Calculer dimensions d'un objet mesuré

**Entrée** :
```typescript
{
  fusedCorners: {         // Coins AprilTag en % (réponse route 1)
    topLeft: { x, y };
    topRight: { x, y };
    bottomRight: { x, y };
    bottomLeft: { x, y };
  };
  objectPoints: [         // 4 points cliqués sur canvas (pixels canvas)
    { x, y },             // TL
    { x, y },             // TR
    { x, y },             // BR
    { x, y }              // BL
  ];
  imageWidth: number;     // Largeur image originale
  imageHeight: number;    // Hauteur image originale
  markerSizeCm: 13.0;     // Largeur marqueur
  markerHeightCm: 21.7;   // 🎯 NOUVEAU : Hauteur marqueur
  detectionMethod: "AprilTag-Metre-V1.2-Ultra";  // Pour logs
  canvasScale: 1.0;       // Ratio canvas/image si différent
  detectionQuality: 95;   // % confiance détection
  reprojectionErrorMm: 1.5;
}
```

**Flux interne** :
1. Convertir `fusedCorners` de % vers pixels image
2. Convertir `objectPoints` de canvas vers pixels image (utiliser `canvasScale`)
3. Construire `CalibrationData` et `ObjectCorners`
4. Appeler `computeObjectDimensions(calibration, objectCorners)`
5. Retourner résultat avec dimensions, incertitudes, confiance

**Sortie** :
```typescript
{
  success: true;
  object: {
    largeur_cm: 15.3;      // Largeur mesurée
    hauteur_cm: 22.7;      // Hauteur mesurée
    largeur_mm: 153;
    hauteur_mm: 227;
  };
  uncertainties: {
    largeur_cm: ±0.8;      // Plage d'incertitude
    hauteur_cm: ±1.2;
  };
  confidence: 92.5;        // % confiance globale
  method: "homography-ultra-precision";
  warnings: [];
  debug?: {
    pixelPerCm: 78.5;
    homographyQuality: 95;
    reprojectionError: 1.5;
  };
}
```

---

## 📱 INTÉGRATION FRONTEND

### Flux utilisateur
1. **Capture photos** → Utiliser caméra native
2. **Cliquer "Détecter"** → POST `/ultra-fusion-detect` avec 3 photos min
3. **Afficher coins AprilTag** → Frontend reçoit `fusedCorners`, les affiche
4. **Cliquer objet à mesurer** → 4 points de clic sur canvas
5. **Cliquer "Mesurer"** → POST `/compute-dimensions-simple` avec corners
6. **Afficher résultats** → Largeur, hauteur, incertitudes

### Points critiques
- `fusedCorners` vient du backend **EN POURCENTAGES (0-100)**
- Frontend doit convertir en pixels : `x_pixels = (x_percent / 100) * imageWidth`
- `markerSizeCm = 13.0` et `markerHeightCm = 21.7` pour AprilTag Métré
- Ratio attendu = 13.0 / 21.7 = **0.598** (pas 1.0 !)

### Logs console attendus
```
🎯 [Canvas] Mode MÉTRÉ A4 V1.2 - AprilTag: dimensions 13.0×21.7cm
📍 AprilTag TL: pixel (234, 156) = % (15.6, 12.3)
📍 AprilTag TR: pixel (1456, 178) = % (97.1, 14.1)
📊 Homographie qualité: 95%, reprojection: 1.5mm
🎨 Objet cliqué: TL(400, 300), TR(520, 310), BR(530, 450), BL(390, 445)
📐 Résultat: 12.3cm × 15.7cm ± {0.6cm, 0.8cm}
```

---

## 🔧 IMPLÉMENTATION DÉTAILS

### Dimensions HARDCODÉES (à vérifier jamais)
```typescript
// METRE_A4_V12_COMPLETE_SPECS constants
reference: {
  width_mm: 130,     // 13.0cm (centre-à-centre TL→TR)
  height_mm: 217,    // 21.7cm (centre-à-centre TL→BL)
  width_cm: 13.0,
  height_cm: 21.7    // ← CETTE VALEUR EST CRITIQUE
}

aprilTags: [
  { id: 2, position: 'TL', x_mm: 14, y_mm: 14, size_mm: 20 },
  { id: 7, position: 'TR', x_mm: 176, y_mm: 14, size_mm: 20 },
  { id: 14, position: 'BL', x_mm: 14, y_mm: 263, size_mm: 20 },
  { id: 21, position: 'BR', x_mm: 176, y_mm: 263, size_mm: 20 }
]
```

### Détails AprilTag
- **Famille** : TAG36H11 (standard AprilTag 3)
- **IDs fournis** : 2 (TL), 7 (TR), 14 (BL), 21 (BR)
- **Taille** : 20×20mm chacun
- **Format feuille A4** : 210×297mm

### Détails points de référence
- **12 points noirs** : 4mm diamètre, dispersés
- **25 coins ChArUco** : Grille 6×6 (5×5 coins internes)
- **Total minimum** : 4 + 12 + 25 = **41 points**
- **Possible max** : 105+ avec interpolations + règles

---

## ✅ CHECKLIST AVANT LANCEMENT

- [ ] `metre-a4-complete-detector.ts` valide (41+ points détectés)
- [ ] `photo-quality-analyzer.ts` valide (scoring 0-100 fonctionne)
- [ ] Route `/ultra-fusion-detect` créée/testée
- [ ] Route `/compute-dimensions-simple` créée/testée
- [ ] Frontend appelle les bonnes routes
- [ ] Dimensions correctes retournées : 13.0×21.7cm (pas 13×13)
- [ ] Build TypeScript : `npm run build` ✅
- [ ] Server démarre : `npm run dev` ✅
- [ ] Tests réels avec AprilTag Métré V1.2

---

## 🚀 COMMANDES DE LANCEMENT

### Développement local
```bash
# Démarrer tout (frontend + backend + proxy)
bash scripts/start-local.sh

# Ou manuellement:
pkill -f 'npm run dev' 2>/dev/null
npm run build
npm run dev
```

### Vérification API
```bash
# Test route ultrafusion
curl -X POST http://localhost:4000/api/measurement-reference/ultra-fusion-detect \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"photos": [...]}'

# Test route compute
curl -X POST http://localhost:4000/api/measurement-reference/compute-dimensions-simple \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"fusedCorners": {...}, "objectPoints": [...]}'
```

### Logs en temps réel
```bash
# Voir console backend
tail -f /tmp/dev.log 2>&1 | grep -i "MÉTRÉ\|AprilTag\|qualité\|dimension"
```

---

## 📊 RÉSUMÉ TECHNIQUE

| Aspect | Détail |
|--------|--------|
| **Détection** | AprilTag TAG36H11 + 12 dots + 25 ChArUco = 41+ points |
| **Calibration** | Homographie 3×3 ultra-robuste, 105+ points possibles |
| **Dimensions** | 13.0cm × 21.7cm (ratio 0.598) |
| **Précision** | ±0.5-2mm sur 2-5m selon qualité |
| **Sélection photo** | Score netteté + homographie + conditions = 0-100 |
| **Mesure objet** | Homographie inverse pour vraies dimensions |
| **Interface** | Frontend clique points, backend calcule tout |

---

## 🎯 OBJECTIF FINAL

**User story** :
> "Je prends 3 photos d'une feuille A4 Métré V1.2. L'app détecte les AprilTags, sélectionne la meilleure photo, je clique l'objet à mesurer, et j'obtiens ses dimensions vraies avec ±2cm d'incertitude maximum."

**Réussite** = Dimensions correctes, UI fluide, zéro anciens bugs.

---

**Document créé le 14 janvier 2026**  
**Responsable architecture** : Équipe 2Thier CRM  
**Status** : Implémentation → Tests → Production
