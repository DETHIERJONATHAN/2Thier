import { FB } from '../components/zhiive/ZhiiveTheme';
import { useState, useEffect } from 'react';
import { 
  Table, 
  Modal, 
  Form, 
  Input, 
  Select, 
  message, 
  Tag,
  Tabs,
  Drawer,
  Grid,
  Dropdown
} from 'antd';
import { 
  FileTextOutlined,
  BuildOutlined,
  SettingOutlined,
  MoreOutlined,
  EllipsisOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import DocumentTemplateEditor from '../components/Documents/DocumentTemplateEditor';
import PageBuilder from '../components/Documents/PageBuilder';
import ThemeEditorModal from '../components/Documents/ThemeEditorModal';
import { TemplateSelector } from '../components/Documents/TemplateSelector';
import { DocumentTemplate as PrebuiltTemplate, instantiateTemplate } from '../components/Documents/DocumentTemplates';
import { useTranslation } from 'react-i18next';
import { logger } from '../lib/logger';

const { TabPane } = Tabs;
const { TextArea } = Input;

interface DocumentTemplate {
  id: string;
  name: string;
  type: 'QUOTE' | 'INVOICE' | 'ORDER' | 'CONTRACT' | 'PRESENTATION';
  description?: string;
  treeId?: string;
  tree?: { id: string; name: string };
  productValue?: string | null;
  isDefault?: boolean;
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
  const { t } = useTranslation();
  const { api } = useAuthenticatedApi();
  
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [themes, setThemes] = useState<DocumentTheme[]>([]);
  const [trees, setTrees] = useState<TBLTree[]>([]);
  const [productOptions, setProductOptions] = useState<Array<{value: string, label: string, icon?: string, color?: string}>>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
  const [editorVisible, setEditorVisible] = useState(false);
  const [pageBuilderVisible, setPageBuilderVisible] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateSelectorVisible, setTemplateSelectorVisible] = useState(false);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
  const [initialPageBuilderConfig, setInitialPageBuilderConfig] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string; docsCount: number } | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  const [form] = Form.useForm();

  // Charger les templates
  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/documents/templates');
      setTemplates(response);
    } catch (error) {
      message.error('Erreur lors du chargement des templates');
      logger.error(error);
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
      logger.error('Erreur chargement thèmes:', error);
    }
  };

  // Charger les arbres TBL
  const loadTrees = async () => {
    try {
      const response = await api.get('/api/treebranchleaf/trees');
      const treeList = Array.isArray(response) ? response : (response?.data || []);
      setTrees(treeList);
    } catch (error) {
      logger.error('Erreur chargement arbres TBL:', error);
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
      // Charger les produits si un arbre est lié
      if (template.treeId) {
        loadProductOptions(template.treeId);
      } else {
        setProductOptions([]);
      }
    } else {
      setEditingTemplate(null);
      form.resetFields();
      // Valeurs par défaut pour nouveau template
      form.setFieldsValue({ isDefault: false, isActive: true, defaultLanguage: 'fr' });
      setProductOptions([]);
    }
    setModalVisible(true);
  };

  // Charger les options produit pour un arbre
  const loadProductOptions = async (treeId: string) => {
    try {
      const response = await api.get(`/api/documents/product-options/${treeId}`);
      const opts = Array.isArray(response) ? response : (response?.data || []);
      setProductOptions(opts);
    } catch (error) {
      logger.error('Erreur chargement options produit:', error);
      setProductOptions([]);
    }
  };

  // Sauvegarder template
  const handleSaveTemplate = async (values: unknown) => {
    try {
      if (editingTemplate) {
        await api.put(`/api/documents/templates/${editingTemplate.id}`, values);
        message.success('Template mis à jour');
        setModalVisible(false);
        form.resetFields();
        loadTemplates();
      } else {
        const response = await api.post('/api/documents/templates', values);
        message.success('Template créé');
        
        // Ouvrir le sélecteur de templates pré-construits
        if (response.id) {
          setPendingTemplateId(response.id);
          setTemplateSelectorVisible(true);
        }
        
        setModalVisible(false);
        form.resetFields();
        loadTemplates();
      }
    } catch (error) {
      message.error('Erreur lors de la sauvegarde');
      logger.error(error);
    }
  };

  // Gérer la sélection d'un template pré-construit
  const handleSelectPrebuiltTemplate = (prebuiltTemplate: PrebuiltTemplate | null) => {
    setTemplateSelectorVisible(false);
    
    if (pendingTemplateId) {
      setEditingTemplateId(pendingTemplateId);
      
      if (prebuiltTemplate) {
        // Convertir le template pré-construit en config pour le PageBuilder
        const modules = instantiateTemplate(prebuiltTemplate);
        const initialConfig = {
          id: pendingTemplateId,
          name: prebuiltTemplate.name,
          type: 'QUOTE',
          pages: [{
            id: `page-${Date.now()}`,
            name: 'Page 1',
            order: 0,
            modules: modules.map((m, index) => ({
              ...m,
              position: { x: 0, y: index * 100 },
              size: { width: 12, height: 2 },
            })),
            padding: prebuiltTemplate.defaultPageSettings?.margins || { top: 40, right: 40, bottom: 40, left: 40 },
          }],
          globalTheme: {
            primaryColor: '#1890ff',
            secondaryColor: '#52c41a',
            fontFamily: 'Inter, sans-serif',
            fontSize: 14,
          }
        };
        setInitialPageBuilderConfig(initialConfig);
      } else {
        // Document vierge
        setInitialPageBuilderConfig(null);
      }
      
      setPageBuilderVisible(true);
    }
    
    setPendingTemplateId(null);
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
  const handleSaveTheme = async (themeData: unknown) => {
    try {
      await api.post('/api/documents/themes', themeData);
      loadThemes();
    } catch (error) {
      message.error('Erreur lors de la création du thème');
      logger.error(error);
    }
  };

  // Supprimer template (toujours force=true, la confirmation se fait côté UI)
  const handleDeleteTemplate = async (id: string) => {
    logger.debug('🗑️ [handleDeleteTemplate] Suppression du template:', id);
    try {
      setDeleting(true);
      await api.delete(`/api/documents/templates/${id}?force=true`);
      logger.debug('✅ [handleDeleteTemplate] Template supprimé avec succès');
      message.success('Template supprimé');
      setDeleteConfirm(null);
      loadTemplates();
    } catch (error: unknown) {
      logger.error('❌ [handleDeleteTemplate] Erreur suppression template:', error);
      message.error(error?.message || 'Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  // Dupliquer template (deep copy avec sections)
  const handleDuplicateTemplate = async (template: DocumentTemplate) => {
    try {
      const hide = message.loading('Duplication en cours...', 0);
      const response = await api.get(`/api/documents/templates/${template.id}`);

      // Mapper DocumentSection → sections (le POST attend "sections", pas "DocumentSection")
      const sections = (response.DocumentSection || []).map((s: Record<string, unknown>) => ({
        order: s.order,
        type: s.type,
        config: s.config || {},
        displayConditions: s.displayConditions,
        linkedNodeIds: s.linkedNodeIds || [],
        linkedVariables: s.linkedVariables || [],
        translations: s.translations || {},
      }));

      const newTemplate = {
        name: `${template.name} (Copie)`,
        type: response.type,
        description: response.description,
        translations: response.translations,
        defaultLanguage: response.defaultLanguage,
        themeId: response.themeId,
        treeId: response.treeId,
        sections,
      };

      await api.post('/api/documents/templates', newTemplate);
      hide();
      message.success(`Template dupliqué (${sections.length} section${sections.length > 1 ? 's' : ''} copiée${sections.length > 1 ? 's' : ''})`);
      loadTemplates();
    } catch {
      message.error('Erreur lors de la duplication');
    }
  };

  // Colonnes du tableau (responsive)
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.sm;
  
  // Menu actions pour mobile
  const getActionMenu = (record: DocumentTemplate) => ({
    items: [
      {
        key: 'builder',
        icon: <BuildOutlined />,
        label: 'Page Builder',
        onClick: () => openPageBuilder(record.id),
      },
      {
        key: 'editor',
        icon: <SettingOutlined />,
        label: 'Éditeur classique',
        onClick: () => openEditor(record.id),
      },
      {
        key: 'edit',
        icon: <EditOutlined />,
        label: 'Modifier',
        onClick: () => openModal(record),
      },
      {
        key: 'duplicate',
        icon: <CopyOutlined />,
        label: 'Dupliquer',
        onClick: () => handleDuplicateTemplate(record),
      },
      {
        type: 'divider' as const,
      },
      {
        key: 'delete',
        icon: <DeleteOutlined />,
        label: 'Supprimer',
        danger: true,
        onClick: () => {
          logger.debug('🗑️ [Supprimer] Clic sur Supprimer pour:', record.id, record.name);
          setDeleteConfirm({
            id: record.id,
            name: record.name,
            docsCount: record._count?.generatedDocuments || 0,
          });
        },
      },
    ],
  });
  
  const columns = [
    {
      title: 'Nom',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: DocumentTemplate) => (
        <div>
          <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileTextOutlined />
            {text}
          </div>
          {isMobile && (
            <Tag color={record.type === 'QUOTE' ? 'blue' : record.type === 'INVOICE' ? 'green' : 'default'} style={{ marginTop: 4 }}>
              {record.type === 'QUOTE' ? 'Devis' : record.type === 'INVOICE' ? 'Facture' : record.type}
            </Tag>
          )}
          {!record.isActive && <Tag color="red" style={{ marginTop: 4 }}>{t('common.inactive')}</Tag>}
        </div>
      )
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      responsive: ['sm'] as ('sm')[],
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
      width: 120,
      responsive: ['lg'] as ('lg')[],
      render: (tree: { id: string; name: string } | null) => (
        tree ? (
          <Tag color="green">🌳 {tree.name}</Tag>
        ) : (
          <Tag color="default">Générique</Tag>
        )
      )
    },
    {
      title: '🏷️ Liaison',
      key: 'productLink',
      width: 120,
      responsive: ['md'] as ('md')[],
      render: (_: unknown, record: DocumentTemplate) => (
        record.isDefault ? (
          <Tag color="blue">📌 Par défaut</Tag>
        ) : record.productValue ? (
          <Tag color="purple">🏷️ {record.productValue}</Tag>
        ) : (
          <Tag color="default">Libre</Tag>
        )
      )
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      width: 150,
      responsive: ['xl'] as ('xl')[],
    },
    {
      title: 'Docs',
      dataIndex: ['_count', 'generatedDocuments'],
      key: 'count',
      align: 'center' as const,
      width: 60,
      responsive: ['md'] as ('md')[],
      render: (count: number) => (
        <Tag color={count > 0 ? 'blue' : 'default'}>{count}</Tag>
      )
    },
    {
      title: 'Créé le',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 100,
      responsive: ['lg'] as ('lg')[],
      render: (date: string) => new Date(date).toLocaleDateString('fr-FR')
    },
    {
      title: '',
      key: 'actions',
      width: isMobile ? 50 : 220,
      render: (_: unknown, record: DocumentTemplate) => (
        isMobile ? (
          <Dropdown menu={getActionMenu(record)} trigger={['click']}>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>⋯</button>
          </Dropdown>
        ) : (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button onClick={() => openPageBuilder(record.id)} title="Page Builder" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, border: 'none', background: '#e7f3ff', color: FB.blue, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}><span>🏗️</span><span>Builder</span></button>
            <button onClick={() => openEditor(record.id)} title="Éditeur classique" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, border: 'none', background: FB.btnGray, color: FB.text, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}><span>⚙️</span><span>Classique</span></button>
            <Dropdown menu={getActionMenu(record)} trigger={['click']}>
              <button style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 8px', borderRadius: 6, border: 'none', background: FB.btnGray, color: FB.text, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>⋯</button>
            </Dropdown>
          </div>
        )
      )
    }
  ];

  return (
    <div style={{ background: FB.bg, minHeight: '100vh', width: '100%', padding: isMobile ? '8px' : '20px 24px' }}>
      {/* Header */}
      <div style={{ background: FB.white, borderRadius: FB.radius, boxShadow: FB.shadow, padding: isMobile ? '14px 16px' : '18px 24px', marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: isMobile ? 18 : 24, fontWeight: 700, color: FB.text }}>
            📄 {isMobile ? 'Documents' : 'Gestion des Documents'}
          </div>
          <button
            onClick={() => openModal()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: isMobile ? '8px 14px' : '8px 16px', borderRadius: 6, border: 'none', background: FB.blue, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
          ><span>➕</span><span>{isMobile ? 'Nouveau' : 'Nouveau Template'}</span></button>
        </div>
      </div>

      {/* Content */}
      <div style={{ background: FB.white, borderRadius: FB.radius, boxShadow: FB.shadow, padding: isMobile ? 8 : 16 }}>
        <Tabs defaultActiveKey="templates">
          <TabPane tab="Templates" key="templates">
            <Table scroll={{ x: "max-content" }}               dataSource={templates}
              columns={columns}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10, responsive: true, size: isMobile ? 'small' : 'default' }}
              size="small"
            />
          </TabPane>
          
          <TabPane tab="Thèmes Visuels" key="themes">
            <button
              onClick={() => setThemeModalVisible(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 6, border: 'none', background: FB.blue, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600, marginBottom: 16 }}
            ><span>➕</span><span>Nouveau Thème</span></button>
            
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
              {themes.map(theme => (
                <div key={theme.id} style={{ background: FB.bg, borderRadius: FB.radius, padding: 16, border: `1px solid ${FB.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontWeight: 600, color: FB.text }}>{theme.name}</span>
                    {theme.isDefault && <Tag color="gold">Par défaut</Tag>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 6, backgroundColor: theme.primaryColor }} />
                      <span style={{ fontSize: 13, color: FB.textSecondary }}>Couleur principale</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 6, backgroundColor: theme.secondaryColor }} />
                      <span style={{ fontSize: 13, color: FB.textSecondary }}>Couleur secondaire</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabPane>
        </Tabs>
      </div>

      {/* Modal Confirmation Suppression */}
      <Modal
        title="Supprimer ce template ?"
        open={!!deleteConfirm}
        onCancel={() => setDeleteConfirm(null)}
        onOk={() => deleteConfirm && handleDeleteTemplate(deleteConfirm.id)}
        okText={t('common.delete')}
        cancelText={t('common.cancel')}
        okButtonProps={{ danger: true, loading: deleting }}
        centered
      >
        <p>
          Voulez-vous supprimer le template <strong>{deleteConfirm?.name}</strong> ?
        </p>
        {(deleteConfirm?.docsCount ?? 0) > 0 && (
          <p style={{ color: '#ff4d4f' }}>
            ⚠️ {deleteConfirm?.docsCount} document(s) généré(s) seront aussi supprimés.
          </p>
        )}
        <p>Cette action est irréversible.</p>
      </Modal>

      {/* Modal Template */}
      <Modal
        title={editingTemplate ? 'Éditer le Template' : 'Nouveau Template'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width="95vw"
        style={{ maxWidth: 700 }}
        centered
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
              onChange={(value) => {
                if (value) {
                  loadProductOptions(value);
                } else {
                  setProductOptions([]);
                  form.setFieldValue('productValue', null);
                }
              }}
            >
              {trees.map(tree => (
                <Select.Option key={tree.id} value={tree.id}>
                  🌳 {tree.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="isDefault"
            label="📌 Document par défaut"
            tooltip="Les documents par défaut (page d'entrée, conditions générales, etc.) sont toujours proposés lors de la génération du PDF, indépendamment des produits sélectionnés."
          >
            <Select placeholder={t('common.select')}>
              <Select.Option value={true}>✅ Oui — Document indépendant (page d'entrée, conditions, etc.)</Select.Option>
              <Select.Option value={false}>❌ Non</Select.Option>
            </Select>
          </Form.Item>

          {productOptions.length > 0 && (
            <Form.Item
              name="productValue"
              label="🏷️ Lié à un produit"
              tooltip="Si ce template est spécifique à un produit (ex: template PV, template ISO), sélectionnez le produit. Laissez vide pour un document générique."
            >
              <Select 
                placeholder="Aucun produit (document générique)"
                allowClear
              >
                {productOptions.map(opt => (
                  <Select.Option key={opt.value} value={opt.value}>
                    <Tag color={opt.color || '#722ed1'} style={{ marginRight: 4 }}>{opt.label}</Tag>
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Form.Item
            name="description"
            label={t('fields.description')}
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
            label={t('fields.status')}
          >
            <Select placeholder={t('common.select')}>
              <Select.Option value={true}>✅ Actif</Select.Option>
              <Select.Option value={false}>❌ Inactif</Select.Option>
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
        styles={{ body: { padding: 0 } }}
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
          setInitialPageBuilderConfig(null);
          loadTemplates();
        }}
        destroyOnClose
        styles={{ body: { padding: 0 } }}
      >
        {editingTemplateId && (
          <PageBuilder
            templateId={editingTemplateId}
            initialConfig={initialPageBuilderConfig}
            onSave={() => {
              loadTemplates();
            }}
            onClose={() => {
              setPageBuilderVisible(false);
              setEditingTemplateId(null);
              setInitialPageBuilderConfig(null);
            }}
          />
        )}
      </Drawer>

      {/* Template Selector Modal (nouveaux documents) */}
      <TemplateSelector
        visible={templateSelectorVisible}
        onClose={() => {
          setTemplateSelectorVisible(false);
          setPendingTemplateId(null);
        }}
        onSelectTemplate={handleSelectPrebuiltTemplate}
      />
    </div>
  );
};

export default DocumentTemplatesPage;
