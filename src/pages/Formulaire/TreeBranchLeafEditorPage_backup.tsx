import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Layout,
  Card,
  Row,
  Col,
  Typography,
  Button,
  Space,
  Divider,
  Tag,
  message,
  Dropdown,
  Modal,
  Form,
  Input,
  Select,
  Switch,
} from 'antd';
import {
  BranchesOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SettingOutlined,
  ApiOutlined,
  TableOutlined,
  NodeIndexOutlined,
  MoreOutlined,
  SaveOutlined,
  PlayCircleOutlined,
  CopyOutlined,
  CheckCircleOutlined,
  FormOutlined,
  CalculatorOutlined,
  LinkOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ExclamationCircleOutlined,
  TagOutlined,
  QuestionCircleOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  StopOutlined,
  DatabaseOutlined,
  ExportOutlined,
  ImportOutlined,
  ClearOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  ReloadOutlined,
  AppstoreOutlined,
  FolderOutlined,
  FileOutlined,
} from '@ant-design/icons';
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
import {
  useSortable,
  SortableContext as SortableProvider,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';

const { Title, Text } = Typography;
const { Sider, Content } = Layout;
const { Option } = Select;

// Types pour les formulaires
interface NodeFormData {
  type: string;
  subType?: string;
  label: string;
  description?: string;
  value?: string;
  isRequired: boolean;
  isVisible: boolean;
  isActive: boolean;
}
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

// Palette de blocs drag & drop
const BlockPalette: React.FC = () => {
  const blocks = [
    {
      id: 'branch',
      label: '🌿 Branche',
      description: 'Choix ou catégorie',
      color: '#52c41a',
      type: 'branch',
    },
    {
      id: 'leaf-option',
      label: '📄 Option',
      description: 'Choix simple',
      color: '#1890ff',
      type: 'leaf',
      subType: 'option',
    },
    {
      id: 'leaf-field',
      label: '✏️ Champ',
      description: 'Saisie de données',
      color: '#722ed1',
      type: 'leaf',
      subType: 'field',
    },
    {
      id: 'leaf-data',
      label: '📊 Données',
      description: 'Valeur calculée',
      color: '#fa8c16',
      type: 'leaf',
      subType: 'data',
    },
    {
      id: 'leaf-table',
      label: '🧩 Tableau',
      description: 'Lookup croisé',
      color: '#eb2f96',
      type: 'leaf',
      subType: 'table',
    },
    {
      id: 'condition',
      label: '⚖️ Condition',
      description: 'Si... alors...',
      color: '#fa541c',
      type: 'condition',
    },
    {
      id: 'formula',
      label: '🧮 Formule',
      description: 'Calcul complexe',
      color: '#13c2c2',
      type: 'formula',
    },
    {
      id: 'api',
      label: '🔌 API',
      description: 'Appel externe',
      color: '#2f54eb',
      type: 'api',
    },
    {
      id: 'link',
      label: '🔗 Lien',
      description: 'Vers autre arbre',
      color: '#a0d911',
      type: 'link',
    },
  ];

  return (
    <div style={{ padding: '16px' }}>
      <Title level={5} style={{ marginBottom: '16px' }}>
        <BranchesOutlined style={{ marginRight: '8px' }} />
        Palette de blocs
      </Title>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {blocks.map((block) => (
          <div
            key={block.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/json', JSON.stringify({
                type: 'palette-block',
                blockType: block.type,
                subType: block.subType,
                label: block.label.replace(/[^\w\s]/g, ''), // Enlever les emojis
              }));
            }}
            style={{
              padding: '12px',
              backgroundColor: '#fff',
              border: '1px solid #d9d9d9',
              borderRadius: '6px',
              cursor: 'grab',
              transition: 'all 0.2s',
              borderLeft: `4px solid ${block.color}`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ fontWeight: 500, marginBottom: '4px' }}>
              {block.label}
            </div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {block.description}
            </Text>
          </div>
        ))}
      </div>
    </div>
  );
};

// Composant nœud sortable
interface SortableNodeProps {
  node: TreeBranchLeafNode;
  onEdit: (node: TreeBranchLeafNode) => void;
  onDelete: (nodeId: string) => void;
  onAddChild: (parentId: string) => void;
}

