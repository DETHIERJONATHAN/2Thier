/**
 * 🎯 SmartCaptureFlow - Flux complet de capture intelligent
 * 
 * Utilise SmartCameraMobile pour une compatibilité 100% mobile
 */

import React, { useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Modal, Button, Card, Typography, Space, Alert, Steps, Result, Tabs, Divider } from 'antd';
import { 
  CameraOutlined, 
  VideoCameraOutlined,
  CheckCircleOutlined,
  PrinterOutlined,
  RocketOutlined,
  BulbOutlined,
  PictureOutlined
} from '@ant-design/icons';
import SmartCameraMobile, { type CapturedPhoto } from './SmartCameraMobile';
import VideoCapture from './VideoCapture';
import CalibrationMarker from './CalibrationMarker';
import { analyzePhotos, MultiPhotoAnalysis } from './PhotoAnalyzer';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

type CaptureMode = 'photo' | 'video';
type FlowStep = 'intro' | 'marker' | 'capture' | 'analysis' | 'complete';

interface SmartCaptureFlowProps {
  visible: boolean;
  onClose: () => void;
  onComplete: (photos: CapturedPhoto[], analysis: MultiPhotoAnalysis) => void;
  targetObject?: 'door' | 'window' | 'wall' | 'custom';
  objectLabel?: string;
}

