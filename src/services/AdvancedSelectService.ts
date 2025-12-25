import { prisma } from '../lib/prisma';

/**
 * 🚀 SERVICE PROFESSIONNEL POUR ADVANCED_SELECT
 * 
 * Ce service gère la logique métier complexe des champs advanced_select :
 * - Récupération intelligente des données
 * - Calculs automatiques (division, multiplication, conditions)
 * - Validation avancée des résultats
 * - Workflows et dépendances entre champs
 * - Logging et audit des opérations
 * 
 * Architecture: Service/Business Layer Pattern
 * Compatible: No-code, scalable, extensible
 */

interface Field {
    id: string;
    name: string;
    type: string;
    organization_id: number;
    is_required: boolean;
    data?: Record<string, unknown>;
    capabilities?: string[];
    options?: FieldOption[];
}

interface FieldOption {
    label: string;
    value: string;
    data: Record<string, unknown>;
}

interface CalculationResult {
    success: boolean;
    result?: number;
    unit?: string;
    formatted?: string;
    metadata?: {
        operation?: string;
        operands?: number[];
        precision?: number;
        formula?: {
            type: string;
            result_field?: string;
            [key: string]: unknown;
        };
        businessLogic?: {
            category: string;
            unit: string;
        };
        validation?: {
            isValid: boolean;
            rules: string[];
        };
        calculationTime?: number;
    };
    error?: string;
}

interface ValidationResult {
    isValid: boolean;
    validations: Array<{
        rule: string;
        passed: boolean;
        message: string;
        severity: 'error' | 'warning' | 'info';
    }>;
    summary: {
        passed: number;
        failed: number;
        warnings: number;
    };
}

class AdvancedSelectService {
    
    /**
     * 📝 Récupérer un champ advanced_select avec ses options enrichies
     */
    async getAdvancedSelectField(fieldId: string, organizationId: string): Promise<Field> {
        const field = await prisma.field.findFirst({
            where: {
                id: fieldId,
                organization_id: parseInt(organizationId),
                type: 'advanced_select'
            },
            include: {
                optionNodes: {
                    include: {
                        children: true,
                        fieldDependencies: true,
                        formulaDependencies: true
                    }
                }
            }
        });

        if (!field) {
            throw new Error(`Champ advanced_select ${fieldId} non trouvé`);
        }

        // Enrichir avec les capacités dynamiques
        const capabilities = [];
        
        // Vérifier si le champ a des formules
        if (field.optionNodes.some(node => node.data && 
            typeof node.data === 'object' && 
            node.data !== null &&
            'formula' in node.data)) {
            capabilities.push('dynamic_calculation');
        }
        
        // Vérifier si le champ a des validations
        if (field.optionNodes.some(node => node.data && 
            typeof node.data === 'object' && 
            node.data !== null &&
            'validation' in node.data)) {
            capabilities.push('validation');
        }
        
        // Vérifier si le champ a des workflows
        if (field.optionNodes.some(node => node.data && 
            typeof node.data === 'object' && 
            node.data !== null &&
            'workflow' in node.data)) {
            capabilities.push('workflow');
        }

        // Transformer les optionNodes en format frontend
        const options = field.optionNodes.map(node => ({
            label: node.label,
            value: node.value,
            data: node.data as Record<string, unknown> || {}
        }));

        return {
            ...field,
            capabilities,
            options
        };
    }

    /**
     * 🧮 Effectuer un calcul basé sur une option et des données
     */
    async performCalculation(
        fieldId: string, 
        optionValue: string, 
        inputData: number, 
        relatedFieldsData: Record<string, unknown> = {}
    ): Promise<CalculationResult> {
        const startTime = Date.now();

        try {
            // Récupérer la configuration de l'option
            const option = await this.getOptionConfiguration(fieldId, optionValue);
            
            if (!option?.data) {
                return {
                    success: false,
                    error: `Option ${optionValue} non trouvée ou sans configuration`
                };
            }

            const optionData = option.data as Record<string, unknown>;

            // Vérifier si l'option a une formule
            if (!optionData.formula) {
                return {
                    success: false,
                    error: 'Cette option ne supporte pas les calculs automatiques'
                };
            }

            const formula = optionData.formula as Record<string, unknown>;
            let result: number | undefined;
            let unit = '';
            let operation = '';
            const operands: number[] = [inputData];

            // Effectuer le calcul selon le type de formule
            switch (formula.type) {
                case 'division': {
                    const denominatorFieldId = formula.denominator as string;
                    const denominatorValue = relatedFieldsData[denominatorFieldId];
                    
                    if (!denominatorValue || typeof denominatorValue !== 'number') {
                        return {
                            success: false,
                            error: `Valeur du dénominateur manquante (field: ${denominatorFieldId})`
                        };
                    }
                    
                    if (denominatorValue === 0) {
                        return {
                            success: false,
                            error: 'Division par zéro impossible'
                        };
                    }
                    
                    result = inputData / denominatorValue;
                    operation = 'division';
                    operands.push(denominatorValue);
                    break;
                }

                case 'multiplication': {
                    const multiplierFieldId = formula.multiplier as string;
                    const multiplierValue = relatedFieldsData[multiplierFieldId];
                    
                    if (!multiplierValue || typeof multiplierValue !== 'number') {
                        return {
                            success: false,
                            error: `Valeur du multiplicateur manquante (field: ${multiplierFieldId})`
                        };
                    }
                    
                    result = inputData * multiplierValue;
                    operation = 'multiplication';
                    operands.push(multiplierValue);
                    break;
                }

                case 'conditional': {
                    // Logique conditionnelle - à étendre selon les besoins
                    result = inputData; // Par défaut, retourner la valeur telle quelle
                    operation = 'conditional';
                    break;
                }

                default:
                    return {
                        success: false,
                        error: `Type de formule ${formula.type} non supporté`
                    };
            }

            // Appliquer la précision
            const precision = typeof formula.precision === 'number' ? formula.precision : 2;
            if (result !== undefined) {
                result = parseFloat(result.toFixed(precision));
            }

            // Déterminer l'unité
            const businessLogic = optionData.businessLogic as Record<string, unknown> | undefined;
            if (businessLogic?.unit) {
                unit = businessLogic.unit as string;
            }

            // Valider le résultat
            const validation = this.validateResult(result!, unit);

            const calculationTime = Date.now() - startTime;

            return {
                success: true,
                result: result!,
                unit,
                formatted: `${result} ${unit}`,
                metadata: {
                    operation,
                    operands,
                    precision,
                    formula: formula as { type: string; result_field?: string; [key: string]: unknown },
                    businessLogic: businessLogic as { category: string; unit: string },
                    validation: {
                        isValid: validation.isValid,
                        rules: validation.validations.map(v => v.rule)
                    },
                    calculationTime
                }
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Erreur lors du calcul'
            };
        }
    }

