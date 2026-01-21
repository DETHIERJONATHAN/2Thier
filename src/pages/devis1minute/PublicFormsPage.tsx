import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Modal, 
  Form,
  Input,
  Select,
  Switch,
  Typography,
  Space,
  message,
  Row,
  Col,
  Statistic,
  Tag,
  Badge,
  Drawer,
  Tabs,
  Divider,
  Alert,
  Tooltip,
  CodeBox,
  Copy
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  SettingOutlined,
  BarChartOutlined,
  LinkOutlined,
  FormOutlined,
  CodeOutlined,
  CopyOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  GlobalOutlined,
  UserOutlined,
  CalendarOutlined,
  FileTextOutlined,
  BugOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useAuth } from '../../auth/useAuth';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';

dayjs.locale('fr');

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;

interface PublicForm {
  id: string;
  name: string;
  description?: string;
  category: string;
  slug: string;
  publicUrl: string;
  embedCode: string;
  isActive: boolean;
  collectsRgpdConsent: boolean;
  autoPublishLeads: boolean;
  requiresCommercialTracking?: boolean;
  maxSubmissionsPerDay?: number;
  customCss?: string;
  thankYouMessage: string;
  redirectUrl?: string;
  submissionCount: number;
  conversionRate: number;
  lastSubmission?: string;
  createdAt: string;
  updatedAt: string;
  fields: FormField[];
  campaigns: string[]; // IDs des campagnes associées
}

interface FormField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'number';
  required: boolean;
  placeholder?: string;
  options?: string[]; // Pour select, checkbox, radio
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
  order: number;
}

interface FormSubmission {
  id: string;
  formId: string;
  submittedAt: string;
  ipAddress: string;
  userAgent: string;
  leadId?: string;
  data: Record<string, any>;
  status: 'new' | 'processed' | 'spam' | 'duplicate';
}

interface FormStats {
  totalForms: number;
  activeForms: number;
  totalSubmissions: number;
  todaySubmissions: number;
  conversionRate: number;
  topPerformingForm: string;
}

interface FormBuilderModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (values: any) => void;
  loading: boolean;
  form?: PublicForm;
  isEdit?: boolean;
}

