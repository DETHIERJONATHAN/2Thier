import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Switch,
  message,
  Space,
  Typography,
  Divider,
  Card,
  Alert,
  Tag,
  Spin,
  Row,
  Col
} from 'antd';
import {
  GoogleOutlined,
  MailOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useAuth } from '../../auth/useAuth';
import { User } from '../../types';

const { Text } = Typography;

interface UserGoogleWorkspaceModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  user: User | null;
}

interface GoogleWorkspaceUserStatus {
  hasGoogleAccount: boolean;
  email: string;
  isActivated: boolean;
  organizationDomain: string | null;
  lastSync: string | null;
  services: {
    gmail: boolean;
    calendar: boolean;
    drive: boolean;
    meet: boolean;
  };
}

const UserGoogleWorkspaceModal: React.FC<UserGoogleWorkspaceModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  user
}) => {
  const { api } = useAuthenticatedApi();
  const { user: currentUser } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [googleStatus, setGoogleStatus] = useState<GoogleWorkspaceUserStatus | null>(null);

  // Fonction pour normaliser les noms (supprimer accents, espaces, etc.)
  const normalizeString = (str: string): string => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
      .replace(/[^a-zA-Z0-9]/g, '') // Supprimer caractères spéciaux
      .trim();
  };

  // Générer l'email automatiquement
  const generateEmail = useCallback((firstName: string, lastName: string, domain: string): string => {
    const normalizedFirstName = normalizeString(firstName);
    const normalizedLastName = normalizeString(lastName);
    return `${normalizedFirstName}.${normalizedLastName}@${domain}`;
  }, []);

  // Vérifier le statut Google Workspace de l'utilisateur
  const checkGoogleWorkspaceStatus = useCallback(async () => {
    if (!user) return;

    // Vérifier si l'utilisateur actuel a les permissions nécessaires
    const userRole = currentUser?.organizationRole?.role?.name;
    if (!userRole || !['admin', 'super_admin'].includes(userRole)) {
      console.log('[UserGoogleWorkspaceModal] ⚠️ Permissions insuffisantes pour accéder aux données Google Workspace');
      setGoogleStatus({
        hasGoogleAccount: false,
        email: null,
        isActivated: false,
        lastSync: null,
        error: 'Permissions insuffisantes'
      });
      setChecking(false);
      return;
    }

    setChecking(true);
    try {
      const response = await api.get(`/google-workspace/users/${user.id}/status`);
      if (response.success) {
        setGoogleStatus(response.data);
        
        // Pré-remplir le formulaire si l'email existe
        if (response.data.email) {
          form.setFieldsValue({
            email: response.data.email,
            activateServices: response.data.isActivated
          });
        } else {
          // Générer l'email automatiquement
          const orgResponse = await api.get(`/organizations/${user.organizationId || 'current'}`);
          if (orgResponse.success && orgResponse.data.googleWorkspaceDomain) {
            const generatedEmail = generateEmail(
              user.firstName, 
              user.lastName, 
              orgResponse.data.googleWorkspaceDomain
            );
            form.setFieldsValue({
              email: generatedEmail,
              activateServices: true
            });
            setGoogleStatus(prev => prev ? {
              ...prev,
              email: generatedEmail,
              organizationDomain: orgResponse.data.googleWorkspaceDomain
            } : null);
          }
        }
      }
    } catch {
      message.error('Erreur lors de la vérification du statut Google Workspace');
    } finally {
      setChecking(false);
    }
  }, [user, api, form, generateEmail, currentUser?.organizationRole?.role?.name]);

