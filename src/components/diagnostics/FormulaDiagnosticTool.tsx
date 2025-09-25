import React, { useState, useEffect } from 'react';
import { generateFormulaTestCases, runFormulaValidationTests } from '../../utils/formulaTestCases';
import { validateFormula, prepareFormulaForAPI } from '../../utils/formulaValidator';
import { Formula } from '../../types/formula';

/**
 * Outil de diagnostic pour tester l'éditeur de formules
 * Utilisez ce composant pour vous assurer que toutes les validations fonctionnent correctement
 */
export const FormulaDiagnosticTool: React.FC = () => {
    const [testResults, setTestResults] = useState<any>(null);
    const [selectedTestCase, setSelectedTestCase] = useState<Formula | null>(null);

    useEffect(() => {
        // Exécuter les tests au chargement
        runDiagnosticTests();
    }, []);

    const runDiagnosticTests = () => {
        const results = runFormulaValidationTests(validateFormula, prepareFormulaForAPI);
        setTestResults(results);
    };

    const testCases = generateFormulaTestCases();

    return (
        <div className="p-4">
            <h1 className="text-xl font-bold mb-4">Outil de diagnostic des formules</h1>
            
            <div className="flex gap-4 mb-4">
                <button
                    onClick={runDiagnosticTests}
                    className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Exécuter les tests
                </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Panneau des cas de test */}
                <div className="border rounded p-4 bg-white">
                    <h2 className="text-lg font-semibold mb-2">Cas de test disponibles</h2>
                    <div className="space-y-2">
                        {testCases.map(testCase => (
                            <div 
                                key={testCase.id}
                                className={`p-2 border rounded cursor-pointer ${selectedTestCase?.id === testCase.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}
                                onClick={() => setSelectedTestCase(testCase)}
                            >
                                <div className="font-medium">{testCase.name}</div>
                                <div className="text-xs text-gray-500">{testCase.sequence.length} éléments</div>
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* Panneau des résultats de test */}
                <div className="border rounded p-4 bg-white">
                    <h2 className="text-lg font-semibold mb-2">Résultats des tests</h2>
                    {testResults ? (
                        <div>
                            <div className="mb-4 p-2 bg-gray-100 rounded">
                                <span className="font-medium">Résumé: </span>
                                <span>{testResults.filter((r: any) => r.isValid).length}/{testResults.length} formules validées avec succès</span>
                            </div>
                            <div className="space-y-2">
                                {testResults.map((result: any, index: number) => (
                                    <div key={index} className={`p-2 border rounded ${result.isValid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                                        <div className="flex items-center">
                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center mr-2 ${result.isValid ? 'bg-green-500' : 'bg-red-500'}`}>
                                                <span className="text-white text-xs">{result.isValid ? '✓' : '✗'}</span>
                                            </div>
                                            <div className="font-medium">{result.caseName}</div>
                                        </div>
                                        {!result.isValid && (
                                            <div className="text-sm text-red-600 mt-1">
                                                Erreur: {result.validationResult.message}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-gray-500">Aucun test exécuté</div>
                    )}
                </div>
            </div>
            
            {/* Détails du cas de test sélectionné */}
            {selectedTestCase && (
                <div className="mt-4 border rounded p-4 bg-white">
                    <h2 className="text-lg font-semibold mb-2">Détails: {selectedTestCase.name}</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                            <h3 className="font-medium mb-2">Structure de la formule</h3>
                            <pre className="p-2 bg-gray-100 rounded text-xs overflow-auto max-h-80">
                                {JSON.stringify(selectedTestCase, null, 2)}
                            </pre>
                        </div>
                        <div>
                            <h3 className="font-medium mb-2">Validation manuelle</h3>
                            <button
                                onClick={() => {
                                    const validationResult = validateFormula(selectedTestCase, 'DiagnosticTool');
                                    console.log('Résultat de validation:', validationResult);
                                    
                                    try {
                                        const preparedFormula = prepareFormulaForAPI(selectedTestCase, 'DiagnosticTool');
                                        console.log('Formule préparée:', preparedFormula);
                                    } catch (error) {
                                        console.error('Erreur lors de la préparation:', error);
                                    }
                                }}
                                className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                            >
                                Valider manuellement (voir console)
                            </button>
                            <div className="mt-4">
                                <h3 className="font-medium mb-2">Séquence d'éléments</h3>
                                <div className="flex flex-wrap gap-2">
                                    {selectedTestCase.sequence.map((item, index) => (
                                        <div 
                                            key={`${selectedTestCase.id}-seq-${index}`} 
                                            className={`p-1 text-sm rounded border ${
                                                item.type === 'field' ? 'bg-blue-100 border-blue-300' :
                                                item.type === 'operator' ? 'bg-yellow-100 border-yellow-300' :
                                                item.type === 'value' ? 'bg-green-100 border-green-300' :
                                                'bg-gray-100 border-gray-300'
                                            }`}
                                        >
                                            {item.label || item.value}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FormulaDiagnosticTool;
