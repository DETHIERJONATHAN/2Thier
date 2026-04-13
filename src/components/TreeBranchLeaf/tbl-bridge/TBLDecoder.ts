import { logger } from '../../../lib/logger';
/**
 * 🔍 TBL DECODER - DÉCODEUR 2-CHIFFRES
 * 
 * Analyse et décode les codes TBL format [TYPE][CAPACITÉ]-nom
 * Fournit toutes les informations nécessaires pour comprendre un élément TBL
 */

export interface TBLCodeInfo {
  // 🎯 DÉCODAGE DE BASE
  originalCode: string;         // "62-prix-total-ht"
  type: string;                 // "6"
  capacity: string;             // "2"
  name: string;                 // "prix-total-ht"
  
  // 📝 INFORMATIONS ENRICHIES
  typeLabel: string;            // "Champ données"
  capacityLabel: string;        // "Formule"
  description: string;          // "Champ données avec formule"
  
  // 🏗️ COMPORTEMENT TBL
  tblBehavior: {
    component: string;          // "DataField"
    rendering: string;          // "Affichage données calculées"
    interaction: string;        // "Calcul automatique"
    dependencies: boolean;      // true si peut référencer d'autres champs
  };
  
  // ⚠️ VALIDATION
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class TBLDecoder {
  
  // 🗺️ MAPPINGS DE RÉFÉRENCE
  private static readonly TYPE_MAPPING = {
    '1': { label: 'Branche', component: 'Tab', rendering: 'Onglet TBL' },
    '2': { label: 'Sous-Branche', component: 'Dropdown', rendering: 'Liste déroulante TBL' },
    '3': { label: 'Champ', component: 'Input', rendering: 'Input utilisateur' },
    '4': { label: 'Option', component: 'Option', rendering: 'Choix dans liste déroulante' },
    '5': { label: 'Option + champ', component: 'OptionField', rendering: 'Option qui ouvre un champ' },
    '6': { label: 'Champ données', component: 'DataField', rendering: 'Affichage données calculées' },
    '7': { label: 'Section', component: 'Section', rendering: 'Container pour champs données' }
  };

  private static readonly CAPACITY_MAPPING = {
    '1': { label: 'Neutre', interaction: 'Pas de traitement spécial', dependencies: false },
    '2': { label: 'Formule', interaction: 'Calcul mathématique', dependencies: true },
    '3': { label: 'Condition', interaction: 'Logique if/then/else', dependencies: true },
    '4': { label: 'Tableau', interaction: 'Données tabulaires', dependencies: true }
  };

  /**
   * 🎯 DÉCODAGE PRINCIPAL
   */
  static decode(tblCode: string): TBLCodeInfo {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // 1. Validation format de base
    if (!tblCode || typeof tblCode !== 'string') {
      return this.createErrorResult(tblCode || '', ['Code TBL manquant ou invalide']);
    }

    // 2. Extraction des composants
    const parts = tblCode.split('-');
    if (parts.length < 2) {
      return this.createErrorResult(tblCode, ['Format invalide: doit être [TYPE][CAPACITÉ]-nom']);
    }

    const prefix = parts[0];
    const name = parts.slice(1).join('-');

    // 3. Validation du préfixe (doit faire exactement 2 caractères)
    if (prefix.length !== 2) {
      return this.createErrorResult(tblCode, ['Préfixe invalide: doit faire exactement 2 chiffres']);
    }

    const type = prefix[0];
    const capacity = prefix[1];

    // 4. Validation type
    if (!this.TYPE_MAPPING[type as keyof typeof this.TYPE_MAPPING]) {
      errors.push(`Type inconnu: ${type} (doit être 1-7)`);
    }

    // 5. Validation capacité
    if (!this.CAPACITY_MAPPING[capacity as keyof typeof this.CAPACITY_MAPPING]) {
      errors.push(`Capacité inconnue: ${capacity} (doit être 1-4)`);
    }

    // 6. Validation nom
    if (!name || name.length === 0) {
      errors.push('Nom manquant après le préfixe');
    } else if (name.length < 3) {
      warnings.push('Nom très court (< 3 caractères)');
    } else if (name.length > 50) {
      warnings.push('Nom très long (> 50 caractères)');
    }

    // 7. Validation cohérence type/capacité
    const coherenceCheck = this.validateTypeCapacityCoherence(type, capacity);
    if (coherenceCheck.warnings) {
      warnings.push(...coherenceCheck.warnings);
    }

    // 8. Construction du résultat
    const typeInfo = this.TYPE_MAPPING[type as keyof typeof this.TYPE_MAPPING];
    const capacityInfo = this.CAPACITY_MAPPING[capacity as keyof typeof this.CAPACITY_MAPPING];

    return {
      originalCode: tblCode,
      type,
      capacity,
      name,
      
      typeLabel: typeInfo?.label || 'Type inconnu',
      capacityLabel: capacityInfo?.label || 'Capacité inconnue',
      description: `${typeInfo?.label || 'Type inconnu'} avec ${capacityInfo?.label || 'capacité inconnue'}`,
      
      tblBehavior: {
        component: typeInfo?.component || 'Unknown',
        rendering: typeInfo?.rendering || 'Rendu inconnu',
        interaction: capacityInfo?.interaction || 'Interaction inconnue',
        dependencies: capacityInfo?.dependencies || false
      },
      
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 🔍 VALIDATION COHÉRENCE TYPE/CAPACITÉ
   */
  private static validateTypeCapacityCoherence(type: string, capacity: string) {
    const warnings: string[] = [];

    // Règles de cohérence basées sur la logique métier
    const coherenceRules = [
      {
        condition: type === '1' && capacity !== '1', // Branche non-neutre
        warning: 'Inhabituel: branche avec capacité non-neutre'
      },
      {
        condition: type === '4' && (capacity === '2' || capacity === '3'), // Option avec formule/condition
        warning: 'Inhabituel: option avec formule/condition'
      },
      {
        condition: type === '7' && capacity === '1', // Section neutre
        warning: 'Section neutre: généralement tableau par défaut'
      },
      {
        condition: type === '6' && capacity === '1', // Champ données neutre
        warning: 'Champ données neutre: peu commun'
      }
    ];

    for (const rule of coherenceRules) {
      if (rule.condition) {
        warnings.push(rule.warning);
      }
    }

    return { warnings: warnings.length > 0 ? warnings : undefined };
  }

  /**
   * ❌ CRÉATION RÉSULTAT D'ERREUR
   */
  private static createErrorResult(code: string, errors: string[]): TBLCodeInfo {
    return {
      originalCode: code,
      type: '',
      capacity: '',
      name: '',
      typeLabel: 'Erreur',
      capacityLabel: 'Erreur',
      description: 'Code TBL invalide',
      tblBehavior: {
        component: 'Error',
        rendering: 'Erreur de rendu',
        interaction: 'Aucune interaction',
        dependencies: false
      },
      isValid: false,
      errors,
      warnings: []
    };
  }

  /**
   * 🏗️ GÉNÉRATION CODE TBL (Helper inverse)
   */
  static generate(type: string, capacity: string, name: string): string {
    // Validation des paramètres
    if (!this.TYPE_MAPPING[type as keyof typeof this.TYPE_MAPPING]) {
      throw new Error(`Type invalide: ${type}`);
    }
    if (!this.CAPACITY_MAPPING[capacity as keyof typeof this.CAPACITY_MAPPING]) {
      throw new Error(`Capacité invalide: ${capacity}`);
    }
    if (!name || name.trim().length === 0) {
      throw new Error('Nom requis');
    }

    // Normalisation du nom
    const normalizedName = this.normalizeName(name);
    
    return `${type}${capacity}-${normalizedName}`;
  }

  /**
   * 📝 NORMALISATION NOM
   */
  private static normalizeName(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprimer accents
      .replace(/[^a-z0-9]/g, '-')      // Remplacer caractères spéciaux par -
      .replace(/-+/g, '-')             // Fusionner multiples -
      .replace(/^-|-$/g, '');          // Supprimer - en début/fin
  }

  /**
   * 📊 VALIDATION PAR LOT
   */
  static validateBatch(codes: string[]): Map<string, TBLCodeInfo> {
    const results = new Map<string, TBLCodeInfo>();
    
    for (const code of codes) {
      const decoded = this.decode(code);
      results.set(code, decoded);
    }

    return results;
  }

  /**
   * 📈 STATISTIQUES DE VALIDATION
   */
  static generateValidationStats(results: Map<string, TBLCodeInfo>) {
    const stats = {
      total: results.size,
      valid: 0,
      invalid: 0,
      withWarnings: 0,
      byType: {} as Record<string, number>,
      byCapacity: {} as Record<string, number>,
      commonErrors: {} as Record<string, number>
    };

    for (const decoded of results.values()) {
      if (decoded.isValid) {
        stats.valid++;
        
        // Compter par type/capacité seulement si valide
        stats.byType[decoded.type] = (stats.byType[decoded.type] || 0) + 1;
        stats.byCapacity[decoded.capacity] = (stats.byCapacity[decoded.capacity] || 0) + 1;
      } else {
        stats.invalid++;
      }

      if (decoded.warnings.length > 0) {
        stats.withWarnings++;
      }

      // Compter erreurs communes
      for (const error of decoded.errors) {
        stats.commonErrors[error] = (stats.commonErrors[error] || 0) + 1;
      }
    }

    return stats;
  }

  /**
   * 🔍 RECHERCHE ET FILTRAGE
   */
  
  static findByType(codes: string[], type: string): string[] {
    return codes.filter(code => {
      const decoded = this.decode(code);
      return decoded.isValid && decoded.type === type;
    });
  }

  static findByCapacity(codes: string[], capacity: string): string[] {
    return codes.filter(code => {
      const decoded = this.decode(code);
      return decoded.isValid && decoded.capacity === capacity;
    });
  }

  static findWithFormulas(codes: string[]): string[] {
    return this.findByCapacity(codes, '2');
  }

  static findWithConditions(codes: string[]): string[] {
    return this.findByCapacity(codes, '3');
  }

  static findWithTables(codes: string[]): string[] {
    return this.findByCapacity(codes, '4');
  }

  /**
   * 🎯 HELPERS POUR COMPOSANTS TBL
   */
  
  static getRequiredComponent(tblCode: string): string {
    const decoded = this.decode(tblCode);
    return decoded.isValid ? decoded.tblBehavior.component : 'Error';
  }

  static shouldCalculate(tblCode: string): boolean {
    const decoded = this.decode(tblCode);
    return decoded.isValid && decoded.tblBehavior.dependencies;
  }

  static getDescription(tblCode: string): string {
    const decoded = this.decode(tblCode);
    return decoded.description;
  }

  /**
   * 💡 SUGGESTIONS ET AIDE
   */
  
  static suggestCorrection(invalidCode: string): string[] {
    const suggestions: string[] = [];
    
    // Analyser les erreurs communes et suggérer des corrections
    if (!invalidCode.includes('-')) {
      suggestions.push('Ajouter un tiret après le préfixe: "11-nom"');
    }
    
    if (invalidCode.length < 4) {
      suggestions.push('Code trop court: minimum "XX-nom"');
    }
    
    const parts = invalidCode.split('-');
    if (parts[0] && parts[0].length !== 2) {
      suggestions.push('Préfixe doit faire 2 chiffres: "11", "62", etc.');
    }
    
    if (parts[0] && parts[0].length === 2) {
      const type = parts[0][0];
      const capacity = parts[0][1];
      
      if (!/[1-7]/.test(type)) {
        suggestions.push('Premier chiffre (type) doit être 1-7');
      }
      
      if (!/[1-4]/.test(capacity)) {
        suggestions.push('Deuxième chiffre (capacité) doit être 1-4');
      }
    }
    
    return suggestions;
  }
}

/**
 * 🎯 EXEMPLES D'UTILISATION
 * 
 * ```typescript
 * // Décodage d'un code TBL
 * const info = TBLDecoder.decode("62-prix-total-ht");
 * logger.debug(info);
 * // Output: {
 * //   type: "6", capacity: "2", name: "prix-total-ht",
 * //   typeLabel: "Champ données", capacityLabel: "Formule",
 * //   description: "Champ données avec formule",
 * //   tblBehavior: { component: "DataField", ... },
 * //   isValid: true
 * // }
 * 
 * // Génération d'un code TBL
 * const code = TBLDecoder.generate("3", "1", "Puissance kWh");
 * logger.debug(code); // "31-puissance-kwh"
 * 
 * // Validation par lot
 * const codes = ["62-prix-ht", "invalid", "73-resultats"];
 * const results = TBLDecoder.validateBatch(codes);
 * const stats = TBLDecoder.generateValidationStats(results);
 * logger.debug(stats); // { total: 3, valid: 2, invalid: 1, ... }
 * 
 * // Helpers pour composants
 * logger.debug(TBLDecoder.getRequiredComponent("62-prix-ht")); // "DataField"
 * logger.debug(TBLDecoder.shouldCalculate("62-prix-ht"));     // true
 * ```
 */