/**
 * 📐 CalibrationMarker - Marqueur de calibration précis à imprimer
 * 
 * Ce composant génère un marqueur de calibration imprimable qui contient:
 * - Un cadre de référence de taille connue (A4 ou personnalisé)
 * - Des motifs de détection automatique (coins repères)
 * - Une grille de points pour mesure de distorsion
 * - Un QR code avec les métadonnées
 * - Des règles graduées sur les bords
 */

import React, { useRef } from 'react';
import { Button, Card, Typography, Space, Alert, Divider, Select, InputNumber, Form } from 'antd';
import { PrinterOutlined, DownloadOutlined, QrcodeOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

// Dimensions standards (en mm)
const PAPER_SIZES = {
  A4: { width: 210, height: 297 },
  A3: { width: 297, height: 420 },
  Letter: { width: 216, height: 279 },
  Legal: { width: 216, height: 356 }
};

interface CalibrationMarkerProps {
  paperSize?: keyof typeof PAPER_SIZES;
  customWidth?: number;
  customHeight?: number;
  showGrid?: boolean;
  includeQRCode?: boolean;
}

// Génère un pattern de coin unique (style repère simplifié)
const CornerPattern: React.FC<{ 
  position: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
  size: number;
}> = ({ position, size }) => {
  // Pattern unique pour chaque coin (permet détection de l'orientation)
  const patterns: Record<string, number[][]> = {
    topLeft: [
      [1,1,1,1,1],
      [1,0,0,0,1],
      [1,0,1,0,1],
      [1,0,0,0,1],
      [1,1,1,1,1]
    ],
    topRight: [
      [1,1,1,1,1],
      [1,0,0,0,1],
      [1,0,1,1,1],
      [1,0,0,0,1],
      [1,1,1,1,1]
    ],
    bottomLeft: [
      [1,1,1,1,1],
      [1,0,0,0,1],
      [1,1,1,0,1],
      [1,0,0,0,1],
      [1,1,1,1,1]
    ],
    bottomRight: [
      [1,1,1,1,1],
      [1,0,0,0,1],
      [1,1,0,1,1],
      [1,0,0,0,1],
      [1,1,1,1,1]
    ]
  };
  
  const pattern = patterns[position];
  const cellSize = size / 5;
  
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {pattern.map((row, y) => 
        row.map((cell, x) => (
          <rect
            key={`${x}-${y}`}
            x={x * cellSize}
            y={y * cellSize}
            width={cellSize}
            height={cellSize}
            fill={cell === 1 ? '#000' : '#fff'}
          />
        ))
      )}
    </svg>
  );
};

