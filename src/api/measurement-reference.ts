/**
 * 📐 API ROUTES - CONFIGURATION RÉFÉRENCE DE MESURE
 * 
 * Routes pour gérer la configuration de l'objet de référence
 * utilisé pour calibrer les mesures IA par organisation
 */

import { Router, type Response } from 'express';
import { db } from '../lib/database';
import type { ReferenceType } from '../types/measurement';
import { authenticateToken, type AuthenticatedRequest } from '../middleware/auth';
import GoogleGeminiService from '../services/GoogleGeminiService';
import { edgeDetectionService } from '../services/EdgeDetectionService';
import { multiPhotoFusionService } from '../services/MultiPhotoFusionService';
// 🎯 Import ArUco detector pour détection 105 points
import { 
  MarkerDetector, 
  MARKER_SPECS, 
  detectUltraPrecisionPoints,
  analyzeMarkerComplete,
  calculateOptimalCorrection,
  type UltraPrecisionResult,
  type ArucoMarkerAnalysis,
  type OptimalCorrectionResult
} from '../lib/marker-detector';
// 🔥 Import HomographyFusionService pour le vrai pipeline multi-photo
import { homographyFusionService } from '../services/HomographyFusionService';
import * as sharpModule from 'sharp';

const sharp = (sharpModule as any).default || sharpModule;

const router = Router();

// Instance du service Gemini
const geminiService = new GoogleGeminiService();

// 🎯 Singleton ArUco detector
const arucoDetector = new MarkerDetector(30, 2000);

