/**
 * 🎯 TBL BRIDGE V2.0 - EXPORTS PRINCIPAUX
 * 
 * Point d'entrée unique pour tout le système TBL Bridge
 * Système intelligent de codification 2-chiffres [TYPE][CAPACITÉ]
 */

// 🧠 Détection automatique des capacités
export {
  CapacityDetector,
  type TreeBranchLeafNode,
  type TBLCapacity,
  type CapacityAnalysis
} from './capacities/CapacityDetector';

// 🔍 Décodage des codes TBL
export {
  TBLDecoder,
  type TBLCodeInfo
} from './TBLDecoder';

// 🎯 Coordinateur principal
export {
  TBLBridge,
  tblBridge, // Instance globale partagée
  type TBLElement,
  type TBLProcessResult,
  type TBLBridgeConfig,
  type ConditionData,
  type TableData
} from './TBLBridge';

// 🔄 Migration sécurisée
export {
  TBLMigration,
  runMigration,
  type MigrationConfig,
  type MigrationResult,
  type MigrationStatistics
} from './TBLMigration';

// 🎯 EXEMPLES D'UTILISATION RAPIDE

/**
 * 🚀 UTILISATION BASIQUE
 * 
 * ```typescript
 * import { tblBridge, TBLDecoder } from './tbl-bridge';
 * 
 * // 1. Traiter un élément TreeBranchLeaf
 * const result = await tblBridge.process(node);
 * console.log(result.element?.tbl_code); // "62-prix-total"
 * 
 * // 2. Décoder un code TBL
 * const info = TBLDecoder.decode("62-prix-total");
 * console.log(info.description); // "Champ données avec formule"
 * 
 * // 3. Récupérer un élément
 * const element = tblBridge.getElementByCode("62-prix-total");
 * ```
 */

/**
 * 🔄 MIGRATION
 * 
 * ```typescript
 * import { runMigration } from './tbl-bridge';
 * 
 * // Migration en mode simulation
 * const result = await runMigration({ dryRun: true });
 * 
 * // Migration réelle
 * if (result.success) {
 *   await runMigration({ dryRun: false });
 * }
 * ```
 */

/**
 * 🧠 DÉTECTION CAPACITÉS
 * 
 * ```typescript
 * import { CapacityDetector } from './tbl-bridge';
 * 
 * const analysis = CapacityDetector.detectCapacity(node);
 * console.log(analysis.capacity);    // "2" (formule)
 * console.log(analysis.confidence);  // 85
 * console.log(analysis.indicators);  // ["hasFormula=true", ...]
 * ```
 */

/**
 * 🔍 VALIDATION CODES
 * 
 * ```typescript
 * import { TBLDecoder } from './tbl-bridge';
 * 
 * const codes = ["62-prix", "invalid", "73-resultats"];
 * const results = TBLDecoder.validateBatch(codes);
 * const stats = TBLDecoder.generateValidationStats(results);
 * ```
 */

// 🎯 CONSTANTES UTILES
export const TBL_TYPES = {
  BRANCH: '1',
  SUB_BRANCH: '2', 
  FIELD: '3',
  OPTION: '4',
  OPTION_FIELD: '5',
  DATA_FIELD: '6',
  SECTION: '7'
} as const;

export const TBL_CAPACITIES = {
  NEUTRAL: '1',
  FORMULA: '2',
  CONDITION: '3',
  TABLE: '4'
} as const;

// 🗺️ MAPPINGS DE RÉFÉRENCE
export const TYPE_LABELS = {
  '1': 'Branche',
  '2': 'Sous-Branche',
  '3': 'Champ',
  '4': 'Option',
  '5': 'Option + champ',
  '6': 'Champ données',
  '7': 'Section'
} as const;

export const CAPACITY_LABELS = {
  '1': 'Neutre',
  '2': 'Formule',
  '3': 'Condition', 
  '4': 'Tableau'
} as const;

