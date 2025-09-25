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
  Modal
} from 'antd';
import {
  ThunderboltOutlined,
  HomeOutlined,
  FireOutlined,
  ToolOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  StarFilled,
  TrophyOutlined,
  SafetyCertificateOutlined,
  CustomerServiceOutlined,
  CheckCircleOutlined,
  RocketOutlined,
  HeartOutlined,
  BulbOutlined
} from '@ant-design/icons';
import { useAuth } from '../auth/useAuth';

const { Title, Paragraph, Text } = Typography;

interface Service {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  benefits: string[];
  price?: string;
  popular?: boolean;
}

interface Testimonial {
  id: string;
  name: string;
  location: string;
  rating: number;
  comment: string;
  service: string;
  date: string;
}

const SiteVitrinePage: React.FC = () => {
  const { user } = useAuth();
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const services: Service[] = [
    {
      id: 'panneaux-pv',
      title: 'Panneaux Photovoltaïques',
      description: 'Installation complète de panneaux solaires pour réduire votre facture énergétique de 70%',
      icon: <ThunderboltOutlined style={{ fontSize: '48px', color: '#52c41a' }} />,
      benefits: [
        'Réduction facture électrique jusqu\'à 70%',
        'Installation en 1 journée',
        'Garantie 25 ans sur les panneaux',
        'Maintenance incluse 10 ans',
        'ROI garanti sous 8 ans'
      ],
      price: 'À partir de 8.500€',
      popular: true
    },
    {
      id: 'toitures',
      title: 'Rénovation Toitures',
      description: 'Réfection complète ou réparation de toiture avec isolation thermique performante',
      icon: <HomeOutlined style={{ fontSize: '48px', color: '#1890ff' }} />,
      benefits: [
        'Isolation thermique renforcée',
        'Étanchéité parfaite garantie',
        'Matériaux haute qualité',
        'Devis gratuit sous 48h',
        'Garantie décennale'
      ],
      price: 'À partir de 12.000€'
    },
    {
      id: 'pac-air-air',
      title: 'Pompes à Chaleur Air-Air',
      description: 'Système de climatisation réversible pour chauffage/rafraîchissement optimal',
      icon: <FireOutlined style={{ fontSize: '48px', color: '#fa541c' }} />,
      benefits: [
        'Économies jusqu\'à 60% sur chauffage',
        'Climatisation incluse',
        'Installation rapide',
        'Technologie Inverter',
        'Garantie 5 ans'
      ],
      price: 'À partir de 3.200€'
    },
    {
      id: 'pac-air-eau',
      title: 'Pompes à Chaleur Air-Eau',
      description: 'Solution complète chauffage + eau chaude sanitaire avec haute performance',
      icon: <FireOutlined style={{ fontSize: '48px', color: '#13c2c2' }} />,
      benefits: [
        'Chauffage + ECS en un système',
        'COP jusqu\'à 5.2',
        'Compatible radiateurs existants',
        'Pilotage intelligent',
        'Aides d\'État disponibles'
      ],
      price: 'À partir de 8.900€'
    },
    {
      id: 'thermodynamique',
      title: 'Chauffe-eau Thermodynamique',
      description: 'Production d\'eau chaude écologique avec récupération calories ambiantes',
      icon: <BulbOutlined style={{ fontSize: '48px', color: '#722ed1' }} />,
      benefits: [
        'Économies 70% sur ECS',
        'Installation simple',
        'Écologique et silencieux',
        'Capacité 200-300L',
        'Garantie 7 ans'
      ],
      price: 'À partir de 2.400€'
    }
  ];

  const testimonials: Testimonial[] = [
    {
      id: '1',
      name: 'Pierre Martin',
      location: 'Bruxelles',
      rating: 5,
      comment: 'Installation photovoltaïque impeccable ! Facture électrique divisée par 3. Équipe professionnelle et ponctuelle.',
      service: 'Panneaux Photovoltaïques',
      date: '2025-07-15'
    },
    {
      id: '2', 
      name: 'Marie Dubois',
      location: 'Liège',
      rating: 5,
      comment: 'Pompe à chaleur installée rapidement. Maison chauffée parfaitement même en hiver. Très satisfaite !',
      service: 'Pompe à Chaleur Air-Eau',
      date: '2025-06-20'
    },
    {
      id: '3',
      name: 'Jean Lefebvre', 
      location: 'Namur',
      rating: 5,
      comment: 'Réfection toiture avec isolation. Maison beaucoup mieux isolée, plus de problèmes d\'humidité.',
      service: 'Rénovation Toitures',
      date: '2025-08-01'
    }
  ];

  const stats = {
    installations: 1847,
    satisfaction: 98.5,
    economies: 65,
    garantie: 25
  };

  const handleContactService = (service: Service) => {
    setSelectedService(service);
    setContactModalVisible(true);
  };

  const handleContactSubmit = () => {
    // Intégration avec le système CRM existant
    setContactModalVisible(false);
    setSelectedService(null);
  };

  return (
    <div style={{ padding: '20px', background: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header Hero */}
      <Card style={{ marginBottom: '20px', background: 'linear-gradient(135deg, #1890ff 0%, #52c41a 100%)', border: 'none' }}>
        <Row align="middle" justify="center" style={{ textAlign: 'center', padding: '40px 0' }}>
          <Col span={24}>
            <Title level={1} style={{ color: 'white', fontSize: '48px', fontWeight: 'bold' }}>
              2THIER CRM
            </Title>
            <Title level={2} style={{ color: 'white', fontWeight: 'normal', marginTop: '10px' }}>
              Solutions Énergétiques Complètes
            </Title>
            <Paragraph style={{ color: 'white', fontSize: '18px', marginTop: '20px', maxWidth: '800px', margin: '20px auto' }}>
              Spécialistes en panneaux photovoltaïques, pompes à chaleur, rénovation toitures et solutions thermodynamiques. 
              Plus de 1800 installations réussies en Belgique.
            </Paragraph>
            <Space size="large" style={{ marginTop: '30px' }}>
              <Button type="primary" size="large" style={{ height: '50px', padding: '0 30px', fontSize: '16px' }}>
                <PhoneOutlined /> Devis Gratuit
              </Button>
              <Button type="default" size="large" style={{ height: '50px', padding: '0 30px', fontSize: '16px', background: 'white' }}>
                <ToolOutlined /> Nos Réalisations
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Statistiques Clés */}
      <Card style={{ marginBottom: '20px' }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Installations Réalisées"
              value={stats.installations}
              prefix={<TrophyOutlined style={{ color: '#52c41a' }} />}
              suffix="+"
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Satisfaction Client"
              value={stats.satisfaction}
              prefix={<StarFilled style={{ color: '#faad14' }} />}
              suffix="%"
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Économies Moyennes"
              value={stats.economies}
              prefix={<HeartOutlined style={{ color: '#1890ff' }} />}
              suffix="%"
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Garantie Maximale"
              value={stats.garantie}
              prefix={<SafetyCertificateOutlined style={{ color: '#722ed1' }} />}
              suffix=" ans"
            />
          </Col>
        </Row>
      </Card>

      {/* Services Détaillés */}
      <Title level={2} style={{ textAlign: 'center', margin: '40px 0' }}>
        <RocketOutlined /> Nos Solutions Énergétiques
      </Title>

      <Row gutter={[20, 20]} style={{ marginBottom: '40px' }}>
        {services.map((service) => (
          <Col key={service.id} xs={24} md={12} lg={8}>
            <Card
              hoverable
              style={{ height: '100%', position: 'relative' }}
              actions={[
                <Button 
                  type="primary" 
                  block 
                  onClick={() => handleContactService(service)}
                  style={{ margin: '0 16px 16px 16px' }}
                >
                  <PhoneOutlined /> Devis Gratuit
                </Button>
              ]}
            >
              {service.popular && (
                <Badge.Ribbon text="Le + Populaire" color="red">
                  <div />
                </Badge.Ribbon>
              )}
              
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                {service.icon}
                <Title level={3} style={{ marginTop: '15px' }}>
                  {service.title}
                </Title>
              </div>

              <Paragraph style={{ color: '#666', textAlign: 'center', marginBottom: '20px' }}>
                {service.description}
              </Paragraph>

              <List
                size="small"
                dataSource={service.benefits}
                renderItem={(benefit) => (
                  <List.Item>
                    <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                    {benefit}
                  </List.Item>
                )}
              />

              {service.price && (
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                  <Tag color="blue" style={{ fontSize: '14px', padding: '5px 10px' }}>
                    {service.price}
                  </Tag>
                </div>
              )}
            </Card>
          </Col>
        ))}
      </Row>

      {/* Témoignages Clients */}
      <Title level={2} style={{ textAlign: 'center', margin: '40px 0' }}>
        <StarFilled /> Témoignages Clients
      </Title>

      <Row gutter={[20, 20]} style={{ marginBottom: '40px' }}>
        {testimonials.map((testimonial) => (
          <Col key={testimonial.id} xs={24} md={8}>
            <Card>
              <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                <Avatar size={64} style={{ backgroundColor: '#1890ff' }}>
                  {testimonial.name.split(' ').map(n => n[0]).join('')}
                </Avatar>
                <Title level={4} style={{ margin: '10px 0 5px 0' }}>
                  {testimonial.name}
                </Title>
                <Text type="secondary">
                  <EnvironmentOutlined /> {testimonial.location}
                </Text>
                <div style={{ margin: '10px 0' }}>
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <StarFilled key={i} style={{ color: '#faad14' }} />
                  ))}
                </div>
              </div>
              
              <Paragraph italic style={{ textAlign: 'center', color: '#666' }}>
                "{testimonial.comment}"
              </Paragraph>
              
              <div style={{ textAlign: 'center' }}>
                <Tag color="green">{testimonial.service}</Tag>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Call to Action Final */}
      <Card style={{ background: 'linear-gradient(135deg, #722ed1 0%, #1890ff 100%)', border: 'none' }}>
        <Row align="middle" justify="center" style={{ textAlign: 'center', padding: '30px 0' }}>
          <Col span={24}>
            <Title level={2} style={{ color: 'white' }}>
              Prêt à Réduire Vos Factures Énergétiques ?
            </Title>
            <Paragraph style={{ color: 'white', fontSize: '16px', marginBottom: '30px' }}>
              Devis gratuit sous 48h • Installation professionnelle • Garanties étendues
            </Paragraph>
            <Space size="large">
              <Button 
                type="primary" 
                size="large" 
                style={{ height: '50px', padding: '0 40px', fontSize: '16px', background: 'white', color: '#1890ff' }}
              >
                <PhoneOutlined /> 0800 / 12 345
              </Button>
              <Button 
                type="default" 
                size="large"
                style={{ height: '50px', padding: '0 40px', fontSize: '16px', borderColor: 'white', color: 'white' }}
              >
                <MailOutlined /> contact@2thier.be
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Modal Contact Service */}
      <Modal
        title={`Demande de devis - ${selectedService?.title}`}
        open={contactModalVisible}
        onCancel={() => setContactModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setContactModalVisible(false)}>
            Annuler
          </Button>,
          <Button key="submit" type="primary" onClick={handleContactSubmit}>
            <PhoneOutlined /> Envoyer la demande
          </Button>
        ]}
        width={600}
      >
        {selectedService && (
          <div>
            <Alert 
              message="Devis 100% Gratuit et Sans Engagement"
              description="Notre équipe vous contactera sous 24h pour planifier une visite technique."
              type="success"
              showIcon
              style={{ marginBottom: '20px' }}
            />
            
            <Paragraph>
              <strong>Service sélectionné :</strong> {selectedService.title}
            </Paragraph>
            <Paragraph>
              <strong>Prix indicatif :</strong> {selectedService.price}
            </Paragraph>
            
            <Title level={4}>Avantages inclus :</Title>
            <List
              size="small"
              dataSource={selectedService.benefits}
              renderItem={(benefit) => (
                <List.Item>
                  <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                  {benefit}
                </List.Item>
              )}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SiteVitrinePage;
