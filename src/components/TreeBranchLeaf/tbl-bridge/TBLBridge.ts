/**
 * 🎯 TBL BRIDGE - COORDINATEUR PRINCIPAL
 * 
 * Point central qui orchestre tout le système TBL Bridge V2.0
 * - Décodage automatique des codes 2-chiffres [TYPE][CAPACITÉ]
 * - Coordination entre TreeBranchLeaf et TBL
 * - Gestion intelligente des éléments hybrides (UUID + TBL)
 */

import { CapacityDetector, TreeBranchLeafNode, TBLCapacity, CapacityAnalysis } from './capacities/CapacityDetector';
import { TBLDecoder } from './TBLDecoder';
import { logger } from '../../../lib/logger';

export interface TBLElement {
  // 🔑 SYSTÈME HYBRIDE COMPLET
  id: string;                   // UUID TreeBranchLeaf original
  nodeId: string;               // Position dans l'arbre
  label: string;                // Nom humain
  type: string;                 // Type original TreeBranchLeaf
  parentId?: string;            // Parent UUID pour hiérarchie
  
  // 🎯 SYSTÈME TBL 2-CHIFFRES
  tbl_code: string;             // Code format "62-prix-total"
  tbl_type: string;             // "6" (champ données)
  tbl_capacity: string;         // "2" (formule)
  tbl_original_id: string;      // Backup UUID de sécurité
  
  // 📊 DONNÉES FONCTIONNELLES
  value?: unknown;              // Valeur actuelle
  formula?: string;             // Si capacité formule
  condition?: ConditionData;    // Si capacité condition
  tableData?: TableData;        // Si capacité tableau
  
  // 🔍 MÉTADONNÉES TBL
  tbl_created_at: string;       // Date création code TBL
  tbl_updated_at: string;       // Dernière modification
  tbl_confidence: number;       // Confiance détection automatique
  tbl_source: 'auto' | 'manual'; // Source du code TBL
}

export interface ConditionData {
  expression: string;           // "21-type-client == 'Professionnel'"
  then: string;                 // "62-total-ht * 0.15"
  else: string;                 // "0"
  dependencies: string[];       // ["21-type-client", "62-total-ht"]
}

export interface TableData {
  type: 'columns' | 'crossed';  // Type de tableau
  data: unknown[][];            // Données tabulaires
  columnRefs?: string[];        // Références colonnes codes TBL
  formulas?: Record<string, string>; // Formules par cellule
}

export interface TBLProcessResult {
  success: boolean;
  element?: TBLElement;
  action: 'created' | 'updated' | 'ignored' | 'error';
  message: string;
  warnings?: string[];
}

export interface TBLBridgeConfig {
  enableAutoCapacityDetection: boolean;
  strictTypeValidation: boolean;
  allowDuplicateNames: boolean;
  debugMode: boolean;
}

export class TBLBridge {
  private config: TBLBridgeConfig;
  private elements: Map<string, TBLElement> = new Map();
  private codeRegistry: Map<string, string> = new Map(); // tbl_code → id mapping

  constructor(config: Partial<TBLBridgeConfig> = {}) {
    this.config = {
      enableAutoCapacityDetection: true,
      strictTypeValidation: true,
      allowDuplicateNames: false,
      debugMode: false,
      ...config
    };
  }

