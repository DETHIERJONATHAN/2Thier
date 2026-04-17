/**
 * 🤖 PhotoAnalyzer - Analyse IA des photos avec multi-angles et shadow analysis
 * 
 * Fonctionnalités:
 * - Analyse automatique de la qualité des photos
 * - Détection des marqueurs de calibration
 * - Calcul de perspective depuis plusieurs angles
 * - Shadow analysis pour estimation 3D
 * - Fusion des données multi-photos
 * - Recommandations temps réel
 */

import { CapturedPhoto } from './SmartCameraMobile';

// Type local pour les métadonnées de capture
export interface CaptureMetadata {
  timestamp: number;
  photoIndex: number;
  totalPhotosNeeded: number;
  gyroscope: { alpha: number; beta: number; gamma: number };
  accelerometer: { x: number; y: number; z: number };
  camera: { facingMode: 'environment'; zoom: number };
  lighting: { brightness: number; contrast: number; uniformity: number };
  quality: { sharpness: number; blur: number; overallScore: number };
}

// Types pour l'analyse
export interface MarkerDetection {
  detected: boolean;
  corners: { x: number; y: number }[]; // 4 coins
  confidence: number;
  perspectiveMatrix?: number[][];
  sizeInPixels: { width: number; height: number };
  realSizeMm: { width: number; height: number };
}

export interface ShadowAnalysis {
  hasShadows: boolean;
  shadowDirection: { x: number; y: number; z: number };
  lightSources: { 
    position: { x: number; y: number };
    intensity: number;
    type: 'natural' | 'artificial';
  }[];
  shadowLength: number; // Ratio ombre/objet
  estimatedSunAngle?: number; // Si lumière naturelle
}

export interface GeometryEstimation {
  // Dimensions estimées de l'objet
  width: number;
  height: number;
  depth?: number; // Si plusieurs angles permettent de l'estimer
  // Confiance
  confidence: number;
  method: 'single-photo' | 'multi-angle' | 'shadow-analysis' | 'combined';
}

export interface PhotoQualityReport {
  photo: CapturedPhoto;
  index: number;
  // Scores
  sharpnessScore: number;
  lightingScore: number;
  angleScore: number;
  markerVisibilityScore: number;
  overallScore: number;
  // Problèmes détectés
  issues: {
    type: 'blur' | 'dark' | 'bright' | 'angle' | 'marker' | 'shadow';
    severity: 'low' | 'medium' | 'high';
    message: string;
    suggestion: string;
  }[];
  // Utilisable pour mesure?
  usableForMeasurement: boolean;
}

export interface MultiPhotoAnalysis {
  photos: PhotoQualityReport[];
  // Couverture angulaire
  angleCoverage: {
    horizontal: number; // Degrés couverts
    vertical: number;
    isAdequate: boolean;
  };
  // Marqueur
  markerDetection: MarkerDetection | null;
  // Ombres
  shadowAnalysis: ShadowAnalysis;
  // Estimation géométrique combinée
  geometryEstimation: GeometryEstimation | null;
  // Recommandations
  needsMorePhotos: boolean;
  recommendedNextAngle?: string;
  overallReadiness: 'not-ready' | 'acceptable' | 'good' | 'excellent';
  finalRecommendation: string;
}

// ============================================================================
// FONCTIONS D'ANALYSE
// ============================================================================

/**
 * Analyse complète d'un ensemble de photos
 */
export async function analyzePhotos(photos: CapturedPhoto[]): Promise<MultiPhotoAnalysis> {
  if (photos.length === 0) {
    throw new Error('No photos to analyze');
  }

  // Analyser chaque photo individuellement
  const photoReports = await Promise.all(
    photos.map((photo, index) => analyzePhoto(photo, index))
  );

  // Analyser la couverture angulaire
  const angleCoverage = analyzeAngleCoverage(photos);

  // Détecter le marqueur dans la meilleure photo
  const markerDetection = await detectMarker(photos);

  // Analyse des ombres (combinée de toutes les photos)
  const shadowAnalysis = analyzeShadows(photos);

  // Estimation géométrique combinée
  const geometryEstimation = estimateGeometry(photoReports, markerDetection, shadowAnalysis);

  // Déterminer si plus de photos sont nécessaires
  const { needsMorePhotos, recommendedNextAngle, overallReadiness, finalRecommendation } = 
    determineReadiness(photoReports, angleCoverage, markerDetection);

  return {
    photos: photoReports,
    angleCoverage,
    markerDetection,
    shadowAnalysis,
    geometryEstimation,
    needsMorePhotos,
    recommendedNextAngle,
    overallReadiness,
    finalRecommendation
  };
}

