import React, { useState, useCallback, useEffect } from 'react';
import { Card, Button, Typography, Divider, Tooltip, message, Input, Modal, Select, Switch } from 'antd';
import { PlusOutlined, DeleteOutlined, DragOutlined, EditOutlined } from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';

const { Text, Title } = Typography;
const { Option } = Select;

// Types exacts pour le schéma de ton image
interface FieldConfig {
  required?: boolean;
  placeholder?: string;
  options?: string[];
  min?: number;
  max?: number;
}

interface ApiNodeData {
  id: string;
  label: string;
  value: string;
  parentId: string | null;
  fieldId: string;
  nodeType?: 'option' | 'option-with-field';
  fieldType?: 'text' | 'number' | 'date' | 'select' | 'boolean';
  fieldConfig?: FieldConfig;
  order?: number;
}

interface GenealogyNode {
  id: string;
  label: string;
  value: string;
  parentId: string | null;
  fieldId: string;
  nodeType: 'option' | 'option-with-field';
  fieldType?: 'text' | 'number' | 'date' | 'select' | 'boolean';
  fieldConfig?: FieldConfig;
  order: number;
  level: number;
}

// Fonction utilitaire pour les slugs
const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

// PALETTE DRAG & DROP - EXACTEMENT comme ton schéma
const DragPalette: React.FC<{
  onDragStart: (type: 'option' | 'option-with-field') => void;
  onDirectAdd: (type: 'option' | 'option-with-field') => void;
}> = ({ onDragStart, onDirectAdd }) => {
  return (
    <div className="w-20 bg-white border-r-2 border-black flex flex-col">
      {/* Texte "Option" vertical */}
      <div className="h-20 border-b-2 border-black flex items-center justify-center bg-gray-50">
        <div className="transform rotate-90 font-bold text-sm">Option</div>
      </div>
      
      {/* Bouton O - BLEU */}
      <div className="p-2">
        <div
          draggable
          onDragStart={(e) => {
            onDragStart('option');
            e.dataTransfer.effectAllowed = 'copy';
          }}
          onClick={() => onDirectAdd('option')}
          className="w-14 h-8 bg-blue-400 border-2 border-black rounded cursor-grab hover:bg-blue-500 flex items-center justify-center mb-2"
        >
          <span className="text-white font-bold">O</span>
        </div>
        
        {/* Bouton O+C - VERT */}
        <div
          draggable
          onDragStart={(e) => {
            onDragStart('option-with-field');
            e.dataTransfer.effectAllowed = 'copy';
          }}
          onClick={() => onDirectAdd('option-with-field')}
          className="w-14 h-8 bg-green-500 border-2 border-black rounded cursor-grab hover:bg-green-600 flex items-center justify-center"
        >
          <span className="text-white font-bold text-xs">O + C</span>
        </div>
      </div>
      
      {/* Sections OPTION 1, OPTION 2, etc. comme ton schéma */}
      <div className="flex-1">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-24 border-b border-dashed border-gray-400 flex items-center justify-center">
            <div className="transform rotate-90 text-xs font-bold text-gray-600">
              OPTION {index + 1}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// CELLULE du tableau - EXACTEMENT comme ton schéma (bleue ou verte)
const TableCell: React.FC<{
  node: GenealogyNode;
  onEdit: (id: string, label: string) => void;
  onDelete: (id: string) => void;
  onDrop: (e: React.DragEvent, targetId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  isDragOver: boolean;
}> = ({ node, onEdit, onDelete, onDrop, onDragOver, onDragLeave, isDragOver }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(node.label);

  const handleEdit = () => {
    if (editValue.trim() !== node.label) {
      onEdit(node.id, editValue.trim());
    }
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleEdit();
    if (e.key === 'Escape') {
      setEditValue(node.label);
      setIsEditing(false);
    }
  };

  // Couleurs EXACTES de ton schéma
  const getCellColor = () => {
    if (isDragOver) return 'bg-purple-300 border-purple-600 scale-110 shadow-xl';
    return node.nodeType === 'option-with-field' ? 'bg-green-400' : 'bg-blue-400';
  };

  return (
    <div
      className={`relative w-16 h-6 ${getCellColor()} border-2 border-black rounded flex items-center justify-center cursor-pointer hover:shadow-lg transition-all duration-200 group ${isDragOver ? 'transform scale-110' : ''}`}
      onDrop={(e) => onDrop(e, node.id)}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      {isEditing ? (
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleEdit}
          onKeyDown={handleKeyPress}
          className="w-full h-full text-center text-xs font-bold bg-white rounded"
          autoFocus
        />
      ) : (
        <span 
          className="text-white font-bold text-xs text-center px-1"
          onClick={() => setIsEditing(true)}
        >
          {node.label}
        </span>
      )}
      
      {/* Bouton delete au hover */}
      <Button
        type="primary"
        danger
        size="small"
        icon={<DeleteOutlined />}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(node.id);
        }}
        className="absolute -top-2 -right-2 w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center text-xs"
        style={{ minWidth: '20px', fontSize: '10px' }}
      />

      {/* Indicateur de zone de drop */}
      {isDragOver && (
        <div className="absolute inset-0 border-4 border-dashed border-purple-600 rounded-lg pointer-events-none animate-pulse bg-purple-200 bg-opacity-50" />
      )}
    </div>
  );
};

