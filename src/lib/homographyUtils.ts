/**
 * 🎯 HOMOGRAPHY UTILS - Utilitaires d'homographie côté client
 * 
 * Fonctions pour transformer des points via une matrice d'homographie 3x3,
 * calculer des distances en cm, et gérer la calibration via ArUco/MAGENTA.
 * 
 * Compatible avec l'API /api/measure/photo qui retourne:
 * - homography.matrix: Matrice 3x3 pixels → cm
 * - calibration.pixelPerCm: Facteur de conversion simple
 * - marker.corners: Coins détectés du marqueur
 * 
 * @module lib/homographyUtils
 * @author 2Thier CRM Team
 */

/**
 * Point 2D
 */
export interface Point2D {
  x: number;
  y: number;
}

/**
 * Matrice d'homographie 3x3
 */
export type HomographyMatrix = number[][];

/**
 * Résultat de détection ArUco/MAGENTA
 */
export interface VisionARResponse {
  success: boolean;
  detected: boolean;
  marker?: {
    id: number;
    corners: Point2D[];
    magentaPositions: Point2D[];
    center: Point2D;
    sizePx: number;
    score: number;
    magentaFound: number;
  };
  homography: {
    matrix: HomographyMatrix;
    pixelsPerCm: number | null;
    realSizeCm: number;
    sides?: number[];
    angles?: number[];
    quality: number;
  };
  pose?: {
    rotX: number;
    rotY: number;
    rotZ: number;
  };
  calibration?: {
    pixelPerCm: number;
    referenceType: string;
    referenceSize: { width: number; height: number };
  };
  imageMeta: {
    mimeType: string;
    width: number;
    height: number;
  };
  durationMs: number;
}

/**
 * Transformer un point (pixels) vers les coordonnées réelles (cm) via homographie
 */
export function transformPointByHomography(
  H: HomographyMatrix,
  pointPx: Point2D
): Point2D {
  if (!H || H.length !== 3 || !H[0] || H[0].length !== 3) {
    console.warn('transformPointByHomography: matrice invalide, retour identité');
    return pointPx;
  }
  
  const x = H[0][0] * pointPx.x + H[0][1] * pointPx.y + H[0][2];
  const y = H[1][0] * pointPx.x + H[1][1] * pointPx.y + H[1][2];
  const w = H[2][0] * pointPx.x + H[2][1] * pointPx.y + H[2][2];
  
  // Éviter division par zéro
  if (Math.abs(w) < 1e-10) {
    console.warn('transformPointByHomography: w proche de zéro');
    return pointPx;
  }
  
  return {
    x: x / w,
    y: y / w
  };
}

/**
 * Calculer la distance entre deux points en cm via homographie
 * 
 * @param H - Matrice d'homographie (pixels → cm)
 * @param p1Px - Premier point en pixels
 * @param p2Px - Deuxième point en pixels
 * @returns Distance en centimètres
 */
export function measureDistanceCm(
  H: HomographyMatrix,
  p1Px: Point2D,
  p2Px: Point2D
): number {
  const p1Cm = transformPointByHomography(H, p1Px);
  const p2Cm = transformPointByHomography(H, p2Px);
  
  return Math.sqrt(
    Math.pow(p2Cm.x - p1Cm.x, 2) + 
    Math.pow(p2Cm.y - p1Cm.y, 2)
  );
}

/**
 * Calculer la distance entre deux points avec un simple facteur pixelPerCm
 * Fallback quand l'homographie n'est pas disponible
 */
export function measureDistanceSimple(
  pixelPerCm: number,
  p1Px: Point2D,
  p2Px: Point2D
): number {
  const distancePx = Math.sqrt(
    Math.pow(p2Px.x - p1Px.x, 2) + 
    Math.pow(p2Px.y - p1Px.y, 2)
  );
  
  return distancePx / pixelPerCm;
}

/**
 * Calculer les dimensions d'un rectangle défini par 4 coins
 * 
 * @param corners - 4 coins en pixels [TL, TR, BR, BL]
 * @param H - Matrice d'homographie (optionnel)
 * @param pixelPerCm - Facteur simple (fallback)
 * @returns { largeurCm, hauteurCm, surfaceM2 }
 */
