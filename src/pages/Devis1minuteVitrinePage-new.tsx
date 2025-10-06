import React, { useState } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Typography, 
  Button, 
  Space, 
  Tag,
  List,
  Avatar,
  Badge,
  Alert,
  Modal
} from 'antd';
import {
  RocketOutlined,
  TeamOutlined,
  StarFilled,
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
  const [stats] = useState<Stats>({
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
    const colors = {
      'nouveau': '#52c41a',
      'en_cours': '#1890ff',
      'converti': '#faad14',
      'perdu': '#ff4d4f'
    };
    return colors[status] || '#d9d9d9';
  };

  const getStatusText = (status: Lead['status']) => {
    const texts = {
      'nouveau': 'Nouveau',
      'en_cours': 'En cours',
      'converti': 'Converti',
      'perdu': 'Perdu'
    };
    return texts[status] || 'Inconnu';
  };

  return (
    <div style={{ 
      background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #7e22ce 100%)',
      minHeight: '100vh',
      paddingBottom: '40px'
    }}>
      {/* Header Hero - Ant Design Card */}
      <Card 
        bordered={false}
        style={{ 
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: 0,
          marginBottom: '20px'
        }}
        bodyStyle={{ padding: '30px 16px', textAlign: 'center' }}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Title 
            level={1}
            style={{ 
              color: 'white',
              margin: 0,
              fontSize: 'clamp(24px, 8vw, 44px)',
              fontWeight: 'bold'
            }}
          >
            <RocketOutlined /> Devis1Minute
          </Title>
          
          <Title 
            level={3}
            style={{ 
              color: 'rgba(255, 255, 255, 0.95)',
              fontWeight: 'normal',
              margin: 0,
              fontSize: 'clamp(16px, 5vw, 22px)',
              lineHeight: '1.4'
            }}
          >
            Obtenez 3 devis qualifiés en moins de 24h
          </Title>
          
          <Paragraph 
            style={{ 
              color: 'rgba(255, 255, 255, 0.85)',
              maxWidth: '600px',
              margin: '0 auto',
              fontSize: 'clamp(13px, 3.5vw, 15px)',
              lineHeight: '1.6'
            }}
          >
            Notre IA connecte votre projet aux meilleurs artisans de votre région. Gratuit, rapide et sans engagement.
          </Paragraph>
          
          <Button 
            type="primary"
            size="large"
            icon={<RocketOutlined />}
            style={{ 
              backgroundColor: '#10b981',
              borderColor: '#10b981',
              height: 'auto',
              padding: '14px 28px',
              fontSize: 'clamp(14px, 3.5vw, 16px)',
              fontWeight: '600',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
            }}
          >
            Démarrer ma demande GRATUITE
          </Button>
          
          <Text style={{ 
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: 'clamp(12px, 3vw, 14px)'
          }}>
            <CheckCircleOutlined /> Plus de 15 000 demandes traitées • 4.8/5 de satisfaction
          </Text>
        </Space>
      </Card>

      {/* Statistiques - 100% Ant Design responsive */}
      <div style={{ padding: '0 16px', marginBottom: '20px' }}>
        <Row gutter={[12, 12]}>
          <Col xs={12} sm={12} md={6}>
            <Card 
              bordered={false}
              style={{ 
                background: 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                borderRadius: '12px',
                textAlign: 'center',
                height: '100%',
                minHeight: '110px'
              }}
              bodyStyle={{ 
                padding: '16px 8px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}
            >
              <Text 
                style={{ 
                  color: 'rgba(255, 255, 255, 0.75)',
                  fontSize: '13px',
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '500'
                }}
              >
                Demandes traitées
              </Text>
              <Title 
                level={2}
                style={{ 
                  color: 'white',
                  margin: 0,
                  fontSize: 'clamp(24px, 7vw, 32px)',
                  fontWeight: 'bold',
                  lineHeight: '1.1'
                }}
              >
                {stats.totalLeads.toLocaleString()}
              </Title>
            </Card>
          </Col>

          <Col xs={12} sm={12} md={6}>
            <Card 
              bordered={false}
              style={{ 
                background: 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                borderRadius: '12px',
                textAlign: 'center',
                height: '100%',
                minHeight: '110px'
              }}
              bodyStyle={{ 
                padding: '16px 8px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}
            >
              <Text 
                style={{ 
                  color: 'rgba(255, 255, 255, 0.75)',
                  fontSize: '13px',
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '500'
                }}
              >
                Professionnels partenaires
              </Text>
              <Title 
                level={2}
                style={{ 
                  color: 'white',
                  margin: 0,
                  fontSize: 'clamp(24px, 7vw, 32px)',
                  fontWeight: 'bold',
                  lineHeight: '1.1'
                }}
              >
                {stats.activePartners.toLocaleString()}
              </Title>
            </Card>
          </Col>

          <Col xs={12} sm={12} md={6}>
            <Card 
              bordered={false}
              style={{ 
                background: 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                borderRadius: '12px',
                textAlign: 'center',
                height: '100%',
                minHeight: '110px'
              }}
              bodyStyle={{ 
                padding: '16px 8px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}
            >
              <Text 
                style={{ 
                  color: 'rgba(255, 255, 255, 0.75)',
                  fontSize: '13px',
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '500'
                }}
              >
                Économie moyenne
              </Text>
              <Title 
                level={2}
                style={{ 
                  color: 'white',
                  margin: 0,
                  fontSize: 'clamp(24px, 7vw, 32px)',
                  fontWeight: 'bold',
                  lineHeight: '1.1'
                }}
              >
                {stats.avgValue.toLocaleString()}€
              </Title>
            </Card>
          </Col>

          <Col xs={12} sm={12} md={6}>
            <Card 
              bordered={false}
              style={{ 
                background: 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                borderRadius: '12px',
                textAlign: 'center',
                height: '100%',
                minHeight: '110px'
              }}
              bodyStyle={{ 
                padding: '16px 8px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}
            >
              <Text 
                style={{ 
                  color: 'rgba(255, 255, 255, 0.75)',
                  fontSize: '13px',
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: '500'
                }}
              >
                Satisfaction
              </Text>
              <Title 
                level={2}
                style={{ 
                  color: 'white',
                  margin: 0,
                  fontSize: 'clamp(24px, 7vw, 32px)',
                  fontWeight: 'bold',
                  lineHeight: '1.1'
                }}
              >
                <StarFilled style={{ color: '#fbbf24', fontSize: '0.8em' }} /> 4.8/5
              </Title>
            </Card>
          </Col>
        </Row>
      </div>

      {/* Reste du contenu (leads, projets, etc.) */}
      <div style={{ padding: '0 16px' }}>
        <Row gutter={[16, 16]}>
          {/* Leads récents */}
          <Col xs={24} lg={12}>
            <Card 
              title={<span style={{ fontWeight: 'bold' }}>🔥 Leads Récents</span>}
              extra={<Badge count={recentLeads.length} style={{ backgroundColor: '#10b981' }} />}
              style={{ borderRadius: '12px' }}
            >
              <List
                itemLayout="horizontal"
                dataSource={recentLeads}
                renderItem={(lead) => (
                  <List.Item
                    actions={[
                      <Button 
                        type="primary" 
                        size="small" 
                        onClick={() => setPartnerModalVisible(true)}
                        style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                      >
                        Contacter
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<Avatar style={{ backgroundColor: getStatusColor(lead.status) }}>
                        {lead.type.charAt(0).toUpperCase()}
                      </Avatar>}
                      title={<span style={{ fontSize: '14px' }}>{lead.type} - {lead.client}</span>}
                      description={
                        <Space wrap size="small">
                          <Text strong style={{ color: '#10b981' }}>{lead.value.toLocaleString()}€</Text>
                          <Tag color={getStatusColor(lead.status)}>{getStatusText(lead.status)}</Tag>
                          <Text type="secondary" style={{ fontSize: '12px' }}>{lead.date}</Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>

          {/* Types de projets */}
          <Col xs={24} lg={12}>
            <Card title={<span style={{ fontWeight: 'bold' }}>🎯 Types de Projets</span>} style={{ borderRadius: '12px' }}>
              <Row gutter={[12, 12]}>
                {[
                  { name: 'Pompes à Chaleur', color: '#10b981', leads: '2,450' },
                  { name: 'Panneaux Solaires', color: '#f59e0b', leads: '3,120' },
                  { name: 'Isolation', color: '#3b82f6', leads: '1,890' },
                  { name: 'Chaudières', color: '#8b5cf6', leads: '1,640' },
                  { name: 'Ventilation', color: '#ec4899', leads: '780' },
                  { name: 'Autres', color: '#6366f1', leads: '540' }
                ].map((type) => (
                  <Col xs={12} sm={8} key={type.name}>
                    <Card 
                      size="small"
                      style={{ 
                        textAlign: 'center',
                        borderColor: type.color,
                        borderWidth: '2px',
                        borderRadius: '8px'
                      }}
                      bodyStyle={{ padding: '12px' }}
                    >
                      <Title 
                        level={5}
                        style={{ 
                          color: type.color,
                          margin: '0 0 4px 0',
                          fontSize: 'clamp(12px, 3vw, 14px)'
                        }}
                      >
                        {type.name}
                      </Title>
                      <Text strong style={{ fontSize: '12px' }}>{type.leads} leads</Text>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>
          </Col>
        </Row>
      </div>

      {/* Modal */}
      <Modal
        title="📞 Accès Partenaire Requis"
        open={partnerModalVisible}
        onCancel={() => setPartnerModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setPartnerModalVisible(false)}>Fermer</Button>
        ]}
      >
        <Alert
          message="Devenez partenaire pour accéder aux leads"
          description="Rejoignez notre réseau de professionnels qualifiés !"
          type="info"
          showIcon
        />
      </Modal>
    </div>
  );
};

export default Devis1minuteVitrinePage;
