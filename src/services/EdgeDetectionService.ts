/**
 * 🔍 SERVICE DE DÉTECTION DE CONTOURS - V2 AMÉLIORÉ
 * Utilise Sharp pour analyser les pixels et trouver les vrais bords d'une feuille blanche
 * Algorithme: Seuillage → Contour → Approximation polygone → 4 coins
 * C'est LA CLÉ pour des mesures précises !
 */

import sharp from 'sharp';

export interface DetectedCorners {
  topLeft: { x: number; y: number };
  topRight: { x: number; y: number };
  bottomLeft: { x: number; y: number };
  bottomRight: { x: number; y: number };
}

export interface EdgeDetectionResult {
  success: boolean;
  corners?: DetectedCorners;
  confidence?: number;
  debug?: {
    imageWidth: number;
    imageHeight: number;
    whitePixelsFound: number;
    edgePointsFound: number;
    contourLength?: number;
  };
  error?: string;
}

interface Point {
  x: number;
  y: number;
}

export class EdgeDetectionService {
  
  /**
   * 🎯 Détecte les 4 coins d'une feuille BLANCHE dans une zone de l'image
   * NOUVELLE APPROCHE: 
   * 1. Créer un masque binaire (blanc vs non-blanc)
   * 2. Trouver le contour de la zone blanche
   * 3. Approximer le contour par un quadrilatère
   * 4. Extraire les 4 coins
   */
  async detectWhitePaperCorners(
    imageBase64: string,
    selectionZone: { x: number; y: number; width: number; height: number },
    mimeType: string = 'image/jpeg'
  ): Promise<EdgeDetectionResult> {
    try {
      console.log('🔍 [EdgeDetection V2] Début détection de la feuille blanche...');
      console.log(`📐 [EdgeDetection V2] Zone: ${selectionZone.x.toFixed(1)}%, ${selectionZone.y.toFixed(1)}% - ${selectionZone.width.toFixed(1)}x${selectionZone.height.toFixed(1)}%`);

      // Décoder l'image base64
      const imageBuffer = Buffer.from(imageBase64, 'base64');
      
      // Obtenir les métadonnées de l'image
      const metadata = await sharp(imageBuffer).metadata();
      const imgWidth = metadata.width || 0;
      const imgHeight = metadata.height || 0;
      
      console.log(`📷 [EdgeDetection V2] Image: ${imgWidth}x${imgHeight}px`);

      // Convertir la zone de sélection en pixels
      const zoneX = Math.round((selectionZone.x / 100) * imgWidth);
      const zoneY = Math.round((selectionZone.y / 100) * imgHeight);
      const zoneW = Math.round((selectionZone.width / 100) * imgWidth);
      const zoneH = Math.round((selectionZone.height / 100) * imgHeight);

      console.log(`📐 [EdgeDetection V2] Zone en pixels: x=${zoneX}, y=${zoneY}, w=${zoneW}, h=${zoneH}`);

      // Extraire la zone et obtenir les données brutes des pixels
      const { data: pixels, info } = await sharp(imageBuffer)
        .extract({ left: zoneX, top: zoneY, width: zoneW, height: zoneH })
        .raw()
        .toBuffer({ resolveWithObject: true });

      console.log(`🖼️ [EdgeDetection V2] Zone extraite: ${info.width}x${info.height}, ${info.channels} channels`);

      // ÉTAPE 1: Créer un masque binaire des pixels "blancs"
      const binaryMask = this.createWhiteMask(pixels, info.width, info.height, info.channels);
      
      // ÉTAPE 2: Trouver le contour de la zone blanche
      const contourPoints = this.findContour(binaryMask, info.width, info.height);
      console.log(`📍 [EdgeDetection V2] Contour trouvé: ${contourPoints.length} points`);
      
      if (contourPoints.length < 50) {
        console.log('⚠️ [EdgeDetection V2] Contour trop petit');
        return { success: false, error: 'Contour de la feuille trop petit ou non détecté' };
      }

      // ÉTAPE 3: Approximer le contour par un quadrilatère (4 coins)
      const corners = this.approximateQuadrilateral(contourPoints, info.width, info.height);
      
      if (!corners) {
        console.log('⚠️ [EdgeDetection V2] Impossible d\'approximer un quadrilatère');
        return { success: false, error: 'Impossible de trouver 4 coins distincts' };
      }

      // ÉTAPE 4: Convertir en coordonnées globales (pourcentages)
      const globalCorners: DetectedCorners = {
        topLeft: {
          x: ((zoneX + corners.topLeft.x) / imgWidth) * 100,
          y: ((zoneY + corners.topLeft.y) / imgHeight) * 100
        },
        topRight: {
          x: ((zoneX + corners.topRight.x) / imgWidth) * 100,
          y: ((zoneY + corners.topRight.y) / imgHeight) * 100
        },
        bottomLeft: {
          x: ((zoneX + corners.bottomLeft.x) / imgWidth) * 100,
          y: ((zoneY + corners.bottomLeft.y) / imgHeight) * 100
        },
        bottomRight: {
          x: ((zoneX + corners.bottomRight.x) / imgWidth) * 100,
          y: ((zoneY + corners.bottomRight.y) / imgHeight) * 100
        }
      };

      console.log('✅ [EdgeDetection V2] Coins détectés:', JSON.stringify(globalCorners, null, 2));

      // Calculer la confiance basée sur la régularité du quadrilatère
      const confidence = this.calculateConfidence(corners, info.width, info.height);

      return {
        success: true,
        corners: globalCorners,
        confidence,
        debug: {
          imageWidth: imgWidth,
          imageHeight: imgHeight,
          whitePixelsFound: binaryMask.filter(v => v).length,
          edgePointsFound: contourPoints.length,
          contourLength: contourPoints.length
        }
      };

    } catch (error) {
      console.error('❌ [EdgeDetection V2] Erreur:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * 📝 Crée un masque binaire: true = pixel blanc, false = autre
   * Utilise une analyse HSL pour mieux détecter le blanc
   */
  private createWhiteMask(
    pixels: Buffer,
    width: number,
    height: number,
    channels: number
  ): boolean[] {
    const mask: boolean[] = new Array(width * height).fill(false);
    
    // Seuils pour détecter le blanc
    const MIN_LUMINOSITY = 170;  // Luminosité minimale (0-255)
    const MAX_SATURATION = 40;   // Saturation maximale (le blanc a peu de saturation)

    let whiteCount = 0;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * channels;
        const r = pixels[idx] || 0;
        const g = pixels[idx + 1] || 0;
        const b = pixels[idx + 2] || 0;

        // Calculer luminosité et saturation
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const luminosity = (max + min) / 2;
        const saturation = max === 0 ? 0 : ((max - min) / max) * 100;

        // Un pixel est "blanc" s'il est lumineux et peu saturé
        if (luminosity >= MIN_LUMINOSITY && saturation <= MAX_SATURATION) {
          mask[y * width + x] = true;
          whiteCount++;
        }
      }
    }

    console.log(`⬜ [EdgeDetection V2] Pixels blancs: ${whiteCount}/${width * height} (${(whiteCount / (width * height) * 100).toFixed(1)}%)`);
    
    return mask;
  }

  /**
   * 🔲 Trouve le contour de la zone blanche (algorithme de suivi de contour)
   * Utilise l'algorithme de Moore (marching squares simplifié)
   */
  private findContour(mask: boolean[], width: number, height: number): Point[] {
    const contour: Point[] = [];
    const visited = new Set<string>();

    // Trouver un point de départ sur le contour (premier pixel blanc sur le bord gauche)
    let startX = -1, startY = -1;
    outer: for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (mask[y * width + x]) {
          // Vérifier si c'est un point de contour (a un voisin non-blanc)
          if (this.isEdgePixel(mask, x, y, width, height)) {
            startX = x;
            startY = y;
            break outer;
          }
        }
      }
    }

