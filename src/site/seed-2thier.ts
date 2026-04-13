/**
 * Seed 2THIER Site Vitrine
 * 
 * Ce fichier contient la configuration complète du site vitrine 2THIER
 * basée sur le design de référence dans SiteVitrine2Thier.tsx
 * 
 * Structure: 7 sections WebSiteSection avec configuration complète
 */

// database singleton — always use the centralized db instance
import { db } from '../lib/database';
import { logger } from '../lib/logger';

const prisma = db;

async function seed2ThierSite() {
  logger.debug('🌱 Seeding 2THIER site...');

  // 1. Utiliser l'organisation 2THIER existante
  const organizationId = '1757366075153-otief8knu';
  
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  if (!org) {
    logger.error('❌ Organization not found:', organizationId);
    process.exit(1);
  }

  logger.debug('✅ Organization found:', org.name, '(', org.id, ')');

  // 2. Créer ou récupérer le WebSite
  const website = await prisma.webSite.upsert({
    where: {
      organizationId_slug: {
        organizationId: org.id,
        slug: 'site-vitrine-2thier',
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      slug: 'site-vitrine-2thier',
      siteName: '2THIER Energy - Site Vitrine',
      siteType: 'vitrine',
      isPublished: true,
    },
  });

  logger.debug('✅ Website created/found:', website.slug);

  // 3. Supprimer les anciennes sections
  await prisma.webSiteSection.deleteMany({
    where: { websiteId: website.id },
  });

  logger.debug('🗑️  Old sections deleted');

  // 4. Créer les 7 sections

  // SECTION 1: HEADER
  await prisma.webSiteSection.create({
    data: {
      websiteId: website.id,
      key: 'header',
      type: 'header',
      name: 'En-tête',
      displayOrder: 1,
      isLocked: true,
      content: {
        logo: {
          text: '⚡ 2THIER ENERGY',
          level: '3',
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#10b981',
          margin: '0',
        },
        navigation: {
          links: [
            { text: 'Accueil', href: '#hero' },
            { text: 'Services', href: '#services' },
            { text: 'Projets', href: '#projects' },
            { text: 'Contact', href: '#contact' },
          ],
        },
        cta: {
          actionType: 'scroll-to-section',
          text: 'DEVIS GRATUIT',
          sectionAnchor: ['#contact'],
          buttonType: 'primary',
          buttonSize: 'large',
          openInNewTab: false,
          style: {
            backgroundColor: '#10b981',
            borderColor: '#10b981',
          },
        },
        style: {
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          padding: '16px 0',
          position: 'fixed',
          top: '0',
          zIndex: '1000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
      },
    },
  });

  logger.debug('✅ Section 1: Header created');

  // SECTION 2: HERO
  await prisma.webSiteSection.create({
    data: {
      websiteId: website.id,
      key: 'hero',
      type: 'hero',
      name: 'Section Héro',
      displayOrder: 2,
      content: {
        title: {
          text: '🌞 Votre Partenaire en Transition Énergétique',
          fontSize: 'clamp(32px, 8vw, 56px)',
          fontWeight: 'bold',
          lineHeight: '1.2',
          color: '#ffffff',
        },
        subtitle: {
          text: 'Photovoltaïque • Batteries • Bornes de Recharge • Pompes à Chaleur\nIsolation • Toiture • Électricité • Gros Œuvre',
          fontSize: 'clamp(16px, 4vw, 20px)',
          lineHeight: '1.6',
          color: 'rgba(255,255,255,0.95)',
        },
        primaryButton: {
          actionType: 'contact-form',
          text: 'DEMANDER UN DEVIS GRATUIT',
          formAnchor: ['#contact'],
          icon: 'RocketOutlined',
          openInNewTab: false,
          style: {
            backgroundColor: '#ffffff',
            borderColor: '#ffffff',
            color: '#10b981',
            height: 'auto',
            padding: '16px 32px',
            fontSize: '18px',
            fontWeight: 'bold',
            borderRadius: '8px',
          },
        },
        secondaryButton: {
          actionType: 'scroll-to-section',
          text: 'NOS RÉALISATIONS',
          sectionAnchor: ['#projects'],
          openInNewTab: false,
          style: {
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderColor: '#ffffff',
            color: '#ffffff',
            height: 'auto',
            padding: '16px 32px',
            fontSize: '18px',
            borderRadius: '8px',
          },
        },
        footer: {
          text: '+500 installations réalisées • 4.9/5 de satisfaction',
          fontSize: '16px',
          color: 'rgba(255,255,255,0.9)',
          icon: 'CheckCircleOutlined',
        },
        style: {
          background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
          minHeight: '600px',
          padding: '60px 24px',
          textAlign: 'center',
        },
      },
    },
  });

  logger.debug('✅ Section 2: Hero created');

  // SECTION 3: STATS
  await prisma.webSiteSection.create({
    data: {
      websiteId: website.id,
      key: 'stats',
      type: 'stats',
      name: 'Statistiques',
      displayOrder: 3,
      content: {
        title: {
          text: 'Nos Chiffres Clés',
          fontSize: '36px',
          fontWeight: 'bold',
          color: '#111827',
        },
        items: [
          {
            icon: 'HomeOutlined',
            value: '500',
            suffix: '+',
            label: 'Installations réalisées',
          },
          {
            icon: 'ThunderboltOutlined',
            value: '15',
            suffix: ' MW',
            label: 'Puissance installée',
          },
          {
            icon: 'StarFilled',
            value: '4.9',
            suffix: '/5',
            label: 'Satisfaction client',
          },
          {
            icon: 'EnvironmentOutlined',
            value: 'Wallonie',
            suffix: '',
            label: 'Région couverte',
          },
        ],
        style: {
          backgroundColor: '#ffffff',
          padding: '80px 0',
        },
        cardStyle: {
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          padding: '32px',
        },
        valueStyle: {
          fontSize: '48px',
          fontWeight: 'bold',
          color: '#10b981',
        },
        labelStyle: {
          fontSize: '16px',
          color: '#6b7280',
        },
      },
    },
  });

  logger.debug('✅ Section 3: Stats created');

  // SECTION 4: SERVICES
  await prisma.webSiteSection.create({
    data: {
      websiteId: website.id,
      key: 'services',
      type: 'services',
      name: 'Services',
      displayOrder: 4,
      content: {
        title: {
          text: '🔆 Nos Solutions Énergétiques',
          fontSize: '42px',
          fontWeight: 'bold',
          color: '#111827',
        },
        subtitle: {
          text: 'Un écosystème complet pour votre autonomie énergétique et votre confort',
          fontSize: '18px',
          color: '#64748b',
        },
        items: [
          {
            icon: {
              name: 'SolarOutlined',
              color: '#10b981',
              size: '48px',
            },
            title: 'Installation Photovoltaïque',
            description: 'Installation complète de panneaux solaires avec garantie décennale',
            features: [
              'Étude personnalisée',
              'Installation professionnelle',
              'Garantie 10 ans',
              'Maintenance incluse',
            ],
            cta: {
              actionType: 'contact-form',
              text: 'En savoir plus',
              formAnchor: ['#contact'],
            },
          },
          {
            icon: {
              name: 'ThunderboltOutlined',
              color: '#3b82f6',
              size: '48px',
            },
            title: 'Batteries de Stockage',
            description: 'Optimisez votre autoconsommation avec nos solutions de stockage',
            features: [
              'Autonomie maximale',
              'Gestion intelligente',
              'Compatible onduleurs',
              'Garantie constructeur',
            ],
            cta: {
              actionType: 'contact-form',
              text: 'En savoir plus',
              formAnchor: ['#contact'],
            },
          },
          {
            icon: {
              name: 'HomeOutlined',
              color: '#f59e0b',
              size: '48px',
            },
            title: 'Rénovation Énergétique',
            description: 'Isolation, ventilation et pompes à chaleur',
            features: [
              'Audit énergétique',
              'Primes disponibles',
              'ROI rapide',
              'Confort amélioré',
            ],
            cta: {
              actionType: 'contact-form',
              text: 'En savoir plus',
              formAnchor: ['#contact'],
            },
          },
          {
            icon: {
              name: 'SafetyOutlined',
              color: '#8b5cf6',
              size: '48px',
            },
            title: 'Maintenance & SAV',
            description: 'Un service après-vente réactif et professionnel',
            features: [
              'Intervention 48h',
              'Contrat maintenance',
              'Suivi production',
              'Dépannage rapide',
            ],
            cta: {
              actionType: 'contact-form',
              text: 'En savoir plus',
              formAnchor: ['#contact'],
            },
          },
        ],
        style: {
          backgroundColor: '#f9fafb',
          padding: '80px 0',
        },
        cardStyle: {
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          padding: '32px',
          transition: 'all 0.3s ease',
        },
      },
    },
  });

  logger.debug('✅ Section 4: Services created');

  // SECTION 5: TESTIMONIALS
  await prisma.webSiteSection.create({
    data: {
      websiteId: website.id,
      key: 'testimonials',
      type: 'testimonials',
      name: 'Témoignages',
      displayOrder: 5,
      content: {
        title: {
          text: '⭐ Ce Que Nos Clients Disent',
          fontSize: '42px',
          fontWeight: 'bold',
          color: '#111827',
        },
        subtitle: {
          text: 'Plus de 500 clients satisfaits à travers la Wallonie',
          fontSize: '18px',
          color: '#6b7280',
        },
        items: [
          {
            name: 'Pierre D.',
            location: 'Liège',
            rating: 5,
            text: 'Excellente prestation ! L\'équipe 2THIER a été très professionnelle du début à la fin. Installation rapide et soignée. Je recommande vivement.',
          },
          {
            name: 'Marie L.',
            location: 'Namur',
            rating: 5,
            text: 'Très satisfaite de mon installation photovoltaïque. Production conforme aux estimations et suivi impeccable. Un grand merci à toute l\'équipe !',
          },
          {
            name: 'Jean-Marc B.',
            location: 'Charleroi',
            rating: 5,
            text: 'Entreprise sérieuse et compétente. Bon rapport qualité-prix et excellent service après-vente. Mes panneaux produisent comme prévu.',
          },
        ],
        style: {
          backgroundColor: '#ffffff',
          padding: '80px 0',
        },
        carousel: true,
        autoplay: true,
        autoplaySpeed: 5000,
        dots: true,
        cardMaxWidth: '800px',
        cardPadding: '32px',
        cardBorderRadius: '12px',
        ratingColor: '#faad14',
        starSize: '24px',
        starGap: '4px',
        textFontSize: '18px',
        textFontStyle: 'italic',
        nameFontSize: '16px',
      },
    },
  });

  logger.debug('✅ Section 5: Testimonials created');

  // SECTION 6: CTA
  await prisma.webSiteSection.create({
    data: {
      websiteId: website.id,
      key: 'cta',
      type: 'cta',
      name: 'Appel à l\'action',
      displayOrder: 6,
      content: {
        title: {
          text: 'Prêt à Passer à l\'Énergie Solaire ?',
          fontSize: '42px',
          fontWeight: 'bold',
          color: '#ffffff',
        },
        subtitle: {
          text: 'Demandez votre devis gratuit et sans engagement',
          fontSize: '20px',
          color: '#e5e7eb',
        },
        primaryButton: {
          actionType: 'phone',
          text: '📞 04 123 45 67',
          phoneNumber: '041234567',
          size: 'large',
          style: {
            backgroundColor: '#ffffff',
            borderColor: '#ffffff',
            color: '#10b981',
            height: 'auto',
            padding: '16px 48px',
            fontSize: '18px',
            fontWeight: '600',
            borderRadius: '28px',
          },
        },
        secondaryButton: {
          actionType: 'email',
          text: '✉️ contact@2thier.be',
          emailAddress: 'contact@2thier.be',
          size: 'large',
          style: {
            backgroundColor: 'transparent',
            borderColor: '#ffffff',
            color: '#ffffff',
            height: 'auto',
            padding: '16px 48px',
            fontSize: '18px',
            borderRadius: '28px',
          },
        },
        footer: {
          text: '📍 Rue de l\'Énergie, 123 - 4000 Liège, Belgique',
          fontSize: '16px',
          color: '#d1d5db',
        },
        style: {
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          padding: '80px 0',
          textAlign: 'center',
        },
      },
    },
  });

  logger.debug('✅ Section 6: CTA created');

  // SECTION 7: FOOTER
  await prisma.webSiteSection.create({
    data: {
      websiteId: website.id,
      key: 'footer',
      type: 'footer',
      name: 'Pied de page',
      displayOrder: 7,
      isLocked: true,
      content: {
        logo: {
          text: '⚡ 2THIER ENERGY',
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#10b981',
        },
        description: 'Leader en installation photovoltaïque en Wallonie depuis 2010',
        columns: [
          {
            title: 'Services',
            links: [
              { text: 'Installation photovoltaïque', href: '#services' },
              { text: 'Batteries de stockage', href: '#services' },
              { text: 'Rénovation énergétique', href: '#services' },
              { text: 'Maintenance & SAV', href: '#services' },
            ],
          },
          {
            title: 'Entreprise',
            links: [
              { text: 'À propos', href: '#about' },
              { text: 'Nos valeurs', href: '#values' },
              { text: 'Nos projets', href: '#projects' },
              { text: 'Contact', href: '#contact' },
            ],
          },
          {
            title: 'Légal',
            links: [
              { text: 'Mentions légales', href: '#legal' },
              { text: 'Politique de confidentialité', href: '#privacy' },
              { text: 'CGV', href: '#terms' },
            ],
          },
        ],
        copyright: '© 2024 2THIER Energy. Tous droits réservés.',
        copyrightColor: '#6b7280',
        copyrightFontSize: '14px',
        style: {
          backgroundColor: '#1f2937',
          color: '#d1d5db',
          padding: '60px 0 30px',
        },
      },
    },
  });

  logger.debug('✅ Section 7: Footer created');

  logger.debug('');
  logger.debug('🎉 2THIER site successfully seeded!');
  logger.debug('📍 Website slug:', website.slug);
  logger.debug('📊 Total sections:', 7);
  logger.debug('');
  logger.debug('Next steps:');
  logger.debug('1. Navigate to NoCodeBuilder');
  logger.debug('2. Load website: site-vitrine-2thier');
  logger.debug('3. Preview and verify all sections render correctly');
}

// Exécution
seed2ThierSite()
  .catch((e) => {
    logger.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
