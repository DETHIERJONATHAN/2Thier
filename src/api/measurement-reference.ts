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

const router = Router();

// Instance du service Gemini
const geminiService = new GoogleGeminiService();

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
 * 🎯 POST /api/measurement-reference/detect-with-fusion
 * ENDPOINT COMBINÉ: Fusionne les photos PUIS détecte les coins
 * 
 * C'est la méthode RECOMMANDÉE pour obtenir la meilleure précision !
 * 
 * FLUX:
 * 1. Fusion des N photos → 1 image optimisée
 * 2. Détection de coins sur l'image fusionnée (EdgeDetection puis Gemini fallback)
 * 3. Retour des corners avec haute confiance
 * 
 * @body photos - Array de { base64, mimeType }
 * @body selectionZone - { x, y, width, height } en %
 * @body referenceType - Type de référence
 * @body objectDescription - Description pour l'IA (optionnel)
 */
router.post('/detect-with-fusion', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { 
      photos, 
      selectionZone, 
      referenceType = 'a4',
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

    console.log(`🎯 [API] Détection avec fusion: ${photos.length} photos, type: ${referenceType}`);
    console.log(`📐 [API] Zone: x=${selectionZone.x?.toFixed(1)}%, y=${selectionZone.y?.toFixed(1)}%`);

    // ============================================
    // ÉTAPE 1: FUSION DES PHOTOS
    // ============================================
    console.log('🔀 [API] Étape 1: Fusion des photos...');
    
    const cleanedPhotos = photos.map((photo: { base64: string; mimeType?: string }) => ({
      base64: photo.base64.includes(',') ? photo.base64.split(',')[1] : photo.base64,
      mimeType: photo.mimeType || 'image/jpeg'
    }));

    const fusionResult = await multiPhotoFusionService.fuseForReferenceDetection(
      cleanedPhotos,
      referenceType as 'a4' | 'card' | 'meter' | 'custom'
    );

    if (!fusionResult.success || !fusionResult.fusedImageBase64) {
      console.error('❌ [API] Fusion échouée:', fusionResult.error);
      // Fallback: utiliser la première photo
      console.log('⚠️ [API] Fallback sur première photo...');
    }

    // Image à utiliser pour la détection (fusionnée ou première photo si fusion échouée)
    const imageToUse = fusionResult.fusedImageBase64 || cleanedPhotos[0].base64;
    const mimeTypeToUse = fusionResult.mimeType || 'image/jpeg';

    console.log(`✅ [API] Image ${fusionResult.success ? 'fusionnée' : 'originale'} prête (${Math.round(imageToUse.length / 1024)} KB)`);

    // ============================================
    // ÉTAPE 2: DÉTECTION DES COINS
    // ============================================
    console.log('🔍 [API] Étape 2: Détection des coins sur image optimisée...');

    // 🔬 MÉTHODE 1: Détection de contours avec Sharp (PRIORITAIRE)
    console.log('🔬 [API] Tentative détection par analyse de contours (Sharp)...');
    
    const edgeResult = await edgeDetectionService.detectWhitePaperCorners(
      imageToUse,
      selectionZone,
      mimeTypeToUse
    );

    if (edgeResult.success && edgeResult.corners) {
      console.log('✅ [API] Détection par contours RÉUSSIE sur image fusionnée !');
      
      return res.json({
        success: true,
        objectFound: true,
        corners: edgeResult.corners,
        confidence: Math.min(98, (edgeResult.confidence || 90) + 5), // +5% bonus fusion
        method: 'edge-detection-with-fusion',
        fusionMetrics: fusionResult.metrics,
        debug: edgeResult.debug
      });
    }

    // 🤖 MÉTHODE 2: Fallback vers Gemini IA
    console.log('⚠️ [API] Détection par contours échouée, fallback vers Gemini...');
    
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
      method: geminiResult.success ? 'gemini-with-fusion' : 'gemini-failed',
      fusionMetrics: fusionResult.metrics
    });

  } catch (error) {
    console.error('❌ [API] Erreur détection avec fusion:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la détection avec fusion'
    });
  }
});

export default router;
