/**
 * ➕ LeadCreatorMoimport { useAuthenticatedApi } from "../../../hooks/useAuthenticatedApi";al - Modal pour créer un nouveau lead
 */

import React, { useState } from 'react';
import { 
  Modal, 
  Form, 
  Input, 
  Button,
  Space,
  Typography,
  message,
  Row,
  Col
} from 'antd';
import { 
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  BankOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../../hooks/useAuthenticatedApi';
import type { LeadCreatorModalProps, CreateLeadData, TBLLead } from './types/lead-types';

const { Text } = Typography;
const { TextArea } = Input;

interface LeadCreatorModalPropsExtended extends LeadCreatorModalProps {
  onCreateLead: (leadData: CreateLeadData) => Promise<void>;
}

const LeadCreatorModal: React.FC<LeadCreatorModalPropsExtended> = ({
  open,
  onClose,
  onLeadCreated,
  onCreateLead
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { api } = useAuthenticatedApi();

  const handleSubmit = async (values: CreateLeadData) => {
    try {
      setLoading(true);
      
      // Créer le lead via l'API
      const response = await api.post('/api/leads', {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
        company: values.company,
        notes: values.notes,
        status: 'nouveau',
        source: 'tbl-formulaire'
      });

      if (response.success && response.data) {
        // Transformer en TBLLead
        const newLead: TBLLead = {
          id: response.data.id,
          name: `${values.firstName} ${values.lastName}`.trim(),
          email: values.email,
          phone: values.phone,
          company: values.company,
          hasSubmission: false
        };

        // Appeler la fonction de création pour gérer la soumission TBL
        await onCreateLead(values);
        
        message.success(`Lead "${newLead.name}" créé avec succès`);
        onLeadCreated(newLead);
        form.resetFields();
      } else {
        throw new Error(response.error || 'Erreur lors de la création du lead');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors de la création du lead';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title="Créer un nouveau lead"
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={600}
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
              name="firstName"
              label="Prénom"
              rules={[
                { required: true, message: 'Le prénom est requis' },
                { min: 2, message: 'Le prénom doit contenir au moins 2 caractères' }
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Prénom du contact"
                maxLength={50}
              />
            </Form.Item>
          </Col>
          
          <Col span={12}>
            <Form.Item
              name="lastName"
              label="Nom"
              rules={[
                { required: true, message: 'Le nom est requis' },
                { min: 2, message: 'Le nom doit contenir au moins 2 caractères' }
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Nom du contact"
                maxLength={50}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="email"
          label="Email"
          rules={[
            { type: 'email', message: 'Format email invalide' }
          ]}
        >
          <Input
            prefix={<MailOutlined />}
            placeholder="contact@entreprise.com"
            maxLength={100}
          />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="phone"
              label="Téléphone"
            >
              <Input
                prefix={<PhoneOutlined />}
                placeholder="+32 XXX XX XX XX"
                maxLength={20}
              />
            </Form.Item>
          </Col>
          
          <Col span={12}>
            <Form.Item
              name="company"
              label="Entreprise"
            >
              <Input
                prefix={<BankOutlined />}
                placeholder="Nom de l'entreprise"
                maxLength={100}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="notes"
          label="Notes"
        >
          <TextArea
            rows={3}
            placeholder="Notes additionnelles sur ce lead..."
            maxLength={500}
          />
        </Form.Item>

        {/* Info */}
        <div style={{ 
          backgroundColor: '#f6ffed', 
          border: '1px solid #b7eb8f', 
          borderRadius: '4px', 
          padding: '12px',
          marginBottom: '16px'
        }}>
          <Space>
            <FileTextOutlined style={{ color: '#52c41a' }} />
            <Text style={{ fontSize: '12px', color: '#389e0d' }}>
              Un devis TBL sera automatiquement créé pour ce nouveau lead
            </Text>
          </Space>
        </div>

        {/* Boutons */}
        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={handleCancel}>
              Annuler
            </Button>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              icon={<UserOutlined />}
            >
              Créer le lead
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default LeadCreatorModal;