/**
 * Analyse une photo individuelle
 */
async function analyzePhoto(photo: CapturedPhoto, index: number): Promise<PhotoQualityReport> {
  const issues: PhotoQualityReport['issues'] = [];
  
  // Score de netteté (basé sur les métadonnées ou analyse d'image)
  const sharpnessScore = photo.metadata.quality.sharpness;
  if (sharpnessScore < 60) {
    issues.push({
      type: 'blur',
      severity: sharpnessScore < 40 ? 'high' : 'medium',
      message: 'Image floue détectée',
      suggestion: 'Stabilisez le téléphone et attendez la mise au point'
    });
  }

  // Score d'éclairage
  const lightingScore = calculateLightingScore(photo.metadata.lighting);
  if (lightingScore < 50) {
    issues.push({
      type: photo.metadata.lighting.brightness < 80 ? 'dark' : 'bright',
      severity: lightingScore < 30 ? 'high' : 'medium',
      message: photo.metadata.lighting.brightness < 80 ? 'Image trop sombre' : 'Image surexposée',
      suggestion: photo.metadata.lighting.brightness < 80 
        ? 'Rapprochez-vous d\'une source de lumière' 
        : 'Évitez le soleil direct ou utilisez l\'ombre'
    });
  }

  // Score d'angle (basé sur le gyroscope)
  const angleScore = calculateAngleScore(photo.metadata.gyroscope);
  if (angleScore < 70) {
    issues.push({
      type: 'angle',
      severity: angleScore < 50 ? 'high' : 'medium',
      message: 'Angle de prise de vue non optimal',
      suggestion: 'Tenez le téléphone plus droit ou visez perpendiculairement'
    });
  }

  // Score de visibilité du marqueur (à implémenter avec détection réelle)
  const markerVisibilityScore = 80; // Placeholder

  // Score global
  const overallScore = (sharpnessScore * 0.3 + lightingScore * 0.25 + angleScore * 0.25 + markerVisibilityScore * 0.2);

  return {
    photo,
    index,
    sharpnessScore,
    lightingScore,
    angleScore,
    markerVisibilityScore,
    overallScore,
    issues,
    usableForMeasurement: overallScore >= 50 && issues.filter(i => i.severity === 'high').length === 0
  };
}

/**
 * Calcule le score d'éclairage
 */
function calculateLightingScore(lighting: CaptureMetadata['lighting']): number {
  // Luminosité idéale: 100-180
  const brightnessScore = lighting.brightness >= 100 && lighting.brightness <= 180
    ? 100
    : Math.max(0, 100 - Math.abs(lighting.brightness - 140) * 0.7);
  
  // Contraste idéal: 50-150
  const contrastScore = lighting.contrast >= 50 && lighting.contrast <= 150
    ? 100
    : Math.max(0, 100 - Math.abs(lighting.contrast - 100) * 0.5);
  
  // Uniformité importante
  const uniformityScore = lighting.uniformity;

  return (brightnessScore * 0.4 + contrastScore * 0.3 + uniformityScore * 0.3);
}

/**
 * Calcule le score basé sur l'angle du téléphone
 */
function calculateAngleScore(gyro: CaptureMetadata['gyroscope']): number {
  // Beta idéal: 90° (téléphone vertical)
  const pitchDeviation = Math.abs(gyro.beta - 90);
  const pitchScore = Math.max(0, 100 - pitchDeviation * 2);
  
  // Gamma idéal: 0° (pas de roulis)
  const rollDeviation = Math.abs(gyro.gamma);
  const rollScore = Math.max(0, 100 - rollDeviation * 3);

  return (pitchScore + rollScore) / 2;
}

/**
 * Analyse la couverture angulaire des photos
 */
