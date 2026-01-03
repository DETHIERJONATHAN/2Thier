/**
 * 🔀 MULTI-PHOTO FUSION SERVICE - MULTI-PERSPECTIVE
 * ============================================================================
 * 
 * Service de fusion intelligente de plusieurs photos prises de DIFFÉRENTES
 * PERSPECTIVES pour créer une image optimisée pour la détection de référence.
 * 
 * CONCEPT CLÉ:
 * Les 3 photos sont prises de DIFFÉRENTS ANGLES. Chaque perspective
 * révèle mieux certains bords du papier (ceux face à la caméra).
 * 
 * TECHNIQUE UTILISÉE:
 * 1. Analyse de gradient (bords) pour CHAQUE perspective
 * 2. Fusion par UNION des bords: pour chaque pixel de bord, on prend
 *    l'image qui a le MEILLEUR contraste à cet endroit
 * 3. Zones uniformes: moyenne pour réduire le bruit
 * 4. Edge Enhancement - Renforce les contours finaux
 * 5. White Paper Boost - Amplifie les zones blanches (feuille A4)
 * 
 * RÉSULTAT:
 * Une image avec TOUS les bords bien définis, même ceux partiellement
 * cachés dans certaines perspectives.
 * 
 * IMPORTANT:
 * L'homographie est calculée APRÈS sur l'image affichée, pas sur l'image
 * fusionnée. Les coordonnées retournées sont en % et doivent correspondre
 * à l'image originale.
 * 
 * @author CRM 2Thier
 * @version 2.0.0 - Multi-Perspective Fusion
 */

import sharp from 'sharp';

// ============================================================================
// TYPES
// ============================================================================

interface PhotoInput {
  base64: string;
  mimeType: string;
  metadata?: {
    qualityScore?: number;
    sharpness?: number;
    brightness?: number;
  };
}

interface FusionResult {
  success: boolean;
  fusedImageBase64?: string;
  mimeType: string;
  
  // Métriques de fusion
  metrics?: {
    inputPhotos: number;
    usedPhotos: number;
    averageQuality: number;
    edgeEnhancement: number;
    whiteBoost: number;
    finalSharpness: number;
  };
  
  // Analyse par photo
  photoAnalysis?: Array<{
    index: number;
    quality: number;
    sharpness: number;
    brightness: number;
    weight: number; // Poids dans la fusion
    issues: string[];
  }>;
  
  error?: string;
}

interface ImageStats {
  sharpness: number;   // 0-100
  brightness: number;  // 0-255
  contrast: number;    // 0-100
  whiteRatio: number;  // % de pixels blancs
}

// ============================================================================
// SERVICE
// ============================================================================

class MultiPhotoFusionService {
  
