/**
 * 🎯 SMART DETECTION SERVICE
 * ============================================================================
 * 
 * Service intelligent qui orchestre le flux complet de détection optimisé:
 * 1. Fusion multi-photos (si disponibles)
 * 2. Pré-traitement d'image (contraste, netteté)
 * 3. Détection de bords (EdgeDetection)
 * 4. Fallback IA (Gemini)
 * 5. Validation et scoring
 * 
 * AVANTAGES:
 * - Combine les meilleures techniques disponibles
 * - Auto-adaptation selon la qualité des photos
 * - Logging détaillé pour debug
 * - Métriques de confiance précises
 * 
 * @author CRM 2Thier
 * @version 1.0.0
 */

import { multiPhotoFusionService } from './MultiPhotoFusionService';
import { edgeDetectionService, type DetectedCorners, type EdgeDetectionResult } from './EdgeDetectionService';
import GoogleGeminiService from './GoogleGeminiService';

// ============================================================================
// TYPES
// ============================================================================

interface PhotoInput {
  base64: string;
  mimeType: string;
  metadata?: {
    qualityScore?: number;
    sharpness?: number;
    brightness?: number;
  };
}

interface SelectionZone {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SmartDetectionResult {
  success: boolean;
  corners?: DetectedCorners;
  confidence: number;
  
  // Détails de la méthode utilisée
  method: 'edge-detection-fused' | 'edge-detection-single' | 'gemini-fused' | 'gemini-single' | 'failed';
  
  // Métriques de fusion (si applicable)
  fusionMetrics?: {
    inputPhotos: number;
    usedPhotos: number;
    averageQuality: number;
    finalSharpness: number;
  };
  
  // Debug info
  debug?: {
    fusionTimeMs?: number;
    detectionTimeMs?: number;
    totalTimeMs: number;
    attemptedMethods: string[];
    errors: string[];
  };
  
  error?: string;
}

interface SmartDetectionOptions {
  referenceType: 'a4' | 'card' | 'meter' | 'custom';
  objectDescription?: string;
  realDimensions?: { width: number; height: number };
  targetType?: 'reference' | 'measurement';
  
  // Options avancées
  skipFusion?: boolean;       // Forcer l'utilisation d'une seule image
  skipEdgeDetection?: boolean; // Forcer l'utilisation de Gemini
  enhanceContrast?: boolean;  // Améliorer le contraste avant détection
  minConfidence?: number;     // Confiance minimale acceptée (défaut: 70)
}

// ============================================================================
// SERVICE
// ============================================================================

class SmartDetectionService {
  private geminiService: GoogleGeminiService;

  constructor() {
    this.geminiService = new GoogleGeminiService();
  }

