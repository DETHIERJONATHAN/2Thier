/**
 * 🎨 PAGE BACKGROUNDS - DESIGNS PROFESSIONNELS & MODERNES
 * Inspirés par les designs modernes de factures/devis élégants
 * Dégradés sophistiqués, formes géométriques audacieuses, couleurs premium
 */

export interface PageBackground {
  id: string;
  name: string;
  description: string;
  category: 'premium' | 'corporate' | 'creative' | 'minimal' | 'luxury' | 'tech';
  svgGenerator: (colors: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    bg: string;
  }) => string;
}

// Convertir hex en RGB pour les transparences
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `rgb(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)})` : 'rgb(0,0,0)';
};

const createSVG = (content: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1600">${content}</svg>`)}`;

export const PAGE_BACKGROUNDS: PageBackground[] = [
  // ==================== PREMIUM - DESIGNS D'EXCEPTION ====================
  
  {
    id: 'bg_premium_geometric_diagonal',
    name: 'Géométrie Diagonale Premium',
    description: 'Formes géométriques audacieuses en angle, style facture moderne',
    category: 'premium',
    svgGenerator: (c) => createSVG(`
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${c.primary};stop-opacity:0.15" />
          <stop offset="100%" style="stop-color:${c.secondary};stop-opacity:0.1" />
        </linearGradient>
        <linearGradient id="grad2" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${c.accent};stop-opacity:0.2" />
          <stop offset="100%" style="stop-color:${c.primary};stop-opacity:0.1" />
        </linearGradient>
      </defs>
      <rect width="1200" height="1600" fill="${c.bg}"/>
      <rect width="1200" height="1600" fill="url(#grad1)"/>
      
      <!-- Grand triangle angle haut droit -->
      <polygon points="1200,0 1200,300 700,0" fill="${c.primary}" opacity="0.08"/>
      <polygon points="1200,0 1200,250 750,0" fill="${c.accent}" opacity="0.05"/>
      
      <!-- Triangle bas gauche -->
      <polygon points="0,1600 0,1100 400,1600" fill="${c.secondary}" opacity="0.07"/>
      <polygon points="0,1600 0,1150 350,1600" fill="${c.accent}" opacity="0.04"/>
      
      <!-- Bande diagonale centrale -->
      <polygon points="0,400 800,0 1200,200 400,1600" fill="url(#grad2)" opacity="0.6"/>
      
      <!-- Accent coin supérieur droit -->
      <circle cx="1100" cy="100" r="150" fill="${c.accent}" opacity="0.06"/>
    `),
  },

  {
    id: 'bg_premium_angular_accent',
    name: 'Accent Angulaire',
    description: 'Formes angulaires épurées avec accents de couleur',
    category: 'premium',
    svgGenerator: (c) => createSVG(`
      <defs>
        <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${c.primary};stop-opacity:0.2" />
          <stop offset="100%" style="stop-color:${c.secondary};stop-opacity:0.08" />
        </linearGradient>
      </defs>
      <rect width="1200" height="1600" fill="${c.bg}"/>
      
      <!-- Bloc angulaire haut gauche -->
      <polygon points="0,0 400,0 0,200" fill="${c.accent}" opacity="0.1"/>
      <polygon points="0,0 350,0 0,150" fill="${c.primary}" opacity="0.08"/>
      
      <!-- Chevron au milieu droit -->
      <polygon points="900,600 1200,400 1200,700 900,900" fill="${c.secondary}" opacity="0.06"/>
      
      <!-- Bloc bas droit -->
      <polygon points="1200,1600 1200,1300 800,1600" fill="${c.accent}" opacity="0.07"/>
      
      <!-- Gradient subtil global -->
      <rect width="1200" height="1600" fill="url(#g1)"/>
      
      <!-- Ligne fine accent -->
      <line x1="500" y1="200" x2="1200" y2="800" stroke="${c.primary}" stroke-width="2" opacity="0.1"/>
    `),
  },

  {
    id: 'bg_premium_flowing_curves',
    name: 'Courbes Fluides',
    description: 'Dégradés avec courbes organiques modernes',
    category: 'premium',
    svgGenerator: (c) => createSVG(`
      <defs>
        <linearGradient id="curve1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${c.primary};stop-opacity:0.15" />
          <stop offset="50%" style="stop-color:${c.accent};stop-opacity:0.08" />
          <stop offset="100%" style="stop-color:${c.secondary};stop-opacity:0.1" />
        </linearGradient>
      </defs>
      <rect width="1200" height="1600" fill="${c.bg}"/>
      <rect width="1200" height="1600" fill="url(#curve1)"/>
      
      <!-- Courbe ondulante haut -->
      <path d="M 0,300 Q 300,100 600,300 T 1200,300" fill="${c.primary}" opacity="0.06" stroke="none"/>
      
      <!-- Blob bas droit -->
      <ellipse cx="1000" cy="1400" rx="300" ry="250" fill="${c.secondary}" opacity="0.05" transform="rotate(-30 1000 1400)"/>
      
      <!-- Accent fin -->
      <path d="M 0,0 Q 400,100 600,0" stroke="${c.accent}" stroke-width="3" fill="none" opacity="0.08"/>
    `),
  },

  // ==================== CORPORATE - ÉLÉGANCE PROFESSIONNELLE ====================
  
  {
    id: 'bg_corporate_modern_split',
    name: 'Division Moderne',
    description: 'Split design avec deux zones de couleurs complémentaires',
    category: 'corporate',
    svgGenerator: (c) => createSVG(`
      <defs>
        <linearGradient id="split1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:${c.primary};stop-opacity:0.12" />
          <stop offset="100%" style="stop-color:${c.primary};stop-opacity:0.02" />
        </linearGradient>
        <linearGradient id="split2" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${c.secondary};stop-opacity:0.1" />
          <stop offset="100%" style="stop-color:${c.accent};stop-opacity:0.05" />
        </linearGradient>
      </defs>
      <rect width="1200" height="1600" fill="${c.bg}"/>
      
      <!-- Zone gauche -->
      <rect x="0" y="0" width="600" height="1600" fill="url(#split1)"/>
      
      <!-- Zone droite -->
      <rect x="600" y="0" width="600" height="1600" fill="url(#split2)"/>
      
      <!-- Ligne de séparation -->
      <line x1="600" y1="0" x2="600" y2="1600" stroke="${c.primary}" stroke-width="2" opacity="0.15"/>
      
      <!-- Accents géométriques -->
      <polygon points="0,0 150,0 0,150" fill="${c.accent}" opacity="0.08"/>
      <polygon points="1200,1600 1200,1400 1050,1600" fill="${c.secondary}" opacity="0.07"/>
      
      <!-- Cercle accent -->
      <circle cx="1100" cy="200" r="100" fill="${c.accent}" opacity="0.05"/>
    `),
  },

  {
    id: 'bg_corporate_subtle_gradient',
    name: 'Gradient Subtil Professionnel',
    description: 'Dégradé léger et élégant, très professionnel',
    category: 'corporate',
    svgGenerator: (c) => createSVG(`
      <defs>
        <linearGradient id="subtle" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${c.primary};stop-opacity:0.08" />
          <stop offset="50%" style="stop-color:${c.bg};stop-opacity:0" />
          <stop offset="100%" style="stop-color:${c.secondary};stop-opacity:0.06" />
        </linearGradient>
        <radialGradient id="subtle-center" cx="50%" cy="30%" r="70%">
          <stop offset="0%" style="stop-color:${c.accent};stop-opacity:0.08" />
          <stop offset="100%" style="stop-color:${c.accent};stop-opacity:0" />
        </radialGradient>
      </defs>
      <rect width="1200" height="1600" fill="${c.bg}"/>
      <rect width="1200" height="1600" fill="url(#subtle)"/>
      <rect width="1200" height="1600" fill="url(#subtle-center)"/>
      
      <!-- Lignes fines horizontales -->
      <line x1="0" y1="200" x2="1200" y2="200" stroke="${c.primary}" stroke-width="1" opacity="0.04"/>
      <line x1="0" y1="1400" x2="1200" y2="1400" stroke="${c.secondary}" stroke-width="1" opacity="0.04"/>
    `),
  },

  {
    id: 'bg_corporate_bold_accent',
    name: 'Accent Gras Moderne',
    description: 'Bande épaisse avec dégradé, design moderne et impact',
    category: 'corporate',
    svgGenerator: (c) => createSVG(`
      <defs>
        <linearGradient id="accent-band" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${c.primary};stop-opacity:0.15" />
          <stop offset="100%" style="stop-color:${c.accent};stop-opacity:0.1" />
        </linearGradient>
      </defs>
      <rect width="1200" height="1600" fill="${c.bg}"/>
      
      <!-- Bande diagonale large -->
      <polygon points="0,0 1200,0 1200,250 0,150" fill="url(#accent-band)"/>
      
      <!-- Bloc bas -->
      <polygon points="0,1600 1200,1450 1200,1600" fill="${c.secondary}" opacity="0.07"/>
      
      <!-- Formes supplémentaires -->
      <circle cx="150" cy="800" r="120" fill="${c.accent}" opacity="0.05"/>
      <rect x="800" y="600" width="250" height="250" fill="${c.primary}" opacity="0.04" transform="rotate(20 925 725)"/>
    `),
  },

  // ==================== CREATIVE - DESIGNS ARTISTIQUES ====================
  
  {
    id: 'bg_creative_abstract_shapes',
    name: 'Formes Abstraites',
    description: 'Mélange de formes géométriques abstraites et organiques',
    category: 'creative',
    svgGenerator: (c) => createSVG(`
      <defs>
        <linearGradient id="creative1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${c.primary};stop-opacity:0.1" />
          <stop offset="100%" style="stop-color:${c.secondary};stop-opacity:0.08" />
        </linearGradient>
      </defs>
      <rect width="1200" height="1600" fill="${c.bg}"/>
      <rect width="1200" height="1600" fill="url(#creative1)"/>
      
      <!-- Formes géométriques -->
      <polygon points="0,200 250,0 300,300 0,350" fill="${c.primary}" opacity="0.07"/>
      <polygon points="1000,1300 1200,1200 1200,1600 950,1600" fill="${c.accent}" opacity="0.08"/>
      
      <!-- Cercles chevauchants -->
      <circle cx="600" cy="300" r="200" fill="${c.secondary}" opacity="0.05"/>
      <circle cx="800" cy="400" r="180" fill="${c.primary}" opacity="0.06"/>
      
      <!-- Blob bas -->
      <ellipse cx="300" cy="1400" rx="250" ry="200" fill="${c.accent}" opacity="0.06"/>
      
      <!-- Lignes décoratives -->
      <path d="M 100,500 Q 300,300 500,500" stroke="${c.primary}" stroke-width="2" fill="none" opacity="0.06"/>
    `),
  },

  {
    id: 'bg_creative_color_burst',
    name: 'Explosion de Couleurs',
    description: 'Dégradés radiaux qui explosent du centre',
    category: 'creative',
    svgGenerator: (c) => createSVG(`
      <defs>
        <radialGradient id="burst1" cx="50%" cy="30%" r="60%">
          <stop offset="0%" style="stop-color:${c.accent};stop-opacity:0.15" />
          <stop offset="100%" style="stop-color:${c.accent};stop-opacity:0" />
        </radialGradient>
        <radialGradient id="burst2" cx="70%" cy="70%" r="50%">
          <stop offset="0%" style="stop-color:${c.primary};stop-opacity:0.1" />
          <stop offset="100%" style="stop-color:${c.primary};stop-opacity:0" />
        </radialGradient>
      </defs>
      <rect width="1200" height="1600" fill="${c.bg}"/>
      <rect width="1200" height="1600" fill="url(#burst1)"/>
      <rect width="1200" height="1600" fill="url(#burst2)"/>
      
      <!-- Formes géométriques supplémentaires -->
      <polygon points="0,0 400,0 0,400" fill="${c.secondary}" opacity="0.06"/>
      <circle cx="150" cy="1500" r="140" fill="${c.accent}" opacity="0.05"/>
    `),
  },

  {
    id: 'bg_creative_waves',
    name: 'Vagues Modernes',
    description: 'Motif de vagues fluides et élégantes',
    category: 'creative',
    svgGenerator: (c) => createSVG(`
      <defs>
        <linearGradient id="wave-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${c.primary};stop-opacity:0.12" />
          <stop offset="100%" style="stop-color:${c.secondary};stop-opacity:0.08" />
        </linearGradient>
      </defs>
      <rect width="1200" height="1600" fill="${c.bg}"/>
      <rect width="1200" height="1600" fill="url(#wave-grad)"/>
      
      <!-- Vagues sinusoïdales -->
      <path d="M 0,300 Q 200,200 400,300 T 800,300 T 1200,300" fill="${c.primary}" opacity="0.08" stroke="none"/>
      <path d="M 0,800 Q 300,700 600,800 T 1200,800" fill="${c.accent}" opacity="0.06" stroke="none"/>
      <path d="M 0,1300 Q 200,1400 400,1300 T 800,1300 T 1200,1300" fill="${c.secondary}" opacity="0.07" stroke="none"/>
      
      <!-- Accents -->
      <circle cx="950" cy="200" r="80" fill="${c.accent}" opacity="0.05"/>
    `),
  },

  // ==================== MINIMAL - ÉPURÉ & MINIMALISTE ====================
  
  {
    id: 'bg_minimal_single_accent',
    name: 'Accent Unique',
    description: 'Une seule forme géométrique délicate',
    category: 'minimal',
    svgGenerator: (c) => createSVG(`
      <rect width="1200" height="1600" fill="${c.bg}"/>
      
      <!-- Triangle minimal haut droite -->
      <polygon points="1200,0 1200,150 1050,0" fill="${c.primary}" opacity="0.1"/>
      
      <!-- Cercle bas gauche -->
      <circle cx="100" cy="1500" r="100" fill="${c.secondary}" opacity="0.08"/>
      
      <!-- Ligne fine -->
      <line x1="200" y1="300" x2="1000" y2="300" stroke="${c.accent}" stroke-width="1" opacity="0.1"/>
    `),
  },

  {
    id: 'bg_minimal_corner_elements',
    name: 'Éléments Coins',
    description: 'Formes minimalistes aux quatre coins',
    category: 'minimal',
    svgGenerator: (c) => createSVG(`
      <rect width="1200" height="1600" fill="${c.bg}"/>
      
      <!-- Coin haut gauche -->
      <polygon points="0,0 200,0 0,100" fill="${c.primary}" opacity="0.08"/>
      
      <!-- Coin haut droit -->
      <polygon points="1200,0 1000,0 1200,120" fill="${c.accent}" opacity="0.07"/>
      
      <!-- Coin bas gauche -->
      <polygon points="0,1600 150,1600 0,1450" fill="${c.secondary}" opacity="0.08"/>
      
      <!-- Coin bas droit -->
      <circle cx="1100" cy="1500" r="90" fill="${c.primary}" opacity="0.06"/>
    `),
  },

  {
    id: 'bg_minimal_line_accent',
    name: 'Accent Ligne Fine',
    description: 'Minimaliste avec une ligne élégante',
    category: 'minimal',
    svgGenerator: (c) => createSVG(`
      <defs>
        <linearGradient id="line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:${c.primary};stop-opacity:0" />
          <stop offset="50%" style="stop-color:${c.accent};stop-opacity:0.15" />
          <stop offset="100%" style="stop-color:${c.secondary};stop-opacity:0" />
        </linearGradient>
      </defs>
      <rect width="1200" height="1600" fill="${c.bg}"/>
      
      <!-- Ligne gradient centrale -->
      <rect x="0" y="400" width="1200" height="80" fill="url(#line-grad)"/>
      
      <!-- Petit accent bas -->
      <rect x="0" y="1500" width="300" height="2" fill="${c.primary}" opacity="0.2"/>
    `),
  },

  // ==================== LUXURY - ÉLÉGANCE PREMIUM ====================
  
  {
    id: 'bg_luxury_golden_accents',
    name: 'Accents Dorés',
    description: 'Design luxe avec accents or/cuivre sophistiqués',
    category: 'luxury',
    svgGenerator: (c) => createSVG(`
      <defs>
        <linearGradient id="luxury1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${c.primary};stop-opacity:0.08" />
          <stop offset="100%" style="stop-color:${c.secondary};stop-opacity:0.06" />
        </linearGradient>
      </defs>
      <rect width="1200" height="1600" fill="${c.bg}"/>
      <rect width="1200" height="1600" fill="url(#luxury1)"/>
      
      <!-- Barre verticale luxury -->
      <rect x="0" y="400" width="8" height="800" fill="${c.accent}" opacity="0.15"/>
      
      <!-- Formes géométriques épurées -->
      <polygon points="1100,0 1200,0 1200,200 1100,100" fill="${c.accent}" opacity="0.1"/>
      <circle cx="150" cy="1450" r="110" fill="${c.primary}" opacity="0.07"/>
      
      <!-- Lignes fines -->
      <line x1="50" y1="200" x2="200" y2="200" stroke="${c.accent}" stroke-width="1.5" opacity="0.15"/>
      <line x1="1000" y1="1400" x2="1200" y2="1400" stroke="${c.secondary}" stroke-width="1" opacity="0.1"/>
    `),
  },

  {
    id: 'bg_luxury_elegant_gradient',
    name: 'Gradient Élégant Luxe',
    description: 'Dégradé très subtil de haut en bas, très luxe',
    category: 'luxury',
    svgGenerator: (c) => createSVG(`
      <defs>
        <linearGradient id="elegant" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" style="stop-color:${c.primary};stop-opacity:0.1" />
          <stop offset="50%" style="stop-color:${c.bg};stop-opacity:0" />
          <stop offset="100%" style="stop-color:${c.secondary};stop-opacity:0.07" />
        </linearGradient>
      </defs>
      <rect width="1200" height="1600" fill="${c.bg}"/>
      <rect width="1200" height="1600" fill="url(#elegant)"/>
      
      <!-- Accent fin coin haut -->
      <polygon points="0,0 300,0 0,80" fill="${c.accent}" opacity="0.08"/>
    `),
  },

  {
    id: 'bg_luxury_geometric_lines',
    name: 'Lignes Géométriques Luxe',
    description: 'Motif géométrique fin et élégant',
    category: 'luxury',
    svgGenerator: (c) => createSVG(`
      <rect width="1200" height="1600" fill="${c.bg}"/>
      
      <!-- Lignes diagonales fines -->
      <g stroke="${c.primary}" stroke-width="1" opacity="0.08">
        <line x1="0" y1="0" x2="800" y2="800"/>
        <line x1="0" y1="100" x2="800" y2="900"/>
        <line x1="0" y1="200" x2="800" y2="1000"/>
      </g>
      
      <!-- Accents géométriques -->
      <polygon points="1200,1600 1050,1600 1200,1450" fill="${c.accent}" opacity="0.09"/>
      <circle cx="300" cy="200" r="130" fill="${c.secondary}" opacity="0.05"/>
    `),
  },
];
