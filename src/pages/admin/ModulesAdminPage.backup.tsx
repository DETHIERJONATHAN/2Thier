import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import AdminSwitch from '../../components/admin/AdminSwitch';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { NotificationManager, NotificationsContainer } from '../../components/Notifications';
import { useAuth } from '../../auth/useAuth';
import { Input, Collapse, Badge, Button, Modal, message, Space, Tooltip } from 'antd';
import { 
  CaretRightOutlined, 
  UserSwitchOutlined,
  FormOutlined, 
  ToolOutlined,
  GoogleOutlined,
  RocketOutlined,
  AppstoreOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  DragOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined
} from '@ant-design/icons';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { defaultSections } from '../../api/sections';
import { useSharedSections, SharedSection } from '../../hooks/useSharedSections';

const { Panel } = Collapse;

// Types pour les réponses API
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}

// Types
interface Organization {
  id: string;
  name: string;
}

interface Module {
  id:string;
  key: string;
  label: string;
  feature: string;
  icon: string;
  route: string;
  description: string;
  page: string;
  order: number;
  active: boolean; // global status
  organizationId: string | null; // null for global modules
  isActiveForOrg: boolean; // status for the current org
}

interface ModuleSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  order: number;
  modules: Module[];
}

type ModuleFormData = Omit<Module, 'id' | 'isActiveForOrg' | 'organizationId'> & { id?: string; isGlobal?: boolean };

// Helper/Info Component
function InfoIcon({ text }: { text: string }) {
  return (
    <span title={text} className="ml-1 cursor-help text-gray-400 hover:text-gray-600">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </span>
  );
}

function InfoBanner() {
  return (
    <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-md mb-4 text-sm">
      <h4 className="font-bold mb-2">Comment fonctionnent les modules ?</h4>
      <p className="mb-1">
        <strong>Modules Globaux :</strong> Conçus pour être disponibles pour toutes les organisations. Un super-admin peut les créer et gérer leur statut global ("Actif" / "Inactif"). Chaque organisation peut ensuite choisir de l'activer ou de le désactiver pour ses propres utilisateurs via le toggle "Activé (Orga)".
      </p>
      <p>
        <strong>Modules d'Organisation :</strong> Spécifiques à une seule organisation. Seuls les administrateurs de cette organisation (ou un super-admin dans leur contexte) peuvent les créer et les gérer. Ils ne sont pas visibles par les autres.
      </p>
    </div>
  );
}

