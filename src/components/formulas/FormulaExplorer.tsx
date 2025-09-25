import React, { useState, useMemo, useEffect } from 'react';
import { Modal, Tabs, Input, Button, Tag, Select, Card, Space, Tree, Typography, List } from 'antd';
import { SearchOutlined, FunctionOutlined, FieldBinaryOutlined, CalculatorOutlined, NodeIndexOutlined, ApartmentOutlined } from '@ant-design/icons';
import useCRMStore from '../../store';
import { useAdvancedSelectCache } from '../../hooks/useAdvancedSelectCache';
import type { BasicItem } from './SortableFormulaItem';

const { Search } = Input;
const { Text } = Typography;

interface FormulaExplorerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (item: BasicItem, targetZone?: 'expr' | 'then' | 'else') => void;
  targetZone?: 'expr' | 'then' | 'else';
}

// Fonctions prédéfinies
const PREDEFINED_FUNCTIONS = [
  { name: 'IF', label: 'IF(condition, alors, sinon)', description: 'Condition logique', category: 'Logique' },
  { name: 'SUM', label: 'SUM(valeur1, valeur2, ...)', description: 'Somme de valeurs', category: 'Math' },
  { name: 'MULTIPLY', label: 'MULTIPLY(valeur1, valeur2)', description: 'Multiplication', category: 'Math' },
  { name: 'DIVIDE', label: 'DIVIDE(dividende, diviseur)', description: 'Division', category: 'Math' },
  { name: 'SUBTRACT', label: 'SUBTRACT(valeur1, valeur2)', description: 'Soustraction', category: 'Math' },
  { name: 'MIN', label: 'MIN(valeur1, valeur2, ...)', description: 'Valeur minimum', category: 'Math' },
  { name: 'MAX', label: 'MAX(valeur1, valeur2, ...)', description: 'Valeur maximum', category: 'Math' },
  { name: 'ROUND', label: 'ROUND(nombre, décimales)', description: 'Arrondir un nombre', category: 'Math' },
  { name: 'CONCAT', label: 'CONCAT(texte1, texte2, ...)', description: 'Concaténer des textes', category: 'Texte' },
  { name: 'LENGTH', label: 'LENGTH(texte)', description: 'Longueur du texte', category: 'Texte' },
  { name: 'UPPER', label: 'UPPER(texte)', description: 'Convertir en majuscules', category: 'Texte' },
  { name: 'LOWER', label: 'LOWER(texte)', description: 'Convertir en minuscules', category: 'Texte' },
  { name: 'TODAY', label: 'TODAY()', description: 'Date d\'aujourd\'hui', category: 'Date' },
  { name: 'NOW', label: 'NOW()', description: 'Date et heure actuelles', category: 'Date' },
  { name: 'DATEDIFF', label: 'DATEDIFF(date1, date2)', description: 'Différence entre deux dates', category: 'Date' },
];

// Opérateurs
const OPERATORS = [
  { symbol: '=', label: 'Égal à', category: 'Comparaison' },
  { symbol: '!=', label: 'Différent de', category: 'Comparaison' },
  { symbol: '>', label: 'Supérieur à', category: 'Comparaison' },
  { symbol: '>=', label: 'Supérieur ou égal à', category: 'Comparaison' },
  { symbol: '<', label: 'Inférieur à', category: 'Comparaison' },
  { symbol: '<=', label: 'Inférieur ou égal à', category: 'Comparaison' },
  { symbol: '+', label: 'Addition', category: 'Arithmétique' },
  { symbol: '-', label: 'Soustraction', category: 'Arithmétique' },
  { symbol: '*', label: 'Multiplication', category: 'Arithmétique' },
  { symbol: '/', label: 'Division', category: 'Arithmétique' },
  { symbol: '%', label: 'Modulo', category: 'Arithmétique' },
  { symbol: '&&', label: 'ET logique', category: 'Logique' },
  { symbol: '||', label: 'OU logique', category: 'Logique' },
  { symbol: '!', label: 'NON logique', category: 'Logique' },
];

