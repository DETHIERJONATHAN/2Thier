/**
 * 📄 PAGE PREVIEW - Prévisualisation interactive d'une page avec ses modules
 */

import { useMemo } from 'react';
import { Button, Tooltip } from 'antd';
import { DeleteOutlined, DragOutlined, SettingOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { DocumentPage, ModuleInstance } from './types';
import { getModuleById } from './ModuleRegistry';
import ModuleRenderer from './ModuleRenderer';

interface PagePreviewProps {
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
  onModuleSelect?: (id: string) => void;
  onModuleHover?: (id: string | null) => void;
  onModuleDelete?: (id: string) => void;
  onModuleUpdate?: (id: string, updates: Partial<ModuleInstance>) => void;
  onModulesReorder?: (modules: ModuleInstance[]) => void;
}

const PagePreview = ({
  page,
  globalTheme,
  selectedModuleId,
  hoveredModuleId,
  isDragging,
  previewMode = false,
  onModuleSelect,
  onModuleHover,
  onModuleDelete,
  onModuleUpdate,
  onModulesReorder,
}: PagePreviewProps) => {

  // Style de la page A4
  const pageStyle = useMemo(() => {
    // Déterminer le backgroundImage - peut être une URL ou un gradient
    let backgroundImageValue: string | undefined = undefined;
    if (page.backgroundImage) {
      // Si c'est un gradient, l'utiliser tel quel
      if (page.backgroundImage.startsWith('linear-gradient') || 
          page.backgroundImage.startsWith('radial-gradient')) {
        backgroundImageValue = page.backgroundImage;
      } else {
        // Pour data URI et URLs, wrapper dans url()
        backgroundImageValue = `url(${page.backgroundImage})`;
      }
    }

    const isGradient = backgroundImageValue?.startsWith('linear-gradient') || backgroundImageValue?.startsWith('radial-gradient');

    return {
      width: '210mm',
      minHeight: '297mm',
      backgroundColor: page.backgroundColor || '#ffffff',
      backgroundImage: backgroundImageValue,
      backgroundSize: isGradient ? '100% 100%' : (backgroundImageValue ? '100% 100%' : undefined),
      backgroundPosition: 'center',
      padding: page.padding 
        ? `${page.padding.top}px ${page.padding.right}px ${page.padding.bottom}px ${page.padding.left}px`
        : '40px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
      margin: '0 auto',
      position: 'relative' as const,
      fontFamily: globalTheme.fontFamily,
      fontSize: `${globalTheme.fontSize}px`,
    };
  }, [page, globalTheme]);

  const handleDragEnd = (result: any) => {
    if (!result.destination || !onModulesReorder) return;

    const items = Array.from(page.modules);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Mettre à jour les ordres
    const reordered = items.map((module, index) => ({
      ...module,
      order: index,
    }));

    onModulesReorder(reordered);
  };

  const renderModule = (module: ModuleInstance, index: number, provided?: any, snapshot?: any) => {
    const moduleDef = getModuleById(module.moduleId);
    if (!moduleDef) return null;

    // Le module BACKGROUND ne s'affiche pas comme un objet - il modifie le fond de page
    if (module.moduleId === 'BACKGROUND') return null;

    const isSelected = selectedModuleId === module.id;
    const isHovered = hoveredModuleId === module.id;
    const isHidden = module.hidden;
    const showToolbar = !previewMode && (isSelected || isHovered || snapshot?.isDragging);

    if (isHidden && previewMode) return null;

    return (
      <div
        ref={provided?.innerRef}
        {...(provided?.draggableProps || {})}
        {...(provided?.dragHandleProps || {})}
        onClick={(e) => {
          e.stopPropagation();
          onModuleSelect?.(module.id);
        }}
        onMouseEnter={() => onModuleHover?.(module.id)}
        onMouseLeave={() => onModuleHover?.(null)}
        style={{
          position: 'relative',
          marginBottom: '16px',
          opacity: isHidden ? 0.4 : 1,
          outline: isSelected 
            ? '2px solid #1890ff' 
            : isHovered 
              ? '2px solid rgba(24, 144, 255, 0.5)' 
              : '2px solid transparent',
          outlineOffset: '4px',
          borderRadius: '4px',
          transition: 'outline 0.2s, opacity 0.2s',
          cursor: previewMode ? 'default' : 'grab',
          ...(provided?.draggableProps?.style || {}),
          ...(snapshot?.isDragging ? { 
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            zIndex: 1000,
          } : {}),
        }}
      >
        {/* Toolbar - visible au survol ou sélection */}
        <div
          style={{
            position: 'absolute',
            top: '-32px',
            left: '0',
            display: 'flex',
            gap: '4px',
            zIndex: 100,
            backgroundColor: '#1890ff',
            padding: '4px 8px',
            borderRadius: '6px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            opacity: showToolbar ? 1 : 0,
            visibility: showToolbar ? 'visible' : 'hidden',
            transition: 'opacity 0.2s, visibility 0.2s',
          }}
        >
          {/* Drag icon and name */}
          <div
            style={{
              padding: '4px 8px',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'grab',
            }}
          >
            <DragOutlined />
            <span style={{ fontSize: '12px', fontWeight: 600 }}>
              {moduleDef.icon} {moduleDef.name}
            </span>
          </div>

          <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.3)' }} />

          <Tooltip title="Configurer">
            <Button
              type="text"
              size="small"
              icon={<SettingOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onModuleSelect?.(module.id);
              }}
              style={{ color: '#fff' }}
            />
          </Tooltip>

          <Tooltip title={isHidden ? 'Afficher' : 'Masquer'}>
            <Button
              type="text"
              size="small"
              icon={<EyeInvisibleOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onModuleUpdate?.(module.id, { hidden: !isHidden });
              }}
              style={{ color: isHidden ? '#ff4d4f' : '#fff' }}
            />
          </Tooltip>

          <Tooltip title="Supprimer">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onModuleDelete?.(module.id);
              }}
              style={{ color: '#ff4d4f' }}
            />
          </Tooltip>
        </div>

        {/* Contenu du module */}
        <ModuleRenderer
          module={module}
          moduleDef={moduleDef}
          globalTheme={globalTheme}
          isEditing={!previewMode}
        />
      </div>
    );
  };

  return (
    <div style={pageStyle}>
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
        }}>
          📄 {page.name}
        </div>
      )}

      {/* Modules */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable 
          droppableId="page-modules" 
          isDropDisabled={previewMode} 
          mode="standard"
          ignoreContainerClipping={true}
        >
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              style={{ minHeight: '100px' }}
            >
              {page.modules
                .sort((a, b) => a.order - b.order)
                .map((module, index) => (
                  previewMode ? (
                    <div key={module.id}>
                      {renderModule(module, index)}
                    </div>
                  ) : (
                    <Draggable key={module.id} draggableId={module.id} index={index}>
                      {(provided, snapshot) => renderModule(module, index, provided, snapshot)}
                    </Draggable>
                  )
                ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

export default PagePreview;
