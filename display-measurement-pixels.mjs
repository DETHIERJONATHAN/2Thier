#!/usr/bin/env node

/**
 * 📐 AFFICHAGE DES COORDONNÉES PIXELS
 * Objet Mesuré vs Objet Référence (AprilTag)
 */

console.log(`
╔════════════════════════════════════════════════════════════════════════════════╗
║         📐 PIXELS OBJET MESURÉ vs PIXELS OBJET RÉFÉRENCE (APRILTAG)           ║
╚════════════════════════════════════════════════════════════════════════════════╝
`);

// Données extraites du code measurement-reference.ts
// Exemple basé sur une détection réelle 1280×720px

const imageWidth = 1280;
const imageHeight = 720;

// ═══════════════════════════════════════════════════════════════════════════════
// 1️⃣  OBJET RÉFÉRENCE: MARQUEUR APRILTAG V2.0
// ═══════════════════════════════════════════════════════════════════════════════

const aprilTagCorners = {
  topLeft:     { x: 562,   y: 228 },
  topRight:    { x: 927,   y: 228 },
  bottomRight: { x: 927,   y: 565 },
  bottomLeft:  { x: 562,   y: 565 }
};

const aprilTagWidthPx = aprilTagCorners.topRight.x - aprilTagCorners.topLeft.x;  // 365px
const aprilTagHeightPx = aprilTagCorners.bottomLeft.y - aprilTagCorners.topLeft.y; // 337px
const aprilTagSizeRealCm = 16;  // 16×16cm

console.log(`
📍 OBJET RÉFÉRENCE: AprilTag V2.0 (Marqueur de Calibration)
════════════════════════════════════════════════════════════════════════════════

Coins en PIXELS IMAGE:
┌─────────────────────────────────────────────────────────────┐
│  TL (Top-Left)      = (${aprilTagCorners.topLeft.x.toString().padStart(4)}, ${aprilTagCorners.topLeft.y.toString().padStart(3)}) px    │
│  TR (Top-Right)     = (${aprilTagCorners.topRight.x.toString().padStart(4)}, ${aprilTagCorners.topRight.y.toString().padStart(3)}) px    │
│  BR (Bottom-Right)  = (${aprilTagCorners.bottomRight.x.toString().padStart(4)}, ${aprilTagCorners.bottomRight.y.toString().padStart(3)}) px    │
│  BL (Bottom-Left)   = (${aprilTagCorners.bottomLeft.x.toString().padStart(4)}, ${aprilTagCorners.bottomLeft.y.toString().padStart(3)}) px    │
└─────────────────────────────────────────────────────────────┘

Dimensions en PIXELS:
├─ Largeur:  ${aprilTagWidthPx}px
├─ Hauteur:  ${aprilTagHeightPx}px
└─ Ratio:    ${(aprilTagWidthPx / aprilTagHeightPx).toFixed(4)} (attendu: 1.0000)

Réalité physique:
├─ Taille réelle: ${aprilTagSizeRealCm}×${aprilTagSizeRealCm}cm (carré)
└─ Échelle: ${(aprilTagWidthPx / aprilTagSizeRealCm).toFixed(2)} px/cm = ${((aprilTagWidthPx / aprilTagSizeRealCm) * 10).toFixed(2)} px/mm

Centroïde du marqueur:
└─ Position: (${((aprilTagCorners.topLeft.x + aprilTagCorners.topRight.x) / 2).toFixed(0)}, ${((aprilTagCorners.topLeft.y + aprilTagCorners.bottomLeft.y) / 2).toFixed(0)}) px
`);

// ═══════════════════════════════════════════════════════════════════════════════
// 2️⃣  OBJET MESURÉ: PORTE OU OBJET SÉLECTIONNÉ
// ═══════════════════════════════════════════════════════════════════════════════

// Exemple: Porte détectée par l'utilisateur ou auto-détectée
const measuredObjectCorners = {
  topLeft:     { x: 100,   y: 50 },
  topRight:    { x: 1100,  y: 60 },
  bottomRight: { x: 1090,  y: 650 },
  bottomLeft:  { x: 110,   y: 640 }
};

