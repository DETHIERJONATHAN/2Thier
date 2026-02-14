import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Button,
  Table,
  Modal,
  Form,
  Input,
  Select,
  App,
  Typography,
  Space,
  Tag,
  Divider,
  Tooltip,
  Popconfirm,
  ColorPicker,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CopyOutlined,
  ProjectOutlined,
  BranchesOutlined,
  TableOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';

const { Title, Text } = Typography;
const { Option } = Select;

interface TreeBranchLeafTree {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  status: string;
  createdAt: string;
  _count?: {
    Nodes: number;
    Submissions: number;
  };
}

interface CreateTreeForm {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
}

interface UpdateTreeForm extends CreateTreeForm {
  status: 'draft' | 'published' | 'archived';
}

const TreeBranchLeafListPage: React.FC = () => {
  const { api } = useAuthenticatedApi();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [trees, setTrees] = useState<TreeBranchLeafTree[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedTree, setSelectedTree] = useState<TreeBranchLeafTree | null>(null);
  const [form] = Form.useForm<CreateTreeForm>();
  const [editForm] = Form.useForm();

  // Charger la liste des arbres
  const fetchTrees = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔍 [TreeBranchLeaf] Chargement des arbres...');
      
      const response = await api.get('/api/treebranchleaf/trees');
      console.log('🔍 [TreeBranchLeaf] Réponse API:', response);
      
      // La réponse est directement un tableau
      const treesData = Array.isArray(response) ? response : [];
      
      console.log('🔍 [TreeBranchLeaf] Arbres récupérés:', treesData.length);
      setTrees(treesData);
    } catch (error) {
      console.error('[TREEBRANCHLEAF] Erreur lors du chargement des arbres:', error);
      message.error('Erreur lors du chargement des arbres');
      setTrees([]);
    } finally {
      setLoading(false);
    }
  }, [api, message]);

  // Charger les arbres au montage
  useEffect(() => {
    fetchTrees();
  }, [fetchTrees]);

  // Créer un nouvel arbre
  const handleCreateTree = async (values: CreateTreeForm) => {
    try {
      console.log('🔍 [TreeBranchLeaf] Création arbre:', values);
      await api.post('/api/treebranchleaf/trees', values);
      message.success('Arbre créé avec succès');
      setCreateModalVisible(false);
      form.resetFields();
      fetchTrees();
    } catch (error) {
      console.error('[TREEBRANCHLEAF] Erreur lors de la création:', error);
      message.error('Erreur lors de la création de l\'arbre');
    }
  };

  // Mettre à jour un arbre existant
  const handleUpdateTree = async (values: UpdateTreeForm) => {
    if (!selectedTree) return;

    try {
      await api.put(`/api/treebranchleaf/trees/${selectedTree.id}`, values);
      message.success('Arbre mis à jour avec succès');
      setEditModalVisible(false);
      setSelectedTree(null);
      editForm.resetFields();
      fetchTrees();
    } catch (error) {
      console.error('[TREEBRANCHLEAF] Erreur lors de la mise à jour:', error);
      message.error('Erreur lors de la mise à jour de l\'arbre');
    }
  };

  // Supprimer un arbre
  const handleDeleteTree = async (treeId: string) => {
    try {
      await api.delete(`/api/treebranchleaf/trees/${treeId}`);
      message.success('Arbre supprimé avec succès');
      fetchTrees();
    } catch (error) {
      console.error('[TREEBRANCHLEAF] Erreur lors de la suppression:', error);
      message.error('Erreur lors de la suppression de l\'arbre');
    }
  };

  // Dupliquer un arbre (deep copy: noeuds, variables, conditions, formules, tables, configs)
  const handleDuplicateTree = async (tree: TreeBranchLeafTree) => {
    try {
      const hide = message.loading('Duplication en cours...', 0);
      const result = await api.post(`/api/treebranchleaf/trees/${tree.id}/duplicate`, {
        name: `${tree.name} (Copie)`,
      });
      hide();
      const nodesCount = result?.nodesCount ?? 0;
      message.success(`Arbre dupliqué avec succès (${nodesCount} nœuds copiés)`);
      fetchTrees();
    } catch (error) {
      console.error('[TREEBRANCHLEAF] Erreur lors de la duplication:', error);
      message.error('Erreur lors de la duplication de l\'arbre');
    }
  };

  // Ouvrir la modal d'édition
  const openEditModal = (tree: TreeBranchLeafTree) => {
    setSelectedTree(tree);
    editForm.setFieldsValue({
      name: tree.name,
      description: tree.description,
      icon: tree.icon,
      color: tree.color,
      status: tree.status,
    });
    setEditModalVisible(true);
  };

  // Navigation vers l'éditeur
  const navigateToEditor = (treeId: string) => {
    navigate(`/formulaire/treebranchleaf/${treeId}`);
  };

  // Colonnes du tableau
  const columns = [
    {
      title: 'Icône',
      dataIndex: 'icon',
      key: 'icon',
      width: 60,
      render: (icon: string) => (
        <div style={{ fontSize: '24px', textAlign: 'center' }}>
          {icon || '🌳'}
        </div>
      ),
    },
    {
      title: 'Nom',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: TreeBranchLeafTree) => (
        <div>
          <div style={{ fontWeight: 500, fontSize: '16px' }}>{name}</div>
          {record.description && (
            <div style={{ color: '#8c8c8c', fontSize: '12px', marginTop: '2px' }}>
              {record.description}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const colors = {
          draft: 'orange',
          published: 'green',
          archived: 'red',
        };
        return (
          <Tag color={colors[status as keyof typeof colors] || 'default'}>
            {status.toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: 'Nœuds',
      key: 'nodes',
      width: 80,
      render: (_: any, record: TreeBranchLeafTree) => (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '16px', fontWeight: 500 }}>
            {record._count?.Nodes || 0}
          </div>
          <div style={{ fontSize: '10px', color: '#8c8c8c' }}>
            nœuds
          </div>
        </div>
      ),
    },
    {
      title: 'Soumissions',
      key: 'submissions',
      width: 100,
      render: (_: any, record: TreeBranchLeafTree) => (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '16px', fontWeight: 500 }}>
            {record._count?.Submissions || 0}
          </div>
          <div style={{ fontSize: '10px', color: '#8c8c8c' }}>
            soumissions
          </div>
        </div>
      ),
    },
    {
      title: 'Créé le',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date: string) => new Date(date).toLocaleDateString('fr-FR'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_: any, record: TreeBranchLeafTree) => (
        <Space size="small">
          <Tooltip title="Ouvrir l'éditeur (Drag & Drop)">
            <Button
              type="primary"
              size="small"
              icon={<ProjectOutlined />}
              onClick={() => navigateToEditor(record.id)}
            >
              Éditer
            </Button>
          </Tooltip>
          <Tooltip title="Voir les détails">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => {
                // Navigation vers la vue formulaire (preview)
                window.open(`/formulaire/treebranchleaf/${record.id}/preview`, '_blank');
              }}
            />
          </Tooltip>
          <Tooltip title="Modifier les propriétés">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
            />
          </Tooltip>
          <Tooltip title="Dupliquer">
            <Button
              type="text"
              icon={<CopyOutlined />}
              onClick={() => handleDuplicateTree(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Supprimer cet arbre"
            description="Êtes-vous sûr de vouloir supprimer cet arbre ? Cette action est irréversible."
            onConfirm={() => handleDeleteTree(record.id)}
            okText="Supprimer"
            cancelText="Annuler"
            okType="danger"
          >
            <Tooltip title="Supprimer">
              <Button
                type="text"
                icon={<DeleteOutlined />}
                danger
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <Row gutter={24}>
        <Col span={24}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <BranchesOutlined style={{ color: '#52c41a' }} />
                  Arbres TreeBranchLeaf
                </Title>
                <Text type="secondary">
                  Gérez vos arbres de formulaires dynamiques avec système de drag & drop
                </Text>
              </div>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                size="large"
                onClick={() => setCreateModalVisible(true)}
              >
                Créer un arbre
              </Button>
            </div>

            <Divider />

            <Table
              columns={columns}
              dataSource={trees}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} sur ${total} arbres`,
              }}
              locale={{
                emptyText: (
                  <div style={{ padding: '48px 0', textAlign: 'center' }}>
                    <BranchesOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
                    <div style={{ fontSize: '16px', color: '#8c8c8c', marginBottom: '8px' }}>
                      Aucun arbre créé
                    </div>
                    <div style={{ fontSize: '14px', color: '#bfbfbf' }}>
                      Cliquez sur "Créer un arbre" pour commencer
                    </div>
                  </div>
                ),
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Modal de création d'arbre */}
      <Modal
        title="Créer un nouvel arbre TreeBranchLeaf"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateTree}
        >
          <Form.Item
            name="name"
            label="Nom de l'arbre"
            rules={[{ required: true, message: 'Le nom est requis' }]}
          >
            <Input placeholder="Ex: Formulaire de devis" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <Input.TextArea
              placeholder="Description détaillée de l'arbre..."
              rows={3}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="icon"
                label="Icône"
              >
                <Input placeholder="🌳" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="color"
                label="Couleur"
              >
                <ColorPicker showText />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
            <Button
              onClick={() => {
                setCreateModalVisible(false);
                form.resetFields();
              }}
            >
              Annuler
            </Button>
            <Button type="primary" htmlType="submit">
              Créer l'arbre
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Modal d'édition d'arbre */}
      <Modal
        title="Modifier l'arbre"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setSelectedTree(null);
          editForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdateTree}
        >
          <Form.Item
            name="name"
            label="Nom de l'arbre"
            rules={[{ required: true, message: 'Le nom est requis' }]}
          >
            <Input placeholder="Ex: Formulaire de devis" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <Input.TextArea
              placeholder="Description détaillée de l'arbre..."
              rows={3}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="icon"
                label="Icône"
              >
                <Input placeholder="🌳" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="color"
                label="Couleur"
              >
                <ColorPicker showText />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="status"
                label="Statut"
              >
                <Select>
                  <Option value="draft">Brouillon</Option>
                  <Option value="published">Publié</Option>
                  <Option value="archived">Archivé</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
            <Button
              onClick={() => {
                setEditModalVisible(false);
                setSelectedTree(null);
                editForm.resetFields();
              }}
            >
              Annuler
            </Button>
            <Button type="primary" htmlType="submit">
              Mettre à jour
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default TreeBranchLeafListPage;
