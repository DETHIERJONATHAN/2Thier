import React, { useEffect } from 'react';

interface Corner {
  x: number;
  y: number;
}

interface CoordinateGridProps {
  imageWidth: number;
  imageHeight: number;
  referenceCorners: {
    topLeft: Corner;
    topRight: Corner;
    bottomLeft: Corner;
    bottomRight: Corner;
  } | null;
  objectCorners: {
    topLeft: Corner;
    topRight: Corner;
    bottomLeft: Corner;
    bottomRight: Corner;
  } | null;
  pixelPerCmX: number;
  pixelPerCmY: number;
  scale?: number;
}

export const CoordinateGrid: React.FC<CoordinateGridProps> = ({
  imageWidth,
  imageHeight,
  referenceCorners,
  objectCorners,
  pixelPerCmX,
  pixelPerCmY,
  scale = 1,
}) => {
  // 🔍 DEBUG: Log les props quand ça change
  useEffect(() => {
    if (objectCorners) {
      console.log('🎯 [CoordinateGrid] Props reçus:');
      console.log('   objectCorners:', JSON.stringify(objectCorners, null, 2));
      console.log('   pixelPerCmX:', pixelPerCmX.toFixed(4));
      console.log('   pixelPerCmY:', pixelPerCmY.toFixed(4));
      console.log('   scale:', scale);
    }
  }, [objectCorners, pixelPerCmX, pixelPerCmY, scale]);

  // Convertir pixels en cm
  const pxToCm = (px: number, isHorizontal: boolean) => {
    const factor = isHorizontal ? pixelPerCmX : pixelPerCmY;
    return (px / factor).toFixed(1);
  };

  const pxToMm = (px: number, isHorizontal: boolean) => {
    const factor = isHorizontal ? pixelPerCmX : pixelPerCmY;
    return ((px / factor) * 10).toFixed(1);
  };

  return (
    <svg
      width={imageWidth * scale}
      height={imageHeight * scale}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 5,
      }}
    >
      {/* Métré A4 V10 - Grille de référence */}
      {referenceCorners && (
        <g>
          {/* Cadre du tag */}
          <polygon
            points={`
              ${referenceCorners.topLeft.x * scale},${referenceCorners.topLeft.y * scale}
              ${referenceCorners.topRight.x * scale},${referenceCorners.topRight.y * scale}
              ${referenceCorners.bottomRight.x * scale},${referenceCorners.bottomRight.y * scale}
              ${referenceCorners.bottomLeft.x * scale},${referenceCorners.bottomLeft.y * scale}
            `}
            fill="none"
            stroke="#00ff00"
            strokeWidth="2"
            opacity="0.6"
          />

          {/* Coins de la référence V10 avec labels */}
          {[
            {
              corner: referenceCorners.topLeft,
              label: 'TL',
              offsetX: -35,
              offsetY: -25,
            },
            {
              corner: referenceCorners.topRight,
              label: 'TR',
              offsetX: 10,
              offsetY: -25,
            },
            {
              corner: referenceCorners.bottomRight,
              label: 'BR',
              offsetX: 10,
              offsetY: 15,
            },
            {
              corner: referenceCorners.bottomLeft,
              label: 'BL',
              offsetX: -35,
              offsetY: 15,
            },
          ].map(({ corner, label, offsetX, offsetY }, idx) => (
            <g key={`tag-${idx}`}>
              {/* Carré de débogage autour du coin - VERT */}
              <rect
                x={(corner.x - 15) * scale}
                y={(corner.y - 15) * scale}
                width={30 * scale}
                height={30 * scale}
                fill="none"
                stroke="#00ff00"
                strokeWidth="1"
                opacity="0.3"
                strokeDasharray="2,2"
              />
              {/* Point */}
              <circle
                cx={corner.x * scale}
                cy={corner.y * scale}
                r="5"
                fill="#00ff00"
                opacity="0.9"
              />
              {/* Label + coordonnées */}
              <text
                x={(corner.x + offsetX) * scale}
                y={(corner.y + offsetY - 12) * scale}
                fontSize="12"
                fill="#00ff00"
                fontWeight="bold"
                textAnchor="middle"
                style={{
                  textShadow: '0 0 3px rgba(0,0,0,0.8)',
                  userSelect: 'none',
                }}
              >
                {label}
              </text>
              <text
                x={(corner.x + offsetX) * scale}
                y={(corner.y + offsetY + 2) * scale}
                fontSize="10"
                fill="#00ff00"
                textAnchor="middle"
                style={{
                  textShadow: '0 0 2px rgba(0,0,0,0.8)',
                  userSelect: 'none',
                }}
              >
                ({corner.x.toFixed(0)}, {corner.y.toFixed(0)})
              </text>
            </g>
          ))}

          {/* Mesures des côtés Référence V10 */}
          <g>
            {/* Top edge */}
            <text
              x={((referenceCorners.topLeft.x + referenceCorners.topRight.x) / 2) * scale}
              y={(referenceCorners.topLeft.y - 10) * scale}
              fontSize="11"
              fill="#00ff00"
              textAnchor="middle"
              style={{
                textShadow: '0 0 2px rgba(0,0,0,0.8)',
                userSelect: 'none',
              }}
            >
              T: {pxToMm(referenceCorners.topRight.x - referenceCorners.topLeft.x, true)}mm
            </text>
            {/* Bottom edge */}
            <text
              x={((referenceCorners.bottomLeft.x + referenceCorners.bottomRight.x) / 2) * scale}
              y={(referenceCorners.bottomLeft.y + 20) * scale}
              fontSize="11"
              fill="#00ff00"
              textAnchor="middle"
              style={{
                textShadow: '0 0 2px rgba(0,0,0,0.8)',
                userSelect: 'none',
              }}
            >
              B: {pxToMm(referenceCorners.bottomRight.x - referenceCorners.bottomLeft.x, true)}mm
            </text>
            {/* Left edge */}
            <text
              x={(referenceCorners.topLeft.x - 50) * scale}
              y={((referenceCorners.topLeft.y + referenceCorners.bottomLeft.y) / 2) * scale}
              fontSize="11"
              fill="#00ff00"
              textAnchor="middle"
              style={{
                textShadow: '0 0 2px rgba(0,0,0,0.8)',
                userSelect: 'none',
              }}
            >
              L: {pxToMm(referenceCorners.bottomLeft.y - referenceCorners.topLeft.y, false)}mm
            </text>
            {/* Right edge */}
            <text
              x={(referenceCorners.topRight.x + 50) * scale}
              y={((referenceCorners.topRight.y + referenceCorners.bottomRight.y) / 2) * scale}
              fontSize="11"
              fill="#00ff00"
              textAnchor="middle"
              style={{
                textShadow: '0 0 2px rgba(0,0,0,0.8)',
                userSelect: 'none',
              }}
            >
              R: {pxToMm(referenceCorners.bottomRight.y - referenceCorners.topRight.y, false)}mm
            </text>
          </g>
        </g>
      )}

      {/* Objet mesuré - Grille de l'objet */}
      {objectCorners && (
        <g>
          {/* Cadre de l'objet */}
          <polygon
            points={`
              ${objectCorners.topLeft.x * scale},${objectCorners.topLeft.y * scale}
              ${objectCorners.topRight.x * scale},${objectCorners.topRight.y * scale}
              ${objectCorners.bottomRight.x * scale},${objectCorners.bottomRight.y * scale}
              ${objectCorners.bottomLeft.x * scale},${objectCorners.bottomLeft.y * scale}
            `}
            fill="none"
            stroke="#ff00ff"
            strokeWidth="2"
            opacity="0.7"
          />

          {/* Coins de l'objet avec labels et coordonnées */}
          {[
            {
              corner: objectCorners.topLeft,
              label: 'A (TL)',
              offsetX: -45,
              offsetY: -30,
            },
            {
              corner: objectCorners.topRight,
              label: 'B (TR)',
              offsetX: 15,
              offsetY: -30,
            },
            {
              corner: objectCorners.bottomRight,
              label: 'D (BR)',
              offsetX: 15,
              offsetY: 20,
            },
            {
              corner: objectCorners.bottomLeft,
              label: 'C (BL)',
              offsetX: -45,
              offsetY: 20,
            },
          ].map(({ corner, label, offsetX, offsetY }, idx) => (
            <g key={`obj-${idx}`}>
              {/* Carré de débogage autour du coin - MAGENTA */}
              <rect
                x={(corner.x - 15) * scale}
                y={(corner.y - 15) * scale}
                width={30 * scale}
                height={30 * scale}
                fill="none"
                stroke="#ff00ff"
                strokeWidth="1"
                opacity="0.4"
                strokeDasharray="2,2"
              />
              {/* Point */}
              <circle
                cx={corner.x * scale}
                cy={corner.y * scale}
                r="5"
                fill="#ff00ff"
                opacity="0.9"
              />
              {/* Label */}
              <text
                x={(corner.x + offsetX) * scale}
                y={(corner.y + offsetY - 12) * scale}
                fontSize="12"
                fill="#ff00ff"
                fontWeight="bold"
                textAnchor="middle"
                style={{
                  textShadow: '0 0 3px rgba(0,0,0,0.8)',
                  userSelect: 'none',
                }}
              >
                {label}
              </text>
              {/* Coordonnées pixel */}
              <text
                x={(corner.x + offsetX) * scale}
                y={(corner.y + offsetY + 2) * scale}
                fontSize="10"
                fill="#ff00ff"
                textAnchor="middle"
                style={{
                  textShadow: '0 0 2px rgba(0,0,0,0.8)',
                  userSelect: 'none',
                }}
              >
                ({corner.x.toFixed(0)}, {corner.y.toFixed(0)})
              </text>
            </g>
          ))}

          {/* Mesures précises des côtés de l'objet */}
          <g>
            {/* Top edge */}
            <line
              x1={objectCorners.topLeft.x * scale}
              y1={(objectCorners.topLeft.y - 5) * scale}
              x2={objectCorners.topRight.x * scale}
              y2={(objectCorners.topRight.y - 5) * scale}
              stroke="#ff00ff"
              strokeWidth="1"
              opacity="0.4"
            />
            <text
              x={((objectCorners.topLeft.x + objectCorners.topRight.x) / 2) * scale}
              y={(objectCorners.topLeft.y - 25) * scale}
              fontSize="11"
              fill="#ff00ff"
              fontWeight="bold"
              textAnchor="middle"
              style={{
                textShadow: '0 0 2px rgba(0,0,0,0.8)',
                userSelect: 'none',
              }}
            >
              T: {pxToMm(objectCorners.topRight.x - objectCorners.topLeft.x, true)}mm ({pxToCm(objectCorners.topRight.x - objectCorners.topLeft.x, true)}cm)
            </text>

            {/* Bottom edge */}
            <line
              x1={objectCorners.bottomLeft.x * scale}
              y1={(objectCorners.bottomLeft.y + 5) * scale}
              x2={objectCorners.bottomRight.x * scale}
              y2={(objectCorners.bottomRight.y + 5) * scale}
              stroke="#ff00ff"
              strokeWidth="1"
              opacity="0.4"
            />
            <text
              x={((objectCorners.bottomLeft.x + objectCorners.bottomRight.x) / 2) * scale}
              y={(objectCorners.bottomLeft.y + 25) * scale}
              fontSize="11"
              fill="#ff00ff"
              fontWeight="bold"
              textAnchor="middle"
              style={{
                textShadow: '0 0 2px rgba(0,0,0,0.8)',
                userSelect: 'none',
              }}
            >
              B: {pxToMm(objectCorners.bottomRight.x - objectCorners.bottomLeft.x, true)}mm
            </text>

            {/* Left edge */}
            <line
              x1={(objectCorners.topLeft.x - 5) * scale}
              y1={objectCorners.topLeft.y * scale}
              x2={(objectCorners.bottomLeft.x - 5) * scale}
              y2={objectCorners.bottomLeft.y * scale}
              stroke="#ff00ff"
              strokeWidth="1"
              opacity="0.4"
            />
            <text
              x={(objectCorners.topLeft.x - 65) * scale}
              y={((objectCorners.topLeft.y + objectCorners.bottomLeft.y) / 2) * scale}
              fontSize="11"
              fill="#ff00ff"
              fontWeight="bold"
              textAnchor="middle"
              style={{
                textShadow: '0 0 2px rgba(0,0,0,0.8)',
                userSelect: 'none',
              }}
            >
              L: {pxToMm(objectCorners.bottomLeft.y - objectCorners.topLeft.y, false)}mm ({pxToCm(objectCorners.bottomLeft.y - objectCorners.topLeft.y, false)}cm)
            </text>

            {/* Right edge */}
            <line
              x1={(objectCorners.topRight.x + 5) * scale}
              y1={objectCorners.topRight.y * scale}
              x2={(objectCorners.bottomRight.x + 5) * scale}
              y2={objectCorners.bottomRight.y * scale}
              stroke="#ff00ff"
              strokeWidth="1"
              opacity="0.4"
            />
            <text
              x={(objectCorners.topRight.x + 65) * scale}
              y={((objectCorners.topRight.y + objectCorners.bottomRight.y) / 2) * scale}
              fontSize="11"
              fill="#ff00ff"
              fontWeight="bold"
              textAnchor="middle"
              style={{
                textShadow: '0 0 2px rgba(0,0,0,0.8)',
                userSelect: 'none',
              }}
            >
              R: {pxToMm(objectCorners.bottomRight.y - objectCorners.topRight.y, false)}mm
            </text>
          </g>
        </g>
      )}

      {/* Légende */}
      <g>
        <rect x="10" y="10" width="300" height="110" fill="rgba(0,0,0,0.75)" rx="4" />
        <text x="20" y="30" fontSize="13" fill="#00ff00" fontWeight="bold">
          🟩 Métré A4 V10 (Référence) = 130×205mm
        </text>
        <text x="20" y="50" fontSize="12" fill="#00ff00">
          X: {pixelPerCmX.toFixed(2)} px/cm | Y: {pixelPerCmY.toFixed(2)} px/cm
        </text>
        <text x="20" y="70" fontSize="13" fill="#ff00ff" fontWeight="bold">
          🟪 Objet Mesuré
        </text>
        <text x="20" y="90" fontSize="11" fill="#ffffff">
          A,B,C,D = coins mesurés
        </text>
        <text x="20" y="105" fontSize="11" fill="#ffffff">
          Carrés pointillés = zones ±15px
        </text>
      </g>
    </svg>
  );
};
