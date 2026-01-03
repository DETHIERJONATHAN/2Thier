/**
 * 📐📱 ImageMeasurementCanvasMobile - Canvas MOBILE FIRST pour points de mesure
 * 
 * VERSION OPTIMISÉE POUR MOBILE :
 * - Points de mesure LARGES (24px) pour doigts
 * - Interface fullscreen simplifiée
 * - Pinch-to-zoom natif
 * - Pan/scroll fluide
 * - Feedback visuel tactile
 * - Instructions guidées
 * 
 * Utilise le DOM natif + Canvas au lieu de Konva pour de meilleures performances mobiles
 */

import React, { useState, useRef, useEffect, useCallback, useMemo, TouchEvent as ReactTouchEvent } from 'react';
import { Button, Space, Tag, Typography, message, Progress } from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  UndoOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  AimOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined
} from '@ant-design/icons';
import type {
  MeasurementPoint,
  MeasurementResults,
  CalibrationData,
  ImageAnnotations
} from '../../types/measurement';
import {
  formatMeasurement,
  convertUnit
} from '../../types/measurement';

const { Text, Title } = Typography;

// ============================================================================
// TYPES
// ============================================================================

interface ImageMeasurementCanvasMobileProps {
  imageUrl: string;
  calibration?: CalibrationData;
  initialPoints?: MeasurementPoint[];
  onMeasurementsChange?: (measurements: MeasurementResults) => void;
  onAnnotationsChange?: (annotations: Partial<ImageAnnotations>) => void;
  onValidate?: (annotations: ImageAnnotations) => void;
  onCancel?: () => void;
  minPoints?: number;
  defaultUnit?: string;
  measureKeys?: string[]; // Pour savoir quelles mesures sont attendues (largeur, hauteur, etc.)
}

