import { Empty } from 'antd';
import { DocumentGlobalTheme } from '../Documents/DocumentGlobalThemeEditor';

interface PDFPreviewProps {
  sections: any[];
  theme?: any;
  globalTheme?: DocumentGlobalTheme;
}

const PDFPreview = ({ sections, theme, globalTheme }: PDFPreviewProps) => {
  console.log('[PDFPreview] Rendering with sections:', sections);
  console.log('[PDFPreview] Global theme:', globalTheme);
  
  // Fonction helper pour calculer la position du logo
  const getLogoPosition = (position: string, x?: number, y?: number) => {
    // Si position custom ET que X/Y sont définis, utiliser SEULEMENT X/Y
    if (position === 'custom' && (x !== undefined || y !== undefined)) {
      return {
        position: 'absolute' as const,
        top: y !== undefined ? y : 30,
        left: x !== undefined ? x : 30
      };
    }
    
    // Sinon utiliser les positions préréglées
    const positions: Record<string, any> = {
      'top-left': { position: 'absolute' as const, top: 30, left: 30 },
      'top-center': { position: 'absolute' as const, top: 30, left: '50%', transform: 'translateX(-50%)' },
      'top-right': { position: 'absolute' as const, top: 30, right: 30 },
      'middle-left': { position: 'absolute' as const, top: '50%', left: 30, transform: 'translateY(-50%)' },
      'center': { position: 'absolute' as const, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
      'middle-right': { position: 'absolute' as const, top: '50%', right: 30, transform: 'translateY(-50%)' },
      'bottom-left': { position: 'absolute' as const, bottom: 30, left: 30 },
      'bottom-center': { position: 'absolute' as const, bottom: 30, left: '50%', transform: 'translateX(-50%)' },
      'bottom-right': { position: 'absolute' as const, bottom: 30, right: 30 }
    };
    
    // Si pas de position définie, retourner un objet vide (pas de positionnement absolu)
    return positions[position] || {};
  };
  
  if (sections.length === 0) {
    return (
      <Empty 
        description="Aucune section à prévisualiser" 
        style={{ padding: '60px 20px' }}
      />
    );
  }

  // Fusion du thème ancien et du nouveau thème global
  const themeStyles = globalTheme || theme ? {
    primaryColor: globalTheme?.primaryColor || theme?.primaryColor || '#1890ff',
    secondaryColor: globalTheme?.secondaryColor || theme?.secondaryColor || '#52c41a',
    accentColor: globalTheme?.accentColor || '#faad14',
    textColor: globalTheme?.textColor || theme?.textColor || '#000000',
    backgroundColor: globalTheme?.backgroundColor || theme?.backgroundColor || '#ffffff',
    fontFamily: globalTheme?.fontFamily || theme?.fontFamily || 'Arial, sans-serif',
    fontSize: globalTheme?.fontSize || theme?.fontSize || 11,
    lineHeight: globalTheme?.lineHeight || 1.6,
    borderRadius: globalTheme?.borderRadius || 8,
    shadowIntensity: globalTheme?.shadowIntensity || 'medium'
  } : {
    primaryColor: '#1890ff',
    secondaryColor: '#52c41a',
    accentColor: '#faad14',
    textColor: '#000000',
    backgroundColor: '#ffffff',
    fontFamily: 'Arial, sans-serif',
    fontSize: 11,
    lineHeight: 1.6,
    borderRadius: 8,
    shadowIntensity: 'medium'
  };

  // Fonction pour obtenir l'ombre selon l'intensité
  const getShadow = () => {
    switch (themeStyles.shadowIntensity) {
      case 'none': return 'none';
      case 'light': return '0 2px 6px rgba(0,0,0,0.05)';
      case 'medium': return '0 4px 12px rgba(0,0,0,0.08)';
      case 'strong': return '0 8px 24px rgba(0,0,0,0.15)';
      default: return '0 4px 12px rgba(0,0,0,0.08)';
    }
  };

  // Vérifier si un élément est masqué
  const isElementHidden = (section: any, fieldName: string): boolean => {
    return section.config?._fieldStyles?.[fieldName]?.hidden === true;
  };

  // Style de base pour les champs avec style personnalisé
  const getFieldStyle = (section: any, fieldName: string) => {
    const customStyle = section.config?._fieldStyles?.[fieldName];
    if (!customStyle) return {};
    
    const style: any = {};
    
    // Appliquer UNIQUEMENT les propriétés définies dans customStyle
    if (customStyle.fontFamily) style.fontFamily = customStyle.fontFamily;
    if (customStyle.fontSize) style.fontSize = `${customStyle.fontSize}px`;
    if (customStyle.fontWeight) style.fontWeight = customStyle.fontWeight;
    if (customStyle.color) style.color = customStyle.color;
    if (customStyle.backgroundColor) style.backgroundColor = customStyle.backgroundColor;
    if (customStyle.textAlign) style.textAlign = customStyle.textAlign;
    if (customStyle.fontStyle) style.fontStyle = customStyle.fontStyle;
    if (customStyle.textDecoration) style.textDecoration = customStyle.textDecoration;
    if (customStyle.textTransform) style.textTransform = customStyle.textTransform;
    if (customStyle.letterSpacing !== undefined) style.letterSpacing = `${customStyle.letterSpacing}px`;
    if (customStyle.lineHeight) style.lineHeight = customStyle.lineHeight;
    
    // Appliquer les styles de position si définis
    if (customStyle.position) {
      const positionStyles = getLogoPosition(customStyle.position, customStyle.x, customStyle.y);
      Object.assign(style, positionStyles);
    }
    
    return style;
  };

  // Obtenir les styles basés sur la variante visuelle sélectionnée
  const getVariantStyles = (sectionType: string, variant: string = 'modern'): any => {
    console.log(`[PDFPreview] Applying variant '${variant}' for section type '${sectionType}'`);
    
    // Styles pour COVER_PAGE
    if (sectionType === 'COVER_PAGE') {
      switch (variant) {
        case 'modern':
          return {
            titleSize: '56px',
            titleWeight: 'bold',
            titleTransform: 'none' as const,
            titleLetterSpacing: '2px',
            subtitleSize: '24px',
            backgroundColor: '#f0f2f5',
            textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
            dateStyle: { 
              backgroundColor: '#1890ff', 
              color: 'white', 
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '500',
              border: 'none'
            }
          };
        case 'classic':
          return {
            titleSize: '48px',
            titleWeight: '600',
            titleTransform: 'uppercase' as const,
            titleLetterSpacing: '4px',
            subtitleSize: '20px',
            backgroundColor: '#ffffff',
            textShadow: 'none',
            dateStyle: { 
              backgroundColor: 'transparent', 
              color: '#000', 
              border: '2px solid #000', 
              borderRadius: '0',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '600',
              textTransform: 'uppercase' as const
            }
          };
        case 'minimal':
          return {
            titleSize: '64px',
            titleWeight: '300',
            titleTransform: 'none' as const,
            titleLetterSpacing: '0px',
            subtitleSize: '18px',
            backgroundColor: '#ffffff',
            textShadow: 'none',
            dateStyle: { 
              backgroundColor: 'transparent', 
              color: '#8c8c8c', 
              borderRadius: '0',
              padding: '10px 0',
              fontSize: '14px',
              fontWeight: '400',
              border: 'none',
              borderBottom: '1px solid #d9d9d9'
            }
          };
        case 'bold':
          return {
            titleSize: '72px',
            titleWeight: '900',
            titleTransform: 'uppercase' as const,
            titleLetterSpacing: '6px',
            subtitleSize: '28px',
            backgroundColor: '#000000',
            textShadow: '4px 4px 8px rgba(0,0,0,0.3)',
            dateStyle: { 
              backgroundColor: '#ffeb3b', 
              color: '#000', 
              borderRadius: '0', 
              fontWeight: 'bold',
              padding: '16px 32px',
              fontSize: '18px',
              border: '4px solid #000',
              textTransform: 'uppercase' as const
            }
          };
        case 'corporate':
          return {
            titleSize: '52px',
            titleWeight: '600',
            titleTransform: 'none' as const,
            titleLetterSpacing: '1px',
            subtitleSize: '22px',
            backgroundColor: '#001529',
            textShadow: 'none',
            dateStyle: { 
              backgroundColor: '#1890ff', 
              color: 'white', 
              borderRadius: '4px',
              padding: '10px 20px',
              fontSize: '15px',
              fontWeight: '500',
              border: '1px solid #0050b3'
            }
          };
        case 'creative':
          return {
            titleSize: '60px',
            titleWeight: 'bold',
            titleTransform: 'none' as const,
            titleLetterSpacing: '3px',
            subtitleSize: '26px',
            backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            textShadow: '3px 3px 6px rgba(0,0,0,0.4)',
            dateStyle: { 
              backgroundColor: 'rgba(255,255,255,0.2)', 
              color: 'white', 
              borderRadius: '20px', 
              backdropFilter: 'blur(10px)',
              padding: '14px 28px',
              fontSize: '16px',
              fontWeight: '600',
              border: '1px solid rgba(255,255,255,0.3)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }
          };
        default:
          return {
            titleSize: '56px',
            titleWeight: 'bold',
            titleTransform: 'none' as const,
            titleLetterSpacing: '2px',
            subtitleSize: '24px',
            backgroundColor: '#f0f2f5',
            textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
            dateStyle: { 
              backgroundColor: '#1890ff', 
              color: 'white', 
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '500',
              border: 'none'
            }
          };
      }
    }

    // Retour par défaut pour autres types de sections
    return {};
  };

  const renderSection = (section: any, index: number) => {
    const config = section.config || {};
    console.log(`[PDFPreview] Rendering section ${index} (${section.type}):`, config);
    console.log(`[PDFPreview] Section ${index} - companyImage:`, config.companyImage);
    console.log(`[PDFPreview] Section ${index} - backgroundImage:`, config.backgroundImage);
    console.log(`[PDFPreview] Section ${index} - styleVariant:`, config.styleVariant);
    console.log(`[PDFPreview] Section ${index} - _fieldStyles:`, config._fieldStyles);

    // Récupérer les styles de variante
    const variantStyles = getVariantStyles(section.type, config.styleVariant || 'modern');
    console.log(`[PDFPreview] Section ${index} - Variant styles applied:`, variantStyles);
    
    switch (section.type) {
      case 'COVER_PAGE':
        // Déterminer la couleur de fond selon la variante
        const bgColor = config.backgroundImage 
          ? 'transparent' 
          : (variantStyles.backgroundColor || themeStyles.backgroundColor);
        const isGradient = typeof bgColor === 'string' && bgColor.includes('gradient');
        
        // Styles du background image
        const bgImageStyles = config._fieldStyles?.backgroundImage;
        const bgImageUrl = (config.backgroundImage && !config.backgroundImage.includes('fakepath') && config.backgroundImage.startsWith('http')) 
          ? config.backgroundImage 
          : null;
        
        return (
          <div
            style={{
              padding: '60px 40px',
              ...(isGradient 
                ? { background: bgColor } 
                : { backgroundColor: bgColor }),
              backgroundImage: bgImageUrl ? `url(${bgImageUrl})` : 'none',
              backgroundSize: bgImageStyles?.objectFit === 'contain' ? 'contain' : 
                             bgImageStyles?.objectFit === 'fill' ? '100% 100%' : 'cover',
              backgroundPosition: bgImageStyles?.position === 'custom' 
                ? `${bgImageStyles.x || 0}px ${bgImageStyles.y || 0}px`
                : bgImageStyles?.position?.includes('top') ? 'top' :
                  bgImageStyles?.position?.includes('bottom') ? 'bottom' :
                  bgImageStyles?.position?.includes('center') || bgImageStyles?.position?.includes('middle') ? 'center' : 'center',
              backgroundRepeat: 'no-repeat',
              opacity: bgImageStyles?.opacity !== undefined ? bgImageStyles.opacity : 1,
              width: '100%',
              height: '1122px', // Hauteur A4 (297mm en pixels à 96 DPI)
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Logo entreprise */}
            {config.companyImage && !config.companyImage.includes('fakepath') && config.companyImage.startsWith('http') && !isElementHidden(section, 'companyImage') && (
              <div 
                onMouseDown={(e) => section._onElementDragStart?.('companyImage', e)}
                onMouseEnter={() => section._onElementHover?.('companyImage')}
                onMouseLeave={() => section._onElementHover?.(null)}
                style={{ 
                  marginBottom: section._interactive ? 0 : '40px',
                  zIndex: section._draggingElement === 'companyImage' ? 1000 : 10,
                  cursor: section._interactive ? (section._draggingElement === 'companyImage' ? 'grabbing' : 'grab') : 'default',
                  outline: (section._hoveredElement === 'companyImage' || section._selectedElement === 'companyImage') ? '2px dashed #1890ff' : 'none',
                  outlineOffset: '8px',
                  borderRadius: (section._hoveredElement === 'companyImage' || section._selectedElement === 'companyImage') ? '6px' : 0,
                  backgroundColor: (section._hoveredElement === 'companyImage' || section._selectedElement === 'companyImage') ? 'rgba(24, 144, 255, 0.05)' : 'transparent',
                  position: 'relative',
                  transition: section._draggingElement === 'companyImage' ? 'none' : 'all 0.2s ease',
                  opacity: section._draggingElement === 'companyImage' ? 0.8 : 1,
                  boxShadow: section._draggingElement === 'companyImage' ? '0 8px 24px rgba(24, 144, 255, 0.3)' : 'none',
                  ...getLogoPosition(
                    config._fieldStyles?.companyImage?.position || config.logoPosition || 'top-left',
                    config._fieldStyles?.companyImage?.x,
                    config._fieldStyles?.companyImage?.y
                  )
                }}>
                {(section._hoveredElement === 'companyImage' || section._selectedElement === 'companyImage') && (
                  <>
                    <div style={{
                      position: 'absolute',
                      top: '-26px',
                      left: '0',
                      backgroundColor: '#1890ff',
                      color: 'white',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      pointerEvents: 'auto',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <span style={{ pointerEvents: 'none' }}>🖼️ Logo</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          section._onElementDelete?.('companyImage');
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        style={{
                          backgroundColor: '#ff4d4f',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          padding: '2px 5px',
                          fontSize: '10px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Masquer cet élément"
                      >
                        🗑️
                      </button>
                    </div>
                    {/* Poignée de redimensionnement */}
                    <div 
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        section._onElementResizeStart?.('companyImage', e, {
                          width: config._fieldStyles?.companyImage?.maxWidth || 250,
                          height: config._fieldStyles?.companyImage?.maxHeight || 100
                        });
                      }}
                      style={{
                        position: 'absolute',
                        bottom: '-4px',
                        right: '-4px',
                        width: '16px',
                        height: '16px',
                        backgroundColor: '#1890ff',
                        border: '2px solid white',
                        borderRadius: '50%',
                        cursor: 'nwse-resize',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                        zIndex: 1001
                      }}
                    />
                  </>
                )}
                <img 
                  src={config.companyImage} 
                  alt="Logo" 
                  onLoad={() => {
                    console.log('[PDFPreview] ✅ Logo chargé avec succès:', config.companyImage);
                  }}
                  onError={(e) => {
                    console.error('[PDFPreview] ❌ Erreur chargement logo:', config.companyImage);
                  }}
                  style={{ 
                    maxHeight: config._fieldStyles?.companyImage?.maxHeight || 100, 
                    maxWidth: config._fieldStyles?.companyImage?.maxWidth || 250, 
                    objectFit: config._fieldStyles?.companyImage?.objectFit || 'contain',
                    opacity: config._fieldStyles?.companyImage?.opacity || 1,
                    pointerEvents: 'none',
                    display: 'block'
                  }}
                />
              </div>
            )}

            {/* Titre principal */}
            {!isElementHidden(section, 'title.fr') && (
            <div 
              onMouseDown={(e) => section._onElementDragStart?.('title.fr', e)}
              onMouseEnter={() => section._onElementHover?.('title.fr')}
              onMouseLeave={() => section._onElementHover?.(null)}
              style={{
                // Styles de base
                fontSize: variantStyles.titleSize || '56px', 
                fontWeight: variantStyles.titleWeight || 'bold',
                textTransform: variantStyles.titleTransform || 'none',
                letterSpacing: variantStyles.titleLetterSpacing || '2px',
                color: themeStyles.primaryColor,
                fontFamily: themeStyles.fontFamily,
                margin: section._interactive ? '0' : '30px 0',
                textShadow: config.backgroundImage ? '3px 3px 6px rgba(0,0,0,0.4)' : (variantStyles.textShadow || 'none'),
                wordBreak: 'break-word',
                maxWidth: '90%',
                
                // Position relative par défaut pour le label flottant
                position: section._interactive ? 'relative' : undefined,
                
                // Styles interactifs (priorité haute)
                zIndex: section._draggingElement === 'title.fr' ? 1000 : (section._interactive ? 10 : undefined),
                cursor: section._interactive ? (section._draggingElement === 'title.fr' ? 'grabbing' : 'grab') : 'default',
                outline: (section._hoveredElement === 'title.fr' || section._selectedElement === 'title.fr') ? '2px dashed #1890ff' : 'none',
                outlineOffset: '8px',
                borderRadius: (section._hoveredElement === 'title.fr' || section._selectedElement === 'title.fr') ? '6px' : 0,
                backgroundColor: (section._hoveredElement === 'title.fr' || section._selectedElement === 'title.fr') ? 'rgba(24, 144, 255, 0.05)' : 'transparent',
                transition: section._draggingElement === 'title.fr' ? 'none' : 'all 0.2s ease',
                opacity: section._draggingElement === 'title.fr' ? 0.8 : 1,
                boxShadow: section._draggingElement === 'title.fr' ? '0 8px 24px rgba(24, 144, 255, 0.3)' : 'none',
                
                // Appliquer les styles personnalisés (incluant position custom) - DOIT ÉCRASER position si custom
                ...getFieldStyle(section, 'title.fr')
              }}>
              {(section._hoveredElement === 'title.fr' || section._selectedElement === 'title.fr') && (
                <>
                  <div style={{
                    position: 'absolute',
                    top: '-26px',
                    left: '0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span style={{
                      backgroundColor: '#1890ff',
                      color: 'white',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                    }}>
                      📝 Titre
                    </span>
                    {/* Bouton Supprimer */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        section._onElementDelete?.('title.fr');
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      style={{
                        backgroundColor: '#ff4d4f',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                      }}
                      title="Masquer cet élément"
                    >
                      🗑️
                    </button>
                  </div>
                  {/* Poignée de redimensionnement pour le texte */}
                  <div 
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      section._onElementResizeStart?.('title.fr', e, {
                        fontSize: config._fieldStyles?.['title.fr']?.fontSize || parseInt(variantStyles.titleSize) || 56
                      });
                    }}
                    style={{
                      position: 'absolute',
                      bottom: '-4px',
                      right: '-4px',
                      width: '16px',
                      height: '16px',
                      backgroundColor: '#52c41a',
                      border: '2px solid white',
                      borderRadius: '50%',
                      cursor: 'ns-resize',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                      zIndex: 1001
                    }}
                  />
                </>
              )}
              {typeof config.title === 'string' ? config.title : (config.title?.fr || 'Titre de Votre Document')}
            </div>
            )}

            {/* Sous-titre */}
            {config.subtitle && !isElementHidden(section, 'subtitle') && (
              <div 
                onMouseDown={(e) => section._onElementDragStart?.('subtitle', e)}
                onMouseEnter={() => section._onElementHover?.('subtitle')}
                onMouseLeave={() => section._onElementHover?.(null)}
                style={{
                  // Styles de base
                  fontSize: variantStyles.subtitleSize || '24px', 
                  color: config.backgroundImage ? '#ffffff' : themeStyles.textColor,
                  fontFamily: themeStyles.fontFamily,
                  textShadow: config.backgroundImage ? '2px 2px 4px rgba(0,0,0,0.5)' : 'none',
                  margin: section._interactive ? '0' : '15px 0',
                  maxWidth: '80%',
                  fontWeight: '300',
                  
                  // Position relative par défaut pour le label flottant
                  position: section._interactive ? 'relative' : undefined,
                  
                  // Styles interactifs
                  zIndex: section._draggingElement === 'subtitle' ? 1000 : (section._interactive ? 10 : undefined),
                  cursor: section._interactive ? (section._draggingElement === 'subtitle' ? 'grabbing' : 'grab') : 'default',
                  outline: (section._hoveredElement === 'subtitle' || section._selectedElement === 'subtitle') ? '2px dashed #1890ff' : 'none',
                  outlineOffset: '8px',
                  borderRadius: (section._hoveredElement === 'subtitle' || section._selectedElement === 'subtitle') ? '6px' : 0,
                  backgroundColor: (section._hoveredElement === 'subtitle' || section._selectedElement === 'subtitle') ? 'rgba(24, 144, 255, 0.05)' : 'transparent',
                  transition: section._draggingElement === 'subtitle' ? 'none' : 'all 0.2s ease',
                  opacity: section._draggingElement === 'subtitle' ? 0.8 : 1,
                  boxShadow: section._draggingElement === 'subtitle' ? '0 8px 24px rgba(24, 144, 255, 0.3)' : 'none',
                  
                  // Appliquer les styles personnalisés (incluant position custom) - DOIT ÉCRASER position si custom
                  ...getFieldStyle(section, 'subtitle')
                }}>
                {(section._hoveredElement === 'subtitle' || section._selectedElement === 'subtitle') && (
                  <div style={{
                    position: 'absolute',
                    top: '-26px',
                    left: '0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span style={{
                      backgroundColor: '#1890ff',
                      color: 'white',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                    }}>
                      💬 Sous-titre
                    </span>
                    {/* Bouton Supprimer */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        section._onElementDelete?.('subtitle');
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      style={{
                        backgroundColor: '#ff4d4f',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                      }}
                      title="Masquer cet élément"
                    >
                      🗑️
                    </button>
                  </div>
                )}
                {config.subtitle}
              </div>
            )}

            {/* Date */}
            {config.showDate && !isElementHidden(section, 'showDate') && (
              <div 
                onMouseDown={(e) => section._onElementDragStart?.('showDate', e)}
                onMouseEnter={() => section._onElementHover?.('showDate')}
                onMouseLeave={() => section._onElementHover?.(null)}
                style={{
                  // Styles de base
                  marginTop: section._interactive ? '0' : '40px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  ...(variantStyles.dateStyle || {
                    backgroundColor: '#1890ff',
                    color: 'white',
                    borderRadius: '8px',
                    padding: '12px 24px',
                    fontSize: '16px',
                    fontWeight: '500'
                  }),
                  
                  // Position relative par défaut pour le label flottant
                  position: section._interactive ? 'relative' : undefined,
                  
                  // Styles interactifs
                  zIndex: section._draggingElement === 'showDate' ? 1000 : (section._interactive ? 10 : undefined),
                  cursor: section._interactive ? (section._draggingElement === 'showDate' ? 'grabbing' : 'grab') : 'default',
                  outline: (section._hoveredElement === 'showDate' || section._selectedElement === 'showDate') ? '2px dashed #1890ff' : 'none',
                  outlineOffset: '8px',
                  transition: section._draggingElement === 'showDate' ? 'none' : 'all 0.2s ease',
                  opacity: section._draggingElement === 'showDate' ? 0.8 : 1,
                  boxShadow: section._draggingElement === 'showDate' ? '0 8px 24px rgba(24, 144, 255, 0.3)' : 'none',
                  
                  // Appliquer les styles personnalisés (incluant position custom) - DOIT ÉCRASER position si custom
                  ...getFieldStyle(section, 'showDate')
                }}>
                {(section._hoveredElement === 'showDate' || section._selectedElement === 'showDate') && (
                  <>
                    <div style={{
                      position: 'absolute',
                      top: '-26px',
                      left: '0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <span style={{
                        backgroundColor: '#1890ff',
                        color: 'white',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                      }}>
                        📅 Date
                      </span>
                      {/* Bouton Supprimer */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          section._onElementDelete?.('showDate');
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        style={{
                          backgroundColor: '#ff4d4f',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                        }}
                        title="Masquer cet élément"
                      >
                        🗑️
                      </button>
                    </div>
                    {/* Poignée de redimensionnement */}
                    <div 
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        section._onElementResizeStart?.('showDate', e, {
                          fontSize: config._fieldStyles?.showDate?.fontSize || 16
                        });
                      }}
                      style={{
                        position: 'absolute',
                        bottom: '-4px',
                        right: '-4px',
                        width: '16px',
                        height: '16px',
                        backgroundColor: '#52c41a',
                        border: '2px solid white',
                        borderRadius: '50%',
                        cursor: 'ns-resize',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                        zIndex: 1001
                      }}
                    />
                  </>
                )}
                📅 {new Date().toLocaleDateString('fr-FR', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            )}
          </div>
        );

      case 'COMPANY_PRESENTATION':
        return (
          <div style={{ padding: '40px', fontFamily: themeStyles.fontFamily }}>
            <h2 style={{ 
              color: themeStyles.primaryColor,
              fontSize: '28px',
              marginBottom: '25px',
              borderLeft: `6px solid ${themeStyles.secondaryColor}`,
              paddingLeft: '15px'
            }}>
              {config.sectionTitle || 'À PROPOS DE NOUS'}
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
              <div>
                <p style={{ fontSize: '14px', lineHeight: '1.8', color: themeStyles.textColor }}>
                  {config.description?.fr || 'Nous sommes une entreprise leader dans notre domaine, forte de 10 ans d\'expérience et d\'une équipe passionnée. Notre expertise nous permet de vous offrir des solutions innovantes et sur mesure.'}
                </p>
                
                {config.showStats && (
                  <div style={{ 
                    marginTop: '30px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '20px'
                  }}>
                    {[
                      { value: '10+', label: 'Années d\'expérience' },
                      { value: '250+', label: 'Projets réalisés' },
                      { value: '98%', label: 'Clients satisfaits' }
                    ].map((stat, i) => (
                      <div key={i} style={{ textAlign: 'center', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: themeStyles.primaryColor }}>
                          {stat.value}
                        </div>
                        <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '8px' }}>
                          {stat.label}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {config.companyImage && !config.companyImage.includes('fakepath') && config.companyImage.startsWith('http') && (
                <div style={{ 
                  textAlign: 'center',
                  ...getLogoPosition(
                    config._fieldStyles?.companyImage?.position || 'center',
                    config._fieldStyles?.companyImage?.x,
                    config._fieldStyles?.companyImage?.y
                  )
                }}>
                  <img 
                    src={config.companyImage} 
                    alt="Entreprise" 
                    style={{ 
                      maxWidth: config._fieldStyles?.companyImage?.maxWidth || '100%',
                      maxHeight: config._fieldStyles?.companyImage?.maxHeight || 'auto',
                      objectFit: config._fieldStyles?.companyImage?.objectFit || 'contain',
                      opacity: config._fieldStyles?.companyImage?.opacity || 1,
                      borderRadius: '8px', 
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        );

      case 'PRICING_TABLE':
        return (
          <div style={{ padding: '40px', fontFamily: themeStyles.fontFamily }}>
            <h2 style={{ 
              color: themeStyles.primaryColor,
              fontSize: '28px',
              marginBottom: '30px',
              borderBottom: `4px solid ${themeStyles.secondaryColor}`,
              paddingBottom: '12px',
              textTransform: 'uppercase',
              letterSpacing: '1.5px'
            }}>
              💰 {typeof config.tableTitle === 'string' ? config.tableTitle : (config.tableTitle?.fr || 'DÉTAIL DES PRIX')}
            </h2>

            {/* Tableau professionnel */}
            <table style={{ 
              width: '100%', 
              borderCollapse: 'separate',
              borderSpacing: '0',
              marginBottom: '40px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              <thead>
                <tr style={{ backgroundColor: themeStyles.primaryColor }}>
                  <th style={{ padding: '18px', textAlign: 'left', color: '#ffffff', fontWeight: 'bold', fontSize: '14px' }}>
                    DÉSIGNATION
                  </th>
                  <th style={{ padding: '18px', textAlign: 'center', color: '#ffffff', fontWeight: 'bold', fontSize: '14px', width: '100px' }}>
                    QTÉ
                  </th>
                  <th style={{ padding: '18px', textAlign: 'right', color: '#ffffff', fontWeight: 'bold', fontSize: '14px', width: '130px' }}>
                    P.U. HT
                  </th>
                  <th style={{ padding: '18px', textAlign: 'right', color: '#ffffff', fontWeight: 'bold', fontSize: '14px', width: '150px' }}>
                    TOTAL HT
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Afficher les items du config OU des exemples si pas de données */}
                {(config.items && config.items.length > 0) ? (
                  config.items.map((item: any, idx: number) => (
                    <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa', borderBottom: '1px solid #e8e8e8' }}>
                      <td style={{ padding: '18px' }}>
                        <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '4px', ...getFieldStyle(section, `items.${idx}.description`) }}>
                          {item.description || item.name || 'Article'}
                        </div>
                        {item.details && (
                          <div style={{ color: '#8c8c8c', fontSize: '11px' }}>
                            {item.details}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '18px', textAlign: 'center', fontSize: '13px' }}>{item.quantity || 1}</td>
                      <td style={{ padding: '18px', textAlign: 'right', fontSize: '13px', fontWeight: '500' }}>
                        {item.unitPrice ? `${item.unitPrice.toFixed(2)} €` : '0,00 €'}
                      </td>
                      <td style={{ padding: '18px', textAlign: 'right', fontSize: '14px', fontWeight: 'bold', color: themeStyles.primaryColor }}>
                        {item.total ? `${item.total.toFixed(2)} €` : ((item.quantity || 1) * (item.unitPrice || 0)).toFixed(2) + ' €'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <>
                    <tr style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e8e8e8' }}>
                      <td style={{ padding: '18px' }}>
                        <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '4px' }}>
                          Article 1
                        </div>
                        <div style={{ color: '#8c8c8c', fontSize: '11px' }}>
                          Description de l'article
                        </div>
                      </td>
                      <td style={{ padding: '18px', textAlign: 'center', fontSize: '13px' }}>1</td>
                      <td style={{ padding: '18px', textAlign: 'right', fontSize: '13px', fontWeight: '500' }}>0,00 €</td>
                      <td style={{ padding: '18px', textAlign: 'right', fontSize: '14px', fontWeight: 'bold', color: themeStyles.primaryColor }}>
                        0,00 €
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>

            {/* Bloc totaux stylisé */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ width: '400px' }}>
                {(() => {
                  // Calcul des totaux depuis les items
                  const subtotal = config.items?.reduce((sum: number, item: any) => 
                    sum + ((item.total || (item.quantity || 1) * (item.unitPrice || 0))), 0
                  ) || 0;
                  const taxRate = config.taxRate || 0.21;
                  const taxAmount = subtotal * taxRate;
                  const discount = config.discount || 0;
                  const totalTTC = subtotal + taxAmount - discount;

                  return (
                    <>
                      <div style={{ padding: '15px 25px', backgroundColor: '#f5f5f5', borderRadius: '6px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '14px', fontWeight: '500' }}>Sous-total HT</span>
                        <span style={{ fontSize: '14px', fontWeight: '600' }}>{subtotal.toFixed(2)} €</span>
                      </div>

                      {config.showTax !== false && (
                        <div style={{ padding: '15px 25px', backgroundColor: '#f5f5f5', borderRadius: '6px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '14px', fontWeight: '500' }}>TVA {(taxRate * 100).toFixed(0)}%</span>
                          <span style={{ fontSize: '14px', fontWeight: '600' }}>{taxAmount.toFixed(2)} €</span>
                        </div>
                      )}

                      {discount > 0 && (
                        <div style={{ padding: '15px 25px', backgroundColor: '#fff4e6', borderRadius: '6px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '14px', fontWeight: '500', color: '#d46b08' }}>Remise</span>
                          <span style={{ fontSize: '14px', fontWeight: '600', color: '#d46b08' }}>-{discount.toFixed(2)} €</span>
                        </div>
                      )}

                      <div style={{ 
                        padding: '20px 25px', 
                        backgroundColor: themeStyles.primaryColor, 
                        borderRadius: '8px', 
                        color: '#ffffff',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                      }}>
                        <span style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase' }}>TOTAL TTC</span>
                        <span style={{ fontSize: '26px', fontWeight: 'bold' }}>{totalTTC.toFixed(2)} €</span>
                      </div>
                    </>
                  );
                })()}

                <div style={{ 
                  marginTop: '20px',
                  padding: '15px',
                  backgroundColor: '#fff7e6',
                  border: '2px dashed #faad14',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#595959',
                  textAlign: 'center'
                }}>
                  💳 Paiement : {config.paymentTerms || '30 jours nets'}
                </div>
              </div>
            </div>
          </div>
        );

      case 'SIGNATURE_BLOCK':
        return (
          <div style={{ padding: '40px 60px', fontFamily: themeStyles.fontFamily }}>
            <h3 style={{ 
              color: themeStyles.primaryColor,
              fontSize: '20px',
              marginBottom: '40px',
              textAlign: 'center',
              textTransform: 'uppercase',
              letterSpacing: '2px'
            }}>
              ✍️ {config.blockTitle || 'SIGNATURES'}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px' }}>
              {/* Signature Client */}
              <div>
                <div style={{ 
                  borderBottom: `3px solid ${themeStyles.primaryColor}`,
                  paddingBottom: '12px',
                  marginBottom: '30px'
                }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: themeStyles.textColor, margin: 0 }}>
                    {config.clientLabel || 'LE CLIENT'}
                  </h4>
                </div>

                <div style={{ marginBottom: '80px' }}>
                  <div style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: '8px' }}>Nom :</div>
                  <div style={{ borderBottom: '1px solid #d9d9d9', paddingBottom: '8px', minHeight: '24px', ...getFieldStyle(section, 'clientName') }}>
                    {config.clientName || '___________________________________'}
                  </div>
                </div>

                <div style={{ marginBottom: '80px' }}>
                  <div style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: '8px' }}>Date :</div>
                  <div style={{ borderBottom: '1px solid #d9d9d9', paddingBottom: '8px', minHeight: '24px' }}>
                    ___________________________________
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: '12px' }}>Signature :</div>
                  <div style={{ 
                    border: '2px dashed #d9d9d9',
                    borderRadius: '8px',
                    minHeight: '120px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#bfbfbf',
                    fontSize: '32px'
                  }}>
                    ✍️
                  </div>
                </div>

                <div style={{ 
                  marginTop: '20px',
                  fontSize: '10px',
                  color: '#8c8c8c',
                  fontStyle: 'italic'
                }}>
                  Précédé de la mention "Lu et approuvé"
                </div>
              </div>

              {/* Signature Entreprise */}
              <div>
                <div style={{ 
                  borderBottom: `3px solid ${themeStyles.secondaryColor}`,
                  paddingBottom: '12px',
                  marginBottom: '30px'
                }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: themeStyles.textColor, margin: 0 }}>
                    {config.companyLabel || 'L\'ENTREPRISE'}
                  </h4>
                </div>

                <div style={{ marginBottom: '30px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px', ...getFieldStyle(section, 'companyName') }}>
                    {config.companyName || 'Votre Entreprise SPRL'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#8c8c8c', ...getFieldStyle(section, 'companyAddress') }}>
                    {config.companyAddress || 'Rue de l\'Exemple 123'}<br />
                    {config.companyCity || '1000 Bruxelles, Belgique'}<br />
                    {config.companyVAT || 'TVA BE 0123.456.789'}
                  </div>
                </div>

                <div style={{ marginBottom: '80px' }}>
                  <div style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: '8px' }}>Date :</div>
                  <div style={{ borderBottom: '1px solid #d9d9d9', paddingBottom: '8px' }}>
                    {config.companyDate || new Date().toLocaleDateString('fr-FR')}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: '12px' }}>Signature & Cachet :</div>
                  <div style={{ 
                    border: '2px dashed #d9d9d9',
                    borderRadius: '8px',
                    minHeight: '120px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#bfbfbf',
                    fontSize: '32px'
                  }}>
                    🏢
                  </div>
                </div>
              </div>
            </div>

            {/* Clause légale */}
            {config.legalClause !== false && (
              <div style={{ 
                marginTop: '60px',
                padding: '20px',
                backgroundColor: '#f5f5f5',
                borderLeft: `4px solid ${themeStyles.secondaryColor}`,
                fontSize: '10px',
                color: '#595959',
                lineHeight: '1.6',
                ...getFieldStyle(section, 'legalClause')
              }}>
                {config.legalClause || '📋 En signant ce document, les deux parties reconnaissent avoir pris connaissance et acceptent l\'intégralité des conditions générales de vente annexées au présent devis. Ce devis est valable pendant 30 jours à compter de sa date d\'émission.'}
              </div>
            )}
          </div>
        );

      case 'TERMS_CONDITIONS':
        return (
          <div style={{ padding: '40px', fontFamily: themeStyles.fontFamily }}>
            <h2 style={{ 
              color: themeStyles.primaryColor,
              fontSize: '24px',
              marginBottom: '30px',
              borderLeft: `6px solid ${themeStyles.secondaryColor}`,
              paddingLeft: '15px'
            }}>
              📜 CONDITIONS GÉNÉRALES
            </h2>

            <div style={{ columns: 2, columnGap: '40px', fontSize: '11px', lineHeight: '1.7', color: themeStyles.textColor }}>
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: themeStyles.primaryColor, marginBottom: '10px' }}>
                  1. Validité du devis
                </h4>
                <p style={{ margin: 0 }}>
                  Ce devis est valable pendant une durée de 30 jours à compter de sa date d'émission. 
                  Passé ce délai, les prix et conditions pourront être révisés.
                </p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: themeStyles.primaryColor, marginBottom: '10px' }}>
                  2. Modalités de paiement
                </h4>
                <p style={{ margin: 0 }}>
                  Sauf mention contraire, le paiement est dû à {config.paymentTerms || '30 jours nets'}. 
                  Un acompte de 30% peut être demandé à la commande. Le solde est payable à la livraison.
                </p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: themeStyles.primaryColor, marginBottom: '10px' }}>
                  3. Délais de livraison
                </h4>
                <p style={{ margin: 0 }}>
                  Les délais de livraison indiqués sont donnés à titre indicatif. Tout retard ne peut 
                  donner lieu à annulation de la commande ni à indemnité.
                </p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: themeStyles.primaryColor, marginBottom: '10px' }}>
                  4. Garanties
                </h4>
                <p style={{ margin: 0 }}>
                  Nos services sont garantis conformes aux normes en vigueur. Toute réclamation doit 
                  être formulée par écrit dans les 8 jours suivant la livraison.
                </p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: themeStyles.primaryColor, marginBottom: '10px' }}>
                  5. Propriété intellectuelle
                </h4>
                <p style={{ margin: 0 }}>
                  Tous les documents et créations restent notre propriété exclusive jusqu'au paiement 
                  intégral du prix convenu.
                </p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: themeStyles.primaryColor, marginBottom: '10px' }}>
                  6. Litiges
                </h4>
                <p style={{ margin: 0 }}>
                  Tout litige relève de la compétence exclusive des tribunaux de Bruxelles. 
                  Le droit belge est seul applicable.
                </p>
              </div>
            </div>

            <div style={{ 
              marginTop: '40px',
              padding: '20px',
              backgroundColor: '#e6f7ff',
              borderRadius: '8px',
              fontSize: '11px',
              color: '#0050b3'
            }}>
              ℹ️ <strong>Note importante :</strong> Ces conditions font partie intégrante du contrat. 
              En acceptant ce devis, le client reconnaît en avoir pris connaissance et les accepte sans réserve.
            </div>
          </div>
        );

      case 'CONTACT_INFO':
        return (
          <div style={{ padding: '40px', fontFamily: themeStyles.fontFamily, backgroundColor: '#fafafa' }}>
            <h2 style={{ 
              color: themeStyles.primaryColor,
              fontSize: '24px',
              marginBottom: '30px',
              textAlign: 'center',
              textTransform: 'uppercase',
              letterSpacing: '2px'
            }}>
              📞 CONTACTEZ-NOUS
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
              {/* Coordonnées */}
              <div>
                <div style={{ marginBottom: '30px' }}>
                  <div style={{ 
                    display: 'flex',
                    alignItems: 'flex-start',
                    padding: '20px',
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    marginBottom: '15px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                  }}>
                    <div style={{ 
                      fontSize: '24px',
                      marginRight: '15px',
                      width: '40px',
                      height: '40px',
                      backgroundColor: themeStyles.primaryColor,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      📍
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '8px', color: themeStyles.textColor }}>
                        Adresse
                      </div>
                      <div style={{ fontSize: '12px', color: '#595959', lineHeight: '1.6' }}>
                        Rue de l'Exemple 123<br />
                        1000 Bruxelles<br />
                        Belgique
                      </div>
                    </div>
                  </div>

                  <div style={{ 
                    display: 'flex',
                    alignItems: 'flex-start',
                    padding: '20px',
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    marginBottom: '15px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                  }}>
                    <div style={{ 
                      fontSize: '24px',
                      marginRight: '15px',
                      width: '40px',
                      height: '40px',
                      backgroundColor: themeStyles.secondaryColor,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      📧
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '8px', color: themeStyles.textColor }}>
                        Email
                      </div>
                      <div style={{ fontSize: '12px', color: '#595959' }}>
                        contact@entreprise.be
                      </div>
                    </div>
                  </div>

                  <div style={{ 
                    display: 'flex',
                    alignItems: 'flex-start',
                    padding: '20px',
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                  }}>
                    <div style={{ 
                      fontSize: '24px',
                      marginRight: '15px',
                      width: '40px',
                      height: '40px',
                      backgroundColor: '#722ed1',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      📱
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '8px', color: themeStyles.textColor }}>
                        Téléphone
                      </div>
                      <div style={{ fontSize: '12px', color: '#595959' }}>
                        +32 2 123 45 67
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Horaires & Réseaux */}
              <div>
                <div style={{ 
                  padding: '25px',
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: themeStyles.primaryColor, marginBottom: '15px' }}>
                    🕐 Horaires d'ouverture
                  </h4>
                  <div style={{ fontSize: '12px', color: '#595959', lineHeight: '2' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Lundi - Vendredi</span>
                      <strong>9h00 - 18h00</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Samedi</span>
                      <strong>10h00 - 14h00</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Dimanche</span>
                      <strong>Fermé</strong>
                    </div>
                  </div>
                </div>

                <div style={{ 
                  padding: '25px',
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: themeStyles.primaryColor, marginBottom: '15px' }}>
                    🌐 Suivez-nous
                  </h4>
                  <div style={{ display: 'flex', gap: '15px' }}>
                    {['👥', '🐦', '📷', '💼'].map((icon, i) => (
                      <div key={i} style={{ 
                        width: '50px',
                        height: '50px',
                        backgroundColor: themeStyles.primaryColor,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        cursor: 'pointer'
                      }}>
                        {icon}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div style={{ padding: '40px', textAlign: 'center', color: '#8c8c8c' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
            <p style={{ fontSize: '14px' }}>
              Section {section.type} - Configuration en cours...
            </p>
          </div>
        );
    }
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#525659', minHeight: '100vh' }}>
      {sections.map((section, index) => (
        <div
          key={index}
          style={{
            width: '210mm',
            minHeight: '297mm',
            margin: '0 auto 20px auto',
            backgroundColor: '#ffffff',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            overflow: 'hidden',
            pageBreakAfter: 'always'
          }}
        >
          {renderSection(section, index)}
        </div>
      ))}
    </div>
  );
};

export default PDFPreview;
