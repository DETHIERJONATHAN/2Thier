import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Modal, 
  Form,
  Input,
  Select,
  Typography,
  Space,
  message,
  Row,
  Col,
  Statistic,
  Tag,
  Badge,
  Popconfirm,
  Tooltip,
  Divider
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CopyOutlined,
  BarChartOutlined,
  GlobalOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface LandingPageFormData {
  title: string;
  slug: string;
  description?: string;
  content?: object;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string;
  customCSS?: string;
  customJS?: string;
  trackingPixels?: string;
}

interface LandingPage {
  id: string;
  title: string;
  slug: string;
  description: string;
  content: object;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  customCSS: string;
  customJS: string;
  trackingPixels: string[];
  publishedAt: string | null;
  views: number;
  conversions: number;
  conversionRate: number;
  createdAt: string;
  updatedAt: string;
}

interface LandingPageStats {
  totalPages: number;
  publishedPages: number;
  draftPages: number;
  totalViews: number;
  totalConversions: number;
  avgConversionRate: number;
}

export default function LandingPagesPage() {
  const { api } = useAuthenticatedApi();
  
  const [landingPages, setLandingPages] = useState<LandingPage[]>([]);
  const [stats, setStats] = useState<LandingPageStats>({
    totalPages: 0,
    publishedPages: 0,
    draftPages: 0,
    totalViews: 0,
    totalConversions: 0,
    avgConversionRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPage, setEditingPage] = useState<LandingPage | null>(null);
  const [form] = Form.useForm();

  // Chargement des données
  const loadLandingPages = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get<{success: boolean, data: LandingPage[]}>('/api/landing-pages');
      setLandingPages(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des landing pages:', error);
      message.error('Impossible de charger les landing pages');
    } finally {
      setLoading(false);
    }
  }, [api]);

  const loadStats = useCallback(async () => {
    try {
      const response = await api.get<{success: boolean, data: LandingPageStats}>('/api/landing-pages/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    }
  }, [api]);

  useEffect(() => {
    loadLandingPages();
    loadStats();
  }, [loadLandingPages, loadStats]);

  // Gestion du formulaire
  const handleCreateOrUpdate = async (values: LandingPageFormData) => {
    try {
      if (editingPage) {
        await api.put(`/api/landing-pages/${editingPage.id}`, values);
        message.success('Landing page mise à jour !');
      } else {
        await api.post('/api/landing-pages', values);
        message.success('Landing page créée !');
      }
      setModalVisible(false);
      setEditingPage(null);
      form.resetFields();
      loadLandingPages();
      loadStats();
    } catch (error: unknown) {
      console.error('Erreur:', error);
      const errorMessage = (error as {response?: {data?: {message?: string}}})?.response?.data?.message || 'Erreur lors de la sauvegarde';
      message.error(errorMessage);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/landing-pages/${id}`);
      message.success('Landing page supprimée !');
      loadLandingPages();
      loadStats();
    } catch (error: unknown) {
      console.error('Erreur:', error);
      const errorMessage = (error as {response?: {data?: {message?: string}}})?.response?.data?.message || 'Erreur lors de la suppression';
      message.error(errorMessage);
    }
  };

  const handlePublish = async (id: string, publish: boolean) => {
    try {
      await api.patch(`/api/landing-pages/${id}/publish`, { publish });
      message.success(`Landing page ${publish ? 'publiée' : 'dépubliée'} !`);
      loadLandingPages();
      loadStats();
    } catch (error: unknown) {
      console.error('Erreur:', error);
      const errorMessage = (error as {response?: {data?: {message?: string}}})?.response?.data?.message || 'Erreur lors de la publication';
      message.error(errorMessage);
    }
  };

  const handleClone = async (page: LandingPage) => {
    try {
      await api.post('/api/landing-pages', {
        ...page,
        title: `${page.title} (Copie)`,
        slug: `${page.slug}-copy-${Date.now()}`,
        status: 'DRAFT'
      });
      message.success('Landing page clonée !');
      loadLandingPages();
      loadStats();
    } catch (error: unknown) {
      console.error('Erreur:', error);
      const errorMessage = (error as {response?: {data?: {message?: string}}})?.response?.data?.message || 'Erreur lors du clonage';
      message.error(errorMessage);
    }
  };

  const openModal = (page?: LandingPage) => {
    setEditingPage(page || null);
    if (page) {
      form.setFieldsValue({
        ...page,
        keywords: page.keywords?.join(', ') || '',
        trackingPixels: page.trackingPixels?.join('\n') || ''
      });
    } else {
      form.resetFields();
    }
    setModalVisible(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return 'green';
      case 'DRAFT': return 'orange';
      case 'ARCHIVED': return 'red';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return <CheckCircleOutlined />;
      case 'DRAFT': return <ClockCircleOutlined />;
      case 'ARCHIVED': return <ExclamationCircleOutlined />;
      default: return null;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success('URL copiée dans le presse-papier !');
  };

  const columns = [
    {
      title: 'Titre',
      dataIndex: 'title',
      key: 'title',
      width: 250,
      render: (title: string, record: LandingPage) => (
        <div>
          <div className="font-semibold">{title}</div>
          <Text type="secondary" className="text-xs">
            /{record.slug}
          </Text>
        </div>
      )
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
          {status === 'PUBLISHED' ? 'Publié' : 
           status === 'DRAFT' ? 'Brouillon' : 'Archivé'}
        </Tag>
      )
    },
    {
      title: 'Performance',
      key: 'performance',
      width: 180,
      render: (_: unknown, record: LandingPage) => (
        <Space direction="vertical" size="small">
          <div className="flex items-center gap-2">
            <EyeOutlined />
            <span className="text-sm">{record.views} vues</span>
          </div>
          <div className="flex items-center gap-2">
            <BarChartOutlined />
            <span className="text-sm">{record.conversions} conversions</span>
            {record.conversionRate > 0 && (
              <Badge
                count={`${record.conversionRate.toFixed(1)}%`}
                style={{ backgroundColor: record.conversionRate > 5 ? '#52c41a' : '#faad14' }}
              />
            )}
          </div>
        </Space>
      )
    },
    {
      title: 'Dernière modification',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 150,
      render: (date: string) => new Date(date).toLocaleDateString('fr-FR')
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_: unknown, record: LandingPage) => (
        <Space>
          <Tooltip title="Voir la page">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => window.open(`/api/landing-pages/public/${record.slug}`, '_blank')}
            />
          </Tooltip>
          
          <Tooltip title="Modifier">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => openModal(record)}
            />
          </Tooltip>
          
          <Tooltip title="Cloner">
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleClone(record)}
            />
          </Tooltip>

          <Tooltip title="Copier URL">
            <Button
              size="small"
              icon={<GlobalOutlined />}
              onClick={() => copyToClipboard(`${window.location.origin}/api/landing-pages/public/${record.slug}`)}
            />
          </Tooltip>

          {record.status === 'PUBLISHED' ? (
            <Tooltip title="Dépublier">
              <Button
                size="small"
                type="default"
                onClick={() => handlePublish(record.id, false)}
              >
                Dépublier
              </Button>
            </Tooltip>
          ) : (
            <Tooltip title="Publier">
              <Button
                size="small"
                type="primary"
                onClick={() => handlePublish(record.id, true)}
              >
                Publier
              </Button>
            </Tooltip>
          )}
          
          <Popconfirm
            title="Supprimer cette landing page ?"
            description="Cette action est irréversible."
            onConfirm={() => handleDelete(record.id)}
            okText="Supprimer"
            cancelText="Annuler"
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <Title level={2} className="mb-0">
              <GlobalOutlined className="mr-2" />
              Landing Pages
            </Title>
            <Text type="secondary">
              Créez et gérez vos pages de destination pour vos campagnes marketing
            </Text>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openModal()}
            size="large"
          >
            Nouvelle Landing Page
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} lg={4}>
          <Card>
            <Statistic
              title="Total Pages"
              value={stats.totalPages}
              prefix={<GlobalOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card>
            <Statistic
              title="Publiées"
              value={stats.publishedPages}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card>
            <Statistic
              title="Brouillons"
              value={stats.draftPages}
              valueStyle={{ color: '#fa8c16' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card>
            <Statistic
              title="Vues Totales"
              value={stats.totalViews}
              prefix={<EyeOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card>
            <Statistic
              title="Conversions"
              value={stats.totalConversions}
              valueStyle={{ color: '#1890ff' }}
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <Card>
            <Statistic
              title="Taux Moyen"
              value={stats.avgConversionRate}
              precision={1}
              suffix="%"
              valueStyle={{ color: stats.avgConversionRate > 5 ? '#3f8600' : '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Tableau */}
      <Card>
        <Table
          columns={columns}
          dataSource={landingPages}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `${total} landing pages au total`
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* Modal de création/édition */}
      <Modal
        title={editingPage ? 'Modifier la Landing Page' : 'Nouvelle Landing Page'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingPage(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText={editingPage ? 'Mettre à jour' : 'Créer'}
        cancelText="Annuler"
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateOrUpdate}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Titre"
                name="title"
                rules={[{ required: true, message: 'Le titre est requis' }]}
              >
                <Input placeholder="Titre de la landing page" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Slug (URL)"
                name="slug"
                rules={[
                  { required: true, message: 'Le slug est requis' },
                  { pattern: /^[a-z0-9-]+$/, message: 'Seuls les lettres minuscules, chiffres et tirets sont autorisés' }
                ]}
              >
                <Input placeholder="mon-slug" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Description"
            name="description"
          >
            <TextArea rows={3} placeholder="Description de la landing page" />
          </Form.Item>

          <Divider>Référencement SEO</Divider>

          <Form.Item
            label="Titre SEO"
            name="metaTitle"
          >
            <Input placeholder="Titre pour les moteurs de recherche" />
          </Form.Item>

          <Form.Item
            label="Description SEO"
            name="metaDescription"
          >
            <TextArea rows={2} placeholder="Description pour les moteurs de recherche" />
          </Form.Item>

          <Form.Item
            label="Mots-clés"
            name="keywords"
          >
            <Input placeholder="mot1, mot2, mot3" />
          </Form.Item>

          <Divider>Apparence</Divider>

          <Form.Item
            label="CSS Personnalisé"
            name="customCSS"
          >
            <TextArea rows={4} placeholder="/* CSS personnalisé */" />
          </Form.Item>

          <Form.Item
            label="JavaScript Personnalisé"
            name="customJS"
          >
            <TextArea rows={4} placeholder="// JavaScript personnalisé" />
          </Form.Item>

          <Form.Item
            label="Pixels de Tracking"
            name="trackingPixels"
          >
            <TextArea
              rows={3}
              placeholder="Un pixel par ligne (Google Analytics, Facebook Pixel, etc.)"
            />
          </Form.Item>

          <Form.Item
            label="Statut"
            name="status"
            initialValue="DRAFT"
          >
            <Select>
              <Select.Option value="DRAFT">Brouillon</Select.Option>
              <Select.Option value="PUBLISHED">Publié</Select.Option>
              <Select.Option value="ARCHIVED">Archivé</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
