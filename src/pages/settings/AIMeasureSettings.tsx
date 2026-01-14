import React, { useState, useEffect, useCallback } from 'react';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { toast } from 'react-toastify';
import { generateArucoMarkerSvg, downloadArucoMarkerSvg } from '../../utils/arucoMarkerSvg';
import { 
  Card, 
  Button, 
  InputNumber, 
  Space, 
  Spin, 
  Typography, 
  Divider, 
  Alert,
  Row,
  Col,
  Tooltip
} from 'antd';
import { 
  DownloadOutlined, 
  SaveOutlined, 
  InfoCircleOutlined,
  CameraOutlined,
  PrinterOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

// ==========================================
// 🎯 CONFIGURATION MARQUEUR MÉTRÉ A4 V1.2
// ==========================================
// Cette configuration est utilisée pour la mesure par photo
// Le marqueur doit être imprimé à la taille exacte configurée ici

interface MarkerConfig {
  markerSizeCm: number;  // Largeur du marqueur Métré A4 V1.2 (AprilTag 13×21.7cm)
}

const DEFAULT_CONFIG: MarkerConfig = {
  markerSizeCm: 13,  // 13cm largeur AprilTag
};

const AIMeasureSettings: React.FC = () => {
  const { api } = useAuthenticatedApi();
  
  const [config, setConfig] = useState<MarkerConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Charger la config depuis le serveur
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await api.get('/api/settings/ai-measure');
        if (response.success && response.data) {
          setConfig({
            markerSizeCm: response.data.markerSizeCm || DEFAULT_CONFIG.markerSizeCm,
            boardSizeCm: response.data.boardSizeCm || DEFAULT_CONFIG.boardSizeCm
          });
        }
      } catch (error) {
        console.error('Erreur chargement config IA Mesure:', error);
        // Utiliser les valeurs par défaut en cas d'erreur
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [api]);

  // Sauvegarder la config
  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await api.post('/api/settings/ai-measure', config);
      if (response.success) {
        toast.success('✅ Configuration IA Mesure sauvegardée !');
        setHasChanges(false);
      } else {
        toast.error(`❌ ${response.message || 'Erreur de sauvegarde'}`);
      }
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  // Mettre à jour une valeur
  const updateConfig = (key: keyof MarkerConfig, value: number) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  // Générer le SVG du marqueur
  const generateMarkerSVG = useCallback(() => generateArucoMarkerSvg(config.markerSizeCm), [config.markerSizeCm]);

  // Télécharger le marqueur en SVG
  const downloadMarkerSVG = () => {
    // Utiliser la version partagée
    downloadArucoMarkerSvg(config.markerSizeCm);
    toast.success(`📥 Marqueur ${config.markerSizeCm}cm téléchargé !`);
  };

  // Télécharger en PDF pour impression
  const downloadMarkerPDF = async () => {
    try {
      const response = await api.get(`/api/settings/ai-measure/marker-pdf?size=${config.markerSizeCm}`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `marqueur-aruco-${config.markerSizeCm}cm.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`📥 PDF marqueur ${config.markerSizeCm}cm téléchargé !`);
    } catch {
      // Fallback: télécharger le SVG
      downloadMarkerSVG();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" tip="Chargement de la configuration..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Title level={3} className="!mb-0">
          <CameraOutlined className="mr-2" />
          Configuration IA Mesure
        </Title>
        <Space>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={saving}
            disabled={!hasChanges}
          >
            Sauvegarder
          </Button>
        </Space>
      </div>

      {hasChanges && (
        <Alert
          message="Modifications non sauvegardées"
          description="Cliquez sur Sauvegarder pour appliquer les changements."
          type="warning"
          showIcon
        />
      )}

      {/* Configuration du marqueur */}
      <Card title="📐 Dimensions du marqueur Métré A4 V1.2 (AprilTag)">
        <Row gutter={[24, 24]}>
          <Col xs={24} md={12}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Taille du marqueur (cm)
                  <Tooltip title="Largeur du marqueur Métré A4 V1.2 (distance entre centres AprilTag gauche-droite). Mesurez cette distance sur votre marqueur imprimé.">
                    <InfoCircleOutlined className="ml-2 text-gray-400" />
                  </Tooltip>
                </label>
                <InputNumber
                  min={5}
                  max={50}
                  step={0.1}
                  value={config.markerSizeCm}
                  onChange={(value) => updateConfig('markerSizeCm', value || DEFAULT_CONFIG.markerSizeCm)}
                  addonAfter="cm"
                  style={{ width: '100%' }}
                  precision={1}
                />
                <Text type="secondary" className="text-xs block mt-1">
                  Valeur par défaut: 13 cm (marqueur Métré A4 V1.2 largeur)
                </Text>
              </div>

              <Divider />

              <div>
                <Text strong>Dimensions calculées:</Text>
                <ul className="list-disc list-inside text-sm text-gray-600 mt-2">
                  <li>Côté du carré: <strong>{config.markerSizeCm} cm</strong> ({config.markerSizeCm * 10} mm)</li>
                  <li>Centre noir: <strong>{(config.markerSizeCm / 3).toFixed(1)} cm</strong></li>
                  <li>Bande blanche: <strong>{(config.markerSizeCm / 6).toFixed(1)} cm</strong></li>
                  <li>AprilTag largeur: <strong>13.0 cm</strong></li>
                  <li>AprilTag hauteur: <strong>21.7 cm</strong></li>
                </ul>
              </div>
            </div>
          </Col>

          <Col xs={24} md={12}>
            {/* Aperçu du marqueur */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <Text strong className="block mb-3">Aperçu du marqueur:</Text>
              <div 
                className="flex justify-center items-center bg-white p-4 rounded border"
                style={{ minHeight: 200 }}
              >
                <div
                  dangerouslySetInnerHTML={{ __html: generateMarkerSVG() }}
                  style={{ 
                    width: Math.min(180, config.markerSizeCm * 10),
                    height: Math.min(180, config.markerSizeCm * 10)
                  }}
                />
              </div>
              <div className="flex gap-2 mt-4 justify-center">
                <Button 
                  icon={<DownloadOutlined />} 
                  onClick={downloadMarkerSVG}
                >
                  SVG
                </Button>
                <Button 
                  icon={<PrinterOutlined />} 
                  onClick={downloadMarkerPDF}
                  type="primary"
                >
                  PDF (impression)
                </Button>
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Instructions */}
      <Card title="📖 Instructions d'utilisation">
        <Paragraph>
          <ol className="list-decimal list-inside space-y-2">
            <li>
              <strong>Téléchargez</strong> le marqueur au format PDF ou SVG
            </li>
            <li>
              <strong>Imprimez</strong> le marqueur à l'échelle 100% (sans mise à l'échelle)
            </li>
            <li>les dimensions du marqueur Métré A4 V1.2 (AprilTag 13×21.7cm)
              <strong>Vérifiez</strong> que la distance entre les centres des cercles magenta 
              correspond exactement à <strong>{config.markerSizeCm} cm</strong>
            </li>
            <li>
              Si la taille ne correspond pas, <strong>mesurez</strong> la distance réelle et 
              ajustez la valeur ci-dessus
            </li>
            <li>
              <strong>Collez</strong> le marqueur sur un support rigide (carton, aluminium...)
            </li>
          </ol>
        </Paragraph>
        
        <Alert
          message="Important"
          description={
            <span>
              La précision des mesures dépend directement de la correspondance entre 
              la taille configurée ici et la taille réelle du marqueur imprimé.
              <br />
              Une erreur de 1mm sur un marqueur de 13cm entraîne une erreur de ~0.77% sur toutes les mesures.
            </span>
          }
          type="info"
          showIcon
          className="mt-4"
        />
      </Card>
    </div>
  );
};

export default AIMeasureSettings;
