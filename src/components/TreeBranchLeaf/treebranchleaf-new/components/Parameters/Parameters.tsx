/**
 * 🔧 Parameters - Panneau de paramètres TreeBranchLeaf
 * 
 * Composant de la colonne droite qui affiche et permet d'éditer
 * les paramètres du nœud sélectionné dans la structure
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, /* Typography, */ Empty, Space, Input, Select, Tooltip, Button, Alert, Popconfirm, Tag, Checkbox, Modal } from 'antd';
import type { InputRef } from 'antd';
import { EditOutlined, ExclamationCircleOutlined, PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import {
  SettingOutlined, 
  AppstoreOutlined, 
  BgColorsOutlined,
  DatabaseOutlined,
  FunctionOutlined,
  FilterOutlined,
  TableOutlined,
  CameraOutlined,
  ApiOutlined,
  LinkOutlined,
  TagsOutlined,
  DeleteOutlined,
  HolderOutlined,
  NodeIndexOutlined,
  ShoppingOutlined
} from '@ant-design/icons';
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
  verticalListSortingStrategy 
} from '@dnd-kit/sortable';
import { 
  useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback';
import { useAuthenticatedApi } from '../../../../../hooks/useAuthenticatedApi';
import { CapabilityPanels, FieldAppearancePanels, TreeBranchLeafRegistry } from '../../core/registry';
import { normalizeSubTabValues } from '../../utils/subTabNormalization';
import SharedReferencePanel from './capabilities/SharedReferencePanel';
import NodeTreeSelector, { NodeTreeSelectorValue } from './shared/NodeTreeSelector';
import type { 
  TreeBranchLeafTree, 
  TreeBranchLeafNode, 
  UIState,
  TreeBranchLeafRegistry as TreeBranchLeafRegistryType,
  NodeTypeKey
} from '../../types';

const EMPTY_SUBTAB_LIST: string[] = [];

const arraysAreEqual = (a: string[], b: string[]): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

const normalizeSubTabValue = (value: unknown): string[] => {
  const normalized = normalizeSubTabValues(value);
  return normalized.length > 0 ? normalized : EMPTY_SUBTAB_LIST;
};

// Composant pour un sous-onglet triable (avec renommage double-clic + confirmation suppression)
const SortableSubTabTag: React.FC<{ 
  id: string; 
  label: string; 
  onRemove: (label: string) => void;
  onRename: (oldLabel: string, newLabel: string) => void;
}> = ({ id, label, onRemove, onRename }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const startEditing = () => {
    setEditValue(label);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const commitEdit = () => {
    const trimmed = editValue.trim();
    setIsEditing(false);
    if (trimmed && trimmed !== label) {
      onRename(label, trimmed);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditValue(label);
  };

  return (
    <div 
      ref={setNodeRef} 
      style={{
        ...style,
        display: 'inline-flex'
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '0 8px',
          backgroundColor: '#fafafa',
          border: '1px solid #d9d9d9',
          borderRadius: '4px',
          userSelect: 'none',
          fontSize: '12px'
        }}
      >
        <span
          {...attributes}
          {...listeners}
          style={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'grab',
            padding: '2px 0'
          }}
        >
          <HolderOutlined style={{ fontSize: 10, color: '#999' }} />
        </span>
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
              fontSize: '12px',
              width: `${Math.max(editValue.length, 3) * 8 + 8}px`,
              padding: '2px 0',
            }}
          />
        ) : (
          <span
            onDoubleClick={startEditing}
            style={{ cursor: 'text' }}
            title="Double-cliquez pour renommer"
          >
            {label}
          </span>
        )}
        <EditOutlined
          onClick={startEditing}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            cursor: 'pointer',
            fontSize: '10px',
            color: '#bbb',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#1677ff'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#bbb'; }}
        />
        <Popconfirm
          title="Supprimer le sous-onglet ?"
          description={`Supprimer « ${label} » ? Les champs affectés ne seront plus visibles dans cet onglet.`}
          onConfirm={() => {
            console.log('🗑️ [SortableSubTabTag] Suppression confirmée:', label);
            onRemove(label);
          }}
          okText="Supprimer"
          cancelText="Annuler"
          okButtonProps={{ danger: true }}
        >
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              cursor: 'pointer',
              marginLeft: '2px',
              fontSize: '12px',
              color: '#999',
              fontWeight: 'bold',
              padding: '0 2px',
              borderRadius: '2px',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '16px',
              height: '16px',
              border: 'none',
              backgroundColor: 'transparent',
              margin: 0,
              lineHeight: '1',
              pointerEvents: 'auto'
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#ff7875';
              (e.currentTarget as HTMLButtonElement).style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
              (e.currentTarget as HTMLButtonElement).style.color = '#999';
            }}
          >
            ×
          </button>
        </Popconfirm>
      </div>
    </div>
  );
};

// Editor pour un tableau de sous-onglets avec glisser-déposer
const SubTabsEditor: React.FC<{ value?: string[]; onChange: (next: string[]) => void }> = ({ value, onChange }) => {
  const [input, setInput] = useState('');
  const externalValue = Array.isArray(value) ? value : EMPTY_SUBTAB_LIST;
  // État local pour affichage immédiat pendant le débogage (avant que le serveur ne réponde)
  const [localValue, setLocalValue] = useState<string[]>(externalValue);

  // Synchroniser l'état local avec les props reçues du parent
  useEffect(() => {
    const next = Array.isArray(value) ? value : EMPTY_SUBTAB_LIST;
    setLocalValue((prev) => (arraysAreEqual(prev, next) ? prev : next));
  }, [value]);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const add = () => {
    const trimmed = (input || '').trim();
    console.log('🔹 [SubTabsEditor] Tentative d\'ajout:', { input, trimmed, currentValue: localValue });
    if (!trimmed) {
      console.warn('🔹 [SubTabsEditor] Input vide, abandon');
      return;
    }
    if (localValue.includes(trimmed)) {
      console.warn('🔹 [SubTabsEditor] Valeur déjà présente:', trimmed);
      setInput('');
      return;
    }
    console.log('🔹 [SubTabsEditor] Ajout du sous-onglet:', trimmed);
    const newValue = [...localValue, trimmed];
    setLocalValue(newValue);
    onChange(newValue);
    setInput('');
  };

  const remove = (label: string) => {
    console.log('🗑️ [SubTabsEditor] Suppression du sous-onglet:', label, 'avant:', localValue);
    const newValue = localValue.filter(v => v !== label);
    console.log('🗑️ [SubTabsEditor] Suppression - après:', newValue);
    setLocalValue(newValue);
    onChange(newValue);
  };

  const rename = (oldLabel: string, newLabel: string) => {
    if (localValue.includes(newLabel)) {
      Modal.warning({ title: 'Nom déjà utilisé', content: `Un sous-onglet « ${newLabel} » existe déjà.` });
      return;
    }
    console.log('✏️ [SubTabsEditor] Renommage:', oldLabel, '→', newLabel);
    const newValue = localValue.map(v => v === oldLabel ? newLabel : v);
    setLocalValue(newValue);
    onChange(newValue);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = localValue.indexOf(active.id as string);
      const newIndex = localValue.indexOf(over?.id as string);

      const newOrder = arrayMove(localValue, oldIndex, newIndex);
      setLocalValue(newOrder);
      onChange(newOrder);
    }
  };

  return (
    <div>
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <SortableContext items={localValue} strategy={verticalListSortingStrategy}>
            {localValue.map((label) => (
              <SortableSubTabTag
                key={label}
                id={label}
                label={label}
                onRemove={remove}
                onRename={rename}
              />
            ))}
          </SortableContext>
        </div>
      </DndContext>
      
      <div style={{ display: 'flex', gap: 8 }}>
        <Input 
          size="small" 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          onPressEnter={add}
          placeholder="Ajouter un sous-onglet" 
        />
        <Button size="small" onClick={add}>Ajouter</Button>
      </div>
    </div>
  );
};

// const { Title, Text } = Typography; // TEMPORAIREMENT DÉSACTIVÉ POUR DEBUG ELLIPSISMEASURE

interface ParametersProps {
  tree: TreeBranchLeafTree | null;
  selectedNode: TreeBranchLeafNode | null;
  nodes: TreeBranchLeafNode[];
  panelState: UIState['panelState'];
  onNodeUpdate: (node: Partial<TreeBranchLeafNode> & { id: string }) => Promise<TreeBranchLeafNode | null>;
  onCapabilityConfig: (node: Partial<TreeBranchLeafNode> & { id: string }) => Promise<TreeBranchLeafNode | null>;
  readOnly?: boolean;
  registry: TreeBranchLeafRegistryType;
  refreshTree?: () => Promise<void> | void;
  onDeleteNode?: (node: TreeBranchLeafNode) => Promise<void> | void;
  onSelectNodeId?: (nodeId: string) => void;
  onExpandNodeId?: (nodeId: string) => void;
  onNodeMetadataUpdated?: (node: TreeBranchLeafNode) => void; // 🔥 NEW: Direct callback for metadata changes
}

type LazyAppearanceComponent = React.LazyExoticComponent<React.ComponentType<unknown>>;

const appearancePanelCache = new Map<string, LazyAppearanceComponent | null>();

const getLazyAppearancePanel = (panelKey: string): LazyAppearanceComponent | null => {
  const resolvedKey = panelKey || 'DEFAULT';
  if (appearancePanelCache.has(resolvedKey)) {
    return appearancePanelCache.get(resolvedKey) ?? null;
  }

  const importer = (FieldAppearancePanels as Record<string, () => Promise<{ default: React.ComponentType<unknown> }>>)[resolvedKey]
    || (FieldAppearancePanels as Record<string, () => Promise<{ default: React.ComponentType<unknown> }>>)['DEFAULT'];

  if (!importer) {
    appearancePanelCache.set(resolvedKey, null);
    return null;
  }

  const lazyComponent = React.lazy(importer);
  appearancePanelCache.set(resolvedKey, lazyComponent);
  return lazyComponent;
};

// 🛡️ Cache global stable pour les panneaux de capacités (React.lazy)
// Évite de recréer un composant lazy à chaque render, ce qui causait
// des remontages fantômes et l'affichage de données d'autres champs
const lazyCapPanelCache = new Map<string, React.LazyExoticComponent<React.ComponentType<Record<string, unknown>>>>();

