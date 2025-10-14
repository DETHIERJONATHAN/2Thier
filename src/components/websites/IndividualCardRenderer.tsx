/**
 * 🎴 IndividualCardRenderer - Affichage d'une carte configurée
 * 
 * Rend une carte selon sa configuration complète :
 * - Header avec badge, icône
 * - Contenu avec image
 * - Effets hover
 * - Footer avec bouton/lien
 */

import React from 'react';
import { Button } from 'antd';
import type { IndividualCardConfig } from './IndividualCardEditor';
import './IndividualCardRenderer.css';

export interface IndividualCardRendererProps {
  /**
   * Configuration de la carte
   */
  config: IndividualCardConfig;
  
  /**
   * Index de la carte (pour clé React)
   */
  index?: number;
  
  /**
   * Mode preview (désactive les clics)
   */
  preview?: boolean;
}

export const IndividualCardRenderer: React.FC<IndividualCardRendererProps> = ({
  config,
  index = 0,
  preview = false,
}) => {
  if (!config.isActive && config.isActive !== undefined) {
    return null;
  }

  /**
   * Génère le style de la carte
   */
  const getCardStyle = (): React.CSSProperties => {
    const style: React.CSSProperties = {};

    // Background
    if (config.style?.backgroundColor) {
      style.backgroundColor = config.style.backgroundColor;
    }

    if (config.style?.backgroundGradient?.enabled && config.style.backgroundGradient.from && config.style.backgroundGradient.to) {
      const direction = config.style.backgroundGradient.direction || 'to-bottom';
      style.background = `linear-gradient(${direction}, ${config.style.backgroundGradient.from}, ${config.style.backgroundGradient.to})`;
    }

    // Border
    if (config.style?.border?.enabled !== false) {
      style.border = `${config.style?.border?.width || 1}px ${config.style?.border?.style || 'solid'} ${config.style?.border?.color || '#e0e0e0'}`;
      style.borderRadius = `${config.style?.border?.radius || 8}px`;
    }

    // Shadow
    if (config.style?.shadow?.enabled !== false) {
      const x = config.style?.shadow?.x || 0;
      const y = config.style?.shadow?.y || 4;
      const blur = config.style?.shadow?.blur || 12;
      const spread = config.style?.shadow?.spread || 0;
      const color = config.style?.shadow?.color || 'rgba(0,0,0,0.1)';
      style.boxShadow = `${x}px ${y}px ${blur}px ${spread}px ${color}`;
    }

    // Dimensions
    if (config.style?.minHeight) {
      style.minHeight = `${config.style.minHeight}px`;
    }
    if (config.style?.maxWidth) {
      style.maxWidth = config.style.maxWidth;
    }

    // Grid Position
    if (config.gridPosition?.columnStart) {
      style.gridColumnStart = config.gridPosition.columnStart;
    }
    if (config.gridPosition?.columnEnd) {
      style.gridColumnEnd = `span ${config.gridPosition.columnEnd}`;
    }
    if (config.gridPosition?.rowStart) {
      style.gridRowStart = config.gridPosition.rowStart;
    }
    if (config.gridPosition?.rowEnd) {
      style.gridRowEnd = `span ${config.gridPosition.rowEnd}`;
    }
    if (config.gridPosition?.order !== undefined) {
      style.order = config.gridPosition.order;
    }
    if (config.gridPosition?.alignSelf) {
      style.alignSelf = config.gridPosition.alignSelf;
    }
    if (config.gridPosition?.justifySelf) {
      style.justifySelf = config.gridPosition.justifySelf;
    }

    return style;
  };

  /**
   * Génère les classes CSS
   */
  const getCardClasses = (): string => {
    const classes = ['individual-card'];
    
    if (config.style?.hover?.enabled !== false) {
      classes.push('individual-card--hoverable');
    }
    
    if (config.content?.image?.position === 'background') {
      classes.push('individual-card--image-background');
    }
    
    return classes.join(' ');
  };

  /**
   * Génère le style hover via CSS variables
   */
  const getHoverStyles = (): React.CSSProperties => {
    if (config.style?.hover?.enabled === false) return {};

    return {
      '--hover-scale': config.style?.hover?.scale || 1.02,
      '--hover-translate-y': `${config.style?.hover?.translateY || -4}px`,
      '--hover-shadow-intensity': config.style?.hover?.shadowIntensity || 1.5,
      '--hover-border-color': config.style?.hover?.borderColor || '#3b82f6',
    } as React.CSSProperties;
  };

  return (
    <div
      className={getCardClasses()}
      style={{ ...getCardStyle(), ...getHoverStyles() }}
      data-card-index={index}
    >
      {/* BADGE */}
      {config.header?.badge?.show && config.header.badge.text && (
        <div 
          className={`individual-card__badge individual-card__badge--${config.header.badge.position || 'top-right'}`}
          style={{
            backgroundColor: config.header.badge.color || '#3b82f6',
          }}
        >
          {config.header.badge.text}
        </div>
      )}

      {/* HEADER */}
      {config.header?.enabled !== false && config.header?.title && (
        <div
          className="individual-card__header"
          style={{
            backgroundColor: config.header.backgroundColor,
            padding: `${config.header.padding || 16}px`,
          }}
        >
          {config.header.icon && (
            <div
              className={`individual-card__header-icon individual-card__header-icon--${config.header.iconPosition || 'left'}`}
              style={{
                fontSize: `${config.header.iconSize || 24}px`,
                color: config.header.iconColor,
              }}
            >
              {config.header.icon.startsWith('http') ? (
                <img src={config.header.icon} alt="" style={{ width: config.header.iconSize || 24, height: config.header.iconSize || 24 }} />
              ) : (
                <span>{config.header.icon}</span>
              )}
            </div>
          )}
          <h3
            className={`individual-card__header-title individual-card__header-title--${config.header.titleSize || 'md'}`}
            style={{
              color: config.header.titleColor,
              fontWeight: config.header.titleWeight || 600,
            }}
          >
            {config.header.title}
          </h3>
        </div>
      )}

      {/* IMAGE (si position !== background) */}
      {config.content?.image?.url && config.content.image.position !== 'background' && (
        <div className={`individual-card__image individual-card__image--${config.content.image.position || 'top'}`}>
          <img
            src={config.content.image.url}
            alt={config.content.image.alt || ''}
            style={{
              objectFit: config.content.image.objectFit || 'cover',
              borderRadius: config.content.image.borderRadius ? `${config.content.image.borderRadius}px` : undefined,
              width: config.content.image.width || '100%',
              height: config.content.image.height || 'auto',
            }}
          />
        </div>
      )}

      {/* IMAGE BACKGROUND */}
      {config.content?.image?.url && config.content.image.position === 'background' && (
        <div
          className="individual-card__image-background"
          style={{
            backgroundImage: `url(${config.content.image.url})`,
            backgroundSize: config.content.image.objectFit || 'cover',
            backgroundPosition: 'center',
          }}
        >
          {config.content.image.overlay && (
            <div
              className="individual-card__image-overlay"
              style={{
                backgroundColor: `rgba(0, 0, 0, ${config.content.image.overlayOpacity || 0.5})`,
              }}
            />
          )}
        </div>
      )}

      {/* CONTENT */}
      <div
        className="individual-card__content"
        style={{
          padding: `${config.content?.padding || 24}px`,
          textAlign: config.content?.alignment || 'left',
        }}
      >
        {config.content?.title && (
          <h4
            className={`individual-card__title individual-card__title--${config.content.titleSize || 'lg'}`}
            style={{
              color: config.content.titleColor,
              fontWeight: config.content.titleWeight || 700,
            }}
          >
            {config.content.title}
          </h4>
        )}

        {config.content?.description && (
          <p
            className={`individual-card__description individual-card__description--${config.content.descriptionSize || 'md'}`}
            style={{
              color: config.content.descriptionColor,
            }}
          >
            {config.content.description}
          </p>
        )}
      </div>

      {/* FOOTER */}
      {config.footer?.enabled !== false && (config.footer?.button?.show || config.footer?.link?.show || config.footer?.additionalText) && (
        <div
          className="individual-card__footer"
          style={{
            backgroundColor: config.footer.backgroundColor,
            padding: `${config.footer.padding || 16}px`,
            color: config.footer.textColor,
          }}
        >
          {config.footer.button?.show && config.footer.button.text && (
            <Button
              type={config.footer.button.variant as any || 'primary'}
              href={!preview ? config.footer.button.url : undefined}
              block={config.footer.button.fullWidth}
              style={{ marginBottom: config.footer.link?.show ? 8 : 0 }}
            >
              {config.footer.button.text}
            </Button>
          )}

          {config.footer.link?.show && config.footer.link.text && (
            <a
              href={!preview ? config.footer.link.url : undefined}
              className="individual-card__footer-link"
              style={{ color: config.footer.textColor || '#3b82f6' }}
              onClick={(e) => preview && e.preventDefault()}
            >
              {config.footer.link.text}
            </a>
          )}

          {config.footer.additionalText && (
            <p className="individual-card__footer-text" style={{ color: config.footer.textColor }}>
              {config.footer.additionalText}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
