/**
 * 🚀 SCHÉMA PROCESS (ÉTAPES)
 * 
 * Section montrant le processus en étapes (Steps Ant Design).
 * Parfait pour expliquer le déroulement d'un projet.
 * 
 * @module site/schemas/process
 * @author 2Thier CRM Team
 */

import { SectionSchema } from './types';

export const processSchema: SectionSchema = {
  type: 'process',
  name: '🚀 Processus / Étapes',
  icon: '🚀',
  description: 'Section montrant le processus en étapes numérotées',
  category: 'content',
  aiEnabled: true,
  
  aiContext: {
    businessType: ['services', 'process', 'project'],
    keywords: ['étapes', 'processus', 'déroulement', 'workflow'],
    tone: ['clear', 'professional']
  },
  
  fields: [
    {
      id: 'title',
      type: 'text',
      label: '📋 Titre de la section',
      default: 'Comment Ça Marche ?',
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
      default: 'Votre projet en quelques étapes simples',
      options: {
        aiSuggest: true,
        aiContext: 'section_subtitle'
      }
    },
    
    {
      id: 'steps',
      type: 'array',
      label: '📝 Liste des Étapes',
      description: 'Les étapes du processus (max 8)',
      default: [
        {
          icon: 'PhoneOutlined',
          title: 'Contact',
          description: 'Demande gratuite sous 24h'
        },
        {
          icon: 'SafetyCertificateOutlined',
          title: 'Étude',
          description: 'Visite et analyse de faisabilité'
        },
        {
          icon: 'ToolOutlined',
          title: 'Devis',
          description: 'Proposition détaillée personnalisée'
        },
        {
          icon: 'TeamOutlined',
          title: 'Installation',
          description: 'Pose par techniciens certifiés'
        },
        {
          icon: 'CheckCircleOutlined',
          title: 'Suivi',
          description: 'SAV et garanties longue durée'
        }
      ],
      options: {
        draggable: false, // L'ordre des étapes est important
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
            label: 'Titre de l\'étape',
            required: true,
            options: {
              aiSuggest: true,
              aiContext: 'step_title'
            }
          },
          description: {
            id: 'description',
            type: 'textarea',
            label: 'Description',
            required: true,
            options: {
              aiSuggest: true,
              aiContext: 'step_description'
            }
          }
        },
        aiSuggest: true
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
            default: '#ffffff'
          },
          {
            id: 'iconColor',
            type: 'color',
            label: 'Couleur des icônes',
            default: '#10b981'
          },
          {
            id: 'lineColor',
            type: 'color',
            label: 'Couleur de la ligne',
            default: '#10b981'
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
            id: 'stepsDirection',
            type: 'select',
            label: 'Orientation des étapes',
            default: 'horizontal',
            options: {
              choices: [
                { label: '↔️ Horizontale', value: 'horizontal' },
                { label: '⬇️ Verticale', value: 'vertical' }
              ]
            }
          },
          {
            id: 'iconPosition',
            type: 'select',
            label: 'Position des icônes',
            default: 'top',
            description: 'Position des icônes par rapport au texte',
            options: {
              choices: [
                { label: '⬆️ En haut', value: 'top' },
                { label: '⬅️ À gauche', value: 'left' }
              ]
            }
          }
        ]
      }
    }
  ],
  
  defaults: {
    title: 'Comment Ça Marche ?',
    subtitle: 'Votre projet en quelques étapes simples',
    steps: [
      {
        icon: 'PhoneOutlined',
        title: 'Contact',
        description: 'Demande gratuite sous 24h'
      },
      {
        icon: 'SafetyCertificateOutlined',
        title: 'Étude',
        description: 'Visite et analyse de faisabilité'
      },
      {
        icon: 'ToolOutlined',
        title: 'Devis',
        description: 'Proposition détaillée personnalisée'
      },
      {
        icon: 'TeamOutlined',
        title: 'Installation',
        description: 'Pose par techniciens certifiés'
      },
      {
        icon: 'CheckCircleOutlined',
        title: 'Suivi',
        description: 'SAV et garanties longue durée'
      }
    ],
    style: {
      backgroundColor: '#ffffff',
      iconColor: '#10b981',
      lineColor: '#10b981',
      textAlign: 'center',
      stepsDirection: 'horizontal',
      iconPosition: 'top'
    }
  }
};

export default processSchema;
