import React, { useState } from 'react';
import { Card, Form, Input, Select, Button, Row, Col, Typography, Steps, message, Progress, Tag } from 'antd';
import { 
  UserOutlined, 
  HomeOutlined, 
  DollarOutlined, 
  ClockCircleOutlined,
  CheckCircleOutlined,
  PhoneOutlined,
  MailOutlined,
  RocketOutlined
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;
const { Step } = Steps;

interface PublicLeadFormData {
  // Étape 1: Projet
  category: string;
  title: string;
  description: string;
  
  // Étape 2: Détails
  budget: string;
  urgency: 'low' | 'medium' | 'high';
  postalCode: string;
  
  // Étape 3: Contact
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  preferredContact: 'phone' | 'email';
  
  // Consentements
  marketingConsent: boolean;
  dataProcessingConsent: boolean;
}

// Categories de services simplifiées pour le formulaire public
const publicCategories = [
  { value: 'renovation', label: '🏠 Rénovation & Travaux', popular: true },
  { value: 'energy', label: '⚡ Énergie & Isolation', popular: true },
  { value: 'plumbing', label: '🔧 Plomberie', popular: false },
  { value: 'electricity', label: '💡 Électricité', popular: false },
  { value: 'heating', label: '🔥 Chauffage & Climatisation', popular: true },
  { value: 'garden', label: '🌿 Jardin & Paysagisme', popular: false },
  { value: 'roofing', label: '🏘️ Toiture & Couverture', popular: false },
  { value: 'painting', label: '🎨 Peinture & Décoration', popular: false },
  { value: 'flooring', label: '🪜 Sols & Revêtements', popular: false },
  { value: 'kitchen', label: '👩‍🍳 Cuisine', popular: true },
  { value: 'bathroom', label: '🛁 Salle de bain', popular: true },
  { value: 'windows', label: '🪟 Fenêtres & Menuiserie', popular: false },
  { value: 'security', label: '🔒 Sécurité & Alarme', popular: false },
  { value: 'cleaning', label: '🧽 Nettoyage', popular: false },
  { value: 'moving', label: '📦 Déménagement', popular: false },
  { value: 'other', label: '🔧 Autres services', popular: false }
];

export default function PublicLeadForm() {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Partial<PublicLeadFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [msgApi, msgCtx] = message.useMessage();

  const steps = [
    {
      title: 'Votre projet',
      icon: <HomeOutlined />
    },
    {
      title: 'Détails',
      icon: <DollarOutlined />
    },
    {
      title: 'Contact', 
      icon: <UserOutlined />
    }
  ];

  const handleStepSubmit = async (values: Record<string, unknown>) => {
    const updatedData = { ...formData, ...values };
    setFormData(updatedData);

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Dernière étape - envoi final
      await submitLead(updatedData);
    }
  };

  const submitLead = async (data: Partial<PublicLeadFormData>) => {
    try {
      setIsSubmitting(true);
      
      // TODO: Remplacer par l'appel API réel
      const response = await fetch('/api/public/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...data,
          source: 'public_form',
          createdAt: new Date().toISOString()
        })
      });

      if (response.ok) {
        msgApi.success('🎉 Votre demande a été envoyée ! Vous allez recevoir vos devis sous 24h.');
        
        // Redirection vers page de confirmation
        window.location.href = '/merci';
      } else {
        throw new Error('Erreur lors de l\'envoi');
      }
      
    } catch (error) {
      console.error('Erreur submission:', error);
      msgApi.error('Erreur lors de l\'envoi. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getProgressPercent = () => {
    return Math.round(((currentStep + 1) / steps.length) * 100);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Title level={3}>Quel est votre projet ?</Title>
              <Paragraph type="secondary">
                Sélectionnez la catégorie qui correspond le mieux à votre besoin
              </Paragraph>
            </div>

            <Form.Item
              name="category"
              rules={[{ required: true, message: 'Veuillez sélectionner une catégorie' }]}
            >
              <Select
                size="large"
                placeholder="Choisissez votre catégorie de projet"
                optionFilterProp="children"
                showSearch
                filterOption={(input, option) =>
                  option?.children?.toString().toLowerCase().includes(input.toLowerCase())
                }
              >
                <Select.OptGroup label="🔥 Catégories populaires">
                  {publicCategories
                    .filter(cat => cat.popular)
                    .map(category => (
                      <Select.Option key={category.value} value={category.value}>
                        {category.label}
                      </Select.Option>
                    ))
                  }
                </Select.OptGroup>
                <Select.OptGroup label="📋 Toutes les catégories">
                  {publicCategories
                    .filter(cat => !cat.popular)
                    .map(category => (
                      <Select.Option key={category.value} value={category.value}>
                        {category.label}
                      </Select.Option>
                    ))
                  }
                </Select.OptGroup>
              </Select>
            </Form.Item>

            <Form.Item
              name="title"
              rules={[{ required: true, message: 'Donnez un titre à votre projet' }]}
            >
              <Input
                size="large"
                placeholder="Ex: Rénovation complète salle de bain 8m²"
                prefix={<HomeOutlined />}
              />
            </Form.Item>

            <Form.Item
              name="description"
              rules={[{ required: true, message: 'Décrivez votre projet en détail' }]}
            >
              <TextArea
                rows={4}
                placeholder="Décrivez votre projet : surface, matériaux souhaités, contraintes particulières, délais..."
              />
            </Form.Item>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Title level={3}>Précisez les détails</Title>
              <Paragraph type="secondary">
                Ces informations nous aident à trouver les bons professionnels
              </Paragraph>
            </div>

            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name="budget"
                  label="Budget approximatif"
                  rules={[{ required: true, message: 'Sélectionnez votre budget' }]}
                >
                  <Select size="large" placeholder="Quel est votre budget ?">
                    <Select.Option value="low">Moins de 1 000€</Select.Option>
                    <Select.Option value="medium-low">1 000€ - 5 000€</Select.Option>
                    <Select.Option value="medium">5 000€ - 15 000€</Select.Option>
                    <Select.Option value="medium-high">15 000€ - 30 000€</Select.Option>
                    <Select.Option value="high">30 000€ - 50 000€</Select.Option>
                    <Select.Option value="very-high">Plus de 50 000€</Select.Option>
                    <Select.Option value="unknown">Je ne sais pas encore</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="urgency"
                  label="Délai souhaité"
                  rules={[{ required: true, message: 'Indiquez vos délais' }]}
                >
                  <Select size="large" placeholder="Quand commencer ?">
                    <Select.Option value="high">
                      <div>
                        <div><ClockCircleOutlined /> Urgent - dès que possible</div>
                        <Text type="secondary" className="text-xs">Dans les 2 semaines</Text>
                      </div>
                    </Select.Option>
                    <Select.Option value="medium">
                      <div>
                        <div><ClockCircleOutlined /> Dans 1-3 mois</div>
                        <Text type="secondary" className="text-xs">Planification normale</Text>
                      </div>
                    </Select.Option>
                    <Select.Option value="low">
                      <div>
                        <div><ClockCircleOutlined /> Pas pressé - dans 3+ mois</div>
                        <Text type="secondary" className="text-xs">Projet à long terme</Text>
                      </div>
                    </Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="postalCode"
                  label="Code postal"
                  rules={[
                    { required: true, message: 'Code postal requis' },
                    { pattern: /^\d{5}$/, message: 'Format: 12345' }
                  ]}
                >
                  <Input
                    size="large"
                    placeholder="75001"
                    prefix={<HomeOutlined />}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Card className="bg-blue-50 border-blue-200">
              <div className="text-center">
                <CheckCircleOutlined className="text-blue-500 text-2xl mb-2" />
                <Text strong className="text-blue-700">
                  Parfait ! Nous allons identifier les meilleurs professionnels de votre région
                </Text>
              </div>
            </Card>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Title level={3}>Vos coordonnées</Title>
              <Paragraph type="secondary">
                Pour que les artisans puissent vous contacter avec leurs devis
              </Paragraph>
            </div>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="firstName"
                  label="Prénom"
                  rules={[{ required: true, message: 'Votre prénom' }]}
                >
                  <Input size="large" prefix={<UserOutlined />} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="lastName"
                  label="Nom"
                  rules={[{ required: true, message: 'Votre nom' }]}
                >
                  <Input size="large" prefix={<UserOutlined />} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="email"
                  label="Adresse email"
                  rules={[
                    { required: true, message: 'Email requis' },
                    { type: 'email', message: 'Email invalide' }
                  ]}
                >
                  <Input size="large" prefix={<MailOutlined />} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="phone"
                  label="Téléphone"
                  rules={[{ required: true, message: 'Numéro requis' }]}
                >
                  <Input size="large" prefix={<PhoneOutlined />} placeholder="06 12 34 56 78" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="preferredContact"
              label="Contact préféré"
              rules={[{ required: true, message: 'Comment souhaitez-vous être contacté ?' }]}
            >
              <Select size="large" placeholder="Comment préférez-vous être contacté ?">
                <Select.Option value="phone">
                  <PhoneOutlined /> Par téléphone (plus rapide)
                </Select.Option>
                <Select.Option value="email">
                  <MailOutlined /> Par email (plus discret)
                </Select.Option>
              </Select>
            </Form.Item>

            {/* Consentements RGPD */}
            <Card className="bg-gray-50 border-gray-200">
              <div className="space-y-3">
                <Text strong className="block">Protection de vos données</Text>
                
                <Form.Item
                  name="dataProcessingConsent"
                  valuePropName="checked"
                  rules={[{ required: true, message: 'Consentement requis' }]}
                >
                  <div className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <Text className="text-sm">
                      <strong>J'accepte le traitement de mes données</strong> pour recevoir des devis de professionnels qualifiés. 
                      Mes informations ne seront partagées qu'avec les artisans sélectionnés.
                      <br />
                      <Text type="secondary" className="text-xs">
                        Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et de suppression de vos données.
                      </Text>
                    </Text>
                  </div>
                </Form.Item>

                <Form.Item
                  name="marketingConsent"
                  valuePropName="checked"
                  initialValue={false}
                >
                  <div className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <Text className="text-sm">
                      J'accepte de recevoir des conseils et offres personnalisées de Devis1Minute par email.
                      <Text type="secondary" className="text-xs block">
                        (Optionnel - Vous pouvez vous désabonner à tout moment)
                      </Text>
                    </Text>
                  </div>
                </Form.Item>
              </div>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {msgCtx}
      <div className="max-w-2xl mx-auto px-4">
        {/* Header avec progression */}
        <Card className="mb-6 text-center border-0 shadow-sm">
          <div className="mb-4">
            <Title level={2} className="text-blue-600 mb-2">
              <RocketOutlined className="mr-2" />
              Devis1Minute
            </Title>
            <Text type="secondary" className="text-base">
              Obtenez jusqu'à 3 devis gratuits en 24h
            </Text>
          </div>
          
          <Progress 
            percent={getProgressPercent()} 
            strokeColor="#1890ff"
            showInfo={false}
            className="mb-4"
          />
          
          <div className="flex justify-center">
            <Steps current={currentStep} size="small" className="w-full max-w-md">
              {steps.map((step, index) => (
                <Step key={index} title={step.title} icon={step.icon} />
              ))}
            </Steps>
          </div>
        </Card>

        {/* Formulaire principal */}
        <Card className="border-0 shadow-sm">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleStepSubmit}
            size="large"
          >
            {renderStepContent()}

            {/* Boutons de navigation */}
            <div className="flex justify-between pt-6 border-t mt-8">
              <Button
                size="large"
                onClick={goToPreviousStep}
                disabled={currentStep === 0}
                className="px-8"
              >
                Retour
              </Button>

              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={isSubmitting}
                className="px-8 bg-blue-600"
              >
                {currentStep === steps.length - 1 ? (
                  <>
                    <RocketOutlined />
                    {isSubmitting ? 'Envoi...' : 'Recevoir mes devis'}
                  </>
                ) : (
                  'Continuer'
                )}
              </Button>
            </div>
          </Form>
        </Card>

        {/* Footer rassurant */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <div className="flex justify-center items-center gap-4 flex-wrap">
            <Tag color="green">
              <CheckCircleOutlined /> 100% Gratuit
            </Tag>
            <Tag color="blue">
              <CheckCircleOutlined /> Sans engagement
            </Tag>
            <Tag color="orange">
              <CheckCircleOutlined /> Devis sous 24h
            </Tag>
          </div>
          <Paragraph className="text-xs mt-3">
            Plus de 15 000 projets réalisés • 4.8/5 de satisfaction • Données sécurisées
          </Paragraph>
        </div>
      </div>
    </div>
  );
}
