/**
 * 🎯 MARKER DETECTOR v2 - Détection ULTRA-PRÉCISE de marqueurs ArUco
 * 
 * Port côté serveur du système de détection aruco-test.html
 * Détecte 16 points de référence sur un marqueur ArUco:
 * - 4 coins MAGENTA (détection primaire)
 * - 12 transitions internes NOIR→BLANC→NOIR (précision sub-pixel)
 * 
 * Structure ArUco (6 bandes égales, taille dynamique):
 * ┌───────────────────────────────────────────────────────────────────┐
 * │ NOIR (1/6) │ BLANC (1/6) │ NOIR (2/6=1/3) │ BLANC (1/6) │ NOIR (1/6) │
 * │   bande 1  │   bande 2   │ bandes 3+4     │   bande 5   │  bande 6   │
 * └───────────────────────────────────────────────────────────────────┘
 * 
 * Exemples avec différentes tailles:
 * - 18cm → bande = 3cm,   transitions à: 3, 6, 12, 15 cm
 * - 16.8cm → bande = 2.8cm, transitions à: 2.8, 5.6, 11.2, 14 cm  
 * - 20cm → bande = 3.33cm, transitions à: 3.33, 6.67, 13.33, 16.67 cm
 * 
 * Formule: bande = tailleMarqueur / 6
 * 
 * @module lib/marker-detector
 * @author 2Thier CRM Team
 */

// Note: AprilTag detection moved to apriltag-detector-server.ts (server-only)

/**
 * 🎯 CONFIGURATION DYNAMIQUE DU MARQUEUR
 * La taille du marqueur peut être configurée dans Paramètres > IA Mesure
 * Valeur par défaut: 13cm (Métré A4 V1.2 - distance entre centres AprilTag)
 */
let _markerSizeCm = 13; // Métré A4 V1.2 par défaut

/**
 * Met à jour la taille du marqueur (appelé depuis l'API ou au chargement)
 * @param sizeCm - Taille du marqueur en cm
 */
export function setMarkerSize(sizeCm: number): void {
  if (sizeCm >= 5 && sizeCm <= 50) {
    _markerSizeCm = sizeCm;
    console.log(`🎯 [MARKER] Taille du marqueur mise à jour: ${sizeCm}cm`);
  } else {
    console.warn(`⚠️ [MARKER] Taille invalide: ${sizeCm}cm (doit être entre 5 et 50cm)`);
  }
}

/**
 * Retourne la taille actuelle du marqueur en cm
 */
export function getMarkerSize(): number {
  return _markerSizeCm;
}

/**
 * Spécifications du marqueur physique imprimé ArUco
 * ⚠️ La propriété markerSize est DYNAMIQUE - utiliser getMarkerSize() pour la valeur à jour
 */
export const MARKER_SPECS = {
  get markerSize() { return _markerSizeCm; },  // Getter dynamique !
  boardSize: 24,         // Taille du tableau ALU support en cm
  magentaRadius: 0.5,    // Rayon des cercles magenta en cm
  whiteRadius: 0.1,      // Rayon du point blanc central en cm
  
  // Structure des bandes (ratios relatifs au markerSize)
  get bands() {
    const size = _markerSizeCm;
    return {
      blackOuter: size / 6,       // Bande noire externe: 0 → 1/6
      whiteOuter: size / 3,       // Bande blanche: 1/6 → 1/3
      blackCenter: size * 2/3,    // Centre noir: 1/3 → 2/3
      whiteInner: size * 5/6,     // Bande blanche: 2/3 → 5/6
      blackInner: size            // Bande noire interne: 5/6 → 1
    };
  },
  
  // Points de transition (en cm depuis le bord)
  get transitions() {
    const size = _markerSizeCm;
    return [size/6, size/3, size*2/3, size*5/6] as const;
  },
  
  // Ratios géométriques clés pour validation (constants)
  ratios: {
    innerToOuter: 1/3,    // Pattern central / total = 1/3
    whiteToOuter: 2/3,    // Zone blanche / total = 2/3
    bandWidth: 1/6        // Largeur bande / total = 1/6
  }
};

/**
 * Point 2D avec coordonnées
 */
export interface Point2D {
  x: number;
  y: number;
}

/**
 * Pixel avec couleur et score
 */
interface ColorPixel {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
  score: number;
}

/**
 * Cluster de pixels magenta
 */
interface MagentaCluster {
  cx: number;
  cy: number;
  size: number;
  width: number;
  height: number;
}

/**
 * Résultat de détection d'un marqueur
 */
export interface MarkerDetectionResult {
  id: number;
  corners: Point2D[];           // 4 coins ordonnés [TL, TR, BR, BL]
  apriltagPositions: Point2D[];  // Positions des centres AprilTag détectés
  size: number;                 // Taille moyenne en pixels
  center: Point2D;              // Centre du marqueur
  score: number;                // Score de confiance (0-1)
  apriltagsFound: number;         // Nombre d'AprilTags trouvés
  homography: {
    realSizeCm: number;         // Taille réelle (18cm)
    pixelsPerCm: number;        // Pixels par cm
    sides: number[];            // Longueur des 4 côtés en px
    angles: number[];           // Angles aux 4 coins
  };
  // ⭐ Points de référence étendus pour homographie ultra-précise
  extendedPoints?: ExtendedReferencePoints;
  // 🎯 NOUVEAU: Homographie précise calculée avec 16+ points
  preciseHomography?: number[][];  // Matrice 3x3 d'homographie
  homographyQuality?: number;       // Qualité 0-1 basée sur erreur de reprojection
}

/**
 * Points de référence étendus pour homographie ultra-précise
 * 16 points au total: 4 coins + 12 transitions internes
 */
export interface ExtendedReferencePoints {
  corners: Point2D[];
  
  topTransitions: Point2D[];
  
  rightTransitions: Point2D[];
  
  bottomTransitions: Point2D[];
  
  leftTransitions: Point2D[];
  
  allPoints: Array<{
    pixel: Point2D;      // Coordonnées détectées (pixels)
    real: Point2D;       // Coordonnées réelles (cm)
    confidence: number;  // Confiance de détection (0-1)
    type: 'corner' | 'transition';
  }>;
  
  confidence: number;
  
  detectedCount: number;
}

/**
 * Image data pour le traitement
 */
export interface ImageDataLike {
  data: Uint8ClampedArray | Buffer;
  width: number;
  height: number;
}

/**
 * Classe principale de détection de marqueurs MAGENTA
 */
export class MarkerDetector {
  private minSize: number;
  private maxSize: number;
  private enableExtendedDetection: boolean;

  constructor(minSize = 30, maxSize = 2000, enableExtendedDetection = true) {
    this.minSize = minSize;
    this.maxSize = maxSize;
    this.enableExtendedDetection = enableExtendedDetection;
  }

  /**
  /**
   * Détecter les marqueurs dans une image
  /**
   * 
  /**
   * PRIORITÉ 1: Détecter les LIGNES NOIRES extérieures
  /**
   * PRIORITÉ 2: Valider/raffiner avec les coins magenta
   */
  detect(imageData: ImageDataLike): MarkerDetectionResult[] {
    const { data, width, height } = imageData;
    
    console.log(`🔍 MarkerDetector.detect: ${width}x${height}`);
    console.log('🎯 DÉTECTION MÉTRÉ A4 - Recherche 4 AprilTags (ID: 2,7,14,21)');
    
    // ═════════════════════════════════════════════════════════════════════
    // 🚀 NOUVELLE MÉTHODE: DÉTECTION APRILTAGS AVEC OPENCV
    // ═════════════════════════════════════════════════════════════════════
    let markers = this.detectAprilTagMetreA4(data, width, height);
    
    if (markers.length === 0) {
      console.log('⚠️ Aucun AprilTag détecté - vérifiez que la feuille Métré V1.2 est visible');
      console.log('   📌 La feuille doit contenir 4 AprilTags aux coins (ID: 2, 7, 14, 21)');
    } else {
      console.log(`✅ ${markers.length} feuille(s) Métré détectée(s) - 4 coins AprilTag identifiés`);
    }
    
    return markers;
  }

