/**
 * 🎯 USE AI MEASURE - Hook pour l'analyse d'images avec IA Gemini
 * 
 * Ce hook gère :
 * - L'envoi d'images au service Gemini Vision
 * - L'extraction des mesures (longueur, largeur, etc.)
 * - L'application des résultats aux champs mappés
 * 
 * @module hooks/useAIMeasure
 * @author 2Thier CRM Team
 */

import { useState, useCallback } from 'react';
import { message, notification } from 'antd';
import { useAuthenticatedApi } from './useAuthenticatedApi';

/**
 * Configuration du mapping entre les clés de mesure et les champs cibles
 */
export interface AIMeasureMapping {
  measureKey: string;           // Ex: "longueur", "largeur"
  targetFieldId: string;        // ID du champ cible
  targetFieldPath?: string;     // Chemin complet @value.nodeId
  transform?: 'none' | 'round' | 'ceil' | 'floor';  // Transformation
  unit?: string;                // Unité (cm, m, etc.)
}

/**
 * Configuration complète de la mesure IA pour un champ IMAGE
 */
export interface AIMeasureConfig {
  enabled: boolean;                 // Activer la mesure IA
  prompt?: string;                  // Instructions personnalisées pour l'IA
  measureKeys: string[];            // Liste des mesures à extraire
  mappings: AIMeasureMapping[];     // Configuration des mappings
  autoTrigger?: boolean;            // Déclencher automatiquement après upload
  showPreview?: boolean;            // Afficher l'aperçu des résultats
}

/**
 * Résultat d'une analyse d'image
 */
export interface AIMeasureResult {
  success: boolean;
  measures: Record<string, number | string>;
  confidence?: number;
  rawResponse?: string;
  error?: string;
  timestamp: number;
  // 🆕 Données Vision AR (Métré A4 V10)
  detected?: boolean;
  marker?: {
    referenceCentersMm?: { width: number; height: number };
    sheetSizeMm?: { width: number; height: number };
  };
  homography?: {
    matrix: number[][];
    pixelsPerCm: number | null;
    realSizeCm: number;
    sides?: number[];
    angles?: number[];
    quality: number;
  };
  calibration?: {
    pixelPerCm: number;
    referenceType: string;
    referenceSize: { width: number; height: number };
  };
  pose?: {
    rotX: number;
    rotY: number;
    rotZ: number;
  };
}

/**
 * Options pour le hook useAIMeasure
 */
export interface UseAIMeasureOptions {
  onSuccess?: (result: AIMeasureResult) => void;
  onError?: (error: string) => void;
  onFieldUpdate?: (fieldId: string, value: unknown) => void;
  visionOptions?: {
    referenceHint?: unknown;
    deviceInfo?: unknown;
    exif?: unknown;
    persist?: boolean;
  };
}

/**
 * Hook pour l'analyse d'images avec IA Gemini
 */
