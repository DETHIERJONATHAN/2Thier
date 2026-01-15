/**
 * 🔬 LEGACY WRAPPER - RANSAC Ultra-Précision
 *
 * Ce fichier a existé comme implémentation “standalone”. Pour éviter d'avoir 2
 * algorithmes divergents, il délègue désormais vers l'implémentation canonique:
 * `src/utils/ultra-precision-ransac.ts`.
 *
 * Gardé pour compatibilité et pour que la documentation historique reste valide.
 */

import {
  computeUltraPrecisionHomography as computeUltraPrecisionHomographyV2,
  type Point2D as Point2DV2,
  type UltraPrecisionResult,
} from './ultra-precision-ransac';

export interface Point2D {
  x: number;
  y: number;
}

export interface UltraPrecisionPoint {
  pixelPos: Point2D;
  realPos: Point2D;
  type: 'apriltag' | 'apriltag-corner' | 'dot';
  confidence: number;
}

export interface RANSACResult {
  homography: number[][];
  quality: number;
  inliersCount: number;
  inliersPercent: number;
  reprojectionErrorMm: number;
  depthEstimate: number;
  depthVariation: number;
  inclineAngle: number;
  errorAnalysis: {
    localPerspectiveError: number;
    depthVariationError: number;
    globalError: number;
  };
}

const DEFAULT_MARKER_WIDTH_MM = 130;
const DEFAULT_MARKER_HEIGHT_MM = 217;

export function computeUltraPrecisionHomography(points: UltraPrecisionPoint[]): RANSACResult {
  const srcPoints: Point2DV2[] = points.map((p) => ({ x: p.pixelPos.x, y: p.pixelPos.y }));
  const dstPoints: Point2DV2[] = points.map((p) => ({ x: p.realPos.x, y: p.realPos.y }));

  const result: UltraPrecisionResult = computeUltraPrecisionHomographyV2(
    srcPoints,
    dstPoints,
    DEFAULT_MARKER_WIDTH_MM,
    DEFAULT_MARKER_HEIGHT_MM
  );

  const inliersPercent = points.length > 0 ? (result.inlierCount / points.length) * 100 : 0;
  const globalError = Math.sqrt(
    Math.pow(result.reprojectionErrorMm ?? 0, 2) + Math.pow(result.depthStdDev ?? 0, 2)
  );

  return {
    homography: result.homography,
    quality: result.quality,
    inliersCount: result.inlierCount,
    inliersPercent,
    reprojectionErrorMm: result.reprojectionErrorMm,
    depthEstimate: result.depthMean,
    depthVariation: result.depthStdDev,
    inclineAngle: result.inclineAngle,
    errorAnalysis: {
      localPerspectiveError: result.reprojectionErrorMm,
      depthVariationError: result.depthStdDev,
      globalError,
    },
  };
}