  /**
   * 🚀 NOUVELLE MÉTHODE: Détection AprilTags pour feuille Métré V1.2
   * 
   * La feuille Métré V1.2 contient 4 AprilTags aux coins:
   * - ID 2: Coin haut gauche (30mm, 30mm)
   * - ID 7: Coin haut droit (160mm, 30mm)
   * - ID 14: Coin bas gauche (30mm, 247mm)
   * - ID 21: Coin bas droit (160mm, 247mm)
   * 
   * @param data - Buffer image
   * @param width - Largeur image
   * @param height - Hauteur image
   * @returns Liste de marqueurs détectés (1 marqueur = 1 feuille A4)
   */
  private detectAprilTagMetreA4(
    data: Uint8ClampedArray | Buffer,
    width: number,
    height: number
  ): MarkerDetectionResult[] {
    console.log('🎯 [APRILTAG] Détection AprilTags Métré V1.2...');
    
    try {
      // Convertir RGBA → Grayscale (simple moyenne des canaux RGB)
      const grayscale = new Uint8Array(width * height);
      for (let i = 0; i < width * height; i++) {
        const r = data[i * 4];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];
        grayscale[i] = Math.floor((r + g + b) / 3);
      }
      
      // Créer détecteur AprilTag (famille 36h11 pour Métré V1.2)
      const detector = new AprilTag(FAMILIES.TAG36H11, {
        quadDecimate: 2.0,    // Accélération sur grandes images
        quadSigma: 0.0,       // Pas de flou gaussien
        refineEdges: true,    // Meilleure précision des coins
        decodeSharpening: 0.25
      });
      
      // Détecter les tags (synchrone)
      const detections = detector.detect(width, height, grayscale);
      
      console.log(`   🔍 ${detections.length} AprilTag(s) détecté(s)`);
      
      if (detections.length === 0) {
        return [];
      }
      
      // Convertir les détections au format attendu
      // Format @monumental-works/apriltag-node: detection.corners = [[x0,y0], [x1,y1], [x2,y2], [x3,y3]]
      const detectedTags: { id: number; corners: Point2D[] }[] = [];
      for (const detection of detections) {
        const tagCorners: Point2D[] = [
          { x: detection.corners[0][0], y: detection.corners[0][1] }, // Top-left
          { x: detection.corners[1][0], y: detection.corners[1][1] }, // Top-right
          { x: detection.corners[2][0], y: detection.corners[2][1] }, // Bottom-right
          { x: detection.corners[3][0], y: detection.corners[3][1] }  // Bottom-left
        ];
        
        detectedTags.push({ id: detection.id, corners: tagCorners });
        console.log(`   ✅ AprilTag ID=${detection.id} détecté`);
      }
      
      // Vérifier qu'on a les 4 tags nécessaires (2, 7, 14, 21)
      const requiredIds = [2, 7, 14, 21];
      const foundIds = detectedTags.map(t => t.id);
      const missingIds = requiredIds.filter(id => !foundIds.includes(id));
      
      if (missingIds.length > 0) {
        console.log(`   ⚠️ AprilTags manquants: ${missingIds.join(', ')}`);
        console.log(`   📌 Trouvés: ${foundIds.join(', ')}`);
        return [];
      }
      
      // Récupérer les centres des 4 AprilTags
      const tagTL = detectedTags.find(t => t.id === 2)!;  // Top-Left
      const tagTR = detectedTags.find(t => t.id === 7)!;  // Top-Right
      const tagBL = detectedTags.find(t => t.id === 14)!; // Bottom-Left
      const tagBR = detectedTags.find(t => t.id === 21)!; // Bottom-Right
      
      // Centre de chaque AprilTag (moyenne des 4 coins)
      const centerTL = this.getTagCenter(tagTL.corners);
      const centerTR = this.getTagCenter(tagTR.corners);
      const centerBL = this.getTagCenter(tagBL.corners);
      const centerBR = this.getTagCenter(tagBR.corners);
      
      console.log(`   📍 Centres AprilTags:`);
      console.log(`      TL(2):  (${centerTL.x.toFixed(0)}, ${centerTL.y.toFixed(0)})`);
      console.log(`      TR(7):  (${centerTR.x.toFixed(0)}, ${centerTR.y.toFixed(0)})`);
      console.log(`      BL(14): (${centerBL.x.toFixed(0)}, ${centerBL.y.toFixed(0)})`);
      console.log(`      BR(21): (${centerBR.x.toFixed(0)}, ${centerBR.y.toFixed(0)})`);
      
      // Les centres des AprilTags SONT les coins de la feuille A4 Métré
      // Position réelle des AprilTags sur la feuille:
      // - TL: (30mm, 30mm)
      // - TR: (160mm, 30mm)
      // - BL: (30mm, 247mm)
      // - BR: (160mm, 247mm)
      // Donc distance réelle entre centres = distance connue
      
      const corners = [centerTL, centerTR, centerBR, centerBL]; // Ordre clockwise
      const measurements = this.calculateMeasurements(corners);
      
      console.log(`   ✅ Feuille Métré V1.2 détectée!`);
      console.log(`      Taille moyenne: ${measurements.avgSidePx.toFixed(0)}px`);
      console.log(`      Pixels/cm: ${measurements.pixelsPerCm.toFixed(2)}`);
      
      return [{
        id: 0,
        corners,
        apriltagPositions: corners,
        size: measurements.avgSidePx,
        center: measurements.center,
        score: 0.95, // Haute confiance car AprilTags détectés
        apriltagsFound: 4,
        homography: {
          realSizeCm: 21, // Feuille A4 = 21cm de largeur
          pixelsPerCm: measurements.pixelsPerCm,
          sides: measurements.sides,
          angles: measurements.angles
        }
      }];
      
    } catch (error) {
      console.error('❌ [APRILTAG] Erreur détection:', error);
      return [];
    }
  }

  /**
   * Calcule le centre d'un AprilTag à partir de ses 4 coins
   */
  private getTagCenter(corners: Point2D[]): Point2D {
    const sumX = corners.reduce((sum, p) => sum + p.x, 0);
    const sumY = corners.reduce((sum, p) => sum + p.y, 0);
    return {
      x: sumX / corners.length,
      y: sumY / corners.length
    };
  }

  /**
   * ⬜ DÉTECTION PAR ZONES BLANCHES CARRÉES
   * 
   * Le marqueur ArUco a un FOND BLANC visible sur un écran/surface sombre.
   * Cette méthode cherche les zones blanches carrées dans l'image.
   */
  private detectWhiteSquareRegions(
    data: Uint8ClampedArray | Buffer,
    width: number,
    height: number
  ): MarkerDetectionResult[] {
    console.log('⬜ [ArUco] Recherche zones BLANCHES CARRÉES...');
    
    // Sous-échantillonner pour performance
    const step = Math.max(4, Math.floor(Math.min(width, height) / 300));
    
    // Trouver les pixels blancs/clairs (luminosité > 180)
    const brightPixels: Point2D[] = [];
    
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const idx = (y * width + x) * 4;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
        const brightness = (r + g + b) / 3;
        
        // Chercher pixels blancs/clairs
        if (brightness > 150 && Math.max(r, g, b) - Math.min(r, g, b) < 60) {
          brightPixels.push({ x, y });
        }
      }
    }
    
    console.log(`   ⬜ ${brightPixels.length} pixels clairs trouvés`);
    
    if (brightPixels.length < 20) {
      return [];
    }
    
    // Limiter pour éviter les problèmes de mémoire
    if (brightPixels.length > 10000) {
      console.log(`   ⚠️ Trop de pixels clairs (${brightPixels.length}) - zone trop grande`);
      return [];
    }
    
    // Trouver la bounding box des pixels clairs
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of brightPixels) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    
    const regionWidth = maxX - minX;
    const regionHeight = maxY - minY;
    const ratio = Math.max(regionWidth, regionHeight) / Math.min(regionWidth, regionHeight);
    
    console.log(`   📐 Zone blanche: ${regionWidth}×${regionHeight}px (ratio: ${ratio.toFixed(2)})`);
    
    // Le marqueur doit être approximativement carré
    if (ratio > 1.8) {
      console.log(`   ⚠️ Zone blanche trop rectangulaire (ratio ${ratio.toFixed(2)} > 1.8)`);
      return [];
    }
    
    // Taille minimum pour être exploitable
    if (Math.min(regionWidth, regionHeight) < 50) {
      console.log(`   ⚠️ Zone blanche trop petite`);
      return [];
    }
    
    // Taille maximum - si c'est tout l'écran, ce n'est pas le marqueur
    if (Math.max(regionWidth, regionHeight) > Math.min(width, height) * 0.6) {
      console.log(`   ⚠️ Zone blanche trop grande (probablement pas le marqueur)`);
      return [];
    }
    
    // Vérifier la structure ArUco dans cette zone
    const candidateCorners: Point2D[] = [
      { x: minX, y: minY },     // TL
      { x: maxX, y: minY },     // TR
      { x: maxX, y: maxY },     // BR
      { x: minX, y: maxY }      // BL
    ];
    
    // Vérifier qu'on a bien un pattern noir→blanc→noir autour
    const structureScore = this.validateArucoStructure(data, width, height, candidateCorners);
    console.log(`   🔲 Score structure ArUco: ${(structureScore * 100).toFixed(0)}%`);
    
    if (structureScore < 0.4) {
      console.log(`   ⚠️ Structure ArUco non confirmée (score ${(structureScore * 100).toFixed(0)}% < 40%)`);
      return [];
    }
    
    console.log(`   ✅ Zone blanche validée comme marqueur ArUco!`);
    
    // 🎯 FIX: Les coins détectés SONT les coins du carré 16.8cm (pas besoin de réduire de 1/3)
    const orderedCorners = this.orderCornersClockwise(candidateCorners);
    
    const measurements = this.calculateMeasurements(orderedCorners);
    
    return [{
      id: 0,
      corners: orderedCorners, // 🎯 FIX: Utiliser directement les coins détectés
      apriltagPositions: orderedCorners,
      size: measurements.avgSidePx,
      center: measurements.center,
      score: 0.85,
      apriltagsFound: 0,
      homography: {
        realSizeCm: MARKER_SPECS.markerSize,
        pixelsPerCm: measurements.pixelsPerCm,
        sides: measurements.sides,
        angles: measurements.angles
      }
    }];
  }

  /**
  /**
   * 📄 DÉTECTION A4: Recherche de zones blanches RECTANGULAIRES (ratio ~1.41)
  /**
   * Spécialement conçue pour feuilles A4 (21x29.7cm), pas de limite de pixels
  /**
   * Contrairement à detectWhiteSquareRegions qui cherche des carrés avec max 10k pixels
   */
  private detectA4WhiteRegions(
    data: Uint8ClampedArray | Buffer,
    width: number,
    height: number
  ): MarkerDetectionResult[] {
    console.log('📄 [A4] DÉTECTION FEUILLE BLANCHE - Cherche rectangle A4 blanc...');
    
    const step = Math.max(2, Math.floor(Math.min(width, height) / 500));
    const brightPixels: Point2D[] = [];
    
    // 🎯 SEUIL ADAPTATIF - Tolérant pour différents éclairages
    // Le papier A4 est généralement le plus blanc de l'image
    const BRIGHTNESS_THRESHOLD = 200; // Réduit de 220 → 200 pour plus de tolérance
    
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const idx = (y * width + x) * 4;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
        const brightness = (r + g + b) / 3;
        
        // Papier blanc : haute luminosité + faible différence RGB (neutre)
        if (brightness > BRIGHTNESS_THRESHOLD && Math.max(r, g, b) - Math.min(r, g, b) < 60) {
          brightPixels.push({ x, y });
        }
      }
    }
    
    console.log(`   ⬜ ${brightPixels.length} pixels blancs détectés (seuil: ${BRIGHTNESS_THRESHOLD})`);
    
    if (brightPixels.length < 50) {
      console.log(`   ⚠️ Très peu de pixels blancs (${brightPixels.length}) - feuille A4 probablement absente ou mal éclairée`);
      return [];
    }
    
    // 🚫 LIMITE SUPÉRIEURE - Rejeter si c'est presque toute l'image
    const totalImagePixels = width * height;
    const sampledImagePixels = totalImagePixels / (step * step);
    const whitePixelRatio = brightPixels.length / sampledImagePixels;
    
    // ⚠️ DÉSACTIVÉ: Ce seuil rejette les photos avec fond clair
    // On garde le check sur widthRatio/heightRatio qui est plus précis
    // if (whitePixelRatio > 0.85) {
    //   console.log(`   ⚠️ Zone trop grande (${(whitePixelRatio * 100).toFixed(0)}% de l'image) - probablement l'image entière, pas une A4`);
    //   return [];
    // }
    
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of brightPixels) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    
    const regionWidth = maxX - minX;
    const regionHeight = maxY - minY;
    
    // 🚫 REJETER si la zone détectée est quasiment la taille de l'image entière
    const widthRatio = regionWidth / width;
    const heightRatio = regionHeight / height;
    
    // 🔧 FIX: Assouplir le seuil de 0.95 → 0.98 pour permettre fonds clairs
    // Si VRAIMENT toute l'image (>98%), alors c'est probablement pas une A4
    if (widthRatio > 0.98 && heightRatio > 0.98) {
      console.log(`   ⚠️ Zone = ${(widthRatio * 100).toFixed(0)}% × ${(heightRatio * 100).toFixed(0)}% de l'image - c'est l'image entière, pas une A4!`);
      return [];
    }
    
    console.log(`   📊 Zone blanche: ${(whitePixelRatio * 100).toFixed(0)}% pixels, ${(widthRatio * 100).toFixed(0)}% × ${(heightRatio * 100).toFixed(0)}% dimensions`);
    
    const ratio = Math.max(regionWidth, regionHeight) / Math.min(regionWidth, regionHeight);
    
    console.log(`   📐 Zone: ${regionWidth}×${regionHeight}px (ratio: ${ratio.toFixed(2)}, ${(widthRatio * 100).toFixed(0)}% × ${(heightRatio * 100).toFixed(0)}% de l'image)`);
    
    const A4_RATIO = 297 / 210; // ~1.414
    const ratioError = Math.abs(ratio - A4_RATIO) / A4_RATIO;
    
    // ✅ RATIO STRICT pour A4 - tolérance ±30% autour de 1.414
    if (ratio < 1.15 || ratio > 1.70) {
      console.log(`   ⚠️ Ratio ${ratio.toFixed(2)} incompatible avec A4 (attendu: 1.15-1.70, idéal: ${A4_RATIO.toFixed(2)})`);
      return [];
    }
    
    console.log(`   ✅ FEUILLE A4 DÉTECTÉE ! Ratio: ${ratio.toFixed(2)} (erreur: ${(ratioError * 100).toFixed(1)}%)`);
    
    if (Math.min(regionWidth, regionHeight) < 50) {
      console.log(`   ⚠️ Zone trop petite (min 50px)`);
      return [];
    }
    
    const candidateCorners: Point2D[] = [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY }
    ];
    
    console.log(`   🎯 FEUILLE A4 DÉTECTÉE !`);
    console.log(`   📐 Dimensions: ${regionWidth}×${regionHeight}px`);
    console.log(`   📏 Ratio: ${ratio.toFixed(2)} (A4 idéal: ${A4_RATIO.toFixed(2)}, tolérance: 1.15-1.70)`);
    console.log(`   📊 Occupation image: ${(widthRatio * 100).toFixed(0)}% × ${(heightRatio * 100).toFixed(0)}%`);
    console.log(`   ✅ Coins: TL(${minX},${minY}) → TR(${maxX},${minY}) → BR(${maxX},${maxY}) → BL(${minX},${maxY})`);
    
    return [{
      corners: candidateCorners,
      score: 0.85,
      detectionMethod: 'A4-white-rectangle-detection',
      metadata: {
        ratioError,
        pixelsFound: brightPixels.length,
        dimensions: { width: regionWidth, height: regionHeight },
        actualRatio: ratio,
        targetRatio: A4_RATIO,
        imageOccupancy: { width: widthRatio, height: heightRatio },
        purpose: 'A4 sheet with logo, QR code, and measurement zone'
      }
    }];
  }

  /**
  /**
   * 🎯 NOUVELLE MÉTHODE PRINCIPALE: Détection par LIGNES NOIRES
  /**
   * 
  /**
   * Algorithme:
  /**
   * 1. Détecter les contours (gradients forts = transitions)
  /**
   * 2. Trouver les 4 lignes formant le quadrilatère externe
  /**
   * 3. Calculer les intersections = coins du marqueur
  /**
   * 4. Valider avec les positions magenta si disponibles
   */
  private detectFromBlackLines(
    data: Uint8ClampedArray | Buffer,
    width: number,
    height: number
  ): MarkerDetectionResult[] {
    console.log('🔲 [ArUco] Détection par LIGNES NOIRES EXTÉRIEURES...');
    
    // ÉTAPE 1: Calculer la carte de gradients (edge detection simplifié)
    const edgeMap = this.computeEdgeMap(data, width, height);
    
    // ÉTAPE 2: Trouver les lignes dominantes via accumulation Hough simplifiée
    const lines = this.findDominantLines(edgeMap, width, height);
    
    if (lines.length < 4) {
      console.log(`   ⚠️ Seulement ${lines.length} lignes trouvées (besoin de 4)`);
      return [];
    }
    
    // ÉTAPE 3: Trouver le meilleur quadrilatère
    const quad = this.findBestQuadrilateral(lines, width, height);
    
    if (!quad) {
      console.log('   ⚠️ Aucun quadrilatère valide trouvé');
      return [];
    }
    
    // 🔲 VALIDATION FORME: Le marqueur ArUco doit être approximativement CARRÉ
    const corners = quad.corners;
    const widthPx = Math.sqrt(
      Math.pow(corners[1].x - corners[0].x, 2) + Math.pow(corners[1].y - corners[0].y, 2)
    );
    const heightPx = Math.sqrt(
      Math.pow(corners[3].x - corners[0].x, 2) + Math.pow(corners[3].y - corners[0].y, 2)
    );
    const aspectRatio = Math.max(widthPx, heightPx) / Math.min(widthPx, heightPx);
    
    console.log(`   📐 Dimensions: ${widthPx.toFixed(0)}px × ${heightPx.toFixed(0)}px (ratio: ${aspectRatio.toFixed(2)})`);
    
    // Un marqueur ArUco doit avoir un ratio proche de 1 (carré)
    // Tolérance: jusqu'à 1.8:1 pour tenir compte de la perspective modérée
    // Un ratio de 2+ signifie que c'est un rectangle, PAS un carré!
    if (aspectRatio > 1.8) {
      console.log(`   ⚠️ REJET: Ratio ${aspectRatio.toFixed(2)} trop éloigné d'un carré (max 1.8)`);
      return [];
    }
    
    // Taille minimale: au moins 50px de côté pour être exploitable
    const minSide = Math.min(widthPx, heightPx);
    if (minSide < 50) {
      console.log(`   ⚠️ REJET: Côté ${minSide.toFixed(0)}px trop petit (min 50px)`);
      return [];
    }
    
    // 🎯 VALIDATION STRUCTURE ARUCO: Vérifier les transitions noir→blanc→noir
    const structureScore = this.validateArucoStructure(data, width, height, corners);
    console.log(`   🔲 Score structure ArUco: ${(structureScore * 100).toFixed(0)}%`);
    
    // Score minimum 50% - le vrai marqueur aura des transitions claires
    if (structureScore < 0.5) {
      console.log(`   ⚠️ REJET: Structure ArUco non détectée (score ${(structureScore * 100).toFixed(0)}% < 50%)`);
      return [];
    }
    
    console.log('   ✅ Quadrilatère validé comme marqueur ArUco');
    
    // ÉTAPE 4: Chercher les coins magenta pour validation/raffinement
    const magentaPixels = this.findAllMagentaPixels(data, width, height);
    const magentaClusters = this.clusterMagentaPixels(magentaPixels);
    
    let finalCorners = quad.corners;
    let apriltagsFound = 0;
    
    // Si on trouve des coins AprilTag, les utiliser pour raffiner
    if (magentaClusters.length >= 3) {
      const refinedCorners = this.refineWithMagenta(quad.corners, magentaClusters);
      if (refinedCorners) {
        finalCorners = refinedCorners.corners;
        apriltagsFound = refinedCorners.matchedCount;
        console.log(`   🎯 Coins raffinés avec ${apriltagsFound} AprilTags`);
      }
    }
    
    // Ordonner les coins [TL, TR, BR, BL]
    const orderedCorners = this.orderCornersClockwise(finalCorners);
    
    // 🎯 FIX: Les coins détectés (raffinés avec magenta) SONT les coins du carré 16.8cm
    // Pas besoin de réduire de 1/3 - les points magenta sont aux coins exacts du marqueur
    
    const measurements = this.calculateMeasurements(orderedCorners);
    
    return [{
      id: 0,
      corners: orderedCorners, // 🎯 FIX: Utiliser directement les coins détectés
      magentaPositions: orderedCorners,
      size: measurements.avgSidePx,
      center: measurements.center,
      score: 0.8 + (magentaFound / 4) * 0.15,
      magentaFound,
      homography: {
        realSizeCm: MARKER_SPECS.markerSize,
        pixelsPerCm: measurements.pixelsPerCm,
        sides: measurements.sides,
        angles: measurements.angles
      }
    }];
  }

  /**
   * Calculer la carte des contours (edge map)
  /**
   * Utilise un Sobel simplifié pour détecter les gradients
   */
  private computeEdgeMap(
    data: Uint8ClampedArray | Buffer,
    width: number,
    height: number
  ): Float32Array {
    const edgeMap = new Float32Array(width * height);
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        // Luminosité des 8 voisins
        const getL = (px: number, py: number) => {
          const idx = (py * width + px) * 4;
          return (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        };
        
        // Sobel X
        const gx = -getL(x - 1, y - 1) + getL(x + 1, y - 1)
                  - 2 * getL(x - 1, y) + 2 * getL(x + 1, y)
                  - getL(x - 1, y + 1) + getL(x + 1, y + 1);
        
        // Sobel Y
        const gy = -getL(x - 1, y - 1) - 2 * getL(x, y - 1) - getL(x + 1, y - 1)
                  + getL(x - 1, y + 1) + 2 * getL(x, y + 1) + getL(x + 1, y + 1);
        
        edgeMap[y * width + x] = Math.sqrt(gx * gx + gy * gy);
      }
    }
    
    return edgeMap;
  }

  /**
   * Trouver les lignes dominantes via une transformation de Hough simplifiée
   */
  private findDominantLines(
    edgeMap: Float32Array,
    width: number,
    height: number
  ): Array<{ rho: number; theta: number; votes: number }> {
    const thetaSteps = 180;
    const rhoMax = Math.sqrt(width * width + height * height);
    const rhoSteps = Math.ceil(rhoMax * 2);
    
    // Accumulateur Hough
    const accumulator = new Uint32Array(thetaSteps * rhoSteps);
    const edgeThreshold = 50;
    
    // Sous-échantillonner pour la performance
    const step = 2;
    
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const edge = edgeMap[y * width + x];
        if (edge < edgeThreshold) continue;
        
        // Voter pour toutes les lignes passant par ce point
        for (let thetaIdx = 0; thetaIdx < thetaSteps; thetaIdx++) {
          const theta = (thetaIdx / thetaSteps) * Math.PI;
          const rho = x * Math.cos(theta) + y * Math.sin(theta);
          const rhoIdx = Math.round(rho + rhoMax);
          
          if (rhoIdx >= 0 && rhoIdx < rhoSteps) {
            accumulator[thetaIdx * rhoSteps + rhoIdx]++;
          }
        }
      }
    }
    
    // Trouver les pics (lignes dominantes)
    const lines: Array<{ rho: number; theta: number; votes: number }> = [];
    const minVotes = Math.max(30, width * height * 0.0001);
    
    for (let thetaIdx = 0; thetaIdx < thetaSteps; thetaIdx++) {
      for (let rhoIdx = 0; rhoIdx < rhoSteps; rhoIdx++) {
        const votes = accumulator[thetaIdx * rhoSteps + rhoIdx];
        if (votes > minVotes) {
          const theta = (thetaIdx / thetaSteps) * Math.PI;
          const rho = rhoIdx - rhoMax;
          
          // Vérifier que ce n'est pas trop proche d'une ligne existante
          const tooClose = lines.some(l => 
            Math.abs(l.theta - theta) < 0.1 && Math.abs(l.rho - rho) < 20
          );
          
          if (!tooClose) {
            lines.push({ rho, theta, votes });
          }
        }
      }
    }
    
    // Trier par votes décroissants
    lines.sort((a, b) => b.votes - a.votes);
    
    console.log(`   📏 ${lines.length} lignes dominantes trouvées`);
    
    return lines.slice(0, 20); // Garder les 20 meilleures
  }

  /**
   * Trouver le meilleur quadrilatère parmi les lignes
  /**
   * 🎯 AMÉLIORÉ: Génère plusieurs candidats et les score par structure ArUco
   */
  private findBestQuadrilateral(
    lines: Array<{ rho: number; theta: number; votes: number }>,
    width: number,
    height: number
  ): { corners: Point2D[]; score: number } | null {
    if (lines.length < 4) return null;
    
    // Séparer les lignes quasi-horizontales et quasi-verticales
    const horizontal: typeof lines = [];
    const vertical: typeof lines = [];
    
    for (const line of lines) {
      const angleDeg = (line.theta * 180 / Math.PI) % 180;
      if (angleDeg < 45 || angleDeg > 135) {
        vertical.push(line);
      } else {
        horizontal.push(line);
      }
    }
    
    console.log(`   📐 ${horizontal.length} horizontales, ${vertical.length} verticales`);
    
    // 🎯 NOUVEAU: Générer PLUSIEURS candidats et les scorer
    const candidates: Array<{ corners: Point2D[]; score: number }> = [];
    
    const intersect = (l1: typeof lines[0], l2: typeof lines[0]): Point2D | null => {
      const cos1 = Math.cos(l1.theta), sin1 = Math.sin(l1.theta);
      const cos2 = Math.cos(l2.theta), sin2 = Math.sin(l2.theta);
      
      const det = cos1 * sin2 - sin1 * cos2;
      if (Math.abs(det) < 0.001) return null;
      
      const x = (l1.rho * sin2 - l2.rho * sin1) / det;
      const y = (l2.rho * cos1 - l1.rho * cos2) / det;
      
      return { x, y };
    };
    
    const margin = -50;
    const inBounds = (p: Point2D) => 
      p.x >= margin && p.x < width - margin && 
      p.y >= margin && p.y < height - margin;
    
    // Essayer toutes les combinaisons de 2 horizontales × 2 verticales
    const maxH = Math.min(horizontal.length, 6);
    const maxV = Math.min(vertical.length, 6);
    
    for (let hi = 0; hi < maxH; hi++) {
      for (let hj = hi + 1; hj < maxH; hj++) {
        for (let vi = 0; vi < maxV; vi++) {
          for (let vj = vi + 1; vj < maxV; vj++) {
            const h1 = horizontal[hi], h2 = horizontal[hj];
            const v1 = vertical[vi], v2 = vertical[vj];
            
            const c1 = intersect(h1, v1);
            const c2 = intersect(h1, v2);
            const c3 = intersect(h2, v1);
            const c4 = intersect(h2, v2);
            
            if (!c1 || !c2 || !c3 || !c4) continue;
            if (!inBounds(c1) || !inBounds(c2) || !inBounds(c3) || !inBounds(c4)) continue;
            
            const corners = this.orderCornersClockwise([c1, c2, c3, c4]);
            
            // 📐 Vérifier le ratio (doit être proche de 1 pour un carré)
            const w = Math.sqrt((corners[1].x - corners[0].x) ** 2 + (corners[1].y - corners[0].y) ** 2);
            const h = Math.sqrt((corners[3].x - corners[0].x) ** 2 + (corners[3].y - corners[0].y) ** 2);
            const ratio = Math.max(w, h) / Math.min(w, h);
            
            if (ratio > 1.8) continue; // Trop étiré - un carré a ratio ~1.0
            if (Math.min(w, h) < 50) continue; // Trop petit
            
            // 🎯 Score basé sur:
            // 1. Ratio proche de 1 (carré) = bonus
            // 2. Votes des lignes = bonus
            // 3. Taille raisonnable = bonus
            const ratioScore = Math.max(0, 1 - (ratio - 1) * 0.3); // 1.0 si carré parfait
            const voteScore = (h1.votes + h2.votes + v1.votes + v2.votes) / 4000;
            const sizeScore = Math.min(1, Math.min(w, h) / 200); // Préférer les grands
            
            const score = ratioScore * 0.5 + voteScore * 0.3 + sizeScore * 0.2;
            
            candidates.push({ corners, score });
          }
        }
      }
    }
    
    if (candidates.length === 0) {
      // Fallback sur l'ancienne méthode
      return this.findQuadFromAllLines(lines, width, height);
    }
    
    // Trier par score décroissant
    candidates.sort((a, b) => b.score - a.score);
    
    console.log(`   🎯 ${candidates.length} candidats générés, meilleur score: ${candidates[0].score.toFixed(2)}`);
    
    return candidates[0];
  }

  /**
   * Fallback: chercher un quadrilatère parmi toutes les lignes
   */
  private findQuadFromAllLines(
    lines: Array<{ rho: number; theta: number; votes: number }>,
    width: number,
    height: number
  ): { corners: Point2D[] } | null {
    // Essayer les combinaisons de 4 lignes
    for (let i = 0; i < Math.min(lines.length, 8); i++) {
      for (let j = i + 1; j < Math.min(lines.length, 8); j++) {
        for (let k = j + 1; k < Math.min(lines.length, 8); k++) {
          for (let l = k + 1; l < Math.min(lines.length, 8); l++) {
            const quad = this.tryMakeQuad([lines[i], lines[j], lines[k], lines[l]], width, height);
            if (quad) return quad;
          }
        }
      }
    }
    return null;
  }

  /**
   * Essayer de former un quadrilatère avec 4 lignes
   */
  private tryMakeQuad(
    lines: Array<{ rho: number; theta: number; votes: number }>,
    width: number,
    height: number
  ): { corners: Point2D[] } | null {
    const corners: Point2D[] = [];
    
    // Calculer toutes les intersections
    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        const l1 = lines[i], l2 = lines[j];
        const cos1 = Math.cos(l1.theta), sin1 = Math.sin(l1.theta);
        const cos2 = Math.cos(l2.theta), sin2 = Math.sin(l2.theta);
        
        const det = cos1 * sin2 - sin1 * cos2;
        if (Math.abs(det) < 0.1) continue; // Lignes parallèles
        
        const x = (l1.rho * sin2 - l2.rho * sin1) / det;
        const y = (l2.rho * cos1 - l1.rho * cos2) / det;
        
        if (x >= -50 && x < width + 50 && y >= -50 && y < height + 50) {
          corners.push({ x, y });
        }
      }
    }
    
    if (corners.length !== 4) return null;
    
    // Vérifier que c'est un quadrilatère convexe raisonnable
    const ordered = this.orderCornersClockwise(corners);
    const area = this.calculateQuadArea(ordered);
    
    const minArea = (width * height) * 0.01;
    const maxArea = (width * height) * 0.9;
    
    if (area < minArea || area > maxArea) return null;
    
    return { corners: ordered };
  }

  /**
   * Calculer l'aire d'un quadrilatère
   */
  private calculateQuadArea(corners: Point2D[]): number {
    let area = 0;
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      area += corners[i].x * corners[j].y;
      area -= corners[j].x * corners[i].y;
    }
    return Math.abs(area) / 2;
  }

  /**
   * Raffiner les coins du quadrilatère avec les positions magenta
   */
  private refineWithMagenta(
    corners: Point2D[],
    clusters: MagentaCluster[]
  ): { corners: Point2D[]; matchedCount: number } | null {
    const refined: Point2D[] = [];
    let matchedCount = 0;
    
    for (const corner of corners) {
      // Chercher le cluster magenta le plus proche
      let bestCluster: MagentaCluster | null = null;
      let bestDist = 100; // Distance max pour match
      
      for (const cluster of clusters) {
        const dist = Math.sqrt(
          (cluster.cx - corner.x) ** 2 + (cluster.cy - corner.y) ** 2
        );
        if (dist < bestDist) {
          bestDist = dist;
          bestCluster = cluster;
        }
      }
      
      if (bestCluster) {
        refined.push({ x: bestCluster.cx, y: bestCluster.cy });
        matchedCount++;
      } else {
        refined.push(corner);
      }
    }
    
    if (matchedCount < 3) return null;
    
    return { corners: refined, matchedCount };
  }

  /**
   * Ordonner les coins en sens horaire: [TL, TR, BR, BL]
   */
  private orderCornersClockwise(corners: Point2D[]): Point2D[] {
    // Calculer le centre
    const cx = corners.reduce((s, p) => s + p.x, 0) / 4;
    const cy = corners.reduce((s, p) => s + p.y, 0) / 4;
    
    // Trier par angle
    const sorted = [...corners].sort((a, b) => {
      const angleA = Math.atan2(a.y - cy, a.x - cx);
      const angleB = Math.atan2(b.y - cy, b.x - cx);
      return angleA - angleB;
    });
    
    // Trouver le coin en haut à gauche (plus petit x+y)
    let tlIdx = 0;
    let minSum = Infinity;
    for (let i = 0; i < 4; i++) {
      const sum = sorted[i].x + sorted[i].y;
      if (sum < minSum) {
        minSum = sum;
        tlIdx = i;
      }
    }
    
    // Réordonner pour que TL soit premier
    return [
      sorted[tlIdx],
      sorted[(tlIdx + 1) % 4],
      sorted[(tlIdx + 2) % 4],
      sorted[(tlIdx + 3) % 4]
    ];
  }

  /**
   * 🔲 VALIDATION STRUCTURE ARUCO
  /**
   * Vérifie que le quadrilatère contient bien la structure attendue:
  /**
   * NOIR (1/6) → BLANC (1/6) → PATTERN (2/6) → BLANC (1/6) → NOIR (1/6)
  /**
   * 
  /**
   * Parcourt les bords et vérifie les transitions de luminosité
   */
  private validateArucoStructure(
    data: Uint8ClampedArray | Buffer,
    width: number,
    height: number,
    corners: Point2D[]
  ): number {
    const [tl, tr, br, bl] = corners;
    
    // Vérifier sur les 4 bords
    const edges = [
      { start: tl, end: tr, name: 'TOP' },
      { start: tr, end: br, name: 'RIGHT' },
      { start: br, end: bl, name: 'BOTTOM' },
      { start: bl, end: tl, name: 'LEFT' }
    ];
    
    let totalScore = 0;
    let validEdges = 0;
    
    for (const edge of edges) {
      const edgeScore = this.validateEdgeStructure(data, width, height, edge.start, edge.end);
      if (edgeScore > 0.3) {
        totalScore += edgeScore;
        validEdges++;
      }
    }
    
    // Score global: moyenne des bords valides (besoin d'au moins 2 bords)
    if (validEdges < 2) return 0;
    
    return totalScore / validEdges;
  }

  /**
   * Valider la structure d'un bord du marqueur
  /**
   * Attend: NOIR (16%) → BLANC (16%) → PATTERN (33%) → BLANC (16%) → NOIR (16%)
   */
  private validateEdgeStructure(
    data: Uint8ClampedArray | Buffer,
    width: number,
    height: number,
    start: Point2D,
    end: Point2D
  ): number {
    const samples = 30; // Nombre d'échantillons le long du bord
    const luminosities: number[] = [];
    
    // Échantillonner la luminosité le long du bord
    for (let i = 0; i < samples; i++) {
      const t = i / (samples - 1);
      const x = Math.round(start.x + (end.x - start.x) * t);
      const y = Math.round(start.y + (end.y - start.y) * t);
      
      // Vérifier les bornes
      if (x < 0 || x >= width || y < 0 || y >= height) {
        luminosities.push(128); // Valeur neutre
        continue;
      }
      
      const idx = (y * width + x) * 4;
      const r = data[idx] || 0;
      const g = data[idx + 1] || 0;
      const b = data[idx + 2] || 0;
      const lum = (r + g + b) / 3;
      luminosities.push(lum);
    }
    
    // Analyser les transitions
    // Structure attendue sur 30 samples:
    // 0-5: NOIR (sombre)
    // 5-10: BLANC (clair)
    // 10-20: PATTERN (variable)
    // 20-25: BLANC (clair)
    // 25-30: NOIR (sombre)
    
    const zone1 = luminosities.slice(0, 5); // Premier noir
    const zone2 = luminosities.slice(5, 10); // Premier blanc
    const zone4 = luminosities.slice(20, 25); // Deuxième blanc
    const zone5 = luminosities.slice(25, 30); // Deuxième noir
    
    const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 128;
    
    const avgNoir1 = avg(zone1);
    const avgBlanc1 = avg(zone2);
    const avgBlanc2 = avg(zone4);
    const avgNoir2 = avg(zone5);
    
    // Vérifier les contrastes
    // Les zones noires doivent être plus sombres que les zones blanches
    let score = 0;
    
    // Noir1 < Blanc1
    if (avgBlanc1 - avgNoir1 > 30) score += 0.25;
    else if (avgBlanc1 - avgNoir1 > 15) score += 0.15;
    
    // Noir2 < Blanc2
    if (avgBlanc2 - avgNoir2 > 30) score += 0.25;
    else if (avgBlanc2 - avgNoir2 > 15) score += 0.15;
    
    // Les deux zones noires doivent être similaires
    if (Math.abs(avgNoir1 - avgNoir2) < 40) score += 0.25;
    
    // Les deux zones blanches doivent être similaires
    if (Math.abs(avgBlanc1 - avgBlanc2) < 40) score += 0.25;
    
    return score;
  }

  /**
   * ⭐ NOUVEAU: Détecter les 16 points de référence étendus
  /**
   * - 4 coins (déjà détectés par magenta)
  /**
   * - 12 transitions NOIR→BLANC et BLANC→NOIR sur chaque bord
   */
  private detectExtendedReferencePoints(
    data: Uint8ClampedArray | Buffer,
    width: number,
    height: number,
    corners: Point2D[]
  ): ExtendedReferencePoints {
    const [tl, tr, br, bl] = corners;
    const transitions = MARKER_SPECS.transitions; // Dynamique: [size/6, size/3, size*2/3, size*5/6]
    const markerSize = MARKER_SPECS.markerSize;   // Dynamique: 16.8, 18, 20, etc.
    
    // Initialiser les résultats
    const allPoints: ExtendedReferencePoints['allPoints'] = [];
    
    // Ajouter les 4 coins avec confiance maximale
    const cornerPositions: Array<{ pixel: Point2D; real: Point2D }> = [
      { pixel: tl, real: { x: 0, y: 0 } },
      { pixel: tr, real: { x: markerSize * 10, y: 0 } },  // CM → MM
      { pixel: br, real: { x: markerSize * 10, y: markerSize * 10 } },  // CM → MM
      { pixel: bl, real: { x: 0, y: markerSize * 10 } }  // CM → MM
    ];
    
    for (const corner of cornerPositions) {
      allPoints.push({
        pixel: corner.pixel,
        real: corner.real,
        confidence: 0.95,
        type: 'corner'
      });
    }
    
    // Détecter les transitions sur chaque bord
    const topTransitions: Point2D[] = [];
    const rightTransitions: Point2D[] = [];
    const bottomTransitions: Point2D[] = [];
    const leftTransitions: Point2D[] = [];
    
    // BORD HAUT: TL → TR
    for (const t of transitions) {
      const ratio = t / markerSize;
      const result = this.detectTransitionOnEdge(data, width, height, tl, tr, ratio);
      topTransitions.push(result.point);
      allPoints.push({
        pixel: result.point,
        real: { x: t * 10, y: 0 },  // CM → MM
        confidence: result.confidence,
        type: 'transition'
      });
    }
    
    // BORD DROIT: TR → BR
    for (const t of transitions) {
      const ratio = t / markerSize;
      const result = this.detectTransitionOnEdge(data, width, height, tr, br, ratio);
      rightTransitions.push(result.point);
      allPoints.push({
        pixel: result.point,
        real: { x: markerSize * 10, y: t * 10 },  // CM → MM
        confidence: result.confidence,
        type: 'transition'
      });
    }
    
    // BORD BAS: BL → BR
    for (const t of transitions) {
      const ratio = t / markerSize;
      const result = this.detectTransitionOnEdge(data, width, height, bl, br, ratio);
      bottomTransitions.push(result.point);
      allPoints.push({
        pixel: result.point,
        real: { x: t * 10, y: markerSize * 10 },  // CM → MM
        confidence: result.confidence,
        type: 'transition'
      });
    }
    
    // BORD GAUCHE: TL → BL
    for (const t of transitions) {
      const ratio = t / markerSize;
      const result = this.detectTransitionOnEdge(data, width, height, tl, bl, ratio);
      leftTransitions.push(result.point);
      allPoints.push({
        pixel: result.point,
        real: { x: 0, y: t * 10 },  // CM → MM
        confidence: result.confidence,
        type: 'transition'
      });
    }
    
    // Calculer la confiance globale et le nombre de points détectés
    const detectedCount = allPoints.filter(p => p.confidence > 0.5).length;
    const avgConfidence = allPoints.reduce((sum, p) => sum + p.confidence, 0) / allPoints.length;
    
    return {
      corners,
      topTransitions,
      rightTransitions,
      bottomTransitions,
      leftTransitions,
      allPoints,
      confidence: avgConfidence,
      detectedCount
    };
  }

  /**
   * ⭐ NOUVEAU: Détecter une transition NOIR↔BLANC sur un bord
  /**
   * Utilise le gradient de luminosité pour trouver le point exact
   */
  private detectTransitionOnEdge(
    data: Uint8ClampedArray | Buffer,
    width: number,
    height: number,
    start: Point2D,
    end: Point2D,
    ratio: number // Position relative sur le bord (0-1)
  ): { point: Point2D; confidence: number } {
    // Position estimée basée sur la géométrie
    const estimatedX = start.x + (end.x - start.x) * ratio;
    const estimatedY = start.y + (end.y - start.y) * ratio;
    
    // Zone de recherche autour de la position estimée
    const searchRadius = Math.max(5, Math.abs(end.x - start.x + end.y - start.y) * 0.03);
    
    // Direction perpendiculaire au bord (pour chercher la transition)
    const edgeLength = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
    const perpX = -(end.y - start.y) / edgeLength;
    const perpY = (end.x - start.x) / edgeLength;
    
    // Direction le long du bord
    const alongX = (end.x - start.x) / edgeLength;
    const alongY = (end.y - start.y) / edgeLength;
    
    let bestPoint = { x: estimatedX, y: estimatedY };
    let bestGradient = 0;
    let confidence = 0.5; // Confiance de base
    
    // Scanner le long du bord autour de la position estimée
    for (let offset = -searchRadius; offset <= searchRadius; offset += 0.5) {
      const scanX = estimatedX + alongX * offset;
      const scanY = estimatedY + alongY * offset;
      
      // Calculer le gradient de luminosité perpendiculaire au bord
      const gradient = this.calculateGradientAt(data, width, height, scanX, scanY, perpX, perpY);
      
      if (Math.abs(gradient) > Math.abs(bestGradient)) {
        bestGradient = gradient;
        bestPoint = { x: scanX, y: scanY };
      }
    }
    
    // Raffiner avec sub-pixel si on a trouvé un bon gradient
    if (Math.abs(bestGradient) > 30) {
      confidence = Math.min(0.95, 0.5 + Math.abs(bestGradient) / 200);
      
      // Raffinement sub-pixel par interpolation parabolique
      const refined = this.refineTransitionSubPixel(
        data, width, height, bestPoint, alongX, alongY
      );
      if (refined) {
        bestPoint = refined;
        confidence = Math.min(0.98, confidence + 0.1);
      }
    }
    
    return { point: bestPoint, confidence };
  }

  /**
   * Calculer le gradient de luminosité à une position donnée
  /**
   * 🔧 AMÉLIORÉ: Multi-échelle + sharpening pour meilleure détection des bords flous
   */
  private calculateGradientAt(
    data: Uint8ClampedArray | Buffer,
    width: number,
    height: number,
    x: number,
    y: number,
    dirX: number,
    dirY: number
  ): number {
    // Multi-échelle: combiner gradients à différentes distances pour robustesse au flou
    // Échelle fine (step=1): sensible aux détails mais bruité
    // Échelle moyenne (step=2): bon compromis
    // Échelle large (step=3): robuste au flou mais moins précis
    
    const getGradient = (step: number) => {
      const before = this.sampleLuminositySharpened(data, width, height, x - dirX * step, y - dirY * step);
      const after = this.sampleLuminositySharpened(data, width, height, x + dirX * step, y + dirY * step);
      return after - before;
    };
    
    // Pondération: privilégier l'échelle moyenne, mais utiliser les autres pour confirmation
    const g1 = getGradient(1);
    const g2 = getGradient(2);
    const g3 = getGradient(3);
    
    // Combinaison pondérée (échelle 2 dominante)
    return 0.25 * g1 + 0.50 * g2 + 0.25 * g3;
  }

  /**
   * 🆕 Échantillonner la luminosité avec unsharp mask (accentuation des bords)
  /**
   * Formule: sharpened = original + α × (original - blurred)
   */
  private sampleLuminositySharpened(
    data: Uint8ClampedArray | Buffer,
    width: number,
    height: number,
    x: number,
    y: number
  ): number {
    const original = this.sampleLuminosity(data, width, height, x, y);
    
    // Moyenne des voisins (approximation du flou gaussien, rayon 1.5px)
    const blurred = (
      this.sampleLuminosity(data, width, height, x - 1.5, y) +
      this.sampleLuminosity(data, width, height, x + 1.5, y) +
      this.sampleLuminosity(data, width, height, x, y - 1.5) +
      this.sampleLuminosity(data, width, height, x, y + 1.5)
    ) / 4;
    
    // Unsharp mask avec α = 0.5 (modéré pour éviter les artefacts)
    const alpha = 0.5;
    const sharpened = original + alpha * (original - blurred);
    
    // Clamp pour éviter les valeurs hors limites
    return Math.max(0, Math.min(255, sharpened));
  }

  /**
   * Échantillonner la luminosité à une position (avec interpolation bilinéaire)
   */
  private sampleLuminosity(
    data: Uint8ClampedArray | Buffer,
    width: number,
    height: number,
    x: number,
    y: number
  ): number {
    // Borner aux limites de l'image
    x = Math.max(0, Math.min(width - 1, x));
    y = Math.max(0, Math.min(height - 1, y));
    
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = Math.min(x0 + 1, width - 1);
    const y1 = Math.min(y0 + 1, height - 1);
    
    const dx = x - x0;
    const dy = y - y0;
    
    // Échantillonner les 4 coins
    const getL = (px: number, py: number) => {
      const idx = (py * width + px) * 4;
      return (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
    };
    
    // Interpolation bilinéaire
    const l00 = getL(x0, y0);
    const l10 = getL(x1, y0);
    const l01 = getL(x0, y1);
    const l11 = getL(x1, y1);
    
    return l00 * (1 - dx) * (1 - dy) +
           l10 * dx * (1 - dy) +
           l01 * (1 - dx) * dy +
           l11 * dx * dy;
  }

  /**
   * Raffiner la position de transition au sub-pixel
   */
  private refineTransitionSubPixel(
    data: Uint8ClampedArray | Buffer,
    width: number,
    height: number,
    point: Point2D,
    dirX: number,
    dirY: number
  ): Point2D | null {
    // Échantillonner 3 points autour de la position
    const step = 0.5;
    const g0 = this.calculateGradientAt(data, width, height, point.x - dirX * step, point.y - dirY * step, dirX, dirY);
    const g1 = this.calculateGradientAt(data, width, height, point.x, point.y, dirX, dirY);
    const g2 = this.calculateGradientAt(data, width, height, point.x + dirX * step, point.y + dirY * step, dirX, dirY);
    
    // Interpolation parabolique pour trouver le maximum
    const denom = 2 * (g0 - 2 * g1 + g2);
    if (Math.abs(denom) < 0.001) return null;
    
    const offset = (g0 - g2) / denom * step;
    
    if (Math.abs(offset) > step) return null;
    
    return {
      x: point.x + dirX * offset,
      y: point.y + dirY * offset
    };
  }

  /**
   * 📄 DÉTECTION A4 ULTRA-PRÉCISE avec sub-pixel refinement + préparation 3D
  /**
   * 
  /**
   * Feuille A4 : 210×297mm, ratio 0.707, épaisseur 4mm
  /**
   * 
  /**
   * Algorithme multi-passes :
  /**
   * PASS 1: Détection bords blancs (edges) - grossière
  /**
   * PASS 2: Sub-pixel refinement (40 échantillons/bord) - précision ±0.1mm
  /**
   * PASS 3: Validation géométrique (angles 90°, ratio 0.707)
  /**
   * PASS 4: [PRÉPARÉ] Détection ombre 3D (épaisseur 4mm) - DÉSACTIVÉ pour l'instant
  /**
   * PASS 5: [FUTUR] Détection marqueurs (croix, logo, orientation)
   */
  private detectA4PaperUltraPrecise(
    data: Uint8ClampedArray | Buffer,
    width: number,
    height: number
  ): MarkerDetectionResult[] {
    console.log('📄 [A4 ULTRA-PRÉCIS] Détection A4 avec sub-pixel refinement...');
    
    // PASS 1: Détection grossière des bords blancs A4 (ratio rectangulaire)
    const whiteMarkers = this.detectA4WhiteRegions(data, width, height);
    if (whiteMarkers.length === 0) {
      console.log('⚠️ [A4] Aucune région blanche A4 détectée');
      return [];
    }
    
    console.log(`📐 [A4] ${whiteMarkers.length} zone(s) blanche(s) détectée(s)`);
    const marker = whiteMarkers[0];
    console.log(`📐 [A4] Bords bruts : TL(${marker.corners[0].x.toFixed(1)},${marker.corners[0].y.toFixed(1)}) → BR(${marker.corners[2].x.toFixed(1)},${marker.corners[2].y.toFixed(1)})`);
    
    // PASS 2: SUB-PIXEL REFINEMENT
    console.log('🔬 [A4] Lancement sub-pixel refinement...');
    const refinedCorners = this.refineA4EdgesSubPixel(data, width, height, marker.corners);
    console.log(`🔬 [A4] Coins raffinés : TL(${refinedCorners[0].x.toFixed(2)},${refinedCorners[0].y.toFixed(2)}) → BR(${refinedCorners[2].x.toFixed(2)},${refinedCorners[2].y.toFixed(2)})`);
    
    // PASS 3: VALIDATION GÉOMÉTRIQUE
    console.log('✓ [A4] Validation géométrique...');
    const validated = this.validateA4Geometry(refinedCorners);
    if (!validated.valid) {
      console.log(`⚠️ [A4] Validation échouée: ${validated.reason}`);
      console.log(`⚠️ [A4] Retour des coins non-raffinés avec score ${marker.score}`);
      return whiteMarkers; // Retourner quand même les coins non-raffinés
    }
    
    console.log(`✅ [A4 ULTRA-PRÉCIS] Détection réussie !`);
    console.log(`   Score: ${validated.score.toFixed(3)}`);
    console.log(`   Erreur angle: ${validated.angleError?.toFixed(2)}°`);
    console.log(`   Erreur ratio: ${(validated.ratioError! * 100).toFixed(1)}%`);
    
    return [{
      ...marker,
      corners: refinedCorners,
      score: validated.score,
      detectionMethod: 'A4-ultra-precise-subpixel',
      metadata: {
        ...marker.metadata,
        geometryValidated: true,
        angleAccuracy: validated.angleError,
        ratioAccuracy: validated.ratioError
      }
    }];
  }
  
  /**
   * Sub-pixel refinement des 4 bords A4
   */
  private refineA4EdgesSubPixel(
    data: Uint8ClampedArray | Buffer,
    width: number,
    height: number,
    corners: Point[]
  ): Point[] {
    console.log('🔬 [A4 Sub-pixel] Raffinement des bords...');
    
    // Extraire les bords approximatifs
    const [tl, tr, br, bl] = corners;
    
    // Scanner chaque bord avec 40 échantillons
    const topSamples: number[] = [];
    const bottomSamples: number[] = [];
    const leftSamples: number[] = [];
    const rightSamples: number[] = [];
    
    const scanStep = 3; // Tous les 3px
    const scanRange = 30; // ±30px autour du bord
    
    // BORD TOP : scanner verticalement pour trouver transition blanc→sombre
    for (let x = Math.floor(tl.x); x <= Math.ceil(tr.x); x += scanStep) {
      if (topSamples.length >= 40) break;
      const startY = Math.max(0, Math.floor(tl.y) - scanRange);
      const endY = Math.min(height - 1, Math.floor(tl.y) + scanRange);
      
      for (let y = startY; y <= endY; y++) {
        if (x < 0 || x >= width) continue;
        const idx = (y * width + x) * 4;
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        
        // Transition blanc (>200) vers sombre (<100)
        if (brightness < 150 && y > startY) {
          topSamples.push(y);
          break;
        }
      }
    }
    
    // BORD BOTTOM
    for (let x = Math.floor(bl.x); x <= Math.ceil(br.x); x += scanStep) {
      if (bottomSamples.length >= 40) break;
      const startY = Math.min(height - 1, Math.ceil(bl.y) + scanRange);
      const endY = Math.max(0, Math.ceil(bl.y) - scanRange);
      
      for (let y = startY; y >= endY; y--) {
        if (x < 0 || x >= width) continue;
        const idx = (y * width + x) * 4;
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        
        if (brightness < 150 && y < startY) {
          bottomSamples.push(y);
          break;
        }
      }
    }
    
    // BORD LEFT
    for (let y = Math.floor(tl.y); y <= Math.ceil(bl.y); y += scanStep) {
      if (leftSamples.length >= 40) break;
      const startX = Math.max(0, Math.floor(tl.x) - scanRange);
      const endX = Math.min(width - 1, Math.floor(tl.x) + scanRange);
      
      for (let x = startX; x <= endX; x++) {
        if (y < 0 || y >= height) continue;
        const idx = (y * width + x) * 4;
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        
        if (brightness < 150 && x > startX) {
          leftSamples.push(x);
          break;
        }
      }
    }
    
    // BORD RIGHT
    for (let y = Math.floor(tr.y); y <= Math.ceil(br.y); y += scanStep) {
      if (rightSamples.length >= 40) break;
      const startX = Math.min(width - 1, Math.ceil(tr.x) + scanRange);
      const endX = Math.max(0, Math.ceil(tr.x) - scanRange);
      
      for (let x = startX; x >= endX; x--) {
        if (y < 0 || y >= height) continue;
        const idx = (y * width + x) * 4;
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        
        if (brightness < 150 && x < startX) {
          rightSamples.push(x);
          break;
        }
      }
    }
    
    // Moyenner les échantillons
    const avgTopY = topSamples.length > 0 ? topSamples.reduce((a,b) => a+b) / topSamples.length : tl.y;
    const avgBottomY = bottomSamples.length > 0 ? bottomSamples.reduce((a,b) => a+b) / bottomSamples.length : bl.y;
    const avgLeftX = leftSamples.length > 0 ? leftSamples.reduce((a,b) => a+b) / leftSamples.length : tl.x;
    const avgRightX = rightSamples.length > 0 ? rightSamples.reduce((a,b) => a+b) / rightSamples.length : tr.x;
    
    console.log(`🔬 [Sub-pixel] Top: ${topSamples.length} échantillons, avg y=${avgTopY.toFixed(2)}`);
    console.log(`🔬 [Sub-pixel] Bottom: ${bottomSamples.length} échantillons, avg y=${avgBottomY.toFixed(2)}`);
    console.log(`🔬 [Sub-pixel] Left: ${leftSamples.length} échantillons, avg x=${avgLeftX.toFixed(2)}`);
    console.log(`🔬 [Sub-pixel] Right: ${rightSamples.length} échantillons, avg x=${avgRightX.toFixed(2)}`);
    
    // Reconstruire les coins avec les bords raffinés
    return [
      { x: avgLeftX, y: avgTopY },      // Top-left
      { x: avgRightX, y: avgTopY },     // Top-right
      { x: avgRightX, y: avgBottomY },  // Bottom-right
      { x: avgLeftX, y: avgBottomY }    // Bottom-left
    ];
  }
  
  /**
   * Validation géométrique stricte A4
   */
  private validateA4Geometry(corners: Point[]): { valid: boolean; score: number; reason?: string; angleError?: number; ratioError?: number } {
    const [tl, tr, br, bl] = corners;
    
    // Calcul des dimensions
    const width = Math.sqrt(Math.pow(tr.x - tl.x, 2) + Math.pow(tr.y - tl.y, 2));
    const height = Math.sqrt(Math.pow(bl.x - tl.x, 2) + Math.pow(bl.y - tl.y, 2));
    const ratio = Math.min(width, height) / Math.max(width, height);
    
    // A4 ratio attendu: 210/297 = 0.707
    const expectedRatio = 210 / 297;
    const ratioError = Math.abs(ratio - expectedRatio);
    
    if (ratioError > 0.05) { // Tolérance ±5%
      return { valid: false, score: 0.5, reason: `Ratio incorrect: ${ratio.toFixed(3)} (attendu ${expectedRatio.toFixed(3)})`, ratioError };
    }
    
    // Vérifier les angles (doivent être ~90°)
    const angle1 = this.calculateAngle(tl, tr, bl);
    const angle2 = this.calculateAngle(tr, br, tl);
    const angle3 = this.calculateAngle(br, bl, tr);
    const angle4 = this.calculateAngle(bl, tl, br);
    
    const avgAngle = (angle1 + angle2 + angle3 + angle4) / 4;
    const angleError = Math.abs(avgAngle - 90);
    
    if (angleError > 5) { // Tolérance ±5°
      return { valid: false, score: 0.7, reason: `Angles incorrects: ${avgAngle.toFixed(1)}° (attendu 90°)`, angleError };
    }
    
    const score = 0.98 - (ratioError * 2) - (angleError * 0.01);
    return { valid: true, score, angleError, ratioError };
  }
  
  /**
   * Calcul d'angle entre 3 points
   */
  private calculateAngle(p1: Point, p2: Point, p3: Point): number {
    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
    
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
    
    const cosAngle = dot / (mag1 * mag2);
    return Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
  }
  
  // ═════════════════════════════════════════════════════════════════════
  // 🚧 CODE PRÉPARÉ : Détection ombre 3D (épaisseur 4mm)
  // ═════════════════════════════════════════════════════════════════════
  // private detectA4Shadow3D(
  //   data: Uint8ClampedArray | Buffer,
  //   width: number,
  //   height: number,
  //   corners: Point[]
  // ): { detected: boolean; thickness?: number; lightAngle?: number; refinedCorners?: Point[] } {
  //   // TODO: Scanner autour des bords pour détecter l'ombre portée
  //   // - Gradient de luminosité (blanc → gris → sombre)
  //   // - Mesurer l'épaisseur de l'ombre (~4mm en pixels)
  //   // - Calculer l'angle de la lumière
  //   // - Affiner les coins en utilisant le début de l'ombre
  //   return { detected: false };
  // }
  
  /**
   * 🎯 ANCIENNE MÉTHODE: Détection via CADRE MAGENTA COMPLET (DÉSACTIVÉE)
  /**
   * 
  /**
   * Nouveau design du marqueur (v2):
  /**
   * - CADRE MAGENTA extérieur: 2mm fixe (bord extérieur = taille de référence, ex: 16.8cm)
  /**
   * - 4 CERCLES MAGENTA aux coins: ~5mm rayon (repères visuels)
  /**
   * - POINT CENTRAL MAGENTA: 1mm rayon (repère centrage/perspective)
  /**
   * - Bande noire: adaptatif (ex: 2.8cm pour 16.8cm, 3cm pour 18cm)
  /**
   * - Reste du pattern: proportionnel
  /**
   * 
  /**
   * Algorithme PRÉCIS (sub-pixel):
  /**
   * 1. Détecter TOUS les pixels magenta
  /**
   * 2. Pour chaque bord (Top, Right, Bottom, Left):
  /**
   *    - Scanner ligne par ligne
  /**
   *    - Trouver la transition MAGENTA→NOIR précise
  /**
   *    - Interpolation sub-pixel si possible
  /**
   * 3. Coins = intersections des bords raffinés
  /**
   * 4. Validation: vérifier présence du point central
  /**
   * 5. Bord extérieur du magenta = mesure de référence (16.8cm, 18cm, etc.)
   */
  private detectFromMagentaBorder(
    data: Uint8ClampedArray | Buffer,
    width: number,
    height: number
  ): MarkerDetectionResult[] {
    const size = MARKER_SPECS.markerSize;
    console.log('🎯 [ArUco] Détection CADRE MAGENTA PRÉCIS (nouveau design v2)...');
    console.log(`   Taille marqueur: ${size}cm, cadre magenta: 2mm fixe`);
    
    // ÉTAPE 1: Trouver TOUS les pixels magenta (sans step pour précision max)
    const magentaPixels: ColorPixel[] = [];
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        
        const maxc = Math.max(r, g, b);
        const minc = Math.min(r, g, b);
        const sat = maxc - minc;
        
        if (sat >= 50 && g <= 180 && r >= 80 && b >= 80 && g < r && g < b) {
          const score = (r - g) + (b - g) + sat * 0.5;
          if (score >= 100) {
            magentaPixels.push({ x, y, r, g, b, score });
          }
        }
      }
    }
    
    console.log(`💜 ${magentaPixels.length} pixels magenta détectés (scan complet)`);
    
    if (magentaPixels.length < 50) {
      console.log('⚠️ Pas assez de pixels magenta pour détecter le cadre');
      return this.detectFromMagentaOnly(data, width, height);
    }
    
    // ÉTAPE 2: Bounding box approximative pour zone de recherche
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    for (const p of magentaPixels) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    
    console.log(`📐 [Cadre Magenta] Zone de recherche: (${minX},${minY}) → (${maxX},${maxY})`);
    
    // ÉTAPE 3: RAFFINEMENT SUB-PIXEL des 4 bords
    // Scanner DEPUIS L'EXTÉRIEUR et trouver TRANSITION MAGENTA→NOIR (intersection précise)
    // Structure: MAGENTA (2mm) → [INTERSECTION = 16.8cm] → NOIR (2.8cm) → BLANC → Pattern
    
    // BORD TOP (y minimum) - Scanner de haut en BAS, trouver transition MAGENTA→NOIR
    let topY = Infinity;
    const topSamples: number[] = [];
    const scanRange = Math.min(50, height); // LIMITE: max 50px de scan
    
    for (let x = Math.floor(minX); x <= Math.ceil(maxX); x += 3) { // Step 3px pour performance
      if (topSamples.length >= 40) break; // LIMITE: 40 échantillons max
      
      let foundMagenta = false;
      let transitionY = -1;
      const startY = Math.max(0, Math.floor(minY) - 20);
      const endY = Math.min(height - 1, startY + scanRange);
      
      for (let y = startY; y <= endY; y++) {
        if (x < 0 || x >= width) continue;
        const idx = (y * width + x) * 4;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
        
        const isMagenta = (r >= 80 && b >= 80 && g < r * 0.7 && g < b * 0.7);
        const isBlack = (r < 60 && g < 60 && b < 60);
        
        if (!foundMagenta && isMagenta) {
          foundMagenta = true;
        } else if (foundMagenta && isBlack) {
          transitionY = y - 1;
          break;
        }
      }
      
      if (transitionY > 0) {
        topSamples.push(transitionY);
        if (transitionY < topY) topY = transitionY;
      }
    }
    
    // BORD BOTTOM (y maximum) - Scanner de bas en HAUT, trouver transition MAGENTA→NOIR
    let bottomY = -Infinity;
    const bottomSamples: number[] = [];
    
    for (let x = Math.floor(minX); x <= Math.ceil(maxX); x += 3) {
      if (bottomSamples.length >= 40) break;
      
      let foundMagenta = false;
      let transitionY = -1;
      const startY = Math.min(height - 1, Math.ceil(maxY) + 20);
      const endY = Math.max(0, startY - scanRange);
      
      for (let y = startY; y >= endY; y--) {
        if (x < 0 || x >= width) continue;
        const idx = (y * width + x) * 4;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
        
        const isMagenta = (r >= 80 && b >= 80 && g < r * 0.7 && g < b * 0.7);
        const isBlack = (r < 60 && g < 60 && b < 60);
        
        if (!foundMagenta && isMagenta) {
          foundMagenta = true;
        } else if (foundMagenta && isBlack) {
          transitionY = y + 1;
          break;
        }
      }
      
      if (transitionY > 0) {
        bottomSamples.push(transitionY);
        if (transitionY > bottomY) bottomY = transitionY;
      }
    }
    
    // BORD LEFT (x minimum) - Scanner de gauche à DROITE, trouver transition MAGENTA→NOIR
    let leftX = Infinity;
    const leftSamples: number[] = [];
    
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y += 3) {
      if (leftSamples.length >= 40) break;
      
      let foundMagenta = false;
      let transitionX = -1;
      const startX = Math.max(0, Math.floor(minX) - 20);
      const endX = Math.min(width - 1, startX + scanRange);
      
      for (let x = startX; x <= endX; x++) {
        if (y < 0 || y >= height) continue;
        const idx = (y * width + x) * 4;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
        
        const isMagenta = (r >= 80 && b >= 80 && g < r * 0.7 && g < b * 0.7);
        const isBlack = (r < 60 && g < 60 && b < 60);
        
        if (!foundMagenta && isMagenta) {
          foundMagenta = true;
        } else if (foundMagenta && isBlack) {
          transitionX = x - 1;
          break;
        }
      }
      
      if (transitionX > 0) {
        leftSamples.push(transitionX);
        if (transitionX < leftX) leftX = transitionX;
      }
    }
    
    // BORD RIGHT (x maximum) - Scanner de droite à GAUCHE, trouver transition MAGENTA→NOIR
    let rightX = -Infinity;
    const rightSamples: number[] = [];
    
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y += 3) {
      if (rightSamples.length >= 40) break;
      
      let foundMagenta = false;
      let transitionX = -1;
      const startX = Math.min(width - 1, Math.ceil(maxX) + 20);
      const endX = Math.max(0, startX - scanRange);
      
      for (let x = startX; x >= endX; x--) {
        if (y < 0 || y >= height) continue;
        const idx = (y * width + x) * 4;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
        
        const isMagenta = (r >= 80 && b >= 80 && g < r * 0.7 && g < b * 0.7);
        const isBlack = (r < 60 && g < 60 && b < 60);
        
        if (!foundMagenta && isMagenta) {
          foundMagenta = true;
        } else if (foundMagenta && isBlack) {
          transitionX = x + 1;
          break;
        }
      }
      
      if (transitionX > 0) {
        rightSamples.push(transitionX);
        if (transitionX > rightX) rightX = transitionX;
      }
    }
    
    // Moyenne des échantillons pour précision accrue
    const avgTop = topSamples.length > 0 ? topSamples.reduce((a,b) => a+b) / topSamples.length : topY;
    const avgBottom = bottomSamples.length > 0 ? bottomSamples.reduce((a,b) => a+b) / bottomSamples.length : bottomY;
    const avgLeft = leftSamples.length > 0 ? leftSamples.reduce((a,b) => a+b) / leftSamples.length : leftX;
    const avgRight = rightSamples.length > 0 ? rightSamples.reduce((a,b) => a+b) / rightSamples.length : rightX;
    
    console.log(`🔬 [Bords PRÉCIS] Raffinement sub-pixel:`);
    console.log(`   Top: y=${avgTop.toFixed(2)} (${topSamples.length} échantillons)`);
    console.log(`   Bottom: y=${avgBottom.toFixed(2)} (${bottomSamples.length} échantillons)`);
    console.log(`   Left: x=${avgLeft.toFixed(2)} (${leftSamples.length} échantillons)`);
    console.log(`   Right: x=${avgRight.toFixed(2)} (${rightSamples.length} échantillons)`);
    
    // ÉTAPE 4: Validation du point central (optionnel mais recommandé)
    const centerXCalc = (avgLeft + avgRight) / 2;
    const centerYCalc = (avgTop + avgBottom) / 2;
    const centerPixels = magentaPixels.filter(p => 
      Math.abs(p.x - centerXCalc) < 10 && Math.abs(p.y - centerYCalc) < 10
    );
    
    if (centerPixels.length > 3) {
      console.log(`✅ [Validation] Point central magenta détecté (${centerPixels.length} pixels)`);
    } else {
      console.log(`⚠️ [Validation] Point central magenta faible (${centerPixels.length} pixels)`);
    }
    
    // ÉTAPE 5: Les coins = intersections des bords RAFFINÉS
    const corners: Point2D[] = [
      { x: avgLeft, y: avgTop },       // TL
      { x: avgRight, y: avgTop },      // TR
      { x: avgRight, y: avgBottom },   // BR
      { x: avgLeft, y: avgBottom }     // BL
    ];
    
    console.log(`✅ [Cadre Magenta] 4 coins PRÉCIS extraits (bord EXTÉRIEUR raffiné)`);
    console.log(`   TL=(${corners[0].x.toFixed(2)}, ${corners[0].y.toFixed(2)})`);
    console.log(`   TR=(${corners[1].x.toFixed(2)}, ${corners[1].y.toFixed(2)})`);
    console.log(`   BR=(${corners[2].x.toFixed(2)}, ${corners[2].y.toFixed(2)})`);
    console.log(`   BL=(${corners[3].x.toFixed(2)}, ${corners[3].y.toFixed(2)})`);
    
    // ÉTAPE 6: Validation géométrique
    const widthPx = avgRight - avgLeft;
    const heightPx = avgBottom - avgTop;
    const ratio = Math.max(widthPx, heightPx) / Math.min(widthPx, heightPx);
    
    console.log(`📏 Dimensions: ${widthPx.toFixed(2)}px × ${heightPx.toFixed(2)}px (ratio: ${ratio.toFixed(3)})`);
    
    if (ratio > 1.5) {
      console.log(`⚠️ Ratio ${ratio.toFixed(2)} trop éloigné d'un carré (max 1.5)`);
      return this.detectFromMagentaOnly(data, width, height);
    }
    
    const avgSide = (widthPx + heightPx) / 2;
    const pixelsPerCm = avgSide / size;
    
    console.log(`📐 Calibration: ${avgSide.toFixed(2)}px = ${size}cm → ${pixelsPerCm.toFixed(3)}px/cm`);
    console.log(`   🎯 Précision estimée: ±${(1 / pixelsPerCm).toFixed(2)}mm/pixel`);
    
    const measurements = this.calculateMeasurements(corners);
    
    return [{
      id: 0,
      corners,
      magentaPositions: corners,
      size: avgSide,
      center: { x: centerXCalc, y: centerYCalc },
      score: 0.98, // Très haute confiance avec raffinement sub-pixel
      magentaFound: 4,
      homography: {
        realSizeCm: size,
        pixelsPerCm,
        sides: measurements.sides,
        angles: measurements.angles
      }
    }];
  }

  /**
   * 🎯 DÉTECTION COMPLÈTE UTILISANT TOUS LES REPÈRES DE L'ARUCO (ANCIEN SYSTÈME)
  /**
   * 
  /**
   * Structure du marqueur (6 bandes égales, taille configurable):
  /**
   * - Bordure NOIRE extérieure (bandes 1 et 6, de 0 à 1/6 et 5/6 à 1)
  /**
   * - Bandes BLANCHES (bandes 2 et 5, de 1/6 à 1/3 et 2/3 à 5/6)  
  /**
   * - Pattern ARUCO central NOIR (bandes 3+4, de 1/3 à 2/3)
  /**
   * - 4 coins MAGENTA aux extrémités (avec centre BLANC)
  /**
   * 
  /**
   * Ratios clés (CONSTANTS): 1/6, 1/3, 2/3, 5/6
   */
  private detectFromMagentaOnly(
    data: Uint8ClampedArray | Buffer,
    width: number,
    height: number
  ): MarkerDetectionResult[] {
    const size = MARKER_SPECS.markerSize;
    const band = (size / 6).toFixed(1);
    console.log('🎯 [ArUco] Détection COMPLÈTE avec tous les repères...');
    console.log(`   Structure: ${size}cm = ${band}cm noir + ${band}cm blanc + ${(size/3).toFixed(1)}cm pattern + ${band}cm blanc + ${band}cm noir`);
    
    // ÉTAPE 1: Trouver les zones MAGENTA (coins du marqueur)
    const magentaPixels = this.findAllMagentaPixels(data, width, height);
    console.log(`💜 ${magentaPixels.length} pixels magenta détectés`);
    
    if (magentaPixels.length < 10) {
      // Fallback: essayer de détecter via les contours noirs
      console.log('⚠️ Peu de magenta, tentative de détection par contours...');
      return this.detectFromBlackBorders(data, width, height);
    }
    
    const magentaClusters = this.clusterMagentaPixels(magentaPixels);
    console.log(`🎯 ${magentaClusters.length} zones magenta identifiées`);
    
    if (magentaClusters.length < 4) {
      console.log(`❌ Seulement ${magentaClusters.length} coins magenta (besoin de 4)`);
      return [];
    }
    
    // ÉTAPE 2: Pour chaque cluster magenta, trouver le CENTRE BLANC au milieu
    const topClusters = magentaClusters.slice(0, 4);
    const candidateCorners: Array<{
      magentaCenter: Point2D;
      trueCorner: Point2D | null;
      cluster: MagentaCluster;
    }> = [];
    
    console.log('🔍 [ArUco] Analyse des 4 coins magenta - NOUVELLE MÉTHODE LIGNES NOIRES:');
    for (const cluster of topClusters) {
      // 🎯 NOUVELLE MÉTHODE: Suivre les lignes noires pour trouver le vrai coin
      const trueCorner = this.findTrueCornerByBlackLines(data, width, height, cluster.cx, cluster.cy, cluster);
      
      candidateCorners.push({
        magentaCenter: { x: cluster.cx, y: cluster.cy },
        trueCorner,
        cluster
      });
      
      console.log(`   📍 Magenta(${cluster.cx.toFixed(0)}, ${cluster.cy.toFixed(0)}) → Coin VRAI: ${trueCorner ? `(${trueCorner.x.toFixed(0)}, ${trueCorner.y.toFixed(0)})` : 'NON TROUVÉ'}`);
    }
    
    // ÉTAPE 3: Construire les VRAIS COINS (intersection des lignes noires du marqueur)
    // 🎯 FIX CRITIQUE: Le vrai coin est là où les lignes noires se croisent !
    // Les cercles magenta entourent ces intersections
    const trueCornersUnordered: Point2D[] = candidateCorners.map(c => {
      // Utiliser le vrai coin (intersection lignes noires) si trouvé, sinon fallback sur magentaCenter
      if (c.trueCorner) {
        console.log(`   ✅ Coin VRAI trouvé: (${c.trueCorner.x.toFixed(0)}, ${c.trueCorner.y.toFixed(0)}) [magenta était: (${c.magentaCenter.x.toFixed(0)}, ${c.magentaCenter.y.toFixed(0)})]`);
        return c.trueCorner;
      } else {
        console.log(`   ⚠️ Coin VRAI NON trouvé, fallback sur magenta: (${c.magentaCenter.x.toFixed(0)}, ${c.magentaCenter.y.toFixed(0)})`);
        return c.magentaCenter;
      }
    });
    
    // ÉTAPE 4: Ordonner les coins en [TL, TR, BR, BL]
    const orderedMagentaCorners = this.orderCorners(trueCornersUnordered);
    if (!orderedMagentaCorners) {
      console.log('❌ Impossible d\'ordonner les coins magenta');
      return [];
    }
    
    console.log(`🎯 [ArUco] Coins BLANCS ordonnés (TL, TR, BR, BL) - VRAIS COINS du ${MARKER_SPECS.markerSize}cm:`);
    orderedMagentaCorners.forEach((p, i) => console.log(`   [${['TL', 'TR', 'BR', 'BL'][i]}] x=${p.x.toFixed(1)}, y=${p.y.toFixed(1)}`));
    
    // ÉTAPE 5: Valider la géométrie avec les ratios 1:2:3
    const validation = this.validateArucoGeometry(data, width, height, orderedMagentaCorners);
    console.log(`📐 [ArUco] Validation géométrique: ${validation.valid ? '✅' : '❌'} (score: ${validation.score.toFixed(2)})`);
    
    // ÉTAPE 6: Calculer les coins du pattern INTÉRIEUR (carré central = 1/3 du total)
    // Le pattern est à 2 bandes du bord = 1/3 de la taille totale de chaque côté
    const innerOffset = MARKER_SPECS.ratios.innerToOuter; // = 1/3
    const [tl, tr, br, bl] = orderedMagentaCorners;
    
    // Interpoler vers l'intérieur pour trouver les coins du pattern central
    const innerCorners: Point2D[] = [
      // TL intérieur = TL + 1/3 vers TR + 1/3 vers BL
      {
        x: tl.x + (tr.x - tl.x) * innerOffset + (bl.x - tl.x) * innerOffset,
        y: tl.y + (tr.y - tl.y) * innerOffset + (bl.y - tl.y) * innerOffset
      },
      // TR intérieur = TR + 1/3 vers TL + 1/3 vers BR
      {
        x: tr.x + (tl.x - tr.x) * innerOffset + (br.x - tr.x) * innerOffset,
        y: tr.y + (tl.y - tr.y) * innerOffset + (br.y - tr.y) * innerOffset
      },
      // BR intérieur = BR + 1/3 vers BL + 1/3 vers TR
      {
        x: br.x + (bl.x - br.x) * innerOffset + (tr.x - br.x) * innerOffset,
        y: br.y + (bl.y - br.y) * innerOffset + (tr.y - br.y) * innerOffset
      },
      // BL intérieur = BL + 1/3 vers BR + 1/3 vers TL
      {
        x: bl.x + (br.x - bl.x) * innerOffset + (tl.x - bl.x) * innerOffset,
        y: bl.y + (br.y - bl.y) * innerOffset + (tl.y - bl.y) * innerOffset
      }
    ];
    
    // 🎯 FIX CRITIQUE: Les points magenta sont aux COINS du carré de 16.8cm !
    // Donc orderedMagentaCorners = coins du carré 16.8cm (PAS besoin de réduire de 1/3)
    // Le calcul innerCorners était FAUX - il réduisait vers un carré de 11.2cm
    console.log(`🔍 [ArUco] Coins MAGENTA = Coins du carré ${MARKER_SPECS.markerSize}cm (PAS de réduction 1/3!)`);
    orderedMagentaCorners.forEach((p, i) => console.log(`   [${['TL', 'TR', 'BR', 'BL'][i]}] x=${p.x.toFixed(1)}, y=${p.y.toFixed(1)}`));
    
    // Les mesures sont basées sur les coins MAGENTA pour l'homographie
    const measurements = this.calculateMeasurements(orderedMagentaCorners);
    
    // Calculer le score final basé sur la validation
    const finalScore = Math.min(0.95, 0.6 + validation.score * 0.35);
    
    return [{
      id: 0,
      corners: orderedMagentaCorners, // 🎯 FIX: Utiliser les vrais coins (intersection lignes noires)
      magentaPositions: orderedMagentaCorners, // Identique car intersection = coins du marqueur 16.8cm
      size: measurements.avgSidePx,
      center: measurements.center,
      score: finalScore,
      magentaFound: candidateCorners.filter(c => c.trueCorner).length,
      homography: {
        realSizeCm: MARKER_SPECS.markerSize,
        pixelsPerCm: measurements.pixelsPerCm,
        sides: measurements.sides,
        angles: measurements.angles
      }
    }];
  }

  /**
   * 🆕 Valider la géométrie de l'ArUco avec les ratios connus
   */
  private validateArucoGeometry(
    data: Uint8ClampedArray | Buffer,
    width: number,
    height: number,
    corners: Point2D[]
  ): { valid: boolean; score: number } {
    const [tl, tr, br, bl] = corners;
    
    // Calculer les 4 côtés
    const sides = [
      Math.sqrt((tr.x - tl.x) ** 2 + (tr.y - tl.y) ** 2), // Haut
      Math.sqrt((br.x - tr.x) ** 2 + (br.y - tr.y) ** 2), // Droite
      Math.sqrt((br.x - bl.x) ** 2 + (br.y - bl.y) ** 2), // Bas
      Math.sqrt((bl.x - tl.x) ** 2 + (bl.y - tl.y) ** 2)  // Gauche
    ];
    
    const avgSide = sides.reduce((a, b) => a + b, 0) / 4;
    const sideVariance = sides.reduce((sum, s) => sum + Math.abs(s - avgSide), 0) / 4;
    
    // Score de régularité (carré parfait = 1.0)
    const regularityScore = Math.max(0, 1 - sideVariance / avgSide);
    
    // Vérifier les transitions noir→blanc le long des bords
    let transitionScore = 0;
    const _bandRatio = MARKER_SPECS.ratios.bandWidth; // 1/6 = 3cm / 18cm (non utilisé)
    
    // Échantillonner le bord HAUT pour vérifier la structure
    const sampleCount = 10;
    let foundBlackOuter = 0;
    let foundWhite = 0;
    let foundBlackCenter = 0;
    
    for (let i = 0; i < sampleCount; i++) {
      const t = i / (sampleCount - 1);
      const x = Math.round(tl.x + (tr.x - tl.x) * t);
      const y = Math.round(tl.y + (tr.y - tl.y) * t);
      
      // Scanner perpendiculairement au bord pour trouver les bandes
      const perpX = -(br.y - tr.y) / sides[1];
      const perpY = (br.x - tr.x) / sides[1];
      
      // Vérifier à 1/6 (3cm), 1/3 (6cm), 1/2 (9cm) de la profondeur
      for (const depth of [0.05, 0.17, 0.33, 0.5]) {
        const sampleX = Math.round(x + perpX * avgSide * depth);
        const sampleY = Math.round(y + perpY * avgSide * depth);
        
        if (sampleX >= 0 && sampleX < width && sampleY >= 0 && sampleY < height) {
          const idx = (sampleY * width + sampleX) * 4;
          const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          
          if (depth < 0.17 && brightness < 80) foundBlackOuter++;
          else if (depth >= 0.17 && depth < 0.33 && brightness > 150) foundWhite++;
          else if (depth >= 0.33 && brightness < 100) foundBlackCenter++;
        }
      }
    }
    
    // Score de structure (transitions correctes)
    transitionScore = (foundBlackOuter + foundWhite + foundBlackCenter) / (sampleCount * 3);
    
    const finalScore = regularityScore * 0.4 + transitionScore * 0.6;
    
    console.log(`   📊 Régularité: ${(regularityScore * 100).toFixed(0)}%, Transitions: ${(transitionScore * 100).toFixed(0)}%`);
    
    return {
      valid: finalScore > 0.5,
      score: finalScore
    };
  }

  /**
   * 🆕 Affiner les coins en détectant les bords noir→blanc
   */
  private refineCornersByEdgeDetection(
    data: Uint8ClampedArray | Buffer,
    width: number,
    height: number,
    corners: Point2D[]
  ): Point2D[] {
    const refined: Point2D[] = [];
    const searchRadius = 15;
    
    for (let i = 0; i < corners.length; i++) {
      const corner = corners[i];
      const nextCorner = corners[(i + 1) % 4];
      const prevCorner = corners[(i + 3) % 4];
      
      // Direction vers les coins adjacents (calculé pour référence future)
      const _toNext = { 
        x: (nextCorner.x - corner.x) / Math.sqrt((nextCorner.x - corner.x) ** 2 + (nextCorner.y - corner.y) ** 2),
        y: (nextCorner.y - corner.y) / Math.sqrt((nextCorner.x - corner.x) ** 2 + (nextCorner.y - corner.y) ** 2)
      };
      const _toPrev = {
        x: (prevCorner.x - corner.x) / Math.sqrt((prevCorner.x - corner.x) ** 2 + (prevCorner.y - corner.y) ** 2),
        y: (prevCorner.y - corner.y) / Math.sqrt((prevCorner.x - corner.x) ** 2 + (prevCorner.y - corner.y) ** 2)
      };
      
      // Chercher la transition noir→blanc le long de chaque direction
      let bestCorner = corner;
      let bestScore = 0;
      
      for (let dx = -searchRadius; dx <= searchRadius; dx++) {
        for (let dy = -searchRadius; dy <= searchRadius; dy++) {
          const testX = Math.round(corner.x + dx);
          const testY = Math.round(corner.y + dy);
          
          if (testX < 1 || testX >= width - 1 || testY < 1 || testY >= height - 1) continue;
          
          // Calculer le gradient à ce point
          const idx = (testY * width + testX) * 4;
          const idxRight = (testY * width + testX + 1) * 4;
          const idxDown = ((testY + 1) * width + testX) * 4;
          
          const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          const brightnessRight = (data[idxRight] + data[idxRight + 1] + data[idxRight + 2]) / 3;
          const brightnessDown = (data[idxDown] + data[idxDown + 1] + data[idxDown + 2]) / 3;
          
          const gradientX = Math.abs(brightnessRight - brightness);
          const gradientY = Math.abs(brightnessDown - brightness);
          const gradient = gradientX + gradientY;
          
          // Favoriser les points avec fort gradient (transition)
          // et qui sont blancs (centre du cercle magenta)
          const whiteBonus = brightness > 180 ? 0.5 : 0;
          const score = gradient + whiteBonus * 50;
          
          if (score > bestScore) {
            bestScore = score;
            bestCorner = { x: testX, y: testY };
          }
        }
      }
      
      refined.push(bestCorner);
    }
    
    return refined;
  }

  /**
   * 🆕 Fallback: Détecter via les bordures noires si pas assez de magenta
   */
  private detectFromBlackBorders(
    data: Uint8ClampedArray | Buffer,
    width: number,
    height: number
  ): MarkerDetectionResult[] {
    console.log('🔲 Tentative de détection par bordures noires...');
    
    // Chercher les grands rectangles noirs
    const blackPixels: Point2D[] = [];
    const step = Math.max(2, Math.floor(Math.min(width, height) / 500));
    
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const idx = (y * width + x) * 4;
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        
        if (brightness < 60) {
          blackPixels.push({ x, y });
        }
      }
    }
    
    console.log(`   ⬛ ${blackPixels.length} pixels noirs trouvés`);
    
    if (blackPixels.length < 100) {
      return [];
    }
    
    // Limiter le nombre de pixels pour éviter stack overflow
    if (blackPixels.length > 50000) {
      console.log(`   ⚠️ Trop de pixels noirs (${blackPixels.length}) - probablement fond noir, pas de marqueur`);
      return [];
    }
    
    // Trouver les bounds de la zone noire (sans spread operator pour éviter stack overflow)
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of blackPixels) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    
    // Les coins du rectangle englobant = coins du marqueur 16.8cm
    const outerCorners: Point2D[] = [
      { x: minX, y: minY }, // TL
      { x: maxX, y: minY }, // TR
      { x: maxX, y: maxY }, // BR
      { x: minX, y: maxY }  // BL
    ];
    
    // 🎯 FIX: Les coins englobants SONT les coins du carré 16.8cm
    // Pas besoin de réduire de 1/3 - le rectangle englobant correspond au marqueur
    
    const measurements = this.calculateMeasurements(outerCorners);
    
    return [{
      id: 0,
      corners: outerCorners, // 🎯 FIX: Utiliser directement les coins englobants
      magentaPositions: outerCorners,
      size: measurements.avgSidePx,
      center: measurements.center,
      score: 0.5, // Score plus bas car détection moins fiable
      magentaFound: 0,
      homography: {
        realSizeCm: MARKER_SPECS.markerSize,
        pixelsPerCm: measurements.pixelsPerCm,
        sides: measurements.sides,
        angles: measurements.angles
      }
    }];
  }

  /**
   * Trouver TOUS les pixels magenta dans l'image
  /**
   * Magenta VRAI = rouge ET bleu très forts (>150), vert FAIBLE (<100)
  /**
   * Le magenta imprimé sur le marqueur est très saturé et vif
   */
  private findAllMagentaPixels(
    data: Uint8ClampedArray | Buffer,
    width: number,
    height: number
  ): ColorPixel[] {
    const pixels: ColorPixel[] = [];
    
    // Pas adaptatif pour accélérer sur grandes images
    const step = Math.max(1, Math.floor(Math.min(width, height) / 900));
    
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        
        // Saturation approximative = max - min
        const maxc = Math.max(r, g, b);
        const minc = Math.min(r, g, b);
        const sat = maxc - minc;
        
        // ===== FILTRES MAGENTA ÉQUILIBRÉS =====
        // Magenta = Rouge ET Bleu forts, Vert faible, saturation élevée
        
        // 1. Saturation minimale (évite les gris/blancs)
        if (sat < 50) continue;
        
        // 2. Vert pas trop fort (le magenta n'a pas beaucoup de vert)
        if (g > 180) continue;
        
        // 3. Rouge ET Bleu présents
        if (r < 80 || b < 80) continue;
        
        // 4. R et B doivent dominer le vert
        if (g >= r || g >= b) continue;
        
        // 5. Score: plus R et B dominent G, mieux c'est
        const score = (r - g) + (b - g) + sat * 0.5;
        
        // Seuil de score modéré
        if (score < 100) continue;
        
        pixels.push({ x, y, r, g, b, score });
      }
    }
    
    console.log(`💜 [Magenta] Pixels détectés: ${pixels.length} (seuils équilibrés: R>80, B>80, sat>50)`);
    
    return pixels;
  }

  /**
   * Regrouper les pixels magenta en clusters
  /**
   * 🎯 AMÉLIORÉ: Utilise le fitting elliptique pour trouver le centre EXACT
   */
  private clusterMagentaPixels(pixels: ColorPixel[]): MagentaCluster[] {
    if (pixels.length === 0) return [];
    
    const cellSize = 12;
    const grid = new Map<string, ColorPixel[]>();
    
    // Répartir les pixels dans une grille
    for (const p of pixels) {
      const key = `${Math.floor(p.x / cellSize)},${Math.floor(p.y / cellSize)}`;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key)!.push(p);
    }
    
    // Fusionner les cellules adjacentes en clusters (BFS)
    const clusters: MagentaCluster[] = [];
    const usedCells = new Set<string>();
    
    const gridEntries = Array.from(grid.entries());
    for (const [key, cellPixels] of gridEntries) {
      if (usedCells.has(key)) continue;
      
      const cluster: ColorPixel[] = [...cellPixels];
      const queue = [key];
      usedCells.add(key);
      
      while (queue.length > 0) {
        const currentKey = queue.shift()!;
        const [cx, cy] = currentKey.split(',').map(Number);
        
        // Vérifier les 8 voisins
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const neighborKey = `${cx + dx},${cy + dy}`;
            
            if (grid.has(neighborKey) && !usedCells.has(neighborKey)) {
              cluster.push(...grid.get(neighborKey)!);
              usedCells.add(neighborKey);
              queue.push(neighborKey);
            }
          }
        }
      }
      
      if (cluster.length >= 6) {
        // 🎯 NOUVEAU: Calculer le centre EXACT par fitting elliptique
        // Étape 1: Calcul du barycentre initial
        let sumX = 0, sumY = 0;
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        for (const p of cluster) {
          sumX += p.x;
          sumY += p.y;
          minX = Math.min(minX, p.x);
          maxX = Math.max(maxX, p.x);
          minY = Math.min(minY, p.y);
          maxY = Math.max(maxY, p.y);
        }
        
        const clusterWidth = maxX - minX;
        const clusterHeight = maxY - minY;
        
        // Centre géométrique simple
        const geoCenter = {
          x: (minX + maxX) / 2,
          y: (minY + maxY) / 2
        };
        
        // 🎯 Étape 2: Raffiner le centre par fitting des pixels de bordure
        // Les cercles magenta ont une bordure nette - trouver les pixels les plus extrêmes
        // dans chaque direction et calculer le centre
        const borderPixels = this.findBorderPixels(cluster, geoCenter);
        
        let finalCx: number, finalCy: number;
        
        if (borderPixels.length >= 8) {
          // Utiliser le centre géométrique des pixels de bordure (plus précis)
          const fitResult = this.fitCircleToPoints(borderPixels);
          finalCx = fitResult.cx;
          finalCy = fitResult.cy;
          console.log(`   🎯 Cluster #${clusters.length}: Fitting circulaire avec ${borderPixels.length} points → centre (${finalCx.toFixed(1)}, ${finalCy.toFixed(1)}), rayon=${fitResult.radius.toFixed(1)}px`);
        } else {
          // Fallback: barycentre simple
          finalCx = sumX / cluster.length;
          finalCy = sumY / cluster.length;
          console.log(`   ⚠️ Cluster #${clusters.length}: Barycentre simple (${borderPixels.length} pts bordure) → centre (${finalCx.toFixed(1)}, ${finalCy.toFixed(1)})`);
        }
        
        // Filtrer les clusters trop allongés (pas des cercles)
        const ratio = Math.max(clusterWidth, clusterHeight) / Math.max(1, Math.min(clusterWidth, clusterHeight));
        
        if (ratio < 2.5) {
          clusters.push({
            cx: finalCx,
            cy: finalCy,
            size: cluster.length,
            width: clusterWidth,
            height: clusterHeight
          });
        }
      }
    }
    
    // Trier par taille décroissante
    clusters.sort((a, b) => b.size - a.size);
    
    // Si plus de 4 clusters, sélectionner les meilleurs
    if (clusters.length > 4) {
      return this.selectBest4Corners(clusters);
    }
    
    return clusters;
  }

  /**
   * 🆕 Trouver les pixels de bordure d'un cluster (pour fitting circulaire)
   */
  private findBorderPixels(cluster: ColorPixel[], center: { x: number; y: number }): Point2D[] {
    // Diviser en 16 secteurs angulaires et prendre le pixel le plus éloigné de chaque secteur
    const sectors: Array<{ pixel: ColorPixel; dist: number } | null> = new Array(16).fill(null);
    
    for (const p of cluster) {
      const dx = p.x - center.x;
      const dy = p.y - center.y;
      const angle = Math.atan2(dy, dx);
      const sector = Math.floor(((angle + Math.PI) / (2 * Math.PI)) * 16) % 16;
      const dist = dx * dx + dy * dy;
      
      if (!sectors[sector] || dist > sectors[sector]!.dist) {
        sectors[sector] = { pixel: p, dist };
      }
    }
    
    return sectors
      .filter((s): s is { pixel: ColorPixel; dist: number } => s !== null)
      .map(s => ({ x: s.pixel.x, y: s.pixel.y }));
  }

  /**
   * 🆕 Fitting circulaire par moindres carrés algébriques (méthode de Kåsa)
  /**
   * Retourne le centre optimal du cercle passant au mieux par les points
   */
  private fitCircleToPoints(points: Point2D[]): { cx: number; cy: number; radius: number } {
    const n = points.length;
    if (n < 3) {
      const cx = points.reduce((s, p) => s + p.x, 0) / n;
      const cy = points.reduce((s, p) => s + p.y, 0) / n;
      return { cx, cy, radius: 0 };
    }
    
    // Méthode de Kåsa: minimise Σ(x² + y² - 2*cx*x - 2*cy*y - r²)²
    // Équivaut à résoudre le système linéaire:
    // | Σx²  Σx   n  |   | A |   | -Σ(x² + y²)x |
    // | Σxy  Σy   Σx | × | B | = | -Σ(x² + y²)y |
    // | Σx   n    0  |   | C |   | -Σ(x² + y²)  |
    
    let sumX = 0, sumY = 0, sumX2 = 0, sumY2 = 0, sumXY = 0;
    let sumX3 = 0, sumY3 = 0, sumX2Y = 0, sumXY2 = 0;
    
    for (const p of points) {
      const x = p.x, y = p.y;
      const x2 = x * x, y2 = y * y;
      sumX += x;
      sumY += y;
      sumX2 += x2;
      sumY2 += y2;
      sumXY += x * y;
      sumX3 += x2 * x;
      sumY3 += y2 * y;
      sumX2Y += x2 * y;
      sumXY2 += x * y2;
    }
    
    // Résoudre le système pour A = 2*cx, B = 2*cy
    const C1 = sumX3 + sumXY2;
    const C2 = sumX2Y + sumY3;
    
    const det = n * (sumX2 * sumY2 - sumXY * sumXY) - sumX * (sumX * sumY2 - sumY * sumXY) + sumY * (sumX * sumXY - sumY * sumX2);
    
    if (Math.abs(det) < 1e-10) {
      // Matrice singulière, retourner le barycentre
      return {
        cx: sumX / n,
        cy: sumY / n,
        radius: 0
      };
    }
    
    // Calcul simplifié avec la formule directe
    const A = ((sumY2 - sumY * sumY / n) * (C1 - sumX * (sumX2 + sumY2) / n) - 
               (sumXY - sumX * sumY / n) * (C2 - sumY * (sumX2 + sumY2) / n)) /
              ((sumX2 - sumX * sumX / n) * (sumY2 - sumY * sumY / n) - 
               (sumXY - sumX * sumY / n) * (sumXY - sumX * sumY / n));
    
    const B = ((sumX2 - sumX * sumX / n) * (C2 - sumY * (sumX2 + sumY2) / n) - 
               (sumXY - sumX * sumY / n) * (C1 - sumX * (sumX2 + sumY2) / n)) /
              ((sumX2 - sumX * sumX / n) * (sumY2 - sumY * sumY / n) - 
               (sumXY - sumX * sumY / n) * (sumXY - sumX * sumY / n));
    
    const cx = A / 2;
    const cy = B / 2;
    
    // Calculer le rayon
    let sumR2 = 0;
    for (const p of points) {
      sumR2 += (p.x - cx) * (p.x - cx) + (p.y - cy) * (p.y - cy);
    }
    const radius = Math.sqrt(sumR2 / n);
    
    return { cx, cy, radius };
  }

  /**
   * Sélectionner les 4 clusters qui forment le meilleur quadrilatère
   */
  private selectBest4Corners(clusters: MagentaCluster[]): MagentaCluster[] {
    if (clusters.length <= 4) return clusters;
    
    const candidates = clusters.slice(0, Math.min(8, clusters.length));
    
    let bestCombo = candidates.slice(0, 4);
    let bestScore = -Infinity;
    
    // Tester toutes les combinaisons de 4 parmi les 8 plus gros
    for (let i = 0; i < candidates.length; i++) {
      for (let j = i + 1; j < candidates.length; j++) {
        for (let k = j + 1; k < candidates.length; k++) {
          for (let l = k + 1; l < candidates.length; l++) {
            const combo = [candidates[i], candidates[j], candidates[k], candidates[l]];
            const score = this.scoreQuadrilateral(combo);
            
            if (score > bestScore) {
              bestScore = score;
              bestCombo = combo;
            }
          }
        }
      }
    }
    
    console.log(`✅ Meilleur quadrilatère sélectionné (score: ${bestScore.toFixed(0)})`);
    console.log(`   📍 4 centres magenta finaux:`);
    bestCombo.forEach((c, i) => console.log(`      [${i}] cx=${c.cx.toFixed(1)}, cy=${c.cy.toFixed(1)}, size=${c.size}px, width=${c.width.toFixed(0)}, height=${c.height.toFixed(0)}`));
    return bestCombo;
  }

  /**
   * Score un ensemble de 4 points selon la qualité du quadrilatère
   */
  private scoreQuadrilateral(points: MagentaCluster[]): number {
    const ordered = this.orderCorners(points.map(p => ({ x: p.cx, y: p.cy })));
    if (!ordered) return -Infinity;
    
    // Calculer les 4 côtés
    const sides: number[] = [];
    for (let i = 0; i < 4; i++) {
      const p1 = ordered[i];
      const p2 = ordered[(i + 1) % 4];
      sides.push(Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2));
    }
    
    // Score basé sur la régularité
    const avgSide = sides.reduce((a, b) => a + b, 0) / 4;
    const variance = sides.reduce((sum, s) => sum + Math.abs(s - avgSide), 0) / 4;
    
    // Bonus pour la taille, pénalité pour l'irrégularité
    return avgSide - variance * 2;
  }

  /**
   * Trouver le centre blanc à proximité d'un point magenta
   */
  private findWhiteCenterAt(
    data: Uint8ClampedArray | Buffer,
    width: number,
    height: number,
    cx: number,
    cy: number,
    radius: number
  ): Point2D | null {
    let sumX = 0, sumY = 0, sumW = 0;
    let bestX = 0, bestY = 0, bestScore = 0;
    
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = Math.round(cx + dx);
        const y = Math.round(cy + dy);
        
        if (x < 0 || x >= width || y < 0 || y >= height) continue;
        
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        
        const brightness = (r + g + b) / 3;
        const variance = Math.abs(r - brightness) + Math.abs(g - brightness) + Math.abs(b - brightness);
        
        // Blanc: assez lumineux et pas trop coloré
        if (brightness > 175 && variance < 70) {
          const distFromCenter = Math.sqrt(dx * dx + dy * dy);
          const w = brightness / (1 + distFromCenter * 0.6);
          sumX += x * w;
          sumY += y * w;
          sumW += w;
          
          if (w > bestScore) {
            bestScore = w;
            bestX = x;
            bestY = y;
          }
        }
      }
    }
    
    if (sumW > 0) {
      return { x: sumX / sumW, y: sumY / sumW };
    }
    
    return bestScore > 0 ? { x: bestX, y: bestY } : null;
  }

  /**
   * 🎯 RAFFINEMENT: Raffine les 4 coins en cherchant les vrais coins via lignes noires
  /**
   * 
  /**
   * Pour chaque coin détecté, on cherche les 2 lignes noires perpendiculaires
  /**
   * du bord du marqueur et on calcule leur intersection = vrai coin.
  /**
   * 
  /**
   * @param data - Données de l'image
  /**
   * @param width - Largeur de l'image
  /**
   * @param height - Hauteur de l'image
  /**
   * @param corners - Les 4 coins [TL, TR, BR, BL] initiaux
  /**
   * @returns Les 4 coins raffinés ou null si échec
   */
  private refineCornersWithBlackLines(
    data: Uint8ClampedArray | Buffer,
    width: number,
    height: number,
    corners: Point2D[]
  ): Point2D[] | null {
    if (!corners || corners.length !== 4) return null;
    
    const refinedCorners: Point2D[] = [];
    const cornerNames = ['TL', 'TR', 'BR', 'BL'];
    
    // Calculer une taille de recherche basée sur la taille du marqueur
    const markerWidth = Math.sqrt(
      (corners[1].x - corners[0].x) ** 2 + (corners[1].y - corners[0].y) ** 2
    );
    const markerHeight = Math.sqrt(
      (corners[3].x - corners[0].x) ** 2 + (corners[3].y - corners[0].y) ** 2
    );
    const avgMarkerSize = (markerWidth + markerHeight) / 2;
    
    console.log(`   📏 Taille marqueur: ${markerWidth.toFixed(0)}×${markerHeight.toFixed(0)}px, recherche dans rayon ${(avgMarkerSize * 0.15).toFixed(0)}px`);
    
    for (let i = 0; i < 4; i++) {
      const corner = corners[i];
      const cornerType = cornerNames[i] as 'TL' | 'TR' | 'BR' | 'BL';
      
      // Créer un pseudo-cluster pour réutiliser findTrueCornerByBlackLines
      const searchRadius = avgMarkerSize * 0.15; // 15% de la taille du marqueur
      const fakeCluster: MagentaCluster = {
        cx: corner.x,
        cy: corner.y,
        width: searchRadius * 2,
        height: searchRadius * 2,
        area: searchRadius * searchRadius * 4,
        pixels: []
      };
      
      // 🎯 FORCER la recherche des lignes EXTÉRIEURES selon le type de coin
      const trueCorner = this.findTrueCornerByBlackLines(data, width, height, corner.x, corner.y, fakeCluster, cornerType);
      
      if (trueCorner) {
        // Vérifier que le coin raffiné n'est pas trop loin de l'original
        const dist = Math.sqrt((trueCorner.x - corner.x) ** 2 + (trueCorner.y - corner.y) ** 2);
        if (dist < searchRadius * 2) {
          console.log(`   ${cornerNames[i]}: (${corner.x.toFixed(0)}, ${corner.y.toFixed(0)}) → (${trueCorner.x.toFixed(0)}, ${trueCorner.y.toFixed(0)}) [Δ=${dist.toFixed(1)}px]`);
          refinedCorners.push(trueCorner);
        } else {
          console.log(`   ${cornerNames[i]}: raffinement trop loin (${dist.toFixed(1)}px), garde original`);
          refinedCorners.push(corner);
        }
      } else {
        console.log(`   ${cornerNames[i]}: raffinement échoué, garde original`);
        refinedCorners.push(corner);
      }
    }
    
    return refinedCorners;
  }

  /**
   * 🎯 NOUVELLE MÉTHODE: Trouver le vrai coin du marqueur en suivant les lignes noires
  /**
   * 
  /**
   * Le marqueur ArUco a des lignes noires sur ses bords qui passent par les cercles magenta.
  /**
   * Cette méthode:
  /**
   * 1. Part du centre du cercle magenta
  /**
   * 2. Scanne dans 4 directions pour trouver les lignes noires
  /**
   * 3. Suit ces lignes noires pour trouver leur intersection
  /**
   * 4. L'intersection = le vrai coin du marqueur 16.8cm
  /**
   * 
  /**
   * @param data - Données de l'image
  /**
   * @param width - Largeur de l'image
  /**
   * @param height - Hauteur de l'image
  /**
   * @param cx - Centre X du cercle magenta
  /**
   * @param cy - Centre Y du cercle magenta
  /**
   * @param cluster - Infos sur le cluster magenta
  /**
   * @param cornerType - Type de coin (TL, TR, BR, BL) pour forcer les lignes extérieures
  /**
   * @returns Le vrai coin (intersection des lignes noires) ou null
   */
  private findTrueCornerByBlackLines(
    data: Uint8ClampedArray | Buffer,
    width: number,
    height: number,
    cx: number,
    cy: number,
    cluster: MagentaCluster,
    cornerType?: 'TL' | 'TR' | 'BR' | 'BL'
  ): Point2D | null {
    console.log(`\n   🔍 [BLACK LINES] Recherche du vrai coin depuis magenta (${cx.toFixed(0)}, ${cy.toFixed(0)})${cornerType ? ` - Type: ${cornerType}` : ''}`);
    
    // Rayon de recherche basé sur la taille du cluster magenta
    const searchRadius = Math.max(30, Math.max(cluster.width, cluster.height) * 1.5);
    console.log(`      Rayon de recherche: ${searchRadius.toFixed(0)}px`);
    
    // 🎯 ÉTAPE 1: Définir les 2 directions à chercher selon le type de coin
    // On cherche TOUJOURS les lignes EXTÉRIEURES du marqueur
    let directionsToSearch: Array<{ name: string; dx: number; dy: number }>;
    
    if (cornerType === 'TL') {
      // Top-Left: chercher NORD (haut) + OUEST (gauche) = lignes extérieures
      directionsToSearch = [
        { name: 'N', dx: 0, dy: -1 },  // Nord = haut (ligne extérieure)
        { name: 'W', dx: -1, dy: 0 }   // Ouest = gauche (ligne extérieure)
      ];
    } else if (cornerType === 'TR') {
      // Top-Right: chercher NORD (haut) + EST (droite) = lignes extérieures
      directionsToSearch = [
        { name: 'N', dx: 0, dy: -1 },  // Nord = haut (ligne extérieure)
        { name: 'E', dx: 1, dy: 0 }    // Est = droite (ligne extérieure)
      ];
    } else if (cornerType === 'BR') {
      // Bottom-Right: chercher SUD (bas) + EST (droite) = lignes extérieures
      directionsToSearch = [
        { name: 'S', dx: 0, dy: 1 },   // Sud = bas (ligne extérieure)
        { name: 'E', dx: 1, dy: 0 }    // Est = droite (ligne extérieure)
      ];
    } else if (cornerType === 'BL') {
      // Bottom-Left: chercher SUD (bas) + OUEST (gauche) = lignes extérieures
      directionsToSearch = [
        { name: 'S', dx: 0, dy: 1 },   // Sud = bas (ligne extérieure)
        { name: 'W', dx: -1, dy: 0 }   // Ouest = gauche (ligne extérieure)
      ];
    } else {
      // Mode fallback: chercher dans toutes les directions (ancien comportement)
      directionsToSearch = [
        { name: 'N',  dx: 0,  dy: -1 },
        { name: 'NE', dx: 1,  dy: -1 },
        { name: 'E',  dx: 1,  dy: 0 },
        { name: 'SE', dx: 1,  dy: 1 },
        { name: 'S',  dx: 0,  dy: 1 },
        { name: 'SW', dx: -1, dy: 1 },
        { name: 'W',  dx: -1, dy: 0 },
        { name: 'NW', dx: -1, dy: -1 }
      ];
    }
    
    // Pour chaque direction, trouver où commence la ligne noire
    const blackLineStarts: Array<{ dir: string; point: Point2D; angle: number }> = [];
    
    for (const dir of directionsToSearch) {
      const blackStart = this.findBlackLineStart(data, width, height, cx, cy, dir.dx, dir.dy, searchRadius);
      if (blackStart) {
        const angle = Math.atan2(dir.dy, dir.dx);
        blackLineStarts.push({ dir: dir.name, point: blackStart, angle });
        console.log(`      ✓ Ligne noire trouvée direction ${dir.name}: (${blackStart.x.toFixed(0)}, ${blackStart.y.toFixed(0)})`);
      }
    }
    
    console.log(`      ${blackLineStarts.length} lignes noires détectées`);
    
    if (blackLineStarts.length < 2) {
      console.log(`      ⚠️ Pas assez de lignes noires trouvées`);
      return null;
    }
    
    // 🎯 ÉTAPE 2: Trouver les 2 lignes noires perpendiculaires (90°)
    // Les bords du marqueur sont perpendiculaires
    let bestPair: { line1: typeof blackLineStarts[0]; line2: typeof blackLineStarts[0]; angleDiff: number } | null = null;
    
    for (let i = 0; i < blackLineStarts.length; i++) {
      for (let j = i + 1; j < blackLineStarts.length; j++) {
        const angleDiff = Math.abs(blackLineStarts[i].angle - blackLineStarts[j].angle);
        const normalizedDiff = Math.min(angleDiff, Math.PI * 2 - angleDiff);
        const degreeDiff = normalizedDiff * 180 / Math.PI;
        
        // Chercher un angle proche de 90° (entre 70° et 110°)
        if (degreeDiff > 70 && degreeDiff < 110) {
          if (!bestPair || Math.abs(degreeDiff - 90) < Math.abs(bestPair.angleDiff - 90)) {
            bestPair = {
              line1: blackLineStarts[i],
              line2: blackLineStarts[j],
              angleDiff: degreeDiff
            };
          }
        }
      }
    }
    
    if (!bestPair) {
      console.log(`      ⚠️ Pas de paire de lignes perpendiculaires trouvée`);
      // Fallback: utiliser les 2 premières lignes
      if (blackLineStarts.length >= 2) {
        bestPair = {
          line1: blackLineStarts[0],
          line2: blackLineStarts[1],
          angleDiff: 90
        };
      } else {
        return null;
      }
    }
    
    console.log(`      ✓ Paire perpendiculaire: ${bestPair.line1.dir} + ${bestPair.line2.dir} (angle: ${bestPair.angleDiff.toFixed(1)}°)`);
    
    // 🎯 ÉTAPE 3: Suivre les 2 lignes noires et trouver leur intersection
    const line1Extended = this.followBlackLine(data, width, height, bestPair.line1.point, bestPair.line1.angle, searchRadius * 2);
    const line2Extended = this.followBlackLine(data, width, height, bestPair.line2.point, bestPair.line2.angle, searchRadius * 2);
    
    console.log(`      Ligne 1 étendue: de (${bestPair.line1.point.x.toFixed(0)}, ${bestPair.line1.point.y.toFixed(0)}) à (${line1Extended.x.toFixed(0)}, ${line1Extended.y.toFixed(0)})`);
    console.log(`      Ligne 2 étendue: de (${bestPair.line2.point.x.toFixed(0)}, ${bestPair.line2.point.y.toFixed(0)}) à (${line2Extended.x.toFixed(0)}, ${line2Extended.y.toFixed(0)})`);
    
    // 🎯 ÉTAPE 4: Calculer l'intersection des 2 lignes
    const intersection = this.computeLineIntersection(
      bestPair.line1.point, line1Extended,
      bestPair.line2.point, line2Extended
    );
    
    if (intersection) {
      // Vérifier que l'intersection est proche du centre magenta (dans un rayon raisonnable)
      const distFromMagenta = Math.sqrt((intersection.x - cx) ** 2 + (intersection.y - cy) ** 2);
      
      if (distFromMagenta < searchRadius * 1.5) {
        console.log(`      ✅ INTERSECTION TROUVÉE: (${intersection.x.toFixed(1)}, ${intersection.y.toFixed(1)}) - distance du magenta: ${distFromMagenta.toFixed(1)}px`);
        return intersection;
      } else {
        console.log(`      ⚠️ Intersection trop loin du magenta (${distFromMagenta.toFixed(1)}px > ${(searchRadius * 1.5).toFixed(1)}px)`);
      }
    }
    
    // Fallback: retourner le centre magenta si pas d'intersection valide
    console.log(`      ⚠️ Fallback sur centre magenta`);
    return { x: cx, y: cy };
  }
  
  /**
   * 🎯 Trouver le BORD EXTÉRIEUR d'une ligne noire
  /**
   * 
  /**
   * Scanne depuis le centre magenta vers l'extérieur et trouve
  /**
   * le DERNIER pixel noir de la ligne = bord extérieur du marqueur
   */
  private findBlackLineStart(
    data: Uint8ClampedArray | Buffer,
    width: number,
    height: number,
    cx: number,
    cy: number,
    dx: number,
    dy: number,
    maxDist: number
  ): Point2D | null {
    // Normaliser la direction
    const len = Math.sqrt(dx * dx + dy * dy);
    const ndx = dx / len;
    const ndy = dy / len;
    
    // Scanner pixel par pixel depuis le centre vers l'extérieur
    let inBlack = false;
    let lastBlackX = 0, lastBlackY = 0;
    let firstBlackX = 0, firstBlackY = 0;
    let consecutiveBlack = 0;
    
    for (let dist = 5; dist < maxDist; dist += 1) {
      const x = Math.round(cx + ndx * dist);
      const y = Math.round(cy + ndy * dist);
      
      if (x < 0 || x >= width || y < 0 || y >= height) break;
      
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const brightness = (r + g + b) / 3;
      
      // Pixel noir = brightness < 80
      const isBlack = brightness < 80;
      
      if (isBlack) {
        if (!inBlack) {
          // Premier pixel noir trouvé
          firstBlackX = x;
          firstBlackY = y;
          consecutiveBlack = 0;
        }
        // Mémoriser le dernier pixel noir
        lastBlackX = x;
        lastBlackY = y;
        inBlack = true;
        consecutiveBlack++;
      } else {
        // Pixel clair trouvé
        if (inBlack && consecutiveBlack >= 5) {
          // On vient de sortir d'une ligne noire épaisse
          // 🎯 Retourner le DERNIER pixel noir = bord EXTÉRIEUR
          return { x: lastBlackX, y: lastBlackY };
        }
        inBlack = false;
        consecutiveBlack = 0;
      }
    }
    
    // Si on est encore dans le noir à la fin et qu'on a trouvé une ligne
    return (inBlack && consecutiveBlack >= 5) ? { x: lastBlackX, y: lastBlackY } : null;
  }
  
  /**
   * Suivre une ligne noire dans une direction donnée
   */
  private followBlackLine(
    data: Uint8ClampedArray | Buffer,
    width: number,
    height: number,
    start: Point2D,
    angle: number,
    maxDist: number
  ): Point2D {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    
    let lastValidX = start.x;
    let lastValidY = start.y;
    
    // Suivre la ligne tant qu'on trouve des pixels noirs
    for (let dist = 1; dist < maxDist; dist += 2) {
      const x = Math.round(start.x + dx * dist);
      const y = Math.round(start.y + dy * dist);
      
      if (x < 0 || x >= width || y < 0 || y >= height) break;
      
      // Vérifier si ce pixel (ou ses voisins) est noir
      let foundBlack = false;
      
      // Chercher dans un petit voisinage perpendiculaire à la direction
      for (let offset = -3; offset <= 3 && !foundBlack; offset++) {
        const ox = Math.round(x - dy * offset);
        const oy = Math.round(y + dx * offset);
        
        if (ox < 0 || ox >= width || oy < 0 || oy >= height) continue;
        
        const idx = (oy * width + ox) * 4;
        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        
        if (brightness < 80) {
          foundBlack = true;
          lastValidX = ox;
          lastValidY = oy;
        }
      }
      
      if (!foundBlack) {
        // Plus de ligne noire, arrêter
        break;
      }
    }
    
    return { x: lastValidX, y: lastValidY };
  }
  
  /**
   * Calculer l'intersection de 2 lignes définies par 2 points chacune
   */
  private computeLineIntersection(
    p1: Point2D, p2: Point2D,
    p3: Point2D, p4: Point2D
  ): Point2D | null {
    const x1 = p1.x, y1 = p1.y;
    const x2 = p2.x, y2 = p2.y;
    const x3 = p3.x, y3 = p3.y;
    const x4 = p4.x, y4 = p4.y;
    
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    
    if (Math.abs(denom) < 0.0001) {
      // Lignes parallèles
      return null;
    }
    
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    
    return {
      x: x1 + t * (x2 - x1),
      y: y1 + t * (y2 - y1)
    };
  }

  /**
   * Calculer les mesures du quadrilatère pour l'homographie
   */
  private calculateMeasurements(quad: Point2D[]): {
    sides: number[];
    avgSidePx: number;
    pixelsPerCm: number;
    angles: number[];
    center: Point2D;
  } {
    const [tl, tr, br, bl] = quad;
    
    // Calculer les 4 côtés
    const sides = [
      Math.sqrt((tr.x - tl.x) ** 2 + (tr.y - tl.y) ** 2), // Haut
      Math.sqrt((br.x - tr.x) ** 2 + (br.y - tr.y) ** 2), // Droit
      Math.sqrt((bl.x - br.x) ** 2 + (bl.y - br.y) ** 2), // Bas
      Math.sqrt((tl.x - bl.x) ** 2 + (tl.y - bl.y) ** 2)  // Gauche
    ];
    
    const avgSidePx = sides.reduce((a, b) => a + b, 0) / 4;
    const pixelsPerCm = avgSidePx / MARKER_SPECS.markerSize;
    
    // Calculer les angles aux coins
    const angles = [
      this.calculateAngle(bl, tl, tr),
      this.calculateAngle(tl, tr, br),
      this.calculateAngle(tr, br, bl),
      this.calculateAngle(br, bl, tl)
    ];
    
    return {
      sides,
      avgSidePx,
      pixelsPerCm,
      angles,
      center: {
        x: (tl.x + tr.x + br.x + bl.x) / 4,
        y: (tl.y + tr.y + br.y + bl.y) / 4
      }
    };
  }

  /**
   * Ordonner les 4 coins en [TL, TR, BR, BL]
   */
  private orderCorners(corners: Point2D[]): Point2D[] | null {
    if (corners.length !== 4) return null;
    
    const cx = corners.reduce((s, c) => s + c.x, 0) / 4;
    const cy = corners.reduce((s, c) => s + c.y, 0) / 4;
    
    const topLeft = corners.find(c => c.x < cx && c.y < cy);
    const topRight = corners.find(c => c.x >= cx && c.y < cy);
    const bottomRight = corners.find(c => c.x >= cx && c.y >= cy);
    const bottomLeft = corners.find(c => c.x < cx && c.y >= cy);
    
    if (!topLeft || !topRight || !bottomRight || !bottomLeft) return null;
    return [topLeft, topRight, bottomRight, bottomLeft];
  }

  /**
   * Vérifier si un quadrilatère est valide
   */
  isValidQuad(quad: Point2D[]): boolean {
    if (quad.length !== 4) return false;
    
    const [tl, tr, br, bl] = quad;
    if (tl.y > bl.y || tr.y > br.y) return false;
    if (tl.x > tr.x || bl.x > br.x) return false;
    
    const width = Math.max(tr.x - tl.x, br.x - bl.x);
    const height = Math.max(bl.y - tl.y, br.y - tr.y);
    
    return width >= this.minSize && height >= this.minSize &&
           width <= this.maxSize && height <= this.maxSize;
  }
}