const FormulaExplorer: React.FC<FormulaExplorerProps> = ({
  visible,
  onClose,
  onSelect,
  targetZone = 'expr'
}) => {
  const [activeTab, setActiveTab] = useState('advanced_select');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  
  const { blocks } = useCRMStore();
  const { getTree, ensureTree } = useAdvancedSelectCache();

  // Types pour les handlers
  interface FieldItem {
    id: string;
    label: string;
    type: string;
    blockName: string;
    sectionName: string;
  }

  interface FunctionItem {
    name: string;
    label: string;
    description: string;
    category: string;
  }

  interface OperatorItem {
    symbol: string;
    label: string;
    category: string;
  }

  // Récupération de tous les champs disponibles
  const allFields = useMemo(() => {
    const fields: Array<{ id: string; label: string; type: string; blockName: string; sectionName: string }> = [];
    
    blocks.forEach(block => {
      block.sections?.forEach(section => {
        section.fields?.forEach(field => {
          fields.push({
            id: String(field.id),
            label: field.label || String(field.id),
            type: field.type || 'text',
            blockName: block.name || '',
            sectionName: section.name || section.label || ''
          });
        });
      });
    });
    
    return fields;
  }, [blocks]);

  // Filtrage des champs
  const filteredFields = useMemo(() => {
    return allFields.filter(field => {
      const matchesSearch = !searchTerm || 
        field.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        field.blockName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        field.sectionName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || field.type === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [allFields, searchTerm, selectedCategory]);

  // Catégories de champs
  const fieldCategories = useMemo(() => {
    const categories = new Set(allFields.map(field => field.type));
    return Array.from(categories).map(type => ({ label: type, value: type }));
  }, [allFields]);

  // Champs advanced_select seulement
  const advancedSelectFields = useMemo(() => {
    return allFields.filter(field => field.type === 'advanced_select');
  }, [allFields]);

  // Construction de l'arbre pour un champ advanced_select
  const buildFieldTree = (fieldId: string) => {
    const tree = getTree(fieldId);
    if (!tree || !tree.nodes) return [];

    interface TreeNode {
      id: string;
      label?: string;
      value?: string;
      children?: TreeNode[];
    }

    interface AntTreeNode {
      title: React.ReactNode;
      key: string;
      children: AntTreeNode[];
    }

    const buildTreeNode = (node: TreeNode, parentKey = ''): AntTreeNode => {
      const key = parentKey ? `${parentKey}.${node.id}` : node.id;
      
      const treeNode = {
        title: (
          <div className="flex justify-between items-center py-1">
            <div className="flex items-center gap-2">
              <Text strong={!node.children?.length}>{node.label || node.id}</Text>
              {node.value && <Tag size="small" color="blue">{node.value}</Tag>}
            </div>
            <div className="flex gap-1">
              <Button 
                size="small" 
                type="text"
                onClick={() => handleAdvancedSelectPart(fieldId, 'selection', node.label || node.id)}
                title="Valeur sélectionnée"
              >
                Sélection
              </Button>
              <Button 
                size="small" 
                type="text"
                onClick={() => handleAdvancedSelectPart(fieldId, 'extra', node.label || node.id)}
                title="Données extra du nœud"
              >
                Extra
              </Button>
              <Button 
                size="small" 
                type="text"
                onClick={() => handleAdvancedSelectPart(fieldId, 'nodeId', node.label || node.id)}
                title="ID du nœud"
              >
                NodeId
              </Button>
            </div>
          </div>
        ),
        key,
        children: node.children?.map((child: TreeNode) => buildTreeNode(child, key)) || []
      };

      return treeNode;
    };

    return tree.nodes.map(node => buildTreeNode(node));
  };

  const handleAdvancedSelectPart = (fieldId: string, part: 'selection' | 'extra' | 'nodeId', label: string) => {
    const item: BasicItem = {
      type: 'adv_part',
      fieldId,
      part,
      value: `${fieldId}.${part}`,
      label: `${label} (${part})`,
      id: `adv-${fieldId}-${part}-${Date.now()}`
    };
    onSelect(item, targetZone);
  };

  const handleAdvancedSelectFieldSelect = (fieldId: string) => {
    setSelectedFieldId(fieldId);
    // Précharger l'arbre si nécessaire
    ensureTree(fieldId);
  };

  useEffect(() => {
    if (visible && selectedFieldId) {
      ensureTree(selectedFieldId);
    }
  }, [visible, selectedFieldId, ensureTree]);

  // Filtrage des fonctions
  const filteredFunctions = useMemo(() => {
    return PREDEFINED_FUNCTIONS.filter(func => {
      const matchesSearch = !searchTerm || 
        func.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        func.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        func.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || func.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

  // Catégories de fonctions
  const functionCategories = useMemo(() => {
    const categories = new Set(PREDEFINED_FUNCTIONS.map(func => func.category));
    return Array.from(categories).map(cat => ({ label: cat, value: cat }));
  }, []);

  // Filtrage des opérateurs
  const filteredOperators = useMemo(() => {
    return OPERATORS.filter(op => {
      const matchesSearch = !searchTerm || 
        op.symbol.includes(searchTerm) ||
        op.label.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || op.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

  // Catégories d'opérateurs
  const operatorCategories = useMemo(() => {
    const categories = new Set(OPERATORS.map(op => op.category));
    return Array.from(categories).map(cat => ({ label: cat, value: cat }));
  }, []);

  const handleFieldSelect = (field: FieldItem) => {
    const item: BasicItem = {
      type: 'field',
      value: field.id,
      label: field.label,
      id: `field-${field.id}-${Date.now()}`
    };
    onSelect(item, targetZone);
  };

  const handleFunctionSelect = (func: FunctionItem) => {
    const item: BasicItem = {
      type: 'function',
      value: func.label,
      label: func.name,
      id: `func-${Date.now()}`
    };
    onSelect(item, targetZone);
  };

  const handleOperatorSelect = (op: OperatorItem) => {
    const item: BasicItem = {
      type: 'operator',
      value: op.symbol,
      label: op.symbol,
      id: `op-${Date.now()}`
    };
    onSelect(item, targetZone);
  };

  const handleValueAdd = (value: string) => {
    const item: BasicItem = {
      type: 'value',
      value: value,
      label: value,
      id: `val-${Date.now()}`
    };
    onSelect(item, targetZone);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <SearchOutlined />
          <span>Explorer - Insérer dans {targetZone?.toUpperCase()}</span>
          <Tag color="blue">{targetZone}</Tag>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Fermer
        </Button>
      ]}
      width={900}
      className="formula-explorer-modal"
      style={{ zIndex: 2000 }}
      maskStyle={{ zIndex: 1999 }}
    >
      <div className="mb-4">
        <Space direction="vertical" className="w-full">
          <Search
            placeholder="Rechercher des champs, fonctions, opérateurs..."
            allowClear
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%' }}
          />
        </Space>
      </div>

      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        items={[
          {
            key: 'advanced_select',
            label: (
              <span>
                <ApartmentOutlined />
                Généalogie Advanced Select
              </span>
            ),
            children: (
              <div>
                <div className="space-y-4">
                  <Card title="Champs Advanced Select disponibles" size="small">
                    <div className="max-h-48 overflow-y-auto">
                      <List
                        size="small"
                        dataSource={advancedSelectFields}
                        renderItem={(field) => (
                          <List.Item
                            className={`cursor-pointer hover:bg-blue-50 px-3 py-2 rounded ${
                              selectedFieldId === field.id ? 'bg-blue-100 border-blue-300' : ''
                            }`}
                            onClick={() => handleAdvancedSelectFieldSelect(field.id)}
                          >
                            <div className="flex justify-between items-center w-full">
                              <div>
                                <Text strong>{field.label}</Text>
                                <div className="text-xs text-gray-500">
                                  {field.blockName} → {field.sectionName}
                                </div>
                              </div>
                              <Tag color="green">Advanced Select</Tag>
                            </div>
                          </List.Item>
                        )}
                      />
                      {advancedSelectFields.length === 0 && (
                        <div className="text-center text-gray-500 py-4">
                          Aucun champ Advanced Select trouvé
                        </div>
                      )}
                    </div>
                  </Card>

                  {selectedFieldId && (
                    <Card 
                      title={
                        <div className="flex items-center gap-2">
                          <ApartmentOutlined />
                          <span>Arbre généalogique - {advancedSelectFields.find(f => f.id === selectedFieldId)?.label}</span>
                        </div>
                      } 
                      size="small"
                    >
                      <div className="max-h-96 overflow-y-auto">
                        <Tree
                          showLine
                          expandedKeys={expandedKeys}
                          onExpand={setExpandedKeys}
                          treeData={buildFieldTree(selectedFieldId)}
                          className="custom-tree"
                        />
                        {buildFieldTree(selectedFieldId).length === 0 && (
                          <div className="text-center text-gray-500 py-4">
                            <div>Chargement de l'arbre...</div>
                            <div className="text-xs mt-1">
                              Les données sont en cours de récupération depuis le serveur
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  )}
                  
                  {!selectedFieldId && (
                    <Card size="small">
                      <div className="text-center text-gray-500 py-8">
                        <ApartmentOutlined className="text-4xl mb-2 block" />
                        <div className="font-medium">Sélectionnez un champ Advanced Select</div>
                        <div className="text-xs mt-1">
                          Choisissez un champ ci-dessus pour voir sa généalogie et sélectionner un niveau spécifique
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              </div>
            )
          },
          {
            key: 'fields',
            label: (
              <span>
                <FieldBinaryOutlined />
                Champs ({allFields.length})
              </span>
            ),
            children: (
              <div>
                <div className="mb-3">
                  <Select
                    placeholder="Filtrer par type"
                    allowClear
                    value={selectedCategory === 'all' ? undefined : selectedCategory}
                    onChange={(value) => setSelectedCategory(value || 'all')}
                    options={[{ label: 'Tous les types', value: 'all' }, ...fieldCategories]}
                    className="w-48"
                  />
                  {(searchTerm || selectedCategory !== 'all') && (
                    <Button size="small" onClick={resetFilters} className="ml-2">
                      Réinitialiser
                    </Button>
                  )}
                </div>
                
                <div className="max-h-96 overflow-y-auto">
                  <div className="grid grid-cols-1 gap-2">
                    {filteredFields.map(field => (
                      <Card 
                        key={field.id}
                        size="small"
                        hoverable
                        onClick={() => handleFieldSelect(field)}
                        className="cursor-pointer hover:border-blue-500"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium text-blue-600">{field.label}</div>
                            <div className="text-xs text-gray-500">
                              {field.blockName} → {field.sectionName}
                            </div>
                          </div>
                          <Tag color="blue" className="ml-2">{field.type}</Tag>
                        </div>
                      </Card>
                    ))}
                  </div>
                  
                  {filteredFields.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      Aucun champ trouvé avec ces critères
                    </div>
                  )}
                </div>
              </div>
            )
          },
          {
            key: 'functions',
            label: (
              <span>
                <FunctionOutlined />
                Fonctions ({PREDEFINED_FUNCTIONS.length})
              </span>
            ),
            children: (
              <div>
                <div className="mb-3">
                  <Select
                    placeholder="Filtrer par catégorie"
                    allowClear
                    value={selectedCategory === 'all' ? undefined : selectedCategory}
                    onChange={(value) => setSelectedCategory(value || 'all')}
                    options={[{ label: 'Toutes les catégories', value: 'all' }, ...functionCategories]}
                    className="w-48"
                  />
                  {(searchTerm || selectedCategory !== 'all') && (
                    <Button size="small" onClick={resetFilters} className="ml-2">
                      Réinitialiser
                    </Button>
                  )}
                </div>
                
                <div className="max-h-96 overflow-y-auto">
                  <div className="grid grid-cols-1 gap-2">
                    {filteredFunctions.map(func => (
                      <Card 
                        key={func.name}
                        size="small"
                        hoverable
                        onClick={() => handleFunctionSelect(func)}
                        className="cursor-pointer hover:border-purple-500"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium text-purple-600">{func.label}</div>
                            <div className="text-xs text-gray-500">{func.description}</div>
                          </div>
                          <Tag color="purple" className="ml-2">{func.category}</Tag>
                        </div>
                      </Card>
                    ))}
                  </div>
                  
                  {filteredFunctions.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      Aucune fonction trouvée avec ces critères
                    </div>
                  )}
                </div>
              </div>
            )
          },
          {
            key: 'operators',
            label: (
              <span>
                <CalculatorOutlined />
                Opérateurs ({OPERATORS.length})
              </span>
            ),
            children: (
              <div>
                <div className="mb-3">
                  <Select
                    placeholder="Filtrer par catégorie"
                    allowClear
                    value={selectedCategory === 'all' ? undefined : selectedCategory}
                    onChange={(value) => setSelectedCategory(value || 'all')}
                    options={[{ label: 'Toutes les catégories', value: 'all' }, ...operatorCategories]}
                    className="w-48"
                  />
                  {(searchTerm || selectedCategory !== 'all') && (
                    <Button size="small" onClick={resetFilters} className="ml-2">
                      Réinitialiser
                    </Button>
                  )}
                </div>
                
                <div className="max-h-96 overflow-y-auto">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {filteredOperators.map(op => (
                      <Card 
                        key={op.symbol}
                        size="small"
                        hoverable
                        onClick={() => handleOperatorSelect(op)}
                        className="cursor-pointer hover:border-orange-500 text-center"
                      >
                        <div>
                          <div className="font-bold text-lg text-orange-600">{op.symbol}</div>
                          <div className="text-xs text-gray-500">{op.label}</div>
                          <Tag color="orange" size="small" className="mt-1">{op.category}</Tag>
                        </div>
                      </Card>
                    ))}
                  </div>
                  
                  {filteredOperators.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      Aucun opérateur trouvé avec ces critères
                    </div>
                  )}
                </div>
              </div>
            )
          },
          {
            key: 'values',
            label: (
              <span>
                <NodeIndexOutlined />
                Valeurs
              </span>
            ),
            children: (
              <div>
                <div className="space-y-4">
                  <Card title="Ajouter une valeur numérique" size="small">
                    <Space.Compact style={{ width: '100%' }}>
                      <Input
                        placeholder="Entrez un nombre (ex: 42, 3.14, -10)"
                        onPressEnter={(e) => {
                          const value = (e.target as HTMLInputElement).value.trim();
                          if (value && !isNaN(Number(value))) {
                            handleValueAdd(value);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                      />
                      <Button 
                        type="primary"
                        onClick={(e) => {
                          const input = (e.target as HTMLElement).parentElement?.querySelector('input') as HTMLInputElement;
                          const value = input?.value.trim();
                          if (value && !isNaN(Number(value))) {
                            handleValueAdd(value);
                            input.value = '';
                          }
                        }}
                      >
                        Ajouter
                      </Button>
                    </Space.Compact>
                  </Card>
                  
                  <Card title="Ajouter une valeur texte" size="small">
                    <Space.Compact style={{ width: '100%' }}>
                      <Input
                        placeholder="Entrez du texte (ex: 'Bonjour', 'Statut')"
                        onPressEnter={(e) => {
                          const value = (e.target as HTMLInputElement).value.trim();
                          if (value) {
                            handleValueAdd(`"${value}"`);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                      />
                      <Button 
                        type="primary"
                        onClick={(e) => {
                          const input = (e.target as HTMLElement).parentElement?.querySelector('input') as HTMLInputElement;
                          const value = input?.value.trim();
                          if (value) {
                            handleValueAdd(`"${value}"`);
                            input.value = '';
                          }
                        }}
                      >
                        Ajouter
                      </Button>
                    </Space.Compact>
                  </Card>
                  
                  <Card title="Valeurs prédéfinies" size="small">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {['true', 'false', 'null', '0', '1', '""'].map(value => (
                        <Button 
                          key={value}
                          onClick={() => handleValueAdd(value)}
                          className="text-center"
                        >
                          {value}
                        </Button>
                      ))}
                    </div>
                  </Card>
                </div>
              </div>
            )
          }
        ]}
      />
    </Modal>
  );
};

export default FormulaExplorer;
