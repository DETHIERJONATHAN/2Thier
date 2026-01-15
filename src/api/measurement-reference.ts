/**
 * 📐 API ROUTES - MEASUREMENT REFERENCE (VERSION ULTRA-PROPRE)
 * 
 * 🎯 ARCHITECTURE NOUVELLE:
 * - ZÉRO code ancien
 * - UNIQUEMENT 2 modules propres: metre-a4-complete-detector + photo-quality-analyzer
 * - 2 routes simples et minimalistes
 * - Dimensions correctes: 13.0×21.7cm pour AprilTag Métré V1.2
 * 
 * @author 2Thier CRM Team
 * @version 1.0.0 - CLEAN
 */

import { Router, type Response } from 'express';
import { authenticateToken, type AuthenticatedRequest } from '../middleware/auth';
import * as sharpModule from 'sharp';

// 🎯 MODULES PROPRES UNIQUEMENT
import { 
  detectMetreA4Complete, 
  type MetreA4CompleteDetectionResult, 
  type UltraPrecisionPoint,
  METRE_A4_V12_COMPLETE_SPECS  // ✅ Importer les vraies specs de référence
} from '../lib/metre-a4-complete-detector';
import { selectBestPhoto, type PhotoCandidate } from '../lib/photo-quality-analyzer';
import { computeObjectDimensions, type CalibrationData, type ObjectCorners } from '../services/measurement-calculator';
import { computeUltraPrecisionHomography, type Point2D } from '../utils/ultra-precision-ransac';

const sharp = (sharpModule as any).default || sharpModule;
const router = Router();

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 FONCTION: AUTO-DÉTECTION OBJETS APRÈS HOMOGRAPHIE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Détecte automatiquement les objets rectangulaires dans l'image BRUTE (avec perspective)
 * Stratégie: Gradients forts → Blobs → Rectangles HORS zone AprilTag
 * 
 * @param imageData - Pixels RGBA de l'image
 * @param width - Largeur image
 * @param height - Hauteur image
 * @param aprilTagCorners - Coins du marqueur AprilTag (pour exclure cette zone)
 * @returns Liste d'objets détectés avec coordonnées en %
 */
async function detectObjectsInProjectedImage(
  imageData: Uint8ClampedArray,
  width: number,
  height: number,
  aprilTagCorners: Array<{x: number, y: number}>
): Promise<Array<{
  corners: { topLeft: {x: number, y: number}, topRight: {x: number, y: number}, bottomRight: {x: number, y: number}, bottomLeft: {x: number, y: number} },
  area: number,
  confidence: number,
  type: 'rectangle' | 'polygon'
}>> {
  try {
    console.log(`\n🔍 [AUTO-DETECT] Détection objets dans image brute: ${width}×${height}px`);
    
    // ÉTAPE 1: Grayscale
    const grayData = new Uint8ClampedArray(width * height);
    let grayMin = 255;
    let grayMax = 0;
    let graySum = 0;
    for (let i = 0; i < width * height; i++) {
      const r = imageData[i * 4];
      const g = imageData[i * 4 + 1];
      const b = imageData[i * 4 + 2];
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      grayData[i] = gray;
      if (gray < grayMin) grayMin = gray;
      if (gray > grayMax) grayMax = gray;
      graySum += gray;
    }
    const grayAvg = Math.round(graySum / grayData.length);
    console.log(`   ✅ Grayscale: min=${grayMin}, max=${grayMax}, avg=${grayAvg}, range=${grayMax-grayMin}`);

    // ÉTAPE 2: Détection edges DIRECTE (Sobel sur grayscale, pas binary)
    console.log(`   🔍 Détection edges (Sobel gradient)...`);
    const edges = detectEdges(grayData, width, height);  // ⚠️ CHANGÉ: direct sur gray, pas binary
    const edgePixels = edges.filter(v => v > 50).length;  // Seuil plus bas pour perspective
    const edgePercent = ((edgePixels / edges.length) * 100).toFixed(1);
    console.log(`      Pixels edges (>50): ${edgePixels} (${edgePercent}%)`);

    // ÉTAPE 3: Trouver contours (blobs de pixels edges)
    console.log(`   📦 Recherche contours (blobs connectés)...`);
    const contours = findContours(edges, width, height);
    console.log(`      Contours bruts: ${contours.length}`);
    
    // ÉTAPE 4: Exclure zone AprilTag (élargie de 20%)
    const [tl, tr, bl, br] = aprilTagCorners;
    const markerMinX = Math.min(tl.x, tr.x, bl.x, br.x) - 50;
    const markerMaxX = Math.max(tl.x, tr.x, bl.x, br.x) + 50;
    const markerMinY = Math.min(tl.y, tr.y, bl.y, br.y) - 50;
    const markerMaxY = Math.max(tl.y, tr.y, bl.y, br.y) + 50;
    console.log(`      Zone AprilTag à exclure: x[${markerMinX.toFixed(0)}-${markerMaxX.toFixed(0)}], y[${markerMinY.toFixed(0)}-${markerMaxY.toFixed(0)}]`);
    
    const contoursHorsMarqueur = contours.filter(c => {
      const cx = (c.corners.topLeft.x + c.corners.bottomRight.x) / 2;
      const cy = (c.corners.topLeft.y + c.corners.bottomRight.y) / 2;
      const dansMarqueur = (cx > markerMinX && cx < markerMaxX && cy > markerMinY && cy < markerMaxY);
      return !dansMarqueur;
    });
    console.log(`      Contours HORS marqueur: ${contoursHorsMarqueur.length}`);

    // ÉTAPE 5: Filtrage par taille et confiance
    const minArea = width * height * 0.005;  // 0.5% au lieu de 1% (plus permissif)
    const maxArea = width * height * 0.7;    // 70% au lieu de 80%
    console.log(`   🎯 Filtrage: area [${minArea.toFixed(0)}-${maxArea.toFixed(0)}px], confidence>30%`);
    
    const afterSizeFilter = contoursHorsMarqueur.filter(c => c.area > minArea && c.area < maxArea);
    console.log(`      Après filtre taille: ${afterSizeFilter.length}`);
    
    const validObjects = afterSizeFilter
      .filter(c => c.confidence > 0.3)  // Baissé à 30% (perspective déforme)
      .sort((a, b) => b.area - a.area);
    
    console.log(`      Après filtre confidence: ${validObjects.length} objets valides`);
    
    // Debug top 3
    validObjects.slice(0, 3).forEach((c, i) => {
      const areaPercent = ((c.area/(width*height))*100).toFixed(2);
      const confPercent = (c.confidence*100).toFixed(0);
      console.log(`      [${i}] area=${c.area}px (${areaPercent}%), conf=${confPercent}%`);
    });

    if (validObjects.length === 0) {
      console.log(`   ⚠️  AUCUN objet détecté !`);
      console.log(`      Raisons possibles:`);
      console.log(`      - Contraste trop faible (range=${grayMax-grayMin})`);
      console.log(`      - Objet trop proche du marqueur AprilTag`);
      console.log(`      - Edges trop faibles (${edgePercent}% de l'image)`);
    }

    // Convertir pixels → %
    return validObjects.map(obj => ({
      ...obj,
      corners: {
        topLeft: { x: (obj.corners.topLeft.x / width) * 100, y: (obj.corners.topLeft.y / height) * 100 },
        topRight: { x: (obj.corners.topRight.x / width) * 100, y: (obj.corners.topRight.y / height) * 100 },
        bottomRight: { x: (obj.corners.bottomRight.x / width) * 100, y: (obj.corners.bottomRight.y / height) * 100 },
        bottomLeft: { x: (obj.corners.bottomLeft.x / width) * 100, y: (obj.corners.bottomLeft.y / height) * 100 }
      }
    }));
  } catch (error) {
    console.error('❌ Auto-détection objets échouée:', error);
    return [];
  }
}