const Parameters: React.FC<ParametersProps> = (props) => {
  const { tree, selectedNode, nodes = [], panelState, registry, onNodeUpdate, refreshTree, onDeleteNode, onSelectNodeId, onExpandNodeId, onNodeMetadataUpdated } = props;
  
  // Log to verify callback is provided
  const metadataCallbackProvidedOnMountRef = useRef<boolean>(!!onNodeMetadataUpdated);
  useEffect(() => {
    console.error(`🎯 [Parameters] Mounted, callback provided: ${metadataCallbackProvidedOnMountRef.current}`);
    return () => {
      console.error('🎯 [Parameters] Unmounting');
    };
  }, []);

  useEffect(() => {
    if (selectedNode?.id) {
      console.error(`🎯 [Parameters] Selected node changed: ${selectedNode.id}`);
    }
  }, [selectedNode?.id]);
  
  // Refs pour cleanup
  const mountedRef = useRef<boolean>(true);

  // 🔐 Hook API authentifié
  const { api } = useAuthenticatedApi();
  const [applyingSharedRefs, setApplyingSharedRefs] = useState(false);
  const [unlinkingSharedRefs, setUnlinkingSharedRefs] = useState(false);
  // 🛡️ Anti-duplication: suivi des duplications en cours par répéteur (repeaterId -> Set<templateId>)
  const inFlightDupByRepeaterRef = useRef<Map<string, Set<string>>>(new Map());
  // 🗑️ Track des IDs supprimés récemment (pour filtrage immédiat avant refresh complet)
  const recentlyDeletedIdsRef = useRef<Set<string>>(new Set());

  const capabilities = useMemo(() => registry.getAllCapabilities(), [registry]);
  const [openCaps, setOpenCaps] = useState<Set<string>>(new Set<string>(Array.from(panelState.openCapabilities || [])));
  // État pour le panneau d'apparence
  const [appearanceOpen, setAppearanceOpen] = useState<boolean>(false);
  // ancres pour scroll auto des panneaux de capacités
  const capRefs = useRef<Record<string, HTMLDivElement | null>>({});
  // Drawer pour l'apparence
  const labelInputRef = useRef<InputRef | null>(null);

  // Etat local pour édition basique
  const [label, setLabel] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isRequired, setIsRequired] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [isMultiple, setIsMultiple] = useState<boolean>(false);
  const [technicianVisible, setTechnicianVisible] = useState<boolean>(false);
  const [fieldFullWidth, setFieldFullWidth] = useState<string | null>(null);
  // Repliable supprimé: état supprimé pour simplifier l'UI
  const [fieldType, setFieldType] = useState<string | undefined>(undefined);
  const [selectOptions, setSelectOptions] = useState<Array<{ label: string; value: string; group?: string }>>([]);
  const [newOptionLabel, setNewOptionLabel] = useState('');
  const [newOptionGroup, setNewOptionGroup] = useState('');
  const [capsState, setCapsState] = useState<Record<string, boolean>>({});
  const [localSubTabSelection, setLocalSubTabSelection] = useState<string[]>(() => normalizeSubTabValue(selectedNode?.metadata?.subTab));
  // Mémorise l'état précédent des capacités pour détecter les activations externes
  const prevCapsRef = useRef<Record<string, boolean>>({});
  const lastNodeIdRef = useRef<string | null>(null);
  // 🔗 Empêche la réinitialisation de capsState pendant un court laps de temps après une sauvegarde manuelle
  const skipCapsReinitUntilRef = useRef<number>(0);
  
  // État local pour les trigger fields (optimistic update)
  const [localTriggerNodeIds, setLocalTriggerNodeIds] = useState<string[]>([]);
  const [isLoadingTriggerIds, setIsLoadingTriggerIds] = useState(false);
  
  // 🔥 FETCH INDÉPENDANT: Charger triggerNodeIds directement depuis l'API
  useEffect(() => {
    if (!selectedNode?.id) {
      setLocalTriggerNodeIds([]);
      return;
    }
    
    // Reset à chaque changement de node
    if (lastNodeIdRef.current !== selectedNode.id) {
      lastNodeIdRef.current = selectedNode.id;
      setLocalTriggerNodeIds([]);
      setIsLoadingTriggerIds(true);
      
      console.log('🔄 [TriggerField] Chargement des triggerNodeIds pour:', selectedNode.id);
      
      // Fetch indépendant des metadata - ESSAYER /full d'abord
      api.get(`/api/treebranchleaf/nodes/${selectedNode.id}/full`)
        .then((response: any) => {
          console.log('📦 [TriggerField] Réponse /full complète:', response);
          // L'endpoint /full retourne {nodes: [nodeData]} - extraire le premier
          const nodeData = response?.nodes?.[0];
          console.log('📦 [TriggerField] Node extrait:', nodeData);
          console.log('📦 [TriggerField] Metadata:', nodeData?.metadata);
          const triggerIds = nodeData?.metadata?.triggerNodeIds || [];
          console.log('✅ [TriggerField] Chargés depuis API:', triggerIds);
          setLocalTriggerNodeIds(triggerIds);
          setIsLoadingTriggerIds(false);
        })
        .catch((error) => {
          console.error('❌ [TriggerField] Erreur chargement /full, essai avec /nodes:', error);
          // Fallback sur l'endpoint normal
          api.get(`/api/treebranchleaf/nodes/${selectedNode.id}`)
            .then((nodeData: TreeBranchLeafNode) => {
              console.log('📦 [TriggerField] Réponse de /nodes:', nodeData);
              console.log('📦 [TriggerField] Metadata:', nodeData?.metadata);
              const triggerIds = nodeData?.metadata?.triggerNodeIds || [];
              console.log('✅ [TriggerField] Chargés depuis API (fallback):', triggerIds);
              setLocalTriggerNodeIds(triggerIds);
              setIsLoadingTriggerIds(false);
            })
            .catch((err2) => {
              console.error('❌ [TriggerField] Erreur chargement (fallback):', err2);
              setLocalTriggerNodeIds([]);
              setIsLoadingTriggerIds(false);
            });
        });
    }
  }, [selectedNode?.id, api]);

  const panelStateOpenCapabilities = panelState.openCapabilities;
  const selectedNodeId = selectedNode?.id ?? null;

  const REPEATER_DEFAULT_LABEL = 'Ajouter une entrée';
  const [repeaterTemplateIds, setRepeaterTemplateIds] = useState<string[]>([]);
  const [repeaterMinItems, setRepeaterMinItems] = useState<number | undefined>(undefined);
  const [repeaterMaxItems, setRepeaterMaxItems] = useState<number | undefined>(undefined);
  const [repeaterAddLabel, setRepeaterAddLabel] = useState<string>(REPEATER_DEFAULT_LABEL);
  // 🆕 État pour le champ source du nombre de copies (pré-chargement intelligent)
  const [repeaterCountSourceNodeId, setRepeaterCountSourceNodeId] = useState<string | null>(null);
  // 🆕 État pour le modal de sélection du champ source
  const [repeaterCountSelectorOpen, setRepeaterCountSelectorOpen] = useState(false);
  
  // 🆕 Bloquer l'hydratation temporairement après une modification utilisateur
  const skipNextHydrationRef = useRef(false);
  const hydrationTimeoutRef = useRef<number | null>(null);
  
  // 🆕 État pour le sélecteur de champs déclencheurs
  const [triggerNodeSelectorOpen, setTriggerNodeSelectorOpen] = useState(false);

  const emitMetadataUpdate = useCallback((nextMetadata: Record<string, unknown>) => {
    if (!selectedNode || typeof onNodeMetadataUpdated !== 'function') return;
    onNodeMetadataUpdated({ ...selectedNode, metadata: nextMetadata } as TreeBranchLeafNode);
  }, [selectedNode, onNodeMetadataUpdated]);

  // Cleanup au démontage
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 🔄 Écouter les suppressions de copies pour rafraîchir les nodes
  useEffect(() => {
    const handleDeleteCopyEvent = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (!detail || !detail.deletedIds || !detail.nodeId) return;
      
      console.log('🗑️ [Parameters] Événement delete-copy-group-finished détecté:', {
        nodeId: detail.nodeId,
        deletedCount: detail.deletedIds.length,
        selectedRepeaterId: selectedNode?.id
      });
      
      // Ajouter immédiatement les IDs au Set des suppressions récentes
      detail.deletedIds.forEach((id: string) => {
        recentlyDeletedIdsRef.current.add(id);
      });
      
      console.log('🗑️ [Parameters] IDs marqués comme supprimés:', detail.deletedIds.length, '→ Total:', recentlyDeletedIdsRef.current.size);
      
      // 🔧 FIX: NE PAS appeler refreshTree() pour les suppressions.
      // Le handler tbl-repeater-updated dans useTBLDataPrismaComplete gère déjà
      // la suppression locale + retransform. Appeler refreshTree() ici provoquait
      // un fetch complet NON silencieux → flash visible + re-ajout de display nodes.
      // La cohérence serveur est assurée par le tbl-force-retransform à 3s.
    };
    
    window.addEventListener('delete-copy-group-finished', handleDeleteCopyEvent);
    
    return () => {
      window.removeEventListener('delete-copy-group-finished', handleDeleteCopyEvent);
    };
  }, [selectedNode?.id, refreshTree]);

  // 🔗 Écouter l'événement tbl-node-updated pour mettre à jour capsState immédiatement
  useEffect(() => {
    const handleNodeUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ node?: Record<string, unknown>; nodeId?: string }>;
      const { node: updatedNode, nodeId } = customEvent.detail || {};
      
      const targetId = (updatedNode?.id as string) || nodeId;
      if (!targetId || targetId !== selectedNode?.id) return;
      
      console.log('🔔 [Parameters] Événement tbl-node-updated reçu pour ce nœud:', {
        nodeId: targetId,
        hasLink: updatedNode?.hasLink,
        hasData: updatedNode?.hasData
      });
      
      // 🔗 Bloquer la réinitialisation de capsState pendant 2 secondes
      skipCapsReinitUntilRef.current = Date.now() + 2000;
      
      // Mettre à jour capsState directement si des flags de capacités sont présents
      setCapsState(prev => {
        const next = { ...prev };
        if (updatedNode?.hasLink !== undefined) next.link = !!updatedNode.hasLink;
        if (updatedNode?.hasData !== undefined) next.data = !!updatedNode.hasData;
        if (updatedNode?.hasFormula !== undefined) next.formula = !!updatedNode.hasFormula;
        if (updatedNode?.hasTable !== undefined) next.table = !!updatedNode.hasTable;
        if (updatedNode?.hasCondition !== undefined) next.condition = !!updatedNode.hasCondition;
        if (updatedNode?.hasAPI !== undefined) next.api = !!updatedNode.hasAPI;
        if (updatedNode?.hasMarkers !== undefined) next.markers = !!updatedNode.hasMarkers;
        
        console.log('🔗 [Parameters] capsState mis à jour via événement:', next);
        return next;
      });
    };
    
    window.addEventListener('tbl-node-updated', handleNodeUpdated);
    return () => window.removeEventListener('tbl-node-updated', handleNodeUpdated);
  }, [selectedNode?.id]);

  useEffect(() => {
    const next = normalizeSubTabValue(selectedNode?.metadata?.subTab);
    setLocalSubTabSelection(prev => (arraysAreEqual(prev, next) ? prev : next));
  }, [selectedNode?.id, selectedNode?.metadata?.subTab]);

  const cascadeSubTabAssignments = useCallback(async (subTabValues: string[] | null) => {
    if (!selectedNode) return;
    const sanitizedList = normalizeSubTabValues(subTabValues ?? []);
    const normalizedValue: string | string[] | null = sanitizedList.length === 0
      ? null
      : sanitizedList.length === 1
        ? sanitizedList[0]
        : sanitizedList;
    const stack: TreeBranchLeafNode[] = selectedNode.children ? [...selectedNode.children] : [];
    const toAssign: { id: string; meta: Record<string, unknown> }[] = [];
    while (stack.length) {
      const node = stack.pop()!;
      if (node.children && node.children.length) stack.push(...node.children);
      const type = node.type?.toLowerCase() ?? '';
      // 🔧 FIX: Inclure TOUS les types leaf (leaf_option, leaf_option_field, leaf_field, etc.)
      // pour que les options et leurs enfants héritent aussi du subtab
      const isLeaf = type.startsWith('leaf');
      const isBranchOrSection = type === 'branch' || type === 'section';
      if (!isLeaf && !isBranchOrSection) continue;
      if (isBranchOrSection) {
        const hasOwnSubTabs = Array.isArray((node.metadata as any)?.subTabs) && (node.metadata as any).subTabs.length > 0;
        if (hasOwnSubTabs) continue;
      }
      // 🔧 FIX: Vérifier si le nœud a DÉJÀ un subTab défini (ne pas écraser)
      const existingSubTab = (node.metadata as any)?.subTab;
      if (existingSubTab !== undefined && existingSubTab !== null && existingSubTab !== '') {
        // Le nœud a déjà son propre subTab, ne pas écraser
        continue;
      }
      const nextMeta = { ...(node.metadata || {}) } as Record<string, unknown>;
      if (normalizedValue === null) {
        delete nextMeta.subTab;
      } else {
        nextMeta.subTab = normalizedValue;
      }
      toAssign.push({ id: node.id, meta: nextMeta });
    }
    if (!toAssign.length) return;
    console.log('🔄 [cascadeSubTabAssignments] Propagation du subtab à', toAssign.length, 'nœuds:', toAssign.map(t => t.id));
    try {
      for (const item of toAssign) {
        if (typeof onNodeUpdate === 'function') {
          await onNodeUpdate({ id: item.id, metadata: item.meta });
        }
      }
      if (typeof refreshTree === 'function') {
        await Promise.resolve(refreshTree());
      }
      try {
        window.dispatchEvent(new CustomEvent('tbl-subtabs-updated', { detail: { nodeId: selectedNode.id, treeId: tree?.id } }));
      } catch {
        /* noop */
      }
    } catch (err) {
      console.error('❌ [Parameters] Erreur cascade sous-onglet:', err);
    }
  }, [onNodeUpdate, refreshTree, selectedNode, tree?.id]);

  const handleDeleteSelected = useCallback(async () => {
    if (!selectedNode) return;
    // Vérifier si le nœud est protégé
    if ((selectedNode.metadata as Record<string, unknown>)?.isProtected) {
      console.warn('🔒 [Parameters] Suppression bloquée: nœud protégé');
      return;
    }
    try {
      if (typeof onDeleteNode === 'function') {
        await Promise.resolve(onDeleteNode(selectedNode));
        return; // onDeleteNode gère déjà le refresh + UI
      }
      // Fallback: supprimer via API direct puis rafraîchir
      if (tree && selectedNode) {
        await api.delete(`/api/treebranchleaf/trees/${tree.id}/nodes/${selectedNode.id}`);
        if (typeof refreshTree === 'function') {
          await Promise.resolve(refreshTree());
        }
      }
    } catch (e) {
      console.error('❌ [Parameters] Erreur suppression nœud:', e);
    }
  }, [api, onDeleteNode, refreshTree, selectedNode, tree]);

  // 🔁 FONCTION DE DUPLICATION PHYSIQUE DES TEMPLATES
  const duplicateTemplatesPhysically = useCallback(async (templateNodeIds: string[]) => {
    if (!selectedNode?.id || !api) return;
    
    try {
      console.log('🔁 [duplicateTemplatesPhysically] Début duplication:', templateNodeIds);
      
      const response = await api.post(`/api/treebranchleaf/nodes/${selectedNode.id}/duplicate-templates`, {
        templateNodeIds
      });
      
      console.log('✅ [duplicateTemplatesPhysically] Duplication réussie:', response);
      const created: Array<{ id: string; sourceTemplateId?: string }> = Array.isArray(response?.duplicated) ? response.duplicated : [];

      // 🔍 Log chaque copie retournée
      console.log('🔍 [duplicateTemplatesPhysically] Copies retournées du serveur:');
      created.forEach((copy, idx) => {
        console.log(`  [${idx}] ID: ${copy.id}, Template: ${copy.sourceTemplateId}`);
      });
      console.log(`Total copies créées: ${created.length}, attendues: ${templateNodeIds.length}`);

      // 🧹 NE PAS NETTOYER L'IN-FLIGHT ICI !
      // Raison: Il faut attendre que `nodes` soit hydraté AVANT de retirer l'in-flight.
      // Sinon race condition si plusieurs POST en vol = re-création de doublons.
      // Le nettoyage se fera dans le useEffect qui détecte les mises à jour de `nodes`.
      // Voir: "Anti-redoublons: nettoyer in-flight une fois que les copies sont détectées dans nodes"

      // 🧭 Appliquer les références partagées des originaux sur les copies ("copie parfaite")
      try {
        await Promise.all(
          created.map((c) => api.post(`/api/treebranchleaf/nodes/${c.id}/apply-shared-references-from-original`))
        );
        console.log('🔗 [duplicateTemplatesPhysically] Références partagées appliquées sur copies');
      } catch (e) {
        console.warn('⚠️ [duplicateTemplatesPhysically] Échec application références sur certaines copies (non bloquant):', e);
      }
      
      // Rafraîchir l'arbre pour afficher les nouveaux enfants IMMÉDIATEMENT
      try {
        if (typeof refreshTree === 'function') {
          await Promise.resolve(refreshTree());
        }
      } catch (e) {
        console.warn('⚠️ [duplicateTemplatesPhysically] refreshTree a échoué, aucun impact fonctionnel', e);
      }

      // 🚀 Auto-expand du parent repeater et sélectionner la dernière copie créée
      try {
        if (created.length > 0) {
          const lastId = created[created.length - 1].id;
          if (typeof onExpandNodeId === 'function') onExpandNodeId(selectedNode.id);
          if (typeof onSelectNodeId === 'function') onSelectNodeId(lastId);
        }
      } catch (e) {
        console.warn('⚠️ [duplicateTemplatesPhysically] Auto expand/select non disponible:', e);
      }
    } catch (error) {
      const axiosErr = error as any;
      console.error('❌ [duplicateTemplatesPhysically] Erreur:', axiosErr?.response?.data || axiosErr);
      // 🧹 En cas d'échec, retirer les templates tentés de l'in-flight (ils pourront être retentés)
      try {
        if (selectedNode?.id) {
          const map = inFlightDupByRepeaterRef.current;
          const set = map.get(selectedNode.id);
          if (set) {
            templateNodeIds.forEach(id => set.delete(id));
            if (set.size === 0) map.delete(selectedNode.id); else map.set(selectedNode.id, set);
            console.log('🧹 [duplicateTemplatesPhysically] Nettoyage in-flight après erreur:', templateNodeIds);
          }
        }
      } catch (e) {
        console.warn('⚠️ [duplicateTemplatesPhysically] Nettoyage in-flight (erreur) échoué:', e);
      }
    }
  }, [selectedNode, api, refreshTree, onExpandNodeId, onSelectNodeId]);

  // 🆕 Référence stable pour onNodeUpdate (évite de recréer le debounce)
  const onNodeUpdateRef = useRef(onNodeUpdate);
  useEffect(() => {
    onNodeUpdateRef.current = onNodeUpdate;
  }, [onNodeUpdate]);

  // Sauvegarde debounced avec l'API optimisée
  const patchNode = useDebouncedCallback(async (payload: Record<string, unknown>) => {
    if (!selectedNodeId) return;
    
    // ✅ Log pour debug repeater
    console.log('🔄 [Parameters] Sauvegarde:', selectedNodeId, payload);
    
    try {
      // 🔄 NOUVEAU : Mapper appearanceConfig.repeater vers metadata.repeater pour le backend
      const apiData = { ...payload };
      
      if (payload.appearanceConfig) {
        const appearanceConfig = payload.appearanceConfig as any;
        
        // Extraire la config repeater si présente
        if (appearanceConfig.repeater) {
          apiData.metadata = {
            ...(apiData.metadata as Record<string, unknown> || {}),
            repeater: appearanceConfig.repeater,
            appearance: payload.appearanceConfig
          };
          console.log('🔁 [Parameters] Metadata repeater mappé:', appearanceConfig.repeater);
        } else {
          apiData.metadata = {
            ...(apiData.metadata as Record<string, unknown> || {}),
            appearance: payload.appearanceConfig
          };
        }
      }

      // 🔄 S'assurer que metadata.subTabs et metadata.subTab sont préservés
      if (payload.metadata) {
        const payloadMeta = payload.metadata as Record<string, unknown>;
        apiData.metadata = {
          ...(apiData.metadata as Record<string, unknown> || {}),
          ...payloadMeta
        };
        console.log('🎯 [Parameters] Metadata complet après fusion:', apiData.metadata);
        console.log('🔍 [Parameters] triggerNodeIds dans metadata:', (apiData.metadata as any)?.triggerNodeIds);
      }
      
      // 🔍 LOG FINAL DU PAYLOAD AVANT ENVOI API
      console.log('📤 [Parameters] PAYLOAD FINAL ENVOYÉ À L\'API:', {
        id: selectedNodeId,
        metadata: apiData.metadata,
        payloadComplet: apiData
      });
      
      // ✅ Utiliser la ref pour toujours avoir la dernière version
      const _updated = await onNodeUpdateRef.current({ ...apiData, id: selectedNodeId });
      
      // 🔍 LOG DE LA RÉPONSE API
      console.log('📥 [Parameters] RÉPONSE DE L\'API:', {
        id: _updated?.id,
        metadata: _updated?.metadata,
        triggerNodeIds: (_updated?.metadata as any)?.triggerNodeIds
      });

      // Emit generic event for other listeners; include returned updated node for local merges
      try {
        const baseNode = _updated || { id: selectedNodeId };
        const mergedMetadata = {
          ...((baseNode as any).metadata || {}),
          ...((apiData.metadata as Record<string, unknown>) || {})
        };
        const nodeToEmit = {
          ...(baseNode as Record<string, unknown>),
          metadata: mergedMetadata,
          ...(payload.appearanceConfig ? { appearanceConfig: payload.appearanceConfig } : {})
        };
        if (process.env.NODE_ENV === 'development') console.log('🔔 [Parameters] Emission tbl-node-updated pour:', (nodeToEmit as any).id);
        window.dispatchEvent(new CustomEvent('tbl-node-updated', { detail: { node: nodeToEmit, treeId: tree?.id } }));
      } catch { /* noop */ }
      console.log('✅ [Parameters] Sauvegarde OK');

      // Rafraîchir l'arbre uniquement lorsque la structure des sous-onglets change (et non chaque affectation)
      try {
        const md = (apiData.metadata as Record<string, unknown> | undefined);
        const hasSubTabStructureChange = !!(md && Array.isArray(md.subTabs));
        const hasCascadeUpdate = Boolean((payload as any)?.cascadeSubTab);
        if (hasSubTabStructureChange || hasCascadeUpdate) {
          if (typeof refreshTree === 'function') {
            console.log('🔁 [Parameters] Déclencher refreshTree suite à modification de la structure des subTabs');
            await Promise.resolve(refreshTree());
          }
        }
      } catch (e) {
        console.warn('⚠️ [Parameters] refreshTree échoué après mise à jour subTabs', e);
      }
    } catch (error) {
      console.error('❌ [Parameters] Erreur lors de la sauvegarde:', error);
    }
  }, 800); // ✅ 800ms = assez pour éviter spam, assez rapide pour sauvegarder chaque champ

  const selectedNodeFromTree = useMemo(() => {
    if (!selectedNode) return null;
    const stack: TreeBranchLeafNode[] = [...nodes];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current.id === selectedNode.id) {
        return current;
      }
      if (current.children && current.children.length > 0) {
        for (const child of current.children) {
          stack.push(child);
        }
      }
    }
    return null;
  }, [nodes, selectedNode]);

  // Build a flat map (id -> node) for efficient deep lookups (used across multiple UI widgets)
  // 🔥 IMPORTANT: Cette map doit contenir TOUS les nodes de l'arbre, y compris ceux imbriqués profondément
  const nodesMap = useMemo(() => {
    const m = new Map<string, TreeBranchLeafNode>();
    const stack: TreeBranchLeafNode[] = [...(nodes || [])];
    while (stack.length) {
      const n = stack.pop()!;
      m.set(n.id, n);
      if (n.children && n.children.length > 0) stack.push(...n.children);
    }
    return m;
  }, [nodes]);

  const hydratedAppearanceConfig = useMemo(() => {
      if (!selectedNode) return {};
      const tblSnapshot = TreeBranchLeafRegistry.mapTBLToAppearanceConfig(selectedNode as unknown as Record<string, unknown>);
      
      // 🎯 FIX: Filtrer les valeurs null/undefined de appearanceConfig pour ne pas écraser tblSnapshot
      const appearanceConfig = selectedNode.appearanceConfig || {};
      const cleanAppearanceConfig: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(appearanceConfig as Record<string, unknown>)) {
        if (val !== null && val !== undefined && val !== '') {
          cleanAppearanceConfig[key] = val;
        }
      }
      
      return {
        ...tblSnapshot,
        ...cleanAppearanceConfig
      };
    }, [selectedNode]);

  const appearancePanelKey = useMemo(() => {
    if (fieldType) return String(fieldType).toUpperCase();
    if (selectedNode?.type) return String(selectedNode.type).toUpperCase();
    return 'DEFAULT';
  }, [fieldType, selectedNode?.type]);

  const LazyAppearancePanel = useMemo(() => getLazyAppearancePanel(appearancePanelKey), [appearancePanelKey]);

  const branchSubTabs = useMemo(() => {
    if (!selectedNode) return [] as string[];
    // If the selected branch defines its own subTabs, use them
    if (Array.isArray((selectedNode.metadata as any)?.subTabs)) return (selectedNode.metadata as any).subTabs as string[];
    // Otherwise, find nearest ancestor branch that defines subTabs
    let currentId = selectedNode.parentId as string | undefined | null;
    while (currentId) {
      const parent = nodesMap.get(currentId);
      if (!parent) break;
      if (Array.isArray((parent.metadata as any)?.subTabs)) return (parent.metadata as any).subTabs as string[];
      currentId = parent.parentId as string | undefined | null;
    }
    return [] as string[];
  }, [selectedNode, nodesMap]);

  // (helper local retiré: findNodeById) – on utilise une DFS inline lorsque nécessaire

  type RepeaterMetadata = {
    templateNodeIds?: string[];
    templateNodeLabels?: Record<string, string>;
    minItems?: number | null;
    maxItems?: number | null;
    addButtonLabel?: string;
    buttonSize?: 'tiny' | 'small' | 'middle' | 'large';
    buttonWidth?: 'auto' | 'half' | 'full';
    iconOnly?: boolean;
  };

  const commitRepeaterMetadata = useCallback((partial: Partial<RepeaterMetadata>) => {
    if (!selectedNode) return;
    // ✅ Autoriser les repeaters sur tous les types de nœuds (branch, section, leaf_repeater, etc.)
    
    console.log('📝 [commitRepeaterMetadata] ENTRÉE:', {
      partial,
      'selectedNode.type': selectedNode.type,
      'selectedNode.metadata': selectedNode.metadata
    });
    
    // 🆕 IMPORTANT : Prioriser les valeurs de `partial`, puis l'état local
    // ⚠️ CRITIQUE : Le merge doit ÉCRASER avec `partial` en priorité, sinon on garde les anciennes valeurs !
    const merged: RepeaterMetadata = {
      // Valeurs par défaut depuis l'état local
      templateNodeIds: repeaterTemplateIds,
      minItems: repeaterMinItems ?? undefined,
      maxItems: repeaterMaxItems ?? undefined,
      addButtonLabel: repeaterAddLabel !== REPEATER_DEFAULT_LABEL ? repeaterAddLabel : undefined,
      // ÉCRASEMENT avec les valeurs de `partial` (priorité absolue)
      ...partial
    };

    console.log('📝 [commitRepeaterMetadata] APRÈS MERGE:', {
      'partial.templateNodeIds (paramètre passé)': partial.templateNodeIds,
      'repeaterTemplateIds (state React - PEUT ÊTRE STALE)': repeaterTemplateIds,
      'merged.templateNodeIds (résultat final)': merged.templateNodeIds,
      '👁️ Vérif': partial.templateNodeIds 
        ? (JSON.stringify(partial.templateNodeIds) === JSON.stringify(merged.templateNodeIds)
            ? '✅ OK - partial a bien priorité'
            : `❌ ERREUR - merged diffère de partial !`)
        : 'partial.templateNodeIds absent'
    });

    if (!Array.isArray(merged.templateNodeIds)) {
      delete merged.templateNodeIds;
    } else if (merged.templateNodeIds.length > 0) {
      // 🔥 FILTRE CRITIQUE: Vérifier que chaque templateNodeId correspond à un nœud SANS repeater imbriqué
      // Chercher les nœuds réels pour valider
      const hasNestedRepeater = (nodeId: string): boolean => {
        const findNode = (list: TreeBranchLeafNode[] | undefined): TreeBranchLeafNode | null => {
          if (!list) return null;
          for (const n of list) {
            if (n.id === nodeId) return n;
            if (n.children && n.children.length > 0) {
              const found = findNode(n.children);
              if (found) return found;
            }
          }
          return null;
        };
        
        const node = findNode(nodes);
        if (!node) return false;
        
        // Vérifier si le nœud contient un repeater descendant
        const checkHasRepeater = (n: TreeBranchLeafNode): boolean => {
          if (n.type === 'leaf_repeater') return true;
          if (!n.children || n.children.length === 0) return false;
          return n.children.some(child => checkHasRepeater(child));
        };
        
        return checkHasRepeater(node);
      };
      
      // Filtrer les IDs
      const beforeCount = merged.templateNodeIds.length;
      merged.templateNodeIds = merged.templateNodeIds.filter(id => {
        const hasNested = hasNestedRepeater(id);
        if (hasNested) {
          const node = nodes?.find(n => n.id === id);
          console.error(`🚨 [commitRepeaterMetadata] REJET: Tentative de sauvegarder un champ imbriqué: ${node?.label} (${id})`);
        }
        return !hasNested;
      });
      
      if (merged.templateNodeIds.length < beforeCount) {
        console.error(`🚨 [commitRepeaterMetadata] REJET TOTAL: ${beforeCount - merged.templateNodeIds.length} champ(s) imbriqué(s) ont été rejeté(s)!`);
      }
      
      if (merged.templateNodeIds.length === 0) {
        delete merged.templateNodeIds;
      }
    }

    if (merged.minItems === undefined) {
      delete merged.minItems;
    }

    if (merged.maxItems === undefined) {
      delete merged.maxItems;
    }

    if (typeof merged.addButtonLabel === 'string') {
      const trimmed = merged.addButtonLabel.trim();
      if (trimmed.length === 0 || trimmed === REPEATER_DEFAULT_LABEL) {
        delete merged.addButtonLabel;
      } else {
        merged.addButtonLabel = trimmed;
      }
    }

    // 🔥 NETTOYAGE : Si templateNodeIds est vide, supprimer complètement repeater de metadata
    const hasTemplates = merged.templateNodeIds && merged.templateNodeIds.length > 0;
    const nextMetadata = hasTemplates
      ? {
          ...(selectedNode.metadata || {}),
          repeater: merged
        }
      : (() => {
          const { repeater, ...rest } = (selectedNode.metadata || {}) as any;
          return rest;
        })();

    console.log('📝 [commitRepeaterMetadata] METADATA FINALE:', nextMetadata);

    // 🔥 IMPORTANT : Enregistrer AUSSI dans les colonnes dédiées de la base
    // 🔥 FILTRE: Ne sauvegarder les templateNodeLabels que pour les IDs qui sont restés après le filtre
    const validatedLabels = partial.templateNodeLabels 
      ? Object.fromEntries(
          Object.entries(partial.templateNodeLabels).filter(([id]) => 
            merged.templateNodeIds && merged.templateNodeIds.includes(id)
          )
        )
      : {};

    const payload: Record<string, unknown> = {
      metadata: nextMetadata,
      // ✅ Colonnes dédiées pour performances et requêtes SQL
      repeater_addButtonLabel: merged.addButtonLabel || null,
      repeater_buttonSize: merged.buttonSize || 'middle',
      repeater_buttonWidth: merged.buttonWidth || 'auto',
      repeater_iconOnly: merged.iconOnly || false,
      repeater_minItems: merged.minItems ?? 0,
      repeater_maxItems: merged.maxItems || null,
      // 🔥 CRITIQUE : Enregistrer AUSSI les templateNodeIds et templateNodeLabels dans les colonnes dédiées
      repeater_templateNodeIds: merged.templateNodeIds && merged.templateNodeIds.length > 0 
        ? JSON.stringify(merged.templateNodeIds) 
        : null,
      repeater_templateNodeLabels: Object.keys(validatedLabels).length > 0
        ? JSON.stringify(validatedLabels)
        : null
    };

    console.log('💾 [commitRepeaterMetadata] PAYLOAD COMPLET:', payload);
    
    patchNode(payload);
    emitMetadataUpdate(nextMetadata);
    
    // � Émettre l'événement pour notifier le hook de recharger les données
    window.dispatchEvent(
      new CustomEvent('tbl-repeater-updated', {
        detail: {
          nodeId: selectedNode.id,
          treeId: selectedNode.tree_id,
          suppressReload: false,
          source: 'commitRepeaterMetadata',
          timestamp: Date.now()
        }
      })
    );
    console.log('🔔 [commitRepeaterMetadata] Événement tbl-repeater-updated émis');
    
    // 🔁 DUPLICATION PHYSIQUE (IDEMPOTENTE)
    // Ne dupliquer que les gabarits qui n'ont PAS déjà de copie sous ce répéteur
    if (merged.templateNodeIds && merged.templateNodeIds.length > 0) {
      try {
        // 1) Enfants directs du répéteur
        const deriveChildrenByParentId = (all: TreeBranchLeafNode[], parentId?: string | null) => {
          if (!parentId) return [] as TreeBranchLeafNode[];
          const stack: TreeBranchLeafNode[] = [...all];
          const out: TreeBranchLeafNode[] = [];
          while (stack.length) {
            const n = stack.pop()!;
            if (n.parentId === parentId) out.push(n);
            if (n.children && n.children.length) stack.push(...n.children);
          }
          return out;
        };

        const repeaterId = selectedNodeFromTree?.id || selectedNode.id;
        const childrenOfRepeater = deriveChildrenByParentId(nodes, repeaterId);

        // 2) Set des templates déjà matérialisés via les enfants directs UNIQUEMENT
        // ⚠️ IMPORTANT: Ne pas inclure les nœuds supprimés ou déplacés ailleurs !
        // 🗑️ FILTRER les IDs supprimés récemment AVANT de construire le Set
        const recentlyDeleted = recentlyDeletedIdsRef.current;
        const existingSourceTemplateIds = new Set<string>();
        childrenOfRepeater.forEach(n => {
          // Ignorer les nœuds supprimés récemment
          if (recentlyDeleted.has(n.id)) {
            console.log('🗑️ [commitRepeaterMetadata] Ignorer nœud supprimé récemment:', n.id, n.label);
            return;
          }
          
          const meta = (n.metadata || {}) as any;
          // Vérifier que c'est bien un enfant DIRECT et qu'il a un sourceTemplateId
          if (n.parentId === repeaterId && meta?.sourceTemplateId) {
            existingSourceTemplateIds.add(meta.sourceTemplateId);
          }
        });

        // 3) Anti-redup: ajouter les duplications EN COURS (in-flight) pour ce répéteur
        const inflightSet = inFlightDupByRepeaterRef.current.get(repeaterId);
        if (inflightSet && inflightSet.size > 0) {
          inflightSet.forEach(id => existingSourceTemplateIds.add(id));
          console.log('🛡️ [commitRepeaterMetadata] In-flight protégés:', Array.from(inflightSet));
        }

        // 4) Calculer les gabarits à créer (sélectionnés - déjà existants)
        const toCreate = merged.templateNodeIds.filter(id => !existingSourceTemplateIds.has(id));
        
        // 5) 🗑️ NOUVEAU : Calculer les copies à SUPPRIMER (existantes mais plus sélectionnées)
        // On compare les sourceTemplateIds des copies existantes avec les templates sélectionnés
        const selectedSet = new Set(merged.templateNodeIds);
        console.log('👀 [commitRepeaterMetadata] Détection des copies à supprimer:', {
          'merged.templateNodeIds': merged.templateNodeIds,
          'selectedSet': Array.from(selectedSet),
          'childrenOfRepeater.length': childrenOfRepeater.length,
          'repeaterId': repeaterId
        });
        
        const nodesToDelete: TreeBranchLeafNode[] = [];
        
        childrenOfRepeater.forEach(n => {
          // Ignorer les nœuds déjà marqués comme supprimés
          if (recentlyDeleted.has(n.id)) {
            console.log(`⏭️ [commitRepeaterMetadata] Ignoré (déjà supprimé): ${n.label} (${n.id})`);
            return;
          }
          
          const meta = (n.metadata || {}) as any;
          const sourceTemplateId = meta?.sourceTemplateId;
          
          // Log détaillé pour chaque enfant
          console.log(`🔍 [commitRepeaterMetadata] Analyse enfant: ${n.label}`, {
            id: n.id,
            parentId: n.parentId,
            sourceTemplateId: sourceTemplateId || '(aucun)',
            isChild: n.parentId === repeaterId,
            templateStillSelected: sourceTemplateId ? selectedSet.has(sourceTemplateId) : 'N/A'
          });
          
          // Si c'est une copie (a un sourceTemplateId) ET que son template n'est plus sélectionné
          if (n.parentId === repeaterId && sourceTemplateId && !selectedSet.has(sourceTemplateId)) {
            console.log(`🗑️ [commitRepeaterMetadata] Copie à supprimer: ${n.label} (${n.id.substring(0,8)}...) - template source: ${sourceTemplateId.substring(0,8)}...`);
            nodesToDelete.push(n);
          }
        });
        
        console.log('🧙 [commitRepeaterMetadata] Récapitulatif des suppressions:', {
          'Total copies à supprimer': nodesToDelete.length,
          'Détails': nodesToDelete.map(n => ({
            id: n.id.substring(0, 8) + '...',
            label: n.label,
            sourceTemplate: ((n.metadata as any)?.sourceTemplateId || 'N/A').substring(0, 8) + '...'
          }))
        });
        
        console.log('🧙 [commitRepeaterMetadata] Récapitulatif des suppressions:', {
          'Total copies à supprimer': nodesToDelete.length,
          'Détails': nodesToDelete.map(n => ({
            id: n.id.substring(0, 8) + '...',
            label: n.label,
            sourceTemplate: ((n.metadata as any)?.sourceTemplateId || 'N/A').substring(0, 8) + '...'
          }))
        });

        console.log('🧪 [commitRepeaterMetadata] Check idempotence:', {
          repeaterId: repeaterId.substring(0, 8) + '...',
          'selectedTemplateIds': merged.templateNodeIds.map(id => id.substring(0, 8) + '...'),
          'existingSourceTemplateIds': Array.from(existingSourceTemplateIds).map(id => id.substring(0, 8) + '...'),
          'toCreate (nouveaux)': toCreate.map(id => id.substring(0, 8) + '...'),
          'toDelete (retirés)': nodesToDelete.map(n => ({ 
            id: n.id.substring(0, 8) + '...', 
            label: n.label, 
            sourceTemplate: ((n.metadata as any)?.sourceTemplateId || '').substring(0, 8) + '...'
          }))
        });

        // 6) 🔄 SÉQUENCE : Supprimer d'abord, puis créer après
        // CRITIQUE : On doit attendre que les suppressions soient terminées AVANT de créer
        const performDeletionsThenCreation = async () => {
          console.log('📦 [performDeletionsThenCreation] Début séquence:', {
            'nodesToDelete.length': nodesToDelete.length,
            'toCreate.length': toCreate.length
          });
          // Étape A : Supprimer les copies désélectionnées
          if (nodesToDelete.length > 0 && onDeleteNode) {
            console.log('🗑️ [commitRepeaterMetadata] Suppression des copies désélectionnées:', nodesToDelete.map(n => `${n.label} (${n.id})`));
            
            // Marquer immédiatement comme supprimés
            nodesToDelete.forEach(n => recentlyDeletedIdsRef.current.add(n.id));
            
            // ⏳ ATTENDRE que toutes les suppressions soient terminées
            await Promise.all(
              nodesToDelete.map(async (node) => {
                try {
                  await Promise.resolve(onDeleteNode(node));
                  console.log(`✅ [commitRepeaterMetadata] Copie ${node.label} (${node.id}) supprimée avec succès`);
                } catch (err) {
                  console.error(`❌ [commitRepeaterMetadata] Échec suppression ${node.label}:`, err);
                  // Retirer du tracking en cas d'échec
                  recentlyDeletedIdsRef.current.delete(node.id);
                }
              })
            );
            
            // Rafraîchir l'arbre après suppression
            console.log('🔄 [commitRepeaterMetadata] Suppressions terminées, rafraîchissement...');
            await refreshTree?.();
            
            // ⏳ Petit délai pour laisser l'état se stabiliser
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          // Étape B : NE PAS créer automatiquement les copies
          // Les copies seront créées UNIQUEMENT quand l'utilisateur clique sur le bouton "Ajouter"
          if (toCreate.length > 0) {
            console.log('📋 [commitRepeaterMetadata] Templates à dupliquer (attente clic "Ajouter"):', toCreate);
            // NOTE: On ne duplique plus automatiquement ici
            // duplicateTemplatesPhysically sera appelé par le bouton "Ajouter" dans TBLSectionRenderer
          } else if (nodesToDelete.length === 0) {
            console.log('✅ [commitRepeaterMetadata] Aucune modification nécessaire (idempotent)');
          }
        };

        // Lancer la séquence
        performDeletionsThenCreation().catch(err => {
          console.error('❌ [commitRepeaterMetadata] Erreur durant la séquence suppression/création:', err);
        });
      } catch (e) {
        console.warn('⚠️ [commitRepeaterMetadata] Échec contrôle idempotence:', e);
        // Plus de fallback de duplication automatique - on laisse le bouton "Ajouter" gérer
      }
    }
  }, [patchNode, selectedNode, selectedNodeFromTree, nodes, repeaterTemplateIds, repeaterMinItems, repeaterMaxItems, repeaterAddLabel, REPEATER_DEFAULT_LABEL, emitMetadataUpdate]);

  // 🧹 Anti-redoublons: Nettoyer in-flight une fois que les copies sont détectées dans `nodes`
  // Raison: On ne doit retirer de l'in-flight que APRÈS que `nodes` soit hydraté avec les vraies copies.
  // Cela évite les race conditions lors de multiples POST simultanés.
  useEffect(() => {
    if (!selectedNode?.id || inFlightDupByRepeaterRef.current.size === 0) return;
    
    const repeaterId = selectedNode.id;
    const inflightSet = inFlightDupByRepeaterRef.current.get(repeaterId);
    if (!inflightSet || inflightSet.size === 0) return;
    
    // Chercher les enfants du répéteur dans `nodes`
    const deriveChildrenByParentId = (all: TreeBranchLeafNode[], parentId?: string | null) => {
      if (!parentId) return [] as TreeBranchLeafNode[];
      const stack: TreeBranchLeafNode[] = [...all];
      const out: TreeBranchLeafNode[] = [];
      while (stack.length) {
        const n = stack.pop()!;
        if (n.parentId === parentId) out.push(n);
        if (n.children && n.children.length) stack.push(...n.children);
      }
      return out;
    };
    
    const childrenOfRepeater = deriveChildrenByParentId(nodes, repeaterId);
    
    // Chercher les sourceTemplateIds des enfants ACTUELS
    const actualSourceTemplateIds = new Set<string>();
    childrenOfRepeater.forEach(n => {
      const meta = (n.metadata || {}) as any;
      if (meta?.sourceTemplateId) actualSourceTemplateIds.add(meta.sourceTemplateId);
    });
    
    // Nettoyer l'in-flight pour les templates qui sont MAINTENANT trouvés dans `nodes`
    let cleaned = false;
    inflightSet.forEach(tplId => {
      if (actualSourceTemplateIds.has(tplId)) {
        inflightSet.delete(tplId);
        cleaned = true;
      }
    });
    
    if (cleaned) {
      if (inflightSet.size === 0) {
        inFlightDupByRepeaterRef.current.delete(repeaterId);
        console.log('🧹 [Parameters] Nettoyage in-flight COMPLET après hydratation de nodes');
      } else {
        inFlightDupByRepeaterRef.current.set(repeaterId, inflightSet);
        console.log('🧹 [Parameters] Nettoyage in-flight PARTIEL:', Array.from(inflightSet));
      }
    }
    
    // 🗑️ Nettoyer TOUS les IDs supprimés après un refresh complet
    // Raison: `recentlyDeletedIdsRef` ne sert qu'à filtrer TEMPORAIREMENT avant que `nodes` soit à jour
    // Une fois que `nodes` est rafraîchi, on peut tout vider car les copies vraiment supprimées ne sont plus dans `nodes`
    if (recentlyDeletedIdsRef.current.size > 0) {
      const allNodeIds = new Set<string>();
      const collectIds = (list: TreeBranchLeafNode[]) => {
        list.forEach(n => {
          allNodeIds.add(n.id);
          if (n.children) collectIds(n.children);
        });
      };
      collectIds(nodes);
      
      // Retirer TOUS les IDs qui ne sont plus dans l'arbre (= vraiment supprimés)
      const initialSize = recentlyDeletedIdsRef.current.size;
      const remainingIds = new Set<string>();
      
      recentlyDeletedIdsRef.current.forEach(id => {
        if (allNodeIds.has(id)) {
          // L'ID existe toujours → garder dans le tracking temporaire
          remainingIds.add(id);
        }
        // Sinon, il a été confirmé supprimé → on ne le garde PAS
      });
      
      recentlyDeletedIdsRef.current = remainingIds;
      
      const cleanedCount = initialSize - remainingIds.size;
      if (cleanedCount > 0) {
        console.log(`🗑️ [Parameters] Nettoyage IDs supprimés confirmés: ${cleanedCount} → Reste: ${recentlyDeletedIdsRef.current.size}`);
      }
    }
  }, [nodes, selectedNode?.id]);

  // Hydratation à la sélection
  useEffect(() => {
    if (!selectedNode) return;

    const isNewNode = lastNodeIdRef.current !== selectedNode.id;
    lastNodeIdRef.current = selectedNode.id;

    setLabel(selectedNode.label || '');
    setDescription(selectedNode.description || '');
    setIsRequired(!!selectedNode.isRequired);
    setIsVisible(selectedNode.isVisible !== false);
    setIsMultiple(!!selectedNode.isMultiple);
    setTechnicianVisible(!!(selectedNode as any).technicianVisible);
    setFieldFullWidth((selectedNode as any).field_full_width || null);

    if (isNewNode) {
      setAppearanceOpen(false);
    }

    const nodeType = registry.getNodeType(selectedNode.type);
    const ft = (selectedNode.subType as string | undefined)
      || (selectedNode.metadata?.fieldType as string | undefined)
      || nodeType?.defaultFieldType
      || selectedNode.type; // ✅ FALLBACK: utiliser le type du nœud si pas de fieldType
    console.log('🔍 [Parameters] FieldType détecté:', { 
      type: selectedNode.type, 
      subType: selectedNode.subType, 
      metadataFieldType: selectedNode.metadata?.fieldType, 
      defaultFieldType: nodeType?.defaultFieldType,
      finalFieldType: ft 
    });
    setFieldType(ft);

    // 📋 Hydrater les options SELECT depuis select_options
    const rawOpts = (selectedNode as any).select_options;
    if (Array.isArray(rawOpts) && rawOpts.length > 0) {
      setSelectOptions(rawOpts.map((o: any) => ({ label: o.label || o.value || '', value: o.value || o.label || '', ...(o.group ? { group: o.group } : {}) })));
    } else {
      setSelectOptions([]);
    }
    setNewOptionLabel('');

    // ❌ DÉSACTIVÉ : Ne pas appliquer l'apparence par défaut ici car ça crée une boucle infinie
    // L'apparence par défaut doit être appliquée uniquement lors de la CRÉATION du nœud, pas lors de l'hydratation
    // Le TreeBranchLeafEditor applique déjà les valeurs par défaut lors de la création

    const conditionActive = !!selectedNode.hasCondition;
    
    // 🔗 Ignorer la réinitialisation si on est dans la période de blocage (après un save manuel)
    const now = Date.now();
    const skipUntil = skipCapsReinitUntilRef.current;
    if (now < skipUntil) {
      console.log('⏭️ [Parameters] Réinitialisation capsState ignorée (blocage actif)', { now, skipUntil, diff: skipUntil - now });
    } else {
      const newCapsState = {
        data: !!selectedNode.hasData,
        formula: !!selectedNode.hasFormula,
        condition: conditionActive,
        table: !!selectedNode.hasTable,
        api: !!selectedNode.hasAPI,
        link: !!selectedNode.hasLink,
        markers: !!selectedNode.hasMarkers,
        product: !!selectedNode.hasProduct
      };
      // 🔒 Éviter re-render inutile si capsState n'a pas changé
      setCapsState(prev => {
        const keys = Object.keys(newCapsState) as Array<keyof typeof newCapsState>;
        const changed = keys.some(k => prev[k] !== newCapsState[k]);
        if (!changed) {
          console.log('⏭️ [Parameters] capsState identique, skip re-render');
          return prev; // même référence → pas de re-render
        }
        console.log('🔄 [Parameters] capsState réinitialisé via hydratation:', newCapsState, { 
          'selectedNode.hasLink': selectedNode.hasLink,
          'selectedNode.id': selectedNode.id 
        });
        return newCapsState;
      });
    }

    if (isNewNode) {
      setOpenCaps(new Set<string>(Array.from(panelStateOpenCapabilities || [])));
    }

    if (selectedNode.type === 'leaf_repeater') {
      // 🆕 Ignorer l'hydratation si on vient de modifier
      if (skipNextHydrationRef.current) {
        console.log('⏭️ [Parameters] Hydratation ignorée (modification en cours)');
        return;
      }
      
      console.log('🔍 [Parameters] Hydratation repeater:', {
        'selectedNode.metadata': JSON.stringify(selectedNode.metadata, null, 2),
        'selectedNode.metadata?.repeater': JSON.stringify(selectedNode.metadata?.repeater, null, 2)
      });
      
      const repeaterMeta = (selectedNode.metadata?.repeater as RepeaterMetadata) || {};
      console.log('🔍 [Parameters] repeaterMeta après cast:', JSON.stringify(repeaterMeta, null, 2));

      // 🔥 FONCTION DE NETTOYAGE STRICTE: Rejeter TOUS les champs avec repeaters imbriqués
      const filterOutNestedRepeaters = (ids: string[] | undefined): string[] => {
        if (!ids || ids.length === 0) return [];
        
        // Fonction pour vérifier si un nœud contient un repeater descendant
        const hasNestedRepeater = (nodeId: string): boolean => {
          const findNode = (list: TreeBranchLeafNode[] | undefined): TreeBranchLeafNode | null => {
            if (!list) return null;
            for (const n of list) {
              if (n.id === nodeId) return n;
              if (n.children && n.children.length > 0) {
                const found = findNode(n.children);
                if (found) return found;
              }
            }
            return null;
          };
          
          const node = findNode(nodes);
          if (!node) return false;
          
          // Vérifier si le nœud contient un repeater descendant
          const checkHasRepeater = (n: TreeBranchLeafNode): boolean => {
            if (n.type === 'leaf_repeater') return true;
            if (!n.children || n.children.length === 0) return false;
            return n.children.some(child => checkHasRepeater(child));
          };
          
          return checkHasRepeater(node);
        };
        
        // Filtrer et afficher les suppressions
        const filtered = ids.filter(id => !hasNestedRepeater(id));
        if (filtered.length < ids.length) {
          const removed = ids.filter(id => !filtered.includes(id));
          console.error(`🚨 [Parameters] NETTOYAGE CRITIQUE: ${removed.length} champ(s) imbriqué(s) rejeté(s) de templateNodeIds!`);
          removed.forEach(id => {
            const node = nodes?.find(n => n.id === id);
            console.error(`   ❌ REJETÉ: ${node?.label} (${id})`);
          });
        }
        
        return filtered;
      };

      const parseTemplateIdsFromColumn = (): string[] | undefined => {
        const raw = (selectedNode as any)?.repeater_templateNodeIds;
        if (!raw) return undefined;
        try {
          let parsed: any;
          if (Array.isArray(raw)) parsed = raw;
          else if (typeof raw === 'string') {
            parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return undefined;
          } else {
            return undefined;
          }
          
          const ids = parsed.filter((id): id is string => typeof id === 'string');
          // 🔥 NETTOYAGE À LA SOURCE: Rejeter immédiatement les champs imbriqués
          return filterOutNestedRepeaters(ids);
        } catch (err) {
          console.warn('⚠️ [Parameters] Impossible de parser repeater_templateNodeIds:', err);
        }
        return undefined;
      };

      const deriveTemplateIdsFromCopies = (): string[] => {
        // ⚠️ DEPRECATED: Cette fonction causait la pollution du repeater avec des champs de sous-repeaters
        // On retourne un tableau vide pour forcer l'utilisation de columnTemplateIds ou metadata
        return [];
      };
      
      const columnTemplateIds = parseTemplateIdsFromColumn();
      const fallbackTemplateIds = deriveTemplateIdsFromCopies();
      
      // 🔧 FIX: Priorité à columnTemplateIds (colonne DB directe) car metadata peut être stale
      // L'ordre de priorité est maintenant:
      // 1. columnTemplateIds (colonne repeater_templateNodeIds - source de vérité)
      // 2. repeaterMeta.templateNodeIds (peut être désynchronisé si selectedNode est stale)
      // 3. fallbackTemplateIds (déprécié)
      let templateIds = columnTemplateIds 
        ?? (Array.isArray(repeaterMeta.templateNodeIds) ? repeaterMeta.templateNodeIds : null)
        ?? (fallbackTemplateIds.length > 0 ? fallbackTemplateIds : []);
      
      // 🔥 NETTOYAGE SUPPLÉMENTAIRE: Même si templateIds vient de repeaterMeta, nettoyer
      templateIds = filterOutNestedRepeaters(templateIds);

      console.log('🔍 [Parameters] Template IDs extraits:', {
        templateIds,
        'columnTemplateIds (PRIORITÉ)': columnTemplateIds,
        'Array.isArray(repeaterMeta.templateNodeIds)': Array.isArray(repeaterMeta.templateNodeIds),
        'repeaterMeta.templateNodeIds': repeaterMeta.templateNodeIds,
        fallbackTemplateIds
      });
      
      setRepeaterTemplateIds(templateIds);
      setRepeaterMinItems(typeof repeaterMeta.minItems === 'number' ? repeaterMeta.minItems : undefined);
      setRepeaterMaxItems(typeof repeaterMeta.maxItems === 'number' ? repeaterMeta.maxItems : undefined);
      setRepeaterAddLabel(
        typeof repeaterMeta.addButtonLabel === 'string' && repeaterMeta.addButtonLabel.trim().length > 0
          ? repeaterMeta.addButtonLabel
          : REPEATER_DEFAULT_LABEL
      );
      // 🆕 Hydratation du champ source pour le nombre de copies
      setRepeaterCountSourceNodeId((selectedNode as any)?.repeater_countSourceNodeId ?? null);
    } else {
      setRepeaterTemplateIds([]);
      setRepeaterMinItems(undefined);
      setRepeaterMaxItems(undefined);
      setRepeaterAddLabel(REPEATER_DEFAULT_LABEL);
      setRepeaterCountSourceNodeId(null);
    }
  // 🔗 FIX: Ajouter les flags de capacités aux dépendances pour que le useEffect se redéclenche quand ils changent
  }, [selectedNode, selectedNode?.hasData, selectedNode?.hasFormula, selectedNode?.hasLink, selectedNode?.hasTable, selectedNode?.hasCondition, selectedNode?.hasAPI, registry, panelStateOpenCapabilities, selectedNodeFromTree]);

  // Auto-focus sur le libellé pour édition rapide
  useEffect(() => {
    if (!selectedNodeId) return;

    const timeoutId = window.setTimeout(() => {
      try {
        labelInputRef.current?.focus?.({ cursor: 'end' });
      } catch {
        // noop
      }
    }, 50);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [selectedNodeId]);

  // Suivi des changements d'état pour diagnostic, sans auto-ouverture
  useEffect(() => {
    prevCapsRef.current = { ...capsState };
  }, [capsState]);

  // Gestionnaire de changement de label
  const handleLabelChange = useCallback((value: string) => {
    setLabel(value);
    patchNode({ label: value });
  }, [patchNode]);

  // Gestionnaire de changement de description
  const handleDescriptionChange = useCallback((value: string) => {
    setDescription(value);
    patchNode({ description: value });
  }, [patchNode]);

  // Gestionnaire de changement de visibilité
  const handleVisibilityChange = useCallback((value: boolean) => {
    setIsVisible(value);
    patchNode({ isVisible: value });
  }, [patchNode]);

  // Gestionnaire de changement de required
  const handleRequiredChange = useCallback((value: boolean) => {
    setIsRequired(value);
    patchNode({ isRequired: value });
  }, [patchNode]);

  const handleMultipleChange = useCallback((value: boolean) => {
    setIsMultiple(value);
    patchNode({ isMultiple: value });
  }, [patchNode]);

  const handleTechnicianVisibleChange = useCallback((value: boolean) => {
    setTechnicianVisible(value);
    patchNode({ technicianVisible: value });
  }, [patchNode]);

  const handleFieldFullWidthChange = useCallback((value: string | null) => {
    setFieldFullWidth(value);
    patchNode({ field_full_width: value });
  }, [patchNode]);

  // Gestionnaire de changement de fieldType
  const handleFieldTypeChange = useCallback((value: string) => {
    setFieldType(value);
    // Fermer le panneau d'apparence quand on change de type
    setAppearanceOpen(false);
    
    // Appliquer l'apparence par défaut pour le nouveau type
    const defaultAppearance = TreeBranchLeafRegistry.getDefaultAppearanceConfig(value);
    const tblMapping = TreeBranchLeafRegistry.mapAppearanceConfigToTBL(defaultAppearance);
    
    // Pour multiselect, activer select_multiple automatiquement
    const selectMultiple = value === 'multiselect' ? true : value === 'select' ? false : undefined;
    
    patchNode({ 
      subType: value,
      appearanceConfig: defaultAppearance,
      ...tblMapping,
      ...(selectMultiple !== undefined ? { select_multiple: selectMultiple } : {})
    });
  }, [patchNode]);

  if (!selectedNode) {
    return (
      <Card>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Sélectionnez un nœud pour voir ses paramètres"
        />
      </Card>
    );
  }

  const isContainerNode = selectedNode.type === 'branch' || selectedNode.type === 'section';

  return (
    <Card
      title={
        <Space>
          <SettingOutlined />
          <span>Paramètres du nœud</span>
        </Space>
      }
      size="small"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Barre d'actions rapides - responsive */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Actions Références partagées - wrap sur mobile */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <Tooltip title="Appliquer les références partagées depuis le gabarit original sur cette copie (crée/associe les copies -1)">
              <Button
                size="small"
                onClick={async () => {
                  if (!selectedNode?.id) return;
                  try {
                    setApplyingSharedRefs(true);
                    await api.post(`/api/treebranchleaf/nodes/${selectedNode.id}/apply-shared-references-from-original`);
                    if (typeof refreshTree === 'function') await Promise.resolve(refreshTree());
                  } catch (e) {
                    console.error('❌ [Parameters] Erreur application références partagées:', e);
                  } finally {
                    setApplyingSharedRefs(false);
                  }
                }}
                loading={applyingSharedRefs}
                disabled={!selectedNode || props.readOnly}
                style={{ fontSize: 11 }}
              >
                📎 Appliquer réf.
              </Button>
            </Tooltip>

            <Popconfirm
              title="Délier et supprimer les références partagées ?"
              description="Les liens vers les références partagées seront supprimés dans cette sous-arborescence. Les copies -1 orphelines seront supprimées."
              okText="Oui, nettoyer"
              cancelText="Annuler"
              onConfirm={async () => {
                if (!selectedNode?.id) return;
                try {
                  setUnlinkingSharedRefs(true);
                  await api.post(`/api/treebranchleaf/nodes/${selectedNode.id}/unlink-shared-references`, { deleteOrphans: true });
                  if (typeof refreshTree === 'function') await Promise.resolve(refreshTree());
                } catch (e) {
                  console.error('❌ [Parameters] Erreur délier/suppression références partagées:', e);
                } finally {
                  setUnlinkingSharedRefs(false);
                }
              }}
              okButtonProps={{ danger: true }}
              disabled={!selectedNode || props.readOnly}
            >
              <Button danger size="small" loading={unlinkingSharedRefs} disabled={!selectedNode || props.readOnly} style={{ fontSize: 11 }}>
                🗑️ Suppr. réf.
              </Button>
            </Popconfirm>

            <Popconfirm
              title="Supprimer ce nœud ?"
              description={!!(selectedNode?.metadata as Record<string, unknown>)?.isProtected ? "Ce nœud est protégé. Désactivez d'abord le mode protégé." : "Cette action supprimera également ses enfants."}
              okText="Supprimer"
              cancelText="Annuler"
              okButtonProps={{ danger: true }}
              onConfirm={handleDeleteSelected}
              disabled={!selectedNode || props.readOnly || !!(selectedNode?.metadata as Record<string, unknown>)?.isProtected}
            >
              <Tooltip title={!!(selectedNode?.metadata as Record<string, unknown>)?.isProtected ? "Nœud protégé — suppression impossible" : undefined}>
                <Button danger size="small" icon={<DeleteOutlined />} disabled={!selectedNode || props.readOnly || !!(selectedNode?.metadata as Record<string, unknown>)?.isProtected} style={{ fontSize: 11 }}>
                  {!!(selectedNode?.metadata as Record<string, unknown>)?.isProtected ? '🔒 Protégé' : 'Supprimer nœud'}
                </Button>
              </Tooltip>
            </Popconfirm>
          </div>

          {/* Mode protégé */}
          {selectedNode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, padding: '6px 10px', background: !!(selectedNode.metadata as Record<string, unknown>)?.isProtected ? '#fff7ed' : 'transparent', borderRadius: 6, border: !!(selectedNode.metadata as Record<string, unknown>)?.isProtected ? '1px solid #fed7aa' : '1px solid transparent' }}>
              <Checkbox
                checked={!!(selectedNode.metadata as Record<string, unknown>)?.isProtected}
                onChange={(e) => {
                  const next: Record<string, unknown> = { ...(selectedNode?.metadata || {}) };
                  if (e.target.checked) {
                    next.isProtected = true;
                  } else {
                    delete next.isProtected;
                  }
                  patchNode({ metadata: next });
                }}
                disabled={props.readOnly}
              />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#ea580c' }}>🔒 Mode protégé</span>
              <span style={{ fontSize: 11, color: '#888' }}>Empêche la suppression de ce nœud</span>
            </div>
          )}
        </div>
        {/* Section Apparence */}
        <div>
          <h5 style={{ marginBottom: 12, fontSize: 14, fontWeight: 600, margin: 0 }}>
            <BgColorsOutlined style={{ marginRight: 8 }} />
            Apparence
          </h5>
          
          <Space direction="vertical" style={{ width: '100%' }}>
            {/* Libellé avec boutons de visibilité à droite */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <strong style={{ fontSize: 12 }}>Libellé</strong>
                  {selectedNode?.id && (
                    <Tooltip title="Cliquer pour copier l'ID">
                      <Tag
                        color="default"
                        style={{ fontSize: 10, cursor: 'pointer', margin: 0, lineHeight: '18px', padding: '0 4px' }}
                        onClick={() => {
                          navigator.clipboard.writeText(String(selectedNode.id));
                          import('antd').then(({ message }) => message.success('ID copié !'));
                        }}
                      >
                        ID: {selectedNode.id}
                      </Tag>
                    </Tooltip>
                  )}
                </div>
                <Input
                  ref={labelInputRef}
                  value={label}
                  onChange={(e) => handleLabelChange(e.target.value)}
                  placeholder="Libellé du champ"
                  disabled={props.readOnly}
                  size="small"
                />
              </div>
              
              {/* Boutons de visibilité à droite */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 20 }}>
                <Tooltip title="Visible">
                  <Button
                    type={isVisible ? "primary" : "default"}
                    size="small"
                    style={{ width: 24, height: 24, padding: 0 }}
                    onClick={() => handleVisibilityChange(!isVisible)}
                    disabled={props.readOnly}
                  >
                    👁
                  </Button>
                </Tooltip>
                
                <Tooltip title={isContainerNode ? "Requis (rend tous les sous-champs obligatoires)" : "Requis"}>
                  <Button
                    type={isRequired ? "primary" : "default"}
                    size="small"
                    style={{ width: 24, height: 24, padding: 0 }}
                    onClick={() => handleRequiredChange(!isRequired)}
                    disabled={props.readOnly}
                  >
                    *
                  </Button>
                </Tooltip>
                
                {/* Bouton Multiple pour branches SELECT (niveau 2+) */}
                {selectedNode?.type === 'branch' && selectedNode?.parentId !== null && (
                  <Tooltip title="Choix multiple">
                    <Button
                      type={isMultiple ? "primary" : "default"}
                      size="small"
                      style={{ width: 24, height: 24, padding: 0, fontSize: 10 }}
                      onClick={() => handleMultipleChange(!isMultiple)}
                      disabled={props.readOnly}
                    >
                      ✓
                    </Button>
                  </Tooltip>
                )}

                {/* Bouton Visible pour technicien (revue terrain) */}
                <Tooltip title={technicianVisible ? "Visible pour le technicien (actif)" : "Rendre visible pour le technicien"}>
                    <Button
                      type={technicianVisible ? "primary" : "default"}
                      size="small"
                      style={{ 
                        width: 24, height: 24, padding: 0, fontSize: 12,
                        ...(technicianVisible ? { backgroundColor: '#1890ff', borderColor: '#1890ff' } : {})
                      }}
                      onClick={() => handleTechnicianVisibleChange(!technicianVisible)}
                      disabled={props.readOnly}
                    >
                      🔧
                    </Button>
                </Tooltip>
              </div>
            </div>
            
            <div>
              <strong style={{ fontSize: 12 }}>Description</strong>
              <Input.TextArea
                value={description}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                placeholder="Description du champ"
                rows={2}
                disabled={props.readOnly}
              />
            </div>
            
            {/* Largeur du champ (nombre de colonnes occupées sur PC et Mobile) */}
            {!isContainerNode && (
              <div>
                <strong style={{ fontSize: 12 }}>↔️ Colonnes occupées</strong>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>🖥️ PC</div>
                    <Select
                      value={(() => { try { const p = fieldFullWidth ? JSON.parse(fieldFullWidth) : {}; return p.desktop || 1; } catch { return 1; } })()}
                      onChange={(v) => {
                        const current = (() => { try { return fieldFullWidth ? JSON.parse(fieldFullWidth) : {}; } catch { return {}; } })();
                        const next = { ...current, desktop: v };
                        if (next.desktop === 1 && (!next.mobile || next.mobile === 1)) {
                          handleFieldFullWidthChange(null);
                        } else {
                          handleFieldFullWidthChange(JSON.stringify(next));
                        }
                      }}
                      size="small"
                      style={{ width: '100%' }}
                      disabled={props.readOnly}
                      options={[
                        { value: 1, label: '1 col' },
                        { value: 2, label: '2 cols' },
                        { value: 3, label: '3 cols' },
                      ]}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>📱 Mobile</div>
                    <Select
                      value={(() => { const p = (() => { try { return fieldFullWidth ? JSON.parse(fieldFullWidth) : {}; } catch { return {}; } })(); return p.mobile || 1; })()}
                      onChange={(v) => {
                        const current = (() => { try { return fieldFullWidth ? JSON.parse(fieldFullWidth) : {}; } catch { return {}; } })();
                        const next = { ...current, mobile: v };
                        if ((!next.desktop || next.desktop === 1) && next.mobile === 1) {
                          handleFieldFullWidthChange(null);
                        } else {
                          handleFieldFullWidthChange(JSON.stringify(next));
                        }
                      }}
                      size="small"
                      style={{ width: '100%' }}
                      disabled={props.readOnly}
                      options={[
                        { value: 1, label: '1 col' },
                        { value: 2, label: '2 cols' },
                        { value: 3, label: '3 cols' },
                      ]}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Type de champ avec bouton Apparence à droite */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: 12 }}>Type de champ</strong>
                {isContainerNode ? (
                  <div style={{ 
                    padding: '4px 8px', 
                    backgroundColor: '#f0f0f0', 
                    border: '1px solid #d9d9d9', 
                    borderRadius: '4px', 
                    fontSize: '11px', 
                    color: '#666',
                    textAlign: 'center',
                    marginTop: '4px'
                  }}>
                    {selectedNode.type === 'branch'
                      ? '🌿 Branche (pas de champ)'
                      : selectedNode.type === 'section'
                        ? '📋 Section (pas de champ)'
                        : '➕ Bloc répétable (conteneur)'}
                    <div style={{ marginTop: 4, fontSize: 10, color: '#8c8c8c' }}>
                      Utilisez le bouton « Apparence » pour gérer les colonnes et le style du conteneur.
                    </div>
                  </div>
                ) : (
                  <Select
                    value={fieldType}
                    onChange={handleFieldTypeChange}
                    style={{ width: '100%' }}
                    disabled={props.readOnly}
                    size="small"
                    placeholder="Sélectionner un type de champ"
                  >
                    <Select.Option value="text">📝 Texte (TEXT)</Select.Option>
                    <Select.Option value="number">🔢 Nombre (NUMBER)</Select.Option>
                    <Select.Option value="boolean">✅ Booléen (BOOL)</Select.Option>
                    <Select.Option value="select">📋 Sélection (SELECT)</Select.Option>
                    <Select.Option value="multiselect">📋✅ Sélection multiple (MULTISELECT)</Select.Option>
                    <Select.Option value="date">📅 Date/Heure (DATE)</Select.Option>
                    <Select.Option value="image">🖼️ Image (IMAGE)</Select.Option>
                    <Select.Option value="photo">📸 Photo (PHOTO)</Select.Option>
                    <Select.Option value="file">📎 Fichier (FILE)</Select.Option>
                    <Select.Option value="display">💡 Affichage (DISPLAY)</Select.Option>
                  </Select>
                )}
              </div>
              
              {/* Bouton Apparence à droite */}
              <div style={{ marginTop: 20 }}>
                <Tooltip title={
                  isContainerNode
                    ? 'Configurer l\'apparence (colonnes, variantes, largeur...) de ce conteneur'
                    : 'Apparence du champ'
                }>
                  <Button
                    type={appearanceOpen ? "primary" : "default"}
                    size="small"
                    icon={<BgColorsOutlined />}
                    style={{ width: 32, height: 24 }}
                    disabled={props.readOnly || !(fieldType || selectedNode?.type)}
                    onClick={() => {
                      setAppearanceOpen(!appearanceOpen);
                    }}
                  />
                </Tooltip>
              </div>
            </div>
          </Space>
        </div>

        {/* 📋 Éditeur d'options SELECT / MULTISELECT */}
        {!isContainerNode && (fieldType === 'select' || fieldType === 'multiselect') && (
          <div style={{ marginTop: 12 }}>
            <strong style={{ fontSize: 12 }}>
              {fieldType === 'multiselect' ? '📋✅ Options (sélection multiple)' : '📋 Options de sélection'}
            </strong>
            {/* Groupe actif pour les nouvelles options */}
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 11, color: '#666', whiteSpace: 'nowrap' }}>Groupe :</span>
              <Input
                size="small"
                value={newOptionGroup}
                placeholder="(sans groupe)"
                style={{ flex: 1 }}
                disabled={props.readOnly}
                onChange={(e) => setNewOptionGroup(e.target.value)}
              />
            </div>
            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(() => {
                // Regrouper les options par groupe pour l'affichage
                const groups: Array<{ group: string; options: Array<{ label: string; value: string; group?: string; origIdx: number }> }> = [];
                const groupMap = new Map<string, typeof groups[0]>();
                selectOptions.forEach((opt, idx) => {
                  const g = opt.group || '';
                  if (!groupMap.has(g)) {
                    const entry = { group: g, options: [] as any[] };
                    groups.push(entry);
                    groupMap.set(g, entry);
                  }
                  groupMap.get(g)!.options.push({ ...opt, origIdx: idx });
                });
                return groups.map((grp) => (
                  <div key={grp.group || '__ungrouped__'}>
                    {grp.group && (
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#1677ff', marginTop: 4, marginBottom: 2, borderBottom: '1px solid #e8e8e8', paddingBottom: 2 }}>
                        {grp.group}
                      </div>
                    )}
                    {grp.options.map(({ label, origIdx, group }) => (
                      <div key={origIdx} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Input
                          size="small"
                          value={label}
                          placeholder="Label de l'option"
                          style={{ flex: 1 }}
                          disabled={props.readOnly}
                          onChange={(e) => {
                            const updated = [...selectOptions];
                            const newLabel = e.target.value;
                            updated[origIdx] = { label: newLabel, value: newLabel.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_\u00e0-\u00ff]/g, '') || `opt_${origIdx}`, ...(group ? { group } : {}) };
                            setSelectOptions(updated);
                          }}
                          onBlur={() => patchNode({ select_options: selectOptions })}
                          onPressEnter={() => patchNode({ select_options: selectOptions })}
                        />
                        <Button
                          size="small"
                          type="text"
                          danger
                          icon={<MinusCircleOutlined />}
                          disabled={props.readOnly}
                          onClick={() => {
                            const updated = selectOptions.filter((_, i) => i !== origIdx);
                            setSelectOptions(updated);
                            patchNode({ select_options: updated });
                          }}
                          style={{ width: 24, height: 24, padding: 0 }}
                        />
                      </div>
                    ))}
                  </div>
                ));
              })()}
              {/* Ajouter une nouvelle option */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <Input
                  size="small"
                  value={newOptionLabel}
                  placeholder="Nouvelle option..."
                  style={{ flex: 1 }}
                  disabled={props.readOnly}
                  onChange={(e) => setNewOptionLabel(e.target.value)}
                  onPressEnter={() => {
                    if (!newOptionLabel.trim()) return;
                    const newOpt: { label: string; value: string; group?: string } = { 
                      label: newOptionLabel.trim(), 
                      value: newOptionLabel.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_\u00e0-\u00ff]/g, '') || `opt_${selectOptions.length}` 
                    };
                    if (newOptionGroup.trim()) newOpt.group = newOptionGroup.trim();
                    const updated = [...selectOptions, newOpt];
                    setSelectOptions(updated);
                    setNewOptionLabel('');
                    patchNode({ select_options: updated });
                  }}
                />
                <Button
                  size="small"
                  type="primary"
                  icon={<PlusOutlined />}
                  disabled={props.readOnly || !newOptionLabel.trim()}
                  onClick={() => {
                    if (!newOptionLabel.trim()) return;
                    const newOpt: { label: string; value: string; group?: string } = { 
                      label: newOptionLabel.trim(), 
                      value: newOptionLabel.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_\u00e0-\u00ff]/g, '') || `opt_${selectOptions.length}` 
                    };
                    if (newOptionGroup.trim()) newOpt.group = newOptionGroup.trim();
                    const updated = [...selectOptions, newOpt];
                    setSelectOptions(updated);
                    setNewOptionLabel('');
                    patchNode({ select_options: updated });
                  }}
                  style={{ width: 24, height: 24, padding: 0 }}
                />
              </div>
              {selectOptions.length === 0 && (
                <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                  Ajoutez des options pour que ce champ s'affiche comme un menu déroulant.
                  Utilisez le champ "Groupe" pour organiser visuellement les options.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section Références partagées - Affichée uniquement pour les nœuds réutilisables */}
        {!isContainerNode && fieldType && (
          <div style={{ marginTop: 12 }}>
            <SharedReferencePanel
              nodeId={selectedNode.id}
              treeId={tree?.id}
              value={{
                isSharedReference: selectedNode.isSharedReference ?? false,
                sharedReferenceId: selectedNode.sharedReferenceId ?? null,
                sharedReferenceName: selectedNode.sharedReferenceName ?? null,
                sharedReferenceDescription: selectedNode.sharedReferenceDescription ?? null,
                sharedReferenceIds: selectedNode.sharedReferenceIds ?? []
              }}
              onChange={(data) => {
                patchNode(data);
              }}
              onNodeUpdate={async (updates) => {
                console.log('🔗 [Parameters] onNodeUpdate appelé:', updates);
                patchNode(updates);
              }}
              readOnly={props.readOnly}
            />
          </div>
        )}

        {/* Sous-onglet d'affectation pour les champs (si le parent de la branche contient des subTabs) */}
        {!isContainerNode && selectedNode && (
          (() => {
            // Trouver le parent branch de ce champ en naviguant via parentId sur le map
            const findParentBranch = (startId?: string | null): TreeBranchLeafNode | null => {
              if (!startId) return null;
              let currentId: string | undefined | null = startId;
              while (currentId) {
                const node = nodesMap.get(currentId);
                if (!node) break;
                if (node.type === 'branch') return node;
                currentId = node.parentId as string | undefined || undefined;
              }
              return null;
            };

            // ✅ FIX: Commencer la recherche depuis le parentId du nœud sélectionné
            const parentBranch = findParentBranch(selectedNode.parentId as string | undefined);
            const parentSubTabs = parentBranch ? (Array.isArray(parentBranch.metadata?.subTabs) ? parentBranch.metadata?.subTabs as string[] : []) : [];

            return (
              <div style={{ marginTop: 12 }}>
                <strong style={{ fontSize: 12 }}>Affectation Sous-onglet</strong>
                {(!parentSubTabs || parentSubTabs.length === 0) ? (
                  <div style={{ marginTop: 6, padding: '8px 12px', backgroundColor: '#fafafa', border: '1px solid #e8e8e8', borderRadius: 4, fontSize: 12, color: '#999' }}>
                    ℹ️ Créer d'abord des sous-onglets sur la branche parent "<strong>{parentBranch?.label || 'parent'}</strong>"
                  </div>
                ) : (
                  <div style={{ marginTop: 6 }}>
                    <Select
                      mode="multiple"
                      size="small"
                      value={localSubTabSelection}
                      key={`subtab-select-${selectedNode?.id}`}
                      onChange={(values) => {
                        const rawValues = Array.isArray(values) ? values : EMPTY_SUBTAB_LIST;
                        const nextValues = normalizeSubTabValue(rawValues);
                        setLocalSubTabSelection(nextValues);
                        const nextMeta = { ...(selectedNode?.metadata || {}) } as Record<string, unknown>;
                        if (!nextValues || nextValues.length === 0) {
                          nextMeta.subTab = null;
                        } else if (nextValues.length === 1) {
                          // Single selection: store as string for backward compatibility
                          nextMeta.subTab = nextValues[0];
                        } else {
                          // Multiple selections: store as array
                          nextMeta.subTab = nextValues;
                        }
                        patchNode({ metadata: nextMeta });
                        emitMetadataUpdate(nextMeta);
                      }}
                      style={{ width: '100%' }}
                      placeholder="Sélectionnez un ou plusieurs sous-onglets"
                      allowClear
                      maxTagCount="responsive"
                    >
                      {parentSubTabs.map(st => <Select.Option key={st} value={st}>{st}</Select.Option>)}
                    </Select>
                  </div>
                )}
              </div>
            );
          })()
        )}

        {/* Section Champs déclencheurs pour les champs d'affichage */}
        {!isContainerNode && (fieldType === 'display' || fieldType === 'DISPLAY') && (
          <div style={{ marginTop: 12 }}>
            <strong style={{ fontSize: 12 }}>⚡ Champs déclencheurs (recalcul)</strong>
            <div style={{ marginTop: 6, marginBottom: 6, fontSize: 11, color: '#666', lineHeight: 1.4 }}>
              Sélectionnez les champs qui, lorsqu'ils changent, déclencheront le recalcul de ce champ d'affichage.
              Si aucun champ n'est sélectionné, le calcul se fera à chaque modification (comportement par défaut).
            </div>
            
            {/* Liste des champs déclencheurs sélectionnés */}
            <div style={{ marginBottom: 8 }}>
              {(() => {
                console.log('🔍 [TriggerField] État:', {
                  isLoading: isLoadingTriggerIds,
                  count: localTriggerNodeIds.length,
                  ids: localTriggerNodeIds
                });
                
                if (isLoadingTriggerIds) {
                  console.log('⏳ [TriggerField] Chargement en cours...');
                  return (
                    <div style={{ padding: '8px 12px', backgroundColor: '#f0f5ff', border: '1px solid #d6e4ff', borderRadius: 4, fontSize: 11, color: '#1890ff' }}>
                      Chargement...
                    </div>
                  );
                }
                
                if (localTriggerNodeIds.length === 0) {
                  console.log('⚠️ [TriggerField] Aucun champ sélectionné - affichage du message par défaut');
                  return (
                    <div style={{ padding: '8px 12px', backgroundColor: '#fafafa', border: '1px dashed #d9d9d9', borderRadius: 4, fontSize: 11, color: '#999' }}>
                      Aucun champ sélectionné - Recalcul à chaque modification
                    </div>
                  );
                }
                
                console.log('✅ [TriggerField] Affichage de', localTriggerNodeIds.length, 'tag(s)');
                return (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {localTriggerNodeIds.map(idOrRef => {
                      console.log('🏷️ [TriggerField] Affichage tag pour:', idOrRef);
                      
                      // Si ça commence par @value., extraire le nodeId
                      let displayLabel = idOrRef;
                      let isTreeNode = false;
                      
                      if (idOrRef.startsWith('@value.')) {
                        const nodeId = idOrRef.replace('@value.', '');
                        const node = nodesMap.get(nodeId);
                        displayLabel = node?.label || nodeId;
                        isTreeNode = true;
                      } else if (idOrRef.startsWith('{') && idOrRef.endsWith('}')) {
                        displayLabel = idOrRef;
                        isTreeNode = false;
                      } else {
                        // C'est juste un nodeId direct
                        const node = nodesMap.get(idOrRef);
                        displayLabel = node?.label || idOrRef;
                        isTreeNode = !!node;
                      }
                      
                      return (
                        <Tag
                          key={idOrRef}
                          closable
                          onClose={() => {
                            console.log('🗑️ [TriggerField] Suppression tag:', idOrRef);
                            const newIds = localTriggerNodeIds.filter(id => id !== idOrRef);
                            setLocalTriggerNodeIds(newIds);
                            
                            const nextMeta = { ...(selectedNode?.metadata || {}) } as Record<string, unknown>;
                            if (newIds.length === 0) {
                              delete nextMeta.triggerNodeIds;
                            } else {
                              nextMeta.triggerNodeIds = newIds;
                            }
                            // 🔥 FIX: Sauvegarder immédiatement (pas de debounce)
                            if (selectedNodeId) {
                              onNodeUpdateRef.current({ metadata: nextMeta, id: selectedNodeId })
                                .then((resp: any) => {
                                  console.log('✅ [TriggerField] triggerNodeIds supprimé et sauvegardé:', resp?.metadata?.triggerNodeIds);
                                })
                                .catch((err: any) => {
                                  console.error('❌ [TriggerField] Erreur sauvegarde après suppression:', err);
                                });
                            }
                            emitMetadataUpdate(nextMeta);
                          }}
                          color={isTreeNode ? "blue" : "purple"}
                        >
                          {displayLabel}
                        </Tag>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
            
            {/* Bouton pour ouvrir le sélecteur */}
            <Button
              icon={<NodeIndexOutlined />}
              onClick={() => setTriggerNodeSelectorOpen(true)}
              block
              size="small"
            >
              Sélectionner des champs déclencheurs
            </Button>
          </div>
        )}

        {/* Section Sous-onglets (visuel) */}
        {selectedNode?.type === 'branch' && (
          <div style={{ marginTop: 12 }}>
            <h5 style={{ marginBottom: 8, fontSize: 14, fontWeight: 600 }}>Sous-onglets (visuel)</h5>
            <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
              {/* Contrôle: sélectionner le sous-onglet du noeud (branche) */}
              <div>
                <strong style={{ fontSize: 12 }}>Affectation Sous-onglet (branche)</strong>
                <div style={{ marginTop: 6 }}>
                  <Select
                    mode="multiple"
                    size="small"
                    value={localSubTabSelection}
                    onChange={(values) => {
                      const rawValues = Array.isArray(values) ? values : EMPTY_SUBTAB_LIST;
                      const nextValues = normalizeSubTabValue(rawValues);
                      setLocalSubTabSelection(nextValues);
                      const nextMeta = { ...(selectedNode?.metadata || {}) } as Record<string, unknown>;
                      if (!nextValues || nextValues.length === 0) {
                        nextMeta.subTab = null;
                      } else if (nextValues.length === 1) {
                        nextMeta.subTab = nextValues[0];
                      } else {
                        nextMeta.subTab = nextValues;
                      }
                      patchNode({ metadata: nextMeta });
                      emitMetadataUpdate(nextMeta);
                      const cascadeValue = nextValues && nextValues.length > 0 ? nextValues : null;
                      void cascadeSubTabAssignments(cascadeValue);
                    }}
                    placeholder="Sélectionnez un ou plusieurs sous-onglets"
                    allowClear
                    maxTagCount="responsive"
                    style={{ width: '100%' }}
                  >
                    {branchSubTabs.map(st => <Select.Option key={st} value={st}>{st}</Select.Option>)}
                  </Select>
                </div>
                <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>
                  Toute modification s'applique automatiquement aux enfants (champs et branches sans sous-onglets dédiés).
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#666' }}>Créer des sous-onglets pour organiser visuellement les champs (Affectation via le champ : sélectionnez le champ puis éditez 'Affectation Sous-onglet' dans ses paramètres).</div>
              <SubTabsEditor
                value={Array.isArray(selectedNode?.metadata?.subTabs) ? (selectedNode?.metadata?.subTabs as string[]) : EMPTY_SUBTAB_LIST}
                onChange={(next) => {
                  console.log('🎯 [SubTabsEditor onChange] Avant patchNode:', { next, currentNode: selectedNode?.id, currentMetadata: selectedNode?.metadata });
                  const nextMetadata = { ...(selectedNode?.metadata || {}), subTabs: next } as Record<string, unknown>;
                  console.log('🎯 [SubTabsEditor onChange] Métadonnées à envoyer:', nextMetadata);
                  patchNode({ metadata: nextMetadata });
                  console.log('🎯 [SubTabsEditor onChange] Après patchNode appelé');
                  emitMetadataUpdate(nextMetadata);
                  // Émettre un événement pour que TBL refetch si besoin
                  try {
                    window.dispatchEvent(new CustomEvent('tbl-subtabs-updated', { detail: { nodeId: selectedNode?.id, treeId: selectedNode?.tree_id } }));
                    console.log('🔔 [Parameters] Événement tbl-subtabs-updated émis');
                  } catch { /* noop */ }
                }}
              />
              <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
                Astuce: si tous les champs de cette branche sont affectés à un sous-onglet, le sous-onglet "Général" disparaîtra automatiquement.
              </div>
            </div>
            {/* Overview: show descendant fields and their subTab assignments */}
            <div style={{ marginTop: 12 }}>
              <h5 style={{ marginBottom: 8, fontSize: 14, fontWeight: 600 }}>Aperçu : Champs et Sous-onglets</h5>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>Sélectionnez un champ pour l'éditer — son affectation au sous-onglet s'affiche ici.</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {/* Bulk assign control */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <Select size="small" style={{ minWidth: 160 }} placeholder="Affecter tous les champs (via champ)" value={undefined} onChange={async (val) => {
                    if (!val) return;
                    try {
                      const nextMetaBranch = { ...(selectedNode?.metadata || {}), subTab: val } as Record<string, unknown>;
                      patchNode({ metadata: nextMetaBranch });
                      emitMetadataUpdate(nextMetaBranch);
                      await cascadeSubTabAssignments([val]);
                      console.log('✅ [Parameters] Affectation bulk appliquée:', val);
                    } catch (e) {
                      console.error('❌ [Parameters] Erreur lors de l\'affectation bulk:', e);
                    }
                  }}>
                    {((Array.isArray(selectedNode?.metadata?.subTabs) ? selectedNode?.metadata?.subTabs as string[] : [])).map(st => (
                      <Select.Option key={st} value={st}>{st}</Select.Option>
                    ))}
                  </Select>
                  <div style={{ fontSize: 12, color: '#666' }}>Affecter ce sous-onglet à tous les champs de la branche</div>
                </div>
                {(() => {
                  const descendants: TreeBranchLeafNode[] = [];
                  const stack: TreeBranchLeafNode[] = [selectedNode];
                  while (stack.length) {
                    const n = stack.pop()!;
                    if (n.children && n.children.length) stack.push(...n.children);
                    if (n.type && n.type.startsWith('leaf')) descendants.push(n);
                  }
                  if (descendants.length === 0) return <div style={{ fontSize: 12, color: '#999' }}>Aucun champ dans cette branche.</div>;
                  return descendants.map((d) => {
                    const meta = (d.metadata || {}) as any;
                    const assigned = meta?.subTab || 'Général';
                    return (
                      <div key={d.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 6, border: '1px solid #eee', borderRadius: 6 }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ fontSize: 12, flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label || d.id}</div>
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
                            {(meta?.subTab && typeof meta?.subTab === 'string') ? (
                              <Tag color="blue" style={{ margin: 0, fontSize: 10 }}>{meta.subTab}</Tag>
                            ) : (
                              <Tag color="default" style={{ margin: 0, fontSize: 10 }}>Aucun</Tag>
                            )}
                            <Button size="small" onClick={() => { if (onSelectNodeId) onSelectNodeId(d.id); }} style={{ fontSize: 10 }}>Éditer</Button>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Option pour rendre une section affichage toujours visible dans tous les sous-onglets */}
        {selectedNode?.type === 'section' && (
          <div style={{ marginTop: 12 }}>
            <strong style={{ fontSize: 12 }}>Affichage</strong>
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 12, color: '#666' }}>Toujours visible dans les sous-onglets</div>
                <Checkbox
                checked={!!(selectedNode?.metadata as any)?.displayAlways}
                onChange={(e) => {
                  const next: Record<string, unknown> = { ...(selectedNode?.metadata || {}) };
                  if (e.target.checked) next.displayAlways = true; else delete next.displayAlways;
                  console.log('🔔 [Parameters] displayAlways toggled:', e.target.checked, 'for node', selectedNode?.id);
                  // Save change immediately (bypass debounce for displayAlways since it affects layout)
                  (async () => {
                    if (!selectedNodeId) return;
                    
                    try {
                      // Build the updated node with new metadata
                      const updatedNode = {
                        ...(selectedNode || {}),
                        metadata: { ...(selectedNode?.metadata || {}), ...next }
                      };
                      
                      console.log('🔔 [Parameters] Emission tbl-node-updated IMMEDIATELY (optimistic) for displayAlways:', { 
                        id: updatedNode.id, 
                        displayAlways: updatedNode.metadata?.displayAlways,
                        treeId: tree?.id
                      });
                      
                      // Store for debugging
                      window.__tblNodeUpdated = { node: updatedNode, treeId: tree?.id, timestamp: Date.now() };
                      
                      // 🔥 DIRECT CALLBACK first (most reliable)
                      if (onNodeMetadataUpdated) {
                        console.error('📞 [Parameters] Calling onNodeMetadataUpdated callback directly for:', updatedNode.id);
                        onNodeMetadataUpdated(updatedNode as any);
                        console.error('✅ [Parameters] onNodeMetadataUpdated callback completed');
                      } else {
                        console.error('❌ [Parameters] onNodeMetadataUpdated callback NOT PROVIDED!');
                      }
                      
                      // Then emit event as fallback
                      window.dispatchEvent(new CustomEvent('tbl-node-updated', { 
                        detail: { node: updatedNode, treeId: tree?.id } 
                      }));
                      
                      // 🔥 FORCE RETRANSFORMATION: Signal any listening component to retransform
                      // This works even if the hook isn't mounted yet
                      console.error('🔥 [Parameters] DISPATCHING tbl-force-retransform event for:', updatedNode.id);
                      
                      // Store update in global state that TBL can access
                      if (typeof window !== 'undefined') {
                        (window as any).__tblForceRetransformSignal = {
                          nodeId: updatedNode.id,
                          fieldName: 'displayAlways',
                          timestamp: Date.now()
                        };
                        console.error('✅ [Parameters] Stored force-retransform signal in window.__tblForceRetransformSignal');
                      }
                      
                      // Also try window event as backup
                      window.dispatchEvent(new CustomEvent('tbl-force-retransform', {
                        detail: { nodeId: updatedNode.id, fieldName: 'displayAlways', forceRemote: true }
                      }));
                      console.error('✅ [Parameters] tbl-force-retransform event dispatched');
                      
                      // THEN save to server asynchronously (don't wait for response)
                      console.log('🔄 [Parameters] Calling onNodeUpdateRef for server persistence');
                      onNodeUpdateRef.current?.({ metadata: next, id: selectedNodeId });
                      
                      console.log('✅ [Parameters] displayAlways update emitted and queued');
                    } catch (e) {
                      console.warn('[Parameters] Failed to update displayAlways:', e);
                    }
                  })();
                }}
              />
            </div>
          </div>
        )}

        {/* Panneau d'apparence spécifique au type de champ */}
        {appearanceOpen && (fieldType || selectedNode?.type) && (
          <div style={{ marginTop: 12, border: '1px solid #e8e8e8', borderRadius: 6, backgroundColor: '#fbfbfb' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #e8e8e8', backgroundColor: '#f7f7f7' }}>
              <strong style={{ fontSize: 12 }}>
                <BgColorsOutlined style={{ marginRight: 6, fontSize: 11 }} />
                Configuration Apparence ({appearancePanelKey})
              </strong>
              <Button 
                type="text" 
                size="small" 
                onClick={() => setAppearanceOpen(false)}
                style={{ fontSize: 12, padding: 0, width: 18, height: 18, lineHeight: '18px' }}
              >
                ×
              </Button>
            </div>
            
            <div style={{ padding: 8 }}>
              {LazyAppearancePanel ? (
                <React.Suspense fallback={<div style={{ padding: 8, fontSize: 11, textAlign: 'center' }}>Chargement...</div>}>
                  <div 
                    style={{ 
                      fontSize: '11px',
                      // Compactage des éléments internes
                      '--ant-typography-margin-bottom': '4px',
                      '--ant-form-item-margin-bottom': '6px'
                    } as React.CSSProperties & Record<string, string>}
                  >
                    <LazyAppearancePanel 
                      value={hydratedAppearanceConfig}
                      onChange={(config: Record<string, unknown>) => {
                        console.log('🎨 [Apparence] Changement détecté:', config);
                        
                        // Mapper vers les champs TBL
                        const tblMapping = TreeBranchLeafRegistry.mapAppearanceConfigToTBL(config);
                        console.log('🎨 [Apparence] Mapping TBL généré:', tblMapping);
                        
                        // ✅ EXTRAIRE LES PARAMÈTRES REPEATER POUR LES COLONNES DÉDIÉES
                        // RepeaterPanel envoie les valeurs DIRECTEMENT à la racine de config
                        // ⚠️ IMPORTANT : Utiliser l'état local pour les valeurs repeater, car `config` peut être partiel
                        const repeaterColumns = {
                          repeater_addButtonLabel: (config.addButtonLabel && String(config.addButtonLabel).trim()) || null,
                          repeater_buttonSize: config.buttonSize || 'middle',
                          repeater_buttonWidth: config.buttonWidth || 'auto',
                          repeater_iconOnly: config.iconOnly === true,
                          repeater_minItems: config.minItems != null ? Number(config.minItems) : repeaterMinItems ?? 0,
                          repeater_maxItems: config.maxItems != null ? Number(config.maxItems) : repeaterMaxItems ?? null,
                        };
                        console.warn('🔁 [Apparence] Colonnes repeater extraites:', repeaterColumns);
                        
                        // ✅ SAUVEGARDE AVEC COLONNES REPEATER
                        const payload = { 
                          appearanceConfig: config,
                          ...tblMapping,
                          ...repeaterColumns
                        };
                        console.warn('💾 [Apparence] PAYLOAD COMPLET ENVOYÉ:', payload);
                        
                        patchNode(payload);
                      }}
                      readOnly={props.readOnly}
                    />
                  </div>
                </React.Suspense>
              ) : (
                <div style={{ padding: 8, fontSize: 11, color: '#999', textAlign: 'center' }}>
                  Panneau d'apparence pour "{appearancePanelKey}" en cours de développement...
                </div>
              )}
            </div>
          </div>
        )}

        {/* 🔵 SECTION CHAMPS À RÉPÉTER - Spécifique au repeater */}
        {selectedNode?.type === 'leaf_repeater' && (
          <div>
            <h5 style={{ marginBottom: 12, fontSize: 14, fontWeight: 600, margin: 0 }}>
              🔁 Champs à répéter
            </h5>
            
            {/* 🔥 FONCTION DE NETTOYAGE ULTRA-STRICTE */}
            {(() => {
              // Vérifier si un nœud a un repeater imbriqué
              const hasNestedRepeater = (nodeId: string): boolean => {
                const findNode = (list: TreeBranchLeafNode[] | undefined): TreeBranchLeafNode | null => {
                  if (!list) return null;
                  for (const n of list) {
                    if (n.id === nodeId) return n;
                    if (n.children && n.children.length > 0) {
                      const found = findNode(n.children);
                      if (found) return found;
                    }
                  }
                  return null;
                };
                
                const node = findNode(nodes);
                if (!node) return false;
                
                const checkHasRepeater = (n: TreeBranchLeafNode): boolean => {
                  if (n.type === 'leaf_repeater') return true;
                  if (!n.children || n.children.length === 0) return false;
                  return n.children.some(child => checkHasRepeater(child));
                };
                
                return checkHasRepeater(node);
              };

              // Nettoyer l'état si des pollutions sont détectées
              const cleanedIds = repeaterTemplateIds.filter(id => !hasNestedRepeater(id));
              const polluted = repeaterTemplateIds.filter(id => hasNestedRepeater(id));
              
              if (polluted.length > 0) {
                console.error(`🚨🚨🚨 [REPEATER SECTION] POLLUTION AU RENDU: ${polluted.length} champ(s) imbriqué(s)!`, polluted);
                polluted.forEach(id => {
                  const node = (function findNode(list?: TreeBranchLeafNode[]): TreeBranchLeafNode | undefined {
                    if (!list) return undefined;
                    for (const n of list) {
                      if (n.id === id) return n;
                      const found = findNode(n.children);
                      if (found) return found;
                    }
                    return undefined;
                  })(nodes);
                  console.error(`   🚫 REJET DÉFINITIF: "${node?.label}" (${id})`);
                });
                
                // AUTO-CORRECTION: Nettoyer l'état si pollution détectée
                if (cleanedIds.length !== repeaterTemplateIds.length) {
                  console.warn(`[AUTO-CORRECT] Nettoyage de l'état: ${repeaterTemplateIds.length} -> ${cleanedIds.length}`);
                  setRepeaterTemplateIds(cleanedIds);
                  // Aussi nettoyer en base
                  commitRepeaterMetadata({ 
                    templateNodeIds: cleanedIds,
                    templateNodeLabels: {}  // Vider les labels polluées
                  });
                }
              }
              
              return null;
            })()}
            
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <Alert
                type={repeaterTemplateIds.length === 0 ? 'warning' : 'info'}
                showIcon
                message={
                  repeaterTemplateIds.length === 0
                    ? 'Sélectionnez des champs existants dans l\'arbre pour qu\'ils soient répétables.'
                    : 'Les champs sélectionnés seront dupliqués à chaque clic sur le bouton "Ajouter".'
                }
              />

              <div>
                <strong style={{ fontSize: 12 }}>Champs à répéter</strong>
                
                <Select
                  mode="multiple"
                  size="small"
                  value={repeaterTemplateIds.filter(id => {
                    // 🔥 FILTRE ANTI-POLLUTION: Ne JAMAIS afficher les champs imbriqués
                    const findNode = (list: TreeBranchLeafNode[] | undefined): TreeBranchLeafNode | null => {
                      if (!list) return null;
                      for (const n of list) {
                        if (n.id === id) return n;
                        if (n.children && n.children.length > 0) {
                          const found = findNode(n.children);
                          if (found) return found;
                        }
                      }
                      return null;
                    };
                    
                    const node = findNode(nodes);
                    if (!node) return false;
                    
                    const checkHasRepeater = (n: TreeBranchLeafNode): boolean => {
                      if (n.type === 'leaf_repeater') return true;
                      if (!n.children || n.children.length === 0) return false;
                      return n.children.some(child => checkHasRepeater(child));
                    };
                    
                    const isNested = checkHasRepeater(node);
                    if (isNested) {
                      console.error(`[Select Render] 🚫 Filtre anti-pollution: ${node.label} (${id}) est un champ imbriqué - REJET`);
                    }
                    return !isNested;
                  })}
                  style={{ width: '100%', marginTop: 4 }}
                  placeholder="Sélectionnez les champs gabarit"
                  disabled={props.readOnly}
                  onChange={async (values) => {
                    console.log('🎯 [Select onChange] Valeurs sélectionnées:', values);
                    const nextIds = values as string[];
                    const prevIds = repeaterTemplateIds;
                    setRepeaterTemplateIds(nextIds);
                    
                    skipNextHydrationRef.current = true;
                    if (hydrationTimeoutRef.current) window.clearTimeout(hydrationTimeoutRef.current);
                    hydrationTimeoutRef.current = window.setTimeout(() => {
                      skipNextHydrationRef.current = false;
                      console.log('✅ [Parameters] Hydratation réactivée');
                    }, 1000);
                    
                    // Construire un map des labels pour chaque template node
                    const templateNodeLabels: Record<string, string> = {};
                    const selectedIds = nextIds;
                    
                    console.log('🏷️ [Parameters] onChange appelé - construction des labels pour:', selectedIds);
                    console.log('🏷️ [Parameters] Nodes disponibles:', nodes?.length || 0);
                    
                    selectedIds.forEach(nodeId => {
                      // Trouver le nœud dans l'arbre pour récupérer son chemin complet
                      const findNodePath = (list: TreeBranchLeafNode[] | undefined, targetId: string, trail: string[]): string[] | null => {
                        if (!list) return null;
                        for (const child of list) {
                          const nextTrail = [...trail, child.label || child.id];
                          if (child.id === targetId) {
                            return nextTrail;
                          }
                          if (child.children && child.children.length > 0) {
                            const found = findNodePath(child.children, targetId, nextTrail);
                            if (found) return found;
                          }
                        }
                        return null;
                      };
                      
                      const path = findNodePath(nodes, nodeId, []);
                      console.log(`🏷️ [Parameters] Node ${nodeId} -> path trouvé:`, path);
                      if (path) {
                        templateNodeLabels[nodeId] = path.join(' / ');
                      }
                    });
                    
                    console.log('🏷️ [Parameters] Template node labels FINAL:', templateNodeLabels);
                    console.log('🏁 [onChange] Prêt à appeler commitRepeaterMetadata:', {
                      'selectedIds (passé en param)': selectedIds,
                      'templateNodeLabels': templateNodeLabels,
                      'repeaterTemplateIds (state actuel - STALE !)': repeaterTemplateIds,
                      '⚠️': 'repeaterTemplateIds peut être ancien car setState est async'
                    });
                    
                    commitRepeaterMetadata({ 
                      templateNodeIds: selectedIds,
                      templateNodeLabels
                    });
                    
                    console.log('🎯 [onChange] ========== FIN CHANGEMENT TEMPLATE ==========');
                  }}
                  allowClear
                >
                  {(() => {
                    // Autoriser la sélection de branches/sections entières comme gabarits
                    // ✅ IMPORTANT : Exclure les nœuds avec des repeaters imbriqués pour éviter la pollution
                    const allowedTypes: NodeTypeKey[] = ['branch', 'section', 'leaf_field', 'leaf_option', 'leaf_option_field'];
                    const options: { node: TreeBranchLeafNode; path: string[] }[] = [];

                    // Fonction pour vérifier si un nœud contient un repeater descendant
                    const hasNestedRepeater = (node: TreeBranchLeafNode): boolean => {
                      if (node.type === 'leaf_repeater') return true;
                      if (!node.children || node.children.length === 0) return false;
                      return node.children.some(child => hasNestedRepeater(child));
                    };

                    const visit = (list: TreeBranchLeafNode[] | undefined, trail: string[]) => {
                      if (!list) return;
                      list.forEach(child => {
                        const nextTrail = [...trail, child.label || child.id];
                        if (child.id !== selectedNode?.id) {
                          options.push({ node: child, path: nextTrail });
                        }
                        if (child.children && child.children.length > 0) {
                          visit(child.children, nextTrail);
                        }
                      });
                    };

                    visit(nodes, []);

                    return options
                      .filter(opt => {
                        // 🔥 Filtrer : nœud doit être du bon type ET ne pas avoir de repeater imbriqué
                        return allowedTypes.includes(opt.node.type as NodeTypeKey) && !hasNestedRepeater(opt.node);
                      })
                      .map(opt => {
                        const nodeType = TreeBranchLeafRegistry.getNodeType(opt.node.type);
                        const emoji = nodeType?.emoji || '•';
                        return (
                          <Select.Option key={opt.node.id} value={opt.node.id}>
                            <span style={{ marginRight: 6 }}>{emoji}</span>
                            <span>{opt.path.join(' / ')}</span>
                          </Select.Option>
                        );
                      });
                  })()}
                </Select>
              </div>

              {/* 🗂️ Liste des copies par template sélectionné avec action supprimer */}
              {repeaterTemplateIds.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <strong style={{ fontSize: 12 }}>Copies actuelles</strong>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                    {(() => {
                      // 🔁 Récupérer les enfants du repeater DIRECTEMENT depuis la hiérarchie complète,
                      // en filtrant par parentId. Cela évite un éventuel état obsolète de selectedNodeFromTree.children.
                      const deriveChildrenByParentId = (all: TreeBranchLeafNode[], parentId?: string | null) => {
                        if (!parentId) return [] as TreeBranchLeafNode[];
                        const stack: TreeBranchLeafNode[] = [...all];
                        const out: TreeBranchLeafNode[] = [];
                        while (stack.length) {
                          const n = stack.pop()!;
                          if (n.parentId === parentId) out.push(n);
                          if (n.children && n.children.length) stack.push(...n.children);
                        }
                        return out;
                      };

                      const childrenOfRepeater = deriveChildrenByParentId(nodes, selectedNodeFromTree?.id);

                      console.log('🔎 [Parameters] Copies detection START', {
                        selectedNodeId: selectedNodeFromTree?.id,
                        childrenCount: childrenOfRepeater.length,
                        childrenLabels: childrenOfRepeater.map(c => c.label),
                        repeaterTemplateIds,
                        childrenWithMetadata: childrenOfRepeater.map(c => ({
                          id: c.id,
                          label: c.label,
                          parentId: c.parentId,
                          sourceTemplateId: (c.metadata as any)?.sourceTemplateId
                        }))
                      });
                      // Log ALL children en détail (stringifié pour éviter la collapse de l'inspecteur)
                      try {
                        const detailed = childrenOfRepeater.map(c => ({
                          id: c.id,
                          label: c.label,
                          type: c.type,
                          parentId: c.parentId,
                          sourceTemplateId: (c.metadata as any)?.sourceTemplateId,
                          metadataKeys: Object.keys(c.metadata || {})
                        }));
                        console.log('🔎 [Parameters] ALL CHILDREN DETAILED JSON:', JSON.stringify(detailed, null, 2));
                      } catch {
                        // ignore JSON stringify issues
                      }

                      const items: React.ReactNode[] = [];
                      for (const tplId of repeaterTemplateIds) {
                        const tplNode = (function findNode(list?: TreeBranchLeafNode[], targetId?: string): TreeBranchLeafNode | undefined {
                          if (!list || !targetId) return undefined;
                          for (const n of list) {
                            if (n.id === targetId) return n;
                            const found = findNode(n.children, targetId);
                            if (found) return found;
                          }
                          return undefined;
                        })(nodes, tplId);
                        // 1) Filtrage standard: enfants directs du répéteur
                        let copies = childrenOfRepeater.filter(n => {
                          const meta = (n.metadata || {}) as any;
                          const matches = meta?.sourceTemplateId === tplId;
                          console.log('🔎 [Parameters] Copy filter DEBUG', {
                            nodeId: n.id,
                            nodeLabel: n.label,
                            sourceTemplateId: meta?.sourceTemplateId,
                            tplId,
                            matches,
                            allMetadata: meta
                          });
                          return matches;
                        });

                        // 2) Filet de sécurité: si 0 copie trouvée comme enfant direct, chercher partout
                        if (copies.length === 0 && nodes && nodes.length > 0 && selectedNodeFromTree?.id) {
                          const flattenAll = (list: TreeBranchLeafNode[] | undefined): TreeBranchLeafNode[] => {
                            if (!list) return [];
                            const out: TreeBranchLeafNode[] = [];
                            const stack: TreeBranchLeafNode[] = [...list];
                            while (stack.length) {
                              const cur = stack.pop()!;
                              out.push(cur);
                              if (cur.children && cur.children.length) stack.push(...cur.children);
                            }
                            return out;
                          };
                          const allNodesFlat = flattenAll(nodes);
                          const fallback = allNodesFlat.filter(n => {
                            const meta = (n.metadata || {}) as any;
                            return meta?.duplicatedFromRepeater === selectedNodeFromTree.id && meta?.sourceTemplateId === tplId;
                          });
                          if (fallback.length > 0) {
                            const existingIds = new Set(copies.map(c => c.id));
                            const merged = [...copies, ...fallback.filter(f => !existingIds.has(f.id))];
                            console.warn('🛟 [Parameters] Fallback copies used (global scan by metadata):', merged.map(m => ({ id: m.id, label: m.label })));
                            copies = merged;
                          }
                        }
                        items.push(
                          <div key={`tpl-${tplId}`} style={{ border: '1px dashed #e8e8e8', borderRadius: 4, padding: 6 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                              Gabarit: {tplNode?.label || tplId} ({copies.length} copie{copies.length > 1 ? 's' : ''})
                            </div>
                            {copies.length === 0 ? (
                              <div style={{ fontSize: 11, color: '#999' }}>Aucune copie pour ce gabarit.</div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {copies.map(copy => {
                                  const meta = (copy.metadata || {}) as any;
                                  // Essayer d'afficher un libellé cohérent: "<Label gabarit>-<N>"
                                  // 1) Priorité au copySuffix injecté côté serveur
                                  let suffix: string | number | undefined = meta?.copySuffix;
                                  // 2) Sinon, extraire un "-N" final du label
                                  if (suffix === undefined && typeof copy.label === 'string') {
                                    const m = copy.label.match(/-(\d+)$/);
                                    if (m) suffix = m[1];
                                  }
                                  const displayLabel = `${tplNode?.label || tplId}${suffix !== undefined ? `-${suffix}` : ''}`;

                                  return (
                                  <div key={copy.id} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                                    <div style={{ fontSize: 12, flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {displayLabel}
                                    </div>
                                    <Popconfirm
                                      title="Supprimer cette copie ?"
                                      okText="Supprimer"
                                      cancelText="Annuler"
                                      okButtonProps={{ danger: true }}
                                      onConfirm={async () => {
                                        try {
                                          if (typeof onDeleteNode === 'function') {
                                            await Promise.resolve(onDeleteNode(copy));
                                          } else if (tree) {
                                            await api.delete(`/api/treebranchleaf/trees/${tree.id}/nodes/${copy.id}`);
                                          }
                                          if (typeof refreshTree === 'function') {
                                            await Promise.resolve(refreshTree());
                                          }
                                        } catch (e) {
                                          console.error('❌ [Repeater] Erreur suppression copie:', e);
                                        }
                                      }}
                                    >
                                      <Button danger size="small" icon={<DeleteOutlined />} style={{ fontSize: 10, flexShrink: 0 }}>
                                        Suppr.
                                      </Button>
                                    </Popconfirm>
                                  </div>
                                );})}
                              </div>
                            )}
                          </div>
                        );
                      }
                      return items;
                    })()}
                  </div>
                </div>
              )}

              {/* 🆕 SECTION PRÉ-CHARGEMENT INTELLIGENT */}
              <div style={{ marginTop: 12, borderTop: '1px solid #f0f0f0', paddingTop: 12 }}>
                <strong style={{ fontSize: 12 }}>⚡ Pré-chargement intelligent</strong>
                <Alert
                  type="info"
                  showIcon
                  style={{ marginTop: 4, marginBottom: 8 }}
                  message={
                    <span style={{ fontSize: 11 }}>
                      Liez ce répéteur à un champ numérique. Le système créera automatiquement 
                      les copies en arrière-plan quand l'utilisateur remplit ce champ.
                    </span>
                  }
                />
                
                {/* Input cliquable pour ouvrir le NodeTreeSelector */}
                <Input
                  size="small"
                  readOnly
                  value={(() => {
                    if (!repeaterCountSourceNodeId) return '';
                    // Trouver le label du nœud sélectionné
                    const findLabel = (list: TreeBranchLeafNode[] | undefined): string | null => {
                      if (!list) return null;
                      for (const n of list) {
                        if (n.id === repeaterCountSourceNodeId) return n.label || n.id;
                        if (n.children) {
                          const found = findLabel(n.children);
                          if (found) return found;
                        }
                      }
                      return null;
                    };
                    return findLabel(nodes) || repeaterCountSourceNodeId;
                  })()}
                  placeholder="🔍 Cliquez pour sélectionner un champ..."
                  style={{ width: '100%', cursor: 'pointer' }}
                  onClick={() => setRepeaterCountSelectorOpen(true)}
                  suffix={
                    repeaterCountSourceNodeId ? (
                      <span 
                        style={{ cursor: 'pointer', color: '#999' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setRepeaterCountSourceNodeId(null);
                          patchNode({ repeater_countSourceNodeId: null });
                        }}
                      >
                        ✕
                      </span>
                    ) : (
                      <span style={{ color: '#1890ff' }}>📂</span>
                    )
                  }
                />
                
                {/* Modal NodeTreeSelector */}
                <NodeTreeSelector
                  nodeId={selectedNode?.id || ''}
                  open={repeaterCountSelectorOpen}
                  onClose={() => setRepeaterCountSelectorOpen(false)}
                  selectionContext="nodeId"
                  onSelect={(val) => {
                    console.log('⚡ [Pre-load] Champ source sélectionné via NodeTreeSelector:', val);
                    // Extraire le nodeId du ref (format: @value.{nodeId})
                    const nodeId = val.ref.replace('@value.', '').replace('@select.', '');
                    setRepeaterCountSourceNodeId(nodeId);
                    patchNode({ repeater_countSourceNodeId: nodeId });
                    setRepeaterCountSelectorOpen(false);
                  }}
                />
                
                {repeaterCountSourceNodeId && (
                  <div style={{ marginTop: 8, padding: 8, backgroundColor: '#e6f4ff', borderRadius: 4, fontSize: 11 }}>
                    ✅ Quand l'utilisateur remplira le champ sélectionné, le système créera 
                    automatiquement le nombre de copies correspondant <strong>en arrière-plan</strong>, 
                    pendant qu'il continue de travailler sur le dossier.
                  </div>
                )}

                {/* 🧪 Test manuel du pré-chargement */}
                <div style={{ marginTop: 12, padding: 12, backgroundColor: '#fff7e6', borderRadius: 6, border: '1px solid #ffd591' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>🧪 Test manuel du pré-chargement</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      placeholder="Nb copies"
                      style={{ width: 100 }}
                      id="preload-test-count"
                    />
                    <Button
                      type="primary"
                      size="small"
                      onClick={async () => {
                        console.log('🔴🔴🔴 BOUTON CLIQUÉ! selectedNode:', selectedNode?.id);
                        const input = document.getElementById('preload-test-count') as HTMLInputElement;
                        console.log('🔴 Input trouvé:', input, 'value:', input?.value);
                        const targetCount = parseInt(input?.value || '0', 10);
                        console.log('🔴 targetCount:', targetCount);
                        if (!targetCount || targetCount < 1) {
                          alert('Entrez un nombre >= 1');
                          return;
                        }
                        if (!selectedNode?.id) {
                          alert('Aucun repeater sélectionné');
                          return;
                        }
                        console.log(`⚡ [PRELOAD TEST] Déclenchement pour ${selectedNode.id} avec cible ${targetCount}`);
                        try {
                          const result = await api.post(`/api/repeat/${selectedNode.id}/preload-copies`, {
                            targetCount
                          });
                          console.log('⚡ [PRELOAD TEST] Résultat:', result);
                          alert(`✅ ${result.createdCopies} copies créées! Total: ${result.totalCopies}`);
                          // Rafraîchir l'arbre
                          if (refreshTree) refreshTree();
                        } catch (error) {
                          console.error('❌ [PRELOAD TEST] Erreur:', error);
                          alert('❌ Erreur: ' + ((error as Error).message || 'Erreur inconnue'));
                        }
                      }}
                    >
                      Créer copies
                    </Button>
                  </div>
                  <div style={{ fontSize: 10, color: '#666', marginTop: 6 }}>
                    Ex: Si vous mettez "3", le système créera 2 copies (car l'original compte pour 1)
                  </div>
                </div>
              </div>
            </Space>
          </div>
        )}

        {/* Section Capacités */}
        <div>
          <h5 style={{ marginBottom: 12, fontSize: 14, fontWeight: 600, margin: 0 }}>
            <AppstoreOutlined style={{ marginRight: 8 }} />
            Capacités
          </h5>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {capabilities.map(cap => {
              const isActive = capsState[cap.key] || false;
              const isOpen = openCaps.has(cap.key);
              
              // 🔧 FIX: Vérifier hasData différemment selon la capacité
              const hasData = (() => {
                switch(cap.key) {
                  case 'table':
                    return !!selectedNode?.hasTable; // Utiliser hasTable au lieu de config.table
                  case 'formula':
                    return !!selectedNode?.hasFormula;
                  case 'condition':
                  case 'conditions':
                    return !!selectedNode?.hasCondition;
                  case 'data':
                    return !!selectedNode?.hasData;
                  case 'aiMeasure':
                    return !!selectedNode?.aiMeasure_enabled;
                  case 'api':
                    return !!selectedNode?.hasAPI;
                  case 'link':
                    return !!selectedNode?.hasLink;
                  case 'markers':
                    return !!selectedNode?.hasMarkers;
                  case 'product':
                    return !!selectedNode?.hasProduct;
                  default:
                    return selectedNode?.config?.[cap.key] && Object.keys(selectedNode.config[cap.key]).length > 0;
                }
              })();
              
              const getCapabilityIcon = (key: string) => {
                switch(key) {
                  case 'data': return <DatabaseOutlined />;
                  case 'formula': return <FunctionOutlined />;
                  case 'condition': return <FilterOutlined />;
                  case 'conditions': return <FilterOutlined />;
                  case 'table': return <TableOutlined />;
                  case 'aiMeasure': return <CameraOutlined />;
                  case 'api': return <ApiOutlined />;
                  case 'link': return <LinkOutlined />;
                  case 'markers': return <TagsOutlined />;
                  case 'product': return <ShoppingOutlined />;
                  default: return <AppstoreOutlined />;
                }
              };
              
              const getButtonType = () => {
                if (hasData) return 'primary'; // Bleu si a des données
                if (isActive) return 'default'; // Gris si activé mais pas de données
                return 'text'; // Très discret si pas activé
              };
              
              // Obtenir le sous-onglet associé au nœud sélectionné
              const getAssociatedSubTab = () => {
                const rawSubTab = selectedNode?.metadata?.subTab;
                if (Array.isArray(rawSubTab)) {
                  return rawSubTab.length > 0 ? rawSubTab[0] : null; // Prendre le premier s'il y en a plusieurs
                }
                return typeof rawSubTab === 'string' && rawSubTab ? rawSubTab : null;
              };
              
              const associatedSubTab = getAssociatedSubTab();
              
              return (
                <div key={cap.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <Tooltip title={`${cap.label}${hasData ? ' (avec données)' : isActive ? ' (activé)' : ' (désactivé)'}${associatedSubTab ? ` - Sous-onglet: ${associatedSubTab}` : ''}`}>
                    <Button
                      type={getButtonType()}
                      size="small"
                      icon={getCapabilityIcon(cap.key)}
                      onClick={() => {
                        if (!props.readOnly) {
                          // Simple toggle de l'ouverture du panneau - PAS d'activation automatique
                          setOpenCaps(prev => {
                            const next = new Set(prev);
                            if (next.has(cap.key)) {
                              next.delete(cap.key);
                            } else {
                              next.add(cap.key);
                            }
                            return next;
                          });
                        }
                      }}
                      disabled={props.readOnly}
                      style={{ 
                        width: 32, 
                        height: 24,
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderColor: isOpen ? '#1890ff' : undefined,
                        backgroundColor: hasData ? '#1890ff' : isOpen ? '#f0f9ff' : undefined,
                        color: hasData ? 'white' : undefined
                      }}
                    />
                  </Tooltip>
                  {/* Afficher le sous-onglet associé en petit texte sous l'icône */}
                  {associatedSubTab && (
                    <span style={{ 
                      fontSize: 9, 
                      color: '#666', 
                      maxWidth: 60, 
                      textAlign: 'center',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {associatedSubTab}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Panneaux auto-ouverts */}
          <div style={{ marginTop: 12 }}>
            {capabilities.map(cap => {
              if (!openCaps.has(cap.key)) return null;
              const importer = (CapabilityPanels as Record<string, () => Promise<{ default: React.ComponentType<Record<string, unknown>> }>>)[cap.key];
              if (!importer) return null;
              // 🛡️ FIX: Utiliser le cache stable pour React.lazy au lieu de créer
              // un nouveau composant à chaque render (ce qui causait des remontages fantômes)
              if (!lazyCapPanelCache.has(cap.key)) {
                lazyCapPanelCache.set(cap.key, React.lazy(importer));
              }
              const LazyPanel = lazyCapPanelCache.get(cap.key)!;
              return (
                <React.Suspense fallback={<div style={{ padding: 8, fontSize: 12 }}>Chargement {cap.label}…</div>} key={`cap-panel-${cap.key}-${selectedNode!.id}`}>
                  <div style={{ marginTop: 8 }} ref={(el) => { capRefs.current[cap.key] = el; }}>
                    <LazyPanel 
                      treeId={tree?.id || ''} 
                      nodeId={selectedNode!.id} 
                      onNodeUpdate={onNodeUpdate}
                    />
                  </div>
                </React.Suspense>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Sélecteur de champs déclencheurs pour les champs d'affichage */}
      {selectedNode && triggerNodeSelectorOpen && (
        <NodeTreeSelector
          nodeId={selectedNode.id}
          open={triggerNodeSelectorOpen}
          onClose={() => {
            console.log('🔍 [TriggerNodeSelector] Modal fermé');
            setTriggerNodeSelectorOpen(false);
          }}
          onSelect={(val: NodeTreeSelectorValue) => {
            console.log('🔍 [TriggerNodeSelector] onSelect appelé:', val);
            console.log('🔍 [TriggerNodeSelector] val.ref:', val.ref);
            console.log('🔍 [TriggerNodeSelector] val.kind:', val.kind);
            
            let nodeId: string | null = null;
            
            // Extraire le nodeId selon le format du ref
            // Format 1: @value.xxx (champs de l'arbre)
            const matchValue = val.ref.match(/@value\.(.+)/);
            if (matchValue) {
              nodeId = matchValue[1];
              console.log('🔍 [TriggerNodeSelector] nodeId extrait (format @value):', nodeId);
            } else {
              // Format 2: {lead.xxx} ou autres variables
              // On stocke le ref complet sans transformation
              nodeId = val.ref;
              console.log('🔍 [TriggerNodeSelector] Ref complet conservé:', nodeId);
            }
            
            if (nodeId) {
              const nextMeta = { ...(selectedNode?.metadata || {}) } as Record<string, unknown>;
              
              // 🔥 FIX MULTI-SÉLECTION : Utiliser l'état local au lieu de metadata (car API ne retourne pas triggerNodeIds !)
              const currentIds = localTriggerNodeIds.length > 0 ? localTriggerNodeIds : 
                                 (Array.isArray(nextMeta.triggerNodeIds) ? nextMeta.triggerNodeIds as string[] : []);
              
              console.log('🔍 [TriggerNodeSelector] currentIds (depuis état local):', currentIds);
              console.log('🔍 [TriggerNodeSelector] localTriggerNodeIds:', localTriggerNodeIds);
              
              // Ajouter le nodeId s'il n'est pas déjà présent
              if (!currentIds.includes(nodeId)) {
                const newIds = [...currentIds, nodeId];
                nextMeta.triggerNodeIds = newIds;
                console.log('🔍 [TriggerNodeSelector] nextMeta.triggerNodeIds:', nextMeta.triggerNodeIds);
                
                // Update local state immediately (optimistic)
                setLocalTriggerNodeIds(newIds);
                console.log('🎯 [TriggerNodeSelector] État local mis à jour avec TOUS les champs:', newIds);
                
                // 🔥 FIX: Sauvegarder immédiatement via l'API (pas de debounce)
                // patchNode est debounced et peut être annulé par un autre appel dans les 400ms
                if (selectedNodeId) {
                  onNodeUpdateRef.current({ metadata: nextMeta, id: selectedNodeId })
                    .then((resp: any) => {
                      console.log('✅ [TriggerNodeSelector] triggerNodeIds sauvegardé en DB:', resp?.metadata?.triggerNodeIds);
                    })
                    .catch((err: any) => {
                      console.error('❌ [TriggerNodeSelector] Erreur sauvegarde triggerNodeIds:', err);
                    });
                }
                emitMetadataUpdate(nextMeta);
                console.log('✅ [TriggerNodeSelector] Champ ajouté avec succès!');
              } else {
                console.log('⚠️ [TriggerNodeSelector] Le champ est déjà dans la liste');
              }
            } else {
              console.warn('❌ [TriggerNodeSelector] Impossible d\'extraire le nodeId depuis:', val.ref);
            }
            
            // Ne pas fermer le modal pour permettre plusieurs sélections
            // setTriggerNodeSelectorOpen(false);
          }}
          selectionContext="nodeId"
          allowMulti={true}
        />
      )}
    </Card>
  );
};

export default React.memo(Parameters);