  /**
   * 🎯 FUSION PRINCIPALE - Combine plusieurs photos en une image optimisée
   * 
   * @param photos - Tableau de photos à fusionner
   * @param options - Options de fusion
   * @returns Image fusionnée optimisée pour la détection
   */
  async fusePhotos(
    photos: PhotoInput[],
    options: {
      enhanceEdges?: boolean;      // Renforcer les contours (défaut: true)
      boostWhite?: boolean;        // Amplifier les zones blanches (défaut: true)
      localContrast?: boolean;     // Améliorer contraste local (défaut: true)
      targetWidth?: number;        // Largeur cible (défaut: 1920)
      outputQuality?: number;      // Qualité JPEG sortie (défaut: 95)
    } = {}
  ): Promise<FusionResult> {
    const {
      enhanceEdges = true,
      boostWhite = true,
      localContrast = true,
      targetWidth = 1920,
      outputQuality = 95
    } = options;

    try {
      console.log(`🔀 [Fusion] Début fusion de ${photos.length} photos...`);
      
      if (photos.length === 0) {
        return { success: false, mimeType: 'image/jpeg', error: 'Aucune photo fournie' };
      }

      // Si une seule photo, on l'optimise directement
      if (photos.length === 1) {
        console.log('📷 [Fusion] Une seule photo - optimisation directe');
        return this.optimizeSinglePhoto(photos[0], { enhanceEdges, boostWhite, localContrast, targetWidth, outputQuality });
      }

      // 1️⃣ ANALYSE DE QUALITÉ de chaque photo
      console.log('📊 [Fusion] Analyse qualité des photos...');
      const photoAnalysis = await this.analyzePhotos(photos);
      
      // 2️⃣ FILTRER les photos inutilisables (trop floues, trop sombres)
      const usablePhotos = photoAnalysis.filter(p => p.quality >= 30);
      console.log(`✅ [Fusion] ${usablePhotos.length}/${photos.length} photos utilisables`);
      
      if (usablePhotos.length === 0) {
        // Utiliser la meilleure même si mauvaise qualité
        const best = photoAnalysis.sort((a, b) => b.quality - a.quality)[0];
        console.warn(`⚠️ [Fusion] Aucune photo de bonne qualité, utilisation de la #${best.index}`);
        return this.optimizeSinglePhoto(photos[best.index], { enhanceEdges, boostWhite, localContrast, targetWidth, outputQuality });
      }

      // 3️⃣ NORMALISER les dimensions (toutes à la même taille)
      console.log('📐 [Fusion] Normalisation des dimensions...');
      const normalizedBuffers = await this.normalizePhotos(
        usablePhotos.map(p => photos[p.index]),
        targetWidth
      );

      // 4️⃣ FUSION PONDÉRÉE par qualité
      console.log('🔀 [Fusion] Fusion pondérée par qualité...');
      let fusedBuffer = await this.weightedBlend(normalizedBuffers, usablePhotos.map(p => p.weight));

      // 5️⃣ AMÉLIORATION DES BORDS (Edge Enhancement)
      if (enhanceEdges) {
        console.log('🔲 [Fusion] Amélioration des contours...');
        fusedBuffer = await this.enhanceEdges(fusedBuffer);
      }

      // 6️⃣ BOOST ZONES BLANCHES (White Paper Detection Helper)
      if (boostWhite) {
        console.log('⬜ [Fusion] Amplification zones blanches (feuille A4)...');
        fusedBuffer = await this.boostWhiteAreas(fusedBuffer);
      }

      // 7️⃣ AMÉLIORATION CONTRASTE LOCAL (Local Contrast Enhancement)
      if (localContrast) {
        console.log('🎛️ [Fusion] Amélioration contraste local...');
        fusedBuffer = await this.enhanceLocalContrast(fusedBuffer);
      }

      // 8️⃣ FINALISATION - Conversion en base64
      const finalBuffer = await sharp(fusedBuffer)
        .jpeg({ quality: outputQuality })
        .toBuffer();

      const fusedImageBase64 = finalBuffer.toString('base64');

      // Calculer les métriques finales
      const finalStats = await this.analyzeImageStats(fusedBuffer);
      
      console.log(`✅ [Fusion] Terminée ! Sharpness finale: ${finalStats.sharpness.toFixed(1)}, WhiteRatio: ${(finalStats.whiteRatio * 100).toFixed(1)}%`);

      return {
        success: true,
        fusedImageBase64,
        mimeType: 'image/jpeg',
        metrics: {
          inputPhotos: photos.length,
          usedPhotos: usablePhotos.length,
          averageQuality: usablePhotos.reduce((s, p) => s + p.quality, 0) / usablePhotos.length,
          edgeEnhancement: enhanceEdges ? 1 : 0,
          whiteBoost: boostWhite ? 1 : 0,
          finalSharpness: finalStats.sharpness
        },
        photoAnalysis
      };

    } catch (error) {
      console.error('❌ [Fusion] Erreur:', error);
      return {
        success: false,
        mimeType: 'image/jpeg',
        error: (error as Error).message
      };
    }
  }

