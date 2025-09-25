import React from 'react';

const OracleContent: React.FC = () => {
  return (
    <div className="h-full bg-[#f5f5f5] p-8">
      {/* Fil d'Ariane */}
      <div className="mb-6">
        <div className="flex items-center space-x-2 text-sm">
          <span className="text-[#3C3C3C]">Compute</span>
          <span className="text-[#3C3C3C]">/</span>
          <span className="text-[#D67D35]">Instance Pools</span>
        </div>
      </div>

      {/* Titre de la page */}
      <div className="mb-8">
        <h1 className="text-2xl font-medium text-[#3C3C3C]">Instance Pools</h1>
        <p className="text-[#666] mt-2">
          Gérer et déployer des groupes d'instances de calcul avec des configurations identiques.
        </p>
      </div>

      {/* Zone de contenu */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="space-y-4">
          {/* En-tête de la section */}
          <div className="flex justify-between items-center pb-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-[#3C3C3C]">Liste des Instance Pools</h2>
            <button className="
              px-4 py-2 
              bg-[#D67D35] 
              text-white 
              rounded-lg
              hover:bg-[#B8652A]
              transition-colors
            ">
              Créer Instance Pool
            </button>
          </div>

          {/* Tableau exemple */}
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-[#666]">
                <th className="py-3 px-4 font-medium">Nom</th>
                <th className="py-3 px-4 font-medium">État</th>
                <th className="py-3 px-4 font-medium">Instances</th>
                <th className="py-3 px-4 font-medium">Région</th>
                <th className="py-3 px-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-100">
                <td className="py-3 px-4">production-pool</td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Actif
                  </span>
                </td>
                <td className="py-3 px-4">4/4</td>
                <td className="py-3 px-4">eu-paris-1</td>
                <td className="py-3 px-4">
                  <button className="text-[#D67D35] hover:text-[#B8652A]">
                    Gérer
                  </button>
                </td>
              </tr>
              {/* Autres lignes similaires... */}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OracleContent;
