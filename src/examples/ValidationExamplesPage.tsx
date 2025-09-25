import React from 'react';
import { Link } from 'react-router-dom';
import DraggableExample from './DraggableExample';

const ValidationExamplesPage: React.FC = () => {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Exemples de Validation avec Drag and Drop</h1>
        <p className="text-gray-600 mt-1">
          Cette page montre comment utiliser la fonctionnalité de drag-and-drop pour créer des validations
        </p>
      </header>

      <div className="bg-white shadow rounded-lg">
        <DraggableExample />
      </div>
      
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="font-semibold text-blue-800">Comment utiliser le drag and drop</h2>
        <ul className="list-disc pl-5 mt-2 space-y-1 text-blue-700">
          <li>Cliquez et maintenez sur un élément dans la liste à droite</li>
          <li>Déplacez-le vers la zone de validation à gauche</li>
          <li>Relâchez pour déposer l'élément dans la zone</li>
          <li>Vous pouvez supprimer un élément en cliquant sur la croix (×)</li>
        </ul>
      </div>
      
      <div className="mt-6 text-center">
        <Link 
          to="/formulaire" 
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Retour au formulaire
        </Link>
      </div>
    </div>
  );
};

export default ValidationExamplesPage;