  /**
   * 📊 Analyse la qualité de chaque photo
   */
  private async analyzePhotos(photos: PhotoInput[]): Promise<Array<{
    index: number;
    quality: number;
    sharpness: number;
    brightness: number;
    weight: number;
    issues: string[];
  }>> {
    const results = await Promise.all(photos.map(async (photo, index) => {
      const buffer = Buffer.from(photo.base64, 'base64');
      const stats = await this.analyzeImageStats(buffer);
      
      const issues: string[] = [];
      
      // Détecter les problèmes
      if (stats.sharpness < 30) issues.push('Floue');
      if (stats.brightness < 50) issues.push('Trop sombre');
      if (stats.brightness > 220) issues.push('Surexposée');
      if (stats.contrast < 20) issues.push('Manque de contraste');
      
      // Score de qualité global (0-100)
      const quality = Math.min(100, Math.max(0,
        stats.sharpness * 0.4 +
        (100 - Math.abs(stats.brightness - 128) / 1.28) * 0.3 +
        stats.contrast * 0.3
      ));
      
      // Poids pour la fusion (photos de meilleure qualité ont plus de poids)
      const weight = Math.pow(quality / 100, 2); // Pondération quadratique
      
      console.log(`  📷 Photo ${index + 1}: Quality=${quality.toFixed(0)}, Sharpness=${stats.sharpness.toFixed(0)}, Brightness=${stats.brightness.toFixed(0)}, Issues=[${issues.join(', ')}]`);
      
      return {
        index,
        quality,
        sharpness: stats.sharpness,
        brightness: stats.brightness,
        weight,
        issues
      };
    }));
    
    // Normaliser les poids pour qu'ils somment à 1
    const totalWeight = results.reduce((s, r) => s + r.weight, 0);
    results.forEach(r => r.weight = r.weight / totalWeight);
    
    return results;
  }

  /**
   * 📈 Analyse les statistiques d'une image
   */
  private async analyzeImageStats(buffer: Buffer): Promise<ImageStats> {
    const image = sharp(buffer);
    
    // Extraire les pixels en grayscale pour l'analyse
    const { data, info } = await image
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    const pixels = new Uint8Array(data);
    const totalPixels = info.width * info.height;
    
    // 1. BRIGHTNESS - Moyenne des pixels
    let brightnessSum = 0;
    for (let i = 0; i < pixels.length; i++) {
      brightnessSum += pixels[i];
    }
    const brightness = brightnessSum / totalPixels;
    
    // 2. CONTRAST - Écart-type des pixels
    let varianceSum = 0;
    for (let i = 0; i < pixels.length; i++) {
      varianceSum += Math.pow(pixels[i] - brightness, 2);
    }
    const contrast = Math.sqrt(varianceSum / totalPixels) / 1.28; // Normalisé 0-100
    
    // 3. SHARPNESS - Variance du Laplacien
    let laplacianSum = 0;
    let laplacianCount = 0;
    const width = info.width;
    
    for (let y = 1; y < info.height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        // Laplacien: 4 * centre - (haut + bas + gauche + droite)
        const laplacian = 4 * pixels[idx] - 
          pixels[idx - width] - pixels[idx + width] - 
          pixels[idx - 1] - pixels[idx + 1];
        laplacianSum += laplacian * laplacian;
        laplacianCount++;
      }
    }
    const sharpness = Math.min(100, Math.sqrt(laplacianSum / laplacianCount) / 5);
    
    // 4. WHITE RATIO - % de pixels presque blancs (> 200)
    let whiteCount = 0;
    for (let i = 0; i < pixels.length; i++) {
      if (pixels[i] > 200) whiteCount++;
    }
    const whiteRatio = whiteCount / totalPixels;
    
