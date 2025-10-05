import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTBLCapabilitiesPreload, PreloadedTBLCapability } from './useTBLCapabilitiesPreload';
import { useAuthenticatedApi } from '../../../../../hooks/useAuthenticatedApi';
import { dlog } from '../../../../../utils/debug';

// -------------------------------------------------------------
// Types de base
// -------------------------------------------------------------
export interface TreeBranchLeafNode {
  id: string;
  treeId: string;
  parentId: string | null;
  type: string; // 'branch' | 'leaf_field' | 'leaf_option' | ...
  subType: string | null;
  label: string;
  description: string | null;
  value: string | null;
  order: number;
  isRequired: boolean;
  isVisible: boolean;
  isActive: boolean;
  fieldConfig: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  defaultValue?: string;
  calculatedValue?: string;
  fieldType?: string;
  fieldSubType?: string;
}

export interface TBLField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'email' | 'date' | 'number' | 'textarea' | 'select' | 'boolean';
  required: boolean;
  value?: string | number | boolean;
  options?: string[];
  visible: boolean;
  placeholder?: string;
  description?: string;
  validation?: string;
  order: number;
  parentId?: string;
  shouldDisplay?: boolean;
  // 🔧 Ajouts pour alignement avec renderer avancé
  config?: Record<string, unknown>;
  treeMetadata?: Record<string, unknown>;
  capabilities?: Record<string, unknown>; // structure légère (data/formula...)
  // 💡 Propriétés tooltip
  text_helpTooltipType?: string;
  text_helpTooltipText?: string;
  text_helpTooltipImage?: string;
  appearanceConfig?: Record<string, unknown>;
}

export interface TBLSection {
  id: string;
  name: string;
  title?: string;
  description?: string | null;
  icon?: string;
  fields: TBLField[];
  order?: number;
  parentId?: string;
  subsections?: TBLSection[];
}

export interface TBLTab {
  id: string;
  name: string;
  label: string;
  sections: TBLSection[];
  order: number;
}

export interface TBLTree {
  id: string;
  name: string;
  tabs: TBLTab[];
}

export interface UseTBLDataHierarchicalParams {
  tree_id: string | number;
  disabled?: boolean; // si true, on n'effectue pas le fetch
}

export interface UseTBLDataHierarchicalReturn {
  tree: TBLTree | null;
  tabs: TBLTab[];
  fieldsByTab: Record<string, TBLField[]>;
  sectionsByTab: Record<string, TBLSection[]>;
  loading: boolean;
  error: string | null;
  updateNodeValue: (nodeId: string, value: string | number | boolean) => Promise<void>;
  toggleNodeVisibility: (nodeId: string) => Promise<void>;
  addOption: (nodeId: string, option: string) => Promise<void>;
  deleteOption: (nodeId: string, option: string) => Promise<void>;
}

// -------------------------------------------------------------
// Icônes : mapping centralisé
// -------------------------------------------------------------
const TYPE_ICON_MAP: Record<string, string> = {
  branch: '📂',
  leaf_field: '📝',
  leaf_option: '🔧',
  leaf_option_field: '🧩'
};

// -------------------------------------------------------------
// Debug util (activer avec localStorage.TBL_DIAG='1')
// -------------------------------------------------------------
const diagEnabled = () => {
  try { return localStorage.getItem('TBL_DIAG') === '1'; } catch { return false; }
};
const ddiag = (...args: unknown[]) => { if (diagEnabled()) console.log('[TBL_DIAG]', ...args); };

function deriveIcon(node: TreeBranchLeafNode): string {
  // 1 - metadata.icon
  if (node.metadata && typeof node.metadata === 'object') {
    const icon = (node.metadata as Record<string, unknown>)?.icon;
    if (typeof icon === 'string' && icon.trim()) return icon.trim();
  }
  // 2 - fieldConfig.icon
  if (node.fieldConfig && typeof node.fieldConfig === 'object') {
    const icon = (node.fieldConfig as Record<string, unknown>)?.icon;
    if (typeof icon === 'string' && icon.trim()) return icon.trim();
  }
  // 3 - mapping par type
  if (TYPE_ICON_MAP[node.type]) return TYPE_ICON_MAP[node.type];
  // 4 - fallback
  return '📋';
}

