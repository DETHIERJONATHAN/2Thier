import React, { useState, useEffect, useCallback } from 'react';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { toast } from 'react-toastify';
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
// 🎯 CONFIGURATION MARQUEUR ARUCO MAGENTA
// ==========================================
// Cette configuration est utilisée pour la mesure par photo
// Le marqueur doit être imprimé à la taille exacte configurée ici

interface MarkerConfig {
  markerSizeCm: number;  // Taille du carré du marqueur (distance entre centres magenta)
  boardSizeCm: number;   // Taille du support ALU (optionnel)
}

const DEFAULT_CONFIG: MarkerConfig = {
  markerSizeCm: 16.8,  // Valeur par défaut corrigée !
  boardSizeCm: 24
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
  const generateMarkerSVG = useCallback(() => {
    const sizeMm = config.markerSizeCm * 10; // Convert to mm
    const viewBox = `0 0 ${sizeMm} ${sizeMm}`;
    
    // Proportions du marqueur ArUco MAGENTA
    // Bande noire externe: 0 → 1/6
    // Bande blanche: 1/6 → 1/3
    // Centre noir: 1/3 → 2/3
    // Bande blanche: 2/3 → 5/6
    // Bande noire interne: 5/6 → 1
    
    const band = sizeMm / 6; // Largeur d'une bande
    const magentaRadius = sizeMm * 0.028; // ~5mm pour 18cm
    const whiteRadius = sizeMm * 0.006; // ~1mm pour 18cm
    
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${sizeMm}mm" height="${sizeMm}mm">
        <!-- Fond noir externe -->
        <rect x="0" y="0" width="${sizeMm}" height="${sizeMm}" fill="#000000"/>
        
        <!-- Bande blanche (1/6 à 5/6) -->
        <rect x="${band}" y="${band}" width="${sizeMm - 2*band}" height="${sizeMm - 2*band}" fill="#FFFFFF"/>
        
        <!-- Centre noir (1/3 à 2/3) -->
        <rect x="${2*band}" y="${2*band}" width="${sizeMm - 4*band}" height="${sizeMm - 4*band}" fill="#000000"/>
        
        <!-- 4 cercles magenta aux coins -->
        <circle cx="0" cy="0" r="${magentaRadius}" fill="#FF00FF"/>
        <circle cx="${sizeMm}" cy="0" r="${magentaRadius}" fill="#FF00FF"/>
        <circle cx="${sizeMm}" cy="${sizeMm}" r="${magentaRadius}" fill="#FF00FF"/>
        <circle cx="0" cy="${sizeMm}" r="${magentaRadius}" fill="#FF00FF"/>
        
        <!-- 4 points blancs au centre des cercles magenta -->
        <circle cx="0" cy="0" r="${whiteRadius}" fill="#FFFFFF"/>
        <circle cx="${sizeMm}" cy="0" r="${whiteRadius}" fill="#FFFFFF"/>
        <circle cx="${sizeMm}" cy="${sizeMm}" r="${whiteRadius}" fill="#FFFFFF"/>
        <circle cx="0" cy="${sizeMm}" r="${whiteRadius}" fill="#FFFFFF"/>
      </svg>
    `;
  }, [config.markerSizeCm]);

  // Télécharger le marqueur en SVG
  const downloadMarkerSVG = () => {
    const svg = generateMarkerSVG();
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marqueur-aruco-${config.markerSizeCm}cm.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
      <Card title="📐 Dimensions du marqueur ArUco MAGENTA">
        <Row gutter={[24, 24]}>
          <Col xs={24} md={12}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Taille du marqueur (cm)
                  <Tooltip title="Distance entre les CENTRES des 4 cercles magenta. Mesurez cette distance sur votre marqueur imprimé.">
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
                  Valeur par défaut: 16.8 cm (marqueur standard 2Thier)
                </Text>
              </div>

              <Divider />

              <div>
                <Text strong>Dimensions calculées:</Text>
                <ul className="list-disc list-inside text-sm text-gray-600 mt-2">
                  <li>Côté du carré: <strong>{config.markerSizeCm} cm</strong> ({config.markerSizeCm * 10} mm)</li>
                  <li>Centre noir: <strong>{(config.markerSizeCm / 3).toFixed(1)} cm</strong></li>
                  <li>Bande blanche: <strong>{(config.markerSizeCm / 6).toFixed(1)} cm</strong></li>
                  <li>Cercles magenta: <strong>~{(config.markerSizeCm * 0.028).toFixed(1)} cm</strong> de rayon</li>
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
            <li>
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
              Une erreur de 1mm sur un marqueur de 16.8cm entraîne une erreur de ~0.6% sur toutes les mesures.
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
