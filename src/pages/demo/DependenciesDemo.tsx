import { useState } from 'react';
import DynamicFormField from '../../components/dependencies/DynamicFormField';

/**
 * Page de démonstration du système de dépendances
 * Cette page montre comment les champs peuvent interagir entre eux
 * grâce aux règles de dépendance
 */
const DependenciesDemo = () => {
  // État pour stocker les valeurs du formulaire
  const [formValues, setFormValues] = useState({
    type_client: '',
    siret: '',
    pays: '',
    adresse_differente: 'non',
    adresse_facturation: '',
    adresse_livraison: '',
    produit: '',
    quantite: 1,
    commentaire: '',
  });

  // Options pour les champs de type select
  const typeClientOptions = [
    { label: 'Particulier', value: 'particulier' },
    { label: 'Entreprise', value: 'entreprise' },
    { label: 'Association', value: 'association' },
  ];

  const paysOptions = [
    { label: 'France', value: 'france' },
    { label: 'Belgique', value: 'belgique' },
    { label: 'Suisse', value: 'suisse' },
    { label: 'Canada', value: 'canada' },
  ];

  const produitOptions = [
    { label: 'Produit Standard', value: 'standard' },
    { label: 'Produit Premium', value: 'premium' },
    { label: 'Service de base', value: 'service_base' },
    { label: 'Service personnalisé', value: 'service_personnalise' },
  ];

  const adresseOptions = [
    { label: 'Même adresse', value: 'non' },
    { label: 'Adresse différente', value: 'oui' },
  ];

  // Gestionnaire de soumission du formulaire
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Formulaire soumis avec les valeurs:', formValues);
    alert('Formulaire soumis avec succès!');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Démonstration du système de dépendances</h1>
        
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
          <p className="text-sm text-blue-700">
            Cette démo montre comment configurer des dépendances entre les champs d'un formulaire.
            Essayez de modifier les valeurs et d'ajouter des règles pour voir les effets.
          </p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4 pb-2 border-b border-gray-200">Informations client</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DynamicFormField
                id="type_client"
                label="Type de client"
                type="select"
                options={typeClientOptions}
                required
              />
              
              <DynamicFormField
                id="siret"
                label="Numéro SIRET"
                description="Obligatoire pour les entreprises uniquement"
                type="text"
                placeholder="123 456 789 00012"
              />
              
              <DynamicFormField
                id="pays"
                label="Pays"
                type="select"
                options={paysOptions}
                required
              />
            </div>
          </div>
          
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4 pb-2 border-b border-gray-200">Adresses</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DynamicFormField
                id="adresse_facturation"
                label="Adresse de facturation"
                type="textarea"
                placeholder="Numéro, rue, code postal, ville"
                required
              />
              
              <DynamicFormField
                id="adresse_differente"
                label="Adresse de livraison"
                type="select"
                options={adresseOptions}
              />
              
              <div className="md:col-span-2">
                <DynamicFormField
                  id="adresse_livraison"
                  label="Adresse de livraison complète"
                  type="textarea"
                  placeholder="Numéro, rue, code postal, ville"
                />
              </div>
            </div>
          </div>
          
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4 pb-2 border-b border-gray-200">Commande</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DynamicFormField
                id="produit"
                label="Produit/Service"
                type="select"
                options={produitOptions}
                required
              />
              
              <DynamicFormField
                id="quantite"
                label="Quantité"
                type="text"
                defaultValue="1"
              />
              
              <div className="md:col-span-2">
                <DynamicFormField
                  id="commentaire"
                  label="Commentaire"
                  description="Détails supplémentaires sur votre commande"
                  type="textarea"
                  placeholder="Précisez toute information complémentaire..."
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Soumettre le formulaire
            </button>
          </div>
        </form>

        <div className="mt-8 p-4 border border-gray-200 rounded-md bg-gray-50">
          <h3 className="text-sm font-medium mb-2">Suggestions de règles à ajouter:</h3>
          <ul className="list-disc text-xs text-gray-700 pl-5 space-y-1">
            <li>Sur le champ <strong>type_client</strong>: <code>IF(EQUALS(type_client, "entreprise"), SET_REQUIRED("siret"), SET_OPTIONAL("siret"))</code></li>
            <li>Sur le champ <strong>adresse_differente</strong>: <code>IF(EQUALS(adresse_differente, "oui"), SHOW("adresse_livraison"), HIDE("adresse_livraison"))</code></li>
            <li>Sur le champ <strong>produit</strong>: <code>IF(EQUALS(produit, "service_personnalise"), SET_REQUIRED("commentaire"), SET_OPTIONAL("commentaire"))</code></li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DependenciesDemo;