/**
 * GET /api/measurement-reference/
 * Route fallback - Récupère la config via l'organizationId de l'utilisateur connecté
 */
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    // Récupérer l'organizationId de l'utilisateur
    const userOrg = await db.userOrganization.findFirst({
      where: { userId: req.user.id },
      select: { organizationId: true }
    });

    if (!userOrg?.organizationId) {
      return res.json({ config: null }); // Pas d'organisation, pas de config
    }

    // Récupérer la config active pour cette organisation
    const config = await db.organizationMeasurementReferenceConfig.findFirst({
      where: {
        organizationId: userOrg.organizationId,
        isActive: true
      }
    });

    res.json({ config: config || null });
  } catch (error) {
    console.error('❌ [API] Erreur récupération config référence (fallback):', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/measurement-reference/:organizationId
 * Récupère la configuration de référence active pour une organisation
 */
router.get('/:organizationId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { organizationId } = req.params;

    if (!req.user?.id) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    // Vérifier que l'utilisateur appartient à l'organisation
    const userOrg = await db.userOrganization.findFirst({
      where: {
        userId: req.user.id,
        organizationId
      }
    });

    if (!userOrg) {
      return res.status(403).json({ error: 'Accès interdit à cette organisation' });
    }

    // Récupérer la config active
    const config = await db.organizationMeasurementReferenceConfig.findFirst({
      where: {
        organizationId,
        isActive: true
      }
    });

    if (!config) {
      return res.json({ config: null });
    }

    res.json({ config });
  } catch (error) {
    console.error('❌ [API] Erreur récupération config référence:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/measurement-reference
 * Crée ou met à jour la configuration de référence pour une organisation
 */
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      organizationId,
      referenceType,
      customName,
      customWidth,
      customHeight
    } = req.body;

    if (!req.user?.id) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    // Validation
    if (!organizationId || !referenceType) {
      return res.status(400).json({
        error: 'Paramètres manquants: organizationId et referenceType requis'
      });
    }

    const validTypes: ReferenceType[] = ['meter', 'card', 'a4', 'custom'];
    if (!validTypes.includes(referenceType)) {
      return res.status(400).json({
        error: `referenceType invalide. Attendu: ${validTypes.join(', ')}`
      });
    }

    // Pour le type custom, vérifier les dimensions
    if (referenceType === 'custom' && (!customWidth || !customHeight)) {
      return res.status(400).json({
        error: 'Pour un type custom, customWidth et customHeight sont requis'
      });
    }

    // Vérifier que l'utilisateur est admin de l'organisation
    const userOrg = await db.userOrganization.findFirst({
      where: {
        userId: req.user.id,
        organizationId
      },
      include: {
        Role: true
      }
    });

    if (!userOrg) {
      return res.status(403).json({
        error: "Vous n'appartenez pas à cette organisation"
      });
    }

    // Vérifier le rôle admin
    const isAdmin = userOrg.Role?.name?.toLowerCase().includes('admin') || 
                    userOrg.Role?.name?.toLowerCase().includes('owner') ||
                    req.user.isSuperAdmin;

    if (!isAdmin) {
      return res.status(403).json({
        error: 'Seuls les administrateurs peuvent modifier la configuration'
      });
    }

    // Désactiver l'ancienne config si elle existe
    await db.organizationMeasurementReferenceConfig.updateMany({
      where: {
        organizationId,
        isActive: true
      },
      data: {
        isActive: false
      }
    });

    // Créer la nouvelle config
    const config = await db.organizationMeasurementReferenceConfig.create({
      data: {
        organizationId,
        referenceType,
        customName: customName || undefined,
        customWidth: customWidth ? parseFloat(customWidth) : undefined,
        customHeight: customHeight ? parseFloat(customHeight) : undefined,
        isActive: true,
        createdBy: req.user.id
      }
    });

    console.log(`✅ [API] Config référence créée pour organisation ${organizationId}: ${referenceType}`);

    res.json({
      success: true,
      config
    });
  } catch (error) {
    console.error('❌ [API] Erreur création config référence:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/measurement-reference/:configId
 * Met à jour une configuration de référence existante
 */
router.put('/:configId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { configId } = req.params;
    const {
      referenceType,
      customName,
      customWidth,
      customHeight,
      defaultUnit
    } = req.body;

    if (!req.user?.id) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    // Vérifier que la config existe
    const existingConfig = await db.organizationMeasurementReferenceConfig.findUnique({
      where: { id: configId }
    });

    if (!existingConfig) {
      return res.status(404).json({ error: 'Configuration non trouvée' });
    }

    // Vérifier que l'utilisateur est admin de l'organisation
    const userOrg = await db.userOrganization.findFirst({
      where: {
        userId: req.user.id,
        organizationId: existingConfig.organizationId
      },
      include: {
        Role: true
      }
    });

    if (!userOrg) {
      return res.status(403).json({ error: 'Accès interdit' });
    }

    const isAdmin = userOrg.Role?.name?.toLowerCase().includes('admin') || 
                    userOrg.Role?.name?.toLowerCase().includes('owner') ||
                    req.user.isSuperAdmin;

    if (!isAdmin) {
      return res.status(403).json({ error: 'Accès interdit' });
    }

    // Mettre à jour
    const config = await db.organizationMeasurementReferenceConfig.update({
      where: { id: configId },
      data: {
        ...(referenceType && { referenceType }),
        ...(customName !== undefined && { customName }),
        ...(customWidth && { customWidth: parseFloat(customWidth) }),
        ...(customHeight && { customHeight: parseFloat(customHeight) }),
        ...(defaultUnit && { defaultUnit })
      }
    });

    res.json({
      success: true,
      config
    });
  } catch (error) {
    console.error('❌ [API] Erreur mise à jour config référence:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/measurement-reference/:configId
 * Supprime une configuration de référence
 */
router.delete('/:configId', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { configId } = req.params;

    if (!req.user?.id) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    // Vérifier que la config existe
    const existingConfig = await db.organizationMeasurementReferenceConfig.findUnique({
      where: { id: configId }
    });

    if (!existingConfig) {
      return res.status(404).json({ error: 'Configuration non trouvée' });
    }

    // Vérifier que l'utilisateur est admin
    const userOrg = await db.userOrganization.findFirst({
      where: {
        userId: req.user.id,
        organizationId: existingConfig.organizationId
      },
      include: {
        Role: true
      }
    });

    if (!userOrg) {
      return res.status(403).json({ error: 'Accès interdit' });
    }

    const isAdmin = userOrg.Role?.name?.toLowerCase().includes('admin') || 
                    userOrg.Role?.name?.toLowerCase().includes('owner') ||
                    req.user.isSuperAdmin;

    if (!isAdmin) {
      return res.status(403).json({ error: 'Accès interdit' });
    }

    // Supprimer
    await db.organizationMeasurementReferenceConfig.delete({
      where: { id: configId }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('❌ [API] Erreur suppression config référence:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/measurement-reference/detect
 * Détecte l'objet de référence dans une image
 */
router.post('/detect', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { imageBase64, mimeType, referenceType, customPrompt } = req.body;

    if (!req.user?.id) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    if (!imageBase64 || !mimeType || !referenceType) {
      return res.status(400).json({
        error: 'Paramètres manquants: imageBase64, mimeType, referenceType requis'
      });
    }

    // Détecter l'objet de référence
    const result = await geminiService.detectReferenceObject(
      imageBase64,
      mimeType,
      referenceType,
      customPrompt
    );

    res.json(result);
  } catch (error) {
    console.error('❌ [API] Erreur détection référence:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la détection'
    });
  }
});

/**
 * 🆕 POST /api/measurement-reference/detect-multi
 * Détection multi-photos avec fusion IA pour calibration parfaite
 */
router.post('/detect-multi', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { images, referenceType, customPrompt } = req.body;

    if (!req.user?.id) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        error: 'Paramètres manquants: images[] requis (tableau d\'objets {base64, mimeType})'
      });
    }

    if (!referenceType) {
      return res.status(400).json({
        error: 'Paramètres manquants: referenceType requis (a4, card, meter, custom)'
      });
    }

    console.log(`🔍 [API] Détection multi-photos: ${images.length} images, type: ${referenceType}`);

    // Appeler le service Gemini pour fusion multi-photos
    const result = await geminiService.detectReferenceMultiPhotos(
      images.map((img: any) => ({
        base64: img.base64,
        mimeType: img.mimeType || 'image/jpeg',
        metadata: img.metadata
      })),
      referenceType,
      customPrompt
    );

    console.log(`✅ [API] Résultat fusion multi-photos:`, {
      success: result.success,
      confidence: result.confidence,
      usablePhotos: result.qualityAnalysis?.filter(p => p.usable).length,
      bestPhoto: result.bestPhotoIndex
    });

    res.json(result);
  } catch (error) {
    console.error('❌ [API] Erreur détection multi-photos:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la détection multi-photos'
    });
  }
});

/**
 * 🆕 POST /api/measurement-reference/analyze-frame
 * Analyse temps réel d'une frame caméra pour guider la capture
 */
router.post('/analyze-frame', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { imageBase64, mimeType, referenceType } = req.body;

    if (!req.user?.id) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    if (!imageBase64 || !mimeType || !referenceType) {
      return res.status(400).json({
        error: 'Paramètres manquants: imageBase64, mimeType, referenceType requis'
      });
    }

    // Appeler le service Gemini pour analyse rapide
    const result = await geminiService.analyzeFrameForGuidance(
      imageBase64,
      mimeType,
      referenceType
    );

    res.json(result);
  } catch (error) {
    console.error('❌ [API] Erreur analyse frame:', error);
    res.status(500).json({
      canCapture: true,
      issues: [],
      suggestions: [],
      scores: { visibility: 50, centering: 50, lighting: 50, sharpness: 50, perspective: 50 },
      message: '📷 Capturez quand prêt'
    });
  }
});

/**
 * POST /api/measurement-reference/snap-to-edges
 * 🎯 SNAP TO EDGES - Ajuste les points approximatifs sur les vrais contours
 * L'utilisateur place les points grossièrement, l'IA les ajuste avec précision
 */
router.post('/snap-to-edges', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { imageBase64, mimeType, points, targetType, objectDescription } = req.body;

    if (!req.user?.id) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    if (!imageBase64 || !mimeType || !points || !Array.isArray(points)) {
      return res.status(400).json({
        error: 'Paramètres manquants: imageBase64, mimeType, points[] requis'
      });
    }

    console.log(`🎯 [API] Snap to edges: ${targetType}, ${points.length} points`);
    console.log(`📍 [API] Points reçus:`, points.map((p: any) => `${p.label}(${p.x?.toFixed?.(0) || p.x}, ${p.y?.toFixed?.(0) || p.y})`).join(', '));

    // Appeler le service Gemini pour snap
    const result = await geminiService.snapPointsToEdges(
      imageBase64,
      mimeType,
      points,
      targetType || 'measurement',
      objectDescription
    );

    console.log(`✅ [API] Résultat snap:`, result.success ? `${result.points?.length} points ajustés` : result.error);

    res.json(result);
  } catch (error) {
    console.error('❌ [API] Erreur snap to edges:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors du snap to edges'
    });
  }
});

