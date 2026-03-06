import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ChantierKanban from './ChantierKanban';

/**
 * Page principale du module Chantiers
 * Affiche le Kanban + navigation vers les paramètres / détails
 */
const ChantiersPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ height: '100%' }}>
      <ChantierKanban
        onViewChantier={(chantierId) => navigate(`/chantiers/${chantierId}`)}
        onSettings={() => navigate('/chantiers/settings')}
      />
    </div>
  );
};

export default ChantiersPage;
