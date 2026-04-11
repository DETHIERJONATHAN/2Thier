import {FB, SF} from '../../../../components/zhiive/ZhiiveTheme';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Dropdown,
  Input,
  Modal,
  Tooltip,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  DownOutlined,
  DragOutlined,
  MoreOutlined,
  SearchOutlined,
  UpOutlined,
} from '@ant-design/icons';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ModuleWithStatus, SectionWithModules } from '../types';
import { useAuth } from '../../../../auth/useAuth';
import IconRenderer from './shared/IconRenderer';

// ── Facebook Design Tokens ──
// ── FBToggle (identique à UsersAdminPageNew) ──
const FBToggle = ({ checked, onChange, disabled, size = 'small' }: {
  checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; size?: 'small' | 'default';
}) => {
  const w = size === 'small' ? 36 : 44;
  const h = size === 'small' ? 20 : 24;
  const dot = size === 'small' ? 16 : 20;
  return (
    <div
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: w, height: h, borderRadius: h,
        background: disabled ? '#ccc' : checked ? FB.blue : '#ccc',
        cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative', transition: 'background 0.2s',
        opacity: disabled ? 0.5 : 1, flexShrink: 0,
      }}
    >
      <div style={{
        width: dot, height: dot, borderRadius: '50%', background: FB.white,
        position: 'absolute', top: (h - dot) / 2,
        left: checked ? w - dot - (h - dot) / 2 : (h - dot) / 2,
        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }} />
    </div>
  );
};

type SortableModule = ModuleWithStatus & { __sortableId: string };

interface DraggableModuleCardProps {
  module: SortableModule;
  section: SectionWithModules;
  onEditModule: (module: ModuleWithStatus) => void;
  onDeleteModule: (module: ModuleWithStatus) => void;
  onToggleModuleActive: (moduleId: string, currentActive: boolean) => void;
  onToggleModuleSuperAdminOnly: (moduleId: string, value: boolean) => void;
  onUpdateModulePlacement?: (moduleId: string, placement: string) => void;
}