/**
 * POST /api/measurement-reference/suggest-points
 * Suggère les points de mesure pour un objet dans une image
 * en fonction des mesures demandées (largeur, hauteur, etc.)
 */
router.post('/suggest-points', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { imageBase64, mimeType, objectType, pointCount = 4, measureKeys = ['largeur_cm', 'hauteur_cm'] } = req.body;

    if (!req.user?.id) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    if (!imageBase64 || !mimeType) {
      return res.status(400).json({
        error: 'Paramètres manquants: imageBase64, mimeType requis'
      });
    }

    console.log(`📐 [API] Suggestion points pour mesures: ${measureKeys.join(', ')}`);

    // Suggérer les points avec les mesures demandées
    const result = await geminiService.suggestMeasurementPoints(
      imageBase64,
      mimeType,
      objectType || 'objet principal',
      pointCount,
      measureKeys
    );

    res.json(result);
  } catch (error) {
    console.error('❌ [API] Erreur suggestion points:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la suggestion de points'
    });
  }
});

/**
 * 🆕 POST /api/measurement-reference/detect-corners-in-zone
 * Détection précise des 4 coins dans une zone sélectionnée par l'utilisateur
 * L'utilisateur dessine un rectangle approximatif, l'IA trouve les coins exacts
 * 
 * 🔧 PARAMÈTRES DYNAMIQUES (depuis TBL):
 * - objectDescription: description textuelle de l'objet à détecter
 * - realDimensions: { width, height } en cm pour valider le ratio détecté
 * - targetType: 'reference' | 'measurement' pour adapter le prompt
 */
router.post('/detect-corners-in-zone', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { 
      imageBase64, 
      mimeType, 
      selectionZone, 
      objectType, 
      objectDescription,
      realDimensions,
      targetType 
    } = req.body;

    if (!req.user?.id) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    if (!imageBase64 || !mimeType || !selectionZone) {
      return res.status(400).json({
        error: 'Paramètres manquants: imageBase64, mimeType, selectionZone requis'
      });
    }

    // Valider la zone de sélection
    if (typeof selectionZone.x !== 'number' || typeof selectionZone.y !== 'number' ||
        typeof selectionZone.width !== 'number' || typeof selectionZone.height !== 'number') {
      return res.status(400).json({
        error: 'selectionZone invalide: doit contenir x, y, width, height (en pourcentage 0-100)'
      });
    }

    console.log(`🎯 [API] Détection coins dans zone: ${objectType || 'a4'} (targetType: ${targetType || 'auto'})`);
    console.log(`📐 [API] Zone: x=${selectionZone.x.toFixed(1)}%, y=${selectionZone.y.toFixed(1)}%, ${selectionZone.width.toFixed(1)}x${selectionZone.height.toFixed(1)}%`);
    if (objectDescription) console.log(`📝 [API] Description: ${objectDescription}`);
    if (realDimensions) console.log(`📏 [API] Dimensions réelles: ${realDimensions.width}cm × ${realDimensions.height}cm`);

    // 🔬 MÉTHODE 1: Détection de contours avec Sharp (PRIORITAIRE)
    // Analyse les pixels pour trouver les vrais bords de la feuille blanche
    console.log('🔬 [API] Tentative détection par analyse de contours (Sharp)...');
    
    const edgeResult = await edgeDetectionService.detectWhitePaperCorners(
      imageBase64,
      selectionZone,
      mimeType
    );

    if (edgeResult.success && edgeResult.corners) {
      console.log('✅ [API] Détection par contours RÉUSSIE !');
      console.log(`📍 [API] Coins détectés:
        TopLeft: (${edgeResult.corners.topLeft.x.toFixed(2)}%, ${edgeResult.corners.topLeft.y.toFixed(2)}%)
        TopRight: (${edgeResult.corners.topRight.x.toFixed(2)}%, ${edgeResult.corners.topRight.y.toFixed(2)}%)
        BottomLeft: (${edgeResult.corners.bottomLeft.x.toFixed(2)}%, ${edgeResult.corners.bottomLeft.y.toFixed(2)}%)
        BottomRight: (${edgeResult.corners.bottomRight.x.toFixed(2)}%, ${edgeResult.corners.bottomRight.y.toFixed(2)}%)`);

      // Vérifier que les Y sont différents (feuille inclinée)
      const yDiffTop = Math.abs(edgeResult.corners.topLeft.y - edgeResult.corners.topRight.y);
      const yDiffBottom = Math.abs(edgeResult.corners.bottomLeft.y - edgeResult.corners.bottomRight.y);
      console.log(`📐 [API] Différence Y haut: ${yDiffTop.toFixed(2)}%, bas: ${yDiffBottom.toFixed(2)}%`);

      return res.json({
        success: true,
        objectFound: true,
        corners: edgeResult.corners,
        confidence: edgeResult.confidence || 90,
        method: 'edge-detection',
        debug: edgeResult.debug
      });
    }

    console.log('⚠️ [API] Détection par contours échouée, fallback vers Gemini...');
    console.log(`   Raison: ${edgeResult.error || 'Pas assez de points de contour'}`);

    // 🤖 MÉTHODE 2: Fallback vers Gemini IA
    // Appeler le service Gemini pour détecter les coins précis
    const result = await geminiService.detectCornersInZone(
      imageBase64,
      mimeType,
      selectionZone,
      objectType || 'a4',
      objectDescription,
      realDimensions,
      targetType
    );

    console.log(`✅ [API] Résultat détection Gemini:`, result.success ? 
      `${result.objectFound ? 'Objet trouvé' : 'Objet non trouvé'}, confiance: ${result.confidence}%` : 
      result.error
    );

    // Ajouter l'indicateur de méthode utilisée
    res.json({
      ...result,
      method: 'gemini-ai'
    });
  } catch (error) {
    console.error('❌ [API] Erreur détection coins dans zone:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la détection des coins'
    });
  }
});

// ============================================================================
// 🔀 FUSION MULTI-PHOTOS
// ============================================================================

