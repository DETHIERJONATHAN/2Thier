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
const TBLImageFieldWithAI: React.FC<TBLImageFieldWithAIProps> = ({
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
  
  // États pour les modaux SmartCamera - avec restauration depuis sessionStorage
  const [showSmartCamera, setShowSmartCamera] = useState(() => {
    // 🔒 Restaurer l'état au montage (si l'utilisateur était en train de prendre des photos)
    if (typeof window !== 'undefined') {
      const wasOpen = sessionStorage.getItem(smartCameraSessionKey);
      if (wasOpen === 'true') {
        console.log('📱 [TBLImageFieldWithAI] Restauration SmartCamera ouvert depuis sessionStorage');
        return true;
      }
    }
    return false;
  });
  const [showReferenceConfig, setShowReferenceConfig] = useState(false);
  
  // 🔒 Persister l'état showSmartCamera dans sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (showSmartCamera) {
        sessionStorage.setItem(smartCameraSessionKey, 'true');
        console.log('📱 [TBLImageFieldWithAI] SmartCamera ouvert - sauvegardé dans sessionStorage');
      } else {
        sessionStorage.removeItem(smartCameraSessionKey);
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
  
  // 🆕 État pour le modal plein écran
  const [showFullscreenImage, setShowFullscreenImage] = useState(false);

  // 🔒 Cache anti-doublons pour limiter les updates backend inutiles
  const lastAppliedMeasurementsRef = useRef<Record<string, number | string> | null>(null);
  const lastAppliedImageRef = useRef<string | null>(null);
  
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
  const aiConfig = getAIMeasureConfig({ 
    metadata,
    // Colonnes dédiées (prioritaires)
    aiMeasure_enabled,
    aiMeasure_autoTrigger,
    aiMeasure_prompt,
    aiMeasure_keys
  });
  const isAIEnabled = aiConfig?.enabled === true;
  const autoTrigger = aiConfig?.autoTrigger !== false; // true par défaut si AI activé
  
  // Debug log
  console.log('[TBLImageFieldWithAI] AI Config:', { 
    isAIEnabled, 
    autoTrigger, 
    aiMeasure_enabled,
    aiMeasure_keys,
    mappingsCount: aiConfig?.mappings?.length || 0 
  });
  
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
  const handleImageChange = useCallback((info: any) => {
    if (info.fileList.length > 0) {
      const file = info.fileList[0];
      if (file.originFileObj) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          let imageData: any = e.target?.result;
          
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
            
            setCapturedPhotos(enrichedPhotos as any);
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
          
        } catch (error: any) {
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
        let imageData: any = imageDataUrl;
        
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
   * Ouvrir la caméra directement
   */
  const openCamera = useCallback(() => {
    cameraInputRef.current?.click();
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
            qualityScore: result.allPhotoScores?.find((d: any) => d.index === idx)?.score || photo.metadata?.qualityScore || 85,
            sharpness: photo.metadata?.sharpness || 85,
            referenceDetected: idx === bestPhotoIndex && !!result.fusedCorners,
            fusedCorners: idx === bestPhotoIndex ? result.fusedCorners : null,
            homography: null
          }
        };
      });

      setCapturedPhotos(enrichedPhotos as any);

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
    } catch (error: any) {
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
      if (lastAppliedImageRef.current !== nextImageValue) {
        onChange(nextImageValue);
        lastAppliedImageRef.current = nextImageValue;
      }
      setAnnotatedImageUrl(nextAnnotatedImageUrl || processedImageUrl);
    }
    
    // Appliquer les mesures aux champs mappés
    if (aiMeasure_keys && onFieldUpdate) {
      let appliedCount = 0;
      const nextApplied: Record<string, number | string> = {
        ...(lastAppliedMeasurementsRef.current || {})
      };

      aiMeasure_keys.forEach(mapping => {
        // Accéder à la mesure par clé (string index)
        const measureValue = measurements[mapping.key as keyof MeasurementResults];
        if (measureValue !== undefined && mapping.targetRef) {
          const prevValue = lastAppliedMeasurementsRef.current?.[mapping.targetRef];
          const hasChanged = typeof measureValue === 'number'
            ? (typeof prevValue !== 'number' || Math.abs(prevValue - measureValue) > 0.01)
            : prevValue !== measureValue;

          if (hasChanged) {
            console.log(`[TBLImageFieldWithAI] Application: ${mapping.key} = ${measureValue} → ${mapping.targetRef}`);
            onFieldUpdate(mapping.targetRef, measureValue);
            nextApplied[mapping.targetRef] = measureValue as number | string;
            appliedCount++;
          }
        }
      });

      if (appliedCount > 0) {
        lastAppliedMeasurementsRef.current = nextApplied;
      }
      
      if (appliedCount > 0) {
        message.success(`📐 ${appliedCount} mesure(s) appliquée(s) aux champs !`);
      }
    }
    
    // Fermer le canvas
    setShowMeasurementCanvas(false);
  }, [processedImageUrl, onChange, aiMeasure_keys, onFieldUpdate]);

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
      label: 'Prendre une photo',
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

      <Space direction="vertical" style={{ width: '100%' }} size={8}>
        {/* Boutons d'action - IA Photo + Mesure */}
        <Space size={8} align="center">
          {/* 🎯 SmartCamera IA (multi-photos) - Bouton principal */}
          {aiMeasure_enabled && (
            <>
              <Tooltip title="📷 Ouvrir l'appareil photo">
                <Button
                  icon={<CameraOutlined />}
                  onClick={openCamera}
                  disabled={disabled || isAnalyzingAI}
                  size={size}
                  type="primary"
                  style={{
                    background: '#1677ff',
                    borderColor: '#1677ff',
                    width: iconButtonPx,
                    height: iconButtonPx,
                    padding: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  aria-label="Appareil photo"
                />
              </Tooltip>
              
              {/* 🆕 Bouton "Mesurer" - Réutiliser les photos capturées */}
              {capturedPhotos.length > 0 && (
                <Tooltip title="📐 Revoir l'analyse Métré A4 V10">
                  <Button
                    icon={<CheckCircleOutlined />}
                    onClick={() => {
                      // 🎯 Réutiliser les photos avec référence détectée si possible
                      const bestPhoto = capturedPhotos.find(p => (p.metadata as any)?.referenceDetected || (p.metadata as any)?.fusedCorners);
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
                        bestPhotoHasReference: !!(bestPhoto?.metadata as any)?.referenceDetected,
                        hasFusedCorners: !!(bestPhoto?.metadata as any)?.fusedCorners
                      });
                      
                      setShowMeasurementCanvas(true);
                    }}
                    disabled={disabled || isAnalyzingAI}
                    size={size}
                    type="default"
                    style={{ 
                      borderColor: '#52c41a',
                      color: '#52c41a',
                      fontWeight: 'bold'
                      ,
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
        </Space>
        
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
        {(value || capturedPhotos.length > 0) && !isAnalyzingReference && (
          <div 
            style={{ position: 'relative', display: 'inline-block', cursor: 'pointer' }}
            onClick={() => setShowFullscreenImage(true)}
            title="Cliquez pour voir en plein écran"
          >
            {/* 🎯 Afficher la meilleure photo (avec référence si disponible) */}
            {(() => {
              let imgSrc = typeof value === 'string' ? value : (value as any)?.original;
              let hasReference = false;
              
              // Si on a des photos capturées, utiliser celle avec référence
              if (capturedPhotos.length > 0) {
                const bestPhoto = capturedPhotos.find(p => (p.metadata as any)?.referenceDetected || (p.metadata as any)?.fusedCorners);
                const photoToShow = bestPhoto || capturedPhotos[0];
                hasReference = !!(bestPhoto?.metadata as any)?.referenceDetected || !!(bestPhoto?.metadata as any)?.fusedCorners;
                
                const base64 = photoToShow.imageBase64;
                imgSrc = base64?.startsWith('data:') 
                  ? base64 
                  : `data:image/jpeg;base64,${base64}`;
              }
              
              return (
                <>
                  <img 
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
          
          {/* 🆕 Modal de mesure interactive (canvas avec sélection de lignes) */}
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
              const bestPhoto = capturedPhotos.find(p => (p.metadata as any)?.referenceDetected || (p.metadata as any)?.fusedCorners) || capturedPhotos[0];
              const fusedCornersFromMetadata = (bestPhoto?.metadata as any)?.fusedCorners;
              // fusedCorners est déjà au format { topLeft, topRight, bottomLeft, bottomRight }
              // avec valeurs en % depuis l'API
              if (fusedCornersFromMetadata) {
                console.log('🎯 [TBLImageFieldWithAI] fusedCorners trouvés et passés à ImageMeasurementPreview:', fusedCornersFromMetadata);
                return fusedCornersFromMetadata;
              }
              return undefined;
            })()}
            homographyReady={!!capturedPhotos.find(p => (p.metadata as any)?.fusedCorners)}
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
          let imgSrc = annotatedImageUrl || (typeof value === 'string' ? value : (value as any)?.original);
          
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
                          <strong>L:</strong> {savedMeasurements.largeur_cm.toFixed(1)} cm
                        </div>
                      )}
                      {savedMeasurements.hauteur_cm && (
                        <div style={{ color: 'white', fontSize: 14 }}>
                          <strong>H:</strong> {savedMeasurements.hauteur_cm.toFixed(1)} cm
                        </div>
                      )}
                      {savedMeasurements.surface_brute_m2 && (
                        <div style={{ color: 'white', fontSize: 14 }}>
                          <strong>Surface:</strong> {savedMeasurements.surface_brute_m2.toFixed(3)} m²
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
              {capturedPhotos.some(p => (p.metadata as any)?.referenceDetected || (p.metadata as any)?.fusedCorners) && (
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
};

export default TBLImageFieldWithAI;
