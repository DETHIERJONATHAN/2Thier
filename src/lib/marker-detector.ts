/**
 * 🎯 MARKER DETECTOR - Détection de marqueurs MAGENTA pour calibration photo
 * 
 * Port côté serveur du système de détection aruco-test.html
 * Détecte les 4 points MAGENTA aux coins d'un marqueur 18x18cm
 * pour calculer l'homographie et permettre la mesure précise.
 * 
 * @module lib/marker-detector
 * @author 2Thier CRM Team
 */

/**
 * Spécifications du marqueur physique imprimé
 */
export const MARKER_SPECS = {
  markerSize: 18,        // Taille du marqueur carré en cm
  boardSize: 24,         // Taille du tableau ALU support en cm
  magentaRadius: 0.5,    // Rayon des cercles magenta en cm
  whiteRadius: 0.1,      // Rayon du point blanc central en cm
  // Structure: Noir(3cm) > Blanc(3cm) > Noir(6cm centre) > Blanc(3cm) > Noir(3cm)
};

/**
 * Point 2D avec coordonnées
 */
export interface Point2D {
  x: number;
  y: number;
}

/**
 * Pixel avec couleur et score
 */
interface ColorPixel {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
  score: number;
}

/**
 * Cluster de pixels magenta
 */
interface MagentaCluster {
  cx: number;
  cy: number;
  size: number;
  width: number;
  height: number;
}

/**
 * Résultat de détection d'un marqueur
 */
export interface MarkerDetectionResult {
  id: number;
  corners: Point2D[];           // 4 coins ordonnés [TL, TR, BR, BL]
  magentaPositions: Point2D[];  // Positions des centres magenta détectés
  size: number;                 // Taille moyenne en pixels
  center: Point2D;              // Centre du marqueur
  score: number;                // Score de confiance (0-1)
  magentaFound: number;         // Nombre de points magenta trouvés
  homography: {
    realSizeCm: number;         // Taille réelle (18cm)
    pixelsPerCm: number;        // Pixels par cm
    sides: number[];            // Longueur des 4 côtés en px
    angles: number[];           // Angles aux 4 coins
  };
}

/**
 * Image data pour le traitement
 */
export interface ImageDataLike {
  data: Uint8ClampedArray | Buffer;
  width: number;
  height: number;
}

/**
 * Classe principale de détection de marqueurs MAGENTA
 */
export class MarkerDetector {
  private minSize: number;
  private maxSize: number;

  constructor(minSize = 30, maxSize = 2000) {
    this.minSize = minSize;
    this.maxSize = maxSize;
  }

  /**
   * Détecter les marqueurs dans une image
   */
  detect(imageData: ImageDataLike): MarkerDetectionResult[] {
    const { data, width, height } = imageData;
    
    console.log(`🔍 MarkerDetector.detect: ${width}x${height}`);
    
    // Stratégie: détection basée sur les points MAGENTA
    const markers = this.detectFromMagentaOnly(data, width, height);
    
    if (markers.length > 0) {
      console.log(`✅ ${markers.length} marqueur(s) détecté(s)`);
    } else {
      console.log('❌ Aucun marqueur détecté');
    }
    
    return markers;
  }

  /**
   * Détecter uniquement depuis les points magenta (fallback robuste)
   */
  private detectFromMagentaOnly(
    data: Uint8ClampedArray | Buffer,
    width: number,
    height: number
  ): MarkerDetectionResult[] {
    console.log('🔄 Détection par magenta uniquement');
    
    const magentaPixels = this.findAllMagentaPixels(data, width, height);
    console.log(`💜 ${magentaPixels.length} pixels magenta détectés`);
    
    if (magentaPixels.length < 20) {
      console.log('❌ Pas assez de pixels magenta');
      return [];
    }
    
    const clusters = this.clusterMagentaPixels(magentaPixels);
    console.log(`🎯 ${clusters.length} zones magenta identifiées`);
    
    if (clusters.length < 4) {
      console.log(`❌ Seulement ${clusters.length} points magenta (besoin de 4)`);
      return [];
    }
    
    const topClusters = clusters.slice(0, 4);
    const corners: Point2D[] = [];
    const magentaPositions: Point2D[] = [];
    
    for (const cluster of topClusters) {
      magentaPositions.push({ x: cluster.cx, y: cluster.cy });
      // Chercher le centre blanc près du magenta
      const white = this.findWhiteCenterAt(data, width, height, cluster.cx, cluster.cy, 10);
      corners.push(white || { x: cluster.cx, y: cluster.cy });
    }
    
    const orderedCorners = this.orderCorners(corners);
    const orderedMagenta = this.orderCorners(magentaPositions);
    
    if (!orderedCorners) {
      console.log('❌ Impossible d\'ordonner les coins');
      return [];
    }
    
    const measurements = this.calculateMeasurements(orderedCorners);
    
    return [{
      id: 0,
      corners: orderedCorners,
      magentaPositions: orderedMagenta || magentaPositions,
      size: measurements.avgSidePx,
      center: measurements.center,
      score: 0.8,
      magentaFound: 4,
      homography: {
        realSizeCm: MARKER_SPECS.markerSize,
        pixelsPerCm: measurements.pixelsPerCm,
        sides: measurements.sides,
        angles: measurements.angles
      }
    }];
  }

