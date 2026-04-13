/**
 * 🖼️📐 TBLImageFieldWithAI - Champ IMAGE avec analyse IA Gemini Vision
 * 
 * Ce composant gère :
 * - Upload d'image standard
 * - Déclenchement automatique de l'analyse IA si configuré
 * - Extraction des mesures via Gemini Vision
 * - Application des résultats aux champs cibles mappés
 * 
 * @module TBL/components/TBLImageFieldWithAI
 * @author 2Thier CRM Team
 */

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Upload, Button, message, Spin, Space, Tag, Tooltip, Dropdown, Modal } from 'antd';
import type { MenuProps } from 'antd';
import { 
  UploadOutlined, 
  CameraOutlined, 
  RobotOutlined, 
  LoadingOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  FolderOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { useAuth } from '../../../../../auth/useAuth';
import { useAIMeasure, getAIMeasureConfig, type AIMeasureConfig, type AIMeasureResult } from '../../../../../hooks/useAIMeasure';
import { useMobileModalLock } from '../../../../../hooks/useMobileModalLock';
import { useSmartCameraConfig } from '../../../../../hooks/useSmartCameraConfig';
import { useAuthenticatedApi } from '../../../../../hooks/useAuthenticatedApi';
import SmartCameraMobile, { type CapturedPhoto } from '../../../../SmartCamera/SmartCameraMobile';
import { ReferenceObjectsConfig } from '../../../../SmartCamera/ReferenceObjectsConfig';
import { ImageMeasurementPreview } from '../../../../ImageMeasurement/ImageMeasurementPreview';
import ImageWithAnnotationsOverlay from '../../../../ImageMeasurement/ImageWithAnnotationsOverlay';
import type { MeasurementResults, ImageAnnotations } from '../../../../../types/measurement';

// Cache mémoire pour les images annotées (remplace sessionStorage — zéro stockage local)
const imageMemoryCache = new Map<string, string>();

interface TBLImageFieldWithAIProps {
  // Configuration du champ
  nodeId: string;
  metadata?: Record<string, unknown>;
  
  // 🔧 NOUVEAU: Colonnes dédiées AI Measure (prioritaires sur metadata)
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
  
  imageConfig?: {
    formats?: string[];
    maxSize?: number;
    ratio?: string;
    thumbnails?: Record<string, unknown>;
  };
  
  // État et handlers
  value?: string | null;
  onChange: (value: unknown) => void;
  onMeasuresExtracted?: (nodeId: string, measures: Record<string, number | string>) => void;
  
  // Props UI
  disabled?: boolean;
  size?: 'small' | 'middle' | 'large';
  style?: React.CSSProperties;
  
  // Pour appliquer les mesures aux autres champs
  onFieldUpdate?: (fieldId: string, value: unknown) => void;
}

/**
 * Composant de champ IMAGE avec support IA pour l'extraction de mesures
 */
const TBLImageFieldWithAI: React.FC<TBLImageFieldWithAIProps> = React.memo(({
  nodeId,
  metadata = {},
  // Colonnes dédiées AI Measure
  aiMeasure_enabled,
  aiMeasure_autoTrigger,
  aiMeasure_prompt,
  aiMeasure_keys,
  imageConfig = {},
  value,
  onChange,
  onMeasuresExtracted,
  disabled = false,
  size = 'middle',
  style,
  onFieldUpdate
}) => {
  const iconButtonPx = size === 'small' ? 24 : size === 'large' ? 40 : 32;

  // Hook auth pour récupérer l'organizationId
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  const { api } = useAuthenticatedApi();
  const apiInstance = useMemo(() => api, [api]);
  
  // État local pour l'analyse IA
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [lastAIResult, setLastAIResult] = useState<AIMeasureResult | null>(null);
  
  // 🔒 PERSISTANCE MOBILE: Clé unique pour ce champ
  const smartCameraSessionKey = `smartcamera_open_${nodeId}`;
  const annotatedImageStorageKey = `tbl_image_annot_${nodeId}`;
  
  // États pour les modaux SmartCamera - restauration depuis le cache mémoire
  const [showSmartCamera, setShowSmartCamera] = useState(() => {
    if (typeof window !== 'undefined') {
      const wasOpen = imageMemoryCache.get(smartCameraSessionKey);
      if (wasOpen === 'true') {
        console.log('📱 [TBLImageFieldWithAI] Restauration SmartCamera ouvert depuis cache mémoire');
        return true;
      }
    }
    return false;
  });
  const [showReferenceConfig, setShowReferenceConfig] = useState(false);
  
  // 🔒 Persister l'état showSmartCamera dans le cache mémoire
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (showSmartCamera) {
        imageMemoryCache.set(smartCameraSessionKey, 'true');
        console.log('📱 [TBLImageFieldWithAI] SmartCamera ouvert - sauvegardé en mémoire');
      } else {
        imageMemoryCache.delete(smartCameraSessionKey);
      }
    }
  }, [showSmartCamera, smartCameraSessionKey]);
  
  // 🆕 États pour ImageMeasurementPreview (canvas de sélection des lignes)
  const [showMeasurementCanvas, setShowMeasurementCanvas] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [processedImageBase64, setProcessedImageBase64] = useState<string | null>(null);
  const [isFromSmartCapture, setIsFromSmartCapture] = useState(false);
  
  // 🆕 États pour stocker l'image avec annotations et les mesures
  const [annotatedImageUrl, setAnnotatedImageUrl] = useState<string | null>(null);
  const [savedAnnotations, setSavedAnnotations] = useState<ImageAnnotations | null>(null);
  const [savedMeasurements, setSavedMeasurements] = useState<MeasurementResults | null>(null);
  const [isAnalyzingReference, setIsAnalyzingReference] = useState(false);
  const [forceRenderKey, setForceRenderKey] = useState(0); // Force re-render when restoring image
  
  // 🆕 État pour le modal plein écran
  const [showFullscreenImage, setShowFullscreenImage] = useState(false);
  
  // 📷 Photos supplémentaires (appareil normal + upload) - ne touchent PAS au flux IA
  const [additionalPhotos, setAdditionalPhotos] = useState<Array<{ id: string; url: string; type: 'camera' | 'upload'; name: string }>>([]);
  const normalCameraInputRef = useRef<HTMLInputElement>(null);
  const multiUploadInputRef = useRef<HTMLInputElement>(null);

  // 🔒 Cache anti-doublons pour limiter les updates backend inutiles
  const lastAppliedMeasurementsRef = useRef<Record<string, number | string> | null>(null);
  const lastAppliedImageRef = useRef<string | null>(null);
  
  // 🔍 LOG ENTRÉE COMPOSANT
  useEffect(() => {
    const valueSummary = (() => {
      if (value === null) return 'NULL';
      if (value === undefined) return 'UNDEFINED';
      if (typeof value === 'string') {
        if (value.startsWith('data:')) return `data:URL (${(value.length / 1024).toFixed(2)}KB)`;
        return `string (${value.length}chars)`;
      }
      if (typeof value === 'object') {
        const keys = Object.keys(value as unknown);
        return `object {${keys.join(', ')}}`;
      }
      return typeof value;
    })();
    console.log(`📸 [TBLImageFieldWithAI] MOUNTED (nodeId=${nodeId})`);
    console.log(`   value: ${valueSummary}`);
  }, [nodeId]);
  
  // Refs pour les inputs file (galerie et caméra)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  // 🔒 Hook pour verrouiller les modaux sur mobile (empêcher sortie accidentelle)
  const handleAttemptClose = useCallback(() => {
    message.warning('⚠️ Utilisez le bouton "Annuler" ou "✕" pour fermer', 2);
  }, []);
  
  // 📱 Détection mobile pour rendu optimal
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth <= 768;
    return hasTouch || isSmallScreen;
  });

  useEffect(() => {
    const checkMobile = () => {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 768;
      setIsMobile(hasTouch || isSmallScreen);
    };
    
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const smartCameraLock = useMobileModalLock({
    isOpen: showSmartCamera,
    onAttemptClose: handleAttemptClose
  });
  
  // 🔧 SUPPRIMÉ: Le lock pour measurementCanvas n'est plus nécessaire
  // car ImageMeasurementPreview gère son propre affichage fullscreen sur mobile
  // et MobileFullscreenCanvas verrouille déjà le body
  
  // Hook pour l'analyse IA
  const { analyzeImage, applyResults } = useAIMeasure({
    onSuccess: (result) => {
      setLastAIResult(result);
      console.log('[TBLImageFieldWithAI] Analyse IA réussie:', result);
    },
    onError: (error) => {
      console.error('[TBLImageFieldWithAI] Erreur analyse IA:', error);
    }
  });
  
  // Hook pour la config SmartCamera (stabilisé pour éviter re-renders)
  const smartCameraHook = useSmartCameraConfig(nodeId);
  const smartConfig = useMemo(() => smartCameraHook.config, [smartCameraHook.config]);
  
  // 🔧 NOUVEAU: Récupérer la config AI depuis les colonnes dédiées OU metadata (fallback)
  const aiConfig = useMemo(() => getAIMeasureConfig({ 
    metadata,
    // Colonnes dédiées (prioritaires)
    aiMeasure_enabled,
    aiMeasure_autoTrigger,
    aiMeasure_prompt,
    aiMeasure_keys
  }), [metadata, aiMeasure_enabled, aiMeasure_autoTrigger, aiMeasure_prompt, aiMeasure_keys]);
  const isAIEnabled = aiConfig?.enabled === true;
  const autoTrigger = aiConfig?.autoTrigger !== false; // true par défaut si AI activé
  
  // Configuration image
  const acceptedFormats = Array.isArray(imageConfig.formats) && imageConfig.formats.length > 0
    ? imageConfig.formats.map(fmt => (fmt.startsWith('.') ? fmt : `.${fmt.toLowerCase()}`))
    : undefined;
  const imageAccept = acceptedFormats && acceptedFormats.length > 0 ? acceptedFormats.join(',') : 'image/*';
  const maxImageSizeBytes = imageConfig.maxSize ? imageConfig.maxSize * 1024 * 1024 : undefined;
  const enforcedRatio = imageConfig.ratio;
  const imageThumbnails = imageConfig.thumbnails;

  /**
   * Déclencher l'analyse IA sur l'image uploadée
   */
  const triggerAIAnalysis = useCallback(async (imageBase64: string) => {
    if (!isAIEnabled || !aiConfig) {
      console.log('[TBLImageFieldWithAI] IA désactivée ou non configurée');
      return;
    }
    
    setIsAnalyzingAI(true);
    
    try {
      const result = await analyzeImage(imageBase64, aiConfig);
      
      if (result?.success && result.measures) {
        // Notifier le parent des mesures extraites
        onMeasuresExtracted?.(nodeId, result.measures);
        
        // Appliquer les résultats aux champs mappés
        if (onFieldUpdate && aiConfig.mappings) {
          aiConfig.mappings.forEach(mapping => {
            const measureValue = result.measures[mapping.measureKey];
            if (measureValue !== undefined && mapping.targetFieldId) {
              // Appliquer la transformation si nécessaire
              let finalValue: number | string = measureValue;
              if (typeof finalValue === 'number' && mapping.transform && mapping.transform !== 'none') {
                switch (mapping.transform) {
                  case 'round': finalValue = Math.round(finalValue); break;
                  case 'ceil': finalValue = Math.ceil(finalValue); break;
                  case 'floor': finalValue = Math.floor(finalValue); break;
                }
              }
              onFieldUpdate(mapping.targetFieldId, finalValue);
            }
          });
        }
        
        message.success(`📐 ${Object.keys(result.measures).length} mesure(s) extraite(s) par l'IA`);
      }
    } catch (error) {
      console.error('[TBLImageFieldWithAI] Erreur lors de l\'analyse:', error);
      message.error('Erreur lors de l\'analyse IA de l\'image');
    } finally {
      setIsAnalyzingAI(false);
    }
  }, [isAIEnabled, aiConfig, analyzeImage, onMeasuresExtracted, onFieldUpdate, nodeId]);

  /**
   * Handler de changement d'image avec déclenchement IA optionnel
   */
  const handleImageChange = useCallback((info: unknown) => {
    if (info.fileList.length > 0) {
      const file = info.fileList[0];
      if (file.originFileObj) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          let imageData: unknown = e.target?.result;
          
          // Traiter les thumbnails si configurés
          if (imageThumbnails && typeof imageThumbnails === 'object') {
            imageData = {
              original: e.target?.result,
              thumbnails: imageThumbnails,
            };
          }
          
          // Mettre à jour la valeur du champ
          onChange(imageData);
          
          // Déclencher l'analyse IA si activée et auto-trigger
          if (isAIEnabled && autoTrigger && typeof e.target?.result === 'string') {
            // Petit délai pour laisser le temps à l'UI de se mettre à jour
            setTimeout(() => {
              triggerAIAnalysis(e.target?.result as string);
            }, 100);
          }
        };
        reader.readAsDataURL(file.originFileObj);
      }
    } else {
      onChange(null);
      setLastAIResult(null);
    }
  }, [onChange, imageThumbnails, isAIEnabled, autoTrigger, triggerAIAnalysis]);

  /**
   * Handler pour l'analyse manuelle
   */
  const handleManualAnalysis = useCallback(() => {
    if (value && typeof value === 'string') {
      triggerAIAnalysis(value);
    } else {
      message.warning('Veuillez d\'abord charger une image');
    }
  }, [value, triggerAIAnalysis]);

  /**
   * Handler pour les fichiers depuis input natif (caméra ou galerie)
   * 🔥 NOUVEAU: Utilise le même traitement Métré A4 V10 que SmartCamera pour les mesures
   */
  const handleNativeFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validation taille
    if (maxImageSizeBytes && file.size > maxImageSizeBytes) {
      message.error(`Image trop lourde (max ${imageConfig.maxSize} Mo).`);
      return;
    }
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageDataUrl = e.target?.result as string;
      if (!imageDataUrl) return;
      
      // 🔥 NOUVEAU: Si on a des clés de mesure (aiMeasure_keys), utiliser le même traitement que SmartCamera
      if (aiMeasure_keys && aiMeasure_keys.length > 0) {
        console.log('[TBLImageFieldWithAI] 🔥 Upload avec traitement Métré A4 V10 (même que SmartCamera)');

        // ✅ Sauvegarder tout de suite la photo dans le brouillon/lead
        if (lastAppliedImageRef.current !== imageDataUrl) {
          onChange(imageDataUrl);
          lastAppliedImageRef.current = imageDataUrl;
        }
        
        // Simuler un CapturedPhoto pour réutiliser handleSmartCapture
        const fakePhoto: CapturedPhoto = {
          imageBase64: imageDataUrl,
          timestamp: Date.now(),
          metadata: {
            gyroscope: { beta: 85, gamma: 0 },
            qualityScore: 80,
            sharpness: 50
          }
        };
        
        // Utiliser le même flux que SmartCamera
        setIsAnalyzingReference(true);
        message.loading({ content: '🔬 Analyse Métré A4 V10 en cours... Patientez', key: 'ultra-fusion', duration: 0 });
        
        try {
          const base64Part = imageDataUrl.includes(',') ? imageDataUrl.split(',')[1] : imageDataUrl;
          
          const photosForFusion = [{
            base64: base64Part,
            mimeType: 'image/jpeg',
            metadata: fakePhoto.metadata
          }];
          
          if (!apiInstance) {
            throw new Error('API authentifiée indisponible');
          }

          const result = await apiInstance.post('/api/measurement-reference/ultra-fusion-detect', {
            photos: photosForFusion,
            // 📸 Envoyer userAgent pour calcul précis de la focale
            userAgent: navigator.userAgent
          });
          
          if (result.success && result.fusedCorners) {
            console.log('[TBLImageFieldWithAI] ✅ Analyse Métré A4 V10 terminée (upload)!');

            if (result.fallbackMode === 'largeTagOnly') {
              message.warning({
                content: '⚠️ Grand tag seul détecté - précision dégradée',
                key: 'ultra-fusion'
              });
            } else {
              message.success({ 
                content: '🎯 Métré A4 V10 détecté!', 
                key: 'ultra-fusion' 
              });
            }

            // Utiliser l'image d'origine (pas la fusionnée car une seule photo)
            setProcessedImageUrl(imageDataUrl);
            setProcessedImageBase64(base64Part);
            setIsFromSmartCapture(true);
            
            // Créer les photos enrichies
            const enrichedPhotos = [{
              imageBase64: base64Part,
              mimeType: 'image/jpeg',
              metadata: {
                ...fakePhoto.metadata,
                qualityScore: result.bestPhoto?.score * 100 || 80,
                sharpness: 80,
                referenceDetected: true,
                fusedCorners: result.fusedCorners,
                fallbackMode: result.fallbackMode || null,
                homography: null
              }
            }];
            
            setCapturedPhotos(enrichedPhotos as unknown);
            setIsAnalyzingReference(false);
            setShowMeasurementCanvas(true);
            
          } else {
            // Référence non détectée - ouvrir le canvas quand même
            console.log('[TBLImageFieldWithAI] ⚠️ Métré A4 V10 non détecté (upload)');
            message.warning({ 
              content: '⚠️ Métré A4 V10 non détecté - Calibration manuelle', 
              key: 'ultra-fusion' 
            });
            
            const base64Part = imageDataUrl.includes(',') ? imageDataUrl.split(',')[1] : imageDataUrl;
            setProcessedImageUrl(imageDataUrl);
            setProcessedImageBase64(base64Part);
            setIsFromSmartCapture(true);
            setCapturedPhotos([fakePhoto]);
            
            setIsAnalyzingReference(false);
            setShowMeasurementCanvas(true);
          }
          
        } catch (error: unknown) {
          console.error('[TBLImageFieldWithAI] ❌ Erreur analyse Métré A4 V10 (upload):', error);
          message.warning({ content: `Erreur: ${error.message}`, key: 'ultra-fusion' });
          
          const base64Part = imageDataUrl.includes(',') ? imageDataUrl.split(',')[1] : imageDataUrl;
          setProcessedImageUrl(imageDataUrl);
          setProcessedImageBase64(base64Part);
          setIsFromSmartCapture(true);
          setCapturedPhotos([fakePhoto]);
          
          setIsAnalyzingReference(false);
          setShowMeasurementCanvas(true);
        }
        
      } else {
        // 📷 Mode classique (pas de mesure) - comportement original
        let imageData: unknown = imageDataUrl;
        
        // Traiter les thumbnails si configurés
        if (imageThumbnails && typeof imageThumbnails === 'object') {
          imageData = {
            original: imageDataUrl,
            thumbnails: imageThumbnails,
          };
        }
        
        // Mettre à jour la valeur du champ
        onChange(imageData);
        
        // Déclencher l'analyse IA si activée et auto-trigger
        if (isAIEnabled && autoTrigger) {
          setTimeout(() => {
            triggerAIAnalysis(imageDataUrl);
          }, 100);
        }
      }
    };
    reader.readAsDataURL(file);
    
    // Reset l'input pour permettre de rechoisir le même fichier
    event.target.value = '';
  }, [onChange, imageThumbnails, isAIEnabled, autoTrigger, triggerAIAnalysis, maxImageSizeBytes, imageConfig.maxSize, aiMeasure_keys, apiInstance]);

  /**
   * Ouvrir la galerie
   */
  const openGallery = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * Ouvrir la caméra directement (IA)
   */
  const openCamera = useCallback(() => {
    cameraInputRef.current?.click();
  }, []);

  /**
   * 📷 Appareil photo NORMAL (sans IA) - sauvegarde directe
   */
  const handleNormalCameraCapture = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (maxImageSizeBytes && file.size > maxImageSizeBytes) {
      message.error(`Image trop lourde (max ${imageConfig.maxSize} Mo).`);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) return;
      const newPhoto = {
        id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        url: dataUrl,
        type: 'camera' as const,
        name: `Photo ${new Date().toLocaleTimeString('fr-BE')}`
      };
      setAdditionalPhotos(prev => [...prev, newPhoto]);
      message.success('📷 Photo ajoutée');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }, [maxImageSizeBytes, imageConfig.maxSize]);

  /**
   * 📁 Upload multiple de photos (sans IA)
   */
  const handleMultiUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      if (maxImageSizeBytes && file.size > maxImageSizeBytes) {
        message.error(`${file.name} trop lourde (max ${imageConfig.maxSize} Mo).`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (!dataUrl) return;
        const newPhoto = {
          id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          url: dataUrl,
          type: 'upload' as const,
          name: file.name
        };
        setAdditionalPhotos(prev => [...prev, newPhoto]);
      };
      reader.readAsDataURL(file);
    });
    message.success(`📁 ${files.length} photo(s) chargée(s)`);
    event.target.value = '';
  }, [maxImageSizeBytes, imageConfig.maxSize]);

  /**
   * 🗑️ Supprimer une photo supplémentaire
   */
  const removeAdditionalPhoto = useCallback((photoId: string) => {
    setAdditionalPhotos(prev => prev.filter(p => p.id !== photoId));
  }, []);
  
  /**
   * 🔥 Handler pour le SmartCamera (capture multi-photos)
   */
  const handleSmartCapture = useCallback(async (photos: CapturedPhoto[]) => {
    console.log('[TBLImageFieldWithAI] 📸 Capture IA:', photos.length, 'photos');

    if (photos.length === 0) {
      message.error('Aucune photo capturée');
      setShowSmartCamera(false);
      return;
    }

    // Fermer SmartCamera
    setShowSmartCamera(false);

    // Montrer l'état d'attente
    setIsAnalyzingReference(true);
    message.loading({ content: '🔬 Analyse Métré A4 V10 en cours... Patientez', key: 'ultra-fusion', duration: 0 });

    try {
      const photosForFusion = photos
        .filter(p => p.imageBase64 && p.imageBase64.length > 100)
        .map(p => ({
          base64: p.imageBase64?.includes(',') ? p.imageBase64.split(',')[1] : p.imageBase64,
          mimeType: 'image/jpeg',
          metadata: p.metadata
        }));

      if (photosForFusion.length === 0) {
        throw new Error('Aucune photo valide');
      }

      if (!apiInstance) {
        throw new Error('API authentifiée indisponible');
      }

      const result = await apiInstance.post('/api/measurement-reference/ultra-fusion-detect', {
        photos: photosForFusion,
        // 📸 Envoyer userAgent pour calcul précis de la focale par modèle de téléphone
        userAgent: navigator.userAgent
      });

      if (!result?.success) {
        throw new Error(result?.error || 'Analyse échouée');
      }

      const bestPhotoIndex = result.bestPhoto?.index ?? 0;
      const bestPhotoBase64 = result.bestPhotoBase64
        || (photos[bestPhotoIndex]?.imageBase64?.includes(',')
          ? photos[bestPhotoIndex].imageBase64.split(',')[1]
          : photos[bestPhotoIndex]?.imageBase64)
        || '';
      const bestImage = bestPhotoBase64.startsWith('data:')
        ? bestPhotoBase64
        : `data:image/jpeg;base64,${bestPhotoBase64}`;

      setProcessedImageUrl(bestImage);
      setProcessedImageBase64(bestPhotoBase64);
      setIsFromSmartCapture(true);

      // ✅ Sauvegarder tout de suite la meilleure photo dans le brouillon/lead
      if (lastAppliedImageRef.current !== bestImage) {
        onChange(bestImage);
        lastAppliedImageRef.current = bestImage;
      }

      const enrichedPhotos = photos.map((photo, idx) => {
        const base64 = idx === bestPhotoIndex && result.bestPhotoBase64
          ? result.bestPhotoBase64
          : photo.imageBase64?.includes(',')
            ? photo.imageBase64.split(',')[1]
            : photo.imageBase64 || '';

        return {
          imageBase64: base64,
          mimeType: 'image/jpeg',
          metadata: {
            ...photo.metadata,
            qualityScore: result.allPhotoScores?.find((d: Record<string, unknown>) => d.index === idx)?.score || photo.metadata?.qualityScore || 85,
            sharpness: photo.metadata?.sharpness || 85,
            referenceDetected: idx === bestPhotoIndex && !!result.fusedCorners,
            fusedCorners: idx === bestPhotoIndex ? result.fusedCorners : null,
            homography: null
          }
        };
      });

      setCapturedPhotos(enrichedPhotos as unknown);

      if (result.fusedCorners) {
        if (result.fallbackMode === 'largeTagOnly') {
          message.warning({
            content: '⚠️ Grand tag seul détecté - précision dégradée (ouverture du canvas)',
            key: 'ultra-fusion'
          });
        } else {
          message.success({
            content: '🎯 Métré A4 V10 détecté! Ouverture du canvas...',
            key: 'ultra-fusion'
          });
        }
      } else {
        message.warning({
          content: '⚠️ Métré A4 V10 non détecté - Calibration manuelle',
          key: 'ultra-fusion'
        });
      }

      setIsAnalyzingReference(false);
      setShowMeasurementCanvas(true);
    } catch (error: unknown) {
      console.error('[TBLImageFieldWithAI] ❌ Erreur analyse Métré A4 V10:', error);
      message.warning({ content: `Erreur: ${error.message}`, key: 'ultra-fusion' });

      // En cas d'erreur, ouvrir le canvas quand même
      const firstPhoto = photos[0]?.imageBase64 || '';
      const base64Part = firstPhoto.includes(',') ? firstPhoto.split(',')[1] : firstPhoto;
      setProcessedImageUrl(firstPhoto.startsWith('data:') ? firstPhoto : `data:image/jpeg;base64,${base64Part}`);
      setProcessedImageBase64(base64Part);
      setIsFromSmartCapture(true);
      setCapturedPhotos(photos);

      setIsAnalyzingReference(false);
      setShowMeasurementCanvas(true);
    }
  }, [apiInstance, onChange]);

  /**
   * 🆕 Handler pour la validation des mesures depuis ImageMeasurementCanvas
   * Sauvegarde l'image AVEC les annotations pour pouvoir la revoir
   */
  const handleMeasurementsComplete = useCallback((measurements: MeasurementResults, annotations?: ImageAnnotations) => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('[TBLImageFieldWithAI] 🎯 HANDLER MEASUREMENTS COMPLETE APPELÉ');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('[TBLImageFieldWithAI] 📐 Mesures extraites:', measurements);
    console.log('[TBLImageFieldWithAI] 🎯 Annotations reçues:', annotations ? {
      hasReferenceCorners: !!annotations.referenceCorners,
      hasImageDimensions: !!annotations.imageDimensions,
      hasMeasurementPoints: annotations.measurementPoints?.length || 0
    } : 'null');
    
    // 🆕 Sauvegarder les annotations et mesures pour pouvoir les revoir
    setSavedAnnotations(annotations || null);
    setSavedMeasurements(measurements);
    
    // ✅ Remplacer l'image par la version annotée si disponible
    const nextAnnotatedImageUrl = annotations?.annotatedImageUrl || null;
    const nextImageValue = nextAnnotatedImageUrl || processedImageUrl;

    if (nextImageValue) {
      setAnnotatedImageUrl(nextAnnotatedImageUrl || processedImageUrl);
      
      // 🔒 Cache mémoire pour l'image annotée (zéro stockage local)
      const imageToStore = nextAnnotatedImageUrl || nextImageValue;
      try {
        const storageKey = annotatedImageStorageKey;
        const imageSize = imageToStore?.length || 0;
        console.log('[TBLImageFieldWithAI] 💾 SAVE cache mémoire');
        console.log(`   Clé: ${storageKey}`);
        console.log(`   Taille image: ${(imageSize / 1024).toFixed(2)}KB`);
        
        imageMemoryCache.set(storageKey, imageToStore);
        console.log(`   ✅ Vérification: SAUVEGARDÉE`);
        
        // 🔄 Si ce nœud est dupliqué (suffixe -1, -2, etc.), sauvegarder AUSSI dans le nœud original
        if (nodeId.match(/-\d+$/)) {
          const originalNodeId = nodeId.replace(/-\d+$/, '');
          const originalStorageKey = `tbl_image_annot_${originalNodeId}`;
          imageMemoryCache.set(originalStorageKey, imageToStore);
          console.log(`   🔄 SYNC ORIGINAL: ${originalStorageKey}`);
        }
      } catch (err) {
        console.error('[TBLImageFieldWithAI] ❌ ERREUR cache mémoire:', err);
      }
      
      // 🔧 Envoyer au backend
      const persistedValue = {
        annotated: nextAnnotatedImageUrl || nextImageValue,
        original: processedImageUrl || nextImageValue
      };
      const serializedKey = JSON.stringify(persistedValue);

      if (lastAppliedImageRef.current !== serializedKey) {
        onChange(persistedValue);
        lastAppliedImageRef.current = serializedKey;
      }
    }
    
    // Appliquer les mesures aux champs mappés
    if (aiMeasure_keys && onFieldUpdate) {
      let appliedCount = 0;
      const nextApplied: Record<string, number | string> = {
        ...(lastAppliedMeasurementsRef.current || {})
      };

      // 🔄 DÉTECTION DU SUFFIXE DE DUPLICATION
      // Si le champ source (Photo du mur) est dupliqué (Photo du mur-1, Photo du mur-2...),
      // on doit appliquer les mesures aux champs cibles avec le même suffixe
      const suffixMatch = nodeId.match(/-(\d+)$/);
      const duplicateSuffix = suffixMatch ? suffixMatch[0] : ''; // "-1", "-2", etc. ou ""
      
      console.log(`[TBLImageFieldWithAI] 🔄 Détection duplication: nodeId="${nodeId}", suffixe="${duplicateSuffix}"`);

      aiMeasure_keys.forEach(mapping => {
        // Accéder à la mesure par clé (string index)
        let measureValue = measurements[mapping.key as keyof MeasurementResults];
        if (measureValue !== undefined && mapping.targetRef) {
          // 📏 CONVERSION CM → MÈTRES pour les dimensions
          // Les mesures sont stockées en cm dans measurements, mais on les applique en mètres
          if (typeof measureValue === 'number' && (mapping.key.includes('largeur') || mapping.key.includes('hauteur'))) {
            measureValue = measureValue / 100; // Convertir cm en mètres
          }
          
          // 🎯 AJOUT DU SUFFIXE AU CHAMP CIBLE
          // Si ce champ est dupliqué (-1, -2...), ajouter le même suffixe au targetRef
          const actualTargetRef = duplicateSuffix 
            ? `${mapping.targetRef}${duplicateSuffix}` 
            : mapping.targetRef;
          
          const prevValue = lastAppliedMeasurementsRef.current?.[actualTargetRef];
          const hasChanged = typeof measureValue === 'number'
            ? (typeof prevValue !== 'number' || Math.abs(prevValue - measureValue) > 0.001)
            : prevValue !== measureValue;

          if (hasChanged) {
            console.log(`[TBLImageFieldWithAI] Application: ${mapping.key} = ${measureValue} → ${actualTargetRef}${duplicateSuffix ? ` (original: ${mapping.targetRef})` : ''}`);
            onFieldUpdate(actualTargetRef, measureValue);
            nextApplied[actualTargetRef] = measureValue as number | string;
            appliedCount++;
          }
        }
      });

      if (appliedCount > 0) {
        lastAppliedMeasurementsRef.current = nextApplied;
      }
      
      if (appliedCount > 0) {
        message.success(`📐 ${appliedCount} mesure(s) appliquée(s) aux champs${duplicateSuffix ? ` ${duplicateSuffix}` : ''} !`);
      }
    }
    
    // Fermer le canvas
    setShowMeasurementCanvas(false);
  }, [processedImageUrl, onChange, aiMeasure_keys, onFieldUpdate]);

  // Copier l'image annotée si ce nœud a été dupliqué (le nouveau nodeId n'a pas de cache)
  useEffect(() => {
    console.log(`[TBLImageFieldWithAI] 🔍 CHECK duplication (nodeId=${nodeId})`);
    
    // Ne chercher que SI la clé courante est vide
    const existing = imageMemoryCache.get(annotatedImageStorageKey);
    if (existing) {
      console.log('[TBLImageFieldWithAI] ✅ Image déjà présente pour ce nodeId, skip');
      return;
    }

    // Chercher toutes les clés tbl_image_annot_* et trouver la plus grande (probablement l'originale)
    const imageKeys: Array<{ key: string; size: number }> = [];
    for (const [key, val] of imageMemoryCache.entries()) {
      if (key.startsWith('tbl_image_annot_') && val) {
        imageKeys.push({ key, size: val.length });
      }
    }

    // Si on trouve UNE SEULE autre image (probable nœud original), la copier
    if (imageKeys.length === 1) {
      const sourceKey = imageKeys[0].key;
      const sourceValue = imageMemoryCache.get(sourceKey);
      
      if (sourceValue && sourceValue.length > 10000) {
        console.log(`[TBLImageFieldWithAI] 🔄 DUPLICATION DÉTECTÉE!`);
        console.log(`   Source: ${sourceKey} (${(sourceValue.length / 1024).toFixed(2)}KB)`);
        console.log(`   Destination: ${annotatedImageStorageKey}`);
        
        imageMemoryCache.set(annotatedImageStorageKey, sourceValue);
        console.log(`   ✅ Image copiée avec succès!`);
        setAnnotatedImageUrl(sourceValue);
        setForceRenderKey(k => k + 1);
      }
    }
  }, [nodeId, annotatedImageStorageKey]);

  // 📥 Hydrater l'image annotée depuis le cache mémoire dès que value change
  useEffect(() => {
    console.log('[TBLImageFieldWithAI] 📥 Hydrate effect START');
    console.log(`   value type: ${typeof value}`);
    console.log(`   annotatedImageStorageKey: ${annotatedImageStorageKey}`);

    // Priority: cache mémoire > value.annotated > value.original > value string
    let nextAnnotated: string | null = null;
    
    const fromCache = imageMemoryCache.get(annotatedImageStorageKey);
    if (fromCache) {
      nextAnnotated = fromCache;
      console.log('[TBLImageFieldWithAI] ✅ Image annotée restaurée depuis cache mémoire');
      console.log(`   Taille: ${(fromCache.length / 1024).toFixed(2)}KB`);
    } else {
      console.log('[TBLImageFieldWithAI] ⚠️ Cache mémoire vide pour cette clé');
    }

    // Si pas en cache, fallback sur value (objet ou string)
    if (!nextAnnotated) {
      console.log('[TBLImageFieldWithAI] 📥 Fallback sur value...');
      const annotatedFromValue = typeof value === 'object' ? (value as unknown)?.annotated : undefined;
      const originalFromValue = typeof value === 'object' ? (value as unknown)?.original : undefined;
      nextAnnotated = annotatedFromValue || (typeof value === 'string' ? value : originalFromValue);
      if (annotatedFromValue) console.log('[TBLImageFieldWithAI] ✅ Utilise value.annotated');
      else if (typeof value === 'string') console.log('[TBLImageFieldWithAI] ✅ Utilise value (string)');
      else if (originalFromValue) console.log('[TBLImageFieldWithAI] ✅ Utilise value.original');
    }

    if (nextAnnotated) {
      console.log('[TBLImageFieldWithAI] 📥 setAnnotatedImageUrl appelé avec image restaurée');
      console.log(`   Current state: ${annotatedImageUrl?.substring(0, 50)}`);
      console.log(`   New value: ${nextAnnotated.substring(0, 50)}`);
      
      setAnnotatedImageUrl(prev => {
        if (prev === nextAnnotated) {
          console.log('[TBLImageFieldWithAI] 🔄 Image identique, forçage du re-render via key');
          setForceRenderKey(k => k + 1);
        }
        return nextAnnotated;
      });
    } else {
      console.log(`[TBLImageFieldWithAI] ⚠️ Pas d'image à restaurer`);
    }
  }, [value, annotatedImageStorageKey]);

  // Restaurer l'image annotée si le backend ne la renvoie pas
  useEffect(() => {
    if (annotatedImageUrl || value) return;
    const stored = imageMemoryCache.get(annotatedImageStorageKey);
    if (stored) {
      setAnnotatedImageUrl(stored);
    }
  }, [annotatedImageUrl, value, annotatedImageStorageKey]);

  /**
   * 🆕 Handler pour l'annulation du canvas de mesure
   */
  const handleMeasurementCancel = useCallback(() => {
    console.log('[TBLImageFieldWithAI] Canvas de mesure annulé');
    setShowMeasurementCanvas(false);
    // Optionnel: réouvrir SmartCamera si l'utilisateur veut reprendre des photos
  }, []);

  /**
   * Menu dropdown pour choisir entre galerie et caméra
   */
  const uploadMenuItems: MenuProps['items'] = [
    {
      key: 'gallery',
      icon: <PictureOutlined />,
      label: 'Galerie photos',
      onClick: openGallery
    },
    {
      key: 'camera',
      icon: <VideoCameraOutlined />,
      label: 'Photo',
      onClick: openCamera
    }
  ];

  return (
    <div className="tbl-image-field-with-ai">
      {/* Inputs file cachés (hors Space sinon ça ajoute un décalage vertical) */}
      <input
        ref={fileInputRef}
        type="file"
        accept={imageAccept}
        onChange={handleNativeFileChange}
        style={{ display: 'none' }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleNativeFileChange}
        style={{ display: 'none' }}
      />
      {/* 📷 Input caméra NORMALE (sans IA) */}
      <input
        ref={normalCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleNormalCameraCapture}
        style={{ display: 'none' }}
      />
      {/* 📁 Input upload MULTIPLE (sans IA) */}
      <input
        ref={multiUploadInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleMultiUpload}
        style={{ display: 'none' }}
      />

      <Space direction="vertical" style={{ width: '100%' }} size={8}>
        {/* Boutons d'action - 3 icônes : Photo | IA | Dossier + Mesure */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }}>
          {aiMeasure_enabled && (
            <>
              {/* 📷 Photo normale (appareil) */}
              <Tooltip title="Photo (appareil)">
                <Button
                  icon={<CameraOutlined />}
                  onClick={() => normalCameraInputRef.current?.click()}
                  disabled={disabled || isAnalyzingAI}
                  size={size}
                  type="default"
                  style={{
                    borderColor: '#1677ff',
                    color: '#1677ff',
                    width: iconButtonPx,
                    height: iconButtonPx,
                    minWidth: iconButtonPx,
                    padding: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  aria-label="Photo normale"
                />
              </Tooltip>

              {/* 🤖 Photo IA */}
              <Tooltip title="Photo IA (analyse + mesures)">
                <Button
                  icon={<RobotOutlined />}
                  onClick={openCamera}
                  disabled={disabled || isAnalyzingAI}
                  size={size}
                  type="primary"
                  style={{
                    background: '#722ed1',
                    borderColor: '#722ed1',
                    width: iconButtonPx,
                    height: iconButtonPx,
                    minWidth: iconButtonPx,
                    padding: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  aria-label="Photo IA"
                />
              </Tooltip>

              {/* 📂 Charger depuis dossier */}
              <Tooltip title="Charger des photos">
                <Button
                  icon={<FolderOutlined />}
                  onClick={() => multiUploadInputRef.current?.click()}
                  disabled={disabled || isAnalyzingAI}
                  size={size}
                  type="default"
                  style={{
                    borderColor: '#52c41a',
                    color: '#52c41a',
                    width: iconButtonPx,
                    height: iconButtonPx,
                    minWidth: iconButtonPx,
                    padding: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  aria-label="Charger photos"
                />
              </Tooltip>
              
              {/* 📐 Bouton "Mesurer" - Réutiliser les photos capturées (existant) */}
              {capturedPhotos.length > 0 && (
                <Tooltip title="📐 Revoir l'analyse Métré A4 V10">
                  <Button
                    icon={<CheckCircleOutlined />}
                    onClick={() => {
                      const bestPhoto = capturedPhotos.find(p => (p.metadata as unknown)?.referenceDetected || (p.metadata as unknown)?.fusedCorners);
                      const photoToUse = bestPhoto || capturedPhotos[0];
                      
                      const base64 = photoToUse.imageBase64?.includes(',') 
                        ? photoToUse.imageBase64.split(',')[1] 
                        : photoToUse.imageBase64 || '';
                      
                      setProcessedImageUrl(
                        photoToUse.imageBase64?.startsWith('data:') 
                          ? photoToUse.imageBase64 
                          : `data:image/jpeg;base64,${base64}`
                      );
                      setProcessedImageBase64(base64);
                      setIsFromSmartCapture(true);
                      
                      console.log('[TBLImageFieldWithAI] 📐 Revoir analyse Métré A4 V10:', {
                        totalPhotos: capturedPhotos.length,
                        bestPhotoHasReference: !!(bestPhoto?.metadata as unknown)?.referenceDetected,
                        hasFusedCorners: !!(bestPhoto?.metadata as unknown)?.fusedCorners
                      });
                      
                      setShowMeasurementCanvas(true);
                    }}
                    disabled={disabled || isAnalyzingAI}
                    size={size}
                    type="default"
                    style={{ 
                      borderColor: '#52c41a',
                      color: '#52c41a',
                      fontWeight: 'bold',
                      width: iconButtonPx,
                      height: iconButtonPx,
                      padding: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    aria-label="Mesure"
                  />
                </Tooltip>
              )}
            </>
          )}
        </div>

        {/* 📸 Galerie des photos supplémentaires (normal + upload) */}
        {additionalPhotos.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {additionalPhotos.map((photo) => (
              <div
                key={photo.id}
                style={{
                  position: 'relative',
                  width: 72,
                  height: 72,
                  borderRadius: 8,
                  overflow: 'hidden',
                  border: '1px solid #d9d9d9',
                  cursor: 'pointer',
                }}
              >
                <img
                  src={photo.url}
                  alt={photo.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onClick={() => {
                    setShowFullscreenImage(true);
                  }}
                />
                {/* Badge type */}
                <div style={{
                  position: 'absolute',
                  top: 2,
                  left: 2,
                  fontSize: 10,
                  background: photo.type === 'camera' ? '#1677ff' : '#52c41a',
                  color: 'white',
                  borderRadius: 4,
                  padding: '0 3px',
                  lineHeight: '16px',
                }}>
                  {photo.type === 'camera' ? '📷' : '📁'}
                </div>
                {/* Bouton supprimer */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAdditionalPhoto(photo.id);
                  }}
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: 'rgba(255,77,79,0.9)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    cursor: 'pointer',
                    lineHeight: 1,
                  }}
                >
                  ✕
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* 🔬 Indicateur d'analyse Métré A4 V10 en cours */}
        {isAnalyzingReference && (
          <div style={{
            padding: '12px 16px',
            background: 'linear-gradient(90deg, #722ed1, #1890ff)',
            borderRadius: '8px',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            <Spin indicator={<LoadingOutlined style={{ fontSize: 20, color: 'white' }} spin />} />
            <span>🔬 Analyse Métré A4 V10 en cours... Patientez</span>
          </div>
        )}
        
        {/* Aperçu de l'image - CLIQUABLE pour plein écran */}
        {(value || capturedPhotos.length > 0 || annotatedImageUrl) && !isAnalyzingReference && (
          <div 
            style={{ position: 'relative', display: 'inline-block', cursor: 'pointer' }}
            onClick={() => setShowFullscreenImage(true)}
            title="Cliquez pour voir en plein écran"
          >
            {/* 🎯 Afficher la meilleure photo (avec tracés si dispo) */}
            {(() => {
              // Priorité: image annotée (tracés référence/mesure) quand disponible
              const annotatedFromValue = typeof value === 'object' ? (value as unknown)?.annotated : undefined;
              const originalFromValue = typeof value === 'object' ? (value as unknown)?.original : undefined;
              let imgSrc = annotatedImageUrl || annotatedFromValue || (typeof value === 'string' ? value : originalFromValue);
              let hasReference = false;
              
              // Si on a des photos capturées, utiliser celle avec référence
              if (capturedPhotos.length > 0) {
                const bestPhoto = capturedPhotos.find(p => (p.metadata as unknown)?.referenceDetected || (p.metadata as unknown)?.fusedCorners);
                const photoToShow = bestPhoto || capturedPhotos[0];
                hasReference = !!(bestPhoto?.metadata as unknown)?.referenceDetected || !!(bestPhoto?.metadata as unknown)?.fusedCorners;
                
                const base64 = photoToShow.imageBase64;
                imgSrc = imgSrc || (base64?.startsWith('data:') 
                  ? base64 
                  : `data:image/jpeg;base64,${base64}`);
              }
              
              return (
                <>
                  <img 
                    key={`${imgSrc}-${forceRenderKey}`}
                    src={imgSrc}
                    alt="preview" 
                    style={{ 
                      width: '150px', 
                      height: '150px', 
                      objectFit: 'cover', 
                      border: hasReference ? '3px solid #52c41a' : '1px solid #d9d9d9',
                      borderRadius: '8px',
                      opacity: isAnalyzingAI ? 0.5 : 1,
                      transition: 'transform 0.2s',
                    }} 
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  />
                  
                  {/* 🎯 Badge V10 si détecté */}
                  {hasReference && (
                    <div style={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      background: '#52c41a',
                      color: 'white',
                      borderRadius: '50%',
                      width: 28,
                      height: 28,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      fontWeight: 'bold',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                    }}>
                      V10
                    </div>
                  )}
                  
                  {/* 🔍 Icône zoom */}
                  <div style={{
                    position: 'absolute',
                    bottom: 4,
                    left: 4,
                    background: 'rgba(0,0,0,0.6)',
                    color: 'white',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    fontSize: 11
                  }}>
                    🔍 Clic = Zoom
                  </div>
                  
                  {/* 📸 Compteur de photos si plusieurs */}
                  {capturedPhotos.length > 1 && (
                    <div style={{
                      position: 'absolute',
                      bottom: 4,
                      right: 4,
                      background: 'rgba(0,0,0,0.7)',
                      color: 'white',
                      borderRadius: '4px',
                      padding: '2px 6px',
                      fontSize: 11
                    }}>
                      {capturedPhotos.length} photos
                    </div>
                  )}
                </>
              );
            })()}
            
            {/* Indicateur d'analyse en cours */}
            {isAnalyzingAI && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.7)',
                borderRadius: '6px'
              }}>
                <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} tip="Analyse IA..." />
              </div>
            )}
          </div>
        )}
        
        {/* Bouton d'analyse manuelle si pas auto-trigger */}
        {isAIEnabled && !autoTrigger && value && !isAnalyzingAI && (
          <Button 
            type="primary"
            ghost
            icon={<RobotOutlined />}
            onClick={handleManualAnalysis}
            size="small"
          >
            Analyser avec IA
          </Button>
        )}
        
        {/* Résultat de la dernière analyse */}
        {lastAIResult && (
          <div style={{ 
            marginTop: 8, 
            padding: '8px 12px', 
            background: lastAIResult.success ? '#f6ffed' : '#fff2f0',
            border: `1px solid ${lastAIResult.success ? '#b7eb8f' : '#ffccc7'}`,
            borderRadius: '6px',
            fontSize: '12px'
          }}>
            {lastAIResult.success ? (
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <div style={{ color: '#52c41a' }}>
                  <CheckCircleOutlined /> Mesures extraites :
                </div>
                {Object.entries(lastAIResult.measures).map(([key, val]) => (
                  <div key={key} style={{ paddingLeft: 16 }}>
                    <strong>{key}:</strong> {val}
                  </div>
                ))}
              </Space>
            ) : (
              <div style={{ color: '#ff4d4f' }}>
                <ExclamationCircleOutlined /> {lastAIResult.error || 'Erreur lors de l\'analyse'}
              </div>
            )}
          </div>
        )}
      </Space>
      
      {/* 🎯 NOUVEAU: Modaux SmartCamera - Visibles si capacité aiMeasure activée */}
      {aiMeasure_enabled && (
        <>
          {/* 📸 SmartCamera - RENDU DIRECT via PORTAIL sur mobile pour éviter conflits avec caméra native */}
          {/* 🔒 PROTECTION MOBILE: Empêche sortie accidentelle (swipe, clic à côté, back button) */}
          {showSmartCamera && isMobile && ReactDOM.createPortal(
            <SmartCameraMobile
              onCapture={handleSmartCapture}
              onCancel={() => setShowSmartCamera(false)}
              minPhotos={3}
            />,
            document.body
          )}
          
          {/* 📸 Modal classique pour DESKTOP */}
          {!isMobile && (
            <Modal
              open={showSmartCamera}
              onCancel={() => setShowSmartCamera(false)}
              footer={null}
              width="100%"
              style={{ top: 0, padding: 0, maxWidth: '100vw' }}
              styles={{ body: { padding: 0, height: '100vh' } }}
              destroyOnClose
              {...smartCameraLock.modalProps}
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', background: '#1890ff', color: 'white', margin: '-24px -24px 0 -24px' }}>
                  <span>📸 Capture IA</span>
                  <Button 
                    type="text" 
                    icon={<CloseOutlined style={{ color: 'white', fontSize: 18 }} />}
                    onClick={() => setShowSmartCamera(false)}
                    style={{ color: 'white' }}
                  />
                </div>
              }
            >
              <SmartCameraMobile
                onCapture={handleSmartCapture}
                onCancel={() => setShowSmartCamera(false)}
                minPhotos={3}
              />
            </Modal>
          )}
          
          {/* Modal de configuration des objets de référence */}
          <ReferenceObjectsConfig
            visible={showReferenceConfig}
            onClose={() => setShowReferenceConfig(false)}
            nodeId={nodeId}
          />
          
          {/* 🆕 Modal de mesure interactive (canvas avec sélection de lignes)
              Positionné immédiatement sous le bouton "IA photo + mesure" (ordre DOM) */}
          <ImageMeasurementPreview
            visible={showMeasurementCanvas && !!processedImageUrl}
            imageUrl={processedImageUrl || ''}
            imageBase64={processedImageBase64 || undefined}
            organizationId={organizationId}
            nodeId={nodeId}
            onComplete={handleMeasurementsComplete}
            onCancel={handleMeasurementCancel}
            measureKeys={aiMeasure_keys?.map(k => k.key) || ['largeur_cm', 'hauteur_cm']}
            // 🎯 Passer les corners fusionnés si disponibles
            fusedCorners={(() => {
              const bestPhoto = capturedPhotos.find(p => (p.metadata as unknown)?.referenceDetected || (p.metadata as unknown)?.fusedCorners) || capturedPhotos[0];
              const fusedCornersFromMetadata = (bestPhoto?.metadata as unknown)?.fusedCorners;
              if (fusedCornersFromMetadata) {
                console.log('🎯 [TBLImageFieldWithAI] fusedCorners trouvés et passés à ImageMeasurementPreview:', fusedCornersFromMetadata);
                return fusedCornersFromMetadata;
              }
              return undefined;
            })()}
            homographyReady={!!capturedPhotos.find(p => (p.metadata as unknown)?.fusedCorners)}
          />
        </>
      )}
      
      {/* 🆕 Modal plein écran pour voir l'image AVEC les annotations et mesures */}
      <Modal
        open={showFullscreenImage}
        onCancel={() => setShowFullscreenImage(false)}
        footer={null}
        width="95vw"
        style={{ top: 20 }}
        styles={{ body: { padding: 0, background: '#000', height: '85vh', overflow: 'hidden' } }}
        closable
        destroyOnClose
      >
        {(() => {
          const annotatedFromValue = typeof value === 'object' ? (value as unknown)?.annotated : undefined;
          const originalFromValue = typeof value === 'object' ? (value as unknown)?.original : undefined;
          let imgSrc = annotatedImageUrl || annotatedFromValue || (typeof value === 'string' ? value : originalFromValue);
          
          // Si on a des photos capturées, utiliser la première
          if (!annotatedImageUrl && capturedPhotos.length > 0) {
            const base64 = capturedPhotos[0].imageBase64;
            imgSrc = base64?.startsWith('data:') 
              ? base64 
              : `data:image/jpeg;base64,${base64}`;
          }
          
          // 🎯 Si on a des annotations sauvegardées, utiliser le composant overlay
          if (savedAnnotations && imgSrc) {
            return (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* Image avec annotations dessinées */}
                <div style={{ flex: 1, minHeight: 0 }}>
                  <ImageWithAnnotationsOverlay
                    imageUrl={imgSrc}
                    annotations={savedAnnotations}
                    style={{ height: '100%' }}
                  />
                </div>
                
                {/* Barre d'infos en bas */}
                <div style={{ 
                  padding: '12px 16px', 
                  background: 'rgba(0,0,0,0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 16,
                  flexWrap: 'wrap'
                }}>
                  {savedMeasurements && (
                    <>
                      {savedMeasurements.largeur_cm && (
                        <div style={{ color: 'white', fontSize: 14 }}>
                          <strong>L:</strong> {(savedMeasurements.largeur_cm / 100).toFixed(2)} m
                        </div>
                      )}
                      {savedMeasurements.hauteur_cm && (
                        <div style={{ color: 'white', fontSize: 14 }}>
                          <strong>H:</strong> {(savedMeasurements.hauteur_cm / 100).toFixed(2)} m
                        </div>
                      )}
                      {savedMeasurements.surface_brute_m2 && (
                        <div style={{ color: 'white', fontSize: 14 }}>
                          <strong>Surface:</strong> {savedMeasurements.surface_brute_m2.toFixed(2)} m²
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          }
          
          // Fallback: image simple sans annotations
          return (
            <div style={{ textAlign: 'center', background: '#000', padding: 16, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <img 
                src={imgSrc}
                alt="Image plein écran" 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '75vh',
                  objectFit: 'contain'
                }} 
              />
              
              {/* Infos sur l'image */}
              {capturedPhotos.some(p => (p.metadata as unknown)?.referenceDetected || (p.metadata as unknown)?.fusedCorners) && (
                <div style={{ 
                  marginTop: 12, 
                  padding: '8px 16px', 
                  background: '#52c41a', 
                  color: 'white',
                  borderRadius: 4,
                  display: 'inline-block'
                }}>
                  ✓ Référence Métré A4 V10 détectée
                </div>
              )}
              
              {savedMeasurements && Object.keys(savedMeasurements).length > 0 && (
                <div style={{ 
                  marginTop: 12, 
                  padding: '12px 16px', 
                  background: 'rgba(255,255,255,0.1)', 
                  color: 'white',
                  borderRadius: 4,
                  textAlign: 'left',
                  maxWidth: 400,
                  margin: '12px auto'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: 8 }}>📐 Mesures enregistrées :</div>
                  {Object.entries(savedMeasurements).map(([key, val]) => (
                    <div key={key} style={{ marginLeft: 8 }}>
                      • {key}: <strong>{val}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
});

TBLImageFieldWithAI.displayName = 'TBLImageFieldWithAI';

export default TBLImageFieldWithAI;
