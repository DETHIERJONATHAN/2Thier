import React, { useState } from 'react';
import { Drawer, Modal } from 'antd';

// Composants existants du CRM
import LeadsKanban from './LeadsKanban';
import LeadDetail from '../../components/leads/LeadDetail';
import { EmailComposer } from '../../components/EmailComposer';
import { CallInterface } from '../../modules/call/components/CallInterface';
import CalendarWidget from '../../components/leads/CalendarWidget';

/**
 * Wrapper pour le Kanban avec intégration des modules
 */
const LeadsKanbanWrapper: React.FC = () => {
  // States pour gérer les modules
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isLeadDetailOpen, setIsLeadDetailOpen] = useState(false);
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

  return (
    <>
      {/* 🏗️ VUE KANBAN PRINCIPALE */}
      <LeadsKanban 
        onViewLead={handleViewLead}
        onCallLead={handleCallLead}
        onEmailLead={handleEmailLead}
        onScheduleLead={handleScheduleLead}
        refreshTrigger={refreshTrigger}
      />

      {/* 📋 MODULE LEAD DETAIL - Drawer latéral */}
      <Drawer
        title="📋 Fiche Lead Détaillée"
        placement="right"
        width={700}
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
        width={1000}
        footer={null}
        destroyOnHidden
        centered
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
          visible={isEmailModuleOpen}
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
        width={1100}
        footer={null}
        destroyOnHidden
        centered
      >
        {selectedLeadId && (
          <CalendarWidget
            leadId={selectedLeadId}
            leadEmail="" // TODO: récupérer l'email depuis les données du lead
            leadName="" // TODO: récupérer le nom depuis les données du lead
            onEventCreated={(eventData) => {
              console.log('Événement créé:', eventData);
              // TODO: Mettre à jour le statut du lead à "RDV"
              setIsCalendarOpen(false);
              // Déclencher rafraîchissement du Kanban
              setRefreshTrigger(prev => prev + 1);
            }}
          />
        )}
      </Modal>
    </>
  );
};

export default LeadsKanbanWrapper;