// 🎯 HELPERS RAPIDES
export const TBLHelpers = {
  /**
   * Vérifie si un code TBL est valide
   */
  isValidCode: (code: string): boolean => {
    return TBLDecoder.decode(code).isValid;
  },
  
  /**
   * Extrait le type d'un code TBL
   */
  getType: (code: string): string => {
    return TBLDecoder.decode(code).type;
  },
  
  /**
   * Extrait la capacité d'un code TBL
   */
  getCapacity: (code: string): string => {
    return TBLDecoder.decode(code).capacity;
  },
  
  /**
   * Vérifie si un code a des dépendances (formule/condition/tableau)
   */
  hasDependencies: (code: string): boolean => {
    return TBLDecoder.shouldCalculate(code);
  },
  
  /**
   * Génère un code TBL à partir des composants
   */
  generateCode: (type: string, capacity: string, name: string): string => {
    return TBLDecoder.generate(type, capacity, name);
  },
  
  /**
   * Obtient le composant TBL requis pour un code
   */
  getComponent: (code: string): string => {
    return TBLDecoder.getRequiredComponent(code);
  }
};

/**
 * 🎯 VERSION ET MÉTADONNÉES
 */
export const TBL_BRIDGE_VERSION = '2.0.0';
export const TBL_BRIDGE_DESCRIPTION = 'Système intelligent de codification 2-chiffres TreeBranchLeaf → TBL';

/**
 * 🎯 CONFIGURATION PAR DÉFAUT
 */
export const DEFAULT_TBL_CONFIG = {
  enableAutoCapacityDetection: true,
  strictTypeValidation: true,
  allowDuplicateNames: false,
  debugMode: false
} as const;

// 🎯 VALIDATION GLOBALE SYSTÈME
export const validateTBLSystem = () => {
  const checks = {
    capacityDetector: typeof CapacityDetector !== 'undefined',
    tblDecoder: typeof TBLDecoder !== 'undefined', 
    tblBridge: typeof TBLBridge !== 'undefined',
    migration: typeof TBLMigration !== 'undefined'
  };
  
  const allValid = Object.values(checks).every(Boolean);
  
  return {
    valid: allValid,
    components: checks,
    version: TBL_BRIDGE_VERSION
  };
};

/**
 * 🎯 INITIALISATION RAPIDE
 */
export const initializeTBLBridge = (config: Partial<TBLBridgeConfig> = {}) => {
  const bridge = new TBLBridge({
    ...DEFAULT_TBL_CONFIG,
    ...config
  });
  
  console.log(`🚀 TBL Bridge V${TBL_BRIDGE_VERSION} initialisé`);
  
  return bridge;
};

/**
 * 🎯 EXPORTS PAR DÉFAUT
 */
export default {
  TBLBridge,
  TBLDecoder,
  CapacityDetector,
  TBLMigration,
  tblBridge,
  TBLHelpers,
  version: TBL_BRIDGE_VERSION,
  initialize: initializeTBLBridge,
  validate: validateTBLSystem
};

/**
 * 📋 RÉSUMÉ ARCHITECTURE
 * 
 * TBL Bridge V2.0 = Système hybride intelligent
 * 
 * 🔑 COMPOSANTS PRINCIPAUX:
 * ├── CapacityDetector     → Détection auto capacités (formule/condition/tableau)
 * ├── TBLDecoder          → Décodage codes 2-chiffres [TYPE][CAPACITÉ]
 * ├── TBLBridge           → Coordinateur principal + API
 * ├── TBLMigration        → Migration sécurisée UUID → codes TBL
 * └── Tests               → Suite complète de validation
 * 
 * 🎯 SYSTÈME 2-CHIFFRES:
 * [TYPE][CAPACITÉ]-nom
 * 
 * TYPES: 1=Branche, 2=Sous-branche, 3=Champ, 4=Option, 5=Option+champ, 6=Champ données, 7=Section
 * CAPACITÉS: 1=Neutre, 2=Formule, 3=Condition, 4=Tableau
 * 
 * 🔄 FLUX: TreeBranchLeaf → TBL Bridge → TBL automatique
 * 
 * 🛡️ SÉCURITÉ: Système hybride préservant UUIDs + ajoutant codes TBL
 */