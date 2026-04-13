import { Formula } from '../types/formula';

/**
 * Génère un ensemble de cas de test pour les formules
 * Ces cas de test peuvent être utilisés pour valider le comportement de l'éditeur de formules
 */
export const generateFormulaTestCases = (): Formula[] => {
    const testCases: Formula[] = [];
    
    // Cas 1: Formule vide
    testCases.push({
        id: 'test-empty-formula',
        name: 'Formule vide',
        sequence: [],
        targetProperty: 'resultat',
        expression: '',
        targetFieldId: 'field1'
    });
    
    // Cas 2: Formule simple avec un seul champ
    testCases.push({
        id: 'test-single-field',
        name: 'Un seul champ',
        sequence: [
            {
                id: 'field-1',
                type: 'field',
                value: 'field1',
                label: 'Champ 1',
                fieldId: 'field1'
            }
        ],
        targetProperty: 'resultat',
        expression: '',
        targetFieldId: 'field2'
    });
    
    // Cas 3: Addition de deux champs
    testCases.push({
        id: 'test-addition',
        name: 'Addition de deux champs',
        sequence: [
            {
                id: 'field-1',
                type: 'field',
                value: 'field1',
                label: 'Champ 1',
                fieldId: 'field1'
            },
            {
                id: 'op-1',
                type: 'operator',
                value: '+',
                label: '+'
            },
            {
                id: 'field-2',
                type: 'field',
                value: 'field2',
                label: 'Champ 2',
                fieldId: 'field2'
            }
        ],
        targetProperty: 'resultat',
        expression: '',
        targetFieldId: 'field3'
    });
    
    // Cas 4: Formule avec opérateur de comparaison
    testCases.push({
        id: 'test-comparison',
        name: 'Comparaison de champs',
        sequence: [
            {
                id: 'field-1',
                type: 'field',
                value: 'field1',
                label: 'Champ 1',
                fieldId: 'field1'
            },
            {
                id: 'op-1',
                type: 'operator',
                value: '>',
                label: '>'
            },
            {
                id: 'field-2',
                type: 'field',
                value: 'field2',
                label: 'Champ 2',
                fieldId: 'field2'
            }
        ],
        targetProperty: 'resultat',
        expression: '',
        targetFieldId: 'field4'
    });
    
    // Cas 5: Formule avec valeur littérale
    testCases.push({
        id: 'test-literal-value',
        name: 'Formule avec valeur littérale',
        sequence: [
            {
                id: 'field-1',
                type: 'field',
                value: 'field1',
                label: 'Champ 1',
                fieldId: 'field1'
            },
            {
                id: 'op-1',
                type: 'operator',
                value: '*',
                label: '*'
            },
            {
                id: 'val-1',
                type: 'value',
                value: 100,
                label: '100'
            }
        ],
        targetProperty: 'resultat',
        expression: '',
        targetFieldId: 'field5'
    });
    
    // Cas 6: Formule avec double opérateur (cas invalide)
    testCases.push({
        id: 'test-double-operator',
        name: 'Formule avec double opérateur (invalide)',
        sequence: [
            {
                id: 'field-1',
                type: 'field',
                value: 'field1',
                label: 'Champ 1',
                fieldId: 'field1'
            },
            {
                id: 'op-1',
                type: 'operator',
                value: '+',
                label: '+'
            },
            {
                id: 'op-2',
                type: 'operator',
                value: '*',
                label: '*'
            },
            {
                id: 'field-2',
                type: 'field',
                value: 'field2',
                label: 'Champ 2',
                fieldId: 'field2'
            }
        ],
        targetProperty: 'resultat',
        expression: '',
        targetFieldId: 'field6'
    });
    
    // Cas 7: Formule avec double champ (cas invalide)
    testCases.push({
        id: 'test-double-field',
        name: 'Formule avec double champ (invalide)',
        sequence: [
            {
                id: 'field-1',
                type: 'field',
                value: 'field1',
                label: 'Champ 1',
                fieldId: 'field1'
            },
            {
                id: 'field-2',
                type: 'field',
                value: 'field2',
                label: 'Champ 2',
                fieldId: 'field2'
            }
        ],
        targetProperty: 'resultat',
        expression: '',
        targetFieldId: 'field7'
    });
    
    // Cas 8: Formule complexe
    testCases.push({
        id: 'test-complex',
        name: 'Formule complexe',
        sequence: [
            {
                id: 'field-1',
                type: 'field',
                value: 'field1',
                label: 'Champ 1',
                fieldId: 'field1'
            },
            {
                id: 'op-1',
                type: 'operator',
                value: '*',
                label: '*'
            },
            {
                id: 'val-1',
                type: 'value',
                value: 2,
                label: '2'
            },
            {
                id: 'op-2',
                type: 'operator',
                value: '+',
                label: '+'
            },
            {
                id: 'field-2',
                type: 'field',
                value: 'field2',
                label: 'Champ 2',
                fieldId: 'field2'
            }
        ],
        targetProperty: 'resultat',
        expression: '',
        targetFieldId: 'field8'
    });
    
    return testCases;
};

/**
 * Teste toutes les validations sur un ensemble de cas de test
 * @param validateFn La fonction de validation à tester
 * @param prepareFn La fonction de préparation à tester
 */
export const runFormulaValidationTests = (
    validateFn: (formula: unknown, source?: string) => any,
    prepareFn: (formula: Formula, source?: string) => Formula
) => {
    const testCases = generateFormulaTestCases();
    const results: Array<{
        caseName: string;
        validationResult: unknown;
        preparationResult: unknown;
        isValid: boolean;
    }> = [];
    
    console.group('🧪 Tests de validation de formules');
    
    testCases.forEach(testCase => {
        console.group(`Test: ${testCase.name}`);
        
        // Tester la validation
        console.log('Formule à tester:', testCase);
        const validationResult = validateFn(testCase, 'TestRunner');
        console.log('Résultat de validation:', validationResult);
        
        // Tester la préparation
        let preparationResult;
        try {
            preparationResult = prepareFn(testCase, 'TestRunner');
            console.log('Résultat de préparation:', preparationResult);
        } catch (error) {
            console.error('Erreur lors de la préparation:', error);
            preparationResult = { error };
        }
        
        results.push({
            caseName: testCase.name,
            validationResult,
            preparationResult,
            isValid: validationResult.isValid
        });
        
        console.groupEnd();
    });
    
    // Afficher le résumé
    console.group('📊 Résumé des tests');
    const validCount = results.filter(r => r.isValid).length;
    console.log(`${validCount}/${testCases.length} formules validées avec succès`);
    
    results.forEach(result => {
        const icon = result.isValid ? '✅' : '❌';
        console.log(`${icon} ${result.caseName}`);
    });
    
    console.groupEnd();
    console.groupEnd();
    
    return results;
};
