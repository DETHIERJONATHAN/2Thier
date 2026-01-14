/**
 * 🎯 HOMOGRAPHY UTILS - Correction de perspective mathématique
 * 
 * Transforme les coordonnées d'une photo prise en biais vers
 * des coordonnées réelles corrigées.
 * 
 * PRINCIPE:
 * - On détecte 4 coins d'un A4 sur la photo (forme trapézoïdale)
 * - On sait que ces 4 coins forment un rectangle 210×297mm en réalité
 * - On calcule la matrice H qui transforme trapèze → rectangle
 * - On applique H à tous les points mesurés pour avoir les vraies distances
 */

export type Point2D = [number, number];
export type Matrix3x3 = number[][];

export interface HomographyCorners {
  topLeft: { x: number; y: number };
  topRight: { x: number; y: number };
  bottomLeft: { x: number; y: number };
  bottomRight: { x: number; y: number };
}

export interface HomographyResult {
  matrix: Matrix3x3;
  inverseMatrix: Matrix3x3;
  quality: number; // 0-100, basé sur la régularité du quadrilatère
  uncertainty: number; // Incertitude estimée en %
}

/**
 * 📐 Calcule la matrice d'homographie 3×3
 * 
 * Transforme 4 points source (photo) vers 4 points destination (réalité)
 * Utilise la méthode DLT (Direct Linear Transform)
 * 
 * @param srcPoints - 4 coins détectés sur la photo [topLeft, topRight, bottomRight, bottomLeft]
 * @param dstPoints - 4 coins du rectangle réel (ex: A4 = [[0,0], [210,0], [210,297], [0,297]])
 */
export function computeHomography(
  srcPoints: Point2D[],
  dstPoints: Point2D[]
): HomographyResult {
  if (srcPoints.length !== 4 || dstPoints.length !== 4) {
    throw new Error('Homography requires exactly 4 points');
  }

  // 🔧 NORMALISATION CRITIQUE: Les points doivent avoir des échelles similaires
  // pour éviter les problèmes de conditionnement numérique (matrice singulière)
  
  // Calcul du centroïde et de l'échelle pour les points source
  const srcCentroid = computeCentroid(srcPoints);
  const srcScale = computeAverageDistanceFromCentroid(srcPoints, srcCentroid);
  
  // Calcul du centroïde et de l'échelle pour les points destination
  const dstCentroid = computeCentroid(dstPoints);
  const dstScale = computeAverageDistanceFromCentroid(dstPoints, dstCentroid);
  
  // Normalisation: centrer sur l'origine et mettre à l'échelle sqrt(2)
  const normalizedSrc = normalizePoints(srcPoints, srcCentroid, srcScale);
  const normalizedDst = normalizePoints(dstPoints, dstCentroid, dstScale);
  
  console.log('🔧 [Homography] Normalisation:', {
    srcCentroid: `(${srcCentroid[0].toFixed(1)}, ${srcCentroid[1].toFixed(1)})`,
    srcScale: srcScale.toFixed(2),
    dstCentroid: `(${dstCentroid[0].toFixed(1)}, ${dstCentroid[1].toFixed(1)})`,
    dstScale: dstScale.toFixed(2)
  });

  // Construction de la matrice A pour le système Ax = 0 avec points NORMALISÉS
  // Chaque paire de points donne 2 équations
  const A: number[][] = [];
  
  for (let i = 0; i < 4; i++) {
    const [x, y] = normalizedSrc[i];
    const [xp, yp] = normalizedDst[i];
    
    // Équation 1: -x*h7*xp - y*h8*xp + x*h1 + y*h2 + h3 - xp = 0
    A.push([-x, -y, -1, 0, 0, 0, x * xp, y * xp, xp]);
    // Équation 2: -x*h7*yp - y*h8*yp + x*h4 + y*h5 + h6 - yp = 0  
    A.push([0, 0, 0, -x, -y, -1, x * yp, y * yp, yp]);
  }

  // Résolution par SVD simplifiée (méthode de Gauss-Jordan pour ce cas 8x9)
  const Hnorm = solveHomographySystem(A);
  
  // 🔧 DÉNORMALISATION: H = T_dst^(-1) * Hnorm * T_src
  // Où T est la matrice de normalisation
  const H = denormalizeHomography(Hnorm, srcCentroid, srcScale, dstCentroid, dstScale);
  
  // Calculer la matrice inverse pour la transformation inverse
  const Hinv = invertMatrix3x3(H);
  
  // Évaluer la qualité de l'homographie
  const quality = evaluateHomographyQuality(srcPoints, dstPoints, H);
  
  // Estimer l'incertitude basée sur la qualité
  const uncertainty = estimateUncertainty(quality, srcPoints);

  console.log(`📐 [Homography] Matrice calculée, qualité: ${quality.toFixed(1)}%, incertitude: ±${uncertainty.toFixed(1)}%`);

  return {
    matrix: H,
    inverseMatrix: Hinv,
    quality,
    uncertainty
  };
}

