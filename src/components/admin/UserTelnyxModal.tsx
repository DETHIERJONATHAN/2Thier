import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Form,
  Switch,
  Alert,
  Card,
  Space,
  Button,
  message,
  Typography,
  Select,
  Input,
  Tag,
  Divider,
  Spin
} from 'antd';
import {
  PhoneOutlined,
  UserOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';

const { Text } = Typography;
const { Option } = Select;

interface UserTelnyxModalProps {
  visible: boolean;
  onClose: () => void;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    organizationId?: string;
  } | null;
}

interface TelnyxUserConfig {
  userId: string;
  isEnabled: boolean;
  assignedNumber?: string;
  canMakeCalls: boolean;
  canSendSms: boolean;
  monthlyLimit?: number;
}

interface PhoneNumber {
  id: string;
  phone_number: string;
  status: 'active' | 'pending' | 'disabled';
  number_type: string;
  features: string[];
  monthly_cost: number;
  assigned_user_id?: string;
}

const UserTelnyxModal: React.FC<UserTelnyxModalProps> = ({
  visible,
  onClose,
  user
}) => {
  const { api } = useAuthenticatedApi();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<TelnyxUserConfig | null>(null);
  const [availableNumbers, setAvailableNumbers] = useState<PhoneNumber[]>([]);
  const [form] = Form.useForm();

  // Charger la configuration Telnyx de l'utilisateur
  const loadUserTelnyxConfig = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Récupérer la configuration utilisateur
      const configResponse = await api.get(`/services/telnyx/status/${user.id}`);
      
      // Récupérer les numéros disponibles de l'organisation
      const numbersResponse = await api.get('/telnyx/phone-numbers');
      
      const userConfig: TelnyxUserConfig = {
        userId: user.id,
        isEnabled: configResponse.data?.isEnabled || false,
        assignedNumber: configResponse.data?.assignedNumber,
        canMakeCalls: configResponse.data?.canMakeCalls || false,
        canSendSms: configResponse.data?.canSendSms || false,
        monthlyLimit: configResponse.data?.monthlyLimit
      };

      setConfig(userConfig);
      setAvailableNumbers(numbersResponse.data || []);
      
      // Préremplir le formulaire
      form.setFieldsValue({
        isEnabled: userConfig.isEnabled,
        assignedNumber: userConfig.assignedNumber,
        canMakeCalls: userConfig.canMakeCalls,
        canSendSms: userConfig.canSendSms,
        monthlyLimit: userConfig.monthlyLimit
      });
      
    } catch (error) {
      console.error('❌ Erreur chargement config Telnyx:', error);
      message.error('Erreur lors du chargement de la configuration');
    } finally {
      setLoading(false);
    }
  }, [user?.id, api, form]);

  // Sauvegarder la configuration
  const handleSaveConfig = async (values: {
    isEnabled: boolean;
    assignedNumber?: string;
    canMakeCalls: boolean;
    canSendSms: boolean;
    monthlyLimit?: number;
  }) => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // Activer/désactiver le service Telnyx pour l'utilisateur
      if (values.isEnabled) {
        await api.post(`/services/telnyx/enable/${user.id}`);
      } else {
        await api.post(`/services/telnyx/disable/${user.id}`);
      }
      
      // Sauvegarder la configuration détaillée
      await api.post('/telnyx/user-config', {
        userId: user.id,
        assignedNumber: values.assignedNumber,
        canMakeCalls: values.canMakeCalls,
        canSendSms: values.canSendSms,
        monthlyLimit: values.monthlyLimit
      });
      
      message.success('Configuration Telnyx mise à jour');
      onClose();
      
    } catch (error) {
      console.error('❌ Erreur sauvegarde:', error);
      message.error('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && user?.id) {
      loadUserTelnyxConfig();
    }
  }, [visible, user?.id, loadUserTelnyxConfig]);

  const freeNumbers = availableNumbers.filter(num => !num.assigned_user_id && num.status === 'active');
  const userNumber = availableNumbers.find(num => num.assigned_user_id === user?.id);

  return (
    <Modal
      title={
        <Space>
          <PhoneOutlined style={{ color: '#FF6B6B' }} />
          Configuration Telnyx - {user?.firstName} {user?.lastName}
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={700}
      footer={null}
    >
      <Spin spinning={loading}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveConfig}
          initialValues={{
            isEnabled: false,
            canMakeCalls: true,
            canSendSms: true
          }}
        >
          {/* Informations utilisateur */}
          <Card size="small" style={{ marginBottom: 16 }}>
            <Space>
              <UserOutlined />
              <div>
                <Text strong>{user?.firstName} {user?.lastName}</Text>
                <br />
                <Text type="secondary">{user?.email}</Text>
              </div>
            </Space>
          </Card>

          {/* Activation du service */}
          <Card title="📞 Activation Telnyx" size="small" style={{ marginBottom: 16 }}>
            <Form.Item 
              name="isEnabled" 
              valuePropName="checked"
              style={{ marginBottom: 0 }}
            >
              <Switch 
                checkedChildren={<CheckCircleOutlined />}
                unCheckedChildren={<CloseCircleOutlined />}
                style={{ marginRight: 8 }}
              />
            </Form.Item>
            
            <Alert
              message="Activation du service Telnyx"
              description="Active ou désactive l'accès aux fonctionnalités Telnyx pour cet utilisateur."
              type="info"
              showIcon
              style={{ marginTop: 12 }}
            />
          </Card>

          {/* Configuration du numéro */}
          <Card title="📱 Attribution de numéro" size="small" style={{ marginBottom: 16 }}>
            <Form.Item
              name="assignedNumber"
              label="Numéro assigné"
              help="Sélectionnez un numéro disponible ou laissez vide pour utiliser les numéros partagés"
            >
              <Select 
                placeholder="Sélectionner un numéro (optionnel)"
                allowClear
                style={{ width: '100%' }}
              >
                {userNumber && (
                  <Option value={userNumber.phone_number} disabled>
                    <Space>
                      <Tag color="blue">Assigné</Tag>
                      {userNumber.phone_number}
                    </Space>
                  </Option>
                )}
                {freeNumbers.map(number => (
                  <Option key={number.id} value={number.phone_number}>
                    <Space>
                      <Tag color="green">Disponible</Tag>
                      {number.phone_number}
                      <Text type="secondary">({number.number_type})</Text>
                    </Space>
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {freeNumbers.length === 0 && !userNumber && (
              <Alert
                message="Aucun numéro disponible"
                description="Tous les numéros de l'organisation sont déjà assignés. L'utilisateur utilisera les numéros partagés."
                type="warning"
                showIcon
              />
            )}
          </Card>

          {/* Permissions */}
          <Card title="🔐 Permissions" size="small" style={{ marginBottom: 16 }}>
            <Form.Item 
              name="canMakeCalls" 
              valuePropName="checked"
              style={{ marginBottom: 12 }}
            >
              <Space>
                <Switch size="small" />
                <Text>Autoriser les appels sortants</Text>
              </Space>
            </Form.Item>

            <Form.Item 
              name="canSendSms" 
              valuePropName="checked"
              style={{ marginBottom: 12 }}
            >
              <Space>
                <Switch size="small" />
                <Text>Autoriser l'envoi de SMS</Text>
              </Space>
            </Form.Item>

            <Divider />

            <Form.Item
              name="monthlyLimit"
              label="Limite mensuelle (USD)"
              help="Limite de dépenses mensuelles pour cet utilisateur (optionnel)"
            >
              <Input 
                type="number" 
                placeholder="Ex: 50" 
                prefix="$"
                style={{ width: 150 }}
              />
            </Form.Item>
          </Card>

          {/* Informations supplémentaires */}
          {config?.isEnabled && (
            <Alert
              message="Service activé"
              description="Cet utilisateur a accès aux fonctionnalités Telnyx. Il peut maintenant utiliser les appels et SMS depuis le CRM."
              type="success"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          {/* Actions */}
          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={onClose}>
                Annuler
              </Button>
              <Button 
                type="primary" 
                htmlType="submit"
                icon={<SettingOutlined />}
                loading={loading}
              >
                Sauvegarder
              </Button>
            </Space>
          </div>
        </Form>
      </Spin>
    </Modal>
  );
};

export default UserTelnyxModal;