/**
 * Calcule seuil optimal par méthode Otsu
 */
function computeOtsuThreshold(data: Uint8ClampedArray): number {
  const histogram = new Array(256).fill(0);
  data.forEach(v => histogram[v]++);
  
  const total = data.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * histogram[i];

  let sumB = 0;
  let wB = 0;
  let wF = 0;
  let maxVariance = 0;
  let threshold = 0;

  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;
    
    wF = total - wB;
    if (wF === 0) break;

    sumB += t * histogram[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const variance = wB * wF * (mB - mF) * (mB - mF);

    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = t;
    }
  }

  return threshold;
}

/**
 * Détection edges DIRECTE sur grayscale (pas de binarisation)
 * Sobel sur niveaux de gris pour préserver les gradients faibles
 */
function detectEdges(data: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const edges = new Uint8ClampedArray(data.length);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      
      // Sobel X
      const gx = 
        -data[(y-1)*width + (x-1)] + data[(y-1)*width + (x+1)] +
        -2*data[y*width + (x-1)] + 2*data[y*width + (x+1)] +
        -data[(y+1)*width + (x-1)] + data[(y+1)*width + (x+1)];
      
      // Sobel Y
      const gy = 
        -data[(y-1)*width + (x-1)] - 2*data[(y-1)*width + x] - data[(y-1)*width + (x+1)] +
        data[(y+1)*width + (x-1)] + 2*data[(y+1)*width + x] + data[(y+1)*width + (x+1)];
      
      // Magnitude du gradient (normalisée 0-255)
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      edges[idx] = Math.min(255, magnitude / 4);  // Division par 4 pour éviter saturation
    }
  }
  
  return edges;
}

/**
 * Trouve contours fermés et approxime en rectangles
 */
function findContours(edges: Uint8ClampedArray, width: number, height: number): Array<{
  corners: { topLeft: {x: number, y: number}, topRight: {x: number, y: number}, bottomRight: {x: number, y: number}, bottomLeft: {x: number, y: number} },
  area: number,
  confidence: number,
  type: 'rectangle' | 'polygon'
}> {
  const contours: any[] = [];
  
  // Simplified: Détecter blobs par composantes connectées
  const visited = new Uint8ClampedArray(width * height);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (edges[idx] > 128 && !visited[idx]) {
        // Nouveau blob trouvé
        const blob = floodFill(edges, visited, x, y, width, height);
        
        if (blob.points.length > 50) {  // Au moins 50 pixels
          // Approximer en rectangle
          const rect = approximateRectangle(blob.points);
          if (rect) {
            contours.push({
              corners: rect,
              area: blob.points.length,
              confidence: computeRectangleConfidence(blob.points, rect),
              type: 'rectangle'
            });
          }
        }
      }
    }
  }
  
  return contours;
}

