export interface DependencyRuleConfig {
  id: string;
  label: string;
  // Le type d'action à effectuer sur le champ cible
  actionType: 'show' | 'hide' | 'enable' | 'disable' | 'setRequired' | 'setOptional' | 'setOptions';
  // Type de condition qui détermine quand l'action s'applique
  conditionType: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'isEmpty' | 'isNotEmpty';
  // Si l'action nécessite une valeur (par exemple pour setOptions)
  requiresValue: boolean;
  // Type de valeur si requiresValue est true
  valueType?: 'string' | 'number' | 'boolean' | 'array';
  // Description de ce que fait la dépendance
  description: string;
}

export const dependencyRules: DependencyRuleConfig[] = [
  {
    id: 'showWhenEquals',
    label: 'Afficher quand égal à',
    actionType: 'show',
    conditionType: 'equals',
    requiresValue: true,
    valueType: 'string',
    description: 'Affiche le champ cible lorsque la condition est vérifiée.'
  },
  {
    id: 'hideWhenEquals',
    label: 'Masquer quand égal à',
    actionType: 'hide',
    conditionType: 'equals',
    requiresValue: true,
    valueType: 'string',
    description: 'Masque le champ cible lorsque la condition est vérifiée.'
  },
  {
    id: 'enableWhenEquals',
    label: 'Activer quand égal à',
    actionType: 'enable',
    conditionType: 'equals',
    requiresValue: true,
    valueType: 'string',
    description: 'Active le champ cible lorsque la condition est vérifiée.'
  },
  {
    id: 'disableWhenEquals',
    label: 'Désactiver quand égal à',
    actionType: 'disable',
    conditionType: 'equals',
    requiresValue: true,
    valueType: 'string',
    description: 'Désactive le champ cible lorsque la condition est vérifiée.'
  },
  {
    id: 'setRequiredWhenEquals',
    label: 'Rendre obligatoire quand égal à',
    actionType: 'setRequired',
    conditionType: 'equals',
    requiresValue: true,
    valueType: 'string',
    description: 'Rend le champ cible obligatoire lorsque la condition est vérifiée.'
  },
  {
    id: 'setOptionalWhenEquals',
    label: 'Rendre facultatif quand égal à',
    actionType: 'setOptional',
    conditionType: 'equals',
    requiresValue: true,
    valueType: 'string',
    description: 'Rend le champ cible facultatif lorsque la condition est vérifiée.'
  },
  {
    id: 'showWhenNotEquals',
    label: 'Afficher quand différent de',
    actionType: 'show',
    conditionType: 'notEquals',
    requiresValue: true,
    valueType: 'string',
    description: 'Affiche le champ cible lorsque la valeur est différente de celle spécifiée.'
  },
  {
    id: 'hideWhenNotEquals',
    label: 'Masquer quand différent de',
    actionType: 'hide',
    conditionType: 'notEquals',
    requiresValue: true,
    valueType: 'string',
    description: 'Masque le champ cible lorsque la valeur est différente de celle spécifiée.'
  },
  {
    id: 'showWhenEmpty',
    label: 'Afficher quand vide',
    actionType: 'show',
    conditionType: 'isEmpty',
    requiresValue: false,
    description: 'Affiche le champ cible lorsque la valeur est vide.'
  },
  {
    id: 'hideWhenEmpty',
    label: 'Masquer quand vide',
    actionType: 'hide',
    conditionType: 'isEmpty',
    requiresValue: false,
    description: 'Masque le champ cible lorsque la valeur est vide.'
  },
  {
    id: 'setOptionsWhenEquals',
    label: 'Définir options quand égal à',
    actionType: 'setOptions',
    conditionType: 'equals',
    requiresValue: true,
    valueType: 'array',
    description: 'Définit les options disponibles pour le champ cible lorsque la condition est vérifiée.'
  }
];
