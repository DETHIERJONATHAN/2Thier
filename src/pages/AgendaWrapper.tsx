import React from 'react';
import { useAuth } from '../auth/useAuth';
import { Alert } from 'antd';
import AgendaPage from '../plugins/ModuleAgenda/AgendaPage';

const AgendaWrapper: React.FC = () => {
  const { user, modules } = useAuth();

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

  // Vérification que le module Agenda CRM est activé pour l'organisation
  const hasAgendaModule = modules?.some(module => {
    if (!module) return false;
    
    // Vérifier si c'est le module Agenda CRM natif
    const isAgendaModule = module.feature === 'agenda';
    
    if (!isAgendaModule) return false;
    
    // Vérifier que le module est actif ET activé pour l'organisation
    const isActiveInOrganization = module.isActiveInOrg || false;
    const isGloballyActive = module.active || false;
    
    return isGloballyActive && isActiveInOrganization;
  });

  if (!hasAgendaModule) {
    return (
      <Alert
        message="Module non activé"
        description="Le module Agenda CRM n'est pas activé pour votre organisation."
        type="warning"
        showIcon
      />
    );
  }

  return <AgendaPage />;
};

export default AgendaWrapper;
