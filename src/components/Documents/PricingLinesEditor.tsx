/**
 * 💰 PRICING LINES EDITOR
 * 
 * Éditeur de lignes pour le tableau de tarification (PRICING_TABLE)
 * Permet de configurer des lignes dynamiques avec :
 * - Lignes statiques (valeurs manuelles)
 * - Lignes dynamiques (liées à des sources TBL: formules, conditions, calculatedValue)
 * - Lignes répétées (génèrent N lignes selon les instances d'un repeater)
 * - Conditions d'affichage simples et uniformes sur chaque ligne
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Button,
  Space,
  Table,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Tooltip,
  Badge,
  Tag,
  Typography,
  Divider,
  Empty,
  message,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  LinkOutlined,
  CopyOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ReloadOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import NodeTreeSelector, { NodeTreeSelectorValue } from '../TreeBranchLeaf/treebranchleaf-new/components/Parameters/shared/NodeTreeSelector';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';

const { Text } = Typography;

// Opérateurs pour condition simple
const SIMPLE_OPERATORS = [
  { value: 'EQUALS', label: '= Égal à' },
  { value: 'NOT_EQUALS', label: '≠ Différent de' },
  { value: 'CONTAINS', label: '⊃ Contient' },
  { value: 'GREATER_THAN', label: '> Supérieur à' },
  { value: 'LESS_THAN', label: '< Inférieur à' },
  { value: 'IS_EMPTY', label: '∅ Est vide' },
  { value: 'IS_NOT_EMPTY', label: '∃ N\'est pas vide' },
];

// Condition simple: un champ, un opérateur, une valeur
export interface SimpleCondition {
  fieldRef: string;      // @value.xxx ou {lead.xxx} etc.
  operator: string;      // EQUALS, NOT_EQUALS, etc.
  compareValue?: string;  // Valeur de comparaison (pas requis pour IS_EMPTY/IS_NOT_EMPTY)
}

// Types pour les lignes de pricing
export type PricingLineType = 'static' | 'dynamic' | 'repeater';

export interface PricingLine {
  id: string;
  type: PricingLineType;
  label: string;
  labelSource?: string;       // Référence TBL pour le label dynamique
  quantity?: number | string | null;
  quantitySource?: string;    // Référence TBL pour la quantité
  unitPrice?: number | string | null;
  unitPriceSource?: string;   // Référence TBL pour le prix unitaire
  total?: number | string | null;
  totalSource?: string;       // Référence TBL pour le total
  repeaterId?: string;        // ID du repeater (extrait de @repeat.{repeaterId}.xxx)
  repeaterLabel?: string;     // Label du repeater pour affichage
  condition?: SimpleCondition; // Condition simple uniforme
  order: number;
}

interface PricingLinesEditorProps {
  lines: PricingLine[];
  onChange: (lines: PricingLine[]) => void;
  treeId?: string;
  nodeId?: string;
}

// Générer un ID unique
const generateId = () => `line_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Extraire le repeaterId depuis une ref @repeat.{repeaterId}.{templateId}
const extractRepeaterId = (ref?: string): string | undefined => {
  if (!ref) return undefined;
  const match = ref.match(/^@repeat\.([^.]+)\./);
  return match ? match[1] : undefined;
};

const PricingLinesEditor: React.FC<PricingLinesEditorProps> = ({
  lines = [],
  onChange,
  treeId: _treeId,
  nodeId,
}) => {
  const { api } = useAuthenticatedApi();
  
  // États
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [currentLine, setCurrentLine] = useState<PricingLine | null>(null);
  const [form] = Form.useForm();
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [currentSelectorField, setCurrentSelectorField] = useState<string>('');
  const [trees, setTrees] = useState<Array<{ id: string; label: string; nodeId?: string }>>([]);
  const [selectedTreeNodeId, setSelectedTreeNodeId] = useState<string | null>(nodeId || null);
  // Pour la condition simple — sélecteur TBL pour le champ condition
  const [conditionSelectorOpen, setConditionSelectorOpen] = useState(false);

  // ✅ useWatch pour déclencher les re-renders
  const watchedType = Form.useWatch('type', form);
  const watchedLabelSource = Form.useWatch('labelSource', form);
  const watchedQuantitySource = Form.useWatch('quantitySource', form);
  const watchedUnitPriceSource = Form.useWatch('unitPriceSource', form);
  const watchedConditionFieldRef = Form.useWatch(['condition', 'fieldRef'], form);
  const watchedConditionOperator = Form.useWatch(['condition', 'operator'], form);

  // Charger les arbres TBL disponibles
  const loadTrees = useCallback(async () => {
    try {
      const treesData = await api.get('/api/treebranchleaf/trees') as Array<{ id: string; label: string }>;
      const treesWithNodes = await Promise.all(
        treesData.map(async (tree) => {
          try {
            const nodes = await api.get(`/api/treebranchleaf/trees/${tree.id}/nodes`) as Array<{ id: string }>;
            return { ...tree, nodeId: nodes[0]?.id };
          } catch {
            return { ...tree, nodeId: undefined };
          }
        })
      );
      const filteredTrees = treesWithNodes.filter(t => t.nodeId);
      setTrees(filteredTrees);
      
      if (!selectedTreeNodeId && filteredTrees.length > 0 && filteredTrees[0].nodeId) {
        setSelectedTreeNodeId(filteredTrees[0].nodeId);
      }
    } catch (error) {
      console.error('Erreur chargement arbres:', error);
    }
  }, [api, selectedTreeNodeId]);

  useEffect(() => {
    loadTrees();
  }, [loadTrees]);

  // Ouvrir le modal pour nouvelle ligne
  const handleAddLine = (type: PricingLineType) => {
    const newLine: PricingLine = {
      id: generateId(),
      type,
      label: type === 'static' ? 'Nouvelle ligne' : '',
      quantity: undefined,
      unitPrice: undefined,
      order: lines.length,
    };
    setCurrentLine(newLine);
    form.setFieldsValue({ ...newLine, condition: undefined });
    setEditModalOpen(true);
  };

  // Éditer une ligne existante
  const handleEditLine = (line: PricingLine) => {
    setCurrentLine(line);
    form.setFieldsValue(line);
    setEditModalOpen(true);
  };

  // Supprimer une ligne
  const handleDeleteLine = (lineId: string) => {
    const newLines = lines.filter(l => l.id !== lineId);
    newLines.forEach((l, i) => l.order = i);
    onChange(newLines);
  };

  // Dupliquer une ligne
  const handleDuplicateLine = (line: PricingLine) => {
    const newLine: PricingLine = {
      ...line,
      id: generateId(),
      label: `${line.label} (copie)`,
      order: lines.length,
    };
    onChange([...lines, newLine]);
  };

  // Déplacer une ligne
  const handleMoveLine = (lineId: string, direction: 'up' | 'down') => {
    const index = lines.findIndex(l => l.id === lineId);
    if (index === -1) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= lines.length) return;
    const newLines = [...lines];
    [newLines[index], newLines[newIndex]] = [newLines[newIndex], newLines[index]];
    newLines.forEach((l, i) => l.order = i);
    onChange(newLines);
  };

  // Sauvegarder une ligne
  const handleSaveLine = () => {
    form.validateFields().then(values => {
      const updatedLine: PricingLine = {
        ...currentLine!,
        ...values,
      };

      // Normalisation
      if (updatedLine.quantity === null || updatedLine.quantity === '') {
        delete (updatedLine as any).quantity;
      }
      if (updatedLine.unitPrice === null || updatedLine.unitPrice === '') {
        delete (updatedLine as any).unitPrice;
      }
      if (updatedLine.total === null || updatedLine.total === '') {
        delete (updatedLine as any).total;
      }

      // Extraire repeaterId depuis les refs @repeat.X.Y
      const repId = extractRepeaterId(updatedLine.labelSource) 
        || extractRepeaterId(updatedLine.quantitySource) 
        || extractRepeaterId(updatedLine.unitPriceSource)
        || updatedLine.repeaterId;
      if (repId) {
        updatedLine.repeaterId = repId;
      }

      // Nettoyage condition vide
      if (updatedLine.condition && !updatedLine.condition.fieldRef) {
        delete updatedLine.condition;
      }

      // Règle métier: total auto quand qté + prix
      const hasQuantity = updatedLine.quantitySource || updatedLine.quantity !== undefined;
      const hasUnitPrice = updatedLine.unitPriceSource || updatedLine.unitPrice !== undefined;
      const hasTotal = updatedLine.totalSource || updatedLine.total !== undefined;
      if (hasQuantity && hasUnitPrice && hasTotal) {
        delete (updatedLine as any).total;
        delete (updatedLine as any).totalSource;
        message.info('Total calculé automatiquement (Qté × Prix unitaire).');
      }
      
      const existingIndex = lines.findIndex(l => l.id === updatedLine.id);
      if (existingIndex >= 0) {
        const newLines = [...lines];
        newLines[existingIndex] = updatedLine;
        onChange(newLines);
      } else {
        onChange([...lines, updatedLine]);
      }
      
      setEditModalOpen(false);
      setCurrentLine(null);
      form.resetFields();
    });
  };

  // Ouvrir le sélecteur TBL pour un champ
  const openTblSelector = (fieldName: string) => {
    setCurrentSelectorField(fieldName);
    setSelectorOpen(true);
  };

  // Gérer la sélection TBL
  const handleTblSelect = (value: NodeTreeSelectorValue) => {
    const fieldName = currentSelectorField;
    const sourceField = `${fieldName}Source`;
    
    // Pour les lignes repeater, extraire le label du repeater depuis la ref
    if (value.ref.startsWith('@repeat.') && value.name) {
      const parts = value.name.split(' / ');
      if (parts.length > 0) {
        form.setFieldsValue({ repeaterLabel: parts[0] });
      }
    }

    form.setFieldsValue({
      [fieldName]: value.ref,
      [sourceField]: value.ref,
    });
    
    setSelectorOpen(false);
    message.success(`Référence ajoutée: ${value.name || value.ref}`);
  };

  // Gérer la sélection TBL pour la condition
  const handleConditionFieldSelect = (value: NodeTreeSelectorValue) => {
    form.setFieldsValue({ 
      condition: { 
        ...form.getFieldValue('condition'),
        fieldRef: value.ref 
      } 
    });
    setConditionSelectorOpen(false);
  };

  // Colonnes du tableau
  const columns = [
    {
      title: '#',
      dataIndex: 'order',
      width: 50,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      width: 100,
      render: (type: PricingLineType) => {
        const config = {
          static: { color: 'blue', icon: '📝', label: 'Statique' },
          dynamic: { color: 'green', icon: '🔗', label: 'Dynamique' },
          repeater: { color: 'purple', icon: '🔁', label: 'Repeater' },
        }[type];
        return (
          <Tag color={config.color}>
            {config.icon} {config.label}
          </Tag>
        );
      },
    },
    {
      title: 'Désignation',
      dataIndex: 'label',
      render: (label: string, record: PricingLine) => (
        <Space direction="vertical" size={0}>
          <Text>{label || <Text type="secondary">Non défini</Text>}</Text>
          {record.labelSource && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              {record.labelSource.startsWith('@repeat.') ? '🔁' : '🔗'} {record.labelSource}
            </Text>
          )}
          {record.repeaterLabel && record.type === 'repeater' && (
            <Text type="secondary" style={{ fontSize: 11, color: '#722ed1' }}>
              🔁 × N copies de "{record.repeaterLabel}"
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Qté',
      dataIndex: 'quantity',
      width: 80,
      render: (qty: number | string, record: PricingLine) => (
        <Space direction="vertical" size={0}>
          <Text>{qty}</Text>
          {record.quantitySource && (
            <Text type="secondary" style={{ fontSize: 10 }}>
              {record.quantitySource.startsWith('@repeat.') ? '🔁' : '🔗'}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Prix U.',
      dataIndex: 'unitPrice',
      width: 100,
      render: (price: number | string, record: PricingLine) => (
        <Space direction="vertical" size={0}>
          <Text>{typeof price === 'number' ? `${price} €` : price}</Text>
          {record.unitPriceSource && (
            <Text type="secondary" style={{ fontSize: 10 }}>
              {record.unitPriceSource.startsWith('@repeat.') ? '🔁' : '🔗'}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Cond.',
      dataIndex: 'condition',
      width: 60,
      render: (condition: SimpleCondition | undefined) => (
        condition?.fieldRef ? (
          <Badge status="success" text="" />
        ) : (
          <Text type="secondary">-</Text>
        )
      ),
    },
    {
      title: 'Actions',
      width: 150,
      render: (_: any, record: PricingLine, index: number) => (
        <Space size={4}>
          <Tooltip title="Éditer">
            <Button size="small" icon={<EditOutlined />} onClick={() => handleEditLine(record)} />
          </Tooltip>
          <Tooltip title="Dupliquer">
            <Button size="small" icon={<CopyOutlined />} onClick={() => handleDuplicateLine(record)} />
          </Tooltip>
          <Tooltip title="Monter">
            <Button 
              size="small" 
              icon={<ArrowUpOutlined />} 
              onClick={() => handleMoveLine(record.id, 'up')}
              disabled={index === 0}
            />
          </Tooltip>
          <Tooltip title="Descendre">
            <Button 
              size="small" 
              icon={<ArrowDownOutlined />} 
              onClick={() => handleMoveLine(record.id, 'down')}
              disabled={index === lines.length - 1}
            />
          </Tooltip>
          <Popconfirm
            title="Supprimer cette ligne ?"
            onConfirm={() => handleDeleteLine(record.id)}
            okText="Oui"
            cancelText="Non"
          >
            <Button size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Helper: afficher un champ source TBL avec bouton lier/supprimer
  const renderSourceField = (
    fieldName: string, 
    sourceFieldName: string, 
    sourceValue: string | undefined,
    placeholder: string,
    tagColor: string,
    renderManualInput?: () => React.ReactNode
  ) => {
    if (sourceValue) {
      return (
        <div style={{ 
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px', borderRadius: 6,
          backgroundColor: sourceValue.startsWith('@repeat.') ? '#f5f0ff' : '#f0f9ff',
          border: `1px solid ${sourceValue.startsWith('@repeat.') ? '#d3adf7' : '#91caff'}`,
        }}>
          <Tag color={sourceValue.startsWith('@repeat.') ? 'purple' : tagColor} icon={<LinkOutlined />}>
            {sourceValue.startsWith('@repeat.') ? 'REPEAT' : 'TBL'}
          </Tag>
          <Text code style={{ flex: 1, fontSize: 12 }}>{sourceValue}</Text>
          <Tooltip title="Supprimer la liaison">
            <Button size="small" danger icon={<DeleteOutlined />}
              onClick={() => form.setFieldsValue({ [fieldName]: fieldName === 'label' ? '' : undefined, [sourceFieldName]: undefined })}
            />
          </Tooltip>
        </div>
      );
    }
    return (
      <Space.Compact style={{ width: '100%' }}>
        {renderManualInput ? renderManualInput() : (
          <Form.Item name={fieldName} noStyle>
            <Input placeholder={placeholder} style={{ flex: 1 }} />
          </Form.Item>
        )}
        <Tooltip title="Lier à une donnée TBL ou Repeat">
          <Button icon={<LinkOutlined />} onClick={() => openTblSelector(fieldName)} />
        </Tooltip>
      </Space.Compact>
    );
  };

  return (
    <Card 
      title="📊 Configuration des lignes du tableau"
      size="small"
      extra={
        <Space>
          <Select
            placeholder="Arbre TBL"
            style={{ width: 180 }}
            value={selectedTreeNodeId}
            onChange={setSelectedTreeNodeId}
            options={trees.map(t => ({ value: t.nodeId, label: t.label }))}
          />
        </Space>
      }
    >
      {/* Boutons d'ajout de lignes */}
      <Space style={{ marginBottom: 16 }} wrap>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => handleAddLine('static')}
        >
          + Ligne statique
        </Button>
        <Button 
          icon={<LinkOutlined />} 
          onClick={() => handleAddLine('dynamic')}
          style={{ borderColor: '#52c41a', color: '#52c41a' }}
        >
          + Ligne dynamique (TBL)
        </Button>
        <Button 
          icon={<ReloadOutlined />} 
          onClick={() => handleAddLine('repeater')}
          style={{ borderColor: '#722ed1', color: '#722ed1' }}
        >
          + Ligne Repeater
        </Button>
      </Space>

      {/* Tableau des lignes */}
      {lines.length > 0 ? (
        <Table
          columns={columns}
          dataSource={lines.sort((a, b) => a.order - b.order)}
          rowKey="id"
          size="small"
          pagination={false}
        />
      ) : (
        <Empty
          description="Aucune ligne configurée"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Text type="secondary">
            Ajoutez des lignes pour définir le contenu du tableau de prix
          </Text>
        </Empty>
      )}

      {/* Modal d'édition */}
      <Modal
        title={currentLine?.id && lines.find(l => l.id === currentLine.id) 
          ? `Éditer la ligne` 
          : `Nouvelle ligne ${currentLine?.type === 'static' ? 'statique' : currentLine?.type === 'dynamic' ? 'dynamique' : 'repeater'}`
        }
        open={editModalOpen}
        onOk={handleSaveLine}
        onCancel={() => { setEditModalOpen(false); setCurrentLine(null); form.resetFields(); }}
        width={600}
        okText="Enregistrer"
        cancelText="Annuler"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="type" label="Type de ligne">
            <Select disabled>
              <Select.Option value="static">📝 Statique (valeurs manuelles)</Select.Option>
              <Select.Option value="dynamic">🔗 Dynamique (lié à TBL)</Select.Option>
              <Select.Option value="repeater">🔁 Repeater (génère N lignes par copie)</Select.Option>
            </Select>
          </Form.Item>

          {/* Explication pour repeater */}
          {watchedType === 'repeater' && (
            <div style={{ 
              padding: '8px 12px', marginBottom: 16, borderRadius: 6,
              backgroundColor: '#f5f0ff', border: '1px solid #d3adf7' 
            }}>
              <Text style={{ fontSize: 12, color: '#531dab' }}>
                🔁 Utilisez l'onglet <strong>Repeat</strong> du sélecteur pour lier chaque colonne à un champ template. 
                Le système génèrera automatiquement une ligne par copie dans le document final.
              </Text>
            </div>
          )}

          <Divider orientation="left">Désignation</Divider>
          
          <Form.Item label="Libellé" style={{ marginBottom: 16 }}>
            {renderSourceField('label', 'labelSource', watchedLabelSource, 'Ex: Travaux d\'isolation', 'orange')}
          </Form.Item>
          <Form.Item name="labelSource" hidden><Input /></Form.Item>
          <Form.Item name="repeaterId" hidden><Input /></Form.Item>
          <Form.Item name="repeaterLabel" hidden><Input /></Form.Item>

          <Divider orientation="left">Valeurs</Divider>

          {/* Quantité */}
          <Form.Item label="Quantité" style={{ marginBottom: 16 }}>
            {renderSourceField('quantity', 'quantitySource', watchedQuantitySource, '-', 'blue', () => (
              <Form.Item name="quantity" noStyle>
                <InputNumber allowClear min={0} placeholder="-" style={{ width: 100 }} />
              </Form.Item>
            ))}
          </Form.Item>
          <Form.Item name="quantitySource" hidden><Input /></Form.Item>
          
          {/* Prix unitaire */}
          <Form.Item label="Prix unitaire" style={{ marginBottom: 16 }}>
            {renderSourceField('unitPrice', 'unitPriceSource', watchedUnitPriceSource, '-', 'green', () => (
              <Form.Item name="unitPrice" noStyle>
                <InputNumber allowClear min={0} step={0.01} placeholder="-" style={{ width: 120 }} addonAfter="€" />
              </Form.Item>
            ))}
          </Form.Item>
          <Form.Item name="unitPriceSource" hidden><Input /></Form.Item>

          {/* ── Condition simple uniforme ── */}
          <Divider orientation="left">Condition d'affichage (optionnel)</Divider>

          <div style={{ 
            padding: '12px', borderRadius: 6,
            backgroundColor: watchedConditionFieldRef ? '#f6ffed' : '#fafafa',
            border: `1px solid ${watchedConditionFieldRef ? '#b7eb8f' : '#d9d9d9'}`,
          }}>
            {/* Champ de la condition */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 12, whiteSpace: 'nowrap' }}>SI</Text>
              <Form.Item name={['condition', 'fieldRef']} noStyle>
                <Input 
                  readOnly 
                  placeholder="Champ TBL..."
                  style={{ flex: 1, cursor: 'pointer' }}
                  onClick={() => setConditionSelectorOpen(true)}
                />
              </Form.Item>
              <Tooltip title="Sélectionner un champ">
                <Button size="small" icon={<LinkOutlined />} onClick={() => setConditionSelectorOpen(true)} />
              </Tooltip>
              {watchedConditionFieldRef && (
                <Tooltip title="Supprimer la condition">
                  <Button size="small" danger icon={<CloseCircleOutlined />} 
                    onClick={() => form.setFieldsValue({ condition: { fieldRef: undefined, operator: undefined, compareValue: undefined } })} 
                  />
                </Tooltip>
              )}
            </div>

            {/* Opérateur + valeur */}
            {watchedConditionFieldRef && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Form.Item name={['condition', 'operator']} noStyle initialValue="EQUALS">
                  <Select style={{ width: 160 }} placeholder="Opérateur">
                    {SIMPLE_OPERATORS.map(op => (
                      <Select.Option key={op.value} value={op.value}>{op.label}</Select.Option>
                    ))}
                  </Select>
                </Form.Item>
                {watchedConditionOperator && !['IS_EMPTY', 'IS_NOT_EMPTY'].includes(watchedConditionOperator) && (
                  <Form.Item name={['condition', 'compareValue']} noStyle>
                    <Input placeholder="Valeur" style={{ flex: 1 }} />
                  </Form.Item>
                )}
                <Text style={{ fontSize: 11, color: '#8c8c8c', whiteSpace: 'nowrap' }}>→ afficher</Text>
              </div>
            )}

            {!watchedConditionFieldRef && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                La ligne s'affiche toujours. Ajoutez une condition pour l'afficher sous conditions.
              </Text>
            )}
          </div>
        </Form>
      </Modal>

      {/* Sélecteur TBL pour les colonnes */}
      {selectedTreeNodeId && (
        <NodeTreeSelector
          open={selectorOpen}
          onClose={() => setSelectorOpen(false)}
          onSelect={handleTblSelect}
          nodeId={selectedTreeNodeId}
          selectionContext="token"
        />
      )}

      {/* Sélecteur TBL pour le champ de condition */}
      {selectedTreeNodeId && (
        <NodeTreeSelector
          open={conditionSelectorOpen}
          onClose={() => setConditionSelectorOpen(false)}
          onSelect={handleConditionFieldSelect}
          nodeId={selectedTreeNodeId}
          selectionContext="token"
        />
      )}
    </Card>
  );
};

export default PricingLinesEditor;