    return { sharpness, brightness, contrast, whiteRatio };
  }

  /**
   * 📐 Normalise toutes les photos à la même dimension
   */
  private async normalizePhotos(photos: PhotoInput[], targetWidth: number): Promise<Buffer[]> {
    return Promise.all(photos.map(async (photo) => {
      const buffer = Buffer.from(photo.base64, 'base64');
      return sharp(buffer)
        .resize(targetWidth, null, { fit: 'inside', withoutEnlargement: true })
        .toBuffer();
    }));
  }

  /**
   * 🔀 Fusion MULTI-PERSPECTIVE des images
   * 
   * STRATÉGIE MULTI-PERSPECTIVE:
   * Les 3 photos sont prises de DIFFÉRENTS ANGLES. Chaque perspective
   * révèle mieux certains bords du papier (ceux face à la caméra).
   * 
   * Au lieu de moyenner (qui floute), on:
   * 1. Détecte les BORDS (gradient) dans CHAQUE image
   * 2. Pour les zones de bord: prend l'image avec le MEILLEUR contraste
   * 3. Pour les zones uniformes: moyenne pour réduire le bruit
   * 
   * Résultat: Une image avec TOUS les bords bien définis, même ceux
   * partiellement cachés dans certaines perspectives.
   */
  private async weightedBlend(buffers: Buffer[], weights: number[]): Promise<Buffer> {
    if (buffers.length === 1) return buffers[0];
    
    // Obtenir les dimensions de la première image
    const firstMeta = await sharp(buffers[0]).metadata();
    const width = firstMeta.width!;
    const height = firstMeta.height!;
    
    console.log(`🔀 [Fusion Multi-Perspective] Combinaison de ${buffers.length} perspectives (${width}x${height})`);
    
    // Extraire les pixels RGBA de chaque image
    const pixelArrays = await Promise.all(buffers.map(async (buf) => {
      const { data } = await sharp(buf)
        .resize(width, height, { fit: 'fill' })
        .raw()
        .ensureAlpha()
        .toBuffer({ resolveWithObject: true });
      return new Uint8Array(data);
    }));
    
    // 🔍 ÉTAPE 1: Calculer les cartes de gradient (bords) pour CHAQUE image
    console.log('🔍 [Fusion] Calcul des cartes de gradient pour chaque perspective...');
    const gradientMaps: number[][] = [];
    
    for (let imgIdx = 0; imgIdx < pixelArrays.length; imgIdx++) {
      const pixels = pixelArrays[imgIdx];
      const gradient = new Array(width * height).fill(0);
      
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = (y * width + x) * 4;
          const currentLum = 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
          
          // Sobel simplifié - magnitude du gradient
          const leftIdx = (y * width + (x - 1)) * 4;
          const rightIdx = (y * width + (x + 1)) * 4;
          const topIdx = ((y - 1) * width + x) * 4;
          const bottomIdx = ((y + 1) * width + x) * 4;
          
          const leftLum = 0.299 * pixels[leftIdx] + 0.587 * pixels[leftIdx + 1] + 0.114 * pixels[leftIdx + 2];
          const rightLum = 0.299 * pixels[rightIdx] + 0.587 * pixels[rightIdx + 1] + 0.114 * pixels[rightIdx + 2];
          const topLum = 0.299 * pixels[topIdx] + 0.587 * pixels[topIdx + 1] + 0.114 * pixels[topIdx + 2];
          const bottomLum = 0.299 * pixels[bottomIdx] + 0.587 * pixels[bottomIdx + 1] + 0.114 * pixels[bottomIdx + 2];
          
          const gx = Math.abs(rightLum - leftLum);
          const gy = Math.abs(bottomLum - topLum);
          
          gradient[y * width + x] = Math.sqrt(gx * gx + gy * gy);
        }
      }
      
      gradientMaps.push(gradient);
    }
    
    // 📊 Statistiques des gradients
    const maxGradients = gradientMaps.map(g => Math.max(...g));
    console.log(`📊 [Fusion] Gradients max par perspective: ${maxGradients.map(g => g.toFixed(1)).join(', ')}`);
    
    // Créer le buffer de sortie
    const outputPixels = new Uint8Array(width * height * 4);
    
    // 🎯 ÉTAPE 2: Fusion pixel par pixel
    // - Zones de bord (gradient fort): prendre l'image avec le MEILLEUR contraste à cet endroit
    // - Zones uniformes (gradient faible): moyenne pondérée classique
    const GRADIENT_THRESHOLD = 15; // Seuil pour considérer une zone comme "bord"
    let edgePixels = 0;
    let smoothPixels = 0;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixelIndex = y * width + x;
        const idx = pixelIndex * 4;
        
        // Récupérer le gradient de chaque image à ce pixel
        const gradientsAtPixel = gradientMaps.map(g => g[pixelIndex]);
        const maxGradient = Math.max(...gradientsAtPixel);
        
        if (maxGradient > GRADIENT_THRESHOLD) {
          // 🎯 ZONE DE BORD: Une perspective a détecté un bord ici
          // Prendre les pixels de l'image qui a le MEILLEUR contraste (gradient le plus fort)
          edgePixels++;
          
          const bestImageIdx = gradientsAtPixel.indexOf(maxGradient);
          const bestPixels = pixelArrays[bestImageIdx];
          
          outputPixels[idx] = bestPixels[idx];
          outputPixels[idx + 1] = bestPixels[idx + 1];
          outputPixels[idx + 2] = bestPixels[idx + 2];
        } else {
          // 🔲 ZONE UNIFORME: Moyenne pondérée (réduit le bruit)
          smoothPixels++;
          
          let r = 0, g = 0, b = 0;
          for (let j = 0; j < pixelArrays.length; j++) {
            r += pixelArrays[j][idx] * weights[j];
            g += pixelArrays[j][idx + 1] * weights[j];
            b += pixelArrays[j][idx + 2] * weights[j];
          }
          
          outputPixels[idx] = Math.round(r);
          outputPixels[idx + 1] = Math.round(g);
          outputPixels[idx + 2] = Math.round(b);
        }
        
        outputPixels[idx + 3] = 255; // Alpha
      }
    }
    
    console.log(`✅ [Fusion Multi-Perspective] Terminée: ${edgePixels} pixels de bord (meilleure perspective), ${smoothPixels} pixels uniformes (moyennés)`);
    
    return sharp(Buffer.from(outputPixels), {
      raw: { width, height, channels: 4 }
    }).png().toBuffer();
  }

  /**
   * 🔲 Amélioration des contours (Unsharp Mask AGRESSIF)
   * ⚠️ Ne modifie pas les dimensions !
   */
  private async enhanceEdges(buffer: Buffer): Promise<Buffer> {
    // Unsharp Mask agressif pour mieux voir les bords
    return sharp(buffer)
      .sharpen({
        sigma: 2.0,      // Rayon du flou (plus grand = bords plus larges)
        m1: 2.5,         // Quantité de sharpening pour les zones sombres (augmenté)
        m2: 1.5,         // Quantité de sharpening pour les zones claires (augmenté)
        x1: 2,           // Seuil bas
        y2: 15,          // Seuil haut (augmenté)
        y3: 15           // Maximum (augmenté)
      })
      .toBuffer();
  }

  /**
   * ⬜ Amplification des zones blanches (pour mieux voir la feuille A4)
   * 
   * Technique: Augmente le contraste des pixels clairs pour que le papier blanc
   * ressorte mieux du fond
   */
  private async boostWhiteAreas(buffer: Buffer): Promise<Buffer> {
    // Obtenir les métadonnées
    const meta = await sharp(buffer).metadata();
    const width = meta.width!;
    const height = meta.height!;
    
    // Extraire pixels RGBA
    const { data } = await sharp(buffer)
      .raw()
      .ensureAlpha()
      .toBuffer({ resolveWithObject: true });
    
    const pixels = new Uint8Array(data);
    const outputPixels = new Uint8Array(pixels.length);
    
    // Paramètres de boost
    const whiteThreshold = 180;  // Pixels > ce seuil sont considérés "blancs"
    const boostFactor = 1.2;     // Facteur d'amplification pour les blancs
    const darkenFactor = 0.9;    // Facteur d'assombrissement pour les non-blancs
    
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      
      // Calculer la luminosité
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      
      if (luminance > whiteThreshold) {
        // Amplifier les zones blanches (rapprocher de 255)
        outputPixels[i] = Math.min(255, Math.round(r * boostFactor));
        outputPixels[i + 1] = Math.min(255, Math.round(g * boostFactor));
        outputPixels[i + 2] = Math.min(255, Math.round(b * boostFactor));
      } else {
        // Légèrement assombrir le reste pour augmenter le contraste
        outputPixels[i] = Math.round(r * darkenFactor);
        outputPixels[i + 1] = Math.round(g * darkenFactor);
        outputPixels[i + 2] = Math.round(b * darkenFactor);
      }
      
      outputPixels[i + 3] = 255; // Alpha
    }
    
    return sharp(Buffer.from(outputPixels), {
      raw: { width, height, channels: 4 }
    }).png().toBuffer();
  }

  /**
   * 🎛️ Amélioration du contraste local (CLAHE-like)
   * 
   * Normalise le contraste localement pour mieux voir les bords
   */
  private async enhanceLocalContrast(buffer: Buffer): Promise<Buffer> {
    // Sharp n'a pas de CLAHE natif, mais on peut simuler avec normalize + modulate
    return sharp(buffer)
      .normalize()  // Étendre la plage dynamique
      .modulate({
        brightness: 1.0,
        saturation: 1.1,  // Légère saturation pour mieux distinguer couleurs
        lightness: 0      // Pas de changement de luminosité globale
      })
      .linear(1.1, -10) // Léger ajustement de contraste: a * pixel + b
      .toBuffer();
  }

  /**
   * 📷 Optimise une seule photo (même traitement que fusion mais pour 1 image)
   */
  private async optimizeSinglePhoto(
    photo: PhotoInput,
    options: {
      enhanceEdges: boolean;
      boostWhite: boolean;
      localContrast: boolean;
      targetWidth: number;
      outputQuality: number;
    }
  ): Promise<FusionResult> {
    try {
      let buffer: Buffer = Buffer.from(photo.base64, 'base64');
      
      // Redimensionner si nécessaire
      buffer = Buffer.from(await sharp(buffer)
        .resize(options.targetWidth, null, { fit: 'inside', withoutEnlargement: true })
        .toBuffer());
      
      // Appliquer les améliorations
      if (options.enhanceEdges) {
        buffer = Buffer.from(await this.enhanceEdges(buffer));
      }
      if (options.boostWhite) {
        buffer = Buffer.from(await this.boostWhiteAreas(buffer));
      }
      if (options.localContrast) {
        buffer = Buffer.from(await this.enhanceLocalContrast(buffer));
      }
      
      // Finalisation
      const finalBuffer = await sharp(buffer)
        .jpeg({ quality: options.outputQuality })
        .toBuffer();
      
      const stats = await this.analyzeImageStats(finalBuffer);
      
      return {
        success: true,
        fusedImageBase64: finalBuffer.toString('base64'),
        mimeType: 'image/jpeg',
        metrics: {
          inputPhotos: 1,
          usedPhotos: 1,
          averageQuality: 100,
          edgeEnhancement: options.enhanceEdges ? 1 : 0,
          whiteBoost: options.boostWhite ? 1 : 0,
          finalSharpness: stats.sharpness
        },
        photoAnalysis: [{
          index: 0,
          quality: 100,
          sharpness: stats.sharpness,
          brightness: stats.brightness,
          weight: 1,
          issues: []
        }]
      };
    } catch (error) {
      return {
        success: false,
        mimeType: 'image/jpeg',
        error: (error as Error).message
      };
    }
  }

  /**
   * 🎯 FUSION OPTIMISÉE POUR DÉTECTION DE RÉFÉRENCE
   * 
   * Version spécialisée pour détecter une feuille A4 ou carte de référence.
   * Applique des traitements spécifiques pour maximiser la visibilité des bords.
   * 
   * ⚠️ IMPORTANT: Ne modifie PAS les proportions de l'image !
   * Les coordonnées retournées sont en % et doivent correspondre à l'image originale.
   */
  async fuseForReferenceDetection(
    photos: PhotoInput[],
    referenceType: 'a4' | 'card' | 'meter' | 'custom' = 'a4'
  ): Promise<FusionResult> {
    console.log(`🎯 [Fusion Reference] Fusion optimisée pour ${referenceType.toUpperCase()}...`);
    
    // ⚠️ IMPORTANT: Utiliser les dimensions de la PREMIÈRE photo pour préserver les proportions
    // Cela garantit que les coordonnées en % seront correctes pour l'image affichée
    let targetWidth = 1920; // Par défaut
    
    if (photos.length > 0) {
      try {
        const firstBuffer = Buffer.from(photos[0].base64, 'base64');
        const meta = await sharp(firstBuffer).metadata();
        if (meta.width) {
          // Garder la largeur originale (ou max 2048 pour performance)
          targetWidth = Math.min(meta.width, 2048);
          console.log(`📐 [Fusion Reference] Dimensions préservées: ${meta.width}x${meta.height} → target ${targetWidth}px`);
        }
      } catch (e) {
        console.warn('⚠️ [Fusion Reference] Impossible de lire les dimensions, utilisation par défaut');
      }
    }
    
    // Paramètres spécifiques selon le type de référence
    const params = {
      a4: {
        enhanceEdges: true,
        boostWhite: true,       // A4 blanc = boost zones blanches
        localContrast: true,
        targetWidth,            // Préserver les proportions !
        outputQuality: 95
      },
      card: {
        enhanceEdges: true,
        boostWhite: false,      // Carte pas forcément blanche
        localContrast: true,
        targetWidth,
        outputQuality: 95
      },
      meter: {
        enhanceEdges: true,
        boostWhite: false,
        localContrast: true,
        targetWidth: 2048,
        outputQuality: 95
      },
      custom: {
        enhanceEdges: true,
        boostWhite: false,
        localContrast: true,
        targetWidth: 1920,
        outputQuality: 95
      }
    };
    
    const config = params[referenceType] || params.a4;
    
    // Appliquer la fusion avec les paramètres optimisés
    const result = await this.fusePhotos(photos, config);
    
    // Pour A4, appliquer un traitement supplémentaire: détection de bords préliminaire
    if (referenceType === 'a4' && result.success && result.fusedImageBase64) {
      console.log('📄 [Fusion Reference] Post-traitement spécial A4...');
      result.fusedImageBase64 = await this.enhanceA4Detection(result.fusedImageBase64);
    }
    
    return result;
  }

  /**
   * 📄 Post-traitement spécial pour feuille A4
   * 
   * Accentue les transitions blanc/autre pour faciliter la détection
   * ⚠️ NE MODIFIE PAS les dimensions de l'image !
   */
  private async enhanceA4Detection(base64: string): Promise<string> {
    console.log('📄 [Fusion A4] Accentuation des bords de la feuille blanche...');
    
    let buffer = Buffer.from(base64, 'base64');
    const meta = await sharp(buffer).metadata();
    const width = meta.width!;
    const height = meta.height!;
    
    console.log(`📐 [Fusion A4] Dimensions préservées: ${width}x${height}`);
    
    // Extraire pixels
    const { data } = await sharp(buffer)
      .raw()
      .ensureAlpha()
      .toBuffer({ resolveWithObject: true });
    
    const pixels = new Uint8Array(data);
    const outputPixels = new Uint8Array(pixels.length);
    
    // 🎯 ALGORITHME AMÉLIORÉ: Détection des bords blanc → sombre
    // On cherche les pixels qui sont à la FRONTIÈRE entre zone blanche et zone sombre
    const EDGE_RADIUS = 3; // Rayon de recherche pour les voisins
    let edgesFound = 0;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        
        // Copier pixel original par défaut
        outputPixels[idx] = pixels[idx];
        outputPixels[idx + 1] = pixels[idx + 1];
        outputPixels[idx + 2] = pixels[idx + 2];
        outputPixels[idx + 3] = 255;
        
        // Calculer luminosité du pixel actuel
        const currentLum = 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
        
        // Si c'est un pixel BLANC (luminosité > 180)
        if (currentLum > 180) {
          // Chercher si un voisin est SIGNIFICATIVEMENT plus sombre
          let hasDarkNeighbor = false;
          let maxLumDiff = 0;
          
          for (let dy = -EDGE_RADIUS; dy <= EDGE_RADIUS && !hasDarkNeighbor; dy++) {
            for (let dx = -EDGE_RADIUS; dx <= EDGE_RADIUS && !hasDarkNeighbor; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              
              if (nx >= 0 && nx < width && ny >= 0 && ny < height && (dx !== 0 || dy !== 0)) {
                const nIdx = (ny * width + nx) * 4;
                const neighborLum = 0.299 * pixels[nIdx] + 0.587 * pixels[nIdx + 1] + 0.114 * pixels[nIdx + 2];
                const lumDiff = currentLum - neighborLum;
                
                if (lumDiff > maxLumDiff) maxLumDiff = lumDiff;
                
                // Seuil: différence de luminosité > 40 = bord de la feuille
                if (lumDiff > 40) {
                  hasDarkNeighbor = true;
                }
              }
            }
          }
          
          if (hasDarkNeighbor) {
            // 🎨 BORD DÉTECTÉ ! Rendre ce pixel PLUS BLANC pour accentuer le contraste
            // Plus la différence est grande, plus on blanchit
            const boostFactor = Math.min(30, maxLumDiff * 0.3);
            outputPixels[idx] = Math.min(255, outputPixels[idx] + boostFactor);
            outputPixels[idx + 1] = Math.min(255, outputPixels[idx + 1] + boostFactor);
            outputPixels[idx + 2] = Math.min(255, outputPixels[idx + 2] + boostFactor);
            edgesFound++;
          }
        }
        // Si c'est un pixel SOMBRE proche d'un blanc, l'assombrir un peu pour augmenter le contraste
        else if (currentLum < 160 && currentLum > 80) {
          // Chercher un voisin blanc
          let hasWhiteNeighbor = false;
          
          for (let dy = -2; dy <= 2 && !hasWhiteNeighbor; dy++) {
            for (let dx = -2; dx <= 2 && !hasWhiteNeighbor; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const nIdx = (ny * width + nx) * 4;
                const neighborLum = 0.299 * pixels[nIdx] + 0.587 * pixels[nIdx + 1] + 0.114 * pixels[nIdx + 2];
                
                if (neighborLum > 180) {
                  hasWhiteNeighbor = true;
                }
              }
            }
          }
          
          if (hasWhiteNeighbor) {
            // Assombrir légèrement pour augmenter le contraste
            outputPixels[idx] = Math.max(0, outputPixels[idx] - 15);
            outputPixels[idx + 1] = Math.max(0, outputPixels[idx + 1] - 15);
            outputPixels[idx + 2] = Math.max(0, outputPixels[idx + 2] - 15);
          }
        }
      }
    }
    
    console.log(`🎯 [Fusion A4] Bords accentués: ${edgesFound} pixels de bordure détectés`);
    
    const finalBuffer = await sharp(Buffer.from(outputPixels), {
      raw: { width, height, channels: 4 }
    }).jpeg({ quality: 95 }).toBuffer();
    
    return finalBuffer.toString('base64');
  }
}

// ============================================================================
// EXPORT SINGLETON
// ============================================================================

export const multiPhotoFusionService = new MultiPhotoFusionService();
export default multiPhotoFusionService;
