import { db } from '../lib/database.js';

const prisma = db;

/**
 * 🚀 SERVICE ADVANCED_SELECT PROFESSIONNEL
 * 
 * Gère la logique métier des champs advanced_select avec :
 * ✅ Calculs automatiques
 * ✅ Validation intelligente
 * ✅ Workflows conditionnels
 * ✅ Architecture scalable
 */

class AdvancedSelectService {
    constructor() {
        this.validationRules = {
            'realistic_energy_price': {
                condition: (value) => value >= 0.05 && value <= 0.50,
                message: 'Prix énergétique irréaliste (attendu: 0.05€ - 0.50€/kWh)',
                level: 'warning'
            },
            'positive_number': {
                condition: (value) => value > 0,
                message: 'La valeur doit être supérieure à 0',
                level: 'error'
            },
            'consumption_realistic': {
                condition: (value) => value >= 1000 && value <= 50000,
                message: 'Consommation annuelle attendue: 1,000 - 50,000 kWh',
                level: 'info'
            }
        };
    }

    /**
     * 📝 Récupérer un champ advanced_select avec ses options
     */
    async getAdvancedSelectField(fieldId, organizationId) {
        try {
            const field = await prisma.field.findFirst({
                where: { 
                    id: fieldId,
                    Section: {
                        Block: {
                            organizationId: organizationId
                        }
                    }
                },
                include: {
                    optionNodes: {
                        orderBy: { order: 'asc' }
                    },
                    Section: {
                        include: {
                            Block: true
                        }
                    }
                }
            });

            if (!field) {
                throw new Error(`Champ advanced_select ${fieldId} non trouvé`);
            }

            // Enrichir les options avec les métadonnées
            const enrichedOptions = field.optionNodes.map(option => ({
                ...option,
                config: this.parseOptionConfig(option.data),
                hasFormula: this.hasFormula(option.data),
                hasValidation: this.hasValidation(option.data)
            }));

            return {
                ...field,
                optionNodes: enrichedOptions,
                capabilities: {
                    hasCalculations: enrichedOptions.some(opt => opt.hasFormula),
                    hasValidations: enrichedOptions.some(opt => opt.hasValidation),
                    supportsDynamicFields: true,
                    supportsWorkflows: true
                }
            };

        } catch (error) {
            console.error('Erreur lors de la récupération du champ advanced_select:', error);
            throw error;
        }
    }

    /**
     * 🧮 Effectuer un calcul basé sur les options sélectionnées
     */
    async performCalculation(fieldId, optionValue, inputData, relatedFieldsData = {}) {
        try {
            // Récupérer la configuration de l'option
            const option = await prisma.fieldOptionNode.findFirst({
                where: { 
                    fieldId: fieldId,
                    value: optionValue
                }
            });

            if (!option || !option.data) {
                throw new Error(`Option ${optionValue} non trouvée ou mal configurée`);
            }

            const config = this.parseOptionConfig(option.data);
            
            // Vérifier s'il y a une formule à appliquer
            if (!config.formula) {
                // Pas de formule, retourner la valeur directe
                return {
                    success: true,
                    result: inputData,
                    type: 'direct_value',
                    validation: this.validateResult(inputData, config.businessLogic?.unit)
                };
            }

            // Effectuer le calcul selon le type de formule
            let result;
            switch (config.formula.type) {
                case 'division':
                    result = await this.performDivisionCalculation(
                        config.formula, 
                        inputData, 
                        relatedFieldsData
                    );
                    break;
                    
                case 'multiplication':
                    result = await this.performMultiplicationCalculation(
                        config.formula, 
                        inputData, 
                        relatedFieldsData
                    );
                    break;
                    
                case 'conditional':
                    result = await this.performConditionalCalculation(
                        config.formula, 
                        inputData, 
                        relatedFieldsData
                    );
                    break;
                    
                default:
                    throw new Error(`Type de formule non supporté: ${config.formula.type}`);
            }

            // Validation du résultat
            const validation = this.validateResult(result, config.businessLogic?.unit);

            // Enregistrer le calcul pour audit
            await this.logCalculation(fieldId, optionValue, inputData, result, validation);

            return {
                success: true,
                result: result,
                type: config.formula.type,
                validation: validation,
                metadata: {
                    formula: config.formula,
                    timestamp: new Date().toISOString(),
                    inputs: { inputData, relatedFieldsData }
                }
            };

        } catch (error) {
            console.error('Erreur lors du calcul:', error);
            return {
                success: false,
                error: error.message,
                type: 'error'
            };
        }
    }

    /**
     * ➗ Calcul de division (ex: prix total / consommation)
     */
    async performDivisionCalculation(formula, numerator, relatedFieldsData) {
        const denominatorFieldId = formula.denominator;
        const denominatorValue = relatedFieldsData[denominatorFieldId];

        if (!denominatorValue || denominatorValue <= 0) {
            throw new Error('Le diviseur doit être supérieur à 0');
        }

        const result = parseFloat(numerator) / parseFloat(denominatorValue);
        const precision = formula.precision || 3;
        
        return parseFloat(result.toFixed(precision));
    }

    /**
     * ✖️ Calcul de multiplication
     */
    async performMultiplicationCalculation(formula, factor1, relatedFieldsData) {
        const factor2FieldId = formula.factor2;
        const factor2Value = relatedFieldsData[factor2FieldId];

        if (!factor2Value) {
            throw new Error('Le second facteur est requis pour la multiplication');
        }

        const result = parseFloat(factor1) * parseFloat(factor2Value);
        const precision = formula.precision || 2;
        
        return parseFloat(result.toFixed(precision));
    }

