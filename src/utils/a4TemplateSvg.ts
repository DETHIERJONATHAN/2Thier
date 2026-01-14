/**
 * 📄 TEMPLATE A4 INTELLIGENT
 * 
 * Feuille A4 : 210×297mm
 * Épaisseur : 4mm (planches magnétiques)
 * 
 * ZONES DÉFINIES :
 * - Logo entreprise : Coin supérieur gauche (40×40mm)
 * - Indicateur orientation : Flèche centrale + texte "HAUT"
 * - Marqueurs futurs : Espaces réservés aux 4 coins
 * 
 * UTILISATION :
 * 1. Imprimer sur A4 blanc
 * 2. Coller sur planche magnétique 4mm
 * 3. Système de détection reconnaît automatiquement l'orientation
 */

export interface A4TemplateConfig {
  // Dimensions en mm
  width: number;   // 210mm
  height: number;  // 297mm
  
  // Zones réservées
  logoArea: { x: number; y: number; width: number; height: number };
  orientationIndicator: { show: boolean; style: 'arrow' | 'text' | 'both' };
  
  // Marqueurs futurs (désactivés par défaut)
  cornerMarkers: {
    enabled: boolean;
    type: 'cross' | 'circle' | 'qrcode';
    size: number; // mm
  };
  
  // Paramètres de détection 3D (préparation)
  thickness3D: number; // 4mm
  shadowDetection: boolean; // false par défaut
}

/**
 * Générer SVG A4 template
 */
export function generateA4Template(config: Partial<A4TemplateConfig> = {}): string {
  const defaultConfig: A4TemplateConfig = {
    width: 210,
    height: 297,
    logoArea: { x: 10, y: 10, width: 40, height: 40 },
    orientationIndicator: { show: true, style: 'both' },
    cornerMarkers: { enabled: false, type: 'cross', size: 10 },
    thickness3D: 4,
    shadowDetection: false
  };
  
  const cfg = { ...defaultConfig, ...config };
  
  const svg = `
<svg width="${cfg.width}mm" height="${cfg.height}mm" viewBox="0 0 ${cfg.width} ${cfg.height}" 
     xmlns="http://www.w3.org/2000/svg">
  
  <!-- Fond blanc A4 -->
  <rect width="${cfg.width}" height="${cfg.height}" fill="white"/>
  
  <!-- ═══════════════════════════════════════════════════════════════════ -->
  <!-- ZONE LOGO (Coin supérieur gauche) -->
  <!-- ═══════════════════════════════════════════════════════════════════ -->
  <g id="logo-area">
    <!-- Cadre pointillé pour visualisation -->
    <rect 
      x="${cfg.logoArea.x}" 
      y="${cfg.logoArea.y}" 
      width="${cfg.logoArea.width}" 
      height="${cfg.logoArea.height}" 
      fill="none" 
      stroke="#cccccc" 
      stroke-width="0.5" 
      stroke-dasharray="2,2"/>
    
    <text 
      x="${cfg.logoArea.x + cfg.logoArea.width / 2}" 
      y="${cfg.logoArea.y + cfg.logoArea.height / 2}" 
      text-anchor="middle" 
      dominant-baseline="middle" 
      font-family="Arial, sans-serif" 
      font-size="8" 
      fill="#999999">
      LOGO ICI
    </text>
  </g>
  
  ${cfg.orientationIndicator.show ? `
  <!-- ═══════════════════════════════════════════════════════════════════ -->
  <!-- INDICATEUR D'ORIENTATION (Centre haut) -->
  <!-- ═══════════════════════════════════════════════════════════════════ -->
  <g id="orientation-indicator">
    ${cfg.orientationIndicator.style === 'arrow' || cfg.orientationIndicator.style === 'both' ? `
    <!-- Flèche pointant vers le haut -->
    <path 
      d="M ${cfg.width / 2} 15 
         L ${cfg.width / 2 - 5} 25 
         L ${cfg.width / 2 + 5} 25 Z" 
      fill="black"/>
    ` : ''}
    
    ${cfg.orientationIndicator.style === 'text' || cfg.orientationIndicator.style === 'both' ? `
    <!-- Texte "HAUT" -->
    <text 
      x="${cfg.width / 2}" 
      y="35" 
      text-anchor="middle" 
      font-family="Arial, sans-serif" 
      font-size="12" 
      font-weight="bold" 
      fill="black">
      ↑ HAUT ↑
    </text>
    ` : ''}
  </g>
  ` : ''}
  
  ${cfg.cornerMarkers.enabled ? `
  <!-- ═══════════════════════════════════════════════════════════════════ -->
  <!-- MARQUEURS AUX COINS (Futurs - pour détection ultra-précise) -->
  <!-- ═══════════════════════════════════════════════════════════════════ -->
  <g id="corner-markers">
    ${cfg.cornerMarkers.type === 'cross' ? `
    <!-- Croix noires aux 4 coins -->
    ${generateCrossMarker(10, 10, cfg.cornerMarkers.size)}
    ${generateCrossMarker(cfg.width - 10, 10, cfg.cornerMarkers.size)}
    ${generateCrossMarker(cfg.width - 10, cfg.height - 10, cfg.cornerMarkers.size)}
    ${generateCrossMarker(10, cfg.height - 10, cfg.cornerMarkers.size)}
    ` : ''}
  </g>
  ` : ''}
  
  <!-- ═══════════════════════════════════════════════════════════════════ -->
  <!-- INFORMATIONS (Bas de page, petit texte) -->
  <!-- ═══════════════════════════════════════════════════════════════════ -->
  <g id="metadata">
    <text 
      x="${cfg.width / 2}" 
      y="${cfg.height - 10}" 
      text-anchor="middle" 
      font-family="Arial, sans-serif" 
      font-size="6" 
      fill="#666666">
      A4 Template | 210×297mm | Épaisseur: ${cfg.thickness3D}mm | Détection intelligente activée
    </text>
  </g>
</svg>
  `.trim();
  
  return svg;
}

/**
 * Générer une croix de marquage
 */
function generateCrossMarker(centerX: number, centerY: number, size: number): string {
  const halfSize = size / 2;
  return `
    <!-- Croix centrée en (${centerX}, ${centerY}) -->
    <line 
      x1="${centerX - halfSize}" y1="${centerY}" 
      x2="${centerX + halfSize}" y2="${centerY}" 
      stroke="black" stroke-width="1"/>
    <line 
      x1="${centerX}" y1="${centerY - halfSize}" 
      x2="${centerX}" y2="${centerY + halfSize}" 
      stroke="black" stroke-width="1"/>
  `;
}

/**
 * Configuration par défaut pour tests immédiats
 */
export const A4_TEMPLATE_DEFAULT = generateA4Template({
  orientationIndicator: { show: true, style: 'both' },
  cornerMarkers: { enabled: false, type: 'cross', size: 10 }
});

/**
 * Configuration future (avec marqueurs pour détection ultra-précise)
 */
export const A4_TEMPLATE_ADVANCED = generateA4Template({
  orientationIndicator: { show: true, style: 'both' },
  cornerMarkers: { enabled: true, type: 'cross', size: 10 },
  shadowDetection: true
});
