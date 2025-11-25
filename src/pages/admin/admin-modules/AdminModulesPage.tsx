import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Modal, Select, Form, Input, ConfigProvider, theme as antdTheme } from 'antd';
import {
  DndContext,
  DragStartEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { useModulesAdmin } from '.';
import { ModuleWithStatus, SectionWithModules } from './types';
import { InfoBanner } from './components/InfoBanner';
import ModulesHeader from './components/layout/ModulesHeader';
import { ModuleForm, ModuleFormData } from './components/ModuleForm';
import IconPicker from './components/shared/IconPicker';
import IconRenderer from './components/shared/IconRenderer';
import { useAuthenticatedApi } from '../../../hooks/useAuthenticatedApi';
import { useAuth } from '../../../auth/useAuth';
import {
  NotificationsContainer,
  NotificationManager,
} from '../../../components/Notifications';
import { SortableSection } from './components/SortableSection';

export default function AdminModulesPage() {
  const {
    sections,
    modules,
    loading,
    addSection,
    updateSectionProperties,
    deleteSection,
    reorderSections,
    moveModule,
    createCategoryFromSection,
    purgeFallbackSection,
    toggleModuleForOrganization,
    loadSections,
    isDeleteModalVisible,
    moduleToDelete,
    handleConfirmDelete,
    handleCancelDelete,
    handleDeleteModule,
    toggleModuleActive,
    toggleModuleSuperAdminOnly,
  } = useModulesAdmin();
  const { api } = useAuthenticatedApi();
  const { refreshModules, user, currentOrganization } = useAuth();
  const [search, setSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);
  const [createCategoryForm] = Form.useForm<{
    name: string;
    icon?: { name?: string; color?: string };
  }>();
  const [isEditCategoryOpen, setIsEditCategoryOpen] = useState(false);
  const [editCategoryForm] = Form.useForm<{
    name: string;
    icon?: { name?: string; color?: string };
  }>();
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [initialForm, setInitialForm] = useState<ModuleFormData | null>(null);
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | ''>('');

  // État des panneaux ouverts/fermés
  const [openPanels, setOpenPanels] = useState<Set<string>>(new Set());

  // Gérer l'ouverture/fermeture des panneaux
  const handlePanelChange = useCallback((panelId: string, isOpen: boolean) => {
    setOpenPanels(current => {
      const newSet = new Set(current);
      if (isOpen) {
        newSet.add(panelId);
      } else {
        newSet.delete(panelId);
      }
      return newSet;
    });
  }, []);

  const sensors = useSensors(
    // Démarrage très réactif: drag dès que le pointeur se déplace un peu
    useSensor(PointerSensor, { activationConstraint: { distance: 2 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Drag overlay state
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragType, setDragType] = useState<'cat' | 'mod' | null>(null);

  // Charger les organisations pour Super Admin
  useEffect(() => {
    if (user?.role !== 'super_admin') return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/api/organizations');
        if (!cancelled && res?.success) {
          setOrganizations(res.data || []);
        }
      } catch {
        NotificationManager.error("Erreur lors du chargement des organisations");
      }
    })();
    return () => { cancelled = true; };
  }, [user?.role, api]);

  useEffect(() => {
    if (user?.role === 'super_admin') return;
    if (currentOrganization?.id) {
      setSelectedOrganizationId(currentOrganization.id);
    }
  }, [user?.role, currentOrganization?.id]);

  const filteredSections = useMemo<SectionWithModules[]>(() => {
    const term = search.trim().toLowerCase();
    const orderTerm = orderFilter.trim();
    const match = (m: ModuleWithStatus) => {
      const byText = !term || m.label.toLowerCase().includes(term) || m.key.toLowerCase().includes(term);
      const byOrder = !orderTerm || String(m.order ?? '').includes(orderTerm);
      return byText && byOrder;
    };
    return sections.map((s) => ({ ...s, modules: s.modules.filter(match) }));
  }, [sections, search, orderFilter]);

  const onEditSection = useCallback(
    (id: string) => {
      const s = sections.find((x) => String(x.id) === String(id));
      if (!s) return;
      setEditingCategoryId(String(id));
      setIsEditCategoryOpen(true);
    },
    [sections]
  );
  const onDeleteSection = useCallback((id: string) => {
    deleteSection(id);
  }, [deleteSection]);

  // Hydrater le formulaire d'édition quand le modal s'ouvre
  useEffect(() => {
    if (!isEditCategoryOpen) return;
    if (!editingCategoryId) return;
    const s = sections.find((x) => String(x.id) === String(editingCategoryId));
    if (!s) return;
    editCategoryForm.setFieldsValue({
      name: s.title,
      icon: { name: s.iconName || 'AppstoreOutlined', color: s.iconColor || '#1890ff' },
    });
  }, [isEditCategoryOpen, editingCategoryId, sections, editCategoryForm]);

  // Toggle actif de la catégorie
  const onToggleSectionActive = useCallback(async (sectionId: string) => {
    try {
      const s = sections.find((x) => String(x.id) === String(sectionId));
      if (!s) return;
      await updateSectionProperties(sectionId, { active: !s.active });
    } catch {
      NotificationManager.error('Erreur activation catégorie');
    }
  }, [sections, updateSectionProperties]);

  // Toggle visibilité SuperAdmin uniquement
  const onToggleSectionAdminOnly = useCallback(async (sectionId: string, value: boolean) => {
    try {
      // Si superAdminOnly est activé, automatiquement désactiver active
      if (value) {
        await updateSectionProperties(sectionId, { superAdminOnly: value, active: false });
      } else {
        await updateSectionProperties(sectionId, { superAdminOnly: value });
      }
    } catch {
      NotificationManager.error('Erreur mise à jour visibilité admin');
    }
  }, [updateSectionProperties]);

  const onEditModule = useCallback(
    (m: ModuleWithStatus) => {
      setInitialForm({
        id: m.id,
        key: m.key,
        label: m.label,
        feature: m.feature,
        icon: m.icon,
        iconColor: m.iconColor || m.sectionColor || '#1890ff',
        route: m.route,
        description: m.description,
        page: m.page,
        order: m.order ?? 0,
        active: m.active,
        categoryId: m.categoryId,
      });
      setIsFormOpen(true);
    },
    []
  );

  const onToggleOrg = useCallback(
    (moduleId: string, currentStatus: boolean) => {
      // utiliser l’orga sélectionnée si présente (Super Admin), sinon l’actuelle
      const orgId = selectedOrganizationId || currentOrganization?.id || '';
      if (!orgId) { NotificationManager.error('Sélectionner une organisation'); return; }
      toggleModuleForOrganization(moduleId, currentStatus, orgId);
    },
    [toggleModuleForOrganization, selectedOrganizationId, currentOrganization?.id]
  );

  const handleSaveModule = useCallback(
    async (data: ModuleFormData) => {
      try {
        if (data.id) {
          const res = await api.put(`/api/modules/${data.id}`, data);
          if (!res?.success) throw new Error(res?.error || 'Échec de la mise à jour');
          NotificationManager.success('Module mis à jour');
        } else {
          const res = await api.post('/api/modules', data);
          if (!res?.success) throw new Error(res?.error || 'Échec de la création');
          NotificationManager.success('Module créé');
        }
        setIsFormOpen(false);
        setInitialForm(null);
        await loadSections(selectedOrganizationId || currentOrganization?.id || '');
        if (refreshModules) await refreshModules();
      } catch (e: unknown) {
        console.error(e);
        const errMsg = e instanceof Error ? e.message : 'Erreur lors de l\'enregistrement';
        NotificationManager.error(errMsg);
      }
    },
    [api, loadSections, refreshModules, selectedOrganizationId, currentOrganization?.id]
  );

  const onAddModuleToCategory = useCallback(
    (categoryId: string, defaultOrder: number) => {
      setInitialForm({
        key: '',
        label: '',
        feature: '',
        icon: '',
        iconColor: sections.find((s) => String(s.id) === String(categoryId))?.iconColor || '#1890ff',
        route: '',
        description: '',
        page: '',
        order: defaultOrder,
        active: true,
        categoryId,
      });
      setIsFormOpen(true);
    },
    [sections]
  );

  const onDragStart = useCallback((e: DragStartEvent) => {
    const id = String(e.active.id);
    
    if (id.startsWith('cat:')) {
      setDragType('cat');
      setDragId(id.replace('cat:', ''));
    } else if (id.startsWith('mod:')) {
      setDragType('mod');
      setDragId(id.replace('mod:', ''));
    } else {
      setDragType(null);
      setDragId(null);
    }
  }, []);

  const onDragEnd = useCallback(
    (e: DragEndEvent) => {
      const { active, over } = e;
      setDragId(null);
      setDragType(null);
      if (!over) return;
      const a = String(active.id);
      const o = String(over.id);
      if (a === o) return;

      // Reorder catégories
      if (a.startsWith('cat:') && o.startsWith('cat:')) {
        const aId = a.replace('cat:', '');
        const oId = o.replace('cat:', '');
        const oldIndex = sections.findIndex((s) => String(s.id) === aId);
        const newIndex = sections.findIndex((s) => String(s.id) === oId);
        if (oldIndex > -1 && newIndex > -1) {
          const newOrder = arrayMove(sections, oldIndex, newIndex);
          reorderSections(newOrder);
        }
        return;
      }

      // Déplacement modules
      if (a.startsWith('mod:')) {
        // Construire une table de correspondance sortableId -> (sectionId, index, moduleId)
        const lookup = new Map<string, { sectionId: string; index: number; moduleId?: string }>();
        sections.forEach((sec) => {
          sec.modules.forEach((m, idx) => {
            const base = m.id ?? m.key ?? `${String(sec.id)}-${idx}`;
            const sid = `mod:${String(base)}`;
            lookup.set(sid, { sectionId: String(sec.id), index: idx, moduleId: m.id });
          });
        });

        const src = lookup.get(a);
        if (!src?.moduleId) return; // S'assurer qu'on a un ID de module valide

        let destSectionId: string | undefined;
        let destIndex = 0;
        
        if (o.startsWith('mod:')) {
          // Déposer sur un autre module
          const dst = lookup.get(o);
          if (!dst) return;
          destSectionId = dst.sectionId;
          destIndex = dst.index;
        } else if (o.startsWith('cat:')) {
          // Déposer sur une catégorie (à la fin)
          const catId = o.replace('cat:', '');
          const sec = sections.find((s) => String(s.id) === catId);
          if (!sec) return;
          destSectionId = String(sec.id);
          destIndex = sec.modules.length; // À la fin de la liste
        }
        
        if (!destSectionId) return;

        // Utiliser moveModule avec l'ID du module
        console.log(`[DRAG] Déplacement module ${src.moduleId} de ${src.sectionId} vers ${destSectionId} à l'index ${destIndex}`);
        moveModule(src.moduleId, src.sectionId, destSectionId, destIndex);
      }
    },
    [sections, reorderSections, moveModule]
  );

  const orgSelector =
    user?.role === 'super_admin' ? (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 hidden md:inline">Contexte:</span>
        <Select
          allowClear
          value={selectedOrganizationId || undefined}
          onChange={(v) => {
            setSelectedOrganizationId(v || '');
            loadSections(v || '');
          }}
          placeholder="Vue Globale (modules globaux)"
          style={{ width: 240 }}
          options={organizations.map((o) => ({ value: o.id, label: o.name }))}
        />
      </div>
    ) : null;

  const totalActiveGlobal = modules.filter((m) => !!m.active).length;
  const totalActiveForOrg = modules.filter((m) => !!m.isActiveForOrg).length;

  const modulesTheme = useMemo(() => ({
    algorithm: antdTheme.defaultAlgorithm,
    token: {
      colorBgLayout: '#f6f8fb',
      colorBgContainer: '#ffffff',
      colorBorder: '#e2e8f0',
      colorText: '#0f172a',
      colorTextSecondary: '#475569',
      borderRadiusLG: 14,
      controlHeightLG: 48,
    },
    components: {
      Card: {
        colorBgContainer: '#ffffff',
        borderRadiusLG: 16,
        boxShadowSecondary: '0 10px 30px rgba(15, 23, 42, 0.08)',
      },
      Modal: {
        colorBgElevated: '#ffffff',
        headerBg: '#ffffff',
        borderRadiusLG: 18,
      },
      Input: {
        colorBgContainer: '#ffffff',
      },
      Select: {
        colorBgContainer: '#ffffff',
      },
      Dropdown: {
        colorBgElevated: '#ffffff',
      },
      Switch: {
        colorPrimary: '#2563eb',
      },
    },
  }), []);

  return (
    <ConfigProvider theme={modulesTheme}>
      <div className="admin-modules-surface min-h-screen bg-slate-50 p-6">
      <NotificationsContainer />
      <ModulesHeader
        categoriesCount={filteredSections.length}
        totalModules={modules.length}
        totalActiveGlobal={totalActiveGlobal}
        totalActiveForOrg={totalActiveForOrg}
        orgName={organizations.find(
          (o) => o.id === (selectedOrganizationId || currentOrganization?.id)
        )?.name}
        searchValue={search}
        onSearchChange={setSearch}
        orderFilterValue={orderFilter}
        onOrderFilterChange={setOrderFilter}
        onAddCategory={() => {
          setIsCreateCategoryOpen(true);
        }}
        onAddModule={() => {
          setInitialForm(null);
          setIsFormOpen(true);
        }}
        onRefresh={() => loadSections(selectedOrganizationId || currentOrganization?.id || '')}
        organizationSelector={orgSelector}
      />

      <InfoBanner />

      {loading ? (
        <div className="text-center py-8">Chargement…</div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          modifiers={[restrictToVerticalAxis]}
        >
          <SortableContext items={filteredSections.map((s, idx) => `cat:${String(s.id ?? `idx-${idx}`)}`)} strategy={verticalListSortingStrategy}>
            {filteredSections.map((section, idx) => {
              // Créer une clé unique qui combine l'id de section et l'index pour éviter les doublons
              const uniqueKey = section.id ? `cat-${section.id}-${idx}` : `cat-idx-${idx}`;
              const catId = `cat:${String(section.id ?? `idx-${idx}`)}`;
              const panelId = String(section.id ?? `idx-${idx}`);
              const isPanelOpen = openPanels.has(panelId);
              
              return (
                <SortableSection
                  key={uniqueKey}
                  catId={catId}
                  section={section}
                  onEdit={onEditSection}
                  onDelete={onDeleteSection}
                  onCreateCategoryFromSection={createCategoryFromSection}
                  onPurgeFallbackSection={purgeFallbackSection}
                  onEditModule={onEditModule}
                  onDeleteModule={handleDeleteModule}
                  onToggleOrg={onToggleOrg}
                  onAddModuleToCategory={onAddModuleToCategory}
                  onToggleSectionActive={onToggleSectionActive}
                  onToggleSectionAdminOnly={onToggleSectionAdminOnly}
                  onToggleModuleActive={toggleModuleActive}
                  onToggleModuleSuperAdminOnly={toggleModuleSuperAdminOnly}
                  isOpen={isPanelOpen}
                  onPanelChange={handlePanelChange}
                />
              );
            })}
          </SortableContext>
          <DragOverlay>
            {dragId && dragType === 'cat' && (() => {
              const sec = sections.find(s => String(s.id) === dragId);
              if (!sec) return null;
              return (
                <div className="px-4 py-3 bg-white rounded-md shadow-lg border border-gray-200 flex items-center gap-3">
                  <IconRenderer name={sec.iconName || 'AppstoreOutlined'} color={sec.iconColor || '#1890ff'} size={18} />
                  <span className="font-semibold text-base text-gray-800">{sec.title}</span>
                </div>
              );
            })()}
            {dragId && dragType === 'mod' && (() => {
              // Chercher le module par id dans l’ensemble des sections
              const mod = sections.flatMap(s => s.modules).find(m => String(m.id) === dragId || String(m.key) === dragId);
              if (!mod) return null;
              return (
                <div className="px-3 py-2 bg-white rounded shadow-lg border border-gray-200 flex items-center gap-2">
                  <IconRenderer name={mod.icon || 'AppstoreOutlined'} color={mod.iconColor || '#1890ff'} size={16} />
                  <span className="text-sm font-medium">{mod.label}</span>
                </div>
              );
            })()}
          </DragOverlay>
        </DndContext>
      )}

      <Modal
        title={initialForm?.id ? 'Éditer le module' : 'Ajouter un module'}
        open={isFormOpen}
        onCancel={() => {
          setIsFormOpen(false);
          setInitialForm(null);
        }}
        footer={null}
        destroyOnHidden
        forceRender
        styles={{ body: { maxHeight: '72vh', overflowY: 'auto' } }}
      >
        <ModuleForm
          initial={initialForm}
          onSave={handleSaveModule}
          onCancel={() => {
            setIsFormOpen(false);
            setInitialForm(null);
          }}
        />
      </Modal>

      {/* Éditer une catégorie */}
      <Modal
        title="Éditer la catégorie"
        open={isEditCategoryOpen}
        onCancel={() => {
          setIsEditCategoryOpen(false);
          setEditingCategoryId(null);
          editCategoryForm.resetFields();
        }}
        onOk={() => {
          editCategoryForm
            .validateFields()
            .then(async ({ name, icon }) => {
              if (!editingCategoryId) return;
              const iconName = icon?.name || 'AppstoreOutlined';
              const iconColor = icon?.color || '#1890ff';
              await updateSectionProperties(editingCategoryId, {
                name: name.trim(),
                icon: iconName,
                iconColor,
              });
              setIsEditCategoryOpen(false);
              setEditingCategoryId(null);
              editCategoryForm.resetFields();
            })
            .catch(() => {});
        }}
        okText="Enregistrer"
        cancelText="Annuler"
        destroyOnHidden
        forceRender
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
      >
        <Form form={editCategoryForm} layout="vertical">
          <Form.Item
            name="name"
            label="Nom de la catégorie"
            rules={[{ required: true, message: 'Saisissez un nom' }]}
          >
            <Input placeholder="Ex: Google Workspace" />
          </Form.Item>
          <Form.Item name="icon" label="Icône et couleur">
            <IconPicker
              withColor
              value={editCategoryForm.getFieldValue('icon')}
              onChange={(val) => editCategoryForm.setFieldsValue({ icon: val })}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Créer une catégorie */}
      <Modal
        title="Créer une catégorie"
        open={isCreateCategoryOpen}
        onCancel={() => {
          setIsCreateCategoryOpen(false);
          createCategoryForm.resetFields();
        }}
        onOk={() => {
          createCategoryForm
            .validateFields()
            .then(async ({ name, icon }) => {
              const iconName = icon?.name || 'AppstoreOutlined';
              const iconColor = icon?.color || '#1890ff';
              await addSection({ name: name.trim(), icon: iconName, iconColor });
              setIsCreateCategoryOpen(false);
              createCategoryForm.resetFields();
            })
            .catch(() => {});
        }}
        okText="Créer"
        cancelText="Annuler"
        destroyOnHidden
        forceRender
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
      >
        <Form form={createCategoryForm} layout="vertical">
          <Form.Item
            name="name"
            label="Nom de la catégorie"
            rules={[{ required: true, message: 'Saisissez un nom' }]}
          >
            <Input placeholder="Ex: Google Workspace" />
          </Form.Item>
          <Form.Item name="icon" label="Icône et couleur">
            <IconPicker
              withColor
              value={createCategoryForm.getFieldValue('icon')}
              onChange={(val) => createCategoryForm.setFieldsValue({ icon: val })}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Supprimer le module"
        open={isDeleteModalVisible}
        onOk={handleConfirmDelete}
        onCancel={handleCancelDelete}
        okText="Supprimer"
        cancelText="Annuler"
        okType="danger"
      >
        {moduleToDelete && (
          <p>
            Êtes-vous sûr de vouloir supprimer le module "<strong>{moduleToDelete.label}</strong>" ?
            <br />
            <br />
            Cette action est irréversible et supprimera le module de la base de données.
          </p>
        )}
      </Modal>
    </div>
  </ConfigProvider>
  );
}
