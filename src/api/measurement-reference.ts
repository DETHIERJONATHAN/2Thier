/**
 * 📐 API ROUTES - MEASUREMENT REFERENCE (MÉTRÉ A4 V10)
 *
 * 🎯 ARCHITECTURE V10:
 * - 6 petits AprilTags 5cm (3 haut, 3 bas)
 * - 1 grand AprilTag 10cm centré (décalé vers le bas)
 * - Calculs 100% backend via homographie
 * - Une photo = un calcul
 */

import { Router, type Response } from 'express';
import { authenticateToken, type AuthenticatedRequest } from '../middleware/auth';
import * as sharpModule from 'sharp';
import {
  detectMetreA4V10,
  METRE_A4_V10_SPECS
} from '../lib/metre-a4-v10-detector';
import { computeObjectDimensions, type CalibrationData, type ObjectCorners } from '../services/measurement-calculator';

const sharp = (sharpModule as any).default || sharpModule;
const router = Router();

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE 1: POST /api/measurement-reference/ultra-fusion-detect
// 🎯 DÉTECTION UNIQUE MÉTRÉ A4 V10 (1 photo)
// ═══════════════════════════════════════════════════════════════════════════════

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

    if (photos.length > 1) {
      console.log(`⚠️ [V10] ${photos.length} photos reçues → seule la première est analysée`);
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`🎯 [MÉTRÉ A4 V10] POST /ultra-fusion-detect - 1 photo`);
    console.log(`${'='.repeat(80)}\n`);

    const photo = photos[0];
    const base64Clean = photo.base64.includes(',') ? photo.base64.split(',')[1] : photo.base64;
    const imageBuffer = Buffer.from(base64Clean, 'base64');

    const originalMetadata = await sharp(imageBuffer).metadata();
    const originalWidth = originalMetadata.width!;
    const originalHeight = originalMetadata.height!;

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
    const scaleX = originalWidth / width;
    const scaleY = originalHeight / height;

    const { data: basePixels } = await sharp(resizedBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let rgbaUsed = new Uint8ClampedArray(basePixels);
    let detection = await detectMetreA4V10(rgbaUsed, width, height);

    if (!detection) {
      console.log(`      🎨 Preprocessing léger (normalize + sharpen) ...`);
      const { data: enhancedPixels } = await sharp(resizedBuffer)
        .normalize()
        .sharpen(1.2)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      rgbaUsed = new Uint8ClampedArray(enhancedPixels);
      detection = await detectMetreA4V10(rgbaUsed, width, height);
    }

    if (!detection) {
      return res.status(400).json({
        success: false,
        error: 'Métré A4 V10 non détecté (6 petits tags + 1 grand). Vérifiez l’impression et l’éclairage.'
      });
    }

    const fusedCorners = {
      topLeft: { x: (detection.fusedCorners.topLeft.x * scaleX / originalWidth) * 100, y: (detection.fusedCorners.topLeft.y * scaleY / originalHeight) * 100 },
      topRight: { x: (detection.fusedCorners.topRight.x * scaleX / originalWidth) * 100, y: (detection.fusedCorners.topRight.y * scaleY / originalHeight) * 100 },
      bottomRight: { x: (detection.fusedCorners.bottomRight.x * scaleX / originalWidth) * 100, y: (detection.fusedCorners.bottomRight.y * scaleY / originalHeight) * 100 },
      bottomLeft: { x: (detection.fusedCorners.bottomLeft.x * scaleX / originalWidth) * 100, y: (detection.fusedCorners.bottomLeft.y * scaleY / originalHeight) * 100 }
    };

    const scaleMatrix = [
      [1 / scaleX, 0, 0],
      [0, 1 / scaleY, 0],
      [0, 0, 1]
    ];
    const multiply3x3 = (A: number[][], B: number[][]): number[][] => {
      const result: number[][] = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0]
      ];
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          result[i][j] = A[i][0] * B[0][j] + A[i][1] * B[1][j] + A[i][2] * B[2][j];
        }
      }
      return result;
    };
    const homographyOriginal = multiply3x3(detection.homography.matrix, scaleMatrix);

    const totalTime = Date.now() - startTime;
    console.log(`\n✅ SUCCÈS - ${totalTime}ms (Métré A4 V10)\n`);

    return res.json({
      success: true,
      method: 'metre-a4-v10-homography',
      fallbackMode: detection.fallbackMode,
      warnings: detection.warnings || [],
      bestPhotoBase64: base64Clean,
      fusedCorners,
      homographyReady: true,
      sheetSizeMm: {
        width: METRE_A4_V10_SPECS.sheet.width_mm,
        height: METRE_A4_V10_SPECS.sheet.height_mm
      },
      referenceCentersMm: {
        width: METRE_A4_V10_SPECS.reference.width_mm,
        height: METRE_A4_V10_SPECS.reference.height_mm
      },
      homographyMatrix: homographyOriginal,
      bestPhoto: {
        index: 0,
        score: detection.homography.quality,
        sharpness: 0,
        homographyQuality: detection.homography.quality,
        captureConditions: 0,
        warnings: []
      },
      allPhotoScores: [{
        index: 0,
        score: detection.homography.quality,
        detected: true
      }],
      metrics: {
        inputPhotos: photos.length,
        successfulDetections: 1,
        processingTimeMs: totalTime,
        improvement: 0
      }
    });
  } catch (error) {
    console.error('❌ [V10] Erreur ultra-fusion-detect:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de l’analyse Métré A4 V10'
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE 2: POST /api/measurement-reference/compute-dimensions-simple
// 🎯 CALCUL DES DIMENSIONS VIA HOMOGRAPHIE (V10)
// ═══════════════════════════════════════════════════════════════════════════════

router.post('/compute-dimensions-simple', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const {
      fusedCorners,
      objectPoints,
      imageWidth,
      imageHeight,
      canvasScale = 1,
      exif,
      detectionQuality = 95
    } = req.body;

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

    const calibration: CalibrationData = {
      markerCorners,
      imageWidth,
      imageHeight,
      exif,
      detectionQuality
    };

    const result = computeObjectDimensions(calibration, objectCorners);
    return res.json({
      ...result,
      sheetSizeMm: {
        width: METRE_A4_V10_SPECS.sheet.width_mm,
        height: METRE_A4_V10_SPECS.sheet.height_mm
      },
      referenceCentersMm: {
        width: METRE_A4_V10_SPECS.reference.width_mm,
        height: METRE_A4_V10_SPECS.reference.height_mm
      }
    });
  } catch (error) {
    console.error('❌ [V10] Erreur compute-dimensions-simple:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur lors du calcul des dimensions',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

export default router;
