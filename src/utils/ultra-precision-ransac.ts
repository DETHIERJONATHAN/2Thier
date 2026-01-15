/**
 * 🔬 ULTRA-PRECISION RANSAC + LEVENBERG-MARQUARDT
 * 
 * Calcule l'homographie avec les points détectés (AprilTags + dots + coins AprilTag)
 * en utilisant RANSAC robuste + optimisation non-linéaire Levenberg-Marquardt
 * + estimation de profondeur 3D
 * 
 * OBJECTIF: Réduire l'erreur de ±1cm à ±0.25cm
 * 
 * @author 2Thier CRM Team
 * @version 1.0.0
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number; // Profondeur estimée
  type: 'apriltag' | 'apriltag-corner' | 'dot';
  error?: number; // Erreur reprojection en pixels
}

export interface UltraPrecisionResult {
  homography: number[][];      // Matrice 3×3
  points3D: Point3D[];          // Tous les points avec Z estimée
  quality: number;              // 0-100
  reprojectionError: number;    // Erreur moyenne en pixels
  reprojectionErrorMm: number;  // Erreur en mm
  confidence: number;           // 0-100, basé sur inliers
  inlierCount: number;          // Nombre de points inliers
  outlierCount: number;         // Nombre de points outliers
  depthMean: number;            // Profondeur moyenne (mm)
  depthStdDev: number;          // Écart-type profondeur
  inclineAngle: number;         // Angle d'inclinaison en degrés
  // Debug
  ransacIterations: number;
  bestInlierIndices: number[];
}

/**
 * 🎯 Fonction principale - Calcule homographie ultra-précise avec 41+ points
 */