export function measureRectangle(
  corners: Point2D[],
  H?: HomographyMatrix,
  pixelPerCm?: number
): { largeurCm: number; hauteurCm: number; surfaceM2: number } {
  if (corners.length !== 4) {
    console.warn('measureRectangle: besoin de 4 coins');
    return { largeurCm: 0, hauteurCm: 0, surfaceM2: 0 };
  }
  
  const [tl, tr, br, bl] = corners;
  
  let largeurCm: number;
  let hauteurCm: number;
  
  if (H && isValidHomography(H)) {
    // Utiliser l'homographie pour une mesure précise avec perspective
    const largeurHaut = measureDistanceCm(H, tl, tr);
    const largeurBas = measureDistanceCm(H, bl, br);
    const hauteurGauche = measureDistanceCm(H, tl, bl);
    const hauteurDroite = measureDistanceCm(H, tr, br);
    
    // Moyenne des côtés opposés
    largeurCm = (largeurHaut + largeurBas) / 2;
    hauteurCm = (hauteurGauche + hauteurDroite) / 2;
  } else if (pixelPerCm) {
    // Fallback avec facteur simple
    const largeurHaut = measureDistanceSimple(pixelPerCm, tl, tr);
    const largeurBas = measureDistanceSimple(pixelPerCm, bl, br);
    const hauteurGauche = measureDistanceSimple(pixelPerCm, tl, bl);
    const hauteurDroite = measureDistanceSimple(pixelPerCm, tr, br);
    
    largeurCm = (largeurHaut + largeurBas) / 2;
    hauteurCm = (hauteurGauche + hauteurDroite) / 2;
  } else {
    console.warn('measureRectangle: ni homographie ni pixelPerCm fourni');
    return { largeurCm: 0, hauteurCm: 0, surfaceM2: 0 };
  }
  
  const surfaceM2 = (largeurCm * hauteurCm) / 10000; // cm² → m²
  
  return { largeurCm, hauteurCm, surfaceM2 };
}

/**
 * Vérifier si une matrice d'homographie est valide (pas l'identité)
 */
export function isValidHomography(H: HomographyMatrix): boolean {
  if (!H || H.length !== 3) return false;
  
  // Vérifier que ce n'est pas l'identité (= pas de calibration)
  const isIdentity = 
    Math.abs(H[0][0] - 1) < 1e-6 &&
    Math.abs(H[0][1]) < 1e-6 &&
    Math.abs(H[0][2]) < 1e-6 &&
    Math.abs(H[1][0]) < 1e-6 &&
    Math.abs(H[1][1] - 1) < 1e-6 &&
    Math.abs(H[1][2]) < 1e-6 &&
    Math.abs(H[2][0]) < 1e-6 &&
    Math.abs(H[2][1]) < 1e-6 &&
    Math.abs(H[2][2] - 1) < 1e-6;
  
  return !isIdentity;
}

/**
 * Calculer la matrice d'homographie inverse (cm → pixels)
 */
export function invertHomography(H: HomographyMatrix): HomographyMatrix | null {
  if (!H || H.length !== 3) return null;
  
  // Calcul du déterminant 3x3
  const det = 
    H[0][0] * (H[1][1] * H[2][2] - H[1][2] * H[2][1]) -
    H[0][1] * (H[1][0] * H[2][2] - H[1][2] * H[2][0]) +
    H[0][2] * (H[1][0] * H[2][1] - H[1][1] * H[2][0]);
  
  if (Math.abs(det) < 1e-10) {
    console.warn('invertHomography: matrice singulière');
    return null;
  }
  
  // Matrice des cofacteurs transposée / det
  const invDet = 1 / det;
  
  return [
    [
      (H[1][1] * H[2][2] - H[1][2] * H[2][1]) * invDet,
      (H[0][2] * H[2][1] - H[0][1] * H[2][2]) * invDet,
      (H[0][1] * H[1][2] - H[0][2] * H[1][1]) * invDet
    ],
    [
      (H[1][2] * H[2][0] - H[1][0] * H[2][2]) * invDet,
      (H[0][0] * H[2][2] - H[0][2] * H[2][0]) * invDet,
      (H[0][2] * H[1][0] - H[0][0] * H[1][2]) * invDet
    ],
    [
      (H[1][0] * H[2][1] - H[1][1] * H[2][0]) * invDet,
      (H[0][1] * H[2][0] - H[0][0] * H[2][1]) * invDet,
      (H[0][0] * H[1][1] - H[0][1] * H[1][0]) * invDet
    ]
  ];
}

