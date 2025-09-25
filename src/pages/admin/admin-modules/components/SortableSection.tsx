import React, { useMemo, useState } from 'react';
import { Button, Tooltip, Table, Input, Collapse, Switch, Modal } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  EditOutlined,
  DeleteOutlined,
  DragOutlined,
  PlusOutlined,
  SearchOutlined,
  // HolderOutlined,
} from '@ant-design/icons';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ModuleWithStatus, SectionWithModules } from '../types';
import { useAuthenticatedApi } from '../../../../hooks/useAuthenticatedApi';
import { useAuth } from '../../../../auth/useAuth';
// import AdminSwitch from '../../../../components/admin/AdminSwitch';
// import { NotificationManager } from '../../../../components/Notifications';
import IconRenderer from './shared/IconRenderer';

// Types de ligne pour la Table
type RowType = ModuleWithStatus & { __sortableId: string };

// Ligne AntD Table rendue draggable via dnd-kit avec poignée visible
const DraggableRow: React.FC<
  React.HTMLAttributes<HTMLTableRowElement> & { 'data-row-key': string }
> = (props) => {
  const id = String(props['data-row-key'] ?? '');
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style: React.CSSProperties = {
    ...props.style,
    transform: CSS.Transform.toString(transform),
    transition,
    backgroundColor: isDragging ? '#f0f8ff' : 'transparent',
    opacity: isDragging ? 0.8 : 1,
    border: isDragging ? '2px dashed #1890ff' : undefined,
    cursor: isDragging ? 'grabbing' : 'pointer',
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      {...props}
      className={`
        ${props.className || ''}
        hover:bg-gray-50 transition-colors
        ${isDragging ? 'shadow-lg z-50 scale-105' : ''}
      `.trim()}
    >
      {/* Filtrer les props pour toutes les cellules afin d'éviter les warnings React */}
      {React.Children.map(props.children, (child, index) => {
        if (React.isValidElement(child)) {
          // Filtrer les props pour ne garder que celles qui sont valides pour les éléments DOM
          // Exclure key qui doit être passé directement
          const validProps = child.props ? {
            className: child.props.className,
            style: child.props.style,
            onClick: child.props.onClick,
            onMouseEnter: child.props.onMouseEnter,
            onMouseLeave: child.props.onMouseLeave,
            role: child.props.role,
            'aria-label': child.props['aria-label']
          } : {};
          
          // Utiliser l'index comme key puisque React ne permet pas d'accéder à child.props.key
          const childKey = index;
          
          if (index === 0) {
            // Première colonne (drag handle)
            return (
              <td 
                key={childKey}
                {...validProps}
                className={`${validProps.className || ''} cursor-grab active:cursor-grabbing text-center`}
                {...attributes} 
                {...listeners}
              >
                <DragOutlined className="text-gray-400 hover:text-gray-600" />
              </td>
            );
          }
          
          // Autres colonnes - cloner l'enfant avec les props filtrées
          return React.cloneElement(child, { key: childKey, ...validProps });
        }
        return child;
      })}
    </tr>
  );
};

