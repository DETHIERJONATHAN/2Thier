import React, { useState } from 'react';
import { Drawer, Modal, message, Grid } from 'antd';

// Composants existants du CRM
import LeadsKanban from './LeadsKanban';
import LeadDetail from '../../components/leads/LeadDetail';
import EditLeadModal from '../../components/leads/EditLeadModal';
import { EmailComposer } from '../../components/EmailComposer';
import { CallInterface } from '../../modules/call/components/CallInterface';
import CalendarWidget from '../../components/leads/CalendarWidget';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';

/**
 * Wrapper pour le Kanban avec intégration des modules
 */
const LeadsKanbanWrapper: React.FC = () => {
  const { api } = useAuthenticatedApi();
  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isTablet = !screens.lg && screens.md;
  
  // States pour gérer les modules
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isLeadDetailOpen, setIsLeadDetailOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCallModuleOpen, setIsCallModuleOpen] = useState(false);
  const [isEmailModuleOpen, setIsEmailModuleOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Handlers pour ouvrir les modules
  const handleViewLead = (leadId: string) => {
    setSelectedLeadId(leadId);
    setIsLeadDetailOpen(true);
  };

  const handleCallLead = (leadId: string) => {
    setSelectedLeadId(leadId);
    setIsCallModuleOpen(true);
  };

  const handleEmailLead = (leadId: string) => {
    setSelectedLeadId(leadId);
    setIsEmailModuleOpen(true);
  };

  const handleScheduleLead = (leadId: string) => {
    setSelectedLeadId(leadId);
    setIsCalendarOpen(true);
  };

  // Handler pour éditer un lead - ouvre le modal d'édition
  const handleEditLead = (leadId: string) => {
    setSelectedLeadId(leadId);
    setIsEditModalOpen(true);
  };

  // Handler pour supprimer un lead
  const handleDeleteLead = async (leadId: string) => {
    try {
      await api.delete(`/api/leads/${leadId}`);
      message.success('Lead supprimé avec succès');
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      message.error('Erreur lors de la suppression du lead');
    }
  };

  return (
    <>
      {/* 🏗️ VUE KANBAN PRINCIPALE */}
      <LeadsKanban 
        onViewLead={handleViewLead}
        onCallLead={handleCallLead}
        onEmailLead={handleEmailLead}
        onScheduleLead={handleScheduleLead}
        onEditLead={handleEditLead}
        onDeleteLead={handleDeleteLead}
        refreshTrigger={refreshTrigger}
        onLeadUpdated={() => setRefreshTrigger(prev => prev + 1)}
      />

      {/* ✏️ MODULE ÉDITION - Modal pour modifier un lead */}
      <EditLeadModal
        open={isEditModalOpen}
        leadId={selectedLeadId}
        onClose={() => setIsEditModalOpen(false)}
        onLeadUpdated={() => {
          setRefreshTrigger(prev => prev + 1);
        }}
      />

      {/* 📋 MODULE LEAD DETAIL - Drawer latéral */}
      <Drawer
        title="📋 Fiche Lead Détaillée"
        placement="right"
        width={isMobile ? '100%' : isTablet ? 760 : 700}
        open={isLeadDetailOpen}
        onClose={() => setIsLeadDetailOpen(false)}
        destroyOnHidden
      >
        {selectedLeadId && (
          <LeadDetail 
            leadId={selectedLeadId}
            onClose={() => setIsLeadDetailOpen(false)}
            onCall={() => {
              setIsLeadDetailOpen(false);
              handleCallLead(selectedLeadId);
            }}
            onEmail={() => {
              setIsLeadDetailOpen(false);
              handleEmailLead(selectedLeadId);
            }}
            onSchedule={() => {
              setIsLeadDetailOpen(false);
              handleScheduleLead(selectedLeadId);
            }}
          />
        )}
      </Drawer>

      {/* 📞 MODULE D'APPEL - Modal avec Telnyx */}
      <Modal
        title="📞 Module d'Appel Telnyx"
        open={isCallModuleOpen}
        onCancel={() => setIsCallModuleOpen(false)}
        width={isMobile ? '100%' : 1000}
        footer={null}
        destroyOnHidden
        centered
        style={isMobile ? { maxWidth: '100vw', margin: 0, paddingBottom: 0 } : undefined}
      >
        {selectedLeadId && (
          <CallInterface 
            leadId={selectedLeadId}
          />
        )}
      </Modal>

      {/* ✉️ MODULE EMAIL - Modal avec IA */}
      {selectedLeadId && (
        <EmailComposer 
          open={isEmailModuleOpen}
          onClose={() => setIsEmailModuleOpen(false)}
          onSent={() => {
            console.log('Email envoyé pour le lead', selectedLeadId);
            setIsEmailModuleOpen(false);
            // Déclencher rafraîchissement du Kanban
            setRefreshTrigger(prev => prev + 1);
          }}
        />
      )}

      {/* 📅 MODULE AGENDA - Modal avec Google Calendar intégré */}
      <Modal
        title="📅 Google Calendar - Planifier RDV"
        open={isCalendarOpen}
        onCancel={() => setIsCalendarOpen(false)}
        width={isMobile ? '100%' : 1100}
        footer={null}
        destroyOnHidden
        centered
        style={isMobile ? { maxWidth: '100vw', margin: 0, paddingBottom: 0 } : undefined}
      >
        {selectedLeadId && (
          <CalendarWidget
            leadId={selectedLeadId}
            leadEmail=""
            leadName=""
            onEventCreated={(eventData) => {
              console.log('Événement créé:', eventData);
              setIsCalendarOpen(false);
              setRefreshTrigger(prev => prev + 1);
            }}
          />
        )}
      </Modal>
    </>
  );
};

export default LeadsKanbanWrapper;
