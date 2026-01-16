/**
 * 🎨 DOCUMENT THEMES - 8 Thèmes Professionnels Prédéfinis
 * Chaque thème peut être appliqué à n'importe quel template de document
 * Complètement INTERCHANGEABLE
 */

export interface DocumentTheme {
  id: string;
  name: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  backgroundColor: string;
  headerBgColor: string;
  footerBgColor: string;
  fontFamily: string;
  fontSize: number;
  logoUrl?: string;
  headerSvg: string; // SVG background pour header
  footerSvg: string; // SVG background pour footer
  customStyles?: Record<string, any>;
}

/**
 * 🟠 Theme 1: PROFESSIONAL ORANGE
 * Couleurs: Orange vibrant + Bleu marine
 * Design moderne avec vagues géométriques
 */
export const THEME_PROFESSIONAL_ORANGE: DocumentTheme = {
  id: 'theme_professional_orange',
  name: 'Professional Orange',
  description: 'Design moderne avec orange vibrant et bleu marine',
  primaryColor: '#FF8C00',
  secondaryColor: '#1C3A4F',
  accentColor: '#FFA500',
  textColor: '#333333',
  backgroundColor: '#FFFFFF',
  headerBgColor: '#1C3A4F',
  footerBgColor: '#FF8C00',
  fontFamily: '"Poppins", "Segoe UI", sans-serif',
  fontSize: 12,
  headerSvg: `
    <svg viewBox="0 0 1200 200" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#1C3A4F;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#0F2A3B;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect fill="url(#grad1)" width="1200" height="200"/>
      <path d="M0,100 Q300,50 600,100 T1200,100 L1200,0 L0,0 Z" fill="#FF8C00" opacity="0.1"/>
      <path d="M0,120 Q400,80 800,120 T1200,120 L1200,200 L0,200 Z" fill="#FFA500" opacity="0.05"/>
    </svg>
  `,
  footerSvg: `
    <svg viewBox="0 0 1200 100" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="footGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#FF8C00;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#FF6700;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect fill="url(#footGrad1)" width="1200" height="100"/>
      <path d="M0,50 Q300,30 600,50 T1200,50 L1200,0 L0,0 Z" fill="#1C3A4F" opacity="0.1"/>
    </svg>
  `,
  customStyles: {
    headerPadding: '30px',
    footerPadding: '20px',
    moduleSpacing: '15px',
  },
};

/**
 * 🟢 Theme 2: FRESH GREEN
 * Couleurs: Vert frais + Blanc minimaliste
 * Design écologique et moderne
 */
export const THEME_FRESH_GREEN: DocumentTheme = {
  id: 'theme_fresh_green',
  name: 'Fresh Green',
  description: 'Design écologique avec vert frais et blanc minimaliste',
  primaryColor: '#10B981',
  secondaryColor: '#059669',
  accentColor: '#34D399',
  textColor: '#111827',
  backgroundColor: '#FFFFFF',
  headerBgColor: '#10B981',
  footerBgColor: '#059669',
  fontFamily: '"Inter", "Helvetica Neue", sans-serif',
  fontSize: 12,
  headerSvg: `
    <svg viewBox="0 0 1200 200" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gradGreen" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#10B981;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#059669;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect fill="url(#gradGreen)" width="1200" height="200"/>
      <circle cx="200" cy="50" r="80" fill="#34D399" opacity="0.1"/>
      <circle cx="1000" cy="150" r="100" fill="#34D399" opacity="0.08"/>
      <path d="M0,180 Q300,150 600,180 T1200,180 L1200,200 L0,200 Z" fill="#F0FDF4" opacity="0.15"/>
    </svg>
  `,
  footerSvg: `
    <svg viewBox="0 0 1200 100" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="footGreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#059669;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#047857;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect fill="url(#footGreenGrad)" width="1200" height="100"/>
      <path d="M0,0 Q300,40 600,0 T1200,0 L1200,100 L0,100 Z" fill="#F0FDF4" opacity="0.1"/>
    </svg>
  `,
  customStyles: {
    headerPadding: '35px',
    footerPadding: '25px',
  },
};

