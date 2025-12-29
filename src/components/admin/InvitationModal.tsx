import React from 'react';
import { Modal, Form, Input, Select, Button, message, Checkbox, Alert, Space } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useAuth } from '../../auth/useAuth';
import { Role } from '../../types';

const { Text } = Alert;

interface InvitationModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  roles: Role[];
}

const InvitationModal: React.FC<InvitationModalProps> = ({ visible, onCancel, onSuccess, roles }) => {
  const [form] = Form.useForm();
  const { api } = useAuthenticatedApi();
  const { currentOrganization } = useAuth();
  const [loading, setLoading] = React.useState(false);

  const handleInvite = async (values: { 
    email: string; 
    roleName: string;
    createWorkspaceAccount?: boolean;
  }) => {
    if (!currentOrganization?.id) {
      message.error("Aucune organisation sélectionnée");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/users/invitations', {
        email: values.email,
        roleName: values.roleName,
        organizationId: currentOrganization.id,
        createWorkspaceAccount: values.createWorkspaceAccount || false,
      });
      
      if (response.success) {
        const successMsg = values.createWorkspaceAccount
          ? "Invitation envoyée ! Un compte Google Workspace sera créé automatiquement lors de l'acceptation."
          : "Invitation envoyée avec succès !";
        message.success(successMsg);
        onSuccess();
        form.resetFields();
      } else {
        message.error(response.message || "Une erreur est survenue.");
      }
    } catch (error: any) {
      // L'erreur est déjà gérée par le hook `useAuthenticatedApi` qui affiche une notification
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Inviter un nouvel utilisateur"
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="back" onClick={onCancel}>
          Annuler
        </Button>,
        <Button key="submit" type="primary" loading={loading} onClick={() => form.submit()}>
          Envoyer l'invitation
        </Button>,
      ]}
    >
      <Form form={form} onFinish={handleInvite} layout="vertical">
        <Form.Item
          name="email"
          label="Adresse e-mail"
          rules={[{ required: true, type: 'email', message: 'Veuillez entrer une adresse e-mail valide.' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name="roleName"
          label="Rôle"
          rules={[{ required: true, message: 'Veuillez sélectionner un rôle.' }]}
        >
          <Select placeholder="Sélectionner un rôle">
            {roles.map(role => (
              <Select.Option key={role.id} value={role.name}>{role.label || role.name}</Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item 
          name="createWorkspaceAccount" 
          valuePropName="checked"
          tooltip="Si coché, un compte Google Workspace sera créé automatiquement avec l'adresse prénom.nom@votredomaine.be lors de l'acceptation de l'invitation"
        >
          <Checkbox>
            <Space>
              <MailOutlined />
              <span>Créer automatiquement un compte Google Workspace</span>
            </Space>
          </Checkbox>
        </Form.Item>

        <Form.Item noStyle shouldUpdate={(prev, curr) => prev.createWorkspaceAccount !== curr.createWorkspaceAccount}>
          {({ getFieldValue }) => 
            getFieldValue('createWorkspaceAccount') ? (
              <Alert
                type="info"
                message="L'utilisateur recevra un email avec ses identifiants Google Workspace après acceptation"
                showIcon
                className="mb-4"
              />
            ) : null
          }
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default InvitationModal;
