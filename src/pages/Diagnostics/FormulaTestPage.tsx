import React, { useState, useEffect } from 'react';
import FormulaTestTool from '../../components/formulas/FormulaTestTool';
import { evaluateFormula, exampleTestFormula } from '../../utils/formulaEvaluator';

/**
 * Page de diagnostic pour tester les formules avec des valeurs réelles
 * Cette page permet de valider concrètement que les formules fonctionnent correctement
 */
const FormulaTestPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [formulas, setFormulas] = useState<any[]>([]);
  const [selectedFormulaId, setSelectedFormulaId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<any>(null);
  
  // Charger toutes les formules au chargement de la page
  useEffect(() => {
    fetchAllFormulas();
  }, []);
  
  // Charger toutes les formules depuis l'API
  const fetchAllFormulas = async () => {
    try {
      setLoading(true);
      
      // Préparer les headers pour l'API
      const token = localStorage.getItem('token');
      const organizationId = localStorage.getItem('organizationId');
      
      const headers: HeadersInit = {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      };
      
      if (organizationId) {
        headers['X-Organization-Id'] = organizationId;
      }
      
      // Charger toutes les formules via l'API
      const response = await fetch('/api/formulas', {
        method: 'GET',
        headers,
      });
      
      if (!response.ok) {
        throw new Error(`Erreur lors du chargement des formules: ${response.statusText}`);
      }
      
      const data = await response.json();
      setFormulas(Array.isArray(data) ? data : []);
      
      // Sélectionner la première formule par défaut si disponible
      if (data && data.length > 0) {
        setSelectedFormulaId(data[0].id);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des formulas:', error);
      
      // Utiliser une formule d'exemple en cas d'erreur
      const exampleResult = exampleTestFormula();
      console.log('Formule d\'exemple utilisée:', exampleResult);
    } finally {
      setLoading(false);
    }
  };
  
  // Formule actuellement sélectionnée
  const selectedFormula = formulas.find(f => f.id === selectedFormulaId);
  
  // Exécuter le test sur la formule sélectionnée
  const runTest = () => {
    if (!selectedFormula) return;
    
    // Préparer des valeurs de test
    const fieldsInFormula = selectedFormula.sequence
      .filter((item: any) => item.type === 'field')
      .map((item: any) => ({
        id: item.fieldId || String(item.value),
        label: item.label || String(item.value)
      }));
      
    // Valeurs de test (toutes à 10 par défaut)
    const testValues: Record<string, number> = {};
    fieldsInFormula.forEach((field: any) => {
      testValues[field.id] = 10;
    });
    
    // Évaluer la formule
    const result = evaluateFormula(selectedFormula, testValues);
    setTestResults({
      formula: selectedFormula,
      values: testValues,
      result: result.result,
      success: result.success,
      error: result.error,
      debug: result.debug
    });
  };
  
  return (
    <div className="container mx-auto py-6 px-4">
      <header className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Test des formules</h1>
        <p className="text-gray-600">
          Cet outil vous permet de tester les formules avec des valeurs réelles pour vérifier qu'elles fonctionnent correctement.
        </p>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Liste des formules */}
        <div>
          <div className="bg-white p-4 rounded-md shadow-sm border">
            <h2 className="text-lg font-semibold mb-3">Formules disponibles</h2>
            
            {loading ? (
              <div className="p-4 text-center">Chargement des formules...</div>
            ) : formulas.length === 0 ? (
              <div className="p-4 text-center text-gray-500">Aucune formule trouvée</div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {formulas.map(formula => (
                  <div
                    key={formula.id}
                    className={`p-2 border rounded cursor-pointer ${
                      selectedFormulaId === formula.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      setSelectedFormulaId(formula.id);
                      setTestResults(null);
                    }}
                  >
                    <div className="font-medium">{formula.name || 'Sans nom'}</div>
                    <div className="text-xs text-gray-500">
                      {formula.sequence?.length || 0} éléments
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Zone de test */}
        <div className="lg:col-span-2">
          {selectedFormula ? (
            <div>
              <div className="bg-white p-4 rounded-md shadow-sm border mb-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">Tester: {selectedFormula.name || 'Sans nom'}</h2>
                  <button
                    onClick={runTest}
                    className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    Exécuter le test
                  </button>
                </div>
                
                {/* Outil de test de formule */}
                <FormulaTestTool formula={selectedFormula} />
              </div>
              
              {/* Résultats du test */}
              {testResults && (
                <div className="bg-white p-4 rounded-md shadow-sm border">
                  <h2 className="text-lg font-semibold mb-3">Résultat du test</h2>
                  
                  <div className={`p-4 rounded-md ${
                    testResults.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}>
                    <div className="mb-2">
                      <span className="font-medium">Statut: </span>
                      <span className={testResults.success ? 'text-green-600' : 'text-red-600'}>
                        {testResults.success ? 'Succès' : 'Échec'}
                      </span>
                    </div>
                    
                    <div className="mb-2">
                      <span className="font-medium">Résultat: </span>
                      <span className="font-mono">
                        {typeof testResults.result === 'boolean' 
                          ? (testResults.result ? 'Vrai' : 'Faux')
                          : testResults.result}
                      </span>
                    </div>
                    
                    {testResults.error && (
                      <div className="text-red-600">
                        <span className="font-medium">Erreur: </span>
                        {testResults.error}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white p-8 text-center rounded-md shadow-sm border">
              <p className="text-gray-500">
                Sélectionnez une formule pour la tester
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormulaTestPage;
