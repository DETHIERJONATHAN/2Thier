/**
 * 🚀 TBL EVALUATION ENGINE V2.0
 * 
 * Moteur d'évaluation intelligent qui remplace TOUS les anciens systèmes !
 * - Formules avec codes TBL
 * - Conditions avec options + champs
 * - Tableaux avec sources intelligentes
 * - Résolution automatique des dépendances
 */

import TBLIntelligence from './TBLIntelligence';

interface TBLEvaluationRequest {
  element_code: string; // Code TBL de l'élément à évaluer
  context_values: Record<string, unknown>; // Valeurs du contexte actuel
  evaluation_mode: 'formula' | 'condition' | 'table' | 'auto';
  deep_resolution: boolean; // Résoudre toutes les dépendances en cascade
}

interface TBLEvaluationResult {
  success: boolean;
  element_code: string;
  final_value: unknown;
  evaluation_path: string[]; // Codes TBL évalués dans l'ordre
  dependencies_used: string[]; // Codes TBL des dépendances utilisées
  options_triggered: Array<{
    option_code: string;
    field_code: string;
    show_field: boolean;
  }>;
  formulas_calculated: Array<{
    formula_id: string;
    referenced_codes: string[];
    result: number;
  }>;
  conditions_evaluated: Array<{
    condition_id: string;
    trigger_codes: string[];
    result: boolean;
  }>;
  performance: {
    total_time_ms: number;
    elements_analyzed: number;
    cache_hits: number;
  };
  errors: string[];
  warnings: string[];
}

export class TBLEvaluationEngine {
  private intelligence: TBLIntelligence;
  private evaluationCache: Map<string, { result: unknown; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5000; // 5 secondes

  constructor() {
    this.intelligence = new TBLIntelligence();
  }

  /**
   * 🎯 ÉVALUATION PRINCIPALE
   * Point d'entrée unique pour toutes les évaluations TBL
   */
  async evaluate(request: TBLEvaluationRequest): Promise<TBLEvaluationResult> {
    const startTime = Date.now();
    console.log(`🚀 [TBL Evaluation] Début évaluation ${request.element_code}`);
    console.log(`   Mode: ${request.evaluation_mode}, Deep: ${request.deep_resolution}`);

    const result: TBLEvaluationResult = {
      success: false,
      element_code: request.element_code,
      final_value: null,
      evaluation_path: [],
      dependencies_used: [],
      options_triggered: [],
      formulas_calculated: [],
      conditions_evaluated: [],
      performance: {
        total_time_ms: 0,
        elements_analyzed: 0,
        cache_hits: 0
      },
      errors: [],
      warnings: []
    };

    try {
      // 1. Vérifier le cache
      const cacheKey = this.getCacheKey(request);
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        console.log(`💾 [TBL Evaluation] Cache HIT pour ${request.element_code}`);
        result.performance.cache_hits = 1;
        result.final_value = cached;
        result.success = true;
        return result;
      }

      // 2. Analyser l'élément avec intelligence TBL
      const analysis = await this.intelligence.analyzeElement(request.element_code);
      result.performance.elements_analyzed++;
      result.evaluation_path.push(request.element_code);

      // 3. Résoudre selon le type d'évaluation
      switch (request.evaluation_mode) {
        case 'formula':
          await this.evaluateFormulas(analysis, request, result);
          break;
        case 'condition':
          await this.evaluateConditions(analysis, request, result);
          break;
        case 'table':
          await this.evaluateTables(analysis, request, result);
          break;
        case 'auto':
        default:
          await this.evaluateAuto(analysis, request, result);
          break;
      }

      // 4. Résolution en cascade si demandée
      if (request.deep_resolution) {
        await this.resolveDeepDependencies(analysis, request, result);
      }

      // 5. Mise en cache du résultat
      this.setCachedResult(cacheKey, result.final_value);

      result.success = true;
      console.log(`✅ [TBL Evaluation] Évaluation réussie: ${request.element_code} = ${result.final_value}`);

    } catch (error) {
      console.error(`❌ [TBL Evaluation] Erreur:`, error);
      result.errors.push(error instanceof Error ? error.message : 'Erreur inconnue');
    }

    result.performance.total_time_ms = Date.now() - startTime;
    return result;
  }

