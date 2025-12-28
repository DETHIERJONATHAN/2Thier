/**
 * 🎨 SCHÉMA CTA (Call-to-Action)
 * 
 * Section dédiée à l'appel à l'action.
 * Idéal pour convertir les visiteurs en leads/clients.
 * 
 * FONCTIONNALITÉS :
 * - Titre et message percutant
 * - Un ou plusieurs boutons CTA
 * - Image ou fond coloré
 * - Style urgence/confiance
 * - Compteur de temps (optionnel)
 * 
 * @module site/schemas/cta
 * @author 2Thier CRM Team
 */

import { SectionSchema } from './types';

export const ctaSchema: SectionSchema = {
  type: 'cta',
  name: '🎯 Call-to-Action',
  icon: '🎯',
  description: 'Section d\'appel à l\'action pour conversion',
  category: 'marketing',
  aiEnabled: true,
  
  aiContext: {
    businessType: ['technology', 'energy', 'services'],
    keywords: ['cta', 'conversion', 'action'],
    tone: ['urgent', 'persuasive', 'confident']
  },
  
  fields: [
    // ==================== CONTENU ====================
    {
      id: 'title',
      type: 'rich-text',
      label: '🎯 Titre Principal',
      default: 'Prêt à passer à l\'énergie solaire ?',
      required: true,
      options: {
        aiSuggest: true,
        aiContext: 'cta_headline'
      }
    },
    
    {
      id: 'subtitle',
      type: 'textarea',
      label: '📄 Message',
      default: 'Obtenez votre devis personnalisé gratuitement en moins de 2 minutes.',
      options: {
        aiSuggest: true,
        aiContext: 'cta_message'
      }
    },
    
    // ==================== BOUTONS ====================
    {
      id: 'buttons',
      type: 'array',
      label: '🔘 Boutons',
      description: 'Maximum 2 boutons recommandé',
      default: [
        {
          text: 'DEMANDER UN DEVIS GRATUIT',
          icon: 'RocketOutlined',
          actionType: 'contact-form',
          formTarget: '#contact',
          internalPath: '#contact',
          externalUrl: '',
          customUrl: '',
          phoneNumber: '',
          emailAddress: '',
          openInNewTab: true,
          size: 'large',
          href: '',
          style: {
            backgroundColor: '#10b981',
            borderColor: '#10b981',
            color: '#ffffff',
            padding: '16px 32px',
            fontSize: '18px'
          }
        }
      ],
      options: {
        draggable: true,
        maxItems: 2,
        itemType: {
          text: {
            id: 'text',
            type: 'text',
            label: 'Texte du bouton',
            required: true,
            options: {
              aiSuggest: true,
              aiContext: 'cta_button'
            },
            condition: (values) => {
              // 🔥 Dans un array itemType, values contient l'item du bouton directement
              const action = values?.actionType || '';
              return action !== 'none';
            }
          },
          actionType: {
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
                { label: 'Lien externe', value: 'external-url' },
                { label: 'Téléphone', value: 'phone' },
                { label: 'Email', value: 'email' }
              ],
              placeholder: 'Sélectionnez l\'action du bouton'
            }
          },
          formTarget: {
            id: 'formTarget',
            type: 'contact-form-selector',
            label: 'Formulaire à ouvrir',
            description: 'Créer un formulaire ou sélectionner une ancre (#contact, #devis...)',
            default: ['#contact'],
            options: {
              placeholder: 'Créer ou sélectionner un formulaire',
              allowCreate: true
            },
            condition: (values) => {
              const action = values?.actionType || '';
              return action === 'contact-form';
            }
          },
          sectionAnchor: {
            id: 'sectionAnchor',
            type: 'section-anchor-selector',
            label: 'Section à atteindre',
            description: 'Sélectionnez une section de votre page ou tapez une ancre personnalisée',
            options: {
              placeholder: 'Sélectionnez une section...',
              allowCustom: true
            },
            condition: (values) => {
              const action = values?.actionType || '';
              return action === 'scroll-to-section';
            }
          },
          pageSlug: {
            id: 'pageSlug',
            type: 'select',
            label: 'Page interne',
            options: {
              placeholder: 'Sélectionnez ou tapez un slug (ex: /services)',
              choices: [
                { label: '/services', value: '/services' },
                { label: '/contact', value: '/contact' },
                { label: '/about', value: '/about' }
              ],
              mode: 'tags',
              maxItems: 1
            },
            condition: (values) => {
              const action = values?.actionType || '';
              return action === 'internal-page';
            }
          },
          customUrl: {
            id: 'customUrl',
            type: 'text',
            label: 'URL externe',
            placeholder: 'https://...',
            condition: (values) => {
              const action = values?.actionType || '';
              return action === 'external-url';
            }
          },
          openInNewTab: {
            id: 'openInNewTab',
            type: 'boolean',
            label: 'Ouvrir dans un nouvel onglet',
            default: true,
            condition: (values) => {
              const action = values?.actionType || '';
              return action === 'external-url';
            }
          },
          phoneNumber: {
            id: 'phoneNumber',
            type: 'text',
            label: 'Numéro de téléphone',
            placeholder: '+32...',
            condition: (values) => values?.actionType === 'phone'
          },
          emailAddress: {
            id: 'emailAddress',
            type: 'text',
            label: 'Adresse email',
            placeholder: 'contact@exemple.be',
            condition: (values) => values?.actionType === 'email'
          },
          size: {
            id: 'size',
            type: 'select',
            label: 'Taille',
            default: 'large',
            options: {
              choices: [
                { label: 'Large', value: 'large' },
                { label: 'Moyenne', value: 'middle' },
                { label: 'Petite', value: 'small' }
              ]
            }
          },
          href: {
            id: 'href',
            type: 'text',
            label: 'Lien personnalisé (optionnel)',
            description: 'Surcharge manuelle du lien généré',
            default: '',
            condition: (values) => {
              const action = values?.actionType || '';
              return action && action !== 'none';
            }
          },
          icon: {
            id: 'icon',
            type: 'icon',
            label: 'Icône'
          },
          style: {
            id: 'style',
            type: 'group',
            label: 'Style personnalisé',
            default: {
              backgroundColor: '#10b981',
              borderColor: '#10b981',
              color: '#ffffff',
              padding: '16px 32px',
              fontSize: '18px'
            },
            options: {
              collapsible: true,
              fields: [
                {
                  id: 'backgroundColor',
                  type: 'color',
                  label: 'Couleur de fond',
                  default: '#10b981'
                },
                {
                  id: 'borderColor',
                  type: 'color',
                  label: 'Couleur de bordure',
                  default: '#10b981'
                },
                {
                  id: 'color',
                  type: 'color',
                  label: 'Couleur du texte',
                  default: '#ffffff'
                },
                {
                  id: 'padding',
                  type: 'text',
                  label: 'Padding',
                  default: '16px 32px'
                },
                {
                  id: 'fontSize',
                  type: 'size',
                  label: 'Taille de police',
                  default: '18px'
                }
              ]
            }
          }
        }
      }
    },
    
    // ==================== FOOTER TEXT ====================
    {
      id: 'footer',
      type: 'group',
      label: '👣 Texte en bas',
      description: 'Informations supplémentaires sous les boutons',
      options: {
        collapsible: true,
        fields: [
          {
            id: 'text',
            type: 'text',
            label: 'Texte',
            default: '📍 Route de Gosselies 23, 6220 Fleurus'
          },
          {
            id: 'icon',
            type: 'icon',
            label: 'Icône',
            default: 'EnvironmentOutlined'
          },
          {
            id: 'color',
            type: 'color',
            label: 'Couleur',
            default: 'rgba(255,255,255,0.9)'
          },
          {
            id: 'fontSize',
            type: 'size',
            label: 'Taille',
            default: '16px'
          }
        ]
      }
    },
    
    // ==================== URGENCE ====================
    {
      id: 'urgency',
      type: 'group',
      label: '⏰ Urgence / Confiance',
      options: {
        collapsible: true,
        fields: [
          {
            id: 'enabled',
            type: 'boolean',
            label: 'Activer indicateur d\'urgence',
            default: false
          },
          {
            id: 'type',
            type: 'select',
            label: 'Type d\'indicateur',
            default: 'countdown',
            options: {
              choices: [
                { label: '⏱️ Compte à rebours', value: 'countdown' },
                { label: '🔥 Places limitées', value: 'limited' },
                { label: '✅ Garanties', value: 'trust' }
              ]
            },
            condition: (values) => values.urgency?.enabled === true
          },
          {
            id: 'countdownEnd',
            type: 'text',
            label: 'Date de fin (YYYY-MM-DD)',
            default: '2025-12-31',
            condition: (values) => values.urgency?.type === 'countdown'
          },
          {
            id: 'limitedText',
            type: 'text',
            label: 'Texte places limitées',
            default: 'Plus que 5 places disponibles ce mois-ci !',
            condition: (values) => values.urgency?.type === 'limited'
          },
          {
            id: 'trustBadges',
            type: 'array',
            label: 'Badges de confiance',
            default: [
              { icon: 'SafetyOutlined', text: '100% Satisfait ou Remboursé' },
              { icon: 'LockOutlined', text: 'Paiement Sécurisé' },
              { icon: 'PhoneOutlined', text: 'Support 7j/7' }
            ],
            options: {
              maxItems: 4,
              itemType: {
                icon: {
                  id: 'icon',
                  type: 'icon',
                  label: 'Icône'
                },
                text: {
                  id: 'text',
                  type: 'text',
                  label: 'Texte'
                }
              }
            },
            condition: (values) => values.urgency?.type === 'trust'
          }
        ]
      }
    },
    
    // ==================== VISUEL ====================
    {
      id: 'visual',
      type: 'group',
      label: '🖼️ Visuel',
      options: {
        collapsible: true,
        fields: [
          {
            id: 'type',
            type: 'select',
            label: 'Type de fond',
            default: 'color',
            options: {
              choices: [
                { label: '🎨 Couleur unie', value: 'color' },
                { label: '🌈 Dégradé', value: 'gradient' },
                { label: '🖼️ Image', value: 'image' }
              ]
            }
          },
          {
            id: 'image',
            type: 'image',
            label: 'Image de fond',
            options: {
              maxSize: 5,
              aspectRatio: 16 / 9
            },
            condition: (values) => values.visual?.type === 'image'
          },
          {
            id: 'overlay',
            type: 'boolean',
            label: 'Overlay sombre',
            default: true,
            condition: (values) => values.visual?.type === 'image'
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
            default: '#10b981'
          },
          {
            id: 'gradientStart',
            type: 'color',
            label: 'Dégradé début',
            default: '#10b981',
            condition: (values) => values.visual?.type === 'gradient'
          },
          {
            id: 'gradientEnd',
            type: 'color',
            label: 'Dégradé fin',
            default: '#059669',
            condition: (values) => values.visual?.type === 'gradient'
          },
          {
            id: 'textColor',
            type: 'color',
            label: 'Couleur du texte',
            default: '#ffffff'
          },
          {
            id: 'padding',
            type: 'spacing',
            label: 'Padding',
            default: '80px 24px'
          },
          {
            id: 'borderRadius',
            type: 'size',
            label: 'Arrondi (si card)',
            default: '12px'
          },
          {
            id: 'textAlign',
            type: 'select',
            label: 'Alignement du texte',
            default: 'center',
            options: {
              choices: [
                { label: '⬅️ Gauche', value: 'left' },
                { label: '↔️ Centre', value: 'center' },
                { label: '➡️ Droite', value: 'right' }
              ]
            }
          },
          {
            id: 'contentAlign',
            type: 'select',
            label: 'Position du contenu',
            default: 'center',
            description: 'Alignement horizontal du bloc de contenu',
            options: {
              choices: [
                { label: '⬅️ Gauche', value: 'flex-start' },
                { label: '↔️ Centre', value: 'center' },
                { label: '➡️ Droite', value: 'flex-end' }
              ]
            }
          },
          {
            id: 'buttonAlign',
            type: 'select',
            label: 'Alignement des boutons',
            default: 'center',
            options: {
              choices: [
                { label: '⬅️ Gauche', value: 'flex-start' },
                { label: '↔️ Centre', value: 'center' },
                { label: '➡️ Droite', value: 'flex-end' }
              ]
            }
          }
        ]
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
            id: 'alignment',
            type: 'select',
            label: 'Alignement',
            default: 'center',
            options: {
              choices: [
                { label: '◀️ Gauche', value: 'left' },
                { label: '🎯 Centre', value: 'center' },
                { label: '▶️ Droite', value: 'right' }
              ]
            }
          },
          {
            id: 'maxWidth',
            type: 'size',
            label: 'Largeur max contenu',
            default: '800px'
          }
        ]
      }
    }
  ],
  
  defaults: {
    title: 'Prêt à passer à l\'énergie solaire ?',
    subtitle: 'Obtenez votre devis personnalisé gratuitement en moins de 2 minutes.',
    buttons: [
      {
        text: 'OBTENIR MON DEVIS GRATUIT',
        actionType: 'contact-form',
        formTarget: '',
        internalPath: '#contact',
        icon: 'RocketOutlined',
        style: {
          backgroundColor: '#10b981',
          borderColor: '#10b981',
          color: '#ffffff',
          padding: '16px 32px',
          fontSize: '18px'
        },
        size: 'large'
      }
    ],
    urgency: {
      enabled: false,
      type: 'countdown'
    },
    visual: {
      type: 'color',
      overlay: true
    },
    style: {
      backgroundColor: '#10b981',
      gradientStart: '#10b981',
      gradientEnd: '#059669',
      textColor: '#ffffff',
      padding: '80px 24px',
      borderRadius: '12px',
      textAlign: 'center',
      contentAlign: 'center',
      buttonAlign: 'center'
    },
    layout: {
      alignment: 'center',
      maxWidth: '800px'
    }
  }
};

export default ctaSchema;
