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

import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Upload, Button, message, Spin, Space, Tag, Tooltip, Dropdown } from 'antd';
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
  ThunderboltOutlined
} from '@ant-design/icons';
import { useAuth } from '../../../../../auth/useAuth';
import { useAIMeasure, getAIMeasureConfig, type AIMeasureConfig, type AIMeasureResult } from '../../../../../hooks/useAIMeasure';
import { useSmartCameraConfig } from '../../../../../hooks/useSmartCameraConfig';
import SmartCaptureFlow from '../../../../SmartCamera/SmartCaptureFlow';
import type { CapturedPhoto } from '../../../../SmartCamera/SmartCameraMobile';
import type { MultiPhotoAnalysis } from '../../../../SmartCamera/PhotoAnalyzer';
import { ReferenceObjectsConfig } from '../../../../SmartCamera/ReferenceObjectsConfig';
import { ImageMeasurementPreview } from '../../../../ImageMeasurement/ImageMeasurementPreview';
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
  // Hook auth pour récupérer l'organizationId
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';
  
  // État local pour l'analyse IA
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [lastAIResult, setLastAIResult] = useState<AIMeasureResult | null>(null);
  
  // États pour les modaux SmartCamera
  const [showSmartCamera, setShowSmartCamera] = useState(false);
  const [showReferenceConfig, setShowReferenceConfig] = useState(false);
  
  // 🆕 États pour ImageMeasurementPreview (canvas de sélection des lignes)
  const [showMeasurementCanvas, setShowMeasurementCanvas] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [processedImageBase64, setProcessedImageBase64] = useState<string | null>(null);
  const [isFromSmartCapture, setIsFromSmartCapture] = useState(false);
  // 🔬 Analyse complète ArUco pour le panel Canvas
  const [arucoAnalysis, setArucoAnalysis] = useState<any>(null);
  
  // Refs pour les inputs file (galerie et caméra)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
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
   */
  const handleNativeFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validation taille
    if (maxImageSizeBytes && file.size > maxImageSizeBytes) {
      message.error(`Image trop lourde (max ${imageConfig.maxSize} Mo).`);
      return;
    }
    
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
        setTimeout(() => {
          triggerAIAnalysis(e.target?.result as string);
        }, 100);
      }
    };
    reader.readAsDataURL(file);
    
    // Reset l'input pour permettre de rechoisir le même fichier
    event.target.value = '';
  }, [onChange, imageThumbnails, isAIEnabled, autoTrigger, triggerAIAnalysis, maxImageSizeBytes, imageConfig.maxSize]);

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
   * 🔥 Handler pour le SmartCamera (capture multi-photos avec ULTRA-FUSION + ArUco 105 points)
   * 
   * WORKFLOW OPTIMISÉ:
   * 1. Capturer N photos
   * 2. 🚀 OUVRIR LE CANVAS IMMÉDIATEMENT avec la première photo
   * 3. En arrière-plan: appeler /ultra-fusion-detect → ArUco 105 points
   * 4. Mettre à jour le canvas avec les coins ArUco quand l'analyse est prête
   */
  const handleSmartCapture = useCallback(async (photos: CapturedPhoto[], analysis: MultiPhotoAnalysis) => {
    console.log('[TBLImageFieldWithAI] 🔥 SmartCamera capture:', photos.length, 'photos');
    
    if (photos.length === 0) {
      message.error('Aucune photo capturée');
      setShowSmartCamera(false);
      return;
    }
    
    // 🚀 OUVRIR LE CANVAS IMMÉDIATEMENT avec la première photo
    const firstPhoto = photos[0]?.imageBase64 || '';
    const base64Part = firstPhoto.includes(',') ? firstPhoto.split(',')[1] : firstPhoto;
    
    setProcessedImageUrl(firstPhoto);
    setProcessedImageBase64(base64Part);
    setIsFromSmartCapture(true);
    setCapturedPhotos(photos);
    
    // Fermer SmartCamera et ouvrir le canvas TOUT DE SUITE
    setShowSmartCamera(false);
    setShowMeasurementCanvas(true);
    
    console.log('[TBLImageFieldWithAI] 🚀 Canvas ouvert immédiatement!');
    
    // 🔬 Lancer l'analyse ArUco en arrière-plan (sans bloquer)
    message.loading({ content: '🔬 Analyse ArUco en cours...', key: 'ultra-fusion', duration: 0 });
    
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
        body: JSON.stringify({ photos: photosForFusion }),
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
        
        // 🏆 Mettre à jour avec la MEILLEURE photo si différente
        const bestPhotoIndex = result.bestPhoto?.index || 0;
        if (bestPhotoIndex > 0 && result.bestPhotoBase64) {
          const bestImage = `data:image/jpeg;base64,${result.bestPhotoBase64}`;
          setProcessedImageUrl(bestImage);
          setProcessedImageBase64(result.bestPhotoBase64);
          console.log(`[TBLImageFieldWithAI] 🔄 Mise à jour avec la meilleure photo (index ${bestPhotoIndex})`);
        }
        
        // 🎯 Stocker les coins ArUco pour le canvas (il va les détecter via fusedCorners)
        if (result.fusedCorners) {
          // 🔧 Extraire la correction optimale calculée par l'API
          const optimalCorrection = result.optimalCorrection || null;
          if (optimalCorrection) {
            console.log(`   🎯 Correction optimale: ×${optimalCorrection.finalCorrection?.toFixed(4)} (confiance: ${(optimalCorrection.globalConfidence * 100).toFixed(0)}%)`);
          }
          
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
              // 🎯 PASSER LES COINS ARUCO AU CANVAS
              fusedCorners: idx === bestPhotoIndex ? result.fusedCorners : null,
              // 🔧 CORRECTION OPTIMALE pour appliquer aux mesures
              optimalCorrection: idx === bestPhotoIndex ? optimalCorrection : null,
              homography: null
            }
          }));
          setCapturedPhotos(enrichedPhotos as any);
        }
      } else {
        console.log('   ⚠️ ArUco non détecté');
        message.warning({ 
          content: '⚠️ ArUco non détecté, calibration manuelle nécessaire', 
          key: 'ultra-fusion' 
        });
      }
      
    } catch (error: any) {
      console.error('[TBLImageFieldWithAI] ❌ Erreur analyse ArUco:', error);
      message.warning({ content: `Calibration manuelle requise: ${error.message}`, key: 'ultra-fusion' });
      // Le canvas est déjà ouvert, l'utilisateur peut calibrer manuellement
    }
  }, []);

  /**
   * 🆕 Handler pour la validation des mesures depuis ImageMeasurementCanvas
   */
  const handleMeasurementsComplete = useCallback((measurements: MeasurementResults, annotations?: ImageAnnotations) => {
    console.log('[TBLImageFieldWithAI] Mesures extraites:', measurements, 'annotations:', annotations);
    
    // Sauvegarder l'image traitée dans le champ
    if (processedImageUrl) {
      onChange(processedImageUrl);
    }
    
    // Appliquer les mesures aux champs mappés
    if (aiMeasure_keys && onFieldUpdate) {
      let appliedCount = 0;
      aiMeasure_keys.forEach(mapping => {
        // Accéder à la mesure par clé (string index)
        const value = measurements[mapping.key as keyof MeasurementResults];
        if (value !== undefined && mapping.targetRef) {
          console.log(`[TBLImageFieldWithAI] Application: ${mapping.key} = ${value} → ${mapping.targetRef}`);
          onFieldUpdate(mapping.targetRef, value);
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
      <Space direction="vertical" style={{ width: '100%' }}>
        {/* Inputs file cachés */}
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
        
        {/* Boutons d'action - Simplifiés: uniquement multi-photo et mesure */}
        <Space wrap>
          {/* 🎯 SmartCamera IA (multi-photos) - Bouton principal */}
          {aiMeasure_enabled && (
            <>
              <Tooltip title="📸 Multi-photos + Mesures ArUco">
                <Button
                  icon={<ThunderboltOutlined />}
                  onClick={() => setShowSmartCamera(true)}
                  disabled={disabled || isAnalyzingAI}
                  size={size}
                  type="primary"
                  style={{ background: '#722ed1', borderColor: '#722ed1' }}
                >
                  Multi-Photo
                </Button>
              </Tooltip>
              
              {/* 🆕 Bouton pour rouvrir le canvas de mesure sur l'image existante */}
              {value && (
                <Tooltip title="📐 Mesurer l'image actuelle">
                  <Button
                    icon={<RobotOutlined />}
                    onClick={() => {
                      setProcessedImageUrl(typeof value === 'string' ? value : (value as any)?.original);
                      setProcessedImageBase64(
                        typeof value === 'string' 
                          ? value.split(',')[1] || value 
                          : (value as any)?.original?.split(',')[1] || (value as any)?.original
                      );
                      setShowMeasurementCanvas(true);
                    }}
                    disabled={disabled || isAnalyzingAI}
                    size={size}
                    type="default"
                    style={{ borderColor: '#1890ff', color: '#1890ff' }}
                  >
                    Mesurer
                  </Button>
                </Tooltip>
              )}
            </>
          )}
        </Space>
        
        {/* Aperçu de l'image */}
        {value && (
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img 
              src={typeof value === 'string' ? value : (value as any)?.original}
              alt="preview" 
              style={{ 
                width: '150px', 
                height: '150px', 
                objectFit: 'cover', 
                border: '1px solid #d9d9d9',
                borderRadius: '6px',
                opacity: isAnalyzingAI ? 0.5 : 1
              }} 
            />
            
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
          {/* Modal de capture SmartCamera multi-photos */}
          <SmartCaptureFlow
            visible={showSmartCamera}
            onClose={() => setShowSmartCamera(false)}
            onComplete={handleSmartCapture}
            targetObject="custom"
            objectLabel="panneau solaire"
          />
          
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
                fusedCorners: (photo.metadata as any)?.fusedCorners
              }
            }))}
            // 🎯 ULTRA-PRECISION: Passer les corners fusionnés si disponibles
            fusedCorners={(() => {
              const bestPhoto = capturedPhotos.find(p => (p.metadata as any)?.arucoDetected);
              const ultraPrecision = (bestPhoto?.metadata as any)?.ultraPrecision;
              if (ultraPrecision?.corners) {
                // Les corners sont déjà en % depuis l'API
                return {
                  topLeft: ultraPrecision.corners.topLeft,
                  topRight: ultraPrecision.corners.topRight,
                  bottomRight: ultraPrecision.corners.bottomRight,
                  bottomLeft: ultraPrecision.corners.bottomLeft
                };
              }
              return undefined;
            })()}
            // 🎯 Indiquer que l'homographie est prête si ArUco détecté
            homographyReady={capturedPhotos.some(p => (p.metadata as any)?.arucoDetected)}
            // 🔬 Analyse complète ArUco pour le panel d'infos détaillé
            arucoAnalysis={arucoAnalysis}
          />
        </>
      )}
    </div>
  );
};

export default TBLImageFieldWithAI;
