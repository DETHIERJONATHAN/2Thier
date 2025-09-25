// Layout TreeBranchLeaf V2 avec 3 colonnes
// Reprend exactement la structure de FormulaireLayout mais pour TreeBranchLeaf

import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Typography, Space } from 'antd';
import { useParams } from 'react-router-dom';
import { 
  SettingOutlined, 
  BranchesOutlined, 
  AppstoreOutlined,
  ClusterOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  NodeIndexOutlined,
  CalculatorOutlined,
  ApiOutlined,
  TableOutlined 
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import TreeBranchLeafPalette from '../../components/TreeBranchLeaf/Palette';
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
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';

const { Title, Text } = Typography;

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

// Type pour les données de l'API (structure hiérarchique)
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
          Aucun arbre chargé
        </div>
        <div style={{ fontSize: '14px' }}>
          Sélectionnez un arbre pour commencer
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
    
    return (
      <div key={node.id} style={{ marginLeft: level * 20 }}>
        <div
          style={{
            padding: '8px 12px',
            margin: '4px 0',
            border: isSelected ? '2px solid #1890ff' : '1px solid #d9d9d9',
            borderRadius: '4px',
            backgroundColor: isSelected ? '#e6f7ff' : '#ffffff',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onClick={() => setSelectedNode(node)}
          onMouseEnter={(e) => {
            if (!isSelected) {
              e.currentTarget.style.backgroundColor = '#f5f5f5';
            }
          }}
          onMouseLeave={(e) => {
            if (!isSelected) {
              e.currentTarget.style.backgroundColor = '#ffffff';
            }
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {getNodeIcon(node.type, node.subType)}
              <div>
                <div style={{ fontWeight: 500, fontSize: '14px' }}>
                  {node.label}
                </div>
                <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                  {node.type}{node.subType ? ` • ${node.subType}` : ''}
                  {node.description && ` • ${node.description}`}
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
      
      {tree.Nodes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#8c8c8c' }}>
          <ClusterOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
          <div style={{ fontSize: '16px', marginBottom: '8px' }}>
            Aucun nœud dans cet arbre
          </div>
          <div style={{ fontSize: '14px' }}>
            Glissez-déposez des blocs depuis la palette pour construire votre arbre
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

// Configuration des paramètres (colonne droite)
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
            Paramètres du nœud
          </Title>
          <p style={{ 
            color: '#bfbfbf', 
            margin: 0,
            fontSize: '14px',
            lineHeight: '1.4'
          }}>
            Sélectionnez un nœud dans l'arbre pour configurer ses paramètres
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px' }}>
      <Title level={5} style={{ marginBottom: '16px' }}>
        <SettingOutlined style={{ marginRight: '8px' }} />
        Paramètres: {selectedNode.label}
      </Title>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Informations générales */}
        <Card size="small" title="Informations générales">
          <div style={{ marginBottom: '8px' }}>
            <Text strong>Type:</Text> {selectedNode.type}
            {selectedNode.subType && <> • {selectedNode.subType}</>}
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

        {/* Propriétés */}
        <Card size="small" title="Propriétés">
          <div style={{ marginBottom: '8px' }}>
            <Text strong>Requis:</Text> {selectedNode.isRequired ? '✅ Oui' : '❌ Non'}
          </div>
          <div style={{ marginBottom: '8px' }}>
            <Text strong>Visible:</Text> {selectedNode.isVisible ? '✅ Oui' : '❌ Non'}
          </div>
          <div style={{ marginBottom: '8px' }}>
            <Text strong>Actif:</Text> {selectedNode.isActive ? '✅ Oui' : '❌ Non'}
          </div>
        </Card>

        {/* Configuration spécialisée selon le type */}
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

// Layout principal TreeBranchLeaf V2
const TreeBranchLeafLayoutV2: React.FC = () => {
  console.log('🌟 [TreeBranchLeaf] Composant TreeBranchLeafLayoutV2 chargé !');
  const { id: treeId } = useParams<{ id: string }>();
  const { api } = useAuthenticatedApi();
  const [tree, setTree] = useState<TreeBranchLeafTree | null>(null);
  const [selectedNode, setSelectedNode] = useState<TreeBranchLeafNode | null>(null);
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Charger l'arbre
  const fetchTree = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔄 [TreeBranchLeafV2] Initialisation composant TreeBranchLeaf');
      
      if (!treeId) {
        // Pas d'ID spécifique, créer un arbre par défaut pour la démo
        console.log('📋 [TreeBranchLeafV2] Pas d\'ID d\'arbre, création arbre par défaut');
        const defaultTree = {
          id: 'default-tree',
          name: 'Arbre de démonstration',
          description: 'Arbre TreeBranchLeaf par défaut',
          Nodes: [],
        };
        setTree(defaultTree);
        setLoading(false);
        return;
      }

      console.log('🔄 [TreeBranchLeafV2] Chargement de l\'arbre:', treeId);
      
      const response = await api.get(`/api/treebranchleaf-v2/trees/${treeId}`);
      console.log('✅ [TreeBranchLeafV2] Réponse API reçue:', response);
      
      // L'API retourne une structure hiérarchique avec des Children imbriqués
      // Nous devons d'abord aplatir cette structure en liste de nœuds
      const flattenNodes = (nodes: ApiTreeNode[]): TreeBranchLeafNode[] => {
        const flattened: TreeBranchLeafNode[] = [];
        
        const flatten = (nodeList: ApiTreeNode[], parentId: string | null = null) => {
          for (const node of nodeList) {
            // Ajouter le nœud à la liste plate avec tous les champs requis
            flattened.push({
              id: node.id,
              type: node.type,
              subType: node.subType,
              label: node.label,
              description: node.description,
              value: node.value,
              order: node.order || 0,
              isRequired: node.isRequired || false,
              isVisible: node.isVisible !== false,
              isActive: node.isActive !== false,
              parentId: parentId,
              children: [], // On recontruira cela après
              fieldConfig: node.fieldConfig,
              conditionConfig: node.conditionConfig,
              formulaConfig: node.formulaConfig,
              tableConfig: node.tableConfig,
              apiConfig: node.apiConfig,
              linkConfig: node.linkConfig,
              MarkerLinks: node.MarkerLinks,
            });
            
            // Traiter récursivement les enfants
            if (node.Children && node.Children.length > 0) {
              flatten(node.Children, node.id);
            }
          }
        };
        
        flatten(nodes);
        return flattened;
      };

      const nodes = flattenNodes(response.Nodes || []);
      const buildHierarchy = (parentId: string | null = null): TreeBranchLeafNode[] => {
        return nodes
          .filter((node: TreeBranchLeafNode) => node.parentId === parentId)
          .sort((a: TreeBranchLeafNode, b: TreeBranchLeafNode) => a.order - b.order)
          .map((node: TreeBranchLeafNode) => ({
            ...node,
            children: buildHierarchy(node.id),
          }));
      };

      const treeData = {
        ...response,
        Nodes: buildHierarchy(),
      };
      console.log('🌳 [TreeBranchLeafV2] Arbre construit:', treeData);
      
      setTree(treeData);
    } catch (error) {
      console.error('❌ [TreeBranchLeafV2] Erreur lors du chargement:', error);
    } finally {
      setLoading(false);
    }
  }, [api, treeId]);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  const handleDragEnd = (event: DragEndEvent) => {
    console.log('🎯 [TreeBranchLeafV2] Drag end:', event);
    // TODO: Implémenter la logique de drag & drop
  };

  if (loading) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <ClusterOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
          <div>Chargement de l'arbre...</div>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragEnd={handleDragEnd}
      collisionDetection={closestCenter}
    >
      {/* Layout 3 colonnes identique à FormulaireLayout */}
      <div className="tb-v2-scope tree-branch-leaf-v2" style={{ height: '100vh', overflow: 'hidden' }}>
        <Row style={{ height: '100%' }} gutter={[16, 16]}>
          
          {/* Colonne 1: Palette de blocs - 1/5 = 20% */}
          <Col 
            xs={24} 
            sm={24} 
            md={8} 
            lg={5} 
            xl={5}
            style={{ height: '100%' }}
          >
            <Card
              title={
                <Space size={6}>
                  <AppstoreOutlined style={{ color: '#1890ff', fontSize: 14 }} />
                  <span>Palette de blocs</span>
                </Space>
              }
              size="small"
              styles={{
                body: {
                  padding: '10px',
                  height: 'calc(100vh - 80px)',
                  overflowY: 'auto'
                }
              }}
              style={{ 
                height: '100%',
                border: '1px solid #d9d9d9',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
              }}
            >
              <TreeBranchLeafPalette />
            </Card>
          </Col>

          {/* Colonne 2: Structure de l'arbre - 2/5 = 40% */}
          <Col 
            xs={24} 
            sm={24} 
            md={16} 
            lg={8} 
            xl={8}
            style={{ height: '100%' }}
          >
            <Card
              title={
                <Space size={6}>
                  <BranchesOutlined style={{ color: '#52c41a', fontSize: 14 }} />
                  <span>Structure de l'arbre</span>
                </Space>
              }
              size="small"
              styles={{
                body: {
                  padding: '12px',
                  height: 'calc(100vh - 80px)',
                  overflowY: 'auto',
                  background: '#ffffff'
                }
              }}
              style={{ 
                height: '100%',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}
            >
              <TreeExplorer
                tree={tree}
                selectedNode={selectedNode}
                onSelectNode={setSelectedNode}
                onDropItem={(item, targetNodeId) => console.log('Drop:', item, 'on:', targetNodeId)}
              />
            </Card>
          </Col>

          {/* Colonne 3: Paramètres du nœud - 3/5 = 60% mais ajusté à 11/24 */}
          <Col 
            xs={24} 
            sm={24} 
            md={24} 
            lg={11} 
            xl={11}
            style={{ height: '100%' }}
          >
            <Card
              title={
                <Space size={6}>
                  <SettingOutlined style={{ color: '#722ed1', fontSize: 14 }} />
                  <span>Paramètres du nœud</span>
                </Space>
              }
              size="small"
              styles={{
                body: {
                  padding: '12px',
                  height: 'calc(100vh - 80px)',
                  overflowY: 'auto'
                }
              }}
              style={{ 
                height: '100%',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}
            >
              <PropertiesPanel
                selectedNode={selectedNode}
                onUpdateNode={(nodeId, updates) => console.log('Update node:', nodeId, updates)}
              />
            </Card>
          </Col>
          
        </Row>
      </div>
    </DndContext>
  );
};

export default TreeBranchLeafLayoutV2;
