/**
 * L'action à effectuer sur le champ actuel.
 * 'show': Le champ sera visible si la condition est remplie.
 * 'hide': Le champ sera caché si la condition est remplie.
 * 'require': Le champ sera obligatoire si la condition est remplie.
 * 'optional': Le champ sera facultatif si la condition est remplie.
 * 'enable': Le champ sera activé si la condition est remplie.
 * 'disable': Le champ sera désactivé si la condition est remplie.
 * 'prefill': Le champ sera prérempli avec une valeur si la condition est remplie.
 */
export type DependencyAction = 'show' | 'hide' | 'require' | 'optional' | 'enable' | 'disable' | 'prefill';

/**
 * L'opérateur de comparaison à appliquer sur le champ cible.
 */
export type DependencyOperator = 'equals' | 'not_equals' | 'is_empty' | 'is_not_empty' | 'contains';

/**
 * Représente une règle de dépendance.
 * Exemple : "AFFICHER ce champ SI le champ 'statut_prospect' EST ÉGAL À 'Client'".
 */
export interface Dependency {
  id: string;
  // Nom de la dépendance pour l'affichage dans l'UI
  name?: string;
  // L'action à effectuer sur le champ actuel (ex: 'show')
  action: DependencyAction;
  // L'ID du champ qui déclenche la condition (ex: 'statut_prospect')
  targetFieldId: string;
  // L'opérateur de comparaison (ex: 'equals')
  operator: DependencyOperator;
  // La valeur à comparer (ex: 'Client'). Optionnel pour 'is_empty'.
  value?: string;
  // ID de la formule associée à la dépendance
  formulaId?: string;
  // Valeur à utiliser pour préremplir le champ (utilisé avec l'action 'prefill')
  prefillValue?: string;
  // Résultat temporaire du test (non persisté)
  _testResult?: { status: string; message: string; success?: boolean };
  // Structure avancée pour les dépendances avec séquence
  sequence?: {
    conditions: any[][];
    action: DependencyAction;
    targetFieldId: string;
  };
}

/**
 * Les types de validation disponibles.
 */
export type ValidationType = 'required' | 'email' | 'minLength' | 'maxLength';

/**
 * Les types de valeurs de validation.
 */
export type ValidationValueType = 'static' | 'field';

/**
 * Représente une règle de validation.
 */
export interface Validation {
  id: string;
  type: ValidationType;
  // La valeur associée à la règle.
  value?: string | number;
  // NOUVEAU : Pour spécifier si la valeur est statique ou vient d'un autre champ.
  valueType?: ValidationValueType;
  // NOUVEAU : L'ID du champ à comparer si valueType est 'field'.
  targetFieldId?: string;
  // Le message d'erreur à afficher si la validation échoue.
  message: string;
}

/**
 * Représente UNE SEULE condition dans un groupe.
 */
export interface DependencyCondition {
  id: string;
  targetFieldId: string;
  operator: DependencyOperator;
  value?: string;
}

/**
 * Représente une règle de dépendance complète, qui peut contenir plusieurs conditions.
 */
export interface DependencyRule {
  id: string;
  // L'action à effectuer sur le champ actuel (ex: 'show')
  action: DependencyAction;
  // Logique du groupe : 'AND' (toutes les conditions doivent être vraies) ou 'OR' (au moins une doit être vraie)
  logic: 'AND' | 'OR';
  // La liste des conditions
  conditions: DependencyCondition[];
}
