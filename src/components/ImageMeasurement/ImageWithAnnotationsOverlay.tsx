/**
 * 📐 IMAGE WITH ANNOTATIONS OVERLAY
 * 
 * Composant qui affiche une image avec les annotations de mesure dessinées par-dessus :
 * - Quadrilatère de référence (référence verte)
 * - Lignes de mesure avec labels
 * - Points A, B, C, D
 * 
 * Utilisé pour :
 * - Modal plein écran dans TBLImageFieldWithAI
 * - Preview des mesures enregistrées
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import type { ImageAnnotations } from '../../types/measurement';

interface ImageWithAnnotationsOverlayProps {
  /** URL de l'image source */
  imageUrl: string;
  /** Annotations sauvegardées (referenceCorners, measurementPoints, etc.) */
  annotations?: ImageAnnotations | null;
  /** Style du conteneur */
  style?: React.CSSProperties;
  /** Classe CSS */
  className?: string;
  /** Callback quand l'image est chargée */
  onLoad?: () => void;
}

/**
 * Calcule la distance entre deux points en pixels
 */
const distancePx = (p1: { x: number; y: number }, p2: { x: number; y: number }): number => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

/**
 * Calcule le point milieu entre deux points
 */
const midPoint = (p1: { x: number; y: number }, p2: { x: number; y: number }) => ({
  x: (p1.x + p2.x) / 2,
  y: (p1.y + p2.y) / 2
});

