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
   * Handler pour le SmartCamera (capture multi-photos avec fusion + IA)
   */
  const handleSmartCapture = useCallback(async (photos: CapturedPhoto[], analysis: MultiPhotoAnalysis) => {
    console.log('[TBLImageFieldWithAI] SmartCamera capture:', photos.length, 'photos', 'analysis:', analysis);
    
    if (photos.length === 0) {
      message.error('Aucune photo capturée');
      setShowSmartCamera(false);
      return;
    }
    
    // Sauvegarder les photos pour le canvas de mesure
    setCapturedPhotos(photos);
    
    // Utiliser l'image fusionnée si disponible, sinon la première photo
    // CORRECTION: La propriété s'appelle imageBase64, pas dataUrl !
    const mainPhotoBase64 = photos[0]?.imageBase64 || '';
    const imageToProcess = analysis?.fusedImage || mainPhotoBase64;
    
    console.log('[TBLImageFieldWithAI] imageToProcess:', imageToProcess ? `${imageToProcess.substring(0, 50)}...` : 'NULL');
    
    if (!imageToProcess) {
      message.error('Aucune image disponible pour le traitement');
      setShowSmartCamera(false);
      return;
    }
    
    // Extraire le base64 (après la virgule du data URL) ou utiliser directement si déjà base64
    const base64Part = imageToProcess.includes(',') 
      ? imageToProcess.split(',')[1] 
      : imageToProcess;
    
    console.log('[TBLImageFieldWithAI] Setting processedImageUrl (canvas will NOT open automatically)');
    console.log('[TBLImageFieldWithAI] base64Part length:', base64Part?.length || 0);
    
    // IMPORTANT: Mettre à jour les états dans le bon ordre
    setProcessedImageUrl(imageToProcess);
    setProcessedImageBase64(base64Part);
    setIsFromSmartCapture(true); // Marquer comme venant de SmartCapture
    
    // Fermer SmartCamera
    setShowSmartCamera(false);
    
    // NE PAS ouvrir le canvas automatiquement - l'utilisateur cliquera sur le bouton "Mesurer l'image actuelle"
    const qualityScore = analysis?.quality?.overall || analysis?.photos?.[0]?.quality || 75;
    message.success(`📸 ${photos.length} photo(s) capturée(s) avec succès ! Qualité: ${qualityScore}%`);
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
        
        {/* Boutons d'action */}
        <Space wrap>
          {/* Dropdown avec galerie + caméra - Caché si image vient de SmartCapture */}
          {!isFromSmartCapture && (
            <>
              <Dropdown 
                menu={{ items: uploadMenuItems }} 
                disabled={disabled || isAnalyzingAI}
                trigger={['click']}
              >
                <Button 
                  icon={<CameraOutlined />}
                  disabled={disabled || isAnalyzingAI}
                  size={size}
                  style={style}
                  type={value ? 'default' : 'primary'}
                >
                  {value ? 'Modifier' : '📷 Photo / Galerie'} ▾
                </Button>
              </Dropdown>
              
              {/* Bouton rapide caméra (mobile) */}
              <Tooltip title="Ouvrir l'appareil photo">
                <Button
                  icon={<VideoCameraOutlined />}
                  onClick={openCamera}
                  disabled={disabled || isAnalyzingAI}
                  size={size}
                  type="default"
                />
              </Tooltip>
            </>
          )}
          
          {/* 🎯 NOUVEAU: SmartCamera IA (multi-photos) - Visible si capacité aiMeasure activée */}
          {aiMeasure_enabled && (
            <>
              <Tooltip title="Capture IA multi-photos (3+ photos)">
                <Button
                  icon={<ThunderboltOutlined />}
                  onClick={() => setShowSmartCamera(true)}
                  disabled={disabled || isAnalyzingAI}
                  size={size}
                  type="default"
                  style={{ borderColor: '#722ed1', color: '#722ed1' }}
                />
              </Tooltip>
              
              {/* 🆕 Bouton pour rouvrir le canvas de mesure sur l'image existante */}
              {value && (
                <Tooltip title="Mesurer l'image actuelle">
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
                  />
                </Tooltip>
              )}
              
              <Tooltip title="Configurer les objets de référence">
                <Button
                  icon={<SettingOutlined />}
                  onClick={() => setShowReferenceConfig(true)}
                  disabled={disabled || isAnalyzingAI}
                  size={size}
                  type="default"
                />
              </Tooltip>
            </>
          )}
        </Space>
        
        {/* Badge AI si activé */}
        {isAIEnabled && (
          <Tag color="purple" icon={<RobotOutlined />}>
            Analyse IA activée {autoTrigger ? '(auto)' : '(manuel)'}
          </Tag>
        )}
        
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
                qualityScore: photo.metadata?.quality?.overallScore || 85,
                sharpness: photo.metadata?.quality?.sharpness || 85,
                brightness: photo.metadata?.lighting?.brightness || 128
              }
            }))}
          />
        </>
      )}
    </div>
  );
};

export default TBLImageFieldWithAI;