/**
 * Calculer la matrice d'homographie 3x3 à partir de 4 correspondances de points
 * Utilise l'algorithme DLT (Direct Linear Transform)
 */
export function computeHomography(
  srcPoints: Point2D[], // 4 points source (coins détectés en pixels)
  dstPoints: Point2D[]  // 4 points destination (coins réels en cm, ex: 0,0 à 18,18)
): number[][] {
  if (srcPoints.length !== 4 || dstPoints.length !== 4) {
    console.error('computeHomography: besoin de 4 points source et 4 points destination');
    return [[1, 0, 0], [0, 1, 0], [0, 0, 1]]; // Identité
  }
  
  // Construire la matrice A pour le système Ah = 0
  const A: number[][] = [];
  
  for (let i = 0; i < 4; i++) {
    const [x, y] = [srcPoints[i].x, srcPoints[i].y];
    const [u, v] = [dstPoints[i].x, dstPoints[i].y];
    
    A.push([-x, -y, -1, 0, 0, 0, u * x, u * y, u]);
    A.push([0, 0, 0, -x, -y, -1, v * x, v * y, v]);
  }
  
  // Résoudre par SVD simplifiée (on utilise la dernière colonne de V)
  // Pour une implémentation simple, on utilise les équations normales
  const h = solveHomographyDLT(A);
  
  // Reshape en matrice 3x3
  return [
    [h[0], h[1], h[2]],
    [h[3], h[4], h[5]],
    [h[6], h[7], h[8]]
  ];
}

