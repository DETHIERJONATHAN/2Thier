// fieldTypes.ts
// Centralisation des types de champs pour éviter les bugs HMR et les imports circulaires

export const FIELD_TYPES = [
  { value: 'text', label: 'Texte', icon: 'text' },
  { value: 'textarea', label: 'Texte long', icon: 'textarea' },
  { value: 'number', label: 'Nombre', icon: 'number' },
  { value: 'select', label: 'Liste déroulante', icon: 'select' },
  { value: 'advanced_select', label: 'Liste déroulante avancée', icon: 'advanced_select' },
  { value: 'conditional', label: 'Champ conditionnel', icon: 'conditional' },
  { value: 'checkboxes', label: 'Cases à cocher', icon: 'checkboxes' },
  { value: 'radio', label: 'Boutons radio', icon: 'radio' },
  { value: 'date', label: 'Date', icon: 'date' },
  { value: 'file', label: 'Fichier', icon: 'file' },
  { value: 'files', label: 'Fichiers multiples', icon: 'files' },
  { value: 'image_admin', label: 'Image (admin)', icon: 'image_admin' },
  { value: 'image_user', label: 'Image (utilisateur)', icon: 'image_user' },
  { value: 'fichier_user', label: 'Fichier (utilisateur)', icon: 'file' },
];

export const FIELD_TYPES_WITH_OPTIONS = ['select', 'radio', 'checkboxes', 'advanced_select'];