export function useAIMeasure(options: UseAIMeasureOptions = {}) {
  const { api } = useAuthenticatedApi();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastResult, setLastResult] = useState<AIMeasureResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Analyser une image avec la configuration donnée
   */
  const analyzeImage = useCallback(async (
    imageBase64: string,
    config: AIMeasureConfig,
    fieldMappings?: Record<string, string> // Map fieldId -> fieldLabel pour meilleur contexte
  ): Promise<AIMeasureResult | null> => {
    if (!config.enabled) {
      console.log('[useAIMeasure] Mesure IA désactivée');
      return null;
    }

    if (!imageBase64) {
      const errorMsg = 'Aucune image fournie pour l\'analyse';
      setError(errorMsg);
      options.onError?.(errorMsg);
      return null;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // 🔧 FIX: Extraire le mimeType et séparer les données base64 du préfixe data:
      let mimeType = 'image/jpeg'; // Défaut
      let cleanBase64 = imageBase64;
      
      if (imageBase64.startsWith('data:')) {
        // Format: data:image/jpeg;base64,/9j/4AAQ...
        const matches = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          cleanBase64 = matches[2];
        } else {
          // Fallback: juste enlever le préfixe data:...,
          const commaIndex = imageBase64.indexOf(',');
          if (commaIndex > 0) {
            const prefix = imageBase64.substring(0, commaIndex);
            cleanBase64 = imageBase64.substring(commaIndex + 1);
            // Essayer d'extraire le mimeType du préfixe
            const mimeMatch = prefix.match(/data:([^;,]+)/);
            if (mimeMatch) {
              mimeType = mimeMatch[1];
            }
          }
        }
      }
      
      console.log('[useAIMeasure] Préparation requête:', { 
        mimeType, 
        base64Length: cleanBase64.length,
        measureKeys: config.measureKeys 
      });
      
      const measureEngine = (import.meta.env.VITE_AI_MEASURE_ENGINE || 'gemini').toLowerCase();

      // Préparer la requête avec les champs attendus par l'API
      const commonMappings = config.mappings.map(m => ({
        measureKey: m.measureKey,
        targetFieldId: m.targetFieldId,
        transform: m.transform || 'none',
        unit: m.unit
      }));

      const requestBody = {
        imageBase64: cleanBase64,
        mimeType,
        prompt: config.prompt,
        measureKeys: config.measureKeys,
        mappings: commonMappings,
        fieldMappings
      };

      const visionPayload = {
        imageBase64: cleanBase64,
        mimeType,
        measureKeys: config.measureKeys,
        mappings: commonMappings,
        referenceHint: options.visionOptions?.referenceHint,
        deviceInfo: options.visionOptions?.deviceInfo,
        exif: options.visionOptions?.exif,
        persist: options.visionOptions?.persist,
        prompt: config.prompt
      };

      const response = measureEngine === 'vision_ar'
        ? await api.post('/api/measurement-reference/ultra-fusion-detect', {
            photos: [
              {
                base64: cleanBase64,
                mimeType,
                metadata: {
                  deviceInfo: options.visionOptions?.deviceInfo,
                  exif: options.visionOptions?.exif
                }
              }
            ]
          })
        : await api.post('/api/ai/measure-image', requestBody);
      
      if (!response || !response.success) {
        throw new Error(response?.error || 'Erreur lors de l\'analyse');
      }

      // Pour vision_ar, on peut avoir une détection sans mesures (l'utilisateur les fera manuellement)
      const isVisionAR = measureEngine === 'vision_ar';
      const detected = isVisionAR ? response?.success === true : true;

      const normalizedVisionResponse = isVisionAR
        ? {
            ...response,
            detected,
            marker: {
              referenceCentersMm: response?.referenceCentersMm,
              sheetSizeMm: response?.sheetSizeMm
            },
            homography: response?.homographyMatrix
              ? { matrix: response.homographyMatrix, quality: response?.bestPhoto?.score ?? 0 }
              : null,
            calibration: { pixelPerCm: null },
            pose: null
          }
        : response;

      const result: AIMeasureResult = {
        success: true,
        measures: normalizedVisionResponse.measurements || normalizedVisionResponse.measures || {},
        confidence: normalizedVisionResponse.confidence ?? normalizedVisionResponse?.homography?.quality ?? (detected ? 80 : 0),
        rawResponse: normalizedVisionResponse.rawResponse || JSON.stringify(normalizedVisionResponse),
        timestamp: Date.now(),
        // 🆕 Données supplémentaires pour vision_ar
        ...(isVisionAR && {
          detected,
          marker: normalizedVisionResponse.marker,
          homography: normalizedVisionResponse.homography,
          calibration: normalizedVisionResponse.calibration,
          pose: normalizedVisionResponse.pose
        })
      };

      setLastResult(result);
      options.onSuccess?.(result);

      // Notification de succès adaptée
      const notifMessage = isVisionAR && detected
        ? `Métré A4 V10 détecté!`
        : isVisionAR && !detected
        ? 'Métré A4 V10 non détecté - calibration manuelle requise'
        : `${Object.keys(result.measures).length} mesure(s) extraite(s)`;

      notification[detected ? 'success' : 'warning']({
        message: isVisionAR ? 'Analyse Vision AR' : 'Analyse IA terminée',
        description: notifMessage,
        duration: 3
      });

      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMsg);
      setLastResult({
        success: false,
        measures: {},
        error: errorMsg,
        timestamp: Date.now()
      });
      
      options.onError?.(errorMsg);
      
      notification.error({
        message: 'Erreur d\'analyse IA',
        description: errorMsg,
        duration: 5
      });

      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [api, options]);

  /**
   * Appliquer les résultats aux champs cibles
   */
  const applyResults = useCallback((
    result: AIMeasureResult,
    config: AIMeasureConfig,
    updateField: (fieldId: string, value: unknown) => void
  ) => {
    if (!result.success || !result.measures) {
      console.warn('[useAIMeasure] Impossible d\'appliquer les résultats:', result.error);
      return 0;
    }

    let appliedCount = 0;

    for (const mapping of config.mappings) {
      const value = result.measures[mapping.measureKey];
      
      if (value !== undefined && mapping.targetFieldId) {
        let finalValue: number | string = value;

        // Appliquer la transformation si c'est un nombre
        if (typeof finalValue === 'number' && mapping.transform && mapping.transform !== 'none') {
          switch (mapping.transform) {
            case 'round':
              finalValue = Math.round(finalValue);
              break;
            case 'ceil':
              finalValue = Math.ceil(finalValue);
              break;
            case 'floor':
              finalValue = Math.floor(finalValue);
              break;
          }
        }

        // Mettre à jour le champ
        updateField(mapping.targetFieldId, finalValue);
        options.onFieldUpdate?.(mapping.targetFieldId, finalValue);
        appliedCount++;

        console.log(`[useAIMeasure] Champ ${mapping.targetFieldId} mis à jour avec: ${finalValue}`);
      }
    }

    if (appliedCount > 0) {
      message.success(`${appliedCount} champ(s) mis à jour avec les mesures IA`);
    }

    return appliedCount;
  }, [options]);

  /**
   * Vérifier si le service est disponible
   */
  const checkServiceStatus = useCallback(async (): Promise<boolean> => {
    try {
      const response = await api.get('/api/ai/measure-image/status');
      return response?.available === true;
    } catch {
      return false;
    }
  }, [api]);

  /**
   * Réinitialiser l'état
   */
  const reset = useCallback(() => {
    setIsAnalyzing(false);
    setLastResult(null);
    setError(null);
  }, []);

  return {
    // État
    isAnalyzing,
    lastResult,
    error,
    
    // Actions
    analyzeImage,
    applyResults,
    checkServiceStatus,
    reset
  };
}