const measuredWidthPx = (
  Math.sqrt(Math.pow(measuredObjectCorners.topRight.x - measuredObjectCorners.topLeft.x, 2) +
            Math.pow(measuredObjectCorners.topRight.y - measuredObjectCorners.topLeft.y, 2)) +
  Math.sqrt(Math.pow(measuredObjectCorners.bottomRight.x - measuredObjectCorners.bottomLeft.x, 2) +
            Math.pow(measuredObjectCorners.bottomRight.y - measuredObjectCorners.bottomLeft.y, 2))
) / 2;

const measuredHeightPx = (
  Math.sqrt(Math.pow(measuredObjectCorners.bottomLeft.x - measuredObjectCorners.topLeft.x, 2) +
            Math.pow(measuredObjectCorners.bottomLeft.y - measuredObjectCorners.topLeft.y, 2)) +
  Math.sqrt(Math.pow(measuredObjectCorners.bottomRight.x - measuredObjectCorners.topRight.x, 2) +
            Math.pow(measuredObjectCorners.bottomRight.y - measuredObjectCorners.topRight.y, 2))
) / 2;

console.log(`
📦 OBJET MESURÉ: Porte (Objet Cible)
════════════════════════════════════════════════════════════════════════════════

Coins en PIXELS IMAGE:
┌─────────────────────────────────────────────────────────────┐
│  TL (Top-Left)      = (${measuredObjectCorners.topLeft.x.toString().padStart(4)}, ${measuredObjectCorners.topLeft.y.toString().padStart(3)}) px    │
│  TR (Top-Right)     = (${measuredObjectCorners.topRight.x.toString().padStart(4)}, ${measuredObjectCorners.topRight.y.toString().padStart(3)}) px    │
│  BR (Bottom-Right)  = (${measuredObjectCorners.bottomRight.x.toString().padStart(4)}, ${measuredObjectCorners.bottomRight.y.toString().padStart(3)}) px    │
│  BL (Bottom-Left)   = (${measuredObjectCorners.bottomLeft.x.toString().padStart(4)}, ${measuredObjectCorners.bottomLeft.y.toString().padStart(3)}) px    │
└─────────────────────────────────────────────────────────────┘

Dimensions en PIXELS:
├─ Largeur:  ${measuredWidthPx.toFixed(1)}px
├─ Hauteur:  ${measuredHeightPx.toFixed(1)}px
└─ Ratio:    ${(measuredWidthPx / measuredHeightPx).toFixed(4)}

Centroïde de l'objet mesuré:
└─ Position: (${((measuredObjectCorners.topLeft.x + measuredObjectCorners.topRight.x) / 2).toFixed(0)}, ${((measuredObjectCorners.topLeft.y + measuredObjectCorners.bottomLeft.y) / 2).toFixed(0)}) px
`);

// ═══════════════════════════════════════════════════════════════════════════════
// 3️⃣  TRANSFORMATION VIA HOMOGRAPHIE
// ═══════════════════════════════════════════════════════════════════════════════

console.log(`
🔄 TRANSFORMATION HOMOGRAPHIE: Pixels → Monde Réel
════════════════════════════════════════════════════════════════════════════════

Processus de mesure:
1️⃣  Détecte 4 coins marqueur AprilTag en pixels image
2️⃣  Calcule homographie H: pixels → coordonnées réelles (mm)
3️⃣  Applique H aux 4 coins de l'objet mesuré
4️⃣  Obtient dimensions réelles en mm/cm

Formula: Point_real = H × Point_pixel

Exemple pour coin TL de la porte:
├─ Point pixel: (${measuredObjectCorners.topLeft.x}, ${measuredObjectCorners.topLeft.y})
├─ Applique H...
└─ Point réel: (~200mm, ~100mm) → (~20cm, ~10cm)

Facteur d'échelle calculé:
├─ Marqueur AprilTag: ${aprilTagWidthPx}px = ${aprilTagSizeRealCm * 10}mm
└─ Échelle: 1px = ${(aprilTagSizeRealCm * 10 / aprilTagWidthPx).toFixed(3)}mm
`);

// ═══════════════════════════════════════════════════════════════════════════════
// 4️⃣  RÉSUMÉ COMPARATIF
// ═══════════════════════════════════════════════════════════════════════════════

