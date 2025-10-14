/**
 * 📌 SCHÉMA HEADER/NAVIGATION
 * 
 * Définit la structure complète d'une section header/navigation.
 * Ce schéma génère automatiquement l'interface d'édition et le rendu.
 * 
 * FONCTIONNALITÉS :
 * - Logo (texte, image, emoji)
 * - Menu de navigation avec glisser-déposer
 * - Boutons CTA configurables
 * - Style sticky, transparent, animations
 * - Responsive automatique
 * 
 * @module site/schemas/header
 * @author 2Thier CRM Team
 */

import { SectionSchema } from './types';

/**
 * 🎯 Schéma complet du Header
 */
export const headerSchema: SectionSchema = {
  type: 'header',
  name: '📌 Header / Navigation',
  icon: '📌',
  description: 'En-tête de site avec logo, menu et boutons',
  category: 'layout',
  aiEnabled: true,
  
  aiContext: {
    businessType: ['technology', 'energy', 'services'],
    keywords: ['navigation', 'branding', 'menu'],
    tone: ['professional', 'modern']
  },
  
  fields: [
    // ==================== LOGO ====================
    {
      id: 'logo',
      type: 'group',
      label: '🎨 Logo et Branding',
      description: 'Configuration du logo de votre entreprise',
      options: {
        collapsible: true,
        fields: [
          {
            id: 'type',
            type: 'select',
            label: 'Type de logo',
            default: 'text',
            options: {
              choices: [
                { label: '📝 Texte', value: 'text' },
                { label: '🖼️ Image', value: 'image' },
                { label: '🎭 Texte + Emoji', value: 'text-emoji' },
                { label: '🖼️📝 Image + Texte', value: 'image-text' }
              ]
            }
          },
          {
            id: 'text',
            type: 'text',
            label: 'Texte du logo',
            default: '2THIER ENERGY',
            options: {
              aiSuggest: true,
              aiContext: 'company_name'
            },
            condition: (values) => values?.logo?.type && ['text', 'text-emoji', 'image-text'].includes(values.logo.type)
          },
          {
            id: 'emoji',
            type: 'icon',
            label: 'Emoji/Icône',
            default: '⚡',
            description: 'Choisissez un emoji ou une icône Ant Design',
            condition: (values) => values?.logo?.type === 'text-emoji'
          },
          {
            id: 'image',
            type: 'image',
            label: 'Image du logo',
            description: 'Format recommandé : PNG transparent, max 2MB',
            options: {
              maxSize: 2,
              aspectRatio: 16 / 9,
              allowCrop: true,
              aiSuggest: false
            },
            condition: (values) => values?.logo?.type && ['image', 'image-text'].includes(values.logo.type)
          },
          {
            id: 'level',
            type: 'select',
            label: 'Niveau de titre (H1-H6)',
            default: '3',
            options: {
              choices: [
                { label: 'H1', value: '1' },
                { label: 'H2', value: '2' },
                { label: 'H3', value: '3' },
                { label: 'H4', value: '4' },
                { label: 'H5', value: '5' },
                { label: 'H6', value: '6' }
              ]
            }
          },
          {
            id: 'color',
            type: 'color',
            label: 'Couleur',
            default: '#10b981',
            options: {
              aiSuggest: true,
              aiContext: 'brand_color'
            }
          },
          {
            id: 'fontSize',
            type: 'text',
            label: 'Taille de police',
            default: '24px',
            description: 'Taille avec unité (px, rem, em). Ex: 24px, 1.5rem',
            options: {
              aiSuggest: true
            }
          },
          {
            id: 'fontWeight',
            type: 'select',
            label: 'Épaisseur',
            default: '600',
            options: {
              choices: [
                { label: 'Light (300)', value: '300' },
                { label: 'Normal (400)', value: '400' },
                { label: 'Medium (500)', value: '500' },
                { label: 'Semi-Bold (600)', value: '600' },
                { label: 'Bold (700)', value: '700' }
              ]
            }
          },
          {
            id: 'margin',
            type: 'spacing',
            label: 'Marge',
            default: '0',
            description: 'Marge autour du logo'
          }
        ]
      }
    },
    
    // ==================== NAVIGATION ====================
    {
      id: 'navigation',
      type: 'group',
      label: '📋 Menu de Navigation',
      description: 'Configuration de la navigation principale',
      options: {
        collapsible: true,
        fields: [
          {
            id: 'links',
            type: 'array',
            label: 'Liens de navigation',
            description: 'Glissez-déposez pour réorganiser',
            default: [
              { text: 'Accueil', href: '/' },
              { text: 'Services', href: '/services' },
              { text: 'Réalisations', href: '/projects' },
              { text: 'Contact', href: '/contact' }
            ],
            options: {
              draggable: true,
              maxItems: 8,
              itemType: {
                text: {
                  id: 'text',
                  type: 'text',
                  label: 'Texte du lien',
                  required: true,
                  options: {
                    aiSuggest: true,
                    aiContext: 'menu_label'
                  }
                },
                href: {
                  id: 'href',
                  type: 'section-anchor-selector',
                  label: 'URL',
                  required: true,
                  default: '/',
                  description: 'Sélectionnez une section ou entrez une URL personnalisée',
                  options: {
                    placeholder: 'Sélectionnez une section ou saisissez #votre-ancre',
                    allowCustom: true
                  }
                },
                icon: {
                  id: 'icon',
                  type: 'icon',
                  label: 'Icône (optionnel)',
                  description: 'Affichée à côté du texte du menu'
                },
                iconColor: {
                  id: 'iconColor',
                  type: 'color',
                  label: 'Couleur de l\'icône',
                  description: 'Laissez vide pour utiliser la couleur du menu'
                }
              },
              aiSuggest: true
            }
          }
        ]
      }
    },
    
    // ==================== STYLE MENU ====================
    {
      id: 'menuStyle',
      type: 'group',
      label: '🎨 Style du Menu',
      options: {
        collapsible: true,
        fields: [
          {
            id: 'color',
            type: 'color',
            label: 'Couleur des liens',
            default: '#000000'
          },
          {
            id: 'hoverColor',
            type: 'color',
            label: 'Couleur au survol',
            default: '#10b981'
          },
          {
            id: 'iconColor',
            type: 'color',
            label: 'Couleur des icônes',
            default: '#000000',
            description: 'Couleur des icônes dans le menu (si présentes)'
          },
          {
            id: 'fontSize',
            type: 'text',
            label: 'Taille de police',
            default: '16px',
            description: 'Taille avec unité (px, rem, em). Ex: 16px, 1rem'
          },
          {
            id: 'fontWeight',
            type: 'select',
            label: 'Épaisseur',
            default: '500',
            options: {
              choices: [
                { label: 'Normal (400)', value: '400' },
                { label: 'Medium (500)', value: '500' },
                { label: 'Semi-Bold (600)', value: '600' }
              ]
            }
          },
          {
            id: 'spacing',
            type: 'slider',
            label: 'Espacement entre liens (px)',
            default: 32,
            options: {
              min: 8,
              max: 64,
              step: 4
            }
          }
        ]
      }
    },
    
    // ==================== BOUTON CTA ====================
    {
      id: 'cta',
      type: 'group',
      label: '🔘 Bouton d\'Action (CTA)',
      description: 'Bouton principal d\'appel à l\'action',
      default: {
        actionType: 'contact-form',
        text: 'DEVIS GRATUIT',
        formAnchor: ['#contact'],
        buttonType: 'primary',
        buttonSize: 'large',
        style: {
          backgroundColor: '#10b981',
          borderColor: '#10b981',
          color: '#ffffff',
          fontWeight: 'bold'
        }
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
                { label: 'Lien externe', value: 'external-url' },
                { label: 'Téléphone', value: 'phone' },
                { label: 'Email', value: 'email' }
              ],
              placeholder: 'Sélectionnez l\'action du bouton'
            }
          },
          {
            id: 'text',
            type: 'text',
            label: 'Texte du bouton',
            required: true,
            default: 'DEVIS GRATUIT',
            options: {
              aiSuggest: true,
              aiContext: 'cta_text'
            },
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
              const action = values?.actionType;
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
          },
          {
            id: 'openInNewTab',
            type: 'boolean',
            label: 'Ouvrir dans un nouvel onglet',
            default: true,
            condition: (values) => {
              const action = values?.actionType;
              return action === 'external-url';
            }
          },
          {
            id: 'phoneNumber',
            type: 'text',
            label: 'Numéro de téléphone',
            placeholder: '+32...',
            condition: (values) => {
              const action = values?.actionType;
              return action === 'phone';
            }
          },
          {
            id: 'emailAddress',
            type: 'text',
            label: 'Adresse email',
            placeholder: 'contact@exemple.be',
            condition: (values) => {
              const action = values?.actionType;
              return action === 'email';
            }
          },
          {
            id: 'buttonType',
            type: 'select',
            label: 'Style',
            default: 'primary',
            options: {
              choices: [
                { label: 'Primaire (plein)', value: 'primary' },
                { label: 'Secondaire (contour)', value: 'default' },
                { label: 'Fantôme', value: 'ghost' },
                { label: 'Texte', value: 'text' }
              ]
            },
            condition: (values) => {
              const action = values?.actionType;
              return action !== 'none';
            }
          },
          {
            id: 'buttonSize',
            type: 'select',
            label: 'Taille',
            default: 'large',
            options: {
              choices: [
                { label: 'Petit', value: 'small' },
                { label: 'Normal', value: 'middle' },
                { label: 'Grand', value: 'large' }
              ]
            },
            condition: (values) => {
              const action = values?.actionType;
              return action !== 'none';
            }
          },
          {
            id: 'style',
            type: 'group',
            label: 'Style personnalisé',
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
                  id: 'fontWeight',
                  type: 'select',
                  label: 'Épaisseur',
                  default: 'bold',
                  options: {
                    choices: [
                      { label: 'Normal', value: 'normal' },
                      { label: 'Medium', value: '500' },
                      { label: 'Semi-Bold', value: '600' },
                      { label: 'Bold', value: 'bold' }
                    ]
                  }
                }
              ]
            },
            condition: (values) => {
              const action = values?.actionType;
              return action !== 'none';
            }
          }
        ]
      }
    },
    
    // ==================== COMPORTEMENT ====================
    {
      id: 'behavior',
      type: 'group',
      label: '⚙️ Comportement',
      options: {
        collapsible: true,
        fields: [
          {
            id: 'sticky',
            type: 'boolean',
            label: 'Header collant (sticky)',
            description: 'Reste visible lors du scroll',
            default: true
          },
          {
            id: 'transparent',
            type: 'boolean',
            label: 'Transparent au chargement',
            description: 'Devient opaque au scroll',
            default: false
          },
          {
            id: 'transparentScrollBg',
            type: 'color',
            label: 'Couleur au scroll',
            default: '#ffffff',
            condition: (values) => values?.behavior?.transparent === true
          },
          {
            id: 'showShadow',
            type: 'boolean',
            label: 'Afficher l\'ombre',
            default: true
          },
          {
            id: 'shadowOnScroll',
            type: 'boolean',
            label: 'Ombre uniquement au scroll',
            default: false
          },
          {
            id: 'hideOnScroll',
            type: 'boolean',
            label: 'Masquer au scroll vers le bas',
            default: false
          }
        ]
      }
    },
    
    // ==================== STYLE GÉNÉRAL ====================
    {
      id: 'style',
      type: 'group',
      label: '🎨 Style Général',
      options: {
        collapsible: true,
        fields: [
          {
            id: 'backgroundColor',
            type: 'text',
            label: 'Couleur de fond (hex ou rgba)',
            default: 'rgba(255, 255, 255, 0.98)',
            description: 'Supporte rgba() pour transparence. Ex: rgba(255,255,255,0.98)'
          },
          {
            id: 'height',
            type: 'text',
            label: 'Hauteur (ex: 64px, 5rem, 10vh)',
            default: '64px',
            description: 'Hauteur avec unité (px, rem, vh, etc.)'
          },
          {
            id: 'padding',
            type: 'spacing',
            label: 'Padding',
            default: '0 24px'
          },
          {
            id: 'maxWidth',
            type: 'text',
            label: 'Largeur maximale du contenu (ex: 1200px, 90vw)',
            default: '1200px',
            description: 'Largeur avec unité'
          },
          {
            id: 'boxShadow',
            type: 'text',
            label: 'Ombre (box-shadow)',
            default: '0 2px 8px rgba(0,0,0,0.06)',
            description: 'CSS box-shadow'
          },
          {
            id: 'zIndex',
            type: 'number',
            label: 'Z-index',
            default: 1000,
            options: {
              min: 0,
              max: 9999,
              step: 10
            }
          },
          {
            id: 'logoAlign',
            type: 'select',
            label: '🎨 Position du Logo',
            default: 'flex-start',
            options: {
              choices: [
                { label: '⬅️ Gauche', value: 'flex-start' },
                { label: '➡️ Centre', value: 'center' },
                { label: '↗️ Droite', value: 'flex-end' }
              ]
            }
          },
          {
            id: 'menuAlign',
            type: 'select',
            label: '📋 Position du Menu',
            default: 'center',
            options: {
              choices: [
                { label: '⬅️ Gauche', value: 'flex-start' },
                { label: '➡️ Centre', value: 'center' },
                { label: '↗️ Droite', value: 'flex-end' }
              ]
            }
          },
          {
            id: 'ctaAlign',
            type: 'select',
            label: '🔘 Position du Bouton CTA',
            default: 'flex-end',
            options: {
              choices: [
                { label: '⬅️ Gauche', value: 'flex-start' },
                { label: '➡️ Centre', value: 'center' },
                { label: '↗️ Droite', value: 'flex-end' }
              ]
            }
          },
          {
            id: 'alignItems',
            type: 'select',
            label: 'Alignement vertical',
            default: 'center',
            options: {
              choices: [
                { label: '⬆️ Haut', value: 'flex-start' },
                { label: '↔️ Centre', value: 'center' },
                { label: '⬇️ Bas', value: 'flex-end' }
              ]
            }
          }
        ]
      }
    },
    
    // ==================== RESPONSIVE ====================
    {
      id: 'responsive',
      type: 'group',
      label: '📱 Responsive Mobile',
      options: {
        collapsible: true,
        fields: [
          {
            id: 'mobileMenuType',
            type: 'select',
            label: 'Type de menu mobile',
            default: 'drawer',
            options: {
              choices: [
                { label: '☰ Menu Burger', value: 'drawer' },
                { label: '📱 Bottom Bar', value: 'bottom' },
                { label: '▼ Dropdown', value: 'dropdown' }
              ]
            }
          },
          {
            id: 'mobileBreakpoint',
            type: 'number',
            label: 'Point de rupture mobile (px)',
            default: 768,
            description: 'Le menu mobile s\'active en-dessous de cette largeur'
          },
          {
            id: 'hiddenOnMobile',
            type: 'select',
            label: 'Masquer sur mobile',
            description: 'Éléments à cacher sur petit écran',
            options: {
              choices: [
                { label: 'CTA secondaire', value: 'secondary-cta' },
                { label: 'Sous-menus', value: 'submenus' },
                { label: 'Icônes du menu', value: 'menu-icons' }
              ]
            }
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
            id: 'slideDown',
            type: 'boolean',
            label: 'Slide down au chargement',
            default: false
          },
          {
            id: 'fadeIn',
            type: 'boolean',
            label: 'Fade in au scroll',
            default: false
          },
          {
            id: 'animationDuration',
            type: 'slider',
            label: 'Durée animation (ms)',
            default: 300,
            options: {
              min: 100,
              max: 1000,
              step: 50
            }
          }
        ]
      }
    }
  ],
  
  // Valeurs par défaut complètes
  defaults: {
    logo: {
      type: 'text',
      text: '⚡ 2THIER ENERGY',
      color: '#10b981',
      fontSize: '24px',
      fontWeight: 'bold',
      margin: '0'
    },
    navigation: {
      links: [
        { text: 'Accueil', href: '/' },
        { text: 'Services', href: '/services' },
        { text: 'Réalisations', href: '/projects' },
        { text: 'Contact', href: '/contact' }
      ]
    },
    menuStyle: {
      color: '#000000',
      hoverColor: '#10b981',
      fontSize: '16px',
      fontWeight: '500',
      spacing: 32
    },
    cta: {
      actionType: 'contact-form',
      text: 'DEVIS GRATUIT',
      formAnchor: ['#contact'],
      buttonType: 'primary',
      buttonSize: 'large',
      openInNewTab: true,
      style: {
        backgroundColor: '#10b981',
        borderColor: '#10b981',
        color: '#ffffff',
        fontWeight: 'bold'
      }
    },
    behavior: {
      sticky: true,
      transparent: false,
      showShadow: true,
      shadowOnScroll: false,
      hideOnScroll: false
    },
    style: {
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      height: '64px',
      padding: '0 24px',
      maxWidth: '1200px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      zIndex: 1000,
      logoAlign: 'flex-start',
      menuAlign: 'center',
      ctaAlign: 'flex-end',
      alignItems: 'center'
    },
    responsive: {
      mobileMenuType: 'drawer',
      mobileBreakpoint: 768,
      hiddenOnMobile: []
    },
    animations: {
      slideDown: false,
      fadeIn: false,
      animationDuration: 300
    }
  }
};

export default headerSchema;