    /**
     * 📊 Mettre à jour un champ calculé avec une nouvelle valeur
     */
    async updateCalculatedField(
        fieldId: string, 
        value: number, 
        organizationId: string, 
        metadata: Record<string, unknown> = {}
    ): Promise<{ success: boolean; updated?: boolean; error?: string }> {
        try {
            // Dans une vraie application, on mettrait à jour la valeur dans la base
            // Pour l'instant, on simule la mise à jour
            
            // Vérifier que le champ existe
            const field = await prisma.field.findFirst({
                where: {
                    id: fieldId,
                    organization_id: parseInt(organizationId)
                }
            });

            if (!field) {
                return {
                    success: false,
                    error: `Champ ${fieldId} non trouvé`
                };
            }

            // Log de l'opération pour audit
            console.log(`[ADVANCED_SELECT] Mise à jour calculée:`, {
                fieldId,
                value,
                organizationId,
                metadata,
                timestamp: new Date().toISOString()
            });

            return {
                success: true,
                updated: true
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour'
            };
        }
    }

    /**
     * ✅ Valider un résultat selon les règles métier
     */
    validateResult(value: number, unit?: string): ValidationResult {
        const validations = [];
        let passed = 0;
        let failed = 0;
        let warnings = 0;

        // Règle 1: Prix énergétique réaliste (entre 0.05€ et 0.50€ par kWh)
        if (unit === 'EUR/kWh' || unit === '€/kWh') {
            const isRealistic = value >= 0.05 && value <= 0.50;
            validations.push({
                rule: 'realistic_energy_price',
                passed: isRealistic,
                message: isRealistic 
                    ? `Prix énergétique réaliste: ${value} ${unit}`
                    : `Prix énergétique inhabituel: ${value} ${unit} (attendu: 0.05-0.50 €/kWh)`,
                severity: isRealistic ? 'info' as const : 'warning' as const
            });
            
            if (isRealistic) passed++;
            else warnings++;
        }

        // Règle 2: Nombre positif
        const isPositive = value > 0;
        validations.push({
            rule: 'positive_number',
            passed: isPositive,
            message: isPositive 
                ? 'Valeur positive valide'
                : 'La valeur doit être positive',
            severity: isPositive ? 'info' as const : 'error' as const
        });
        
        if (isPositive) passed++;
        else failed++;

        // Règle 3: Consommation réaliste pour les kWh (entre 1000 et 50000 kWh/an)
        if (unit === 'kWh' && value > 100) { // Si c'est une consommation annuelle
            const isRealistic = value >= 1000 && value <= 50000;
            validations.push({
                rule: 'consumption_realistic',
                passed: isRealistic,
                message: isRealistic
                    ? `Consommation réaliste: ${value} ${unit}/an`
                    : `Consommation inhabituelle: ${value} ${unit}/an (attendu: 1000-50000 kWh/an)`,
                severity: isRealistic ? 'info' as const : 'warning' as const
            });
            
            if (isRealistic) passed++;
            else warnings++;
        }

        return {
            isValid: failed === 0,
            validations,
            summary: {
                passed,
                failed,
                warnings
            }
        };
    }

    /**
     * 🔍 Récupérer la configuration d'une option spécifique
     */
    private async getOptionConfiguration(fieldId: string, optionValue: string): Promise<FieldOption | null> {
        const optionNode = await prisma.fieldOptionNode.findFirst({
            where: {
                field_id: fieldId,
                value: optionValue
            }
        });

        if (!optionNode) return null;

        return {
            label: optionNode.label,
            value: optionNode.value,
            data: optionNode.data as Record<string, unknown> || {}
        };
    }
}

export default AdvancedSelectService;
