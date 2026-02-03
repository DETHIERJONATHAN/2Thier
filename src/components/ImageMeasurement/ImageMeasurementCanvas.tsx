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
  Alert,
  Drawer
} from 'antd';
import {
  PlusOutlined,
  DragOutlined,
  DeleteOutlined,
  UndoOutlined,
  RedoOutlined,
  CheckOutlined,
  CloseOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  MenuOutlined,
  ArrowLeftOutlined as _ArrowLeftOutlined
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
  cornersToPoints,
  generateDebugGrid,
  type HomographyResult,
  type HomographyCorners
} from '../../utils/homographyUtils';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { CoordinateGrid } from './CoordinateGrid';

const { Text } = Typography;
const { Option } = Select;

interface ImageMeasurementCanvasProps {
  imageUrl: string;
  initialPoints?: MeasurementPoint[];
  initialExclusionZones?: ExclusionZone[];
  onMeasurementsChange?: (measurements: MeasurementResults) => void;
  onAnnotationsChange?: (annotations: Partial<ImageAnnotations>) => void;
  calibration?: CalibrationData;
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
  // 📱 UX mobile: plein écran fixe + menu bas
  mobileFullscreen?: boolean;
}

interface HistoryState {
  points: MeasurementPoint[];
  exclusionZones: ExclusionZone[];
}

