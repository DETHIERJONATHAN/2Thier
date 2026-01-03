/**
 * 📸 SmartCamera Module - Index
 * 
 * Système de capture photo/vidéo intelligent pour mesures précises
 * Version mobile optimisée (100% compatible tactile)
 */

// Composants principaux
export { default as SmartCameraMobile } from './SmartCameraMobile';
export { default as CalibrationMarker } from './CalibrationMarker';
export { default as VideoCapture } from './VideoCapture';
export { default as SmartCaptureFlow } from './SmartCaptureFlow';

// 🆕 Guide temps réel
export { default as RealTimeGuidanceOverlay } from './RealTimeGuidanceOverlay';
export { useRealTimeGuidance } from './useRealTimeGuidance';
export type { GuidanceState, UseRealTimeGuidanceOptions } from './useRealTimeGuidance';

// Types
export type { CapturedPhoto } from './SmartCameraMobile';

// Analyseur
export { 
  analyzePhotos,
  type MarkerDetection,
  type ShadowAnalysis,
  type GeometryEstimation,
  type PhotoQualityReport,
  type MultiPhotoAnalysis
} from './PhotoAnalyzer';

// Alias pour compatibilité arrière
export { default as SmartCamera } from './SmartCameraMobile';
