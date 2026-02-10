import React, { useEffect, useMemo, useState } from 'react';
import { TreeSelect, Modal, Space, Tabs, Typography, Alert, Spin, Segmented, Tooltip, List, Input } from 'antd';
import { useAuthenticatedApi } from '../../../../../../hooks/useAuthenticatedApi';

type NodeLite = { id: string; parentId?: string | null; label: string; type: string; subType?: string | null };

export type NodeTreeSelectorValue = {
  kind: 'node' | 'nodeOption' | 'formula' | 'condition';
  ref: string; // @value.{nodeKey} | @select.{nodeKey}[.optionKey] | formula:{id} | condition:{id}
  name?: string; // Nom de la capacité sélectionnée (table, formule, condition)
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

// Helper pour obtenir la couleur selon la catégorie
const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    'technique': '#1890ff',
    'commercial': '#52c41a',
    'administratif': '#faad14',
    'client': '#722ed1',
  };
  return colors[category.toLowerCase()] || '#8c8c8c';
};

// Variables prédéfinies pour les données Client/Lead
const LEAD_VARIABLES = [
  { key: 'lead.firstName', label: 'Prénom', icon: '👤' },
  { key: 'lead.lastName', label: 'Nom', icon: '👤' },
  { key: 'lead.fullName', label: 'Nom complet', icon: '👤' },
  { key: 'lead.email', label: 'Email', icon: '📧' },
  { key: 'lead.phone', label: 'Téléphone', icon: '📞' },
  { key: 'lead.mobile', label: 'Mobile', icon: '📱' },
  { key: 'lead.company', label: 'Société', icon: '🏢' },
  { key: 'lead.vatNumber', label: 'N° TVA', icon: '🧾' },
  { key: 'lead.address', label: 'Adresse', icon: '📍' },
  { key: 'lead.street', label: 'Rue', icon: '🛤️' },
  { key: 'lead.number', label: 'Numéro', icon: '🔢' },
  { key: 'lead.box', label: 'Boîte', icon: '📦' },
  { key: 'lead.postalCode', label: 'Code postal', icon: '📮' },
  { key: 'lead.city', label: 'Ville', icon: '🏙️' },
  { key: 'lead.country', label: 'Pays', icon: '🌍' },
  { key: 'lead.notes', label: 'Notes', icon: '📝' },
];

// Variables prédéfinies pour les données Devis
const QUOTE_VARIABLES = [
  { key: 'quote.number', label: 'N° de devis', icon: '📄' },
  { key: 'quote.date', label: 'Date', icon: '📅' },
  { key: 'quote.validUntil', label: 'Validité', icon: '⏰' },
  { key: 'quote.totalHT', label: 'Total HT', icon: '💰' },
  { key: 'quote.totalTVA', label: 'Total TVA', icon: '💶' },
  { key: 'quote.totalTTC', label: 'Total TTC', icon: '💵' },
  { key: 'quote.status', label: 'Statut', icon: '📊' },
  { key: 'quote.reference', label: 'Référence', icon: '🔖' },
];

// Variables prédéfinies pour les données Organisation
const ORG_VARIABLES = [
  { key: 'org.name', label: 'Nom société', icon: '🏛️' },
  { key: 'org.email', label: 'Email', icon: '📧' },
  { key: 'org.phone', label: 'Téléphone', icon: '📞' },
  { key: 'org.address', label: 'Adresse complète', icon: '📍' },
  { key: 'org.vatNumber', label: 'N° TVA', icon: '🧾' },
  { key: 'org.bankAccount', label: 'Compte bancaire', icon: '🏦' },
  { key: 'org.website', label: 'Site web', icon: '🌐' },
];

