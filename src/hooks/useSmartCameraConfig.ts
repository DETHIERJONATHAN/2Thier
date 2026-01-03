/**
 * 🎯 Hook useSmartCameraConfig
 * 
 * Gère la configuration IA Mesure d'un node TreeBranchLeaf :
 * - Objets de référence (panneaux, onduleurs, etc.)
 * - Paramètres de détection (seuils, nombre de photos, etc.)
 * - Chargement/sauvegarde automatique
 * 
 * @example
 * const { config, saveConfig, loading } = useSmartCameraConfig(nodeId);
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuthenticatedApi } from './useAuthenticatedApi';

export interface ReferenceObject {
  type: string;
  width: number;
  height: number;
  unit: 'm' | 'cm';
  description?: string;
}

export interface DetectionSettings {
  minPhotos: number;
  confidenceThreshold: number;
  useSharp: boolean;
  useFusion: boolean;
}

export interface SmartCameraConfig {
  enabled: boolean;
  referenceObjects: ReferenceObject[];
  detectionSettings: DetectionSettings;
}

const DEFAULT_CONFIG: SmartCameraConfig = {
  enabled: true, // ✅ ACTIVÉ PAR DÉFAUT - Boutons toujours visibles
  referenceObjects: [],
  detectionSettings: {
    minPhotos: 3,
    confidenceThreshold: 0.7,
    useSharp: true,
    useFusion: true
  }
};

export const useSmartCameraConfig = (nodeId: string | undefined) => {
  const { api } = useAuthenticatedApi();
  const [config, setConfig] = useState<SmartCameraConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Charger la configuration depuis l'API
   */
  const loadConfig = useCallback(async () => {
    if (!nodeId) {
      setConfig(DEFAULT_CONFIG);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log(`📊 [useSmartCameraConfig] Chargement config pour node ${nodeId}`);
      
      const data = await api.get(`/api/treebranchleaf/nodes/${nodeId}/ia-config`) as any;
      
      // Fusionner avec config par défaut pour garantir toutes les propriétés
      const mergedConfig: SmartCameraConfig = {
        enabled: data?.enabled ?? DEFAULT_CONFIG.enabled,
        referenceObjects: data?.referenceObjects ?? DEFAULT_CONFIG.referenceObjects,
        detectionSettings: {
          ...DEFAULT_CONFIG.detectionSettings,
          ...(data?.detectionSettings || {})
        }
      };
      
      setConfig(mergedConfig);
      console.log(`✅ [useSmartCameraConfig] Config chargée:`, mergedConfig.referenceObjects.length, 'objets');
    } catch (err) {
      console.error('❌ [useSmartCameraConfig] Erreur chargement:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
      setConfig(DEFAULT_CONFIG);
    } finally {
      setLoading(false);
    }
  }, [nodeId, api]);

  /**
   * Sauvegarder la configuration
   */
  const saveConfig = useCallback(async (newConfig: SmartCameraConfig) => {
    if (!nodeId) {
      console.warn('⚠️ [useSmartCameraConfig] Pas de nodeId, impossible de sauvegarder');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log(`💾 [useSmartCameraConfig] Sauvegarde config pour node ${nodeId}`);
      
      await api.put(`/api/treebranchleaf/nodes/${nodeId}/ia-config`, newConfig);
      
      setConfig(newConfig);
      console.log(`✅ [useSmartCameraConfig] Config sauvegardée avec succès`);
    } catch (err) {
      console.error('❌ [useSmartCameraConfig] Erreur sauvegarde:', err);
      setError(err instanceof Error ? err.message : 'Erreur de sauvegarde');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [nodeId, api]);

  /**
   * Activer/désactiver la config
   */
  const toggleEnabled = useCallback(async () => {
    const newConfig = { ...config, enabled: !config.enabled };
    await saveConfig(newConfig);
  }, [config, saveConfig]);

  /**
   * Ajouter un objet de référence
   */
  const addReferenceObject = useCallback(async (obj: ReferenceObject) => {
    const newConfig = {
      ...config,
      referenceObjects: [...config.referenceObjects, obj]
    };
    await saveConfig(newConfig);
  }, [config, saveConfig]);

  /**
   * Supprimer un objet de référence
   */
  const removeReferenceObject = useCallback(async (index: number) => {
    const newConfig = {
      ...config,
      referenceObjects: config.referenceObjects.filter((_, i) => i !== index)
    };
    await saveConfig(newConfig);
  }, [config, saveConfig]);

  /**
   * Charger au montage et quand nodeId change
   */
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  return {
    config,
    setConfig,
    saveConfig,
    toggleEnabled,
    addReferenceObject,
    removeReferenceObject,
    reloadConfig: loadConfig,
    loading,
    error
  };
};

export default useSmartCameraConfig;
