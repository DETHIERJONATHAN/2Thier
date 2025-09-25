import React, { useState, useEffect } from 'react';
import { Button, Card, Row, Col, Typography, Space, Form, Input, Select, Rate, Avatar, Statistic, Badge, Tag, Modal, message, Checkbox } from 'antd';
import { 
  RocketOutlined, 
  TrophyOutlined, 
  SafetyOutlined, 
  ThunderboltOutlined,
  CheckCircleOutlined,
  PhoneOutlined,
  MailOutlined,
  HomeOutlined,
  ToolOutlined,
  CarOutlined,
  BankOutlined,
  HeartOutlined,
  ShoppingOutlined,
  CameraOutlined,
  LaptopOutlined,
  RiseOutlined,
  UserOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  TeamOutlined,
  GlobalOutlined
} from '@ant-design/icons';
import PartenairesSection from '../../components/devis1minute/PartenairesSection';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useLocation, useNavigate } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

// Interface pour les leads
interface LeadRequest {
  category: string;
  title: string;
  description: string;
  budget?: number;
  urgency: 'low' | 'medium' | 'high';
  postalCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  preferredContact: 'phone' | 'email';
  availableTimeSlots: string[];
}

// Categories de services avec icons
const serviceCategories = [
  { key: 'renovation', label: 'Rénovation & Travaux', icon: <ToolOutlined />, color: '#1890ff' },
  { key: 'energy', label: 'Énergie & Isolation', icon: <ThunderboltOutlined />, color: '#52c41a' },
  { key: 'garden', label: 'Jardin & Extérieur', icon: <HomeOutlined />, color: '#722ed1' },
  { key: 'vehicle', label: 'Automobile', icon: <CarOutlined />, color: '#fa8c16' },
  { key: 'finance', label: 'Finance & Assurance', icon: <BankOutlined />, color: '#13c2c2' },
  { key: 'health', label: 'Santé & Bien-être', icon: <HeartOutlined />, color: '#eb2f96' },
  { key: 'events', label: 'Événements', icon: <ShoppingOutlined />, color: '#f5222d' },
  { key: 'photo', label: 'Photo & Vidéo', icon: <CameraOutlined />, color: '#fa541c' },
  { key: 'tech', label: 'Informatique', icon: <LaptopOutlined />, color: '#2f54eb' },
  { key: 'other', label: 'Autres services', icon: <GlobalOutlined />, color: '#666' }
];

// Témoignages clients
const testimonials = [
  {
    name: "Marie D.",
    location: "Paris 15ème",
    category: "Rénovation cuisine",
    rating: 5,
    comment: "J'ai reçu 3 devis en 24h ! Super efficace, j'ai économisé 30% sur mon projet.",
    avatar: "M",
    savings: "1,200€"
  },
  {
    name: "Philippe M.", 
    location: "Lyon 3ème",
    category: "Installation pompe à chaleur",
    rating: 5,
    comment: "Les artisans étaient qualifiés et le suivi impeccable. Je recommande !",
    avatar: "P",
    savings: "2,800€"
  },
  {
    name: "Sophie L.",
    location: "Marseille 8ème", 
    category: "Aménagement jardin",
    rating: 5,
    comment: "Processus simple et pros réactifs. Mon jardin est magnifique !",
    avatar: "S", 
    savings: "900€"
  }
];

// Stats de la plateforme
const platformStats = {
  totalRequests: 15420,
  totalProfessionals: 2847,
  avgSavings: 1650,
  satisfactionRate: 4.8
};

