import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Typography, Input, Select, Switch, Modal, Tooltip, Space, Divider } from 'antd';
import { 
  PlusOutlined, 
  DeleteOutlined, 
  EditOutlined, 
  SettingOutlined,
  FileTextOutlined,
  AppstoreOutlined,
  FieldBinaryOutlined,
  CaretRightOutlined,
  CaretDownOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';

const { Text, Title } = Typography;
const { Option } = Select;

// Types pour le système révolutionnaire O, O+C, C
interface NodeData {
  id: string;
  label: string;
  type: 'O' | 'O+C' | 'C';
  parentId: string | null;
  fieldId: string;
  order: number;
  level: number;
  fieldType?: 'text' | 'number' | 'date' | 'select' | 'boolean' | 'file' | 'image';
  fieldConfig?: {
    required?: boolean;
    placeholder?: string;
    options?: string[];
    min?: number;
    max?: number;
    regex?: string;
  };
  children?: NodeData[];
}

// Icônes selon le type
const NodeIcon: React.FC<{ type: 'O' | 'O+C' | 'C' }> = ({ type }) => {
  switch (type) {
    case 'O':
      return <FileTextOutlined className="text-blue-600 mr-2" />;
    case 'O+C':
      return <AppstoreOutlined className="text-green-600 mr-2" />;
    case 'C':
      return <FieldBinaryOutlined className="text-yellow-600 mr-2" />;
  }
};

// Badge coloré selon le type
const TypeBadge: React.FC<{ type: 'O' | 'O+C' | 'C' }> = ({ type }) => {
  const colors = {
    'O': 'bg-blue-100 text-blue-800 border-blue-300',
    'O+C': 'bg-green-100 text-green-800 border-green-300',
    'C': 'bg-yellow-100 text-yellow-800 border-yellow-300'
  };
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-bold border ${colors[type]}`}>
      {type}
    </span>
  );
};

// Hook pour gérer les données avec Prisma
function useExplorerData(fieldId: string) {
  const [tree, setTree] = useState<NodeData[]>([]);
  const [loading, setLoading] = useState(false);
  const { api } = useAuthenticatedApi();

  const loadTree = useCallback(async () => {
    if (!fieldId) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/api/option-nodes/field/${fieldId}/tree`);
      if (response.success && response.tree) {
        // Convertir en format NodeData avec types O, O+C, C
        const convertedTree = response.tree.map((node: any) => ({
          id: node.id,
          label: node.label,
          type: node.fieldType ? 'O+C' : 'O' as 'O' | 'O+C' | 'C',
          parentId: node.parentId,
          fieldId: node.fieldId,
          order: node.order || 0,
          level: node.level || 0,
          fieldType: node.fieldType,
          fieldConfig: node.fieldConfig,
          children: []
        }));
        setTree(buildHierarchy(convertedTree));
      }
    } catch (error) {
      console.error('Erreur chargement arbre:', error);
    } finally {
      setLoading(false);
    }
  }, [fieldId, api]);

  const addNode = useCallback(async (
    parentId: string | null, 
    label: string, 
    type: 'O' | 'O+C' | 'C',
    fieldType?: string,
    fieldConfig?: any
  ) => {
    try {
      const response = await api.post('/api/option-nodes', {
        label,
        value: label.toLowerCase().replace(/\s+/g, '-'),
        parentId,
        fieldId,
        nodeType: type === 'C' ? 'field-only' : type === 'O+C' ? 'option-with-field' : 'option',
        fieldType,
        fieldConfig,
        order: tree.length
      });
      
      if (response.success) {
        await loadTree();
      }
    } catch (error) {
      console.error('Erreur création nœud:', error);
    }
  }, [api, fieldId, tree.length, loadTree]);

  const updateNode = useCallback(async (id: string, updates: Partial<NodeData>) => {
    try {
      await api.put(`/api/option-nodes/${id}`, updates);
      await loadTree();
    } catch (error) {
      console.error('Erreur mise à jour nœud:', error);
    }
  }, [api, loadTree]);

  const deleteNode = useCallback(async (id: string) => {
    try {
      await api.delete(`/api/option-nodes/${id}`);
      await loadTree();
    } catch (error) {
      console.error('Erreur suppression nœud:', error);
    }
  }, [api, loadTree]);

  return {
    tree,
    loading,
    loadTree,
    addNode,
    updateNode,
    deleteNode
  };
}