/**
 * Résoudre le système DLT par pseudo-inverse
 * On cherche le vecteur propre associé à la PLUS PETITE valeur propre de A^T A
 * Utilise l'inverse iteration (shift-invert) pour plus de stabilité
 */
function solveHomographyDLT(A: number[][]): number[] {
  const n = 9;
  
  // Calculer AᵀA
  const AtA: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let sum = 0;
      for (let k = 0; k < A.length; k++) {
        sum += A[k][i] * A[k][j];
      }
      AtA[i][j] = sum;
    }
  }
  
  // Méthode plus robuste: résoudre directement le système linéaire
  // En fixant h[8] = 1 et en résolvant les 8 autres équations
  // Cela évite les problèmes de valeurs propres
  
  // Construire le système réduit: on fixe h[8] = 1
  // Les équations deviennent: A_reduced * h_reduced = -A_last_col
  const A_reduced: number[][] = [];
  const b: number[] = [];
  
  for (let i = 0; i < A.length; i++) {
    const row = [];
    for (let j = 0; j < 8; j++) {
      row.push(A[i][j]);
    }
    A_reduced.push(row);
    b.push(-A[i][8]); // h[8] = 1, donc on déplace le dernier terme à droite
  }
  
  // Résoudre par moindres carrés: (A^T A) h = A^T b
  const AtA_reduced: number[][] = Array(8).fill(null).map(() => Array(8).fill(0));
  const Atb: number[] = Array(8).fill(0);
  
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      let sum = 0;
      for (let k = 0; k < A_reduced.length; k++) {
        sum += A_reduced[k][i] * A_reduced[k][j];
      }
      AtA_reduced[i][j] = sum;
    }
    let sum = 0;
    for (let k = 0; k < A_reduced.length; k++) {
      sum += A_reduced[k][i] * b[k];
    }
    Atb[i] = sum;
  }
  
  // Résoudre par élimination de Gauss avec pivot partiel
  const h_reduced = gaussElimination(AtA_reduced, Atb);
  
  // Reconstruire h complet
  const h = [...h_reduced, 1];
  
  return h;
}

