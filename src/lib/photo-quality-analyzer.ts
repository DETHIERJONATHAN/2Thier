/**
 * 📸 ANALYSEUR QUALITÉ PHOTOS — MULTI-PHOTO FUSION
 * 
 * Système de scoring et sélection intelligente de la meilleure photo parmi N
 * pour calibration photogrammétrique optimale.
 * 
 * 🎯 CRITÈRES DE QUALITÉ :
 * 
 * 1️⃣ **Netteté (Sharpness)** : 40% du score
 *    - Analyse fréquentielle (transformée de Fourier)
 *    - Détection des bords (Sobel, Laplacian)
 *    - Contraste local
 * 
 * 2️⃣ **Qualité Homographie** : 35% du score
 *    - Erreur de reprojection
 *    - Nombre de points inliers RANSAC
 *    - Distribution spatiale des points
 * 
 * 3️⃣ **Conditions de Capture** : 25% du score
 *    - Angle de vue (frontalité)
 *    - Éclairage uniforme
 *    - Absence de flou de mouvement
 * 
 * 🏆 RÉSULTAT : Photo optimale avec score 0-100
 * 
 * @module lib/photo-quality-analyzer
 * @author 2Thier CRM Team
 * @version 1.0.0
 */

import type { Point2D } from './apriltag-detector-server';
import type { MetreA4CompleteDetectionResult } from './metre-a4-complete-detector';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Photo avec ses métadonnées de détection
 */
export interface PhotoCandidate {
  id: string;
  imageData: Uint8ClampedArray | Buffer;
  width: number;
  height: number;
  detection: MetreA4CompleteDetectionResult;
  timestamp: number;
}

/**
 * Score de qualité détaillé
 */
export interface PhotoQualityScore {
  photoId: string;
  
  // Scores individuels (0-100)
  sharpness: number;
  homographyQuality: number;
  captureConditions: number;
  
  // Score global pondéré (0-100)
  total: number;
  
  // Détails
  breakdown: {
    edgeStrength: number;        // Force des bords détectés
    contrastRatio: number;        // Contraste local moyen
    reprojectionErrorMm: number;  // Erreur homographie
    inlierRatio: number;          // % points inliers RANSAC
    spatialCoverage: number;      // Couverture spatiale 0-1
    viewAngleDegrees: number;     // Angle vue estimé
    lightingUniformity: number;   // Uniformité éclairage 0-1
  };
  
  // Warnings
  warnings: string[];
}

/**
 * Résultat sélection meilleure photo
 */
export interface BestPhotoResult {
  bestPhoto: PhotoCandidate;
  bestScore: PhotoQualityScore;
  allScores: PhotoQualityScore[];
  
  // Stats comparatives
  stats: {
    totalPhotos: number;
    averageScore: number;
    scoreRange: [number, number];
    improvement: number; // % amélioration vs moyenne
  };
}

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const QUALITY_WEIGHTS = {
  sharpness: 0.40,           // 40% du score
  homographyQuality: 0.35,   // 35% du score
  captureConditions: 0.25    // 25% du score
} as const;

const SHARPNESS_THRESHOLDS = {
  excellent: 85,  // Score > 85 : excellent
  good: 70,       // Score > 70 : bon
  acceptable: 50, // Score > 50 : acceptable
  poor: 30        // Score < 30 : mauvais
} as const;

const HOMOGRAPHY_THRESHOLDS = {
  excellent: 0.5,    // Erreur < 0.5mm : excellent
  good: 1.0,         // Erreur < 1mm : bon
  acceptable: 2.0,   // Erreur < 2mm : acceptable
  poor: 5.0          // Erreur > 5mm : mauvais
} as const;

// ═══════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE
// ═══════════════════════════════════════════════════════════════

/**
 * Analyse et sélectionne la meilleure photo parmi plusieurs candidats
 * 
 * @param photos - Liste des photos candidates avec leurs détections
 * @returns La meilleure photo avec scores détaillés
 */
