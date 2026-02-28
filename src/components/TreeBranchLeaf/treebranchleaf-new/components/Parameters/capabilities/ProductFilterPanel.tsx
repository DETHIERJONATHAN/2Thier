import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, Typography, Space, Select, Button, Checkbox, Tag, Input, message, Alert, Divider, Popconfirm } from 'antd';
import { ShoppingOutlined, PlusOutlined, EyeOutlined, EyeInvisibleOutlined, HolderOutlined, EditOutlined } from '@ant-design/icons';
import { useAuthenticatedApi } from '../../../../../../hooks/useAuthenticatedApi';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const { Text } = Typography;

// ─── Composant Tag produit triable avec renommage + suppression confirmée ───
const SortableProductTag: React.FC<{
  id: string;
  option: { value: string; label: string };
  readOnly?: boolean;
  onRemove: (value: string) => void;
  onRename: (value: string, newLabel: string) => void;
}> = ({ id, option, readOnly, onRemove, onRename }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(option.label);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    display: 'inline-flex',
    alignItems: 'center',
    marginBottom: 4,
    marginRight: 4,
  };

  const startEditing = () => {
    if (readOnly) return;
    setEditValue(option.label);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const commitEdit = () => {
    const trimmed = editValue.trim();
    setIsEditing(false);
    if (trimmed && trimmed !== option.label) {
      onRename(option.value, trimmed);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditValue(option.label);
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Tag
        color="purple"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
          margin: 0,
          userSelect: 'none',
          cursor: 'default',
        }}
      >
        {!readOnly && (
          <span
            {...attributes}
            {...listeners}
            style={{ cursor: 'grab', display: 'flex', alignItems: 'center', marginRight: 2 }}
          >
            <HolderOutlined style={{ fontSize: 10 }} />
          </span>
        )}
        {isEditing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit();
              if (e.key === 'Escape') cancelEdit();
            }}
            style={{
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: 'inherit',
              fontSize: 'inherit',
              fontFamily: 'inherit',
              width: `${Math.max(editValue.length, 2) * 8 + 8}px`,
              padding: 0,
            }}
          />
        ) : (
          <span
            onDoubleClick={startEditing}
            style={{ cursor: readOnly ? 'default' : 'text' }}
            title={readOnly ? undefined : 'Double-cliquez pour renommer'}
          >
            {option.label}
          </span>
        )}
        {!readOnly && !isEditing && (
          <EditOutlined
            onClick={startEditing}
            onPointerDown={(e) => e.stopPropagation()}
            style={{ cursor: 'pointer', fontSize: 10, marginLeft: 2, opacity: 0.6 }}
          />
        )}
        {!readOnly && (
          <Popconfirm
            title="Supprimer cette option ?"
            description={`Supprimer « ${option.label} » des produits ?`}
            onConfirm={() => onRemove(option.value)}
            okText="Supprimer"
            cancelText="Annuler"
            okButtonProps={{ danger: true }}
          >
            <span
              onPointerDown={(e) => e.stopPropagation()}
              style={{ cursor: 'pointer', fontSize: 12, marginLeft: 2, fontWeight: 'bold', opacity: 0.6 }}
            >
              ×
            </span>
          </Popconfirm>
        )}
      </Tag>
    </div>
  );
};

interface ProductOption {
  value: string;
  label: string;
}

interface NodeData {
  id: string;
  label: string;
  type: string;
  parentId?: string | null;
  subType?: string;
  fieldType?: string;
  fieldSubType?: string;
  select_multiple?: boolean;
  select_options?: Array<{ label: string; value: string }>;
  product_options?: ProductOption[] | null;
  product_sourceNodeId?: string | null;
  product_visibleFor?: string[] | null;
  hasProduct?: boolean;
  treeId?: string;
  metadata?: Record<string, unknown>;
}

interface ProductFilterPanelProps {
  treeId?: string;
  nodeId: string;
  onNodeUpdate?: (node: { id: string } & Record<string, unknown>) => Promise<unknown> | void;
  readOnly?: boolean;
}