export function computeUltraPrecisionHomography(
  srcPoints: Point2D[],      // Points pixels détectés (41+)
  dstPoints: Point2D[],      // Points réels mm (41+)
  markerWidthMm: number,
  markerHeightMm: number
): UltraPrecisionResult {
  
  console.log(`\n${'='.repeat(90)}`);
  console.log(`🔬 [ULTRA-PRECISION RANSAC] Calcul homographie avec ${srcPoints.length} points`);
  console.log(`${'='.repeat(90)}`);
  
  if (srcPoints.length < 4 || dstPoints.length < 4) {
    throw new Error(`Minimum 4 points requis, ${srcPoints.length} fournis`);
  }
  
  const maxIterations = Math.min(10000, Math.max(1000, srcPoints.length * 80));

  // L'homographie ici transforme PIXELS -> MM (dst est en mm).
  // Donc l'erreur de reprojection calculée est EN MM.
  const estimatedPxPerMm = estimatePxPerMmFromCorrespondences(srcPoints, dstPoints);
  const mmPerPx = estimatedPxPerMm && estimatedPxPerMm > 0 ? 1 / estimatedPxPerMm : null;
  const inlierThresholdMm = Math.max(2.0, mmPerPx ? 4 * mmPerPx : 2.0);

  // Avec seulement 16 points (4+12), exiger 70% est trop strict.
  const minInliers = srcPoints.length < 30
    ? Math.max(6, Math.floor(srcPoints.length * 0.5))
    : Math.max(12, Math.floor(srcPoints.length * 0.7));
  
  let bestHomography: number[][] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  let bestInlierIndices: number[] = [];
  let bestInlierCount = 0;
  
  // 🎲 RANSAC: tester des sous-ensembles aléatoires de 4 points
  for (let iter = 0; iter < maxIterations; iter++) {
    // Sélectionner 4 points aléatoires
    const indices = randomSampleIndices(srcPoints.length, 4);
    const sample4Src = indices.map(i => srcPoints[i]);
    const sample4Dst = indices.map(i => dstPoints[i]);
    
    // Calculer homographie avec ces 4 points (DLT normalisé + solve)
    try {
      const H = computeHomographyDLT(sample4Src, sample4Dst);
      
      // Compter inliers avec cette homographie
      const inlierIndices: number[] = [];
      for (let i = 0; i < srcPoints.length; i++) {
        const transformed = applyHomography(H, srcPoints[i]);
        const errorMm = distance(transformed, dstPoints[i]);
        if (errorMm < inlierThresholdMm) {
          inlierIndices.push(i);
        }
      }
      
      // Garder la meilleure si plus d'inliers
      if (inlierIndices.length > bestInlierCount) {
        bestInlierCount = inlierIndices.length;
        bestHomography = H;
        bestInlierIndices = inlierIndices;
        
        if (iter % 500 === 0) {
          console.log(`   📊 Itération ${iter}: ${inlierIndices.length}/${srcPoints.length} inliers (seuil=${inlierThresholdMm.toFixed(2)}mm)`);
        }
      }
    } catch {
      // Homographie non calculable avec ces 4 points
      continue; // Homographie non calculable avec ces 4 points
    }
  }
  
  console.log(`\n   ✅ RANSAC: ${bestInlierCount}/${srcPoints.length} inliers après ${maxIterations} itérations`);
  
  // 🔍 DEBUG: Afficher les erreurs de chaque point pour diagnostiquer
  console.log(`\n   🔍 DEBUG - Erreurs de reprojection par point avec homographie initiale:`);
  const debugErrors: { idx: number; error: number; isInlier: boolean }[] = [];
  const previewCount = Math.min(16, srcPoints.length);
  for (let i = 0; i < srcPoints.length; i++) {
    const transformed = applyHomography(bestHomography, srcPoints[i]);
    const errorMm = distance(transformed, dstPoints[i]);
    const isInlier = bestInlierIndices.includes(i);
    debugErrors.push({ idx: i, error: errorMm, isInlier });
    if (i < previewCount) {
      console.log(`      [${i}] ${isInlier ? '✅' : '❌'} pixel:(${srcPoints[i].x.toFixed(0)},${srcPoints[i].y.toFixed(0)}) → real:(${dstPoints[i].x},${dstPoints[i].y}) erreur: ${errorMm.toFixed(1)}mm`);
    }
  }
  const previewErrors = debugErrors.slice(0, previewCount);
  const remainingErrors = debugErrors.slice(previewCount);
  const previewMean = previewErrors.length
    ? previewErrors.reduce((s, e) => s + e.error, 0) / previewErrors.length
    : 0;
  const remainingMean = remainingErrors.length
    ? remainingErrors.reduce((s, e) => s + e.error, 0) / remainingErrors.length
    : 0;
  console.log(`      📊 Aperçu (0-${Math.max(0, previewCount - 1)}): ${previewErrors.filter(e => e.isInlier).length}/${previewErrors.length} inliers, erreur moy: ${previewMean.toFixed(1)}mm`);
  if (remainingErrors.length) {
    console.log(`      📊 Autres points: ${remainingErrors.filter(e => e.isInlier).length}/${remainingErrors.length} inliers, erreur moy: ${remainingMean.toFixed(1)}mm`);
  }
  
  // Vérifier que nous avons assez d'inliers
  if (bestInlierCount < minInliers) {
    console.warn(`   ⚠️  Seulement ${bestInlierCount} inliers, ${minInliers} recommandés`);
  }

  if (bestInlierCount < 4) {
    throw new Error(`RANSAC n'a pas trouvé assez d'inliers (4 requis), obtenu: ${bestInlierCount}`);
  }

  // Refit DLT (moindres carrés) sur les inliers pour stabiliser avant optimisation non-linéaire.
  const inlierSrc = bestInlierIndices.map(i => srcPoints[i]);
  const inlierDst = bestInlierIndices.map(i => dstPoints[i]);
  const dltInlierH = computeHomographyDLTLeastSquares(inlierSrc, inlierDst);
  bestHomography = dltInlierH;
  
  // 🔧 Levenberg-Marquardt: Affiner homographie avec tous les inliers
  let refinedH = bestHomography;
  if (bestInlierCount >= 6) {
    console.log(`\n   🔧 Optimisation Levenberg-Marquardt avec ${bestInlierCount} inliers...`);
    refinedH = levenbergMarquardt(
      bestHomography,
      inlierSrc,
      inlierDst,
      100 // iterations
    );
  } else {
    console.log(`\n   ℹ️  LM ignoré (inliers=${bestInlierCount} < 6), DLT inliers conservé`);
  }
  
  // 📏 Calculer erreur reprojection
  let totalReprojectionError = 0;
  const errors: number[] = [];
  
  for (let i = 0; i < srcPoints.length; i++) {
    const transformed = applyHomography(refinedH, srcPoints[i]);
    const errorMm = distance(transformed, dstPoints[i]);
    errors.push(errorMm);
    totalReprojectionError += errorMm;
  }
  
  const meanReprojectionError = totalReprojectionError / srcPoints.length;
  const stdDevError = Math.sqrt(
    errors.reduce((sum, e) => sum + Math.pow(e - meanReprojectionError, 2), 0) / srcPoints.length
  );
  
  const meanReprojectionErrorMm = meanReprojectionError;
  const stdDevErrorMm = stdDevError;
  const reprojectionErrorPx = estimatedPxPerMm ? meanReprojectionErrorMm * estimatedPxPerMm : meanReprojectionErrorMm;
  console.log(`\n   📏 Erreur reprojection: ${meanReprojectionErrorMm.toFixed(2)}mm (±${stdDevErrorMm.toFixed(2)}mm)`);
  
  // 📐 Estimer profondeur Z des points (3D)
  console.log(`\n   📐 Estimation profondeur 3D...`);
  const points3D = estimateDepthMap(
    srcPoints,
    dstPoints,
    refinedH,
    markerWidthMm,
    markerHeightMm
  );
  
  // Calculer statistiques de profondeur
  const depths = points3D.map(p => p.z);
  const depthMean = depths.reduce((a, b) => a + b, 0) / depths.length;
  const depthStdDev = Math.sqrt(
    depths.reduce((sum, z) => sum + Math.pow(z - depthMean, 2), 0) / depths.length
  );
  
  // Estimer angle d'inclinaison
  const inclineAngle = estimateInclineAngle(points3D);
  
  // Calculer qualité
  const quality = Math.max(0, Math.min(100,
    100 - (meanReprojectionErrorMm * 20 + stdDevErrorMm * 10)
  ));
  
  // Confiance basée sur nombre d'inliers
  const confidence = Math.min(100, (bestInlierCount / srcPoints.length) * 100);
  
  const reprojectionErrorMm = meanReprojectionErrorMm;
  
  console.log(`\n   📊 STATISTIQUES:`);
  console.log(`      Profondeur moyenne: ${depthMean.toFixed(0)}mm`);
  console.log(`      Variation profondeur: ±${depthStdDev.toFixed(0)}mm`);
  console.log(`      Angle inclinaison: ${inclineAngle.toFixed(2)}°`);
  console.log(`      Qualité: ${quality.toFixed(1)}%`);
  console.log(`      Confiance: ${confidence.toFixed(1)}%`);
  console.log(`      Erreur reprojection: ${reprojectionErrorMm.toFixed(2)}mm`);
  
  console.log(`\n${'='.repeat(90)}\n`);
  
  return {
    homography: refinedH,
    points3D,
    quality,
    reprojectionError: reprojectionErrorPx,
    reprojectionErrorMm,
    confidence,
    inlierCount: bestInlierCount,
    outlierCount: srcPoints.length - bestInlierCount,
    depthMean,
    depthStdDev,
    inclineAngle,
    ransacIterations: maxIterations,
    bestInlierIndices
  };
}

