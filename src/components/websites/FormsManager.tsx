/**
 * 📋 FORMS MANAGER - Gestion des Formulaires Style Effy
 * 
 * Permet de créer et gérer des formulaires multi-step
 * pour capturer des leads via les sites vitrines.
 * 
 * FLUX :
 * 1. Liste des formulaires liés au site
 * 2. Création/édition de formulaires
 * 3. Gestion des étapes et champs (mode classique)
 * 4. Gestion des questions (mode simulateur 1 écran = 1 question)
 * 5. Liaison avec les noeuds TBL pour mapping automatique
 * 
 * @module FormsManager
 * @author IA Assistant - Module Formulaires
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  message,
  Empty,
  Tooltip,
  Popconfirm,
  Typography,
  Row,
  Col,
  Divider,
  Badge,
  InputNumber
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CopyOutlined,
  LinkOutlined,
  FormOutlined,
  OrderedListOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  QuestionCircleOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import QuestionsManagerModal from './QuestionsManager';
import type { ColumnsType } from 'antd/es/table';

const { Title: _Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// ==================== TYPES ====================
interface TBLTree {
  id: string;
  name: string;
  description?: string;
}

interface WebsiteForm {
  id: number;
  organizationId: number;
  name: string;
  slug: string;
  description?: string;
  submitButtonText: string;
  successMessage: string;
  isActive: boolean;
  startQuestionKey?: string;
  treeId?: string; // ID de l'arbre TBL pour le mapping des champs
  settings?: {
    phoneNumber?: string;
    primaryColor?: string;
    logo?: string;
  };
  createdAt: string;
  updatedAt: string;
  _count?: {
    steps: number;
    questions: number;
    submissions: number;
  };
  websites?: Array<{
    website: {
      id: number;
      siteName: string;
    };
  }>;
}

interface FormStep {
  id: number;
  formId: number;
  stepOrder: number;
  title: string;
  description?: string;
  icon?: string;
  fields?: FormField[];
}

interface FormField {
  id: number;
  stepId: number;
  fieldOrder: number;
  label: string;
  fieldType: string;
  name: string;
  placeholder?: string;
  helpText?: string;
  isRequired: boolean;
  defaultValue?: string;
  options?: any;
  tblNodeId?: number;
  tblNodePath?: string;
  validationRules?: any;
}

interface FormsManagerProps {
  websiteId: number;
}

// ==================== COMPOSANT PRINCIPAL ====================
const FormsManager: React.FC<FormsManagerProps> = ({ websiteId }) => {
  // API authentifiée (stabilisée)
  const apiHook = useAuthenticatedApi();
  const api = useMemo(() => apiHook.api, [apiHook]);

  // États
  const [forms, setForms] = useState<WebsiteForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [editingForm, setEditingForm] = useState<WebsiteForm | null>(null);
  const [stepsModalVisible, setStepsModalVisible] = useState(false);
  const [questionsModalVisible, setQuestionsModalVisible] = useState(false);
  const [selectedForm, setSelectedForm] = useState<WebsiteForm | null>(null);
  const [tblTrees, setTblTrees] = useState<TBLTree[]>([]);

  const [form] = Form.useForm();

  // ==================== CHARGEMENT DES DONNÉES ====================
  // Charger les arbres TBL disponibles
  const fetchTblTrees = useCallback(async () => {
    try {
      const trees = await api.get('/api/treebranchleaf/trees');
      setTblTrees(trees || []);
    } catch (err) {
      console.error('Erreur chargement arbres TBL:', err);
      setTblTrees([]);
    }
  }, [api]);

  const fetchForms = useCallback(async () => {
    setLoading(true);
    try {
      // Récupérer les formulaires liés à ce site
      const response = await api.get(`/api/website-forms/by-website/${websiteId}`);
      setForms(response || []);
    } catch (err) {
      console.error('Erreur chargement formulaires:', err);
      // Si pas de formulaires liés, on affiche une liste vide
      setForms([]);
    } finally {
      setLoading(false);
    }
  }, [api, websiteId]);

  useEffect(() => {
    fetchForms();
    fetchTblTrees();
  }, [fetchForms, fetchTblTrees]);

  // ==================== HANDLERS ====================
  const handleCreateForm = () => {
    setEditingForm(null);
    form.resetFields();
    form.setFieldsValue({
      submitButtonText: 'Obtenir mon devis',
      successMessage: 'Merci ! Nous vous recontactons sous 24h.',
      isActive: true
    });
    setFormModalVisible(true);
  };

  const handleEditForm = (record: WebsiteForm) => {
    setEditingForm(record);
    // Extraire le phoneNumber depuis les settings (JSON)
    const settings = typeof record.settings === 'string' 
      ? JSON.parse(record.settings) 
      : (record.settings || {});
    
    form.setFieldsValue({
      name: record.name,
      slug: record.slug,
      description: record.description,
      submitButtonText: record.submitButtonText,
      successMessage: record.successMessage,
      isActive: record.isActive,
      phoneNumber: settings.phoneNumber || '',
      treeId: record.treeId || null
    });
    setFormModalVisible(true);
  };

  const handleDeleteForm = async (formId: number) => {
    try {
      await api.delete(`/api/website-forms/${formId}`);
      message.success('Formulaire supprimé');
      fetchForms();
    } catch {
      message.error('Erreur lors de la suppression');
    }
  };

  const handleSaveForm = async (values: any) => {
    try {
      // Extraire le phoneNumber et treeId
      const { phoneNumber, treeId, ...formValues } = values;
      
      // Préparer les settings en préservant les valeurs existantes
      const existingSettings = editingForm?.settings 
        ? (typeof editingForm.settings === 'string' 
            ? JSON.parse(editingForm.settings) 
            : editingForm.settings)
        : {};
      
      const dataToSave = {
        ...formValues,
        treeId: treeId || null, // Sauvegarder le treeId pour le mapping TBL
        settings: {
          ...existingSettings,
          phoneNumber: phoneNumber || null
        }
      };

      if (editingForm) {
        // Mise à jour
        await api.put(`/api/website-forms/${editingForm.id}`, dataToSave);
        message.success('Formulaire mis à jour');
      } else {
        // Création + liaison au site
        const newForm = await api.post('/api/website-forms', dataToSave);
        // Lier au site actuel
        await api.post(`/api/website-forms/${newForm.id}/link-website`, {
          websiteId
        });
        message.success('Formulaire créé et lié au site');
      }
      setFormModalVisible(false);
      fetchForms();
    } catch (err: any) {
      if (err.response?.data?.error?.includes('slug')) {
        message.error('Ce slug est déjà utilisé');
      } else {
        message.error('Erreur lors de la sauvegarde');
      }
    }
  };

  const handleManageSteps = (record: WebsiteForm) => {
    setSelectedForm(record);
    setStepsModalVisible(true);
  };

  const handleManageQuestions = (record: WebsiteForm) => {
    setSelectedForm(record);
    setQuestionsModalVisible(true);
  };

  const handleToggleActive = async (record: WebsiteForm) => {
    try {
      await api.put(`/api/website-forms/${record.id}`, {
        isActive: !record.isActive
      });
      message.success(record.isActive ? 'Formulaire désactivé' : 'Formulaire activé');
      fetchForms();
    } catch {
      message.error('Erreur lors du changement de statut');
    }
  };

  const handleCopySlug = (slug: string) => {
    const formUrl = `${window.location.origin}/form/${slug}`;
    navigator.clipboard.writeText(formUrl);
    message.success('URL copiée !');
  };

  // ==================== COLONNES DU TABLEAU ====================
  const columns: ColumnsType<WebsiteForm> = [
    {
      title: 'Nom',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: WebsiteForm) => (
        <Space>
          <FormOutlined style={{ color: '#1890ff' }} />
          <span style={{ fontWeight: 500 }}>{name}</span>
          {!record.isActive && (
            <Tag color="default">Inactif</Tag>
          )}
        </Space>
      )
    },
    {
      title: 'Slug',
      dataIndex: 'slug',
      key: 'slug',
      render: (slug: string) => (
        <Space>
          <Tag color="blue">/form/{slug}</Tag>
          <Tooltip title="Copier l'URL">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleCopySlug(slug)}
            />
          </Tooltip>
        </Space>
      )
    },
    {
      title: 'Contenu',
      key: 'content',
      width: 150,
      align: 'center',
      render: (_: any, record: WebsiteForm) => {
        const steps = record._count?.steps || 0;
        const questions = record._count?.questions || 0;
        return (
          <Space direction="vertical" size={0}>
            {questions > 0 && (
              <Tag color="purple">{questions} questions</Tag>
            )}
            {steps > 0 && (
              <Tag color="green">{steps} étapes</Tag>
            )}
            {questions === 0 && steps === 0 && (
              <Text type="secondary">Vide</Text>
            )}
          </Space>
        );
      }
    },
    {
      title: 'Soumissions',
      dataIndex: '_count',
      key: 'submissions',
      width: 120,
      align: 'center',
      render: (count: any) => (
        <Badge count={count?.submissions || 0} showZero style={{ backgroundColor: '#1890ff' }} />
      )
    },
    {
      title: 'Statut',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      align: 'center',
      render: (isActive: boolean, record: WebsiteForm) => (
        <Switch
          checked={isActive}
          onChange={() => handleToggleActive(record)}
          checkedChildren={<CheckCircleOutlined />}
          unCheckedChildren={<CloseCircleOutlined />}
        />
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 280,
      render: (_, record: WebsiteForm) => (
        <Space wrap>
          <Tooltip title="Questions (mode simulateur 1 écran = 1 question)">
            <Button
              type="primary"
              size="small"
              icon={<QuestionCircleOutlined />}
              onClick={() => handleManageQuestions(record)}
              style={{ backgroundColor: '#722ed1' }}
            >
              Questions
            </Button>
          </Tooltip>
          <Tooltip title="Étapes (mode classique multi-champs)">
            <Button
              size="small"
              icon={<OrderedListOutlined />}
              onClick={() => handleManageSteps(record)}
            >
              Étapes
            </Button>
          </Tooltip>
          <Tooltip title="Modifier">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditForm(record)}
            />
          </Tooltip>
          <Tooltip title="Prévisualiser">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => window.open(`/simulateur/${record.slug}`, '_blank')}
            />
          </Tooltip>
          <Popconfirm
            title="Supprimer ce formulaire ?"
            description="Cette action est irréversible"
            onConfirm={() => handleDeleteForm(record.id)}
            okText="Supprimer"
            cancelText="Annuler"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Supprimer">
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  // ==================== RENDU ====================
  return (
    <div style={{ padding: '16px' }}>
      <Card
        title={
          <Space>
            <FormOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
            <span>Formulaires de capture</span>
            <Tag color="purple">Style Effy</Tag>
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateForm}
          >
            Nouveau formulaire
          </Button>
        }
      >
        <Paragraph type="secondary" style={{ marginBottom: '16px' }}>
          Créez des formulaires multi-étapes pour capturer des leads qualifiés.
          Chaque formulaire peut être personnalisé avec des étapes, des champs et des liens vers le système de devis.
        </Paragraph>

        <Table
          columns={columns}
          dataSource={forms}
          rowKey="id"
          loading={loading}
          pagination={false}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Aucun formulaire lié à ce site"
              >
                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateForm}>
                  Créer un formulaire
                </Button>
              </Empty>
            )
          }}
        />
      </Card>

      {/* Modal création/édition formulaire */}
      <Modal
        title={editingForm ? '✏️ Modifier le formulaire' : '➕ Nouveau formulaire'}
        open={formModalVisible}
        onCancel={() => setFormModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveForm}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Nom du formulaire"
                rules={[{ required: true, message: 'Nom requis' }]}
              >
                <Input placeholder="Ex: Devis Pompe à chaleur" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="slug"
                label="Slug (URL)"
                rules={[
                  { required: true, message: 'Slug requis' },
                  { pattern: /^[a-z0-9-]+$/, message: 'Minuscules, chiffres et tirets uniquement' }
                ]}
              >
                <Input placeholder="Ex: devis-pac" prefix="/form/" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Description (optionnelle)"
          >
            <TextArea rows={2} placeholder="Description interne du formulaire" />
          </Form.Item>

          <Divider />

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="submitButtonText"
                label="Texte du bouton de soumission"
                rules={[{ required: true }]}
              >
                <Input placeholder="Ex: Obtenir mon devis gratuit" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="isActive"
                label="Actif"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="successMessage"
            label="Message de succès"
            rules={[{ required: true }]}
          >
            <TextArea rows={2} placeholder="Message affiché après soumission" />
          </Form.Item>

          <Divider orientation="left">📱 Paramètres du simulateur</Divider>
          
          <Form.Item
            name="phoneNumber"
            label="Numéro de téléphone (bouton vert)"
            tooltip="Ce numéro sera affiché dans le bouton téléphone vert en haut du simulateur"
            extra="Format recommandé: 04 XX XX XX XX"
          >
            <Input 
              placeholder="Ex: 04 56 78 90 12" 
              maxLength={20}
              style={{ maxWidth: 300 }}
            />
          </Form.Item>

          <Divider orientation="left">🌳 Mapping TBL (Devis)</Divider>
          
          <Form.Item
            name="treeId"
            label="Arbre TBL pour le mapping"
            tooltip="Sélectionnez l'arbre TBL (ex: Devis Simulation) pour pouvoir lier les options de réponse aux champs TBL. Quand un lead est créé, les données seront pré-remplies dans le devis."
            extra="Permet de pré-remplir automatiquement les champs du devis avec les réponses du formulaire"
          >
            <Select
              placeholder="Sélectionner un arbre TBL"
              allowClear
              showSearch
              optionFilterProp="children"
              style={{ maxWidth: 400 }}
            >
              {tblTrees.map(tree => (
                <Select.Option key={tree.id} value={tree.id}>
                  🌳 {tree.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <div style={{ textAlign: 'right', marginTop: '16px' }}>
            <Space>
              <Button onClick={() => setFormModalVisible(false)}>
                Annuler
              </Button>
              <Button type="primary" htmlType="submit">
                {editingForm ? 'Mettre à jour' : 'Créer'}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Modal gestion des étapes (mode classique) */}
      <StepsManagerModal
        visible={stepsModalVisible}
        onClose={() => setStepsModalVisible(false)}
        form={selectedForm}
        api={api}
        onUpdate={fetchForms}
      />

      {/* Modal gestion des questions (mode simulateur) */}
      <QuestionsManagerModal
        visible={questionsModalVisible}
        onClose={() => setQuestionsModalVisible(false)}
        form={selectedForm}
        api={api}
        onUpdate={fetchForms}
      />
    </div>
  );
};

// ==================== SOUS-COMPOSANT: GESTION DES ÉTAPES ====================
interface StepsManagerModalProps {
  visible: boolean;
  onClose: () => void;
  form: WebsiteForm | null;
  api: any;
  onUpdate: () => void;
}

const StepsManagerModal: React.FC<StepsManagerModalProps> = ({
  visible,
  onClose,
  form: websiteForm,
  api,
  onUpdate
}) => {
  const [steps, setSteps] = useState<FormStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [stepModalVisible, setStepModalVisible] = useState(false);
  const [editingStep, setEditingStep] = useState<FormStep | null>(null);
  const [fieldsModalVisible, setFieldsModalVisible] = useState(false);
  const [selectedStep, setSelectedStep] = useState<FormStep | null>(null);

  const [stepForm] = Form.useForm();

  useEffect(() => {
    if (visible && websiteForm) {
      fetchSteps();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, websiteForm]);

  const fetchSteps = async () => {
    if (!websiteForm) return;
    setLoading(true);
    try {
      const response = await api.get(`/api/website-forms/${websiteForm.id}/steps`);
      setSteps(response || []);
    } catch (error) {
      console.error('Erreur chargement étapes:', error);
      setSteps([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStep = () => {
    setEditingStep(null);
    stepForm.resetFields();
    stepForm.setFieldsValue({
      stepOrder: steps.length + 1
    });
    setStepModalVisible(true);
  };

  const handleEditStep = (step: FormStep) => {
    setEditingStep(step);
    stepForm.setFieldsValue({
      title: step.title,
      description: step.description,
      icon: step.icon,
      stepOrder: step.stepOrder
    });
    setStepModalVisible(true);
  };

  const handleSaveStep = async (values: any) => {
    if (!websiteForm) return;
    try {
      if (editingStep) {
        await api.put(`/api/website-forms/steps/${editingStep.id}`, values);
        message.success('Étape mise à jour');
      } else {
        await api.post(`/api/website-forms/${websiteForm.id}/steps`, values);
        message.success('Étape créée');
      }
      setStepModalVisible(false);
      fetchSteps();
      onUpdate();
    } catch {
      message.error('Erreur lors de la sauvegarde');
    }
  };

  const handleDeleteStep = async (stepId: number) => {
    try {
      await api.delete(`/api/website-forms/steps/${stepId}`);
      message.success('Étape supprimée');
      fetchSteps();
      onUpdate();
    } catch {
      message.error('Erreur lors de la suppression');
    }
  };

  const handleManageFields = (step: FormStep) => {
    setSelectedStep(step);
    setFieldsModalVisible(true);
  };

  const stepColumns: ColumnsType<FormStep> = [
    {
      title: '#',
      dataIndex: 'stepOrder',
      key: 'stepOrder',
      width: 60,
      align: 'center',
      render: (order: number) => (
        <Badge count={order} style={{ backgroundColor: '#1890ff' }} />
      )
    },
    {
      title: 'Titre',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: FormStep) => (
        <Space>
          {record.icon && <span>{record.icon}</span>}
          <span style={{ fontWeight: 500 }}>{title}</span>
        </Space>
      )
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (desc: string) => desc || <Text type="secondary">-</Text>
    },
    {
      title: 'Champs',
      key: 'fields',
      width: 100,
      align: 'center',
      render: (_, record: FormStep) => (
        <Badge count={record.fields?.length || 0} showZero style={{ backgroundColor: '#52c41a' }} />
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      render: (_, record: FormStep) => (
        <Space>
          <Tooltip title="Gérer les champs">
            <Button
              type="primary"
              size="small"
              icon={<SettingOutlined />}
              onClick={() => handleManageFields(record)}
            >
              Champs
            </Button>
          </Tooltip>
          <Tooltip title="Modifier">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditStep(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Supprimer cette étape ?"
            onConfirm={() => handleDeleteStep(record.id)}
            okText="Supprimer"
            cancelText="Annuler"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <>
      <Modal
        title={
          <Space>
            <OrderedListOutlined />
            <span>Étapes du formulaire : {websiteForm?.name}</span>
          </Space>
        }
        open={visible}
        onCancel={onClose}
        width={900}
        footer={
          <Button onClick={onClose}>Fermer</Button>
        }
      >
        <div style={{ marginBottom: '16px' }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddStep}
          >
            Ajouter une étape
          </Button>
        </div>

        <Table
          columns={stepColumns}
          dataSource={steps}
          rowKey="id"
          loading={loading}
          pagination={false}
          locale={{
            emptyText: (
              <Empty description="Aucune étape configurée">
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddStep}>
                  Créer la première étape
                </Button>
              </Empty>
            )
          }}
        />
      </Modal>

      {/* Modal ajout/édition étape */}
      <Modal
        title={editingStep ? '✏️ Modifier l\'étape' : '➕ Nouvelle étape'}
        open={stepModalVisible}
        onCancel={() => setStepModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form
          form={stepForm}
          layout="vertical"
          onFinish={handleSaveStep}
        >
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                name="title"
                label="Titre de l'étape"
                rules={[{ required: true, message: 'Titre requis' }]}
              >
                <Input placeholder="Ex: Votre projet" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="stepOrder"
                label="Ordre"
                rules={[{ required: true }]}
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Description (affichée sous le titre)"
          >
            <Input placeholder="Ex: Parlez-nous de votre installation" />
          </Form.Item>

          <Form.Item
            name="icon"
            label="Icône (emoji)"
          >
            <Input placeholder="Ex: 🏠 ou 🔧" maxLength={2} />
          </Form.Item>

          <div style={{ textAlign: 'right', marginTop: '16px' }}>
            <Space>
              <Button onClick={() => setStepModalVisible(false)}>
                Annuler
              </Button>
              <Button type="primary" htmlType="submit">
                {editingStep ? 'Mettre à jour' : 'Créer'}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Modal gestion des champs */}
      <FieldsManagerModal
        visible={fieldsModalVisible}
        onClose={() => setFieldsModalVisible(false)}
        step={selectedStep}
        api={api}
        onUpdate={fetchSteps}
      />
    </>
  );
};

// ==================== SOUS-COMPOSANT: GESTION DES CHAMPS ====================
interface FieldsManagerModalProps {
  visible: boolean;
  onClose: () => void;
  step: FormStep | null;
  api: any;
  onUpdate: () => void;
}

const FieldsManagerModal: React.FC<FieldsManagerModalProps> = ({
  visible,
  onClose,
  step,
  api,
  onUpdate
}) => {
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(false);
  const [fieldModalVisible, setFieldModalVisible] = useState(false);
  const [editingField, setEditingField] = useState<FormField | null>(null);

  const [fieldForm] = Form.useForm();

  useEffect(() => {
    if (visible && step) {
      fetchFields();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, step]);

  const fetchFields = async () => {
    if (!step) return;
    setLoading(true);
    try {
      const response = await api.get(`/api/website-forms/steps/${step.id}/fields`);
      setFields(response || []);
    } catch (error) {
      console.error('Erreur chargement champs:', error);
      setFields([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddField = () => {
    setEditingField(null);
    fieldForm.resetFields();
    fieldForm.setFieldsValue({
      fieldOrder: fields.length + 1,
      isRequired: true,
      fieldType: 'card_select'
    });
    setFieldModalVisible(true);
  };

  const handleEditField = (field: FormField) => {
    setEditingField(field);
    fieldForm.setFieldsValue({
      label: field.label,
      fieldType: field.fieldType,
      name: field.name,
      placeholder: field.placeholder,
      helpText: field.helpText,
      isRequired: field.isRequired,
      defaultValue: field.defaultValue,
      options: field.options ? JSON.stringify(field.options, null, 2) : '',
      tblNodeId: field.tblNodeId,
      tblNodePath: field.tblNodePath,
      fieldOrder: field.fieldOrder
    });
    setFieldModalVisible(true);
  };

  const handleSaveField = async (values: any) => {
    if (!step) return;
    try {
      // Parser les options si c'est une chaîne JSON
      let parsedOptions = null;
      if (values.options) {
        try {
          parsedOptions = JSON.parse(values.options);
        } catch {
          message.error('Format JSON invalide pour les options');
          return;
        }
      }

      const payload = {
        ...values,
        options: parsedOptions
      };

      if (editingField) {
        await api.put(`/api/website-forms/fields/${editingField.id}`, payload);
        message.success('Champ mis à jour');
      } else {
        await api.post(`/api/website-forms/steps/${step.id}/fields`, payload);
        message.success('Champ créé');
      }
      setFieldModalVisible(false);
      fetchFields();
      onUpdate();
    } catch {
      message.error('Erreur lors de la sauvegarde');
    }
  };

  const handleDeleteField = async (fieldId: number) => {
    try {
      await api.delete(`/api/website-forms/fields/${fieldId}`);
      message.success('Champ supprimé');
      fetchFields();
      onUpdate();
    } catch {
      message.error('Erreur lors de la suppression');
    }
  };

  const fieldColumns: ColumnsType<FormField> = [
    {
      title: '#',
      dataIndex: 'fieldOrder',
      key: 'fieldOrder',
      width: 50,
      align: 'center'
    },
    {
      title: 'Label',
      dataIndex: 'label',
      key: 'label',
      render: (label: string, record: FormField) => (
        <Space>
          <span style={{ fontWeight: 500 }}>{label}</span>
          {record.isRequired && <Tag color="red">Requis</Tag>}
        </Space>
      )
    },
    {
      title: 'Type',
      dataIndex: 'fieldType',
      key: 'fieldType',
      width: 140,
      render: (type: string) => {
        const typeLabels: Record<string, { label: string; color: string }> = {
          'card_select': { label: 'Cartes', color: 'blue' },
          'text': { label: 'Texte', color: 'default' },
          'email': { label: 'Email', color: 'cyan' },
          'phone': { label: 'Téléphone', color: 'green' },
          'number': { label: 'Nombre', color: 'orange' },
          'select': { label: 'Liste', color: 'purple' },
          'radio': { label: 'Radio', color: 'magenta' },
          'checkbox': { label: 'Case', color: 'lime' },
          'textarea': { label: 'Zone texte', color: 'gold' },
          'address': { label: 'Adresse', color: 'volcano' }
        };
        const config = typeLabels[type] || { label: type, color: 'default' };
        return <Tag color={config.color}>{config.label}</Tag>;
      }
    },
    {
      title: 'Nom technique',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <Text code>{name}</Text>
    },
    {
      title: 'Lien TBL',
      dataIndex: 'tblNodePath',
      key: 'tblNodePath',
      width: 150,
      render: (path: string) => path ? (
        <Tooltip title={path}>
          <Tag color="geekblue" icon={<LinkOutlined />}>
            {path.length > 20 ? path.slice(-20) + '...' : path}
          </Tag>
        </Tooltip>
      ) : <Text type="secondary">-</Text>
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record: FormField) => (
        <Space>
          <Tooltip title="Modifier">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditField(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Supprimer ce champ ?"
            onConfirm={() => handleDeleteField(record.id)}
            okText="Supprimer"
            cancelText="Annuler"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <>
      <Modal
        title={
          <Space>
            <SettingOutlined />
            <span>Champs de l'étape : {step?.title}</span>
          </Space>
        }
        open={visible}
        onCancel={onClose}
        width={1000}
        footer={
          <Button onClick={onClose}>Fermer</Button>
        }
      >
        <div style={{ marginBottom: '16px' }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddField}
          >
            Ajouter un champ
          </Button>
        </div>

        <Table
          columns={fieldColumns}
          dataSource={fields}
          rowKey="id"
          loading={loading}
          pagination={false}
          locale={{
            emptyText: (
              <Empty description="Aucun champ configuré">
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddField}>
                  Créer le premier champ
                </Button>
              </Empty>
            )
          }}
        />
      </Modal>

      {/* Modal ajout/édition champ */}
      <Modal
        title={editingField ? '✏️ Modifier le champ' : '➕ Nouveau champ'}
        open={fieldModalVisible}
        onCancel={() => setFieldModalVisible(false)}
        footer={null}
        width={700}
      >
        <Form
          form={fieldForm}
          layout="vertical"
          onFinish={handleSaveField}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="label"
                label="Label (affiché à l'utilisateur)"
                rules={[{ required: true, message: 'Label requis' }]}
              >
                <Input placeholder="Ex: Type de chauffage actuel" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Nom technique (sans espaces)"
                rules={[
                  { required: true, message: 'Nom requis' },
                  { pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/, message: 'Format invalide' }
                ]}
              >
                <Input placeholder="Ex: heating_type" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="fieldType"
                label="Type de champ"
                rules={[{ required: true }]}
              >
                <Select>
                  <Select.Option value="card_select">📦 Cartes (style Effy)</Select.Option>
                  <Select.Option value="text">📝 Texte</Select.Option>
                  <Select.Option value="email">✉️ Email</Select.Option>
                  <Select.Option value="phone">📱 Téléphone</Select.Option>
                  <Select.Option value="number">🔢 Nombre</Select.Option>
                  <Select.Option value="select">📋 Liste déroulante</Select.Option>
                  <Select.Option value="radio">⭕ Boutons radio</Select.Option>
                  <Select.Option value="checkbox">☑️ Cases à cocher</Select.Option>
                  <Select.Option value="textarea">📄 Zone de texte</Select.Option>
                  <Select.Option value="address">📍 Adresse (autocomplete)</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="fieldOrder"
                label="Ordre d'affichage"
                rules={[{ required: true }]}
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="isRequired"
                label="Obligatoire"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="placeholder"
                label="Placeholder"
              >
                <Input placeholder="Texte indicatif dans le champ" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="defaultValue"
                label="Valeur par défaut"
              >
                <Input placeholder="Valeur pré-remplie" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="helpText"
            label="Texte d'aide"
          >
            <Input placeholder="Information complémentaire sous le champ" />
          </Form.Item>

          <Form.Item
            name="options"
            label="Options (JSON) - Pour cartes, select, radio, checkbox"
            extra={'Format: [{"value": "option1", "label": "Option 1", "icon": "🏠"}]'}
          >
            <TextArea
              rows={4}
              placeholder={'[{"value": "gaz", "label": "Chaudière gaz", "icon": "🔥"}]'}
            />
          </Form.Item>

          <Divider>Mapping TBL (optionnel)</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="tblNodeId"
                label="ID du noeud TBL"
              >
                <InputNumber style={{ width: '100%' }} placeholder="ID du noeud" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="tblNodePath"
                label="Chemin TBL"
              >
                <Input placeholder="Ex: Chauffage > Type actuel" />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ textAlign: 'right', marginTop: '16px' }}>
            <Space>
              <Button onClick={() => setFieldModalVisible(false)}>
                Annuler
              </Button>
              <Button type="primary" htmlType="submit">
                {editingField ? 'Mettre à jour' : 'Créer'}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </>
  );
};

export default FormsManager;
