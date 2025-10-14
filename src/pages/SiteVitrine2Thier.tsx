import React, { useState } from 'react';
import { 
  Layout,
  Card, 
  Row, 
  Col, 
  Typography, 
  Button, 
  Space, 
  Statistic,
  Carousel,
  Tag,
  List,
  Avatar,
  Steps,
  Image,
  Divider,
  Form,
  Input,
  Select,
  Spin,
  Alert
} from 'antd';
import {
  RocketOutlined,
  ThunderboltOutlined,
  SafetyOutlined,
  TeamOutlined,
  StarFilled,
  CheckCircleOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  HomeOutlined,
  BulbOutlined,
  CarOutlined,
  FireOutlined,
  CloudOutlined,
  ToolOutlined,
  SafetyCertificateOutlined,
  CustomerServiceOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { useWebSite } from '../hooks/useWebSite';

const { Header, Content, Footer } = Layout;
const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

// Mapping des icônes Ant Design par nom
const iconMap: Record<string, React.ReactNode> = {
  ThunderboltOutlined: <ThunderboltOutlined style={{ fontSize: '32px', color: '#10b981' }} />,
  BulbOutlined: <BulbOutlined style={{ fontSize: '32px', color: '#f59e0b' }} />,
  CarOutlined: <CarOutlined style={{ fontSize: '32px', color: '#3b82f6' }} />,
  FireOutlined: <FireOutlined style={{ fontSize: '32px', color: '#ef4444' }} />,
  HomeOutlined: <HomeOutlined style={{ fontSize: '32px', color: '#8b5cf6' }} />,
  CloudOutlined: <CloudOutlined style={{ fontSize: '32px', color: '#06b6d4' }} />,
  ToolOutlined: <ToolOutlined style={{ fontSize: '32px', color: '#64748b' }} />,
  SafetyCertificateOutlined: <SafetyCertificateOutlined style={{ fontSize: '48px', color: '#10b981' }} />,
  StarFilled: <StarFilled style={{ fontSize: '48px', color: '#10b981' }} />,
  CustomerServiceOutlined: <CustomerServiceOutlined style={{ fontSize: '48px', color: '#10b981' }} />,
  CheckCircleOutlined: <CheckCircleOutlined style={{ fontSize: '48px', color: '#10b981' }} />
};

interface Service {
  key: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  features: string[];
  cta: string;
  image?: string;
}

interface Testimonial {
  id: string;
  name: string;
  location: string;
  service: string;
  rating: number;
  text: string;
  date: string;
}

interface Project {
  id: string;
  title: string;
  location: string;
  details: string;
  image: string;
  date: string;
  tags: string[];
}

const SiteVitrine2Thier: React.FC = () => {
  const [form] = Form.useForm();
  
  // 🔥 RÉCUPÉRATION DES DONNÉES DYNAMIQUES
  const { data: website, loading, error } = useWebSite('site-vitrine-2thier');

  // Affichage du loader pendant le chargement
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
      }}>
        <Space direction="vertical" align="center">
          <Spin indicator={<LoadingOutlined style={{ fontSize: 48, color: 'white' }} spin />} />
          <Text style={{ color: 'white', fontSize: '18px' }}>Chargement du site...</Text>
        </Space>
      </div>
    );
  }

  // Affichage d'une erreur si le site n'est pas trouvé
  if (error || !website) {
    return (
      <div style={{ padding: '50px' }}>
        <Alert
          message="Erreur de chargement"
          description={error || "Le site web n'a pas pu être chargé."}
          type="error"
          showIcon
        />
      </div>
    );
  }

  // Extraction des données
  const config = website.config || {};
  const services = website.services || [];
  const projects = website.projects || [];
  const testimonials = website.testimonials || [];
  const stats = config.stats || { installations: 500, powerMW: 15, satisfaction: 4.9, region: 'Wallonie' };
  const values = config.valuesJson || [];

  // Données des statistiques
  const statsData = [
    { title: `+${stats.installations}`, subtitle: 'Installations réalisées', icon: <HomeOutlined /> },
    { title: `${stats.powerMW} MW`, subtitle: 'Puissance installée', icon: <ThunderboltOutlined /> },
    { title: `${stats.satisfaction}/5`, subtitle: 'Satisfaction client', icon: <StarFilled /> },
    { title: stats.region, subtitle: 'Région couverte', icon: <EnvironmentOutlined /> }
  ];

  // Processus en 5 étapes
  const processSteps = [
    {
      title: 'Contact',
      description: 'Demande gratuite sous 24h',
      icon: <PhoneOutlined />
    },
    {
      title: 'Étude',
      description: 'Visite + analyse de faisabilité',
      icon: <SafetyCertificateOutlined />
    },
    {
      title: 'Devis',
      description: 'Proposition détaillée personnalisée',
      icon: <ToolOutlined />
    },
    {
      title: 'Installation',
      description: 'Pose par techniciens certifiés',
      icon: <TeamOutlined />
    },
    {
      title: 'Suivi',
      description: 'SAV & garanties longue durée',
      icon: <CheckCircleOutlined />
    }
  ];

  // Handler formulaire contact
  const handleSubmit = (values: any) => {
    console.log('Formulaire soumis:', values);
    // TODO: Envoyer vers API CRM
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* HEADER STICKY */}
      <Header 
        style={{ 
          position: 'fixed', 
          top: 0, 
          width: '100%', 
          zIndex: 1000,
          background: 'rgba(255, 255, 255, 0.98)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
          <Title level={3} style={{ margin: 0, color: '#10b981' }}>
            ⚡ 2THIER ENERGY
          </Title>
          <Space size="large" style={{ display: 'none' }}>
            {/* TODO: Navigation desktop */}
          </Space>
        </div>
        <Button type="primary" size="large" style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}>
          DEVIS GRATUIT
        </Button>
      </Header>

      <Content style={{ marginTop: '64px' }}>
        {/* HERO SECTION */}
        <div
          style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
            minHeight: '600px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 24px',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ maxWidth: '1200px', width: '100%', textAlign: 'center', position: 'relative', zIndex: 1 }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Title level={1} style={{ color: 'white', fontSize: 'clamp(32px, 8vw, 56px)', margin: 0 }}>
                🌞 Votre Partenaire en Transition Énergétique
              </Title>
              
              <Paragraph style={{ color: 'rgba(255,255,255,0.95)', fontSize: 'clamp(16px, 4vw, 20px)', maxWidth: '800px', margin: '0 auto' }}>
                Photovoltaïque • Batteries • Bornes de Recharge • Pompes à Chaleur<br/>
                Isolation • Toiture • Électricité • Gros Œuvre
              </Paragraph>
              
              <Space size="middle" wrap>
                <Button 
                  type="primary" 
                  size="large" 
                  icon={<RocketOutlined />}
                  style={{ 
                    height: 'auto', 
                    padding: '16px 32px',
                    fontSize: '18px',
                    backgroundColor: 'white',
                    borderColor: 'white',
                    color: '#10b981',
                    fontWeight: 'bold'
                  }}
                >
                  DEMANDER UN DEVIS GRATUIT
                </Button>
                <Button 
                  size="large"
                  style={{ 
                    height: 'auto', 
                    padding: '16px 32px',
                    fontSize: '18px',
                    borderColor: 'white',
                    color: 'white',
                    background: 'rgba(255,255,255,0.1)'
                  }}
                >
                  NOS RÉALISATIONS
                </Button>
              </Space>

              <div style={{ marginTop: '40px' }}>
                <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: '16px' }}>
                  <CheckCircleOutlined /> +500 installations réalisées • 4.9/5 de satisfaction
                </Text>
              </div>
            </Space>
          </div>
        </div>

        {/* STATISTIQUES */}
        <div style={{ background: '#f9fafb', padding: '60px 24px' }}>
          <Row gutter={[24, 24]} justify="center">
            {statsData.map((stat, index) => (
              <Col xs={12} sm={12} md={6} key={index}>
                <Card 
                  bordered={false}
                  style={{ 
                    textAlign: 'center',
                    background: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                  }}
                >
                  <div style={{ fontSize: '48px', marginBottom: '8px' }}>{stat.icon}</div>
                  <Statistic 
                    title={stat.subtitle}
                    value={stat.title}
                    valueStyle={{ color: '#10b981', fontSize: '32px', fontWeight: 'bold' }}
                  />
                </Card>
              </Col>
            ))}
          </Row>
        </div>

        {/* NOS SOLUTIONS */}
        <div style={{ padding: '80px 24px', maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <Title level={2} style={{ fontSize: 'clamp(28px, 6vw, 42px)' }}>
              🔆 Nos Solutions Énergétiques
            </Title>
            <Paragraph style={{ fontSize: '18px', color: '#64748b', maxWidth: '700px', margin: '16px auto 0' }}>
              Un écosystème complet pour votre autonomie énergétique et votre confort
            </Paragraph>
          </div>

          <Row gutter={[24, 24]}>
            {services.map((service) => (
              <Col xs={24} sm={12} md={12} lg={6} key={service.key}>
                <Card
                  hoverable
                  style={{ 
                    height: '100%',
                    borderRadius: '12px',
                    border: '2px solid #f1f5f9'
                  }}
                  styles={{ body: { padding: '24px' } }}
                >
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <div>{service.icon}</div>
                    <Title level={4} style={{ margin: 0, fontSize: '18px' }}>
                      {service.title}
                    </Title>
                    <Paragraph style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
                      {service.description}
                    </Paragraph>
                    <List
                      size="small"
                      dataSource={service.features}
                      renderItem={(item) => (
                        <List.Item style={{ padding: '4px 0', border: 'none' }}>
                          <Text style={{ fontSize: '13px' }}>
                            <CheckCircleOutlined style={{ color: '#10b981', marginRight: '8px' }} />
                            {item}
                          </Text>
                        </List.Item>
                      )}
                    />
                    <Button 
                      type="primary" 
                      block
                      style={{ 
                        backgroundColor: '#10b981',
                        borderColor: '#10b981',
                        marginTop: 'auto'
                      }}
                    >
                      {service.cta}
                    </Button>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </div>

        {/* POURQUOI 2THIER */}
        <div style={{ background: '#f9fafb', padding: '80px 24px' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '60px' }}>
              <Title level={2} style={{ fontSize: 'clamp(28px, 6vw, 42px)' }}>
                💚 Pourquoi Choisir 2Thier ?
              </Title>
            </div>

            <Row gutter={[32, 32]}>
              {values.map((value, index) => (
                <Col xs={24} sm={12} md={6} key={index}>
                  <Card bordered={false} style={{ textAlign: 'center', height: '100%' }}>
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                      <div>{value.icon}</div>
                      <Title level={4}>{value.title}</Title>
                      <Paragraph style={{ color: '#64748b' }}>{value.description}</Paragraph>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        </div>

        {/* RÉALISATIONS RÉCENTES */}
        <div style={{ padding: '80px 24px', maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <Title level={2} style={{ fontSize: 'clamp(28px, 6vw, 42px)' }}>
              📸 Nos Dernières Réalisations
            </Title>
            <Button type="link" style={{ fontSize: '16px' }}>
              Voir toutes nos réalisations →
            </Button>
          </div>

          <Row gutter={[24, 24]}>
            {projects.map((project) => (
              <Col xs={24} sm={12} md={6} key={project.id}>
                <Card
                  hoverable
                  cover={<img alt={project.title} src={project.image} style={{ height: '200px', objectFit: 'cover' }} />}
                  style={{ borderRadius: '12px', overflow: 'hidden' }}
                >
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <Title level={5} style={{ margin: 0 }}>{project.title}</Title>
                    <Text type="secondary" style={{ fontSize: '13px' }}>
                      <EnvironmentOutlined /> {project.location}
                    </Text>
                    <Paragraph style={{ fontSize: '13px', margin: '8px 0' }}>
                      {project.details}
                    </Paragraph>
                    <Space wrap size="small">
                      {project.tags.map((tag) => (
                        <Tag key={tag} color="green">{tag}</Tag>
                      ))}
                    </Space>
                    <Text type="secondary" style={{ fontSize: '12px' }}>{project.date}</Text>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </div>

        {/* TÉMOIGNAGES */}
        <div style={{ background: '#f9fafb', padding: '80px 24px' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '60px' }}>
              <Title level={2} style={{ fontSize: 'clamp(28px, 6vw, 42px)' }}>
                ⭐ Ce Que Nos Clients Disent
              </Title>
            </div>

            <Carousel autoplay dots={{ className: 'custom-dots' }}>
              {testimonials.map((testimonial) => (
                <div key={testimonial.id}>
                  <Card 
                    style={{ 
                      maxWidth: '800px', 
                      margin: '0 auto',
                      padding: '24px',
                      borderRadius: '16px'
                    }}
                  >
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <StarFilled key={i} style={{ color: '#faad14', fontSize: '24px' }} />
                        ))}
                      </div>
                      <Paragraph style={{ fontSize: '18px', fontStyle: 'italic', margin: 0 }}>
                        "{testimonial.text}"
                      </Paragraph>
                      <div>
                        <Text strong style={{ fontSize: '16px' }}>{testimonial.name}</Text>
                        <br />
                        <Text type="secondary">
                          {testimonial.location} • {testimonial.service} • {testimonial.date}
                        </Text>
                      </div>
                    </Space>
                  </Card>
                </div>
              ))}
            </Carousel>

            <div style={{ textAlign: 'center', marginTop: '32px' }}>
              <Text style={{ fontSize: '16px' }}>
                📊 Note moyenne : <Text strong>4.9/5</Text> sur 124 avis Google Reviews
              </Text>
              <br />
              <Button type="link" style={{ fontSize: '16px' }}>
                Voir tous les avis sur Google →
              </Button>
            </div>
          </div>
        </div>

        {/* PROCESSUS */}
        <div style={{ padding: '80px 24px', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <Title level={2} style={{ fontSize: 'clamp(28px, 6vw, 42px)' }}>
              🚀 Votre Projet en 5 Étapes
            </Title>
          </div>

          <Steps
            current={-1}
            items={processSteps.map((step) => ({
              title: step.title,
              description: step.description,
              icon: step.icon
            }))}
            responsive
          />
        </div>

        {/* CTA FINAL */}
        <div 
          style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            padding: '80px 24px',
            textAlign: 'center'
          }}
        >
          <Space direction="vertical" size="large" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <Title level={2} style={{ color: 'white', margin: 0 }}>
              🌟 Prêt à Passer à l'Énergie Verte ?
            </Title>
            <Paragraph style={{ color: 'rgba(255,255,255,0.95)', fontSize: '18px' }}>
              Demandez votre devis gratuit et sans engagement<br/>
              Réponse sous 24h garantie
            </Paragraph>
            <Space size="large" wrap>
              <Button 
                type="primary"
                size="large"
                icon={<PhoneOutlined />}
                style={{ 
                  background: 'white',
                  borderColor: 'white',
                  color: '#10b981',
                  height: 'auto',
                  padding: '16px 32px',
                  fontSize: '18px',
                  fontWeight: 'bold'
                }}
              >
                071/XX.XX.XX
              </Button>
              <Button 
                size="large"
                icon={<MailOutlined />}
                style={{ 
                  borderColor: 'white',
                  color: 'white',
                  background: 'rgba(255,255,255,0.1)',
                  height: 'auto',
                  padding: '16px 32px',
                  fontSize: '18px'
                }}
              >
                DEVIS EN LIGNE
              </Button>
            </Space>
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: '16px' }}>
              <EnvironmentOutlined /> Route de Gosselies 23, 6220 Fleurus (Charleroi)
            </Text>
          </Space>
        </div>
      </Content>

      {/* FOOTER */}
      <Footer style={{ background: '#1f2937', color: 'white', padding: '60px 24px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <Row gutter={[32, 32]}>
            <Col xs={24} sm={12} md={6}>
              <Title level={4} style={{ color: 'white' }}>2THIER ENERGY</Title>
              <Paragraph style={{ color: '#9ca3af' }}>
                Votre partenaire en transition énergétique depuis 2020
              </Paragraph>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Title level={5} style={{ color: 'white' }}>Solutions</Title>
              <Space direction="vertical">
                <a href="#" style={{ color: '#9ca3af' }}>Photovoltaïque</a>
                <a href="#" style={{ color: '#9ca3af' }}>Batteries</a>
                <a href="#" style={{ color: '#9ca3af' }}>Bornes de Recharge</a>
                <a href="#" style={{ color: '#9ca3af' }}>Pompes à Chaleur</a>
              </Space>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Title level={5} style={{ color: 'white' }}>Entreprise</Title>
              <Space direction="vertical">
                <a href="#" style={{ color: '#9ca3af' }}>À propos</a>
                <a href="#" style={{ color: '#9ca3af' }}>Réalisations</a>
                <a href="#" style={{ color: '#9ca3af' }}>Blog</a>
                <a href="#" style={{ color: '#9ca3af' }}>Contact</a>
              </Space>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Title level={5} style={{ color: 'white' }}>Contact</Title>
              <Space direction="vertical">
                <Text style={{ color: '#9ca3af' }}>071/XX.XX.XX</Text>
                <Text style={{ color: '#9ca3af' }}>info@2thier.be</Text>
                <Text style={{ color: '#9ca3af' }}>Lu-Ve: 8h-18h</Text>
              </Space>
            </Col>
          </Row>
          <Divider style={{ borderColor: '#374151', margin: '40px 0 24px' }} />
          <div style={{ textAlign: 'center' }}>
            <Text style={{ color: '#6b7280', fontSize: '14px' }}>
              © 2025 2Thier Energy - Tous droits réservés • BE 0XXX.XXX.XXX • Agrégation Classe 1 • RESCERT Certifié
            </Text>
          </div>
        </div>
      </Footer>
    </Layout>
  );
};

export default SiteVitrine2Thier;
