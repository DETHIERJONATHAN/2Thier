/**
 * 📐 MÉTRÉ A4 V10 — DÉTECTEUR (6 petits tags 5cm + 1 tag 10cm)
 *
 * - 3 tags 5cm en haut (gauche / centre / droite)
 * - 3 tags 5cm en bas (gauche / centre / droite)
 * - 1 tag 10cm centré, décalé vers le bas
 *
 * Référence: feuille A4 (210×297mm)
 * Marges: haut 10mm, gauche/droite 15mm, bas 30mm
 */
import { detectAprilTagsMetreA4, type AprilTagDetectionResult } from './apriltag-detector-server';
import { computeHomography, applyHomography } from '../utils/homographyUtils';

export interface Point2D {
  x: number;
  y: number;
}

export const METRE_A4_V10_SPECS = {
  version: 'A4-CALIB-V10',
  sheet: {
    width_mm: 210,
    height_mm: 297
  },
  margins_mm: {
    top: 10,
    left: 15,
    right: 15,
    bottom: 30
  },
  smallTag: {
    size_mm: 50,
    centers_mm: {
      topLeft: { x: 40, y: 35 },
      topCenter: { x: 105, y: 35 },
      topRight: { x: 170, y: 35 },
      bottomLeft: { x: 40, y: 240 },
      bottomCenter: { x: 105, y: 240 },
      bottomRight: { x: 170, y: 240 }
    }
  },
  largeTag: {
    size_mm: 100,
    center_mm: { x: 105, y: 150 }
  },
  reference: {
    width_mm: 130,
    height_mm: 205,
    width_cm: 13.0,
    height_cm: 20.5
  }
} as const;

export interface MetreA4V10DetectionResult {
  success: boolean;
  detectionMethod: 'Metre-A4-V10';
  fallbackMode?: 'largeTagOnly';
  warnings?: string[];
  fusedCorners: {
    topLeft: Point2D;
    topRight: Point2D;
    bottomRight: Point2D;
    bottomLeft: Point2D;
  };
  largeTagCorners: Point2D[];
  tagCenters: {
    topLeft: Point2D;
    topCenter: Point2D;
    topRight: Point2D;
    bottomLeft: Point2D;
    bottomCenter: Point2D;
    bottomRight: Point2D;
    center: Point2D;
  };
  homography: {
    matrix: number[][];
    quality: number;
    reprojectionErrorMm: number;
  };
  sizesPx: {
    largeTag: number;
    smallTags: number[];
  };
}

const avgSidePx = (tag: AprilTagDetectionResult): number => {
  const [c0, c1, c2, c3] = tag.corners;
  const d = (a: Point2D, b: Point2D) => Math.hypot(b.x - a.x, b.y - a.y);
  const sides = [d(c0, c1), d(c1, c2), d(c2, c3), d(c3, c0)];
  return sides.reduce((sum, v) => sum + v, 0) / sides.length;
};

const sortByY = (a: AprilTagDetectionResult, b: AprilTagDetectionResult) => a.center.y - b.center.y;
const sortByX = (a: AprilTagDetectionResult, b: AprilTagDetectionResult) => a.center.x - b.center.x;

type Line = { a: number; b: number; c: number }; // ax + by + c = 0 (normée)

function fitLine(points: Point2D[]): Line {
  if (points.length === 2) {
    const [p1, p2] = points;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const length = Math.hypot(dx, dy) || 1;
    const a = -dy / length;
    const b = dx / length;
    const c = -(a * p1.x + b * p1.y);
    return { a, b, c };
  }

  const meanX = points.reduce((s, p) => s + p.x, 0) / points.length;
  const meanY = points.reduce((s, p) => s + p.y, 0) / points.length;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const p of points) {
    const dx = p.x - meanX;
    const dy = p.y - meanY;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }

  const theta = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const vx = Math.cos(theta);
  const vy = Math.sin(theta);
  const a = -vy;
  const b = vx;
  const norm = Math.hypot(a, b) || 1;
  const na = a / norm;
  const nb = b / norm;
  const c = -(na * meanX + nb * meanY);
  return { a: na, b: nb, c };
}

