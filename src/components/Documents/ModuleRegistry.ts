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

  // ============== MODULES PROFESSIONNELS (HEADERS/FOOTERS) ==============
  
  /**
   * 🏢 EN-TÊTE ENTREPRISE
   * Logo + coordonnées de l'entreprise (haut gauche des documents)
   */
  {
    id: 'COMPANY_HEADER',
    name: 'En-tête Entreprise',
    icon: '🏢',
    category: 'layout',
    description: 'Logo et coordonnées de votre entreprise',
    resizable: true,
    defaultSize: { width: 50, height: 20 },
    defaultConfig: {
      showLogo: true,
      logoPosition: 'left',
      showName: true,
      showAddress: true,
      showPhone: true,
      showEmail: true,
      showTVA: true,
      showWebsite: false,
      layout: 'horizontal', // horizontal | vertical | compact
    },
    themes: [
      { id: 'modern', name: 'Moderne', description: 'Style épuré avec accent de couleur', styles: { borderLeft: '4px solid', paddingLeft: '16px' } },
      { id: 'classic', name: 'Classique', description: 'Style traditionnel', styles: {} },
      { id: 'minimal', name: 'Minimaliste', description: 'Logo + nom seulement', styles: { opacity: 0.9 } },
      { id: 'boxed', name: 'Encadré', description: 'Dans un cadre', styles: { border: '1px solid #e8e8e8', padding: '16px', borderRadius: '8px' } },
    ],
    configFields: [
      { key: 'logo', label: 'Logo', type: 'image', group: 'logo' },
      { key: 'logoSize', label: 'Taille logo (px)', type: 'number', defaultValue: 80, group: 'logo' },
      { key: 'logoPosition', label: 'Position logo', type: 'select', options: [
        { value: 'left', label: 'À gauche' },
        { value: 'top', label: 'Au-dessus' },
        { value: 'right', label: 'À droite' },
      ], group: 'logo' },
      { key: 'companyName', label: 'Nom entreprise', type: 'text', placeholder: '{org.name}', allowManualInput: true },
      { key: 'companyNameBinding', label: '🔗 Lier le nom', type: 'data-binding', group: 'data' },
      { key: 'address', label: 'Adresse', type: 'textarea', placeholder: '{org.address}', allowManualInput: true },
      { key: 'addressBinding', label: '🔗 Lier l\'adresse', type: 'data-binding', group: 'data' },
      { key: 'phone', label: 'Téléphone', type: 'text', placeholder: '{org.phone}' },
      { key: 'email', label: 'Email', type: 'text', placeholder: '{org.email}' },
      { key: 'tva', label: 'N° TVA', type: 'text', placeholder: '{org.tva}' },
      { key: 'website', label: 'Site web', type: 'text', placeholder: '{org.website}' },
      { key: 'showLogo', label: 'Afficher logo', type: 'toggle', defaultValue: true },
      { key: 'showName', label: 'Afficher nom', type: 'toggle', defaultValue: true },
      { key: 'showAddress', label: 'Afficher adresse', type: 'toggle', defaultValue: true },
      { key: 'showPhone', label: 'Afficher téléphone', type: 'toggle', defaultValue: true },
      { key: 'showEmail', label: 'Afficher email', type: 'toggle', defaultValue: true },
      { key: 'showTVA', label: 'Afficher TVA', type: 'toggle', defaultValue: true },
      { key: 'showWebsite', label: 'Afficher site web', type: 'toggle', defaultValue: false },
      { key: 'layout', label: 'Disposition', type: 'select', options: [
        { value: 'horizontal', label: 'Horizontale' },
        { value: 'vertical', label: 'Verticale' },
        { value: 'compact', label: 'Compacte' },
      ]},
    ]
  },

  /**
   * 👤 EN-TÊTE CLIENT
   * Coordonnées du client/destinataire (haut droite des documents)
   */
  {
    id: 'CLIENT_HEADER',
    name: 'En-tête Client',
    icon: '👤',
    category: 'layout',
    description: 'Coordonnées du client destinataire',
    resizable: true,
    defaultSize: { width: 50, height: 20 },
    defaultConfig: {
      title: 'À l\'attention de:',
      showTitle: true,
      showName: true,
      showCompany: true,
      showAddress: true,
      showEmail: true,
      showPhone: true,
      showTVA: false,
    },
    themes: [
      { id: 'standard', name: 'Standard', description: 'Style classique', styles: {} },
      { id: 'boxed', name: 'Encadré', description: 'Dans un cadre', styles: { border: '1px solid #e8e8e8', padding: '16px', borderRadius: '8px' } },
      { id: 'highlighted', name: 'Mis en avant', description: 'Fond coloré', styles: { backgroundColor: '#f9f9f9', padding: '16px', borderRadius: '8px' } },
      { id: 'minimal', name: 'Minimaliste', description: 'Sans cadre', styles: {} },
    ],
    configFields: [
      { key: 'title', label: 'Titre', type: 'text', defaultValue: 'À l\'attention de:' },
      { key: 'clientName', label: 'Nom client', type: 'text', placeholder: '{lead.firstName} {lead.lastName}', allowManualInput: true },
      { key: 'clientNameBinding', label: '🔗 Lier le nom', type: 'data-binding', group: 'data' },
      { key: 'clientCompany', label: 'Société', type: 'text', placeholder: '{lead.company}', allowManualInput: true },
      { key: 'clientCompanyBinding', label: '🔗 Lier la société', type: 'data-binding', group: 'data' },
      { key: 'clientAddress', label: 'Adresse', type: 'textarea', placeholder: '{lead.address}', allowManualInput: true },
      { key: 'clientAddressBinding', label: '🔗 Lier l\'adresse', type: 'data-binding', group: 'data' },
      { key: 'clientEmail', label: 'Email', type: 'text', placeholder: '{lead.email}' },
      { key: 'clientPhone', label: 'Téléphone', type: 'text', placeholder: '{lead.phone}' },
      { key: 'clientTVA', label: 'N° TVA', type: 'text', placeholder: '{lead.tva}' },
      { key: 'showTitle', label: 'Afficher titre', type: 'toggle', defaultValue: true },
      { key: 'showName', label: 'Afficher nom', type: 'toggle', defaultValue: true },
      { key: 'showCompany', label: 'Afficher société', type: 'toggle', defaultValue: true },
      { key: 'showAddress', label: 'Afficher adresse', type: 'toggle', defaultValue: true },
      { key: 'showEmail', label: 'Afficher email', type: 'toggle', defaultValue: true },
      { key: 'showPhone', label: 'Afficher téléphone', type: 'toggle', defaultValue: false },
      { key: 'showTVA', label: 'Afficher TVA', type: 'toggle', defaultValue: false },
    ]
  },

  /**
   * 📋 EN-TÊTE DOCUMENT COMBINÉ
   * Entreprise à gauche + Client à droite sur une même ligne
   */
  {
    id: 'DOCUMENT_HEADER',
    name: 'En-tête Document',
    icon: '📋',
    category: 'layout',
    description: 'Entreprise + Client côte à côte',
    resizable: true,
    defaultSize: { width: 100, height: 25 },
    defaultConfig: {
      showLogo: true,
      showCompanyInfo: true,
      showClientInfo: true,
      layout: 'side-by-side', // side-by-side | stacked
    },
    themes: [
      { id: 'modern', name: 'Moderne', description: 'Style épuré avec séparation', styles: {} },
      { id: 'classic', name: 'Classique', description: 'Style traditionnel', styles: {} },
      { id: 'bordered', name: 'Bordé', description: 'Avec bordure inférieure', styles: { borderBottom: '2px solid #e8e8e8', paddingBottom: '20px' } },
    ],
    configFields: [
      { key: 'logo', label: 'Logo entreprise', type: 'image' },
      { key: 'logoSize', label: 'Taille logo (px)', type: 'number', defaultValue: 60 },
      { key: 'companyName', label: 'Nom entreprise', type: 'text', placeholder: '{org.name}' },
      { key: 'companyAddress', label: 'Adresse entreprise', type: 'textarea', placeholder: '{org.address}' },
      { key: 'companyPhone', label: 'Tél. entreprise', type: 'text', placeholder: '{org.phone}' },
      { key: 'companyEmail', label: 'Email entreprise', type: 'text', placeholder: '{org.email}' },
      { key: 'companyTVA', label: 'TVA entreprise', type: 'text', placeholder: '{org.tva}' },
      { key: 'clientTitle', label: 'Titre client', type: 'text', defaultValue: 'Client:' },
      { key: 'clientName', label: 'Nom client', type: 'text', placeholder: '{lead.firstName} {lead.lastName}' },
      { key: 'clientCompany', label: 'Société client', type: 'text', placeholder: '{lead.company}' },
      { key: 'clientAddress', label: 'Adresse client', type: 'textarea', placeholder: '{lead.address}' },
      { key: 'clientEmail', label: 'Email client', type: 'text', placeholder: '{lead.email}' },
      { key: 'showLogo', label: 'Afficher logo', type: 'toggle', defaultValue: true },
      { key: 'showCompanyInfo', label: 'Afficher infos entreprise', type: 'toggle', defaultValue: true },
      { key: 'showClientInfo', label: 'Afficher infos client', type: 'toggle', defaultValue: true },
      { key: 'layout', label: 'Disposition', type: 'select', options: [
        { value: 'side-by-side', label: 'Côte à côte' },
        { value: 'stacked', label: 'Empilé' },
      ]},
    ]
  },

  /**
   * 📄 INFORMATIONS DOCUMENT
   * Référence, date, validité, objet
   */
  {
    id: 'DOCUMENT_INFO',
    name: 'Infos Document',
    icon: '📄',
    category: 'data',
    description: 'Référence, date et informations du document',
    resizable: true,
    defaultSize: { width: 100, height: 15 },
    defaultConfig: {
      showReference: true,
      showDate: true,
      showValidUntil: true,
      showObject: true,
      referencePrefix: 'Réf:',
      datePrefix: 'Date:',
      validUntilPrefix: 'Valide jusqu\'au:',
      objectPrefix: 'Objet:',
      layout: 'inline', // inline | stacked | table
    },
    themes: [
      { id: 'inline', name: 'En ligne', description: 'Informations sur une ligne', styles: {} },
      { id: 'badge', name: 'Badges', description: 'Dans des badges', styles: {} },
      { id: 'table', name: 'Tableau', description: 'Format tableau', styles: {} },
      { id: 'header', name: 'Titre', description: 'Gros titre centré', styles: { textAlign: 'center', fontSize: '24px', fontWeight: 'bold' } },
    ],
    configFields: [
      { key: 'reference', label: 'Référence', type: 'text', placeholder: '{quote.reference}', allowManualInput: true },
      { key: 'referenceBinding', label: '🔗 Lier la référence', type: 'data-binding', group: 'data' },
      { key: 'referencePrefix', label: 'Préfixe référence', type: 'text', defaultValue: 'Réf:' },
      { key: 'date', label: 'Date', type: 'text', placeholder: '{quote.date}', allowManualInput: true },
      { key: 'dateBinding', label: '🔗 Lier la date', type: 'data-binding', group: 'data' },
      { key: 'datePrefix', label: 'Préfixe date', type: 'text', defaultValue: 'Date:' },
      { key: 'validUntil', label: 'Valide jusqu\'au', type: 'text', placeholder: '{quote.validUntil}', allowManualInput: true },
      { key: 'validUntilBinding', label: '🔗 Lier la validité', type: 'data-binding', group: 'data' },
      { key: 'validUntilPrefix', label: 'Préfixe validité', type: 'text', defaultValue: 'Valide jusqu\'au:' },
      { key: 'object', label: 'Objet', type: 'text', placeholder: 'Objet du document...', allowManualInput: true },
      { key: 'objectBinding', label: '🔗 Lier l\'objet', type: 'data-binding', group: 'data' },
      { key: 'objectPrefix', label: 'Préfixe objet', type: 'text', defaultValue: 'Objet:' },
      { key: 'documentType', label: 'Type document', type: 'select', options: [
        { value: 'DEVIS', label: 'DEVIS' },
        { value: 'FACTURE', label: 'FACTURE' },
        { value: 'BON DE COMMANDE', label: 'BON DE COMMANDE' },
        { value: 'CONTRAT', label: 'CONTRAT' },
        { value: 'custom', label: 'Personnalisé' },
      ]},
      { key: 'showReference', label: 'Afficher référence', type: 'toggle', defaultValue: true },
      { key: 'showDate', label: 'Afficher date', type: 'toggle', defaultValue: true },
      { key: 'showValidUntil', label: 'Afficher validité', type: 'toggle', defaultValue: true },
      { key: 'showObject', label: 'Afficher objet', type: 'toggle', defaultValue: true },
      { key: 'layout', label: 'Disposition', type: 'select', options: [
        { value: 'inline', label: 'En ligne' },
        { value: 'stacked', label: 'Empilé' },
        { value: 'table', label: 'Tableau' },
      ]},
    ]
  },

  /**
   * 🦶 PIED DE PAGE DOCUMENT
   * Coordonnées entreprise + mentions légales + pagination
   */
  {
    id: 'DOCUMENT_FOOTER',
    name: 'Pied de page',
    icon: '🦶',
    category: 'layout',
    description: 'Pied de page avec infos entreprise',
    resizable: true,
    defaultSize: { width: 100, height: 10 },
    defaultConfig: {
      showCompanyInfo: true,
      showBankInfo: true,
      showPageNumber: true,
      showLegalMention: true,
      layout: 'centered', // centered | spread | minimal
    },
    themes: [
      { id: 'modern', name: 'Moderne', description: 'Style épuré', styles: { borderTop: '2px solid #e8e8e8', paddingTop: '16px' } },
      { id: 'classic', name: 'Classique', description: 'Style traditionnel', styles: { borderTop: '1px solid #000' } },
      { id: 'minimal', name: 'Minimaliste', description: 'Discret', styles: { opacity: 0.7, fontSize: '10px' } },
      { id: 'boxed', name: 'Encadré', description: 'Dans un cadre', styles: { backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '4px' } },
    ],
    configFields: [
      { key: 'companyName', label: 'Nom entreprise', type: 'text', placeholder: '{org.name}' },
      { key: 'companyPhone', label: 'Téléphone', type: 'text', placeholder: '{org.phone}' },
      { key: 'companyEmail', label: 'Email', type: 'text', placeholder: '{org.email}' },
      { key: 'companyWebsite', label: 'Site web', type: 'text', placeholder: '{org.website}' },
      { key: 'companyTVA', label: 'N° TVA', type: 'text', placeholder: '{org.tva}' },
      { key: 'bankIBAN', label: 'IBAN', type: 'text', placeholder: '{org.iban}' },
      { key: 'bankBIC', label: 'BIC', type: 'text', placeholder: '{org.bic}' },
      { key: 'legalMention', label: 'Mention légale', type: 'textarea', defaultValue: '' },
      { key: 'showCompanyInfo', label: 'Afficher infos entreprise', type: 'toggle', defaultValue: true },
      { key: 'showBankInfo', label: 'Afficher infos bancaires', type: 'toggle', defaultValue: true },
      { key: 'showPageNumber', label: 'Afficher n° de page', type: 'toggle', defaultValue: true },
      { key: 'showLegalMention', label: 'Afficher mention légale', type: 'toggle', defaultValue: false },
      { key: 'layout', label: 'Disposition', type: 'select', options: [
        { value: 'centered', label: 'Centré' },
        { value: 'spread', label: 'Étalé' },
        { value: 'minimal', label: 'Minimal' },
      ]},
      { key: 'fontSize', label: 'Taille texte (px)', type: 'number', defaultValue: 10 },
    ]
  },

  /**
   * 💳 INFORMATIONS DE PAIEMENT
   * IBAN, BIC, conditions de paiement
   */
  {
    id: 'PAYMENT_INFO',
    name: 'Infos Paiement',
    icon: '💳',
    category: 'data',
    description: 'Coordonnées bancaires et conditions',
    resizable: true,
    defaultSize: { width: 100, height: 15 },
    defaultConfig: {
      title: 'Modalités de paiement',
      showIBAN: true,
      showBIC: true,
      showCommunication: true,
      showPaymentTerms: true,
      paymentTerms: '30 jours date de facture',
    },
    themes: [
      { id: 'standard', name: 'Standard', description: 'Style simple', styles: {} },
      { id: 'boxed', name: 'Encadré', description: 'Dans un cadre', styles: { border: '1px solid #e8e8e8', padding: '16px', borderRadius: '8px' } },
      { id: 'highlighted', name: 'Mis en avant', description: 'Fond coloré', styles: { backgroundColor: '#f0f9ff', padding: '16px', borderRadius: '8px', border: '1px solid #bae6fd' } },
      { id: 'minimal', name: 'Minimaliste', description: 'Compact', styles: { fontSize: '12px' } },
    ],
    configFields: [
      { key: 'title', label: 'Titre', type: 'text', defaultValue: 'Modalités de paiement' },
      { key: 'iban', label: 'IBAN', type: 'text', placeholder: '{org.iban}' },
      { key: 'bic', label: 'BIC', type: 'text', placeholder: '{org.bic}' },
      { key: 'bankName', label: 'Nom de la banque', type: 'text', placeholder: '{org.bankName}' },
      { key: 'communication', label: 'Communication', type: 'text', placeholder: '{quote.reference}' },
      { key: 'paymentTerms', label: 'Conditions de paiement', type: 'textarea', defaultValue: '30 jours date de facture' },
      { key: 'showTitle', label: 'Afficher titre', type: 'toggle', defaultValue: true },
      { key: 'showIBAN', label: 'Afficher IBAN', type: 'toggle', defaultValue: true },
      { key: 'showBIC', label: 'Afficher BIC', type: 'toggle', defaultValue: true },
      { key: 'showBankName', label: 'Afficher banque', type: 'toggle', defaultValue: false },
      { key: 'showCommunication', label: 'Afficher communication', type: 'toggle', defaultValue: true },
      { key: 'showPaymentTerms', label: 'Afficher conditions', type: 'toggle', defaultValue: true },
    ]
  },

  /**
   * ⚠️ MENTION DE VALIDITÉ
   * Validité du devis avec date limite
   */
  {
    id: 'VALIDITY_NOTICE',
    name: 'Mention Validité',
    icon: '⚠️',
    category: 'legal',
    description: 'Validité du document avec date limite',
    resizable: true,
    defaultSize: { width: 100, height: 8 },
    defaultConfig: {
      template: 'standard',
      customText: '',
      showIcon: true,
      validityDays: 30,
    },
    themes: [
      { id: 'warning', name: 'Avertissement', description: 'Style alerte', styles: { backgroundColor: '#fff7e6', border: '1px solid #ffd591', padding: '12px', borderRadius: '8px' } },
      { id: 'info', name: 'Information', description: 'Style info', styles: { backgroundColor: '#e6f7ff', border: '1px solid #91d5ff', padding: '12px', borderRadius: '8px' } },
      { id: 'subtle', name: 'Discret', description: 'Style léger', styles: { fontStyle: 'italic', color: '#666' } },
      { id: 'bold', name: 'Important', description: 'Style fort', styles: { fontWeight: 'bold', backgroundColor: '#fff1f0', border: '1px solid #ffa39e', padding: '12px', borderRadius: '8px' } },
    ],
    configFields: [
      { key: 'template', label: 'Modèle', type: 'select', options: [
        { value: 'standard', label: 'Ce devis est valable 30 jours' },
        { value: 'date', label: 'Valable jusqu\'au [date]' },
        { value: 'custom', label: 'Texte personnalisé' },
      ]},
      { key: 'validUntilDate', label: 'Date limite', type: 'text', placeholder: '{quote.validUntil}' },
      { key: 'validityDays', label: 'Nombre de jours', type: 'number', defaultValue: 30 },
      { key: 'customText', label: 'Texte personnalisé', type: 'textarea' },
      { key: 'showIcon', label: 'Afficher icône', type: 'toggle', defaultValue: true },
      { key: 'additionalNote', label: 'Note additionnelle', type: 'textarea', placeholder: 'Passé ce délai, les prix pourront être révisés.' },
    ]
  },

  /**
   * ✅ RÉCAPITULATIF TOTAUX
   * Bloc de totaux HT/TVA/TTC
   */
  {
    id: 'TOTALS_SUMMARY',
    name: 'Récapitulatif Totaux',
    icon: '✅',
    category: 'data',
    description: 'Total HT, TVA et TTC',
    resizable: true,
    defaultSize: { width: 40, height: 15 },
    defaultConfig: {
      showTotalHT: true,
      showTVA: true,
      showTotalTTC: true,
      showDiscount: false,
      tvaRate: 21,
      currency: '€',
      alignment: 'right',
    },
    themes: [
      { id: 'standard', name: 'Standard', description: 'Style simple', styles: {} },
      { id: 'boxed', name: 'Encadré', description: 'Dans un cadre', styles: { border: '2px solid #e8e8e8', padding: '16px', borderRadius: '8px' } },
      { id: 'highlighted', name: 'Total mis en avant', description: 'TTC en gras', styles: {} },
      { id: 'minimal', name: 'Minimaliste', description: 'Compact', styles: {} },
    ],
    configFields: [
      { key: 'totalHT', label: 'Total HT', type: 'text', placeholder: '{quote.totalHT}', allowManualInput: true },
      { key: 'totalHTBinding', label: '🔗 Lier Total HT', type: 'data-binding', group: 'data' },
      { key: 'tvaAmount', label: 'Montant TVA', type: 'text', placeholder: '{quote.tva}', allowManualInput: true },
      { key: 'tvaBinding', label: '🔗 Lier TVA', type: 'data-binding', group: 'data' },
      { key: 'totalTTC', label: 'Total TTC', type: 'text', placeholder: '{quote.total}', allowManualInput: true },
      { key: 'totalTTCBinding', label: '🔗 Lier Total TTC', type: 'data-binding', group: 'data' },
      { key: 'discount', label: 'Remise', type: 'text', placeholder: '{quote.discount}' },
      { key: 'tvaRate', label: 'Taux TVA (%)', type: 'number', defaultValue: 21 },
      { key: 'currency', label: 'Devise', type: 'select', options: [
        { value: '€', label: 'Euro (€)' },
        { value: '$', label: 'Dollar ($)' },
        { value: '£', label: 'Livre (£)' },
      ]},
      { key: 'showTotalHT', label: 'Afficher Total HT', type: 'toggle', defaultValue: true },
      { key: 'showTVA', label: 'Afficher TVA', type: 'toggle', defaultValue: true },
      { key: 'showTotalTTC', label: 'Afficher Total TTC', type: 'toggle', defaultValue: true },
      { key: 'showDiscount', label: 'Afficher remise', type: 'toggle', defaultValue: false },
      { key: 'alignment', label: 'Alignement', type: 'select', options: [
        { value: 'left', label: 'Gauche' },
        { value: 'center', label: 'Centré' },
        { value: 'right', label: 'Droite' },
      ]},
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