/**
 * 🔵 Theme 3: CORPORATE BLUE
 * Couleurs: Bleu corporatif + Gris élégant
 * Design professionnel et confiant
 */
export const THEME_CORPORATE_BLUE: DocumentTheme = {
  id: 'theme_corporate_blue',
  name: 'Corporate Blue',
  description: 'Design corporatif avec bleu professionnel et gris élégant',
  primaryColor: '#2563EB',
  secondaryColor: '#1E40AF',
  accentColor: '#3B82F6',
  textColor: '#1F2937',
  backgroundColor: '#FFFFFF',
  headerBgColor: '#1E40AF',
  footerBgColor: '#111827',
  fontFamily: '"Roboto", "Arial", sans-serif',
  fontSize: 11,
  headerSvg: `
    <svg viewBox="0 0 1200 200" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gradBlue" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#1E40AF;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#1E3A8A;stop-opacity:1" />
        </linearGradient>
        <pattern id="dots" patternUnits="userSpaceOnUse" width="40" height="40">
          <circle cx="20" cy="20" r="2" fill="#3B82F6" opacity="0.3"/>
        </pattern>
      </defs>
      <rect fill="url(#gradBlue)" width="1200" height="200"/>
      <rect width="1200" height="200" fill="url(#dots)"/>
      <path d="M0,150 L1200,100 L1200,200 L0,200 Z" fill="#3B82F6" opacity="0.1"/>
    </svg>
  `,
  footerSvg: `
    <svg viewBox="0 0 1200 100" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <rect fill="#111827" width="1200" height="100"/>
      <path d="M0,0 L1200,30 L1200,100 L0,100 Z" fill="#1E40AF" opacity="0.2"/>
    </svg>
  `,
  customStyles: {
    headerPadding: '32px',
    footerPadding: '22px',
    borderColor: '#E5E7EB',
  },
};

/**
 * 🔴 Theme 4: ELEGANT RED
 * Couleurs: Rouge élégant + Noir + Or
 * Design luxe et premium
 */
export const THEME_ELEGANT_RED: DocumentTheme = {
  id: 'theme_elegant_red',
  name: 'Elegant Red',
  description: 'Design luxe avec rouge élégant et accents or',
  primaryColor: '#DC2626',
  secondaryColor: '#111827',
  accentColor: '#F59E0B',
  textColor: '#1F2937',
  backgroundColor: '#FFFFFF',
  headerBgColor: '#111827',
  footerBgColor: '#DC2626',
  fontFamily: '"Georgia", "Garamond", serif',
  fontSize: 12,
  headerSvg: `
    <svg viewBox="0 0 1200 200" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gradRed" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#111827;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#1F2937;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect fill="url(#gradRed)" width="1200" height="200"/>
      <line x1="0" y1="180" x2="1200" y2="180" stroke="#F59E0B" stroke-width="3" opacity="0.6"/>
      <line x1="0" y1="185" x2="1200" y2="185" stroke="#DC2626" stroke-width="2" opacity="0.4"/>
      <rect x="0" y="190" width="1200" height="10" fill="#F59E0B" opacity="0.15"/>
    </svg>
  `,
  footerSvg: `
    <svg viewBox="0 0 1200 100" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="footRedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#DC2626;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#991B1B;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect fill="url(#footRedGrad)" width="1200" height="100"/>
      <line x1="0" y1="0" x2="1200" y2="0" stroke="#F59E0B" stroke-width="2" opacity="0.8"/>
    </svg>
  `,
  customStyles: {
    headerPadding: '40px',
    footerPadding: '20px',
  },
};

/**
 * 🟣 Theme 5: MODERN PURPLE
 * Couleurs: Violet moderne + Blanc pur
 * Design créatif et trendy
 */
