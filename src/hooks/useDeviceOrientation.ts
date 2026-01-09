/**
 * 📱 useDeviceOrientation - Hook pour accéder aux données du gyroscope
 * 
 * Fournit les angles d'inclinaison du téléphone pour:
 * 1. Afficher un feedback visuel discret (pas bloquant!)
 * 2. Aider mathématiquement la correction de l'homographie
 * 
 * @module hooks/useDeviceOrientation
 * @author 2Thier CRM Team
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Données d'orientation du device
 */
export interface DeviceOrientationData {
  /** Inclinaison avant/arrière (-180° à 180°). 0° = à plat, 90° = vertical face à soi */
  beta: number;
  /** Inclinaison gauche/droite (-90° à 90°). 0° = droit, négatif = penché à gauche */
  gamma: number;
  /** Orientation boussole (0° à 360°) - moins utile pour nous */
  alpha: number;
  /** Timestamp de la dernière lecture */
  timestamp: number;
  /** Le capteur est-il disponible ? */
  isAvailable: boolean;
  /** Permission accordée ? (iOS 13+ nécessite permission explicite) */
  hasPermission: boolean;
}

/**
 * Analyse de l'orientation pour aider l'utilisateur
 */
export interface OrientationAnalysis {
  /** Qualité globale de l'orientation (0-100) */
  quality: number;
  /** Code couleur: 'green' | 'orange' | 'red' */
  colorCode: 'green' | 'orange' | 'red';
  /** Est-ce que le téléphone est assez droit pour une bonne mesure ? */
  isGood: boolean;
  /** Instructions pour l'utilisateur (courtes et claires) */
  hint: string | null;
  /** Direction de la correction à faire */
  direction: {
    vertical: 'up' | 'down' | 'ok';
    horizontal: 'left' | 'right' | 'ok';
  };
  /** Angles d'erreur par rapport à l'idéal (90° beta, 0° gamma) */
  tiltError: {
    vertical: number;  // Degrés d'écart vertical
    horizontal: number; // Degrés d'écart horizontal
    total: number;      // Erreur combinée
  };
}

/**
 * Facteur de compensation basé sur l'orientation du téléphone
 * Utilisé pour corriger mathématiquement les mesures
 */
export interface OrientationCompensation {
  /** Facteur de correction pour les mesures horizontales */
  horizontalFactor: number;
  /** Facteur de correction pour les mesures verticales */
  verticalFactor: number;
  /** Facteur global combiné */
  globalFactor: number;
  /** Confiance dans la compensation (0-1) */
  confidence: number;
  /** Les angles utilisés pour le calcul */
  angles: { beta: number; gamma: number };
}

// Seuils de qualité (en degrés d'écart par rapport à l'idéal)
const THRESHOLDS = {
  PERFECT: 5,    // ±5° = parfait (vert)
  GOOD: 15,      // ±15° = acceptable (vert)
  WARNING: 30,   // ±30° = attention (orange)
  BAD: 45        // >45° = mauvais (rouge)
};

// Angle idéal pour le beta (téléphone quasi vertical, face à la surface)
const IDEAL_BETA = 80; // Un peu moins que 90° car l'utilisateur tient souvent légèrement incliné

/**
 * Analyse l'orientation et retourne des conseils
 */
