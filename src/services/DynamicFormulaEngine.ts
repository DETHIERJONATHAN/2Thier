/**
 * 🌟 MOTEUR DE FORMULES DYNAMIQUES UNIVERSEL
 * 
 * Ce service s'adapte automatiquement aux configurations des formulaires
 * et respecte toutes les conditions encodées pour TOUS les devis et formules.
 * 
 * Fonctionnalités :
 * - Lecture dynamique des configurations
 * - Adaptation automatique aux changements
 * - Support de toutes les conditions complexes  
 * - Gestion des advanced_select avec logique conditionnelle
 * - Calculs en  async applyFormulas(fieldValues: Record<string, unknown>, options?: { 
    changedFieldId?: string; 
    debug?: boolean;
    preloadedRules?: Record<string, { formulas?: any[] }>;
  }): Promise<{
    success: boolean;
    calculatedValues: Record<string, unknown>;
    appliedFormulas: { id: string; name: string }[];
    errors?: string[];
  }> {el
 */

import { db } from '../lib/database';
import { getFieldMapping } from '../config/fieldMapping';

// Types pour le système dynamique
interface FieldConfiguration {
  id: string;
  label: string;
  type: string;
  advancedConfig?: Record<string, unknown> | null;
  options?: OptionNode[];
  formulas?: FieldFormula[];
  dependencies?: FieldDependency[];
  validations?: FieldValidation[];
}

interface OptionNode {
  id: string;
  label: string;
  value: string;
  fieldId: string;
}

interface FieldFormula {
  id: string;
  formula?: string;
  sequence: Record<string, unknown> | unknown[];
  fieldId: string;
  name?: string;
  order?: number;
}

interface RuleFormula {
  id: string;
  sequence?: unknown;
  order?: number;
  name?: string;
  targetFieldId?: string;
}

interface FieldDependency {
  id: string;
  fieldId: string;
  dependsOnId: string;
  condition: string;
  value?: string;
}

interface FieldValidation {
  id: string;
  fieldId: string;
  rule: string;
  message?: string;
}

interface ConditionalLogic {
  condition: string;
  field1: string;
  operator: string;
  field2: string;
  thenAction: string;
  elseAction: string;
  resultField?: string;
}

interface CalculationContext {
  fieldValues: Record<string, string | number | boolean>;
  fieldConfigs: Record<string, FieldConfiguration>;
  organizationId: string;
}

export class DynamicFormulaEngine {
  private prisma: typeof db;
  private configCache: Map<string, FieldConfiguration> = new Map();
  private formulaCache: Map<string, ConditionalLogic[]> = new Map();
  private fieldMapping = getFieldMapping(); // Mapping des champs centralisé

  constructor() {
    this.prisma = db;
  }

  /**
   * 🔄 Charge toutes les configurations de champs dynamiquement
   */
  async loadFieldConfigurations(organizationId: string): Promise<Record<string, FieldConfiguration>> {
    // const cacheKey = `configs_${organizationId}`;
    
    try {
      console.log('🔄 [DynamicFormulaEngine] Chargement des configurations pour org:', organizationId);
      
      const fields = await this.prisma.field.findMany({
        include: {
          FieldFormula: true,
          FieldDependency_FieldDependency_fieldIdToField: {
            include: {
              Field_FieldDependency_dependsOnIdToField: true
            }
          },
          FieldValidation: true,
          optionNodes: true
        }
      });

      const configurations: Record<string, FieldConfiguration> = {};

      for (const field of fields) {
        const config: FieldConfiguration = {
          id: field.id,
          label: field.label,
          type: field.type,
          advancedConfig: field.advancedConfig,
          options: field.optionNodes.map(node => ({
            id: node.id,
            label: node.label,
            value: node.value,
            fieldId: node.fieldId
          })),
          formulas: field.FieldFormula.map(formula => ({
            id: formula.id,
            formula: formula.formula || '',
            sequence: formula.sequence,
            fieldId: formula.fieldId
          })),
          dependencies: field.FieldDependency_FieldDependency_fieldIdToField.map(dep => ({
            id: dep.id,
            fieldId: dep.fieldId,
            dependsOnId: dep.dependsOnId,
            condition: dep.condition,
            value: dep.value || ''
          })),
          validations: field.FieldValidation.map(val => ({
            id: val.id,
            fieldId: val.fieldId,
            rule: val.rule,
            message: val.message || ''
          }))
        };

        configurations[field.id] = config;
        this.configCache.set(field.id, config);
      }

      console.log('✅ [DynamicFormulaEngine] Configurations chargées:', Object.keys(configurations).length);
      return configurations;

    } catch (error) {
      console.error('❌ [DynamicFormulaEngine] Erreur chargement configurations:', error);
      throw new Error(`Erreur lors du chargement des configurations: ${error.message}`);
    }
  }

