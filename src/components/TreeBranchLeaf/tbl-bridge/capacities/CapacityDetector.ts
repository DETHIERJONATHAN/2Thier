import { logger } from '../../../../lib/logger';
/**
 * 🧠 DÉTECTEUR INTELLIGENT DES CAPACITÉS TBL - VERSION CORRIGÉE
 * 
 * Analyse les VRAIES tables Prisma pour détecter les capacités :
 * - 1 = Neutre (pas de traitement spécial)
 * - 2 = Formule (TreeBranchLeafNodeFormula existe)
 * - 3 = Condition (TreeBranchLeafNodeCondition existe)
 * - 4 = Tableau (TreeBranchLeafNodeTable existe)
 */

// === INTERFACES BASÉES SUR LE VRAI SCHÉMA PRISMA ===

export interface TreeBranchLeafNode {
  // Champs principaux TreeBranchLeafNode
  id: string;
  treeId?: string;
  parentId?: string | null;
  type: string;
  subType?: string | null;
  label: string;
  description?: string | null;
  value?: string | null;
  order?: number;
  isRequired?: boolean;
  isVisible?: boolean;
  isActive?: boolean;
  fieldConfig?: unknown;
  conditionConfig?: unknown;
  formulaConfig?: unknown;
  tableConfig?: unknown;
  apiConfig?: unknown;
  linkConfig?: unknown;
  defaultValue?: string | null;
  calculatedValue?: string | null;
  metadata?: unknown;
  createdAt: Date;
  updatedAt: Date;
  
  // Nouveaux champs TBL Bridge
  tbl_code?: string | null;
  tbl_type?: number | null;
  tbl_capacity?: number | null;
  tbl_auto_generated?: boolean;
  tbl_created_at?: Date | null;
  tbl_updated_at?: Date | null;
  
  // Relations Prisma pour détection des capacités
  TreeBranchLeafNodeFormula?: TreeBranchLeafNodeFormula[];
  TreeBranchLeafNodeCondition?: TreeBranchLeafNodeCondition[];
  TreeBranchLeafNodeTable?: TreeBranchLeafNodeTable[];
  
  // Relations pour détection Type 6 (parent)
  TreeBranchLeafNode?: TreeBranchLeafNode | null; // Parent
  
  // Champs hérités
  children?: TreeBranchLeafNode[];
  properties?: unknown;
  nodeId?: string;
}