const SmartCaptureFlow: React.FC<SmartCaptureFlowProps> = ({
  visible,
  onClose,
  onComplete,
  targetObject = 'door',
  objectLabel = 'l\'objet'
}) => {
  const [currentStep, setCurrentStep] = useState<FlowStep>('intro');
  const [captureMode, setCaptureMode] = useState<CaptureMode>('photo');
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [analysis, setAnalysis] = useState<MultiPhotoAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);


  // Reset quand on ferme
  const handleClose = () => {
    setCurrentStep('intro');
    setCapturedPhotos([]);
    setAnalysis(null);
    onClose();
  };

  // Démarrer la capture
  const startCapture = (mode: CaptureMode) => {
    setCaptureMode(mode);
    setCurrentStep('capture');
  };

  // Photos capturées
  const handlePhotosCapture = async (photos: CapturedPhoto[]) => {
    setCapturedPhotos(photos);
    setCurrentStep('analysis');
    setIsAnalyzing(true);
    
    try {
      // Analyser les photos avec l'IA
      const analysisResult = await analyzePhotos(photos);
      setAnalysis(analysisResult);
      
      // Si l'IA dit qu'il faut plus de photos, revenir à la capture
      if (analysisResult.needsMorePhotos && photos.length < 6) {
        // On reste sur analysis pour montrer le feedback
      } else {
        setCurrentStep('complete');
      }
    } catch (err) {
      console.error('Analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Reprendre des photos supplémentaires
  const captureMore = () => {
    setCurrentStep('capture');
  };

  // Valider et terminer
  const handleComplete = () => {
    if (analysis) {
      onComplete(capturedPhotos, analysis);
    }
    handleClose();
  };

  // Rendu selon l'étape
  const renderStep = () => {
    switch (currentStep) {
      case 'intro':
        return renderIntro();
      case 'marker':
        return <CalibrationMarker />;
      case 'capture':
        return renderCapture();
      case 'analysis':
        return renderAnalysis();
      case 'complete':
        return renderComplete();
      default:
        return null;
    }
  };

  const renderIntro = () => (
    <div style={{ padding: 24 }}>
      <Title level={3}>
        <RocketOutlined /> Capture Intelligente
      </Title>
      
      <Paragraph>
        Ce système utilise l'IA pour garantir des mesures précises de {objectLabel}.
        Choisissez votre méthode de capture préférée.
      </Paragraph>
      
      <Alert
        type="info"
        showIcon
        icon={<BulbOutlined />}
        message="Conseil"
        description="Pour une meilleure précision, utilisez le marqueur de calibration imprimé. Vous pouvez l'imprimer à l'étape suivante."
        style={{ marginBottom: 24 }}
      />
      
      <Steps current={0} style={{ marginBottom: 24 }}>
        <Step title="Préparation" description="Marqueur optionnel" />
        <Step title="Capture" description="Photos ou vidéo" />
        <Step title="Analyse IA" description="Vérification qualité" />
        <Step title="Terminé" description="Mesures prêtes" />
      </Steps>
      
      <Divider>Choisir la méthode</Divider>
      
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Card 
          hoverable 
          onClick={() => startCapture('photo')}
          style={{ cursor: 'pointer' }}
        >
          <Space>
            <CameraOutlined style={{ fontSize: 32, color: '#1890ff' }} />
            <div>
              <Title level={5} style={{ margin: 0 }}>📸 Mode Photo (Recommandé)</Title>
              <Text type="secondary">
                Minimum 3 photos, illimité ensuite. Prenez des photos depuis différents angles.
                L'IA vous guide en temps réel.
              </Text>
            </div>
          </Space>
        </Card>
        
        <Card 
          hoverable 
          onClick={() => {
            // Ouvrir directement la galerie native du téléphone
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.multiple = true;
            input.onchange = (e: any) => {
              const files = Array.from(e.target.files || []) as File[];
              if (files.length > 0) {
                // Convertir les fichiers en CapturedPhoto[]
                Promise.all(files.map(async (file) => {
                  return new Promise<CapturedPhoto>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                      resolve({
                        id: `gallery-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        dataUrl: reader.result as string,
                        timestamp: Date.now(),
                        angle: 0
                      });
                    };
                    reader.readAsDataURL(file);
                  });
                })).then((photos) => {
                  handlePhotosCapture(photos);
                });
              }
            };
            input.click();
          }}
          style={{ cursor: 'pointer' }}
        >
          <Space>
            <PictureOutlined style={{ fontSize: 32, color: '#52c41a' }} />
            <div>
              <Title level={5} style={{ margin: 0 }}>🖼️ Galerie Photo</Title>
              <Text type="secondary">
                Sélectionnez des photos existantes depuis votre galerie.
                Choisissez plusieurs photos pour une meilleure précision.
              </Text>
            </div>
          </Space>
        </Card>
        
        <Button 
          icon={<PrinterOutlined />}
          onClick={() => setCurrentStep('marker')}
          block
        >
          Imprimer le marqueur de calibration d'abord
        </Button>
      </Space>
    </div>
  );

  const renderCapture = () => {
    // Utilise SmartCameraMobile qui est 100% compatible mobile
    // Pas besoin de conteneur spécial, le composant gère tout
    
    const captureContent = captureMode === 'video' ? (
      <VideoCapture
        onComplete={handlePhotosCapture}
        onCancel={() => setCurrentStep('intro')}
        targetDuration={12}
        minFrames={5}
      />
    ) : (
      <SmartCameraMobile
        onCapture={handlePhotosCapture}
        onCancel={() => setCurrentStep('intro')}
        minPhotos={3}
      />
    );

    // Utiliser un Portal pour monter directement dans le body
    return ReactDOM.createPortal(captureContent, document.body);
  };

  const renderAnalysis = () => (
    <div style={{ padding: 24 }}>
      <Title level={3}>🤖 Analyse en cours...</Title>
      
      {isAnalyzing ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div className="ant-spin ant-spin-lg ant-spin-spinning">
            <span className="ant-spin-dot ant-spin-dot-spin">
              <i className="ant-spin-dot-item"></i>
              <i className="ant-spin-dot-item"></i>
              <i className="ant-spin-dot-item"></i>
              <i className="ant-spin-dot-item"></i>
            </span>
          </div>
          <Paragraph style={{ marginTop: 16 }}>
            L'IA analyse vos {capturedPhotos.length} photos...
          </Paragraph>
        </div>
      ) : analysis && (
        <Space direction="vertical" style={{ width: '100%' }}>
          {/* Résultat de l'analyse */}
          <Alert
            type={analysis.overallReadiness === 'excellent' ? 'success' : 
                  analysis.overallReadiness === 'good' ? 'success' :
                  analysis.overallReadiness === 'acceptable' ? 'warning' : 'error'}
            message={analysis.finalRecommendation}
            showIcon
          />
          
          {/* Thumbnails */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {capturedPhotos.map((photo, idx) => {
              const report = analysis.photos[idx];
              return (
                <div key={idx} style={{ position: 'relative' }}>
                  <img 
                    src={photo.thumbnailBase64 || photo.imageBase64}
                    alt={`Photo ${idx + 1}`}
                    style={{ 
                      width: 80, 
                      height: 60, 
                      objectFit: 'cover',
                      borderRadius: 4,
                      border: report?.usableForMeasurement 
                        ? '2px solid #52c41a' 
                        : '2px solid #ff4d4f'
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: 2,
                    right: 2,
                    backgroundColor: report?.usableForMeasurement ? '#52c41a' : '#ff4d4f',
                    color: '#fff',
                    borderRadius: 10,
                    padding: '0 6px',
                    fontSize: 10
                  }}>
                    {report?.overallScore.toFixed(0)}%
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Actions */}
          <Space style={{ marginTop: 16 }}>
            {analysis.needsMorePhotos && capturedPhotos.length < 6 && (
              <Button 
                type="primary"
                icon={<CameraOutlined />}
                onClick={captureMore}
              >
                {analysis.recommendedNextAngle 
                  ? `Ajouter photo (${analysis.recommendedNextAngle})`
                  : 'Ajouter une photo'}
              </Button>
            )}
            
            {analysis.overallReadiness !== 'not-ready' && (
              <Button
                type={analysis.needsMorePhotos ? 'default' : 'primary'}
                icon={<CheckCircleOutlined />}
                onClick={() => setCurrentStep('complete')}
              >
                Continuer quand même
              </Button>
            )}
          </Space>
        </Space>
      )}
    </div>
  );

  const renderComplete = () => (
    <Result
      status="success"
      title="Capture réussie !"
      subTitle={`${capturedPhotos.length} photos analysées. Précision estimée: ${
        analysis?.overallReadiness === 'excellent' ? '±1%' :
        analysis?.overallReadiness === 'good' ? '±3%' :
        analysis?.overallReadiness === 'acceptable' ? '±5%' : '±10%'
      }`}
      extra={[
        <Button type="primary" key="use" onClick={handleComplete}>
          Utiliser ces photos
        </Button>,
        <Button key="retry" onClick={() => setCurrentStep('intro')}>
          Recommencer
        </Button>
      ]}
    >
      {/* Résumé */}
      <div style={{ textAlign: 'left', maxWidth: 400, margin: '0 auto' }}>
        <Paragraph>
          <strong>Photos utilisables:</strong> {analysis?.photos.filter(p => p.usableForMeasurement).length} / {capturedPhotos.length}
        </Paragraph>
        <Paragraph>
          <strong>Couverture angulaire:</strong> {analysis?.angleCoverage.horizontal.toFixed(0)}° horizontal
        </Paragraph>
        <Paragraph>
          <strong>Marqueur détecté:</strong> {analysis?.markerDetection?.detected ? 'Oui ✅' : 'Non ❌'}
        </Paragraph>
        {analysis?.shadowAnalysis.hasShadows && (
          <Paragraph>
            <strong>Analyse des ombres:</strong> Direction lumière détectée ✅
          </Paragraph>
        )}
      </div>
    </Result>
  );

  // Pas de modal pour capture (plein écran)
  if (currentStep === 'capture') {
    return visible ? renderCapture() : null;
  }

  return (
    <Modal
      open={visible}
      onCancel={handleClose}
      footer={currentStep === 'marker' ? (
        <Button type="primary" onClick={() => setCurrentStep('intro')}>
          Retour au choix de capture
        </Button>
      ) : null}
      width={currentStep === 'marker' ? 800 : 600}
      destroyOnClose
    >
      {renderStep()}
    </Modal>
  );
};

export default SmartCaptureFlow;
