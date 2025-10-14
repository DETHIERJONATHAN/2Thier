/**
 * 🎨 Utilitaires de conversion de couleurs
 * Convertit les couleurs en format hexadécimal pour compatibilité HTML5 color input
 */

/**
 * Convertit une couleur rgba en hexadécimal
 * @example rgbaToHex('rgba(255, 255, 255, 0.9)') → '#ffffff'
 */
export function rgbaToHex(rgba: string): string {
  // Extraire les valeurs RGB
  const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
  if (!match) return rgba;

  const [, r, g, b] = match.map(Number);
  
  // Convertir en hex
  const toHex = (n: number) => {
    const hex = n.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Dictionnaire des couleurs nommées vers hex
 */
const COLOR_NAMES: Record<string, string> = {
  // Couleurs de base
  white: '#ffffff',
  black: '#000000',
  red: '#ff0000',
  green: '#00ff00',
  blue: '#0000ff',
  yellow: '#ffff00',
  cyan: '#00ffff',
  magenta: '#ff00ff',
  
  // Couleurs communes
  gray: '#808080',
  grey: '#808080',
  silver: '#c0c0c0',
  maroon: '#800000',
  olive: '#808000',
  lime: '#00ff00',
  aqua: '#00ffff',
  teal: '#008080',
  navy: '#000080',
  fuchsia: '#ff00ff',
  purple: '#800080',
  
  // Couleurs étendues
  orange: '#ffa500',
  pink: '#ffc0cb',
  brown: '#a52a2a',
  gold: '#ffd700',
  violet: '#ee82ee',
  indigo: '#4b0082',
  
  // Nuances de gris
  lightgray: '#d3d3d3',
  lightgrey: '#d3d3d3',
  darkgray: '#a9a9a9',
  darkgrey: '#a9a9a9',
  
  // Transparent
  transparent: '#00000000'
};

/**
 * Convertit un nom de couleur en hexadécimal
 * @example namedColorToHex('white') → '#ffffff'
 */
export function namedColorToHex(colorName: string): string {
  const normalized = colorName.toLowerCase().trim();
  return COLOR_NAMES[normalized] || colorName;
}

/**
 * Nettoie et convertit n'importe quelle couleur en format hex valide
 * Gère : hex, rgb, rgba, noms de couleurs, valeurs vides
 * @example cleanColor('rgba(255,255,255,0.9)') → '#ffffff'
 * @example cleanColor('white') → '#ffffff'
 * @example cleanColor('') → '#ffffff' (défaut)
 */
export function cleanColor(color?: string, defaultColor: string = '#ffffff'): string {
  // Valeur vide ou undefined
  if (!color || color.trim() === '') {
    return defaultColor;
  }

  const trimmedColor = color.trim();

  // Déjà en format hex valide
  if (/^#[0-9A-Fa-f]{6}$/.test(trimmedColor)) {
    return trimmedColor;
  }

  // Format rgba ou rgb
  if (trimmedColor.startsWith('rgba') || trimmedColor.startsWith('rgb')) {
    return rgbaToHex(trimmedColor);
  }

  // Nom de couleur
  if (COLOR_NAMES[trimmedColor.toLowerCase()]) {
    return namedColorToHex(trimmedColor);
  }

  // Format hex sans # ou invalide
  if (/^[0-9A-Fa-f]{6}$/.test(trimmedColor)) {
    return `#${trimmedColor}`;
  }

  // Si tout échoue, retourner la couleur par défaut
  console.warn(`⚠️ Couleur invalide: "${color}", utilisation de ${defaultColor}`);
  return defaultColor;
}

/**
 * Vérifie si une couleur est au format hex valide
 */
export function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Convertit un hex en rgba
 * @example hexToRgba('#ffffff', 0.5) → 'rgba(255, 255, 255, 0.5)'
 */
export function hexToRgba(hex: string, alpha: number = 1): string {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Génère une palette de couleurs harmonieuses à partir d'une couleur de base
 */
export function generateColorPalette(baseColor: string): {
  primary: string;
  lighter: string;
  darker: string;
  complementary: string;
  analogous1: string;
  analogous2: string;
} {
  const hex = cleanColor(baseColor);
  const r = parseInt(hex.substring(1, 3), 16);
  const g = parseInt(hex.substring(3, 5), 16);
  const b = parseInt(hex.substring(5, 7), 16);

  // Convertir RGB en HSL pour manipulations
  const [h, s, l] = rgbToHsl(r, g, b);

  return {
    primary: hex,
    lighter: hslToHex(h, s, Math.min(l + 20, 100)),
    darker: hslToHex(h, s, Math.max(l - 20, 0)),
    complementary: hslToHex((h + 180) % 360, s, l),
    analogous1: hslToHex((h + 30) % 360, s, l),
    analogous2: hslToHex((h - 30 + 360) % 360, s, l)
  };
}

/**
 * Convertit RGB en HSL
 */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

/**
 * Convertit HSL en hex
 */
function hslToHex(h: number, s: number, l: number): string {
  h /= 360;
  s /= 100;
  l /= 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
