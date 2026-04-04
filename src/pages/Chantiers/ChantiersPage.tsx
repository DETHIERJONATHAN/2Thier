import React, { useState, useCallback } from 'react';
import { Drawer } from 'antd';
import ChantierKanban from './ChantierKanban';
import ChantierDetailPage from './ChantierDetailPage';
import ChantierSettingsPage from './ChantierSettingsPage';
import ChantierWorkflowSettingsPage from './ChantierWorkflowSettingsPage';

/**
 * Page principale du module Chantiers
 * Affiche le Kanban + Drawer latéral pour le détail (comme les Leads)
 * Le Kanban reste visible en arrière-plan pour une navigation fluide
 */
type ChantierView = 'kanban' | 'settings' | 'workflow';

const ChantiersPage: React.FC = () => {
  const [selectedChantierId, setSelectedChantierId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [view, setView] = useState<ChantierView>('kanban');

  const handleViewChantier = useCallback((chantierId: string) => {
    setSelectedChantierId(chantierId);
    setIsDetailOpen(true);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setIsDetailOpen(false);
    setSelectedChantierId(null);
  }, []);

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
        onViewChantier={handleViewChantier}
        onSettings={() => setView('settings')}
      />

      {/* 🏗️ Détail Chantier - Drawer latéral (même pattern que les Leads) */}
      <Drawer
        title="🏗️ Fiche Chantier"
        placement="right"
        width={900}
        open={isDetailOpen}
        onClose={handleCloseDetail}
        destroyOnHidden
        styles={{ body: { padding: 0, overflow: 'auto' } }}
      >
        {selectedChantierId && (
          <ChantierDetailPage
            chantierId={selectedChantierId}
            onBack={handleCloseDetail}
          />
        )}
      </Drawer>
    </div>
  );
};

export default ChantiersPage;