// -------------------------------------------------------------
// Création d'un champ à partir d'un nœud leaf
// -------------------------------------------------------------
type CapabilityLite = Pick<PreloadedTBLCapability, 'capacity' | 'sourceRef' | 'sourceType' | 'fixedValue'>;
function createField(node: TreeBranchLeafNode, nodeMap: Map<string, TreeBranchLeafNode>, capability?: CapabilityLite): TBLField {
  let type: TBLField['type'] = 'text';
  if (node.fieldConfig && typeof node.fieldConfig === 'object') {
    const t = (node.fieldConfig as Record<string, unknown>).type;
    if (typeof t === 'string') type = t as TBLField['type'];
  } else if (node.fieldType) {
    type = node.fieldType as TBLField['type'];
  }

  let value: string | number | boolean | undefined = node.value ?? undefined;
  let options: string[] | undefined;
  if (type === 'number' && typeof node.value === 'string') {
    const n = parseFloat(node.value);
    value = isNaN(n) ? undefined : n;
  } else if (type === 'boolean' && typeof node.value === 'string') {
    value = ['true', '1', 'yes'].includes(node.value.toLowerCase());
  } else if (type === 'select') {
    if (node.fieldConfig && Array.isArray((node.fieldConfig as Record<string, unknown>).options)) {
      options = (node.fieldConfig as Record<string, unknown>).options as string[];
    }
  }

  const field: TBLField = {
    id: node.id,
    name: node.label,
    label: node.label,
    type,
    required: !!node.isRequired,
    value,
    options,
    visible: node.isVisible !== false,
    placeholder: `Saisir ${node.label}`,
    description: node.description ?? undefined,
    validation: undefined,
    order: node.order || 0,
    parentId: node.parentId || undefined,
    shouldDisplay: node.isActive !== false,
    config: (node.fieldConfig || undefined) as Record<string, unknown> | undefined,
    treeMetadata: (node.metadata || undefined) as Record<string, unknown> | undefined,
    // 💡 Propriétés tooltip depuis les colonnes TBL
    text_helpTooltipType: node.text_helpTooltipType,
    text_helpTooltipText: node.text_helpTooltipText,
    text_helpTooltipImage: node.text_helpTooltipImage,
    // 🎯 APPARENCE CONFIG avec tooltips intégrés
    appearanceConfig: {
      ...(node.appearanceConfig || {}),
      // ✅ Ajouter les tooltips dans appearanceConfig
      helpTooltipType: node.text_helpTooltipType,
      helpTooltipText: node.text_helpTooltipText,
      helpTooltipImage: node.text_helpTooltipImage
    }
  };

  // 🧠 Capabilities via preload si disponibles, sinon fallback inférence locale
  try {
    if (capability) {
      const cap = capability;
      const capabilities: Record<string, unknown> = {};
      if (cap.capacity === 'formula') {
        capabilities.formula = { activeId: cap.sourceRef?.replace('formula:', ''), currentFormula: { expression: cap.sourceRef } };
      }
      if (cap.capacity === 'condition') {
        capabilities.condition = { activeId: cap.sourceRef?.replace('condition:', '') };
      }
      if (cap.capacity === 'table') {
        capabilities.table = { activeId: cap.sourceRef?.replace('table:', '') };
      }
      if (cap.capacity === 'fixed') {
        capabilities.data = { enabled: true, fixedValue: cap.fixedValue };
      }
      if (cap.capacity === 'data' || cap.capacity === 'unknown') {
        // Minimal data layer
        if (cap.sourceRef || cap.fixedValue) {
          capabilities.data = {
            enabled: true,
            activeId: cap.sourceRef,
            instances: cap.sourceRef ? { [cap.sourceRef]: { metadata: { sourceType: cap.sourceType, sourceRef: cap.sourceRef, fixedValue: cap.fixedValue } } } : undefined
          };
        }
      }
      if (Object.keys(capabilities).length) field.capabilities = capabilities;
      ddiag('createField(preloaded)', { id: field.id, capacity: cap.capacity, sourceRef: cap.sourceRef });
    } else {
      const meta = (node.metadata || {}) as Record<string, unknown>;
      const fc = (node.fieldConfig || {}) as Record<string, unknown>;
      const sourceType = (meta.sourceType || fc.sourceType) as string | undefined;
      const sourceRef = (meta.sourceRef || fc.sourceRef) as string | undefined;
      const fixedValue = (meta.fixedValue || fc.fixedValue) as unknown;
      const hasFormula = typeof sourceRef === 'string' && sourceRef.startsWith('formula:');
      const hasCondition = typeof sourceRef === 'string' && sourceRef.startsWith('condition:');
      const hasVariable = typeof sourceRef === 'string' && (sourceRef.startsWith('variable:') || sourceType === 'tree');
      const capabilities: Record<string, unknown> = {};
      if (sourceRef || fixedValue !== undefined) {
        if (!capabilities.data) capabilities.data = {};
        (capabilities.data as Record<string, unknown>).enabled = true;
        (capabilities.data as Record<string, unknown>).activeId = sourceRef || undefined;
        (capabilities.data as Record<string, unknown>).instances = sourceRef ? { [sourceRef]: { metadata: { sourceType: sourceType || (hasVariable ? 'tree' : 'fixed'), sourceRef, fixedValue } } } : {};
      }
      if (hasFormula) capabilities.formula = { activeId: sourceRef?.replace('formula:', ''), currentFormula: { expression: sourceRef } };
      if (hasCondition) capabilities.condition = { activeId: sourceRef?.replace('condition:', '') };
      if (Object.keys(capabilities).length > 0) field.capabilities = capabilities;
      ddiag('createField(fallback)', { id: field.id, sourceRef, sourceType, hasFormula, hasCondition });
    }
  } catch {/* silent */}

  // Conditionnel: leaf_option_field visible seulement si parent leaf_option sélectionné
  if (node.type === 'leaf_option_field' && node.parentId) {
    const parent = nodeMap.get(node.parentId);
    if (parent && parent.type === 'leaf_option') {
      field.shouldDisplay = parent.value === node.label;
    }
  }

  // Condition simple dérivée de metadata (dependsOn / operator / value)
  try {
    const meta = (node.metadata || {}) as Record<string, unknown>;
    const dependsOn = meta.dependsOn as string | undefined;
    const operator = (meta.operator as string | undefined) || 'equals';
    const expected = meta.value ?? meta.showWhen;
    if (dependsOn) {
      // Recherche valeur du champ référencé parmi nodeMap (par label ou id) - heuristique simple
  const referenced: TreeBranchLeafNode | undefined = nodeMap.get(dependsOn) || Array.from(nodeMap.values()).find(n => n.label === dependsOn);
      const refVal = referenced?.value;
      let match = true;
      switch (operator) {
        case 'equals': match = refVal === expected; break;
        case 'not_equals': match = refVal !== expected; break;
        case 'contains': match = typeof refVal === 'string' && String(refVal).includes(String(expected)); break;
        case 'exists': match = refVal !== undefined && refVal !== null && refVal !== ''; break;
        default: match = true;
      }
      if (!match) field.shouldDisplay = false;
    }
  } catch { /* non bloquant */ }
  return field;
}

