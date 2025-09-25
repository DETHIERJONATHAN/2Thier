import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Typography, 
  Button, 
  Space, 
  Divider,
  Tag,
  Statistic,
  List,
  Avatar,
  Badge,
  Timeline,
  Carousel,
  Alert,
  Modal,
  Form,
  Input
} from 'antd';
import {
  RocketOutlined,
  UserOutlined,
  ShopOutlined,
  TeamOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  StarFilled,
  TrophyOutlined,
  SafetyCertificateOutlined,
  CustomerServiceOutlined,
  CheckCircleOutlined,
  EuroOutlined,
  ClockCircleOutlined,
  GlobalOutlined
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

interface Lead {
  id: string;
  type: string;
  client: string;
  value: number;
  date: string;
  status: 'nouveau' | 'en_cours' | 'converti' | 'perdu';
}

interface Stats {
  totalLeads: number;
  activePartners: number;
  avgValue: number;
  conversionRate: number;
}

const Devis1minuteVitrinePage: React.FC = () => {
  const [stats, setStats] = useState<Stats>({
    totalLeads: 15420,
    activePartners: 847,
    avgValue: 2850,
    conversionRate: 32.8
  });

  const [recentLeads] = useState<Lead[]>([
    { id: '1', type: 'Pompe à chaleur', client: 'Famille Martin', value: 4500, date: '2025-08-27', status: 'nouveau' },
    { id: '2', type: 'Panneaux solaires', client: 'Entreprise Dupont', value: 12000, date: '2025-08-27', status: 'en_cours' },
    { id: '3', type: 'Isolation toiture', client: 'M. Bernard', value: 3200, date: '2025-08-26', status: 'converti' },
    { id: '4', type: 'Chaudière gaz', client: 'Mme Leroy', value: 2800, date: '2025-08-26', status: 'nouveau' }
  ]);

  const [partnerModalVisible, setPartnerModalVisible] = useState(false);

  const getStatusColor = (status: Lead['status']) => {
    switch (status) {
      case 'nouveau': return '#52c41a';
      case 'en_cours': return '#1890ff';
      case 'converti': return '#faad14';
      case 'perdu': return '#ff4d4f';
      default: return '#d9d9d9';
    }
  };

  const getStatusText = (status: Lead['status']) => {
    switch (status) {
      case 'nouveau': return 'Nouveau';
      case 'en_cours': return 'En cours';
      case 'converti': return 'Converti';
      case 'perdu': return 'Perdu';
      default: return 'Inconnu';
    }
  };

  const handleDevenirPartenaire = () => {
    // Rediriger vers le formulaire de devenir partenaire
    window.open('/devis1minute/devenir-partenaire', '_blank');
  };

  const handleContactLead = () => {
    setPartnerModalVisible(true);
  };

  return (
    <div style={{ padding: '20px', background: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header Hero */}
      <Card style={{ marginBottom: '20px', background: 'linear-gradient(135deg, #ff7a00 0%, #ff4757 100%)', border: 'none' }}>
        <Row align="middle" justify="center" style={{ textAlign: 'center', padding: '40px 0' }}>
          <Col span={24}>
            <Title level={1} style={{ color: 'white', fontSize: '48px', fontWeight: 'bold' }}>
              <RocketOutlined style={{ marginRight: '16px' }} />
              DEVIS1MINUTE
            </Title>
            <Title level={2} style={{ color: 'white', fontWeight: 'normal', marginTop: '10px' }}>
              Marketplace de Leads Énergétiques
            </Title>
            <Paragraph style={{ color: 'white', fontSize: '18px', marginTop: '20px' }}>
              La plateforme #1 pour connecter clients et professionnels de l'énergie
            </Paragraph>
          </Col>
        </Row>
      </Card>

      {/* Statistiques en temps réel */}
      <Card style={{ marginBottom: '20px' }}>
        <Title level={3} style={{ textAlign: 'center', marginBottom: '30px' }}>
          📊 Statistiques en Temps Réel
        </Title>
        <Row gutter={[16, 16]}>
          <Col xs={12} md={6}>
            <Statistic
              title="Total Leads"
              value={stats.totalLeads}
              prefix={<RocketOutlined style={{ color: '#ff7a00' }} />}
              suffix="leads"
              valueStyle={{ color: '#ff7a00' }}
            />
          </Col>
          <Col xs={12} md={6}>
            <Statistic
              title="Partenaires Actifs"
              value={stats.activePartners}
              prefix={<TeamOutlined style={{ color: '#52c41a' }} />}
              suffix="pros"
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col xs={12} md={6}>
            <Statistic
              title="Valeur Moyenne"
              value={stats.avgValue}
              prefix={<EuroOutlined style={{ color: '#1890ff' }} />}
              suffix="€"
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col xs={12} md={6}>
            <Statistic
              title="Taux Conversion"
              value={stats.conversionRate}
              prefix={<TrophyOutlined style={{ color: '#faad14' }} />}
              suffix="%"
              valueStyle={{ color: '#faad14' }}
            />
          </Col>
        </Row>
      </Card>

      <Row gutter={[20, 20]}>
        {/* Leads récents */}
        <Col xs={24} lg={12}>
          <Card title="🔥 Leads Récents" extra={<Badge count={recentLeads.length} />}>
            <List
              itemLayout="horizontal"
              dataSource={recentLeads}
              renderItem={(lead) => (
                <List.Item
                  actions={[
                    <Button type="primary" size="small" onClick={handleContactLead}>
                      Contacter
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Avatar style={{ backgroundColor: getStatusColor(lead.status) }}>
                      {lead.type.charAt(0).toUpperCase()}
                    </Avatar>}
                    title={<span>{lead.type} - {lead.client}</span>}
                    description={
                      <Space>
                        <Text strong style={{ color: '#52c41a' }}>
                          {lead.value.toLocaleString()}€
                        </Text>
                        <Tag color={getStatusColor(lead.status)}>
                          {getStatusText(lead.status)}
                        </Tag>
                        <Text type="secondary">{lead.date}</Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {/* Types de projets disponibles */}
        <Col xs={24} lg={12}>
          <Card title="🎯 Types de Projets">
            <Row gutter={[16, 16]}>
              {[
                { name: 'Pompes à Chaleur', color: '#ff7a00', leads: '2,450' },
                { name: 'Panneaux Solaires', color: '#faad14', leads: '3,120' },
                { name: 'Isolation', color: '#52c41a', leads: '1,890' },
                { name: 'Chaudières', color: '#1890ff', leads: '1,640' },
                { name: 'Ventilation', color: '#722ed1', leads: '780' },
                { name: 'Autres', color: '#eb2f96', leads: '540' }
              ].map((type) => (
                <Col xs={12} md={8} key={type.name}>
                  <Card size="small" style={{ textAlign: 'center', borderColor: type.color }}>
                    <Title level={5} style={{ color: type.color, margin: '8px 0' }}>
                      {type.name}
                    </Title>
                    <Text strong>{type.leads} leads</Text>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Section devenir partenaire */}
      <Card style={{ marginTop: '20px', textAlign: 'center' }}>
        <Title level={3}>
          <TeamOutlined style={{ color: '#ff7a00', marginRight: '12px' }} />
          Rejoignez Notre Réseau de Partenaires
        </Title>
        <Paragraph style={{ fontSize: '16px', marginBottom: '30px' }}>
          Accédez à des leads qualifiés dans votre zone géographique
        </Paragraph>
        <Row gutter={[20, 20]} justify="center">
          <Col xs={24} sm={8}>
            <Card size="small">
              <CheckCircleOutlined style={{ fontSize: '24px', color: '#52c41a', marginBottom: '8px' }} />
              <Title level={4}>Leads Qualifiés</Title>
              <Text>Clients déjà intéressés</Text>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small">
              <ClockCircleOutlined style={{ fontSize: '24px', color: '#1890ff', marginBottom: '8px' }} />
              <Title level={4}>Réactivité</Title>
              <Text>Leads transmis en temps réel</Text>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small">
              <GlobalOutlined style={{ fontSize: '24px', color: '#faad14', marginBottom: '8px' }} />
              <Title level={4}>Zone Locale</Title>
              <Text>Projets près de chez vous</Text>
            </Card>
          </Col>
        </Row>
        <div style={{ marginTop: '30px' }}>
          <Button 
            type="primary" 
            size="large" 
            icon={<TeamOutlined />}
            onClick={handleDevenirPartenaire}
            style={{ backgroundColor: '#ff7a00', borderColor: '#ff7a00' }}
          >
            Devenir Partenaire
          </Button>
        </div>
      </Card>

      {/* Témoignages */}
      <Card style={{ marginTop: '20px' }} title="🌟 Témoignages Partenaires">
        <Row gutter={[20, 20]}>
          {[
            {
              name: "Jean Dupont",
              company: "Énergie Solutions Pro",
              text: "Excellent service ! J'ai converti 15 leads ce mois-ci.",
              rating: 5
            },
            {
              name: "Marie Martin",
              company: "Chauffage Expert",
              text: "Les leads sont de qualité, clients vraiment motivés.",
              rating: 5
            },
            {
              name: "Pierre Bernard",
              company: "Solaire Avenir",
              text: "Interface simple, support réactif. Je recommande !",
              rating: 4
            }
          ].map((temoignage, index) => (
            <Col xs={24} md={8} key={index}>
              <Card size="small">
                <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                  <Avatar size={48} style={{ backgroundColor: '#ff7a00' }}>
                    {temoignage.name.split(' ').map(n => n[0]).join('')}
                  </Avatar>
                  <div style={{ marginTop: '8px' }}>
                    <Title level={5} style={{ margin: 0 }}>{temoignage.name}</Title>
                    <Text type="secondary">{temoignage.company}</Text>
                  </div>
                </div>
                <Paragraph style={{ textAlign: 'center', fontStyle: 'italic' }}>
                  "{temoignage.text}"
                </Paragraph>
                <div style={{ textAlign: 'center' }}>
                  {[...Array(temoignage.rating)].map((_, i) => (
                    <StarFilled key={i} style={{ color: '#faad14', marginRight: '4px' }} />
                  ))}
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* Modal contact lead */}
      <Modal
        title="📞 Contacter un Lead"
        open={partnerModalVisible}
        onCancel={() => setPartnerModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setPartnerModalVisible(false)}>
            Annuler
          </Button>,
          <Button key="contact" type="primary" onClick={handleDevenirPartenaire}>
            Devenir Partenaire
          </Button>
        ]}
      >
        <Alert
          message="🚀 Accès Partenaire Requis"
          description="Pour contacter nos leads, vous devez d'abord devenir partenaire Devis1minute. Rejoignez notre réseau de professionnels qualifiés !"
          type="info"
          showIcon
          style={{ marginBottom: '20px' }}
        />
        
        <div style={{ textAlign: 'center' }}>
          <Title level={4}>Avantages Partenaire :</Title>
          <List size="small">
            <List.Item>✅ Accès aux leads qualifiés de votre région</List.Item>
            <List.Item>✅ Notifications en temps réel</List.Item>
            <List.Item>✅ Système de scoring des prospects</List.Item>
            <List.Item>✅ Support commercial dédié</List.Item>
          </List>
        </div>
      </Modal>
    </div>
  );
};

export default Devis1minuteVitrinePage;