  /**
   * 🧠 Analyse et interprète les logiques conditionnelles automatiquement
   */
  analyzeConditionalLogic(fieldConfig: FieldConfiguration): ConditionalLogic[] {
    const logics: ConditionalLogic[] = [];

    // 1. Analyse des advanced_select (comme Prix Kw/h)
    if (fieldConfig.type === 'advanced_select' && fieldConfig.options) {
      for (const option of fieldConfig.options) {
        // Exemple: "Prix Kw/h" vs "Calcul du prix Kw/h"
        const logic = this.interpretAdvancedSelectOption(fieldConfig, option);
        if (logic) {
          logics.push(logic);
        }
      }
    }

    // 2. Analyse des formules existantes
    if (fieldConfig.formulas) {
      for (const formula of fieldConfig.formulas) {
        const logic = this.parseFormulaToConditionalLogic(formula);
        if (logic) {
          logics.push(logic);
        }
      }
    }

    // 3. Analyse des dépendances
    if (fieldConfig.dependencies) {
      for (const dependency of fieldConfig.dependencies) {
        const logic = this.interpretDependencyAsLogic(dependency);
        if (logic) {
          logics.push(logic);
        }
      }
    }

    return logics;
  }

  /**
   * 🎯 Interprète une option d'advanced_select en logique conditionnelle
   */
  private interpretAdvancedSelectOption(fieldConfig: FieldConfiguration, option: OptionNode): ConditionalLogic | null {
    // Exemple pour Prix Kw/h
    if (fieldConfig.label.includes('Prix Kw/h')) {
      if (option.value === 'prix-kwh') {
        // Logique: SI "Prix Kw/h - Défini" = "Prix Kw/h (number)" ALORS copier
        return {
          condition: `IF_${fieldConfig.id}_EQUALS_DIRECT_VALUE`,
          field1: '52c7f63b-7e57-4ba8-86da-19a176f09220', // Prix Kw/h - Défini
          operator: 'EQUALS',
          field2: 'direct_price_value', // Valeur directe saisie
          thenAction: 'COPY_VALUE',
          elseAction: 'CALCULATE_DIVISION',
          resultField: fieldConfig.id
        };
      } else if (option.value === 'calcul-du-prix-kwh') {
        // Logique: Division par consommation annuelle
        return {
          condition: `IF_${fieldConfig.id}_EQUALS_CALCULATION`,
          field1: 'calcul_du_prix_base', // Champ base de calcul
          operator: 'DIVIDE_BY',
          field2: 'aa448cfa-3d97-4c23-8995-8e013577e27d', // Consommation annuelle
          thenAction: 'PERFORM_DIVISION',
          elseAction: 'USE_DEFAULT',
          resultField: '52c7f63b-7e57-4ba8-86da-19a176f09220' // Prix Kw/h - Défini
        };
      }
    }

    return null;
  }

