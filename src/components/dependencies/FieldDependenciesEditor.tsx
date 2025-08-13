import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dependency } from './types';
import { getAPIHeaders } from '../../utils/api';
import { PlusCircleIcon } from '@heroicons/react/24/outline';
// Utilisation de l'implémentation simplifiée avec HTML5 Drag & Drop
import { DependencyRuleEditorSimplified as DependencyRuleEditor } from './DependencyRuleEditorSimplified';
import useCRMStore from '../../store';

interface FieldDependenciesEditorProps {
  fieldId: string;
}

const FieldDependenciesEditor: React.FC<FieldDependenciesEditorProps> = ({ fieldId }) => {
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Sélection des champs depuis le store avec useMemo pour éviter les boucles infinies
  const blocks = useCRMStore((state) => state.blocks);
  const allFields = useMemo(() => 
    blocks.flatMap(b => b.sections.flatMap(s => s.fields))
      .map(f => ({ id: f.id, name: f.label }))  // Utilisation de 'label' au lieu de 'name'
      .filter(f => f.id !== fieldId),
    [blocks, fieldId]  // Dépendances pour recalculer uniquement quand blocks ou fieldId change
  );

  const loadDependencies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = getAPIHeaders();
      const response = await fetch(`/api/fields/${fieldId}/dependencies`, { headers });
      if (!response.ok) throw new Error('Erreur réseau lors du chargement.');
      const data: Dependency[] = await response.json();
      setDependencies(data);
    } catch (err) {
      setError('Impossible de charger les dépendances.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [fieldId]);

  useEffect(() => {
    loadDependencies();
  }, [loadDependencies]);

  const handleAddDependency = async () => {
    // Utilisez le modèle de données correct pour les dépendances
    // Créez une dépendance avec une structure similaire aux validations
    const newRule: Omit<Dependency, 'id'> = {
      action: 'show',
      targetFieldId: '',
      operator: 'equals',
      value: '',
      name: 'Nouvelle dépendance', // Ajout d'un nom par défaut
      // Pour une compatibilité avec le backend qui attend potentiellement une séquence
      sequence: {
        conditions: [[]],
        action: 'show',
        targetFieldId: ''
      }
    };
    
    try {
      // Pour le développement, utilisons une approche simulée si l'API n'est pas prête
      if (process.env.NODE_ENV === 'development' || !process.env.VITE_API_BASE_URL) {
        // Simulation d'une réponse réussie pour le développement
        const mockedDependency: Dependency = {
          ...newRule,
          id: `dep-${Date.now()}`,
        };
        setDependencies(prev => [...prev, mockedDependency]);
        return;
      }
      
      // Sinon, procédez avec l'appel API normal
      const headers = getAPIHeaders();
      const response = await fetch(`/api/fields/${fieldId}/dependencies`, {
        method: 'POST',
        headers,
        body: JSON.stringify(newRule),
      });
      if (!response.ok) throw new Error('Erreur API lors de l\'ajout.');
      const createdDependency: Dependency = await response.json();
      setDependencies(prev => [...prev, createdDependency]);
    } catch (err) {
      setError("Impossible d'ajouter la dépendance.");
      console.error(err);
    }
  };

  const handleDeleteDependency = async (dependencyId: string) => {
    const originalDependencies = [...dependencies];
    setDependencies(prev => prev.filter(d => d.id !== dependencyId));
    try {
      const headers = getAPIHeaders();
      const response = await fetch(`/api/dependencies/${dependencyId}`, { method: 'DELETE', headers });
      if (!response.ok) {
        setDependencies(originalDependencies);
        throw new Error('Erreur API lors de la suppression.');
      }
    } catch (err) {
      setError("Impossible de supprimer la dépendance.");
      setDependencies(originalDependencies);
      console.error(err);
    }
  };

  const handleUpdateDependency = (updatedDependency: Partial<Dependency> & { id: string }) => {
    setDependencies(current =>
      current.map(d => (d.id === updatedDependency.id ? { ...d, ...updatedDependency } : d))
    );
    // Une logique de sauvegarde automatique (debounce) peut être ajoutée ici.
  };
  
  const handleTestDependency = async (dependencyId: string) => {
    try {
      // Pour le développement, simulons le comportement du test
      if (process.env.NODE_ENV === 'development' || !process.env.VITE_API_BASE_URL) {
        // Simulation d'un test réussi
        const testResult = {
          status: 'success',
          evaluated: true,
          result: Math.random() > 0.5 ? true : false // Résultat aléatoire pour le test
        };
        
        // Notification visuelle avec message contextuel et style
        const resultText = testResult.result 
          ? 'La condition est vérifiée ✓' 
          : 'La condition n\'est pas vérifiée ✗';
        
        setDependencies(prev => 
          prev.map(d => d.id === dependencyId 
            ? { 
                ...d, 
                _testResult: { 
                  status: testResult.status, 
                  message: resultText, 
                  success: testResult.result
                } 
              }
            : d
          )
        );
        return;
      }
      
      // Version API réelle
      const headers = getAPIHeaders();
      const response = await fetch(`/api/dependencies/${dependencyId}/test`, { 
        method: 'POST', 
        headers 
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors du test de la dépendance');
      }
      
      const result = await response.json();
      
      // Notification visuelle au lieu d'une alerte
      setDependencies(prev => 
        prev.map(d => d.id === dependencyId 
          ? { ...d, _testResult: { status: 'success', message: `Résultat: ${result.status}` } }
          : d
        )
      );
    } catch (err) {
      console.error('Erreur lors du test de la dépendance:', err);
      
      // Notification visuelle d'erreur
      setDependencies(prev => 
        prev.map(d => d.id === dependencyId 
          ? { ...d, _testResult: { status: 'error', message: 'Erreur lors du test de la dépendance' } }
          : d
        )
      );
    }
  };

  return (
    <div className="bg-white w-full max-w-full border border-gray-200 rounded-md mb-4 shadow-sm">
      <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
        <h3 className="text-lg font-medium">Dépendances Conditionnelles</h3>
      </div>
      
      <div className="p-4">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        {loading ? (
          <div className="flex justify-center my-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {dependencies.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Aucune dépendance définie.</p>
            ) : (
              dependencies.map(dependency => (
                <DependencyRuleEditor
                  key={dependency.id}
                  dependency={dependency}
                  allFields={allFields}
                  onDelete={handleDeleteDependency}
                  onUpdate={handleUpdateDependency}
                  onTest={handleTestDependency}
                />
              ))
            )}
            
            <div className="mt-6">
              <button
                onClick={handleAddDependency}
                className="w-full flex items-center justify-center bg-blue-500 text-white rounded-md px-4 py-2 hover:bg-blue-600 transition shadow-sm"
              >
                <PlusCircleIcon className="h-5 w-5 mr-2" aria-hidden="true" />
                Ajouter une dépendance
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FieldDependenciesEditor;