import React from 'react';
import { Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

interface HelpTooltipProps {
  type?: 'none' | 'text' | 'image' | 'both';
  text?: string | null;
  image?: string | null;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 💡 Composant HelpTooltip
 * 
 * Affiche un icône d'information (ℹ️) avec tooltip personnalisé
 * Supporte texte, image ou les deux
 */
export const HelpTooltip: React.FC<HelpTooltipProps> = ({
  type = 'none',
  text,
  image,
  className = '',
  style = {}
}) => {
  // Ne rien afficher si pas de tooltip configuré
  if (!type || type === 'none') {
    return null;
  }

  // Ne rien afficher si pas de contenu
  if (type === 'text' && !text) return null;
  if (type === 'image' && !image) return null;
  if (type === 'both' && !text && !image) return null;

  // Construire le contenu du tooltip
  const renderTooltipContent = () => {
    if (type === 'text') {
      return (
        <div style={{ maxWidth: 300 }}>
          {String(text)}
        </div>
      );
    }

    if (type === 'image') {
      return (
        <div style={{ maxWidth: 300 }}>
          <img
            src={String(image)}
            alt="Aide"
            style={{
              maxWidth: '100%',
              maxHeight: 200,
              objectFit: 'contain'
            }}
          />
        </div>
      );
    }

    if (type === 'both') {
      return (
        <div style={{ maxWidth: 300 }}>
          {text && (
            <div style={{ marginBottom: image ? 8 : 0 }}>
              {String(text)}
            </div>
          )}
          {image && (
            <img
              src={String(image)}
              alt="Aide"
              style={{
                maxWidth: '100%',
                maxHeight: 200,
                objectFit: 'contain'
              }}
            />
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <Tooltip
      title={renderTooltipContent()}
      placement="top"
      overlayStyle={{ maxWidth: 320 }}
    >
      <InfoCircleOutlined
        data-testid="help-tooltip"
        className={`help-tooltip-icon ${className}`}
        style={{
          color: '#1890ff',
          fontSize: '14px',
          marginLeft: '6px',
          cursor: 'help',
          opacity: 0.7,
          transition: 'opacity 0.2s',
          ...style
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLElement).style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLElement).style.opacity = '0.7';
        }}
      />
    </Tooltip>
  );
};

export default HelpTooltip;