// ModuleForm Component
function ModuleForm({ initial, onSave, onCancel, selectedOrganizationId }: { initial: ModuleFormData | null, onSave: (data: ModuleFormData, setError: (msg: string) => void) => void, onCancel: () => void, selectedOrganizationId: string | null }) {
  const { isSuperAdmin } = useAuth();

  const [form, setForm] = useState<ModuleFormData>(initial || {
    key: '', label: '', feature: '', icon: '', route: '', description: '', page: '', order: 0, active: true, isGlobal: isSuperAdmin && !selectedOrganizationId
  });
  const [error, setError] = useState('');

  useEffect(() => {
    console.log('🔄 [ModuleForm] useEffect déclenché');
    console.log('🔍 [ModuleForm] initial reçu:', initial);
    console.log('🔍 [ModuleForm] form actuel:', form);
    
    if (initial) {
      console.log('✅ [ModuleForm] Mise à jour du form avec initial:', initial);
      setForm(initial);
    } else {
      console.log('🆕 [ModuleForm] Création d\'un nouveau form');
      setForm({
        key: '', label: '', feature: '', icon: '', route: '', description: '', page: '', order: 0, active: true, isGlobal: isSuperAdmin && !selectedOrganizationId
      });
    }
  }, [initial, isSuperAdmin, selectedOrganizationId, form]); // form inclus pour respecter les deps

  return (
    <div className="border p-4 bg-gray-50 rounded mb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
        {/* Input fields... same as before */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700">Clé</label>
          <input className="border p-1 w-full mt-1" placeholder="crm, dashboard..." value={form.key} onChange={e => setForm(f => ({ ...f, key: e.target.value }))} />
          <InfoIcon text="Identifiant unique du module (ex: crm, dashboard, gestion_sav)" />
        </div>
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700">Label</label>
          <input className="border p-1 w-full mt-1" placeholder="CRM, Tableau de bord..." value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
          <InfoIcon text="Nom affiché dans l'interface (ex: CRM, Tableau de bord)" />
        </div>
        <div className="relative">
            <label className="block text-sm font-medium text-gray-700">Icône</label>
            <input className="border p-1 w-full mt-1" placeholder="Ex: FaHome" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} />
            <InfoIcon text="Nom de l'icône de react-icons (ex: FaHome, AiFillMail)" />
        </div>
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700">Route</label>
          <input className="border p-1 w-full mt-1" placeholder="/crm" value={form.route} onChange={e => setForm(f => ({ ...f, route: e.target.value }))} />
          <InfoIcon text="Chemin d'accès du module (optionnel, ex: /crm)" />
        </div>
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700">Feature</label>
          <input 
            className="border p-1 w-full mt-1" 
            placeholder="crm, dashboard..." 
            value={form.feature} 
            onChange={e => {
              console.log('🎯 [ModuleForm] Feature onChange déclenché');
              console.log('🔀 [ModuleForm] Ancienne valeur feature:', form.feature);
              console.log('🔀 [ModuleForm] Nouvelle valeur feature:', e.target.value);
              setForm(f => {
                const newForm = { ...f, feature: e.target.value };
                console.log('📝 [ModuleForm] Form mis à jour:', newForm);
                return newForm;
              });
            }} 
          />
          <InfoIcon text="Nom logique de la fonctionnalité liée (sert à la gestion des droits)." />
        </div>
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700">Page</label>
          <input className="border p-1 w-full mt-1" placeholder="LeadsPage" value={form.page} onChange={e => setForm(f => ({ ...f, page: e.target.value }))} />
          <InfoIcon text="Nom du composant/page React associé (optionnel)" />
        </div>
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700">Ordre</label>
          <input className="border p-1 w-full mt-1" type="number" placeholder="0" value={form.order} onChange={e => setForm(f => ({ ...f, order: Number(e.target.value) }))} />
          <InfoIcon text="Ordre d'affichage du module (plus petit = plus haut)" />
        </div>
        <div className="flex items-end">
            <label className="flex items-center gap-2 p-2 border rounded bg-white h-full">
                <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} /> 
                <span>Actif (global)</span>
                <InfoIcon text="Active ou désactive le module globalement pour toutes les organisations" />
            </label>
        </div>
      </div>
      {isSuperAdmin && (
        <div className="flex items-end mb-2">
            <label className="flex items-center gap-2 p-2 border rounded bg-white h-full">
                <input type="checkbox" checked={form.isGlobal} onChange={e => setForm(f => ({ ...f, isGlobal: e.target.checked }))} disabled={!isSuperAdmin || !!initial?.id} /> 
                <span>Module Global</span>
                <InfoIcon text="Un module global est disponible pour toutes les organisations. Ne peut être changé après création." />
            </label>
        </div>
      )}
      <div className="relative mb-2">
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea className="border p-1 w-full mt-1" placeholder="Description du module..." value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      </div>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <div className="flex gap-2">
        <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={() => onSave(form, setError)}>Enregistrer</button>
        <button className="bg-gray-200 px-3 py-1 rounded" onClick={onCancel}>Annuler</button>
      </div>
    </div>
  );
}

