/**
 * 🦶 SCHÉMA FOOTER
 * 
 * Pied de page du site avec liens, infos légales, réseaux sociaux.
 * 
 * FONCTIONNALITÉS :
 * - Logo et description
 * - Colonnes de liens (multi-colonnes)
 * - Réseaux sociaux
 * - Newsletter (optionnel)
 * - Copyright et mentions légales
 * - Multi-colonnes responsive
 * 
 * @module site/schemas/footer
 * @author 2Thier CRM Team
 */

import { SectionSchema } from './types';

export const footerSchema: SectionSchema = {
  type: 'footer',
  name: '🦶 Footer',
  icon: '🦶',
  description: 'Pied de page avec liens et informations',
  category: 'layout',
  aiEnabled: true,
  
  aiContext: {
    businessType: ['technology', 'energy', 'services'],
    keywords: ['footer', 'links', 'contact'],
    tone: ['professional', 'clear']
  },
  
  fields: [
    // ==================== LOGO & DESCRIPTION ====================
    {
      id: 'brand',
      type: 'group',
      label: '🎨 Branding',
      options: {
        collapsible: true,
        fields: [
          {
            id: 'name',
            type: 'text',
            label: 'Nom de l\'entreprise',
            default: '2THIER ENERGY',
            options: {
              aiSuggest: true,
              aiContext: 'company_name'
            }
          },
          {
            id: 'tagline',
            type: 'textarea',
            label: 'Slogan / Description',
            default: 'Votre partenaire en transition énergétique depuis 2020',
            options: {
              aiSuggest: true,
              aiContext: 'company_description'
            }
          }
        ]
      }
    },
    
    // ==================== COLONNES DE LIENS ====================
    {
      id: 'columns',
      type: 'array',
      label: '📋 Colonnes de Liens',
      description: 'Sections de liens (Services, À propos, Légal, etc.)',
      default: [
        {
          title: 'Services',
          links: [
            { label: 'Installation Solaire', url: '/services/installation' },
            { label: 'Maintenance', url: '/services/maintenance' },
            { label: 'Financement', url: '/services/financement' }
          ]
        },
        {
          title: 'Entreprise',
          links: [
            { label: 'À propos', url: '/about' },
            { label: 'Nos valeurs', url: '/values' },
            { label: 'Carrières', url: '/careers' }
          ]
        },
        {
          title: 'Support',
          links: [
            { label: 'Contact', url: '/contact' },
            { label: 'FAQ', url: '/faq' },
            { label: 'Documentation', url: '/docs' }
          ]
        },
        {
          title: 'Légal',
          links: [
            { label: 'Mentions légales', url: '/legal' },
            { label: 'Politique de confidentialité', url: '/privacy' },
            { label: 'CGV', url: '/terms' }
          ]
        }
      ],
      options: {
        draggable: true,
        maxItems: 6,
        itemType: {
          title: {
            id: 'title',
            type: 'text',
            label: 'Titre de la colonne',
            required: true
          },
          links: {
            id: 'links',
            type: 'array',
            label: 'Liens',
            options: {
              maxItems: 8,
              itemType: {
                label: {
                  id: 'label',
                  type: 'text',
                  label: 'Label'
                },
                url: {
                  id: 'url',
                  type: 'text',
                  label: 'URL'
                }
              }
            }
          }
        }
      }
    },
    
    // ==================== CONTACT ====================
    {
      id: 'contact',
      type: 'group',
      label: '📞 Contact',
      options: {
        collapsible: true,
        fields: [
          {
            id: 'enabled',
            type: 'boolean',
            label: 'Afficher les informations de contact',
            default: true
          },
          {
            id: 'title',
            type: 'text',
            label: 'Titre de la section',
            default: 'CONTACT',
            condition: (values) => values.enabled === true
          },
          {
            id: 'phone',
            type: 'text',
            label: 'Numéro de téléphone',
            default: '071/XX.XX.XX',
            options: {
              placeholder: '071/XX.XX.XX'
            },
            condition: (values) => values.enabled === true
          },
          {
            id: 'email',
            type: 'text',
            label: 'Adresse email',
            default: 'info@2thier.be',
            options: {
              placeholder: 'info@entreprise.be'
            },
            condition: (values) => values.enabled === true
          },
          {
            id: 'hours',
            type: 'text',
            label: 'Horaires d\'ouverture',
            default: 'Lu-Ve: 8h-18h',
            options: {
              placeholder: 'Lu-Ve: 8h-18h'
            },
            condition: (values) => values.enabled === true
          },
          {
            id: 'address',
            type: 'textarea',
            label: 'Adresse physique',
            default: '',
            options: {
              placeholder: 'Rue, Code postal, Ville',
              rows: 2
            },
            condition: (values) => values.enabled === true
          }
        ]
      }
    },
    
    // ==================== RÉSEAUX SOCIAUX ====================
    {
      id: 'social',
      type: 'group',
      label: '📱 Réseaux Sociaux',
      options: {
        collapsible: true,
        fields: [
          {
            id: 'enabled',
            type: 'boolean',
            label: 'Afficher les réseaux sociaux',
            default: true
          },
          {
            id: 'title',
            type: 'text',
            label: 'Titre',
            default: 'Suivez-nous',
            condition: (values) => {
              // Dans un groupe, values contient les valeurs du groupe lui-même
              return values.enabled === true;
            }
          },
          {
            id: 'links',
            type: 'array',
            label: 'Liens sociaux',
            default: [
              { platform: 'facebook', url: 'https://facebook.com/2thier', icon: 'FacebookOutlined' },
              { platform: 'linkedin', url: 'https://linkedin.com/company/2thier', icon: 'LinkedinOutlined' },
              { platform: 'instagram', url: 'https://instagram.com/2thier', icon: 'InstagramOutlined' }
            ],
            options: {
              maxItems: 8,
              itemType: {
                platform: {
                  id: 'platform',
                  type: 'select',
                  label: 'Plateforme',
                  options: {
                    choices: [
                      { label: 'Facebook', value: 'facebook' },
                      { label: 'LinkedIn', value: 'linkedin' },
                      { label: 'Instagram', value: 'instagram' },
                      { label: 'Twitter/X', value: 'twitter' },
                      { label: 'YouTube', value: 'youtube' },
                      { label: 'TikTok', value: 'tiktok' }
                    ]
                  }
                },
                url: {
                  id: 'url',
                  type: 'text',
                  label: 'URL',
                  options: {
                    placeholder: 'https://...'
                  }
                },
                icon: {
                  id: 'icon',
                  type: 'icon',
                  label: 'Icône'
                },
                openInNewTab: {
                  id: 'openInNewTab',
                  type: 'boolean',
                  label: 'Ouvrir dans un nouvel onglet',
                  default: true
                }
              }
            },
            condition: (values) => {
              // Dans un groupe, values contient les valeurs du groupe lui-même
              return values.enabled === true;
            }
          }
        ]
      }
    },
    
    // ==================== NEWSLETTER ====================
    {
      id: 'newsletter',
      type: 'group',
      label: '📧 Newsletter',
      options: {
        collapsible: true,
        fields: [
          {
            id: 'enabled',
            type: 'boolean',
            label: 'Activer la newsletter',
            default: false
          },
          {
            id: 'title',
            type: 'text',
            label: 'Titre',
            default: 'Restez informé',
            condition: (values) => values.enabled === true
          },
          {
            id: 'description',
            type: 'textarea',
            label: 'Description',
            default: 'Recevez nos actualités et conseils par email',
            condition: (values) => values.enabled === true
          },
          {
            id: 'placeholder',
            type: 'text',
            label: 'Placeholder input',
            default: 'Votre email',
            condition: (values) => values.enabled === true
          },
          {
            id: 'buttonText',
            type: 'text',
            label: 'Texte du bouton',
            default: 'S\'inscrire',
            condition: (values) => values.enabled === true
          }
        ]
      }
    },
    
    // ==================== COPYRIGHT ====================
    {
      id: 'copyright',
      type: 'group',
      label: '©️ Copyright',
      options: {
        collapsible: true,
        fields: [
          {
            id: 'text',
            type: 'text',
            label: 'Texte copyright',
            default: '© 2025 2Thier Energy. Tous droits réservés.',
            options: {
              aiSuggest: true,
              aiContext: 'copyright_text'
            }
          },
          {
            id: 'legalLinks',
            type: 'array',
            label: 'Liens légaux',
            default: [
              { label: 'Mentions légales', url: '/legal' },
              { label: 'Politique de confidentialité', url: '/privacy' },
              { label: 'Cookies', url: '/cookies' }
            ],
            options: {
              maxItems: 5,
              itemType: {
                label: {
                  id: 'label',
                  type: 'text',
                  label: 'Label'
                },
                url: {
                  id: 'url',
                  type: 'text',
                  label: 'URL'
                }
              }
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
            default: '#111827'
          },
          {
            id: 'textColor',
            type: 'color',
            label: 'Couleur du texte',
            default: '#d1d5db'
          },
          {
            id: 'titleColor',
            type: 'color',
            label: 'Couleur des titres',
            default: '#ffffff'
          },
          {
            id: 'linkColor',
            type: 'color',
            label: 'Couleur des liens',
            default: '#9ca3af'
          },
          {
            id: 'linkHoverColor',
            type: 'color',
            label: 'Couleur liens au survol',
            default: '#10b981'
          },
          {
            id: 'dividerColor',
            type: 'color',
            label: 'Couleur du séparateur',
            default: '#374151'
          },
          {
            id: 'copyrightColor',
            type: 'color',
            label: 'Couleur du copyright',
            default: '#6b7280',
            description: 'Couleur du texte de copyright en bas'
          },
          {
            id: 'copyrightFontSize',
            type: 'size',
            label: 'Taille du copyright',
            default: '14px'
          },
          {
            id: 'padding',
            type: 'spacing',
            label: 'Padding',
            default: '60px 24px 24px 24px'
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
            id: 'columns',
            type: 'grid',
            label: 'Configuration colonnes',
            default: {
              columns: { mobile: 1, tablet: 2, desktop: 4 },
              gap: '32px',
              alignment: 'start',
              justifyContent: 'start'
            },
            options: {
              responsive: true
            }
          }
        ]
      }
    }
  ],
  
  defaults: {
    brand: {
      name: '2THIER ENERGY',
      tagline: 'Votre partenaire en transition énergétique depuis 2020'
    },
    columns: [
      {
        title: 'SOLUTIONS',
        links: [
          { label: 'Photovoltaïque', url: '/solutions/photovoltaique' },
          { label: 'Batteries', url: '/solutions/batteries' },
          { label: 'Bornes de Recharge', url: '/solutions/bornes' },
          { label: 'Pompes à Chaleur', url: '/solutions/pompes-chaleur' }
        ]
      },
      {
        title: 'ENTREPRISE',
        links: [
          { label: 'À propos', url: '/about' },
          { label: 'Réalisations', url: '/realisations' },
          { label: 'Blog', url: '/blog' },
          { label: 'Contact', url: '/contact' }
        ]
      },
      {
        title: 'CONTACT',
        links: []
      }
    ],
    contact: {
      enabled: true,
      title: 'CONTACT',
      phone: '071/XX.XX.XX',
      email: 'info@2thier.be',
      hours: 'Lu-Ve: 8h-18h',
      address: ''
    },
    social: {
      enabled: true,
      title: 'Suivez-nous',
      links: [
        { platform: 'facebook', url: 'https://facebook.com/2thier', icon: 'FacebookOutlined', openInNewTab: true },
        { platform: 'linkedin', url: 'https://linkedin.com/company/2thier', icon: 'LinkedinOutlined', openInNewTab: true },
        { platform: 'instagram', url: 'https://instagram.com/2thier', icon: 'InstagramOutlined', openInNewTab: true }
      ]
    },
    newsletter: {
      enabled: false,
      title: 'Restez informé',
      description: 'Recevez nos actualités et conseils par email',
      placeholder: 'Votre email',
      buttonText: 'S\'inscrire'
    },
    copyright: {
      text: '© 2025 2Thier Energy - Tous droits réservés • BE 0XXX.XXX.XXX • Agrégation Classe 1 • RESCERT Certifié',
      legalLinks: []
    },
    style: {
      backgroundColor: '#1f2937',
      textColor: '#d1d5db',
      titleColor: '#ffffff',
      linkColor: '#9ca3af',
      linkHoverColor: '#10b981',
      dividerColor: '#374151',
      copyrightColor: '#6b7280',
      copyrightFontSize: '14px',
      padding: '60px 24px 24px 24px'
    },
    layout: {
      columns: {
        columns: { mobile: 1, tablet: 2, desktop: 4 },
        gap: '32px',
        alignment: 'start',
        justifyContent: 'start'
      }
    }
  }
};

export default footerSchema;