    if (startX === -1) {
      console.log('⚠️ [EdgeDetection V2] Pas de point de départ trouvé');
      return [];
    }

    // Parcourir tous les pixels de contour
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (mask[y * width + x] && this.isEdgePixel(mask, x, y, width, height)) {
          const key = `${x},${y}`;
          if (!visited.has(key)) {
            visited.add(key);
            contour.push({ x, y });
          }
        }
      }
    }

    // Trier les points du contour pour qu'ils forment une courbe continue
    // (approximation: on ne fait pas un vrai tri, on garde juste les points)
    return contour;
  }

  /**
   * Vérifie si un pixel blanc est sur le bord (a au moins un voisin non-blanc)
   */
  private isEdgePixel(mask: boolean[], x: number, y: number, width: number, height: number): boolean {
    // Directions: 8-connectivité
    const dirs = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
    
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      
      // Bord de l'image = contour
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
        return true;
      }
      
      // Voisin non-blanc = contour
      if (!mask[ny * width + nx]) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 🎯 Approxime le contour par un quadrilatère (4 coins)
   * Utilise l'algorithme de Douglas-Peucker + détection des coins extrêmes
   */
  private approximateQuadrilateral(
    contourPoints: Point[],
    width: number,
    height: number
  ): DetectedCorners | null {
    if (contourPoints.length < 4) return null;

    // Méthode 1: Trouver les 4 points extrêmes par combinaison de coordonnées
    // Coin haut-gauche: minimise (x + y)
    // Coin haut-droit: maximise (x - y)
    // Coin bas-gauche: minimise (x - y) ou maximise (y - x)
    // Coin bas-droit: maximise (x + y)
    
    let topLeft = contourPoints[0];
    let topRight = contourPoints[0];
    let bottomLeft = contourPoints[0];
    let bottomRight = contourPoints[0];

    let minSum = Infinity;      // Pour top-left
    let maxSum = -Infinity;     // Pour bottom-right
    let minDiff = Infinity;     // Pour top-right (x - y petit quand y grand, x petit)
    let maxDiff = -Infinity;    // Pour bottom-left

    for (const p of contourPoints) {
      const sum = p.x + p.y;
      const diff = p.x - p.y;

      if (sum < minSum) {
        minSum = sum;
        topLeft = p;
      }
      if (sum > maxSum) {
        maxSum = sum;
        bottomRight = p;
      }
      if (diff > maxDiff) {
        maxDiff = diff;
        topRight = p;
      }
      if (diff < minDiff) {
        minDiff = diff;
        bottomLeft = p;
      }
    }

    // Vérifier que les 4 coins sont bien distincts
    const corners = [topLeft, topRight, bottomLeft, bottomRight];
    const uniqueKeys = new Set(corners.map(c => `${c.x},${c.y}`));
    
    if (uniqueKeys.size < 4) {
      console.log('⚠️ [EdgeDetection V2] Coins non distincts, utilisation de la méthode alternative');
      return this.findCornersAlternative(contourPoints, width, height);
    }

    // Affiner chaque coin pour trouver le point exact
    const refined = {
      topLeft: this.refineCornerPosition(topLeft, contourPoints, 'topLeft'),
      topRight: this.refineCornerPosition(topRight, contourPoints, 'topRight'),
      bottomLeft: this.refineCornerPosition(bottomLeft, contourPoints, 'bottomLeft'),
      bottomRight: this.refineCornerPosition(bottomRight, contourPoints, 'bottomRight')
    };

    console.log(`🎯 [EdgeDetection V2] Coins approximés:
      TL: (${refined.topLeft.x}, ${refined.topLeft.y})
      TR: (${refined.topRight.x}, ${refined.topRight.y})
      BL: (${refined.bottomLeft.x}, ${refined.bottomLeft.y})
      BR: (${refined.bottomRight.x}, ${refined.bottomRight.y})`);

    return refined;
  }

  /**
   * Méthode alternative pour trouver les coins si la première échoue
   */
  private findCornersAlternative(
    contourPoints: Point[],
    width: number,
    height: number
  ): DetectedCorners | null {
    // Diviser le contour en quadrants par rapport au centre de masse
    let cx = 0, cy = 0;
    for (const p of contourPoints) {
      cx += p.x;
      cy += p.y;
    }
    cx /= contourPoints.length;
    cy /= contourPoints.length;

    // Trouver le point le plus éloigné du centre dans chaque quadrant
    const quadrants = {
      topLeft: [] as Point[],
      topRight: [] as Point[],
      bottomLeft: [] as Point[],
      bottomRight: [] as Point[]
    };

    for (const p of contourPoints) {
      if (p.x < cx && p.y < cy) quadrants.topLeft.push(p);
      else if (p.x >= cx && p.y < cy) quadrants.topRight.push(p);
      else if (p.x < cx && p.y >= cy) quadrants.bottomLeft.push(p);
      else quadrants.bottomRight.push(p);
    }

    const findFarthest = (points: Point[], cx: number, cy: number): Point | null => {
      if (points.length === 0) return null;
      let maxDist = 0;
      let farthest = points[0];
      for (const p of points) {
        const dist = Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2);
        if (dist > maxDist) {
          maxDist = dist;
          farthest = p;
        }
      }
      return farthest;
    };

    const tl = findFarthest(quadrants.topLeft, cx, cy);
    const tr = findFarthest(quadrants.topRight, cx, cy);
    const bl = findFarthest(quadrants.bottomLeft, cx, cy);
    const br = findFarthest(quadrants.bottomRight, cx, cy);

    if (!tl || !tr || !bl || !br) {
      return null;
    }

    return {
      topLeft: tl,
      topRight: tr,
      bottomLeft: bl,
      bottomRight: br
    };
  }

  /**
   * Affine la position d'un coin en cherchant le point le plus "en coin"
   * parmi les points proches
   */
  private refineCornerPosition(
    corner: Point,
    contourPoints: Point[],
    cornerType: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'
  ): Point {
    const SEARCH_RADIUS = 20;
    
    // Points proches du coin actuel
    const nearby = contourPoints.filter(p => 
      Math.abs(p.x - corner.x) < SEARCH_RADIUS && 
      Math.abs(p.y - corner.y) < SEARCH_RADIUS
    );

    if (nearby.length < 3) return corner;

    // Selon le type de coin, chercher le point optimal
    let best = corner;
    let bestScore = -Infinity;

    for (const p of nearby) {
      let score = 0;
      switch (cornerType) {
        case 'topLeft':
          score = -p.x - p.y; // Minimise x + y
          break;
        case 'topRight':
          score = p.x - p.y; // Maximise x - y
          break;
        case 'bottomLeft':
          score = -p.x + p.y; // Maximise y - x
          break;
        case 'bottomRight':
          score = p.x + p.y; // Maximise x + y
          break;
      }
      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    }

    return best;
  }

  /**
   * Calcule un score de confiance basé sur la géométrie du quadrilatère
   */
  private calculateConfidence(
    corners: DetectedCorners,
    width: number,
    height: number
  ): number {
    // Vérifier que le quadrilatère ressemble à un rectangle (A4)
    // Calculer les longueurs des côtés
    const topWidth = Math.sqrt(
      (corners.topRight.x - corners.topLeft.x) ** 2 +
      (corners.topRight.y - corners.topLeft.y) ** 2
    );
    const bottomWidth = Math.sqrt(
      (corners.bottomRight.x - corners.bottomLeft.x) ** 2 +
      (corners.bottomRight.y - corners.bottomLeft.y) ** 2
    );
    const leftHeight = Math.sqrt(
      (corners.bottomLeft.x - corners.topLeft.x) ** 2 +
      (corners.bottomLeft.y - corners.topLeft.y) ** 2
    );
    const rightHeight = Math.sqrt(
      (corners.bottomRight.x - corners.topRight.x) ** 2 +
      (corners.bottomRight.y - corners.topRight.y) ** 2
    );

    // Les côtés opposés doivent avoir des longueurs similaires
    const widthRatio = Math.min(topWidth, bottomWidth) / Math.max(topWidth, bottomWidth);
    const heightRatio = Math.min(leftHeight, rightHeight) / Math.max(leftHeight, rightHeight);

    // Le ratio largeur/hauteur doit être proche de A4 (297/210 ≈ 1.414)
    const avgWidth = (topWidth + bottomWidth) / 2;
    const avgHeight = (leftHeight + rightHeight) / 2;
    const aspectRatio = Math.max(avgWidth, avgHeight) / Math.min(avgWidth, avgHeight);
    const a4Ratio = 297 / 210;
    const aspectScore = 1 - Math.abs(aspectRatio - a4Ratio) / a4Ratio;

    // Score final
    const confidence = Math.round(
      (widthRatio * 30 + heightRatio * 30 + Math.max(0, aspectScore) * 40)
    );

    console.log(`📊 [EdgeDetection V2] Confiance: ${confidence}% (widthRatio=${widthRatio.toFixed(2)}, heightRatio=${heightRatio.toFixed(2)}, aspect=${aspectScore.toFixed(2)})`);

    return Math.max(0, Math.min(100, confidence));
  }
}

// Export singleton
export const edgeDetectionService = new EdgeDetectionService();