/**
 * 🔄 Applique la transformation homographique à un point
 */
export function applyHomography(H: Matrix3x3, point: Point2D): Point2D {
  const [x, y] = point;
  
  // Coordonnées homogènes: [x', y', w'] = H × [x, y, 1]
  const xp = H[0][0] * x + H[0][1] * y + H[0][2];
  const yp = H[1][0] * x + H[1][1] * y + H[1][2];
  const w = H[2][0] * x + H[2][1] * y + H[2][2];
  
  // Normalisation
  return [xp / w, yp / w];
}

/**
 * 📏 Calcule la distance RÉELLE entre 2 points en appliquant l'homographie
 * 
 * @param H - Matrice d'homographie
 * @param p1 - Point 1 sur la photo (pixels)
 * @param p2 - Point 2 sur la photo (pixels)
 * @returns Distance en mm dans le monde réel
 */
export function computeRealDistance(
  H: Matrix3x3,
  p1: Point2D,
  p2: Point2D
): number {
  const realP1 = applyHomography(H, p1);
  const realP2 = applyHomography(H, p2);
  
  const dx = realP2[0] - realP1[0];
  const dy = realP2[1] - realP1[1];
  
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 📏 Calcule distance + incertitude
 */
export function computeRealDistanceWithUncertainty(
  H: Matrix3x3,
  p1: Point2D,
  p2: Point2D,
  uncertaintyPercent: number
): { distance: number; uncertainty: number; min: number; max: number } {
  const distance = computeRealDistance(H, p1, p2);
  const uncertainty = distance * (uncertaintyPercent / 100);
  
  return {
    distance,
    uncertainty,
    min: distance - uncertainty,
    max: distance + uncertainty
  };
}

/**
 * 🔧 Crée les points destination pour un A4
 * @param orientation - 'portrait' (210×297) ou 'paysage' (297×210)
 */
export function createA4DestinationPoints(orientation: 'portrait' | 'paysage'): Point2D[] {
  if (orientation === 'portrait') {
    // A4 portrait: 210mm × 297mm
    return [
      [0, 0],       // topLeft
      [210, 0],     // topRight
      [210, 297],   // bottomRight
      [0, 297]      // bottomLeft
    ];
  } else {
    // A4 paysage: 297mm × 210mm
    return [
      [0, 0],       // topLeft
      [297, 0],     // topRight
      [297, 210],   // bottomRight
      [0, 210]      // bottomLeft
    ];
  }
}

/**
 * 🎯 Variable pour stocker la taille du marqueur Métré A4 V1.2 (synchronisée avec marker-detector)
 * Valeur par défaut: 13.0cm = 130mm (largeur AprilTag)
 */
let _arucoMarkerSizeMm = 130; // 13.0cm par défaut (Métré A4 V1.2)

/**
 * 🎯 Dimensions AprilTag Métré V1.2 (distance entre centres de tags sur feuille A4)
 * IMPORTANT: on utilise les CENTRES des 4 AprilTags comme points de calibration.
 * Les distances de référence entre centres sont donc (V1.2):
 * Largeur: 13.0cm = 130mm
 * Hauteur: 21.7cm = 217mm
 */
const APRILTAG_METRE_WIDTH_MM = 130;
const APRILTAG_METRE_HEIGHT_MM = 217;

/**
 * Met à jour la taille du marqueur Métré A4 V1.2 pour l'homographie
 * @param sizeCm - Taille en cm
 */
export function setArucoMarkerSize(sizeCm: number): void {
  _arucoMarkerSizeMm = sizeCm * 10; // Convert cm to mm
  console.log(`🎯 [HOMOGRAPHY] Taille marqueur Métré A4 V1.2 mise à jour: ${sizeCm}cm = ${_arucoMarkerSizeMm}mm`);
}

/**
 * Retourne la taille actuelle du marqueur Métré A4 V1.2 en mm
 */
export function getArucoMarkerSizeMm(): number {
  return _arucoMarkerSizeMm;
}

/**
 * 🎯 Crée les points destination pour un marqueur Métré A4 V1.2 (rectangle)
 * 
 * Utilise la taille configurée (13cm largeur × 21.7cm hauteur)
 * Par défaut: 13.0cm = 130mm (largeur AprilTag)
 */
export function createArucoDestinationPoints(): Point2D[] {
  const markerSizeMm = _arucoMarkerSizeMm;
  return [
    [0, 0],                     // topLeft
    [markerSizeMm, 0],          // topRight
    [markerSizeMm, markerSizeMm], // bottomRight
    [0, markerSizeMm]           // bottomLeft
  ];
}

/**
 * 🎯 Crée les points destination pour AprilTag Métré V1.2 (rectangle)
 * 
 * Dimensions fixes: 13.0cm × 21.7cm (distance entre centres de tags)
 * Coordonnées en mm pour l'homographie
 */
export function createAprilTagMetreDestinationPoints(): Point2D[] {
  return [
    [0, 0],                                      // topLeft
    [APRILTAG_METRE_WIDTH_MM, 0],               // topRight (130mm)
    [APRILTAG_METRE_WIDTH_MM, APRILTAG_METRE_HEIGHT_MM], // bottomRight (130×217mm)
    [0, APRILTAG_METRE_HEIGHT_MM]               // bottomLeft (217mm)
  ];
}

/**
 * 🔧 Crée les points destination selon le type de référence
 * @param refType - 'aruco', 'apriltag-metre' ou 'a4'
 * @param orientation - utilisé seulement pour A4: 'portrait' ou 'paysage'
 */
export function createReferenceDestinationPoints(
  refType: 'metre_a4' | 'apriltag-metre' | 'a4', 
  orientation: 'portrait' | 'paysage' = 'portrait'
): Point2D[] {
  if (refType === 'metre_a4') {
    // 🎯 CRITICAL: Métré A4 V1.2 = AprilTag rectangulaire 130×217mm (13×21.7cm)
    return createAprilTagMetreDestinationPoints();
  }
  if (refType === 'apriltag-metre') {
    return createAprilTagMetreDestinationPoints();
  }
  return createA4DestinationPoints(orientation);
}

/**
 * 🔍 Convertit les corners en tableau de points
 */
export function cornersToPoints(corners: HomographyCorners): Point2D[] {
  return [
    [corners.topLeft.x, corners.topLeft.y],
    [corners.topRight.x, corners.topRight.y],
    [corners.bottomRight.x, corners.bottomRight.y],
    [corners.bottomLeft.x, corners.bottomLeft.y]
  ];
}

// ============================================================================
// FONCTIONS INTERNES (Algèbre linéaire)
// ============================================================================

/**
 * Résout le système homogène Ah = 0 pour trouver h (vecteur 9×1)
 * puis reshape en matrice 3×3
 * 
 * 🔧 NOUVELLE IMPLÉMENTATION: Utilise la méthode de puissance inverse avec 
 * shift pour trouver le vecteur propre associé à la PLUS PETITE valeur propre
 */
function solveHomographySystem(A: number[][]): Matrix3x3 {
  // Calculer A^T × A (matrice 9×9 symétrique positive)
  const ATA = multiplyMatrices(transpose(A), A);
  
  // Ajouter une petite régularisation pour stabilité numérique
  const EPSILON = 1e-8;
  for (let i = 0; i < 9; i++) {
    ATA[i][i] += EPSILON;
  }
  
  // 🔧 MÉTHODE DE PUISSANCE INVERSE pour trouver le vecteur propre
  // associé à la plus petite valeur propre de A^T A
  // Cela correspond au vecteur singulier droit avec la plus petite valeur singulière de A
  
  let h = [1, 1, 1, 1, 1, 1, 1, 1, 1]; // Initial random guess
  
  // Normaliser
  let norm = Math.sqrt(h.reduce((s, v) => s + v * v, 0));
  h = h.map(v => v / norm);
  
  // Itérations de puissance inverse: résoudre (A^T A) x = h, puis normaliser
  for (let iter = 0; iter < 50; iter++) {
    // Résoudre le système linéaire (A^T A) x = h
    const x = solveLinearSystem(
      ATA.map(row => [...row]), // Copie pour ne pas modifier
      [...h]
    );
    
    // Vérifier si la solution est valide
    const xNorm = Math.sqrt(x.reduce((s, v) => s + v * v, 0));
    if (xNorm < EPSILON || !isFinite(xNorm)) {
      console.warn('⚠️ [Homography] Itération divergente, arrêt');
      break;
    }
    
    // Normaliser
    h = x.map(v => v / xNorm);
  }
  
  // Normaliser pour que h[8] = 1 (convention standard)
  const scale = Math.abs(h[8]) > EPSILON ? h[8] : 1;
  const normalized = h.map(v => v / scale);
  
  // Vérifier que la solution est raisonnable
  const hasNaN = normalized.some(v => !isFinite(v));
  if (hasNaN) {
    console.warn('⚠️ [Homography] Solution invalide (NaN), retour identité');
    return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  }
  
  // Reshape en matrice 3×3
  return [
    [normalized[0], normalized[1], normalized[2]],
    [normalized[3], normalized[4], normalized[5]],
    [normalized[6], normalized[7], normalized[8]]
  ];
}

/**
 * Inverse une matrice 3×3
 */
function invertMatrix3x3(M: Matrix3x3): Matrix3x3 {
  const [[a, b, c], [d, e, f], [g, h, i]] = M;
  
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  
  if (Math.abs(det) < 1e-10) {
    console.warn('⚠️ [Homography] Matrice singulière, retour identité');
    return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  }
  
  const invDet = 1 / det;
  
  return [
    [(e * i - f * h) * invDet, (c * h - b * i) * invDet, (b * f - c * e) * invDet],
    [(f * g - d * i) * invDet, (a * i - c * g) * invDet, (c * d - a * f) * invDet],
    [(d * h - e * g) * invDet, (b * g - a * h) * invDet, (a * e - b * d) * invDet]
  ];
}

/**
 * Évalue la qualité de l'homographie (0-100)
 */
function evaluateHomographyQuality(
  srcPoints: Point2D[],
  dstPoints: Point2D[],
  H: Matrix3x3
): number {
  // Calculer l'erreur de reprojection
  let totalError = 0;
  
  for (let i = 0; i < 4; i++) {
    const projected = applyHomography(H, srcPoints[i]);
    const dx = projected[0] - dstPoints[i][0];
    const dy = projected[1] - dstPoints[i][1];
    totalError += Math.sqrt(dx * dx + dy * dy);
  }
  
  const avgError = totalError / 4;
  
  // Convertir en score 0-100 (erreur < 1mm = 100%, erreur > 20mm = 0%)
  const quality = Math.max(0, Math.min(100, 100 - avgError * 5));
  
  return quality;
}

/**
 * Estime l'incertitude basée sur la qualité et la géométrie
 */
function estimateUncertainty(quality: number, srcPoints: Point2D[]): number {
  // Base: qualité inverse
  let baseUncertainty = (100 - quality) / 10; // 0-10%
  
  // Facteur supplémentaire: si le quadrilatère est très déformé
  const [tl, tr, br, bl] = srcPoints;
  
  // Calculer les longueurs des côtés
  const topWidth = Math.sqrt((tr[0] - tl[0]) ** 2 + (tr[1] - tl[1]) ** 2);
  const bottomWidth = Math.sqrt((br[0] - bl[0]) ** 2 + (br[1] - bl[1]) ** 2);
  const leftHeight = Math.sqrt((bl[0] - tl[0]) ** 2 + (bl[1] - tl[1]) ** 2);
  const rightHeight = Math.sqrt((br[0] - tr[0]) ** 2 + (br[1] - tr[1]) ** 2);
  
  // Ratio de déformation
  const widthRatio = Math.max(topWidth, bottomWidth) / Math.min(topWidth, bottomWidth);
  const heightRatio = Math.max(leftHeight, rightHeight) / Math.min(leftHeight, rightHeight);
  
  // Si très déformé (ratio > 1.5), augmenter l'incertitude
  if (widthRatio > 1.5 || heightRatio > 1.5) {
    baseUncertainty += (Math.max(widthRatio, heightRatio) - 1) * 3;
  }
  
  return Math.min(25, baseUncertainty); // Cap à 25%
}

// ============================================================================
// UTILITAIRES ALGÈBRE LINÉAIRE
// ============================================================================

function transpose(M: number[][]): number[][] {
  const rows = M.length;
  const cols = M[0].length;
  const result: number[][] = [];
  
  for (let j = 0; j < cols; j++) {
    result[j] = [];
    for (let i = 0; i < rows; i++) {
      result[j][i] = M[i][j];
    }
  }
  
  return result;
}

function multiplyMatrices(A: number[][], B: number[][]): number[][] {
  const rowsA = A.length;
  const colsA = A[0].length;
  const colsB = B[0].length;
  const result: number[][] = [];
  
  for (let i = 0; i < rowsA; i++) {
    result[i] = [];
    for (let j = 0; j < colsB; j++) {
      let sum = 0;
      for (let k = 0; k < colsA; k++) {
        sum += A[i][k] * B[k][j];
      }
      result[i][j] = sum;
    }
  }
  
  return result;
}

function multiplyMatrixVector(M: number[][], v: number[]): number[] {
  return M.map(row => row.reduce((sum, val, i) => sum + val * v[i], 0));
}

/**
 * Résout Ax = b par élimination de Gauss avec pivot partiel
 */
function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = A.length;
  
  // Copie augmentée [A | b]
  const aug: number[][] = A.map((row, i) => [...row, b[i]]);
  
  // Élimination de Gauss avec pivot partiel
  for (let col = 0; col < n; col++) {
    // Trouver le pivot max
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) {
        maxRow = row;
      }
    }
    
    // Échanger les lignes
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    
    // Élimination
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[col][col]) < 1e-10) continue;
      const factor = aug[row][col] / aug[col][col];
      for (let j = col; j <= n; j++) {
        aug[row][j] -= factor * aug[col][j];
      }
    }
  }
  
  // Substitution arrière
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = aug[i][n];
    for (let j = i + 1; j < n; j++) {
      sum -= aug[i][j] * x[j];
    }
    x[i] = Math.abs(aug[i][i]) > 1e-10 ? sum / aug[i][i] : 0;
  }
  
  return x;
}

