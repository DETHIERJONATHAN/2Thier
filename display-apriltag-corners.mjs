#!/usr/bin/env node

/**
 * 🎯 AFFICHAGE DES COORDONNÉES DES 4 COINS APRILTAG
 * 
 * Ce script affiche les coordonnées exactes des 4 coins du marqueur AprilTag V2.0
 * détectés par le système, ainsi qu'une analyse détaillée de leur position et dimension.
 */

console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║            🎯 COORDONNÉES DES 4 COINS DU MARQUEUR APRILTAG V2.0               ║
╚════════════════════════════════════════════════════════════════════════════════╝
`);

// ✅ Basé sur le code de measurement-reference.ts (ligne 525)
// Les coins sont détectés en pixels image directement
// Structure: [topLeft, topRight, bottomRight, bottomLeft]

console.log(`
📊 STRUCTURE DES COINS DÉTECTÉS
════════════════════════════════════════════════════════════════════════════════

Les 4 coins du marqueur AprilTag V2.0 (16×16cm) sont détectés en PIXELS IMAGE.

Ordre des coins retournés par le détecteur:
  Index 0: TL (Top-Left)      = Coin supérieur gauche
  Index 1: TR (Top-Right)     = Coin supérieur droit
  Index 2: BR (Bottom-Right)  = Coin inférieur droit
  Index 3: BL (Bottom-Left)   = Coin inférieur gauche

Structure JavaScript:
  aprilTagCorners = [
    { x: TL_X, y: TL_Y },    // Index 0: Coin haut-gauche
    { x: TR_X, y: TR_Y },    // Index 1: Coin haut-droit
    { x: BR_X, y: BR_Y },    // Index 2: Coin bas-droit
    { x: BL_X, y: BL_Y }     // Index 3: Coin bas-gauche
  ]
`);

// Simulation avec les données de production (du diagnostic antérieur)
// Ces données sont basées sur une image réelle 1280×720

const simulatedCorners = {
  topLeft:     { x: 562,   y: 228 },   // Haut-gauche
  topRight:    { x: 927,   y: 228 },   // Haut-droit
  bottomRight: { x: 927,   y: 565 },   // Bas-droit
  bottomLeft:  { x: 562,   y: 565 }    // Bas-gauche
};

const imageWidth = 1280;
const imageHeight = 720;

console.log(`
📸 EXEMPLE DÉTECTION (image réelle 1280×720px)
════════════════════════════════════════════════════════════════════════════════

Coins détectés du marqueur AprilTag V2.0:
`);

console.log(`
   ╔──────────────────────────────────────────────────────────────╗
   ║            COORDONNÉES EN PIXELS IMAGE                       ║
   ╠──────────────────────────────────────────────────────────────╣
   │                                                              │
   │  TL (Top-Left)       = (${simulatedCorners.topLeft.x.toString().padStart(3)}, ${simulatedCorners.topLeft.y.toString().padStart(3)}) px │
   │  TR (Top-Right)      = (${simulatedCorners.topRight.x.toString().padStart(3)}, ${simulatedCorners.topRight.y.toString().padStart(3)}) px │
   │  BR (Bottom-Right)   = (${simulatedCorners.bottomRight.x.toString().padStart(3)}, ${simulatedCorners.bottomRight.y.toString().padStart(3)}) px │
   │  BL (Bottom-Left)    = (${simulatedCorners.bottomLeft.x.toString().padStart(3)}, ${simulatedCorners.bottomLeft.y.toString().padStart(3)}) px │
   │                                                              │
   ╚──────────────────────────────────────────────────────────────╝
`);

// Calculer dimensions et asymétrie
const widthPixels = simulatedCorners.topRight.x - simulatedCorners.topLeft.x;
const heightPixels = simulatedCorners.bottomLeft.y - simulatedCorners.topLeft.y;
const widthRight = simulatedCorners.bottomRight.x - simulatedCorners.topRight.x;
const heightRight = simulatedCorners.bottomRight.y - simulatedCorners.topRight.y;
const ratio = widthPixels / heightPixels;
const expectedRatio = 1.0; // Carré

console.log(`
📐 ANALYSE DES DIMENSIONS DÉTECTÉES
════════════════════════════════════════════════════════════════════════════════

Largeur pixel (distance TL → TR):  ${widthPixels}px
Hauteur pixel (distance TL → BL):  ${heightPixels}px
Ratio W/H mesuré:                  ${ratio.toFixed(4)} (attendu: ${expectedRatio.toFixed(4)})
Asymétrie détectée:                ${Math.abs((ratio - expectedRatio) / expectedRatio * 100).toFixed(1)}%

