/**
 * 📍📸 PointageClockIn — Composant mobile-first de pointage anti-fraude
 * 
 * Flux:
 * 1. L'utilisateur appuie sur "Pointer"
 * 2. Le navigateur demande les permissions GPS + Caméra
 * 3. Sans GPS → Blocage (impossible de pointer)
 * 4. Capture photo obligatoire du lieu
 * 5. Envoi au serveur: photo + GPS + device info + statut
 * 6. Distance calculée automatiquement côté serveur si le chantier a des coords
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button, Modal, message, Spin, Alert, Typography, Tag, Space, Result } from 'antd';
import {
  CameraOutlined, EnvironmentOutlined, SendOutlined,
  CheckCircleOutlined, WarningOutlined, ReloadOutlined, CloseOutlined,
  MobileOutlined,
} from '@ant-design/icons';

const { Text, Title } = Typography;

import { STATUS_LABELS } from './pointageConstants';
import { SF } from '../../components/zhiive/ZhiiveTheme';
import { logger } from '../../lib/logger';

interface PointageClockInProps {
  chantierId: string;
  chantierName?: string;
  chantierLatitude?: number | null;
  chantierLongitude?: number | null;
  geoFenceRadius?: number | null;
  api: unknown;
  onSuccess: () => void;
  /** Pre-selected technician ID */
  technicianId?: string;
  /** Selected pointage status type (e.g. ARRIVEE, DEPART_PAUSE, FIN...) */
  pointageType: string;
  /** Disable the button */
  disabled?: boolean;
}

interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
}

/** Collect device fingerprint */
function getDeviceInfo() {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform || (navigator as any).userAgentData?.platform || 'unknown',
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    pixelRatio: window.devicePixelRatio || 1,
    language: navigator.language,
    online: navigator.onLine,
    timestamp: new Date().toISOString(),
  };
}

