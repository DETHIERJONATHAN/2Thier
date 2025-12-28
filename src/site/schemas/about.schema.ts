/**
 * 📄 ABOUT SECTION SCHEMA
 * 
 * Schéma pour la section "À Propos" avec image, texte et valeurs.
 * 
 * @module site/schemas/about.schema
 * @author 2Thier CRM Team
 */

import { SectionSchema } from './types';

const aboutSchema: SectionSchema = {
  type: 'about',
  name: 'À Propos',
  description: 'Section de présentation de l\'entreprise avec image et valeurs',
  category: 'content',
  icon: 'InfoCircleOutlined',
  
  fields: [
    {
      key: 'title',
      label: 'Titre',
      type: 'text',
      default: 'Qui sommes-nous ?',
      required: true,
      aiEnabled: true,
      aiPrompt: 'Génère un titre accrocheur pour la section À Propos'
    },
    {
      key: 'text',
      label: 'Texte de présentation',
      type: 'richtext',
      default: '',
      required: true,
      aiEnabled: true,
      aiPrompt: 'Rédige un texte de présentation professionnel pour l\'entreprise'
    },
    {
      key: 'image',
      label: 'Image',
      type: 'image',
      default: '/about-team.jpg'
    },
    {
      key: 'values',
      label: 'Valeurs / Points forts',
      type: 'array',
      itemSchema: {
        icon: { type: 'icon', label: 'Icône', default: 'CheckCircleOutlined' },
        title: { type: 'text', label: 'Titre', default: 'Valeur' },
        description: { type: 'text', label: 'Description', default: '' }
      },
      default: []
    },
    {
      key: 'layout',
      label: 'Disposition',
      type: 'select',
      options: [
        { value: 'image-left', label: 'Image à gauche' },
        { value: 'image-right', label: 'Image à droite' },
        { value: 'image-top', label: 'Image en haut' }
      ],
      default: 'image-left'
    },
    {
      key: 'style',
      label: 'Style',
      type: 'group',
      fields: [
        { key: 'backgroundColor', label: 'Couleur de fond', type: 'color', default: '#ffffff' },
        { key: 'textColor', label: 'Couleur du texte', type: 'color', default: '#1f2937' },
        { key: 'accentColor', label: 'Couleur d\'accent', type: 'color', default: '#10b981' }
      ]
    }
  ],
  
  defaultContent: {
    title: 'Qui sommes-nous ?',
    text: '',
    image: '/about-team.jpg',
    values: [],
    layout: 'image-left',
    style: {
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      accentColor: '#10b981'
    }
  }
};

export default aboutSchema;
