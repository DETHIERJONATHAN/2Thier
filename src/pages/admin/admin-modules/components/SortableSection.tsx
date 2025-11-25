import React, { useEffect, useMemo, useState } from 'react';
// CACHE BUSTER: White cards design - Nov 19 2025 v1
import {
  Card,
  Button,
  Col,
  Dropdown,
  Input,
  Modal,
  Row,
  Space,
  Switch,
  Tag,
  Tooltip,
  Typography,
  Divider,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  DeleteOutlined,
  DownOutlined,
  DragOutlined,
  EditOutlined,
  MoreOutlined,
  PlusOutlined,
  SearchOutlined,
  UpOutlined,
} from '@ant-design/icons';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ModuleWithStatus, SectionWithModules } from '../types';
import { useAuth } from '../../../../auth/useAuth';
import IconRenderer from './shared/IconRenderer';

type SortableModule = ModuleWithStatus & { __sortableId: string };

interface DraggableModuleCardProps {
  module: SortableModule;
  section: SectionWithModules;
  onEditModule: (module: ModuleWithStatus) => void;
  onDeleteModule: (module: ModuleWithStatus) => void;
  onToggleModuleActive: (moduleId: string, currentActive: boolean) => void;
  onToggleModuleSuperAdminOnly: (moduleId: string, value: boolean) => void;
}

