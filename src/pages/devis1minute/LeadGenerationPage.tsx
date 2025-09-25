import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Modal, 
  Form,
  Input,
  Select,
  InputNumber,
  Switch,
  Typography,
  Space,
  message,
  Row,
  Col,
  Statistic,
  Tag,
  Tooltip,
  Badge,
  Progress,
  Drawer,
  DatePicker,
  Tabs
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  CopyOutlined,
  BarChartOutlined,
  SettingOutlined,
  RocketOutlined,
  DollarOutlined,
  CalendarOutlined,
  UserOutlined,
  LinkOutlined,
  BulbOutlined,
  FireOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  GoogleOutlined,
  FacebookOutlined,
  LinkedinOutlined,
  TwitterOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';

dayjs.locale('fr');

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;

interface Campaign {
  id: string;
  name: string;
  description: string;
  category: string;
  targetPostalCodes: string[];
  budget: number;
  spentBudget: number;
  costPerLead: number;
  status: 'active' | 'paused' | 'completed' | 'draft';
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  leadsGenerated: number;
  leadsPublished: number;
  conversionRate: number;
  qualityScore: number;
  createdAt: string;
  startDate?: string;
  endDate?: string;
  isAutomatic: boolean; // Génération automatique de leads
  targetAudience: string[];
  landingPageUrl?: string;
}

interface CampaignStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalLeads: number;
  thisMonthLeads: number;
}

interface CampaignFormProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: any) => void;
  loading: boolean;
  campaign?: Campaign;
  isEdit?: boolean;
}