function estimatePxPerMmFromCorrespondences(srcPoints: Point2D[], dstPoints: Point2D[]): number | null {
  if (srcPoints.length < 2 || dstPoints.length < 2) return null;

  // Estimation robuste via ratios de distances entre paires.
  const ratios: number[] = [];
  const maxPairs = 200;
  const n = srcPoints.length;

  for (let t = 0; t < maxPairs; t++) {
    const i = Math.floor(Math.random() * n);
    let j = Math.floor(Math.random() * n);
    if (j === i) j = (j + 1) % n;

    const dPx = distance(srcPoints[i], srcPoints[j]);
    const dMm = distance(dstPoints[i], dstPoints[j]);
    if (!Number.isFinite(dPx) || !Number.isFinite(dMm)) continue;
    if (dMm < 20 || dPx < 20) continue;

    ratios.push(dPx / dMm);
  }

  if (ratios.length < 10) return null;
  ratios.sort((a, b) => a - b);
  return ratios[Math.floor(ratios.length / 2)];
}

/**
 * 📐 Estimation de la profondeur Z pour chaque point
 * Utilise la distance focale estimée et la perspective
 */
function estimateDepthMap(
  srcPoints: Point2D[],
  dstPoints: Point2D[],
  H: number[][],
  _markerWidthMm: number,
  _markerHeightMm: number
): Point3D[] {
  
  // Estimer distance focale basée sur l'homographie
  // f = sqrt(H[0][0]² + H[1][0]²) * largeur_marqueur_pixels / largeur_marqueur_mm
  // Approximation: facteur d'échelle de H indique distance
  
  // Extraire la rotation et l'échelle de H
  const det = H[0][0] * H[1][1] - H[0][1] * H[1][0];
  const scale = Math.sqrt(Math.abs(det)); // Échelle de H
  
  // Profondeur estimée basée sur échelle (plus scale grand, plus objet est proche)
  // Distance de référence: ~1900mm à scale=1
  const depthBase = 1900 / Math.max(0.1, scale);
  
  const result: Point3D[] = [];
  
  for (let i = 0; i < srcPoints.length; i++) {
    const src = srcPoints[i];
    const dst = dstPoints[i];
    
    // Appliquer homographie pour distance réelle
    const transformed = applyHomography(H, src);
    const error = distance(transformed, dst);
    
    // Estimer Z basée sur position dans l'image
    // Points vers les bords = plus loin (perspective plus grande)
    // Points au centre = plus proche
    const px = src.x / 640; // Normaliser à 640px (largeur image approximée)
    const py = src.y / 480; // Normaliser à 480px (hauteur image approximée)
    const distFromCenter = Math.sqrt((px - 0.5) ** 2 + (py - 0.5) ** 2);
    
    // Plus on est loin du centre, plus la profondeur varie
    const depthVariation = 1 + distFromCenter * 0.5;
    const estimatedZ = depthBase * depthVariation;
    
    result.push({
      x: transformed[0],
      y: transformed[1],
      z: estimatedZ,
      type: dst.x < 20 ? 'apriltag' : 'dot',
      error: error
    });
  }
  
  return result;
}