// -------------------------------------------------------------
// Transformation hiérarchique → Tabs / Sections / Fields
// Règle adoptée :
// - branch parentId=null => TAB
// - branch parentId = branch(tab) => SECTION (1er niveau)
// - branch parentId = section => SUBSECTION (récursif)
// - leaf_* rattaché à branch => field dans la section ou tab si directement sous tab
// -------------------------------------------------------------
// buildHierarchy legacy supprimé (logique réécrite inline avec capabilities preload)

// -------------------------------------------------------------
// Hook principal
// -------------------------------------------------------------
export function useTBLDataHierarchicalFixed(params: UseTBLDataHierarchicalParams): UseTBLDataHierarchicalReturn {
  // 🚨 LOG TRÈS VISIBLE AU DÉBUT DU HOOK
  console.log('🟢🟢🟢 [TBL HOOK] useTBLDataHierarchicalFixed APPELÉ !', params);
  const { api } = useAuthenticatedApi();
  const { tree_id, disabled } = params;
  const [rawNodes, setRawNodes] = useState<TreeBranchLeafNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Préload capabilities (tree_id converti string)
  const preload = useTBLCapabilitiesPreload({
    treeId: tree_id ? String(tree_id) : undefined,
    enabled: !disabled && !!tree_id,
    extractDependencies: true,
    includeRaw: false
  });

  const fetchData = useCallback(async () => {
    if (!tree_id || disabled) return;
    setLoading(true);
    setError(null);
    try {
      dlog('[TBL] Fetch nodes for tree', tree_id);
      const data = await api.get(`/api/treebranchleaf/trees/${tree_id}/nodes`);
      
      // 🔧 L'API peut retourner directement un tableau OU un objet wrapper
      let nodes: TreeBranchLeafNode[] = [];
      if (Array.isArray(data)) {
        // Cas 1: Tableau direct
        nodes = data as TreeBranchLeafNode[];
      } else if (data && typeof data === 'object') {
        // Cas 2: Objet wrapper { data: [...] } ou { nodes: [...] }
        const wrapped = data as { success?: boolean; data?: TreeBranchLeafNode[]; nodes?: TreeBranchLeafNode[] };
        nodes = (wrapped.data || wrapped.nodes || []) as TreeBranchLeafNode[];
      }
      
      console.log('🚨 [TBL NEW] Nœuds reçus:', nodes.length);
      
      // 🔍 DEBUG: Vérifier les données tooltip dans les nodes
      console.log('🚨 [TBL] TOUS LES NODES reçus de l\'API:', nodes.map(n => ({
        id: n.id,
        label: n.label,
        text_helpTooltipType: n.text_helpTooltipType,
        text_helpTooltipText: n.text_helpTooltipText,
        text_helpTooltipImage: n.text_helpTooltipImage
      })));
      
      const firstNode = nodes[0];
      if (firstNode) {
        console.log('🔍 [TBL] Premier node reçu de l\'API (COMPLET):', JSON.stringify(firstNode, null, 2));
        console.log('🔍 [TBL] Premier node - Propriétés tooltip:', {
          id: firstNode.id,
          label: firstNode.label,
          text_helpTooltipType: firstNode.text_helpTooltipType,
          text_helpTooltipText: firstNode.text_helpTooltipText,
          text_helpTooltipImage: firstNode.text_helpTooltipImage,
          appearanceConfig: firstNode.appearanceConfig,
          allKeys: Object.keys(firstNode)
        });
      }
      
      setRawNodes(nodes);
    } catch (e) {
      console.error('❌ [TBL] Erreur chargement nœuds:', e);
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [api, tree_id, disabled]);

  useEffect(() => {
    if (!disabled) fetchData();
  }, [fetchData, disabled]);

  // 🔄 Écouter les changements de capacité pour recharger les données
  useEffect(() => {
    const handleCapabilityUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ nodeId: string; treeId: string | number | undefined }>;
      const { treeId: eventTreeId } = customEvent.detail;
      
      // Recharger uniquement si c'est notre arbre
      if (!disabled && eventTreeId && String(eventTreeId) === String(tree_id)) {
        console.log('🔄 [TBL Hook] Capacité mise à jour détectée, rechargement des données...', customEvent.detail);
        fetchData();
      }
    };

    window.addEventListener('tbl-capability-updated', handleCapabilityUpdate);
    return () => window.removeEventListener('tbl-capability-updated', handleCapabilityUpdate);
  }, [fetchData, disabled, tree_id]);

  const { tree, tabs, fieldsByTab, sectionsByTab } = useMemo(() => {
    if (!rawNodes.length) return { tree: null, tabs: [], fieldsByTab: {}, sectionsByTab: {} };
    // Reprise code buildHierarchy avec injection capabilities
    const nodeMap = new Map<string, TreeBranchLeafNode>();
    rawNodes.forEach(n => nodeMap.set(n.id, n));
    const childrenMap = new Map<string | null, TreeBranchLeafNode[]>();
    rawNodes.forEach(n => {
      const key = n.parentId;
      if (!childrenMap.has(key)) childrenMap.set(key, []);
      childrenMap.get(key)!.push(n);
    });
    childrenMap.forEach(arr => arr.sort((a, b) => (a.order || 0) - (b.order || 0)));
    const topBranches = (childrenMap.get(null) || []).filter(n => n.type === 'branch');
    const tabsLocal: TBLTab[] = [];
    const fieldsByTabLocal: Record<string, TBLField[]> = {};
    const sectionsByTabLocal: Record<string, TBLSection[]> = {};
    const preloadedByNodeId = preload.byNodeId;
    const makeSection = (branchNode: TreeBranchLeafNode): TBLSection => {
      const rawChildren = childrenMap.get(branchNode.id) || [];
      const subsections: TBLSection[] = [];
      const fields: TBLField[] = [];
      rawChildren.forEach(child => {
        if (child.type === 'branch') subsections.push(makeSection(child));
        else if (child.type.startsWith('leaf_')) fields.push(createField(child, nodeMap, preloadedByNodeId.get(child.id) as CapabilityLite | undefined));
      });
      return {
        id: branchNode.id,
        name: branchNode.label,
        title: branchNode.label,
        description: branchNode.description,
        icon: deriveIcon(branchNode),
        fields: fields.sort((a, b) => a.order - b.order),
        order: branchNode.order || 0,
        parentId: branchNode.parentId || undefined,
        subsections: subsections.sort((a, b) => (a.order || 0) - (b.order || 0))
      };
    };
    topBranches.forEach(tabBranch => {
      const level2 = childrenMap.get(tabBranch.id) || [];
      const sections: TBLSection[] = [];
      const directFields: TBLField[] = [];
      level2.forEach(n => {
        if (n.type === 'branch') sections.push(makeSection(n));
        else if (n.type.startsWith('leaf_')) directFields.push(createField(n, nodeMap, preloadedByNodeId.get(n.id) as CapabilityLite | undefined));
      });
      const tab: TBLTab = { id: tabBranch.id, name: tabBranch.label, label: tabBranch.label, order: tabBranch.order || 0, sections: sections.sort((a, b) => (a.order || 0) - (b.order || 0)) };
      tabsLocal.push(tab);
      fieldsByTabLocal[tab.id] = [...directFields].sort((a, b) => a.order - b.order);
      sectionsByTabLocal[tab.id] = tab.sections;
    });
    const treeObj: TBLTree = { id: rawNodes[0].treeId, name: 'Arbre TreeBranchLeaf', tabs: tabsLocal.sort((a, b) => a.order - b.order) };
    return { tree: treeObj, tabs: treeObj.tabs, fieldsByTab: fieldsByTabLocal, sectionsByTab: sectionsByTabLocal };
  }, [rawNodes, preload.byNodeId]);

  // Actions mutation (optimistes simples + refetch)
  const updateNodeValue = useCallback(async (nodeId: string, value: string | number | boolean) => {
    try {
      await api.post(`/api/treebranchleaf/nodes/${nodeId}/value`, { value });
      await fetchData();
    } catch (e) {
      console.error('❌ [TBL] updateNodeValue error:', e);
    }
  }, [api, fetchData]);

  const toggleNodeVisibility = useCallback(async (nodeId: string) => {
    try {
      await api.put(`/api/treebranchleaf/${nodeId}/visibility`, {});
      await fetchData();
    } catch (e) {
      console.error('❌ [TBL] toggleNodeVisibility error:', e);
    }
  }, [api, fetchData]);

  const addOption = useCallback(async (nodeId: string, option: string) => {
    try {
      await api.post(`/api/treebranchleaf/${nodeId}/options`, { option });
      await fetchData();
    } catch (e) {
      console.error('❌ [TBL] addOption error:', e);
    }
  }, [api, fetchData]);

  const deleteOption = useCallback(async (nodeId: string, option: string) => {
    try {
      await api.delete(`/api/treebranchleaf/${nodeId}/options/${encodeURIComponent(option)}`);
      await fetchData();
    } catch (e) {
      console.error('❌ [TBL] deleteOption error:', e);
    }
  }, [api, fetchData]);

  return {
    tree,
    tabs,
    fieldsByTab,
    sectionsByTab,
    loading,
    error,
    updateNodeValue,
    toggleNodeVisibility,
    addOption,
    deleteOption
  };
}

export default useTBLDataHierarchicalFixed;
