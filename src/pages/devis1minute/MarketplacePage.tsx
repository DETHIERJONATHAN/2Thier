import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Select, 
  Form, 
  Input,
  Tag,
  Typography,
  Space,
  Badge,
  Modal,
  message,
  Row,
  Col,
  Statistic,
  Alert,
  Tooltip
} from 'antd';
import {
  ShoppingCartOutlined,
  FilterOutlined,
  EyeOutlined,
  CreditCardOutlined,
  FireOutlined,
  UserOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  SaveOutlined,
  BellOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';

const { Title, Text } = Typography;
const { Option } = Select;

interface MarketplaceLead {
  id: string;
  leadId: string;
  price: number;
  exclusivePrice: number;
  maxPartners: number;
  currentPartners: number;
  status: 'AVAILABLE' | 'PURCHASED' | 'EXPIRED' | 'RESERVED';
  targetSectors: string[];
  targetRegions: string[];
  minRating: number | null;
  publishedAt: string;
  expiresAt: string | null;
  aiScore: number;
  urgencyScore: number;
  qualityScore: number;
  aiAnalysis: string | null;
  createdAt: string;
  updatedAt: string;
  lead: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    company: string;
  };
}

// Interface pour la compatibilité avec le composant existant
interface Lead {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  postalCode: string;
  urgency: 'low' | 'medium' | 'high';
  publishedAt: string;
  purchaseCount: number;
  maxPurchases: number;
  isAvailable: boolean;
  tags: string[];
  estimatedValue: number;
}

interface MarketplaceStats {
  totalLeads: number;
  availableLeads: number;
  avgPrice: number;
  newToday: number;
}

interface SavedSearch {
  id: string;
  name: string;
  filters: FilterState;
}

interface FilterState {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  postalCode: string;
  urgency?: string;
  newOnly: boolean;
  availableOnly: boolean;
}

interface PurchaseModalProps {
  lead: Lead | null;
  open: boolean;
  onCancel: () => void;
  onConfirm: (leadId: string) => void;
  loading: boolean;
}

