import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Button, message, Row, Col, Spin } from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined, HomeOutlined, GlobalOutlined, LinkedinOutlined } from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useLeadStatuses } from '../../hooks/useLeadStatuses';
import type { Lead } from '../../types/leads';

const { Option } = Select;
const { TextArea } = Input;

interface EditLeadFormData {
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

interface EditLeadModalProps {
  open: boolean;
  leadId: string | null;
  onClose: () => void;
  onLeadUpdated: () => void;
}

const EditLeadModal: React.FC<EditLeadModalProps> = ({
  open,
  leadId,
  onClose,
  onLeadUpdated
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const { api } = useAuthenticatedApi();
  const { leadStatuses } = useLeadStatuses();

  // Charger les données du lead quand le modal s'ouvre
  useEffect(() => {
    const fetchLead = async () => {
      if (!leadId || !open) return;
      
      try {
        setFetching(true);
        const lead = await api.get<Lead>(`/api/leads/${leadId}`);
        
        // Remplir le formulaire avec les données existantes
        form.setFieldsValue({
          firstName: lead.firstName || '',
          lastName: lead.lastName || '',
          email: lead.email || lead.data?.email || '',
          phone: lead.phone || lead.data?.phone || '',
          company: lead.company || lead.data?.company || '',
          source: lead.source || 'manual',
          statusId: lead.statusId || undefined,
          notes: lead.data?.notes || '',
          website: lead.data?.website || '',
          linkedin: lead.data?.linkedin || '',
        });
      } catch (error) {
        console.error('[EditLeadModal] Erreur chargement lead:', error);
        message.error('Erreur lors du chargement du lead');
      } finally {
        setFetching(false);
      }
    };

    fetchLead();
  }, [leadId, open, api, form]);

  const handleSubmit = async (values: EditLeadFormData) => {
    if (!leadId) return;
    
    try {
      setLoading(true);

      const leadData = {
        firstName: values.firstName || '',
        lastName: values.lastName || '',
        email: values.email || '',
        phone: values.phone || '',
        company: values.company || '',
        source: values.source || 'manual',
        statusId: values.statusId || null,
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

      await api.put(`/api/leads/${leadId}`, leadData);

      message.success('Lead modifié avec succès !');
      onLeadUpdated();
      onClose();

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('[EditLeadModal] Erreur modification:', error);
      message.error(`Erreur lors de la modification: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  const leadSources = [
    { value: 'website', label: '🌐 Site Web' },
    { value: 'website_form', label: '📝 Formulaire Web' },
    { value: 'facebook', label: '📘 Facebook Ads' },
    { value: 'google', label: '🔍 Google Ads' },
    { value: 'linkedin', label: '💼 LinkedIn' },
    { value: 'referral', label: '👥 Référence' },
    { value: 'partner', label: '🤝 Partenaire' },
    { value: 'salon', label: '🏢 Salon/Événement' },
    { value: 'cold_call', label: '📞 Prospection téléphonique' },
    { value: 'email', label: '✉️ Email marketing' },
    { value: 'manual', label: '✍️ Saisie manuelle' },
    { value: 'other', label: '📋 Autre' }
  ];

  return (
    <Modal
      title="✏️ Modifier le lead"
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={700}
      destroyOnClose
    >
      {fetching ? (
        <div className="flex justify-center items-center py-12">
          <Spin size="large" />
        </div>
      ) : (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          <Row gutter={16}>
            <Col xs={24} sm={12}>
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
            <Col xs={24} sm={12}>
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
            <Col xs={24} sm={12}>
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
            <Col xs={24} sm={12}>
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
            <Col xs={24} sm={12}>
              <Form.Item
                label="Société"
                name="company"
              >
                <Input 
                  prefix={<HomeOutlined />} 
                  placeholder="Ex: ABC Solutions"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Source"
                name="source"
              >
                <Select placeholder="Source du lead">
                  {leadSources.map(source => (
                    <Option key={source.value} value={source.value}>
                      {source.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {leadStatuses.length > 0 && (
            <Form.Item
              label="Statut"
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
            <Col xs={24} sm={12}>
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
            <Col xs={24} sm={12}>
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
              placeholder="Notes sur ce lead..."
            />
          </Form.Item>

          <Form.Item className="mb-0 text-right">
            <Button onClick={handleCancel} className="mr-2">
              Annuler
            </Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              💾 Enregistrer les modifications
            </Button>
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
};

export default EditLeadModal;