/**
 * Élimination de Gauss avec pivot partiel pour résoudre Ax = b
 */
function gaussElimination(A: number[][], b: number[]): number[] {
  const n = A.length;
  
  // Copier les matrices pour ne pas les modifier
  const augmented: number[][] = A.map((row, i) => [...row, b[i]]);
  
  // Élimination vers l'avant avec pivot partiel
  for (let col = 0; col < n; col++) {
    // Trouver le pivot maximal dans la colonne
    let maxRow = col;
    let maxVal = Math.abs(augmented[col][col]);
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(augmented[row][col]) > maxVal) {
        maxVal = Math.abs(augmented[row][col]);
        maxRow = row;
      }
    }
    
    // Échanger les lignes
    if (maxRow !== col) {
      [augmented[col], augmented[maxRow]] = [augmented[maxRow], augmented[col]];
    }
    
    // Si le pivot est nul, la matrice est singulière
    if (Math.abs(augmented[col][col]) < 1e-12) {
      // Ajouter un petit epsilon pour la stabilité
      augmented[col][col] = 1e-12;
    }
    
    // Éliminer les éléments sous le pivot
    for (let row = col + 1; row < n; row++) {
      const factor = augmented[row][col] / augmented[col][col];
      for (let j = col; j <= n; j++) {
        augmented[row][j] -= factor * augmented[col][j];
      }
    }
  }
  
  // Substitution arrière
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = augmented[i][n];
    for (let j = i + 1; j < n; j++) {
      sum -= augmented[i][j] * x[j];
    }
    x[i] = sum / augmented[i][i];
  }
  
  return x;
}

