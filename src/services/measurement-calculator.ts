/**
 * 🎯 MEASUREMENT CALCULATOR - Service centralisé de calcul des mesures
 * 
 * 🏎️ FORMULE 1 - ARCHITECTURE CENTRALISÉE BACKEND
 * 
 * Le frontend envoie UNIQUEMENT les données brutes:
 * - fusedCorners: coins ArUco détectés (en % de l'image)
 * - objectPoints: 4 coins cliqués par l'utilisateur (en pixels)
 * - dimensions de l'image
 * - taille du marqueur
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
  setArucoMarkerSize,
  type Point2D,
  type Matrix3x3,
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
  markerSizeCm: number;
  markerHeightCm?: number;     // 🎯 NOUVEAU: Hauteur du marqueur (pour AprilTag rectangulaire)
  detectionMethod?: string;    // 🎯 NOUVEAU: Type de détection (AprilTag-Metre-V1.2, ArUco-MAGENTA, etc.)
  imageWidth: number;
  imageHeight: number;
  exif?: {
    focalLengthMm?: number;
    sensorWidthMm?: number;
    make?: string;
    model?: string;
  };
  detectionQuality: number;
  reprojectionErrorMm?: number;
  // 🔬 ULTRA-PRÉCISION: Homographie 3×3 optimisée avec 41+ points RANSAC + Levenberg-Marquardt
  ultraPrecisionHomography?: number[][];
  ultraPrecisionQuality?: number;
  // 📏 DONNÉES 3D: Profondeur et inclinaison
  depthInfo?: {
    mean: number;           // mm
    stdDev: number;         // mm
    inclineAngle: number;   // degrés
  };
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
 * @param calibration - Données de calibration ArUco
 * @param objectCorners - 4 coins de l'objet en pixels image
 * @returns Dimensions en cm avec incertitudes
 */
