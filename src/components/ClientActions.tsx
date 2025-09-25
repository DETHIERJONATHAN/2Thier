// src/components/ClientActions.tsx
import React from 'react';
import { useFeatures, usePermissions } from '../context';

/**
 * ClientActions
 *
 * Affiche dynamiquement les boutons d’action “Appeler”, “Envoyer un mail”, “Voir sur la carte”
 * selon la présence des features ET des permissions associées pour l’utilisateur courant.
 *
 * - Feature/Permission requises :
 *   - Appeler :    feature 'call_button' + permission 'call_client'
 *   - Mail :       feature 'mail_button' + permission 'send_mail'
 *   - Maps :       feature 'maps_button' + permission 'view_maps'
 *
 * Fallback UX : affiche un message si aucune action n’est disponible.
 *
 * Props :
 *   - client (optionnel) : objet client pour contextualiser les actions (ex : numéro, email, adresse)
 *
 * Exemple d’usage dans une fiche client :
 *   <ClientActions client={client} />
 */

interface ClientActionsProps {
  client?: {
    phone?: string;
    email?: string;
    address?: string;
    [key: string]: any;
  };
}

const ClientActions: React.FC<ClientActionsProps> = ({ client }) => {
  const { hasFeature } = useFeatures();
  const { can } = usePermissions();

  const actions = [
    hasFeature('call_button') && can('call_client') && client?.phone && (
      <button key="call" className="bg-blue-500 text-white rounded px-4 py-2 mr-2">
        📞 Appeler
      </button>
    ),
    hasFeature('mail_button') && can('send_mail') && client?.email && (
      <button key="mail" className="bg-green-500 text-white rounded px-4 py-2 mr-2">
        ✉️ Envoyer un mail
      </button>
    ),
    hasFeature('maps_button') && can('view_maps') && client?.address && (
      <button key="maps" className="bg-yellow-500 text-white rounded px-4 py-2">
        🗺️ Voir sur la carte
      </button>
    ),
  ].filter(Boolean);

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {actions.length > 0 ? actions : (
        <span className="text-gray-400 italic">Aucune action disponible pour ce client.</span>
      )}
    </div>
  );
};

export default ClientActions;
