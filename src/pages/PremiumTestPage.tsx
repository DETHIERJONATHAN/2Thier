import React, { useState } from 'react';
import { 
  Card, 
  Button, 
  Space, 
  Typography, 
  Row, 
  Col, 
  Table, 
  Form, 
  Input, 
  Select, 
  Modal,
  Badge,
  Progress,
  Statistic,
  Alert,
  Avatar
} from 'antd';
import { 
  PhoneOutlined, 
  MailOutlined, 
  CalendarOutlined,
  UserOutlined,
  StarOutlined,
  TrophyOutlined,
  RocketOutlined,
  HeartOutlined,
  CrownOutlined,
  FireOutlined
} from '@ant-design/icons';
import '../styles/global-premium.css';
import { useTranslation } from 'react-i18next';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

/**
 * 🎨 PAGE DE DÉMONSTRATION DES STYLES PREMIUM
 * Cette page montre tous les composants avec le nouveau design premium
 * inspiré du module d'appel qui vous plaisait
 */

const PremiumTestPage: React.FC = () => {
  const { t } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  // Données de test pour les composants
  const tableData = [
    {
      key: '1',
      name: 'Jean Dupont',
      email: 'jean.dupont@example.com',
      phone: '+32 486 12 34 56',
      status: 'active',
      score: 95
    },
    {
      key: '2',
      name: 'Marie Martin',
      email: 'marie.martin@example.com', 
      phone: '+32 487 65 43 21',
      status: 'pending',
      score: 78
    },
    {
      key: '3',
      name: 'Pierre Leroy',
      email: 'pierre.leroy@example.com',
      phone: '+32 488 98 76 54',
      status: 'active',
      score: 89
    }
  ];

  const tableColumns = [
    {
      title: 'Nom',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
          <strong>{text}</strong>
        </div>
      )
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email'
    },
    {
      title: 'Téléphone',
      dataIndex: 'phone',
      key: 'phone'
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Badge 
          status={status === 'active' ? 'success' : 'processing'} 
          text={status === 'active' ? 'Actif' : 'En attente'}
        />
      )
    },
    {
      title: 'Score',
      dataIndex: 'score',
      key: 'score',
      render: (score: number) => (
        <Progress
          percent={score}
          size="small"
          strokeColor={{
            '0%': '#ff4d4f',
            '50%': '#fadb14',
            '100%': '#52c41a'
          }}
        />
      )
    }
  ];

  return (
    <div style={{ 
      padding: '24px',
      background: 'linear-gradient(135deg, #f0f2f5 0%, #e6f4ff 100%)',
      minHeight: '100vh'
    }}>
      {/* Header de la page */}
      <div className="bg-gradient-primary" style={{ 
        padding: '32px', 
        borderRadius: '20px',
        marginBottom: '32px',
        textAlign: 'center'
      }}>
        <Title level={1} style={{ color: 'white', margin: 0 }}>
          🎨 CRM Premium Design System
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.9)', fontSize: '18px', margin: '16px 0 0' }}>
          Nouveau design uniforme inspiré du module d'appel
        </Paragraph>
      </div>

      {/* Section 1: Boutons Premium */}
      <Card 
        title={
          <Space>
            <RocketOutlined style={{ color: '#1890ff' }} />
            <span>Boutons Premium avec Dégradés</span>
          </Space>
        }
        style={{ marginBottom: '24px' }}
        className="animate-float-premium"
      >
        <Row gutter={[16, 16]}>
          <Col span={6}>
            <Button 
              type="primary" 
              size="large" 
              icon={<PhoneOutlined />} 
              block
              className="animate-pulse-premium"
            >
              Appeler Premium
            </Button>
          </Col>
          <Col span={6}>
            <Button 
              className="btn-premium-success" 
              size="large" 
              icon={<MailOutlined />} 
              block
            >
              Email Premium
            </Button>
          </Col>
          <Col span={6}>
            <Button 
              className="btn-premium-danger" 
              size="large" 
              icon={<CalendarOutlined />} 
              block
            >
              Calendrier Premium
            </Button>
          </Col>
          <Col span={6}>
            <Button 
              size="large" 
              icon={<StarOutlined />} 
              block
              className="bg-gradient-warning"
              style={{ border: 'none', fontWeight: '600' }}
            >
              Favoris Premium
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Section 2: Cartes Premium */}
      <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card className="shadow-premium-medium animate-glow-premium">
            <Statistic
              title="Appels Aujourd'hui"
              value={127}
              prefix={<PhoneOutlined />}
              valueStyle={{ color: '#1890ff', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="shadow-premium-medium">
            <Statistic
              title="Leads Convertis"
              value={89}
              suffix="%"
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="shadow-premium-medium">
            <Statistic
              title="Revenue"
              value={24567}
              prefix={<CrownOutlined />}
              suffix="€"
              valueStyle={{ color: '#fadb14', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="shadow-premium-medium">
            <Statistic
              title="Satisfaction"
              value={97}
              suffix="%"
              prefix={<HeartOutlined />}
              valueStyle={{ color: '#ff4d4f', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Section 3: Formulaire Premium */}
      <Card 
        title={
          <Space>
            <FireOutlined style={{ color: '#ff4d4f' }} />
            <span>Formulaire Premium</span>
          </Space>
        }
        style={{ marginBottom: '24px' }}
        className="shadow-premium-strong"
      >
        <Form form={form} layout="vertical">
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item label="Nom complet" name="name">
                <Input placeholder="Entrez votre nom" size="large" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={t('fields.email')} name="email">
                <Input placeholder="votre@email.com" size="large" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={t('fields.phone')} name="phone">
                <Input placeholder="+32 4XX XX XX XX" size="large" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Type de client" name="type">
                <Select placeholder="Sélectionner un type" size="large">
                  <Option value="premium">🌟 Premium</Option>
                  <Option value="business">🏢 Business</Option>
                  <Option value="standard">👤 Standard</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item>
                <Space>
                  <Button type="primary" size="large" icon={<StarOutlined />}>
                    Enregistrer Premium
                  </Button>
                  <Button size="large">
                    Annuler
                  </Button>
                </Space>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      {/* Section 4: Tableau Premium */}
      <Card 
        title={
          <Space>
            <TrophyOutlined style={{ color: '#52c41a' }} />
            <span>Tableau Premium avec Animations</span>
          </Space>
        }
        style={{ marginBottom: '24px' }}
        extra={
          <Button 
            type="primary"
            onClick={() => setModalVisible(true)}
          >
            Voir Modal Premium
          </Button>
        }
      >
        <Table 
          columns={tableColumns} 
          dataSource={tableData} 
          pagination={false}
          className="border-radius-premium"
        />
      </Card>

      {/* Section 5: Alertes Premium */}
      <Row gutter={[24, 24]}>
        <Col span={8}>
          <Alert
            message="Succès Premium"
            description="Votre action a été exécutée avec succès! Le nouveau design premium est maintenant actif."
            type="success"
            showIcon
            className="shadow-premium-soft"
            style={{ borderRadius: '12px' }}
          />
        </Col>
        <Col span={8}>
          <Alert
            message="Avertissement Premium"
            description="Attention! Cette fonctionnalité utilise maintenant le nouveau système de design premium."
            type="warning"
            showIcon
            className="shadow-premium-soft"
            style={{ borderRadius: '12px' }}
          />
        </Col>
        <Col span={8}>
          <Alert
            message="Information Premium"
            description="Le module d'appel a servi d'inspiration pour ce nouveau design système."
            type="info"
            showIcon
            className="shadow-premium-soft"
            style={{ borderRadius: '12px' }}
          />
        </Col>
      </Row>

      {/* Modal Premium */}
      <Modal
        title={
          <Space>
            <CrownOutlined style={{ color: '#fadb14' }} />
            <span>Modal Premium</span>
          </Space>
        }
        open={modalVisible}
        onOk={() => setModalVisible(false)}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <div className="bg-gradient-primary" style={{ 
          padding: '24px', 
          borderRadius: '12px',
          marginBottom: '16px',
          textAlign: 'center'
        }}>
          <Title level={3} style={{ color: 'white', margin: 0 }}>
            🎉 Design Premium Appliqué!
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.9)' }}>
            Tous les composants utilisent maintenant le style du module d'appel
          </Text>
        </div>
        
        <Paragraph>
          <strong>🎨 Améliorations appliquées :</strong>
        </Paragraph>
        <ul>
          <li>✅ Dégradés sur tous les boutons principaux</li>
          <li>✅ Ombres modernes sur les cartes</li>
          <li>✅ Animations subtiles (hover, pulse, glow)</li>
          <li>✅ Rayons de bordure arrondis</li>
          <li>✅ Système de couleurs harmonieux</li>
          <li>✅ Header et sidebar avec style premium</li>
          <li>✅ Usurpation banner intégrée et stylée</li>
        </ul>

        <div style={{ 
          padding: '16px',
          background: 'linear-gradient(135deg, #f0f9f0 0%, #e6f7ff 100%)',
          borderRadius: '8px',
          marginTop: '16px'
        }}>
          <Text strong style={{ color: '#52c41a' }}>
            🚀 Le CRM a maintenant un look professionnel uniforme!
          </Text>
        </div>
      </Modal>

      {/* Footer avec style */}
      <div className="bg-gradient-primary" style={{
        marginTop: '48px',
        padding: '24px',
        borderRadius: '20px',
        textAlign: 'center'
      }}>
        <Title level={4} style={{ color: 'white', margin: 0 }}>
          🎯 Mission Accomplie : Design Premium Unifié!
        </Title>
        <Text style={{ color: 'rgba(255,255,255,0.9)' }}>
          Tous les composants du CRM utilisent maintenant le même style premium
        </Text>
      </div>
    </div>
  );
};

export default PremiumTestPage;
