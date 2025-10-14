/**
 * 🔧 CORRECTEUR COMPLET DE TOUTES LES SECTIONS
 * 
 * Ce script corrige TOUTES les sections du site pour qu'elles matchent leurs schemas.
 * Fini les demi-mesures, on corrige TOUT d'un coup !
 * 
 * SECTIONS CORRIGÉES :
 * ✅ Header
 * ✅ Hero
 * ✅ Stats
 * ✅ Services
 * ✅ Testimonials
 * ✅ CTA
 * ✅ Footer
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixAllSections() {
  console.log('🔧 CORRECTION COMPLÈTE DE TOUTES LES SECTIONS\n');
  console.log('=' .repeat(60) + '\n');

  try {
    // Récupérer le site 2Thier CRM
    const website = await prisma.webSite.findFirst({
      where: {
        organization: {
          name: '2Thier CRM'
        }
      },
      include: {
        sections: true
      }
    });

    if (!website) {
      console.log('❌ Site 2Thier CRM introuvable');
      return;
    }

    console.log(`✅ Site trouvé: ${website.siteName} (${website.sections.length} sections)\n`);

    // 🔧 HEADER
    await fixHeaderSection(website.id);

    // 🔧 HERO
    await fixHeroSection(website.id);

    // 🔧 STATS
    await fixStatsSection(website.id);

    // 🔧 SERVICES
    await fixServicesSection(website.id);

    // 🔧 TESTIMONIALS
    await fixTestimonialsSection(website.id);

    // 🔧 CTA
    await fixCtaSection(website.id);

    // 🔧 FOOTER
    await fixFooterSection(website.id);

    console.log('\n' + '=' .repeat(60));
    console.log('✅ TOUTES LES SECTIONS ONT ÉTÉ CORRIGÉES !');
    console.log('🔄 Rechargez l\'éditeur pour voir les changements.');

  } catch (error) {
    console.error('❌ Erreur:', error);
    throw error;
  }
}

// ==================== HEADER ====================
async function fixHeaderSection(websiteId: number) {
  console.log('📐 HEADER...');

  const section = await prisma.webSiteSection.findFirst({
    where: { websiteId, type: 'header' }
  });

  if (!section) {
    console.log('  ⚠️  Section Header introuvable\n');
    return;
  }

  const oldContent = section.content as any;

  const newContent = {
    // Logo
    logo: {
      type: oldContent.logo?.type || 'text',
      text: oldContent.logo?.text || '⚡ 2THIER ENERGY',
      color: oldContent.logo?.color || '#10b981',
      fontSize: oldContent.logo?.fontSize || '24px',
      emoji: oldContent.logo?.emoji,
      url: oldContent.logo?.url,
      alt: oldContent.logo?.alt
    },

    // Navigation
    navigation: {
      links: oldContent.navigation?.links || [
        { text: 'Accueil', href: '#home' },
        { text: 'Solutions', href: '#services' },
        { text: 'Réalisations', href: '#projects' },
        { text: 'Avis Clients', href: '#testimonials' },
        { text: 'Contact', href: '#contact' }
      ]
    },

    // CTA Button
    cta: oldContent.cta ? {
      text: oldContent.cta.text || 'DEVIS GRATUIT',
      href: oldContent.cta.href || '#contact',
      buttonType: oldContent.cta.buttonType || 'primary',
      buttonSize: oldContent.cta.buttonSize || 'large',
      style: oldContent.cta.style || {}
    } : null,

    // Behavior
    behavior: {
      sticky: true,
      hideOnScroll: false,
      transparentInitial: false
    },

    // Style
    style: {
      position: oldContent.style?.position || 'fixed',
      top: oldContent.style?.top || 0,
      zIndex: oldContent.style?.zIndex || 1000,
      backgroundColor: oldContent.style?.backgroundColor || 'rgba(255, 255, 255, 0.98)',
      backdropFilter: oldContent.style?.backdropFilter || 'blur(10px)',
      boxShadow: oldContent.style?.boxShadow || '0 2px 8px rgba(0,0,0,0.06)',
      padding: oldContent.style?.padding || '16px 48px',
      color: oldContent.style?.color || '#000000'
    }
  };

  await prisma.webSiteSection.update({
    where: { id: section.id },
    data: { content: newContent }
  });

  console.log('  ✅ Header corrigé\n');
}

// ==================== HERO ====================
async function fixHeroSection(websiteId: number) {
  console.log('🚀 HERO...');

  const section = await prisma.webSiteSection.findFirst({
    where: { websiteId, type: 'hero' }
  });

  if (!section) {
    console.log('  ⚠️  Section Hero introuvable\n');
    return;
  }

  const oldContent = section.content as any;

  const newContent = {
    layout: 'centered',

    content: {
      surtitle: '',
      title: oldContent.title?.text || oldContent.content?.title || '🌞 Votre Partenaire en Transition Énergétique',
      subtitle: oldContent.subtitle?.text || oldContent.content?.subtitle || 'Photovoltaïque • Batteries • Bornes de Recharge',
      highlight: [
        { icon: 'CheckCircleOutlined', text: '+500 installations réalisées' },
        { icon: 'StarFilled', text: '4.9/5 de satisfaction' },
        { icon: 'SafetyOutlined', text: 'Garantie 25 ans' }
      ]
    },

    ctaButtons: [
      {
        text: oldContent.primaryButton?.text || 'DEMANDER UN DEVIS GRATUIT',
        url: oldContent.primaryButton?.href || '#contact',
        icon: oldContent.primaryButton?.icon || 'RocketOutlined',
        style: 'primary',
        size: 'large'
      },
      {
        text: oldContent.secondaryButton?.text || 'NOS RÉALISATIONS',
        url: oldContent.secondaryButton?.href || '#projects',
        icon: 'EyeOutlined',
        style: 'secondary',
        size: 'large'
      }
    ],

    media: {
      type: 'image',
      image: oldContent.backgroundImage || '',
      alt: 'Panneaux solaires sur toit'
    },

    overlay: {
      enabled: true,
      color: '#000000',
      opacity: 40,
      gradient: false
    },

    style: {
      backgroundColor: oldContent.style?.background || '#10b981',
      textColor: oldContent.title?.color || '#ffffff',
      titleColor: oldContent.title?.color || '#ffffff',
      height: 'screen',
      padding: oldContent.style?.padding || '80px 24px',
      maxWidth: '1200px',
      alignment: 'center'
    },

    typography: {
      titleSize: oldContent.title?.fontSize || '48px',
      titleWeight: '700',
      subtitleSize: oldContent.subtitle?.fontSize || '18px',
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
  };

  await prisma.webSiteSection.update({
    where: { id: section.id },
    data: { content: newContent }
  });

  console.log('  ✅ Hero corrigé\n');
}

// ==================== STATS ====================
async function fixStatsSection(websiteId: number) {
  console.log('📊 STATS...');

  const section = await prisma.webSiteSection.findFirst({
    where: { websiteId, type: 'stats' }
  });

  if (!section) {
    console.log('  ⚠️  Section Stats introuvable\n');
    return;
  }

  const oldContent = section.content as any;

  const newContent = {
    title: oldContent.title || '',
    subtitle: oldContent.subtitle || '',
    
    items: oldContent.items || [
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
      backgroundColor: oldContent.style?.backgroundColor || '#f9fafb',
      padding: oldContent.style?.padding || '60px 24px',
      textColor: '#111827',
      valueColor: '#10b981'
    },

    animations: {
      enabled: true,
      countUp: true,
      duration: 2000
    }
  };

  await prisma.webSiteSection.update({
    where: { id: section.id },
    data: { content: newContent }
  });

  console.log('  ✅ Stats corrigé\n');
}

// ==================== SERVICES ====================
async function fixServicesSection(websiteId: number) {
  console.log('🔆 SERVICES...');

  const section = await prisma.webSiteSection.findFirst({
    where: { websiteId, type: 'services' }
  });

  if (!section) {
    console.log('  ⚠️  Section Services introuvable\n');
    return;
  }

  const oldContent = section.content as any;

  const newContent = {
    title: oldContent.title || { text: '🔆 Nos Solutions Énergétiques', fontSize: '42px' },
    subtitle: oldContent.subtitle || { text: 'Un écosystème complet pour votre autonomie énergétique', fontSize: '18px' },
    
    items: oldContent.items || [
      {
        icon: { name: 'ThunderboltOutlined' },
        title: 'Photovoltaïque',
        description: 'Installation de panneaux solaires haute performance',
        features: ['Étude gratuite', 'Garantie 25 ans', 'Monitoring temps réel', 'Primes & fiscales'],
        button: { text: 'En savoir plus', href: '#contact' }
      }
    ],

    layout: {
      columns: 4,
      gap: '24px',
      cardStyle: 'modern'
    },

    style: {
      padding: oldContent.style?.padding || '80px 24px',
      backgroundColor: '#ffffff',
      textColor: '#111827'
    },

    animations: {
      enabled: true,
      cardHover: true,
      stagger: true
    }
  };

  await prisma.webSiteSection.update({
    where: { id: section.id },
    data: { content: newContent }
  });

  console.log('  ✅ Services corrigé\n');
}

// ==================== TESTIMONIALS ====================
async function fixTestimonialsSection(websiteId: number) {
  console.log('⭐ TESTIMONIALS...');

  const section = await prisma.webSiteSection.findFirst({
    where: { websiteId, type: 'testimonials' }
  });

  if (!section) {
    console.log('  ⚠️  Section Testimonials introuvable\n');
    return;
  }

  const oldContent = section.content as any;

  const newContent = {
    title: oldContent.title || { text: '⭐ Ce Que Disent Nos Clients', fontSize: '42px' },
    subtitle: oldContent.subtitle || { text: '4.9/5 sur Google Reviews', fontSize: '18px' },
    
    items: oldContent.items || [],

    layout: {
      type: 'carousel',
      itemsPerView: 1,
      autoplay: true,
      autoplaySpeed: 5000
    },

    style: {
      backgroundColor: oldContent.style?.backgroundColor || '#f9fafb',
      padding: oldContent.style?.padding || '80px 24px',
      cardBackground: '#ffffff'
    },

    animations: {
      enabled: true,
      transition: 'slide'
    }
  };

  await prisma.webSiteSection.update({
    where: { id: section.id },
    data: { content: newContent }
  });

  console.log('  ✅ Testimonials corrigé\n');
}

// ==================== CTA ====================
async function fixCtaSection(websiteId: number) {
  console.log('📣 CTA...');

  const section = await prisma.webSiteSection.findFirst({
    where: { websiteId, type: 'cta' }
  });

  if (!section) {
    console.log('  ⚠️  Section CTA introuvable\n');
    return;
  }

  const oldContent = section.content as any;

  const newContent = {
    title: oldContent.title || 'Prêt à Passer à l\'Énergie Solaire ?',
    subtitle: oldContent.subtitle || 'Obtenez votre devis gratuit en 2 minutes',

    primaryButton: oldContent.primaryButton ? {
      text: oldContent.primaryButton.text || 'OBTENIR MON DEVIS',
      href: oldContent.primaryButton.href || '#contact',
      icon: oldContent.primaryButton.icon,
      size: 'large',
      style: oldContent.primaryButton.style || {}
    } : null,

    secondaryButton: oldContent.secondaryButton ? {
      text: oldContent.secondaryButton.text || 'Nous Appeler',
      href: oldContent.secondaryButton.href || 'tel:071123456',
      icon: oldContent.secondaryButton.icon,
      size: 'large',
      style: oldContent.secondaryButton.style || {}
    } : null,

    media: {
      type: oldContent.media?.type || 'none',
      url: oldContent.media?.url,
      overlay: true
    },

    style: {
      background: oldContent.style?.background || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: oldContent.style?.padding || '120px 48px',
      textColor: '#ffffff',
      titleColor: '#ffffff'
    },

    animations: {
      enabled: true,
      pulse: true
    }
  };

  await prisma.webSiteSection.update({
    where: { id: section.id },
    data: { content: newContent }
  });

  console.log('  ✅ CTA corrigé\n');
}

// ==================== FOOTER ====================
async function fixFooterSection(websiteId: number) {
  console.log('🦶 FOOTER...');

  const section = await prisma.webSiteSection.findFirst({
    where: { websiteId, type: 'footer' }
  });

  if (!section) {
    console.log('  ⚠️  Section Footer introuvable\n');
    return;
  }

  const oldContent = section.content as any;

  const newContent = {
    logo: {
      type: oldContent.logo?.type || 'text',
      text: oldContent.logo?.text || '⚡ 2THIER ENERGY',
      emoji: oldContent.logo?.emoji,
      url: oldContent.logo?.url,
      description: oldContent.logo?.description || '2Thier Energy, votre partenaire en transition énergétique'
    },

    columns: oldContent.columns || [
      {
        title: 'Solutions',
        links: [
          { label: 'Photovoltaïque', url: '#' },
          { label: 'Batteries', url: '#' },
          { label: 'Bornes de recharge', url: '#' },
          { label: 'Pompes à chaleur', url: '#' }
        ]
      },
      {
        title: 'Entreprise',
        links: [
          { label: 'À propos', url: '#' },
          { label: 'Réalisations', url: '#' },
          { label: 'Avis clients', url: '#' },
          { label: 'Contact', url: '#' }
        ]
      },
      {
        title: 'Légal',
        links: [
          { label: 'Mentions légales', url: '#' },
          { label: 'Politique de confidentialité', url: '#' },
          { label: 'CGV', url: '#' }
        ]
      }
    ],

    social: oldContent.social || [],

    copyright: oldContent.copyright || `© ${new Date().getFullYear()} 2Thier Energy. Tous droits réservés.`,

    style: {
      background: oldContent.style?.background || '#1a1a2e',
      color: oldContent.style?.color || '#ffffff',
      padding: oldContent.style?.padding || '80px 48px 48px'
    }
  };

  await prisma.webSiteSection.update({
    where: { id: section.id },
    data: { content: newContent }
  });

  console.log('  ✅ Footer corrigé\n');
}

// ==================== EXÉCUTION ====================
fixAllSections()
  .then(() => {
    console.log('\n🎉 TERMINÉ AVEC SUCCÈS !');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 ERREUR FATALE:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
