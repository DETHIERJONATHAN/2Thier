/**
 * 💰 PRICING LINES EDITOR
 * 
 * Éditeur de lignes pour le tableau de tarification (PRICING_TABLE)
 * Permet de configurer des lignes dynamiques avec :
 * - Lignes statiques (valeurs manuelles)
 * - Lignes dynamiques (liées à des sources TBL: formules, conditions, calculatedValue)
 * - Lignes répétées (génèrent N lignes selon les instances d'un repeater)
 * - Conditions d'affichage sur chaque ligne
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
  ThunderboltOutlined,
  LinkOutlined,
  CopyOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import NodeTreeSelector, { NodeTreeSelectorValue } from '../TreeBranchLeaf/treebranchleaf-new/components/Parameters/shared/NodeTreeSelector';
import ConditionEditorModal, { ConditionalConfig } from './ConditionEditorModal';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';

const { Text } = Typography;

// Types pour les lignes de pricing
export type PricingLineType = 'static' | 'dynamic' | 'repeater';

export interface PricingLine {
  id: string;
  type: PricingLineType;
  label: string;
  labelSource?: string;       // Référence TBL pour le label dynamique
  quantity: number | string;
  quantitySource?: string;    // Référence TBL pour la quantité
  unitPrice: number | string;
  unitPriceSource?: string;   // Référence TBL pour le prix unitaire
  total?: number | string;
  totalSource?: string;       // Référence TBL pour le total
  repeaterId?: string;        // ID du repeater pour type='repeater'
  repeaterLabel?: string;     // Label du repeater pour affichage
  condition?: ConditionalConfig;
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
  const [conditionModalOpen, setConditionModalOpen] = useState(false);
  const [repeaters, setRepeaters] = useState<Array<{ id: string; label: string }>>([]);
  const [loadingRepeaters, setLoadingRepeaters] = useState(false);
  const [trees, setTrees] = useState<Array<{ id: string; label: string; nodeId?: string }>>([]);
  const [selectedTreeNodeId, setSelectedTreeNodeId] = useState<string | null>(nodeId || null);
  // Force re-render quand une source TBL est sélectionnée
  const [, forceUpdate] = useState({});

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
      
      // Sélectionner le premier arbre si pas déjà sélectionné
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

  // Charger les repeaters disponibles
  useEffect(() => {
    const loadRepeaters = async () => {
      if (!selectedTreeNodeId) return;
      
      // Trouver le treeId à partir du nodeId
      const tree = trees.find(t => t.nodeId === selectedTreeNodeId);
      if (!tree) return;
      
      setLoadingRepeaters(true);
      try {
        const repeatersData = await api.get(`/api/treebranchleaf/trees/${tree.id}/repeater-fields`) as Array<{ id: string; label: string; repeaterLabel: string }>;
        
        // Extraire les repeaters uniques
        const uniqueRepeaters = new Map<string, { id: string; label: string }>();
        repeatersData.forEach(r => {
          // Le repeater parent est identifié par son label
          if (!uniqueRepeaters.has(r.repeaterLabel)) {
            uniqueRepeaters.set(r.repeaterLabel, { id: r.id.split('::')[0], label: r.repeaterLabel });
          }
        });
        
        setRepeaters(Array.from(uniqueRepeaters.values()));
      } catch (error) {
        console.error('Erreur chargement repeaters:', error);
      } finally {
        setLoadingRepeaters(false);
      }
    };
    
    loadRepeaters();
  }, [selectedTreeNodeId, trees, api]);

  // Ouvrir le modal pour nouvelle ligne
  const handleAddLine = (type: PricingLineType) => {
    const newLine: PricingLine = {
      id: generateId(),
      type,
      label: type === 'static' ? 'Nouvelle ligne' : '',
      quantity: 1,
      unitPrice: 0,
      order: lines.length,
    };
    setCurrentLine(newLine);
    form.setFieldsValue(newLine);
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
    // Recalculer les ordres
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
      
      const existingIndex = lines.findIndex(l => l.id === updatedLine.id);
      if (existingIndex >= 0) {
        // Mise à jour
        const newLines = [...lines];
        newLines[existingIndex] = updatedLine;
        onChange(newLines);
      } else {
        // Nouvelle ligne
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
    
    form.setFieldsValue({
      [fieldName]: value.ref,
      [sourceField]: value.ref,
    });
    
    setSelectorOpen(false);
    // Forcer le re-render pour afficher le badge TBL
    forceUpdate({});
    message.success(`Référence TBL ajoutée: ${value.ref}`);
  };

  // Ouvrir l'éditeur de condition
  const openConditionEditor = () => {
    setConditionModalOpen(true);
  };

  // Sauvegarder la condition
  const handleSaveCondition = (config: ConditionalConfig) => {
    form.setFieldsValue({ condition: config });
    setConditionModalOpen(false);
    message.success('Condition configurée');
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
              🔗 {record.labelSource}
            </Text>
          )}
          {record.repeaterId && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              🔁 Repeater: {record.repeaterLabel || record.repeaterId}
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
            <Text type="secondary" style={{ fontSize: 10 }}>🔗</Text>
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
            <Text type="secondary" style={{ fontSize: 10 }}>🔗</Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Condition',
      dataIndex: 'condition',
      width: 80,
      render: (condition: ConditionalConfig | undefined) => (
        condition ? (
          <Badge status="success" text="Active" />
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
          disabled={repeaters.length === 0}
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
              <Select.Option value="repeater">🔁 Repeater (génère N lignes)</Select.Option>
            </Select>
          </Form.Item>

          <Divider orientation="left">Désignation</Divider>
          
          {/* Libellé avec support TBL */}
          <Form.Item label="Libellé" style={{ marginBottom: 16 }}>
            {form.getFieldValue('labelSource') ? (
              // Affichage quand une source TBL est liée
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8,
                padding: '8px 12px',
                backgroundColor: '#fff7e6',
                border: '1px solid #ffd591',
                borderRadius: 6,
              }}>
                <Tag color="orange" icon={<LinkOutlined />}>TBL</Tag>
                <Text code style={{ flex: 1, fontSize: 12 }}>
                  {form.getFieldValue('labelSource')}
                </Text>
                <Tooltip title="Supprimer la liaison">
                  <Button 
                    size="small" 
                    danger 
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      form.setFieldsValue({ label: '', labelSource: undefined });
                      forceUpdate({});
                    }}
                  />
                </Tooltip>
              </div>
            ) : (
              // Saisie manuelle ou sélection TBL
              <Space.Compact style={{ width: '100%' }}>
                <Form.Item name="label" noStyle>
                  <Input placeholder="Ex: Travaux d'isolation" style={{ flex: 1 }} />
                </Form.Item>
                <Tooltip title="Lier à une donnée TBL (champ, formule, condition...)">
                  <Button icon={<LinkOutlined />} onClick={() => openTblSelector('label')} />
                </Tooltip>
              </Space.Compact>
            )}
          </Form.Item>
          <Form.Item name="labelSource" hidden>
            <Input />
          </Form.Item>

          {/* Sélection du repeater pour type='repeater' */}
          {form.getFieldValue('type') === 'repeater' && (
            <>
              <Form.Item 
                name="repeaterId" 
                label="Repeater source"
                rules={[{ required: true, message: 'Sélectionnez un repeater' }]}
              >
                <Select
                  placeholder="Sélectionnez le repeater"
                  loading={loadingRepeaters}
                  options={repeaters.map(r => ({ value: r.id, label: r.label }))}
                  onChange={(value) => {
                    const rep = repeaters.find(r => r.id === value);
                    form.setFieldsValue({ repeaterLabel: rep?.label });
                  }}
                />
              </Form.Item>
              <Form.Item name="repeaterLabel" hidden>
                <Input />
              </Form.Item>
            </>
          )}

          <Divider orientation="left">Valeurs</Divider>

          {/* Quantité */}
          <Form.Item label="Quantité" style={{ marginBottom: 16 }}>
            {form.getFieldValue('quantitySource') ? (
              // Affichage quand une source TBL est liée
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8,
                padding: '8px 12px',
                backgroundColor: '#f0f9ff',
                border: '1px solid #91caff',
                borderRadius: 6,
              }}>
                <Tag color="blue" icon={<LinkOutlined />}>TBL</Tag>
                <Text code style={{ flex: 1, fontSize: 12 }}>
                  {form.getFieldValue('quantitySource')}
                </Text>
                <Tooltip title="Supprimer la liaison">
                  <Button 
                    size="small" 
                    danger 
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      form.setFieldsValue({ quantity: 1, quantitySource: undefined });
                    }}
                  />
                </Tooltip>
              </div>
            ) : (
              // Saisie manuelle ou sélection TBL
              <Space.Compact>
                <Form.Item name="quantity" noStyle>
                  <InputNumber min={0} style={{ width: 100 }} />
                </Form.Item>
                <Tooltip title="Lier à une donnée TBL (calculatedValue, formule...)">
                  <Button icon={<LinkOutlined />} onClick={() => openTblSelector('quantity')} />
                </Tooltip>
              </Space.Compact>
            )}
          </Form.Item>
          <Form.Item name="quantitySource" hidden>
            <Input />
          </Form.Item>
          
          {/* Prix unitaire */}
          <Form.Item label="Prix unitaire" style={{ marginBottom: 16 }}>
            {form.getFieldValue('unitPriceSource') ? (
              // Affichage quand une source TBL est liée
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8,
                padding: '8px 12px',
                backgroundColor: '#f6ffed',
                border: '1px solid #b7eb8f',
                borderRadius: 6,
              }}>
                <Tag color="green" icon={<LinkOutlined />}>TBL</Tag>
                <Text code style={{ flex: 1, fontSize: 12 }}>
                  {form.getFieldValue('unitPriceSource')}
                </Text>
                <Tooltip title="Supprimer la liaison">
                  <Button 
                    size="small" 
                    danger 
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      form.setFieldsValue({ unitPrice: 0, unitPriceSource: undefined });
                    }}
                  />
                </Tooltip>
              </div>
            ) : (
              // Saisie manuelle ou sélection TBL
              <Space.Compact>
                <Form.Item name="unitPrice" noStyle>
                  <InputNumber 
                    min={0} 
                    step={0.01} 
                    style={{ width: 120 }} 
                    addonAfter="€"
                  />
                </Form.Item>
                <Tooltip title="Lier à une donnée TBL (formule, condition, calculatedValue...)">
                  <Button icon={<LinkOutlined />} onClick={() => openTblSelector('unitPrice')} />
                </Tooltip>
              </Space.Compact>
            )}
          </Form.Item>
          <Form.Item name="unitPriceSource" hidden>
            <Input />
          </Form.Item>

          <Divider orientation="left">Condition d'affichage</Divider>

          <Form.Item name="condition" label="Condition">
            <Space>
              <Badge 
                status={form.getFieldValue('condition') ? 'success' : 'default'} 
                text={form.getFieldValue('condition') ? 'Condition active' : 'Pas de condition'} 
              />
              <Button 
                icon={<ThunderboltOutlined />} 
                onClick={openConditionEditor}
                type={form.getFieldValue('condition') ? 'primary' : 'default'}
                ghost={!!form.getFieldValue('condition')}
              >
                {form.getFieldValue('condition') ? 'Modifier la condition' : 'Ajouter une condition'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Sélecteur TBL */}
      {selectedTreeNodeId && (
        <NodeTreeSelector
          open={selectorOpen}
          onClose={() => setSelectorOpen(false)}
          onSelect={handleTblSelect}
          nodeId={selectedTreeNodeId}
          selectionContext="token"
        />
      )}

      {/* Éditeur de conditions */}
      {selectedTreeNodeId && (
        <ConditionEditorModal
          open={conditionModalOpen}
          onClose={() => setConditionModalOpen(false)}
          onSave={handleSaveCondition}
          initialConfig={form.getFieldValue('condition')}
          nodeId={selectedTreeNodeId}
        />
      )}
    </Card>
  );
};

export default PricingLinesEditor;