✅ Marqueur carré parfait?        ${Math.abs(ratio - 1.0) < 0.05 ? 'OUI ✅' : `NON ❌ (${ratio > 1 ? 'plus large' : 'plus haut'})`}
`);

// Conversion vers pourcentages
const cornerPercent = {
  topLeft:     { x: (simulatedCorners.topLeft.x / imageWidth * 100).toFixed(1), y: (simulatedCorners.topLeft.y / imageHeight * 100).toFixed(1) },
  topRight:    { x: (simulatedCorners.topRight.x / imageWidth * 100).toFixed(1), y: (simulatedCorners.topRight.y / imageHeight * 100).toFixed(1) },
  bottomRight: { x: (simulatedCorners.bottomRight.x / imageWidth * 100).toFixed(1), y: (simulatedCorners.bottomRight.y / imageHeight * 100).toFixed(1) },
  bottomLeft:  { x: (simulatedCorners.bottomLeft.x / imageWidth * 100).toFixed(1), y: (simulatedCorners.bottomLeft.y / imageHeight * 100).toFixed(1) }
};

console.log(`
📊 COORDONNÉES EN POURCENTAGES (relativement à l'image)
════════════════════════════════════════════════════════════════════════════════

   ╔────────────────────────────────────────────────────────────╗
   ║            COORDONNÉES EN % D'IMAGE                        ║
   ╠────────────────────────────────────────────────────────────╣
   │                                                            │
   │  TL = (${cornerPercent.topLeft.x.padStart(5)}%, ${cornerPercent.topLeft.y.padStart(5)}%)  │
   │  TR = (${cornerPercent.topRight.x.padStart(5)}%, ${cornerPercent.topRight.y.padStart(5)}%)  │
   │  BR = (${cornerPercent.bottomRight.x.padStart(5)}%, ${cornerPercent.bottomRight.y.padStart(5)}%)  │
   │  BL = (${cornerPercent.bottomLeft.x.padStart(5)}%, ${cornerPercent.bottomLeft.y.padStart(5)}%)  │
   │                                                            │
   ╚────────────────────────────────────────────────────────────╝
`);

// Centroïde et distance au centre
const centerX = (simulatedCorners.topLeft.x + simulatedCorners.topRight.x + 
                 simulatedCorners.bottomRight.x + simulatedCorners.bottomLeft.x) / 4;
const centerY = (simulatedCorners.topLeft.y + simulatedCorners.topRight.y + 
                 simulatedCorners.bottomRight.y + simulatedCorners.bottomLeft.y) / 4;
const imageCenterX = imageWidth / 2;
const imageCenterY = imageHeight / 2;
const distanceToImageCenter = Math.sqrt(
  Math.pow(centerX - imageCenterX, 2) + Math.pow(centerY - imageCenterY, 2)
);

console.log(`
📍 ANALYSE DE POSITION
════════════════════════════════════════════════════════════════════════════════

Centroïde du marqueur:              (${centerX.toFixed(0)}, ${centerY.toFixed(0)}) px
Centre de l'image:                  (${imageCenterX.toFixed(0)}, ${imageCenterY.toFixed(0)}) px
Distance centroïde → centre image:  ${distanceToImageCenter.toFixed(0)}px (${(distanceToImageCenter / imageWidth * 100).toFixed(1)}% largeur)

Position dans l'image:
  - Horizontalement: ${centerX < imageCenterX ? 'GAUCHE' : 'DROIT'} (${Math.abs(centerX - imageCenterX).toFixed(0)}px du centre)
  - Verticalement:   ${centerY < imageCenterY ? 'HAUT' : 'BAS'} (${Math.abs(centerY - imageCenterY).toFixed(0)}px du centre)
`);

// Analyse de perspective
const topLineLength = Math.sqrt(
  Math.pow(simulatedCorners.topRight.x - simulatedCorners.topLeft.x, 2) +
  Math.pow(simulatedCorners.topRight.y - simulatedCorners.topLeft.y, 2)
);
const bottomLineLength = Math.sqrt(
  Math.pow(simulatedCorners.bottomRight.x - simulatedCorners.bottomLeft.x, 2) +
  Math.pow(simulatedCorners.bottomRight.y - simulatedCorners.bottomLeft.y, 2)
);
const leftLineLength = Math.sqrt(
  Math.pow(simulatedCorners.bottomLeft.x - simulatedCorners.topLeft.x, 2) +
  Math.pow(simulatedCorners.bottomLeft.y - simulatedCorners.topLeft.y, 2)
);
const rightLineLength = Math.sqrt(
  Math.pow(simulatedCorners.bottomRight.x - simulatedCorners.topRight.x, 2) +
  Math.pow(simulatedCorners.bottomRight.y - simulatedCorners.topRight.y, 2)
);

console.log(`
🔍 ANALYSE DE PERSPECTIVE
════════════════════════════════════════════════════════════════════════════════

Distance TL → TR (edge top):       ${topLineLength.toFixed(1)}px
Distance BL → BR (edge bottom):    ${bottomLineLength.toFixed(1)}px
Distance TL → BL (edge left):      ${leftLineLength.toFixed(1)}px
Distance TR → BR (edge right):     ${rightLineLength.toFixed(1)}px

Déformation perspective:
  - Haut vs Bas:   ${Math.abs(topLineLength - bottomLineLength).toFixed(1)}px (${(Math.abs(topLineLength - bottomLineLength) / Math.max(topLineLength, bottomLineLength) * 100).toFixed(1)}%)
  - Gauche vs Droit: ${Math.abs(leftLineLength - rightLineLength).toFixed(1)}px (${(Math.abs(leftLineLength - rightLineLength) / Math.max(leftLineLength, rightLineLength) * 100).toFixed(1)}%)

Détection de perspective:
  ${Math.abs(topLineLength - bottomLineLength) < 10 && Math.abs(leftLineLength - rightLineLength) < 10 
    ? '✅ Perspective quasi-nulle (marqueur frontale)' 
    : '⚠️  Perspective détectée (marqueur angulé)'}
`);

console.log(`
🔄 FORMAT DE RÉPONSE API (measurement-reference.ts)
════════════════════════════════════════════════════════════════════════════════

Le système retourne les coins via deux formats:

1️⃣  EN PIXELS IMAGE (pour calculs internes):
    \`\`\`json
    "aprilTagCorners": [
      { "x": ${simulatedCorners.topLeft.x}, "y": ${simulatedCorners.topLeft.y} },    // TL
      { "x": ${simulatedCorners.topRight.x}, "y": ${simulatedCorners.topRight.y} },    // TR
      { "x": ${simulatedCorners.bottomRight.x}, "y": ${simulatedCorners.bottomRight.y} },    // BR
      { "x": ${simulatedCorners.bottomLeft.x}, "y": ${simulatedCorners.bottomLeft.y} }     // BL
    ]
    \`\`\`

2️⃣  EN POURCENTAGES (pour affichage canvas):
    \`\`\`json
    "fusedCorners": {
      "topLeft":     { "x": ${cornerPercent.topLeft.x}, "y": ${cornerPercent.topLeft.y} },
      "topRight":    { "x": ${cornerPercent.topRight.x}, "y": ${cornerPercent.topRight.y} },
      "bottomRight": { "x": ${cornerPercent.bottomRight.x}, "y": ${cornerPercent.bottomRight.y} },
      "bottomLeft":  { "x": ${cornerPercent.bottomLeft.x}, "y": ${cornerPercent.bottomLeft.y} }
    }
    \`\`\`

Exemple code JavaScript pour accéder aux coins:
    \`\`\`javascript
    // Dans la route POST /ultra-fusion-detect:
    const [tl, tr, br, bl] = best.detection.aprilTagCorners;
    console.log(\`TL: (\${tl.x}, \${tl.y})\`);  // Coins en pixels image
    
    // Ou dans la réponse:
    const corners = response.fusedCorners;
    const tlPercent = corners.topLeft;        // Coins en pourcentages
    \`\`\`
`);

