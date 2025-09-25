import React, { useEffect, useMemo, useState } from 'react';
import { TreeSelect, Modal, Space, Tabs, Typography, Alert, Spin, Segmented, Tooltip, List, Input } from 'antd';
import { useAuthenticatedApi } from '../../../../../../hooks/useAuthenticatedApi';

type NodeLite = { id: string; parentId?: string | null; label: string; type: string; subType?: string | null };

export type NodeTreeSelectorValue = {
  kind: 'node' | 'nodeOption' | 'formula' | 'condition';
  ref: string; // @value.{nodeKey} | @select.{nodeKey}[.optionKey] | formula:{id} | condition:{id}
};

type Props = {
  nodeId: string; // contexte pour retrouver treeId
  open: boolean;
  onClose: () => void;
  onSelect: (val: NodeTreeSelectorValue) => void;
  /**
   * Contexte de sélection:
   * - 'token' (par défaut): retourne un token @value.@select selon le type choisi
   * - 'nodeId': utilisé pour l'action ALORS (SHOW) — masque le choix Option/Champ et renvoie @value.{id}
   */
  selectionContext?: 'token' | 'nodeId';
  /**
   * Permet de sélectionner plusieurs références en une seule fois (seulement en mode token)
   */
  allowMulti?: boolean;
};

