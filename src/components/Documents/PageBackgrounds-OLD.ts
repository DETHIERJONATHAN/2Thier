/**
 * 🎨 PAGE BACKGROUNDS - Fonds visuels MAGNIFIQUES & MODERNES 2024+
 * Designs élégants, minimalistes et professionnels
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

// Utilitaire - convertit hex en RGB
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 0, 0';
};

// Générateur SVG - toutes les couleurs sont dynamiques
const createSVG = (content: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1600">${content}</svg>`)}`;

export const PAGE_BACKGROUNDS: PageBackground[] = [
  // ==================== VINTAGE ====================
  {
    id: 'bg_vintage_lines',
    name: 'Vintage Lignes',
    description: 'Motif vintage avec lignes parallèles',
    category: 'vintage',
    svgGenerator: (c) => createSVG(`
      <defs>
        <pattern id="lines" patternUnits="userSpaceOnUse" width="20" height="20">
          <line x1="0" y1="0" x2="0" y2="20" stroke="${c.secondary}" stroke-width="1" opacity="0.3"/>
        </pattern>
      </defs>
      <rect width="1200" height="1600" fill="${c.bg}"/>
      <rect width="1200" height="1600" fill="url(#lines)"/>
      <circle cx="100" cy="100" r="80" fill="${c.primary}" opacity="0.1"/>
      <circle cx="1100" cy="1500" r="100" fill="${c.secondary}" opacity="0.08"/>
    `),
  },
  {
    id: 'bg_vintage_dots',
    name: 'Vintage Pointillé',
    description: 'Motif classique avec points',
    category: 'vintage',
    svgGenerator: (c) => createSVG(`
      <defs>
        <pattern id="dots" patternUnits="userSpaceOnUse" width="30" height="30">
          <circle cx="15" cy="15" r="3" fill="${c.secondary}" opacity="0.25"/>
        </pattern>
      </defs>
      <rect width="1200" height="1600" fill="${c.bg}"/>
      <rect width="1200" height="1600" fill="url(#dots)"/>
      <rect x="50" y="50" width="200" height="200" fill="none" stroke="${c.primary}" stroke-width="2" opacity="0.15"/>
      <rect x="950" y="1350" width="200" height="200" fill="none" stroke="${c.secondary}" stroke-width="2" opacity="0.1"/>
    `),
  },
  {
    id: 'bg_vintage_paper',
    name: 'Papier Ancien',
    description: 'Texture papier avec filigrane',
    category: 'vintage',
    svgGenerator: (c) => createSVG(`
      <rect width="1200" height="1600" fill="${c.bg}"/>
      <defs>
        <filter id="noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" seed="2"/>
          <feColorMatrix type="saturate" values="0.3"/>
        </filter>
      </defs>
      <rect width="1200" height="1600" fill="${c.primary}" opacity="0.05" filter="url(#noise)"/>
      <path d="M 0 100 Q 300 50 600 100 T 1200 100" stroke="${c.secondary}" stroke-width="2" fill="none" opacity="0.15"/>
      <path d="M 0 1500 Q 300 1550 600 1500 T 1200 1500" stroke="${c.primary}" stroke-width="2" fill="none" opacity="0.12"/>
    `),
  },

  // ==================== PROFESSIONNEL ====================
  {
    id: 'bg_pro_gradient_diagonal',
    name: 'Gradient Diagonal Pro',
    description: 'Dégradé diagonal professionnel',
    category: 'pro',
    svgGenerator: (c) => createSVG(`
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${c.bg};stop-opacity:1" />
          <stop offset="50%" style="stop-color:${c.primary};stop-opacity:0.05" />
          <stop offset="100%" style="stop-color:${c.secondary};stop-opacity:0.08" />
        </linearGradient>
      </defs>
      <rect width="1200" height="1600" fill="url(#grad)"/>
      <rect x="0" y="0" width="1200" height="4" fill="${c.primary}" opacity="0.6"/>
      <rect x="0" y="1596" width="1200" height="4" fill="${c.secondary}" opacity="0.4"/>
    `),
  },
  {
    id: 'bg_pro_minimal',
    name: 'Minimal Pro',
    description: 'Design minimaliste épuré',
    category: 'pro',
    svgGenerator: (c) => createSVG(`
      <rect width="1200" height="1600" fill="${c.bg}"/>
      <circle cx="150" cy="150" r="60" fill="${c.primary}" opacity="0.08"/>
      <circle cx="1050" cy="1450" r="80" fill="${c.secondary}" opacity="0.06"/>
      <line x1="100" y1="100" x2="1100" y2="100" stroke="${c.primary}" stroke-width="2" opacity="0.15"/>
      <line x1="100" y1="1500" x2="1100" y2="1500" stroke="${c.secondary}" stroke-width="2" opacity="0.12"/>
    `),
  },
  {
    id: 'bg_pro_waves',
    name: 'Vagues Pro',
    description: 'Motif de vagues subtiles',
    category: 'pro',
    svgGenerator: (c) => createSVG(`
      <defs>
        <path id="wave" d="M0,100 Q50,50 100,100 T200,100" stroke="${c.primary}" fill="none" stroke-width="2" opacity="0.2"/>
      </defs>
      <rect width="1200" height="1600" fill="${c.bg}"/>
      <use href="#wave" x="0" y="200"/>
      <use href="#wave" x="0" y="400"/>
      <use href="#wave" x="0" y="800"/>
      <use href="#wave" x="0" y="1200"/>
      <rect x="0" y="0" width="1200" height="1600" fill="${c.primary}" opacity="0.02"/>
    `),
  },

  // ==================== MODERNE ====================
  {
    id: 'bg_modern_grid',
    name: 'Grille Moderne',
    description: 'Grille géométrique contemporaine',
    category: 'modern',
    svgGenerator: (c) => createSVG(`
      <defs>
        <pattern id="grid" patternUnits="userSpaceOnUse" width="60" height="60">
          <path d="M 60 0 L 0 0 0 60" fill="none" stroke="${c.secondary}" stroke-width="1" opacity="0.2"/>
        </pattern>
      </defs>
      <rect width="1200" height="1600" fill="${c.bg}"/>
      <rect width="1200" height="1600" fill="url(#grid)"/>
      <rect x="100" y="100" width="400" height="400" fill="${c.primary}" opacity="0.08"/>
      <rect x="700" y="1100" width="300" height="300" fill="${c.accent}" opacity="0.07"/>
    `),
  },
  {
    id: 'bg_modern_gradient_blur',
    name: 'Gradient Flou Moderne',
    description: 'Dégradé avec effet de flou',
    category: 'modern',
    svgGenerator: (c) => createSVG(`
      <defs>
        <radialGradient id="blur" cx="50%" cy="50%">
          <stop offset="0%" style="stop-color:${c.primary};stop-opacity:0.1" />
          <stop offset="100%" style="stop-color:${c.secondary};stop-opacity:0.05" />
        </radialGradient>
        <filter id="soften">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3"/>
        </filter>
      </defs>
      <rect width="1200" height="1600" fill="${c.bg}"/>
      <rect width="1200" height="1600" fill="url(#blur)"/>
      <circle cx="300" cy="300" r="200" fill="${c.primary}" opacity="0.15" filter="url(#soften)"/>
      <circle cx="900" cy="1300" r="250" fill="${c.secondary}" opacity="0.12" filter="url(#soften)"/>
    `),
  },
  {
    id: 'bg_modern_abstract',
    name: 'Formes Abstraites',
    description: 'Composition abstraite dynamique',
    category: 'modern',
    svgGenerator: (c) => createSVG(`
      <rect width="1200" height="1600" fill="${c.bg}"/>
      <rect x="0" y="0" width="400" height="400" fill="${c.primary}" opacity="0.08" transform="rotate(15 200 200)"/>
      <circle cx="600" cy="400" r="150" fill="${c.accent}" opacity="0.07"/>
      <polygon points="1000,800 1100,1000 900,1000" fill="${c.secondary}" opacity="0.09"/>
      <path d="M 200 1200 Q 400 1100 600 1200 T 1000 1200" stroke="${c.primary}" fill="none" stroke-width="3" opacity="0.15"/>
    `),
  },

  // ==================== GÉOMÉTRIQUE ====================
  {
    id: 'bg_geometric_triangles',
    name: 'Triangles Géométriques',
    description: 'Motif de triangles répétés',
    category: 'geometric',
    svgGenerator: (c) => createSVG(`
      <rect width="1200" height="1600" fill="${c.bg}"/>
      <defs>
        <pattern id="triangles" patternUnits="userSpaceOnUse" width="100" height="100">
          <polygon points="50,10 90,90 10,90" fill="${c.primary}" opacity="0.1"/>
          <polygon points="10,10 50,90 10,90" fill="${c.secondary}" opacity="0.08"/>
        </pattern>
      </defs>
      <rect width="1200" height="1600" fill="url(#triangles)"/>
      <rect x="50" y="50" width="1100" height="1500" fill="none" stroke="${c.primary}" stroke-width="2" opacity="0.2"/>
    `),
  },
  {
    id: 'bg_geometric_hexagons',
    name: 'Hexagones',
    description: 'Motif hexagonal futuriste',
    category: 'geometric',
    svgGenerator: (c) => createSVG(`
      <rect width="1200" height="1600" fill="${c.bg}"/>
      <defs>
        <pattern id="hex" patternUnits="userSpaceOnUse" width="120" height="104">
          <polygon points="60,10 110,40 110,90 60,120 10,90 10,40" fill="none" stroke="${c.primary}" stroke-width="1.5" opacity="0.2"/>
          <circle cx="60" cy="65" r="5" fill="${c.accent}" opacity="0.3"/>
        </pattern>
      </defs>
      <rect width="1200" height="1600" fill="url(#hex)"/>
    `),
  },
  {
    id: 'bg_geometric_circles',
    name: 'Cercles Concentriques',
    description: 'Motif de cercles imbriqués',
    category: 'geometric',
    svgGenerator: (c) => createSVG(`
      <rect width="1200" height="1600" fill="${c.bg}"/>
      <circle cx="200" cy="200" r="100" fill="none" stroke="${c.primary}" stroke-width="2" opacity="0.15"/>
      <circle cx="200" cy="200" r="70" fill="none" stroke="${c.primary}" stroke-width="2" opacity="0.2"/>
      <circle cx="200" cy="200" r="40" fill="none" stroke="${c.primary}" stroke-width="2" opacity="0.25"/>
      <circle cx="1000" cy="1400" r="120" fill="none" stroke="${c.secondary}" stroke-width="2" opacity="0.12"/>
      <circle cx="1000" cy="1400" r="80" fill="none" stroke="${c.secondary}" stroke-width="2" opacity="0.15"/>
    `),
  },

  // ==================== ABSTRAIT ====================
  {
    id: 'bg_abstract_splatter',
    name: 'Éclaboussure Abstraite',
    description: 'Style éclaboussure artistique',
    category: 'abstract',
    svgGenerator: (c) => createSVG(`
      <rect width="1200" height="1600" fill="${c.bg}"/>
      <circle cx="250" cy="300" r="80" fill="${c.primary}" opacity="0.12"/>
      <circle cx="280" cy="280" r="50" fill="${c.accent}" opacity="0.15"/>
      <circle cx="200" cy="350" r="40" fill="${c.secondary}" opacity="0.1"/>
      <circle cx="850" cy="1200" r="100" fill="${c.secondary}" opacity="0.1"/>
      <circle cx="900" cy="1150" r="60" fill="${c.primary}" opacity="0.13"/>
      <path d="M 400 400 Q 500 300 600 400 T 800 400" stroke="${c.primary}" fill="none" stroke-width="4" opacity="0.08"/>
    `),
  },
  {
    id: 'bg_abstract_watercolor',
    name: 'Aquarelle Abstraite',
    description: 'Effet aquarelle doux',
    category: 'abstract',
    svgGenerator: (c) => createSVG(`
      <defs>
        <filter id="watercolor">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" seed="1"/>
          <feDisplacementMap in="SourceGraphic" scale="30"/>
        </filter>
      </defs>
      <rect width="1200" height="1600" fill="${c.bg}"/>
      <circle cx="300" cy="400" r="200" fill="${c.primary}" opacity="0.15" filter="url(#watercolor)"/>
      <circle cx="900" cy="1100" r="250" fill="${c.secondary}" opacity="0.12" filter="url(#watercolor)"/>
      <circle cx="600" cy="800" r="180" fill="${c.accent}" opacity="0.1" filter="url(#watercolor)"/>
    `),
  },
  {
    id: 'bg_abstract_flowing',
    name: 'Fluidité Abstraite',
    description: 'Courbes fluides et organiques',
    category: 'abstract',
    svgGenerator: (c) => createSVG(`
      <rect width="1200" height="1600" fill="${c.bg}"/>
      <path d="M 0 300 Q 300 200 600 300 T 1200 300" stroke="${c.primary}" stroke-width="3" fill="none" opacity="0.15"/>
      <path d="M 0 600 Q 300 700 600 600 T 1200 600" stroke="${c.secondary}" stroke-width="3" fill="none" opacity="0.12"/>
      <path d="M 0 1000 Q 300 900 600 1000 T 1200 1000" stroke="${c.accent}" stroke-width="3" fill="none" opacity="0.1"/>
      <path d="M 0 1400 Q 300 1500 600 1400 T 1200 1400" stroke="${c.primary}" stroke-width="3" fill="none" opacity="0.08"/>
    `),
  },

  // ==================== MINIMAL ====================
  {
    id: 'bg_minimal_blank',
    name: 'Blanc Pur',
    description: 'Fond blanc minimaliste',
    category: 'minimal',
    svgGenerator: (c) => createSVG(`
      <rect width="1200" height="1600" fill="${c.bg}"/>
    `),
  },
  {
    id: 'bg_minimal_accents',
    name: 'Accents Minimalistes',
    description: 'Touches de couleur discrètes',
    category: 'minimal',
    svgGenerator: (c) => createSVG(`
      <rect width="1200" height="1600" fill="${c.bg}"/>
      <rect x="0" y="0" width="10" height="1600" fill="${c.primary}" opacity="0.5"/>
      <rect x="1190" y="0" width="10" height="1600" fill="${c.secondary}" opacity="0.4"/>
      <rect x="0" y="0" width="1200" height="10" fill="${c.primary}" opacity="0.3"/>
      <rect x="0" y="1590" width="1200" height="10" fill="${c.secondary}" opacity="0.25"/>
    `),
  },
];

// Fonction utilitaire pour obtenir le fond par ID
export function getBackgroundById(id: string): PageBackground | undefined {
  return PAGE_BACKGROUNDS.find(bg => bg.id === id);
}

// Regrouper les fonds par catégorie
export function getBackgroundsByCategory(category: PageBackground['category']): PageBackground[] {
  return PAGE_BACKGROUNDS.filter(bg => bg.category === category);
}

// Obtenir tous les fonds pour la UI
export function getAllBackgrounds(): PageBackground[] {
  return PAGE_BACKGROUNDS;
}

export default PAGE_BACKGROUNDS;
