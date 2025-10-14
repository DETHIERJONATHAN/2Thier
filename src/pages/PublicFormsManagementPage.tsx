import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  message,
  Space,
  Tabs,
  Tag,
  Popconfirm,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';

const { TextArea } = Input;
const { TabPane } = Tabs;

interface PublicFormField {
  id: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox' | 'radio';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // Pour select, radio
  order: number;
}

interface PublicForm {
  id: string;
  name: string;
  description?: string;
  slug: string;
  category: string;
  fields: PublicFormField[];
  thankYouMessage: string;
  redirectUrl?: string;
  collectsRgpdConsent: boolean;
  autoPublishLeads: boolean;
  submissionCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const PublicFormsManagementPage: React.FC = () => {
  const { api } = useAuthenticatedApi();
  const [forms, setForms] = useState<PublicForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingForm, setEditingForm] = useState<PublicForm | null>(null);
  const [form] = Form.useForm();

  // Champs par défaut pour un nouveau formulaire
  const defaultFields: PublicFormField[] = [
    {
      id: 'name',
      type: 'text',
      label: 'Nom complet',
      placeholder: 'Votre nom',
      required: true,
      order: 1,
    },
    {
      id: 'email',
      type: 'email',
      label: 'Adresse email',
      placeholder: 'votre@email.com',
      required: true,
      order: 2,
    },
    {
      id: 'phone',
      type: 'tel',
      label: 'Téléphone',
      placeholder: '+32 XXX XX XX XX',
      required: false,
      order: 3,
    },
    {
      id: 'message',
      type: 'textarea',
      label: 'Message',
      placeholder: 'Votre message...',
      required: true,
      order: 4,
    },
  ];

  // Charger les formulaires
  const loadForms = async () => {
    try {
      setLoading(true);
      const data = await api.get('/api/public-forms');
      setForms(data);
    } catch (error) {
      console.error('[PublicFormsManagement] Erreur chargement:', error);
      message.error('Erreur lors du chargement des formulaires');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadForms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ouvrir le modal pour créer/éditer
  const openModal = (formToEdit?: PublicForm) => {
    if (formToEdit) {
      setEditingForm(formToEdit);
      form.setFieldsValue({
        name: formToEdit.name,
        description: formToEdit.description,
        category: formToEdit.category,
        thankYouMessage: formToEdit.thankYouMessage,
        redirectUrl: formToEdit.redirectUrl,
        collectsRgpdConsent: formToEdit.collectsRgpdConsent,
        autoPublishLeads: formToEdit.autoPublishLeads,
        isActive: formToEdit.isActive,
      });
    } else {
      setEditingForm(null);
      form.setFieldsValue({
        name: '',
        description: '',
        category: 'contact',
        thankYouMessage: 'Merci pour votre soumission !',
        collectsRgpdConsent: true,
        autoPublishLeads: false,
        isActive: true,
      });
    }
    setModalVisible(true);
  };

  // Sauvegarder (créer ou mettre à jour)
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (editingForm) {
        // Mise à jour
        const updated = await api.put(`/api/public-forms/${editingForm.id}`, values);
        message.success('Formulaire mis à jour avec succès');
        setForms(forms.map((f) => (f.id === editingForm.id ? updated : f)));
      } else {
        // Création avec champs par défaut
        const newForm = await api.post('/api/public-forms', {
          ...values,
          fields: defaultFields,
        });
        message.success('Formulaire créé avec succès');
        setForms([...forms, newForm]);
      }

      setModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('[PublicFormsManagement] Erreur sauvegarde:', error);
      message.error('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  // Supprimer un formulaire
  const handleDelete = async (formId: string) => {
    try {
      setLoading(true);
      await api.delete(`/api/public-forms/${formId}`);
      message.success('Formulaire supprimé');
      setForms(forms.filter((f) => f.id !== formId));
    } catch (error) {
      console.error('[PublicFormsManagement] Erreur suppression:', error);
      message.error('Erreur lors de la suppression');
    } finally {
      setLoading(false);
    }
  };

  // Copier l'URL publique
  const copyPublicUrl = (slug: string) => {
    const url = `${window.location.origin}/form/${slug}`;
    navigator.clipboard.writeText(url);
    message.success('URL copiée dans le presse-papier');
  };

  // Colonnes du tableau
  const columns = [
    {
      title: 'Nom',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: PublicForm) => (
        <Space direction="vertical" size={0}>
          <strong>{text}</strong>
          {record.description && (
            <span style={{ fontSize: '12px', color: '#999' }}>{record.description}</span>
          )}
        </Space>
      ),
    },
    {
      title: 'Catégorie',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => {
        const categoryLabels: Record<string, string> = {
          contact: 'Contact',
          lead: 'Lead',
          support: 'Support',
          feedback: 'Feedback',
        };
        return <Tag>{categoryLabels[category] || category}</Tag>;
      },
    },
    {
      title: 'Soumissions',
      dataIndex: 'submissionCount',
      key: 'submissionCount',
      align: 'center' as const,
    },
    {
      title: 'Statut',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>{isActive ? 'Actif' : 'Inactif'}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: PublicForm) => (
        <Space>
          <Button
            icon={<EyeOutlined />}
            size="small"
            onClick={() => copyPublicUrl(record.slug)}
            title="Copier l'URL publique"
          />
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => openModal(record)}
            title="Éditer"
          />
          <Popconfirm
            title="Supprimer ce formulaire ?"
            description="Cette action est irréversible"
            onConfirm={() => handleDelete(record.id)}
            okText="Supprimer"
            cancelText="Annuler"
            okButtonProps={{ danger: true }}
          >
            <Button icon={<DeleteOutlined />} size="small" danger title="Supprimer" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title={
          <Space>
            <span style={{ fontSize: '20px', fontWeight: 600 }}>Formulaires Publics</span>
            <Tag color="blue">{forms.length} formulaire(s)</Tag>
          </Space>
        }
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
            Créer un formulaire
          </Button>
        }
      >
        <Table
          dataSource={forms}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: 'Aucun formulaire créé' }}
        />
      </Card>

