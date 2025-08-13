import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Space,
  Alert,
  Card,
  Table,
  Tag,
  Statistic,
  Row,
  Col,
  message,
  Typography,
  Select,
  Spin
} from 'antd';
import {
  PhoneOutlined,
  SettingOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';

const { Text } = Typography;
const { Option } = Select;

interface TelnyxConfigProps {
  visible: boolean;
  onClose: () => void;
  organizationId: string;
  organizationName: string;
}

interface TelnyxConnection {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'error';
  type: 'voice' | 'messaging' | 'mixed';
  webhook_url?: string;
  created_at: string;
  updated_at: string;
}

interface PhoneNumber {
  id: string;
  phone_number: string;
  status: 'active' | 'pending' | 'ported' | 'disabled';
  country_code: string;
  number_type: 'local' | 'toll-free' | 'national' | 'mobile';
  features: string[];
  monthly_cost: number;
  connection_id?: string;
  purchased_at: string;
}

interface TelnyxStats {
  totalCalls: number;
  totalSms: number;
  monthlyCost: number;
  activeNumbers: number;
}

const TelnyxConfig: React.FC<TelnyxConfigProps> = ({
  visible,
  onClose,
  organizationId,
  organizationName
}) => {
  const { api } = useAuthenticatedApi();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [connections, setConnections] = useState<TelnyxConnection[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [stats, setStats] = useState<TelnyxStats>({
    totalCalls: 0,
    totalSms: 0,
    monthlyCost: 0,
    activeNumbers: 0
  });

  const [configForm] = Form.useForm();
  const [numberForm] = Form.useForm();
  const [isConfigModalVisible, setIsConfigModalVisible] = useState(false);
  const [isNumberModalVisible, setIsNumberModalVisible] = useState(false);

  // Charger les données Telnyx pour cette organisation
  const loadTelnyxData = useCallback(async () => {
    if (!organizationId) return;
    
    setLoading(true);
    try {
      const [connectionsRes, numbersRes, statsRes] = await Promise.all([
        api.get('/telnyx/connections'),
        api.get('/telnyx/phone-numbers'),
        api.get('/telnyx/stats')
      ]);

      setConnections(connectionsRes.data || []);
      setPhoneNumbers(numbersRes.data || []);
      setStats({
        totalCalls: statsRes.data?.totalCalls || 0,
        totalSms: statsRes.data?.totalSms || 0,
        monthlyCost: statsRes.data?.monthlyCost || 0,
        activeNumbers: (numbersRes.data || []).filter((n: PhoneNumber) => n.status === 'active').length
      });
    } catch (error) {
      console.error('❌ Erreur chargement données Telnyx:', error);
      message.error('Erreur lors du chargement des données Telnyx');
    } finally {
      setLoading(false);
    }
  }, [organizationId, api]);

  // Synchroniser avec Telnyx API
  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.post('/telnyx/sync');
      message.success('Synchronisation Telnyx réussie');
      loadTelnyxData();
    } catch (error) {
      console.error('❌ Erreur synchronisation:', error);
      message.error('Erreur lors de la synchronisation');
    } finally {
      setSyncing(false);
    }
  };

  // Sauvegarder la configuration API
  const handleSaveConfig = async (values: { api_key: string; webhook_url?: string; default_connection?: string }) => {
    try {
      await api.post('/telnyx/config', {
        organizationId,
        ...values
      });
      message.success('Configuration Telnyx sauvegardée');
      setIsConfigModalVisible(false);
      loadTelnyxData();
    } catch (error) {
      console.error('❌ Erreur sauvegarde config:', error);
      message.error('Erreur lors de la sauvegarde');
    }
  };

  // Acheter un nouveau numéro
  const handlePurchaseNumber = async (values: { country: string; type: string; area_code?: string }) => {
    try {
      await api.post('/telnyx/phone-numbers/purchase', values);
      message.success('Numéro acheté avec succès');
      setIsNumberModalVisible(false);
      numberForm.resetFields();
      loadTelnyxData();
    } catch (error) {
      console.error('❌ Erreur achat numéro:', error);
      message.error('Erreur lors de l\'achat du numéro');
    }
  };

  useEffect(() => {
    if (visible && organizationId) {
      loadTelnyxData();
    }
  }, [visible, organizationId, loadTelnyxData]);

  const phoneNumberColumns = [
    {
      title: 'Numéro',
      dataIndex: 'phone_number',
      key: 'phone_number',
      render: (number: string) => <Text strong>{number}</Text>
    },
    {
      title: 'Type',
      dataIndex: 'number_type',
      key: 'number_type',
      render: (type: string) => {
        const typeMap = {
          'local': { text: 'Local', color: 'blue' },
          'toll-free': { text: 'Gratuit', color: 'green' },
          'national': { text: 'National', color: 'orange' },
          'mobile': { text: 'Mobile', color: 'purple' }
        };
        const config = typeMap[type as keyof typeof typeMap] || { text: type, color: 'default' };
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap = {
          'active': { text: 'Actif', color: 'success', icon: <CheckCircleOutlined /> },
          'pending': { text: 'En attente', color: 'warning', icon: <SyncOutlined /> },
          'disabled': { text: 'Désactivé', color: 'error', icon: <CloseCircleOutlined /> }
        };
        const config = statusMap[status as keyof typeof statusMap] || { text: status, color: 'default', icon: null };
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      }
    },
    {
      title: 'Coût/mois',
      dataIndex: 'monthly_cost',
      key: 'monthly_cost',
      render: (cost: number) => `$${cost.toFixed(2)}`
    },
    {
      title: 'Fonctionnalités',
      dataIndex: 'features',
      key: 'features',
      render: (features: string[]) => (
        <Space>
          {features.map(feature => (
            <Tag key={feature} size="small">{feature}</Tag>
          ))}
        </Space>
      )
    }
  ];

  return (
    <>
      <Modal
        title={<><PhoneOutlined style={{ color: '#FF6B6B' }} /> Configuration Telnyx - {organizationName}</>}
        open={visible}
        onCancel={onClose}
        width={1200}
        footer={null}
        className="telnyx-config-modal"
      >
        <Spin spinning={loading}>
          {/* Actions */}
          <div style={{ marginBottom: 16 }}>
            <Space>
              <Button 
                icon={<SyncOutlined spin={syncing} />}
                onClick={handleSync}
                loading={syncing}
              >
                Synchroniser
              </Button>
              <Button 
                icon={<SettingOutlined />}
                onClick={() => setIsConfigModalVisible(true)}
              >
                Configuration API
              </Button>
              <Button 
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIsNumberModalVisible(true)}
              >
                Acheter un numéro
              </Button>
            </Space>
          </div>

          {/* Statistiques */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Numéros actifs"
                  value={stats.activeNumbers}
                  prefix={<PhoneOutlined style={{ color: '#52c41a' }} />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Appels ce mois"
                  value={stats.totalCalls}
                  prefix={<PhoneOutlined style={{ color: '#1890ff' }} />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="SMS ce mois"
                  value={stats.totalSms}
                  prefix={<PhoneOutlined style={{ color: '#722ed1' }} />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Coût mensuel"
                  value={stats.monthlyCost}
                  prefix={<DollarOutlined style={{ color: '#fa8c16' }} />}
                  precision={2}
                />
              </Card>
            </Col>
          </Row>

          {/* Configuration */}
          {connections.length === 0 && phoneNumbers.length === 0 && (
            <Alert
              message="Configuration Telnyx requise"
              description="Configurez votre clé API Telnyx et achetez votre premier numéro pour commencer."
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              action={
                <Button 
                  size="small" 
                  type="primary"
                  onClick={() => setIsConfigModalVisible(true)}
                >
                  Configurer
                </Button>
              }
            />
          )}

          {/* Numéros de téléphone */}
          <Card title="📞 Numéros de téléphone" style={{ marginBottom: 16 }}>
            <Table
              dataSource={phoneNumbers}
              columns={phoneNumberColumns}
              rowKey="id"
              pagination={false}
              size="small"
              locale={{ emptyText: 'Aucun numéro configuré' }}
            />
          </Card>

          {/* Connexions */}
          <Card title="🔗 Connexions Telnyx">
            <Table
              dataSource={connections}
              columns={[
                { title: 'Nom', dataIndex: 'name', key: 'name' },
                { 
                  title: 'Statut', 
                  dataIndex: 'status', 
                  key: 'status',
                  render: (status: string) => (
                    <Tag color={status === 'active' ? 'success' : 'error'}>
                      {status === 'active' ? 'Actif' : 'Inactif'}
                    </Tag>
                  )
                },
                { title: 'Type', dataIndex: 'type', key: 'type' },
                { 
                  title: 'Date création', 
                  dataIndex: 'created_at', 
                  key: 'created_at',
                  render: (date: string) => new Date(date).toLocaleDateString()
                }
              ]}
              rowKey="id"
              pagination={false}
              size="small"
              locale={{ emptyText: 'Aucune connexion configurée' }}
            />
          </Card>
        </Spin>
      </Modal>

      {/* Modal Configuration API */}
      <Modal
        title="⚙️ Configuration API Telnyx"
        open={isConfigModalVisible}
        onCancel={() => setIsConfigModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={configForm} layout="vertical" onFinish={handleSaveConfig}>
          <Alert
            message="Configuration API Telnyx"
            description="Entrez vos clés API Telnyx pour activer l'intégration complète."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          
          <Form.Item name="api_key" label="Clé API Telnyx" rules={[{ required: true }]}>
            <Input.Password placeholder="KEY_..." />
          </Form.Item>
          
          <Form.Item name="webhook_url" label="URL Webhook">
            <Input placeholder="https://votre-domaine.com/api/telnyx/webhooks" />
          </Form.Item>
          
          <Form.Item name="default_connection" label="Connexion par défaut">
            <Select placeholder="Sélectionner une connexion">
              {connections.map(conn => (
                <Option key={conn.id} value={conn.id}>{conn.name}</Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Sauvegarder
              </Button>
              <Button onClick={() => setIsConfigModalVisible(false)}>
                Annuler
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Achat Numéro */}
      <Modal
        title="🔢 Acheter un Numéro"
        open={isNumberModalVisible}
        onCancel={() => setIsNumberModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form form={numberForm} layout="vertical" onFinish={handlePurchaseNumber}>
          <Form.Item name="country" label="Pays" rules={[{ required: true }]}>
            <Select placeholder="Sélectionner un pays">
              <Option value="FR">🇫🇷 France</Option>
              <Option value="US">🇺🇸 États-Unis</Option>
              <Option value="CA">🇨🇦 Canada</Option>
              <Option value="GB">🇬🇧 Royaume-Uni</Option>
              <Option value="DE">🇩🇪 Allemagne</Option>
            </Select>
          </Form.Item>
          
          <Form.Item name="type" label="Type de numéro" rules={[{ required: true }]}>
            <Select placeholder="Sélectionner le type">
              <Option value="local">📍 Local</Option>
              <Option value="toll-free">🆓 Numéro vert</Option>
              <Option value="national">🌍 National</Option>
              <Option value="mobile">📱 Mobile</Option>
            </Select>
          </Form.Item>
          
          <Form.Item name="area_code" label="Indicatif régional (optionnel)">
            <Input placeholder="Ex: 01, 02, 03..." />
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
                Acheter
              </Button>
              <Button onClick={() => setIsNumberModalVisible(false)}>
                Annuler
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default TelnyxConfig;
