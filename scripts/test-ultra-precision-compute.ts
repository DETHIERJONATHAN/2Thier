import { computeUltraPrecisionHomography, type Point2D } from '../src/utils/ultra-precision-ransac';

type H3 = number[][];

function applyHomography(H: H3, p: Point2D): Point2D {
  const numX = H[0][0] * p.x + H[0][1] * p.y + H[0][2];
  const numY = H[1][0] * p.x + H[1][1] * p.y + H[1][2];
  const denom = H[2][0] * p.x + H[2][1] * p.y + H[2][2];
  return { x: numX / denom, y: numY / denom };
}

function dist(a: Point2D, b: Point2D): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function jitter(rng: () => number, amplitude: number): number {
  return (rng() * 2 - 1) * amplitude;
}

function main() {
  // Homographie synthétique (px -> mm) avec une légère perspective
  const Htrue: H3 = [
    [0.22, 0.01, 15],
    [0.005, 0.205, 8],
    [0.00002, 0.000015, 1],
  ];

  const rng = mulberry32(42);

  // Points src (pixels)
  const srcPoints: Point2D[] = [];
  for (let i = 0; i < 16; i++) {
    const x = 200 + rng() * 700;
    const y = 150 + rng() * 1100;
    srcPoints.push({ x, y });
  }

  // dst = Htrue(src) + bruit (en mm)
  const dstPoints: Point2D[] = srcPoints.map((p) => {
    const mm = applyHomography(Htrue, p);
    return {
      x: mm.x + jitter(rng, 0.35),
      y: mm.y + jitter(rng, 0.35),
    };
  });

  // Injecter quelques outliers (mauvais matching)
  const outlierIndices = [2, 9, 13];
  for (const idx of outlierIndices) {
    dstPoints[idx] = {
      x: dstPoints[idx].x + 30 + rng() * 40,
      y: dstPoints[idx].y - 25 - rng() * 35,
    };
  }

  // Marker dims (mm) - utilisés pour les estimations 3D, pas critique ici
  const markerWidthMm = 130;
  const markerHeightMm = 217;

  const result = computeUltraPrecisionHomography(srcPoints, dstPoints, markerWidthMm, markerHeightMm);

  // Simuler objectPoints: rectangle en pixels -> dimensions mm via H estimée
  const objectPoints: Point2D[] = [
    { x: 300, y: 300 },
    { x: 780, y: 300 },
    { x: 780, y: 980 },
    { x: 300, y: 980 },
  ];

  const tl = applyHomography(result.homography, objectPoints[0]);
  const tr = applyHomography(result.homography, objectPoints[1]);
  const br = applyHomography(result.homography, objectPoints[2]);
  const bl = applyHomography(result.homography, objectPoints[3]);

  const widthMm = (dist(tl, tr) + dist(bl, br)) / 2;
  const heightMm = (dist(tl, bl) + dist(tr, br)) / 2;

  // Valeur attendue approx en appliquant Htrue
  const tlTrue = applyHomography(Htrue, objectPoints[0]);
  const trTrue = applyHomography(Htrue, objectPoints[1]);
  const brTrue = applyHomography(Htrue, objectPoints[2]);
  const blTrue = applyHomography(Htrue, objectPoints[3]);

  const widthMmTrue = (dist(tlTrue, trTrue) + dist(blTrue, brTrue)) / 2;
  const heightMmTrue = (dist(tlTrue, blTrue) + dist(trTrue, brTrue)) / 2;

  console.log('\n=== ULTRA-PRECISION COMPUTE (synthetic) ===');
  console.log(`Points: ${srcPoints.length} (outliers injected: ${outlierIndices.length})`);
  console.log(`Inliers: ${result.inlierCount}/${srcPoints.length} | outliers: ${result.outlierCount}`);
  console.log(`Quality: ${result.quality.toFixed(1)} | Confidence: ${result.confidence.toFixed(1)}`);
  console.log(`Reproj error: ${result.reprojectionErrorMm.toFixed(3)} mm (≈ ${result.reprojectionError.toFixed(3)} px)`);
  console.log(`Depth: ${result.depthMean.toFixed(0)} ± ${result.depthStdDev.toFixed(0)} mm | incline: ${result.inclineAngle.toFixed(2)}°`);
  console.log(`Object (est): ${widthMm.toFixed(2)}mm × ${heightMm.toFixed(2)}mm`);
  console.log(`Object (true): ${widthMmTrue.toFixed(2)}mm × ${heightMmTrue.toFixed(2)}mm`);
  console.log(`Δ: ${(widthMm - widthMmTrue).toFixed(2)}mm, ${(heightMm - heightMmTrue).toFixed(2)}mm`);
  console.log('========================================\n');
}

main();
