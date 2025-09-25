import React from 'react';
import { Result, Button, Card, Row, Col, Typography, Timeline, Tag } from 'antd';
import { 
  CheckCircleOutlined, 
  RocketOutlined, 
  ClockCircleOutlined,
  TeamOutlined,
  MailOutlined,
  PhoneOutlined,
  HomeOutlined
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

export default function ThankYouPage() {
  const handleBackToHome = () => {
    window.location.href = '/';
  };

  const handleTrackProject = () => {
    // TODO: Implémenter le suivi de projet si nécessaire
    window.location.href = '/suivi';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        
        {/* Message de confirmation principal */}
        <Card className="text-center border-0 shadow-sm mb-8">
          <Result
            status="success"
            icon={<CheckCircleOutlined className="text-green-500" />}
            title={
              <Title level={2} className="text-green-600 mb-4">
                🎉 Votre demande a été envoyée avec succès !
              </Title>
            }
            subTitle={
              <div className="text-lg text-gray-600">
                <Paragraph className="mb-4">
                  Notre intelligence artificielle analyse déjà votre projet pour vous connecter 
                  avec les meilleurs professionnels de votre région.
                </Paragraph>
                <div className="flex justify-center gap-4 flex-wrap">
                  <Tag color="green" className="text-base px-4 py-2">
                    <ClockCircleOutlined /> Devis sous 24h
                  </Tag>
                  <Tag color="blue" className="text-base px-4 py-2">
                    <TeamOutlined /> Pros qualifiés
                  </Tag>
                  <Tag color="orange" className="text-base px-4 py-2">
                    <CheckCircleOutlined /> 100% gratuit
                  </Tag>
                </div>
              </div>
            }
            extra={[
              <Button 
                key="home" 
                type="primary" 
                size="large" 
                icon={<HomeOutlined />}
                onClick={handleBackToHome}
                className="mr-4"
              >
                Retour à l'accueil
              </Button>,
              <Button 
                key="track" 
                size="large" 
                icon={<RocketOutlined />}
                onClick={handleTrackProject}
              >
                Suivre mon projet
              </Button>
            ]}
          />
        </Card>

        {/* Timeline du processus */}
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={12}>
            <Card title="📋 Prochaines étapes" className="h-full">
              <Timeline>
                <Timeline.Item 
                  color="green"
                  dot={<CheckCircleOutlined className="text-green-500" />}
                >
                  <div className="mb-2">
                    <Text strong>Demande reçue</Text>
                    <Text type="secondary" className="block text-sm">
                      Maintenant - Votre projet est enregistré
                    </Text>
                  </div>
                </Timeline.Item>

                <Timeline.Item 
                  color="blue"
                  dot={<RocketOutlined className="text-blue-500" />}
                >
                  <div className="mb-2">
                    <Text strong>Analyse IA en cours</Text>
                    <Text type="secondary" className="block text-sm">
                      Dans les 30 minutes - Sélection des meilleurs pros
                    </Text>
                  </div>
                </Timeline.Item>

                <Timeline.Item 
                  color="orange"
                  dot={<TeamOutlined className="text-orange-500" />}
                >
                  <div className="mb-2">
                    <Text strong>Contact des professionnels</Text>
                    <Text type="secondary" className="block text-sm">
                      Dans les 2-4h - Notification aux artisans sélectionnés
                    </Text>
                  </div>
                </Timeline.Item>

                <Timeline.Item 
                  color="purple"
                  dot={<MailOutlined className="text-purple-500" />}
                >
                  <div className="mb-2">
                    <Text strong>Réception des devis</Text>
                    <Text type="secondary" className="block text-sm">
                      Sous 24h - Jusqu'à 3 devis personnalisés
                    </Text>
                  </div>
                </Timeline.Item>
              </Timeline>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="📞 Comment vous serez contacté" className="h-full">
              <div className="space-y-6">
                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                  <PhoneOutlined className="text-blue-500 text-xl mt-1" />
                  <div>
                    <Text strong className="text-blue-700">Par téléphone</Text>
                    <Paragraph className="mb-0 text-sm text-gray-600">
                      Les artisans vous appelleront directement pour affiner votre projet 
                      et vous proposer un rendez-vous si nécessaire.
                    </Paragraph>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
                  <MailOutlined className="text-green-500 text-xl mt-1" />
                  <div>
                    <Text strong className="text-green-700">Par email</Text>
                    <Paragraph className="mb-0 text-sm text-gray-600">
                      Vous recevrez les devis détaillés par email, que vous pourrez 
                      comparer tranquillement.
                    </Paragraph>
                  </div>
                </div>

                <Card size="small" className="bg-yellow-50 border-yellow-200">
                  <Text strong className="text-yellow-700">
                    💡 Conseil : Vérifiez vos spams !
                  </Text>
                  <Paragraph className="mb-0 text-sm mt-2">
                    Pensez à ajouter les domaines @devis1minute.be et des artisans 
                    à votre liste blanche pour ne rater aucun devis.
                  </Paragraph>
                </Card>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Informations complémentaires */}
        <Row gutter={[24, 24]} className="mt-8">
          <Col xs={24} md={8}>
            <Card className="text-center h-full">
              <CheckCircleOutlined className="text-4xl text-green-500 mb-4" />
              <Title level={4}>Sans engagement</Title>
              <Paragraph className="text-sm">
                Recevez vos devis, comparez et choisissez librement. 
                Aucune obligation d'achat.
              </Paragraph>
            </Card>
          </Col>

          <Col xs={24} md={8}>
            <Card className="text-center h-full">
              <TeamOutlined className="text-4xl text-blue-500 mb-4" />
              <Title level={4}>Pros vérifiés</Title>
              <Paragraph className="text-sm">
                Tous nos artisans sont vérifiés, assurés et 
                évalués par nos clients.
              </Paragraph>
            </Card>
          </Col>

          <Col xs={24} md={8}>
            <Card className="text-center h-full">
              <RocketOutlined className="text-4xl text-orange-500 mb-4" />
              <Title level={4}>Service gratuit</Title>
              <Paragraph className="text-sm">
                Notre service est entièrement gratuit pour les particuliers. 
                Aucun frais caché.
              </Paragraph>
            </Card>
          </Col>
        </Row>

        {/* CTA secondaire */}
        <Card className="text-center bg-gradient-to-r from-blue-50 to-purple-50 border-0 mt-8">
          <Title level={3} className="text-blue-600 mb-4">
            Un autre projet en tête ?
          </Title>
          <Paragraph className="text-gray-600 mb-6">
            Profitez de notre service pour tous vos projets de rénovation, 
            énergie, jardin et bien plus encore.
          </Paragraph>
          <Button 
            type="primary" 
            size="large" 
            icon={<RocketOutlined />}
            onClick={handleBackToHome}
            className="bg-blue-600"
          >
            Nouvelle demande de devis
          </Button>
        </Card>

        {/* Contact support */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <Paragraph>
            Une question ? Contactez-nous :<br />
            📧 support@devis1minute.be • 📞 02 123 45 67
          </Paragraph>
          <Paragraph className="text-xs">
            Devis1Minute - Votre partenaire pour tous vos projets
          </Paragraph>
        </div>
      </div>
    </div>
  );
}