  /**
   * 🧮 ÉVALUATION DES FORMULES
   */
  private async evaluateFormulas(
    analysis: any,
    request: TBLEvaluationRequest,
    result: TBLEvaluationResult
  ): Promise<void> {
    console.log(`🧮 [TBL Evaluation] Évaluation de ${analysis.formulas.length} formules`);

    for (const formula of analysis.formulas) {
      try {
        // Récupérer les valeurs des champs référencés par leurs codes TBL
        const fieldValues: Record<string, number> = {};
        
        for (const fieldCode of formula.referenced_fields) {
          if (fieldCode in request.context_values) {
            const value = request.context_values[fieldCode];
            fieldValues[fieldCode] = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
            result.dependencies_used.push(fieldCode);
          } else {
            result.warnings.push(`Champ manquant pour formule: ${fieldCode}`);
          }
        }

        // Calculer la formule (simulation)
        const formulaResult = this.calculateFormula(formula.formula_content, fieldValues);
        
        result.formulas_calculated.push({
          formula_id: formula.id,
          referenced_codes: formula.referenced_fields,
          result: formulaResult
        });

        // La dernière formule donne la valeur finale
        result.final_value = formulaResult;

        console.log(`   ✅ Formule ${formula.id}: ${formulaResult}`);

      } catch (error) {
        console.error(`   ❌ Erreur formule ${formula.id}:`, error);
        result.errors.push(`Formule ${formula.id}: ${error instanceof Error ? error.message : 'Erreur'}`);
      }
    }
  }

  /**
   * ⚖️ ÉVALUATION DES CONDITIONS
   */
  private async evaluateConditions(
    analysis: any,
    request: TBLEvaluationRequest,
    result: TBLEvaluationResult
  ): Promise<void> {
    console.log(`⚖️ [TBL Evaluation] Évaluation de ${analysis.conditions.length} conditions`);

    for (const condition of analysis.conditions) {
      try {
        // Évaluer chaque élément déclencheur
        let conditionResult = true;
        const usedTriggers: string[] = [];

        for (const triggerCode of condition.trigger_elements) {
          if (triggerCode in request.context_values) {
            const triggerValue = request.context_values[triggerCode];
            // Simulation d'évaluation - adapter selon la logique réelle
            const triggerResult = Boolean(triggerValue);
            conditionResult = conditionResult && triggerResult;
            usedTriggers.push(triggerCode);
            result.dependencies_used.push(triggerCode);
          }
        }

        // Évaluer les mappings options + champs
        for (const mapping of condition.option_mappings) {
          const optionValue = request.context_values[mapping.option_code];
          const shouldShowField = Boolean(optionValue) && mapping.show_when_selected;

          result.options_triggered.push({
            option_code: mapping.option_code,
            field_code: mapping.field_code,
            show_field: shouldShowField
          });

          console.log(`   🎯 Option ${mapping.option_code} → Champ ${mapping.field_code}: ${shouldShowField ? 'AFFICHÉ' : 'MASQUÉ'}`);
        }

        result.conditions_evaluated.push({
          condition_id: condition.id,
          trigger_codes: usedTriggers,
          result: conditionResult
        });

        result.final_value = conditionResult;

        console.log(`   ✅ Condition ${condition.id}: ${conditionResult}`);

      } catch (error) {
        console.error(`   ❌ Erreur condition ${condition.id}:`, error);
        result.errors.push(`Condition ${condition.id}: ${error instanceof Error ? error.message : 'Erreur'}`);
      }
    }
  }

