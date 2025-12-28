/**
 * ⚡ SCHÉMA SERVICES
 * 
 * Section présentant les services/produits sous forme de cards.
 * Idéal pour afficher une grille de services avec icônes et descriptions.
 * 
 * FONCTIONNALITÉS :
 * - Titre et sous-titre de section
 * - Grille de services (drag & drop)
 * - Icônes personnalisables
 * - Liens CTA par service
 * - Layout responsive automatique
 * 
 * @module site/schemas/services
 * @author 2Thier CRM Team
 */

import { SectionSchema } from './types';

export const servicesSchema: SectionSchema = {
  type: 'services',
  name: '⚡ Services / Produits',
  icon: '⚡',
  description: 'Grille de services ou produits avec icônes et descriptions',
  category: 'content',
  aiEnabled: true,
  
  aiContext: {
    businessType: ['technology', 'energy', 'services'],
    keywords: ['services', 'solutions', 'offres'],
    tone: ['professional', 'clear']
  },
  
  fields: [
    // ==================== CONTENU ====================
    {
      id: 'title',
      type: 'text',
      label: '📋 Titre de la section',
      default: 'Nos Services',
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
      default: 'Découvrez nos solutions adaptées à vos besoins',
      options: {
        aiSuggest: true,
        aiContext: 'section_subtitle'
      }
    },
    
    // ==================== SERVICES ====================
    {
      id: 'items',
      type: 'array',
      label: '📦 Liste des Services',
      description: 'Glissez-déposez pour réorganiser',
      default: [
        {
          icon: 'ThunderboltOutlined',
          iconColor: '#10b981',
          iconSize: '32px',
          title: 'Installation Panneaux Solaires',
          description: 'Installation professionnelle de panneaux photovoltaïques pour particuliers et entreprises.',
          features: [
            'Panneaux premium garantie 25 ans',
            'Installation certifiée',
            'Suivi de production'
          ],
          cta: {
            actionType: 'contact-form',
            text: 'Demander un devis',
            formAnchor: ['#contact']
          }
        },
        {
          icon: 'BulbOutlined',
          iconColor: '#f59e0b',
          iconSize: '32px',
          title: 'Batteries de Stockage',
          description: 'Stockez votre énergie solaire pour l\'utiliser quand vous en avez besoin.',
          features: [
            'Capacité 5 à 20 kWh',
            'Garantie 10 ans',
            'Gestion intelligente'
          ],
          cta: {
            actionType: 'contact-form',
            text: 'Demander un devis',
            formAnchor: ['#contact']
          }
        },
        {
          icon: 'ToolOutlined',
          iconColor: '#64748b',
          iconSize: '32px',
          title: 'Maintenance & Suivi',
          description: 'Contrat de maintenance et monitoring de votre installation.',
          features: [
            'Contrôle annuel',
            'Monitoring 24/7',
            'Intervention rapide'
          ],
          cta: {
            actionType: 'contact-form',
            text: 'Demander un devis',
            formAnchor: ['#contact']
          }
        }
      ],
      options: {
        draggable: true,
        maxItems: 12,
        itemType: {
          icon: {
            id: 'icon',
            type: 'icon',
            label: 'Icône',
            required: true,
            options: {
              allowImage: true,
              imageMaxSize: 3,
              imageAspectRatio: 1,
              imageAllowCrop: true
            }
          },
          iconColor: {
            id: 'iconColor',
            type: 'color',
            label: 'Couleur de l\'icône',
            default: '#10b981'
          },
          iconSize: {
            id: 'iconSize',
            type: 'text',
            label: 'Taille de l\'icône',
            default: '32px'
          },
          title: {
            id: 'title',
            type: 'text',
            label: 'Titre du service',
            required: true,
            options: {
              aiSuggest: true,
              aiContext: 'service_name'
            }
          },
          description: {
            id: 'description',
            type: 'textarea',
            label: 'Description',
            required: true,
            options: {
              aiSuggest: true,
              aiContext: 'service_description'
            }
          },
          features: {
            id: 'features',
            type: 'select',
            label: 'Liste des caractéristiques',
            default: [],
            options: {
              mode: 'tags',
              placeholder: 'Ajoutez des caractéristiques (Entrée pour valider)',
              maxItems: 10,
              aiSuggest: true
            }
          },
          cta: {
            id: 'cta',
            type: 'group',
            label: 'Bouton CTA',
            default: {
              actionType: 'contact-form',
              text: 'Demander un devis',
              formAnchor: ['#contact']
            },
            options: {
              collapsible: true,
              fields: [
                {
                  id: 'actionType',
                  type: 'select',
                  label: 'Type d\'action',
                  default: 'contact-form',
                  options: {
                    choices: [
                      { label: 'Aucun bouton', value: 'none' },
                      { label: 'Formulaire de contact', value: 'contact-form' },
                      { label: 'Section de la page', value: 'scroll-to-section' },
                      { label: 'Page interne', value: 'internal-page' },
                      { label: 'Lien externe', value: 'external-url' }
                    ],
                    placeholder: 'Sélectionnez l\'action du bouton'
                  }
                },
                {
                  id: 'text',
                  type: 'text',
                  label: 'Texte du bouton',
                  default: 'Demander un devis',
                  condition: (values) => {
                    // 🔥 Dans le contexte du group 'cta', values contient directement { actionType, text, ... }
                    const action = values?.actionType || 'contact-form';
                    return action !== 'none';
                  }
                },
                {
                  id: 'formAnchor',
                  type: 'contact-form-selector',
                  label: 'Formulaire à ouvrir',
                  default: ['#contact'],
                  options: {
                    placeholder: 'Créer ou sélectionner un formulaire',
                    allowCreate: true
                  },
                  condition: (values) => {
                    // 🔥 Dans le contexte du group 'cta', values contient directement { actionType, text, ... }
                    const action = values?.actionType || 'contact-form';
                    return action === 'contact-form';
                  }
                },
                {
                  id: 'sectionAnchor',
                  type: 'section-anchor-selector',
                  label: 'Section à atteindre',
                  description: 'Sélectionnez une section de votre page ou tapez une ancre personnalisée',
                  options: {
                    placeholder: 'Sélectionnez une section...',
                    allowCustom: true
                  },
                  condition: (values) => {
                    const action = values?.actionType;
                    return action === 'scroll-to-section';
                  }
                },
                {
                  id: 'pageSlug',
                  type: 'select',
                  label: 'Page interne',
                  options: {
                    placeholder: 'Sélectionnez ou tapez un slug (ex: /services/photovoltaïque)',
                    choices: [
                      { label: '/services/photovoltaïque', value: '/services/photovoltaïque' },
                      { label: '/services/batteries', value: '/services/batteries' },
                      { label: '/services/maintenance', value: '/services/maintenance' },
                      { label: '/contact', value: '/contact' }
                    ],
                    mode: 'tags',
                    maxItems: 1
                  },
                  condition: (values) => {
                    const action = values?.actionType;
                    return action === 'internal-page';
                  }
                },
                {
                  id: 'customUrl',
                  type: 'text',
                  label: 'URL personnalisée',
                  placeholder: 'https://...',
                  condition: (values) => {
                    const action = values?.actionType;
                    return action === 'external-url';
                  }
                }
              ]
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
            id: 'grid',
            type: 'grid',
            label: 'Configuration de la grille',
            default: {
              columns: { mobile: 1, tablet: 2, desktop: 3 },
              gap: '24px',
              alignment: 'stretch',
              justifyContent: 'start'
            },
            options: {
              responsive: true
            }
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
            default: '#ffffff'
          },
          {
            id: 'padding',
            type: 'spacing',
            label: 'Padding de la section',
            default: '80px 24px'
          },
          {
            id: 'titleColor',
            type: 'color',
            label: 'Couleur du titre',
            default: '#1f2937'
          },
          {
            id: 'titleFontSize',
            type: 'text',
            label: 'Taille du titre',
            default: 'clamp(28px, 6vw, 42px)'
          },
          {
            id: 'subtitleColor',
            type: 'color',
            label: 'Couleur du sous-titre',
            default: '#64748b'
          },
          {
            id: 'subtitleFontSize',
            type: 'text',
            label: 'Taille du sous-titre',
            default: '18px'
          },
          {
            id: 'cardBorder',
            type: 'text',
            label: 'Bordure des cards',
            default: '2px solid #f1f5f9'
          },
          {
            id: 'cardBorderRadius',
            type: 'text',
            label: 'Border radius des cards',
            default: '12px'
          },
          {
            id: 'cardPadding',
            type: 'spacing',
            label: 'Padding des cards',
            default: '24px'
          },
          {
            id: 'ctaBackgroundColor',
            type: 'color',
            label: 'Couleur de fond CTA',
            default: '#10b981'
          },
          {
            id: 'ctaBorderColor',
            type: 'color',
            label: 'Couleur bordure CTA',
            default: '#10b981'
          },
          {
            id: 'ctaColor',
            type: 'color',
            label: 'Couleur texte CTA',
            default: '#ffffff'
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
          },
          {
            id: 'stagger',
            type: 'slider',
            label: 'Délai entre cards (ms)',
            default: 100,
            options: {
              min: 0,
              max: 300,
              step: 50
            },
            condition: (values) => values.animations?.enabled === true
          }
        ]
      }
    }
  ],
  
  defaults: {
    title: 'Nos Services',
    subtitle: 'Découvrez nos solutions adaptées à vos besoins',
    items: [
      {
        icon: 'ThunderboltOutlined',
          iconColor: '#10b981',
        iconSize: '32px',
        title: 'Installation Panneaux Solaires',
        description: 'Installation professionnelle de panneaux photovoltaïques pour particuliers et entreprises.',
        features: [
          'Panneaux premium garantie 25 ans',
          'Installation certifiée',
          'Suivi de production'
        ],
        cta: {
          actionType: 'contact-form',
          text: 'Demander un devis',
          formAnchor: ['#contact']
        }
      },
      {
          iconType: 'icon',
          icon: 'BulbOutlined',
        iconColor: '#f59e0b',
        iconSize: '32px',
        title: 'Batteries de Stockage',
        description: 'Stockez votre énergie solaire pour l\'utiliser quand vous en avez besoin.',
        features: [
          'Capacité 5 à 20 kWh',
          'Garantie 10 ans',
          'Gestion intelligente'
        ],
        cta: {
          actionType: 'contact-form',
          text: 'Demander un devis',
          formAnchor: ['#contact']
        }
      },
      {
          iconType: 'icon',
          icon: 'ToolOutlined',
        iconColor: '#64748b',
        iconSize: '32px',
        title: 'Maintenance & Suivi',
        description: 'Contrat de maintenance et monitoring de votre installation.',
        features: [
          'Contrôle annuel',
          'Monitoring 24/7',
          'Intervention rapide'
        ],
        cta: {
          actionType: 'contact-form',
          text: 'Demander un devis',
          formAnchor: ['#contact']
        }
      }
    ],
    layout: {
      grid: {
        columns: { mobile: 1, tablet: 2, desktop: 3 },
        gap: '24px',
        alignment: 'stretch',
        justifyContent: 'start'
      },
      cardStyle: 'elevated'
    },
    style: {
      backgroundColor: '#ffffff',
      titleColor: '#111827',
      subtitleColor: '#6b7280',
      cardBackground: '#f9fafb',
      iconColor: '#10b981',
      padding: '80px 24px'
    },
    animations: {
      enabled: true,
      cardAnimation: 'fadeInUp',
      stagger: 100
    }
  }
};

export default servicesSchema;