export const THEME_MODERN_PURPLE: DocumentTheme = {
  id: 'theme_modern_purple',
  name: 'Modern Purple',
  description: 'Design créatif avec violet moderne et blanc pur',
  primaryColor: '#7C3AED',
  secondaryColor: '#5B21B6',
  accentColor: '#A78BFA',
  textColor: '#1F2937',
  backgroundColor: '#FFFFFF',
  headerBgColor: '#7C3AED',
  footerBgColor: '#5B21B6',
  fontFamily: '"Quicksand", "Nunito", sans-serif',
  fontSize: 12,
  headerSvg: `
    <svg viewBox="0 0 1200 200" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gradPurple" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#7C3AED;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#6D28D9;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect fill="url(#gradPurple)" width="1200" height="200"/>
      <circle cx="150" cy="100" r="70" fill="#A78BFA" opacity="0.15"/>
      <circle cx="1050" cy="80" r="90" fill="#A78BFA" opacity="0.12"/>
      <path d="M0,160 Q300,130 600,160 T1200,160 L1200,200 L0,200 Z" fill="#A78BFA" opacity="0.2"/>
    </svg>
  `,
  footerSvg: `
    <svg viewBox="0 0 1200 100" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="footPurpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#5B21B6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#4C1D95;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect fill="url(#footPurpleGrad)" width="1200" height="100"/>
      <path d="M0,30 Q300,10 600,30 T1200,30 L1200,0 L0,0 Z" fill="#A78BFA" opacity="0.2"/>
    </svg>
  `,
  customStyles: {
    headerPadding: '33px',
    footerPadding: '23px',
  },
};

/**
 * 🟡 Theme 6: MINIMAL YELLOW
 * Couleurs: Or/Jaune + Noir minimaliste
 * Design épuré et chic
 */
export const THEME_MINIMAL_YELLOW: DocumentTheme = {
  id: 'theme_minimal_yellow',
  name: 'Minimal Yellow',
  description: 'Design épuré avec or/jaune et noir minimaliste',
  primaryColor: '#F59E0B',
  secondaryColor: '#1F2937',
  accentColor: '#FBBF24',
  textColor: '#111827',
  backgroundColor: '#FFFFFF',
  headerBgColor: '#1F2937',
  footerBgColor: '#F59E0B',
  fontFamily: '"Montserrat", "Lato", sans-serif',
  fontSize: 11,
  headerSvg: `
    <svg viewBox="0 0 1200 200" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <rect fill="#1F2937" width="1200" height="200"/>
      <rect x="0" y="190" width="1200" height="10" fill="#F59E0B"/>
      <circle cx="100" cy="50" r="40" fill="#F59E0B" opacity="0.1"/>
      <circle cx="1100" cy="150" r="50" fill="#FBBF24" opacity="0.08"/>
    </svg>
  `,
  footerSvg: `
    <svg viewBox="0 0 1200 100" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="footYellowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#F59E0B;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#D97706;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect fill="url(#footYellowGrad)" width="1200" height="100"/>
      <path d="M0,10 Q300,0 600,10 T1200,10 L1200,0 L0,0 Z" fill="#1F2937" opacity="0.1"/>
    </svg>
  `,
  customStyles: {
    headerPadding: '30px',
    footerPadding: '20px',
  },
};

/**
 * ⚫ Theme 7: LUXURY DARK
 * Couleurs: Noir profond + Or luxe
 * Design premium et sophistiqué
 */
