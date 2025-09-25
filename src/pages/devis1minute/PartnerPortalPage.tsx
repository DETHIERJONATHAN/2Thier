import React from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Button, 
  Typography,
  Space,
  List,
  Badge,
  Avatar
} from 'antd';
import {
  UserOutlined,
  CreditCardOutlined,
  ShoppingCartOutlined,
  TrophyOutlined,
  RiseOutlined,
  CalendarOutlined,
  BellOutlined,
  ArrowRightOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;

export default function PartnerPortalPage() {
  const navigate = useNavigate();

  // Données de démonstration pour un partenaire
  const partnerStats = {
    totalLeads: 47,
    activeLeads: 23,
    convertedLeads: 15,
    ranking: 3,
    creditsSpent: 1250 // Remplace revenue par crédits dépensés
  };

  const recentActivity = [
    {
      id: 1,
      type: 'purchase',
      title: 'Nouveau lead acheté',
      description: 'Lead rénovation énergétique - Bruxelles',
      time: 'Il y a 2h',
      amount: 75
    },
    {
      id: 2,
      type: 'conversion',
      title: 'Lead converti',
      description: 'Installation pompe à chaleur - 15.000€',
      time: 'Il y a 5h',
      commission: 450
    },
    {
      id: 3,
      type: 'notification',
      title: 'Nouveaux leads disponibles',
      description: '12 nouveaux leads dans votre région',
      time: 'Il y a 1 jour'
    }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="mb-8">
        <Title level={2} className="mb-2">
          <UserOutlined className="mr-3" />
          Espace Partenaire
        </Title>
        <Text type="secondary" className="text-lg">
          Gérez vos leads, suivez vos performances et développez votre activité
        </Text>
      </div>

      {/* Statistiques principales */}
      <Row gutter={[24, 24]} className="mb-8">
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Leads Actifs"
              value={partnerStats.activeLeads}
              suffix={`/ ${partnerStats.totalLeads}`}
              valueStyle={{ color: '#3f8600' }}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Taux de Conversion"
              value={(partnerStats.convertedLeads / partnerStats.totalLeads * 100).toFixed(1)}
              suffix="%"
              valueStyle={{ color: '#1890ff' }}
              prefix={<RiseOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Crédits Dépensés"
              value={partnerStats.creditsSpent}
              suffix=" crédits"
              valueStyle={{ color: '#722ed1' }}
              prefix={<CreditCardOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Classement"
              value={partnerStats.ranking}
              suffix="/ 50"
              valueStyle={{ color: '#fa8c16' }}
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        {/* Actions principales */}
        <Col xs={24} lg={12}>
          <Card 
            title="Actions Rapides"
            className="h-full"
          >
            <Space direction="vertical" size="large" className="w-full">
              <Button
                type="primary"
                size="large"
                icon={<ShoppingCartOutlined />}
                onClick={() => navigate('/marketplace')}
                className="w-full"
              >
                Acheter des Leads
                <ArrowRightOutlined />
              </Button>
              
              <Button
                size="large"
                icon={<UserOutlined />}
                onClick={() => navigate('/partner/leads')}
                className="w-full"
              >
                Gérer mes Leads
                <ArrowRightOutlined />
              </Button>
              
              <Button
                size="large"
                icon={<CreditCardOutlined />}
                onClick={() => navigate('/partner/billing')}
                className="w-full"
              >
                Facturation & Commissions
                <ArrowRightOutlined />
              </Button>
            </Space>
          </Card>
        </Col>

        {/* Activité récente */}
        <Col xs={24} lg={12}>
          <Card 
            title="Activité Récente"
            extra={<BellOutlined />}
            className="h-full"
          >
            <List
              itemLayout="horizontal"
              dataSource={recentActivity}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        icon={
                          item.type === 'purchase' ? <ShoppingCartOutlined /> :
                          item.type === 'conversion' ? <TrophyOutlined /> :
                          <BellOutlined />
                        }
                        style={{
                          backgroundColor: 
                            item.type === 'purchase' ? '#1890ff' :
                            item.type === 'conversion' ? '#52c41a' :
                            '#faad14'
                        }}
                      />
                    }
                    title={
                      <Space>
                        {item.title}
                        {item.amount && (
                          <Badge count={`${item.amount}€`} style={{ backgroundColor: '#1890ff' }} />
                        )}
                        {item.commission && (
                          <Badge count={`+${item.commission}€`} style={{ backgroundColor: '#52c41a' }} />
                        )}
                      </Space>
                    }
                    description={
                      <div>
                        <div>{item.description}</div>
                        <Text type="secondary" className="text-xs">{item.time}</Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* Conseils et aide */}
      <Row gutter={[24, 24]} className="mt-8">
        <Col span={24}>
          <Card 
            title="Conseils pour Optimiser vos Performances"
            className="bg-gradient-to-r from-blue-50 to-indigo-50"
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} md={8}>
                <div className="text-center p-4">
                  <RiseOutlined className="text-3xl text-blue-500 mb-3" />
                  <Title level={4}>Réactivité</Title>
                  <Paragraph className="text-sm text-gray-600">
                    Contactez vos nouveaux leads dans les 15 minutes pour maximiser vos chances de conversion
                  </Paragraph>
                </div>
              </Col>
              <Col xs={24} md={8}>
                <div className="text-center p-4">
                  <CalendarOutlined className="text-3xl text-green-500 mb-3" />
                  <Title level={4}>Suivi Régulier</Title>
                  <Paragraph className="text-sm text-gray-600">
                    Programmez des rappels automatiques pour assurer un suivi constant de vos prospects
                  </Paragraph>
                </div>
              </Col>
              <Col xs={24} md={8}>
                <div className="text-center p-4">
                  <TrophyOutlined className="text-3xl text-orange-500 mb-3" />
                  <Title level={4}>Qualité</Title>
                  <Paragraph className="text-sm text-gray-600">
                    Privilégiez la qualité à la quantité. Un lead bien traité génère plus de recommandations
                  </Paragraph>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