function analyzeOrientation(beta: number, gamma: number): OrientationAnalysis {
  // Calculer l'écart par rapport à l'idéal
  // Beta idéal = ~80° (téléphone quasi vertical)
  // Gamma idéal = 0° (téléphone droit, pas penché)
  
  const verticalError = Math.abs(beta - IDEAL_BETA);
  const horizontalError = Math.abs(gamma);
  const totalError = Math.sqrt(verticalError ** 2 + horizontalError ** 2);
  
  // Déterminer la direction de correction
  let verticalDir: 'up' | 'down' | 'ok' = 'ok';
  let horizontalDir: 'left' | 'right' | 'ok' = 'ok';
  
  if (verticalError > THRESHOLDS.GOOD) {
    verticalDir = beta < IDEAL_BETA ? 'up' : 'down';
  }
  if (horizontalError > THRESHOLDS.GOOD) {
    horizontalDir = gamma < 0 ? 'right' : 'left';
  }
  
  // Calculer la qualité (100 = parfait, 0 = très mauvais)
  const quality = Math.max(0, Math.min(100, 100 - (totalError * 2)));
  
  // Déterminer le code couleur
  let colorCode: 'green' | 'orange' | 'red' = 'green';
  if (totalError > THRESHOLDS.BAD) {
    colorCode = 'red';
  } else if (totalError > THRESHOLDS.WARNING) {
    colorCode = 'orange';
  }
  
  // Générer un hint court (seulement si vraiment nécessaire)
  let hint: string | null = null;
  if (colorCode === 'red') {
    if (verticalError > horizontalError) {
      hint = verticalDir === 'up' ? '⬆️ Relevez' : '⬇️ Inclinez';
    } else {
      hint = horizontalDir === 'left' ? '⬅️ Gauche' : '➡️ Droite';
    }
  }
  
  return {
    quality,
    colorCode,
    isGood: colorCode === 'green',
    hint,
    direction: {
      vertical: verticalDir,
      horizontal: horizontalDir
    },
    tiltError: {
      vertical: verticalError,
      horizontal: horizontalError,
      total: totalError
    }
  };
}

/**
 * Calcule le facteur de compensation basé sur l'inclinaison
 * 
 * Principe: Si le téléphone est incliné, la projection sur l'image
 * est déformée. On peut compenser mathématiquement cette déformation.
 */
function calculateCompensation(beta: number, gamma: number): OrientationCompensation {
  // Convertir gamma en radians pour les calculs trigonométriques
  const gammaRad = (gamma * Math.PI) / 180;
  
  // Angle d'inclinaison par rapport à la perpendiculaire
  // Si beta = 90°, le téléphone est perpendiculaire → pas de correction
  // Si beta = 45°, la projection est réduite par cos(45°) ≈ 0.71
  const verticalAngle = Math.abs(90 - beta);
  const verticalAngleRad = (verticalAngle * Math.PI) / 180;
  
  // Facteur de correction vertical
  // Plus on s'éloigne de 90°, plus les objets paraissent compressés verticalement
  // On corrige en divisant par cos(angle)
  const verticalFactor = verticalAngle < 45 
    ? 1 / Math.cos(verticalAngleRad)
    : 1.5; // Limite à x1.5 pour éviter les corrections extrêmes
  
  // Facteur de correction horizontal (basé sur gamma)
  const horizontalFactor = Math.abs(gamma) < 45
    ? 1 / Math.cos(gammaRad)
    : 1.5;
  
  // Facteur global (moyenne géométrique)
  const globalFactor = Math.sqrt(verticalFactor * horizontalFactor);
  
  // Confiance: Plus l'angle est petit, plus on est confiant
  const totalAngle = Math.sqrt(verticalAngle ** 2 + gamma ** 2);
  const confidence = Math.max(0, Math.min(1, 1 - totalAngle / 60));
  
  return {
    horizontalFactor: Math.min(horizontalFactor, 1.5),
    verticalFactor: Math.min(verticalFactor, 1.5),
    globalFactor: Math.min(globalFactor, 1.5),
    confidence,
    angles: { beta, gamma }
  };
}

/**
 * Hook principal pour accéder à l'orientation du device
 * 
 * @param enabled - Activer/désactiver le tracking (défaut: true)
 * @returns DeviceOrientationData + fonctions d'analyse
 */