const DraggableModuleCard: React.FC<DraggableModuleCardProps> = ({
  module,
  section,
  onEditModule,
  onDeleteModule,
  onToggleModuleActive,
  onToggleModuleSuperAdminOnly,
  onUpdateModulePlacement,
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
       <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: FB.activeBlue, color: FB.blue, fontWeight: 600 }}>Global</span>
  ) : module.feature?.startsWith('super_admin_') ? (
       <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: '#fff3e0', color: '#f7931a', fontWeight: 600 }}>Super Admin</span>
  ) : (
       <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: '#e6f4ea', color: '#42b72a', fontWeight: 600 }}>Organisation</span>
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
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left' }} onClick={item.onClick}>
        {item.label}
      </span>
    ),
  }));

  return (
    <div ref={setNodeRef} style={{ ...style, padding: 4 }}>
      <div
        style={{
          background: FB.white, borderRadius: FB.radius, border: `1px solid ${FB.border}`,
          boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.15)' : FB.shadow,
          transform: isDragging ? 'scale(1.03)' : undefined,
          transition: 'box-shadow 0.2s, transform 0.2s',
          overflow: 'hidden', cursor: 'default',
        }}
      >
        <div style={{ padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            {/* Drag handle + icon */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <div {...attributes} {...listeners} style={{ cursor: 'grab', padding: 4, borderRadius: 4, color: FB.textSecondary, marginTop: 4 }}>
                <DragOutlined />
              </div>
              <div
                style={{
                  borderRadius: 8, padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: `${module.iconColor || section.iconColor || SF.blue}15`,
                  width: 40, height: 40,
                }}
              >
                <IconRenderer 
                  name={module.icon || 'AppstoreOutlined'} 
                  color={module.iconColor || section.iconColor || SF.blue} 
                  size={20} 
                />
              </div>
            </div>
            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: FB.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={module.label}>
                    {module.label}
                  </div>
                  <div style={{ fontSize: 11, fontFamily: 'monospace', color: FB.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={module.key}>
                    {module.key}
                  </div>
                </div>
                <span style={{ fontSize: 11, marginLeft: 8, color: FB.textSecondary, fontFamily: 'monospace' }}>
                  #{module.order ?? 0}
                </span>
              </div>
              {/* Bottom: badge + actions */}
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: FB.textSecondary, minWidth: 0 }}>
                  {badge}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.7 }}>{module.description || module.route || '—'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Tooltip title={module.active ? '✅ Activé — Ce module est visible. Cliquez pour le désactiver.' : '❌ Désactivé — Ce module est masqué pour tous. Cliquez pour l\'activer.'}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
                      <span style={{ fontSize: 11, color: module.active ? FB.blue : FB.textSecondary }}>Actif</span>
                      <FBToggle
                        checked={!!module.active}
                        onChange={() => onToggleModuleActive(module.id, !!module.active)}
                      />
                    </span>
                  </Tooltip>
                  <Tooltip title={module.superAdminOnly ? '🔒 SA activé — Ce module est visible UNIQUEMENT pour les Super Admins. Cliquez pour le rendre visible à tous.' : '🔓 SA désactivé — Ce module est visible par tous les utilisateurs. Cliquez pour le restreindre aux Super Admins.'}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
                      <span style={{ fontSize: 11, color: module.superAdminOnly ? '#f7931a' : FB.textSecondary }}>SA</span>
                      <FBToggle
                        checked={!!module.superAdminOnly}
                        onChange={(checked) => onToggleModuleSuperAdminOnly(module.id, checked)}
                      />
                    </span>
                  </Tooltip>
                  <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
                    <Button type="text" size="small" icon={<MoreOutlined style={{ color: FB.textSecondary }} />} />
                  </Dropdown>
                </div>
              </div>
              {/* Placement toggles: Header / Menu pastilles */}
              {onUpdateModulePlacement && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, paddingTop: 8, borderTop: `1px solid ${FB.border}` }}>
                  <Tooltip title={(module.placement === 'swipe' || module.placement === 'both') ? '✅ Header activé — Ce module apparaît dans la barre de navigation en haut de l\'écran (onglets principaux). Cliquez pour le retirer du header.' : '❌ Header désactivé — Ce module n\'apparaît PAS dans la barre en haut. Cliquez pour l\'ajouter au header.'}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                      <span style={{ fontSize: 11, color: (module.placement === 'swipe' || module.placement === 'both') ? FB.blue : FB.textSecondary, fontWeight: 600 }}>Header</span>
                      <FBToggle
                        checked={module.placement === 'swipe' || module.placement === 'both'}
                        onChange={(checked) => {
                          const inSidebar = module.placement === 'sidebar' || module.placement === 'both';
                          let newPlacement: string;
                          if (checked && inSidebar) newPlacement = 'both';
                          else if (checked) newPlacement = 'swipe';
                          else if (inSidebar) newPlacement = 'sidebar';
                          else newPlacement = 'sidebar';
                          onUpdateModulePlacement(module.id, newPlacement);
                        }}
                      />
                    </span>
                  </Tooltip>
                  <Tooltip title={(module.placement === 'sidebar' || module.placement === 'both') ? '✅ Menu activé — Ce module apparaît dans les pastilles sous « Quoi de neuf ? ». Cliquez pour le retirer du menu.' : '❌ Menu désactivé — Ce module n\'apparaît PAS dans les pastilles sous « Quoi de neuf ? ». Cliquez pour l\'ajouter.'}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                      <span style={{ fontSize: 11, color: (module.placement === 'sidebar' || module.placement === 'both') ? FB.blue : FB.textSecondary, fontWeight: 600 }}>Menu</span>
                      <FBToggle
                        checked={module.placement === 'sidebar' || module.placement === 'both'}
                        onChange={(checked) => {
                          const inSwipe = module.placement === 'swipe' || module.placement === 'both';
                          let newPlacement: string;
                          if (checked && inSwipe) newPlacement = 'both';
                          else if (checked) newPlacement = 'sidebar';
                          else if (inSwipe) newPlacement = 'swipe';
                          else newPlacement = 'sidebar';
                          onUpdateModulePlacement(module.id, newPlacement);
                        }}
                      />
                    </span>
                  </Tooltip>
                  <span style={{ fontSize: 10, color: FB.textSecondary, opacity: 0.7 }}>
                    {module.placement === 'both' ? 'header + menu' : module.placement === 'swipe' ? 'header' : 'menu'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
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
  onUpdateModulePlacement?: (moduleId: string, placement: string) => void;
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
  onUpdateModulePlacement,
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

  // ──FB, SFAction Button (identical to UsersAdminPageNew) ──
  const ActionBtn = ({ label, icon, onClick, danger, primary, disabled }: {
    label: string; icon: string; onClick: () => void;
    danger?: boolean; primary?: boolean; disabled?: boolean;
  }) => (
    <button
      onClick={disabled ? undefined : onClick}
      title={label}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 12px', borderRadius: 6, border: 'none',
        background: primary ? FB.blue : danger ? '#ffeef0' : FB.btnGray,
        color: disabled ? '#bbb' : primary ? FB.white : danger ? FB.red : FB.text,
        cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600,
        transition: 'background 0.15s', whiteSpace: 'nowrap', opacity: disabled ? 0.6 : 1,
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );

  return (
    <div ref={setNodeRef} style={{ ...style, marginBottom: 20 }}>
      <div
        style={{
          background: FB.white, borderRadius: FB.radius, overflow: 'hidden',
          boxShadow: isDragging ? '0 10px 25px rgba(0,0,0,0.15)' : FB.shadow,
          border: `1px solid ${FB.border}`,
          transform: isDragging ? 'scale(1.01)' : undefined,
          transition: 'box-shadow 0.2s, transform 0.2s',
        }}
      >
        {/* Header Section */}
        <div style={{
          padding: '14px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14,
          borderBottom: `1px solid ${FB.border}`, background: '#fafbfc',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
            <div {...attributes} {...listeners} style={{ cursor: 'grab', color: FB.textSecondary, display: 'flex', alignItems: 'center' }}>
              <DragOutlined style={{ fontSize: 16 }} />
            </div>
            <div 
              style={{
                height: 44, width: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: `${section.iconColor || SF.blue}15`,
              }}
            >
              {iconEl}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: FB.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {headerTitle}
              </div>
              <span style={{ fontSize: 12, color: FB.textSecondary, fontWeight: 500 }}>
                {section.modules?.length || 0} modules
              </span>
            </div>
            <div style={{ marginLeft: 8 }}>
              {isRealCategory ? (
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: '#e6f4ea', color: FB.green, fontWeight: 600 }}>BDD</span>
              ) : (
                <Tooltip title="Section fallback détectée. Créez une vraie catégorie pour l'éditer.">
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: '#fff3e0', color: FB.orange, fontWeight: 600 }}>Fallback</span>
                </Tooltip>
              )}
            </div>
          </div>

          {/* Quick Preview in Grid Mode */}
          {viewMode === 'grid' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', maxWidth: 500 }}>
              {(section.modules || []).slice(0, 6).map((module) => (
                <div 
                  key={module.id || module.key} 
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px',
                    borderRadius: 6, background: FB.btnGray, border: `1px solid ${FB.border}`,
                    fontSize: 11, color: FB.text,
                  }}
                >
                  <IconRenderer name={module.icon || 'AppstoreOutlined'} color={module.iconColor || section.iconColor || SF.blue} size={12} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>{module.label}</span>
                </div>
              ))}
              {(section.modules?.length || 0) > 6 && (
                <span style={{ fontSize: 11, color: FB.textSecondary, fontWeight: 500, padding: '0 6px' }}>
                  +{(section.modules?.length || 0) - 6}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Toolbar -FB, SFstyle action buttons like UsersAdminPageNew */}
        <div style={{
          padding: '10px 20px', borderTop: `1px solid ${FB.border}`, background: FB.white,
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }} onClick={(event) => event.stopPropagation()}>
            {!isRealCategory && onCreateCategoryFromSection && (
              <ActionBtn label="Créer catégorie" icon="📁" onClick={() => onCreateCategoryFromSection(String(section.id))} primary />
            )}
            {!isRealCategory && onPurgeFallbackSection && (
              <ActionBtn label="Purger" icon="🧹" onClick={() =>
                Modal.confirm({
                  title: 'Supprimer cette section fallback ?',
                  content: 'Cette action supprimera définitivement les modules rattachés.',
                  okText: 'Supprimer', cancelText: 'Annuler', okType: 'danger', centered: true,
                  onOk: () => onPurgeFallbackSection(String(section.id)),
                })
              } danger />
            )}
            
            <ActionBtn label="Ajouter" icon="➕" onClick={() => onAddModuleToCategory(String(section.id), section.modules?.length || 0)} primary />

            <div style={{ width: 1, height: 20, background: FB.border, margin: '0 4px' }} />

            <ActionBtn label="Éditer" icon="✏️" onClick={() => isRealCategory && onEdit(section.id)} disabled={!isRealCategory} />
            
            <ActionBtn label="Supprimer" icon="🗑️" onClick={() => {
              if (!isRealCategory || !canDelete) return;
              Modal.confirm({
                title: 'Supprimer la catégorie',
                content: "Cette action est irréversible. Assurez-vous que la catégorie est vide.",
                okText: 'Supprimer', cancelText: 'Annuler', okType: 'danger', centered: true,
                onOk: () => onDelete(section.id),
              });
            }} danger disabled={!isRealCategory || !canDelete} />

            <div style={{ width: 1, height: 20, background: FB.border, margin: '0 4px' }} />

            <Tooltip title={section.active ? '✅ Section activée — Tous les modules de cette section sont visibles. Cliquez pour désactiver.' : '❌ Section désactivée — Tous les modules de cette section sont masqués. Cliquez pour activer.'}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: isRealCategory ? 'pointer' : 'not-allowed' }}>
                <span style={{ fontSize: 12, color: section.active ? FB.blue : FB.textSecondary, fontWeight: 600 }}>Actif</span>
                <FBToggle
                  checked={!!section.active} 
                  onChange={() => onToggleSectionActive(section.id)} 
                  disabled={!isRealCategory}
                />
              </span>
            </Tooltip>
            
            <Tooltip title={section.superAdminOnly ? '🔒 SA activé — Cette section entière est visible UNIQUEMENT pour les Super Admins. Cliquez pour la rendre visible à tous.' : '🔓 SA désactivé — Cette section est visible par tous les utilisateurs. Cliquez pour la restreindre aux Super Admins.'}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: isRealCategory ? 'pointer' : 'not-allowed' }}>
                <span style={{ fontSize: 12, color: section.superAdminOnly ? '#f7931a' : FB.textSecondary, fontWeight: 600 }}>SA</span>
                <FBToggle
                  checked={!!section.superAdminOnly} 
                  onChange={(checked) => onToggleSectionAdminOnly(section.id, checked)} 
                  disabled={!isRealCategory}
                />
              </span>
            </Tooltip>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Input
              allowClear
              size="small"
              prefix={<SearchOutlined style={{ color: FB.textSecondary }} />}
              placeholder="Filtrer..."
              value={localSearch}
              onChange={(event) => setLocalSearch(event.target.value)}
              style={{ width: 160 }}
            />
            <Tooltip title={openLocal ? 'Réduire' : 'Développer'}>
              <button 
                onClick={handleTogglePanel}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28,
                  borderRadius: 6, border: 'none', background: FB.btnGray, color: FB.textSecondary,
                  cursor: 'pointer', transition: 'background 0.15s',
                }}
              >
                {openLocal ? <UpOutlined /> : <DownOutlined />}
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Content - Module cards grid */}
        {openLocal && (
          <div style={{ borderTop: `1px solid ${FB.border}`, padding: 16, background: FB.bg }}>
            {rows.length === 0 ? (
              <div style={{
                padding: '48px 0', textAlign: 'center', border: `2px dashed ${FB.border}`,
                borderRadius: FB.radius, background: FB.white,
              }}>
                <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.3 }}>🗂️</div>
                <p style={{ color: FB.textSecondary, fontWeight: 500, margin: 0 }}>Cette catégorie est vide</p>
                <p style={{ fontSize: 12, color: FB.textSecondary, marginTop: 4 }}>Glissez-déposez des modules ici ou ajoutez-en un nouveau</p>
              </div>
            ) : (
              <SortableContext items={items}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  {rows.map((row) => (
                    <div key={row.__sortableId} style={{ flex: '1 1 280px', maxWidth: '100%', minWidth: 260 }}>
                      <DraggableModuleCard
                        module={row}
                        section={section}
                        onEditModule={onEditModule}
                        onDeleteModule={onDeleteModule}
                        onToggleModuleActive={onToggleModuleActive}
                        onToggleModuleSuperAdminOnly={onToggleModuleSuperAdminOnly}
                        onUpdateModulePlacement={onUpdateModulePlacement}
                      />
                    </div>
                  ))}
                </div>
              </SortableContext>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SortableSection;
