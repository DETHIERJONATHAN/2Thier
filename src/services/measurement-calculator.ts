/**
 * 🎯 MEASUREMENT CALCULATOR - Service centralisé de calcul des mesures
 * 
 * 🏎️ FORMULE 1 - ARCHITECTURE CENTRALISÉE BACKEND
 * 
 * Le frontend envoie UNIQUEMENT les données brutes:
 * - fusedCorners: coins Métré A4 V10 détectés (en % de l'image)
 * - objectPoints: 4 coins cliqués par l'utilisateur (en pixels)
 * - dimensions de l'image
 * 
 * Le backend fait TOUS les calculs avec la précision maximale:
 * - Homographie (DLT + normalisation + conditionnement)
 * - Transformation des points
 * - Calcul des distances réelles en mm
 * - Estimation des incertitudes
 * 
 * ⚠️ RÉUTILISE LE CODE ÉPROUVÉ DE homographyUtils.ts
 * 
 * @author 2Thier CRM Team
 * @version 3.0.0 - Centralisation backend avec homographyUtils
 */

import {
  computeHomography,
  applyHomography,
  computeRealDistanceWithUncertainty,
  cornersToPoints,
  type Point2D,
  type HomographyCorners,
  type HomographyResult
} from '../utils/homographyUtils';

// ============================================================================
// TYPES
// ============================================================================

export interface PixelPoint {
  x: number;
  y: number;
}

export interface CalibrationData {
  markerCorners: {
    topLeft: PixelPoint;
    topRight: PixelPoint;
    bottomRight: PixelPoint;
    bottomLeft: PixelPoint;
  };
  imageWidth: number;
  imageHeight: number;
  exif?: {
    focalLengthMm?: number;
    sensorWidthMm?: number;
    make?: string;
    model?: string;
  };
  detectionQuality: number;
}

export interface ObjectCorners {
  topLeft: PixelPoint;
  topRight: PixelPoint;
  bottomRight: PixelPoint;
  bottomLeft: PixelPoint;
}

export interface MeasurementResult {
  success: boolean;
  largeur_cm: number;
  hauteur_cm: number;
  incertitude_largeur_cm: number;
  incertitude_hauteur_cm: number;
  method: 'homography' | 'homography+focal' | 'fallback';
  confidence: number;
  warnings: string[];
  debug?: {
    homographyQuality: number;
    markerSizePixels: { width: number; height: number };
    objectSizePixels: { width: number; height: number };
    transformedCorners: { tl: Point2D; tr: Point2D; br: Point2D; bl: Point2D };
  };
}

// ============================================================================
// FONCTION PRINCIPALE - CALCUL DES DIMENSIONS
// ============================================================================

/**
 * 🎯 FONCTION PRINCIPALE - Calcule les dimensions réelles d'un objet
 * 
 * Utilise l'homographie ultra-précise de homographyUtils.ts
 * 
 * @param calibration - Données de calibration Métré A4 V10
 * @param objectCorners - 4 coins de l'objet en pixels image
 * @returns Dimensions en cm avec incertitudes
 */