/**
 * 🔀 POST /api/measurement-reference/fuse-photos
 * Fusionne plusieurs photos en une seule image optimisée pour la détection
 * 
 * ÉTAPES:
 * 1. Analyse de qualité de chaque photo (netteté, luminosité, contraste)
 * 2. Fusion pondérée par qualité (HDR-like)
 * 3. Amélioration des bords (Edge Enhancement)
 * 4. Amplification zones blanches (pour A4)
 * 5. Amélioration contraste local
 * 
 * @body photos - Array de { base64, mimeType, metadata? }
 * @body referenceType - 'a4' | 'card' | 'meter' | 'custom'
 * @returns Image fusionnée optimisée + métriques
 */
router.post('/fuse-photos', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { photos, referenceType = 'a4' } = req.body;

    if (!req.user?.id) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      return res.status(400).json({
        error: 'Paramètre photos requis: array de { base64, mimeType }'
      });
    }

    console.log(`🔀 [API] Demande fusion de ${photos.length} photos (type: ${referenceType})`);

    // Nettoyer les base64 (enlever le préfixe data:image/...;base64, si présent)
    const cleanedPhotos = photos.map((photo: { base64: string; mimeType?: string; metadata?: object }) => ({
      ...photo,
      base64: photo.base64.includes(',') ? photo.base64.split(',')[1] : photo.base64,
      mimeType: photo.mimeType || 'image/jpeg'
    }));

    // Appeler le service de fusion optimisé pour la détection de référence
    const result = await multiPhotoFusionService.fuseForReferenceDetection(
      cleanedPhotos,
      referenceType as 'a4' | 'card' | 'meter' | 'custom'
    );

    if (result.success) {
      console.log(`✅ [API] Fusion réussie: ${result.metrics?.usedPhotos}/${result.metrics?.inputPhotos} photos utilisées`);
      console.log(`   📊 Sharpness finale: ${result.metrics?.finalSharpness?.toFixed(1)}`);
    } else {
      console.error(`❌ [API] Fusion échouée: ${result.error}`);
    }

    res.json(result);
  } catch (error) {
    console.error('❌ [API] Erreur fusion photos:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la fusion des photos'
    });
  }
});

/**
 * 🔥 POST /api/measurement-reference/ultra-fusion-detect
 * 
 * PIPELINE OPTIMISÉ: HOMOGRAPHIE PAR PHOTO + SÉLECTION MEILLEURE
 * 
 * Workflow:
 * 1️⃣ DÉTECTER ArUco sur CHAQUE photo individuellement → homographie par photo
 * 2️⃣ SÉLECTIONNER la MEILLEURE photo (score détection + qualité homographie)
 * 3️⃣ ULTRA-PRÉCISION: 105 POINTS sur la meilleure photo
 * 4️⃣ Retourner les coins ArUco + métriques pour le canvas
 * 
 * PAS de fusion d'images - juste sélection intelligente !
 * 
 * @body photos - Array de { base64, mimeType, metadata? }
 */