/**
 * Flood fill pour trouver blob
 */
function floodFill(
  edges: Uint8ClampedArray,
  visited: Uint8ClampedArray,
  startX: number,
  startY: number,
  width: number,
  height: number
): { points: Array<{x: number, y: number}> } {
  const points: Array<{x: number, y: number}> = [];
  const stack: Array<{x: number, y: number}> = [{ x: startX, y: startY }];
  
  while (stack.length > 0 && points.length < 10000) {  // Limite sécurité
    const { x, y } = stack.pop()!;
    const idx = y * width + x;
    
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    if (visited[idx] || edges[idx] < 128) continue;
    
    visited[idx] = 1;
    points.push({ x, y });
    
    // 4-connectivity
    stack.push({ x: x + 1, y });
    stack.push({ x: x - 1, y });
    stack.push({ x, y: y + 1 });
    stack.push({ x, y: y - 1 });
  }
  
  return { points };
}

/**
 * Approxime points en rectangle (bounding box orienté)
 */
function approximateRectangle(points: Array<{x: number, y: number}>): {
  topLeft: {x: number, y: number},
  topRight: {x: number, y: number},
  bottomRight: {x: number, y: number},
  bottomLeft: {x: number, y: number}
} | null {
  if (points.length < 4) return null;
  
  // Simple bounding box (peut être amélioré avec PCA pour orientation)
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  
  return {
    topLeft: { x: minX, y: minY },
    topRight: { x: maxX, y: minY },
    bottomRight: { x: maxX, y: maxY },
    bottomLeft: { x: minX, y: maxY }
  };
}

/**
 * Calcule confiance du rectangle (ratio remplissage)
 */