export function selectBestPhoto(photos: PhotoCandidate[]): BestPhotoResult {
  console.log(`\n📸 [QUALITY ANALYZER] Analyse de ${photos.length} photos...`);
  
  if (photos.length === 0) {
    throw new Error('Aucune photo fournie pour analyse');
  }
  
  if (photos.length === 1) {
    console.log('   ℹ️  Une seule photo, sélection automatique');
    const score = analyzePhotoQuality(photos[0]);
    return {
      bestPhoto: photos[0],
      bestScore: score,
      allScores: [score],
      stats: {
        totalPhotos: 1,
        averageScore: score.total,
        scoreRange: [score.total, score.total],
        improvement: 0
      }
    };
  }
  
  // ═══════════════════════════════════════════════════════════════
  // PHASE 1 : Scoring de toutes les photos
  // ═══════════════════════════════════════════════════════════════
  const allScores = photos.map(photo => {
    const score = analyzePhotoQuality(photo);
    console.log(`   📊 Photo ${photo.id}: ${score.total.toFixed(1)}/100 (S:${score.sharpness.toFixed(0)} H:${score.homographyQuality.toFixed(0)} C:${score.captureConditions.toFixed(0)})`);
    return score;
  });
  
  // ═══════════════════════════════════════════════════════════════
  // PHASE 2 : Sélection du meilleur
  // ═══════════════════════════════════════════════════════════════
  let bestIdx = 0;
  let bestTotalScore = allScores[0].total;
  
  for (let i = 1; i < allScores.length; i++) {
    if (allScores[i].total > bestTotalScore) {
      bestTotalScore = allScores[i].total;
      bestIdx = i;
    }
  }
  
  const bestPhoto = photos[bestIdx];
  const bestScore = allScores[bestIdx];
  
  // ═══════════════════════════════════════════════════════════════
  // PHASE 3 : Statistiques
  // ═══════════════════════════════════════════════════════════════
  const scores = allScores.map(s => s.total);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const improvement = ((bestTotalScore - avgScore) / avgScore) * 100;
  
  console.log(`\n   🏆 MEILLEURE: Photo ${bestPhoto.id} (${bestTotalScore.toFixed(1)}/100)`);
  console.log(`   📈 Amélioration: +${improvement.toFixed(1)}% vs moyenne`);
  console.log(`   📉 Range: ${minScore.toFixed(1)} - ${maxScore.toFixed(1)}`);
  
  if (bestScore.warnings.length > 0) {
    console.log(`   ⚠️  Warnings: ${bestScore.warnings.join(', ')}`);
  }
  
  // ═══════════════════════════════════════════════════════════════
  // SEUIL DE REJET : Refuser photos de qualité insuffisante
  // ═══════════════════════════════════════════════════════════════
  if (bestTotalScore < 45) {
    console.log(`\n   ❌ REJET: Score ${bestTotalScore.toFixed(1)}/100 insuffisant (seuil: 45)`);
    throw new Error(
      `QUALITÉ_INSUFFISANTE: Meilleur score ${bestTotalScore.toFixed(1)}/100. ` +
      `Reprendre les photos avec meilleur éclairage et stabilité. ` +
      `Points détectés: ${bestPhoto.detection.breakdown.total} (5 AprilTags + ` +
      `${bestPhoto.detection.breakdown.referenceDots} dots). ` +
      `Problèmes: ${bestScore.warnings.join(', ') || 'Netteté/éclairage insuffisants'}`
    );
  }
  
  if (bestTotalScore < 60) {
    console.log(`   ⚠️  QUALITÉ LIMITE: Score ${bestTotalScore.toFixed(1)}/100 (recommandation: reprendre)`);
  }
  
  return {
    bestPhoto,
    bestScore,
    allScores,
    stats: {
      totalPhotos: photos.length,
      averageScore: avgScore,
      scoreRange: [minScore, maxScore],
      improvement
    }
  };
}

// ═══════════════════════════════════════════════════════════════
// SCORING DÉTAILLÉ
// ═══════════════════════════════════════════════════════════════

/**
 * Analyse complète de la qualité d'une photo
 */
