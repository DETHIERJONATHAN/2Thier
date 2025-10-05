import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { 
  MoreOutlined, 
  EditOutlined, 
  CopyOutlined, 
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  SettingOutlined
} from '@ant-design/icons';
import type { TreeNode } from '../../types';

interface NodeActionMenuProps {
  node: TreeNode;
  readOnly?: boolean;
  isExpanded?: boolean;
  onEdit?: (node: TreeNode, newLabel?: string) => void;
  onDuplicate?: (node: TreeNode) => void;
  onDelete?: (node: TreeNode) => void;
  onMoveUp?: (node: TreeNode) => void;
  onMoveDown?: (node: TreeNode) => void;
  onToggleVisibility?: (node: TreeNode) => void;
  onOpenSettings?: (node: TreeNode) => void;
  onMoveToRoot?: (node: TreeNode) => void;
  onToggleExpand?: (node: TreeNode) => void;
}

export const NodeActionMenu: React.FC<NodeActionMenuProps> = ({
  node,
  readOnly = false,
  isExpanded,
  onEdit,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onToggleVisibility,
  onOpenSettings,
  onMoveToRoot,
  onToggleExpand
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);

  // Log pour vérifier que le composant est monté et l'ID
  // console.log('🔄 [NodeActionMenu] Composant monté pour node:', node.label, 'ID:', node.id, 'readOnly:', readOnly);

  // Vérification que le nœud a un ID valide
  const hasValidId = node.id && node.id !== 'undefined';

  const handleEdit = () => {
    if (onEdit) {
      onEdit(node);
    }
  };

  const handleDuplicate = () => {
    if (onDuplicate) {
      onDuplicate(node);
    }
  };

  const handleDelete = () => {
    if (!hasValidId) {
      console.warn('Impossible de supprimer: nœud sans ID valide');
      return;
    }

    if (!onDelete) {
      console.warn('Erreur: fonction de suppression non disponible');
      return;
    }

    const confirmed = window.confirm(`Êtes-vous sûr de vouloir supprimer l'élément "${node.label}" ?`);
    if (!confirmed) return;

    try {
      onDelete(node);
      console.info('✅ Élément supprimé avec succès');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('❌ Erreur lors de la suppression:', errorMessage);
    }
  };

  const handleMoveUp = () => {
    if (!hasValidId) {
      console.warn('Impossible de déplacer: nœud sans ID valide');
      return;
    }
    if (onMoveUp) {
      onMoveUp(node); // Passer le nœud complet, pas juste l'ID
    }
  };

  const handleMoveDown = () => {
    if (!hasValidId) {
      console.warn('Impossible de déplacer: nœud sans ID valide');
      return;
    }
    if (onMoveDown) {
      onMoveDown(node); // Passer le nœud complet, pas juste l'ID
    }
  };

  const handleToggleVisibility = () => {
    if (!hasValidId) {
      console.warn('Impossible de modifier la visibilité: nœud sans ID valide');
      return;
    }
    if (onToggleVisibility) {
      onToggleVisibility(node); // Passer le nœud complet, pas juste l'ID
    }
  };

  const handleOpenSettings = () => {
    if (onOpenSettings) {
      onOpenSettings(node);
    }
  };

  const handleMenuClick = (menuInfo: { key: string }) => {
    const { key } = menuInfo;

    switch (key) {
      case 'edit':
        handleEdit();
        break;
      case 'duplicate':
        handleDuplicate();
        break;
      case 'delete':
        handleDelete();
        break;
      case 'moveUp':
        handleMoveUp();
        break;
      case 'moveDown':
        handleMoveDown();
        break;
      case 'toggleVisibility':
        handleToggleVisibility();
        break;
      case 'settings':
        handleOpenSettings();
        break;
      default:
        break;
    }
  };

  const menuItems = useMemo(() => ([
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Modifier',
      disabled: readOnly || !onEdit
    },
    {
      key: 'duplicate',
      icon: <CopyOutlined />,
      label: 'Dupliquer',
      disabled: readOnly || !onDuplicate
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Supprimer',
      disabled: readOnly || !onDelete || !hasValidId,
      danger: true
    },
    {
      type: 'divider' as const,
      key: 'divider-1'
    },
    {
      key: 'moveUp',
      icon: <ArrowUpOutlined />,
      label: 'Monter',
      disabled: readOnly || !onMoveUp || !hasValidId
    },
    {
      key: 'moveDown',
      icon: <ArrowDownOutlined />,
      label: 'Descendre',
      disabled: readOnly || !onMoveDown || !hasValidId
    },
    {
      key: 'toggleVisibility',
      icon: node.visible ? <EyeInvisibleOutlined /> : <EyeOutlined />,
      label: node.visible ? 'Masquer' : 'Afficher',
      disabled: readOnly || !onToggleVisibility || !hasValidId
    },
    {
      type: 'divider' as const,
      key: 'divider-2'
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Paramètres',
      disabled: readOnly || !onOpenSettings || !hasValidId
    }
  ]), [readOnly, onEdit, onDuplicate, onDelete, onMoveUp, onMoveDown, onToggleVisibility, onOpenSettings, hasValidId, node.visible]);

  useEffect(() => {
    // console.log('🛰️ [NodeActionMenu] render', {
    //   nodeId: node.id,
    //   label: node.label,
    //   isMenuOpen,
    //   readOnly,
    //   hasValidId
    // });
  });

  useEffect(() => {
    // console.log('🛰️ [NodeActionMenu] state change -> isMenuOpen:', isMenuOpen, 'for', node.id);
  }, [isMenuOpen, node.id]);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) {
        // console.log('🛰️ [NodeActionMenu] pointerdown inside menu');
        return;
      }
      if (triggerRef.current?.contains(target)) {
        // console.log('🛰️ [NodeActionMenu] pointerdown on trigger');
        return;
      }
      // console.log('🛰️ [NodeActionMenu] pointerdown outside -> closing menu');
      setIsMenuOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown, { capture: true });
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, { capture: true } as EventListenerOptions);
    };
  }, [isMenuOpen]);

  const handleTriggerClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    // console.log('🛰️ [NodeActionMenu] trigger click detected, toggling menu');
    setIsMenuOpen((open) => !open);
  }, []);

  const handleTriggerPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    // console.log('🛰️ [NodeActionMenu] trigger pointerdown (suppression propagation)');
  }, []);

  const handleMenuItemClick = (key: string) => {
    // console.log('🛰️ [NodeActionMenu] menu item click', key, 'for', node.id);
    setIsMenuOpen(false);
    handleMenuClick({ key });
  };

  return (
    <>
      <div
        ref={triggerRef}
        className="flex items-center justify-center w-6 h-6 hover:bg-gray-100 rounded cursor-pointer opacity-60 hover:opacity-100"
        style={{ zIndex: 1000, position: 'relative' }}
        onClick={handleTriggerClick}
        onMouseDown={handleTriggerPointerDown}
        onPointerDown={handleTriggerPointerDown}
        onDragStart={(event) => {
          // console.log('🔄 [NodeActionMenu] DragStart bloqué');
          event.preventDefault();
          event.stopPropagation();
        }}
        draggable={false}
      >
        <MoreOutlined className="text-xs text-gray-500" />
        {isMenuOpen && (
          <div
            ref={menuRef}
            style={{
              position: 'absolute',
              top: '110%',
              right: 0,
              background: '#fff',
              border: '1px solid #d9d9d9',
              borderRadius: 6,
              boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
              padding: '4px 0',
              minWidth: 160,
              zIndex: 2000
            }}
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            {menuItems.map((item) => {
              if ('type' in item && item.type === 'divider') {
                return (
                  <div
                    key={item.key}
                    style={{
                      height: 1,
                      margin: '4px 0',
                      backgroundColor: '#f0f0f0'
                    }}
                  />
                );
              }

              const { key, icon, label, disabled, danger } = item;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleMenuItemClick(key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    padding: '6px 12px',
                    gap: 8,
                    background: 'transparent',
                    border: 'none',
                    color: danger ? '#ff4d4f' : disabled ? '#aaa' : '#333',
                    fontSize: 12,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    textAlign: 'left'
                  }}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 12 }}>
                    {icon}
                  </span>
                  <span style={{ flex: 1 }}>{label}</span>
                  {key === 'toggleVisibility' && (
                    <span style={{ fontSize: 10, color: '#999' }}>
                      {node.visible ? 'Visible' : 'Masqué'}
                    </span>
                  )}
                  {key === 'edit' && isExpanded !== undefined && (
                    <span style={{ fontSize: 10, color: '#bbb' }}>
                      {isExpanded ? '▼' : '▶'}
                    </span>
                  )}
                </button>
              );
            })}

            {onMoveToRoot && !readOnly && (
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onMoveToRoot(node);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  padding: '6px 12px',
                  gap: 8,
                  background: 'transparent',
                  border: 'none',
                  color: '#333',
                  fontSize: 12,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
              >
                <span style={{ fontSize: 12 }}>⤴️</span>
                <span>Envoyer à la racine</span>
              </button>
            )}

            {onToggleExpand && hasValidId && (
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onToggleExpand(node);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  padding: '6px 12px',
                  gap: 8,
                  background: 'transparent',
                  border: 'none',
                  color: '#333',
                  fontSize: 12,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
              >
                <span style={{ fontSize: 12 }}>{isExpanded ? '➖' : '➕'}</span>
                <span>{isExpanded ? 'Réduire' : 'Développer'}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
};
