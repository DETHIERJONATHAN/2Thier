import React, { useState, useEffect, useCallback } from 'react';
import { Validation, Field } from './types';
import ValidationRuleEditor from './ValidationRuleEditor';
import { getAPIHeaders } from '../../utils/api';
import { PlusCircleIcon } from '@heroicons/react/24/outline';
import { validationRules } from '../../config/validationRules';

interface FieldValidationsEditorProps {
  fieldId: string;
}

const FieldValidationsEditor: React.FC<FieldValidationsEditorProps> = ({ fieldId }) => {
  const [validations, setValidations] = useState<Validation[]>([]);
  const [allFields, setAllFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadValidations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log(`[FieldValidationsEditor] Chargement des validations pour le champ: ${fieldId}`);
      
      // Charger les validations depuis l'API
      const headers = getAPIHeaders();
      const response = await fetch(`/api/fields/${fieldId}/validations`, {
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        throw new Error(`Erreur lors du chargement des validations: ${response.statusText}`);
      }
      
      const validationsResponse = await response.json();
      let validationsData: Validation[] = [];
      
      if (validationsResponse.success && Array.isArray(validationsResponse.data)) {
        validationsData = validationsResponse.data;
        console.log(`[FieldValidationsEditor] ${validationsData.length} validations chargées depuis l'API`);
      } else {
        console.log(`[FieldValidationsEditor] Aucune validation trouvée, utilisation des données de test`);
        // En développement, si aucune donnée n'est trouvée, utiliser des données simulées
        validationsData = [
          {
            id: `prisma-valid-1-${Date.now()}`, // Utiliser un préfixe pour indiquer qu'il devrait être persisté
            type: 'required',
            message: 'Ce champ est requis',
            comparisonType: 'static',
            value: null,
            comparisonFieldId: null
          },
          {
            id: `prisma-valid-2-${Date.now()}`,
            type: 'format',
            message: 'Format invalide',
            comparisonType: 'static',
            value: 'email',
            comparisonFieldId: null
          }
        ];
      }
      
      // Charger tous les champs pour les sélecteurs de référence
      const fieldsResponse = await fetch(`/api/fields`, {
        method: 'GET',
        headers
      });
      
      let fieldsData: Field[] = [];
      
      if (fieldsResponse.ok) {
        const fieldsResponseData = await fieldsResponse.json();
        if (fieldsResponseData.success && Array.isArray(fieldsResponseData.data)) {
          fieldsData = fieldsResponseData.data;
          console.log(`[FieldValidationsEditor] ${fieldsData.length} champs chargés depuis l'API`);
        }
      } 
      
      if (fieldsData.length === 0) {
        console.log(`[FieldValidationsEditor] Utilisation de champs simulés`);
        fieldsData = [
          {
            id: 'field-1',
            name: 'nom',
            label: 'Nom',
            type: 'text',
            sectionId: 'section-1'
          },
          {
            id: 'field-2',
            name: 'email',
            label: 'Email',
            type: 'email',
            sectionId: 'section-1'
          },
          {
            id: 'field-3',
            name: 'telephone',
            label: 'Téléphone',
            type: 'tel',
            sectionId: 'section-1'
          }
        ];
      }
      
      // Utiliser les données récupérées (API ou mockées)
      setValidations(validationsData);
      
      // Exclure le champ actuel de la liste des champs sélectionnables
      setAllFields(fieldsData.filter((f) => f.id !== fieldId));
    } catch (err) {
      setError('Impossible de charger les données de validation.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [fieldId]);

  useEffect(() => {
    loadValidations();
  }, [loadValidations]);

  const handleAddValidation = async () => {
    // Utiliser la première règle de la config comme défaut
    const defaultRule = validationRules[0];
    const newRule = {
      type: defaultRule.id,
      message: defaultRule.defaultMessage,
      comparisonType: 'static',
      value: null,
      comparisonFieldId: null,
    };
    try {
      const headers = getAPIHeaders();
      const response = await fetch(`/api/fields/${fieldId}/validations`, {
        method: 'POST',
        headers,
        body: JSON.stringify(newRule),
      });
      
      if (!response.ok) {
        throw new Error('Erreur API lors de l\'ajout.');
      }
      
      const responseData = await response.json();
      let createdValidation: Validation;
      
      if (responseData.success && responseData.data) {
        createdValidation = responseData.data;
      } else {
        // Si l'API ne renvoie pas le format attendu, créer une validation temporaire
        createdValidation = {
          ...newRule,
          id: `temp-${Date.now()}`, // ID temporaire
        } as Validation;
      }
      
      setValidations(prev => [...prev, createdValidation]);
    } catch (err) {
      setError("Impossible d'ajouter la règle.");
      console.error(err);
    }
  };

  const handleDeleteValidation = async (validationId: string) => {
    // Sauvegarde de l'état original en cas d'erreur
    const originalValidations = [...validations];
    
    // Optimistic update - supprimer immédiatement de l'UI
    setValidations(prev => prev.filter(v => v.id !== validationId));
    
    try {
      console.log(`[FieldValidationsEditor] Suppression de la validation: ${validationId}`);
      
      // Si c'est un ID temporaire, pas besoin d'appeler l'API
      if (validationId.startsWith('temp-')) {
        console.log(`[FieldValidationsEditor] ID temporaire, pas d'appel API pour la suppression`);
        return; // Sortir de la fonction puisque la mise à jour UI est déjà faite
      }
      
      // Vérifier si c'est un ID de validation de test (avec le préfixe prisma-valid)
      if (validationId.startsWith('prisma-valid-')) {
        console.log(`[FieldValidationsEditor] ID de test, pas d'appel API pour la suppression`);
        return; // Sortir de la fonction puisque la mise à jour UI est déjà faite
      }
      
      const headers = getAPIHeaders();
      const response = await fetch(`/api/validations/${validationId}`, { 
        method: 'DELETE', 
        headers 
      });
      
      // Vérification de la réponse
      if (!response.ok) {
        // En cas d'erreur HTTP, restaurer l'état original
        console.error(`[FieldValidationsEditor] Erreur HTTP ${response.status} lors de la suppression`);
        setValidations(originalValidations);
        throw new Error(`Erreur API lors de la suppression (${response.status})`);
      }
      
      // Analyser la réponse JSON
      const result = await response.json();
      console.log(`[FieldValidationsEditor] Réponse de suppression:`, result);
      
      if (!result.success) {
        // Si le serveur indique un échec malgré un code HTTP 200
        console.error(`[FieldValidationsEditor] La suppression a échoué côté serveur:`, result);
        setValidations(originalValidations);
        throw new Error('Échec de la suppression côté serveur');
      }
      
      // Suppression réussie
      console.log(`[FieldValidationsEditor] Validation ${validationId} supprimée avec succès`);
    } catch (err) {
      // Gérer toutes les erreurs (réseau, serveur, etc.)
      setError("Impossible de supprimer la règle.");
      setValidations(originalValidations);
      console.error("[FieldValidationsEditor] Erreur lors de la suppression:", err);
    }
  };

  const handleUpdateValidation = useCallback(async (updatedValidation: Partial<Validation> & { id: string }) => {
    // Mise à jour optimiste pour l'UI
    setValidations(current =>
      current.map(v => (v.id === updatedValidation.id ? { ...v, ...updatedValidation } : v))
    );
    
    try {
      // Si c'est un ID temporaire, on ne fait pas d'appel API
      if (updatedValidation.id.startsWith('temp-') || updatedValidation.id.startsWith('prisma-valid-')) {
        console.log(`[FieldValidationsEditor] Mise à jour locale uniquement pour ID temporaire: ${updatedValidation.id}`);
        return;
      }
      
      // Débounce la mise à jour API (peut être implémenté avec un hook useDebounce)
      // Pour l'instant, on fait un appel immédiat
      console.log(`[FieldValidationsEditor] Mise à jour de la validation ${updatedValidation.id}`, updatedValidation);
      
      const headers = getAPIHeaders();
      const response = await fetch(`/api/validations/${updatedValidation.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updatedValidation)
      });
      
      if (!response.ok) {
        throw new Error(`Erreur lors de la mise à jour de la validation: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error('La mise à jour a échoué côté serveur');
      }
      
      console.log(`[FieldValidationsEditor] Validation ${updatedValidation.id} mise à jour avec succès`);
    } catch (err) {
      console.error('[FieldValidationsEditor] Erreur lors de la mise à jour:', err);
      setError('Impossible de mettre à jour la règle.');
      // On pourrait recharger les validations pour s'assurer que l'état UI est cohérent
      // Mais on choisit de garder l'optimistic update pour une meilleure UX
    }
  }, []);

  return (
    <div className="bg-white shadow-sm rounded-md p-4 mt-4">
      <h3 className="text-lg font-medium mb-4">Règles de Validation</h3>
      
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
          {validations.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Aucune règle de validation définie.</p>
          ) : (
            validations.map(validation => (
              <ValidationRuleEditor
                key={validation.id}
                validation={validation}
                allFields={allFields}
                // Passer la configuration complète au composant enfant
                validationRules={validationRules}
                onUpdate={handleUpdateValidation}
                onDelete={handleDeleteValidation}
              />
            ))
          )}
          <div className="pt-2">
            <button 
              onClick={handleAddValidation}
              className="w-full flex items-center justify-center py-2 px-4 border border-dashed border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <PlusCircleIcon className="h-5 w-5 mr-2" />
              Ajouter une règle de validation
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FieldValidationsEditor;