const ImageWithAnnotationsOverlay: React.FC<ImageWithAnnotationsOverlayProps> = ({
  imageUrl,
  annotations,
  style,
  className,
  onLoad
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Charger l'image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
      onLoad?.();
    };
    img.onerror = () => {
      console.error('❌ [ImageWithAnnotationsOverlay] Erreur chargement image');
    };
    img.src = imageUrl;
    
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [imageUrl, onLoad]);

  // Observer le resize du conteneur
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDisplaySize({ width, height });
        }
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Calculer le scale entre l'image originale et l'affichage
  const scale = useMemo(() => {
    if (!imageRef.current || displaySize.width === 0) return 1;
    const img = imageRef.current;
    // Calculer le scale pour fit l'image dans le conteneur
    const scaleX = displaySize.width / img.width;
    const scaleY = displaySize.height / img.height;
    return Math.min(scaleX, scaleY, 1);
  }, [displaySize]);

  // Dessiner les annotations
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imageRef.current;
    
    if (!canvas || !ctx || !img || !imageLoaded) return;

    // Dimensionner le canvas à la taille affichée
    const canvasWidth = img.width * scale;
    const canvasHeight = img.height * scale;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Dessiner l'image
    ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);

    if (!annotations) return;

    // Calculer le ratio entre les dimensions sauvegardées et les dimensions actuelles
    const savedDims = annotations.imageDimensions;
    let ratioX = 1;
    let ratioY = 1;
    
    if (savedDims) {
      ratioX = canvasWidth / savedDims.width;
      ratioY = canvasHeight / savedDims.height;
    }

    // 🎯 DESSINER LE QUADRILATÈRE DE RÉFÉRENCE
    if (annotations.referenceCorners) {
      const corners = annotations.referenceCorners;
      
      // Convertir les positions avec le ratio
      const scaledCorners = {
        topLeft: { x: corners.topLeft.x * ratioX, y: corners.topLeft.y * ratioY },
        topRight: { x: corners.topRight.x * ratioX, y: corners.topRight.y * ratioY },
        bottomRight: { x: corners.bottomRight.x * ratioX, y: corners.bottomRight.y * ratioY },
        bottomLeft: { x: corners.bottomLeft.x * ratioX, y: corners.bottomLeft.y * ratioY }
      };

      // Dessiner le quadrilatère (vert)
      ctx.strokeStyle = '#52c41a';
      ctx.lineWidth = 3;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(scaledCorners.topLeft.x, scaledCorners.topLeft.y);
      ctx.lineTo(scaledCorners.topRight.x, scaledCorners.topRight.y);
      ctx.lineTo(scaledCorners.bottomRight.x, scaledCorners.bottomRight.y);
      ctx.lineTo(scaledCorners.bottomLeft.x, scaledCorners.bottomLeft.y);
      ctx.closePath();
      ctx.stroke();

      // Dessiner les cercles aux coins (A, B, C, D)
      const cornerLabels = ['A', 'B', 'C', 'D'];
      const cornerPoints = [
        scaledCorners.topLeft,
        scaledCorners.topRight,
        scaledCorners.bottomRight,
        scaledCorners.bottomLeft
      ];

      cornerPoints.forEach((point, idx) => {
        // Cercle
        ctx.fillStyle = '#52c41a';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
        ctx.fill();

        // Label
        ctx.fillStyle = 'white';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cornerLabels[idx], point.x, point.y);
      });

      // Label référence au centre
      const center = {
        x: (scaledCorners.topLeft.x + scaledCorners.bottomRight.x) / 2,
        y: (scaledCorners.topLeft.y + scaledCorners.bottomRight.y) / 2
      };
      
      const labelText = 'Métré A4 V10 (13×20.5cm)';
      
      // Fond du label
      ctx.font = 'bold 12px Arial';
      const textWidth = ctx.measureText(labelText).width;
      ctx.fillStyle = 'rgba(82, 196, 26, 0.9)';
      ctx.fillRect(center.x - textWidth / 2 - 6, center.y - 10, textWidth + 12, 20);
      
      // Texte
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, center.x, center.y);
    }

    // 📏 DESSINER LES LIGNES DE MESURE
    if (annotations.measurementPoints && annotations.measurementPoints.length >= 2) {
      const points = annotations.measurementPoints;
      const pixelPerCm = annotations.calibration?.pixelPerCm || 10;

      // Convertir les points avec le ratio
      const scaledPoints = points.map(p => ({
        ...p,
        x: p.x * ratioX,
        y: p.y * ratioY
      }));

      // Dessiner les lignes entre les points
      ctx.strokeStyle = '#1890ff';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.beginPath();
      
      scaledPoints.forEach((point, idx) => {
        if (idx === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      
      // Fermer le polygone si 4+ points
      if (scaledPoints.length >= 4) {
        ctx.closePath();
      }
      ctx.stroke();

      // Dessiner les points
      scaledPoints.forEach((point, idx) => {
        // Cercle
        ctx.fillStyle = point.color || '#1890ff';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 10, 0, Math.PI * 2);
        ctx.fill();

        // Bordure blanche
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(point.label || String.fromCharCode(65 + idx), point.x, point.y);
      });

      // Dessiner les mesures sur chaque segment
      for (let i = 0; i < scaledPoints.length; i++) {
        const nextIdx = (i + 1) % scaledPoints.length;
        if (i === scaledPoints.length - 1 && scaledPoints.length < 4) break; // Ne pas fermer si < 4 points
        
        const p1 = scaledPoints[i];
        const p2 = scaledPoints[nextIdx];
        
        // Calculer la distance originale (avant scale)
        const originalP1 = points[i];
        const originalP2 = points[nextIdx];
        const distPx = distancePx(originalP1, originalP2);
        const distCm = distPx / (pixelPerCm * ratioX); // Ajuster pour le ratio
        
        // Point milieu
        const mid = midPoint(p1, p2);
        
        // Label de distance
        const measureLabel = `${distCm.toFixed(1)} cm`;
        ctx.font = 'bold 11px Arial';
        const labelWidth = ctx.measureText(measureLabel).width;
        
        // Fond du label
        ctx.fillStyle = 'rgba(24, 144, 255, 0.9)';
        ctx.fillRect(mid.x - labelWidth / 2 - 4, mid.y - 8, labelWidth + 8, 16);
        
        // Texte
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(measureLabel, mid.x, mid.y);
      }
    }

    // Afficher les mesures finales si disponibles
    if (annotations.measurements) {
      const m = annotations.measurements;
      const lines: string[] = [];
      
      if (m.largeur_cm) lines.push(`Largeur: ${m.largeur_cm.toFixed(1)} cm`);
      if (m.hauteur_cm) lines.push(`Hauteur: ${m.hauteur_cm.toFixed(1)} cm`);
      if (m.surface_brute_cm2) lines.push(`Surface: ${(m.surface_brute_cm2 / 10000).toFixed(3)} m²`);
      
      if (lines.length > 0) {
        // Fond semi-transparent en bas à droite
        const padding = 10;
        const lineHeight = 18;
        const boxWidth = 150;
        const boxHeight = lines.length * lineHeight + padding * 2;
        const boxX = canvasWidth - boxWidth - 10;
        const boxY = canvasHeight - boxHeight - 10;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
        
        // Texte
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        lines.forEach((line, idx) => {
          ctx.fillText(line, boxX + padding, boxY + padding + idx * lineHeight);
        });
      }
    }

  }, [imageLoaded, annotations, scale, displaySize]);

  return (
    <div 
      ref={containerRef}
      className={className}
      style={{ 
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#000',
        ...style 
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain'
        }}
      />
    </div>
  );
};

export default ImageWithAnnotationsOverlay;
