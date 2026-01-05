import express from 'express';
import { db } from '../lib/database';
import * as sharpModule from 'sharp';
import {
  MarkerDetector,
  MARKER_SPECS,
  computeHomography,
  transformPoint,
  measureDistanceCm,
  estimatePose,
  calculateQualityScore,
  type Point2D,
  type MarkerDetectionResult
} from '../lib/marker-detector';

// Sharp import compatible ESM
const sharp = (sharpModule as any).default || sharpModule;

const router = express.Router();

// Singleton detector pour éviter les réinitialisations
const detector = new MarkerDetector(30, 2000);

// Log de démarrage
const measureMode = process.env.AI_MEASURE_ENGINE || 'gemini';
console.log(`📷 [MEASURE] Mode de mesure photo: ${measureMode.toUpperCase()}`);
console.log(`   → Marqueur: ${MARKER_SPECS.markerSize}cm × ${MARKER_SPECS.markerSize}cm avec points MAGENTA`);

// ============================================================================
// STATUS ENDPOINT
// ============================================================================

router.get('/photo/status', async (_req, res) => {
  try {
    const mode = process.env.AI_MEASURE_ENGINE || 'gemini';
    res.json({
      success: true,
      service: 'vision_ar',
      available: true, // Toujours disponible maintenant
      mode,
      version: 'v1.0-magenta',
      markerSpecs: MARKER_SPECS,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ success: false, available: false, error: error?.message || 'Unknown error' });
  }
});

// ============================================================================
// MAIN DETECTION ENDPOINT - POST /photo
// ============================================================================

router.post('/photo', async (req, res) => {
  const startTime = Date.now();
  try {
    const {
      imageBase64,
      mimeType,
      nodeId,
      treeId,
      fieldId,
      organizationId,
      referenceHint,
      deviceInfo,
      exif,
      persist,
      measureKeys,
      mappings
    } = req.body || {};

    if (!imageBase64) {
      return res.status(400).json({ success: false, error: 'imageBase64 requis' });
    }

    console.log('[measure/photo] 🔍 Analyse image...');
    
    // Décoder l'image base64 avec Sharp
    const buffer = Buffer.from(imageBase64, 'base64');
    const image = sharp(buffer);
    const metadata = await image.metadata();
    const { width, height } = metadata;
    
    if (!width || !height) {
      return res.status(400).json({ success: false, error: 'Impossible de lire les dimensions de l\'image' });
    }
    
    console.log(`[measure/photo] 📐 Image: ${width}x${height}`);
    
    // Extraire les pixels RGBA
    const { data, info } = await image
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    // Détecter les marqueurs MAGENTA
    const markers = detector.detect({
      data,
      width: info.width,
      height: info.height
    });
    
    let response: any;
    
    if (markers.length > 0) {
      const marker = markers[0];
      console.log(`[measure/photo] ✅ Marqueur détecté! Score: ${marker.score}, Taille: ${marker.size.toFixed(0)}px`);
      
      // Calculer l'homographie: pixels → cm réels
      // Points source: coins détectés en pixels
      // Points destination: carré 18x18cm (0,0) à (18,18)
      const srcPoints = marker.corners;
      const dstPoints: Point2D[] = [
        { x: 0, y: 0 },                                    // TL
        { x: MARKER_SPECS.markerSize, y: 0 },              // TR
        { x: MARKER_SPECS.markerSize, y: MARKER_SPECS.markerSize }, // BR
        { x: 0, y: MARKER_SPECS.markerSize }               // BL
      ];
      
      const homographyMatrix = computeHomography(srcPoints, dstPoints);
      
      // Estimer la pose (rotation)
      const pose = estimatePose(marker.corners);
      
      // Score de qualité
      const quality = calculateQualityScore(
        marker.corners,
        marker.size,
        pose.rotX,
        pose.rotY
      );
      
      // Calculer des mesures si des points sont fournis
      const measurements: Record<string, number> = {};
      
      // Par défaut, retourner les dimensions du marqueur comme référence
      measurements['markerSizePx'] = marker.size;
      measurements['pixelsPerCm'] = marker.homography.pixelsPerCm;
      
      // Si measureKeys demandés, préparer les champs
      if (measureKeys && Array.isArray(measureKeys)) {
        for (const key of measureKeys) {
          // Les mesures seront calculées par le front avec les points utilisateur
          measurements[key] = 0; // Placeholder
        }
      }
      
      response = {
        success: true,
        detected: true,
        measurements,
        marker: {
          id: marker.id,
          corners: marker.corners,
          magentaPositions: marker.magentaPositions,
          center: marker.center,
          sizePx: marker.size,
          score: marker.score,
          magentaFound: marker.magentaFound
        },
        homography: {
          matrix: homographyMatrix,
          pixelsPerCm: marker.homography.pixelsPerCm,
          realSizeCm: MARKER_SPECS.markerSize,
          sides: marker.homography.sides,
          angles: marker.homography.angles,
          quality
        },
        pose,
        calibration: {
          pixelPerCm: marker.homography.pixelsPerCm,
          referenceType: 'aruco_magenta',
          referenceSize: { width: MARKER_SPECS.markerSize, height: MARKER_SPECS.markerSize }
        },
        referenceUsed: referenceHint || 'aruco_magenta_18cm',
        imageMeta: {
          mimeType: mimeType || 'image/jpeg',
          width,
          height,
          exif: exif || null
        },
        debug: {
          markerSpecs: MARKER_SPECS,
          mode: process.env.AI_MEASURE_ENGINE || 'gemini',
          detectionMethod: 'magenta_clustering'
        },
        durationMs: Date.now() - startTime
      };
      
      // Persistance si demandée
      if (persist && nodeId && organizationId) {
        try {
          const measurePhoto = await db.measurePhoto.create({
            data: {
              organizationId,
              treeId: treeId || null,
              nodeId,
              fieldId: fieldId || null,
              mimeType: mimeType || 'image/jpeg',
              widthPx: width,
              heightPx: height,
              exif: exif ? JSON.stringify(exif) : null,
              deviceInfo: deviceInfo ? JSON.stringify(deviceInfo) : null,
              referenceType: 'aruco_magenta',
              referenceSizeMm: JSON.stringify({ width: MARKER_SPECS.markerSize * 10, height: MARKER_SPECS.markerSize * 10 }),
              arucoId: marker.id,
              arucoCornersPx: JSON.stringify(marker.corners),
              homography: JSON.stringify({ matrix: homographyMatrix, quality }),
              pose: JSON.stringify(pose),
              measurements: JSON.stringify(measurements),
              status: 'detected'
            }
          });
          
          // Sauvegarder les points magenta
          for (let i = 0; i < marker.magentaPositions.length; i++) {
            const pos = marker.magentaPositions[i];
            await db.measurePhotoPoint.create({
              data: {
                measurePhotoId: measurePhoto.id,
                label: `magenta_${i + 1}`,
                xPx: pos.x,
                yPx: pos.y,
                source: 'auto_detect',
                confidence: marker.score
              }
            });
          }
          
          console.log(`[measure/photo] 💾 Sauvegardé: MeasurePhoto #${measurePhoto.id}`);
          response.persistedId = measurePhoto.id;
        } catch (dbError: any) {
          console.error('[measure/photo] ⚠️ Erreur persistance:', dbError.message);
          // On ne fait pas échouer la requête pour une erreur de persistance
        }
      }
      
    } else {
      // Aucun marqueur détecté
      console.log('[measure/photo] ❌ Aucun marqueur détecté');
      
      response = {
        success: true,
        detected: false,
        measurements: {},
        marker: null,
        homography: {
          matrix: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
          pixelsPerCm: null,
          quality: 0
        },
        pose: null,
        calibration: null,
        referenceUsed: null,
        imageMeta: {
          mimeType: mimeType || 'image/jpeg',
          width,
          height,
          exif: exif || null
        },
        error: 'Aucun marqueur MAGENTA détecté. Assurez-vous que le marqueur 18cm avec les 4 points magenta est visible.',
        debug: {
          markerSpecs: MARKER_SPECS,
          mode: process.env.AI_MEASURE_ENGINE || 'gemini',
          tip: 'Le marqueur doit avoir 4 cercles magenta aux coins avec un centre blanc'
        },
        durationMs: Date.now() - startTime
      };
    }

    return res.json(response);
    
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    console.error('[measure/photo] ❌ Erreur:', error);
    return res.status(500).json({
      success: false,
      detected: false,
      error: error?.message || 'Erreur interne',
      durationMs
    });
  }
});