  /**
   * 🚀 TRAITEMENT PRINCIPAL - Point d'entrée unique
   * Reçoit un élément TreeBranchLeaf et le traite automatiquement
   */
  async process(node: TreeBranchLeafNode): Promise<TBLProcessResult> {
    try {
      this.log(`Processing node: ${node.id} (${node.label})`);

      // 1. Vérifier si l'élément existe déjà
      const existingElement = this.elements.get(node.id);
      if (existingElement) {
        return this.updateElement(node, existingElement);
      }

      // 2. Créer un nouvel élément TBL
      return await this.createElement(node);

    } catch (error) {
      return {
        success: false,
        action: 'error',
        message: `Erreur lors du traitement: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      };
    }
  }

  /**
   * 🏗️ CRÉATION D'UN NOUVEL ÉLÉMENT TBL
   */
  private async createElement(node: TreeBranchLeafNode): Promise<TBLProcessResult> {
    const warnings: string[] = [];

    // 1. Détecter la capacité automatiquement
    let capacityAnalysis: CapacityAnalysis | undefined;
    let capacity: TBLCapacity = '1'; // Par défaut neutre
    
    if (this.config.enableAutoCapacityDetection) {
      capacityAnalysis = CapacityDetector.detectCapacity(node);
      capacity = capacityAnalysis.capacity;
      
      if (capacityAnalysis.warnings) {
        warnings.push(...capacityAnalysis.warnings);
      }
    }

    // 2. Mapper le type TreeBranchLeaf → Type TBL
    const tblType = this.mapTreeBranchLeafType(node.type, node.parentId);

    // 3. Générer le code TBL unique
    const tblCode = await this.generateTBLCode(tblType, capacity, node.label, node.parentId);
    
    // 4. Vérifier l'unicité du code
    if (this.codeRegistry.has(tblCode) && !this.config.allowDuplicateNames) {
      return {
        success: false,
        action: 'error',
        message: `Code TBL déjà existant: ${tblCode}`
      };
    }

    // 5. Créer l'élément TBL complet
    const tblElement: TBLElement = {
      // Système hybride
      id: node.id,
      nodeId: node.nodeId,
      label: node.label,
      type: node.type,
      parentId: node.parentId,
      
      // Système TBL
      tbl_code: tblCode,
      tbl_type: tblType,
      tbl_capacity: capacity,
      tbl_original_id: node.id,
      
      // Données fonctionnelles
      value: node.value,
      
      // Métadonnées
      tbl_created_at: new Date().toISOString(),
      tbl_updated_at: new Date().toISOString(),
      tbl_confidence: capacityAnalysis?.confidence || 100,
      tbl_source: this.config.enableAutoCapacityDetection ? 'auto' : 'manual'
    };

    // 6. Ajouter les données spécifiques selon la capacité
    this.addCapacitySpecificData(tblElement, node, capacity);

    // 7. Enregistrer l'élément
    this.elements.set(node.id, tblElement);
    this.codeRegistry.set(tblCode, node.id);

    this.log(`✅ Élément créé: ${tblCode} (confiance: ${tblElement.tbl_confidence}%)`);

    return {
      success: true,
      element: tblElement,
      action: 'created',
      message: `Élément TBL créé: ${tblCode}`,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * 🔄 MISE À JOUR D'UN ÉLÉMENT EXISTANT
   */
  private updateElement(node: TreeBranchLeafNode, existing: TBLElement): TBLProcessResult {
    const warnings: string[] = [];

    // 1. Vérifier si des changements sont nécessaires
    const needsUpdate = 
      existing.label !== node.label ||
      existing.value !== node.value ||
      existing.type !== node.type;

    if (!needsUpdate) {
      return {
        success: true,
        element: existing,
        action: 'ignored',
        message: 'Aucun changement détecté'
      };
    }

    // 2. Mettre à jour les champs modifiés
    existing.label = node.label;
    existing.value = node.value;
    existing.type = node.type;
    existing.tbl_updated_at = new Date().toISOString();

    // 3. Re-détecter la capacité si activé
    if (this.config.enableAutoCapacityDetection) {
      const newAnalysis = CapacityDetector.detectCapacity(node);
      if (newAnalysis.capacity !== existing.tbl_capacity) {
        warnings.push(`Capacité changée: ${existing.tbl_capacity} → ${newAnalysis.capacity}`);
        existing.tbl_capacity = newAnalysis.capacity;
        existing.tbl_confidence = newAnalysis.confidence;
      }
    }

    this.log(`🔄 Élément mis à jour: ${existing.tbl_code}`);

    return {
      success: true,
      element: existing,
      action: 'updated',
      message: `Élément TBL mis à jour: ${existing.tbl_code}`,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * 🗺️ MAPPING TYPE TREEBRANCHLEAF → TYPE TBL
   */
  private mapTreeBranchLeafType(type: string, parentId?: string): string {
    const TYPE_MAPPING = {
      'branch': '1',              // Branche → Type 1
      'section': '7',             // Section → Type 7
      'leaf_field': '3',          // Champ → Type 3 (ou 6 si dans section)
      'leaf_option': '4',         // Option → Type 4
      'leaf_option_field': '5'    // Option+champ → Type 5
    };

    let mappedType = TYPE_MAPPING[type as keyof typeof TYPE_MAPPING] || '1';

    // Règle spéciale: leaf_field dans une section devient type 6 (champ données)
    if (type === 'leaf_field' && parentId && this.isSection(parentId)) {
      mappedType = '6';
    }

    // Règle spéciale: branch niveau 2+ devient type 2 (sous-branche)
    if (type === 'branch' && parentId && this.isBranch(parentId)) {
      mappedType = '2';
    }

    return mappedType;
  }

  /**
   * 🏷️ GÉNÉRATION CODE TBL UNIQUE
   */
  private async generateTBLCode(type: string, capacity: string, label: string, parentId?: string): Promise<string> {
    // 1. Normaliser le nom
    const normalizedName = this.normalizeString(label);
    
    // 2. Construire le code de base
    let baseCode = `${type}${capacity}-${normalizedName}`;
    
    // 3. Résoudre les conflits de noms
    let finalCode = baseCode;
    let counter = 1;
    
    while (this.codeRegistry.has(finalCode)) {
      if (this.config.allowDuplicateNames) {
        finalCode = `${baseCode}-${counter}`;
        counter++;
      } else {
        // Ajouter contexte du parent pour différencier
        const parentContext = await this.getParentContext(parentId);
        finalCode = `${type}${capacity}-${normalizedName}-${parentContext}`;
        break;
      }
    }
    
    return finalCode;
  }

  /**
   * 📝 NORMALISATION DES CHAÎNES
   */
  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprimer accents
      .replace(/[^a-z0-9]/g, '-')      // Remplacer caractères spéciaux par -
      .replace(/-+/g, '-')             // Fusionner multiples -
      .replace(/^-|-$/g, '');          // Supprimer - en début/fin
  }

  /**
   * 🔧 AJOUT DONNÉES SPÉCIFIQUES SELON CAPACITÉ
   */
  private addCapacitySpecificData(element: TBLElement, node: TreeBranchLeafNode, capacity: TBLCapacity): void {
    switch (capacity) {
      case '2': // Formule
        if (node.formula_activeId || node.hasFormula) {
          element.formula = "// Formule à implémenter basée sur les données TreeBranchLeaf";
        }
        break;
        
      case '3': // Condition
        if (node.condition_activeId || node.hasCondition) {
          element.condition = {
            expression: "// Expression à extraire de TreeBranchLeaf",
            then: "// Action si vrai",
            else: "// Action si faux",
            dependencies: []
          };
        }
        break;
        
      case '4': // Tableau
        if (node.table_activeId || node.hasTable) {
          element.tableData = {
            type: 'columns',
            data: [],
            columnRefs: [],
            formulas: {}
          };
        }
        break;
    }
  }

  /**
   * 🔍 HELPERS POUR CONTEXTE
   */
  private isSection(elementId: string): boolean {
    const element = this.elements.get(elementId);
    return element?.type === 'section' || false;
  }

  private isBranch(elementId: string): boolean {
    const element = this.elements.get(elementId);
    return element?.type === 'branch' || false;
  }

  private async getParentContext(parentId?: string): Promise<string> {
    if (!parentId) return 'root';
    
    const parent = this.elements.get(parentId);
    if (!parent) return 'unknown';
    
    return this.normalizeString(parent.label).substring(0, 8);
  }

  /**
   * 📊 MÉTHODES D'ACCÈS ET REQUÊTE
   */
  
  getElementByCode(tblCode: string): TBLElement | undefined {
    const id = this.codeRegistry.get(tblCode);
    return id ? this.elements.get(id) : undefined;
  }

  getElementByUUID(uuid: string): TBLElement | undefined {
    return this.elements.get(uuid);
  }

  getAllElements(): TBLElement[] {
    return Array.from(this.elements.values());
  }

  getElementsByType(type: string): TBLElement[] {
    return Array.from(this.elements.values()).filter(el => el.tbl_type === type);
  }

  getElementsByCapacity(capacity: TBLCapacity): TBLElement[] {
    return Array.from(this.elements.values()).filter(el => el.tbl_capacity === capacity);
  }

  /**
   * 📈 STATISTIQUES ET MONITORING
   */
  getStatistics() {
    const elements = this.getAllElements();
    
    const stats = {
      total: elements.length,
      byType: {} as Record<string, number>,
      byCapacity: {} as Record<string, number>,
      averageConfidence: 0,
      autoGenerated: 0,
      manualGenerated: 0
    };

    let totalConfidence = 0;

    for (const element of elements) {
      // Par type
      stats.byType[element.tbl_type] = (stats.byType[element.tbl_type] || 0) + 1;
      
      // Par capacité
      stats.byCapacity[element.tbl_capacity] = (stats.byCapacity[element.tbl_capacity] || 0) + 1;
      
      // Confiance
      totalConfidence += element.tbl_confidence;
      
      // Source
      if (element.tbl_source === 'auto') {
        stats.autoGenerated++;
      } else {
        stats.manualGenerated++;
      }
    }

    stats.averageConfidence = elements.length > 0 ? Math.round(totalConfidence / elements.length) : 0;

    return stats;
  }

  /**
   * 🐛 LOGGING DEBUG
   */
  private log(message: string): void {
    if (this.config.debugMode) {
      logger.debug(`[TBLBridge] ${message}`);
    }
  }

  /**
   * 🧹 UTILITAIRES
   */
  
  clear(): void {
    this.elements.clear();
    this.codeRegistry.clear();
  }

  exportElements(): TBLElement[] {
    return this.getAllElements();
  }

  importElements(elements: TBLElement[]): void {
    this.clear();
    for (const element of elements) {
      this.elements.set(element.id, element);
      this.codeRegistry.set(element.tbl_code, element.id);
    }
  }
}

/**
 * 🎯 INSTANCE GLOBALE PARTAGÉE
 */
export const tblBridge = new TBLBridge({
  enableAutoCapacityDetection: true,
  strictTypeValidation: true,
  allowDuplicateNames: false,
  debugMode: true // À désactiver en production
});

/**
 * 🚀 EXEMPLE D'UTILISATION
 * 
 * ```typescript
 * // Traitement d'un élément TreeBranchLeaf
 * const node: TreeBranchLeafNode = {
 *   id: "uuid-123",
 *   nodeId: "node-456",
 *   label: "Prix total HT",
 *   type: "leaf_field",
 *   hasFormula: true,
 *   formula_activeId: "formula-789"
 * };
 * 
 * const result = await tblBridge.process(node);
 * logger.debug(result);
 * // Output: {
 * //   success: true,
 * //   element: { tbl_code: "32-prix-total-ht", ... },
 * //   action: "created",
 * //   message: "Élément TBL créé: 32-prix-total-ht"
 * // }
 * 
 * // Récupération par code TBL
 * const element = tblBridge.getElementByCode("32-prix-total-ht");
 * ```
 */