function intersectLines(l1: Line, l2: Line): Point2D {
  const det = l1.a * l2.b - l2.a * l1.b;
  if (Math.abs(det) < 1e-6) {
    return { x: 0, y: 0 };
  }
  const x = (l2.b * -l1.c - l1.b * -l2.c) / det;
  const y = (l1.a * -l2.c - l2.a * -l1.c) / det;
  return { x, y };
}

function computeReprojectionErrorMm(
  homography: number[][],
  points: Array<{ pixel: Point2D; real: Point2D }>
): number {
  if (points.length === 0) return 0;
  const errors = points.map((p) => {
    const [rx, ry] = applyHomography(homography, [p.pixel.x, p.pixel.y]);
    const dx = rx - p.real.x;
    const dy = ry - p.real.y;
    return Math.hypot(dx, dy);
  });
  const mean = errors.reduce((s, v) => s + v, 0) / errors.length;
  return mean;
}

type PointPair = { pixel: Point2D; real: Point2D };

function buildCornerPairs(
  tag: AprilTagDetectionResult,
  centerMm: Point2D,
  sizeMm: number
): PointPair[] {
  const half = sizeMm / 2;
  const realCorners: Point2D[] = [
    { x: centerMm.x - half, y: centerMm.y - half },
    { x: centerMm.x + half, y: centerMm.y - half },
    { x: centerMm.x + half, y: centerMm.y + half },
    { x: centerMm.x - half, y: centerMm.y + half }
  ];

  return tag.corners.map((corner, idx) => ({
    pixel: { x: corner.x, y: corner.y },
    real: realCorners[idx] || realCorners[0]
  }));
}

function buildCenterPair(tag: AprilTagDetectionResult, centerMm: Point2D): PointPair {
  return { pixel: { x: tag.center.x, y: tag.center.y }, real: centerMm };
}

function ransacHomography(points: PointPair[], iterations = 200, thresholdMm = 3) {
  if (points.length < 4) return null;

  let bestInliers: PointPair[] = [];
  let bestMatrix: number[][] | null = null;

  for (let i = 0; i < iterations; i++) {
    const sample = [] as PointPair[];
    const used = new Set<number>();
    while (sample.length < 4) {
      const idx = Math.floor(Math.random() * points.length);
      if (!used.has(idx)) {
        used.add(idx);
        sample.push(points[idx]);
      }
    }

    try {
      const src = sample.map((p) => [p.pixel.x, p.pixel.y]) as [number, number][];
      const dst = sample.map((p) => [p.real.x, p.real.y]) as [number, number][];
      const homography = computeHomography(src, dst);
      const inliers = points.filter((p) => {
        const [rx, ry] = applyHomography(homography.matrix, [p.pixel.x, p.pixel.y]);
        const err = Math.hypot(rx - p.real.x, ry - p.real.y);
        return err <= thresholdMm;
      });

      if (inliers.length > bestInliers.length) {
        bestInliers = inliers;
        bestMatrix = homography.matrix;
      }
    } catch {
      // ignore
    }
  }

  if (!bestMatrix) return null;
  return {
    matrix: bestMatrix,
    inliers: bestInliers.length,
    total: points.length
  };
}