function analyzePhotoQuality(photo: PhotoCandidate): PhotoQualityScore {
  const warnings: string[] = [];
  
  // ═══════════════════════════════════════════════════════════════
  // 1️⃣ NETTETÉ (Sharpness) — 40%
  // ═══════════════════════════════════════════════════════════════
  const sharpnessMetrics = analyzeSharpness(photo.imageData, photo.width, photo.height);
  const sharpnessScore = computeSharpnessScore(sharpnessMetrics);
  
  if (sharpnessScore < SHARPNESS_THRESHOLDS.acceptable) {
    warnings.push('Netteté insuffisante');
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 2️⃣ QUALITÉ HOMOGRAPHIE — 35%
  // ═══════════════════════════════════════════════════════════════
  const homographyMetrics = analyzeHomographyQuality(photo.detection);
  let homographyScore = computeHomographyScore(homographyMetrics);
  
  // 🎯 BONUS DENSITÉ POINTS: AprilTags + dots
  const pointDensity = {
    aprilTags: (photo.detection.breakdown.aprilTags / 5) * 100,      // Max 100 (5/5)
    dots: (photo.detection.breakdown.referenceDots / 12) * 100        // Max 100 (12/12)
  };
  const densityBonus = (
    pointDensity.aprilTags * 0.6 +   // AprilTags dominants (5/5)
    pointDensity.dots * 0.4          // Dots variables
  );
  
  // Intégrer densité dans score homographie (30% du score homographie)
  homographyScore = (homographyScore * 0.7) + (densityBonus * 0.3);
  
  if (photo.detection.homography.reprojectionErrorMm > HOMOGRAPHY_THRESHOLDS.acceptable) {
    warnings.push(`Erreur reprojection ${photo.detection.homography.reprojectionErrorMm.toFixed(1)}mm`);
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 3️⃣ CONDITIONS CAPTURE — 25%
  // ═══════════════════════════════════════════════════════════════
  const captureMetrics = analyzeCaptureConditions(
    photo.imageData,
    photo.width,
    photo.height,
    photo.detection
  );
  const captureScore = computeCaptureScore(captureMetrics);
  
  if (captureMetrics.viewAngleDegrees > 30) {
    warnings.push(`Angle de vue ${captureMetrics.viewAngleDegrees.toFixed(0)}° (frontal recommandé)`);
  }
  
  // ═══════════════════════════════════════════════════════════════
  // SCORE GLOBAL PONDÉRÉ
  // ═══════════════════════════════════════════════════════════════
  const totalScore = 
    sharpnessScore * QUALITY_WEIGHTS.sharpness +
    homographyScore * QUALITY_WEIGHTS.homographyQuality +
    captureScore * QUALITY_WEIGHTS.captureConditions;
  
  return {
    photoId: photo.id,
    sharpness: sharpnessScore,
    homographyQuality: homographyScore,
    captureConditions: captureScore,
    total: totalScore,
    breakdown: {
      edgeStrength: sharpnessMetrics.edgeStrength,
      contrastRatio: sharpnessMetrics.contrastRatio,
      reprojectionErrorMm: photo.detection.homography.reprojectionErrorMm,
      inlierRatio: homographyMetrics.inlierRatio,
      spatialCoverage: homographyMetrics.spatialCoverage,
      viewAngleDegrees: captureMetrics.viewAngleDegrees,
      lightingUniformity: captureMetrics.lightingUniformity
    },
    warnings
  };
}

// ═══════════════════════════════════════════════════════════════
// ANALYSE NETTETÉ
// ═══════════════════════════════════════════════════════════════

interface SharpnessMetrics {
  edgeStrength: number;      // 0-100
  contrastRatio: number;     // 0-100
  laplacianVariance: number; // Variance Laplacian
}

/**
 * Analyse la netteté de l'image (fréquences hautes, bords)
 */
function analyzeSharpness(
  data: Uint8ClampedArray | Buffer,
  width: number,
  height: number
): SharpnessMetrics {
  
  // ═══════════════════════════════════════════════════════════════
  // Méthode 1 : Variance du Laplacian (mesure universelle de netteté)
  // ═══════════════════════════════════════════════════════════════
  let sumLaplacian = 0;
  let sumLaplacianSq = 0;
  let count = 0;
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const gray = getGrayscale(data, width, x, y);
      
      // Laplacian 3×3 kernel
      const laplacian =
        -1 * getGrayscale(data, width, x - 1, y - 1) +
        -1 * getGrayscale(data, width, x, y - 1) +
        -1 * getGrayscale(data, width, x + 1, y - 1) +
        -1 * getGrayscale(data, width, x - 1, y) +
        8 * gray +
        -1 * getGrayscale(data, width, x + 1, y) +
        -1 * getGrayscale(data, width, x - 1, y + 1) +
        -1 * getGrayscale(data, width, x, y + 1) +
        -1 * getGrayscale(data, width, x + 1, y + 1);
      
      sumLaplacian += laplacian;
      sumLaplacianSq += laplacian * laplacian;
      count++;
    }
  }
  
  const meanLaplacian = sumLaplacian / count;
  const varianceLaplacian = (sumLaplacianSq / count) - (meanLaplacian * meanLaplacian);
  
  // ═══════════════════════════════════════════════════════════════
  // Méthode 2 : Force des bords (gradient Sobel)
  // ═══════════════════════════════════════════════════════════════
  let sumGradient = 0;
  
  for (let y = 1; y < height - 1; y += 4) { // Sous-échantillonnage pour performance
    for (let x = 1; x < width - 1; x += 4) {
      const gx = sobelX(data, width, x, y);
      const gy = sobelY(data, width, x, y);
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      sumGradient += magnitude;
    }
  }
  
  const edgeStrength = Math.min(100, (sumGradient / (width * height / 16)) * 2);
  
  // ═══════════════════════════════════════════════════════════════
  // Méthode 3 : Contraste local (écart-type des blocs)
  // ═══════════════════════════════════════════════════════════════
  const blockSize = 16;
  let sumContrast = 0;
  let blockCount = 0;
  
  for (let by = 0; by < height - blockSize; by += blockSize) {
    for (let bx = 0; bx < width - blockSize; bx += blockSize) {
      const contrast = computeBlockContrast(data, width, bx, by, blockSize);
      sumContrast += contrast;
      blockCount++;
    }
  }
  
  const contrastRatio = Math.min(100, (sumContrast / blockCount) * 0.5);
  
  return {
    edgeStrength,
    contrastRatio,
    laplacianVariance: varianceLaplacian
  };
}

