/**
 * 🔧 Parameters - Panneau de paramètres TreeBranchLeaf
 * 
 * Composant de la colonne droite qui affiche et permet d'éditer
 * les paramètres du nœud sélectionné dans la structure
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, /* Typography, */ Empty, Space, Input, Select, Tooltip, Button, Alert, Popconfirm, Tag, Checkbox } from 'antd';
import type { InputRef } from 'antd';
import { 
  SettingOutlined, 
  AppstoreOutlined, 
  BgColorsOutlined,
  DatabaseOutlined,
  FunctionOutlined,
  FilterOutlined,
  TableOutlined,
  ApiOutlined,
  LinkOutlined,
  TagsOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback';
import { useAuthenticatedApi } from '../../../../../hooks/useAuthenticatedApi';
import { CapabilityPanels, FieldAppearancePanels, TreeBranchLeafRegistry } from '../../core/registry';
import SharedReferencePanel from './capabilities/SharedReferencePanel';
import type { 
  TreeBranchLeafTree, 
  TreeBranchLeafNode, 
  UIState,
  TreeBranchLeafRegistry as TreeBranchLeafRegistryType,
  NodeTypeKey
} from '../../types';

// Simple editor pour un tableau de sous-onglets (labels)
const SubTabsEditor: React.FC<{ value: string[]; onChange: (next: string[]) => void }> = ({ value = [], onChange }) => {
  const [input, setInput] = useState('');
  const add = () => {
    const trimmed = (input || '').trim();
    if (!trimmed) return;
    if (value.includes(trimmed)) {
      setInput('');
      return;
    }
    onChange([...value, trimmed]);
    setInput('');
  };
  const remove = (label: string) => {
    onChange(value.filter(v => v !== label));
  };
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        {value.map((label) => (
          <Tag key={label} closable onClose={() => remove(label)}>{label}</Tag>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Input size="small" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ajouter un sous-onglet" />
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

const Parameters: React.FC<ParametersProps> = (props) => {
  const { tree, selectedNode, nodes = [], panelState, registry, onNodeUpdate, refreshTree, onDeleteNode, onSelectNodeId, onExpandNodeId, onNodeMetadataUpdated } = props;
  
  // Log to verify callback is provided
  useEffect(() => {
    console.error(`🎯 [Parameters] Mounted with node: ${selectedNode?.id}, callback provided: ${!!onNodeMetadataUpdated}`);
    return () => {
      console.error(`🎯 [Parameters] Unmounting`);
    };
  }, [selectedNode?.id, onNodeMetadataUpdated]);
  
  // Refs pour cleanup
  const mountedRef = useRef<boolean>(true);

  // 🔐 Hook API authentifié
  const { api } = useAuthenticatedApi();
  const applyToChildrenRef = useRef(false);
  const [applyToChildren, setApplyToChildren] = useState(false);
  const [useServerCascade, setUseServerCascade] = useState(false);
  const [applyingSharedRefs, setApplyingSharedRefs] = useState(false);
  const [unlinkingSharedRefs, setUnlinkingSharedRefs] = useState(false);
  // 🛡️ Anti-duplication: suivi des duplications en cours par répéteur (repeaterId -> Set<templateId>)
  const inFlightDupByRepeaterRef = useRef<Map<string, Set<string>>>(new Map());

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
  // Repliable supprimé: état supprimé pour simplifier l'UI
  const [fieldType, setFieldType] = useState<string | undefined>(undefined);
  const [capsState, setCapsState] = useState<Record<string, boolean>>({});
  // Mémorise l'état précédent des capacités pour détecter les activations externes
  const prevCapsRef = useRef<Record<string, boolean>>({});
  const lastNodeIdRef = useRef<string | null>(null);
  const panelStateOpenCapabilities = panelState.openCapabilities;
  const selectedNodeId = selectedNode?.id ?? null;

  const REPEATER_DEFAULT_LABEL = 'Ajouter une entrée';
  const [repeaterTemplateIds, setRepeaterTemplateIds] = useState<string[]>([]);
  const [repeaterMinItems, setRepeaterMinItems] = useState<number | undefined>(undefined);
  const [repeaterMaxItems, setRepeaterMaxItems] = useState<number | undefined>(undefined);
  const [repeaterAddLabel, setRepeaterAddLabel] = useState<string>(REPEATER_DEFAULT_LABEL);
  
  // 🆕 Bloquer l'hydratation temporairement après une modification utilisateur
  const skipNextHydrationRef = useRef(false);
  const hydrationTimeoutRef = useRef<number | null>(null);

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

  const handleDeleteSelected = useCallback(async () => {
    if (!selectedNode) return;
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
      
      // ✅ Utiliser la ref pour toujours avoir la dernière version
      const _updated = await onNodeUpdateRef.current({ ...apiData, id: selectedNodeId });

      // Emit generic event for other listeners; include returned updated node for local merges
      try {
        const nodeToEmit = _updated || { id: selectedNodeId };
        if (process.env.NODE_ENV === 'development') console.log('🔔 [Parameters] Emission tbl-node-updated pour:', nodeToEmit.id);
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
    
    // 🆕 IMPORTANT : Utiliser l'état local actuel au lieu de selectedNode.metadata
    // pour éviter d'écraser les valeurs qui viennent d'être modifiées
    const currentMeta: RepeaterMetadata = {
      templateNodeIds: repeaterTemplateIds,
      minItems: repeaterMinItems ?? undefined,
      maxItems: repeaterMaxItems ?? undefined,
      addButtonLabel: repeaterAddLabel !== REPEATER_DEFAULT_LABEL ? repeaterAddLabel : undefined
    };
    
    const merged: RepeaterMetadata = { ...currentMeta, ...partial };

    console.log('📝 [commitRepeaterMetadata] APRÈS MERGE:', {
      currentMeta,
      merged
    });

    if (!Array.isArray(merged.templateNodeIds)) {
      delete merged.templateNodeIds;
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

    const nextMetadata = {
      ...(selectedNode.metadata || {}),
      repeater: merged
    };

    console.log('📝 [commitRepeaterMetadata] METADATA FINALE:', nextMetadata);

    // 🔥 IMPORTANT : Enregistrer AUSSI dans les colonnes dédiées de la base
    const payload: Record<string, unknown> = {
      metadata: nextMetadata,
      // ✅ Colonnes dédiées pour performances et requêtes SQL
      repeater_addButtonLabel: merged.addButtonLabel || null,
      repeater_buttonSize: merged.buttonSize || 'middle',
      repeater_buttonWidth: merged.buttonWidth || 'auto',
      repeater_iconOnly: merged.iconOnly || false,
      repeater_minItems: merged.minItems ?? 0,
      repeater_maxItems: merged.maxItems || null
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

        // 2) Set des templates déjà matérialisés via les enfants directs
        const existingSourceTemplateIds = new Set<string>();
        childrenOfRepeater.forEach(n => {
          const meta = (n.metadata || {}) as any;
          if (meta?.sourceTemplateId) existingSourceTemplateIds.add(meta.sourceTemplateId);
        });

        // 3) Filet de sécurité: inclure aussi les copies trouvées globalement via metadata.duplicatedFromRepeater
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
        allNodesFlat.forEach(n => {
          const meta = (n.metadata || {}) as any;
          if (meta?.duplicatedFromRepeater === repeaterId && meta?.sourceTemplateId) {
            existingSourceTemplateIds.add(meta.sourceTemplateId);
          }
        });

        // 3bis) Anti-redup: ajouter les duplications EN COURS (in-flight) pour ce répéteur
        const inflightSet = inFlightDupByRepeaterRef.current.get(repeaterId);
        if (inflightSet && inflightSet.size > 0) {
          inflightSet.forEach(id => existingSourceTemplateIds.add(id));
          console.log('🛡️ [commitRepeaterMetadata] In-flight protégés:', Array.from(inflightSet));
        }

        // 4) Calculer les gabarits à créer (sélectionnés - déjà existants)
        const toCreate = merged.templateNodeIds.filter(id => !existingSourceTemplateIds.has(id));

        console.log('🧪 [commitRepeaterMetadata] Idempotence check:', {
          repeaterId,
          selectedTemplateIds: merged.templateNodeIds,
          existingSourceTemplateIds: Array.from(existingSourceTemplateIds),
          toCreate
        });

        if (toCreate.length > 0) {
          // Marquer comme en cours pour éviter re-duplication avant hydratation
          const map = inFlightDupByRepeaterRef.current;
          const set = map.get(repeaterId) || new Set<string>();
          toCreate.forEach(id => set.add(id));
          map.set(repeaterId, set);
          duplicateTemplatesPhysically(toCreate);
        } else {
          console.log('✅ [commitRepeaterMetadata] Aucune duplication nécessaire (idempotent)');
        }
      } catch (e) {
        console.warn('⚠️ [commitRepeaterMetadata] Échec contrôle idempotence, fallback duplication complète:', e);
        // Fallback ultra conservateur si une erreur survient
        duplicateTemplatesPhysically(merged.templateNodeIds);
      }
    }
  }, [patchNode, selectedNode, selectedNodeFromTree, nodes, repeaterTemplateIds, repeaterMinItems, repeaterMaxItems, repeaterAddLabel, REPEATER_DEFAULT_LABEL, duplicateTemplatesPhysically, emitMetadataUpdate]);

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

    // ❌ DÉSACTIVÉ : Ne pas appliquer l'apparence par défaut ici car ça crée une boucle infinie
    // L'apparence par défaut doit être appliquée uniquement lors de la CRÉATION du nœud, pas lors de l'hydratation
    // Le TreeBranchLeafEditor applique déjà les valeurs par défaut lors de la création

    const conditionActive = !!selectedNode.hasCondition;
    setCapsState({
      data: !!selectedNode.hasData,
      formula: !!selectedNode.hasFormula,
      condition: conditionActive,
      table: !!selectedNode.hasTable,
      api: !!selectedNode.hasAPI,
      link: !!selectedNode.hasLink,
      markers: !!selectedNode.hasMarkers
    });

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
      
      const templateIds = Array.isArray(repeaterMeta.templateNodeIds)
        ? repeaterMeta.templateNodeIds
        : (selectedNodeFromTree?.children?.map(child => child.id) ?? []);

      console.log('🔍 [Parameters] Template IDs extraits:', {
        templateIds,
        'Array.isArray(repeaterMeta.templateNodeIds)': Array.isArray(repeaterMeta.templateNodeIds),
        'repeaterMeta.templateNodeIds': repeaterMeta.templateNodeIds
      });
      
      setRepeaterTemplateIds(templateIds);
      setRepeaterMinItems(typeof repeaterMeta.minItems === 'number' ? repeaterMeta.minItems : undefined);
      setRepeaterMaxItems(typeof repeaterMeta.maxItems === 'number' ? repeaterMeta.maxItems : undefined);
      setRepeaterAddLabel(
        typeof repeaterMeta.addButtonLabel === 'string' && repeaterMeta.addButtonLabel.trim().length > 0
          ? repeaterMeta.addButtonLabel
          : REPEATER_DEFAULT_LABEL
      );
    } else {
      setRepeaterTemplateIds([]);
      setRepeaterMinItems(undefined);
      setRepeaterMaxItems(undefined);
      setRepeaterAddLabel(REPEATER_DEFAULT_LABEL);
    }
  }, [selectedNode, registry, panelStateOpenCapabilities, selectedNodeFromTree]);

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

  // Gestionnaire de changement de fieldType
  const handleFieldTypeChange = useCallback((value: string) => {
    setFieldType(value);
    // Fermer le panneau d'apparence quand on change de type
    setAppearanceOpen(false);
    
    // Appliquer l'apparence par défaut pour le nouveau type
    const defaultAppearance = TreeBranchLeafRegistry.getDefaultAppearanceConfig(value);
    const tblMapping = TreeBranchLeafRegistry.mapAppearanceConfigToTBL(defaultAppearance);
    
    patchNode({ 
      subType: value,
      appearanceConfig: defaultAppearance,
      ...tblMapping
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
        {/* Barre d'actions rapides */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          {/* Actions Références partagées */}
          <Space size={6}>
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
              >
                Appliquer réf. partagées
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
              <Button danger size="small" loading={unlinkingSharedRefs} disabled={!selectedNode || props.readOnly}>
                Supprimer réf. partagées
              </Button>
            </Popconfirm>
          </Space>

          <Popconfirm
            title="Supprimer ce nœud ?"
            description="Cette action supprimera également ses enfants."
            okText="Supprimer"
            cancelText="Annuler"
            okButtonProps={{ danger: true }}
            onConfirm={handleDeleteSelected}
            disabled={!selectedNode || props.readOnly}
          >
            <Button danger size="small" icon={<DeleteOutlined />} disabled={!selectedNode || props.readOnly}>
              Supprimer ce nœud
            </Button>
          </Popconfirm>
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
                <strong style={{ fontSize: 12 }}>Libellé</strong>
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
                
                <Tooltip title="Requis">
                  <Button
                    type={isRequired ? "primary" : "default"}
                    size="small"
                    style={{ width: 24, height: 24, padding: 0 }}
                    onClick={() => handleRequiredChange(!isRequired)}
                    disabled={props.readOnly || isContainerNode}
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
                    <Select.Option value="file">📎 Fichier (FILE)</Select.Option>
                  </Select>
                )}
              </div>
              
              {/* Bouton Apparence à droite */}
              <div style={{ marginTop: 20 }}>
                <Tooltip title={
                  isContainerNode
                    ? 'Ce type de nœud n\'a pas de panneau d\'apparence'
                    : 'Apparence du champ'
                }>
                  <Button
                    type={appearanceOpen ? "primary" : "default"}
                    size="small"
                    icon={<BgColorsOutlined />}
                    style={{ width: 32, height: 24 }}
                    disabled={props.readOnly || !fieldType || isContainerNode}
                    onClick={() => {
                      setAppearanceOpen(!appearanceOpen);
                    }}
                  />
                </Tooltip>
              </div>
            </div>
          </Space>
        </div>

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
            const findParentBranch = (id?: string | null): TreeBranchLeafNode | null => {
              if (!id) return null;
              let currentId: string | undefined | null = id;
              while (currentId) {
                const node = nodesMap.get(currentId);
                if (!node) break;
                if (node.type === 'branch') return node;
                currentId = node.parentId as string | undefined || undefined;
              }
              return null;
            };

            const parentBranch = findParentBranch(selectedNode.id);
            const parentSubTabs = parentBranch ? (Array.isArray(parentBranch.metadata?.subTabs) ? parentBranch.metadata?.subTabs as string[] : []) : [];

            // Show even if there's only one subTab (developer convenience)
            if (!parentSubTabs || parentSubTabs.length === 0) return null;

            // Small debug log to help diagnose cases where parentSubTabs should exist
            console.debug('[Parameters] parentBranch:', parentBranch?.id, 'parentSubTabs:', parentSubTabs);

            // Support both single and multiple values
            const rawSubTab = selectedNode?.metadata?.subTab;
            const currentValue = Array.isArray(rawSubTab) 
              ? rawSubTab 
              : typeof rawSubTab === 'string' && rawSubTab 
                ? [rawSubTab] 
                : [];

            return (
              <div style={{ marginTop: 12 }}>
                <strong style={{ fontSize: 12 }}>Affectation Sous-onglet</strong>
                <div style={{ marginTop: 6 }}>
                  <Select
                    mode="multiple"
                    size="small"
                    value={currentValue}
                    key={`subtab-select-${selectedNode?.id}`}
                    onChange={(values) => {
                      const nextMeta = { ...(selectedNode?.metadata || {}) } as Record<string, unknown>;
                      if (!values || values.length === 0) {
                        delete nextMeta.subTab;
                      } else if (values.length === 1) {
                        // Single selection: store as string for backward compatibility
                        nextMeta.subTab = values[0];
                      } else {
                        // Multiple selections: store as array
                        nextMeta.subTab = values;
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
              </div>
            );
          })()
        )}

        {/* Section Sous-onglets (visuel) */}
        {selectedNode?.type === 'branch' && (
          <div style={{ marginTop: 12 }}>
            <h5 style={{ marginBottom: 8, fontSize: 14, fontWeight: 600 }}>Sous-onglets (visuel)</h5>
            <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
              {/* Contrôle: sélectionner le sous-onglet du noeud (branche) et optionnellement l'appliquer aux enfants */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: 12 }}>Affectation Sous-onglet (branche)</strong>
                  <div style={{ marginTop: 6 }}>
                    <Select
                      mode="multiple"
                      size="small"
                      value={Array.isArray((selectedNode?.metadata?.subTab))
                        ? (selectedNode?.metadata?.subTab as string[])
                        : typeof (selectedNode?.metadata?.subTab) === 'string' && selectedNode?.metadata?.subTab
                          ? [(selectedNode?.metadata?.subTab as string)]
                          : []
                      }
                      onChange={(values) => {
                        const nextMeta = { ...(selectedNode?.metadata || {}) } as Record<string, unknown>;
                        if (!values || values.length === 0) {
                          delete nextMeta.subTab;
                        } else if (values.length === 1) {
                          nextMeta.subTab = values[0];
                        } else {
                          nextMeta.subTab = values;
                        }
                        // Toujours patcher le noeud courant
                        if (applyToChildrenRef.current && useServerCascade) {
                          patchNode({ metadata: nextMeta, cascadeSubTab: true });
                        } else {
                          patchNode({ metadata: nextMeta });
                        }
                        emitMetadataUpdate(nextMeta);
                        // Si checkbox applyToChildren est cochée, on effectue la propagation
                        const subTabValue = values && values.length > 0 ? values : null;
                        if (applyToChildrenRef.current && subTabValue && !useServerCascade) {
                          // Déclencher propagation asynchrone
                          void (async () => {
                            try {
                              const toAssign: { id: string; meta: Record<string, unknown> }[] = [];
                              const stack2: TreeBranchLeafNode[] = [selectedNode];
                              while (stack2.length) {
                                const n = stack2.pop()!;
                                if (n.children && n.children.length) stack2.push(...n.children);
                                // Apply to all descendant leaf nodes
                                if (n.type && n.type.startsWith('leaf')) {
                                  const nextMeta2 = { ...(n.metadata || {}) } as Record<string, unknown>;
                                  nextMeta2.subTab = subTabValue.length === 1 ? subTabValue[0] : subTabValue;
                                  toAssign.push({ id: n.id, meta: nextMeta2 });
                                }
                                // Also apply to branch nodes that don't define their own subTabs (inheritance)
                                if (n.type === 'branch' || n.type === 'section') {
                                  const hasOwnSubTabs = Array.isArray((n.metadata as any)?.subTabs) && (n.metadata as any).subTabs.length > 0;
                                  if (!hasOwnSubTabs) {
                                    const nextMeta2 = { ...(n.metadata || {}) } as Record<string, unknown>;
                                    nextMeta2.subTab = subTabValue.length === 1 ? subTabValue[0] : subTabValue;
                                    toAssign.push({ id: n.id, meta: nextMeta2 });
                                  }
                                }
                              }
                              if (toAssign.length) {
                                for (const t of toAssign) {
                                  if (typeof onNodeUpdate === 'function') {
                                    await onNodeUpdate({ id: t.id, metadata: t.meta });
                                  }
                                }
                                if (typeof refreshTree === 'function') await Promise.resolve(refreshTree());
                                try { window.dispatchEvent(new CustomEvent('tbl-subtabs-updated', { detail: { nodeId: selectedNode.id, treeId: tree?.id } })); } catch { /* noop */ }
                              }
                            } catch (e) {
                              console.error('❌ [Parameters] Erreur propagation subTab vers enfants:', e);
                            }
                          })();
                        }
                      }}
                      placeholder="Sélectionnez un ou plusieurs sous-onglets"
                      allowClear
                      maxTagCount="responsive"
                      style={{ width: '100%' }}
                    >
                      {branchSubTabs.map(st => <Select.Option key={st} value={st}>{st}</Select.Option>)}
                    </Select>
                  </div>
                </div>
                <div style={{ width: 270, display: 'flex', gap: 6, alignItems: 'center' }}>
                  <label style={{ fontSize: 12, color: '#666' }}>Appliquer aux enfants</label>
                  <Checkbox checked={applyToChildren} onChange={(e) => { setApplyToChildren(e.target.checked); applyToChildrenRef.current = e.target.checked; }} />
                  <div style={{ width: 120, display: 'flex', gap: 6, alignItems: 'center', marginLeft: 8 }}>
                    <label style={{ fontSize: 12, color: '#666' }}>Côté serveur</label>
                    <Checkbox checked={useServerCascade} onChange={(e) => setUseServerCascade(e.target.checked)} />
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#666' }}>Créer des sous-onglets pour organiser visuellement les champs (Affectation via le champ : sélectionnez le champ puis éditez 'Affectation Sous-onglet' dans ses paramètres).</div>
              <SubTabsEditor
                value={Array.isArray(selectedNode?.metadata?.subTabs) ? (selectedNode?.metadata?.subTabs as string[]) : []}
                onChange={(next) => {
                  const nextMetadata = { ...(selectedNode?.metadata || {}), subTabs: next } as Record<string, unknown>;
                  patchNode({ metadata: nextMetadata });
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
                      const toAssign = [] as { id: string; meta: Record<string, unknown> }[];
                      const stack2: TreeBranchLeafNode[] = [selectedNode];
                      while (stack2.length) {
                        const n = stack2.pop()!;
                        if (n.children && n.children.length) stack2.push(...n.children);
                        if (n.type && n.type.startsWith('leaf')) {
                          const nextMeta = { ...(n.metadata || {}) } as Record<string, unknown>;
                          nextMeta.subTab = val;
                          toAssign.push({ id: n.id, meta: nextMeta });
                        }
                      }
                      if (toAssign.length === 0) return;
                      if (useServerCascade) {
                        // Fast path: update the branch with cascade flag (server will update descendants)
                        const nextMetaBranch = { ...(selectedNode?.metadata || {}), subTab: val };
                        if (typeof onNodeUpdate === 'function') {
                          await onNodeUpdate({ id: selectedNode.id, metadata: nextMetaBranch, cascadeSubTab: true } as any);
                        }
                      } else {
                        // Update sequentially to avoid too many POSTs at once
                        for (const t of toAssign) {
                          if (typeof onNodeUpdate === 'function') {
                            await onNodeUpdate({ id: t.id, metadata: t.meta });
                          }
                        }
                      }
                      if (typeof refreshTree === 'function') await Promise.resolve(refreshTree());
                      try { window.dispatchEvent(new CustomEvent('tbl-subtabs-updated', { detail: { nodeId: selectedNode.id, treeId: tree?.id } })); } catch { /* noop */ }
                      console.log('✅ [Parameters] Affectation bulk appliquée:', val, 'sur', toAssign.length, 'champs');
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
                      <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: 6, border: '1px solid #eee', borderRadius: 6 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <div style={{ fontSize: 12, maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label || d.id}</div>
                          <div style={{ fontSize: 11, color: '#666', background: '#f5f5f5', padding: '2px 6px', borderRadius: 4 }}>{assigned}</div>
                        </div>
                        <div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            {/* Remplacer le Select inline par un simple Tag afin d'encourager l'édition depuis le champ */}
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <div>
                                {(meta?.subTab && typeof meta?.subTab === 'string') ? (
                                  <Tag color="blue">{meta.subTab}</Tag>
                                ) : (
                                  <Tag color="default">Aucun</Tag>
                                )}
                              </div>
                            </div>
                            <Button size="small" onClick={() => { if (onSelectNodeId) onSelectNodeId(d.id); }}>Éditer</Button>
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
        {appearanceOpen && fieldType && (
          <div style={{ marginTop: 12, border: '1px solid #e8e8e8', borderRadius: 6, backgroundColor: '#fbfbfb' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #e8e8e8', backgroundColor: '#f7f7f7' }}>
              <strong style={{ fontSize: 12 }}>
                <BgColorsOutlined style={{ marginRight: 6, fontSize: 11 }} />
                Configuration Apparence ({fieldType?.toUpperCase()})
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
              {(() => {
                const fieldTypeUpper = fieldType?.toUpperCase();
                const panelImporter = (FieldAppearancePanels as Record<string, () => Promise<{ default: React.ComponentType<unknown> }>>)[fieldTypeUpper || ''];
                if (!panelImporter) {
                  return (
                    <div style={{ padding: 8, fontSize: 11, color: '#999', textAlign: 'center' }}>
                      Panneau d'apparence pour "{fieldType}" en cours de développement...
                    </div>
                  );
                }
                
                const LazyAppearancePanel = React.lazy(panelImporter);
                return (
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
                        value={selectedNode?.appearanceConfig || {}}
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
                );
              })()}
            </div>
          </div>
        )}

        {/* 🔵 SECTION CHAMPS À RÉPÉTER - Spécifique au repeater */}
        {selectedNode?.type === 'leaf_repeater' && (
          <div>
            <h5 style={{ marginBottom: 12, fontSize: 14, fontWeight: 600, margin: 0 }}>
              🔁 Champs à répéter
            </h5>
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
                  value={repeaterTemplateIds}
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
                    
                    // 🗑️ Supprimer les copies existantes des templates retirés
                    try {
                      const removed = (prevIds || []).filter(id => !nextIds.includes(id));
                      if (removed.length > 0) {
                        console.log('🗑️ [Repeater] Templates retirés → suppression des copies:', removed);
                        const childrenOfRepeater = selectedNodeFromTree?.children || [];
                        for (const templateId of removed) {
                          const copies = childrenOfRepeater.filter(n => {
                            const meta = (n.metadata || {}) as any;
                            return meta?.sourceTemplateId === templateId;
                          });
                          for (const copy of copies) {
                            // Purge metadata.repeater.* non nécessaire si suppression totale du nœud
                            if (typeof onDeleteNode === 'function') {
                              await Promise.resolve(onDeleteNode(copy));
                            } else if (tree) {
                              await api.delete(`/api/treebranchleaf/trees/${tree.id}/nodes/${copy.id}`);
                            }
                          }
                        }
                        // Rafraîchir l'arbre après suppressions
                        if (typeof refreshTree === 'function') {
                          await Promise.resolve(refreshTree());
                        }
                      }
                    } catch (e) {
                      console.warn('⚠️ [Repeater] Échec suppression copies lors du retrait de template:', e);
                    }

                    commitRepeaterMetadata({ 
                      templateNodeIds: selectedIds,
                      templateNodeLabels
                    });
                  }}
                  allowClear
                >
                  {(() => {
                    // Autoriser la sélection de branches/sections entières comme gabarits
                    const allowedTypes: NodeTypeKey[] = ['branch', 'section', 'leaf_field', 'leaf_option', 'leaf_option_field'];
                    const options: { node: TreeBranchLeafNode; path: string[] }[] = [];

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
                      .filter(opt => allowedTypes.includes(opt.node.type as NodeTypeKey))
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
                                  <div key={copy.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                    <div style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                                      <Button danger size="small" icon={<DeleteOutlined />}>
                                        Supprimer
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
                  case 'api':
                    return !!selectedNode?.hasAPI;
                  case 'link':
                    return !!selectedNode?.hasLink;
                  case 'markers':
                    return !!selectedNode?.hasMarkers;
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
                  case 'api': return <ApiOutlined />;
                  case 'link': return <LinkOutlined />;
                  case 'markers': return <TagsOutlined />;
                  default: return <AppstoreOutlined />;
                }
              };
              
              const getButtonType = () => {
                if (hasData) return 'primary'; // Bleu si a des données
                if (isActive) return 'default'; // Gris si activé mais pas de données
                return 'text'; // Très discret si pas activé
              };
              
              return (
                <Tooltip key={cap.key} title={`${cap.label}${hasData ? ' (avec données)' : isActive ? ' (activé)' : ' (désactivé)'}`}>
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
              );
            })}
          </div>

          {/* Panneaux auto-ouverts - TEMPORAIREMENT DÉSACTIVÉS POUR DEBUG */}
          <div style={{ marginTop: 12 }}>
            {capabilities.map(cap => {
              if (!openCaps.has(cap.key)) return null;
              const importer = (CapabilityPanels as Record<string, () => Promise<{ default: React.ComponentType<Record<string, unknown>> }>>)[cap.key];
              if (!importer) return null;
              const LazyPanel = React.lazy(importer);
              return (
                <React.Suspense fallback={<div style={{ padding: 8, fontSize: 12 }}>Chargement {cap.label}…</div>} key={`cap-panel-${cap.key}`}>
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
    </Card>
  );
};

export default Parameters;

