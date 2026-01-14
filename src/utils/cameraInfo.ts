/**
 * 📷 Utilitaires pour extraire les informations de caméra/téléphone
 * et calculer la focale en pixels pour des mesures précises
 */

// ============================================================================
// TYPES
// ============================================================================

export interface CameraInfo {
  /** Marque du téléphone (Samsung, Apple, Google, etc.) */
  make?: string;
  /** Modèle exact (SM-S918B, iPhone 15 Pro, etc.) */
  model?: string;
  /** Focale physique en mm */
  focalLengthMm?: number;
  /** Focale équivalent 35mm (plus utile pour les calculs) */
  focalLength35mm?: number;
  /** Focale calculée en pixels */
  focalLengthPx?: number;
  /** Largeur du capteur en mm */
  sensorWidthMm?: number;
  /** FOV horizontal en degrés */
  fovHorizontal?: number;
  /** Source de l'info (exif, capabilities, lookup, default) */
  source: 'exif' | 'capabilities' | 'lookup' | 'default';
  /** Confiance dans la valeur (0-1) */
  confidence: number;
}

export interface ExifData {
  Make?: string;
  Model?: string;
  FocalLength?: number;
  FocalLengthIn35mmFilm?: number;
  ExifImageWidth?: number;
  ExifImageHeight?: number;
  PixelXDimension?: number;
  PixelYDimension?: number;
  [key: string]: unknown;
}

// ============================================================================
// TABLE DE CORRESPONDANCE DES TÉLÉPHONES COURANTS
// ============================================================================

interface PhoneCameraSpec {
  focalLength35mm: number;  // Équivalent 35mm pour la caméra principale
  sensorWidthMm: number;    // Largeur du capteur en mm
  fovHorizontal: number;    // FOV horizontal en degrés
}

/**
 * Base de données des spécifications caméra des téléphones courants
 * Sources: DxOMark, GSMArena, spécifications officielles
 */