// Main Page Component
export default function ModulesAdminPage() {
  const { api } = useAuthenticatedApi();
  const { isSuperAdmin, currentOrganization } = useAuth();

  const [modules, setModules] = useState<Module[]>([]);
  const [editingModule, setEditingModule] = useState<ModuleFormData | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // États pour la gestion des sections avec localStorage
  const getSavedSections = useCallback(() => {
    try {
      const orgId = currentOrganization?.id || 'default';
      const saved = localStorage.getItem(`module-sections-${orgId}`);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des sections depuis localStorage:', error);
    }

    // Sections par défaut si rien n'est sauvegardé
    return defaultSections.map(section => ({
      id: section.title.toLowerCase().replace(/\s+/g, '_'),
      title: section.title,
      icon: section.icon === 'UserSwitchOutlined' ? <UserSwitchOutlined style={{ color: section.iconColor, fontSize: '20px' }} />
          : section.icon === 'FormOutlined' ? <FormOutlined style={{ color: section.iconColor, fontSize: '20px' }} />
          : section.icon === 'ToolOutlined' ? <ToolOutlined style={{ color: section.iconColor, fontSize: '20px' }} />
          : section.icon === 'GoogleOutlined' ? <GoogleOutlined style={{ color: section.iconColor, fontSize: '20px' }} />
          : section.icon === 'RocketOutlined' ? <RocketOutlined style={{ color: section.iconColor, fontSize: '20px' }} />
          : <AppstoreOutlined style={{ color: section.iconColor, fontSize: '20px' }} />,
      description: section.description || '',
      order: section.order,
      modules: []
    }));
  }, [currentOrganization?.id]);

  const [sections, setSections] = useState<ModuleSection[]>(getSavedSections);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [newSectionName, setNewSectionName] = useState('');

  // Filtrer les modules par ordre
  const filteredModules = useMemo(() => {
    if (!searchTerm.trim()) {
      return modules;
    }
    return modules.filter(module =>
      module.order.toString().includes(searchTerm)
    );
  }, [modules, searchTerm]);

      // 📂 Fonction pour catégoriser les modules - APRÈS NETTOYAGE BDD (17 modules restants)
  const categorizeModules = useMemo(() => {
    const categories = {
      admin: [] as Module[],
      forms: [] as Module[],
      technical: [] as Module[],
      googleWorkspace: [] as Module[],
      devis1minuteAdmin: [] as Module[],
      devis1minute: [] as Module[],
      other: [] as Module[]
    };

    filteredModules.forEach(module => {
      const key = module.key || '';
      
      // � ADMINISTRATION - Tous les admin-*
      if (key.startsWith('admin_')) {
        categories.admin.push(module);
      }
      // ⚡ DEVIS1MINUTE ADMIN - Tous les devis1minute-admin-*
      else if (key.startsWith('devis1minute_admin_')) {
        categories.devis1minuteAdmin.push(module);
      }
      // 💼 DEVIS1MINUTE - Tous les devis1minute-* (sauf admin)
      else if (key.startsWith('devis1minute_') && !key.startsWith('devis1minute_admin_')) {
        categories.devis1minute.push(module);
      }
      // 📋 FORMULAIRES - bloc uniquement
      else if (key === 'bloc') {
        categories.forms.push(module);
      }
      // 🔧 OUTILS TECHNIQUES - tableaux uniquement
      else if (key === 'tableaux') {
        categories.technical.push(module);
      }
      // 🏢 GOOGLE WORKSPACE - TOUS les modules google_*
      else if (key.startsWith('google_')) {
        categories.googleWorkspace.push(module);
      }
      // � AUTRES - dashboard, settings, modules, gestion_sav, Technique, Client, formulaire, devis, agenda, leads, mail
      else if (['dashboard', 'settings', 'modules', 'gestion_sav', 'Technique', 'Client', 'formulaire', 'devis', 'agenda', 'leads', 'mail'].includes(key)) {
        categories.other.push(module);
      }
    });

    return categories;
  }, [filteredModules]);

  // 📝 RÉFÉRENCES - Déclarées en premier pour éviter les erreurs de hoisting
  const modulesFetched = useRef(false);

  // 🔄 FONCTIONS DE DONNÉES - Déclarées AVANT les handlers pour éviter les erreurs de hoisting
  // � FONCTIONS DE DONNÉES - Déclarées AVANT les handlers pour éviter les erreurs de hoisting
  const fetchModules = useCallback(async () => {
    // Éviter les appels répétés au sein du même cycle de rendu
    if (modulesFetched.current) return;
    
    modulesFetched.current = true;
    setIsLoading(true);
    
    try {
      let response;
      
      // 👑 SUPER ADMIN : Charger TOUS les modules si aucune organisation spécifique n'est sélectionnée
      if (isSuperAdmin && (!selectedOrganizationId || selectedOrganizationId === 'null')) {
        console.log('🔥 [fetchModules] Super Admin - Chargement de TOUS les modules');
        response = await api.get('/api/modules/all'); // ← FETCH SEULEMENT, pas de modification
      } else {
        // 🏢 Chargement normal par organisation
        const orgId = selectedOrganizationId || 'null';
        console.log(`📋 [fetchModules] Chargement modules pour organisation: ${orgId}`);
        response = await api.get(`/api/modules?organizationId=${orgId}`);
      }
      
      if (response.success) {
        console.log(`✅ [fetchModules] ${response.data?.length || 0} modules chargés`);
        
        // 🔍 LOG SPÉCIFIQUE POUR LE MODULE AGENDA
  const agendaModule = (response.data as Module[] | undefined)?.find((m) => m.key === 'agenda');
        if (agendaModule) {
          console.log('🎯 [fetchModules] Module Agenda trouvé:', agendaModule);
          console.log('🎯 [fetchModules] Feature du module Agenda:', agendaModule.feature);
        }
        
        setModules(response.data || []);
      } else {
        setModules([]);
        NotificationManager.error(response.message || 'Erreur lors de la récupération des modules.');
      }
  } catch (error: unknown) {
      console.error('💥 [fetchModules] Erreur:', error);
      NotificationManager.error(error.message || 'Erreur lors de la récupération des modules.');
      setModules([]);
    } finally {
      setIsLoading(false);
      // Réinitialiser pour permettre des appels futurs si nécessaire
      modulesFetched.current = false;
    }
  }, [api, selectedOrganizationId, isSuperAdmin]);

  const reloadModules = useCallback(() => {
    modulesFetched.current = false; // Force le rechargement
    fetchModules();
  }, [fetchModules]);

  // �📝 HANDLERS - Déclarés AVANT renderModuleSection pour éviter les erreurs de hoisting
  const handleSaveModule = useCallback(async (formData: ModuleFormData, setError: (msg: string) => void) => {
    try {
      setError('');
      console.log('🔧 [handleSaveModule] Début de l\'enregistrement');
      console.log('📦 [handleSaveModule] formData reçu:', formData);
      
      const { id, isGlobal, ...data } = formData;

      // Toujours inclure la clé dans update; gérer changement global/local (super-admin seulement)
      const targetOrganizationId = isSuperAdmin && isGlobal ? null : selectedOrganizationId;
      const dataToSave = {
        ...data,
        organizationId: targetOrganizationId,
        key: data.key // explicite pour PUT
      };

      console.log('💾 [handleSaveModule] dataToSave final:', dataToSave);
      console.log('🏢 [handleSaveModule] selectedOrganizationId:', selectedOrganizationId);
      console.log('👑 [handleSaveModule] isSuperAdmin:', isSuperAdmin);

      if (!dataToSave.organizationId && !isSuperAdmin) {
        throw new Error("Vous n'avez pas les droits pour créer un module global.");
      }
      
      console.log(`🌐 [handleSaveModule] Appel API: ${id ? 'PUT' : 'POST'} /api/modules${id ? `/${id}` : ''}`);
      
      const response = id
        ? await api.put(`/api/modules/${id}`, dataToSave)
        : await api.post('/api/modules', dataToSave);

      console.log('📡 [handleSaveModule] Réponse API reçue:', response);

      if (response && response.success) {
        NotificationManager.success(`Module ${id ? 'mis à jour' : 'créé'} avec succès.`);
        console.log('✅ [handleSaveModule] Succès - Rechargement des modules...');
        reloadModules(); // ← Utilise la nouvelle fonction de rechargement
        setIsFormVisible(false);
        setEditingModule(null);
      } else {
        console.error('❌ [handleSaveModule] Échec de la réponse API:', response);
        throw new Error(response?.message || `Erreur lors de l'enregistrement du module.`);
      }
    } catch (error: unknown) {
        console.error('💥 [handleSaveModule] Erreur complète:', error);
        const message = error.message || 'Une erreur inattendue est survenue.';
        setError(message);
        NotificationManager.error(message);
      }
  }, [api, isSuperAdmin, selectedOrganizationId, reloadModules]);

  const handleToggleModuleStatus = useCallback(async (module: Module, active: boolean) => {
    if (!selectedOrganizationId) {
        NotificationManager.error("Veuillez sélectionner une organisation.");
        return;
    }
    try {
        // Le backend attend la clé `active`, et non `isActivated`.
        const response = await api.patch('/api/modules/status', {
            moduleId: module.id,
            organizationId: selectedOrganizationId,
            active: active, 
        });

        if (response.success) {
            NotificationManager.success(`Statut du module mis à jour pour l'organisation.`);
            // Met à jour l'état local du composant.
            setModules(prevModules =>
                prevModules.map(m =>
                    (m.id === module.id) ? { ...m, isActiveForOrg: active } : m
                )
            );
        } else {
            throw new Error(response.message || 'Erreur lors de la mise à jour du statut.');
        }
    } catch (error: unknown) {
          console.error('Error toggling module status:', error);
          NotificationManager.error(error.message || 'Erreur lors de la mise à jour du statut.');
      }
  }, [api, selectedOrganizationId]);

  const handleDeleteModule = useCallback(async (moduleId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce module ? Cette action est irréversible.')) {
      try {
        const response = await api.delete(`/api/modules/${moduleId}`);
        if (response.success) {
          NotificationManager.success('Module supprimé avec succès.');
          reloadModules(); // ← Utilise la nouvelle fonction de rechargement
        } else {
          throw new Error(response.message || 'Erreur lors de la suppression du module.');
        }
      } catch (error: unknown) {
        console.error('Error deleting module:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la suppression du module.';
        NotificationManager.error(errorMessage);
      }
    }
  }, [api, reloadModules]);

  const handleStartEdit = useCallback((module: Module) => {
    console.log('🚀 [handleStartEdit] Démarrage de l\'édition');
    console.log('📋 [handleStartEdit] Module cliqué:', module);
    
    // Toujours récupérer la version la plus récente du module depuis l'état
    const currentModule = modules.find(m => m.id === module.id) || module;
    console.log('🔍 [handleStartEdit] Module trouvé dans l\'état:', currentModule);
    console.log('🎯 [handleStartEdit] Feature du module actuel:', currentModule.feature);
    
    const { organizationId, ...rest } = currentModule;
    const editingData = { ...rest, isGlobal: !organizationId };
    
    console.log('📝 [handleStartEdit] Données préparées pour l\'édition:', editingData);
    console.log('🎯 [handleStartEdit] Feature dans editingData:', editingData.feature);
    
    setEditingModule(editingData);
    setIsFormVisible(true);
    
    console.log('✅ [handleStartEdit] setEditingModule appelé avec:', editingData);
  }, [modules]);

  const handleCancelEdit = useCallback(() => {
    setEditingModule(null);
    setIsFormVisible(false);
  }, []);

  const handleStartNew = useCallback(() => {
    setEditingModule(null);
    setIsFormVisible(true);
  }, []);

  // Fonction utilitaire pour sauvegarder les sections
  const saveSectionsToStorage = useCallback((sectionsToSave: ModuleSection[]) => {
    try {
      const orgId = currentOrganization?.id || 'default';
      const sectionsData = sectionsToSave.map(s => ({
        id: s.id,
        title: s.title,
        description: s.description,
        order: s.order,
        iconName: s.icon?.props?.style?.color ? 
          (s.title === 'Administration' ? 'UserSwitchOutlined' :
           s.title === 'Formulaires' ? 'FormOutlined' :
           s.title === 'Outils Techniques' ? 'ToolOutlined' :
           s.title === 'Google Workspace' ? 'GoogleOutlined' :
           s.title.includes('Devis1Minute') ? 'RocketOutlined' :
           'AppstoreOutlined') : 'AppstoreOutlined',
        iconColor: s.icon?.props?.style?.color || '#13c2c2'
      }));
      localStorage.setItem(`module-sections-${orgId}`, JSON.stringify(sectionsData));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des sections:', error);
    }
  }, [currentOrganization?.id]);

  // 🎯 HANDLERS POUR GESTION DES SECTIONS
  const handleSectionNameEdit = useCallback((sectionId: string, newName: string) => {
    setSections(prev => {
      const updated = prev.map(section => 
        section.id === sectionId 
          ? { ...section, title: newName }
          : section
      );
      saveSectionsToStorage(updated);
      return updated;
    });
    setEditingSectionId(null);
    message.success('Nom de section modifié');
  }, [saveSectionsToStorage]);

  const handleAddSection = useCallback(() => {
    const newSectionName = prompt('Nom de la nouvelle section :');
    if (!newSectionName || newSectionName.trim() === '') return;

    const newSection: ModuleSection = {
      id: `section_${Date.now()}`,
      title: newSectionName.trim(),
      icon: <AppstoreOutlined style={{ color: '#13c2c2', fontSize: '20px' }} />,
      description: 'Nouvelle section personnalisée',
      order: sections.length + 1,
      modules: []
    };

    setSections(prev => {
      const updated = [...prev, newSection];
      saveSectionsToStorage(updated);
      return updated;
    });
    message.success(`Section "${newSectionName}" ajoutée`);
  }, [sections.length, saveSectionsToStorage]);

  const handleDeleteSection = useCallback((sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;

    Modal.confirm({
      title: 'Supprimer la section',
      content: `Êtes-vous sûr de vouloir supprimer la section "${section.title}" ? Cette action est irréversible.`,
      okText: 'Supprimer',
      cancelText: 'Annuler',
      okType: 'danger',
      onOk: () => {
        setSections(prev => {
          const updated = prev.filter(s => s.id !== sectionId);
          saveSectionsToStorage(updated);
          return updated;
        });
        message.success('Section supprimée');
      }
    });
  }, [sections, saveSectionsToStorage]);

  const handleSectionReorder = useCallback((activeId: string, overId: string) => {
    setSections(prev => {
      const oldIndex = prev.findIndex(section => section.id === activeId);
      const newIndex = prev.findIndex(section => section.id === overId);
      
      if (oldIndex === -1 || newIndex === -1) return prev;
      
      const reorderedSections = arrayMove(prev, oldIndex, newIndex);
      const updated = reorderedSections.map((section, index) => ({
        ...section,
        order: index + 1
      }));
      
      saveSectionsToStorage(updated);
      return updated;
    });
    message.success('Ordre des sections sauvegardé');
  }, [saveSectionsToStorage]);

  // Sensors pour le drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 🎨 Fonction pour rendre une section de modules
  const renderModuleSection = useCallback((
    title: string,
    icon: React.ReactNode,
    modules: Module[],
    description: string
  ) => {
    if (!modules || modules.length === 0) return null;
    
    return (
      <Collapse
        key={title}
        defaultActiveKey={[]}
        expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
        className="mb-4"
      >
        <Panel
          header={
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {icon}
                <div>
                  <div className="font-semibold text-lg">{title}</div>
                  <div className="text-sm text-gray-600">{description}</div>
                </div>
              </div>
              <Badge count={modules.length} style={{ backgroundColor: '#52c41a' }} />
            </div>
          }
          key="1"
        >
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left py-2 px-3 font-semibold text-sm">Label</th>
                  <th className="text-left py-2 px-3 font-semibold text-sm">Clé</th>
                  <th className="text-left py-2 px-3 font-semibold text-sm">Ordre</th>
                  <th className="text-left py-2 px-3 font-semibold text-sm">Catégorie</th>
                  <th className="text-left py-2 px-3 font-semibold text-sm">Activé (Orga)</th>
                  <th className="text-left py-2 px-3 font-semibold text-sm">Statut</th>
                  <th className="text-left py-2 px-3 font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {modules.map((module) => {
                  const isGlobal = !module.organizationId;
                  const isSuperAdminModule = module.feature?.startsWith('super_admin_');
                  const canEdit = isSuperAdmin || !isGlobal;
                  const canDelete = isSuperAdmin || !isGlobal;

                  // Déterminer la catégorie
                  let categoryLabel = 'Organisation';
                  let categoryClass = 'bg-green-100 text-green-800';
                  
                  if (isSuperAdminModule) {
                    categoryLabel = 'Super Admin';
                    categoryClass = 'bg-yellow-100 text-yellow-800';
                  } else if (isGlobal) {
                    categoryLabel = 'Global';
                    categoryClass = 'bg-blue-100 text-blue-800';
                  }

                  return (
                    <tr key={module.id} className={`border-b hover:bg-gray-50 ${isGlobal ? 'bg-gray-25' : ''}`}>
                      <td className="py-2 px-3 font-medium">{module.label}</td>
                      <td className="py-2 px-3 font-mono text-sm">{module.key}</td>
                      <td className="py-2 px-3 text-center font-semibold">{module.order}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${categoryClass}`}>
                          {categoryLabel}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        {isGlobal ? (
                          selectedOrganizationId ? (
                            <div className="flex items-center">
                              <AdminSwitch
                                checked={module.isActiveForOrg}
                                onChange={(checked) => handleToggleModuleStatus(module, checked)}
                              />
                              <span className="ml-2 text-sm">{module.isActiveForOrg ? 'Activé' : 'Désactivé'}</span>
                            </div>
                          ) : (
                            <span className="text-gray-500 italic text-sm">Sélectionner une orga</span>
                          )
                        ) : (
                          <span className="text-gray-500 italic text-sm">N/A</span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center">
                          <AdminSwitch
                            checked={module.active}
                            onChange={() => {
                              const currentModule = modules.find(m => m.id === module.id) || module;
                              const { organizationId, ...rest } = currentModule;
                              handleSaveModule({ ...rest, active: !currentModule.active, isGlobal: !organizationId }, () => {});
                            }}
                            disabled={!canEdit}
                          />
                          <span className="ml-2 text-sm">{module.active ? 'Actif' : 'Inactif'}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => handleStartEdit(module)} 
                            className={`text-blue-600 hover:underline text-sm ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`} 
                            disabled={!canEdit}
                          >
                            Éditer
                          </button>
                          {canDelete && (
                            <button 
                              onClick={() => handleDeleteModule(module.id)} 
                              className="text-red-600 hover:underline text-sm"
                            >
                              Supprimer
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </Collapse>
    );
  }, [selectedOrganizationId, isSuperAdmin, handleToggleModuleStatus, handleSaveModule, handleStartEdit, handleDeleteModule]);

  // 🔧 Composant pour une section sortable avec gestion
  const SortableSection: React.FC<{ section: ModuleSection }> = ({ section }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
    } = useSortable({ id: section.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    const sectionModules = useMemo(() => {
      // Assigner les modules à la section basé sur la catégorisation existante
      const categories = categorizeModules;
      switch (section.id) {
        case 'admin':
          return categories.admin;
        case 'forms':
          return categories.forms;
        case 'technical':
          return categories.technical;
        case 'googleWorkspace':
          return categories.googleWorkspace;
        case 'devis1minuteAdmin':
          return categories.devis1minuteAdmin;
        case 'devis1minute':
          return categories.devis1minute;
        case 'other':
          return categories.other;
        default:
          return [];
      }
    }, [section.id]);

    if (sectionModules.length === 0) return null;

    return (
      <div ref={setNodeRef} style={style} className="mb-4">
        <Collapse
          defaultActiveKey={[]}
          expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
        >
          <Panel
            header={
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {section.icon}
                  <div>
                    {editingSectionId === section.id ? (
                      <Input
                        value={newSectionName}
                        onChange={(e) => setNewSectionName(e.target.value)}
                        onPressEnter={() => handleSectionNameEdit(section.id, newSectionName)}
                        onBlur={() => handleSectionNameEdit(section.id, newSectionName)}
                        className="font-semibold text-lg"
                        autoFocus
                      />
                    ) : (
                      <div className="font-semibold text-lg">{section.title}</div>
                    )}
                    <div className="text-sm text-gray-600">{section.description}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge count={sectionModules.length} style={{ backgroundColor: '#52c41a' }} />
                  <Space>
                    <Tooltip title="Déplacer la section">
                      <Button
                        size="small"
                        type="text"
                        icon={<DragOutlined />}
                        {...attributes}
                        {...listeners}
                        className="cursor-grab active:cursor-grabbing"
                      />
                    </Tooltip>
                    <Tooltip title="Modifier le nom">
                      <Button
                        size="small"
                        type="text"
                        icon={<EditOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSectionId(section.id);
                          setNewSectionName(section.title);
                        }}
                      />
                    </Tooltip>
                    <Tooltip title="Supprimer la section">
                      <Button
                        size="small"
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSection(section.id);
                        }}
                      />
                    </Tooltip>
                  </Space>
                </div>
              </div>
            }
            key="1"
          >
            <div className="overflow-x-auto">
              {/* Réutiliser le tableau existant */}
              <table className="min-w-full bg-white">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left py-2 px-3 font-semibold text-sm">Label</th>
                    <th className="text-left py-2 px-3 font-semibold text-sm">Clé</th>
                    <th className="text-left py-2 px-3 font-semibold text-sm">Ordre</th>
                    <th className="text-left py-2 px-3 font-semibold text-sm">Catégorie</th>
                    <th className="text-left py-2 px-3 font-semibold text-sm">Activé (Orga)</th>
                    <th className="text-left py-2 px-3 font-semibold text-sm">Statut</th>
                    <th className="text-left py-2 px-3 font-semibold text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  {sectionModules.map((module) => {
                    const isGlobal = !module.organizationId;
                    const isSuperAdminModule = module.feature?.startsWith('super_admin_');
                    const canEdit = isSuperAdmin || !isGlobal;
                    const canDelete = isSuperAdmin || !isGlobal;

                    let categoryLabel = 'Organisation';
                    let categoryClass = 'bg-green-100 text-green-800';
                    
                    if (isSuperAdminModule) {
                      categoryLabel = 'Super Admin';
                      categoryClass = 'bg-purple-100 text-purple-800';
                    } else if (isGlobal) {
                      categoryLabel = 'Global';
                      categoryClass = 'bg-blue-100 text-blue-800';
                    }

                    return (
                      <tr key={module.id} className="hover:bg-gray-50">
                        <td className="py-2 px-3 font-medium">{module.label}</td>
                        <td className="py-2 px-3 text-sm text-gray-600">{module.key}</td>
                        <td className="py-2 px-3 text-sm">{module.order}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${categoryClass}`}>
                            {categoryLabel}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          {isSuperAdminModule ? (
                            <AdminSwitch
                              checked={module.isActiveForOrg}
                              onChange={() => handleToggleModuleStatus(module.id)}
                              disabled={!isSuperAdmin}
                            />
                          ) : (
                            <span className="text-gray-500 italic text-sm">N/A</span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center">
                            <AdminSwitch
                              checked={module.active}
                              onChange={() => {
                                const currentModule = modules.find(m => m.id === module.id) || module;
                                const { organizationId, ...rest } = currentModule;
                                handleSaveModule({ ...rest, active: !currentModule.active, isGlobal: !organizationId }, () => {});
                              }}
                              disabled={!canEdit}
                            />
                            <span className="ml-2 text-sm">{module.active ? 'Actif' : 'Inactif'}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => handleStartEdit(module)} 
                              className={`text-blue-600 hover:underline text-sm ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`} 
                              disabled={!canEdit}
                            >
                              Éditer
                            </button>
                            {canDelete && (
                              <button 
                                onClick={() => handleDeleteModule(module.id)} 
                                className="text-red-600 hover:underline text-sm"
                              >
                                Supprimer
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        </Collapse>
      </div>
    );
  };

  useEffect(() => {
    if (!isSuperAdmin && currentOrganization) {
      setSelectedOrganizationId(currentOrganization.id);
    }
  }, [isSuperAdmin, currentOrganization]);

  // Référence pour suivre si le fetch a été fait (évite les appels en boucle)
  const organizationsFetched = useRef(false);
  
  const fetchOrganizations = useCallback(async () => {
    if (!isSuperAdmin) return;
    // Éviter les appels répétés
    if (organizationsFetched.current) return;
    
    organizationsFetched.current = true;
    
    try {
      const response: ApiResponse<Organization[]> = await api.get('/api/organizations');
      if (response.success) {
        const orgs = response.data || [];
        setOrganizations(orgs);
        if (!selectedOrganizationId && orgs.length > 0) {
          // Default to first org, or allow 'global' view
          // setSelectedOrganizationId(orgs[0].id);
        }
      } else {
        NotificationManager.error(response.message || 'Erreur lors de la récupération des organisations.');
      }
    } catch (error: unknown) {
      console.error('Error fetching organizations:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la récupération des organisations.';
      NotificationManager.error(errorMessage);
    }
  }, [api, isSuperAdmin, selectedOrganizationId]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  return (
    <div className="p-4">
      <NotificationsContainer />
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Gestion des Modules</h1>
        <button
          onClick={handleStartNew}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          disabled={!isSuperAdmin && !selectedOrganizationId}
        >
          Ajouter un module
        </button>
      </div>

      <InfoBanner />

      {isSuperAdmin && (
        <div className="mb-4 p-4 border rounded bg-gray-50">
          <label htmlFor="organization-select" className="block text-sm font-medium text-gray-700 mb-1">
            Contexte de l'organisation
          </label>
          <select
            id="organization-select"
            value={selectedOrganizationId || ''}
            onChange={(e) => setSelectedOrganizationId(e.target.value || null)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="">Vue Globale (créer/voir modules globaux)</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
           {selectedOrganizationId && organizations.length > 0 && (
             <p className="text-sm text-gray-600 mt-2">
                Vous agissez dans le contexte de : <strong>{organizations.find(o => o.id === selectedOrganizationId)?.name}</strong>.
             </p>
          )}
        </div>
      )}

      {isFormVisible && (
        <ModuleForm
          initial={editingModule}
          onSave={handleSaveModule}
          onCancel={handleCancelEdit}
          selectedOrganizationId={selectedOrganizationId}
        />
      )}

      {/* 📊 BARRE DE RECHERCHE GLOBALE */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <Input
              placeholder="Filtrer par ordre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              allowClear
              size="large"
              className="max-w-md"
            />
          </div>
          <div className="text-sm text-gray-600">
            {filteredModules.length} module{filteredModules.length > 1 ? 's' : ''} trouvé{filteredModules.length > 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* 📂 MODULES ORGANISÉS PAR SECTIONS */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-500">Chargement des modules...</p>
        </div>
      ) : filteredModules.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <AppstoreOutlined className="text-4xl mb-4" />
          <p className="text-lg font-medium">
            {searchTerm.trim() 
              ? `Aucun module trouvé pour l'ordre "${searchTerm}"`
              : selectedOrganizationId
                ? "Aucun module (global ou spécifique) n'est associé à cette organisation."
                : "Aucun module global trouvé. Créez-en un pour commencer."}
          </p>
        </div>
      ) : (
        <div>
          {/* Header avec bouton d'ajout de section */}
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">Sections des Modules</h2>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={handleAddSection}
              size="small"
            >
              Ajouter une section
            </Button>
          </div>

          {/* Sections avec drag & drop */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(event) => {
              const { active, over } = event;
              if (over && active.id !== over.id) {
                handleSectionReorder(active.id as string, over.id as string);
              }
            }}
          >
            <SortableContext 
              items={sections.map(s => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {sections
                  .sort((a, b) => a.order - b.order)
                  .map((section) => (
                    <SortableSection key={section.id} section={section} />
                  ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}
