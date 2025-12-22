import { useState, useRef } from 'react';
import { message } from 'antd';
import PDFPreview from './PDFPreview';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';

interface InteractivePDFPreviewProps {
  sections: any[];
  theme?: any;
  globalTheme?: any;
  onSectionUpdate?: (sectionId: string, updates: any) => void;
  editMode?: boolean;
  templateId?: string;
}

const InteractivePDFPreview = ({ 
  sections, 
  theme, 
  globalTheme, 
  onSectionUpdate,
  editMode = true,
  templateId
}: InteractivePDFPreviewProps) => {
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggingElement, setDraggingElement] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // États pour le redimensionnement
  const [isResizing, setIsResizing] = useState(false);
  const [resizingElement, setResizingElement] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState({ width: 0, height: 0, mouseX: 0, mouseY: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const { api } = useAuthenticatedApi();
  const initialDragRef = useRef<{ x: number; y: number; hasMoved: boolean } | null>(null);

  // Handlers globaux pour le drag (indépendants des sections)
  const handleDragStart = (elementName: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const element = e.currentTarget as HTMLElement;
    const rect = element.getBoundingClientRect();
    const container = containerRef.current;
    
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    
    setSelectedElement(elementName);
    setIsDragging(true);
    setDraggingElement(elementName);
    
    // Calculer l'offset du clic dans l'élément
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    // Stocker la position initiale de l'élément AVANT de passer en mode custom
    const initialX = rect.left - containerRect.left;
    const initialY = rect.top - containerRect.top;
    
    initialDragRef.current = {
      x: initialX,
      y: initialY,
      hasMoved: false
    };
    
    setDragStart({
      x: offsetX,
      y: offsetY
    });
    
    console.log('[InteractivePDF] 🎯 Drag started:', {
      element: elementName,
      clickPos: { x: e.clientX, y: e.clientY },
      elementRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      initialPos: { x: initialX, y: initialY },
      offset: { x: offsetX, y: offsetY }
    });
    
    // NE PAS passer en mode custom immédiatement - attendre le premier mouvement
  };

  const handleDragMove = (e: React.MouseEvent) => {
    if (!isDragging || !draggingElement || !containerRef.current || !initialDragRef.current) return;
    
    e.preventDefault();
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const section = sections[0];
    if (!section || !onSectionUpdate) return;
    
    const fieldStyles = section.config?._fieldStyles || {};
    const elementStyle = fieldStyles[draggingElement] || {};
    
    // Calculer la nouvelle position en utilisant la position INITIALE + delta de la souris
    // Ceci garantit que le premier mouvement ne cause pas de décalage
    const mouseX = e.clientX - containerRect.left;
    const mouseY = e.clientY - containerRect.top;
    
    // Position = position initiale de l'élément + (position souris actuelle - position souris au clic)
    // Position souris au clic = initialDragRef.x + dragStart.x (position élément + offset clic)
    const initialMouseX = initialDragRef.current.x + dragStart.x;
    const initialMouseY = initialDragRef.current.y + dragStart.y;
    
    let x = initialDragRef.current.x + (mouseX - initialMouseX);
    let y = initialDragRef.current.y + (mouseY - initialMouseY);
    
    // Limiter aux bordures du conteneur
    x = Math.max(0, Math.min(x, containerRect.width - 100));
    y = Math.max(0, Math.min(y, containerRect.height - 50));
    
    // Si c'est le premier mouvement, log le passage en mode custom
    if (initialDragRef.current && !initialDragRef.current.hasMoved) {
      console.log('[InteractivePDF] 🔄 Premier mouvement - passage en mode custom:', {
        initialPos: initialDragRef.current,
        newPos: { x, y }
      });
      initialDragRef.current.hasMoved = true;
    }
    
    console.log('[InteractivePDF] 🔀 Dragging:', {
      element: draggingElement,
      mousePos: { x: e.clientX, y: e.clientY },
      containerPos: { left: containerRect.left, top: containerRect.top },
      newPos: { x, y }
    });
    
    onSectionUpdate(section.id, {
      config: {
        ...section.config,
        _fieldStyles: {
          ...fieldStyles,
          [draggingElement]: {
            ...elementStyle,
            position: 'custom',
            x: Math.round(x),
            y: Math.round(y)
          }
        }
      }
    });
  };

  const handleDragEnd = async () => {
    if (isDragging && draggingElement) {
      console.log('[InteractivePDF] ✅ Drag ended');
      const draggedElement = draggingElement;
      setIsDragging(false);
      setDraggingElement(null);
      initialDragRef.current = null; // Réinitialiser la ref
      
      // Auto-sauvegarder la position en base de données
      const section = sections[0]; // On édite toujours la première section en mode interactif
      if (section && !section.id.startsWith('temp-') && templateId) {
        try {
          console.log('[InteractivePDF] 💾 Sauvegarde automatique de la position...');
          await api.put(`/api/documents/templates/${templateId}/sections/${section.id}`, {
            order: section.order,
            config: section.config
          });
          message.success(`✅ Position de "${draggedElement}" sauvegardée !`);
        } catch (error) {
          console.error('[InteractivePDF] ❌ Erreur sauvegarde position:', error);
          message.error('Erreur lors de la sauvegarde');
        }
      } else {
        message.info('ℹ️ Position mise à jour localement. Cliquez sur "Sauvegarder" pour confirmer.');
      }
    }
  };

  const handleElementHover = (elementName: string | null) => {
    if (!isDragging && !isResizing) {
      setHoveredElement(elementName);
    }
  };

  // Handlers pour le redimensionnement
  const handleResizeStart = (elementName: string, e: React.MouseEvent, currentSize: { width?: number; height?: number; fontSize?: number }) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    setResizingElement(elementName);
    setResizeStart({
      // Pour les images: width et height
      // Pour le texte: fontSize est stocké dans width pour simplifier
      width: currentSize.fontSize || currentSize.width || 0,
      height: currentSize.height || 0,
      mouseX: e.clientX,
      mouseY: e.clientY
    });
    
    console.log('[InteractivePDF] 📏 Resize started:', { element: elementName, currentSize });
  };

  const handleResizeMove = (e: React.MouseEvent) => {
    if (!isResizing || !resizingElement || !containerRef.current) return;
    
    const deltaX = e.clientX - resizeStart.mouseX;
    const deltaY = e.clientY - resizeStart.mouseY;
    
    const section = sections[0];
    const fieldStyles = section.config?._fieldStyles || {};
    const currentStyle = fieldStyles[resizingElement] || {};
    
    // Déterminer si c'est une image ou du texte
    const isImage = resizingElement.toLowerCase().includes('image') || resizingElement.toLowerCase().includes('logo');
    
    let updates: any = {};
    
    if (isImage) {
      // Pour les images : ajuster maxWidth et maxHeight depuis les valeurs INITIALES
      const baseWidth = resizeStart.width || 250;
      const baseHeight = resizeStart.height || 100;
      const newWidth = Math.max(50, baseWidth + deltaX);
      const newHeight = Math.max(50, baseHeight + deltaY);
      updates = { maxWidth: Math.round(newWidth), maxHeight: Math.round(newHeight) };
    } else {
      // Pour le texte : ajuster fontSize depuis la valeur INITIALE (stockée dans resizeStart.width)
      const baseFontSize = resizeStart.width || 16; // La valeur initiale du fontSize
      const newFontSize = Math.max(8, Math.min(120, baseFontSize + deltaY / 2));
      updates = { fontSize: Math.round(newFontSize) };
    }
    
    // Mettre à jour immédiatement
    if (onSectionUpdate) {
      onSectionUpdate(section.id, {
        config: {
          ...section.config,
          _fieldStyles: {
            ...fieldStyles,
            [resizingElement]: {
              ...currentStyle,
              ...updates
            }
          }
        }
      });
    }
    
    console.log('[InteractivePDF] 📏 Resizing:', { element: resizingElement, updates });
  };

  const handleResizeEnd = async () => {
    if (isResizing && resizingElement) {
      console.log('[InteractivePDF] ✅ Resize ended');
      const resizedElement = resizingElement;
      setIsResizing(false);
      setResizingElement(null);
      
      // Auto-sauvegarder
      const section = sections[0];
      if (section && !section.id.startsWith('temp-') && templateId) {
        try {
          console.log('[InteractivePDF] 💾 Sauvegarde automatique du redimensionnement...');
          await api.put(`/api/documents/templates/${templateId}/sections/${section.id}`, {
            order: section.order,
            config: section.config
          });
          message.success(`✅ Taille de "${resizedElement}" sauvegardée !`);
        } catch (error) {
          console.error('[InteractivePDF] ❌ Erreur sauvegarde taille:', error);
          message.error('Erreur lors de la sauvegarde');
        }
      }
    }
  };

  // Handler pour supprimer/masquer un élément
  const handleDeleteElement = async (elementName: string) => {
    const section = sections[0];
    if (!section || !onSectionUpdate) return;
    
    const fieldStyles = section.config?._fieldStyles || {};
    
    // Marquer l'élément comme masqué
    onSectionUpdate(section.id, {
      config: {
        ...section.config,
        _fieldStyles: {
          ...fieldStyles,
          [elementName]: {
            ...fieldStyles[elementName],
            hidden: true
          }
        }
      }
    });
    
    // Désélectionner l'élément
    setSelectedElement(null);
    setHoveredElement(null);
    
    // Auto-sauvegarder si possible
    if (!section.id.startsWith('temp-') && templateId) {
      try {
        const updatedConfig = {
          ...section.config,
          _fieldStyles: {
            ...fieldStyles,
            [elementName]: {
              ...fieldStyles[elementName],
              hidden: true
            }
          }
        };
        
        await api.put(`/api/documents/templates/${templateId}/sections/${section.id}`, {
          order: section.order,
          config: updatedConfig
        });
        message.success(`🗑️ Élément "${elementName}" masqué !`);
      } catch (error) {
        console.error('[InteractivePDF] ❌ Erreur masquage:', error);
        message.error('Erreur lors du masquage');
      }
    } else {
      message.info(`🗑️ Élément "${elementName}" masqué localement`);
    }
  };

  // Wrapper des sections pour ajouter le drag & drop
  const interactiveSections = sections.map((section) => {
    // ✅ ACTIVER POUR TOUTES LES SECTIONS en mode édition
    if (!editMode) {
      return section;
    }

    // Pour toutes les sections en mode édition, on retourne une version modifiée
    return {
      ...section,
      _interactive: true,
      _selectedElement: selectedElement,
      _hoveredElement: hoveredElement,
      _draggingElement: draggingElement,
      _resizingElement: resizingElement,
      _onElementHover: handleElementHover,
      _onElementDragStart: handleDragStart,
      _onElementResizeStart: handleResizeStart,
      _onElementDelete: handleDeleteElement
    };
  });

  // Désélectionner quand on clique en dehors
  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedElement(null);
      setHoveredElement(null);
    }
  };

  return (
    <div 
      ref={containerRef}
      onClick={handleContainerClick}
      onMouseMove={(e) => {
        handleDragMove(e);
        handleResizeMove(e);
      }}
      onMouseUp={() => {
        handleDragEnd();
        handleResizeEnd();
      }}
      style={{
        cursor: isDragging ? 'grabbing' : isResizing ? 'nwse-resize' : 'default',
        userSelect: 'none'
      }}
    >
      {editMode && (
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          backgroundColor: '#e6f7ff',
          padding: '12px 20px',
          borderBottom: '2px solid #1890ff',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '16px' }}>🎨</span>
              <div>
                <div style={{ fontWeight: 600, color: '#1890ff' }}>
                  Mode Édition Visuelle
                </div>
                <div style={{ fontSize: '12px', color: '#595959' }}>
                  {isResizing 
                    ? `🔧 Redimensionnement : ${resizingElement}` 
                    : isDragging
                    ? `🎯 Déplacement : ${draggingElement}`
                    : selectedElement || hoveredElement 
                    ? `Élément sélectionné : ${selectedElement || hoveredElement}` 
                    : 'Survolez un élément → Glissez pour déplacer • Coin bas-droit pour redimensionner'}
                </div>
              </div>
            </div>
            {(selectedElement || hoveredElement) && !isResizing && !isDragging && (
              <div style={{ 
                fontSize: '11px', 
                backgroundColor: '#52c41a', 
                color: 'white', 
                padding: '4px 12px', 
                borderRadius: '12px',
                fontWeight: 500
              }}>
                ✋ Prêt à éditer
              </div>
            )}
          </div>
        </div>
      )}
      
      <PDFPreview 
        sections={editMode ? interactiveSections : sections} 
        theme={theme} 
        globalTheme={globalTheme} 
      />
    </div>
  );
};

export default InteractivePDFPreview;
