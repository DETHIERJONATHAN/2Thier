/**
 * 🎯 MIGRATION : Découper le site SiteVitrine2Thier en sections éditables
 * 
 * Ce script va :
 * 1. Nettoyer les anciennes sections du site "site-vitrine-2thier"
 * 2. Créer 10 sections avec le contenu exact du site actuel
 * 3. Chaque section sera éditable individuellement dans le NO-CODE builder
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Début de la migration des sections...\n');

  // 1️⃣ Trouver le site
  const website = await prisma.webSite.findFirst({
    where: { slug: 'site-vitrine-2thier' }
  });

  if (!website) {
    console.error('❌ Site "site-vitrine-2thier" non trouvé !');
    process.exit(1);
  }

  console.log(`✅ Site trouvé: ${website.siteName} (ID: ${website.id})\n`);

  // 2️⃣ Nettoyer les anciennes sections
  const deleted = await prisma.webSiteSection.deleteMany({
    where: { websiteId: website.id }
  });
  console.log(`🧹 ${deleted.count} anciennes sections supprimées\n`);

  // 3️⃣ Créer les 10 sections
  const sections = [
    // ========================================
    // 1. HEADER
    // ========================================
    {
      websiteId: website.id,
      key: 'header',
      type: 'header',
      name: '✅ Header - Menu Navigation',
      displayOrder: 1,
      isActive: true,
      isLocked: true, // Ne pas supprimer
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      content: {
        logo: {
          text: '⚡ 2THIER ENERGY',
          color: '#10b981'
        },
        navigation: [], // Vide pour l'instant
        ctaButton: {
          text: 'DEVIS GRATUIT',
          backgroundColor: '#10b981',
          borderColor: '#10b981',
          textColor: '#ffffff'
        },
        style: {
          position: 'fixed',
          top: 0,
          width: '100%',
          zIndex: 1000,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          padding: '0 24px'
        }
      }
    },

    // ========================================
    // 2. HERO
    // ========================================
    {
      websiteId: website.id,
      key: 'hero',
      type: 'hero',
      name: '🌞 Hero - Section Principale',
      displayOrder: 2,
      isActive: true,
      backgroundColor: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
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
        buttons: [
          {
            text: 'DEMANDER UN DEVIS GRATUIT',
            icon: 'RocketOutlined',
            type: 'primary',
            backgroundColor: 'white',
            borderColor: 'white',
            textColor: '#10b981',
            fontSize: '18px',
            padding: '16px 32px',
            fontWeight: 'bold'
          },
          {
            text: 'NOS RÉALISATIONS',
            type: 'default',
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderColor: 'white',
            textColor: 'white',
            fontSize: '18px',
            padding: '16px 32px'
          }
        ],
        badge: {
          text: '+500 installations réalisées • 4.9/5 de satisfaction',
          icon: 'CheckCircleOutlined',
          color: 'rgba(255,255,255,0.9)'
        },
        style: {
          minHeight: '600px',
          padding: '60px 24px',
          textAlign: 'center',
          maxWidth: '1200px'
        }
      }
    },

    // ========================================
    // 3. STATS
    // ========================================
    {
      websiteId: website.id,
      key: 'stats',
      type: 'stats',
      name: '📊 Statistiques - 4 Cartes',
      displayOrder: 3,
      isActive: true,
      backgroundColor: '#f9fafb',
      content: {
        stats: [
          {
            icon: 'HomeOutlined',
            value: '+500',
            label: 'Installations réalisées',
            color: '#10b981'
          },
          {
            icon: 'ThunderboltOutlined',
            value: '15 MW',
            label: 'Puissance installée',
            color: '#10b981'
          },
          {
            icon: 'StarFilled',
            value: '4.9/5',
            label: 'Satisfaction client',
            color: '#10b981'
          },
          {
            icon: 'EnvironmentOutlined',
            value: 'Wallonie',
            label: 'Région couverte',
            color: '#10b981'
          }
        ],
        style: {
          padding: '60px 24px',
          cardStyle: {
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            textAlign: 'center'
          },
          iconSize: '48px',
          valueSize: '32px'
        }
      }
    },

    // ========================================
    // 4. SERVICES
    // ========================================
    {
      websiteId: website.id,
      key: 'services',
      type: 'services',
      name: '🔆 Nos Solutions Énergétiques',
      displayOrder: 4,
      isActive: true,
      backgroundColor: '#ffffff',
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
        layout: {
          type: 'grid',
          columns: { xs: 24, sm: 12, md: 12, lg: 6 }, // 4 colonnes sur desktop
          gutter: [24, 24]
        },
        dataSource: 'dynamic', // Utilise WebSiteService
        cardStyle: {
          borderRadius: '12px',
          border: '2px solid #f1f5f9',
          hoverable: true,
          padding: '24px'
        },
        style: {
          padding: '80px 24px',
          maxWidth: '1400px',
          margin: '0 auto'
        }
      }
    },

    // ========================================
    // 5. VALUES (Pourquoi nous choisir)
    // ========================================
    {
      websiteId: website.id,
      key: 'values',
      type: 'content',
      name: '💚 Pourquoi Choisir 2Thier',
      displayOrder: 5,
      isActive: true,
      backgroundColor: '#f9fafb',
      content: {
        title: {
          text: '💚 Pourquoi Choisir 2Thier ?',
          fontSize: 'clamp(28px, 6vw, 42px)',
          textAlign: 'center'
        },
        layout: {
          type: 'grid',
          columns: { xs: 24, sm: 12, md: 6 },
          gutter: [32, 32]
        },
        dataSource: 'config.valuesJson', // Utilise les valeurs du WebSiteConfig
        cardStyle: {
          textAlign: 'center',
          height: '100%',
          bordered: false
        },
        style: {
          padding: '80px 24px',
          maxWidth: '1200px',
          margin: '0 auto'
        }
      }
    },

    // ========================================
    // 6. PROJECTS
    // ========================================
    {
      websiteId: website.id,
      key: 'projects',
      type: 'projects',
      name: '📸 Nos Dernières Réalisations',
      displayOrder: 6,
      isActive: true,
      backgroundColor: '#ffffff',
      content: {
        title: {
          text: '📸 Nos Dernières Réalisations',
          fontSize: 'clamp(28px, 6vw, 42px)',
          textAlign: 'center'
        },
        linkButton: {
          text: 'Voir toutes nos réalisations →',
          type: 'link',
          fontSize: '16px'
        },
        layout: {
          type: 'grid',
          columns: { xs: 24, sm: 12, md: 6 }, // 4 colonnes
          gutter: [24, 24]
        },
        dataSource: 'dynamic', // Utilise WebSiteProject
        cardStyle: {
          borderRadius: '12px',
          overflow: 'hidden',
          hoverable: true,
          coverHeight: '200px'
        },
        style: {
          padding: '80px 24px',
          maxWidth: '1400px',
          margin: '0 auto'
        }
      }
    },

    // ========================================
    // 7. TESTIMONIALS
    // ========================================
    {
      websiteId: website.id,
      key: 'testimonials',
      type: 'testimonials',
      name: '⭐ Ce Que Nos Clients Disent',
      displayOrder: 7,
      isActive: true,
      backgroundColor: '#f9fafb',
      content: {
        title: {
          text: '⭐ Ce Que Nos Clients Disent',
          fontSize: 'clamp(28px, 6vw, 42px)',
          textAlign: 'center'
        },
        carousel: {
          autoplay: true,
          dots: true
        },
        dataSource: 'dynamic', // Utilise WebSiteTestimonial
        cardStyle: {
          maxWidth: '800px',
          margin: '0 auto',
          padding: '24px',
          borderRadius: '16px'
        },
        summary: {
          text: '📊 Note moyenne : 4.9/5 sur 124 avis Google Reviews',
          linkText: 'Voir tous les avis sur Google →'
        },
        style: {
          padding: '80px 24px',
          maxWidth: '1200px',
          margin: '0 auto'
        }
      }
    },

    // ========================================
    // 8. PROCESS
    // ========================================
    {
      websiteId: website.id,
      key: 'process',
      type: 'steps',
      name: '🚀 Votre Projet en 5 Étapes',
      displayOrder: 8,
      isActive: true,
      backgroundColor: '#ffffff',
      content: {
        title: {
          text: '🚀 Votre Projet en 5 Étapes',
          fontSize: 'clamp(28px, 6vw, 42px)',
          textAlign: 'center'
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
        stepsProps: {
          current: -1,
          responsive: true
        },
        style: {
          padding: '80px 24px',
          maxWidth: '1200px',
          margin: '0 auto'
        }
      }
    },

    // ========================================
    // 9. CTA FINAL
    // ========================================
    {
      websiteId: website.id,
      key: 'cta-final',
      type: 'cta',
      name: '🌟 CTA Final - Appel à Action',
      displayOrder: 9,
      isActive: true,
      backgroundColor: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      content: {
        title: {
          text: '🌟 Prêt à Passer à l\'Énergie Verte ?',
          color: 'white',
          fontSize: '32px'
        },
        subtitle: {
          text: 'Demandez votre devis gratuit et sans engagement\nRéponse sous 24h garantie',
          color: 'rgba(255,255,255,0.95)',
          fontSize: '18px'
        },
        buttons: [
          {
            text: '071/XX.XX.XX',
            icon: 'PhoneOutlined',
            type: 'primary',
            backgroundColor: 'white',
            borderColor: 'white',
            textColor: '#10b981',
            fontSize: '18px',
            padding: '16px 32px',
            fontWeight: 'bold'
          },
          {
            text: 'DEVIS EN LIGNE',
            icon: 'MailOutlined',
            type: 'default',
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderColor: 'white',
            textColor: 'white',
            fontSize: '18px',
            padding: '16px 32px'
          }
        ],
        address: {
          text: 'Route de Gosselies 23, 6220 Fleurus (Charleroi)',
          icon: 'EnvironmentOutlined',
          color: 'rgba(255,255,255,0.9)'
        },
        style: {
          padding: '80px 24px',
          textAlign: 'center',
          maxWidth: '800px',
          margin: '0 auto'
        }
      }
    },

    // ========================================
    // 10. FOOTER
    // ========================================
    {
      websiteId: website.id,
      key: 'footer',
      type: 'footer',
      name: '🦶 Footer - Pied de page',
      displayOrder: 10,
      isActive: true,
      isLocked: true, // Ne pas supprimer
      backgroundColor: '#1f2937',
      textColor: 'white',
      content: {
        columns: [
          {
            title: '2THIER ENERGY',
            titleColor: 'white',
            content: {
              type: 'text',
              text: 'Votre partenaire en transition énergétique depuis 2020',
              color: '#9ca3af'
            }
          },
          {
            title: 'Solutions',
            titleColor: 'white',
            content: {
              type: 'links',
              links: [
                { text: 'Photovoltaïque', url: '#', color: '#9ca3af' },
                { text: 'Batteries', url: '#', color: '#9ca3af' },
                { text: 'Bornes de Recharge', url: '#', color: '#9ca3af' },
                { text: 'Pompes à Chaleur', url: '#', color: '#9ca3af' }
              ]
            }
          },
          {
            title: 'Entreprise',
            titleColor: 'white',
            content: {
              type: 'links',
              links: [
                { text: 'À propos', url: '#', color: '#9ca3af' },
                { text: 'Réalisations', url: '#', color: '#9ca3af' },
                { text: 'Blog', url: '#', color: '#9ca3af' },
                { text: 'Contact', url: '#', color: '#9ca3af' }
              ]
            }
          },
          {
            title: 'Contact',
            titleColor: 'white',
            content: {
              type: 'text',
              lines: [
                { text: '071/XX.XX.XX', color: '#9ca3af' },
                { text: 'info@2thier.be', color: '#9ca3af' },
                { text: 'Lu-Ve: 8h-18h', color: '#9ca3af' }
              ]
            }
          }
        ],
        copyright: {
          text: '© 2025 2Thier Energy - Tous droits réservés • BE 0XXX.XXX.XXX • Agrégation Classe 1 • RESCERT Certifié',
          color: '#6b7280',
          fontSize: '14px',
          textAlign: 'center'
        },
        style: {
          padding: '60px 24px 24px',
          maxWidth: '1200px',
          margin: '0 auto',
          dividerColor: '#374151'
        }
      }
    }
  ];

  // 4️⃣ Insérer toutes les sections
  let created = 0;
  for (const section of sections) {
    await prisma.webSiteSection.create({
      data: section as any
    });
    console.log(`✅ Créé: ${section.name}`);
    created++;
  }

  console.log(`\n🎉 Migration terminée ! ${created} sections créées.\n`);
  console.log('📍 Rendez-vous sur http://localhost:5173/admin/sites-web');
  console.log('   → Cliquez sur "Éditer" pour "2Thier SRL"');
  console.log('   → Onglet "🎨 Sections (NO-CODE)"');
  console.log('   → Vous verrez les 10 sections éditables ! 🚀\n');
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