interface TouchPoint {
  id: number;
  x: number;
  y: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const POINT_RADIUS = 24; // Rayon du point de mesure - GRAND pour les doigts
const POINT_BORDER = 4;
const POINT_COLORS = {
  primary: '#1890ff',
  selected: '#ff4d4f',
  completed: '#52c41a'
};

const LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

// ============================================================================
// COMPONENT
// ============================================================================

export const ImageMeasurementCanvasMobile: React.FC<ImageMeasurementCanvasMobileProps> = ({
  imageUrl,
  calibration,
  initialPoints = [],
  onMeasurementsChange,
  onAnnotationsChange,
  onValidate,
  onCancel,
  minPoints = 4,
  defaultUnit = 'cm',
  measureKeys = []
}) => {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // State - Points
  const [points, setPoints] = useState<MeasurementPoint[]>([]);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // State - View
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0, naturalWidth: 0, naturalHeight: 0 });
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(true); // Fullscreen par défaut

  // State - Touch
  const [touchStartDistance, setTouchStartDistance] = useState<number | null>(null);
  const [touchStartScale, setTouchStartScale] = useState(1);
  const [lastTouchCenter, setLastTouchCenter] = useState<{ x: number; y: number } | null>(null);

  // State - UI
  const [unit, setUnit] = useState(defaultUnit);
  const [showInstructions, setShowInstructions] = useState(true);

  // Calibration
  const pixelPerCm = calibration?.pixelPerCm || 10;

  // ============================================================================
  // 🆕 BODY LOCK - Bloquer TOUT scroll/comportement du body pendant le canvas
  // ============================================================================

  useEffect(() => {
    // Sauvegarder les styles originaux du body
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalTouchAction = document.body.style.touchAction;
    const originalOverscroll = document.body.style.overscrollBehavior;
    const originalHeight = document.body.style.height;
    const originalWidth = document.body.style.width;

    // Bloquer complètement le body
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.touchAction = 'none';
    document.body.style.overscrollBehavior = 'none';
    document.body.style.height = '100%';
    document.body.style.width = '100%';

    // Aussi bloquer le html
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';

    return () => {
      // Restaurer les styles originaux
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.touchAction = originalTouchAction;
      document.body.style.overscrollBehavior = originalOverscroll;
      document.body.style.height = originalHeight;
      document.body.style.width = originalWidth;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, []);

  // ============================================================================
  // 🆕 MOBILE TOUCH PREVENTION - Empêcher le scroll/navigation natif
  // ============================================================================

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Empêcher tous les comportements tactiles natifs sur le container
    const preventDefaultTouch = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    // Empêcher le scroll/pull-to-refresh
    const preventScroll = (e: TouchEvent) => {
      e.preventDefault();
    };

    // Empêcher le zoom par geste sur iOS Safari
    const preventGesture = (e: Event) => {
      e.preventDefault();
    };

    // Empêcher la navigation back/forward par swipe sur iOS
    const preventSwipeNavigation = (e: TouchEvent) => {
      // Si le touch est près du bord, empêcher
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        if (touch.clientX < 30 || touch.clientX > window.innerWidth - 30) {
          e.preventDefault();
        }
      }
    };

    // Ajouter les listeners avec passive: false pour pouvoir faire preventDefault
    container.addEventListener('touchstart', preventDefaultTouch, { passive: false });
    container.addEventListener('touchmove', preventScroll, { passive: false });
    container.addEventListener('touchend', preventDefaultTouch, { passive: false });
    container.addEventListener('touchcancel', preventDefaultTouch, { passive: false });
    
    // iOS Safari specific
    container.addEventListener('gesturestart', preventGesture);
    container.addEventListener('gesturechange', preventGesture);
    container.addEventListener('gestureend', preventGesture);
    
    // Empêcher le swipe navigation
    document.body.style.overscrollBehavior = 'none';

    return () => {
      container.removeEventListener('touchstart', preventDefaultTouch);
      container.removeEventListener('touchmove', preventScroll);
      container.removeEventListener('touchend', preventDefaultTouch);
      container.removeEventListener('touchcancel', preventDefaultTouch);
      container.removeEventListener('gesturestart', preventGesture);
      container.removeEventListener('gesturechange', preventGesture);
      container.removeEventListener('gestureend', preventGesture);
      document.body.style.overscrollBehavior = '';
    };
  }, []);

  // ============================================================================
  // IMAGE LOADING
  // ============================================================================

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      
      // Calculer les dimensions pour fit-to-screen
      const container = containerRef.current;
      if (!container) return;

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight || window.innerHeight * 0.7;

      const scaleW = containerWidth / img.width;
      const scaleH = containerHeight / img.height;
      const fitScale = Math.min(scaleW, scaleH, 1);

      setImageDimensions({
        width: img.width * fitScale,
        height: img.height * fitScale,
        naturalWidth: img.width,
        naturalHeight: img.height
      });
      setScale(1);
      setOffset({ x: 0, y: 0 });
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // ============================================================================
  // INITIAL POINTS - Scale from 0-1000 to actual pixels
  // ============================================================================

  useEffect(() => {
    if (initialPoints.length > 0 && imageDimensions.width > 0) {
      const scaledPoints = initialPoints.map((p, i) => ({
        ...p,
        x: (p.x / 1000) * imageDimensions.width,
        y: (p.y / 1000) * imageDimensions.height,
        label: p.label || LABELS[i] || `P${i + 1}`,
        color: POINT_COLORS.primary
      }));
      setPoints(scaledPoints);
      console.log('📱 [Mobile] Points initiaux scalés:', scaledPoints.length);
    }
  }, [initialPoints, imageDimensions.width, imageDimensions.height]);

  // ============================================================================
  // CANVAS DRAWING
  // ============================================================================

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imageRef.current;
    
    if (!canvas || !ctx || !img) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save context
    ctx.save();

    // Apply transformations
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    // Draw image
    ctx.drawImage(img, 0, 0, imageDimensions.width, imageDimensions.height);

    // Draw measurement polygon (if 4+ points)
    if (points.length >= 2) {
      // Sort points to form proper rectangle
      const sortedPoints = getSortedPoints();
      
      ctx.beginPath();
      ctx.moveTo(sortedPoints[0].x, sortedPoints[0].y);
      for (let i = 1; i < sortedPoints.length; i++) {
        ctx.lineTo(sortedPoints[i].x, sortedPoints[i].y);
      }
      ctx.closePath();
      
      ctx.strokeStyle = '#1890ff';
      ctx.lineWidth = 2 / scale;
      ctx.setLineDash([5 / scale, 5 / scale]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Fill with semi-transparent
      ctx.fillStyle = 'rgba(24, 144, 255, 0.1)';
      ctx.fill();
    }

    // Draw points
    points.forEach((point, index) => {
      const isSelected = point.id === selectedPointId;
      const radius = POINT_RADIUS / scale;
      const border = POINT_BORDER / scale;

      // Outer circle (white border)
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius + border, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.closePath();

      // Main circle
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? POINT_COLORS.selected : POINT_COLORS.primary;
      ctx.fill();
      
      if (isSelected) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3 / scale;
        ctx.stroke();
      }
      ctx.closePath();

      // Label
      const fontSize = Math.max(14, 18 / scale);
      ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(point.label || LABELS[index], point.x, point.y);
    });

    // Draw measurements between points
    if (points.length >= 2) {
      const sorted = getSortedPoints();
      const fontSize = Math.max(12, 14 / scale);
      ctx.font = `bold ${fontSize}px -apple-system, sans-serif`;

      // Draw dimension labels on edges
      for (let i = 0; i < Math.min(sorted.length, 4); i++) {
        const p1 = sorted[i];
        const p2 = sorted[(i + 1) % sorted.length];
        
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        
        const distPx = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
        const distCm = distPx / pixelPerCm;

        // Background pill
        const text = `${distCm.toFixed(1)} cm`;
        const textWidth = ctx.measureText(text).width;
        const padding = 6 / scale;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        roundRect(ctx, midX - textWidth/2 - padding, midY - fontSize/2 - padding, textWidth + padding*2, fontSize + padding*2, 4/scale);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, midX, midY);
      }
    }

    ctx.restore();
  }, [points, selectedPointId, scale, offset, imageDimensions, pixelPerCm]);

  // Rounded rect helper
  const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  // Sort points for proper rectangle
  const getSortedPoints = useCallback(() => {
    if (points.length < 4) return points;
    
    const sorted = [...points].slice(0, 4);
    const topPoints = sorted
      .map((p, i) => ({ ...p, idx: i }))
      .sort((a, b) => a.y - b.y)
      .slice(0, 2)
      .sort((a, b) => a.x - b.x);
    const bottomPoints = sorted
      .map((p, i) => ({ ...p, idx: i }))
      .sort((a, b) => a.y - b.y)
      .slice(2, 4)
      .sort((a, b) => a.x - b.x);

    return [topPoints[0], topPoints[1], bottomPoints[1], bottomPoints[0]];
  }, [points]);

  // Redraw on state change
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // ============================================================================
  // MEASUREMENTS
  // ============================================================================

  const measurements = useMemo((): MeasurementResults => {
    if (points.length < 4) return {};
    
    const sorted = getSortedPoints();
    const results: MeasurementResults = {};

    // Largeur (top edge)
    const widthPx = Math.sqrt(
      Math.pow(sorted[1].x - sorted[0].x, 2) + Math.pow(sorted[1].y - sorted[0].y, 2)
    );
    results.largeur_cm = widthPx / pixelPerCm;

    // Hauteur (left edge)
    const heightPx = Math.sqrt(
      Math.pow(sorted[3].x - sorted[0].x, 2) + Math.pow(sorted[3].y - sorted[0].y, 2)
    );
    results.hauteur_cm = heightPx / pixelPerCm;

    // Surface
    results.surface_brute_cm2 = results.largeur_cm * results.hauteur_cm;
    results.surface_brute_m2 = results.surface_brute_cm2 / 10000;

    return results;
  }, [points, pixelPerCm, getSortedPoints]);

  useEffect(() => {
    onMeasurementsChange?.(measurements);
  }, [measurements, onMeasurementsChange]);

  // ============================================================================
  // TOUCH HANDLERS
  // ============================================================================

  const screenToCanvas = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left - offset.x) / scale;
    const y = (clientY - rect.top - offset.y) / scale;
    return { x, y };
  }, [scale, offset]);

  const findPointAtPosition = useCallback((x: number, y: number): MeasurementPoint | null => {
    const hitRadius = POINT_RADIUS * 1.5 / scale; // Plus grande zone de hit pour mobile
    
    for (const point of points) {
      const dist = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2));
      if (dist <= hitRadius) {
        return point;
      }
    }
    return null;
  }, [points, scale]);

  const getDistance = (t1: Touch, t2: Touch) => {
    return Math.sqrt(Math.pow(t2.clientX - t1.clientX, 2) + Math.pow(t2.clientY - t1.clientY, 2));
  };

  const getCenter = (t1: Touch, t2: Touch) => ({
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2
  });

  // Touch Start
  const handleTouchStart = useCallback((e: ReactTouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation(); // 🆕 Empêcher la propagation vers les parents
    
    const touches = e.touches;

    if (touches.length === 2) {
      // Pinch start
      setTouchStartDistance(getDistance(touches[0], touches[1]));
      setTouchStartScale(scale);
      setLastTouchCenter(getCenter(touches[0], touches[1]));
      setSelectedPointId(null);
      setIsDragging(false);
    } else if (touches.length === 1) {
      const pos = screenToCanvas(touches[0].clientX, touches[0].clientY);
      const hitPoint = findPointAtPosition(pos.x, pos.y);

      if (hitPoint) {
        // Start dragging point
        setSelectedPointId(hitPoint.id);
        setIsDragging(true);
        setShowInstructions(false);
        
        // Vibration feedback (si supporté)
        if (navigator.vibrate) navigator.vibrate(10);
      } else {
        // Start panning
        setLastTouchCenter({ x: touches[0].clientX, y: touches[0].clientY });
        setSelectedPointId(null);
      }
    }
  }, [scale, screenToCanvas, findPointAtPosition]);

  // Touch Move
  const handleTouchMove = useCallback((e: ReactTouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation(); // 🆕 Empêcher la propagation vers les parents
    
    const touches = e.touches;

    if (touches.length === 2 && touchStartDistance !== null) {
      // Pinch zoom
      const newDist = getDistance(touches[0], touches[1]);
      const newScale = Math.max(0.5, Math.min(4, touchStartScale * (newDist / touchStartDistance)));
      setScale(newScale);

      // Pan to center
      const center = getCenter(touches[0], touches[1]);
      if (lastTouchCenter) {
        setOffset(prev => ({
          x: prev.x + (center.x - lastTouchCenter.x),
          y: prev.y + (center.y - lastTouchCenter.y)
        }));
      }
      setLastTouchCenter(center);
    } else if (touches.length === 1) {
      if (isDragging && selectedPointId) {
        // Drag point
        const pos = screenToCanvas(touches[0].clientX, touches[0].clientY);
        
        // Clamp to image bounds
        const clampedX = Math.max(0, Math.min(imageDimensions.width, pos.x));
        const clampedY = Math.max(0, Math.min(imageDimensions.height, pos.y));

        setPoints(prev => prev.map(p =>
          p.id === selectedPointId ? { ...p, x: clampedX, y: clampedY } : p
        ));
      } else if (lastTouchCenter) {
        // Pan
        setOffset(prev => ({
          x: prev.x + (touches[0].clientX - lastTouchCenter.x),
          y: prev.y + (touches[0].clientY - lastTouchCenter.y)
        }));
        setLastTouchCenter({ x: touches[0].clientX, y: touches[0].clientY });
      }
    }
  }, [isDragging, selectedPointId, touchStartDistance, touchStartScale, lastTouchCenter, screenToCanvas, imageDimensions]);

  // Touch End
  const handleTouchEnd = useCallback((e: ReactTouchEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // 🆕 Important: empêcher le comportement par défaut aussi à la fin
    e.stopPropagation();
    setIsDragging(false);
    setTouchStartDistance(null);
    setLastTouchCenter(null);
  }, []);

  // ============================================================================
  // MOUSE HANDLERS (for desktop fallback)
  // ============================================================================

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = screenToCanvas(e.clientX, e.clientY);
    const hitPoint = findPointAtPosition(pos.x, pos.y);

    if (hitPoint) {
      setSelectedPointId(hitPoint.id);
      setIsDragging(true);
      setShowInstructions(false);
    }
  }, [screenToCanvas, findPointAtPosition]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !selectedPointId) return;

    const pos = screenToCanvas(e.clientX, e.clientY);
    const clampedX = Math.max(0, Math.min(imageDimensions.width, pos.x));
    const clampedY = Math.max(0, Math.min(imageDimensions.height, pos.y));

    setPoints(prev => prev.map(p =>
      p.id === selectedPointId ? { ...p, x: clampedX, y: clampedY } : p
    ));
  }, [isDragging, selectedPointId, screenToCanvas, imageDimensions]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const handleUndo = useCallback(() => {
    if (initialPoints.length > 0 && imageDimensions.width > 0) {
      const scaledPoints = initialPoints.map((p, i) => ({
        ...p,
        x: (p.x / 1000) * imageDimensions.width,
        y: (p.y / 1000) * imageDimensions.height,
        label: p.label || LABELS[i] || `P${i + 1}`
      }));
      setPoints(scaledPoints);
      message.info('Points réinitialisés');
    }
  }, [initialPoints, imageDimensions]);

  const handleValidate = useCallback(() => {
    if (points.length < minPoints) {
      message.error(`Minimum ${minPoints} points requis`);
      return;
    }

    const annotations: ImageAnnotations = {
      points: points.map(p => ({
        ...p,
        // Convert back to 0-1000 scale for storage
        x: (p.x / imageDimensions.width) * 1000,
        y: (p.y / imageDimensions.height) * 1000
      })),
      calibration: calibration || { pixelPerCm, referenceObject: 'estimated' },
      exclusionZones: [],
      unit
    };

    onValidate?.(annotations);
  }, [points, minPoints, imageDimensions, calibration, pixelPerCm, unit, onValidate]);

  const handleZoom = useCallback((delta: number) => {
    setScale(prev => Math.max(0.5, Math.min(4, prev + delta)));
  }, []);

  const resetView = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  // ============================================================================
  // RENDER
  // ============================================================================

  const progress = Math.round((points.length / minPoints) * 100);
  const isComplete = points.length >= minPoints;

  return (
    <div
      ref={containerRef}
      style={{
        position: isFullscreen ? 'fixed' : 'relative',
        top: isFullscreen ? 0 : undefined,
        left: isFullscreen ? 0 : undefined,
        right: isFullscreen ? 0 : undefined,
        bottom: isFullscreen ? 0 : undefined,
        zIndex: isFullscreen ? 9999 : undefined,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#000',
        touchAction: 'none', // Désactiver le scroll natif
        WebkitUserSelect: 'none', // Empêcher la sélection de texte sur iOS
        userSelect: 'none',
        WebkitTouchCallout: 'none', // Empêcher le menu contextuel sur iOS
        WebkitTapHighlightColor: 'transparent', // Supprimer le highlight au tap
        overscrollBehavior: 'none', // Empêcher le pull-to-refresh
        WebkitOverflowScrolling: 'touch'
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #333'
        }}
      >
        <Space>
          <Button 
            type="text" 
            icon={<CloseOutlined />} 
            onClick={onCancel}
            style={{ color: '#fff' }}
          />
          <Text style={{ color: '#fff', fontWeight: 600 }}>
            📐 Ajuster les points
          </Text>
        </Space>

        <Space>
          <Button
            type="text"
            icon={<UndoOutlined />}
            onClick={handleUndo}
            style={{ color: '#fff' }}
          />
          <Button
            type="text"
            icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            onClick={() => setIsFullscreen(!isFullscreen)}
            style={{ color: '#fff' }}
          />
        </Space>
      </div>

      {/* Progress bar */}
      <div style={{ padding: '8px 16px', backgroundColor: 'rgba(0, 0, 0, 0.8)' }}>
        <Progress 
          percent={Math.min(100, progress)} 
          size="small" 
          status={isComplete ? 'success' : 'active'}
          format={() => `${points.length}/${minPoints} points`}
          strokeColor={isComplete ? '#52c41a' : '#1890ff'}
        />
      </div>

      {/* Instructions overlay */}
      {showInstructions && points.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 120,
            left: 16,
            right: 16,
            padding: '16px',
            backgroundColor: 'rgba(24, 144, 255, 0.95)',
            borderRadius: 12,
            zIndex: 10,
            color: '#fff',
            textAlign: 'center'
          }}
          onClick={() => setShowInstructions(false)}
        >
          <div style={{ fontSize: 20, marginBottom: 8 }}>👆 Glissez les points</div>
          <Text style={{ color: '#fff' }}>
            Déplacez les cercles bleus pour ajuster la zone de mesure.
            <br />
            Pincez pour zoomer, 2 doigts pour naviguer.
          </Text>
        </div>
      )}

      {/* Canvas container */}
      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1a1a1a',
          touchAction: 'none', // Important: désactiver aussi sur le wrapper
          WebkitUserSelect: 'none',
          userSelect: 'none'
        }}
      >
        <canvas
          ref={canvasRef}
          width={imageDimensions.width * scale + Math.abs(offset.x) * 2}
          height={imageDimensions.height * scale + Math.abs(offset.y) * 2}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            touchAction: 'none', // Critique pour le canvas
            WebkitUserSelect: 'none',
            userSelect: 'none',
            WebkitTouchCallout: 'none'
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>

      {/* Bottom controls */}
      <div
        style={{
          padding: '16px',
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
          borderTop: '1px solid #333'
        }}
      >
        {/* Measurements display */}
        <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          {measurements.largeur_cm !== undefined && (
            <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>
              Largeur: {measurements.largeur_cm.toFixed(1)} cm
            </Tag>
          )}
          {measurements.hauteur_cm !== undefined && (
            <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>
              Hauteur: {measurements.hauteur_cm.toFixed(1)} cm
            </Tag>
          )}
          {measurements.surface_brute_m2 !== undefined && (
            <Tag color="green" style={{ fontSize: 14, padding: '4px 12px' }}>
              Surface: {measurements.surface_brute_m2.toFixed(2)} m²
            </Tag>
          )}
        </div>

        {/* Zoom controls */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 16 }}>
          <Button
            icon={<ZoomOutOutlined />}
            onClick={() => handleZoom(-0.25)}
            style={{ width: 48, height: 48 }}
          />
          <Button onClick={resetView} style={{ height: 48, minWidth: 80 }}>
            {Math.round(scale * 100)}%
          </Button>
          <Button
            icon={<ZoomInOutlined />}
            onClick={() => handleZoom(0.25)}
            style={{ width: 48, height: 48 }}
          />
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 12 }}>
          <Button
            block
            size="large"
            onClick={onCancel}
            style={{ flex: 1, height: 56 }}
          >
            Annuler
          </Button>
          <Button
            type="primary"
            block
            size="large"
            icon={<CheckOutlined />}
            onClick={handleValidate}
            disabled={!isComplete}
            style={{ flex: 2, height: 56, fontSize: 16 }}
          >
            Valider les mesures
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ImageMeasurementCanvasMobile;