/**
 * Transformer un point par la matrice d'homographie
 */
export function transformPoint(H: number[][], p: Point2D): Point2D {
  const x = H[0][0] * p.x + H[0][1] * p.y + H[0][2];
  const y = H[1][0] * p.x + H[1][1] * p.y + H[1][2];
  const w = H[2][0] * p.x + H[2][1] * p.y + H[2][2];
  
  return {
    x: x / w,
    y: y / w
  };
}

/**
 * Calculer la distance entre deux points en cm via homographie
 */
export function measureDistanceCm(
  H: number[][],
  p1Px: Point2D,
  p2Px: Point2D
): number {
  const p1Cm = transformPoint(H, p1Px);
  const p2Cm = transformPoint(H, p2Px);
  
  return Math.sqrt((p2Cm.x - p1Cm.x) ** 2 + (p2Cm.y - p1Cm.y) ** 2);
}

/**
 * Estimer la rotation (pose) du marqueur par rapport à la caméra
 */
export function estimatePose(corners: Point2D[]): {
  rotX: number; // Rotation autour de X (basculement avant/arrière)
  rotY: number; // Rotation autour de Y (basculement gauche/droite)
  rotZ: number; // Rotation autour de Z (inclinaison)
} {
  if (corners.length !== 4) {
    return { rotX: 0, rotY: 0, rotZ: 0 };
  }
  
  const [tl, tr, br, bl] = corners;
  
  // Rotation X: comparaison largeur haut vs bas
  const topWidth = Math.sqrt((tr.x - tl.x) ** 2 + (tr.y - tl.y) ** 2);
  const bottomWidth = Math.sqrt((br.x - bl.x) ** 2 + (br.y - bl.y) ** 2);
  const ratioX = topWidth / bottomWidth;
  const rotX = Math.round(Math.atan2(ratioX - 1, 0.5) * 180 / Math.PI);
  
  // Rotation Y: comparaison hauteur gauche vs droite
  const leftHeight = Math.sqrt((bl.x - tl.x) ** 2 + (bl.y - tl.y) ** 2);
  const rightHeight = Math.sqrt((br.x - tr.x) ** 2 + (br.y - tr.y) ** 2);
  const ratioY = leftHeight / rightHeight;
  const rotY = Math.round(Math.atan2(ratioY - 1, 0.5) * 180 / Math.PI);
  
  // Rotation Z: inclinaison du bord supérieur
  const rotZ = Math.round(Math.atan2(tr.y - tl.y, tr.x - tl.x) * 180 / Math.PI);
  
  return { rotX, rotY, rotZ };
}

/**
 * Calculer un score de qualité pour la détection
 */
export function calculateQualityScore(
  corners: Point2D[],
  avgSizePx: number,
  rotX: number,
  rotY: number
): number {
  let score = 100;
  
  // Pénalité si marqueur trop petit
  if (avgSizePx < 50) score -= 40;
  else if (avgSizePx < 100) score -= 20;
  
  // Pénalité pour les angles (perspective forte)
  score -= Math.abs(rotX) * 0.5;
  score -= Math.abs(rotY) * 0.5;
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

// ═══════════════════════════════════════════════════════════════════════════
// ⭐ NOUVELLE SECTION: HOMOGRAPHIE ULTRA-PRÉCISE AVEC 16+ POINTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculer une homographie ultra-précise utilisant N points (N >= 4)
 * Plus de points = meilleure résistance au bruit et plus grande précision
 * 
 * @param extendedPoints Points de référence étendus (16 points pour ArUco)
 * @param minConfidence Confiance minimale pour inclure un point (default: 0.6)
 * @returns Matrice d'homographie 3x3 et score de qualité
 */
export function computeHomographyExtended(
  extendedPoints: ExtendedReferencePoints,
  minConfidence: number = 0.6
): { H: number[][]; quality: number; usedPoints: number } {
  
  // Filtrer les points avec confiance suffisante
  const validPoints = extendedPoints.allPoints.filter(p => p.confidence >= minConfidence);
  
  if (validPoints.length < 4) {
    console.warn(`⚠️ Seulement ${validPoints.length} points valides (min 4 requis)`);
    // Fallback: utiliser les 4 coins
    // CRITICAL: Métré A4 V1.2 = 130×217mm (13×21.7cm) rectangulaire!
    return {
      H: computeHomography(
        extendedPoints.corners,
        [
          { x: 0, y: 0 },
          { x: markerWidthMm, y: 0 },              // 🎯 Largeur rectangulaire
          { x: markerWidthMm, y: markerHeightMm }, // 🎯 Largeur × Hauteur
          { x: 0, y: markerHeightMm }              // 🎯 Hauteur rectangulaire
        ]
      ),
      quality: 0.5,
      usedPoints: 4
    };
  }
  
  console.log(`📐 Calcul homographie avec ${validPoints.length} points`);
  
  // Extraire les paires de points (pixel -> réel)
  const srcPoints = validPoints.map(p => p.pixel);
  const dstPoints = validPoints.map(p => p.real);
  
  // Calculer l'homographie avec N points par moindres carrés
  const H = computeHomographyNPoints(srcPoints, dstPoints);
  
  // Calculer le score de qualité basé sur l'erreur de reprojection
  const quality = calculateHomographyQuality(H, srcPoints, dstPoints);
  
  return { H, quality, usedPoints: validPoints.length };
}

/**
 * Calculer une homographie avec N points (N >= 4) par moindres carrés
 * Utilise la décomposition SVD pour une solution optimale
 */
function computeHomographyNPoints(srcPoints: Point2D[], dstPoints: Point2D[]): number[][] {
  const n = srcPoints.length;
  
  if (n < 4) {
    console.error('computeHomographyNPoints: besoin d\'au moins 4 points');
    return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  }
  
  // Normalisation des coordonnées pour meilleure stabilité numérique
  const srcNorm = normalizePoints(srcPoints);
  const dstNorm = normalizePoints(dstPoints);
  
  // Construire la matrice A (2n x 9) pour le système Ah = 0
  const A: number[][] = [];
  
  for (let i = 0; i < n; i++) {
    const { x, y } = srcNorm.normalized[i];
    const { x: u, y: v } = dstNorm.normalized[i];
    
    A.push([-x, -y, -1, 0, 0, 0, u * x, u * y, u]);
    A.push([0, 0, 0, -x, -y, -1, v * x, v * y, v]);
  }
  
  // Résoudre par SVD (trouver le vecteur singulier correspondant à la plus petite valeur singulière)
  const h = solveSVD(A);
  
  // Reconstruire la matrice H normalisée
  const Hnorm: number[][] = [
    [h[0], h[1], h[2]],
    [h[3], h[4], h[5]],
    [h[6], h[7], h[8]]
  ];
  
  // Dénormaliser: H = T_dst^(-1) * Hnorm * T_src
  const H = denormalizeHomography(Hnorm, srcNorm.T, dstNorm.T);
  
  return H;
}

/**
 * Normaliser les points pour une meilleure stabilité numérique
 * Centre les points à l'origine et met à l'échelle pour que la distance moyenne soit √2
 */
function normalizePoints(points: Point2D[]): {
  normalized: Point2D[];
  T: number[][]; // Matrice de transformation
} {
  const n = points.length;
  
  // Calculer le centroïde
  let cx = 0, cy = 0;
  for (const p of points) {
    cx += p.x;
    cy += p.y;
  }
  cx /= n;
  cy /= n;
  
  // Calculer la distance moyenne au centroïde
  let avgDist = 0;
  for (const p of points) {
    avgDist += Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2);
  }
  avgDist /= n;
  
  // Échelle pour que la distance moyenne soit √2
  const scale = avgDist > 1e-10 ? Math.SQRT2 / avgDist : 1;
  
  // Normaliser les points
  const normalized = points.map(p => ({
    x: (p.x - cx) * scale,
    y: (p.y - cy) * scale
  }));
  
  // Matrice de transformation: T * [x, y, 1]^T = [x', y', 1]^T
  const T = [
    [scale, 0, -cx * scale],
    [0, scale, -cy * scale],
    [0, 0, 1]
  ];
  
  return { normalized, T };
}

/**
 * Dénormaliser la matrice d'homographie
 * H = T_dst_inv * H_norm * T_src
 */
function denormalizeHomography(
  Hnorm: number[][],
  Tsrc: number[][],
  Tdst: number[][]
): number[][] {
  // Inverser T_dst
  const Tdst_inv = invertNormalizationMatrix(Tdst);
  
  // Multiplier: H = Tdst_inv * Hnorm * Tsrc
  const temp = multiplyMatrices(Hnorm, Tsrc);
  const H = multiplyMatrices(Tdst_inv, temp);
  
  // Normaliser pour H[2][2] = 1
  if (Math.abs(H[2][2]) > 1e-10) {
    const scale = 1 / H[2][2];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        H[i][j] *= scale;
      }
    }
  }
  
  return H;
}

/**
 * Inverser une matrice de normalisation (forme spéciale)
 */
function invertNormalizationMatrix(T: number[][]): number[][] {
  const s = T[0][0];
  const tx = T[0][2];
  const ty = T[1][2];
  
  return [
    [1/s, 0, -tx/s],
    [0, 1/s, -ty/s],
    [0, 0, 1]
  ];
}

/**
 * Multiplier deux matrices 3x3
 */
function multiplyMatrices(A: number[][], B: number[][]): number[][] {
  const C: number[][] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 3; k++) {
        C[i][j] += A[i][k] * B[k][j];
      }
    }
  }
  return C;
}

/**
 * Résoudre Ax = 0 par décomposition SVD (algorithme simplifié)
 * Trouve le vecteur propre correspondant à la plus petite valeur propre de A^T A
 */
function solveSVD(A: number[][]): number[] {
  const m = A.length;
  const n = 9;
  
  // Calculer A^T A (matrice 9x9)
  const AtA: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let sum = 0;
      for (let k = 0; k < m; k++) {
        sum += A[k][i] * A[k][j];
      }
      AtA[i][j] = sum;
    }
  }
  
  // Trouver le plus petit vecteur propre par itération inverse
  // D'abord, ajouter un petit shift pour éviter la singularité
  const shift = 1e-6;
  for (let i = 0; i < n; i++) {
    AtA[i][i] += shift;
  }
  
  // Résoudre (A^T A + shift*I) x = b par itération
  // On utilise la méthode de puissance inverse
  let x = Array(n).fill(1 / Math.sqrt(n));
  
  for (let iter = 0; iter < 50; iter++) {
    // Résoudre le système linéaire par Gauss-Seidel
    const newX = solveGaussSeidel(AtA, x, 20);
    
    // Normaliser
    const norm = Math.sqrt(newX.reduce((s, v) => s + v * v, 0));
    if (norm > 1e-10) {
      for (let i = 0; i < n; i++) {
        x[i] = newX[i] / norm;
      }
    }
  }
  
  // Normaliser pour x[8] = 1 (convention d'homographie)
  if (Math.abs(x[8]) > 1e-10) {
    const scale = 1 / x[8];
    for (let i = 0; i < n; i++) {
      x[i] *= scale;
    }
  }
  
  return x;
}

/**
 * Résoudre Ax = b par itération de Gauss-Seidel
 */
function solveGaussSeidel(A: number[][], b: number[], iterations: number): number[] {
  const n = b.length;
  const x = [...b];
  
  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < n; i++) {
      let sum = b[i];
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          sum -= A[i][j] * x[j];
        }
      }
      x[i] = sum / A[i][i];
    }
  }
  
  return x;
}

/**
 * Calculer la qualité de l'homographie basée sur l'erreur de reprojection
 * @returns Score entre 0 (mauvais) et 1 (excellent)
 */
function calculateHomographyQuality(
  H: number[][],
  srcPoints: Point2D[],
  dstPoints: Point2D[]
): number {
  let totalError = 0;
  
  for (let i = 0; i < srcPoints.length; i++) {
    const projected = transformPoint(H, srcPoints[i]);
    const expected = dstPoints[i];
    const error = Math.sqrt(
      (projected.x - expected.x) ** 2 + 
      (projected.y - expected.y) ** 2
    );
    totalError += error;
  }
  
  const avgError = totalError / srcPoints.length;
  
  // Convertir en score (0.1cm d'erreur = 99%, 1cm = 50%, etc.)
  // L'erreur est en cm car dstPoints est en cm
  const score = Math.exp(-avgError * 5);
  
  console.log(`📊 Erreur de reprojection moyenne: ${(avgError * 10).toFixed(2)}mm, qualité: ${(score * 100).toFixed(0)}%`);
  
  return score;
}