const DraggableModuleCard: React.FC<DraggableModuleCardProps> = ({
  module,
  section,
  onEditModule,
  onDeleteModule,
  onToggleModuleActive,
  onToggleModuleSuperAdminOnly,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: module.__sortableId });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.9 : 1,
    zIndex: isDragging ? 15 : 'auto',
  };

  const isGlobal = !module.organizationId;
  const badge = isGlobal ? (
       <Tag className="admin-chip admin-chip--blue">Global</Tag>
  ) : module.feature?.startsWith('super_admin_') ? (
       <Tag className="admin-chip admin-chip--amber">Super Admin</Tag>
  ) : (
       <Tag className="admin-chip admin-chip--green">Organisation</Tag>
  );

  const menuItems: MenuProps['items'] = [
    {
      key: 'edit',
      label: 'Éditer',
      onClick: () => onEditModule(module),
    },
    {
      key: 'delete',
      label: 'Supprimer',
      danger: true,
      onClick: () => onDeleteModule(module),
    },
  ].map((item) => ({
    key: item.key,
    danger: item.danger,
    label: (
      <button type="button" className="flex items-center gap-2 w-full text-left" onClick={item.onClick}>
        {item.label}
      </button>
    ),
  }));

  return (
    <div ref={setNodeRef} style={style} className="px-1 py-1">
      <Card
        size="small"
        hoverable
        bodyStyle={{ padding: 12 }}
        className={`group relative overflow-hidden rounded-lg border transition-all duration-300 ${isDragging ? 'shadow-2xl ring-2 ring-blue-500/50 scale-105 z-50' : 'hover:border-gray-200 hover:shadow-md hover:-translate-y-0.5'} bg-white border-gray-200`}
      >
        <div className="p-3">
          <div className="flex items-start gap-3">
          <div className="flex items-start gap-2">
              <div {...attributes} {...listeners} className="cursor-grab p-1 rounded text-gray-400 hover:text-gray-600 transition-colors mt-1">
                <DragOutlined />
              </div>
              <div
                className="rounded-lg p-2 flex items-center justify-center shadow-inner"
                style={{
                  backgroundColor: `${module.iconColor || section.iconColor || '#3b82f6'}15`,
                  width: 40,
                  height: 40,
                }}
              >
                <IconRenderer 
                  name={module.icon || 'AppstoreOutlined'} 
                  color={module.iconColor || section.iconColor || '#3b82f6'} 
                  size={20} 
                />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <Typography.Text className="truncate block font-semibold text-gray-800" title={module.label}>
                    {module.label}
                  </Typography.Text>
                  <Typography.Text className="text-xs font-mono truncate block text-gray-500" title={module.key}>
                    {module.key}
                  </Typography.Text>
                </div>
                <Typography.Text className="text-xs ml-2 text-gray-500 font-mono">
                  #{module.order ?? 0}
                </Typography.Text>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-gray-600 min-w-0">
                  {badge}
                  <span className="truncate opacity-70">{module.description || module.route || '—'}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Space size={4}>
                    <Tooltip title={module.superAdminOnly ? 'Réservé Super Admin' : module.active ? 'Désactiver' : 'Activer'}>
                      <Switch
                        size="small"
                        checked={!!module.active}
                        onChange={() => onToggleModuleActive(module.id, !!module.active)}
                        disabled={!!module.superAdminOnly}
                        className="admin-toggle"
                        data-variant="success"
                      />
                    </Tooltip>
                    <Tooltip title="Visible uniquement pour Super Admin">
                      <Switch
                        size="small"
                        checked={!!module.superAdminOnly}
                        onChange={(checked) => onToggleModuleSuperAdminOnly(module.id, checked)}
                        className="admin-toggle"
                        data-variant="warning"
                      />
                    </Tooltip>
                  </Space>
                  <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
                    <Button type="text" size="small" icon={<MoreOutlined className="text-gray-500" />} />
                  </Dropdown>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export interface SortableSectionProps {
  section: SectionWithModules;
  catId: string;
  onEdit: (sectionId: string) => void;
  onDelete: (sectionId: string) => void;
  onCreateCategoryFromSection?: (sectionId: string) => void;
  onPurgeFallbackSection?: (sectionId: string) => void;
  onEditModule: (module: ModuleWithStatus) => void;
  onDeleteModule: (module: ModuleWithStatus) => void;
  onAddModuleToCategory: (categoryId: string, defaultOrder: number) => void;
  onToggleSectionActive: (sectionId: string) => void;
  onToggleSectionAdminOnly: (sectionId: string, value: boolean) => void;
  onToggleModuleActive: (moduleId: string, currentActive: boolean) => void;
  onToggleModuleSuperAdminOnly: (moduleId: string, value: boolean) => void;
  viewMode?: 'list' | 'grid';
  isOpen?: boolean;
  onPanelChange?: (panelId: string, isOpen: boolean) => void;
}

export const SortableSection: React.FC<SortableSectionProps> = ({
  section,
  catId,
  onEdit,
  onDelete,
  onCreateCategoryFromSection,
  onPurgeFallbackSection,
  onEditModule,
  onDeleteModule,
  onAddModuleToCategory,
  onToggleSectionActive,
  onToggleSectionAdminOnly,
  onToggleModuleActive,
  onToggleModuleSuperAdminOnly,
  viewMode = 'list',
  isOpen,
  onPanelChange,
}) => {
  const { user } = useAuth();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: catId });
  const [localSearch, setLocalSearch] = useState('');
  const [openLocal, setOpenLocal] = useState<boolean>(!!isOpen);

  useEffect(() => {
    if (typeof isOpen === 'boolean') {
      setOpenLocal(isOpen);
    }
  }, [isOpen]);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 'auto',
    boxShadow: isDragging ? '0 10px 25px rgba(0,0,0,0.15)' : undefined,
  };

  const headerTitle = useMemo(() => {
    const fallback = section as Partial<SectionWithModules> & { name?: string; label?: string; category?: string };
    return section.title || fallback.name || fallback.label || fallback.category || 'Catégorie';
  }, [section]);

  const iconEl = useMemo(
    () => <IconRenderer name={section.iconName || 'AppstoreOutlined'} color={section.iconColor || '#1890ff'} size={18} />,
    [section.iconName, section.iconColor]
  );

  const rows: SortableModule[] = useMemo(() => {
    const term = localSearch.trim().toLowerCase();
    return (section.modules || [])
      .filter((module) => {
        if (!term) return true;
        return (
          module.label.toLowerCase().includes(term) ||
          module.key.toLowerCase().includes(term) ||
          (module.description || '').toLowerCase().includes(term)
        );
      })
      .map((module, index) => ({
        ...module,
        __sortableId: `mod:${String(module.id ?? module.key ?? `${section.id}-${index}`)}`,
      }));
  }, [section.modules, localSearch, section.id]);

  const items = useMemo(() => rows.map((row) => row.__sortableId), [rows]);
  const isRealCategory = !!section.backendCategoryId;
  const canDelete = useMemo(() => {
    const isSuperAdmin = user?.role === 'super_admin';
    const isEmpty = (section.modules?.length ?? 0) === 0;
    return !!section.id && (isSuperAdmin || isEmpty);
  }, [user?.role, section.id, section.modules?.length]);

  const handleTogglePanel = (event: React.MouseEvent) => {
    event.stopPropagation();
    setOpenLocal((current) => {
      const next = !current;
      if (onPanelChange) {
        onPanelChange(catId.replace('cat:', ''), next);
      }
      return next;
    });
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-6">
      <Card
        size="small"
        bordered={false}
        className={`rounded-lg overflow-hidden transition-all duration-300 ${isDragging ? 'ring-2 ring-blue-500 shadow-xl scale-[1.02] z-40 bg-white' : 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-md'}`}
      >
        {/* Header Section */}
        <div className="px-5 py-4 flex flex-wrap items-center gap-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div {...attributes} {...listeners} className="cursor-grab text-gray-400 hover:text-gray-600 flex items-center transition-colors">
              <DragOutlined className="text-lg" />
            </div>
            <div 
              className="h-12 w-12 rounded-lg flex items-center justify-center shadow-sm"
              style={{ backgroundColor: `${section.iconColor || '#3b82f6'}15` }}
            >
              {iconEl}
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-gray-900 m-0 truncate leading-tight">
                {headerTitle}
              </h3>
              <span className="text-xs text-gray-600 font-medium">
                {section.modules?.length || 0} modules
              </span>
            </div>
            <div className="ml-2">
              {isRealCategory ? (
                 <Tag className="admin-chip admin-chip--green">BDD</Tag>
              ) : (
                <Tooltip title="Section fallback détectée. Créez une vraie catégorie pour l'éditer.">
                  <Tag className="admin-chip admin-chip--amber">Fallback</Tag>
                </Tooltip>
              )}
            </div>
          </div>

          {/* Quick Preview in Grid Mode */}
          {viewMode === 'grid' && (
            <div className="hidden lg:flex items-center gap-2 flex-wrap max-w-xl">
              {(section.modules || []).slice(0, 6).map((module) => (
                <div 
                  key={module.id || module.key} 
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-100 border border-gray-300 text-xs text-gray-700"
                >
                  <IconRenderer name={module.icon || 'AppstoreOutlined'} color={module.iconColor || section.iconColor || '#3b82f6'} size={12} />
                  <span className="truncate max-w-[100px]">{module.label}</span>
                </div>
              ))}
              {(section.modules?.length || 0) > 6 && (
                <span className="text-xs text-slate-500 font-medium px-2">
                  +{(section.modules?.length || 0) - 6}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Toolbar */}
        <div className="px-5 py-3 border-t border-gray-200 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2" onClick={(event) => event.stopPropagation()}>
            {!isRealCategory && onCreateCategoryFromSection && (
              <Tooltip title="Créer une catégorie en base">
                <Button size="small" icon={<PlusOutlined />} onClick={() => onCreateCategoryFromSection(String(section.id))} className="bg-white border-gray-300 text-gray-700 hover:text-gray-900 hover:border-gray-400">
                  Créer
                </Button>
              </Tooltip>
            )}
            {!isRealCategory && onPurgeFallbackSection && (
              <Tooltip title="Supprimer tous les modules">
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  ghost
                  onClick={() =>
                    Modal.confirm({
                      title: 'Supprimer cette section fallback ?',
                      content: 'Cette action supprimera définitivement les modules rattachés.',
                      okText: 'Supprimer',
                      cancelText: 'Annuler',
                      okType: 'danger',
                      centered: true,
                      onOk: () => onPurgeFallbackSection(String(section.id)),
                    })
                  }
                >
                  Purger
                </Button>
              </Tooltip>
            )}
            
            <Tooltip title="Ajouter un module">
              <Button 
                size="small" 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={() => onAddModuleToCategory(String(section.id), section.modules?.length || 0)}
                className="bg-blue-600 hover:bg-blue-700 border-none shadow-sm"
              />
            </Tooltip>

            <Divider type="vertical" className="border-gray-300 mx-1" />

            <Tooltip title={isRealCategory ? 'Éditer' : "Section fallback"}>
              <Button 
                size="small" 
                icon={<EditOutlined />} 
                onClick={() => isRealCategory && onEdit(section.id)} 
                disabled={!isRealCategory}
                className="bg-white border-gray-300 text-gray-700 hover:text-gray-900 hover:border-gray-400"
              />
            </Tooltip>
            
            <Tooltip title={!isRealCategory ? 'Nettoyez la section' : canDelete ? 'Supprimer' : 'Non vide ou droits insuffisants'}>
              <Button
                size="small"
                danger
                type="text"
                icon={<DeleteOutlined />}
                onClick={() => {
                  if (!isRealCategory || !canDelete) return;
                  Modal.confirm({
                    title: 'Supprimer la catégorie',
                    content: "Cette action est irréversible. Assurez-vous que la catégorie est vide.",
                    okText: 'Supprimer',
                    cancelText: 'Annuler',
                    okType: 'danger',
                    centered: true,
                    onOk: () => onDelete(section.id),
                  });
                }}
                disabled={!isRealCategory || !canDelete}
              />
            </Tooltip>

            <Divider type="vertical" className="border-gray-300 mx-1" />

            <Tooltip title={section.active ? 'Désactiver la catégorie' : 'Activer la catégorie'}>
              <Switch 
                size="small" 
                checked={!!section.active} 
                onChange={() => onToggleSectionActive(section.id)} 
                disabled={!isRealCategory || !!section.superAdminOnly}
                className="admin-toggle"
                data-variant="success"
              />
            </Tooltip>
            
            <Tooltip title="Visible uniquement pour Super Admin">
              <Switch 
                size="small" 
                checked={!!section.superAdminOnly} 
                onChange={(checked) => onToggleSectionAdminOnly(section.id, checked)} 
                disabled={!isRealCategory}
                className="admin-toggle"
                data-variant="warning"
              />
            </Tooltip>
          </div>

          <div className="flex items-center gap-3">
            <Input
              allowClear
              size="small"
              prefix={<SearchOutlined className="text-gray-400" />}
              placeholder="Filtrer..."
              value={localSearch}
              onChange={(event) => setLocalSearch(event.target.value)}
              className="w-40 bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
              bordered
            />
            <Tooltip title={openLocal ? 'Réduire' : 'Développer'}>
              <Button 
                size="small" 
                type="text" 
                icon={openLocal ? <UpOutlined /> : <DownOutlined />} 
                onClick={handleTogglePanel}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              />
            </Tooltip>
          </div>
        </div>

        {/* Content */}
        {openLocal && (
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            {rows.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-gray-300 rounded-lg bg-white">
                <div className="text-4xl mb-3 opacity-30">🗂️</div>
                <p className="text-gray-600 font-medium">Cette catégorie est vide</p>
                <p className="text-xs text-gray-500 mt-1">Glissez-déposez des modules ici ou ajoutez-en un nouveau</p>
              </div>
            ) : (
              <SortableContext items={items}>
                <Row gutter={[16, 16]}>
                  {rows.map((row) => (
                    <Col xs={24} sm={12} md={8} lg={6} key={row.__sortableId}>
                      <DraggableModuleCard
                        module={row}
                        section={section}
                        onEditModule={onEditModule}
                        onDeleteModule={onDeleteModule}
                        onToggleModuleActive={onToggleModuleActive}
                        onToggleModuleSuperAdminOnly={onToggleModuleSuperAdminOnly}
                      />
                    </Col>
                  ))}
                </Row>
              </SortableContext>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default SortableSection;
