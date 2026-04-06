import React from 'react';
import { useAuth } from '../auth/useAuth';
import { Alert } from 'antd';
import AgendaPage from '../plugins/ModuleAgenda/AgendaPage';

const AgendaWrapper: React.FC = () => {
  const { user, hasFeature } = useAuth();

  // Vérification que l'utilisateur est connecté
  if (!user) {
    return (
      <Alert
        message="Accès refusé"
        description="Vous devez être connecté pour accéder à l'agenda."
        type="error"
        showIcon
      />
    );
  }

  // Vérification via hasFeature (case-insensitive, vérifie feature/key/name/label)
  // Les modules dans useAuth().modules sont déjà filtrés (actifs globalement + actifs pour l'org)
  if (!hasFeature('agenda')) {
    return (
      <Alert
        message="Module non activé"
        description="Le module Agenda n'est pas activé pour votre organisation."
        type="warning"
        showIcon
      />
    );
  }

  return <AgendaPage />;
};

export default AgendaWrapper;