export function computeObjectDimensions(
  calibration: CalibrationData,
  objectCorners: ObjectCorners
): MeasurementResult {
  
  
  const warnings: string[] = [];
  
  // 🎯 Dimensions du Métré A4 V10 (cm)
  const markerWidthCm = 13.0;
  const markerHeightCm = 20.5;
  const markerWidthMm = markerWidthCm * 10;
  const markerHeightMm = markerHeightCm * 10;
  
  
  // 2️⃣ Convertir les corners en format Point2D pour homographyUtils
  const srcCorners: HomographyCorners = {
    topLeft: { x: calibration.markerCorners.topLeft.x, y: calibration.markerCorners.topLeft.y },
    topRight: { x: calibration.markerCorners.topRight.x, y: calibration.markerCorners.topRight.y },
    bottomLeft: { x: calibration.markerCorners.bottomLeft.x, y: calibration.markerCorners.bottomLeft.y },
    bottomRight: { x: calibration.markerCorners.bottomRight.x, y: calibration.markerCorners.bottomRight.y }
  };
  
  const srcPoints: Point2D[] = cornersToPoints(srcCorners);
  
  // 🎯 Points destination: rectangle V10 (centres 13×20.5cm)
  const dstPoints: Point2D[] = [
    [0, 0],                          // topLeft
    [markerWidthMm, 0],              // topRight
    [markerWidthMm, markerHeightMm], // bottomRight
    [0, markerHeightMm]              // bottomLeft
  ];
  
  
  // Calculer dimensions du marqueur en pixels (pour debug et fallback)
  const markerWidthPx = Math.hypot(
    srcPoints[1][0] - srcPoints[0][0],
    srcPoints[1][1] - srcPoints[0][1]
  );
  const markerHeightPx = Math.hypot(
    srcPoints[3][0] - srcPoints[0][0],
    srcPoints[3][1] - srcPoints[0][1]
  );
  
  // 2️⃣ HOMOGRAPHIE 4 POINTS (V10)
  let homography: HomographyResult;


  try {
    homography = computeHomography(srcPoints, dstPoints);
  } catch (error) {
    console.error('❌ Erreur calcul homographie:', error);
    return {
      success: false,
      largeur_cm: 0,
      hauteur_cm: 0,
      incertitude_largeur_cm: 0,
      incertitude_hauteur_cm: 0,
      method: 'fallback',
      confidence: 0,
      warnings: ['Échec du calcul d\'homographie']
    };
  }

  if (homography.quality < 50) {
    warnings.push('Qualité homographie faible - mesures moins fiables');
  }
  
  // 4️⃣ Transformer les 4 coins de l'objet vers l'espace réel (mm)
  
  const objTL: Point2D = [objectCorners.topLeft.x, objectCorners.topLeft.y];
  const objTR: Point2D = [objectCorners.topRight.x, objectCorners.topRight.y];
  const objBR: Point2D = [objectCorners.bottomRight.x, objectCorners.bottomRight.y];
  const objBL: Point2D = [objectCorners.bottomLeft.x, objectCorners.bottomLeft.y];
  
  
  // Transformer vers mm
  const realTL = applyHomography(homography.matrix, objTL);
  const realTR = applyHomography(homography.matrix, objTR);
  const realBR = applyHomography(homography.matrix, objBR);
  const realBL = applyHomography(homography.matrix, objBL);
  
  
  // 5️⃣ Calculer les dimensions avec incertitude
  
  // Largeur: moyenne du côté haut et bas
  const widthTopPx = Math.hypot(objTR[0] - objTL[0], objTR[1] - objTL[1]);
  const widthBottomPx = Math.hypot(objBR[0] - objBL[0], objBR[1] - objBL[1]);
  const widthTop = computeRealDistanceWithUncertainty(
    homography.matrix, objTL, objTR, homography.uncertainty
  );
  const widthBottom = computeRealDistanceWithUncertainty(
    homography.matrix, objBL, objBR, homography.uncertainty
  );
  
  
  // Hauteur: moyenne du côté gauche et droit
  const heightLeft = computeRealDistanceWithUncertainty(
    homography.matrix, objTL, objBL, homography.uncertainty
  );
  const heightRight = computeRealDistanceWithUncertainty(
    homography.matrix, objTR, objBR, homography.uncertainty
  );
  const heightLeftPx = Math.hypot(objBL[0] - objTL[0], objBL[1] - objTL[1]);
  const heightRightPx = Math.hypot(objBR[0] - objTR[0], objBR[1] - objTR[1]);
  
  
  // Moyennes
  const avgWidthMm = (widthTop.distance + widthBottom.distance) / 2;
  const avgHeightMm = (heightLeft.distance + heightRight.distance) / 2;
  const avgWidthUncertaintyMm = (widthTop.uncertainty + widthBottom.uncertainty) / 2;
  const avgHeightUncertaintyMm = (heightLeft.uncertainty + heightRight.uncertainty) / 2;

  // 🚫 FORMULE 1: PAS de correction d'échelle !
  // L'homographie ultra-précision transforme déjà correctement pixels → mm réels.
  // Appliquer un scaleFactor basé sur pixels/mm de l'objet est FAUX car:
  // 1. L'homographie corrige déjà la perspective ET l'échelle
  // 2. Un objet éloigné aura naturellement moins de pixels/mm, c'est normal !
  // 3. Multiplier par ce ratio donne des mesures 10× trop grandes
  
  const scaleFactor = 1; // TOUJOURS 1.0 avec homographie !
  
  // Debug uniquement (ne pas appliquer de correction)
  const pxPerMmMarker = (markerWidthPx + markerHeightPx) / (2 * ((markerWidthMm + markerHeightMm) / 2));
  const pxPerMmObjSamples = [
    widthTopPx / Math.max(widthTop.distance, 1e-6),
    widthBottomPx / Math.max(widthBottom.distance, 1e-6),
    heightLeftPx / Math.max(heightLeft.distance, 1e-6),
    heightRightPx / Math.max(heightRight.distance, 1e-6)
  ].filter((v) => Number.isFinite(v) && v > 0);

  if (pxPerMmObjSamples.length > 0) {
    const avgPxPerMmObj = pxPerMmObjSamples.reduce((a, b) => a + b, 0) / pxPerMmObjSamples.length;
    const ratio = avgPxPerMmObj / pxPerMmMarker;
  }
  
  // Variation entre côtés opposés (indicateur de qualité)
  const widthVariation = Math.abs(widthTop.distance - widthBottom.distance) / avgWidthMm * 100;
  const heightVariation = Math.abs(heightLeft.distance - heightRight.distance) / avgHeightMm * 100;
  
  
  if (widthVariation > 10) {
    warnings.push(`Variation largeur ${widthVariation.toFixed(0)}% - perspective forte`);
  }
  if (heightVariation > 10) {
    warnings.push(`Variation hauteur ${heightVariation.toFixed(0)}% - perspective forte`);
  }
  
  // Convertir en cm
  const largeur_cm = (avgWidthMm * scaleFactor) / 10;
  const hauteur_cm = (avgHeightMm * scaleFactor) / 10;
  const incertitude_largeur_cm = (avgWidthUncertaintyMm * scaleFactor) / 10;
  const incertitude_hauteur_cm = (avgHeightUncertaintyMm * scaleFactor) / 10;
  
  // Confiance basée sur qualité homographie et variation
  const variationPenalty = Math.max(0, (widthVariation + heightVariation) / 2 - 5) * 2;
  const confidence = Math.max(0, Math.min(100, homography.quality - variationPenalty)) / 100;
  
  // Calcul dimensions objet en pixels (pour debug)
  const objectWidthPx = Math.hypot(objTR[0] - objTL[0], objTR[1] - objTL[1]);
  const objectHeightPx = Math.hypot(objBL[0] - objTL[0], objBL[1] - objTL[1]);
  
  if (warnings.length > 0) {
  }
  
  return {
    success: true,
    largeur_cm,
    hauteur_cm,
    incertitude_largeur_cm,
    incertitude_hauteur_cm,
    method: 'homography',
    confidence,
    warnings,
    debug: {
      homographyQuality: homography.quality,
      widthVariationPercent: widthVariation,
      heightVariationPercent: heightVariation,
      markerSizePixels: { width: markerWidthPx, height: markerHeightPx },
      objectSizePixels: { width: objectWidthPx, height: objectHeightPx },
      transformedCorners: {
        tl: realTL,
        tr: realTR,
        br: realBR,
        bl: realBL
      }
    }
  };
}
