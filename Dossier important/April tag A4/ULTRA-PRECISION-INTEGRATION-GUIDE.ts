/**
 * 🔬 EXEMPLE D'INTÉGRATION - Route Ultra-Précision
 * 
 * Comment utiliser la nouvelle route `/ultra-precision-compute` 
 * avec les 41+ points détectés pour atteindre ±0.25cm de précision
 * 
 * @author 2Thier CRM Team
 * @version 1.0.0
 */

// ============================================================================
// EXEMPLE 1: React Hook - Utiliser la nouvelle route
// ============================================================================

import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { useMemo } from 'react';

export function useMeasurementUltraPrecision() {
  const { api } = useAuthenticatedApi();

  // Mémoriser l'API pour éviter les re-rendus inutiles
  const memoApi = useMemo(() => api, [api]);

  return {
    /**
     * Calcule les dimensions avec ultra-précision (41+ points)
     * 
     * @param detectedPoints - Points détectés par metre-a4-complete-detector
     * @param objectPoints - 4 coins cliqués par l'utilisateur
     * @param imageWidth, imageHeight - Dimensions de l'image
     * @returns Résultat ultra-précis avec profondeur et inclinaison
     */
    computeUltraPrecision: async (
      detectedPoints: Array<{
        pixel: { x: number; y: number };
        real: { x: number; y: number };
        type: 'apriltag' | 'dot' | 'apriltag-corner';
        confidence: number;
      }>,
      objectPoints: Array<{ x: number; y: number }>,
      imageWidth: number,
      imageHeight: number
    ) => {
      try {
        console.log(`\n🔬 Calcul ultra-précision avec ${detectedPoints.length} points...`);

        const response = await memoApi.post(
          '/api/measurement-reference/ultra-precision-compute',
          {
            detectedPoints,
            objectPoints,
            imageWidth,
            imageHeight,
            markerSizeCm: 13.0,
            markerHeightCm: 21.7,
            detectionMethod: 'AprilTag-Metre-V1.2',
            canvasScale: 1
          }
        );

        if (!response.success) {
          throw new Error(response.error || 'Échec du calcul ultra-précision');
        }

        return response;
      } catch (error) {
        console.error('❌ Erreur ultra-précision:', error);
        throw error;
      }
    },

    /**
     * Fallback: Utiliser l'ancienne route pour rapidité (±1cm)
     */
    computeSimple: async (
      fusedCorners: { topLeft: any; topRight: any; bottomRight: any; bottomLeft: any },
      objectPoints: Array<{ x: number; y: number }>,
      imageWidth: number,
      imageHeight: number
    ) => {
      const response = await memoApi.post(
        '/api/measurement-reference/compute-dimensions-simple',
        {
          fusedCorners,
          objectPoints,
          imageWidth,
          imageHeight,
          markerSizeCm: 13.0,
          markerHeightCm: 21.7
        }
      );

      return response;
    }
  };
}

// ============================================================================
// EXEMPLE 2: Composant React - Affichage des résultats
// ============================================================================

import React, { useState } from 'react';
import { Card, Statistic, Space, Tag, Alert, Button } from 'antd';

interface UltraPrecisionResult {
  success: boolean;
  method: string;
  object: {
    largeur_cm: number;
    hauteur_cm: number;
    largeur_mm: number;
    hauteur_mm: number;
  };
  uncertainties: {
    largeur_cm: number;
    hauteur_cm: number;
  };
  depth: {
    mean_mm: number;
    stdDev_mm: number;
    incline_angle_deg: number;
  };
  quality: {
    homography_quality: number;
    ransac_inliers: number;
    ransac_outliers: number;
    confidence: number;
    reprojectionError_mm: number;
  };
  precision: {
    type: string;
    description: string;
    points_used: number;
    method: string;
  };
}

