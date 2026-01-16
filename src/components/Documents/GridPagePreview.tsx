/**
 * 📐 GRID PAGE PREVIEW - Prévisualisation avec grille et positionnement libre
 * Permet de placer les modules n'importe où sur la page avec snap-to-grid
 */

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Tooltip } from 'antd';
import { DeleteOutlined, DragOutlined, SettingOutlined, EyeInvisibleOutlined, CopyOutlined } from '@ant-design/icons';
import { DocumentPage, ModuleInstance } from './types';
import { getModuleById } from './ModuleRegistry';
import ModuleRenderer from './ModuleRenderer';

// Taille de la grille en pixels (pour A4 à 96dpi: 794 x 1123 px)
const GRID_SIZE = 20; // Taille d'une cellule de grille
const PAGE_WIDTH = 794; // ~210mm à 96dpi
const PAGE_HEIGHT = 1123; // ~297mm à 96dpi

// Snap to grid helper
const snapToGrid = (value: number, gridSize: number = GRID_SIZE): number => {
  return Math.round(value / gridSize) * gridSize;
};

interface GridPagePreviewProps {
  page: DocumentPage;
  globalTheme: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    fontSize: number;
  };
  selectedModuleId: string | null;
  hoveredModuleId: string | null;
  isDragging: boolean;
  previewMode?: boolean;
  showGrid?: boolean;
  /**
   * Données pour l'interpolation des variables et l'évaluation des conditions
   */
  documentData?: {
    lead?: Record<string, any>;
    quote?: Record<string, any>;
    org?: Record<string, any>;
    tbl?: Record<string, any>;
  };
  onModuleSelect?: (id: string) => void;
  onModuleHover?: (id: string | null) => void;
  onModuleDelete?: (id: string) => void;
  onModuleDuplicate?: (id: string) => void;
  onModuleUpdate?: (id: string, updates: Partial<ModuleInstance>) => void;
  onModulesReorder?: (modules: ModuleInstance[]) => void;
}