// ============================================================================
// DEBUG & VISUALISATION
// ============================================================================

/**
 * 🐛 Génère une grille de debug pour visualiser la transformation
 */
export function generateDebugGrid(
  H: Matrix3x3,
  srcWidth: number,
  srcHeight: number,
  gridSize: number = 10
): { src: Point2D; dst: Point2D }[] {
  const points: { src: Point2D; dst: Point2D }[] = [];
  
  for (let i = 0; i <= gridSize; i++) {
    for (let j = 0; j <= gridSize; j++) {
      const src: Point2D = [
        (i / gridSize) * srcWidth,
        (j / gridSize) * srcHeight
      ];
      const dst = applyHomography(H, src);
      points.push({ src, dst });
    }
  }
  
  return points;
}

/**
 * 📊 Formatte l'incertitude pour affichage
 */
export function formatMeasurementWithUncertainty(
  distanceMM: number,
  uncertaintyPercent: number,
  unit: 'mm' | 'cm' | 'm' = 'cm'
): string {
  let value: number;
  let uncertainty: number;
  
  switch (unit) {
    case 'mm':
      value = distanceMM;
      uncertainty = distanceMM * uncertaintyPercent / 100;
      break;
    case 'cm':
      value = distanceMM / 10;
      uncertainty = (distanceMM * uncertaintyPercent / 100) / 10;
      break;
    case 'm':
      value = distanceMM / 1000;
      uncertainty = (distanceMM * uncertaintyPercent / 100) / 1000;
      break;
  }
  
  // Arrondir intelligemment
  const decimals = uncertainty < 1 ? 1 : 0;
  
  return `${value.toFixed(decimals)} ± ${uncertainty.toFixed(decimals)} ${unit}`;
}