export function computeObjectDimensions(
  calibration: CalibrationData,
  objectCorners: ObjectCorners
): MeasurementResult {
  
  console.log('\n' + '═'.repeat(90));
  console.log('📊 [MEASUREMENT-CALCULATOR] DÉTAIL COMPLET DU CALCUL');
  console.log('═'.repeat(90));
  
  const warnings: string[] = [];
  
  // 🎯 Déterminer les dimensions du marqueur
  const isAprilTag = calibration.detectionMethod === 'AprilTag-Metre-V1.2';
  const markerWidthCm = calibration.markerSizeCm;
  const markerHeightCm = calibration.markerHeightCm || calibration.markerSizeCm;
  const markerWidthMm = markerWidthCm * 10;
  const markerHeightMm = markerHeightCm * 10;
  
  console.log(`\n🔹 MARQUEUR DE RÉFÉRENCE:`);
  console.log(`   Type: ${isAprilTag ? 'AprilTag Métré V1.2' : 'ArUco'}`);
  console.log(`   Dimensions: ${markerWidthCm}cm × ${markerHeightCm}cm = ${markerWidthMm}mm × ${markerHeightMm}mm`);
  
  if (isAprilTag) {
    setArucoMarkerSize(markerWidthCm);
  } else {
    setArucoMarkerSize(calibration.markerSizeCm);
  }
  
  // 2️⃣ Convertir les corners en format Point2D pour homographyUtils
  const srcCorners: HomographyCorners = {
    topLeft: { x: calibration.markerCorners.topLeft.x, y: calibration.markerCorners.topLeft.y },
    topRight: { x: calibration.markerCorners.topRight.x, y: calibration.markerCorners.topRight.y },
    bottomLeft: { x: calibration.markerCorners.bottomLeft.x, y: calibration.markerCorners.bottomLeft.y },
    bottomRight: { x: calibration.markerCorners.bottomRight.x, y: calibration.markerCorners.bottomRight.y }
  };
  
  const srcPoints: Point2D[] = cornersToPoints(srcCorners);
  
  // 🎯 Points destination: rectangle avec les bonnes dimensions
  // Pour AprilTag: 130×217mm (centres), pour ArUco: 168×168mm
  const dstPoints: Point2D[] = [
    [0, 0],                          // topLeft
    [markerWidthMm, 0],              // topRight
    [markerWidthMm, markerHeightMm], // bottomRight
    [0, markerHeightMm]              // bottomLeft
  ];
  
  if (isAprilTag) {
    console.log(`   📐 Points destination AprilTag ${markerWidthMm}×${markerHeightMm}mm:`, dstPoints.map(p => `(${p[0]}, ${p[1]})`).join(', '));
  }
  
  // Calculer dimensions du marqueur en pixels (pour debug et fallback)
  const markerWidthPx = Math.hypot(
    srcPoints[1][0] - srcPoints[0][0],
    srcPoints[1][1] - srcPoints[0][1]
  );
  const markerHeightPx = Math.hypot(
    srcPoints[3][0] - srcPoints[0][0],
    srcPoints[3][1] - srcPoints[0][1]
  );
  
  // 2️⃣ UTILISER L'HOMOGRAPHIE ULTRA-PRÉCISE SI DISPONIBLE !
  let homography: HomographyResult;
  let usedUltraPrecision = false;
  let depthInfo = {
    mean: 0,
    stdDev: 0,
    inclineAngle: 0
  };
  
  if (calibration.ultraPrecisionHomography && calibration.ultraPrecisionHomography.length === 3) {
    console.log(`\n📐 ÉTAPE 2: 🔬 UTILISATION HOMOGRAPHIE ULTRA-PRÉCISE (41+ points)`);
    console.log(`   ✅ Qualité ultra-précision: ${(calibration.ultraPrecisionQuality || 0).toFixed(1)}%`);
    console.log(`   ✅ Erreur reprojection: ±${calibration.reprojectionErrorMm?.toFixed(2) || '?'}mm`);
    console.log(`   🎯 Source: RANSAC + Levenberg-Marquardt (10-41 points)`);
    
    // Extraire infos de profondeur si disponibles
    if ((calibration as any).depthInfo) {
      depthInfo = (calibration as any).depthInfo;
      console.log(`   📏 Profondeur caméra: ${depthInfo.mean.toFixed(0)}mm (±${depthInfo.stdDev.toFixed(0)}mm)`);
      console.log(`   🔄 Angle inclinaison: ${depthInfo.inclineAngle.toFixed(2)}°`);
    }
    
    // Convertir number[][] en Matrix3x3
    const matrix3x3: Matrix3x3 = [
      [calibration.ultraPrecisionHomography[0][0], calibration.ultraPrecisionHomography[0][1], calibration.ultraPrecisionHomography[0][2]],
      [calibration.ultraPrecisionHomography[1][0], calibration.ultraPrecisionHomography[1][1], calibration.ultraPrecisionHomography[1][2]],
      [calibration.ultraPrecisionHomography[2][0], calibration.ultraPrecisionHomography[2][1], calibration.ultraPrecisionHomography[2][2]]
    ];
    
    homography = {
      matrix: matrix3x3,
      quality: calibration.ultraPrecisionQuality || 95,
      uncertainty: calibration.reprojectionErrorMm ? (calibration.reprojectionErrorMm / 100) : 0.1
    };
    
    usedUltraPrecision = true;
    
  } else {
    console.log(`\n📐 ÉTAPE 2: Construction homographie basique (4 points)`);
    console.log(`   Coins marqueur (px):`);
    console.log(`      TL: (${srcPoints[0][0].toFixed(0)}, ${srcPoints[0][1].toFixed(0)})`);
    console.log(`      TR: (${srcPoints[1][0].toFixed(0)}, ${srcPoints[1][1].toFixed(0)})`);
    console.log(`      BR: (${srcPoints[2][0].toFixed(0)}, ${srcPoints[2][1].toFixed(0)})`);
    console.log(`      BL: (${srcPoints[3][0].toFixed(0)}, ${srcPoints[3][1].toFixed(0)})`);
    console.log(`   Coins destination (mm):`);
    console.log(`      TL: (0, 0), TR: (${markerWidthMm}, 0)`);
    console.log(`      BR: (${markerWidthMm}, ${markerHeightMm}), BL: (0, ${markerHeightMm})`);
    console.log(`   Taille marqueur en pixels: ${markerWidthPx.toFixed(0)} × ${markerHeightPx.toFixed(0)}`);
    
    // Points destination: rectangle de markerWidthMm × markerHeightMm
    const dstPoints: Point2D[] = [
      [0, 0],                         // topLeft
      [markerWidthMm, 0],             // topRight
      [markerWidthMm, markerHeightMm], // bottomRight
      [0, markerHeightMm]             // bottomLeft
    ];
    
    // 3️⃣ Calculer l'homographie avec le code éprouvé
    try {
      homography = computeHomography(srcPoints, dstPoints);
      console.log(`   ✅ Homographie calculée`);
      console.log(`      Qualité: ${homography.quality.toFixed(1)}%`);
      console.log(`      Incertitude: ±${homography.uncertainty.toFixed(1)}%`);
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
  }
  
  // 4️⃣ Transformer les 4 coins de l'objet vers l'espace réel (mm)
  console.log(`\n📏 ÉTAPE 3: Transformation des coins de l'objet`);
  
  const objTL: Point2D = [objectCorners.topLeft.x, objectCorners.topLeft.y];
  const objTR: Point2D = [objectCorners.topRight.x, objectCorners.topRight.y];
  const objBR: Point2D = [objectCorners.bottomRight.x, objectCorners.bottomRight.y];
  const objBL: Point2D = [objectCorners.bottomLeft.x, objectCorners.bottomLeft.y];
  
  console.log(`   Coins objet (px):`);
  console.log(`      TL: (${objTL[0].toFixed(0)}, ${objTL[1].toFixed(0)})`);
  console.log(`      TR: (${objTR[0].toFixed(0)}, ${objTR[1].toFixed(0)})`);
  console.log(`      BR: (${objBR[0].toFixed(0)}, ${objBR[1].toFixed(0)})`);
  console.log(`      BL: (${objBL[0].toFixed(0)}, ${objBL[1].toFixed(0)})`);
  
  // Transformer vers mm
  const realTL = applyHomography(homography.matrix, objTL);
  const realTR = applyHomography(homography.matrix, objTR);
  const realBR = applyHomography(homography.matrix, objBR);
  const realBL = applyHomography(homography.matrix, objBL);
  
  console.log(`   Coins objet transformés (mm):`);
  console.log(`      TL: (${realTL[0].toFixed(1)}, ${realTL[1].toFixed(1)})`);
  console.log(`      TR: (${realTR[0].toFixed(1)}, ${realTR[1].toFixed(1)})`);
  console.log(`      BR: (${realBR[0].toFixed(1)}, ${realBR[1].toFixed(1)})`);
  console.log(`      BL: (${realBL[0].toFixed(1)}, ${realBL[1].toFixed(1)})`);
  
  // 5️⃣ Calculer les dimensions avec incertitude
  console.log(`\n📏 ÉTAPE 4: Calcul des dimensions finales`);
  
  // Largeur: moyenne du côté haut et bas
  const widthTopPx = Math.hypot(objTR[0] - objTL[0], objTR[1] - objTL[1]);
  const widthBottomPx = Math.hypot(objBR[0] - objBL[0], objBR[1] - objBL[1]);
  const widthTop = computeRealDistanceWithUncertainty(
    homography.matrix, objTL, objTR, homography.uncertainty
  );
  const widthBottom = computeRealDistanceWithUncertainty(
    homography.matrix, objBL, objBR, homography.uncertainty
  );
  
  console.log(`   Largeur haut: ${widthTop.distance.toFixed(1)}mm (±${widthTop.uncertainty.toFixed(1)}mm)`);
  console.log(`   Largeur bas: ${widthBottom.distance.toFixed(1)}mm (±${widthBottom.uncertainty.toFixed(1)}mm)`);
  
  // Hauteur: moyenne du côté gauche et droit
  const heightLeft = computeRealDistanceWithUncertainty(
    homography.matrix, objTL, objBL, homography.uncertainty
  );
  const heightRight = computeRealDistanceWithUncertainty(
    homography.matrix, objTR, objBR, homography.uncertainty
  );
  const heightLeftPx = Math.hypot(objBL[0] - objTL[0], objBL[1] - objTL[1]);
  const heightRightPx = Math.hypot(objBR[0] - objTR[0], objBR[1] - objTR[1]);
  
  console.log(`   Hauteur gauche: ${heightLeft.distance.toFixed(1)}mm (±${heightLeft.uncertainty.toFixed(1)}mm)`);
  console.log(`   Hauteur droite: ${heightRight.distance.toFixed(1)}mm (±${heightRight.uncertainty.toFixed(1)}mm)`);
  
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
    console.log(`   📊 Ratio pixels/mm (objet/marqueur): ${ratio.toFixed(2)} (info seulement, NON appliqué)`);
  }
  
  // Variation entre côtés opposés (indicateur de qualité)
  const widthVariation = Math.abs(widthTop.distance - widthBottom.distance) / avgWidthMm * 100;
  const heightVariation = Math.abs(heightLeft.distance - heightRight.distance) / avgHeightMm * 100;
  
  console.log(`\n   📊 Variation entre côtés opposés:`);
  console.log(`      Largeur: ${widthVariation.toFixed(1)}%`);
  console.log(`      Hauteur: ${heightVariation.toFixed(1)}%`);
  
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
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ [MEASUREMENT-CALCULATOR] RÉSULTAT FORMULE 1');
  console.log('='.repeat(70));
  console.log(`   📏 LARGEUR: ${largeur_cm.toFixed(2)} cm (±${incertitude_largeur_cm.toFixed(2)} cm)`);
  console.log(`   📏 HAUTEUR: ${hauteur_cm.toFixed(2)} cm (±${incertitude_hauteur_cm.toFixed(2)} cm)`);
  console.log(`   🎯 Méthode: ${usedUltraPrecision ? '🔬 ULTRA-PRÉCISION (41+ pts)' : 'homography (4 pts)'} (FORMULE 1)`);
  console.log(`   📊 Confiance: ${(confidence * 100).toFixed(0)}%`);
  console.log(`   📊 Qualité homographie: ${homography.quality.toFixed(1)}%`);
  if (usedUltraPrecision) {
    console.log(`   🔬 Erreur reprojection: ±${calibration.reprojectionErrorMm?.toFixed(2) || '?'}mm`);
    if (depthInfo.mean > 0) {
      console.log(`   📏 Profondeur caméra: ${depthInfo.mean.toFixed(0)}mm (±${depthInfo.stdDev.toFixed(0)}mm)`);
      console.log(`   🔄 Angle inclinaison: ${depthInfo.inclineAngle.toFixed(2)}°`);
    }
  }
  if (warnings.length > 0) {
    console.log(`   ⚠️ Avertissements: ${warnings.join(', ')}`);
  }
  console.log('='.repeat(70) + '\n');
  
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
      markerSizePixels: { width: markerWidthPx, height: markerHeightPx },
      objectSizePixels: { width: objectWidthPx, height: objectHeightPx },
      transformedCorners: {
        tl: realTL,
        tr: realTR,
        br: realBR,
        bl: realBL
      },
      ...(usedUltraPrecision && depthInfo.mean > 0 ? {
        depth: {
          mean_mm: depthInfo.mean,
          stdDev_mm: depthInfo.stdDev,
          inclineAngle_deg: depthInfo.inclineAngle
        }
      } : {})
    }
  };
}