const GridPagePreview = ({
  page,
  globalTheme,
  selectedModuleId,
  hoveredModuleId,
  isDragging: externalDragging,
  previewMode = false,
  showGrid = true,
  documentData,
  onModuleSelect,
  onModuleHover,
  onModuleDelete,
  onModuleDuplicate,
  onModuleUpdate,
}: GridPagePreviewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingModule, setDraggingModule] = useState<string | null>(null);
  const [resizingModule, setResizingModule] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ width: 0, height: 0, x: 0, y: 0 });

  // Style de la page A4 avec grille
  const pageStyle = useMemo(() => {
    console.log('🖼️ [GridPagePreview] page.backgroundImage:', page.backgroundImage?.substring(0, 60) || 'NONE');
    console.log('🖼️ [GridPagePreview] page.backgroundColor:', page.backgroundColor);
    
    // Déterminer le background - peut être une URL, un gradient ou du base64
    const getBackgroundImageValue = () => {
      if (!page.backgroundImage) return undefined;
      // Si c'est un gradient, l'utiliser tel quel
      if (page.backgroundImage.startsWith('linear-gradient') || 
          page.backgroundImage.startsWith('radial-gradient')) {
        return page.backgroundImage;
      }
      // Pour base64 et URLs, wrapper dans url()
      if (page.backgroundImage.startsWith('data:') ||
          page.backgroundImage.startsWith('http://') ||
          page.backgroundImage.startsWith('https://')) {
        return `url(${page.backgroundImage})`;
      }
      return `url(${page.backgroundImage})`;
    };

    const bgImageValue = getBackgroundImageValue();
    console.log('🖼️ [GridPagePreview] bgImageValue computed:', bgImageValue?.substring(0, 60) || 'NONE');
    
    const isGradient = bgImageValue?.startsWith('linear-gradient') || bgImageValue?.startsWith('radial-gradient');

    // Construire le backgroundImage composite (grille + fond)
    let backgroundImage: string | undefined;
    let backgroundSize: string | undefined;

    if (showGrid && !previewMode) {
      const gridPattern = `
        linear-gradient(to right, rgba(0,0,0,0.03) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(0,0,0,0.03) 1px, transparent 1px)
      `;
      if (bgImageValue) {
        backgroundImage = `${gridPattern}, ${bgImageValue}`;
        backgroundSize = `${GRID_SIZE}px ${GRID_SIZE}px, ${GRID_SIZE}px ${GRID_SIZE}px, 100% 100%`;
      } else {
        backgroundImage = gridPattern;
        backgroundSize = `${GRID_SIZE}px ${GRID_SIZE}px`;
      }
    } else {
      backgroundImage = bgImageValue;
      backgroundSize = isGradient ? '100% 100%' : (bgImageValue ? '100% 100%' : undefined);
    }

    const finalStyle = {
      width: `${PAGE_WIDTH}px`,
      height: `${PAGE_HEIGHT}px`,
      backgroundColor: page.backgroundColor || '#ffffff',
      backgroundImage,
      backgroundSize,
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      padding: page.padding 
        ? `${page.padding.top}px ${page.padding.right}px ${page.padding.bottom}px ${page.padding.left}px`
        : '40px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
      margin: '0 auto',
      position: 'relative' as const,
      fontFamily: globalTheme.fontFamily,
      fontSize: `${globalTheme.fontSize}px`,
      overflow: 'hidden',
    };
    
    return finalStyle;
  }, [page, globalTheme, showGrid, previewMode]);

  const rawBackgroundImage = page.backgroundImage;
  const isGradientBackground = !!rawBackgroundImage && (
    rawBackgroundImage.startsWith('linear-gradient') ||
    rawBackgroundImage.startsWith('radial-gradient')
  );
  const isImageBackground = !!rawBackgroundImage && !isGradientBackground;
  const gridPattern = `
    linear-gradient(to right, rgba(0,0,0,0.03) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(0,0,0,0.03) 1px, transparent 1px)
  `;

  // Calculer la position dans la page
  const getPositionInPage = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  // Handler de déplacement
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (draggingModule && onModuleUpdate) {
      const pos = getPositionInPage(e.clientX, e.clientY);
      const newX = snapToGrid(pos.x - dragOffset.x);
      const newY = snapToGrid(pos.y - dragOffset.y);
      
      // Limiter aux bordures de la page
      const module = page.modules.find(m => m.id === draggingModule);
      const width = module?.position?.width || 200;
      const height = module?.position?.height || 100;
      
      const clampedX = Math.max(0, Math.min(newX, PAGE_WIDTH - width));
      const clampedY = Math.max(0, Math.min(newY, PAGE_HEIGHT - height));
      
      onModuleUpdate(draggingModule, {
        position: {
          x: clampedX,
          y: clampedY,
          width,
          height,
        }
      });
    }
    
    if (resizingModule && onModuleUpdate) {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      
      const newWidth = snapToGrid(Math.max(100, resizeStart.width + deltaX));
      const newHeight = snapToGrid(Math.max(50, resizeStart.height + deltaY));
      
      const module = page.modules.find(m => m.id === resizingModule);
      const x = module?.position?.x || 0;
      const y = module?.position?.y || 0;
      
      // Limiter aux bordures
      const clampedWidth = Math.min(newWidth, PAGE_WIDTH - x);
      const clampedHeight = Math.min(newHeight, PAGE_HEIGHT - y);
      
      onModuleUpdate(resizingModule, {
        position: {
          x,
          y,
          width: clampedWidth,
          height: clampedHeight,
        }
      });
    }
  }, [draggingModule, resizingModule, dragOffset, resizeStart, getPositionInPage, onModuleUpdate, page.modules]);

  const handleMouseUp = useCallback(() => {
    setDraggingModule(null);
    setResizingModule(null);
  }, []);

  // Event listeners globaux
  useEffect(() => {
    if (draggingModule || resizingModule) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingModule, resizingModule, handleMouseMove, handleMouseUp]);

  // Démarrer le drag d'un module
  const startDrag = useCallback((e: React.MouseEvent, moduleId: string) => {
    if (previewMode) return;
    e.stopPropagation();
    
    const module = page.modules.find(m => m.id === moduleId);
    if (!module) return;
    
    const pos = getPositionInPage(e.clientX, e.clientY);
    const moduleX = module.position?.x || 0;
    const moduleY = module.position?.y || 0;
    
    setDragOffset({
      x: pos.x - moduleX,
      y: pos.y - moduleY,
    });
    setDraggingModule(moduleId);
    onModuleSelect?.(moduleId);
  }, [previewMode, page.modules, getPositionInPage, onModuleSelect]);

  // Démarrer le resize d'un module
  const startResize = useCallback((e: React.MouseEvent, moduleId: string) => {
    if (previewMode) return;
    e.stopPropagation();
    e.preventDefault();
    
    const module = page.modules.find(m => m.id === moduleId);
    if (!module) return;
    
    setResizeStart({
      width: module.position?.width || 200,
      height: module.position?.height || 100,
      x: e.clientX,
      y: e.clientY,
    });
    setResizingModule(moduleId);
  }, [previewMode, page.modules]);

  // Rendu d'un module positionné
  const renderModule = (module: ModuleInstance) => {
    const moduleDef = getModuleById(module.moduleId);
    if (!moduleDef) return null;

    // Le module BACKGROUND ne s'affiche pas comme un objet - il modifie le fond de page
    if (module.moduleId === 'BACKGROUND') return null;

    const isSelected = selectedModuleId === module.id;
    const isHovered = hoveredModuleId === module.id;
    const isHidden = module.hidden;
    const isDragging = draggingModule === module.id;
    const isResizing = resizingModule === module.id;

    if (isHidden && previewMode) return null;

    // Position par défaut si non définie
    const position = module.position || {
      x: 40,
      y: 40 + (module.order * 120),
      width: PAGE_WIDTH - 80,
      height: 100,
    };

    return (
      <div
        key={module.id}
        onClick={(e) => {
          e.stopPropagation();
          onModuleSelect?.(module.id);
        }}
        onMouseDown={(e) => {
          // 🔥 Permettre le drag depuis n'importe où sur le module
          // Sauf si on clique sur un élément interactif (bouton, input, etc.)
          const target = e.target as HTMLElement;
          const isInteractive = target.closest('button, input, textarea, select, [role="button"], .ant-btn, .ant-input');
          if (!isInteractive && !previewMode) {
            startDrag(e, module.id);
          }
        }}
        onMouseEnter={() => onModuleHover?.(module.id)}
        onMouseLeave={() => onModuleHover?.(null)}
        style={{
          position: 'absolute',
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${position.width}px`,
          height: `${position.height}px`,
          opacity: isHidden ? 0.4 : 1,
          outline: isSelected 
            ? '2px solid #1890ff' 
            : isHovered 
              ? '2px solid rgba(24, 144, 255, 0.5)' 
              : '1px dashed rgba(0,0,0,0.1)',
          outlineOffset: '0px',
          borderRadius: '4px',
          transition: isDragging || isResizing ? 'none' : 'outline 0.2s, opacity 0.2s',
          cursor: previewMode ? 'default' : isDragging ? 'grabbing' : 'grab',
          zIndex: isDragging ? 1000 : isSelected ? 100 : module.order,
          boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.3)' : undefined,
          overflow: previewMode ? 'hidden' : 'visible',
          backgroundColor: moduleDef.id === 'BACKGROUND' ? 'transparent' : undefined,
        }}
      >
        {/* Toolbar - visible au survol ou sélection */}
        {!previewMode && (isSelected || isHovered) && (
          <div
            onMouseDown={(e) => startDrag(e, module.id)}
            style={{
              position: 'absolute',
              top: '-32px',
              left: '0px',
              display: 'flex',
              gap: '2px',
              zIndex: 1001,
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              padding: '4px 8px',
              borderRadius: '6px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              cursor: 'grab',
            }}
          >
            <div style={{ 
              padding: '2px 6px', 
              color: '#fff', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px',
              fontSize: '11px',
            }}>
              <DragOutlined style={{ color: '#fff' }} />
              <span style={{ fontWeight: 600, color: '#fff' }}>{moduleDef.icon}</span>
            </div>

            <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.5)' }} />

            <Tooltip title="Configurer">
              <div
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onModuleSelect?.(module.id);
                }}
                style={{ 
                  color: '#fff', 
                  padding: '2px 6px', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <SettingOutlined style={{ fontSize: '12px', color: '#fff' }} />
              </div>
            </Tooltip>

            <Tooltip title={isHidden ? 'Afficher' : 'Masquer'}>
              <div
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onModuleUpdate?.(module.id, { hidden: !isHidden });
                }}
                style={{ 
                  padding: '2px 6px', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <EyeInvisibleOutlined style={{ fontSize: '12px', color: isHidden ? '#ff4d4f' : '#fff' }} />
              </div>
            </Tooltip>

            <Tooltip title="Dupliquer">
              <div
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onModuleDuplicate?.(module.id);
                }}
                style={{ 
                  padding: '2px 6px', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <CopyOutlined style={{ fontSize: '12px', color: '#52c41a' }} />
              </div>
            </Tooltip>

            <Tooltip title="Supprimer">
              <div
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onModuleDelete?.(module.id);
                }}
                style={{ 
                  padding: '2px 6px', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <DeleteOutlined style={{ fontSize: '12px', color: '#ff4d4f' }} />
              </div>
            </Tooltip>
          </div>
        )}

        {/* Contenu du module */}
        <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
          <ModuleRenderer
            module={module}
            moduleDef={moduleDef}
            globalTheme={globalTheme}
            isEditing={!previewMode}
            documentData={documentData}
          />
        </div>

        {/* Indicateur de condition configurée */}
        {!previewMode && module.config?._conditionalDisplay?.enabled && (
          <Tooltip title="Ce module a une condition d'affichage configurée">
            <div style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              backgroundColor: '#722ed1',
              color: '#fff',
              borderRadius: '50%',
              width: '18px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              zIndex: 10,
            }}>
              ⚡
            </div>
          </Tooltip>
        )}

        {/* Resize handle */}
        {!previewMode && isSelected && (
          <div
            onMouseDown={(e) => startResize(e, module.id)}
            style={{
              position: 'absolute',
              right: '-4px',
              bottom: '-4px',
              width: '12px',
              height: '12px',
              backgroundColor: '#1890ff',
              borderRadius: '2px',
              cursor: 'se-resize',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }}
          />
        )}

        {/* Dimensions indicator quand on resize */}
        {isResizing && (
          <div style={{
            position: 'absolute',
            bottom: '4px',
            right: '4px',
            backgroundColor: 'rgba(0,0,0,0.7)',
            color: '#fff',
            padding: '2px 6px',
            borderRadius: '3px',
            fontSize: '10px',
            fontFamily: 'monospace',
          }}>
            {position.width} × {position.height}
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      ref={containerRef}
      style={{
        ...pageStyle,
        backgroundColor: '#ffffff', // Couleur par défaut pour le conteneur
        backgroundImage: undefined,  // IMPORTANT: Pas de background ici!
        backgroundSize: undefined,
      }}
      onClick={() => onModuleSelect?.(null as any)}
    >
      {/* Élément de background qui s'affiche DERRIÈRE les modules */}
      {(pageStyle.backgroundImage || pageStyle.backgroundColor) && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: pageStyle.backgroundColor,
            pointerEvents: 'none',
            zIndex: 0,
            overflow: 'hidden',
          }}
        >
          {isImageBackground ? (
            <img
              src={rawBackgroundImage}
              alt="Background"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'fill',
                objectPosition: 'center',
              }}
            />
          ) : (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundImage: pageStyle.backgroundImage,
                backgroundSize: pageStyle.backgroundSize,
                backgroundPosition: pageStyle.backgroundPosition,
                backgroundRepeat: pageStyle.backgroundRepeat,
              }}
            />
          )}

          {!previewMode && showGrid && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundImage: gridPattern,
                backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px, ${GRID_SIZE}px ${GRID_SIZE}px`,
                backgroundPosition: 'center',
                backgroundRepeat: 'repeat',
              }}
            />
          )}
        </div>
      )}

      {/* Label de la page */}
      {!previewMode && (
        <div style={{
          position: 'absolute',
          top: '-30px',
          left: '0',
          backgroundColor: '#1f1f1f',
          color: '#fff',
          padding: '4px 12px',
          borderRadius: '6px 6px 0 0',
          fontSize: '12px',
          fontWeight: 600,
          zIndex: 11,
        }}>
          📄 {page.name}
        </div>
      )}

      {/* Info grille */}
      {!previewMode && showGrid && (
        <div style={{
          position: 'absolute',
          top: '4px',
          right: '4px',
          backgroundColor: 'rgba(0,0,0,0.5)',
          color: '#fff',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '10px',
          zIndex: 11,
        }}>
          Grille: {GRID_SIZE}px | {PAGE_WIDTH}×{PAGE_HEIGHT}
        </div>
      )}

      {/* Modules */}
      {page.modules
        .sort((a, b) => a.order - b.order)
        .map(module => renderModule(module))}

      {/* Guide lignes centrales */}
      {!previewMode && showGrid && (
        <>
          {/* Ligne verticale centrale */}
          <div style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            bottom: 0,
            width: '1px',
            backgroundColor: 'rgba(24, 144, 255, 0.2)',
            pointerEvents: 'none',
            zIndex: 10,
          }} />
          {/* Ligne horizontale centrale */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: '1px',
            backgroundColor: 'rgba(24, 144, 255, 0.2)',
            pointerEvents: 'none',
            zIndex: 10,
          }} />
        </>
      )}
    </div>
  );
};

export default GridPagePreview;