/**
 * Extraire la configuration aiMeasure d'un champ
 * Supporte les colonnes dédiées (prioritaires) et le fallback metadata
 */
export function getAIMeasureConfig(field: {
  advancedConfig?: Record<string, unknown> | null;
  config?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  // 🔧 NOUVEAU: Colonnes dédiées (prioritaires)
  aiMeasure_enabled?: boolean;
  aiMeasure_autoTrigger?: boolean;
  aiMeasure_prompt?: string;
  aiMeasure_keys?: Array<{
    id: string;
    key: string;
    label: string;
    type: string;
    targetRef?: string;
    targetLabel?: string;
  }>;
}): AIMeasureConfig | null {
  // 🔧 PRIORITÉ 1: Colonnes dédiées
  if (field.aiMeasure_enabled !== undefined) {
    const keys = field.aiMeasure_keys || [];
    
    const config: AIMeasureConfig = {
      enabled: field.aiMeasure_enabled ?? false,
      autoTrigger: field.aiMeasure_autoTrigger ?? true,
      prompt: field.aiMeasure_prompt || '',
      measureKeys: keys.map(k => k.key),
      mappings: keys.map(k => ({
        measureKey: k.key,
        targetFieldId: k.targetRef || '',
        unit: k.type === 'number' ? 'cm' : undefined,
        transform: 'none' as const
      }))
    };
    
    if (!config.enabled) return null;
    return config;
  }
  
  // PRIORITÉ 2: Fallback vers advancedConfig/config (legacy)
  const legacyConfig = field.advancedConfig || field.config;
  if (legacyConfig) {
    const aiMeasure = legacyConfig.aiMeasure as AIMeasureConfig | undefined;
    if (aiMeasure?.enabled) {
      return aiMeasure;
    }
  }
  
  // PRIORITÉ 3: Fallback vers metadata.aiMeasure (legacy)
  const metadata = field.metadata as Record<string, unknown> | null;
  if (metadata?.aiMeasure) {
    const aiMeasure = metadata.aiMeasure as AIMeasureConfig;
    if (aiMeasure?.enabled) {
      return aiMeasure;
    }
  }
  
  return null;
}

/**
 * Vérifier si un champ a la mesure IA activée
 */
export function hasAIMeasureEnabled(field: {
  advancedConfig?: Record<string, unknown> | null;
  config?: Record<string, unknown> | null;
}): boolean {
  const config = getAIMeasureConfig(field);
  return config?.enabled === true;
}

export default useAIMeasure;