export const ImageMeasurementCanvas: React.FC<ImageMeasurementCanvasProps> = ({
  imageUrl,
  initialPoints = [],
  initialExclusionZones = [],
  onMeasurementsChange,
  onAnnotationsChange: _onAnnotationsChange,
  calibration,
  onValidate,
  onCancel,
  readOnly = false,
  minPoints = 2,
  maxWidth = 800,
  maxHeight, // 📱 Pour le mode plein écran mobile
  defaultUnit = 'cm',
  referenceDetected = null,
  referenceRealSize = { width: 13, height: 20.5 }, // Métré A4 V10 par défaut
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
  mobileFullscreen = false,
  // 🎨 VISUALISATION DEBUG APRILTAG supprimée (V10 only)
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
  const [showCoordinateGrid, setShowCoordinateGrid] = useState(false);

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
  
  // �🆕 Facteur de correction de perspective (ajustable par l'utilisateur)
  // Ce facteur compense le fait que l'objet de référence (Métré A4 V10)
  // n'est pas dans le même plan que les points de mesure
  const [_perspectiveCorrectionX, _setPerspectiveCorrectionX] = useState(1.0);
  const [_perspectiveCorrectionY, _setPerspectiveCorrectionY] = useState(1.0);

  // � DIMENSIONS DE RÉFÉRENCE - Métré A4 V10
  const [localReferenceRealSize, setReferenceRealSize] = useState<{ width: number; height: number }>(referenceRealSize);

  // Sync props → state : permet une référence manuelle (non V10)
  useEffect(() => {
    setReferenceRealSize(referenceRealSize);
  }, [referenceRealSize]);

  // Points destination en millimètres, basés sur la taille réelle (cm) de la référence.
  // Exemple V10: 13×20.5cm → 130×205mm.
  const getReferenceDestinationPointsMm = useCallback((): [number, number][] => {
    const widthCm = Math.max(0.01, Number(localReferenceRealSize?.width || 13));
    const heightCm = Math.max(0.01, Number(localReferenceRealSize?.height || 20.5));
    const widthMm = widthCm * 10;
    const heightMm = heightCm * 10;
    return [
      [0, 0],
      [widthMm, 0],
      [widthMm, heightMm],
      [0, heightMm]
    ];
  }, [localReferenceRealSize]);

  // �🆕 État local pour le rectangle de référence ajustable (en pixels d'affichage)
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

  // 🔍 Log quand on active la grille (APRÈS la déclaration de referenceCorners)
  useEffect(() => {
    if (showCoordinateGrid) {
      console.log('📊 GRILLE ACTIVÉE');
      console.log('   Référence V10:', referenceCorners ? `TL(${referenceCorners.topLeft.x.toFixed(0)},${referenceCorners.topLeft.y.toFixed(0)}) TR(${referenceCorners.topRight.x.toFixed(0)},${referenceCorners.topRight.y.toFixed(0)}) BR(${referenceCorners.bottomRight.x.toFixed(0)},${referenceCorners.bottomRight.y.toFixed(0)}) BL(${referenceCorners.bottomLeft.x.toFixed(0)},${referenceCorners.bottomLeft.y.toFixed(0)})` : 'AUCUN');
      console.log('   pixelPerCmX:', pixelPerCmX.toFixed(4), '| pixelPerCmY:', pixelPerCmY.toFixed(4));
    }
  }, [showCoordinateGrid, referenceCorners, pixelPerCmX, pixelPerCmY]);

  // 🆕 HOMOGRAPHIE - Correction de perspective mathématique
  const [homographyResult, setHomographyResult] = useState<HomographyResult | null>(null);
  const [useHomography, setUseHomography] = useState(true); // Activé par défaut
  const [debugMode, setDebugMode] = useState(false); // Mode debug pour voir la grille
  const [debugGrid, setDebugGrid] = useState<{ src: [number, number]; dst: [number, number] }[]>([]);
  
  // 🆕 WORKFLOW GUIDÉ - Étapes: 1) Zone référence Métré A4 V10, 2) Zone objet, 3) Ajustement
  // 🎯 Si référence pré-détectée (fusedCorners), on skip la sélection manuelle
  type WorkflowStep = 'selectReferenceZone' | 'selectMeasureZone' | 'adjusting';
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>(() => {
    // Si référence déjà détectée, passer directement à la sélection de l'objet à mesurer
    if (fusedCorners && homographyReady) {
      console.log('🚀 [Canvas] Initialisation: référence pré-détectée → workflowStep = selectMeasureZone');
      return 'selectMeasureZone';
    }
    return 'selectReferenceZone';
  });
  const [isDetectingCorners, setIsDetectingCorners] = useState(false);
  const [_zoneSelectionType, _setZoneSelectionType] = useState<'a4' | 'door' | 'window' | null>(null);
  const [isProcessingZone, setIsProcessingZone] = useState(false); // 🆕 Protection contre appels multiples

  // ============================================================================
  // 🎯 MESURES BACKEND CENTRALISÉES
  // ============================================================================
  // Les mesures sont maintenant calculées côté serveur avec:
  // - Homographie (DLT + 105 points + RANSAC)
  // - Correction focale EXIF pour objets hors-plan du marqueur
  // - Estimation de profondeur et incertitudes
  const [backendMeasurements, setBackendMeasurements] = useState<{
    largeur_cm: number;
    hauteur_cm: number;
    incertitude_largeur_cm: number;
    incertitude_hauteur_cm: number;
    confidence: number;
    method: string;
    warnings: string[];
    debug?: any;
    depth?: {
      mean_mm: number;
      stdDev_mm: number;
      incline_angle_deg: number;
    };
  } | null>(null);
  const [isComputingBackend, setIsComputingBackend] = useState(false);
  // 🔒 REF pour éviter les appels multiples au backend
  const isComputingRef = useRef(false);
  const lastComputedDataRef = useRef<string>('');
  // 🔒 FLAG pour savoir si un point est en cours de drag (évite les calculs pendant le drag)
  const [isDraggingPoint, setIsDraggingPoint] = useState(false);
  // 🔒 Trigger manuel pour forcer un recalcul (incrémenté à la fin du drag)
  const [computeTrigger, setComputeTrigger] = useState(0);

  // 🆕 ZOOM PRÉCIS - Mode "clic pour placer" au lieu de drag continu
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 });
  const [pointBeingPlaced, setPointBeingPlaced] = useState<string | null>(null); // Point en cours de repositionnement
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPosition, setLastPanPosition] = useState({ x: 0, y: 0 });
  
  // 🔒 VERROUILLAGE DES COINS - Empêche les modifications accidentelles
  const [lockedPoints, setLockedPoints] = useState<Set<string>>(new Set());
  // État du workflow de placement: null → 'zoomed' → 'placed' → 'locked'
  const [pointPlacementState, setPointPlacementState] = useState<'zoomed' | 'placed' | null>(null);

  // ============================================================================
  // 🎯 CONFIG MARQUEUR MÉTRÉ A4 V10
  // ============================================================================
  const { api: authenticatedApi } = useAuthenticatedApi();

  const isMobileFullscreen = isMobile && mobileFullscreen;

  // Colors from config
  const colors = DEFAULT_CANVAS_CONFIG.colors;
  
  // 🔄 Garder un ordre cohérent pour relier tous les points (évite les points orphelins)
  const orderedPoints = useMemo(() => {
    if (points.length === 0) return [] as MeasurementPoint[];
    if (points.length <= 2) return [...points];

    const centroidX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const centroidY = points.reduce((sum, p) => sum + p.y, 0) / points.length;

    const sortedByAngle = [...points].sort((a, b) => {
      const angleA = Math.atan2(a.y - centroidY, a.x - centroidX);
      const angleB = Math.atan2(b.y - centroidY, b.x - centroidX);
      return angleA - angleB;
    });

    // Démarrer par le point le plus en haut à gauche pour limiter les sauts visuels
    const startIndex = sortedByAngle.reduce((bestIdx, point, idx, arr) => {
      const best = arr[bestIdx];
      if (point.y < best.y) return idx;
      if (point.y === best.y && point.x < best.x) return idx;
      return bestIdx;
    }, 0);

    return [...sortedByAngle.slice(startIndex), ...sortedByAngle.slice(0, startIndex)];
  }, [points]);

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
  // 🎯 CONFIG MARQUEUR MÉTRÉ A4 V10
  // ============================================================================
  
  // Métré A4 V10 (6 tags 5cm + 1 tag 10cm)
  useEffect(() => {
    // Métré A4 V10 = 13.0cm × 20.5cm (centres des 6 petits tags)
    setReferenceRealSize({ width: 13.0, height: 20.5 });
  }, []);

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

  // 🎯 Auto-initialiser avec les fusedCorners si disponibles
  // Cet effet permet de skip la sélection manuelle de la référence
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
    
    // 🎯 Calibration basée sur la référence réelle
    const refWidth = Math.max(0.01, Number(localReferenceRealSize?.width || 13));
    const refHeight = Math.max(0.01, Number(localReferenceRealSize?.height || 20.5));
    console.log(`🎯 [Canvas] Calibration référence (${refWidth}cm × ${refHeight}cm)`);
    
    const newPixelPerCmX = fusedBox.width / refWidth;
    const newPixelPerCmY = fusedBox.height / refHeight;
    // 🔧 CORRECTION ASYMÉTRIE: Utiliser pixelPerCmX pour les deux dimensions
    // Raison: la référence peut être asymétrique en Y (perspective/distortion), mais X est généralement correct
    const newPixelPerCm = newPixelPerCmX;  // ✅ UTILISER X POUR LES DEUX
    console.log(`   📏 Box: ${fusedBox.width.toFixed(0)}×${fusedBox.height.toFixed(0)}px`);
    console.log(`   📏 pixelPerCmX: ${newPixelPerCmX.toFixed(2)}, pixelPerCmY: ${newPixelPerCmY.toFixed(2)}`);
    console.log(`   🔧 APPLIQUÉ: pixelPerCm = ${newPixelPerCm.toFixed(2)} (utilise X pour corriger asymétrie Y)`);
    
    // Appliquer la calibration avec les setters existants
    // 🔧 CORRECTION: Utiliser newPixelPerCmX pour les deux (Y est asymétrique du marqueur)
    setPixelPerCmX(newPixelPerCmX);
    setPixelPerCmY(newPixelPerCmX);  // ✅ UTILISER X POUR Y AUSSI
    setPixelPerCm(newPixelPerCm);

    // 🚀 PASSER DIRECTEMENT À L'ÉTAPE DE MESURE (skip la sélection de référence)
    console.log('🚀 [Canvas] Passage automatique à l\'étape selectMeasureZone');
    setWorkflowStep('selectMeasureZone');
    
  }, [fusedCorners, homographyReady, imageDimensions, referenceCorners, quadrilateralMode, image, localReferenceRealSize]);

  // � SECOURS: Si référence pré-détectée et qu'on est encore en selectReferenceZone, forcer le passage
  useEffect(() => {
    if (fusedCorners && homographyReady && workflowStep === 'selectReferenceZone') {
      console.log('🔧 [Canvas] SECOURS: fusedCorners présent mais workflowStep=selectReferenceZone → Forcer selectMeasureZone');
      setWorkflowStep('selectMeasureZone');
    }
  }, [fusedCorners, homographyReady, workflowStep]);

  // �🔄 Recalculer pixelPerCm quand le rectangle de référence est ajusté
  const recalculateCalibration = useCallback((box: { x: number; y: number; width: number; height: number }, skipSnap: boolean = false) => {
    // 🆕 ÉTAPE 1: Snapper aux vrais bords de l'objet (détection de contours locale)
    let snappedBox = box;
    if (!skipSnap && image) {
      snappedBox = snapRectangleToEdges(box);
    }
    
    // Détecter l'orientation du rectangle (paysage ou portrait)
    const ratio = snappedBox.width / snappedBox.height;
    const isLandscape = ratio > 1; // Plus large que haut = paysage
    
    const refWidth = isLandscape ? localReferenceRealSize.height : localReferenceRealSize.width;
    const refHeight = isLandscape ? localReferenceRealSize.width : localReferenceRealSize.height;
    console.log(`🎯 [Canvas] Référence: ${refWidth}cm × ${refHeight}cm`);
    
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
    
    // Rectangle destination (mm) basé sur la référence réelle
    const dstPoints = getReferenceDestinationPointsMm();
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
  }, [localReferenceRealSize, imageDimensions, onReferenceAdjusted, image, snapRectangleToEdges, debugMode]);

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
    
    // 🛡️ VALIDATION: Vérifier que le quadrilatère a une taille raisonnable (référence)
    const ratio = Math.abs(avgWidth / avgHeight);
    const area = Math.abs(avgWidth * avgHeight);
    const imageArea = imageDimensions.width * imageDimensions.height;
    const areaRatio = area / imageArea;
    
    const expectedRatio = Math.abs(localReferenceRealSize.width / localReferenceRealSize.height);
    console.log(`   Ratio largeur/hauteur: ${ratio.toFixed(2)} (attendu ~${expectedRatio.toFixed(2)})`);
    console.log(`   Surface relative: ${(areaRatio * 100).toFixed(1)}% de l'image`);

    // Tolérance large (la référence n'est pas forcément un V10)
    const ratioError = Math.abs(ratio - expectedRatio) / expectedRatio;
    if (!Number.isFinite(ratioError) || ratioError > 0.8) {
      console.warn(`⚠️ [Canvas] Ratio très éloigné (${ratio.toFixed(2)} vs ~${expectedRatio.toFixed(2)}) - vérifier les coins/référence`);
      return;
    }
    if (areaRatio > 0.5 || areaRatio < 0.001) {  // Permettre des marqueurs plus petits
      console.warn(`⚠️ [Canvas] Surface aberrante - le quadrilatère est trop grand ou trop petit`);
      return;
    }

    const dstPoints = getReferenceDestinationPointsMm();
    console.log(`   📐 Référence utilisée: ${localReferenceRealSize.width}×${localReferenceRealSize.height}cm`);
    console.log(`   📐 Points destination:`, dstPoints.map(p => `(${p[0]}, ${p[1]})`).join(', '));
    
    try {
      const homography = computeHomography(srcPoints, dstPoints);
      
      // 🔍 VÉRIFICATION: La distance TL↔TR doit correspondre à la largeur réelle (mm)
      const topLeftReal = applyHomography(homography.matrix, srcPoints[0]);
      const topRightReal = applyHomography(homography.matrix, srcPoints[1]);
      const verifyDistanceMm = Math.hypot(topRightReal[0] - topLeftReal[0], topRightReal[1] - topLeftReal[1]);
      const expectedDistanceMm = Math.abs(dstPoints[1][0] - dstPoints[0][0]);
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
    const refWidth = isLandscape ? localReferenceRealSize.height : localReferenceRealSize.width;
    const refHeight = isLandscape ? localReferenceRealSize.width : localReferenceRealSize.height;
    const diagonalCm = Math.sqrt(refWidth * refWidth + refHeight * refHeight);
    const pixelPerCmUnique = diagonal / diagonalCm;
    
    console.log(`   🎯 pixelPerCm (diagonale): ${pixelPerCmUnique.toFixed(2)} px/cm`);
    
    setPixelPerCmX(pixelPerCmUnique);
    setPixelPerCmY(pixelPerCmUnique);
    setPixelPerCm(pixelPerCmUnique);
    setIsManuallyCalibrated(true);
    
  }, [localReferenceRealSize, imageDimensions, debugMode]);

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
      console.log(`   📐 Référence (configurée) (${localReferenceRealSize.width}×${localReferenceRealSize.height}cm) (${avgWidth.toFixed(0)}x${avgHeight.toFixed(0)}px)`);
      
      // Si perspective suffisante (>5px), calculer l'homographie
      if (maxPerspectiveDeform > 5) {
        const dstPoints = getReferenceDestinationPointsMm();
        console.log('   📐 Points destination référence:', dstPoints.map(p => `(${p[0]}, ${p[1]})`).join(', '));
        
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
    
  }, [image, referenceDetected, imageDimensions.width, imageDimensions.height, adjustableRefBox, snapRectangleToEdges, recalculateCalibration, fusedCorners, homographyReady, localReferenceRealSize, debugMode, workflowStep]);


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
    
    // 🎯 DÉTECTION V10 (unique)
    let refWidth: number;
    let refHeight: number;
    
    // ✅ Métré A4 V10 uniquement
    refWidth = localReferenceRealSize?.width || 13.0;
    refHeight = localReferenceRealSize?.height || 20.5;

    // Ajuster l'orientation si l'utilisateur dessine le rectangle en paysage
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
    
    // 🎯 Calculer les facteurs X/Y basés sur les VRAIES longueurs des côtés
    const newPixelPerCmX = avgWidthPx / refWidth;
    const newPixelPerCmY = avgHeightPx / refHeight;
    // 🔧 CORRECTION ASYMÉTRIE: Utiliser newPixelPerCmX pour les deux (Y peut être distordu)
    const newPixelPerCmMoyen = newPixelPerCmX;  // ✅ UTILISER X POUR LES DEUX
    
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
    
    // Points destination (mm) basés sur la référence réelle
    const dstPoints = getReferenceDestinationPointsMm();
    
    // Calculer la déformation perspective
    const topEdgeDy = Math.abs(referenceCorners.topRight.y - referenceCorners.topLeft.y);
    const bottomEdgeDy = Math.abs(referenceCorners.bottomRight.y - referenceCorners.bottomLeft.y);
    const leftEdgeDx = Math.abs(referenceCorners.bottomLeft.x - referenceCorners.topLeft.x);
    const rightEdgeDx = Math.abs(referenceCorners.bottomRight.x - referenceCorners.topRight.x);
    const maxPerspectiveDeform = Math.max(topEdgeDy, bottomEdgeDy, leftEdgeDx, rightEdgeDx);
    
    console.log('📐 [Canvas] Analyse PERSPECTIVE référence:');
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
      
      // 🔬 DIAGNOSTIC: Vérifier que l'homographie transforme correctement le marqueur
      // Les 4 coins du marqueur (srcPoints) devraient devenir un carré parfait (dstPoints)
      const transformedCorners = srcPoints.map(p => applyHomography(homography.matrix, p));
      const tTopWidth = Math.hypot(transformedCorners[1][0] - transformedCorners[0][0], 
                                   transformedCorners[1][1] - transformedCorners[0][1]);
      const tBottomWidth = Math.hypot(transformedCorners[2][0] - transformedCorners[3][0], 
                                      transformedCorners[2][1] - transformedCorners[3][1]);
      const tLeftHeight = Math.hypot(transformedCorners[3][0] - transformedCorners[0][0], 
                                     transformedCorners[3][1] - transformedCorners[0][1]);
      const tRightHeight = Math.hypot(transformedCorners[2][0] - transformedCorners[1][0], 
                                      transformedCorners[2][1] - transformedCorners[1][1]);
      
      // 🎯 Dimensions attendues selon la référence réelle
      const markerWidthMM = Math.abs(dstPoints[1][0] - dstPoints[0][0]);
      const markerHeightMM = Math.abs(dstPoints[3][1] - dstPoints[0][1]);
      
      console.log(`🔬 [DIAGNOSTIC HOMOGRAPHIE] Vérification transformation marqueur:`);
      console.log(`   Coins originaux (px): ${srcPoints.map(p => `(${p[0].toFixed(1)},${p[1].toFixed(1)})`).join(' ')}`);
      console.log(`   Coins transformés (mm): ${transformedCorners.map(p => `(${p[0].toFixed(1)},${p[1].toFixed(1)})`).join(' ')}`);
      console.log(`   Largeur haut: ${tTopWidth.toFixed(2)}mm (attendu: ${markerWidthMM}mm, écart: ${((tTopWidth/markerWidthMM - 1) * 100).toFixed(2)}%)`);
      console.log(`   Largeur bas: ${tBottomWidth.toFixed(2)}mm (attendu: ${markerWidthMM}mm, écart: ${((tBottomWidth/markerWidthMM - 1) * 100).toFixed(2)}%)`);
      console.log(`   Hauteur gauche: ${tLeftHeight.toFixed(2)}mm (attendu: ${markerHeightMM}mm, écart: ${((tLeftHeight/markerHeightMM - 1) * 100).toFixed(2)}%)`);
      console.log(`   Hauteur droite: ${tRightHeight.toFixed(2)}mm (attendu: ${markerHeightMM}mm, écart: ${((tRightHeight/markerHeightMM - 1) * 100).toFixed(2)}%)`);
      
      // Vérifier l'asymétrie intrinsèque du marqueur (ratio X/Y en pixels)
      const markerRatioXY = avgWidthPx / avgHeightPx;
      const markerAsymmetry = Math.abs(markerRatioXY - 1.0);
      console.log(`   📊 Asymétrie marqueur: ratio=${markerRatioXY.toFixed(4)} (écart de ${(markerAsymmetry * 100).toFixed(2)}% vs carré parfait)`);
      
      // Si l'asymétrie est significative (> 2%), c'est probablement de la distorsion de l'objectif
      if (markerAsymmetry > 0.02) {
        console.log(`   ⚠️ ALERTE: Asymétrie > 2% détectée ! Probable distorsion objectif.`);
        console.log(`   💡 Cette asymétrie sera amplifiée pour les objets plus grands que le marqueur.`);
      }
      
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
    
  }, [referenceCorners, quadrilateralMode, imageDimensions.width, imageDimensions.height, localReferenceRealSize, onReferenceAdjusted]);

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
      // 🔧 CORRECTION ASYMÉTRIE: Utiliser adjustedPixelPerCmX pour les deux
      const adjustedPixelPerCm = adjustedPixelPerCmX;  // ✅ UTILISER X POUR LES DEUX
      
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
  }, [image, initialPoints, imageDimensions.width, imageDimensions.height, hasAppliedInitialPoints, lastScaledDimensions]);

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
    _poly_surface_cm2?: number;
    _poly_perimetre_cm?: number;
  } => {
    if (points.length < 2) return {};

    // Utiliser un ordre cohérent pour tous les calculs (évite les croisements)
    const polygonPoints = orderedPoints.length ? orderedPoints : points;
    
    // 🔧 CRITICAL: Vérifier que les points sont dans des dimensions cohérentes avec l'image
    const maxPointX = Math.max(...polygonPoints.map(p => p.x));
    const maxPointY = Math.max(...polygonPoints.map(p => p.y));
    
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
    // 🔧 DEBUG: Forcer sans homographie pour voir l'échelle simple
    // 🚀 CHANGEMENT CRITIQUE: Désactiver FORMULE 1 (frontend) et utiliser UNIQUEMENT backend
    const FORCE_NO_HOMOGRAPHY = true;  // ← 🔴 FORCÉ ACTIF: Désactiver FORMULE 1 frontend, utiliser UNIQUEMENT backend RANSAC
    const useHomographyCalc = !FORCE_NO_HOMOGRAPHY && useHomography && homographyResult && homographyResult.quality > 50;
    
    console.log(`📏 [Canvas] === CALCUL MESURES ===`);
    if (FORCE_NO_HOMOGRAPHY) {
      console.log(`   🚀 [MODE BACKEND ONLY] FORMULE 1 DÉSACTIVÉE - Utilisation EXCLUSIVE du backend RANSAC+Homographie fusionnées`);
    }
    const modeString = useHomographyCalc ? '🎯 HOMOGRAPHIE (précis)' : `🚀 BACKEND RANSAC+HOMOGRAPHIE FUSIONNÉS`;
    console.log(`   Mode: ${modeString}`);
    if (homographyResult && !FORCE_NO_HOMOGRAPHY) {
      console.log(`   Qualité homographie: ${homographyResult.quality.toFixed(1)}%, Incertitude: ±${homographyResult.uncertainty.toFixed(1)}%`);
    }
    console.log(`   Points: ${polygonPoints.map(p => `${p.label || p.id}(${p.x.toFixed(1)}, ${p.y.toFixed(1)})`).join(', ')}`);

    // Base d'échelle locale (calibration A4)
    const effectivePixelPerCmAvg = pixelPerCmX && pixelPerCmY
      ? (pixelPerCmX + pixelPerCmY) / 2
      : pixelPerCm;

    // Pour 4 points ou plus, trouver les coins à partir des 4 premiers (workflow actuel)
    if (polygonPoints.length >= 4) {
      const allX = polygonPoints.slice(0, 4).map(p => p.x);
      const allY = polygonPoints.slice(0, 4).map(p => p.y);
      
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
        const sortedByY = [...polygonPoints.slice(0, 4)].sort((a, b) => a.y - b.y);
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
        
        // ════════════════════════════════════════════════════════════════════════════════════════════════════
        // ❌ FORMULE 1 DÉSACTIVÉE - ATTENDRE LE BACKEND
        // ════════════════════════════════════════════════════════════════════════════════════════════════════
        // La source UNIQUE de vérité est maintenant le backend:
        // - RANSAC 230 points + Homographie fusionnées
        // - Correction facteurs appliqués côté backend UNIQUEMENT
        // ════════════════════════════════════════════════════════════════════════════════════════════════════
        
        console.log(`\n   ❌ [FORMULE 1] DÉSACTIVÉE - Pas de calculs frontend`);
        console.log(`   🔄 Le backend RANSAC+Homographie fusionnés est la source UNIQUE`);
        
        // Analyse de cohérence uniquement pour INFO (pas de modification des mesures)
        if (referenceCorners && imageDimensions.width > 0 && imageDimensions.height > 0) {
          const markerTopWidth = Math.hypot(
            referenceCorners.topRight.x - referenceCorners.topLeft.x,
            referenceCorners.topRight.y - referenceCorners.topLeft.y
          );
          const markerBottomWidth = Math.hypot(
            referenceCorners.bottomRight.x - referenceCorners.bottomLeft.x,
            referenceCorners.bottomRight.y - referenceCorners.bottomLeft.y
          );
          const markerLeftHeight = Math.hypot(
            referenceCorners.bottomLeft.x - referenceCorners.topLeft.x,
            referenceCorners.bottomLeft.y - referenceCorners.topLeft.y
          );
          const markerRightHeight = Math.hypot(
            referenceCorners.bottomRight.x - referenceCorners.topRight.x,
            referenceCorners.bottomRight.y - referenceCorners.topRight.y
          );
          
          const avgMarkerWidth = (markerTopWidth + markerBottomWidth) / 2;
          const avgMarkerHeight = (markerLeftHeight + markerRightHeight) / 2;
          const markerPixelRatio = avgMarkerWidth / avgMarkerHeight; // Devrait être 1.0 pour un carré
          
          // 2. Écart entre largeur haut et bas (indicateur de perspective non corrigée)
          const widthVariation = Math.abs(widthTop.distance - widthBottom.distance) / avgWidthMM;
          const heightVariation = Math.abs(heightLeft.distance - heightRight.distance) / avgHeightMM;
          
          console.log(`   📊 [ANALYSE COHÉRENCE] Données réelles du marqueur:`);
          console.log(`      Dimensions px: ${avgMarkerWidth.toFixed(1)} × ${avgMarkerHeight.toFixed(1)} px`);
          console.log(`      Ratio W/H: ${markerPixelRatio.toFixed(4)} (attendu: 1.0, écart: ${((markerPixelRatio - 1) * 100).toFixed(2)}%)`);
          console.log(`   📊 [ANALYSE COHÉRENCE] Variation mesures opposées:`);
          console.log(`      Largeur (haut vs bas): ${(widthVariation * 100).toFixed(2)}%`);
          console.log(`      Hauteur (gauche vs droite): ${(heightVariation * 100).toFixed(2)}%`);
          
          // 🏎️ FORMULE 1: Alertes INFORMATIVES uniquement (pas de corrections)
          if (widthVariation > 0.05 || heightVariation > 0.05) {
            console.log(`   ⚠️ INFO: Variation > 5% entre côtés opposés (mesure directe conservée)`);
          }
          
          const markerAsymmetry = Math.abs(markerPixelRatio - 1.0);
          if (markerAsymmetry > 0.03) {
            console.log(`   ⚠️ INFO: Asymétrie marqueur ${(markerAsymmetry * 100).toFixed(1)}% détectée (mesure directe conservée)`);
          }
        }
        
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
      
      // Surface = largeur_cm × hauteur_cm
      const coords: Array<[number, number]> = polygonPoints.slice(0, 4).map(p => [p.x, p.y]);
      const areaCm2 = results.largeur_cm * results.hauteur_cm;
      results.surface_brute_cm2 = areaCm2;
      results.surface_brute_m2 = areaCm2 / 10000;

      // Zones d'exclusion (utiliser pixelPerCm moyen pour compatibilité)
      const effectivePixelPerCm = effectivePixelPerCmAvg;
      let excludedArea = 0;
      for (const zone of exclusionZones) {
        // Approximation: zones converties avec échelle moyenne
        excludedArea += calculatePolygonArea(zone.points, effectivePixelPerCm);
      }
      results.surface_nette_cm2 = areaCm2 - excludedArea;
      results.surface_nette_m2 = (areaCm2 - excludedArea) / 10000;

      // Perimeter sur les 4 coins actuels
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

    // 🔄 Si plus de 4 points (ou polygone libre), recalculer surface/périmètre sur TOUT le polygone
    if (polygonPoints.length >= 3) {
      const polyCoords: Array<[number, number]> = polygonPoints.map(p => [p.x, p.y]);

      // BBox du polygone (utile uniquement si backend L/H absent)
      const minPx = Math.min(...polygonPoints.map(p => p.x));
      const maxPx = Math.max(...polygonPoints.map(p => p.x));
      const minPy = Math.min(...polygonPoints.map(p => p.y));
      const maxPy = Math.max(...polygonPoints.map(p => p.y));
      const widthPx = maxPx - minPx;
      const heightPx = maxPy - minPy;

      // Échelle: ne pas la ré-inférer depuis la bbox quand le backend fournit L/H
      const inferredPixelPerCmX = pixelPerCmX || effectivePixelPerCmAvg;
      const inferredPixelPerCmY = pixelPerCmY || effectivePixelPerCmAvg;
      const effectivePixelPerCm = (inferredPixelPerCmX + inferredPixelPerCmY) / 2;

      // Largeur/hauteur: prioriser backend si présent, sinon bbox/echelle locale
      results.largeur_cm = backendMeasurements?.largeur_cm ?? (widthPx / inferredPixelPerCmX);
      results.hauteur_cm = backendMeasurements?.hauteur_cm ?? (heightPx / inferredPixelPerCmY);
      results.incertitude_largeur_cm = results.largeur_cm ? results.largeur_cm * 0.05 : undefined;
      results.incertitude_hauteur_cm = results.hauteur_cm ? results.hauteur_cm * 0.05 : undefined;

      // Aire anisotrope: utiliser px/cm séparés X/Y pour éviter l'erreur d'échelle
      let areaPx = 0;
      for (let i = 0; i < polyCoords.length; i++) {
        const j = (i + 1) % polyCoords.length;
        areaPx += polyCoords[i][0] * polyCoords[j][1];
        areaPx -= polyCoords[j][0] * polyCoords[i][1];
      }
      areaPx = Math.abs(areaPx) / 2;
      const areaCm2 = areaPx / (inferredPixelPerCmX * inferredPixelPerCmY);
      results.surface_brute_cm2 = areaCm2;
      results.surface_brute_m2 = areaCm2 / 10000;
      results._poly_surface_cm2 = areaCm2;

      let excludedArea = 0;
      for (const zone of exclusionZones) {
        excludedArea += calculatePolygonArea(zone.points, effectivePixelPerCm);
      }
      results.surface_nette_cm2 = areaCm2 - excludedArea;
      results.surface_nette_m2 = (areaCm2 - excludedArea) / 10000;

      // Périmètre anisotrope: convertir séparément en cm sur X/Y avant hypot
      let perimeter = 0;
      for (let i = 0; i < polyCoords.length; i++) {
        const j = (i + 1) % polyCoords.length;
        const dxCm = (polyCoords[j][0] - polyCoords[i][0]) / inferredPixelPerCmX;
        const dyCm = (polyCoords[j][1] - polyCoords[i][1]) / inferredPixelPerCmY;
        perimeter += Math.hypot(dxCm, dyCm);
      }
      results.perimetre_cm = perimeter;
      results.perimetre_m = perimeter / 100;
      results._poly_perimetre_cm = perimeter;
    }

    return results;
  }, [points, orderedPoints, exclusionZones, pixelPerCm, pixelPerCmX, pixelPerCmY, imageDimensions, useHomography, homographyResult, referenceCorners, backendMeasurements]);

  // Notify parent of measurement changes
  // 🎯 PRIORITÉ ABSOLUE: UNIQUEMENT les mesures BACKEND (RANSAC + FORMULE 1 fusionnées)
  useEffect(() => {
    // 🚀 MODE BACKEND ONLY: Attendre les mesures du backend
    if (backendMeasurements && backendMeasurements.largeur_cm > 0) {
      // ✅ UTILISER LE BACKEND pour L/H mais garder les surfaces/périmètres réels du polygone si dispo
      const backendResults: MeasurementResults = {
        ...measurements,
        largeur_cm: backendMeasurements.largeur_cm,
        hauteur_cm: backendMeasurements.hauteur_cm,
        incertitude_largeur_cm: backendMeasurements.incertitude_largeur_cm,
        incertitude_hauteur_cm: backendMeasurements.incertitude_hauteur_cm,
        // Surface: préférer la surface polygone si calculée, sinon rectangle backend
        surface_brute_cm2: measurements._poly_surface_cm2 || (backendMeasurements.largeur_cm * backendMeasurements.hauteur_cm),
        surface_brute_m2: measurements._poly_surface_cm2 ? measurements._poly_surface_cm2 / 10000 : (backendMeasurements.largeur_cm * backendMeasurements.hauteur_cm) / 10000,
        surface_nette_cm2: measurements.surface_nette_cm2,
        surface_nette_m2: measurements.surface_nette_m2,
        perimetre_cm: measurements._poly_perimetre_cm || 2 * (backendMeasurements.largeur_cm + backendMeasurements.hauteur_cm),
        perimetre_m: measurements._poly_perimetre_cm ? measurements._poly_perimetre_cm / 100 : 2 * (backendMeasurements.largeur_cm + backendMeasurements.hauteur_cm) / 100,
      };
      
      console.log('🔔 [Canvas] ENVOI mesures BACKEND + SURFACE POLYGONE au parent:');
      console.log(`   ✅ Largeur: ${backendResults.largeur_cm?.toFixed(2)} cm`);
      console.log(`   ✅ Hauteur: ${backendResults.hauteur_cm?.toFixed(2)} cm`);
      if (backendResults.surface_brute_m2 !== undefined) {
        console.log(`   🟦 Surface: ${backendResults.surface_brute_m2.toFixed(3)} m²`);
      }
      if (backendResults.perimetre_cm !== undefined) {
        console.log(`   📏 Périmètre: ${backendResults.perimetre_cm.toFixed(1)} cm`);
      }
      console.log(`   📊 Méthode: ${backendMeasurements.method}`);
      
      onMeasurementsChange?.(backendResults);
    } else if (measurements.largeur_cm && measurements.largeur_cm > 0) {
      // Fallback temporaire pendant le chargement
      console.log('🔔 [Canvas] ENVOI mesures locales (en attente du backend):');
      console.log(`   ⏳ Largeur: ${measurements.largeur_cm?.toFixed(2)} cm`);
      console.log(`   ⏳ Hauteur: ${measurements.hauteur_cm?.toFixed(2)} cm`);
      onMeasurementsChange?.(measurements);
    }
  }, [backendMeasurements, measurements, onMeasurementsChange]);

  // ============================================================================
  // 🔄 TRIGGER INITIAL - Déclencher le calcul quand 4 points sont placés
  // ============================================================================
  const prevPointsLengthRef = useRef(0);
  useEffect(() => {
    // Si on vient de passer de <4 points à ≥4 points, déclencher un calcul
    if (prevPointsLengthRef.current < 4 && points.length >= 4 && fusedCorners && !isDraggingPoint) {
      console.log('🎯 [Canvas] 4 points atteints, déclenchement calcul initial');
      setComputeTrigger(prev => prev + 1);
    }
    prevPointsLengthRef.current = points.length;
  }, [points.length, fusedCorners, isDraggingPoint]);

  // ============================================================================
  // 🎯 APPEL API BACKEND POUR CALCUL CENTRALISÉ
  // ============================================================================
  // Déclenché UNIQUEMENT quand:
  // - computeTrigger change (fin de drag d'un point)
  // - OU au montage initial si 4 points sont déjà placés
  // NE SE DÉCLENCHE PAS pendant le drag pour éviter les appels multiples
  useEffect(() => {
    // Conditions pour appeler le backend:
    // 1. 4 points placés
    // 2. Données fusedCorners disponibles
    // 3. Image chargée avec dimensions connues
    // 4. API disponible
    // 5. Pas en train de drag un point
    // 6. Pas déjà en cours de calcul (vérifié via ref pour éviter les race conditions)
    if (points.length < 4 || !fusedCorners || !image || !imageDimensions.width) {
      return;
    }
    
    // 🔒 NE PAS calculer si un point est en cours de drag
    if (isDraggingPoint) {
      console.log('🖐️ [Canvas] Point en cours de drag, calcul différé');
      return;
    }
    
    // 🔒 Vérifier si un calcul est déjà en cours via REF (plus fiable que state)
    if (isComputingRef.current) {
      console.log('⏳ [Canvas] Calcul déjà en cours, ignoré');
      return;
    }
    
    const apiInstance = api || authenticatedApi;
    if (!apiInstance) {
      console.warn('⚠️ [Canvas] Pas d\'API disponible pour le calcul backend');
      return;
    }
    
    // 🔒 Créer une signature des données pour éviter de recalculer si rien n'a changé
    const primaryPoints = points.filter(p => p.type === 'primary').slice(0, 4);
    if (primaryPoints.length < 4) {
      return;
    }

    const sortedByY = [...primaryPoints].sort((a, b) => a.y - b.y);
    const topPts = sortedByY.slice(0, 2).sort((a, b) => a.x - b.x);
    const bottomPts = sortedByY.slice(2, 4).sort((a, b) => a.x - b.x);

    const topLeft = topPts[0];
    const topRight = topPts[1];
    const bottomLeft = bottomPts[0];
    const bottomRight = bottomPts[1];

    const objectPoints = [topLeft, topRight, bottomRight, bottomLeft].map(p => ({
      x: Math.round(p.x),
      y: Math.round(p.y)
    }));
    const dataSignature = JSON.stringify({
      corners: fusedCorners,
      points: objectPoints
    });
    
    if (dataSignature === lastComputedDataRef.current) {
      console.log('✅ [Canvas] Données identiques, pas de recalcul nécessaire');
      return;
    }
    
    // Pas de debounce ici car le trigger ne se déclenche qu'à la fin du drag
    const compute = async () => {
      isComputingRef.current = true;
      setIsComputingBackend(true);
      
      try {
        console.log('\n' + '='.repeat(60));
        console.log('🎯 [Canvas] APPEL BACKEND compute-dimensions-simple (trigger:', computeTrigger, ')');
        console.log('='.repeat(60));
        
        // Scale du canvas (points sont en coordonnées canvas, il faut les convertir en pixels image)
        const canvasScale = imageDimensions.scale || 1;
        
        const imageWidth = image.naturalWidth || image.width;
        const imageHeight = image.naturalHeight || image.height;

        console.log('📤 Envoi au backend:');
        console.log(`   fusedCorners (% image): TL=(${fusedCorners.topLeft.x.toFixed(1)}%, ${fusedCorners.topLeft.y.toFixed(1)}%)`);
        console.log(`   objectPoints (px canvas): ${objectPoints.map(p => `(${p.x}, ${p.y})`).join(', ')}`);
        console.log(`   imageSize: ${imageWidth}×${imageHeight}, canvasScale: ${canvasScale}`);
        console.log('   🎯 Métré A4 V10: 13×20.5cm (centres 6 tags)');

        const response = await apiInstance.post('/api/measurement-reference/compute-dimensions-simple', {
          fusedCorners,
          objectPoints,
          imageWidth: imageWidth,
          imageHeight: imageHeight,
          canvasScale,
          detectionQuality: 80
        });
        
        // 🔒 Marquer comme calculé avec cette signature
        lastComputedDataRef.current = dataSignature;
        
        // Les deux endpoints retournent des structures légèrement différentes
        let largeur_cm, hauteur_cm, incertitude_largeur_cm, incertitude_hauteur_cm, confidence, method;
        
        if (response?.success && response.largeur_cm !== undefined) {
          largeur_cm = response.largeur_cm;
          hauteur_cm = response.hauteur_cm;
          incertitude_largeur_cm = response.incertitude_largeur_cm || 0;
          incertitude_hauteur_cm = response.incertitude_hauteur_cm || 0;
          confidence = response.confidence || 0.8;
          method = response.method || 'homography';
          
          console.log('✅ [Canvas] BACKEND RÉPONSE (MÉTRÉ A4 V10):');
          console.log(`   📏 Largeur: ${largeur_cm.toFixed(2)} cm (±${incertitude_largeur_cm.toFixed(2)} cm)`);
          console.log(`   📏 Hauteur: ${hauteur_cm.toFixed(2)} cm (±${incertitude_hauteur_cm.toFixed(2)} cm)`);
          console.log(`   📊 Méthode: ${method}, Confiance: ${(confidence * 100).toFixed(0)}%`);

          if (response.warnings?.length > 0) {
            console.log(`   ⚠️ Warnings: ${response.warnings.join(', ')}`);
          }

          setBackendMeasurements({
            largeur_cm,
            hauteur_cm,
            incertitude_largeur_cm,
            incertitude_hauteur_cm,
            confidence,
            method,
            warnings: response.warnings || [],
            debug: response.debug,
            depth: response.depth
          });
        } else {
          console.warn('⚠️ [Canvas] Backend n\'a pas retourné de mesures valides:', response);
          setBackendMeasurements(null);
        }
        
      } catch (error) {
        console.error('❌ [Canvas] Erreur appel backend:', error);
        setBackendMeasurements(null);
      } finally {
        isComputingRef.current = false;
        setIsComputingBackend(false);
      }
    };
    
    compute();
  // IMPORTANT: Déclenché par computeTrigger (fin de drag) et fusedCorners (nouveau marqueur)
  // Ne PAS inclure points directement sinon ça se déclenche pendant le drag!
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computeTrigger, fusedCorners, image, imageDimensions.width, api, authenticatedApi, isDraggingPoint]);

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

  const _movePoint = useCallback((pointId: string, newX: number, newY: number) => {
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
    setPointPlacementState(null);
    console.log('🔍 [Canvas] Zoom réinitialisé');
  }, []);

  // 🔒 VERROUILLAGE: Basculer le verrouillage d'un point
  const togglePointLock = useCallback((pointId: string) => {
    setLockedPoints(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pointId)) {
        newSet.delete(pointId);
        message.info({ content: '🔓 Point déverrouillé', duration: 1.5 });
      } else {
        newSet.add(pointId);
        message.success({ content: '🔒 Point verrouillé', duration: 1.5 });
      }
      return newSet;
    });
  }, []);

  // 🆕 NOUVEAU WORKFLOW SIMPLIFIÉ:
  // Clic 1 sur point → zoom sur le coin (état 'zoomed')
  // Clic 2 ailleurs → place le point à cette position (état 'placed')  
  // Clic 3 sur le même point → dézoom et désélectionne (confirme le placement)
  
  // Sélectionner un point pour repositionnement (zoom dessus)
  const selectPointForPlacement = useCallback((pointId: string, pointX: number, pointY: number) => {
    // Si le point est verrouillé, proposer de le déverrouiller
    if (lockedPoints.has(pointId)) {
      togglePointLock(pointId);
      return;
    }
    
    // Si on clique sur le même point qu'on est en train d'éditer → DÉZOOM et confirme
    if (pointBeingPlaced === pointId) {
      console.log(`✅ [Canvas] Point ${pointId} confirmé, retour vue complète`);
      message.success({ content: '✅ Position confirmée !', duration: 1.5 });
      setComputeTrigger(prev => prev + 1); // 🔄 Déclenche le recalcul
      setPointBeingPlaced(null);
      setPointPlacementState(null);
      setSelectedPointId(null);
      resetZoom();
      return;
    }
    
    // Si on était sur un autre point, d'abord reset
    if (pointBeingPlaced && pointBeingPlaced !== pointId) {
      setPointBeingPlaced(null);
      setPointPlacementState(null);
      resetZoom();
    }
    
    console.log(`🎯 [Canvas] Point ${pointId} sélectionné pour repositionnement`);
    setPointBeingPlaced(pointId);
    setPointPlacementState('zoomed');
    setSelectedPointId(pointId);
    
    // Zoomer x3 centré sur le point pour précision
    zoomToPoint(pointX, pointY, 3);
    message.info({ content: '🔍 Zoomé - Cliquez ailleurs pour placer, sur le coin pour confirmer', duration: 2.5 });
  }, [zoomToPoint, lockedPoints, togglePointLock, pointBeingPlaced, resetZoom]);

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
    setComputeTrigger(prev => prev + 1); // 🔄 Déclenche le recalcul
    
    if (snapped.snapped) {
      message.success({ content: '🎯 Point ajusté sur le bord !', duration: 1 });
    } else {
      message.success({ content: '📍 Point placé !', duration: 1 });
    }
    
    // Passer en état 'placed' - le prochain clic sur ce point confirmera et dézoommera
    setPointPlacementState('placed');
    
    // Recentrer le zoom sur la nouvelle position du point
    zoomToPoint(finalX, finalY, 3);
    
    return true;
  }, [pointBeingPlaced, points, snapPointToEdge, saveToHistory, exclusionZones, zoomToPoint]);

  // Annuler le placement en cours (clic sur fond)
  const cancelPointPlacement = useCallback(() => {
    if (pointBeingPlaced) {
      console.log('❌ [Canvas] Placement annulé, retour vue complète');
      setPointBeingPlaced(null);
      setPointPlacementState(null);
      setSelectedPointId(null);
      resetZoom();
    }
  }, [pointBeingPlaced, resetZoom]);

  // 🆕 Handlers de drag simplifiés (pour compatibilité, mais le nouveau mode utilise les clics)
  const _handlePointDragMove = useCallback((pointId: string, e: KonvaEventObject<DragEvent>) => {
    // 🔒 Ne pas permettre le drag des points verrouillés
    if (lockedPoints.has(pointId)) {
      const point = points.find(p => p.id === pointId);
      if (point) {
        e.target.x(point.x);
        e.target.y(point.y);
      }
      return;
    }
    
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
  }, [points, snapPointToEdge, lockedPoints]);

  const _handlePointDragEnd = useCallback((pointId: string, e: KonvaEventObject<DragEvent>) => {
    // 🔒 Ne pas sauvegarder si point verrouillé
    if (lockedPoints.has(pointId)) {
      return;
    }
    
    const rawX = e.target.x();
    const rawY = e.target.y();
    
    const snapped = snapPointToEdge(rawX, rawY, 25);
    
    const finalPoints = points.map(p => p.id === pointId ? { ...p, x: snapped.x, y: snapped.y } : p);
    setPoints(finalPoints);
    saveToHistory(finalPoints, exclusionZones);
    
    if (snapped.snapped) {
      message.success({ content: '🎯 Point ajusté sur le bord !', duration: 1 });
    }
  }, [points, exclusionZones, saveToHistory, snapPointToEdge, lockedPoints]);

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
  const detectCornersInZone = useCallback(async (
    zone: { x: number; y: number; width: number; height: number },
    targetType: 'reference' | 'measurement'
  ) => {
    if (!api || !imageBase64) {
      console.warn('❌ API ou imageBase64 non disponible pour la détection de coins');
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
      
      // � APPEL API: Détecter les coins automatiquement avec edge detection
      if (!imageBase64) {
        console.warn('❌ Pas d\'imageBase64 pour détection coins');
        return null;
      }
      
      console.log('⚠️ [Canvas] Détection automatique des coins désactivée (V10 only)');
      return null;
      
    } catch (error) {
      console.error('❌ [Canvas] Erreur détection coins:', error);
      message.error('Erreur lors de la détection IA des coins');
      return null;
    } finally {
      setIsDetectingCorners(false);
    }
  }, [api, imageBase64, mimeType, referenceConfig, measurementObjectConfig]);

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
          // L'API peut retourner un Array [TL, TR, BR, BL]
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
          // Étape 1: Référence détectée → passer à l'étape 2
          const refType = `${localReferenceRealSize.width}×${localReferenceRealSize.height}cm`;
          console.log(`📐 [Canvas] Référence (${refType}) détectée, coins:`, cornersPixels);
          console.log('📐 [Canvas] Confiance:', result.confidence, '% - Objet trouvé:', result.objectFound);
          setReferenceCorners(cornersPixels);
          setQuadrilateralMode(true);
          message.success(`✅ Référence détectée (confiance: ${Math.round(result.confidence || 0)}%)`);
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
          
          // 🔒 AUTO-VERROUS: Si détection IA réussie (confiance > 70%), verrouiller automatiquement les coins
          if ((result.confidence || 0) > 70) {
            setLockedPoints(new Set(['corner_tl', 'corner_tr', 'corner_br', 'corner_bl']));
            message.success(`✅ Coins détectés et verrouillés (confiance: ${Math.round(result.confidence || 0)}%). Cliquez sur 🔒 pour ajuster si nécessaire.`);
          } else {
            message.success(`✅ Objet détecté (confiance: ${Math.round(result.confidence || 0)}%). Glissez les points pour ajuster !`);
          }
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
  }, [drawingZone, selectedTool, exclusionZones, points, colors, saveToHistory, workflowStep, imageDimensions, detectCornersInZone, isProcessingZone, api, imageBase64]);

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

  const _snapPointsWithAI = useCallback(async (target: 'reference' | 'measurement') => {
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
      // 🎯 Inclure les corners de référence pour pouvoir les redessiner
      referenceCorners: referenceCorners || undefined,
      // 📐 Dimensions de l'image pour convertir % → pixels plus tard
      imageDimensions: imageDimensions
    };

    console.log('✅ [Canvas] Validation avec image annotée:', annotatedImageBase64 ? 'OUI' : 'NON');
    console.log('   📍 referenceCorners:', referenceCorners ? 'OUI' : 'NON');
    console.log('   📐 imageDimensions:', imageDimensions);
    onValidate?.(annotations);
  }, [imageUrl, calibration, pixelPerCm, points, exclusionZones, measurements, onValidate, exportAnnotatedImage, referenceCorners, imageDimensions]);

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
        data-disable-tbl-swipe="true"
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
                
                {/* Référence Métré A4 V10 - Quadrilatère avec 4 coins draggables */}
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
                {points.map((point, index) => {
                  const isLocked = lockedPoints.has(point.id);
                  const isBeingPlaced = pointBeingPlaced === point.id;
                  const isPlaced = isBeingPlaced && pointPlacementState === 'placed';
                  
                  return (
                  <Group key={point.id}>
                    {/* Hitbox draggable avec snap aux contours */}
                    <Circle
                      x={point.x}
                      y={point.y}
                      radius={30}
                      fill={isLocked ? "rgba(82, 196, 26, 0.3)" : // Vert pour verrouillé
                            isPlaced ? "rgba(250, 173, 20, 0.5)" : // Jaune pour placé (en attente verrouillage)
                            selectedPointId === point.id ? "rgba(24, 144, 255, 0.5)" : "rgba(24, 144, 255, 0.2)"}
                      stroke={isLocked ? "#52c41a" : 
                              isPlaced ? "#faad14" :
                              selectedPointId === point.id ? "#1890ff" : "transparent"}
                      strokeWidth={isLocked ? 3 : 2}
                      draggable={!readOnly && !isLocked}
                      onDragStart={() => {
                        if (!isLocked) setIsDraggingPoint(true);
                      }}
                      onDragMove={(e) => {
                        e.cancelBubble = true;
                        if (isLocked) {
                          e.target.x(point.x);
                          e.target.y(point.y);
                          return;
                        }
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
                      onDragEnd={() => {
                        if (!isLocked) {
                          saveToHistory(points, exclusionZones);
                          setIsDraggingPoint(false);
                          setComputeTrigger(prev => prev + 1); // 🔄 Déclenche le recalcul
                        }
                      }}
                      onClick={(e) => {
                        e.cancelBubble = true;
                        // Utiliser le nouveau workflow: clic → zoom → place → verrouille
                        selectPointForPlacement(point.id, point.x, point.y);
                      }}
                      onTap={(e) => {
                        e.cancelBubble = true;
                        // Utiliser le nouveau workflow: clic → zoom → place → verrouille
                        selectPointForPlacement(point.id, point.x, point.y);
                      }}
                    />
                    {/* Point visuel - avec indicateur de verrouillage */}
                    <Rect
                      x={point.x - 6}
                      y={point.y - 6}
                      width={12}
                      height={12}
                      fill={isLocked ? "#52c41a" : 
                            isPlaced ? "#faad14" :
                            selectedPointId === point.id ? "#faad14" : point.color}
                      stroke="#fff"
                      strokeWidth={2}
                      rotation={45}
                      listening={false}
                    />
                    {/* Icône cadenas pour points verrouillés */}
                    {isLocked && (
                      <KonvaText 
                        x={point.x - 5} 
                        y={point.y - 5} 
                        text="🔒" 
                        fontSize={10} 
                        listening={false} 
                      />
                    )}
                    <KonvaText x={point.x + 12} y={point.y - 8} text={point.label || String(index + 1)} fontSize={14} fill={isLocked ? "#52c41a" : selectedPointId === point.id ? "#faad14" : point.color} fontStyle="bold" stroke="#fff" strokeWidth={0.5} listening={false} />
                  </Group>
                  );
                })}
                
                {/* Lignes entre les points */}
                {(() => {
                  const polygonPoints = orderedPoints;
                  if (polygonPoints.length < 2) return null;

                  return (
                    <Line
                      points={polygonPoints.flatMap(p => [p.x, p.y])}
                      stroke={colors.measurementLine}
                      strokeWidth={2}
                      closed={polygonPoints.length >= 3}
                      listening={false}
                    />
                  );
                })()}
              </Layer>
            </Stage>
          </div>
        </div>
        
        {/* 📱 UI FLOTTANTE MOBILE */}
        {!readOnly && (
          <>
            {/* 📏 BANDE NOIRE DU BAS - Dimensions en temps réel */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 10001,
                background: 'rgba(0, 0, 0, 0.85)',
                color: '#fff',
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              {/* Dimensions mesurées en temps réel */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {backendMeasurements ? (
                  <>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 10, opacity: 0.7 }}>Largeur</div>
                      <div style={{ fontSize: 18, fontWeight: 'bold', color: '#52c41a' }}>
                        {(backendMeasurements.largeur_cm / 100).toFixed(2)} m
                      </div>
                    </div>
                    <div style={{ fontSize: 20, opacity: 0.5 }}>×</div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 10, opacity: 0.7 }}>Hauteur</div>
                      <div style={{ fontSize: 18, fontWeight: 'bold', color: '#1890ff' }}>
                        {(backendMeasurements.hauteur_cm / 100).toFixed(2)} m
                      </div>
                    </div>
                    <div style={{ marginLeft: 8, textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: 12 }}>
                      <div style={{ fontSize: 10, opacity: 0.7 }}>Surface</div>
                      <div style={{ fontSize: 14, fontWeight: 'bold', color: '#faad14' }}>
                        {(backendMeasurements.largeur_cm * backendMeasurements.hauteur_cm / 10000).toFixed(2)} m²
                      </div>
                    </div>
                  </>
                ) : isComputingBackend ? (
                  <div style={{ fontSize: 14, opacity: 0.7 }}>⏳ Calcul en cours...</div>
                ) : points.length >= 4 ? (
                  <div style={{ fontSize: 14, opacity: 0.7 }}>📍 Ajustez les points pour mesurer</div>
                ) : (
                  <div style={{ fontSize: 14, opacity: 0.7 }}>📍 Placez 4 points sur l'objet</div>
                )}
              </div>
              
              {/* Indicateur confiance */}
              {backendMeasurements && (
                <Tag 
                  color={backendMeasurements.confidence > 0.8 ? 'green' : backendMeasurements.confidence > 0.6 ? 'gold' : 'red'}
                  style={{ margin: 0, fontSize: 10 }}
                >
                  {(backendMeasurements.confidence * 100).toFixed(0)}% conf.
                </Tag>
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
                bottom: 85,
                left: 20,
                zIndex: 10002,
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: '#1890ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(24,144,255,0.6)',
                cursor: 'pointer'
              }}
            >
              <MenuOutlined style={{ fontSize: 24, color: '#fff' }} />
            </div>
            
            {/* Bouton Valider */}
            {onValidate && points.length >= minPoints && (
              <div
                onClick={handleValidate}
                style={{
                  position: 'absolute',
                  bottom: 85,
                  right: 20,
                  zIndex: 10002,
                  height: 50,
                  paddingLeft: 20,
                  paddingRight: 20,
                  borderRadius: 25,
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

            {/* Référence */}
            <Card size="small" title="Référence (cm)">
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                <Space wrap>
                  <span>Largeur</span>
                  <InputNumber
                    min={0.01}
                    step={0.1}
                    value={localReferenceRealSize.width}
                    onChange={(v) => setReferenceRealSize(prev => ({ ...prev, width: Number(v || 0) }))}
                  />
                  <span>Hauteur</span>
                  <InputNumber
                    min={0.01}
                    step={0.1}
                    value={localReferenceRealSize.height}
                    onChange={(v) => setReferenceRealSize(prev => ({ ...prev, height: Number(v || 0) }))}
                  />
                </Space>
                <Space wrap>
                  <Button onClick={() => setReferenceRealSize(prev => ({ width: prev.height, height: prev.width }))}>
                    Inverser
                  </Button>
                  <Button onClick={() => setReferenceRealSize({ width: 21, height: 29.7 })}>
                    A4
                  </Button>
                  <Button onClick={() => setReferenceRealSize({ width: 13, height: 20.5 })}>
                    V10
                  </Button>
                  <Button onClick={() => setReferenceRealSize({ width: 8.56, height: 5.398 })}>
                    Carte
                  </Button>
                </Space>
              </Space>
            </Card>
            
            {/* 📊 Grille de Coordonnées */}
            <Card size="small" title="Visualisation">
              <Button 
                type={showCoordinateGrid ? 'primary' : 'default'}
                onClick={() => setShowCoordinateGrid(!showCoordinateGrid)}
                size="large"
                style={{ width: '100%' }}
              >
                📊 {showCoordinateGrid ? 'Masquer' : 'Afficher'} grille coordonnées
              </Button>
              <p style={{ fontSize: 12, marginTop: 8, color: '#666' }}>
                🟩 Vert = Référence | 🟪 Magenta = Objet mesuré
              </p>
            </Card>
            
            {/* Options avancées supprimées (homographie toujours active) */}
            
            {/* Actions workflow */}
            <Card size="small" title="Actions">
              <Space wrap>
                {/* 🔒 BOUTON FERMER - Toujours visible pour sortir */}
                {onCancel && (
                  <Button 
                    danger 
                    icon={<CloseOutlined />} 
                    onClick={() => { setMobileMenuOpen(false); onCancel(); }} 
                    size="large"
                  >
                    ✕ Fermer
                  </Button>
                )}
                {/* 🔒 Verrouiller/Déverrouiller tous les points */}
                {points.length > 0 && (
                  <Button 
                    type={lockedPoints.size === points.length ? 'default' : 'primary'}
                    onClick={() => {
                      if (lockedPoints.size === points.length) {
                        // Déverrouiller tous
                        setLockedPoints(new Set());
                        message.info({ content: '🔓 Tous les points déverrouillés', duration: 1.5 });
                      } else {
                        // Verrouiller tous
                        setLockedPoints(new Set(points.map(p => p.id)));
                        message.success({ content: '🔒 Tous les points verrouillés', duration: 1.5 });
                      }
                      setMobileMenuOpen(false);
                    }} 
                    size="large"
                  >
                    {lockedPoints.size === points.length ? '🔓 Tout déverrouiller' : '🔒 Tout verrouiller'}
                  </Button>
                )}
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
      data-disable-tbl-swipe="true"
      style={{ width: '100%' }}
    >
      {/* 🆕 WORKFLOW GUIDÉ - Actions rapides */}
      {!readOnly && !isMobileFullscreen && (
        <Card size="small" style={{ marginBottom: 8 }}>
          <Space wrap>
            {referenceCorners && (
              <Button
                size="small"
                danger
                onClick={() => {
                  setReferenceCorners(null);
                  setQuadrilateralMode(false);
                  setWorkflowStep('selectReferenceZone');
                  message.info('Référence effacée. Redessinez autour de l\'objet de référence.');
                }}
              >
                Effacer référence
              </Button>
            )}
            <Button
              size="small"
              danger
              onClick={() => {
                setPoints([]);
                setWorkflowStep('selectMeasureZone');
                message.info('Mesure effacée. Redessinez autour de l\'objet à mesurer.');
              }}
            >
              Refaire mesure
            </Button>
            <Button
              size="small"
              onClick={() => {
                setReferenceCorners(null);
                setQuadrilateralMode(false);
                setPoints([]);
                setHomographyResult(null);
                setWorkflowStep('selectReferenceZone');
                message.info('Tout effacé. Recommencez depuis la référence.');
              }}
            >
              Tout recommencer
            </Button>
            {pointBeingPlaced && (
              <Button size="small" danger onClick={cancelPointPlacement}>
                Annuler placement
              </Button>
            )}
          </Space>
        </Card>
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
          </Space>

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
          {/* 📊 Grille de Coordonnées (overlay SVG) */}
          {showCoordinateGrid && referenceCorners && (
            <>
              {/* Calculer les coins de l'objet à partir des points */}
              {points.length >= 4 && (() => {
                const sortedPoints = [...points].slice(0, 4);
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
                
                const objectCorners = {
                  topLeft: { x: topPoints[0].x, y: topPoints[0].y },
                  topRight: { x: topPoints[1].x, y: topPoints[1].y },
                  bottomRight: { x: bottomPoints[1].x, y: bottomPoints[1].y },
                  bottomLeft: { x: bottomPoints[0].x, y: bottomPoints[0].y }
                };
                
                // 🔍 DEBUG: Log les coordonnées exactes
                console.log('📍 OBJET MESURÉ - Coordonnées pixel:');
                console.table({
                  'Top-Left (A)': `(${objectCorners.topLeft.x.toFixed(1)}, ${objectCorners.topLeft.y.toFixed(1)})`,
                  'Top-Right (B)': `(${objectCorners.topRight.x.toFixed(1)}, ${objectCorners.topRight.y.toFixed(1)})`,
                  'Bottom-Right (D)': `(${objectCorners.bottomRight.x.toFixed(1)}, ${objectCorners.bottomRight.y.toFixed(1)})`,
                  'Bottom-Left (C)': `(${objectCorners.bottomLeft.x.toFixed(1)}, ${objectCorners.bottomLeft.y.toFixed(1)})`
                });
                
                console.log('📐 OBJET MESURÉ - Dimensions en pixel:');
                const widthTop = objectCorners.topRight.x - objectCorners.topLeft.x;
                const widthBottom = objectCorners.bottomRight.x - objectCorners.bottomLeft.x;
                const heightLeft = objectCorners.bottomLeft.y - objectCorners.topLeft.y;
                const heightRight = objectCorners.bottomRight.y - objectCorners.topRight.y;
                console.log(`  Haut: ${widthTop.toFixed(1)}px = ${(widthTop / pixelPerCmX).toFixed(1)}cm = ${(widthTop / pixelPerCmX * 10).toFixed(1)}mm`);
                console.log(`  Bas: ${widthBottom.toFixed(1)}px = ${(widthBottom / pixelPerCmX).toFixed(1)}cm = ${(widthBottom / pixelPerCmX * 10).toFixed(1)}mm`);
                console.log(`  Gauche: ${heightLeft.toFixed(1)}px = ${(heightLeft / pixelPerCmY).toFixed(1)}cm = ${(heightLeft / pixelPerCmY * 10).toFixed(1)}mm`);
                console.log(`  Droite: ${heightRight.toFixed(1)}px = ${(heightRight / pixelPerCmY).toFixed(1)}cm = ${(heightRight / pixelPerCmY * 10).toFixed(1)}mm`);
                
                console.log('🔍 ============ DIAGNOSTIC CALIBRATION ============');
                console.log(`  pixelPerCmX: ${pixelPerCmX.toFixed(4)} px/cm (LARGEUR)`);
                console.log(`  pixelPerCmY: ${pixelPerCmY.toFixed(4)} px/cm (HAUTEUR)`);
                console.log(`  RATIO Y/X: ${(pixelPerCmY / pixelPerCmX).toFixed(4)} ${pixelPerCmY > pixelPerCmX ? '❌ TOO HIGH (hauteur sous-estimée)' : '✅ normal'}`);
                console.log(`  Si vous mesurez 202cm (hauteur réelle) mais obtenez 181cm:`);
                console.log(`    → Problème: pixelPerCmY est ${((pixelPerCmY / 5.58) * 100).toFixed(1)}% trop élevé`);
                
                // 🔥 NEW DIAGNOSTIC: Calculer ce que DEVRAIT être pixelPerCmY
                const heightPx = heightLeft;  // pixels mesurés
                const expectedHeightCm = 202;  // réalité
                const correctPixelPerCmY = heightPx / expectedHeightCm;
                console.log(`  🔥 CALC: ${heightPx.toFixed(1)}px pour 202cm attendus → pixelPerCmY DEVRAIT être ${correctPixelPerCmY.toFixed(4)}`);
                console.log(`  🔥 MAIS vous avez ${pixelPerCmY.toFixed(4)} → ERREUR de ${((pixelPerCmY - correctPixelPerCmY) / correctPixelPerCmY * 100).toFixed(1)}%`);
                console.log('🔍 ================================================');
                
                return (
                  <CoordinateGrid
                    imageWidth={imageDimensions.width}
                    imageHeight={imageDimensions.height}
                    referenceCorners={referenceCorners}
                    objectCorners={objectCorners}
                    pixelPerCmX={pixelPerCmX}
                    pixelPerCmY={pixelPerCmY}
                    scale={zoom}
                  />
                );
              })()}
            </>
          )}
          
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

            {/* Lignes entre tous les points (ordre cohérent par angle) */}
            {(() => {
              if (orderedPoints.length < 2) return null;
              return (
                <Line
                  points={orderedPoints.flatMap(p => [p.x, p.y])}
                  stroke={colors.measurementLine}
                  strokeWidth={1}
                  dash={[3, 3]}
                  closed={orderedPoints.length >= 3}
                />
              );
            })()}

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
            {points.map((point, index) => {
              const isLocked = lockedPoints.has(point.id);
              const isBeingPlaced = pointBeingPlaced === point.id;
              const isPlaced = isBeingPlaced && pointPlacementState === 'placed';
              
              return (
              <Group key={point.id}>
                {/* 🆕 HITBOX invisible plus grande pour faciliter le tap ET le drag sur mobile */}
                <Circle
                  x={point.x}
                  y={point.y}
                  radius={30}
                  // Couleur de fond pour indiquer l'état de verrouillage
                  fill={isLocked ? "rgba(82, 196, 26, 0.2)" : "rgba(0,0,0,0.01)"}
                  stroke={isLocked ? "#52c41a" : "transparent"}
                  strokeWidth={isLocked ? 2 : 0}
                  draggable={!readOnly && point.draggable !== false && !isLocked}
                  onDragStart={() => {
                    if (!isLocked) setIsDraggingPoint(true);
                  }}
                  onDragMove={(e) => {
                    e.cancelBubble = true;
                    // 🔒 Bloquer le drag si verrouillé
                    if (isLocked) {
                      e.target.x(point.x);
                      e.target.y(point.y);
                      return;
                    }
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
                    // Ne pas sauvegarder si verrouillé
                    if (!isLocked) {
                      saveToHistory(points, exclusionZones);
                      setIsDraggingPoint(false);
                      setComputeTrigger(prev => prev + 1); // 🔄 Déclenche le recalcul
                    }
                  }}
                  onClick={(e) => {
                    e.cancelBubble = true;
                    if (!readOnly && point.draggable !== false) {
                      // Utiliser le nouveau workflow: clic → zoom → place → verrouille
                      selectPointForPlacement(point.id, point.x, point.y);
                    }
                  }}
                  onTap={(e) => {
                    e.cancelBubble = true;
                    if (!readOnly && point.draggable !== false) {
                      // Utiliser le nouveau workflow: clic → zoom → place → verrouille
                      selectPointForPlacement(point.id, point.x, point.y);
                    }
                  }}
                  onMouseEnter={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = isLocked ? 'pointer' : 'grab';
                  }}
                  onMouseLeave={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'default';
                  }}
                />
                
                {/* 🆕 Point carré (coin) - PETIT pour précision maximale */}
                <Rect
                  x={point.x - (isBeingPlaced ? 8 : selectedPointId === point.id ? 6 : 5)}
                  y={point.y - (isBeingPlaced ? 8 : selectedPointId === point.id ? 6 : 5)}
                  width={isBeingPlaced ? 16 : selectedPointId === point.id ? 12 : 10}
                  height={isBeingPlaced ? 16 : selectedPointId === point.id ? 12 : 10}
                  fill={isLocked ? '#52c41a' : isPlaced ? '#faad14' : isBeingPlaced ? '#ff0000' : point.color}
                  stroke={isLocked ? '#fff' : isPlaced ? '#fff' : isBeingPlaced ? '#ffff00' : selectedPointId === point.id ? '#000' : '#fff'}
                  strokeWidth={isBeingPlaced || isLocked ? 2 : 1.5}
                  cornerRadius={1}
                  rotation={45}
                  offsetX={0}
                  offsetY={0}
                  listening={false}
                  shadowColor="black"
                  shadowBlur={isBeingPlaced ? 6 : 2}
                  shadowOpacity={isBeingPlaced ? 0.6 : 0.3}
                />
                
                {/* 🔒 Icône cadenas pour points verrouillés */}
                {isLocked && (
                  <KonvaText
                    x={point.x - 5}
                    y={point.y - 5}
                    text="🔒"
                    fontSize={10}
                    listening={false}
                  />
                )}
                
                {/* 🆕 Croix fine au centre pour précision */}
                <Line
                  points={[point.x - 4, point.y, point.x + 4, point.y]}
                  stroke={isLocked ? '#fff' : isBeingPlaced ? '#ffff00' : '#fff'}
                  strokeWidth={1.5}
                  listening={false}
                />
                <Line
                  points={[point.x, point.y - 4, point.x, point.y + 4]}
                  stroke={isLocked ? '#fff' : isBeingPlaced ? '#ffff00' : '#fff'}
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
                  fill={isLocked ? '#52c41a' : point.color}
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
              );
            })}

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
                    ? `⚠️ Ajustez ce rectangle sur la référence (${localReferenceRealSize.width}×${localReferenceRealSize.height}cm)`
                    : `📐 Référence (${localReferenceRealSize.width}×${localReferenceRealSize.height}cm) - CLIQUEZ pour ajuster`}
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
                  text={`📐 Référence (${localReferenceRealSize.width}×${localReferenceRealSize.height}cm)`}
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
          
          {/* 📊 Bouton toggle grille coordonnées (Desktop) */}
          {!isMobileFullscreen && (
            <Tooltip title={showCoordinateGrid ? 'Masquer grille' : 'Afficher grille'}>
              <Button
                type={showCoordinateGrid ? 'primary' : 'default'}
                shape="circle"
                size="large"
                icon={<span>📊</span>}
                onClick={() => setShowCoordinateGrid(!showCoordinateGrid)}
                style={{
                  position: 'absolute',
                  bottom: 16,
                  right: 16,
                  zIndex: 100,
                  width: 50,
                  height: 50,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24
                }}
              />
            </Tooltip>
          )}
        </div>
      </div>

      {/* Measurements display */}
      {!isMobileFullscreen && (
        <Card size="small" style={{ marginTop: 8 }}>
          <Space wrap size="large">
            {/* Indicateur de calcul backend en cours */}
            {isComputingBackend && (
              <Tag color="processing" icon={<span style={{ marginRight: 4 }}>⏳</span>}>
                Calcul précis...
              </Tag>
            )}
            {/* Indicateur source des mesures */}
            {backendMeasurements && !isComputingBackend && (
              <Tag color="success" icon={<span style={{ marginRight: 4 }}>🎯</span>}>
                Backend {(backendMeasurements.confidence * 100).toFixed(0)}%
              </Tag>
            )}
            {measurements.largeur_cm !== undefined && (
              <Tag color="blue">
                Largeur : {formatMeasurement(convertUnit(
                  backendMeasurements?.largeur_cm || measurements.largeur_cm, 
                  unit
                ), unit)}
                {(backendMeasurements?.incertitude_largeur_cm || measurements.incertitude_largeur_cm) !== undefined && (
                  <Text type="secondary" style={{ fontSize: '0.85em', marginLeft: 4 }}>
                    ±{formatMeasurement(convertUnit(
                      backendMeasurements?.incertitude_largeur_cm || measurements.incertitude_largeur_cm || 0, 
                      unit
                    ), unit)}
                  </Text>
                )}
              </Tag>
            )}
            {measurements.hauteur_cm !== undefined && (
              <Tag color="blue">
                Hauteur : {formatMeasurement(convertUnit(
                  backendMeasurements?.hauteur_cm || measurements.hauteur_cm, 
                  unit
                ), unit)}
                {(backendMeasurements?.incertitude_hauteur_cm || measurements.incertitude_hauteur_cm) !== undefined && (
                  <Text type="secondary" style={{ fontSize: '0.85em', marginLeft: 4 }}>
                    ±{formatMeasurement(convertUnit(
                      backendMeasurements?.incertitude_hauteur_cm || measurements.incertitude_hauteur_cm || 0, 
                      unit
                    ), unit)}
                  </Text>
                )}
              </Tag>
            )}
            {measurements.surface_brute_m2 !== undefined && (
              <Tag color="green">Surface brute : {(
                measurements.surface_brute_m2 !== undefined
                  ? measurements.surface_brute_m2
                  : backendMeasurements
                  ? (backendMeasurements.largeur_cm * backendMeasurements.hauteur_cm / 10000)
                  : 0
              ).toFixed(2)} m²</Tag>
            )}
            {measurements.surface_nette_m2 !== undefined && exclusionZones.length > 0 && (
              <Tag color="orange">Surface nette : {measurements.surface_nette_m2.toFixed(2)} m²</Tag>
            )}
            {measurements.perimetre_cm !== undefined && (
              <Tag color="purple">
                Périmètre : {formatMeasurement(convertUnit(measurements.perimetre_cm, unit), unit)}
              </Tag>
            )}
            {measurements.homography_quality !== undefined && useHomography && !backendMeasurements && (
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