  /**
   * 📐 Parse une formule textuelle en logique conditionnelle
   */
  private parseFormulaToConditionalLogic(formula: FieldFormula): ConditionalLogic | null {
    if (!formula.formula) return null;

    // Patterns de reconnaissance automatique
    const patterns = [
      {
        regex: /IF\s+(.+?)\s*=\s*(.+?)\s+THEN\s+(.+?)\s+ELSE\s+(.+)/i,
        handler: (matches: RegExpMatchArray) => ({
          condition: `PARSED_${formula.id}`,
          field1: matches[1].trim(),
          operator: 'EQUALS',
          field2: matches[2].trim(),
          thenAction: matches[3].trim(),
          elseAction: matches[4].trim(),
          resultField: formula.fieldId
        })
      },
      {
        regex: /(.+?)\s*\/\s*(.+)/,
        handler: (matches: RegExpMatchArray) => ({
          condition: `DIVISION_${formula.id}`,
          field1: matches[1].trim(),
          operator: 'DIVIDE_BY',
          field2: matches[2].trim(),
          thenAction: 'PERFORM_DIVISION',
          elseAction: 'USE_DEFAULT',
          resultField: formula.fieldId
        })
      }
    ];

    for (const pattern of patterns) {
      const matches = formula.formula.match(pattern.regex);
      if (matches) {
        return pattern.handler(matches);
      }
    }

    return null;
  }

  /**
   * 🔗 Interprète une dépendance comme logique conditionnelle
   */
  private interpretDependencyAsLogic(dependency: FieldDependency): ConditionalLogic | null {
    return {
      condition: `DEPENDENCY_${dependency.id}`,
      field1: dependency.fieldId,
      operator: dependency.condition as string,
      field2: dependency.dependsOnId,
      thenAction: 'UPDATE_FIELD',
      elseAction: 'NO_ACTION',
      resultField: dependency.fieldId
    };
  }

  /**
   * 🧮 Exécute les calculs dynamiques selon les configurations
   */
  async executeCalculations(context: CalculationContext): Promise<Record<string, string | number | boolean>> {
    console.log('🧮 [DynamicFormulaEngine] Exécution des calculs dynamiques...');
    
    const results: Record<string, string | number | boolean> = {};
    
    try {
      // 1. Identifier tous les champs avec logiques conditionnelles
      const conditionalFields = Object.values(context.fieldConfigs)
        .filter(config => config.type === 'advanced_select' || 
                         (config.formulas && config.formulas.length > 0) ||
                         (config.dependencies && config.dependencies.length > 0));

      console.log('🎯 Champs conditionnels trouvés:', conditionalFields.length);

      // 2. Exécuter les logiques pour chaque champ
      for (const fieldConfig of conditionalFields) {
        const logics = this.analyzeConditionalLogic(fieldConfig);
        
        for (const logic of logics) {
          const result = await this.executeConditionalLogic(logic, context);
          if (result !== null) {
            results[logic.resultField || fieldConfig.id] = result;
          }
        }
      }

      // 3. Cas spécifique Prix Kw/h (selon votre demande)
      if (context.fieldValues[this.fieldMapping.prix_kwh]) {
        const prixKwhResult = await this.executePrixKwhLogic(context);
        if (prixKwhResult !== null) {
          results[this.fieldMapping.prix_mois] = prixKwhResult;
        }
      }

      console.log('✅ [DynamicFormulaEngine] Calculs terminés:', Object.keys(results).length);
      return results;

    } catch (error) {
      console.error('❌ [DynamicFormulaEngine] Erreur dans les calculs:', error);
      throw error;
    }
  }

  /**
   * ⚡ Logique spécifique Prix Kw/h selon vos spécifications
   */
  private async executePrixKwhLogic(context: CalculationContext): Promise<number | null> {
    const selectedOption = context.fieldValues[this.fieldMapping.prix_kwh];
    const prixDefini = context.fieldValues[this.fieldMapping.prix_mois];
    const consommation = context.fieldValues[this.fieldMapping.consommation_kwh];

    console.log('⚡ [Prix Kw/h Logic] Option sélectionnée:', selectedOption);
    console.log('⚡ [Prix Kw/h Logic] Prix défini actuel:', prixDefini);
    console.log('⚡ [Prix Kw/h Logic] Consommation:', consommation);

    // Logique selon votre formule : 
    // "Si Prix Kw/h - Défini = Prix Kw/h (number) alors copier, sinon diviser Calcul du prix par Consommation annuelle"
    
    if (selectedOption === 'prix-kwh') {
      // Option "Prix Kw/h" sélectionnée -> utiliser la valeur directe saisie
      const directValue = context.fieldValues['direct_prix_kwh_input'];
      console.log('💡 Utilisation valeur directe:', directValue);
      return directValue || prixDefini || 0;
      
    } else if (selectedOption === 'calcul-du-prix-kwh') {
      // Option "Calcul du prix Kw/h" sélectionnée -> diviser par consommation
      const calculBase = context.fieldValues['calcul_du_prix_base'] || prixDefini || 0;
      const consommationValue = parseFloat(consommation) || 1;
      
      const result = calculBase / consommationValue;
      console.log('🧮 Calcul division:', calculBase, '/', consommationValue, '=', result);
      return result;
    }

    return null;
  }

