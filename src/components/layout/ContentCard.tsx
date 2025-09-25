import React from 'react';
import { Card, Typography, Divider } from 'antd';

const { Title, Text } = Typography;

interface ContentCardProps {
  /**
   * Titre de la carte
   */
  title?: string;
  
  /**
   * Description ou sous-titre
   */
  description?: string;
  
  /**
   * Contenu de la carte
   */
  children: React.ReactNode;
  
  /**
   * Actions dans le header de la carte (boutons, etc.)
   */
  actions?: React.ReactNode;
  
  /**
   * Si true, supprime le padding interne
   */
  noPadding?: boolean;
  
  /**
   * Si true, ajoute une ombre plus prononcée
   */
  elevated?: boolean;
  
  /**
   * Classes CSS additionnelles
   */
  className?: string;
  
  /**
   * Si true, la carte utilise toute la hauteur disponible
   */
  fullHeight?: boolean;
  
  /**
   * Couleur de bordure personnalisée
   */
  borderColor?: string;
  
  /**
   * Si true, ajoute un loading state
   */
  loading?: boolean;
}

/**
 * Composant de carte de contenu standardisé
 * 
 * Fournit un design cohérent pour organiser le contenu des pages
 * Utilise Tailwind CSS et Ant Design
 */
export const ContentCard: React.FC<ContentCardProps> = ({
  title,
  description,
  children,
  actions,
  noPadding = false,
  elevated = false,
  className = '',
  fullHeight = false,
  borderColor,
  loading = false
}) => {
  const cardClasses = `
    ${elevated ? 'shadow-lg' : 'shadow-sm'}
    ${fullHeight ? 'h-full flex flex-col' : ''}
    ${borderColor ? `border-l-4` : ''}
    hover:shadow-md transition-shadow duration-200
    ${className}
  `;

  const cardStyle = borderColor ? { borderLeftColor: borderColor } : {};

  return (
    <Card
      className={cardClasses}
      style={cardStyle}
      styles={{
        body: {
          padding: noPadding ? 0 : '24px',
          height: fullHeight ? '100%' : 'auto',
          display: fullHeight ? 'flex' : 'block',
          flexDirection: fullHeight ? 'column' : undefined
        }
      }}
      loading={loading}
    >
      {/* Header avec titre et actions */}
      {(title || description || actions) && (
        <div className={`${noPadding ? 'px-6 pt-6' : ''} ${fullHeight ? 'flex-shrink-0' : ''}`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              {title && (
                <Title level={4} className="!text-gray-900 !mb-2 !text-lg !font-semibold">
                  {title}
                </Title>
              )}
              {description && (
                <Text className="text-gray-600 text-sm">
                  {description}
                </Text>
              )}
            </div>
            
            {actions && (
              <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                {actions}
              </div>
            )}
          </div>
          
          {(title || description) && <Divider className="!my-4" />}
        </div>
      )}
      
      {/* Contenu */}
      <div className={`
        ${noPadding && (title || description || actions) ? 'px-6 pb-6' : ''}
        ${fullHeight ? 'flex-1 overflow-auto' : ''}
      `}>
        {children}
      </div>
    </Card>
  );
};

export default ContentCard;