/**
 * 📐 Estimer l'angle d'inclinaison de l'objet
 */
function estimateInclineAngle(points3D: Point3D[]): number {
  
  if (points3D.length < 3) return 0;
  
  // Utiliser PCA pour trouver le plan (normal vector)
  const centroid = {
    x: points3D.reduce((s, p) => s + p.x, 0) / points3D.length,
    y: points3D.reduce((s, p) => s + p.y, 0) / points3D.length,
    z: points3D.reduce((s, p) => s + p.z, 0) / points3D.length
  };
  
  // Centres les points
  const centered = points3D.map(p => ({
    x: p.x - centroid.x,
    y: p.y - centroid.y,
    z: p.z - centroid.z
  }));
  
  // Matrice de covariance
  const cov = {
    xx: centered.reduce((s, p) => s + p.x * p.x, 0) / points3D.length,
    xy: centered.reduce((s, p) => s + p.x * p.y, 0) / points3D.length,
    xz: centered.reduce((s, p) => s + p.x * p.z, 0) / points3D.length,
    yy: centered.reduce((s, p) => s + p.y * p.y, 0) / points3D.length,
    yz: centered.reduce((s, p) => s + p.y * p.z, 0) / points3D.length,
    zz: centered.reduce((s, p) => s + p.z * p.z, 0) / points3D.length
  };
  
  // Normal approximatif du plan (vecteur propre principal)
  // Approximation simplifiée: utiliser les variations Z
  const maxZDiff = Math.max(...points3D.map(p => p.z)) - Math.min(...points3D.map(p => p.z));
  const avgXY = Math.sqrt(cov.xx + cov.yy);
  
  // Angle: arctan(variation_z / variation_xy)
  const angle = Math.atan2(maxZDiff, avgXY) * (180 / Math.PI);
  
  return Math.abs(angle);
}

/**
 * 🔧 Levenberg-Marquardt: Optimisation non-linéaire de l'homographie
 */
function levenbergMarquardt(
  initialH: number[][],
  srcPoints: Point2D[],
  dstPoints: Point2D[],
  maxIterations: number = 100
): number[][] {
  
  let H = initialH.map(row => [...row]); // Copie
  let lambda = 0.001;
  
  for (let iter = 0; iter < maxIterations; iter++) {
    // Calculer résidu et jacobienne
    const residuals = computeResiduals(H, srcPoints, dstPoints);
    const J = computeJacobian(H, srcPoints, dstPoints);
    
    // JtJ et Jt*residuals
    const JtJ = matmul(transpose(J), J);
    const Jtr = matmul(transpose(J), residuals);
    
    // Ajouter terme de régularisation (Levenberg-Marquardt)
    const regularized = JtJ.map((row, i) =>
      row.map((val, j) => val + (i === j ? lambda : 0))
    );
    
    // Résoudre: (JtJ + λI) * delta = -Jt*residuals
    try {
      const delta = solveLinearSystem(regularized, Jtr.map(v => -v));
      
      // Mettre à jour H
      const newH = perturbHomography(H, delta);
      
      // Calculer nouveaux résidus
      const newResiduals = computeResiduals(newH, srcPoints, dstPoints);
      const oldError = computeError(residuals);
      const newError = computeError(newResiduals);
      
      if (newError < oldError) {
        H = newH;
        lambda *= 0.1; // Réduire λ (plus Newton)
      } else {
        lambda *= 10; // Augmenter λ (plus gradient descent)
      }
      
      if (oldError < 1e-6) break; // Convergence
      
    } catch {
      // Matrice singulière, augmenter λ
      lambda *= 10;
    }
  }
  
  return H;
}

