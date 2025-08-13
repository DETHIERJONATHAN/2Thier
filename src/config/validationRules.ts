export interface ValidationRuleConfig {
  id: string;
  label: string;
  // 'none': pas de champ de valeur (ex: pour 'required')
  // 'singleValue': un champ de valeur (numérique ou texte)
  // 'dynamic': peut être une valeur fixe ou un autre champ
  inputType: 'none' | 'singleValue' | 'dynamic';
  // Type de la valeur attendue si singleValue ou dynamic
  valueDataType?: 'number' | 'text' | 'date';
  defaultMessage: string;
  valuePlaceholder?: string;
}

export const validationRules: ValidationRuleConfig[] = [
  {
    id: 'required',
    label: 'Champ Requis',
    inputType: 'none',
    defaultMessage: 'Ce champ est obligatoire.',
  },
  {
    id: 'email',
    label: 'Adresse e-mail valide',
    inputType: 'none',
    defaultMessage: 'Veuillez saisir une adresse e-mail valide.',
  },
  {
    id: 'url',
    label: 'URL valide',
    inputType: 'none',
    defaultMessage: 'Veuillez saisir une URL valide.',
  },
  {
    id: 'numeric',
    label: 'Doit être un nombre',
    inputType: 'none',
    defaultMessage: 'La valeur doit être un nombre.',
  },
  {
    id: 'minLength',
    label: 'Longueur minimale',
    inputType: 'dynamic',
    valueDataType: 'number',
    defaultMessage: 'Ce champ doit contenir au moins {value} caractères.',
    valuePlaceholder: 'Nombre min. de caractères'
  },
  {
    id: 'maxLength',
    label: 'Longueur maximale',
    inputType: 'dynamic',
    valueDataType: 'number',
    defaultMessage: 'Ce champ ne doit pas dépasser {value} caractères.',
    valuePlaceholder: 'Nombre max. de caractères'
  },
  {
    id: 'min',
    label: 'Valeur minimale',
    inputType: 'dynamic',
    valueDataType: 'number',
    defaultMessage: 'La valeur doit être supérieure ou égale à {value}.',
    valuePlaceholder: 'Valeur minimale'
  },
  {
    id: 'max',
    label: 'Valeur maximale',
    inputType: 'dynamic',
    valueDataType: 'number',
    defaultMessage: 'La valeur doit être inférieure ou égale à {value}.',
    valuePlaceholder: 'Valeur maximale'
  },
  {
    id: 'regex',
    label: 'Format personnalisé (RegEx)',
    inputType: 'singleValue',
    valueDataType: 'text',
    defaultMessage: 'Le format de ce champ est invalide.',
    valuePlaceholder: 'Expression régulière'
  },
];