router.post('/ultra-fusion-detect', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { photos } = req.body;

    if (!req.user?.id) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    if (!photos || photos.length === 0) {
      return res.status(400).json({ error: 'Au moins une photo requise' });
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔥 [BEST-PHOTO] SÉLECTION MEILLEURE PHOTO - ${photos.length} photos`);
    console.log(`${'='.repeat(80)}\n`);

    // Nettoyer les photos
    const cleanedPhotos = photos.map((photo: { base64: string; mimeType?: string; metadata?: object }) => ({
      base64: photo.base64.includes(',') ? photo.base64.split(',')[1] : photo.base64,
      mimeType: photo.mimeType || 'image/jpeg',
      metadata: photo.metadata
    }));

    // ============================================
    // 1️⃣ ANALYSER CHAQUE PHOTO INDIVIDUELLEMENT
    // ============================================
    console.log('1️⃣ Analyse ArUco sur chaque photo...\n');
    
    const arucoDetector = new MarkerDetector();
    const photoAnalyses: Array<{
      index: number;
      base64: string;
      marker: any;
      score: number;
      homography: number[][] | null;
      reprojectionError: number;
      quality: number;
      corners: any;
      ultraPrecision: any;
      arucoAnalysis: ArucoMarkerAnalysis | null; // 🔬 Analyse complète pour le Canvas
      imageWidth: number;
      imageHeight: number;
    }> = [];
    
    for (let i = 0; i < cleanedPhotos.length; i++) {
      const photo = cleanedPhotos[i];
      console.log(`   📷 Photo ${i}: Analyse...`);
      
      try {
        const imageBuffer = Buffer.from(photo.base64, 'base64');
        const metadata = await sharp(imageBuffer).metadata();
        const width = metadata.width || 1920;
        const height = metadata.height || 1080;
        
        // Convertir en raw RGBA
        const rawBuffer = await sharp(imageBuffer)
          .ensureAlpha()
          .raw()
          .toBuffer();
        
        const imageData = {
          data: new Uint8ClampedArray(rawBuffer),
          width,
          height
        };
        
        // Détection ArUco
        const markers = arucoDetector.detect(imageData);
        
        if (markers.length > 0) {
          const marker = markers[0];
          
          // Ultra-précision avec 105 points
          const cornersForUltra = marker.magentaPositions || marker.corners;
          const ultraResult = detectUltraPrecisionPoints(imageData, cornersForUltra, marker.extendedPoints);
          
          // 🔬 Analyse COMPLÈTE du marqueur (pose, profondeur, qualité, bandes) - AVANT le calcul du score!
          let completeAnalysis: ArucoMarkerAnalysis | null = null;
          let bandBiasScore = 0.5; // Score par défaut si pas d'analyse
          try {
            completeAnalysis = analyzeMarkerComplete(marker, width, height);
            console.log(`   🔬 Analyse complète: rotX=${completeAnalysis.pose.rotX}°, rotY=${completeAnalysis.pose.rotY}°, profondeur=${completeAnalysis.depth.estimatedCm}cm`);
            
            // 🎯 Utiliser le biais des bandes pour le score !
            if (completeAnalysis.bands && completeAnalysis.bands.avgBias !== undefined) {
              const absBias = Math.abs(completeAnalysis.bands.avgBias);
              // Score basé sur le biais : 0% = 1.0, 5% = 0.5, 10% = 0.0
              bandBiasScore = Math.max(0, 1 - (absBias / 5));
              console.log(`   📊 Biais bandes: ${(completeAnalysis.bands.avgBias * 100).toFixed(2)}% → score=${bandBiasScore.toFixed(2)}`);
            }
          } catch (analyzeErr) {
            console.warn(`   ⚠️ Analyse complète échouée:`, analyzeErr);
          }
          
          // Calculer un score global (détection + homographie + biais bandes)
          const detectionScore = marker.score || 0;
          const homographyQuality = ultraResult.quality || 0;
          const reprojScore = 1 - ultraResult.reprojectionError / 10;
          // 🎯 NOUVEAU: Inclure le biais des bandes dans le score (25% du poids)
          const globalScore = (detectionScore * 0.30) + 
                              (homographyQuality * 0.25) + 
                              (reprojScore * 0.20) + 
                              (bandBiasScore * 0.25);
          
          console.log(`   📈 Score photo ${i}: détection=${(detectionScore*100).toFixed(0)}%, homographie=${(homographyQuality*100).toFixed(0)}%, reproj=${(reprojScore*100).toFixed(0)}%, bandes=${(bandBiasScore*100).toFixed(0)}% → TOTAL=${(globalScore*100).toFixed(1)}%`);
          
          // 🎯 CRITIQUE: Utiliser magentaPositions (coins EXTÉRIEURS 18cm) pas corners (6cm intérieur)!
          // marker.corners = coins du pattern central 6cm (pour homographie interne)
          // marker.magentaPositions = coins MAGENTA extérieurs 18cm (pour calibration!)
          const outerCorners = marker.magentaPositions || marker.corners;
          const cornersPercent = {
            topLeft: { x: (outerCorners[0].x / width) * 100, y: (outerCorners[0].y / height) * 100 },
            topRight: { x: (outerCorners[1].x / width) * 100, y: (outerCorners[1].y / height) * 100 },
            bottomRight: { x: (outerCorners[2].x / width) * 100, y: (outerCorners[2].y / height) * 100 },
            bottomLeft: { x: (outerCorners[3].x / width) * 100, y: (outerCorners[3].y / height) * 100 }
          };
          
          console.log(`   🎯 Coins EXTÉRIEURS 18cm utilisés: TL=(${outerCorners[0].x.toFixed(0)},${outerCorners[0].y.toFixed(0)}) TR=(${outerCorners[1].x.toFixed(0)},${outerCorners[1].y.toFixed(0)})`);
          
          photoAnalyses.push({
            index: i,
            base64: photo.base64,
            marker,
            score: globalScore,
            homography: ultraResult.homography,
            reprojectionError: ultraResult.reprojectionError,
            quality: homographyQuality,
            corners: cornersPercent,
            arucoAnalysis: completeAnalysis, // 🔬 Stocké !
            imageWidth: width,
            imageHeight: height,
            ultraPrecision: {
              totalPoints: ultraResult.totalPoints,
              inlierPoints: ultraResult.inlierPoints,
              reprojectionError: ultraResult.reprojectionError,
              estimatedPrecision: ultraResult.reprojectionError < 0.5 ? '±0.2mm' : 
                                 ultraResult.reprojectionError < 1 ? '±0.5mm' : '±1mm',
              corners: cornersPercent
            }
          });
          
          console.log(`   ✅ Photo ${i}: ArUco détecté! score=${(globalScore * 100).toFixed(1)}%, reproj=${ultraResult.reprojectionError.toFixed(2)}mm`);
        } else {
          console.log(`   ❌ Photo ${i}: ArUco non détecté`);
        }
      } catch (err) {
        console.error(`   ❌ Photo ${i}: Erreur -`, err);
      }
    }
    
    if (photoAnalyses.length === 0) {
      console.error('❌ [BEST-PHOTO] Aucun ArUco détecté sur aucune photo !');
      return res.status(400).json({
        success: false,
        error: 'ArUco MAGENTA non détecté. Assurez-vous que le marqueur est visible.',
        detections: 0
      });
    }
    
    // ============================================
    // 2️⃣ SÉLECTIONNER LA MEILLEURE PHOTO
    // ============================================
    console.log('\n2️⃣ Sélection de la meilleure photo...');
    
    // Trier par score global (le plus élevé = meilleur)
    photoAnalyses.sort((a, b) => b.score - a.score);
    const bestPhoto = photoAnalyses[0];
    
    console.log(`   🏆 MEILLEURE PHOTO: ${bestPhoto.index}`);
    console.log(`      📊 Score global: ${(bestPhoto.score * 100).toFixed(1)}%`);
    console.log(`      📏 Reprojection error: ${bestPhoto.reprojectionError.toFixed(2)}mm`);
    console.log(`      🎯 Précision estimée: ${bestPhoto.ultraPrecision.estimatedPrecision}`);
    
    // ============================================
    // 3️⃣ CALCUL DE LA CORRECTION OPTIMALE
    // ============================================
    console.log('\n3️⃣ Calcul de la correction optimale...');
    
    let optimalCorrection: OptimalCorrectionResult | null = null;
    
    if (bestPhoto.arucoAnalysis) {
      optimalCorrection = calculateOptimalCorrection(
        bestPhoto.arucoAnalysis,
        {
          totalPoints: bestPhoto.ultraPrecision.totalPoints,
          inlierPoints: bestPhoto.ultraPrecision.inlierPoints,
          reprojectionError: bestPhoto.reprojectionError,
          quality: bestPhoto.quality
        }
      );
      
      console.log(`   🎯 CORRECTION FINALE: ×${optimalCorrection.finalCorrection.toFixed(4)}`);
      console.log(`      📊 Confiance: ${(optimalCorrection.globalConfidence * 100).toFixed(0)}%`);
      console.log(`      📏 Correction X: ×${optimalCorrection.correctionX.toFixed(4)}`);
      console.log(`      📏 Correction Y: ×${optimalCorrection.correctionY.toFixed(4)}`);
    }
    
    // ============================================
    // RÉSULTAT FINAL
    // ============================================
    const totalTime = Date.now() - startTime;
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`✅ [BEST-PHOTO] SUCCÈS - ${totalTime}ms`);
    console.log(`${'='.repeat(80)}\n`);

    // 🎯 ARUCO: Calculer pixelPerCm depuis les dimensions du marqueur (18cm × 18cm)
    const markerSizeCm = MARKER_SPECS.markerSize; // 18cm
    const markerWidthPx = (bestPhoto.corners.bottomRight.x - bestPhoto.corners.topLeft.x) / 100 * 1920; // Estimation
    const markerHeightPx = (bestPhoto.corners.bottomRight.y - bestPhoto.corners.topLeft.y) / 100 * 1080;
    const avgPixelPerCm = (markerWidthPx + markerHeightPx) / 2 / markerSizeCm;
    
    return res.json({
      success: true,
      method: 'best-photo-selection',
      
      // 🏆 Meilleure photo (à utiliser dans le canvas)
      bestPhotoBase64: bestPhoto.base64,
      
      // 🎯 Corners ArUco en % (pour le canvas)
      fusedCorners: bestPhoto.corners,
      homographyReady: true,
      
      // 🔬 ANALYSE COMPLÈTE DU MARQUEUR - Nouveau pour le panel ArUco
      arucoAnalysis: bestPhoto.arucoAnalysis,
      
      // 🎯 CORRECTION OPTIMALE - NOUVEAU !
      optimalCorrection: optimalCorrection,
      
      // 🎯 NOUVEAU: Données pour calibration précise
      markerSizeCm: markerSizeCm, // 18cm ArUco MAGENTA
      pixelPerCm: avgPixelPerCm,  // Pixels par cm (estimation)
      homographyMatrix: bestPhoto.homography, // Matrice 3x3 si disponible
      reprojectionErrorMm: bestPhoto.reprojectionError, // Erreur en mm
      
      // 📊 Ultra-précision
      ultraPrecision: {
        ...bestPhoto.ultraPrecision,
        // 🎯 NOUVEAU: Ajouter les données pour le canvas
        homographyMatrix: bestPhoto.homography,
        pixelPerCm: avgPixelPerCm,
        markerSizeCm: markerSizeCm,
        // 🎯 CORRECTION OPTIMALE dans ultraPrecision aussi
        optimalCorrection: optimalCorrection?.finalCorrection || 1.0,
        correctionX: optimalCorrection?.correctionX || 1.0,
        correctionY: optimalCorrection?.correctionY || 1.0,
        correctionConfidence: optimalCorrection?.globalConfidence || 0
      },
      
      // 🏆 Infos sur la meilleure photo
      bestPhoto: {
        index: bestPhoto.index,
        score: bestPhoto.score,
        reprojectionError: bestPhoto.reprojectionError
      },
      
      // 📊 Résultats de toutes les photos (pour affichage)
      allPhotoScores: photoAnalyses.map(p => ({
        index: p.index,
        score: p.score,
        reprojectionError: p.reprojectionError,
        detected: true
      })),
      
      // Métriques
      metrics: {
        inputPhotos: photos.length,
        successfulDetections: photoAnalyses.length,
        processingTimeMs: totalTime
      }
    });

  } catch (error) {
    console.error('❌ [BEST-PHOTO] Erreur:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de l\'analyse des photos'
    });
  }
});

/**
 * 📏 Fonction helper pour détecter les contours d'un objet à mesurer
 * Utilise EdgeDetection puis Gemini comme fallback
 */
async function detectObjectInZone(
  imageBuffer: Buffer,
  cropZone: { x: number; y: number; width: number; height: number },
  imageWidth: number,
  imageHeight: number,
  objectType: string,
  objectDescription?: string
): Promise<{
  success: boolean;
  method: string;
  corners: { x: number; y: number }[] | null;
  confidence: number;
}> {
  try {
    // Convertir le buffer en base64 pour les services de détection
    const imageBase64 = imageBuffer.toString('base64');
    
    // Zone de sélection en % pour EdgeDetection
    const selectionZonePercent = {
      x: (cropZone.x / imageWidth) * 100,
      y: (cropZone.y / imageHeight) * 100,
      width: (cropZone.width / imageWidth) * 100,
      height: (cropZone.height / imageHeight) * 100
    };

    console.log(`📏 [DETECT OBJECT] Détection objet "${objectType}" dans zone ${cropZone.width}x${cropZone.height}px`);

    // 1. Essayer EdgeDetection
    console.log('🔍 [DETECT OBJECT] Tentative EdgeDetection...');
    const edgeResult = await edgeDetectionService.detectWhitePaperCorners(
      imageBase64,
      selectionZonePercent,
      'image/jpeg'
    );

    // EdgeDetection retourne un objet {topLeft, topRight, bottomLeft, bottomRight}
    if (edgeResult.success && edgeResult.corners) {
      const corners = edgeResult.corners;
      
      // Vérifier si c'est un objet avec les 4 coins
      if (corners.topLeft && corners.topRight && corners.bottomLeft && corners.bottomRight) {
        console.log(`✅ [DETECT OBJECT] EdgeDetection réussie avec 4 coins (objet)`);
        
        // Convertir en tableau [TL, TR, BR, BL] pour le Canvas
        const cornersArray = [
          corners.topLeft,
          corners.topRight,
          corners.bottomRight,
          corners.bottomLeft
        ];
        
        return {
          success: true,
          method: 'edge-detection-object',
          corners: cornersArray,
          confidence: edgeResult.confidence || 70
        };
      }
      
      // Si c'est déjà un tableau
      if (Array.isArray(corners) && corners.length === 4) {
        console.log(`✅ [DETECT OBJECT] EdgeDetection réussie: ${corners.length} coins (array)`);
        return {
          success: true,
          method: 'edge-detection-object',
          corners: corners,
          confidence: edgeResult.confidence || 70
        };
      }
    }

    console.log('⚠️ [DETECT OBJECT] EdgeDetection échouée ou format invalide');
    
    // 2. Pas de fallback Gemini pour l'instant - retourner échec
    // (geminiService.detectCornersInZone n'existe pas)
    return {
      success: false,
      method: 'detection-failed',
      corners: null,
      confidence: 0
    };

  } catch (error) {
    console.error('❌ [DETECT OBJECT] Erreur:', error);
    return {
      success: false,
      method: 'error',
      corners: null,
      confidence: 0
    };
  }
}

/**
 * 🎯 POST /api/measurement-reference/detect-with-fusion
 * ENDPOINT COMBINÉ: Fusionne les photos PUIS détecte les coins
 * 
 * C'est la méthode RECOMMANDÉE pour obtenir la meilleure précision !
 * 
 * FLUX:
 * 1. Fusion des N photos → 1 image optimisée
 * 2. 🎯 Détection ArUco MAGENTA avec 105 POINTS :
 *    - 4 coins du marqueur
 *    - 16 points de transition noir/blanc
 *    - 49 coins de grille intérieure (Harris)
 *    - 36 centres de cellules
 * 3. RANSAC homographie (1000 itérations)
 * 4. Levenberg-Marquardt refinement (50 itérations)
 * 5. Retour des mesures avec précision ±0.2mm
 * 
 * @body photos - Array de { base64, mimeType }
 * @body selectionZone - { x, y, width, height } en %
 * @body referenceType - Type de référence (aruco_magenta recommandé)
 * @body objectDescription - Description pour l'IA (optionnel, fallback)
 */
router.post('/detect-with-fusion', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { 
      photos, 
      selectionZone, 
      referenceType = 'aruco_magenta',
      objectDescription,
      realDimensions,
      targetType = 'reference'
    } = req.body;

    if (!req.user?.id) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    if (!photos || photos.length === 0) {
      return res.status(400).json({ error: 'Au moins une photo requise' });
    }

    if (!selectionZone) {
      return res.status(400).json({ error: 'selectionZone requise' });
    }

    const isMeasurementTarget = targetType === 'measurement';
    console.log(`🎯 [FUSION] Détection: ${photos.length} photos, type: ${referenceType}, target: ${targetType}`);
    console.log(`📐 [FUSION] Zone: x=${selectionZone.x?.toFixed(1)}%, y=${selectionZone.y?.toFixed(1)}%`);
    
    if (isMeasurementTarget) {
      console.log(`📏 [FUSION] MODE MESURE OBJET → Utilisation EdgeDetection/Gemini (pas ArUco)`);
    }

    // ============================================
    // ÉTAPE 1: FUSION DES PHOTOS
    // ============================================
    console.log('🔀 [FUSION] Étape 1: Fusion des photos...');
    
    const cleanedPhotos = photos.map((photo: { base64: string; mimeType?: string }) => ({
      base64: photo.base64.includes(',') ? photo.base64.split(',')[1] : photo.base64,
      mimeType: photo.mimeType || 'image/jpeg'
    }));

    // Pour la fusion, mapper aruco_magenta sur custom (taille similaire)
    const fusionType = referenceType === 'aruco_magenta' ? 'custom' : referenceType;
    const fusionResult = await multiPhotoFusionService.fuseForReferenceDetection(
      cleanedPhotos,
      fusionType as 'a4' | 'card' | 'meter' | 'custom'
    );

    // Image à utiliser (fusionnée ou première photo si fusion échouée)
    const imageToUse = fusionResult.fusedImageBase64 || cleanedPhotos[0].base64;
    const mimeTypeToUse = fusionResult.mimeType || 'image/jpeg';

    console.log(`✅ [FUSION+ARUCO] Image ${fusionResult.success ? 'fusionnée' : 'originale'} prête (${Math.round(imageToUse.length / 1024)} KB)`);

    // ============================================
    // ÉTAPE 2: DÉTECTION ARUCO MAGENTA (105 POINTS)
    // ============================================
    console.log('🎯 [FUSION+ARUCO] Étape 2: Détection ArUco MAGENTA avec 105 points...');

    // Décoder l'image
    const imageBuffer = Buffer.from(imageToUse, 'base64');
    const metadata = await sharp(imageBuffer).metadata();
    const imageWidth = metadata.width || 1920;
    const imageHeight = metadata.height || 1080;

    console.log(`📷 [FUSION+ARUCO] Dimensions image: ${imageWidth}x${imageHeight}`);

    // Convertir zone de sélection (%) en pixels
    const cropZone = {
      x: Math.round(selectionZone.x * imageWidth / 100),
      y: Math.round(selectionZone.y * imageHeight / 100),
      width: Math.round(selectionZone.width * imageWidth / 100),
      height: Math.round(selectionZone.height * imageHeight / 100)
    };

    console.log(`📐 [FUSION] Zone crop: ${cropZone.x},${cropZone.y} -> ${cropZone.width}x${cropZone.height}`);

    // ============================================
    // MODE MESURE OBJET → Utiliser directement EdgeDetection/Gemini
    // ============================================
    if (isMeasurementTarget) {
      console.log('📏 [MESURE OBJET] Saut de la détection ArUco → EdgeDetection/Gemini direct');
      
      // Utiliser la détection générique pour l'objet à mesurer
      const objectDetectionResult = await detectObjectInZone(
        imageBuffer,
        cropZone,
        imageWidth,
        imageHeight,
        referenceType, // 'door', 'window', 'chassis', etc.
        objectDescription
      );
      
      if (objectDetectionResult.success) {
        return res.json({
          success: true,
          objectFound: true,
          method: objectDetectionResult.method,
          corners: objectDetectionResult.corners,
          confidence: objectDetectionResult.confidence,
          fusionMetrics: fusionResult.metrics,
          debug: {
            imageSize: { width: imageWidth, height: imageHeight },
            cropZone,
            mode: 'measurement-object'
          }
        });
      }
      
      // Si échec, retourner erreur
      return res.json({
        success: true,
        objectFound: false,
        corners: null,
        confidence: 0,
        message: `Impossible de détecter les contours de l'objet (${referenceType})`,
        fusionMetrics: fusionResult.metrics
      });
    }

    // ============================================
    // MODE REFERENCE → Détection ArUco MAGENTA (105 points)
    // ============================================
    console.log('🎯 [REFERENCE] Étape 2: Détection ArUco MAGENTA avec 105 points...');

    // 🎯 MÉTHODE PRINCIPALE: Détection ArUco MAGENTA
    try {
      // Extraire la zone de sélection et obtenir les données RGBA
      const extractWidth = Math.min(cropZone.width, imageWidth - cropZone.x);
      const extractHeight = Math.min(cropZone.height, imageHeight - cropZone.y);
      
      const croppedRaw = await sharp(imageBuffer)
        .extract({
          left: Math.max(0, cropZone.x),
          top: Math.max(0, cropZone.y),
          width: extractWidth,
          height: extractHeight
        })
        .ensureAlpha()
        .raw()
        .toBuffer();

      // Créer l'objet ImageData pour MarkerDetector
      const imageDataForDetector = {
        data: new Uint8ClampedArray(croppedRaw),
        width: extractWidth,
        height: extractHeight
      };

      console.log(`🔍 [FUSION+ARUCO] Détection ArUco sur zone ${extractWidth}x${extractHeight}...`);

      // Détection ArUco de base avec la méthode detect()
      const markers = arucoDetector.detect(imageDataForDetector);

      if (markers.length > 0) {
        const marker = markers[0];
        // score est un nombre entre 0-1, on le convertit en %
        const markerConfidence = Math.round(marker.score * 100);
        console.log(`✅ [FUSION+ARUCO] ArUco détecté: ID=${marker.id}, Confidence=${markerConfidence}%`);
        
        // 🔬 ULTRA-PRÉCISION: 105 points !
        console.log('🔬 [FUSION+ARUCO] Étape 3: Détection ULTRA-PRÉCISION 105 points...');
        
        // Utiliser les coins magenta extérieurs pour l'ultra-précision
        const cornersForUltra = marker.magentaPositions || marker.corners;
        
        const ultraResult = detectUltraPrecisionPoints(
          imageDataForDetector,
          cornersForUltra,
          marker.extendedPoints
        );

        console.log(`🎯 [FUSION+ARUCO] Ultra-précision: ${ultraResult.totalPoints} points détectés`);
        console.log(`   📊 Coins: ${ultraResult.cornerPoints}`);
        console.log(`   📊 Transitions: ${ultraResult.transitionPoints}`);
        console.log(`   📊 Grille: ${ultraResult.gridCornerPoints}`);
        console.log(`   📊 Centres: ${ultraResult.gridCenterPoints}`);
        console.log(`   ✅ RANSAC inliers: ${ultraResult.inlierPoints}/${ultraResult.totalPoints}`);
        console.log(`   ✅ Reprojection error: ${ultraResult.reprojectionError.toFixed(3)}mm`);
        console.log(`   ✅ Quality: ${(ultraResult.quality * 100).toFixed(1)}%`);

        // 🎯 CORRECTION BUG: Utiliser magentaPositions (coins EXTÉRIEURS 18cm) et NON corners (intérieurs 6cm) !
        const outerCorners = marker.magentaPositions || marker.corners;
        const adjustedCorners = outerCorners.map(corner => ({
          x: ((cropZone.x + corner.x) / imageWidth) * 100,
          y: ((cropZone.y + corner.y) / imageHeight) * 100
        }));

        // Convertir tous les points ultra-précision de crop vers image complète
        // UltraPrecisionPoint a .pixel (Point2D), pas imageX/imageY
        const adjustedUltraPoints = ultraResult.points.map(p => ({
          ...p,
          pixel: {
            x: ((cropZone.x + p.pixel.x) / imageWidth) * 100,
            y: ((cropZone.y + p.pixel.y) / imageHeight) * 100
          }
        }));

        return res.json({
          success: true,
          objectFound: true,
          method: 'aruco-ultra-precision-105-points',
          
          // 4 coins du marqueur (pour compatibilité)
          corners: adjustedCorners,
          
          // 🎯 ULTRA-PRÉCISION: 105 points
          ultraPrecision: {
            enabled: true,
            totalPoints: ultraResult.totalPoints,
            inlierPoints: ultraResult.inlierPoints,
            points: adjustedUltraPoints,
            
            // Compteurs par source
            cornerPoints: ultraResult.cornerPoints,
            transitionPoints: ultraResult.transitionPoints,
            gridCornerPoints: ultraResult.gridCornerPoints,
            gridCenterPoints: ultraResult.gridCenterPoints,
            
            // Homographie RANSAC + Levenberg-Marquardt
            homography: {
              matrix: ultraResult.homography,
              inlierRatio: ultraResult.inlierPoints / ultraResult.totalPoints,
              reprojectionError: ultraResult.reprojectionError,
              method: 'RANSAC-1000-iter + Levenberg-Marquardt-50-iter'
            },
            
            // Métriques de qualité
            quality: ultraResult.quality,
            ransacApplied: ultraResult.ransacApplied,
            ellipseFittingApplied: ultraResult.ellipseFittingApplied,
            levenbergMarquardtApplied: ultraResult.levenbergMarquardtApplied,
            
            // Précision estimée
            estimatedPrecision: ultraResult.reprojectionError < 0.5 ? '±0.2mm' : 
                               ultraResult.reprojectionError < 1 ? '±0.5mm' : '±1mm'
          },
          
          // Infos marqueur ArUco
          marker: {
            id: marker.id,
            type: 'MAGENTA',
            physicalSize: MARKER_SPECS.markerSize,
            unit: 'mm',
            confidence: markerConfidence
          },
          
          // Métriques de fusion
          fusionMetrics: fusionResult.metrics,
          
          // Confiance globale (basée sur inliers RANSAC + qualité)
          confidence: Math.round(ultraResult.quality * 100),

          debug: {
            imageSize: { width: imageWidth, height: imageHeight },
            cropZone,
            extractSize: { width: extractWidth, height: extractHeight },
            processingTime: Date.now()
          }
        });
      }

      console.log('⚠️ [FUSION+ARUCO] Aucun marqueur ArUco détecté, fallback détection générique...');

    } catch (arucoError) {
      console.error('❌ [FUSION+ARUCO] Erreur détection ArUco:', arucoError);
    }

    // ============================================
    // FALLBACK: DÉTECTION GÉNÉRIQUE (EdgeDetection + Gemini)
    // ============================================
    console.log('🔄 [FUSION+ARUCO] Fallback: Détection générique EdgeDetection...');
    
    const edgeResult = await edgeDetectionService.detectWhitePaperCorners(
      imageToUse,
      selectionZone,
      mimeTypeToUse
    );

    if (edgeResult.success && edgeResult.corners) {
      console.log('✅ [FUSION+ARUCO] Détection EdgeDetection réussie (fallback)');
      
      return res.json({
        success: true,
        objectFound: true,
        corners: edgeResult.corners,
        confidence: edgeResult.confidence || 80,
        method: 'edge-detection-fallback',
        fusionMetrics: fusionResult.metrics,
        debug: edgeResult.debug
      });
    }

    // Dernier recours: Gemini IA
    console.log('🤖 [FUSION+ARUCO] Dernier recours: Gemini IA...');
    
    const geminiResult = await geminiService.detectCornersInZone(
      imageToUse,
      mimeTypeToUse,
      selectionZone,
      referenceType,
      objectDescription,
      realDimensions,
      targetType
    );

    res.json({
      ...geminiResult,
      method: geminiResult.success ? 'gemini-fallback' : 'detection-failed',
      fusionMetrics: fusionResult.metrics
    });

  } catch (error) {
    console.error('❌ [FUSION+ARUCO] Erreur détection avec fusion:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la détection avec fusion'
    });
  }
});

export default router;