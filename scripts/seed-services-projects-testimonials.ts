/**
 * 🎯 SEED DES DONNÉES MANQUANTES (Services, Projets, Témoignages)
 * 
 * Ce script ajoute les données qui sont chargées dynamiquement
 * via useWebSite() mais qui n'étaient pas dans les sections.
 * 
 * TABLES REMPLIES :
 * ✅ WebSiteService (4 services)
 * ✅ WebSiteProject (projets exemples)
 * ✅ WebSiteTestimonial (témoignages exemples)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedDataTables() {
  console.log('🎯 AJOUT DES SERVICES, PROJETS ET TÉMOIGNAGES\n');
  console.log('=' .repeat(80) + '\n');

  try {
    // Récupérer le site
    const website = await prisma.webSite.findFirst({
      where: {
        organization: {
          name: '2Thier CRM'
        }
      }
    });

    if (!website) {
      throw new Error('Site 2Thier CRM introuvable');
    }

    console.log(`✅ Site trouvé: ${website.siteName} (ID: ${website.id})\n`);

    // 1️⃣ SERVICES
    console.log('🔆 Suppression des anciens services...');
    await prisma.webSiteService.deleteMany({
      where: { websiteId: website.id }
    });

    console.log('🔆 Création des services...');
    const services = [
      {
        websiteId: website.id,
        key: 'photovoltaique',
        icon: 'ThunderboltOutlined',
        title: 'Photovoltaïque',
        description: 'Installation de panneaux solaires haute performance pour réduire votre facture d\'électricité',
        features: [
          'Étude gratuite et personnalisée',
          'Garantie fabricant 25 ans',
          'Monitoring en temps réel',
          'Primes et avantages fiscaux'
        ],
        ctaText: 'En savoir plus',
        ctaUrl: '#contact',
        isActive: true,
        displayOrder: 1
      },
      {
        websiteId: website.id,
        key: 'batteries',
        icon: 'BulbOutlined',
        title: 'Batteries de Stockage',
        description: 'Stockez votre énergie solaire pour l\'utiliser jour et nuit',
        features: [
          'Autonomie énergétique maximale',
          'Compatible avec tous onduleurs',
          'Extension modulaire possible',
          'Garantie constructeur 10 ans'
        ],
        ctaText: 'En savoir plus',
        ctaUrl: '#contact',
        isActive: true,
        displayOrder: 2
      },
      {
        websiteId: website.id,
        key: 'bornes-recharge',
        icon: 'CarOutlined',
        title: 'Bornes de Recharge',
        description: 'Rechargez votre véhicule électrique facilement à domicile',
        features: [
          'Installation par électricien certifié',
          'Bornes intelligentes connectées',
          'Gestion via application mobile',
          'Primes régionales disponibles'
        ],
        ctaText: 'En savoir plus',
        ctaUrl: '#contact',
        isActive: true,
        displayOrder: 3
      },
      {
        websiteId: website.id,
        key: 'pompes-chaleur',
        icon: 'FireOutlined',
        title: 'Pompes à Chaleur',
        description: 'Chauffage et climatisation écologique et économique',
        features: [
          'Économies jusqu\'à 70% sur chauffage',
          'Solutions Air/Eau et Air/Air',
          'COP élevé supérieur à 4.0',
          'Subventions régionales importantes'
        ],
        ctaText: 'En savoir plus',
        ctaUrl: '#contact',
        isActive: true,
        displayOrder: 4
      }
    ];

    for (const service of services) {
      await prisma.webSiteService.create({ data: service });
      console.log(`  ✅ ${service.title}`);
    }

    // 2️⃣ PROJETS
    console.log('\n📸 Suppression des anciens projets...');
    await prisma.webSiteProject.deleteMany({
      where: { websiteId: website.id }
    });

    console.log('📸 Création des projets exemples...');
    const projects = [
      {
        websiteId: website.id,
        title: 'Installation 6 kWc - Charleroi',
        location: 'Charleroi, Belgique',
        details: '18 panneaux photovoltaïques haute performance avec onduleur Huawei',
        tags: ['Photovoltaïque', 'Résidentiel', '6 kWc'],
        isActive: true,
        isFeatured: true,
        displayOrder: 1,
        completedAt: new Date('2024-06-15')
      },
      {
        websiteId: website.id,
        title: 'Pompe à Chaleur - Fleurus',
        location: 'Fleurus, Belgique',
        details: 'Pompe à chaleur Air/Eau 12 kW avec ballon thermodynamique 300L',
        tags: ['Pompe à Chaleur', 'Résidentiel', '12 kW'],
        isActive: true,
        isFeatured: true,
        displayOrder: 2,
        completedAt: new Date('2024-07-20')
      },
      {
        websiteId: website.id,
        title: 'Installation 10 kWc + Batterie - Gosselies',
        location: 'Gosselies, Belgique',
        details: '30 panneaux photovoltaïques avec batterie Tesla Powerwall 13.5 kWh',
        tags: ['Photovoltaïque', 'Batterie', 'Résidentiel', '10 kWc'],
        isActive: true,
        isFeatured: true,
        displayOrder: 3,
        completedAt: new Date('2024-08-10')
      },
      {
        websiteId: website.id,
        title: 'Borne de Recharge + PV - Jumet',
        location: 'Jumet, Belgique',
        details: 'Installation photovoltaïque 8 kWc avec borne de recharge intelligente 22 kW',
        tags: ['Photovoltaïque', 'Borne de Recharge', 'Résidentiel'],
        isActive: true,
        isFeatured: true,
        displayOrder: 4,
        completedAt: new Date('2024-09-05')
      }
    ];

    for (const project of projects) {
      await prisma.webSiteProject.create({ data: project });
      console.log(`  ✅ ${project.title}`);
    }

    // 3️⃣ TÉMOIGNAGES
    console.log('\n⭐ Suppression des anciens témoignages...');
    await prisma.webSiteTestimonial.deleteMany({
      where: { websiteId: website.id }
    });

    console.log('⭐ Création des témoignages...');
    const testimonials = [
      {
        websiteId: website.id,
        customerName: 'Marc D.',
        location: 'Charleroi',
        service: 'Photovoltaïque 6 kWc',
        rating: 5,
        text: 'Installation rapide et soignée ! L\'équipe est très professionnelle et a pris le temps de tout m\'expliquer. Ma facture d\'électricité a déjà baissé de 60%. Je recommande vivement !',
        isActive: true,
        isFeatured: true,
        displayOrder: 1,
        publishedAt: new Date('2024-06-20')
      },
      {
        websiteId: website.id,
        customerName: 'Sophie L.',
        location: 'Fleurus',
        service: 'Pompe à Chaleur',
        rating: 5,
        text: 'Notre pompe à chaleur fonctionne parfaitement depuis 6 mois. Installation propre, équipe sympathique et très bon suivi. Le confort thermique est incroyable et les économies aussi !',
        isActive: true,
        isFeatured: true,
        displayOrder: 2,
        publishedAt: new Date('2024-07-25')
      },
      {
        websiteId: website.id,
        customerName: 'Jean-Pierre V.',
        location: 'Gosselies',
        service: 'Photovoltaïque + Batterie',
        rating: 5,
        text: 'Installation complète avec batterie. Maintenant je suis presque autonome ! Le monitoring est très pratique pour suivre ma production. Excellent rapport qualité/prix. Merci 2Thier !',
        isActive: true,
        isFeatured: true,
        displayOrder: 3,
        publishedAt: new Date('2024-08-15')
      },
      {
        websiteId: website.id,
        customerName: 'Isabelle R.',
        location: 'Jumet',
        service: 'Photovoltaïque + Borne',
        rating: 5,
        text: 'Parfait pour recharger ma voiture électrique avec l\'énergie solaire ! L\'équipe a bien coordonné l\'installation des panneaux et de la borne. Tout est nickel et fonctionne à merveille.',
        isActive: true,
        isFeatured: true,
        displayOrder: 4,
        publishedAt: new Date('2024-09-10')
      }
    ];

    for (const testimonial of testimonials) {
      await prisma.webSiteTestimonial.create({ data: testimonial });
      console.log(`  ✅ ${testimonial.customerName} - ${testimonial.service}`);
    }

    console.log('\n' + '=' .repeat(80));
    console.log('🎉 DONNÉES AJOUTÉES AVEC SUCCÈS !');
    console.log(`✅ ${services.length} services`);
    console.log(`✅ ${projects.length} projets`);
    console.log(`✅ ${testimonials.length} témoignages`);
    console.log('🔄 Rechargez le site pour voir les données !');
    console.log('=' .repeat(80));

  } catch (error) {
    console.error('\n❌ ERREUR:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécution
seedDataTables()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
