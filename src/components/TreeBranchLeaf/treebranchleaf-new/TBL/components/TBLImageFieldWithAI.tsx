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
  SettingOutlined,
  ThunderboltOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { useAuth } from '../../../../../auth/useAuth';
import { useAIMeasure, getAIMeasureConfig, type AIMeasureConfig, type AIMeasureResult } from '../../../../../hooks/useAIMeasure';
import { useMobileModalLock } from '../../../../../hooks/useMobileModalLock';
import { useSmartCameraConfig } from '../../../../../hooks/useSmartCameraConfig';
import SmartCameraMobile, { type CapturedPhoto } from '../../../../SmartCamera/SmartCameraMobile';
import type { MultiPhotoAnalysis } from '../../../../SmartCamera/PhotoAnalyzer';
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
  // 🔬 Analyse complète ArUco pour le panel Canvas
  const [arucoAnalysis, setArucoAnalysis] = useState<any>(null);
  
  // 🆕 États pour stocker l'image avec annotations et les mesures
  const [annotatedImageUrl, setAnnotatedImageUrl] = useState<string | null>(null);
  const [savedAnnotations, setSavedAnnotations] = useState<ImageAnnotations | null>(null);
  const [savedMeasurements, setSavedMeasurements] = useState<MeasurementResults | null>(null);
  const [isAnalyzingAruco, setIsAnalyzingAruco] = useState(false);
  
  // 🆕 État pour le modal plein écran
  const [showFullscreenImage, setShowFullscreenImage] = useState(false);
  
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
   * 🔥 NOUVEAU: Utilise le même traitement ArUco que SmartCamera pour les mesures
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
        console.log('[TBLImageFieldWithAI] 🔥 Upload avec traitement ArUco (même que SmartCamera)');
        
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
        setIsAnalyzingAruco(true);
        message.loading({ content: '🔬 Analyse ArUco en cours... Patientez', key: 'ultra-fusion', duration: 0 });
        
        try {
          const base64Part = imageDataUrl.includes(',') ? imageDataUrl.split(',')[1] : imageDataUrl;
          
          const photosForFusion = [{
            base64: base64Part,
            mimeType: 'image/jpeg',
            metadata: fakePhoto.metadata
          }];
          
          const response = await fetch('/api/measurement-reference/ultra-fusion-detect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              photos: photosForFusion,
              // 📸 Envoyer userAgent pour calcul précis de la focale
              userAgent: navigator.userAgent
            }),
            credentials: 'include'
          });
          
          const result = await response.json();
          
          if (result.success && result.ultraPrecision) {
            console.log('[TBLImageFieldWithAI] ✅ Analyse ArUco terminée (upload)!');
            console.log(`   🔬 Ultra-précision: ${result.ultraPrecision.totalPoints} points`);
            
            if (result.arucoAnalysis) {
              setArucoAnalysis(result.arucoAnalysis);
            }
            
            message.success({ 
              content: `🎯 ArUco détecté! (${result.ultraPrecision.estimatedPrecision})`, 
              key: 'ultra-fusion' 
            });
            
            const optimalCorrection = result.optimalCorrection || null;
            
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
                arucoDetected: true,
                ultraPrecision: result.ultraPrecision,
                fusedCorners: result.fusedCorners,
                optimalCorrection: optimalCorrection,
                homography: null
              }
            }];
            
            setCapturedPhotos(enrichedPhotos as any);
            setIsAnalyzingAruco(false);
            setShowMeasurementCanvas(true);
            
          } else {
            // ArUco non détecté - ouvrir le canvas quand même
            console.log('[TBLImageFieldWithAI] ⚠️ ArUco non détecté (upload)');
            message.warning({ 
              content: '⚠️ ArUco non détecté - Calibration manuelle', 
              key: 'ultra-fusion' 
            });
            
            const base64Part = imageDataUrl.includes(',') ? imageDataUrl.split(',')[1] : imageDataUrl;
            setProcessedImageUrl(imageDataUrl);
            setProcessedImageBase64(base64Part);
            setIsFromSmartCapture(true);
            setCapturedPhotos([fakePhoto]);
            
            setIsAnalyzingAruco(false);
            setShowMeasurementCanvas(true);
          }
          
        } catch (error: any) {
          console.error('[TBLImageFieldWithAI] ❌ Erreur analyse ArUco (upload):', error);
          message.warning({ content: `Erreur: ${error.message}`, key: 'ultra-fusion' });
          
          const base64Part = imageDataUrl.includes(',') ? imageDataUrl.split(',')[1] : imageDataUrl;
          setProcessedImageUrl(imageDataUrl);
          setProcessedImageBase64(base64Part);
          setIsFromSmartCapture(true);
          setCapturedPhotos([fakePhoto]);
          
          setIsAnalyzingAruco(false);
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
  }, [onChange, imageThumbnails, isAIEnabled, autoTrigger, triggerAIAnalysis, maxImageSizeBytes, imageConfig.maxSize, aiMeasure_keys]);

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
   * 🔥 Handler pour le SmartCamera (capture multi-photos avec ULTRA-FUSION + ArUco)
   * 
   * WORKFLOW PARFAIT:
   * 1. Capturer N photos
   * 2. 🔬 ATTENDRE l'analyse ArUco (message "Analyse en cours...")
   * 3. 🚀 OUVRIR LE CANVAS avec TOUT déjà calibré parfaitement
   */
  const handleSmartCapture = useCallback(async (photos: CapturedPhoto[]) => {
    console.log('[TBLImageFieldWithAI] 🔥 IA Photo capture:', photos.length, 'photos');
    
    if (photos.length === 0) {
      message.error('Aucune photo capturée');
      setShowSmartCamera(false);
      return;
    }
    
    // Fermer SmartCamera
    setShowSmartCamera(false);
    
    // 🔬 Montrer l'état d'attente
    setIsAnalyzingAruco(true);
    message.loading({ content: '🔬 Analyse ArUco en cours... Patientez', key: 'ultra-fusion', duration: 0 });
    
    try {
      console.log('[TBLImageFieldWithAI] 🎯 Appel /ultra-fusion-detect avec', photos.length, 'photos');
      
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
      
      const response = await fetch('/api/measurement-reference/ultra-fusion-detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          photos: photosForFusion,
          // 📸 Envoyer userAgent pour calcul précis de la focale par modèle de téléphone
          userAgent: navigator.userAgent
        }),
        credentials: 'include'
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Fusion échouée');
      }
      
      console.log('[TBLImageFieldWithAI] ✅ Analyse ArUco terminée!');
      console.log(`   🏆 Meilleure photo: ${result.bestPhoto?.index} (score: ${(result.bestPhoto?.score * 100).toFixed(1)}%)`);
      console.log(`   📊 Détections: ${result.metrics?.successfulDetections}/${result.metrics?.inputPhotos}`);
      
      if (result.ultraPrecision) {
        console.log(`   🔬 Ultra-précision: ${result.ultraPrecision.totalPoints} points`);
        console.log(`      ✅ Précision: ${result.ultraPrecision.estimatedPrecision}`);
        
        // 🔬 Stocker l'analyse complète ArUco pour le panel Canvas
        if (result.arucoAnalysis) {
          console.log(`   📊 Analyse ArUco: rotX=${result.arucoAnalysis.pose?.rotX}°, depth=${result.arucoAnalysis.depth?.estimatedCm}cm`);
          setArucoAnalysis(result.arucoAnalysis);
        }
        
        message.success({ 
          content: `🎯 ArUco détecté! Photo ${result.bestPhoto?.index + 1} (${result.ultraPrecision.estimatedPrecision})`, 
          key: 'ultra-fusion' 
        });
        
        // 🔧 Extraire la correction optimale calculée par l'API
        const optimalCorrection = result.optimalCorrection || null;
        if (optimalCorrection) {
          console.log(`   🎯 Correction optimale: ×${optimalCorrection.finalCorrection?.toFixed(4)} (confiance: ${(optimalCorrection.globalConfidence * 100).toFixed(0)}%)`);
        }
        
        // 🏆 Utiliser la MEILLEURE photo
        const bestPhotoIndex = result.bestPhoto?.index || 0;
        const bestImage = result.bestPhotoBase64 
          ? `data:image/jpeg;base64,${result.bestPhotoBase64}`
          : photos[0]?.imageBase64?.startsWith('data:') 
            ? photos[0].imageBase64 
            : `data:image/jpeg;base64,${photos[0]?.imageBase64}`;
        
        setProcessedImageUrl(bestImage);
        setProcessedImageBase64(result.bestPhotoBase64 || photos[0]?.imageBase64?.split(',')[1] || photos[0]?.imageBase64 || '');
        setIsFromSmartCapture(true);
        
        // 🎯 Créer les photos enrichies avec toutes les données ArUco
        const enrichedPhotos = photos.map((photo, idx) => ({
          imageBase64: idx === bestPhotoIndex && result.bestPhotoBase64 
            ? result.bestPhotoBase64 
            : photo.imageBase64?.includes(',') ? photo.imageBase64.split(',')[1] : photo.imageBase64 || '',
          mimeType: 'image/jpeg',
          metadata: {
            ...photo.metadata,
            qualityScore: result.allPhotoScores?.find((d: any) => d.index === idx)?.score || 85,
            sharpness: 85,
            arucoDetected: idx === bestPhotoIndex,
            ultraPrecision: idx === bestPhotoIndex ? result.ultraPrecision : null,
            fusedCorners: idx === bestPhotoIndex ? result.fusedCorners : null,
            aprilTagsDebug: idx === bestPhotoIndex ? result.aprilTagsDebug : null, // 🎨 NOUVEAU: Visualisation AprilTags
            optimalCorrection: idx === bestPhotoIndex ? optimalCorrection : null,
            detectionMethod: idx === bestPhotoIndex ? result.detectionMethod : null, // 🎯 A4 ou ArUco
            homography: null
          }
        }));
        
        setCapturedPhotos(enrichedPhotos as any);
        
        message.success({ 
          content: `🎯 ArUco détecté! Ouverture du canvas...`, 
          key: 'ultra-fusion' 
        });
        
        // 🚀 MAINTENANT ouvrir le canvas avec TOUT déjà calibré
        console.log('[TBLImageFieldWithAI] 🚀 Ouverture du canvas avec données ArUco complètes!');
        setIsAnalyzingAruco(false);
        setShowMeasurementCanvas(true);
        
      } else {
        // ArUco non détecté - ouvrir le canvas quand même
        console.log('   ⚠️ ArUco non détecté');
        message.warning({ 
          content: '⚠️ ArUco non détecté - Calibration manuelle', 
          key: 'ultra-fusion' 
        });
        
        // Préparer la première photo
        const firstPhoto = photos[0]?.imageBase64 || '';
        const base64Part = firstPhoto.includes(',') ? firstPhoto.split(',')[1] : firstPhoto;
        setProcessedImageUrl(firstPhoto.startsWith('data:') ? firstPhoto : `data:image/jpeg;base64,${base64Part}`);
        setProcessedImageBase64(base64Part);
        setIsFromSmartCapture(true);
        setCapturedPhotos(photos);
        
        setIsAnalyzingAruco(false);
        setShowMeasurementCanvas(true);
      }
      
    } catch (error: any) {
      console.error('[TBLImageFieldWithAI] ❌ Erreur analyse ArUco:', error);
      message.warning({ content: `Erreur: ${error.message}`, key: 'ultra-fusion' });
      
      // En cas d'erreur, ouvrir le canvas quand même
      const firstPhoto = photos[0]?.imageBase64 || '';
      const base64Part = firstPhoto.includes(',') ? firstPhoto.split(',')[1] : firstPhoto;
      setProcessedImageUrl(firstPhoto.startsWith('data:') ? firstPhoto : `data:image/jpeg;base64,${base64Part}`);
      setProcessedImageBase64(base64Part);
      setIsFromSmartCapture(true);
      setCapturedPhotos(photos);
      
      setIsAnalyzingAruco(false);
      setShowMeasurementCanvas(true);
    }
  }, []);

  /**
   * 🆕 Handler pour la validation des mesures depuis ImageMeasurementCanvas
   * Sauvegarde l'image AVEC les annotations pour pouvoir la revoir
   */
  const handleMeasurementsComplete = useCallback((measurements: MeasurementResults, annotations?: ImageAnnotations) => {
    console.log('[TBLImageFieldWithAI] 📐 Mesures extraites:', measurements);
    console.log('[TBLImageFieldWithAI] 🎯 Annotations reçues:', annotations ? {
      hasReferenceCorners: !!annotations.referenceCorners,
      hasImageDimensions: !!annotations.imageDimensions,
      hasMeasurementPoints: annotations.measurementPoints?.length || 0,
      markerSizeCm: annotations.markerSizeCm
    } : 'null');
    
    // 🆕 Sauvegarder les annotations et mesures pour pouvoir les revoir
    setSavedAnnotations(annotations || null);
    setSavedMeasurements(measurements);
    
    // Sauvegarder l'image traitée dans le champ
    if (processedImageUrl) {
      onChange(processedImageUrl);
      // Aussi sauvegarder comme image annotée (pour l'instant la même, mais pourrait être avec overlay)
      setAnnotatedImageUrl(processedImageUrl);
    }
    
    // Appliquer les mesures aux champs mappés
    if (aiMeasure_keys && onFieldUpdate) {
      let appliedCount = 0;
      aiMeasure_keys.forEach(mapping => {
        // Accéder à la mesure par clé (string index)
        const measureValue = measurements[mapping.key as keyof MeasurementResults];
        if (measureValue !== undefined && mapping.targetRef) {
          console.log(`[TBLImageFieldWithAI] Application: ${mapping.key} = ${measureValue} → ${mapping.targetRef}`);
          onFieldUpdate(mapping.targetRef, measureValue);
          appliedCount++;
        }
      });
      
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
              <Tooltip title="📸 Capture IA avec mesures automatiques">
                <Button
                  icon={<ThunderboltOutlined />}
                  onClick={() => setShowSmartCamera(true)}
                  disabled={disabled || isAnalyzingAI}
                  size={size}
                  type="primary"
                  style={{
                    background: '#722ed1',
                    borderColor: '#722ed1',
                    width: iconButtonPx,
                    height: iconButtonPx,
                    padding: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  aria-label="IA Photo"
                />
              </Tooltip>
              
              {/* 🆕 Bouton "Mesurer" - UNIQUEMENT si des photos ont été analysées avec ArUco */}
              {capturedPhotos.length > 0 && capturedPhotos.some(p => (p.metadata as any)?.arucoDetected) && (
                <Tooltip title="📐 Revoir l'analyse avec ArUco détecté">
                  <Button
                    icon={<CheckCircleOutlined />}
                    onClick={() => {
                      // 🎯 Réutiliser les photos analysées avec ArUco
                      const bestPhoto = capturedPhotos.find(p => (p.metadata as any)?.arucoDetected);
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
                      
                      console.log('[TBLImageFieldWithAI] 📐 Revoir analyse ArUco:', {
                        totalPhotos: capturedPhotos.length,
                        bestPhotoHasAruco: !!(bestPhoto?.metadata as any)?.arucoDetected,
                        hasOptimalCorrection: !!(bestPhoto?.metadata as any)?.optimalCorrection,
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
        
        {/* 🔬 Indicateur d'analyse ArUco en cours */}
        {isAnalyzingAruco && (
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
            <span>🔬 Analyse ArUco en cours... Patientez</span>
          </div>
        )}
        
        {/* Aperçu de l'image - CLIQUABLE pour plein écran */}
        {(value || capturedPhotos.length > 0) && !isAnalyzingAruco && (
          <div 
            style={{ position: 'relative', display: 'inline-block', cursor: 'pointer' }}
            onClick={() => setShowFullscreenImage(true)}
            title="Cliquez pour voir en plein écran"
          >
            {/* 🎯 Afficher la meilleure photo (avec ArUco si disponible) */}
            {(() => {
              let imgSrc = typeof value === 'string' ? value : (value as any)?.original;
              let hasAruco = false;
              
              // Si on a des photos capturées, utiliser celle avec ArUco
              if (capturedPhotos.length > 0) {
                const bestPhoto = capturedPhotos.find(p => (p.metadata as any)?.arucoDetected);
                const photoToShow = bestPhoto || capturedPhotos[0];
                hasAruco = !!(bestPhoto?.metadata as any)?.arucoDetected;
                
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
                      border: hasAruco ? '3px solid #52c41a' : '1px solid #d9d9d9',
                      borderRadius: '8px',
                      opacity: isAnalyzingAI ? 0.5 : 1,
                      transition: 'transform 0.2s',
                    }} 
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  />
                  
                  {/* 🎯 Badge ArUco si détecté */}
                  {hasAruco && (
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
                      ✓
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
            allPhotos={capturedPhotos.map(photo => ({
              imageBase64: photo.imageBase64?.includes(',') 
                ? photo.imageBase64.split(',')[1] 
                : photo.imageBase64 || '',
              mimeType: 'image/jpeg',
              metadata: {
                qualityScore: (photo.metadata as any)?.qualityScore || photo.metadata?.quality?.overallScore || 85,
                sharpness: (photo.metadata as any)?.sharpness || photo.metadata?.quality?.sharpness || 85,
                brightness: photo.metadata?.lighting?.brightness || 128,
                // 🎯 ULTRA-PRECISION: Passer les données ArUco détectées !
                arucoDetected: (photo.metadata as any)?.arucoDetected,
                ultraPrecision: (photo.metadata as any)?.ultraPrecision,
                homography: (photo.metadata as any)?.homography,
                // 🔧 CORRECTION OPTIMALE - CRITIQUE: Passer pour application aux mesures !
                optimalCorrection: (photo.metadata as any)?.optimalCorrection,
                // 🎯 NOUVEAU: Passer aussi fusedCorners dans les metadata
                fusedCorners: (photo.metadata as any)?.fusedCorners,
                // 🎨 VISUALISATION DEBUG: Passer les données AprilTag pour affichage
                aprilTagsDebug: (photo.metadata as any)?.aprilTagsDebug
              }
            }))}
            // 🎯 ULTRA-PRECISION: Passer les corners fusionnés si disponibles
            fusedCorners={(() => {
              const bestPhoto = capturedPhotos.find(p => (p.metadata as any)?.arucoDetected);
              const fusedCornersFromMetadata = (bestPhoto?.metadata as any)?.fusedCorners;
              // fusedCorners est déjà au format { topLeft, topRight, bottomLeft, bottomRight }
              // avec valeurs en % depuis l'API
              if (fusedCornersFromMetadata) {
                console.log('🎯 [TBLImageFieldWithAI] fusedCorners trouvés et passés à ImageMeasurementPreview:', fusedCornersFromMetadata);
                return fusedCornersFromMetadata;
              }
              return undefined;
            })()}
            // 🎯 Indiquer que l'homographie est prête si ArUco détecté
            homographyReady={capturedPhotos.some(p => (p.metadata as any)?.arucoDetected)}
            // 🔬 Analyse complète ArUco pour le panel d'infos détaillé
            arucoAnalysis={arucoAnalysis}
            // 🎯 Type de détection (A4 ou ArUco)
            detectionMethod={(() => {
              const bestPhoto = capturedPhotos.find(p => (p.metadata as any)?.arucoDetected);
              return (bestPhoto?.metadata as any)?.detectionMethod;
            })()}
          />
        </>
      )}
      
      {/* 🆕 Modal plein écran pour voir l'image AVEC les annotations ArUco et mesures */}
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
          let imgSrc = typeof value === 'string' ? value : (value as any)?.original;
          
          // Si on a des photos capturées, utiliser celle avec ArUco
          if (capturedPhotos.length > 0) {
            const bestPhoto = capturedPhotos.find(p => (p.metadata as any)?.arucoDetected);
            const photoToShow = bestPhoto || capturedPhotos[0];
            const base64 = photoToShow.imageBase64;
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
                    markerSizeCm={savedAnnotations.markerSizeCm || 16.8}
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
                  {capturedPhotos.some(p => (p.metadata as any)?.arucoDetected) && (
                    <div style={{ 
                      padding: '4px 12px', 
                      background: '#52c41a', 
                      color: 'white',
                      borderRadius: 4,
                      fontSize: 12
                    }}>
                      ✓ ArUco détecté
                    </div>
                  )}
                  
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
              {capturedPhotos.some(p => (p.metadata as any)?.arucoDetected) && (
                <div style={{ 
                  marginTop: 12, 
                  padding: '8px 16px', 
                  background: '#52c41a', 
                  color: 'white',
                  borderRadius: 4,
                  display: 'inline-block'
                }}>
                  ✓ ArUco détecté - Calibration précise
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
