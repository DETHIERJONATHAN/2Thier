/**
 * 📸 SmartCameraMobile - Version 100% Mobile avec caméra native
 * 
 * Utilise l'input file native pour une compatibilité maximale sur mobile
 * Pas de getUserMedia, pas de bugs WebView !
 * 
 * 📱 Intègre le gyroscope pour améliorer les mesures ArUco
 * 🔒 Protection contre la sortie accidentelle sur mobile
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button, Card, Space, Typography, Progress, Image, message, Modal, InputNumber, Tooltip } from 'antd';
import { 
  CameraOutlined, 
  CheckCircleOutlined, 
  DeleteOutlined,
  PlusOutlined,
  PrinterOutlined,
  DownloadOutlined,
  SaveOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { useDeviceOrientation } from '../../hooks/useDeviceOrientation';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useMobileModalLock } from '../../hooks/useMobileModalLock';
import { downloadArucoMarkerSvg } from '../../utils/arucoMarkerSvg';
import { setArucoMarkerSize } from '../../utils/homographyUtils';

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

// 🔒 Clé pour persister les photos en cours de capture (survit au background/foreground mobile)
const PHOTOS_SESSION_KEY = 'smartcamera_photos_in_progress';

const SmartCameraMobile: React.FC<SmartCameraMobileProps> = ({
  onCapture,
  onCancel,
  minPhotos = 1,
  maxPhotos
}) => {
  // 🔒 PERSISTANCE: Restaurer les photos depuis sessionStorage au montage
  const [photos, setPhotos] = useState<CapturedPhoto[]>(() => {
    try {
      const saved = sessionStorage.getItem(PHOTOS_SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('📱 [SmartCamera] Restauration de', parsed.length, 'photos depuis sessionStorage');
        return parsed;
      }
    } catch (e) {
      console.warn('📱 [SmartCamera] Erreur restauration photos:', e);
    }
    return [];
  });
  const [isProcessing, setIsProcessing] = useState(false);

  // 🔒 PERSISTANCE: Sauvegarder les photos dans sessionStorage à chaque changement
  useEffect(() => {
    if (photos.length > 0) {
      try {
        sessionStorage.setItem(PHOTOS_SESSION_KEY, JSON.stringify(photos));
        console.log('📱 [SmartCamera] Sauvegarde de', photos.length, 'photos dans sessionStorage');
      } catch (e) {
        console.warn('📱 [SmartCamera] Erreur sauvegarde photos:', e);
      }
    }
  }, [photos]);

  // 🔒 Nettoyer sessionStorage quand on quitte (annuler ou valider)
  const clearPersistedPhotos = useCallback(() => {
    try {
      sessionStorage.removeItem(PHOTOS_SESSION_KEY);
      console.log('📱 [SmartCamera] Photos supprimées de sessionStorage');
    } catch (e) {
      // Ignore
    }
  }, []);

  // 🎯 ArUco settings (mêmes valeurs que Paramètres IA Mesure)
  const { api } = useAuthenticatedApi();
  const [showArucoSettings, setShowArucoSettings] = useState(false);
  const [markerSizeCm, setMarkerSizeCm] = useState<number>(16.8);
  const [boardSizeCm, setBoardSizeCm] = useState<number>(24);
  const [arucoLoading, setArucoLoading] = useState(false);
  const [arucoSaving, setArucoSaving] = useState(false);
  
  // � Protection mobile: Bloquer les gestes de sortie accidentelle (swipe, back button)
  const handleAttemptClose = useCallback(() => {
    message.warning('⚠️ Utilisez le bouton "Annuler" pour fermer', 2);
  }, []);
  
  // Le composant est toujours "ouvert" quand il est monté
  useMobileModalLock({
    isOpen: true,
    onAttemptClose: handleAttemptClose
  });
  
  // �📱 Hook gyroscope pour capturer l'orientation réelle du téléphone
  const { orientation, analyze, isAvailable, hasPermission, requestPermission } = useDeviceOrientation(true);
  
  // Demander permission gyroscope au montage (iOS nécessite un geste utilisateur)
  useEffect(() => {
    if (isAvailable && !hasPermission) {
      // On ne demande pas automatiquement, on attend un clic
      console.log('📱 [SmartCamera] Gyroscope disponible, permission non accordée');
    }
  }, [isAvailable, hasPermission]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Charger la config ArUco au moment d'ouvrir la modale (évite appels inutiles)
  useEffect(() => {
    if (!showArucoSettings) return;
    let cancelled = false;

    const load = async () => {
      setArucoLoading(true);
      try {
        const response = await api.get('/api/settings/ai-measure');
        if (!cancelled && response?.success && response?.data) {
          const nextMarkerSize = Number(response.data.markerSizeCm ?? 16.8);
          const nextBoardSize = Number(response.data.boardSizeCm ?? 24);
          if (Number.isFinite(nextMarkerSize)) setMarkerSizeCm(nextMarkerSize);
          if (Number.isFinite(nextBoardSize)) setBoardSizeCm(nextBoardSize);
        }
      } catch (e) {
        console.warn('[SmartCamera] Impossible de charger la config ArUco:', e);
      } finally {
        if (!cancelled) setArucoLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [api, showArucoSettings]);

  const handleSaveAruco = useCallback(async () => {
    const size = Number(markerSizeCm);
    if (!Number.isFinite(size) || size < 5 || size > 50) {
      message.error('Taille ArUco invalide (5–50 cm)');
      return;
    }

    setArucoSaving(true);
    try {
      const response = await api.post('/api/settings/ai-measure', {
        markerSizeCm: size,
        boardSizeCm: boardSizeCm
      });
      if (response?.success) {
        message.success('Configuration ArUco sauvegardée');
        // Mettre à jour les calculs côté front immédiatement
        setArucoMarkerSize(size);
      } else {
        message.error(response?.message || 'Erreur de sauvegarde');
      }
    } catch (e) {
      console.error(e);
      message.error('Erreur lors de la sauvegarde');
    } finally {
      setArucoSaving(false);
    }
  }, [api, boardSizeCm, markerSizeCm]);

  const handleDownloadAruco = useCallback(() => {
    const size = Number(markerSizeCm);
    if (!Number.isFinite(size) || size < 5 || size > 50) {
      message.error('Taille ArUco invalide (5–50 cm)');
      return;
    }
    downloadArucoMarkerSvg(size);
    message.success(`Marqueur ArUco ${size}cm téléchargé`);
  }, [markerSizeCm]);

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
    setPhotos(prev => {
      const newPhotos = prev.filter((_, i) => i !== index);
      // Mettre à jour sessionStorage immédiatement
      if (newPhotos.length === 0) {
        clearPersistedPhotos();
      }
      return newPhotos;
    });
  };

  // Valider les photos
  const handleValidate = () => {
    if (photos.length >= minPhotos) {
      clearPersistedPhotos(); // 🔒 Nettoyer avant de valider
      onCapture(photos);
    } else {
      message.warning(`Minimum ${minPhotos} photo(s) requise(s)`);
    }
  };
  
  // 🔒 Handler pour annuler avec nettoyage
  const handleCancel = useCallback(() => {
    clearPersistedPhotos();
    onCancel();
  }, [clearPersistedPhotos, onCancel]);

  // Ouvrir la caméra (avec permission gyroscope sur iOS)
  const openCamera = useCallback(async () => {
    // Sur iOS, demander la permission gyroscope au premier clic
    if (isAvailable && !hasPermission) {
      await requestPermission();
    }
    inputRef.current?.click();
  }, [isAvailable, hasPermission, requestPermission]);

  // Ouvrir la galerie (sans capture="environment")
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const openGallery = () => {
    galleryInputRef.current?.click();
  };

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
              🤖 IA Photo
            </Title>

            {/* 🟧 Bouton ArUco à côté du titre */}
            <Tooltip title="Configurer/télécharger le marqueur ArUco">
              <Button
                size="small"
                icon={<PrinterOutlined />}
                onClick={() => setShowArucoSettings(true)}
                style={{
                  borderColor: '#fa8c16',
                  color: '#fa8c16',
                  background: 'transparent'
                  ,
                  width: 28,
                  height: 28,
                  padding: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                aria-label="ArUco"
              />
            </Tooltip>

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

      {/* 🖨️ Modale ArUco (taille + téléchargement + sauvegarde) */}
      <Modal
        open={showArucoSettings}
        onCancel={() => setShowArucoSettings(false)}
        footer={null}
        title="🎯 Marqueur ArUco"
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontWeight: 600 }}>Taille du marqueur</span>
              <Tooltip title="Distance entre les CENTRES des 4 cercles magenta">
                <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
              </Tooltip>
            </div>
            <InputNumber
              min={5}
              max={50}
              step={0.1}
              precision={1}
              value={markerSizeCm}
              onChange={(v) => setMarkerSizeCm(Number(v ?? 16.8))}
              addonAfter="cm"
              style={{ width: '100%' }}
              disabled={arucoLoading}
            />
          </div>

          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleDownloadAruco}
              disabled={arucoLoading}
            >
              Télécharger SVG ({markerSizeCm} cm)
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSaveAruco}
              loading={arucoSaving}
              disabled={arucoLoading}
            >
              Sauvegarder
            </Button>
          </Space>
        </Space>
      </Modal>

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
            onClick={openGallery}
          >
            <div style={{ textAlign: 'center', color: '#888' }}>
              <PlusOutlined style={{ fontSize: 32, marginBottom: 8 }} />
              <div>📁 Charger depuis galerie</div>
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

      {/* Input file caché - OUVRE LA GALERIE */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
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
          onClick={handleCancel}
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
          {isProcessing ? '...' : 'Photo'}
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

{/* Message d'aide simplifié */}
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
          <div style={{ fontSize: 14, color: '#888' }}>
            Minimum {minPhotos} photo(s)
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartCameraMobile;