  /**
   * 🎯 Exécute une logique conditionnelle spécifique
   */
  private async executeConditionalLogic(logic: ConditionalLogic, context: CalculationContext): Promise<string | number | boolean | null> {
    const value1 = context.fieldValues[logic.field1] || '';
    const value2 = context.fieldValues[logic.field2] || '';

    console.log('🎯 Exécution logique:', logic.condition);
    console.log('   Field1:', logic.field1, '=', value1);
    console.log('   Operator:', logic.operator);
    console.log('   Field2:', logic.field2, '=', value2);

    let conditionMet = false;

    // Évaluation de la condition
    switch (logic.operator) {
      case 'EQUALS':
        conditionMet = value1 === value2;
        break;
      case 'DIVIDE_BY': {
        const num1 = parseFloat(String(value1)) || 0;
        const num2 = parseFloat(String(value2)) || 1;
        return num1 / num2;
      }
      case 'MULTIPLY_BY':
        return (parseFloat(String(value1)) || 0) * (parseFloat(String(value2)) || 1);
      case 'GREATER_THAN':
        conditionMet = parseFloat(String(value1)) > parseFloat(String(value2));
        break;
      case 'LESS_THAN':
        conditionMet = parseFloat(String(value1)) < parseFloat(String(value2));
        break;
      default:
        console.log('⚠️ Opérateur non reconnu:', logic.operator);
    }

    // Exécution de l'action
    const action = conditionMet ? logic.thenAction : logic.elseAction;
    console.log('✨ Action à exécuter:', action, '(condition met:', conditionMet, ')');

    switch (action) {
      case 'COPY_VALUE':
        return value1;
      case 'PERFORM_DIVISION':
        return (parseFloat(String(value1)) || 0) / (parseFloat(String(value2)) || 1);
      case 'USE_DEFAULT':
        return context.fieldValues[logic.resultField || ''] || 0;
      case 'NO_ACTION':
        return null;
      default:
        console.log('⚠️ Action non reconnue:', action);
        return null;
    }
  }

  /**
   * 🔄 Met à jour une configuration de champ (adaptatif)
   */
  async updateFieldConfiguration(fieldId: string, newConfig: Partial<FieldConfiguration>): Promise<void> {
    try {
      console.log('🔄 [DynamicFormulaEngine] Mise à jour configuration:', fieldId);

      // Mise à jour dans la base
      const updateData: Record<string, unknown> = {};
      
      if (newConfig.advancedConfig) {
        updateData.advancedConfig = newConfig.advancedConfig;
      }

      if (Object.keys(updateData).length > 0) {
        await this.prisma.field.update({
          where: { id: fieldId },
          data: updateData
        });

        // Invalidation du cache
        this.configCache.delete(fieldId);
        console.log('✅ Configuration mise à jour et cache invalidé');
      }

    } catch (error) {
      console.error('❌ Erreur mise à jour configuration:', error);
      throw error;
    }
  }