  /**
   * Trouver TOUS les pixels magenta dans l'image
   * Magenta = rouge + bleu forts, vert faible, saturation élevée
   */
  private findAllMagentaPixels(
    data: Uint8ClampedArray | Buffer,
    width: number,
    height: number
  ): ColorPixel[] {
    const pixels: ColorPixel[] = [];
    
    // Pas adaptatif pour accélérer sur grandes images
    const step = Math.max(1, Math.floor(Math.min(width, height) / 900));
    
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        
        // Saturation approximative = max - min
        const maxc = Math.max(r, g, b);
        const minc = Math.min(r, g, b);
        const sat = maxc - minc;
        
        // Filtres magenta robustes
        if (sat < 50) continue;
        if (g > 140) continue;
        if (r < 70 || b < 70) continue;
        if (g >= r || g >= b) continue;
        
        // Score: plus R/B dominent G, mieux c'est
        const score = (r - g) + (b - g) + sat * 0.5;
        if (score < 140) continue;
        
        pixels.push({ x, y, r, g, b, score });
      }
    }
    
    return pixels;
  }

  /**
   * Regrouper les pixels magenta en clusters
   */
  private clusterMagentaPixels(pixels: ColorPixel[]): MagentaCluster[] {
    if (pixels.length === 0) return [];
    
    const cellSize = 12;
    const grid = new Map<string, ColorPixel[]>();
    
    // Répartir les pixels dans une grille
    for (const p of pixels) {
      const key = `${Math.floor(p.x / cellSize)},${Math.floor(p.y / cellSize)}`;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key)!.push(p);
    }
    
    // Fusionner les cellules adjacentes en clusters (BFS)
    const clusters: MagentaCluster[] = [];
    const usedCells = new Set<string>();
    
    const gridEntries = Array.from(grid.entries());
    for (const [key, cellPixels] of gridEntries) {
      if (usedCells.has(key)) continue;
      
      const cluster: ColorPixel[] = [...cellPixels];
      const queue = [key];
      usedCells.add(key);
      
      while (queue.length > 0) {
        const currentKey = queue.shift()!;
        const [cx, cy] = currentKey.split(',').map(Number);
        
        // Vérifier les 8 voisins
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const neighborKey = `${cx + dx},${cy + dy}`;
            
            if (grid.has(neighborKey) && !usedCells.has(neighborKey)) {
              cluster.push(...grid.get(neighborKey)!);
              usedCells.add(neighborKey);
              queue.push(neighborKey);
            }
          }
        }
      }
      
      if (cluster.length >= 6) {
        // Calculer le barycentre pondéré par le score
        let sumX = 0, sumY = 0, sumW = 0;
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        for (const p of cluster) {
          const w = Math.max(1, p.score || 1);
          sumX += p.x * w;
          sumY += p.y * w;
          sumW += w;
          minX = Math.min(minX, p.x);
          maxX = Math.max(maxX, p.x);
          minY = Math.min(minY, p.y);
          maxY = Math.max(maxY, p.y);
        }
        
        const clusterWidth = maxX - minX;
        const clusterHeight = maxY - minY;
        
        // Filtrer les clusters trop allongés (pas des cercles)
        const ratio = Math.max(clusterWidth, clusterHeight) / Math.max(1, Math.min(clusterWidth, clusterHeight));
        
        if (ratio < 2.5) {
          clusters.push({
            cx: sumX / Math.max(1, sumW),
            cy: sumY / Math.max(1, sumW),
            size: cluster.length,
            width: clusterWidth,
            height: clusterHeight
          });
        }
      }
    }
    
    // Trier par taille décroissante
    clusters.sort((a, b) => b.size - a.size);
    
    // Si plus de 4 clusters, sélectionner les meilleurs
    if (clusters.length > 4) {
      return this.selectBest4Corners(clusters);
    }
    
    return clusters;
  }

  /**
   * Sélectionner les 4 clusters qui forment le meilleur quadrilatère
   */
  private selectBest4Corners(clusters: MagentaCluster[]): MagentaCluster[] {
    if (clusters.length <= 4) return clusters;
    
    const candidates = clusters.slice(0, Math.min(8, clusters.length));
    
    let bestCombo = candidates.slice(0, 4);
    let bestScore = -Infinity;
    
    // Tester toutes les combinaisons de 4 parmi les 8 plus gros
    for (let i = 0; i < candidates.length; i++) {
      for (let j = i + 1; j < candidates.length; j++) {
        for (let k = j + 1; k < candidates.length; k++) {
          for (let l = k + 1; l < candidates.length; l++) {
            const combo = [candidates[i], candidates[j], candidates[k], candidates[l]];
            const score = this.scoreQuadrilateral(combo);
            
            if (score > bestScore) {
              bestScore = score;
              bestCombo = combo;
            }
          }
        }
      }
    }
    
    console.log(`✅ Meilleur quadrilatère sélectionné (score: ${bestScore.toFixed(0)})`);
    return bestCombo;
  }

  /**
   * Score un ensemble de 4 points selon la qualité du quadrilatère
   */
  private scoreQuadrilateral(points: MagentaCluster[]): number {
    const ordered = this.orderCorners(points.map(p => ({ x: p.cx, y: p.cy })));
    if (!ordered) return -Infinity;
    
    // Calculer les 4 côtés
    const sides: number[] = [];
    for (let i = 0; i < 4; i++) {
      const p1 = ordered[i];
      const p2 = ordered[(i + 1) % 4];
      sides.push(Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2));
    }
    
    // Score basé sur la régularité
    const avgSide = sides.reduce((a, b) => a + b, 0) / 4;
    const variance = sides.reduce((sum, s) => sum + Math.abs(s - avgSide), 0) / 4;
    
    // Bonus pour la taille, pénalité pour l'irrégularité
    return avgSide - variance * 2;
  }

  /**
   * Trouver le centre blanc à proximité d'un point magenta
   */
  private findWhiteCenterAt(
    data: Uint8ClampedArray | Buffer,
    width: number,
    height: number,
    cx: number,
    cy: number,
    radius: number
  ): Point2D | null {
    let sumX = 0, sumY = 0, sumW = 0;
    let bestX = 0, bestY = 0, bestScore = 0;
    
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = Math.round(cx + dx);
        const y = Math.round(cy + dy);
        
        if (x < 0 || x >= width || y < 0 || y >= height) continue;
        
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        
        const brightness = (r + g + b) / 3;
        const variance = Math.abs(r - brightness) + Math.abs(g - brightness) + Math.abs(b - brightness);
        
        // Blanc: assez lumineux et pas trop coloré
        if (brightness > 175 && variance < 70) {
          const distFromCenter = Math.sqrt(dx * dx + dy * dy);
          const w = brightness / (1 + distFromCenter * 0.6);
          sumX += x * w;
          sumY += y * w;
          sumW += w;
          
          if (w > bestScore) {
            bestScore = w;
            bestX = x;
            bestY = y;
          }
        }
      }
    }
    
    if (sumW > 0) {
      return { x: sumX / sumW, y: sumY / sumW };
    }
    
    return bestScore > 0 ? { x: bestX, y: bestY } : null;
  }

  /**
   * Calculer les mesures du quadrilatère pour l'homographie
   */
  private calculateMeasurements(quad: Point2D[]): {
    sides: number[];
    avgSidePx: number;
    pixelsPerCm: number;
    angles: number[];
    center: Point2D;
  } {
    const [tl, tr, br, bl] = quad;
    
    // Calculer les 4 côtés
    const sides = [
      Math.sqrt((tr.x - tl.x) ** 2 + (tr.y - tl.y) ** 2), // Haut
      Math.sqrt((br.x - tr.x) ** 2 + (br.y - tr.y) ** 2), // Droit
      Math.sqrt((bl.x - br.x) ** 2 + (bl.y - br.y) ** 2), // Bas
      Math.sqrt((tl.x - bl.x) ** 2 + (tl.y - bl.y) ** 2)  // Gauche
    ];
    
    const avgSidePx = sides.reduce((a, b) => a + b, 0) / 4;
    const pixelsPerCm = avgSidePx / MARKER_SPECS.markerSize;
    
    // Calculer les angles aux coins
    const angles = [
      this.calculateAngle(bl, tl, tr),
      this.calculateAngle(tl, tr, br),
      this.calculateAngle(tr, br, bl),
      this.calculateAngle(br, bl, tl)
    ];
    
    return {
      sides,
      avgSidePx,
      pixelsPerCm,
      angles,
      center: {
        x: (tl.x + tr.x + br.x + bl.x) / 4,
        y: (tl.y + tr.y + br.y + bl.y) / 4
      }
    };
  }

  /**
   * Calculer l'angle entre trois points
   */
  private calculateAngle(p1: Point2D, vertex: Point2D, p2: Point2D): number {
    const v1 = { x: p1.x - vertex.x, y: p1.y - vertex.y };
    const v2 = { x: p2.x - vertex.x, y: p2.y - vertex.y };
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2);
    const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2);
    return Math.acos(dot / (mag1 * mag2)) * 180 / Math.PI;
  }

  /**
   * Ordonner les 4 coins en [TL, TR, BR, BL]
   */
  private orderCorners(corners: Point2D[]): Point2D[] | null {
    if (corners.length !== 4) return null;
    
    const cx = corners.reduce((s, c) => s + c.x, 0) / 4;
    const cy = corners.reduce((s, c) => s + c.y, 0) / 4;
    
    const topLeft = corners.find(c => c.x < cx && c.y < cy);
    const topRight = corners.find(c => c.x >= cx && c.y < cy);
    const bottomRight = corners.find(c => c.x >= cx && c.y >= cy);
    const bottomLeft = corners.find(c => c.x < cx && c.y >= cy);
    
    if (!topLeft || !topRight || !bottomRight || !bottomLeft) return null;
    return [topLeft, topRight, bottomRight, bottomLeft];
  }

  /**
   * Vérifier si un quadrilatère est valide
   */
  isValidQuad(quad: Point2D[]): boolean {
    if (quad.length !== 4) return false;
    
    const [tl, tr, br, bl] = quad;
    if (tl.y > bl.y || tr.y > br.y) return false;
    if (tl.x > tr.x || bl.x > br.x) return false;
    
    const width = Math.max(tr.x - tl.x, br.x - bl.x);
    const height = Math.max(bl.y - tl.y, br.y - tr.y);
    
    return width >= this.minSize && height >= this.minSize &&
           width <= this.maxSize && height <= this.maxSize;
  }
}