export default function LandingPage() {
  const [msgApi, msgCtx] = message.useMessage();
  const [form] = Form.useForm();
  const { api } = useAuthenticatedApi();
  const location = useLocation();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [leadData, setLeadData] = useState<Partial<LeadRequest>>({});
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [utm, setUtm] = useState<{ utmSource?: string; utmMedium?: string; utmCampaign?: string }>({});

  // Animation counter pour les stats
  const [animatedStats, setAnimatedStats] = useState({
    requests: 0,
    professionals: 0,
    savings: 0
  });

  useEffect(() => {
    // Animation des statistiques au chargement
    const animateStats = () => {
      const duration = 2000;
      const steps = 60;
      const stepDuration = duration / steps;
      
      let step = 0;
      const timer = setInterval(() => {
        step++;
        const progress = step / steps;
        
        setAnimatedStats({
          requests: Math.floor(platformStats.totalRequests * progress),
          professionals: Math.floor(platformStats.totalProfessionals * progress),
          savings: Math.floor(platformStats.avgSavings * progress)
        });
        
        if (step >= steps) {
          clearInterval(timer);
        }
      }, stepDuration);
    };
    
    animateStats();
  }, []);

  // Capturer les paramètres UTM (si présents)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const utmSource = params.get('utm_source') || params.get('source') || undefined;
    const utmMedium = params.get('utm_medium') || undefined;
    const utmCampaign = params.get('utm_campaign') || undefined;
    setUtm({ utmSource, utmMedium, utmCampaign });
  }, [location.search]);

  const handleCategorySelect = (category: string) => {
    setLeadData(prev => ({ ...prev, category }));
    setCurrentStep(2);
  };

  const handleFormSubmit = async (values: Record<string, unknown>) => {
    try {
      setIsSubmitting(true);
      
      const finalLeadData = {
        ...leadData,
        ...values,
        urgency: values.urgency || 'medium',
        availableTimeSlots: values.availableTimeSlots || []
      };
      // Appel API public: POST /api/forms/submit
      const payload = {
        // Champs requis par l'API publique
        formId: undefined,
        firstName: finalLeadData.firstName,
        lastName: finalLeadData.lastName,
        email: finalLeadData.email,
        phone: finalLeadData.phone,
        company: undefined,
        address: undefined,
        city: undefined,
        region: undefined,
        postalCode: finalLeadData.postalCode,
        projectType: finalLeadData.category, // catégorie sélectionnée
        projectDescription: finalLeadData.description,
        budget: finalLeadData.budget,
        timeline: finalLeadData.urgency,
        // Tracking UTM
        utmSource: utm.utmSource || 'devis1minute',
        utmMedium: utm.utmMedium || 'form',
        utmCampaign: utm.utmCampaign || 'landing',
        // Consentements RGPD
        privacyConsent: !!values.privacyConsent,
        marketingConsent: !!values.marketingConsent,
        // Préférences de contact (facultatif côté API)
        preferredContact: finalLeadData.preferredContact,
        availableTimeSlots: finalLeadData.availableTimeSlots
      };

      const res = await api.post('/api/forms/submit', payload);
      if (!res?.success) {
        throw new Error(res?.message || res?.error || 'Échec de l\'envoi');
      }

      msgApi.success('Votre demande a été envoyée ! Vous allez recevoir des devis sous 24h.');
      setIsModalVisible(false);
      form.resetFields();
      setCurrentStep(1);
      setLeadData({});
      // Rediriger vers page de remerciement
      navigate('/devis1minute/merci');
      
    } catch (error) {
      console.error('Erreur lors de l\'envoi:', error);
      msgApi.error('Erreur lors de l\'envoi de votre demande. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCategory = serviceCategories.find(cat => cat.key === leadData.category);

  return (
    <div className="min-h-screen bg-white">
      {msgCtx}
      {/* Header Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="text-center mb-12">
            <Title level={1} className="text-white text-5xl font-bold mb-4">
              <RocketOutlined className="mr-4" />
              Devis1Minute
            </Title>
            <Title level={2} className="text-blue-100 font-light mb-6">
              Obtenez 3 devis qualifiés en moins de 24h
            </Title>
            <Paragraph className="text-blue-100 text-xl max-w-2xl mx-auto">
              Notre IA connecte votre projet aux meilleurs artisans de votre région. 
              Gratuit, rapide et sans engagement.
            </Paragraph>
          </div>

          {/* CTA Principal */}
          <div className="text-center mb-16">
            <Button 
              type="primary" 
              size="large" 
              className="bg-orange-500 border-orange-500 hover:bg-orange-600 text-xl h-16 px-12 rounded-full shadow-2xl"
              onClick={() => setIsModalVisible(true)}
            >
              <ThunderboltOutlined />
              Démarrer ma demande GRATUITE
            </Button>
            <div className="mt-4 text-blue-100">
              <CheckCircleOutlined className="mr-2" />
              Plus de 15 000 demandes traitées • 4.8/5 de satisfaction
            </div>
          </div>

          {/* Stats animées */}
          <Row gutter={[24, 24]} className="text-center">
            <Col xs={24} md={8}>
              <Card className="bg-white/10 backdrop-blur border-0 text-white">
                <Statistic
                  title={<span className="text-blue-100">Demandes traitées</span>}
                  value={animatedStats.requests}
                  prefix={<RiseOutlined />}
                  valueStyle={{ color: '#fff', fontSize: '32px' }}
                  suffix="+"
                />
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card className="bg-white/10 backdrop-blur border-0 text-white">
                <Statistic
                  title={<span className="text-blue-100">Professionnels partenaires</span>}
                  value={animatedStats.professionals}
                  prefix={<TeamOutlined />}
                  valueStyle={{ color: '#fff', fontSize: '32px' }}
                  suffix="+"
                />
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card className="bg-white/10 backdrop-blur border-0 text-white">
                <Statistic
                  title={<span className="text-blue-100">Économie moyenne</span>}
                  value={animatedStats.savings}
                  prefix={<DollarOutlined />}
                  valueStyle={{ color: '#fff', fontSize: '32px' }}
                  suffix="€"
                />
              </Card>
            </Col>
          </Row>
        </div>
      </div>

      {/* Section Catégories de Services */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <Title level={2}>Tous vos projets, un seul endroit</Title>
            <Paragraph className="text-lg text-gray-600">
              De la rénovation à l'automobile, nos experts vous accompagnent
            </Paragraph>
          </div>

          <Row gutter={[24, 24]}>
            {serviceCategories.map((category) => (
              <Col xs={24} sm={12} md={8} lg={6} key={category.key}>
                <Card 
                  hoverable
                  className="text-center h-full border-0 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                  onClick={() => handleCategorySelect(category.key)}
                >
                  <div 
                    className="text-4xl mb-4 p-4 rounded-full inline-block"
                    style={{ backgroundColor: `${category.color}15`, color: category.color }}
                  >
                    {category.icon}
                  </div>
                  <Title level={4} className="mb-2">{category.label}</Title>
                  <Text type="secondary">Artisans qualifiés</Text>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </div>

      {/* Section Comment ça marche */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <Title level={2}>Comment ça marche ?</Title>
            <Paragraph className="text-lg text-gray-600">
              3 étapes simples pour obtenir vos devis
            </Paragraph>
          </div>

          <Row gutter={[48, 48]} align="middle">
            <Col xs={24} md={8} className="text-center">
              <div className="mb-6">
                <div className="inline-block p-6 bg-blue-100 rounded-full mb-4">
                  <UserOutlined className="text-4xl text-blue-600" />
                </div>
                <Badge count="1" className="absolute -ml-4 -mt-4" />
              </div>
              <Title level={3} className="text-blue-600 mb-4">Décrivez votre projet</Title>
              <Paragraph className="text-lg">
                Quelques questions simples sur vos besoins, 
                votre budget et vos délais.
              </Paragraph>
            </Col>

            <Col xs={24} md={8} className="text-center">
              <div className="mb-6">
                <div className="inline-block p-6 bg-green-100 rounded-full mb-4">
                  <ClockCircleOutlined className="text-4xl text-green-600" />
                </div>
                <Badge count="2" className="absolute -ml-4 -mt-4" />
              </div>
              <Title level={3} className="text-green-600 mb-4">Notre IA vous trouve des pros</Title>
              <Paragraph className="text-lg">
                En moins de 30 minutes, nous identifions 
                les meilleurs artisans de votre région.
              </Paragraph>
            </Col>

            <Col xs={24} md={8} className="text-center">
              <div className="mb-6">
                <div className="inline-block p-6 bg-orange-100 rounded-full mb-4">
                  <TrophyOutlined className="text-4xl text-orange-600" />
                </div>
                <Badge count="3" className="absolute -ml-4 -mt-4" />
              </div>
              <Title level={3} className="text-orange-600 mb-4">Recevez vos devis</Title>
              <Paragraph className="text-lg">
                Jusqu'à 3 devis détaillés sous 24h. 
                Comparez et choisissez en toute sérénité.
              </Paragraph>
            </Col>
          </Row>
        </div>
      </div>

      {/* Section Témoignages */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <Title level={2}>Ils nous font confiance</Title>
            <div className="flex justify-center items-center gap-2 mb-4">
              <Rate disabled defaultValue={platformStats.satisfactionRate} />
              <Text className="text-lg font-semibold">
                {platformStats.satisfactionRate}/5 ({platformStats.totalRequests}+ avis)
              </Text>
            </div>
          </div>

          <Row gutter={[24, 24]}>
            {testimonials.map((testimonial, index) => (
              <Col xs={24} md={8} key={index}>
                <Card className="h-full border-0 shadow-md">
                  <div className="flex items-center mb-4">
                    <Avatar size="large" className="bg-blue-500 mr-3">
                      {testimonial.avatar}
                    </Avatar>
                    <div>
                      <Title level={5} className="mb-0">{testimonial.name}</Title>
                      <Text type="secondary">{testimonial.location}</Text>
                    </div>
                    <div className="ml-auto">
                      <Tag color="green">-{testimonial.savings}</Tag>
                    </div>
                  </div>
                  <Rate disabled defaultValue={testimonial.rating} className="mb-3" />
                  <Paragraph className="mb-2">"{testimonial.comment}"</Paragraph>
                  <Text type="secondary" className="text-sm">
                    Projet: {testimonial.category}
                  </Text>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </div>

      {/* Section Avantages */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <Title level={2}>Pourquoi choisir Devis1Minute ?</Title>
          </div>

          <Row gutter={[32, 32]}>
            <Col xs={24} md={6} className="text-center">
              <SafetyOutlined className="text-5xl text-blue-500 mb-4" />
              <Title level={4}>100% Gratuit</Title>
              <Paragraph>
                Notre service est entièrement gratuit pour les particuliers.
                Aucun frais caché.
              </Paragraph>
            </Col>

            <Col xs={24} md={6} className="text-center">
              <ThunderboltOutlined className="text-5xl text-orange-500 mb-4" />
              <Title level={4}>Ultra Rapide</Title>
              <Paragraph>
                Devis sous 24h grâce à notre technologie IA
                et notre réseau de 2800+ professionnels.
              </Paragraph>
            </Col>

            <Col xs={24} md={6} className="text-center">
              <TrophyOutlined className="text-5xl text-green-500 mb-4" />
              <Title level={4}>Pros Qualifiés</Title>
              <Paragraph>
                Tous nos artisans sont vérifiés, assurés
                et évalués par nos clients.
              </Paragraph>
            </Col>

            <Col xs={24} md={6} className="text-center">
              <CheckCircleOutlined className="text-5xl text-purple-500 mb-4" />
              <Title level={4}>Sans Engagement</Title>
              <Paragraph>
                Recevez vos devis, comparez et décidez
                en toute liberté. Aucune obligation.
              </Paragraph>
            </Col>
          </Row>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-16 text-white">
        <div className="max-w-4xl mx-auto text-center px-4">
          <Title level={2} className="text-white mb-6">
            Prêt à économiser sur votre projet ?
          </Title>
          <Paragraph className="text-blue-100 text-xl mb-8">
            Rejoignez plus de 15 000 français qui ont fait confiance à Devis1Minute
          </Paragraph>
          <Button 
            type="primary" 
            size="large" 
            className="bg-orange-500 border-orange-500 hover:bg-orange-600 text-xl h-16 px-12 rounded-full"
            onClick={() => setIsModalVisible(true)}
          >
            <RocketOutlined />
            Commencer maintenant - C'est gratuit !
          </Button>
        </div>
      </div>

      {/* Section Nos Partenaires de Confiance */}
      <PartenairesSection />

      {/* Modal de création de demande */}
      <Modal
        title={
          <Space>
            {selectedCategory?.icon}
            {currentStep === 1 ? 'Choisissez votre catégorie' : `${selectedCategory?.label} - Détails du projet`}
          </Space>
        }
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setCurrentStep(1);
          setLeadData({});
          form.resetFields();
        }}
        footer={null}
        width={800}
        className="lead-modal"
      >
        {currentStep === 1 ? (
          <div className="grid grid-cols-2 gap-4">
            {serviceCategories.map((category) => (
              <Card 
                key={category.key}
                hoverable
                className="text-center border-2 hover:border-blue-500"
                onClick={() => handleCategorySelect(category.key)}
              >
                <div 
                  className="text-3xl mb-2"
                  style={{ color: category.color }}
                >
                  {category.icon}
                </div>
                <Text strong>{category.label}</Text>
              </Card>
            ))}
          </div>
        ) : (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleFormSubmit}
            className="space-y-4"
          >
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name="title"
                  label="Titre de votre projet"
                  rules={[{ required: true, message: 'Veuillez saisir un titre' }]}
                >
                  <Input placeholder="Ex: Rénovation salle de bain 10m²" size="large" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name="description"
                  label="Description détaillée"
                  rules={[{ required: true, message: 'Veuillez décrire votre projet' }]}
                >
                  <TextArea 
                    rows={4} 
                    placeholder="Décrivez votre projet en détail : surface, matériaux souhaités, délais, contraintes..." 
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="budget"
                  label="Budget approximatif (€)"
                >
                  <Select size="large" placeholder="Sélectionnez votre budget">
                    <Select.Option value="500">Moins de 500€</Select.Option>
                    <Select.Option value="1000">500€ - 1 000€</Select.Option>
                    <Select.Option value="2500">1 000€ - 2 500€</Select.Option>
                    <Select.Option value="5000">2 500€ - 5 000€</Select.Option>
                    <Select.Option value="10000">5 000€ - 10 000€</Select.Option>
                    <Select.Option value="25000">10 000€ - 25 000€</Select.Option>
                    <Select.Option value="50000">Plus de 25 000€</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="urgency"
                  label="Urgence"
                  rules={[{ required: true, message: 'Sélectionnez l\'urgence' }]}
                >
                  <Select size="large" placeholder="Quand souhaitez-vous commencer ?">
                    <Select.Option value="low">Dans 3+ mois</Select.Option>
                    <Select.Option value="medium">Dans 1-3 mois</Select.Option>
                    <Select.Option value="high">Dès que possible</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="firstName"
                  label="Prénom"
                  rules={[{ required: true, message: 'Votre prénom' }]}
                >
                  <Input size="large" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="lastName" 
                  label="Nom"
                  rules={[{ required: true, message: 'Votre nom' }]}
                >
                  <Input size="large" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="postalCode"
                  label="Code postal"
                  rules={[
                    { required: true, message: 'Code postal requis' },
                    { pattern: /^\d{5}$/, message: 'Format invalide' }
                  ]}
                >
                  <Input size="large" placeholder="75001" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="phone"
                  label="Téléphone"
                  rules={[{ required: true, message: 'Numéro requis' }]}
                >
                  <Input size="large" placeholder="06 12 34 56 78" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="email"
                  label="Email"
                  rules={[
                    { required: true, message: 'Email requis' },
                    { type: 'email', message: 'Email invalide' }
                  ]}
                >
                  <Input size="large" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name="preferredContact"
                  label="Contact préféré"
                  rules={[{ required: true }]}
                >
                  <Select size="large">
                    <Select.Option value="phone">
                      <PhoneOutlined className="mr-2" />
                      Téléphone
                    </Select.Option>
                    <Select.Option value="email">
                      <MailOutlined className="mr-2" />
                      Email
                    </Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            {/* Consentements RGPD */}
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name="privacyConsent"
                  valuePropName="checked"
                  rules={[
                    {
                      validator: (_, value) =>
                        value ? Promise.resolve() : Promise.reject(new Error('Vous devez accepter la politique de confidentialité'))
                    }
                  ]}
                >
                  <Checkbox>
                    J'accepte la politique de confidentialité et le traitement de mes données pour traiter ma demande
                  </Checkbox>
                </Form.Item>
                <Form.Item name="marketingConsent" valuePropName="checked" initialValue={false}>
                  <Checkbox>
                    J'accepte de recevoir des offres et communications marketing pertinentes
                  </Checkbox>
                </Form.Item>
              </Col>
            </Row>

            <div className="text-center pt-6 border-t">
              <Button 
                type="primary" 
                htmlType="submit" 
                size="large"
                loading={isSubmitting}
                className="bg-blue-600 px-12 h-12"
              >
                <RocketOutlined />
                {isSubmitting ? 'Envoi en cours...' : 'Recevoir mes devis gratuits'}
              </Button>
              <div className="mt-3 text-sm text-gray-500">
                <CheckCircleOutlined className="mr-1" />
                Vos informations sont sécurisées et ne seront partagées qu'avec les artisans sélectionnés
              </div>
            </div>
          </Form>
        )}
      </Modal>
    </div>
  );
}
