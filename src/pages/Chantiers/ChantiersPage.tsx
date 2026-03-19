import React, { useState } from 'react';
import ChantierKanban from './ChantierKanban';
import ChantierDetailPage from './ChantierDetailPage';
import ChantierSettingsPage from './ChantierSettingsPage';
import ChantierWorkflowSettingsPage from './ChantierWorkflowSettingsPage';

/**
 * Page principale du module Chantiers
 * Affiche le Kanban + navigation vers les paramètres / détails
 * Tout est géré en interne pour rester dans le mur du dashboard
 */
type ChantierView = 'kanban' | 'settings' | 'workflow';

const ChantiersPage: React.FC = () => {
  const [selectedChantierId, setSelectedChantierId] = useState<string | null>(null);
  const [view, setView] = useState<ChantierView>('kanban');

  if (selectedChantierId) {
    return (
      <ChantierDetailPage
        chantierId={selectedChantierId}
        onBack={() => setSelectedChantierId(null)}
      />
    );
  }

  if (view === 'workflow') {
    return (
      <ChantierWorkflowSettingsPage
        onBack={() => setView('settings')}
      />
    );
  }

  if (view === 'settings') {
    return (
      <ChantierSettingsPage
        onBack={() => setView('kanban')}
        onWorkflowSettings={() => setView('workflow')}
      />
    );
  }

  return (
    <div style={{ height: '100%' }}>
      <ChantierKanban
        onViewChantier={(chantierId) => setSelectedChantierId(chantierId)}
        onSettings={() => setView('settings')}
      />
    </div>
  );
};

export default ChantiersPage;