/**
 * Calculer la matrice d'homographie 3x3 à partir de 4 correspondances de points
 * Utilise l'algorithme DLT (Direct Linear Transform)
 */
export function computeHomography(
  srcPoints: Point2D[], // 4 points source (coins détectés en pixels)
  dstPoints: Point2D[]  // 4 points destination (coins réels en cm, ex: 0,0 à 18,18)
): number[][] {
  if (srcPoints.length !== 4 || dstPoints.length !== 4) {
    console.error('computeHomography: besoin de 4 points source et 4 points destination');
    return [[1, 0, 0], [0, 1, 0], [0, 0, 1]]; // Identité
  }
  
  // Construire la matrice A pour le système Ah = 0
  const A: number[][] = [];
  
  for (let i = 0; i < 4; i++) {
    const [x, y] = [srcPoints[i].x, srcPoints[i].y];
    const [u, v] = [dstPoints[i].x, dstPoints[i].y];
    
    A.push([-x, -y, -1, 0, 0, 0, u * x, u * y, u]);
    A.push([0, 0, 0, -x, -y, -1, v * x, v * y, v]);
  }
  
  // Résoudre par SVD simplifiée (on utilise la dernière colonne de V)
  // Pour une implémentation simple, on utilise les équations normales
  const h = solveHomographyDLT(A);
  
  // Reshape en matrice 3x3
  return [
    [h[0], h[1], h[2]],
    [h[3], h[4], h[5]],
    [h[6], h[7], h[8]]
  ];
}

