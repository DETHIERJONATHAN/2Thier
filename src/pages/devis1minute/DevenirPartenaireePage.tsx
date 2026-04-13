import React, { useState } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Select, 
  Button, 
  Steps, 
  Typography, 
  Row, 
  Col, 
  Upload, 
  Divider,
  Statistic,
  Badge,
  Space,
  Alert,
  Checkbox
} from 'antd';
import { 
  UserOutlined, 
  FileTextOutlined, 
  SafetyCertificateOutlined,
  UploadOutlined,
  EuroOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  StarOutlined,
  ToolOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { logger } from '../../lib/logger';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;
const { Step } = Steps;
const { Option } = Select;

const DevenirPartenairePage: React.FC = () => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const secteurs = [
    'Électricité', 'Plomberie', 'Chauffage', 'Climatisation',
    'Carrelage', 'Peinture', 'Menuiserie', 'Isolation',
    'Toiture', 'Maçonnerie', 'Jardinage', 'Nettoyage'
  ];

  const avantages = [
    { icon: <EuroOutlined />, titre: '1500-3000€/mois', description: 'Revenus moyens nos partenaires' },
    { icon: <TeamOutlined />, titre: 'Leads qualifiés', description: 'Clients pré-sélectionnés par IA' },
    { icon: <CheckCircleOutlined />, titre: 'Sans engagement', description: 'Arrêt possible à tout moment' },
    { icon: <StarOutlined />, titre: 'Support dédié', description: 'Équipe locale pour vous accompagner' }
  ];

  const etapes = [
    { titre: 'Informations', description: 'Votre profil professionnel' },
    { titre: 'Qualifications', description: 'Certifications et assurances' },
    { titre: 'Validation', description: 'Vérification et activation' }
  ];

  const handleSubmit = async (values: unknown) => {
    setLoading(true);
    try {
      // TODO: Intégrer avec l'API
      logger.debug('Inscription professionnel:', values);
      
      // Simulation appel API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      message.success({
        content: 'Candidature envoyée ! Redirection vers votre espace professionnel...',
        duration: 3,
      });
      
      // Redirection vers la page de connexion pour que le professionnel se connecte au CRM
      setTimeout(() => {
        window.location.href = '/connexion?message=Veuillez vous connecter pour accéder à votre espace professionnel Devis1Minute&redirect=/espace-pro';
      }, 2000);
    } catch (error) {
      message.error('Erreur lors de l\'inscription. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Row gutter={[24, 24]}>
            <Col span={12}>
              <Form.Item
                label={t('fields.firstName')}
                name="prenom"
                rules={[{ required: true, message: 'Prénom requis' }]}
              >
                <Input placeholder="Votre prénom" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={t('fields.name')}
                name="nom"
                rules={[{ required: true, message: 'Nom requis' }]}
              >
                <Input placeholder="Votre nom" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={t('fields.phone')}
                name="telephone"
                rules={[{ required: true, message: 'Téléphone requis' }]}
              >
                <Input placeholder="06 12 34 56 78" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={t('fields.email')}
                name="email"
                rules={[
                  { required: true, message: 'Email requis' },
                  { type: 'email', message: 'Email invalide' }
                ]}
              >
                <Input placeholder="votre@email.fr" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                label="Secteur d'activité principal"
                name="secteur"
                rules={[{ required: true, message: 'Secteur requis' }]}
              >
                <Select placeholder="Choisissez votre spécialité">
                  {secteurs.map(secteur => (
                    <Option key={secteur} value={secteur}>{secteur}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                label="Zone d'intervention"
                name="zone"
                rules={[{ required: true, message: 'Zone requise' }]}
              >
                <Input placeholder="Paris, Lyon, rayon de 30km autour de..." />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                label="Expérience (en années)"
                name="experience"
                rules={[{ required: true, message: 'Expérience requise' }]}
              >
                <Select placeholder="Votre expérience">
                  <Option value="1-2">1-2 ans</Option>
                  <Option value="3-5">3-5 ans</Option>
                  <Option value="6-10">6-10 ans</Option>
                  <Option value="10+">Plus de 10 ans</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        );

      case 1:
        return (
          <div>
            <Alert
              message="Documents requis pour valider votre inscription"
              description="Ces documents garantissent la qualité de notre marketplace"
              type="info"
              style={{ marginBottom: 24 }}
            />
            
            <Row gutter={[24, 24]}>
              <Col span={12}>
                <Form.Item
                  label="SIRET"
                  name="siret"
                  rules={[{ required: true, message: 'SIRET requis' }]}
                >
                  <Input placeholder="123 456 789 00012" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Forme juridique"
                  name="forme_juridique"
                  rules={[{ required: true, message: 'Forme juridique requise' }]}
                >
                  <Select placeholder="Statut de votre entreprise">
                    <Option value="auto-entrepreneur">Auto-entrepreneur</Option>
                    <Option value="sas">SAS</Option>
                    <Option value="sarl">SARL</Option>
                    <Option value="artisan">Artisan</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item
                  label="Assurance responsabilité civile professionnelle"
                  name="assurance_rc"
                  rules={[{ required: true, message: 'Assurance RC requise' }]}
                >
                  <Upload>
                    <Button icon={<UploadOutlined />}>
                      Télécharger attestation assurance
                    </Button>
                  </Upload>
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item
                  label="Qualifications/Certifications"
                  name="certifications"
                >
                  <Upload multiple>
                    <Button icon={<UploadOutlined />}>
                      Télécharger diplômes/certifications
                    </Button>
                  </Upload>
                  <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                    Optionnel mais recommandé (Qualibat, RGE, etc.)
                  </Text>
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item
                  label="Présentation de votre activité"
                  name="presentation"
                  rules={[{ required: true, message: 'Présentation requise' }]}
                >
                  <TextArea 
                    rows={4} 
                    placeholder="Décrivez votre expérience, vos spécialités, ce qui vous différencie..."
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>
        );

      case 2:
        return (
          <div>
            <Card title="Récapitulatif de votre candidature" style={{ marginBottom: 24 }}>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Text strong>Secteur :</Text> {form.getFieldValue('secteur')}
                </Col>
                <Col span={12}>
                  <Text strong>Zone :</Text> {form.getFieldValue('zone')}
                </Col>
                <Col span={12}>
                  <Text strong>Expérience :</Text> {form.getFieldValue('experience')}
                </Col>
                <Col span={12}>
                  <Text strong>SIRET :</Text> {form.getFieldValue('siret')}
                </Col>
              </Row>
            </Card>

            <Alert
              message="Conditions d'utilisation et commission"
              description="En devenant partenaire Devis1Minute, vous acceptez nos conditions."
              type="warning"
              style={{ marginBottom: 16 }}
            />

            <Card title="💰 Notre modèle tarifaire transparent">
              <Row gutter={[16, 16]}>
                <Col span={8}>
                  <Statistic
                    title="Commission"
                    value={15}
                    suffix="%"
                    valueStyle={{ color: '#1890ff' }}
                  />
                  <Text type="secondary">Seulement sur les projets aboutis</Text>
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Leads/mois"
                    value="10-30"
                    valueStyle={{ color: '#52c41a' }}
                  />
                  <Text type="secondary">Selon votre secteur et zone</Text>
                </Col>
                <Col span={8}>
                  <Statistic
                    title="CA moyen"
                    value={2200}
                    suffix="€"
                    valueStyle={{ color: '#faad14' }}
                  />
                  <Text type="secondary">Revenus mensuels partenaires</Text>
                </Col>
              </Row>
            </Card>

            <div style={{ marginTop: 24 }}>
              <Form.Item
                name="accepte_conditions"
                valuePropName="checked"
                rules={[
                  { validator: (_, value) => 
                    value ? Promise.resolve() : Promise.reject('Vous devez accepter les conditions') 
                  }
                ]}
              >
                <Checkbox>
                  J'accepte les <a href="/conditions" target="_blank">conditions générales</a> et 
                  la <a href="/confidentialite" target="_blank">politique de confidentialité</a>
                </Checkbox>
              </Form.Item>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center">
            <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a', marginBottom: 16 }} />
            <Title level={3}>Candidature envoyée !</Title>
            <Paragraph>
              Notre équipe va examiner votre dossier et vous contacter sous 48h pour finaliser votre inscription.
            </Paragraph>
            <Button type="primary" size="large" onClick={() => window.location.href = '/'}>
              Retourner à l'accueil
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <Title level={1}>
            <ToolOutlined className="text-blue-600 mr-3" />
            Devenez Partenaire Devis1Minute
          </Title>
          <Paragraph className="text-xl text-gray-600 max-w-3xl mx-auto">
            Rejoignez notre réseau d'artisans qualifiés et développez votre activité 
            avec des leads qualifiés par intelligence artificielle
          </Paragraph>
        </div>

        {/* Avantages */}
        <Row gutter={[24, 24]} className="mb-12">
          {avantages.map((avantage, index) => (
            <Col key={`item-${index}`} xs={24} sm={12} lg={6}>
              <Card className="text-center h-full">
                <div className="text-4xl mb-4 text-blue-600">
                  {avantage.icon}
                </div>
                <Title level={4}>{avantage.titre}</Title>
                <Text type="secondary">{avantage.description}</Text>
              </Card>
            </Col>
          ))}
        </Row>

        {/* Formulaire d'inscription */}
        <Card className="max-w-4xl mx-auto">
          <Steps current={currentStep} className="mb-8">
            {etapes.map((etape, index) => (
              <Step 
                key={`item-${index}`} 
                title={etape.titre} 
                description={etape.description}
              />
            ))}
          </Steps>

          <Form 
            form={form} 
            layout="vertical" 
            onFinish={handleSubmit}
            className="mt-8"
          >
            {renderStepContent()}

            {currentStep < 3 && (
              <div className="flex justify-between mt-8">
                {currentStep > 0 && (
                  <Button 
                    onClick={() => setCurrentStep(currentStep - 1)}
                  >
                    Précédent
                  </Button>
                )}
                
                {currentStep < 2 ? (
                  <Button 
                    type="primary" 
                    onClick={() => setCurrentStep(currentStep + 1)}
                    className="ml-auto"
                  >
                    Suivant
                  </Button>
                ) : (
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    loading={loading}
                    size="large"
                    className="ml-auto"
                  >
                    Envoyer ma candidature
                  </Button>
                )}
              </div>
            )}
          </Form>
        </Card>

        {/* FAQ rapide */}
        <div className="mt-16 max-w-4xl mx-auto">
          <Title level={3} className="text-center mb-8">Questions fréquentes</Title>
          <Row gutter={[24, 24]}>
            <Col xs={24} md={12}>
              <Card>
                <Title level={5}>Combien coûte l'inscription ?</Title>
                <Text>L'inscription est totalement gratuite. Vous ne payez que sur les projets aboutis (15% de commission).</Text>
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card>
                <Title level={5}>Combien de leads par mois ?</Title>
                <Text>Entre 10 et 30 leads qualifiés selon votre secteur et zone géographique.</Text>
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card>
                <Title level={5}>Puis-je arrêter quand je veux ?</Title>
                <Text>Oui, aucun engagement. Vous pouvez suspendre ou arrêter votre compte à tout moment.</Text>
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card>
                <Title level={5}>Comment sont sélectionnés les leads ?</Title>
                <Text>Notre IA Gemini qualifie chaque demande selon votre profil et vos préférences géographiques.</Text>
              </Card>
            </Col>
          </Row>
        </div>
      </div>
    </div>
  );
};

export default DevenirPartenairePage;