/**
 * Calculer les résidus: écart entre points transformés et réels
 */
function computeResiduals(
  H: number[][],
  srcPoints: Point2D[],
  dstPoints: Point2D[]
): number[][] {
  
  const residuals: number[][] = [];
  
  for (let i = 0; i < srcPoints.length; i++) {
    const transformed = applyHomography(H, srcPoints[i]);
    residuals.push([
      transformed[0] - dstPoints[i].x,
      transformed[1] - dstPoints[i].y
    ]);
  }
  
  return residuals;
}

/**
 * Jacobienne de l'homographie (dérivées partielles)
 */
function computeJacobian(
  H: number[][],
  srcPoints: Point2D[],
  _dstPoints: Point2D[]
): number[][] {
  
  const eps = 1e-6;
  const J: number[][] = [];
  
  for (let i = 0; i < srcPoints.length; i++) {
    for (let j = 0; j < 2; j++) {
      const row: number[] = [];
      
      // 9 paramètres de H
      for (let k = 0; k < 9; k++) {
        const H_plus = H.map(r => [...r]);
        H_plus[Math.floor(k / 3)][k % 3] += eps;
        
        const H_minus = H.map(r => [...r]);
        H_minus[Math.floor(k / 3)][k % 3] -= eps;
        
        const fPlus = applyHomography(H_plus, srcPoints[i])[j];
        const fMinus = applyHomography(H_minus, srcPoints[i])[j];
        
        row.push((fPlus - fMinus) / (2 * eps));
      }
      
      J.push(row);
    }
  }
  
  return J;
}

/**
 * Appliquer l'homographie à un point
 */
function applyHomography(H: number[][], p: Point2D): [number, number] {
  const x = p.x;
  const y = p.y;
  
  const num_x = H[0][0] * x + H[0][1] * y + H[0][2];
  const num_y = H[1][0] * x + H[1][1] * y + H[1][2];
  const denom = H[2][0] * x + H[2][1] * y + H[2][2];
  
  return [num_x / denom, num_y / denom];
}

/**
 * Calculer homographie avec 4 points (DLT)
 */
function computeHomographyDLT(srcPoints: Point2D[], dstPoints: Point2D[]): number[][] {
  if (srcPoints.length !== 4 || dstPoints.length !== 4) {
    throw new Error('Exactement 4 points requis pour DLT');
  }

  // Normaliser points pour stabilité numérique
  const srcNorm = normalizePoints(srcPoints);
  const dstNorm = normalizePoints(dstPoints);

  // Résoudre h (8 inconnues) avec h33 fixé à 1.
  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const sx = srcNorm.normalized[i].x;
    const sy = srcNorm.normalized[i].y;
    const dx = dstNorm.normalized[i].x;
    const dy = dstNorm.normalized[i].y;

    A.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy]);
    b.push(dx);

    A.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy]);
    b.push(dy);
  }

  const h = solveLinearSystem(A, b);
  const H_norm = [
    [h[0], h[1], h[2]],
    [h[3], h[4], h[5]],
    [h[6], h[7], 1]
  ];

  return matmul(dstNorm.denormalization, matmul(H_norm, srcNorm.normalization));
}

function computeHomographyDLTLeastSquares(srcPoints: Point2D[], dstPoints: Point2D[]): number[][] {
  if (srcPoints.length < 4 || dstPoints.length < 4 || srcPoints.length !== dstPoints.length) {
    throw new Error('Au moins 4 correspondances (même longueur) requises');
  }

  if (srcPoints.length === 4) {
    return computeHomographyDLT(srcPoints, dstPoints);
  }

  // Normaliser
  const srcNorm = normalizePoints(srcPoints);
  const dstNorm = normalizePoints(dstPoints);

  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < srcNorm.normalized.length; i++) {
    const sx = srcNorm.normalized[i].x;
    const sy = srcNorm.normalized[i].y;
    const dx = dstNorm.normalized[i].x;
    const dy = dstNorm.normalized[i].y;

    A.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy]);
    b.push(dx);

    A.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy]);
    b.push(dy);
  }

  const At = transpose(A);
  const AtA = matmul(At, A);
  const Atb = multiplyMatVec(At, b);
  const h = solveLinearSystem(AtA, Atb);

  const H_norm = [
    [h[0], h[1], h[2]],
    [h[3], h[4], h[5]],
    [h[6], h[7], 1]
  ];

  return matmul(dstNorm.denormalization, matmul(H_norm, srcNorm.normalization));
}

