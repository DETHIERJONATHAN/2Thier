/**
 * 📐 TYPES POUR LE SYSTÈME DE MESURE IA AVEC CALIBRATION
 * 
 * Définit les interfaces pour :
 * - Configuration de l'objet de référence par organisation
 * - Points de mesure interactifs
 * - Zones d'exclusion
 * - Annotations d'images
 * - Calculs géométriques
 */

// =============================================================================
// 📏 CONFIGURATION RÉFÉRENCE ORGANISATION
// =============================================================================

export type ReferenceType = 'meter' | 'card' | 'a4' | 'custom';

export interface OrganizationMeasurementReferenceConfig {
  id: string;
  organizationId: string;
  referenceType: ReferenceType;
  customName?: string;
  customSize: number; // Taille en unité spécifiée
  customUnit: string; // 'cm', 'm', 'mm', 'inch'
  referenceImageUrl?: string; // Photo de référence pour améliorer détection
  detectionPrompt?: string; // Prompt personnalisé pour détecter l'objet
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface ReferenceConfigFormData {
  referenceType: ReferenceType;
  customName?: string;
  customSize: number;
  customUnit: string;
  referenceImage?: File | null;
}

// Presets pour objets de référence courants
export const REFERENCE_PRESETS: Record<ReferenceType, { label: string; size: number; unit: string; description: string }> = {
  meter: {
    label: 'Mètre ruban',
    size: 100,
    unit: 'cm',
    description: '1 mètre visible sur la photo'
  },
  card: {
    label: 'Carte bancaire',
    size: 8.56,
    unit: 'cm',
    description: 'Largeur standard 85.6mm'
  },
  a4: {
    label: 'Feuille A4',
    size: 21,
    unit: 'cm',
    description: 'Largeur A4 (21×29.7cm)'
  },
  custom: {
    label: 'Personnalisé',
    size: 0,
    unit: 'cm',
    description: 'Objet de votre choix'
  }
};

// =============================================================================
// 📍 POINTS DE MESURE & CANVAS
// =============================================================================

export type PointType = 'primary' | 'secondary' | 'custom' | 'reference';

export interface MeasurementPoint {
  id: string;
  x: number; // Position X en pixels
  y: number; // Position Y en pixels
  type: PointType;
  label?: string; // Ex: 'A', 'B', 'C', 'D'
  color: string; // Couleur du point
  draggable: boolean;
  metadata?: Record<string, unknown>;
}

export interface ExclusionZone {
  id: string;
  type: 'rectangle' | 'ellipse' | 'polygon';
  points: Array<[number, number]>; // Coordonnées des sommets/contrôle
  label?: string;
  color: string;
  opacity: number;
  area?: number; // Surface en cm² ou m²
}

export interface CalibrationData {
  referencePoints: [[number, number], [number, number]]; // 2 points sur l'objet de référence
  referenceSize: number; // Taille réelle en cm
  referenceUnit: string; // Unité
  pixelPerCm: number; // Ratio calculé
  confidence?: number; // Confiance de la détection (0-100)
  detectedAutomatically: boolean;
}

// =============================================================================
// 📊 ANNOTATIONS & MESURES
// =============================================================================

export interface ImageAnnotations {
  id?: string;
  submissionId?: string;
  nodeId: string;
  imageUrl: string;
  // 🆕 Image avec les lignes de mesure et annotations dessinées
  annotatedImageUrl?: string;
  calibration: CalibrationData;
  measurementPoints: MeasurementPoint[];
  exclusionZones?: ExclusionZone[];
  measurements: MeasurementResults;
  // 🎯 MÉTRÉ A4 V10: Coins de référence pour dessiner le quadrilatère
  referenceCorners?: {
    topLeft: { x: number; y: number };
    topRight: { x: number; y: number };
    bottomLeft: { x: number; y: number };
    bottomRight: { x: number; y: number };
  };
  // 📐 Dimensions de l'image (pour convertir % → pixels)
  imageDimensions?: {
    width: number;
    height: number;
    scale: number;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MeasurementResults {
  // Dimensions de base
  largeur_cm?: number;
  hauteur_cm?: number;
  profondeur_cm?: number;
  diagonale_cm?: number;
  
  // Surfaces
  surface_brute_cm2?: number;
  surface_brute_m2?: number;
  surface_nette_cm2?: number; // Surface brute - zones exclusion
  surface_nette_m2?: number;
  
  // Périmètres
  perimetre_cm?: number;
  perimetre_m?: number;
  
  // Angles (si 3+ points)
  angles_deg?: number[];
  
  // Mesures personnalisées
  [key: string]: number | number[] | undefined;
}

// =============================================================================
// 🎨 CONFIGURATION CANVAS
// =============================================================================

export interface CanvasConfig {
  width: number;
  height: number;
  minPoints: number; // Min 2
  maxPoints?: number; // null = illimité
  defaultPoints: number; // Nombre de points initiaux (2-4)
  allowExclusion: boolean; // Autoriser zones exclusion
  units: string[]; // Unités disponibles
  defaultUnit: string;
  colors: {
    primaryPoint: string;
    secondaryPoint: string;
    customPoint: string;
    referencePoint: string;
    measurementLine: string;
    exclusionZone: string;
    grid: string;
  };
}

export const DEFAULT_CANVAS_CONFIG: CanvasConfig = {
  width: 800,
  height: 600,
  minPoints: 2,
  maxPoints: undefined, // illimité
  defaultPoints: 4,
  allowExclusion: true,
  units: ['cm', 'm', 'mm', 'inch'],
  defaultUnit: 'cm',
  colors: {
    primaryPoint: '#1890FF', // Bleu Ant Design
    secondaryPoint: '#13C2C2', // Cyan
    customPoint: '#FAAD14', // Orange
    referencePoint: '#52C41A', // Vert
    measurementLine: '#1890FF',
    exclusionZone: '#FF4D4F',
    grid: '#D9D9D9'
  }
};

// =============================================================================
// 🤖 RÉPONSES API IA
// =============================================================================

export interface ReferenceDetectionResult {
  success: boolean;
  points?: [[number, number], [number, number]];
  confidence?: number;
  error?: string;
}

export interface MeasurementSuggestionResult {
  success: boolean;
  points?: MeasurementPoint[];
  measurements?: Partial<MeasurementResults>;
  objectType?: string; // 'window', 'door', 'wall', etc.
  confidence?: number;
  error?: string;
}

// =============================================================================
// 🔧 UTILITAIRES
// =============================================================================

/**
 * Calcule la distance euclidienne entre 2 points
 */
export function calculateDistance(
  p1: [number, number],
  p2: [number, number],
  pixelPerCm: number
): number {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const distancePx = Math.sqrt(dx * dx + dy * dy);
  return distancePx / pixelPerCm;
}

/**
 * Calcule la surface d'un rectangle défini par 4 points
 */
export function calculateRectangleArea(
  points: MeasurementPoint[],
  pixelPerCm: number
): number {
  if (points.length < 4) return 0;
  
  const width = calculateDistance(
    [points[0].x, points[0].y],
    [points[1].x, points[1].y],
    pixelPerCm
  );
  
  const height = calculateDistance(
    [points[0].x, points[0].y],
    [points[2].x, points[2].y],
    pixelPerCm
  );
  
  return width * height;
}

/**
 * Calcule l'aire d'un polygone (formule du lacet)
 */
export function calculatePolygonArea(
  points: Array<[number, number]>,
  pixelPerCm: number
): number {
  if (points.length < 3) return 0;
  
  let areaPx = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    areaPx += points[i][0] * points[j][1];
    areaPx -= points[j][0] * points[i][1];
  }
  areaPx = Math.abs(areaPx) / 2;
  
  // Convertir pixels² en cm²
  const areaCm2 = areaPx / (pixelPerCm * pixelPerCm);
  return areaCm2;
}

/**
 * Convertit cm vers l'unité cible
 */
export function convertUnit(valueCm: number, targetUnit: string): number {
  switch (targetUnit) {
    case 'm':
      return valueCm / 100;
    case 'mm':
      return valueCm * 10;
    case 'inch':
      return valueCm / 2.54;
    default:
      return valueCm;
  }
}

/**
 * Formate une mesure avec l'unité
 */
export function formatMeasurement(value: number, unit: string, decimals = 2): string {
  return `${value.toFixed(decimals)} ${unit}`;
}
