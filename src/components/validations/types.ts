export type ValidationType = 'required' | 'minLength' | 'maxLength' | 'regex' | 'email' | 'numeric';
export type ValidationValueType = 'static' | 'field';

/**
 * Représente une seule règle de validation appliquée à un champ.
 */
export interface Validation {
  id: string;
  type: string;
  value: string | null;
  message: string;
  comparisonType: 'static' | 'dynamic';
  comparisonFieldId: string | null;
}

// Ajout du type Field pour représenter un champ du formulaire
export interface Field {
  id: string;
  name: string;
  label: string;
  type: string; // ex: 'text', 'number', 'date'
  sectionId: string; // ID de la section parent
}

// Représente un item dans une séquence de validation
export interface ValidationItem {
  type: 'field' | 'operator' | 'value' | 'reference-field' | 'formula' | 'validation';
  id: string;
  value: any;
  label: string;
  referenceFieldId?: string;
  referenceSectionId?: string;
  originalValue?: any; // Pour stocker la valeur originale JavaScript
  formulaExpression?: string;
}