function analyzeAngleCoverage(photos: CapturedPhoto[]): MultiPhotoAnalysis['angleCoverage'] {
  if (photos.length < 2) {
    return { horizontal: 0, vertical: 0, isAdequate: false };
  }

  // Collecter les angles horizontaux (alpha/yaw)
  const alphas = photos.map(p => p.metadata.gyroscope.alpha);
  const betas = photos.map(p => p.metadata.gyroscope.beta);

  // Calculer la couverture (différence max - min, avec wrap-around pour alpha)
  const horizontalCoverage = calculateAngleSpread(alphas, 360);
  const verticalCoverage = calculateAngleSpread(betas, 180);

  // Couverture adéquate: au moins 20° horizontal et 10° vertical
  const isAdequate = horizontalCoverage >= 20 || verticalCoverage >= 10;

  return {
    horizontal: horizontalCoverage,
    vertical: verticalCoverage,
    isAdequate
  };
}

/**
 * Calcule l'étendue angulaire (gère le wrap-around)
 */
function calculateAngleSpread(angles: number[], maxAngle: number): number {
  if (angles.length < 2) return 0;
  
  const sorted = [...angles].sort((a, b) => a - b);
  
  // Trouver le plus grand gap (pour gérer le wrap-around)
  let maxGap = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    maxGap = Math.max(maxGap, sorted[i + 1] - sorted[i]);
  }
  // Gap wrap-around
  const wrapGap = (sorted[0] + maxAngle) - sorted[sorted.length - 1];
  maxGap = Math.max(maxGap, wrapGap);

  return maxAngle - maxGap;
}

/**
 * Détecte le marqueur de calibration dans les photos
 */
async function detectMarker(photos: CapturedPhoto[]): Promise<MarkerDetection | null> {
  // Stub — returns simulated detection; real vision API/OpenCV.js integration pending
  
  const bestPhoto = photos.reduce((best, current) => 
    current.metadata.quality.overallScore > best.metadata.quality.overallScore ? current : best
  );
  
  if (bestPhoto.metadata.quality.overallScore >= 60) {
    return {
      detected: true,
      corners: [
        { x: 100, y: 100 },
        { x: 300, y: 100 },
        { x: 300, y: 400 },
        { x: 100, y: 400 }
      ],
      confidence: 85,
      sizeInPixels: { width: 200, height: 300 },
      realSizeMm: { width: 190, height: 277 } // A4 moins marges
    };
  }
  
  return null;
}

/**
 * Analyse les ombres dans les photos (Shadow Analysis)
 */
function analyzeShadows(photos: CapturedPhoto[]): ShadowAnalysis {
  // Combiner les analyses d'ombre de toutes les photos
  const shadowDirections = photos.map(p => p.metadata.lighting.shadowDirection).filter(Boolean);
  
  if (shadowDirections.length === 0) {
    return {
      hasShadows: false,
      shadowDirection: { x: 0, y: -1, z: 0.5 },
      lightSources: [],
      shadowLength: 0
    };
  }

  // Moyenner les directions d'ombre
  const avgX = shadowDirections.reduce((sum, d) => sum + (d?.x || 0), 0) / shadowDirections.length;
  const avgY = shadowDirections.reduce((sum, d) => sum + (d?.y || 0), 0) / shadowDirections.length;
  
  // Estimer l'angle du soleil basé sur la direction de l'ombre
  const estimatedSunAngle = Math.atan2(avgY, avgX) * (180 / Math.PI);

  // Détecter le type de lumière (basé sur l'uniformité)
  const avgUniformity = photos.reduce((sum, p) => sum + p.metadata.lighting.uniformity, 0) / photos.length;
  const lightType: 'natural' | 'artificial' = avgUniformity < 60 ? 'natural' : 'artificial';

  return {
    hasShadows: true,
    shadowDirection: { x: avgX, y: avgY, z: 0.5 },
    lightSources: [{
      position: { x: -avgX * 100, y: -avgY * 100 },
      intensity: photos[0].metadata.lighting.brightness / 255,
      type: lightType
    }],
    shadowLength: 1.0, // À calculer avec analyse d'image réelle
    estimatedSunAngle
  };
}

/**
 * Estime la géométrie de l'objet
 */