// ============================================================================
// FONCTIONS DE NORMALISATION (pour conditionnement numérique)
// ============================================================================

/**
 * 📐 Calcule le centroïde (barycentre) d'un ensemble de points
 */
function computeCentroid(points: Point2D[]): Point2D {
  const n = points.length;
  let sumX = 0, sumY = 0;
  for (const [x, y] of points) {
    sumX += x;
    sumY += y;
  }
  return [sumX / n, sumY / n];
}

/**
 * 📏 Calcule la distance moyenne des points au centroïde
 */
function computeAverageDistanceFromCentroid(points: Point2D[], centroid: Point2D): number {
  let totalDist = 0;
  for (const [x, y] of points) {
    totalDist += Math.sqrt((x - centroid[0]) ** 2 + (y - centroid[1]) ** 2);
  }
  return totalDist / points.length;
}

/**
 * 🔄 Normalise les points: centrer sur origine et échelle sqrt(2)
 * Cette normalisation améliore le conditionnement numérique de la matrice
 */
function normalizePoints(points: Point2D[], centroid: Point2D, scale: number): Point2D[] {
  // Facteur d'échelle pour avoir distance moyenne = sqrt(2)
  const scaleFactor = Math.SQRT2 / (scale || 1);
  
  return points.map(([x, y]) => [
    (x - centroid[0]) * scaleFactor,
    (y - centroid[1]) * scaleFactor
  ]);
}

