/**
 * 💬 SCHÉMA TESTIMONIALS
 * 
 * Section de témoignages clients avec photos et citations.
 * Idéal pour afficher la preuve sociale et la satisfaction client.
 * 
 * FONCTIONNALITÉS :
 * - Citations clients avec photos
 * - Notation par étoiles
 * - Fonction/entreprise
 * - Carousel ou grille
 * - Animations au scroll
 * 
 * @module site/schemas/testimonials
 * @author 2Thier CRM Team
 */

import { SectionSchema } from './types';

export const testimonialsSchema: SectionSchema = {
  type: 'testimonials',
  name: '💬 Témoignages Clients',
  icon: '💬',
  description: 'Avis et témoignages de clients satisfaits',
  category: 'marketing',
  aiEnabled: true,
  
  aiContext: {
    businessType: ['technology', 'energy', 'services'],
    keywords: ['testimonials', 'reviews', 'satisfaction'],
    tone: ['authentic', 'positive']
  },
  
  fields: [
    // ==================== CONTENU ====================
    {
      id: 'title',
      type: 'text',
      label: '📋 Titre de la section',
      default: 'Ils nous font confiance',
      required: true,
      options: {
        aiSuggest: true,
        aiContext: 'section_title'
      }
    },
    
    {
      id: 'subtitle',
      type: 'textarea',
      label: '📄 Sous-titre',
      default: 'Découvrez les retours d\'expérience de nos clients',
      options: {
        aiSuggest: true,
        aiContext: 'section_subtitle'
      }
    },
    
    // ==================== NOTE MOYENNE ====================
    {
      id: 'showAverageRating',
      type: 'boolean',
      label: '⭐ Afficher la note moyenne',
      default: true
    },
    
    {
      id: 'averageRating',
      type: 'text',
      label: 'Note moyenne',
      default: '4.9',
      condition: (values) => values.showAverageRating === true
    },
    
    {
      id: 'totalReviews',
      type: 'number',
      label: 'Nombre total d\'avis',
      default: 124,
      condition: (values) => values.showAverageRating === true
    },
    
    {
      id: 'googleReviewsLink',
      type: 'text',
      label: 'Lien vers Google Reviews',
      default: '',
      description: 'URL vers votre page Google Reviews',
      condition: (values) => values.showAverageRating === true
    },
    
    // ==================== TÉMOIGNAGES ====================
    {
      id: 'items',
      type: 'array',
      label: '💬 Liste des Témoignages',
      description: 'Glissez-déposez pour réorganiser',
      default: [
        {
          name: 'Sophie Martin',
          role: 'Particulier',
          company: 'Bruxelles',
          avatar: '',
          rating: 5,
          quote: 'Installation rapide et professionnelle. Nous avons déjà constaté une baisse de 65% sur notre facture d\'électricité !',
          featured: true
        },
        {
          name: 'Jean Dupont',
          role: 'Gérant',
          company: 'PME Industrielle',
          avatar: '',
          rating: 5,
          quote: 'Excellent accompagnement du début à la fin. L\'équipe est compétente et à l\'écoute.',
          featured: false
        },
        {
          name: 'Marie Durand',
          role: 'Propriétaire',
          company: 'Liège',
          avatar: '',
          rating: 5,
          quote: 'Je recommande vivement ! Service impeccable et résultats au-delà de nos attentes.',
          featured: false
        }
      ],
      options: {
        draggable: true,
        maxItems: 20,
        itemType: {
          customerName: {
            id: 'customerName',
            type: 'text',
            label: 'Nom du client',
            required: true,
            options: {
              aiSuggest: true,
              aiContext: 'person_name'
            }
          },
          service: {
            id: 'service',
            type: 'text',
            label: 'Service utilisé',
            default: '',
            options: {
              aiSuggest: true,
              aiContext: 'service_name'
            }
          },
          location: {
            id: 'location',
            type: 'text',
            label: 'Localisation',
            default: ''
          },
          date: {
            id: 'date',
            type: 'text',
            label: 'Date',
            default: ''
          },
          rating: {
            id: 'rating',
            type: 'slider',
            label: 'Note (étoiles)',
            default: 5,
            options: {
              min: 1,
              max: 5,
              step: 1
            }
          },
          text: {
            id: 'text',
            type: 'textarea',
            label: 'Témoignage',
            required: true,
            options: {
              aiSuggest: true,
              aiContext: 'testimonial_text'
            }
          }
        },
        aiSuggest: true
      }
    },
    
    // ==================== LAYOUT ====================
    {
      id: 'layout',
      type: 'group',
      label: '📐 Disposition',
      options: {
        collapsible: true,
        fields: [
          {
            id: 'displayMode',
            type: 'select',
            label: 'Mode d\'affichage',
            default: 'grid',
            options: {
              choices: [
                { label: '🎞️ Carousel', value: 'carousel' },
                { label: '🔲 Grille', value: 'grid' },
                { label: '📋 Liste', value: 'list' }
              ]
            }
          },
          {
            id: 'grid',
            type: 'grid',
            label: 'Configuration grille',
            default: {
              columns: { mobile: 1, tablet: 2, desktop: 3 },
              gap: '24px',
              alignment: 'stretch',
              justifyContent: 'start'
            },
            options: {
              responsive: true
            },
            condition: (values) => values.layout?.displayMode === 'grid'
          },
          {
            id: 'cardStyle',
            type: 'select',
            label: 'Style des cards',
            default: 'elevated',
            options: {
              choices: [
                { label: '🏔️ Élevé (ombre)', value: 'elevated' },
                { label: '🔲 Contour', value: 'outlined' },
                { label: '📄 Plat', value: 'flat' }
              ]
            }
          }
        ]
      }
    },
    
    // ==================== STYLE ====================
    {
      id: 'style',
      type: 'group',
      label: '🎨 Style',
      options: {
        collapsible: true,
        fields: [
          {
            id: 'backgroundColor',
            type: 'color',
            label: 'Couleur de fond',
            default: '#f9fafb'
          },
          {
            id: 'titleColor',
            type: 'color',
            label: 'Couleur du titre',
            default: '#111827'
          },
          {
            id: 'cardBackground',
            type: 'color',
            label: 'Fond des cards',
            default: '#ffffff'
          },
          {
            id: 'quoteColor',
            type: 'color',
            label: 'Couleur du texte',
            default: '#374151'
          },
          {
            id: 'nameColor',
            type: 'color',
            label: 'Couleur du nom',
            default: '#111827'
          },
          {
            id: 'ratingColor',
            type: 'color',
            label: 'Couleur des étoiles',
            default: '#faad14',
            description: 'Couleur exacte : #faad14 (jaune Ant Design)'
          },
          {
            id: 'cardMaxWidth',
            type: 'size',
            label: 'Largeur max des cards',
            default: '800px',
            description: 'Pour les témoignages en carousel'
          },
          {
            id: 'cardPadding',
            type: 'spacing',
            label: 'Padding des cards',
            default: '24px'
          },
          {
            id: 'cardBorderRadius',
            type: 'size',
            label: 'Arrondi des cards',
            default: '16px'
          },
          {
            id: 'starSize',
            type: 'size',
            label: 'Taille des étoiles',
            default: '24px'
          },
          {
            id: 'starGap',
            type: 'size',
            label: 'Espacement entre étoiles',
            default: '12px'
          },
          {
            id: 'textFontSize',
            type: 'size',
            label: 'Taille du témoignage',
            default: '18px'
          },
          {
            id: 'textFontStyle',
            type: 'select',
            label: 'Style du texte',
            default: 'italic',
            options: {
              choices: [
                { label: 'Normal', value: 'normal' },
                { label: 'Italic', value: 'italic' }
              ]
            }
          },
          {
            id: 'nameFontSize',
            type: 'size',
            label: 'Taille du nom',
            default: '16px'
          },
          {
            id: 'padding',
            type: 'spacing',
            label: 'Padding',
            default: '80px 24px'
          }
        ]
      }
    },
    
    // ==================== OPTIONS ====================
    {
      id: 'options',
      type: 'group',
      label: '⚙️ Options',
      options: {
        collapsible: true,
        fields: [
          {
            id: 'showAvatar',
            type: 'boolean',
            label: 'Afficher les photos',
            default: true
          },
          {
            id: 'showRating',
            type: 'boolean',
            label: 'Afficher les notes',
            default: true
          },
          {
            id: 'showQuotes',
            type: 'boolean',
            label: 'Afficher guillemets',
            default: true,
            description: 'Icônes de citations'
          },
          {
            id: 'autoplay',
            type: 'boolean',
            label: 'Lecture automatique',
            default: true,
            condition: (values) => values.layout?.displayMode === 'carousel'
          },
          {
            id: 'autoplaySpeed',
            type: 'slider',
            label: 'Vitesse (secondes)',
            default: 5,
            options: {
              min: 2,
              max: 10,
              step: 1
            },
            condition: (values) => values.layout?.displayMode === 'carousel' && values.options?.autoplay === true
          }
        ]
      }
    },
    
    // ==================== ANIMATIONS ====================
    {
      id: 'animations',
      type: 'group',
      label: '🎬 Animations',
      options: {
        collapsible: true,
        fields: [
          {
            id: 'enabled',
            type: 'boolean',
            label: 'Activer les animations',
            default: true
          },
          {
            id: 'cardAnimation',
            type: 'select',
            label: 'Animation des cards',
            default: 'fadeInUp',
            options: {
              choices: [
                { label: 'Fade In Up', value: 'fadeInUp' },
                { label: 'Fade In', value: 'fadeIn' },
                { label: 'Zoom In', value: 'zoomIn' },
                { label: 'Slide In', value: 'slideIn' }
              ]
            },
            condition: (values) => values.animations?.enabled === true
          }
        ]
      }
    }
  ],
  
  defaults: {
    title: 'Ils nous font confiance',
    subtitle: 'Découvrez les retours d\'expérience de nos clients',
    items: [
      {
        name: 'Sophie Martin',
        role: 'Particulier',
        company: 'Bruxelles',
        avatar: '',
        rating: 5,
        quote: 'Installation rapide et professionnelle. Nous avons déjà constaté une baisse de 65% sur notre facture d\'électricité !',
        featured: true
      },
      {
        name: 'Jean Dupont',
        role: 'Gérant',
        company: 'PME Industrielle',
        avatar: '',
        rating: 5,
        quote: 'Excellent accompagnement du début à la fin. L\'équipe est compétente et à l\'écoute.',
        featured: false
      },
      {
        name: 'Marie Durand',
        role: 'Propriétaire',
        company: 'Liège',
        avatar: '',
        rating: 5,
        quote: 'Je recommande vivement ! Service impeccable et résultats au-delà de nos attentes.',
        featured: false
      }
    ],
    layout: {
      displayMode: 'grid',
      grid: {
        columns: { mobile: 1, tablet: 2, desktop: 3 },
        gap: '24px',
        alignment: 'stretch',
        justifyContent: 'start'
      },
      cardStyle: 'elevated'
    },
    style: {
      backgroundColor: '#f9fafb',
      titleColor: '#111827',
      cardBackground: '#ffffff',
      quoteColor: '#374151',
      nameColor: '#111827',
      ratingColor: '#faad14',
      cardMaxWidth: '800px',
      cardPadding: '24px',
      cardBorderRadius: '16px',
      starSize: '24px',
      starGap: '12px',
      textFontSize: '18px',
      textFontStyle: 'italic',
      nameFontSize: '16px',
      padding: '80px 24px'
    },
    options: {
      showAvatar: true,
      showRating: true,
      showQuotes: true,
      autoplay: true,
      autoplaySpeed: 5
    },
    animations: {
      enabled: true,
      cardAnimation: 'fadeInUp'
    }
  }
};

export default testimonialsSchema;
