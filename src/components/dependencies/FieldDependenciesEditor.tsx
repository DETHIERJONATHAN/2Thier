import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dependency } from './types';
// Remplace les appels fetch directs par l'API authentifiée
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
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
  const { api } = useAuthenticatedApi();

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
      // Utilise l'API authentifiée (gère cookies + organisation)
      const data = await api.get<Dependency[] | { success: boolean; data: Dependency[] }>(`/api/fields/${fieldId}/dependencies`);
      // Supporte les deux formats de réponse (array direct ou {success,data})
      const list = Array.isArray(data) ? data : (data?.data ?? []);
      setDependencies(list as Dependency[]);
    } catch (err) {
      setError('Impossible de charger les dépendances.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [fieldId, api]);

  useEffect(() => {
    loadDependencies();
  }, [loadDependencies]);

  const handleAddDependency = async () => {
    // Sélectionner un champ cible par défaut (le 1er champ différent du champ courant)
    const defaultTarget = allFields.find(f => f.id !== fieldId);
    if (!defaultTarget) {
      setError("Ajoutez au moins un autre champ au formulaire avant de créer une dépendance.");
      return;
    }
    // Créer une dépendance valide pour le backend (targetFieldId requis)
    const newRule: Omit<Dependency, 'id'> = {
      action: 'show',
      targetFieldId: defaultTarget.id,
      operator: 'equals',
      value: '',
      name: 'Nouvelle dépendance',
      sequence: {
        conditions: [[{ id: `c-${Date.now()}`, targetFieldId: defaultTarget.id, operator: 'equals', value: '' }]],
        action: 'show',
        targetFieldId: defaultTarget.id
      }
    };
    
    try {
      const updated = await api.post<Dependency[] | { success: boolean; data: Dependency[] }>(
        `/api/fields/${fieldId}/dependencies`,
        newRule
      );
      const updatedList = Array.isArray(updated) ? updated : (updated?.data ?? []);
      setDependencies(updatedList as Dependency[]);
    } catch (err) {
      // Fallback: append local en cas d'échec API
      console.error(err);
      setError("Impossible d'ajouter la dépendance (API). Passage en mode local.");
      const mockedDependency: Dependency = { ...newRule, id: `dep-${Date.now()}` } as Dependency;
      setDependencies(prev => [...prev, mockedDependency]);
    }
  };

  const handleDeleteDependency = async (dependencyId: string) => {
    const originalDependencies = [...dependencies];
    setDependencies(prev => prev.filter(d => d.id !== dependencyId));
    try {
      const updated = await api.delete<Dependency[] | { success: boolean; data: Dependency[] }>(
        `/api/dependencies/${dependencyId}`
      );
      const updatedList = Array.isArray(updated) ? updated : (updated?.data ?? []);
      setDependencies(updatedList as Dependency[]);
    } catch (err) {
      setError("Impossible de supprimer la dépendance.");
      setDependencies(originalDependencies);
      console.error(err);
    }
  };

  const handleUpdateDependency = async (updatedDependency: Partial<Dependency> & { id: string }) => {
    const original = [...dependencies];
    // Optimiste
    setDependencies(current => current.map(d => (d.id === updatedDependency.id ? { ...d, ...updatedDependency } as Dependency : d)));
    try {
      const payload: Partial<Dependency> & {
        description?: string;
        targetFieldId?: string;
      } = {
        name: updatedDependency.name,
        description: (updatedDependency as unknown as { description?: string }).description,
        sequence: updatedDependency.sequence,
        targetFieldId: updatedDependency.targetFieldId,
        operator: updatedDependency.operator,
        value: updatedDependency.value,
        action: updatedDependency.action,
        prefillValue: updatedDependency.prefillValue,
      };
      const updated = await api.put<Dependency[] | { success: boolean; data: Dependency[] }>(
        `/api/dependencies/${updatedDependency.id}`,
        payload
      );
      const updatedList = Array.isArray(updated) ? updated : (updated?.data ?? []);
      setDependencies(updatedList as Dependency[]);
    } catch (err) {
      console.error(err);
      setError("Impossible de mettre à jour la dépendance.");
      setDependencies(original);
    }
  };
  
  const handleTestDependency = async (dependencyId: string) => {
    try {
      // Pour le développement, simulons le comportement du test
  if (import.meta.env.DEV || !import.meta.env.VITE_API_BASE_URL) {
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
      const result = await api.post<{ status: string }>(`/api/dependencies/${dependencyId}/test`, {});
      
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