    /**
     * 🔀 Calcul conditionnel
     */
    async performConditionalCalculation(formula, inputData, relatedFieldsData) {
        // Évaluer les conditions
        for (const condition of formula.conditions) {
            if (this.evaluateCondition(condition.when, relatedFieldsData)) {
                // Condition vraie, exécuter l'action
                return this.executeFormulaAction(condition.then, inputData, relatedFieldsData);
            }
        }

        // Aucune condition remplie, retourner la valeur par défaut
        return formula.default || inputData;
    }

    /**
     * ✅ Validation intelligente des résultats
     */
    validateResult(value, unit = null) {
        const validations = [];

        // Validation générale
        if (value <= 0) {
            validations.push({
                type: 'error',
                message: 'Le résultat doit être supérieur à 0',
                rule: 'positive_number'
            });
        }

        // Validations spécifiques par unité
        if (unit === 'EUR/kWh') {
            if (value < 0.05 || value > 0.50) {
                validations.push({
                    type: 'warning',
                    message: `Prix ${value.toFixed(3)} €/kWh semble ${value < 0.05 ? 'très bas' : 'très élevé'}`,
                    rule: 'realistic_energy_price'
                });
            } else {
                validations.push({
                    type: 'success',
                    message: `Prix ${value.toFixed(3)} €/kWh dans la fourchette normale`,
                    rule: 'realistic_energy_price'
                });
            }
        }

        return {
            isValid: validations.filter(v => v.type === 'error').length === 0,
            validations: validations,
            summary: this.getValidationSummary(validations)
        };
    }

    /**
     * 🔍 Évaluer une condition
     */
    evaluateCondition(condition, data) {
        // Parser la condition (format: "field_id == 'value'")
        const regex = /(\w+)\s*(==|!=|>|<|>=|<=)\s*'([^']+)'/;
        const match = condition.match(regex);
        
        if (!match) return false;
        
        const [, fieldId, operator, expectedValue] = match;
        const actualValue = data[fieldId];
        
        switch (operator) {
            case '==': return actualValue == expectedValue;
            case '!=': return actualValue != expectedValue;
            case '>': return parseFloat(actualValue) > parseFloat(expectedValue);
            case '<': return parseFloat(actualValue) < parseFloat(expectedValue);
            case '>=': return parseFloat(actualValue) >= parseFloat(expectedValue);
            case '<=': return parseFloat(actualValue) <= parseFloat(expectedValue);
            default: return false;
        }
    }

    /**
     * ⚡ Exécuter une action de formule
     */
    executeFormulaAction(action, inputData, relatedFieldsData) {
        // Parser l'action (format: "{{input}} / {{field:field_id}}")
        let processedAction = action;
        
        // Remplacer les variables
        processedAction = processedAction.replace(/\{\{input_value\}\}/g, inputData);
        processedAction = processedAction.replace(/\{\{field:(\w+)\}\}/g, (match, fieldId) => {
            return relatedFieldsData[fieldId] || 0;
        });
        
        // Évaluer l'expression mathématique
        try {
            // Sécurité : ne permettre que les opérations mathématiques de base
            const sanitized = processedAction.replace(/[^0-9+\-*/().\s]/g, '');
            return eval(sanitized);
        } catch (error) {
            throw new Error(`Erreur dans l'évaluation de la formule: ${error.message}`);
        }
    }

    /**
     * 📊 Mettre à jour un champ calculé
     */
    async updateCalculatedField(targetFieldId, value, organizationId, metadata = {}) {
        try {
            // Vérifier que le champ existe
            const field = await prisma.field.findFirst({
                where: { 
                    id: targetFieldId,
                    Section: {
                        Block: {
                            organizationId: organizationId
                        }
                    }
                }
            });

            if (!field) {
                throw new Error(`Champ cible ${targetFieldId} non trouvé`);
            }

            // Mettre à jour la configuration du champ avec la nouvelle valeur
            const updatedConfig = {
                ...field.advancedConfig,
                calculatedValue: value,
                lastCalculation: {
                    timestamp: new Date().toISOString(),
                    value: value,
                    metadata: metadata
                }
            };

            await prisma.field.update({
                where: { id: targetFieldId },
                data: { advancedConfig: updatedConfig }
            });

            return {
                success: true,
                fieldId: targetFieldId,
                value: value,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('Erreur lors de la mise à jour du champ calculé:', error);
            throw error;
        }
    }

    /**
     * 📝 Logger les calculs pour audit
     */
    async logCalculation(fieldId, optionValue, inputData, result, validation) {
        // Note: Ici on pourrait créer une table d'audit des calculs
        console.log('📊 CALCUL EFFECTUÉ:', {
            fieldId,
            optionValue,
            inputData,
            result,
            validation: validation.summary,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * 🔧 Fonctions utilitaires
     */
    parseOptionConfig(data) {
        if (typeof data === 'string') {
            try {
                return JSON.parse(data);
            } catch {
                return {};
            }
        }
        return data || {};
    }

    hasFormula(data) {
        const config = this.parseOptionConfig(data);
        return !!(config.formula && config.formula.type);
    }

    hasValidation(data) {
        const config = this.parseOptionConfig(data);
        return !!(config.validation || config.businessLogic);
    }

    getValidationSummary(validations) {
        const errors = validations.filter(v => v.type === 'error');
        const warnings = validations.filter(v => v.type === 'warning');
        const successes = validations.filter(v => v.type === 'success');

        if (errors.length > 0) {
            return { type: 'error', message: errors[0].message };
        } else if (warnings.length > 0) {
            return { type: 'warning', message: warnings[0].message };
        } else if (successes.length > 0) {
            return { type: 'success', message: successes[0].message };
        } else {
            return { type: 'info', message: 'Validation en attente' };
        }
    }
}

module.exports = AdvancedSelectService;

export default AdvancedSelectService;