function buildFallbackFromLargeTag(
  largeTag: AprilTagDetectionResult,
  largeSizePx: number
): MetreA4V10DetectionResult | null {
  try {
    console.log('⚠️ [V10] Fallback: grand tag seul (prédiction des petits tags)');

    const halfLarge = METRE_A4_V10_SPECS.largeTag.size_mm / 2;
    const largeCenterMm = METRE_A4_V10_SPECS.largeTag.center_mm;

    const largeRealCorners: [number, number][] = [
      [largeCenterMm.x - halfLarge, largeCenterMm.y - halfLarge],
      [largeCenterMm.x + halfLarge, largeCenterMm.y - halfLarge],
      [largeCenterMm.x + halfLarge, largeCenterMm.y + halfLarge],
      [largeCenterMm.x - halfLarge, largeCenterMm.y + halfLarge]
    ];

    const largePixelCorners: [number, number][] = largeTag.corners.map((c) => [c.x, c.y]) as [number, number][];

    const realToPixel = computeHomography(largeRealCorners, largePixelCorners);

    const predict = (p: Point2D): Point2D => {
      const [x, y] = applyHomography(realToPixel.matrix, [p.x, p.y]);
      return { x, y };
    };

    const predictedCenters = {
      topLeft: predict(METRE_A4_V10_SPECS.smallTag.centers_mm.topLeft),
      topCenter: predict(METRE_A4_V10_SPECS.smallTag.centers_mm.topCenter),
      topRight: predict(METRE_A4_V10_SPECS.smallTag.centers_mm.topRight),
      bottomLeft: predict(METRE_A4_V10_SPECS.smallTag.centers_mm.bottomLeft),
      bottomCenter: predict(METRE_A4_V10_SPECS.smallTag.centers_mm.bottomCenter),
      bottomRight: predict(METRE_A4_V10_SPECS.smallTag.centers_mm.bottomRight)
    };

    const topLine = fitLine([predictedCenters.topLeft, predictedCenters.topCenter, predictedCenters.topRight]);
    const bottomLine = fitLine([predictedCenters.bottomLeft, predictedCenters.bottomCenter, predictedCenters.bottomRight]);
    const leftLine = fitLine([predictedCenters.topLeft, predictedCenters.bottomLeft]);
    const rightLine = fitLine([predictedCenters.topRight, predictedCenters.bottomRight]);

    const fusedCorners = {
      topLeft: intersectLines(topLine, leftLine),
      topRight: intersectLines(topLine, rightLine),
      bottomRight: intersectLines(bottomLine, rightLine),
      bottomLeft: intersectLines(bottomLine, leftLine)
    };

    const dstPoints = [
      [0, 0],
      [METRE_A4_V10_SPECS.reference.width_mm, 0],
      [METRE_A4_V10_SPECS.reference.width_mm, METRE_A4_V10_SPECS.reference.height_mm],
      [0, METRE_A4_V10_SPECS.reference.height_mm]
    ] as [number, number][];

    const srcPoints = [
      [fusedCorners.topLeft.x, fusedCorners.topLeft.y],
      [fusedCorners.topRight.x, fusedCorners.topRight.y],
      [fusedCorners.bottomRight.x, fusedCorners.bottomRight.y],
      [fusedCorners.bottomLeft.x, fusedCorners.bottomLeft.y]
    ] as [number, number][];

    const homography = computeHomography(srcPoints, dstPoints);
    const reprojectionPoints = [
      { pixel: predictedCenters.topLeft, real: METRE_A4_V10_SPECS.smallTag.centers_mm.topLeft },
      { pixel: predictedCenters.topCenter, real: METRE_A4_V10_SPECS.smallTag.centers_mm.topCenter },
      { pixel: predictedCenters.topRight, real: METRE_A4_V10_SPECS.smallTag.centers_mm.topRight },
      { pixel: predictedCenters.bottomLeft, real: METRE_A4_V10_SPECS.smallTag.centers_mm.bottomLeft },
      { pixel: predictedCenters.bottomCenter, real: METRE_A4_V10_SPECS.smallTag.centers_mm.bottomCenter },
      { pixel: predictedCenters.bottomRight, real: METRE_A4_V10_SPECS.smallTag.centers_mm.bottomRight },
      { pixel: largeTag.center, real: METRE_A4_V10_SPECS.largeTag.center_mm }
    ];

    const reprojectionErrorMm = Math.max(5, computeReprojectionErrorMm(homography.matrix, reprojectionPoints));
    const quality = Math.min(60, homography.quality * 0.6);

    return {
      success: true,
      detectionMethod: 'Metre-A4-V10',
      fallbackMode: 'largeTagOnly',
      warnings: ['Grand tag seul détecté - précision dégradée'],
      fusedCorners,
      largeTagCorners: largeTag.corners,
      tagCenters: {
        topLeft: predictedCenters.topLeft,
        topCenter: predictedCenters.topCenter,
        topRight: predictedCenters.topRight,
        bottomLeft: predictedCenters.bottomLeft,
        bottomCenter: predictedCenters.bottomCenter,
        bottomRight: predictedCenters.bottomRight,
        center: largeTag.center
      },
      homography: {
        matrix: homography.matrix,
        quality,
        reprojectionErrorMm
      },
      sizesPx: {
        largeTag: largeSizePx,
        smallTags: Array(6).fill(largeSizePx * 0.5)
      }
    };
  } catch (error) {
    console.error('❌ [V10] Fallback grand tag échoué:', error);
    return null;
  }
}

