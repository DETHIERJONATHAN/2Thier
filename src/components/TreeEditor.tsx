import React, { useState, useEffect, useCallback } from 'react';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';

// Fonction utilitaire pour créer des slugs
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

// Types des éléments dans l'arborescence GENEALOGY
interface GenealogyNode {
  id: string;
  label: string;
  value: string;
  parentId: string | null;
  fieldId: string;
  nodeType: 'simple-option' | 'option-with-field' | 'auto-field';
  fieldType?: 'text' | 'number' | 'date' | 'email' | 'tel' | 'url';
  order: number;
  level: number;
  metadata?: {
    required?: boolean;
    placeholder?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
    helpText?: string;
  };
  children: GenealogyNode[];
}

// Types des éléments de la palette GENEALOGY
interface GenealogyElement {
  id: string;
  nodeType: 'simple-option' | 'option-with-field';
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  shadowColor: string;
  description: string;
  subtext: string;
}

// Configuration de la palette GENEALOGY (seulement 2 éléments révolutionnaires !)
const genealogyElements: GenealogyElement[] = [
  {
    id: 'simple-option',
    nodeType: 'simple-option',
    label: 'Option Simple',
    icon: '�',
    color: 'text-blue-700',
    bgColor: 'bg-gradient-to-br from-blue-100 to-blue-200',
    borderColor: 'border-blue-300',
    shadowColor: 'shadow-blue-200/50',
    description: 'Choix pur et simple',
    subtext: '→ Mène à d\'autres options'
  },
  {
    id: 'option-with-field',
    nodeType: 'option-with-field',
    label: 'Option + Champ',
    icon: '🔵�',
    color: 'text-indigo-700',
    bgColor: 'bg-gradient-to-br from-indigo-100 to-purple-200',
    borderColor: 'border-indigo-300',
    shadowColor: 'shadow-indigo-200/50',
    description: 'Choix avec saisie automatique',
    subtext: '→ Génère un champ + options suivantes'
  }
];

// Composant Palette (à gauche)
interface PaletteProps {
  onDragStart: (element: PaletteElement) => void;
}