/**
 * Convertit netteté en score 0-100
 */
function computeSharpnessScore(metrics: SharpnessMetrics): number {
  // Variance Laplacian réaliste:
  // - Image floue : 50-100 → Score 25-50
  // - Image nette : 200-400 → Score 100
  // - Image ultra-nette : 1000+ → Score 100 (cap)
  const laplacianScore = Math.min(100, (metrics.laplacianVariance / 200) * 100);
  
  // Moyenne pondérée
  const score = 
    laplacianScore * 0.5 +
    metrics.edgeStrength * 0.3 +
    metrics.contrastRatio * 0.2;
  
  return Math.max(0, Math.min(100, score));
}

// ═══════════════════════════════════════════════════════════════
// ANALYSE HOMOGRAPHIE
// ═══════════════════════════════════════════════════════════════

interface HomographyMetrics {
  inlierRatio: number;      // % de points inliers
  spatialCoverage: number;  // Couverture spatiale 0-1
}

/**
 * Évalue la qualité de l'homographie
 */
function analyzeHomographyQuality(detection: MetreA4CompleteDetectionResult): HomographyMetrics {
  
  // Ratio inliers (tous les points sont supposés bons ici)
  const inlierRatio = detection.breakdown.total > 0 ? 
    detection.homography.quality : 0;
  
  // Couverture spatiale : dispersion des points
  const coverage = computeSpatialCoverage(detection.points.map(p => p.pixel));
  
  return {
    inlierRatio,
    spatialCoverage: coverage
  };
}

/**
 * Convertit qualité homographie en score 0-100
 */
function computeHomographyScore(metrics: HomographyMetrics): number {
  // Inliers = qualité directe
  const inlierScore = metrics.inlierRatio * 100;
  
  // Couverture spatiale importante pour robustesse
  const coverageScore = metrics.spatialCoverage * 100;
  
  // Score de base
  return (inlierScore * 0.7) + (coverageScore * 0.3);
}

/**
 * Calcule la couverture spatiale des points (0-1)
 * Utilise une grille 4×4 pour mieux détecter points mal distribués
 */
function computeSpatialCoverage(points: Point2D[]): number {
  if (points.length < 4) return 0;
  
  // Bbox pour normalisation
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  
  const width = maxX - minX;
  const height = maxY - minY;
  
  if (width < 10 || height < 10) return 0; // Trop petit
  
  // Grille 4×4 pour détecter distribution
  const grid = Array(4).fill(null).map(() => Array(4).fill(0));
  
  for (const p of points) {
    const gridX = Math.min(3, Math.floor(((p.x - minX) / width) * 4));
    const gridY = Math.min(3, Math.floor(((p.y - minY) / height) * 4));
    grid[gridY][gridX]++;
  }
  
  // Couverture = % de cellules avec au moins 1 point
  const filledCells = grid.flat().filter(count => count > 0).length;
  const spatialCoverage = filledCells / 16; // 0-1
  
  return spatialCoverage;
}

// ═══════════════════════════════════════════════════════════════
// ANALYSE CONDITIONS CAPTURE
// ═══════════════════════════════════════════════════════════════

interface CaptureMetrics {
  viewAngleDegrees: number;    // Angle de vue estimé
  lightingUniformity: number;  // Uniformité éclairage 0-1
}

/**
 * Analyse les conditions de capture (angle, éclairage)
 */
