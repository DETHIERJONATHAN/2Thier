/**
 * Script de seed pour initialiser les sites web
 * Site Vitrine 2Thier + Devis1Minute
 */

import { db } from '../src/lib/database';

async function main() {
  console.log('🌱 Début du seed des sites web...');

  // Récupérer l'organisation 2Thier (Super Admin)
  const org2Thier = await db.organization.findFirst({
    where: {
      OR: [
        { name: { contains: '2thier', mode: 'insensitive' } },
        { name: { contains: '2Thier', mode: 'insensitive' } },
      ]
    }
  });

  if (!org2Thier) {
    console.error('❌ Organisation 2Thier non trouvée !');
    console.log('💡 Création de l\'organisation 2Thier...');
    
    const newOrg = await db.organization.create({
      data: {
        id: '2thier-org-id',
        name: '2Thier',
        status: 'active',
        features: ['all'],
        address: 'Route de Gosselies 23, 6220 Fleurus',
        phone: '071/XX.XX.XX',
        website: 'https://2thier.be',
        description: 'Votre partenaire en transition énergétique'
      }
    });
    
    console.log('✅ Organisation 2Thier créée !');
  }

  const organization = org2Thier || await db.organization.findFirst({
    where: { name: { contains: '2thier', mode: 'insensitive' } }
  });

  if (!organization) {
    throw new Error('Impossible de trouver ou créer l\'organisation 2Thier');
  }

  console.log(`✅ Organisation trouvée : ${organization.name}`);

  // ==========================================
  // SITE 1 : SITE VITRINE 2THIER
  // ==========================================
  
  console.log('\n📱 Création du Site Vitrine 2Thier...');

  // Vérifier si le site existe déjà
  let siteVitrine = await db.websites.findFirst({
    where: {
      organizationId: organization.id,
      slug: 'site-vitrine-2thier'
    }
  });

  if (siteVitrine) {
    console.log('⚠️  Site Vitrine existe déjà, suppression et recréation...');
    // Supprimer les données liées d'abord
    await db.website_services.deleteMany({ where: { websiteId: siteVitrine.id } });
    await db.website_projects.deleteMany({ where: { websiteId: siteVitrine.id } });
    await db.website_testimonials.deleteMany({ where: { websiteId: siteVitrine.id } });
    await db.website_sections.deleteMany({ where: { websiteId: siteVitrine.id } });
    await db.website_configs.deleteMany({ where: { websiteId: siteVitrine.id } });
    await db.websites.delete({ where: { id: siteVitrine.id } });
  }

  siteVitrine = await db.websites.create({
    data: {
      organizationId: organization.id,
      siteName: '2Thier SRL',
      siteType: 'vitrine',
      slug: 'site-vitrine-2thier',
      domain: '2thier.be',
      isActive: true,
      isPublished: true,
      maintenanceMode: false,
      updatedAt: new Date()
    }
  });

  console.log('✅ Site Vitrine créé !');

  // Configuration du site vitrine
  await db.website_configs.create({
    data: {
      websiteId: siteVitrine.id,
      primaryColor: '#10b981',
      secondaryColor: '#3b82f6',
      phone: '071/XX.XX.XX',
      email: 'info@2thier.be',
      address: 'Route de Gosselies 23',
      city: 'Fleurus',
      postalCode: '6220',
      country: 'Belgique',
      mapUrl: 'https://maps.google.com/?q=Route+de+Gosselies+23,+6220+Fleurus',
      businessHours: {
        lundi: '8h-18h',
        mardi: '8h-18h',
        mercredi: '8h-18h',
        jeudi: '8h-18h',
        vendredi: '8h-18h',
        samedi: 'Fermé',
        dimanche: 'Fermé'
      },
      socialLinks: {
        facebook: 'https://facebook.com/2thier',
        instagram: 'https://instagram.com/2thier',
        linkedin: 'https://linkedin.com/company/2thier'
      },
      heroTitle: 'Votre Partenaire en Transition Énergétique',
      heroSubtitle: 'Photovoltaïque • Batteries • Bornes de Recharge • Pompes à Chaleur • Isolation • Toiture • Électricité • Gros Œuvre',
      heroCtaPrimary: 'Demander un devis gratuit',
      heroCtaSecondary: 'Nos réalisations',
      metaTitle: '2Thier Energy - Transition Énergétique en Wallonie',
      metaDescription: 'Expert en installation de panneaux solaires, batteries, pompes à chaleur et isolation en Wallonie. +500 installations réalisées.',
      metaKeywords: 'panneaux solaires, photovoltaïque, batteries, pompe à chaleur, isolation, toiture, Charleroi, Wallonie',
      stats: {
        installations: 500,
        powerMW: 15,
        satisfaction: 4.9,
        region: 'Wallonie'
      },
      aboutText: '2Thier Energy est votre partenaire de confiance pour tous vos projets de transition énergétique. Depuis notre création, nous accompagnons particuliers et professionnels dans leur démarche vers l\'autonomie énergétique.',
      valuesJson: [
        {
          icon: 'SafetyCertificateOutlined',
          title: 'Expertise Multi-Services',
          description: 'Un seul partenaire pour tous vos projets énergétiques et de construction'
        },
        {
          icon: 'StarFilled',
          title: 'Qualité Premium',
          description: 'Produits durables et installations réalisées par des techniciens certifiés'
        },
        {
          icon: 'CustomerServiceOutlined',
          title: 'Service Personnalisé',
          description: 'Suivi de A à Z, même après installation'
        },
        {
          icon: 'CheckCircleOutlined',
          title: 'Garanties Étendues',
          description: 'Garanties constructeur jusqu\'à 30 ans et service après-vente réactif'
        }
      ],
      updatedAt: new Date()
    }
  });

  console.log('✅ Configuration du Site Vitrine créée !');

  // Sections du site vitrine
  const sections = [
    {
      key: 'header',
      type: 'header',
      name: 'En-tête',
      content: {
        logo: '/logo-2thier.png',
        navigation: [
          { label: 'Accueil', href: '#hero' },
          { label: 'Services', href: '#services' },
          { label: 'Réalisations', href: '#projects' },
          { label: 'Témoignages', href: '#testimonials' },
          { label: 'Contact', href: '#contact' }
        ],
        ctaButton: { label: 'Devis Gratuit', href: '#contact' }
      },
      displayOrder: 1,
      isLocked: true
    },
    {
      key: 'hero',
      type: 'hero',
      name: 'Section Héro',
      content: {
        title: 'Votre Partenaire en Transition Énergétique',
        subtitle: 'Photovoltaïque • Batteries • Bornes de Recharge • Pompes à Chaleur • Isolation • Toiture • Électricité • Gros Œuvre',
        backgroundImage: '/hero-bg.jpg',
        ctaPrimary: { label: 'Demander un devis gratuit', href: '#contact' },
        ctaSecondary: { label: 'Nos réalisations', href: '#projects' }
      },
      displayOrder: 2
    },
    {
      key: 'stats',
      type: 'stats',
      name: 'Statistiques',
      content: {
        items: [
          { value: '500+', label: 'Installations réalisées', icon: 'CheckCircleOutlined' },
          { value: '15 MW', label: 'Puissance installée', icon: 'ThunderboltOutlined' },
          { value: '4.9/5', label: 'Satisfaction client', icon: 'StarFilled' },
          { value: '100%', label: 'Wallonie', icon: 'EnvironmentOutlined' }
        ]
      },
      backgroundColor: '#f0fdf4',
      displayOrder: 3
    },
    {
      key: 'services',
      type: 'services',
      name: 'Nos Services',
      content: {
        title: 'Nos Services',
        subtitle: 'Une expertise complète pour votre transition énergétique',
        displayMode: 'grid'
      },
      displayOrder: 4
    },
    {
      key: 'about',
      type: 'about',
      name: 'À Propos',
      content: {
        title: 'Qui sommes-nous ?',
        text: '2Thier Energy est votre partenaire de confiance pour tous vos projets de transition énergétique. Depuis notre création, nous accompagnons particuliers et professionnels dans leur démarche vers l\'autonomie énergétique.',
        image: '/about-team.jpg',
        values: [
          { icon: 'SafetyCertificateOutlined', title: 'Expertise Multi-Services', description: 'Un seul partenaire pour tous vos projets' },
          { icon: 'StarFilled', title: 'Qualité Premium', description: 'Produits durables et techniciens certifiés' },
          { icon: 'CustomerServiceOutlined', title: 'Service Personnalisé', description: 'Suivi de A à Z' },
          { icon: 'CheckCircleOutlined', title: 'Garanties Étendues', description: 'Jusqu\'à 30 ans de garantie' }
        ]
      },
      displayOrder: 5
    },
    {
      key: 'projects',
      type: 'projects',
      name: 'Nos Réalisations',
      content: {
        title: 'Nos Réalisations',
        subtitle: 'Découvrez quelques-uns de nos projets récents',
        displayCount: 4
      },
      displayOrder: 6
    },
    {
      key: 'testimonials',
      type: 'testimonials',
      name: 'Témoignages',
      content: {
        title: 'Ce que disent nos clients',
        subtitle: 'La satisfaction de nos clients est notre priorité',
        displayCount: 3
      },
      backgroundColor: '#f8fafc',
      displayOrder: 7
    },
    {
      key: 'cta',
      type: 'cta',
      name: 'Call to Action',
      content: {
        title: 'Prêt à passer à l\'énergie verte ?',
        subtitle: 'Obtenez votre devis personnalisé gratuit en quelques clics',
        button: { label: 'Demander un devis gratuit', href: '#contact' }
      },
      backgroundColor: '#10b981',
      textColor: '#ffffff',
      displayOrder: 8
    },
    {
      key: 'contact',
      type: 'contact',
      name: 'Contact',
      content: {
        title: 'Contactez-nous',
        subtitle: 'Notre équipe est à votre disposition',
        showForm: true,
        showMap: true,
        showInfo: true
      },
      displayOrder: 9
    },
    {
      key: 'footer',
      type: 'footer',
      name: 'Pied de page',
      content: {
        copyright: '© 2025 2Thier SRL. Tous droits réservés.',
        links: [
          { label: 'Mentions légales', href: '/mentions-legales' },
          { label: 'Politique de confidentialité', href: '/confidentialite' }
        ],
        showSocialLinks: true
      },
      displayOrder: 10,
      isLocked: true
    }
  ];

  for (const section of sections) {
    await db.website_sections.create({
      data: {
        websiteId: siteVitrine.id,
        ...section,
        content: section.content,
        isActive: true,
        isLocked: section.isLocked || false,
        updatedAt: new Date()
      }
    });
  }

  console.log(`✅ ${sections.length} sections créées !`);

  // Services du site vitrine
  const services = [
    {
      key: 'photovoltaique',
      icon: 'ThunderboltOutlined',
      title: 'Panneaux Photovoltaïques',
      description: 'Installation de panneaux solaires haute performance pour réduire vos factures d\'énergie et augmenter votre autonomie.',
      features: ['Panneaux jusqu\'à 440 Wp', 'Garantie 25-30 ans', 'Monitoring en temps réel', 'Primes et déductions fiscales'],
      ctaText: 'Configurer mon installation',
      displayOrder: 1
    },
    {
      key: 'batteries',
      icon: 'BulbOutlined',
      title: 'Batteries de Stockage',
      description: 'Stockez votre énergie solaire pour l\'utiliser quand vous en avez besoin et maximisez votre autoconsommation.',
      features: ['Capacité 10-20 kWh', 'Compatible tous systèmes', 'Gestion intelligente', 'Autonomie maximale'],
      ctaText: 'Calculer mes besoins',
      displayOrder: 2
    },
    {
      key: 'bornes',
      icon: 'CarOutlined',
      title: 'Bornes de Recharge',
      description: 'Rechargez votre véhicule électrique à domicile avec l\'énergie verte de vos panneaux solaires.',
      features: ['Jusqu\'à 22 kW', 'Charge intelligente', 'Application mobile', 'Installation certifiée'],
      ctaText: 'Demander un devis',
      displayOrder: 3
    },
    {
      key: 'pac',
      icon: 'FireOutlined',
      title: 'Pompes à Chaleur',
      description: 'Chauffage et climatisation écologique pour votre confort toute l\'année avec des économies jusqu\'à 70%.',
      features: ['Air/Air et Air/Eau', 'COP jusqu\'à 4.5', 'Économies jusqu\'à 70%', 'Primes disponibles'],
      ctaText: 'Découvrir les modèles',
      displayOrder: 4
    },
    {
      key: 'isolation',
      icon: 'HomeOutlined',
      title: 'Isolation Complète',
      description: 'Isolation thermique des murs, toits et sols pour réduire vos pertes d\'énergie et améliorer votre confort.',
      features: ['Murs / Toiture / Sols', 'Amélioration PEB', 'Économies durables', 'Subventions régionales'],
      ctaText: 'Audit énergétique gratuit',
      displayOrder: 5
    },
    {
      key: 'toiture',
      icon: 'CloudOutlined',
      title: 'Toiture',
      description: 'Construction et rénovation de tous types de toitures avec garantie décennale et matériaux de qualité.',
      features: ['Toiture plate et versants', 'Charpente complète', 'Zinguerie', 'Garantie décennale'],
      ctaText: 'Devis toiture',
      displayOrder: 6
    },
    {
      key: 'electricite',
      icon: 'ThunderboltOutlined',
      title: 'Électricité Générale',
      description: 'Mise en conformité et installation électrique complète par des électriciens agréés et certifiés.',
      features: ['Mise en conformité', 'Tableau électrique', 'Domotique', 'Contrôle RGIE'],
      ctaText: 'Consultation électrique',
      displayOrder: 7
    },
    {
      key: 'gros-oeuvre',
      icon: 'ToolOutlined',
      title: 'Gros Œuvre',
      description: 'Fondations, maçonnerie et rénovation complète pour tous vos projets de construction et rénovation.',
      features: ['Fondations solides', 'Maçonnerie', 'Extension', 'Rénovation complète'],
      ctaText: 'Projet de construction',
      displayOrder: 8
    }
  ];

  for (const service of services) {
    await db.website_services.create({
      data: {
        websiteId: siteVitrine.id,
        ...service,
        features: service.features,
        isActive: true,
        updatedAt: new Date()
      }
    });
  }

  console.log(`✅ ${services.length} services créés !`);

  // Projets/Réalisations
  const projects = [
    {
      title: '12.5 kWp + Batterie 15 kWh',
      location: 'Charleroi',
      details: '30 panneaux solaires 440 Wp + batterie de stockage 15 kWh + borne de recharge 11 kW. Installation complète avec monitoring intelligent.',
      tags: ['Photovoltaïque', 'Batterie', 'Borne de recharge'],
      completedAt: new Date('2025-10-01'),
      isFeatured: true,
      displayOrder: 1
    },
    {
      title: 'Pompe à Chaleur Air/Eau 12 kW',
      location: 'Namur',
      details: 'Installation pompe à chaleur Air/Eau avec système de chauffage au sol et production eau chaude sanitaire.',
      tags: ['Pompe à chaleur'],
      completedAt: new Date('2025-09-15'),
      isFeatured: true,
      displayOrder: 2
    },
    {
      title: 'Isolation Complète + PV 8 kWp',
      location: 'Liège',
      details: 'Isolation toiture 180m² + isolation murs + installation de 20 panneaux photovoltaïques 8 kWp.',
      tags: ['Isolation', 'Photovoltaïque'],
      completedAt: new Date('2025-09-10'),
      isFeatured: true,
      displayOrder: 3
    },
    {
      title: 'Toiture Plate 120m² + PV',
      location: 'Mons',
      details: 'Rénovation toiture plate avec membrane EPDM + installation de panneaux photovoltaïques intégrés.',
      tags: ['Toiture', 'Photovoltaïque'],
      completedAt: new Date('2025-08-20'),
      isFeatured: false,
      displayOrder: 4
    }
  ];

  for (const project of projects) {
    await db.website_projects.create({
      data: {
        websiteId: siteVitrine.id,
        ...project,
        tags: project.tags,
        isActive: true,
        updatedAt: new Date()
      }
    });
  }

  console.log(`✅ ${projects.length} projets créés !`);

  // Témoignages
  const testimonials = [
    {
      customerName: 'Marie Dupont',
      location: 'Charleroi',
      service: 'Panneaux solaires 10 kWp',
      rating: 5,
      text: 'Installation impeccable réalisée en une journée. L\'équipe était professionnelle, ponctuelle et a pris le temps de tout m\'expliquer en détail. Mes factures d\'électricité ont déjà diminué de moitié ! Je recommande vivement 2Thier pour leur expertise et leur service client.',
      publishedAt: new Date('2025-09-15'),
      isFeatured: true,
      displayOrder: 1
    },
    {
      customerName: 'Jean Martin',
      location: 'Namur',
      service: 'Pompe à chaleur Air/Eau',
      rating: 5,
      text: 'Excellent service du début à la fin. Étude technique précise, devis détaillé, installation soignée. La pompe à chaleur fonctionne parfaitement et nos factures de chauffage ont été divisées par deux. Service après-vente au top !',
      publishedAt: new Date('2025-08-25'),
      isFeatured: true,
      displayOrder: 2
    },
    {
      customerName: 'Sophie Lambert',
      location: 'Liège',
      service: 'Isolation toiture + PV 8 kWp',
      rating: 5,
      text: 'Projet complet géré par 2Thier de A à Z : isolation de notre toiture et installation de panneaux solaires. Coordination parfaite entre les différents corps de métier, travail très soigné et délais respectés. Notre maison est maintenant confortable et économe en énergie !',
      publishedAt: new Date('2025-07-30'),
      isFeatured: true,
      displayOrder: 3
    }
  ];

  for (const testimonial of testimonials) {
    await db.website_testimonials.create({
      data: {
        websiteId: siteVitrine.id,
        ...testimonial,
        isActive: true,
        updatedAt: new Date()
      }
    });
  }

  console.log(`✅ ${testimonials.length} témoignages créés !`);

  // ==========================================
  // SITE 2 : DEVIS1MINUTE
  // ==========================================

  console.log('\n🚀 Création du site Devis1Minute...');

  let siteDevis1Minute = await db.websites.findFirst({
    where: {
      organizationId: organization.id,
      slug: 'devis1minute'
    }
  });

  if (siteDevis1Minute) {
    console.log('⚠️  Devis1Minute existe déjà, suppression et recréation...');
    // Supprimer les données liées d'abord
    await db.website_services.deleteMany({ where: { websiteId: siteDevis1Minute.id } });
    await db.website_projects.deleteMany({ where: { websiteId: siteDevis1Minute.id } });
    await db.website_testimonials.deleteMany({ where: { websiteId: siteDevis1Minute.id } });
    await db.website_sections.deleteMany({ where: { websiteId: siteDevis1Minute.id } });
    await db.website_configs.deleteMany({ where: { websiteId: siteDevis1Minute.id } });
    await db.websites.delete({ where: { id: siteDevis1Minute.id } });
  }

  siteDevis1Minute = await db.websites.create({
    data: {
      organizationId: organization.id,
      siteName: 'Devis1Minute',
      siteType: 'landing_page',
      slug: 'devis1minute',
      domain: 'devis1minute.be',
      isActive: true,
      isPublished: true,
      maintenanceMode: false,
      updatedAt: new Date()
    }
  });

  console.log('✅ Site Devis1Minute créé !');

  // Configuration Devis1Minute
  await db.website_configs.create({
    data: {
      websiteId: siteDevis1Minute.id,
      primaryColor: '#10b981',
      secondaryColor: '#f59e0b',
      phone: '071/XX.XX.XX',
      email: 'devis@2thier.be',
      address: 'Route de Gosselies 23',
      city: 'Fleurus',
      postalCode: '6220',
      country: 'Belgique',
      heroTitle: 'Votre Devis en 1 Minute Chrono',
      heroSubtitle: 'Panneaux solaires, batteries, pompes à chaleur et plus encore. Réponse immédiate garantie !',
      heroCtaPrimary: 'Obtenir mon devis gratuit',
      heroCtaSecondary: 'En savoir plus',
      metaTitle: 'Devis1Minute - Devis Gratuit Panneaux Solaires & Énergie',
      metaDescription: 'Obtenez votre devis gratuit en 1 minute pour panneaux solaires, batteries, pompes à chaleur. Installation professionnelle en Wallonie.',
      metaKeywords: 'devis gratuit, panneaux solaires, devis rapide, photovoltaïque, Wallonie',
      stats: {
        devis_generated: 1000,
        response_time: '1 minute',
        satisfaction: 4.8
      },
      updatedAt: new Date()
    }
  });

  console.log('✅ Configuration Devis1Minute créée !');

  // Sections pour Devis1Minute (landing page)
  const sectionsDevis = [
    {
      key: 'header',
      type: 'header',
      name: 'En-tête',
      content: {
        logo: '/logo-devis1minute.png',
        navigation: [
          { label: 'Services', href: '#services' },
          { label: 'Comment ça marche', href: '#howto' },
          { label: 'Contact', href: '#contact' }
        ],
        ctaButton: { label: 'Devis Gratuit', href: '#form' }
      },
      displayOrder: 1,
      isLocked: true
    },
    {
      key: 'hero',
      type: 'hero',
      name: 'Section Héro',
      content: {
        title: 'Votre Devis en 1 Minute Chrono',
        subtitle: 'Panneaux solaires, batteries, pompes à chaleur et plus encore. Réponse immédiate garantie !',
        backgroundImage: '/hero-devis.jpg',
        ctaPrimary: { label: 'Obtenir mon devis gratuit', href: '#form' },
        ctaSecondary: { label: 'En savoir plus', href: '#services' }
      },
      displayOrder: 2
    },
    {
      key: 'form',
      type: 'form',
      name: 'Formulaire de devis',
      content: {
        title: 'Obtenez votre devis instantané',
        subtitle: 'Remplissez le formulaire en moins d\'une minute',
        formType: 'quick-quote'
      },
      backgroundColor: '#f0fdf4',
      displayOrder: 3
    },
    {
      key: 'services',
      type: 'services',
      name: 'Nos Services',
      content: {
        title: 'Nos Services',
        subtitle: 'Des solutions adaptées à vos besoins',
        displayMode: 'cards'
      },
      displayOrder: 4
    },
    {
      key: 'howto',
      type: 'steps',
      name: 'Comment ça marche',
      content: {
        title: 'Comment ça marche ?',
        steps: [
          { number: 1, title: 'Remplissez le formulaire', description: 'En moins d\'une minute' },
          { number: 2, title: 'Recevez votre devis', description: 'Instantanément par email' },
          { number: 3, title: 'Un expert vous contacte', description: 'Pour affiner votre projet' }
        ]
      },
      displayOrder: 5
    },
    {
      key: 'footer',
      type: 'footer',
      name: 'Pied de page',
      content: {
        copyright: '© 2025 Devis1Minute - Un service 2Thier SRL',
        links: [
          { label: 'Mentions légales', href: '/mentions-legales' },
          { label: 'Politique de confidentialité', href: '/confidentialite' }
        ]
      },
      displayOrder: 6,
      isLocked: true
    }
  ];

  for (const section of sectionsDevis) {
    await db.website_sections.create({
      data: {
        websiteId: siteDevis1Minute.id,
        ...section,
        content: section.content,
        isActive: true,
        isLocked: section.isLocked || false,
        updatedAt: new Date()
      }
    });
  }

  console.log(`✅ ${sectionsDevis.length} sections Devis1Minute créées !`);

  // Services simplifiés pour Devis1Minute
  const servicesDevis = [
    {
      key: 'pv',
      icon: 'ThunderboltOutlined',
      title: 'Panneaux Solaires',
      description: 'Installation clé en main',
      features: ['Devis gratuit', 'Installation rapide', 'Garantie 25 ans'],
      ctaText: 'Obtenir un devis',
      displayOrder: 1
    },
    {
      key: 'batteries',
      icon: 'BulbOutlined',
      title: 'Batteries',
      description: 'Stockage d\'énergie',
      features: ['Autonomie', 'Compatible', 'Intelligent'],
      ctaText: 'Obtenir un devis',
      displayOrder: 2
    },
    {
      key: 'pac',
      icon: 'FireOutlined',
      title: 'Pompes à Chaleur',
      description: 'Chauffage écologique',
      features: ['Économies 70%', 'Primes', 'Installation pro'],
      ctaText: 'Obtenir un devis',
      displayOrder: 3
    }
  ];

  for (const service of servicesDevis) {
    await db.website_services.create({
      data: {
        websiteId: siteDevis1Minute.id,
        ...service,
        features: service.features,
        isActive: true,
        updatedAt: new Date()
      }
    });
  }

  console.log(`✅ ${servicesDevis.length} services Devis1Minute créés !`);

  console.log('\n🎉 Seed terminé avec succès !');
  console.log(`\n📊 Résumé :`);
  console.log(`   - 2 sites web créés`);
  console.log(`   - Site Vitrine : ${sections.length} sections, ${services.length} services, ${projects.length} projets, ${testimonials.length} témoignages`);
  console.log(`   - Devis1Minute : ${sectionsDevis.length} sections, ${servicesDevis.length} services`);
  console.log(`\n✅ Vous pouvez maintenant accéder aux sites :`);
  console.log(`   - http://localhost:5173/site-vitrine-2thier`);
  console.log(`   - http://localhost:5173/devis1minute`);
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed :', e);
    process.exit(1);
  });
