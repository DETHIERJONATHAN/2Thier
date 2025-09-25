import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Typography,
  Space,
  Modal,
  message,
  Row,
  Col,
  Statistic,
  Tag,
  Alert,
  Radio,
  Descriptions,
  Badge,
  Tooltip,
  Progress
} from 'antd';
import {
  CreditCardOutlined,
  DownloadOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  GiftOutlined,
  TrophyOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';

dayjs.locale('fr');

const { Title, Text } = Typography;

interface CreditBalance {
  currentBalance: number;
  totalPurchased: number;
  totalSpent: number;
  pendingCredits: number;
}

interface Invoice {
  id: string;
  number: string;
  amount: number;
  credits: number;
  status: 'paid' | 'pending' | 'failed' | 'cancelled';
  createdAt: string;
  paidAt?: string;
  downloadUrl?: string;
  paymentMethod: string;
}

interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price: number;
  pricePerCredit: number;
  savings?: number; // % d'économie par rapport au pack de base
  popular?: boolean;
  bonus?: number; // crédits bonus
  description: string;
}

interface PurchaseModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: (packId: string, paymentMethod: string) => void;
  loading: boolean;
  packs: CreditPack[];
}

const PurchaseModal: React.FC<PurchaseModalProps> = ({ 
  visible, 
  onCancel, 
  onConfirm, 
  loading, 
  packs 
}) => {
  const [selectedPack, setSelectedPack] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('card');

  const selectedPackData = packs.find(p => p.id === selectedPack);

  const handleConfirm = () => {
    if (!selectedPack) {
      message.error('Veuillez sélectionner un pack de crédits');
      return;
    }
    onConfirm(selectedPack, paymentMethod);
  };

  return (
    <Modal
      title={
        <Space>
          <ShoppingCartOutlined />
          Acheter des crédits
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      onOk={handleConfirm}
      confirmLoading={loading}
      okText="Procéder au paiement"
      cancelText="Annuler"
      width={800}
    >
      <div className="space-y-4">
        <Alert
          message="Choisissez votre pack de crédits"
          description="Plus vous achetez, plus vous économisez ! Les crédits n'expirent jamais."
          type="info"
          showIcon
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {packs.map(pack => (
            <Card
              key={pack.id}
              className={`cursor-pointer transition-all duration-200 ${
                selectedPack === pack.id 
                  ? 'border-blue-500 bg-blue-50 shadow-md' 
                  : 'hover:border-gray-400'
              } ${pack.popular ? 'border-orange-500' : ''}`}
              onClick={() => setSelectedPack(pack.id)}
            >
              {pack.popular && (
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                  <Badge count="POPULAIRE" style={{ backgroundColor: '#f56a00' }} />
                </div>
              )}
              
              <div className="text-center">
                <Title level={4} className="mb-2">
                  {pack.name}
                  {pack.bonus && (
                    <Tag color="gold" className="ml-2" icon={<GiftOutlined />}>
                      +{pack.bonus} bonus
                    </Tag>
                  )}
                </Title>
                
                <div className="mb-3">
                  <Text className="text-3xl font-bold text-blue-600">
                    {pack.credits + (pack.bonus || 0)}
                  </Text>
                  <Text className="text-lg text-gray-500 ml-2">crédits</Text>
                </div>

                <div className="mb-3">
                  <Text className="text-2xl font-bold">
                    {pack.price.toFixed(2)}€
                  </Text>
                  <div className="text-sm text-gray-500">
                    {pack.pricePerCredit.toFixed(3)}€/crédit
                    {pack.savings && (
                      <div className="text-green-600 font-semibold">
                        Économie: {pack.savings}%
                      </div>
                    )}
                  </div>
                </div>

                <Text type="secondary" className="text-xs">
                  {pack.description}
                </Text>

                <Radio 
                  checked={selectedPack === pack.id}
                  className="mt-3"
                >
                  Sélectionner
                </Radio>
              </div>
            </Card>
          ))}
        </div>

        {selectedPackData && (
          <Card className="bg-gray-50">
            <Title level={5}>Récapitulatif</Title>
            <Descriptions size="small" column={2}>
              <Descriptions.Item label="Pack sélectionné">
                {selectedPackData.name}
              </Descriptions.Item>
              <Descriptions.Item label="Crédits">
                {selectedPackData.credits + (selectedPackData.bonus || 0)}
              </Descriptions.Item>
              <Descriptions.Item label="Prix">
                {selectedPackData.price.toFixed(2)}€
              </Descriptions.Item>
              <Descriptions.Item label="Prix par crédit">
                {selectedPackData.pricePerCredit.toFixed(3)}€
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}

        <div>
          <Title level={5}>Méthode de paiement</Title>
          <Radio.Group 
            value={paymentMethod} 
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            <Space direction="vertical">
              <Radio value="card">
                <Space>
                  <CreditCardOutlined />
                  Carte bancaire (Stripe)
                </Space>
              </Radio>
              <Radio value="paypal">
                <Space>
                  <DollarOutlined />
                  PayPal
                </Space>
              </Radio>
              <Radio value="transfer">
                <Space>
                  <FileTextOutlined />
                  Virement bancaire (traitement sous 1-2 jours)
                </Space>
              </Radio>
            </Space>
          </Radio.Group>
        </div>
      </div>
    </Modal>
  );
};

export default function PartnerBillingPage() {
  const { api } = useAuthenticatedApi();
  
  const [balance, setBalance] = useState<CreditBalance>({
    currentBalance: 0,
    totalPurchased: 0,
    totalSpent: 0,
    pendingCredits: 0
  });
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchaseModalVisible, setPurchaseModalVisible] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  // Chargement des données
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [balanceData, invoicesData, packsData] = await Promise.all([
        api.get<CreditBalance>('/api/partner/credits/balance'),
        api.get<Invoice[]>('/api/partner/invoices'),
        api.get<CreditPack[]>('/api/partner/credits/packs')
      ]);
      setBalance(balanceData);
      setInvoices(invoicesData);
      setPacks(packsData);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      message.error('Impossible de charger les données de facturation');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePurchaseCredits = async (packId: string, paymentMethod: string) => {
    setPurchaseLoading(true);
    try {
      const response = await api.post('/api/partner/credits/purchase', {
        packId,
        paymentMethod
      });
      
      if (paymentMethod === 'card' && response.checkoutUrl) {
        // Redirection vers Stripe Checkout
        window.location.href = response.checkoutUrl;
      } else if (paymentMethod === 'paypal' && response.approvalUrl) {
        // Redirection vers PayPal
        window.location.href = response.approvalUrl;
      } else {
        // Virement bancaire ou autre
        message.success('Commande enregistrée ! Vous recevrez les instructions de paiement par email.');
        setPurchaseModalVisible(false);
        loadData(); // Recharger les données
      }
    } catch (error: unknown) {
      console.error('Erreur lors de l\'achat:', error);
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as any).response?.data?.message 
        : 'Erreur lors de l\'achat de crédits';
      message.error(errorMessage);
    } finally {
      setPurchaseLoading(false);
    }
  };

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      const response = await api.get(`/api/partner/invoices/${invoiceId}/download`, {
        responseType: 'blob' as any
      });
      
      const url = window.URL.createObjectURL(new Blob([response as any]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `facture-${invoiceId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      message.error('Impossible de télécharger la facture');
    }
  };

  const getInvoiceStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'green';
      case 'pending': return 'orange';
      case 'failed': return 'red';
      case 'cancelled': return 'default';
      default: return 'default';
    }
  };

  const getInvoiceStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'Payée';
      case 'pending': return 'En attente';
      case 'failed': return 'Échec';
      case 'cancelled': return 'Annulée';
      default: return status;
    }
  };

  const getInvoiceStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircleOutlined />;
      case 'pending': return <ClockCircleOutlined />;
      case 'failed': return <ExclamationCircleOutlined />;
      default: return <ClockCircleOutlined />;
    }
  };

  // Calcul du niveau de fidélité basé sur le total acheté
  const getLoyaltyLevel = (totalSpent: number) => {
    if (totalSpent >= 10000) return { level: 'Platine', color: '#722ed1', icon: <TrophyOutlined /> };
    if (totalSpent >= 5000) return { level: 'Or', color: '#faad14', icon: <TrophyOutlined /> };
    if (totalSpent >= 1000) return { level: 'Argent', color: '#52c41a', icon: <TrophyOutlined /> };
    return { level: 'Bronze', color: '#8c8c8c', icon: <TrophyOutlined /> };
  };

  const loyaltyInfo = getLoyaltyLevel(balance.totalSpent);
  const nextLevelThreshold = balance.totalSpent < 1000 ? 1000 : 
                            balance.totalSpent < 5000 ? 5000 : 10000;
  const progressToNextLevel = Math.min((balance.totalSpent / nextLevelThreshold) * 100, 100);

  const invoiceColumns = [
    {
      title: 'Facture',
      dataIndex: 'number',
      key: 'number',
      width: 150,
      render: (number: string) => (
        <Text code className="font-semibold">
          {number}
        </Text>
      )
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      sorter: (a: Invoice, b: Invoice) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
      render: (date: string) => dayjs(date).format('DD/MM/YYYY')
    },
    {
      title: 'Crédits',
      dataIndex: 'credits',
      key: 'credits',
      width: 100,
      render: (credits: number) => (
        <Badge count={credits} style={{ backgroundColor: '#1890ff' }} />
      )
    },
    {
      title: 'Montant',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (amount: number) => (
        <Text strong className="text-green-600">
          {amount.toFixed(2)}€
        </Text>
      )
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      filters: [
        { text: 'Payée', value: 'paid' },
        { text: 'En attente', value: 'pending' },
        { text: 'Échec', value: 'failed' },
        { text: 'Annulée', value: 'cancelled' }
      ],
      onFilter: (value, record) => record.status === value,
      render: (status: string) => (
        <Tag color={getInvoiceStatusColor(status)} icon={getInvoiceStatusIcon(status)}>
          {getInvoiceStatusText(status)}
        </Tag>
      )
    },
    {
      title: 'Paiement',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      width: 120,
      render: (method: string) => {
        const methodConfig = {
          'card': { text: 'Carte', icon: <CreditCardOutlined /> },
          'paypal': { text: 'PayPal', icon: <DollarOutlined /> },
          'transfer': { text: 'Virement', icon: <FileTextOutlined /> }
        };
        const config = methodConfig[method as keyof typeof methodConfig] || { text: method, icon: null };
        return (
          <Space>
            {config.icon}
            {config.text}
          </Space>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: Invoice) => (
        <Space>
          {record.status === 'paid' && (
            <Tooltip title="Télécharger la facture">
              <Button
                size="small"
                icon={<DownloadOutlined />}
                onClick={() => handleDownloadInvoice(record.id)}
              />
            </Tooltip>
          )}
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
              <CreditCardOutlined className="mr-2" />
              Crédits & Facturation
            </Title>
            <Text type="secondary">
              Gérez vos crédits et consultez vos factures
            </Text>
          </div>
          <Button 
            type="primary" 
            size="large"
            icon={<ShoppingCartOutlined />}
            onClick={() => setPurchaseModalVisible(true)}
          >
            Acheter des crédits
          </Button>
        </div>
      </div>

      {/* Section crédits */}
      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Card>
            <Statistic
              title="Crédits disponibles"
              value={balance.currentBalance}
              precision={0}
              valueStyle={{ 
                color: balance.currentBalance < 10 ? '#cf1322' : '#3f8600',
                fontSize: '2rem'
              }}
              prefix={<ThunderboltOutlined />}
            />
            {balance.currentBalance < 10 && (
              <Alert 
                message="Solde faible" 
                description="Pensez à recharger vos crédits"
                type="warning" 
                size="small"
                className="mt-2"
                showIcon
              />
            )}
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total acheté"
              value={balance.totalPurchased}
              precision={0}
              valueStyle={{ color: '#1890ff' }}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total dépensé"
              value={balance.totalSpent}
              precision={0}
              valueStyle={{ color: '#722ed1' }}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                {loyaltyInfo.icon}
                <Text strong className="ml-2" style={{ color: loyaltyInfo.color }}>
                  Niveau {loyaltyInfo.level}
                </Text>
              </div>
              {balance.totalSpent < 10000 && (
                <>
                  <Progress
                    percent={progressToNextLevel}
                    size="small"
                    strokeColor={loyaltyInfo.color}
                    className="mb-1"
                  />
                  <Text type="secondary" className="text-xs">
                    {(nextLevelThreshold - balance.totalSpent).toFixed(0)}€ pour le niveau suivant
                  </Text>
                </>
              )}
            </div>
          </Card>
        </Col>
      </Row>

      {balance.pendingCredits > 0 && (
        <Alert
          message="Crédits en attente"
          description={`${balance.pendingCredits} crédits seront ajoutés à votre compte dès réception du paiement.`}
          type="info"
          showIcon
          className="mb-6"
        />
      )}

      {/* Tableau des factures */}
      <Card title="Historique des factures">
        <Table
          columns={invoiceColumns}
          dataSource={invoices}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `${total} factures au total`
          }}
          scroll={{ x: 800 }}
          size="middle"
        />
      </Card>

      {/* Modal d'achat de crédits */}
      <PurchaseModal
        visible={purchaseModalVisible}
        onCancel={() => setPurchaseModalVisible(false)}
        onConfirm={handlePurchaseCredits}
        loading={purchaseLoading}
        packs={packs}
      />
    </div>
  );
}