/** Calculate Haversine distance (client-side preview) */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const PointageClockIn: React.FC<PointageClockInProps> = ({
  chantierId,
  chantierName,
  chantierLatitude,
  chantierLongitude,
  geoFenceRadius = 500,
  api,
  onSuccess,
  technicianId,
  pointageType,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'gps' | 'camera' | 'review' | 'sending' | 'done'>('gps');
  const [geoPosition, setGeoPosition] = useState<GeoPosition | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null); // base64
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const statusCfg = STATUS_LABELS[pointageType] || STATUS_LABELS.ARRIVEE;
  const statusColor = statusCfg.color;

  // ═══ GPS ═══
  const requestGPS = useCallback(() => {
    setGeoLoading(true);
    setGeoError(null);

    if (!navigator.geolocation) {
      setGeoError('La géolocalisation n\'est pas disponible sur cet appareil');
      setGeoLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos: GeoPosition = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        setGeoPosition(pos);
        setGeoLoading(false);

        // Calculate distance preview
        if (chantierLatitude && chantierLongitude) {
          const d = haversineDistance(pos.latitude, pos.longitude, chantierLatitude, chantierLongitude);
          setDistance(Math.round(d));
        }

        // Auto-advance to camera
        setStep('camera');
      },
      (error) => {
        setGeoLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGeoError('⛔ Permission GPS refusée. Activez la localisation dans les paramètres de votre navigateur pour pouvoir pointer.');
            break;
          case error.POSITION_UNAVAILABLE:
            setGeoError('📡 Position GPS indisponible. Vérifiez que le GPS est activé sur votre appareil.');
            break;
          case error.TIMEOUT:
            setGeoError('⏱️ Délai d\'attente GPS dépassé. Réessayez dans un endroit avec meilleure réception.');
            break;
          default:
            setGeoError('Erreur GPS inconnue');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0, // Force fresh position — no caching
      }
    );
  }, [chantierLatitude, chantierLongitude]);

  // ═══ CAMERA ═══
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }, // Caméra arrière
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraReady(true);
        };
      }
    } catch (err: unknown) {
      logger.error('[Camera]', err);
      if (err.name === 'NotAllowedError') {
        setCameraError('⛔ Permission caméra refusée. Activez la caméra dans les paramètres du navigateur.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('📷 Aucune caméra détectée sur cet appareil.');
      } else {
        setCameraError(`Erreur caméra: ${err.message}`);
      }
    }
  }, []);

  const takePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    // Add timestamp watermark
    const now = new Date();
    const timeStr = now.toLocaleString('fr-BE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    ctx.fillStyle = SF.overlayDarkMd;
    ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`📍 ${timeStr} | ${geoPosition?.latitude.toFixed(5)}, ${geoPosition?.longitude.toFixed(5)}`, 10, canvas.height - 14);

    const base64 = canvas.toDataURL('image/jpeg', 0.7); // 70% quality for reasonable size
    setPhoto(base64);
    setStep('review');

    // Stop camera
    stopCamera();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoPosition]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  const retakePhoto = useCallback(() => {
    setPhoto(null);
    setStep('camera');
    startCamera();
  }, [startCamera]);

  // ═══ SUBMIT ═══
  const handleSubmit = useCallback(async () => {
    if (!geoPosition || !photo) {
      message.error('GPS et photo sont obligatoires');
      return;
    }

    setSending(true);
    setStep('sending');
    const deviceInfo = getDeviceInfo();

    try {
      const now = new Date();
      await api.post('/api/teams/time-entries', {
        technicianId,
        chantierId,
        date: now.toISOString().split('T')[0],
        startTime: now.toISOString(),
        type: pointageType,
        latitude: geoPosition.latitude,
        longitude: geoPosition.longitude,
        photo,
        deviceInfo,
      });
      message.success(`✅ ${statusCfg.emoji} ${statusCfg.label} pointé avec succès !`);
      setStep('done');
      setTimeout(() => {
        setOpen(false);
        onSuccess();
        resetState();
      }, 1500);
    } catch (err: unknown) {
      message.error(err?.message || 'Erreur lors du pointage');
      setStep('review');
    } finally {
      setSending(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoPosition, photo, api, technicianId, chantierId, pointageType, onSuccess]);

  const resetState = useCallback(() => {
    setStep('gps');
    setGeoPosition(null);
    setGeoError(null);
    setPhoto(null);
    setCameraReady(false);
    setCameraError(null);
    setDistance(null);
    stopCamera();
  }, [stopCamera]);

  const handleOpen = useCallback(() => {
    setOpen(true);
    resetState();
    // Auto-start GPS request
    setTimeout(() => requestGPS(), 300);
  }, [requestGPS, resetState]);

  const handleClose = useCallback(() => {
    setOpen(false);
    stopCamera();
    resetState();
  }, [stopCamera, resetState]);

  // Start camera when step changes to camera
  useEffect(() => {
    if (step === 'camera' && open) {
      startCamera();
    }
    return () => {
      if (step !== 'camera') {
        stopCamera();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, open]);

  // ═══ Distance status ═══
  const distanceStatus = distance !== null && geoFenceRadius
    ? distance <= geoFenceRadius ? 'ok' : distance <= geoFenceRadius * 2 ? 'warning' : 'danger'
    : null;

  return (
    <>
      <Button
        type="primary"
        icon={<SendOutlined />}
        onClick={handleOpen}
        disabled={disabled}
        size="large"
        style={{
          height: 48,
          fontSize: 15,
          fontWeight: 600,
          background: statusColor,
          borderColor: statusColor,
        }}
      >
        📌 Pointer
      </Button>

      <Modal
        open={open}
        onCancel={handleClose}
        footer={null}
        width="95vw"
        style={{ maxWidth: 480, top: 20 }}
        title={null}
        closable={step !== 'sending'}
        maskClosable={false}
        destroyOnHidden
        styles={{ body: { padding: 0 } }}
      >
        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg, ${statusColor} 0%, ${statusColor}cc 100%)`,
          padding: '20px 24px',
          color: '#fff',
          borderRadius: '8px 8px 0 0',
        }}>
          <Title level={4} style={{ color: '#fff', margin: 0 }}>
            {statusCfg.emoji} Pointage — {statusCfg.label}
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>
            {chantierName || 'Chantier'}
          </Text>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {/* Step indicators */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {['gps', 'camera', 'review'].map((s, i) => (
              <div key={s} style={{
                flex: 1, height: 4, borderRadius: 2,
                background: step === s ? '#1677ff' : ['gps', 'camera', 'review'].indexOf(step) > i ? '#52c41a' : '#f0f0f0',
              }} />
            ))}
          </div>

          {/* ═══ STEP 1: GPS ═══ */}
          {step === 'gps' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <EnvironmentOutlined style={{ fontSize: 48, color: geoError ? '#ff4d4f' : '#1677ff', marginBottom: 16 }} />
              <Title level={5}>📍 Localisation GPS</Title>
              <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                La localisation est <strong>obligatoire</strong> pour pointer.<br />
                Votre position sera enregistrée pour vérification.
              </Text>

              {geoLoading && (
                <div style={{ margin: '20px 0' }}>
                  <Spin size="large" />
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary">Acquisition GPS en cours...</Text>
                  </div>
                </div>
              )}

              {geoError && (
                <Alert
                  type="error"
                  message={geoError}
                  style={{ marginBottom: 16, textAlign: 'left' }}
                  showIcon
                />
              )}

              {geoPosition && (
                <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                  <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 6 }} />
                  <Text strong style={{ color: '#52c41a' }}>Position capturée</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {geoPosition.latitude.toFixed(6)}, {geoPosition.longitude.toFixed(6)} (±{Math.round(geoPosition.accuracy)}m)
                  </Text>
                </div>
              )}

              {!geoLoading && (
                <Button
                  type="primary"
                  icon={<EnvironmentOutlined />}
                  onClick={requestGPS}
                  size="large"
                  style={{ marginTop: 8 }}
                >
                  {geoError ? 'Réessayer' : 'Activer la localisation'}
                </Button>
              )}
            </div>
          )}

          {/* ═══ STEP 2: CAMERA ═══ */}
          {step === 'camera' && (
            <div style={{ textAlign: 'center' }}>
              <Title level={5}>📸 Photo du lieu</Title>
              <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                Prenez une photo du chantier pour prouver votre présence.
              </Text>

              {/* Distance indicator */}
              {distance !== null && (
                <div style={{ marginBottom: 12 }}>
                  <Tag
                    icon={<EnvironmentOutlined />}
                    color={distanceStatus === 'ok' ? 'success' : distanceStatus === 'warning' ? 'warning' : 'error'}
                    style={{ fontSize: 13, padding: '4px 12px' }}
                  >
                    {distance < 1000
                      ? `${distance}m du chantier`
                      : `${(distance / 1000).toFixed(1)}km du chantier`}
                    {distanceStatus === 'ok' && ' ✓'}
                    {distanceStatus === 'danger' && ' ⚠️ Trop loin !'}
                  </Tag>
                </div>
              )}

              {cameraError ? (
                <Alert type="error" message={cameraError} style={{ marginBottom: 16, textAlign: 'left' }} showIcon />
              ) : (
                <div style={{
                  position: 'relative',
                  width: '100%',
                  maxWidth: 430,
                  margin: '0 auto',
                  borderRadius: 12,
                  overflow: 'hidden',
                  background: '#000',
                  aspectRatio: '16/9',
                }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {!cameraReady && (
                    <div style={{
                      position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: SF.overlayDarkHeavy,
                    }}>
                      <Spin size="large" />
                    </div>
                  )}
                  {/* GPS overlay on camera feed */}
                  {geoPosition && (
                    <div style={{
                      position: 'absolute', bottom: 8, left: 8, right: 8,
                      background: SF.overlayDarkStrong, borderRadius: 6, padding: '4px 8px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <Text style={{ color: '#fff', fontSize: 10, fontFamily: 'monospace' }}>
                        📍 {geoPosition.latitude.toFixed(5)}, {geoPosition.longitude.toFixed(5)}
                      </Text>
                      <Text style={{ color: '#fff', fontSize: 10, fontFamily: 'monospace' }}>
                        {new Date().toLocaleTimeString('fr-BE')}
                      </Text>
                    </div>
                  )}
                </div>
              )}

              {/* Hidden canvas for photo capture */}
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'center' }}>
                <Button onClick={handleClose} icon={<CloseOutlined />}>
                  Annuler
                </Button>
                <Button
                  type="primary"
                  size="large"
                  icon={<CameraOutlined />}
                  onClick={takePhoto}
                  disabled={!cameraReady}
                  style={{
                    height: 48, minWidth: 160, fontSize: 16, fontWeight: 600,
                    background: '#1677ff', borderRadius: 24,
                  }}
                >
                  📸 Capturer
                </Button>
              </div>
            </div>
          )}

          {/* ═══ STEP 3: REVIEW ═══ */}
          {step === 'review' && photo && (
            <div style={{ textAlign: 'center' }}>
              <Title level={5}>✅ Vérification</Title>
              <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                Vérifiez les données avant validation.
              </Text>

              {/* Photo preview */}
              <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 16, border: '2px solid #d9d9d9' }}>
                <img loading="lazy" src={photo} alt="Photo pointage" style={{ width: '100%', display: 'block' }} />
              </div>

              {/* Data summary */}
              <div style={{ background: '#fafafa', borderRadius: 8, padding: 12, marginBottom: 16, textAlign: 'left' }}>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary"><EnvironmentOutlined /> Position</Text>
                    <Text style={{ fontSize: 12, fontFamily: 'monospace' }}>
                      {geoPosition?.latitude.toFixed(6)}, {geoPosition?.longitude.toFixed(6)}
                    </Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary"><EnvironmentOutlined /> Précision</Text>
                    <Text>{geoPosition ? `±${Math.round(geoPosition.accuracy)}m` : '-'}</Text>
                  </div>
                  {distance !== null && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary"><EnvironmentOutlined /> Distance chantier</Text>
                      <Tag
                        color={distanceStatus === 'ok' ? 'success' : distanceStatus === 'warning' ? 'warning' : 'error'}
                        style={{ margin: 0 }}
                      >
                        {distance < 1000 ? `${distance}m` : `${(distance / 1000).toFixed(1)}km`}
                        {distanceStatus === 'danger' && ' ⚠️'}
                      </Tag>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary"><MobileOutlined /> Appareil</Text>
                    <Text style={{ fontSize: 11 }}>
                      {/Android/i.test(navigator.userAgent) ? '📱 Android' :
                       /iPhone|iPad/i.test(navigator.userAgent) ? '📱 iOS' : '💻 Desktop'}
                    </Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary">🕐 Heure</Text>
                    <Text strong>{new Date().toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })}</Text>
                  </div>
                </Space>
              </div>

              {/* Distance warning */}
              {distanceStatus === 'danger' && (
                <Alert
                  type="warning"
                  icon={<WarningOutlined />}
                  message="Vous êtes loin du chantier"
                  description={`Votre position est à ${distance}m du chantier (limite: ${geoFenceRadius}m). Le pointage sera enregistré avec un avertissement.`}
                  style={{ marginBottom: 16, textAlign: 'left' }}
                  showIcon
                />
              )}

              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <Button icon={<ReloadOutlined />} onClick={retakePhoto}>
                  Reprendre la photo
                </Button>
                <Button
                  type="primary"
                  size="large"
                  onClick={handleSubmit}
                  loading={sending}
                  style={{
                    height: 48, minWidth: 180, fontSize: 15, fontWeight: 600,
                    background: statusColor,
                    borderColor: statusColor,
                    borderRadius: 24,
                  }}
                >
                  {statusCfg.emoji} Confirmer
                </Button>
              </div>
            </div>
          )}

          {/* ═══ STEP 4: SENDING ═══ */}
          {step === 'sending' && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>
                <Text>Envoi du pointage en cours...</Text>
              </div>
            </div>
          )}

          {/* ═══ STEP 5: DONE ═══ */}
          {step === 'done' && (
            <Result
              status="success"
              title={`${statusCfg.emoji} ${statusCfg.label} pointé !`}
              subTitle={`${new Date().toLocaleString('fr-BE')}`}
              style={{ padding: '20px 0' }}
            />
          )}
        </div>
      </Modal>
    </>
  );
};

export default PointageClockIn;