export const THEME_LUXURY_DARK: DocumentTheme = {
  id: 'theme_luxury_dark',
  name: 'Luxury Dark',
  description: 'Design premium avec noir profond et or luxe',
  primaryColor: '#0F0F0F',
  secondaryColor: '#1A1A1A',
  accentColor: '#D4AF37',
  textColor: '#FFFFFF',
  backgroundColor: '#FAFAF8',
  headerBgColor: '#0F0F0F',
  footerBgColor: '#1A1A1A',
  fontFamily: '"Playfair Display", "Serif", serif',
  fontSize: 13,
  headerSvg: `
    <svg viewBox="0 0 1200 200" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <rect fill="#0F0F0F" width="1200" height="200"/>
      <line x1="0" y1="185" x2="1200" y2="185" stroke="#D4AF37" stroke-width="2"/>
      <line x1="50" y1="50" x2="150" y2="50" stroke="#D4AF37" stroke-width="1" opacity="0.5"/>
      <line x1="1050" y1="150" x2="1150" y2="150" stroke="#D4AF37" stroke-width="1" opacity="0.5"/>
    </svg>
  `,
  footerSvg: `
    <svg viewBox="0 0 1200 100" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <rect fill="#1A1A1A" width="1200" height="100"/>
      <line x1="0" y1="0" x2="1200" y2="0" stroke="#D4AF37" stroke-width="2"/>
      <line x1="0" y1="100" x2="1200" y2="100" stroke="#D4AF37" stroke-width="1" opacity="0.3"/>
    </svg>
  `,
  customStyles: {
    headerPadding: '45px',
    footerPadding: '25px',
  },
};

/**
 * 🩵 Theme 8: TECH CYAN
 * Couleurs: Cyan technologique + Noir futuriste
 * Design high-tech et innovant
 */
export const THEME_TECH_CYAN: DocumentTheme = {
  id: 'theme_tech_cyan',
  name: 'Tech Cyan',
  description: 'Design high-tech avec cyan futuriste et noir',
  primaryColor: '#06B6D4',
  secondaryColor: '#0C4A6E',
  accentColor: '#22D3EE',
  textColor: '#0F172A',
  backgroundColor: '#FFFFFF',
  headerBgColor: '#0C4A6E',
  footerBgColor: '#06B6D4',
  fontFamily: '"JetBrains Mono", "Courier New", monospace',
  fontSize: 11,
  headerSvg: `
    <svg viewBox="0 0 1200 200" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gradCyan" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#0C4A6E;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#06B6D4;stop-opacity:0.3" />
        </linearGradient>
      </defs>
      <rect fill="#0C4A6E" width="1200" height="200"/>
      <rect fill="url(#gradCyan)" width="1200" height="200" opacity="0.5"/>
      <path d="M0,50 L50,50 L100,100 L150,50 L1200,50 L1200,0 L0,0 Z" stroke="#22D3EE" stroke-width="2" fill="none"/>
      <circle cx="200" cy="150" r="30" fill="#22D3EE" opacity="0.1"/>
      <circle cx="1000" cy="100" r="40" fill="#22D3EE" opacity="0.08"/>
    </svg>
  `,
  footerSvg: `
    <svg viewBox="0 0 1200 100" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="footCyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#06B6D4;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#0891B2;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect fill="url(#footCyanGrad)" width="1200" height="100"/>
      <path d="M0,0 Q300,20 600,0 T1200,0 L1200,30 L0,30 Z" fill="#0C4A6E" opacity="0.2"/>
    </svg>
  `,
  customStyles: {
    headerPadding: '31px',
    footerPadding: '21px',
  },
};

/**
 * Collection de tous les thèmes
 */
export const ALL_THEMES: DocumentTheme[] = [
  THEME_PROFESSIONAL_ORANGE,
  THEME_FRESH_GREEN,
  THEME_CORPORATE_BLUE,
  THEME_ELEGANT_RED,
  THEME_MODERN_PURPLE,
  THEME_MINIMAL_YELLOW,
  THEME_LUXURY_DARK,
  THEME_TECH_CYAN,
];

/**
 * Fonction pour obtenir un thème par ID
 */
export function getThemeById(themeId: string): DocumentTheme | undefined {
  return ALL_THEMES.find((theme) => theme.id === themeId);
}

/**
 * Fonction pour obtenir tous les thèmes formatés pour l'UI
 */
export function getThemesForUI() {
  return ALL_THEMES.map((theme) => ({
    id: theme.id,
    name: theme.name,
    description: theme.description,
    primaryColor: theme.primaryColor,
    secondaryColor: theme.secondaryColor,
  }));
}