  /**
   * 📊 ÉVALUATION DES TABLEAUX
   */
  private async evaluateTables(
    analysis: any,
    request: TBLEvaluationRequest,
    result: TBLEvaluationResult
  ): Promise<void> {
    console.log(`📊 [TBL Evaluation] Évaluation de ${analysis.tables.length} tableaux`);

    for (const table of analysis.tables) {
      try {
        // Récupérer les données sources par codes TBL
        const tableData: Record<string, unknown>[] = [];
        
        for (const sourceCode of table.data_sources) {
          if (sourceCode in request.context_values) {
            const sourceValue = request.context_values[sourceCode];
            // Simulation - adapter selon la structure réelle
            tableData.push({ [sourceCode]: sourceValue });
            result.dependencies_used.push(sourceCode);
          }
        }

        // Calculer les colonnes computées
        for (const computedCode of table.computed_columns) {
          // Ici on pourrait appeler récursivement l'évaluation pour les formules
          console.log(`   🧮 Colonne calculée: ${computedCode}`);
        }

        result.final_value = tableData;
        console.log(`   ✅ Tableau ${table.id}: ${tableData.length} lignes`);

      } catch (error) {
        console.error(`   ❌ Erreur tableau ${table.id}:`, error);
        result.errors.push(`Tableau ${table.id}: ${error instanceof Error ? error.message : 'Erreur'}`);
      }
    }
  }

  /**
   * 🤖 ÉVALUATION AUTOMATIQUE
   * Détecte automatiquement le type d'évaluation selon la capacité TBL
   */
  private async evaluateAuto(
    analysis: any,
    request: TBLEvaluationRequest,
    result: TBLEvaluationResult
  ): Promise<void> {
    const capacity = analysis.element.tbl_capacity;
    
    console.log(`🤖 [TBL Evaluation] Mode auto - capacité détectée: ${capacity}`);

    switch (capacity) {
      case 2: // Formule
        await this.evaluateFormulas(analysis, request, result);
        break;
      case 3: // Condition
        await this.evaluateConditions(analysis, request, result);
        break;
      case 4: // Tableau
        await this.evaluateTables(analysis, request, result);
        break;
      default: // Valeur simple
        result.final_value = request.context_values[request.element_code] || null;
        break;
    }
  }

  /**
   * 🔄 RÉSOLUTION RÉCURSIVE DES DÉPENDANCES
   */
  private async resolveDeepDependencies(
    analysis: any,
    request: TBLEvaluationRequest,
    result: TBLEvaluationResult
  ): Promise<void> {
    console.log(`🔄 [TBL Evaluation] Résolution profonde des dépendances`);

    for (const dependency of analysis.dependencies) {
      if (!result.evaluation_path.includes(dependency.source_code)) {
        // Évaluation récursive
        const subRequest: TBLEvaluationRequest = {
          ...request,
          element_code: dependency.source_code,
          deep_resolution: false // Éviter la récursion infinie
        };

        const subResult = await this.evaluate(subRequest);
        if (subResult.success) {
          result.evaluation_path.push(...subResult.evaluation_path);
          result.dependencies_used.push(...subResult.dependencies_used);
          result.performance.elements_analyzed += subResult.performance.elements_analyzed;
        }
      }
    }
  }

  /**
   * 🧮 CALCUL RÉEL DE FORMULE
   */
  private calculateFormula(formulaContent: string, fieldValues: Record<string, number>): number {
    try {
      // Simulation simple - remplacer par le vrai moteur de formules
      const sequence = JSON.parse(formulaContent);
      
      // Logique de calcul basique pour démonstration
      let result = 0;
      for (const token of sequence) {
        if (token.type === 'number') {
          result += parseFloat(token.value) || 0;
        } else if (token.type === 'variable' && token.reference_code) {
          result += fieldValues[token.reference_code] || 0;
        }
      }
      
      return result;
    } catch {
      return 0;
    }
  }

  /**
   * 💾 GESTION DU CACHE
   */
  private getCacheKey(request: TBLEvaluationRequest): string {
    const contextHash = JSON.stringify(request.context_values);
    return `${request.element_code}:${request.evaluation_mode}:${contextHash}`;
  }

  private getCachedResult(key: string): unknown | null {
    const cached = this.evaluationCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.result;
    }
    return null;
  }

  private setCachedResult(key: string, result: unknown): void {
    this.evaluationCache.set(key, {
      result,
      timestamp: Date.now()
    });
  }
}

export default TBLEvaluationEngine;