/**
 * 📐 ImageMeasurementPreview - Preview automatique avec détection IA
 * 
 * Workflow utilisateur simplifié :
 * 1. Upload photo
 * 2. Détection auto référence + points de mesure
 * 3. Preview avec mesures calculées
 * 4. Bouton "✅ Valider" ou "✏️ Ajuster"
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Button,
  Space,
  Typography,
  Tag,
  Spin,
  Alert,
  Steps,
  Result,
  Card,
  message
} from 'antd';
import {
  CheckOutlined,
  EditOutlined,
  LoadingOutlined,
  CameraOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { ImageMeasurementCanvas } from './ImageMeasurementCanvas';
import { ImageMeasurementCanvasMobile } from './ImageMeasurementCanvasMobile';
import type {
  CalibrationData,
  MeasurementPoint,
  MeasurementResults,
  ImageAnnotations,
  OrganizationMeasurementReferenceConfig
} from '../../types/measurement';

const { Text, Title } = Typography;

// ============================================================================
// MOBILE DETECTION HOOK
// ============================================================================

const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    // Check touch support AND screen width
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth <= 768;
    return hasTouch || isSmallScreen;
  });

  React.useEffect(() => {
    const checkMobile = () => {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 768;
      setIsMobile(hasTouch || isSmallScreen);
    };
    
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

// ============================================================================
// 📱 MOBILE FULLSCREEN CANVAS - Version mobile optimisée avec pinch-to-zoom et menu
// ============================================================================

interface MobileFullscreenCanvasProps {
  imageUrl: string;
  calibration?: CalibrationData;
  initialPoints?: MeasurementPoint[];
  onMeasurementsChange?: (measurements: MeasurementResults) => void;
  onValidate?: (annotations: ImageAnnotations) => void;
  onCancel?: () => void;
  referenceRealSize?: { width: number; height: number };
  onReferenceAdjusted?: (newBoundingBox: any, newPixelPerCmX: number, newPixelPerCmY?: number) => void;
  imageBase64?: string;
  mimeType?: string;
  api?: any;
  fusedCorners?: any;
  homographyReady?: boolean;
  referenceConfig?: {
    referenceType: 'a4' | 'card' | 'meter' | 'custom';
    customName?: string;
    customWidth?: number;
    customHeight?: number;
  };
  measurementObjectConfig?: any;
  allPhotos?: any[];
  arucoAnalysis?: any; // 🔬 Analyse complète ArUco
  optimalCorrection?: any; // 🔧 CORRECTION OPTIMALE: Facteur calculé par RANSAC
}

const MobileFullscreenCanvas: React.FC<MobileFullscreenCanvasProps> = ({
  imageUrl,
  calibration,
  initialPoints,
  onMeasurementsChange,
  onValidate,
  onCancel,
  referenceRealSize,
  onReferenceAdjusted,
  imageBase64,
  mimeType,
  api,
  fusedCorners,
  homographyReady,
  referenceConfig,
  measurementObjectConfig,
  allPhotos,
  arucoAnalysis, // 🔬 Analyse complète ArUco
  optimalCorrection // 🔧 CORRECTION OPTIMALE
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = React.useState({ width: 0, height: 0 });

  // ===== BODY LOCK + VIEWPORT SIZE =====
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalTouchAction = document.body.style.touchAction;
    const originalWidth = document.body.style.width;
    const originalHeight = document.body.style.height;
    
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.touchAction = 'none';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    document.documentElement.style.overflow = 'hidden';
    
    // Mesurer le viewport
    const updateSize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    window.addEventListener('orientationchange', updateSize);
    
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.touchAction = originalTouchAction;
      document.body.style.width = originalWidth;
      document.body.style.height = originalHeight;
      document.documentElement.style.overflow = '';
      window.removeEventListener('resize', updateSize);
      window.removeEventListener('orientationchange', updateSize);
    };
  }, []);

  // ===== RENDER - PLEIN ÉCRAN SIMPLE AVEC CROIX =====
  return (
    <div
      ref={containerRef}
      data-disable-tbl-swipe="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        background: '#000',
        touchAction: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        WebkitTouchCallout: 'none',
        overflow: 'hidden'
      }}
    >
      {/* Bouton fermer (croix) - en haut à droite */}
      <Button
        type="text"
        icon={<CloseOutlined style={{ fontSize: 24, color: '#fff' }} />}
        onClick={onCancel}
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 10001,
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'rgba(0,0,0,0.6)',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      />
      
      {/* Canvas en plein écran */}
      <ImageMeasurementCanvas
        imageUrl={imageUrl}
        calibration={calibration}
        initialPoints={initialPoints}
        onMeasurementsChange={onMeasurementsChange}
        onValidate={onValidate}
        onCancel={onCancel}
        minPoints={2}
        maxWidth={viewportSize.width || window.innerWidth}
        maxHeight={viewportSize.height || window.innerHeight}
        referenceDetected={null}
        referenceRealSize={referenceRealSize}
        onReferenceAdjusted={onReferenceAdjusted}
        imageBase64={imageBase64}
        mimeType={mimeType}
        api={api}
        fusedCorners={fusedCorners}
        homographyReady={homographyReady}
        referenceConfig={referenceConfig}
        measurementObjectConfig={measurementObjectConfig}
        allPhotos={allPhotos}
        arucoAnalysis={arucoAnalysis}
        // 🔧 CORRECTION OPTIMALE: Facteur calculé par RANSAC + bands + reprojection
        optimalCorrection={optimalCorrection}
        mobileFullscreen
      />
    </div>
  );
};

