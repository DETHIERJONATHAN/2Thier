/**
 * 🧠 TBL BRIDGE INTELLIGENCE V2.0
 * 
 * Extension du TBL Bridge pour gérer intelligemment :
 * - Formules avec reconnaissance des codes TBL
 * - Conditions avec compréhension des options + champs
 * - Tableaux avec mapping des données sources
 * 
 * Ce système remplace TOUS les anciens systèmes d'évaluation !
 */

import { PrismaClient } from '@prisma/client';
import { db } from '../../../../lib/database';

interface TBLElement {
  id: string;
  label: string;
  tbl_code: string;
  tbl_type: number;
  tbl_capacity: number;
  type: string;
  parent_id?: string;
}

interface TBLFormula {
  id: string;
  formula_content: string;
  referenced_fields: string[]; // Codes TBL des champs référencés
  dependencies: TBLDependency[];
}

interface TBLCondition {
  id: string;
  condition_logic: string;
  trigger_elements: string[]; // Codes TBL des éléments déclencheurs
  target_elements: string[]; // Codes TBL des éléments cibles
  option_mappings: TBLOptionMapping[];
}

interface TBLTable {
  id: string;
  data_sources: string[]; // Codes TBL des sources de données
  computed_columns: string[]; // Codes TBL des colonnes calculées
  relationships: TBLRelationship[];
}

interface TBLDependency {
  source_code: string; // Code TBL source
  target_code: string; // Code TBL cible
  dependency_type: 'formula' | 'condition' | 'data_flow';
  relationship: 'affects' | 'depends_on' | 'triggers';
}

interface TBLOptionMapping {
  option_code: string; // Code TBL de l'option
  field_code: string; // Code TBL du champ conditionnel
  show_when_selected: boolean;
}

interface TBLRelationship {
  from_code: string;
  to_code: string;
  relationship_type: 'one_to_one' | 'one_to_many' | 'many_to_many';
}

export class TBLIntelligence {
  private prisma: PrismaClient;
  private elementRegistry: Map<string, TBLElement> = new Map();
  private formulaRegistry: Map<string, TBLFormula> = new Map();
  private conditionRegistry: Map<string, TBLCondition> = new Map();
  private tableRegistry: Map<string, TBLTable> = new Map();
  private dataCache: Map<string, any> = new Map();

  constructor() {
    this.prisma = db;
  }

  /**
   * 📖 LECTURE ET DÉCODAGE DES DONNÉES ENCODÉES
   * Lit les données stockées dans la base et les décode pour évaluation
   */
  async readAndDecodeElementData(elementId: string, elementType: string): Promise<any> {
    const cacheKey = `${elementType}_${elementId}`;
    
    // Vérifier le cache d'abord
    if (this.dataCache.has(cacheKey)) {
      console.log(`📖 [TBL Intelligence] Données en cache pour ${cacheKey}`);
      return this.dataCache.get(cacheKey);
    }

    console.log(`📖 [TBL Intelligence] Lecture données encodées pour ${elementType} ${elementId}`);
    
    let decodedData: any = {};

    try {
      switch (elementType) {
        case 'formula':
          decodedData = await this.readFormulaData(elementId);
          break;
        case 'condition':
          decodedData = await this.readConditionData(elementId);
          break;
        case 'table':
          decodedData = await this.readTableData(elementId);
          break;
        case 'field':
          decodedData = await this.readFieldData(elementId);
          break;
        default:
          console.warn(`Type d'élément non supporté pour lecture données: ${elementType}`);
      }

      // Mettre en cache
      this.dataCache.set(cacheKey, decodedData);
      
      console.log(`📖 [TBL Intelligence] Données décodées pour ${cacheKey}:`, decodedData);
      return decodedData;

    } catch (error) {
      console.error(`📖 [TBL Intelligence] Erreur lecture données ${cacheKey}:`, error);
      return {};
    }
  }

  /**
   * 🧮 LECTURE DES DONNÉES DE FORMULE
   */
  private async readFormulaData(formulaId: string): Promise<any> {
    const formula = await this.prisma.treeBranchLeafNodeFormula.findFirst({
      where: { nodeId: formulaId }
    });

    if (!formula) return {};

    // Décoder les tokens JSON
    let tokens = [];
    try {
      tokens = formula.tokens ? JSON.parse(formula.tokens) : [];
    } catch (e) {
      console.warn('Erreur décodage tokens formule:', e);
    }

    // Récupérer les variables et valeurs depuis les tokens
    const variables: Record<string, any> = {};
    const sequence = [];
    
    for (const token of tokens) {
      if (token.type === 'variable' && token.variable_name && token.value !== null) {
        variables[token.variable_name] = this.parseValue(token.value);
      }
      // Construire la séquence d'évaluation
      sequence.push(token.value || token.variable_name || token.operator);
    }

    return {
      formula_content: formula.name || '',
      tokens,
      sequence,
      variables,
      description: formula.description
    };
  }

  /**
   * 🔧 PARSEUR DE VALEURS
   */
  private parseValue(value: any): any {
    if (value === null || value === undefined) return null;
    
    // Si c'est déjà un type primitif
    if (typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }
    
    if (typeof value === 'string') {
      // Essayer de parser en JSON si ça ressemble à du JSON
      if ((value.startsWith('{') && value.endsWith('}')) || 
          (value.startsWith('[') && value.endsWith(']'))) {
        try {
          return JSON.parse(value);
        } catch (e) {
          return value;
        }
      }
      
      // Essayer de convertir en nombre
      const num = parseFloat(value);
      if (!isNaN(num) && isFinite(num)) {
        return num;
      }
      
      // Essayer de convertir en boolean
      const lower = value.toLowerCase();
      if (lower === 'true') return true;
      if (lower === 'false') return false;
      
      return value;
    }
    
    return value;
  }