const PHONE_CAMERA_SPECS: Record<string, PhoneCameraSpec> = {
  // === SAMSUNG ===
  'samsung_sm-s918': { focalLength35mm: 24, sensorWidthMm: 8.16, fovHorizontal: 84 },  // S23 Ultra
  'samsung_sm-s928': { focalLength35mm: 24, sensorWidthMm: 8.16, fovHorizontal: 84 },  // S24 Ultra
  'samsung_sm-s911': { focalLength35mm: 24, sensorWidthMm: 6.4, fovHorizontal: 84 },   // S23
  'samsung_sm-s921': { focalLength35mm: 24, sensorWidthMm: 6.4, fovHorizontal: 84 },   // S24
  'samsung_sm-a556': { focalLength35mm: 26, sensorWidthMm: 6.17, fovHorizontal: 79 },  // A55
  'samsung_sm-a546': { focalLength35mm: 26, sensorWidthMm: 6.17, fovHorizontal: 79 },  // A54
  'samsung_sm-g998': { focalLength35mm: 24, sensorWidthMm: 8.16, fovHorizontal: 84 },  // S21 Ultra
  'samsung_sm-g991': { focalLength35mm: 26, sensorWidthMm: 6.4, fovHorizontal: 79 },   // S21
  
  // === APPLE ===
  'apple_iphone 15 pro max': { focalLength35mm: 24, sensorWidthMm: 9.8, fovHorizontal: 84 },
  'apple_iphone 15 pro': { focalLength35mm: 24, sensorWidthMm: 9.8, fovHorizontal: 84 },
  'apple_iphone 15': { focalLength35mm: 26, sensorWidthMm: 7.0, fovHorizontal: 79 },
  'apple_iphone 14 pro max': { focalLength35mm: 24, sensorWidthMm: 9.8, fovHorizontal: 84 },
  'apple_iphone 14 pro': { focalLength35mm: 24, sensorWidthMm: 9.8, fovHorizontal: 84 },
  'apple_iphone 14': { focalLength35mm: 26, sensorWidthMm: 7.0, fovHorizontal: 79 },
  'apple_iphone 13 pro max': { focalLength35mm: 26, sensorWidthMm: 7.0, fovHorizontal: 79 },
  'apple_iphone 13 pro': { focalLength35mm: 26, sensorWidthMm: 7.0, fovHorizontal: 79 },
  'apple_iphone 13': { focalLength35mm: 26, sensorWidthMm: 6.17, fovHorizontal: 79 },
  'apple_iphone 12 pro max': { focalLength35mm: 26, sensorWidthMm: 7.0, fovHorizontal: 79 },
  'apple_iphone 12 pro': { focalLength35mm: 26, sensorWidthMm: 6.17, fovHorizontal: 79 },
  'apple_iphone 12': { focalLength35mm: 26, sensorWidthMm: 6.17, fovHorizontal: 79 },
  'apple_iphone 11 pro': { focalLength35mm: 26, sensorWidthMm: 6.17, fovHorizontal: 79 },
  'apple_iphone 11': { focalLength35mm: 26, sensorWidthMm: 6.17, fovHorizontal: 79 },
  
  // === GOOGLE PIXEL ===
  'google_pixel 8 pro': { focalLength35mm: 25, sensorWidthMm: 8.0, fovHorizontal: 82 },
  'google_pixel 8': { focalLength35mm: 25, sensorWidthMm: 6.4, fovHorizontal: 82 },
  'google_pixel 7 pro': { focalLength35mm: 25, sensorWidthMm: 8.0, fovHorizontal: 82 },
  'google_pixel 7': { focalLength35mm: 25, sensorWidthMm: 6.4, fovHorizontal: 82 },
  'google_pixel 6 pro': { focalLength35mm: 25, sensorWidthMm: 8.0, fovHorizontal: 82 },
  'google_pixel 6': { focalLength35mm: 25, sensorWidthMm: 6.4, fovHorizontal: 82 },
  
  // === HUAWEI ===
  'huawei_p60 pro': { focalLength35mm: 24, sensorWidthMm: 9.0, fovHorizontal: 84 },
  'huawei_p50 pro': { focalLength35mm: 23, sensorWidthMm: 9.0, fovHorizontal: 86 },
  'huawei_p40 pro': { focalLength35mm: 23, sensorWidthMm: 8.0, fovHorizontal: 86 },
  'huawei_mate 50 pro': { focalLength35mm: 24, sensorWidthMm: 9.0, fovHorizontal: 84 },
  
  // === XIAOMI ===
  'xiaomi_13 pro': { focalLength35mm: 23, sensorWidthMm: 11.0, fovHorizontal: 86 },
  'xiaomi_13': { focalLength35mm: 24, sensorWidthMm: 8.0, fovHorizontal: 84 },
  'xiaomi_12 pro': { focalLength35mm: 24, sensorWidthMm: 8.0, fovHorizontal: 84 },
  'xiaomi_redmi note 12': { focalLength35mm: 26, sensorWidthMm: 6.17, fovHorizontal: 79 },
  
  // === ONEPLUS ===
  'oneplus_11': { focalLength35mm: 24, sensorWidthMm: 8.0, fovHorizontal: 84 },
  'oneplus_10 pro': { focalLength35mm: 24, sensorWidthMm: 8.0, fovHorizontal: 84 },
  'oneplus_9 pro': { focalLength35mm: 24, sensorWidthMm: 8.0, fovHorizontal: 84 },
  
  // === OPPO ===
  'oppo_find x6 pro': { focalLength35mm: 23, sensorWidthMm: 11.0, fovHorizontal: 86 },
  'oppo_find x5 pro': { focalLength35mm: 24, sensorWidthMm: 8.0, fovHorizontal: 84 },
};

// Valeurs par défaut si téléphone non reconnu
const DEFAULT_CAMERA_SPEC: PhoneCameraSpec = {
  focalLength35mm: 26,    // Moyenne des smartphones
  sensorWidthMm: 6.17,    // Capteur 1/1.7" typique
  fovHorizontal: 79       // FOV standard
};

// ============================================================================
// FONCTIONS PRINCIPALES
// ============================================================================

/**
 * Extraire les infos de caméra depuis les données EXIF
 */
export function extractCameraInfoFromExif(exif: ExifData | null | undefined, imageWidth: number): CameraInfo {
  if (!exif) {
    return getDefaultCameraInfo(imageWidth);
  }
  
  const make = exif.Make?.toLowerCase().trim();
  const model = exif.Model?.toLowerCase().trim();
  
  // 1. Essayer d'utiliser la focale 35mm directement si disponible
  if (exif.FocalLengthIn35mmFilm && exif.FocalLengthIn35mmFilm > 0) {
    const focalLengthPx = calculateFocalLengthPx(exif.FocalLengthIn35mmFilm, imageWidth);
    return {
      make: exif.Make,
      model: exif.Model,
      focalLengthMm: exif.FocalLength,
      focalLength35mm: exif.FocalLengthIn35mmFilm,
      focalLengthPx,
      source: 'exif',
      confidence: 0.95  // Très fiable car directement dans les EXIF
    };
  }
  
  // 2. Essayer de trouver dans la table de correspondance
  const lookupKey = findPhoneLookupKey(make, model);
  if (lookupKey && PHONE_CAMERA_SPECS[lookupKey]) {
    const spec = PHONE_CAMERA_SPECS[lookupKey];
    const focalLengthPx = calculateFocalLengthPx(spec.focalLength35mm, imageWidth);
    return {
      make: exif.Make,
      model: exif.Model,
      focalLengthMm: exif.FocalLength,
      focalLength35mm: spec.focalLength35mm,
      focalLengthPx,
      sensorWidthMm: spec.sensorWidthMm,
      fovHorizontal: spec.fovHorizontal,
      source: 'lookup',
      confidence: 0.85  // Bonne confiance car basé sur les specs constructeur
    };
  }
  
  // 3. Si on a la focale physique, estimer avec un capteur standard
  if (exif.FocalLength && exif.FocalLength > 0) {
    // Estimation : capteur 1/1.7" (6.17mm de large) typique des smartphones
    const estimated35mm = (exif.FocalLength * 36) / DEFAULT_CAMERA_SPEC.sensorWidthMm;
    const focalLengthPx = calculateFocalLengthPx(estimated35mm, imageWidth);
    return {
      make: exif.Make,
      model: exif.Model,
      focalLengthMm: exif.FocalLength,
      focalLength35mm: Math.round(estimated35mm),
      focalLengthPx,
      source: 'exif',
      confidence: 0.6  // Confiance moyenne car on estime la taille du capteur
    };
  }
  
  // 4. Fallback sur les valeurs par défaut avec le modèle si connu
  return getDefaultCameraInfo(imageWidth, exif.Make, exif.Model);
}