console.log(`
📊 TABLEAU COMPARATIF
════════════════════════════════════════════════════════════════════════════════

╔════════════════════════════════════════╦═══════════════════════════════════════╗
║         OBJET RÉFÉRENCE (AprilTag)     ║      OBJET MESURÉ (Porte)             ║
╠════════════════════════════════════════╬═══════════════════════════════════════╣
║ TL Pixel: (562, 228)                   ║ TL Pixel: (100, 50)                   ║
║ TR Pixel: (927, 228)                   ║ TR Pixel: (1100, 60)                  ║
║ BR Pixel: (927, 565)                   ║ BR Pixel: (1090, 650)                 ║
║ BL Pixel: (562, 565)                   ║ BL Pixel: (110, 640)                  ║
║                                        ║                                       ║
║ Largeur: 365px                         ║ Largeur: ${measuredWidthPx.toFixed(1)}px                    ║
║ Hauteur: 337px                         ║ Hauteur: ${measuredHeightPx.toFixed(1)}px                  ║
║ Ratio: 1.0831                          ║ Ratio: ${(measuredWidthPx / measuredHeightPx).toFixed(4)}                       ║
║                                        ║                                       ║
║ Taille réelle: 16cm × 16cm             ║ Taille réelle: ~81cm × ~191cm (estimé) ║
║ Échelle: 22.8 px/cm                    ║ Basé sur homographie du marqueur      ║
╚════════════════════════════════════════╩═══════════════════════════════════════╝
`);

// ═══════════════════════════════════════════════════════════════════════════════
// 5️⃣  FORMAT APIR RESPONSE
// ═══════════════════════════════════════════════════════════════════════════════

console.log(`
🔗 FORMAT RETOURNÉ PAR L'API
════════════════════════════════════════════════════════════════════════════════

POST /api/measurement-reference/ultra-clean-compute

Response JSON:
\`\`\`json
{
  "success": true,
  "aprilTagCorners": [
    { "x": 562, "y": 228 },    // TL
    { "x": 927, "y": 228 },    // TR
    { "x": 927, "y": 565 },    // BR
    { "x": 562, "y": 565 }     // BL
  ],
  "fusedCorners": {
    "topLeft":     { "x": 43.9, "y": 31.7 },
    "topRight":    { "x": 72.4, "y": 31.7 },
    "bottomRight": { "x": 72.4, "y": 78.5 },
    "bottomLeft":  { "x": 43.9, "y": 78.5 }
  },
  "objectCorners": {
    "topLeft":     { "x": 100, "y": 50 },
    "topRight":    { "x": 1100, "y": 60 },
    "bottomRight": { "x": 1090, "y": 650 },
    "bottomLeft":  { "x": 110, "y": 640 }
  },
  "measurement": {
    "largeur_cm": 81.20,
    "hauteur_cm": 190.71,
    "confidence": 98,
    "method": "4-point-fallback"
  }
}
\`\`\`
`);

// ═══════════════════════════════════════════════════════════════════════════════
// 6️⃣  CAS D'UTILISATION FRONTEND
// ═══════════════════════════════════════════════════════════════════════════════

console.log(`
🎨 UTILISATION FRONTEND
════════════════════════════════════════════════════════════════════════════════

Affichage Canvas:
\`\`\`javascript
// Récupérer response de l'API
const response = await api.post('/ultra-clean-compute', { ... });

// Afficher marqueur référence en POURCENTAGES
const refCorners = response.fusedCorners;
ctx.strokeStyle = 'green';
ctx.beginPath();
ctx.moveTo(refCorners.topLeft.x * canvas.width / 100, ...);
ctx.lineTo(refCorners.topRight.x * canvas.width / 100, ...);
ctx.stroke();

// Afficher objet mesuré en PIXELS (déjà pixels du canvas)
const objCorners = response.objectCorners;
ctx.strokeStyle = 'red';
ctx.beginPath();
ctx.moveTo(objCorners.topLeft.x, objCorners.topLeft.y);
ctx.lineTo(objCorners.topRight.x, objCorners.topRight.y);
ctx.stroke();

// Afficher résultat
console.log(\`Porte: \${response.measurement.largeur_cm}cm × \${response.measurement.hauteur_cm}cm\`);
\`\`\`
`);

console.log(`
✅ Coordonnées affichées.
📍 Marqueur AprilTag: 4 coins en pixels
📦 Objet mesuré: 4 coins en pixels
🔄 Homographie applique la transformation pour obtenir dimensions réelles
`);
