/**
 * 🌲 Structure - Composant explorateur Windows
 * 
 * Colonne du milieu : hiérarchie des nœuds (Explorateur Windows)
 * - Affichage hiérarchique avec ►/▼
 * - Drag & Drop pour réorganiser
 * - Badges pour les capacit      result.push({ node, level });
      // console.log(`🔧 [Structure flattenNodes] Added ${node.label} at level ${level}, hasChildren: ${!!node.children?.length}, isExpanded: ${expandedNodes.has(node.id)}`);

      // Récursion pour les enfants uniquement si le nœud est marqué comme étendu
      if (node.children && expandedNodes.has(node.id)) {
        // console.log(`🔧 [Structure flattenNodes] Recursing into ${node.children.length} children of ${node.label}`);
        flattenNodes(node.children, level + 1, result);
      }es
 * - Recherche et filtres
 * - Virtualisation pour les performances
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { 
  Input, 
  Space, 
  Button,  
  Typography,
  Empty,
  Tooltip,
  Popover,
  Checkbox,
  Divider,
  Badge,
  Switch
} from 'antd';
import { 
  SearchOutlined, 
  FilterOutlined, 
  ExpandOutlined, 
  CompressOutlined
} from '@ant-design/icons';
import { OptimizedStructureNode } from './OptimizedStructureNode';
import type { 
  TreeBranchLeafTree, 
  TreeBranchLeafNode, 
  UIState,
  SearchOptions,
  NodeTypeKey,
  CapabilityKey
} from '../../types';

const { Text } = Typography;

interface StructureProps {
  tree: TreeBranchLeafTree | null;
  nodes: TreeBranchLeafNode[];
  selectedNode?: TreeBranchLeafNode;
  expandedNodes: Set<string>;
  searchState: UIState['searchState'];
  // dragState: UIState['dragState'];
  onSelectNode: (node: TreeBranchLeafNode | null) => void;
  onToggleExpanded: (nodeId: string) => void;
  onSearch: (query: string, filters: Record<string, unknown>) => void;
  // onNodeAction: (node: Partial<TreeBranchLeafNode> & { id: string }) => Promise<TreeBranchLeafNode | null>;
  // onCapabilityToggle: (nodeId: string, capability: string, enabled: boolean) => void;
  readOnly?: boolean;
  // registry: typeof TreeBranchLeafRegistry;
  // Actions du menu contextuel
  onEditNode?: (node: TreeBranchLeafNode, newLabel: string) => Promise<void>;
  onDuplicateNode?: (node: TreeBranchLeafNode) => Promise<void>;
  onDeleteNode?: (node: TreeBranchLeafNode) => Promise<void>;
  onMoveUpNode?: (node: TreeBranchLeafNode) => Promise<void>;
  onMoveDownNode?: (node: TreeBranchLeafNode) => Promise<void>;
  onToggleNodeVisibility?: (node: TreeBranchLeafNode) => Promise<void>;
  onOpenNodeSettings?: (node: TreeBranchLeafNode) => void;
  onMoveNodeToRoot?: (node: TreeBranchLeafNode) => Promise<void>;
}

const Structure: React.FC<StructureProps> = ({
  tree,
  nodes,
  selectedNode,
  expandedNodes,
  searchState,
  // dragState,
  onSelectNode,
  onToggleExpanded,
  onSearch,
  // onNodeAction,
  // onCapabilityToggle,
  readOnly = false,
  // registry,
  onEditNode,
  onDuplicateNode,
  onDeleteNode,
  onMoveUpNode,
  onMoveDownNode,
  onToggleNodeVisibility,
  onOpenNodeSettings,
  onMoveNodeToRoot
}) => {
  // 🐛 DEBUG: Logs optimisés pour éviter les re-rendus excessifs
  const _debugData = useMemo(() => ({
    tree: tree?.label || 'aucun arbre',
    nodesCount: nodes?.length || 0,
    nodesData: nodes?.slice(0, 3), // Premiers 3 nœuds pour debug
    selectedNode: selectedNode?.label || 'aucun nœud sélectionné'
  }), [tree?.label, nodes, selectedNode?.label]);

  // Debug logs temporairement supprimés

  const [searchQuery, setSearchQuery] = useState(searchState.query);
  const [filters, setFilters] = useState<SearchOptions>(searchState.filters);
  const lastFiltersSignature = useRef<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const _expandedSignatureRef = useRef<string>('');

  // ExpandedNodes monitoring temporairement supprimé

  // Zone de drop principale pour la Structure
  const {
    setNodeRef: setMainDropRef,
    isOver: isMainDropOver
    // active: mainDropActive // commenté car non utilisé
  } = useDroppable({
    id: 'structure-main-drop',
    data: {
      type: 'structure',
  nodeId: null, // Pas de parent = nœud racine
  accepts: ['palette-item', 'node']
    },
    disabled: readOnly
  });

  // Debug logs pour la zone de drop (réduits)
  // console.log(`🎯 Structure drop zone - isOver: ${isMainDropOver}, active: ${mainDropActive?.id}`);
  // if (isMainDropOver) {
  //   console.log(`🔥 STRUCTURE MAIN DROP - HOVER DÉTECTÉ !`);
  // }

  // Fonctions manquantes pour les boutons
  // Récupérer tous les IDs de nœuds ayant des enfants
  const getAllExpandableIds = useCallback((list: TreeBranchLeafNode[]): string[] => {
    const out: string[] = [];
    const walk = (arr: TreeBranchLeafNode[]) => {
      for (const n of arr) {
        if (n.children && n.children.length) {
          out.push(n.id);
          walk(n.children);
        }
      }
    };
    walk(list);
    return out;
  }, []);

  const handleExpandAll = useCallback(() => {
    const ids = getAllExpandableIds(nodes);
    // N'appeler que pour ceux non encore ouverts
    ids.forEach(id => { if (!expandedNodes.has(id)) onToggleExpanded(id); });
  }, [expandedNodes, getAllExpandableIds, nodes, onToggleExpanded]);

  const handleCollapseAll = useCallback(() => {
    const ids = getAllExpandableIds(nodes);
    // Fermer uniquement ceux actuellement ouverts
    ids.forEach(id => { if (expandedNodes.has(id)) onToggleExpanded(id); });
  }, [expandedNodes, getAllExpandableIds, nodes, onToggleExpanded]);

  // Sync des filtres depuis l'état global si changé ailleurs
  useEffect(() => {
    const nextSignature = JSON.stringify(searchState.filters ?? {});
    if (lastFiltersSignature.current !== nextSignature) {
      lastFiltersSignature.current = nextSignature;
      setFilters(searchState.filters as SearchOptions);
    }
  }, [searchState.filters]);

  const legacyTypes: NodeTypeKey[] | undefined = (searchState.filters as unknown as { type?: NodeTypeKey[] })?.type;

  const activeFiltersCount = useMemo(() => {
    let c = 0;
    if (filters?.nodeTypes && filters.nodeTypes.length) c++;
    if (legacyTypes && legacyTypes.length) c++; // compat UIState shape
    if (filters?.capabilities && filters.capabilities.length) c++;
    if (filters?.markers && filters.markers.length) c++;
    if (typeof filters?.hasData === 'boolean') c++;
    if (typeof filters?.isRequired === 'boolean') c++;
    return c;
  }, [filters, legacyTypes]);

  const applyFilters = useCallback((next: SearchOptions) => {
    setFilters(next);
    onSearch(searchQuery, next as unknown as Record<string, unknown>);
  }, [onSearch, searchQuery]);

  const toggleArrayFilter = useCallback(<T,>(arr: T[] | undefined, value: T): T[] => {
    const a = arr ? [...arr] : [];
    const idx = a.findIndex(v => v === value);
    if (idx >= 0) a.splice(idx, 1); else a.push(value);
    return a;
  }, []);

  // Fonction récursive pour construire la liste plate
  const flattenNodes = useCallback((
    nodeList: TreeBranchLeafNode[],
    level = 0,
    result: Array<{ node: TreeBranchLeafNode; level: number }> = []
  ): Array<{ node: TreeBranchLeafNode; level: number }> => {
    
    // Log simplifié (moins verbeux)
    // console.log(`🔧 [Structure flattenNodes] Level ${level}, processing ${nodeList.length} nodes`);
    
    for (const node of nodeList) {
      // Appliquer la recherche texte
      if (searchQuery && !node.label.toLowerCase().includes(searchQuery.toLowerCase())) continue;

      // Appliquer les filtres avancés
  let ok = true;
  const f: SearchOptions = filters || {};
  // type (nouvelle clé nodeTypes ou legacy 'type' dans UIState)
  const types: NodeTypeKey[] | undefined = f.nodeTypes || legacyTypes;
      if (ok && types && types.length) ok = types.includes(node.type as NodeTypeKey);
      // capabilities
      if (ok && f.capabilities && f.capabilities.length) {
        for (const cap of f.capabilities as CapabilityKey[]) {
          const flagMap: Record<CapabilityKey, keyof TreeBranchLeafNode> = {
            data: 'hasData', formula: 'hasFormula', condition: 'hasCondition', table: 'hasTable',
    api: 'hasAPI', link: 'hasLink', markers: 'hasMarkers', validation: 'hasCondition' // no separate flag, best-effort
          };
          const flagKey = flagMap[cap];
      if (flagKey && !(node as unknown as Record<string, unknown>)[flagKey]) { ok = false; break; }
        }
      }
      // hasData / isRequired
      if (ok && typeof f.hasData === 'boolean') ok = !!node.hasData === f.hasData;
      if (ok && typeof f.isRequired === 'boolean') ok = !!node.isRequired === f.isRequired;
      if (!ok) continue;

      result.push({ node, level });
      // flattenNodes log temporairement supprimé

  // Récursion pour les enfants uniquement si le nœud est marqué comme étendu
  if (node.children && expandedNodes.has(node.id)) {
        // Recursion log temporairement supprimé
        flattenNodes(node.children, level + 1, result);
      }
    }

    return result;
  }, [searchQuery, expandedNodes, filters, legacyTypes]);

  // Rendu de la liste aplatie
  const flattenedNodes = useMemo(() => {
    return flattenNodes(nodes);
  }, [flattenNodes, nodes]);

  // FlattenedNodes recalculated log temporairement supprimé

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    onSearch(query, filters as unknown as Record<string, unknown>);
  }, [filters, onSearch]);

  if (!tree) {
    return (
      <div 
        ref={setMainDropRef}
        style={{ 
          padding: '40px',
          minHeight: '200px',
          backgroundColor: isMainDropOver ? '#f6ffed' : 'transparent',
          border: isMainDropOver ? '2px dashed #52c41a' : '1px dashed #d9d9d9',
          borderRadius: '4px',
          transition: 'all 0.3s ease'
        }}
      >
        <Empty 
          description="Aucun arbre sélectionné" 
        />
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div 
        ref={setMainDropRef}
        style={{ 
          padding: '40px',
          minHeight: '200px',
          backgroundColor: isMainDropOver ? '#f6ffed' : 'transparent',
          border: isMainDropOver ? '2px dashed #52c41a' : '1px dashed #d9d9d9',
          borderRadius: '4px',
          transition: 'all 0.3s ease'
        }}
      >
        <Empty 
          description="Arbre vide"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Text type="secondary">
            Glissez des éléments de la Palette pour commencer
          </Text>
        </Empty>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      
      {/* Barre d'outils */}
      <div style={{ marginBottom: '8px', padding: '6px', backgroundColor: '#fafafa', borderRadius: '4px' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          {/* Recherche */}
          <Input
            placeholder="Rechercher..."
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            style={{ width: '200px' }}
            allowClear
          />

          {/* Actions */}
          <Space>
            <Tooltip title="Tout déplier">
              <Button
                type="text"
                size="small"
                icon={<ExpandOutlined />}
                onClick={handleExpandAll}
              />
            </Tooltip>
            
            <Tooltip title="Tout replier">
              <Button
                type="text"
                size="small"
                icon={<CompressOutlined />}
                onClick={handleCollapseAll}
              />
            </Tooltip>

            <Popover
              trigger="click"
              open={filtersOpen}
              onOpenChange={setFiltersOpen}
              placement="bottomRight"
              content={(
                <div style={{ width: 260 }}>
                  <Text strong>Types</Text>
                  <div style={{ marginTop: 6 }}>
                    {(['branch','leaf_option','leaf_option_field','leaf_field'] as NodeTypeKey[]).map(t => (
                      <div key={t} style={{ marginBottom: 4 }}>
                        <Checkbox
                          checked={!!(((filters.nodeTypes as NodeTypeKey[] | undefined) || legacyTypes || []).includes(t))}
                          onChange={() => {
                            const base: NodeTypeKey[] = (filters.nodeTypes as NodeTypeKey[] | undefined) || legacyTypes || [];
                            const nextTypes = toggleArrayFilter<NodeTypeKey>(base, t);
                            applyFilters({ ...filters, nodeTypes: nextTypes });
                          }}
                        >{t}</Checkbox>
                      </div>
                    ))}
                  </div>

                  <Divider style={{ margin: '8px 0' }} />
                  <Text strong>Capacités</Text>
                  <div style={{ marginTop: 6 }}>
                    {(['data','formula','condition','table','api','link','markers'] as CapabilityKey[]).map(c => (
                      <div key={c} style={{ marginBottom: 4 }}>
                        <Checkbox
                          checked={!!(filters.capabilities || []).includes(c)}
                          onChange={() => {
                            const nextCaps = toggleArrayFilter<CapabilityKey>(filters.capabilities as CapabilityKey[] | undefined, c);
                            applyFilters({ ...filters, capabilities: nextCaps });
                          }}
                        >{c}</Checkbox>
                      </div>
                    ))}
                  </div>

                  <Divider style={{ margin: '8px 0' }} />
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text>Avec données</Text>
                      <Switch
                        checked={typeof filters.hasData === 'boolean' ? filters.hasData : undefined as unknown as boolean}
                        onChange={(v) => applyFilters({ ...filters, hasData: v })}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text>Obligatoire</Text>
                      <Switch
                        checked={typeof filters.isRequired === 'boolean' ? filters.isRequired : undefined as unknown as boolean}
                        onChange={(v) => applyFilters({ ...filters, isRequired: v })}
                      />
                    </div>
                  </Space>
                </div>
              )}
            >
              <Tooltip title="Filtres">
                <Badge count={activeFiltersCount} size="small">
                  <Button
                    type="text"
                    size="small"
                    icon={<FilterOutlined />}
                    onClick={() => setFiltersOpen((o) => !o)}
                  />
                </Badge>
              </Tooltip>
            </Popover>
          </Space>
        </Space>
      </div>

      {/* Liste des nœuds */}
      <div 
        ref={setMainDropRef}
        style={{ 
          flex: 1,
          minHeight: 0,
          border: '1px solid #f0f0f0', 
          borderRadius: '4px',
          overflow: 'auto',
          backgroundColor: isMainDropOver ? '#f6ffed' : 'transparent'
        }}
      >
        {flattenedNodes.length > 0 ? (
          <div style={{ padding: '2px', textAlign: 'left' }}>
            {flattenedNodes.map((item) => {
              const { node, level } = item;
              const isSelected = selectedNode?.id === node.id;
              const isExpanded = expandedNodes.has(node.id);
              const hasChildren = (node.children?.length || 0) > 0;

              return (
                <OptimizedStructureNode
                  key={node.id}
                  node={node}
                  depth={level}
                  isSelected={isSelected}
                  isExpanded={isExpanded}
                  hasChildren={hasChildren}
                  allNodes={flattenedNodes.map(fn => fn.node)}
                  onSelect={onSelectNode}
                  onToggleExpanded={onToggleExpanded}
                  onDoubleClick={(node) => onToggleExpanded(node.id)}
                  readOnly={readOnly}
                  onEditNode={onEditNode}
                  onDuplicateNode={onDuplicateNode}
                  onDeleteNode={onDeleteNode}
                  onMoveUpNode={onMoveUpNode}
                  onMoveDownNode={onMoveDownNode}
                  onToggleNodeVisibility={onToggleNodeVisibility}
                  onOpenNodeSettings={onOpenNodeSettings}
                  onMoveNodeToRoot={onMoveNodeToRoot}
                  onToggleExpandNode={(n)=> onToggleExpanded(n.id)}
                />
              );
            })}
          </div>
        ) : (
          <div style={{ padding: '20px' }}>
            <Text type="secondary">Aucun résultat trouvé</Text>
          </div>
        )}
      </div>

      {/* Statistiques */}
      <div style={{ 
        marginTop: '6px', 
        padding: '2px 6px', 
        fontSize: '10px', 
        color: '#666',
        backgroundColor: '#fafafa',
        borderRadius: '4px'
      }}>
        {flattenedNodes.length} élément{flattenedNodes.length > 1 ? 's' : ''} 
        {searchQuery && ` • Filtrés par "${searchQuery}"`}
      </div>

    </div>
  );
};

export default Structure;