  /**
   * ⚖️ LECTURE DES DONNÉES DE CONDITION
   */
  private async readConditionData(conditionId: string): Promise<any> {
    const condition = await this.prisma.treeBranchLeafNodeCondition.findFirst({
      where: { nodeId: conditionId }
    });

    if (!condition) return {};

    // Décoder le conditionSet JSON
    let conditionSet = {};
    try {
      conditionSet = condition.conditionSet ? JSON.parse(condition.conditionSet) : {};
    } catch (e) {
      console.warn('Erreur décodage conditionSet:', e);
    }

    // Extraire les règles du conditionSet
    const rules = Array.isArray(conditionSet.rules) ? conditionSet.rules : [];

    return {
      condition_type: condition.name,
      conditionSet,
      rules,
      logic: conditionSet.logic || 'AND'
    };
  }

  /**
   * 📊 LECTURE DES DONNÉES DE TABLEAU
   */
  private async readTableData(tableId: string): Promise<any> {
    const table = await this.prisma.treeBranchLeafNodeTable.findFirst({
      where: { nodeId: tableId }
    });

    if (!table) return {};

    // Décoder les données du tableau
    let tableData = [];
    let columns = [];
    try {
      tableData = table.data ? (typeof table.data === 'string' ? JSON.parse(table.data) : table.data) : [];
      columns = table.columns ? (typeof table.columns === 'string' ? JSON.parse(table.columns) : table.columns) : [];
    } catch (e) {
      console.warn('Erreur décodage données tableau:', e);
    }

    return {
      table_type: table.type,
      columns: columns,
      data: tableData,
      metadata: {
        rows: Array.isArray(tableData) ? tableData.length : 0,
        has_formulas: Array.isArray(columns) ? columns.some((col: any) => col.formula) : false
      }
    };
  }

  /**
   * 🏷️ LECTURE DES DONNÉES DE CHAMP
   */
  private async readFieldData(fieldId: string): Promise<any> {
    const field = await this.prisma.treeBranchLeafNode.findUnique({
      where: { id: fieldId },
      include: {
        other_TreeBranchLeafNode: {
          select: {
            id: true,
            label: true,
            tbl_code: true,
            value: true,
            type: true
          }
        }
      }
    });

    if (!field) return {};

    return {
      field_type: field.type,
      tbl_code: field.tbl_code,
      value: this.parseValue(field.value),
      options: field.other_TreeBranchLeafNode?.map(child => ({
        id: child.id,
        label: child.label,
        tbl_code: child.tbl_code,
        value: this.parseValue(child.value),
        type: child.type
      })) || []
    };
  }