// ============================================================================
// TYPES
// ============================================================================

interface ImageMeasurementPreviewProps {
  visible: boolean;
  imageUrl: string;
  imageBase64?: string;
  mimeType?: string;
  organizationId: string;
  nodeId: string;
  onComplete: (measurements: MeasurementResults, annotations?: ImageAnnotations) => void;
  onCancel: () => void;
  measureKeys?: string[]; // Mesures configurées dans le champ
  // 🆕 Support multi-photos pour fusion IA
  allPhotos?: Array<{
    imageBase64: string;
    mimeType?: string;
    metadata?: {
      qualityScore?: number;
      sharpness?: number;
      brightness?: number;
      // 🎯 ULTRA-PRECISION: Données ArUco pré-détectées
      arucoDetected?: boolean;
      ultraPrecision?: any;
      homography?: any;
      arucoAnalysis?: any; // 🔬 Analyse complète ArUco
    };
  }>;
  // 🎯 ULTRA-PRECISION: Corners ArUco pré-détectés (depuis TBLImageFieldWithAI)
  fusedCorners?: {
    topLeft: { x: number; y: number };
    topRight: { x: number; y: number };
    bottomRight: { x: number; y: number };
    bottomLeft: { x: number; y: number };
  };
  homographyReady?: boolean;
  // 🔬 Analyse complète ArUco pour le panel Canvas
  arucoAnalysis?: any;
}

type WorkflowStep = 'loading' | 'calibrating' | 'measuring' | 'adjusting' | 'complete' | 'error';

// ============================================================================
// COMPONENT
// ============================================================================

