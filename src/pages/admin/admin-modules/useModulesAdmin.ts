import { useState, useEffect, useCallback } from 'react';
// Remplacer l'usage direct de message d'AntD par notre NotificationManager pour éviter les warnings de contexte
import { NotificationManager } from '../../../components/Notifications';
import { useAuth } from '../../../auth/useAuth';
import { useAuthenticatedApi } from '../../../hooks/useAuthenticatedApi';
import { DynamicSection, ModuleWithStatus, SectionWithModules } from './types';
import { AdminModulesService } from './services/AdminModulesService';

// Type brut renvoyé par l'API pouvant avoir des clés alternatives
type RawSection = Partial<SectionWithModules> & {
  name?: string;
  category?: string;
  icon?: string;
  iconName?: string;
  iconColor?: string;
  modules?: ModuleWithStatus[];
};

export const useModulesAdmin = () => {
  const { api } = useAuthenticatedApi();
  const { currentOrganization } = useAuth();
  
  // Service
  const [service] = useState(() => new AdminModulesService(api));
  
  // State
  const [sections, setSections] = useState<SectionWithModules[]>([]);
  const [modules, setModules] = useState<ModuleWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Delete Modal State
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState<ModuleWithStatus | null>(null);

  // Helper: détecter un UUID v4 (approx.)
  const isUuid = useCallback((v?: unknown) => {
    if (typeof v !== 'string') return false;
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(v);
  }, []);

  // ===== LOAD DATA =====
  const loadSections = useCallback(async (organizationId?: string) => {
    const orgId = organizationId || currentOrganization?.id;
    if (!orgId || !api) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('[useModulesAdmin] Chargement des sections...');
      
      const data = await service.getModulesBySections(orgId);
      if (data) {
  const sec = Array.isArray(data.sections) ? data.sections : [];
        console.log('[useModulesAdmin] Données brutes sections:', sec.length);
        // Normaliser les propriétés attendues pour l'affichage (titre, description, icônes, ordre, actif)
  const normalized: SectionWithModules[] = (sec as RawSection[]).map((s, idx) => {
          const modulesRaw = Array.isArray(s?.modules) ? s.modules : [];
          // Respecter l'ordre Prisma pour les modules avec un tri robuste
          const modules = modulesRaw
            .slice()
            .sort((a, b) => {
              const orderA = a?.order ?? 999999; // Modules sans ordre à la fin
              const orderB = b?.order ?? 999999;
              return orderA - orderB;
            });
          // Tenter d'inférer le nom de la catégorie depuis le premier module si absent
          const inferredFromModule = (() => {
            const first = modules[0] as (ModuleWithStatus | undefined);
            const catName = (first as unknown as { Category?: { name?: string } })?.Category?.name;
            return typeof catName === 'string' && catName.trim() ? catName.trim() : undefined;
          })();
          const title = s?.title || s?.name || s?.category || inferredFromModule || 'Catégorie';
          const description = s?.description || `Catégorie ${title}`;
          // Icône/couleur: accepter plusieurs conventions de champs (compatibilité API)
          const fromFirst = modules[0] as (ModuleWithStatus | undefined);
          const iconName = (s as unknown as Record<string, unknown>)?.iconName
            || (s as unknown as Record<string, unknown>)?.icon
            || (s as unknown as Record<string, unknown>)?.categoryIcon
            || (fromFirst as unknown as Record<string, unknown>)?.sectionIcon
            || ((fromFirst as unknown as { Category?: { icon?: string } })?.Category?.icon)
            || 'AppstoreOutlined';
          const iconColor = (s as unknown as Record<string, unknown>)?.iconColor
            || (s as unknown as Record<string, unknown>)?.categoryColor
            || (fromFirst as unknown as Record<string, unknown>)?.sectionColor
            || ((fromFirst as unknown as { Category?: { iconColor?: string } })?.Category?.iconColor)
            || '#1890ff';
          const order = typeof s?.order === 'number' ? s.order : 0;
          const rawActive: unknown = (s as unknown as Record<string, unknown>)?.active
            ?? (s as unknown as Record<string, unknown>)?.isActive
            ?? (s as unknown as Record<string, unknown>)?.enabled
            ?? (s as unknown as Record<string, unknown>)?.status;
          const active = typeof rawActive === 'boolean'
            ? rawActive
            : (typeof rawActive === 'string'
              ? ['active', 'enabled', 'on', 'true', '1'].includes(rawActive.toLowerCase())
              : true);
          const modulesCount = modules.length;
          const saoRaw: unknown = (s as unknown as Record<string, unknown>)?.superAdminOnly
            ?? (s as unknown as Record<string, unknown>)?.adminOnly
            ?? (s as unknown as Record<string, unknown>)?.super_admin_only
            ?? (s as unknown as Record<string, unknown>)?.visibleToSuperAdminOnly;
          const superAdminOnly = typeof saoRaw === 'boolean'
            ? saoRaw
            : (typeof saoRaw === 'string'
              ? ['true', '1', 'yes', 'on'].includes(saoRaw.toLowerCase())
              : false);
          // Ids: on sépare l'id DB réel (backendCategoryId) et un id d'affichage/tri (id)
          console.log('🔍 [loadSections] Structure section complète:', s);
          console.log('🔍 [loadSections] s.id:', s?.id);
          console.log('🔍 [loadSections] s.categoryId:', (s as Record<string, unknown>)?.categoryId);
          console.log('🔍 [loadSections] Premier module:', modules[0]);
          console.log('🔍 [loadSections] Premier module.categoryId:', modules[0]?.categoryId);
          
          // L'ID de section vient directement du backend (c'est l'ID de la catégorie quand BDD)
          // Le backend fournit explicitement backendCategoryId pour distinguer BDD vs fallback
          const maybeId = s?.id ? String(s.id) : undefined;
          const backendProvided = (s as unknown as { backendCategoryId?: unknown })?.backendCategoryId;
          const backendCategoryId = (typeof backendProvided === 'string' && backendProvided)
            ? backendProvided
            : (isUuid(maybeId) ? maybeId : undefined);
          // Si pas d'ID de section, essayer depuis le premier module, sinon générer temporaire
          const inferredId = (() => {
            if (s?.id) return String(s.id); // ID de catégorie depuis le backend
            if (modules[0]?.categoryId) return String(modules[0].categoryId);
            return `__tmp-cat-${idx}`;
          })();
          return { 
            id: inferredId,
            backendCategoryId,
            title,
            description,
            iconName,
            iconColor,
            order,
            active,
            superAdminOnly,
            modules,
            modulesCount,
            organizationId: s.organizationId
          } as SectionWithModules;
        });
        // Respecter l'ordre Prisma pour les sections
        const normalizedSorted = normalized.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  setSections(normalizedSorted);
        const flat = normalizedSorted.flatMap(s => Array.isArray(s.modules) ? s.modules : []);
        console.log('[useModulesAdmin] Modules à plat:', flat.length);
        setModules(flat);
        console.log(`[useModulesAdmin] ${data.totalSections} sections chargées avec ${data.totalModules} modules`);
      } else {
        console.warn('[useModulesAdmin] Aucune donnée reçue de getModulesBySections');
      }
    } catch (error) {
      console.error('[useModulesAdmin] Erreur loadSections:', error);
      setError('Erreur lors du chargement des sections');
    } finally {
      setLoading(false);
    }
  }, [currentOrganization?.id, api, service, isUuid]);

  const loadModules = useCallback(async () => {
    // Les modules sont déjà chargés avec les sections
    console.log('[useModulesAdmin] Modules déjà chargés avec les sections');
  }, []);

  // ===== SECTIONS CRUD =====
  const toggleSectionActive = useCallback(async (sectionId: string) => {
    try {
      const section = sections.find(s => s.id === sectionId);
      if (!section) return;
      // Ne pas appeler l'API si la section n'est pas une vraie catégorie BDD
      const apiId = section.backendCategoryId || null;
      if (!apiId) {
        NotificationManager.error('Cette catégorie est dérivée des modules (fallback) et n’existe pas en base. Créez d’abord une catégorie.');
        return;
      }
      const newActiveStatus = !section.active;
      const updated = await service.updateCategory(apiId, { active: newActiveStatus });
      
      if (updated) {
        setSections(prev => prev.map(s => 
          s.id === sectionId ? { ...s, active: newActiveStatus } : s
        ));
        NotificationManager.success(`Catégorie ${newActiveStatus ? 'activée' : 'désactivée'}`);
      }
    } catch (error) {
      console.error('[useModulesAdmin] Erreur toggleSectionActive:', error);
      NotificationManager.error('Erreur lors de la mise à jour de la catégorie');
    }
  }, [sections, service]);

  const deleteSection = useCallback(async (sectionId: string) => {
    try {
      const section = sections.find(s => s.id === sectionId);
      if (!section) return;

      const apiId = section.backendCategoryId || null;
      if (!apiId) {
        NotificationManager.error('Impossible de supprimer une catégorie fallback (non enregistrée en base).');
        return;
      }
      if ((section.modulesCount ?? section.modules?.length ?? 0) > 0) {
        NotificationManager.error('Impossible de supprimer: des modules sont encore attachés à cette catégorie. Déplacez-les d\'abord.');
        return;
      }
      const success = await service.deleteCategory(apiId).catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        if (/modules attached/i.test(msg)) {
          NotificationManager.error('Suppression refusée: la catégorie contient encore des modules.');
        } else {
          NotificationManager.error('Erreur lors de la suppression de la catégorie');
        }
        return false;
      });
      if (success) {
        setSections(prev => prev.filter(s => s.id !== sectionId));
        NotificationManager.success('Catégorie supprimée avec succès');
      }
    } catch (error) {
      console.error('[useModulesAdmin] Erreur deleteSection:', error);
      NotificationManager.error('Erreur lors de la suppression');
    }
  }, [service, sections]);

  const addSection = useCallback(async (nameOrPayload: string | { name: string; icon?: string; iconColor?: string; description?: string }) => {
    if (!currentOrganization?.id) return;
    
    try {
      const payload = typeof nameOrPayload === 'string' 
        ? { name: nameOrPayload, description: `Catégorie ${nameOrPayload}`, icon: 'AppstoreOutlined', iconColor: '#1890ff' }
        : nameOrPayload;
      const newCategory = await service.createCategory({
        ...payload,
        order: (sections.length + 1) * 10,
        active: true,
        organizationId: currentOrganization.id,
        superAdminOnly: false
      });

      if (newCategory) {
        await loadSections(); // Recharger les sections
        NotificationManager.success('Catégorie ajoutée avec succès');
      }
    } catch (error) {
      console.error('[useModulesAdmin] Erreur addSection:', error);
      NotificationManager.error('Erreur lors de l\'ajout de la catégorie');
    }
  }, [currentOrganization?.id, sections.length, service, loadSections]);

  const updateSectionProperties = useCallback(async (sectionId: string, updates: { name?: string; icon?: string; iconColor?: string; description?: string; active?: boolean; order?: number; superAdminOnly?: boolean }) => {
    try {
      const section = sections.find(s => s.id === sectionId);
      if (!section) return;

      const apiId = section.backendCategoryId || null;
      if (!apiId) {
        NotificationManager.error('Cette catégorie est dérivée des modules (fallback) et n’existe pas en base. Créez d’abord une catégorie.');
        return;
      }
      const updated = await service.updateCategory(apiId, updates);
      if (updated) {
        // Recharge pour refléter les changements (icône/couleur)
        await loadSections();
        NotificationManager.success('Catégorie mise à jour');
      }
    } catch (error) {
      console.error('[useModulesAdmin] Erreur updateSectionProperties:', error);
      NotificationManager.error('Erreur lors de la mise à jour de la catégorie');
    }
  }, [service, loadSections, sections]);

  // ===== MODULE TOGGLE FUNCTIONS =====
  const updateModuleProperties = useCallback(async (moduleId: string, updates: { active?: boolean; superAdminOnly?: boolean }) => {
    try {
      const updated = await service.updateModule(moduleId, updates);
      if (updated) {
        // Recharger les sections pour refléter les changements
        await loadSections();
        NotificationManager.success('Module mis à jour');
      }
    } catch (error) {
      console.error('[useModulesAdmin] Erreur updateModuleProperties:', error);
      NotificationManager.error('Erreur lors de la mise à jour du module');
    }
  }, [service, loadSections]);

  const toggleModuleActive = useCallback(async (moduleId: string, currentActive: boolean) => {
    try {
      await updateModuleProperties(moduleId, { active: !currentActive });
    } catch (error) {
      console.error('[useModulesAdmin] Erreur toggleModuleActive:', error);
      NotificationManager.error('Erreur lors du toggle du module');
    }
  }, [updateModuleProperties]);

  const toggleModuleSuperAdminOnly = useCallback(async (moduleId: string, value: boolean) => {
    try {
      // Si superAdminOnly est activé, automatiquement désactiver active
      if (value) {
        await updateModuleProperties(moduleId, { superAdminOnly: value, active: false });
      } else {
        await updateModuleProperties(moduleId, { superAdminOnly: value });
      }
    } catch (error) {
      console.error('[useModulesAdmin] Erreur toggleModuleSuperAdminOnly:', error);
      NotificationManager.error('Erreur lors du toggle SuperAdmin Only');
    }
  }, [updateModuleProperties]);

  // ===== DRAG & DROP FUNCTIONS =====
  const updateSectionName = useCallback(async (sectionId: string, newName: string) => {
    try {
      const section = sections.find(s => s.id === sectionId);
      if (!section) return;
      const apiId = section.backendCategoryId || null;
      if (!apiId) {
        NotificationManager.error('Cette catégorie est dérivée des modules (fallback) et n’existe pas en base. Créez d’abord une catégorie.');
        return;
      }
      const updated = await service.updateCategory(apiId, { name: newName });
      if (updated) {
        setSections(prev => prev.map(s => {
          if (s.id !== sectionId) return s;
          const maybeName = (s as unknown as { name?: unknown }).name;
          const maybeCategory = (s as unknown as { category?: unknown }).category;
          const extra: Record<string, unknown> = {};
          if (typeof maybeName !== 'undefined') extra.name = newName;
          if (typeof maybeCategory !== 'undefined') extra.category = newName;
          return { ...s, title: newName, ...extra } as SectionWithModules;
        }));
        NotificationManager.success('Nom de catégorie mis à jour');
      }
    } catch (error) {
      console.error('[useModulesAdmin] Erreur updateSectionName:', error);
      NotificationManager.error('Erreur lors de la mise à jour du nom');
    }
  }, [service, sections]);

  // Créer une catégorie BDD depuis une section fallback et migrer ses modules
  const createCategoryFromSection = useCallback(async (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;
    // Si déjà une vraie catégorie, ne rien faire
    if (section.backendCategoryId && isUuid(section.backendCategoryId)) {
      NotificationManager.info('Cette catégorie existe déjà en base');
      return;
    }

    try {
      // 1) Créer la Category
      const payload = {
        name: section.title || 'Catégorie',
        description: section.description || `Catégorie ${section.title}`,
        icon: section.iconName || 'AppstoreOutlined',
        iconColor: section.iconColor || '#1890ff',
        order: section.order ?? 0,
        organizationId: section.organizationId || null,
        active: true,
        superAdminOnly: !!section.superAdminOnly
      };
      const created = await service.createCategory(payload as unknown as Record<string, unknown>);
      if (!created || !created.id) {
        NotificationManager.error('Échec de la création de la catégorie');
        return;
      }

      const newCatId: string = String(created.id);

      // 2) Migrer les modules de la section vers cette Category
      const mods = Array.isArray(section.modules) ? section.modules : [];
      // Ordres espacés de 10
      for (let i = 0; i < mods.length; i++) {
        const mod = mods[i];
        await service.updateModule(String(mod.id), { categoryId: newCatId, order: (i + 1) * 10 });
      }

      // 3) Recharger pour refléter la migration
      await loadSections(currentOrganization?.id);
      NotificationManager.success('Catégorie créée et modules migrés');
    } catch (e) {
      console.error('[useModulesAdmin] Erreur createCategoryFromSection:', e);
      NotificationManager.error("Erreur lors de la création de la catégorie");
    }
  }, [sections, service, loadSections, currentOrganization?.id, isUuid]);

  const reorderSections = useCallback(async (newOrder: SectionWithModules[]) => {
    try {
      // Mettre à jour l'ordre dans l'état immédiatement pour un feedback visuel instantané
      setSections(newOrder);
      
      console.log('🔄 [reorderSections] Début de la réorganisation des sections');
      console.log('📋 [reorderSections] Nouvel ordre:', newOrder.map((s, i) => `${i + 1}. ${s.title} (ID: ${s.id})`));
      
      // Sauvegarder l'ordre en base avec des valeurs espacées pour éviter les conflits
      // Utiliser des incréments de 10 : 10, 20, 30, 40... pour permettre des insertions futures
      const updatesPayload = newOrder
        .map((section, index) => {
          const apiId = section.backendCategoryId || null;
          if (!apiId) return null; // ignorer les fallback
          return { id: apiId, order: (index + 1) * 10 };
        })
        .filter((x): x is { id: string; order: number } => !!x);
      
      console.log('💾 [reorderSections] Payload de sauvegarde:', updatesPayload);
      
      if (service.reorderSections && updatesPayload.length > 0) {
        await service.reorderSections(updatesPayload);
        console.log('✅ [reorderSections] Ordre sauvegardé via endpoint dédié');
      } else {
        // Sauvegarder individuellement chaque section
        await Promise.all(updatesPayload.map(async (u) => {
          console.log(`💾 [reorderSections] Sauvegarde section ${u.id} -> ordre ${u.order}`);
          return service.updateCategory(u.id, { order: u.order });
        }));
        console.log('✅ [reorderSections] Ordre sauvegardé via mises à jour individuelles');
      }
      
      // Recharger pour confirmer la sauvegarde côté serveur
      console.log('🔄 [reorderSections] Rechargement pour validation...');
      await loadSections(currentOrganization?.id);
      console.log('✅ [reorderSections] Ordre des sections sauvegardé et validé');
    } catch (error) {
      console.error('[useModulesAdmin] Erreur reorderSections:', error);
      NotificationManager.error('Erreur lors de la réorganisation des sections');
      // Recharger pour resynchroniser en cas d'erreur
      await loadSections(currentOrganization?.id);
    }
  }, [service, loadSections, currentOrganization?.id]);

  // ===== MODULES DND: MOVE BETWEEN SECTIONS =====
  const moveModule = useCallback(async (
    moduleId: string,
    fromSectionId: string,
    toSectionId: string,
    toIndex: number
  ) => {
    console.log('🚀 [moveModule] DEBUT', { moduleId, fromSectionId, toSectionId, toIndex });
    
    try {
      // Construire le prochain état de manière déterministe
      const nextSections = sections.map(s => ({ ...s, modules: [...s.modules] }));
      const from = nextSections.find(s => String(s.id) === String(fromSectionId));
      const to = nextSections.find(s => String(s.id) === String(toSectionId));
      
      console.log('🔍 [moveModule] Sections trouvées:', { 
        from: from?.title, 
        to: to?.title,
        fromId: from?.id,
        toId: to?.id,
        backendFromId: from?.backendCategoryId,
        backendToId: to?.backendCategoryId
      });
      
      if (!from || !to) {
        console.error('❌ [moveModule] Section source ou cible introuvable');
        return;
      }
      
      const mIdx = from.modules.findIndex(m => String(m.id) === String(moduleId));
      if (mIdx === -1) {
        console.error('❌ [moveModule] Module introuvable dans section source');
        return;
      }
      
      const [moved] = from.modules.splice(mIdx, 1);
      console.log('📦 [moveModule] Module déplacé:', moved.label);
      
      // Insérer au bon index dans la section cible
      const insertAt = Math.max(0, Math.min(toIndex, to.modules.length));
      to.modules.splice(insertAt, 0, { ...moved, categoryId: toSectionId });
      console.log('📍 [moveModule] Inséré à l\'index:', insertAt);
      
      setSections(nextSections);

      // PERSISTER via mise à jour individuelle (l'endpoint /reorder n'existe pas)
      console.log('💾 [moveModule] Démarrage persistence...');
      console.log('🔍 [moveModule] Sections disponibles pour mapping:');
      nextSections.forEach(s => {
        console.log(`  - ${s.id}: ${s.title} (backendCategoryId: ${s.backendCategoryId})`);
      });
      
      const getBackendCategoryId = (secId: string) => {
        const s = nextSections.find(x => String(x.id) === String(secId));
        console.log(`🔍 [moveModule] Section ${secId}:`, { title: s?.title, backendCategoryId: s?.backendCategoryId, id: s?.id });
        
        // Utiliser backendCategoryId s'il existe, sinon l'ID de section
        const categoryId = s?.backendCategoryId || s?.id;
        console.log(`💡 [moveModule] categoryId utilisé pour ${secId}:`, categoryId);
        return categoryId;
      };
      
      // Mettre à jour le module déplacé avec sa nouvelle catégorie et son nouvel ordre
      const newCategoryId = getBackendCategoryId(toSectionId);
      console.log(`🎯 [moveModule] Mise à jour module ${moved.id} -> catégorie ${newCategoryId}`);
      
      // Utiliser un ordre espacé (par multiples de 10) pour éviter les conflits
      const newOrder = (insertAt + 1) * 10;
      await service.updateModule(String(moved.id), {
        categoryId: newCategoryId,
        order: newOrder
      });
      console.log(`📍 [moveModule] Module ${moved.label} -> ordre ${newOrder}`);
      
      // Mettre à jour l'ordre des autres modules dans la section cible avec espacement
      console.log('📋 [moveModule] Mise à jour ordre section cible:', to.title);
      for (let i = 0; i < to.modules.length; i++) {
        const mod = to.modules[i];
        if (String(mod.id) !== String(moved.id)) { // Skip le module qu'on vient de déplacer
          const moduleOrder = (i + 1) * 10;
          await service.updateModule(String(mod.id), { order: moduleOrder });
          console.log(`  ↳ ${mod.label}: ordre ${moduleOrder}`);
        }
      }
      
      // Mettre à jour l'ordre dans la section source avec espacement
      console.log('📋 [moveModule] Mise à jour ordre section source:', from.title);
      for (let i = 0; i < from.modules.length; i++) {
        const mod = from.modules[i];
        const moduleOrder = (i + 1) * 10;
        await service.updateModule(String(mod.id), { order: moduleOrder });
        console.log(`  ↳ ${mod.label}: ordre ${moduleOrder}`);
      }
      
      console.log('✅ [moveModule] Persistence terminée avec succès');
  // Recharger pour refléter la sauvegarde côté serveur (catégorie/ordre)
  await loadSections(currentOrganization?.id);
    } catch (error) {
      console.error('[useModulesAdmin] Erreur moveModule:', error);
  NotificationManager.error('Erreur lors du déplacement du module');
      // Recharger pour resynchroniser si besoin
      await loadSections();
    }
  }, [sections, loadSections, service, currentOrganization?.id]);

  // Purge tous les modules d'une section fallback (non-BDD)
  const purgeFallbackSection = useCallback(async (sectionId: string) => {
    const section = sections.find(s => String(s.id) === String(sectionId));
    if (!section) return;
    // Seulement pour fallback
    if (section.backendCategoryId && isUuid(section.backendCategoryId)) {
      NotificationManager.info('Cette catégorie est une vraie catégorie BDD. Utilisez la suppression normale.');
      return;
    }
    const mods = Array.isArray(section.modules) ? section.modules : [];
    if (mods.length === 0) {
      NotificationManager.info('Cette section est déjà vide.');
      return;
    }
    try {
      console.log('🧹 [purgeFallbackSection] Suppression modules (fallback):', {
        sectionId,
        title: section.title,
        count: mods.length,
        moduleIds: mods.map(m => m.id)
      });

      const results = await Promise.allSettled(
        mods.map(m => service.deleteModule(String(m.id)))
      );
      const succeeded = results.filter(r => r.status === 'fulfilled' && r.value).length;
      const failed = results.length - succeeded;

      await loadSections(currentOrganization?.id);
      if (failed === 0) {
        NotificationManager.success(`Section fallback vidée: ${succeeded} module(s) supprimé(s)`);
      } else if (succeeded > 0) {
        NotificationManager.warn(`Suppression partielle: ${succeeded} supprimé(s), ${failed} échec(s)`);
      } else {
        NotificationManager.error('Échec de la suppression des modules de la section');
      }
    } catch (e) {
      console.error('[useModulesAdmin] Erreur purgeFallbackSection:', e);
      NotificationManager.error('Erreur lors de la suppression des modules de la section');
    }
  }, [sections, service, loadSections, currentOrganization?.id, isUuid]);
  const toggleModuleForOrganization = useCallback(async (moduleId: string, currentStatus: boolean, organizationId?: string) => {
    const orgId = organizationId || currentOrganization?.id;
    if (!orgId) return;

    try {
      const success = await service.toggleModuleForOrganization(
        moduleId,
        orgId,
        currentStatus
      );
      
      if (success) {
        // Mettre à jour l'état local
        setModules(prev => prev.map(m => 
          m.id === moduleId ? { ...m, isActiveForOrg: !currentStatus } : m
        ));
        
        // Mettre à jour dans les sections
        setSections(prev => prev.map(section => ({
          ...section,
          modules: section.modules.map(m => 
            m.id === moduleId ? { ...m, isActiveForOrg: !currentStatus } : m
          )
        })));
        
        NotificationManager.success(`Module ${!currentStatus ? 'activé' : 'désactivé'}`);
      }
    } catch (error) {
      console.error('[useModulesAdmin] Erreur toggleModule:', error);
      NotificationManager.error('Erreur lors de la mise à jour du module');
    }
  }, [currentOrganization?.id, service]);

  const handleEditModule = useCallback((module: ModuleWithStatus) => {
    // TODO: Ouvrir modal d'édition
    console.log('[useModulesAdmin] Edit module:', module.label);
  }, []);

  const handleDeleteModule = useCallback((module: ModuleWithStatus) => {
    console.log('🗑️ [useModulesAdmin] Tentative de suppression du module:', module);
    setModuleToDelete(module);
    setIsDeleteModalVisible(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!moduleToDelete) {
      console.log('🗑️ [useModulesAdmin] Aucun module à supprimer');
      return;
    }

    console.log('🗑️ [useModulesAdmin] Confirmation reçue, début de la suppression...');
    
    try {
  console.log('🗑️ [useModulesAdmin] Envoi de la requête DELETE:', `/api/modules/${moduleToDelete.id}`);
  // Utiliser l'endpoint principal des modules (DELETE /api/modules/:id)
  // Un alias backend existe aussi sur /api/admin-modules/modules/:id pour compatibilité
  const response = await api.delete(`/api/modules/${moduleToDelete.id}`);
      
      console.log('🗑️ [useModulesAdmin] Réponse de l\'API:', response);
      
      if (response.success) {
        console.log('🗑️ [useModulesAdmin] Suppression réussie, mise à jour de l\'état...');
        
        // Mettre à jour l'état local
        setModules(prev => {
          const updated = prev.filter(m => m.id !== moduleToDelete.id);
          console.log('🗑️ [useModulesAdmin] Modules restants:', updated.length);
          return updated;
        });
        
        NotificationManager.success('Module supprimé avec succès');
        console.log('🗑️ [useModulesAdmin] Module supprimé avec succès');
        // Recharger les sections pour refléter l'état côté serveur
        await loadSections(currentOrganization?.id);
      } else {
        console.error('🗑️ [useModulesAdmin] Échec de suppression - réponse:', response);
        NotificationManager.error(response.error || 'Erreur lors de la suppression du module');
      }
    } catch (error) {
      console.error('🗑️ [useModulesAdmin] Erreur lors de la suppression du module:', error);
      NotificationManager.error('Erreur lors de la suppression du module');
    } finally {
      // Fermer le modal quoi qu'il arrive
      setIsDeleteModalVisible(false);
      setModuleToDelete(null);
    }
  }, [moduleToDelete, api, loadSections, currentOrganization?.id]);

  const handleCancelDelete = useCallback(() => {
    console.log('🗑️ [useModulesAdmin] Suppression annulée par l\'utilisateur');
    setIsDeleteModalVisible(false);
    setModuleToDelete(null);
  }, []);

  

  // ===== EFFECTS =====
  useEffect(() => {
    if (currentOrganization?.id) {
      loadSections(currentOrganization.id);
    }
  }, [loadSections, currentOrganization?.id]);

  // ===== COMPATIBILITY ALIASES =====
  const allSections: DynamicSection[] = sections.map(section => ({
    id: section.id,
    title: section.title,
    description: section.description,
    iconName: section.iconName,
    iconColor: section.iconColor,
    order: section.order,
    active: section.active,
    organizationId: section.organizationId
  }));

  return {
    // Data
    sections,
    allSections, // Alias pour compatibilité
    modules,
    loading,
    error,
    
    // Delete Modal State
    isDeleteModalVisible,
    moduleToDelete,
    
    // Functions
    loadSections,
    loadModules,
    toggleSectionActive,
    deleteSection,
    addSection,
    updateSectionName,
  updateSectionProperties,
  reorderSections,
  moveModule,
  createCategoryFromSection,
    toggleModuleForOrganization,
    handleEditModule,
    handleDeleteModule,
    handleConfirmDelete,
    handleCancelDelete,
    setModules,
    
    // Module Toggle Functions
    updateModuleProperties,
    toggleModuleActive,
    toggleModuleSuperAdminOnly
    ,purgeFallbackSection
  };
};