const ProductFilterPanel: React.FC<ProductFilterPanelProps> = ({ treeId, nodeId, onNodeUpdate, readOnly }) => {
  const { api } = useAuthenticatedApi();

  const [loading, setLoading] = useState(false);
  const [sourceNodeId, setSourceNodeId] = useState<string | null>(null);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [visibleFor, setVisibleFor] = useState<string[] | null>(null);
  const [newOptionLabel, setNewOptionLabel] = useState('');
  const [allNodes, setAllNodes] = useState<NodeData[]>([]);
  // Pour la visibilité des sous-onglets (nœuds GROUP uniquement)
  const [subTabs, setSubTabs] = useState<string[]>([]);
  const [subTabsVisibility, setSubTabsVisibility] = useState<Record<string, string[] | null>>({});
  const [nodeType, setNodeType] = useState<string>('');

  // Nœuds SELECT/MULTISELECT disponibles comme champ source
  const multiselectNodes = useMemo(() => {
    return allNodes.filter(n => {
      const sub = (n.subType || n.fieldSubType || '').toLowerCase();
      const ft = (n.fieldType || '').toLowerCase();
      const t = (n.type || '').toLowerCase();
      if (sub === 'multiselect' || ft === 'multiselect') return true;
      if ((t === 'leaf_field' || t === 'leaf_option_field') && (sub === 'select' || ft === 'select')) return true;
      if (t === 'branch' && allNodes.some(child => child.type === 'leaf_option' && child.parentId === n.id)) return true;
      if (n.select_options && Array.isArray(n.select_options) && n.select_options.length > 0) return true;
      return false;
    });
  }, [allNodes]);

  const isCurrentNodeSource = sourceNodeId === nodeId;
  const isGroupNode = nodeType.toLowerCase() === 'group' || nodeType.toLowerCase() === 'branch';

  // ─── Chargement initial + auto-détection ───
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);

        const node = await api.get(`/api/treebranchleaf/nodes/${nodeId}`) as NodeData;
        if (!mounted) return;

        setNodeType(node?.type || '');

        const effectiveTreeId = treeId || node?.treeId;

        // Charger sous-onglets si GROUP
        const meta = node?.metadata as Record<string, unknown> | undefined;
        let loadedSubTabs: string[] = [];
        if (meta?.subTabs && Array.isArray(meta.subTabs)) {
          loadedSubTabs = meta.subTabs as string[];
        }
        if (meta?.product_subTabsVisibility && typeof meta.product_subTabsVisibility === 'object') {
          setSubTabsVisibility(meta.product_subTabsVisibility as Record<string, string[] | null>);
        }

        let nodes: NodeData[] = [];
        if (effectiveTreeId) {
          nodes = (await api.get(`/api/treebranchleaf/trees/${effectiveTreeId}/nodes`) as NodeData[]) || [];
          if (!mounted) return;
          setAllNodes(nodes);

          // 📑 Fallback: si pas de subTabs depuis le nœud direct, chercher dans les nœuds de l'arbre
          if (loadedSubTabs.length === 0) {
            const treeNode = nodes.find(n => n.id === nodeId);
            const treeMeta = treeNode?.metadata as Record<string, unknown> | undefined;
            if (treeMeta?.subTabs && Array.isArray(treeMeta.subTabs)) {
              loadedSubTabs = treeMeta.subTabs as string[];
            }
          }
          // 📑 Fallback 2: dériver les sous-onglets depuis les enfants qui ont metadata.subTab
          if (loadedSubTabs.length === 0) {
            const childrenOfNode = nodes.filter(n => n.parentId === nodeId);
            const derivedTabs = new Set<string>();
            childrenOfNode.forEach(child => {
              const childMeta = child.metadata as Record<string, unknown> | undefined;
              if (childMeta?.subTab && typeof childMeta.subTab === 'string') {
                derivedTabs.add(childMeta.subTab);
              }
            });
            if (derivedTabs.size > 0) {
              loadedSubTabs = Array.from(derivedTabs);
            }
          }
        }
        setSubTabs(loadedSubTabs);

        let resolvedSourceId: string | null = node?.product_sourceNodeId || null;
        let resolvedOptions: ProductOption[] = [];

        if (resolvedSourceId) {
          if (resolvedSourceId === nodeId) {
            resolvedOptions = node?.product_options || [];
          } else {
            try {
              const sourceNode = await api.get(`/api/treebranchleaf/nodes/${resolvedSourceId}`) as NodeData;
              if (!mounted) return;
              resolvedOptions = sourceNode?.product_options || [];
            } catch {
              resolvedOptions = [];
            }
          }
        } else {
          // Auto-détecter le source dans l'arbre
          const existingSource = nodes.find(n =>
            n.hasProduct &&
            n.product_sourceNodeId === n.id &&
            n.product_options &&
            Array.isArray(n.product_options) &&
            n.product_options.length > 0
          );

          if (existingSource && existingSource.id !== nodeId) {
            resolvedSourceId = existingSource.id;
            resolvedOptions = existingSource.product_options || [];
            // Auto-sauvegarder la liaison
            try {
              if (onNodeUpdate) {
                await onNodeUpdate({
                  id: nodeId,
                  hasProduct: true,
                  product_sourceNodeId: existingSource.id,
                });
              } else if (effectiveTreeId) {
                await api.put(
                  `/api/treebranchleaf/trees/${effectiveTreeId}/nodes/${nodeId}`,
                  { hasProduct: true, product_sourceNodeId: existingSource.id }
                );
              }
            } catch (err) {
              console.error('[ProductFilterPanel] Erreur auto-liaison:', err);
            }
          }
        }

        // ✅ SYNC SELECT_OPTIONS : Si c'est le source et que select_options est vide mais product_options existe
        if (resolvedSourceId === nodeId && resolvedOptions.length > 0) {
          const currentSelectOpts = node?.select_options;
          const needsSync = !currentSelectOpts || !Array.isArray(currentSelectOpts) || currentSelectOpts.length === 0;
          if (needsSync) {
            console.log('[ProductFilterPanel] Sync select_options depuis product_options:', resolvedOptions);
            try {
              if (onNodeUpdate) {
                await onNodeUpdate({
                  id: nodeId,
                  select_options: resolvedOptions,
                  select_multiple: true,
                  subType: 'multiselect', // 🛒 Forcer le type multiselect
                });
              } else if (effectiveTreeId) {
                await api.put(
                  `/api/treebranchleaf/trees/${effectiveTreeId}/nodes/${nodeId}`,
                  { select_options: resolvedOptions, select_multiple: true, subType: 'multiselect' }
                );
              }
            } catch (err) {
              console.error('[ProductFilterPanel] Erreur sync select_options:', err);
            }
          }
        }

        if (mounted) {
          setSourceNodeId(resolvedSourceId);
          setProductOptions(resolvedOptions);
          setVisibleFor(node?.product_visibleFor ?? null);
        }
      } catch (err) {
        console.error('[ProductFilterPanel] Erreur chargement:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId, treeId]);

  // ─── Sauvegarder la config du nœud courant ───
  const saveNodeConfig = useCallback(async (data: Record<string, unknown>) => {
    try {
      if (onNodeUpdate) {
        await onNodeUpdate({ id: nodeId, ...data });
      } else {
        const currentNode = allNodes.find(n => n.id === nodeId);
        const resolvedTreeId = treeId || currentNode?.treeId;
        if (resolvedTreeId) {
          await api.put(`/api/treebranchleaf/trees/${resolvedTreeId}/nodes/${nodeId}`, data);
        } else {
          await api.put(`/api/treebranchleaf/nodes/${nodeId}`, data);
        }
      }
    } catch (err) {
      console.error('[ProductFilterPanel] Erreur sauvegarde:', err);
      message.error('Erreur lors de la sauvegarde');
    }
  }, [api, nodeId, treeId, allNodes, onNodeUpdate]);

  // ─── Sauvegarder le nœud source (même si différent du nœud courant) ───
  const saveSourceNode = useCallback(async (data: Record<string, unknown>) => {
    if (!sourceNodeId) return;
    try {
      if (onNodeUpdate) {
        await onNodeUpdate({ id: sourceNodeId, ...data });
      } else {
        const srcNode = allNodes.find(n => n.id === sourceNodeId);
        const resolvedTreeId = treeId || srcNode?.treeId;
        if (resolvedTreeId) {
          await api.put(`/api/treebranchleaf/trees/${resolvedTreeId}/nodes/${sourceNodeId}`, data);
        }
      }
    } catch (err) {
      console.error('[ProductFilterPanel] Erreur sauvegarde source:', err);
    }
  }, [api, sourceNodeId, treeId, allNodes, onNodeUpdate]);

  // ─── Sélectionner le champ source (première configuration) ───
  const handleSourceChange = useCallback(async (newSourceId: string) => {
    setSourceNodeId(newSourceId);

    let loadedOptions: ProductOption[] = [];
    try {
      const sourceNode = await api.get(`/api/treebranchleaf/nodes/${newSourceId}`) as NodeData;
      if (sourceNode?.product_options && sourceNode.product_options.length > 0) {
        loadedOptions = sourceNode.product_options;
      } else if (sourceNode?.select_options && sourceNode.select_options.length > 0) {
        loadedOptions = sourceNode.select_options.map(o => ({ value: o.value, label: o.label }));
      }
    } catch {
      // ignore
    }
    setProductOptions(loadedOptions);

    // Sauvegarder sur le nœud courant
    await saveNodeConfig({
      hasProduct: true,
      product_sourceNodeId: newSourceId,
    });

    // Si on se désigne soi-même comme source → rendre multiselect + sync options + forcer le type
    if (newSourceId === nodeId) {
      const syncData: Record<string, unknown> = {
        select_multiple: true,
        subType: 'multiselect', // 🛒 Forcer le type pour que le renderer affiche un Select
      };
      if (loadedOptions.length > 0) {
        syncData.product_options = loadedOptions;
        syncData.select_options = loadedOptions;
      }
      if (onNodeUpdate) {
        await onNodeUpdate({ id: nodeId, ...syncData });
      }
    }
  }, [api, saveNodeConfig, nodeId, onNodeUpdate]);

  // ─── Ajouter une option ───
  const handleAddOption = useCallback(async () => {
    if (!newOptionLabel.trim()) return;

    const value = newOptionLabel.trim().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');

    const newOption: ProductOption = { value, label: newOptionLabel.trim() };
    const updatedOptions = [...productOptions, newOption];
    setProductOptions(updatedOptions);
    setNewOptionLabel('');

    // Sync product_options + select_options + select_multiple sur le source
    const syncData = {
      product_options: updatedOptions,
      select_options: updatedOptions,
      select_multiple: true,
    };

    if (isCurrentNodeSource) {
      await saveNodeConfig(syncData);
    } else {
      await saveSourceNode(syncData);
    }

    message.success(`Option "${newOptionLabel.trim()}" ajoutée`);
  }, [newOptionLabel, productOptions, isCurrentNodeSource, saveNodeConfig, saveSourceNode]);

  // ─── Supprimer une option ───
  const handleRemoveOption = useCallback(async (optionValue: string) => {
    const updatedOptions = productOptions.filter(o => o.value !== optionValue);
    setProductOptions(updatedOptions);

    const syncData = {
      product_options: updatedOptions,
      select_options: updatedOptions,
    };

    if (isCurrentNodeSource) {
      await saveNodeConfig(syncData);
    } else {
      await saveSourceNode(syncData);
    }

    if (visibleFor) {
      const updatedVisibleFor = visibleFor.filter(v => v !== optionValue);
      setVisibleFor(updatedVisibleFor);
      await saveNodeConfig({ product_visibleFor: updatedVisibleFor });
    }

    message.info('Option supprimée');
  }, [productOptions, isCurrentNodeSource, saveNodeConfig, saveSourceNode, visibleFor]);

  // ─── Renommer une option ───
  const handleRenameOption = useCallback(async (optionValue: string, newLabel: string) => {
    if (productOptions.some(o => o.value !== optionValue && o.label === newLabel)) {
      message.warning(`Une option « ${newLabel} » existe déjà.`);
      return;
    }
    const updatedOptions = productOptions.map(o =>
      o.value === optionValue ? { ...o, label: newLabel } : o
    );
    setProductOptions(updatedOptions);

    const syncData = {
      product_options: updatedOptions,
      select_options: updatedOptions,
    };

    if (isCurrentNodeSource) {
      await saveNodeConfig(syncData);
    } else {
      await saveSourceNode(syncData);
    }
    message.success(`Option renommée en « ${newLabel} »`);
  }, [productOptions, isCurrentNodeSource, saveNodeConfig, saveSourceNode]);

  // ─── Réordonner les options (drag & drop) ───
  const handleReorderOptions = useCallback(async (newOptions: ProductOption[]) => {
    setProductOptions(newOptions);

    const syncData = {
      product_options: newOptions,
      select_options: newOptions,
    };

    if (isCurrentNodeSource) {
      await saveNodeConfig(syncData);
    } else {
      await saveSourceNode(syncData);
    }
  }, [isCurrentNodeSource, saveNodeConfig, saveSourceNode]);

  // DnD sensors
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleOptionDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = productOptions.findIndex(o => o.value === active.id);
    const newIndex = productOptions.findIndex(o => o.value === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(productOptions, oldIndex, newIndex);
    handleReorderOptions(reordered);
  }, [productOptions, handleReorderOptions]);

  // ─── Toggle visibilité champ pour une option ───
  const handleToggleVisibility = useCallback(async (optionValue: string, checked: boolean) => {
    let newVisibleFor: string[] | null;

    if (visibleFor === null) {
      if (checked) return;
      newVisibleFor = productOptions.map(o => o.value).filter(v => v !== optionValue);
    } else {
      if (checked) {
        newVisibleFor = [...visibleFor, optionValue];
        if (newVisibleFor.length >= productOptions.length) {
          newVisibleFor = null;
        }
      } else {
        newVisibleFor = visibleFor.filter(v => v !== optionValue);
      }
    }

    setVisibleFor(newVisibleFor);
    await saveNodeConfig({ product_visibleFor: newVisibleFor });
  }, [visibleFor, productOptions, saveNodeConfig]);

  // ─── Toggle "Toujours visible" champ ───
  const handleToggleAlwaysVisible = useCallback(async () => {
    if (visibleFor === null) {
      setVisibleFor([]);
      await saveNodeConfig({ product_visibleFor: [] });
    } else {
      setVisibleFor(null);
      await saveNodeConfig({ product_visibleFor: null });
    }
  }, [visibleFor, saveNodeConfig]);

  const isOptionVisible = useCallback((optionValue: string) => {
    if (visibleFor === null) return true;
    return visibleFor.includes(optionValue);
  }, [visibleFor]);

  // ═══ SOUS-ONGLETS : Toggle visibilité d'un sous-onglet pour un produit ═══
  const handleSubTabToggle = useCallback(async (subTabName: string, optionValue: string, checked: boolean) => {
    const current = subTabsVisibility[subTabName];
    let newVis: string[] | null;

    if (current === null || current === undefined) {
      if (checked) return; // déjà tout visible
      newVis = productOptions.map(o => o.value).filter(v => v !== optionValue);
    } else {
      if (checked) {
        newVis = [...current, optionValue];
        if (newVis.length >= productOptions.length) newVis = null;
      } else {
        newVis = current.filter(v => v !== optionValue);
      }
    }

    const updated = { ...subTabsVisibility, [subTabName]: newVis };
    setSubTabsVisibility(updated);
    await saveNodeConfig({
      metadata: { product_subTabsVisibility: updated },
    });
  }, [subTabsVisibility, productOptions, saveNodeConfig]);

  // Toggle toujours visible sous-onglet
  const handleSubTabAlwaysVisible = useCallback(async (subTabName: string) => {
    const current = subTabsVisibility[subTabName];
    const wasAlwaysVisible = current === null || current === undefined;
    const updated = {
      ...subTabsVisibility,
      [subTabName]: wasAlwaysVisible ? [] as string[] : null,
    };
    setSubTabsVisibility(updated);
    await saveNodeConfig({
      metadata: { product_subTabsVisibility: updated },
    });
  }, [subTabsVisibility, saveNodeConfig]);

  // ─────────────────
  // RENDER
  // ─────────────────

  if (loading) {
    return <div style={{ padding: 12, textAlign: 'center', color: '#999' }}>Chargement...</div>;
  }

  const cardTitle = (
    <Space>
      <ShoppingOutlined style={{ color: '#722ed1' }} />
      <Text strong style={{ fontSize: 13 }}>Produit</Text>
    </Space>
  );

  // ═══ Bloc sous-onglets : affiché sur les GROUP qui ont des subTabs ═══
  const renderSubTabsVisibility = () => {
    if (!isGroupNode || subTabs.length === 0 || productOptions.length === 0) return null;

    return (
      <>
        <Divider style={{ margin: '8px 0' }} />
        <div style={{ marginBottom: 8 }}>
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
            📑 Visibilité des sous-onglets par produit :
          </Text>
        </div>

        {subTabs.map(tab => {
          const vis = subTabsVisibility[tab];
          const isAlways = vis === null || vis === undefined;

          return (
            <div key={tab} style={{
              marginBottom: 6,
              padding: '6px 8px',
              background: isAlways ? '#fafafa' : '#f6f0ff',
              borderRadius: 4,
              border: `1px solid ${isAlways ? '#f0f0f0' : '#d3adf7'}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <Text strong style={{ fontSize: 11 }}>📑 {tab}</Text>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Checkbox
                  checked={isAlways}
                  onChange={() => handleSubTabAlwaysVisible(tab)}
                  disabled={readOnly}
                >
                  <Text style={{ fontSize: 10, color: isAlways ? '#52c41a' : '#999' }}>
                    <EyeOutlined /> Tous
                  </Text>
                </Checkbox>
                {!isAlways && productOptions.map(opt => (
                  <Checkbox
                    key={opt.value}
                    checked={(vis || []).includes(opt.value)}
                    onChange={e => handleSubTabToggle(tab, opt.value, e.target.checked)}
                    disabled={readOnly}
                  >
                    <Text style={{ fontSize: 10 }}>{opt.label}</Text>
                  </Checkbox>
                ))}
              </div>
              {!isAlways && (vis || []).length === 0 && (
                <Text type="danger" style={{ fontSize: 9 }}>⚠ Jamais visible</Text>
              )}
            </div>
          );
        })}
      </>
    );
  };

  // ═══ CAS 1 : Le nœud courant EST le source → gestion des options ═══
  if (isCurrentNodeSource) {
    return (
      <Card size="small" title={cardTitle} style={{ marginTop: 8 }}>
        <Alert
          type="success"
          showIcon
          icon={<ShoppingOutlined />}
          message="Ce champ est le sélecteur de produit"
          description="Les options ci-dessous sont les valeurs du multiselect. Ouvrez la capacité Produit sur chaque autre champ/onglet pour configurer sa visibilité."
          style={{ fontSize: 11, marginBottom: 12 }}
        />

        <div style={{ marginBottom: 8 }}>
          <Text type="secondary" style={{ fontSize: 11 }}>Options du produit :</Text>
        </div>

        <div style={{ marginBottom: 8 }}>
          <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleOptionDragEnd}>
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
              <SortableContext items={productOptions.map(o => o.value)} strategy={horizontalListSortingStrategy}>
                {productOptions.map(opt => (
                  <SortableProductTag
                    key={opt.value}
                    id={opt.value}
                    option={opt}
                    readOnly={readOnly}
                    onRemove={handleRemoveOption}
                    onRename={handleRenameOption}
                  />
                ))}
              </SortableContext>
            </div>
          </DndContext>
          {productOptions.length === 0 && (
            <Text type="secondary" style={{ fontSize: 11 }}>Aucune option. Ajoutez-en ci-dessous.</Text>
          )}
        </div>

        {!readOnly && (
          <Space.Compact style={{ width: '100%' }}>
            <Input
              size="small"
              placeholder="Nouvelle option..."
              value={newOptionLabel}
              onChange={e => setNewOptionLabel(e.target.value)}
              onPressEnter={handleAddOption}
            />
            <Button
              size="small"
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddOption}
              disabled={!newOptionLabel.trim()}
            />
          </Space.Compact>
        )}

        {/* Sous-onglets si le source est aussi un GROUP */}
        {renderSubTabsVisibility()}
      </Card>
    );
  }

  // ═══ CAS 2 : Pas de source dans l'arbre → sélecteur ═══
  if (!sourceNodeId) {
    return (
      <Card size="small" title={cardTitle} style={{ marginTop: 8 }}>
        <Alert
          type="info"
          showIcon
          message="Aucun champ produit configuré"
          description="Sélectionnez le champ qui servira de sélecteur de produit (multiselect)."
          style={{ fontSize: 11, marginBottom: 12 }}
        />
        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
          Champ source (Select / Multi-Select) :
        </Text>
        <Select
          placeholder="Sélectionner le champ produit..."
          onChange={handleSourceChange}
          disabled={readOnly}
          style={{ width: '100%' }}
          size="small"
          showSearch
          optionFilterProp="children"
        >
          {multiselectNodes.map(n => {
            const sub = (n.subType || n.fieldSubType || '').toLowerCase();
            const isMulti = sub === 'multiselect' || n.select_multiple;
            return (
              <Select.Option key={n.id} value={n.id}>
                {isMulti ? '📋' : '📄'} {n.label} {isMulti ? '(multi)' : '(select)'}
              </Select.Option>
            );
          })}
        </Select>
      </Card>
    );
  }

  // ═══ CAS 3 : Nœud NON-source avec source détecté → checkboxes visibilité ═══
  return (
    <Card size="small" title={cardTitle} style={{ marginTop: 8 }}>
      {productOptions.length === 0 ? (
        <Alert
          type="warning"
          showIcon
          message="Aucune option de produit"
          description="Allez sur le champ source pour ajouter des options de produit."
          style={{ fontSize: 11 }}
        />
      ) : (
        <>
          <div style={{ marginBottom: 8 }}>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
              Visible quand sélectionné :
            </Text>
          </div>

          {/* Checkbox "Toujours visible" */}
          <div style={{ marginBottom: 8 }}>
            <Checkbox
              checked={visibleFor === null}
              onChange={handleToggleAlwaysVisible}
              disabled={readOnly}
            >
              <Space size={4}>
                <EyeOutlined style={{ color: visibleFor === null ? '#52c41a' : '#999' }} />
                <Text style={{ fontSize: 12 }}>Toujours visible (tous produits)</Text>
              </Space>
            </Checkbox>
          </div>

          {/* Checkboxes par option */}
          {visibleFor !== null && (
            <div style={{ paddingLeft: 8 }}>
              {productOptions.map(opt => (
                <div key={opt.value} style={{ marginBottom: 4 }}>
                  <Checkbox
                    checked={isOptionVisible(opt.value)}
                    onChange={e => handleToggleVisibility(opt.value, e.target.checked)}
                    disabled={readOnly}
                  >
                    <Space size={4}>
                      {isOptionVisible(opt.value)
                        ? <EyeOutlined style={{ color: '#52c41a', fontSize: 12 }} />
                        : <EyeInvisibleOutlined style={{ color: '#ff4d4f', fontSize: 12 }} />
                      }
                      <Text style={{ fontSize: 12 }}>{opt.label}</Text>
                    </Space>
                  </Checkbox>
                </div>
              ))}

              {visibleFor.length === 0 && (
                <Alert
                  type="warning"
                  showIcon
                  message="Ce champ ne sera jamais visible"
                  description="Cochez au moins un produit ou activez 'Toujours visible'"
                  style={{ fontSize: 11, marginTop: 4 }}
                />
              )}
            </div>
          )}

          {/* Sous-onglets pour les GROUP */}
          {renderSubTabsVisibility()}
        </>
      )}
    </Card>
  );
};

export default ProductFilterPanel;