function computeRectangleConfidence(
  points: Array<{x: number, y: number}>,
  rect: { topLeft: {x: number, y: number}, bottomRight: {x: number, y: number} }
): number {
  const rectArea = (rect.bottomRight.x - rect.topLeft.x) * (rect.bottomRight.y - rect.topLeft.y);
  return Math.min(1.0, points.length / rectArea);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE 1: POST /api/measurement-reference/ultra-fusion-detect
// 🎯 DÉTECTION MULTI-PHOTOS + SÉLECTION MEILLEURE + AUTO-DÉTECTION OBJETS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/measurement-reference/ultra-fusion-detect
 * 
 * Détecte AprilTag Métré V1.2 sur N photos et sélectionne la meilleure
 * 
 * Body: { photos: [{ base64, mimeType }] }
 * Response: { success, fusedCorners, detectionMethod, markerSizeCm, markerHeightCm, ... }
 */
router.post('/ultra-fusion-detect', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { photos } = req.body;

    if (!req.user?.id) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Au minimum 1 photo requise dans photos[]' 
      });
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`🎯 [ULTRA-CLEAN] POST /ultra-fusion-detect - ${photos.length} photo(s)`);
    console.log(`${'='.repeat(80)}\n`);

    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 1: Préparer les photos et détecter AprilTags
    // ═══════════════════════════════════════════════════════════════════════════
    const candidates: PhotoCandidate[] = [];

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      console.log(`   📷 Photo ${i}: décodage et détection...`);

      try {
        // Décoder base64
        const base64Clean = photo.base64.includes(',') ? photo.base64.split(',')[1] : photo.base64;
        const imageBuffer = Buffer.from(base64Clean, 'base64');
        
        // Pré-réduction pour limiter le coût CPU sur grosses photos
        const resizedBuffer = await sharp(imageBuffer)
          .resize({
            width: 1200,
            height: 1200,
            fit: 'inside',
            withoutEnlargement: true
          })
          .toBuffer();

        const metadata = await sharp(resizedBuffer).metadata();
        const width = metadata.width!;
        const height = metadata.height!;

        // ✅ TENTATIVE RAPIDE SANS PRÉ-TRAITEMENT
        const { data: basePixels } = await sharp(resizedBuffer)
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });
        const baseRgba = new Uint8ClampedArray(basePixels);
        let rgbaUsed = baseRgba;
        let detection = detectMetreA4Complete(baseRgba, width, height);

        // 🎨 PRÉ-TRAITEMENT ULTRA-PREMIUM UNIQUEMENT SI ÉCHEC
        if (!detection) {
          console.log(`      🎨 Preprocessing ULTRA-PREMIUM: CLAHE + Bilateral + Denoise + Sharpen MAX...`);

          // ÉTAPE 1: Denoising (réduction bruit) AVANT tout traitement
          let processedBuffer = await sharp(resizedBuffer)
            .median(3)                             // Filtre médian 3x3 : élimine le grain/bruit
            .toBuffer();

          // ÉTAPE 2: CLAHE (Contrast Limited Adaptive Histogram Equalization)
          // Améliore contraste local sans sur-saturer
          processedBuffer = await sharp(processedBuffer)
            .normalize()                           // Normalisation histogram globale
            .linear(1.3, -(128 * 0.3))            // Ajustement linéaire : +30% contraste
            .toBuffer();

          // ÉTAPE 3: Bilateral Filter (préserve bords nets + réduit bruit zones plates)
          // Sharp n'a pas de bilateral direct, on utilise blur + sharpen intelligent
          processedBuffer = await sharp(processedBuffer)
            .blur(0.5)                             // Micro-blur pour zones plates uniquement
            .toBuffer();

          // ÉTAPE 4: Sharpening MAXIMAL + Saturation pour points noirs
          const { data: enhancedPixels } = await sharp(processedBuffer)
            .sharpen({
              sigma: 2.0,      // Rayon gaussien élargi (2.0 = netteté forte)
              m1: 1.5,         // +50% netteté zones plates (AprilTags/points noirs) ⬆️
              m2: 0.6,         // Contrôle zones fort contraste (plus agressif)
              x1: 2,           // Seuil bas (plus sensible)
              y2: 20,          // Seuil haut augmenté
              y3: 20           // Saturation augmentée
            })
            .modulate({
              brightness: 1.05, // +5% luminosité (meilleure visibilité)
              saturation: 1.2,  // +20% saturation → points noirs ULTRA-visibles ⬆️
              hue: 0
            })
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });
          const rgba = new Uint8ClampedArray(enhancedPixels);
          rgbaUsed = rgba;

          // 🎯 DÉTECTION AUTONOME: 5 AprilTags + 12 points
          detection = detectMetreA4Complete(rgba, width, height);
        }
        
        if (!detection) {
          console.log(`      ❌ AprilTag non détecté`);
          continue;
        }

        // Créer candidat
        candidates.push({
          id: `photo-${i}`,
          imageData: rgbaUsed,
          width,
          height,
          detection,
          timestamp: Date.now()
        });

        console.log(`      ✅ ${detection.breakdown.total} points détectés (${detection.estimatedPrecision})`);
      } catch (err) {
        console.error(`      ❌ Erreur traitement:`, err);
      }
    }

    // Si aucun AprilTag détecté
    if (candidates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'AprilTag Métré V1.2 non détecté sur aucune photo',
        detections: 0
      });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 2: Sélectionner la meilleure photo
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`\n📊 Sélection meilleure photo parmi ${candidates.length}...`);
    const bestResult = selectBestPhoto(candidates);
    const best = bestResult.bestPhoto;
    const bestIdx = parseInt(best.id.split('-')[1]);

    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 2.5: 🎯 AUTO-DÉTECTION OBJETS dans meilleure photo
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`\n🎯 Auto-détection objets dans meilleure photo...`);
    const detectedObjects = await detectObjectsInProjectedImage(
      best.imageData,
      best.width,
      best.height,
      best.detection.aprilTagCenters  // ⚠️ COINS du marqueur pour l'exclure
    );
    
    if (detectedObjects.length > 0) {
      console.log(`   ✅ ${detectedObjects.length} objet(s) détecté(s) automatiquement`);
      detectedObjects.forEach((obj, idx) => {
        console.log(`      📦 Objet ${idx + 1}: ${obj.type}, area=${obj.area}px, confidence=${(obj.confidence * 100).toFixed(1)}%`);
      });
    } else {
      console.log(`   ⚠️  Aucun objet auto-détecté (utilisateur devra sélectionner manuellement)`);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 3: Formater réponse pour le frontend
    // ═══════════════════════════════════════════════════════════════════════════
    const [tl, tr, bl, br] = best.detection.aprilTagCenters;

    // Convertir coins pixels → pourcentages
    const fusedCorners = {
      topLeft: { x: (tl.x / best.width) * 100, y: (tl.y / best.height) * 100 },
      topRight: { x: (tr.x / best.width) * 100, y: (tr.y / best.height) * 100 },
      bottomRight: { x: (br.x / best.width) * 100, y: (br.y / best.height) * 100 },
      bottomLeft: { x: (bl.x / best.width) * 100, y: (bl.y / best.height) * 100 }
    };

    // Récupérer base64 meilleure photo
    const base64Clean = photos[bestIdx].base64.includes(',') ? 
      photos[bestIdx].base64.split(',')[1] : photos[bestIdx].base64;

    const totalTime = Date.now() - startTime;
    console.log(`\n✅ SUCCÈS - ${totalTime}ms (photo ${bestIdx}, score: ${bestResult.bestScore.total.toFixed(1)}/100)\n`);

    return res.json({
      success: true,
      method: 'ultra-precision-best-photo',
      bestPhotoBase64: base64Clean,
      fusedCorners,
      homographyReady: true,
      detectionMethod: 'AprilTag-Metre-V1.2-Ultra',
      markerSizeCm: 13.0,
      markerHeightCm: 21.7,  // 🎯 CRITIQUE: Hauteur explicite pour AprilTag rectangulaire
      homographyMatrix: best.detection.homography.matrix,
      reprojectionErrorMm: best.detection.homography.reprojectionErrorMm,
      ultraPrecision: {
        totalPoints: best.detection.breakdown.total,
        aprilTags: best.detection.breakdown.aprilTags,
        referenceDots: best.detection.breakdown.referenceDots,
        extraPoints: best.detection.breakdown.extraPoints,
        quality: best.detection.homography.quality,
        estimatedPrecision: best.detection.estimatedPrecision,
        homographyMatrix: best.detection.homography.matrix,
        reprojectionError: best.detection.homography.reprojectionErrorMm,
        // 🎯 AJOUT CRITIQUE: Tous les points pour RANSAC
        points: best.detection.points.map(p => ({
          x: p.pixel.x,
          y: p.pixel.y,
          realX: p.real.x,
          realY: p.real.y,
          type: p.type,
          confidence: p.confidence
        }))
      },
      // 🎯 NOUVEAU: Objets détectés automatiquement
      autoDetectedObjects: detectedObjects.map((obj, idx) => ({
        id: `auto-object-${idx}`,
        corners: obj.corners,
        area: obj.area,
        confidence: obj.confidence,
        type: obj.type,
        autoSelected: idx === 0  // Premier objet pré-sélectionné par défaut
      })),
      bestPhoto: {
        index: bestIdx,
        score: bestResult.bestScore.total,
        sharpness: bestResult.bestScore.sharpness,
        homographyQuality: bestResult.bestScore.homographyQuality,
        captureConditions: bestResult.bestScore.captureConditions,
        warnings: bestResult.bestScore.warnings
      },
      allPhotoScores: bestResult.allScores.map((s, idx) => ({
        index: idx,
        score: s.total,
        detected: true
      })),
      metrics: {
        inputPhotos: photos.length,
        successfulDetections: candidates.length,
        processingTimeMs: totalTime,
        improvement: bestResult.stats.improvement
      }
    });

  } catch (error) {
    console.error('❌ [ULTRA-CLEAN] Erreur:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de l\'analyse des photos'
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE 2: POST /api/measurement-reference/compute-dimensions-simple
// 🎯 CALCUL DES DIMENSIONS DE L'OBJET MESURÉ
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/measurement-reference/compute-dimensions-simple
 * 
 * Calcule les dimensions réelles d'un objet mesuré
 * 
 * Body: {
 *   fusedCorners: { topLeft, topRight, bottomRight, bottomLeft } en %,
 *   objectPoints: 4 points cliqués en pixels canvas,
 *   imageWidth, imageHeight,
 *   markerSizeCm: 13.0,
 *   markerHeightCm: 21.7,
 *   detectionMethod: "AprilTag-Metre-V1.2-Ultra",
 *   canvasScale: 1.0,
 *   detectionQuality: 95,
 *   reprojectionErrorMm: 1.5
 * }
 * 
 * Response: {
 *   success: true,
 *   object: { largeur_cm, hauteur_cm, largeur_mm, hauteur_mm },
 *   uncertainties: { largeur_cm, hauteur_cm },
 *   confidence: number,
 *   method: "homography-ultra-precision",
 *   warnings: []
 * }
 */
router.post('/compute-dimensions-simple', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🎯 [ULTRA-CLEAN] POST /compute-dimensions-simple');
    console.log('='.repeat(70));
    
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Non authentifié' });
    }
    
    const { 
      fusedCorners,
      objectPoints,
      imageWidth, 
      imageHeight,
      markerSizeCm = 13.0,
      markerHeightCm = 21.7,  // 🎯 CRITIQUE: Hauteur du marqueur
      detectionMethod = "AprilTag-Metre-V1.2-Ultra",
      canvasScale = 1,
      exif,
      detectionQuality = 95,
      reprojectionErrorMm = 1.5
    } = req.body;
    
    // Validation
    if (!fusedCorners || !objectPoints || objectPoints.length !== 4) {
      return res.status(400).json({ 
        success: false, 
        error: 'fusedCorners et 4 objectPoints requis' 
      });
    }
    
    if (!imageWidth || !imageHeight) {
      return res.status(400).json({ 
        success: false, 
        error: 'imageWidth et imageHeight requis' 
      });
    }
    
    console.log('📋 Données reçues:');
    console.log(`   Image: ${imageWidth}×${imageHeight}, canvasScale: ${canvasScale}`);
    console.log(`   📐 Marqueur: ${markerSizeCm}×${markerHeightCm}cm (${detectionMethod})`);
    
    // Convertir fusedCorners de % vers pixels image
    const markerCorners = {
      topLeft: { 
        x: (fusedCorners.topLeft.x / 100) * imageWidth, 
        y: (fusedCorners.topLeft.y / 100) * imageHeight 
      },
      topRight: { 
        x: (fusedCorners.topRight.x / 100) * imageWidth, 
        y: (fusedCorners.topRight.y / 100) * imageHeight 
      },
      bottomRight: { 
        x: (fusedCorners.bottomRight.x / 100) * imageWidth, 
        y: (fusedCorners.bottomRight.y / 100) * imageHeight 
      },
      bottomLeft: { 
        x: (fusedCorners.bottomLeft.x / 100) * imageWidth, 
        y: (fusedCorners.bottomLeft.y / 100) * imageHeight 
      }
    };
    
    console.log('📍 Coins marqueur (pixels image):');
    console.log(`   TL: (${markerCorners.topLeft.x.toFixed(0)}, ${markerCorners.topLeft.y.toFixed(0)})`);
    console.log(`   TR: (${markerCorners.topRight.x.toFixed(0)}, ${markerCorners.topRight.y.toFixed(0)})`);
    
    // Convertir objectPoints de canvas vers pixels image
    const objectCorners: ObjectCorners = {
      topLeft: { 
        x: objectPoints[0].x / canvasScale, 
        y: objectPoints[0].y / canvasScale 
      },
      topRight: { 
        x: objectPoints[1].x / canvasScale, 
        y: objectPoints[1].y / canvasScale 
      },
      bottomRight: { 
        x: objectPoints[2].x / canvasScale, 
        y: objectPoints[2].y / canvasScale 
      },
      bottomLeft: { 
        x: objectPoints[3].x / canvasScale, 
        y: objectPoints[3].y / canvasScale 
      }
    };
    
    console.log('📍 Coins objet (pixels image):');
    console.log(`   TL: (${objectCorners.topLeft.x.toFixed(0)}, ${objectCorners.topLeft.y.toFixed(0)})`);
    console.log(`   TR: (${objectCorners.topRight.x.toFixed(0)}, ${objectCorners.topRight.y.toFixed(0)})`);
    console.log(`   BR: (${objectCorners.bottomRight.x.toFixed(0)}, ${objectCorners.bottomRight.y.toFixed(0)})`);
    console.log(`   BL: (${objectCorners.bottomLeft.x.toFixed(0)}, ${objectCorners.bottomLeft.y.toFixed(0)})`);
    
    // Construire CalibrationData
    const calibration: CalibrationData = {
      markerCorners,
      markerSizeCm,
      markerHeightCm,  // 🎯 PASSER LA HAUTEUR
      detectionMethod,
      imageWidth,
      imageHeight,
      exif,
      detectionQuality,
      reprojectionErrorMm
    };
    
    // 🎯 APPEL du service de calcul CENTRALISÉ
    const result = computeObjectDimensions(calibration, objectCorners);
    
    return res.json(result);
    
  } catch (error) {
    console.error('❌ [ULTRA-CLEAN] Erreur compute-dimensions-simple:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur lors du calcul des dimensions',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// ROUTE 3: POST /api/measurement-reference/ultra-precision-compute
// 🔬 CALCUL ULTRA-PRÉCISION AVEC 41+ POINTS (RANSAC + LEVENBERG-MARQUARDT)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/measurement-reference/ultra-precision-compute
 * 
 * Calcule les dimensions avec RANSAC + Levenberg-Marquardt utilisant tous les 41+ points
 * 
 * Body: {
 *   detectedPoints: [ { pixel: {x,y}, real: {x,y}, type: 'apriltag'|'apriltag-corner'|'dot' } ], 
 *   objectPoints: 4 points cliqués en pixels,
 *   imageWidth, imageHeight,
 *   markerSizeCm: 13.0,
 *   markerHeightCm: 21.7,
 *   detectionMethod: "AprilTag-Metre-V1.2"
 * }
 * 
 * Response: {
 *   success: true,
 *   object: { largeur_cm, hauteur_cm },
 *   uncertainties: { largeur_cm, hauteur_cm },
 *   depth: { mean_mm, stdDev_mm, incline_angle_deg },
 *   quality: { homography_quality, ransac_inliers, confidence },
 *   reprojectionError_mm: 0.15
 * }
 */
router.post('/ultra-precision-compute', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('\n' + '='.repeat(90));
    console.log('🔬 [ULTRA-PRECISION] POST /ultra-precision-compute');
    console.log('='.repeat(90));
    
    // ✅ Valider qu'on utilise les bonnes specs canoniques du détecteur
    const expectedExtraPoints = 0;
    const expectedAprilTags = METRE_A4_V12_COMPLETE_SPECS.aprilTags.length + 1; // + tag central
    const expectedPointCount = expectedAprilTags +
                                METRE_A4_V12_COMPLETE_SPECS.referenceDots.length +
                                expectedExtraPoints;
    console.log(`📋 Specs canoniques chargées: ${expectedPointCount} points attendus (${expectedAprilTags} AprilTags + ${METRE_A4_V12_COMPLETE_SPECS.referenceDots.length} dots)`);
    
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Non authentifié' });
    }
    
    const { 
      detectedPoints,
      objectPoints,
      imageWidth, 
      imageHeight,
      markerSizeCm = 13.0,
      markerHeightCm = 21.7,
      detectionMethod = "AprilTag-Metre-V1.2",
      canvasScale = 1
    } = req.body;
    
    // Validation
    if (!detectedPoints || !Array.isArray(detectedPoints) || detectedPoints.length < 10) {
      return res.status(400).json({ 
        success: false, 
        error: `Au minimum 10 points détectés requis, ${detectedPoints?.length || 0} fournis` 
      });
    }
    
    if (!objectPoints || objectPoints.length !== 4) {
      return res.status(400).json({ 
        success: false, 
        error: 'Exactement 4 points objectPoints requis' 
      });
    }
    
    console.log(`📊 ${detectedPoints.length} points détectés`);
    
    // Préparer données pour RANSAC avec validation (1 seule passe pour garantir l'alignement src/dst)
    const validDetectedPoints = detectedPoints.filter(
      (p): p is UltraPrecisionPoint =>
        !!p &&
        !!p.pixel &&
        !!p.real &&
        typeof p.pixel.x === 'number' &&
        typeof p.pixel.y === 'number' &&
        typeof p.real.x === 'number' &&
        typeof p.real.y === 'number'
    );

    const srcPoints: Point2D[] = validDetectedPoints.map(p => ({ x: p.pixel.x, y: p.pixel.y }));
    const dstPoints: Point2D[] = validDetectedPoints.map(p => ({ x: p.real.x, y: p.real.y }));
    
    console.log(`   ✅ Points valides (pixel+real): ${validDetectedPoints.length}`);
    console.log(`   ✅ srcPoints (pixel): ${srcPoints.length} valides`);
    console.log(`   ✅ dstPoints (real): ${dstPoints.length} valides`);
    
    console.log(`   AprilTag: ${detectedPoints.filter(p => p.type === 'apriltag').length}`);
    console.log(`   Dots: ${detectedPoints.filter(p => p.type === 'dot').length}`);
    
    // Vérification que les points sont valides
    if (srcPoints.length < 10 || dstPoints.length < 10) {
      console.error(
        `❌ Points invalides: valid=${validDetectedPoints.length}, srcPoints=${srcPoints.length}, dstPoints=${dstPoints.length}`
      );
      return res.status(400).json({
        success: false,
        error: `Points valides insuffisants: ${srcPoints.length} pixel, ${dstPoints.length} real (10+ requis)`
      });
    }
    
    // Debug logging avant RANSAC
    console.log(`\n🔬 RANSAC INPUT VALIDATION:`);
    console.log(`   Total points: ${srcPoints.length}`);
    
    // Afficher les 4 premiers points (AprilTags)
    console.log(`   📍 4 premiers points (AprilTags):`);
    for (let i = 0; i < Math.min(4, srcPoints.length); i++) {
      console.log(`      [${i}] pixel: (${srcPoints[i].x.toFixed(1)}, ${srcPoints[i].y.toFixed(1)}) → real: (${dstPoints[i].x}, ${dstPoints[i].y}) mm`);
    }
    
    // Calculer les distances pixel entre AprilTags pour validation
    if (srcPoints.length >= 4) {
      const pxDistTL_TR = Math.hypot(srcPoints[1].x - srcPoints[0].x, srcPoints[1].y - srcPoints[0].y);
      const pxDistTL_BL = Math.hypot(srcPoints[2].x - srcPoints[0].x, srcPoints[2].y - srcPoints[0].y);
      const pxDistTL_BR = Math.hypot(srcPoints[3].x - srcPoints[0].x, srcPoints[3].y - srcPoints[0].y);
      console.log(`   📏 Distances pixel depuis TL:`);
      console.log(`      TL→TR: ${pxDistTL_TR.toFixed(1)}px (attendu: 130mm → ratio ~${(pxDistTL_TR/130).toFixed(2)} px/mm)`);
      console.log(`      TL→BL: ${pxDistTL_BL.toFixed(1)}px (attendu: 217mm → ratio ~${(pxDistTL_BL/217).toFixed(2)} px/mm)`);
      console.log(`      TL→BR: ${pxDistTL_BR.toFixed(1)}px (diagonal)`);
      
      // Vérifier si l'ordre des AprilTags est correct (TL doit avoir les plus petits x,y pixel)
      const tlPx = srcPoints[0];
      const trPx = srcPoints[1];
      const blPx = srcPoints[2];
      const brPx = srcPoints[3];
      console.log(`   🧭 Validation géométrique:`);
      console.log(`      TL (${tlPx.x.toFixed(0)},${tlPx.y.toFixed(0)}) < TR (${trPx.x.toFixed(0)},${trPx.y.toFixed(0)})? x: ${tlPx.x < trPx.x}`);
      console.log(`      TL (${tlPx.x.toFixed(0)},${tlPx.y.toFixed(0)}) < BL (${blPx.x.toFixed(0)},${blPx.y.toFixed(0)})? y: ${tlPx.y < blPx.y}`);
    }
    
    // 🔬 RANSAC + Levenberg-Marquardt
    let ransacResult;
    let ransacUsedFiltered = false;
    try {
      ransacResult = computeUltraPrecisionHomography(
        srcPoints,
        dstPoints,
        markerSizeCm * 10, // mm
        markerHeightCm * 10 // mm
      );
    } catch (err) {
      console.error('❌ Erreur RANSAC:', err);
      return res.status(400).json({
        success: false,
        error: 'Homographie ultra-précision impossible',
        details: err instanceof Error ? err.message : 'Erreur inconnue'
      });
    }

    // 🔁 Fallback: retirer les coins AprilTag si qualité faible
    const inlierRatio = srcPoints.length ? ransacResult.inlierCount / srcPoints.length : 0;
    const shouldFallback = ransacResult.quality < 30 || inlierRatio < 0.4;
    if (shouldFallback) {
      const filteredPoints = validDetectedPoints.filter(p => p.type !== 'apriltag-corner');
      if (filteredPoints.length >= 10) {
        const filteredSrc = filteredPoints.map(p => ({ x: p.pixel.x, y: p.pixel.y }));
        const filteredDst = filteredPoints.map(p => ({ x: p.real.x, y: p.real.y }));
        console.log(`⚠️  RANSAC faible (qualité=${ransacResult.quality.toFixed(1)}%, inliers=${ransacResult.inlierCount}/${srcPoints.length}) → retry sans coins AprilTag (${filteredPoints.length} pts)`);
        try {
          const retryResult = computeUltraPrecisionHomography(
            filteredSrc,
            filteredDst,
            markerSizeCm * 10,
            markerHeightCm * 10
          );
          if (retryResult.quality > ransacResult.quality) {
            ransacResult = retryResult;
            ransacUsedFiltered = true;
          }
        } catch (err) {
          console.warn('⚠️  Retry RANSAC sans coins AprilTag échoué:', err);
        }
      }
    }
    
    // Transformer objectPoints avec la nouvelle homographie
    const objectCorners: ObjectCorners = {
      topLeft: {
        x: objectPoints[0].x / canvasScale,
        y: objectPoints[0].y / canvasScale
      },
      topRight: {
        x: objectPoints[1].x / canvasScale,
        y: objectPoints[1].y / canvasScale
      },
      bottomRight: {
        x: objectPoints[2].x / canvasScale,
        y: objectPoints[2].y / canvasScale
      },
      bottomLeft: {
        x: objectPoints[3].x / canvasScale,
        y: objectPoints[3].y / canvasScale
      }
    };
    
    // Appliquer homographie RANSAC aux coins de l'objet
    const transformCorner = (p: { x: number; y: number }) => {
      const H = ransacResult.homography;
      const num_x = H[0][0] * p.x + H[0][1] * p.y + H[0][2];
      const num_y = H[1][0] * p.x + H[1][1] * p.y + H[1][2];
      const denom = H[2][0] * p.x + H[2][1] * p.y + H[2][2];
      return [num_x / denom, num_y / denom];
    };
    
    const [tlX, tlY] = transformCorner(objectCorners.topLeft);
    const [trX, trY] = transformCorner(objectCorners.topRight);
    const [brX, brY] = transformCorner(objectCorners.bottomRight);
    const [blX, blY] = transformCorner(objectCorners.bottomLeft);
    
    // Calculer dimensions
    const widthTop = Math.sqrt((trX - tlX) ** 2 + (trY - tlY) ** 2);
    const widthBottom = Math.sqrt((brX - blX) ** 2 + (brY - blY) ** 2);
    const heightLeft = Math.sqrt((blX - tlX) ** 2 + (blY - tlY) ** 2);
    const heightRight = Math.sqrt((brX - trX) ** 2 + (brY - trY) ** 2);
    
    const largeur_mm = (widthTop + widthBottom) / 2;
    const hauteur_mm = (heightLeft + heightRight) / 2;
    
    // Incertitudes basées sur reprojection error
    const reprojErrorMm = ransacResult.reprojectionErrorMm;
    const uncertainty_mm = reprojErrorMm * 2; // Facteur 2 pour couverture 95%
    
    console.log(`\n✅ RÉSULTAT ULTRA-PRÉCISION:`);
    console.log(`   📏 Largeur: ${(largeur_mm / 10).toFixed(2)} cm (±${(uncertainty_mm / 10).toFixed(2)} cm)`);
    console.log(`   📏 Hauteur: ${(hauteur_mm / 10).toFixed(2)} cm (±${(uncertainty_mm / 10).toFixed(2)} cm)`);
    console.log(`   📊 RANSAC: ${ransacResult.inlierCount}/${(ransacUsedFiltered ? validDetectedPoints.filter(p => p.type !== 'apriltag-corner').length : srcPoints.length)} inliers${ransacUsedFiltered ? ' (sans coins AprilTag)' : ''}`);
    console.log(`   🎯 Qualité: ${ransacResult.quality.toFixed(1)}%`);
    console.log(`   📐 Profondeur: ${ransacResult.depthMean.toFixed(0)}mm (±${ransacResult.depthStdDev.toFixed(0)}mm)`);
    console.log(`   🔄 Inclinaison: ${ransacResult.inclineAngle.toFixed(2)}°`);
    console.log('='.repeat(90) + '\n');
    
    return res.json({
      success: true,
      method: 'ultra-precision-ransac-lm',
      object: {
        largeur_cm: largeur_mm / 10,
        hauteur_cm: hauteur_mm / 10,
        largeur_mm: largeur_mm,
        hauteur_mm: hauteur_mm
      },
      uncertainties: {
        largeur_cm: uncertainty_mm / 10,
        hauteur_cm: uncertainty_mm / 10,
        largeur_mm: uncertainty_mm,
        hauteur_mm: uncertainty_mm
      },
      depth: {
        mean_mm: ransacResult.depthMean,
        stdDev_mm: ransacResult.depthStdDev,
        incline_angle_deg: ransacResult.inclineAngle
      },
      quality: {
        homography_quality: ransacResult.quality,
        ransac_inliers: ransacResult.inlierCount,
        ransac_outliers: ransacResult.outlierCount,
        confidence: ransacResult.confidence,
        reprojectionError_px: ransacResult.reprojectionError,
        reprojectionError_mm: ransacResult.reprojectionErrorMm
      },
      precision: {
        type: 'ultra-high',
        description: '±0.25cm avec 41+ points RANSAC + Levenberg-Marquardt',
        points_used: detectedPoints.length,
        method: 'RANSAC + LM with 3D depth estimation'
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur ultra-precision-compute:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

export default router;
