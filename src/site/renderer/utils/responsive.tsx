/**
 * 🎨 RESPONSIVE UTILITIES
 * 
 * Helpers pour générer des styles et des classes CSS responsive
 * en fonction des configurations de grille et de colonnes.
 * 
 * @author 2Thier CRM Team
 */

export interface ResponsiveGridConfig {
  mobile: number;    // < 576px
  tablet: number;    // 576px - 991px
  desktop: number;   // >= 992px
}

/**
 * 🎯 Génère les classes CSS pour une grille responsive
 * 
 * @param columns Configuration des colonnes par breakpoint
 * @returns String de classes CSS
 */
export const getResponsiveGridClass = (columns: ResponsiveGridConfig): string => {
  return 'responsive-grid';
};

/**
 * 🎯 Génère les styles inline pour une grille responsive
 * 
 * @param columns Configuration des colonnes par breakpoint
 * @param gap Espacement entre les éléments
 * @returns Object de styles CSS
 */
export const getResponsiveGridStyle = (
  columns: ResponsiveGridConfig,
  gap: string = '20px'
): React.CSSProperties => {
  return {
    display: 'grid',
    gap: gap,
    gridTemplateColumns: `repeat(${columns.mobile}, 1fr)`,
    // Les media queries seront gérées par le CSS global
  };
};

/**
 * 🎯 Génère un padding responsive
 * 
 * @param size Taille ('small', 'medium', 'large')
 * @returns String de padding CSS
 */
export const getResponsivePadding = (size: 'small' | 'medium' | 'large' = 'medium'): string => {
  const sizes = {
    small: 'clamp(20px, 4vw, 40px) clamp(16px, 3vw, 24px)',
    medium: 'clamp(40px, 6vw, 80px) clamp(16px, 4vw, 32px)',
    large: 'clamp(60px, 8vw, 120px) clamp(16px, 4vw, 40px)'
  };
  
  return sizes[size];
};

/**
 * 🎯 Génère une font-size responsive
 * 
 * @param minSize Taille minimale (mobile)
 * @param maxSize Taille maximale (desktop)
 * @param viewport Viewport size pour le calcul (défaut: 4vw)
 * @returns String CSS clamp()
 */
export const getResponsiveFontSize = (
  minSize: number,
  maxSize: number,
  viewport: string = '4vw'
): string => {
  return `clamp(${minSize}px, ${viewport}, ${maxSize}px)`;
};

/**
 * 🎯 Génère un espacement responsive
 * 
 * @param minGap Gap minimum (mobile)
 * @param maxGap Gap maximum (desktop)
 * @returns String CSS clamp()
 */
export const getResponsiveGap = (minGap: number, maxGap: number): string => {
  return `clamp(${minGap}px, 3vw, ${maxGap}px)`;
};

/**
 * 🎯 Classes CSS pour différentes configurations de colonnes
 */
export const GRID_CLASSES = {
  services: 'responsive-grid cols-sm-2 cols-md-2 cols-lg-3',
  stats: 'responsive-grid cols-sm-2 cols-md-2 cols-lg-4',
  testimonials: 'responsive-grid cols-sm-1 cols-md-2 cols-lg-3',
  values: 'responsive-grid cols-sm-2 cols-md-2 cols-lg-4',
  projects: 'responsive-grid cols-sm-1 cols-md-2 cols-lg-4',
  footer: 'footer-columns'
};
