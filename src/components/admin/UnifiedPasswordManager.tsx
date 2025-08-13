import React, { useState, useEffect } from 'react';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { Card, Button, Typography, Table, Input, Form, Modal, Space, Tag, message } from 'antd';
import { UserOutlined, LockOutlined, KeyOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

interface UnifiedPasswordModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

// Composant pour le modal de définition du mot de passe unifié
const UnifiedPasswordModal: React.FC<UnifiedPasswordModalProps> = ({ open, onClose, userId, userName }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const api = useAuthenticatedApi();

  const handleSetPassword = async (values: { password: string; confirmPassword: string }) => {
    // Validation basique
    if (!values.password) {
      message.error("Le mot de passe ne peut pas être vide.");
      return;
    }
    
    if (values.password !== values.confirmPassword) {
      message.error("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    try {
      // Appel à l'API pour définir le mot de passe unifié
      await api.api.post('/api/admin-password/unified-password', {
        userId,
        password: values.password
      });

      message.success('Le mot de passe unifié a été configuré avec succès');
      onClose();
      form.resetFields();
    } catch (err: any) {
      message.error(err.response?.data?.error || err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={`Définir un mot de passe unifié pour ${userName}`}
      open={open}
      onCancel={onClose}
      footer={null}
    >
      <Paragraph className="mb-4">
        Ce mot de passe sera utilisé pour tous les services : Email et Google Voice.
      </Paragraph>
      
      <Form form={form} layout="vertical" onFinish={handleSetPassword}>
        <Form.Item
          name="password"
          label="Mot de passe"
          rules={[{ required: true, message: 'Veuillez saisir un mot de passe' }]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Mot de passe" />
        </Form.Item>
        
        <Form.Item
          name="confirmPassword"
          label="Confirmer le mot de passe"
          rules={[
            { required: true, message: 'Veuillez confirmer le mot de passe' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Les deux mots de passe ne correspondent pas'));
              },
            }),
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Confirmer le mot de passe" />
        </Form.Item>

        <Form.Item className="mb-0 text-right">
          <Space>
            <Button onClick={onClose}>
              Annuler
            </Button>
            <Button type="primary" htmlType="submit" loading={loading} icon={<KeyOutlined />}>
              Définir le mot de passe
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

// Composant principal pour la gestion des mots de passe unifiés
const UnifiedPasswordManager: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const api = useAuthenticatedApi();

  // Charger la liste des utilisateurs avec leur statut unifié
  const loadUsers = async () => {
    setLoading(true);
    try {
      console.log("Appel API /admin-password/users-services...");
      
      const response = await api.api.get('/api/admin-password/users-services');
      console.log("Réponse API brute:", response);
      
      // La réponse est directement le tableau d'utilisateurs
      if (Array.isArray(response)) {
        console.log("Données utilisateurs reçues correctement:", response);
        setUsers(response);
      } else {
        console.error("La réponse n'est pas un tableau:", response);
        setUsers([]);
        message.error("Format de données incorrect reçu du serveur");
      }
    } catch (err: any) {
      console.error("Erreur lors du chargement des utilisateurs:", err);
      message.error(
        err.response?.data?.error || err.message || 'Une erreur est survenue lors du chargement des utilisateurs'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Ouvrir le modal pour définir un mot de passe unifié
  const handleOpenModal = (user: any) => {
    setSelectedUser(user);
    setModalOpen(true);
  };

  // Fermer le modal
  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedUser(null);
    // Recharger la liste des utilisateurs après fermeture du modal
    loadUsers();
  };

  const columns = [
    {
      title: 'Utilisateur',
      dataIndex: 'name',
      key: 'name',
      render: (_: string, record: any) => (
        <Space>
          <UserOutlined />
          <Text strong>{`${record.firstName || ''} ${record.lastName || ''}`}</Text>
        </Space>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Mail',
      key: 'mail',
      render: (record: any) => (
        <Tag color={record.hasMailSettings ? 'success' : 'default'} icon={<MailOutlined />}>
          {record.hasMailSettings ? 'Configuré' : 'Non configuré'}
        </Tag>
      ),
    },
    {
      title: 'Google Voice',
      key: 'googlevoice',
      render: (record: any) => (
        <Tag color={record.hasTelnyxSettings ? 'success' : 'default'} icon={<PhoneOutlined />}>
          {record.hasTelnyxSettings ? 'Configuré' : 'Non configuré'}
        </Tag>
      ),
    },
    {
      title: 'Statut',
      key: 'status',
      render: (record: any) => (
        <Tag color={record.isUnified ? 'processing' : 'warning'}>
          {record.isUnified ? 'Unifié' : 'Non unifié'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'action',
      render: (record: any) => (
        <Button 
          type="primary" 
          onClick={() => handleOpenModal(record)}
          icon={<KeyOutlined />}
          size="small"
        >
          {record.isUnified ? "Mettre à jour" : "Définir le mot de passe"}
        </Button>
      ),
    },
  ];

  return (
    <div className="p-4">
      <Title level={2}>Gestion des mots de passe unifiés</Title>
      
      <Card className="mb-4">
        <Paragraph>
          Cette page permet de définir un mot de passe unifié pour chaque utilisateur.
          Ce mot de passe unique sera utilisé pour tous les services :
        </Paragraph>
        <ul>
          <li><MailOutlined className="mr-2" /> Messagerie électronique</li>
          <li><PhoneOutlined className="mr-2" /> Google Voice (remplace Telnyx)</li>
        </ul>
        <Paragraph type="secondary">
          Note: Le mot de passe du compte CRM reste géré séparément pour des raisons de sécurité.
        </Paragraph>
      </Card>
      
      <Table 
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />
      
      {selectedUser && (
        <UnifiedPasswordModal
          open={modalOpen}
          onClose={handleCloseModal}
          userId={selectedUser.id}
          userName={`${selectedUser.firstName || ''} ${selectedUser.lastName || ''}`}
        />
      )}
    </div>
  );
};

export default UnifiedPasswordManager;
