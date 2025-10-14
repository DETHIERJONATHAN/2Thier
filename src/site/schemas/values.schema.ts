/**
 * 💚 SCHÉMA VALUES (POURQUOI NOUS CHOISIR)
 * 
 * Section présentant les valeurs/avantages de l'entreprise.
 * Cards avec icônes, titres et descriptions.
 * 
 * @module site/schemas/values
 * @author 2Thier CRM Team
 */

import { SectionSchema } from './types';

export const valuesSchema: SectionSchema = {
  type: 'values',
  name: '💚 Valeurs / Avantages',
  icon: '💚',
  description: 'Section "Pourquoi nous choisir" avec valeurs/avantages',
  category: 'content',
  aiEnabled: true,
  
  aiContext: {
    businessType: ['services', 'energy', 'technology'],
    keywords: ['qualité', 'expertise', 'garantie', 'service'],
    tone: ['professional', 'reassuring']
  },
  
  fields: [
    {
      id: 'title',
      type: 'text',
      label: '📋 Titre de la section',
      default: 'Pourquoi Nous Choisir ?',
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
      default: 'Les raisons de nous faire confiance',
      options: {
        aiSuggest: true,
        aiContext: 'section_subtitle'
      }
    },
    
    {
      id: 'items',
      type: 'array',
      label: '🎯 Liste des Valeurs',
      description: 'Glissez-déposez pour réorganiser',
      default: [
        {
          icon: 'SafetyCertificateOutlined',
          title: 'Expertise Certifiée',
          description: 'Techniciens qualifiés et certifications reconnues'
        },
        {
          icon: 'StarFilled',
          title: 'Qualité Premium',
          description: 'Matériel haut de gamme et garanties longues'
        },
        {
          icon: 'CustomerServiceOutlined',
          title: 'Service Client',
          description: 'Accompagnement personnalisé de A à Z'
        },
        {
          icon: 'CheckCircleOutlined',
          title: 'Satisfaction Garantie',
          description: '98% de clients satisfaits et recommandent'
        }
      ],
      options: {
        draggable: true,
        maxItems: 8,
        itemType: {
          icon: {
            id: 'icon',
            type: 'icon',
            label: 'Icône',
            required: true
          },
          title: {
            id: 'title',
            type: 'text',
            label: 'Titre',
            required: true,
            options: {
              aiSuggest: true,
              aiContext: 'value_title'
            }
          },
          description: {
            id: 'description',
            type: 'textarea',
            label: 'Description',
            required: true,
            options: {
              aiSuggest: true,
              aiContext: 'value_description'
            }
          }
        },
        aiSuggest: true
      }
    },
    
    {
      id: 'grid',
      type: 'grid',
      label: '📊 Configuration de Grille',
      description: 'Organisation des cartes en colonnes responsive',
      default: {
        columns: { mobile: 1, tablet: 2, desktop: 4 },
        gap: '24px',
        alignment: 'stretch',
        justifyContent: 'center'
      }
    },
    
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
            id: 'iconColor',
            type: 'color',
            label: 'Couleur des icônes',
            default: '#10b981'
          },
          {
            id: 'cardBackground',
            type: 'color',
            label: 'Fond des cards',
            default: '#ffffff'
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
            id: 'iconAlign',
            type: 'select',
            label: 'Position des icônes',
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
    }
  ],
  
  defaults: {
    title: 'Pourquoi Nous Choisir ?',
    subtitle: 'Les raisons de nous faire confiance',
    items: [
      {
        icon: 'SafetyCertificateOutlined',
        title: 'Expertise Certifiée',
        description: 'Techniciens qualifiés et certifications reconnues'
      },
      {
        icon: 'StarFilled',
        title: 'Qualité Premium',
        description: 'Matériel haut de gamme et garanties longues'
      },
      {
        icon: 'CustomerServiceOutlined',
        title: 'Service Client',
        description: 'Accompagnement personnalisé de A à Z'
      },
      {
        icon: 'CheckCircleOutlined',
        title: 'Satisfaction Garantie',
        description: '98% de clients satisfaits et recommandent'
      }
    ],
    grid: {
      columns: { mobile: 1, tablet: 2, desktop: 4 },
      gap: '24px',
      alignment: 'stretch',
      justifyContent: 'center'
    },
    style: {
      backgroundColor: '#f9fafb',
      iconColor: '#10b981',
      cardBackground: '#ffffff',
      textAlign: 'center',
      iconAlign: 'center'
    }
  }
};

export default valuesSchema;
