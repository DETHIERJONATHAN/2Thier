import React, { useState, useEffect } from 'react';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { 
  Card, 
  Button, 
  Space, 
  Spin, 
  Typography, 
  Divider, 
  Alert,
  Row,
  Col
} from 'antd';
import { 
  DownloadOutlined, 
  CameraOutlined,
  PrinterOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

const AIMeasureSettings: React.FC = () => {
  const { api } = useAuthenticatedApi();
  const [loading, setLoading] = useState(true);

  // Charger la config depuis le serveur
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        await api.get('/api/settings/ai-measure');
      } catch (error) {
        console.error('Erreur chargement config IA Mesure:', error);
        // Utiliser les valeurs par défaut en cas d'erreur
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [api]);

  const downloadMarkerPDF = () => {
    window.open('/printable/metre-a4-v10.pdf', '_blank');
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
        <Space />
      </div>

      {/* Configuration du marqueur */}
      <Card title="📐 Métré A4 V10 (référence unique)">
        <Row gutter={[24, 24]}>
          <Col xs={24} md={12}>
            <div className="space-y-4">
              <div>
                <Text strong>Référence unique :</Text>
                <div className="text-sm text-gray-600 mt-2">
                  Largeur centres: <strong>13.0 cm</strong> · Hauteur centres: <strong>20.5 cm</strong>
                </div>
                <div className="text-sm text-gray-600">
                  Vérifiez la distance centre‑à‑centre haut/bas: <strong>20.5 cm</strong>
                </div>
              </div>

              <Divider />

              <div>
                <Text strong>Dimensions calculées:</Text>
                <ul className="list-disc list-inside text-sm text-gray-600 mt-2">
                  <li>Rectangle centres: <strong>13.0 × 20.5 cm</strong></li>
                  <li>Feuille A4: <strong>21.0 × 29.7 cm</strong></li>
                  <li>6 tags 5cm + 1 tag 10cm</li>
                </ul>
              </div>
            </div>
          </Col>

          <Col xs={24} md={12}>
            <div className="border rounded-lg p-4 bg-gray-50">
              <Text strong className="block mb-3">Téléchargement:</Text>
              <div className="flex gap-2 mt-4 justify-center">
                <Button 
                  icon={<DownloadOutlined />} 
                  onClick={downloadMarkerPDF}
                  type="primary"
                >
                  PDF Métré A4 V10
                </Button>
                <Button 
                  icon={<PrinterOutlined />} 
                  onClick={downloadMarkerPDF}
                >
                  Imprimer
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
              <strong>Téléchargez</strong> le PDF Métré A4 V10
            </li>
            <li>
              <strong>Imprimez</strong> le marqueur à l'échelle 100% (sans mise à l'échelle)
            </li>
            <li>
              <strong>Vérifiez</strong> que la distance centre‑à‑centre haut/bas est bien <strong>20.5 cm</strong>
            </li>
            <li>
              Si la taille ne correspond pas, <strong>mesurez</strong> la distance réelle et 
              réimprimez sans ajustement
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
