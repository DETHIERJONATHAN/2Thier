// TreeBranchLeafLayoutV2 - Layout principal 3 colonnes avec drag & drop optimisÃ©
import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Typography, Space, App, Select, Modal, Input, Dropdown, Popconfirm, Button } from 'antd';
import { useParams } from 'react-router-dom';
import { 
  SettingOutlined, 
  BranchesOutlined, 
  AppstoreOutlined,
  ClusterOutlined,
  NodeIndexOutlined,
  EditOutlined,
  TableOutlined,
  CalculatorOutlined,
  ApiOutlined,
  PlusOutlined,
  DeleteOutlined,
  DownOutlined,
  FolderAddOutlined,
  CopyOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import Palette from '../../components/TreeBranchLeaf/components/Palette';
import TreeExplorer from '../../components/TreeBranchLeaf/components/WindowsExplorer/TreeExplorer';
import PropertiesPanel from '../../components/TreeBranchLeaf/PropertiesPanel';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';

const { Text, Title } = Typography;

// Types TreeBranchLeaf
interface TreeBranchLeafNode {
  id: string;
  type: 'branch' | 'leaf' | 'condition' | 'formula' | 'api' | 'link';
  subType?: 'option' | 'field' | 'data' | 'table' | 'calculation';
  label: string;
  description?: string;
  value?: string;
  order: number;
  isRequired: boolean;
  isVisible: boolean;
  isActive: boolean;
  parentId?: string;
  children?: TreeBranchLeafNode[];
  fieldConfig?: Record<string, unknown>;
  conditionConfig?: Record<string, unknown>;
  formulaConfig?: Record<string, unknown>;
  tableConfig?: Record<string, unknown>;
  apiConfig?: Record<string, unknown>;
  linkConfig?: Record<string, unknown>;
  MarkerLinks?: Array<{
    id: string;
    Marker: {
      id: string;
      name: string;
      color: string;
      icon?: string;
    };
  }>;
}

interface TreeBranchLeafTree {
  id: string;
  name: string;
  description?: string;
  status: string;
  color: string;
  icon?: string;
  Nodes: TreeBranchLeafNode[];
  Markers: Array<{
    id: string;
    name: string;
    color: string;
    icon?: string;
    category?: string;
    isGlobal: boolean;
  }>;
  TableData: Array<{
    id: string;
    name: string;
    headers: string[];
    rows: unknown[][];
  }>;
  APIConnections: Array<{
    id: string;
    name: string;
    url: string;
    method: string;
  }>;
}

// Type pour les donnÃ©es de l'API (structure hiÃ©rarchique)
interface ApiTreeNode {
  id: string;
  type: 'branch' | 'leaf' | 'condition' | 'formula' | 'api' | 'link';
  subType?: 'option' | 'field' | 'data' | 'table' | 'calculation';
  label: string;
  description?: string;
  value?: string;
  order?: number;
  isRequired?: boolean;
  isVisible?: boolean;
  isActive?: boolean;
  fieldConfig?: Record<string, unknown>;
  conditionConfig?: Record<string, unknown>;
  formulaConfig?: Record<string, unknown>;
  tableConfig?: Record<string, unknown>;
  apiConfig?: Record<string, unknown>;
  linkConfig?: Record<string, unknown>;
  MarkerLinks?: Array<{
    id: string;
    Marker: {
      id: string;
      name: string;
      color: string;
      icon?: string;
    };
  }>;
  Children?: ApiTreeNode[];
}

// Structure de l'arbre (colonne centrale)
interface TreeStructureProps {
  tree: TreeBranchLeafTree | null;
  selectedNode: TreeBranchLeafNode | null;
  setSelectedNode: (node: TreeBranchLeafNode | null) => void;
  onEditNode?: (node: TreeBranchLeafNode) => void;
  onDeleteNode?: (nodeId: string) => void;
  onAddChildNode?: (parentId: string) => void;
}

const TreeStructure: React.FC<TreeStructureProps> = ({
  tree,
  selectedNode,
  setSelectedNode,
  onEditNode,
  onDeleteNode,
  onAddChildNode,
}) => {
  if (!tree) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0', color: '#8c8c8c' }}>
        <ClusterOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
        <div style={{ fontSize: '16px', marginBottom: '8px' }}>
          Aucun arbre chargÃ©
        </div>
        <div style={{ fontSize: '14px' }}>
          SÃ©lectionnez un arbre pour commencer
        </div>
      </div>
    );
  }

  const getNodeIcon = (type: string, subType?: string) => {
    switch (type) {
      case 'branch':
        return <BranchesOutlined style={{ color: '#52c41a' }} />;
      case 'leaf':
        switch (subType) {
          case 'option':
            return <NodeIndexOutlined style={{ color: '#1890ff' }} />;
          case 'field':
            return <EditOutlined style={{ color: '#722ed1' }} />;
          case 'data':
            return <TableOutlined style={{ color: '#fa8c16' }} />;
          case 'table':
            return <TableOutlined style={{ color: '#eb2f96' }} />;
          default:
            return <NodeIndexOutlined style={{ color: '#1890ff' }} />;
        }
      case 'condition':
        return <SettingOutlined style={{ color: '#fa541c' }} />;
      case 'formula':
        return <CalculatorOutlined style={{ color: '#13c2c2' }} />;
      case 'api':
        return <ApiOutlined style={{ color: '#2f54eb' }} />;
      case 'link':
        return <BranchesOutlined style={{ color: '#a0d911' }} />;
      default:
        return <NodeIndexOutlined />;
    }
  };

  const renderNode = (node: TreeBranchLeafNode, level: number = 0) => {
    const isSelected = selectedNode?.id === node.id;
    const hasChildren = node.children && node.children.length > 0;
    
    // Debug: Log pour chaque nÅ“ud rendu
    console.log(`ðŸŽ¨ [RENDER-NODE] ${node.label}:`, {
      type: node.type,
      hasChildren,
      childrenCount: node.children?.length || 0,
      children: node.children
    });
    
    return (
      <div key={node.id} style={{ marginLeft: level * 20 }}>
        <div
          style={{
            padding: '8px 12px',
            margin: '4px 0',
            border: isSelected ? '2px solid #1890ff' : '1px solid #d9d9d9',
            borderRadius: '4px',
            backgroundColor: isSelected ? '#e6f7ff' : (hasChildren && node.type === 'branch' ? '#f6ffed' : '#ffffff'),
            borderLeft: hasChildren && node.type === 'branch' ? '4px solid #52c41a' : '2px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            // DEBUG: Force une couleur visible pour tester
            boxShadow: hasChildren && node.type === 'branch' ? '0 0 10px rgba(82, 196, 26, 0.3)' : 'none',
          }}
          onClick={() => setSelectedNode(node)}
          onMouseEnter={(e) => {
            if (!isSelected) {
              e.currentTarget.style.backgroundColor = hasChildren && node.type === 'branch' ? '#f0f9f0' : '#f5f5f5';
            }
          }}
          onMouseLeave={(e) => {
            if (!isSelected) {
              e.currentTarget.style.backgroundColor = hasChildren && node.type === 'branch' ? '#f6ffed' : '#ffffff';
            }
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {hasChildren && node.type === 'branch' && (
                <div style={{ 
                  color: '#52c41a', 
                  fontSize: '12px', 
                  fontWeight: 'bold',
                  marginRight: '4px' 
                }}>
                  â–¶
                </div>
              )}
              {getNodeIcon(node.type, node.subType)}
              <div>
                <div style={{ 
                  fontWeight: 500, 
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  {node.label}
                  {hasChildren && node.type === 'branch' && (
                    <span style={{
                      backgroundColor: '#52c41a',
                      color: 'white',
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '10px',
                      fontWeight: 'bold'
                    }}>
                      {node.children.length}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                  {node.type}{node.subType ? ` â€¢ ${node.subType}` : ''}
                  {node.description && ` â€¢ ${node.description}`}
                  {hasChildren && node.type === 'branch' && (
                    <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
                      {' â€¢ '}{node.children.length} Ã©lÃ©ment{node.children.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '4px' }}>
              <EditOutlined 
                style={{ color: '#1890ff', cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  onEditNode?.(node);
                }}
              />
              <PlusOutlined 
                style={{ color: '#52c41a', cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  onAddChildNode?.(node.id);
                }}
              />
              <DeleteOutlined 
                style={{ color: '#ff4d4f', cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteNode?.(node.id);
                }}
              />
            </div>
          </div>
        </div>
        
        {node.children && node.children.map(child => 
          renderNode(child, level + 1)
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: '16px' }}>
      <Title level={5} style={{ marginBottom: '16px' }}>
        <ClusterOutlined style={{ marginRight: '8px' }} />
        Structure de l'arbre: {tree.name}
      </Title>
      
      {(() => {
        console.log('ðŸ” [RENDER-DEBUG] PropriÃ©tÃ©s de tree:', Object.keys(tree));
        console.log('ðŸ” [RENDER-DEBUG] tree.Nodes:', tree.Nodes);
        console.log('ðŸ” [RENDER-DEBUG] tree.Nodes?.length:', tree.Nodes?.length);
        return null;
      })()}
      
      {!tree.Nodes || tree.Nodes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#8c8c8c' }}>
          <ClusterOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
          <div style={{ fontSize: '16px', marginBottom: '8px' }}>
            Aucun nÅ“ud dans cet arbre
          </div>
          <div style={{ fontSize: '14px' }}>
            Glissez-dÃ©posez des blocs depuis la palette pour construire votre arbre
          </div>
        </div>
      ) : (
        <div>
          {tree.Nodes.map((node) => renderNode(node))}
        </div>
      )}
    </div>
  );
};

// Configuration des paramÃ¨tres (colonne droite)
interface NodeParametersProps {
  selectedNode: TreeBranchLeafNode | null;
  onUpdateNode?: (nodeId: string, updates: Partial<TreeBranchLeafNode>) => void;
}

const NodeParameters: React.FC<NodeParametersProps> = ({
  selectedNode,
}) => {
  if (!selectedNode) {
    return (
      <div style={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        textAlign: 'center',
        padding: '16px'
      }}>
        <div>
          <SettingOutlined style={{ 
            fontSize: '48px', 
            color: '#d9d9d9',
            marginBottom: '16px',
            display: 'block'
          }} />
          <Title level={4} style={{ 
            color: '#8c8c8c', 
            marginBottom: '8px',
            fontWeight: 'normal'
          }}>
            ParamÃ¨tres du nÅ“ud
          </Title>
          <p style={{ 
            color: '#bfbfbf', 
            margin: 0,
            fontSize: '14px',
            lineHeight: '1.4'
          }}>
            SÃ©lectionnez un nÅ“ud dans l'arbre pour configurer ses paramÃ¨tres
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px' }}>
      <Title level={5} style={{ marginBottom: '16px' }}>
        <SettingOutlined style={{ marginRight: '8px' }} />
        ParamÃ¨tres: {selectedNode.label}
      </Title>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Informations gÃ©nÃ©rales */}
        <Card size="small" title="Informations gÃ©nÃ©rales">
          <div style={{ marginBottom: '8px' }}>
            <Text strong>Type:</Text> {selectedNode.type}
            {selectedNode.subType && <> â€¢ {selectedNode.subType}</>}
          </div>
          <div style={{ marginBottom: '8px' }}>
            <Text strong>Label:</Text> {selectedNode.label}
          </div>
          {selectedNode.description && (
            <div style={{ marginBottom: '8px' }}>
              <Text strong>Description:</Text> {selectedNode.description}
            </div>
          )}
          <div style={{ marginBottom: '8px' }}>
            <Text strong>Ordre:</Text> {selectedNode.order}
          </div>
        </Card>

        {/* PropriÃ©tÃ©s */}
        <Card size="small" title="PropriÃ©tÃ©s">
          <div style={{ marginBottom: '8px' }}>
            <Text strong>Requis:</Text> {selectedNode.isRequired ? 'âœ… Oui' : 'âŒ Non'}
          </div>
          <div style={{ marginBottom: '8px' }}>
            <Text strong>Visible:</Text> {selectedNode.isVisible ? 'âœ… Oui' : 'âŒ Non'}
          </div>
          <div style={{ marginBottom: '8px' }}>
            <Text strong>Actif:</Text> {selectedNode.isActive ? 'âœ… Oui' : 'âŒ Non'}
          </div>
        </Card>

        {/* Configuration spÃ©cialisÃ©e selon le type */}
        {selectedNode.fieldConfig && (
          <Card size="small" title="Configuration des champs">
            <pre style={{ fontSize: '12px', backgroundColor: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
              {JSON.stringify(selectedNode.fieldConfig, null, 2)}
            </pre>
          </Card>
        )}

        {selectedNode.conditionConfig && (
          <Card size="small" title="Configuration des conditions">
            <pre style={{ fontSize: '12px', backgroundColor: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
              {JSON.stringify(selectedNode.conditionConfig, null, 2)}
            </pre>
          </Card>
        )}

        {selectedNode.formulaConfig && (
          <Card size="small" title="Configuration des formules">
            <pre style={{ fontSize: '12px', backgroundColor: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
              {JSON.stringify(selectedNode.formulaConfig, null, 2)}
            </pre>
          </Card>
        )}
      </div>
    </div>
  );
};

interface DraggedItem {
  item?: {
    id: string;
    type: string;
    label: string;
    icon?: string;
    color?: string;
  };
  type?: string;
}

// Fonction utilitaire pour transformer les donnÃ©es API en structure TreeBranchLeafTree
const transformApiTreeToLocal = (apiTree: any, phantomNodes: Set<string> = new Set()): TreeBranchLeafTree => {
  console.log('ðŸ”„ [TRANSFORM] DÃ©but transformation API vers local');
  console.log('ðŸ” [TRANSFORM] DonnÃ©es API reÃ§ues:', apiTree);
  console.log('ðŸ” [TRANSFORM] Nodes dans API:', apiTree.Nodes?.length);
  console.log('ðŸ‘» [TRANSFORM] Phantom nodes Ã  filtrer:', [...phantomNodes]);
  
  // Filtrer les phantom nodes dÃ¨s la rÃ©ception des donnÃ©es API
  const filteredNodes = apiTree.Nodes?.filter((node: APINode) => {
    const isPhantom = phantomNodes.has(node.id);
    if (isPhantom) {
      console.log('ðŸ§¹ [TRANSFORM] NÅ“ud fantÃ´me filtrÃ© dÃ¨s l\'API:', node.id);
    }
    return !isPhantom;
  }) || [];
  
  // Log dÃ©taillÃ© des nÅ“uds aprÃ¨s filtrage phantom nodes
  if (filteredNodes.length > 0) {
    console.log('ðŸ“‹ [TRANSFORM] DonnÃ©es brutes des nÅ“uds (aprÃ¨s filtrage phantom):');
    filteredNodes.forEach((node: unknown, index: number) => {
      const nodeObj = node as Record<string, unknown>;
      console.log(`  API NÅ“ud ${index + 1}:`, {
        id: nodeObj.id,
        name: nodeObj.name,
        label: nodeObj.label,
        parentId: nodeObj.parentId,
        type: nodeObj.type,
        subType: nodeObj.subType,
        allProps: Object.keys(nodeObj)
      });
    });
  }
  
  // Interface pour les nÅ“uds API
  interface APINode {
    id: string;
    parentId?: string | null; // Peut Ãªtre string ou null
    label?: string;
    name?: string;
    type?: string;
    subType?: string;
    description?: string;
    value?: unknown;
    order?: number;
    isRequired?: boolean;
    isVisible?: boolean;
    isActive?: boolean;
    fieldConfig?: Record<string, unknown>;
    conditionConfig?: Record<string, unknown>;
    formulaConfig?: Record<string, unknown>;
    tableConfig?: Record<string, unknown>;
    apiConfig?: Record<string, unknown>;
    linkConfig?: Record<string, unknown>;
    defaultValue?: unknown;
    calculatedValue?: unknown;
    metadata?: Record<string, unknown>;
  }
  
  // Fonction pour construire la hiÃ©rarchie Ã  partir d'un tableau plat
  const buildHierarchy = (flatNodes: APINode[]): TreeBranchLeafNode[] => {
    console.log('ðŸ—ï¸ [HIERARCHY] Construction hiÃ©rarchie depuis:', flatNodes.length, 'nÅ“uds');
    console.log('ðŸ” [HIERARCHY] DÃ©tail des nÅ“uds reÃ§us:');
    flatNodes.forEach((node, index) => {
      console.log(`  NÅ“ud ${index + 1}:`, {
        id: node.id,
        name: node.name || node.label,
        parentId: node.parentId,
        type: node.type,
        subType: node.subType,
        hasParentId: !!node.parentId
      });
    });
    
    const nodeMap = new Map<string, TreeBranchLeafNode>();
    const rootNodes: TreeBranchLeafNode[] = [];

    // PremiÃ¨re passe : crÃ©er tous les nÅ“uds
    flatNodes.forEach(apiNode => {
      const node: TreeBranchLeafNode = {
        id: apiNode.id,
        name: apiNode.label || apiNode.name || '',
        label: apiNode.label || apiNode.name || '',
        type: apiNode.type || 'unknown',
        subType: apiNode.subType || 'data',
        description: apiNode.description || '',
        value: apiNode.value,
        order: apiNode.order || 0,
        isRequired: apiNode.isRequired || false,
        isVisible: apiNode.isVisible !== false,
        isActive: apiNode.isActive !== false,
        fieldConfig: apiNode.fieldConfig || {},
        conditionConfig: apiNode.conditionConfig || {},
        formulaConfig: apiNode.formulaConfig || {},
        tableConfig: apiNode.tableConfig || {},
        apiConfig: apiNode.apiConfig || {},
        linkConfig: apiNode.linkConfig || {},
        defaultValue: apiNode.defaultValue,
        calculatedValue: apiNode.calculatedValue,
        metadata: apiNode.metadata || {},
        children: []
      };
      nodeMap.set(apiNode.id, node);
    });

    // DeuxiÃ¨me passe : construire la hiÃ©rarchie
    flatNodes.forEach(apiNode => {
      const node = nodeMap.get(apiNode.id);
      if (!node) return;

      if (apiNode.parentId) {
        console.log('ðŸ”— [HIERARCHY] NÅ“ud avec parent:', { child: apiNode.id, parent: apiNode.parentId });
        const parent = nodeMap.get(apiNode.parentId);
        if (parent) {
          parent.children.push(node);
          console.log('âœ… [HIERARCHY] Enfant ajoutÃ© Ã  parent:', { parent: parent.id, childrenCount: parent.children.length });
        } else {
          console.warn('âš ï¸ [HIERARCHY] Parent non trouvÃ© pour:', apiNode.id, 'parent:', apiNode.parentId);
          rootNodes.push(node);
        }
      } else {
        console.log('ðŸŒ± [HIERARCHY] NÅ“ud racine:', apiNode.id);
        rootNodes.push(node);
      }
    });

    console.log('âœ… [HIERARCHY] HiÃ©rarchie construite:', rootNodes.length, 'nÅ“uds racine');
    console.log('ðŸŒ³ [HIERARCHY] Structure finale:', rootNodes.map(n => ({ 
      id: n.id, 
      name: n.name, 
      children: n.children.length,
      childrenIds: n.children.map(c => c.id)
    })));
    
    return rootNodes;
  };

  const hierarchicalNodes = filteredNodes.length > 0 ? buildHierarchy(filteredNodes) : [];

  const result = {
    id: apiTree.id,
    name: apiTree.name || '',
    description: apiTree.description || '',
    status: apiTree.status || 'active',
    color: apiTree.color || '#1890ff',
    icon: apiTree.icon,
    Nodes: hierarchicalNodes,
    Markers: apiTree.Markers || [],
    TableData: apiTree.TableData || [],
    APIConnections: apiTree.APIConnections || []
  };

  console.log('ðŸŽ¯ [TRANSFORM] Transformation terminÃ©e:', result);
  return result;
};

// Layout principal TreeBranchLeaf V2 avec drag & drop
const TreeBranchLeafLayoutV2: React.FC = () => {
  console.log('ðŸŒŸ [TreeBranchLeaf] Composant TreeBranchLeafLayoutV2 chargÃ© !');
  const { id: treeId } = useParams<{ id: string }>();
  const { api } = useAuthenticatedApi();
  const { message, modal } = App.useApp();
  const [tree, setTree] = useState<TreeBranchLeafTree | null>(null);
  const [selectedNode, setSelectedNode] = useState<TreeBranchLeafNode | null>(null);
  const [loading, setLoading] = useState(false); // Commencer par false, sera mis Ã  true seulement si nÃ©cessaire
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null);
  
  // Ã‰tats pour la gestion des arbres
  const [allTrees, setAllTrees] = useState<TreeBranchLeafTree[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreatingTree, setIsCreatingTree] = useState(false);
  const [newTreeName, setNewTreeName] = useState('');
  const [isEditingTreeName, setIsEditingTreeName] = useState(false);
  const [editingTreeName, setEditingTreeName] = useState('');

  // Ã‰tat pour les nÅ“uds 404 (nÅ“uds fantÃ´mes) - persistance localStorage
  const [phantomNodes, setPhantomNodes] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('treebranchleaf-phantom-nodes');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch (error) {
      console.warn('ðŸš¨ [PHANTOM] Erreur lecture localStorage phantoms:', error);
      return new Set();
    }
  });

  // Sauvegarder les phantom nodes dans localStorage
  useEffect(() => {
    try {
      localStorage.setItem('treebranchleaf-phantom-nodes', JSON.stringify([...phantomNodes]));
      console.log('ðŸ’¾ [PHANTOM] Sauvegarde localStorage:', [...phantomNodes]);
    } catch (error) {
      console.warn('ðŸš¨ [PHANTOM] Erreur sauvegarde localStorage:', error);
    }
  }, [phantomNodes]);

  // Fonctions utilitaires pour naviguer dans l'arbre
  const findNodeById = useCallback((nodes: TreeBranchLeafNode[], nodeId: string): TreeBranchLeafNode | null => {
    for (const node of nodes) {
      if (node.id === nodeId) return node;
      if (node.children && node.children.length > 0) {
        const found = findNodeById(node.children, nodeId);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const findParentOfNode = useCallback((nodes: TreeBranchLeafNode[], targetNodeId: string): TreeBranchLeafNode | null => {
    for (const node of nodes) {
      // VÃ©rifier si le targetNodeId est dans les enfants directs de ce nÅ“ud
      if (node.children && node.children.some(child => child.id === targetNodeId)) {
        return node;
      }
      // Recherche rÃ©cursive dans les sous-nÅ“uds
      if (node.children && node.children.length > 0) {
        const found = findParentOfNode(node.children, targetNodeId);
        if (found) return found;
      }
    }
    return null; // Pas de parent trouvÃ© = nÅ“ud au niveau racine
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Charger l'arbre depuis Prisma (MODE PRODUCTION)
  const fetchTree = useCallback(async () => {
    try {
      setLoading(true);
      console.log('ðŸ”„ [TreeBranchLeafV2] MODE PRODUCTION - Chargement arbre Prisma');
      
      if (!treeId && !isDeleting) {
        // VÃ©rifier d'abord s'il existe des arbres
        console.log('ðŸ” [TreeBranchLeafV2] VÃ©rification des arbres existants...');
        const existingTrees = await api.get('/api/treebranchleaf-v2/trees');
        
        if (existingTrees.length > 0) {
          // Chercher le dernier arbre ouvert dans le localStorage
          const lastOpenedTreeId = localStorage.getItem('treebranchleaf-last-opened');
          let treeToLoadBasic = existingTrees[0]; // Par dÃ©faut le premier
          
          if (lastOpenedTreeId) {
            const lastOpenedTree = existingTrees.find((tree) => tree.id === lastOpenedTreeId);
            if (lastOpenedTree) {
              treeToLoadBasic = lastOpenedTree;
              console.log('ðŸ”„ [TreeBranchLeafV2] Restauration dernier arbre ouvert:', lastOpenedTree.name);
            }
          } else {
            // Si pas de dernier arbre sauvÃ©, prendre le plus rÃ©cent (dernier crÃ©Ã©)
            treeToLoadBasic = existingTrees.sort((a, b) => 
              new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
            )[0];
            console.log('ðŸ†• [TreeBranchLeafV2] SÃ©lection automatique du dernier arbre crÃ©Ã©/modifiÃ©:', treeToLoadBasic.name);
          }
          
          console.log('âœ… [TreeBranchLeafV2] Arbre sÃ©lectionnÃ© automatiquement:', treeToLoadBasic.name);
          
          // IMPORTANT: Charger l'arbre complet avec ses nÅ“uds via l'endpoint spÃ©cifique
          console.log('ðŸ”„ [TreeBranchLeafV2] Chargement arbre complet avec nÅ“uds...');
          const fullTreeResponse = await api.get(`/api/treebranchleaf-v2/trees/${treeToLoadBasic.id}`);
          console.log('ðŸ” [TreeBranchLeafV2] Arbre complet reÃ§u:', {
            id: fullTreeResponse.id,
            name: fullTreeResponse.name,
            nodesCount: fullTreeResponse.Nodes?.length || 0
          });
          
          const transformedTree = transformApiTreeToLocal(fullTreeResponse, phantomNodes);
          setTree(transformedTree);
          
          // Sauvegarder cet arbre comme dernier ouvert
          localStorage.setItem('treebranchleaf-last-opened', treeToLoadBasic.id);
          
          console.log('ðŸŒ³ [TreeBranchLeafV2] Arbre chargÃ© avec', transformedTree.Nodes?.length || 0, 'nÅ“uds');
          setLoading(false);
          return;
        }
        
        // CrÃ©er un nouvel arbre seulement s'il n'y en a aucun
        console.log('ðŸ†• [TreeBranchLeafV2] Aucun arbre existant, crÃ©ation nouvel arbre Prisma');
        
        const newTreeResponse = await api.post('/api/treebranchleaf-v2/trees', {
          name: 'Nouvel Arbre TreeBranchLeaf',
          description: 'Arbre crÃ©Ã© automatiquement en mode production',
          category: 'formulaire',
          status: 'draft',
          settings: {},
          metadata: { createdBy: 'system', version: '1.0.0' }
        });
        
        console.log('âœ… [TreeBranchLeafV2] Nouvel arbre crÃ©Ã©:', newTreeResponse);
        setTree(transformApiTreeToLocal(newTreeResponse, phantomNodes));
        setLoading(false);
        return;
      } else if (!treeId && isDeleting) {
        console.log('â¸ï¸ [TreeBranchLeafV2] Suppression en cours, pas de crÃ©ation automatique');
        setTree(null);
        setLoading(false);
        return;
      }

      // Charger arbre existant depuis Prisma
      console.log('ðŸ”„ [TreeBranchLeafV2] Chargement arbre existant:', treeId);
      const response = await api.get(`/api/treebranchleaf-v2/trees/${treeId}`);
      console.log('âœ… [TreeBranchLeafV2] Arbre chargÃ© depuis Prisma:', response);
      
      setTree(transformApiTreeToLocal(response, phantomNodes));
    } catch (error) {
      console.error('âŒ [TreeBranchLeafV2] Erreur Prisma:', error);
      
      // En cas d'erreur, essayer de charger n'importe quel arbre existant
      console.log('ðŸ”„ [TreeBranchLeafV2] Tentative de rÃ©cupÃ©ration via arbres existants');
      try {
        const existingTrees = await api.get('/api/treebranchleaf-v2/trees');
        if (existingTrees.length > 0) {
          console.log('âœ… [TreeBranchLeafV2] RÃ©cupÃ©ration rÃ©ussie avec:', existingTrees[0].name);
          setTree(transformApiTreeToLocal(existingTrees[0], phantomNodes));
        } else {
          console.log('ï¿½ [TreeBranchLeafV2] Aucun arbre disponible');
          setTree(null);
        }
      } catch (recoveryError) {
        console.error('ðŸ’¥ [TreeBranchLeafV2] Erreur critique:', recoveryError);
        setTree(null);
      }
    } finally {
      setLoading(false);
    }
  }, [api, treeId, isDeleting, phantomNodes]);

  // Fonction pour ajouter un nÅ“ud Ã  l'arbre (MODE PRODUCTION PRISMA)
  const handleAddNode = useCallback(async (paletteItem: { id: string; type: string; label: string; icon?: string; color?: string }, targetNodeId?: string) => {
    console.log('ðŸš€ [DEBUG] handleAddNode appelÃ© avec:', { paletteItem, targetNodeId });
    console.log('ðŸŒ³ [DEBUG] Ã‰tat actuel de tree:', tree);
    
    // Mapping des types palette vers types attendus
    const typeMapping: Record<string, string> = {
      'root': 'arbre',
      'branch': 'branche', 
      'option': 'option',
      'option-field': 'champ',
      'field': 'champ',
      // Garder aussi les anciens types pour compatibilitÃ©
      'arbre': 'arbre',
      'branche': 'branche',
      'data': 'data'
    };
    
    const normalizedType = typeMapping[paletteItem.type] || paletteItem.type;
    console.log('ðŸ”„ [DEBUG] Type normalisÃ©:', { original: paletteItem.type, normalized: normalizedType });
    
    if (!tree) {
      console.log('âŒ [DEBUG] GUARD CLAUSE: tree est null/undefined, return early');
      return;
    }
    
    console.log('âœ… [DEBUG] Guard clause passÃ©e, execution continue...');

    // Fonction de validation des rÃ¨gles hiÃ©rarchiques
    const validateNodePlacement = (normalizedType: string, targetNodeId?: string | null): { valid: boolean; message: string } => {
      console.log('ðŸ”„ [DEBUG] Validation avec type normalisÃ©:', normalizedType);
      
      // Plus de type 'arbre' dans la palette - supprimÃ© !
      
      // Nouvelle hiÃ©rarchie :
      // NIVEAU 0: ARBRE (crÃ©Ã© via bouton +)
      // NIVEAU 1: BRANCHE (seulement niveau 1, pas imbriquÃ©es) - MULTIPLES AUTORISÃ‰ES
      // NIVEAU 2+: CHAMPS/OPTIONS (infini)
      
      // RÃ¨gle 1: Dans un arbre (vide ou pas), on peut ajouter des BRANCHES directement
      if (!targetNodeId) {
        if (normalizedType === 'branche') {
          return { valid: true, message: "" }; // Branche directement dans l'arbre = OK (multiples autorisÃ©es)
        } else {
          return {
            valid: false,
            message: "âŒ Pour ajouter des champs, glissez-les sur une branche. Pour l'arbre principal, utilisez des branches."
          };
        }
      }

      // RÃ¨gle 2: Si on cible un nÅ“ud spÃ©cifique
      if (targetNodeId) {
        const targetNode = findNodeById(tree?.Nodes || [], targetNodeId);
        if (!targetNode) {
          return { valid: false, message: "âŒ NÅ“ud cible introuvable." };
        }

        // Si parent = BRANCHE (niveau 1) â†’ on peut ajouter CHAMPS/OPTIONS (niveau 2+)
        if (targetNode.type === 'branch') {
          if (normalizedType === 'branche') {
            return {
              valid: false,
              message: "âŒ Les Branches ne peuvent pas Ãªtre imbriquÃ©es. Les Branches vont seulement au niveau 1."
            };
          }
          // Champs et Options autorisÃ©s dans les branches
          return { valid: true, message: "" };
        }

        // Si parent = CHAMP/OPTION (niveau 2+) â†’ on peut ajouter CHAMPS/OPTIONS (infini)
        if (targetNode.type === 'leaf') {
          if (normalizedType === 'branche') {
            return {
              valid: false,
              message: "âŒ Les Branches ne peuvent pas Ãªtre ajoutÃ©es dans un champ. Les Branches vont seulement au niveau 1."
            };
          }
          // Champs et Options autorisÃ©s Ã  l'infini dans les champs
          return { valid: true, message: "" };
        }
      }

      return { valid: true, message: "" };
    };

    // Validation des rÃ¨gles hiÃ©rarchiques
    console.log('ðŸ” [DEBUG] DÃ©but validation hiÃ©rarchique...');
    const validation = validateNodePlacement(normalizedType, targetNodeId);
    console.log('ðŸ” [DEBUG] RÃ©sultat validation:', validation);
    
    if (!validation.valid) {
      console.log('âŒ [DEBUG] Validation Ã©chouÃ©e, affichage message d\'erreur');
      message.error(validation.message);
      return;
    }
    
    console.log('âœ… [DEBUG] Validation rÃ©ussie, crÃ©ation du nÅ“ud...');

    try {
      console.log('ðŸ”„ [PRISMA] CrÃ©ation nouveau nÅ“ud:', { paletteItem, targetNodeId, treeId: tree.id });

      // DonnÃ©es du nouveau nÅ“ud pour Prisma
      const newNodeData = {
        treeId: tree.id,
        parentId: targetNodeId || null,
        type: normalizedType === 'arbre' ? 'branch' : 
              normalizedType === 'branche' ? 'branch' :
              normalizedType === 'option' ? 'leaf' :
              normalizedType === 'champ' ? 'leaf' :
              normalizedType === 'data' ? 'leaf' : 'leaf',
        subType: normalizedType === 'arbre' ? null : // Arbre = branch sans subType
                 normalizedType === 'branche' ? 'data' : // Branche = branch avec subType
                 normalizedType === 'option' ? 'option' :
                 normalizedType === 'champ' ? 'field' :
                 normalizedType === 'data' ? 'data' : null,
        label: paletteItem.customName || `${paletteItem.label} ${Date.now().toString().slice(-4)}`, // Utiliser customName si disponible
        description: paletteItem.customName ? 
          `${paletteItem.label} nommÃ© : ${paletteItem.customName}` :
          `Nouveau ${paletteItem.label.toLowerCase()} crÃ©Ã© en mode production`,
        order: 0,
        isRequired: false,
        isVisible: true,
        isActive: true,
        fieldConfig: paletteItem.type === 'champ' ? { 
          type: 'text', 
          validation: {},
          placeholder: `Saisir ${paletteItem.label.toLowerCase()}...` 
        } : null,
        conditionConfig: null,
        formulaConfig: null,
        tableConfig: paletteItem.type === 'data' ? {
          lookup: true,
          source: 'manual',
          columns: []
        } : null,
        apiConfig: null,
        linkConfig: null,
        metadata: {
          createdBy: 'user',
          paletteType: paletteItem.type,
          customName: paletteItem.customName || null,
          createdAt: new Date().toISOString()
        }
      };

      // CrÃ©er le nÅ“ud dans Prisma
      console.log('ðŸ“¤ [PRISMA] Envoi donnÃ©es:', newNodeData);
      const createdNode = await api.post(`/api/treebranchleaf-v2/trees/${tree.id}/nodes`, newNodeData);
      console.log('âœ… [PRISMA] NÅ“ud crÃ©Ã©:', createdNode);

      // Recharger l'arbre complet depuis Prisma pour avoir la structure mise Ã  jour
      console.log('ðŸ”„ [PRISMA] Rechargement arbre...');
      const updatedTreeApi = await api.get(`/api/treebranchleaf-v2/trees/${tree.id}`);
      console.log('âœ… [PRISMA] Arbre rechargÃ© (API):', updatedTreeApi);
      console.log('ðŸ” [PRISMA] PropriÃ©tÃ©s disponibles dans l\'API:', Object.keys(updatedTreeApi));
      console.log('ðŸ” [PRISMA] Children dans API:', updatedTreeApi.Children);
      console.log('ðŸ” [PRISMA] Nodes dans API:', updatedTreeApi.Nodes);
      console.log('ðŸ” [PRISMA] nodes dans API:', updatedTreeApi.nodes);
      
      // Transformer les donnÃ©es API en format local
      const updatedTree = transformApiTreeToLocal(updatedTreeApi, phantomNodes);
      console.log('ðŸ“Š [PRISMA] Nombre de nÅ“uds aprÃ¨s rechargement:', updatedTree?.Nodes?.length || 0);
      console.log('ðŸŒ³ [PRISMA] Structure complÃ¨te des nÅ“uds:', JSON.stringify(updatedTree?.Nodes, null, 2));
      console.log('ðŸ” [PRISMA] Premier nÅ“ud dÃ©taillÃ©:', updatedTree?.Nodes?.[0]);
      
      setTree(updatedTree);
      
      // SÃ©lectionner le nouveau nÅ“ud
      const newNode = createdNode; // Le nÅ“ud crÃ©Ã© par l'API
      setSelectedNode(newNode);

      message.success(`ðŸŽ‰ ${paletteItem.label} crÃ©Ã© avec succÃ¨s en mode production !`);
      
    } catch (error) {
      console.error('âŒ [PRISMA] Erreur crÃ©ation nÅ“ud:', error);
      message.error(`âŒ Erreur lors de la crÃ©ation du ${paletteItem.label}: ${error.message || 'Erreur inconnue'}`);
    }
  }, [tree, api, message, findNodeById, phantomNodes]);

  // Fonctions d'actions pour les 3 points
  // Fonctions d'actions pour les 3 points (MODE PRODUCTION PRISMA)
  const handleEditNode = useCallback((nodeId: string) => {
    console.log('âœï¸ [PRISMA] Ã‰dition nÅ“ud:', nodeId);
    const findNodeById = (nodes: TreeBranchLeafNode[], targetId: string): TreeBranchLeafNode | null => {
      for (const node of nodes) {
        if (node.id === targetId) return node;
        if (node.children && node.children.length > 0) {
          const found = findNodeById(node.children, targetId);
          if (found) return found;
        }
      }
      return null;
    };

    if (tree) {
      const nodeToEdit = findNodeById(tree.Nodes, nodeId);
      if (nodeToEdit) {
        setSelectedNode(nodeToEdit);
        message.success(`ðŸ“ NÅ“ud "${nodeToEdit.label}" sÃ©lectionnÃ© pour modification`);
        console.log('âœ… [PRISMA] NÅ“ud sÃ©lectionnÃ© pour Ã©dition:', nodeToEdit);
      }
    }
  }, [tree, message]);

  const handleCloneNode = useCallback(async (nodeId: string) => {
    if (!tree) return;
    
    console.log('ðŸ“‹ [PRISMA] Clonage nÅ“ud:', nodeId);
    
    const findNodeById = (nodes: TreeBranchLeafNode[], targetId: string): TreeBranchLeafNode | null => {
      for (const node of nodes) {
        if (node.id === targetId) return node;
        if (node.children && node.children.length > 0) {
          const found = findNodeById(node.children, targetId);
          if (found) return found;
        }
      }
      return null;
    };

    // Fonction rÃ©cursive pour chercher un nÅ“ud dans la hiÃ©rarchie
    const findNodeInHierarchy = (nodes: TreeBranchLeafNode[], targetId: string): boolean => {
      for (const node of nodes) {
        if (node.id === targetId) return true;
        if (node.children && node.children.length > 0) {
          if (findNodeInHierarchy(node.children, targetId)) return true;
        }
      }
      return false;
    };

    // VÃ©rifier si le nÅ“ud existe dans l'Ã©tat actuel
    const nodeExists = tree.Nodes && findNodeInHierarchy(tree.Nodes, nodeId);
    if (!nodeExists) {
      console.warn('âš ï¸ [PRISMA] NÅ“ud inexistant pour clonage:', nodeId);
      message.warning('Ce nÅ“ud n\'existe plus et ne peut pas Ãªtre clonÃ©');
      return;
    }

    try {
      const nodeToClone = findNodeById(tree.Nodes, nodeId);
      if (!nodeToClone) {
        message.error('âŒ NÅ“ud Ã  cloner introuvable');
        return;
      }

      // DonnÃ©es du nÅ“ud clonÃ© pour Prisma
      const cloneData = {
        treeId: tree.id,
        parentId: nodeToClone.parentId || null,
        type: nodeToClone.type,
        subType: nodeToClone.subType,
        label: `${nodeToClone.label} (copie)`,
        description: `${nodeToClone.description || ''} (copie)`,
        order: nodeToClone.order + 1,
        isRequired: nodeToClone.isRequired,
        isVisible: nodeToClone.isVisible,
        isActive: nodeToClone.isActive,
        fieldConfig: nodeToClone.fieldConfig,
        conditionConfig: nodeToClone.conditionConfig,
        formulaConfig: nodeToClone.formulaConfig,
        tableConfig: nodeToClone.tableConfig,
        apiConfig: nodeToClone.apiConfig,
        linkConfig: nodeToClone.linkConfig,
        metadata: {
          ...nodeToClone.metadata,
          clonedFrom: nodeId,
          clonedAt: new Date().toISOString()
        }
      };

      // CrÃ©er le clone dans Prisma
      const clonedNode = await api.post(`/api/treebranchleaf-v2/trees/${tree.id}/nodes`, cloneData);
      console.log('âœ… [PRISMA] NÅ“ud clonÃ©:', clonedNode);

      // Recharger l'arbre
      const updatedTree = await api.get(`/api/treebranchleaf-v2/trees/${tree.id}`);
      setTree(updatedTree);
      
      // SÃ©lectionner le clone
      setSelectedNode(clonedNode);
      
      message.success(`ðŸ“‹ NÅ“ud "${nodeToClone.label}" clonÃ© avec succÃ¨s !`);
      
    } catch (error) {
      console.error('âŒ [PRISMA] Erreur clonage:', error);
      message.error(`âŒ Erreur lors du clonage: ${error.message || 'Erreur inconnue'}`);
    }
  }, [tree, api, message]);

  const handleDeleteNode = useCallback(async (nodeId: string) => {
    if (!tree) return;

    console.log('ðŸ—‘ï¸ [PRISMA] Suppression nÅ“ud:', nodeId);
    
    // VÃ©rifier si c'est un nÅ“ud de dÃ©mo (pour Ã©viter les erreurs 404)
    if (nodeId.startsWith('demo-')) {
      console.warn('âš ï¸ [PRISMA] Tentative de suppression nÅ“ud dÃ©mo ignorÃ©e:', nodeId);
      message.warning('âš ï¸ Ce nÅ“ud de dÃ©monstration ne peut pas Ãªtre supprimÃ©');
      return;
    }

    // Fonction rÃ©cursive pour chercher un nÅ“ud dans la hiÃ©rarchie
    const findNodeInHierarchy = (nodes: TreeBranchLeafNode[], targetId: string): boolean => {
      for (const node of nodes) {
        if (node.id === targetId) return true;
        if (node.children && node.children.length > 0) {
          if (findNodeInHierarchy(node.children, targetId)) return true;
        }
      }
      return false;
    };

    // VÃ©rifier si le nÅ“ud existe dans l'Ã©tat actuel
    const nodeExists = tree.Nodes && findNodeInHierarchy(tree.Nodes, nodeId);
    if (!nodeExists) {
      console.warn('âš ï¸ [PRISMA] NÅ“ud dÃ©jÃ  supprimÃ© de l\'Ã©tat local:', nodeId);
      message.warning('Ce nÅ“ud a dÃ©jÃ  Ã©tÃ© supprimÃ©');
      
      // Forcer le rechargement de l'arbre pour synchroniser l'Ã©tat
      try {
        console.log('ðŸ”„ [PRISMA] Rechargement forcÃ© aprÃ¨s nÅ“ud manquant localement');
        const updatedTree = await api.get(`/api/treebranchleaf-v2/trees/${tree.id}`);
        console.log('ðŸ” [PRISMA] Arbre rechargÃ© aprÃ¨s nÅ“ud manquant:', {
          nodesCount: updatedTree.Nodes?.length || 0,
          nodes: updatedTree.Nodes?.map(n => ({ id: n.id, label: n.label })) || []
        });
        setTree(updatedTree);
        console.log('ðŸ”„ [PRISMA] Arbre rechargÃ© aprÃ¨s dÃ©tection de dÃ©synchronisation');
      } catch (refreshError) {
        console.error('âŒ [PRISMA] Erreur rechargement arbre:', refreshError);
      }
      return;
    }

    try {
      // Supprimer le nÅ“ud dans Prisma (cascade sur les enfants)
      await api.delete(`/api/treebranchleaf-v2/trees/${tree.id}/nodes/${nodeId}`);
      console.log('âœ… [PRISMA] NÅ“ud supprimÃ© de la base');

      // Recharger l'arbre
      console.log('ðŸ”„ [PRISMA] Rechargement aprÃ¨s suppression normale');
      const updatedTree = await api.get(`/api/treebranchleaf-v2/trees/${tree.id}`);
      console.log('ðŸ” [PRISMA] Arbre rechargÃ© aprÃ¨s suppression:', {
        nodesCount: updatedTree.Nodes?.length || 0,
        nodes: updatedTree.Nodes?.map(n => ({ id: n.id, label: n.label })) || []
      });
      setTree(updatedTree);
      
      // DÃ©sÃ©lectionner si c'Ã©tait le nÅ“ud actif
      if (selectedNode?.id === nodeId) {
        setSelectedNode(null);
      }
      
      message.success('ðŸ—‘ï¸ NÅ“ud supprimÃ© avec succÃ¨s (avec tous ses enfants)');
      
    } catch (error) {
      console.error('âŒ [PRISMA] Erreur suppression:', error);
      
      // Gestion spÃ©cifique des erreurs 404
      if (error.status === 404 || error.response?.status === 404) {
        console.warn('âš ï¸ [PRISMA] NÅ“ud dÃ©jÃ  supprimÃ© cÃ´tÃ© serveur (404)');
        message.warning('Ce nÅ“ud avait dÃ©jÃ  Ã©tÃ© supprimÃ©. Synchronisation en cours...');
        
        // Recharger l'arbre pour synchroniser l'Ã©tat
        try {
          console.log('ðŸ”„ [PRISMA] Rechargement aprÃ¨s 404 pour nÅ“ud:', nodeId);
          const updatedTree = await api.get(`/api/treebranchleaf-v2/trees/${tree.id}`);
          console.log('ðŸ” [PRISMA] Arbre rechargÃ© aprÃ¨s 404:', {
            nodesCount: updatedTree.Nodes?.length || 0,
            nodes: updatedTree.Nodes?.map(n => ({ id: n.id, label: n.label })) || []
          });
          
          // Ajouter le nÅ“ud 404 aux phantom nodes pour filtrage automatique
          setPhantomNodes(prev => {
            const newSet = new Set(prev);
            newSet.add(nodeId);
            console.log('ðŸ‘» [PHANTOM] NÅ“ud ajoutÃ© aux phantoms:', nodeId);
            console.log('ï¿½ [PHANTOM] Liste phantom nodes:', [...newSet]);
            return newSet;
          });
          
          // Transformer les donnÃ©es en filtrant automatiquement les phantom nodes
          const transformedTree = transformApiTreeToLocal(updatedTree, updatedPhantomNodes);
          setTree(transformedTree);
          
          // DÃ©sÃ©lectionner si c'Ã©tait le nÅ“ud actif
          if (selectedNode?.id === nodeId) {
            setSelectedNode(null);
          }
        } catch (refreshError) {
          console.error('âŒ [PRISMA] Erreur rechargement aprÃ¨s 404:', refreshError);
          message.error('Erreur lors de la synchronisation de l\'arbre');
        }
      } else {
        message.error(`âŒ Erreur lors de la suppression: ${error.message || 'Erreur inconnue'}`);
      }
    }
  }, [tree, selectedNode, api, message, setPhantomNodes, phantomNodes]);

  const handleMoveNode = useCallback(async (nodeId: string, direction: 'up' | 'down') => {
    if (!tree) return;

    console.log('ðŸ”„ [PRISMA] DÃ©placement nÅ“ud:', { nodeId, direction });

    // Fonction rÃ©cursive pour chercher un nÅ“ud dans la hiÃ©rarchie
    const findNodeInHierarchy = (nodes: TreeBranchLeafNode[], targetId: string): boolean => {
      for (const node of nodes) {
        if (node.id === targetId) return true;
        if (node.children && node.children.length > 0) {
          if (findNodeInHierarchy(node.children, targetId)) return true;
        }
      }
      return false;
    };

    // VÃ©rifier si le nÅ“ud existe dans l'Ã©tat actuel
    const nodeExists = tree.Nodes && findNodeInHierarchy(tree.Nodes, nodeId);
    if (!nodeExists) {
      console.warn('âš ï¸ [PRISMA] NÅ“ud inexistant pour dÃ©placement:', nodeId);
      message.warning('Ce nÅ“ud n\'existe plus et ne peut pas Ãªtre dÃ©placÃ©');
      return;
    }

    try {
      // Appeler l'API pour dÃ©placer le nÅ“ud
      await api.patch(`/api/treebranchleaf-v2/trees/${tree.id}/nodes/${nodeId}/move`, {
        direction: direction
      });
      console.log('âœ… [PRISMA] NÅ“ud dÃ©placÃ©');

      // Recharger l'arbre
      const updatedTree = await api.get(`/api/treebranchleaf-v2/trees/${tree.id}`);
      setTree(updatedTree);
      
      message.success(`ðŸ”„ NÅ“ud dÃ©placÃ© vers le ${direction === 'up' ? 'haut' : 'bas'}`);
      
    } catch (error) {
      console.error('âŒ [PRISMA] Erreur dÃ©placement:', error);
      message.error(`âŒ Erreur lors du dÃ©placement: ${error.message || 'Erreur inconnue'}`);
    }
  }, [tree, api, message]);

  // === GESTION DES ARBRES (NOUVEAU) ===
  
  // Charger tous les arbres disponibles
  const fetchAllTrees = useCallback(async () => {
    try {
      console.log('ðŸ“‹ [TREES] Chargement de tous les arbres...');
      const trees = await api.get('/api/treebranchleaf-v2/trees');
      setAllTrees(trees);
      console.log('âœ… [TREES] Arbres chargÃ©s:', trees);
    } catch (error) {
      console.error('âŒ [TREES] Erreur chargement arbres:', error);
      message.error('Erreur lors du chargement des arbres');
    }
  }, [api, message]);

  // CrÃ©er un nouvel arbre avec un nom personnalisÃ©
  // CrÃ©er un nouvel arbre avec un nom personnalisÃ©
  const handleCreateTree = useCallback(async (treeName: string) => {
    if (!treeName.trim()) {
      message.warning('Le nom de l\'arbre est requis');
      return null;
    }

    try {
      console.log('ðŸŒ³ [TREES] CrÃ©ation nouvel arbre:', treeName);
      const newTree = await api.post('/api/treebranchleaf-v2/trees', {
        name: treeName.trim(),
        description: `Arbre crÃ©Ã© : ${treeName.trim()}`,
        category: 'formulaire',
        isTemplate: false
      });
      
      await fetchAllTrees(); // Recharger la liste
      message.success(`âœ… Arbre "${treeName}" crÃ©Ã© avec succÃ¨s`);
      console.log('âœ… [TREES] Nouvel arbre crÃ©Ã©:', newTree);
      return newTree;
    } catch (error) {
      console.error('âŒ [TREES] Erreur crÃ©ation arbre:', error);
      message.error('Erreur lors de la crÃ©ation de l\'arbre');
      return null;
    }
  }, [api, message, fetchAllTrees]);

  // Changer d'arbre
  const handleSelectTree = useCallback(async (treeId: string) => {
    try {
      console.log('ðŸ”„ [TREES] Changement vers arbre:', treeId);
      const selectedTreeApi = await api.get(`/api/treebranchleaf-v2/trees/${treeId}`);
      const selectedTree = transformApiTreeToLocal(selectedTreeApi, phantomNodes);
      setTree(selectedTree);
      setSelectedNode(null);
      
      // Sauvegarder comme dernier arbre ouvert
      localStorage.setItem('treebranchleaf-last-opened', treeId);
      console.log('ðŸ’¾ [TREES] Arbre sauvegardÃ© comme dernier ouvert:', selectedTree.name);
      
      message.success(`Arbre "${selectedTree.name}" chargÃ©`);
    } catch (error) {
      console.error('âŒ [TREES] Erreur changement arbre:', error);
      message.error('Erreur lors du chargement de l\'arbre');
    }
  }, [api, message, phantomNodes]);
  const handleRenameTree = useCallback(async (treeId: string, newName: string) => {
    if (!newName.trim()) return false;

    try {
      await api.put(`/api/treebranchleaf-v2/trees/${treeId}`, {
        name: newName.trim()
      });
      
      await fetchAllTrees();
      if (tree?.id === treeId) {
        setTree({ ...tree, name: newName.trim() });
      }
      
      message.success('Nom de l\'arbre modifiÃ©');
      return true;
    } catch (error) {
      console.error('âŒ [TREES] Erreur renommage:', error);
      message.error('Erreur lors du renommage');
      return false;
    }
  }, [api, message, fetchAllTrees, tree]);

  // Supprimer un arbre
  const handleDeleteTree = useCallback(async (treeId: string) => {
    try {
      console.log('ðŸ—‘ï¸ [TREES] Suppression arbre:', treeId);
      setIsDeleting(true); // Marquer qu'on est en train de supprimer
      
      await api.delete(`/api/treebranchleaf-v2/trees/${treeId}`);
      console.log('âœ… [TREES] Arbre supprimÃ© cÃ´tÃ© serveur');
      
      // Recharger la liste des arbres
      await fetchAllTrees();
      console.log('âœ… [TREES] Liste des arbres rechargÃ©e');
      
      if (tree?.id === treeId) {
        console.log('ðŸ”„ [TREES] L\'arbre supprimÃ© Ã©tait l\'arbre actuel');
        
        // Attendre un peu pour que la liste soit Ã  jour
        setTimeout(async () => {
          // RÃ©cupÃ©rer la liste mise Ã  jour
          const updatedTrees = await api.get('/api/treebranchleaf-v2/trees');
          
          if (updatedTrees.length > 0) {
            console.log('ðŸŒ³ [TREES] SÃ©lection du premier arbre restant:', updatedTrees[0].name);
            await handleSelectTree(updatedTrees[0].id);
          } else {
            console.log('ðŸ’” [TREES] Plus d\'arbres disponibles, remise Ã  zÃ©ro de l\'Ã©tat');
            // Plus d'arbres, vider l'Ã©tat au lieu de crÃ©er automatiquement
            setTree(null);
            setSelectedNode(null);
            setAllTrees([]);
          }
          setIsDeleting(false); // Fin de la suppression
        }, 100);
      } else {
        setIsDeleting(false); // Fin de la suppression
      }
      
      message.success('Arbre supprimÃ©');
    } catch (error) {
      console.error('âŒ [TREES] Erreur suppression:', error);
      setIsDeleting(false); // Fin de la suppression mÃªme en cas d'erreur
      message.error('Erreur lors de la suppression');
    }
  }, [api, message, fetchAllTrees, tree, handleSelectTree]);

  // Dupliquer un arbre
  const handleDuplicateTree = useCallback(async (treeId: string, newName: string) => {
    if (!newName.trim()) return null;

    try {
      const duplicatedTree = await api.post(`/api/treebranchleaf-v2/trees/${treeId}/duplicate`, {
        name: newName.trim()
      });
      
      await fetchAllTrees();
      message.success(`Arbre dupliquÃ© : "${newName}"`);
      return duplicatedTree;
    } catch (error) {
      console.error('âŒ [TREES] Erreur duplication:', error);
      message.error('Erreur lors de la duplication');
      return null;
    }
  }, [api, message, fetchAllTrees]);

  // Effet pour charger l'arbre initial et la liste des arbres
  useEffect(() => {
    console.log('ðŸ”„ [useEffect] Montage initial du composant');
    
    let isMounted = true;
    
    // Charger la liste des arbres une seule fois
    const initializeComponent = async () => {
      try {
        setLoading(true);
        console.log('ðŸ”„ [useEffect] DÃ©but du chargement initial');
        
        // D'abord charger la liste des arbres
        await fetchAllTrees();
        
        // Ensuite, si pas d'arbre actuel et pas en cours de suppression
        if (isMounted && !tree && !isDeleting) {
          console.log('ðŸ”„ [useEffect] Aucun arbre actuel, chargement...');
          await fetchTree();
        }
        
        console.log('âœ… [useEffect] Chargement initial terminÃ©');
      } catch (error) {
        console.error('âŒ [useEffect] Erreur lors de l\'initialisation:', error);
      } finally {
        // S'assurer que loading soit toujours stoppÃ©
        if (isMounted) {
          console.log('âœ… [useEffect] ArrÃªt du loading aprÃ¨s initialisation');
          setLoading(false);
        }
      }
    };
    
    initializeComponent();
    
    return () => {
      isMounted = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Gestion du drag & drop
  const handleDragStart = (event: DragStartEvent) => {
    console.log('ðŸŽ¯ [DragDrop] Drag start:', event);
    setDraggedItem(event.active.data.current);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    console.log('ðŸŽ¯ [DragDrop] Drag end:', { active, over });
    
    if (!over) {
      console.log('âŒ [DragDrop] Pas de zone de drop valide');
      setDraggedItem(null);
      return;
    }

    // Si on glisse depuis la palette vers l'arbre
    if (active.data.current?.type === 'palette-item') {
      const paletteItem = active.data.current.item;
      
      // Cas 1: Drop sur un nÅ“ud existant
      if (over.data.current?.type === 'tree-node') {
        const targetNodeId = over.data.current.nodeId;
        const targetNode = findNodeById(tree?.Nodes || [], targetNodeId);
        
        // Si on glisse une BRANCHE sur une autre BRANCHE au niveau racine (parentId === null),
        // alors on l'ajoute comme SIBLING (frÃ¨re) au niveau racine, pas comme CHILD
        if (paletteItem.type === 'branch' && targetNode && targetNode.type === 'branch' && !findParentOfNode(tree?.Nodes || [], targetNodeId)) {
          console.log('âœ… [DragDrop] Branche ajoutÃ©e comme sibling au niveau racine');
          handleAddNode(paletteItem, null); // null = niveau racine
        } else {
          console.log('âœ… [DragDrop] Ajout sur nÅ“ud existant:', { paletteItem, targetNodeId });
          handleAddNode(paletteItem, targetNodeId);
        }
      }
      // Cas 2: Drop sur la zone vide (racine de l'arbre)  
      else if (over.data.current?.type === 'tree-root') {
        console.log('âœ… [DragDrop] Ajout dans arbre vide:', { paletteItem });
        
        // Si c'est un Ã©lÃ©ment "root" (arbre) de la palette, demander le nom
        console.log('ðŸŒ³ [DragDrop] VÃ©rification du type:', paletteItem.type);
        console.log('ðŸŒ³ [DragDrop] Ã‰lÃ©ment glissÃ© complet:', paletteItem);
        
        // Tous les Ã©lÃ©ments de la palette sont maintenant des nÅ“uds Ã  ajouter Ã  l'arbre
        console.log('ðŸ”§ [DEBUG] Appel handleAddNode avec:', { paletteItem, targetNodeId: null });
        handleAddNode(paletteItem, null);
        console.log('ðŸ”§ [DEBUG] AprÃ¨s appel handleAddNode');
      }
      else {
        console.log('âŒ [DragDrop] Type de zone de drop non reconnu:', over.data.current?.type);
        console.log('ðŸ”§ [DEBUG] over.data.current:', over.data.current);
      }
    }
    
    // Si on glisse depuis la palette vers la zone globale
    if (active.data.current?.type === 'palette-item' && over.data.current?.type === 'tree-global') {
      const paletteItem = active.data.current.item;
      
      console.log('âœ… [DragDrop] Ajout Ã  la racine:', { paletteItem });
      
      // Ajouter Ã  la racine
      handleAddNode(paletteItem);
    }

    setDraggedItem(null);
  };

  // === GESTIONNAIRES MODALES ===
  const handleConfirmRenameTree = useCallback(async () => {
    if (!tree) return;
    
    const success = await handleRenameTree(tree.id, editingTreeName);
    if (success) {
      setIsEditingTreeName(false);
      setEditingTreeName('');
    }
  }, [tree, editingTreeName, handleRenameTree]);

  const handleCancelRenameTree = useCallback(() => {
    setIsEditingTreeName(false);
    setEditingTreeName('');
  }, []);

  // Handlers pour le modal de crÃ©ation simple (sans drag & drop)
  const handleConfirmCreateTree = useCallback(async () => {
    if (!newTreeName.trim()) {
      message.warning('Le nom de l\'arbre est requis');
      return;
    }

    const createdTree = await handleCreateTree(newTreeName);
    if (createdTree) {
      setTree(transformApiTreeToLocal(createdTree, phantomNodes));
      setSelectedNode(null);
    }
    
    setIsCreatingTree(false);
    setNewTreeName('');
  }, [newTreeName, handleCreateTree, message, phantomNodes]);

  const handleCancelCreateTree = useCallback(() => {
    setIsCreatingTree(false);
    setNewTreeName('');
  }, []);

  // Actions du menu dropdown pour l'arbre actuel
  const getTreeMenuItems = useCallback(() => [
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Renommer',
      onClick: () => {
        setEditingTreeName(tree?.name || '');
        setIsEditingTreeName(true);
      }
    },
    {
      key: 'duplicate',
      icon: <CopyOutlined />,
      label: 'Dupliquer',
      onClick: async () => {
        if (!tree) return;
        
        const newName = `${tree.name} - Copie`;
        const duplicated = await handleDuplicateTree(tree.id, newName);
        if (duplicated) {
          handleSelectTree(duplicated.id);
        }
      }
    },
    {
      type: 'divider'
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Supprimer',
      danger: true,
      disabled: allTrees.length <= 1, // EmpÃªcher la suppression du dernier arbre
    }
  ], [tree, allTrees.length, handleDuplicateTree, handleSelectTree]);

  if (loading) {
    console.log('ðŸ”„ [RENDER] Composant en cours de chargement, affichage du loader');
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <ClusterOutlined 
            style={{ 
              fontSize: '48px', 
              color: '#1890ff', 
              marginBottom: '16px',
              animation: 'spin 2s linear infinite'
            }} 
          />
          <div>Chargement de TreeBranchLeaf...</div>
        </div>
      </div>
    );
  }

  console.log('âœ… [RENDER] Rendu principal du composant, arbre:', tree?.name || 'aucun');
  console.log('ðŸŒ³ [RENDER] Structure de l\'arbre:', tree ? {
    id: tree.id,
    name: tree.name,
    nodes: tree.Nodes?.length || 0,
    nodesDetails: tree.Nodes?.map(n => ({ id: n.id, name: n.label, type: n.type })) || []
  } : 'Pas d\'arbre');

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      collisionDetection={closestCenter}
    >
      <div 
        className="tree-branch-leaf-v2" 
        style={{ 
          height: '100vh', 
          overflow: 'hidden', 
          padding: '12px',
          backgroundColor: '#f8f9fa'
        }}
      >
        {/* SÃ©lecteur d'arbres */}
        <Row style={{ marginBottom: '16px' }}>
          <Col span={24}>
            <Card size="small" title="Gestion des arbres">
              <Row gutter={[8, 8]} align="middle">
                <Col flex="auto">
                  <Select
                    style={{ width: '100%' }}
                    value={tree?.id}
                    placeholder="SÃ©lectionner un arbre..."
                    onChange={handleSelectTree}
                    options={allTrees.map(t => ({
                      value: t.id,
                      label: `ðŸŒ³ ${t.name}`,
                    }))}
                    popupRender={(menu) => (
                      <div>
                        {menu}
                        <div style={{ padding: '4px 8px', borderTop: '1px solid #f0f0f0' }}>
                          <Button
                            type="link"
                            icon={<FolderAddOutlined />}
                            onClick={() => {
                              setNewTreeName('');
                              setIsCreatingTree(true);
                            }}
                            style={{ padding: '4px 0' }}
                          >
                            CrÃ©er un nouvel arbre
                          </Button>
                        </div>
                      </div>
                    )}
                  />
                </Col>
                {tree && (
                  <Col>
                    <Dropdown 
                      menu={{ 
                        items: getTreeMenuItems(),
                        onClick: ({ key }) => {
                          if (key === 'delete') {
                            // GÃ©rer la suppression avec confirmation via le contexte App
                            modal.confirm({
                              title: 'Supprimer l\'arbre',
                              content: `ÃŠtes-vous sÃ»r de vouloir supprimer l'arbre "${tree.name}" ? Cette action est irrÃ©versible.`,
                              okText: 'Supprimer',
                              okType: 'danger',
                              cancelText: 'Annuler',
                              onOk: () => handleDeleteTree(tree.id)
                            });
                          }
                        }
                      }}
                      trigger={['click']}
                    >
                      <Button icon={<SettingOutlined />} size="small">
                        <DownOutlined />
                      </Button>
                    </Dropdown>
                  </Col>
                )}
              </Row>
            </Card>
          </Col>
        </Row>

        {/* Statistiques rapides - 3 colonnes en haut */}
        <Row gutter={[12, 12]} style={{ marginBottom: '16px' }}>
          <Col xs={24} sm={8}>
            <Card size="small">
              <div style={{ textAlign: 'center' }}>
                <ClusterOutlined style={{ fontSize: 20, color: '#1890ff', marginBottom: 6 }} />
                <div>
                  <div style={{ fontSize: 18, fontWeight: 'bold' }}>{tree?.Nodes?.length || 0}</div>
                  <div style={{ color: '#8c8c8c', fontSize: '12px' }}>NÅ“uds</div>
                </div>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small">
              <div style={{ textAlign: 'center' }}>
                <BranchesOutlined style={{ fontSize: 20, color: '#52c41a', marginBottom: 6 }} />
                <div>
                  <div style={{ fontSize: 18, fontWeight: 'bold' }}>{tree?.name ? 1 : 0}</div>
                  <div style={{ color: '#8c8c8c', fontSize: '12px' }}>Arbre</div>
                </div>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small">
              <div style={{ textAlign: 'center' }}>
                <SettingOutlined style={{ fontSize: 20, color: '#722ed1', marginBottom: 6 }} />
                <div>
                  <div style={{ fontSize: 18, fontWeight: 'bold' }}>{selectedNode ? 1 : 0}</div>
                  <div style={{ color: '#8c8c8c', fontSize: '12px' }}>SÃ©lectionnÃ©</div>
                </div>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Interface principale: 3 colonnes TreeBranchLeaf */}
        <Row style={{ height: 'calc(100% - 120px)' }} gutter={[12, 12]}>
          
          {/* Colonne 1: Palette minimaliste - 80px de largeur fixe */}
          <Col flex="80px" style={{ height: '100%' }}>
            <Card
              title={
                <div style={{ textAlign: 'center', padding: '0' }}>
                  <AppstoreOutlined style={{ color: '#1890ff', fontSize: 12 }} />
                </div>
              }
              size="small"
              styles={{
                body: {
                  padding: '4px',
                  height: 'calc(100% - 36px)',
                  overflowY: 'auto'
                }
              }}
              style={{ 
                height: '100%',
                border: '1px solid #e8e8e8'
              }}
            >
              <Palette disabled={loading} />
            </Card>
          </Col>

          {/* Colonne 2: TreeExplorer Windows Style - flexible */}
          <Col flex="1" style={{ height: '100%' }}>
            <TreeExplorer
              tree={tree}
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
              onDropItem={(item, targetNodeId) => {
                console.log('ðŸŽ¯ Drop dans TreeExplorer:', item, 'sur:', targetNodeId);
                handleAddNode(item, targetNodeId);
              }}
              onEditNode={handleEditNode}
              onCloneNode={handleCloneNode}
              onDeleteNode={handleDeleteNode}
              onMoveNode={handleMoveNode}
            />
          </Col>

          {/* Colonne 3: Panneau de propriÃ©tÃ©s - largeur fixe */}
          <Col flex="350px" style={{ height: '100%' }}>
            <PropertiesPanel
              selectedNode={selectedNode}
              onUpdateNode={(nodeId, updates) => {
                console.log('ðŸ”„ Mise Ã  jour nÅ“ud:', nodeId, updates);
                // TODO: Implementer la mise Ã  jour
              }}
            />
          </Col>
          
        </Row>

        {/* Overlay de drag & drop */}
        <DragOverlay>
          {draggedItem && (
            <div style={{
              padding: '8px 12px',
              backgroundColor: '#e6f7ff',
              border: '1px solid #40a9ff',
              borderRadius: '6px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              opacity: 0.8
            }}>
              <Text>{draggedItem.item?.label || 'Ã‰lÃ©ment'}</Text>
            </div>
          )}
        </DragOverlay>
      </div>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {/* Modales */}
      
      {/* Modal de crÃ©ation d'arbre (simple, sans drag & drop) */}
      <Modal
        title="CrÃ©er un nouvel arbre"
        open={isCreatingTree}
        onOk={handleConfirmCreateTree}
        onCancel={handleCancelCreateTree}
        okText="CrÃ©er"
        cancelText="Annuler"
      >
        <div style={{ marginBottom: '16px' }}>
          <Input
            placeholder="Nom de l'arbre (ex: Formulaire de contact)"
            value={newTreeName}
            onChange={(e) => setNewTreeName(e.target.value)}
            onPressEnter={handleConfirmCreateTree}
            autoFocus
          />
        </div>
      </Modal>

      {/* Modal de renommage d'arbre */}
      <Modal
        title="Renommer l'arbre"
        open={isEditingTreeName}
        onOk={handleConfirmRenameTree}
        onCancel={handleCancelRenameTree}
        okText="Renommer"
        cancelText="Annuler"
      >
        <Input
          placeholder="Nouveau nom de l'arbre"
          value={editingTreeName}
          onChange={(e) => setEditingTreeName(e.target.value)}
          onPressEnter={handleConfirmRenameTree}
          autoFocus
        />
      </Modal>

    </DndContext>
  );
};

export default React.memo(TreeBranchLeafLayoutV2);
