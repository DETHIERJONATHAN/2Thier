import React, { useState, useCallback } from 'react';
import { 
  Modal, 
  Drawer,
  notification 
} from 'antd';

// Import des composants selon cahier des charges
import LeadsHomePage from './LeadsHomePage';

// Modules intégrés existants dans le système
import LeadDetail from './LeadDetail';
import CallModule from './CallModule';
import EmailModule from './EmailModule';

/**
 * 📋 Page principale des Leads selon le cahier des charges V1.5
 * Utilise LeadsHomePage avec navigation intégrée :
 * - Liste des Leads
 * - Vue Kanban 
 * - Dashboard complet
 * - Paramètres
 */
export default function LeadsMainPage() {
  // 🔧 États des modules pour les modals/drawers
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isLeadDetailOpen, setIsLeadDetailOpen] = useState(false);
  const [isCallModuleOpen, setIsCallModuleOpen] = useState(false);
  const [isEmailModuleOpen, setIsEmailModuleOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 📱 Handlers pour les actions leads (conformes au cahier des charges)
  const handleViewLead = useCallback((leadId: string) => {
    console.log('🔍 [LeadsMainPage] Ouverture fiche lead:', leadId);
    setSelectedLeadId(leadId);
    setIsLeadDetailOpen(true);
  }, []);

  const handleCallLead = useCallback((leadId: string) => {
    console.log('📞 [LeadsMainPage] Lancement module appel:', leadId);
    setSelectedLeadId(leadId);
    setIsCallModuleOpen(true);
  }, []);

  const handleEmailLead = useCallback((leadId: string) => {
    console.log('✉️ [LeadsMainPage] Ouverture module email:', leadId);
    setSelectedLeadId(leadId);
    setIsEmailModuleOpen(true);
  }, []);

  const handleScheduleLead = useCallback((leadId: string) => {
    console.log('📅 [LeadsMainPage] Ouverture module agenda:', leadId);
    setSelectedLeadId(leadId);
    setIsCalendarOpen(true);
    // TODO: Implémenter module agenda Google Calendar
    notification.info({
      message: 'Module Agenda',
      description: 'Module Google Calendar à implémenter'
    });
  }, []);

  // 🔄 Actualisation des données
  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const handleCreateLead = useCallback(() => {
    console.log('➕ [LeadsMainPage] Création nouveau lead');
    // Délégué à LeadsHomePage
    triggerRefresh();
  }, [triggerRefresh]);

  return (
    <div className="h-full">
      {/* � CRM Leads avec navigation intégrée */}
      <LeadsHomePage
        onViewLead={handleViewLead}
        onCallLead={handleCallLead}
        onEmailLead={handleEmailLead}
        onScheduleLead={handleScheduleLead}
        onCreateLead={handleCreateLead}
        refreshTrigger={refreshTrigger}
      />

      {/* 📋 MODULE LEAD DETAIL - Drawer latéral selon cahier des charges */}
      <Drawer
        title="📋 Fiche Lead Détaillée"
        placement="right"
        width={800}
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

      {/* 📞 MODULE APPEL - Modal Telnyx selon cahier des charges */}
      <Modal
        title="📞 Module d'Appel Telnyx"
        open={isCallModuleOpen}
        onCancel={() => setIsCallModuleOpen(false)}
        width={1200}
        footer={null}
        destroyOnHidden
      >
        {selectedLeadId && (
          <CallModule 
            leadId={selectedLeadId}
            onClose={() => {
              setIsCallModuleOpen(false);
              triggerRefresh();
            }}
          />
        )}
      </Modal>

      {/* ✉️ MODULE EMAIL - Modal avec IA selon cahier des charges */}
      <Modal
        title="✉️ Module Email avec IA"
        open={isEmailModuleOpen}
        onCancel={() => setIsEmailModuleOpen(false)}
        width={1000}
        footer={null}
        destroyOnHidden
      >
        {selectedLeadId && (
          <EmailModule 
            leadId={selectedLeadId}
            onClose={() => {
              setIsEmailModuleOpen(false);
              triggerRefresh();
            }}
          />
        )}
      </Modal>

      {/* 📅 MODULE AGENDA - Modal Google Calendar selon cahier des charges */}
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
          <div className="p-4">
            <p>Module Google Calendar à implémenter pour le lead {selectedLeadId}</p>
            {/* TODO: Intégrer le vrai module Google Calendar */}
          </div>
        )}
      </Modal>
    </div>
  );
}