// COLONNE du tableau - Structure EXACTE de ton schéma avec lignes pointillées
const TableColumn: React.FC<{
  level: number;
  title: string;
  nodes: GenealogyNode[];
  maxRows: number;
  onEdit: (id: string, label: string) => void;
  onDelete: (id: string) => void;
  onDrop: (e: React.DragEvent, level: number) => void;
  onCellDrop: (e: React.DragEvent, targetId: string) => void;
  isDragOver: boolean;
  dragOverCell: string | null;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onCellDragOver: (e: React.DragEvent, cellId: string) => void;
  onCellDragLeave: () => void;
}> = ({ 
  level, 
  title,
  nodes, 
  maxRows,
  onEdit, 
  onDelete, 
  onDrop, 
  onCellDrop,
  isDragOver, 
  dragOverCell,
  onDragOver, 
  onDragLeave,
  onCellDragOver,
  onCellDragLeave 
}) => {
  
  return (
    <div className="w-32 border-r-2 border-black">
      {/* En-tête colonne EXACTEMENT comme ton schéma */}
      <div className="h-20 bg-gray-100 border-b-2 border-black flex items-center justify-center">
        <span className="font-bold text-sm">{title}</span>
      </div>
      
      {/* Zone de contenu avec LIGNES POINTILLÉES HORIZONTALES comme ton schéma */}
      <div 
        className={`relative ${isDragOver ? 'bg-yellow-100' : 'bg-white'}`}
        onDrop={(e) => onDrop(e, level)}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
        {/* 6 sections OPTION avec lignes pointillées comme ton schéma */}
        {Array.from({ length: 6 }).map((_, sectionIndex) => (
          <div key={`section-${sectionIndex}`} className="h-24 border-b border-dashed border-gray-400 relative">
            {/* Cellules dans cette section */}
            <div className="h-full flex flex-col justify-center items-center space-y-1">
              {nodes
                .filter(node => Math.floor(node.order / 4) === sectionIndex) // Grouper par section
                .map((node, cellIndex) => (
                  <TableCell
                    key={node.id}
                    node={node}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onDrop={onCellDrop}
                    onDragOver={(e) => onCellDragOver(e, node.id)}
                    onDragLeave={onCellDragLeave}
                    isDragOver={dragOverCell === node.id}
                  />
                ))}
            </div>
            
            {/* Zone de drop pour section vide */}
            {isDragOver && nodes.filter(node => Math.floor(node.order / 4) === sectionIndex).length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-8 border-2 border-dashed border-yellow-500 rounded bg-yellow-50 animate-pulse flex items-center justify-center">
                  <span className="text-xs text-yellow-700 font-bold">DROP</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// MODAL pour configurer les champs (Option + C)
const FieldConfigModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (fieldType: string, fieldConfig: FieldConfig) => void;
  optionLabel: string;
}> = ({ isOpen, onClose, onConfirm, optionLabel }) => {
  const [fieldType, setFieldType] = useState<string>('text');
  const [placeholder, setPlaceholder] = useState<string>('');
  const [required, setRequired] = useState<boolean>(false);

  const handleConfirm = () => {
    onConfirm(fieldType, {
      required,
      placeholder: placeholder.trim() || `Saisir ${optionLabel.toLowerCase()}...`,
    });
    onClose();
  };

  return (
    <Modal
      title={`Configuration du champ pour "${optionLabel}"`}
      open={isOpen}
      onOk={handleConfirm}
      onCancel={onClose}
      okText="Confirmer"
      cancelText="Annuler"
    >
      <div className="space-y-4">
        <div>
          <Text strong>Type de champ :</Text>
          <Select
            value={fieldType}
            onChange={setFieldType}
            className="w-full mt-2"
          >
            <Option value="text">Texte</Option>
            <Option value="number">Nombre</Option>
            <Option value="date">Date</Option>
            <Option value="select">Liste déroulante</Option>
            <Option value="boolean">Oui/Non</Option>
          </Select>
        </div>
        
        <div>
          <Text strong>Texte d'aide :</Text>
          <Input
            value={placeholder}
            onChange={(e) => setPlaceholder(e.target.value)}
            placeholder={`Saisir ${optionLabel.toLowerCase()}...`}
            className="mt-2"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Switch checked={required} onChange={setRequired} />
          <Text>Champ obligatoire</Text>
        </div>
      </div>
    </Modal>
  );
};

// Hook pour gérer les données avec l'API
function useGenealogyData(fieldId: string, onTreeChange?: (tree: GenealogyNode[]) => void) {
  const [tree, setTree] = useState<GenealogyNode[]>([]);
  const [loading, setLoading] = useState(false);
  const { get, post, put, del } = useAuthenticatedApi();

  const calculateLevel = useCallback((parentId: string | null, allNodes: GenealogyNode[]): number => {
    if (!parentId) return 0;
    const parent = allNodes.find(node => node.id === parentId);
    if (!parent) return 0;
    return 1 + calculateLevel(parent.parentId, allNodes);
  }, []);

  const transformNodes = useCallback((apiData: ApiNodeData[]): GenealogyNode[] => {
    const nodes = apiData.map((item: ApiNodeData) => ({
      id: item.id,
      label: item.label,
      value: item.value,
      parentId: item.parentId,
      fieldId: item.fieldId,
      nodeType: item.nodeType || 'option',
      fieldType: item.fieldType,
      fieldConfig: item.fieldConfig,
      order: item.order || 0,
      level: 0,
    }));

    nodes.forEach(node => {
      node.level = calculateLevel(node.parentId, nodes);
    });

    return nodes;
  }, [calculateLevel]);

  const loadTree = useCallback(async () => {
    if (!fieldId) return;
    
    setLoading(true);
    try {
      const response = await get(`/api/option-nodes?fieldId=${fieldId}`);
      if (response && Array.isArray(response)) {
        const transformedTree = transformNodes(response);
        setTree(transformedTree);
        onTreeChange?.(transformedTree);
      } else {
        setTree([]);
        onTreeChange?.([]);
      }
    } catch (err) {
      console.error('Loading error:', err);
      message.error('Erreur lors du chargement');
      setTree([]);
      onTreeChange?.([]);
    } finally {
      setLoading(false);
    }
  }, [fieldId, get, transformNodes, onTreeChange]);

  const addNode = useCallback(async (
    parentId: string | null, 
    label: string, 
    nodeType: 'option' | 'option-with-field',
    fieldType?: string,
    fieldConfig?: FieldConfig
  ) => {
    if (!label.trim()) return null;
    
    try {
      const response = await post('/api/option-nodes', {
        fieldId,
        parentId,
        label: label.trim(),
        value: slugify(label.trim()),
        type: 'genealogy-option',
        nodeType,
        fieldType,
        fieldConfig,
        order: 0
      });

      await loadTree();
      message.success('Élément ajouté avec succès');
      return response;
    } catch (err) {
      console.error('Add node error:', err);
      message.error('Erreur lors de l\'ajout');
      return null;
    }
  }, [fieldId, post, loadTree]);

  const updateNode = useCallback(async (id: string, label: string) => {
    if (!label.trim()) return;
    
    try {
      await put(`/api/option-nodes/${id}`, {
        label: label.trim(),
        value: slugify(label.trim())
      });
      await loadTree();
      message.success('Élément modifié avec succès');
    } catch (err) {
      console.error('Update node error:', err);
      message.error('Erreur lors de la modification');
    }
  }, [put, loadTree]);

  const deleteNode = useCallback(async (id: string) => {
    try {
      await del(`/api/option-nodes/${id}`);
      await loadTree();
      message.success('Élément supprimé avec succès');
    } catch (err) {
      console.error('Delete node error:', err);
      message.error('Erreur lors de la suppression');
    }
  }, [del, loadTree]);

  return { 
    tree, 
    loading, 
    loadTree, 
    addNode, 
    updateNode, 
    deleteNode 
  };
}

// COMPOSANT PRINCIPAL - Design EXACT de ton schéma
interface GenealogyNewProps {
  fieldId: string;
  onTreeChange?: (tree: GenealogyNode[]) => void;
}

const GenealogyNew: React.FC<GenealogyNewProps> = ({ fieldId, onTreeChange }) => {
  const [draggedType, setDraggedType] = useState<'option' | 'option-with-field' | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<number | null>(null);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  const [fieldConfigModal, setFieldConfigModal] = useState<{
    isOpen: boolean;
    optionLabel: string;
    parentId: string | null;
  }>({
    isOpen: false,
    optionLabel: '',
    parentId: null
  });

  const { 
    tree, 
    loading, 
    loadTree, 
    addNode, 
    updateNode, 
    deleteNode 
  } = useGenealogyData(fieldId, onTreeChange);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  // Organiser en colonnes EXACTEMENT comme ton schéma + FORCER l'affichage
  const organizeByColumns = (nodes: GenealogyNode[]) => {
    // FORCER au moins 3 colonnes pour la démo comme dans ton image
    const maxLevel = Math.max(...nodes.map(n => n.level || 0), 2); 
    const columns = [];
    
    for (let i = 0; i <= maxLevel; i++) {
      columns.push({
        level: i,
        title: i === 0 ? 'Niveau 1' : i === 1 ? 'Niveau 2' : i === 2 ? 'Niveau 3' : `Niveau ${i + 1}`,
        nodes: nodes.filter(n => (n.level || 0) === i).sort((a, b) => (a.order || 0) - (b.order || 0))
      });
    }
    
    return columns;
  };

  const columns = organizeByColumns(tree);
  // TOUJOURS afficher au moins 3 colonnes comme dans ton schéma
  if (columns.length < 3) {
    for (let i = columns.length; i < 3; i++) {
      columns.push({
        level: i,
        title: i === 0 ? 'Niveau 1' : i === 1 ? 'Niveau 2' : i === 2 ? 'Niveau 3' : `Niveau ${i + 1}`,
        nodes: []
      });
    }
  }
  const maxRows = Math.max(8, Math.max(...columns.map(col => col.nodes.length))); // Au moins 8 lignes comme ton schéma

  // Handlers pour le drag & drop
  const handleDragStart = (type: 'option' | 'option-with-field') => {
    setDraggedType(type);
  };

  const handleDirectAdd = async (type: 'option' | 'option-with-field') => {
    const defaultLabel = type === 'option' ? 'O' : 'O+C';
    
    if (type === 'option-with-field') {
      setFieldConfigModal({
        isOpen: true,
        optionLabel: defaultLabel,
        parentId: null
      });
    } else {
      await addNode(null, defaultLabel, type);
    }
  };

  const handleDrop = async (e: React.DragEvent, level: number) => {
    e.preventDefault();
    if (!draggedType) return;

    // Logique de nommage EXACTE de ton schéma
    const nodesAtLevel = tree.filter(n => n.level === level);
    const nextOrder = nodesAtLevel.length;
    
    let defaultLabel = '';
    if (level === 0) {
      // Niveau 1: 1, 2, 3, 4...
      defaultLabel = draggedType === 'option' ? `${nextOrder + 1}` : `${nextOrder + 1}a`;
    } else {
      // Niveaux suivants: 1-1, 1-2, 4-1, 4-2... comme ton schéma
      const parentNodes = tree.filter(n => n.level === level - 1);
      if (parentNodes.length > 0) {
        const baseNumber = Math.max(...parentNodes.map(n => parseInt(n.label.split('-')[0] || n.label))) || 1;
        const childrenOfParent = tree.filter(n => n.level === level && n.label.startsWith(`${baseNumber}-`));
        const nextChildOrder = childrenOfParent.length + 1;
        defaultLabel = draggedType === 'option' ? `${baseNumber}-${nextChildOrder}` : `${baseNumber}-${nextChildOrder}a`;
      } else {
        defaultLabel = draggedType === 'option' ? '1-1' : '1-1a';
      }
    }

    if (draggedType === 'option-with-field') {
      setFieldConfigModal({
        isOpen: true,
        optionLabel: defaultLabel,
        parentId: null
      });
    } else {
      await addNode(null, defaultLabel, draggedType);
    }

    setDraggedType(null);
    setDragOverColumn(null);
  };

  const handleCellDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedType) return;

    const targetNode = tree.find(n => n.id === targetId);
    if (!targetNode) return;

    const defaultLabel = draggedType === 'option' ? `${targetNode.level + 1}-${targetNode.order + 1}` : `${targetNode.level + 1}-${targetNode.order + 1}a`;
    
    if (draggedType === 'option-with-field') {
      setFieldConfigModal({
        isOpen: true,
        optionLabel: defaultLabel,
        parentId: targetId
      });
    } else {
      await addNode(targetId, defaultLabel, draggedType);
    }

    setDraggedType(null);
    setDragOverCell(null);
  };

  const handleDragOver = (e: React.DragEvent, level: number) => {
    e.preventDefault();
    setDragOverColumn(level);
    setDragOverCell(null);
  };

  const handleCellDragOver = (e: React.DragEvent, cellId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCell(cellId);
    setDragOverColumn(null);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleCellDragLeave = () => {
    setDragOverCell(null);
  };

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: 'Supprimer cet élément ?',
      content: 'Cette action supprimera également tous les éléments enfants.',
      okText: 'Supprimer',
      cancelText: 'Annuler',
      okType: 'danger',
      onOk: () => deleteNode(id),
    });
  };

  const handleFieldConfigConfirm = async (fieldType: string, fieldConfig: FieldConfig) => {
    if (fieldConfigModal.optionLabel) {
      await addNode(
        fieldConfigModal.parentId,
        fieldConfigModal.optionLabel,
        'option-with-field',
        fieldType,
        fieldConfig
      );
    }
    setFieldConfigModal({ isOpen: false, optionLabel: '', parentId: null });
  };

  if (loading) {
    return (
      <Card className="h-96">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <Text>Chargement de la généalogie...</Text>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-lg">
      {/* En-tête du composant */}
      <div className="bg-gradient-to-r from-blue-500 to-green-500 text-white p-4 -m-6 mb-6 rounded-t-lg">
        <div className="text-center">
          <Title level={3} className="text-white mb-2">
            Genealogy Builder Pro
          </Title>
          <Text className="text-blue-100">
            Tableau évolutif • Drag & Drop • Structure infinie
          </Text>
        </div>
      </div>

      {/* Structure tableau EXACTE de ton schéma avec traits noirs */}
      <div className="flex border-4 border-black bg-white rounded-none overflow-hidden shadow-lg" style={{ height: '600px' }}>
        {/* Palette de gauche - EXACTEMENT comme ton schéma */}
        <DragPalette 
          onDragStart={handleDragStart} 
          onDirectAdd={handleDirectAdd}
        />

        {/* Colonnes du tableau - Structure de ton schéma */}
        <div className="flex flex-1 overflow-x-auto">          
          {/* Colonnes selon ton schéma - TOUJOURS VISIBLES */}
          {columns.map(column => (
            <TableColumn
              key={column.level}
              level={column.level}
              title={column.title}
              nodes={column.nodes}
              maxRows={maxRows}
              onEdit={updateNode}
              onDelete={handleDelete}
              onDrop={handleDrop}
              onCellDrop={handleCellDrop}
              isDragOver={dragOverColumn === column.level}
              dragOverCell={dragOverCell}
              onDragOver={(e) => handleDragOver(e, column.level)}
              onDragLeave={handleDragLeave}
              onCellDragOver={handleCellDragOver}
              onCellDragLeave={handleCellDragLeave}
            />
          ))}
        </div>
      </div>

      {/* Modal de configuration */}
      <FieldConfigModal
        isOpen={fieldConfigModal.isOpen}
        onClose={() => setFieldConfigModal({ isOpen: false, optionLabel: '', parentId: null })}
        onConfirm={handleFieldConfigConfirm}
        optionLabel={fieldConfigModal.optionLabel}
      />
    </Card>
  );
};

export default GenealogyNew;
