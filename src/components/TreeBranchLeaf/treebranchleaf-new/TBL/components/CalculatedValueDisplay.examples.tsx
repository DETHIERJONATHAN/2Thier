/**
 * 📚 Exemple: Intégrer CalculatedValueDisplay dans TBLSectionRenderer
 * 
 * Cet exemple montre comment afficher les valeurs calculées stockées
 * directement dans le formulaire sans recalcul.
 */

import React from 'react';
import { CalculatedValueDisplay } from '../components/CalculatedValueDisplay';

/**
 * Exemple 1: Affichage simple d'une valeur
 */
export function Example1_SimpleDisplay() {
  return (
    <CalculatedValueDisplay
      nodeId="99476bab-4835-4108-ad02-7f37e096647d"
      treeId="your-tree-id"
      unit="€"
      precision={2}
      displayMode="simple"
    />
  );
  // Résultat: "2 €"
}

/**
 * Exemple 2: Affichage en card avec métadonnées
 */
export function Example2_CardDisplay() {
  return (
    <div className="space-y-4">
      <CalculatedValueDisplay
        nodeId="939bb51d-c0af-444f-a794-2aa3062ef34c"
        treeId="your-tree-id"
        unit="m²"
        precision={2}
        displayMode="card"
        showMetadata={true}
      />
    </div>
  );
  // Résultat: Carte avec "M façade: 35 m²" + date de calcul
}

/**
 * Exemple 3: Affichage en badge (type tag)
 */
export function Example3_BadgeDisplay() {
  return (
    <div className="flex gap-2">
      <CalculatedValueDisplay
        nodeId="440d696a-34cf-418f-8f56-d61015f66d91"
        treeId="your-tree-id"
        unit="€"
        displayMode="badge"
      />
      <CalculatedValueDisplay
        nodeId="939bb51d-c0af-444f-a794-2aa3062ef34c"
        treeId="your-tree-id"
        unit="m²"
        displayMode="badge"
      />
    </div>
  );
  // Résultat: Deux badges bleus côte à côte
}

/**
 * Exemple 4: Affichage conditionnel dans une liste
 */
export function Example4_ConditionalList() {
  const fieldsToDisplay = [
    {
      nodeId: "99476bab-4835-4108-ad02-7f37e096647d",
      label: "Prix Kwh",
      unit: "€",
      precision: 2
    },
    {
      nodeId: "939bb51d-c0af-444f-a794-2aa3062ef34c",
      label: "M façade",
      unit: "m²",
      precision: 2
    },
    {
      nodeId: "440d696a-34cf-418f-8f56-d61015f66d91",
      label: "Orientation",
      unit: "",
      precision: 0
    }
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {fieldsToDisplay.map(field => (
        <div key={field.nodeId} className="p-4 border rounded">
          <div className="text-sm text-gray-600">{field.label}</div>
          <CalculatedValueDisplay
            nodeId={field.nodeId}
            treeId="your-tree-id"
            unit={field.unit}
            precision={field.precision}
            displayMode="simple"
            className="text-lg font-bold"
          />
        </div>
      ))}
    </div>
  );
}

/**
 * Exemple 5: Intégration dans TBLSectionRenderer
 * 
 * Dans le composant principal d'affichage, ajouter:
 */
export function Example5_InTBLSectionRenderer() {
  // Pseudo-code pour intégration
  return `
    // Dans TBLSectionRenderer.tsx, dans la méthode renderNode():
    
    // Si le node a une valeur calculée stockée
    if (node.calculatedValue && node.calculatedValue !== '∅') {
      return (
        <div className="calculated-field-container mb-4">
          <CalculatedValueDisplay
            nodeId={node.id}
            treeId={treeId}
            submissionId={submissionId}
            unit={node.data_unit || ''}
            precision={node.data_precision || 2}
            displayMode="card"
            showMetadata={true}
            className="calculated-value"
          />
        </div>
      );
    }

    // Sinon: afficher le formulaire normal
    return renderFormField(node);
  `;
}

/**
 * Exemple 6: Récapitulatif complet (Devis)
 */
export function Example6_QuoteSummary({ submissionId, treeId }: unknown) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-6">📊 Récapitulatif des Calculs</h2>
      
      <div className="grid grid-cols-2 gap-6">
        {/* Section 1: Surface */}
        <div className="border-l-4 border-blue-500 pl-4">
          <h3 className="font-semibold mb-3">Surface</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span>Longueur façade</span>
              <CalculatedValueDisplay
                nodeId="shared-ref-1761920215171-5bvime"
                treeId={treeId}
                submissionId={submissionId}
                unit="m"
                displayMode="simple"
              />
            </div>
            <div className="flex justify-between items-center">
              <span>Rampant</span>
              <CalculatedValueDisplay
                nodeId="shared-ref-1761920196832-4f6a2"
                treeId={treeId}
                submissionId={submissionId}
                unit="m"
                displayMode="simple"
              />
            </div>
            <div className="flex justify-between items-center font-bold">
              <span>M façade</span>
              <CalculatedValueDisplay
                nodeId="939bb51d-c0af-444f-a794-2aa3062ef34c"
                treeId={treeId}
                submissionId={submissionId}
                unit="m²"
                displayMode="simple"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Tarification */}
        <div className="border-l-4 border-green-500 pl-4">
          <h3 className="font-semibold mb-3">Tarification</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span>Prix/Kwh</span>
              <CalculatedValueDisplay
                nodeId="99476bab-4835-4108-ad02-7f37e096647d"
                treeId={treeId}
                submissionId={submissionId}
                unit="€"
                precision={2}
                displayMode="simple"
              />
            </div>
            <div className="flex justify-between items-center">
              <span>Distributeur GRD</span>
              <CalculatedValueDisplay
                nodeId="64d62c19-3896-4d18-9ca3-ea5413a687f2"
                treeId={treeId}
                submissionId={submissionId}
                displayMode="simple"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default {
  Example1_SimpleDisplay,
  Example2_CardDisplay,
  Example3_BadgeDisplay,
  Example4_ConditionalList,
  Example5_InTBLSectionRenderer,
  Example6_QuoteSummary
};