  /**
   * 🎯 DÉTECTION INTELLIGENTE - Point d'entrée principal
   * 
   * Orchestre automatiquement le meilleur flux selon les données disponibles:
   * - Si plusieurs photos → Fusion puis détection
   * - Si une seule photo → Détection directe
   * - EdgeDetection d'abord, Gemini en fallback
   * 
   * @param photos - Une ou plusieurs photos
   * @param selectionZone - Zone où chercher l'objet
   * @param options - Options de détection
   */
  async detectCorners(
    photos: PhotoInput[],
    selectionZone: SelectionZone,
    options: SmartDetectionOptions
  ): Promise<SmartDetectionResult> {
    const startTime = Date.now();
    const debug = {
      attemptedMethods: [] as string[],
      errors: [] as string[],
      fusionTimeMs: 0,
      detectionTimeMs: 0,
      totalTimeMs: 0
    };

    console.log(`🎯 [SmartDetection] Début détection intelligente`);
    console.log(`   📷 Photos: ${photos.length}`);
    console.log(`   📐 Zone: ${selectionZone.x.toFixed(1)}%, ${selectionZone.y.toFixed(1)}%`);
    console.log(`   🏷️ Type: ${options.referenceType}`);

    try {
      let imageToUse: string;
      let mimeTypeToUse: string = 'image/jpeg';
      let fusionMetrics: SmartDetectionResult['fusionMetrics'] | undefined;

      // ============================================
      // ÉTAPE 1: FUSION (si plusieurs photos)
      // ============================================
      if (photos.length > 1 && !options.skipFusion) {
        console.log(`🔀 [SmartDetection] Étape 1: Fusion de ${photos.length} photos...`);
        debug.attemptedMethods.push('multi-photo-fusion');
        
        const fusionStart = Date.now();
        const fusionResult = await multiPhotoFusionService.fuseForReferenceDetection(
          photos,
          options.referenceType
        );
        debug.fusionTimeMs = Date.now() - fusionStart;

        if (fusionResult.success && fusionResult.fusedImageBase64) {
          imageToUse = fusionResult.fusedImageBase64;
          mimeTypeToUse = fusionResult.mimeType;
          fusionMetrics = fusionResult.metrics;
          console.log(`✅ [SmartDetection] Fusion réussie en ${debug.fusionTimeMs}ms`);
        } else {
          console.warn(`⚠️ [SmartDetection] Fusion échouée, utilisation de la première photo`);
          debug.errors.push(`Fusion failed: ${fusionResult.error}`);
          imageToUse = this.cleanBase64(photos[0].base64);
        }
      } else {
        console.log(`📷 [SmartDetection] Étape 1: Utilisation d'une seule photo`);
        imageToUse = this.cleanBase64(photos[0].base64);
        mimeTypeToUse = photos[0].mimeType || 'image/jpeg';
      }

      // ============================================
      // ÉTAPE 2: EDGE DETECTION (prioritaire)
      // ============================================
      if (!options.skipEdgeDetection) {
        console.log(`🔲 [SmartDetection] Étape 2: Détection de bords Sharp...`);
        debug.attemptedMethods.push('edge-detection');
        
        const detectionStart = Date.now();
        const edgeResult = await edgeDetectionService.detectWhitePaperCorners(
          imageToUse,
          selectionZone,
          mimeTypeToUse
        );
        debug.detectionTimeMs = Date.now() - detectionStart;

        if (edgeResult.success && edgeResult.corners) {
          const confidence = edgeResult.confidence || 85;
          
          if (confidence >= (options.minConfidence || 70)) {
            console.log(`✅ [SmartDetection] Edge detection réussie en ${debug.detectionTimeMs}ms (confiance: ${confidence}%)`);
            
            debug.totalTimeMs = Date.now() - startTime;
            return {
              success: true,
              corners: edgeResult.corners,
              confidence: Math.min(98, confidence + (fusionMetrics ? 5 : 0)), // Bonus fusion
              method: fusionMetrics ? 'edge-detection-fused' : 'edge-detection-single',
              fusionMetrics,
              debug
            };
          } else {
            console.log(`⚠️ [SmartDetection] Edge detection confiance insuffisante: ${confidence}%`);
            debug.errors.push(`Edge detection low confidence: ${confidence}%`);
          }
        } else {
          console.log(`⚠️ [SmartDetection] Edge detection échouée: ${edgeResult.error}`);
          debug.errors.push(`Edge detection failed: ${edgeResult.error}`);
        }
      }

      // ============================================
      // ÉTAPE 3: FALLBACK GEMINI IA
      // ============================================
      console.log(`🤖 [SmartDetection] Étape 3: Fallback vers Gemini IA...`);
      debug.attemptedMethods.push('gemini-ai');
      
      const geminiStart = Date.now();
      const geminiResult = await this.geminiService.detectCornersInZone(
        imageToUse,
        mimeTypeToUse,
        selectionZone,
        options.referenceType,
        options.objectDescription,
        options.realDimensions,
        options.targetType
      );
      debug.detectionTimeMs += Date.now() - geminiStart;

      if (geminiResult.success && geminiResult.objectFound && geminiResult.corners) {
        console.log(`✅ [SmartDetection] Gemini IA réussie (confiance: ${geminiResult.confidence}%)`);
        
        debug.totalTimeMs = Date.now() - startTime;
        return {
          success: true,
          corners: geminiResult.corners,
          confidence: geminiResult.confidence || 75,
          method: fusionMetrics ? 'gemini-fused' : 'gemini-single',
          fusionMetrics,
          debug
        };
      }

      // ============================================
      // ÉCHEC TOTAL
      // ============================================
      console.error(`❌ [SmartDetection] Toutes les méthodes ont échoué`);
      debug.errors.push(`Gemini failed: ${geminiResult.error || 'Object not found'}`);
      debug.totalTimeMs = Date.now() - startTime;

      return {
        success: false,
        confidence: 0,
        method: 'failed',
        debug,
        error: `Détection impossible: ${debug.errors.join('; ')}`
      };

    } catch (error) {
      console.error(`❌ [SmartDetection] Erreur:`, error);
      debug.errors.push((error as Error).message);
      debug.totalTimeMs = Date.now() - startTime;

      return {
        success: false,
        confidence: 0,
        method: 'failed',
        debug,
        error: (error as Error).message
      };
    }
  }

  /**
   * 🧹 Nettoie un base64 (retire le préfixe data:image/...;base64,)
   */
  private cleanBase64(base64: string): string {
    return base64.includes(',') ? base64.split(',')[1] : base64;
  }

  /**
   * 📊 Analyse rapide de la qualité d'une photo
   * Retourne un score de 0 à 100
   */
  async analyzePhotoQuality(base64: string): Promise<{
    score: number;
    sharpness: number;
    brightness: number;
    contrast: number;
    issues: string[];
  }> {
    // Utiliser le service de fusion pour l'analyse (il a déjà les méthodes)
    const photos = [{ base64: this.cleanBase64(base64), mimeType: 'image/jpeg' }];
    
    const fusionResult = await multiPhotoFusionService.fusePhotos(photos, {
      enhanceEdges: false,
      boostWhite: false,
      localContrast: false
    });

    if (fusionResult.photoAnalysis && fusionResult.photoAnalysis.length > 0) {
      const analysis = fusionResult.photoAnalysis[0];
      return {
        score: analysis.quality,
        sharpness: analysis.sharpness,
        brightness: analysis.brightness,
        contrast: 50, // Non disponible directement
        issues: analysis.issues
      };
    }

    return {
      score: 50,
      sharpness: 50,
      brightness: 128,
      contrast: 50,
      issues: ['Analyse non disponible']
    };
  }

  /**
   * 🔧 Pré-traitement d'une image pour améliorer la détection
   * Retourne une image optimisée
   */
  async preprocessImage(base64: string, options: {
    enhanceContrast?: boolean;
    boostWhite?: boolean;
    sharpen?: boolean;
  } = {}): Promise<string> {
    const photos = [{ base64: this.cleanBase64(base64), mimeType: 'image/jpeg' }];
    
    const result = await multiPhotoFusionService.fusePhotos(photos, {
      enhanceEdges: options.sharpen ?? true,
      boostWhite: options.boostWhite ?? true,
      localContrast: options.enhanceContrast ?? true
    });

    return result.fusedImageBase64 || base64;
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

export const smartDetectionService = new SmartDetectionService();
export default smartDetectionService;
