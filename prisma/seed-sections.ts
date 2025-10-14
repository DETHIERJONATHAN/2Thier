/**
 * Script de seed pour créer les sections du Site Vitrine 2Thier
 * Initialise la structure complète du site avec toutes les sections
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedSections() {
  console.log('🎨 Seeding sections pour Site Vitrine 2Thier...');

  // Trouver le site "Site Vitrine 2Thier"
  const website = await prisma.webSite.findFirst({
    where: { slug: 'site-vitrine-2thier' }
  });

  if (!website) {
    console.error('❌ Site "site-vitrine-2thier" introuvable. Exécutez d\'abord le seed des websites.');
    return;
  }

  // Supprimer les sections existantes (pour re-seed)
  await prisma.webSiteSection.deleteMany({
    where: { websiteId: website.id }
  });

  const sections = [
    // 1. HEADER
    {
      websiteId: website.id,
      key: 'header',
      type: 'header',
      name: 'Header principal',
      content: {
        logo: '/assets/logo-2thier.png',
        siteName: '2Thier Énergies',
        tagline: 'Votre transition énergétique',
        menuItems: [
          { label: 'Accueil', url: '#accueil' },
          { label: 'Services', url: '#services' },
          { label: 'Réalisations', url: '#realisations' },
          { label: 'Témoignages', url: '#temoignages' },
          { label: 'Contact', url: '#contact' }
        ],
        ctaButton: 'Devis gratuit',
        ctaButtonUrl: '/contact',
        ctaButtonColor: '#10b981',
        phone: '+32 XXX XX XX XX',
        email: 'contact@2thier.be'
      },
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      displayOrder: 1,
      isActive: true,
      isLocked: true // Ne peut pas être supprimé
    },

    // 2. HERO SECTION
    {
      websiteId: website.id,
      key: 'hero',
      type: 'hero',
      name: 'Hero principal',
      content: {
        title: 'Votre partenaire en transition énergétique',
        subtitle: 'Solutions photovoltaïques sur mesure pour particuliers et professionnels en Belgique',
        backgroundImage: '/assets/hero-solar-panels.jpg',
        backgroundOverlay: 0.5,
        alignment: 'center',
        buttons: [
          { label: 'Demander un devis gratuit', url: '/contact', style: 'primary' },
          { label: 'Découvrir nos services', url: '#services', style: 'secondary' }
        ],
        badge: '🏆 N°1 en transition énergétique'
      },
      backgroundColor: '#1e3a8a',
      textColor: '#ffffff',
      displayOrder: 2,
      isActive: true,
      isLocked: false
    },

    // 3. STATS SECTION
    {
      websiteId: website.id,
      key: 'stats',
      type: 'stats',
      name: 'Statistiques',
      content: {
        title: 'Nos réalisations en chiffres',
        subtitle: 'Plus de 10 ans d\'expérience à votre service',
        stats: [
          { icon: '🏠', value: '500+', label: 'Maisons équipées', suffix: '' },
          { icon: '⚡', value: '15', label: 'Mégawatts installés', suffix: 'MW' },
          { icon: '⭐', value: '4.9', label: 'Note moyenne', suffix: '/5' },
          { icon: '📍', value: '5', label: 'Régions couvertes', suffix: '' }
        ]
      },
      backgroundColor: '#f9fafb',
      textColor: '#111827',
      displayOrder: 3,
      isActive: true,
      isLocked: false
    },

    // 4. POURQUOI CHOISIR 2THIER
    {
      websiteId: website.id,
      key: 'why-choose',
      type: 'content',
      name: 'Pourquoi choisir 2Thier',
      content: {
        title: 'Pourquoi choisir 2Thier ?',
        subtitle: 'Une expertise reconnue depuis 2014',
        layout: '3-columns',
        alignment: 'center',
        columns: [
          {
            icon: '✓',
            title: 'Expertise reconnue',
            description: 'Plus de 10 ans d\'expérience dans le photovoltaïque résidentiel et professionnel'
          },
          {
            icon: '✓',
            title: 'Service complet',
            description: 'De l\'étude de faisabilité à la maintenance, nous vous accompagnons à chaque étape'
          },
          {
            icon: '✓',
            title: 'Qualité garantie',
            description: 'Matériaux premium, installation certifiée et garanties étendues'
          }
        ]
      },
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      displayOrder: 4,
      isActive: true,
      isLocked: false
    },

    // 5. VOS PROJETS EN 5 ÉTAPES
    {
      websiteId: website.id,
      key: 'process',
      type: 'content',
      name: 'Processus en 5 étapes',
      content: {
        title: 'Vos projets en 5 étapes',
        subtitle: 'Un accompagnement sur mesure du début à la fin',
        layout: '5-columns',
        alignment: 'center',
        columns: [
          {
            icon: '1️⃣',
            title: 'Audit énergétique',
            description: 'Analyse de votre consommation et faisabilité'
          },
          {
            icon: '2️⃣',
            title: 'Devis personnalisé',
            description: 'Proposition technique et financière détaillée'
          },
          {
            icon: '3️⃣',
            title: 'Installation',
            description: 'Pose professionnelle par nos équipes certifiées'
          },
          {
            icon: '4️⃣',
            title: 'Mise en service',
            description: 'Activation et formation à l\'utilisation'
          },
          {
            icon: '5️⃣',
            title: 'Suivi',
            description: 'Maintenance et optimisation continues'
          }
        ]
      },
      backgroundColor: '#f9fafb',
      textColor: '#111827',
      displayOrder: 5,
      isActive: true,
      isLocked: false
    },

    // 6. CTA "PRÊT À PASSER À L'AVENIR VERT"
    {
      websiteId: website.id,
      key: 'cta-avenir-vert',
      type: 'cta',
      name: 'CTA Avenir Vert',
      content: {
        title: 'Prêt à passer à l\'avenir vert ?',
        description: 'Obtenez votre devis personnalisé en quelques clics et rejoignez les 500+ familles déjà équipées',
        alignment: 'center',
        size: 'large',
        buttons: [
          { label: '📞 Demander un devis gratuit', url: '/contact', icon: '📞' }
        ],
        phoneNumber: '+32 XXX XX XX XX'
      },
      backgroundColor: '#dc2626',
      textColor: '#ffffff',
      displayOrder: 6,
      isActive: true,
      isLocked: false
    },

    // 7. FOOTER
    {
      websiteId: website.id,
      key: 'footer',
      type: 'footer',
      name: 'Footer principal',
      content: {
        logo: '/assets/logo-2thier-white.png',
        companyName: '2Thier Énergies',
        description: 'Votre partenaire en transition énergétique depuis 2014. Solutions photovoltaïques, bornes de recharge et pompes à chaleur.',
        address: 'Rue de l\'Exemple 123, 1000 Bruxelles, Belgique',
        phone: '+32 XXX XX XX XX',
        email: 'contact@2thier.be',
        linkGroups: [
          {
            title: 'Services',
            links: [
              { label: 'Panneaux photovoltaïques', url: '/services/photovoltaique' },
              { label: 'Bornes de recharge', url: '/services/bornes' },
              { label: 'Pompes à chaleur', url: '/services/pompes' },
              { label: 'Maintenance', url: '/services/maintenance' }
            ]
          },
          {
            title: 'Entreprise',
            links: [
              { label: 'À propos', url: '/a-propos' },
              { label: 'Réalisations', url: '/realisations' },
              { label: 'Témoignages', url: '/temoignages' },
              { label: 'Contact', url: '/contact' }
            ]
          },
          {
            title: 'Légal',
            links: [
              { label: 'Mentions légales', url: '/mentions-legales' },
              { label: 'Politique de confidentialité', url: '/confidentialite' },
              { label: 'Conditions générales', url: '/cgv' }
            ]
          }
        ],
        socialLinks: [
          { platform: 'Facebook', icon: 'facebook', url: 'https://facebook.com/2thier' },
          { platform: 'LinkedIn', icon: 'linkedin', url: 'https://linkedin.com/company/2thier' },
          { platform: 'Instagram', icon: 'instagram', url: 'https://instagram.com/2thier' }
        ],
        copyrightText: '© 2025 2Thier Énergies. Tous droits réservés.'
      },
      backgroundColor: '#1f2937',
      textColor: '#f9fafb',
      displayOrder: 7,
      isActive: true,
      isLocked: true // Ne peut pas être supprimé
    }
  ];

  // Créer toutes les sections
  for (const section of sections) {
    await prisma.webSiteSection.create({
      data: section
    });
    console.log(`  ✅ Section créée: ${section.name}`);
  }

  console.log('🎉 Sections créées avec succès !');
}

seedSections()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