const PurchaseModal: React.FC<PurchaseModalProps> = ({ 
  lead, 
  open, 
  onCancel, 
  onConfirm, 
  loading 
}) => {
  if (!lead) return null;

  return (
    <Modal
      title={
        <Space>
          <ShoppingCartOutlined />
          Confirmer l'achat du lead
        </Space>
      }
      open={open}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Annuler
        </Button>,
        <Button
          key="confirm"
          type="primary"
          loading={loading}
          onClick={() => onConfirm(lead.id)}
          icon={<CreditCardOutlined />}
        >
          Acheter pour {lead.price} crédits
        </Button>,
      ]}
      width={600}
    >
      <div className="space-y-4">
        <Alert
          message="Aperçu du lead"
          description={
            <div className="mt-2">
              <p><strong>Titre :</strong> {lead.title}</p>
              <p><strong>Description :</strong> {lead.description}</p>
              <p><strong>Localisation :</strong> {lead.postalCode}</p>
              <p><strong>Valeur estimée :</strong> {lead.estimatedValue}€</p>
            </div>
          }
          type="info"
          showIcon
        />
        
        <Row gutter={16}>
          <Col span={12}>
            <Statistic
              title="Prix d'achat"
              value={lead.price}
              suffix="crédits"
              valueStyle={{ color: '#cf1322' }}
            />
          </Col>
          <Col span={12}>
            <Statistic
              title="Autres acheteurs"
              value={`${lead.purchaseCount}/${lead.maxPurchases}`}
              valueStyle={{ color: lead.purchaseCount >= lead.maxPurchases ? '#cf1322' : '#3f8600' }}
            />
          </Col>
        </Row>

        {lead.tags.length > 0 && (
          <div>
            <Text strong>Tags :</Text>
            <div className="mt-1">
              {lead.tags.map(tag => (
                <Tag key={tag} color="blue" className="mb-1">
                  {tag}
                </Tag>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

// Fonction pour transformer les données de l'API vers l'interface Lead
const transformMarketplaceLeadToLead = (marketplaceLead: MarketplaceLead): Lead => {
  const fullName = `${marketplaceLead.lead.firstName} ${marketplaceLead.lead.lastName}`.trim();
  
  return {
    id: marketplaceLead.id,
    title: fullName || marketplaceLead.lead.company || 'Lead sans nom',
    description: `Lead de ${marketplaceLead.lead.company || 'entreprise non spécifiée'} - ${marketplaceLead.lead.email}`,
    price: marketplaceLead.price,
    category: marketplaceLead.targetSectors[0] || 'Non spécifié',
    postalCode: marketplaceLead.targetRegions[0] || 'N/A',
    urgency: marketplaceLead.urgencyScore >= 7 ? 'high' : marketplaceLead.urgencyScore >= 4 ? 'medium' : 'low',
    publishedAt: marketplaceLead.publishedAt,
    purchaseCount: marketplaceLead.currentPartners,
    maxPurchases: marketplaceLead.maxPartners,
    isAvailable: marketplaceLead.status === 'AVAILABLE',
    tags: marketplaceLead.targetSectors,
    estimatedValue: Math.round(marketplaceLead.price * 3.5) // Estimation basée sur le prix
  };
};

export default function MarketplacePage() {
  const { api } = useAuthenticatedApi();
  
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<MarketplaceStats>({
    totalLeads: 0,
    availableLeads: 0,
    avgPrice: 0,
    newToday: 0
  });
  const [loading, setLoading] = useState(true);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [purchaseModalVisible, setPurchaseModalVisible] = useState(false);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);

  const [filters, setFilters] = useState<FilterState>({
    category: undefined,
    minPrice: undefined,
    maxPrice: undefined,
    postalCode: '',
    urgency: undefined,
    newOnly: false,
    availableOnly: true
  });

  const [form] = Form.useForm();

  // Fonctions de chargement (déclarées d'abord pour éviter les problèmes d'initialisation)
  const loadLeads = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      
      if (filters.category) params.append('category', filters.category);
      if (filters.minPrice) params.append('minPrice', filters.minPrice.toString());
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
      if (filters.postalCode) params.append('postalCode', filters.postalCode);
      if (filters.urgency) params.append('urgency', filters.urgency);
      if (filters.newOnly) params.append('newOnly', 'true');
      if (filters.availableOnly) params.append('availableOnly', 'true');

      const response = await api.get<{success: boolean, data: {leads: MarketplaceLead[], pagination: {total: number, limit: number}}}>(`/api/marketplace/leads?${params}`);
      
      // Transformer les données de l'API vers l'interface Lead
      const marketplaceLeads = response.data.leads;
      const transformedLeads = marketplaceLeads.map(transformMarketplaceLeadToLead);
      setLeads(transformedLeads);
    } catch (error) {
      console.error('Erreur lors du chargement des leads:', error);
      message.error('Impossible de charger les leads');
    }
  }, [api, filters]);

  const loadStats = useCallback(async () => {
    try {
      const data = await api.get<MarketplaceStats>('/api/marketplace/stats');
      setStats(data);
    } catch (error) {
      console.error('Erreur lors du chargement des stats:', error);
    }
  }, [api]);

  const loadSavedSearches = useCallback(async () => {
    try {
      const data = await api.get('/api/marketplace/saved-searches');
      setSavedSearches(data);
    } catch (error) {
      console.error('Erreur lors du chargement des recherches sauvegardées:', error);
    }
  }, [api]);

  // Chargement initial (maintenant que toutes les fonctions sont déclarées)
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadLeads(),
        loadStats()
      ]);
    } finally {
      setLoading(false);
    }
  }, [loadLeads, loadStats]);

  useEffect(() => {
    loadData();
    loadSavedSearches();
  }, [loadData, loadSavedSearches]);

  // Rechargement des leads quand les filtres changent
  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const handlePurchase = async (leadId: string) => {
    setPurchaseLoading(true);
    try {
      await api.post(`/api/marketplace/leads/${leadId}/purchase`, {});
      message.success('Lead acheté avec succès !');
      setPurchaseModalVisible(false);
      setSelectedLead(null);
      loadLeads(); // Recharger la liste
    } catch (error: unknown) {
      console.error('Erreur lors de l\'achat:', error);
      const errorMessage = error instanceof Error 
        ? error.message
        : 'Erreur lors de l\'achat du lead';
      message.error(errorMessage);
    } finally {
      setPurchaseLoading(false);
    }
  };

  const handleSaveSearch = async () => {
    const name = prompt('Nom de la recherche sauvegardée :');
    if (!name) return;

    try {
      await api.post('/api/marketplace/saved-searches', {
        name,
        filters
      });
      message.success('Recherche sauvegardée !');
      loadSavedSearches();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      message.error('Erreur lors de la sauvegarde de la recherche');
    }
  };

  const handleLoadSavedSearch = (searchFilters: FilterState) => {
    setFilters(searchFilters);
    form.setFieldsValue(searchFilters);
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      default: return 'green';
    }
  };

  const getUrgencyText = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'Urgent';
      case 'medium': return 'Modéré';
      default: return 'Normal';
    }
  };

  const isNewLead = (publishedAt: string) => {
    const now = new Date();
    const published = new Date(publishedAt);
    const diffInHours = (now.getTime() - published.getTime()) / (1000 * 60 * 60);
    return diffInHours < 24;
  };

  const columns = [
    {
      title: 'Lead',
      dataIndex: 'title',
      key: 'title',
      width: 250,
      render: (title: string, record: Lead) => (
        <div>
          <div className="font-semibold flex items-center gap-2">
            {title}
            {isNewLead(record.publishedAt) && (
              <Badge count="NOUVEAU" style={{ backgroundColor: '#52c41a' }} />
            )}
          </div>
          <Text type="secondary" className="text-xs">
            {record.description.substring(0, 80)}...
          </Text>
          <div className="mt-1">
            {record.tags.map(tag => (
              <Tag key={tag} size="small" color="blue">
                {tag}
              </Tag>
            ))}
          </div>
        </div>
      )
    },
    {
      title: 'Prix',
      dataIndex: 'price',
      key: 'price',
      width: 100,
      sorter: (a: Lead, b: Lead) => a.price - b.price,
      render: (price: number) => (
        <Statistic
          value={price}
          suffix="crédits"
          valueStyle={{ fontSize: '14px', color: '#cf1322' }}
        />
      )
    },
    {
      title: 'Localisation',
      dataIndex: 'postalCode',
      key: 'postalCode',
      width: 120,
      render: (postalCode: string) => (
        <div className="flex items-center gap-1">
          <EnvironmentOutlined />
          <span>{postalCode}</span>
        </div>
      )
    },
    {
      title: 'Urgence',
      dataIndex: 'urgency',
      key: 'urgency',
      width: 100,
      sorter: (a: Lead, b: Lead) => a.urgency.localeCompare(b.urgency),
      render: (urgency: string) => (
        <Tag color={getUrgencyColor(urgency)} icon={<ClockCircleOutlined />}>
          {getUrgencyText(urgency)}
        </Tag>
      )
    },
    {
      title: 'Acheteurs',
      key: 'buyers',
      width: 120,
      render: (_: unknown, record: Lead) => {
        const ratio = record.purchaseCount / record.maxPurchases;
        const color = ratio >= 1 ? 'red' : ratio >= 0.75 ? 'orange' : 'green';
        
        return (
          <Tooltip title={`${record.purchaseCount} pro(s) ont déjà acheté ce lead sur ${record.maxPurchases} maximum`}>
            <div className="flex items-center gap-1">
              <UserOutlined />
              <span style={{ color }}>
                {record.purchaseCount}/{record.maxPurchases}
              </span>
            </div>
          </Tooltip>
        );
      }
    },
    {
      title: 'Valeur estimée',
      dataIndex: 'estimatedValue',
      key: 'estimatedValue',
      width: 130,
      sorter: (a: Lead, b: Lead) => a.estimatedValue - b.estimatedValue,
      render: (value: number) => (
        <Statistic
          value={value}
          suffix="€"
          valueStyle={{ fontSize: '14px', color: '#3f8600' }}
        />
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_: unknown, record: Lead) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<ShoppingCartOutlined />}
            disabled={!record.isAvailable}
            onClick={() => {
              setSelectedLead(record);
              setPurchaseModalVisible(true);
            }}
          >
            Acheter
          </Button>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              // Afficher plus de détails dans un modal
              setSelectedLead(record);
              // Vous pouvez créer un modal de prévisualisation séparé
            }}
          >
            Voir
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* En-tête avec stats */}
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <Title level={2} className="mb-0">
              <ShoppingCartOutlined className="mr-2" />
              Marketplace des leads
            </Title>
            <Text type="secondary">
              Achetez des leads qualifiés pour développer votre business
            </Text>
          </div>
        </div>

        <Row gutter={16} className="mb-6">
          <Col span={6}>
            <Card>
              <Statistic
                title="Leads disponibles"
                value={stats.availableLeads}
                suffix={`/ ${stats.totalLeads}`}
                valueStyle={{ color: '#3f8600' }}
                prefix={<FireOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Prix moyen"
                value={stats.avgPrice}
                suffix="crédits"
                precision={1}
                valueStyle={{ color: '#1890ff' }}
                prefix={<CreditCardOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Nouveaux aujourd'hui"
                value={stats.newToday}
                valueStyle={{ color: '#52c41a' }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className="text-center">
              <Button
                type="primary"
                ghost
                icon={<BellOutlined />}
                onClick={() => message.info('Fonctionnalité bientôt disponible')}
                block
              >
                Alertes leads
              </Button>
            </Card>
          </Col>
        </Row>
      </div>

      {/* Filtres */}
      <Card 
        title={
          <Space>
            <FilterOutlined />
            Filtres de recherche
          </Space>
        }
        extra={
          <Space>
            {savedSearches.length > 0 && (
              <Select
                placeholder="Recherches sauvegardées"
                style={{ width: 200 }}
                allowClear
                onSelect={(value) => {
                  const search = savedSearches.find(s => s.id === value);
                  if (search) handleLoadSavedSearch(search.filters);
                }}
              >
                {savedSearches.map(search => (
                  <Option key={search.id} value={search.id}>
                    {search.name}
                  </Option>
                ))}
              </Select>
            )}
            <Button
              icon={<SaveOutlined />}
              onClick={handleSaveSearch}
              title="Sauvegarder cette recherche"
            >
              Sauvegarder
            </Button>
          </Space>
        }
        className="mb-6"
      >
        <Form
          form={form}
          layout="inline"
          className="w-full"
          onValuesChange={(_, allValues) => {
            setFilters({ ...filters, ...allValues });
          }}
        >
          <Row gutter={16} className="w-full">
            <Col span={4}>
              <Form.Item name="category" label="Catégorie">
                <Select placeholder="Toutes" allowClear style={{ width: '100%' }}>
                  <Option value="renovation">Rénovation</Option>
                  <Option value="construction">Construction</Option>
                  <Option value="plomberie">Plomberie</Option>
                  <Option value="electricite">Électricité</Option>
                  <Option value="chauffage">Chauffage</Option>
                  <Option value="jardinage">Jardinage</Option>
                </Select>
              </Form.Item>
            </Col>
            
            <Col span={3}>
              <Form.Item name="minPrice" label="Prix min">
                <Input 
                  type="number" 
                  placeholder="0" 
                  suffix="crédits"
                />
              </Form.Item>
            </Col>
            
            <Col span={3}>
              <Form.Item name="maxPrice" label="Prix max">
                <Input 
                  type="number" 
                  placeholder="∞" 
                  suffix="crédits"
                />
              </Form.Item>
            </Col>
            
            <Col span={3}>
              <Form.Item name="postalCode" label="CP">
                <Input placeholder="1000" />
              </Form.Item>
            </Col>
            
            <Col span={4}>
              <Form.Item name="urgency" label="Urgence">
                <Select placeholder="Toutes" allowClear>
                  <Option value="high">Urgent</Option>
                  <Option value="medium">Modéré</Option>
                  <Option value="low">Normal</Option>
                </Select>
              </Form.Item>
            </Col>
            
            <Col span={3}>
              <Form.Item name="newOnly" valuePropName="checked">
                <Button 
                  type={filters.newOnly ? 'primary' : 'default'}
                  size="small"
                  onClick={() => setFilters({ ...filters, newOnly: !filters.newOnly })}
                >
                  Nouveaux uniquement
                </Button>
              </Form.Item>
            </Col>
            
            <Col span={4}>
              <Form.Item name="availableOnly" valuePropName="checked">
                <Button 
                  type={filters.availableOnly ? 'primary' : 'default'}
                  size="small"
                  onClick={() => setFilters({ ...filters, availableOnly: !filters.availableOnly })}
                >
                  Disponibles seulement
                </Button>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      {/* Tableau des leads */}
      <Card>
        <Table
          columns={columns}
          dataSource={leads}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `${total} leads au total`
          }}
          scroll={{ x: 1200 }}
          size="middle"
        />
      </Card>

      {/* Modal d'achat */}
      <PurchaseModal
        lead={selectedLead}
        open={purchaseModalVisible}
        onCancel={() => {
          setPurchaseModalVisible(false);
          setSelectedLead(null);
        }}
        onConfirm={handlePurchase}
        loading={purchaseLoading}
      />
    </div>
  );
}
