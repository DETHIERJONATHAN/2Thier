import React, { useState } from 'react';
import { Button, Typography, Modal, Form, Input, message, Space } from 'antd';
import { BankOutlined } from '@ant-design/icons';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';

const { Text } = Typography;

/**
 * Bannière affichée en haut du dashboard pour les utilisateurs réseau (libres).
 * Propose de créer une organisation pour accéder aux outils CRM/ERP.
 */
export default function FreeUserBanner() {
  const [msgApi, msgCtx] = message.useMessage();
  const { api } = useAuthenticatedApi();
  const [isCreateOrgModalVisible, setIsCreateOrgModalVisible] = useState(false);
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [form] = Form.useForm();

  const handleCreateOrganization = async (values: { name: string; description?: string }) => {
    setIsCreatingOrg(true);
    try {
      await api.post('/api/organizations', {
        name: values.name,
        description: values.description || '',
        isActive: true
      });

      msgApi.success(`Organisation "${values.name}" créée avec succès !`);
      setIsCreateOrgModalVisible(false);
      form.resetFields();
      window.location.reload();
    } catch (error) {
      console.error('Erreur création organisation:', error);
      msgApi.error('Erreur lors de la création de l\'organisation');
    } finally {
      setIsCreatingOrg(false);
    }
  };

  return (
    <>
      {msgCtx}
      <div style={{
        background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 50%, #14b8a6 100%)',
        borderRadius: 12,
        padding: '16px 20px',
        margin: '0 0 16px 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <Text style={{ color: '#fff', fontSize: 14 }}>
          Bienvenue sur <a href="https://www.zhiive.com" target="_blank" rel="noopener noreferrer" style={{ color: '#fff', fontWeight: 700, textDecoration: 'underline' }}>Zhiive</a> en accès libre. Pour les outils CRM/ERP, créez votre organisation.
        </Text>
        <Button
          type="primary"
          icon={<BankOutlined />}
          onClick={() => setIsCreateOrgModalVisible(true)}
          style={{ background: '#fff', color: '#0f766e', borderColor: '#fff', fontWeight: 600 }}
        >
          Créer mon organisation
        </Button>
      </div>

      <Modal
        title="Créer votre organisation"
        open={isCreateOrgModalVisible}
        onCancel={() => setIsCreateOrgModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleCreateOrganization}>
          <Form.Item
            label="Nom de l'organisation"
            name="name"
            rules={[
              { required: true, message: 'Le nom de l\'organisation est requis' },
              { min: 2, message: 'Le nom doit faire au moins 2 caractères' }
            ]}
          >
            <Input placeholder="Ex: Mon Entreprise SARL" />
          </Form.Item>
          <Form.Item label="Description (optionnel)" name="description">
            <Input.TextArea rows={3} placeholder="Décrivez brièvement votre organisation..." />
          </Form.Item>
          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button onClick={() => setIsCreateOrgModalVisible(false)}>Annuler</Button>
              <Button type="primary" htmlType="submit" loading={isCreatingOrg}>
                Créer l'organisation
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