const CampaignForm: React.FC<CampaignFormProps> = ({ 
  open, 
  onCancel, 
  onSubmit, 
  loading, 
  campaign, 
  isEdit = false 
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open && campaign && isEdit) {
      form.setFieldsValue({
        ...campaign,
        startDate: campaign.startDate ? dayjs(campaign.startDate) : null,
        endDate: campaign.endDate ? dayjs(campaign.endDate) : null,
      });
    } else if (open && !isEdit) {
      form.resetFields();
    }
  }, [open, campaign, isEdit, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const formattedValues = {
        ...values,
        startDate: values.startDate ? values.startDate.toISOString() : null,
        endDate: values.endDate ? values.endDate.toISOString() : null,
        targetPostalCodes: values.targetPostalCodes || [],
        targetAudience: values.targetAudience || [],
      };
      onSubmit(formattedValues);
    } catch (error) {
      console.error('Erreur de validation:', error);
    }
  };

  return (
    <Modal
      title={
        <Space>
          {isEdit ? <EditOutlined /> : <PlusOutlined />}
          {isEdit ? 'Modifier la campagne' : 'Nouvelle campagne'}
        </Space>
      }
      open={open}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      okText={isEdit ? 'Mettre à jour' : 'Créer'}
      cancelText="Annuler"
      width={800}
    >
      <Form form={form} layout="vertical">
        <Tabs defaultActiveKey="1">
          <TabPane tab="Informations générales" key="1">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item 
                  name="name" 
                  label="Nom de la campagne" 
                  rules={[{ required: true, message: 'Nom requis' }]}
                >
                  <Input placeholder="Ex: Campagne Rénovation Paris" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item 
                  name="category" 
                  label="Catégorie" 
                  rules={[{ required: true, message: 'Catégorie requise' }]}
                >
                  <Select placeholder="Sélectionner une catégorie">
                    <Select.Option value="renovation">Rénovation</Select.Option>
                    <Select.Option value="construction">Construction</Select.Option>
                    <Select.Option value="plomberie">Plomberie</Select.Option>
                    <Select.Option value="electricite">Électricité</Select.Option>
                    <Select.Option value="chauffage">Chauffage</Select.Option>
                    <Select.Option value="jardinage">Jardinage</Select.Option>
                    <Select.Option value="isolation">Isolation</Select.Option>
                    <Select.Option value="menuiserie">Menuiserie</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="description" label="Description">
              <TextArea 
                rows={3}
                placeholder="Décrivez votre campagne et son objectif..."
              />
            </Form.Item>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item 
                  name="budget" 
                  label="Budget total (€)" 
                  rules={[{ required: true, message: 'Budget requis' }]}
                >
                  <InputNumber 
                    min={10}
                    step={10}
                    style={{ width: '100%' }}
                    placeholder="100"
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item 
                  name="costPerLead" 
                  label="Coût par lead (€)" 
                  rules={[{ required: true, message: 'Coût par lead requis' }]}
                >
                  <InputNumber 
                    min={1}
                    step={0.5}
                    style={{ width: '100%' }}
                    placeholder="5"
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="isAutomatic" label="Génération auto" valuePropName="checked">
                  <Switch checkedChildren="Oui" unCheckedChildren="Non" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="startDate" label="Date de début">
                  <DatePicker 
                    showTime 
                    style={{ width: '100%' }}
                    placeholder="Sélectionner la date de début"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="endDate" label="Date de fin">
                  <DatePicker 
                    showTime 
                    style={{ width: '100%' }}
                    placeholder="Sélectionner la date de fin"
                  />
                </Form.Item>
              </Col>
            </Row>
          </TabPane>

          <TabPane tab="Ciblage" key="2">
            <Form.Item name="targetPostalCodes" label="Codes postaux ciblés">
              <Select
                mode="tags"
                style={{ width: '100%' }}
                placeholder="Entrez les codes postaux (ex: 1000, 1200, 1180)"
                tokenSeparators={[',', ' ']}
              />
            </Form.Item>

            <Form.Item name="targetAudience" label="Audience cible">
              <Select
                mode="multiple"
                style={{ width: '100%' }}
                placeholder="Sélectionner les types de clients"
              >
                <Select.Option value="particulier">Particuliers</Select.Option>
                <Select.Option value="professionnel">Professionnels</Select.Option>
                <Select.Option value="proprietaire">Propriétaires</Select.Option>
                <Select.Option value="locataire">Locataires</Select.Option>
                <Select.Option value="copropriete">Copropriétés</Select.Option>
                <Select.Option value="entreprise">Entreprises</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item name="landingPageUrl" label="Page de destination (optionnel)">
              <Input 
                placeholder="https://votre-site.com/landing-page"
                prefix={<LinkOutlined />}
              />
            </Form.Item>
          </TabPane>

          <TabPane tab="Tracking UTM" key="3">
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item 
                  name="utmSource" 
                  label="UTM Source" 
                  rules={[{ required: true, message: 'UTM Source requis' }]}
                >
                  <Input placeholder="devis1minute" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item 
                  name="utmMedium" 
                  label="UTM Medium" 
                  rules={[{ required: true, message: 'UTM Medium requis' }]}
                >
                  <Input placeholder="marketplace" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item 
                  name="utmCampaign" 
                  label="UTM Campaign" 
                  rules={[{ required: true, message: 'UTM Campaign requis' }]}
                >
                  <Input placeholder="renovation-paris" />
                </Form.Item>
              </Col>
            </Row>

            <Card className="bg-gray-50" size="small">
              <Title level={5}>URL de tracking générée :</Title>
              <Text code className="break-all">
                {form.getFieldValue('landingPageUrl') || 'https://votre-site.com'}
                ?utm_source={form.getFieldValue('utmSource') || 'devis1minute'}
                &utm_medium={form.getFieldValue('utmMedium') || 'marketplace'}
                &utm_campaign={form.getFieldValue('utmCampaign') || 'campaign'}
              </Text>
            </Card>
          </TabPane>
        </Tabs>
      </Form>
    </Modal>
  );
};