/**
 * Créer une homographie pour les 4 coins du marqueur ArUco standard
 * Shortcut pour le cas simple sans points étendus
 */
export function createArucoHomography(corners: Point2D[]): number[][] {
  const markerSize = MARKER_SPECS.markerSize;
  return computeHomography(
    corners,
    [
      { x: 0, y: 0 },
      { x: markerSize, y: 0 },
      { x: markerSize, y: markerSize },
      { x: 0, y: markerSize }
    ]
  );
}

/**
 * Mesurer une distance en cm avec l'homographie étendue
 * Plus précis que measureDistanceCm car utilise plus de points de référence
 */
export function measureDistanceCmExtended(
  extendedResult: { H: number[][] },
  p1Px: Point2D,
  p2Px: Point2D
): number {
  return measureDistanceCm(extendedResult.H, p1Px, p2Px);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 SECTION ULTRA-PRÉCISION: 80-100 POINTS + RANSAC + FITTING ELLIPTIQUE + LM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Configuration du pattern ArUco 6×6 intérieur
 * Le pattern central fait markerSize/3 × markerSize/3 et contient une grille 6×6 de cases noir/blanc
 * 
 * IMPORTANT: Toutes les valeurs sont DYNAMIQUES et dépendent de getMarkerSize()
 * Pour 18cm: pattern 6×6cm, cellule 1cm, start 6cm, end 12cm
 * Pour 16.8cm: pattern 5.6×5.6cm, cellule 0.933cm, start 5.6cm, end 11.2cm
 */
const _ARUCO_PATTERN = {
  gridSize: 6,           // Grille 6×6 cases
  // ⚠️ Propriétés DYNAMIQUES - utiliser les getters !
  get patternSizeCm() { return getMarkerSize() / 3; },        // 1/3 du marqueur (5.6cm pour 16.8cm)
  get cellSizeCm() { return getMarkerSize() / 18; },          // 1/18 du marqueur (0.933cm pour 16.8cm)
  get patternStartCm() { return getMarkerSize() / 3; },       // Début = 1/3 (5.6cm pour 16.8cm)
  get patternEndCm() { return getMarkerSize() * 2 / 3; },     // Fin = 2/3 (11.2cm pour 16.8cm)
};

/**
 * Point de référence ultra-précis avec métadonnées complètes
 */
export interface UltraPrecisionPoint {
  pixel: Point2D;           // Coordonnées pixel détectées
  real: Point2D;            // Coordonnées réelles en cm
  confidence: number;       // Confiance 0-1
  type: 'corner' | 'transition' | 'grid-corner' | 'grid-center' | 'ellipse-center';
  subPixelRefined: boolean; // Si raffinement sub-pixel appliqué
  error?: number;           // Erreur de reprojection après RANSAC
}

/**
 * Résultat de la détection ultra-précise
 */
export interface UltraPrecisionResult {
  points: UltraPrecisionPoint[];
  totalPoints: number;
  inlierPoints: number;        // Points après RANSAC
  homography: number[][];      // Matrice H optimisée
  reprojectionError: number;   // Erreur moyenne en mm
  quality: number;             // Score 0-1
  
  // Détails par source
  cornerPoints: number;        // Coins magenta (4)
  transitionPoints: number;    // Transitions bords (16)
  gridCornerPoints: number;    // Grille 7×7 (49)
  gridCenterPoints: number;    // Centres cases (36)
  
  // Améliorations appliquées
  ransacApplied: boolean;
  ellipseFittingApplied: boolean;
  levenbergMarquardtApplied: boolean;
}

/**
 * 🎯 DÉTECTION ULTRA-PRÉCISE - Point d'entrée principal
 * Détecte 80-100 points avec RANSAC, fitting elliptique et optimisation LM
 * 
 * @param markerWidthMm - Largeur du marqueur en mm (130mm pour AprilTag Métré V1.2 centres, 168mm pour ArUco)
 * @param markerHeightMm - Hauteur du marqueur en mm (217mm pour AprilTag Métré V1.2 centres, 168mm pour ArUco)
 */
export function detectUltraPrecisionPoints(
  imageData: { data: Uint8ClampedArray | Buffer; width: number; height: number },
  corners: Point2D[],           // 4 coins MAGENTA [TL, TR, BR, BL]
  _existingPoints?: ExtendedReferencePoints,
  markerWidthMm: number = 168,  // Default ArUco carré
  markerHeightMm: number = 168  // Default ArUco carré
): UltraPrecisionResult {
  const { data, width, height } = imageData;
  const allPoints: UltraPrecisionPoint[] = [];
  
  console.log('\n🎯 [ULTRA-PRÉCISION] Démarrage détection 80-100 points...');
  
  // ══════════════════════════════════════════════════════════════
  // ÉTAPE 1: Fitting elliptique des cercles magenta (sub-pixel)
  // ══════════════════════════════════════════════════════════════
  const refinedCorners = fitEllipsesToMagentaCircles(data, width, height, corners);
  console.log(`   ✅ Fitting elliptique: 4 coins raffinés (sub-pixel 0.1px)`);
  
  // Ajouter les 4 coins raffinés
  // 🎯 CRITIQUE: Utiliser dimensions RECTANGULAIRES pour AprilTag (130×217mm centres) ou carrées pour ArUco (168×168mm)
  const realCorners = [
    { x: 0, y: 0 },
    { x: markerWidthMm, y: 0 },              // 🎯 Largeur variable
    { x: markerWidthMm, y: markerHeightMm }, // 🎯 Largeur × Hauteur
    { x: 0, y: markerHeightMm }              // 🎯 Hauteur variable
  ];
  
  for (let i = 0; i < 4; i++) {
    allPoints.push({
      pixel: refinedCorners[i],
      real: realCorners[i],
      confidence: 0.98,
      type: 'ellipse-center',
      subPixelRefined: true
    });
  }
  
  // ══════════════════════════════════════════════════════════════
  // ÉTAPE 2: Détecter les transitions sur les 4 bords (16 points)
  // ══════════════════════════════════════════════════════════════
  const transitionPoints = detectEdgeTransitions(data, width, height, refinedCorners, markerWidthMm, markerHeightMm);
  allPoints.push(...transitionPoints);
  console.log(`   ✅ Transitions bords: ${transitionPoints.length} points`);
  
  // ══════════════════════════════════════════════════════════════
  // ÉTAPE 3: Détecter la grille 7×7 du pattern ArUco (49 coins)
  // ══════════════════════════════════════════════════════════════
  const gridCorners = detectPatternGridCorners(data, width, height, refinedCorners, markerWidthMm, markerHeightMm);
  allPoints.push(...gridCorners);
  console.log(`   ✅ Grille pattern 7×7: ${gridCorners.length} coins`);
  
  // ══════════════════════════════════════════════════════════════
  // ÉTAPE 4: Détecter les centres des 36 cases (optionnel mais précis)
  // ══════════════════════════════════════════════════════════════
  const gridCenters = detectPatternCellCenters(data, width, height, refinedCorners, markerWidthMm, markerHeightMm);
  allPoints.push(...gridCenters);
  console.log(`   ✅ Centres cases 6×6: ${gridCenters.length} points`);
  
  console.log(`   📊 Total brut: ${allPoints.length} points détectés`);
  
  // Debug: afficher quelques points pour vérifier
  console.log(`   🔍 DEBUG - Premiers points:`);
  allPoints.slice(0, 6).forEach((p, i) => {
    console.log(`      [${i}] pixel=(${p.pixel.x.toFixed(1)}, ${p.pixel.y.toFixed(1)}) → real=(${p.real.x.toFixed(1)}, ${p.real.y.toFixed(1)}) type=${p.type}`);
  });
  
  // ══════════════════════════════════════════════════════════════
  // ÉTAPE 5: RANSAC pour éliminer les outliers
  // ══════════════════════════════════════════════════════════════
  const { inliers, homography: ransacH } = ransacHomography(allPoints, {
    iterations: 1000,
    threshold: 1.0,  // 1cm = 10mm de tolérance (plus permissif pour démarrer)
    minInliers: 20
  });
  console.log(`   ✅ RANSAC: ${inliers.length}/${allPoints.length} inliers (${((inliers.length/allPoints.length)*100).toFixed(1)}%)`);
  
  // ══════════════════════════════════════════════════════════════
  // ÉTAPE 6: Raffinement Levenberg-Marquardt
  // ══════════════════════════════════════════════════════════════
  const { optimizedH, finalError } = levenbergMarquardtRefine(inliers, ransacH);
  console.log(`   ✅ Levenberg-Marquardt: erreur ${(finalError * 10).toFixed(2)}mm`);
  
  // Calculer le score de qualité
  const quality = Math.exp(-finalError * 10); // 0.1mm → 99%, 1mm → 37%
  
  const result: UltraPrecisionResult = {
    points: inliers,
    totalPoints: allPoints.length,
    inlierPoints: inliers.length,
    homography: optimizedH,
    reprojectionError: finalError * 10, // En mm
    quality,
    cornerPoints: 4,
    transitionPoints: transitionPoints.length,
    gridCornerPoints: gridCorners.length,
    gridCenterPoints: gridCenters.length,
    ransacApplied: true,
    ellipseFittingApplied: true,
    levenbergMarquardtApplied: true
  };
  
  console.log(`\n🎯 [ULTRA-PRÉCISION] TERMINÉ:`);
  console.log(`   📊 Points: ${result.inlierPoints}/${result.totalPoints}`);
  console.log(`   📏 Erreur: ±${result.reprojectionError.toFixed(2)}mm`);
  console.log(`   ⭐ Qualité: ${(result.quality * 100).toFixed(1)}%`);
  
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔵 FITTING ELLIPTIQUE - Sub-pixel pour les cercles magenta
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Ajuster des ellipses aux cercles magenta pour une précision sub-pixel
 * Utilise l'algorithme de Fitzgibbon (Direct Least Squares)
 */
function fitEllipsesToMagentaCircles(
  data: Uint8ClampedArray | Buffer,
  width: number,
  height: number,
  corners: Point2D[]
): Point2D[] {
  const refinedCorners: Point2D[] = [];
  
  for (const corner of corners) {
    // Extraire les pixels magenta autour du coin
    const magentaPixels = extractMagentaPixelsAround(data, width, height, corner, 30);
    
    if (magentaPixels.length < 8) {
      // Pas assez de pixels, garder l'original
      refinedCorners.push(corner);
      continue;
    }
    
    // Ajuster une ellipse par moindres carrés directs (Fitzgibbon)
    const ellipse = fitEllipseDirect(magentaPixels);
    
    if (ellipse) {
      refinedCorners.push({ x: ellipse.cx, y: ellipse.cy });
    } else {
      // Fallback: moyenne pondérée des pixels
      const avgX = magentaPixels.reduce((s, p) => s + p.x, 0) / magentaPixels.length;
      const avgY = magentaPixels.reduce((s, p) => s + p.y, 0) / magentaPixels.length;
      refinedCorners.push({ x: avgX, y: avgY });
    }
  }
  
  return refinedCorners;
}

/**
 * Extraire les pixels magenta autour d'un point
 */
function extractMagentaPixelsAround(
  data: Uint8ClampedArray | Buffer,
  width: number,
  height: number,
  center: Point2D,
  radius: number
): Point2D[] {
  const pixels: Point2D[] = [];
  const startX = Math.max(0, Math.floor(center.x - radius));
  const endX = Math.min(width - 1, Math.ceil(center.x + radius));
  const startY = Math.max(0, Math.floor(center.y - radius));
  const endY = Math.min(height - 1, Math.ceil(center.y + radius));
  
  for (let y = startY; y <= endY; y++) {
    for (let x = startX; x <= endX; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      
      // Détection magenta: R élevé, G bas, B élevé
      if (r > 100 && g < 150 && b > 100 && r > g + 30 && b > g + 30) {
        pixels.push({ x, y });
      }
    }
  }
  
  return pixels;
}

/**
 * Ajuster une ellipse par la méthode directe de Fitzgibbon
 * Résout Ax² + Bxy + Cy² + Dx + Ey + F = 0 avec contrainte B² - 4AC < 0
 */
function fitEllipseDirect(points: Point2D[]): { cx: number; cy: number; a: number; b: number; angle: number } | null {
  if (points.length < 6) return null;
  
  const n = points.length;
  
  // Centrer les points pour stabilité numérique
  const meanX = points.reduce((s, p) => s + p.x, 0) / n;
  const meanY = points.reduce((s, p) => s + p.y, 0) / n;
  
  // Construire la matrice de design
  const D: number[][] = [];
  for (const p of points) {
    const x = p.x - meanX;
    const y = p.y - meanY;
    D.push([x * x, x * y, y * y, x, y, 1]);
  }
  
  // Calculer D^T * D
  const DtD = multiplyTranspose(D);
  
  // Résoudre le système généralisé avec contrainte d'ellipse
  // On cherche le vecteur propre correspondant à la plus petite valeur propre positive
  const coeffs = solveEllipseEigenvalue(DtD);
  
  if (!coeffs) return null;
  
  const [A, B, C, D2, E, F] = coeffs;
  
  // Vérifier que c'est bien une ellipse (discriminant négatif)
  const disc = B * B - 4 * A * C;
  if (disc >= 0) return null;
  
  // Calculer le centre
  const cx = (2 * C * D2 - B * E) / disc + meanX;
  const cy = (2 * A * E - B * D2) / disc + meanY;
  
  // Calculer les demi-axes et l'angle
  const num = 2 * (A * E * E + C * D2 * D2 + F * B * B - B * D2 * E - A * C * F);
  const denom1 = (B * B - A * C) * (Math.sqrt((A - C) ** 2 + B * B) - (A + C));
  const denom2 = (B * B - A * C) * (-Math.sqrt((A - C) ** 2 + B * B) - (A + C));
  
  const a = Math.abs(denom1) > 1e-10 ? Math.sqrt(Math.abs(num / denom1)) : 0;
  const b = Math.abs(denom2) > 1e-10 ? Math.sqrt(Math.abs(num / denom2)) : 0;
  const angle = Math.abs(B) > 1e-10 ? 0.5 * Math.atan2(B, A - C) : 0;
  
  return { cx, cy, a, b, angle };
}

/**
 * Multiplier D^T * D
 */
function multiplyTranspose(D: number[][]): number[][] {
  const m = D.length;
  const n = D[0].length;
  const result: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let sum = 0;
      for (let k = 0; k < m; k++) {
        sum += D[k][i] * D[k][j];
      }
      result[i][j] = sum;
    }
  }
  
  return result;
}

/**
 * Résoudre le problème de valeur propre pour l'ellipse
 */
function solveEllipseEigenvalue(DtD: number[][]): number[] | null {
  // Méthode simplifiée: itération de puissance inverse avec contrainte
  const _n = 6; // Taille de la matrice
  let v = [1, 0, 1, 0, 0, -1]; // Initial guess pour une ellipse
  
  // Ajouter petit shift pour stabilité
  const DtDshift = DtD.map((row, i) => row.map((val, j) => val + (i === j ? 1e-8 : 0)));
  
  for (let iter = 0; iter < 50; iter++) {
    // Résoudre DtD * w = v
    const w = solveLinearSystem6x6(DtDshift, v);
    if (!w) return null;
    
    // Appliquer la contrainte d'ellipse: 4AC - B² > 0
    // On force A > 0 et ajuste C en conséquence
    if (w[0] < 0) {
      for (let i = 0; i < 6; i++) w[i] = -w[i];
    }
    
    // Normaliser
    const norm = Math.sqrt(w.reduce((s, x) => s + x * x, 0));
    if (norm < 1e-10) return null;
    
    v = w.map(x => x / norm);
  }
  
  return v;
}

/**
 * Résoudre un système linéaire 6×6 par élimination de Gauss
 */
function solveLinearSystem6x6(A: number[][], b: number[]): number[] | null {
  const n = 6;
  const aug = A.map((row, i) => [...row, b[i]]);
  
  // Élimination de Gauss avec pivot partiel
  for (let col = 0; col < n; col++) {
    // Trouver le pivot max
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) {
        maxRow = row;
      }
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    
    if (Math.abs(aug[col][col]) < 1e-12) continue;
    
    // Élimination
    for (let row = col + 1; row < n; row++) {
      const factor = aug[row][col] / aug[col][col];
      for (let j = col; j <= n; j++) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }
  
  // Substitution arrière
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = aug[i][n];
    for (let j = i + 1; j < n; j++) {
      sum -= aug[i][j] * x[j];
    }
    x[i] = Math.abs(aug[i][i]) > 1e-12 ? sum / aug[i][i] : 0;
  }
  
  return x;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📏 DÉTECTION DES TRANSITIONS SUR LES BORDS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Détecter les transitions noir↔blanc sur les 4 bords du marqueur
 */
function detectEdgeTransitions(
  data: Uint8ClampedArray | Buffer,
  width: number,
  height: number,
  corners: Point2D[],
  markerWidthMm: number = 168,   // 🎯 Largeur du marqueur en mm
  markerHeightMm: number = 168   // 🎯 Hauteur du marqueur en mm
): UltraPrecisionPoint[] {
  const points: UltraPrecisionPoint[] = [];
  const [tl, tr, br, bl] = corners;
  
  // 🎯 RECTANGULAIRE: Utiliser largeur et hauteur séparées
  const markerWidthCm = markerWidthMm / 10;
  const markerHeightCm = markerHeightMm / 10;
  
  // 🎯 RECTANGULAIRE: Transitions calculées dynamiquement pour chaque dimension
  // Pour ArUco 168mm: [28, 56, 112, 140] mm
  // Pour AprilTag 130×217mm: X=[21.7, 43.3, 86.7, 108.3] mm, Y=[36.2, 72.3, 144.7, 180.8] mm (valeurs théoriques via fractions)
  const transitionsX = [markerWidthCm/6, markerWidthCm/3, markerWidthCm*2/3, markerWidthCm*5/6];
  const transitionsY = [markerHeightCm/6, markerHeightCm/3, markerHeightCm*2/3, markerHeightCm*5/6];
  
  // Bord HAUT: TL → TR (utilise transitionsX pour l'axe X)
  for (const t of transitionsX) {
    const point = detectTransitionWithSubPixel(data, width, height, tl, tr, t / markerWidthCm);
    points.push({
      pixel: point.pixel,
      real: { x: t * 10, y: 0 },  // CM → MM
      confidence: point.confidence,
      type: 'transition',
      subPixelRefined: true
    });
  }
  
  // Bord DROIT: TR → BR (utilise transitionsY pour l'axe Y)
  for (const t of transitionsY) {
    const point = detectTransitionWithSubPixel(data, width, height, tr, br, t / markerHeightCm);
    points.push({
      pixel: point.pixel,
      real: { x: markerWidthMm, y: t * 10 },  // CM → MM
      confidence: point.confidence,
      type: 'transition',
      subPixelRefined: true
    });
  }
  
  // Bord BAS: BL → BR (utilise transitionsX pour l'axe X)
  for (const t of transitionsX) {
    const point = detectTransitionWithSubPixel(data, width, height, bl, br, t / markerWidthCm);
    points.push({
      pixel: point.pixel,
      real: { x: t * 10, y: markerHeightMm },  // CM → MM
      confidence: point.confidence,
      type: 'transition',
      subPixelRefined: true
    });
  }
  
  // Bord GAUCHE: TL → BL (utilise transitionsY pour l'axe Y)
  for (const t of transitionsY) {
    const point = detectTransitionWithSubPixel(data, width, height, tl, bl, t / markerHeightCm);
    points.push({
      pixel: point.pixel,
      real: { x: 0, y: t * 10 },  // CM → MM
      confidence: point.confidence,
      type: 'transition',
      subPixelRefined: true
    });
  }
  
  return points;
}

/**
 * Détecter une transition avec raffinement sub-pixel
 */
function detectTransitionWithSubPixel(
  data: Uint8ClampedArray | Buffer,
  width: number,
  height: number,
  start: Point2D,
  end: Point2D,
  ratio: number
): { pixel: Point2D; confidence: number } {
  // Position estimée
  const estX = start.x + (end.x - start.x) * ratio;
  const estY = start.y + (end.y - start.y) * ratio;
  
  // Direction perpendiculaire
  const edgeLen = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
  const perpX = -(end.y - start.y) / edgeLen;
  const perpY = (end.x - start.x) / edgeLen;
  
  // Direction le long du bord
  const alongX = (end.x - start.x) / edgeLen;
  const alongY = (end.y - start.y) / edgeLen;
  
  // Scanner pour trouver le max de gradient
  const searchRadius = Math.max(5, edgeLen * 0.03);
  let bestPoint = { x: estX, y: estY };
  let bestGradient = 0;
  
  for (let offset = -searchRadius; offset <= searchRadius; offset += 0.5) {
    const x = estX + alongX * offset;
    const y = estY + alongY * offset;
    const gradient = calculateGradient(data, width, height, x, y, perpX, perpY);
    
    if (Math.abs(gradient) > Math.abs(bestGradient)) {
      bestGradient = gradient;
      bestPoint = { x, y };
    }
  }
  
  // Raffinement sub-pixel par interpolation parabolique
  if (Math.abs(bestGradient) > 20) {
    const g0 = calculateGradient(data, width, height, 
      bestPoint.x - alongX * 0.5, bestPoint.y - alongY * 0.5, perpX, perpY);
    const g1 = bestGradient;
    const g2 = calculateGradient(data, width, height,
      bestPoint.x + alongX * 0.5, bestPoint.y + alongY * 0.5, perpX, perpY);
    
    const denom = 2 * (g0 - 2 * g1 + g2);
    if (Math.abs(denom) > 0.001) {
      const offset = (g0 - g2) / denom * 0.5;
      if (Math.abs(offset) < 0.5) {
        bestPoint.x += alongX * offset;
        bestPoint.y += alongY * offset;
      }
    }
  }
  
  const confidence = Math.min(0.95, 0.5 + Math.abs(bestGradient) / 200);
  return { pixel: bestPoint, confidence };
}

/**
 * Calculer le gradient de luminosité
 */
function calculateGradient(
  data: Uint8ClampedArray | Buffer,
  width: number,
  height: number,
  x: number,
  y: number,
  dirX: number,
  dirY: number
): number {
  const step = 2;
  const before = sampleLuminosity(data, width, height, x - dirX * step, y - dirY * step);
  const after = sampleLuminosity(data, width, height, x + dirX * step, y + dirY * step);
  return after - before;
}

/**
 * Échantillonner la luminosité avec interpolation bilinéaire
 */
