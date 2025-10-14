/**
 * 🎨 GridRenderer - Composant de rendu de grille dynamique
 * Affiche les éléments selon la configuration de layout
 */

import React from 'react';
import { GridLayoutConfig } from './GridLayoutEditor';
import './GridRenderer.css';

interface GridRendererProps {
  config: GridLayoutConfig;
  items: React.ReactNode[];
  className?: string;
  style?: React.CSSProperties;
  itemClassName?: string;
  itemStyle?: React.CSSProperties;
}

export const GridRenderer: React.FC<GridRendererProps> = ({
  config,
  items,
  className = '',
  style = {},
  itemClassName = '',
  itemStyle = {}
}) => {
  // Générer le style CSS Grid
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${config.columns}, 1fr)`,
    gridTemplateRows: config.rows ? `repeat(${config.rows}, auto)` : 'auto',
    gap: `${config.gap}px`,
    alignItems: config.alignment,
    justifyContent: config.justifyContent,
    gridAutoFlow: config.autoFlow || 'row',
    maxWidth: config.maxWidth || '100%',
    margin: '0 auto',
    ...style
  };

  // Variables CSS pour le responsive
  const cssVariables = {
    '--grid-mobile-cols': config.responsive.mobile,
    '--grid-tablet-cols': config.responsive.tablet,
    '--grid-desktop-cols': config.responsive.desktop,
    '--grid-gap': `${config.gap}px`,
    '--grid-min-height': config.minHeight ? `${config.minHeight}px` : 'auto'
  } as React.CSSProperties;

  return (
    <div
      className={`grid-layout grid-responsive ${className}`}
      style={{ ...gridStyle, ...cssVariables }}
    >
      {items.map((item, index) => (
        <div
          key={index}
          className={`grid-item ${itemClassName}`}
          style={{
            minHeight: config.minHeight || 'auto',
            ...itemStyle
          }}
        >
          {item}
        </div>
      ))}
    </div>
  );
};

/**
 * Hook pour gérer un layout de grille dans un composant
 */
export function useGridLayout(initialConfig: GridLayoutConfig) {
  const [layout, setLayout] = React.useState<GridLayoutConfig>(initialConfig);

  const updateLayout = (updates: Partial<GridLayoutConfig>) => {
    setLayout(prev => ({ ...prev, ...updates }));
  };

  const resetLayout = () => {
    setLayout(initialConfig);
  };

  return {
    layout,
    setLayout,
    updateLayout,
    resetLayout
  };
}

export default GridRenderer;
