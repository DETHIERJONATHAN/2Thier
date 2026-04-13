/**
 * 🏗️ PAGE BUILDER - Éditeur modulaire de documents multi-pages
 * 
 * Architecture:
 * - Onglets de pages en haut
 * - Palette de modules à gauche
 * - Preview interactive au centre
 * - Configuration du module sélectionné à droite
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Button, message, Space, Modal, Tag, Tooltip, Switch, Spin, Tabs } from 'antd';
import { 
  SaveOutlined, 
  UndoOutlined, 
  RedoOutlined, 
  EyeOutlined,
  BgColorsOutlined,
  DownloadOutlined,
  AppstoreOutlined,
  UnorderedListOutlined
} from '@ant-design/icons';
import { v4 as uuidv4 } from 'uuid';
import PageTabs from './PageTabs';
import ModulePalette from './ModulePalette';
import ModuleConfigPanel from './ModuleConfigPanel';
import PagePreview from './PagePreview';
import GridPagePreview from './GridPagePreview';
import DocumentGlobalThemeEditor from './DocumentGlobalThemeEditor';
import ThemeSelectorModal from './ThemeSelectorModal';
import BackgroundSelector from './BackgroundSelector';
import { PAGE_BACKGROUNDS, buildCustomBackgroundDataUri } from './PageBackgrounds';
import { TemplateSelector } from './TemplateSelector';
import { DocumentTemplate, instantiateTemplate } from './DocumentTemplates';
import { DocumentPage, ModuleInstance, DocumentTemplateConfig, EditorState } from './types';
import { getModuleById } from './ModuleRegistry';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useUserPreference } from '../../hooks/useUserPreference';

interface PageBuilderProps {
  templateId: string;
  initialConfig?: DocumentTemplateConfig;
  onSave?: () => void;
  onClose?: () => void;
}

const PageBuilder = ({ templateId, initialConfig, onSave, onClose }: PageBuilderProps) => {
  const { api } = useAuthenticatedApi();
  const [savedCustomBgs] = useUserPreference<Array<{ id: string; name: string; rawSvg: string }>>('customBackgrounds', []);
  
  // Détection responsive avec window.innerWidth (plus fiable dans les Drawers)
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;
  
  // État du document
  const [config, setConfig] = useState<DocumentTemplateConfig>(() => {
    if (initialConfig) return initialConfig;
    
    // Configuration par défaut avec une page vide
    return {
      id: templateId,
      name: 'Nouveau Document',
      type: 'QUOTE',
      pages: [
        {
          id: uuidv4(),
          name: 'Page 1',
          order: 0,
          modules: [],
          padding: { top: 40, right: 40, bottom: 40, left: 40 },
        }
      ],
      globalTheme: {
        primaryColor: '#1890ff',
        secondaryColor: '#52c41a',
        fontFamily: 'Inter, sans-serif',
        fontSize: 14,
      }
    };
  });

  // État de l'éditeur
  const [editorState, setEditorState] = useState<EditorState>({
    activePageId: config.pages[0]?.id || null,
    selectedModuleId: null,
    hoveredModuleId: null,
    isDragging: false,
    isResizing: false,
    draggedModuleType: null,
    history: [config],
    historyIndex: 0,
  });

  // UI States
  const [saving, setSaving] = useState(false);
  const [themeEditorOpen, setThemeEditorOpen] = useState(false);
  const [themeSelectorOpen, setThemeSelectorOpen] = useState(false);
  const [selectedThemeId, setSelectedThemeId] = useState<string | undefined>(undefined);
  const [backgroundSelectorOpen, setBackgroundSelectorOpen] = useState(false);
  const [selectedBackgroundId, setSelectedBackgroundId] = useState<string | undefined>(undefined);
  const [previewMode, setPreviewMode] = useState(false);
  const [gridMode, setGridMode] = useState(true); // Mode grille par défaut
  const [showGrid, setShowGrid] = useState(true); // Afficher la grille
  const [loading, setLoading] = useState(!initialConfig); // Chargement si pas de config initiale
  const [rightPanelWidth, setRightPanelWidth] = useState(() => Math.min(520, Math.floor(window.innerWidth * 0.35))); // Largeur du panneau de droite (35% de l'écran, max 520px)
  const [isResizingPanel, setIsResizingPanel] = useState(false); // État du redimensionnement
  const [mobileActiveTab, setMobileActiveTab] = useState<'preview' | 'modules' | 'config'>('preview'); // Onglet mobile actif
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false); // Sélecteur de templates pré-faits
  const [templateConfirmModalOpen, setTemplateConfirmModalOpen] = useState(false); // Modal de confirmation pour remplacer modules
  const [pendingTemplateToApply, setPendingTemplateToApply] = useState<DocumentTemplate | null>(null); // Template en attente de confirmation

  // Données de test pour le mode preview et l'évaluation des conditions
  const previewDocumentData = useMemo(() => ({
    lead: {
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean.dupont@example.com',
      phone: '+32 470 12 34 56',
      company: 'Entreprise Test',
      address: '123 Rue du Test, 1000 Bruxelles',
      city: 'Bruxelles',
      postalCode: '1000',
      country: 'Belgique',
    },
    quote: {
      reference: 'DEV-2024-001',
      total: 1500.00,
      totalHT: 1239.67,
      tva: 260.33,
      date: new Date().toLocaleDateString('fr-BE'),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-BE'),
    },
    org: {
      name: '2Thier',
      email: 'contact@2thier.be',
      phone: '+32 4 123 45 67',
      address: 'Rue de l\'Organisation 1, 4000 Liège',
      tva: 'BE 0123.456.789',
    },
    tbl: {}, // Sera rempli dynamiquement si un TBL est sélectionné
  }), []);

  // ============== CHARGEMENT INITIAL ==============
  useEffect(() => {
    if (initialConfig) return; // Si on a déjà une config, pas besoin de charger

    const loadSections = async () => {
      try {
        setLoading(true);
        console.log('📥 [PageBuilder] Chargement des sections pour template:', templateId);
        
        // Charger les sections existantes
        const sections = await api.get(`/api/documents/templates/${templateId}/sections`) as unknown[];
        console.log('📥 [PageBuilder] Sections chargées:', sections?.length || 0);
        
        // Charger le template pour le globalTheme
        const template = await api.get(`/api/documents/templates/${templateId}`) as unknown;
        console.log('📥 [PageBuilder] Template chargé, globalTheme:', !!template?.globalTheme, 'DocumentTheme:', !!template?.DocumentTheme);
        
        // Priorité : globalTheme > DocumentTheme (DB) > défaut
        const loadedTheme = template?.globalTheme || (template?.DocumentTheme ? {
          primaryColor: template.DocumentTheme.primaryColor,
          secondaryColor: template.DocumentTheme.secondaryColor,
          accentColor: template.DocumentTheme.accentColor,
          textColor: template.DocumentTheme.textColor,
          backgroundColor: template.DocumentTheme.backgroundColor,
          fontFamily: template.DocumentTheme.fontFamily,
          fontSize: template.DocumentTheme.fontSize,
        } : null);
        
        if (sections && sections.length > 0) {
          // Convertir les sections en pages
          const pages: DocumentPage[] = sections
            .filter((s: Record<string, unknown>) => s.type === 'MODULAR_PAGE')
            .sort((a: unknown, b: unknown) => a.order - b.order)
            .map((section: Record<string, unknown>) => ({
              id: section.config?.pageId || uuidv4(),
              name: section.config?.name || `Page ${section.order + 1}`,
              order: section.order,
              modules: section.config?.modules || [],
              padding: section.config?.padding || { top: 40, right: 40, bottom: 40, left: 40 },
              backgroundColor: section.config?.backgroundColor,
              backgroundImage: section.config?.backgroundImage,
              backgroundId: section.config?.backgroundId,
              backgroundCustomSvg: section.config?.backgroundCustomSvg,
            }));
          
          console.log('📥 [PageBuilder] Pages construites:', pages.length);
          
          if (pages.length > 0) {
            setConfig(prev => ({
              ...prev,
              pages,
              globalTheme: loadedTheme || prev.globalTheme,
            }));
            
            setEditorState(prev => ({
              ...prev,
              activePageId: pages[0].id,
            }));
          }
        }
      } catch (error) {
        console.error('❌ [PageBuilder] Erreur chargement:', error);
        message.error('Erreur lors du chargement du document');
      } finally {
        setLoading(false);
      }
    };

    loadSections();
  }, [templateId, api, initialConfig]);

  // Gestionnaire de redimensionnement du panneau de droite
  useEffect(() => {
    if (!isResizingPanel) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Calculer la nouvelle largeur depuis le bord droit de la fenêtre
      const newWidth = window.innerWidth - e.clientX;
      // Limiter entre 320px et 800px
      setRightPanelWidth(Math.min(Math.floor(window.innerWidth * 0.5), Math.max(320, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizingPanel(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingPanel]);

  // Page active
  const activePage = useMemo(() => {
    return config.pages.find(p => p.id === editorState.activePageId) || config.pages[0];
  }, [config.pages, editorState.activePageId]);

  const themeColors = useMemo(() => {
    const theme = config.globalTheme as unknown;
    return {
      primary: theme?.primaryColor || '#1890ff',
      secondary: theme?.secondaryColor || '#722ed1',
      accent: theme?.accentColor || '#fa8c16',
      text: theme?.textColor || '#000000',
      bg: theme?.backgroundColor || '#ffffff',
    };
  }, [config.globalTheme]);

  useEffect(() => {
    setSelectedBackgroundId(activePage?.backgroundId);
  }, [activePage?.backgroundId]);

  useEffect(() => {
    console.log('🔄 [PageBuilder] useEffect themeColors triggered:', themeColors);
    
    setConfig(prev => {
      let changed = false;
      const updatedPages = prev.pages.map(p => {
        if (!p.backgroundId && !p.backgroundCustomSvg) return p;
        console.log('🔄 [PageBuilder] Regenerating background for page:', p.id, 'backgroundId:', p.backgroundId);
        
        let rawSvg = p.backgroundCustomSvg;
        if (!rawSvg && p.backgroundId?.startsWith('bg_custom_')) {
          const match = Array.isArray(savedCustomBgs)
            ? savedCustomBgs.find((item) => item?.id === p.backgroundId && item?.rawSvg)
            : null;
          if (match?.rawSvg) {
            rawSvg = match.rawSvg;
          }
        }

        let nextSvg: string | null = null;
        if (rawSvg) {
          nextSvg = buildCustomBackgroundDataUri(rawSvg, themeColors);
        } else if (p.backgroundId) {
          const bg = PAGE_BACKGROUNDS.find(b => b.id === p.backgroundId);
          if (bg) {
            nextSvg = bg.svgGenerator(themeColors);
          }
        }
        if (!nextSvg) return p;
        
        // Toujours mettre à jour pour refléter les nouvelles couleurs
        changed = true;
        return {
          ...p,
          backgroundImage: nextSvg,
          backgroundColor: 'transparent',
          ...(rawSvg && !p.backgroundCustomSvg ? { backgroundCustomSvg: rawSvg } : {}),
        };
      });
      if (!changed) return prev;
      return { ...prev, pages: updatedPages };
    });
  }, [themeColors]);

  // Module sélectionné
  const selectedModule = useMemo(() => {
    if (!activePage || !editorState.selectedModuleId) return null;
    return activePage.modules.find(m => m.id === editorState.selectedModuleId);
  }, [activePage, editorState.selectedModuleId]);

  // ============== ACTIONS PAGES ==============

  const addPage = useCallback(() => {
    const newPage: DocumentPage = {
      id: uuidv4(),
      name: `Page ${config.pages.length + 1}`,
      order: config.pages.length,
      modules: [],
      padding: { top: 40, right: 40, bottom: 40, left: 40 },
    };

    setConfig(prev => ({
      ...prev,
      pages: [...prev.pages, newPage],
    }));

    setEditorState(prev => ({
      ...prev,
      activePageId: newPage.id,
    }));

    message.success('Page ajoutée');
  }, [config.pages.length]);

  const deletePage = useCallback((pageId: string) => {
    if (config.pages.length <= 1) {
      message.warning('Vous devez garder au moins une page');
      return;
    }

    const pageIndex = config.pages.findIndex(p => p.id === pageId);
    const newPages = config.pages.filter(p => p.id !== pageId);
    
    // Mettre à jour les ordres
    newPages.forEach((page, index) => {
      page.order = index;
    });

    setConfig(prev => ({
      ...prev,
      pages: newPages,
    }));

    // Sélectionner la page précédente ou suivante
    const newActiveId = newPages[Math.min(pageIndex, newPages.length - 1)]?.id;
    setEditorState(prev => ({
      ...prev,
      activePageId: newActiveId,
      selectedModuleId: null,
    }));

    message.success('Page supprimée');
  }, [config.pages]);

  const renamePage = useCallback((pageId: string, newName: string) => {
    setConfig(prev => ({
      ...prev,
      pages: prev.pages.map(p => 
        p.id === pageId ? { ...p, name: newName } : p
      ),
    }));
  }, []);

  const duplicatePage = useCallback((pageId: string) => {
    const pageToDuplicate = config.pages.find(p => p.id === pageId);
    if (!pageToDuplicate) return;

    const newPage: DocumentPage = {
      ...pageToDuplicate,
      id: uuidv4(),
      name: `${pageToDuplicate.name} (copie)`,
      order: config.pages.length,
      modules: pageToDuplicate.modules.map(m => ({
        ...m,
        id: uuidv4(),
      })),
    };

    setConfig(prev => ({
      ...prev,
      pages: [...prev.pages, newPage],
    }));

    setEditorState(prev => ({
      ...prev,
      activePageId: newPage.id,
    }));

    message.success('Page dupliquée');
  }, [config.pages]);

  const reorderPages = useCallback((newPages: DocumentPage[]) => {
    setConfig(prev => ({
      ...prev,
      pages: newPages,
    }));
  }, []);

  // ============== ACTIONS MODULES ==============

  const addModule = useCallback((moduleId: string) => {
    if (!activePage) return;

    const moduleDef = getModuleById(moduleId);
    if (!moduleDef) {
      message.error('Module non trouvé');
      return;
    }

    // Pour le module BACKGROUND, vérifier s'il existe déjà
    if (moduleId === 'BACKGROUND') {
      const existingBg = activePage.modules.find(m => m.moduleId === 'BACKGROUND');
      if (existingBg) {
        // Sélectionner le module existant
        setEditorState(prev => ({
          ...prev,
          selectedModuleId: existingBg.id,
        }));
        message.info('Fond de page sélectionné - configurez-le dans le panneau de droite');
        return;
      }
    }

    // Calculer la position initiale pour le mode grille
    // Placer les nouveaux modules en cascade
    const existingModules = activePage.modules.filter(m => m.moduleId !== 'BACKGROUND').length;
    const offsetX = (existingModules % 3) * 40; // Décalage horizontal
    const offsetY = existingModules * 30; // Décalage vertical

    // Position spéciale pour BACKGROUND : couvre toute la page
    const isBackgroundModule = moduleId === 'BACKGROUND';
    const modulePosition = isBackgroundModule 
      ? { x: 0, y: 0, width: 794, height: 1123 } // Pleine page
      : {
          x: 40 + offsetX,
          y: 40 + offsetY,
          width: 714, // PAGE_WIDTH - 80 (marges)
          height: moduleId === 'TITLE' ? 60 : moduleId === 'IMAGE' ? 200 : moduleId === 'TABLE' ? 300 : moduleId === 'KPI_BANNER' ? 160 : 100,
        };

    const newModule: ModuleInstance = {
      id: uuidv4(),
      moduleId: moduleId,
      order: isBackgroundModule ? -1 : activePage.modules.length, // BACKGROUND toujours en premier (order négatif)
      config: { ...moduleDef.defaultConfig },
      themeId: moduleDef.themes[0]?.id,
      position: modulePosition,
    };

    setConfig(prev => ({
      ...prev,
      pages: prev.pages.map(p => 
        p.id === activePage.id 
          ? { ...p, modules: [...p.modules, newModule] }
          : p
      ),
    }));

    setEditorState(prev => ({
      ...prev,
      selectedModuleId: newModule.id,
    }));

    message.success(`${moduleDef.name} ajouté`);
  }, [activePage]);

  // Fonction pour appliquer un template pré-construit à la page active
  const handleApplyTemplate = useCallback((selectedTemplate: DocumentTemplate | null) => {
    console.log('🎯 [PageBuilder] handleApplyTemplate appelé avec:', selectedTemplate?.name);
    console.log('📄 [PageBuilder] activePage:', activePage?.id, 'modules count:', activePage?.modules.length);
    setTemplateSelectorOpen(false);
    
    if (!selectedTemplate || !activePage) {
      console.warn('⚠️ [PageBuilder] Template ou page active manquant');
      return;
    }
    
    // Si la page a des modules, demander confirmation
    if (activePage.modules.length > 0) {
      console.log('⚠️ [PageBuilder] Page has', activePage.modules.length, 'existing modules - asking for confirmation');
      setPendingTemplateToApply(selectedTemplate);
      setTemplateConfirmModalOpen(true);
    } else {
      console.log('✅ [PageBuilder] Page is empty, applying template directly');
      applyTemplateToPage(selectedTemplate);
    }
  }, [activePage]);

  // Appliquer effectivement le template à la page
  const applyTemplateToPage = useCallback((template: DocumentTemplate) => {
    console.log('📋 [PageBuilder] applyTemplateToPage - Applying template:', template.name);
    if (!activePage) {
      console.warn('⚠️ [PageBuilder] No active page');
      return;
    }
    
    // Convertir les modules du template en instances
    const moduleInstances = instantiateTemplate(template);
    console.log('📦 [PageBuilder] Instantiated modules:', moduleInstances.length, 'modules');
    
    // Assigner des positions automatiques à chaque module
    const modulesWithPositions: ModuleInstance[] = moduleInstances.map((module, index) => {
      const yPosition = 40 + (index * 120); // Espacement vertical de 120px
      const positioned = {
        ...module,
        id: uuidv4(), // Regénérer un ID unique
        position: {
          x: 40,
          y: yPosition,
          width: 714, // Largeur standard (page - marges)
          height: 100, // Hauteur par défaut
        },
      };
      console.log(`📍 [PageBuilder] Module ${index}:`, {
        id: positioned.id,
        moduleId: positioned.moduleId,
        name: positioned.moduleId,
        position: positioned.position,
      });
      return positioned;
    });
    
    console.log('✨ [PageBuilder] Total modules to add:', modulesWithPositions.length);
    console.log('📄 [PageBuilder] Active page ID:', activePage.id);
    
    // Mettre à jour la page avec les nouveaux modules
    setConfig(prev => {
      console.log('🔄 [PageBuilder] setConfig called - Current pages:', prev.pages.length);
      const newConfig = {
        ...prev,
        pages: prev.pages.map(p => {
          console.log(`  Checking page ${p.id} === ${activePage.id} ?`, p.id === activePage.id);
          return p.id === activePage.id 
            ? { 
                ...p, 
                modules: modulesWithPositions,
                // Log the updated page
              }
            : p;
        }),
      };
      console.log('✅ [PageBuilder] setConfig updated, new page modules:', 
        newConfig.pages.find(p => p.id === activePage.id)?.modules.length || 0);
      return newConfig;
    });
    
    message.success(`Template "${template.name}" appliqué avec ${modulesWithPositions.length} modules !`);
  }, [activePage]);

  // Fonction pour configurer le fond de page
  const configurePageBackground = useCallback(() => {
    if (!activePage) return;

    // Chercher le module BACKGROUND existant ou en créer un
    const existingBg = activePage.modules.find(m => m.moduleId === 'BACKGROUND');
    
    if (existingBg) {
      // Sélectionner le module existant
      setEditorState(prev => ({
        ...prev,
        selectedModuleId: existingBg.id,
      }));
    } else {
      // Créer un nouveau module BACKGROUND
      addModule('BACKGROUND');
    }
  }, [activePage, addModule]);

  const deleteModule = useCallback((instanceId: string) => {
    if (!activePage) return;

    setConfig(prev => ({
      ...prev,
      pages: prev.pages.map(p => 
        p.id === activePage.id 
          ? { 
              ...p, 
              modules: p.modules
                .filter(m => m.id !== instanceId)
                .map((m, idx) => ({ ...m, order: idx }))
            }
          : p
      ),
    }));

    setEditorState(prev => ({
      ...prev,
      selectedModuleId: prev.selectedModuleId === instanceId ? null : prev.selectedModuleId,
    }));

    message.success('Module supprimé');
  }, [activePage]);

  // Dupliquer un module
  const duplicateModule = useCallback((instanceId: string) => {
    if (!activePage) return;

    const moduleToDuplicate = activePage.modules.find(m => m.id === instanceId);
    if (!moduleToDuplicate) return;

    const moduleDef = getModuleById(moduleToDuplicate.moduleId);
    if (!moduleDef) return;

    // Créer une copie avec un nouvel ID et un décalage de position
    const newModule: ModuleInstance = {
      ...moduleToDuplicate,
      id: crypto.randomUUID(),
      order: activePage.modules.length,
      position: {
        ...moduleToDuplicate.position,
        x: Math.min(moduleToDuplicate.position.x + 20, 794 - moduleToDuplicate.position.width),
        y: Math.min(moduleToDuplicate.position.y + 20, 1123 - moduleToDuplicate.position.height),
      },
      config: { ...moduleToDuplicate.config },
    };

    setConfig(prev => ({
      ...prev,
      pages: prev.pages.map(p => 
        p.id === activePage.id 
          ? { ...p, modules: [...p.modules, newModule] }
          : p
      ),
    }));

    // Sélectionner le nouveau module
    setEditorState(prev => ({
      ...prev,
      selectedModuleId: newModule.id,
    }));

    message.success('Module dupliqué');
  }, [activePage]);

  const updateModule = useCallback((instanceId: string, updates: Partial<ModuleInstance>) => {
    if (!activePage) return;

    setConfig(prev => {
      // IMPORTANT: Trouver la page et le module dans 'prev', pas dans 'activePage' (qui peut être stale)
      const currentPage = prev.pages.find(p => p.id === activePage.id);
      const currentModule = currentPage?.modules.find(m => m.id === instanceId);
      
      console.log('🔄 [updateModule] instanceId:', instanceId);
      console.log('🔄 [updateModule] currentPage found:', !!currentPage);
      console.log('🔄 [updateModule] currentModule?.moduleId:', currentModule?.moduleId);
      console.log('🔄 [updateModule] updates keys:', Object.keys(updates));
      console.log('🔄 [updateModule] has updates.config:', !!updates.config);
      
      let pageBackgroundUpdates: { backgroundColor?: string; backgroundImage?: string } = {};
      
      // DEBUG: Vérifier la comparaison
      const moduleIdValue = currentModule?.moduleId;
      const isBackground = moduleIdValue === 'BACKGROUND';
      console.log('🔍 [DEBUG] moduleIdValue:', moduleIdValue, 'type:', typeof moduleIdValue);
      console.log('🔍 [DEBUG] isBackground:', isBackground);
      console.log('🔍 [DEBUG] moduleIdValue === "BACKGROUND":', moduleIdValue === 'BACKGROUND');
      console.log('🔍 [DEBUG] String comparison:', String(moduleIdValue) === 'BACKGROUND');
      
      // Si c'est un module BACKGROUND, synchroniser avec le fond de page
      if (isBackground) {
        console.log('*** BACKGROUND SYNC *** Module détecté!');
        
        const config = { ...currentModule.config, ...updates.config };
        // IMPORTANT: Si pas de themeId explicite, déduire du contenu
        let themeId = updates.themeId || currentModule.themeId;
        
        // Si themeId n'est pas défini mais qu'on a une image, c'est un thème image
        if (!themeId && config.image && config.image.startsWith('data:')) {
          themeId = 'image';
          console.log('*** BACKGROUND SYNC *** ThemeId déduit: image (car base64 présent)');
        }
        
        console.log('*** BACKGROUND SYNC *** ThemeId:', themeId);
        console.log('*** BACKGROUND SYNC *** Config keys:', Object.keys(config));
        console.log('*** BACKGROUND SYNC *** Has image:', !!config.image);
        console.log('*** BACKGROUND SYNC *** Image starts with:', config.image ? config.image.substring(0, 50) : 'NONE');
        
        // Valider que l'image n'est pas une URL locale file:///
        const imageUrl = config.image;
        const isValidImage = imageUrl && (
          imageUrl.startsWith('data:') || 
          imageUrl.startsWith('http://') || 
          imageUrl.startsWith('https://') ||
          imageUrl.startsWith('linear-gradient') ||
          imageUrl.startsWith('radial-gradient')
        );
        
        console.log('*** BACKGROUND SYNC *** isValidImage:', isValidImage);
        console.log('*** BACKGROUND SYNC *** themeId === "image":', themeId === 'image');
        
        if (themeId === 'image' && isValidImage) {
          console.log('*** BACKGROUND SYNC *** ✅ APPLYING background image to page!');
          pageBackgroundUpdates.backgroundImage = config.image;
          console.log('*** BACKGROUND SYNC *** pageBackgroundUpdates LENGTH:', pageBackgroundUpdates.backgroundImage?.length);
        } else if (themeId === 'solid' || themeId === 'color') {
          pageBackgroundUpdates.backgroundColor = config.color;
          pageBackgroundUpdates.backgroundImage = undefined;
        } else if (themeId === 'gradient') {
          // Pour gradient, on utilise un gradient CSS comme background
          const gradientStart = config.gradientStart || '#1890ff';
          const gradientEnd = config.gradientEnd || '#52c41a';
          const gradientAngle = config.gradientAngle || 45;
          pageBackgroundUpdates.backgroundImage = `linear-gradient(${gradientAngle}deg, ${gradientStart}, ${gradientEnd})`;
        } else {
          console.log('*** BACKGROUND SYNC *** ❌ Conditions not met - themeId:', themeId, 'isValidImage:', isValidImage);
        }
        
        console.log('*** BACKGROUND SYNC *** Final pageBackgroundUpdates keys:', Object.keys(pageBackgroundUpdates));
      }

      return {
        ...prev,
        pages: prev.pages.map(p => 
          p.id === activePage.id 
            ? { 
                ...p,
                // Appliquer les mises à jour du fond de page si c'est un module BACKGROUND
                ...pageBackgroundUpdates,
                ...(isBackground && (pageBackgroundUpdates.backgroundImage !== undefined || pageBackgroundUpdates.backgroundColor !== undefined)
                  ? { backgroundId: undefined, backgroundCustomSvg: undefined }
                  : {}),
                modules: p.modules.map(m => 
                  m.id === instanceId ? { ...m, ...updates } : m
                )
              }
            : p
        ),
      };
    });
  }, [activePage]);

  const reorderModules = useCallback((newModules: ModuleInstance[]) => {
    if (!activePage) return;

    setConfig(prev => ({
      ...prev,
      pages: prev.pages.map(p => 
        p.id === activePage.id ? { ...p, modules: newModules } : p
      ),
    }));
  }, [activePage]);

  // ============== DRAG & DROP ==============

  const handleModuleDragStart = useCallback((moduleId: string) => {
    setEditorState(prev => ({
      ...prev,
      isDragging: true,
      draggedModuleType: moduleId,
    }));
  }, []);

  const handleModuleDragEnd = useCallback(() => {
    setEditorState(prev => ({
      ...prev,
      isDragging: false,
      draggedModuleType: null,
    }));
  }, []);

  const handlePageDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const moduleId = e.dataTransfer.getData('moduleId');
    if (moduleId) {
      addModule(moduleId);
    }
    handleModuleDragEnd();
  }, [addModule, handleModuleDragEnd]);

  // ============== SAUVEGARDE ==============

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      console.log('💾 [handleSave] Début sauvegarde, pages:', config.pages.length);

      // Récupérer toutes les sections existantes
      const existingSections = await api.get(`/api/documents/templates/${templateId}/sections`) as unknown[];
      console.log('💾 [handleSave] Sections existantes:', existingSections?.length || 0);

      // Convertir la config en sections pour le backend existant
      for (const page of config.pages) {
        console.log('💾 [handleSave] Traitement page:', page.id, page.name, 'modules:', page.modules.length);
        
        const sectionData = {
          type: 'MODULAR_PAGE',
          order: page.order,
          config: {
            pageId: page.id,
            name: page.name,
            modules: page.modules,
            padding: page.padding,
            backgroundColor: page.backgroundColor,
            backgroundImage: page.backgroundImage,
            backgroundId: page.backgroundId,
            backgroundCustomSvg: page.backgroundCustomSvg,
          },
        };

        // Chercher si la section existe déjà par pageId
        const existing = existingSections?.find((s: Record<string, unknown>) => s.config?.pageId === page.id);
        console.log('💾 [handleSave] Section existante trouvée:', !!existing, existing?.id);

        if (existing) {
          console.log('💾 [handleSave] PUT section:', existing.id);
          await api.put(`/api/documents/templates/${templateId}/sections/${existing.id}`, sectionData);
        } else {
          console.log('💾 [handleSave] POST nouvelle section');
          await api.post(`/api/documents/templates/${templateId}/sections`, sectionData);
        }
      }

      // Supprimer les sections qui ne sont plus dans config.pages
      const currentPageIds = config.pages.map(p => p.id);
      for (const section of existingSections || []) {
        if (section.type === 'MODULAR_PAGE' && section.config?.pageId && !currentPageIds.includes(section.config.pageId)) {
          console.log('💾 [handleSave] DELETE section orpheline:', section.id);
          await api.delete(`/api/documents/templates/${templateId}/sections/${section.id}`);
        }
      }

      // Sauvegarder le thème global
      console.log('💾 [handleSave] PUT globalTheme');
      await api.put(`/api/documents/templates/${templateId}`, {
        globalTheme: config.globalTheme,
      });

      message.success('Document sauvegardé !');
      onSave?.();
    } catch (error) {
      console.error('❌ [handleSave] Erreur sauvegarde:', error);
      message.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }, [api, config, templateId, onSave]);

  // ============== AUTO-SAVE (debounced 1.5s) ==============
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);
  const configJsonRef = useRef<string>('');

  useEffect(() => {
    // Ne pas sauvegarder au premier rendu ni pendant le chargement
    if (isFirstRender.current || loading) {
      isFirstRender.current = false;
      try { configJsonRef.current = JSON.stringify(config); } catch {}
      return;
    }
    // Vérifier que la config a VRAIMENT changé (comparaison JSON)
    let newJson = '';
    try { newJson = JSON.stringify(config); } catch {}
    if (newJson === configJsonRef.current) return;
    configJsonRef.current = newJson;

    // Debounce : sauvegarder 1.5s après le dernier changement
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      console.log('💾 [AUTO-SAVE] ★ Sauvegarde automatique déclenchée ★');
      handleSave();
    }, 1500);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [config]); // eslint-disable-line react-hooks/exhaustive-deps

  // ============== RENDER ==============

  // Afficher le chargement
  if (loading) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#141414',
        color: '#fff',
      }}>
        <Spin size="large" tip="Chargement du document..." />
      </div>
    );
  }

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#141414',
    }}>
      {/* HEADER */}
      <div style={{
        backgroundColor: '#1f1f1f',
        borderBottom: '1px solid #333',
        padding: isMobile ? '8px 12px' : '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '16px' }}>
          <h2 style={{ margin: 0, color: '#fff', fontSize: isMobile ? '14px' : '18px', fontWeight: 600 }}>
            🏗️ {isMobile ? 'Builder' : 'Page Builder'}
          </h2>
          {!isMobile && (
            <>
              <Tag color="blue">{config.pages.length} {config.pages.length > 1 ? 'pages' : 'page'}</Tag>
              <Tag color="purple">
                {config.pages.reduce((acc, p) => acc + p.modules.length, 0)} modules
              </Tag>
            </>
          )}
        </div>

        <Space size={isMobile ? 'small' : 'middle'}>
          {/* Undo/Redo - seulement desktop */}
          {!isMobile && (
            <>
              <Tooltip title="Annuler">
                <Button icon={<UndoOutlined />} disabled size={isMobile ? 'small' : 'middle'} />
              </Tooltip>
              <Tooltip title="Rétablir">
                <Button icon={<RedoOutlined />} disabled size={isMobile ? 'small' : 'middle'} />
              </Tooltip>
              <div style={{ width: 1, height: 24, backgroundColor: '#333' }} />
            </>
          )}

          {/* Toggle Mode Grille / Liste - desktop only */}
          {!isMobile && (
            <>
              <Tooltip title={gridMode ? 'Mode Liste (vertical)' : 'Mode Grille (libre)'}>
                <Space.Compact>
                  <Button 
                    type={gridMode ? 'primary' : 'default'}
                    icon={<AppstoreOutlined />} 
                    onClick={() => setGridMode(true)}
                  />
                  <Button 
                    type={!gridMode ? 'primary' : 'default'}
                    icon={<UnorderedListOutlined />} 
                    onClick={() => setGridMode(false)}
                  />
                </Space.Compact>
              </Tooltip>

              {gridMode && (
                <Switch 
                  checked={showGrid} 
                  onChange={setShowGrid}
                  checkedChildren="Grille"
                  unCheckedChildren="Grille"
                  size="small"
                />
              )}

              <div style={{ width: 1, height: 24, backgroundColor: '#333' }} />

              <Button 
                icon={<span style={{ fontSize: '14px' }}>🎨</span>} 
                onClick={() => setBackgroundSelectorOpen(true)}
              >
                Fond
              </Button>

              <Button 
                icon={<BgColorsOutlined />} 
                onClick={() => setThemeSelectorOpen(true)}
              >
                Thème
              </Button>
            </>
          )}

          <Tooltip title="Prévisualiser">
            <Button 
              icon={<EyeOutlined />} 
              onClick={() => setPreviewMode(true)}
              size={isMobile ? 'small' : 'middle'}
            />
          </Tooltip>

          <Button 
            type="primary" 
            icon={<SaveOutlined />} 
            loading={saving}
            onClick={handleSave}
            size={isMobile ? 'small' : 'middle'}
          />

          {onClose && (
            <Button onClick={onClose} size={isMobile ? 'small' : 'middle'}>
              ✕
            </Button>
          )}
        </Space>
      </div>

      {/* PAGE TABS - desktop only */}
      {!isMobile && (
        <PageTabs
          pages={config.pages}
          activePageId={editorState.activePageId}
          onPageSelect={(pageId) => setEditorState(prev => ({ 
            ...prev, 
            activePageId: pageId,
            selectedModuleId: null,
          }))}
          onPageAdd={addPage}
          onPageDelete={deletePage}
          onPageRename={renamePage}
          onPageDuplicate={duplicatePage}
          onPagesReorder={reorderPages}
        />
      )}

      {/* ============ MOBILE: 3 ONGLETS ============ */}
      {isMobile ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Onglets mobiles */}
          <Tabs
            activeKey={mobileActiveTab}
            onChange={(key) => setMobileActiveTab(key as 'preview' | 'modules' | 'config')}
            centered
            size="small"
            style={{ 
              backgroundColor: '#1f1f1f',
              marginBottom: 0,
            }}
            items={[
              {
                key: 'preview',
                label: '📄 Preview',
              },
              {
                key: 'modules',
                label: '📦 Modules',
              },
              {
                key: 'config',
                label: selectedModule ? '⚙️ Config' : '⚙️ —',
                disabled: !selectedModule,
              },
            ]}
          />

          {/* Sélecteur de page sur mobile */}
          {mobileActiveTab === 'preview' && (
            <div style={{ 
              padding: '8px 12px', 
              backgroundColor: '#1a1a1a',
              borderBottom: '1px solid #333',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              overflowX: 'auto',
            }}>
              {config.pages.map((page, idx) => (
                <Button
                  key={page.id}
                  type={editorState.activePageId === page.id ? 'primary' : 'default'}
                  size="small"
                  onClick={() => setEditorState(prev => ({ ...prev, activePageId: page.id, selectedModuleId: null }))}
                  style={{ minWidth: '60px' }}
                >
                  {idx + 1}. {page.name.substring(0, 8)}
                </Button>
              ))}
              <Button 
                size="small" 
                type="dashed"
                onClick={addPage}
                icon={<span>+</span>}
              />
            </div>
          )}

          {/* Contenu de l'onglet actif */}
          <div style={{ flex: 1, overflow: 'auto', backgroundColor: mobileActiveTab === 'preview' ? '#0a0a0a' : '#1f1f1f' }}>
            {/* PREVIEW */}
            {mobileActiveTab === 'preview' && activePage && (
              <div style={{ 
                padding: '10px', 
                display: 'flex', 
                justifyContent: 'center',
                minHeight: '100%',
              }}>
                <div style={{ 
                  transform: 'scale(0.42)', 
                  transformOrigin: 'top center',
                  width: '794px',
                }}>
                  <GridPagePreview
                    page={activePage}
                    globalTheme={config.globalTheme}
                    selectedModuleId={editorState.selectedModuleId}
                    hoveredModuleId={editorState.hoveredModuleId}
                    isDragging={false}
                    showGrid={false}
                    previewMode={false}
                    documentData={previewDocumentData}
                    onModuleSelect={(id) => {
                      setEditorState(prev => ({ ...prev, selectedModuleId: id }));
                      if (id) setMobileActiveTab('config');
                    }}
                    onModuleHover={(id) => setEditorState(prev => ({ ...prev, hoveredModuleId: id }))}
                    onModuleDelete={deleteModule}
                    onModuleDuplicate={duplicateModule}
                    onModuleUpdate={updateModule}
                    onModulesReorder={reorderModules}
                  />
                </div>
              </div>
            )}

            {/* MODULES */}
            {mobileActiveTab === 'modules' && (
              <ModulePalette
                onModuleDragStart={handleModuleDragStart}
                onModuleDragEnd={handleModuleDragEnd}
                onModuleClick={(moduleId) => {
                  addModule(moduleId);
                  setMobileActiveTab('preview');
                }}
                onApplyTemplate={() => {
                  console.log('📋 [PageBuilder] Opening TemplateSelector via mobile ModulePalette');
                  setTemplateSelectorOpen(true);
                }}
              />
            )}

            {/* CONFIG */}
            {mobileActiveTab === 'config' && selectedModule && (
              <ModuleConfigPanel
                moduleInstance={selectedModule}
                onUpdate={(updates) => updateModule(selectedModule.id, updates)}
                onDelete={() => {
                  deleteModule(selectedModule.id);
                  setEditorState(prev => ({ ...prev, selectedModuleId: null }));
                  setMobileActiveTab('preview');
                }}
              />
            )}
          </div>
        </div>
      ) : (
        /* ============ DESKTOP: 3 COLONNES ============ */
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
          {/* LEFT - Module Palette */}
          <div style={{ 
            width: isTablet ? '180px' : '220px', 
            minWidth: isTablet ? '180px' : '220px',
            borderRight: '1px solid #333',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#1f1f1f',
          }}>
            <ModulePalette
              onModuleDragStart={handleModuleDragStart}
              onModuleDragEnd={handleModuleDragEnd}
              onModuleClick={addModule}
              onApplyTemplate={() => {
                console.log('📋 [PageBuilder] Opening TemplateSelector via desktop ModulePalette');
                setTemplateSelectorOpen(true);
              }}
            />
          </div>

          {/* CENTER - Page Preview */}
          <div 
            style={{ 
              flex: selectedModule ? '0 1 auto' : 1,
              minWidth: 0,
              backgroundColor: '#0a0a0a',
              overflow: 'auto',
              padding: '20px',
              position: 'relative',
              display: 'flex',
              justifyContent: 'center',
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'copy';
            }}
            onDrop={handlePageDrop}
          >
            <div style={{ 
              transform: isTablet ? 'scale(0.55)' : 'scale(1)', 
              transformOrigin: 'top center',
            }}>
              {activePage && gridMode ? (
                <GridPagePreview
                  page={activePage}
                  globalTheme={config.globalTheme}
                  selectedModuleId={editorState.selectedModuleId}
                  hoveredModuleId={editorState.hoveredModuleId}
                  isDragging={editorState.isDragging}
                  showGrid={showGrid}
                  previewMode={previewMode}
                  documentData={previewDocumentData}
                  onModuleSelect={(id) => setEditorState(prev => ({ ...prev, selectedModuleId: id }))}
                  onModuleHover={(id) => setEditorState(prev => ({ ...prev, hoveredModuleId: id }))}
                  onModuleDelete={deleteModule}
                  onModuleDuplicate={duplicateModule}
                  onModuleUpdate={updateModule}
                  onModulesReorder={reorderModules}
                />
              ) : activePage ? (
                <PagePreview
                  page={activePage}
                  globalTheme={config.globalTheme}
                  selectedModuleId={editorState.selectedModuleId}
                  hoveredModuleId={editorState.hoveredModuleId}
                  isDragging={editorState.isDragging}
                  onModuleSelect={(id) => setEditorState(prev => ({ ...prev, selectedModuleId: id }))}
                  onModuleHover={(id) => setEditorState(prev => ({ ...prev, hoveredModuleId: id }))}
                  onModuleDelete={deleteModule}
                  onModuleUpdate={updateModule}
                  onModulesReorder={reorderModules}
                />
              ) : null}
            </div>

            {/* Drop zone indicator */}
            {editorState.isDragging && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(24, 144, 255, 0.1)',
                border: '3px dashed #1890ff',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                pointerEvents: 'none',
              }}>
                <div style={{
                  backgroundColor: '#1890ff',
                  color: '#fff',
                  padding: '16px 32px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 600,
                }}>
                  📥 Déposez le module ici
                </div>
              </div>
            )}
          </div>

          {/* RIGHT - Module Config Panel */}
          {selectedModule && (
            <div style={{ 
              flex: 1,
              minWidth: '320px',
              maxWidth: '50vw',
              borderLeft: '1px solid #333',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#1f1f1f',
              overflow: 'hidden',
              position: 'relative',
            }}>
              {/* Barre de redimensionnement */}
              <div
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsResizingPanel(true);
                  document.body.style.cursor = 'col-resize';
                  document.body.style.userSelect = 'none';
                }}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: '6px',
                  cursor: 'col-resize',
                  backgroundColor: isResizingPanel ? '#1890ff' : 'transparent',
                  transition: 'background-color 0.2s',
                  zIndex: 10,
                }}
              />
              {/* Header du panneau */}
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid #333',
                backgroundColor: '#1a1a1a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <span style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>
                  ⚙️ Configuration - {getModuleById(selectedModule.moduleId)?.name}
                </span>
                <Button 
                  type="text" 
                  size="small" 
                  onClick={() => setEditorState(prev => ({ ...prev, selectedModuleId: null }))}
                  style={{ color: '#888' }}
                >
                  ✕
                </Button>
              </div>
              {/* Contenu scrollable */}
              <div style={{ flex: 1, overflow: 'auto' }}>
                <ModuleConfigPanel
                  moduleInstance={selectedModule}
                  onUpdate={(updates) => updateModule(selectedModule.id, updates)}
                  onDelete={() => {
                    deleteModule(selectedModule.id);
                    setEditorState(prev => ({ ...prev, selectedModuleId: null }));
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Theme Editor Modal */}
      <DocumentGlobalThemeEditor
        open={themeEditorOpen}
        onClose={() => setThemeEditorOpen(false)}
        onSave={(theme) => {
          setConfig(prev => ({ ...prev, globalTheme: theme as unknown }));
          setThemeEditorOpen(false);
          message.success('Thème mis à jour');
        }}
        initialTheme={config.globalTheme as unknown}
      />

      {/* Theme Selector Modal - 8 Professional Themes */}
      <ThemeSelectorModal
        open={themeSelectorOpen}
        currentThemeId={selectedThemeId}
        onThemeSelected={(theme) => {
          console.log('🎨 [PageBuilder] Theme selected:', theme);
          
          // Appliquer le thème sélectionné au globalTheme du config
          setConfig(prev => {
            const updated = {
              ...prev,
              globalTheme: {
                primaryColor: theme.primaryColor,
                secondaryColor: theme.secondaryColor,
                accentColor: theme.accentColor,
                textColor: theme.textColor,
                backgroundColor: theme.backgroundColor,
                fontFamily: theme.fontFamily,
                fontSize: theme.fontSize,
              }
            };
            console.log('✨ [PageBuilder] Theme applied to config:', updated.globalTheme);
            return updated;
          });
          
          setSelectedThemeId(theme.id);
          setThemeSelectorOpen(false);
          message.success(`✨ Thème "${theme.name}" appliqué au document`);
        }}
        onCancel={() => setThemeSelectorOpen(false)}
        title="🎨 Sélectionner un thème pour votre document"
      />

      {/* Background Selector Modal - Backgrounds adaptatifs aux thèmes */}
      <BackgroundSelector
        open={backgroundSelectorOpen}
        onClose={() => setBackgroundSelectorOpen(false)}
        onSelect={(backgroundId, backgroundSvg, rawSvg) => {
          console.log('🖼️ [PageBuilder] Background selected:', backgroundId);
          console.log('🖼️ [PageBuilder] SVG length:', backgroundSvg?.length || 0);
          
          // Appliquer le background à la page active, pas au globalTheme
          if (activePage) {
            setConfig(prev => {
              console.log('🖼️ [PageBuilder] Applying background to active page:', activePage.id);
              return {
                ...prev,
                pages: prev.pages.map(p => 
                  p.id === activePage.id 
                    ? {
                        ...p,
                        backgroundImage: backgroundSvg,
                        backgroundId,
                        backgroundCustomSvg: rawSvg,
                        // FIX: Set backgroundColor to transparent when SVG is applied
                        backgroundColor: 'transparent',
                      }
                    : p
                ),
              };
            });
          }
          
          setSelectedBackgroundId(backgroundId);
          message.success(`🖼️ Fond appliqué au document !`);
        }}
        globalTheme={config.globalTheme}
        selectedBackgroundId={selectedBackgroundId}
      />

      {/* Preview Mode Modal */}
      <Modal
        title="📄 Aperçu du document"
        open={previewMode}
        onCancel={() => setPreviewMode(false)}
        width="90vw"
        style={{ top: 20 }}
        styles={{ 
          body: { 
            maxHeight: 'calc(100vh - 200px)', 
            overflowY: 'auto',
            padding: 0,
          } 
        }}
        footer={[
          <Button key="close" onClick={() => setPreviewMode(false)}>
            Fermer
          </Button>,
          <Button 
            key="pdf" 
            type="primary" 
            icon={<DownloadOutlined />}
            onClick={async () => {
              try {
                message.loading({ content: 'Génération du PDF...', key: 'pdf-gen' });
                
                // Appeler l'API pour générer le PDF avec la config actuelle
                const response = await fetch(`/api/documents/templates/${templateId}/preview-pdf`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-organization-id': localStorage.getItem('organizationId') || '',
                  },
                  body: JSON.stringify({
                    pages: config.pages,
                    globalTheme: config.globalTheme,
                  }),
                });

                if (!response.ok) {
                  const error = await response.json();
                  throw new Error(error.error || 'Erreur lors de la génération du PDF');
                }

                // Télécharger le PDF
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `apercu-document-${templateId}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                message.success({ content: '✅ PDF téléchargé !', key: 'pdf-gen' });
              } catch (error: unknown) {
                console.error('❌ Erreur génération PDF:', error);
                message.error({ content: `Erreur: ${error.message}`, key: 'pdf-gen' });
              }
            }}
          >
            Télécharger PDF
          </Button>,
        ]}
      >
        <div style={{ 
          backgroundColor: '#f5f5f5',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          {config.pages.map((page) => (
            <div key={page.id} style={{ marginBottom: '20px' }}>
              <GridPagePreview
                page={page}
                globalTheme={config.globalTheme}
                selectedModuleId={null}
                hoveredModuleId={null}
                isDragging={false}
                showGrid={false}
                gridSize={20}
                previewMode={true}
              />
            </div>
          ))}
        </div>
      </Modal>

      {/* Template Selector Modal */}
      {templateSelectorOpen && console.log('🎨 [PageBuilder] TemplateSelector modal is now VISIBLE')}
      <TemplateSelector
        visible={templateSelectorOpen}
        onClose={() => {
          console.log('❌ [PageBuilder] TemplateSelector closed');
          setTemplateSelectorOpen(false);
        }}
        onSelectTemplate={handleApplyTemplate}
      />

      {/* Confirmation Modal - Remplacer modules existants */}
      <Modal
        title="Remplacer le contenu existant ?"
        open={templateConfirmModalOpen}
        onOk={() => {
          console.log('✅ [PageBuilder] User confirmed replacement - proceeding');
          if (pendingTemplateToApply) {
            applyTemplateToPage(pendingTemplateToApply);
            setPendingTemplateToApply(null);
          }
          setTemplateConfirmModalOpen(false);
        }}
        onCancel={() => {
          console.log('❌ [PageBuilder] User cancelled template replacement');
          setPendingTemplateToApply(null);
          setTemplateConfirmModalOpen(false);
        }}
        okText="Remplacer"
        cancelText="Annuler"
        okButtonProps={{ danger: true }}
      >
        <p>Cette action va remplacer tous les modules de la page actuelle par ceux du template sélectionné.</p>
        <p><strong>Cette action ne peut pas être annulée.</strong></p>
      </Modal>
    </div>
  );
};

export default PageBuilder;