interface CreateGoogleAccountValues {
  email: string;
  activateServices: boolean;
}

  // Créer/activer le compte Google Workspace
  const handleCreateGoogleAccount = async (values: CreateGoogleAccountValues) => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await api.post('/google-workspace/users/create', {
        userId: user.id,
        email: values.email,
        activateServices: values.activateServices || false
      });

      if (response.success) {
        message.success('Compte Google Workspace créé avec succès !');
        await checkGoogleWorkspaceStatus(); // Rafraîchir le statut
        onSuccess();
      }
    } catch {
      message.error('Erreur lors de la création du compte Google Workspace');
    } finally {
      setLoading(false);
    }
  };

  // Synchroniser avec Google Workspace
  const handleSyncGoogleAccount = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await api.post(`/google-workspace/users/${user.id}/sync`);
      if (response.success) {
        message.success('Synchronisation réussie !');
        await checkGoogleWorkspaceStatus();
      }
    } catch {
      message.error('Erreur lors de la synchronisation');
    } finally {
      setLoading(false);
    }
  };

  // Désactiver le compte Google Workspace
  const handleDeactivateGoogleAccount = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await api.post(`/google-workspace/users/${user.id}/deactivate`);
      if (response.success) {
        message.success('Compte Google Workspace désactivé');
        await checkGoogleWorkspaceStatus();
      }
    } catch {
      message.error('Erreur lors de la désactivation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && user) {
      checkGoogleWorkspaceStatus();
    }
  }, [visible, user, checkGoogleWorkspaceStatus]);

  const handleCancel = () => {
    form.resetFields();
    setGoogleStatus(null);
    onCancel();
  };

  return (
    <Modal
      title={
        <Space>
          <GoogleOutlined style={{ color: '#4285F4' }} />
          <span>Gestion Google Workspace</span>
          {user && <Tag color="blue">{user.firstName} {user.lastName}</Tag>}
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={700}
    >
      {/* Vérification des permissions */}
      {!currentUser?.organizationRole?.role?.name || !['admin', 'super_admin'].includes(currentUser.organizationRole.role.name) ? (
        <Alert
          message="Accès restreint"
          description="Vous n'avez pas les permissions nécessaires pour gérer les comptes Google Workspace. Contactez un administrateur."
          type="warning"
          showIcon
          style={{ margin: '20px 0' }}
        />
      ) : checking ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>Vérification du statut Google Workspace...</div>
        </div>
      ) : (
        <>
          {/* Statut actuel */}
          {googleStatus && (
            <Card className="mb-4">
              <Row gutter={16}>
                <Col span={12}>
                  <Space direction="vertical" size="small">
                    <Text strong>Statut du compte</Text>
                    <Space>
                      {googleStatus.hasGoogleAccount ? (
                        <Tag color="green" icon={<CheckCircleOutlined />}>
                          Compte créé
                        </Tag>
                      ) : (
                        <Tag color="orange" icon={<ExclamationCircleOutlined />}>
                          Pas de compte
                        </Tag>
                      )}
                      {googleStatus.isActivated ? (
                        <Tag color="green">Activé</Tag>
                      ) : (
                        <Tag color="red">Désactivé</Tag>
                      )}
                    </Space>
                  </Space>
                </Col>
                <Col span={12}>
                  <Space direction="vertical" size="small">
                    <Text strong>Email Google</Text>
                    <Space>
                      <MailOutlined />
                      <Text code>{googleStatus.email || 'Non défini'}</Text>
                    </Space>
                  </Space>
                </Col>
              </Row>

              {googleStatus.organizationDomain && (
                <Alert
                  message={`Domaine de l'organisation: ${googleStatus.organizationDomain}`}
                  type="info"
                  style={{ marginTop: 16 }}
                />
              )}

              {googleStatus.lastSync && (
                <div style={{ marginTop: 16 }}>
                  <Text type="secondary">
                    Dernière synchronisation: {new Date(googleStatus.lastSync).toLocaleString()}
                  </Text>
                </div>
              )}
            </Card>
          )}

          {/* Formulaire de création/modification */}
          {(!googleStatus?.hasGoogleAccount || !googleStatus?.isActivated) && (
            <Form
              form={form}
              layout="vertical"
              onFinish={handleCreateGoogleAccount}
            >
              <Form.Item
                name="email"
                label="Adresse email Google Workspace"
                rules={[
                  { required: true, message: 'L\'adresse email est requise' },
                  { type: 'email', message: 'Format d\'email invalide' }
                ]}
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="prenom.nom@organisation.be"
                  disabled={loading}
                />
              </Form.Item>

              <Form.Item
                name="activateServices"
                label="Activer les services Google"
                valuePropName="checked"
              >
                <Switch
                  checkedChildren="Oui"
                  unCheckedChildren="Non"
                  disabled={loading}
                />
              </Form.Item>

              <Alert
                message="Information"
                description="La création du compte Google Workspace peut prendre quelques minutes. L'utilisateur recevra un email avec ses informations de connexion."
                type="info"
                style={{ marginBottom: 16 }}
              />

              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  icon={<GoogleOutlined />}
                >
                  {googleStatus?.hasGoogleAccount ? 'Activer le compte' : 'Créer le compte'}
                </Button>
                <Button onClick={handleCancel}>
                  Annuler
                </Button>
              </Space>
            </Form>
          )}

          {/* Actions pour compte existant */}
          {googleStatus?.hasGoogleAccount && googleStatus?.isActivated && (
            <Space direction="vertical" style={{ width: '100%' }}>
              <Divider>Actions disponibles</Divider>
              
              <Row gutter={16}>
                <Col span={8}>
                  <Button
                    block
                    icon={<SyncOutlined />}
                    onClick={handleSyncGoogleAccount}
                    loading={loading}
                  >
                    Synchroniser
                  </Button>
                </Col>
                <Col span={8}>
                  <Button
                    block
                    danger
                    icon={<ExclamationCircleOutlined />}
                    onClick={handleDeactivateGoogleAccount}
                    loading={loading}
                  >
                    Désactiver
                  </Button>
                </Col>
              </Row>

              {/* Services Google activés */}
              {googleStatus.services && (
                <Card title="Services Google activés" size="small" style={{ marginTop: 16 }}>
                  <Space wrap>
                    {Object.entries(googleStatus.services).map(([service, active]) => (
                      <Tag
                        key={service}
                        color={active ? 'green' : 'default'}
                        icon={active ? <CheckCircleOutlined /> : undefined}
                      >
                        {service.charAt(0).toUpperCase() + service.slice(1)}
                      </Tag>
                    ))}
                  </Space>
                </Card>
              )}
            </Space>
          )}
        </>
      )}
    </Modal>
  );
};

export default UserGoogleWorkspaceModal;
