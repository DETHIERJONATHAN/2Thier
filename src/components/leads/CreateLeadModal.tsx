import React, { useState } from 'react';
import { Modal, Form, Input, Select, Button, message, Row, Col } from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined, HomeOutlined, GlobalOutlined, LinkedinOutlined } from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useLeadStatuses } from '../../hooks/useLeadStatuses';

const { Option } = Select;
const { TextArea } = Input;

interface CreateLeadFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company: string;
  source: string;
  statusId?: string;
  notes?: string;
  website?: string;
  linkedin?: string;
}

interface CreateLeadModalProps {
  visible: boolean;
  onClose: () => void;
  onLeadCreated: () => void; // Callback pour rafraîchir la liste
}

const CreateLeadModal: React.FC<CreateLeadModalProps> = ({
  visible,
  onClose,
  onLeadCreated
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { api } = useAuthenticatedApi();
  const { leadStatuses } = useLeadStatuses();

  const handleSubmit = async (values: CreateLeadFormData) => {
    try {
      setLoading(true);
      console.log('[CreateLeadModal] Données du formulaire:', values);

      // Préparer les données pour l'API
      const leadData = {
        firstName: values.firstName || '',
        lastName: values.lastName || '',
        email: values.email || '',
        phone: values.phone || '',
        company: values.company || '',
        source: values.source || 'manual',
        status: 'new', // Statut par défaut
        statusId: values.statusId || null,
        notes: values.notes || '',
        website: values.website || '',
        linkedin: values.linkedin || '',
        // Données additionnelles au format JSON pour compatibilité
        data: {
          name: `${values.firstName || ''} ${values.lastName || ''}`.trim(),
          email: values.email || '',
          phone: values.phone || '',
          company: values.company || '',
          notes: values.notes || '',
          website: values.website || '',
          linkedin: values.linkedin || '',
          source: values.source || 'manual'
        }
      };

      console.log('[CreateLeadModal] Envoi vers API:', leadData);

      // Appeler l'API de création
      const response = await api.post('/api/leads', leadData);
      console.log('[CreateLeadModal] Réponse API:', response);

      message.success('Lead créé avec succès !');
      form.resetFields();
      onLeadCreated(); // Rafraîchir la liste
      onClose();

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('[CreateLeadModal] Erreur lors de la création:', error);
      message.error(`Erreur lors de la création du lead: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  // Sources disponibles
  const leadSources = [
    { value: 'website', label: '🌐 Site Web' },
    { value: 'facebook', label: '📘 Facebook Ads' },
    { value: 'google', label: '🔍 Google Ads' },
    { value: 'linkedin', label: '💼 LinkedIn' },
    { value: 'referral', label: '👥 Référence' },
    { value: 'salon', label: '🏢 Salon/Événement' },
    { value: 'cold_call', label: '📞 Prospection téléphonique' },
    { value: 'email', label: '✉️ Email marketing' },
    { value: 'manual', label: '✍️ Saisie manuelle' },
    { value: 'other', label: '📋 Autre' }
  ];

  return (
    <Modal
      title="📋 Créer un nouveau lead"
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={800}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Prénom"
              name="firstName"
              rules={[{ required: true, message: 'Le prénom est requis' }]}
            >
              <Input 
                prefix={<UserOutlined />} 
                placeholder="Ex: Jean"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Nom"
              name="lastName"
              rules={[{ required: true, message: 'Le nom est requis' }]}
            >
              <Input 
                prefix={<UserOutlined />} 
                placeholder="Ex: Dupont"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: 'L\'email est requis' },
                { type: 'email', message: 'Format d\'email invalide' }
              ]}
            >
              <Input 
                prefix={<MailOutlined />} 
                placeholder="Ex: jean.dupont@exemple.com"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Téléphone"
              name="phone"
            >
              <Input 
                prefix={<PhoneOutlined />} 
                placeholder="Ex: +33 1 23 45 67 89"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Société"
              name="company"
              rules={[{ required: true, message: 'La société est requise' }]}
            >
              <Input 
                prefix={<HomeOutlined />} 
                placeholder="Ex: ABC Solutions"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Source"
              name="source"
              rules={[{ required: true, message: 'La source est requise' }]}
            >
              <Select placeholder="Comment avez-vous trouvé ce lead ?">
                {leadSources.map(source => (
                  <Option key={source.value} value={source.value}>
                    {source.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {/* Statut optionnel */}
        {leadStatuses.length > 0 && (
          <Form.Item
            label="Statut initial (optionnel)"
            name="statusId"
          >
            <Select placeholder="Choisir un statut" allowClear>
              {leadStatuses.map(status => (
                <Option key={status.id} value={status.id}>
                  <span style={{ color: status.color }}>●</span> {status.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
        )}

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Site Web"
              name="website"
            >
              <Input 
                prefix={<GlobalOutlined />} 
                placeholder="Ex: https://www.exemple.com"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="LinkedIn"
              name="linkedin"
            >
              <Input 
                prefix={<LinkedinOutlined />} 
                placeholder="Ex: https://linkedin.com/in/profil"
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="Notes"
          name="notes"
        >
          <TextArea 
            rows={3}
            placeholder="Informations complémentaires, contexte de contact, etc."
          />
        </Form.Item>

        <Form.Item className="mb-0">
          <div className="flex justify-end space-x-2">
            <Button onClick={handleCancel}>
              Annuler
            </Button>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
            >
              Créer le lead
            </Button>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateLeadModal;