export const UltraPrecisionResult: React.FC<{ result: UltraPrecisionResult }> = ({ result }) => {
  return (
    <div style={{ padding: '20px' }}>
      {/* Alerte de précision ultra-élevée */}
      <Alert
        message="🔬 Mesure Ultra-Précise"
        description={`${result.precision.description} - ${result.precision.points_used} points utilisés`}
        type="success"
        showIcon
        style={{ marginBottom: '20px' }}
      />

      {/* Dimensions principales */}
      <Card title="📏 Dimensions Mesurées" style={{ marginBottom: '20px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <strong>Largeur:</strong> {result.object.largeur_cm.toFixed(2)} cm
            <Tag color="green" style={{ marginLeft: '10px' }}>
              ±{result.uncertainties.largeur_cm.toFixed(3)} cm
            </Tag>
            <span style={{ marginLeft: '10px', fontSize: '12px', color: '#888' }}>
              ({result.object.largeur_mm.toFixed(1)}mm)
            </span>
          </div>
          <div>
            <strong>Hauteur:</strong> {result.object.hauteur_cm.toFixed(2)} cm
            <Tag color="green" style={{ marginLeft: '10px' }}>
              ±{result.uncertainties.hauteur_cm.toFixed(3)} cm
            </Tag>
            <span style={{ marginLeft: '10px', fontSize: '12px', color: '#888' }}>
              ({result.object.hauteur_mm.toFixed(1)}mm)
            </span>
          </div>
        </Space>
      </Card>

      {/* Données 3D */}
      <Card title="📐 Analyse 3D" style={{ marginBottom: '20px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <strong>Profondeur caméra:</strong> {result.depth.mean_mm.toFixed(0)} mm
            <Tag style={{ marginLeft: '10px' }}>±{result.depth.stdDev_mm.toFixed(0)} mm</Tag>
          </div>
          <div>
            <strong>Inclinaison objet:</strong> {result.depth.incline_angle_deg.toFixed(2)}°
            {result.depth.incline_angle_deg > 2 && (
              <Tag color="orange" style={{ marginLeft: '10px' }}>
                ⚠️ Objet incliné
              </Tag>
            )}
          </div>
        </Space>
      </Card>

      {/* Qualité et confiance */}
      <Card title="🎯 Qualité de la Mesure" style={{ marginBottom: '20px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <strong>Qualité homographie:</strong>
            <Tag
              color={result.quality.homography_quality > 90 ? 'green' : 'orange'}
              style={{ marginLeft: '10px' }}
            >
              {result.quality.homography_quality.toFixed(1)}%
            </Tag>
          </div>
          <div>
            <strong>Inliers RANSAC:</strong>
            <Tag style={{ marginLeft: '10px' }}>
              {result.quality.ransac_inliers}/{result.quality.ransac_inliers + result.quality.ransac_outliers}
              ({((result.quality.ransac_inliers / (result.quality.ransac_inliers + result.quality.ransac_outliers)) * 100).toFixed(0)}%)
            </Tag>
          </div>
          <div>
            <strong>Confiance:</strong>
            <Tag
              color={result.quality.confidence > 90 ? 'green' : 'orange'}
              style={{ marginLeft: '10px' }}
            >
              {result.quality.confidence.toFixed(0)}%
            </Tag>
          </div>
          <div>
            <strong>Erreur reprojection:</strong>
            <Tag color="blue" style={{ marginLeft: '10px' }}>
              ±{result.quality.reprojectionError_mm.toFixed(2)} mm
            </Tag>
          </div>
        </Space>
      </Card>

      {/* Méthode utilisée */}
      <Card title="🔧 Méthode" style={{ marginBottom: '20px' }}>
        <p>
          <strong>Algorithme:</strong> {result.precision.method}
        </p>
        <p style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
          {result.precision.description}
        </p>
      </Card>
    </div>
  );
};

// ============================================================================
// EXEMPLE 3: Flux complet de mesure
// ============================================================================

/**
 * Flux de mesure complet:
 * 1. Prendre photo du marqueur AprilTag Métré
 * 2. Détecter les 41+ points (via detectMetreA4Complete)
 * 3. L'utilisateur clique les 4 coins de l'objet
 * 4. Appeler /ultra-precision-compute
 * 5. Afficher résultat ±0.25cm
 */

export const MeasurementWorkflow = () => {
  const [photo, setPhoto] = useState<string | null>(null);
  const [detectedPoints, setDetectedPoints] = useState<any[]>([]);
  const [objectPoints, setObjectPoints] = useState<any[]>([]);
  const [result, setResult] = useState<UltraPrecisionResult | null>(null);
  const [loading, setLoading] = useState(false);

  const { computeUltraPrecision } = useMeasurementUltraPrecision();

  const handleMeasure = async () => {
    if (!detectedPoints || detectedPoints.length < 10) {
      alert('Erreur: 41+ points doivent être détectés');
      return;
    }

    if (objectPoints.length !== 4) {
      alert('Erreur: 4 coins de l\'objet doivent être cliqués');
      return;
    }

    try {
      setLoading(true);
      const res = await computeUltraPrecision(
        detectedPoints,
        objectPoints,
        1080, // image width
        1920  // image height
      );
      setResult(res);
    } catch (error) {
      alert(`Erreur: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>🔬 Mesure Ultra-Précise</h2>

      {/* Affichage du flux */}
      <Button
        onClick={handleMeasure}
        loading={loading}
        type="primary"
        size="large"
        disabled={detectedPoints.length < 10 || objectPoints.length !== 4}
      >
        🔬 Calculer (±0.25cm)
      </Button>

      {result && <UltraPrecisionResult result={result} />}
    </div>
  );
};

// ============================================================================
// EXEMPLE 4: Appel direct de l'API (fetch brut)
// ============================================================================

async function measureWithUltraPrecision() {
  const detectedPoints = [
    // 4 AprilTag corners
    { pixel: { x: 100, y: 100 }, real: { x: 0, y: 0 }, type: 'apriltag', confidence: 0.99 },
    { pixel: { x: 300, y: 100 }, real: { x: 130, y: 0 }, type: 'apriltag', confidence: 0.99 },
    { pixel: { x: 300, y: 300 }, real: { x: 130, y: 217 }, type: 'apriltag', confidence: 0.99 },
    { pixel: { x: 100, y: 300 }, real: { x: 0, y: 217 }, type: 'apriltag', confidence: 0.99 },

    // 12 dots (dispersés)
    { pixel: { x: 150, y: 150 }, real: { x: 30, y: 30 }, type: 'dot', confidence: 0.85 },
    // ... 11 autres dots

    // 20 coins AprilTag (4 coins × 5 tags)
    { pixel: { x: 120, y: 120 }, real: { x: 25, y: 25 }, type: 'apriltag-corner', confidence: 0.80 },
    // ... 19 autres coins AprilTag
  ];

  const objectPoints = [
    { x: 400, y: 400 },   // TL cliqué par l'utilisateur
    { x: 700, y: 400 },   // TR
    { x: 700, y: 600 },   // BR
    { x: 400, y: 600 }    // BL
  ];

  const response = await fetch(
    'http://localhost:4000/api/measurement-reference/ultra-precision-compute',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        detectedPoints,
        objectPoints,
        imageWidth: 1080,
        imageHeight: 1920,
        markerSizeCm: 13.0,
        markerHeightCm: 21.7,
        detectionMethod: 'AprilTag-Metre-V1.2'
      })
    }
  );

  const result = await response.json();

  console.log(`
    ✅ Résultat Ultra-Précision:
    📏 Largeur: ${result.object.largeur_cm.toFixed(2)} cm (±${result.uncertainties.largeur_cm.toFixed(3)} cm)
    📏 Hauteur: ${result.object.hauteur_cm.toFixed(2)} cm (±${result.uncertainties.hauteur_cm.toFixed(3)} cm)
    📐 Profondeur: ${result.depth.mean_mm.toFixed(0)} mm (±${result.depth.stdDev_mm.toFixed(0)} mm)
    🎯 Qualité: ${result.quality.homography_quality.toFixed(1)}%
    📊 RANSAC: ${result.quality.ransac_inliers}/${result.quality.ransac_inliers + result.quality.ransac_outliers} inliers
  `);

  return result;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  useMeasurementUltraPrecision,
  UltraPrecisionResult,
  MeasurementWorkflow,
  measureWithUltraPrecision
};