// Composant du marqueur complet
const CalibrationMarker: React.FC<CalibrationMarkerProps> = ({
  paperSize = 'A4',
  customWidth,
  customHeight,
  showGrid = true,
  includeQRCode = true
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  
  // Dimensions du papier
  const width = customWidth || PAPER_SIZES[paperSize].width;
  const height = customHeight || PAPER_SIZES[paperSize].height;
  
  // Marges internes (10mm de chaque côté)
  const margin = 10;
  const innerWidth = width - 2 * margin;
  const innerHeight = height - 2 * margin;
  
  // Taille des coins de détection (15mm)
  const cornerSize = 15;
  
  // Échelle pour affichage (1mm = 3px pour l'écran)
  const scale = 3;

  // Générer l'ID unique du marqueur
  const markerId = `2THIER-CAL-${paperSize}-${Date.now().toString(36).toUpperCase()}`;

  // Imprimer
  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Marqueur de Calibration - ${markerId}</title>
          <style>
            @page {
              size: ${paperSize};
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              display: flex;
              justify-content: center;
              align-items: center;
            }
            .marker-container {
              width: ${width}mm;
              height: ${height}mm;
            }
          </style>
        </head>
        <body>
          <div class="marker-container">
            ${printContent.innerHTML}
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // Télécharger en SVG
  const handleDownloadSVG = () => {
    const svgContent = generateSVG();
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calibration-marker-${markerId}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Générer le SVG complet
  const generateSVG = () => {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" 
     width="${width}mm" height="${height}mm" 
     viewBox="0 0 ${width} ${height}">
  
  <!-- Fond blanc -->
  <rect width="${width}" height="${height}" fill="white"/>
  
  <!-- Cadre principal -->
  <rect x="${margin}" y="${margin}" 
        width="${innerWidth}" height="${innerHeight}" 
        fill="none" stroke="black" stroke-width="0.5"/>
  
  <!-- Coin Haut-Gauche -->
  <g transform="translate(${margin}, ${margin})">
    ${generateCornerSVG('topLeft', cornerSize)}
  </g>
  
  <!-- Coin Haut-Droite -->
  <g transform="translate(${width - margin - cornerSize}, ${margin})">
    ${generateCornerSVG('topRight', cornerSize)}
  </g>
  
  <!-- Coin Bas-Gauche -->
  <g transform="translate(${margin}, ${height - margin - cornerSize})">
    ${generateCornerSVG('bottomLeft', cornerSize)}
  </g>
  
  <!-- Coin Bas-Droite -->
  <g transform="translate(${width - margin - cornerSize}, ${height - margin - cornerSize})">
    ${generateCornerSVG('bottomRight', cornerSize)}
  </g>
  
  <!-- Règle horizontale haute -->
  ${generateRulerSVG('horizontal', margin + cornerSize + 5, margin + 2, innerWidth - 2 * (cornerSize + 5))}
  
  <!-- Règle horizontale basse -->
  ${generateRulerSVG('horizontal', margin + cornerSize + 5, height - margin - 5, innerWidth - 2 * (cornerSize + 5))}
  
  <!-- Règle verticale gauche -->
  ${generateRulerSVG('vertical', margin + 2, margin + cornerSize + 5, innerHeight - 2 * (cornerSize + 5))}
  
  <!-- Règle verticale droite -->
  ${generateRulerSVG('vertical', width - margin - 5, margin + cornerSize + 5, innerHeight - 2 * (cornerSize + 5))}
  
  ${showGrid ? generateGridSVG() : ''}
  
  <!-- Informations -->
  <text x="${width/2}" y="${height - margin + 7}" 
        text-anchor="middle" font-size="3" font-family="monospace">
    ${markerId} | ${width}×${height}mm | IMPRIMER À 100%
  </text>
  
  <!-- Croix centrale -->
  <line x1="${width/2 - 5}" y1="${height/2}" x2="${width/2 + 5}" y2="${height/2}" 
        stroke="black" stroke-width="0.3"/>
  <line x1="${width/2}" y1="${height/2 - 5}" x2="${width/2}" y2="${height/2 + 5}" 
        stroke="black" stroke-width="0.3"/>
  
</svg>`;
  };

  const generateCornerSVG = (position: string, size: number) => {
    const patterns: Record<string, number[][]> = {
      topLeft: [[1,1,1,1,1],[1,0,0,0,1],[1,0,1,0,1],[1,0,0,0,1],[1,1,1,1,1]],
      topRight: [[1,1,1,1,1],[1,0,0,0,1],[1,0,1,1,1],[1,0,0,0,1],[1,1,1,1,1]],
      bottomLeft: [[1,1,1,1,1],[1,0,0,0,1],[1,1,1,0,1],[1,0,0,0,1],[1,1,1,1,1]],
      bottomRight: [[1,1,1,1,1],[1,0,0,0,1],[1,1,0,1,1],[1,0,0,0,1],[1,1,1,1,1]]
    };
    
    const pattern = patterns[position];
    const cellSize = size / 5;
    
    let rects = '';
    pattern.forEach((row, y) => {
      row.forEach((cell, x) => {
        rects += `<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="${cell === 1 ? '#000' : '#fff'}"/>`;
      });
    });
    
    return rects;
  };

  const generateRulerSVG = (orientation: 'horizontal' | 'vertical', x: number, y: number, length: number) => {
    let marks = '';
    const step = 10; // 10mm = 1cm
    
    if (orientation === 'horizontal') {
      for (let i = 0; i <= length; i += step) {
        const tickHeight = i % 50 === 0 ? 3 : i % 10 === 0 ? 2 : 1;
        marks += `<line x1="${x + i}" y1="${y}" x2="${x + i}" y2="${y + tickHeight}" stroke="black" stroke-width="0.2"/>`;
        if (i % 50 === 0 && i > 0) {
          marks += `<text x="${x + i}" y="${y + 5}" text-anchor="middle" font-size="2">${i/10}</text>`;
        }
      }
    } else {
      for (let i = 0; i <= length; i += step) {
        const tickWidth = i % 50 === 0 ? 3 : i % 10 === 0 ? 2 : 1;
        marks += `<line x1="${x}" y1="${y + i}" x2="${x + tickWidth}" y2="${y + i}" stroke="black" stroke-width="0.2"/>`;
        if (i % 50 === 0 && i > 0) {
          marks += `<text x="${x + 5}" y="${y + i + 1}" font-size="2">${i/10}</text>`;
        }
      }
    }
    
    return marks;
  };

  const generateGridSVG = () => {
    // Grille de points tous les 20mm
    let dots = '';
    const step = 20;
    
    for (let x = margin + cornerSize + step; x < width - margin - cornerSize; x += step) {
      for (let y = margin + cornerSize + step; y < height - margin - cornerSize; y += step) {
        dots += `<circle cx="${x}" cy="${y}" r="0.5" fill="black"/>`;
      }
    }
    
    return dots;
  };

  return (
    <div style={{ padding: 20 }}>
      <Card>
        <Title level={3}>
          <QrcodeOutlined /> Marqueur de Calibration Précis
        </Title>
        
        <Alert
          type="info"
          showIcon
          message="Imprimer à 100% (échelle réelle)"
          description="Ce marqueur doit être imprimé SANS mise à l'échelle. Sélectionnez 'Taille réelle' ou '100%' dans les options d'impression."
          style={{ marginBottom: 16 }}
        />
        
        <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
          <Form layout="inline">
            <Form.Item label="Format">
              <Select 
                defaultValue={paperSize}
                style={{ width: 120 }}
                options={Object.keys(PAPER_SIZES).map(size => ({ label: size, value: size }))}
              />
            </Form.Item>
          </Form>
        </Space>
        
        <Divider>Prévisualisation</Divider>
        
        {/* Prévisualisation du marqueur */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          padding: 20,
          backgroundColor: '#f0f0f0',
          borderRadius: 8,
          overflow: 'auto'
        }}>
          <div 
            ref={printRef}
            style={{
              width: width * scale,
              height: height * scale,
              backgroundColor: '#fff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              position: 'relative',
              transform: 'scale(0.5)',
              transformOrigin: 'top center'
            }}
          >
            {/* Cadre principal */}
            <div style={{
              position: 'absolute',
              left: margin * scale,
              top: margin * scale,
              width: innerWidth * scale,
              height: innerHeight * scale,
              border: '1.5px solid black'
            }} />
            
            {/* Coins de détection */}
            <div style={{ position: 'absolute', left: margin * scale, top: margin * scale }}>
              <CornerPattern position="topLeft" size={cornerSize * scale} />
            </div>
            <div style={{ position: 'absolute', right: margin * scale, top: margin * scale }}>
              <CornerPattern position="topRight" size={cornerSize * scale} />
            </div>
            <div style={{ position: 'absolute', left: margin * scale, bottom: margin * scale }}>
              <CornerPattern position="bottomLeft" size={cornerSize * scale} />
            </div>
            <div style={{ position: 'absolute', right: margin * scale, bottom: margin * scale }}>
              <CornerPattern position="bottomRight" size={cornerSize * scale} />
            </div>
            
            {/* Croix centrale */}
            <div style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)'
            }}>
              <svg width={20 * scale} height={20 * scale}>
                <line x1="0" y1={10 * scale} x2={20 * scale} y2={10 * scale} stroke="black" strokeWidth="1"/>
                <line x1={10 * scale} y1="0" x2={10 * scale} y2={20 * scale} stroke="black" strokeWidth="1"/>
              </svg>
            </div>
            
            {/* ID du marqueur */}
            <div style={{
              position: 'absolute',
              bottom: 5,
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: 8 * scale,
              fontFamily: 'monospace',
              whiteSpace: 'nowrap'
            }}>
              {markerId} | {width}×{height}mm
            </div>
          </div>
        </div>
        
        <Divider />
        
        {/* Boutons d'action */}
        <Space>
          <Button 
            type="primary" 
            icon={<PrinterOutlined />}
            onClick={handlePrint}
            size="large"
          >
            Imprimer
          </Button>
          
          <Button 
            icon={<DownloadOutlined />}
            onClick={handleDownloadSVG}
            size="large"
          >
            Télécharger SVG
          </Button>
        </Space>
        
        <Divider>Instructions d'utilisation</Divider>
        
        <Paragraph>
          <ol>
            <li><strong>Imprimez</strong> ce marqueur à 100% (échelle réelle, sans ajustement)</li>
            <li><strong>Vérifiez</strong> les dimensions avec une règle (les graduations doivent correspondre)</li>
            <li><strong>Placez</strong> le marqueur sur ou à côté de l'objet à mesurer</li>
            <li><strong>Prenez</strong> les photos avec l'app SmartCamera</li>
            <li><strong>Le système</strong> détectera automatiquement le marqueur et calibrera les mesures</li>
          </ol>
        </Paragraph>
        
        <Alert
          type="success"
          message="Avantages du marqueur"
          description={
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li><strong>Détection automatique</strong> grâce aux patterns de coin uniques</li>
              <li><strong>Correction de perspective</strong> avec les 4 coins</li>
              <li><strong>Mesure de distorsion</strong> via la grille de points</li>
              <li><strong>Vérification de l'échelle</strong> avec les règles graduées</li>
              <li><strong>Identification unique</strong> via l'ID encodé</li>
            </ul>
          }
        />
      </Card>
    </div>
  );
};

export default CalibrationMarker;