function sampleLuminosity(
  data: Uint8ClampedArray | Buffer,
  width: number,
  height: number,
  x: number,
  y: number
): number {
  x = Math.max(0, Math.min(width - 1, x));
  y = Math.max(0, Math.min(height - 1, y));
  
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, width - 1);
  const y1 = Math.min(y0 + 1, height - 1);
  const dx = x - x0;
  const dy = y - y0;
  
  const getL = (px: number, py: number) => {
    const idx = (py * width + px) * 4;
    return (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
  };
  
  return getL(x0, y0) * (1 - dx) * (1 - dy) +
         getL(x1, y0) * dx * (1 - dy) +
         getL(x0, y1) * (1 - dx) * dy +
         getL(x1, y1) * dx * dy;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔲 DÉTECTION DE LA GRILLE 7×7 DU PATTERN ARUCO
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Détecter les 49 coins de la grille 7×7 du pattern central
 * Le pattern central fait markerSize/3 × markerSize/3 (dynamique)
 * Pour 16.8cm: de 5.6cm à 11.2cm
 * Pour 18cm: de 6cm à 12cm
 */
function detectPatternGridCorners(
  data: Uint8ClampedArray | Buffer,
  width: number,
  height: number,
  corners: Point2D[],
  markerWidthMm: number = 168,   // 🎯 Largeur du marqueur en mm
  markerHeightMm: number = 168   // 🎯 Hauteur du marqueur en mm
): UltraPrecisionPoint[] {
  const points: UltraPrecisionPoint[] = [];
  const [tl, tr, br, bl] = corners;
  
  // 🎯 RECTANGULAIRE: Utiliser largeur et hauteur séparées
  const markerWidthCm = markerWidthMm / 10;
  const markerHeightCm = markerHeightMm / 10;
  
  // Le pattern central est entre 2 bandes et 4 bandes (1/3 et 2/3)
  const patternStart = MARKER_SPECS.ratios.innerToOuter;   // 1/3
  const _patternEnd = MARKER_SPECS.ratios.whiteToOuter;     // 2/3 (non utilisé)
  
  // 🎯 RECTANGULAIRE: Taille de cellule DIFFÉRENTE pour X et Y
  const patternWidthCm = markerWidthCm / 3;    // Pour AprilTag 15cm → 5.0cm
  const patternHeightCm = markerHeightCm / 3;  // Pour AprilTag 23.7cm → 7.9cm
  const cellWidthCm = patternWidthCm / 6;      // Pour AprilTag → 0.833cm
  const cellHeightCm = patternHeightCm / 6;    // Pour AprilTag → 1.317cm
  const cellWidthRatio = cellWidthCm / markerWidthCm;
  const cellHeightRatio = cellHeightCm / markerHeightCm;
  
  // Position de départ du pattern en cm
  const patternStartX = markerWidthCm / 3;
  const patternStartY = markerHeightCm / 3;
  
  // Grille 7×7 de coins (6×6 cases)
  for (let row = 0; row <= 6; row++) {
    for (let col = 0; col <= 6; col++) {
      // 🎯 RECTANGULAIRE: Ratios X et Y indépendants
      const ratioX = patternStart + col * cellWidthRatio;
      const ratioY = patternStart + row * cellHeightRatio;
      
      // 🎯 RECTANGULAIRE: Position en cm puis conversion en MM
      const realX = patternStartX + col * cellWidthCm;
      const realY = patternStartY + row * cellHeightCm;
      
      // Interpolation bilinéaire pour trouver la position pixel
      const pixelPos = bilinearInterpolate(tl, tr, br, bl, ratioX, ratioY);
      
      // Raffiner avec détection de coin Harris
      const refined = harrisCornerRefine(data, width, height, pixelPos, 10);
      
      points.push({
        pixel: refined.point,
        real: { x: realX * 10, y: realY * 10 },  // CM → MM
        confidence: refined.confidence,
        type: 'grid-corner',
        subPixelRefined: true
      });
    }
  }
  
  return points;
}

/**
 * Détecter les 36 centres des cases du pattern
 */
function detectPatternCellCenters(
  data: Uint8ClampedArray | Buffer,
  width: number,
  height: number,
  corners: Point2D[],
  markerWidthMm: number = 168,   // 🎯 Largeur du marqueur en mm
  markerHeightMm: number = 168   // 🎯 Hauteur du marqueur en mm
): UltraPrecisionPoint[] {
  const points: UltraPrecisionPoint[] = [];
  const [tl, tr, br, bl] = corners;
  
  // 🎯 RECTANGULAIRE: Utiliser largeur et hauteur séparées
  const markerWidthCm = markerWidthMm / 10;
  const markerHeightCm = markerHeightMm / 10;
  
  // 🎯 RECTANGULAIRE: Calculs séparés pour X et Y
  const patternStartX = markerWidthCm / 3;      // Pour AprilTag 15cm → 5.0cm
  const patternStartY = markerHeightCm / 3;     // Pour AprilTag 23.7cm → 7.9cm
  const cellWidthCm = markerWidthCm / 18;       // Pour AprilTag → 0.833cm
  const cellHeightCm = markerHeightCm / 18;     // Pour AprilTag → 1.317cm
  const patternStartRatioX = 1/3;
  const patternStartRatioY = 1/3;
  const cellWidthRatio = cellWidthCm / markerWidthCm;
  const cellHeightRatio = cellHeightCm / markerHeightCm;
  
  // 6×6 centres de cases
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 6; col++) {
      // 🎯 RECTANGULAIRE: Centre de la case avec ratios X et Y indépendants
      const ratioX = patternStartRatioX + (col + 0.5) * cellWidthRatio;
      const ratioY = patternStartRatioY + (row + 0.5) * cellHeightRatio;
      
      // 🎯 RECTANGULAIRE: Position en cm puis conversion en MM
      const realX = patternStartX + (col + 0.5) * cellWidthCm;
      const realY = patternStartY + (row + 0.5) * cellHeightCm;
      
      const pixelPos = bilinearInterpolate(tl, tr, br, bl, ratioX, ratioY);
      
      // Pour les centres, on utilise l'analyse de couleur (noir ou blanc)
      const isBlack = isPixelBlack(data, width, height, pixelPos);
      const confidence = isBlack !== null ? 0.85 : 0.5;
      
      points.push({
        pixel: pixelPos,
        real: { x: realX * 10, y: realY * 10 },  // CM → MM
        confidence,
        type: 'grid-center',
        subPixelRefined: false
      });
    }
  }
  
  return points;
}

/**
 * Interpolation bilinéaire sur un quadrilatère
 */
function bilinearInterpolate(
  tl: Point2D,
  tr: Point2D,
  br: Point2D,
  bl: Point2D,
  u: number,
  v: number
): Point2D {
  // Interpolation sur le haut et le bas
  const topX = tl.x + (tr.x - tl.x) * u;
  const topY = tl.y + (tr.y - tl.y) * u;
  const botX = bl.x + (br.x - bl.x) * u;
  const botY = bl.y + (br.y - bl.y) * u;
  
  // Interpolation verticale
  return {
    x: topX + (botX - topX) * v,
    y: topY + (botY - topY) * v
  };
}

/**
 * Raffinement de coin par détecteur de Harris
 */
function harrisCornerRefine(
  data: Uint8ClampedArray | Buffer,
  width: number,
  height: number,
  center: Point2D,
  searchRadius: number
): { point: Point2D; confidence: number } {
  let bestX = center.x;
  let bestY = center.y;
  let bestHarris = 0;
  
  // Scanner autour du centre
  for (let dy = -searchRadius; dy <= searchRadius; dy += 0.5) {
    for (let dx = -searchRadius; dx <= searchRadius; dx += 0.5) {
      const x = center.x + dx;
      const y = center.y + dy;
      
      // Calculer la réponse de Harris simplifiée
      const harris = calculateHarrisResponse(data, width, height, x, y);
      
      if (harris > bestHarris) {
        bestHarris = harris;
        bestX = x;
        bestY = y;
      }
    }
  }
  
  const confidence = Math.min(0.95, bestHarris / 10000);
  return { point: { x: bestX, y: bestY }, confidence };
}

/**
 * Calculer la réponse de Harris (détection de coin)
 */
function calculateHarrisResponse(
  data: Uint8ClampedArray | Buffer,
  width: number,
  height: number,
  x: number,
  y: number
): number {
  // Gradients Sobel
  let _Ix = 0, _Iy = 0, IxIy = 0, Ix2 = 0, Iy2 = 0;
  
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const _L = sampleLuminosity(data, width, height, x + dx, y + dy);
      const Lx = sampleLuminosity(data, width, height, x + dx + 1, y + dy) -
                 sampleLuminosity(data, width, height, x + dx - 1, y + dy);
      const Ly = sampleLuminosity(data, width, height, x + dx, y + dy + 1) -
                 sampleLuminosity(data, width, height, x + dx, y + dy - 1);
      
      Ix2 += Lx * Lx;
      Iy2 += Ly * Ly;
      IxIy += Lx * Ly;
    }
  }
  
  // Réponse de Harris: det(M) - k * trace(M)²
  const k = 0.04;
  const det = Ix2 * Iy2 - IxIy * IxIy;
  const trace = Ix2 + Iy2;
  
  return det - k * trace * trace;
}

/**
 * Vérifier si un pixel est noir
 */
function isPixelBlack(
  data: Uint8ClampedArray | Buffer,
  width: number,
  height: number,
  point: Point2D
): boolean | null {
  const L = sampleLuminosity(data, width, height, point.x, point.y);
  
  if (L < 80) return true;   // Noir
  if (L > 170) return false; // Blanc
  return null;               // Incertain
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎲 RANSAC - Élimination robuste des outliers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * RANSAC pour calculer une homographie robuste
 */
function ransacHomography(
  points: UltraPrecisionPoint[],
  options: { iterations: number; threshold: number; minInliers: number }
): { inliers: UltraPrecisionPoint[]; homography: number[][] } {
  const { iterations, threshold, minInliers: _minInliers } = options;
  
  if (points.length < 4) {
    console.warn('⚠️ RANSAC: pas assez de points');
    return { inliers: points, homography: [[1,0,0],[0,1,0],[0,0,1]] };
  }
  
  let bestInliers: UltraPrecisionPoint[] = [];
  let bestH: number[][] = [[1,0,0],[0,1,0],[0,0,1]];
  
  for (let iter = 0; iter < iterations; iter++) {
    // Sélectionner 4 points aléatoires
    const sample = selectRandomSample(points, 4);
    
    // Calculer l'homographie
    const H = computeHomography(
      sample.map(p => p.pixel),
      sample.map(p => p.real)
    );
    
    // Compter les inliers
    const inliers: UltraPrecisionPoint[] = [];
    for (const p of points) {
      const projected = transformPoint(H, p.pixel);
      const error = Math.sqrt(
        (projected.x - p.real.x) ** 2 + 
        (projected.y - p.real.y) ** 2
      );
      
      if (error < threshold) {
        inliers.push({ ...p, error });
      }
    }
    
    if (inliers.length > bestInliers.length) {
      bestInliers = inliers;
      bestH = H;
    }
    
    // Early termination si on a assez d'inliers
    if (bestInliers.length > points.length * 0.9) break;
  }
  
  // Recalculer l'homographie avec tous les inliers
  if (bestInliers.length >= 4) {
    bestH = computeHomographyLeastSquares(
      bestInliers.map(p => p.pixel),
      bestInliers.map(p => p.real)
    );
  }
  
  return { inliers: bestInliers, homography: bestH };
}

/**
 * Sélectionner un échantillon aléatoire
 */
function selectRandomSample<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Calculer l'homographie par moindres carrés avec N points
 * Utilise la même méthode robuste que solveHomographyDLT
 */
function computeHomographyLeastSquares(
  srcPoints: Point2D[],
  dstPoints: Point2D[]
): number[][] {
  const n = srcPoints.length;
  if (n < 4) return [[1,0,0],[0,1,0],[0,0,1]];
  
  // Construire le système surdéterminé
  const A: number[][] = [];
  
  for (let i = 0; i < n; i++) {
    const [x, y] = [srcPoints[i].x, srcPoints[i].y];
    const [u, v] = [dstPoints[i].x, dstPoints[i].y];
    
    A.push([-x, -y, -1, 0, 0, 0, u * x, u * y, u]);
    A.push([0, 0, 0, -x, -y, -1, v * x, v * y, v]);
  }
  
  // Utiliser la même méthode robuste: fixer h[8] = 1 et résoudre
  const A_reduced: number[][] = [];
  const b: number[] = [];
  
  for (let i = 0; i < A.length; i++) {
    const row = [];
    for (let j = 0; j < 8; j++) {
      row.push(A[i][j]);
    }
    A_reduced.push(row);
    b.push(-A[i][8]);
  }
  
  // Résoudre par moindres carrés: (A^T A) h = A^T b
  const AtA_reduced: number[][] = Array(8).fill(null).map(() => Array(8).fill(0));
  const Atb: number[] = Array(8).fill(0);
  
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      let sum = 0;
      for (let k = 0; k < A_reduced.length; k++) {
        sum += A_reduced[k][i] * A_reduced[k][j];
      }
      AtA_reduced[i][j] = sum;
    }
    let sum = 0;
    for (let k = 0; k < A_reduced.length; k++) {
      sum += A_reduced[k][i] * b[k];
    }
    Atb[i] = sum;
  }
  
  // Résoudre par Gauss
  const h_reduced = gaussElimination(AtA_reduced, Atb);
  const h = [...h_reduced, 1];
  
  return [
    [h[0], h[1], h[2]],
    [h[3], h[4], h[5]],
    [h[6], h[7], h[8]]
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📐 LEVENBERG-MARQUARDT - Optimisation non-linéaire
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Raffinement Levenberg-Marquardt de l'homographie
 */
function levenbergMarquardtRefine(
  points: UltraPrecisionPoint[],
  initialH: number[][]
): { optimizedH: number[][]; finalError: number } {
  if (points.length < 4) {
    return { optimizedH: initialH, finalError: 1.0 };
  }
  
  // Convertir H en vecteur de paramètres (8 degrés de liberté, h33 = 1)
  let params = [
    initialH[0][0], initialH[0][1], initialH[0][2],
    initialH[1][0], initialH[1][1], initialH[1][2],
    initialH[2][0], initialH[2][1]
  ];
  
  let lambda = 0.001;
  const maxIterations = 50;
  const tolerance = 1e-8;
  
  let prevError = calculateTotalError(points, paramsToH(params));
  
  for (let iter = 0; iter < maxIterations; iter++) {
    // Calculer le Jacobien et le résidu
    const { J, residuals } = computeJacobianAndResiduals(points, params);
    
    // Calculer J^T J et J^T r
    const JtJ = multiplyJtJ(J);
    const Jtr = multiplyJtr(J, residuals);
    
    // Ajouter le terme de régularisation (Levenberg-Marquardt)
    for (let i = 0; i < 8; i++) {
      JtJ[i][i] *= (1 + lambda);
    }
    
    // Résoudre le système
    const delta = solveLinearSystem8x8(JtJ, Jtr);
    if (!delta) break;
    
    // Mettre à jour les paramètres
    const newParams = params.map((p, i) => p - delta[i]);
    const newError = calculateTotalError(points, paramsToH(newParams));
    
    if (newError < prevError) {
      params = newParams;
      lambda /= 10;
      
      if (Math.abs(prevError - newError) < tolerance) break;
      prevError = newError;
    } else {
      lambda *= 10;
      if (lambda > 1e10) break;
    }
  }
  
  return {
    optimizedH: paramsToH(params),
    finalError: prevError
  };
}

/**
 * Convertir le vecteur de paramètres en matrice H
 */
function paramsToH(params: number[]): number[][] {
  return [
    [params[0], params[1], params[2]],
    [params[3], params[4], params[5]],
    [params[6], params[7], 1]
  ];
}

/**
 * Calculer l'erreur totale de reprojection
 */
function calculateTotalError(points: UltraPrecisionPoint[], H: number[][]): number {
  let total = 0;
  for (const p of points) {
    const projected = transformPoint(H, p.pixel);
    total += (projected.x - p.real.x) ** 2 + (projected.y - p.real.y) ** 2;
  }
  return Math.sqrt(total / points.length);
}

/**
 * Calculer le Jacobien et les résidus pour LM
 */
function computeJacobianAndResiduals(
  points: UltraPrecisionPoint[],
  params: number[]
): { J: number[][]; residuals: number[] } {
  const J: number[][] = [];
  const residuals: number[] = [];
  const _H = paramsToH(params); // Matrice H non utilisée directement
  
  for (const p of points) {
    const { x, y } = p.pixel;
    const w = params[6] * x + params[7] * y + 1;
    const _w2 = w * w; // Non utilisé directement
    
    // Projection
    const px = (params[0] * x + params[1] * y + params[2]) / w;
    const py = (params[3] * x + params[4] * y + params[5]) / w;
    
    // Résidus
    residuals.push(px - p.real.x);
    residuals.push(py - p.real.y);
    
    // Jacobien pour x projeté
    J.push([
      x/w, y/w, 1/w, 0, 0, 0, -px*x/w, -px*y/w
    ]);
    
    // Jacobien pour y projeté
    J.push([
      0, 0, 0, x/w, y/w, 1/w, -py*x/w, -py*y/w
    ]);
  }
  
  return { J, residuals };
}

/**
 * Multiplier J^T * J
 */
function multiplyJtJ(J: number[][]): number[][] {
  const m = J.length;
  const n = 8;
  const result: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let sum = 0;
      for (let k = 0; k < m; k++) {
        sum += J[k][i] * J[k][j];
      }
      result[i][j] = sum;
    }
  }
  
  return result;
}

/**
 * Multiplier J^T * r
 */
function multiplyJtr(J: number[][], r: number[]): number[] {
  const m = J.length;
  const n = 8;
  const result = Array(n).fill(0);
  
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < m; k++) {
      result[i] += J[k][i] * r[k];
    }
  }
  
  return result;
}

/**
 * Résoudre un système 8×8
 */
function solveLinearSystem8x8(A: number[][], b: number[]): number[] | null {
  const n = 8;
  const aug = A.map((row, i) => [...row, b[i]]);
  
  // Élimination de Gauss avec pivot partiel
  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) {
        maxRow = row;
      }
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    
    if (Math.abs(aug[col][col]) < 1e-12) continue;
    
    for (let row = col + 1; row < n; row++) {
      const factor = aug[row][col] / aug[col][col];
      for (let j = col; j <= n; j++) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }
  
  // Substitution arrière
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = aug[i][n];
    for (let j = i + 1; j < n; j++) {
      sum -= aug[i][j] * x[j];
    }
    x[i] = Math.abs(aug[i][i]) > 1e-12 ? sum / aug[i][i] : 0;
  }
  
  return x;
}

// ============================================================================
// 🔬 ANALYSE DES BANDES INTERNES DU MARQUEUR ARUCO
// ============================================================================

/**
 * 🏎️ Interface simplifiée pour l'analyse du marqueur ArUco
 * Formule 1: Seules les infos essentielles sont conservées
 */
export interface ArucoMarkerAnalysis {
  markerId: number;
  markerSizeCm: number;
  markerSizePx: number;
  
  pose: {
    rotX: number;
    rotY: number;
    rotZ: number;
  };
  
  depth: {
    estimatedCm: number;
    estimatedM: number;
    confidence: number;
    method: 'focal' | 'size';
  };
  
  quality: {
    overall: number;
    homographyQuality: number;
    poseQuality: number;
    detectionQuality: number;
    rating: 'excellent' | 'good' | 'acceptable' | 'poor';
  };
  
  corners: Point2D[];
  extendedPoints?: ExtendedReferencePoints;
}

/**
 * 🔬 Analyser complètement un marqueur ArUco détecté
 * Retourne toutes les infos: pose, profondeur, qualité, analyse des bandes
 * 
 * @param marker - Résultat de détection du marqueur
 * @param imageWidth - Largeur de l'image en pixels
 * @param imageHeight - Hauteur de l'image en pixels
 * @param focalLengthPx - Longueur focale estimée en pixels (default: 800)
 */
export function analyzeMarkerComplete(
  marker: MarkerDetectionResult,
  _imageWidth: number,
  _imageHeight: number,
  focalLengthPx: number = 800
): ArucoMarkerAnalysis {
  const markerSizeCm = getMarkerSize();
  const corners = marker.magentaPositions?.length === 4 ? marker.magentaPositions : marker.corners;
  
  // Calculer la taille en pixels (moyenne des côtés)
  const side1 = Math.sqrt((corners[1].x - corners[0].x) ** 2 + (corners[1].y - corners[0].y) ** 2);
  const side2 = Math.sqrt((corners[2].x - corners[1].x) ** 2 + (corners[2].y - corners[1].y) ** 2);
  const side3 = Math.sqrt((corners[3].x - corners[2].x) ** 2 + (corners[3].y - corners[2].y) ** 2);
  const side4 = Math.sqrt((corners[0].x - corners[3].x) ** 2 + (corners[0].y - corners[3].y) ** 2);
  const avgSizePx = (side1 + side2 + side3 + side4) / 4;
  
  const pose = estimatePoseFromCorners(corners);
  const depthCm = (markerSizeCm * focalLengthPx) / avgSizePx;
  const depthConfidence = avgSizePx > 50 ? Math.min(0.95, avgSizePx / 200) : 0.5;
  
  const poseQuality = calculatePoseQuality(pose);
  const homographyQuality = (marker.homographyQuality || marker.score) * 100;
  const detectionQuality = (marker.magentaFound / 4) * 100;
  const overallQuality = (poseQuality + homographyQuality + detectionQuality) / 3;
  
  const qualityRating = overallQuality >= 85 ? 'excellent' :
                        overallQuality >= 70 ? 'good' :
                        overallQuality >= 50 ? 'acceptable' : 'poor';
  
  return {
    markerId: marker.id,
    markerSizeCm,
    markerSizePx: avgSizePx,
    pose,
    depth: {
      estimatedCm: Math.round(depthCm),
      estimatedM: parseFloat((depthCm / 100).toFixed(2)),
      confidence: depthConfidence,
      method: 'focal'
    },
    quality: {
      overall: Math.round(overallQuality),
      homographyQuality: Math.round(homographyQuality),
      poseQuality: Math.round(poseQuality),
      detectionQuality: Math.round(detectionQuality),
      rating: qualityRating
    },
    corners,
    extendedPoints: marker.extendedPoints
  };
}

/**
 * Estimer la pose (orientation) depuis les 4 coins
 */
function estimatePoseFromCorners(corners: Point2D[]): { rotX: number; rotY: number; rotZ: number } {
  const [tl, tr, br, bl] = corners;
  
  // Rotation X (basculement avant/arrière): ratio hauteur top/bottom
  const topWidth = Math.sqrt((tr.x - tl.x) ** 2 + (tr.y - tl.y) ** 2);
  const bottomWidth = Math.sqrt((br.x - bl.x) ** 2 + (br.y - bl.y) ** 2);
  const ratioX = topWidth / (bottomWidth || 1);
  const rotX = Math.round(Math.atan2(ratioX - 1, 0.5) * 180 / Math.PI);
  
  // Rotation Y (basculement gauche/droite): ratio hauteur left/right
  const leftHeight = Math.sqrt((bl.x - tl.x) ** 2 + (bl.y - tl.y) ** 2);
  const rightHeight = Math.sqrt((br.x - tr.x) ** 2 + (br.y - tr.y) ** 2);
  const ratioY = leftHeight / (rightHeight || 1);
  const rotY = Math.round(Math.atan2(ratioY - 1, 0.5) * 180 / Math.PI);
  
  // Rotation Z (inclinaison): angle du bord supérieur
  const rotZ = Math.round(Math.atan2(tr.y - tl.y, tr.x - tl.x) * 180 / Math.PI);
  
  return { rotX, rotY, rotZ };
}

/**
 * Calculer la qualité de la pose (angles proches de 0 = meilleur)
 */
function calculatePoseQuality(pose: { rotX: number; rotY: number; rotZ: number }): number {
  const _maxAcceptableAngle = 45; // Référence documentaire
  const penaltyX = Math.min(100, Math.abs(pose.rotX) * 2);
  const penaltyY = Math.min(100, Math.abs(pose.rotY) * 2);
  const penaltyZ = Math.min(50, Math.abs(pose.rotZ));
  
  return Math.max(0, 100 - penaltyX - penaltyY - penaltyZ);
}

// ============================================================================
// 🏎️ FORMULE 1 - MESURES DIRECTES VIA HOMOGRAPHIE
// ============================================================================

/**
 * 🏎️ Résultat de correction (toujours ×1.0 - FORMULE 1)
 * L'homographie via 105 points RANSAC est la seule source de vérité.
 */
export interface OptimalCorrectionResult {
  finalCorrection: number;  // Toujours 1.0
  correctionX: number;      // Toujours 1.0
  correctionY: number;      // Toujours 1.0
  globalConfidence: number; // Qualité de l'homographie
}

/**
 * 🏎️ FORMULE 1: Retourne TOUJOURS ×1.0
 * L'homographie (105 points + RANSAC + Levenberg-Marquardt) EST la vérité terrain.
 * Aucune correction supplémentaire n'est nécessaire ni souhaitable.
 */
export function calculateOptimalCorrection(
  _analysis: ArucoMarkerAnalysis,
  ultraPrecisionResult?: { quality: number }
): OptimalCorrectionResult {
  const quality = ultraPrecisionResult?.quality || 0.5;
  console.log(`🏎️ [FORMULE 1] Homographie pure ×1.0 (qualité ${(quality * 100).toFixed(0)}%)`);
  
  return {
    finalCorrection: 1.0,
    correctionX: 1.0,
    correctionY: 1.0,
    globalConfidence: quality
  };
}

/**
 * �️ FORMULE 1: Mesurer une distance DIRECTEMENT via homographie
 * 
 * La correction est ignorée car l'homographie EST la vérité terrain.
 * Paramètre conservé pour rétrocompatibilité.
 */
export function measureDistanceCmCorrected(
  H: number[][],
  p1Px: Point2D,
  p2Px: Point2D,
  _correction: number | OptimalCorrectionResult = 1.0
): number {
  const p1Cm = transformPoint(H, p1Px);
  const p2Cm = transformPoint(H, p2Px);
  
  // 🏎️ Distance DIRECTE sans correction - l'homographie est précise !
  return Math.sqrt((p2Cm.x - p1Cm.x) ** 2 + (p2Cm.y - p1Cm.y) ** 2);
}

export default MarkerDetector;
