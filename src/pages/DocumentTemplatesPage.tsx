import { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Table, 
  Modal, 
  Form, 
  Input, 
  Select, 
  message, 
  Space, 
  Tag, 
  Popconfirm,
  Tabs,
  Drawer,
  Tooltip
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  FileTextOutlined,
  CopyOutlined,
  SettingOutlined,
  BuildOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import DocumentTemplateEditor from '../components/documents/DocumentTemplateEditor';
import PageBuilder from '../components/documents/PageBuilder';
import ThemeEditorModal from '../components/documents/ThemeEditorModal';

const { TabPane } = Tabs;
const { TextArea } = Input;

interface DocumentTemplate {
  id: string;
  name: string;
  type: 'QUOTE' | 'INVOICE' | 'ORDER' | 'CONTRACT' | 'PRESENTATION';
  description?: string;
  treeId?: string;
  tree?: { id: string; name: string };
  isActive: boolean;
  createdAt: string;
  _count: {
    generatedDocuments: number;
  };
}

interface DocumentTheme {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  isDefault: boolean;
}

interface TBLTree {
  id: string;
  name: string;
  description?: string;
}

const DocumentTemplatesPage = () => {
  const { api } = useAuthenticatedApi();
  
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [themes, setThemes] = useState<DocumentTheme[]>([]);
  const [trees, setTrees] = useState<TBLTree[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
  const [editorVisible, setEditorVisible] = useState(false);
  const [pageBuilderVisible, setPageBuilderVisible] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  
  const [form] = Form.useForm();

  // Charger les templates
  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/documents/templates');
      setTemplates(response);
    } catch (error) {
      message.error('Erreur lors du chargement des templates');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Charger les thèmes
  const loadThemes = async () => {
    try {
      const response = await api.get('/api/documents/themes');
      setThemes(response);
    } catch (error) {
      console.error('Erreur chargement thèmes:', error);
    }
  };

  // Charger les arbres TBL
  const loadTrees = async () => {
    try {
      const response = await api.get('/api/treebranchleaf/trees');
      const treeList = Array.isArray(response) ? response : (response?.data || []);
      setTrees(treeList);
    } catch (error) {
      console.error('Erreur chargement arbres TBL:', error);
    }
  };

  useEffect(() => {
    loadTemplates();
    loadThemes();
    loadTrees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ouvrir modal création/édition
  const openModal = (template?: DocumentTemplate) => {
    if (template) {
      setEditingTemplate(template);
      form.setFieldsValue(template);
    } else {
      setEditingTemplate(null);
      form.resetFields();
    }
    setModalVisible(true);
  };

  // Sauvegarder template
  const handleSaveTemplate = async (values: any) => {
    try {
      if (editingTemplate) {
        await api.put(`/api/documents/templates/${editingTemplate.id}`, values);
        message.success('Template mis à jour');
      } else {
        const response = await api.post('/api/documents/templates', values);
        message.success('Template créé');
        
        // Ouvrir l'éditeur pour configurer les sections
        if (response.id) {
          setEditingTemplateId(response.id);
          setEditorVisible(true);
        }
      }
      
      setModalVisible(false);
      form.resetFields();
      loadTemplates();
    } catch (error) {
      message.error('Erreur lors de la sauvegarde');
      console.error(error);
    }
  };

  // Ouvrir l'éditeur de template (ancien)
  const openEditor = (templateId: string) => {
    setEditingTemplateId(templateId);
    setEditorVisible(true);
  };

  // Ouvrir le Page Builder (nouveau)
  const openPageBuilder = (templateId: string) => {
    setEditingTemplateId(templateId);
    setPageBuilderVisible(true);
  };

  // Sauvegarder un thème
  const handleSaveTheme = async (themeData: any) => {
    try {
      await api.post('/api/documents/themes', themeData);
      loadThemes();
    } catch (error) {
      message.error('Erreur lors de la création du thème');
      console.error(error);
    }
  };

  // Supprimer template
  const handleDeleteTemplate = async (id: string) => {
    try {
      await api.delete(`/api/documents/templates/${id}`);
      message.success('Template supprimé');
      loadTemplates();
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Erreur lors de la suppression');
    }
  };

  // Dupliquer template
  const handleDuplicateTemplate = async (template: DocumentTemplate) => {
    try {
      const response = await api.get(`/api/documents/templates/${template.id}`);
      const newTemplate = {
        ...response,
        name: `${template.name} (Copie)`,
        id: undefined,
        createdAt: undefined,
        updatedAt: undefined
      };
      
      await api.post('/api/documents/templates', newTemplate);
      message.success('Template dupliqué');
      loadTemplates();
    } catch {
      message.error('Erreur lors de la duplication');
    }
  };

  // Colonnes du tableau
  const columns = [
    {
      title: 'Nom',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: DocumentTemplate) => (
        <Space>
          <FileTextOutlined />
          <span className="font-medium">{text}</span>
          {!record.isActive && <Tag color="red">Inactif</Tag>}
        </Space>
      )
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const typeLabels: Record<string, { label: string; color: string }> = {
          QUOTE: { label: 'Devis', color: 'blue' },
          INVOICE: { label: 'Facture', color: 'green' },
          ORDER: { label: 'Bon de commande', color: 'orange' },
          CONTRACT: { label: 'Contrat', color: 'purple' },
          PRESENTATION: { label: 'Présentation', color: 'cyan' }
        };
        const info = typeLabels[type] || { label: type, color: 'default' };
        return <Tag color={info.color}>{info.label}</Tag>;
      }
    },
    {
      title: '🌳 Arbre TBL',
      dataIndex: 'tree',
      key: 'tree',
      render: (tree: { id: string; name: string } | null) => (
        tree ? (
          <Tag color="green">🌳 {tree.name}</Tag>
        ) : (
          <Tag color="default">Générique</Tag>
        )
      )
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    },
    {
      title: 'Documents générés',
      dataIndex: ['_count', 'generatedDocuments'],
      key: 'count',
      align: 'center' as const,
      render: (count: number) => (
        <Tag color={count > 0 ? 'blue' : 'default'}>{count}</Tag>
      )
    },
    {
      title: 'Créé le',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString('fr-FR')
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center' as const,
      render: (_: any, record: DocumentTemplate) => (
        <Space>
          <Tooltip title="🏗️ Page Builder (Nouveau!)">
            <Button
              type="primary"
              icon={<BuildOutlined />}
              onClick={() => openPageBuilder(record.id)}
              size="small"
            />
          </Tooltip>
          <Tooltip title="Éditeur classique">
            <Button
              type="link"
              icon={<SettingOutlined />}
              onClick={() => openEditor(record.id)}
            />
          </Tooltip>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => openModal(record)}
            title="Modifier les informations"
          />
          <Button
            type="link"
            icon={<CopyOutlined />}
            onClick={() => handleDuplicateTemplate(record)}
            title="Dupliquer"
          />
          <Popconfirm
            title="Supprimer ce template ?"
            description="Cette action est irréversible."
            onConfirm={() => handleDeleteTemplate(record.id)}
            okText="Supprimer"
            cancelText="Annuler"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              title="Supprimer"
            />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="p-6">
      <Card
        title={
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold m-0">📄 Gestion des Documents</h1>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openModal()}
            >
              Nouveau Template
            </Button>
          </div>
        }
      >
        <Tabs defaultActiveKey="templates">
          <TabPane tab="Templates" key="templates">
            <Table
              dataSource={templates}
              columns={columns}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </TabPane>
          
          <TabPane tab="Thèmes Visuels" key="themes">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setThemeModalVisible(true)}
              className="mb-4"
            >
              Nouveau Thème
            </Button>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {themes.map(theme => (
                <Card
                  key={theme.id}
                  size="small"
                  title={theme.name}
                  extra={theme.isDefault && <Tag color="gold">Par défaut</Tag>}
                >
                  <Space direction="vertical" className="w-full">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-8 h-8 rounded" 
                        style={{ backgroundColor: theme.primaryColor }}
                      />
                      <span>Couleur principale</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-8 h-8 rounded" 
                        style={{ backgroundColor: theme.secondaryColor }}
                      />
                      <span>Couleur secondaire</span>
                    </div>
                  </Space>
                </Card>
              ))}
            </div>
          </TabPane>
        </Tabs>
      </Card>

      {/* Modal Template */}
      <Modal
        title={editingTemplate ? 'Éditer le Template' : 'Nouveau Template'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveTemplate}
        >
          <Form.Item
            name="name"
            label="Nom du template"
            rules={[{ required: true, message: 'Nom requis' }]}
          >
            <Input placeholder="Ex: Devis Standard" />
          </Form.Item>

          <Form.Item
            name="type"
            label="Type de document"
            rules={[{ required: true, message: 'Type requis' }]}
          >
            <Select placeholder="Sélectionner le type">
              <Select.Option value="QUOTE">Devis</Select.Option>
              <Select.Option value="INVOICE">Facture</Select.Option>
              <Select.Option value="ORDER">Bon de commande</Select.Option>
              <Select.Option value="CONTRACT">Contrat</Select.Option>
              <Select.Option value="PRESENTATION">Présentation</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="treeId"
            label="🌳 Arbre TBL associé"
            tooltip="Sélectionnez l'arbre TBL pour lequel ce template sera disponible. Laissez vide pour un template générique."
          >
            <Select 
              placeholder="Sélectionner un arbre TBL (optionnel)"
              allowClear
              showSearch
              optionFilterProp="children"
            >
              {trees.map(tree => (
                <Select.Option key={tree.id} value={tree.id}>
                  🌳 {tree.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <TextArea 
              rows={3} 
              placeholder="Description du template (optionnel)"
            />
          </Form.Item>

          <Form.Item
            name="defaultLanguage"
            label="Langue par défaut"
            initialValue="fr"
          >
            <Select>
              <Select.Option value="fr">🇫🇷 Français</Select.Option>
              <Select.Option value="nl">🇳🇱 Nederlands</Select.Option>
              <Select.Option value="de">🇩🇪 Deutsch</Select.Option>
              <Select.Option value="en">🇬🇧 English</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="isActive"
            label="Statut"
            initialValue={true}
            valuePropName="checked"
          >
            <Select>
              <Select.Option value={true}>Actif</Select.Option>
              <Select.Option value={false}>Inactif</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Theme Editor Modal */}
      <ThemeEditorModal
        visible={themeModalVisible}
        onClose={() => setThemeModalVisible(false)}
        onSave={handleSaveTheme}
      />

      {/* Template Editor Drawer (ancien) */}
      <Drawer
        title="Configuration du Template"
        width="100%"
        open={editorVisible}
        onClose={() => {
          setEditorVisible(false);
          setEditingTemplateId(null);
          loadTemplates();
        }}
        destroyOnClose
        bodyStyle={{ padding: 0 }}
      >
        {editingTemplateId && (
          <DocumentTemplateEditor
            templateId={editingTemplateId}
            onSave={() => {
              loadTemplates();
            }}
            onClose={() => {
              setEditorVisible(false);
              setEditingTemplateId(null);
            }}
          />
        )}
      </Drawer>

      {/* Page Builder Drawer (nouveau) */}
      <Drawer
        title="🏗️ Page Builder - Éditeur Modulaire"
        width="100%"
        open={pageBuilderVisible}
        onClose={() => {
          setPageBuilderVisible(false);
          setEditingTemplateId(null);
          loadTemplates();
        }}
        destroyOnClose
        styles={{ body: { padding: 0 } }}
      >
        {editingTemplateId && (
          <PageBuilder
            templateId={editingTemplateId}
            onSave={() => {
              loadTemplates();
            }}
            onClose={() => {
              setPageBuilderVisible(false);
              setEditingTemplateId(null);
            }}
          />
        )}
      </Drawer>
    </div>
  );
};

export default DocumentTemplatesPage;