const NodeTreeSelector: React.FC<Props> = ({ nodeId, open, onClose, onSelect, selectionContext = 'token', allowMulti = false }) => {
  const { api } = useAuthenticatedApi();
  const [nodes, setNodes] = useState<NodeLite[]>([]);
  const [value, setValue] = useState<string | string[] | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenKind, setTokenKind] = useState<'value' | 'option'>('value');
  const [formulasLoading, setFormulasLoading] = useState(false);
  const [formulaSearch, setFormulaSearch] = useState('');
  const [nodeFormulas, setNodeFormulas] = useState<Array<{ id: string; name: string; tokens?: string[] }>>([]);
  const [allNodeFormulas, setAllNodeFormulas] = useState<Array<{ id: string; name: string; tokens?: string[]; nodeLabel?: string; nodeId?: string }>>([]);
  
  // États pour les conditions réutilisables
  const [conditionsLoading, setConditionsLoading] = useState(false);
  const [conditionSearch, setConditionSearch] = useState('');
  const [nodeConditions, setNodeConditions] = useState<Array<{ id: string; name: string; conditionSet?: unknown }>>([]);
  const [allNodeConditions, setAllNodeConditions] = useState<Array<{ id: string; name: string; conditionSet?: unknown; nodeLabel?: string; nodeId?: string }>>([]);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    setLoading(true);
    setError(null);
    setValue(undefined); // Réinitialiser la sélection quand on ouvre
    (async () => {
      try {
        const info = await api.get(`/api/treebranchleaf/nodes/${nodeId}`) as { treeId: string };
        if (!mounted) return;
        const list = await api.get(`/api/treebranchleaf/trees/${info.treeId}/nodes`) as NodeLite[];
        const light: NodeLite[] = list.map(n => ({ id: n.id, parentId: n.parentId, type: n.type, subType: n.subType, label: n.label }));
        setNodes(light);
  } catch {
        // Afficher une erreur explicite au lieu de silencer
        setError("Impossible de charger l'arborescence. Vérifiez vos droits ou réessayez.");
        setNodes([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [api, nodeId, open]);

  // Charger les formules réutilisables ET les conditions réutilisables quand l'onglet est ouvert
  useEffect(() => {
    if (!open) return;
    let mounted = true;
    setFormulasLoading(true);
    setConditionsLoading(true);
    (async () => {
      try {
        // Charger TOUTES les formules depuis TreeBranchLeafNodeFormula
        const allFormulasRes = await api.get('/api/treebranchleaf/reusables/formulas') as { 
          items?: Array<{ 
            id: string; 
            name: string; 
            tokens?: string[];
            type: 'node';
            nodeLabel?: string;
            treeId?: string;
            nodeId?: string;
          }> 
        };
        
        const allFormulas = allFormulasRes?.items || [];
        
        // Séparer les formules du nœud actuel vs les autres
        const currentNodeFormulas = allFormulas.filter(f => f.nodeId === nodeId);
        const otherFormulas = allFormulas.filter(f => f.nodeId !== nodeId);
        
        if (!mounted) return;
        setNodeFormulas(currentNodeFormulas);
        setAllNodeFormulas(otherFormulas);
      } catch {
        // ignore, onglet non bloquant
      } finally {
        if (mounted) setFormulasLoading(false);
      }

      try {
        // Charger TOUTES les conditions depuis TreeBranchLeafNodeCondition
        const allConditionsRes = await api.get('/api/treebranchleaf/reusables/conditions') as { 
          items?: Array<{ 
            id: string; 
            name: string; 
            conditionSet?: unknown;
            type: 'node';
            nodeLabel?: string;
            treeId?: string;
            nodeId?: string;
          }> 
        };
        
        const allConditions = allConditionsRes?.items || [];
        
        // Séparer les conditions du nœud actuel vs les autres
        const currentNodeConditions = allConditions.filter(c => c.nodeId === nodeId);
        const otherConditions = allConditions.filter(c => c.nodeId !== nodeId);
        
        if (!mounted) return;
        setNodeConditions(currentNodeConditions);
        setAllNodeConditions(otherConditions);
      } catch {
        // ignore, onglet non bloquant
      } finally {
        if (mounted) setConditionsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [api, nodeId, open]);

  const treeData = useMemo(() => {
    const byParent: Record<string, NodeLite[]> = {};
    nodes.forEach(n => {
      const p = n.parentId || 'root';
      (byParent[p] ||= []).push(n);
    });
  type TreeNode = { title: string; value: string; key: string; disabled?: boolean; children?: TreeNode[] };
  const toTree = (parent: string | null): TreeNode[] => {
      const kids = byParent[parent || 'root'] || [];
      return kids.map(k => {
        const base: TreeNode = {
          title: `${k.label} (${k.type}${k.subType ? ':' + k.subType : ''})`,
          value: k.id,
          key: k.id,
          disabled: k.type === 'tree' || k.type === 'branch'
        };
        const realChildren = toTree(k.id);
        // Ajouter des sous-entrées virtuelles pour séparer Option vs Champ (uniquement en mode token)
        const virtuals: TreeNode[] = [];
        if (selectionContext === 'token' && k.type === 'leaf_option_field') {
          virtuals.push(
            { title: 'Option (O)', value: `${k.id}::option`, key: `${k.id}::option` },
            { title: 'Champ (C)', value: `${k.id}::field`, key: `${k.id}::field` }
          );
        }
        const children = [...virtuals, ...realChildren];
        return children.length ? { ...base, children } : base;
      });
    };
    return toTree(null);
  }, [nodes, selectionContext]);

  const nodesById = useMemo(() => {
    const map: Record<string, NodeLite> = {};
    nodes.forEach(n => { map[n.id] = n; });
    return map;
  }, [nodes]);

  // Synchroniser le type de token selon le type de nœud choisi
  useEffect(() => {
    if (!value || Array.isArray(value)) return;
    const n = nodesById[value];
    if (!n) return;
    if (selectionContext === 'nodeId') {
      setTokenKind('value');
      return;
    }
    if (n.type === 'leaf_option') setTokenKind('option');
    else setTokenKind('value'); // leaf_field ou leaf_option_field → défaut: valeur
  }, [value, nodesById, selectionContext]);

  const handleOk = () => {
    if (!value || (Array.isArray(value) && value.length === 0)) return onClose();
    // Mode ALORS (SHOW) → toujours id de nœud via @value.{id} pour compat (pas de multi)
    if (selectionContext === 'nodeId') {
      if (Array.isArray(value)) {
        // Sécurité: ne pas gérer multi en nodeId
        const first = value[0];
        onSelect({ kind: 'node', ref: `@value.${first}` });
      } else {
        onSelect({ kind: 'node', ref: `@value.${value}` });
      }
      onClose();
      return;
    }
    // Mode token → multi ou simple
    const values = Array.isArray(value) ? value : [value];
    for (const v of values) {
      // Cas formules (toutes sont maintenant des formules de nœuds)
      if (String(v).startsWith('node-formula:')) {
        const formulaId = String(v).replace('node-formula:', '');
        onSelect({ kind: 'formula', ref: `node-formula:${formulaId}` });
        continue;
      }
      // Cas conditions réutilisables
      if (String(v).startsWith('condition:') || String(v).startsWith('node-condition:')) {
        const conditionId = String(v).replace(/^(node-)?condition:/, '');
        onSelect({ kind: 'condition', ref: `condition:${conditionId}` });
        continue;
      }
      const isVirtual = String(v).includes('::');
      if (isVirtual) {
        const [nodeKey, kind] = String(v).split('::');
        if (kind === 'option') onSelect({ kind: 'nodeOption', ref: `@select.${nodeKey}` });
        else onSelect({ kind: 'node', ref: `@value.${nodeKey}` });
        continue;
      }
      const node = nodesById[String(v)];
      const useOption = tokenKind === 'option' || node?.type === 'leaf_option';
      const ref = useOption ? `@select.${v}` : `@value.${v}`;
      onSelect({ kind: useOption ? 'nodeOption' : 'node', ref });
    }
    onClose();
  };

  return (
    <Modal
      title="Sélectionner dans l'arborescence"
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText="Sélectionner"
      okButtonProps={{ disabled: !value, loading }}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        {error && (
          <Alert type="error" showIcon message={error} style={{ marginBottom: 8 }} />
        )}
        <Tabs
          items={[
            { key: 'nodes', label: 'Champs & Options', children: (
              <div>
                {loading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Spin size="small" />
                    <Typography.Text>Chargement des nœuds…</Typography.Text>
                  </div>
                ) : nodes.length === 0 ? (
                  <Typography.Text type="secondary">Aucun nœud disponible.</Typography.Text>
                ) : (
                  <Space direction="vertical" style={{ width: '100%' }} size={8}>
                    <TreeSelect<string | string[]>
                      style={{ width: '100%' }}
                      treeData={treeData}
                      placeholder="Choisissez un nœud"
                      value={value}
                      onChange={(v) => setValue(v)}
                      // Replié par défaut (ne pas utiliser treeDefaultExpandAll)
                      showSearch
                      treeLine
                      treeIcon={false}
                      {...(selectionContext === 'token' && allowMulti ? { treeCheckable: true, showCheckedStrategy: TreeSelect.SHOW_CHILD } : {})}
                    />
                    {(() => {
                      if (!value) return null;
                      if (Array.isArray(value)) return null; // pas d'interrupteur en multi
                      const n = nodesById[value];
                      if (!n) return null;
                      if (selectionContext === 'nodeId') return null; // pas de choix en mode ALORS
                      if (String(value).includes('::')) return null; // sous-entrée virtuelle déjà explicite
                      const isCombined = n.type === 'leaf_option_field';
                      const isOptionOnly = n.type === 'leaf_option';
                      const isFieldOnly = n.type === 'leaf_field';
                      if (isOptionOnly || isFieldOnly || isCombined) {
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Typography.Text type="secondary">Type de référence</Typography.Text>
                            <Segmented
                              size="small"
                              options={[
                                { label: 'Valeur du champ', value: 'value', disabled: isOptionOnly },
                                { label: 'Option sélectionnée', value: 'option', disabled: isFieldOnly },
                              ]}
                              value={tokenKind}
                              onChange={(v) => setTokenKind(v as 'value' | 'option')}
                            />
                            {isCombined && (
                              <Tooltip title="Ce champ combine une option et une valeur. Choisissez ce que vous souhaitez référencer.">
                                <Typography.Text type="secondary">(O+C)</Typography.Text>
                              </Tooltip>
                            )}
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </Space>
                )}
              </div>
            )},
            { key: 'formulas', label: 'Formules (réutilisables)', children: (
              <Space direction="vertical" style={{ width: '100%' }} size={8}>
                <Input
                  size="small"
                  placeholder="Rechercher une formule…"
                  value={formulaSearch}
                  onChange={(e) => setFormulaSearch(e.target.value)}
                />
                {formulasLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Spin size="small" />
                    <Typography.Text>Chargement des formules…</Typography.Text>
                  </div>
                ) : (
                  <Space direction="vertical" style={{ width: '100%' }} size={12}>
                    {/* Formules du nœud actuel */}
                    {nodeFormulas.length > 0 && (
                      <>
                        <Typography.Text strong style={{ fontSize: '12px', color: '#666' }}>
                          📍 Formules de ce nœud
                        </Typography.Text>
                        <List
                          size="small"
                          bordered
                          dataSource={nodeFormulas.filter(f => !formulaSearch || f.name.toLowerCase().includes(formulaSearch.toLowerCase()))}
                          renderItem={(item) => {
                            const isSelected = value === `node-formula:${item.id}`;
                            return (
                              <List.Item
                                onClick={() => setValue(`node-formula:${item.id}`)}
                                style={{ 
                                  cursor: 'pointer', 
                                  backgroundColor: isSelected ? '#1890ff' : '#f0f9ff',
                                  color: isSelected ? 'white' : 'inherit'
,
                                }}
                              >
                                <Space>
                                  <span>🧮</span>
                                  <Typography.Text style={{ color: isSelected ? 'white' : 'inherit' }}>
                                    {item.name}
                                  </Typography.Text>
                                  <Typography.Text 
                                    type="secondary" 
                                    style={{ 
                                      fontSize: '11px',
                                      color: isSelected ? 'rgba(255,255,255,0.7)' : undefined
                                    }}
                                  >
                                    (ce nœud)
                                  </Typography.Text>
                                  {isSelected && <span>✓</span>}
                                </Space>
                              </List.Item>
                            );
                          }}
                        />
                      </>
                    )}
                    
                    {/* Formules d'autres nœuds */}
                    {allNodeFormulas.length > 0 && (
                      <>
                        <Typography.Text strong style={{ fontSize: '12px', color: '#666' }}>
                          � Formules d'autres nœuds (réutilisables)
                        </Typography.Text>
                        <List
                          size="small"
                          bordered
                          dataSource={allNodeFormulas.filter(f => !formulaSearch || f.name.toLowerCase().includes(formulaSearch.toLowerCase()))}
                          renderItem={(item) => {
                            const isSelected = value === `node-formula:${item.id}`;
                            return (
                              <List.Item
                                onClick={() => setValue(`node-formula:${item.id}`)}
                                style={{ 
                                  cursor: 'pointer', 
                                  backgroundColor: isSelected ? '#1890ff' : '#fefce8',
                                  color: isSelected ? 'white' : 'inherit'
,
                                }}
                              >
                                <Space>
                                  <span>🧮</span>
                                  <Typography.Text style={{ color: isSelected ? 'white' : 'inherit' }}>
                                    {item.name}
                                  </Typography.Text>
                                  <Typography.Text 
                                    type="secondary" 
                                    style={{ 
                                      fontSize: '11px',
                                      color: isSelected ? 'rgba(255,255,255,0.7)' : undefined
                                    }}
                                  >
                                    ({item.nodeLabel || 'Nœud inconnu'})
                                  </Typography.Text>
                                  {isSelected && <span>✓</span>}
                                </Space>
                              </List.Item>
                            );
                          }}
                        />
                      </>
                    )}
                    
                    {/* Message si aucune formule */}
                    {nodeFormulas.length === 0 && allNodeFormulas.length === 0 && (
                      <Typography.Text type="secondary">Aucune formule disponible.</Typography.Text>
                    )}
                  </Space>
                )}
              </Space>
            )},
            { key: 'conditions', label: 'Conditions (réutilisables)', children: (
              <Space direction="vertical" style={{ width: '100%' }}>
                {/* Recherche dans les conditions */}
                <Input.Search
                  placeholder="Rechercher une condition..."
                  value={conditionSearch}
                  onChange={(e) => setConditionSearch(e.target.value)}
                  style={{ width: '100%' }}
                />

                {conditionsLoading ? (
                  <Spin>Chargement des conditions...</Spin>
                ) : (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {/* Conditions du nœud actuel */}
                    {nodeConditions.length > 0 && (
                      <>
                        <Typography.Text strong style={{ fontSize: '12px', color: '#666' }}>
                          🎯 Conditions de ce nœud
                        </Typography.Text>
                        <List
                          size="small"
                          bordered
                          dataSource={nodeConditions.filter(c => !conditionSearch || c.name.toLowerCase().includes(conditionSearch.toLowerCase()))}
                          renderItem={(item) => {
                            const isSelected = value === `condition:${item.id}`;
                            return (
                              <List.Item
                                onClick={() => setValue(`condition:${item.id}`)}
                                style={{ 
                                  cursor: 'pointer', 
                                  backgroundColor: isSelected ? '#1890ff' : '#f0f8e8',
                                  color: isSelected ? 'white' : 'inherit'
                                }}
                              >
                                <Space>
                                  <span>⚡</span>
                                  <Typography.Text style={{ color: isSelected ? 'white' : 'inherit' }}>
                                    {item.name}
                                  </Typography.Text>
                                  <Typography.Text 
                                    type="secondary" 
                                    style={{ 
                                      fontSize: '11px',
                                      color: isSelected ? 'rgba(255,255,255,0.7)' : undefined
                                    }}
                                  >
                                    (ce nœud)
                                  </Typography.Text>
                                  {isSelected && <span>✓</span>}
                                </Space>
                              </List.Item>
                            );
                          }}
                        />
                      </>
                    )}
                    
                    {/* Conditions d'autres nœuds */}
                    {allNodeConditions.length > 0 && (
                      <>
                        <Typography.Text strong style={{ fontSize: '12px', color: '#666' }}>
                          🔄 Conditions d'autres nœuds (réutilisables)
                        </Typography.Text>
                        <List
                          size="small"
                          bordered
                          dataSource={allNodeConditions.filter(c => !conditionSearch || c.name.toLowerCase().includes(conditionSearch.toLowerCase()))}
                          renderItem={(item) => {
                            const isSelected = value === `node-condition:${item.id}`;
                            return (
                              <List.Item
                                onClick={() => setValue(`node-condition:${item.id}`)}
                                style={{ 
                                  cursor: 'pointer', 
                                  backgroundColor: isSelected ? '#1890ff' : '#fef3c7',
                                  color: isSelected ? 'white' : 'inherit'
                                }}
                              >
                                <Space>
                                  <span>⚡</span>
                                  <Typography.Text style={{ color: isSelected ? 'white' : 'inherit' }}>
                                    {item.name}
                                  </Typography.Text>
                                  <Typography.Text 
                                    type="secondary" 
                                    style={{ 
                                      fontSize: '11px',
                                      color: isSelected ? 'rgba(255,255,255,0.7)' : undefined
                                    }}
                                  >
                                    ({item.nodeLabel || 'Nœud inconnu'})
                                  </Typography.Text>
                                  {isSelected && <span>✓</span>}
                                </Space>
                              </List.Item>
                            );
                          }}
                        />
                      </>
                    )}
                    
                    {/* Message si aucune condition */}
                    {nodeConditions.length === 0 && allNodeConditions.length === 0 && (
                      <Typography.Text type="secondary">Aucune condition disponible.</Typography.Text>
                    )}
                  </Space>
                )}
              </Space>
            )}
          ]}
        />
      </Space>
    </Modal>
  );
};

export default NodeTreeSelector;