export function SortableSection({
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
  isOpen,
  onPanelChange,
}: {
  section: SectionWithModules;
  catId: string;
  onEdit: (sectionId: string) => void;
  onDelete: (sectionId: string) => void;
  onCreateCategoryFromSection?: (sectionId: string) => void;
  onPurgeFallbackSection?: (sectionId: string) => void;
  onEditModule: (m: ModuleWithStatus) => void;
  onDeleteModule: (m: ModuleWithStatus) => void;
  onAddModuleToCategory: (categoryId: string, defaultOrder: number) => void;
  onToggleSectionActive: (sectionId: string) => void;
  onToggleSectionAdminOnly: (sectionId: string, value: boolean) => void;
  onToggleModuleActive: (moduleId: string, currentActive: boolean) => void;
  onToggleModuleSuperAdminOnly: (moduleId: string, value: boolean) => void;
  isOpen?: boolean;
  onPanelChange?: (panelId: string, isOpen: boolean) => void;
}) {
  useAuthenticatedApi();
  const { user } = useAuth();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: catId });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 'auto',
    boxShadow: isDragging ? '0 8px 20px rgba(0,0,0,0.15)' : 'none',
  };
  const [localSearch, setLocalSearch] = useState('');

  const headerTitle = useMemo(() => {
    const tryGet = (v: unknown) =>
      typeof v === 'string' && v.trim() ? v.trim() : undefined;
    const s: Partial<SectionWithModules> & {
      name?: string;
      category?: string;
      label?: string;
    } = section as unknown as Partial<SectionWithModules> & {
      name?: string;
      category?: string;
      label?: string;
    };
    return (
      tryGet(section.title) ||
      tryGet(s.name) ||
      tryGet(s.category) ||
      tryGet(s.label) ||
      'Catégorie'
    );
  }, [section]);

  const iconEl = useMemo(
    () => (
      <IconRenderer
        name={section.iconName || 'AppstoreOutlined'}
        color={section.iconColor || '#1890ff'}
        size={18}
      />
    ),
    [section.iconName, section.iconColor]
  );

  // Considérer "réelle" toute catégorie qui expose un backendCategoryId côté API
  const isRealCategory = !!section.backendCategoryId;

  const rows: RowType[] = useMemo(
    () =>
      (section.modules || [])
        .filter((m) => {
          const term = localSearch.trim().toLowerCase();
          if (!term) return true;
          return (
            (m.label || '').toLowerCase().includes(term) ||
            (m.key || '').toLowerCase().includes(term)
          );
        })
        .map((m, idx) => ({
          ...m,
          __sortableId: `mod:${String(m.id ?? m.key ?? `${section.id}-${idx}`)}`,
        })),
    [section.modules, localSearch, section.id]
  );

  const items = useMemo(() => rows.map((r) => r.__sortableId), [rows]);

  // Autorisation de suppression: super admin ou catégorie vide
  const canDelete = useMemo(() => {
    const isSuperAdmin = user?.role === 'super_admin';
    const isEmpty = (section.modules?.length ?? 0) === 0;
    return !!section.id && (isSuperAdmin || isEmpty);
  }, [section.id, section.modules?.length, user?.role]);

  const columns: ColumnsType<RowType> = useMemo(
    () => [
      {
        title: '',
        key: 'drag',
        width: 40,
        align: 'center',
        render: () => (
          <DragOutlined className="text-gray-400 hover:text-gray-600 cursor-grab" />
        ),
      },
      {
        title: 'Label',
        dataIndex: 'label',
        key: 'label',
        ellipsis: true,
        width: 260,
        render: (t: string, m: RowType) => (
          <div className="flex items-center gap-2 min-w-0">
            <IconRenderer
              name={m.icon || 'AppstoreOutlined'}
              color={
                m.iconColor || section.iconColor || m.sectionColor || '#1890ff'
              }
              size={18}
            />
            <span className="font-medium truncate" title={t}>
              {t}
            </span>
          </div>
        ),
      },
      {
        title: 'Clé',
        dataIndex: 'key',
        key: 'key',
        ellipsis: true,
        width: 160,
        render: (t: string) => (
          <span className="font-mono text-xs text-gray-600" title={t}>
            {t}
          </span>
        ),
      },
      {
        title: 'Ordre',
        dataIndex: 'order',
        key: 'order',
        align: 'center',
        width: 70,
        sorter: (a, b) => (a.order ?? 0) - (b.order ?? 0),
        render: (o: number | undefined) => (
          <span className="font-semibold">{o ?? 0}</span>
        ),
      },
      {
        title: 'Type',
        key: 'type',
        width: 120,
        render: (_: unknown, m: RowType) => {
          const isGlobal = !m.organizationId;
          const isSuperAdmin = (m.feature || '').startsWith('super_admin_');
          const Badge = ({
            text,
            tone,
          }: {
            text: string;
            tone: 'gold' | 'blue' | 'green';
          }) => (
            <span
              className={`text-xs px-2 py-0.5 rounded-full border ${
                {
                  gold: 'border-amber-300 text-amber-700 bg-amber-50',
                  blue: 'border-blue-300 text-blue-700 bg-blue-50',
                  green: 'border-green-300 text-green-700 bg-green-50',
                }[tone]
              }`}
            >
              {text}
            </span>
          );
          if (isSuperAdmin) return <Badge text="Super Admin" tone="gold" />;
          if (isGlobal) return <Badge text="Global" tone="blue" />;
          return <Badge text="Organisation" tone="green" />;
        },
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 180,
        render: (_: unknown, m: RowType) => (
          <div className="flex items-center gap-1">
            <Tooltip title="Éditer">
              <Button
                size="small"
                type="text"
                icon={<EditOutlined />}
                onClick={() => onEditModule(m)}
              />
            </Tooltip>
            <Tooltip title="Supprimer">
              <Button
                size="small"
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => onDeleteModule(m)}
              />
            </Tooltip>
            <Tooltip 
              title={
                m.superAdminOnly 
                  ? 'Désactivé car réservé aux Super Admin uniquement' 
                  : m.active ? 'Désactiver pour les organisations' : 'Activer pour les organisations'
              }
            >
              <Switch
                size="small"
                checked={!!m.active}
                onChange={() => onToggleModuleActive(m.id, !!m.active)}
                disabled={!!m.superAdminOnly}
              />
            </Tooltip>
            <Tooltip title="Visible uniquement pour Super Admin">
              <Switch
                size="small"
                checked={!!m.superAdminOnly}
                onChange={(checked) => onToggleModuleSuperAdminOnly(m.id, checked)}
              />
            </Tooltip>
          </div>
        ),
      },
    ],
    [onDeleteModule, onEditModule, onToggleModuleActive, onToggleModuleSuperAdminOnly, section.iconColor]
  );

  return (
    <div ref={setNodeRef} style={style} className="mb-4">
      <Collapse
        className={`
          shadow-sm hover:shadow-md bg-white rounded-md transition-all
          ${isDragging ? 'ring-2 ring-blue-300 bg-blue-50' : ''}
        `.trim()}
        bordered={false}
        // Si contrôlé par parent (pendant drag), utiliser isOpen. Sinon, état local
        {...(isOpen !== undefined && onPanelChange ? {
          activeKey: isOpen ? ['1'] : [],
          onChange: (activeKeys) => {
            const isNowOpen = Array.isArray(activeKeys) && activeKeys.length > 0;
            onPanelChange(catId.replace('cat:', ''), isNowOpen);
          }
        } : {
          // Comportement normal d'Ant Design
          onChange: () => {}
        })}
        items={[{
          key: '1',
          showArrow: false,
          label: (
            <div className="w-full px-4 py-3 flex items-center gap-3">
              {/* Icône + Titre (zone cliquable pour toggler, hors contrôles) */}
              <div
                className={`
                  flex items-center gap-3 select-none transition-all
                  ${isDragging ? 'cursor-grabbing opacity-60' : 'cursor-grab hover:bg-gray-50 rounded px-2 py-1'}
                `.trim()}
                {...attributes}
                {...listeners}
              >
                {iconEl}
                <span className="font-semibold text-base text-gray-800">
                  {headerTitle}
                </span>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  {section.modules?.length || 0} modules
                </span>
                {/* Badge BDD vs Fallback */}
                {isRealCategory ? (
                  <span className="text-xs px-2 py-0.5 rounded-full border border-green-300 text-green-700 bg-green-50">BDD</span>
                ) : (
                  <Tooltip title="Cette section est dérivée des modules (fallback). Cliquez pour créer une catégorie en base et pouvoir l'éditer.">
                    <span className="text-xs px-2 py-0.5 rounded-full border border-amber-300 text-amber-700 bg-amber-50">Fallback</span>
                  </Tooltip>
                )}
              </div>
              {/* Espace flexible pour pousser les actions à droite */}
              <div className="flex-1" />
              {/* Actions dans l'ordre demandé: Ajouter, Éditer, Supprimer, Recherche */}
              <div className="flex items-center gap-2" onClick={(e)=> e.stopPropagation()}>
                {!isRealCategory && onCreateCategoryFromSection && (
                  <Tooltip title="Créer une catégorie en base et migrer les modules de ce groupe">
                    <Button
                      size="small"
                      type="default"
                      icon={<PlusOutlined />}
                      onClick={() => onCreateCategoryFromSection(String(section.id))}
                    >
                      Créer catégorie
                    </Button>
                  </Tooltip>
                )}
                {!isRealCategory && onPurgeFallbackSection && (
                  <Tooltip title="Supprimer tous les modules de cette section fallback (action destructive)">
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => {
                        Modal.confirm({
                          title: 'Supprimer cette section fallback ? ',
                          content: 'Cela supprimera DÉFINITIVEMENT tous les modules de cette section. Cette action est irréversible.',
                          okText: 'Supprimer',
                          cancelText: 'Annuler',
                          okType: 'danger',
                          centered: true,
                          onOk: () => onPurgeFallbackSection(String(section.id))
                        });
                      }}
                    >
                      Supprimer fallback
                    </Button>
                  </Tooltip>
                )}
                <Tooltip title="Ajouter un module dans cette catégorie">
                  <Button
                    size="small"
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() =>
                      onAddModuleToCategory(
                        String(section.id),
                        section.modules?.length || 0
                      )
                    }
                  />
                </Tooltip>
                <Tooltip title={
                  isRealCategory 
                    ? 'Éditer la catégorie'
                    : 'Cette section est un fallback. Créez d\'abord une catégorie en base pour pouvoir l\'éditer.'
                }>
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => isRealCategory && onEdit(section.id)}
                    disabled={!isRealCategory}
                  />
                </Tooltip>
                <Tooltip title={
                  !isRealCategory
                    ? 'Section fallback: utilisez "Supprimer fallback" pour vider les modules'
                    : (canDelete ? 'Supprimer la catégorie' : 'Vider la catégorie ou droits insuffisants')
                }>
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      if (!isRealCategory || !canDelete) return;
                      Modal.confirm({
                        title: 'Supprimer la catégorie',
                        content: 'Cette action supprimera définitivement la catégorie. Assurez-vous qu\'elle est vide.',
                        okText: 'Supprimer',
                        cancelText: 'Annuler',
                        okType: 'danger',
                        centered: true,
                        onOk: () => onDelete(section.id)
                      });
                    }}
                    disabled={!isRealCategory || !canDelete}
                  />
                </Tooltip>
                <Tooltip title={
                  !isRealCategory
                    ? 'Section fallback: active/inactive non applicable. Créez d\'abord une catégorie.'
                    : (section.superAdminOnly 
                        ? 'Désactivé car réservé aux Super Admin uniquement' 
                        : section.active ? 'Désactiver la catégorie' : 'Activer la catégorie')
                }>
                  <Switch
                    size="small"
                    checked={!!section.active}
                    onChange={() => onToggleSectionActive(section.id)}
                    disabled={!isRealCategory || !!section.superAdminOnly}
                  />
                </Tooltip>
                <Tooltip title={
                  !isRealCategory
                    ? 'Section fallback: visibilité Super Admin non applicable'
                    : 'Visible uniquement pour Super Admin'
                }>
                  <Switch
                    size="small"
                    checked={!!section.superAdminOnly}
                    onChange={(checked) => onToggleSectionAdminOnly(section.id, checked)}
                    disabled={!isRealCategory}
                  />
                </Tooltip>
                <Input
                  allowClear
                  size="small"
                  prefix={<SearchOutlined className="text-gray-400" />}
                  placeholder="Rechercher..."
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className="w-48 md:w-64"
                />
              </div>
            </div>
          ),
          children: (
            <div className="overflow-x-auto border-t border-gray-200">
              {rows.length === 0 ? (
                <div className="p-8 text-center text-gray-500 bg-gray-50 border-2 border-dashed border-gray-300 rounded-md">
                  <DragOutlined className="text-2xl mb-2 text-gray-300" />
                  <p className="text-sm">Glissez-déposez des modules ici ou cliquez sur "Ajouter un module"</p>
                  <p className="text-xs text-gray-400 mt-1">Cette catégorie ne contient aucun module</p>
                </div>
              ) : (
                <SortableContext items={items}>
                  <Table
                    bordered
                    size="small"
                    sticky
                    pagination={false}
                    rowKey="__sortableId"
                    dataSource={rows}
                    columns={columns}
                    components={{ body: { row: DraggableRow } }}
                    className="
                      [&_.ant-table-thead_th]:bg-gray-50 
                      [&_.ant-table-thead_th]:uppercase 
                      [&_.ant-table-thead_th]:text-gray-600 
                      [&_.ant-table-thead_th]:text-xs 
                      [&_.ant-table-thead_th]:font-semibold 
                      [&_.ant-table-thead_th]:tracking-wide 
                      [&_.ant-table-thead_th]:py-2 
                      [&_.ant-table-tbody_td]:py-2
                      [&_.ant-table-tbody_tr:hover]:bg-blue-50
                    "
                  />
                </SortableContext>
              )}
            </div>
          )
        }]}
      />
    </div>
  );
}