const FormBuilderModal: React.FC<FormBuilderModalProps> = ({ 
  visible, 
  onCancel, 
  onSubmit, 
  loading, 
  form, 
  isEdit = false 
}) => {
  const [antdForm] = Form.useForm();
  const [fields, setFields] = useState<FormField[]>([]);

  useEffect(() => {
    if (visible && form && isEdit) {
      antdForm.setFieldsValue({
        ...form,
        campaigns: form.campaigns || []
      });
      setFields(form.fields || []);
    } else if (visible && !isEdit) {
      antdForm.resetFields();
      setFields([
        {
          id: '1',
          name: 'firstName',
          label: 'Prénom',
          type: 'text',
          required: true,
          order: 1
        },
        {
          id: '2',
          name: 'lastName',
          label: 'Nom',
          type: 'text',
          required: true,
          order: 2
        },
        {
          id: '3',
          name: 'email',
          label: 'Email',
          type: 'email',
          required: true,
          order: 3
        },
        {
          id: '4',
          name: 'phone',
          label: 'Téléphone',
          type: 'phone',
          required: true,
          order: 4
        },
        {
          id: '5',
          name: 'message',
          label: 'Votre demande',
          type: 'textarea',
          required: true,
          order: 5
        }
      ]);
    }
  }, [visible, form, isEdit, antdForm]);

  const handleSubmit = async () => {
    try {
      const values = await antdForm.validateFields();
      const formData = {
        ...values,
        fields,
        slug: values.slug || values.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      };
      onSubmit(formData);
    } catch (error) {
      console.error('Erreur de validation:', error);
    }
  };

  const addField = () => {
    const newField: FormField = {
      id: Date.now().toString(),
      name: `field_${fields.length + 1}`,
      label: 'Nouveau champ',
      type: 'text',
      required: false,
      order: fields.length + 1
    };
    setFields([...fields, newField]);
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    const updatedFields = fields.map((field, i) => 
      i === index ? { ...field, ...updates } : field
    );
    setFields(updatedFields);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  return (
    <Modal
      title={
        <Space>
          {isEdit ? <EditOutlined /> : <PlusOutlined />}
          {isEdit ? 'Modifier le formulaire' : 'Créer un formulaire'}
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      okText={isEdit ? 'Mettre à jour' : 'Créer'}
      cancelText="Annuler"
      width={900}
    >
      <Form form={antdForm} layout="vertical">
        <Tabs defaultActiveKey="1">
          <TabPane tab="Configuration" key="1">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item 
                  name="name" 
                  label="Nom du formulaire" 
                  rules={[{ required: true, message: 'Nom requis' }]}
                >
                  <Input placeholder="Ex: Contact Rénovation" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item 
                  name="category" 
                  label="Catégorie" 
                  rules={[{ required: true, message: 'Catégorie requise' }]}
                >
                  <Select placeholder="Sélectionner une catégorie">
                    <Select.Option value="contact">Contact général</Select.Option>
                    <Select.Option value="devis">Demande de devis</Select.Option>
                    <Select.Option value="renovation">Rénovation</Select.Option>
                    <Select.Option value="construction">Construction</Select.Option>
                    <Select.Option value="plomberie">Plomberie</Select.Option>
                    <Select.Option value="electricite">Électricité</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="description" label="Description">
              <TextArea rows={2} placeholder="Description du formulaire..." />
            </Form.Item>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="slug" label="URL personnalisée">
                  <Input 
                    placeholder="formulaire-contact"
                    addonBefore="devis1minute.be/form/"
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="maxSubmissionsPerDay" label="Limite/jour">
                  <Input type="number" placeholder="100" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="campaigns" label="Campagnes associées">
                  <Select mode="multiple" placeholder="Sélectionner">
                    {/* Options dynamiques depuis l'API */}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={6}>
                <Form.Item name="isActive" label="Actif" valuePropName="checked">
                  <Switch checkedChildren="Oui" unCheckedChildren="Non" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="collectsRgpdConsent" label="Consentement RGPD" valuePropName="checked">
                  <Switch checkedChildren="Oui" unCheckedChildren="Non" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="autoPublishLeads" label="Publication auto" valuePropName="checked">
                  <Switch checkedChildren="Oui" unCheckedChildren="Non" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item 
                  name="requiresCommercialTracking" 
                  label="Formulaire nominatif" 
                  valuePropName="checked"
                  tooltip="Chaque commercial pourra générer son propre lien de tracking. Les leads seront automatiquement attribués au commercial qui a partagé le lien."
                >
                  <Switch checkedChildren="Oui" unCheckedChildren="Non" />
                </Form.Item>
              </Col>
            </Row>
          </TabPane>

          <TabPane tab="Champs" key="2">
            <div className="mb-4">
              <Button icon={<PlusOutlined />} onClick={addField}>
                Ajouter un champ
              </Button>
            </div>

            {fields.map((field, index) => (
              <Card key={field.id} size="small" className="mb-4">
                <Row gutter={16}>
                  <Col span={6}>
                    <Input
                      value={field.label}
                      onChange={(e) => updateField(index, { label: e.target.value })}
                      placeholder="Libellé du champ"
                    />
                  </Col>
                  <Col span={4}>
                    <Input
                      value={field.name}
                      onChange={(e) => updateField(index, { name: e.target.value })}
                      placeholder="Nom technique"
                    />
                  </Col>
                  <Col span={4}>
                    <Select
                      value={field.type}
                      onChange={(value) => updateField(index, { type: value })}
                      style={{ width: '100%' }}
                    >
                      <Select.Option value="text">Texte</Select.Option>
                      <Select.Option value="email">Email</Select.Option>
                      <Select.Option value="phone">Téléphone</Select.Option>
                      <Select.Option value="textarea">Zone de texte</Select.Option>
                      <Select.Option value="number">Nombre</Select.Option>
                      <Select.Option value="select">Liste déroulante</Select.Option>
                    </Select>
                  </Col>
                  <Col span={6}>
                    <Input
                      value={field.placeholder}
                      onChange={(e) => updateField(index, { placeholder: e.target.value })}
                      placeholder="Texte d'aide"
                    />
                  </Col>
                  <Col span={2}>
                    <Switch
                      checked={field.required}
                      onChange={(checked) => updateField(index, { required: checked })}
                      title="Obligatoire"
                    />
                  </Col>
                  <Col span={2}>
                    <Button
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => removeField(index)}
                      title="Supprimer"
                    />
                  </Col>
                </Row>
              </Card>
            ))}
          </TabPane>

          <TabPane tab="Messages" key="3">
            <Form.Item name="thankYouMessage" label="Message de remerciement">
              <TextArea 
                rows={3}
                placeholder="Merci pour votre demande ! Nous vous recontacterons sous 24h."
              />
            </Form.Item>

            <Form.Item name="redirectUrl" label="URL de redirection (optionnel)">
              <Input 
                placeholder="https://votre-site.com/merci"
                prefix={<LinkOutlined />}
              />
            </Form.Item>

            <Form.Item name="customCss" label="CSS personnalisé">
              <TextArea 
                rows={4}
                placeholder="/* Votre CSS personnalisé */&#10;.form-container { background: #f5f5f5; }"
              />
            </Form.Item>
          </TabPane>
        </Tabs>
      </Form>
    </Modal>
  );
};

export default function PublicFormsPage() {
  const { api } = useAuthenticatedApi();
  const { user } = useAuth();
  
  const [forms, setForms] = useState<PublicForm[]>([]);
  const [stats, setStats] = useState<FormStats>({
    totalForms: 0,
    activeForms: 0,
    totalSubmissions: 0,
    todaySubmissions: 0,
    conversionRate: 0,
    topPerformingForm: ''
  });
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [selectedForm, setSelectedForm] = useState<PublicForm | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [submissionsDrawerVisible, setSubmissionsDrawerVisible] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [trackingLinkModalVisible, setTrackingLinkModalVisible] = useState(false);

  // Chargement des données
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [formsData, statsData] = await Promise.all([
        api.get<PublicForm[]>('/api/public-forms'),
        api.get<FormStats>('/api/public-forms/stats')
      ]);
      setForms(formsData);
      setStats(statsData);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      message.error('Impossible de charger les formulaires');
    } finally {
      setLoading(false);
    }
  }, [api]);

  const loadSubmissions = useCallback(async (formId: string) => {
    try {
      const submissionsData = await api.get<FormSubmission[]>(`/api/public-forms/${formId}/submissions`);
      setSubmissions(submissionsData);
    } catch (error) {
      console.error('Erreur lors du chargement des soumissions:', error);
      message.error('Impossible de charger les soumissions');
    }
  }, [api]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateForm = async (values: any) => {
    setFormLoading(true);
    try {
      await api.post('/api/public-forms', values);
      message.success('Formulaire créé avec succès !');
      setFormModalVisible(false);
      loadData();
    } catch (error: unknown) {
      console.error('Erreur lors de la création:', error);
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as any).response?.data?.message 
        : 'Erreur lors de la création du formulaire';
      message.error(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateForm = async (values: any) => {
    if (!selectedForm) return;
    
    setFormLoading(true);
    try {
      await api.put(`/api/public-forms/${selectedForm.id}`, values);
      message.success('Formulaire mis à jour avec succès !');
      setFormModalVisible(false);
      setSelectedForm(null);
      setIsEditMode(false);
      loadData();
    } catch (error: unknown) {
      console.error('Erreur lors de la mise à jour:', error);
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as any).response?.data?.message 
        : 'Erreur lors de la mise à jour du formulaire';
      message.error(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleForm = async (form: PublicForm) => {
    try {
      await api.patch(`/api/public-forms/${form.id}/toggle`, { isActive: !form.isActive });
      message.success(`Formulaire ${!form.isActive ? 'activé' : 'désactivé'} !`);
      loadData();
    } catch (error) {
      console.error('Erreur lors du basculement:', error);
      message.error('Erreur lors du changement de statut');
    }
  };

  const handleDeleteForm = async (formId: string) => {
    try {
      await api.delete(`/api/public-forms/${formId}`);
      message.success('Formulaire supprimé avec succès !');
      loadData();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      message.error('Erreur lors de la suppression');
    }
  };

  const handleCopyEmbedCode = (embedCode: string) => {
    navigator.clipboard.writeText(embedCode);
    message.success('Code d\'intégration copié !');
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    message.success('URL copiée !');
  };

  const openSubmissions = (form: PublicForm) => {
    setSelectedForm(form);
    loadSubmissions(form.id);
    setSubmissionsDrawerVisible(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new': return <ExclamationCircleOutlined />;
      case 'processed': return <CheckCircleOutlined />;
      case 'spam': return <BugOutlined />;
      case 'duplicate': return <CopyOutlined />;
      default: return <FileTextOutlined />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'blue';
      case 'processed': return 'green';
      case 'spam': return 'red';
      case 'duplicate': return 'orange';
      default: return 'default';
    }
  };

  const columns = [
    {
      title: 'Formulaire',
      key: 'form',
      width: 250,
      render: (_: unknown, record: PublicForm) => (
        <div>
          <div className="font-semibold flex items-center gap-2">
            {record.name}
            {record.isActive ? (
              <Badge status="success" text="Actif" />
            ) : (
              <Badge status="error" text="Inactif" />
            )}
          </div>
          <Text type="secondary" className="text-xs">
            {record.category} • {record.submissionCount} soumissions
          </Text>
          <div className="mt-1">
            <Text type="secondary" className="text-xs">
              Créé {dayjs(record.createdAt).fromNow()}
            </Text>
          </div>
        </div>
      )
    },
    {
      title: 'URL',
      key: 'url',
      width: 200,
      render: (_: unknown, record: PublicForm) => (
        <div>
          <div className="flex items-center gap-2">
            <Text code className="text-xs">{record.publicUrl}</Text>
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleCopyUrl(record.publicUrl)}
              title="Copier l'URL"
            />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Button
              size="small"
              icon={<GlobalOutlined />}
              onClick={() => window.open(record.publicUrl, '_blank')}
              title="Ouvrir dans un nouvel onglet"
            >
              Voir
            </Button>
          </div>
        </div>
      )
    },
    {
      title: 'Performance',
      key: 'performance',
      width: 120,
      render: (_: unknown, record: PublicForm) => (
        <div>
          <Statistic
            title="Soumissions"
            value={record.submissionCount}
            valueStyle={{ fontSize: '16px', color: '#1890ff' }}
          />
          <Text className="text-xs">
            Conversion: {record.conversionRate.toFixed(1)}%
          </Text>
        </div>
      )
    },
    {
      title: 'Dernière soumission',
      dataIndex: 'lastSubmission',
      key: 'lastSubmission',
      width: 150,
      render: (date: string) => (
        date ? (
          <div>
            <Text className="text-xs">
              {dayjs(date).format('DD/MM/YYYY')}
            </Text>
            <br />
            <Text type="secondary" className="text-xs">
              {dayjs(date).fromNow()}
            </Text>
          </div>
        ) : (
          <Text type="secondary" className="text-xs">Aucune</Text>
        )
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 250,
      render: (_: unknown, record: PublicForm) => (
        <Space>
          <Tooltip title="Voir les soumissions">
            <Button
              size="small"
              icon={<BarChartOutlined />}
              onClick={() => openSubmissions(record)}
            />
          </Tooltip>
          <Tooltip title="Modifier">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setSelectedForm(record);
                setIsEditMode(true);
                setFormModalVisible(true);
              }}
            />
          </Tooltip>
          {record.requiresCommercialTracking && (
            <Tooltip title="Générer un lien commercial">
              <Button
                size="small"
                type="primary"
                icon={<UserOutlined />}
                onClick={() => {
                  setSelectedForm(record);
                  setTrackingLinkModalVisible(true);
                }}
              />
            </Tooltip>
          )}
          <Tooltip title="Code d'intégration">
            <Button
              size="small"
              icon={<CodeOutlined />}
              onClick={() => handleCopyEmbedCode(record.embedCode)}
            />
          </Tooltip>
          <Tooltip title={record.isActive ? 'Désactiver' : 'Activer'}>
            <Button
              size="small"
              type={record.isActive ? 'default' : 'primary'}
              icon={record.isActive ? <CloseCircleOutlined /> : <CheckCircleOutlined />}
              onClick={() => handleToggleForm(record)}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  const submissionColumns = [
    {
      title: 'Date',
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      width: 120,
      render: (date: string) => (
        <div>
          <Text className="text-xs">
            {dayjs(date).format('DD/MM HH:mm')}
          </Text>
        </div>
      )
    },
    {
      title: 'Contact',
      key: 'contact',
      width: 200,
      render: (_: unknown, record: FormSubmission) => (
        <div>
          <Text strong>
            {record.data.firstName} {record.data.lastName}
          </Text>
          <br />
          <Text type="secondary" className="text-xs">
            {record.data.email}
          </Text>
          {record.data.phone && (
            <>
              <br />
              <Text type="secondary" className="text-xs">
                {record.data.phone}
              </Text>
            </>
          )}
        </div>
      )
    },
    {
      title: 'Message',
      dataIndex: 'data',
      key: 'message',
      width: 250,
      render: (data: any) => (
        <Text className="text-xs" ellipsis>
          {data.message || data.description || 'Pas de message'}
        </Text>
      )
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
          {status === 'new' ? 'Nouveau' :
           status === 'processed' ? 'Traité' :
           status === 'spam' ? 'Spam' :
           status === 'duplicate' ? 'Doublon' : status}
        </Tag>
      )
    },
    {
      title: 'Lead',
      dataIndex: 'leadId',
      key: 'leadId',
      width: 100,
      render: (leadId: string) => (
        leadId ? (
          <Badge status="success" text="Créé" />
        ) : (
          <Badge status="default" text="Aucun" />
        )
      )
    }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <Title level={2} className="mb-0">
              <FormOutlined className="mr-2" />
              Formulaires publics
            </Title>
            <Text type="secondary">
              Gérez vos formulaires de capture de leads
            </Text>
          </div>
          <Button 
            type="primary" 
            size="large"
            icon={<PlusOutlined />}
            onClick={() => {
              setSelectedForm(null);
              setIsEditMode(false);
              setFormModalVisible(true);
            }}
          >
            Nouveau formulaire
          </Button>
        </div>

        {/* Statistiques */}
        <Row gutter={16} className="mb-6">
          <Col span={6}>
            <Card>
              <Statistic
                title="Formulaires totaux"
                value={stats.totalForms}
                prefix={<FormOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Formulaires actifs"
                value={stats.activeForms}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Soumissions totales"
                value={stats.totalSubmissions}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Aujourd'hui"
                value={stats.todaySubmissions}
                prefix={<CalendarOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      {/* Aide pour débuter */}
      {forms.length === 0 && !loading && (
        <Alert
          message="Créez votre premier formulaire !"
          description="Les formulaires publics vous permettent de capturer des leads directement depuis votre site web ou vos campagnes marketing."
          type="info"
          showIcon
          action={
            <Button
              size="small"
              type="primary"
              onClick={() => setFormModalVisible(true)}
            >
              Commencer
            </Button>
          }
          className="mb-6"
        />
      )}

      {/* Tableau des formulaires */}
      <Card>
        <Table
          columns={columns}
          dataSource={forms}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `${total} formulaires au total`
          }}
          scroll={{ x: 1000 }}
          size="middle"
        />
      </Card>

      {/* Modal de création/modification */}
      <FormBuilderModal
        visible={formModalVisible}
        onCancel={() => {
          setFormModalVisible(false);
          setSelectedForm(null);
          setIsEditMode(false);
        }}
        onSubmit={isEditMode ? handleUpdateForm : handleCreateForm}
        loading={formLoading}
        form={selectedForm || undefined}
        isEdit={isEditMode}
      />

      {/* Modal de génération de lien de tracking */}
      <Modal
        title={
          <Space>
            <UserOutlined />
            Générer un lien de tracking commercial
          </Space>
        }
        open={trackingLinkModalVisible}
        onCancel={() => {
          setTrackingLinkModalVisible(false);
          setSelectedForm(null);
        }}
        footer={null}
        width={700}
      >
        {selectedForm && user && (
          <div className="space-y-4">
            <Alert
              message="Lien personnalisé pour le suivi commercial"
              description={`Ce lien unique permet de tracker tous les leads générés par ${user.firstName} ${user.lastName}. Les soumissions seront automatiquement attribuées dans le CRM.`}
              type="info"
              showIcon
            />
            
            <div className="p-4 bg-gray-50 rounded">
              <Text strong className="block mb-2">Votre lien personnalisé :</Text>
              <div className="flex items-center gap-2">
                <Input
                  value={`${window.location.origin}/form/${selectedForm.slug}?ref=${user.id}`}
                  readOnly
                  className="flex-1"
                />
                <Button
                  type="primary"
                  icon={<CopyOutlined />}
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/form/${selectedForm.slug}?ref=${user.id}`);
                    message.success('Lien copié ! Vous pouvez maintenant le partager avec vos prospects.');
                  }}
                >
                  Copier
                </Button>
              </div>
            </div>

            <Divider />

            <div className="space-y-2">
              <Text strong>Comment ça fonctionne ?</Text>
              <ul className="list-disc pl-6 space-y-1">
                <li>Partagez ce lien avec vos prospects (email, réseaux sociaux, WhatsApp, etc.)</li>
                <li>Chaque personne qui remplit le formulaire via ce lien sera automatiquement identifiée comme votre lead</li>
                <li>Le lead apparaîtra dans votre CRM avec votre nom comme source</li>
                <li>Suivez vos performances et vos conversions en temps réel</li>
              </ul>
            </div>

            <Alert
              message="💡 Astuce"
              description="Utilisez un raccourcisseur de lien (bit.ly, tinyurl.com) pour rendre votre lien plus facile à partager sur les réseaux sociaux !"
              type="success"
              showIcon
            />
          </div>
        )}
      </Modal>

      {/* Drawer des soumissions */}
      <Drawer
        title={
          <Space>
            <BarChartOutlined />
            Soumissions: {selectedForm?.name}
          </Space>
        }
        width={800}
        open={submissionsDrawerVisible}
        onClose={() => {
          setSubmissionsDrawerVisible(false);
          setSelectedForm(null);
          setSubmissions([]);
        }}
      >
        {selectedForm && (
          <div className="space-y-4">
            <Row gutter={16}>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="Total soumissions"
                    value={selectedForm.submissionCount}
                    valueStyle={{ fontSize: '20px' }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="Taux conversion"
                    value={selectedForm.conversionRate}
                    suffix="%"
                    precision={1}
                    valueStyle={{ fontSize: '20px' }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="Dernière soumission"
                    value={selectedForm.lastSubmission ? dayjs(selectedForm.lastSubmission).fromNow() : 'Aucune'}
                    valueStyle={{ fontSize: '14px' }}
                  />
                </Card>
              </Col>
            </Row>

            <Table
              columns={submissionColumns}
              dataSource={submissions}
              rowKey="id"
              pagination={{
                pageSize: 50,
                showSizeChanger: false
              }}
              size="small"
            />
          </div>
        )}
      </Drawer>
    </div>
  );
}
