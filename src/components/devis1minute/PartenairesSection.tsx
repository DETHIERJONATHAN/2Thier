import React from 'react';
import { Card, Row, Col, Badge, Rate, Typography, Avatar, Button } from 'antd';
import { 
  ToolOutlined, 
  CheckCircleOutlined, 
  PhoneOutlined,
  EnvironmentOutlined,
  StarOutlined 
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

interface PartenaireProps {
  nom: string;
  prenom: string;
  specialite: string;
  ville: string;
  experience: string;
  note: number;
  projetsRealises: number;
  photo?: string;
  certifications: string[];
  description: string;
  telephone?: string;
}

const partenaires: PartenaireProps[] = [
  {
    nom: 'Martin',
    prenom: 'Pierre',
    specialite: 'Électricité',
    ville: 'Paris 15e',
    experience: '12 ans',
    note: 4.9,
    projetsRealises: 247,
    certifications: ['Qualibat', 'RGE'],
    description: 'Spécialiste en installation électrique résidentielle. Intervention rapide et devis gratuit.',
    telephone: '06.12.34.56.78'
  },
  {
    nom: 'Dubois',
    prenom: 'Sophie',
    specialite: 'Plomberie',
    ville: 'Lyon 3e',
    experience: '8 ans',
    note: 4.8,
    projetsRealises: 189,
    certifications: ['PGP', 'Viessmann'],
    description: 'Plomberie générale et chauffage. Dépannage 7j/7 et garantie sur tous les travaux.',
    telephone: '06.23.45.67.89'
  },
  {
    nom: 'Garcia',
    prenom: 'Antonio',
    specialite: 'Carrelage',
    ville: 'Marseille 8e',
    experience: '15 ans',
    note: 4.9,
    projetsRealises: 312,
    certifications: ['Carrelage Plus', 'FFB'],
    description: 'Pose de carrelage, faïence et mosaïque. Travail soigné et respect des délais.',
    telephone: '06.34.56.78.90'
  },
  {
    nom: 'Leroy',
    prenom: 'Marc',
    specialite: 'Peinture',
    ville: 'Toulouse',
    experience: '10 ans',
    note: 4.7,
    projetsRealises: 156,
    certifications: ['RGE Éco-Artisan'],
    description: 'Peinture intérieure/extérieure et isolation thermique. Produits écologiques privilégiés.',
    telephone: '06.45.67.89.01'
  },
  {
    nom: 'Moreau',
    prenom: 'Catherine',
    specialite: 'Menuiserie',
    ville: 'Bordeaux',
    experience: '18 ans',
    note: 4.9,
    projetsRealises: 203,
    certifications: ['UFME', 'Qualibat'],
    description: 'Menuiserie sur mesure, portes, fenêtres et aménagements intérieurs.',
    telephone: '06.56.78.90.12'
  },
  {
    nom: 'Bernard',
    prenom: 'David',
    specialite: 'Chauffage',
    ville: 'Nantes',
    experience: '14 ans',
    note: 4.8,
    projetsRealises: 278,
    certifications: ['RGE', 'QualiPAC'],
    description: 'Installation pompes à chaleur et chaudières. Maintenance et dépannage.',
    telephone: '06.67.89.01.23'
  }
];

const PartenairesSection: React.FC = () => {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header Section */}
        <div className="text-center mb-12">
          <Title level={2} className="mb-4">
            <ToolOutlined className="text-blue-600 mr-3" />
            Nos Partenaires de Confiance
          </Title>
          <Paragraph className="text-xl text-gray-600 max-w-3xl mx-auto">
            Découvrez nos artisans qualifiés, vérifiés et notés par nos clients. 
            Chaque professionnel est sélectionné selon nos critères de qualité exigeants.
          </Paragraph>
        </div>

        {/* Statistiques */}
        <Row gutter={[24, 24]} className="mb-12">
          <Col xs={24} sm={8} className="text-center">
            <div className="bg-blue-50 p-6 rounded-lg">
              <div className="text-3xl font-bold text-blue-600 mb-2">500+</div>
              <Text className="text-gray-600">Artisans partenaires</Text>
            </div>
          </Col>
          <Col xs={24} sm={8} className="text-center">
            <div className="bg-green-50 p-6 rounded-lg">
              <div className="text-3xl font-bold text-green-600 mb-2">4.8/5</div>
              <Text className="text-gray-600">Note moyenne clients</Text>
            </div>
          </Col>
          <Col xs={24} sm={8} className="text-center">
            <div className="bg-orange-50 p-6 rounded-lg">
              <div className="text-3xl font-bold text-orange-600 mb-2">98%</div>
              <Text className="text-gray-600">Taux de satisfaction</Text>
            </div>
          </Col>
        </Row>

        {/* Grille des partenaires */}
        <Row gutter={[24, 24]}>
          {partenaires.map((partenaire, index) => (
            <Col key={index} xs={24} md={12} lg={8}>
              <Card 
                className="h-full hover:shadow-lg transition-shadow duration-300"
                actions={[
                  <Button type="link" icon={<PhoneOutlined />}>
                    Contacter
                  </Button>,
                  <Button type="primary" ghost>
                    Voir profil
                  </Button>
                ]}
              >
                {/* Header avec photo et infos */}
                <div className="flex items-center mb-4">
                  <Avatar 
                    size={64} 
                    className="bg-blue-500 mr-4"
                    icon={<ToolOutlined />}
                  >
                    {partenaire.prenom[0]}{partenaire.nom[0]}
                  </Avatar>
                  <div>
                    <Title level={5} className="mb-1">
                      {partenaire.prenom} {partenaire.nom}
                    </Title>
                    <Text strong className="text-blue-600">
                      {partenaire.specialite}
                    </Text>
                    <div className="flex items-center mt-1">
                      <EnvironmentOutlined className="text-gray-400 mr-1" />
                      <Text type="secondary">{partenaire.ville}</Text>
                    </div>
                  </div>
                </div>

                {/* Évaluation */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <Rate disabled defaultValue={partenaire.note} className="text-sm" />
                    <Text className="ml-2 font-medium">{partenaire.note}/5</Text>
                  </div>
                  <Text type="secondary">{partenaire.projetsRealises} projets</Text>
                </div>

                {/* Certifications */}
                <div className="mb-3">
                  {partenaire.certifications.map((cert, idx) => (
                    <Badge 
                      key={idx}
                      status="success" 
                      text={cert} 
                      className="mr-2 mb-1"
                    />
                  ))}
                  <Badge 
                    status="processing" 
                    text={`${partenaire.experience} d'expérience`}
                    className="mb-1"
                  />
                </div>

                {/* Description */}
                <Paragraph 
                  className="text-gray-600 text-sm mb-3"
                  ellipsis={{ rows: 3 }}
                >
                  {partenaire.description}
                </Paragraph>

                {/* Badges de qualité */}
                <div className="flex flex-wrap gap-1">
                  <Badge 
                    count={<CheckCircleOutlined className="text-green-500" />} 
                    className="mr-2"
                  >
                    <Text className="text-xs bg-green-50 px-2 py-1 rounded">
                      Vérifié
                    </Text>
                  </Badge>
                  <Badge 
                    count={<StarOutlined className="text-yellow-500" />}
                    className="mr-2"
                  >
                    <Text className="text-xs bg-yellow-50 px-2 py-1 rounded">
                      Top partenaire
                    </Text>
                  </Badge>
                  <Text className="text-xs bg-blue-50 px-2 py-1 rounded">
                    Réponse rapide
                  </Text>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        {/* Call to Action */}
        <div className="text-center mt-12">
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-0">
            <Title level={3} className="mb-4">
              Vous êtes artisan ? Rejoignez notre réseau !
            </Title>
            <Paragraph className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
              Développez votre activité avec des leads qualifiés par IA. 
              Inscription gratuite, commission uniquement sur projets aboutis.
            </Paragraph>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                type="primary" 
                size="large"
                onClick={() => window.location.href = '/devenir-partenaire'}
              >
                Devenir partenaire
              </Button>
              <Button 
                size="large"
                onClick={() => window.location.href = '/comment-ca-marche-pros'}
              >
                Comment ça marche
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default PartenairesSection;