export async function detectMetreA4V10(
  data: Uint8ClampedArray | Buffer,
  width: number,
  height: number
): Promise<MetreA4V10DetectionResult | null> {
  const detectedTags = await detectAprilTagsMetreA4(data, width, height);

  if (!detectedTags.length) {
    console.log('   ❌ [V10] Aucun AprilTag détecté');
    return null;
  }

  const tagsWithSize = detectedTags.map((tag) => ({ tag, size: avgSidePx(tag) }));
  const sortedBySize = [...tagsWithSize].sort((a, b) => b.size - a.size);

  const largest = sortedBySize[0];
  if (!largest) return null;

  const largeTag = largest.tag;
  const largeSize = largest.size;
  const smallTarget = largeSize * 0.5;

  const smallCandidates = sortedBySize
    .slice(1)
    .filter(({ size }) => size >= largeSize * 0.35 && size <= largeSize * 0.7)
    .sort((a, b) => Math.abs(a.size - smallTarget) - Math.abs(b.size - smallTarget))
    .slice(0, 6);

  if (smallCandidates.length < 6) {
    console.log(`   ⚠️ [V10] Seulement ${smallCandidates.length}/6 petits tags détectés`);
    const fallback = buildFallbackFromLargeTag(largeTag, largeSize);
    return fallback;
  }

  const smallTags = smallCandidates.map(({ tag }) => tag);

  const sortedByRow = [...smallTags].sort(sortByY);
  const topRow = sortedByRow.slice(0, 3).sort(sortByX);
  const bottomRow = sortedByRow.slice(3, 6).sort(sortByX);

  const [topLeft, topCenter, topRight] = topRow;
  const [bottomLeft, bottomCenter, bottomRight] = bottomRow;

  if (!topLeft || !topCenter || !topRight || !bottomLeft || !bottomCenter || !bottomRight) {
    console.log('   ❌ [V10] Impossible de classer les 6 tags en lignes');
    return null;
  }

  const topLine = fitLine([topLeft.center, topCenter.center, topRight.center]);
  const bottomLine = fitLine([bottomLeft.center, bottomCenter.center, bottomRight.center]);
  const leftLine = fitLine([topLeft.center, bottomLeft.center]);
  const rightLine = fitLine([topRight.center, bottomRight.center]);

  const fusedCorners = {
    topLeft: intersectLines(topLine, leftLine),
    topRight: intersectLines(topLine, rightLine),
    bottomRight: intersectLines(bottomLine, rightLine),
    bottomLeft: intersectLines(bottomLine, leftLine)
  };

  const dstPoints = [
    [0, 0],
    [METRE_A4_V10_SPECS.reference.width_mm, 0],
    [METRE_A4_V10_SPECS.reference.width_mm, METRE_A4_V10_SPECS.reference.height_mm],
    [0, METRE_A4_V10_SPECS.reference.height_mm]
  ] as [number, number][];

  const srcPoints = [
    [fusedCorners.topLeft.x, fusedCorners.topLeft.y],
    [fusedCorners.topRight.x, fusedCorners.topRight.y],
    [fusedCorners.bottomRight.x, fusedCorners.bottomRight.y],
    [fusedCorners.bottomLeft.x, fusedCorners.bottomLeft.y]
  ] as [number, number][];

  const pointPairs: PointPair[] = [
    buildCenterPair(topLeft, METRE_A4_V10_SPECS.smallTag.centers_mm.topLeft),
    buildCenterPair(topCenter, METRE_A4_V10_SPECS.smallTag.centers_mm.topCenter),
    buildCenterPair(topRight, METRE_A4_V10_SPECS.smallTag.centers_mm.topRight),
    buildCenterPair(bottomLeft, METRE_A4_V10_SPECS.smallTag.centers_mm.bottomLeft),
    buildCenterPair(bottomCenter, METRE_A4_V10_SPECS.smallTag.centers_mm.bottomCenter),
    buildCenterPair(bottomRight, METRE_A4_V10_SPECS.smallTag.centers_mm.bottomRight),
    buildCenterPair(largeTag, METRE_A4_V10_SPECS.largeTag.center_mm),
    ...buildCornerPairs(topLeft, METRE_A4_V10_SPECS.smallTag.centers_mm.topLeft, METRE_A4_V10_SPECS.smallTag.size_mm),
    ...buildCornerPairs(topCenter, METRE_A4_V10_SPECS.smallTag.centers_mm.topCenter, METRE_A4_V10_SPECS.smallTag.size_mm),
    ...buildCornerPairs(topRight, METRE_A4_V10_SPECS.smallTag.centers_mm.topRight, METRE_A4_V10_SPECS.smallTag.size_mm),
    ...buildCornerPairs(bottomLeft, METRE_A4_V10_SPECS.smallTag.centers_mm.bottomLeft, METRE_A4_V10_SPECS.smallTag.size_mm),
    ...buildCornerPairs(bottomCenter, METRE_A4_V10_SPECS.smallTag.centers_mm.bottomCenter, METRE_A4_V10_SPECS.smallTag.size_mm),
    ...buildCornerPairs(bottomRight, METRE_A4_V10_SPECS.smallTag.centers_mm.bottomRight, METRE_A4_V10_SPECS.smallTag.size_mm),
    ...buildCornerPairs(largeTag, METRE_A4_V10_SPECS.largeTag.center_mm, METRE_A4_V10_SPECS.largeTag.size_mm)
  ];

  const ransac = ransacHomography(pointPairs, 200, 3);
  const homography = ransac
    ? { matrix: ransac.matrix, quality: (ransac.inliers / ransac.total) * 100 }
    : computeHomography(srcPoints, dstPoints);

  const reprojectionPoints = [
    { pixel: topLeft.center, real: METRE_A4_V10_SPECS.smallTag.centers_mm.topLeft },
    { pixel: topCenter.center, real: METRE_A4_V10_SPECS.smallTag.centers_mm.topCenter },
    { pixel: topRight.center, real: METRE_A4_V10_SPECS.smallTag.centers_mm.topRight },
    { pixel: bottomLeft.center, real: METRE_A4_V10_SPECS.smallTag.centers_mm.bottomLeft },
    { pixel: bottomCenter.center, real: METRE_A4_V10_SPECS.smallTag.centers_mm.bottomCenter },
    { pixel: bottomRight.center, real: METRE_A4_V10_SPECS.smallTag.centers_mm.bottomRight },
    { pixel: largeTag.center, real: METRE_A4_V10_SPECS.largeTag.center_mm }
  ];

  const reprojectionErrorMm = computeReprojectionErrorMm(homography.matrix, reprojectionPoints);

  return {
    success: true,
    detectionMethod: 'Metre-A4-V10',
    warnings: [],
    fusedCorners,
    largeTagCorners: largeTag.corners,
    tagCenters: {
      topLeft: topLeft.center,
      topCenter: topCenter.center,
      topRight: topRight.center,
      bottomLeft: bottomLeft.center,
      bottomCenter: bottomCenter.center,
      bottomRight: bottomRight.center,
      center: largeTag.center
    },
    homography: {
      matrix: homography.matrix,
      quality: homography.quality,
      reprojectionErrorMm
    },
    sizesPx: {
      largeTag: largeSize,
      smallTags: smallCandidates.map(({ size }) => size)
    }
  };
}