// ============================================================================
// MEASURE POINTS ENDPOINT - Calculer la distance entre 2 points
// ============================================================================

router.post('/photo/measure', async (req, res) => {
  try {
    const { homographyMatrix, point1, point2 } = req.body || {};
    
    if (!homographyMatrix || !point1 || !point2) {
      return res.status(400).json({
        success: false,
        error: 'homographyMatrix, point1 et point2 sont requis'
      });
    }
    
    // Calculer la distance en cm
    const distanceCm = measureDistanceCm(homographyMatrix, point1, point2);
    
    // Transformer les points en coordonnées réelles
    const point1Cm = transformPoint(homographyMatrix, point1);
    const point2Cm = transformPoint(homographyMatrix, point2);
    
    return res.json({
      success: true,
      distanceCm,
      distanceM: distanceCm / 100,
      point1Cm,
      point2Cm,
      unit: 'cm'
    });
    
  } catch (error: any) {
    console.error('[measure/photo/measure] ❌ Erreur:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Erreur interne'
    });
  }
});

// ============================================================================
// GET CALIBRATION PROFILES
// ============================================================================

router.get('/calibration-profiles', async (req, res) => {
  try {
    const organizationId = req.query.organizationId as string;
    
    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'organizationId requis' });
    }
    
    const profiles = await db.calibrationProfile.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' }
    });
    
    return res.json({
      success: true,
      profiles,
      defaultProfile: {
        name: 'Marqueur MAGENTA 18cm',
        referenceType: 'aruco_magenta',
        referenceSizeMm: MARKER_SPECS.markerSize * 10,
        description: 'Marqueur carré 18x18cm avec 4 cercles magenta aux coins'
      }
    });
    
  } catch (error: any) {
    console.error('[calibration-profiles] ❌ Erreur:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Erreur interne' });
  }
});

export default router;