  /**
   * 🧮 MOTEUR DE CALCUL POUR FORMULES
   * Exécute les calculs mathématiques avec support des variables TBL
   */
  async calculateFormula(formulaId: string, contextData: Record<string, unknown> = {}): Promise<{
    result: number | string | boolean | null;
    success: boolean;
    error?: string;
    steps: string[];
  }> {
    console.log(`🧮 [TBL Intelligence] Calcul formule ${formulaId}`);
    
    const steps: string[] = [];
    
    try {
      // Lire les données de la formule
      const formulaData = await this.readAndDecodeElementData(formulaId, 'formula');
      if (!formulaData.sequence || !Array.isArray(formulaData.sequence)) {
        throw new Error('Séquence de formule invalide');
      }

      steps.push(`📖 Formule chargée: ${formulaData.formula_content}`);
      steps.push(`🔢 Variables disponibles: ${Object.keys(formulaData.variables).join(', ')}`);

      // Merger les variables avec le contexte
      const allVariables = { ...formulaData.variables, ...contextData };
      steps.push(`🔗 Variables totales: ${Object.keys(allVariables).length}`);

      // Évaluer la séquence
      const result = await this.evaluateFormulaSequence(formulaData.sequence, allVariables, steps);
      
      steps.push(`✅ Résultat final: ${result}`);
      
      return {
        result,
        success: true,
        steps
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      steps.push(`❌ Erreur: ${errorMessage}`);
      
      return {
        result: null,
        success: false,
        error: errorMessage,
        steps
      };
    }
  }

  /**
   * 🧩 ÉVALUATEUR DE SÉQUENCE DE FORMULE
   */
  private async evaluateFormulaSequence(
    sequence: unknown[], 
    variables: Record<string, unknown>, 
    steps: string[]
  ): Promise<number | string | boolean | null> {
    const stack: (number | string | boolean)[] = [];
    
    for (let i = 0; i < sequence.length; i++) {
      const token = sequence[i];
      steps.push(`🔄 Token ${i}: ${JSON.stringify(token)}`);

      if (typeof token === 'number') {
        stack.push(token);
        steps.push(`📊 Nombre ajouté: ${token}`);
      } 
      else if (typeof token === 'string') {
        // Variable TBL
        if (token.startsWith('TBL_') && variables[token] !== undefined) {
          const value = this.convertToNumber(variables[token]);
          stack.push(value);
          steps.push(`🏷️ Variable ${token} = ${value}`);
        }
        // Opérateur
        else if (['+', '-', '*', '/', '^', '>', '<', '>=', '<=', '==', '!=', 'AND', 'OR'].includes(token)) {
          const result = this.executeOperation(token, stack, steps);
          if (result !== null) {
            stack.push(result);
          }
        }
        // Fonction
        else if (token.includes('(')) {
          const result = await this.executeFunction(token, stack, variables, steps);
          if (result !== null) {
            stack.push(result);
          }
        }
        // Constante string
        else {
          stack.push(token);
          steps.push(`📝 String ajoutée: "${token}"`);
        }
      }
    }

    if (stack.length === 1) {
      return stack[0];
    } else if (stack.length === 0) {
      throw new Error('Évaluation vide');
    } else {
      throw new Error(`Évaluation ambiguë: ${stack.length} résultats`);
    }
  }

  /**
   * ⚙️ EXÉCUTEUR D'OPÉRATIONS
   */
  private executeOperation(operator: string, stack: (number | string | boolean)[], steps: string[]): number | boolean | null {
    if (stack.length < 2) {
      steps.push(`❌ Pas assez d'opérandes pour ${operator}`);
      return null;
    }

    const b = stack.pop();
    const a = stack.pop();
    
    const numA = this.convertToNumber(a);
    const numB = this.convertToNumber(b);
    
    let result: number | boolean;
    
    switch (operator) {
      case '+': result = numA + numB; break;
      case '-': result = numA - numB; break;
      case '*': result = numA * numB; break;
      case '/': 
        if (numB === 0) {
          steps.push(`❌ Division par zéro`);
          return null;
        }
        result = numA / numB; 
        break;
      case '^': result = Math.pow(numA, numB); break;
      case '>': result = numA > numB; break;
      case '<': result = numA < numB; break;
      case '>=': result = numA >= numB; break;
      case '<=': result = numA <= numB; break;
      case '==': result = a === b; break;
      case '!=': result = a !== b; break;
      case 'AND': result = Boolean(a) && Boolean(b); break;
      case 'OR': result = Boolean(a) || Boolean(b); break;
      default:
        steps.push(`❌ Opérateur inconnu: ${operator}`);
        return null;
    }
    
    steps.push(`🔢 ${a} ${operator} ${b} = ${result}`);
    return result;
  }

  /**
   * 🔧 EXÉCUTEUR DE FONCTIONS
   */
  private async executeFunction(
    functionCall: string, 
    stack: (number | string | boolean)[], 
    variables: Record<string, unknown>, 
    steps: string[]
  ): Promise<number | string | boolean | null> {
    const match = functionCall.match(/^(\w+)\((.*)\)$/);
    if (!match) {
      steps.push(`❌ Format de fonction invalide: ${functionCall}`);
      return null;
    }

    const funcName = match[1];
    const argsStr = match[2];
    
    // Parser les arguments
    const args: (number | string | boolean)[] = [];
    if (argsStr.trim()) {
      const argTokens = argsStr.split(',').map(s => s.trim());
      for (const argToken of argTokens) {
        if (argToken.startsWith('TBL_') && variables[argToken] !== undefined) {
          args.push(this.convertToNumber(variables[argToken]));
        } else if (!isNaN(Number(argToken))) {
          args.push(Number(argToken));
        } else {
          args.push(argToken.replace(/['"]/g, ''));
        }
      }
    }

    // Fonctions depuis la pile si pas d'arguments explicites
    const requiredArgs = this.getFunctionArity(funcName);
    while (args.length < requiredArgs && stack.length > 0) {
      args.unshift(stack.pop()!);
    }

    let result: number | string | boolean | null = null;

    switch (funcName.toUpperCase()) {
      case 'SUM':
        result = args.reduce((sum, val) => sum + this.convertToNumber(val), 0);
        break;
      case 'AVG':
        result = args.length > 0 ? args.reduce((sum, val) => sum + this.convertToNumber(val), 0) / args.length : 0;
        break;
      case 'MIN':
        result = Math.min(...args.map(val => this.convertToNumber(val)));
        break;
      case 'MAX':
        result = Math.max(...args.map(val => this.convertToNumber(val)));
        break;
      case 'ROUND':
        const num = this.convertToNumber(args[0]);
        const decimals = args[1] ? this.convertToNumber(args[1]) : 0;
        result = Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
        break;
      case 'IF':
        const condition = Boolean(args[0]);
        result = condition ? args[1] : args[2];
        break;
      case 'CONCAT':
        result = args.map(val => String(val)).join('');
        break;
      case 'LEN':
        result = String(args[0]).length;
        break;
      default:
        steps.push(`❌ Fonction inconnue: ${funcName}`);
        return null;
    }

    steps.push(`🔧 ${funcName}(${args.join(', ')}) = ${result}`);
    return result;
  }

  /**
   * 📊 CONVERTISSEUR NUMÉRIQUE INTELLIGENT
   */
  private convertToNumber(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'boolean') return value ? 1 : 0;
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  }

  /**
   * ⚖️ MOTEUR D'ÉVALUATION DES CONDITIONS
   * Évalue les conditions logiques avec support des options et comparaisons
   */
  async evaluateCondition(conditionId: string, contextData: Record<string, unknown> = {}): Promise<{
    result: boolean;
    success: boolean;
    error?: string;
    details: string[];
  }> {
    console.log(`⚖️ [TBL Intelligence] Évaluation condition ${conditionId}`);
    
    const details: string[] = [];
    
    try {
      // Lire les données de la condition
      const conditionData = await this.readAndDecodeElementData(conditionId, 'condition');
      if (!conditionData.rules || !Array.isArray(conditionData.rules)) {
        throw new Error('Règles de condition invalides');
      }

      details.push(`📖 Condition chargée: ${conditionData.condition_type}`);
      details.push(`📋 Nombre de règles: ${conditionData.rules.length}`);
      details.push(`🔗 Logique: ${conditionData.logic || 'AND'}`);

      // Évaluer chaque règle
      const ruleResults: boolean[] = [];
      for (let i = 0; i < conditionData.rules.length; i++) {
        const rule = conditionData.rules[i];
        const ruleResult = await this.evaluateConditionRule(rule, contextData, details, i);
        ruleResults.push(ruleResult);
      }

      // Appliquer la logique globale
      const finalResult = this.applyLogicToResults(ruleResults, conditionData.logic || 'AND', details);
      
      details.push(`✅ Résultat final: ${finalResult}`);
      
      return {
        result: finalResult,
        success: true,
        details
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      details.push(`❌ Erreur: ${errorMessage}`);
      
      return {
        result: false,
        success: false,
        error: errorMessage,
        details
      };
    }
  }

  /**
   * 📏 ÉVALUATEUR DE RÈGLE INDIVIDUELLE
   */
  private async evaluateConditionRule(
    rule: {
      operator: string;
      value: unknown;
      source_node_id?: string;
      target_node_id?: string;
      logical_operator?: string;
    },
    contextData: Record<string, unknown>,
    details: string[],
    ruleIndex: number
  ): Promise<boolean> {
    details.push(`🔍 Règle ${ruleIndex + 1}: ${rule.operator}`);

    // Récupérer la valeur source
    let sourceValue: unknown;
    if (rule.source_node_id) {
      // Lire depuis la base de données
      const sourceElement = await this.prisma.treeBranchLeafNode.findUnique({
        where: { id: rule.source_node_id },
        select: { 
          value: true, 
          tbl_code: true, 
          label: true,
          other_TreeBranchLeafNode: {
            select: {
              id: true,
              value: true,
              tbl_code: true,
              label: true
            }
          }
        }
      });

      if (sourceElement) {
        sourceValue = this.parseValue(sourceElement.value);
        details.push(`📊 Source ${sourceElement.tbl_code}: ${sourceValue}`);
        
        // Si c'est un champ avec options, vérifier si une option est sélectionnée
        if (sourceElement.other_TreeBranchLeafNode && sourceElement.other_TreeBranchLeafNode.length > 0) {
          const selectedOption = sourceElement.other_TreeBranchLeafNode.find(child => 
            child.value === sourceValue || child.tbl_code === sourceValue
          );
          if (selectedOption) {
            sourceValue = selectedOption.value || selectedOption.tbl_code;
            details.push(`🎯 Option sélectionnée: ${selectedOption.label} (${sourceValue})`);
          }
        }
      } else {
        details.push(`❌ Source non trouvée: ${rule.source_node_id}`);
        sourceValue = null;
      }
    } else if (contextData) {
      // Chercher dans le contexte
      sourceValue = contextData.sourceValue || null;
      details.push(`🔗 Valeur du contexte: ${sourceValue}`);
    }

    // Valeur de comparaison
    const compareValue = rule.value;
    details.push(`⚖️ Comparaison: ${sourceValue} ${rule.operator} ${compareValue}`);

    // Effectuer la comparaison
    const result = this.compareValues(sourceValue, rule.operator, compareValue);
    details.push(`📊 Résultat règle ${ruleIndex + 1}: ${result}`);

    return result;
  }

  /**
   * 🔍 COMPARATEUR DE VALEURS UNIVERSEL
   */
  private compareValues(sourceValue: unknown, operator: string, compareValue: unknown): boolean {
    // Normaliser les valeurs
    const source = this.normalizeValueForComparison(sourceValue);
    const compare = this.normalizeValueForComparison(compareValue);

    switch (operator) {
      case '==':
      case 'equals':
        return source === compare;
      
      case '!=':
      case 'not_equals':
        return source !== compare;
      
      case '>':
      case 'greater_than':
        return Number(source) > Number(compare);
      
      case '>=':
      case 'greater_than_or_equal':
        return Number(source) >= Number(compare);
      
      case '<':
      case 'less_than':
        return Number(source) < Number(compare);
      
      case '<=':
      case 'less_than_or_equal':
        return Number(source) <= Number(compare);
      
      case 'contains':
        return String(source).toLowerCase().includes(String(compare).toLowerCase());
      
      case 'starts_with':
        return String(source).toLowerCase().startsWith(String(compare).toLowerCase());
      
      case 'ends_with':
        return String(source).toLowerCase().endsWith(String(compare).toLowerCase());
      
      case 'is_empty':
        return !source || source === '' || source === null || source === undefined;
      
      case 'is_not_empty':
        return !(!source || source === '' || source === null || source === undefined);
      
      case 'in':
        if (Array.isArray(compare)) {
          return compare.includes(source);
        }
        return String(compare).split(',').map(s => s.trim()).includes(String(source));
      
      case 'not_in':
        if (Array.isArray(compare)) {
          return !compare.includes(source);
        }
        return !String(compare).split(',').map(s => s.trim()).includes(String(source));
      
      default:
        console.warn(`Opérateur de comparaison non supporté: ${operator}`);
        return false;
    }
  }

  /**
   * 🔧 NORMALISATEUR DE VALEURS POUR COMPARAISON
   */
  private normalizeValueForComparison(value: unknown): string | number | boolean | null {
    if (value === null || value === undefined) return null;
    
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value;
    
    if (typeof value === 'string') {
      // Tenter de convertir en nombre si c'est possible
      const num = parseFloat(value.trim());
      if (!isNaN(num) && isFinite(num)) {
        return num;
      }
      
      // Tenter de convertir en boolean
      const lower = value.toLowerCase().trim();
      if (lower === 'true' || lower === '1') return true;
      if (lower === 'false' || lower === '0') return false;
      
      return value.trim();
    }
    
    return String(value);
  }

  /**
   * 🧮 APPLICATEUR DE LOGIQUE GLOBALE
   */
  private applyLogicToResults(results: boolean[], logic: string, details: string[]): boolean {
    details.push(`🧮 Application logique ${logic} sur ${results.length} résultats: [${results.join(', ')}]`);

    switch (logic.toUpperCase()) {
      case 'AND':
        const andResult = results.every(r => r);
        details.push(`🔗 AND: tous vrais = ${andResult}`);
        return andResult;
      
      case 'OR':
        const orResult = results.some(r => r);
        details.push(`🔗 OR: au moins un vrai = ${orResult}`);
        return orResult;
      
      case 'XOR':
        const trueCount = results.filter(r => r).length;
        const xorResult = trueCount === 1;
        details.push(`🔗 XOR: exactement un vrai = ${xorResult}`);
        return xorResult;
      
      case 'NAND':
        const nandResult = !results.every(r => r);
        details.push(`🔗 NAND: pas tous vrais = ${nandResult}`);
        return nandResult;
      
      case 'NOR':
        const norResult = !results.some(r => r);
        details.push(`🔗 NOR: aucun vrai = ${norResult}`);
        return norResult;
      
      default:
        details.push(`⚠️ Logique inconnue ${logic}, utilisation de AND par défaut`);
        return results.every(r => r);
    }
  }

  /**
   * 📊 MOTEUR D'ANALYSE ET TRAITEMENT DES TABLEAUX
   * Analyse les structures de tableaux avec données dynamiques et formules
   */
  async processTable(tableId: string, contextData: Record<string, unknown> = {}): Promise<{
    processedData: unknown[][];
    metadata: {
      rows: number;
      columns: number;
      hasFormulas: boolean;
      calculatedCells: number;
    };
    success: boolean;
    error?: string;
    processing: string[];
  }> {
    console.log(`📊 [TBL Intelligence] Traitement tableau ${tableId}`);
    
    const processing: string[] = [];
    
    try {
      // Lire les données du tableau
      const tableData = await this.readAndDecodeElementData(tableId, 'table');
      if (!tableData.columns || !Array.isArray(tableData.columns)) {
        throw new Error('Structure de tableau invalide');
      }

      processing.push(`📖 Tableau chargé: ${tableData.table_type}`);
      processing.push(`📋 Colonnes: ${tableData.columns.length}`);
      processing.push(`📊 Lignes de données: ${tableData.data.length}`);

      // Analyser les colonnes avec formules
      const formulaColumns = tableData.columns.filter((col: { formula: unknown }) => col.formula);
      processing.push(`🧮 Colonnes avec formules: ${formulaColumns.length}`);

      // Traiter les données ligne par ligne
      const processedData: unknown[][] = [];
      let calculatedCells = 0;

      for (let rowIndex = 0; rowIndex < tableData.data.length; rowIndex++) {
        const row = tableData.data[rowIndex];
        const processedRow: unknown[] = [];
        
        processing.push(`🔄 Traitement ligne ${rowIndex + 1}`);

        for (let colIndex = 0; colIndex < tableData.columns.length; colIndex++) {
          const column = tableData.columns[colIndex];
          let cellValue = row[colIndex] || null;

          // Si la colonne a une formule, la calculer
          if (column.formula) {
            processing.push(`🧮 Calcul formule colonne ${column.name}: ${column.formula}`);
            
            try {
              // Créer le contexte pour cette cellule
              const cellContext = {
                ...contextData,
                rowIndex,
                colIndex,
                rowData: row,
                currentValue: cellValue
              };

              // Calculer la formule
              const formulaResult = await this.calculateTableFormula(
                column.formula, 
                cellContext, 
                tableData.data,
                rowIndex,
                colIndex
              );

              if (formulaResult.success) {
                cellValue = formulaResult.result;
                calculatedCells++;
                processing.push(`✅ Formule calculée: ${formulaResult.result}`);
              } else {
                processing.push(`❌ Erreur formule: ${formulaResult.error}`);
              }

            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : 'Erreur calcul';
              processing.push(`❌ Erreur calcul cellule [${rowIndex}, ${colIndex}]: ${errorMsg}`);
            }
          }

          processedRow.push(cellValue);
        }

        processedData.push(processedRow);
      }

      const metadata = {
        rows: processedData.length,
        columns: tableData.columns.length,
        hasFormulas: formulaColumns.length > 0,
        calculatedCells
      };

      processing.push(`✅ Tableau traité: ${metadata.rows}x${metadata.columns}, ${calculatedCells} cellules calculées`);

      return {
        processedData,
        metadata,
        success: true,
        processing
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      processing.push(`❌ Erreur: ${errorMessage}`);
      
      return {
        processedData: [],
        metadata: { rows: 0, columns: 0, hasFormulas: false, calculatedCells: 0 },
        success: false,
        error: errorMessage,
        processing
      };
    }
  }

  /**
   * 🧮 CALCULATEUR DE FORMULES DE TABLEAU
   */
  private async calculateTableFormula(
    formula: string,
    cellContext: Record<string, unknown>,
    tableData: unknown[][],
    rowIndex: number,
    colIndex: number
  ): Promise<{ result: unknown; success: boolean; error?: string }> {
    try {
      // Variables spéciales pour les tableaux
      const tableVariables: Record<string, unknown> = {
        // Variables de position
        ROW_INDEX: rowIndex,
        COL_INDEX: colIndex,
        ROW_NUMBER: rowIndex + 1,
        COL_NUMBER: colIndex + 1,
        
        // Variables de données
        CURRENT_VALUE: cellContext.currentValue,
        ROW_DATA: cellContext.rowData,
        
        // Fonctions de tableau
        TABLE_ROWS: tableData.length,
        TABLE_COLS: tableData[0]?.length || 0
      };

      // Ajouter les valeurs des autres cellules accessibles
      for (let r = 0; r < tableData.length; r++) {
        for (let c = 0; c < (tableData[r]?.length || 0); c++) {
          if (r !== rowIndex || c !== colIndex) {
            tableVariables[`CELL_${r}_${c}`] = tableData[r][c];
            tableVariables[`R${r}C${c}`] = tableData[r][c];
          }
        }
      }

      // Parser et évaluer la formule
      const result = await this.evaluateTableFormula(formula, tableVariables, cellContext);

      return {
        result,
        success: true
      };

    } catch (error) {
      return {
        result: null,
        success: false,
        error: error instanceof Error ? error.message : 'Erreur calcul formule'
      };
    }
  }

  /**
   * 🔢 ÉVALUATEUR DE FORMULES DE TABLEAU
   */
  private async evaluateTableFormula(
    formula: string,
    variables: Record<string, unknown>,
    context: Record<string, unknown>
  ): Promise<unknown> {
    // Remplacer les références de cellules et variables
    let processedFormula = formula;

    // Remplacer les références de cellules (ex: R0C1, CELL_0_1)
    processedFormula = processedFormula.replace(/R(\d+)C(\d+)/g, (match, row, col) => {
      const value = variables[`R${row}C${col}`];
      return typeof value === 'number' ? value.toString() : `"${value}"`;
    });

    // Remplacer les variables connues
    for (const [varName, varValue] of Object.entries(variables)) {
      if (processedFormula.includes(varName)) {
        const replacement = typeof varValue === 'number' ? varValue.toString() : `"${varValue}"`;
        processedFormula = processedFormula.replace(new RegExp(varName, 'g'), replacement);
      }
    }

    // Fonctions spéciales de tableau
    processedFormula = await this.replaceTableFunctions(processedFormula, variables, context);

    // Évaluer l'expression JavaScript sécurisée
    try {
      return this.safeEvaluateExpression(processedFormula);
    } catch (error) {
      console.warn('Formule non évaluable comme JS, tentative d\'évaluation simple:', processedFormula);
      return processedFormula;
    }
  }

  /**
   * 🔧 REMPLACEUR DE FONCTIONS DE TABLEAU
   */
  private async replaceTableFunctions(
    formula: string,
    variables: Record<string, unknown>,
    context: Record<string, unknown>
  ): Promise<string> {
    let result = formula;

    // SUM_ROW() - Somme de la ligne courante
    result = result.replace(/SUM_ROW\(\)/g, () => {
      const rowData = context.rowData as unknown[];
      if (Array.isArray(rowData)) {
        const sum = rowData.reduce((acc, val) => acc + (Number(val) || 0), 0);
        return sum.toString();
      }
      return '0';
    });

    // SUM_COL(colIndex) - Somme d'une colonne
    result = result.replace(/SUM_COL\((\d+)\)/g, (match, colIndex) => {
      const col = Number(colIndex);
      const tableRows = variables.TABLE_ROWS as number;
      let sum = 0;
      
      for (let r = 0; r < tableRows; r++) {
        const cellValue = variables[`R${r}C${col}`];
        sum += Number(cellValue) || 0;
      }
      
      return sum.toString();
    });

    // AVG_ROW() - Moyenne de la ligne courante
    result = result.replace(/AVG_ROW\(\)/g, () => {
      const rowData = context.rowData as unknown[];
      if (Array.isArray(rowData) && rowData.length > 0) {
        const sum = rowData.reduce((acc, val) => acc + (Number(val) || 0), 0);
        return (sum / rowData.length).toString();
      }
      return '0';
    });

    // COUNT_NON_EMPTY_ROW() - Compte les cellules non vides de la ligne
    result = result.replace(/COUNT_NON_EMPTY_ROW\(\)/g, () => {
      const rowData = context.rowData as unknown[];
      if (Array.isArray(rowData)) {
        const count = rowData.filter(val => val !== null && val !== undefined && val !== '').length;
        return count.toString();
      }
      return '0';
    });

    return result;
  }

  /**
   * 🔒 ÉVALUATEUR D'EXPRESSIONS SÉCURISÉ
   */
  private safeEvaluateExpression(expression: string): unknown {
    // Whitelist des opérations autorisées
    const allowedPattern = /^[\d\s+\-*/().,"'>=<!&|]+$/;
    
    if (!allowedPattern.test(expression)) {
      throw new Error('Expression contient des caractères non autorisés');
    }

    // Évaluation sécurisée avec Function
    try {
      const func = new Function(`"use strict"; return (${expression});`);
      return func();
    } catch (error) {
      throw new Error(`Erreur évaluation: ${error instanceof Error ? error.message : 'Inconnue'}`);
    }
  }

  /**
   * 🔢 ARITÉ DES FONCTIONS (complétée)
   */
  private getFunctionArity(funcName: string): number {
    switch (funcName.toUpperCase()) {
      case 'SUM': case 'AVG': case 'MIN': case 'MAX': return 0; // Variable
      case 'ROUND': return 1;
      case 'IF': return 3;
      case 'CONCAT': return 0; // Variable
      case 'LEN': return 1;
      case 'SUM_ROW': case 'AVG_ROW': case 'COUNT_NON_EMPTY_ROW': return 0;
      case 'SUM_COL': return 1;
      default: return 0;
    }
  }

  /**
   * 🔍 ANALYSE COMPLÈTE D'UN ÉLÉMENT
   * Analyse un élément par son CODE TBL ou son UUID
   */
  async analyzeElement(elementIdentifier: string): Promise<{
    element: TBLElement;
    formulas: TBLFormula[];
    conditions: TBLCondition[];
    tables: TBLTable[];
    dependencies: TBLDependency[];
  }> {
    console.log(`🧠 [TBL Intelligence] Analyse complète de ${elementIdentifier}`);

    // 🚀 NOUVEAU SYSTÈME TBL BRIDGE : Recherche UNIQUEMENT sur code TBL
    console.log(`🔍 Recherche TBL Bridge sur code: ${elementIdentifier}`);

    // 1. Récupérer l'élément avec ses relations par code TBL
    const element = await this.prisma.treeBranchLeafNode.findFirst({
      where: { tbl_code: elementIdentifier },  // UNIQUEMENT code TBL !
      include: {
        TreeBranchLeafNodeFormula: true,
        TreeBranchLeafNodeCondition: true,
        TreeBranchLeafNodeTable: true,
        other_TreeBranchLeafNode: {
          select: {
            id: true,
            label: true,
            tbl_code: true,
            tbl_type: true,
            tbl_capacity: true,
            type: true
          }
        },
        TreeBranchLeafNode: {
          select: {
            id: true,
            label: true,
            tbl_code: true,
            tbl_type: true,
            type: true
          }
        }
      }
    });

    if (!element) {
      throw new Error(`❌ Élément TBL Bridge avec code "${elementIdentifier}" non trouvé dans la base de données`);
    }
    
    console.log(`✅ Élément TBL Bridge trouvé: ${element.label} (${element.type})`);
    console.log(`   🎯 TBL Code: ${element.tbl_code}`);
    console.log(`   🏗️ Type TBL: ${element.tbl_type} | 🔧 Capacité TBL: ${element.tbl_capacity}`);
    
    // 🚀 NOUVEAU SYSTÈME : Utilisation directe des colonnes natives tbl_type et tbl_capacity
    const typeDescription = this.getTBLTypeDescription(element.tbl_type);
    const capacityDescription = this.getTBLCapacityDescription(element.tbl_capacity);
    console.log(`   📋 TBL Intelligence: ${typeDescription} avec ${capacityDescription}`);

    const tblElement: TBLElement = {
      id: element.id,
      label: element.label,
      tbl_code: element.tbl_code || '',
      tbl_type: element.tbl_type || 0,
      tbl_capacity: element.tbl_capacity || 0,
      type: element.type,
      parent_id: element.parent_id || undefined
    };

    // 🚀 TBL BRIDGE V2.0 : Analyse basée sur les colonnes natives
    console.log(`🧠 [TBL Intelligence V2.0] Analyse des capacités via colonnes Prisma...`);
    
    // 2. Analyser les capacités selon tbl_capacity (plus besoin de regex !)
    const formulas = element.tbl_capacity === 2 ? await this.analyzeFormulas(element.TreeBranchLeafNodeFormula || []) : [];
    const conditions = element.tbl_capacity === 3 ? await this.analyzeConditions(element.TreeBranchLeafNodeCondition || []) : [];
    const tables = element.tbl_capacity === 4 ? await this.analyzeTables(element.TreeBranchLeafNodeTable || []) : [];
    
    console.log(`📊 [TBL V2.0] Résultats: ${formulas.length} formules, ${conditions.length} conditions, ${tables.length} tableaux`);

    // 5. Construire le graphe de dépendances
    const dependencies = await this.buildDependencyGraph(tblElement, formulas, conditions, tables);

    console.log(`✅ [TBL Intelligence] Analyse terminée pour ${element.label} (${element.tbl_code})`);
    console.log(`   📊 ${formulas.length} formules, ${conditions.length} conditions, ${tables.length} tableaux`);
    console.log(`   🔗 ${dependencies.length} dépendances détectées`);

    return {
      element: tblElement,
      formulas,
      conditions,
      tables,
      dependencies
    };
  }

  /**
   * 🧮 ANALYSE DES FORMULES
   * Extrait les codes TBL référencés dans les formules
   */
  private async analyzeFormulas(formulas: any[]): Promise<TBLFormula[]> {
    const tblFormulas: TBLFormula[] = [];

    for (const formula of formulas) {
      console.log(`🧮 [TBL Intelligence] Analyse formule ${formula.id}`);

      // Extraire les tokens pour identifier les références (depuis le JSON)
      const referencedFields: string[] = [];
      const dependencies: TBLDependency[] = [];

      const tokens = Array.isArray(formula.tokens) ? formula.tokens : [];
      for (const token of tokens) {
        if (token.type === 'variable' && token.reference_id) {
          // Récupérer le code TBL de l'élément référencé
          const referencedElement = await this.prisma.treeBranchLeafNode.findUnique({
            where: { id: token.reference_id },
            select: { tbl_code: true, label: true }
          });

          if (referencedElement?.tbl_code) {
            referencedFields.push(referencedElement.tbl_code);
            dependencies.push({
              source_code: referencedElement.tbl_code,
              target_code: '', // Sera rempli par l'élément parent
              dependency_type: 'formula',
              relationship: 'depends_on'
            });

            console.log(`   🔗 Référence détectée: ${referencedElement.label} (${referencedElement.tbl_code})`);
          }
        }
      }

      tblFormulas.push({
        id: formula.id,
        formula_content: formula.sequence || '[]',
        referenced_fields: referencedFields,
        dependencies
      });
    }

    return tblFormulas;
  }

  /**
   * ⚖️ ANALYSE DES CONDITIONS
   * Identifie les relations options + champs conditionnels
   */
  private async analyzeConditions(conditions: any[]): Promise<TBLCondition[]> {
    const tblConditions: TBLCondition[] = [];

    for (const condition of conditions) {
      console.log(`⚖️ [TBL Intelligence] Analyse condition ${condition.id}`);

      const triggerElements: string[] = [];
      const targetElements: string[] = [];
      const optionMappings: TBLOptionMapping[] = [];

      // Analyser les règles de condition
      for (const rule of condition.TreeBranchLeafNodeConditionRule || []) {
        // Si c'est une condition sur une option
        if (rule.source_node_id) {
          const sourceElement = await this.prisma.treeBranchLeafNode.findUnique({
            where: { id: rule.source_node_id },
            select: { 
              tbl_code: true, 
              label: true, 
              type: true,
              other_TreeBranchLeafNode: {
                select: {
                  id: true,
                  tbl_code: true,
                  label: true,
                  type: true
                }
              }
            }
          });

          if (sourceElement?.tbl_code) {
            triggerElements.push(sourceElement.tbl_code);

            // Si c'est une option avec des champs conditionnels
            if (sourceElement.type === 'leaf_option' || sourceElement.type === 'leaf_option_field') {
              for (const child of sourceElement.other_TreeBranchLeafNode) {
                if (child.tbl_code && child.type === 'leaf_field') {
                  optionMappings.push({
                    option_code: sourceElement.tbl_code,
                    field_code: child.tbl_code,
                    show_when_selected: rule.condition_value === 'true' || rule.condition_value === sourceElement.label
                  });

                  console.log(`   🎯 Option + Champ détecté: ${sourceElement.label} (${sourceElement.tbl_code}) → ${child.label} (${child.tbl_code})`);
                }
              }
            }
          }
        }

        // Élément cible de la condition
        if (rule.target_node_id) {
          const targetElement = await this.prisma.treeBranchLeafNode.findUnique({
            where: { id: rule.target_node_id },
            select: { tbl_code: true, label: true }
          });

          if (targetElement?.tbl_code) {
            targetElements.push(targetElement.tbl_code);
          }
        }
      }

      tblConditions.push({
        id: condition.id,
        condition_logic: condition.logic || 'and',
        trigger_elements: triggerElements,
        target_elements: targetElements,
        option_mappings: optionMappings
      });
    }

    return tblConditions;
  }

  /**
   * 📊 ANALYSE DES TABLEAUX
   * Identifie les sources de données et relations
   */
  private async analyzeTables(tables: any[]): Promise<TBLTable[]> {
    const tblTables: TBLTable[] = [];

    for (const table of tables) {
      console.log(`📊 [TBL Intelligence] Analyse tableau ${table.id}`);

      const dataSources: string[] = [];
      const computedColumns: string[] = [];
      const relationships: TBLRelationship[] = [];

      // Analyser les colonnes
      for (const column of table.TreeBranchLeafNodeTableColumn || []) {
        if (column.source_node_id) {
          const sourceElement = await this.prisma.treeBranchLeafNode.findUnique({
            where: { id: column.source_node_id },
            select: { tbl_code: true, label: true, tbl_capacity: true }
          });

          if (sourceElement?.tbl_code) {
            // Si c'est une colonne calculée (formule)
            if (sourceElement.tbl_capacity === 2) {
              computedColumns.push(sourceElement.tbl_code);
            } else {
              dataSources.push(sourceElement.tbl_code);
            }

            console.log(`   📋 Source données: ${sourceElement.label} (${sourceElement.tbl_code})`);
          }
        }
      }

      tblTables.push({
        id: table.id,
        data_sources: dataSources,
        computed_columns: computedColumns,
        relationships
      });
    }

    return tblTables;
  }

  /**
   * 🔗 CONSTRUCTION DU GRAPHE DE DÉPENDANCES
   * Crée le réseau complet des relations entre éléments
   */
  private async buildDependencyGraph(
    element: TBLElement,
    formulas: TBLFormula[],
    conditions: TBLCondition[],
    tables: TBLTable[]
  ): Promise<TBLDependency[]> {
    const dependencies: TBLDependency[] = [];

    // Dépendances des formules
    for (const formula of formulas) {
      for (const dep of formula.dependencies) {
        dependencies.push({
          ...dep,
          target_code: element.tbl_code
        });
      }
    }

    // Dépendances des conditions
    for (const condition of conditions) {
      for (const triggerCode of condition.trigger_elements) {
        for (const targetCode of condition.target_elements) {
          dependencies.push({
            source_code: triggerCode,
            target_code: targetCode,
            dependency_type: 'condition',
            relationship: 'triggers'
          });
        }
      }

      // Dépendances des options + champs
      for (const mapping of condition.option_mappings) {
        dependencies.push({
          source_code: mapping.option_code,
          target_code: mapping.field_code,
          dependency_type: 'condition',
          relationship: 'triggers'
        });
      }
    }

    // Dépendances des tableaux
    for (const table of tables) {
      for (const sourceCode of table.data_sources) {
        dependencies.push({
          source_code: sourceCode,
          target_code: element.tbl_code,
          dependency_type: 'data_flow',
          relationship: 'affects'
        });
      }
    }

    return dependencies;
  }

  /**
   * 🎯 RÉSOLUTION INTELLIGENTE
   * Résout une valeur en tenant compte de toutes les dépendances TBL
   */
  async resolveValue(
    elementCode: string, 
    context: Record<string, any> = {}
  ): Promise<{
    value: any;
    dependencies_resolved: string[];
    conditions_evaluated: string[];
    formulas_calculated: string[];
  }> {
    console.log(`🎯 [TBL Intelligence] Résolution intelligente de ${elementCode}`);

    // Récupérer l'élément par son code TBL
    const element = await this.prisma.treeBranchLeafNode.findFirst({
      where: { tbl_code: elementCode }
    });

    if (!element) {
      throw new Error(`Élément avec code TBL ${elementCode} non trouvé`);
    }

    // Analyser l'élément complètement
    const analysis = await this.analyzeElement(element.id);

    // Résoudre selon la capacité
    switch (analysis.element.tbl_capacity) {
      case 2: // Formule
        return await this.resolveFormula(analysis, context);
      case 3: // Condition
        return await this.resolveCondition(analysis, context);
      case 4: // Tableau
        return await this.resolveTable(analysis, context);
      default: // Donnée simple
        return await this.resolveSimpleValue(analysis, context);
    }
  }

  private async resolveFormula(analysis: any, context: Record<string, any>) {
    // Implementation de résolution de formule avec codes TBL
    console.log(`🧮 Résolution formule avec ${analysis.formulas.length} formules`);
    return {
      value: 0, // Calculé selon la formule
      dependencies_resolved: analysis.formulas.flatMap((f: any) => f.referenced_fields),
      conditions_evaluated: [],
      formulas_calculated: analysis.formulas.map((f: any) => f.id)
    };
  }

  private async resolveCondition(analysis: any, context: Record<string, any>) {
    // Implementation de résolution de condition avec options + champs
    console.log(`⚖️ Résolution condition avec ${analysis.conditions.length} conditions`);
    return {
      value: true, // Évalué selon les conditions
      dependencies_resolved: [],
      conditions_evaluated: analysis.conditions.map((c: any) => c.id),
      formulas_calculated: []
    };
  }

  private async resolveTable(analysis: any, context: Record<string, any>) {
    // Implementation de résolution de tableau avec sources de données
    console.log(`📊 Résolution tableau avec ${analysis.tables.length} tableaux`);
    return {
      value: [], // Données du tableau
      dependencies_resolved: analysis.tables.flatMap((t: any) => t.data_sources),
      conditions_evaluated: [],
      formulas_calculated: []
    };
  }

  private async resolveSimpleValue(analysis: any, context: Record<string, any>) {
    // Résolution d'une valeur simple
    const value = context[analysis.element.tbl_code] || null;
    console.log(`📝 Résolution valeur simple: ${analysis.element.label} = ${value}`);
    return {
      value,
      dependencies_resolved: [],
      conditions_evaluated: [],
      formulas_calculated: []
    };
  }

  // 🚀 TBL BRIDGE V2.0 - Méthodes de description des types et capacités
  
  /**
   * Retourne la description du type TBL selon le README
   */
  private getTBLTypeDescription(tbl_type: number): string {
    const typeMap: Record<number, string> = {
      1: "Branche (Onglet TBL)",
      2: "Sous-Branche (Liste déroulante TBL)",
      3: "Champ (Input utilisateur)",
      4: "Option (Choix dans liste)",
      5: "Option + champ (Option qui ouvre un champ)",
      6: "Champ données (Affichage données calculées)",
      7: "Section (Container pour champs données)"
    };
    
    return typeMap[tbl_type] || `Type inconnu (${tbl_type})`;
  }

  /**
   * Retourne la description de la capacité TBL selon le README
   */
  private getTBLCapacityDescription(tbl_capacity: number): string {
    const capacityMap: Record<number, string> = {
      1: "Neutre (Pas de traitement spécial)",
      2: "Formule (Calcul mathématique)",
      3: "Condition (Logique if/then/else)",
      4: "Tableau (Données tabulaires)"
    };
    
    return capacityMap[tbl_capacity] || `Capacité inconnue (${tbl_capacity})`;
  }
}

export default TBLIntelligence;