export interface TreeBranchLeafNodeFormula {
  id: string;
  nodeId: string;
  organizationId?: string | null;
  name: string;
  tokens: unknown;
  description?: string | null;
  isDefault: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TreeBranchLeafNodeCondition {
  id: string;
  nodeId: string;
  organizationId?: string | null;
  name: string;
  conditionSet: unknown;
  description?: string | null;
  isDefault: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TreeBranchLeafNodeTable {
  id: string;
  nodeId: string;
  organizationId?: string | null;
  name: string;
  description?: string | null;
  type: string;
  columns: unknown;
  rows: unknown;
  data: unknown;
  meta: unknown;
  isDefault: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export type TBLCapacity = '1' | '2' | '3' | '4';

export interface CapacityAnalysis {
  capacity: TBLCapacity;
  confidence: number;
  indicators: string[];
  warnings?: string[];
}

// === DÉTECTEUR PRINCIPAL ===

export class CapacityDetector {
  
  /**
   * 🎯 DÉTECTION PRINCIPALE - Basée sur les VRAIES tables Prisma
   */
  static detectCapacity(node: TreeBranchLeafNode): CapacityAnalysis {
    let capacity: TBLCapacity = '1';
    let confidence = 100;
    const indicators: string[] = [];
    const warnings: string[] = [];

    // 🧮 1. FORMULE - Table TreeBranchLeafNodeFormula
    const hasFormulas = node.TreeBranchLeafNodeFormula && node.TreeBranchLeafNodeFormula.length > 0;
    if (hasFormulas) {
      capacity = '2';
      confidence = 95;
      indicators.push(`✓ ${node.TreeBranchLeafNodeFormula!.length} formule(s) dans TreeBranchLeafNodeFormula`);
      
      node.TreeBranchLeafNodeFormula!.forEach((formula, i) => {
        indicators.push(`  - Formule ${i + 1}: "${formula.name}"`);
      });
    }

    // 🔀 2. CONDITION - Table TreeBranchLeafNodeCondition
    const hasConditions = node.TreeBranchLeafNodeCondition && node.TreeBranchLeafNodeCondition.length > 0;
    if (hasConditions) {
      if (hasFormulas) {
        warnings.push('⚠️ Conflit: Formule ET Condition détectées');
        warnings.push('→ Condition prioritaire par défaut');
      }
      
      capacity = '3';
      confidence = 95;
      indicators.push(`✓ ${node.TreeBranchLeafNodeCondition!.length} condition(s) dans TreeBranchLeafNodeCondition`);
      
      node.TreeBranchLeafNodeCondition!.forEach((condition, i) => {
        indicators.push(`  - Condition ${i + 1}: "${condition.name}"`);
      });
    }

    // 📊 3. TABLEAU - Table TreeBranchLeafNodeTable
    const hasTables = node.TreeBranchLeafNodeTable && node.TreeBranchLeafNodeTable.length > 0;
    if (hasTables) {
      if (hasFormulas || hasConditions) {
        warnings.push('⚠️ Conflit: Tableau ET autre capacité détectées');
        warnings.push('→ Tableau prioritaire par défaut');
      }
      
      capacity = '4';
      confidence = 95;
      indicators.push(`✓ ${node.TreeBranchLeafNodeTable!.length} tableau(x) dans TreeBranchLeafNodeTable`);
      
      node.TreeBranchLeafNodeTable!.forEach((table, i) => {
        indicators.push(`  - Tableau ${i + 1}: "${table.name}" (type: ${table.type})`);
      });
    }

    // 🔍 4. FALLBACK - Si relations pas chargées, analyser les champs JSON
    if (capacity === '1') {
      const fallback = this.detectCapacityFallback(node);
      if (fallback.capacity !== '1') {
        capacity = fallback.capacity;
        confidence = Math.max(30, fallback.confidence);
        indicators.push('⚠️ Mode fallback (relations non chargées)');
        indicators.push(...fallback.indicators);
      }
    }

    // 📊 FINALISATION
    if (capacity === '1') {
      indicators.push('ℹ️ Aucune capacité spéciale → Neutre');
    }

    return {
      capacity,
      confidence,
      indicators,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * 🏗️ DÉTECTION TYPE TBL (NOUVEAU - avec logique Type 6)
   */
  static detectTBLType(node: TreeBranchLeafNode): {
    tblType: string;
    confidence: number;
    indicators: string[];
  } {
    const indicators: string[] = [];
    let confidence = 100;

    // Mapping de base
    const TYPE_MAPPING = {
      'branch': '1',      // Branche
      'section': '7',     // Section  
      'leaf_field': '3',  // Champ (par défaut)
      'leaf_option': '4', // Option
      'leaf_option_field': '5' // Option+Champ
    };

    let tblType = TYPE_MAPPING[node.type as keyof typeof TYPE_MAPPING] || '1';
    indicators.push(`Type de base: ${node.type} → ${tblType}`);

    // 🎯 RÈGLE CRUCIALE: Champ dans section = Type 6
    if (node.type === 'leaf_field' && node.TreeBranchLeafNode?.type === 'section') {
      tblType = '6'; // Champ Données
      confidence = 95;
      indicators.push(`🎯 RÈGLE Type 6: Champ dans section "${node.TreeBranchLeafNode.label}" → Type 6 (Données)`);
    }

    // Règle: Branche avec parent = Sous-branche
    if (node.type === 'branch' && node.parentId) {
      tblType = '2'; // Sous-branche
      indicators.push(`Branche avec parent → Type 2 (Sous-branche)`);
    }

    return { tblType, confidence, indicators };
  }

  /**
   * 🎯 ANALYSE COMPLÈTE TBL (Type + Capacité)
   */
  static analyzeTBL(node: TreeBranchLeafNode): {
    tblType: string;
    capacity: TBLCapacity;
    tblCode: string;
    confidence: number;
    indicators: string[];
    warnings?: string[];
  } {
    // Détecter le type TBL
    const typeAnalysis = this.detectTBLType(node);
    
    // Détecter la capacité
    const capacityAnalysis = this.detectCapacity(node);
    
    // Générer le code TBL
    const normalizedName = this.normalizeString(node.label);
    const tblCode = `${typeAnalysis.tblType}${capacityAnalysis.capacity}${normalizedName}`;
    
    return {
      tblType: typeAnalysis.tblType,
      capacity: capacityAnalysis.capacity,
      tblCode,
      confidence: Math.min(typeAnalysis.confidence, capacityAnalysis.confidence),
      indicators: [
        ...typeAnalysis.indicators,
        ...capacityAnalysis.indicators,
        `Code généré: ${tblCode}`
      ],
      warnings: capacityAnalysis.warnings
    };
  }

  /**
   * 🔧 NORMALISATION CHAÎNES (méthode utilitaire)
   */
  private static normalizeString(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprimer accents
      .replace(/[^a-z0-9]/g, '-')      // Remplacer caractères spéciaux
      .replace(/-+/g, '-')             // Fusionner tirets consécutifs
      .replace(/^-|-$/g, '')           // Supprimer tirets début/fin
      .substring(0, 8);                // Limiter longueur
  }

  /**
   * 🔄 DÉTECTION FALLBACK - Pour les cas où les relations ne sont pas chargées
   */
  static detectCapacityFallback(node: TreeBranchLeafNode): CapacityAnalysis {
    let capacity: TBLCapacity = '1';
    let confidence = 0;
    const indicators: string[] = [];

    // Analyser les champs JSON de configuration
    if (node.formulaConfig) {
      try {
        const config = typeof node.formulaConfig === 'string' 
          ? JSON.parse(node.formulaConfig) 
          : node.formulaConfig;
        
        if (config && (config.formula || config.tokens || config.activeId)) {
          capacity = '2';
          confidence = 40;
          indicators.push('📋 formulaConfig présent (analyse JSON)');
        }
      } catch (e) {
        indicators.push('⚠️ Erreur analyse formulaConfig JSON');
      }
    }

    if (node.conditionConfig) {
      try {
        const config = typeof node.conditionConfig === 'string' 
          ? JSON.parse(node.conditionConfig) 
          : node.conditionConfig;
        
        if (config && (config.condition || config.branches || config.activeId)) {
          capacity = '3';
          confidence = 40;
          indicators.push('📋 conditionConfig présent (analyse JSON)');
        }
      } catch (e) {
        indicators.push('⚠️ Erreur analyse conditionConfig JSON');
      }
    }

    if (node.tableConfig) {
      try {
        const config = typeof node.tableConfig === 'string' 
          ? JSON.parse(node.tableConfig) 
          : node.tableConfig;
        
        if (config && (config.table || config.columns || config.data || config.activeId)) {
          capacity = '4';
          confidence = 40;
          indicators.push('📋 tableConfig présent (analyse JSON)');
        }
      } catch (e) {
        indicators.push('⚠️ Erreur analyse tableConfig JSON');
      }
    }

    return { capacity, confidence, indicators };
  }

  /**
   * 🔍 VALIDATION D'UN NŒUD AVEC CAPACITÉ
   */
  static validateCapacity(node: TreeBranchLeafNode, expectedCapacity: TBLCapacity): boolean {
    const analysis = this.detectCapacity(node);
    return analysis.capacity === expectedCapacity;
  }

  /**
   * 📊 STATISTIQUES DE CAPACITÉS SUR UN ENSEMBLE DE NŒUDS
   */
  static analyzeCapacities(nodes: TreeBranchLeafNode[]): {
    total: number;
    capacities: Record<TBLCapacity, number>;
    confidence: { avg: number; min: number; max: number };
    warnings: number;
  } {
    const stats = {
      total: nodes.length,
      capacities: { '1': 0, '2': 0, '3': 0, '4': 0 } as Record<TBLCapacity, number>,
      confidence: { avg: 0, min: 100, max: 0 },
      warnings: 0
    };

    const confidences: number[] = [];

    nodes.forEach(node => {
      const analysis = this.detectCapacity(node);
      stats.capacities[analysis.capacity]++;
      
      confidences.push(analysis.confidence);
      stats.confidence.min = Math.min(stats.confidence.min, analysis.confidence);
      stats.confidence.max = Math.max(stats.confidence.max, analysis.confidence);
      
      if (analysis.warnings) {
        stats.warnings++;
      }
    });

    stats.confidence.avg = confidences.reduce((a, b) => a + b, 0) / confidences.length || 0;

    return stats;
  }

  /**
   * 🎯 AIDE À LA DÉCISION - Recommandations pour un nœud
   */
  static getRecommendations(node: TreeBranchLeafNode): {
    capacity: TBLCapacity;
    confidence: number;
    recommendation: string;
    actions?: string[];
  } {
    const analysis = this.detectCapacity(node);
    
    const recommendations = {
      '1': 'Nœud neutre - Aucune action requise',
      '2': 'Formule détectée - Vérifier cohérence des calculs',
      '3': 'Condition détectée - Valider logique conditionnelle', 
      '4': 'Tableau détecté - Contrôler structure des données'
    };

    const actions: Record<TBLCapacity, string[]> = {
      '1': [],
      '2': [
        'Valider les tokens de formule',
        'Tester les calculs avec données réelles',
        'Vérifier les dépendances'
      ],
      '3': [
        'Valider la logique conditionnelle',
        'Tester tous les cas de figure',
        'Vérifier les branches orphelines'
      ],
      '4': [
        'Valider la structure des colonnes',
        'Contrôler l\'intégrité des données',
        'Optimiser les performances si gros volume'
      ]
    };

    return {
      capacity: analysis.capacity,
      confidence: analysis.confidence,
      recommendation: recommendations[analysis.capacity],
      actions: actions[analysis.capacity].length > 0 ? actions[analysis.capacity] : undefined
    };
  }
}

/**
 * 🎯 EXPORTS DE COMMODITÉ
 */
export const detectCapacity = CapacityDetector.detectCapacity;
export const validateCapacity = CapacityDetector.validateCapacity;
export const analyzeCapacities = CapacityDetector.analyzeCapacities;
export const getRecommendations = CapacityDetector.getRecommendations;

/**
 * 🧪 EXEMPLE D'UTILISATION
 * 
 * ```typescript
 * // 1. Détecter la capacité d'un nœud
 * const analysis = CapacityDetector.detectCapacity(node);
 * logger.debug(`Capacité: ${analysis.capacity}, Confiance: ${analysis.confidence}%`);
 * 
 * // 2. Analyser un lot de nœuds
 * const stats = CapacityDetector.analyzeCapacities(nodes);
 * logger.debug(`${stats.capacities['2']} formules, ${stats.capacities['3']} conditions`);
 * 
 * // 3. Obtenir des recommandations
 * const rec = CapacityDetector.getRecommendations(node);
 * logger.debug(rec.recommendation);
 * ```
 */

export default CapacityDetector;