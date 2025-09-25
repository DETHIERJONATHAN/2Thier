/**
 * 🌳 TreeManager - Gestionnaire d'interface TreeManagerProps {
  tree?: TreeBranchLeafTree;
  trees?: TreeBranchLeafTree[];
  organizationId?: string;
  readOnly?: boolean;
  onAction: (action: 'create' | 'update' | 'delete' | 'duplicate', data?: Partial<TreeBranchLeafTree>) => void;
  onTreeSelect?: (tree: TreeBranchLeafTree) => void;
  onSave?: (tree: TreeBranchLeafTree) => void;
  onPreview?: (tree: TreeBranchLeafTree) => void;
}dule du haut)
 * 
 * Permet de créer/renommer/dupliquer/supprimer un arbre
 * Barre d'outils avec actions principales
 */

import React, { useState } from 'react';
import { 
  Space, 
  Button, 
  Dropdown, 
  Modal, 
  Form, 
  Input, 
  Select, 
  ColorPicker,
  message,
  Tooltip,
  Typography
} from 'antd';
import { 
  PlusOutlined,
  SaveOutlined,
  EyeOutlined,
  CopyOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  SettingOutlined,
  ExportOutlined,
  ImportOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import type { TreeBranchLeafTree } from '../../types';
import './TreeManager.css';
const { TextArea } = Input;
const { Text } = Typography;
const { Option } = Select;

interface TreeManagerProps {
  tree: TreeBranchLeafTree | null;
  trees?: TreeBranchLeafTree[];
  organizationId: string;
  readOnly?: boolean;
  onAction: (action: 'create' | 'update' | 'delete' | 'duplicate', data?: Partial<TreeBranchLeafTree>) => void;
  onTreeSelect?: (tree: TreeBranchLeafTree) => void;
  onSave?: (tree: TreeBranchLeafTree) => void;
  onPreview?: (tree: TreeBranchLeafTree) => void;
}

interface TreeFormData {
  name: string;
  description?: string;
  category: string;
  icon?: string;
  color: string;
  status: 'draft' | 'published' | 'archived';
}

const TreeManager: React.FC<TreeManagerProps> = ({
  tree,
  trees = [],
  organizationId,
  readOnly = false,
  onAction,
  onTreeSelect,
  onSave,
  onPreview
}) => {
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [form] = Form.useForm<TreeFormData>();
  const [editForm] = Form.useForm<TreeFormData>();

  // =============================================================================
  // 🎬 ACTIONS - Gestionnaires d'événements
  // =============================================================================

  const handleCreate = async (values: TreeFormData) => {
    try {
      // Inclure l'organisation si connue
      const payload: Partial<TreeBranchLeafTree> = {
        ...values,
        ...(organizationId ? { organizationId } : {})
      };
      onAction('create', payload);
      setCreateModalVisible(false);
      form.resetFields();
      message.success('Arbre créé avec succès');
  } catch {
      message.error('Erreur lors de la création de l\'arbre');
    }
  };

  const handleUpdate = async (values: TreeFormData) => {
    if (!tree) return;
    
    try {
      onAction('update', { ...tree, ...values });
      setEditModalVisible(false);
      editForm.resetFields();
      message.success('Arbre mis à jour avec succès');
  } catch {
      message.error('Erreur lors de la mise à jour de l\'arbre');
    }
  };

  const handleDelete = async () => {
    if (!tree) return;
    
    try {
      onAction('delete');
      setDeleteModalVisible(false);
      message.success('Arbre supprimé avec succès');
  } catch {
      message.error('Erreur lors de la suppression de l\'arbre');
    }
  };

  const handleDuplicate = () => {
    if (!tree) return;
    onAction('duplicate');
    message.info('Duplication de l\'arbre en cours...');
  };

  const handleSave = () => {
    if (tree && onSave) {
      onSave(tree);
    }
  };

  const handlePreview = () => {
    if (tree && onPreview) {
      onPreview(tree);
    }
  };

  const openEditModal = () => {
    if (!tree) return;
    
    editForm.setFieldsValue({
      name: tree.name,
      description: tree.description,
      category: tree.category,
      icon: tree.icon,
      color: tree.color,
      status: tree.status
    });
    setEditModalVisible(true);
  };

  // =============================================================================
  // 🎨 MENU ITEMS - Éléments des menus
  // =============================================================================

  const treeMenuItems = [
    {
      key: 'edit',
      label: 'Modifier',
      icon: <EditOutlined />,
      disabled: readOnly,
      onClick: openEditModal
    },
    {
      key: 'duplicate',
      label: 'Dupliquer',
      icon: <CopyOutlined />,
      onClick: handleDuplicate
    },
    {
      type: 'divider' as const
    },
    {
      key: 'export',
      label: 'Exporter',
      icon: <ExportOutlined />,
      onClick: () => message.info('Export - TODO')
    },
    {
      key: 'import',
      label: 'Importer',
      icon: <ImportOutlined />,
      disabled: readOnly,
      onClick: () => message.info('Import - TODO')
    },
    {
      type: 'divider' as const
    },
    {
      key: 'history',
      label: 'Historique',
      icon: <HistoryOutlined />,
      onClick: () => message.info('Historique - TODO')
    },
    {
      key: 'settings',
      label: 'Paramètres',
      icon: <SettingOutlined />,
      disabled: readOnly,
      onClick: () => message.info('Paramètres - TODO')
    },
    {
      type: 'divider' as const
    },
    {
      key: 'delete',
      label: 'Supprimer',
      icon: <DeleteOutlined />,
      danger: true,
      disabled: readOnly,
      onClick: () => setDeleteModalVisible(true)
    }
  ];

  // =============================================================================
  // 🎨 RENDER - Rendu principal
  // =============================================================================

  return (
    <>
  <div className="tree-manager-header" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        width: '100%',
        padding: '8px 16px',
        backgroundColor: '#fafafa',
        borderRadius: '6px',
        border: '1px solid #f0f0f0',
        minHeight: '60px'
      }}>
        
        {/* Partie gauche : Sélecteur d'arbre + Info */}
        <Space align="center" size="middle">
          {/* Sélecteur d'arbres */}
          {trees.length > 0 && (
            <Select
              value={tree?.id}
              placeholder="Sélectionner un arbre..."
              style={{ minWidth: 180 }}
              size="middle"
              styles={{ popup: { root: { backgroundColor: '#1f2937', color: '#fff' } } }}
              onChange={(treeId) => {
                const selectedTree = trees.find(t => t.id === treeId);
                if (selectedTree && onTreeSelect) {
                  onTreeSelect(selectedTree);
                }
              }}
              showSearch
              optionFilterProp="label"
            >
              {trees.map((t) => (
                <Option key={t.id} value={t.id} label={t.name}>
                  {t.name} ({t.category})
                </Option>
              ))}
            </Select>
          )}
          {/* Infos à droite du sélecteur volontairement masquées selon demande */}
        </Space>

        {/* Partie droite : Actions compactes */}
        <Space size="small">
          
          {/* Créer un nouvel arbre */}
          <Tooltip title="Créer un nouvel arbre">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="middle"
              onClick={() => setCreateModalVisible(true)}
              disabled={readOnly}
            >
              Nouveau
            </Button>
          </Tooltip>

          {tree && (
            <>
              {/* Sauvegarder */}
              <Tooltip title="Sauvegarder les modifications">
                <Button
                  icon={<SaveOutlined />}
                  size="middle"
                  onClick={handleSave}
                  disabled={readOnly}
                >
                  Sauver
                </Button>
              </Tooltip>

              {/* Prévisualiser */}
              <Tooltip title="Prévisualiser l'arbre">
                <Button
                  icon={<EyeOutlined />}
                  size="middle"
                  onClick={handlePreview}
                >
                  Aperçu
                </Button>
              </Tooltip>

              {/* Menu d'actions */}
              <Dropdown
                menu={{ 
                  items: treeMenuItems.map(item => ({
                    ...item,
                    onClick: item.onClick
                  }))
                }}
                trigger={['click']}
              >
                <Button 
                  icon={<MoreOutlined />} 
                  size="middle"
                />
              </Dropdown>
            </>
          )}
        </Space>

      </div>

      {/* =============================================================================
          📝 MODALS - Modales de création/édition/suppression
          ============================================================================= */}

      {/* Modal de création */}
      <Modal
        title="Créer un nouvel arbre"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText="Créer"
        cancelText="Annuler"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
          initialValues={{
            category: 'formulaire',
            color: '#10b981',
            status: 'draft'
          }}
        >
          <Form.Item
            name="name"
            label="Nom de l'arbre"
            rules={[{ required: true, message: 'Le nom est obligatoire' }]}
          >
            <Input placeholder="Mon arbre de décision" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <TextArea 
              placeholder="Description de l'arbre..."
              rows={3}
            />
          </Form.Item>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Form.Item
              name="category"
              label="Catégorie"
              style={{ flex: 1 }}
            >
              <Select>
                <Option value="formulaire">📋 Formulaire</Option>
                <Option value="diagnostic">🩺 Diagnostic</Option>
                <Option value="devis">💰 Devis</Option>
                <Option value="configuration">⚙️ Configuration</Option>
                <Option value="evaluation">📊 Évaluation</Option>
                <Option value="autre">📁 Autre</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="color"
              label="Couleur"
            >
              <ColorPicker showText format="hex" />
            </Form.Item>
          </div>

          <Form.Item
            name="icon"
            label="Icône"
          >
            <Select placeholder="Choisir une icône" allowClear>
              <Option value="TreeOutlined">🌳 Arbre</Option>
              <Option value="BranchesOutlined">🌿 Branches</Option>
              <Option value="SettingOutlined">⚙️ Configuration</Option>
              <Option value="FormOutlined">📋 Formulaire</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal d'édition */}
      <Modal
        title="Modifier l'arbre"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
        }}
        onOk={() => editForm.submit()}
        okText="Sauvegarder"
        cancelText="Annuler"
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdate}
        >
          <Form.Item
            name="name"
            label="Nom de l'arbre"
            rules={[{ required: true, message: 'Le nom est obligatoire' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <TextArea rows={3} />
          </Form.Item>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Form.Item
              name="category"
              label="Catégorie"
              style={{ flex: 1 }}
            >
              <Select>
                <Option value="formulaire">📋 Formulaire</Option>
                <Option value="diagnostic">🩺 Diagnostic</Option>
                <Option value="devis">💰 Devis</Option>
                <Option value="configuration">⚙️ Configuration</Option>
                <Option value="evaluation">📊 Évaluation</Option>
                <Option value="autre">📁 Autre</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="status"
              label="Statut"
            >
              <Select>
                <Option value="draft">🚧 Brouillon</Option>
                <Option value="published">✅ Publié</Option>
                <Option value="archived">📦 Archivé</Option>
              </Select>
            </Form.Item>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Form.Item
              name="color"
              label="Couleur"
            >
              <ColorPicker showText format="hex" />
            </Form.Item>

            <Form.Item
              name="icon"
              label="Icône"
              style={{ flex: 1 }}
            >
              <Select placeholder="Choisir une icône" allowClear>
                <Option value="TreeOutlined">🌳 Arbre</Option>
                <Option value="BranchesOutlined">🌿 Branches</Option>
                <Option value="SettingOutlined">⚙️ Configuration</Option>
                <Option value="FormOutlined">📋 Formulaire</Option>
              </Select>
            </Form.Item>
          </div>
        </Form>
      </Modal>

      {/* Modal de suppression */}
      <Modal
        title="Supprimer l'arbre"
        open={deleteModalVisible}
        onCancel={() => setDeleteModalVisible(false)}
        onOk={handleDelete}
        okText="Supprimer"
        cancelText="Annuler"
        okType="danger"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text>
            Êtes-vous sûr de vouloir supprimer l'arbre <strong>"{tree?.name}"</strong> ?
          </Text>
          
          <div style={{ 
            padding: '12px', 
            backgroundColor: '#fff2f0', 
            borderRadius: '4px',
            border: '1px solid #ffccc7'
          }}>
            <Text type="danger" style={{ fontSize: '12px' }}>
              ⚠️ Cette action est irréversible. Tous les nœuds, configurations et données 
              associées seront définitivement supprimés.
            </Text>
          </div>
        </Space>
      </Modal>
    </>
  );
};

export default TreeManager;
