import { useState, useEffect } from 'react';
import { FieldFormulasEditorNew } from '../components/formulas';
// import { FieldValidationsEditorNew } from '../components/validations'; // ANCIEN
import FieldValidationsEditor from '../components/validations/FieldValidationsEditor'; // NOUVEAU
import FieldDependenciesEditor from '../components/dependencies/FieldDependenciesEditor'; // NOUVEAU
import useCRMStore from "../../../../../../../store";

const SimpleTestEditorsPage = () => {
  const [activeTab, setActiveTab] = useState<'formulas' | 'validations' | 'dependencies'>('formulas');
  const [selectedFieldId, setSelectedFieldId] = useState<string>('');
  
  // État local pour les champs - VERSION SIMPLIFIÉE
  const [allFields, setAllFields] = useState<Array<{id: string, label: string, type: string}>>([]);

  // Chargement initial uniquement
  useEffect(() => {
    console.log('[SimpleTestEditorsPage] Loading initial fields');
    
    const currentState = useCRMStore.getState();
    const initialFields = currentState.blocks.flatMap(block => 
      block.sections.flatMap(section => 
        section.fields.map(field => ({
          id: field.id,
          label: field.label || `Champ ${field.id}`,
          type: field.type
        }))
      )
    );
    console.log('[SimpleTestEditorsPage] Found fields:', initialFields.length);
    setAllFields(initialFields);
  }, []); // UNE SEULE FOIS au chargement

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* En-tête explicatif */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h1 className="text-2xl font-bold mb-2 text-blue-800">
          🧪 Test des Éditeurs - Version Simple
        </h1>
        <p className="text-blue-700 text-sm mb-2">
          <strong>Page de test dédiée</strong> : Testez les éditeurs (Formules, Validations, Dépendances) 
          sans les bugs du module principal.
        </p>
        <div className="text-blue-600 text-xs">
          ✅ <strong>Avantages</strong> : Les éditeurs ne se ferment pas automatiquement<br/>
          ⚠️ <strong>Note</strong> : Le glisser-déposer est désactivé pour éviter les conflits
        </div>
      </div>
      
      {/* Sélection du champ */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Champ à tester :
        </label>
        <select
          value={selectedFieldId}
          onChange={(e) => {
            console.log('[SimpleTestEditorsPage] Field selected:', e.target.value);
            setSelectedFieldId(e.target.value);
          }}
          className="select select-bordered w-full max-w-xs"
        >
          <option value="">Sélectionnez un champ</option>
          {allFields.map(field => (
            <option key={field.id} value={field.id}>
              {field.label} ({field.type})
            </option>
          ))}
        </select>
        {allFields.length === 0 && (
          <p className="text-red-500 text-xs mt-1">
            ⚠️ Aucun champ trouvé. Créez des champs dans l'éditeur de formulaires d'abord.
          </p>
        )}
      </div>

      {selectedFieldId && (
        <div>
          {/* Onglets */}
          <div className="tabs tabs-boxed mb-4">
            <button
              className={`tab ${activeTab === 'formulas' ? 'tab-active' : ''}`}
              onClick={() => {
                console.log('[SimpleTestEditorsPage] Switching to formulas');
                setActiveTab('formulas');
              }}
            >
              🔢 Formules
            </button>
            <button
              className={`tab ${activeTab === 'validations' ? 'tab-active' : ''}`}
              onClick={() => {
                console.log('[SimpleTestEditorsPage] Switching to validations');
                setActiveTab('validations');
              }}
            >
              ✅ Validations
            </button>
            <button
              className={`tab ${activeTab === 'dependencies' ? 'tab-active' : ''}`}
              onClick={() => {
                console.log('[SimpleTestEditorsPage] Switching to dependencies');
                setActiveTab('dependencies');
              }}
            >
              🔗 Dépendances
            </button>
          </div>

          {/* Éditeur actif */}
          <div className="bg-white border rounded-lg p-4">
            {activeTab === 'formulas' && (
              <div>
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <h3 className="font-bold text-yellow-800 mb-1">Test des Formules</h3>
                  <p className="text-yellow-700 text-sm">
                    Cliquez sur "+ Ajouter" pour créer une formule. L'éditeur devrait rester ouvert.
                  </p>
                </div>
                <FieldFormulasEditorNew fieldId={selectedFieldId} />
              </div>
            )}
            {activeTab === 'validations' && (
              <div>
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
                  <h3 className="font-bold text-green-800 mb-1">Test des Validations</h3>
                  <p className="text-green-700 text-sm">
                    Cliquez sur "+ Ajouter" pour créer une validation. L'éditeur devrait rester ouvert.
                  </p>
                </div>
                <FieldValidationsEditor fieldId={selectedFieldId} />
              </div>
            )}
            {activeTab === 'dependencies' && (
              <div>
                <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded">
                  <h3 className="font-bold text-purple-800 mb-1">Test des Dépendances</h3>
                  <p className="text-purple-700 text-sm">
                    Cliquez sur "+ Ajouter" pour créer une dépendance. L'éditeur devrait rester ouvert.
                  </p>
                </div>
                <FieldDependenciesEditor fieldId={selectedFieldId} />
              </div>
            )}
          </div>
        </div>
      )}

      {!selectedFieldId && allFields.length > 0 && (
        <div className="text-center text-gray-500 py-12">
          <div className="text-4xl mb-4">🎯</div>
          <h3 className="text-lg font-semibold mb-2">Sélectionnez un champ pour commencer</h3>
          <p className="text-sm">Choisissez un champ dans la liste ci-dessus pour tester ses éditeurs</p>
        </div>
      )}
    </div>
  );
};

export default SimpleTestEditorsPage;

