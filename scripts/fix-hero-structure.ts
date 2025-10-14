/**
 * 🔧 CORRECTEUR DE STRUCTURE HERO
 * 
 * Le seed initial ne suivait pas la structure du schema Hero.
 * Ce script corrige les données existantes pour matcher le schema.
 * 
 * PROBLÈME :
 * - Seed enregistre : { title: { text: "...", color: "..." }, subtitle: {...} }
 * - Schema attend : { content: { title: "...", subtitle: "..." }, ctaButtons: [...] }
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixHeroStructure() {
  console.log('🔧 Correction de la structure Hero...\n');

  // Récupérer la section Hero
  const heroSection = await prisma.webSiteSection.findFirst({
    where: {
      type: 'hero',
      website: {
        organization: {
          name: '2Thier CRM'
        }
      }
    }
  });

  if (!heroSection) {
    console.log('❌ Section Hero introuvable');
    return;
  }

  console.log('✅ Section Hero trouvée:', heroSection.name);
  console.log('📦 Contenu actuel:', JSON.stringify(heroSection.content, null, 2));

  // Extraire les données actuelles (structure incorrecte)
  const oldContent = heroSection.content as any;

  // Nouvelle structure conforme au schema
  const newContent = {
    // Layout
    layout: 'centered',
    
    // Groupe Content
    content: {
      surtitle: '',
      title: oldContent.title?.text || 'Votre partenaire en <strong>énergie solaire</strong>',
      subtitle: oldContent.subtitle?.text || 'Installation de panneaux photovoltaïques pour particuliers et entreprises.',
      highlight: [
        { icon: 'CheckCircleOutlined', text: '+500 installations réalisées' },
        { icon: 'StarFilled', text: '4.9/5 de satisfaction' },
        { icon: 'SafetyOutlined', text: 'Garantie 25 ans' }
      ]
    },
    
    // Boutons CTA
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
        icon: oldContent.secondaryButton?.icon || 'EyeOutlined',
        style: 'secondary',
        size: 'large'
      }
    ],
    
    // Media
    media: {
      type: 'image',
      image: oldContent.backgroundImage || '',
      alt: 'Panneaux solaires sur toit'
    },
    
    // Overlay
    overlay: {
      enabled: true,
      color: '#000000',
      opacity: 40,
      gradient: false
    },
    
    // Style
    style: {
      backgroundColor: oldContent.style?.background || '#10b981',
      textColor: oldContent.title?.color || '#ffffff',
      titleColor: oldContent.title?.color || '#ffffff',
      height: 'screen',
      padding: oldContent.style?.padding || '80px 24px',
      maxWidth: '1200px',
      alignment: 'center'
    },
    
    // Typography
    typography: {
      titleSize: oldContent.title?.fontSize || '48px',
      titleWeight: '700',
      subtitleSize: oldContent.subtitle?.fontSize || '18px',
      lineHeight: 1.5
    },
    
    // Animations
    animations: {
      enabled: true,
      titleAnimation: 'fadeInUp',
      delay: 100
    },
    
    // Responsive
    responsive: {
      mobileTitleSize: '32px',
      mobileSubtitleSize: '16px',
      mobileLayout: 'stacked',
      hideHighlightsOnMobile: false
    }
  };

  console.log('\n📝 Nouvelle structure:', JSON.stringify(newContent, null, 2));

  // Mettre à jour la section
  await prisma.webSiteSection.update({
    where: { id: heroSection.id },
    data: {
      content: newContent
    }
  });

  console.log('\n✅ Section Hero mise à jour avec succès !');
  console.log('🔄 Rechargez l\'éditeur pour voir les changements.');
}

fixHeroStructure()
  .then(() => {
    console.log('\n✨ Correction terminée !');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erreur:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