/**
 * Calculer la focale en pixels à partir de la focale équivalent 35mm
 * 
 * Formule: focalePx = (focal35mm / 36) × largeurImagePx
 * 
 * Explication:
 * - Un capteur 35mm fait 36mm de large
 * - La focale équiv. 35mm nous dit le FOV comme si on était sur un capteur 36mm
 * - On convertit en ratio puis on multiplie par la largeur de l'image
 */
export function calculateFocalLengthPx(focalLength35mm: number, imageWidth: number): number {
  // Formule standard de conversion
  const focalPx = (focalLength35mm / 36) * imageWidth;
  return Math.round(focalPx);
}

/**
 * Obtenir les infos caméra par défaut
 */
export function getDefaultCameraInfo(imageWidth: number, make?: string, model?: string): CameraInfo {
  // Essayer une dernière fois la table de correspondance avec juste make/model
  if (make || model) {
    const lookupKey = findPhoneLookupKey(make?.toLowerCase(), model?.toLowerCase());
    if (lookupKey && PHONE_CAMERA_SPECS[lookupKey]) {
      const spec = PHONE_CAMERA_SPECS[lookupKey];
      return {
        make,
        model,
        focalLength35mm: spec.focalLength35mm,
        focalLengthPx: calculateFocalLengthPx(spec.focalLength35mm, imageWidth),
        sensorWidthMm: spec.sensorWidthMm,
        fovHorizontal: spec.fovHorizontal,
        source: 'lookup',
        confidence: 0.85
      };
    }
  }
  
  // Valeurs par défaut conservatrices
  return {
    make,
    model,
    focalLength35mm: DEFAULT_CAMERA_SPEC.focalLength35mm,
    focalLengthPx: calculateFocalLengthPx(DEFAULT_CAMERA_SPEC.focalLength35mm, imageWidth),
    sensorWidthMm: DEFAULT_CAMERA_SPEC.sensorWidthMm,
    fovHorizontal: DEFAULT_CAMERA_SPEC.fovHorizontal,
    source: 'default',
    confidence: 0.5  // Confiance basse car on utilise des valeurs génériques
  };
}

/**
 * Trouver la clé de lookup dans la table des téléphones
 */
function findPhoneLookupKey(make?: string, model?: string): string | null {
  if (!make && !model) return null;
  
  const normalizedMake = make?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
  const normalizedModel = model?.toLowerCase().replace(/[^a-z0-9 ]/g, '') || '';
  
  // Essayer correspondance exacte make_model
  const exactKey = `${normalizedMake}_${normalizedModel}`;
  if (PHONE_CAMERA_SPECS[exactKey]) return exactKey;
  
  // Essayer correspondance partielle sur le modèle
  for (const key of Object.keys(PHONE_CAMERA_SPECS)) {
    const [keyMake, keyModel] = key.split('_');
    
    // Vérifier si le make correspond
    if (normalizedMake && normalizedMake.includes(keyMake)) {
      // Vérifier si le modèle correspond partiellement
      if (normalizedModel && (normalizedModel.includes(keyModel) || keyModel.includes(normalizedModel))) {
        return key;
      }
      // Pour Samsung, extraire le code modèle (SM-XXXX)
      if (normalizedMake === 'samsung' && normalizedModel) {
        const samsungMatch = normalizedModel.match(/sm[- ]?([a-z]\d{3})/i);
        if (samsungMatch && keyModel.includes(samsungMatch[1].toLowerCase())) {
          return key;
        }
      }
    }
  }
  
  return null;
}

