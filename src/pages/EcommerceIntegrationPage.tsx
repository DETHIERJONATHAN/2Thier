import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Table, Tag, Space, Modal, Form, Input, Select, message, Tabs, Typography, Statistic, Progress } from 'antd';
import { ShopOutlined, PlusOutlined, LinkOutlined, SyncOutlined, ShoppingCartOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { ECOMMERCE_PLATFORMS } from '../services/ecommerceService';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface EcommerceIntegration {
  id: string;
  platform: string;
  name: string;
  url: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
  productCount?: number;
  orderCount?: number;
}

const EcommerceIntegrationPage: React.FC = () => {
  const { api } = useAuthenticatedApi();
  const [msgApi, msgCtx] = message.useMessage();
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<EcommerceIntegration[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [testLoading, setTestLoading] = useState<string | null>(null);
  const [syncLoading, setSyncLoading] = useState<string | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadIntegrations();
  }, [loadIntegrations]);

  const loadIntegrations = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/integrations/ecommerce');
      
      if (response?.success) {
        setIntegrations(response.integrations || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des intégrations:', error);
      // Données de démonstration
      setIntegrations([
        {
          id: '1',
          platform: 'shopify',
          name: 'Boutique Principal Shopify',
          url: 'https://ma-boutique.myshopify.com',
          status: 'connected',
          lastSync: '2025-08-27T10:30:00Z',
          productCount: 125,
          orderCount: 45
        },
        {
          id: '2',
          platform: 'woocommerce',
          name: 'Site WordPress E-commerce',
          url: 'https://mon-site.com',
          status: 'connected',
          lastSync: '2025-08-27T09:15:00Z',
          productCount: 85,
          orderCount: 23
        },
        {
          id: '3',
          platform: 'prestashop',
          name: 'Boutique PrestaShop',
          url: 'https://boutique.example.com',
          status: 'error',
          lastSync: '2025-08-26T14:20:00Z',
          productCount: 0,
          orderCount: 0
        }
      ]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  const handleCreateIntegration = async (values: { platform: string; name: string; url: string; [key: string]: string }) => {
    try {
      const platformConfig = ECOMMERCE_PLATFORMS[values.platform];
      if (!platformConfig) {
        msgApi.error('Plateforme non supportée');
        return;
      }

      // Structurer les credentials selon la plateforme
      const credentials: Record<string, string> = {};
      const config: Record<string, string> = {};
      
      platformConfig.fields.forEach(field => {
        if (values[field.key]) {
          if (field.type === 'password') {
            credentials[field.key] = values[field.key];
          } else {
            config[field.key] = values[field.key];
          }
        }
      });

      const response = await api.post('/integrations/ecommerce', {
        platform: values.platform,
        name: values.name,
        url: values.url,
        config,
        credentials
      });

      if (response?.success) {
        msgApi.success('Intégration créée avec succès');
        setModalVisible(false);
        form.resetFields();
        loadIntegrations();
      }
    } catch (error) {
      console.error('Erreur création intégration:', error);
      msgApi.error('Erreur lors de la création de l\'intégration');
    }
  };

  const handleTestConnection = async (integrationId: string) => {
    try {
      setTestLoading(integrationId);
      const response = await api.post(`/integrations/ecommerce/${integrationId}/test`);
      
      if (response?.success && response.connected) {
        msgApi.success('Connexion réussie !');
      } else {
        msgApi.error('Échec de la connexion');
      }
      
      loadIntegrations();
    } catch (error) {
      console.error('Erreur test connexion:', error);
      msgApi.error('Erreur lors du test de connexion');
    } finally {
      setTestLoading(null);
    }
  };

  const handleSyncProducts = async (integrationId: string) => {
    try {
      setSyncLoading(integrationId);
      const response = await api.put(`/integrations/ecommerce/${integrationId}/sync/products`);
      
      if (response?.success) {
        msgApi.success(response.message || 'Synchronisation réussie');
        loadIntegrations();
      }
    } catch (error) {
      console.error('Erreur synchronisation produits:', error);
      msgApi.error('Erreur lors de la synchronisation des produits');
    } finally {
      setSyncLoading(null);
    }
  };

  const handleSyncOrders = async (integrationId: string) => {
    try {
      setSyncLoading(integrationId);
      const response = await api.put(`/integrations/ecommerce/${integrationId}/sync/orders`);
      
      if (response?.success) {
        msgApi.success(response.message || 'Synchronisation réussie');
        loadIntegrations();
      }
    } catch (error) {
      console.error('Erreur synchronisation commandes:', error);
      msgApi.error('Erreur lors de la synchronisation des commandes');
    } finally {
      setSyncLoading(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'error':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <CloseCircleOutlined style={{ color: '#d9d9d9' }} />;
    }
  };

  const getStatusTag = (status: string) => {
    const colors = {
      connected: 'success',
      disconnected: 'default',
      error: 'error'
    };
    const labels = {
      connected: 'Connecté',
      disconnected: 'Déconnecté',
      error: 'Erreur'
    };
    return <Tag color={colors[status as keyof typeof colors]}>{labels[status as keyof typeof labels]}</Tag>;
  };

  const getPlatformIcon = (platform: string) => {
    const platformConfig = ECOMMERCE_PLATFORMS[platform];
    return platformConfig ? platformConfig.displayName : platform;
  };

  const columns = [
    {
      title: 'Plateforme',
      dataIndex: 'platform',
      key: 'platform',
      render: (platform: string, record: EcommerceIntegration) => (
        <Space>
          <ShopOutlined />
          <div>
            <div><Text strong>{getPlatformIcon(platform)}</Text></div>
            <div><Text type="secondary">{record.name}</Text></div>
          </div>
        </Space>
      ),
    },
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      render: (url: string) => (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <LinkOutlined /> {url}
        </a>
      ),
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Space>
          {getStatusIcon(status)}
          {getStatusTag(status)}
        </Space>
      ),
    },
    {
      title: 'Données',
      key: 'data',
  render: (_: unknown, record: EcommerceIntegration) => (
        <Space direction="vertical" size="small">
          <Text><ShoppingCartOutlined /> {record.productCount || 0} produits</Text>
          <Text>📦 {record.orderCount || 0} commandes</Text>
        </Space>
      ),
    },
    {
      title: 'Dernière sync',
      dataIndex: 'lastSync',
      key: 'lastSync',
      render: (lastSync: string) => (
        lastSync ? new Date(lastSync).toLocaleString('fr-FR') : 'Jamais'
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
  render: (_: unknown, record: EcommerceIntegration) => (
        <Space>
          <Button
            size="small"
            icon={<LinkOutlined />}
            loading={testLoading === record.id}
            onClick={() => handleTestConnection(record.id)}
          >
            Tester
          </Button>
          <Button
            size="small"
            icon={<SyncOutlined />}
            loading={syncLoading === record.id}
            onClick={() => handleSyncProducts(record.id)}
            disabled={record.status !== 'connected'}
          >
            Sync Produits
          </Button>
          <Button
            size="small"
            icon={<SyncOutlined />}
            loading={syncLoading === record.id}
            onClick={() => handleSyncOrders(record.id)}
            disabled={record.status !== 'connected'}
          >
            Sync Commandes
          </Button>
        </Space>
      ),
    },
  ];

  const totalProducts = integrations.reduce((sum, int) => sum + (int.productCount || 0), 0);
  const totalOrders = integrations.reduce((sum, int) => sum + (int.orderCount || 0), 0);
  const connectedIntegrations = integrations.filter(int => int.status === 'connected').length;

  return (
    <div className="p-6">
      {msgCtx}
      <div className="mb-6">
        <Title level={2}>
          <ShopOutlined className="mr-2" />
          Intégrations E-commerce
        </Title>
        <Text type="secondary">
          Connectez vos boutiques en ligne pour synchroniser produits et commandes
        </Text>
      </div>

      {/* Statistiques */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Intégrations Actives"
              value={connectedIntegrations}
              suffix={`/ ${integrations.length}`}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
            <Progress
              percent={integrations.length > 0 ? (connectedIntegrations / integrations.length) * 100 : 0}
              size="small"
              strokeColor="#52c41a"
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Produits Synchronisés"
              value={totalProducts}
              valueStyle={{ color: '#1890ff' }}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Commandes Totales"
              value={totalOrders}
              valueStyle={{ color: '#722ed1' }}
              prefix="📦"
            />
          </Card>
        </Col>
      </Row>

      {/* Actions principales */}
      <div className="mb-6">
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalVisible(true)}
          >
            Nouvelle Intégration
          </Button>
          <Button
            icon={<SyncOutlined />}
            onClick={loadIntegrations}
          >
            Actualiser
          </Button>
        </Space>
      </div>

      {/* Contenu principal */}
      <Tabs defaultActiveKey="integrations">
        <TabPane tab="Mes Intégrations" key="integrations">
          <Card>
            <Table
              columns={columns}
              dataSource={integrations}
              loading={loading}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </TabPane>
        
        <TabPane tab="Plateformes Disponibles" key="platforms">
          <Row gutter={[16, 16]}>
            {Object.values(ECOMMERCE_PLATFORMS).map(platform => (
              <Col xs={24} sm={12} md={8} lg={6} key={platform.id}>
                <Card
                  hoverable
                  actions={[
                    <Button
                      type="primary"
                      block
                      onClick={() => {
                        form.setFieldsValue({ platform: platform.id });
                        setModalVisible(true);
                      }}
                    >
                      Connecter
                    </Button>
                  ]}
                >
                  <div className="text-center">
                    <ShopOutlined style={{ fontSize: '32px', color: '#1890ff', marginBottom: '12px' }} />
                    <Title level={4}>{platform.displayName}</Title>
                    <Text type="secondary">
                      {platform.fields.length} paramètres requis
                    </Text>
                    {platform.webhookSupport && (
                      <div className="mt-2">
                        <Tag color="green">Webhooks</Tag>
                      </div>
                    )}
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </TabPane>
      </Tabs>

      {/* Modal de création d'intégration */}
      <Modal
        title="Nouvelle Intégration E-commerce"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateIntegration}
        >
          <Form.Item
            label="Plateforme"
            name="platform"
            rules={[{ required: true, message: 'Sélectionnez une plateforme' }]}
          >
            <Select placeholder="Choisir la plateforme">
              {Object.values(ECOMMERCE_PLATFORMS).map(platform => (
                <Select.Option key={platform.id} value={platform.id}>
                  {platform.displayName}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Nom de l'intégration"
            name="name"
            rules={[{ required: true, message: 'Nom requis' }]}
          >
            <Input placeholder="Ex: Ma Boutique Principale" />
          </Form.Item>

          <Form.Item
            label="URL"
            name="url"
            rules={[
              { required: true, message: 'URL requise' },
              { type: 'url', message: 'URL invalide' }
            ]}
          >
            <Input placeholder="https://ma-boutique.com" />
          </Form.Item>

          <Form.Item dependencies={['platform']}>
            {({ getFieldValue }) => {
              const selectedPlatform = getFieldValue('platform');
              if (!selectedPlatform) return null;

              const platformConfig = ECOMMERCE_PLATFORMS[selectedPlatform];
              return (
                <div>
                  <Title level={5}>Configuration {platformConfig.displayName}</Title>
                  {platformConfig.fields.map(field => (
                    <Form.Item
                      key={field.key}
                      label={field.label}
                      name={field.key}
                      rules={field.required ? [{ required: true, message: `${field.label} requis` }] : []}
                    >
                      {field.type === 'select' ? (
                        <Select placeholder={field.placeholder}>
                          {field.options?.map(option => (
                            <Select.Option key={option.value} value={option.value}>
                              {option.label}
                            </Select.Option>
                          ))}
                        </Select>
                      ) : (
                        <Input
                          type={field.type === 'password' ? 'password' : 'text'}
                          placeholder={field.placeholder}
                        />
                      )}
                    </Form.Item>
                  ))}
                </div>
              );
            }}
          </Form.Item>

          <Form.Item className="mb-0">
            <Space style={{ float: 'right' }}>
              <Button onClick={() => {
                setModalVisible(false);
                form.resetFields();
              }}>
                Annuler
              </Button>
              <Button type="primary" htmlType="submit">
                Créer l'Intégration
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default EcommerceIntegrationPage;