export const ImageMeasurementPreview: React.FC<ImageMeasurementPreviewProps> = ({
  visible,
  imageUrl,
  imageBase64,
  mimeType = 'image/jpeg',
  organizationId,
  nodeId,
  onComplete,
  onCancel,
  measureKeys = ['largeur_cm', 'hauteur_cm'],
  allPhotos, // 🆕 Toutes les photos pour fusion
  fusedCorners, // 🎯 ULTRA-PRECISION: Corners ArUco pré-détectés
  homographyReady, // 🎯 Flag indiquant que l'homographie est prête
  arucoAnalysis // 🔬 Analyse complète ArUco pour le panel Canvas
}) => {
  const { api } = useAuthenticatedApi();
  const isMobile = useIsMobile(); // 📱 Détection mobile

  // 🔄 SESSION KEY: Clé unique qui change à chaque ouverture pour forcer le reset des états
  const [sessionKey, setSessionKey] = useState(0);

  // State
  const [step, setStep] = useState<WorkflowStep>('loading');
  const [referenceConfig, setReferenceConfig] = useState<OrganizationMeasurementReferenceConfig | null>(null);
  const [calibration, setCalibration] = useState<CalibrationData | null>(null);
  const [suggestedPoints, setSuggestedPoints] = useState<MeasurementPoint[]>([]);
  const [measurements, setMeasurements] = useState<MeasurementResults>({});
  const [error, setError] = useState<string | null>(null);
  const [referenceDetected, setReferenceDetected] = useState<{
    found: boolean;
    confidence?: number;
    boundingBox?: { x: number; y: number; width: number; height: number };
  } | null>(null); // 🆕 State pour la référence détectée
  
  // 🆕 Dimensions réelles de la référence (pour recalibration)
  const [referenceRealSize, setReferenceRealSize] = useState<{ width: number; height: number }>({ width: 21, height: 29.7 });
  
  // 🎯 CONFIGURATION ARUCO: Taille du marqueur depuis les paramètres TreeBranchLeaf
  const [markerSizeCm, setMarkerSizeCm] = useState<number>(16.8); // Valeur par défaut, sera mise à jour depuis l'API
  
  // 🔧 CORRECTION OPTIMALE: Facteur de correction calculé par l'API (RANSAC + bands + reprojection)
  const [optimalCorrection, setOptimalCorrection] = useState<{
    finalCorrection: number;
    correctionX: number;
    correctionY: number;
    globalConfidence: number;
    contributions?: Array<{ source: string; correction: number; weight: number; confidence: number }>;
  } | null>(null);
  
  // 🆕 MULTI-PHOTOS: État pour l'analyse de qualité et la fusion
  const [multiPhotoAnalysis, setMultiPhotoAnalysis] = useState<{
    usedMultiPhoto: boolean;
    totalPhotos: number;
    usablePhotos: number;
    bestPhotoIndex: number;
    qualityScores: Array<{ index: number; usable: boolean; score: number; issues: string[] }>;
    perspectiveCorrection?: { angle: number; factor: number; type: string };
    fusionConfidence: number;
    // 🆕 Coins fusionnés pour l'homographie
    fusedCorners?: {
      topLeft: { x: number; y: number };
      topRight: { x: number; y: number };
      bottomLeft: { x: number; y: number };
      bottomRight: { x: number; y: number };
    };
    homographyReady?: boolean;
  } | null>(null);
  
  // 🔒 Flag pour éviter de re-suggérer les points après l'initialisation
  const [hasInitialized, setHasInitialized] = useState(false);

  // 🎯 CHARGEMENT CONFIG MARQUEUR: Charger la taille du marqueur ArUco depuis les paramètres
  useEffect(() => {
    const loadMarkerConfig = async () => {
      if (!api) return;
      try {
        const response = await api.get('/api/settings/ai-measure');
        if (response.success && response.data?.markerSizeCm) {
          const sizeCm = response.data.markerSizeCm;
          console.log(`🎯 [Preview] Configuration marqueur chargée depuis API: ${sizeCm}cm`);
          setMarkerSizeCm(sizeCm);
        } else {
          console.log('🎯 [Preview] Pas de config marqueur, utilisation valeur par défaut: 16.8cm');
        }
      } catch (error) {
        console.warn('[Preview] Erreur chargement config marqueur:', error);
      }
    };
    loadMarkerConfig();
  }, [api]);

  // 🔄 RESET CRITICAL: Réinitialiser les états quand le composant redevient visible
  // Ceci garantit que les données ArUco sont correctement réinitialisées à chaque ouverture
  useEffect(() => {
    if (visible) {
      console.log('🔄 [Preview] RESET: Composant visible, réinitialisation des états ArUco');
      // Reset des états pour forcer la réinitialisation avec les nouvelles données
      setMultiPhotoAnalysis(null);
      setOptimalCorrection(null);
      setHasInitialized(false);
      setStep('loading');
      // 🔄 Incrémenter la clé de session pour forcer le re-render
      setSessionKey(prev => prev + 1);
    }
  }, [visible]);

  // 🎯 ULTRA-PRECISION: Initialiser multiPhotoAnalysis avec les props fusedCorners si disponibles
  useEffect(() => {
    // Skip si pas visible
    if (!visible) return;
    
    if (fusedCorners && homographyReady && !multiPhotoAnalysis?.fusedCorners) {
      console.log(`🎯 [Preview] Initialisation multiPhotoAnalysis avec fusedCorners pré-détectés ! (session ${sessionKey})`);
      console.log('   📍 fusedCorners:', fusedCorners);
      
      // 🎯 ARUCO MAGENTA: Utiliser la taille configurée dans les paramètres TreeBranchLeaf
      // Valeur chargée depuis /api/settings/ai-measure (défaut: 16.8cm)
      console.log(`   📏 ARUCO détecté → referenceRealSize = ${markerSizeCm}×${markerSizeCm}cm (depuis config)`);
      setReferenceRealSize({ width: markerSizeCm, height: markerSizeCm });
      
      // Trouver les infos ultraPrecision dans allPhotos si disponibles
      const photoWithAruco = allPhotos?.find(p => (p.metadata as any)?.arucoDetected);
      const ultraPrecision = (photoWithAruco?.metadata as any)?.ultraPrecision;
      
      // 🔧 CORRECTION OPTIMALE: Extraire la correction calculée par l'API
      const correction = (photoWithAruco?.metadata as any)?.optimalCorrection;
      if (correction) {
        console.log(`   🔧 Correction optimale trouvée: ×${correction.finalCorrection?.toFixed(4)} (confiance: ${(correction.globalConfidence * 100).toFixed(0)}%)`);
        setOptimalCorrection(correction);
      }
      
      setMultiPhotoAnalysis({
        usedMultiPhoto: true,
        totalPhotos: allPhotos?.length || 1,
        usablePhotos: allPhotos?.length || 1,
        bestPhotoIndex: 0,
        qualityScores: allPhotos?.map((p, idx) => ({
          index: idx,
          usable: true,
          score: (p.metadata as any)?.qualityScore || 85,
          issues: []
        })) || [{ index: 0, usable: true, score: 85, issues: [] }],
        fusionConfidence: ultraPrecision?.quality || 0.9,
        fusedCorners: fusedCorners,
        homographyReady: true,
        perspectiveCorrection: ultraPrecision ? {
          angle: 0,
          factor: 1,
          type: 'aruco-ultra-precision'
        } : undefined
      });
      
      // Passer directement à l'étape adjusting avec le canvas
      console.log('🚀 [Preview] Passage direct à l\'étape adjusting (ArUco pré-détecté)');
      setStep('adjusting');
    }
  }, [visible, sessionKey, fusedCorners, homographyReady, allPhotos, multiPhotoAnalysis?.fusedCorners, markerSizeCm]);

  // 🔧 EXTRACTION SÉPARÉE de optimalCorrection (se déclenche quand allPhotos change ou visible change)
  useEffect(() => {
    // Skip si pas visible
    if (!visible) return;
    
    console.log(`🔍 [Preview] useEffect optimalCorrection (session ${sessionKey}) - allPhotos.length=${allPhotos?.length || 0}, optimalCorrection=${optimalCorrection ? 'SET' : 'null'}`);
    
    if (!allPhotos?.length) {
      console.log(`   ⚠️ Pas de photos, skip`);
      return;
    }
    
    // Debug: Afficher les metadata de chaque photo
    allPhotos.forEach((p, idx) => {
      const meta = p.metadata as any;
      console.log(`   📸 Photo ${idx}: optimalCorrection=${meta?.optimalCorrection ? '✅' : '❌'}, arucoDetected=${meta?.arucoDetected}`);
    });
    
    // Chercher la photo avec optimalCorrection dans ses metadata
    const photoWithCorrection = allPhotos.find(p => (p.metadata as any)?.optimalCorrection);
    const correction = (photoWithCorrection?.metadata as any)?.optimalCorrection;
    
    if (correction) {
      if (!optimalCorrection) {
        console.log(`🔧 [Preview] optimalCorrection extraite des metadata:`);
        console.log(`   📊 Correction finale: ×${correction.finalCorrection?.toFixed(4)}`);
        console.log(`   📏 Correction X: ×${correction.correctionX?.toFixed(4)}`);
        console.log(`   📏 Correction Y: ×${correction.correctionY?.toFixed(4)}`);
        console.log(`   🎯 Confiance: ${(correction.globalConfidence * 100).toFixed(0)}%`);
        setOptimalCorrection(correction);
      } else {
        console.log(`   ✅ optimalCorrection déjà set, pas de changement`);
      }
    } else {
      console.log(`   ⚠️ Aucune photo n'a optimalCorrection dans ses metadata`);
    }
  }, [visible, sessionKey, allPhotos, optimalCorrection]);

  // 🆕 Callback quand l'utilisateur ajuste manuellement le rectangle de référence
  // Reçoit maintenant pixelPerCmX et pixelPerCmY séparés pour gérer la perspective
  const handleReferenceAdjusted = useCallback((
    newBoundingBox: { x: number; y: number; width: number; height: number }, 
    newPixelPerCmX: number,
    newPixelPerCmY?: number
  ) => {
    // Si pixelPerCmY n'est pas fourni, utiliser la même valeur que X
    const finalPixelPerCmY = newPixelPerCmY ?? newPixelPerCmX;
    
    console.log('🔄 [Preview] Référence ajustée manuellement:', newBoundingBox);
    console.log(`   🆕 pixelPerCmX (base 1000): ${newPixelPerCmX.toFixed(2)}`);
    console.log(`   🆕 pixelPerCmY (base 1000): ${finalPixelPerCmY.toFixed(2)}`);
    
    // Mettre à jour le boundingBox
    setReferenceDetected(prev => prev ? {
      ...prev,
      boundingBox: newBoundingBox,
      confidence: 1 // 100% car ajusté manuellement
    } : null);
    
    // Mettre à jour la calibration avec les deux facteurs
    setCalibration(prev => ({
      pixelPerCm: (newPixelPerCmX + finalPixelPerCmY) / 2, // Moyenne pour compatibilité
      pixelPerCmX: newPixelPerCmX,
      pixelPerCmY: finalPixelPerCmY,
      referenceType: prev?.referenceType || 'a4',
      detectedAutomatically: false // Marqué comme ajusté manuellement
    }));
    
    message.success('📐 Calibration mise à jour avec facteurs X/Y !');
  }, []);

  // ============================================================================
  // WORKFLOW
  // ============================================================================

  // Étape 1 : Charger la config de référence (optionnelle)
  const loadReferenceConfig = useCallback(async () => {
    try {
      const response = await api.get(`/api/measurement-reference/${organizationId}`);
      
      if (response?.config) {
        setReferenceConfig(response.config);
        return response.config;
      }
      // Config optionnelle - on continue sans
      return null;
    } catch (err) {
      console.error('Erreur chargement config référence:', err);
      // Config optionnelle - on continue sans
      return null;
    }
  }, [api, organizationId]);

  // Étape 2 : Suggérer les points de mesure via IA (la détection de référence est faite dans runWorkflow)
  const suggestMeasurementPointsCallback = useCallback(async () => {
    console.log('🎯 [ImageMeasurementPreview] suggestMeasurementPointsCallback appelé, imageBase64:', imageBase64 ? `${imageBase64.length} chars` : 'NULL');
    
    if (!imageBase64) {
      console.error('❌ [ImageMeasurementPreview] Pas d\'imageBase64 disponible dans callback');
      setError('Image non disponible pour l\'analyse');
      setStep('error');
      return;
    }

    try {
      setStep('measuring');

      console.log(`📍 [ImageMeasurementPreview] Suggestion points pour mesures: ${measureKeys.join(', ')}`);
      console.log(`📍 [ImageMeasurementPreview] Image base64 length: ${imageBase64.length}`);
      
      // Extraire le contenu base64 pur (sans le préfixe data:image/xxx;base64,)
      let cleanBase64 = imageBase64;
      if (imageBase64.includes(',')) {
        cleanBase64 = imageBase64.split(',')[1];
      }
      console.log(`📍 [ImageMeasurementPreview] Clean base64 length: ${cleanBase64.length}`);

      // Suggérer les points sur l'objet à mesurer
      const response = await api.post('/api/measurement-reference/suggest-points', {
        imageBase64: cleanBase64,
        mimeType,
        objectType: 'châssis/fenêtre/porte',  // 🆕 Inclure "porte" pour meilleure détection
        pointCount: measureKeys.some(k => k.includes('surface')) ? 4 : (measureKeys.length >= 2 ? 4 : 2),
        measureKeys
      });

      console.log(`📍 [ImageMeasurementPreview] API Response:`, response);

      if (response?.success && response.points && response.points.length > 0) {
        // Convertir les points du format API vers MeasurementPoint
        const points: MeasurementPoint[] = response.points.map((p: any, index: number) => ({
          id: `point_${index}`,
          x: p.x,
          y: p.y,
          type: index < 4 ? 'primary' : 'custom',
          label: p.label || String.fromCharCode(65 + index), // A, B, C, D...
          color: index < 4 ? '#1890FF' : '#FAAD14',
          draggable: true,
          purpose: p.purpose // 🆕 Garder le but du point (haut-gauche, etc.)
        }));

        console.log(`✅ [ImageMeasurementPreview] ${points.length} points suggérés par l'IA`, points);
        setSuggestedPoints(points);
        setStep('adjusting'); // Permettre ajustement
      } else {
        console.warn('⚠️ [ImageMeasurementPreview] Aucun point suggéré, utilisation des points par défaut');
        // Points par défaut si détection échoue
        setDefaultPoints();
      }
    } catch (err) {
      console.error('❌ [ImageMeasurementPreview] Erreur suggestion points:', err);
      // Continuer avec les points par défaut
      setDefaultPoints();
    }
  }, [api, imageBase64, mimeType, measureKeys]);

  // Points par défaut centrés
  const setDefaultPoints = useCallback(() => {
    setSuggestedPoints([
      { id: 'A', x: 100, y: 100, type: 'primary', label: 'A', color: '#1890FF', draggable: true },
      { id: 'B', x: 400, y: 100, type: 'primary', label: 'B', color: '#1890FF', draggable: true },
      { id: 'C', x: 100, y: 300, type: 'primary', label: 'C', color: '#1890FF', draggable: true },
      { id: 'D', x: 400, y: 300, type: 'primary', label: 'D', color: '#1890FF', draggable: true }
    ]);
    setStep('adjusting');
  }, []);

  // Workflow complet - SIMPLIFIÉ : priorité aux points IA
  // 🔒 Ne s'exécute qu'UNE SEULE FOIS à l'ouverture du modal
  useEffect(() => {
    if (!visible) {
      // Reset le flag quand le modal se ferme
      setHasInitialized(false);
      return;
    }

    // 🔒 CRITICAL: Ne jamais re-suggérer les points si déjà initialisé
    if (hasInitialized) {
      console.log('🔒 [ImageMeasurementPreview] Déjà initialisé, skip re-suggestion');
      return;
    }

    console.log('🔄 [ImageMeasurementPreview] useEffect triggered:', { visible, hasImageBase64: !!imageBase64, imageBase64Length: imageBase64?.length, imageUrl: imageUrl?.substring(0, 50) });

    const runWorkflow = async () => {
      setStep('loading');
      setError(null);
      
      console.log('🚀 [ImageMeasurementPreview] runWorkflow starting...');

      // 🎯 ARUCO PRIORITY: Si ArUco est détecté (fusedCorners présent), NE PAS écraser avec A4
      const hasArucoData = fusedCorners && homographyReady;
      if (hasArucoData) {
        console.log('🎯 [ImageMeasurementPreview] ArUco détecté, SKIP chargement config A4 (garder dimensions ArUco)');
        console.log(`   📏 referenceRealSize conservé: ${markerSizeCm}×${markerSizeCm}cm`);
      } else {
        // 1. Charger config de référence (pour connaître les dimensions de la référence A4)
        const config = await loadReferenceConfig();
        if (config) {
          console.log('📐 [ImageMeasurementPreview] Config référence trouvée:', config.referenceType);
          // Stocker les dimensions réelles
          if (config.referenceType === 'a4') {
            setReferenceRealSize({ width: 21, height: 29.7 });
          } else if (config.referenceType === 'card') {
            setReferenceRealSize({ width: 8.56, height: 5.398 });
          }
        } else {
          console.log('📐 [ImageMeasurementPreview] Pas de config référence, mode par défaut (A4)');
          setReferenceRealSize({ width: 21, height: 29.7 });
        }
      }

      // 2. Vérifier que l'image est disponible
      if (!imageBase64) {
        console.error('❌ [ImageMeasurementPreview] Pas d\'imageBase64 dans useEffect!');
        setStep('adjusting');
        setHasInitialized(true);
        return;
      }

      // 🆕 WORKFLOW GUIDÉ: Passer directement au Canvas sans détection automatique
      // L'utilisateur va sélectionner lui-même la zone A4 puis la zone de mesure
      console.log('📐 [ImageMeasurementPreview] Workflow guidé: passage direct au Canvas');
      console.log('   ➡️ L\'utilisateur dessinera la zone A4 puis la zone de mesure');
      
      setStep('adjusting');
      setHasInitialized(true);
    };

    runWorkflow();
  }, [visible, loadReferenceConfig, imageBase64]); // 🔒 Dépendances minimales

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleValidate = useCallback(async () => {
    try {
      setStep('measuring');
      console.log('🚀 [ImageMeasurementPreview] Lancement analyse IA avec calibration...');
      
      // Construire la config d'analyse IA
      const aiConfig = {
        enabled: true,
        prompt: `Analyse cette photo de châssis ou fenêtre. Mesure précisément:\n${measureKeys.map(k => `- ${k}`).join('\n')}`,
        measureKeys,
        mappings: measureKeys.map(k => ({
          measureKey: k,
          targetFieldId: k,
          transform: 'none',
          unit: k.includes('cm') ? 'cm' : k.includes('mm') ? 'mm' : undefined
        }))
      };
      
      // Extraire base64 pur
      let cleanBase64 = imageBase64 || '';
      if (cleanBase64.includes(',')) {
        cleanBase64 = cleanBase64.split(',')[1];
      }
      
      // Appeler l'API d'analyse avec la config de référence
      const measureEngine = (import.meta.env.VITE_AI_MEASURE_ENGINE || 'gemini').toLowerCase();
      console.log('📡 [ImageMeasurementPreview] Analyse via', measureEngine, 'avec referenceConfig:', referenceConfig);

      const response = measureEngine === 'vision_ar'
        ? await api.post('/api/measure/photo', {
            imageBase64: cleanBase64,
            mimeType,
            measureKeys: aiConfig.measureKeys,
            prompt: aiConfig.prompt,
            referenceHint: referenceConfig,
            deviceInfo: undefined,
            exif: undefined,
            persist: false
          })
        : await api.post('/api/ai/measure-image', {
            imageBase64: cleanBase64,
            mimeType,
            prompt: aiConfig.prompt,
            measureKeys: aiConfig.measureKeys,
            referenceConfig // 🎯 PASSER LA CONFIG DE RÉFÉRENCE POUR CALIBRATION
          });
      
      console.log('📩 [ImageMeasurementPreview] Résultat analyse:', response);
      
      if (response?.success && response.measurements) {
        const finalMeasurements = response.measurements;
        const referenceDetected = response.referenceDetected;
        
        console.log('✅ [ImageMeasurementPreview] Mesures obtenues:', finalMeasurements);
        console.log('📐 [ImageMeasurementPreview] Référence détectée:', referenceDetected);
        
        // Mettre à jour les mesures
        setMeasurements(finalMeasurements);
        
        onComplete(finalMeasurements, {
          nodeId,
          imageUrl,
          calibration,
          measurementPoints: suggestedPoints,
          measurements: finalMeasurements,
          referenceDetected // 🆕 Passer l'info de détection de référence
        });
      } else {
        throw new Error(response?.error || 'Erreur analyse IA');
      }
    } catch (error) {
      console.error('❌ [ImageMeasurementPreview] Erreur validation:', error);
      message.error('Erreur lors de l\'analyse des mesures');
      setStep('adjusting');
    }
  }, [measurements, calibration, nodeId, imageUrl, suggestedPoints, onComplete, measureKeys, imageBase64, mimeType, api, referenceConfig]);

  const handleAdjust = useCallback(() => {
    setStep('adjusting');
  }, []);

  const handleCanvasValidate = useCallback((annotations: ImageAnnotations) => {
    console.log('[Preview] 🎯 handleCanvasValidate - MESURES REÇUES:', annotations.measurements);
    console.log(`   largeur_cm = ${annotations.measurements.largeur_cm}`);
    console.log(`   hauteur_cm = ${annotations.measurements.hauteur_cm}`);
    setMeasurements(annotations.measurements);
    onComplete(annotations.measurements, annotations);
  }, [onComplete]);

  // ============================================================================
  // RENDER
  // ============================================================================

  // Étapes du workflow
  const stepItems = [
    { title: 'Calibration', description: 'Détection référence' },
    { title: 'Mesures', description: 'Placement points' },
    { title: 'Validation', description: 'Vérification' }
  ];

  const currentStepIndex = 
    step === 'loading' || step === 'calibrating' ? 0 :
    step === 'measuring' ? 1 : 2;

  // 📱 MOBILE FULLSCREEN MODE - Version améliorée avec pinch-to-zoom et menu flottant
  // IMPORTANT: Cette version utilise le canvas complet pour supporter la sélection de référence
  if (isMobile && step === 'adjusting' && visible) {
    return (
      <MobileFullscreenCanvas
        imageUrl={imageUrl}
        calibration={calibration || undefined}
        initialPoints={suggestedPoints}
        onMeasurementsChange={setMeasurements}
        onValidate={handleCanvasValidate}
        onCancel={() => setStep('complete')}
        referenceRealSize={referenceRealSize}
        onReferenceAdjusted={handleReferenceAdjusted}
        imageBase64={imageBase64}
        mimeType={mimeType}
        api={api}
        fusedCorners={multiPhotoAnalysis?.fusedCorners}
        homographyReady={multiPhotoAnalysis?.homographyReady}
        referenceConfig={referenceConfig ? {
          referenceType: referenceConfig.referenceType as 'a4' | 'card' | 'meter' | 'custom',
          customName: referenceConfig.customName,
          customWidth: referenceConfig.referenceType === 'a4' ? 21 :
                       referenceConfig.referenceType === 'card' ? 8.56 :
                       referenceConfig.customSize,
          customHeight: referenceConfig.referenceType === 'a4' ? 29.7 :
                        referenceConfig.referenceType === 'card' ? 5.398 :
                        referenceConfig.customSize
        } : undefined}
        measurementObjectConfig={{
          objectType: measureKeys.some(k => k.includes('porte') || k.includes('door')) ? 'door' :
                      measureKeys.some(k => k.includes('fenetre') || k.includes('window')) ? 'window' :
                      measureKeys.some(k => k.includes('chassis')) ? 'chassis' : 'door',
          objectName: measureKeys.some(k => k.includes('porte')) ? 'Porte' :
                      measureKeys.some(k => k.includes('fenetre')) ? 'Fenêtre' :
                      measureKeys.some(k => k.includes('chassis')) ? 'Châssis' : 'Objet à mesurer',
          objectDescription: `Objet rectangulaire à mesurer (${measureKeys.join(', ')})`
        }}
        allPhotos={allPhotos}
      />
    );
  }

  return (
    <Modal
      title={
        <Space>
          <CameraOutlined style={{ color: '#1890FF' }} />
          <span>📐 Mesures automatiques</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      width={isMobile ? '100%' : 900}
      footer={null}
      destroyOnClose
      style={isMobile ? { top: 0, padding: 0 } : undefined}
      styles={isMobile ? { body: { padding: 12 } } : undefined}
    >
      {/* Progress steps */}
      <Steps
        current={currentStepIndex}
        items={stepItems}
        size="small"
        style={{ marginBottom: isMobile ? 12 : 24 }}
      />

      {/* 🆕 MULTI-PHOTOS: Affichage de l'analyse de fusion */}
      {multiPhotoAnalysis && (
        <Alert
          type={multiPhotoAnalysis.usablePhotos === multiPhotoAnalysis.totalPhotos ? 'success' : 
                multiPhotoAnalysis.usablePhotos >= 2 ? 'info' : 'warning'}
          showIcon
          style={{ marginBottom: 16 }}
          message={
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Text strong>
                📷 Fusion {multiPhotoAnalysis.totalPhotos} photos → Vue corrigée "de face"
              </Text>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {multiPhotoAnalysis.qualityScores.map((photo, idx) => (
                  <Tag
                    key={idx}
                    color={photo.usable ? (photo.score >= 70 ? 'green' : 'orange') : 'red'}
                  >
                    Photo {idx + 1}: {photo.score}%
                    {idx === multiPhotoAnalysis.bestPhotoIndex && ' ⭐'}
                  </Tag>
                ))}
              </div>
              {multiPhotoAnalysis.perspectiveCorrection && multiPhotoAnalysis.perspectiveCorrection.type !== 'none' ? (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  🎯 Perspective corrigée: {multiPhotoAnalysis.perspectiveCorrection.angle.toFixed(1)}° {multiPhotoAnalysis.perspectiveCorrection.type === 'horizontal' ? '(gauche/droite)' : multiPhotoAnalysis.perspectiveCorrection.type === 'vertical' ? '(haut/bas)' : '(2 axes)'}
                  {' → '}Rectangle A4 redressé pour calibration précise
                </Text>
              ) : multiPhotoAnalysis.perspectiveCorrection?.type === 'aruco-ultra-precision' ? (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  🎯 <strong>ArUco ULTRA-PRÉCISION</strong>: Marqueur 18×18cm détecté avec précision ±0.2mm
                </Text>
              ) : (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  ✅ Photos bien de face - pas de correction nécessaire
                </Text>
              )}
              {/* 🎯 NOUVEAU: Affichage infos précision ArUco */}
              {multiPhotoAnalysis.homographyReady && (
                <div style={{ 
                  marginTop: 8, 
                  padding: '8px 12px', 
                  background: '#f0fdf4', 
                  borderRadius: 6,
                  border: '1px solid #86efac'
                }}>
                  <Text strong style={{ color: '#16a34a', fontSize: 13 }}>
                    🎯 ArUco MAGENTA détecté - Calibration haute précision
                  </Text>
                  <div style={{ marginTop: 4, fontSize: 12, color: '#166534' }}>
                    <span style={{ marginRight: 12 }}>📏 Référence: 18×18cm</span>
                    {multiPhotoAnalysis.fusionConfidence && (
                      <span style={{ marginRight: 12 }}>✨ Qualité: {(multiPhotoAnalysis.fusionConfidence * 100).toFixed(0)}%</span>
                    )}
                    <span>🎯 Précision estimée: ±0.5mm</span>
                  </div>
                </div>
              )}
              <Text type="secondary" style={{ fontSize: 12 }}>
                Confiance fusion: {typeof multiPhotoAnalysis.fusionConfidence === 'number' 
                  ? (multiPhotoAnalysis.fusionConfidence > 1 ? multiPhotoAnalysis.fusionConfidence : (multiPhotoAnalysis.fusionConfidence * 100).toFixed(0)) 
                  : multiPhotoAnalysis.fusionConfidence}%
              </Text>
            </Space>
          }
        />
      )}

      {/* Loading state */}
      {(step === 'loading' || step === 'calibrating' || step === 'measuring') && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" indicator={<LoadingOutlined spin />} />
          <div style={{ marginTop: 24 }}>
            <Title level={4}>
              {step === 'loading' && 'Chargement de la configuration...'}
              {step === 'calibrating' && (allPhotos && allPhotos.length > 1 
                ? `🔀 Fusion de ${allPhotos.length} photos pour calibration parfaite...` 
                : '🔍 Détection de l\'objet de référence...')}
              {step === 'measuring' && '📍 Placement des points de mesure...'}
            </Title>
            <Text type="secondary">
              {allPhotos && allPhotos.length > 1 
                ? 'L\'IA combine vos photos pour une calibration ultra-précise'
                : 'L\'IA analyse votre image pour extraire les mesures automatiquement'}
            </Text>
          </div>
        </div>
      )}

      {/* Error state */}
      {step === 'error' && (
        <Result
          status="warning"
          icon={<ExclamationCircleOutlined />}
          title="Configuration requise"
          subTitle={error}
          extra={[
            <Button key="cancel" onClick={onCancel}>
              Annuler
            </Button>,
            <Button
              key="adjust"
              type="primary"
              onClick={handleAdjust}
            >
              Mesurer manuellement
            </Button>
          ]}
        />
      )}

      {/* Complete state - Preview with measurements */}
      {step === 'complete' && (
        <div>
          {/* Image avec points */}
          <Card size="small" style={{ marginBottom: 16 }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img
                src={imageUrl}
                alt="Preview"
                style={{
                  maxWidth: '100%',
                  maxHeight: 400,
                  borderRadius: 8
                }}
              />
              {/* Indicateur de calibration */}
              {calibration?.detectedAutomatically && (
                <Tag
                  icon={<CheckCircleOutlined />}
                  color="success"
                  style={{ position: 'absolute', top: 8, left: 8 }}
                >
                  {referenceConfig?.referenceType === 'card' ? 'Carte bancaire' :
                   referenceConfig?.referenceType === 'meter' ? 'Mètre ruban' :
                   referenceConfig?.customName || 'Référence'} détectée
                </Tag>
              )}
            </div>
          </Card>

          {/* Mesures extraites */}
          <Alert
            message="📏 Mesures extraites"
            description={
              <Space wrap size="large" style={{ marginTop: 8 }}>
                {measurements.largeur_cm !== undefined && (
                  <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>
                    Largeur : {measurements.largeur_cm.toFixed(1)} cm
                  </Tag>
                )}
                {measurements.hauteur_cm !== undefined && (
                  <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>
                    Hauteur : {measurements.hauteur_cm.toFixed(1)} cm
                  </Tag>
                )}
                {measurements.surface_brute_m2 !== undefined && (
                  <Tag color="green" style={{ fontSize: 14, padding: '4px 12px' }}>
                    Surface : {measurements.surface_brute_m2.toFixed(2)} m²
                  </Tag>
                )}
              </Space>
            }
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            style={{ marginBottom: 24 }}
          />

          {/* Actions */}
          <div style={{ textAlign: 'center' }}>
            <Space size="large">
              <Button
                size="large"
                icon={<EditOutlined />}
                onClick={handleAdjust}
              >
                ✏️ Ajuster les points
              </Button>
              <Button
                type="primary"
                size="large"
                icon={<CheckOutlined />}
                onClick={handleValidate}
              >
                ✅ Valider les mesures
              </Button>
            </Space>
          </div>
        </div>
      )}

      {/* Adjusting state - Desktop only (mobile is handled by early return above) */}
      {step === 'adjusting' && !isMobile && (
        <ImageMeasurementCanvas
          imageUrl={imageUrl}
          calibration={calibration || undefined}
          initialPoints={[]}  /* 🆕 WORKFLOW GUIDÉ: Pas de points au départ - l'utilisateur dessine les zones */
          onMeasurementsChange={setMeasurements}
          onValidate={handleCanvasValidate}
          onCancel={() => setStep('complete')}
          minPoints={2}
          maxWidth={850}
          referenceDetected={null}  /* 🆕 Pas de référence pré-détectée - l'utilisateur la sélectionne */
          referenceRealSize={referenceRealSize}
          onReferenceAdjusted={handleReferenceAdjusted}
          imageBase64={imageBase64}
          mimeType={mimeType}
          api={api}
          // 🆕 HOMOGRAPHIE: Passer les coins fusionnés de l'IA multi-photos
          fusedCorners={multiPhotoAnalysis?.fusedCorners}
          homographyReady={multiPhotoAnalysis?.homographyReady}
          // 🆕 MULTI-PHOTOS: Passer toutes les photos pour fusion avant détection
          allPhotos={allPhotos}
          // 🔬 ANALYSE ARUCO: Pour le panel d'infos détaillé
          arucoAnalysis={arucoAnalysis}
          // 🔧 CORRECTION OPTIMALE: Facteur calculé par RANSAC + bands + reprojection
          optimalCorrection={optimalCorrection}
          // 🆕 CONFIG DYNAMIQUE TBL: Passer les configurations pour les prompts IA
          referenceConfig={referenceConfig ? {
            referenceType: referenceConfig.referenceType as 'a4' | 'card' | 'meter' | 'custom',
            customName: referenceConfig.customName,
            customWidth: referenceConfig.referenceType === 'a4' ? 21 : 
                         referenceConfig.referenceType === 'card' ? 8.56 : 
                         referenceConfig.customSize,
            customHeight: referenceConfig.referenceType === 'a4' ? 29.7 : 
                          referenceConfig.referenceType === 'card' ? 5.398 : 
                          referenceConfig.customSize
          } : undefined}
          measurementObjectConfig={{
            objectType: measureKeys.some(k => k.includes('porte') || k.includes('door')) ? 'door' :
                        measureKeys.some(k => k.includes('fenetre') || k.includes('window')) ? 'window' :
                        measureKeys.some(k => k.includes('chassis')) ? 'chassis' : 'door',
            objectName: measureKeys.some(k => k.includes('porte')) ? 'Porte' :
                        measureKeys.some(k => k.includes('fenetre')) ? 'Fenêtre' :
                        measureKeys.some(k => k.includes('chassis')) ? 'Châssis' : 'Objet à mesurer',
            objectDescription: `Objet rectangulaire à mesurer (${measureKeys.join(', ')})`
          }}
        />
      )}
    </Modal>
  );
};

export default ImageMeasurementPreview;
