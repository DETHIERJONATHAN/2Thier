/**
 * 📞 CONTACT SECTION SCHEMA
 * 
 * Schéma pour la section Contact avec formulaire, carte et informations.
 * 
 * @module site/schemas/contact.schema
 * @author 2Thier CRM Team
 */

import { SectionSchema } from './types';

const contactSchema: SectionSchema = {
  type: 'contact',
  name: 'Contact',
  description: 'Section de contact avec formulaire et informations',
  category: 'conversion',
  icon: 'MailOutlined',
  
  fields: [
    {
      key: 'title',
      label: 'Titre',
      type: 'text',
      default: 'Contactez-nous',
      required: true,
      aiEnabled: true,
      aiPrompt: 'Génère un titre engageant pour la section contact'
    },
    {
      key: 'subtitle',
      label: 'Sous-titre',
      type: 'text',
      default: 'Notre équipe est à votre disposition',
      aiEnabled: true
    },
    {
      key: 'showForm',
      label: 'Afficher le formulaire',
      type: 'boolean',
      default: true
    },
    {
      key: 'showMap',
      label: 'Afficher la carte',
      type: 'boolean',
      default: true
    },
    {
      key: 'showInfo',
      label: 'Afficher les informations',
      type: 'boolean',
      default: true
    },
    {
      key: 'contactInfo',
      label: 'Informations de contact',
      type: 'group',
      fields: [
        { key: 'email', label: 'Email', type: 'text', default: 'contact@2thier.be' },
        { key: 'phone', label: 'Téléphone', type: 'text', default: '+32 4 123 45 67' },
        { key: 'address', label: 'Adresse', type: 'textarea', default: '' }
      ]
    },
    {
      key: 'style',
      label: 'Style',
      type: 'group',
      fields: [
        { key: 'backgroundColor', label: 'Couleur de fond', type: 'color', default: '#f9fafb' },
        { key: 'textColor', label: 'Couleur du texte', type: 'color', default: '#1f2937' },
        { key: 'accentColor', label: 'Couleur d\'accent', type: 'color', default: '#10b981' }
      ]
    }
  ],
  
  defaultContent: {
    title: 'Contactez-nous',
    subtitle: 'Notre équipe est à votre disposition',
    showForm: true,
    showMap: true,
    showInfo: true,
    contactInfo: {
      email: 'contact@2thier.be',
      phone: '+32 4 123 45 67',
      address: ''
    },
    style: {
      backgroundColor: '#f9fafb',
      textColor: '#1f2937',
      accentColor: '#10b981'
    }
  }
};

export default contactSchema;
