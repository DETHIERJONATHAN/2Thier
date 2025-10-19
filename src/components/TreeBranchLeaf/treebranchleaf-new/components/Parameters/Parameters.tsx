/**
 * 🔧 Parameters - Panneau de paramètres TreeBranchLeaf
 * 
 * Composant de la colonne droite qui affiche et permet d'éditer
 * les paramètres du nœud sélectionné dans la structure
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, /* Typography, */ Empty, Space, Input, Select, Tooltip, Button, InputNumber, Alert } from 'antd';
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
  TagsOutlined
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
}

const Parameters: React.FC<ParametersProps> = (props) => {
  const { tree, selectedNode, nodes = [], panelState, registry, onNodeUpdate } = props;
  
  // Refs pour cleanup
  const mountedRef = useRef<boolean>(true);

  // 🔐 Hook API authentifié
  const { api } = useAuthenticatedApi();

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
  const hydrationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup au démontage
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 🔁 FONCTION DE DUPLICATION PHYSIQUE DES TEMPLATES
  const duplicateTemplatesPhysically = useCallback(async (templateNodeIds: string[]) => {
    if (!selectedNode?.id || !api) return;
    
    try {
      console.log('🔁 [duplicateTemplatesPhysically] Début duplication:', templateNodeIds);
      
      const response = await api.post(`/api/treebranchleaf/nodes/${selectedNode.id}/duplicate-templates`, {
        templateNodeIds
      });
      
      console.log('✅ [duplicateTemplatesPhysically] Duplication réussie:', response);
      
      // Rafraîchir l'arbre pour afficher les nouveaux enfants
      if (typeof refreshTree === 'function') {
        refreshTree();
      }
    } catch (error) {
      console.error('❌ [duplicateTemplatesPhysically] Erreur:', error);
    }
  }, [selectedNode, api]);

  // 🆕 Référence stable pour onNodeUpdate (évite de recréer le debounce)
  const onNodeUpdateRef = useRef(onNodeUpdate);
  useEffect(() => {
    onNodeUpdateRef.current = onNodeUpdate;
  }, [onNodeUpdate]);

  // Sauvegarde debounced avec l'API optimisée
  const patchNode = useDebouncedCallback(async (payload: Record<string, unknown>) => {
    if (!selectedNodeId) return;
    
    // ✅ Log réduit : seulement en mode debug
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 [Parameters] Sauvegarde:', selectedNodeId);
    }
    
    try {
      // 🔄 NOUVEAU : Flatten appearanceConfig vers metadata.appearance pour compatibilité API
      const apiData = { ...payload };
      if (payload.appearanceConfig) {
        apiData.metadata = {
          ...(apiData.metadata as Record<string, unknown> || {}),
          appearance: payload.appearanceConfig
        };
      }
      
      // ✅ Utiliser la ref pour toujours avoir la dernière version
      await onNodeUpdateRef.current({ ...apiData, id: selectedNodeId });
      
      // ✅ Log de succès réduit
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Sauvegarde OK');
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

  type RepeaterMetadata = {
    templateNodeIds?: string[];
    templateNodeLabels?: Record<string, string>;
    minItems?: number | null;
    maxItems?: number | null;
    addButtonLabel?: string;
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

    patchNode({ metadata: nextMetadata });
    
    // 🔁 DUPLICATION PHYSIQUE : Si des templateNodeIds sont définis, dupliquer les templates
    if (merged.templateNodeIds && merged.templateNodeIds.length > 0) {
      duplicateTemplatesPhysically(merged.templateNodeIds);
    }
  }, [patchNode, selectedNode, repeaterTemplateIds, repeaterMinItems, repeaterMaxItems, repeaterAddLabel, REPEATER_DEFAULT_LABEL, duplicateTemplatesPhysically]);

  const handleMinItemsChange = useCallback((value: number | null) => {
    const numeric = typeof value === 'number' ? value : undefined;
    setRepeaterMinItems(numeric);

    // 🆕 Bloquer l'hydratation pendant la modification
    skipNextHydrationRef.current = true;
    if (hydrationTimeoutRef.current) clearTimeout(hydrationTimeoutRef.current);
    hydrationTimeoutRef.current = setTimeout(() => {
      skipNextHydrationRef.current = false;
    }, 1000);

    if (typeof numeric === 'number' && typeof repeaterMaxItems === 'number' && repeaterMaxItems < numeric) {
      setRepeaterMaxItems(numeric);
      commitRepeaterMetadata({ minItems: numeric, maxItems: numeric });
      return;
    }

    commitRepeaterMetadata({ minItems: numeric });
  }, [commitRepeaterMetadata, repeaterMaxItems]);

  const handleMaxItemsChange = useCallback((value: number | null) => {
    const numeric = typeof value === 'number' ? value : undefined;
    setRepeaterMaxItems(numeric);

    // 🆕 Bloquer l'hydratation pendant la modification
    skipNextHydrationRef.current = true;
    if (hydrationTimeoutRef.current) clearTimeout(hydrationTimeoutRef.current);
    hydrationTimeoutRef.current = setTimeout(() => {
      skipNextHydrationRef.current = false;
    }, 1000);

    if (typeof numeric === 'number' && typeof repeaterMinItems === 'number' && repeaterMinItems > numeric) {
      setRepeaterMinItems(numeric);
      commitRepeaterMetadata({ minItems: numeric, maxItems: numeric });
      return;
    }

    commitRepeaterMetadata({ maxItems: numeric });
  }, [commitRepeaterMetadata, repeaterMinItems]);

  const handleAddLabelChange = useCallback((value: string) => {
    setRepeaterAddLabel(value);
    commitRepeaterMetadata({ addButtonLabel: value });
  }, [commitRepeaterMetadata]);

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
      || nodeType?.defaultFieldType;
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
                          
                          // ✅ SAUVEGARDE SANS .then() pour éviter l'erreur
                          const saveResult = patchNode({ 
                            appearanceConfig: config,
                            ...tblMapping 
                          });
                          
                          // Si c'est une Promise, on peut attendre
                          if (saveResult && typeof saveResult.then === 'function') {
                            saveResult.then(() => {
                              console.log('🎨 [Apparence] Sauvegarde terminée, déclenchement refresh...');
                              
                              // 🔄 DÉCLENCHER UN REFRESH DES DONNÉES TBL
                              if (typeof window !== 'undefined' && window.TBL_FORCE_REFRESH) {
                                console.log('🔄 [Apparence] Refresh TBL déclenché');
                                window.TBL_FORCE_REFRESH();
                              }
                            });
                          } else {
                            // Si ce n'est pas une Promise, on fait le refresh immédiatement
                            console.log('🎨 [Apparence] Sauvegarde debounced, déclenchement refresh...');
                            if (typeof window !== 'undefined' && window.TBL_FORCE_REFRESH) {
                              console.log('🔄 [Apparence] Refresh TBL déclenché');
                              window.TBL_FORCE_REFRESH();
                            }
                          }
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
                  onChange={(values) => {
                    console.log('🎯 [Select onChange] Valeurs sélectionnées:', values);
                    setRepeaterTemplateIds(values as string[]);
                    
                    skipNextHydrationRef.current = true;
                    if (hydrationTimeoutRef.current) clearTimeout(hydrationTimeoutRef.current);
                    hydrationTimeoutRef.current = setTimeout(() => {
                      skipNextHydrationRef.current = false;
                      console.log('✅ [Parameters] Hydratation réactivée');
                    }, 1000);
                    
                    // Construire un map des labels pour chaque template node
                    const templateNodeLabels: Record<string, string> = {};
                    const selectedIds = values as string[];
                    
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
                    
                    commitRepeaterMetadata({ 
                      templateNodeIds: selectedIds,
                      templateNodeLabels
                    });
                  }}
                  allowClear
                >
                  {(() => {
                    const allowedTypes: NodeTypeKey[] = ['leaf_field', 'leaf_option', 'leaf_option_field', 'section'];
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
              const hasData = selectedNode?.config?.[cap.key] && Object.keys(selectedNode.config[cap.key]).length > 0;
              
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

