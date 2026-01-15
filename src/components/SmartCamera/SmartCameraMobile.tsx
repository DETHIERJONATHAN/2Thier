/**
 * 📸 SmartCameraMobile - Version 100% Mobile avec caméra IN-BROWSER
 * 
 * 🔥 IMPORTANT: Utilise getUserMedia pour capturer dans le navigateur
 * au lieu de l'app caméra native Android qui décharge la page !
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
  InfoCircleOutlined,
  VideoCameraOutlined,
  StopOutlined
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
    // 📸 NOUVEAU: Capacités de la caméra pour calcul de focale précis
    cameraCapabilities?: {
      width?: number;           // Résolution réelle
      height?: number;
      focalLength?: number;     // Focale en mm (si disponible)
      focalLengthRange?: { min: number; max: number };  // Range de focale
      zoom?: number;            // Niveau de zoom actuel
      zoomRange?: { min: number; max: number };
      deviceId?: string;        // ID unique de la caméra
      label?: string;           // Nom de la caméra (ex: "Back Camera")
    };
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

  // 📹 CAMÉRA IN-BROWSER: Stream vidéo pour éviter l'app native Android
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  // 📸 NOUVEAU: Capacités de la caméra extraites automatiquement
  const [cameraCapabilities, setCameraCapabilities] = useState<CapturedPhoto['metadata']['cameraCapabilities']>(undefined);

  // 📹 Démarrer la caméra in-browser
  const startCamera = useCallback(async () => {
    // Sur iOS, demander la permission gyroscope au premier clic
    if (isAvailable && !hasPermission) {
      await requestPermission();
    }
    
    try {
      setCameraError(null);
      console.log('📹 [SmartCamera] Démarrage caméra in-browser...');
      
      // 📱 IMPORTANT: Sur mobile portrait, demander la PLUS HAUTE résolution possible
      // Le navigateur adaptera automatiquement selon l'orientation
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { exact: 'environment' }, // Forcer caméra arrière
          width: { ideal: 4032, min: 1920 },    // 📸 Haute résolution!
          height: { ideal: 3024, min: 1080 },   // 📸 4K si possible
          frameRate: { ideal: 30 },
          // Activer l'autofocus continu si supporté
          advanced: [{
            focusMode: 'continuous'
          }] as any
        },
        audio: false
      });
      
      // Log des capacités réelles obtenues
      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();
      console.log('📹 [SmartCamera] Résolution obtenue:', settings.width, 'x', settings.height);
      
      // 📸 NOUVEAU: Extraire TOUTES les capacités de la caméra pour calcul de focale
      try {
        const caps: CapturedPhoto['metadata']['cameraCapabilities'] = {
          width: settings.width,
          height: settings.height,
          zoom: settings.zoom,
          deviceId: settings.deviceId,
          label: videoTrack.label // Ex: "Back Camera" ou "Rear Triple Camera"
        };
        
        // getCapabilities() contient les ranges (focal, zoom) - pas supporté partout
        if ('getCapabilities' in videoTrack) {
          const fullCaps = (videoTrack as any).getCapabilities();
          console.log('📸 [SmartCamera] Capacités caméra complètes:', fullCaps);
          
          // Extraire focale si disponible (Android Chrome principalement)
          if (fullCaps.focusDistance) {
            // focusDistance en dioptries, conversion approximative vers focal mm
            // Note: ce n'est pas la focale exacte mais un proxy
            console.log('📸 [SmartCamera] Focus distance range:', fullCaps.focusDistance);
          }
          
          // Zoom range
          if (fullCaps.zoom) {
            caps.zoomRange = { min: fullCaps.zoom.min, max: fullCaps.zoom.max };
            console.log('📸 [SmartCamera] Zoom range:', caps.zoomRange);
          }
          
          // Résolution max
          if (fullCaps.width && fullCaps.height) {
            console.log(`📸 [SmartCamera] Résolution max: ${fullCaps.width.max}x${fullCaps.height.max}`);
          }
        }
        
        setCameraCapabilities(caps);
        console.log('📸 [SmartCamera] Capacités stockées:', caps);
      } catch (capErr) {
        console.warn('📸 [SmartCamera] Impossible d\'extraire les capacités:', capErr);
      }
      
      setCameraStream(stream);
      setCameraActive(true);
      // NOTE: Le stream sera attaché au video element via useEffect ci-dessous
      
      console.log('📹 [SmartCamera] Caméra démarrée avec succès');
    } catch (err: any) {
      console.error('📹 [SmartCamera] Erreur caméra:', err);
      
      // 🔄 Fallback si exact: 'environment' échoue (certains navigateurs)
      try {
        console.log('📹 [SmartCamera] Tentative fallback sans exact...');
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        });
        setCameraStream(fallbackStream);
        setCameraActive(true);
        console.log('📹 [SmartCamera] Fallback réussi');
        return;
      } catch (fallbackErr) {
        console.error('📹 [SmartCamera] Fallback échoué aussi:', fallbackErr);
      }
      
      setCameraError(err.message || 'Impossible d\'accéder à la caméra');
      // Fallback vers l'input file natif si getUserMedia échoue
      message.warning('Caméra in-browser non disponible, utilisation de la méthode native');
      inputRef.current?.click();
    }
  }, [isAvailable, hasPermission, requestPermission]);
  
  // 📹 Attacher le stream au video element quand il est disponible
  // (Le video element n'existe pas au moment où startCamera() est appelé car cameraActive=false)
  useEffect(() => {
    if (cameraStream && videoRef.current) {
      console.log('📹 [SmartCamera] Attachement du stream au video element...');
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(err => {
        console.error('📹 [SmartCamera] Erreur play():', err);
      });
    }
  }, [cameraStream, cameraActive]); // cameraActive déclenche le rendu du video element
  
  // 📹 Arrêter la caméra
  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
    console.log('📹 [SmartCamera] Caméra arrêtée');
  }, [cameraStream]);
  
  // 📸 État pour le compte à rebours et la capture
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [focusStatus, setFocusStatus] = useState<'waiting' | 'focusing' | 'ready'>('waiting');
  
  // 📸 Calculer la netteté d'une frame vidéo (Laplacian variance)
  // ⚠️ IMPORTANT: Utilise un canvas temporaire pour ne PAS modifier le canvas principal!
  const calculateSharpness = useCallback((video: HTMLVideoElement, _canvas: HTMLCanvasElement): number => {
    // Créer un canvas TEMPORAIRE pour l'analyse (ne pas modifier le canvas principal!)
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return 0;
    
    // Utiliser une zone centrale pour l'analyse (plus rapide)
    const sampleSize = 200;
    const sx = Math.max(0, (video.videoWidth - sampleSize) / 2);
    const sy = Math.max(0, (video.videoHeight - sampleSize) / 2);
    
    tempCanvas.width = sampleSize;
    tempCanvas.height = sampleSize;
    ctx.drawImage(video, sx, sy, sampleSize, sampleSize, 0, 0, sampleSize, sampleSize);
    
    const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
    const data = imageData.data;
    
    // Convertir en niveaux de gris et calculer le Laplacien
    let laplacianSum = 0;
    let count = 0;
    
    for (let y = 1; y < sampleSize - 1; y++) {
      for (let x = 1; x < sampleSize - 1; x++) {
        const i = (y * sampleSize + x) * 4;
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        
        // Laplacien simplifié: différence avec les voisins
        const top = ((y - 1) * sampleSize + x) * 4;
        const bottom = ((y + 1) * sampleSize + x) * 4;
        const left = (y * sampleSize + (x - 1)) * 4;
        const right = (y * sampleSize + (x + 1)) * 4;
        
        const grayTop = data[top] * 0.299 + data[top + 1] * 0.587 + data[top + 2] * 0.114;
        const grayBottom = data[bottom] * 0.299 + data[bottom + 1] * 0.587 + data[bottom + 2] * 0.114;
        const grayLeft = data[left] * 0.299 + data[left + 1] * 0.587 + data[left + 2] * 0.114;
        const grayRight = data[right] * 0.299 + data[right + 1] * 0.587 + data[right + 2] * 0.114;
        
        const laplacian = Math.abs(4 * gray - grayTop - grayBottom - grayLeft - grayRight);
        laplacianSum += laplacian;
        count++;
      }
    }
    
    return count > 0 ? laplacianSum / count : 0;
  }, []);
  
  // 📸 Capturer une photo depuis le stream vidéo avec HAUTE QUALITÉ
  const captureFromStream = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) {
      message.error('Caméra non prête');
      return;
    }
    
    // 🔒 Éviter double capture
    if (isCapturing) return;
    setIsCapturing(true);
    setFocusStatus('focusing');
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // ⏱️ Compte à rebours avec vérification de netteté (3 secondes max)
      // Attendre que l'autofocus se stabilise
      setCountdown(3);
      
      let bestSharpness = 0;
      let attempts = 0;
      const maxAttempts = 6; // 6 x 500ms = 3 secondes max
      
      while (attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 500));
        attempts++;
        setCountdown(Math.max(1, 3 - Math.floor(attempts / 2)));
        
        const currentSharpness = calculateSharpness(video, canvas);
        console.log(`🔍 [SmartCamera] Netteté: ${currentSharpness.toFixed(1)} (essai ${attempts})`);
        
        // Si la netteté est bonne (>15) ou stable, on capture
        if (currentSharpness > 15) {
          console.log(`✅ [SmartCamera] Netteté suffisante: ${currentSharpness.toFixed(1)}`);
          setFocusStatus('ready');
          break;
        }
        
        // Si la netteté se stabilise (variation < 10%), on capture
        if (attempts > 2 && Math.abs(currentSharpness - bestSharpness) < bestSharpness * 0.1) {
          console.log(`✅ [SmartCamera] Netteté stabilisée: ${currentSharpness.toFixed(1)}`);
          setFocusStatus('ready');
          break;
        }
        
        bestSharpness = Math.max(bestSharpness, currentSharpness);
      }
      
      setCountdown(null);
      
      // 📐 Définir la taille du canvas = taille RÉELLE de la vidéo (haute résolution)
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      console.log(`📸 [SmartCamera] Capture à ${canvas.width}x${canvas.height}px`);
      
      // 🎨 Dessiner la frame actuelle avec qualité maximale
      const ctx = canvas.getContext('2d', { 
        alpha: false,           // Pas de transparence = plus rapide
        desynchronized: true    // Réduit la latence
      });
      if (!ctx) {
        throw new Error('Canvas context non disponible');
      }
      
      // Qualité de rendu maximale
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // 📏 Calculer la netteté finale
      const finalSharpness = calculateSharpness(video, canvas);
      
      // 📸 Convertir en base64 avec QUALITÉ MAXIMALE (0.95 au lieu de 0.9)
      const base64 = canvas.toDataURL('image/jpeg', 0.95);
      
      // Log de la taille pour debug
      const sizeKB = Math.round(base64.length * 0.75 / 1024);
      console.log(`📸 [SmartCamera] Image: ${canvas.width}x${canvas.height}, ${sizeKB}KB, netteté=${finalSharpness.toFixed(1)}`);
      
      // ⚠️ Avertir si la photo est floue
      if (finalSharpness < 10) {
        message.warning('⚠️ Photo peut-être floue - essayez de stabiliser le téléphone');
      }
      
      // 📱 Capturer l'orientation actuelle du téléphone (gyroscope)
      const currentOrientation = {
        alpha: orientation.alpha,
        beta: orientation.beta,
        gamma: orientation.gamma,
        quality: analyze().quality
      };
      
      // Créer la photo
      const newPhoto: CapturedPhoto = {
        imageBase64: base64,
        metadata: {
          timestamp: Date.now(),
          photoIndex: photos.length,
          totalPhotosNeeded: minPhotos,
          gyroscope: currentOrientation,
          accelerometer: { x: 0, y: 0, z: 0 },
          camera: { facingMode: 'environment', zoom: cameraCapabilities?.zoom || 1 },
          lighting: { brightness: 128, contrast: 50, uniformity: 80 },
          quality: { 
            sharpness: Math.round(finalSharpness), 
            blur: Math.round(100 - finalSharpness * 5), 
            overallScore: Math.min(100, Math.round(finalSharpness * 5)),
            resolution: `${canvas.width}x${canvas.height}`,
            sizeKB
          } as any,
          // 📸 NOUVEAU: Capacités de la caméra pour calcul de focale précis
          cameraCapabilities
        }
      };
      
      setPhotos(prev => [...prev, newPhoto]);
      message.success(`📸 Photo ${photos.length + 1}/${minPhotos} (netteté: ${finalSharpness.toFixed(0)})`);
      
      console.log(`📸 [SmartCamera] Photo capturée (${photos.length + 1}/${minPhotos})`);
    } catch (err) {
      console.error('📸 [SmartCamera] Erreur capture:', err);
      message.error('Erreur lors de la capture');
    } finally {
      setIsCapturing(false);
      setFocusStatus('waiting'); // Reset pour la prochaine capture
    }
  }, [orientation, analyze, photos.length, minPhotos, isCapturing]);
  
  // Nettoyer le stream au démontage
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

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

  // 📸 Gérer la capture photo - SÉCURISÉ avec caméra native Android
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // 🔒 SÉCURITÉ: Wrapper global try/catch pour éviter tout crash
    try {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) {
        console.log('📸 [SmartCamera] Aucun fichier (utilisateur a annulé)');
        return;
      }

    const maxPhotosEffective = maxPhotos ?? Number.POSITIVE_INFINITY;
    const remainingSlots = Math.max(0, maxPhotosEffective - photos.length);
    if (remainingSlots <= 0) {
      message.warning('Nombre maximum de photos atteint');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);
    
    // 🔒 Validation des fichiers
    for (const file of filesToProcess) {
      if (!file.type.startsWith('image/')) {
        message.error('Fichier non supporté. Utilisez une image.');
        if (inputRef.current) inputRef.current.value = '';
        return;
      }
      // Limite de taille: 50MB max
      if (file.size > 50 * 1024 * 1024) {
        message.error('Image trop volumineuse (max 50MB)');
        if (inputRef.current) inputRef.current.value = '';
        return;
      }
    }

    setIsProcessing(true);
    console.log(`📸 [SmartCamera] Traitement de ${filesToProcess.length} fichier(s) via caméra native...`);
    
    // 📱 Capturer l'orientation actuelle du téléphone (gyroscope)
    let currentOrientation = {
      alpha: 0,
      beta: 90,  // Par défaut: téléphone vertical
      gamma: 0,
      quality: 50
    };
    
    try {
      currentOrientation = {
        alpha: orientation.alpha,
        beta: orientation.beta,
        gamma: orientation.gamma,
        quality: analyze().quality
      };
      console.log(`📱 [SmartCamera] Gyroscope: beta=${currentOrientation.beta.toFixed(1)}°`);
    } catch (gyroErr) {
      console.warn('📱 [SmartCamera] Gyroscope non dispo, valeurs par défaut');
    }
    
    // 🔒 Conversion en base64 avec timeout de sécurité
    let base64s: string[] = [];
    try {
      const conversionPromises = filesToProcess.map(file => {
        return Promise.race([
          fileToBase64(file),
          new Promise<string>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 30000)
          )
        ]);
      });
      base64s = await Promise.all(conversionPromises);
      console.log(`📸 [SmartCamera] ${base64s.length} image(s) converties`);
    } catch (convErr) {
      console.error('📸 [SmartCamera] Erreur conversion:', convErr);
      message.error('Erreur traitement image. Réessayez.');
      setIsProcessing(false);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    const expectedNewCount = photos.length + base64s.length;

    // 🔒 Mise à jour state sécurisée
    setPhotos((prev) => {
      try {
        const startIndex = prev.length;
        const newPhotos: CapturedPhoto[] = base64s.map((base64, i) => ({
          imageBase64: base64,
          metadata: {
            timestamp: Date.now(),
            photoIndex: startIndex + i,
            totalPhotosNeeded: minPhotos,
            gyroscope: currentOrientation,
            accelerometer: { x: 0, y: 0, z: 0 },
            camera: { facingMode: 'environment', zoom: 1 },
            lighting: { brightness: 128, contrast: 50, uniformity: 80 },
            quality: { sharpness: 85, blur: 10, overallScore: 85 },
            // 📸 Capacités (limitées pour input file natif car pas d'accès au stream)
            cameraCapabilities: cameraCapabilities || undefined
          }
        }));
        console.log(`📸 Total photos: ${prev.length + newPhotos.length}`);
        return [...prev, ...newPhotos];
      } catch (e) {
        console.error('📸 Erreur state:', e);
        return prev;
      }
    });

    // � Message simple après chaque photo
    if (expectedNewCount < minPhotos) {
      message.info(`📸 Photo ${expectedNewCount}/${minPhotos} - Encore ${minPhotos - expectedNewCount} photo(s)`);
    } else {
      message.success(`📸 ${expectedNewCount} photo(s) capturée(s) ! Vous pouvez valider.`);
    }

  } catch (globalErr) {
    console.error('📸 ERREUR GLOBALE:', globalErr);
    message.error('Erreur inattendue. Réessayez.');
  } finally {
    setIsProcessing(false);
    // 🔄 Ne reset l'input que si on ne va pas réouvrir (sinon le setTimeout s'en charge)
    // try { if (inputRef.current) inputRef.current.value = ''; } catch (e) {}
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

  // 📸 Ouvrir la caméra NATIVE Android (meilleure qualité!)
  // 🔒 SÉCURISÉ: Utilise l'input file avec capture="environment"
  const openCamera = useCallback(() => {
    try {
      // Sur iOS, demander la permission gyroscope au premier clic
      if (isAvailable && !hasPermission) {
        requestPermission();
      }
      
      console.log('📸 [SmartCamera] Ouverture caméra native Android...');
      
      // Utiliser l'input file avec capture="environment" (caméra native)
      if (inputRef.current) {
        inputRef.current.click();
      } else {
        message.error('Erreur: input caméra non disponible');
      }
    } catch (err) {
      console.error('📸 [SmartCamera] Erreur ouverture caméra:', err);
      message.error('Erreur lors de l\'ouverture de la caméra');
    }
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

            {/* � Bouton Métré à côté du titre */}
            <Tooltip title="Télécharger feuille de calibration Métré A4">
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
                aria-label="Métré"
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

      {/* 🖨️ Modale Métré (téléchargement A4 V1.2) */}
      <Modal
        open={showArucoSettings}
        onCancel={() => setShowArucoSettings(false)}
        footer={null}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img 
              src="/printable/metre-logo.svg" 
              alt="Métré" 
              style={{ height: 28, objectFit: 'contain' }}
              onError={(e) => {
                // Fallback: juste afficher le texte sans logo
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <span>📐 Métré - Calibration A4</span>
          </div>
        }
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          {/* Description */}
          <div style={{ 
            background: '#f0f2f5', 
            padding: 12, 
            borderRadius: 8,
            fontSize: 13,
            lineHeight: '1.5'
          }}>
            <strong>Feuille de calibration A4 V1.3</strong>
            <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
              <li>Imprimer à <strong>100%</strong> (ne pas ajuster à la page)</li>
              <li>Photographier à 20-50% du cadre</li>
              <li>Contient: 5 AprilTags, règles, points de référence</li>
            </ul>
          </div>

          {/* Boutons de téléchargement */}
          <Space direction="vertical" style={{ width: '100%' }} size={8}>
            {/* Version LIGHT - Fond blanc */}
            <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #f0f0f0' }}>
              <div style={{ background: '#fafafa', padding: '8px 12px', fontSize: 12, fontWeight: 500 }}>📄 Version LIGHT (Papier Blanc)</div>
              <Space style={{ width: '100%', padding: 8 }} size={6}>
                <Button
                  style={{ flex: 1 }}
                  type="primary"
                  size="small"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = '/printable/metre-a4-v1.2-light.pdf';
                    link.download = 'metre-a4-v1.2-light.pdf';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    message.success('📥 PDF LIGHT téléchargé !');
                  }}
                >
                  PDF
                </Button>
                <Button
                  style={{ flex: 1 }}
                  size="small"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = '/printable/metre-a4-v1.2-light.png';
                    link.download = 'metre-a4-v1.2-light.png';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    message.success('📥 PNG LIGHT téléchargé !');
                  }}
                >
                  PNG
                </Button>
              </Space>
            </div>

            {/* Version DARK - Fond noir */}
            <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #f0f0f0' }}>
              <div style={{ background: '#fafafa', padding: '8px 12px', fontSize: 12, fontWeight: 500 }}>⚫ Version DARK (Projection Mur Blanc)</div>
              <Space style={{ width: '100%', padding: 8 }} size={6}>
                <Button
                  style={{ flex: 1 }}
                  size="small"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = '/printable/metre-a4-v1.2-dark.pdf';
                    link.download = 'metre-a4-v1.2-dark.pdf';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    message.success('📥 PDF DARK téléchargé !');
                  }}
                >
                  PDF
                </Button>
                <Button
                  style={{ flex: 1 }}
                  size="small"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = '/printable/metre-a4-v1.2-dark.png';
                    link.download = 'metre-a4-v1.2-dark.png';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    message.success('📥 PNG DARK téléchargé !');
                  }}
                >
                  PNG
                </Button>
              </Space>
            </div>
          </Space>

          {/* Avertissement */}
          <div style={{ 
            background: '#fff7e6', 
            border: '1px solid #ffd591',
            padding: 10, 
            borderRadius: 6,
            fontSize: 12,
            color: '#ad6800'
          }}>
            ⚠️ <strong>Attention :</strong> Imprimez à 100% (échelle réelle). Ne cochez PAS "Ajuster à la page" dans les paramètres d'impression.
          </div>
        </Space>
      </Modal>
      {/* 📹 OVERLAY CAMÉRA IN-BROWSER - S'affiche quand on prend une photo */}
      {cameraActive && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#000',
          zIndex: 100000,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header camera */}
          <div style={{
            padding: 16,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
            color: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1
          }}>
            <Title level={4} style={{ color: '#fff', margin: 0 }}>
              📹 Caméra
            </Title>
            {/* Afficher la résolution réelle */}
            {videoRef.current && (
              <Text style={{ color: '#fff', fontSize: 12 }}>
                {videoRef.current.videoWidth}×{videoRef.current.videoHeight}
              </Text>
            )}
            <Button 
              type="text" 
              icon={<StopOutlined />}
              onClick={stopCamera}
              style={{ color: '#fff' }}
            >
              Fermer
            </Button>
          </div>

          {/* Video stream */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />

          {/* Canvas caché pour la capture */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Bouton capture */}
          <div style={{
            position: 'absolute',
            bottom: 30,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 20
          }}>
            {/* Indicateur photos prises */}
            <div style={{
              background: 'rgba(0,0,0,0.7)',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: 20,
              fontSize: 14
            }}>
              {photos.length} / {minPhotos} min
            </div>

            {/* Gros bouton capture avec indicateur de compte à rebours et focus */}
            <div style={{ position: 'relative' }}>
              <Button
                type="primary"
                shape="circle"
                size="large"
                icon={countdown ? null : <CameraOutlined style={{ fontSize: 32 }} />}
                onClick={captureFromStream}
                disabled={isCapturing}
                style={{
                  width: 80,
                  height: 80,
                  background: focusStatus === 'ready' ? '#52c41a' : (isCapturing ? '#faad14' : '#fff'),
                  border: `4px solid ${focusStatus === 'ready' ? '#52c41a' : (isCapturing ? '#faad14' : '#1890ff')}`,
                  color: isCapturing ? '#fff' : '#1890ff',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                  fontSize: countdown ? 32 : undefined,
                  fontWeight: countdown ? 'bold' : undefined,
                  transition: 'all 0.2s ease',
                  animation: focusStatus === 'focusing' ? 'pulse 1s infinite' : undefined
                }}
              >
                {countdown && countdown}
              </Button>
              {isCapturing && (
                <div style={{
                  position: 'absolute',
                  bottom: -30,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  color: '#fff',
                  fontSize: 12,
                  whiteSpace: 'nowrap',
                  textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                  background: 'rgba(0,0,0,0.6)',
                  padding: '4px 12px',
                  borderRadius: 12
                }}>
                  {focusStatus === 'focusing' ? '🔍 Mise au point...' : 
                   focusStatus === 'ready' ? '✅ Net!' : 
                   '⏳ Stabilisation...'}
                </div>
              )}
            </div>

            {/* Bouton valider si assez de photos */}
            {photos.length >= minPhotos && (
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => {
                  stopCamera();
                  // 🔥 FIX: Valider les photos après avoir arrêté la caméra !
                  handleValidate();
                }}
                style={{
                  background: '#52c41a',
                  height: 48,
                  borderRadius: 24
                }}
              >
                ✅ Valider {photos.length} photos
              </Button>
            )}
          </div>

          {/* Message erreur si problème caméra */}
          {cameraError && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(255,0,0,0.9)',
              color: '#fff',
              padding: 20,
              borderRadius: 12,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 18, marginBottom: 10 }}>❌ Erreur caméra</div>
              <div>{cameraError}</div>
            </div>
          )}
        </div>
      )}
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
