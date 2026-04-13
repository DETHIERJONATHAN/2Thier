/**
 * 🌳 TreeManager - Gestionnaire de barre d'outils pour les arbres TreeBranchLeaf
 *
 * - Permet de créer, éditer, dupliquer et supprimer des arbres
 * - Fournit les actions de sauvegarde/aperçu et un sélecteur d'arbre
 * - Ajoute des logs détaillés pour diagnostiquer les re-rendus excessifs
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Space,
  Button,
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
  EditOutlined,
  CopyOutlined,
  ExportOutlined,
  ImportOutlined,
  HistoryOutlined,
  SettingOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import type { TreeBranchLeafTree } from '../../types';

import './TreeManager.css';
import { useTranslation } from 'react-i18next';

const { Option } = Select;
const { TextArea } = Input;
const { Text, Paragraph } = Typography;

interface CreateTreeFormValues {
  name: string;
  description?: string;
  category: string;
  color: string;
  icon?: string;
  status: 'draft' | 'published' | 'archived';
}

type UpdateTreeFormValues = CreateTreeFormValues;

interface TreeManagerProps {
  tree?: TreeBranchLeafTree | null;
  trees?: TreeBranchLeafTree[];
  organizationId?: string;
  readOnly?: boolean;
  onAction: (action: 'create' | 'update' | 'delete' | 'duplicate', data?: Partial<TreeBranchLeafTree>) => void | Promise<void>;
  onTreeSelect?: (tree: TreeBranchLeafTree) => void;
  onSave?: (tree: TreeBranchLeafTree) => void;
  onPreview?: (tree: TreeBranchLeafTree) => void;
}

const DEFAULT_CREATE_VALUES: CreateTreeFormValues = {
  name: '',
  description: '',
  category: 'formulaire',
  color: '#10b981',
  icon: undefined,
  status: 'draft'
};

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
  const { t } = useTranslation();
  const [form] = Form.useForm<CreateTreeFormValues>();
  const [editForm] = Form.useForm<UpdateTreeFormValues>();

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);

  const actionsMenuRef = useRef<HTMLDivElement | null>(null);
  const actionsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const renderCountRef = useRef(0);
  const snapshotRef = useRef<string>('');

  useEffect(() => {
    // console.log('🌳 [TreeManager] props update', {
    //   treeId: tree?.id,
    //   treesCount: trees.length,
    //   readOnly,
    //   organizationId
    // });
  }, [tree?.id, trees.length, readOnly, organizationId]);

  useEffect(() => {
    // console.log('🌳 [TreeManager] actionsMenuOpen ->', actionsMenuOpen);
  }, [actionsMenuOpen]);

  useEffect(() => {
    if (createModalVisible) {
      // console.log('🌳 [TreeManager] createModalVisible OPEN');
    }
  }, [createModalVisible]);

  useEffect(() => {
    if (editModalVisible) {
      // console.log('🌳 [TreeManager] editModalVisible OPEN for tree', tree?.id);
    }
  }, [editModalVisible, tree?.id]);

  useEffect(() => {
    if (deleteModalVisible) {
      // console.log('🌳 [TreeManager] deleteModalVisible OPEN for tree', tree?.id);
    }
  }, [deleteModalVisible, tree?.id]);

  renderCountRef.current += 1;
  const stateSnapshot = JSON.stringify({
    createModalVisible,
    editModalVisible,
    deleteModalVisible,
    actionsMenuOpen,
    treeId: tree?.id ?? null,
    treesCount: trees.length,
    readOnly
  });

  if (snapshotRef.current !== stateSnapshot) {
    // console.log('🌳 [TreeManager] render #%d state snapshot %o', renderCountRef.current, {
    //   createModalVisible,
    //   editModalVisible,
    //   deleteModalVisible,
    //   actionsMenuOpen,
    //   treeId: tree?.id,
    //   treesCount: trees.length,
    //   readOnly
    // });
    snapshotRef.current = stateSnapshot;
  }

  const closeAllModals = useCallback(() => {
    setCreateModalVisible(false);
    setEditModalVisible(false);
    setDeleteModalVisible(false);
  }, []);

  const openCreateModal = useCallback(() => {
    // console.log('🌳 [TreeManager] openCreateModal');
    form.setFieldsValue(DEFAULT_CREATE_VALUES);
    setCreateModalVisible(true);
  }, [form]);

  const openEditModal = useCallback(() => {
    if (!tree) {
      console.warn('🌳 [TreeManager] openEditModal without tree');
      return;
    }
    // console.log('🌳 [TreeManager] openEditModal for tree', tree.id);
    editForm.setFieldsValue({
      name: tree.name,
      description: tree.description,
      category: tree.category,
      color: tree.color,
      icon: tree.icon,
      status: tree.status
    });
    setEditModalVisible(true);
  }, [editForm, tree]);

  const handleCreate = useCallback(async (values: CreateTreeFormValues) => {
    // console.log('🌳 [TreeManager] handleCreate submit', values);
    closeAllModals();
    form.resetFields();
    await onAction('create', {
      ...values,
      organizationId
    });
  }, [closeAllModals, form, onAction, organizationId]);

  const handleUpdate = useCallback(async (values: UpdateTreeFormValues) => {
    if (!tree) {
      console.warn('🌳 [TreeManager] handleUpdate without tree');
      return;
    }
    // console.log('🌳 [TreeManager] handleUpdate submit', tree.id, values);
    closeAllModals();
    await onAction('update', {
      id: tree.id,
      ...values
    });
  }, [closeAllModals, onAction, tree]);

  const handleDelete = useCallback(async () => {
    if (!tree) {
      console.warn('🌳 [TreeManager] handleDelete without tree');
      return;
    }
    // console.log('🌳 [TreeManager] handleDelete', tree.id);
    closeAllModals();
    await onAction('delete');
  }, [closeAllModals, onAction, tree]);

  const handleDuplicate = useCallback(async () => {
    if (!tree) {
      console.warn('🌳 [TreeManager] handleDuplicate without tree');
      return;
    }
    // console.log('🌳 [TreeManager] handleDuplicate', tree.id);
    await onAction('duplicate');
  }, [onAction, tree]);

  const _handleSave = useCallback(() => {
    if (!tree) {
      console.warn('🌳 [TreeManager] handleSave without tree');
      return;
    }
    if (onSave) {
      // console.log('🌳 [TreeManager] handleSave delegated to parent', tree.id);
      onSave(tree);
    } else {
      // console.log('🌳 [TreeManager] handleSave fallback to onAction update', tree.id);
      onAction('update', { id: tree.id });
    }
  }, [onAction, onSave, tree]);

  const _handlePreview = useCallback(() => {
    if (!tree) {
      message.warning('Aucun arbre sélectionné pour l\'aperçu');
      return;
    }
    if (onPreview) {
      // console.log('🌳 [TreeManager] handlePreview delegated', tree.id);
      onPreview(tree);
    } else {
      message.info('Prévisualisation non disponible');
    }
  }, [onPreview, tree]);

  useEffect(() => {
    if (!editModalVisible || !tree) {
      return;
    }
    editForm.setFieldsValue({
      name: tree.name,
      description: tree.description,
      category: tree.category,
      color: tree.color,
      icon: tree.icon,
      status: tree.status
    });
  }, [editModalVisible, editForm, tree]);

  useEffect(() => {
    if (!actionsMenuOpen) {
      return;
    }
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (actionsMenuRef.current?.contains(target)) {
        // console.log('🌳 [TreeManager] pointerdown inside menu');
        return;
      }
      if (actionsTriggerRef.current?.contains(target as HTMLElement)) {
        // console.log('🌳 [TreeManager] pointerdown on trigger');
        return;
      }
      // console.log('🌳 [TreeManager] pointerdown outside -> closing menu');
      setActionsMenuOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown, { capture: true });
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, { capture: true } as EventListenerOptions);
    };
  }, [actionsMenuOpen]);

  const _treeMenuItems = useMemo(() => ([
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
      disabled: readOnly,
      onClick: handleDuplicate
    },
    { type: 'divider' as const },
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
    { type: 'divider' as const },
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
    { type: 'divider' as const },
    {
      key: 'delete',
      label: 'Supprimer',
      icon: <DeleteOutlined />,
      danger: true,
      disabled: readOnly,
      onClick: () => setDeleteModalVisible(true)
    }
  ]), [handleDuplicate, openEditModal, readOnly]);

  const handleTreeSelection = useCallback((treeId: string) => {
    const selected = trees.find((item) => item.id === treeId);
    // console.log('� [TreeManager] tree selection change', treeId, 'found?', !!selected);
    if (selected && onTreeSelect) {
      onTreeSelect(selected);
    }
  }, [onTreeSelect, trees]);

  return (
    <>
      <div
        className="tree-manager-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '6px 0',
        }}
      >
        <div>
          {trees.length > 0 && (
            <Select
              value={tree?.id}
              placeholder="Sélectionner un arbre..."
              style={{ minWidth: 200, height: 32 }}
              showSearch
              optionFilterProp="label"
              onChange={handleTreeSelection}
              styles={{ popup: { root: { backgroundColor: '#1f2937', color: '#fff' } } }}
            >
              {trees.map((item) => (
                <Option key={item.id} value={item.id} label={item.name}>
                  {item.name} ({item.category})
                </Option>
              ))}
            </Select>
          )}
        </div>

        <Tooltip title="Créer un nouvel arbre">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ height: 32 }}
            onClick={openCreateModal}
            disabled={readOnly}
          >
            Nouveau
          </Button>
        </Tooltip>
      </div>

      {createModalVisible && (
        <Modal
          title="Créer un nouvel arbre"
          open
          onCancel={() => {
            setCreateModalVisible(false);
            form.resetFields();
          }}
          onOk={() => form.submit()}
          okText={t('common.create')}
          cancelText={t('common.cancel')}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleCreate}
            initialValues={DEFAULT_CREATE_VALUES}
          >
            <Form.Item
              name="name"
              label="Nom de l'arbre"
              rules={[{ required: true, message: 'Le nom est obligatoire' }]}
            >
              <Input placeholder="Mon arbre de décision" />
            </Form.Item>

            <Form.Item name="description" label={t('fields.description')}>
              <TextArea rows={3} placeholder="Description de l'arbre..." />
            </Form.Item>

            <div style={{ display: 'flex', gap: 12 }}>
              <Form.Item name="category" label={t('fields.category')} style={{ flex: 1 }}>
                <Select>
                  <Option value="formulaire">📋 Formulaire</Option>
                  <Option value="diagnostic">🩺 Diagnostic</Option>
                  <Option value="devis">💰 Devis</Option>
                  <Option value="configuration">⚙️ Configuration</Option>
                  <Option value="evaluation">📊 Évaluation</Option>
                  <Option value="autre">📁 Autre</Option>
                </Select>
              </Form.Item>

              <Form.Item name="color" label={t('fields.color')}>
                <ColorPicker showText format="hex" disabled={readOnly} />
              </Form.Item>
            </div>

            <Form.Item name="icon" label="Icône">
              <Select placeholder="Choisir une icône" allowClear>
                <Option value="TreeOutlined">🌳 Arbre</Option>
                <Option value="BranchesOutlined">🌿 Branches</Option>
                <Option value="SettingOutlined">⚙️ Configuration</Option>
                <Option value="FormOutlined">📋 Formulaire</Option>
              </Select>
            </Form.Item>
          </Form>
        </Modal>
      )}

      {editModalVisible && (
        <Modal
          title="Modifier l'arbre"
          open
          onCancel={() => {
            setEditModalVisible(false);
            editForm.resetFields();
          }}
          onOk={() => editForm.submit()}
          okText="Sauvegarder"
          cancelText={t('common.cancel')}
        >
          <Form form={editForm} layout="vertical" onFinish={handleUpdate}>
            <Form.Item
              name="name"
              label="Nom de l'arbre"
              rules={[{ required: true, message: 'Le nom est obligatoire' }]}
            >
              <Input />
            </Form.Item>

            <Form.Item name="description" label={t('fields.description')}>
              <TextArea rows={3} />
            </Form.Item>

            <div style={{ display: 'flex', gap: 12 }}>
              <Form.Item name="category" label={t('fields.category')} style={{ flex: 1 }}>
                <Select>
                  <Option value="formulaire">📋 Formulaire</Option>
                  <Option value="diagnostic">🩺 Diagnostic</Option>
                  <Option value="devis">💰 Devis</Option>
                  <Option value="configuration">⚙️ Configuration</Option>
                  <Option value="evaluation">📊 Évaluation</Option>
                  <Option value="autre">📁 Autre</Option>
                </Select>
              </Form.Item>

              <Form.Item name="status" label={t('fields.status')}>
                <Select>
                  <Option value="draft">🚧 Brouillon</Option>
                  <Option value="published">✅ Publié</Option>
                  <Option value="archived">📦 Archivé</Option>
                </Select>
              </Form.Item>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <Form.Item name="color" label={t('fields.color')}>
                <ColorPicker showText format="hex" disabled={readOnly} />
              </Form.Item>

              <Form.Item name="icon" label="Icône" style={{ flex: 1 }}>
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
      )}

      {deleteModalVisible && (
        <Modal
          title="Supprimer l'arbre"
          open
          onCancel={() => setDeleteModalVisible(false)}
          onOk={handleDelete}
          okText={t('common.delete')}
          cancelText={t('common.cancel')}
          okButtonProps={{ danger: true }}
        >
          <Paragraph>
            Êtes-vous sûr de vouloir supprimer l'arbre <strong>{tree?.name}</strong> ?
          </Paragraph>
          <Text type="secondary">Cette action est irréversible.</Text>
        </Modal>
      )}
    </>
  );
};

export default TreeManager;
