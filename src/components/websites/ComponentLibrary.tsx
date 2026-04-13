import { SF, WEBSITE_DEFAULTS } from '../zhiive/ZhiiveTheme';
import React, { useState } from 'react';
import { Input, Collapse, Card, Typography, Space, Tag } from 'antd';
import {
  SearchOutlined,
  LayoutOutlined,
  AppstoreOutlined,
  PictureOutlined,
  FormOutlined,
  BarChartOutlined,
  CaretRightOutlined,
  HeartOutlined,
  PhoneOutlined,
  TeamOutlined,
  QuestionCircleOutlined,
  StarOutlined,
  ThunderboltOutlined,
  FireOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

interface ComponentItem {
  id: string;
  name: string;
  icon: React.ReactNode;
  category: string;
  type: string;
  preview: string;
  template: unknown;
}

/**
 * 📚 BIBLIOTHÈQUE DE COMPOSANTS NO-CODE
 * Panneau gauche avec tous les composants Ant Design disponibles
 * Glisser-déposer vers le canvas
 */
const ComponentLibrary: React.FC<{
  onSelectComponent: (component: ComponentItem) => void;
}> = ({ onSelectComponent }) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');

  // 🎨 DÉFINITION DE TOUS LES COMPOSANTS DISPONIBLES
  const components: ComponentItem[] = [
    // ===== LAYOUT =====
    {
      id: 'grid-2-cols',
      name: 'Grille 2 colonnes',
      icon: <LayoutOutlined />,
      category: 'layout',
      type: 'grid',
      preview: '[ ][ ]',
      template: {
        type: 'grid',
        columns: 2,
        gutter: [24, 24],
        responsive: { xs: 24, sm: 12 }
      }
    },
    {
      id: 'grid-3-cols',
      name: 'Grille 3 colonnes',
      icon: <LayoutOutlined />,
      category: 'layout',
      type: 'grid',
      preview: '[ ][ ][ ]',
      template: {
        type: 'grid',
        columns: 3,
        gutter: [24, 24],
        responsive: { xs: 24, sm: 12, md: 8 }
      }
    },
    {
      id: 'grid-4-cols',
      name: 'Grille 4 colonnes',
      icon: <LayoutOutlined />,
      category: 'layout',
      type: 'grid',
      preview: '[ ][ ][ ][ ]',
      template: {
        type: 'grid',
        columns: 4,
        gutter: [24, 24],
        responsive: { xs: 24, sm: 12, md: 6 }
      }
    },

    // ===== CARTES =====
    {
      id: 'card-simple',
      name: 'Carte Simple',
      icon: <AppstoreOutlined />,
      category: 'cards',
      type: 'card',
      preview: '📄',
      template: {
        type: 'card',
        title: 'Titre de la carte',
        content: 'Contenu de la carte',
        bordered: true,
        hoverable: false,
        style: {
          borderRadius: '8px'
        }
      }
    },
    {
      id: 'card-icon',
      name: 'Carte avec Icône',
      icon: <ThunderboltOutlined />,
      category: 'cards',
      type: 'card-icon',
      preview: '⚡📄',
      template: {
        type: 'card-icon',
        icon: 'ThunderboltOutlined',
        iconColor: WEBSITE_DEFAULTS.primaryColor,
        iconSize: 32,
        title: 'Titre avec icône',
        description: 'Description de la carte',
        style: {
          borderRadius: '12px',
          border: '2px solid #f1f5f9'
        }
      }
    },
    {
      id: 'card-stat',
      name: 'Carte Statistique',
      icon: <BarChartOutlined />,
      category: 'cards',
      type: 'card-stat',
      preview: '📊',
      template: {
        type: 'card-stat',
        value: '+500',
        label: 'Clients satisfaits',
        icon: 'StarOutlined',
        iconColor: WEBSITE_DEFAULTS.primaryColor,
        valueColor: WEBSITE_DEFAULTS.primaryColor,
        animated: true
      }
    },
    {
      id: 'card-service',
      name: 'Carte Service',
      icon: <FireOutlined />,
      category: 'cards',
      type: 'card-service',
      preview: '🔥📋',
      template: {
        type: 'card-service',
        icon: 'FireOutlined',
        title: 'Notre Service',
        description: 'Description détaillée du service',
        features: [
          'Fonctionnalité 1',
          'Fonctionnalité 2',
          'Fonctionnalité 3'
        ],
        buttonText: 'En savoir plus',
        buttonLink: '#'
      }
    },

    // ===== HERO SECTIONS =====
    {
      id: 'hero-centered',
      name: 'Hero Centré',
      icon: <PictureOutlined />,
      category: 'heroes',
      type: 'hero',
      preview: '🌟',
      template: {
        type: 'hero',
        layout: 'centered',
        title: 'Titre Principal Impactant',
        subtitle: 'Sous-titre explicatif qui capte l\'attention',
        primaryButton: {
          actionType: 'contact-form',
          text: 'Action Principale',
          formAnchor: ['#contact']
        },
        secondaryButton: {
          actionType: 'scroll-to-section',
          text: 'Action Secondaire',
          sectionAnchor: ['#services']
        },
        backgroundType: 'gradient',
        backgroundGradient: WEBSITE_DEFAULTS.gradient,
        textColor: '#ffffff',
        minHeight: '600px'
      }
    },
    {
      id: 'hero-split',
      name: 'Hero Split (Texte + Image)',
      icon: <PictureOutlined />,
      category: 'heroes',
      type: 'hero-split',
      preview: '📝🖼️',
      template: {
        type: 'hero-split',
        title: 'Titre Puissant',
        subtitle: 'Description convaincante',
        imageUrl: 'https://via.placeholder.com/600',
        imagePosition: 'right',
        buttonText: 'Commencer',
        buttonLink: '#'
      }
    },

    // ===== STATISTIQUES =====
    {
      id: 'stats-row',
      name: 'Ligne de Statistiques',
      icon: <BarChartOutlined />,
      category: 'stats',
      type: 'stats-row',
      preview: '📊📊📊📊',
      template: {
        type: 'stats-row',
        stats: [
          { value: '+500', label: 'Clients', icon: 'TeamOutlined' },
          { value: '15 MW', label: 'Puissance', icon: 'ThunderboltOutlined' },
          { value: '4.9/5', label: 'Satisfaction', icon: 'StarOutlined' },
          { value: 'Wallonie', label: 'Région', icon: 'EnvironmentOutlined' }
        ],
        backgroundColor: '#f9fafb'
      }
    },

    // ===== CTA =====
    {
      id: 'cta-banner',
      name: 'Bannière CTA',
      icon: <PhoneOutlined />,
      category: 'cta',
      type: 'cta-banner',
      preview: '📢',
      template: {
        type: 'cta-banner',
        title: 'Prêt à Commencer ?',
        subtitle: 'Contactez-nous dès aujourd\'hui',
        primaryButton: {
          actionType: 'contact-form',
          text: 'Nous Contacter',
          formAnchor: ['#contact'],
          icon: 'PhoneOutlined'
        },
        secondaryButton: {
          actionType: 'scroll-to-section',
          text: 'En Savoir Plus',
          sectionAnchor: ['#services'],
          icon: 'MailOutlined'
        },
        backgroundGradient: WEBSITE_DEFAULTS.gradient,
        textColor: '#ffffff'
      }
    },

    // ===== FORMULAIRES =====
    {
      id: 'contact-form',
      name: 'Formulaire de Contact',
      icon: <FormOutlined />,
      category: 'forms',
      type: 'contact-form',
      preview: '📝',
      template: {
        type: 'contact-form',
        title: 'Contactez-nous',
        fields: [
          { name: 'name', label: 'Nom', type: 'text', required: true },
          { name: 'email', label: 'Email', type: 'email', required: true },
          { name: 'phone', label: 'Téléphone', type: 'tel', required: false },
          { name: 'message', label: 'Message', type: 'textarea', required: true }
        ],
        submitText: 'Envoyer'
      }
    },

    // ===== CAROUSEL =====
    {
      id: 'testimonials-carousel',
      name: 'Carrousel Témoignages',
      icon: <HeartOutlined />,
      category: 'carousel',
      type: 'testimonials',
      preview: '⭐💬',
      template: {
        type: 'testimonials',
        title: 'Ce Que Nos Clients Disent',
        testimonials: [
          {
            name: 'Jean Dupont',
            location: 'Charleroi',
            service: 'Photovoltaïque',
            rating: 5,
            text: 'Excellent service, installation rapide et professionnelle !',
            date: '2025-01-15'
          }
        ],
        autoplay: true,
        speed: 3000
      }
    },

    // ===== STEPS =====
    {
      id: 'process-steps',
      name: 'Processus en Étapes',
      icon: <CaretRightOutlined />,
      category: 'steps',
      type: 'process',
      preview: '1️⃣2️⃣3️⃣',
      template: {
        type: 'process',
        title: 'Notre Processus',
        steps: [
          { title: 'Contact', description: 'Prenez contact avec nous', icon: 'PhoneOutlined' },
          { title: 'Étude', description: 'Analyse de vos besoins', icon: 'SearchOutlined' },
          { title: 'Installation', description: 'Pose par nos experts', icon: 'ToolOutlined' },
          { title: 'Suivi', description: 'Service après-vente', icon: 'CheckCircleOutlined' }
        ],
        direction: 'horizontal'
      }
    },

    // ===== FOOTER =====
    {
      id: 'footer-complete',
      name: 'Footer Complet',
      icon: <AppstoreOutlined />,
      category: 'footer',
      type: 'footer',
      preview: '🦶',
      template: {
        type: 'footer',
        logoUrl: '',
        description: 'Votre partenaire énergie en Wallonie',
        linkGroups: [
          {
            title: 'Services',
            links: [
              { label: 'Photovoltaïque', url: '/photovoltaique' },
              { label: 'Pompes à Chaleur', url: '/pompes-chaleur' },
              { label: 'Bornes de Recharge', url: '/bornes-recharge' }
            ]
          },
          {
            title: 'Entreprise',
            links: [
              { label: 'À Propos', url: '/a-propos' },
              { label: 'Contact', url: '/contact' },
              { label: 'Carrières', url: '/carrieres' }
            ]
          }
        ],
        socialLinks: [
          { platform: 'facebook', url: 'https://facebook.com' },
          { platform: 'linkedin', url: 'https://linkedin.com' }
        ],
        copyright: '© 2025 2Thier. Tous droits réservés.',
        backgroundColor: '#1f2937',
        textColor: '#f9fafb'
      }
    },

    // ===== HEADER =====
    {
      id: 'header-nav',
      name: 'Header Navigation',
      icon: <AppstoreOutlined />,
      category: 'header',
      type: 'header',
      preview: '📑',
      template: {
        type: 'header',
        logoUrl: '',
        logoText: '2Thier',
        menuItems: [
          { label: 'Accueil', url: '/', type: 'link' },
          { label: 'Services', url: '/services', type: 'link' },
          { label: 'À Propos', url: '/a-propos', type: 'link' },
          { label: 'Contact', url: '/contact', type: 'button' }
        ],
        ctaText: 'Devis Gratuit',
        ctaLink: '/devis',
        sticky: true,
        backgroundColor: '#ffffff',
        textColor: '#1f2937'
      }
    },

    // ===== TIMELINE =====
    {
      id: 'timeline-history',
      name: 'Timeline (Histoire)',
      icon: <CaretRightOutlined />,
      category: 'timeline',
      type: 'timeline',
      preview: '⏱️',
      template: {
        type: 'timeline',
        title: 'Notre Histoire',
        events: [
          {
            date: '2020-01-01',
            title: 'Création de l\'entreprise',
            description: 'Début de l\'aventure 2Thier',
            icon: 'RocketOutlined',
            color: WEBSITE_DEFAULTS.primaryColor
          },
          {
            date: '2022-06-15',
            title: '500+ installations',
            description: 'Franchissement d\'un cap important',
            icon: 'TrophyOutlined',
            color: SF.emeraldDark
          }
        ],
        mode: 'left'
      }
    },

    // ===== PRICING =====
    {
      id: 'pricing-plans',
      name: 'Plans Tarifaires',
      icon: <StarOutlined />,
      category: 'pricing',
      type: 'pricing',
      preview: '💰',
      template: {
        type: 'pricing',
        title: 'Nos Tarifs',
        subtitle: 'Choisissez le plan qui vous convient',
        plans: [
          {
            name: 'Starter',
            price: '99',
            period: 'mois',
            description: 'Pour les petits projets',
            features: [
              'Installation 3 kWc',
              'Garantie 10 ans',
              'Support email'
            ],
            buttonText: 'Choisir',
            buttonLink: '#',
            highlighted: false
          },
          {
            name: 'Pro',
            price: '199',
            period: 'mois',
            description: 'Pour les projets moyens',
            features: [
              'Installation 6 kWc',
              'Garantie 15 ans',
              'Support prioritaire',
              'Monitoring inclus'
            ],
            buttonText: 'Choisir',
            buttonLink: '#',
            highlighted: true
          }
        ],
        columns: 3
      }
    },

    // ===== FAQ =====
    {
      id: 'faq-section',
      name: 'Questions Fréquentes',
      icon: <QuestionCircleOutlined />,
      category: 'faq',
      type: 'faq',
      preview: '❓',
      template: {
        type: 'faq',
        title: 'Questions Fréquentes',
        subtitle: 'Trouvez les réponses à vos questions',
        questions: [
          {
            question: 'Quel est le délai d\'installation ?',
            answer: 'Le délai moyen est de 2 à 4 semaines après la visite technique.'
          },
          {
            question: 'Quelles sont les garanties ?',
            answer: 'Nous offrons une garantie de 10 à 25 ans selon les équipements.'
          }
        ]
      }
    },

    // ===== TEAM =====
    {
      id: 'team-members',
      name: 'Équipe',
      icon: <TeamOutlined />,
      category: 'team',
      type: 'team',
      preview: '👥',
      template: {
        type: 'team',
        title: 'Notre Équipe',
        subtitle: 'Rencontrez les experts qui font la différence',
        members: [
          {
            name: 'Jean Martin',
            role: 'Directeur Technique',
            bio: '15 ans d\'expérience dans le photovoltaïque',
            photoUrl: 'https://via.placeholder.com/300',
            socials: [
              { platform: 'linkedin', url: 'https://linkedin.com' }
            ]
          }
        ],
        columns: 3,
        photoShape: 'circle'
      }
    },

    // ===== RICH CONTENT =====
    {
      id: 'rich-content',
      name: 'Contenu Riche',
      icon: <FormOutlined />,
      category: 'content',
      type: 'rich-content',
      preview: '📝',
      template: {
        type: 'rich-content',
        title: '',
        html: '<h2>Titre de votre contenu</h2><p>Paragraphe de texte...</p>',
        backgroundColor: '#ffffff',
        textColor: '#1f2937',
        fontSize: 16,
        lineHeight: 1.6
      }
    },

    // ===== NAVIGATION =====
    {
      id: 'navigation-menu',
      name: 'Navigation Avancée',
      icon: <AppstoreOutlined />,
      category: 'navigation',
      type: 'navigation',
      preview: '🧭',
      template: {
        type: 'navigation',
        logoUrl: '',
        items: [
          { label: 'Accueil', url: '/', type: 'link', subItems: [] },
          { 
            label: 'Services', 
            url: '#', 
            type: 'dropdown',
            subItems: [
              { label: 'Photovoltaïque', url: '/photovoltaique' },
              { label: 'Pompes à Chaleur', url: '/pompes-chaleur' }
            ]
          }
        ],
        ctaText: 'Contact',
        ctaLink: '/contact',
        position: 'sticky',
        backgroundColor: '#ffffff',
        textColor: '#1f2937'
      }
    }
  ];

  // Filtrage par recherche
  const filteredComponents = components.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Groupement par catégorie
  const categoriesMap = {
    layout: { title: '📦 Layout', icon: <LayoutOutlined /> },
    cards: { title: '🎴 Cartes', icon: <AppstoreOutlined /> },
    heroes: { title: '🌟 Hero Sections', icon: <PictureOutlined /> },
    stats: { title: '📊 Statistiques', icon: <BarChartOutlined /> },
    cta: { title: '📢 Call-to-Action', icon: <PhoneOutlined /> },
    forms: { title: '📝 Formulaires', icon: <FormOutlined /> },
    carousel: { title: '🎭 Carrousels', icon: <CaretRightOutlined /> },
    steps: { title: '🚀 Étapes', icon: <CaretRightOutlined /> },
    footer: { title: '🦶 Footer', icon: <AppstoreOutlined /> },
    header: { title: '📑 Header', icon: <AppstoreOutlined /> },
    timeline: { title: '⏱️ Timeline', icon: <CaretRightOutlined /> },
    pricing: { title: '💰 Tarifs', icon: <StarOutlined /> },
    faq: { title: '❓ FAQ', icon: <QuestionCircleOutlined /> },
    team: { title: '👥 Équipe', icon: <TeamOutlined /> },
    content: { title: '📝 Contenu', icon: <FormOutlined /> },
    navigation: { title: '🧭 Navigation', icon: <AppstoreOutlined /> }
  };

  const groupedComponents = Object.entries(categoriesMap).map(([key, meta]) => ({
    key,
    ...meta,
    components: filteredComponents.filter(c => c.category === key)
  }));

  return (
    <div style={{ 
      width: '320px', 
      height: '100vh', 
      overflowY: 'auto', 
      borderRight: '1px solid #f0f0f0',
      background: '#fafafa',
      padding: '16px'
    }}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div>
          <Text strong style={{ fontSize: '16px' }}>📚 Composants</Text>
          <Text type="secondary" style={{ display: 'block', fontSize: '12px', marginTop: '4px' }}>
            Glissez vers le canvas →
          </Text>
        </div>

        {/* BARRE DE RECHERCHE */}
        <Input
          placeholder={t('common.searchPlaceholder')}
          prefix={<SearchOutlined />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          allowClear
        />

        {/* COMPOSANTS PAR CATÉGORIE */}
        <Collapse
          variant="borderless"
          defaultActiveKey={Object.keys(categoriesMap)}
          expandIconPosition="end"
          style={{ background: 'transparent' }}
          items={groupedComponents
            .filter(category => category.components.length > 0)
            .map(category => ({
              key: category.key,
              label: (
                <Space>
                  {category.icon}
                  <Text strong>{category.title}</Text>
                  <Tag color="blue">{category.components.length}</Tag>
                </Space>
              ),
              children: (
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  {category.components.map(component => (
                    <Card
                      key={component.id}
                      size="small"
                      hoverable
                      onClick={() => onSelectComponent(component)}
                      style={{ 
                        cursor: 'pointer',
                        borderRadius: '8px'
                      }}
                      styles={{ body: { padding: '12px' } }}
                    >
                      <Space>
                        <div style={{ fontSize: '24px' }}>{component.icon}</div>
                        <div>
                          <Text strong style={{ fontSize: '13px', display: 'block' }}>
                            {component.name}
                          </Text>
                          <Text type="secondary" style={{ fontSize: '11px' }}>
                            {component.preview}
                          </Text>
                        </div>
                      </Space>
                    </Card>
                  ))}
                </Space>
              )
            }))}
        />

        {filteredComponents.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Text type="secondary">Aucun composant trouvé</Text>
          </div>
        )}
      </Space>
    </div>
  );
};

export default ComponentLibrary;
