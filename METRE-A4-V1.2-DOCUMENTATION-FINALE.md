# 📐 MÉTRÉ A4 V1.2 — DOCUMENTATION TECHNIQUE FINALE

## 🎯 Vue d'ensemble

Système de calibration photogrammétrique pour mesures précises via feuille A4 imprimable.  
**Précision attendue :** ±2-4mm sur 2-3m (plaque rigide), ±5-8mm sur 3-5m (papier standard).

---

## 📄 Spécifications feuille imprimable

### Dimensions & export
- **Format :** A4 portrait (210 × 297 mm)
- **Résolution :** 300 DPI
- **Exports :** PNG + PDF vectoriel
- **Échelle :** 100% strict (pas d'ajustement page)

### Éléments de calibration

#### 1. Bordure noire (8mm)
- **Fonction :** Détection rapide + crop automatique
- **Contrainte :** DOIT toucher les 4 bords (validation impression)

#### 2. AprilTags coins (4×)
- **IDs :** 2 (TL), 7 (TR), 14 (BL), 21 (BR)
- **Taille :** 20×20mm
- **Position :** 14mm des bords (8mm bordure + 6mm marge sécurité)
- **Dictionnaire :** DICT_APRILTAG_36h11

#### 3. ChArUco centre
- **Grille :** 6×6 (120×120mm)
- **Taille carrés :** 20mm
- **Position :** x=45mm, y=80mm
- **Markers ratio :** 0.6 (60% de la taille carrés)
- **Densité tags :** ~50% cases (optimal calibration)

#### 4. Points de référence (14×)
- **Diamètre :** 4mm
- **Répartition :**
  - 3 haut gauche, 3 haut droit
  - 3 bas gauche, 3 bas droit
  - 2 centre (hors ChArUco)
- **Dispersion :** Non-alignés (correction distorsion radiale)

#### 5. Règles graduées
- **Horizontale :** 0-180mm (y=255mm), graduations 1/5/10mm
- **Verticale :** 0-200mm (x=18mm), graduations 1/5/10mm
- **Validation :** Double échelle X/Y pour détection erreur impression

#### 6. QR Code versioning
- **Taille :** 30×30mm
- **Position :** x=90mm, y=32mm (centré sous warnings)
- **Payload JSON :**
  ```json
  {
    "id": "A4-CALIB-V1.2",
    "size_mm": "210x297",
    "scale": "100%",
    "url": "https://2thier.be/calibration"
  }
  ```

#### 7. Zones logos (branding)
- **2Thier :** x=72.5mm, y=270mm, 30×12mm
- **Métré :** x=107.5mm, y=270mm, 30×12mm
- **Fonction :** Purement commercial (ignoré par détection)

---

## 🔧 Pipeline détection backend

### Étape 1 : Preprocessing (Sharp.js)
```typescript
const enhancedBuffer = await sharp(imageBuffer)
  .normalize()           // Auto-contraste adaptatif
  .sharpen({             // Netteté bords
    sigma: 2,
    m1: 1.5,
    m2: 0.8
  })
  .modulate({            // Amplification saturation
    brightness: 1.1,
    saturation: 1.5
  })
  .toBuffer();
```

### Étape 2 : Détection bordure
- **Seuil luminosité :** >200/255 (pixels blancs)
- **Ratio A4 attendu :** 1.41 (297/210)
- **Validation ratio :** 1.15-1.70 (tolérance perspective)
- **Rejet si :** Bordure >98% surface image (fond blanc détecté comme feuille)

### Étape 3 : Extraction AprilTags
- **Détecteur :** cv2.aruco (DICT_APRILTAG_36h11)
- **Validation :** 4 tags coins détectés avec IDs corrects
- **Fallback :** Si <4 tags → pipeline ChArUco seul

### Étape 4 : Calibration ChArUco
- **Détection coins :** Sub-pixel (précision accrue vs AprilTags)
- **Homographie initiale :** 4 tags coins → plan projectif
- **Affinage :** ChArUco corners → transformation perspective optimale

### Étape 5 : Validation échelle
```typescript
// Vérification règle horizontale (180mm attendu)
const measuredLength = calculateDistance(ruler_start, ruler_end, homography);
const scaleError = abs(measuredLength - 180) / 180 * 100;

if (scaleError > 5%) {
  return { error: "Impression mal scalée (ajusté à la page)" };
} else if (scaleError > 2%) {
  warnings.push("Échelle légèrement imprécise, vérifier impression 100%");
}
```

### Étape 6 : Correction distorsion
- **Points dispersés :** Calcul déviations locales
- **Modèle distorsion :** Radial (lentille smartphone grand-angle)
- **Correction :** Homographie adaptative par zones

---

## 📊 Performances & limites

### Conditions optimales
- **Distance photo :** 1-4m (feuille = 20-50% frame caméra)
- **Angle oblique :** <35°
- **Lumière :** Naturelle ou LED blanc chaud (pas néon direct)
- **Support :** Plaque rigide ou mur lisse
- **Précision :** ±2-4mm sur 2-3m

### Conditions dégradées (tolérance)
- **Distance :** jusqu'à 5m (résolution limite)
- **Angle :** jusqu'à 45° (homographie encore valide)
- **Lumière :** Néon/flash OK si pas reflet direct ChArUco
- **Support :** Papier scotché (ondulations <5mm)
- **Précision :** ±5-10mm sur 3-5m

### Cas de rejet automatique
- ❌ Bordure coupée (impression rognée)
- ❌ Échelle erreur >5% (ajusté à la page)
- ❌ <2 AprilTags détectés + ChArUco masqué
- ❌ Feuille >98% image (fond blanc confondu)
- ❌ Distorsion excessive (>10% variance points)

---

## 🔄 Pipeline fallback (détection dégradée)

### Cascade hiérarchique
1. **Optimal :** 4 AprilTags + ChArUco + 14 points → homographie complète
2. **Niveau 1 :** ChArUco seul → homographie partielle (coins damier)
3. **Niveau 2 :** Bordure noire → extraction contours → estimation plan
4. **Niveau 3 :** Règles graduées → fréquence spatiale barres → déduction échelle
5. **Niveau 4 :** Points dispersés → triangulation minimale (≥3 points)
6. **Échec :** Demander nouvelle photo avec instructions

### Logs diagnostics
```typescript
console.log('[DETECTION] Cascade fallback :');
console.log('  ✅ AprilTags: 4/4 détectés');
console.log('  ✅ ChArUco: 24/36 coins trouvés');
console.log('  ⚠️ Points: 12/14 (2 masqués)');
console.log('  ✅ Échelle: 0.8% erreur (OK)');
console.log('  → Mode: OPTIMAL (homographie complète)');
```

---

## 📦 Fichiers générés

### Outputs
- `metre-a4-v1.2.png` : Raster 300 DPI (debug)
- `metre-a4-v1.2.pdf` : Vectoriel (impression professionnelle)
- `metre-a4-v1.2.layout.json` : Métadonnées positions (backend)

### Layout JSON (extrait)
```json
{
  "version": "A4-CALIB-V1.2",
  "april_tags": [
    {"id": 2, "x_mm": 14, "y_mm": 14, "size_mm": 20}
  ],
  "charuco": {
    "x_mm": 45, "y_mm": 80,
    "squares_x": 6, "squares_y": 6,
    "square_mm": 20
  },
  "reference_dots": [
    {"x_mm": 30, "y_mm": 75, "diameter_mm": 4}
  ],
  "qr_code": {
    "x_mm": 90, "y_mm": 32, "size_mm": 30,
    "payload": {"id": "A4-CALIB-V1.2", "url": "..."}
  }
}
```

---

## 🎓 Utilisation utilisateur

### Instructions impression
1. Télécharger `metre-a4-v1.2.pdf`
2. **Imprimante :** Réglage "Échelle 100%" (PAS "Ajuster à la page")
3. **Vérification :** Bordure noire DOIT toucher les 4 bords
4. **Support :** Imprimer sur papier épais (160g) ou plastifier

### Prise de photo
1. Placer feuille sur surface plane (mur/sol)
2. Scanner QR code (optionnel, recommandé)
3. Reculer jusqu'à voir toute la feuille dans cadre
4. **Guidage :** Feuille = 20-50% de l'écran (optimal)
5. Prendre photo perpendiculaire (angle <30°)
6. Éviter flash/reflets directs sur ChArUco

### Validation système
- ✅ Bordure détectée → crop automatique
- ✅ 4 tags coins → calibration précise
- ✅ Échelle validée → mesures fiables
- ⚠️ Warnings affichés → vérifier qualité photo
- ❌ Rejet → suivre instructions nouvelle photo

---

## 🚀 Prochaines versions

### V1.3 (backlog)
- Détection non-planéité feuille (variance 3D points)
- CLAHE adaptatif (reflets néons)
- UI guidage distance temps réel
- Optimisation densité ChArUco (35% vs 50%)

### V2.0 (roadmap)
- Support plaque rigide 4mm (marquage tranche)
- Multi-feuilles mosaïque (grandes surfaces)
- Calibration caméra smartphone (matrice intrinsèque)
- Export 3D mesh (reconstruction plan)

---

## 📚 Références techniques

### Standards calibration
- OpenCV ChArUco Board : [docs.opencv.org/charuco](https://docs.opencv.org/4.x/df/d4a/tutorial_charuco_detection.html)
- AprilTag 36h11 : [april.eecs.umich.edu](https://april.eecs.umich.edu/software/apriltag)
- Homographie robuste : Zhang 2000 + RANSAC

### Bibliothèques
- **Backend :** OpenCV 4.12 (contrib), Sharp.js 0.33
- **Frontend :** React, Ant Design
- **Génération :** Python 3.13, Pillow, qrcode

### Précision théorique
- **ChArUco corners :** ±0.1 pixel (sub-pixel refinement)
- **AprilTags :** ±0.5 pixel (coins binaires)
- **Points dispersés :** ±1 pixel (ellipse fitting)
- **Homographie :** Erreur reprojection <2 pixels (RANSAC)

---

**Auteur :** 2Thier CRM Team  
**Date :** 2026-01-13  
**Statut :** ✅ PRODUCTION READY  
**Note IA externe :** 9/10 (système mature, manque détection planéité V1.3)
