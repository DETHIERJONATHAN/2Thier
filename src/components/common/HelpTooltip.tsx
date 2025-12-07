import React, { useState } from 'react';
import { InfoCircleOutlined } from '@ant-design/icons';
import { useImageModal } from './ImageModal';

/**
 * 🚨 ATTENTION: CECI EST LE FICHIER TOOLTIP PRINCIPAL ! 🚨
 * 
 * Ce fichier gère les tooltips avec l'icône ℹ️ que vous voyez dans l'interface.
 * C'est ICI qu'il faut modifier les tooltips, PAS dans TBLFieldRendererAdvanced !
 * 
 * Localisation: src/components/common/HelpTooltip.tsx
 * Utilisation: Tooltips avec icône d'information dans les formulaires TBL
 * Fonctionnalité: Click pour ouvrir images/texte en plein écran
 */

interface HelpTooltipProps {
  type?: 'none' | 'text' | 'image' | 'both';
  text?: string | null;
  image?: string | null;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 💡 Composant HelpTooltip CLICKABLE - VERSION FINALE
 * 
 * ✅ Affiche un icône d'information (ℹ️) avec tooltip personnalisé
 * ✅ Supporte texte cliquable, image cliquable ou les deux ensemble
 * ✅ Les images s'ouvrent en plein écran quand on clique dessus
 * ✅ Le texte s'affiche en plein écran avec mise en forme
 * ✅ Mode "both" = clic n'importe où = texte + image ensemble
 * 
 * 🔧 MODIFICATIONS FUTURES: Faites-les dans CE fichier !
 */
export const HelpTooltip: React.FC<HelpTooltipProps> = ({
  type = 'none',
  text,
  image,
  className = '',
  style = {}
}) => {
  // 🏷️ ÉTAT LOCAL - Gestion de l'affichage du tooltip personnalisé
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  
  // 🖼️ MODAL PLEIN ÉCRAN - Hook pour ouvrir images/texte en grand
  const { openModal, ImageModalComponent } = useImageModal();

  // Ne rien afficher si pas de tooltip configuré
  if (!type || type === 'none') {
    return null;
  }

  // Ne rien afficher si pas de contenu
  if (type === 'text' && !text) return null;
  if (type === 'image' && !image) return null;
  if (type === 'both' && !text && !image) return null;

  // 🐭 GESTION ÉVÉNEMENTS SOURIS - Show/Hide du tooltip personnalisé
  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    });
    setIsTooltipVisible(true);
  };

  const handleMouseLeave = () => {
    setIsTooltipVisible(false);
  };

  const handleImageClick = (imageSrc: string) => {
    console.log('🖼️ CLIC SUR IMAGE TOOLTIP!', imageSrc);
    setIsTooltipVisible(false);
    openModal(imageSrc, 'Image d\'aide', 'Aide');
  };

  // 🚀 FONCTION PRINCIPALE - Clic sur le contenu pour ouvrir en plein écran
  const handleContentClick = () => {
    console.log('🖼️📝 CLIC SUR CONTENU TOOLTIP COMPLET!');
    setIsTooltipVisible(false);
    
    // Si on a juste une image, l'ouvrir directement
    if (type === 'image' && image) {
      openModal(String(image), 'Image d\'aide', 'Aide');
      return;
    }
    
    // Si on a juste du texte ou texte + image, créer un canvas combiné
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Configurer la taille du canvas
      canvas.width = 1000;
      let canvasHeight = 100; // Marge de départ
      
      // Calculer la hauteur nécessaire pour le texte
      if (text) {
        const words = String(text).split(' ');
        const maxWidth = canvas.width - 80;
        ctx.font = '24px Arial, sans-serif';
        let lines = 1;
        let line = '';
        
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && n > 0) {
            lines++;
            line = words[n] + ' ';
          } else {
            line = testLine;
          }
        }
        canvasHeight += lines * 35 + 40; // 35px par ligne + marge
      }
      
      // Si on a une image, ajouter de la place pour elle
      if (image) {
        canvasHeight += 400; // Place pour l'image
      }
      
      canvas.height = canvasHeight;
      
      // Fond blanc
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      let currentY = 40;
      
      // Dessiner le texte en premier
      if (text) {
        ctx.fillStyle = '#000000';
        ctx.font = '24px Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        const words = String(text).split(' ');
        let line = '';
        const lineHeight = 35;
        const maxWidth = canvas.width - 80;
        
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && n > 0) {
            ctx.fillText(line, 40, currentY);
            line = words[n] + ' ';
            currentY += lineHeight;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, 40, currentY);
        currentY += lineHeight + 20; // Espace après le texte
      }
      
      // Dessiner l'image ensuite
      if (image) {
        const img = new Image();
        img.onload = () => {
          // Calculer les dimensions pour que l'image tienne dans l'espace restant
          const maxImgWidth = canvas.width - 80;
          const maxImgHeight = 350;
          let imgWidth = img.width;
          let imgHeight = img.height;
          
          if (imgWidth > maxImgWidth) {
            imgHeight = (imgHeight * maxImgWidth) / imgWidth;
            imgWidth = maxImgWidth;
          }
          if (imgHeight > maxImgHeight) {
            imgWidth = (imgWidth * maxImgHeight) / imgHeight;
            imgHeight = maxImgHeight;
          }
          
          // Centrer l'image
          const imgX = (canvas.width - imgWidth) / 2;
          ctx.drawImage(img, imgX, currentY, imgWidth, imgHeight);
          
          // Convertir en image et ouvrir la modal
          const dataURL = canvas.toDataURL();
          openModal(dataURL, 'Aide complète', 'Aide');
        };
        img.src = String(image);
      } else {
        // Pas d'image, juste convertir le texte
        const dataURL = canvas.toDataURL();
        openModal(dataURL, 'Aide complète', 'Aide');
      }
    }
  };

  // 🎨 RENDU DU CONTENU - Construction du JSX selon le type (text/image/both)
  const renderTooltipContent = () => {
    if (type === 'text') {
      return (
        <div 
          style={{ 
            maxWidth: 300,
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            transition: 'background-color 0.2s ease'
          }}
          onClick={(e) => {
            e.stopPropagation();
            handleContentClick();
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          {String(text)}
          <div style={{ 
            fontSize: '11px', 
            color: '#ccc', 
            textAlign: 'center', 
            marginTop: '4px',
            fontStyle: 'italic'
          }}>
            🔍 Cliquez pour agrandir
          </div>
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
              objectFit: 'contain',
              cursor: 'pointer',
              transition: 'transform 0.2s ease'
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleContentClick();
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          />
          <div style={{ 
            fontSize: '11px', 
            color: '#ccc', 
            textAlign: 'center', 
            marginTop: '4px',
            fontStyle: 'italic'
          }}>
            🔍 Cliquez pour agrandir
          </div>
        </div>
      );
    }

    if (type === 'both') {
      return (
        <div 
          style={{ 
            maxWidth: 300,
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '6px',
            transition: 'background-color 0.2s ease',
            border: '1px dashed rgba(255,255,255,0.3)'
          }}
          onClick={(e) => {
            e.stopPropagation();
            handleContentClick();
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          {text && (
            <div 
              style={{ 
                marginBottom: image ? 8 : 0
              }}
            >
              {String(text)}
            </div>
          )}
          {image && (
            <div>
              <img
                src={String(image)}
                alt="Aide"
                style={{
                  maxWidth: '100%',
                  maxHeight: 200,
                  objectFit: 'contain',
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease'
                }}
              />
            </div>
          )}
          <div style={{ 
            fontSize: '11px', 
            color: '#ccc', 
            textAlign: 'center', 
            marginTop: '8px',
            fontStyle: 'italic',
            borderTop: '1px dashed rgba(255,255,255,0.2)',
            paddingTop: '6px'
          }}>
            🔍📝 Cliquez n'importe où pour voir en grand
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <div style={{ position: 'relative', display: 'inline-block' }}>
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
            handleMouseEnter(e);
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.opacity = '0.7';
            handleMouseLeave();
          }}
        />
        
        {isTooltipVisible && (
          <div
            style={{
              position: 'fixed',
              left: tooltipPosition.x,
              top: tooltipPosition.y,
              transform: 'translate(-50%, -100%)',
              backgroundColor: '#000',
              color: 'white',
              padding: '12px',
              borderRadius: '6px',
              fontSize: '14px',
              zIndex: 10000,
              maxWidth: '320px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              pointerEvents: 'auto'
            }}
            onMouseEnter={() => setIsTooltipVisible(true)}
            onMouseLeave={handleMouseLeave}
          >
            {renderTooltipContent()}
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: '6px solid #000'
              }}
            />
          </div>
        )}
      </div>
      <ImageModalComponent />
    </>
  );
};

export default HelpTooltip;