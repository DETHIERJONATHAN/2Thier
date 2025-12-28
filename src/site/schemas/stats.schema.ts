/**
 * 📊 SCHÉMA STATS
 * 
 * Section de statistiques avec compteurs animés.
 * Idéal pour afficher chiffres clés, métriques, KPIs.
 * 
 * FONCTIONNALITÉS :
 * - Compteurs animés (count-up effect)
 * - Icônes ou symboles
 * - Labels explicatifs
 * - Layout en grille responsive
 * - Animations au scroll
 * 
 * @module site/schemas/stats
 * @author 2Thier CRM Team
 */

import { SectionSchema } from './types';

export const statsSchema: SectionSchema = {
  type: 'stats',
  name: '📊 Statistiques / Chiffres Clés',
  icon: '📊',
  description: 'Compteurs animés pour afficher des chiffres clés',
  category: 'content',
  aiEnabled: true,
  
  aiContext: {
    businessType: ['technology', 'energy', 'services'],
    keywords: ['statistics', 'numbers', 'metrics'],
    tone: ['impactful', 'professional']
  },
  
  fields: [
    // ==================== STATS ====================
    {
      id: 'items',
      type: 'array',
      label: '📊 Statistiques',
      description: 'Chiffres clés à afficher',
      default: [
        {
          value: '+500',
          label: 'Installations réalisées',
          icon: 'HomeOutlined',
          valueColor: '#10b981',
          valueFontSize: '32px',
          valueFontWeight: 'bold'
        },
        {
          value: '15 MW',
          label: 'Puissance installée',
          icon: 'ThunderboltOutlined',
          valueColor: '#10b981',
          valueFontSize: '32px',
          valueFontWeight: 'bold'
        },
        {
          value: '4.9/5',
          label: 'Satisfaction client',
          icon: 'StarFilled',
          valueColor: '#10b981',
          valueFontSize: '32px',
          valueFontWeight: 'bold'
        },
        {
          value: 'Wallonie',
          label: 'Région couverte',
          icon: 'EnvironmentOutlined',
          valueColor: '#10b981',
          valueFontSize: '32px',
          valueFontWeight: 'bold'
        }
      ],
      options: {
        draggable: true,
        maxItems: 8,
        itemType: {
          value: {
            id: 'value',
            type: 'text',
            label: 'Valeur (avec préfixe/suffixe)',
            required: true,
            description: 'Ex: +500, 70%, 25 ans'
          },
          label: {
            id: 'label',
            type: 'text',
            label: 'Label descriptif',
            required: true,
            options: {
              aiSuggest: true,
              aiContext: 'stat_label'
            }
          },
          icon: {
            id: 'icon',
            type: 'icon',
            label: 'Icône'
          },
          valueColor: {
            id: 'valueColor',
            type: 'color',
            label: 'Couleur de la valeur',
            default: '#10b981'
          },
          valueFontSize: {
            id: 'valueFontSize',
            type: 'text',
            label: 'Taille de la valeur',
            default: '32px',
            description: 'Ex: 32px, 48px, 3rem'
          },
          valueFontWeight: {
            id: 'valueFontWeight',
            type: 'select',
            label: 'Épaisseur de la valeur',
            default: 'bold',
            options: {
              choices: [
                { label: 'Normal', value: 'normal' },
                { label: 'Medium (500)', value: '500' },
                { label: 'Semi-Bold (600)', value: '600' },
                { label: 'Bold', value: 'bold' },
                { label: 'Extra-Bold (800)', value: '800' }
              ]
            }
          }
        }
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
              columns: { mobile: 2, tablet: 2, desktop: 4 },
              gap: '24px',
              alignment: 'center',
              justifyContent: 'center'
            },
            options: {
              responsive: true
            }
          },
          {
            id: 'alignment',
            type: 'select',
            label: 'Alignement du contenu',
            default: 'center',
            options: {
              choices: [
                { label: '◀️ Gauche', value: 'left' },
                { label: '🎯 Centre', value: 'center' },
                { label: '▶️ Droite', value: 'right' }
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
            label: 'Couleur de fond section',
            default: '#f9fafb'
          },
          {
            id: 'padding',
            type: 'spacing',
            label: 'Padding section',
            default: '60px 24px'
          },
          {
            id: 'iconSize',
            type: 'text',
            label: 'Taille des icônes',
            default: '48px',
            description: 'Ex: 48px, 3rem'
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
            label: 'Couleur de fond des cartes',
            default: 'white'
          },
          {
            id: 'cardBorderRadius',
            type: 'text',
            label: 'Border radius des cartes',
            default: '12px'
          },
          {
            id: 'cardShadow',
            type: 'text',
            label: 'Ombre des cartes (box-shadow)',
            default: '0 4px 12px rgba(0,0,0,0.08)',
            description: 'CSS box-shadow'
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
            id: 'countUp',
            type: 'boolean',
            label: 'Activer le count-up',
            default: true,
            description: 'Les chiffres s\'animent de 0 à la valeur finale'
          },
          {
            id: 'duration',
            type: 'slider',
            label: 'Durée animation (ms)',
            default: 2000,
            options: {
              min: 500,
              max: 5000,
              step: 500
            },
            condition: (values) => values.animations?.countUp === true
          },
          {
            id: 'triggerOnScroll',
            type: 'boolean',
            label: 'Déclencher au scroll',
            default: true,
            description: 'Animation démarre quand la section est visible'
          }
        ]
      }
    }
  ],
  
  defaults: {
    title: '',
    items: [
      {
        value: '+500',
        label: 'Installations réalisées',
        icon: 'HomeOutlined',
        valueColor: '#10b981',
        valueFontSize: '32px',
        valueFontWeight: 'bold'
      },
      {
        value: '15 MW',
        label: 'Puissance installée',
        icon: 'ThunderboltOutlined',
        valueColor: '#10b981',
        valueFontSize: '32px',
        valueFontWeight: 'bold'
      },
      {
        value: '4.9/5',
        label: 'Satisfaction client',
        icon: 'StarFilled',
        valueColor: '#10b981',
        valueFontSize: '32px',
        valueFontWeight: 'bold'
      },
      {
        value: 'Wallonie',
        label: 'Région couverte',
        icon: 'EnvironmentOutlined',
        valueColor: '#10b981',
        valueFontSize: '32px',
        valueFontWeight: 'bold'
      }
    ],
    layout: {
      grid: {
        columns: { mobile: 2, tablet: 2, desktop: 4 },
        gap: '24px',
        alignment: 'center',
        justifyContent: 'center'
      },
      alignment: 'center'
    },
    style: {
      backgroundColor: '#f9fafb',
      cardBackground: 'white',
      cardBorderRadius: '12px',
      cardShadow: '0 4px 12px rgba(0,0,0,0.08)',
      iconSize: '48px',
      iconColor: '#10b981',
      padding: '60px 24px'
    },
    animations: {
      countUp: true,
      duration: 2000,
      triggerOnScroll: true
    }
  }
};

export default statsSchema;