      {/* Modal de création/édition */}
      <Modal
        title={editingForm ? 'Éditer le formulaire' : 'Créer un formulaire'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        width={800}
        okText="Enregistrer"
        cancelText="Annuler"
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical">
          <Tabs defaultActiveKey="general">
            <TabPane tab="Informations générales" key="general">
              <Form.Item
                name="name"
                label="Nom du formulaire"
                rules={[{ required: true, message: 'Le nom est requis' }]}
              >
                <Input placeholder="Ex: Formulaire de contact" />
              </Form.Item>

              <Form.Item name="description" label="Description">
                <TextArea
                  rows={2}
                  placeholder="Description courte du formulaire (optionnel)"
                />
              </Form.Item>

              <Form.Item
                name="category"
                label="Catégorie"
                rules={[{ required: true, message: 'La catégorie est requise' }]}
              >
                <Select>
                  <Select.Option value="contact">Contact</Select.Option>
                  <Select.Option value="lead">Lead</Select.Option>
                  <Select.Option value="support">Support</Select.Option>
                  <Select.Option value="feedback">Feedback</Select.Option>
                </Select>
              </Form.Item>
            </TabPane>

            <TabPane tab="Configuration" key="config">
              <Form.Item
                name="thankYouMessage"
                label="Message de remerciement"
                rules={[{ required: true, message: 'Le message est requis' }]}
              >
                <TextArea
                  rows={3}
                  placeholder="Message affiché après soumission du formulaire"
                />
              </Form.Item>

              <Form.Item name="redirectUrl" label="URL de redirection (optionnel)">
                <Input placeholder="https://example.com/merci" />
              </Form.Item>

              <Divider />

              <Form.Item
                name="collectsRgpdConsent"
                label="Consentement RGPD"
                valuePropName="checked"
              >
                <Switch checkedChildren="Oui" unCheckedChildren="Non" />
              </Form.Item>

              <Form.Item
                name="autoPublishLeads"
                label="Publier automatiquement les leads"
                valuePropName="checked"
              >
                <Switch checkedChildren="Oui" unCheckedChildren="Non" />
              </Form.Item>

              <Form.Item name="isActive" label="Formulaire actif" valuePropName="checked">
                <Switch checkedChildren="Actif" unCheckedChildren="Inactif" />
              </Form.Item>
            </TabPane>
          </Tabs>
        </Form>

        {!editingForm && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px',
              background: '#f0f7ff',
              borderRadius: '4px',
            }}
          >
            <strong>ℹ️ Champs par défaut inclus :</strong>
            <ul style={{ marginTop: '8px', marginBottom: 0 }}>
              <li>Nom complet (requis)</li>
              <li>Email (requis)</li>
              <li>Téléphone (optionnel)</li>
              <li>Message (requis)</li>
            </ul>
            <p style={{ marginTop: '8px', marginBottom: 0, fontSize: '12px', color: '#666' }}>
              Vous pourrez personnaliser les champs après la création.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PublicFormsManagementPage;