/**
 * Normaliser points pour stabilité numérique
 */
function normalizePoints(points: Point2D[]): {
  normalized: Point2D[];
  normalization: number[][];
  denormalization: number[][];
} {
  const meanX = points.reduce((s, p) => s + p.x, 0) / points.length;
  const meanY = points.reduce((s, p) => s + p.y, 0) / points.length;
  
  const scale = Math.sqrt(
    points.reduce((s, p) => s + (p.x - meanX) ** 2 + (p.y - meanY) ** 2, 0) / points.length / 2
  );
  
  const normalized = points.map(p => ({
    x: (p.x - meanX) / scale,
    y: (p.y - meanY) / scale
  }));
  
  const normalization = [
    [1 / scale, 0, -meanX / scale],
    [0, 1 / scale, -meanY / scale],
    [0, 0, 1]
  ];
  
  const denormalization = [
    [scale, 0, meanX],
    [0, scale, meanY],
    [0, 0, 1]
  ];
  
  return { normalized, normalization, denormalization };
}

/**
 * 🔧 Utilitaires mathématiques
 */
function randomSampleIndices(total: number, k: number): number[] {
  const indices: number[] = [];
  const used = new Set<number>();
  
  while (indices.length < k) {
    const idx = Math.floor(Math.random() * total);
    if (!used.has(idx)) {
      indices.push(idx);
      used.add(idx);
    }
  }
  
  return indices;
}

function distance(p1: Point2D | [number, number], p2: Point2D | [number, number]): number {
  const x1 = Array.isArray(p1) ? p1[0] : p1.x;
  const y1 = Array.isArray(p1) ? p1[1] : p1.y;
  const x2 = Array.isArray(p2) ? p2[0] : p2.x;
  const y2 = Array.isArray(p2) ? p2[1] : p2.y;
  
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function transpose(m: number[][]): number[][] {
  if (m.length === 0) return [];
  return m[0].map((_, i) => m.map(row => row[i]));
}

function matmul(A: number[][], B: number[][]): number[][] {
  const result: number[][] = [];
  const n = A.length;
  const m = B[0].length;
  const p = B.length;
  
  for (let i = 0; i < n; i++) {
    result[i] = [];
    for (let j = 0; j < m; j++) {
      let sum = 0;
      for (let k = 0; k < p; k++) {
        sum += A[i][k] * B[k][j];
      }
      result[i][j] = sum;
    }
  }
  
  return result;
}

function multiplyMatVec(A: number[][], v: number[]): number[] {
  const result = new Array(A.length).fill(0);
  for (let i = 0; i < A.length; i++) {
    let sum = 0;
    for (let j = 0; j < v.length; j++) {
      sum += A[i][j] * v[j];
    }
    result[i] = sum;
  }
  return result;
}

function solveLinearSystem(A: number[][], b: number[]): number[] {
  // Gauss-Jordan pour petites matrices
  const n = A.length;
  const augmented = A.map((row, i) => [...row, b[i]]);
  
  // Forward elimination
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
        maxRow = k;
      }
    }
    [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
    
    for (let k = i + 1; k < n; k++) {
      const factor = augmented[k][i] / augmented[i][i];
      for (let j = i; j <= n; j++) {
        augmented[k][j] -= factor * augmented[i][j];
      }
    }
  }
  
  // Back substitution
  const x = new Array(n);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = augmented[i][n];
    for (let j = i + 1; j < n; j++) {
      x[i] -= augmented[i][j] * x[j];
    }
    x[i] /= augmented[i][i];
  }
  
  return x;
}

function computeError(residuals: number[][]): number {
  return residuals.reduce((sum, r) => sum + r[0] ** 2 + r[1] ** 2, 0);
}

function perturbHomography(H: number[][], delta: number[]): number[][] {
  const result = H.map(row => [...row]);
  for (let i = 0; i < 9; i++) {
    result[Math.floor(i / 3)][i % 3] += delta[i];
  }
  return result;
}
