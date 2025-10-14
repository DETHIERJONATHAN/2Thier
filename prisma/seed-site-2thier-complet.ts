import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌟 === SEED SITE VITRINE 2THIER - VERSION COMPLÈTE === 🌟\n');

  // 🧹 NETTOYAGE (optionnel - commentez si vous voulez garder les données existantes)
  console.log('🧹 Nettoyage des données existantes...');
  // On supprime directement par slug sans relation
  const existingSite = await prisma.webSite.findUnique({ where: { slug: 'site-vitrine-2thier' } });
  if (existingSite) {
    await prisma.webSiteTestimonial.deleteMany({ where: { websiteId: existingSite.id } });
    await prisma.webSiteProject.deleteMany({ where: { websiteId: existingSite.id } });
    await prisma.webSiteService.deleteMany({ where: { websiteId: existingSite.id } });
    await prisma.webSiteSection.deleteMany({ where: { websiteId: existingSite.id } });
    await prisma.webSiteConfig.deleteMany({ where: { websiteId: existingSite.id } });
    await prisma.webSite.delete({ where: { id: existingSite.id } });
  }
  console.log('✅ Nettoyage terminé\n');

  // 1️⃣ CRÉATION DU SITE
  console.log('1️⃣ Création du site "2Thier Energy"...');
  const website = await prisma.webSite.create({
    data: {
      name: '2Thier Energy',
      slug: 'site-vitrine-2thier',
      title: 'Votre Partenaire en Transition Énergétique',
      description: 'Photovoltaïque • Batteries • Bornes de Recharge • Pompes à Chaleur • Isolation • Toiture • Électricité • Gros Œuvre',
      organizationId: '1757366075154-i554z93kl', // 2Thier CRM
      active: true,
      metadata: {
        domain: '2thier.be',
        primaryColor: '#10b981',
        secondaryColor: '#059669',
        phone: '071/XX.XX.XX',
        email: 'info@2thier.be',
        address: 'Route de Gosselies 23, 6220 Fleurus (Charleroi)'
      }
    },
  });
  console.log(`✅ Site créé - ID: ${website.id}\n`);

  // 2️⃣ CONFIGURATION DU SITE (stats, valeurs, etc.)
  console.log('2️⃣ Création de la configuration...');
  await prisma.webSiteConfig.create({
    data: {
      webSiteId: website.id,
      key: 'site-config',
      configJson: {
        stats: {
          installations: 500,
          powerMW: 15,
          satisfaction: 4.9,
          region: 'Wallonie'
        },
        valuesJson: [
          {
            icon: 'SafetyCertificateOutlined',
            title: 'Certifiés & Agréés',
            description: 'Agrégation Classe 1, RESCERT, toutes assurances professionnelles'
          },
          {
            icon: 'StarFilled',
            title: 'Excellence Reconnue',
            description: '4.9/5 de satisfaction sur +124 avis Google Reviews vérifiés'
          },
          {
            icon: 'CustomerServiceOutlined',
            title: 'Service Premium',
            description: 'SAV réactif, garanties longue durée, suivi personnalisé à vie'
          },
          {
            icon: 'CheckCircleOutlined',
            title: 'Tout-en-Un',
            description: 'De l\'étude à la mise en service, un seul interlocuteur expert'
          }
        ]
      }
    }
  });
  console.log('✅ Configuration créée\n');

  // 3️⃣ SECTIONS DU SITE
  console.log('3️⃣ Création des sections...');
  
  const sections = [
    {
      name: 'Hero Section',
      type: 'hero',
      order: 1,
      content: {
        title: '🌞 Votre Partenaire en Transition Énergétique',
        subtitle: 'Photovoltaïque • Batteries • Bornes de Recharge • Pompes à Chaleur\nIsolation • Toiture • Électricité • Gros Œuvre',
        primaryCta: 'DEMANDER UN DEVIS GRATUIT',
        secondaryCta: 'NOS RÉALISATIONS',
        badge: '+500 installations réalisées • 4.9/5 de satisfaction',
        backgroundGradient: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
        textColor: 'white'
      },
      visible: true
    },
    {
      name: 'Statistiques',
      type: 'stats',
      order: 2,
      content: {
        stats: [
          { value: '+500', label: 'Installations réalisées', icon: 'HomeOutlined' },
          { value: '15 MW', label: 'Puissance installée', icon: 'ThunderboltOutlined' },
          { value: '4.9/5', label: 'Satisfaction client', icon: 'StarFilled' },
          { value: 'Wallonie', label: 'Région couverte', icon: 'EnvironmentOutlined' }
        ],
        backgroundColor: '#f9fafb'
      },
      visible: true
    },
    {
      name: 'Nos Solutions Énergétiques',
      type: 'services',
      order: 3,
      content: {
        title: '🔆 Nos Solutions Énergétiques',
        subtitle: 'Un écosystème complet pour votre autonomie énergétique et votre confort',
        servicesDisplay: 'grid'
      },
      visible: true
    },
    {
      name: 'Pourquoi 2Thier',
      type: 'values',
      order: 4,
      content: {
        title: '💚 Pourquoi Choisir 2Thier ?',
        backgroundColor: '#f9fafb'
      },
      visible: true
    },
    {
      name: 'Nos Dernières Réalisations',
      type: 'projects',
      order: 5,
      content: {
        title: '📸 Nos Dernières Réalisations',
        linkText: 'Voir toutes nos réalisations →',
        displayMode: 'grid'
      },
      visible: true
    },
    {
      name: 'Témoignages Clients',
      type: 'testimonials',
      order: 6,
      content: {
        title: '⭐ Ce Que Nos Clients Disent',
        averageRating: 4.9,
        totalReviews: 124,
        platform: 'Google Reviews',
        displayMode: 'carousel',
        backgroundColor: '#f9fafb'
      },
      visible: true
    },
    {
      name: 'Votre Projet en 5 Étapes',
      type: 'process',
      order: 7,
      content: {
        title: '🚀 Votre Projet en 5 Étapes',
        steps: [
          { title: 'Contact', description: 'Demande gratuite sous 24h', icon: 'PhoneOutlined' },
          { title: 'Étude', description: 'Visite + analyse de faisabilité', icon: 'SafetyCertificateOutlined' },
          { title: 'Devis', description: 'Proposition détaillée personnalisée', icon: 'ToolOutlined' },
          { title: 'Installation', description: 'Pose par techniciens certifiés', icon: 'TeamOutlined' },
          { title: 'Suivi', description: 'SAV & garanties longue durée', icon: 'CheckCircleOutlined' }
        ]
      },
      visible: true
    },
    {
      name: 'CTA Final',
      type: 'cta',
      order: 8,
      content: {
        title: '🌟 Prêt à Passer à l\'Énergie Verte ?',
        subtitle: 'Demandez votre devis gratuit et sans engagement\nRéponse sous 24h garantie',
        primaryCta: '071/XX.XX.XX',
        secondaryCta: 'DEVIS EN LIGNE',
        footer: 'Route de Gosselies 23, 6220 Fleurus (Charleroi)',
        backgroundGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
      },
      visible: true
    }
  ];

  for (const section of sections) {
    await prisma.webSiteSection.create({
      data: {
        webSiteId: website.id,
        name: section.name,
        type: section.type,
        order: section.order,
        content: section.content,
        visible: section.visible
      }
    });
    console.log(`  ✅ ${section.name}`);
  }
  console.log('✅ 8 sections créées\n');

  // 4️⃣ SERVICES
  console.log('4️⃣ Création des services...');
  
  const services = [
    {
      name: 'Panneaux Photovoltaïques',
      key: 'photovoltaique',
      icon: 'ThunderboltOutlined',
      description: 'Installation complète clé-en-main de panneaux solaires haute performance',
      featuresJson: [
        'Panneaux premium 25-30 ans garantie',
        'Onduleurs intelligents dernière génération',
        'Monitoring temps réel via app',
        'Installation certifiée en 2-3 jours'
      ],
      cta: 'Simuler mon installation',
      order: 1,
      active: true
    },
    {
      name: 'Batteries de Stockage',
      key: 'batteries',
      icon: 'BulbOutlined',
      description: 'Stockez votre énergie solaire pour une autonomie maximale 24h/24',
      featuresJson: [
        'Batteries lithium 10-15 ans durée de vie',
        'Gestion intelligente des flux',
        'Backup automatique en cas de coupure',
        'Compatible toutes installations'
      ],
      cta: 'Calculer mon besoin',
      order: 2,
      active: true
    },
    {
      name: 'Bornes de Recharge',
      key: 'bornes-recharge',
      icon: 'CarOutlined',
      description: 'Rechargez votre véhicule électrique à domicile en toute simplicité',
      featuresJson: [
        'Bornes 7.4kW à 22kW',
        'Compatible tous véhicules électriques',
        'Installation conforme Rgie',
        'Primes régionales disponibles'
      ],
      cta: 'Demander un devis',
      order: 3,
      active: true
    },
    {
      name: 'Pompes à Chaleur',
      key: 'pompes-chaleur',
      icon: 'FireOutlined',
      description: 'Chauffage écologique et économique pour votre habitation',
      featuresJson: [
        'Air/eau ou Air/air haute efficacité',
        'Jusqu\'à 75% d\'économies chauffage',
        'Installation complète chauffagiste',
        'Primes Région Wallonne jusqu\'à 5000€'
      ],
      cta: 'Étude de faisabilité',
      order: 4,
      active: true
    },
    {
      name: 'Isolation',
      key: 'isolation',
      icon: 'HomeOutlined',
      description: 'Isolation thermique et acoustique pour un confort optimal',
      featuresJson: [
        'Toiture, murs, sols',
        'Matériaux écologiques certifiés',
        'Jusqu\'à 40% d\'économies énergie',
        'Primes isolation 2025 disponibles'
      ],
      cta: 'Audit énergétique gratuit',
      order: 5,
      active: true
    },
    {
      name: 'Toiture & Charpente',
      key: 'toiture',
      icon: 'CloudOutlined',
      description: 'Rénovation et pose de toiture neuve par nos couvreurs experts',
      featuresJson: [
        'Ardoise, tuiles, EPDM, zinc',
        'Garantie décennale entreprise',
        'Traitement charpente bois',
        'Synergies avec photovoltaïque'
      ],
      cta: 'Inspection toiture gratuite',
      order: 6,
      active: true
    },
    {
      name: 'Électricité & Gros Œuvre',
      key: 'electricite-grosoeuvre',
      icon: 'ToolOutlined',
      description: 'Installations électriques et travaux de gros œuvre',
      featuresJson: [
        'Électricien agréé Rgie',
        'Mise en conformité complète',
        'Extensions & rénovations',
        'Gestion de projet globale'
      ],
      cta: 'Devis travaux',
      order: 7,
      active: true
    }
  ];

  for (const service of services) {
    await prisma.webSiteService.create({
      data: {
        webSiteId: website.id,
        name: service.name,
        key: service.key,
        icon: service.icon,
        description: service.description,
        featuresJson: service.featuresJson,
        cta: service.cta,
        order: service.order,
        active: service.active
      }
    });
    console.log(`  ✅ ${service.name}`);
  }
  console.log('✅ 7 services créés\n');

  // 5️⃣ PROJETS/RÉALISATIONS
  console.log('5️⃣ Création des projets...');
  
  const projects = [
    {
      title: 'Installation 9.6 kWc + Batterie',
      location: 'Gosselies (Charleroi)',
      details: '24 panneaux 400Wc Sunpower Black + Batterie Tesla Powerwall 13.5kWh + Monitoring',
      image: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&h=600&fit=crop',
      date: 'Décembre 2024',
      tagsJson: ['Photovoltaïque', 'Batterie', 'Résidentiel'],
      order: 1,
      featured: true
    },
    {
      title: 'Pompe à Chaleur Air/Eau',
      location: 'Fleurus',
      details: 'Remplacement chaudière mazout par PAC Daikin 16kW + radiateurs BT + ballon ECS',
      image: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800&h=600&fit=crop',
      date: 'Novembre 2024',
      tagsJson: ['Pompe à Chaleur', 'Chauffage', 'Résidentiel'],
      order: 2,
      featured: true
    },
    {
      title: 'Installation PV Industrielle 50 kWc',
      location: 'Farciennes',
      details: 'Hangar industriel - 120 panneaux 415Wc + onduleurs triphasés + monitoring avancé',
      image: 'https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?w=800&h=600&fit=crop',
      date: 'Octobre 2024',
      tagsJson: ['Photovoltaïque', 'Professionnel', 'Grande Installation'],
      order: 3,
      featured: true
    },
    {
      title: 'Borne de Recharge 22kW',
      location: 'Gilly',
      details: 'Wallbox Pulsar Plus 22kW + installation électrique complète + câble Type 2',
      image: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=800&h=600&fit=crop',
      date: 'Septembre 2024',
      tagsJson: ['Borne', 'Électrique', 'Résidentiel'],
      order: 4,
      featured: true
    }
  ];

  for (const project of projects) {
    await prisma.webSiteProject.create({
      data: {
        webSiteId: website.id,
        title: project.title,
        location: project.location,
        details: project.details,
        image: project.image,
        date: project.date,
        tagsJson: project.tagsJson,
        order: project.order,
        featured: project.featured
      }
    });
    console.log(`  ✅ ${project.title}`);
  }
  console.log('✅ 4 projets créés\n');

  // 6️⃣ TÉMOIGNAGES
  console.log('6️⃣ Création des témoignages...');
  
  const testimonials = [
    {
      name: 'Marc Dubois',
      location: 'Gosselies',
      service: 'Installation Photovoltaïque 6.8 kWc',
      rating: 5,
      text: 'Installation parfaite réalisée en 2 jours comme prévu. L\'équipe est professionnelle, à l\'écoute et de bon conseil. Mon installation produit même plus que prévu ! Je recommande vivement 2Thier Energy.',
      date: 'Il y a 2 semaines',
      order: 1,
      verified: true
    },
    {
      name: 'Sophie Laurent',
      location: 'Fleurus',
      service: 'Pompe à Chaleur + Isolation Toiture',
      rating: 5,
      text: 'Très satisfaite de la pompe à chaleur installée par 2Thier. Plus besoin de mazout, ma facture a été divisée par 3 ! L\'équipe a géré l\'isolation de la toiture en même temps, gain de temps et d\'argent. Service impeccable.',
      date: 'Il y a 3 semaines',
      order: 2,
      verified: true
    },
    {
      name: 'Jean-François Martin',
      location: 'Charleroi',
      service: 'Panneaux PV + Batterie 10kWh',
      rating: 5,
      text: 'Installation complète photovoltaïque avec batterie. Nous sommes maintenant quasi autonomes en électricité ! Le suivi après-vente est excellent, l\'app de monitoring est très pratique. Entreprise sérieuse, je recommande.',
      date: 'Il y a 1 mois',
      order: 3,
      verified: true
    },
    {
      name: 'Christine Lejeune',
      location: 'Farciennes',
      service: 'Borne de Recharge 11kW',
      rating: 5,
      text: 'Borne installée rapidement et proprement. Mon véhicule électrique se recharge maintenant à la maison en quelques heures. Prix très correct, travail soigné, je suis ravie !',
      date: 'Il y a 1 mois',
      order: 4,
      verified: true
    }
  ];

  for (const testimonial of testimonials) {
    await prisma.webSiteTestimonial.create({
      data: {
        websiteId: website.id,
        customerName: testimonial.name,
        location: testimonial.location,
        service: testimonial.service,
        rating: testimonial.rating,
        text: testimonial.text,
        displayOrder: testimonial.order,
        isActive: true,
        isFeatured: testimonial.verified
      }
    });
    console.log(`  ✅ ${testimonial.name} (${testimonial.rating}/5)`);
  }
  console.log('✅ 4 témoignages créés\n');

  console.log('✨✨✨ SEED TERMINÉ AVEC SUCCÈS ! ✨✨✨');
  console.log(`\n📊 RÉCAPITULATIF:`);
  console.log(`   • 1 site web créé`);
  console.log(`   • 1 configuration`);
  console.log(`   • 8 sections`);
  console.log(`   • 7 services`);
  console.log(`   • 4 projets`);
  console.log(`   • 4 témoignages`);
  console.log(`\n🌐 Le site est maintenant accessible sur:`);
  console.log(`   http://localhost:5173/site-vitrine-2thier\n`);
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
