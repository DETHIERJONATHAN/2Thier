/**
 * 📦 MODULE REGISTRY - Définit tous les modules disponibles pour les documents
 * Chaque module peut être ajouté sur n'importe quelle page
 */

export type ModuleCategory = 'content' | 'layout' | 'data' | 'legal' | 'media' | 'interaction';

export interface ModuleTheme {
  id: string;
  name: string;
  description: string;
  preview?: string; // URL preview image
  styles: Record<string, any>;
}

export interface ModuleDefinition {
  id: string;
  name: string;
  icon: string;
  category: ModuleCategory;
  description: string;
  // Configuration par défaut du module
  defaultConfig: Record<string, any>;
  // Thèmes disponibles pour ce module
  themes: ModuleTheme[];
  // Champs configurables
  configFields: ConfigField[];
  // Peut être redimensionné ?
  resizable?: boolean;
  // Dimensions par défaut (en % de la page)
  defaultSize?: { width: number; height: number };
}

export interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'color' | 'select' | 'image' | 'toggle' | 'date' | 'rich-text' | 'data-binding';
  options?: { value: string; label: string }[];
  defaultValue?: any;
  placeholder?: string;
  group?: string; // Pour regrouper les champs
  /**
   * Pour type='data-binding': autoriser la saisie manuelle en plus de la sélection TBL
   */
  allowManualInput?: boolean;
}

/**
 * 🗂️ CATÉGORIES DE MODULES
 */
export const MODULE_CATEGORIES: Record<ModuleCategory, { name: string; icon: string; color: string }> = {
  content: { name: 'Contenu', icon: '📝', color: '#1890ff' },
  layout: { name: 'Mise en page', icon: '📐', color: '#722ed1' },
  data: { name: 'Données', icon: '📊', color: '#52c41a' },
  legal: { name: 'Légal', icon: '⚖️', color: '#faad14' },
  media: { name: 'Médias', icon: '🖼️', color: '#eb2f96' },
  interaction: { name: 'Interaction', icon: '✍️', color: '#13c2c2' },
};

/**
 * 📦 REGISTRE DES MODULES DISPONIBLES
 */