/**
 * 🔧 Dénormalise la matrice d'homographie après calcul sur points normalisés
 * H_final = T_dst^(-1) * H_norm * T_src
 * Où T_src transforme src vers normalisé et T_dst transforme dst vers normalisé
 */
function denormalizeHomography(
  Hnorm: Matrix3x3,
  srcCentroid: Point2D,
  srcScale: number,
  dstCentroid: Point2D,
  dstScale: number
): Matrix3x3 {
  const srcScaleFactor = Math.SQRT2 / (srcScale || 1);
  const dstScaleFactor = Math.SQRT2 / (dstScale || 1);
  
  // T_src: translation puis échelle
  // T_src = [[s, 0, -cx*s], [0, s, -cy*s], [0, 0, 1]]
  const Tsrc: Matrix3x3 = [
    [srcScaleFactor, 0, -srcCentroid[0] * srcScaleFactor],
    [0, srcScaleFactor, -srcCentroid[1] * srcScaleFactor],
    [0, 0, 1]
  ];
  
  // T_dst^(-1): inverse de la normalisation dst
  // T_dst^(-1) = [[1/s, 0, cx], [0, 1/s, cy], [0, 0, 1]]
  const TdstInv: Matrix3x3 = [
    [1 / dstScaleFactor, 0, dstCentroid[0]],
    [0, 1 / dstScaleFactor, dstCentroid[1]],
    [0, 0, 1]
  ];
  
  // H = T_dst^(-1) * Hnorm * T_src
  const temp = multiplyMatrices3x3(Hnorm, Tsrc);
  return multiplyMatrices3x3(TdstInv, temp);
}

/**
 * ✖️ Multiplication de deux matrices 3×3
 */
function multiplyMatrices3x3(A: Matrix3x3, B: Matrix3x3): Matrix3x3 {
  const result: Matrix3x3 = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      result[i][j] = A[i][0] * B[0][j] + A[i][1] * B[1][j] + A[i][2] * B[2][j];
    }
  }
  
  return result;
}
