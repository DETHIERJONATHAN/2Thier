import React from 'react';
import { Typography, Breadcrumb } from 'antd';
import type { BreadcrumbItemType } from 'antd/es/breadcrumb/Breadcrumb';

const { Title } = Typography;

interface PageContainerProps {
  /**
   * Titre principal de la page
   */
  title?: string;
  
  /**
   * Sous-titre ou description de la page
   */
  subtitle?: string;
  
  /**
   * Breadcrumb items pour la navigation
   */
  breadcrumb?: BreadcrumbItemType[];
  
  /**
   * Contenu de la page
   */
  children: React.ReactNode;
  
  /**
   * Actions à afficher dans le header (boutons, etc.)
   */
  actions?: React.ReactNode;
  
  /**
   * Si true, utilise tout l'espace disponible (height: full)
   */
  fullHeight?: boolean;
  
  /**
   * Si true, supprime le padding par défaut
   */
  noPadding?: boolean;
  
  /**
   * Classes CSS additionnelles
   */
  className?: string;
  
  /**
   * Background personnalisé (par défaut: bg-gray-50)
   */
  background?: string;
}

/**
 * Composant de container standardisé pour toutes les pages du CRM
 * 
 * Utilise tout l'espace disponible entre le header et le sidebar
 * Fournit une mise en page cohérente avec Tailwind CSS
 */
export const PageContainer: React.FC<PageContainerProps> = ({
  title,
  subtitle,
  breadcrumb,
  children,
  actions,
  fullHeight = true,
  noPadding = false,
  className = '',
  background = 'bg-gray-50'
}) => {
  return (
    <div 
      className={`
        flex flex-col
        ${fullHeight ? 'h-full' : 'min-h-full'}
        ${background}
        ${className}
      `}
    >
      {/* Header de page avec titre, breadcrumb et actions */}
      {(title || breadcrumb || actions) && (
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {/* Breadcrumb */}
              {breadcrumb && breadcrumb.length > 0 && (
                <div className="mb-2">
                  <Breadcrumb 
                    items={breadcrumb}
                    className="text-sm text-gray-600"
                  />
                </div>
              )}
              
              {/* Titre principal */}
              {title && (
                <Title 
                  level={2} 
                  className="!text-gray-900 !mb-1 !text-2xl !font-bold"
                >
                  {title}
                </Title>
              )}
              
              {/* Sous-titre */}
              {subtitle && (
                <p className="text-gray-600 text-base mt-1 mb-0">
                  {subtitle}
                </p>
              )}
            </div>
            
            {/* Actions */}
            {actions && (
              <div className="flex items-center gap-3 ml-6 flex-shrink-0">
                {actions}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Contenu principal - Utilise tout l'espace restant */}
      <div 
        className={`
          flex-1 overflow-auto
          ${noPadding ? '' : 'p-6'}
        `}
      >
        <div className={`${fullHeight ? 'h-full' : 'min-h-full'}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default PageContainer;
