/**
 * 🌟 SEED COMPLET DU SITE 2THIER
 * 
 * Ce script remplit TOUTES les données du site vitrine 2Thier
 * en analysant le composant hardcodé SiteVitrine2Thier.tsx
 * 
 * CONTENU CRÉÉ :
 * ✅ Header (logo + navigation + CTA)
 * ✅ Hero (titre + sous-titre + 2 boutons + footer)
 * ✅ Stats (4 statistiques)
 * ✅ Services (4 solutions énergétiques)
 * ✅ Valeurs (4 raisons de choisir 2Thier)
 * ✅ Projets (4 réalisations)
 * ✅ Témoignages (témoignages clients)
 * ✅ Processus (5 étapes)
 * ✅ CTA Final
 * ✅ Footer (logo + 4 colonnes + copyright)
 * 
 * @author IA Assistant - 9 octobre 2025
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedCompleteSite() {
  console.log('🌟 SEED COMPLET DU SITE 2THIER\n');
  console.log('=' .repeat(80) + '\n');

  try {
    // 1️⃣ Récupérer ou créer l'organisation
    console.log('🏢 Recherche de l\'organisation...');
    let organization = await prisma.organization.findFirst({
      where: { name: '2Thier CRM' }
    });

    if (!organization) {
      console.log('  ⚠️  Organisation non trouvée, création...');
      organization = await prisma.organization.create({
        data: {
          name: '2Thier CRM',
          domain: '2thier.be',
          subscriptionPlan: 'professional',
          isActive: true
        }
      });
    }
    console.log(`  ✅ Organisation: ${organization.name}\n`);

    // 2️⃣ Récupérer ou créer le site
    console.log('🌐 Recherche du site web...');
    let website = await prisma.webSite.findFirst({
      where: { organizationId: organization.id }
    });

    if (!website) {
      console.log('  ⚠️  Site non trouvé, création...');
      website = await prisma.webSite.create({
        data: {
          organizationId: organization.id,
          siteName: '2THIER ENERGY',
          siteType: 'vitrine',
          slug: '2thier-energy',
          domain: '2thier.be',
          isActive: true,
          isPublished: true,
          maintenanceMode: false
        }
      });
    }
    console.log(`  ✅ Site: ${website.siteName} (ID: ${website.id})\n`);

    // 3️⃣ Configuration du site
    console.log('⚙️  Mise à jour de la configuration...');
    await prisma.webSiteConfig.upsert({
      where: { websiteId: website.id },
      update: {
        primaryColor: '#10b981',
        secondaryColor: '#059669',
        phone: '071/XX.XX.XX',
        email: 'info@2thier.be',
        address: 'Route de Gosselies 23',
        city: 'Fleurus',
        postalCode: '6220',
        country: 'Belgique',
        metaTitle: '2Thier Energy - Transition Énergétique en Wallonie',
        metaDescription: 'Photovoltaïque, batteries, bornes de recharge, pompes à chaleur. +500 installations réalisées.',
        stats: {
          installations: 500,
          powerMW: 15,
          satisfaction: 4.9,
          region: 'Wallonie'
        },
        valuesJson: [
          {
            icon: 'SafetyCertificateOutlined',
            title: 'Qualité Certifiée',
            description: 'Installateurs certifiés RESCERT et Agrégation Classe 1'
          },
          {
            icon: 'StarFilled',
            title: '4.9/5 de Satisfaction',
            description: 'Plus de 124 avis clients vérifiés sur Google'
          },
          {
            icon: 'CustomerServiceOutlined',
            title: 'SAV & Garanties',
            description: 'Service après-vente réactif et garanties longue durée'
          },
          {
            icon: 'CheckCircleOutlined',
            title: 'Clé en Main',
            description: 'De l\'étude à l\'installation, nous gérons tout'
          }
        ],
        businessHours: {
          lundi: '8h-18h',
          mardi: '8h-18h',
          mercredi: '8h-18h',
          jeudi: '8h-18h',
          vendredi: '8h-18h'
        },
        socialLinks: {
          facebook: 'https://facebook.com/2thier',
          linkedin: 'https://linkedin.com/company/2thier'
        }
      },
      create: {
        websiteId: website.id,
        primaryColor: '#10b981',
        secondaryColor: '#059669',
        phone: '071/XX.XX.XX',
        email: 'info@2thier.be',
        address: 'Route de Gosselies 23',
        city: 'Fleurus',
        postalCode: '6220',
        country: 'Belgique',
        metaTitle: '2Thier Energy - Transition Énergétique en Wallonie',
        metaDescription: 'Photovoltaïque, batteries, bornes de recharge, pompes à chaleur.',
        stats: {
          installations: 500,
          powerMW: 15,
          satisfaction: 4.9,
          region: 'Wallonie'
        },
        valuesJson: [
          {
            icon: 'SafetyCertificateOutlined',
            title: 'Qualité Certifiée',
            description: 'Installateurs certifiés RESCERT'
          },
          {
            icon: 'StarFilled',
            title: '4.9/5 de Satisfaction',
            description: '124 avis Google'
          },
          {
            icon: 'CustomerServiceOutlined',
            title: 'SAV & Garanties',
            description: 'Service réactif'
          },
          {
            icon: 'CheckCircleOutlined',
            title: 'Clé en Main',
            description: 'Tout géré'
          }
        ],
        businessHours: {
          lundi: '8h-18h',
          mardi: '8h-18h',
          mercredi: '8h-18h',
          jeudi: '8h-18h',
          vendredi: '8h-18h'
        },
        socialLinks: {}
      }
    });
    console.log('  ✅ Configuration mise à jour\n');

    // 4️⃣ Supprimer les anciennes sections
    console.log('🗑️  Suppression des anciennes sections...');
    await prisma.webSiteSection.deleteMany({
      where: { websiteId: website.id }
    });
    console.log('  ✅ Anciennes sections supprimées\n');

    // 5️⃣ Créer les nouvelles sections
    console.log('📐 Création des sections...\n');

    const sections = [
      // ==================== HEADER ====================
      {
        websiteId: website.id,
        key: 'header',
        type: 'header',
        name: 'En-tête',
        displayOrder: 1,
        isLocked: true,
        isActive: true,
        content: {
          logo: {
            type: 'text',
            text: '⚡ 2THIER ENERGY',
            color: '#10b981',
            fontSize: '24px'
          },
          navigation: {
            links: [
              { text: 'Accueil', href: '#home' },
              { text: 'Solutions', href: '#services' },
              { text: 'Réalisations', href: '#projects' },
              { text: 'Avis Clients', href: '#testimonials' },
              { text: 'Contact', href: '#contact' }
            ]
          },
          cta: {
            text: 'DEVIS GRATUIT',
            href: '#contact',
            buttonType: 'primary',
            buttonSize: 'large',
            style: {
              backgroundColor: '#10b981',
              borderColor: '#10b981'
            }
          },
          behavior: {
            sticky: true,
            hideOnScroll: false,
            transparentInitial: false
          },
          style: {
            position: 'fixed',
            top: 0,
            zIndex: 1000,
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            padding: '16px 48px',
            color: '#000000'
          }
        }
      },

      // ==================== HERO ====================
      {
        websiteId: website.id,
        key: 'hero',
        type: 'hero',
        name: 'Section Héro',
        displayOrder: 2,
        isActive: true,
        content: {
          layout: 'centered',
          content: {
            surtitle: '',
            title: '🌞 Votre Partenaire en Transition Énergétique',
            subtitle: 'Photovoltaïque • Batteries • Bornes de Recharge • Pompes à Chaleur\nIsolation • Toiture • Électricité • Gros Œuvre',
            highlight: [
              { icon: 'CheckCircleOutlined', text: '+500 installations réalisées' },
              { icon: 'StarFilled', text: '4.9/5 de satisfaction' },
              { icon: 'SafetyOutlined', text: 'Garantie 25 ans' }
            ]
          },
          ctaButtons: [
            {
              text: 'DEMANDER UN DEVIS GRATUIT',
              url: '#contact',
              icon: 'RocketOutlined',
              style: 'primary',
              size: 'large'
            },
            {
              text: 'NOS RÉALISATIONS',
              url: '#projects',
              icon: 'EyeOutlined',
              style: 'secondary',
              size: 'large'
            }
          ],
          media: {
            type: 'image',
            image: '',
            alt: 'Panneaux solaires sur toit'
          },
          overlay: {
            enabled: true,
            color: '#000000',
            opacity: 40,
            gradient: false
          },
          style: {
            backgroundColor: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
            textColor: '#ffffff',
            titleColor: '#ffffff',
            height: 'screen',
            padding: '60px 24px',
            maxWidth: '1200px',
            alignment: 'center'
          },
          typography: {
            titleSize: 'clamp(32px, 8vw, 56px)',
            titleWeight: '700',
            subtitleSize: 'clamp(16px, 4vw, 20px)',
            lineHeight: 1.5
          },
          animations: {
            enabled: true,
            titleAnimation: 'fadeInUp',
            delay: 100
          },
          responsive: {
            mobileTitleSize: '32px',
            mobileSubtitleSize: '16px',
            mobileLayout: 'stacked',
            hideHighlightsOnMobile: false
          }
        }
      },

      // ==================== STATS ====================
      {
        websiteId: website.id,
        key: 'stats',
        type: 'stats',
        name: 'Statistiques',
        displayOrder: 3,
        isActive: true,
        content: {
          title: '',
          subtitle: '',
          items: [
            { icon: 'HomeOutlined', value: 500, prefix: '+', label: 'Installations réalisées' },
            { icon: 'ThunderboltOutlined', value: 15, suffix: ' MW', label: 'Puissance installée' },
            { icon: 'StarFilled', value: 4.9, suffix: '/5', label: 'Satisfaction client' },
            { icon: 'EnvironmentOutlined', value: 'Wallonie', label: 'Région couverte' }
          ],
          layout: {
            columns: 4,
            gap: '24px',
            alignment: 'center'
          },
          style: {
            backgroundColor: '#f9fafb',
            padding: '60px 24px',
            textColor: '#111827',
            valueColor: '#10b981'
          },
          animations: {
            enabled: true,
            countUp: true,
            duration: 2000
          }
        }
      },

      // ==================== SERVICES ====================
      {
        websiteId: website.id,
        key: 'services',
        type: 'services',
        name: 'Nos Solutions',
        displayOrder: 4,
        isActive: true,
        content: {
          title: {
            text: '🔆 Nos Solutions Énergétiques',
            fontSize: 'clamp(28px, 6vw, 42px)'
          },
          subtitle: {
            text: 'Un écosystème complet pour votre autonomie énergétique et votre confort',
            fontSize: '18px',
            color: '#64748b'
          },
          items: [
            {
              icon: { name: 'ThunderboltOutlined' },
              title: 'Photovoltaïque',
              description: 'Installation de panneaux solaires haute performance',
              features: ['Étude gratuite', 'Garantie 25 ans', 'Monitoring temps réel', 'Primes & fiscales'],
              button: { text: 'En savoir plus', href: '#contact' }
            },
            {
              icon: { name: 'BulbOutlined' },
              title: 'Batteries',
              description: 'Stockage d\'énergie pour autoconsommation maximale',
              features: ['Autonomie jour & nuit', 'Compatible onduleurs', 'Extension modulaire', 'Garantie 10 ans'],
              button: { text: 'En savoir plus', href: '#contact' }
            },
            {
              icon: { name: 'CarOutlined' },
              title: 'Bornes de Recharge',
              description: 'Rechargez votre véhicule électrique à domicile',
              features: ['Installation certifiée', 'Bornes intelligentes', 'Gestion app mobile', 'Primes disponibles'],
              button: { text: 'En savoir plus', href: '#contact' }
            },
            {
              icon: { name: 'FireOutlined' },
              title: 'Pompes à Chaleur',
              description: 'Chauffage & climatisation écologique et économique',
              features: ['Économies 70%', 'Air/Eau ou Air/Air', 'COP élevé >4.0', 'Subventions régionales'],
              button: { text: 'En savoir plus', href: '#contact' }
            }
          ],
          layout: {
            columns: 4,
            gap: '24px',
            cardStyle: 'modern'
          },
          style: {
            padding: '80px 24px',
            backgroundColor: '#ffffff',
            textColor: '#111827'
          },
          animations: {
            enabled: true,
            cardHover: true,
            stagger: true
          }
        }
      },

      // ==================== VALEURS (Pourquoi 2Thier) ====================
      {
        websiteId: website.id,
        key: 'values',
        type: 'features',
        name: 'Pourquoi 2Thier',
        displayOrder: 5,
        isActive: true,
        content: {
          title: {
            text: '💚 Pourquoi Choisir 2Thier ?',
            fontSize: 'clamp(28px, 6vw, 42px)'
          },
          subtitle: {
            text: '',
            fontSize: '18px'
          },
          items: [
            {
              icon: 'SafetyCertificateOutlined',
              title: 'Qualité Certifiée',
              description: 'Installateurs certifiés RESCERT et Agrégation Classe 1'
            },
            {
              icon: 'StarFilled',
              title: '4.9/5 de Satisfaction',
              description: 'Plus de 124 avis clients vérifiés sur Google'
            },
            {
              icon: 'CustomerServiceOutlined',
              title: 'SAV & Garanties',
              description: 'Service après-vente réactif et garanties longue durée'
            },
            {
              icon: 'CheckCircleOutlined',
              title: 'Clé en Main',
              description: 'De l\'étude à l\'installation, nous gérons tout'
            }
          ],
          style: {
            backgroundColor: '#f9fafb',
            padding: '80px 24px'
          }
        }
      },

      // ==================== PROJETS (section séparée ou dans services) ====================
      {
        websiteId: website.id,
        key: 'projects',
        type: 'portfolio',
        name: 'Nos Réalisations',
        displayOrder: 6,
        isActive: true,
        content: {
          title: {
            text: '📸 Nos Dernières Réalisations',
            fontSize: 'clamp(28px, 6vw, 42px)'
          },
          subtitle: {
            text: 'Découvrez nos installations photovoltaïques en Wallonie',
            fontSize: '18px'
          },
          ctaLink: {
            text: 'Voir toutes nos réalisations →',
            href: '/realisations'
          },
          style: {
            padding: '80px 24px',
            backgroundColor: '#ffffff'
          }
        }
      },

      // ==================== TESTIMONIALS ====================
      {
        websiteId: website.id,
        key: 'testimonials',
        type: 'testimonials',
        name: 'Témoignages',
        displayOrder: 7,
        isActive: true,
        content: {
          title: {
            text: '⭐ Ce Que Nos Clients Disent',
            fontSize: 'clamp(28px, 6vw, 42px)'
          },
          subtitle: {
            text: '4.9/5 sur Google Reviews',
            fontSize: '18px',
            color: '#6b7280'
          },
          items: [],
          layout: {
            type: 'carousel',
            itemsPerView: 1,
            autoplay: true,
            autoplaySpeed: 5000
          },
          style: {
            backgroundColor: '#f9fafb',
            padding: '80px 24px',
            cardBackground: '#ffffff'
          },
          animations: {
            enabled: true,
            transition: 'slide'
          },
          footer: {
            text: '📊 Note moyenne : 4.9/5 sur 124 avis Google Reviews',
            linkText: 'Voir tous les avis sur Google →',
            linkUrl: 'https://g.page/r/xxx'
          }
        }
      },

      // ==================== PROCESSUS ====================
      {
        websiteId: website.id,
        key: 'process',
        type: 'process',
        name: 'Notre Processus',
        displayOrder: 8,
        isActive: true,
        content: {
          title: {
            text: '🚀 Votre Projet en 5 Étapes',
            fontSize: 'clamp(28px, 6vw, 42px)'
          },
          subtitle: {
            text: '',
            fontSize: '18px'
          },
          steps: [
            {
              title: 'Contact',
              description: 'Demande gratuite sous 24h',
              icon: 'PhoneOutlined'
            },
            {
              title: 'Étude',
              description: 'Visite + analyse de faisabilité',
              icon: 'SafetyCertificateOutlined'
            },
            {
              title: 'Devis',
              description: 'Proposition détaillée personnalisée',
              icon: 'ToolOutlined'
            },
            {
              title: 'Installation',
              description: 'Pose par techniciens certifiés',
              icon: 'TeamOutlined'
            },
            {
              title: 'Suivi',
              description: 'SAV & garanties longue durée',
              icon: 'CheckCircleOutlined'
            }
          ],
          style: {
            padding: '80px 24px',
            backgroundColor: '#ffffff'
          }
        }
      },

      // ==================== CTA FINAL ====================
      {
        websiteId: website.id,
        key: 'cta-final',
        type: 'cta',
        name: 'Appel à l\'action final',
        displayOrder: 9,
        isActive: true,
        content: {
          title: '🌟 Prêt à Passer à l\'Énergie Verte ?',
          subtitle: 'Demandez votre devis gratuit et sans engagement\nRéponse sous 24h garantie',
          primaryButton: {
            text: '071/XX.XX.XX',
            href: 'tel:071XXXXXX',
            icon: 'PhoneOutlined',
            size: 'large',
            style: {
              background: 'white',
              borderColor: 'white',
              color: '#10b981',
              height: 'auto',
              padding: '16px 32px',
              fontSize: '18px',
              fontWeight: 'bold'
            }
          },
          secondaryButton: {
            text: 'DEVIS EN LIGNE',
            href: '#contact',
            icon: 'MailOutlined',
            size: 'large',
            style: {
              borderColor: 'white',
              color: 'white',
              background: 'rgba(255,255,255,0.1)',
              height: 'auto',
              padding: '16px 32px',
              fontSize: '18px'
            }
          },
          footer: {
            text: '📍 Route de Gosselies 23, 6220 Fleurus (Charleroi)',
            icon: 'EnvironmentOutlined'
          },
          media: {
            type: 'none'
          },
          style: {
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            padding: '80px 24px',
            textColor: '#ffffff',
            titleColor: '#ffffff'
          },
          animations: {
            enabled: true,
            pulse: true
          }
        }
      },

      // ==================== FOOTER ====================
      {
        websiteId: website.id,
        key: 'footer',
        type: 'footer',
        name: 'Pied de page',
        displayOrder: 10,
        isLocked: true,
        isActive: true,
        content: {
          logo: {
            type: 'text',
            text: '2THIER ENERGY',
            description: 'Votre partenaire en transition énergétique depuis 2020'
          },
          columns: [
            {
              title: 'Solutions',
              links: [
                { label: 'Photovoltaïque', url: '#' },
                { label: 'Batteries', url: '#' },
                { label: 'Bornes de Recharge', url: '#' },
                { label: 'Pompes à Chaleur', url: '#' }
              ]
            },
            {
              title: 'Entreprise',
              links: [
                { label: 'À propos', url: '#' },
                { label: 'Réalisations', url: '#' },
                { label: 'Blog', url: '#' },
                { label: 'Contact', url: '#' }
              ]
            },
            {
              title: 'Contact',
              links: [
                { label: '071/XX.XX.XX', url: 'tel:071XXXXXX' },
                { label: 'info@2thier.be', url: 'mailto:info@2thier.be' },
                { label: 'Lu-Ve: 8h-18h', url: '#' }
              ]
            }
          ],
          social: [],
          copyright: '© 2025 2Thier Energy - Tous droits réservés • BE 0XXX.XXX.XXX • Agrégation Classe 1 • RESCERT Certifié',
          style: {
            background: '#1f2937',
            color: 'white',
            padding: '60px 24px 24px'
          }
        }
      }
    ];

    // Créer toutes les sections
    for (const section of sections) {
      await prisma.webSiteSection.create({ data: section });
      console.log(`  ✅ ${section.name}`);
    }

    console.log('\n' + '=' .repeat(80));
    console.log('🎉 SEED COMPLET TERMINÉ AVEC SUCCÈS !');
    console.log(`📊 ${sections.length} sections créées`);
    console.log('🔄 Rechargez l\'éditeur pour voir TOUT le contenu !');
    console.log('=' .repeat(80));

  } catch (error) {
    console.error('\n❌ ERREUR:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécution
seedCompleteSite()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