export const MODULE_REGISTRY: ModuleDefinition[] = [
  // ============== CONTENT ==============
  {
    id: 'TITLE',
    name: 'Titre',
    icon: '📌',
    category: 'content',
    description: 'Titre principal ou secondaire',
    resizable: true,
    defaultSize: { width: 100, height: 10 },
    defaultConfig: {
      text: 'Titre du document',
      level: 'h1',
      alignment: 'center',
    },
    themes: [
      {
        id: 'modern',
        name: 'Moderne',
        description: 'Style épuré avec accent de couleur',
        styles: { fontFamily: 'Inter, sans-serif', fontWeight: 700, letterSpacing: '-0.5px' }
      },
      {
        id: 'classic',
        name: 'Classique',
        description: 'Style traditionnel élégant',
        styles: { fontFamily: 'Georgia, serif', fontWeight: 400, fontStyle: 'italic' }
      },
      {
        id: 'bold',
        name: 'Impact',
        description: 'Style fort et impactant',
        styles: { fontFamily: 'Arial Black, sans-serif', fontWeight: 900, textTransform: 'uppercase' }
      },
      {
        id: 'minimal',
        name: 'Minimaliste',
        description: 'Style très léger',
        styles: { fontFamily: 'Helvetica, sans-serif', fontWeight: 300, letterSpacing: '2px' }
      },
    ],
    configFields: [
      { key: 'text', label: 'Texte', type: 'text', placeholder: 'Entrez le titre...', allowManualInput: true },
      { key: 'dataBinding', label: '🔗 Lier à une donnée TBL', type: 'data-binding', placeholder: 'Sélectionner une variable...', group: 'data' },
      { key: 'level', label: 'Niveau', type: 'select', options: [
        { value: 'h1', label: 'Titre principal (H1)' },
        { value: 'h2', label: 'Sous-titre (H2)' },
        { value: 'h3', label: 'Section (H3)' },
      ]},
      { key: 'alignment', label: 'Alignement', type: 'select', options: [
        { value: 'left', label: 'Gauche' },
        { value: 'center', label: 'Centré' },
        { value: 'right', label: 'Droite' },
      ]},
      { key: 'color', label: 'Couleur', type: 'color', defaultValue: '#000000' },
      { key: 'fontSize', label: 'Taille (px)', type: 'number', defaultValue: 32 },
    ]
  },
  {
    id: 'SUBTITLE',
    name: 'Sous-titre',
    icon: '📎',
    category: 'content',
    description: 'Texte d\'accompagnement',
    resizable: true,
    defaultSize: { width: 100, height: 5 },
    defaultConfig: {
      text: 'Sous-titre explicatif',
      alignment: 'center',
    },
    themes: [
      { id: 'light', name: 'Léger', description: 'Style discret', styles: { opacity: 0.7, fontWeight: 300 } },
      { id: 'accent', name: 'Accentué', description: 'Avec couleur d\'accent', styles: { fontWeight: 500 } },
    ],
    configFields: [
      { key: 'text', label: 'Texte', type: 'textarea', placeholder: 'Entrez le sous-titre...', allowManualInput: true },
      { key: 'dataBinding', label: '🔗 Lier à une donnée TBL', type: 'data-binding', placeholder: 'Sélectionner une variable...', group: 'data' },
      { key: 'alignment', label: 'Alignement', type: 'select', options: [
        { value: 'left', label: 'Gauche' },
        { value: 'center', label: 'Centré' },
        { value: 'right', label: 'Droite' },
      ]},
      { key: 'color', label: 'Couleur', type: 'color', defaultValue: '#666666' },
      { key: 'fontSize', label: 'Taille (px)', type: 'number', defaultValue: 18 },
    ]
  },
  {
    id: 'TEXT_BLOCK',
    name: 'Bloc de texte',
    icon: '📄',
    category: 'content',
    description: 'Paragraphe de texte libre',
    resizable: true,
    defaultSize: { width: 100, height: 20 },
    defaultConfig: {
      content: '<p>Entrez votre texte ici...</p>',
    },
    themes: [
      { id: 'standard', name: 'Standard', description: 'Texte simple', styles: {} },
      { id: 'highlight', name: 'Encadré', description: 'Avec fond coloré', styles: { backgroundColor: '#f5f5f5', padding: '20px', borderRadius: '8px' } },
    ],
    configFields: [
      { key: 'content', label: 'Contenu', type: 'rich-text' },
      { key: 'dataBinding', label: '🔗 Lier à une donnée TBL', type: 'data-binding', placeholder: 'Sélectionner une variable pour insérer...', group: 'data' },
      { key: 'fontSize', label: 'Taille (px)', type: 'number', defaultValue: 14 },
      { key: 'lineHeight', label: 'Interligne', type: 'number', defaultValue: 1.6 },
    ]
  },

  // ============== MEDIA ==============
  {
    id: 'IMAGE',
    name: 'Image',
    icon: '🖼️',
    category: 'media',
    description: 'Image ou logo',
    resizable: true,
    defaultSize: { width: 40, height: 30 },
    defaultConfig: {
      src: '',
      alt: 'Image',
      objectFit: 'contain',
    },
    themes: [
      { id: 'normal', name: 'Normal', description: 'Image simple', styles: {} },
      { id: 'rounded', name: 'Arrondi', description: 'Coins arrondis', styles: { borderRadius: '12px' } },
      { id: 'circle', name: 'Cercle', description: 'Image circulaire', styles: { borderRadius: '50%' } },
      { id: 'shadow', name: 'Ombre', description: 'Avec ombre portée', styles: { boxShadow: '0 8px 24px rgba(0,0,0,0.15)' } },
      { id: 'framed', name: 'Encadré', description: 'Avec bordure', styles: { border: '2px solid #e8e8e8', padding: '8px' } },
    ],
    configFields: [
      { key: 'src', label: 'Image', type: 'image' },
      { key: 'alt', label: 'Description', type: 'text', placeholder: 'Description de l\'image' },
      { key: 'objectFit', label: 'Ajustement', type: 'select', options: [
        { value: 'contain', label: 'Contenir' },
        { value: 'cover', label: 'Couvrir' },
        { value: 'fill', label: 'Étirer' },
      ]},
      { key: 'opacity', label: 'Opacité (%)', type: 'number', defaultValue: 100 },
    ]
  },
  {
    id: 'BACKGROUND',
    name: 'Fond',
    icon: '🎨',
    category: 'media',
    description: 'Image ou couleur de fond',
    resizable: false,
    defaultConfig: {
      type: 'color',
      color: '#ffffff',
      image: '',
      overlay: true,
      overlayColor: 'rgba(0,0,0,0.3)',
    },
    themes: [
      { id: 'solid', name: 'Couleur unie', description: 'Fond simple', styles: {} },
      { id: 'gradient', name: 'Dégradé', description: 'Dégradé de couleurs', styles: {} },
      { id: 'image', name: 'Image', description: 'Image de fond', styles: {} },
    ],
    configFields: [
      { key: 'type', label: 'Type', type: 'select', options: [
        { value: 'color', label: 'Couleur' },
        { value: 'gradient', label: 'Dégradé' },
        { value: 'image', label: 'Image' },
      ]},
      { key: 'color', label: 'Couleur', type: 'color', defaultValue: '#ffffff', group: 'color' },
      { key: 'gradientStart', label: 'Dégradé début', type: 'color', group: 'gradient' },
      { key: 'gradientEnd', label: 'Dégradé fin', type: 'color', group: 'gradient' },
      { key: 'gradientAngle', label: 'Angle (°)', type: 'number', defaultValue: 45, group: 'gradient' },
      { key: 'image', label: 'Image', type: 'image', group: 'image' },
      { key: 'overlay', label: 'Overlay', type: 'toggle', group: 'image' },
      { key: 'overlayColor', label: 'Couleur overlay', type: 'color', group: 'image' },
    ]
  },

  // ============== DATA ==============
  {
    id: 'PRICING_TABLE',
    name: 'Tableau des prix',
    icon: '💰',
    category: 'data',
    description: 'Tableau de produits/services avec prix',
    resizable: true,
    defaultSize: { width: 100, height: 40 },
    defaultConfig: {
      title: 'Détail du devis',
      columns: ['Désignation', 'Quantité', 'Prix unitaire', 'Total'],
      /**
       * 🆕 SYSTÈME DE LIGNES DYNAMIQUES
       * Chaque ligne peut être :
       * - type: 'static' → Ligne fixe avec valeurs manuelles
       * - type: 'dynamic' → Liée à une source de données TBL (formule, condition, calculatedValue)
       * - type: 'repeater' → Génère N lignes selon les instances du repeater
       * 
       * Structure d'une ligne:
       * {
       *   id: string,                    // ID unique de la ligne
       *   type: 'static' | 'dynamic' | 'repeater',
       *   label: string,                 // Texte de la désignation (peut contenir des tokens @value.xxx)
       *   labelSource?: string,          // Pour type='dynamic': référence TBL pour le label
       *   quantity: number | string,     // Quantité (ou token @value.xxx pour calcul dynamique)
       *   quantitySource?: string,       // Référence TBL pour la quantité
       *   unitPrice: number | string,    // Prix unitaire (ou token @calculated.xxx, node-formula:xxx)
       *   unitPriceSource?: string,      // Référence TBL pour le prix unitaire
       *   total?: number | string,       // Total (généralement auto-calculé ou token)
       *   totalSource?: string,          // Référence TBL pour le total
       *   repeaterId?: string,           // Pour type='repeater': ID du repeater
       *   condition?: ConditionalConfig, // Condition d'affichage de la ligne
       *   order: number                  // Ordre d'affichage
       * }
       */
      pricingLines: [],
      showTotal: true,
      showTVA: true,
      tvaRate: 21,
      currency: '€',
    },
    themes: [
      { id: 'modern', name: 'Moderne', description: 'Style épuré', styles: { borderRadius: '8px', overflow: 'hidden' } },
      { id: 'classic', name: 'Classique', description: 'Bordures traditionnelles', styles: { border: '1px solid #000' } },
      { id: 'zebra', name: 'Rayures', description: 'Lignes alternées', styles: {} },
      { id: 'minimal', name: 'Minimal', description: 'Sans bordures', styles: { border: 'none' } },
    ],
    configFields: [
      { key: 'title', label: 'Titre du tableau', type: 'text' },
      // Note: pricingLines est géré par un éditeur spécial dans SectionConfigPanel
      { key: 'showTotal', label: 'Afficher le total', type: 'toggle', defaultValue: true },
      { key: 'showTVA', label: 'Afficher la TVA', type: 'toggle', defaultValue: true },
      { key: 'tvaRate', label: 'Taux TVA (%)', type: 'number', defaultValue: 21 },
      { key: 'currency', label: 'Devise', type: 'select', options: [
        { value: '€', label: 'Euro (€)' },
        { value: '$', label: 'Dollar ($)' },
        { value: '£', label: 'Livre (£)' },
      ]},
    ]
  },
  {
    id: 'DATA_TABLE',
    name: 'Tableau de données',
    icon: '📊',
    category: 'data',
    description: 'Tableau personnalisable',
    resizable: true,
    defaultSize: { width: 100, height: 30 },
    defaultConfig: {
      columns: [{ key: 'col1', label: 'Colonne 1' }],
      rows: [],
    },
    themes: [
      { id: 'standard', name: 'Standard', description: 'Style par défaut', styles: {} },
      { id: 'compact', name: 'Compact', description: 'Espacement réduit', styles: { padding: '4px 8px' } },
    ],
    configFields: [
      { key: 'headerBackground', label: 'Fond en-tête', type: 'color', defaultValue: '#f5f5f5' },
      { key: 'headerColor', label: 'Texte en-tête', type: 'color', defaultValue: '#000000' },
      { key: 'borderColor', label: 'Couleur bordure', type: 'color', defaultValue: '#e8e8e8' },
    ]
  },
  {
    id: 'DATE_BLOCK',
    name: 'Date',
    icon: '📅',
    category: 'data',
    description: 'Affiche une date (ex: date du devis)',
    resizable: true,
    defaultSize: { width: 30, height: 5 },
    defaultConfig: {
      format: 'long',
      prefix: 'Date:',
      value: 'today',
    },
    themes: [
      { id: 'inline', name: 'En ligne', description: 'Texte simple', styles: {} },
      { id: 'badge', name: 'Badge', description: 'Dans un encadré', styles: { backgroundColor: '#f0f0f0', padding: '8px 16px', borderRadius: '4px' } },
    ],
    configFields: [
      { key: 'prefix', label: 'Préfixe', type: 'text', placeholder: 'Date:' },
      { key: 'format', label: 'Format', type: 'select', options: [
        { value: 'short', label: 'Court (21/12/2025)' },
        { value: 'long', label: 'Long (21 décembre 2025)' },
        { value: 'full', label: 'Complet (Dimanche 21 décembre 2025)' },
      ]},
      { key: 'value', label: 'Date', type: 'select', options: [
        { value: 'today', label: 'Aujourd\'hui' },
        { value: 'custom', label: 'Personnalisée' },
      ]},
      { key: 'customDate', label: 'Date personnalisée', type: 'date' },
    ]
  },

  // ============== LEGAL ==============
  {
    id: 'TERMS_CONDITIONS',
    name: 'Conditions générales',
    icon: '📜',
    category: 'legal',
    description: 'Conditions générales de vente',
    resizable: true,
    defaultSize: { width: 100, height: 50 },
    defaultConfig: {
      title: 'Conditions Générales',
      content: '',
      fontSize: 10,
      columns: 1,
    },
    themes: [
      { id: 'standard', name: 'Standard', description: 'Texte normal', styles: {} },
      { id: 'compact', name: 'Compact', description: 'Petit texte dense', styles: { fontSize: '9px', lineHeight: 1.3 } },
      { id: 'twoColumns', name: '2 colonnes', description: 'Sur deux colonnes', styles: {} },
    ],
    configFields: [
      { key: 'title', label: 'Titre', type: 'text' },
      { key: 'content', label: 'Contenu', type: 'rich-text' },
      { key: 'fontSize', label: 'Taille texte (px)', type: 'number', defaultValue: 10 },
      { key: 'columns', label: 'Colonnes', type: 'select', options: [
        { value: 1, label: '1 colonne' },
        { value: 2, label: '2 colonnes' },
      ]},
    ]
  },

  // ============== INTERACTION ==============
  {
    id: 'SIGNATURE_BLOCK',
    name: 'Bloc signature',
    icon: '✍️',
    category: 'interaction',
    description: 'Zone de signature client/prestataire',
    resizable: true,
    defaultSize: { width: 100, height: 25 },
    defaultConfig: {
      layout: 'side-by-side',
      clientLabel: 'Le Client',
      companyLabel: 'Pour l\'entreprise',
      showDate: true,
      showMention: true,
      mention: 'Lu et approuvé, bon pour accord',
    },
    themes: [
      { id: 'standard', name: 'Standard', description: 'Zones côte à côte', styles: {} },
      { id: 'formal', name: 'Formel', description: 'Avec encadré', styles: { border: '1px solid #000', padding: '20px' } },
      { id: 'modern', name: 'Moderne', description: 'Style épuré', styles: { borderTop: '2px solid #e8e8e8' } },
    ],
    configFields: [
      { key: 'layout', label: 'Disposition', type: 'select', options: [
        { value: 'side-by-side', label: 'Côte à côte' },
        { value: 'stacked', label: 'Empilé' },
      ]},
      { key: 'clientLabel', label: 'Label client', type: 'text' },
      { key: 'companyLabel', label: 'Label entreprise', type: 'text' },
      { key: 'showDate', label: 'Afficher date', type: 'toggle', defaultValue: true },
      { key: 'showMention', label: 'Mention manuscrite', type: 'toggle', defaultValue: true },
      { key: 'mention', label: 'Texte mention', type: 'text' },
    ]
  },
  {
    id: 'CONTACT_INFO',
    name: 'Coordonnées',
    icon: '📞',
    category: 'interaction',
    description: 'Informations de contact',
    resizable: true,
    defaultSize: { width: 50, height: 15 },
    defaultConfig: {
      title: 'Nous contacter',
      showPhone: true,
      showEmail: true,
      showAddress: true,
      showWebsite: true,
    },
    themes: [
      { id: 'list', name: 'Liste', description: 'Format liste', styles: {} },
      { id: 'card', name: 'Carte', description: 'Dans un encadré', styles: { backgroundColor: '#f5f5f5', padding: '16px', borderRadius: '8px' } },
      { id: 'inline', name: 'En ligne', description: 'Sur une ligne', styles: {} },
    ],
    configFields: [
      { key: 'title', label: 'Titre', type: 'text' },
      { key: 'phone', label: 'Téléphone', type: 'text' },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'address', label: 'Adresse', type: 'textarea' },
      { key: 'website', label: 'Site web', type: 'text' },
      { key: 'showPhone', label: 'Afficher téléphone', type: 'toggle', defaultValue: true },
      { key: 'showEmail', label: 'Afficher email', type: 'toggle', defaultValue: true },
      { key: 'showAddress', label: 'Afficher adresse', type: 'toggle', defaultValue: true },
      { key: 'showWebsite', label: 'Afficher site', type: 'toggle', defaultValue: true },
    ]
  },

  // ============== LAYOUT ==============
  {
    id: 'SPACER',
    name: 'Espacement',
    icon: '↕️',
    category: 'layout',
    description: 'Espace vertical entre modules',
    resizable: true,
    defaultSize: { width: 100, height: 5 },
    defaultConfig: {
      height: 40,
    },
    themes: [
      { id: 'empty', name: 'Vide', description: 'Espace blanc', styles: {} },
      { id: 'line', name: 'Ligne', description: 'Avec séparateur', styles: { borderBottom: '1px solid #e8e8e8' } },
      { id: 'dashed', name: 'Pointillés', description: 'Ligne pointillée', styles: { borderBottom: '2px dashed #e8e8e8' } },
    ],
    configFields: [
      { key: 'height', label: 'Hauteur (px)', type: 'number', defaultValue: 40 },
    ]
  },
  {
    id: 'DIVIDER',
    name: 'Séparateur',
    icon: '➖',
    category: 'layout',
    description: 'Ligne de séparation horizontale',
    resizable: false,
    defaultConfig: {
      style: 'solid',
      thickness: 1,
      color: '#e8e8e8',
      margin: 20,
    },
    themes: [
      { id: 'solid', name: 'Solide', description: 'Ligne continue', styles: {} },
      { id: 'dashed', name: 'Tirets', description: 'Ligne en tirets', styles: { borderStyle: 'dashed' } },
      { id: 'dotted', name: 'Points', description: 'Ligne pointillée', styles: { borderStyle: 'dotted' } },
      { id: 'double', name: 'Double', description: 'Double ligne', styles: { borderStyle: 'double', borderWidth: '3px' } },
    ],
    configFields: [
      { key: 'thickness', label: 'Épaisseur (px)', type: 'number', defaultValue: 1 },
      { key: 'color', label: 'Couleur', type: 'color', defaultValue: '#e8e8e8' },
      { key: 'margin', label: 'Marge (px)', type: 'number', defaultValue: 20 },
      { key: 'width', label: 'Largeur (%)', type: 'number', defaultValue: 100 },
    ]
  },
  {
    id: 'PAGE_BREAK',
    name: 'Saut de page',
    icon: '📃',
    category: 'layout',
    description: 'Force un saut de page à l\'impression',
    resizable: false,
    defaultConfig: {},
    themes: [],
    configFields: []
  },

  // ============== ADDITIONAL CONTENT ==============
  {
    id: 'TIMELINE',
    name: 'Calendrier/Planning',
    icon: '📆',
    category: 'data',
    description: 'Planning ou échéancier du projet',
    resizable: true,
    defaultSize: { width: 100, height: 30 },
    defaultConfig: {
      title: 'Planning prévisionnel',
      steps: [
        { date: '', label: 'Étape 1', description: '' },
      ],
    },
    themes: [
      { id: 'horizontal', name: 'Horizontal', description: 'Timeline horizontale', styles: {} },
      { id: 'vertical', name: 'Vertical', description: 'Timeline verticale', styles: {} },
      { id: 'table', name: 'Tableau', description: 'Format tableau', styles: {} },
    ],
    configFields: [
      { key: 'title', label: 'Titre', type: 'text' },
    ]
  },
  {
    id: 'TESTIMONIAL',
    name: 'Témoignage',
    icon: '💬',
    category: 'content',
    description: 'Citation ou témoignage client',
    resizable: true,
    defaultSize: { width: 80, height: 20 },
    defaultConfig: {
      quote: 'Témoignage du client...',
      author: 'Nom du client',
      company: 'Entreprise',
      avatar: '',
    },
    themes: [
      { id: 'simple', name: 'Simple', description: 'Citation simple', styles: {} },
      { id: 'card', name: 'Carte', description: 'Dans un encadré', styles: { backgroundColor: '#f9f9f9', padding: '24px', borderRadius: '12px' } },
      { id: 'quote', name: 'Guillemets', description: 'Avec guillemets décoratifs', styles: {} },
    ],
    configFields: [
      { key: 'quote', label: 'Citation', type: 'textarea' },
      { key: 'author', label: 'Auteur', type: 'text' },
      { key: 'company', label: 'Entreprise', type: 'text' },
      { key: 'avatar', label: 'Photo', type: 'image' },
    ]
  },
  {
    id: 'COMPANY_PRESENTATION',
    name: 'Présentation entreprise',
    icon: '🏢',
    category: 'content',
    description: 'Bloc de présentation de l\'entreprise',
    resizable: true,
    defaultSize: { width: 100, height: 35 },
    defaultConfig: {
      title: 'À propos de nous',
      description: '',
      showLogo: true,
      showStats: true,
      stats: [
        { value: '10+', label: 'Années d\'expérience' },
        { value: '500+', label: 'Projets réalisés' },
        { value: '98%', label: 'Clients satisfaits' },
      ],
    },
    themes: [
      { id: 'standard', name: 'Standard', description: 'Présentation classique', styles: {} },
      { id: 'modern', name: 'Moderne', description: 'Style épuré', styles: {} },
      { id: 'detailed', name: 'Détaillé', description: 'Avec statistiques', styles: {} },
    ],
    configFields: [
      { key: 'title', label: 'Titre', type: 'text' },
      { key: 'description', label: 'Description', type: 'rich-text' },
      { key: 'showLogo', label: 'Afficher logo', type: 'toggle', defaultValue: true },
      { key: 'showStats', label: 'Afficher stats', type: 'toggle', defaultValue: true },
    ]
  },
  {
    id: 'FAQ',
    name: 'FAQ',
    icon: '❓',
    category: 'content',
    description: 'Questions fréquentes',
    resizable: true,
    defaultSize: { width: 100, height: 40 },
    defaultConfig: {
      title: 'Questions fréquentes',
      items: [
        { question: 'Question 1?', answer: 'Réponse 1' },
      ],
    },
    themes: [
      { id: 'list', name: 'Liste', description: 'Format liste', styles: {} },
      { id: 'accordion', name: 'Accordéon', description: 'Style accordéon', styles: {} },
    ],
    configFields: [
      { key: 'title', label: 'Titre', type: 'text' },
    ]
  },
];

/**
 * 🔍 HELPERS
 */
export const getModuleById = (id: string): ModuleDefinition | undefined => {
  return MODULE_REGISTRY.find(m => m.id === id);
};

export const getModulesByCategory = (category: ModuleCategory): ModuleDefinition[] => {
  return MODULE_REGISTRY.filter(m => m.category === category);
};

export const getAllCategories = (): ModuleCategory[] => {
  return Object.keys(MODULE_CATEGORIES) as ModuleCategory[];
};
