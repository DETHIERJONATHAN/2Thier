/**
 * 📐 ImageMeasurementCanvas - Canvas interactif pour mesures avec calibration
 * 
 * Fonctionnalités :
 * - Points de mesure draggables (min 2, pas de max)
 * - Zones d'exclusion (rectangle, ellipse)
 * - Calculs temps réel (distance, surface, périmètre)
 * - Calibration par objet de référence + HOMOGRAPHIE pour correction perspective
 * - Support mobile (touch gestures)
 * - Undo/Redo
 * - Affichage incertitude (± X cm)
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Stage, Layer, Image as KonvaImage, Circle, Line, Rect, Ellipse, Text as KonvaText, Group } from 'react-konva';
import {
  Button,
  Space,
  Tooltip,
  Card,
  Typography,
  Tag,
  Divider,
  Select,
  InputNumber,
  message,
  Switch,
  Alert,
  Drawer
} from 'antd';
import {
  PlusOutlined,
  MinusOutlined,
  DragOutlined,
  DeleteOutlined,
  BorderOutlined,
  UndoOutlined,
  RedoOutlined,
  SaveOutlined,
  CheckOutlined,
  CloseOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  AimOutlined,
  BugOutlined,
  MenuOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import type { KonvaEventObject } from 'konva/lib/Node';
import {
  type MeasurementPoint,
  type ExclusionZone,
  type CalibrationData,
  type MeasurementResults,
  type ImageAnnotations,
  DEFAULT_CANVAS_CONFIG,
  calculateDistance,
  calculatePolygonArea,
  formatMeasurement,
  convertUnit
} from '../../types/measurement';
import {
  computeHomography,
  applyHomography,
  computeRealDistanceWithUncertainty,
  createA4DestinationPoints,
  createReferenceDestinationPoints,
  cornersToPoints,
  formatMeasurementWithUncertainty,
  generateDebugGrid,
  setArucoMarkerSize,
  getArucoMarkerSizeMm,
  type Matrix3x3,
  type HomographyResult,
  type HomographyCorners
} from '../../utils/homographyUtils';
import { estimatePose, setMarkerSize, getMarkerSize, analyzeMarkerComplete, type ArucoMarkerAnalysis } from '../../lib/marker-detector';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';

const { Text } = Typography;
const { Option } = Select;

// ============================================================================
// TYPES
// ============================================================================

type Tool = 'select' | 'addPoint' | 'addRectZone' | 'addEllipseZone' | 'delete' | 'adjustReference' | 'selectZoneA4' | 'selectZoneMeasure';

interface ImageMeasurementCanvasProps {
  imageUrl: string;
  calibration?: CalibrationData;
  initialPoints?: MeasurementPoint[];
  initialExclusionZones?: ExclusionZone[];
  onMeasurementsChange?: (measurements: MeasurementResults) => void;
  onAnnotationsChange?: (annotations: Partial<ImageAnnotations>) => void;
  onValidate?: (annotations: ImageAnnotations) => void;
  onCancel?: () => void;
  readOnly?: boolean;
  minPoints?: number;
  maxWidth?: number;
  maxHeight?: number; // 📱 Pour le mode plein écran mobile
  defaultUnit?: string;
  // 🆕 Référence détectée pour affichage visuel
  referenceDetected?: {
    found: boolean;
    confidence?: number;
    boundingBox?: { x: number; y: number; width: number; height: number };
  } | null;
  // 🆕 Dimensions réelles de la référence (pour recalibration)
  referenceRealSize?: { width: number; height: number };
  // 🆕 Callback quand l'utilisateur ajuste la référence (avec facteurs X/Y séparés)
  onReferenceAdjusted?: (newBoundingBox: { x: number; y: number; width: number; height: number }, newPixelPerCmX: number, newPixelPerCmY?: number) => void;
  // 🆕 Pour le snap-to-edges IA
  imageBase64?: string;
  mimeType?: string;
  api?: any; // useAuthenticatedApi instance
  // 🆕 HOMOGRAPHIE: Coins fusionnés par l'IA multi-photos
  fusedCorners?: {
    topLeft: { x: number; y: number };
    topRight: { x: number; y: number };
    bottomLeft: { x: number; y: number };
    bottomRight: { x: number; y: number };
  };
  homographyReady?: boolean;
  // 🆕 CONFIG DYNAMIQUE TBL
  referenceConfig?: {
    referenceType: 'a4' | 'card' | 'meter' | 'custom';
    customName?: string;
    customWidth?: number;
    customHeight?: number;
  };
  measurementObjectConfig?: {
    objectType: 'door' | 'window' | 'chassis' | 'custom';
    objectName?: string;
    objectDescription?: string;
  };
  // 🆕 MULTI-PHOTOS: Toutes les photos pour fusion avant détection
  allPhotos?: Array<{
    imageBase64: string;  // Cohérent avec ImageMeasurementPreview
    mimeType?: string;
    metadata?: {
      qualityScore?: number;
      sharpness?: number;
      brightness?: number;
    };
  }>;

  // 📱 UX mobile: plein écran fixe + menu bas
  mobileFullscreen?: boolean;
  
  // 🔬 ANALYSE ARUCO COMPLÈTE (profondeur, pose, bandes internes)
  arucoAnalysis?: ArucoMarkerAnalysis | null;
  
  // 🔧 CORRECTION OPTIMALE: Facteur calculé par RANSAC + bands + reprojection
  optimalCorrection?: {
    finalCorrection: number;
    correctionX: number;
    correctionY: number;
    // 🆕 Corrections SANS bandes (pour mode homographie)
    correctionXSansBandes?: number;
    correctionYSansBandes?: number;
    globalConfidence: number;
    contributions?: {
      bandAnalysis?: { correction: number; weight: number; confidence: number };
      ransacError?: { correction: number; weight: number; confidence: number };
      reprojection?: { correction: number; weight: number; confidence: number };
      poseCompensation?: { correction: number; weight: number; confidence: number };
      gyroscopeCompensation?: { correction: number; weight: number; confidence: number };
    };
  } | null;
}

interface HistoryState {
  points: MeasurementPoint[];
  exclusionZones: ExclusionZone[];
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ImageMeasurementCanvas: React.FC<ImageMeasurementCanvasProps> = ({
  imageUrl,
  calibration,
  initialPoints = [],
  initialExclusionZones = [],
  onMeasurementsChange,
  onAnnotationsChange,
  onValidate,
  onCancel,
  readOnly = false,
  minPoints = 2,
  maxWidth = 800,
  maxHeight, // 📱 Pour le mode plein écran mobile
  defaultUnit = 'cm',
  referenceDetected = null,
  referenceRealSize = { width: 21, height: 29.7 }, // A4 par défaut
  onReferenceAdjusted,
  imageBase64,
  mimeType = 'image/jpeg',
  api,
  // 🆕 HOMOGRAPHIE: Coins fusionnés par l'IA
  fusedCorners,
  homographyReady = false,
  // 🆕 CONFIG DYNAMIQUE TBL
  referenceConfig,
  measurementObjectConfig,
  // 🆕 MULTI-PHOTOS pour fusion avant détection
  allPhotos,
  mobileFullscreen = false,
  // 🔬 ANALYSE ARUCO COMPLÈTE
  arucoAnalysis = null,
  // 🔧 CORRECTION OPTIMALE: Facteur à appliquer aux mesures finales
  optimalCorrection = null
}) => {
  // Refs
  const stageRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null); // 🆕 Container du canvas pour touch handling
  const canvasViewportRef = useRef<HTMLDivElement>(null); // 🆕 Pour fit width/height en plein écran
  
  // State
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 800, height: 600, scale: 1 });
  const [containerWidth, setContainerWidth] = useState<number>(maxWidth);
  const [points, setPoints] = useState<MeasurementPoint[]>(initialPoints);
  const [exclusionZones, setExclusionZones] = useState<ExclusionZone[]>(initialExclusionZones);
  const [selectedTool, setSelectedTool] = useState<Tool>('select');
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [unit, setUnit] = useState(defaultUnit);
  const [zoom, setZoom] = useState(1);

  // 📱 Détection mobile + menu
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Taille disponible pour afficher le canvas (utile en fullscreen)
  const [canvasViewportSize, setCanvasViewportSize] = useState({ width: 0, height: 0 });

  // Pinch-to-zoom (Konva) - refs pour éviter des re-renders
  const pinchLastDistanceRef = useRef<number | null>(null);
  const pinchLastCenterRef = useRef<{ x: number; y: number } | null>(null);
  
  // History for undo/redo
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Calibration state - facteurs séparés X/Y pour gérer la perspective
  const [pixelPerCm, setPixelPerCm] = useState(calibration?.pixelPerCm || 10);
  const [pixelPerCmX, setPixelPerCmX] = useState(calibration?.pixelPerCm || 10);
  const [pixelPerCmY, setPixelPerCmY] = useState(calibration?.pixelPerCm || 10);
  
  // 🆕 Flag pour éviter la re-conversion après ajustement manuel
  const [isManuallyCalibrated, setIsManuallyCalibrated] = useState(false);
  
  // � Mode ArUco MAGENTA (18×18cm) vs A4 (21×29.7cm)
  // Quand ArUco est détecté, on utilise 18×18cm pour la calibration
  const [isArucoMode, setIsArucoMode] = useState(false);
  
  // �🆕 Facteur de correction de perspective (ajustable par l'utilisateur)
  // Ce facteur compense le fait que l'objet de référence (A4) n'est pas dans le même plan
  // que les points de mesure (ex: A4 sur la porte, mais on mesure le cadre)
  const [perspectiveCorrectionX, setPerspectiveCorrectionX] = useState(1.0);
  const [perspectiveCorrectionY, setPerspectiveCorrectionY] = useState(1.0);

  // 🆕 État local pour le rectangle de référence ajustable (en pixels d'affichage)
  const [adjustableRefBox, setAdjustableRefBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isRefSelected, setIsRefSelected] = useState(false);
  
  // 🆕 MODE QUADRILATÈRE: 4 coins ajustables individuellement pour capturer la perspective
  // Quand activé, on utilise referenceCorners au lieu de adjustableRefBox
  const [quadrilateralMode, setQuadrilateralMode] = useState(false);
  const [referenceCorners, setReferenceCorners] = useState<{
    topLeft: { x: number; y: number };
    topRight: { x: number; y: number };
    bottomLeft: { x: number; y: number };
    bottomRight: { x: number; y: number };
  } | null>(null);

  // 🆕 HOMOGRAPHIE - Correction de perspective mathématique
  const [homographyResult, setHomographyResult] = useState<HomographyResult | null>(null);
  const [useHomography, setUseHomography] = useState(true); // Activé par défaut
  const [debugMode, setDebugMode] = useState(false); // Mode debug pour voir la grille
  const [debugGrid, setDebugGrid] = useState<{ src: [number, number]; dst: [number, number] }[]>([]);
  
  // 📐 POSE (Orientation) - Angles de rotation estimés depuis les corners
  const [pose, setPose] = useState<{ rotX: number; rotY: number; rotZ: number } | null>(null);
  
  // 📏 PROFONDEUR (Distance caméra ↔ marqueur) estimée en cm
  const [estimatedDepth, setEstimatedDepth] = useState<number | null>(null);

  // 🆕 WORKFLOW GUIDÉ - Étapes: 1) Zone référence A4, 2) Zone objet à mesurer, 3) Ajustement
  type WorkflowStep = 'selectReferenceZone' | 'selectMeasureZone' | 'adjusting';
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>('selectReferenceZone');
  const [isDetectingCorners, setIsDetectingCorners] = useState(false);
  const [zoneSelectionType, setZoneSelectionType] = useState<'a4' | 'door' | 'window' | null>(null);
  const [isProcessingZone, setIsProcessingZone] = useState(false); // 🆕 Protection contre appels multiples

  // 🆕 ZOOM PRÉCIS - Mode "clic pour placer" au lieu de drag continu
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 });
  const [pointBeingPlaced, setPointBeingPlaced] = useState<string | null>(null); // Point en cours de repositionnement
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPosition, setLastPanPosition] = useState({ x: 0, y: 0 });

  const isMobileFullscreen = isMobile && mobileFullscreen;

  // Colors from config
  const colors = DEFAULT_CANVAS_CONFIG.colors;

  // ============================================================================
  // 🆕 EDGE DETECTION - Détection de contours locale pour snapper aux vrais bords
  // ============================================================================
  
  /**
   * Détecte les contours locaux autour d'un bord du rectangle pour trouver le vrai bord
   * Utilise le gradient de luminosité pour identifier les transitions de couleur
   */
  const findEdgeByContrast = useCallback((
    imgData: ImageData,
    startX: number,
    startY: number,
    direction: 'horizontal' | 'vertical',
    searchRange: number = 30
  ): number => {
    const { data, width, height } = imgData;
    
    // Calculer la luminosité d'un pixel
    const getLuminosity = (x: number, y: number): number => {
      if (x < 0 || x >= width || y < 0 || y >= height) return 0;
      const idx = (y * width + x) * 4;
      return 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    };
    
    // Chercher le point de plus fort gradient dans la direction donnée
    let maxGradient = 0;
    let bestPos = direction === 'horizontal' ? startX : startY;
    
    for (let offset = -searchRange; offset <= searchRange; offset++) {
      const pos = direction === 'horizontal' ? startX + offset : startY + offset;
      
      // Calculer le gradient (différence de luminosité) sur plusieurs lignes/colonnes
      let gradientSum = 0;
      const sampleCount = 10;
      
      for (let sample = 0; sample < sampleCount; sample++) {
        const sampleOffset = (sample - sampleCount / 2) * 5;
        let x1, y1, x2, y2;
        
        if (direction === 'horizontal') {
          x1 = pos - 2;
          x2 = pos + 2;
          y1 = y2 = startY + sampleOffset;
        } else {
          x1 = x2 = startX + sampleOffset;
          y1 = pos - 2;
          y2 = pos + 2;
        }
        
        const lum1 = getLuminosity(Math.round(x1), Math.round(y1));
        const lum2 = getLuminosity(Math.round(x2), Math.round(y2));
        gradientSum += Math.abs(lum2 - lum1);
      }
      
      const avgGradient = gradientSum / sampleCount;
      
      if (avgGradient > maxGradient) {
        maxGradient = avgGradient;
        bestPos = pos;
      }
    }
    
    // Si le gradient max est trop faible, garder la position originale
    if (maxGradient < 15) {
      console.log(`   ⚠️ Gradient trop faible (${maxGradient.toFixed(1)}), pas de snap`);
      return direction === 'horizontal' ? startX : startY;
    }
    
    console.log(`   ✅ Edge trouvé: ${bestPos} (gradient: ${maxGradient.toFixed(1)})`);
    return bestPos;
  }, []);

  /**
   * Snap automatique du rectangle aux contours détectés dans l'image
   */
  const snapRectangleToEdges = useCallback((box: { x: number; y: number; width: number; height: number }) => {
    if (!image) return box;
    
    console.log('🔍 [Canvas] SNAP TO EDGES - Recherche des vrais bords...');
    
    // Créer un canvas temporaire pour analyser l'image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageDimensions.width;
    tempCanvas.height = imageDimensions.height;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return box;
    
    // Dessiner l'image sur le canvas
    ctx.drawImage(image, 0, 0, imageDimensions.width, imageDimensions.height);
    
    // Récupérer les données de pixels
    const imgData = ctx.getImageData(0, 0, imageDimensions.width, imageDimensions.height);
    
    // Trouver les vrais bords pour chaque côté du rectangle
    const searchRange = 25; // Pixels de recherche autour du bord actuel
    
    // Bord gauche (vertical)
    console.log('   Recherche bord GAUCHE...');
    const leftEdge = findEdgeByContrast(imgData, box.x, box.y + box.height / 2, 'horizontal', searchRange);
    
    // Bord droit (vertical)
    console.log('   Recherche bord DROIT...');
    const rightEdge = findEdgeByContrast(imgData, box.x + box.width, box.y + box.height / 2, 'horizontal', searchRange);
    
    // Bord haut (horizontal)
    console.log('   Recherche bord HAUT...');
    const topEdge = findEdgeByContrast(imgData, box.x + box.width / 2, box.y, 'vertical', searchRange);
    
    // Bord bas (horizontal)
    console.log('   Recherche bord BAS...');
    const bottomEdge = findEdgeByContrast(imgData, box.x + box.width / 2, box.y + box.height, 'vertical', searchRange);
    
    const snappedBox = {
      x: leftEdge,
      y: topEdge,
      width: rightEdge - leftEdge,
      height: bottomEdge - topEdge
    };
    
    console.log('🎯 [Canvas] Rectangle snappé:', {
      avant: `x=${box.x.toFixed(0)}, y=${box.y.toFixed(0)}, ${box.width.toFixed(0)}x${box.height.toFixed(0)}`,
      apres: `x=${snappedBox.x.toFixed(0)}, y=${snappedBox.y.toFixed(0)}, ${snappedBox.width.toFixed(0)}x${snappedBox.height.toFixed(0)}`
    });
    
    return snappedBox;
  }, [image, imageDimensions, findEdgeByContrast]);

  /**
   * 🆕 SNAP POINT TO EDGE - Snap un point de mesure au bord le plus proche
   * Version améliorée: suit la LIGNE du bord, pas juste le point le plus fort
   * 
   * Algorithme:
   * 1. Trouve le point avec le plus fort gradient dans le rayon (= point sur un bord)
   * 2. Détermine la DIRECTION du bord à ce point (perpendiculaire au gradient)
   * 3. Suit cette ligne dans les deux sens pour trouver le meilleur point
   *    (celui qui est le plus proche de la position originale tout en étant sur le bord)
   */
  const snapPointToEdge = useCallback((x: number, y: number, searchRadius: number = 25): { x: number, y: number, snapped: boolean } => {
    if (!image) return { x, y, snapped: false };
    
    // Créer un canvas temporaire pour analyser l'image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageDimensions.width;
    tempCanvas.height = imageDimensions.height;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return { x, y, snapped: false };
    
    // Dessiner l'image sur le canvas
    ctx.drawImage(image, 0, 0, imageDimensions.width, imageDimensions.height);
    
    // Récupérer les données de pixels
    const imgData = ctx.getImageData(0, 0, imageDimensions.width, imageDimensions.height);
    const { data, width, height } = imgData;
    
    // Calculer la luminosité d'un pixel
    const getLuminosity = (px: number, py: number): number => {
      const px_int = Math.round(px);
      const py_int = Math.round(py);
      if (px_int < 0 || px_int >= width || py_int < 0 || py_int >= height) return 0;
      const idx = (py_int * width + px_int) * 4;
      return 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    };
    
    // Calculer le gradient en un point (magnitude et direction)
    const getGradient = (px: number, py: number): { magnitude: number, dirX: number, dirY: number } => {
      const gx = getLuminosity(px + 1, py) - getLuminosity(px - 1, py);
      const gy = getLuminosity(px, py + 1) - getLuminosity(px, py - 1);
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      // Normaliser la direction
      if (magnitude < 0.001) return { magnitude, dirX: 0, dirY: 0 };
      return { magnitude, dirX: gx / magnitude, dirY: gy / magnitude };
    };
    
    // ============================================================================
    // ÉTAPE 1: Scanner une zone autour du point pour trouver TOUS les points de bord
    // ============================================================================
    const GRADIENT_THRESHOLD = 25; // Seuil pour considérer un point comme "bord"
    
    // Collecter tous les points de bord dans le rayon
    const edgePoints: Array<{x: number, y: number, gradient: number, dirX: number, dirY: number}> = [];
    
    for (let dy = -searchRadius; dy <= searchRadius; dy++) {
      for (let dx = -searchRadius; dx <= searchRadius; dx++) {
        // Vérifier qu'on est dans le cercle de recherche
        if (dx * dx + dy * dy > searchRadius * searchRadius) continue;
        
        const testX = x + dx;
        const testY = y + dy;
        
        // Vérifier les limites
        if (testX < 0 || testX >= width || testY < 0 || testY >= height) continue;
        
        const { magnitude, dirX, dirY } = getGradient(testX, testY);
        
        if (magnitude >= GRADIENT_THRESHOLD) {
          edgePoints.push({ x: testX, y: testY, gradient: magnitude, dirX, dirY });
        }
      }
    }
    
    if (edgePoints.length === 0) {
      console.log(`⚠️ [Canvas] Aucun bord trouvé près de (${x.toFixed(0)}, ${y.toFixed(0)})`);
      return { x, y, snapped: false };
    }
    
    // ============================================================================
    // ÉTAPE 2: Trouver le point de bord le plus PROCHE du point original
    // (pas celui avec le gradient le plus fort!)
    // L'utilisateur a cliqué là où il veut le point, on cherche le bord le plus proche
    // ============================================================================
    let bestPoint = edgePoints[0];
    let minDistance = Math.hypot(edgePoints[0].x - x, edgePoints[0].y - y);
    
    for (const ep of edgePoints) {
      const dist = Math.hypot(ep.x - x, ep.y - y);
      // Préférer les points proches MAIS avec un bon gradient
      // Score = distance pénalisée par un faible gradient
      const score = dist * (100 / (ep.gradient + 1));
      const bestScore = minDistance * (100 / (bestPoint.gradient + 1));
      
      if (score < bestScore) {
        minDistance = dist;
        bestPoint = ep;
      }
    }
    
    // ============================================================================
    // ÉTAPE 3: Maintenant qu'on a trouvé un point sur le bord, suivre la LIGNE du bord
    // La direction du bord est PERPENDICULAIRE au gradient
    // ============================================================================
    
    // Direction du bord = perpendiculaire au gradient
    // Si gradient pointe vers (dirX, dirY), le bord va dans la direction (-dirY, dirX) ou (dirY, -dirX)
    const edgeDirX = -bestPoint.dirY;
    const edgeDirY = bestPoint.dirX;
    
    // Suivre le bord dans les deux directions pour trouver le meilleur point
    // (celui qui maximise le gradient tout en restant sur la ligne du bord)
    const followEdge = (startX: number, startY: number, stepDirX: number, stepDirY: number, maxSteps: number): {x: number, y: number, gradient: number} => {
      let currentX = startX;
      let currentY = startY;
      let bestResult = { x: startX, y: startY, gradient: bestPoint.gradient };
      
      for (let step = 1; step <= maxSteps; step++) {
        // Avancer dans la direction du bord
        const nextX = startX + stepDirX * step;
        const nextY = startY + stepDirY * step;
        
        // Vérifier les limites
        if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) break;
        
        // Chercher le maximum de gradient PERPENDICULAIREMENT au bord (sur 3 pixels)
        let localBestGrad = 0;
        let localBestX = nextX;
        let localBestY = nextY;
        
        for (let perpOffset = -2; perpOffset <= 2; perpOffset++) {
          const testX = nextX + bestPoint.dirX * perpOffset;
          const testY = nextY + bestPoint.dirY * perpOffset;
          
          if (testX < 0 || testX >= width || testY < 0 || testY >= height) continue;
          
          const { magnitude } = getGradient(testX, testY);
          if (magnitude > localBestGrad) {
            localBestGrad = magnitude;
            localBestX = testX;
            localBestY = testY;
          }
        }
        
        // Si le gradient tombe trop bas, on a perdu le bord
        if (localBestGrad < GRADIENT_THRESHOLD * 0.7) break;
        
        // Mettre à jour le meilleur point trouvé sur cette ligne
        if (localBestGrad > bestResult.gradient) {
          bestResult = { x: localBestX, y: localBestY, gradient: localBestGrad };
        }
        
        currentX = localBestX;
        currentY = localBestY;
      }
      
      return bestResult;
    };
    
    // Suivre le bord dans les deux directions (max 30 pixels dans chaque direction)
    const result1 = followEdge(bestPoint.x, bestPoint.y, edgeDirX, edgeDirY, 30);
    const result2 = followEdge(bestPoint.x, bestPoint.y, -edgeDirX, -edgeDirY, 30);
    
    // Parmi tous les points trouvés, prendre celui qui:
    // 1. A un bon gradient ET
    // 2. Est le plus proche de la position ORIGINALE du clic
    const candidates = [bestPoint, result1, result2];
    
    let finalPoint = bestPoint;
    let bestDistScore = Infinity;
    
    for (const c of candidates) {
      if (c.gradient < GRADIENT_THRESHOLD * 0.8) continue;
      
      // Score basé sur la distance au point original
      // On veut le point le plus proche qui soit sur un bon bord
      const dist = Math.hypot(c.x - x, c.y - y);
      const score = dist;
      
      if (score < bestDistScore) {
        bestDistScore = score;
        finalPoint = c;
      }
    }
    
    console.log(`🎯 [Canvas] Point snappé: (${x.toFixed(0)}, ${y.toFixed(0)}) → (${finalPoint.x.toFixed(0)}, ${finalPoint.y.toFixed(0)}) gradient=${finalPoint.gradient.toFixed(1)}, distance=${Math.hypot(finalPoint.x - x, finalPoint.y - y).toFixed(1)}px`);
    return { x: finalPoint.x, y: finalPoint.y, snapped: true };
  }, [image, imageDimensions]);

  // ============================================================================
  // 🎯 CHARGEMENT CONFIG MARQUEUR ARUCO
  // ============================================================================
  const { api: authenticatedApi } = useAuthenticatedApi();
  const [markerSizeCm, setMarkerSizeCmState] = useState(16.8); // Valeur par défaut
  
  useEffect(() => {
    // Charger la configuration du marqueur depuis l'API
    const loadMarkerConfig = async () => {
      // Utiliser l'API passée en prop si disponible, sinon l'API authentifiée
      const apiInstance = api || authenticatedApi;
      if (!apiInstance) return;
      
      try {
        const response = await apiInstance.get('/api/settings/ai-measure');
        if (response.success && response.data?.markerSizeCm) {
          const sizeCm = response.data.markerSizeCm;
          console.log(`🎯 [Canvas] Configuration marqueur chargée: ${sizeCm}cm`);
          setMarkerSizeCmState(sizeCm);
          // Mettre à jour les modules de calcul
          setMarkerSize(sizeCm);
          setArucoMarkerSize(sizeCm);
        }
      } catch (error) {
        console.warn('[Canvas] Impossible de charger la config marqueur, utilisation valeur par défaut:', error);
      }
    };
    loadMarkerConfig();
  }, [api, authenticatedApi]);

  // ============================================================================
  // RESPONSIVE CONTAINER (Mobile-friendly)
  // ============================================================================

  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateContainerWidth = () => {
      if (containerRef.current) {
        // Utiliser la largeur du container, avec un max de maxWidth
        const width = Math.min(containerRef.current.clientWidth, maxWidth);
        setContainerWidth(width);
      }
    };
    
    // Observer les changements de taille (rotation d'écran, resize)
    const resizeObserver = new ResizeObserver(updateContainerWidth);
    resizeObserver.observe(containerRef.current);
    
    // Initialiser
    updateContainerWidth();
    
    return () => resizeObserver.disconnect();
  }, [maxWidth]);

  // 📱 Détection mobile - inclut le touch support pour tablettes/téléphones modernes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const checkMobile = () => {
      // Détection par touch support (couvre tablettes et téléphones)
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      // Détection par taille d'écran
      const isSmallScreen = window.innerWidth <= 1024;
      // Si mobileFullscreen est passé en prop, on considère qu'on est en mode mobile
      setIsMobile(hasTouch || isSmallScreen || mobileFullscreen);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [mobileFullscreen]);

  // 📱 Observer la zone disponible pour le canvas (en fullscreen)
  useEffect(() => {
    if (!canvasViewportRef.current) return;

    const update = () => {
      const el = canvasViewportRef.current;
      if (!el) return;
      setCanvasViewportSize({ width: el.clientWidth, height: el.clientHeight });
    };

    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(canvasViewportRef.current);
    update();

    return () => resizeObserver.disconnect();
  }, []);

  // ============================================================================
  // 🆕 MOBILE TOUCH HANDLING - Empêcher le scroll/zoom natif du navigateur
  // ============================================================================

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    // Empêcher le pull-to-refresh et le scroll
    const preventScroll = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        e.preventDefault();
      }
    };

    // Empêcher le zoom par pinch (on gère notre propre zoom)
    const preventGesture = (e: Event) => {
      e.preventDefault();
    };

    // Ajouter les listeners avec passive: false pour pouvoir faire preventDefault
    // IMPORTANT: ne pas stopper la propagation, sinon Konva ne reçoit plus les events (sélection/drag KO sur mobile)
    container.addEventListener('touchmove', preventScroll, { passive: false });
    container.addEventListener('gesturestart', preventGesture);
    container.addEventListener('gesturechange', preventGesture);
    container.addEventListener('gestureend', preventGesture);

    return () => {
      container.removeEventListener('touchmove', preventScroll);
      container.removeEventListener('gesturestart', preventGesture);
      container.removeEventListener('gesturechange', preventGesture);
      container.removeEventListener('gestureend', preventGesture);
    };
  }, []);

  // ============================================================================
  // IMAGE LOADING
  // ============================================================================

  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImage(img);
      
      // Calculate dimensions to fit container (responsive)
      const effectiveMaxWidth = containerWidth || maxWidth;
      const widthLimit = Math.min(
        effectiveMaxWidth,
        canvasViewportSize.width > 0 ? canvasViewportSize.width : effectiveMaxWidth
      );
      // 📱 En mode plein écran: utiliser maxHeight si fourni, sinon le viewport
      const heightLimit = maxHeight 
        ? maxHeight 
        : (isMobileFullscreen && canvasViewportSize.height > 0 ? canvasViewportSize.height : Number.POSITIVE_INFINITY);

      const scale = Math.min(1, widthLimit / img.width, heightLimit / img.height);
      setImageDimensions({
        width: img.width * scale,
        height: img.height * scale,
        scale
      });

      // En fullscreen, repartir sur une vue stable
      if (isMobileFullscreen) {
        setZoom(1);
        setStagePosition({ x: 0, y: 0 });
      }
    };
    img.src = imageUrl;
  }, [imageUrl, maxWidth, maxHeight, containerWidth, canvasViewportSize.width, canvasViewportSize.height, isMobileFullscreen]);

  // 🎯 ULTRA-PRECISION: Auto-initialiser avec les fusedCorners si disponibles
  // Cet effet permet de skip l'étape de sélection manuelle de la référence ArUco
  useEffect(() => {
    // 🔴 CRITIQUE: Attendre que l'image soit RÉELLEMENT chargée !
    // imageDimensions par défaut = {800, 600, scale: 1}
    // On vérifie que image existe ET que les dimensions correspondent à l'image chargée
    if (!fusedCorners || !homographyReady || !image) {
      return;
    }
    
    // 🔴 Vérifier que imageDimensions reflète l'image CHARGÉE (pas les valeurs par défaut)
    // L'image est chargée quand: width/height sont basés sur l'image réelle
    const expectedWidth = image.width * imageDimensions.scale;
    const expectedHeight = image.height * imageDimensions.scale;
    const dimensionsMatch = Math.abs(imageDimensions.width - expectedWidth) < 1 && 
                           Math.abs(imageDimensions.height - expectedHeight) < 1;
    
    if (!dimensionsMatch) {
      console.log('⏳ [Canvas] Image chargée mais imageDimensions pas encore mises à jour, skip...');
      return;
    }
    
    // Éviter de ré-initialiser si déjà fait
    if (referenceCorners && quadrilateralMode) {
      return;
    }
    
    console.log('🎯 [Canvas] ULTRA-PRECISION: Initialisation automatique avec fusedCorners !');
    console.log('   📍 fusedCorners (% de l\'image):', fusedCorners);
    console.log('   📐 imageDimensions pour conversion:', imageDimensions);
    console.log('   📐 scale appliqué:', imageDimensions.scale);
    console.log('   📐 Image réelle:', image.width, '×', image.height);
    
    // Convertir les corners de % (0-100) vers pixels (de l'image SCALÉE affichée sur le canvas)
    const cornersInPixels = {
      topLeft: { 
        x: (fusedCorners.topLeft.x / 100) * imageDimensions.width, 
        y: (fusedCorners.topLeft.y / 100) * imageDimensions.height 
      },
      topRight: { 
        x: (fusedCorners.topRight.x / 100) * imageDimensions.width, 
        y: (fusedCorners.topRight.y / 100) * imageDimensions.height 
      },
      bottomRight: { 
        x: (fusedCorners.bottomRight.x / 100) * imageDimensions.width, 
        y: (fusedCorners.bottomRight.y / 100) * imageDimensions.height 
      },
      bottomLeft: { 
        x: (fusedCorners.bottomLeft.x / 100) * imageDimensions.width, 
        y: (fusedCorners.bottomLeft.y / 100) * imageDimensions.height 
      }
    };
    
    console.log('   📍 cornersInPixels (canvas scalé):', cornersInPixels);
    console.log('   🔍 DEBUG: TL.x = fusedCorners.topLeft.x(', fusedCorners.topLeft.x, '%) / 100 * imageDimensions.width(', imageDimensions.width, ') =', cornersInPixels.topLeft.x);
    
    // Initialiser les coins de référence
    setReferenceCorners(cornersInPixels);
    setQuadrilateralMode(true);
    
    // 📐 CALCUL DE LA POSE (orientation de la caméra)
    const cornersArray = [
      { x: cornersInPixels.topLeft.x, y: cornersInPixels.topLeft.y },
      { x: cornersInPixels.topRight.x, y: cornersInPixels.topRight.y },
      { x: cornersInPixels.bottomRight.x, y: cornersInPixels.bottomRight.y },
      { x: cornersInPixels.bottomLeft.x, y: cornersInPixels.bottomLeft.y }
    ];
    const estimatedPose = estimatePose(cornersArray);
    setPose(estimatedPose);
    console.log(`📐 [Canvas] POSE initiale: rotX=${estimatedPose.rotX}°, rotY=${estimatedPose.rotY}°, rotZ=${estimatedPose.rotZ}°`);
    
    // Calculer le bounding box pour compatibilité
    const minX = Math.min(cornersInPixels.topLeft.x, cornersInPixels.bottomLeft.x);
    const maxX = Math.max(cornersInPixels.topRight.x, cornersInPixels.bottomRight.x);
    const minY = Math.min(cornersInPixels.topLeft.y, cornersInPixels.topRight.y);
    const maxY = Math.max(cornersInPixels.bottomLeft.y, cornersInPixels.bottomRight.y);
    
    const fusedBox = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
    
    setAdjustableRefBox(fusedBox);
    
    // 🎯 ARUCO: Calculer immédiatement la calibration avec les dimensions ArUco configurées
    // La taille est paramétrable dans Paramètres > IA Mesure
    const arucoSizeCm = markerSizeCm;
    const newPixelPerCmX = fusedBox.width / arucoSizeCm;
    const newPixelPerCmY = fusedBox.height / arucoSizeCm;
    const newPixelPerCm = (newPixelPerCmX + newPixelPerCmY) / 2;
    
    console.log(`🎯 [Canvas] Calibration ArUco MAGENTA (${markerSizeCm}cm × ${markerSizeCm}cm)`);
    console.log(`   📏 Box: ${fusedBox.width.toFixed(0)}×${fusedBox.height.toFixed(0)}px`);
    console.log(`   📏 pixelPerCmX: ${newPixelPerCmX.toFixed(2)}, pixelPerCmY: ${newPixelPerCmY.toFixed(2)}`);
    
    // 🎯 Activer le mode ArUco
    setIsArucoMode(true);
    
    // Appliquer la calibration avec les setters existants
    setPixelPerCmX(newPixelPerCmX);
    setPixelPerCmY(newPixelPerCmY);
    setPixelPerCm(newPixelPerCm);
    
    // 🚀 PASSER DIRECTEMENT À L'ÉTAPE DE MESURE (skip la sélection de référence)
    console.log('🚀 [Canvas] Passage automatique à l\'étape selectMeasureZone');
    setWorkflowStep('selectMeasureZone');
    
  }, [fusedCorners, homographyReady, imageDimensions.width, imageDimensions.height, imageDimensions.scale, referenceCorners, quadrilateralMode, image, markerSizeCm]);

  // 🔄 Recalculer pixelPerCm quand le rectangle de référence est ajusté
  const recalculateCalibration = useCallback((box: { x: number; y: number; width: number; height: number }, skipSnap: boolean = false) => {
    // 🆕 ÉTAPE 1: Snapper aux vrais bords de l'objet (détection de contours locale)
    let snappedBox = box;
    if (!skipSnap && image) {
      snappedBox = snapRectangleToEdges(box);
    }
    
    // Détecter l'orientation du rectangle (paysage ou portrait)
    const ratio = snappedBox.width / snappedBox.height;
    const isLandscape = ratio > 1; // Plus large que haut = paysage
    
    // 🎯 ARUCO MODE: Si ArUco détecté, utiliser markerSizeCm × markerSizeCm au lieu de referenceRealSize
    let refWidth: number;
    let refHeight: number;
    
    if (isArucoMode) {
      // ArUco MAGENTA est toujours un carré (taille configurée dynamiquement)
      refWidth = markerSizeCm;
      refHeight = markerSizeCm;
      console.log(`🎯 [Canvas] Mode ARUCO: utilisation ${markerSizeCm}×${markerSizeCm}cm`);
    } else {
      // Ajuster les dimensions A4 selon l'orientation détectée
      refWidth = referenceRealSize.width;
      refHeight = referenceRealSize.height;
      
      // Si le rectangle est en paysage mais les dimensions sont en portrait (ou vice versa), inverser
      const dimensionsArePortrait = referenceRealSize.width < referenceRealSize.height;
      if (isLandscape && dimensionsArePortrait) {
        // Rectangle paysage mais dimensions portrait → inverser
        refWidth = referenceRealSize.height;
        refHeight = referenceRealSize.width;
        console.log(`🔄 [Canvas] Rectangle PAYSAGE détecté, inversion: ${refWidth}x${refHeight}cm`);
      } else if (!isLandscape && !dimensionsArePortrait) {
        // Rectangle portrait mais dimensions paysage → inverser
        refWidth = referenceRealSize.height;
        refHeight = referenceRealSize.width;
        console.log(`🔄 [Canvas] Rectangle PORTRAIT détecté, inversion: ${refWidth}x${refHeight}cm`);
      }
    }
    
    // 🆕 ÉTAPE 2: CALCUL HOMOGRAPHIE - Transformation perspective exacte
    // Les 4 coins du rectangle détecté (en pixels)
    const srcCorners: HomographyCorners = {
      topLeft: { x: snappedBox.x, y: snappedBox.y },
      topRight: { x: snappedBox.x + snappedBox.width, y: snappedBox.y },
      bottomRight: { x: snappedBox.x + snappedBox.width, y: snappedBox.y + snappedBox.height },
      bottomLeft: { x: snappedBox.x, y: snappedBox.y + snappedBox.height }
    };
    
    // 🔧 VÉRIFICATION: L'homographie a besoin d'un quadrilatère DÉFORMÉ (perspective)
    // Un rectangle parfait comme source rend la matrice dégénérée !
    // Calculer la "non-rectangularité" du quadrilatère
    const topEdgeDy = Math.abs(srcCorners.topRight.y - srcCorners.topLeft.y);
    const bottomEdgeDy = Math.abs(srcCorners.bottomRight.y - srcCorners.bottomLeft.y);
    const leftEdgeDx = Math.abs(srcCorners.bottomLeft.x - srcCorners.topLeft.x);
    const rightEdgeDx = Math.abs(srcCorners.bottomRight.x - srcCorners.topRight.x);
    const maxPerspectiveDeform = Math.max(topEdgeDy, bottomEdgeDy, leftEdgeDx, rightEdgeDx);
    
    // Rectangle destination selon le type de référence 
    // ⚠️ ArUco: 170mm entre CENTRES des cercles magenta (pas 180mm du bord du marqueur)
    const dstPoints = isArucoMode 
      ? createReferenceDestinationPoints('aruco')
      : createReferenceDestinationPoints('a4', isLandscape ? 'paysage' : 'portrait');
    const srcPoints = cornersToPoints(srcCorners);
    
    // 🚨 Si le rectangle source est trop "parfait" (pas de perspective), skip l'homographie
    // car la matrice sera singulière
    if (maxPerspectiveDeform < 3) {
      console.log('📐 [Canvas] Rectangle source trop parfait (pas de perspective visible), homographie non applicable');
      console.log(`   Déformation max: ${maxPerspectiveDeform.toFixed(1)}px < 3px seuil`);
      console.log('   → Utilisation de la calibration par DIAGONALE uniquement');
      // Ne pas calculer d'homographie, utiliser uniquement le fallback
    } else {
      try {
        const homography = computeHomography(srcPoints, dstPoints);
        setHomographyResult(homography);
        
        console.log(`🎯 [Canvas] HOMOGRAPHIE calculée:`);
        console.log(`   Qualité: ${homography.quality.toFixed(1)}%`);
        console.log(`   Incertitude: ±${homography.uncertainty.toFixed(1)}%`);
        console.log(`   Déformation perspective: ${maxPerspectiveDeform.toFixed(1)}px`);
        
        // Générer la grille de debug si activé
        if (debugMode) {
          const grid = generateDebugGrid(homography.matrix, imageDimensions.width, imageDimensions.height, 8);
          setDebugGrid(grid);
        }
      } catch (err) {
        console.error('❌ [Canvas] Erreur calcul homographie:', err);
        setHomographyResult(null);
      }
    }
    
    // 🆕 ÉTAPE 3: Calcul des facteurs de calibration
    let correctedBox = { ...snappedBox };
    
    // Vérification du ratio pour détecter la perspective
    const detectedRatio = snappedBox.width / snappedBox.height;
    const expectedRatio = refWidth / refHeight;
    const ratioError = Math.abs(detectedRatio - expectedRatio) / expectedRatio;
    
    // Calculer les diagonales (pour facteur moyen)
    const diagonalePxDetectee = Math.sqrt(correctedBox.width * correctedBox.width + correctedBox.height * correctedBox.height);
    const diagonaleCmReelle = Math.sqrt(refWidth * refWidth + refHeight * refHeight);
    const pixelPerCmDiagonale = diagonalePxDetectee / diagonaleCmReelle;
    
    // 🆕 NOUVEAU: Facteurs SÉPARÉS pour X et Y pour gérer la perspective !
    // Quand la photo est prise en perspective, la hauteur est compressée différemment de la largeur
    const newPixelPerCmX = correctedBox.width / refWidth;
    const newPixelPerCmY = correctedBox.height / refHeight;
    const newPixelPerCmMoyen = pixelPerCmDiagonale; // Garder pour compatibilité
    
    console.log(`📐 [Canvas] CALIBRATION AVEC FACTEURS X/Y SÉPARÉS:`);
    console.log(`   Rectangle détecté: ${correctedBox.width.toFixed(0)}x${correctedBox.height.toFixed(0)}px`);
    console.log(`   Référence réelle: ${refWidth}x${refHeight}cm (diagonale: ${diagonaleCmReelle.toFixed(1)}cm)`);
    console.log(`   Ratio détecté: ${detectedRatio.toFixed(3)} vs attendu: ${expectedRatio.toFixed(3)} (écart ${(ratioError * 100).toFixed(1)}%)`);
    console.log(`   🎯 pixelPerCmX: ${newPixelPerCmX.toFixed(2)} px/cm (pour largeur)`);
    console.log(`   🎯 pixelPerCmY: ${newPixelPerCmY.toFixed(2)} px/cm (pour hauteur)`);
    console.log(`   📐 pixelPerCm moyen (diagonale): ${pixelPerCmDiagonale.toFixed(2)} px/cm`);
    if (ratioError > 0.05) {
      console.log(`   ⚠️ Écart de ratio ${(ratioError * 100).toFixed(1)}% → Utilisation des facteurs X/Y séparés pour compenser la perspective`);
    }
    
    setPixelPerCmX(newPixelPerCmX);
    setPixelPerCmY(newPixelPerCmY);
    setPixelPerCm(newPixelPerCmMoyen); // Garder pour compatibilité
    setIsManuallyCalibrated(true); // 🆕 Marquer comme ajusté manuellement
    
    // Mettre à jour visuellement le rectangle corrigé
    setAdjustableRefBox(correctedBox);
    
    // Notifier le parent (pour sauvegarder la calibration)
    if (onReferenceAdjusted) {
      // Reconvertir en base 1000 pour le parent
      const boxBase1000 = {
        x: (correctedBox.x / imageDimensions.width) * 1000,
        y: (correctedBox.y / imageDimensions.height) * 1000,
        width: (correctedBox.width / imageDimensions.width) * 1000,
        height: (correctedBox.height / imageDimensions.height) * 1000
      };
      // 🆕 Passer pixelPerCmX en base 1000 (le parent recalculera)
      const pixelPerCmX_base1000 = newPixelPerCmX * (1000 / imageDimensions.width);
      const pixelPerCmY_base1000 = newPixelPerCmY * (1000 / imageDimensions.height);
      console.log(`   🆕 Callback parent: pixelPerCmX_base1000=${pixelPerCmX_base1000.toFixed(2)}, pixelPerCmY_base1000=${pixelPerCmY_base1000.toFixed(2)}`);
      onReferenceAdjusted(boxBase1000, pixelPerCmX_base1000, pixelPerCmY_base1000);
    }
  }, [referenceRealSize, imageDimensions, onReferenceAdjusted, image, snapRectangleToEdges, debugMode, isArucoMode]);

  // 🆕 Recalculer l'homographie à partir des 4 coins ajustables (mode quadrilatère)
  const recalculateHomographyFromCorners = useCallback((corners: {
    topLeft: { x: number; y: number };
    topRight: { x: number; y: number };
    bottomLeft: { x: number; y: number };
    bottomRight: { x: number; y: number };
  }) => {
    console.log('🔄 [Canvas] RECALCUL HOMOGRAPHIE depuis 4 coins ajustés:', corners);
    
    // Points source = les 4 coins ajustés par l'utilisateur (quadrilatère avec perspective)
    const srcPoints: [[number, number], [number, number], [number, number], [number, number]] = [
      [corners.topLeft.x, corners.topLeft.y],
      [corners.topRight.x, corners.topRight.y],
      [corners.bottomRight.x, corners.bottomRight.y],
      [corners.bottomLeft.x, corners.bottomLeft.y]
    ];
    
    // Vérifier la perspective des corners
    const topEdgeDy = Math.abs(srcPoints[1][1] - srcPoints[0][1]);
    const bottomEdgeDy = Math.abs(srcPoints[2][1] - srcPoints[3][1]);
    const leftEdgeDx = Math.abs(srcPoints[3][0] - srcPoints[0][0]);
    const rightEdgeDx = Math.abs(srcPoints[2][0] - srcPoints[1][0]);
    const maxPerspectiveDeform = Math.max(topEdgeDy, bottomEdgeDy, leftEdgeDx, rightEdgeDx);
    
    console.log('📐 [Canvas] Analyse perspective des 4 coins:');
    console.log(`   topEdgeDy: ${topEdgeDy.toFixed(1)}px, bottomEdgeDy: ${bottomEdgeDy.toFixed(1)}px`);
    console.log(`   leftEdgeDx: ${leftEdgeDx.toFixed(1)}px, rightEdgeDx: ${rightEdgeDx.toFixed(1)}px`);
    console.log(`   maxPerspectiveDeform: ${maxPerspectiveDeform.toFixed(1)}px`);
    
    // Détecter l'orientation à partir du quadrilatère
    const avgWidth = ((corners.topRight.x - corners.topLeft.x) + (corners.bottomRight.x - corners.bottomLeft.x)) / 2;
    const avgHeight = ((corners.bottomLeft.y - corners.topLeft.y) + (corners.bottomRight.y - corners.topRight.y)) / 2;
    
    // 🛡️ VALIDATION: Vérifier que le quadrilatère a une taille raisonnable
    // ArUco 18×18cm = ratio 1:1, A4 ~21x30cm = ratio entre 0.5 et 2.0
    // En mode ArUco, accepter les carrés (ratio ~1:1)
    const ratio = Math.abs(avgWidth / avgHeight);
    const area = Math.abs(avgWidth * avgHeight);
    const imageArea = imageDimensions.width * imageDimensions.height;
    const areaRatio = area / imageArea;
    
    console.log(`   Ratio largeur/hauteur: ${ratio.toFixed(2)} ${isArucoMode ? '(ArUco attendu ~1.0)' : '(A4 attendu 0.7-1.4)'}`);
    console.log(`   Surface relative: ${(areaRatio * 100).toFixed(1)}% de l'image`);
    
    // Validation adaptée au mode
    const minRatio = isArucoMode ? 0.7 : 0.3;  // ArUco est carré, tolérer 0.7-1.4
    const maxRatio = isArucoMode ? 1.4 : 3.0;  // A4 peut être très allongé
    
    if (ratio < minRatio || ratio > maxRatio) {
      console.warn(`⚠️ [Canvas] Ratio aberrant - les coins ne forment pas un ${isArucoMode ? 'ArUco valide (carré)' : 'A4 valide'}`);
      return;
    }
    if (areaRatio > 0.5 || areaRatio < 0.001) {  // Permettre des marqueurs plus petits
      console.warn(`⚠️ [Canvas] Surface aberrante - le quadrilatère est trop grand ou trop petit pour un ${isArucoMode ? 'ArUco 18cm' : 'A4'}`);
      return;
    }
    
    const isLandscape = avgWidth > avgHeight;
    
    // Points destination selon le type de référence
    const dstPoints = isArucoMode 
      ? createReferenceDestinationPoints('aruco')
      : createReferenceDestinationPoints('a4', isLandscape ? 'paysage' : 'portrait');
    
    const refLabel = isArucoMode ? `ArUco ${markerSizeCm * 10}×${markerSizeCm * 10}mm (${markerSizeCm}cm)` : `A4 ${isLandscape ? 'PAYSAGE (297x210mm)' : 'PORTRAIT (210x297mm)'}`;
    console.log(`   📐 Référence utilisée: ${refLabel}`);
    console.log(`   📐 Points destination:`, dstPoints.map(p => `(${p[0]}, ${p[1]})`).join(', '));
    
    try {
      const homography = computeHomography(srcPoints, dstPoints);
      
      // 🔍 VÉRIFICATION: La distance entre TL et TR devrait être exactement 180mm (ArUco) ou 210mm (A4)
      const topLeftReal = applyHomography(homography.matrix, srcPoints[0]);
      const topRightReal = applyHomography(homography.matrix, srcPoints[1]);
      const verifyDistanceMm = Math.hypot(topRightReal[0] - topLeftReal[0], topRightReal[1] - topLeftReal[1]);
      const expectedDistanceMm = isArucoMode ? (markerSizeCm * 10) : (isLandscape ? 297 : 210);
      console.log(`   🔍 VÉRIFICATION HOMOGRAPHIE: distance TL↔TR = ${verifyDistanceMm.toFixed(1)}mm (attendu: ${expectedDistanceMm}mm)`);
      if (Math.abs(verifyDistanceMm - expectedDistanceMm) > 1) {
        console.warn(`   ⚠️ ERREUR HOMOGRAPHIE: écart de ${Math.abs(verifyDistanceMm - expectedDistanceMm).toFixed(1)}mm !`);
      }
      
      console.log('✅ [Canvas] HOMOGRAPHIE depuis 4 coins:', {
        quality: homography.quality.toFixed(1) + '%',
        uncertainty: homography.uncertainty.toFixed(1) + '%',
        perspectiveDeform: maxPerspectiveDeform.toFixed(1) + 'px'
      });
      
      if (homography.quality > 10) {
        setHomographyResult(homography);
        
        // 📐 CALCUL DE LA POSE (orientation de la caméra)
        const cornersArray = [
          { x: corners.topLeft.x, y: corners.topLeft.y },
          { x: corners.topRight.x, y: corners.topRight.y },
          { x: corners.bottomRight.x, y: corners.bottomRight.y },
          { x: corners.bottomLeft.x, y: corners.bottomLeft.y }
        ];
        const estimatedPose = estimatePose(cornersArray);
        setPose(estimatedPose);
        console.log(`📐 [Canvas] POSE estimée: rotX=${estimatedPose.rotX}°, rotY=${estimatedPose.rotY}°, rotZ=${estimatedPose.rotZ}°`);
        
        // 📏 CALCUL DE LA PROFONDEUR (distance caméra ↔ marqueur)
        // Formule: distance = (taille_réelle_cm × focale_pixels) / taille_pixels
        // Focale typique smartphone ~800px (approximation pour capteur standard)
        const side1 = Math.hypot(corners.topRight.x - corners.topLeft.x, corners.topRight.y - corners.topLeft.y);
        const side2 = Math.hypot(corners.bottomLeft.x - corners.topLeft.x, corners.bottomLeft.y - corners.topLeft.y);
        const avgSizePx = (side1 + side2) / 2;
        const markerSizeForDepth = isArucoMode ? markerSizeCm : 21; // ArUco configurable, A4 ~21cm
        const focalLength = 800; // Focale approximative en pixels
        const depth = (markerSizeCm * focalLength) / avgSizePx;
        setEstimatedDepth(Math.round(depth));
        console.log(`📏 [Canvas] PROFONDEUR estimée: ${depth.toFixed(0)}cm (marqueur ${avgSizePx.toFixed(0)}px)`);
        
        // Générer la grille de debug si activé
        if (debugMode) {
          const grid = generateDebugGrid(homography.matrix, imageDimensions.width, imageDimensions.height, 8);
          setDebugGrid(grid);
        }
      } else {
        console.warn('⚠️ [Canvas] Qualité homographie faible, vérifier les coins');
      }
    } catch (err) {
      console.error('❌ [Canvas] Erreur calcul homographie:', err);
    }
    
    // Calculer aussi la calibration par diagonale (fallback)
    const diagonal = Math.hypot(avgWidth, avgHeight);
    const refWidth = isLandscape ? referenceRealSize.height : referenceRealSize.width;
    const refHeight = isLandscape ? referenceRealSize.width : referenceRealSize.height;
    const diagonalCm = Math.sqrt(refWidth * refWidth + refHeight * refHeight);
    const pixelPerCmUnique = diagonal / diagonalCm;
    
    console.log(`   🎯 pixelPerCm (diagonale): ${pixelPerCmUnique.toFixed(2)} px/cm`);
    
    setPixelPerCmX(pixelPerCmUnique);
    setPixelPerCmY(pixelPerCmUnique);
    setPixelPerCm(pixelPerCmUnique);
    setIsManuallyCalibrated(true);
    
  }, [referenceRealSize, imageDimensions, debugMode]);

  // 🆕 Initialiser le rectangle de référence ajustable à partir de referenceDetected
  // ET snapper automatiquement aux vrais bords !
  // ⚠️ IMPORTANT: Ce useEffect doit être APRÈS recalculateCalibration pour éviter l'erreur "before initialization"
  useEffect(() => {
    // 🆕 WORKFLOW GUIDÉ: Ne pas initialiser automatiquement si on est dans le mode sélection par zone
    // L'utilisateur doit dessiner lui-même les zones
    if (workflowStep === 'selectReferenceZone' || workflowStep === 'selectMeasureZone') {
      console.log('🎯 [Canvas] Mode workflow guidé actif - pas d\'initialisation automatique des références');
      return;
    }

    // Attendre que l'image soit chargée
    if (!image || !referenceDetected?.found || !referenceDetected?.boundingBox || imageDimensions.width <= 0) {
      return;
    }
    
    // Ne pas re-initialiser si déjà fait
    if (adjustableRefBox) {
      return;
    }
    
    // Convertir de base 1000 vers pixels d'affichage
    console.log('📐 [Canvas] DIAGNOSTIC DÉTAILLÉ:');
    console.log(`   imageDimensions: ${imageDimensions.width.toFixed(0)}x${imageDimensions.height.toFixed(0)}px (ratio=${(imageDimensions.width/imageDimensions.height).toFixed(3)})`);
    console.log(`   referenceDetected.boundingBox (base1000): x=${referenceDetected.boundingBox.x}, y=${referenceDetected.boundingBox.y}, w=${referenceDetected.boundingBox.width}, h=${referenceDetected.boundingBox.height}`);
    
    // 🆕 HOMOGRAPHIE: Si on a des fusedCorners de la fusion multi-photos, les utiliser !
    if (fusedCorners && homographyReady) {
      console.log('🎯 [Canvas] UTILISATION DES CORNERS FUSIONNÉS PAR L\'IA MULTI-PHOTOS pour homographie !');
      console.log('   fusedCorners:', fusedCorners);
      
      // Convertir les corners de % (0-100) vers pixels
      const srcPoints: [[number, number], [number, number], [number, number], [number, number]] = [
        [fusedCorners.topLeft.x / 100 * imageDimensions.width, fusedCorners.topLeft.y / 100 * imageDimensions.height],
        [fusedCorners.topRight.x / 100 * imageDimensions.width, fusedCorners.topRight.y / 100 * imageDimensions.height],
        [fusedCorners.bottomRight.x / 100 * imageDimensions.width, fusedCorners.bottomRight.y / 100 * imageDimensions.height],
        [fusedCorners.bottomLeft.x / 100 * imageDimensions.width, fusedCorners.bottomLeft.y / 100 * imageDimensions.height]
      ];
      
      // 🆕 INITIALISER LES 4 COINS AJUSTABLES
      const cornersInPixels = {
        topLeft: { x: srcPoints[0][0], y: srcPoints[0][1] },
        topRight: { x: srcPoints[1][0], y: srcPoints[1][1] },
        bottomRight: { x: srcPoints[2][0], y: srcPoints[2][1] },
        bottomLeft: { x: srcPoints[3][0], y: srcPoints[3][1] }
      };
      setReferenceCorners(cornersInPixels);
      setQuadrilateralMode(true); // Activer le mode quadrilatère automatiquement
      console.log('🔄 [Canvas] Mode QUADRILATÈRE activé avec les coins IA');
      
      // 🔧 VÉRIFICATION: Les corners de l'IA doivent avoir une PERSPECTIVE visible
      // Sinon l'homographie est dégénérée
      const topEdgeDy = Math.abs(srcPoints[1][1] - srcPoints[0][1]);
      const bottomEdgeDy = Math.abs(srcPoints[2][1] - srcPoints[3][1]);
      const leftEdgeDx = Math.abs(srcPoints[3][0] - srcPoints[0][0]);
      const rightEdgeDx = Math.abs(srcPoints[2][0] - srcPoints[1][0]);
      const maxPerspectiveDeform = Math.max(topEdgeDy, bottomEdgeDy, leftEdgeDx, rightEdgeDx);
      
      console.log('📐 [Canvas] Analyse perspective des corners IA:');
      console.log(`   topEdgeDy: ${topEdgeDy.toFixed(1)}px, bottomEdgeDy: ${bottomEdgeDy.toFixed(1)}px`);
      console.log(`   leftEdgeDx: ${leftEdgeDx.toFixed(1)}px, rightEdgeDx: ${rightEdgeDx.toFixed(1)}px`);
      console.log(`   maxPerspectiveDeform: ${maxPerspectiveDeform.toFixed(1)}px`);
      
      // 🆕 Détecter l'orientation à partir des dimensions des srcPoints EN PIXELS (pas fusedCorners qui est en %)
      const avgWidth = ((srcPoints[1][0] - srcPoints[0][0]) + (srcPoints[2][0] - srcPoints[3][0])) / 2;
      const avgHeight = ((srcPoints[3][1] - srcPoints[0][1]) + (srcPoints[2][1] - srcPoints[1][1])) / 2;
      const isLandscape = avgWidth > avgHeight;
      const refLabel = isArucoMode ? `ArUco ${markerSizeCm}×${markerSizeCm}cm` : `A4 ${isLandscape ? 'PAYSAGE' : 'PORTRAIT'}`;
      console.log(`   📐 Référence détectée: ${refLabel} (${avgWidth.toFixed(0)}x${avgHeight.toFixed(0)}px)`);
      
      // Si perspective suffisante (>5px), calculer l'homographie
      if (maxPerspectiveDeform > 5) {
        // Créer les points destination selon le type de référence - utiliser l'orientation DÉTECTÉE !
        const dstPoints = isArucoMode 
          ? createReferenceDestinationPoints('aruco')
          : createReferenceDestinationPoints('a4', isLandscape ? 'paysage' : 'portrait');
        
        console.log(`   📐 Points destination ${isArucoMode ? 'ArUco 180×180mm' : isLandscape ? 'A4 297x210mm' : 'A4 210x297mm'}:`, dstPoints.map(p => `(${p[0]}, ${p[1]})`).join(', '));
        
        // Calculer l'homographie directement depuis les corners fusionnés
        const homography = computeHomography(srcPoints, dstPoints);
        
        console.log('✅ [Canvas] HOMOGRAPHIE depuis fusion IA:', {
          quality: homography.quality.toFixed(1) + '%',
          uncertainty: homography.uncertainty.toFixed(1) + '%',
          perspectiveDeform: maxPerspectiveDeform.toFixed(1) + 'px'
        });
        
        if (homography.quality > 30) {
          setHomographyResult(homography);
          
          // Générer la grille de debug si mode debug actif
          if (debugMode) {
            const grid = generateDebugGrid(homography.matrix, imageDimensions.width, imageDimensions.height, 8);
            setDebugGrid(grid);
          }
        } else {
          console.warn('⚠️ [Canvas] Qualité homographie trop faible, fallback diagonale');
        }
      } else {
        console.warn('⚠️ [Canvas] Corners IA sans perspective visible (rectangle parfait), skip homographie');
        console.log('   → L\'IA a probablement retourné des "correctedCorners" au lieu des "rawCorners"');
      }
      
      // Créer le bounding box à partir des corners fusionnés
      const minX = Math.min(srcPoints[0][0], srcPoints[3][0]);
      const maxX = Math.max(srcPoints[1][0], srcPoints[2][0]);
      const minY = Math.min(srcPoints[0][1], srcPoints[1][1]);
      const maxY = Math.max(srcPoints[2][1], srcPoints[3][1]);
      
      const fusedBox = {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      };
      
      setAdjustableRefBox(fusedBox);
      
      // Recalculer la calibration classique aussi (pour compatibilité)
      recalculateCalibration(fusedBox, true);
      return;
    }
    
    // Sinon, utiliser la méthode classique (bounding box + snap)
    const rawBox = {
      x: (referenceDetected.boundingBox.x / 1000) * imageDimensions.width,
      y: (referenceDetected.boundingBox.y / 1000) * imageDimensions.height,
      width: (referenceDetected.boundingBox.width / 1000) * imageDimensions.width,
      height: (referenceDetected.boundingBox.height / 1000) * imageDimensions.height
    };
    
    console.log(`   rawBox (pixels): x=${rawBox.x.toFixed(0)}, y=${rawBox.y.toFixed(0)}, ${rawBox.width.toFixed(0)}x${rawBox.height.toFixed(0)}px (ratio=${(rawBox.width/rawBox.height).toFixed(3)})`);
    console.log(`   ➡️ L'A4 devrait avoir ratio=${(21/29.7).toFixed(3)} (portrait) ou ${(29.7/21).toFixed(3)} (paysage)`);
    
    // 🆕 AUTO-SNAP aux vrais bords de l'A4 !
    // Ceci corrige les imprécisions de détection de l'IA
    const snappedBox = snapRectangleToEdges(rawBox);
    
    console.log('🎯 [Canvas] Rectangle A4 auto-snappé:', {
      avant: `${rawBox.width.toFixed(0)}x${rawBox.height.toFixed(0)}`,
      apres: `${snappedBox.width.toFixed(0)}x${snappedBox.height.toFixed(0)}`
    });
    
    setAdjustableRefBox(snappedBox);
    
    // 🆕 Recalculer immédiatement la calibration avec le rectangle snappé
    // (sans re-snapper, car déjà fait)
    recalculateCalibration(snappedBox, true); // skipSnap=true
    
  }, [image, referenceDetected, imageDimensions.width, imageDimensions.height, adjustableRefBox, snapRectangleToEdges, recalculateCalibration, fusedCorners, homographyReady, referenceRealSize, debugMode, workflowStep]);

  // 🆕 CRITICAL: Recalculer la calibration ET L'HOMOGRAPHIE quand les referenceCorners sont détectés (workflow guidé)
  // C'est ici que le pixelPerCm est calculé à partir de la feuille A4 détectée !
  useEffect(() => {
    if (!referenceCorners || !quadrilateralMode || !imageDimensions.width) {
      return;
    }
    
    console.log('📐 [Canvas] 🆕 Recalcul calibration + HOMOGRAPHIE depuis referenceCorners (workflow guidé)...');
    
    // 🆕 IMPORTANT: Calculer les dimensions réelles du quadrilatère (pas du bounding box !)
    // car le quadrilatère peut avoir de la perspective (côtés non parallèles)
    
    // Longueurs des côtés horizontaux (en pixels)
    const topEdgeLength = Math.hypot(
      referenceCorners.topRight.x - referenceCorners.topLeft.x,
      referenceCorners.topRight.y - referenceCorners.topLeft.y
    );
    const bottomEdgeLength = Math.hypot(
      referenceCorners.bottomRight.x - referenceCorners.bottomLeft.x,
      referenceCorners.bottomRight.y - referenceCorners.bottomLeft.y
    );
    const avgWidthPx = (topEdgeLength + bottomEdgeLength) / 2;
    
    // Longueurs des côtés verticaux (en pixels)
    const leftEdgeLength = Math.hypot(
      referenceCorners.bottomLeft.x - referenceCorners.topLeft.x,
      referenceCorners.bottomLeft.y - referenceCorners.topLeft.y
    );
    const rightEdgeLength = Math.hypot(
      referenceCorners.bottomRight.x - referenceCorners.topRight.x,
      referenceCorners.bottomRight.y - referenceCorners.topRight.y
    );
    const avgHeightPx = (leftEdgeLength + rightEdgeLength) / 2;
    
    console.log(`📐 [Canvas] Dimensions RÉELLES du quadrilatère (moyenne des côtés):`);
    console.log(`   Côtés horizontaux: top=${topEdgeLength.toFixed(1)}px, bottom=${bottomEdgeLength.toFixed(1)}px → moyenne=${avgWidthPx.toFixed(1)}px`);
    console.log(`   Côtés verticaux: left=${leftEdgeLength.toFixed(1)}px, right=${rightEdgeLength.toFixed(1)}px → moyenne=${avgHeightPx.toFixed(1)}px`);
    
    // Détecter l'orientation (paysage ou portrait)
    const isLandscape = avgWidthPx > avgHeightPx;
    
    // 🎯 ARUCO MODE: Utiliser markerSizeCm au lieu de referenceRealSize
    let refWidth: number;
    let refHeight: number;
    
    if (isArucoMode) {
      // ArUco est toujours carré
      refWidth = markerSizeCm;
      refHeight = markerSizeCm;
      console.log(`🎯 [Canvas] Mode ARUCO actif: dimensions ${markerSizeCm}×${markerSizeCm}cm`);
    } else {
      refWidth = referenceRealSize?.width || 21;
      refHeight = referenceRealSize?.height || 29.7;
      
      // Ajuster les dimensions réelles selon l'orientation détectée (A4 seulement)
      const dimensionsArePortrait = refWidth < refHeight;
      if (isLandscape && dimensionsArePortrait) {
        const tmp = refWidth;
        refWidth = refHeight;
        refHeight = tmp;
        console.log(`🔄 [Canvas] Rectangle PAYSAGE détecté, dimensions: ${refWidth}x${refHeight}cm`);
      } else if (!isLandscape && !dimensionsArePortrait) {
        const tmp = refWidth;
        refWidth = refHeight;
        refHeight = tmp;
        console.log(`🔄 [Canvas] Rectangle PORTRAIT détecté, dimensions: ${refWidth}x${refHeight}cm`);
      }
    }
    
    // 🎯 Calculer les facteurs X/Y basés sur les VRAIES longueurs des côtés
    const newPixelPerCmX = avgWidthPx / refWidth;
    const newPixelPerCmY = avgHeightPx / refHeight;
    const newPixelPerCmMoyen = (newPixelPerCmX + newPixelPerCmY) / 2;
    
    // Calculer le ratio pour debug
    const detectedRatio = avgWidthPx / avgHeightPx;
    const expectedRatio = refWidth / refHeight;
    const ratioError = Math.abs(detectedRatio - expectedRatio) / expectedRatio;
    
    console.log(`📐 [Canvas] CALIBRATION QUADRILATÈRE (côtés réels):`);
    console.log(`   Quadrilatère: ${avgWidthPx.toFixed(1)}x${avgHeightPx.toFixed(1)}px (moyenne des côtés)`);
    console.log(`   Référence réelle: ${refWidth}x${refHeight}cm`);
    console.log(`   Ratio détecté: ${detectedRatio.toFixed(3)} vs attendu: ${expectedRatio.toFixed(3)} (écart ${(ratioError * 100).toFixed(1)}%)`);
    console.log(`   🎯 pixelPerCmX: ${newPixelPerCmX.toFixed(2)} px/cm (basé sur côtés horizontaux)`);
    console.log(`   🎯 pixelPerCmY: ${newPixelPerCmY.toFixed(2)} px/cm (basé sur côtés verticaux)`);
    
    // 🆕 HOMOGRAPHIE: Calculer la matrice de transformation perspective !
    // Cette matrice permet de corriger PRÉCISÉMENT la déformation due à l'angle de prise de vue
    const srcPoints: [number, number][] = [
      [referenceCorners.topLeft.x, referenceCorners.topLeft.y],
      [referenceCorners.topRight.x, referenceCorners.topRight.y],
      [referenceCorners.bottomRight.x, referenceCorners.bottomRight.y],
      [referenceCorners.bottomLeft.x, referenceCorners.bottomLeft.y]
    ];
    
    // Points destination selon le type de référence (ArUco 180mm ou A4)
    const dstPoints = isArucoMode 
      ? createReferenceDestinationPoints('aruco')
      : createReferenceDestinationPoints('a4', isLandscape ? 'paysage' : 'portrait');
    
    // Calculer la déformation perspective
    const topEdgeDy = Math.abs(referenceCorners.topRight.y - referenceCorners.topLeft.y);
    const bottomEdgeDy = Math.abs(referenceCorners.bottomRight.y - referenceCorners.bottomLeft.y);
    const leftEdgeDx = Math.abs(referenceCorners.bottomLeft.x - referenceCorners.topLeft.x);
    const rightEdgeDx = Math.abs(referenceCorners.bottomRight.x - referenceCorners.topRight.x);
    const maxPerspectiveDeform = Math.max(topEdgeDy, bottomEdgeDy, leftEdgeDx, rightEdgeDx);
    
    const refLabel = isArucoMode ? `ArUco ${markerSizeCm}cm` : 'A4';
    console.log(`📐 [Canvas] Analyse PERSPECTIVE ${refLabel}:`);
    console.log(`   Déformation haut: ${topEdgeDy.toFixed(1)}px, bas: ${bottomEdgeDy.toFixed(1)}px`);
    console.log(`   Déformation gauche: ${leftEdgeDx.toFixed(1)}px, droite: ${rightEdgeDx.toFixed(1)}px`);
    console.log(`   🎯 Déformation MAX: ${maxPerspectiveDeform.toFixed(1)}px`);
    
    // TOUJOURS calculer l'homographie si déformation > 1px (seuil très bas !)
    if (maxPerspectiveDeform > 1) {
      console.log(`🎯 [Canvas] ACTIVATION HOMOGRAPHIE (déformation ${maxPerspectiveDeform.toFixed(1)}px > 1px seuil)`);
      
      const homography = computeHomography(srcPoints, dstPoints);
      
      console.log(`✅ [Canvas] HOMOGRAPHIE CALCULÉE depuis referenceCorners:`);
      console.log(`   Qualité: ${homography.quality.toFixed(1)}%`);
      console.log(`   Incertitude: ±${homography.uncertainty.toFixed(1)}%`);
      console.log(`   Perspective détectée: ${maxPerspectiveDeform.toFixed(1)}px`);
      
      if (homography.quality > 20) {
        setHomographyResult(homography);
        setUseHomography(true);
        console.log(`🎯 [Canvas] HOMOGRAPHIE ACTIVÉE ! Les mesures seront corrigées de la perspective.`);
      } else {
        console.warn(`⚠️ [Canvas] Qualité homographie trop faible (${homography.quality.toFixed(1)}%), fallback sur moyenne des côtés`);
      }
    } else {
      console.log(`📐 [Canvas] Pas de perspective significative (${maxPerspectiveDeform.toFixed(1)}px), homographie non nécessaire`);
    }
    
    // Mettre à jour les facteurs
    setPixelPerCmX(newPixelPerCmX);
    setPixelPerCmY(newPixelPerCmY);
    setPixelPerCm(newPixelPerCmMoyen);
    setIsManuallyCalibrated(true);
    
    // Calculer aussi le bounding box pour l'affichage
    const minX = Math.min(referenceCorners.topLeft.x, referenceCorners.bottomLeft.x);
    const maxX = Math.max(referenceCorners.topRight.x, referenceCorners.bottomRight.x);
    const minY = Math.min(referenceCorners.topLeft.y, referenceCorners.topRight.y);
    const maxY = Math.max(referenceCorners.bottomLeft.y, referenceCorners.bottomRight.y);
    
    const refBox = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
    
    // Mettre à jour l'affichage
    setAdjustableRefBox(refBox);
    
    // Notifier le parent
    if (onReferenceAdjusted) {
      const boxBase1000 = {
        x: (refBox.x / imageDimensions.width) * 1000,
        y: (refBox.y / imageDimensions.height) * 1000,
        width: (refBox.width / imageDimensions.width) * 1000,
        height: (refBox.height / imageDimensions.height) * 1000
      };
      const pixelPerCmX_base1000 = newPixelPerCmX * (1000 / imageDimensions.width);
      const pixelPerCmY_base1000 = newPixelPerCmY * (1000 / imageDimensions.height);
      console.log(`   🆕 Callback parent: pixelPerCmX_base1000=${pixelPerCmX_base1000.toFixed(2)}, pixelPerCmY_base1000=${pixelPerCmY_base1000.toFixed(2)}`);
      onReferenceAdjusted(boxBase1000, pixelPerCmX_base1000, pixelPerCmY_base1000);
    }
    
  }, [referenceCorners, quadrilateralMode, imageDimensions.width, imageDimensions.height, referenceRealSize, onReferenceAdjusted, isArucoMode, markerSizeCm]);

  // Update pixelPerCm when calibration changes
  // ⚠️ IMPORTANT: calibration.pixelPerCm est en "base 1000" (pixels sur une image 1000x1000)
  // Les points sont convertis de base 1000 → imageDimensions.width
  // Donc pixelPerCm doit être converti de la même façon !
  useEffect(() => {
    // 🔒 Si on vient de faire un ajustement manuel, ne pas re-convertir !
    // Les valeurs sont déjà correctes en pixels réels
    if (isManuallyCalibrated) {
      console.log('🔒 [Canvas] Calibration manuelle active - skip re-conversion');
      return;
    }
    
    // 🔧 CRITICAL: Attendre que l'image soit chargée pour avoir les vraies dimensions !
    // Sinon on convertit avec les dimensions initiales (800x600) qui sont fausses
    if (!image) {
      console.log('⏳ [Canvas] Image pas encore chargée, skip conversion calibration');
      return;
    }
    
    if (calibration?.pixelPerCm && imageDimensions.width > 0) {
      // Convertir de base 1000 vers les dimensions réelles de l'image affichée
      const ratioX = imageDimensions.width / 1000;
      const ratioY = imageDimensions.height / 1000;
      
      // 🆕 Si la calibration a des facteurs X/Y séparés, les utiliser
      const calPixelPerCmX = (calibration as any).pixelPerCmX || calibration.pixelPerCm;
      const calPixelPerCmY = (calibration as any).pixelPerCmY || calibration.pixelPerCm;
      
      const adjustedPixelPerCmX = calPixelPerCmX * ratioX;
      const adjustedPixelPerCmY = calPixelPerCmY * ratioY;
      const adjustedPixelPerCm = (adjustedPixelPerCmX + adjustedPixelPerCmY) / 2;
      
      console.log(`📏 [Canvas] Calibration ajustée (depuis parent):`);
      console.log(`   Base 1000: pixelPerCmX=${calPixelPerCmX.toFixed(2)}, pixelPerCmY=${calPixelPerCmY.toFixed(2)}`);
      console.log(`   → Réel: pixelPerCmX=${adjustedPixelPerCmX.toFixed(2)}, pixelPerCmY=${adjustedPixelPerCmY.toFixed(2)} px/cm`);
      console.log(`   Ratios: X=${ratioX.toFixed(3)}, Y=${ratioY.toFixed(3)}`);
      
      setPixelPerCmX(adjustedPixelPerCmX);
      setPixelPerCmY(adjustedPixelPerCmY);
      setPixelPerCm(adjustedPixelPerCm);
    }
  }, [image, calibration, imageDimensions.width, imageDimensions.height, isManuallyCalibrated]);

  // 🔒 Flag pour ne pas écraser les points après modification manuelle
  const [hasAppliedInitialPoints, setHasAppliedInitialPoints] = useState(false);
  
  // 🆕 Stocker les dimensions utilisées lors de la dernière conversion pour détecter les changements
  const [lastScaledDimensions, setLastScaledDimensions] = useState<{width: number, height: number} | null>(null);

  // 🆕 Scale initial points from base 1000 to actual image dimensions
  // 🔒 Ne s'applique qu'UNE SEULE FOIS au chargement, ou si les dimensions ont changé significativement
  useEffect(() => {
    // � CRITICAL: Attendre que l'image soit chargée pour avoir les vraies dimensions !
    // Les dimensions initiales (800x600) sont des placeholders, pas les vraies valeurs
    if (!image) {
      console.log('⏳ [Canvas] Image pas encore chargée, skip scaling des points');
      return;
    }
    
    // Pas de points à scaler
    if (initialPoints.length === 0 || imageDimensions.width <= 0) {
      return;
    }
    
    // 🔒 Vérifier si on doit re-scaler ou pas
    if (hasAppliedInitialPoints && lastScaledDimensions) {
      // Vérifier si les dimensions ont changé de façon significative (> 10%)
      const widthChange = Math.abs(imageDimensions.width - lastScaledDimensions.width) / lastScaledDimensions.width;
      const heightChange = Math.abs(imageDimensions.height - lastScaledDimensions.height) / lastScaledDimensions.height;
      
      if (widthChange < 0.1 && heightChange < 0.1) {
        console.log('🔒 [Canvas] Points initiaux déjà appliqués et dimensions stables, skip');
        return;
      }
      console.log(`🔄 [Canvas] Dimensions changées significativement (w: ${(widthChange*100).toFixed(0)}%, h: ${(heightChange*100).toFixed(0)}%), re-scaling points...`);
    }
    
    // Les points de l'IA sont en base 1000x1000, on les convertit aux dimensions réelles
    const scaledPoints = initialPoints.map(p => ({
      ...p,
      x: (p.x / 1000) * imageDimensions.width,
      y: (p.y / 1000) * imageDimensions.height
    }));
    
    console.log('📐 [Canvas] Points scalés de base 1000 vers pixels:', {
      original: initialPoints.map(p => ({ x: p.x.toFixed(0), y: p.y.toFixed(0) })),
      scaled: scaledPoints.map(p => ({ x: p.x.toFixed(0), y: p.y.toFixed(0) })),
      imageDimensions: { width: imageDimensions.width.toFixed(0), height: imageDimensions.height.toFixed(0) }
    });
    
    setPoints(scaledPoints);
    setLastScaledDimensions({ width: imageDimensions.width, height: imageDimensions.height });
    setHasAppliedInitialPoints(true); // 🔒 Marquer comme appliqué
  }, [image, initialPoints, imageDimensions.width, imageDimensions.height]);

  // ============================================================================
  // HISTORY MANAGEMENT
  // ============================================================================

  const saveToHistory = useCallback((newPoints: MeasurementPoint[], newZones: ExclusionZone[]) => {
    const newState: HistoryState = { points: [...newPoints], exclusionZones: [...newZones] };
    
    // Remove future states if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    
    // Keep max 50 states
    if (newHistory.length > 50) {
      newHistory.shift();
    }
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setPoints(prevState.points);
      setExclusionZones(prevState.exclusionZones);
      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setPoints(nextState.points);
      setExclusionZones(nextState.exclusionZones);
      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex]);

  // ============================================================================
  // MEASUREMENTS CALCULATION - AVEC HOMOGRAPHIE !
  // ============================================================================

  const measurements = useMemo((): MeasurementResults & { 
    incertitude_largeur_cm?: number;
    incertitude_hauteur_cm?: number;
    homography_quality?: number;
  } => {
    if (points.length < 2) return {};
    
    // 🔧 DEBUG: Vérifier si optimalCorrection est reçu
    console.log(`📏 [Canvas] optimalCorrection reçu:`, optimalCorrection ? `×${optimalCorrection.finalCorrection.toFixed(4)} (confiance: ${(optimalCorrection.globalConfidence * 100).toFixed(0)}%)` : 'null');
    
    // 🔧 CRITICAL: Vérifier que les points sont dans des dimensions cohérentes avec l'image
    const maxPointX = Math.max(...points.map(p => p.x));
    const maxPointY = Math.max(...points.map(p => p.y));
    
    if (maxPointX > imageDimensions.width * 1.1 || maxPointY > imageDimensions.height * 1.1) {
      console.warn(`⚠️ [Canvas] Points pas encore scalés ! maxX=${maxPointX.toFixed(0)} > width=${imageDimensions.width}, maxY=${maxPointY.toFixed(0)} > height=${imageDimensions.height}`);
      console.warn(`   → Les mesures seront recalculées après le scaling`);
      return {}; // Ne pas calculer avec des valeurs incohérentes
    }

    const results: MeasurementResults & { 
      incertitude_largeur_cm?: number;
      incertitude_hauteur_cm?: number;
      homography_quality?: number;
    } = {};

    // 🆕 HOMOGRAPHIE: Si disponible et activée, utiliser pour mesures précises
    const useHomographyCalc = useHomography && homographyResult && homographyResult.quality > 50;
    
    console.log(`📏 [Canvas] === CALCUL MESURES ===`);
    console.log(`   Mode: ${useHomographyCalc ? '🎯 HOMOGRAPHIE (précis)' : '📐 DIAGONALE (fallback)'}`);
    if (homographyResult) {
      console.log(`   Qualité homographie: ${homographyResult.quality.toFixed(1)}%, Incertitude: ±${homographyResult.uncertainty.toFixed(1)}%`);
    }
    console.log(`   Points: ${points.map(p => `${p.label || p.id}(${p.x.toFixed(1)}, ${p.y.toFixed(1)})`).join(', ')}`);

    // Pour 4 points, trouver les vrais coins
    if (points.length >= 4) {
      const allX = points.slice(0, 4).map(p => p.x);
      const allY = points.slice(0, 4).map(p => p.y);
      
      const minX = Math.min(...allX);
      const maxX = Math.max(...allX);
      const minY = Math.min(...allY);
      const maxY = Math.max(...allY);

      if (useHomographyCalc && homographyResult) {
        // 🎯 MÉTHODE HOMOGRAPHIE: Transformation perspective exacte
        // Les points sont transformés vers l'espace "redressé" en mm
        
        // 🐛 FIX: Utiliser les VRAIS 4 points placés par l'utilisateur
        // au lieu de reconstruire un bounding box rectangulaire !
        // L'ordre des points est: topLeft (A/1), topRight (B/2), bottomRight (D/4), bottomLeft (C/3)
        // Mais l'utilisateur peut les placer dans n'importe quel ordre...
        
        // Trier les 4 points pour identifier les coins :
        // - Top = les 2 points avec les plus petits Y
        // - Left = parmi top et bottom, celui avec le plus petit X
        const sortedByY = [...points.slice(0, 4)].sort((a, b) => a.y - b.y);
        const topPoints = sortedByY.slice(0, 2).sort((a, b) => a.x - b.x); // Triés par X
        const bottomPoints = sortedByY.slice(2, 4).sort((a, b) => a.x - b.x); // Triés par X
        
        const topLeft: [number, number] = [topPoints[0].x, topPoints[0].y];
        const topRight: [number, number] = [topPoints[1].x, topPoints[1].y];
        const bottomLeft: [number, number] = [bottomPoints[0].x, bottomPoints[0].y];
        const bottomRight: [number, number] = [bottomPoints[1].x, bottomPoints[1].y];
        
        console.log(`   🔍 [HOMOGRAPHIE] Coins triés (en pixels image):`);
        console.log(`      TopLeft: (${topLeft[0].toFixed(0)}, ${topLeft[1].toFixed(0)})`);
        console.log(`      TopRight: (${topRight[0].toFixed(0)}, ${topRight[1].toFixed(0)})`);
        console.log(`      BottomLeft: (${bottomLeft[0].toFixed(0)}, ${bottomLeft[1].toFixed(0)})`);
        console.log(`      BottomRight: (${bottomRight[0].toFixed(0)}, ${bottomRight[1].toFixed(0)})`);
        
        // 🆕 DEBUG: Afficher les coordonnées transformées par l'homographie
        const realTopLeft = applyHomography(homographyResult.matrix, topLeft);
        const realTopRight = applyHomography(homographyResult.matrix, topRight);
        const realBottomLeft = applyHomography(homographyResult.matrix, bottomLeft);
        const realBottomRight = applyHomography(homographyResult.matrix, bottomRight);
        console.log(`   🔄 [HOMOGRAPHIE] Coins TRANSFORMÉS (en mm dans le plan réel):`);
        console.log(`      TopLeft: (${realTopLeft[0].toFixed(1)}, ${realTopLeft[1].toFixed(1)}) mm`);
        console.log(`      TopRight: (${realTopRight[0].toFixed(1)}, ${realTopRight[1].toFixed(1)}) mm`);
        console.log(`      BottomLeft: (${realBottomLeft[0].toFixed(1)}, ${realBottomLeft[1].toFixed(1)}) mm`);
        console.log(`      BottomRight: (${realBottomRight[0].toFixed(1)}, ${realBottomRight[1].toFixed(1)}) mm`);
        
        // Calculer largeur avec homographie (haut et bas, prendre moyenne)
        const widthTop = computeRealDistanceWithUncertainty(
          homographyResult.matrix, topLeft, topRight, homographyResult.uncertainty
        );
        const widthBottom = computeRealDistanceWithUncertainty(
          homographyResult.matrix, bottomLeft, bottomRight, homographyResult.uncertainty
        );
        
        console.log(`   📏 [HOMOGRAPHIE] Largeur haut: ${(widthTop.distance / 10).toFixed(2)} cm`);
        console.log(`   📏 [HOMOGRAPHIE] Largeur bas: ${(widthBottom.distance / 10).toFixed(2)} cm`);
        
        const avgWidthMM = (widthTop.distance + widthBottom.distance) / 2;
        results.largeur_cm = avgWidthMM / 10; // mm → cm
        results.incertitude_largeur_cm = (widthTop.uncertainty + widthBottom.uncertainty) / 2 / 10;
        
        // Calculer hauteur avec homographie (gauche et droite, prendre moyenne)
        const heightLeft = computeRealDistanceWithUncertainty(
          homographyResult.matrix, topLeft, bottomLeft, homographyResult.uncertainty
        );
        const heightRight = computeRealDistanceWithUncertainty(
          homographyResult.matrix, topRight, bottomRight, homographyResult.uncertainty
        );
        
        console.log(`   📏 [HOMOGRAPHIE] Hauteur gauche: ${(heightLeft.distance / 10).toFixed(2)} cm`);
        console.log(`   📏 [HOMOGRAPHIE] Hauteur droite: ${(heightRight.distance / 10).toFixed(2)} cm`);
        
        const avgHeightMM = (heightLeft.distance + heightRight.distance) / 2;
        results.hauteur_cm = avgHeightMM / 10; // mm → cm
        results.incertitude_hauteur_cm = (heightLeft.uncertainty + heightRight.uncertainty) / 2 / 10;
        
        results.homography_quality = homographyResult.quality;
        
        console.log(`   🎯 [HOMOGRAPHIE] Largeur FINALE: ${results.largeur_cm.toFixed(2)} ± ${results.incertitude_largeur_cm?.toFixed(1)} cm`);
        console.log(`   🎯 [HOMOGRAPHIE] Hauteur FINALE: ${results.hauteur_cm.toFixed(2)} ± ${results.incertitude_hauteur_cm?.toFixed(1)} cm`);
        
      } else {
        // 📐 MÉTHODE FALLBACK: Calcule les VRAIES longueurs des côtés du quadrilatère !
        // ⚠️ NE PAS utiliser bounding box (maxX-minX) car ça ignore la perspective !
        const effectivePixelPerCmX = pixelPerCmX;
        const effectivePixelPerCmY = pixelPerCmY;
        
        // 🎯 Trier les 4 points pour identifier les coins du quadrilatère
        const sortedByY = [...points.slice(0, 4)].sort((a, b) => a.y - b.y);
        const topPts = sortedByY.slice(0, 2).sort((a, b) => a.x - b.x);
        const bottomPts = sortedByY.slice(2, 4).sort((a, b) => a.x - b.x);
        
        const topLeft = topPts[0];
        const topRight = topPts[1];
        const bottomLeft = bottomPts[0];
        const bottomRight = bottomPts[1];
        
        // 🆕 Calculer les VRAIES longueurs des 4 côtés (pas la bounding box !)
        const topEdgeLength = Math.hypot(topRight.x - topLeft.x, topRight.y - topLeft.y);
        const bottomEdgeLength = Math.hypot(bottomRight.x - bottomLeft.x, bottomRight.y - bottomLeft.y);
        const leftEdgeLength = Math.hypot(bottomLeft.x - topLeft.x, bottomLeft.y - topLeft.y);
        const rightEdgeLength = Math.hypot(bottomRight.x - topRight.x, bottomRight.y - topRight.y);
        
        // Moyenne des côtés opposés
        const avgWidthPx = (topEdgeLength + bottomEdgeLength) / 2;
        const avgHeightPx = (leftEdgeLength + rightEdgeLength) / 2;
        
        console.log(`   📐 [FALLBACK] Côtés du quadrilatère (vraies longueurs):`);
        console.log(`      Haut: ${topEdgeLength.toFixed(1)}px, Bas: ${bottomEdgeLength.toFixed(1)}px → moyenne: ${avgWidthPx.toFixed(1)}px`);
        console.log(`      Gauche: ${leftEdgeLength.toFixed(1)}px, Droite: ${rightEdgeLength.toFixed(1)}px → moyenne: ${avgHeightPx.toFixed(1)}px`);
        
        // ⚠️ DEBUG: Comparer avec la bounding box pour montrer la différence
        const boundingBoxWidth = maxX - minX;
        const boundingBoxHeight = maxY - minY;
        console.log(`      ⚠️ Bounding box (ANCIEN): ${boundingBoxWidth.toFixed(0)}x${boundingBoxHeight.toFixed(0)}px`);
        console.log(`      ✅ Quadrilatère (NOUVEAU): ${avgWidthPx.toFixed(0)}x${avgHeightPx.toFixed(0)}px`);
        
        // Calculer les mesures avec les VRAIES longueurs
        results.largeur_cm = avgWidthPx / effectivePixelPerCmX;
        results.incertitude_largeur_cm = results.largeur_cm * 0.05;
        console.log(`   📐 [FALLBACK] Largeur: ${avgWidthPx.toFixed(0)}px ÷ ${effectivePixelPerCmX.toFixed(2)} (X) = ${results.largeur_cm.toFixed(2)} cm`);
        
        results.hauteur_cm = avgHeightPx / effectivePixelPerCmY;
        results.incertitude_hauteur_cm = results.hauteur_cm * 0.05;
        console.log(`   📐 [FALLBACK] Hauteur: ${avgHeightPx.toFixed(0)}px ÷ ${effectivePixelPerCmY.toFixed(2)} (Y) = ${results.hauteur_cm.toFixed(2)} cm`);
      }
      
      // 🔧 CORRECTION OPTIMALE: Appliquer le facteur de correction calculé par l'API
      // ⚠️ IMPORTANT: Quand l'homographie est utilisée, elle a DÉJÀ intégré le biais du marqueur (bandes).
      // Le backend calcule SÉPARÉMENT correctionXSansBandes et correctionYSansBandes pour ce cas.
      if (optimalCorrection && optimalCorrection.finalCorrection !== 1) {
        const rawLargeur = results.largeur_cm;
        const rawHauteur = results.hauteur_cm;
        
        // 🆕 DÉTERMINER SI L'HOMOGRAPHIE A DÉJÀ CORRIGÉ
        const homographyUsed = useHomography && homographyResult && homographyResult.quality > 50;
        
        let corrX: number;
        let corrY: number;
        let correctionMode: string;
        
        if (homographyUsed) {
          // ✅ HOMOGRAPHIE DE QUALITÉ: Utiliser les corrections SANS BANDES calculées par le backend
          // L'homographie utilise le marqueur comme référence → le biais des bandes est déjà intégré
          // Le backend a calculé correctionXSansBandes et correctionYSansBandes SÉPARÉMENT
          
          if (optimalCorrection.correctionXSansBandes !== undefined && 
              optimalCorrection.correctionYSansBandes !== undefined) {
            // 🎯 UTILISER DIRECTEMENT les corrections X/Y séparées sans bandes
            corrX = optimalCorrection.correctionXSansBandes;
            corrY = optimalCorrection.correctionYSansBandes;
            correctionMode = `HOMOGRAPHIE (${homographyResult.quality.toFixed(0)}%) - SANS BANDES X=×${corrX.toFixed(4)} Y=×${corrY.toFixed(4)}`;
          } else {
            // Fallback si le backend n'a pas calculé les corrections sans bandes
            // (ne devrait pas arriver avec le nouveau code)
            corrX = 1.0;
            corrY = 1.0;
            correctionMode = `HOMOGRAPHIE (${homographyResult.quality.toFixed(0)}%) - pas de correction (backend ancien)`;
          }
          
          console.log(`   📊 [CORRECTION SANS BANDES] Backend: X=×${corrX.toFixed(4)}, Y=×${corrY.toFixed(4)}`);
          console.log(`      (Bandes exclues car déjà intégrées dans l'homographie)`);
          
        } else {
          // ❌ PAS D'HOMOGRAPHIE: Appliquer correction COMPLÈTE (bandes incluses)
          // Les bandes détectent le biais du marqueur et le corrigent
          corrX = optimalCorrection.correctionX || optimalCorrection.finalCorrection;
          corrY = optimalCorrection.correctionY || optimalCorrection.finalCorrection;
          correctionMode = `SANS HOMOGRAPHIE - correction complète X=×${corrX.toFixed(4)} Y=×${corrY.toFixed(4)}`;
        }
        
        results.largeur_cm = rawLargeur * corrX;
        results.hauteur_cm = rawHauteur * corrY;
        
        console.log(`   🔧 [CORRECTION OPTIMALE] Mode: ${correctionMode}`);
        console.log(`      Confiance globale: ${(optimalCorrection.globalConfidence * 100).toFixed(0)}%`);
        console.log(`      Correction X: ×${corrX.toFixed(4)} | Y: ×${corrY.toFixed(4)}`);
        console.log(`      Largeur: ${rawLargeur.toFixed(2)} → ${results.largeur_cm.toFixed(2)} cm`);
        console.log(`      Hauteur: ${rawHauteur.toFixed(2)} → ${results.hauteur_cm.toFixed(2)} cm`);
        
        // Stocker les valeurs brutes pour référence
        (results as any).largeur_cm_brute = rawLargeur;
        (results as any).hauteur_cm_brute = rawHauteur;
        (results as any).correction_appliquee_X = corrX;
        (results as any).correction_appliquee_Y = corrY;
        (results as any).correction_confidence = optimalCorrection.globalConfidence;
        (results as any).correction_mode = correctionMode;
      }
      
      // Surface = largeur_cm × hauteur_cm
      const coords: Array<[number, number]> = points.slice(0, 4).map(p => [p.x, p.y]);
      const areaCm2 = results.largeur_cm * results.hauteur_cm;
      results.surface_brute_cm2 = areaCm2;
      results.surface_brute_m2 = areaCm2 / 10000;

      // Zones d'exclusion (utiliser pixelPerCm pour compatibilité)
      const effectivePixelPerCm = pixelPerCm;
      let excludedArea = 0;
      for (const zone of exclusionZones) {
        excludedArea += calculatePolygonArea(zone.points, effectivePixelPerCm);
      }
      results.surface_nette_cm2 = areaCm2 - excludedArea;
      results.surface_nette_m2 = (areaCm2 - excludedArea) / 10000;

      // Perimeter
      let perimeter = 0;
      for (let i = 0; i < coords.length; i++) {
        const j = (i + 1) % coords.length;
        perimeter += calculateDistance(coords[i], coords[j], effectivePixelPerCm);
      }
      results.perimetre_cm = perimeter;
      results.perimetre_m = perimeter / 100;

      // Diagonal
      results.diagonale_cm = calculateDistance(coords[0], coords[2], effectivePixelPerCm);
    }

    return results;
  }, [points, exclusionZones, pixelPerCm, pixelPerCmX, pixelPerCmY, imageDimensions, useHomography, homographyResult, optimalCorrection]);

  // Notify parent of measurement changes
  useEffect(() => {
    console.log('🔔 [Canvas] ENVOI mesures au parent:', JSON.stringify(measurements, null, 2));
    console.log(`   largeur_cm = ${measurements.largeur_cm?.toFixed(2)} cm`);
    console.log(`   hauteur_cm = ${measurements.hauteur_cm?.toFixed(2)} cm`);
    onMeasurementsChange?.(measurements);
  }, [measurements, onMeasurementsChange]);

  // ============================================================================
  // POINT MANAGEMENT
  // ============================================================================

  const addPoint = useCallback((x: number, y: number) => {
    const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
    const existingLabels = points.map(p => p.label);
    const nextLabel = labels.find(l => !existingLabels.includes(l)) || `P${points.length + 1}`;

    const newPoint: MeasurementPoint = {
      id: `point_${Date.now()}`,
      x,
      y,
      type: points.length < 4 ? 'primary' : 'custom',
      label: nextLabel,
      color: points.length < 4 ? colors.primaryPoint : colors.customPoint,
      draggable: !readOnly
    };

    const newPoints = [...points, newPoint];
    setPoints(newPoints);
    saveToHistory(newPoints, exclusionZones);
    setSelectedTool('select');
  }, [points, exclusionZones, colors, readOnly, saveToHistory]);

  const removePoint = useCallback((pointId: string) => {
    if (points.length <= minPoints) {
      message.warning(`Minimum ${minPoints} points requis`);
      return;
    }

    const newPoints = points.filter(p => p.id !== pointId);
    setPoints(newPoints);
    saveToHistory(newPoints, exclusionZones);
    setSelectedPointId(null);
  }, [points, exclusionZones, minPoints, saveToHistory]);

  const movePoint = useCallback((pointId: string, newX: number, newY: number) => {
    const newPoints = points.map(p =>
      p.id === pointId ? { ...p, x: newX, y: newY } : p
    );
    setPoints(newPoints);
  }, [points]);

  // 🆕 ZOOM AUTO + CENTRAGE sur un point
  const zoomToPoint = useCallback((pointX: number, pointY: number, zoomLevel: number = 2) => {
    // Calculer la position du stage pour centrer sur le point
    const containerWidth = imageDimensions.width;
    const containerHeight = imageDimensions.height;
    
    // Le point doit être au centre de la zone visible
    // Position du stage = -(position du point * zoom) + (moitié de la largeur visible)
    const newX = -(pointX * zoomLevel) + (containerWidth / 2);
    const newY = -(pointY * zoomLevel) + (containerHeight / 2);
    
    // Limiter pour ne pas sortir de l'image
    const maxX = 0;
    const minX = -(imageDimensions.width * zoomLevel - containerWidth);
    const maxY = 0;
    const minY = -(imageDimensions.height * zoomLevel - containerHeight);
    
    setStagePosition({
      x: Math.min(maxX, Math.max(minX, newX)),
      y: Math.min(maxY, Math.max(minY, newY))
    });
    setZoom(zoomLevel);
    
    console.log(`🔍 [Canvas] Zoom automatique x${zoomLevel} centré sur (${pointX.toFixed(0)}, ${pointY.toFixed(0)})`);
  }, [imageDimensions]);

  // 🆕 Réinitialiser zoom et position
  const resetZoom = useCallback(() => {
    setZoom(1);
    setStagePosition({ x: 0, y: 0 });
    setPointBeingPlaced(null);
    console.log('🔍 [Canvas] Zoom réinitialisé');
  }, []);

  // 🆕 NOUVEAU WORKFLOW: Clic sur point → zoom, clic ailleurs → placer, clic fond → reset
  
  // Sélectionner un point pour repositionnement (zoom dessus)
  const selectPointForPlacement = useCallback((pointId: string, pointX: number, pointY: number) => {
    console.log(`🎯 [Canvas] Point ${pointId} sélectionné pour repositionnement`);
    setPointBeingPlaced(pointId);
    setSelectedPointId(pointId);
    
    // Zoomer x2 centré sur le point
    zoomToPoint(pointX, pointY, 2);
    message.info({ content: '🎯 Cliquez sur la nouvelle position du point', duration: 2 });
  }, [zoomToPoint]);

  // Placer le point sélectionné à une nouvelle position
  const placePointAt = useCallback((targetX: number, targetY: number) => {
    if (!pointBeingPlaced) return false;
    
    // Snap au bord si possible
    const snapped = snapPointToEdge(targetX, targetY, 25);
    const finalX = snapped.x;
    const finalY = snapped.y;
    
    console.log(`📍 [Canvas] Point ${pointBeingPlaced} déplacé vers (${finalX.toFixed(0)}, ${finalY.toFixed(0)})`);
    
    // Mettre à jour le point
    const newPoints = points.map(p => 
      p.id === pointBeingPlaced ? { ...p, x: finalX, y: finalY } : p
    );
    setPoints(newPoints);
    saveToHistory(newPoints, exclusionZones);
    
    if (snapped.snapped) {
      message.success({ content: '🎯 Point ajusté sur le bord !', duration: 1 });
    }
    
    // Reset: revenir en vue complète pour sélectionner un autre point
    setPointBeingPlaced(null);
    setSelectedPointId(null);
    resetZoom();
    
    return true;
  }, [pointBeingPlaced, points, snapPointToEdge, saveToHistory, exclusionZones, resetZoom]);

  // Annuler le placement en cours (clic sur fond)
  const cancelPointPlacement = useCallback(() => {
    if (pointBeingPlaced) {
      console.log('❌ [Canvas] Placement annulé, retour vue complète');
      setPointBeingPlaced(null);
      setSelectedPointId(null);
      resetZoom();
    }
  }, [pointBeingPlaced, resetZoom]);

  // 🆕 Handlers de drag simplifiés (pour compatibilité, mais le nouveau mode utilise les clics)
  const handlePointDragMove = useCallback((pointId: string, e: KonvaEventObject<DragEvent>) => {
    // Mode drag classique: mise à jour en temps réel avec snap
    const rawX = e.target.x();
    const rawY = e.target.y();
    
    const snapped = snapPointToEdge(rawX, rawY, 20);
    
    if (snapped.snapped) {
      e.target.x(snapped.x);
      e.target.y(snapped.y);
    }
    
    const newPoints = points.map(p => 
      p.id === pointId ? { ...p, x: snapped.snapped ? snapped.x : rawX, y: snapped.snapped ? snapped.y : rawY } : p
    );
    setPoints(newPoints);
  }, [points, snapPointToEdge]);

  const handlePointDragEnd = useCallback((pointId: string, e: KonvaEventObject<DragEvent>) => {
    const rawX = e.target.x();
    const rawY = e.target.y();
    
    const snapped = snapPointToEdge(rawX, rawY, 25);
    
    const finalPoints = points.map(p => p.id === pointId ? { ...p, x: snapped.x, y: snapped.y } : p);
    setPoints(finalPoints);
    saveToHistory(finalPoints, exclusionZones);
    
    if (snapped.snapped) {
      message.success({ content: '🎯 Point ajusté sur le bord !', duration: 1 });
    }
  }, [points, exclusionZones, saveToHistory, snapPointToEdge]);

  // 🆕 PAN: Permettre de déplacer l'image quand zoomée (désactivé si on place un point)
  const handleStagePanStart = useCallback((e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    // Pas de pan si on est en mode placement de point
    if (pointBeingPlaced) return;
    
    if (zoom > 1) {
      const clickedOnStage = e.target === e.target.getStage();
      const clickedOnImage = e.target.getClassName() === 'Image';
      
      if (clickedOnStage || clickedOnImage) {
        setIsPanning(true);
        const stage = e.target.getStage();
        const pos = stage?.getPointerPosition();
        if (pos) {
          setLastPanPosition({ x: pos.x, y: pos.y });
        }
      }
    }
  }, [zoom, pointBeingPlaced]);

  const handleStagePanMove = useCallback((e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!isPanning || zoom <= 1) return;
    
    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos) return;
    
    const dx = pos.x - lastPanPosition.x;
    const dy = pos.y - lastPanPosition.y;
    
    const containerWidth = imageDimensions.width;
    const containerHeight = imageDimensions.height;
    const maxX = 0;
    const minX = -(imageDimensions.width * zoom - containerWidth);
    const maxY = 0;
    const minY = -(imageDimensions.height * zoom - containerHeight);
    
    setStagePosition(prev => ({
      x: Math.min(maxX, Math.max(minX, prev.x + dx)),
      y: Math.min(maxY, Math.max(minY, prev.y + dy))
    }));
    
    setLastPanPosition({ x: pos.x, y: pos.y });
  }, [isPanning, zoom, lastPanPosition, imageDimensions]);

  const handleStagePanEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  // ============================================================================
  // EXCLUSION ZONE MANAGEMENT
  // ============================================================================

  const [drawingZone, setDrawingZone] = useState<{ start: [number, number]; end: [number, number] } | null>(null);

  const startDrawingZone = useCallback((x: number, y: number) => {
    setDrawingZone({ start: [x, y], end: [x, y] });
  }, []);

  const updateDrawingZone = useCallback((x: number, y: number) => {
    setDrawingZone(prev => (prev ? { ...prev, end: [x, y] } : prev));
  }, []);

  // 🆕 Fonction pour détecter les coins via l'IA - DYNAMIQUE selon config TBL
  // 🔀 NOUVEAU: Utilise la fusion multi-photos si allPhotos disponible !
  const detectCornersInZone = useCallback(async (
    zone: { x: number; y: number; width: number; height: number },
    targetType: 'reference' | 'measurement'
  ) => {
    if (!api || (!imageBase64 && (!allPhotos || allPhotos.length === 0))) {
      console.warn('❌ API ou images non disponibles pour la détection de coins');
      message.error('Détection IA non disponible');
      return null;
    }

    setIsDetectingCorners(true);
    
    try {
      // 🆕 DYNAMIQUE: Construire le type et la description selon la config TBL
      let objectType: string;
      let objectDescription: string;
      let realDimensions: { width: number; height: number } | undefined;
      
      if (targetType === 'reference') {
        // Config de l'objet de référence depuis TBL
        const refType = referenceConfig?.referenceType || 'a4';
        objectType = refType;
        
        if (refType === 'a4') {
          objectDescription = 'Feuille A4 blanche rectangulaire (21cm x 29.7cm). Chercher le papier BLANC avec ratio hauteur/largeur ≈ 1.41';
          realDimensions = { width: 21, height: 29.7 };
        } else if (refType === 'card') {
          objectDescription = 'Carte bancaire standard (8.56cm x 5.4cm). Chercher le rectangle plastique horizontal avec ratio largeur/hauteur ≈ 1.59';
          realDimensions = { width: 8.56, height: 5.4 };
        } else if (refType === 'meter') {
          objectDescription = 'Mètre ruban ou règle graduée. Chercher la bande graduée allongée';
          realDimensions = { width: 100, height: 3 };
        } else if (refType === 'custom' && referenceConfig?.customName) {
          objectDescription = `${referenceConfig.customName} (${referenceConfig.customWidth || 10}cm x ${referenceConfig.customHeight || 10}cm)`;
          realDimensions = { width: referenceConfig.customWidth || 10, height: referenceConfig.customHeight || 10 };
        } else {
          objectDescription = 'Objet de référence rectangulaire pour calibration';
        }
      } else {
        // Config de l'objet à mesurer depuis TBL
        const measType = measurementObjectConfig?.objectType || 'door';
        objectType = measType;
        
        if (measurementObjectConfig?.objectDescription) {
          objectDescription = measurementObjectConfig.objectDescription;
        } else if (measType === 'door') {
          objectDescription = 'PORTE COMPLÈTE: Trouver le cadre extérieur de la porte entière (environ 70-90cm large, 200-210cm haut). Ignorer les petits éléments sur la porte.';
        } else if (measType === 'window') {
          objectDescription = 'FENÊTRE COMPLÈTE: Trouver le cadre extérieur de la fenêtre entière. Inclure tout le châssis visible.';
        } else if (measType === 'chassis') {
          objectDescription = 'CHÂSSIS COMPLET: Trouver le cadre extérieur du châssis de fenêtre ou porte. Mesurer le rectangle englobant.';
        } else {
          objectDescription = measurementObjectConfig?.objectName || 'Objet rectangulaire à mesurer';
        }
      }
      
      console.log(`🎯 [Canvas] Détection IA des coins pour ${targetType}:`, { objectType, objectDescription });
      console.log(`📐 [Canvas] Zone sélectionnée:`, zone);
      
      // 🔀 NOUVEAU: Utiliser l'endpoint avec FUSION si plusieurs photos disponibles
      if (allPhotos && allPhotos.length > 1) {
        console.log(`🔀 [Canvas] 🆕 Détection avec FUSION de ${allPhotos.length} photos !`);
        
        // Préparer les photos pour la fusion - utiliser imageBase64 (cohérent avec Preview)
        // Filtrer les photos sans données pour éviter les erreurs
        const photosForFusion = allPhotos
          .filter(photo => photo.imageBase64 && photo.imageBase64.length > 100)
          .map(photo => {
            const b64 = photo.imageBase64;
            return {
              base64: b64.includes(',') ? b64.split(',')[1] : b64,
              mimeType: photo.mimeType || 'image/jpeg',
              metadata: photo.metadata
            };
          });
        
        if (photosForFusion.length === 0) {
          console.error('❌ [Canvas] Aucune photo valide pour la fusion');
          message.error('Aucune photo valide disponible');
          return null;
        }
        
        console.log(`📸 [Canvas] ${photosForFusion.length} photos valides pour fusion`);
        
        const response = await api.post('/measurement-reference/detect-with-fusion', {
          photos: photosForFusion,
          selectionZone: zone,
          referenceType: objectType,
          objectDescription,
          realDimensions,
          targetType
        });

        console.log('✅ [Canvas] Coins détectés avec FUSION:', response);
        
        // Afficher métriques de fusion si disponibles
        if (response?.fusionMetrics) {
          console.log(`📊 [Canvas] Fusion: ${response.fusionMetrics.usedPhotos}/${response.fusionMetrics.inputPhotos} photos, sharpness: ${response.fusionMetrics.finalSharpness?.toFixed(1)}`);
          message.success(`🔀 Fusion ${response.fusionMetrics.usedPhotos} photos → Détection ${response.method?.includes('edge') ? 'précise' : 'IA'}`);
        }
        
        return response;
      }
      
      // 🔧 FALLBACK: Si une seule photo, utiliser l'ancien endpoint
      let cleanBase64 = imageBase64 || (allPhotos?.[0]?.imageBase64 || '');
      if (cleanBase64.includes(',')) {
        cleanBase64 = cleanBase64.split(',')[1];
      }
      console.log(`📷 [Canvas] Image base64 nettoyée: ${cleanBase64.length} chars`);
      
      const response = await api.post('/measurement-reference/detect-corners-in-zone', {
        imageBase64: cleanBase64,
        mimeType,
        selectionZone: zone,
        objectType,
        objectDescription,
        realDimensions,
        targetType
      });

      console.log('✅ [Canvas] Coins détectés par IA:', response);
      
      // 🆕 DEBUG: Afficher le contenu complet de la réponse IA pour comprendre les échecs
      if (response?._debug) {
        console.log('🔍 [Canvas] DEBUG - Réponse IA complète:', response._debug.fullContent);
        console.log('🔍 [Canvas] DEBUG - API Success:', response._debug.apiSuccess);
        console.log('🔍 [Canvas] DEBUG - Content length:', response._debug.contentLength);
      }
      
      return response;
    } catch (error) {
      console.error('❌ [Canvas] Erreur détection coins:', error);
      message.error('Erreur lors de la détection IA des coins');
      return null;
    } finally {
      setIsDetectingCorners(false);
    }
  }, [api, imageBase64, mimeType, referenceConfig, measurementObjectConfig, allPhotos]);

  const finishDrawingZone = useCallback(async () => {
    if (!drawingZone) return;
    
    // 🆕 Protection contre les appels multiples
    if (isProcessingZone) {
      console.log('⏳ [Canvas] Zone déjà en cours de traitement, ignoré');
      return;
    }

    const { start, end } = drawingZone;
    const width = Math.abs(end[0] - start[0]);
    const height = Math.abs(end[1] - start[1]);

    console.log('🎨 [Canvas] finishDrawingZone appelé:', {
      start, end, width, height,
      workflowStep,
      hasApi: !!api,
      hasImageBase64: !!imageBase64
    });

    if (width < 10 || height < 10) {
      console.log('⚠️ [Canvas] Zone trop petite, ignorée');
      setDrawingZone(null);
      return;
    }

    // 🆕 Marquer comme en cours de traitement
    setIsProcessingZone(true);
    setDrawingZone(null); // Effacer immédiatement pour éviter les re-traitements

    // 🆕 WORKFLOW GUIDÉ: Détection IA selon l'étape
    if (workflowStep === 'selectReferenceZone' || workflowStep === 'selectMeasureZone') {
      console.log('🎯 [Canvas] Mode workflow guidé détecté, appel API...');
      // Convertir les coordonnées pixels en pourcentages (0-100)
      const zonePercent = {
        x: (Math.min(start[0], end[0]) / imageDimensions.width) * 100,
        y: (Math.min(start[1], end[1]) / imageDimensions.height) * 100,
        width: (width / imageDimensions.width) * 100,
        height: (height / imageDimensions.height) * 100
      };

      // 🆕 DYNAMIQUE: Utiliser 'reference' ou 'measurement' au lieu de types hardcodés
      const targetType = workflowStep === 'selectReferenceZone' ? 'reference' : 'measurement';
      const result = await detectCornersInZone(zonePercent, targetType);

      if (result?.success && result.corners) {
        // 🔧 Normaliser corners: peut être Array [tl, tr, br, bl] ou Object {topLeft, topRight, ...}
        let cornersObj: { topLeft: {x: number, y: number}, topRight: {x: number, y: number}, bottomRight: {x: number, y: number}, bottomLeft: {x: number, y: number} };
        
        if (Array.isArray(result.corners)) {
          // API ArUco retourne un Array [TL, TR, BR, BL]
          cornersObj = {
            topLeft: result.corners[0],
            topRight: result.corners[1],
            bottomRight: result.corners[2],
            bottomLeft: result.corners[3]
          };
          console.log('🔧 [Canvas] Corners convertis depuis Array:', cornersObj);
        } else {
          // Format objet déjà correct
          cornersObj = result.corners;
        }
        
        // Convertir les coins de pourcentage en pixels
        const cornersPixels = {
          topLeft: {
            x: (cornersObj.topLeft.x / 100) * imageDimensions.width,
            y: (cornersObj.topLeft.y / 100) * imageDimensions.height
          },
          topRight: {
            x: (cornersObj.topRight.x / 100) * imageDimensions.width,
            y: (cornersObj.topRight.y / 100) * imageDimensions.height
          },
          bottomLeft: {
            x: (cornersObj.bottomLeft.x / 100) * imageDimensions.width,
            y: (cornersObj.bottomLeft.y / 100) * imageDimensions.height
          },
          bottomRight: {
            x: (cornersObj.bottomRight.x / 100) * imageDimensions.width,
            y: (cornersObj.bottomRight.y / 100) * imageDimensions.height
          }
        };

        if (workflowStep === 'selectReferenceZone') {
          // Étape 1: Référence détectée (ArUco ou A4) → passer à l'étape 2
          const refType = isArucoMode ? `ArUco MAGENTA ${markerSizeCm}cm` : 'A4';
          console.log(`📐 [Canvas] Référence ${refType} détectée, coins:`, cornersPixels);
          console.log('📐 [Canvas] Confiance:', result.confidence, '% - Objet trouvé:', result.objectFound);
          setReferenceCorners(cornersPixels);
          setQuadrilateralMode(true);
          message.success(`✅ Référence ${refType} détectée (confiance: ${Math.round(result.confidence || 0)}%)`);
          setWorkflowStep('selectMeasureZone');
        } else {
          // Étape 2: Objet à mesurer détecté → passer à l'étape 3
          console.log('📏 [Canvas] Objet à mesurer détecté, coins:', cornersPixels);
          
          // Créer 4 points de mesure aux coins détectés - AVEC draggable: true !
          const newPoints: MeasurementPoint[] = [
            { id: 'corner_tl', x: cornersPixels.topLeft.x, y: cornersPixels.topLeft.y, label: 'A', type: 'primary', color: '#52c41a', draggable: true },
            { id: 'corner_tr', x: cornersPixels.topRight.x, y: cornersPixels.topRight.y, label: 'B', type: 'primary', color: '#52c41a', draggable: true },
            { id: 'corner_br', x: cornersPixels.bottomRight.x, y: cornersPixels.bottomRight.y, label: 'C', type: 'primary', color: '#52c41a', draggable: true },
            { id: 'corner_bl', x: cornersPixels.bottomLeft.x, y: cornersPixels.bottomLeft.y, label: 'D', type: 'primary', color: '#52c41a', draggable: true }
          ];
          
          console.log('🎯 [Canvas] Points créés pour objet:', newPoints);
          console.log('🎯 [Canvas] Confiance:', result.confidence, '% - Objet trouvé:', result.objectFound);
          
          setPoints(newPoints);
          saveToHistory(newPoints, exclusionZones);
          message.success(`✅ Objet détecté (confiance: ${Math.round(result.confidence || 0)}%). Glissez les points pour ajuster !`);
          setWorkflowStep('adjusting');
          setSelectedTool('select');
        }
      } else {
        // Échec de détection - fallback sur les coins de la zone dessinée
        message.warning('⚠️ Détection IA incertaine. Utilisez les coins de la zone dessinée.');
        
        const fallbackCorners = {
          topLeft: { x: Math.min(start[0], end[0]), y: Math.min(start[1], end[1]) },
          topRight: { x: Math.max(start[0], end[0]), y: Math.min(start[1], end[1]) },
          bottomLeft: { x: Math.min(start[0], end[0]), y: Math.max(start[1], end[1]) },
          bottomRight: { x: Math.max(start[0], end[0]), y: Math.max(start[1], end[1]) }
        };

        if (workflowStep === 'selectReferenceZone') {
          setReferenceCorners(fallbackCorners);
          setQuadrilateralMode(true);
          setWorkflowStep('selectMeasureZone');
        } else {
          const newPoints: MeasurementPoint[] = [
            { id: 'corner_tl', x: fallbackCorners.topLeft.x, y: fallbackCorners.topLeft.y, label: 'A', type: 'primary', color: '#ff4d4f', draggable: true },
            { id: 'corner_tr', x: fallbackCorners.topRight.x, y: fallbackCorners.topRight.y, label: 'B', type: 'primary', color: '#ff4d4f', draggable: true },
            { id: 'corner_br', x: fallbackCorners.bottomRight.x, y: fallbackCorners.bottomRight.y, label: 'C', type: 'primary', color: '#ff4d4f', draggable: true },
            { id: 'corner_bl', x: fallbackCorners.bottomLeft.x, y: fallbackCorners.bottomLeft.y, label: 'D', type: 'primary', color: '#ff4d4f', draggable: true }
          ];
          setPoints(newPoints);
          saveToHistory(newPoints, exclusionZones);
          setWorkflowStep('adjusting');
          setSelectedTool('select');
        }
      }

      setIsProcessingZone(false); // 🆕 Réinitialiser le flag
      return;
    }

    // Mode standard: création de zones d'exclusion
    const newZone: ExclusionZone = {
      id: `zone_${Date.now()}`,
      type: selectedTool === 'addEllipseZone' ? 'ellipse' : 'rectangle',
      points: [
        [Math.min(start[0], end[0]), Math.min(start[1], end[1])],
        [Math.max(start[0], end[0]), Math.max(start[1], end[1])]
      ],
      color: colors.exclusionZone,
      opacity: 0.3
    };

    const newZones = [...exclusionZones, newZone];
    setExclusionZones(newZones);
    saveToHistory(points, newZones);
    setIsProcessingZone(false); // 🆕 Réinitialiser le flag
    setSelectedTool('select');
  }, [drawingZone, selectedTool, exclusionZones, points, colors, saveToHistory, workflowStep, imageDimensions, detectCornersInZone, isProcessingZone]);

  const removeZone = useCallback((zoneId: string) => {
    const newZones = exclusionZones.filter(z => z.id !== zoneId);
    setExclusionZones(newZones);
    saveToHistory(points, newZones);
    setSelectedZoneId(null);
  }, [exclusionZones, points, saveToHistory]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleStageClick = useCallback((e: KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    // Adjust for zoom AND stage position
    const x = (pos.x - stagePosition.x) / zoom;
    const y = (pos.y - stagePosition.y) / zoom;

    // 🆕 MODE PLACEMENT DE POINT: PRIORITÉ ABSOLUE - toujours placer le point, peu importe où on clique
    if (pointBeingPlaced) {
      console.log(`📍 [Canvas] Placement du point ${pointBeingPlaced} à (${x.toFixed(0)}, ${y.toFixed(0)})`);
      placePointAt(x, y);
      return;
    }

    // 🔧 FIX: Ne pas traiter si le clic vient d'un élément enfant (rectangle de référence, points, etc.)
    // SAUF si on est en mode placement de point (traité ci-dessus)
    const clickedOnStage = e.target === e.target.getStage();
    const clickedOnImage = e.target.getClassName() === 'Image';
    
    // Si on a cliqué sur un élément interactif (pas le stage ni l'image de fond), ne rien faire
    if (!clickedOnStage && !clickedOnImage) {
      console.log('🎯 [Canvas] Clic sur élément interactif, ignoré par Stage handler');
      return;
    }

    // 🆕 WORKFLOW GUIDÉ: Dessiner zone pour détection IA
    if (workflowStep === 'selectReferenceZone' || workflowStep === 'selectMeasureZone') {
      if (!drawingZone && !isDetectingCorners) {
        console.log(`🎯 [Canvas] Début dessin zone pour ${workflowStep}`);
        startDrawingZone(x, y);
      }
      return;
    }

    if (selectedTool === 'addPoint') {
      addPoint(x, y);
    } else if (selectedTool === 'addRectZone' || selectedTool === 'addEllipseZone') {
      if (!drawingZone) {
        startDrawingZone(x, y);
      }
    } else if (selectedTool === 'select') {
      // Deselect uniquement si clic sur le fond (stage ou image)
      setSelectedPointId(null);
      setSelectedZoneId(null);
      setIsRefSelected(false); // 🔧 FIX: Désélectionner aussi le rectangle de référence
      
      // 🆕 Si zoomé, revenir à la vue complète
      if (zoom > 1) {
        resetZoom();
      }
    }
  }, [selectedTool, zoom, stagePosition, addPoint, drawingZone, startDrawingZone, workflowStep, isDetectingCorners, pointBeingPlaced, placePointAt, resetZoom]);

  const handleStageMouseMove = useCallback((e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!drawingZone) return;

    const stage = e.target.getStage();
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    // Ajuster pour zoom + pan (cohérent avec handleStageClick)
    const x = (pos.x - stagePosition.x) / zoom;
    const y = (pos.y - stagePosition.y) / zoom;
    updateDrawingZone(x, y);
  }, [drawingZone, zoom, stagePosition.x, stagePosition.y, updateDrawingZone]);

  // 🆕 MOBILE: Permettre de DÉMARRER le dessin au doigt (sinon on attend un tap -> souvent jamais déclenché)
  const handleStageTouchStart = useCallback((e: KonvaEventObject<TouchEvent>) => {
    // Pinch-to-zoom (2 doigts)
    const touches = e.evt?.touches;
    if (touches && touches.length === 2) {
      if (e.evt.cancelable) e.evt.preventDefault();
      setIsPanning(false);

      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      pinchLastDistanceRef.current = Math.hypot(dx, dy);
      pinchLastCenterRef.current = {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2
      };
      return;
    }

    // En mode placement de point, ne pas interférer (le placement se fait via tap)
    if (pointBeingPlaced) return;

    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!stage || !pos) return;

    const x = (pos.x - stagePosition.x) / zoom;
    const y = (pos.y - stagePosition.y) / zoom;

    const isWorkflowZone = workflowStep === 'selectReferenceZone' || workflowStep === 'selectMeasureZone';
    const isDrawTool = selectedTool === 'addRectZone' || selectedTool === 'addEllipseZone';

    // Si on est en workflow (A4/objet) ou en mode dessin de zone, démarrer au touchstart
    if ((isWorkflowZone || isDrawTool) && !drawingZone && !isDetectingCorners) {
      startDrawingZone(x, y);
      return;
    }

    // Sinon, fallback: pan (uniquement si zoomé)
    handleStagePanStart(e as any);
  }, [pointBeingPlaced, stagePosition.x, stagePosition.y, zoom, workflowStep, selectedTool, drawingZone, isDetectingCorners, startDrawingZone, handleStagePanStart]);

  const handleStageTouchMove = useCallback((e: KonvaEventObject<TouchEvent>) => {
    // Important sur mobile: éviter que le navigateur capte le geste (scroll/zoom)
    if (e.evt?.cancelable) {
      e.evt.preventDefault();
    }

    const stage = e.target.getStage();
    if (!stage) return;

    const touches = e.evt?.touches;
    if (touches && touches.length === 2) {
      const lastDistance = pinchLastDistanceRef.current;
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      const distance = Math.hypot(dx, dy);

      if (!lastDistance || lastDistance <= 0) {
        pinchLastDistanceRef.current = distance;
        return;
      }

      // Centre dans le viewport
      const centerClient = {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2
      };

      const containerRect = stage.container().getBoundingClientRect();
      const center = {
        x: centerClient.x - containerRect.left,
        y: centerClient.y - containerRect.top
      };

      const scaleFactor = distance / lastDistance;
      const nextZoom = Math.max(0.5, Math.min(3, zoom * scaleFactor));

      // Zoom autour du centre: garder le point sous le doigt stable
      const pointTo = {
        x: (center.x - stagePosition.x) / zoom,
        y: (center.y - stagePosition.y) / zoom
      };

      const newStagePos = {
        x: center.x - pointTo.x * nextZoom,
        y: center.y - pointTo.y * nextZoom
      };

      const containerWidthPx = imageDimensions.width;
      const containerHeightPx = imageDimensions.height;
      const maxX = 0;
      const minX = -(imageDimensions.width * nextZoom - containerWidthPx);
      const maxY = 0;
      const minY = -(imageDimensions.height * nextZoom - containerHeightPx);

      setZoom(nextZoom);
      if (nextZoom <= 1) {
        setStagePosition({ x: 0, y: 0 });
      } else {
        setStagePosition({
          x: Math.min(maxX, Math.max(minX, newStagePos.x)),
          y: Math.min(maxY, Math.max(minY, newStagePos.y))
        });
      }

      pinchLastDistanceRef.current = distance;
      pinchLastCenterRef.current = centerClient;
      return;
    }

    // 1 doigt: update drawing zone (si besoin) + pan
    const pos = stage.getPointerPosition();
    if (pos) {
      const x = (pos.x - stagePosition.x) / zoom;
      const y = (pos.y - stagePosition.y) / zoom;
      updateDrawingZone(x, y);
    }

    handleStagePanMove(e as any);
  }, [handleStagePanMove, imageDimensions.height, imageDimensions.width, stagePosition.x, stagePosition.y, updateDrawingZone, zoom]);

  const handleStageMouseUp = useCallback(() => {
    if (drawingZone) {
      finishDrawingZone();
    }
  }, [drawingZone, finishDrawingZone]);

  const handleStageTouchEnd = useCallback(() => {
    pinchLastDistanceRef.current = null;
    pinchLastCenterRef.current = null;
    handleStageMouseUp();
    handleStagePanEnd();
  }, [handleStageMouseUp, handleStagePanEnd]);

  // ============================================================================
  // 🎯 SNAP-TO-EDGES - L'IA ajuste les points sur les vrais contours
  // ============================================================================

  const snapPointsWithAI = useCallback(async (target: 'reference' | 'measurement') => {
    if (!api || !imageBase64) {
      message.warning('⚠️ API non disponible pour le snap IA');
      return;
    }

    setIsSnapping(true);
    setSnapTarget(target);

    try {
      // Extraire base64 pur
      let cleanBase64 = imageBase64;
      if (cleanBase64.includes(',')) {
        cleanBase64 = cleanBase64.split(',')[1];
      }

      let pointsToSnap: Array<{ x: number; y: number; label: string }> = [];
      
      if (target === 'reference' && adjustableRefBox) {
        // Convertir le rectangle de référence en 4 points
        pointsToSnap = [
          { label: 'A', x: (adjustableRefBox.x / imageDimensions.width) * 1000, y: (adjustableRefBox.y / imageDimensions.height) * 1000 },
          { label: 'B', x: ((adjustableRefBox.x + adjustableRefBox.width) / imageDimensions.width) * 1000, y: (adjustableRefBox.y / imageDimensions.height) * 1000 },
          { label: 'C', x: (adjustableRefBox.x / imageDimensions.width) * 1000, y: ((adjustableRefBox.y + adjustableRefBox.height) / imageDimensions.height) * 1000 },
          { label: 'D', x: ((adjustableRefBox.x + adjustableRefBox.width) / imageDimensions.width) * 1000, y: ((adjustableRefBox.y + adjustableRefBox.height) / imageDimensions.height) * 1000 }
        ];
      } else if (target === 'measurement' && points.length >= 2) {
        // Convertir les points de mesure (pixels display → base 1000)
        pointsToSnap = points.map((p, i) => ({
          label: p.label || String.fromCharCode(65 + i),
          x: (p.x / imageDimensions.width) * 1000,
          y: (p.y / imageDimensions.height) * 1000
        }));
      } else {
        message.warning('⚠️ Placez d\'abord les points approximativement');
        setIsSnapping(false);
        setSnapTarget(null);
        return;
      }

      console.log(`🎯 [Canvas] Snap ${target}: envoi de ${pointsToSnap.length} points à l'IA`);
      console.log('📍 Points approximatifs (base 1000):', pointsToSnap);

      // Appeler l'API snap-to-edges
      const response = await api.post('/api/measurement-reference/snap-to-edges', {
        imageBase64: cleanBase64,
        mimeType,
        points: pointsToSnap,
        targetType: target,
        objectDescription: target === 'measurement' ? 'porte ou fenêtre à mesurer' : undefined
      });

      console.log('📩 [Canvas] Réponse snap:', response);

      if (response?.success && response.points && response.points.length > 0) {
        // Appliquer les points snappés
        if (target === 'reference') {
          // Reconstituer le rectangle à partir des 4 points snappés
          const snappedPoints = response.points;
          const minX = Math.min(...snappedPoints.map((p: any) => p.x));
          const maxX = Math.max(...snappedPoints.map((p: any) => p.x));
          const minY = Math.min(...snappedPoints.map((p: any) => p.y));
          const maxY = Math.max(...snappedPoints.map((p: any) => p.y));
          
          const newBox = {
            x: (minX / 1000) * imageDimensions.width,
            y: (minY / 1000) * imageDimensions.height,
            width: ((maxX - minX) / 1000) * imageDimensions.width,
            height: ((maxY - minY) / 1000) * imageDimensions.height
          };
          
          console.log('✅ [Canvas] Rectangle référence snappé:', newBox);
          setAdjustableRefBox(newBox);
          recalculateCalibration(newBox, true); // Skip snap local car déjà snappé par l'IA
          message.success('🎯 Référence ajustée avec précision par l\'IA !');
        } else {
          // Appliquer les nouveaux points de mesure (base 1000 → pixels display)
          const snappedMeasurementPoints: MeasurementPoint[] = response.points.map((p: any, i: number) => ({
            id: points[i]?.id || `point_${i}`,
            x: (p.x / 1000) * imageDimensions.width,
            y: (p.y / 1000) * imageDimensions.height,
            type: points[i]?.type || 'primary',
            label: p.label || String.fromCharCode(65 + i),
            color: points[i]?.color || '#1890FF',
            draggable: true
          }));
          
          console.log('✅ [Canvas] Points de mesure snappés:', snappedMeasurementPoints);
          setPoints(snappedMeasurementPoints);
          saveToHistory(snappedMeasurementPoints, exclusionZones);
          message.success('🎯 Points de mesure ajustés avec précision par l\'IA !');
        }
      } else {
        message.warning('⚠️ L\'IA n\'a pas pu ajuster les points. Essayez de les replacer.');
      }
    } catch (error) {
      console.error('❌ [Canvas] Erreur snap-to-edges:', error);
      message.error('Erreur lors du snap IA');
    } finally {
      setIsSnapping(false);
      setSnapTarget(null);
    }
  }, [api, imageBase64, mimeType, adjustableRefBox, points, imageDimensions, recalculateCalibration, saveToHistory, exclusionZones]);

  // ============================================================================
  // VALIDATION
  // ============================================================================

  // 🆕 Exporter l'image avec les annotations dessinées
  const exportAnnotatedImage = useCallback(async (): Promise<string | null> => {
    if (!stageRef.current) {
      console.warn('❌ [Canvas] Stage ref non disponible pour export');
      return null;
    }
    
    try {
      // Réinitialiser le zoom et la position pour capturer l'image complète
      const originalZoom = zoom;
      const originalPosition = { ...stagePosition };
      
      // Remettre à zoom 1 et position 0,0 pour l'export
      stageRef.current.scale({ x: 1, y: 1 });
      stageRef.current.position({ x: 0, y: 0 });
      
      // Capturer l'image complète avec les annotations
      const dataURL = stageRef.current.toDataURL({
        mimeType: 'image/jpeg',
        quality: 0.9,
        pixelRatio: 1 // On garde la résolution d'origine
      });
      
      // Restaurer le zoom et la position
      stageRef.current.scale({ x: originalZoom, y: originalZoom });
      stageRef.current.position(originalPosition);
      
      console.log('📸 [Canvas] Image annotée exportée:', dataURL.substring(0, 50) + '...');
      return dataURL;
    } catch (error) {
      console.error('❌ [Canvas] Erreur export image:', error);
      return null;
    }
  }, [zoom, stagePosition]);

  const handleValidate = useCallback(async () => {
    // 🆕 Exporter l'image avec les mesures dessinées
    const annotatedImageBase64 = await exportAnnotatedImage();
    
    const annotations: ImageAnnotations = {
      nodeId: '',
      imageUrl,
      // 🆕 Inclure l'image annotée
      annotatedImageUrl: annotatedImageBase64 || undefined,
      calibration: calibration || {
        referencePoints: [[0, 0], [100, 0]],
        referenceSize: 10,
        referenceUnit: 'cm',
        pixelPerCm,
        detectedAutomatically: false
      },
      measurementPoints: points,
      exclusionZones,
      measurements,
      // 🎯 ARUCO: Inclure les corners de référence pour pouvoir les redessiner
      referenceCorners: referenceCorners || undefined,
      // 📐 Dimensions de l'image pour convertir % → pixels plus tard
      imageDimensions: imageDimensions,
      // 🎯 Taille du marqueur ArUco
      markerSizeCm: markerSizeCm
    };

    console.log('✅ [Canvas] Validation avec image annotée:', annotatedImageBase64 ? 'OUI' : 'NON');
    console.log('   📍 referenceCorners:', referenceCorners ? 'OUI' : 'NON');
    console.log('   📐 imageDimensions:', imageDimensions);
    onValidate?.(annotations);
  }, [imageUrl, calibration, pixelPerCm, points, exclusionZones, measurements, onValidate, exportAnnotatedImage, referenceCorners, imageDimensions, markerSizeCm]);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (!image) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Chargement de l'image...</div>;
  }

  // 📱 MODE MOBILE FULLSCREEN - Rendu spécifique
  if (isMobileFullscreen) {
    return (
      <div
        ref={containerRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          background: '#000',
          overflow: 'hidden',
          touchAction: 'none',
          zIndex: 10000
        }}
      >
        {/* Canvas centré */}
        <div
          ref={canvasViewportRef}
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div
            ref={canvasContainerRef}
            style={{
              overflow: 'hidden',
              position: 'relative',
              width: imageDimensions.width,
              height: imageDimensions.height,
              touchAction: 'none',
              WebkitUserSelect: 'none',
              userSelect: 'none'
            }}
          >
            <Stage
              ref={stageRef}
              width={imageDimensions.width}
              height={imageDimensions.height}
              scaleX={zoom}
              scaleY={zoom}
              x={stagePosition.x}
              y={stagePosition.y}
              onTap={handleStageClick}
              onTouchStart={handleStageTouchStart}
              onTouchMove={handleStageTouchMove}
              onTouchEnd={handleStageTouchEnd}
            >
              <Layer>
                {/* Image de fond */}
                <KonvaImage image={image} width={imageDimensions.width} height={imageDimensions.height} />
                
                {/* Aperçu de la zone en cours de dessin */}
                {drawingZone && (
                  (() => {
                    const zoneColor = workflowStep === 'selectReferenceZone'
                      ? '#1890ff'
                      : workflowStep === 'selectMeasureZone'
                      ? '#faad14'
                      : colors.exclusionZone;

                    const isWorkflowZone = workflowStep === 'selectReferenceZone' || workflowStep === 'selectMeasureZone';

                    if (selectedTool === 'addEllipseZone') {
                      return (
                        <Ellipse
                          x={(drawingZone.start[0] + drawingZone.end[0]) / 2}
                          y={(drawingZone.start[1] + drawingZone.end[1]) / 2}
                          radiusX={Math.abs(drawingZone.end[0] - drawingZone.start[0]) / 2}
                          radiusY={Math.abs(drawingZone.end[1] - drawingZone.start[1]) / 2}
                          fill={zoneColor}
                          opacity={0.2}
                          stroke={zoneColor}
                          strokeWidth={isWorkflowZone ? 3 : 2}
                          dash={[5, 5]}
                        />
                      );
                    }

                    return (
                      <Rect
                        x={Math.min(drawingZone.start[0], drawingZone.end[0])}
                        y={Math.min(drawingZone.start[1], drawingZone.end[1])}
                        width={Math.abs(drawingZone.end[0] - drawingZone.start[0])}
                        height={Math.abs(drawingZone.end[1] - drawingZone.start[1])}
                        fill={zoneColor}
                        opacity={0.2}
                        stroke={zoneColor}
                        strokeWidth={isWorkflowZone ? 3 : 2}
                        dash={[8, 4]}
                      />
                    );
                  })()
                )}
                
                {/* Référence (ArUco ou A4) - Quadrilatère avec 4 coins draggables */}
                {referenceCorners && (
                  <>
                    <Line
                      points={[
                        referenceCorners.topLeft.x, referenceCorners.topLeft.y,
                        referenceCorners.topRight.x, referenceCorners.topRight.y,
                        referenceCorners.bottomRight.x, referenceCorners.bottomRight.y,
                        referenceCorners.bottomLeft.x, referenceCorners.bottomLeft.y
                      ]}
                      closed
                      stroke="#52c41a"
                      strokeWidth={2}
                      dash={[8, 4]}
                      fill="rgba(82, 196, 26, 0.15)"
                      listening={false}
                    />
                    {/* 4 coins draggables A4 */}
                    {[
                      { key: 'topLeft', pos: referenceCorners.topLeft, label: 'A' },
                      { key: 'topRight', pos: referenceCorners.topRight, label: 'B' },
                      { key: 'bottomRight', pos: referenceCorners.bottomRight, label: 'C' },
                      { key: 'bottomLeft', pos: referenceCorners.bottomLeft, label: 'D' }
                    ].map(({ key, pos, label }) => (
                      <Group key={key}>
                        <Circle
                          x={pos.x}
                          y={pos.y}
                          radius={25}
                          fill="rgba(82, 196, 26, 0.3)"
                          draggable={!readOnly}
                          onDragMove={(e) => {
                            e.cancelBubble = true;
                            const newX = e.target.x();
                            const newY = e.target.y();
                            
                            // 🎯 Snap automatique aux contours détectés
                            const snapped = snapPointToEdge(newX, newY, 20);
                            if (snapped.snapped) {
                              e.target.x(snapped.x);
                              e.target.y(snapped.y);
                            }
                            
                            setReferenceCorners(prev => prev ? { 
                              ...prev, 
                              [key]: { 
                                x: snapped.snapped ? snapped.x : newX, 
                                y: snapped.snapped ? snapped.y : newY 
                              } 
                            } : prev);
                          }}
                          onDragEnd={(e) => {
                            const newX = e.target.x();
                            const newY = e.target.y();
                            setReferenceCorners(prev => {
                              if (!prev) return prev;
                              const next = { ...prev, [key]: { x: newX, y: newY } };
                              recalculateHomographyFromCorners(next);
                              return next;
                            });
                          }}
                        />
                        <Circle x={pos.x} y={pos.y} radius={8} fill="#52c41a" stroke="#fff" strokeWidth={2} listening={false} />
                        <KonvaText x={pos.x + 12} y={pos.y - 8} text={label} fontSize={14} fill="#52c41a" fontStyle="bold" listening={false} />
                      </Group>
                    ))}
                  </>
                )}
                
                {/* Points de mesure - DRAGGABLES avec SNAP automatique */}
                {points.map((point, index) => (
                  <Group key={point.id}>
                    {/* Hitbox draggable avec snap aux contours */}
                    <Circle
                      x={point.x}
                      y={point.y}
                      radius={30}
                      fill={selectedPointId === point.id ? "rgba(24, 144, 255, 0.5)" : "rgba(24, 144, 255, 0.2)"}
                      stroke={selectedPointId === point.id ? "#1890ff" : "transparent"}
                      strokeWidth={2}
                      draggable={!readOnly}
                      onDragMove={(e) => {
                        e.cancelBubble = true;
                        const newX = e.target.x();
                        const newY = e.target.y();
                        
                        // 🎯 Snap automatique aux contours détectés
                        const snapped = snapPointToEdge(newX, newY, 20);
                        if (snapped.snapped) {
                          e.target.x(snapped.x);
                          e.target.y(snapped.y);
                        }
                        
                        setPoints(prev => prev.map(p => 
                          p.id === point.id 
                            ? { ...p, x: snapped.snapped ? snapped.x : newX, y: snapped.snapped ? snapped.y : newY } 
                            : p
                        ));
                      }}
                      onDragEnd={() => saveToHistory(points, exclusionZones)}
                      onClick={(e) => {
                        e.cancelBubble = true;
                        // Sélectionner ce point (désélectionne automatiquement les autres)
                        setSelectedPointId(point.id);
                      }}
                      onTap={(e) => {
                        e.cancelBubble = true;
                        // Sélectionner ce point (désélectionne automatiquement les autres)
                        setSelectedPointId(point.id);
                      }}
                    />
                    {/* Point visuel */}
                    <Rect
                      x={point.x - 6}
                      y={point.y - 6}
                      width={12}
                      height={12}
                      fill={selectedPointId === point.id ? "#faad14" : point.color}
                      stroke="#fff"
                      strokeWidth={2}
                      rotation={45}
                      listening={false}
                    />
                    <KonvaText x={point.x + 12} y={point.y - 8} text={point.label || String(index + 1)} fontSize={14} fill={selectedPointId === point.id ? "#faad14" : point.color} fontStyle="bold" stroke="#fff" strokeWidth={0.5} listening={false} />
                  </Group>
                ))}
                
                {/* Lignes entre les points */}
                {points.length >= 2 && (
                  <Line
                    points={points.flatMap(p => [p.x, p.y])}
                    stroke={colors.measurementLine}
                    strokeWidth={2}
                    closed={points.length >= 3}
                    listening={false}
                  />
                )}
              </Layer>
            </Stage>
          </div>
        </div>
        
        {/* 📱 UI FLOTTANTE MOBILE */}
        {!readOnly && (
          <>
            {/* Indicateur d'étape en haut */}
            <div
              style={{
                position: 'absolute',
                top: 60,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 10002,
                background: 'rgba(0,0,0,0.8)',
                color: '#fff',
                padding: '10px 20px',
                borderRadius: 25,
                fontSize: 15,
                fontWeight: 'bold',
                pointerEvents: 'none'
              }}
            >
              {workflowStep === 'selectReferenceZone' ? (
                '📄 Étape 1/2: Dessinez autour de l\'A4'
              ) : workflowStep === 'selectMeasureZone' ? (
                '📏 Étape 2/2: Dessinez autour de l\'objet'
              ) : (
                '✅ Glissez les coins pour ajuster'
              )}
            </div>
            
            {/* Bouton Menu hamburger */}
            <div
              onClick={() => {
                console.log('📱 Menu cliqué! mobileMenuOpen:', mobileMenuOpen);
                setMobileMenuOpen(true);
              }}
              style={{
                position: 'absolute',
                bottom: 30,
                left: 30,
                zIndex: 10002,
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: '#1890ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(24,144,255,0.6)',
                cursor: 'pointer'
              }}
            >
              <MenuOutlined style={{ fontSize: 28, color: '#fff' }} />
            </div>
            
            {/* Bouton Valider */}
            {onValidate && points.length >= minPoints && (
              <div
                onClick={handleValidate}
                style={{
                  position: 'absolute',
                  bottom: 30,
                  right: 30,
                  zIndex: 10002,
                  height: 56,
                  paddingLeft: 24,
                  paddingRight: 24,
                  borderRadius: 28,
                  background: '#52c41a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 4px 20px rgba(82,196,26,0.6)',
                  cursor: 'pointer',
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 'bold'
                }}
              >
                <CheckOutlined /> Valider
              </div>
            )}
          </>
        )}
        
        {/* DRAWER MOBILE - Menu avec tous les outils */}
        <Drawer
          placement="bottom"
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          height="auto"
          zIndex={11000}
          styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
          title="🛠️ Outils"
        >
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {/* Outils de sélection */}
            <Card size="small" title="Outils">
              <Space wrap>
                <Button type={selectedTool === 'select' ? 'primary' : 'default'} icon={<DragOutlined />} onClick={() => { setSelectedTool('select'); setMobileMenuOpen(false); }} size="large">Sélectionner</Button>
                <Button type={selectedTool === 'addPoint' ? 'primary' : 'default'} icon={<PlusOutlined />} onClick={() => { setSelectedTool('addPoint'); setMobileMenuOpen(false); }} size="large">Ajouter point</Button>
                <Button icon={<DeleteOutlined />} danger disabled={!selectedPointId && !selectedZoneId} onClick={() => { if (selectedPointId) removePoint(selectedPointId); if (selectedZoneId) removeZone(selectedZoneId); setMobileMenuOpen(false); }} size="large">Supprimer</Button>
              </Space>
            </Card>
            
            {/* Historique */}
            <Card size="small" title="Historique">
              <Space>
                <Button icon={<UndoOutlined />} onClick={undo} disabled={historyIndex <= 0} size="large">Annuler</Button>
                <Button icon={<RedoOutlined />} onClick={redo} disabled={historyIndex >= history.length - 1} size="large">Rétablir</Button>
              </Space>
            </Card>
            
            {/* Zoom */}
            <Card size="small" title="Zoom">
              <Space>
                <Button icon={<ZoomOutOutlined />} onClick={() => setZoom(Math.max(0.5, zoom - 0.25))} size="large">-</Button>
                <Tag color="blue" style={{ fontSize: 16, padding: '4px 12px' }}>{Math.round(zoom * 100)}%</Tag>
                <Button icon={<ZoomInOutlined />} onClick={() => setZoom(Math.min(3, zoom + 0.25))} size="large">+</Button>
                {zoom > 1 && <Button danger onClick={resetZoom} size="large">Reset</Button>}
              </Space>
            </Card>
            
            {/* Unité */}
            <Card size="small" title="Unité de mesure">
              <Select value={unit} onChange={(v) => { setUnit(v); setMobileMenuOpen(false); }} style={{ width: '100%' }} size="large">
                <Option value="cm">Centimètres (cm)</Option>
                <Option value="m">Mètres (m)</Option>
                <Option value="mm">Millimètres (mm)</Option>
                <Option value="inch">Pouces (inch)</Option>
              </Select>
            </Card>
            
            {/* Options avancées */}
            <Card size="small" title="Options avancées">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Homographie (correction perspective)</span>
                  <Switch checked={useHomography} onChange={setUseHomography} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Mode quadrilatère</span>
                  <Switch checked={quadrilateralMode} onChange={(checked) => {
                    if (checked && adjustableRefBox) {
                      setReferenceCorners({
                        topLeft: { x: adjustableRefBox.x, y: adjustableRefBox.y },
                        topRight: { x: adjustableRefBox.x + adjustableRefBox.width, y: adjustableRefBox.y },
                        bottomRight: { x: adjustableRefBox.x + adjustableRefBox.width, y: adjustableRefBox.y + adjustableRefBox.height },
                        bottomLeft: { x: adjustableRefBox.x, y: adjustableRefBox.y + adjustableRefBox.height }
                      });
                    }
                    setQuadrilateralMode(checked);
                  }} />
                </div>
              </Space>
            </Card>
            
            {/* Actions workflow */}
            <Card size="small" title="Actions">
              <Space wrap>
                {workflowStep !== 'selectReferenceZone' && (
                  <Button danger onClick={() => { setReferenceCorners(null); setPoints([]); setWorkflowStep('selectReferenceZone'); setMobileMenuOpen(false); }} size="large">
                    🔄 Tout recommencer
                  </Button>
                )}
                {workflowStep === 'adjusting' && (
                  <Button onClick={() => { setPoints([]); setWorkflowStep('selectMeasureZone'); setMobileMenuOpen(false); }} size="large">
                    Refaire mesure
                  </Button>
                )}
                {onValidate && points.length >= minPoints && (
                  <Button type="primary" icon={<CheckOutlined />} onClick={() => { handleValidate(); setMobileMenuOpen(false); }} size="large">
                    ✅ Valider les mesures
                  </Button>
                )}
              </Space>
            </Card>
          </Space>
        </Drawer>
      </div>
    );
  }

  // 🖥️ MODE DESKTOP - Rendu normal
  return (
    <div
      ref={containerRef}
      style={{ width: '100%' }}
    >
      {/* 🆕 WORKFLOW GUIDÉ - Bannière d'instructions */}
      {!readOnly && !isMobileFullscreen && (
        <Alert
          type={
            pointBeingPlaced ? 'error' :
            isDetectingCorners ? 'warning' :
            workflowStep === 'selectReferenceZone' ? 'info' : 
            workflowStep === 'selectMeasureZone' ? 'warning' : 
            'success'
          }
          showIcon
          style={{ marginBottom: 8, fontSize: '16px' }}
          message={
            pointBeingPlaced ? (
              <span style={{ fontSize: '16px' }}>
                🎯 <strong>PLACEMENT DU COIN {points.find(p => p.id === pointBeingPlaced)?.label}</strong> 
                <br/>
                <span style={{ fontSize: '14px' }}>
                  👆 <strong>Tapez sur l'image</strong> pour placer le coin exactement où vous voulez.
                  <Button 
                    size="small" 
                    type="primary"
                    danger
                    onClick={cancelPointPlacement}
                    style={{ marginLeft: 12 }}
                  >
                    ✕ Annuler
                  </Button>
                </span>
              </span>
            ) : isDetectingCorners ? (
              <span>⏳ <strong>Détection IA en cours...</strong> Analyse des contours pour trouver les 4 coins précis.</span>
            ) : workflowStep === 'selectReferenceZone' ? (
              <span>
                <strong>📄 Étape 1/2:</strong> Dessinez un rectangle autour de la <strong>feuille A4</strong>
              </span>
            ) : workflowStep === 'selectMeasureZone' ? (
              <span>
                <strong>📏 Étape 2/2:</strong> Dessinez un rectangle autour de l'<strong>objet à mesurer</strong>
                {referenceCorners && (
                  <Button 
                    size="small" 
                    type="link" 
                    danger 
                    onClick={() => {
                      setReferenceCorners(null);
                      setQuadrilateralMode(false);
                      setWorkflowStep('selectReferenceZone');
                      message.info(isArucoMode ? 'Référence ArUco effacée.' : 'Référence A4 effacée. Redessinez autour de la feuille A4.');
                    }}
                    style={{ marginLeft: 8 }}
                  >
                    ✕ Effacer la référence
                  </Button>
                )}
              </span>
            ) : (
              <span>
                ✅ <strong>Ajustez les coins !</strong> 
                <span style={{ marginLeft: 8 }}>👆 Tapez sur un coin ◇ pour le déplacer</span>
                <Button 
                  size="small" 
                  type="link" 
                  danger 
                  onClick={() => {
                    setPoints([]);
                    setWorkflowStep('selectMeasureZone');
                    message.info('Mesure effacée. Redessinez autour de l\'objet à mesurer.');
                  }}
                  style={{ marginLeft: 8 }}
                >
                  ✕ Refaire
                </Button>
                <Button 
                  size="small" 
                  type="link" 
                  onClick={() => {
                    setReferenceCorners(null);
                    setQuadrilateralMode(false);
                    setPoints([]);
                    setHomographyResult(null);
                    setWorkflowStep('selectReferenceZone');
                    message.info(isArucoMode ? 'Tout effacé.' : 'Tout effacé. Recommencez depuis la référence A4.');
                  }}
                  style={{ marginLeft: 4 }}
                >
                  🔄 Tout recommencer
                </Button>
              </span>
            )
          }
          description={
            isDetectingCorners ? null : 
            workflowStep === 'adjusting' ? null : (
              <span style={{ fontSize: 12, opacity: 0.8 }}>
                👆 Cliquez et glissez pour encadrer l'objet. L'IA détectera les 4 coins avec précision.
              </span>
            )
          }
        />
      )}

      {/* Toolbar */}
      {!readOnly && !isMobileFullscreen && (
        <Card size="small" style={{ marginBottom: 8 }}>
          <Space wrap>
            {/* Tools */}
            <Tooltip title="Sélectionner / Déplacer">
              <Button
                type={selectedTool === 'select' ? 'primary' : 'default'}
                icon={<DragOutlined />}
                onClick={() => setSelectedTool('select')}
              />
            </Tooltip>

            <Tooltip title="Ajouter un point">
              <Button
                type={selectedTool === 'addPoint' ? 'primary' : 'default'}
                icon={<PlusOutlined />}
                onClick={() => setSelectedTool('addPoint')}
                style={{ color: selectedTool === 'addPoint' ? undefined : colors.customPoint }}
              />
            </Tooltip>

            <Tooltip title="Zone exclusion (rectangle)">
              <Button
                type={selectedTool === 'addRectZone' ? 'primary' : 'default'}
                icon={<BorderOutlined />}
                onClick={() => setSelectedTool('addRectZone')}
                danger={selectedTool === 'addRectZone'}
              />
            </Tooltip>

            <Tooltip title="Supprimer point/zone sélectionné">
              <Button
                icon={<DeleteOutlined />}
                disabled={!selectedPointId && !selectedZoneId}
                onClick={() => {
                  if (selectedPointId) removePoint(selectedPointId);
                  if (selectedZoneId) removeZone(selectedZoneId);
                }}
                danger
              />
            </Tooltip>

            <Divider type="vertical" />

            {/* Undo/Redo */}
            <Tooltip title="Annuler">
              <Button
                icon={<UndoOutlined />}
                onClick={undo}
                disabled={historyIndex <= 0}
              />
            </Tooltip>

            <Tooltip title="Rétablir">
              <Button
                icon={<RedoOutlined />}
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
              />
            </Tooltip>

            <Divider type="vertical" />

            {/* Zoom avec boutons + reset */}
            <Tooltip title="Zoom -">
              <Button
                icon={<ZoomOutOutlined />}
                onClick={() => {
                  const newZoom = Math.max(0.5, zoom - 0.25);
                  setZoom(newZoom);
                  if (newZoom <= 1) setStagePosition({ x: 0, y: 0 });
                }}
              />
            </Tooltip>
            <Tag color={zoom > 1 ? 'blue' : undefined}>{Math.round(zoom * 100)}%</Tag>
            <Tooltip title="Zoom +">
              <Button
                icon={<ZoomInOutlined />}
                onClick={() => setZoom(Math.min(3, zoom + 0.25))}
              />
            </Tooltip>
            {/* 🆕 Reset zoom + position */}
            {zoom > 1 && (
              <Tooltip title="Réinitialiser zoom et position">
                <Button
                  type="primary"
                  size="small"
                  danger
                  onClick={resetZoom}
                  style={{ marginLeft: 4 }}
                >
                  Reset
                </Button>
              </Tooltip>
            )}

            <Divider type="vertical" />

            {/* Unit selector */}
            <Text>Unité :</Text>
            <Select value={unit} onChange={setUnit} style={{ width: 80 }}>
              <Option value="cm">cm</Option>
              <Option value="m">m</Option>
              <Option value="mm">mm</Option>
              <Option value="inch">pouces</Option>
            </Select>

            <Divider type="vertical" />

            {/* Homography toggle */}
            <Tooltip title="Utiliser l'homographie mathématique pour corriger la perspective">
              <Space>
                <Text>Homographie :</Text>
                <Switch 
                  checked={useHomography} 
                  onChange={setUseHomography}
                  size="small"
                />
              </Space>
            </Tooltip>

            {/* Debug mode */}
            <Tooltip title="Afficher la grille de debug pour visualiser la correction de perspective">
              <Button
                type={debugMode ? 'primary' : 'default'}
                icon={<BugOutlined />}
                onClick={() => setDebugMode(!debugMode)}
                size="small"
              />
            </Tooltip>
            
            {/* 🆕 Mode quadrilatère - 4 coins ajustables */}
            <Tooltip title="Mode quadrilatère : ajuster les 4 coins de l'A4 individuellement pour capturer la perspective">
              <Button
                type={quadrilateralMode ? 'primary' : 'default'}
                danger={quadrilateralMode}
                onClick={() => {
                  if (!quadrilateralMode && adjustableRefBox) {
                    // Activer le mode : convertir le rectangle en 4 coins
                    setReferenceCorners({
                      topLeft: { x: adjustableRefBox.x, y: adjustableRefBox.y },
                      topRight: { x: adjustableRefBox.x + adjustableRefBox.width, y: adjustableRefBox.y },
                      bottomRight: { x: adjustableRefBox.x + adjustableRefBox.width, y: adjustableRefBox.y + adjustableRefBox.height },
                      bottomLeft: { x: adjustableRefBox.x, y: adjustableRefBox.y + adjustableRefBox.height }
                    });
                    setQuadrilateralMode(true);
                    message.info('Mode quadrilatère activé ! Ajustez les 4 coins rouges sur les vrais bords de l\'A4');
                  } else {
                    // Désactiver le mode
                    setQuadrilateralMode(false);
                    message.info('Mode rectangle standard restauré');
                  }
                }}
                size="small"
              >
                {quadrilateralMode ? '⬛ Rectangle' : '◇ Quadrilatère'}
              </Button>
            </Tooltip>
          </Space>

          {/* Homography status */}
          {useHomography && homographyResult && (
            <div style={{ marginTop: 8 }}>
              <Alert
                type={homographyResult.quality > 70 ? 'success' : homographyResult.quality > 50 ? 'warning' : 'error'}
                message={
                  <Space>
                    <Text strong>Qualité homographie :</Text>
                    <Text>{homographyResult.quality.toFixed(0)}%</Text>
                    <Text type="secondary">
                      (Incertitude: ±{(homographyResult.uncertainty * 100).toFixed(1)}%)
                    </Text>
                  </Space>
                }
                showIcon
                style={{ padding: '4px 12px' }}
              />
            </div>
          )}
          
          {/* � PANEL ARUCO COMPLET - Affiche toutes les infos si arucoAnalysis disponible */}
          {arucoAnalysis && (
            <div style={{ marginTop: 8 }}>
              <div style={{ 
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                borderRadius: 12,
                padding: '16px',
                color: 'white',
                border: '1px solid #333'
              }}>
                {/* HEADER */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  marginBottom: 12,
                  paddingBottom: 8,
                  borderBottom: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <div style={{ fontSize: 14, fontWeight: 'bold' }}>
                    🎯 ArUco MAGENTA - ID {arucoAnalysis.markerId}
                  </div>
                  <Tag 
                    color={
                      arucoAnalysis.quality.rating === 'excellent' ? 'green' :
                      arucoAnalysis.quality.rating === 'good' ? 'blue' :
                      arucoAnalysis.quality.rating === 'acceptable' ? 'orange' : 'red'
                    }
                  >
                    {arucoAnalysis.quality.overall}% - {arucoAnalysis.quality.rating.toUpperCase()}
                  </Tag>
                </div>
                
                {/* ROW 1: POSE (Rotations) */}
                <div style={{ 
                  display: 'flex', 
                  gap: 12, 
                  justifyContent: 'space-around',
                  marginBottom: 12 
                }}>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ 
                      fontSize: 22, 
                      fontWeight: 'bold',
                      color: Math.abs(arucoAnalysis.pose.rotX) < 15 ? '#52c41a' : 
                             Math.abs(arucoAnalysis.pose.rotX) < 30 ? '#faad14' : '#ff4d4f'
                    }}>
                      {arucoAnalysis.pose.rotX}°
                    </div>
                    <div style={{ fontSize: 10, opacity: 0.7 }}>Rot X (↕️)</div>
                  </div>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ 
                      fontSize: 22, 
                      fontWeight: 'bold',
                      color: Math.abs(arucoAnalysis.pose.rotY) < 15 ? '#52c41a' : 
                             Math.abs(arucoAnalysis.pose.rotY) < 30 ? '#faad14' : '#ff4d4f'
                    }}>
                      {arucoAnalysis.pose.rotY}°
                    </div>
                    <div style={{ fontSize: 10, opacity: 0.7 }}>Rot Y (↔️)</div>
                  </div>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ 
                      fontSize: 22, 
                      fontWeight: 'bold',
                      color: Math.abs(arucoAnalysis.pose.rotZ) < 10 ? '#52c41a' : 
                             Math.abs(arucoAnalysis.pose.rotZ) < 20 ? '#faad14' : '#ff4d4f'
                    }}>
                      {arucoAnalysis.pose.rotZ}°
                    </div>
                    <div style={{ fontSize: 10, opacity: 0.7 }}>Rot Z (🔄)</div>
                  </div>
                </div>
                
                {/* ROW 2: PROFONDEUR + TAILLE */}
                <div style={{ 
                  display: 'flex', 
                  gap: 12, 
                  marginBottom: 12,
                  background: 'rgba(0,212,255,0.1)',
                  borderRadius: 8,
                  padding: '10px'
                }}>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 10, opacity: 0.7 }}>📏 Distance</div>
                    <div style={{ 
                      fontSize: 18, 
                      fontWeight: 'bold',
                      color: arucoAnalysis.depth.estimatedCm < 50 ? '#52c41a' : 
                             arucoAnalysis.depth.estimatedCm < 100 ? '#faad14' : '#ff7875'
                    }}>
                      ~{arucoAnalysis.depth.estimatedCm} cm
                    </div>
                    <div style={{ fontSize: 10, opacity: 0.5 }}>
                      ({arucoAnalysis.depth.estimatedM} m)
                    </div>
                  </div>
                  <div style={{ width: 1, background: 'rgba(255,255,255,0.2)' }} />
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: 10, opacity: 0.7 }}>📐 Marqueur</div>
                    <div style={{ fontSize: 18, fontWeight: 'bold', color: '#00d4ff' }}>
                      {arucoAnalysis.markerSizeCm} cm
                    </div>
                    <div style={{ fontSize: 10, opacity: 0.5 }}>
                      ({Math.round(arucoAnalysis.markerSizePx)} px)
                    </div>
                  </div>
                </div>
                
                {/* ROW 3: ANALYSE BANDES INTERNES */}
                {arucoAnalysis.bandAnalysis.enabled && (
                  <div style={{ 
                    background: arucoAnalysis.bandAnalysis.isValid 
                      ? 'rgba(82, 196, 26, 0.15)' 
                      : 'rgba(255, 77, 79, 0.15)',
                    borderRadius: 8,
                    padding: '10px',
                    marginBottom: 8
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      marginBottom: 8
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 'bold' }}>
                        🔬 Validation Bandes Internes
                      </span>
                      <Tag color={arucoAnalysis.bandAnalysis.isValid ? 'success' : 'error'}>
                        {arucoAnalysis.bandAnalysis.validPoints}/{arucoAnalysis.bandAnalysis.totalPoints} pts
                      </Tag>
                    </div>
                    
                    {/* Barres de progression pour chaque bord */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 10 }}>
                      {['top', 'right', 'bottom', 'left'].map(edge => {
                        const edgeRatios = arucoAnalysis.bandAnalysis.transitionRatios.filter(t => t.edge === edge);
                        const avgError = edgeRatios.length > 0 
                          ? edgeRatios.reduce((s, t) => s + t.error, 0) / edgeRatios.length 
                          : 0;
                        return (
                          <div key={edge} style={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            gap: 4
                          }}>
                            <span style={{ width: 50, opacity: 0.7 }}>
                              {edge === 'top' ? '⬆️' : edge === 'right' ? '➡️' : edge === 'bottom' ? '⬇️' : '⬅️'} {edge}
                            </span>
                            <div style={{ 
                              flex: 1, 
                              height: 6, 
                              background: 'rgba(255,255,255,0.2)',
                              borderRadius: 3,
                              overflow: 'hidden'
                            }}>
                              <div style={{ 
                                width: `${Math.max(0, 100 - avgError * 5)}%`,
                                height: '100%',
                                background: avgError < 2 ? '#52c41a' : avgError < 5 ? '#faad14' : '#ff4d4f',
                                borderRadius: 3
                              }} />
                            </div>
                            <span style={{ 
                              color: avgError < 2 ? '#52c41a' : avgError < 5 ? '#faad14' : '#ff4d4f',
                              fontWeight: 'bold',
                              width: 35
                            }}>
                              {avgError.toFixed(1)}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Message de validation */}
                    <div style={{ 
                      marginTop: 8, 
                      fontSize: 11,
                      textAlign: 'center',
                      padding: '4px 8px',
                      background: 'rgba(0,0,0,0.2)',
                      borderRadius: 4
                    }}>
                      {arucoAnalysis.bandAnalysis.validationMessage}
                    </div>
                    
                    {/* 🆕 Facteurs de correction X et Y séparés */}
                    {optimalCorrection && (
                      <div style={{ 
                        marginTop: 8, 
                        padding: '8px 12px',
                        background: 'linear-gradient(135deg, rgba(82,196,26,0.2) 0%, rgba(24,144,255,0.2) 100%)',
                        borderRadius: 6,
                        border: '1px solid rgba(255,255,255,0.2)'
                      }}>
                        <div style={{ 
                          fontSize: 11, 
                          fontWeight: 'bold',
                          marginBottom: 6,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span>🔧 Corrections Calculées</span>
                          <span style={{ 
                            fontSize: 9, 
                            opacity: 0.8,
                            background: 'rgba(0,0,0,0.3)',
                            padding: '2px 6px',
                            borderRadius: 4
                          }}>
                            Confiance: {(optimalCorrection.globalConfidence * 100).toFixed(0)}%
                          </span>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          {/* Correction X (Largeur) */}
                          <div style={{ 
                            textAlign: 'center',
                            padding: '6px 8px',
                            background: 'rgba(24,144,255,0.3)',
                            borderRadius: 4
                          }}>
                            <div style={{ fontSize: 9, opacity: 0.8, marginBottom: 2 }}>
                              ↔️ Largeur (X)
                            </div>
                            <div style={{ 
                              fontSize: 16, 
                              fontWeight: 'bold',
                              color: optimalCorrection.correctionX < 0.98 ? '#ff7875' : 
                                     optimalCorrection.correctionX > 1.02 ? '#95de64' : '#ffffff'
                            }}>
                              ×{optimalCorrection.correctionX?.toFixed(4) || '1.0000'}
                            </div>
                            {optimalCorrection.correctionXSansBandes !== undefined && (
                              <div style={{ fontSize: 8, opacity: 0.6, marginTop: 2 }}>
                                Sans bandes: ×{optimalCorrection.correctionXSansBandes.toFixed(4)}
                              </div>
                            )}
                          </div>
                          
                          {/* Correction Y (Hauteur) */}
                          <div style={{ 
                            textAlign: 'center',
                            padding: '6px 8px',
                            background: 'rgba(82,196,26,0.3)',
                            borderRadius: 4
                          }}>
                            <div style={{ fontSize: 9, opacity: 0.8, marginBottom: 2 }}>
                              ↕️ Hauteur (Y)
                            </div>
                            <div style={{ 
                              fontSize: 16, 
                              fontWeight: 'bold',
                              color: optimalCorrection.correctionY < 0.98 ? '#ff7875' : 
                                     optimalCorrection.correctionY > 1.02 ? '#95de64' : '#ffffff'
                            }}>
                              ×{optimalCorrection.correctionY?.toFixed(4) || '1.0000'}
                            </div>
                            {optimalCorrection.correctionYSansBandes !== undefined && (
                              <div style={{ fontSize: 8, opacity: 0.6, marginTop: 2 }}>
                                Sans bandes: ×{optimalCorrection.correctionYSansBandes.toFixed(4)}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Info sur rotZ si significatif */}
                        {arucoAnalysis.pose && Math.abs(arucoAnalysis.pose.rotZ) > 2 && (
                          <div style={{ 
                            marginTop: 6, 
                            fontSize: 9, 
                            opacity: 0.7,
                            textAlign: 'center',
                            padding: '4px',
                            background: 'rgba(250,173,20,0.2)',
                            borderRadius: 4
                          }}>
                            ⚠️ rotZ={arucoAnalysis.pose.rotZ}° → mélange X/Y corrigé (×{Math.cos(Math.abs(arucoAnalysis.pose.rotZ) * Math.PI / 180).toFixed(4)})
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Ancien affichage simplifié (fallback si pas optimalCorrection) */}
                    {!optimalCorrection && !arucoAnalysis.bandAnalysis.isValid && arucoAnalysis.bandAnalysis.suggestedCorrection !== 1 && (
                      <div style={{ 
                        marginTop: 6, 
                        fontSize: 10, 
                        opacity: 0.8,
                        textAlign: 'center'
                      }}>
                        💡 Correction suggérée: ×{arucoAnalysis.bandAnalysis.suggestedCorrection.toFixed(4)} 
                        (confiance: {(arucoAnalysis.bandAnalysis.correctionConfidence * 100).toFixed(0)}%)
                      </div>
                    )}
                  </div>
                )}
                
                {/* ROW 4: Qualité détaillée */}
                <div style={{ 
                  display: 'flex', 
                  gap: 8, 
                  fontSize: 10,
                  opacity: 0.7,
                  justifyContent: 'center'
                }}>
                  <span>🎯 Détection: {arucoAnalysis.quality.detectionQuality}%</span>
                  <span>|</span>
                  <span>📐 Homographie: {arucoAnalysis.quality.homographyQuality}%</span>
                  <span>|</span>
                  <span>📷 Pose: {arucoAnalysis.quality.poseQuality}%</span>
                </div>
              </div>
            </div>
          )}
          
          {/* 📐 POSE (Orientation) - Fallback si pas d'arucoAnalysis mais pose calculée */}
          {!arucoAnalysis && pose && (
            <div style={{ marginTop: 8 }}>
              <div style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: 8,
                padding: '12px 16px',
                color: 'white'
              }}>
                <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>
                  📐 Pose (Orientation de la caméra)
                </div>
                <div style={{ display: 'flex', gap: 16, justifyContent: 'space-around' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ 
                      fontSize: 24, 
                      fontWeight: 'bold',
                      color: Math.abs(pose.rotX) < 15 ? '#52c41a' : Math.abs(pose.rotX) < 30 ? '#faad14' : '#ff4d4f'
                    }}>
                      {pose.rotX}°
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.8 }}>Rotation X</div>
                    <div style={{ fontSize: 10, opacity: 0.6 }}>haut/bas</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ 
                      fontSize: 24, 
                      fontWeight: 'bold',
                      color: Math.abs(pose.rotY) < 15 ? '#52c41a' : Math.abs(pose.rotY) < 30 ? '#faad14' : '#ff4d4f'
                    }}>
                      {pose.rotY}°
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.8 }}>Rotation Y</div>
                    <div style={{ fontSize: 10, opacity: 0.6 }}>gauche/droite</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ 
                      fontSize: 24, 
                      fontWeight: 'bold',
                      color: Math.abs(pose.rotZ) < 10 ? '#52c41a' : Math.abs(pose.rotZ) < 20 ? '#faad14' : '#ff4d4f'
                    }}>
                      {pose.rotZ}°
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.8 }}>Rotation Z</div>
                    <div style={{ fontSize: 10, opacity: 0.6 }}>inclinaison</div>
                  </div>
                </div>
                
                {/* 📏 PROFONDEUR (Distance caméra ↔ marqueur) */}
                {estimatedDepth && (
                  <div style={{ 
                    marginTop: 12, 
                    padding: '8px 12px',
                    background: 'rgba(255,255,255,0.15)',
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8
                  }}>
                    <span style={{ fontSize: 18 }}>📏</span>
                    <div>
                      <div style={{ fontSize: 11, opacity: 0.8 }}>Distance caméra ↔ marqueur</div>
                      <div style={{ 
                        fontSize: 20, 
                        fontWeight: 'bold',
                        color: estimatedDepth < 50 ? '#52c41a' : estimatedDepth < 100 ? '#faad14' : '#ff7875'
                      }}>
                        ~{estimatedDepth} cm
                        <span style={{ fontSize: 12, fontWeight: 'normal', opacity: 0.7, marginLeft: 4 }}>
                          ({(estimatedDepth / 100).toFixed(2)} m)
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div style={{ 
                  marginTop: 8, 
                  fontSize: 11, 
                  opacity: 0.7,
                  textAlign: 'center'
                }}>
                  {Math.abs(pose.rotX) < 15 && Math.abs(pose.rotY) < 15 
                    ? '✅ Angles idéaux pour une mesure précise' 
                    : Math.abs(pose.rotX) < 30 && Math.abs(pose.rotY) < 30
                      ? '⚠️ Angles acceptables - correction homographie appliquée'
                      : '⚠️ Photo très inclinée - précision réduite'}
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Canvas desktop standard */}
      <div ref={canvasViewportRef}>
        <div
          ref={canvasContainerRef}
          style={{
            border: '1px solid var(--ant-color-border)',
            borderRadius: 8,
            overflow: 'hidden',
            backgroundColor: 'var(--ant-color-bg-layout)',
            position: 'relative',
            width: '100%',
            maxWidth: imageDimensions.width,
            height: imageDimensions.height,
            touchAction: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none',
            WebkitTouchCallout: 'none',
            WebkitTapHighlightColor: 'transparent'
          }}
        >
          <Stage
            ref={stageRef}
            width={imageDimensions.width}
            height={imageDimensions.height}
            scaleX={zoom}
            scaleY={zoom}
            x={stagePosition.x}
            y={stagePosition.y}
            onClick={handleStageClick}
            onTap={handleStageClick}
            onMouseMove={(e) => {
              handleStageMouseMove(e);
              handleStagePanMove(e);
            }}
            onMouseDown={handleStagePanStart}
            onMouseUp={() => {
              handleStageMouseUp();
              handleStagePanEnd();
            }}
            onTouchStart={handleStageTouchStart as any}
            onTouchMove={handleStageTouchMove as any}
            onTouchEnd={handleStageTouchEnd as any}
            style={{
              cursor: pointBeingPlaced
                ? 'crosshair'
                : isPanning
                ? 'grabbing'
                : zoom > 1
                ? 'grab'
                : workflowStep === 'selectReferenceZone' || workflowStep === 'selectMeasureZone'
                ? 'crosshair'
                : selectedTool === 'addPoint'
                ? 'crosshair'
                : 'default'
            }}
          >
          <Layer>
            {/* Background Image */}
            <KonvaImage
              image={image}
              width={imageDimensions.width}
              height={imageDimensions.height}
            />

            {/* Le rectangle de référence est maintenant rendu à la fin pour être au-dessus */}

            {/* Measurement lines between points - ORDRE CORRECT: A→B→D→C→A pour rectangle */}
            {points.length >= 4 && (() => {
              // Réorganiser les points pour éviter les croisements
              // On veut: haut-gauche → haut-droit → bas-droit → bas-gauche
              const sortedPoints = [...points].slice(0, 4);
              
              // Trier par Y d'abord (haut vs bas), puis par X (gauche vs droite)
              const topPoints = sortedPoints
                .map((p, i) => ({ ...p, originalIndex: i }))
                .sort((a, b) => a.y - b.y)
                .slice(0, 2)
                .sort((a, b) => a.x - b.x);
              const bottomPoints = sortedPoints
                .map((p, i) => ({ ...p, originalIndex: i }))
                .sort((a, b) => a.y - b.y)
                .slice(2, 4)
                .sort((a, b) => a.x - b.x);
              
              // Ordre: haut-gauche, haut-droit, bas-droit, bas-gauche (sens horaire)
              const orderedPoints = [
                topPoints[0],     // A - haut gauche
                topPoints[1],     // B - haut droit
                bottomPoints[1],  // D - bas droit
                bottomPoints[0]   // C - bas gauche
              ];
              
              return (
                <Line
                  points={orderedPoints.flatMap(p => [p.x, p.y]).concat([orderedPoints[0].x, orderedPoints[0].y])}
                  stroke={colors.measurementLine}
                  strokeWidth={1}
                  dash={[3, 3]}
                  closed
                />
              );
            })()}
            
            {/* Lignes pour 2-3 points */}
            {points.length >= 2 && points.length < 4 && (
              <Line
                points={points.flatMap(p => [p.x, p.y]).concat([points[0].x, points[0].y])}
                stroke={colors.measurementLine}
                strokeWidth={1}
                dash={[3, 3]}
                closed
              />
            )}

            {/* Exclusion zones */}
            {exclusionZones.map(zone => (
              <Group key={zone.id}>
                {zone.type === 'rectangle' ? (
                  <Rect
                    x={zone.points[0][0]}
                    y={zone.points[0][1]}
                    width={zone.points[1][0] - zone.points[0][0]}
                    height={zone.points[1][1] - zone.points[0][1]}
                    fill={zone.color}
                    opacity={zone.opacity}
                    stroke={selectedZoneId === zone.id ? '#000' : zone.color}
                    strokeWidth={selectedZoneId === zone.id ? 2 : 1}
                    onClick={() => setSelectedZoneId(zone.id)}
                  />
                ) : (
                  <Ellipse
                    x={(zone.points[0][0] + zone.points[1][0]) / 2}
                    y={(zone.points[0][1] + zone.points[1][1]) / 2}
                    radiusX={(zone.points[1][0] - zone.points[0][0]) / 2}
                    radiusY={(zone.points[1][1] - zone.points[0][1]) / 2}
                    fill={zone.color}
                    opacity={zone.opacity}
                    stroke={selectedZoneId === zone.id ? '#000' : zone.color}
                    strokeWidth={selectedZoneId === zone.id ? 2 : 1}
                    onClick={() => setSelectedZoneId(zone.id)}
                  />
                )}
              </Group>
            ))}

            {/* Drawing zone preview - 🆕 Couleurs différentes selon l'étape du workflow */}
            {drawingZone && (
              (() => {
                // Couleurs selon l'étape du workflow
                const zoneColor = workflowStep === 'selectReferenceZone' 
                  ? '#1890ff' // Bleu pour A4
                  : workflowStep === 'selectMeasureZone'
                  ? '#faad14' // Orange pour objet à mesurer
                  : colors.exclusionZone; // Rouge pour zones d'exclusion
                
                const isWorkflowZone = workflowStep === 'selectReferenceZone' || workflowStep === 'selectMeasureZone';
                
                if (selectedTool === 'addEllipseZone') {
                  return (
                    <Ellipse
                      x={(drawingZone.start[0] + drawingZone.end[0]) / 2}
                      y={(drawingZone.start[1] + drawingZone.end[1]) / 2}
                      radiusX={Math.abs(drawingZone.end[0] - drawingZone.start[0]) / 2}
                      radiusY={Math.abs(drawingZone.end[1] - drawingZone.start[1]) / 2}
                      fill={zoneColor}
                      opacity={0.2}
                      stroke={zoneColor}
                      strokeWidth={isWorkflowZone ? 3 : 2}
                      dash={[5, 5]}
                    />
                  );
                }
                return (
                  <Rect
                    x={Math.min(drawingZone.start[0], drawingZone.end[0])}
                    y={Math.min(drawingZone.start[1], drawingZone.end[1])}
                    width={Math.abs(drawingZone.end[0] - drawingZone.start[0])}
                    height={Math.abs(drawingZone.end[1] - drawingZone.start[1])}
                    fill={zoneColor}
                    opacity={0.2}
                    stroke={zoneColor}
                    strokeWidth={isWorkflowZone ? 3 : 2}
                    dash={[8, 4]}
                  />
                );
              })()
            )}

            {/* Measurement points - 🆕 COINS CARRÉS PRÉCIS - petits mais visibles + DRAGGABLES */}
            {points.map((point, index) => (
              <Group key={point.id}>
                {/* 🆕 HITBOX invisible plus grande pour faciliter le tap ET le drag sur mobile */}
                <Circle
                  x={point.x}
                  y={point.y}
                  radius={30}
                  // IMPORTANT: évite un fill totalement transparent (alpha=0) qui peut rendre le hit-test Konva non fiable sur mobile
                  fill="rgba(0,0,0,0.01)"
                  draggable={!readOnly && point.draggable !== false}
                  onDragMove={(e) => {
                    e.cancelBubble = true;
                    const newX = e.target.x();
                    const newY = e.target.y();
                    
                    // Snap en temps réel aux bords détectés
                    const snapped = snapPointToEdge(newX, newY, 15);
                    if (snapped.snapped) {
                      e.target.x(snapped.x);
                      e.target.y(snapped.y);
                    }
                    
                    // Mettre à jour le point en temps réel
                    setPoints(prev => prev.map(p => 
                      p.id === point.id 
                        ? { ...p, x: snapped.snapped ? snapped.x : newX, y: snapped.snapped ? snapped.y : newY }
                        : p
                    ));
                  }}
                  onDragEnd={() => {
                    // Recalculer les mesures - passer les points actuels
                    saveToHistory(points, exclusionZones);
                  }}
                  onClick={(e) => {
                    e.cancelBubble = true;
                    if (pointBeingPlaced === point.id) {
                      cancelPointPlacement();
                    } else if (!readOnly && point.draggable !== false) {
                      // Sélectionner ce point pour placement
                      selectPointForPlacement(point.id, point.x, point.y);
                    }
                  }}
                  onTap={(e) => {
                    e.cancelBubble = true;
                    if (pointBeingPlaced === point.id) {
                      cancelPointPlacement();
                    } else if (!readOnly && point.draggable !== false) {
                      // Sélectionner ce point pour placement
                      selectPointForPlacement(point.id, point.x, point.y);
                    }
                  }}
                  onMouseEnter={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'grab';
                  }}
                  onMouseLeave={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'default';
                  }}
                />
                
                {/* 🆕 Point carré (coin) - PETIT pour précision maximale */}
                <Rect
                  x={point.x - (pointBeingPlaced === point.id ? 8 : selectedPointId === point.id ? 6 : 5)}
                  y={point.y - (pointBeingPlaced === point.id ? 8 : selectedPointId === point.id ? 6 : 5)}
                  width={pointBeingPlaced === point.id ? 16 : selectedPointId === point.id ? 12 : 10}
                  height={pointBeingPlaced === point.id ? 16 : selectedPointId === point.id ? 12 : 10}
                  fill={pointBeingPlaced === point.id ? '#ff0000' : point.color}
                  stroke={pointBeingPlaced === point.id ? '#ffff00' : selectedPointId === point.id ? '#000' : '#fff'}
                  strokeWidth={pointBeingPlaced === point.id ? 2 : 1.5}
                  cornerRadius={1}
                  rotation={45}
                  offsetX={0}
                  offsetY={0}
                  listening={false}
                  shadowColor="black"
                  shadowBlur={pointBeingPlaced === point.id ? 6 : 2}
                  shadowOpacity={pointBeingPlaced === point.id ? 0.6 : 0.3}
                />
                
                {/* 🆕 Croix fine au centre pour précision */}
                <Line
                  points={[point.x - 4, point.y, point.x + 4, point.y]}
                  stroke={pointBeingPlaced === point.id ? '#ffff00' : '#fff'}
                  strokeWidth={1.5}
                  listening={false}
                />
                <Line
                  points={[point.x, point.y - 4, point.x, point.y + 4]}
                  stroke={pointBeingPlaced === point.id ? '#ffff00' : '#fff'}
                  strokeWidth={1.5}
                  listening={false}
                />

                {/* Point label - 🆕 position ajustée pour coin */}
                <KonvaText
                  x={point.x + 10}
                  y={point.y - 20}
                  text={point.label || String(index + 1)}
                  fontSize={14}
                  fontStyle="bold"
                  fill={point.color}
                  stroke="#fff"
                  strokeWidth={1}
                  listening={false}
                />

                {/* Distance label (to next point) */}
                {index < points.length - 1 && (
                  <KonvaText
                    x={(point.x + points[index + 1].x) / 2 - 20}
                    y={(point.y + points[index + 1].y) / 2 - 10}
                    text={formatMeasurement(
                      calculateDistance(
                        [point.x, point.y],
                        [points[index + 1].x, points[index + 1].y],
                        pixelPerCm
                      ) * (unit === 'cm' ? 1 : unit === 'm' ? 0.01 : unit === 'mm' ? 10 : 0.394),
                      unit
                    )}
                    fontSize={11}
                    fill={colors.measurementLine}
                    fontStyle="bold"
                    padding={4}
                    listening={false}
                  />
                )}
              </Group>
            ))}

            {/* 🆕 Rectangle vert INTERACTIF pour la référence (A4, carte, etc.) - MASQUÉ si mode quadrilatère actif */}
            {adjustableRefBox && !quadrilateralMode && (
              <Group
                onClick={(e) => {
                  e.cancelBubble = true;
                  console.log('🎯 [Canvas] Clic sur GROUP de référence!');
                  setIsRefSelected(!isRefSelected);
                }}
                onTap={(e) => {
                  e.cancelBubble = true;
                  console.log('🎯 [Canvas] Tap sur GROUP de référence!');
                  setIsRefSelected(!isRefSelected);
                }}
                onMouseDown={(e) => {
                  e.cancelBubble = true;
                  console.log('🎯 [Canvas] MouseDown sur GROUP de référence!');
                }}
              >
                {/* Rectangle principal - draggable */}
                <Rect
                  x={adjustableRefBox.x}
                  y={adjustableRefBox.y}
                  width={adjustableRefBox.width}
                  height={adjustableRefBox.height}
                  stroke={isRefSelected ? "#faad14" : "#52c41a"}
                  strokeWidth={isRefSelected ? 2 : 1.5}
                  dash={[4, 2]}
                  fill={isRefSelected ? "rgba(250, 173, 20, 0.15)" : "rgba(82, 196, 26, 0.1)"}
                  cornerRadius={4}
                  draggable={!readOnly && isRefSelected}
                  hitStrokeWidth={30}
                  listening={true}
                  onDragStart={(e) => {
                    e.cancelBubble = true;
                    console.log('🎯 [Canvas] Drag start rectangle de référence');
                  }}
                  onDragEnd={(e) => {
                    e.cancelBubble = true;
                    const newBox = {
                      ...adjustableRefBox,
                      x: e.target.x(),
                      y: e.target.y()
                    };
                    setAdjustableRefBox(newBox);
                    // 🔧 skipSnap=true car l'utilisateur positionne manuellement le rectangle A4
                    // Le snap détecterait les bords de la porte au lieu du A4 !
                    recalculateCalibration(newBox, true);
                  }}
                  onMouseEnter={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = isRefSelected ? 'move' : 'pointer';
                  }}
                  onMouseLeave={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'default';
                  }}
                />
                
                {/* Poignées de redimensionnement (coins) - taille réduite pour précision */}
                {isRefSelected && [
                  { key: 'tl', cx: adjustableRefBox.x, cy: adjustableRefBox.y, cursor: 'nwse-resize' },
                  { key: 'tr', cx: adjustableRefBox.x + adjustableRefBox.width, cy: adjustableRefBox.y, cursor: 'nesw-resize' },
                  { key: 'bl', cx: adjustableRefBox.x, cy: adjustableRefBox.y + adjustableRefBox.height, cursor: 'nesw-resize' },
                  { key: 'br', cx: adjustableRefBox.x + adjustableRefBox.width, cy: adjustableRefBox.y + adjustableRefBox.height, cursor: 'nwse-resize' }
                ].map(({ key, cx, cy, cursor }) => (
                  <Circle
                    key={key}
                    x={cx}
                    y={cy}
                    radius={6}
                    fill="#faad14"
                    stroke="#fff"
                    strokeWidth={1.5}
                    draggable
                    onClick={(e) => { e.cancelBubble = true; }}
                    onTap={(e) => { e.cancelBubble = true; }}
                    onDragStart={(e) => { e.cancelBubble = true; }}
                    onDragMove={(e) => {
                      e.cancelBubble = true;
                      const newX = e.target.x();
                      const newY = e.target.y();
                      let newBox = { ...adjustableRefBox };
                      
                      if (key === 'tl') {
                        newBox = {
                          x: newX,
                          y: newY,
                          width: adjustableRefBox.x + adjustableRefBox.width - newX,
                          height: adjustableRefBox.y + adjustableRefBox.height - newY
                        };
                      } else if (key === 'tr') {
                        newBox = {
                          x: adjustableRefBox.x,
                          y: newY,
                          width: newX - adjustableRefBox.x,
                          height: adjustableRefBox.y + adjustableRefBox.height - newY
                        };
                      } else if (key === 'bl') {
                        newBox = {
                          x: newX,
                          y: adjustableRefBox.y,
                          width: adjustableRefBox.x + adjustableRefBox.width - newX,
                          height: newY - adjustableRefBox.y
                        };
                      } else if (key === 'br') {
                        newBox = {
                          x: adjustableRefBox.x,
                          y: adjustableRefBox.y,
                          width: newX - adjustableRefBox.x,
                          height: newY - adjustableRefBox.y
                        };
                      }
                      
                      // S'assurer que les dimensions restent positives
                      if (newBox.width > 20 && newBox.height > 20) {
                        setAdjustableRefBox(newBox);
                      }
                    }}
                    onDragEnd={() => {
                      // 🔧 skipSnap=true car l'utilisateur redimensionne manuellement le rectangle A4
                      recalculateCalibration(adjustableRefBox, true);
                    }}
                    onMouseEnter={(e) => {
                      const container = e.target.getStage()?.container();
                      if (container) container.style.cursor = cursor;
                    }}
                    onMouseLeave={(e) => {
                      const container = e.target.getStage()?.container();
                      if (container) container.style.cursor = 'default';
                    }}
                  />
                ))}
                
                {/* Label avec dimensions */}
                <KonvaText
                  x={adjustableRefBox.x}
                  y={adjustableRefBox.y - 28}
                  text={isRefSelected 
                    ? `⚠️ AJUSTEZ ce rectangle sur la VRAIE ${isArucoMode ? 'référence ArUco' : 'feuille A4'} !`
                    : `📐 ${isArucoMode ? 'ArUco MAGENTA' : 'Feuille A4'} (${isArucoMode ? markerSizeCm : referenceRealSize.width}×${isArucoMode ? markerSizeCm : referenceRealSize.height}cm) - CLIQUEZ pour ajuster`}
                  fontSize={11}
                  fontStyle="bold"
                  fill={isRefSelected ? "#ff4d4f" : "#52c41a"}
                  padding={4}
                  listening={false}
                />
                
                {/* Afficher les dimensions en pixels quand sélectionné */}
                {isRefSelected && (
                  <KonvaText
                    x={adjustableRefBox.x + adjustableRefBox.width / 2 - 40}
                    y={adjustableRefBox.y + adjustableRefBox.height / 2 - 10}
                    text={`${adjustableRefBox.width.toFixed(0)}×${adjustableRefBox.height.toFixed(0)}px`}
                    fontSize={14}
                    fontStyle="bold"
                    fill="#faad14"
                    align="center"
                    listening={false}
                  />
                )}
              </Group>
            )}

            {/* 🆕 MODE QUADRILATÈRE: 4 coins ajustables individuellement pour la perspective */}
            {quadrilateralMode && referenceCorners && (
              <Group>
                {/* Fond semi-transparent pour l'A4 */}
                <Line
                  points={[
                    referenceCorners.topLeft.x, referenceCorners.topLeft.y,
                    referenceCorners.topRight.x, referenceCorners.topRight.y,
                    referenceCorners.bottomRight.x, referenceCorners.bottomRight.y,
                    referenceCorners.bottomLeft.x, referenceCorners.bottomLeft.y
                  ]}
                  closed
                  stroke="#52c41a"
                  strokeWidth={2}
                  dash={[8, 4]}
                  fill="rgba(82, 196, 26, 0.15)"
                  listening={false}
                />
                
                {/* 4 coins draggables avec labels */}
                {[
                  { key: 'topLeft', pos: referenceCorners.topLeft, label: 'A' },
                  { key: 'topRight', pos: referenceCorners.topRight, label: 'B' },
                  { key: 'bottomRight', pos: referenceCorners.bottomRight, label: 'C' },
                  { key: 'bottomLeft', pos: referenceCorners.bottomLeft, label: 'D' }
                ].map(({ key, pos, label }) => (
                  <Group key={key}>
                    {/* 🆕 HITBOX invisible plus grande pour faciliter le drag sur mobile */}
                    <Circle
                      x={pos.x}
                      y={pos.y}
                      radius={25}
                      // IMPORTANT: éviter alpha=0 pour que le hit-test Konva marche bien en touch
                      fill="rgba(0,0,0,0.01)"
                      draggable={!readOnly}
                      onDragMove={(e) => {
                        e.cancelBubble = true;
                        const newX = e.target.x();
                        const newY = e.target.y();
                        
                        // Snap en temps réel
                        const snapped = snapPointToEdge(newX, newY, 20);
                        if (snapped.snapped) {
                          e.target.x(snapped.x);
                          e.target.y(snapped.y);
                        }
                        
                        // Mettre à jour le coin
                        setReferenceCorners(prev => {
                          if (!prev) return prev;
                          return {
                            ...prev,
                            [key]: { x: snapped.snapped ? snapped.x : newX, y: snapped.snapped ? snapped.y : newY }
                          };
                        });
                      }}
                      onDragEnd={() => {
                        // Recalculer l'homographie avec les 4 coins mis à jour
                        if (referenceCorners) {
                          recalculateHomographyFromCorners(referenceCorners);
                        }
                      }}
                      onMouseEnter={(e) => {
                        const container = e.target.getStage()?.container();
                        if (container) container.style.cursor = 'grab';
                      }}
                      onMouseLeave={(e) => {
                        const container = e.target.getStage()?.container();
                        if (container) container.style.cursor = 'default';
                      }}
                    />
                    
                    {/* Cercle du coin - PETIT pour précision (juste visuel) */}
                    <Circle
                      x={pos.x}
                      y={pos.y}
                      radius={6}
                      fill="#52c41a"
                      stroke="#fff"
                      strokeWidth={1.5}
                      shadowColor="black"
                      shadowBlur={2}
                      shadowOpacity={0.3}
                      listening={false}
                    />
                    {/* Label du coin - petit */}
                    <KonvaText
                      x={pos.x + 8}
                      y={pos.y - 4}
                      text={label}
                      fontSize={10}
                      fontStyle="bold"
                      fill="#52c41a"
                      stroke="#fff"
                      strokeWidth={0.5}
                      listening={false}
                    />
                  </Group>
                ))}
                
                {/* Label quadrilatère - en haut */}
                <KonvaText
                  x={referenceCorners.topLeft.x}
                  y={referenceCorners.topLeft.y - 40}
                  text={`📐 ${isArucoMode ? 'ArUco MAGENTA' : 'Feuille A4'} (${isArucoMode ? markerSizeCm : referenceRealSize.width}×${isArucoMode ? markerSizeCm : referenceRealSize.height}cm)`}
                  fontSize={12}
                  fontStyle="bold"
                  fill="#52c41a"
                  padding={4}
                  listening={false}
                />
                <KonvaText
                  x={referenceCorners.topLeft.x}
                  y={referenceCorners.topLeft.y - 25}
                  text="Ajustez les 4 coins verts sur les vrais bords"
                  fontSize={10}
                  fill="#52c41a"
                  padding={4}
                  listening={false}
                />
                
                {/* Indicateur homographie - en bas */}
                {homographyResult && (
                  <KonvaText
                    x={referenceCorners.bottomLeft.x}
                    y={referenceCorners.bottomLeft.y + 15}
                    text={`Homographie: ${homographyResult.quality.toFixed(0)}% | ±${homographyResult.uncertainty.toFixed(1)}%`}
                    fontSize={11}
                    fill={homographyResult.quality > 50 ? "#52c41a" : "#faad14"}
                    padding={4}
                    listening={false}
                  />
                )}
              </Group>
            )}

            {/* Debug Grid - Visualisation de l'homographie */}
            {debugMode && debugGrid.length > 0 && (
              <Group>
                {debugGrid.map((line, i) => (
                  <Line
                    key={`debug-${i}`}
                    points={[line.src[0], line.src[1], line.dst[0], line.dst[1]]}
                    stroke="rgba(255, 0, 255, 0.5)"
                    strokeWidth={1}
                    dash={[3, 3]}
                    listening={false}
                  />
                ))}
                {/* Points source */}
                {debugGrid.filter((_, i) => i % 4 === 0).map((line, i) => (
                  <Circle
                    key={`debug-src-${i}`}
                    x={line.src[0]}
                    y={line.src[1]}
                    radius={3}
                    fill="magenta"
                    listening={false}
                  />
                ))}
              </Group>
            )}
          </Layer>
          </Stage>
        </div>
      </div>

      {/* Measurements display */}
      {!isMobileFullscreen && (
        <Card size="small" style={{ marginTop: 8 }}>
          <Space wrap size="large">
            {measurements.largeur_cm !== undefined && (
              <Tag color="blue">
                Largeur : {formatMeasurement(convertUnit(measurements.largeur_cm, unit), unit)}
                {measurements.incertitude_largeur_cm !== undefined && (
                  <Text type="secondary" style={{ fontSize: '0.85em', marginLeft: 4 }}>
                    ±{formatMeasurement(convertUnit(measurements.incertitude_largeur_cm, unit), unit)}
                  </Text>
                )}
              </Tag>
            )}
            {measurements.hauteur_cm !== undefined && (
              <Tag color="blue">
                Hauteur : {formatMeasurement(convertUnit(measurements.hauteur_cm, unit), unit)}
                {measurements.incertitude_hauteur_cm !== undefined && (
                  <Text type="secondary" style={{ fontSize: '0.85em', marginLeft: 4 }}>
                    ±{formatMeasurement(convertUnit(measurements.incertitude_hauteur_cm, unit), unit)}
                  </Text>
                )}
              </Tag>
            )}
            {measurements.surface_brute_m2 !== undefined && (
              <Tag color="green">Surface brute : {measurements.surface_brute_m2.toFixed(2)} m²</Tag>
            )}
            {measurements.surface_nette_m2 !== undefined && exclusionZones.length > 0 && (
              <Tag color="orange">Surface nette : {measurements.surface_nette_m2.toFixed(2)} m²</Tag>
            )}
            {measurements.perimetre_cm !== undefined && (
              <Tag color="purple">
                Périmètre : {formatMeasurement(convertUnit(measurements.perimetre_cm, unit), unit)}
              </Tag>
            )}
            {measurements.homography_quality !== undefined && useHomography && (
              <Tag
                color={
                  measurements.homography_quality > 70
                    ? 'cyan'
                    : measurements.homography_quality > 50
                    ? 'gold'
                    : 'red'
                }
              >
                Qualité : {measurements.homography_quality.toFixed(0)}%
              </Tag>
            )}
          </Space>
        </Card>
      )}

      {/* Action buttons */}
      {!readOnly && !isMobileFullscreen && (onValidate || onCancel) && (
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Space>
            {onCancel && (
              <Button icon={<CloseOutlined />} onClick={onCancel}>
                Annuler
              </Button>
            )}
            {onValidate && (
              <Button type="primary" icon={<CheckOutlined />} onClick={handleValidate} disabled={points.length < minPoints}>
                Valider les mesures
              </Button>
            )}
          </Space>
        </div>
      )}
    </div>
  );
};

export default ImageMeasurementCanvas;