// Fonction utilitaire pour construire la hiérarchie
function buildHierarchy(nodes: NodeData[]): NodeData[] {
  const nodeMap = new Map<string, NodeData>();
  const roots: NodeData[] = [];

  // Créer le map des nœuds
  nodes.forEach(node => {
    nodeMap.set(node.id, { ...node, children: [] });
  });

  // Construire la hiérarchie
  nodes.forEach(node => {
    const currentNode = nodeMap.get(node.id)!;
    if (node.parentId && nodeMap.has(node.parentId)) {
      const parent = nodeMap.get(node.parentId)!;
      parent.children!.push(currentNode);
    } else {
      roots.push(currentNode);
    }
  });

  return roots.sort((a, b) => a.order - b.order);
}

// Composant TreeNode pour l'affichage hiérarchique AVEC DRAG & DROP
const TreeNode: React.FC<{
  node: NodeData;
  level: number;
  onEdit: (node: NodeData) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onDrop: (parentId: string, type: 'O' | 'O+C' | 'C') => void;
  isDragOver: boolean;
  onDragOver: (nodeId: string) => void;
  onDragLeave: () => void;
}> = ({ 
  node, 
  level, 
  onEdit, 
  onDelete, 
  onAddChild, 
  onDrop, 
  isDragOver, 
  onDragOver, 
  onDragLeave 
}) => {
  const [expanded, setExpanded] = useState(false);
  const [fieldValue, setFieldValue] = useState("");

  const hasChildren = node.children && node.children.length > 0;
  const indentWidth = level * 24;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const draggedType = e.dataTransfer.getData('text/plain') as 'O' | 'O+C' | 'C';
    if (draggedType) {
      onDrop(node.id, draggedType);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragOver(node.id);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragLeave();
  };

  return (
    <div className="select-none">
      {/* Ligne principale du nœud AVEC ZONE DE DROP */}
      <div 
        className={`flex items-center py-2 px-3 hover:bg-gray-50 rounded cursor-pointer group transition-all duration-200 ${
          isDragOver ? 'bg-yellow-100 border-2 border-yellow-400 border-dashed scale-105' : ''
        }`}
        style={{ paddingLeft: indentWidth + 12 }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {/* Zone de drop visible */}
        {isDragOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-yellow-200 bg-opacity-75 rounded">
            <Text className="font-bold text-yellow-800">
              🎯 DÉPOSER ICI
            </Text>
          </div>
        )}

        {/* Chevron d'expansion */}
        <div className="w-4 flex justify-center mr-2">
          {hasChildren ? (
            <Button 
              type="text" 
              size="small"
              icon={expanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
              onClick={() => setExpanded(!expanded)}
              className="w-4 h-4 p-0 flex items-center justify-center"
            />
          ) : (
            <span className="w-4 h-4 flex items-center justify-center">
              <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
            </span>
          )}
        </div>

        {/* Icône du type */}
        <NodeIcon type={node.type} />

        {/* Label et badge */}
        <div className="flex items-center flex-1 mr-4">
          <span className="font-medium text-gray-800 mr-3">{node.label}</span>
          <TypeBadge type={node.type} />
        </div>

        {/* Actions (visibles au survol) */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
          <Tooltip title="Modifier">
            <Button 
              type="text" 
              size="small"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onEdit(node);
              }}
            />
          </Tooltip>
          
          <Tooltip title="Ajouter enfant">
            <Button 
              type="text" 
              size="small"
              icon={<PlusOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onAddChild(node.id);
              }}
            />
          </Tooltip>

          <Tooltip title="Supprimer">
            <Button 
              type="text" 
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(node.id);
              }}
            />
          </Tooltip>
        </div>
      </div>

      {/* Champ inline pour O+C ou C */}
      {(node.type === 'O+C' || node.type === 'C') && expanded && (
        <div className="mb-2" style={{ paddingLeft: indentWidth + 40 }}>
          <div className="bg-gray-50 border border-gray-200 rounded p-3">
            <Text className="text-xs text-gray-600 block mb-2">
              Aperçu du champ pour les utilisateurs :
            </Text>
            <Input
              placeholder={node.fieldConfig?.placeholder || `Valeur pour ${node.label}`}
              value={fieldValue}
              onChange={(e) => setFieldValue(e.target.value)}
              className="w-full"
            />
          </div>
        </div>
      )}

      {/* Enfants */}
      {expanded && hasChildren && (
        <div className="border-l border-gray-200 ml-3" style={{ marginLeft: indentWidth + 16 }}>
          {node.children!.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
              onDrop={onDrop}
              isDragOver={isDragOver && child.id === 'current-drag-over'} // Simple fix temporaire
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Modal pour créer/éditer un nœud
const NodeEditModal: React.FC<{
  isOpen: boolean;
  node: NodeData | null;
  onClose: () => void;
  onConfirm: (nodeData: Partial<NodeData>) => void;
}> = ({ isOpen, node, onClose, onConfirm }) => {
  const [label, setLabel] = useState('');
  const [type, setType] = useState<'O' | 'O+C' | 'C'>('O');
  const [fieldType, setFieldType] = useState<string>('text');
  const [required, setRequired] = useState(false);
  const [placeholder, setPlaceholder] = useState('');

  useEffect(() => {
    if (node) {
      setLabel(node.label);
      setType(node.type);
      setFieldType(node.fieldType || 'text');
      setRequired(node.fieldConfig?.required || false);
      setPlaceholder(node.fieldConfig?.placeholder || '');
    } else {
      setLabel('');
      setType('O');
      setFieldType('text');
      setRequired(false);
      setPlaceholder('');
    }
  }, [node, isOpen]);

  const handleConfirm = () => {
    const nodeData: Partial<NodeData> = {
      label,
      type,
      fieldType: (type === 'O+C' || type === 'C') ? fieldType : undefined,
      fieldConfig: (type === 'O+C' || type === 'C') ? {
        required,
        placeholder: placeholder || `Saisir ${label.toLowerCase()}...`
      } : undefined
    };
    
    onConfirm(nodeData);
    onClose();
  };

  return (
    <Modal
      title={node ? "Modifier l'élément" : "Nouvel élément"}
      open={isOpen}
      onOk={handleConfirm}
      onCancel={onClose}
      okText="Confirmer"
      cancelText="Annuler"
      width={600}
    >
      <div className="space-y-6">
        <div>
          <Text strong>Label de l'élément :</Text>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex: Isolation murale"
            className="mt-2"
          />
        </div>

        <div>
          <Text strong>Type d'élément :</Text>
          <Select
            value={type}
            onChange={setType}
            className="mt-2 w-full"
          >
            <Option value="O">
              <FileTextOutlined className="text-blue-600 mr-2" />
              O - Option seule (choix fixe)
            </Option>
            <Option value="O+C">
              <AppstoreOutlined className="text-green-600 mr-2" />
              O+C - Option + Champ (choix + saisie)
            </Option>
            <Option value="C">
              <FieldBinaryOutlined className="text-yellow-600 mr-2" />
              C - Champ seul (saisie libre)
            </Option>
          </Select>
        </div>

        {(type === 'O+C' || type === 'C') && (
          <>
            <Divider />
            <div>
              <Text strong>Configuration du champ :</Text>
              
              <div className="mt-4 space-y-4">
                <div>
                  <Text>Type de champ :</Text>
                  <Select
                    value={fieldType}
                    onChange={setFieldType}
                    className="mt-2 w-full"
                  >
                    <Option value="text">Texte</Option>
                    <Option value="number">Nombre</Option>
                    <Option value="date">Date</Option>
                    <Option value="select">Liste déroulante</Option>
                    <Option value="boolean">Oui/Non</Option>
                    <Option value="file">Fichier</Option>
                    <Option value="image">Image</Option>
                  </Select>
                </div>

                <div>
                  <Text>Placeholder :</Text>
                  <Input
                    value={placeholder}
                    onChange={(e) => setPlaceholder(e.target.value)}
                    placeholder={`Ex: Saisir ${label.toLowerCase()}...`}
                    className="mt-2"
                  />
                </div>

                <div className="flex items-center">
                  <Switch
                    checked={required}
                    onChange={setRequired}
                    className="mr-3"
                  />
                  <Text>Champ obligatoire</Text>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

// État pour le drag & drop
interface DragState {
  draggedType: 'O' | 'O+C' | 'C' | null;
  dragOverNode: string | null;
}

// Palette drag & drop - ENFIN LE VRAI DRAG & DROP !
const DragPalette: React.FC<{
  onDragStart: (type: 'O' | 'O+C' | 'C') => void;
}> = ({ onDragStart }) => {
  return (
    <div className="w-48 bg-gradient-to-b from-blue-50 to-green-50 border-r-2 border-gray-300 p-4">
      <Title level={5} className="text-center mb-4">
        🎯 Palette Drag & Drop
      </Title>
      
      <div className="space-y-4">
        {/* Option O - BLEUE */}
        <div
          draggable
          onDragStart={(e) => {
            onDragStart('O');
            e.dataTransfer.effectAllowed = 'copy';
            e.dataTransfer.setData('text/plain', 'O');
          }}
          className="bg-blue-400 border-2 border-blue-600 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:bg-blue-500 hover:scale-105 transition-all duration-200 shadow-lg"
        >
          <div className="flex items-center justify-center text-white">
            <FileTextOutlined className="mr-2 text-lg" />
            <div>
              <div className="font-bold">O</div>
              <div className="text-xs">Option seule</div>
            </div>
          </div>
        </div>

        {/* Option O+C - VERTE */}
        <div
          draggable
          onDragStart={(e) => {
            onDragStart('O+C');
            e.dataTransfer.effectAllowed = 'copy';
            e.dataTransfer.setData('text/plain', 'O+C');
          }}
          className="bg-green-500 border-2 border-green-700 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:bg-green-600 hover:scale-105 transition-all duration-200 shadow-lg"
        >
          <div className="flex items-center justify-center text-white">
            <AppstoreOutlined className="mr-2 text-lg" />
            <div>
              <div className="font-bold">O + C</div>
              <div className="text-xs">Option + Champ</div>
            </div>
          </div>
        </div>

        {/* Champ C - JAUNE */}
        <div
          draggable
          onDragStart={(e) => {
            onDragStart('C');
            e.dataTransfer.effectAllowed = 'copy';
            e.dataTransfer.setData('text/plain', 'C');
          }}
          className="bg-yellow-400 border-2 border-yellow-600 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:bg-yellow-500 hover:scale-105 transition-all duration-200 shadow-lg"
        >
          <div className="flex items-center justify-center text-white">
            <FieldBinaryOutlined className="mr-2 text-lg" />
            <div>
              <div className="font-bold">C</div>
              <div className="text-xs">Champ seul</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 p-3 bg-white rounded-lg border border-gray-200">
        <div className="text-xs text-gray-600 text-center">
          <div className="font-bold mb-2">🖱️ Glisser-Déposer</div>
          <div>Faites glisser les éléments vers l'arbre →</div>
        </div>
      </div>
    </div>
  );
};

// Composant principal - Interface Super Admin AVEC DRAG & DROP
interface GenealogyExplorerProps {
  fieldId: string;
  onTreeChange?: (tree: NodeData[]) => void;
}

const GenealogyExplorer: React.FC<GenealogyExplorerProps> = ({ fieldId, onTreeChange }) => {
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    node: NodeData | null;
    parentId: string | null;
  }>({
    isOpen: false,
    node: null,
    parentId: null
  });

  const [dragState, setDragState] = useState<DragState>({
    draggedType: null,
    dragOverNode: null
  });

  const { tree, loading, loadTree, addNode, updateNode, deleteNode } = useExplorerData(fieldId);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  useEffect(() => {
    if (onTreeChange) {
      onTreeChange(tree);
    }
  }, [tree, onTreeChange]);

  // Handlers pour le DRAG & DROP
  const handleDragStart = (type: 'O' | 'O+C' | 'C') => {
    setDragState(prev => ({ ...prev, draggedType: type }));
  };

  const handleDragOver = (nodeId: string) => {
    setDragState(prev => ({ ...prev, dragOverNode: nodeId }));
  };

  const handleDragLeave = () => {
    setDragState(prev => ({ ...prev, dragOverNode: null }));
  };

  const handleDrop = async (parentId: string, type: 'O' | 'O+C' | 'C') => {
    try {
      // Générer un label automatique
      const siblings = tree.filter(n => n.parentId === parentId);
      const nextOrder = siblings.length + 1;
      const defaultLabel = `${type === 'O' ? 'Option' : type === 'O+C' ? 'Option+Champ' : 'Champ'} ${nextOrder}`;
      
      if (type === 'O+C' || type === 'C') {
        // Ouvrir le modal pour configurer le champ
        setEditModal({
          isOpen: true,
          node: null,
          parentId
        });
      } else {
        // Créer directement l'option simple
        await addNode(parentId, defaultLabel, type);
      }
      
      // Reset drag state
      setDragState({ draggedType: null, dragOverNode: null });
      
    } catch (error) {
      console.error('Erreur lors du drop:', error);
    }
  };

  const handleRootDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const draggedType = e.dataTransfer.getData('text/plain') as 'O' | 'O+C' | 'C';
    if (draggedType) {
      await handleDrop(null, draggedType);
    }
  };

  const handleRootDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleAddRoot = () => {
    setEditModal({
      isOpen: true,
      node: null,
      parentId: null
    });
  };

  const handleAddChild = (parentId: string) => {
    setEditModal({
      isOpen: true,
      node: null,
      parentId
    });
  };

  const handleEdit = (node: NodeData) => {
    setEditModal({
      isOpen: true,
      node,
      parentId: node.parentId
    });
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: 'Supprimer cet élément ?',
      content: 'Cette action supprimera également tous les éléments enfants.',
      okText: 'Supprimer',
      cancelText: 'Annuler',
      okType: 'danger',
      onOk: () => deleteNode(id),
    });
  };

  const handleModalConfirm = async (nodeData: Partial<NodeData>) => {
    if (editModal.node) {
      // Modification
      await updateNode(editModal.node.id, nodeData);
    } else {
      // Création
      await addNode(
        editModal.parentId,
        nodeData.label!,
        nodeData.type!,
        nodeData.fieldType,
        nodeData.fieldConfig
      );
    }
    
    setEditModal({ isOpen: false, node: null, parentId: null });
  };

  if (loading) {
    return (
      <Card className="h-96">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <Text>Chargement de l'explorateur...</Text>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-lg">
      {/* En-tête du composant */}
      <div className="bg-gradient-to-r from-blue-500 to-green-500 text-white p-6 -m-6 mb-6 rounded-t-lg">
        <div className="text-center">
          <Title level={3} className="text-white mb-2">
            🎯 Explorateur Généalogique Pro - DRAG & DROP
          </Title>
          <Text className="text-blue-100">
            Interface Super Admin • Glisser-Déposer • Types O/O+C/C • Structure Infinie
          </Text>
        </div>
      </div>

      {/* Interface avec palette drag & drop */}
      <div className="flex border-2 border-gray-300 rounded-lg overflow-hidden" style={{ minHeight: '600px' }}>
        {/* PALETTE DRAG & DROP À GAUCHE */}
        <DragPalette onDragStart={handleDragStart} />

        {/* ZONE PRINCIPALE AVEC ARBRE */}
        <div className="flex-1 flex flex-col">
          {/* Barre d'actions */}
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <div className="flex space-x-2">
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={handleAddRoot}
                size="small"
              >
                Ajouter manuellement
              </Button>
            </div>

            <div className="flex items-center space-x-4 text-xs">
              <div className="flex items-center space-x-2">
                <TypeBadge type="O" />
                <Text className="text-gray-600">Options seules</Text>
              </div>
              <div className="flex items-center space-x-2">
                <TypeBadge type="O+C" />
                <Text className="text-gray-600">Options + Champs</Text>
              </div>
              <div className="flex items-center space-x-2">
                <TypeBadge type="C" />
                <Text className="text-gray-600">Champs seuls</Text>
              </div>
            </div>
          </div>

          {/* ARBRE DES ÉLÉMENTS AVEC ZONE DE DROP */}
          <div 
            className="flex-1 bg-white overflow-auto"
            onDrop={handleRootDrop}
            onDragOver={handleRootDragOver}
          >
            {tree.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-8">
                  <div className="text-6xl mb-4">🌳</div>
                  <Title level={4} className="mb-4">
                    Arbre vide - Glissez pour créer !
                  </Title>
                  <Text className="text-gray-600 block mb-6">
                    Faites glisser les éléments de la palette vers cette zone<br/>
                    ou utilisez le bouton "Ajouter manuellement"
                  </Text>
                  <div className="bg-yellow-50 border-2 border-dashed border-yellow-300 rounded-lg p-8 animate-pulse">
                    <Text className="text-yellow-700 font-bold">
                      🎯 ZONE DE DÉPÔT PRINCIPALE
                    </Text>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4">
                {tree.map(node => (
                  <TreeNode
                    key={node.id}
                    node={node}
                    level={0}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onAddChild={handleAddChild}
                    onDrop={handleDrop}
                    isDragOver={dragState.dragOverNode === node.id}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                  />
                ))}
                
                {/* Zone de drop en bas pour nouveaux éléments racine */}
                <div 
                  className="mt-4 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors duration-200"
                  onDrop={handleRootDrop}
                  onDragOver={handleRootDragOver}
                >
                  <div className="text-center text-gray-500">
                    <PlusOutlined className="text-2xl mb-2" />
                    <div>Glissez ici pour ajouter un nouvel élément racine</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal d'édition */}
      <NodeEditModal
        isOpen={editModal.isOpen}
        node={editModal.node}
        onClose={() => setEditModal({ isOpen: false, node: null, parentId: null })}
        onConfirm={handleModalConfirm}
      />
    </Card>
  );
};

export default GenealogyExplorer;