const Palette: React.FC<PaletteProps> = ({ onDragStart }) => {
  const handleDragStart = (e: React.DragEvent, element: PaletteElement) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      ...element,
      isFromPalette: true
    }));
    e.dataTransfer.effectAllowed = 'copy';
    onDragStart(element);
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto h-full">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-800 mb-2">🎨 Palette d'éléments</h3>
        <p className="text-sm text-gray-600">Glissez vers la droite pour créer</p>
      </div>
      
      <div className="space-y-2">
        {paletteElements.map((element) => (
          <div
            key={element.id}
            draggable
            onDragStart={(e) => handleDragStart(e, element)}
            className={`
              p-3 rounded-lg border cursor-grab active:cursor-grabbing
              transition-all duration-200 hover:shadow-md
              ${element.bgColor} border-gray-300 hover:border-gray-400
            `}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{element.icon}</span>
              <div className="flex-1 min-w-0">
                <div className={`font-medium text-sm ${element.color}`}>
                  {element.label}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {element.description}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Composant pour afficher un élément dans la zone de construction
interface ConstructionElementProps {
  node: OptionNode;
  depth: number;
  onEdit: (id: string, label: string) => void;
  onDelete: (id: string) => void;
  onDrop: (e: React.DragEvent, targetId: string | null) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  isDragOver: boolean;
}

const ConstructionElement: React.FC<ConstructionElementProps> = ({
  node,
  depth,
  onEdit,
  onDelete,
  onDrop,
  onDragOver,
  onDragLeave,
  isDragOver
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(node.label);
  
  // Trouver l'élément de palette correspondant pour l'affichage
  const paletteElement = paletteElements.find(p => p.type === node.type) || paletteElements[0];
  
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

  return (
    <div 
      className="relative"
      style={{ marginLeft: `${depth * 20}px` }}
    >
      {/* Ligne de connexion */}
      {depth > 0 && (
        <>
          <div 
            className="absolute w-4 h-px bg-gray-300 top-6"
            style={{ left: '-20px' }}
          />
          <div 
            className="absolute w-px bg-gray-300"
            style={{ 
              left: '-20px',
              top: '-10px',
              height: '16px'
            }}
          />
        </>
      )}

      <div
        onDrop={(e) => onDrop(e, node.id)}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`
          group relative mb-2 p-3 rounded-lg border-2 transition-all duration-200
          ${isDragOver 
            ? 'border-blue-400 bg-blue-50 shadow-lg' 
            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
          }
          ${paletteElement.bgColor}
        `}
      >
        {/* Contenu de l'élément */}
        <div className="flex items-center gap-3">
          <span className="text-xl">{paletteElement.icon}</span>
          
          <div className="flex-1">
            {isEditing ? (
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleEdit}
                onKeyDown={handleKeyPress}
                className="w-full px-2 py-1 bg-white border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            ) : (
              <div
                onClick={() => setIsEditing(true)}
                className={`font-medium cursor-pointer hover:underline ${paletteElement.color}`}
              >
                {node.label}
              </div>
            )}
            <div className="text-xs text-gray-500 mt-1">
              Type: {node.type}
            </div>
          </div>

          {/* Bouton de suppression */}
          <button
            onClick={() => onDelete(node.id)}
            className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded transition-all"
            title="Supprimer"
          >
            <span className="text-sm">🗑️</span>
          </button>
        </div>

        {/* Indicateur de zone de dépôt */}
        {isDragOver && (
          <div className="absolute inset-0 border-2 border-blue-400 rounded-lg pointer-events-none animate-pulse" />
        )}
      </div>

      {/* Éléments enfants */}
      {node.children && node.children.length > 0 && (
        <div className="ml-4">
          {node.children.map(child => (
            <ConstructionElement
              key={child.id}
              node={child}
              depth={depth + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              isDragOver={false}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Zone de construction (à droite)
interface ConstructionZoneProps {
  tree: OptionNode[];
  onDrop: (e: React.DragEvent, targetId?: string | null) => void;
  onEdit: (id: string, label: string) => void;
  onDelete: (id: string) => void;
}

const ConstructionZone: React.FC<ConstructionZoneProps> = ({
  tree,
  onDrop,
  onEdit,
  onDelete
}) => {
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [isDragOverZone, setIsDragOverZone] = useState(false);

  const handleDragOver = (e: React.DragEvent, targetId?: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    if (targetId) {
      setDragOverId(targetId);
    } else {
      setIsDragOverZone(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(null);
    setIsDragOverZone(false);
  };

  const handleDrop = (e: React.DragEvent, targetId?: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    onDrop(e, targetId);
    setDragOverId(null);
    setIsDragOverZone(false);
  };

  return (
    <div className="flex-1 bg-gray-50">
      {/* En-tête de la zone de construction */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎯</span>
          <div>
            <h1 className="text-xl font-bold">Constructeur d'Options</h1>
            <p className="text-blue-100 text-sm">Options bleues • Réponses vertes • Glissez-déposez</p>
          </div>
        </div>
      </div>

      {/* Zone de dépôt principale */}
      <div 
        className={`p-6 min-h-[500px] transition-all duration-200 ${
          isDragOverZone ? 'bg-blue-50' : 'bg-gray-50'
        }`}
        onDrop={(e) => handleDrop(e, null)}
        onDragOver={(e) => handleDragOver(e, null)}
        onDragLeave={handleDragLeave}
      >
        {tree.length === 0 ? (
          <div className={`
            h-full min-h-[400px] border-2 border-dashed rounded-xl 
            flex flex-col items-center justify-center transition-all duration-300
            ${isDragOverZone 
              ? 'border-blue-400 bg-blue-100 scale-105' 
              : 'border-gray-300 bg-white'
            }
          `}>
            <div className="text-center">
              <div className="mb-6">
                <div className={`mx-auto w-24 h-24 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                  isDragOverZone ? 'bg-blue-200 shadow-lg scale-110' : 'bg-gray-100'
                }`}>
                  <span className="text-4xl">{isDragOverZone ? '⬇️' : '🎯'}</span>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">
                {isDragOverZone ? 'Déposez ici !' : 'Aucune option créée'}
              </h3>
              <p className="text-gray-500 max-w-md mx-auto leading-relaxed">
                {isDragOverZone 
                  ? 'Lâchez l\'élément pour créer votre première option'
                  : 'Commencez par créer votre première option'
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {tree.map(node => (
              <ConstructionElement
                key={node.id}
                node={node}
                depth={0}
                onEdit={onEdit}
                onDelete={onDelete}
                onDrop={handleDrop}
                onDragOver={(e) => handleDragOver(e, node.id)}
                onDragLeave={handleDragLeave}
                isDragOver={dragOverId === node.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Légende */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="text-sm text-gray-600">
          <div className="flex items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-lg">👈</span>
              <span>Glissez depuis la palette</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">👉</span>
              <span>Déposez dans cette zone</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">✏️</span>
              <span>Cliquez pour renommer</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Props du composant principal
interface TreeEditorProps {
  fieldId: string;
  onTreeChange?: (tree: OptionNode[]) => void;
}

// Hook personnalisé pour la gestion des données
function useTreeData(fieldId: string, onTreeChange?: (tree: OptionNode[]) => void) {
  const [tree, setTree] = useState<OptionNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { get, post, put, del } = useAuthenticatedApi();

  // Transformer les données de l'API vers OptionNode
  const transformToOptionNodes = useCallback((apiData: unknown[]): OptionNode[] => {
    return apiData.map((item: unknown) => {
      const apiItem = item as {
        id: string;
        label: string;
        value: string;
        parentId: string | null;
        fieldId: string;
        type: string;
        order: number;
        children?: unknown[];
      };
      
      return {
        id: apiItem.id,
        label: apiItem.label,
        value: apiItem.value,
        parentId: apiItem.parentId,
        fieldId: apiItem.fieldId,
        type: apiItem.type || 'text',
        order: apiItem.order || 0,
        children: apiItem.children ? transformToOptionNodes(apiItem.children) : [],
      };
    });
  }, []);

  // Charger l'arbre depuis l'API
  const loadTree = useCallback(async () => {
    if (!fieldId) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await get(`/api/option-nodes?fieldId=${fieldId}`);
      if (response && Array.isArray(response)) {
        const transformedTree = transformToOptionNodes(response);
        setTree(transformedTree);
        onTreeChange?.(transformedTree);
      } else {
        setTree([]);
        onTreeChange?.([]);
      }
    } catch (err) {
      console.error('Tree loading error:', err);
      setTree([]);
      onTreeChange?.([]);
    } finally {
      setLoading(false);
    }
  }, [fieldId, get, onTreeChange, transformToOptionNodes]);

  // Ajouter un nouveau nœud
  const addNode = useCallback(async (
    parentId: string | null,
    label: string,
    type: string = 'text'
  ) => {
    if (!label.trim()) return null;

    try {
      const response = await post('/api/option-nodes', {
        fieldId,
        parentId,
        label: label.trim(),
        value: slugify(label.trim()),
        type,
        order: 0
      });

      await loadTree();
      return response;
    } catch (err) {
      setError('Erreur lors de l\'ajout du nœud');
      console.error('Node addition error:', err);
      return null;
    }
  }, [fieldId, post, loadTree]);

  // Modifier un nœud
  const updateNode = useCallback(async (id: string, label: string) => {
    if (!label.trim()) return;

    try {
      await put(`/api/option-nodes/${id}`, {
        label: label.trim(),
        value: slugify(label.trim())
      });
      await loadTree();
    } catch (err) {
      setError('Erreur lors de la modification');
      console.error('Node update error:', err);
    }
  }, [put, loadTree]);

  // Supprimer un nœud
  const deleteNode = useCallback(async (id: string) => {
    try {
      await del(`/api/option-nodes/${id}`);
      await loadTree();
    } catch (err) {
      setError('Erreur lors de la suppression');
      console.error('Node deletion error:', err);
    }
  }, [del, loadTree]);

  return {
    tree,
    loading,
    error,
    loadTree,
    addNode,
    updateNode,
    deleteNode
  };
}

// Composant principal TreeEditor
const TreeEditor: React.FC<TreeEditorProps> = ({ fieldId, onTreeChange }) => {
  const [draggedElement, setDraggedElement] = useState<PaletteElement | null>(null);
  const { 
    tree, 
    loading, 
    error, 
    loadTree, 
    addNode, 
    updateNode, 
    deleteNode 
  } = useTreeData(fieldId, onTreeChange);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  const handleDragStart = (element: PaletteElement) => {
    setDraggedElement(element);
  };

  const handleDrop = async (e: React.DragEvent, targetId?: string | null) => {
    e.preventDefault();
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.isFromPalette && draggedElement) {
        const defaultLabel = draggedElement.label;
        await addNode(targetId || null, defaultLabel, draggedElement.type);
      }
    } catch (err) {
      console.error('Drop error:', err);
    }
    
    setDraggedElement(null);
  };

  const handleEdit = async (id: string, label: string) => {
    await updateNode(id, label);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) {
      await deleteNode(id);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 bg-gray-50 rounded-xl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <span className="text-gray-600 font-medium">Chargement de l'éditeur...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden h-[700px]">
      {error && (
        <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-t-xl">
          {error}
        </div>
      )}
      
      <div className="flex h-full">
        <Palette onDragStart={handleDragStart} />
        <ConstructionZone 
          tree={tree}
          onDrop={handleDrop}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
};

export default TreeEditor;