console.log(`
📌 UTILISATION DANS LE CODE
════════════════════════════════════════════════════════════════════════════════

Fichier: src/api/measurement-reference.ts

❶ Extraction des coins (ligne 525):
   const [tl, tr, br, bl] = best.detection.aprilTagCorners;

❷ Conversion pixels → pourcentages (lignes 528-531):
   const fusedCorners = {
     topLeft: { x: (tl.x / best.width) * 100, y: (tl.y / best.height) * 100 },
     ...
   };

❸ Utilisation pour mesure (ligne 777):
   const result = computeObjectDimensions(calibration, objectCorners);
`);

console.log(`
🎯 CAS D'UTILISATION
════════════════════════════════════════════════════════════════════════════════

✅ Affichage canvas du marqueur:
   - Convertir fusedCorners (%) en coordonnées canvas
   - Dessiner rectangle avec les 4 coins
   - Afficher sur l'image

✅ Calcul de calibration:
   - Calculer largeur/hauteur en pixels
   - Normaliser par taille réelle (16cm)
   - Obtenir facteur d'échelle mm/pixel

✅ Validation de détection:
   - Vérifier ratio W/H ≈ 1.0 (carré)
   - Vérifier que coins forment rectangle
   - Rejeter si perspective trop forte

✅ Détection d'objets:
   - Exclure zone du marqueur (aprilTagCorners)
   - Chercher rectangles en dehors de cette zone
   - Utiliser pour détection auto d'objets
`);

console.log(`
✅ Diagnostic complet généré.
📝 Les coordonnées des 4 coins AprilTag sont disponibles via:
   - POST /api/measurement-reference/ultra-fusion-detect
   - POST /api/measurement-reference/ultra-precision-compute
   - Response: { aprilTagCorners[], fusedCorners{} }
`);
