import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 SEED COMPLET - Site Vitrine 2Thier Energy\n');

  // 🧹 NETTOYAGE (si le site existe déjà)
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
      address: 'Rue de l\'Énergie',
      city: 'Charleroi',
      postalCode: '6000',
      country: 'Belgique',
      heroTitle: 'Votre Partenaire en Transition Énergétique',
      heroSubtitle: 'Solutions photovoltaïques, batteries, bornes de recharge et pompes à chaleur',
      heroCtaPrimary: 'Demander un Devis',
      heroCtaSecondary: 'Nos Réalisations',
      metaTitle: '2Thier Energy - Votre Partenaire en Transition Énergétique',
      metaDescription: 'Spécialiste en photovoltaïque, batteries, bornes de recharge et pompes à chaleur en Belgique.',
      stats: {
        installations: '500+',
        power: '2.5 MW',
        satisfaction: '98%',
        regions: '15'
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

  // 4️⃣ SECTIONS
  console.log('4️⃣ Création des sections...');
  
  // HEADER
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
          color: '#10b981'
        },
        navigation: [
          { label: 'Accueil', url: '#hero' },
          { label: 'Services', url: '#services' },
          { label: 'Réalisations', url: '#projects' },
          { label: 'Témoignages', url: '#testimonials' },
          { label: 'Contact', url: '#cta' }
        ],
        ctaButton: {
          text: 'DEVIS GRATUIT',
          url: '/devis',
          variant: 'primary',
          backgroundColor: '#10b981',
          textColor: '#ffffff'
        },
        sticky: true,
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        shadow: true
      }
    }
  });
  
  // HERO
  await prisma.webSiteSection.create({
    data: {
      websiteId: website.id,
      key: 'hero',
      type: 'hero',
      name: 'Section Hero',
      displayOrder: 1,
      isActive: true,
      content: {
        title: '🌞 Votre Partenaire en Transition Énergétique',
        subtitle: 'Photovoltaïque • Batteries • Bornes de Recharge • Pompes à Chaleur • Isolation • Toiture • Électricité • Gros Œuvre',
        buttons: [
          { text: 'DEMANDER UN DEVIS GRATUIT', url: '/devis', variant: 'primary', icon: 'RocketOutlined' },
          { text: 'NOS RÉALISATIONS', url: '#projects', variant: 'secondary' }
        ],
        badge: '+500 installations réalisées • 4.9/5 de satisfaction',
        backgroundGradient: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
        minHeight: '600px'
      }
    }
  });

  // STATS
  await prisma.webSiteSection.create({
    data: {
      websiteId: website.id,
      key: 'stats',
      type: 'stats',
      name: 'Statistiques',
      displayOrder: 2,
      isActive: true,
      content: {
        stats: [
          { value: '+500', label: 'Installations réalisées', icon: 'HomeOutlined' },
          { value: '2.5 MW', label: 'Puissance installée', icon: 'ThunderboltOutlined' },
          { value: '4.9/5', label: 'Satisfaction client', icon: 'StarFilled' },
          { value: 'Wallonie', label: 'Région couverte', icon: 'EnvironmentOutlined' }
        ],
        backgroundColor: '#f9fafb'
      }
    }
  });

  // SERVICES
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
            title: 'Panneaux Photovoltaïques',
            description: 'Installation professionnelle de panneaux solaires haute performance pour produire votre propre électricité verte.',
            features: ['Panneaux premium', 'Garantie 25 ans', 'Monitoring temps réel', 'Maintenance incluse'],
            linkText: 'En savoir plus',
            link: '/services/photovoltaique'
          },
          {
            icon: 'BulbOutlined',
            title: 'Batteries de Stockage',
            description: 'Stockez votre énergie solaire pour une autonomie maximale, jour et nuit.',
            features: ['Stockage intelligent', 'Autonomie optimale', 'Compatible EV', 'Gestion app'],
            linkText: 'Découvrir',
            link: '/services/batteries'
          },
          {
            icon: 'CarOutlined',
            title: 'Bornes de Recharge',
            description: 'Rechargez votre véhicule électrique à domicile avec nos bornes intelligentes.',
            features: ['Installation rapide', 'Charge ultra-rapide', 'Contrôle app', 'Primes disponibles'],
            linkText: 'Voir les bornes',
            link: '/services/bornes'
          },
          {
            icon: 'FireOutlined',
            title: 'Pompes à Chaleur',
            description: 'Chauffage et climatisation économiques et écologiques pour votre habitation.',
            features: ['Économies 70%', 'Chauffage + clim', 'Silencieux', 'Primes élevées'],
            linkText: 'En savoir plus',
            link: '/services/pompes-chaleur'
          },
          {
            icon: 'HomeOutlined',
            title: 'Audit Énergétique',
            description: 'Analyse complète de votre consommation pour identifier les meilleures économies.',
            features: ['Analyse détaillée', 'Recommandations', 'ROI calculé', 'Rapport complet'],
            linkText: 'Demander un audit',
            link: '/services/audit'
          },
          {
            icon: 'ToolOutlined',
            title: 'Maintenance & SAV',
            description: 'Service après-vente et maintenance préventive pour la longévité de vos installations.',
            features: ['Intervention rapide', 'Pièces d\'origine', 'Contrat maintenance', 'Garantie étendue'],
            linkText: 'Nos contrats',
            link: '/services/maintenance'
          },
          {
            icon: 'CloudOutlined',
            title: 'Monitoring & Optimisation',
            description: 'Suivez et optimisez votre production et consommation en temps réel.',
            features: ['App mobile', 'Alertes instantanées', 'Rapports détaillés', 'IA prédictive'],
            linkText: 'Découvrir l\'app',
            link: '/services/monitoring'
          }
        ],
        layout: {
          grid: {
            columns: { mobile: 1, tablet: 2, desktop: 4 },
            gap: '24px'
          },
          cardStyle: 'elevated'
        }
      }
    }
  });

  // VALUES (POURQUOI 2THIER)
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
        subtitle: 'Les raisons de nous faire confiance',
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
          cardBackground: '#ffffff'
        }
      }
    }
  });

  // PROJECTS (RÉALISATIONS)
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
        subtitle: 'Découvrez quelques-uns de nos projets réussis',
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
          tagColor: '#10b981'
        }
      }
    }
  });

  // TESTIMONIALS
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
        subtitle: 'La satisfaction de nos clients est notre priorité',
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
        averageRating: 4.9,
        totalReviews: 124,
        googleReviewsLink: 'https://google.com/reviews/2thier',
        backgroundColor: '#f9fafb'
      }
    }
  });

  // PROCESS
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
        subtitle: 'Un processus simple et transparent',
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
          lineColor: '#10b981'
        }
      }
    }
  });

  // CTA FINAL
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
        subtitle: 'Demandez votre devis gratuit et sans engagement • Réponse sous 24h garantie',
        buttons: [
          { text: '071/XX.XX.XX', url: 'tel:071XXXXXX', variant: 'primary', icon: 'PhoneOutlined' },
          { text: 'DEVIS EN LIGNE', url: '/devis', variant: 'secondary', icon: 'MailOutlined' }
        ],
        footer: '📍 Route de Gosselies 23, 6220 Fleurus (Charleroi)',
        backgroundGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        textColor: '#ffffff'
      }
    }
  });

  // FOOTER
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
              { label: '071/XX.XX.XX', url: 'tel:071XXXXXX', icon: 'PhoneOutlined' },
              { label: 'info@2thier.be', url: 'mailto:info@2thier.be', icon: 'MailOutlined' },
              { label: 'Lu-Ve: 8h-18h', icon: 'ClockCircleOutlined' }
            ]
          }
        ],
        copyright: '© 2025 2Thier Energy - Tous droits réservés • BE 0XXX.XXX.XXX • Agrégation Classe 1 • RESCERT Certifié',
        backgroundColor: '#1f2937',
        textColor: '#ffffff'
      }
    }
  });

  console.log('✅ 10 sections créées (header + 8 sections + footer)\n');

  console.log('🎉 SEED TERMINÉ AVEC SUCCÈS !');
  console.log(`\n📊 RÉCAPITULATIF :`);
  console.log(`   - Site : ${website.siteName} (ID: ${website.id})`);
  console.log(`   - Sections : 10 (header + hero + stats + services + values + projects + testimonials + process + cta + footer)`);
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