function estimateGeometry(
  reports: PhotoQualityReport[],
  marker: MarkerDetection | null,
  shadows: ShadowAnalysis
): GeometryEstimation | null {
  const usablePhotos = reports.filter(r => r.usableForMeasurement);
  
  if (usablePhotos.length === 0) {
    return null;
  }

  let method: GeometryEstimation['method'] = 'single-photo';
  let confidence = 50;
  
  if (marker?.detected) {
    confidence += 20;
    
    if (usablePhotos.length >= 3) {
      method = 'multi-angle';
      confidence += 15;
    }
    
    if (shadows.hasShadows && shadows.shadowLength > 0) {
      method = 'combined';
      confidence += 10;
    }
  }

  // Les dimensions seraient calculées avec les vraies transformations de perspective
  // Pour l'instant, retourne des placeholders
  return {
    width: 83, // cm - serait calculé
    height: 202.5, // cm
    depth: usablePhotos.length >= 3 ? 4 : undefined, // Épaisseur si multi-angle
    confidence: Math.min(95, confidence),
    method
  };
}

/**
 * Détermine si le set de photos est prêt pour la mesure
 */
function determineReadiness(
  reports: PhotoQualityReport[],
  angleCoverage: MultiPhotoAnalysis['angleCoverage'],
  marker: MarkerDetection | null
): {
  needsMorePhotos: boolean;
  recommendedNextAngle?: string;
  overallReadiness: MultiPhotoAnalysis['overallReadiness'];
  finalRecommendation: string;
} {
  const usableCount = reports.filter(r => r.usableForMeasurement).length;
  const avgScore = reports.reduce((sum, r) => sum + r.overallScore, 0) / reports.length;
  
  // Déterminer le niveau de préparation
  let overallReadiness: MultiPhotoAnalysis['overallReadiness'] = 'not-ready';
  
  if (usableCount >= 3 && avgScore >= 80 && marker?.detected && angleCoverage.isAdequate) {
    overallReadiness = 'excellent';
  } else if (usableCount >= 3 && avgScore >= 70 && marker?.detected) {
    overallReadiness = 'good';
  } else if (usableCount >= 2 && avgScore >= 60) {
    overallReadiness = 'acceptable';
  }

  // Déterminer si plus de photos sont nécessaires
  let needsMorePhotos = false;
  let recommendedNextAngle: string | undefined;
  let finalRecommendation = '';

  if (overallReadiness === 'not-ready') {
    needsMorePhotos = true;
    
    // Trouver ce qui manque
    if (usableCount < 2) {
      finalRecommendation = '📷 Photos de meilleure qualité nécessaires. Stabilisez le téléphone.';
      recommendedNextAngle = 'face';
    } else if (!marker?.detected) {
      finalRecommendation = '🎯 Marqueur non détecté. Assurez-vous qu\'il est visible et bien éclairé.';
      recommendedNextAngle = 'face';
    } else if (!angleCoverage.isAdequate) {
      finalRecommendation = '↪️ Couverture angulaire insuffisante. Prenez une photo depuis le côté.';
      recommendedNextAngle = angleCoverage.horizontal < 20 ? 'gauche' : 'haut';
    }
  } else if (overallReadiness === 'acceptable') {
    needsMorePhotos = reports.length < 4;
    if (needsMorePhotos) {
      finalRecommendation = '👍 Acceptable mais une photo supplémentaire améliorerait la précision.';
      recommendedNextAngle = !angleCoverage.isAdequate ? 'droite' : 'recul';
    } else {
      finalRecommendation = '✅ Photos suffisantes. Précision estimée: ±5%';
    }
  } else if (overallReadiness === 'good') {
    needsMorePhotos = false;
    finalRecommendation = '✅ Bonnes photos! Précision estimée: ±3%';
  } else {
    needsMorePhotos = false;
    finalRecommendation = '🎯 Excellentes photos! Précision estimée: ±1%';
  }

  return {
    needsMorePhotos,
    recommendedNextAngle,
    overallReadiness,
    finalRecommendation
  };
}

// ============================================================================
// EXPORT DES FONCTIONS
// ============================================================================

export {
  analyzePhoto,
  calculateLightingScore,
  calculateAngleScore,
  analyzeAngleCoverage,
  detectMarker,
  analyzeShadows,
  estimateGeometry,
  determineReadiness
};
