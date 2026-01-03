/**
 * 🎬 VideoCapture - Capture vidéo pour analyse de mouvement
 * 
 * Permet de capturer une vidéo où l'utilisateur fait le tour de l'objet
 * L'IA extrait automatiquement les meilleures frames à différents angles
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button, Progress, Alert, Space, Typography, Tag } from 'antd';
import { 
  VideoCameraOutlined, 
  PauseOutlined,
  CheckCircleOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { CapturedPhoto } from './SmartCameraMobile';
import type { CaptureMetadata } from './PhotoAnalyzer';

const { Text } = Typography;

interface VideoCaptureProps {
  onComplete: (photos: CapturedPhoto[]) => void;
  onCancel: () => void;
  targetDuration?: number; // Durée cible en secondes
  minFrames?: number; // Nombre minimum de frames à extraire
}

interface ExtractedFrame {
  imageBase64: string;
  timestamp: number;
  gyroscope: { alpha: number; beta: number; gamma: number };
  quality: number;
}

const VideoCapture: React.FC<VideoCaptureProps> = ({
  onComplete,
  onCancel,
  targetDuration = 10,
  minFrames = 5
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const framesRef = useRef<ExtractedFrame[]>([]);
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [gyroData, setGyroData] = useState({ alpha: 0, beta: 0, gamma: 0 });
  const [anglesCovered, setAnglesCovered] = useState<number[]>([]);
  const [guidance, setGuidance] = useState('Appuyez pour commencer l\'enregistrement');
  
  // Timer pour l'enregistrement
  const timerRef = useRef<NodeJS.Timeout>();
  const frameIntervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    initCamera();
    initGyroscope();
    
    return () => {
      cleanup();
    };
  }, []);

  const initCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera init error:', err);
    }
  };

  const initGyroscope = () => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      setGyroData({
        alpha: e.alpha || 0,
        beta: e.beta || 0,
        gamma: e.gamma || 0
      });
    };
    
    // @ts-ignore
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      // @ts-ignore
      DeviceOrientationEvent.requestPermission().then((response: string) => {
        if (response === 'granted') {
          window.addEventListener('deviceorientation', handleOrientation);
        }
      });
    } else {
      window.addEventListener('deviceorientation', handleOrientation);
    }
  };

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    
    chunksRef.current = [];
    framesRef.current = [];
    setAnglesCovered([]);
    setRecordingTime(0);
    
    // Créer le MediaRecorder
    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: 'video/webm;codecs=vp9'
    });
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };
    
    mediaRecorder.onstop = () => {
      processRecording();
    };
    
    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(100); // Chunk every 100ms
    setIsRecording(true);
    
    // Timer pour afficher le temps
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => {
        if (prev >= targetDuration) {
          stopRecording();
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
    
    // Capturer des frames périodiquement
    frameIntervalRef.current = setInterval(() => {
      captureFrame();
    }, 500); // Capture every 500ms
    
    setGuidance('🔄 Tournez lentement autour de l\'objet...');
  };

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);
    
    // Calculer un score de qualité simple
    const quality = calculateFrameQuality(ctx, canvas.width, canvas.height);
    
    const frame: ExtractedFrame = {
      imageBase64,
      timestamp: Date.now(),
      gyroscope: { ...gyroData },
      quality
    };
    
    framesRef.current.push(frame);
    
    // Tracker les angles couverts
    const angle = Math.floor(gyroData.alpha / 30) * 30; // Arrondir à 30°
    if (!anglesCovered.includes(angle)) {
      setAnglesCovered(prev => [...prev, angle]);
      updateGuidance(anglesCovered.length);
    }
  };

  const calculateFrameQuality = (ctx: CanvasRenderingContext2D, width: number, height: number): number => {
    // Analyse rapide de netteté via variance des gradients
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    let sumGradient = 0;
    const step = 4; // Échantillonner tous les 4 pixels pour la vitesse
    
    for (let y = 0; y < height - 1; y += step) {
      for (let x = 0; x < width - 1; x += step) {
        const idx = (y * width + x) * 4;
        const idxRight = idx + 4;
        const idxDown = ((y + 1) * width + x) * 4;
        
        const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        const grayRight = (data[idxRight] + data[idxRight + 1] + data[idxRight + 2]) / 3;
        const grayDown = (data[idxDown] + data[idxDown + 1] + data[idxDown + 2]) / 3;
        
        sumGradient += Math.abs(gray - grayRight) + Math.abs(gray - grayDown);
      }
    }
    
    const avgGradient = sumGradient / ((width / step) * (height / step));
    return Math.min(100, avgGradient * 2);
  };

  const updateGuidance = (coveredCount: number) => {
    const messages = [
      '🔄 Continuez à tourner...',
      '↪️ Bonne progression! Continuez...',
      '✨ Excellent! Encore un peu...',
      '🎯 Presque terminé!',
      '✅ Couverture parfaite!'
    ];
    
    const idx = Math.min(coveredCount, messages.length - 1);
    setGuidance(messages[idx]);
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    setIsRecording(false);
    setGuidance('Traitement en cours...');
  };

  const processRecording = async () => {
    setIsProcessing(true);
    setProcessProgress(0);
    
    try {
      // Sélectionner les meilleures frames
      const bestFrames = selectBestFrames(framesRef.current, minFrames);
      
      setProcessProgress(50);
      
      // Convertir en CapturedPhoto[]
      const photos: CapturedPhoto[] = bestFrames.map((frame, idx) => ({
        imageBase64: frame.imageBase64,
        metadata: {
          timestamp: frame.timestamp,
          gyroscope: frame.gyroscope,
          accelerometer: { x: 0, y: 0, z: 9.8 },
          camera: { facingMode: 'environment', zoom: 1 },
          lighting: { brightness: 128, contrast: 100, uniformity: 70 },
          quality: { 
            sharpness: frame.quality, 
            blur: 100 - frame.quality, 
            overallScore: frame.quality 
          },
          photoIndex: idx + 1,
          totalPhotosNeeded: bestFrames.length
        },
        thumbnailBase64: frame.imageBase64 // Utiliser la même image pour simplifier
      }));
      
      setProcessProgress(100);
      
      // Terminer
      setTimeout(() => {
        onComplete(photos);
      }, 500);
      
    } catch (err) {
      console.error('Processing error:', err);
      setIsProcessing(false);
    }
  };

  const selectBestFrames = (frames: ExtractedFrame[], minCount: number): ExtractedFrame[] => {
    if (frames.length <= minCount) return frames;
    
    // Grouper les frames par angle (buckets de 30°)
    const buckets: Map<number, ExtractedFrame[]> = new Map();
    
    frames.forEach(frame => {
      const bucket = Math.floor(frame.gyroscope.alpha / 30) * 30;
      if (!buckets.has(bucket)) {
        buckets.set(bucket, []);
      }
      buckets.get(bucket)!.push(frame);
    });
    
    // Prendre la meilleure frame de chaque bucket
    const selected: ExtractedFrame[] = [];
    
    buckets.forEach((bucketFrames) => {
      // Trier par qualité décroissante
      bucketFrames.sort((a, b) => b.quality - a.quality);
      selected.push(bucketFrames[0]);
    });
    
    // Si pas assez, compléter avec les meilleures globales
    if (selected.length < minCount) {
      const remaining = frames
        .filter(f => !selected.includes(f))
        .sort((a, b) => b.quality - a.quality);
      
      while (selected.length < minCount && remaining.length > 0) {
        selected.push(remaining.shift()!);
      }
    }
    
    // Trier par timestamp
    return selected.sort((a, b) => a.timestamp - b.timestamp);
  };

  const progressPercent = (recordingTime / targetDuration) * 100;

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100vh',
      backgroundColor: '#000'
    }}>
      {/* Flux vidéo */}
      <video
        ref={videoRef}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        playsInline
        muted
      />
      
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      
      {/* Overlay de guide */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        padding: 16,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)'
      }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Alert
            message={guidance}
            type={isRecording ? 'info' : 'warning'}
            showIcon
          />
          
          {isRecording && (
            <>
              <Progress 
                percent={progressPercent}
                status="active"
                strokeColor="#ff4d4f"
                format={() => `${recordingTime}s / ${targetDuration}s`}
              />
              
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Tag color="red">● REC</Tag>
                <Tag>Frames: {framesRef.current.length}</Tag>
                <Tag color={anglesCovered.length >= 4 ? 'green' : 'orange'}>
                  Angles: {anglesCovered.length}/12
                </Tag>
              </div>
            </>
          )}
          
          {isProcessing && (
            <Progress
              percent={processProgress}
              status="active"
              format={() => 'Extraction des frames...'}
            />
          )}
        </Space>
      </div>
      
      {/* Indicateur d'angles couverts */}
      {isRecording && (
        <div style={{
          position: 'absolute',
          top: '50%',
          right: 16,
          transform: 'translateY(-50%)',
          width: 60,
          height: 60
        }}>
          <svg viewBox="0 0 100 100">
            {/* Cercle de fond */}
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="5"/>
            
            {/* Segments couverts */}
            {anglesCovered.map((angle, idx) => {
              const startAngle = (angle - 90) * Math.PI / 180;
              const endAngle = ((angle + 30) - 90) * Math.PI / 180;
              const x1 = 50 + 45 * Math.cos(startAngle);
              const y1 = 50 + 45 * Math.sin(startAngle);
              const x2 = 50 + 45 * Math.cos(endAngle);
              const y2 = 50 + 45 * Math.sin(endAngle);
              
              return (
                <path
                  key={idx}
                  d={`M 50 50 L ${x1} ${y1} A 45 45 0 0 1 ${x2} ${y2} Z`}
                  fill="#52c41a"
                  opacity={0.7}
                />
              );
            })}
            
            {/* Point de direction actuelle */}
            <circle
              cx={50 + 40 * Math.cos((gyroData.alpha - 90) * Math.PI / 180)}
              cy={50 + 40 * Math.sin((gyroData.alpha - 90) * Math.PI / 180)}
              r="5"
              fill="#1890ff"
            />
          </svg>
        </div>
      )}
      
      {/* Boutons */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center'
      }}>
        <Button onClick={onCancel} disabled={isProcessing}>
          Annuler
        </Button>
        
        {!isRecording && !isProcessing && (
          <Button
            type="primary"
            danger
            size="large"
            shape="circle"
            icon={<VideoCameraOutlined />}
            onClick={startRecording}
            style={{ width: 70, height: 70, fontSize: 24 }}
          />
        )}
        
        {isRecording && (
          <Button
            type="primary"
            size="large"
            shape="circle"
            icon={<PauseOutlined />}
            onClick={stopRecording}
            style={{ width: 70, height: 70, fontSize: 24, backgroundColor: '#ff4d4f' }}
          />
        )}
        
        {isProcessing && (
          <Button
            type="primary"
            size="large"
            shape="circle"
            icon={<LoadingOutlined />}
            disabled
            style={{ width: 70, height: 70, fontSize: 24 }}
          />
        )}
        
        <div style={{ width: 70 }} />
      </div>
    </div>
  );
};

export default VideoCapture;
