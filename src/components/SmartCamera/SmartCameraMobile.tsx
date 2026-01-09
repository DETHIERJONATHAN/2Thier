/**
 * 📸 SmartCameraMobile - Version 100% Mobile avec caméra native
 * 
 * Utilise l'input file native pour une compatibilité maximale sur mobile
 * Pas de getUserMedia, pas de bugs WebView !
 * 
 * 📱 Intègre le gyroscope pour améliorer les mesures ArUco
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button, Card, Space, Typography, Progress, Image, message } from 'antd';
import { 
  CameraOutlined, 
  CheckCircleOutlined, 
  DeleteOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { useDeviceOrientation } from '../../hooks/useDeviceOrientation';

const { Text, Title } = Typography;

export interface CapturedPhoto {
  imageBase64: string;
  metadata: {
    timestamp: number;
    photoIndex: number;
    totalPhotosNeeded: number;
    gyroscope: { 
      alpha: number; 
      beta: number; 
      gamma: number;
      quality?: number;  // 📱 Qualité de l'orientation (0-100)
    };
    accelerometer: { x: number; y: number; z: number };
    camera: { facingMode: 'environment'; zoom: number };
    lighting: { brightness: number; contrast: number; uniformity: number };
    quality: { sharpness: number; blur: number; overallScore: number };
  };
}

interface SmartCameraMobileProps {
  onCapture: (photos: CapturedPhoto[]) => void;
  onCancel: () => void;
  minPhotos?: number;
  maxPhotos?: number;
}

const SmartCameraMobile: React.FC<SmartCameraMobileProps> = ({
  onCapture,
  onCancel,
  minPhotos = 1,
  maxPhotos
}) => {
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // 📱 Hook gyroscope pour capturer l'orientation réelle du téléphone
  const { orientation, analyze, isAvailable, hasPermission, requestPermission } = useDeviceOrientation(true);
  
  // Demander permission gyroscope au montage (iOS nécessite un geste utilisateur)
  useEffect(() => {
    if (isAvailable && !hasPermission) {
      // On ne demande pas automatiquement, on attend un clic
      console.log('📱 [SmartCamera] Gyroscope disponible, permission non accordée');
    }
  }, [isAvailable, hasPermission]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Convertir fichier en base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Gérer la capture photo
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const maxPhotosEffective = maxPhotos ?? Number.POSITIVE_INFINITY;
    const remainingSlots = Math.max(0, maxPhotosEffective - photos.length);
    if (remainingSlots <= 0) {
      message.warning('Nombre maximum de photos atteint');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);

    setIsProcessing(true);
    
    // 📱 Capturer l'orientation actuelle du téléphone (gyroscope)
    const currentOrientation = {
      alpha: orientation.alpha,
      beta: orientation.beta,
      gamma: orientation.gamma,
      quality: analyze().quality  // 0-100, qualité de l'orientation
    };
    
    console.log(`📱 [SmartCamera] Gyroscope au moment de la capture: beta=${currentOrientation.beta.toFixed(1)}°, gamma=${currentOrientation.gamma.toFixed(1)}°, qualité=${currentOrientation.quality}%`);
    
    try {
      const base64s = await Promise.all(filesToProcess.map(fileToBase64));

      const expectedNewCount = photos.length + base64s.length;

      setPhotos((prev) => {
        const startIndex = prev.length;
        const newPhotos: CapturedPhoto[] = base64s.map((base64, i) => ({
          imageBase64: base64,
          metadata: {
            timestamp: Date.now(),
            photoIndex: startIndex + i,
            totalPhotosNeeded: minPhotos,
            // 📱 Utiliser les vraies données du gyroscope !
            gyroscope: currentOrientation,
            accelerometer: { x: 0, y: 0, z: 0 },
            camera: { facingMode: 'environment', zoom: 1 },
            lighting: { brightness: 128, contrast: 50, uniformity: 80 },
            quality: { sharpness: 85, blur: 10, overallScore: 85 }
          }
        }));

        return [...prev, ...newPhotos];
      });

      if (base64s.length === 1) {
        message.success('Photo ajoutée !');
      } else {
        message.success(`${base64s.length} photos ajoutées !`);
      }

      // 🎯 Flux mobile “sans arrêt”: relancer la capture jusqu'au minimum requis
      // (sur desktop, ré-ouvrir le picker automatiquement est gênant)
      const isLikelyMobile =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(pointer: coarse)').matches;

      if (isLikelyMobile && expectedNewCount < minPhotos && (maxPhotos ?? Number.POSITIVE_INFINITY) > expectedNewCount) {
        setTimeout(() => {
          inputRef.current?.click();
        }, 250);
      }
    } catch (err) {
      console.error('Erreur capture:', err);
      message.error('Erreur lors de la capture');
    } finally {
      setIsProcessing(false);
      // Reset input pour permettre de reprendre les mêmes fichiers
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  // Supprimer une photo
  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // Valider les photos
  const handleValidate = () => {
    if (photos.length >= minPhotos) {
      onCapture(photos);
    } else {
      message.warning(`Minimum ${minPhotos} photo(s) requise(s)`);
    }
  };

  // Ouvrir la caméra (avec permission gyroscope sur iOS)
  const openCamera = useCallback(async () => {
    // Sur iOS, demander la permission gyroscope au premier clic
    if (isAvailable && !hasPermission) {
      await requestPermission();
    }
    inputRef.current?.click();
  }, [isAvailable, hasPermission, requestPermission]);

  const canValidate = photos.length >= minPhotos;
  const maxPhotosEffective = maxPhotos ?? Number.POSITIVE_INFINITY;
  const canAddMore = photos.length < maxPhotosEffective;
  
  // 📱 Analyser l'orientation pour l'indicateur visuel
  const orientationAnalysis = analyze();

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#000',
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header avec indicateur gyroscope discret */}
      <div style={{
        padding: '16px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.9), rgba(0,0,0,0.7))',
        color: '#fff'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Title level={4} style={{ color: '#fff', margin: 0 }}>
              📸 SmartCamera
            </Title>
            {/* 📱 Indicateur gyroscope discret - juste un petit point coloré */}
            {hasPermission && (
              <span 
                title={`Orientation: ${orientationAnalysis.quality}%`}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: orientationAnalysis.colorCode === 'green' ? '#52c41a' 
                    : orientationAnalysis.colorCode === 'orange' ? '#faad14' 
                    : '#ff4d4f',
                  transition: 'background-color 0.3s'
                }}
              />
            )}
          </div>
          <Text style={{ color: '#fff' }}>
            {maxPhotos === undefined ? `${photos.length} photo(s)` : `${photos.length} / ${maxPhotos} photos`}
          </Text>
        </div>
        <Progress 
          percent={(photos.length / minPhotos) * 100} 
          showInfo={false}
          strokeColor={canValidate ? '#52c41a' : '#1890ff'}
          style={{ marginTop: 8 }}
        />
      </div>

      {/* Zone photos */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: 16,
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 12,
        alignContent: 'start'
      }}>
        {/* Photos capturées */}
        {photos.map((photo, index) => (
          <Card
            key={index}
            size="small"
            style={{ 
              background: '#1a1a1a',
              border: '2px solid #52c41a'
            }}
            bodyStyle={{ padding: 8 }}
          >
            <div style={{ position: 'relative' }}>
              <Image
                src={photo.imageBase64}
                alt={`Photo ${index + 1}`}
                style={{ 
                  width: '100%', 
                  height: 120, 
                  objectFit: 'cover',
                  borderRadius: 4
                }}
                preview={false}
              />
              <Button
                type="primary"
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => removePhoto(index)}
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  minWidth: 28
                }}
              />
              <div style={{
                position: 'absolute',
                bottom: 4,
                left: 4,
                background: 'rgba(0,0,0,0.7)',
                color: '#fff',
                padding: '2px 8px',
                borderRadius: 4,
                fontSize: 12
              }}>
                #{index + 1}
              </div>
            </div>
          </Card>
        ))}

        {/* Bouton ajouter photo */}
        {canAddMore && (
          <Card
            size="small"
            style={{ 
              background: '#1a1a1a',
              border: '2px dashed #444',
              cursor: 'pointer',
              minHeight: 140
            }}
            bodyStyle={{ 
              padding: 8, 
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={openCamera}
          >
            <div style={{ textAlign: 'center', color: '#888' }}>
              <PlusOutlined style={{ fontSize: 32, marginBottom: 8 }} />
              <div>Ajouter photo(s)</div>
            </div>
          </Card>
        )}
      </div>

      {/* Input file caché - UTILISE LA CAMÉRA NATIVE */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* Footer avec boutons */}
      <div style={{
        padding: '16px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.7))',
        display: 'flex',
        gap: 12
      }}>
        <Button 
          size="large"
          onClick={onCancel}
          style={{ flex: 1 }}
        >
          Annuler
        </Button>

        <Button
          type="primary"
          size="large"
          icon={<CameraOutlined />}
          onClick={openCamera}
          disabled={!canAddMore || isProcessing}
          loading={isProcessing}
          style={{ 
            flex: 2,
            background: '#1890ff',
            height: 50
          }}
        >
          {isProcessing ? 'Traitement...' : 'Ajouter photo(s)'}
        </Button>

        <Button
          type="primary"
          size="large"
          icon={<CheckCircleOutlined />}
          onClick={handleValidate}
          disabled={!canValidate}
          style={{ 
            flex: 1,
            background: canValidate ? '#52c41a' : undefined
          }}
        >
          OK
        </Button>
      </div>

      {/* Message d'aide */}
      {photos.length === 0 && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: '#666',
          padding: 20
        }}>
          <CameraOutlined style={{ fontSize: 64, marginBottom: 16 }} />
          <div style={{ fontSize: 18 }}>
            Appuyez sur "Ajouter photo(s)"
          </div>
          <div style={{ fontSize: 14, marginTop: 8 }}>
            Minimum {minPhotos} photo(s) requise(s)
          </div>
          {maxPhotos === undefined && (
            <div style={{ fontSize: 12, marginTop: 6 }}>
              Vous pouvez en ajouter autant que vous voulez.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SmartCameraMobile;
