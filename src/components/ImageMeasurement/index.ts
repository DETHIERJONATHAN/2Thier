/**
 * 📐 Image Measurement Components
 * 
 * Système de mesure d'images avec calibration IA
 * 
 * - ReferenceConfigModal : Configuration de l'objet de référence par organisation
 * - ImageMeasurementCanvas : Canvas interactif (desktop)
 * - ImageMeasurementCanvasMobile : Canvas tactile optimisé mobile
 * - ImageMeasurementPreview : Preview automatique avec workflow simplifié
 * - SmartCamera : Capture photo mobile optimisée
 */

export { ReferenceConfigModal } from './ReferenceConfigModal';
export { ImageMeasurementCanvas } from './ImageMeasurementCanvas';
export { ImageMeasurementCanvasMobile } from './ImageMeasurementCanvasMobile';
export { ImageMeasurementPreview } from './ImageMeasurementPreview';
export { ReferenceDetectionOverlay } from './ReferenceDetectionOverlay';

// 📸 SmartCamera - Capture intelligente (mobile optimisé)
export { 
  SmartCameraMobile as SmartCamera,
  SmartCaptureFlow,
  CalibrationMarker,
  VideoCapture,
  analyzePhotos
} from '../SmartCamera';

// Re-export types
export type {
  MeasurementPoint,
  ExclusionZone,
  CalibrationData,
  MeasurementResults,
  ImageAnnotations,
  OrganizationMeasurementReferenceConfig,
  ReferenceType,
  CanvasConfig
} from '../../types/measurement';

export {
  REFERENCE_PRESETS,
  DEFAULT_CANVAS_CONFIG,
  calculateDistance,
  calculatePolygonArea,
  convertUnit,
  formatMeasurement
} from '../../types/measurement';