const NodeTreeSelector: React.FC<Props> = ({ nodeId, open, onClose, onSelect, selectionContext = 'token', allowMulti = false }) => {
  const { api } = useAuthenticatedApi();
  const [nodes, setNodes] = useState<NodeLite[]>([]);
  const [value, setValue] = useState<string | string[] | undefined>(undefined);
  const [selectedName, setSelectedName] = useState<string | undefined>(undefined); // 🎯 Nom de la capacité sélectionnée
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenKind, setTokenKind] = useState<'value' | 'option'>('value');
  const [formulasLoading, setFormulasLoading] = useState(false);
  const [formulaSearch, setFormulaSearch] = useState('');
  const [nodeFormulas, setNodeFormulas] = useState<Array<{ id: string; name: string; tokens?: string[] }>>([]);
  const [allNodeFormulas, setAllNodeFormulas] = useState<Array<{ id: string; name: string; tokens?: string[]; nodeLabel?: string; nodeId?: string }>>([]);
  
  // État pour l'onglet actif (système de tabs personnalisé) - commence sur Client
  const [activeTab, setActiveTab] = useState<string>('client');
  
  // États pour les conditions réutilisables
  const [conditionsLoading, setConditionsLoading] = useState(false);
  const [conditionSearch, setConditionSearch] = useState('');
  const [nodeConditions, setNodeConditions] = useState<Array<{ id: string; name: string; conditionSet?: unknown }>>([]);
  const [allNodeConditions, setAllNodeConditions] = useState<Array<{ id: string; name: string; conditionSet?: unknown; nodeLabel?: string; nodeId?: string }>>([]);
  
  // États pour les tables réutilisables
  const [tablesLoading, setTablesLoading] = useState(false);
  const [tableSearch, setTableSearch] = useState('');
  const [nodeTables, setNodeTables] = useState<Array<{ id: string; name: string; type?: string }>>([]);
  const [allNodeTables, setAllNodeTables] = useState<Array<{ id: string; name: string; type?: string; nodeLabel?: string; nodeId?: string }>>([]);
  
  // États pour les champs répétiteurs
  const [repeatersLoading, setRepeatersLoading] = useState(false);
  const [repeaterSearch, setRepeaterSearch] = useState('');
  const [repeaterFields, setRepeaterFields] = useState<Array<{ 
    id: string; 
    label: string; 
    repeaterLabel: string;
    repeaterParentId: string;
    nodeLabel?: string; 
    nodeId?: string 
  }>>([]);
  
  // États pour les références partagées
  const [sharedReferencesLoading, setSharedReferencesLoading] = useState(false);
  const [sharedReferenceSearch, setSharedReferenceSearch] = useState('');
  const [sharedReferences, setSharedReferences] = useState<Array<{ 
    id: string; 
    label: string; 
    category?: string;
    description?: string;
    type: string;
    nodeLabel?: string; 
    nodeId?: string 
  }>>([]);
  
  // 🆕 États pour les valeurs calculées (calculatedValue)
  const [calculatedValuesLoading, setCalculatedValuesLoading] = useState(false);
  const [calculatedValueSearch, setCalculatedValueSearch] = useState('');
  const [calculatedValues, setCalculatedValues] = useState<Array<{ 
    id: string; 
    label: string; 
    calculatedValue: string | number | null;
    calculatedBy?: string;
    type: string;
    parentLabel?: string;
  }>>([]);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    setLoading(true);
    setError(null);
    setValue(undefined); // Réinitialiser la sélection quand on ouvre
    setSelectedName(undefined); // 🎯 Réinitialiser le nom aussi
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

  // Charger les formules réutilisables ET les conditions réutilisables ET les tables quand l'onglet est ouvert
  useEffect(() => {
    if (!open) return;
    let mounted = true;
    setFormulasLoading(true);
    setConditionsLoading(true);
    setTablesLoading(true);
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

      try {
        // Charger TOUTES les tables depuis TreeBranchLeafNodeTable
        const allTablesRes = await api.get('/api/treebranchleaf/reusables/tables') as { 
          items?: Array<{ 
            id: string; 
            name: string; 
            type?: string;
            nodeLabel?: string;
            treeId?: string;
            nodeId?: string;
          }> 
        };
        
        const allTables = allTablesRes?.items || [];
        
        // Séparer les tables du nœud actuel vs les autres
        const currentNodeTables = allTables.filter(t => t.nodeId === nodeId);
        const otherTables = allTables.filter(t => t.nodeId !== nodeId);
        
        if (!mounted) return;
        setNodeTables(currentNodeTables);
        setAllNodeTables(otherTables);
      } catch {
        // ignore, onglet non bloquant
      } finally {
        if (mounted) setTablesLoading(false);
      }

      // Charger les champs répétiteurs (instances)
      try {
        setRepeatersLoading(true);
        const info = await api.get(`/api/treebranchleaf/nodes/${nodeId}`) as { treeId: string };
        const repeaterFieldsRes = await api.get(`/api/treebranchleaf/trees/${info.treeId}/repeater-fields`) as Array<{
          id: string;
          label: string;
          repeaterLabel: string;
          repeaterParentId: string;
          nodeLabel?: string;
          nodeId?: string;
        }>;
        
        if (!mounted) return;
        setRepeaterFields(repeaterFieldsRes || []);
      } catch {
        // ignore, onglet non bloquant
      } finally {
        if (mounted) setRepeatersLoading(false);
      }

      // Charger les références partagées
      try {
        setSharedReferencesLoading(true);
        const info = await api.get(`/api/treebranchleaf/nodes/${nodeId}`) as { treeId: string };
        const sharedRefsRes = await api.get(`/api/treebranchleaf/trees/${info.treeId}/shared-references`) as Array<{
          id: string;
          label: string;
          category?: string;
          description?: string;
          type: string;
          nodeLabel?: string;
          nodeId?: string;
        }>;
        
        if (!mounted) return;
        setSharedReferences(sharedRefsRes || []);
      } catch {
        // ignore, onglet non bloquant - l'API peut ne pas exister encore
        console.warn('[NodeTreeSelector] Impossible de charger les références partagées');
      } finally {
        if (mounted) setSharedReferencesLoading(false);
      }

      // 🆕 Charger les valeurs calculées (champs avec calculatedValue)
      try {
        setCalculatedValuesLoading(true);
        const info = await api.get(`/api/treebranchleaf/nodes/${nodeId}`) as { treeId: string };
        const calculatedRes = await api.get(`/api/treebranchleaf/trees/${info.treeId}/calculated-values`) as Array<{
          id: string;
          label: string;
          calculatedValue: string | number | null;
          calculatedBy?: string;
          type: string;
          parentLabel?: string;
        }>;
        
        if (!mounted) return;
        setCalculatedValues(calculatedRes || []);
      } catch {
        // ignore, onglet non bloquant - l'API peut ne pas exister encore
        console.warn('[NodeTreeSelector] Impossible de charger les valeurs calculées');
      } finally {
        if (mounted) setCalculatedValuesLoading(false);
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
        // 🔥 NOUVEAU: Permettre la sélection des branches (pour récupérer la réponse directement)
        const isBranch = k.type === 'branch';
        const isTree = k.type === 'tree';
        
        const shortId = k.id.length > 8 ? k.id.slice(0, 8) + '…' : k.id;
        const base: TreeNode = {
          title: `${k.label} [${shortId}] (${k.type}${k.subType ? ':' + k.subType : ''})`,
          value: k.id,
          key: k.id,
          disabled: isTree // Seuls les "tree" restent désactivés
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
        // 🔥 NOUVEAU: Ajouter une sous-entrée spéciale pour les branches (réponse directe)
        if (isBranch) {
          virtuals.push({
            title: '📊 Réponse de la branche',
            value: `${k.id}::branch-response`,
            key: `${k.id}::branch-response`
          });
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
    
    // 🆕 Cas variables prédéfinies Client/Devis/Organisation (format {lead.xxx}, {quote.xxx}, {org.xxx})
    if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
      // C'est une variable prédéfinie, on la retourne directement comme référence
      onSelect({ kind: 'node', ref: value });
      onClose();
      return;
    }
    
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
        // 🎯 Utiliser selectedName directement (plus fiable que la recherche)
        onSelect({ kind: 'formula', ref: `node-formula:${formulaId}`, name: selectedName });
        continue;
      }
      // Cas conditions réutilisables
      if (String(v).startsWith('condition:') || String(v).startsWith('node-condition:')) {
        const conditionId = String(v).replace(/^(node-)?condition:/, '');
        // 🎯 Utiliser selectedName directement (plus fiable que la recherche)
        onSelect({ kind: 'condition', ref: `condition:${conditionId}`, name: selectedName });
        continue;
      }
      // Cas tables réutilisables
      if (String(v).startsWith('table:') || String(v).startsWith('node-table:')) {
        const tableId = String(v).replace(/^(node-)?table:/, '');
        // 🎯 Utiliser selectedName directement (plus fiable que la recherche)
        onSelect({ kind: 'node', ref: `@table.${tableId}`, name: selectedName });
        continue;
      }
      // 🆕 Cas valeurs calculées
      if (String(v).startsWith('calculated:')) {
        const calcNodeId = String(v).replace('calculated:', '');
        onSelect({ kind: 'node', ref: `@calculated.${calcNodeId}` });
        continue;
      }
      const isVirtual = String(v).includes('::');
      if (isVirtual) {
        const [nodeKey, kind] = String(v).split('::');
        // 🔥 NOUVEAU: Traiter la sélection spéciale de branche (réponse directe)
        if (kind === 'branch-response') {
          onSelect({ kind: 'node', ref: `@select.${nodeKey}` });
          continue;
        }
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
      className="node-tree-selector-modal"
      width={700}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        {error && (
          <Alert type="error" showIcon message={error} style={{ marginBottom: 8 }} />
        )}
        {/* Barre d'onglets avec scroll horizontal drag-to-scroll */}
        <style>{`
          .node-tree-tabs-scroll-container::-webkit-scrollbar {
            height: 6px;
          }
          .node-tree-tabs-scroll-container::-webkit-scrollbar-track {
            background: #f0f0f0;
            border-radius: 3px;
          }
          .node-tree-tabs-scroll-container::-webkit-scrollbar-thumb {
            background: #bfbfbf;
            border-radius: 3px;
          }
          .node-tree-tabs-scroll-container::-webkit-scrollbar-thumb:hover {
            background: #999;
          }
          .node-tree-tabs-scroll-container .ant-tabs-nav-list {
            gap: 4px;
          }
          .node-tree-tabs-scroll-container .ant-tabs-tab {
            padding: 6px 12px !important;
            margin: 0 !important;
            border: 1px solid #d9d9d9 !important;
            border-radius: 6px !important;
            background: #fafafa !important;
            transition: all 0.2s ease !important;
          }
          .node-tree-tabs-scroll-container .ant-tabs-tab:hover {
            border-color: #1890ff !important;
            color: #1890ff !important;
          }
          .node-tree-tabs-scroll-container .ant-tabs-tab-active {
            background: #e6f4ff !important;
            border-color: #1890ff !important;
          }
          .node-tree-tabs-scroll-container .ant-tabs-ink-bar {
            display: none !important;
          }
        `}</style>
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key)}
          renderTabBar={(props, DefaultTabBar) => (
            <div 
              className="node-tree-tabs-scroll-container"
              style={{
                overflowX: 'auto',
                overflowY: 'hidden',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'thin',
                cursor: 'grab',
              }}
              onMouseDown={(e) => {
                // Ne pas déclencher le drag si on clique sur un onglet
                if ((e.target as HTMLElement).closest('.ant-tabs-tab')) return;
                
                const container = e.currentTarget;
                const startX = e.pageX;
                const scrollLeftStart = container.scrollLeft;
                container.style.cursor = 'grabbing';
                
                const onMouseMove = (moveE: MouseEvent) => {
                  const walk = (moveE.pageX - startX) * 1.5;
                  container.scrollLeft = scrollLeftStart - walk;
                };
                
                const onMouseUp = () => {
                  container.style.cursor = 'grab';
                  document.removeEventListener('mousemove', onMouseMove);
                  document.removeEventListener('mouseup', onMouseUp);
                };
                
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
              }}
            >
              <DefaultTabBar {...props} style={{ margin: 0, minWidth: 'max-content' }} />
            </div>
          )}
          items={[
            // ===== DONNÉES CLIENT =====
            { key: 'client', label: '👤 Client', children: (
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
                  Sélectionnez une donnée du client/lead pour l'insérer
                </Typography.Text>
                <List
                  size="small"
                  bordered
                  dataSource={LEAD_VARIABLES}
                  renderItem={(item) => {
                    const isSelected = value === `{${item.key}}`;
                    return (
                      <List.Item
                        onClick={() => setValue(`{${item.key}}`)}
                        style={{ 
                          cursor: 'pointer', 
                          backgroundColor: isSelected ? '#1890ff' : undefined,
                          color: isSelected ? 'white' : undefined,
                          padding: '8px 12px',
                        }}
                      >
                        <Space>
                          <span>{item.icon}</span>
                          <Typography.Text style={{ color: isSelected ? 'white' : undefined }}>
                            {item.label}
                          </Typography.Text>
                          <Typography.Text 
                            type="secondary" 
                            style={{ 
                              fontSize: 11, 
                              fontFamily: 'monospace',
                              color: isSelected ? 'rgba(255,255,255,0.7)' : '#999'
                            }}
                          >
                            {`{${item.key}}`}
                          </Typography.Text>
                          {isSelected && <span>✓</span>}
                        </Space>
                      </List.Item>
                    );
                  }}
                />
              </div>
            )},
            // ===== DONNÉES DEVIS =====
            { key: 'devis', label: '📄 Devis', children: (
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
                  Sélectionnez une donnée du devis pour l'insérer
                </Typography.Text>
                <List
                  size="small"
                  bordered
                  dataSource={QUOTE_VARIABLES}
                  renderItem={(item) => {
                    const isSelected = value === `{${item.key}}`;
                    return (
                      <List.Item
                        onClick={() => setValue(`{${item.key}}`)}
                        style={{ 
                          cursor: 'pointer', 
                          backgroundColor: isSelected ? '#52c41a' : undefined,
                          color: isSelected ? 'white' : undefined,
                          padding: '8px 12px',
                        }}
                      >
                        <Space>
                          <span>{item.icon}</span>
                          <Typography.Text style={{ color: isSelected ? 'white' : undefined }}>
                            {item.label}
                          </Typography.Text>
                          <Typography.Text 
                            type="secondary" 
                            style={{ 
                              fontSize: 11, 
                              fontFamily: 'monospace',
                              color: isSelected ? 'rgba(255,255,255,0.7)' : '#999'
                            }}
                          >
                            {`{${item.key}}`}
                          </Typography.Text>
                          {isSelected && <span>✓</span>}
                        </Space>
                      </List.Item>
                    );
                  }}
                />
              </div>
            )},
            // ===== DONNÉES ORGANISATION =====
            { key: 'organisation', label: '🏛️ Société', children: (
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
                  Sélectionnez une donnée de votre société pour l'insérer
                </Typography.Text>
                <List
                  size="small"
                  bordered
                  dataSource={ORG_VARIABLES}
                  renderItem={(item) => {
                    const isSelected = value === `{${item.key}}`;
                    return (
                      <List.Item
                        onClick={() => setValue(`{${item.key}}`)}
                        style={{ 
                          cursor: 'pointer', 
                          backgroundColor: isSelected ? '#722ed1' : undefined,
                          color: isSelected ? 'white' : undefined,
                          padding: '8px 12px',
                        }}
                      >
                        <Space>
                          <span>{item.icon}</span>
                          <Typography.Text style={{ color: isSelected ? 'white' : undefined }}>
                            {item.label}
                          </Typography.Text>
                          <Typography.Text 
                            type="secondary" 
                            style={{ 
                              fontSize: 11, 
                              fontFamily: 'monospace',
                              color: isSelected ? 'rgba(255,255,255,0.7)' : '#999'
                            }}
                          >
                            {`{${item.key}}`}
                          </Typography.Text>
                          {isSelected && <span>✓</span>}
                        </Space>
                      </List.Item>
                    );
                  }}
                />
              </div>
            )},
            // ===== DONNÉES TBL (Champs & Options) =====
            { key: 'nodes', label: '📋 Champs TBL', children: (
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
                      showSearch
                      treeLine
                      treeIcon={false}
                      {...(selectionContext === 'token' && allowMulti ? { treeCheckable: true, showCheckedStrategy: TreeSelect.SHOW_CHILD } : {})}
                    />
                    {(() => {
                      if (!value) return null;
                      if (Array.isArray(value)) return null;
                      const n = nodesById[value];
                      if (!n) return null;
                      if (selectionContext === 'nodeId') return null;
                      if (String(value).includes('::')) return null;
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
            { key: 'formulas', label: '🧮 Formules', children: (
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
                                onClick={() => { setValue(`node-formula:${item.id}`); setSelectedName(item.name); }}
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
                                    style={{ 
                                      fontSize: '10px',
                                      fontFamily: 'monospace',
                                      color: isSelected ? 'rgba(255,255,255,0.6)' : '#bbb'
                                    }}
                                  >
                                    [{item.id.slice(0, 8)}]
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
                                onClick={() => { setValue(`node-formula:${item.id}`); setSelectedName(item.name); }}
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
                                    style={{ 
                                      fontSize: '10px',
                                      fontFamily: 'monospace',
                                      color: isSelected ? 'rgba(255,255,255,0.6)' : '#bbb'
                                    }}
                                  >
                                    [{item.id.slice(0, 8)}]
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
            { key: 'conditions', label: '⚡ Conditions', children: (
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
                                onClick={() => { setValue(`condition:${item.id}`); setSelectedName(item.name); }}
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
                                    style={{ 
                                      fontSize: '10px',
                                      fontFamily: 'monospace',
                                      color: isSelected ? 'rgba(255,255,255,0.6)' : '#bbb'
                                    }}
                                  >
                                    [{item.id.slice(0, 8)}]
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
                                onClick={() => { setValue(`node-condition:${item.id}`); setSelectedName(item.name); }}
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
                                    style={{ 
                                      fontSize: '10px',
                                      fontFamily: 'monospace',
                                      color: isSelected ? 'rgba(255,255,255,0.6)' : '#bbb'
                                    }}
                                  >
                                    [{item.id.slice(0, 8)}]
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
            )},
            { key: 'tables', label: '📊 Tables', children: (
              <Space direction="vertical" style={{ width: '100%' }}>
                {/* Recherche dans les tables */}
                <Input.Search
                  placeholder="Rechercher une table..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  style={{ width: '100%' }}
                />

                {tablesLoading ? (
                  <Spin>Chargement des tables...</Spin>
                ) : (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {/* Tables du nœud actuel */}
                    {nodeTables.length > 0 && (
                      <>
                        <Typography.Text strong style={{ fontSize: '12px', color: '#666' }}>
                          📊 Tables de ce nœud
                        </Typography.Text>
                        <List
                          size="small"
                          bordered
                          dataSource={nodeTables.filter(t => !tableSearch || t.name.toLowerCase().includes(tableSearch.toLowerCase()))}
                          renderItem={(item) => {
                            const isSelected = value === `table:${item.id}`;
                            return (
                              <List.Item
                                onClick={() => { setValue(`table:${item.id}`); setSelectedName(item.name); }}
                                style={{ 
                                  cursor: 'pointer', 
                                  backgroundColor: isSelected ? '#1890ff' : '#e8f4fd',
                                  color: isSelected ? 'white' : 'inherit'
                                }}
                              >
                                <Space>
                                  <span>🗂️</span>
                                  <Typography.Text style={{ color: isSelected ? 'white' : 'inherit' }}>
                                    {item.name}
                                  </Typography.Text>
                                  <Typography.Text 
                                    style={{ 
                                      fontSize: '10px',
                                      fontFamily: 'monospace',
                                      color: isSelected ? 'rgba(255,255,255,0.6)' : '#bbb'
                                    }}
                                  >
                                    [{item.id.slice(0, 8)}]
                                  </Typography.Text>
                                  <Typography.Text 
                                    type="secondary" 
                                    style={{ 
                                      fontSize: '11px',
                                      color: isSelected ? 'rgba(255,255,255,0.7)' : undefined
                                    }}
                                  >
                                    ({item.type || 'table'}) - (ce nœud)
                                  </Typography.Text>
                                  {isSelected && <span>✓</span>}
                                </Space>
                              </List.Item>
                            );
                          }}
                        />
                      </>
                    )}
                    
                    {/* Tables d'autres nœuds */}
                    {allNodeTables.length > 0 && (
                      <>
                        <Typography.Text strong style={{ fontSize: '12px', color: '#666' }}>
                          🌐 Tables d'autres nœuds (réutilisables)
                        </Typography.Text>
                        <List
                          size="small"
                          bordered
                          dataSource={allNodeTables.filter(t => !tableSearch || t.name.toLowerCase().includes(tableSearch.toLowerCase()))}
                          renderItem={(item) => {
                            const isSelected = value === `node-table:${item.id}`;
                            return (
                              <List.Item
                                onClick={() => { setValue(`node-table:${item.id}`); setSelectedName(item.name); }}
                                style={{ 
                                  cursor: 'pointer', 
                                  backgroundColor: isSelected ? '#1890ff' : '#fff4e6',
                                  color: isSelected ? 'white' : 'inherit'
                                }}
                              >
                                <Space>
                                  <span>🗂️</span>
                                  <Typography.Text style={{ color: isSelected ? 'white' : 'inherit' }}>
                                    {item.name}
                                  </Typography.Text>
                                  <Typography.Text 
                                    style={{ 
                                      fontSize: '10px',
                                      fontFamily: 'monospace',
                                      color: isSelected ? 'rgba(255,255,255,0.6)' : '#bbb'
                                    }}
                                  >
                                    [{item.id.slice(0, 8)}]
                                  </Typography.Text>
                                  <Typography.Text 
                                    type="secondary" 
                                    style={{ 
                                      fontSize: '11px',
                                      color: isSelected ? 'rgba(255,255,255,0.7)' : undefined
                                    }}
                                  >
                                    ({item.type || 'table'}) - ({item.nodeLabel || 'Nœud inconnu'})
                                  </Typography.Text>
                                  {isSelected && <span>✓</span>}
                                </Space>
                              </List.Item>
                            );
                          }}
                        />
                      </>
                    )}
                    
                    {/* Message si aucune table */}
                    {nodeTables.length === 0 && allNodeTables.length === 0 && (
                      <Typography.Text type="secondary">Aucune table disponible.</Typography.Text>
                    )}
                  </Space>
                )}
              </Space>
            )},
            { key: 'repeaters', label: '🔁 Repeat', children: (
              <Space direction="vertical" style={{ width: '100%' }}>
                {/* Recherche dans les champs répétiteurs */}
                <Input.Search
                  placeholder="Rechercher un champ répétiteur..."
                  value={repeaterSearch}
                  onChange={(e) => setRepeaterSearch(e.target.value)}
                  style={{ width: '100%' }}
                />

                {repeatersLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Spin size="small" />
                    <Typography.Text>Chargement des champs répétiteurs...</Typography.Text>
                  </div>
                ) : repeaterFields.length === 0 ? (
                  <Typography.Text type="secondary">Aucun champ répétiteur disponible dans cet arbre.</Typography.Text>
                ) : (
                  <>
                    <Alert
                      type="info"
                      message="Champs issus de repeaters"
                      description="Ces champs sont générés dynamiquement à partir de templates repeater. Format: Nom du repeater - Nom du champ template."
                      showIcon
                      style={{ marginBottom: 8 }}
                    />
                    <List
                      size="small"
                      bordered
                      dataSource={repeaterFields.filter(f => 
                        !repeaterSearch || 
                        f.label.toLowerCase().includes(repeaterSearch.toLowerCase()) ||
                        f.repeaterLabel.toLowerCase().includes(repeaterSearch.toLowerCase())
                      )}
                      renderItem={(item) => {
                        const isSelected = value === item.id;
                        return (
                          <List.Item
                            onClick={() => setValue(item.id)}
                            style={{ 
                              cursor: 'pointer', 
                              backgroundColor: isSelected ? '#1890ff' : '#f0f0f0',
                              color: isSelected ? 'white' : 'inherit',
                              transition: 'all 0.2s'
                            }}
                          >
                            <Space direction="vertical" size={2} style={{ width: '100%' }}>
                              <Space>
                                <span>🔁</span>
                                <Typography.Text strong style={{ color: isSelected ? 'white' : 'inherit' }}>
                                  {item.label}
                                </Typography.Text>
                                <Typography.Text 
                                  style={{ 
                                    fontSize: '10px',
                                    fontFamily: 'monospace',
                                    color: isSelected ? 'rgba(255,255,255,0.6)' : '#bbb'
                                  }}
                                >
                                  [{item.id.slice(0, 8)}]
                                </Typography.Text>
                                {isSelected && <span>✓</span>}
                              </Space>
                              <Typography.Text 
                                type="secondary" 
                                style={{ 
                                  fontSize: '11px',
                                  color: isSelected ? 'rgba(255,255,255,0.8)' : '#666',
                                  paddingLeft: '24px'
                                }}
                              >
                                Repeater: {item.repeaterLabel} {item.nodeLabel ? `(${item.nodeLabel})` : ''}
                              </Typography.Text>
                            </Space>
                          </List.Item>
                        );
                      }}
                    />
                  </>
                )}
              </Space>
            )},
            { key: 'calculatedValues', label: '📊 Valeurs calculées', children: (
              <Space direction="vertical" style={{ width: '100%' }}>
                {/* Recherche dans les valeurs calculées */}
                <Input.Search
                  placeholder="Rechercher une valeur calculée..."
                  value={calculatedValueSearch}
                  onChange={(e) => setCalculatedValueSearch(e.target.value)}
                  style={{ width: '100%' }}
                />

                {calculatedValuesLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Spin size="small" />
                    <Typography.Text>Chargement des valeurs calculées...</Typography.Text>
                  </div>
                ) : calculatedValues.length === 0 ? (
                  <Typography.Text type="secondary">Aucune valeur calculée disponible dans cet arbre.</Typography.Text>
                ) : (
                  <>
                    <Alert
                      type="info"
                      message="Valeurs calculées (calculatedValue)"
                      description="Ces champs ont une valeur calculée par une formule, condition ou table. Utilisez-les comme contraintes dynamiques (min/max) ou comme variables."
                      showIcon
                      style={{ marginBottom: 8 }}
                    />
                    <List
                      size="small"
                      bordered
                      dataSource={calculatedValues.filter(cv => 
                        !calculatedValueSearch || 
                        cv.label.toLowerCase().includes(calculatedValueSearch.toLowerCase()) ||
                        (cv.calculatedBy && cv.calculatedBy.toLowerCase().includes(calculatedValueSearch.toLowerCase()))
                      )}
                      renderItem={(item) => {
                        const isSelected = value === `calculated:${item.id}`;
                        const sourceIcon = item.calculatedBy?.startsWith('formula') ? '🧮' : 
                                          item.calculatedBy?.startsWith('condition') ? '⚡' : 
                                          item.calculatedBy?.startsWith('table') ? '📊' : '📈';
                        return (
                          <List.Item
                            onClick={() => setValue(`calculated:${item.id}`)}
                            style={{ 
                              cursor: 'pointer', 
                              backgroundColor: isSelected ? '#1890ff' : '#f0fff4',
                              color: isSelected ? 'white' : 'inherit',
                              transition: 'all 0.2s',
                              borderLeft: '3px solid #52c41a'
                            }}
                          >
                            <Space direction="vertical" size={2} style={{ width: '100%' }}>
                              <Space>
                                <span>{sourceIcon}</span>
                                <Typography.Text strong style={{ color: isSelected ? 'white' : 'inherit' }}>
                                  {item.label}
                                </Typography.Text>
                                <Typography.Text 
                                  style={{ 
                                    fontSize: '10px',
                                    fontFamily: 'monospace',
                                    color: isSelected ? 'rgba(255,255,255,0.6)' : '#bbb'
                                  }}
                                >
                                  [{item.id.slice(0, 8)}]
                                </Typography.Text>
                                {item.calculatedValue !== null && (
                                  <Typography.Text 
                                    style={{ 
                                      color: isSelected ? 'rgba(255,255,255,0.9)' : '#52c41a',
                                      fontWeight: 'bold'
                                    }}
                                  >
                                    = {item.calculatedValue}
                                  </Typography.Text>
                                )}
                                {isSelected && <span>✓</span>}
                              </Space>
                              <Space size={16} style={{ paddingLeft: '24px' }}>
                                {item.parentLabel && (
                                  <Typography.Text 
                                    type="secondary" 
                                    style={{ 
                                      fontSize: '11px',
                                      color: isSelected ? 'rgba(255,255,255,0.8)' : '#666'
                                    }}
                                  >
                                    📁 {item.parentLabel}
                                  </Typography.Text>
                                )}
                                {item.calculatedBy && (
                                  <Typography.Text 
                                    type="secondary" 
                                    style={{ 
                                      fontSize: '10px',
                                      color: isSelected ? 'rgba(255,255,255,0.7)' : '#999',
                                      fontStyle: 'italic'
                                    }}
                                  >
                                    Source: {item.calculatedBy}
                                  </Typography.Text>
                                )}
                              </Space>
                            </Space>
                          </List.Item>
                        );
                      }}
                    />
                  </>
                )}
              </Space>
            )},
            { key: 'sharedReferences', label: '🔗 Références Partagées', children: (
              <Space direction="vertical" style={{ width: '100%' }}>
                {/* Recherche dans les références partagées */}
                <Input.Search
                  placeholder="Rechercher une référence partagée..."
                  value={sharedReferenceSearch}
                  onChange={(e) => setSharedReferenceSearch(e.target.value)}
                  style={{ width: '100%' }}
                />

                {sharedReferencesLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Spin size="small" />
                    <Typography.Text>Chargement des références partagées...</Typography.Text>
                  </div>
                ) : sharedReferences.length === 0 ? (
                  <Typography.Text type="secondary">Aucune référence partagée disponible dans cet arbre.</Typography.Text>
                ) : (
                  <>
                    <Alert
                      type="info"
                      message="Références partagées"
                      description="Ces champs sont des références partagées qui peuvent être réutilisées dans vos formules et conditions."
                      showIcon
                      style={{ marginBottom: 8 }}
                    />
                    <List
                      size="small"
                      bordered
                      dataSource={sharedReferences.filter(ref => 
                        !sharedReferenceSearch || 
                        ref.label.toLowerCase().includes(sharedReferenceSearch.toLowerCase()) ||
                        (ref.category && ref.category.toLowerCase().includes(sharedReferenceSearch.toLowerCase())) ||
                        (ref.description && ref.description.toLowerCase().includes(sharedReferenceSearch.toLowerCase()))
                      )}
                      renderItem={(item) => {
                        const isSelected = value === item.id;
                        return (
                          <List.Item
                            onClick={() => setValue(item.id)}
                            style={{ 
                              cursor: 'pointer', 
                              backgroundColor: isSelected ? '#1890ff' : '#e6f7ff',
                              color: isSelected ? 'white' : 'inherit',
                              transition: 'all 0.2s',
                              borderLeft: item.category ? `3px solid ${getCategoryColor(item.category)}` : undefined
                            }}
                          >
                            <Space direction="vertical" size={2} style={{ width: '100%' }}>
                              <Space>
                                <span>🔗</span>
                                <Typography.Text strong style={{ color: isSelected ? 'white' : 'inherit' }}>
                                  {item.label}
                                </Typography.Text>
                                <Typography.Text 
                                  style={{ 
                                    fontSize: '10px',
                                    fontFamily: 'monospace',
                                    color: isSelected ? 'rgba(255,255,255,0.6)' : '#bbb'
                                  }}
                                >
                                  [{item.id.slice(0, 8)}]
                                </Typography.Text>
                                {isSelected && <span>✓</span>}
                              </Space>
                              {item.category && (
                                <Typography.Text 
                                  style={{ 
                                    fontSize: '10px',
                                    color: isSelected ? 'rgba(255,255,255,0.9)' : getCategoryColor(item.category),
                                    fontWeight: 'bold',
                                    paddingLeft: '24px',
                                    textTransform: 'uppercase'
                                  }}
                                >
                                  {item.category}
                                </Typography.Text>
                              )}
                              {item.description && (
                                <Typography.Text 
                                  type="secondary" 
                                  style={{ 
                                    fontSize: '11px',
                                    color: isSelected ? 'rgba(255,255,255,0.8)' : '#666',
                                    paddingLeft: '24px',
                                    fontStyle: 'italic'
                                  }}
                                >
                                  {item.description}
                                </Typography.Text>
                              )}
                            </Space>
                          </List.Item>
                        );
                      }}
                    />
                  </>
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
