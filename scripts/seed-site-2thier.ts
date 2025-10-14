/**
 * 🌱 SEED COMPLET SITE VITRINE 2THIER
 * 
 * Crée TOUTES les données dans Prisma pour que l'éditeur et les renderers
 * affichent parfaitement le site vitrine 2Thier.
 * 
 * @author IA Assistant - 9 octobre 2025
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 [SEED] Site Vitrine 2Thier - Début...\n');

  // 1️⃣ Trouver l'organisation 2Thier CRM
  let org = await prisma.organization.findFirst({
    where: { name: '2Thier CRM' }
  });

  if (!org) {
    console.log('⚠️  Organisation "2Thier CRM" introuvable, création...');
    org = await prisma.organization.create({
      data: {
        name: '2Thier CRM',
        description: 'Organisation principale CRM',
        website: 'https://www.2thier.com',
        phone: '+32 470 00 00 00'
      }
    });
  }

  console.log(`🏢 Organisation : ${org.name} (${org.id})\n`);

  // 2️⃣ Créer ou récupérer le site
  console.log('📄 Création/mise à jour du site...');
  
  let website = await prisma.webSite.findFirst({
    where: {
      organizationId: org.id,
      slug: 'site-vitrine-2thier'
    }
  });

  if (website) {
    console.log(`ℹ️  Site existant trouvé (ID: ${website.id}), suppression pour recréation propre...`);
    await prisma.webSite.delete({ where: { id: website.id } });
  }

  website = await prisma.webSite.create({
    data: {
      organizationId: org.id,
      siteName: '2THIER ENERGY',
      siteType: 'vitrine',
      slug: 'site-vitrine-2thier',
      domain: 'www.2thier.be',
      isActive: true,
      isPublished: true,
      maintenanceMode: false
    }
  });

  console.log(`✅ Site créé : ${website.siteName} (ID: ${website.id})\n`);

  // 3️⃣ Configuration du site
  console.log('⚙️  Création de la configuration...');
  await prisma.webSiteConfig.create({
    data: {
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
    }
  });
  console.log('✅ Configuration créée\n');

  // 4️⃣ SECTIONS du site (Header, Hero, Stats, etc.)
  console.log('📐 Création des sections...');

  const sections = [
    {
      key: 'header',
      type: 'header',
      name: 'En-tête',
      displayOrder: 1,
      isLocked: true,
      content: {
        logo: {
          type: 'text',
          text: '⚡ 2THIER ENERGY',
          color: '#10b981',
          fontSize: '24px'
        },
        navigation: {
          links: [
            { text: 'Accueil', href: '#hero' },
            { text: 'Solutions', href: '#services' },
            { text: 'Réalisations', href: '#projects' },
            { text: 'Témoignages', href: '#testimonials' },
            { text: 'Contact', href: '#contact' }
          ]
        },
        cta: {
          text: 'DEVIS GRATUIT',
          href: '#contact',
          style: { backgroundColor: '#10b981', borderColor: '#10b981' }
        },
        style: {
          position: 'fixed',
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }
      }
    },
    {
      key: 'hero',
      type: 'hero',
      name: 'Section héro',
      displayOrder: 2,
      content: {
        title: {
          text: '🌞 Votre Partenaire en Transition Énergétique',
          color: 'white',
          fontSize: 'clamp(32px, 8vw, 56px)'
        },
        subtitle: {
          text: 'Photovoltaïque • Batteries • Bornes de Recharge • Pompes à Chaleur\nIsolation • Toiture • Électricité • Gros Œuvre',
          color: 'rgba(255,255,255,0.95)',
          fontSize: 'clamp(16px, 4vw, 20px)'
        },
        primaryButton: {
          text: 'DEMANDER UN DEVIS GRATUIT',
          href: '#contact',
          icon: 'RocketOutlined',
          style: {
            padding: '16px 32px',
            fontSize: '18px',
            backgroundColor: 'white',
            color: '#10b981'
          }
        },
        secondaryButton: {
          text: 'NOS RÉALISATIONS',
          href: '#projects',
          style: {
            padding: '16px 32px',
            fontSize: '18px',
            borderColor: 'white',
            color: 'white',
            backgroundColor: 'rgba(255,255,255,0.1)'
          }
        },
        footer: {
          text: '+500 installations réalisées • 4.9/5 de satisfaction',
          icon: 'CheckCircleOutlined',
          color: 'rgba(255,255,255,0.9)'
        },
        style: {
          background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
          minHeight: '600px',
          padding: '60px 24px'
        }
      }
    },
    {
      key: 'stats',
      type: 'stats',
      name: 'Statistiques',
      displayOrder: 3,
      content: {
        items: [
          { icon: 'HomeOutlined', value: 500, prefix: '+', label: 'Installations réalisées' },
          { icon: 'ThunderboltOutlined', value: 15, suffix: ' MW', label: 'Puissance installée' },
          { icon: 'StarFilled', value: 4.9, suffix: '/5', label: 'Satisfaction client' },
          { icon: 'EnvironmentOutlined', value: 'Wallonie', label: 'Région couverte' }
        ],
        style: { backgroundColor: '#f9fafb', padding: '60px 24px' }
      }
    },
    {
      key: 'services',
      type: 'services',
      name: 'Nos Solutions',
      displayOrder: 4,
      content: {
        title: {
          text: '🔆 Nos Solutions Énergétiques',
          fontSize: 'clamp(28px, 6vw, 42px)'
        },
        subtitle: {
          text: 'Un écosystème complet pour votre autonomie énergétique',
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
            icon: { name: 'ThunderboltOutlined' },
            title: 'Batteries',
            description: 'Stockage d\'énergie pour autoconsommation',
            features: ['Autonomie jour & nuit', 'Compatible onduleurs', 'Extension modulaire', 'Garantie 10 ans'],
            button: { text: 'En savoir plus', href: '#contact' }
          },
          {
            icon: { name: 'HomeOutlined' },
            title: 'Bornes de Recharge',
            description: 'Rechargez votre véhicule électrique',
            features: ['Installation certifiée', 'Bornes intelligentes', 'Gestion app mobile', 'Primes disponibles'],
            button: { text: 'En savoir plus', href: '#contact' }
          },
          {
            icon: { name: 'SafetyOutlined' },
            title: 'Pompes à Chaleur',
            description: 'Chauffage & climatisation écologique',
            features: ['Économies 70%', 'Air/Eau ou Air/Air', 'COP élevé >4.0', 'Subventions régionales'],
            button: { text: 'En savoir plus', href: '#contact' }
          }
        ],
        style: { padding: '80px 24px' }
      }
    },
    {
      key: 'testimonials',
      type: 'testimonials',
      name: 'Témoignages',
      displayOrder: 5,
      content: {
        title: {
          text: '⭐ Ce Que Nos Clients Disent',
          fontSize: 'clamp(28px, 6vw, 42px)'
        },
        items: [
          {
            rating: 5,
            text: 'Installation impeccable, équipe professionnelle. Nos panneaux produisent mieux que prévu !',
            name: 'Marc Dubois',
            location: 'Charleroi'
          },
          {
            rating: 5,
            text: 'Du premier contact au suivi, tout était parfait. La pompe fonctionne à merveille.',
            name: 'Sophie Laurent',
            location: 'Fleurus'
          },
          {
            rating: 5,
            text: 'Très satisfait de mon installation PV + batterie. L\'équipe est très pro !',
            name: 'Jean Martin',
            location: 'Gosselies'
          }
        ],
        autoplay: true,
        autoplaySpeed: 5000,
        style: { backgroundColor: '#f9fafb', padding: '80px 24px' }
      }
    },
    {
      key: 'cta',
      type: 'cta',
      name: 'Appel à l\'action',
      displayOrder: 6,
      content: {
        title: '🌟 Prêt à Passer à l\'Énergie Verte ?',
        subtitle: 'Demandez votre devis gratuit et sans engagement\nRéponse sous 24h garantie',
        primaryButton: {
          text: '071/XX.XX.XX',
          href: 'tel:071XXXXXX',
          icon: 'PhoneOutlined',
          style: { padding: '16px 32px', backgroundColor: 'white', color: '#10b981' }
        },
        secondaryButton: {
          text: 'DEVIS EN LIGNE',
          href: '#contact',
          icon: 'MailOutlined',
          style: { padding: '16px 32px', borderColor: 'white', color: 'white', backgroundColor: 'rgba(255,255,255,0.1)' }
        },
        style: { background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', padding: '80px 24px' }
      }
    },
    {
      key: 'footer',
      type: 'footer',
      name: 'Pied de page',
      displayOrder: 7,
      isLocked: true,
      content: {
        logo: {
          type: 'text',
          text: '2THIER ENERGY',
          emoji: '⚡',
          description: 'Votre partenaire en transition énergétique depuis 2020'
        },
        columns: [
          {
            title: 'Solutions',
            links: [
              { label: 'Photovoltaïque', url: '#services' },
              { label: 'Batteries', url: '#services' },
              { label: 'Bornes Recharge', url: '#services' },
              { label: 'Pompes à Chaleur', url: '#services' }
            ]
          },
          {
            title: 'Entreprise',
            links: [
              { label: 'À propos', url: '#about' },
              { label: 'Réalisations', url: '#projects' },
              { label: 'Blog', url: '#blog' },
              { label: 'Contact', url: '#contact' }
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
        copyright: '© 2025 2Thier Energy - Tous droits réservés • BE 0XXX.XXX.XXX',
        style: { background: '#1f2937', color: 'white', padding: '60px 24px 24px' }
      }
    }
  ];

  for (const section of sections) {
    await prisma.webSiteSection.create({
      data: {
        websiteId: website.id,
        ...section
      }
    });
  }
  console.log(`✅ ${sections.length} sections créées\n`);

  // 5️⃣ SERVICES
  console.log('⚡ Création des services...');
  const services = [
    {
      key: 'photovoltaique',
      icon: 'ThunderboltOutlined',
      title: 'Photovoltaïque',
      description: 'Installation de panneaux solaires haute performance pour votre autonomie énergétique',
      features: ['Étude personnalisée gratuite', 'Panneaux garantis 25 ans', 'Monitoring en temps réel', 'Primes & déductions fiscales'],
      ctaText: 'En savoir plus',
      ctaUrl: '#contact',
      displayOrder: 0
    },
    {
      key: 'batteries',
      icon: 'BulbOutlined',
      title: 'Batteries',
      description: 'Stockage d\'énergie pour maximiser votre autoconsommation',
      features: ['Autonomie jour & nuit', 'Compatible tout onduleur', 'Extension modulaire', 'Garantie 10 ans'],
      ctaText: 'En savoir plus',
      ctaUrl: '#contact',
      displayOrder: 1
    },
    {
      key: 'bornes',
      icon: 'CarOutlined',
      title: 'Bornes de Recharge',
      description: 'Rechargez votre véhicule électrique à domicile',
      features: ['Installation certifiée', 'Bornes intelligentes', 'Gestion via app', 'Primes disponibles'],
      ctaText: 'En savoir plus',
      ctaUrl: '#contact',
      displayOrder: 2
    },
    {
      key: 'pompes',
      icon: 'FireOutlined',
      title: 'Pompes à Chaleur',
      description: 'Chauffage & climatisation écologique',
      features: ['Économies jusqu\'à 70%', 'Air/Eau ou Air/Air', 'COP élevé >4.0', 'Subventions régionales'],
      ctaText: 'En savoir plus',
      ctaUrl: '#contact',
      displayOrder: 3
    }
  ];

  for (const service of services) {
    await prisma.webSiteService.create({
      data: {
        websiteId: website.id,
        ...service
      }
    });
  }
  console.log(`✅ ${services.length} services créés\n`);

  // 6️⃣ PROJETS
  console.log('📸 Création des projets...');
  const projects = [
    {
      title: 'Installation 12 kWc + Batterie 10 kWh',
      location: 'Charleroi',
      details: 'Installation complète avec monitoring et batterie pour autonomie maximale.',
      tags: ['Photovoltaïque', 'Batterie', 'Monitoring'],
      isFeatured: true,
      displayOrder: 0
    },
    {
      title: 'Pompe à Chaleur Air/Eau 16 kW',
      location: 'Fleurus',
      details: 'Remplacement chaudière mazout par PAC haute performance.',
      tags: ['Pompe à Chaleur', 'Chauffage'],
      isFeatured: true,
      displayOrder: 1
    },
    {
      title: 'Borne de Recharge 22 kW + PV',
      location: 'Gosselies',
      details: 'Installation panneaux solaires 8 kWc avec borne intelligente.',
      tags: ['Photovoltaïque', 'Borne Recharge'],
      isFeatured: true,
      displayOrder: 2
    },
    {
      title: 'Rénovation Énergétique Complète',
      location: 'Jumet',
      details: 'PV 15 kWc, PAC, isolation toiture, borne - projet clé en main.',
      tags: ['Photovoltaïque', 'PAC', 'Isolation'],
      isFeatured: true,
      displayOrder: 3
    }
  ];

  for (const project of projects) {
    await prisma.webSiteProject.create({
      data: {
        websiteId: website.id,
        ...project
      }
    });
  }
  console.log(`✅ ${projects.length} projets créés\n`);

  // 7️⃣ TÉMOIGNAGES
  console.log('💬 Création des témoignages...');
  const testimonials = [
    {
      customerName: 'Marc Dubois',
      location: 'Charleroi',
      service: 'Photovoltaïque 10 kWc',
      rating: 5,
      text: 'Installation impeccable, équipe professionnelle. Nos panneaux produisent mieux que prévu !',
      isFeatured: true,
      displayOrder: 0
    },
    {
      customerName: 'Sophie Laurent',
      location: 'Fleurus',
      service: 'Pompe à Chaleur',
      rating: 5,
      text: 'Du premier contact au suivi, tout était parfait. La pompe fonctionne à merveille.',
      isFeatured: true,
      displayOrder: 1
    },
    {
      customerName: 'Jean Martin',
      location: 'Gosselies',
      service: 'Photovoltaïque + Batterie',
      rating: 5,
      text: 'Très satisfait de mon installation. L\'équipe est très pro, je recommande !',
      isFeatured: true,
      displayOrder: 2
    },
    {
      customerName: 'Anne Dumont',
      location: 'Jumet',
      service: 'Rénovation complète',
      rating: 5,
      text: 'Projet clé en main parfaitement géré. Notre maison est maintenant quasi autonome !',
      isFeatured: false,
      displayOrder: 3
    }
  ];

  for (const testimonial of testimonials) {
    await prisma.webSiteTestimonial.create({
      data: {
        websiteId: website.id,
        ...testimonial
      }
    });
  }
  console.log(`✅ ${testimonials.length} témoignages créés\n`);

  // 8️⃣ RÉSUMÉ
  console.log('🎉 SEED TERMINÉ AVEC SUCCÈS !\n');
  console.log('📊 Résumé :');
  console.log(`   • Site : ${website.siteName}`);
  console.log(`   • Slug : ${website.slug}`);
  console.log(`   • Sections : ${sections.length}`);
  console.log(`   • Services : ${services.length}`);
  console.log(`   • Projets : ${projects.length}`);
  console.log(`   • Témoignages : ${testimonials.length}`);
  console.log('\n✅ Le site est prêt ! Les renderers peuvent maintenant afficher le contenu.');
  console.log('🌐 Test : http://localhost:5173/site-vitrine-2thier\n');
}

main()
  .catch((e) => {
    console.error('❌ ERREUR:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
