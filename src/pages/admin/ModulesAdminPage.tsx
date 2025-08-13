import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import AdminSwitch from '../../components/admin/AdminSwitch';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { NotificationManager, NotificationsContainer } from '../../components/Notifications';
import { useAuth } from '../../auth/useAuth';
import { Input } from 'antd';

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
  }, [initial, isSuperAdmin, selectedOrganizationId]); // form non inclus volontairement (setForm gère state)

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

  // Filtrer les modules par ordre
  const filteredModules = useMemo(() => {
    if (!searchTerm.trim()) {
      return modules;
    }
    return modules.filter(module =>
      module.order.toString().includes(searchTerm)
    );
  }, [modules, searchTerm]);

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

  // Référence pour suivre si le fetch des modules a été fait
  const modulesFetched = useRef(false);
  
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

  // 🔄 RECHARGER SEULEMENT APRÈS UNE MODIFICATION
  const reloadModules = useCallback(() => {
    modulesFetched.current = false; // Force le rechargement
    fetchModules();
  }, [fetchModules]);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  const handleSaveModule = async (formData: ModuleFormData, setError: (msg: string) => void) => {
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
  };

  const handleToggleModuleStatus = async (module: Module, active: boolean) => {
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
  };

  const handleDeleteModule = async (moduleId: string) => {
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
  };

  const handleCancelEdit = () => {
    setEditingModule(null);
    setIsFormVisible(false);
  };

  const handleStartEdit = (module: Module) => {
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
  };

  const handleStartNew = () => {
    setEditingModule(null);
    setIsFormVisible(true);
  };

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

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Label <InfoIcon text="Nom d'affichage du module." /></th>
              <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Clé <InfoIcon text="Identifiant unique technique." /></th>
              <th className="text-left py-3 px-4 uppercase font-semibold text-sm">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center">
                    Ordre <InfoIcon text="Ordre d'affichage du module." />
                  </div>
                  <Input
                    placeholder="Filtrer par ordre..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    allowClear
                    size="small"
                    className="max-w-xs"
                    style={{ backgroundColor: 'white' }}
                  />
                </div>
              </th>
              <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Type <InfoIcon text="Global (pour tous) ou spécifique à l'organisation." /></th>
              <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Activé (Orga) <InfoIcon text="Active ou désactive un module GLOBAL pour l'organisation sélectionnée." /></th>
              <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Statut <InfoIcon text="Statut général du module. Pour un module global, ceci affecte toutes les organisations (super-admin uniquement)." /></th>
              <th className="text-left py-3 px-4 uppercase font-semibold text-sm">Actions</th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="text-center py-4 text-gray-500">Chargement...</td>
              </tr>
            ) : filteredModules.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-4 italic text-gray-500">
                  {searchTerm.trim() 
                    ? `Aucun module trouvé pour l'ordre "${searchTerm}"`
                    : selectedOrganizationId
                      ? "Aucun module (global ou spécifique) n'est associé à cette organisation."
                      : "Aucun module global trouvé. Créez-en un pour commencer."}
                </td>
              </tr>
            ) : (
              filteredModules.map((module) => {
                const isGlobal = !module.organizationId;
                const canEdit = isSuperAdmin || !isGlobal;
                const canDelete = isSuperAdmin || !isGlobal;

                return (
                  <tr key={module.id} className={`border-b ${isGlobal ? 'bg-gray-50' : ''}`}>
                    <td className="py-3 px-4">{module.label}</td>
                    <td className="py-3 px-4 font-mono">{module.key}</td>
                    <td className="py-3 px-4 text-center font-semibold">{module.order}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${isGlobal ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                        {isGlobal ? 'Global' : 'Organisation'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
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
                    <td className="py-3 px-4">
                       <div className="flex items-center">
                          <AdminSwitch
                            checked={module.active}
                            onChange={() => {
                              // Toujours récupérer la version la plus récente du module depuis l'état
                              const currentModule = modules.find(m => m.id === module.id) || module;
                              const { organizationId, ...rest } = currentModule;
                              handleSaveModule({ ...rest, active: !currentModule.active, isGlobal: !organizationId }, () => {});
                            }}
                            disabled={!canEdit}
                          />
                          <span className="ml-2 text-sm">{module.active ? 'Actif' : 'Inactif'}</span>
                        </div>
                    </td>
                    <td className="py-3 px-4">
                      <button onClick={() => handleStartEdit(module)} className={`text-blue-600 hover:underline ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={!canEdit}>Éditer</button>
                      {canDelete && (
                          <button onClick={() => handleDeleteModule(module.id)} className={`text-red-600 hover:underline ml-4 ${!canDelete ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={!canDelete}>Supprimer</button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