export function useDeviceOrientation(enabled: boolean = true) {
  const [orientation, setOrientation] = useState<DeviceOrientationData>({
    beta: 90,   // Défaut: téléphone vertical
    gamma: 0,   // Défaut: téléphone droit
    alpha: 0,
    timestamp: Date.now(),
    isAvailable: false,
    hasPermission: false
  });
  
  const [permissionState, setPermissionState] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const listenerRef = useRef<((event: DeviceOrientationEvent) => void) | null>(null);

  /**
   * Demander la permission (nécessaire sur iOS 13+)
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    // Vérifier si l'API existe
    if (typeof window === 'undefined' || !window.DeviceOrientationEvent) {
      console.log('📱 [Gyro] DeviceOrientationEvent non disponible');
      return false;
    }

    // Sur iOS 13+, il faut demander la permission explicitement
    const DeviceOrientationEventTyped = DeviceOrientationEvent as any;
    if (typeof DeviceOrientationEventTyped.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEventTyped.requestPermission();
        const granted = permission === 'granted';
        setPermissionState(granted ? 'granted' : 'denied');
        setOrientation(prev => ({ ...prev, hasPermission: granted, isAvailable: true }));
        console.log(`📱 [Gyro] Permission iOS: ${permission}`);
        return granted;
      } catch (err) {
        console.warn('📱 [Gyro] Erreur permission iOS:', err);
        setPermissionState('denied');
        return false;
      }
    }
    
    // Sur Android et autres, pas besoin de permission explicite
    setPermissionState('granted');
    setOrientation(prev => ({ ...prev, hasPermission: true, isAvailable: true }));
    return true;
  }, []);

  /**
   * Handler d'événement orientation
   */
  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    if (event.beta !== null && event.gamma !== null) {
      setOrientation({
        beta: event.beta,
        gamma: event.gamma,
        alpha: event.alpha || 0,
        timestamp: Date.now(),
        isAvailable: true,
        hasPermission: true
      });
    }
  }, []);

  /**
   * Démarrer le tracking
   */
  const startTracking = useCallback(() => {
    if (listenerRef.current) return; // Déjà en cours
    
    listenerRef.current = handleOrientation;
    window.addEventListener('deviceorientation', handleOrientation);
    console.log('📱 [Gyro] Tracking démarré');
  }, [handleOrientation]);

  /**
   * Arrêter le tracking
   */
  const stopTracking = useCallback(() => {
    if (listenerRef.current) {
      window.removeEventListener('deviceorientation', listenerRef.current);
      listenerRef.current = null;
      console.log('📱 [Gyro] Tracking arrêté');
    }
  }, []);

  // Setup/cleanup
  useEffect(() => {
    if (!enabled) {
      stopTracking();
      return;
    }

    // Vérifier si l'API est disponible
    if (typeof window === 'undefined' || !window.DeviceOrientationEvent) {
      setOrientation(prev => ({ ...prev, isAvailable: false }));
      return;
    }

    // Essayer de démarrer sans permission d'abord (fonctionne sur Android)
    const testHandler = (e: DeviceOrientationEvent) => {
      if (e.beta !== null) {
        setOrientation(prev => ({ ...prev, isAvailable: true, hasPermission: true }));
        window.removeEventListener('deviceorientation', testHandler);
        startTracking();
      }
    };
    
    window.addEventListener('deviceorientation', testHandler);
    
    // Timeout: si pas de données après 1s, l'API n'est pas disponible ou nécessite permission
    const timeout = setTimeout(() => {
      window.removeEventListener('deviceorientation', testHandler);
      setOrientation(prev => ({ 
        ...prev, 
        isAvailable: typeof DeviceOrientationEvent !== 'undefined',
        hasPermission: false 
      }));
    }, 1000);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('deviceorientation', testHandler);
      stopTracking();
    };
  }, [enabled, startTracking, stopTracking]);

  /**
   * Analyser l'orientation actuelle
   */
  const analyze = useCallback((): OrientationAnalysis => {
    return analyzeOrientation(orientation.beta, orientation.gamma);
  }, [orientation.beta, orientation.gamma]);

  /**
   * Calculer la compensation pour les mesures
   */
  const getCompensation = useCallback((): OrientationCompensation => {
    return calculateCompensation(orientation.beta, orientation.gamma);
  }, [orientation.beta, orientation.gamma]);

  /**
   * Obtenir un snapshot de l'orientation actuelle (pour envoyer à l'API)
   */
  const getSnapshot = useCallback(() => {
    return {
      beta: orientation.beta,
      gamma: orientation.gamma,
      alpha: orientation.alpha,
      timestamp: orientation.timestamp,
      quality: analyzeOrientation(orientation.beta, orientation.gamma).quality,
      compensation: calculateCompensation(orientation.beta, orientation.gamma)
    };
  }, [orientation]);

  return {
    // Données brutes
    orientation,
    
    // État
    isAvailable: orientation.isAvailable,
    hasPermission: orientation.hasPermission,
    permissionState,
    
    // Actions
    requestPermission,
    startTracking,
    stopTracking,
    
    // Analyse
    analyze,
    getCompensation,
    getSnapshot
  };
}

// Export des fonctions utilitaires pour usage côté serveur
export { analyzeOrientation, calculateCompensation };

// Types exportés
export type { OrientationAnalysis, OrientationCompensation };
