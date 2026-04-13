/**
 * 🎯 ReferenceDetectionOverlay - Visualisation de l'objet de référence détecté
 * 
 * Affiche un rectangle vert brillant sur l'objet de référence pour montrer
 * que le système l'a bien trouvé et utilisé pour calibrer les mesures
 */

import React from 'react';
import { Tag } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import { SF } from '../zhiive/ZhiiveTheme';

interface ReferenceDetectionOverlayProps {
  imageUrl: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence?: number;
  referenceType?: string;
  imageWidth?: number;
  imageHeight?: number;
}

export const ReferenceDetectionOverlay: React.FC<ReferenceDetectionOverlayProps> = ({
  imageUrl,
  boundingBox,
  confidence,
  referenceType,
  imageWidth = 800,
  imageHeight = 600
}) => {
  if (!boundingBox) {
    return (
      <div style={{ position: 'relative', maxWidth: imageWidth, margin: '0 auto' }}>
        <img loading="lazy" src={imageUrl} 
          alt="Mesure" 
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
      </div>
    );
  }

  // Calculer les dimensions réelles de l'image affichée
  const containerStyle: React.CSSProperties = {
    position: 'relative',
    maxWidth: imageWidth,
    margin: '0 auto',
    border: '2px solid #52c41a',
    borderRadius: '8px',
    overflow: 'hidden'
  };

  return (
    <div>
      {/* Tag de confirmation */}
      <div style={{ marginBottom: '12px', textAlign: 'center' }}>
        <Tag 
          icon={<CheckCircleOutlined />} 
          color="success" 
          style={{ fontSize: '14px', padding: '6px 12px' }}
        >
          📐 Référence détectée {confidence ? `(${Math.round(confidence * 100)}%)` : ''}
        </Tag>
      </div>

      <div style={containerStyle}>
        <img loading="lazy" src={imageUrl} 
          alt="Mesure avec référence" 
          style={{ width: '100%', height: 'auto', display: 'block' }}
          onLoad={(e) => {
            // Une fois l'image chargée, on peut calculer les positions exactes
            const img = e.currentTarget;
            const imgWidth = img.clientWidth;
            const imgHeight = img.clientHeight;
            
            // L'overlay s'ajuste automatiquement grâce aux pourcentages
          }}
        />
        
        {/* Rectangle vert brillant sur la référence */}
        <div
          style={{
            position: 'absolute',
            left: `${boundingBox.x}px`,
            top: `${boundingBox.y}px`,
            width: `${boundingBox.width}px`,
            height: `${boundingBox.height}px`,
            border: '3px solid #52c41a',
            backgroundColor: 'rgba(82, 196, 26, 0.15)',
            boxShadow: '0 0 20px rgba(82, 196, 26, 0.6), inset 0 0 20px rgba(82, 196, 26, 0.2)',
            borderRadius: '4px',
            pointerEvents: 'none',
            animation: 'pulse-green 2s ease-in-out infinite'
          }}
        />
        
        {/* Label avec le type de référence */}
        {referenceType && (
          <div
            style={{
              position: 'absolute',
              left: `${boundingBox.x}px`,
              top: `${boundingBox.y - 30}px`,
              backgroundColor: '#52c41a',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 'bold',
              boxShadow: '0 2px 8px ${SF.overlayDark}',
              whiteSpace: 'nowrap'
            }}
          >
            {referenceType}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse-green {
          0%, 100% {
            box-shadow: 0 0 20px rgba(82, 196, 26, 0.6), inset 0 0 20px rgba(82, 196, 26, 0.2);
          }
          50% {
            box-shadow: 0 0 30px rgba(82, 196, 26, 0.9), inset 0 0 30px rgba(82, 196, 26, 0.3);
          }
        }
      `}</style>
    </div>
  );
};

export default ReferenceDetectionOverlay;
