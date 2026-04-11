/**
 * ✍️ SignatureCanvas — Composant de signature manuscrite tactile/souris
 * 
 * Permet de dessiner une signature à main levée sur un canvas HTML5.
 * Exporte en base64 PNG.
 * Compatible desktop (souris) + mobile (tactile).
 */

import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { SF } from '../zhiive/ZhiiveTheme';

export interface SignatureCanvasRef {
  /** Exporte la signature en base64 data URL (PNG) */
  toDataURL: () => string;
  /** Efface le canvas */
  clear: () => void;
  /** Vérifie si le canvas est vide */
  isEmpty: () => boolean;
}

interface SignatureCanvasProps {
  width?: number;
  height?: number;
  penColor?: string;
  penWidth?: number;
  backgroundColor?: string;
  borderColor?: string;
  placeholder?: string;
  disabled?: boolean;
  onChange?: (isEmpty: boolean) => void;
  style?: React.CSSProperties;
}

const SignatureCanvas = forwardRef<SignatureCanvasRef, SignatureCanvasProps>(({
  width = 500,
  height = 200,
  penColor = SF.dark,
  penWidth = 2.5,
  backgroundColor = '#ffffff',
  borderColor = '#d9d9d9',
  placeholder = 'Signez ici avec votre souris ou votre doigt',
  disabled = false,
  onChange,
  style,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Initialiser le canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // DPI awareness pour écrans Retina
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Fond blanc
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Ligne de guide (pointillée)
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, height - 40);
    ctx.lineTo(width - 20, height - 40);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [width, height, backgroundColor]);

  const getCoordinates = useCallback((e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  }, []);

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    e.preventDefault();
    
    const point = getCoordinates(e);
    if (!point) return;
    
    setIsDrawing(true);
    lastPointRef.current = point;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [disabled, getCoordinates, penColor, penWidth]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || disabled) return;
    e.preventDefault();
    
    const point = getCoordinates(e);
    if (!point) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !lastPointRef.current) return;

    // Dessin lissé avec courbe de Bézier quadratique
    const midPoint = {
      x: (lastPointRef.current.x + point.x) / 2,
      y: (lastPointRef.current.y + point.y) / 2,
    };

    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.quadraticCurveTo(lastPointRef.current.x, lastPointRef.current.y, midPoint.x, midPoint.y);
    ctx.stroke();

    lastPointRef.current = point;
    
    if (!hasContent) {
      setHasContent(true);
      onChange?.(false);
    }
  }, [isDrawing, disabled, getCoordinates, penColor, penWidth, hasContent, onChange]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    lastPointRef.current = null;
  }, []);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    
    // Redessiner le fond
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
    
    // Redessiner la ligne guide
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, height - 40);
    ctx.lineTo(width - 20, height - 40);
    ctx.stroke();
    ctx.setLineDash([]);

    setHasContent(false);
    onChange?.(true);
  }, [backgroundColor, width, height, onChange]);

  const toDataURL = useCallback((): string => {
    const canvas = canvasRef.current;
    if (!canvas) return '';
    return canvas.toDataURL('image/png');
  }, []);

  const isEmpty = useCallback((): boolean => {
    return !hasContent;
  }, [hasContent]);

  // Exposer les méthodes via ref
  useImperativeHandle(ref, () => ({
    toDataURL,
    clear,
    isEmpty,
  }), [toDataURL, clear, isEmpty]);

  return (
    <div style={{ position: 'relative', display: 'inline-block', ...style }}>
      <canvas
        ref={canvasRef}
        style={{
          border: `2px solid ${disabled ? '#f0f0f0' : borderColor}`,
          borderRadius: 8,
          cursor: disabled ? 'not-allowed' : 'crosshair',
          touchAction: 'none', // Empêcher le scroll sur mobile
          opacity: disabled ? 0.5 : 1,
        }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      {!hasContent && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#bfbfbf',
            fontSize: 13,
            pointerEvents: 'none',
            textAlign: 'center',
            userSelect: 'none',
          }}
        >
          {placeholder}
        </div>
      )}
    </div>
  );
});

SignatureCanvas.displayName = 'SignatureCanvas';

export default SignatureCanvas;
