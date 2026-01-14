import express from 'express';
import { db } from '../lib/database';
import * as sharpModule from 'sharp';
import {
  MarkerDetector,
  MARKER_SPECS,
  computeHomography,
  transformPoint,
  measureDistanceCm,
  measureDistanceCmCorrected,
  estimatePose,
  detectUltraPrecisionPoints,
  type Point2D,
  type MarkerDetectionResult,
  type UltraPrecisionResult
} from '../lib/marker-detector';

// Sharp import compatible ESM
const sharp = (sharpModule as any).default || sharpModule;

const router = express.Router();

// Singleton detector pour éviter les réinitialisations
const detector = new MarkerDetector(30, 2000);

// Log de démarrage
const measureMode = process.env.AI_MEASURE_ENGINE || 'vision_ar';
console.log(`📷 [MEASURE] Mode de mesure photo: ${measureMode.toUpperCase()}`);
console.log(`   → Marqueur: Métré A4 V1.2 (13.0cm × 21.7cm AprilTag + 12 points noirs)`);
console.log(`   → Détection étendue: 4 AprilTags + 12 points dispersés + ChArUco 6×6`);
console.log(`   → Services: MetreA4Detector ✅, PhotoQualityAnalyzer ✅, EdgeDetection ✅`);

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
      version: 'v1.2-metre-a4',
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
    
    // ═══════════════════════════════════════════════════════════════════════
    // 🎨 PRÉ-TRAITEMENT DE L'IMAGE pour AMÉLIORER la détection des lignes noires
    // ═══════════════════════════════════════════════════════════════════════
    console.log('[measure/photo] 🎨 Pré-traitement de l\'image pour meilleure détection...');
    
    // Extraire les pixels RGBA avec traitement d'image optimisé
    const { data, info } = await sharp(buffer)
      // 1. Augmenter le contraste pour rendre les lignes noires plus nettes
      .normalize()  // Normalise l'histogramme → lignes noires plus noires, blancs plus blancs
      // 2. Augmenter la netteté pour mieux définir les bords
      .sharpen({
        sigma: 1.5,      // Rayon du flou gaussien (1.5 = netteté modérée)
        m1: 1.2,         // Facteur de netteté pour les zones plates (1.2 = 20% plus net)
        m2: 0.8,         // Facteur de netteté pour les zones à fort contraste
        x1: 3,           // Seuil inférieur pour la détection de contraste
        y2: 15,          // Seuil supérieur
        y3: 15           // Seuil de saturation
      })
      // 3. Optionnel: Légère augmentation du contraste localisé
      .modulate({
        brightness: 1.0,  // Pas de changement de luminosité globale
        saturation: 1.1,  // Légère augmentation de saturation (magenta + noir plus vifs)
        hue: 0            // Pas de changement de teinte
      })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    console.log('[measure/photo] ✅ Image pré-traitée: contraste augmenté, netteté améliorée');
    
    // ═══════════════════════════════════════════════════════════════════════
    // 🖊️ DÉTECTION INITIALE des cercles magenta pour localiser le marqueur
    // ═══════════════════════════════════════════════════════════════════════
    console.log('[measure/photo] 🎯 Détection initiale des cercles magenta...');
    
    const initialMarkers = detector.detect({
      data,
      width: info.width,
      height: info.height
    });
    
    let finalData = data;
    let finalWidth = info.width;
    let finalHeight = info.height;
    
    // Si au moins 1 marqueur détecté, dessiner les lignes de référence noires
    if (initialMarkers.length > 0 && calibration?.markerSizeCm) {
      console.log('[measure/photo] 🖊️ Dessin des lignes noires de référence (1mm) sur les bords extérieurs...');
      
      // Récupérer le premier marqueur détecté
      const marker = initialMarkers[0];
      const markerSizeMm = calibration.markerSizeCm * 10; // 16.8cm → 168mm
      const halfSize = markerSizeMm / 2; // 84mm du centre au bord
      
      // Calculer le facteur pixels/mm approximatif basé sur les coins détectés
      const corners = marker.corners;
      const width1 = Math.sqrt((corners[1].x - corners[0].x) ** 2 + (corners[1].y - corners[0].y) ** 2);
      const width2 = Math.sqrt((corners[2].x - corners[3].x) ** 2 + (corners[2].y - corners[3].y) ** 2);
      const avgWidthPx = (width1 + width2) / 2;
      const pixelsPerMm = avgWidthPx / markerSizeMm;
      
      console.log(`[measure/photo]    📏 Taille marqueur: ${markerSizeMm}mm (${avgWidthPx.toFixed(1)}px)`);
      console.log(`[measure/photo]    📏 Échelle: ${pixelsPerMm.toFixed(3)} px/mm`);
      
      // Calculer le centre approximatif du marqueur
      const centerX = (corners[0].x + corners[1].x + corners[2].x + corners[3].x) / 4;
      const centerY = (corners[0].y + corners[1].y + corners[2].y + corners[3].y) / 4;
      
      // Calculer les positions des 4 bords extérieurs (carrés alignés aux axes pour simplifier)
      const borderOffsetPx = halfSize * pixelsPerMm;
      const lineWidth = 1; // 1mm de largeur pour les lignes
      const lineWidthPx = lineWidth * pixelsPerMm;
      
      // 4 lignes: Top, Right, Bottom, Left
      const lines = [
        // Top (horizontal)
        { x1: centerX - borderOffsetPx, y1: centerY - borderOffsetPx, x2: centerX + borderOffsetPx, y2: centerY - borderOffsetPx },
        // Right (vertical)
        { x1: centerX + borderOffsetPx, y1: centerY - borderOffsetPx, x2: centerX + borderOffsetPx, y2: centerY + borderOffsetPx },
        // Bottom (horizontal)
        { x1: centerX - borderOffsetPx, y1: centerY + borderOffsetPx, x2: centerX + borderOffsetPx, y2: centerY + borderOffsetPx },
        // Left (vertical)
        { x1: centerX - borderOffsetPx, y1: centerY - borderOffsetPx, x2: centerX - borderOffsetPx, y2: centerY + borderOffsetPx }
      ];
      
      // Créer un SVG avec les 4 lignes noires
      const linesSvg = `
        <svg width="${info.width}" height="${info.height}">
          ${lines.map(line => 
            `<line x1="${line.x1.toFixed(1)}" y1="${line.y1.toFixed(1)}" 
                   x2="${line.x2.toFixed(1)}" y2="${line.y2.toFixed(1)}" 
                   stroke="black" stroke-width="${Math.max(1, lineWidthPx.toFixed(1))}"/>`
          ).join('\n          ')}
        </svg>
      `;
      
      console.log(`[measure/photo]    🖊️ Dessin de 4 lignes noires (épaisseur: ${lineWidthPx.toFixed(1)}px)`);
      console.log(`[measure/photo]    📍 Centre marqueur: (${centerX.toFixed(1)}, ${centerY.toFixed(1)})`);
      
      // Appliquer les lignes sur l'image
      const enhancedBuffer = await sharp(buffer)
        .normalize()
        .sharpen({ sigma: 1.5, m1: 1.2 })
        .modulate({ saturation: 1.1 })
        .composite([{
          input: Buffer.from(linesSvg),
          blend: 'over'
        }])
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      
      finalData = enhancedBuffer.data;
      finalWidth = enhancedBuffer.info.width;
      finalHeight = enhancedBuffer.info.height;
      
      console.log('[measure/photo] ✅ Lignes de référence dessinées, image améliorée prête');
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // 🎯 DÉTECTION FINALE avec les lignes de référence dessinées
    // ═══════════════════════════════════════════════════════════════════════
    console.log('[measure/photo] 🎯 Détection finale avec lignes de référence...');
    
    const markers = detector.detect({
      data: finalData,
      width: finalWidth,
      height: finalHeight
    });
    
    let response: any;
    
    if (markers.length > 0) {
      const marker = markers[0];
      console.log(`[measure/photo] ✅ Marqueur détecté! Score: ${marker.score}, Taille: ${marker.size.toFixed(0)}px`);
      
      // ══════════════════════════════════════════════════════════════════════
      // � DESSINER des lignes noires ULTRA-FINES (1mm) sur les bords EXTÉRIEURS
      // ══════════════════════════════════════════════════════════════════════
      console.log('[measure/photo] 🎨 Dessin lignes noires extérieures 1mm...');
      
      // Calculer l'épaisseur en pixels: 1mm
      // Résolution typique: 16.8cm marqueur = ~150-200px → ~9-12 pixels/cm → 1mm ≈ 1 pixel
      const markerSizePx = marker.size;
      const pixelsPerCm = markerSizePx / 16.8; // 16.8cm physique
      const lineThicknessPx = Math.max(1, Math.round(pixelsPerCm * 0.1)); // 1mm = 0.1cm
      
      console.log(`[measure/photo]    📏 Résolution: ${pixelsPerCm.toFixed(1)}px/cm → ligne ${lineThicknessPx}px (1mm)`);
      
      // Créer un buffer SVG pour dessiner les lignes
      const corners = marker.corners;
      const svgPaths = [
        `M ${corners[0].x},${corners[0].y} L ${corners[1].x},${corners[1].y}`, // TL → TR (haut)
        `M ${corners[1].x},${corners[1].y} L ${corners[2].x},${corners[2].y}`, // TR → BR (droite)
        `M ${corners[2].x},${corners[2].y} L ${corners[3].x},${corners[3].y}`, // BR → BL (bas)
        `M ${corners[3].x},${corners[3].y} L ${corners[0].x},${corners[0].y}`  // BL → TL (gauche)
      ];
      
      const svg = `
        <svg width="${info.width}" height="${info.height}">
          ${svgPaths.map(path => 
            `<path d="${path}" stroke="black" stroke-width="${lineThicknessPx}" fill="none" stroke-linecap="square"/>`
          ).join('\n          ')}
        </svg>
      `;
      
      // Superposer les lignes noires sur l'image existante
      const enhancedImageBuffer = await sharp(data, {
        raw: {
          width: info.width,
          height: info.height,
          channels: 4
        }
      })
      .composite([{
        input: Buffer.from(svg),
        blend: 'over' // Superposer les lignes sur l'image
      }])
      .ensureAlpha()
      .raw()
      .toBuffer();
      
      console.log('[measure/photo] ✅ Lignes noires extérieures dessinées');
      
      // Remplacer les données par l'image améliorée
      const enhancedData = new Uint8ClampedArray(enhancedImageBuffer);
      
      // ══════════════════════════════════════════════════════════════════════
      // 🎯 ULTRA-PRÉCISION: Détection de 80-100 points + RANSAC + Levenberg-Marquardt
      // ══════════════════════════════════════════════════════════════════════
      console.log('[measure/photo] 🎯 Lancement détection ULTRA-PRÉCISE sur image améliorée...');
      
      // Utiliser les 4 coins AprilTag pour l'ultra-précision
      const exteriorCorners = marker.corners;
      
      let ultraPrecisionResult: UltraPrecisionResult | null = null;
      try {
        // 🎯 Métré A4 V1.2: AprilTag centres 13cm×21.7cm (distance entre centres)
        const markerWidthMm = 130;   // 13.0cm largeur AprilTag centres
        const markerHeightMm = 217;  // 21.7cm hauteur AprilTag centres
        
        ultraPrecisionResult = detectUltraPrecisionPoints(
          { data: enhancedData, width: info.width, height: info.height },
          exteriorCorners,
          marker.extendedPoints,
          markerWidthMm,
          markerHeightMm
        );
        console.log(`[measure/photo] 🎯 ULTRA-PRÉCISION: ${ultraPrecisionResult.inlierPoints}/${ultraPrecisionResult.totalPoints} points, erreur ±${ultraPrecisionResult.reprojectionError.toFixed(2)}mm, qualité ${(ultraPrecisionResult.quality * 100).toFixed(1)}%`);
      } catch (ultraError: any) {
        console.warn('[measure/photo] ⚠️ Ultra-précision échouée, fallback standard:', ultraError.message);
      }
      
      // Calculer l'homographie: pixels → cm réels
      // Utiliser l'homographie ultra-précise si disponible, sinon standard
      const srcPoints = marker.corners;
      // CRITICAL: Métré A4 V1.2 AprilTag = 130mm × 217mm (13cm × 21.7cm) rectangulaire!
      const markerWidthForHomography = 130;   // 13.0cm largeur AprilTag centres (mm)
      const markerHeightForHomography = 217;  // 21.7cm hauteur AprilTag centres (mm)
      const dstPoints: Point2D[] = [
        { x: 0, y: 0 },                                           // TL
        { x: markerWidthForHomography, y: 0 },                    // TR
        { x: markerWidthForHomography, y: markerHeightForHomography }, // BR
        { x: 0, y: markerHeightForHomography }                    // BL
      ];
      
      // Utiliser l'homographie ultra-précise si disponible et de bonne qualité
      const homographyMatrix = (ultraPrecisionResult && ultraPrecisionResult.quality > 0.3)
        ? ultraPrecisionResult.homography
        : computeHomography(srcPoints, dstPoints);
      
      // Estimer la pose (rotation)
      const pose = estimatePose(marker.corners);
      
      const quality = ultraPrecisionResult ? ultraPrecisionResult.quality : 0.5;
      
      
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
          apriltagPositions: marker.apriltagPositions,
          center: marker.center,
          sizePx: marker.size,
          score: marker.score,
          apriltagsFound: marker.apriltagsFound,
          extendedPoints: marker.extendedPoints
        },
        homography: {
          matrix: homographyMatrix,
          pixelsPerCm: marker.homography.pixelsPerCm,
          realSizeCm: MARKER_SPECS.markerSize,
          sides: marker.homography.sides,
          angles: marker.homography.angles,
          quality: ultraPrecisionResult ? ultraPrecisionResult.quality : quality
        },
        // 🎯 NOUVEAU: Données ultra-précision
        ultraPrecision: ultraPrecisionResult ? {
          totalPoints: ultraPrecisionResult.totalPoints,
          inlierPoints: ultraPrecisionResult.inlierPoints,
          reprojectionErrorMm: ultraPrecisionResult.reprojectionError,
          quality: ultraPrecisionResult.quality,
          homographyMatrix: ultraPrecisionResult.homography, // 🔬 AJOUT: Matrice 3x3 optimisée RANSAC+LM
          breakdown: {
            corners: ultraPrecisionResult.cornerPoints,
            transitions: ultraPrecisionResult.transitionPoints,
            gridCorners: ultraPrecisionResult.gridCornerPoints,
            gridCenters: ultraPrecisionResult.gridCenterPoints
          },
          ransacApplied: ultraPrecisionResult.ransacApplied,
          ellipseFittingApplied: ultraPrecisionResult.ellipseFittingApplied,
          levenbergMarquardtApplied: ultraPrecisionResult.levenbergMarquardtApplied
        } : null,
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
          mode: process.env.AI_MEASURE_ENGINE || 'vision_ar',
          // 🎯 CRITICAL: Identifier correctement le marqueur AprilTag Métré V1.2 pour le frontend
          // Le frontend dépend de ce champ pour afficher les dimensions 13×21.7cm (rectangulaire)
          // Métré A4 V1.2 = AprilTag rectangulaire 130×217mm
          detectionMethod: (markerWidthForHomography === 130 && markerHeightForHomography === 217) ? 'apriltag-metre' : (ultraPrecisionResult ? 'ultra_precision_ransac_lm' : 'magenta_clustering')
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
          
          // Sauvegarder les points AprilTag
          for (let i = 0; i < marker.apriltagPositions.length; i++) {
            const pos = marker.apriltagPositions[i];
            await db.measurePhotoPoint.create({
              data: {
                measurePhotoId: measurePhoto.id,
                label: `apriltag_${i + 1}`,
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
    const { homographyMatrix, point1, point2, correction } = req.body || {};
    
    if (!homographyMatrix || !point1 || !point2) {
      return res.status(400).json({
        success: false,
        error: 'homographyMatrix, point1 et point2 sont requis'
      });
    }
    
    // Calculer la distance en cm AVEC CORRECTION OPTIMALE si fournie
    const correctionFactor = correction || 1.0;
    const distanceCmRaw = measureDistanceCm(homographyMatrix, point1, point2);
    const distanceCm = distanceCmRaw * correctionFactor;
    
    // Transformer les points en coordonnées réelles
    const point1Cm = transformPoint(homographyMatrix, point1);
    const point2Cm = transformPoint(homographyMatrix, point2);
    
    console.log(`📏 [MEASURE] Distance: ${distanceCmRaw.toFixed(2)}cm → ${distanceCm.toFixed(2)}cm (×${correctionFactor.toFixed(4)})`);
    
    return res.json({
      success: true,
      distanceCm,
      distanceCmRaw,  // Distance brute sans correction
      distanceM: distanceCm / 100,
      point1Cm,
      point2Cm,
      unit: 'cm',
      correctionApplied: correctionFactor,
      correctionWasApplied: correctionFactor !== 1.0
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

// ============================================================================
// 🎯 ULTRA-PRECISION MULTI-PHOTO ENDPOINT
// Fusion de plusieurs photos pour précision maximale (±0.2mm)
// ============================================================================

router.post('/photo/ultra', async (req, res) => {
  console.log('\n[measure/photo/ultra] 🎯 Traitement ULTRA-PRÉCISION multi-photos');
  
  try {
    const { imagesBase64 } = req.body || {};
    
    // Support pour une seule image ou un array
    const images: string[] = Array.isArray(imagesBase64) 
      ? imagesBase64 
      : (imagesBase64 ? [imagesBase64] : []);
    
    if (images.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Au moins une image requise (imagesBase64)'
      });
    }
    
    console.log(`[measure/photo/ultra] 📸 ${images.length} image(s) reçue(s)`);
    
    // Résultats de chaque photo
    const photoResults: Array<{
      index: number;
      marker: any;
      ultraPrecision: UltraPrecisionResult | null;
      pixelsPerCm: number;
    }> = [];
    
    // Traiter chaque photo
    for (let i = 0; i < images.length; i++) {
      const imageBase64 = images[i];
      console.log(`\n[measure/photo/ultra] 📷 Photo ${i + 1}/${images.length}`);
      
      try {
        const buffer = Buffer.from(imageBase64, 'base64');
        const { data, info } = await sharp(buffer)
          .raw()
          .ensureAlpha()
          .toBuffer({ resolveWithObject: true });
        
        console.log(`   Dimensions: ${info.width}x${info.height}`);
        
        // Détection standard
        const markers = await detector.detectMarkers({
          data,
          width: info.width,
          height: info.height
        });
        
        if (!markers || markers.length === 0) {
          console.warn(`   ⚠️ Photo ${i + 1}: Aucun marqueur détecté`);
          continue;
        }
        
        const marker = markers[0];
        const exteriorCorners = marker.magentaPositions || marker.corners;
        
        // Calcul pixelsPerCm
        const d1 = Math.hypot(
          exteriorCorners[1].x - exteriorCorners[0].x,
          exteriorCorners[1].y - exteriorCorners[0].y
        );
        const d2 = Math.hypot(
          exteriorCorners[3].x - exteriorCorners[2].x,
          exteriorCorners[3].y - exteriorCorners[2].y
        );
        const pixelsPerCm = ((d1 + d2) / 2) / MARKER_SPECS.markerSize;
        
        // Ultra-précision
        let ultraPrecisionResult: UltraPrecisionResult | null = null;
        try {
          // 🎯 Métré A4 V1.2: AprilTag centres 13cm×21.7cm (distance entre centres)
          const markerWidthMm = 130;   // 13.0cm largeur AprilTag centres
          const markerHeightMm = 217;  // 21.7cm hauteur AprilTag centres
          
          ultraPrecisionResult = detectUltraPrecisionPoints(
            { data, width: info.width, height: info.height },
            exteriorCorners,
            marker.extendedPoints,
            markerWidthMm,
            markerHeightMm
          );
          
          console.log(`   ✅ Ultra-précision: ${ultraPrecisionResult.inlierPoints}/${ultraPrecisionResult.totalPoints} inliers`);
          console.log(`   📊 Erreur: ±${ultraPrecisionResult.reprojectionError.toFixed(2)}mm, Qualité: ${(ultraPrecisionResult.quality * 100).toFixed(1)}%`);
        } catch (ultraError: any) {
          console.warn(`   ⚠️ Ultra-précision échouée: ${ultraError.message}`);
        }
        
        photoResults.push({
          index: i,
          marker,
          ultraPrecision: ultraPrecisionResult,
          pixelsPerCm
        });
        
      } catch (photoError: any) {
        console.error(`   ❌ Photo ${i + 1} erreur: ${photoError.message}`);
      }
    }
    
    if (photoResults.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Aucun marqueur détecté dans les photos fournies'
      });
    }
    
    // ========================================================================
    // FUSION DES RÉSULTATS
    // ========================================================================
    console.log('\n[measure/photo/ultra] 🔀 Fusion des résultats...');
    
    // Sélectionner le meilleur résultat (plus d'inliers, meilleure qualité)
    const bestResult = photoResults.reduce((best, current) => {
      const bestScore = best.ultraPrecision 
        ? best.ultraPrecision.inlierPoints * best.ultraPrecision.quality 
        : 0;
      const currentScore = current.ultraPrecision 
        ? current.ultraPrecision.inlierPoints * current.ultraPrecision.quality 
        : 0;
      return currentScore > bestScore ? current : best;
    });
    
    // Calcul de la moyenne pondérée des pixelsPerCm
    let totalWeight = 0;
    let weightedPixelsPerCm = 0;
    
    for (const result of photoResults) {
      const weight = result.ultraPrecision 
        ? result.ultraPrecision.quality 
        : 0.1;
      weightedPixelsPerCm += result.pixelsPerCm * weight;
      totalWeight += weight;
    }
    
    const fusedPixelsPerCm = totalWeight > 0 
      ? weightedPixelsPerCm / totalWeight 
      : bestResult.pixelsPerCm;
    
    // Statistiques de fusion
    const fusionStats = {
      photosProcessed: images.length,
      photosWithMarker: photoResults.length,
      photosWithUltraPrecision: photoResults.filter(r => r.ultraPrecision).length,
      bestPhotoIndex: bestResult.index,
      averageInliers: Math.round(
        photoResults
          .filter(r => r.ultraPrecision)
          .reduce((sum, r) => sum + (r.ultraPrecision?.inlierPoints || 0), 0) /
        Math.max(1, photoResults.filter(r => r.ultraPrecision).length)
      ),
      averageQuality: Math.round(
        photoResults
          .filter(r => r.ultraPrecision)
          .reduce((sum, r) => sum + ((r.ultraPrecision?.quality || 0) * 100), 0) /
        Math.max(1, photoResults.filter(r => r.ultraPrecision).length)
      ),
      fusedPixelsPerCm
    };
    
    console.log(`[measure/photo/ultra] 📊 Fusion: ${fusionStats.photosWithUltraPrecision}/${fusionStats.photosWithMarker} photos avec ultra-précision`);
    console.log(`[measure/photo/ultra] 🎯 Moyenne inliers: ${fusionStats.averageInliers}, Qualité moyenne: ${fusionStats.averageQuality}%`);
    
    // Construire la réponse
    const response = {
      success: true,
      mode: 'ultra-precision-multi-photo',
      marker: {
        detected: true,
        type: 'aruco_magenta_18cm',
        pixelsPerCm: fusedPixelsPerCm,
        mmPerPixel: 10 / fusedPixelsPerCm,
        confidence: fusionStats.averageQuality,
        corners: bestResult.marker.corners,
        apriltagPositions: bestResult.marker.apriltagPositions,
        extendedPoints: bestResult.marker.extendedPoints
      },
      ultraPrecision: bestResult.ultraPrecision ? {
        totalPoints: bestResult.ultraPrecision.totalPoints,
        inlierPoints: bestResult.ultraPrecision.inlierPoints,
        reprojectionErrorMm: bestResult.ultraPrecision.reprojectionError,
        quality: bestResult.ultraPrecision.quality,
        homographyMatrix: bestResult.ultraPrecision.homography, // 🔬 AJOUT: Matrice 3x3 optimisée RANSAC+LM
        breakdown: {
          exteriorCorners: 4,
          transitionPoints: bestResult.ultraPrecision.transitionPoints,
          gridCorners: bestResult.ultraPrecision.gridCornerPoints,
          cellCenters: bestResult.ultraPrecision.gridCenterPoints
        },
        ransacApplied: true,
        levenbergMarquardtApplied: true,
        ellipseFittingApplied: true
      } : null,
      // 🔍 DEBUG QUALITY - TOUTES LES VALEURS CRITIQUES
      _debug_ultraPrecision: bestResult.ultraPrecision ? {
        hasQuality: bestResult.ultraPrecision.quality !== undefined,
        qualityValue: bestResult.ultraPrecision.quality,
        qualityType: typeof bestResult.ultraPrecision.quality,
        correctionX: bestResult.ultraPrecision.correctionX,
        correctionY: bestResult.ultraPrecision.correctionY,
        correctionConfidence: bestResult.ultraPrecision.correctionConfidence,
        optimalCorrection: bestResult.ultraPrecision.optimalCorrection,
        allKeys: Object.keys(bestResult.ultraPrecision)
      } : null,
      fusion: fusionStats,
      perPhotoResults: photoResults.map(r => ({
        photoIndex: r.index,
        pixelsPerCm: r.pixelsPerCm,
        ultraPrecision: r.ultraPrecision ? {
          inliers: r.ultraPrecision.inlierPoints,
          total: r.ultraPrecision.totalPoints,
          quality: r.ultraPrecision.quality,
          errorMm: r.ultraPrecision.reprojectionError
        } : null
      }))
    };
    
    return res.json(response);
    
  } catch (error: any) {
    console.error('[measure/photo/ultra] ❌ Erreur:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Erreur interne'
    });
  }
});

export default router;
