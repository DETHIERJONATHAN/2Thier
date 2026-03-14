import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Spin, Tag, Alert } from 'antd';
import { 
  MoreOutlined, 
  EditOutlined, 
  CopyOutlined, 
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  SettingOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  LinkOutlined,
  FunctionOutlined,
  TableOutlined,
  BranchesOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../../../../hooks/useAuthenticatedApi';
import type { TreeNode } from '../../types';

interface DependencyInfo {
  dependentNodeId: string;
  dependentNodeLabel: string;
  dependentNodePath: string;
  dependencyType: string;
  referencedNodeIds: string[];
  referencedNodeLabels: string[];
  description: string;
}

interface CheckDependenciesResult {
  hasDependencies: boolean;
  nodeLabel: string;
  nodesToDeleteCount: number;
  externalDependencies: DependencyInfo[];
}

const depTypeConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  'link': { label: 'Lien', color: 'blue', icon: <LinkOutlined /> },
  'formula': { label: 'Formule', color: 'purple', icon: <FunctionOutlined /> },
  'formula-db': { label: 'Formule', color: 'purple', icon: <FunctionOutlined /> },
  'table-lookup': { label: 'Table', color: 'orange', icon: <TableOutlined /> },
  'condition': { label: 'Condition', color: 'cyan', icon: <BranchesOutlined /> },
  'trigger': { label: 'Trigger', color: 'geekblue', icon: <FunctionOutlined /> },
  'variable': { label: 'Variable', color: 'volcano', icon: <FunctionOutlined /> },
  'select-dependency': { label: 'Liste', color: 'green', icon: <BranchesOutlined /> },
};

interface NodeActionMenuProps {
  node: TreeNode;
  treeId?: string;
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
  treeId,
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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [depResult, setDepResult] = useState<CheckDependenciesResult | null>(null);
  const [depError, setDepError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const { api } = useAuthenticatedApi();

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

  const handleDelete = async () => {
    if (!hasValidId) {
      console.warn('Impossible de supprimer: nœud sans ID valide');
      return;
    }

    if (!onDelete) {
      console.warn('Erreur: fonction de suppression non disponible');
      return;
    }

    // Charger les dépendances depuis le backend
    setDeleteLoading(true);
    setDepResult(null);
    setDepError(null);
    setDeleteModalOpen(true);

    try {
      if (treeId && api) {
        const result = await api.get(`/api/treebranchleaf/trees/${treeId}/nodes/${node.id}/check-dependencies`);
        setDepResult(result);
      } else {
        // Fallback si pas de treeId/api — confirmation simple
        setDepResult({ hasDependencies: false, nodeLabel: node.label || '', nodesToDeleteCount: 1, externalDependencies: [] });
      }
    } catch (err) {
      console.error('Erreur vérification dépendances:', err);
      setDepError('Impossible de vérifier les dépendances. Vous pouvez quand même supprimer.');
      setDepResult({ hasDependencies: false, nodeLabel: node.label || '', nodesToDeleteCount: 1, externalDependencies: [] });
    } finally {
      setDeleteLoading(false);
    }
  };

  const confirmDelete = () => {
    setDeleteModalOpen(false);
    setDepResult(null);
    try {
      onDelete!(node);
      console.info('✅ Élément supprimé avec succès');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('❌ Erreur lors de la suppression:', errorMessage);
    }
  };

  const cancelDelete = () => {
    setDeleteModalOpen(false);
    setDepResult(null);
    setDepError(null);
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

      {/* Modal de confirmation de suppression avec vérification des dépendances */}
      <Modal
        open={deleteModalOpen}
        onCancel={cancelDelete}
        onOk={confirmDelete}
        okText={depResult?.hasDependencies ? '⚠️ Supprimer quand même' : 'Supprimer'}
        cancelText="Annuler"
        okButtonProps={{
          danger: true,
          disabled: deleteLoading,
        }}
        title={
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {depResult?.hasDependencies 
              ? <><WarningOutlined style={{ color: '#faad14', fontSize: 18 }} /> Attention — Dépendances détectées</>
              : <><ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: 18 }} /> Confirmer la suppression</>
            }
          </span>
        }
        width={depResult?.hasDependencies ? 640 : 420}
        destroyOnClose
      >
        {deleteLoading ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <Spin size="default" />
            <p style={{ marginTop: 12, color: '#666' }}>Vérification des dépendances...</p>
          </div>
        ) : (
          <>
            {depError && (
              <Alert message={depError} type="warning" showIcon style={{ marginBottom: 12 }} />
            )}

            {depResult && !depResult.hasDependencies && (
              <div>
                <p>Êtes-vous sûr de vouloir supprimer <strong>"{depResult.nodeLabel}"</strong> ?</p>
                {depResult.nodesToDeleteCount > 1 && (
                  <p style={{ color: '#666', fontSize: 13 }}>
                    Cela supprimera également {depResult.nodesToDeleteCount - 1} élément{depResult.nodesToDeleteCount - 1 > 1 ? 's' : ''} enfant{depResult.nodesToDeleteCount - 1 > 1 ? 's' : ''}.
                  </p>
                )}
                <p style={{ color: '#52c41a', fontSize: 13, marginTop: 8 }}>
                  ✅ Aucun autre champ ne dépend de cet élément.
                </p>
              </div>
            )}

            {depResult && depResult.hasDependencies && (
              <div>
                <Alert
                  type="warning"
                  showIcon
                  message={
                    <span>
                      <strong>{depResult.externalDependencies.length} champ{depResult.externalDependencies.length > 1 ? 's' : ''}</strong> en dehors 
                      de <strong>"{depResult.nodeLabel}"</strong> dépend{depResult.externalDependencies.length > 1 ? 'ent' : ''} d'éléments 
                      que vous allez supprimer.
                    </span>
                  }
                  description="Supprimer cet élément risque de casser les formules, prix et calculs de ces champs."
                  style={{ marginBottom: 16 }}
                />

                <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #f0f0f0', borderRadius: 6, padding: 0 }}>
                  {depResult.externalDependencies.map((dep, idx) => {
                    const typeConf = depTypeConfig[dep.dependencyType] || { label: dep.dependencyType, color: 'default', icon: null };
                    return (
                      <div
                        key={`${dep.dependentNodeId}-${idx}`}
                        style={{
                          padding: '10px 14px',
                          borderBottom: idx < depResult.externalDependencies.length - 1 ? '1px solid #f5f5f5' : 'none',
                          background: idx % 2 === 0 ? '#fafafa' : '#fff'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <Tag color={typeConf.color} style={{ margin: 0, fontSize: 11 }}>
                            {typeConf.icon} {typeConf.label}
                          </Tag>
                          <strong style={{ fontSize: 13 }}>{dep.dependentNodeLabel}</strong>
                        </div>
                        <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>
                          📍 {dep.dependentNodePath}
                        </div>
                        <div style={{ fontSize: 12, color: '#555' }}>
                          {dep.description}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {depResult.nodesToDeleteCount > 1 && (
                  <p style={{ color: '#666', fontSize: 12, marginTop: 12 }}>
                    ℹ️ {depResult.nodesToDeleteCount} éléments seront supprimés (nœud + descendants).
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </Modal>
    </>
  );
};