/**
 * Extraire les infos depuis le User-Agent (fallback)
 */
export function extractPhoneFromUserAgent(userAgent: string): { make?: string; model?: string } {
  const ua = userAgent.toLowerCase();
  
  // Samsung
  const samsungMatch = ua.match(/sm-([a-z]\d{3}[a-z]?)/i);
  if (samsungMatch) {
    return { make: 'Samsung', model: `SM-${samsungMatch[1].toUpperCase()}` };
  }
  
  // iPhone
  const iphoneMatch = ua.match(/iphone[\s;]*([\d,]+)?/i);
  if (iphoneMatch) {
    return { make: 'Apple', model: 'iPhone' };
  }
  
  // Pixel
  const pixelMatch = ua.match(/pixel\s*(\d+\s*(?:pro)?(?:\s*xl)?)/i);
  if (pixelMatch) {
    return { make: 'Google', model: `Pixel ${pixelMatch[1]}` };
  }
  
  // Huawei
  const huaweiMatch = ua.match(/(p\d{2}\s*(?:pro)?|mate\s*\d{2}\s*(?:pro)?)/i);
  if (huaweiMatch) {
    return { make: 'Huawei', model: huaweiMatch[1] };
  }
  
  return {};
}

// ============================================================================
// FONCTION CÔTÉ NAVIGATEUR - Extraire toutes les infos disponibles
// ============================================================================

/**
 * Extraire les capacités de la caméra depuis l'API MediaDevices
 * À appeler côté client (navigateur) après avoir obtenu le stream vidéo
 */
export async function getCameraCapabilities(videoTrack: MediaStreamTrack): Promise<Partial<CameraInfo>> {
  try {
    // Récupérer les settings actuels
    const settings = videoTrack.getSettings();
    
    // Essayer de récupérer les capacités (pas supporté partout)
    let capabilities: MediaTrackCapabilities | null = null;
    if ('getCapabilities' in videoTrack) {
      capabilities = (videoTrack as any).getCapabilities();
    }
    
    return {
      // Settings actuels
      ...(settings.width && { fovHorizontal: estimateFovFromResolution(settings.width, settings.height || settings.width) }),
    };
  } catch (err) {
    console.warn('📷 [CameraInfo] Impossible de récupérer les capacités:', err);
    return {};
  }
}

/**
 * Estimer le FOV approximatif depuis le ratio de la résolution
 */
function estimateFovFromResolution(width: number, height: number): number {
  const ratio = width / height;
  // Les smartphones ont généralement un FOV de 75-85° selon le ratio
  if (ratio > 1.5) return 82; // 16:9 ou plus large
  if (ratio > 1.2) return 79; // 4:3
  return 75; // Carré ou portrait
}

// ============================================================================
// EXPORT POUR UTILISATION BACKEND
// ============================================================================

/**
 * Obtenir la focale en pixels pour le calcul de profondeur
 * C'est LA fonction à utiliser dans marker-detector.ts
 */
export function getFocalLengthPx(
  imageWidth: number, 
  exif?: ExifData | null, 
  userAgent?: string
): { focalPx: number; confidence: number; source: string } {
  
  // 1. Essayer avec les EXIF
  if (exif) {
    const info = extractCameraInfoFromExif(exif, imageWidth);
    if (info.focalLengthPx) {
      console.log(`📷 [CameraInfo] Focale depuis ${info.source}: ${info.focalLengthPx}px (${info.focalLength35mm}mm eq., conf=${(info.confidence * 100).toFixed(0)}%)`);
      return { 
        focalPx: info.focalLengthPx, 
        confidence: info.confidence, 
        source: `${info.source}:${info.make || 'unknown'}/${info.model || 'unknown'}` 
      };
    }
  }
  
  // 2. Essayer avec le User-Agent
  if (userAgent) {
    const phone = extractPhoneFromUserAgent(userAgent);
    if (phone.make || phone.model) {
      const info = getDefaultCameraInfo(imageWidth, phone.make, phone.model);
      if (info.focalLengthPx && info.source === 'lookup') {
        console.log(`📷 [CameraInfo] Focale depuis User-Agent: ${info.focalLengthPx}px (${phone.make} ${phone.model})`);
        return { 
          focalPx: info.focalLengthPx, 
          confidence: info.confidence * 0.8, // Réduire car moins fiable
          source: `userAgent:${phone.make}/${phone.model}` 
        };
      }
    }
  }
  
  // 3. Valeur par défaut
  const defaultInfo = getDefaultCameraInfo(imageWidth);
  console.log(`📷 [CameraInfo] Focale par défaut: ${defaultInfo.focalLengthPx}px (26mm eq.)`);
  return { 
    focalPx: defaultInfo.focalLengthPx!, 
    confidence: 0.5, 
    source: 'default' 
  };
}