const SortableNode: React.FC<SortableNodeProps> = ({
  node,
  onEdit,
  onDelete,
  onAddChild,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Icônes principales par type de nœud (style Windows Explorer)
  const getNodeIcon = (type: string, subType?: string) => {
    switch (type) {
      case 'branch':
        return <FolderOutlined style={{ color: '#fadb14' }} />;
      case 'leaf':
        switch (subType) {
          case 'field':
            return <FormOutlined style={{ color: '#722ed1' }} />;
          case 'data':
            return <DatabaseOutlined style={{ color: '#fa8c16' }} />;
          case 'table':
            return <TableOutlined style={{ color: '#eb2f96' }} />;
          default:
            return <FileOutlined style={{ color: '#1890ff' }} />;
        }
      case 'condition':
        return <BranchesOutlined style={{ color: '#fa541c' }} />;
      case 'formula':
        return <CalculatorOutlined style={{ color: '#13c2c2' }} />;
      case 'api':
        return <ApiOutlined style={{ color: '#2f54eb' }} />;
      case 'link':
        return <LinkOutlined style={{ color: '#a0d911' }} />;
      default:
        return <FileOutlined />;
    }
  };

  // Récupérer les capacités actives d'un nœud
  const getActiveCapabilities = (node: TreeBranchLeafNode) => {
    const capabilities: string[] = [];
    
    // Vérifier les capacités basées sur les propriétés du nœud
    if (node.hasDataCapability) capabilities.push('📊');
    if (node.hasConditions || node.type === 'condition') capabilities.push('⚖️');
    if (node.hasFormula || node.type === 'formula') capabilities.push('🧮');
    if (node.hasTableLookup || node.type === 'table') capabilities.push('🧩');
    if (node.hasApiConnection || node.type === 'api') capabilities.push('🔌');
    if (node.hasLinkedFields || node.type === 'link') capabilities.push('🔗');
    if (node.MarkerLinks && node.MarkerLinks.length > 0) capabilities.push('📍');
    
    return capabilities;
  };

  const getNodeTypeLabel = (type: string, subType?: string) => {
    if (type === 'leaf' && subType) {
      return subType.charAt(0).toUpperCase() + subType.slice(1);
    }
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  // Menu contextuel simplifié pour les champs uniquement
  const menuItems = [
    // === ÉDITION PRINCIPALE ===
    {
      key: 'edit',
      label: 'Modifier',
      icon: <EditOutlined />,
      onClick: () => onEdit(node),
    },
    {
      type: 'divider' as const,
    },

    // === STRUCTURE ET HIÉRARCHIE ===
    {
      key: 'add-child',
      label: 'Ajouter enfant',
      icon: <PlusOutlined />,
      children: [
        {
          key: 'add-field',
          label: '✏️ Champ',
          icon: <FormOutlined />,
          onClick: () => onAddChild(node.id),
        },
        {
          key: 'add-branch',
          label: '📁 Branche/Section',
          icon: <FolderOutlined />,
          onClick: () => onAddChild(node.id),
        },
      ]
    },

    // === CAPACITÉS ===
    {
      key: 'capabilities',
      label: 'Ajouter capacités',
      icon: <AppstoreOutlined />,
      children: [
        {
          key: 'activate-data',
          label: '� Données',
          icon: <DatabaseOutlined />,
          onClick: () => handleActivateCapability(node.id, 'data'),
        },
        {
          key: 'add-option-field',
          label: '🟩 Option + Champ (O+C)', 
          icon: <FormOutlined />,
          onClick: () => handleAddChild(node.id, 'OPTION_WITH_FIELD'),
        },
        {
          key: 'add-field',
          label: '✏️ Champ seul (C)',
          icon: <EditOutlined />,
          onClick: () => handleAddChild(node.id, 'FIELD_ONLY'),
        },
        {
          key: 'add-condition',
          label: 'Condition logique',
          icon: <SettingOutlined />,
          onClick: () => handleAddChild(node.id, 'condition'),
        },
        {
          key: 'add-formula',
          label: 'Formule de calcul',
          icon: <CalculatorOutlined />,
          onClick: () => handleAddChild(node.id, 'formula'),
        },
        {
          key: 'add-table',
          label: 'Tableau de données',
          icon: <TableOutlined />,
          onClick: () => handleAddChild(node.id, 'table'),
        },
        {
          key: 'add-api',
          label: 'Connexion API',
          icon: <ApiOutlined />,
          onClick: () => handleAddChild(node.id, 'api'),
        },
        {
          key: 'add-redirect',
          label: 'Redirection',
          icon: <LinkOutlined />,
          onClick: () => handleAddChild(node.id, 'redirect'),
        },
      ]
    },
    {
      key: 'move-up',
      label: 'Déplacer vers le haut',
      icon: <ArrowUpOutlined />,
      disabled: node.order === 0,
      onClick: () => handleMoveNode(node.id, 'up'),
    },
    {
      key: 'move-down',
      label: 'Déplacer vers le bas',
      icon: <ArrowDownOutlined />,
      onClick: () => handleMoveNode(node.id, 'down'),
    },
    {
      type: 'divider' as const,
    },

    // === SUPPRESSION ===
    {
      key: 'delete',
      label: 'Supprimer',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => onDelete(node.id),
    },
    {
      type: 'divider' as const,
    },

    // === CAPACITÉS ACTIVABLES ===
    {
      key: 'activate-capabilities',
      label: 'Activer capacités',
      icon: <SettingOutlined />,
      children: [
        {
          key: 'activate-data',
          label: '📊 Champ Donnée',
          icon: <TableOutlined />,
          onClick: () => handleActivateCapability(node.id, 'data'),
        },
        {
          key: 'activate-condition',
          label: '⚖️ Conditions',
          icon: <BranchesOutlined />,
          onClick: () => handleActivateCapability(node.id, 'condition'),
        },
        {
          key: 'activate-formula',
          label: '🧮 Formule',
          icon: <CalculatorOutlined />,
          onClick: () => handleActivateCapability(node.id, 'formula'),
        },
        {
          key: 'activate-table',
          label: '🧩 Tableau (lookup)',
          icon: <TableOutlined />,
          onClick: () => handleActivateCapability(node.id, 'table'),
        },
        {
          key: 'activate-api',
          label: '🔌 Connexion API',
          icon: <ApiOutlined />,
          onClick: () => handleActivateCapability(node.id, 'api'),
        },
        {
          key: 'activate-link',
          label: '🔗 Lien/Rebouclage',
          icon: <LinkOutlined />,
          onClick: () => handleActivateCapability(node.id, 'link'),
        },
        {
          key: 'activate-markers',
          label: '📍 Marqueurs',
          icon: <TagOutlined />,
          onClick: () => handleActivateCapability(node.id, 'markers'),
        },
      ]
    },
    {
      key: 'configure',
      label: 'Configuration',
      icon: <SettingOutlined />,
      children: [
        {
          key: 'set-required',
          label: node.isRequired ? 'Rendre facultatif' : 'Rendre obligatoire',
          icon: node.isRequired ? <ExclamationCircleOutlined /> : <QuestionCircleOutlined />,
          onClick: () => handleToggleRequired(node.id),
        },
        {
          key: 'set-visible',
          label: node.isVisible ? 'Masquer' : 'Afficher',
          icon: node.isVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />,
          onClick: () => handleToggleVisible(node.id),
        },
        {
          key: 'set-active',
          label: node.isActive ? 'Désactiver' : 'Activer',
          icon: node.isActive ? <StopOutlined /> : <PlayCircleOutlined />,
          onClick: () => handleToggleActive(node.id),
        },
        {
          type: 'divider' as const,
        },
        {
          key: 'add-condition',
          label: 'Ajouter condition',
          icon: <BranchesOutlined />,
          onClick: () => handleAddCondition(node.id),
        },
        {
          key: 'add-validation',
          label: 'Ajouter validation',
          icon: <CheckCircleOutlined />,
          onClick: () => handleAddValidation(node.id),
        },
      ]
    },
    {
      key: 'dependencies',
      label: 'Dépendances',
      icon: <NodeIndexOutlined />,
      children: [
        {
          key: 'view-dependencies',
          label: 'Voir les dépendances',
          icon: <EyeOutlined />,
          onClick: () => handleViewDependencies(node.id),
        },
        {
          key: 'add-dependency',
          label: 'Ajouter dépendance',
          icon: <PlusOutlined />,
          onClick: () => handleAddDependency(node.id),
        },
        {
          key: 'link-to-formula',
          label: 'Lier à une formule',
          icon: <CalculatorOutlined />,
          onClick: () => handleLinkToFormula(node.id),
        },
      ]
    },
    {
      type: 'divider' as const,
    },

    // === DONNÉES ET INTÉGRATIONS ===
    {
      key: 'data-actions',
      label: 'Données',
      icon: <DatabaseOutlined />,
      children: [
        {
          key: 'export-data',
          label: 'Exporter les données',
          icon: <ExportOutlined />,
          onClick: () => handleExportNodeData(node.id),
        },
        {
          key: 'import-data',
          label: 'Importer des données',
          icon: <ImportOutlined />,
          onClick: () => handleImportNodeData(node.id),
        },
        {
          key: 'clear-data',
          label: 'Vider les données',
          icon: <ClearOutlined />,
          onClick: () => handleClearNodeData(node.id),
        },
      ]
    },
    {
      key: 'test-actions',
      label: 'Tests',
      icon: <ExperimentOutlined />,
      children: [
        {
          key: 'test-node',
          label: 'Tester le nœud',
          icon: <PlayCircleOutlined />,
          onClick: () => handleTestNode(node.id),
        },
        {
          key: 'validate-logic',
          label: 'Valider la logique',
          icon: <CheckCircleOutlined />,
          onClick: () => handleValidateNodeLogic(node.id),
        },
        {
          key: 'preview-form',
          label: 'Prévisualiser',
          icon: <EyeOutlined />,
          onClick: () => handlePreviewNode(node.id),
        },
      ]
    },
    {
      type: 'divider' as const,
    },

    // === ACTIONS DE COPIE ===
    {
      key: 'copy-actions',
      label: 'Copier',
      icon: <CopyOutlined />,
      children: [
        {
          key: 'copy-node-id',
          label: 'Copier l\'ID',
          icon: <CopyOutlined />,
          onClick: () => handleCopyNodeId(node.id),
        },
        {
          key: 'copy-node-config',
          label: 'Copier la configuration',
          icon: <SettingOutlined />,
          onClick: () => handleCopyNodeConfig(node),
        },
        {
          key: 'copy-node-json',
          label: 'Copier au format JSON',
          icon: <FileTextOutlined />,
          onClick: () => handleCopyNodeAsJSON(node),
        },
      ]
    },
    
    // === DANGER ZONE ===
    {
      type: 'divider' as const,
    },
    {
      key: 'reset',
      label: 'Réinitialiser',
      icon: <ReloadOutlined />,
      onClick: () => handleResetNode(node.id),
    },
    {
      key: 'delete',
      label: 'Supprimer',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: () => onDelete(node.id),
    },
  ];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <Card
        size="small"
        style={{
          marginBottom: '8px',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        bodyStyle={{ padding: '8px 12px' }}
      >
        <Row justify="space-between" align="middle">
          <Col flex="auto">
            <Space>
              {getNodeIcon(node.type, node.subType)}
              <div>
                <div style={{ fontWeight: 500 }}>{node.label}</div>
                <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                  {getNodeTypeLabel(node.type, node.subType)}
                  {node.description && ` • ${node.description}`}
                </div>
              </div>
            </Space>
          </Col>
          <Col>
            <Space>
              {node.MarkerLinks && node.MarkerLinks.map((link) => (
                <Tag
                  key={link.id}
                  color={link.Marker.color}
                  size="small"
                >
                  {link.Marker.name}
                </Tag>
              ))}
              <Dropdown
                menu={{ items: menuItems }}
                trigger={['click']}
                placement="bottomRight"
              >
                <Button type="text" size="small" icon={<MoreOutlined />} />
              </Dropdown>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Enfants récursifs */}
      {node.children && node.children.length > 0 && (
        <div style={{ marginLeft: '20px', borderLeft: '2px solid #f0f0f0', paddingLeft: '12px' }}>
          <SortableProvider items={node.children.map(child => child.id)}>
            {node.children.map((child) => (
              <SortableNode
                key={child.id}
                node={child}
                onEdit={onEdit}
                onDelete={onDelete}
                onAddChild={onAddChild}
              />
            ))}
          </SortableProvider>
        </div>
      )}
    </div>
  );
};

const TreeBranchLeafEditorPage: React.FC = () => {
  const { id: treeId } = useParams<{ id: string }>();
  const { api } = useAuthenticatedApi();
  const [tree, setTree] = useState<TreeBranchLeafTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<TreeBranchLeafNode | null>(null);
  const [nodeModalVisible, setNodeModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [form] = Form.useForm();

  // Debug logs
  console.log('🌳 [TreeEditor] Composant monté');
  console.log('🌳 [TreeEditor] treeId depuis params:', treeId);
  console.log('🌳 [TreeEditor] api disponible:', !!api);
  console.log('🌳 [TreeEditor] loading state:', loading);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Charger l'arbre
  const fetchTree = useCallback(async () => {
    console.log('🌳 [TreeEditor] fetchTree appelé');
    console.log('🌳 [TreeEditor] treeId:', treeId);
    console.log('🌳 [TreeEditor] api:', !!api);
    
    if (!treeId) {
      console.log('⚠️ [TreeEditor] Pas de treeId, arrêt');
      return;
    }

    try {
      console.log('🌳 [TreeEditor] Début chargement API pour:', treeId);
      setLoading(true);
      const response = await api.get(`/api/treebranchleaf/trees/${treeId}`);
      console.log('🌳 [TreeEditor] Réponse API brute:', response);
      console.log('🌳 [TreeEditor] Type de response:', typeof response);
      console.log('🌳 [TreeEditor] Type de response.data:', typeof response?.data);
      console.log('🌳 [TreeEditor] Contenu response.data:', response?.data);
      
      // L'API retourne directement l'arbre, pas dans response.data
      const treeData = response?.data || response;
      console.log('🌳 [TreeEditor] TreeData utilisé:', treeData);
      console.log('🌳 [TreeEditor] TreeData.Nodes:', treeData?.Nodes);
      
      // Transformer les nœuds plats en arborescence hiérarchique
      const nodes = treeData.Nodes;
      const buildHierarchy = (parentId: string | null = null): TreeBranchLeafNode[] => {
        return nodes
          .filter((node: TreeBranchLeafNode) => node.parentId === parentId)
          .sort((a: TreeBranchLeafNode, b: TreeBranchLeafNode) => a.order - b.order)
          .map((node: TreeBranchLeafNode) => ({
            ...node,
            children: buildHierarchy(node.id),
          }));
      };

      setTree({
        ...treeData,
        Nodes: buildHierarchy(),
      });
    } catch (error) {
      console.error('🚨 [TreeEditor] Erreur lors du chargement de l\'arbre:', error);
      message.error('Erreur lors du chargement de l\'arbre');
    } finally {
      console.log('🌳 [TreeEditor] Fin chargement, setLoading(false)');
      setLoading(false);
    }
  }, [api, treeId]);

  useEffect(() => {
    console.log('🌳 [TreeEditor] useEffect fetchTree - déclenchement');
    console.log('🌳 [TreeEditor] fetchTree function:', !!fetchTree);
    fetchTree();
  }, [fetchTree]);

  // Gestion drag & drop
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || !tree) return;

    console.log('[TreeBranchLeaf] Drag end:', { active: active.id, over: over.id });
    // TODO: Implémenter la logique de réorganisation
  };

  // Zone de drop pour nouveaux blocs
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    
    try {
      const data = JSON.parse(event.dataTransfer.getData('application/json'));
      
      if (data.type === 'palette-block') {
        handleCreateNode({
          type: data.blockType,
          subType: data.subType,
          label: data.label,
          parentId: null, // Racine par défaut
        });
      }
    } catch (error) {
      console.error('Erreur lors du drop:', error);
    }
  };

  // Créer un nouveau nœud
  const handleCreateNode = async (nodeData: Partial<TreeBranchLeafNode>) => {
    if (!tree) return;

    try {
      await api.post(`/api/treebranchleaf/trees/${tree.id}/nodes`, {
        type: nodeData.type,
        subType: nodeData.subType,
        label: nodeData.label || 'Nouveau nœud',
        parentId: nodeData.parentId,
        order: 0,
        isRequired: false,
        isVisible: true,
        isActive: true,
      });

      message.success('Nœud créé avec succès');
      fetchTree(); // Recharger l'arbre
    } catch (error) {
      console.error('Erreur lors de la création du nœud:', error);
      message.error('Erreur lors de la création du nœud');
    }
  };

  // Modifier un nœud
  const handleEditNode = (node: TreeBranchLeafNode) => {
    setSelectedNode(node);
    setIsEditMode(true);
    form.setFieldsValue({
      label: node.label,
      description: node.description,
      value: node.value,
      isRequired: node.isRequired,
      isVisible: node.isVisible,
      isActive: node.isActive,
    });
    setNodeModalVisible(true);
  };

  // Dupliquer un nœud
  const handleDuplicateNode = async (node: TreeBranchLeafNode) => {
    try {
      const duplicatedData = {
        treeId: treeId,
        type: node.type,
        label: `${node.label} (copie)`,
        description: node.description,
        parentId: node.parentId,
        order: node.order + 1,
        isRequired: node.isRequired,
        isVisible: node.isVisible,
        isActive: node.isActive,
      };

      await api.post(`/api/treebranchleaf/nodes`, duplicatedData);
      message.success('Nœud dupliqué avec succès');
      fetchTree();
    } catch (error) {
      console.error('Erreur lors de la duplication:', error);
      message.error('Erreur lors de la duplication du nœud');
    }
  };

  // Activer une capacité sur un nœud (📊⚖️🧮🧩🔌🔗📍)
  const handleActivateCapability = (nodeId: string, capability: string) => {
    console.log(`🎯 [TreeBranchLeaf] Activer capacité ${capability} sur nœud ${nodeId}`);
    message.info(`Capacité "${capability}" activée sur le nœud (à implémenter)`);
    // TODO: Ouvrir panneau de configuration de la capacité
  };

  // Ajouter un enfant avec type spécifique
  const handleAddChild = (parentId: string, childType: string = 'branch') => {
    setSelectedNode(null);
    setIsEditMode(false);
    form.resetFields();
    form.setFieldsValue({
      type: childType,
      parentId: parentId,
      isRequired: false,
      isVisible: true,
      isActive: true,
    });
    setNodeModalVisible(true);
  };

  // Déplacer un nœud
  const handleMoveNode = async (nodeId: string, direction: 'up' | 'down') => {
    try {
      await api.put(`/api/treebranchleaf/nodes/${nodeId}/move`, { direction });
      message.success(`Nœud déplacé vers le ${direction === 'up' ? 'haut' : 'bas'}`);
      fetchTree();
    } catch (error) {
      console.error('Erreur lors du déplacement:', error);
      message.error('Erreur lors du déplacement du nœud');
    }
  };

  // Toggle Required
  const handleToggleRequired = async (nodeId: string) => {
    try {
      const node = tree?.Nodes.find(n => n.id === nodeId);
      if (!node) return;
      
      await api.put(`/api/treebranchleaf/nodes/${nodeId}`, {
        ...node,
        isRequired: !node.isRequired
      });
      message.success(`Nœud ${node.isRequired ? 'rendu facultatif' : 'rendu obligatoire'}`);
      fetchTree();
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
      message.error('Erreur lors de la modification du nœud');
    }
  };

  // Toggle Visible
  const handleToggleVisible = async (nodeId: string) => {
    try {
      const node = tree?.Nodes.find(n => n.id === nodeId);
      if (!node) return;
      
      await api.put(`/api/treebranchleaf/nodes/${nodeId}`, {
        ...node,
        isVisible: !node.isVisible
      });
      message.success(`Nœud ${node.isVisible ? 'masqué' : 'affiché'}`);
      fetchTree();
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
      message.error('Erreur lors de la modification du nœud');
    }
  };

  // Toggle Active
  const handleToggleActive = async (nodeId: string) => {
    try {
      const node = tree?.Nodes.find(n => n.id === nodeId);
      if (!node) return;
      
      await api.put(`/api/treebranchleaf/nodes/${nodeId}`, {
        ...node,
        isActive: !node.isActive
      });
      message.success(`Nœud ${node.isActive ? 'désactivé' : 'activé'}`);
      fetchTree();
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
      message.error('Erreur lors de la modification du nœud');
    }
  };

  // Ajouter condition
  const handleAddCondition = (nodeId: string) => {
    message.info('Fonctionnalité "Ajouter condition" en développement');
    // TODO: Implémenter l'ajout de condition
  };

  // Ajouter validation
  const handleAddValidation = (nodeId: string) => {
    message.info('Fonctionnalité "Ajouter validation" en développement');
    // TODO: Implémenter l'ajout de validation
  };

  // Voir dépendances
  const handleViewDependencies = (nodeId: string) => {
    message.info('Fonctionnalité "Voir dépendances" en développement');
    // TODO: Implémenter la vue des dépendances
  };

  // Ajouter dépendance
  const handleAddDependency = (nodeId: string) => {
    message.info('Fonctionnalité "Ajouter dépendance" en développement');
    // TODO: Implémenter l'ajout de dépendance
  };

  // Lier à formule
  const handleLinkToFormula = (nodeId: string) => {
    message.info('Fonctionnalité "Lier à formule" en développement');
    // TODO: Implémenter la liaison avec formule
  };

  // Exporter données nœud
  const handleExportNodeData = (nodeId: string) => {
    message.info('Fonctionnalité "Exporter données" en développement');
    // TODO: Implémenter l'export des données
  };

  // Importer données nœud
  const handleImportNodeData = (nodeId: string) => {
    message.info('Fonctionnalité "Importer données" en développement');
    // TODO: Implémenter l'import des données
  };

  // Vider données nœud
  const handleClearNodeData = async (nodeId: string) => {
    try {
      await api.delete(`/api/treebranchleaf/nodes/${nodeId}/data`);
      message.success('Données du nœud vidées');
      fetchTree();
    } catch (error) {
      console.error('Erreur lors du vidage:', error);
      message.error('Erreur lors du vidage des données');
    }
  };

  // Tester nœud
  const handleTestNode = (nodeId: string) => {
    message.info('Fonctionnalité "Tester nœud" en développement');
    // TODO: Implémenter le test du nœud
  };

  // Valider logique nœud
  const handleValidateNodeLogic = (nodeId: string) => {
    message.info('Fonctionnalité "Valider logique" en développement');
    // TODO: Implémenter la validation de logique
  };

  // Prévisualiser nœud
  const handlePreviewNode = (nodeId: string) => {
    message.info('Fonctionnalité "Prévisualiser" en développement');
    // TODO: Implémenter la prévisualisation
  };

  // Copier ID nœud
  const handleCopyNodeId = (nodeId: string) => {
    navigator.clipboard.writeText(nodeId);
    message.success('ID du nœud copié dans le presse-papiers');
  };

  // Copier configuration nœud
  const handleCopyNodeConfig = (node: TreeBranchLeafNode) => {
    const config = {
      type: node.type,
      label: node.label,
      description: node.description,
      isRequired: node.isRequired,
      isVisible: node.isVisible,
      isActive: node.isActive,
    };
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    message.success('Configuration copiée dans le presse-papiers');
  };

  // Copier nœud en JSON
  const handleCopyNodeAsJSON = (node: TreeBranchLeafNode) => {
    navigator.clipboard.writeText(JSON.stringify(node, null, 2));
    message.success('Nœud copié au format JSON');
  };

  // Réinitialiser nœud
  const handleResetNode = async (nodeId: string) => {
    try {
      await api.post(`/api/treebranchleaf/nodes/${nodeId}/reset`);
      message.success('Nœud réinitialisé');
      fetchTree();
    } catch (error) {
      console.error('Erreur lors de la réinitialisation:', error);
      message.error('Erreur lors de la réinitialisation du nœud');
    }
  };

  // Supprimer un nœud
  const handleDeleteNode = async (nodeId: string) => {
    try {
      await api.delete(`/api/treebranchleaf/nodes/${nodeId}`);
      message.success('Nœud supprimé avec succès');
      fetchTree(); // Recharger l'arbre
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      message.error('Erreur lors de la suppression du nœud');
    }
  };

  // Sauvegarder les modifications du nœud
  const handleSaveNode = async (values: NodeFormData) => {
    if (!selectedNode) return;

    try {
      if (isEditMode) {
        // Modification d'un nœud existant
        await api.put(`/api/treebranchleaf/nodes/${selectedNode.id}`, values);
        message.success('Nœud mis à jour avec succès');
      } else {
        // Création d'un nouveau nœud
        await api.post(`/api/treebranchleaf/trees/${tree!.id}/nodes`, {
          ...values,
          parentId: selectedNode.parentId,
          type: values.type || 'leaf',
          subType: values.subType,
          order: 0,
        });
        message.success('Nœud créé avec succès');
      }

      setNodeModalVisible(false);
      setSelectedNode(null);
      form.resetFields();
      fetchTree();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      message.error('Erreur lors de la sauvegarde du nœud');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <BranchesOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
        <div style={{ marginTop: '16px' }}>Chargement de l'arbre...</div>
      </div>
    );
  }

  if (!tree) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <div>Arbre non trouvé</div>
      </div>
    );
  }

  return (
    <Layout style={{ height: '100vh' }}>
      {/* Sidebar - Palette de blocs */}
      <Sider width={280} style={{ backgroundColor: '#fff', borderRight: '1px solid #f0f0f0' }}>
        <div style={{ padding: '16px' }}>
          <Button 
            type="primary" 
            icon={<SaveOutlined />} 
            block 
            style={{ marginBottom: '16px' }}
            onClick={() => {
              message.info('Sauvegarde automatique activée');
            }}
          >
            Sauvegarder
          </Button>
          <Button 
            icon={<PlayCircleOutlined />} 
            block 
            style={{ marginBottom: '16px' }}
            onClick={() => {
              window.open(`/formulaire/treebranchleaf/${tree.id}/preview`, '_blank');
            }}
          >
            Prévisualiser
          </Button>
        </div>
        <Divider style={{ margin: '0 0 16px 0' }} />
        <BlockPalette />
      </Sider>

      {/* Contenu principal */}
      <Layout>
        <Content style={{ padding: '24px', backgroundColor: '#f5f5f5' }}>
          {/* En-tête */}
          <Card style={{ marginBottom: '16px' }}>
            <Row justify="space-between" align="middle">
              <Col>
                <Space>
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      backgroundColor: tree.color,
                      borderRadius: 4,
                    }}
                  />
                  <div>
                    <Title level={4} style={{ margin: 0 }}>
                      {tree.name}
                    </Title>
                    <Text type="secondary">
                      {tree.description || 'Aucune description'}
                    </Text>
                  </div>
                </Space>
              </Col>
              <Col>
                <Space>
                  <Tag color={tree.status === 'published' ? 'green' : 'orange'}>
                    {tree.status === 'published' ? 'Publié' : 'Brouillon'}
                  </Tag>
                  <Text type="secondary">
                    {tree.Nodes.length} nœud{tree.Nodes.length !== 1 ? 's' : ''}
                  </Text>
                </Space>
              </Col>
            </Row>
          </Card>

          {/* Zone principale - Éditeur d'arbre */}
          <Card
            title={
              <Space>
                <BranchesOutlined />
                Structure de l'arbre
              </Space>
            }
            style={{ minHeight: 'calc(100vh - 200px)' }}
          >
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                style={{ 
                  minHeight: '400px',
                  padding: '16px',
                  border: '2px dashed #d9d9d9',
                  borderRadius: '6px',
                  backgroundColor: '#fafafa',
                }}
              >
                {tree.Nodes.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 0', color: '#8c8c8c' }}>
                    <BranchesOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
                    <div style={{ fontSize: '16px', marginBottom: '8px' }}>
                      Aucun nœud dans cet arbre
                    </div>
                    <div style={{ fontSize: '14px' }}>
                      Glissez-déposez des blocs depuis la palette pour construire votre arbre
                    </div>
                  </div>
                ) : (
                  <SortableProvider items={tree.Nodes.map(node => node.id)}>
                    {tree.Nodes.map((node) => (
                      <SortableNode
                        key={node.id}
                        node={node}
                        onEdit={handleEditNode}
                        onDelete={handleDeleteNode}
                        onAddChild={handleAddChild}
                      />
                    ))}
                  </SortableProvider>
                )}
              </div>
            </DndContext>
          </Card>
        </Content>
      </Layout>

      {/* Modal d'édition de nœud */}
      <Modal
        title={isEditMode ? 'Modifier le nœud' : 'Créer un nœud'}
        open={nodeModalVisible}
        onCancel={() => {
          setNodeModalVisible(false);
          setSelectedNode(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveNode}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Type"
                name="type"
                rules={[{ required: true, message: 'Choisissez un type' }]}
              >
                <Select placeholder="Type de nœud">
                  <Option value="branch">🌿 Branche</Option>
                  <Option value="leaf">🍃 Feuille</Option>
                  <Option value="condition">⚖️ Condition</Option>
                  <Option value="formula">🧮 Formule</Option>
                  <Option value="api">🔌 API</Option>
                  <Option value="link">🔗 Lien</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Sous-type"
                name="subType"
                dependencies={['type']}
              >
                <Select placeholder="Sous-type (optionnel)">
                  <Option value="option">Option</Option>
                  <Option value="field">Champ</Option>
                  <Option value="data">Données</Option>
                  <Option value="table">Tableau</Option>
                  <Option value="calculation">Calcul</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Libellé"
            name="label"
            rules={[{ required: true, message: 'Saisissez un libellé' }]}
          >
            <Input placeholder="Libellé du nœud" />
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
          >
            <Input.TextArea rows={2} placeholder="Description détaillée (optionnel)" />
          </Form.Item>

          <Form.Item
            label="Valeur par défaut"
            name="value"
          >
            <Input placeholder="Valeur par défaut (optionnel)" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="Obligatoire"
                name="isRequired"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Visible"
                name="isVisible"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Actif"
                name="isActive"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Row justify="end" gutter={8}>
            <Col>
              <Button onClick={() => {
                setNodeModalVisible(false);
                setSelectedNode(null);
                form.resetFields();
              }}>
                Annuler
              </Button>
            </Col>
            <Col>
              <Button type="primary" htmlType="submit">
                {isEditMode ? 'Mettre à jour' : 'Créer'}
              </Button>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Layout>
  );
};

export default TreeBranchLeafEditorPage;
