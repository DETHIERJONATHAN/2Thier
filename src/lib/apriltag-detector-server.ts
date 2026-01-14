/**
 * ⚠️ SERVER-ONLY MODULE ⚠️
 * 
 * Ce module contient la détection AprilTag pour Node.js.
 * NE PAS IMPORTER depuis le code client (React) !
 * 
 * @module lib/apriltag-detector-server
 * @author 2Thier CRM Team
 */

import AprilTag, { FAMILIES } from '@monumental-works/apriltag-node';

export interface Point2D {
  x: number;
  y: number;
}

export interface AprilTagDetectionResult {
  id: number;
  corners: Point2D[];
  center: Point2D;
}

/**
 * Détecte les AprilTags dans une image pour la feuille Métré V1.2
 * 
 * @param data Buffer RGBA de l'image
 * @param width Largeur de l'image
 * @param height Hauteur de l'image
 * @returns Liste des AprilTags détectés avec leurs coins
 */
export function detectAprilTagsMetreA4(
  data: Uint8ClampedArray | Buffer,
  width: number,
  height: number
): AprilTagDetectionResult[] {
  try {
    console.log(`🎯 [APRILTAG] Détection AprilTags Métré V1.2...`);
    
    // Convertir RGBA en niveaux de gris (grayscale)
    const grayscale = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const r = data[i * 4];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];
      grayscale[i] = Math.floor((r + g + b) / 3);
    }
    
    // Créer détecteur AprilTag (famille 36h11 pour Métré V1.2)
    const detector = new AprilTag(FAMILIES.TAG36H11, {
      quadDecimate: 2.0,    // Accélération sur grandes images
      quadSigma: 0.0,       // Pas de flou gaussien
      refineEdges: true,    // Meilleure précision des coins
      decodeSharpening: 0.25
    });
    
    // Détecter les tags (synchrone)
    const detections = detector.detect(width, height, grayscale);
    
    console.log(`   🔍 ${detections.length} AprilTag(s) détecté(s)`);
    
    if (detections.length === 0) {
      return [];
    }
    
    // Convertir les détections au format attendu
    // Format @monumental-works/apriltag-node: detection.corners = [[x0,y0], [x1,y1], [x2,y2], [x3,y3]]
    const results: AprilTagDetectionResult[] = [];
    for (const detection of detections) {
      const corners: Point2D[] = [
        { x: detection.corners[0][0], y: detection.corners[0][1] }, // Top-left
        { x: detection.corners[1][0], y: detection.corners[1][1] }, // Top-right
        { x: detection.corners[2][0], y: detection.corners[2][1] }, // Bottom-right
        { x: detection.corners[3][0], y: detection.corners[3][1] }  // Bottom-left
      ];
      
      // Calculer le centre du tag (moyenne des 4 coins)
      const center: Point2D = {
        x: (corners[0].x + corners[1].x + corners[2].x + corners[3].x) / 4,
        y: (corners[0].y + corners[1].y + corners[2].y + corners[3].y) / 4
      };
      
      results.push({ id: detection.id, corners, center });
      console.log(`   ✅ AprilTag ID=${detection.id} détecté`);
    }
    
    return results;
    
  } catch (error) {
    console.error(`❌ [APRILTAG] Erreur détection:`, error);
    return [];
  }
}

/**
 * Détecte les 4 AprilTags de la feuille Métré V1.2 (IDs: 2, 7, 14, 21)
 * et retourne les centres comme coins de calibration A4
 * 
 * @param data Buffer RGBA de l'image
 * @param width Largeur de l'image
 * @param height Hauteur de l'image
 * @returns Coins A4 détectés (TL, TR, BR, BL) ou null si incomplet
 */
export function detectMetreA4Corners(
  data: Uint8ClampedArray | Buffer,
  width: number,
  height: number
): { topLeft: Point2D; topRight: Point2D; bottomRight: Point2D; bottomLeft: Point2D } | null {
  
  const detectedTags = detectAprilTagsMetreA4(data, width, height);
  
  // Vérifier qu'on a les 4 tags nécessaires (2, 7, 14, 21)
  const requiredIds = [2, 7, 14, 21];
  const foundIds = detectedTags.map(t => t.id);
  const missingIds = requiredIds.filter(id => !foundIds.includes(id));
  
  if (missingIds.length > 0) {
    console.log(`   ⚠️ AprilTags manquants: ${missingIds.join(', ')}`);
    console.log(`   📌 Trouvés: ${foundIds.join(', ')}`);
    return null;
  }
  
  // Récupérer les 4 AprilTags (robuste aux doublons d'ID)
  // Note: la feuille contient potentiellement d'autres tags (dont des petits) avec les mêmes IDs.
  // On choisit donc la détection la plus cohérente avec le quadrant attendu,
  // et on privilégie la plus grande (coins imprimés) si plusieurs candidats.
  type Quadrant = 'TL' | 'TR' | 'BL' | 'BR';
  const quadrantMetric = (t: AprilTagDetectionResult, q: Quadrant): number => {
    const { x, y } = t.center;
    switch (q) {
      case 'TL':
        return x + y; // plus petit
      case 'TR':
        return -(x - y); // x-y plus grand => métrique plus petite
      case 'BL':
        return x - y; // plus petit
      case 'BR':
        return -(x + y); // plus grand => métrique plus petite
    }
  };

  const avgSidePx = (t: AprilTagDetectionResult): number => {
    const [c0, c1, c2, c3] = t.corners;
    const d = (a: Point2D, b: Point2D) => Math.hypot(b.x - a.x, b.y - a.y);
    const sides = [d(c0, c1), d(c1, c2), d(c2, c3), d(c3, c0)];
    return sides.reduce((s, v) => s + v, 0) / sides.length;
  };

  const pickTag = (id: number, quadrant: Quadrant): AprilTagDetectionResult => {
    const cands = detectedTags.filter((t) => t.id === id);
    if (cands.length === 1) return cands[0];

    const sorted = [...cands].sort((a, b) => quadrantMetric(a, quadrant) - quadrantMetric(b, quadrant));
    const best = sorted.slice(0, Math.min(3, sorted.length));
    let chosen = best[0];
    let bestSide = avgSidePx(chosen);
    for (const cand of best.slice(1)) {
      const side = avgSidePx(cand);
      if (side > bestSide) {
        bestSide = side;
        chosen = cand;
      }
    }
    return chosen;
  };

  const tagTL = pickTag(2, 'TL');  // Top-Left
  const tagTR = pickTag(7, 'TR');  // Top-Right
  const tagBL = pickTag(14, 'BL'); // Bottom-Left
  const tagBR = pickTag(21, 'BR'); // Bottom-Right
  
  console.log(`   📍 Centres AprilTags:`);
  console.log(`      TL(2):  (${tagTL.center.x.toFixed(0)}, ${tagTL.center.y.toFixed(0)})`);
  console.log(`      TR(7):  (${tagTR.center.x.toFixed(0)}, ${tagTR.center.y.toFixed(0)})`);
  console.log(`      BL(14): (${tagBL.center.x.toFixed(0)}, ${tagBL.center.y.toFixed(0)})`);
  console.log(`      BR(21): (${tagBR.center.x.toFixed(0)}, ${tagBR.center.y.toFixed(0)})`);
  
  // Les centres des AprilTags SONT les coins de la feuille A4 Métré
  return {
    topLeft: tagTL.center,
    topRight: tagTR.center,
    bottomRight: tagBR.center,
    bottomLeft: tagBL.center
  };
}
