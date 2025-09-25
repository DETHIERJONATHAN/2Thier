import React, { useState } from 'react';
import { Button, Typography, Card, Space, Modal, Form, Input, message } from 'antd';
import { LogoutOutlined, UserOutlined, BankOutlined } from '@ant-design/icons';
import { useAuth } from '../auth/useAuth';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';

const { Title, Text } = Typography;

export default function FreeUserPage() {
  const [msgApi, msgCtx] = message.useMessage();
  const { user, logout } = useAuth();
  const { api } = useAuthenticatedApi();
  const [isCreateOrgModalVisible, setIsCreateOrgModalVisible] = useState(false);
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [form] = Form.useForm();

  const handleLogout = () => {
    logout();
  };

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
      
      // Recharger la page pour que l'utilisateur soit redirigé vers l'interface normale
      window.location.reload();
    } catch (error) {
      console.error('Erreur création organisation:', error);
      msgApi.error('Erreur lors de la création de l\'organisation');
    } finally {
      setIsCreatingOrg(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {msgCtx}
      <Card className="w-full max-w-md shadow-lg">
        <div className="text-center space-y-6">
          {/* Icône utilisateur */}
          <div className="flex justify-center">
            <div className="bg-blue-100 p-4 rounded-full">
              <UserOutlined className="text-3xl text-blue-600" />
            </div>
          </div>

          {/* Titre */}
          <Title level={3} className="mb-0">
            Utilisateur libre
          </Title>

          {/* Informations utilisateur */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <Text strong>Email :</Text>
            <br />
            <Text className="text-gray-600">{user?.email}</Text>
            <br />
            <br />
            <Text strong>Prénom :</Text>
            <br />
            <Text className="text-gray-600">{user?.firstName || 'Non renseigné'}</Text>
            <br />
            <br />
            <Text strong>Nom :</Text>
            <br />
            <Text className="text-gray-600">{user?.lastName || 'Non renseigné'}</Text>
          </div>

          {/* Message d'information */}
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <Text className="text-yellow-800 text-sm">
              Votre compte n'est actuellement rattaché à aucune organisation. 
              Contactez un administrateur pour obtenir l'accès aux fonctionnalités du CRM.
            </Text>
          </div>

          {/* Actions disponibles */}
          <Space direction="vertical" className="w-full" size="middle">
            <Button 
              type="primary"
              icon={<BankOutlined />}
              onClick={() => setIsCreateOrgModalVisible(true)}
              size="large"
              block
            >
              Créer mon organisation
            </Button>
            
            <Button 
              type="default" 
              danger 
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              size="large"
              block
            >
              Se déconnecter
            </Button>
          </Space>
        </div>

        {/* Modal de création d'organisation */}
        <Modal
          title="Créer votre organisation"
          open={isCreateOrgModalVisible}
          onCancel={() => setIsCreateOrgModalVisible(false)}
          footer={null}
          destroyOnClose
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleCreateOrganization}
          >
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

            <Form.Item
              label="Description (optionnel)"
              name="description"
            >
              <Input.TextArea 
                rows={3} 
                placeholder="Décrivez brièvement votre organisation..."
              />
            </Form.Item>

            <Form.Item className="mb-0">
              <Space className="w-full justify-end">
                <Button onClick={() => setIsCreateOrgModalVisible(false)}>
                  Annuler
                </Button>
                <Button 
                  type="primary" 
                  htmlType="submit"
                  loading={isCreatingOrg}
                >
                  Créer l'organisation
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </Card>
    </div>
  );
}