/**
 * Résoudre le système DLT par pseudo-inverse simplifiée
 */
function solveHomographyDLT(A: number[][]): number[] {
  // Implémentation simplifiée: on normalise et résout
  // Pour une vraie SVD, utiliser une librairie comme ml-matrix
  
  // On utilise la méthode des moindres carrés avec contrainte ||h|| = 1
  // AᵀA h = 0, on cherche le vecteur propre associé à la plus petite valeur propre
  
  const n = 9;
  const AtA: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
  
  // Calculer AᵀA
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let sum = 0;
      for (let k = 0; k < A.length; k++) {
        sum += A[k][i] * A[k][j];
      }
      AtA[i][j] = sum;
    }
  }
  
  // Power iteration pour trouver le plus petit vecteur propre
  // (on inverse la matrice et cherche le plus grand)
  let h = Array(n).fill(1 / Math.sqrt(n));
  
  for (let iter = 0; iter < 100; iter++) {
    // Multiplier par AtA + petit epsilon pour stabilité
    const newH = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        newH[i] += AtA[i][j] * h[j];
      }
    }
    
    // Normaliser
    const norm = Math.sqrt(newH.reduce((s, v) => s + v * v, 0));
    if (norm > 1e-10) {
      for (let i = 0; i < n; i++) {
        h[i] = newH[i] / norm;
      }
    }
  }
  
  // Normaliser pour h[8] = 1
  if (Math.abs(h[8]) > 1e-10) {
    const scale = 1 / h[8];
    for (let i = 0; i < n; i++) {
      h[i] *= scale;
    }
  }
  
  return h;
}

