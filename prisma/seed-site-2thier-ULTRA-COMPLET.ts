import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 🎯 SEED ULTRA-COMPLET - REPRODUCTION PIXEL-PERFECT DU SITE 2THIER
 * 
 * Ce seed contient TOUS les textes, couleurs, styles du site de référence.
 * Chaque section est remplie avec le contenu EXACT.
 * 
 * Structure : HEADER + HERO + STATS + SERVICES + VALUES + PROJECTS + TESTIMONIALS + PROCESS + CTA + FOOTER
 */

async function main() {
  console.log('🚀 SEED ULTRA-COMPLET - Site Vitrine 2Thier Energy\n');

  // 🧹 NETTOYAGE
  console.log('🧹 Nettoyage...');
  const existingSite = await prisma.webSite.findFirst({
    where: {
      organizationId: '1757366075154-i554z93kl',
      siteName: '2Thier Energy'
    }
  });
  
  if (existingSite) {
    await prisma.webSite.delete({ where: { id: existingSite.id } });
    console.log('✅ Site existant supprimé\n');
  }

  // 1️⃣ CRÉATION DU SITE
  console.log('1️⃣ Création du site "2Thier Energy"...');
  const website = await prisma.webSite.create({
    data: {
      organizationId: '1757366075154-i554z93kl',
      siteName: '2Thier Energy',
      siteType: 'vitrine',
      slug: 'site-vitrine-2thier',
      domain: '2thier.be',
      isActive: true,
      isPublished: true,
      maintenanceMode: false
    },
  });
  console.log(`✅ Site créé - ID: ${website.id}\n`);

  // 2️⃣ CONFIGURATION DU SITE
  console.log('2️⃣ Configuration du site...');
  await prisma.webSiteConfig.create({
    data: {
      websiteId: website.id,
      primaryColor: '#10b981',
      secondaryColor: '#059669',
      phone: '071/XX.XX.XX',
      email: 'info@2thier.be',
      address: 'Route de Gosselies 23',
      city: 'Fleurus (Charleroi)',
      postalCode: '6220',
      country: 'Belgique',
      heroTitle: '🌞 Votre Partenaire en Transition Énergétique',
      heroSubtitle: 'Photovoltaïque • Batteries • Bornes de Recharge • Pompes à Chaleur\nIsolation • Toiture • Électricité • Gros Œuvre',
      heroCtaPrimary: 'DEMANDER UN DEVIS GRATUIT',
      heroCtaSecondary: 'NOS RÉALISATIONS',
      metaTitle: '2Thier Energy - Votre Partenaire en Transition Énergétique',
      metaDescription: 'Spécialiste en photovoltaïque, batteries, bornes de recharge et pompes à chaleur en Belgique.',
      stats: {
        installations: '500+',
        powerMW: '2.5 MW',
        satisfaction: '4.9/5',
        region: 'Wallonie'
      },
      socialLinks: {
        facebook: 'https://facebook.com/2thier',
        linkedin: 'https://linkedin.com/company/2thier',
        instagram: 'https://instagram.com/2thier'
      }
    }
  });
  console.log('✅ Configuration créée\n');

  // 3️⃣ THÈME
  console.log('3️⃣ Création du thème...');
  await prisma.webSiteTheme.create({
    data: {
      websiteId: website.id,
      name: 'Thème 2Thier',
      primaryColor: '#10b981',
      secondaryColor: '#059669',
      accentColor: '#047857',
      textColor: '#1f2937',
      textLightColor: '#6b7280',
      backgroundColor: '#ffffff',
      surfaceColor: '#f9fafb',
      fontTitle: 'Poppins',
      fontText: 'Inter',
      borderRadius: 12,
      shadowLevel: 'medium'
    }
  });
  console.log('✅ Thème créé\n');

  // 4️⃣ SECTIONS - REPRODUCTION EXACTE DU SITE
  console.log('4️⃣ Création des sections...');
  
  // ==================== HEADER ====================
  await prisma.webSiteSection.create({
    data: {
      websiteId: website.id,
      key: 'header',
      type: 'header',
      name: 'Header',
      displayOrder: 0,
      isActive: true,
      isLocked: true,
      content: {
        logo: {
          text: '⚡ 2THIER ENERGY',
          type: 'text',
          color: '#10b981',
          fontSize: '24px',
          fontWeight: 'bold'
        },
        navigation: {
          links: [
            { text: 'Accueil', href: '#hero' },
            { text: 'Services', href: '#services' },
            { text: 'Réalisations', href: '#projects' },
            { text: 'Témoignages', href: '#testimonials' },
            { text: 'Contact', href: '#cta' }
          ]
        },
        cta: {
          text: 'DEVIS GRATUIT',
          href: '/devis',
          buttonType: 'primary',
          buttonSize: 'large',
          style: {
            backgroundColor: '#10b981',
            borderColor: '#10b981',
            color: '#ffffff',
            fontWeight: 'bold'
          }
        },
        style: {
          position: 'fixed',
          top: 0,
          zIndex: 1000,
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(10px)',
          padding: '0 24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#1f2937',
          primaryColor: '#10b981'
        }
      }
    }
  });
  
  // ==================== HERO ====================
  await prisma.webSiteSection.create({
    data: {
      websiteId: website.id,
      key: 'hero',
      type: 'hero',
      name: 'Section Hero',
      displayOrder: 1,
      isActive: true,
      content: {
        title: {
          text: '🌞 Votre Partenaire en Transition Énergétique',
          color: 'white',
          fontSize: 'clamp(32px, 8vw, 56px)',
          fontWeight: 'bold'
        },
        subtitle: {
          text: 'Photovoltaïque • Batteries • Bornes de Recharge • Pompes à Chaleur\nIsolation • Toiture • Électricité • Gros Œuvre',
          color: 'rgba(255,255,255,0.95)',
          fontSize: 'clamp(16px, 4vw, 20px)'
        },
        primaryButton: {
          text: 'DEMANDER UN DEVIS GRATUIT',
          href: '/devis',
          icon: 'RocketOutlined',
          style: {
            backgroundColor: 'white',
            borderColor: 'white',
            color: '#10b981',
            padding: '16px 32px',
            fontSize: '18px',
            fontWeight: 'bold',
            borderRadius: '8px'
          }
        },
        secondaryButton: {
          text: 'NOS RÉALISATIONS',
          href: '#projects',
          style: {
            borderColor: 'white',
            color: 'white',
            backgroundColor: 'rgba(255,255,255,0.1)',
            padding: '16px 32px',
            fontSize: '18px',
            borderRadius: '8px'
          }
        },
        footer: {
          text: '+500 installations réalisées • 4.9/5 de satisfaction',
          icon: 'CheckCircleOutlined',
          color: 'rgba(255,255,255,0.9)',
          fontSize: '16px'
        },
        style: {
          background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
          minHeight: '600px',
          padding: '60px 24px',
          textAlign: 'center'
        }
      }
    }
  });

  // ==================== STATS ====================
  await prisma.webSiteSection.create({
    data: {
      websiteId: website.id,
      key: 'stats',
      type: 'stats',
      name: 'Statistiques',
      displayOrder: 2,
      isActive: true,
      content: {
        items: [
          { 
            value: '+500', 
            label: 'Installations réalisées', 
            icon: 'HomeOutlined',
            valueColor: '#10b981',
            valueFontSize: '32px',
            valueFontWeight: 'bold'
          },
          { 
            value: '2.5 MW', 
            label: 'Puissance installée', 
            icon: 'ThunderboltOutlined',
            valueColor: '#10b981',
            valueFontSize: '32px',
            valueFontWeight: 'bold'
          },
          { 
            value: '4.9/5', 
            label: 'Satisfaction client', 
            icon: 'StarFilled',
            valueColor: '#10b981',
            valueFontSize: '32px',
            valueFontWeight: 'bold'
          },
          { 
            value: 'Wallonie', 
            label: 'Région couverte', 
            icon: 'EnvironmentOutlined',
            valueColor: '#10b981',
            valueFontSize: '32px',
            valueFontWeight: 'bold'
          }
        ],
        style: {
          backgroundColor: '#f9fafb',
          padding: '60px 24px',
          iconSize: '48px',
          iconColor: '#10b981',
          cardBackground: 'white',
          cardBorderRadius: '12px',
          cardShadow: '0 4px 12px rgba(0,0,0,0.08)'
        }
      }
    }
  });

  // ==================== SERVICES ====================
  await prisma.webSiteSection.create({
    data: {
      websiteId: website.id,
      key: 'services',
      type: 'services',
      name: 'Nos Services',
      displayOrder: 3,
      isActive: true,
      content: {
        title: '🔆 Nos Solutions Énergétiques',
        subtitle: 'Un écosystème complet pour votre autonomie énergétique et votre confort',
        items: [
          {
            icon: 'ThunderboltOutlined',
            iconColor: '#10b981',
            iconSize: '32px',
            title: 'Panneaux Photovoltaïques',
            description: 'Installation professionnelle de panneaux solaires haute performance pour produire votre propre électricité verte.',
            features: [
              'Panneaux premium',
              'Garantie 25 ans',
              'Monitoring en temps réel',
              'Maintenance incluse'
            ],
            ctaText: 'En savoir plus',
            ctaUrl: '/services/photovoltaique'
          },
          {
            icon: 'BulbOutlined',
            iconColor: '#f59e0b',
            iconSize: '32px',
            title: 'Batteries de Stockage',
            description: 'Stockez votre énergie solaire pour une autonomie maximale, jour et nuit.',
            features: [
              'Stockage intelligent',
              'Autonomie optimale',
              'Compatible EV',
              'Gestion app'
            ],
            ctaText: 'Découvrir',
            ctaUrl: '/services/batteries'
          },
          {
            icon: 'CarOutlined',
            iconColor: '#3b82f6',
            iconSize: '32px',
            title: 'Bornes de Recharge',
            description: 'Rechargez votre véhicule électrique à domicile avec nos bornes intelligentes.',
            features: [
              'Installation rapide',
              'Charge ultra-rapide',
              'Contrôle app',
              'Primes disponibles'
            ],
            ctaText: 'Voir les bornes',
            ctaUrl: '/services/bornes'
          },
          {
            icon: 'FireOutlined',
            iconColor: '#ef4444',
            iconSize: '32px',
            title: 'Pompes à Chaleur',
            description: 'Chauffage et climatisation économiques et écologiques pour votre habitation.',
            features: [
              'Économies 70%',
              'Chauffage + clim',
              'Silencieux',
              'Primes élevées'
            ],
            ctaText: 'En savoir plus',
            ctaUrl: '/services/pompes-chaleur'
          },
          {
            icon: 'HomeOutlined',
            iconColor: '#8b5cf6',
            iconSize: '32px',
            title: 'Audit Énergétique',
            description: 'Analyse complète de votre consommation pour identifier les meilleures économies.',
            features: [
              'Analyse détaillée',
              'Recommandations',
              'ROI calculé',
              'Rapport complet'
            ],
            ctaText: 'Demander un audit',
            ctaUrl: '/services/audit'
          },
          {
            icon: 'ToolOutlined',
            iconColor: '#64748b',
            iconSize: '32px',
            title: 'Maintenance & SAV',
            description: 'Service après-vente et maintenance préventive pour la longévité de vos installations.',
            features: [
              'Intervention rapide',
              'Pièces d\'origine',
              'Contrat maintenance',
              'Garantie étendue'
            ],
            ctaText: 'Nos contrats',
            ctaUrl: '/services/maintenance'
          },
          {
            icon: 'CloudOutlined',
            iconColor: '#06b6d4',
            iconSize: '32px',
            title: 'Monitoring & Optimisation',
            description: 'Suivez et optimisez votre production et consommation en temps réel.',
            features: [
              'App mobile',
              'Alertes instantanées',
              'Rapports détaillés',
              'IA prédictive'
            ],
            ctaText: 'Découvrir l\'app',
            ctaUrl: '/services/monitoring'
          }
        ],
        style: {
          backgroundColor: '#ffffff',
          padding: '80px 24px',
          titleFontSize: 'clamp(28px, 6vw, 42px)',
          titleColor: '#1f2937',
          subtitleFontSize: '18px',
          subtitleColor: '#64748b',
          cardBorderRadius: '12px',
          cardBorder: '2px solid #f1f5f9',
          cardPadding: '24px',
          ctaBackgroundColor: '#10b981',
          ctaBorderColor: '#10b981',
          ctaColor: '#ffffff'
        },
        layout: {
          maxWidth: '1400px',
          grid: {
            mobile: 1,
            tablet: 2,
            desktop: 4
          },
          gap: '24px'
        }
      }
    }
  });

  // Je continue avec les autres sections dans le prochain message...
  console.log('✅ 4 sections créées (header, hero, stats, services)...\n');

  // ==================== VALUES (POURQUOI 2THIER) ====================
  await prisma.webSiteSection.create({
    data: {
      websiteId: website.id,
      key: 'values',
      type: 'values',
      name: 'Pourquoi nous choisir',
      displayOrder: 4,
      isActive: true,
      content: {
        title: '💚 Pourquoi Choisir 2Thier ?',
        subtitle: '',
        items: [
          {
            icon: 'SafetyCertificateOutlined',
            title: 'Expertise Certifiée',
            description: 'Techniciens qualifiés avec certifications reconnues et formations continues'
          },
          {
            icon: 'StarFilled',
            title: 'Qualité Premium',
            description: 'Matériel haut de gamme, garanties longues et normes strictes'
          },
          {
            icon: 'CustomerServiceOutlined',
            title: 'Service Client',
            description: 'Accompagnement personnalisé de A à Z, réponse sous 24h'
          },
          {
            icon: 'CheckCircleOutlined',
            title: 'Satisfaction Garantie',
            description: '98% de clients satisfaits et recommandent nos services'
          }
        ],
        style: {
          backgroundColor: '#f9fafb',
          iconColor: '#10b981',
          iconSize: '48px',
          cardBackground: '#ffffff',
          cardBorderRadius: '12px',
          cardShadow: '0 4px 12px rgba(0,0,0,0.08)',
          padding: '80px 24px',
          titleFontSize: 'clamp(28px, 6vw, 42px)',
          titleColor: '#1f2937'
        }
      }
    }
  });

  // ==================== PROJECTS (RÉALISATIONS) ====================
  await prisma.webSiteSection.create({
    data: {
      websiteId: website.id,
      key: 'projects',
      type: 'projects',
      name: 'Nos Réalisations',
      displayOrder: 5,
      isActive: true,
      content: {
        title: '📸 Nos Dernières Réalisations',
        subtitle: '',
        showAllLink: true,
        items: [
          {
            image: '/images/project1.jpg',
            title: 'Installation Résidentielle 9 kWc',
            location: 'Charleroi',
            details: 'Installation de 24 panneaux solaires avec batterie de stockage et borne de recharge. Production annuelle estimée : 8500 kWh.',
            tags: ['Résidentiel', 'Photovoltaïque', 'Batterie', 'Borne EV'],
            date: 'Août 2024'
          },
          {
            image: '/images/project2.jpg',
            title: 'Ferme Solaire 50 kWc',
            location: 'Namur',
            details: 'Projet agricole avec 130 panneaux haute performance. Autoconsommation optimisée pour les bâtiments et équipements de la ferme.',
            tags: ['Agricole', 'Photovoltaïque', 'Grande puissance'],
            date: 'Juillet 2024'
          },
          {
            image: '/images/project3.jpg',
            title: 'Entreprise + Carport Solaire',
            location: 'Liège',
            details: 'Installation commerciale avec carport solaire pour le parking. 80 panneaux + 15 bornes de recharge pour la flotte électrique.',
            tags: ['Commercial', 'Carport', 'Bornes EV', 'Flotte'],
            date: 'Juin 2024'
          },
          {
            image: '/images/project4.jpg',
            title: 'Rénovation Énergétique Complète',
            location: 'Mons',
            details: 'Projet global : panneaux solaires 12 kWc + pompe à chaleur air-eau + isolation renforcée. Économie énergétique : 85%.',
            tags: ['Rénovation', 'Photovoltaïque', 'Pompe à chaleur', 'Global'],
            date: 'Mai 2024'
          }
        ],
        layout: {
          grid: {
            columns: { mobile: 1, tablet: 2, desktop: 4 },
            gap: '24px'
          }
        },
        style: {
          backgroundColor: '#ffffff',
          tagColor: '#10b981',
          padding: '80px 24px',
          titleFontSize: 'clamp(28px, 6vw, 42px)',
          titleColor: '#1f2937',
          cardBorderRadius: '12px',
          cardBorder: '1px solid #f1f5f9'
        }
      }
    }
  });

  // ==================== TESTIMONIALS ====================
  await prisma.webSiteSection.create({
    data: {
      websiteId: website.id,
      key: 'testimonials',
      type: 'testimonials',
      name: 'Témoignages',
      displayOrder: 6,
      isActive: true,
      content: {
        title: '⭐ Ce Que Nos Clients Disent',
        subtitle: '',
        items: [
          {
            customerName: 'Jean Dupont',
            location: 'Charleroi',
            service: 'Photovoltaïque + Batterie',
            rating: 5,
            text: 'Installation impeccable, équipe professionnelle et à l\'écoute. Notre facture d\'électricité a diminué de 80% ! Je recommande vivement.',
            date: 'Août 2024'
          },
          {
            customerName: 'Marie Leblanc',
            location: 'Namur',
            service: 'Pompe à chaleur',
            rating: 5,
            text: 'Très satisfaite de ma pompe à chaleur. Confort optimal été comme hiver, et des économies impressionnantes. Service après-vente au top !',
            date: 'Juillet 2024'
          },
          {
            customerName: 'Pierre Martin',
            location: 'Liège',
            service: 'Borne de recharge',
            rating: 5,
            text: 'Installation de ma borne en une journée. Application intuitive pour gérer la recharge. Plus besoin de chercher des bornes publiques !',
            date: 'Juin 2024'
          },
          {
            customerName: 'Sophie Durant',
            location: 'Mons',
            service: 'Audit énergétique',
            rating: 5,
            text: 'L\'audit énergétique m\'a permis de comprendre mes dépenses et de faire les bons choix. Accompagnement excellent du début à la fin.',
            date: 'Juin 2024'
          }
        ],
        showAverageRating: true,
        averageRating: '4.9',
        totalReviews: 124,
        googleReviewsLink: 'https://google.com/reviews/2thier',
        style: {
          backgroundColor: '#f9fafb',
          padding: '80px 24px',
          titleFontSize: 'clamp(28px, 6vw, 42px)',
          titleColor: '#1f2937',
          cardBackground: '#ffffff',
          cardBorderRadius: '16px',
          cardPadding: '24px',
          cardMaxWidth: '800px',
          starColor: '#faad14',
          starSize: '24px'
        }
      }
    }
  });

  // ==================== PROCESS ====================
  await prisma.webSiteSection.create({
    data: {
      websiteId: website.id,
      key: 'process',
      type: 'process',
      name: 'Notre Processus',
      displayOrder: 7,
      isActive: true,
      content: {
        title: '🚀 Votre Projet en 5 Étapes',
        subtitle: '',
        steps: [
          {
            icon: 'PhoneOutlined',
            title: 'Contact',
            description: 'Demande gratuite sous 24h'
          },
          {
            icon: 'SafetyCertificateOutlined',
            title: 'Étude',
            description: 'Visite + analyse de faisabilité'
          },
          {
            icon: 'ToolOutlined',
            title: 'Devis',
            description: 'Proposition détaillée personnalisée'
          },
          {
            icon: 'TeamOutlined',
            title: 'Installation',
            description: 'Pose par techniciens certifiés'
          },
          {
            icon: 'CheckCircleOutlined',
            title: 'Suivi',
            description: 'SAV & garanties longue durée'
          }
        ],
        style: {
          backgroundColor: '#ffffff',
          iconColor: '#10b981',
          lineColor: '#10b981',
          padding: '80px 24px',
          titleFontSize: 'clamp(28px, 6vw, 42px)',
          titleColor: '#1f2937'
        }
      }
    }
  });

  // ==================== CTA FINAL ====================
  await prisma.webSiteSection.create({
    data: {
      websiteId: website.id,
      key: 'cta-final',
      type: 'cta',
      name: 'Appel à l\'action final',
      displayOrder: 8,
      isActive: true,
      content: {
        title: '🌟 Prêt à Passer à l\'Énergie Verte ?',
        subtitle: 'Demandez votre devis gratuit et sans engagement\nRéponse sous 24h garantie',
        buttons: [
          {
            text: '071/XX.XX.XX',
            href: 'tel:071XXXXXX',
            icon: 'PhoneOutlined',
            style: {
              backgroundColor: 'white',
              borderColor: 'white',
              color: '#10b981',
              padding: '16px 32px',
              fontSize: '18px',
              fontWeight: 'bold'
            }
          },
          {
            text: 'DEVIS EN LIGNE',
            href: '/devis',
            icon: 'MailOutlined',
            style: {
              borderColor: 'white',
              color: 'white',
              backgroundColor: 'rgba(255,255,255,0.1)',
              padding: '16px 32px',
              fontSize: '18px'
            }
          }
        ],
        footer: {
          text: '📍 Route de Gosselies 23, 6220 Fleurus (Charleroi)',
          icon: 'EnvironmentOutlined',
          color: 'rgba(255,255,255,0.9)',
          fontSize: '16px'
        },
        style: {
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          padding: '80px 24px',
          textAlign: 'center',
          titleColor: 'white',
          titleFontSize: 'clamp(28px, 6vw, 42px)',
          subtitleColor: 'rgba(255,255,255,0.95)',
          subtitleFontSize: '18px'
        }
      }
    }
  });

  // ==================== FOOTER ====================
  await prisma.webSiteSection.create({
    data: {
      websiteId: website.id,
      key: 'footer',
      type: 'footer',
      name: 'Footer',
      displayOrder: 9,
      isActive: true,
      isLocked: true,
      content: {
        brand: {
          name: '2THIER ENERGY',
          tagline: 'Votre partenaire en transition énergétique depuis 2020'
        },
        columns: [
          {
            title: 'Solutions',
            links: [
              { label: 'Photovoltaïque', url: '/services/photovoltaique' },
              { label: 'Batteries', url: '/services/batteries' },
              { label: 'Bornes de Recharge', url: '/services/bornes' },
              { label: 'Pompes à Chaleur', url: '/services/pompes-chaleur' }
            ]
          },
          {
            title: 'Entreprise',
            links: [
              { label: 'À propos', url: '/about' },
              { label: 'Réalisations', url: '#projects' },
              { label: 'Blog', url: '/blog' },
              { label: 'Contact', url: '#cta' }
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
        copyright: '© 2025 2Thier Energy - Tous droits réservés • BE 0XXX.XXX.XXX • Agrégation Classe 1 • RESCERT Certifié',
        style: {
          backgroundColor: '#1f2937',
          textColor: '#ffffff',
          textSecondaryColor: '#9ca3af',
          linkColor: '#9ca3af',
          linkHoverColor: '#ffffff',
          padding: '60px 24px 24px',
          dividerColor: '#374151'
        }
      }
    }
  });

  console.log('✅ 10 sections créées (header + hero + stats + services + values + projects + testimonials + process + cta + footer)\n');

  console.log('🎉 SEED ULTRA-COMPLET TERMINÉ AVEC SUCCÈS !');
  console.log(`\n📊 RÉCAPITULATIF :`);
  console.log(`   - Site : ${website.siteName} (ID: ${website.id})`);
  console.log(`   - Sections : 10 sections complètes avec TOUS les textes, couleurs et styles`);
  console.log(`   - Config : ✅`);
  console.log(`   - Thème : ✅`);
  console.log(`\n🌐 Accès : http://localhost:5173/site-vitrine-2thier\n`);
}

main()
  .catch((e) => {
    console.error('❌ ERREUR:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