/**
 * Convertir une réponse VisionAR en données de calibration utilisables par le canvas
 */
export function visionARToCalibration(response: VisionARResponse): {
  pixelPerCm: number;
  pixelPerCmX?: number;
  pixelPerCmY?: number;
  homography?: HomographyMatrix;
  referenceType: string;
  detectedAutomatically: boolean;
  markerCorners?: Point2D[];
  quality: number;
} | null {
  if (!response.success || !response.detected) {
    return null;
  }
  
  const pixelPerCm = response.calibration?.pixelPerCm || 
                     response.homography?.pixelsPerCm || 
                     10; // Fallback
  
  return {
    pixelPerCm,
    homography: isValidHomography(response.homography.matrix) 
      ? response.homography.matrix 
      : undefined,
    referenceType: response.calibration?.referenceType || 'aruco_magenta',
    detectedAutomatically: true,
    markerCorners: response.marker?.corners,
    quality: response.homography.quality
  };
}

/**
 * Dessiner les coins du marqueur détecté sur un canvas
 */
export function drawMarkerCorners(
  ctx: CanvasRenderingContext2D,
  corners: Point2D[],
  options: {
    color?: string;
    lineWidth?: number;
    showLabels?: boolean;
  } = {}
): void {
  const { 
    color = '#00ff00', 
    lineWidth = 3,
    showLabels = true
  } = options;
  
  if (!corners || corners.length !== 4) return;
  
  // Dessiner le contour
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  ctx.lineTo(corners[1].x, corners[1].y);
  ctx.lineTo(corners[2].x, corners[2].y);
  ctx.lineTo(corners[3].x, corners[3].y);
  ctx.closePath();
  ctx.stroke();
  
  // Dessiner les points aux coins
  corners.forEach((corner, i) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(corner.x, corner.y, 5, 0, 2 * Math.PI);
    ctx.fill();
    
    if (showLabels) {
      ctx.fillStyle = color;
      ctx.font = 'bold 14px Arial';
      ctx.fillText(`${i + 1}`, corner.x + 8, corner.y - 5);
    }
  });
}

/**
 * Dessiner les points magenta détectés
 */
export function drawMagentaPoints(
  ctx: CanvasRenderingContext2D,
  magentaPositions: Point2D[],
  options: {
    radius?: number;
    showLabels?: boolean;
  } = {}
): void {
  const { radius = 3, showLabels = false } = options;
  
  magentaPositions.forEach((pos, i) => {
    // Point rouge pour indiquer le centre détecté
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, 2 * Math.PI);
    ctx.fill();
    
    if (showLabels) {
      ctx.fillStyle = '#ff0000';
      ctx.font = 'bold 12px Arial';
      ctx.fillText(`M${i + 1}`, pos.x + 6, pos.y + 3);
    }
  });
}

/**
 * Afficher les informations de pose sur le canvas
 */
export function drawPoseInfo(
  ctx: CanvasRenderingContext2D,
  pose: { rotX: number; rotY: number; rotZ: number },
  position: { x: number; y: number }
): void {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(position.x, position.y, 150, 60);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = '12px Arial';
  ctx.fillText(`Rotation X: ${pose.rotX}°`, position.x + 10, position.y + 18);
  ctx.fillText(`Rotation Y: ${pose.rotY}°`, position.x + 10, position.y + 34);
  ctx.fillText(`Rotation Z: ${pose.rotZ}°`, position.x + 10, position.y + 50);
}

export default {
  transformPointByHomography,
  measureDistanceCm,
  measureDistanceSimple,
  measureRectangle,
  isValidHomography,
  invertHomography,
  visionARToCalibration,
  drawMarkerCorners,
  drawMagentaPoints,
  drawPoseInfo
};
