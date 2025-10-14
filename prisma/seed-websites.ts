/**
 * Script de seed pour initialiser les sites web
 * Site Vitrine 2Thier + Devis1Minute
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seed des sites web...');

  // Récupérer l'organisation 2Thier (Super Admin)
  const org2Thier = await prisma.organization.findFirst({
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
    
    const newOrg = await prisma.organization.create({
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

  const organization = org2Thier || await prisma.organization.findFirst({
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
  let siteVitrine = await prisma.webSite.findFirst({
    where: {
      organizationId: organization.id,
      slug: 'site-vitrine-2thier'
    }
  });

  if (siteVitrine) {
    console.log('⚠️  Site Vitrine existe déjà, suppression et recréation...');
    await prisma.webSite.delete({ where: { id: siteVitrine.id } });
  }

  siteVitrine = await prisma.webSite.create({
    data: {
      organizationId: organization.id,
      siteName: '2Thier SRL',
      siteType: 'vitrine',
      slug: 'site-vitrine-2thier',
      domain: '2thier.be',
      isActive: true,
      isPublished: true,
      maintenanceMode: false
    }
  });

  console.log('✅ Site Vitrine créé !');

  // Configuration du site vitrine
  await prisma.webSiteConfig.create({
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
      ]
    }
  });

  console.log('✅ Configuration du Site Vitrine créée !');

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
    await prisma.webSiteService.create({
      data: {
        websiteId: siteVitrine.id,
        ...service,
        features: service.features,
        isActive: true
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
    await prisma.webSiteProject.create({
      data: {
        websiteId: siteVitrine.id,
        ...project,
        tags: project.tags,
        isActive: true
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
    await prisma.webSiteTestimonial.create({
      data: {
        websiteId: siteVitrine.id,
        ...testimonial,
        isActive: true
      }
    });
  }

  console.log(`✅ ${testimonials.length} témoignages créés !`);

  // ==========================================
  // SITE 2 : DEVIS1MINUTE
  // ==========================================

  console.log('\n🚀 Création du site Devis1Minute...');

  let siteDevis1Minute = await prisma.webSite.findFirst({
    where: {
      organizationId: organization.id,
      slug: 'devis1minute'
    }
  });

  if (siteDevis1Minute) {
    console.log('⚠️  Devis1Minute existe déjà, suppression et recréation...');
    await prisma.webSite.delete({ where: { id: siteDevis1Minute.id } });
  }

  siteDevis1Minute = await prisma.webSite.create({
    data: {
      organizationId: organization.id,
      siteName: 'Devis1Minute',
      siteType: 'landing_page',
      slug: 'devis1minute',
      domain: 'devis1minute.be',
      isActive: true,
      isPublished: true,
      maintenanceMode: false
    }
  });

  console.log('✅ Site Devis1Minute créé !');

  // Configuration Devis1Minute
  await prisma.webSiteConfig.create({
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
      }
    }
  });

  console.log('✅ Configuration Devis1Minute créée !');

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
    await prisma.webSiteService.create({
      data: {
        websiteId: siteDevis1Minute.id,
        ...service,
        features: service.features,
        isActive: true
      }
    });
  }

  console.log(`✅ ${servicesDevis.length} services Devis1Minute créés !`);

  console.log('\n🎉 Seed terminé avec succès !');
  console.log(`\n📊 Résumé :`);
  console.log(`   - 2 sites web créés`);
  console.log(`   - Site Vitrine : ${services.length} services, ${projects.length} projets, ${testimonials.length} témoignages`);
  console.log(`   - Devis1Minute : ${servicesDevis.length} services`);
  console.log(`\n✅ Vous pouvez maintenant accéder aux sites :`);
  console.log(`   - http://localhost:5173/site-vitrine-2thier`);
  console.log(`   - http://localhost:5173/devis1minute`);
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
