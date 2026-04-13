/**
 * 📘 TYPES UNIVERSELS DU WEBSITE BUILDER
 * 
 * Ce fichier contient tous les types TypeScript utilisés dans le système
 * de construction de sites web. Il définit la structure des schémas,
 * des champs, et des sections.
 * 
 * @module site/schemas/types
 * @author 2Thier CRM Team
 * @version 2.0.0
 */

/**
 * 🎨 Types de champs disponibles
 * Chaque type correspond à un composant d'édition spécifique
 */
export type FieldType =
  | 'text'           // Input texte simple
  | 'textarea'       // Zone de texte multiligne
  | 'number'         // Input numérique
  | 'color'          // Sélecteur de couleur
  | 'image'          // Upload d'image
  | 'icon'           // Sélecteur d'icône Ant Design
  | 'select'         // Menu déroulant
  | 'contact-form-selector' // Sélecteur de formulaire public
  | 'section-anchor-selector' // Sélecteur de section (ancre dynamique)
  | 'simulator-form-selector' // Sélecteur de simulateur/formulaire avancé
  | 'boolean'        // Switch on/off
  | 'slider'         // Curseur pour valeurs numériques
  | 'size'           // Taille CSS (px, rem, %)
  | 'spacing'        // Espacement (padding/margin)
  | 'array'          // Tableau d'éléments
  | 'group'          // Groupe de champs
  | 'grid'           // Configuration grid layout
  | 'style'          // Éditeur de style CSS
  | 'rich-text';     // Éditeur de texte riche

/**
 * 📋 Définition d'un champ de formulaire
 * Structure de base pour tous les types de champs
 */
export interface FieldDefinition {
  /** Identifiant unique du champ */
  id: string;
  
  /** Type de champ (détermine le composant utilisé) */
  type: FieldType;
  
  /** Label affiché à l'utilisateur */
  label: string;
  
  /** Description/aide pour l'utilisateur */
  description?: string;
  
  /** Valeur par défaut */
  default?: unknown;
  
  /** Champ obligatoire ? */
  required?: boolean;
  
  /** Condition pour afficher le champ */
  condition?: (values: unknown) => boolean;
  
  /** Options spécifiques au type de champ */
  options?: FieldOptions;
}

/**
 * ⚙️ Options spécifiques aux champs
 */
export interface FieldOptions {
  // Pour 'number' et 'slider'
  min?: number;
  max?: number;
  step?: number;
  
  // Pour 'select'
  choices?: Array<{ label: string; value: any }>;
  mode?: 'multiple' | 'tags';  // Mode de sélection multiple ou tags
  placeholder?: string;  // Placeholder personnalisé
  allowCreate?: boolean; // Autoriser la création rapide d'éléments
  
  // Pour 'section-anchor-selector'
  allowCustom?: boolean; // Autoriser la saisie d'ancres personnalisées
  websiteId?: number;    // ID du site pour charger les sections
  
  // Pour 'array'
  itemType?: Record<string, FieldDefinition>;
  maxItems?: number;
  draggable?: boolean;  // Activer glisser-déposer
  
  // Pour 'group'
  fields?: FieldDefinition[];
  collapsible?: boolean;
  
  // Pour 'image'
  maxSize?: number;  // Mo
  aspectRatio?: number;
  allowCrop?: boolean;
  allowImage?: boolean; // Pour les champs icône : autoriser un upload image alternatif
  imageMaxSize?: number;
  imageAspectRatio?: number;
  imageAllowCrop?: boolean;
  
  // Pour 'grid'
  presets?: number[];  // [1, 2, 3, 4] colonnes
  responsive?: boolean;
  
  // Suggestions IA
  aiSuggest?: boolean;
  aiContext?: string;
}

/**
 * 📄 Définition complète d'un schéma de section
 */
export interface SectionSchema {
  /** Type unique de la section */
  type: string;
  
  /** Nom affiché */
  name: string;
  
  /** Icône/Emoji */
  icon?: string;
  
  /** Description */
  description?: string;
  
  /** Catégorie (header, content, footer...) */
  category?: 'layout' | 'content' | 'media' | 'form' | 'custom';
  
  /** Champs du schéma */
  fields: FieldDefinition[];
  
  /** Valeurs par défaut de la section */
  defaults?: Record<string, unknown>;
  
  /** Template de prévisualisation */
  previewTemplate?: string;
  
  /** Activer suggestions IA ? */
  aiEnabled?: boolean;
  
  /** Contexte pour l'IA */
  aiContext?: {
    businessType?: string[];
    keywords?: string[];
    tone?: string[];
  };
}

/**
 * 🎯 Instance d'une section dans un site
 */
export interface SectionInstance {
  /** ID unique de l'instance */
  id: number | string;
  
  /** Type de section (référence au schéma) */
  type: string;
  
  /** Nom personnalisé */
  name: string;
  
  /** Contenu (valeurs des champs) */
  content: Record<string, unknown>;
  
  /** Ordre d'affichage */
  order: number;
  
  /** Visible ? */
  isActive: boolean;
  
  /** ID du site parent */
  websiteId: number;
  
  /** Métadonnées */
  metadata?: {
    createdAt?: Date;
    updatedAt?: Date;
    createdBy?: string;
  };
}

/**
 * 🎨 Configuration de style global
 */
export interface StyleConfig {
  backgroundColor?: string;
  textColor?: string;
  padding?: string;
  margin?: string;
  borderRadius?: string;
  boxShadow?: string;
  customCSS?: string;
}

/**
 * 📐 Configuration de grid layout
 */
export interface GridConfig {
  columns: {
    mobile: number;    // < 576px
    tablet: number;    // 576-992px
    desktop: number;   // > 992px
  };
  gap: number | string;  // Accepte nombre (16) ou string ('16px')
  alignment: 'start' | 'center' | 'end' | 'stretch';
  justifyContent: 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly';
}

/**
 * 🤖 Contexte pour l'IA
 */
export interface AIContext {
  /** Type d'entreprise */
  businessType: string;
  
  /** Ton de communication */
  tone: 'professional' | 'casual' | 'technical' | 'friendly';
  
  /** Mots-clés importants */
  keywords: string[];
  
  /** Audience cible */
  targetAudience?: string;
  
  /** Langue */
  language?: string;
}

/**
 * 📊 Résultat d'analyse IA
 */
export interface AIAnalysis {
  /** Score SEO (0-100) */
  seoScore: number;
  
  /** Score d'accessibilité (0-100) */
  accessibilityScore: number;
  
  /** Suggestions d'amélioration */
  suggestions: Array<{
    type: 'seo' | 'accessibility' | 'design' | 'content';
    priority: 'low' | 'medium' | 'high';
    message: string;
    fix?: string;  // Code de fix automatique si disponible
  }>;
  
  /** Mots-clés détectés */
  detectedKeywords: string[];
  
  /** Performance estimée */
  performanceScore: number;
}

/**
 * 🎯 Export du schéma complet
 */
export interface SectionSchemaRegistry {
  [key: string]: SectionSchema;
}
