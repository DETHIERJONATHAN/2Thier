/**
 * 📸 SCHÉMA PROJECTS (RÉALISATIONS)
 * 
 * Section galerie de projets/réalisations avec images.
 * Chaque projet a une image, titre, localisation, détails et tags.
 * 
 * @module site/schemas/projects
 * @author 2Thier CRM Team
 */

import { SectionSchema } from './types';

export const projectsSchema: SectionSchema = {
  type: 'projects',
  name: '📸 Projets / Réalisations',
  icon: '📸',
  description: 'Galerie de projets réalisés avec images et détails',
  category: 'content',
  aiEnabled: true,
  
  aiContext: {
    businessType: ['portfolio', 'showcase', 'projects'],
    keywords: ['réalisations', 'projets', 'portfolio', 'références'],
    tone: ['professional', 'showcase']
  },
  
  fields: [
    {
      id: 'title',
      type: 'text',
      label: '📋 Titre de la section',
      default: 'Nos Dernières Réalisations',
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
      default: 'Découvrez quelques-uns de nos projets réussis',
      options: {
        aiSuggest: true,
        aiContext: 'section_subtitle'
      }
    },
    
    {
      id: 'showAllLink',
      type: 'boolean',
      label: '🔗 Afficher lien "Voir tous"',
      default: true
    },
    
    {
      id: 'items',
      type: 'array',
      label: '📦 Liste des Projets',
      description: 'Glissez-déposez pour réorganiser',
      default: [
        {
          image: '/images/project1.jpg',
          title: 'Installation Résidentielle 9 kWc',
          location: 'Charleroi',
          details: 'Installation de 24 panneaux solaires avec batterie de stockage.',
          tags: ['Résidentiel', 'Photovoltaïque', 'Batterie'],
          date: 'Août 2024'
        },
        {
          image: '/images/project2.jpg',
          title: 'Ferme Solaire 50 kWc',
          location: 'Namur',
          details: 'Projet agricole avec 130 panneaux haute performance.',
          tags: ['Agricole', 'Grande puissance'],
          date: 'Juillet 2024'
        }
      ],
      options: {
        draggable: true,
        maxItems: 12,
        itemType: {
          image: {
            id: 'image',
            type: 'image',
            label: 'Image du projet',
            required: true
          },
          title: {
            id: 'title',
            type: 'text',
            label: 'Titre du projet',
            required: true,
            options: {
              aiSuggest: true,
              aiContext: 'project_title'
            }
          },
          location: {
            id: 'location',
            type: 'text',
            label: 'Localisation',
            required: true
          },
          details: {
            id: 'details',
            type: 'textarea',
            label: 'Détails',
            required: true,
            options: {
              aiSuggest: true,
              aiContext: 'project_description'
            }
          },
          tags: {
            id: 'tags',
            type: 'select',
            label: 'Tags',
            default: [],
            options: {
              mode: 'tags',
              placeholder: 'Ajoutez des tags (Ex: Solaire, Résidentiel, Commercial)',
              tokenSeparators: [',']
            }
          },
          date: {
            id: 'date',
            type: 'text',
            label: 'Date (optionnelle)',
            default: ''
          }
        },
        aiSuggest: true
      }
    },
    
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
              columns: { mobile: 1, tablet: 2, desktop: 4 },
              gap: '24px'
            }
          }
        ]
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
            id: 'tagColor',
            type: 'color',
            label: 'Couleur des tags',
            default: '#10b981'
          }
        ]
      }
    }
  ],
  
  defaults: {
    title: 'Nos Dernières Réalisations',
    subtitle: 'Découvrez quelques-uns de nos projets réussis',
    showAllLink: true,
    items: [
      {
        image: '/images/project1.jpg',
        title: 'Installation Résidentielle 9 kWc',
        location: 'Charleroi',
        details: 'Installation de 24 panneaux solaires avec batterie de stockage.',
        tags: ['Résidentiel', 'Photovoltaïque', 'Batterie'],
        date: 'Août 2024'
      },
      {
        image: '/images/project2.jpg',
        title: 'Ferme Solaire 50 kWc',
        location: 'Namur',
        details: 'Projet agricole avec 130 panneaux haute performance.',
        tags: ['Agricole', 'Grande puissance'],
        date: 'Juillet 2024'
      }
    ],
    layout: {
      grid: {
        columns: { mobile: 1, tablet: 2, desktop: 4 },
        gap: '24px'
      }
    },
    style: {
      backgroundColor: '#ffffff',
      tagColor: '#10b981'
    }
  }
};

export default projectsSchema;