  /**
   * � Méthode principale appelée par DevisPage
   * Applique toutes les formules dynamiques selon les configurations de la base de données
   */
  async applyFormulas(fieldValues: Record<string, unknown>, options?: { 
    changedFieldId?: string; 
    debug?: boolean;
    preloadedRules?: Record<string, { formulas?: RuleFormula[] }>;
  }): Promise<{ 
    success: boolean; 
    calculatedValues: Record<string, unknown>; 
    appliedFormulas: Array<{ id: string; name: string }>;
    errors?: string[] 
  }> {
    const debug = options?.debug || false;
    const changedFieldId = options?.changedFieldId;
    const preloadedRules = options?.preloadedRules;
    
    if (debug) console.log('🚀 [DynamicFormulaEngine] Application des formules - déclenchée par:', changedFieldId, 'règles préchargées:', !!preloadedRules);
    
    try {
      const calculatedValues: Record<string, unknown> = {};
      const appliedFormulas: Array<{ id: string; name: string }> = [];
      const errors: string[] = [];

      // Récupérer les formules depuis les règles préchargées ou la base de données
      let formulas: Array<FieldFormula | RuleFormula> = [];
      
      if (preloadedRules) {
        // Utiliser les règles préchargées du DevisPage
        if (debug) console.log('📋 Utilisation des règles préchargées');
        Object.entries(preloadedRules).forEach(([fieldId, rules]) => {
          if (rules.formulas && Array.isArray(rules.formulas)) {
            rules.formulas.forEach((formula: RuleFormula) => {
              formulas.push({
                ...formula,
                fieldId: fieldId
              });
            });
          }
        });
        if (debug) console.log(`📊 ${formulas.length} formules trouvées dans les règles préchargées`);
      } else {
        // Fallback: requêtes à la base de données
        if (debug) console.log('🔄 Chargement des formules depuis la base de données');
        formulas = await this.prisma.fieldFormula.findMany({
          orderBy: { order: 'asc' }
        });
      }

      for (const formula of formulas) {
        if (!formula.sequence) continue;
        
        try {
          let sequence: unknown[];
          
          // Gérer les deux formats : string JSON (ancien modèle direct) ou array déjà parsé (API)
          if (typeof formula.sequence === 'string') {
            try {
              sequence = JSON.parse(formula.sequence);
            } catch {
              if (debug) console.warn('⚠️ Formule avec séquence JSON invalide:', formula.id);
              continue;
            }
          } else if (Array.isArray(formula.sequence)) {
            sequence = formula.sequence;
          } else {
            if (debug) console.warn('⚠️ Formule avec format de séquence non supporté:', formula.id);
            continue;
          }

          if (!Array.isArray(sequence) || sequence.length === 0) continue;

          const result = await this.evaluateFormulaSequence(sequence, fieldValues, { debug });
          
          if (result.success && result.value !== undefined) {
            calculatedValues[formula.fieldId] = result.value;
            appliedFormulas.push({ id: formula.id, name: formula.name || formula.id });
            
            if (debug) {
              console.log(`✅ Formule appliquée: ${formula.name} → ${formula.fieldId} = ${result.value}`);
            }
          } else if (result.error) {
            errors.push(`Erreur formule ${formula.name}: ${result.error}`);
          }

        } catch (formulaError) {
          const errorMsg = formulaError instanceof Error ? formulaError.message : String(formulaError);
          errors.push(`Erreur formule ${formula.name || formula.id}: ${errorMsg}`);
          if (debug) console.error('❌ Erreur formule:', formula.id, errorMsg);
        }
      }

      return {
        success: true,
        calculatedValues,
        appliedFormulas,
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (debug) console.error('❌ [DynamicFormulaEngine] Erreur générale:', errorMsg);
      
      return {
        success: false,
        calculatedValues: {},
        appliedFormulas: [],
        errors: [errorMsg]
      };
    }
  }

  /**
   * 🎯 Évalue une séquence de formule (comme notre formule Prix Kw/h)
   */
  private async evaluateFormulaSequence(
    sequence: unknown[], 
    fieldValues: Record<string, unknown>,
    options: { debug?: boolean } = {}
  ): Promise<{ success: boolean; value?: unknown; error?: string }> {
    
    const debug = options.debug || false;
    
    for (const item of sequence) {
      if (!item || typeof item !== 'object') continue;
      
      const element = item as Record<string, unknown>;
      
      // Traitement conditionnel (comme notre formule Prix Kw/h)
      if (element.type === 'cond') {
        return this.evaluateConditionalElement(element, fieldValues, { debug });
      }
    }
    
    return { success: false, error: 'Aucun élément évaluable dans la séquence' };
  }

  /**
   * 🔀 Évalue un élément conditionnel (IF/THEN/ELSE)
   */
  private async evaluateConditionalElement(
    element: Record<string, unknown>,
    fieldValues: Record<string, unknown>,
    options: { debug?: boolean } = {}
  ): Promise<{ success: boolean; value?: unknown; error?: string }> {
    
    const debug = options.debug || false;
    
    // Vérifier la condition
    const condition = element.condition as Record<string, unknown> | undefined;
    if (!condition) {
      return { success: false, error: 'Condition manquante' };
    }

    const fieldId = condition.fieldId as string;
    const operator = condition.operator as string;
    const expectedValue = condition.value as string;
    const part = condition.part as string || 'selection';

    // Récupérer la valeur du champ de condition
    let actualValue: unknown;
    const fieldValue = fieldValues[fieldId];
    
    if (fieldValue && typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
      // Advanced select avec selection/extra
      const obj = fieldValue as Record<string, unknown>;
      actualValue = obj[part];
    } else {
      actualValue = fieldValue;
    }

    if (debug) {
      console.log(`🔍 Condition: ${fieldId}.${part} ${operator} ${expectedValue}`);
      console.log(`🔍 Valeur actuelle: ${actualValue}`);
    }

    // Évaluer la condition
    let conditionMet = false;
    if (operator === '=') {
      conditionMet = actualValue === expectedValue;
    }

    if (debug) {
      console.log(`🔍 Condition remplie: ${conditionMet}`);
    }

    // Choisir la branche THEN ou ELSE
    const branch = conditionMet ? element.then : element.else;
    if (!Array.isArray(branch)) {
      return { success: false, error: 'Branche manquante' };
    }

    // Évaluer la branche
    return this.evaluateBranch(branch, fieldValues, { debug });
  }

  /**
   * 🌿 Évalue une branche (THEN ou ELSE)
   */
  private async evaluateBranch(
    branch: unknown[],
    fieldValues: Record<string, unknown>,
    options: { debug?: boolean } = {}
  ): Promise<{ success: boolean; value?: unknown; error?: string }> {
    
    const debug = options.debug || false;
    
    if (debug) {
      console.log(`🌿 evaluateBranch: longueur = ${branch.length}`);
      console.log(`🌿 Structure branche:`, JSON.stringify(branch, null, 2));
    }
    
    if (branch.length === 1) {
      // Branche simple (THEN) - retourner valeur directe
      const action = branch[0] as Record<string, unknown>;
      return this.evaluateAction(action, fieldValues, { debug });
      
    } else if (branch.length === 3) {
      // Branche complexe (ELSE) - évaluation d'expression [valeur, opérateur, valeur]
      const value1Action = branch[0] as Record<string, unknown>;
      const operatorAction = branch[1] as Record<string, unknown>;
      const value2Action = branch[2] as Record<string, unknown>;
      
      if (debug) {
        console.log(`🧮 Évaluation branche 3 éléments:`);
        console.log(`🧮 Élément 1:`, JSON.stringify(value1Action, null, 2));
        console.log(`🧮 Élément 2:`, JSON.stringify(operatorAction, null, 2));
        console.log(`🧮 Élément 3:`, JSON.stringify(value2Action, null, 2));
      }
      
      const val1Result = await this.evaluateAction(value1Action, fieldValues, { debug });
      const val2Result = await this.evaluateAction(value2Action, fieldValues, { debug });
      
      if (debug) {
        console.log(`🧮 Résultat val1:`, val1Result);
        console.log(`🧮 Résultat val2:`, val2Result);
      }
      
      if (!val1Result.success || !val2Result.success) {
        return { success: false, error: 'Erreur évaluation des opérandes' };
      }
      
      const operator = operatorAction.value as string;
      const num1 = parseFloat(String(val1Result.value)) || 0;
      const num2 = parseFloat(String(val2Result.value)) || 0;
      
      if (debug) {
        console.log(`🧮 Calcul: ${num1} ${operator} ${num2}`);
      }
      
      if (operator === '/') {
        if (num2 === 0) {
          return { success: false, error: 'Division par zéro' };
        }
        const result = num1 / num2;
        if (debug) console.log(`🧮 Résultat division: ${result}`);
        return { success: true, value: result };
      }
    } else {
      if (debug) {
        console.log(`🌿 Branche non traitée - longueur: ${branch.length}`);
        console.log(`🌿 Contenu:`, JSON.stringify(branch, null, 2));
      }
    }
    
    return { success: false, error: 'Structure de branche non supportée' };
  }

  /**
   * ⚡ Évalue une action individuelle
   */
  private async evaluateAction(
    action: Record<string, unknown>,
    fieldValues: Record<string, unknown>,
    options: { debug?: boolean } = {}
  ): Promise<{ success: boolean; value?: unknown; error?: string }> {
    
    const debug = options.debug || false;
    const type = action.type as string;
    const value = action.value as string;
    
    if (debug) {
      console.log(`⚡ Action: ${type} = ${value}`);
    }
    
    if (type === 'value' && typeof value === 'string' && value.startsWith('nextField:')) {
      // Référence à un sous-champ d'advanced_select (nextField:uuid)
      const nextFieldId = value.substring('nextField:'.length);
      
      if (debug) console.log(`🔍 Recherche NextField: ${nextFieldId}`);
      
      // CORRECTION: Chercher directement le nodeId qui correspond
  for (const [_fieldId, fieldValue] of Object.entries(fieldValues)) {
        if (fieldValue && typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
          const obj = fieldValue as Record<string, unknown>;
          // Si c'est un advanced_select avec nodeId qui correspond DIRECTEMENT
          if (obj.nodeId === nextFieldId && obj.extra !== undefined) {
            // Trouvé ! Retourner la valeur extra
            const result = parseFloat(String(obj.extra)) || 0;
            if (debug) console.log(`📋 NextField trouvé directement: ${result} (nodeId: ${nextFieldId})`);
            return { success: true, value: result };
          }
        }
      }
      
      // Trouver le champ advanced_select qui contient cette référence (ancienne logique pour compatibilité)
      for (const [, fieldValue] of Object.entries(fieldValues)) {
        if (fieldValue && typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
          const obj = fieldValue as Record<string, unknown>;
          // Si c'est un advanced_select avec extra qui correspond
          if (obj.nodeId && obj.extra !== undefined) {
            // Vérifier si ce nodeId a le nextField correspondant
            try {
              const node = await this.prisma.optionNode.findUnique({
                where: { id: obj.nodeId as string }
              });
              
              if (node && node.data) {
                const nodeData = typeof node.data === 'string' ? JSON.parse(node.data) : node.data;
                if (nodeData && typeof nodeData === 'object') {
                  const nextField = (nodeData as Record<string, unknown>).nextField;
                  if (nextField && typeof nextField === 'object') {
                    const nextFieldObj = nextField as Record<string, unknown>;
                    if (nextFieldObj.id === nextFieldId) {
                      // Trouvé ! Retourner la valeur extra
                      const result = parseFloat(String(obj.extra)) || 0;
                      if (debug) console.log(`📋 NextField trouvé: ${result}`);
                      return { success: true, value: result };
                    }
                  }
                }
              }
            } catch {
              // Continuer la recherche
            }
          }
        }
      }
      
      return { success: false, error: `NextField ${nextFieldId} non trouvé` };
      
    } else if (type === 'field') {
      // Référence directe à un champ
      const fieldValue = fieldValues[value];
      const numValue = parseFloat(String(fieldValue)) || 0;
      if (debug) console.log(`📋 Field ${value}: ${numValue}`);
      return { success: true, value: numValue };
      
    } else if (type === 'value') {
      // Valeur littérale
      const numValue = parseFloat(String(value)) || 0;
      if (debug) console.log(`📋 Value: ${numValue}`);
      return { success: true, value: numValue };
    }
    
    return { success: false, error: `Type d'action non supporté: ${type}` };
  }

  /**
   * �🗑️ Nettoyage des ressources
   */
  async cleanup(): Promise<void> {
    this.configCache.clear();
    this.formulaCache.clear();
    await this.prisma.$disconnect();
  }
}

export default DynamicFormulaEngine;