export default function LeadGenerationPage() {
  const { api } = useAuthenticatedApi();
  
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<CampaignStats>({
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalLeads: 0,
    thisMonthLeads: 0
  });
  const [loading, setLoading] = useState(true);
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [detailsDrawerVisible, setDetailsDrawerVisible] = useState(false);

  // Chargement des données
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [campaignsResponse, statsResponse] = await Promise.all([
        api.get<{success: boolean, data: Campaign[]}>('/api/lead-generation/campaigns'),
        api.get<{success: boolean, data: CampaignStats}>('/api/lead-generation/stats')
      ]);
      
      // Extraire les données du wrapper de réponse API
      setCampaigns(campaignsResponse.data || []);
      setStats(statsResponse.data || {
        totalCampaigns: 0,
        activeCampaigns: 0,
        totalLeads: 0,
        thisMonthLeads: 0
      });
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      message.error('Impossible de charger les campagnes');
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateCampaign = async (values: any) => {
    setFormLoading(true);
    try {
      await api.post('/api/lead-generation/campaigns', values);
      message.success('Campagne créée avec succès !');
      setFormModalVisible(false);
      loadData();
    } catch (error: unknown) {
      console.error('Erreur lors de la création:', error);
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as any).response?.data?.message 
        : 'Erreur lors de la création de la campagne';
      message.error(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateCampaign = async (values: any) => {
    if (!selectedCampaign) return;
    
    setFormLoading(true);
    try {
      await api.put(`/api/lead-generation/campaigns/${selectedCampaign.id}`, values);
      message.success('Campagne mise à jour avec succès !');
      setFormModalVisible(false);
      setSelectedCampaign(null);
      setIsEditMode(false);
      loadData();
    } catch (error: unknown) {
      console.error('Erreur lors de la mise à jour:', error);
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as any).response?.data?.message 
        : 'Erreur lors de la mise à jour de la campagne';
      message.error(errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleCampaignStatus = async (campaign: Campaign) => {
    const newStatus = campaign.status === 'active' ? 'paused' : 'active';
    try {
      await api.patch(`/api/lead-generation/campaigns/${campaign.id}/status`, { status: newStatus });
      message.success(`Campagne ${newStatus === 'active' ? 'activée' : 'mise en pause'} !`);
      loadData();
    } catch (error) {
      console.error('Erreur lors du changement de statut:', error);
      message.error('Erreur lors du changement de statut');
    }
  };

  const handleDuplicateCampaign = async (campaign: Campaign) => {
    try {
      await api.post(`/api/lead-generation/campaigns/${campaign.id}/duplicate`);
      message.success('Campagne dupliquée avec succès !');
      loadData();
    } catch (error) {
      console.error('Erreur lors de la duplication:', error);
      message.error('Erreur lors de la duplication');
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    try {
      await api.delete(`/api/lead-generation/campaigns/${campaignId}`);
      message.success('Campagne supprimée avec succès !');
      loadData();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      message.error('Erreur lors de la suppression');
    }
  };

  const openEditModal = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setIsEditMode(true);
    setFormModalVisible(true);
  };

  const openCreateModal = () => {
    setSelectedCampaign(null);
    setIsEditMode(false);
    setFormModalVisible(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'paused': return 'orange';
      case 'completed': return 'blue';
      case 'draft': return 'default';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'paused': return 'En pause';
      case 'completed': return 'Terminée';
      case 'draft': return 'Brouillon';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <PlayCircleOutlined />;
      case 'paused': return <PauseCircleOutlined />;
      case 'completed': return <CheckCircleOutlined />;
      case 'draft': return <EditOutlined />;
      default: return <CloseCircleOutlined />;
    }
  };

  const getQualityScoreColor = (score: number) => {
    if (score >= 80) return '#52c41a';
    if (score >= 60) return '#faad14';
    return '#f5222d';
  };

  const columns = [
    {
      title: 'Campagne',
      key: 'campaign',
      width: 250,
      render: (_: unknown, record: Campaign) => (
        <div>
          <div className="font-semibold flex items-center gap-2">
            {record.name}
            {record.isAutomatic && (
              <Badge count="AUTO" style={{ backgroundColor: '#722ed1' }} />
            )}
          </div>
          <Text type="secondary" className="text-xs">
            {record.category} • {record.targetPostalCodes.join(', ')}
          </Text>
          <div className="mt-1">
            <Text type="secondary" className="text-xs">
              Créée {dayjs(record.createdAt).fromNow()}
            </Text>
          </div>
        </div>
      )
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      filters: [
        { text: 'Active', value: 'active' },
        { text: 'En pause', value: 'paused' },
        { text: 'Terminée', value: 'completed' },
        { text: 'Brouillon', value: 'draft' }
      ],
      onFilter: (value, record) => record.status === value,
      render: (status: string) => (
        <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
          {getStatusText(status)}
        </Tag>
      )
    },
    {
      title: 'Budget',
      key: 'budget',
      width: 150,
      render: (_: unknown, record: Campaign) => (
        <div>
          <Progress
            percent={(record.spentBudget / record.budget) * 100}
            size="small"
            status={record.spentBudget >= record.budget * 0.9 ? 'exception' : 'active'}
          />
          <Text className="text-xs">
            {record.spentBudget}€ / {record.budget}€
          </Text>
        </div>
      )
    },
    {
      title: 'Performance',
      key: 'performance',
      width: 180,
      render: (_: unknown, record: Campaign) => (
        <div>
          <Row gutter={8}>
            <Col span={12}>
              <Statistic
                title="Leads"
                value={record.leadsGenerated}
                valueStyle={{ fontSize: '14px', color: '#1890ff' }}
              />
            </Col>
            <Col span={12}>
              <Statistic
                title="Publiés"
                value={record.leadsPublished}
                valueStyle={{ fontSize: '14px', color: '#52c41a' }}
              />
            </Col>
          </Row>
          <div className="mt-1">
            <Text className="text-xs">
              Conversion: {record.conversionRate.toFixed(1)}%
            </Text>
          </div>
        </div>
      )
    },
    {
      title: 'Qualité',
      dataIndex: 'qualityScore',
      key: 'qualityScore',
      width: 100,
      sorter: (a: Campaign, b: Campaign) => a.qualityScore - b.qualityScore,
      render: (score: number) => (
        <Tooltip title={`Score de qualité: ${score}/100`}>
          <Badge
            count={`${score}%`}
            style={{ backgroundColor: getQualityScoreColor(score) }}
          />
        </Tooltip>
      )
    },
    {
      title: 'CPL',
      dataIndex: 'costPerLead',
      key: 'costPerLead',
      width: 80,
      sorter: (a: Campaign, b: Campaign) => a.costPerLead - b.costPerLead,
      render: (cost: number) => (
        <Text strong style={{ color: cost > 10 ? '#f5222d' : '#52c41a' }}>
          {cost.toFixed(2)}€
        </Text>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      render: (_: unknown, record: Campaign) => (
        <Space>
          <Tooltip title={record.status === 'active' ? 'Mettre en pause' : 'Activer'}>
            <Button
              size="small"
              type={record.status === 'active' ? 'default' : 'primary'}
              icon={record.status === 'active' ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={() => handleToggleCampaignStatus(record)}
            />
          </Tooltip>
          <Tooltip title="Modifier">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
            />
          </Tooltip>
          <Tooltip title="Dupliquer">
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleDuplicateCampaign(record)}
            />
          </Tooltip>
          <Tooltip title="Détails">
            <Button
              size="small"
              icon={<BarChartOutlined />}
              onClick={() => {
                setSelectedCampaign(record);
                setDetailsDrawerVisible(true);
              }}
            />
          </Tooltip>
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
              <RocketOutlined className="mr-2" />
              Mes campagnes de génération de leads
            </Title>
            <Text type="secondary">
              Créez et gérez vos campagnes d'acquisition de leads
            </Text>
          </div>
          <Button 
            type="primary" 
            size="large"
            icon={<PlusOutlined />}
            onClick={openCreateModal}
          >
            Nouvelle campagne
          </Button>
        </div>

        {/* Statistiques */}
        <Row gutter={16} className="mb-6">
          <Col span={6}>
            <Card>
              <Statistic
                title="Campagnes totales"
                value={stats.totalCampaigns}
                prefix={<RocketOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Campagnes actives"
                value={stats.activeCampaigns}
                prefix={<FireOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Leads générés"
                value={stats.totalLeads}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Ce mois-ci"
                value={stats.thisMonthLeads}
                suffix="leads"
                prefix={<CalendarOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      {/* Aide rapide */}
      {campaigns.length === 0 && !loading && (
        <Card className="mb-6 bg-blue-50">
          <div className="text-center">
            <BulbOutlined className="text-4xl text-blue-500 mb-4" />
            <Title level={4}>Créez votre première campagne !</Title>
            <Paragraph type="secondary">
              Une campagne vous permet de générer automatiquement des leads qualifiés 
              dans votre secteur d'activité et zone géographique.
            </Paragraph>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
              Créer ma première campagne
            </Button>
          </div>
        </Card>
      )}

      {/* Tableau des campagnes */}
      <Card>
        <Table
          columns={columns}
          dataSource={Array.isArray(campaigns) ? campaigns : []}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `${total} campagnes au total`
          }}
          scroll={{ x: 1200 }}
          size="middle"
        />
      </Card>

      {/* Modal de création/modification */}
      <CampaignForm
        open={formModalVisible}
        onCancel={() => {
          setFormModalVisible(false);
          setSelectedCampaign(null);
          setIsEditMode(false);
        }}
        onSubmit={isEditMode ? handleUpdateCampaign : handleCreateCampaign}
        loading={formLoading}
        campaign={selectedCampaign || undefined}
        isEdit={isEditMode}
      />

      {/* Drawer de détails */}
      <Drawer
        title={
          <Space>
            <BarChartOutlined />
            Détails de la campagne
          </Space>
        }
        width={600}
        open={detailsDrawerVisible}
        onClose={() => {
          setDetailsDrawerVisible(false);
          setSelectedCampaign(null);
        }}
      >
        {selectedCampaign && (
          <div className="space-y-4">
            <Card title="Informations générales" size="small">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Nom">{selectedCampaign.name}</Descriptions.Item>
                <Descriptions.Item label="Catégorie">{selectedCampaign.category}</Descriptions.Item>
                <Descriptions.Item label="Description">{selectedCampaign.description || 'Aucune description'}</Descriptions.Item>
                <Descriptions.Item label="Zones ciblées">
                  {selectedCampaign.targetPostalCodes.map(code => (
                    <Tag key={code} className="mb-1">{code}</Tag>
                  ))}
                </Descriptions.Item>
                <Descriptions.Item label="Audience">
                  {selectedCampaign.targetAudience.map(audience => (
                    <Tag key={audience} color="blue" className="mb-1">{audience}</Tag>
                  ))}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Card title="Performance" size="small">
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic title="Leads générés" value={selectedCampaign.leadsGenerated} />
                </Col>
                <Col span={12}>
                  <Statistic title="Leads publiés" value={selectedCampaign.leadsPublished} />
                </Col>
              </Row>
              <Row gutter={16} className="mt-4">
                <Col span={12}>
                  <Statistic 
                    title="Taux de conversion" 
                    value={selectedCampaign.conversionRate} 
                    suffix="%" 
                    precision={1}
                  />
                </Col>
                <Col span={12}>
                  <Statistic 
                    title="Score qualité" 
                    value={selectedCampaign.qualityScore} 
                    suffix="/100"
                  />
                </Col>
              </Row>
            </Card>

            <Card title="Budget" size="small">
              <Progress
                percent={(selectedCampaign.spentBudget / selectedCampaign.budget) * 100}
                strokeColor={selectedCampaign.spentBudget >= selectedCampaign.budget * 0.9 ? '#f5222d' : '#52c41a'}
                className="mb-4"
              />
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic 
                    title="Budget total" 
                    value={selectedCampaign.budget} 
                    suffix="€"
                  />
                </Col>
                <Col span={8}>
                  <Statistic 
                    title="Dépensé" 
                    value={selectedCampaign.spentBudget} 
                    suffix="€"
                  />
                </Col>
                <Col span={8}>
                  <Statistic 
                    title="Restant" 
                    value={selectedCampaign.budget - selectedCampaign.spentBudget} 
                    suffix="€"
                  />
                </Col>
              </Row>
              <div className="mt-4">
                <Statistic 
                  title="Coût par lead" 
                  value={selectedCampaign.costPerLead} 
                  suffix="€"
                  precision={2}
                />
              </div>
            </Card>

            <Card title="Tracking UTM" size="small">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="UTM Source">
                  <Text code>{selectedCampaign.utmSource}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="UTM Medium">
                  <Text code>{selectedCampaign.utmMedium}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="UTM Campaign">
                  <Text code>{selectedCampaign.utmCampaign}</Text>
                </Descriptions.Item>
                {selectedCampaign.landingPageUrl && (
                  <Descriptions.Item label="Landing Page">
                    <a href={selectedCampaign.landingPageUrl} target="_blank" rel="noopener noreferrer">
                      {selectedCampaign.landingPageUrl}
                    </a>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          </div>
        )}
      </Drawer>
    </div>
  );
}
