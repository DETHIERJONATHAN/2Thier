/**
 * 📋 SectionHeaderRenderer - Rendu du header de section
 * Affiche le titre, sous-titre, description, badge selon la configuration
 */

import React from 'react';
import { SectionHeaderConfig } from './SectionHeaderEditor';
import './SectionHeaderRenderer.css';

interface SectionHeaderRendererProps {
  config: SectionHeaderConfig;
  className?: string;
  style?: React.CSSProperties;
}

const SIZE_MAP = {
  xs: '0.75rem',
  sm: '0.875rem',
  md: '1rem',
  lg: '1.125rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
  '3xl': '1.875rem'
};

export const SectionHeaderRenderer: React.FC<SectionHeaderRendererProps> = ({
  config,
  className = '',
  style = {}
}) => {
  if (!config.enabled) {
    return null;
  }

  const headerStyle: React.CSSProperties = {
    textAlign: config.alignment,
    marginBottom: `${config.spacing}px`,
    paddingTop: `${config.paddingTop}px`,
    paddingBottom: `${config.paddingBottom}px`,
    backgroundColor: config.backgroundColor || 'transparent',
    ...style
  };

  const titleStyle: React.CSSProperties = {
    fontSize: SIZE_MAP[config.titleSize],
    fontWeight: config.titleWeight,
    color: config.titleColor,
    margin: 0,
    marginBottom: config.subtitle || config.description ? '0.5rem' : 0
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: SIZE_MAP[config.subtitleSize],
    color: config.subtitleColor,
    margin: 0,
    marginBottom: config.description ? '1rem' : 0
  };

  const descriptionStyle: React.CSSProperties = {
    color: config.descriptionColor,
    maxWidth: `${config.descriptionMaxWidth}px`,
    margin: config.alignment === 'center' ? '0 auto' : config.alignment === 'right' ? '0 0 0 auto' : '0',
    lineHeight: 1.6
  };

  const badgeStyle: React.CSSProperties = {
    backgroundColor: config.badgeColor,
    color: '#fff',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: 600,
    display: 'inline-block',
    marginBottom: '1rem'
  };

  const dividerStyle: React.CSSProperties = {
    width: `${config.dividerWidth}px`,
    height: '2px',
    backgroundColor: config.dividerColor,
    margin: config.alignment === 'center' ? '1.5rem auto 0' : config.alignment === 'right' ? '1.5rem 0 0 auto' : '1.5rem 0 0 0',
    borderStyle: config.dividerStyle === 'gradient' ? 'none' : config.dividerStyle,
    background: config.dividerStyle === 'gradient' 
      ? `linear-gradient(90deg, transparent, ${config.dividerColor}, transparent)` 
      : config.dividerColor
  };

  return (
    <div className={`section-header ${className}`} style={headerStyle}>
      {/* Badge */}
      {config.showBadge && config.badgeText && (
        <div style={badgeStyle}>
          {config.badgeText}
        </div>
      )}

      {/* Titre */}
      {config.title && (
        <h2 className="section-header-title" style={titleStyle}>
          {config.title}
        </h2>
      )}

      {/* Sous-titre */}
      {config.subtitle && (
        <p className="section-header-subtitle" style={subtitleStyle}>
          {config.subtitle}
        </p>
      )}

      {/* Description */}
      {config.description && (
        <p className="section-header-description" style={descriptionStyle}>
          {config.description}
        </p>
      )}

      {/* Séparateur */}
      {config.showDivider && (
        <div className="section-header-divider" style={dividerStyle} />
      )}
    </div>
  );
};

export default SectionHeaderRenderer;