/**
 * Transformer un point par la matrice d'homographie
 */
export function transformPoint(H: number[][], p: Point2D): Point2D {
  const x = H[0][0] * p.x + H[0][1] * p.y + H[0][2];
  const y = H[1][0] * p.x + H[1][1] * p.y + H[1][2];
  const w = H[2][0] * p.x + H[2][1] * p.y + H[2][2];
  
  return {
    x: x / w,
    y: y / w
  };
}

/**
 * Calculer la distance entre deux points en cm via homographie
 */
export function measureDistanceCm(
  H: number[][],
  p1Px: Point2D,
  p2Px: Point2D
): number {
  const p1Cm = transformPoint(H, p1Px);
  const p2Cm = transformPoint(H, p2Px);
  
  return Math.sqrt((p2Cm.x - p1Cm.x) ** 2 + (p2Cm.y - p1Cm.y) ** 2);
}

/**
 * Estimer la rotation (pose) du marqueur par rapport à la caméra
 */
export function estimatePose(corners: Point2D[]): {
  rotX: number; // Rotation autour de X (basculement avant/arrière)
  rotY: number; // Rotation autour de Y (basculement gauche/droite)
  rotZ: number; // Rotation autour de Z (inclinaison)
} {
  if (corners.length !== 4) {
    return { rotX: 0, rotY: 0, rotZ: 0 };
  }
  
  const [tl, tr, br, bl] = corners;
  
  // Rotation X: comparaison largeur haut vs bas
  const topWidth = Math.sqrt((tr.x - tl.x) ** 2 + (tr.y - tl.y) ** 2);
  const bottomWidth = Math.sqrt((br.x - bl.x) ** 2 + (br.y - bl.y) ** 2);
  const ratioX = topWidth / bottomWidth;
  const rotX = Math.round(Math.atan2(ratioX - 1, 0.5) * 180 / Math.PI);
  
  // Rotation Y: comparaison hauteur gauche vs droite
  const leftHeight = Math.sqrt((bl.x - tl.x) ** 2 + (bl.y - tl.y) ** 2);
  const rightHeight = Math.sqrt((br.x - tr.x) ** 2 + (br.y - tr.y) ** 2);
  const ratioY = leftHeight / rightHeight;
  const rotY = Math.round(Math.atan2(ratioY - 1, 0.5) * 180 / Math.PI);
  
  // Rotation Z: inclinaison du bord supérieur
  const rotZ = Math.round(Math.atan2(tr.y - tl.y, tr.x - tl.x) * 180 / Math.PI);
  
  return { rotX, rotY, rotZ };
}

/**
 * Calculer un score de qualité pour la détection
 */
export function calculateQualityScore(
  corners: Point2D[],
  avgSizePx: number,
  rotX: number,
  rotY: number
): number {
  let score = 100;
  
  // Pénalité si marqueur trop petit
  if (avgSizePx < 50) score -= 40;
  else if (avgSizePx < 100) score -= 20;
  
  // Pénalité pour les angles (perspective forte)
  score -= Math.abs(rotX) * 0.5;
  score -= Math.abs(rotY) * 0.5;
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

export default MarkerDetector;
