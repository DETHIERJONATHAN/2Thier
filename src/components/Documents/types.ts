/**
 * 📄 TYPES - Définitions des types pour le système de pages modulaires
 */

/**
 * Instance d'un module sur une page
 */
export interface ModuleInstance {
  id: string;                    // ID unique de l'instance
  moduleId: string;              // Référence au type de module (ex: 'TITLE', 'IMAGE')
  order: number;                 // Position sur la page
  config: Record<string, unknown>;   // Configuration du module
  themeId?: string;              // ID du thème appliqué
  // Positionnement
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  // Visibilité
  hidden?: boolean;
}

/**
 * Page du document
 */
export interface DocumentPage {
  id: string;
  name: string;
  order: number;
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundId?: string;
  backgroundCustomSvg?: string;
  modules: ModuleInstance[];
  // Marges de la page
  padding?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

/**
 * Template de document complet (multi-pages)
 */
export interface DocumentTemplateConfig {
  id: string;
  name: string;
  description?: string;
  type: 'QUOTE' | 'INVOICE' | 'ORDER' | 'CONTRACT' | 'PRESENTATION';
  pages: DocumentPage[];
  // Thème global
  globalTheme: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    fontSize: number;
  };
  // Métadonnées
  createdAt?: string;
  updatedAt?: string;
}

/**
 * État de l'éditeur
 */
export interface EditorState {
  activePageId: string | null;
  selectedModuleId: string | null;
  hoveredModuleId: string | null;
  isDragging: boolean;
  isResizing: boolean;
  draggedModuleType: string | null;
  history: DocumentTemplateConfig[];
  historyIndex: number;
}

/**
 * Actions disponibles sur les pages
 */
export type PageAction = 
  | { type: 'ADD_PAGE'; payload: { name?: string } }
  | { type: 'DELETE_PAGE'; payload: { pageId: string } }
  | { type: 'RENAME_PAGE'; payload: { pageId: string; name: string } }
  | { type: 'REORDER_PAGES'; payload: { pages: DocumentPage[] } }
  | { type: 'SET_ACTIVE_PAGE'; payload: { pageId: string } }
  | { type: 'UPDATE_PAGE_BACKGROUND'; payload: { pageId: string; backgroundColor?: string; backgroundImage?: string } };

/**
 * Actions disponibles sur les modules
 */
export type ModuleAction =
  | { type: 'ADD_MODULE'; payload: { pageId: string; moduleId: string; config?: Record<string, unknown> } }
  | { type: 'DELETE_MODULE'; payload: { pageId: string; instanceId: string } }
  | { type: 'UPDATE_MODULE'; payload: { pageId: string; instanceId: string; updates: Partial<ModuleInstance> } }
  | { type: 'REORDER_MODULES'; payload: { pageId: string; modules: ModuleInstance[] } }
  | { type: 'MOVE_MODULE_TO_PAGE'; payload: { fromPageId: string; toPageId: string; instanceId: string } }
  | { type: 'DUPLICATE_MODULE'; payload: { pageId: string; instanceId: string } }
  | { type: 'SET_MODULE_THEME'; payload: { pageId: string; instanceId: string; themeId: string } };