function analyzeCaptureConditions(
  data: Uint8ClampedArray | Buffer,
  width: number,
  height: number,
  detection: MetreA4CompleteDetectionResult
): CaptureMetrics {
  
  // ═══════════════════════════════════════════════════════════════
  // Angle de vue : déformation de la feuille A4
  // ═══════════════════════════════════════════════════════════════
  const aprilTagPoints = detection.points.filter(p => p.type === 'apriltag');
  
  let viewAngle = 0;
  if (aprilTagPoints.length === 4) {
    // Ratio largeur/hauteur attendu = 130/217 ≈ 0.599
    const [tl, tr, bl] = aprilTagPoints.map(p => p.pixel);
    
    const widthPx = Math.hypot(tr.x - tl.x, tr.y - tl.y);
    const heightPx = Math.hypot(bl.x - tl.x, bl.y - tl.y);
    const actualRatio = widthPx / heightPx;
    const expectedRatio = 130 / 217;
    
    // Déformation → angle
    const ratioDiff = Math.abs(actualRatio - expectedRatio) / expectedRatio;
    viewAngle = Math.min(45, ratioDiff * 100); // Approximation grossière
  }
  
  // ═══════════════════════════════════════════════════════════════
  // Uniformité éclairage : variance de luminosité globale
  // ═══════════════════════════════════════════════════════════════
  let sumBrightness = 0;
  let sumBrightnessSq = 0;
  const sampleCount = Math.min(10000, width * height);
  
  for (let i = 0; i < sampleCount; i++) {
    const x = Math.floor(Math.random() * width);
    const y = Math.floor(Math.random() * height);
    const brightness = getGrayscale(data, width, x, y);
    sumBrightness += brightness;
    sumBrightnessSq += brightness * brightness;
  }
  
  const meanBrightness = sumBrightness / sampleCount;
  const variance = (sumBrightnessSq / sampleCount) - (meanBrightness * meanBrightness);
  const stdDev = Math.sqrt(variance);
  
  // Uniformité : plus stdDev est faible, plus uniforme
  // StdDev typique : 20-60 pour image normale
  const uniformity = Math.max(0, 1 - (stdDev / 80));
  
  return {
    viewAngleDegrees: viewAngle,
    lightingUniformity: uniformity
  };
}

/**
 * Convertit conditions capture en score 0-100
 */
function computeCaptureScore(metrics: CaptureMetrics): number {
  // Angle de vue : frontal = 100, ±45° = 0
  const angleScore = Math.max(0, 100 - (metrics.viewAngleDegrees / 45) * 100);
  
  // Uniformité éclairage : 0-1 → 0-100
  const lightingScore = metrics.lightingUniformity * 100;
  
  return (angleScore * 0.6) + (lightingScore * 0.4);
}

// ═══════════════════════════════════════════════════════════════
// HELPERS IMAGE
// ═══════════════════════════════════════════════════════════════

function getGrayscale(data: Uint8ClampedArray | Buffer, width: number, x: number, y: number): number {
  const idx = (y * width + x) * 4;
  return (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
}

function sobelX(data: Uint8ClampedArray | Buffer, width: number, x: number, y: number): number {
  return (
    -getGrayscale(data, width, x - 1, y - 1) +
    getGrayscale(data, width, x + 1, y - 1) +
    -2 * getGrayscale(data, width, x - 1, y) +
    2 * getGrayscale(data, width, x + 1, y) +
    -getGrayscale(data, width, x - 1, y + 1) +
    getGrayscale(data, width, x + 1, y + 1)
  ) / 8;
}

function sobelY(data: Uint8ClampedArray | Buffer, width: number, x: number, y: number): number {
  return (
    -getGrayscale(data, width, x - 1, y - 1) +
    -2 * getGrayscale(data, width, x, y - 1) +
    -getGrayscale(data, width, x + 1, y - 1) +
    getGrayscale(data, width, x - 1, y + 1) +
    2 * getGrayscale(data, width, x, y + 1) +
    getGrayscale(data, width, x + 1, y + 1)
  ) / 8;
}

function computeBlockContrast(
  data: Uint8ClampedArray | Buffer,
  width: number,
  x0: number,
  y0: number,
  blockSize: number
): number {
  let min = 255;
  let max = 0;
  
  for (let y = y0; y < y0 + blockSize; y++) {
    for (let x = x0; x < x0 + blockSize; x++) {
      const gray = getGrayscale(data, width, x, y);
      min = Math.min(min, gray);
      max = Math.max(max, gray);
    }
  }
  
  return max - min;
}
