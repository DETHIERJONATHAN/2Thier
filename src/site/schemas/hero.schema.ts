/**
 * 🚀 SCHÉMA HERO SECTION
 * 
 * Section héroïque principale de la page d'accueil.
 * Grande section avec titre, sous-titre, CTA et visuel.
 * 
 * FONCTIONNALITÉS :
 * - Titre et sous-titre avec génération AI
 * - Image/vidéo de fond ou illustration
 * - Boutons CTA multiples
 * - Layout flexible (image gauche/droite/fond)
 * - Animations d'entrée
 * - Overlay et gradients
 * 
 * @module site/schemas/hero
 * @author 2Thier CRM Team
 */

import { SectionSchema } from './types';

export const heroSchema: SectionSchema = {
  type: 'hero',
  name: '🚀 Hero Section',
  icon: '🚀',
  description: 'Section principale avec titre, CTA et visuel impactant',
  category: 'content',
  aiEnabled: true,
  
  aiContext: {
    businessType: ['technology', 'energy', 'services'],
    keywords: ['hero', 'headline', 'value-proposition'],
    tone: ['inspiring', 'professional', 'energetic']
  },
  
  fields: [
    // ==================== LAYOUT ====================
    {
      id: 'layout',
      type: 'select',
      label: '📐 Disposition',
      default: 'centered',
      options: {
        choices: [
          { label: '🎯 Centré', value: 'centered' },
          { label: '◀️ Texte gauche + Image droite', value: 'left-right' },
          { label: '▶️ Image gauche + Texte droite', value: 'right-left' },
          { label: '🖼️ Image plein fond', value: 'background' },
          { label: '🎬 Vidéo plein fond', value: 'video-background' }
        ]
      }
    },
    
    // ==================== CONTENU ====================
    {
      id: 'title',
      type: 'group',
      label: '✨ Titre Principal',
      description: 'H1 de votre page - impact maximum !',
      required: true,
      options: {
        collapsible: true,
        fields: [
          {
            id: 'text',
            type: 'textarea',
            label: 'Texte',
            default: '🌞 Votre Partenaire en Transition Énergétique',
            required: true,
            options: {
              aiSuggest: true,
              aiContext: 'main_headline'
            }
          },
          {
            id: 'color',
            type: 'color',
            label: 'Couleur',
            default: 'white'
          },
          {
            id: 'fontSize',
            type: 'text',
            label: 'Taille (avec clamp)',
            default: 'clamp(32px, 8vw, 56px)'
          },
          {
            id: 'fontWeight',
            type: 'select',
            label: 'Épaisseur',
            default: 'bold',
            options: {
              choices: [
                { label: 'Normal', value: 'normal' },
                { label: 'Bold', value: 'bold' },
                { label: '600', value: '600' },
                { label: '700', value: '700' }
              ]
            }
          }
        ]
      }
    },
    
    {
      id: 'subtitle',
      type: 'group',
      label: '📄 Sous-titre',
      description: 'Description de votre proposition de valeur',
      options: {
        collapsible: true,
        fields: [
          {
            id: 'text',
            type: 'textarea',
            label: 'Texte',
            default: 'Photovoltaïque • Batteries • Bornes de Recharge • Pompes à Chaleur\nIsolation • Toiture • Électricité • Gros Œuvre',
            required: true,
            options: {
              aiSuggest: true,
              aiContext: 'value_proposition'
            }
          },
          {
            id: 'color',
            type: 'color',
            label: 'Couleur',
            default: 'rgba(255,255,255,0.95)'
          },
          {
            id: 'fontSize',
            type: 'text',
            label: 'Taille',
            default: 'clamp(16px, 4vw, 20px)'
          }
        ]
      }
    },
    
    // ==================== BOUTONS ====================
    {
      id: 'primaryButton',
      type: 'group',
      label: '🟢 Bouton principal',
      description: 'Call-to-action principal',
      default: {
        actionType: 'contact-form',
        text: 'DEMANDER UN DEVIS GRATUIT',
        formAnchor: ['#contact'],
        icon: 'RocketOutlined',
        style: {
          backgroundColor: 'white',
          borderColor: 'white',
          color: '#10b981',
          padding: '16px 32px',
          fontSize: '18px',
          fontWeight: 'bold',
          borderRadius: '8px'
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
                { label: '📋 Simulateur / Formulaire avancé', value: 'simulator-form' },
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
            default: 'DEMANDER UN DEVIS GRATUIT',
            required: true,
            options: {
              aiSuggest: true,
              aiContext: 'primary_cta'
            },
            condition: (values) => {
              const action = values?.actionType || values?.primaryButton?.actionType || 'contact-form';
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
              // 🔥 FIX: Simplifier la condition - on est déjà dans le groupe primaryButton
              // donc values contient directement { actionType, text, formAnchor, ... }
              // MAIS on doit aussi vérifier values.primaryButton pour le cas où on reçoit tout le form
              const action = values?.actionType || values?.primaryButton?.actionType;
              return action === 'contact-form';
            }
          },
          {
            id: 'simulatorSlug',
            type: 'simulator-form-selector',
            label: 'Simulateur / Formulaire avancé',
            description: 'Sélectionnez un formulaire créé dans "Formulaires de capture"',
            options: {
              placeholder: 'Sélectionnez un simulateur...'
            },
            condition: (values) => {
              const action = values?.actionType || values?.primaryButton?.actionType;
              return action === 'simulator-form';
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
              const action = values?.actionType || values?.primaryButton?.actionType;
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
              const action = values?.actionType || values?.primaryButton?.actionType;
              return action === 'internal-page';
            }
          },
          {
            id: 'customUrl',
            type: 'text',
            label: 'URL personnalisée',
            placeholder: 'https://...',
            condition: (values) => {
              const action = values?.actionType || values?.primaryButton?.actionType;
              return action === 'external-url';
            }
          },
          {
            id: 'openInNewTab',
            type: 'boolean',
            label: 'Ouvrir dans un nouvel onglet',
            default: true,
            condition: (values) => {
              const action = values?.actionType || values?.primaryButton?.actionType;
              return action === 'external-url';
            }
          },
          {
            id: 'phoneNumber',
            type: 'text',
            label: 'Numéro de téléphone',
            placeholder: '+32...',
            condition: (values) => {
              const action = values?.actionType || values?.primaryButton?.actionType;
              return action === 'phone';
            }
          },
          {
            id: 'emailAddress',
            type: 'text',
            label: 'Adresse email',
            placeholder: 'contact@exemple.be',
            condition: (values) => {
              const action = values?.actionType || values?.primaryButton?.actionType;
              return action === 'email';
            }
          },
          {
            id: 'icon',
            type: 'icon',
            label: 'Icône',
            default: 'RocketOutlined'
          },
          {
            id: 'style',
            type: 'group',
            label: 'Style',
            options: {
              collapsible: true,
              fields: [
                {
                  id: 'backgroundColor',
                  type: 'color',
                  label: 'Couleur de fond',
                  default: 'white'
                },
                {
                  id: 'borderColor',
                  type: 'color',
                  label: 'Couleur de bordure',
                  default: 'white'
                },
                {
                  id: 'color',
                  type: 'color',
                  label: 'Couleur du texte',
                  default: '#10b981'
                },
                {
                  id: 'padding',
                  type: 'text',
                  label: 'Padding',
                  default: '16px 32px'
                },
                {
                  id: 'fontSize',
                  type: 'text',
                  label: 'Taille de police',
                  default: '18px'
                },
                {
                  id: 'fontWeight',
                  type: 'select',
                  label: 'Épaisseur',
                  default: 'bold',
                  options: {
                    choices: [
                      { label: 'Normal', value: 'normal' },
                      { label: 'Bold', value: 'bold' },
                      { label: '600', value: '600' }
                    ]
                  }
                },
                {
                  id: 'borderRadius',
                  type: 'text',
                  label: 'Border Radius',
                  default: '8px'
                }
              ]
            },
            condition: (values) => {
              const action = values?.actionType || values?.primaryButton?.actionType || 'contact-form';
              return action !== 'none';
            }
          }
        ]
      }
    },

    {
      id: 'secondaryButton',
      type: 'group',
      label: '⚪ Bouton secondaire',
      description: 'Bouton alternatif (optionnel)',
      default: {
        actionType: 'scroll-to-section',
        text: 'NOS RÉALISATIONS',
        sectionAnchor: ['#projects'],
        style: {
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderColor: 'white',
          color: 'white',
          padding: '16px 32px',
          fontSize: '18px',
          borderRadius: '8px'
        }
      },
      options: {
        collapsible: true,
        fields: [
          {
            id: 'actionType',
            type: 'select',
            label: 'Type d\'action',
            default: 'scroll-to-section',
            options: {
              choices: [
                { label: 'Aucun bouton', value: 'none' },
                { label: 'Formulaire de contact', value: 'contact-form' },
                { label: '📋 Simulateur / Formulaire avancé', value: 'simulator-form' },
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
            default: 'NOS RÉALISATIONS',
            options: {
              aiSuggest: true,
              aiContext: 'secondary_cta'
            },
            condition: (values) => {
              const action = values?.actionType || values?.secondaryButton?.actionType || 'scroll-to-section';
              return action !== 'none';
            }
          },
          {
            id: 'formAnchor',
            type: 'contact-form-selector',
            label: 'Formulaire à ouvrir',
            options: {
              placeholder: 'Créer ou sélectionner un formulaire',
              allowCreate: true
            },
            condition: (values) => {
              const action = values?.actionType || values?.secondaryButton?.actionType;
              return action === 'contact-form';
            }
          },
          {
            id: 'simulatorSlug',
            type: 'simulator-form-selector',
            label: 'Simulateur / Formulaire avancé',
            description: 'Sélectionnez un formulaire créé dans "Formulaires de capture"',
            options: {
              placeholder: 'Sélectionnez un simulateur...'
            },
            condition: (values) => {
              const action = values?.actionType || values?.secondaryButton?.actionType;
              return action === 'simulator-form';
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
              const action = values?.actionType || values?.secondaryButton?.actionType;
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
              const action = values?.actionType || values?.secondaryButton?.actionType;
              return action === 'internal-page';
            }
          },
          {
            id: 'customUrl',
            type: 'text',
            label: 'URL personnalisée',
            placeholder: 'https://...',
            condition: (values) => {
              const action = values?.actionType || values?.secondaryButton?.actionType;
              return action === 'external-url';
            }
          },
          {
            id: 'openInNewTab',
            type: 'boolean',
            label: 'Ouvrir dans un nouvel onglet',
            default: false,
            condition: (values) => {
              const action = values?.actionType || values?.secondaryButton?.actionType;
              return action === 'external-url';
            }
          },
          {
            id: 'phoneNumber',
            type: 'text',
            label: 'Numéro de téléphone',
            placeholder: '+32...',
            condition: (values) => {
              const action = values?.actionType || values?.secondaryButton?.actionType;
              return action === 'phone';
            }
          },
          {
            id: 'emailAddress',
            type: 'text',
            label: 'Adresse email',
            placeholder: 'contact@exemple.be',
            condition: (values) => {
              const action = values?.actionType || values?.secondaryButton?.actionType;
              return action === 'email';
            }
          },
          {
            id: 'style',
            type: 'group',
            label: 'Style',
            options: {
              collapsible: true,
              fields: [
                {
                  id: 'backgroundColor',
                  type: 'color',
                  label: 'Couleur de fond',
                  default: 'rgba(255,255,255,0.1)'
                },
                {
                  id: 'color',
                  type: 'color',
                  label: 'Couleur du texte',
                  default: 'white'
                },
                {
                  id: 'borderColor',
                  type: 'color',
                  label: 'Couleur de bordure',
                  default: 'white'
                },
                {
                  id: 'padding',
                  type: 'text',
                  label: 'Padding',
                  default: '16px 32px'
                },
                {
                  id: 'fontSize',
                  type: 'text',
                  label: 'Taille de police',
                  default: '18px'
                },
                {
                  id: 'borderRadius',
                  type: 'text',
                  label: 'Border Radius',
                  default: '8px'
                }
              ]
            },
            condition: (values) => {
              const button = values?.secondaryButton || {};
              const action = button.actionType || (button.href ? 'external-url' : button.text ? 'scroll-to-section' : undefined);
              return action !== 'none';
            }
          }
        ]
      }
    },

    {
      id: 'footer',
      type: 'group',
      label: '🏅 Footer Badge',
      description: 'Texte sous les boutons avec icône',
      options: {
        collapsible: true,
        fields: [
          {
            id: 'text',
            type: 'text',
            label: 'Texte',
            default: '+500 installations réalisées • 4.9/5 de satisfaction'
          },
          {
            id: 'icon',
            type: 'icon',
            label: 'Icône',
            default: 'CheckCircleOutlined'
          },
          {
            id: 'color',
            type: 'color',
            label: 'Couleur',
            default: 'rgba(255,255,255,0.9)'
          },
          {
            id: 'fontSize',
            type: 'text',
            label: 'Taille de police',
            default: '16px'
          }
        ]
      }
    },

    
    // ==================== VISUEL ====================
    {
      id: 'media',
      type: 'group',
      label: '🖼️ Visuel',
      options: {
        collapsible: true,
        fields: [
          {
            id: 'type',
            type: 'select',
            label: 'Type de média',
            default: 'image',
            options: {
              choices: [
                { label: '🖼️ Image', value: 'image' },
                { label: '🎬 Vidéo', value: 'video' },
                { label: '🎨 Illustration', value: 'illustration' },
                { label: '🚫 Aucun', value: 'none' }
              ]
            }
          },
          {
            id: 'image',
            type: 'image',
            label: 'Image',
            description: 'Recommandé : 1920x1080px, format JPG/PNG',
            options: {
              maxSize: 5,
              aspectRatio: 16 / 9,
              allowCrop: true,
              aiSuggest: true,
              aiContext: 'hero_image'
            },
            condition: (values) => values.media?.type === 'image'
          },
          {
            id: 'videoUrl',
            type: 'text',
            label: 'URL de la vidéo',
            description: 'YouTube, Vimeo ou lien direct (.mp4)',
            condition: (values) => values.media?.type === 'video'
          },
          {
            id: 'illustrationName',
            type: 'select',
            label: 'Illustration',
            description: 'Bibliothèque d\'illustrations intégrées',
            options: {
              choices: [
                { label: '☀️ Panneau solaire', value: 'solar-panel' },
                { label: '🏠 Maison verte', value: 'green-house' },
                { label: '⚡ Énergie', value: 'energy' },
                { label: '🌍 Planète', value: 'planet' }
              ]
            },
            condition: (values) => values.media?.type === 'illustration'
          },
          {
            id: 'alt',
            type: 'text',
            label: 'Texte alternatif (SEO)',
            description: 'Description pour accessibilité et référencement',
            options: {
              aiSuggest: true,
              aiContext: 'alt_text'
            }
          }
        ]
      }
    },
    
    // ==================== OVERLAY ====================
    {
      id: 'overlay',
      type: 'group',
      label: '🎨 Overlay & Fond',
      description: 'Pour améliorer la lisibilité sur les images',
      options: {
        collapsible: true,
        fields: [
          {
            id: 'enabled',
            type: 'boolean',
            label: 'Activer l\'overlay',
            default: true,
            condition: (values) => ['image', 'video'].includes(values.media?.type)
          },
          {
            id: 'color',
            type: 'color',
            label: 'Couleur de l\'overlay',
            default: '#000000',
            condition: (values) => values.overlay?.enabled === true
          },
          {
            id: 'opacity',
            type: 'slider',
            label: 'Opacité (%)',
            default: 40,
            options: {
              min: 0,
              max: 90,
              step: 5
            },
            condition: (values) => values.overlay?.enabled === true
          },
          {
            id: 'gradient',
            type: 'boolean',
            label: 'Utiliser un dégradé',
            default: false,
            condition: (values) => values.overlay?.enabled === true
          },
          {
            id: 'gradientDirection',
            type: 'select',
            label: 'Direction du dégradé',
            default: 'to bottom',
            options: {
              choices: [
                { label: '↓ Haut vers bas', value: 'to bottom' },
                { label: '→ Gauche vers droite', value: 'to right' },
                { label: '↘️ Diagonal', value: 'to bottom right' }
              ]
            },
            condition: (values) => values.overlay?.gradient === true
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
            id: 'background',
            type: 'text',
            label: 'Fond (couleur ou gradient)',
            default: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
            description: 'CSS background. Ex: #fff ou linear-gradient(...)'
          },
          {
            id: 'backgroundColor',
            type: 'color',
            label: 'Couleur de fond (alternative)',
            default: '#f9fafb',
            description: 'Utiliser si pas de gradient'
          },
          {
            id: 'minHeight',
            type: 'text',
            label: 'Hauteur minimale',
            default: '600px',
            description: 'Ex: 600px, 100vh, 80vh'
          },
          {
            id: 'padding',
            type: 'text',
            label: 'Padding',
            default: '60px 24px',
            description: 'Ex: 60px 24px'
          },
          {
            id: 'textAlign',
            type: 'select',
            label: 'Alignement du texte',
            default: 'center',
            options: {
              choices: [
                { label: 'Gauche', value: 'left' },
                { label: 'Centre', value: 'center' },
                { label: 'Droite', value: 'right' }
              ]
            }
          },
          {
            id: 'textColor',
            type: 'color',
            label: 'Couleur du texte',
            default: '#111827'
          },
          {
            id: 'titleColor',
            type: 'color',
            label: 'Couleur du titre',
            default: '#10b981',
            description: 'Laissez vide pour utiliser textColor'
          },
          {
            id: 'height',
            type: 'select',
            label: 'Hauteur de la section (alternative)',
            default: 'screen',
            options: {
              choices: [
                { label: '🖥️ Plein écran (100vh)', value: 'screen' },
                { label: '📏 Grand (80vh)', value: 'large' },
                { label: '📐 Moyen (60vh)', value: 'medium' },
                { label: '📊 Petit (40vh)', value: 'small' },
                { label: '📦 Auto', value: 'auto' }
              ]
            }
          },
          {
            id: 'maxWidth',
            type: 'text',
            label: 'Largeur maximale du contenu',
            default: '1200px',
            description: 'Largeur avec unité (px, rem, vw). Ex: 1200px, 90vw'
          },
          {
            id: 'alignment',
            type: 'select',
            label: 'Alignement horizontal',
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
    
    // ==================== TYPOGRAPHIE ====================
    {
      id: 'typography',
      type: 'group',
      label: '✍️ Typographie',
      options: {
        collapsible: true,
        fields: [
          {
            id: 'titleSize',
            type: 'text',
            label: 'Taille du titre',
            default: '48px',
            description: 'Taille avec unité (px, rem, em). Ex: 48px, 3rem'
          },
          {
            id: 'titleWeight',
            type: 'select',
            label: 'Épaisseur du titre',
            default: '700',
            options: {
              choices: [
                { label: 'Semi-Bold (600)', value: '600' },
                { label: 'Bold (700)', value: '700' },
                { label: 'Extra-Bold (800)', value: '800' }
              ]
            }
          },
          {
            id: 'subtitleSize',
            type: 'text',
            label: 'Taille du sous-titre',
            default: '18px',
            description: 'Taille avec unité (px, rem, em). Ex: 18px, 1.125rem'
          },
          {
            id: 'lineHeight',
            type: 'slider',
            label: 'Hauteur de ligne',
            default: 1.5,
            options: {
              min: 1,
              max: 2,
              step: 0.1
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
            id: 'enabled',
            type: 'boolean',
            label: 'Activer les animations',
            default: true
          },
          {
            id: 'titleAnimation',
            type: 'select',
            label: 'Animation du titre',
            default: 'fadeInUp',
            options: {
              choices: [
                { label: 'Fade In Up', value: 'fadeInUp' },
                { label: 'Fade In', value: 'fadeIn' },
                { label: 'Slide In Left', value: 'slideInLeft' },
                { label: 'Slide In Right', value: 'slideInRight' },
                { label: 'Zoom In', value: 'zoomIn' }
              ]
            },
            condition: (values) => values.animations?.enabled === true
          },
          {
            id: 'delay',
            type: 'slider',
            label: 'Délai entre éléments (ms)',
            default: 100,
            options: {
              min: 0,
              max: 500,
              step: 50
            },
            condition: (values) => values.animations?.enabled === true
          }
        ]
      }
    },
    
    // ==================== RESPONSIVE ====================
    {
      id: 'responsive',
      type: 'group',
      label: '📱 Responsive',
      options: {
        collapsible: true,
        fields: [
          {
            id: 'mobileTitleSize',
            type: 'text',
            label: 'Taille titre mobile',
            default: '32px',
            description: 'Taille avec unité (px, rem). Ex: 32px, 2rem'
          },
          {
            id: 'mobileSubtitleSize',
            type: 'text',
            label: 'Taille sous-titre mobile',
            default: '16px',
            description: 'Taille avec unité (px, rem). Ex: 16px, 1rem'
          },
          {
            id: 'mobileLayout',
            type: 'select',
            label: 'Layout mobile',
            default: 'stacked',
            options: {
              choices: [
                { label: 'Empilé (texte puis image)', value: 'stacked' },
                { label: 'Image de fond', value: 'background' }
              ]
            }
          },
          {
            id: 'hideHighlightsOnMobile',
            type: 'boolean',
            label: 'Masquer les points clés sur mobile',
            default: false
          }
        ]
      }
    }
  ],
  
  defaults: {
    layout: 'centered',
    content: {
      surtitle: '',
      title: 'Votre partenaire en <strong>énergie solaire</strong>',
      subtitle: 'Installation de panneaux photovoltaïques pour particuliers et entreprises. Économisez jusqu\'à 70% sur vos factures d\'électricité.',
      highlight: [
        { icon: 'CheckCircleOutlined', text: 'Installation en 48h' },
        { icon: 'DollarOutlined', text: 'Prix garanti sans surprises' },
        { icon: 'SafetyOutlined', text: 'Garantie 25 ans' }
      ]
    },
    primaryButton: {
      actionType: 'contact-form',
      text: 'DEMANDER UN DEVIS GRATUIT',
      formAnchor: ['#contact'],
      icon: 'RocketOutlined',
      openInNewTab: true,
      style: {
        backgroundColor: 'white',
        borderColor: 'white',
        color: '#10b981',
        padding: '16px 32px',
        fontSize: '18px',
        fontWeight: 'bold',
        borderRadius: '8px'
      }
    },
    secondaryButton: {
      actionType: 'scroll-to-section',
      text: 'Voir nos réalisations',
      sectionAnchor: ['#projects'],
      openInNewTab: false,
      style: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderColor: 'white',
        color: 'white',
        padding: '16px 32px',
        fontSize: '18px',
        borderRadius: '8px'
      }
    },
    media: {
      type: 'image',
      alt: 'Panneaux solaires sur toit'
    },
    overlay: {
      enabled: true,
      color: '#000000',
      opacity: 40,
      gradient: false
    },
    style: {
      backgroundColor: '#f9fafb',
      textColor: '#111827',
      titleColor: '#10b981',
      height: 'screen',
      padding: '80px 24px',
      maxWidth: '1200px',
      alignment: 'center'
    },
    typography: {
      titleSize: '48px',
      titleWeight: '700',
      subtitleSize: '18px',
      lineHeight: 1.5
    },
    animations: {
      enabled: true,
      titleAnimation: 'fadeInUp',
      delay: 100
    },
    responsive: {
      mobileTitleSize: '32px',
      mobileSubtitleSize: '16px',
      mobileLayout: 'stacked',
      hideHighlightsOnMobile: false
    }
  }
};

export default heroSchema;
