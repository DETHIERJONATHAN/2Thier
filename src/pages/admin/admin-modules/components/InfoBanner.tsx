import React from 'react';

export function InfoBanner() {
  return (
    <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-md mb-4 text-sm">
      <h4 className="font-bold mb-2">Comment fonctionnent les modules ?</h4>
      <p className="mb-1">
        <strong>Modules Globaux :</strong> Conçus pour être disponibles pour toutes les organisations. Un super-admin peut les créer et gérer leur statut global.
      </p>
      <p>
        <strong>Modules d'Organisation :</strong> Spécifiques à une seule organisation. Seuls les administrateurs de cette organisation peuvent les créer et les gérer.
      </p>
    </div>
  );
}
