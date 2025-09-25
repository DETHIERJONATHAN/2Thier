import React, { useState } from 'react';
import { Layout, Drawer, Modal } from 'antd';

// Composants existants du CRM
import LeadsHomePage from './LeadsHomePage';
import LeadDetail from '../../components/leads/LeadDetail';
import { EmailComposer } from '../../components/EmailComposer';
import { CallInterface } from '../../modules/call/components/CallInterface';
import CalendarWidget from '../../components/leads/CalendarWidget';
import CreateLeadModal from '../../components/leads/CreateLeadModal';

const { Content } = Layout;

const LeadsPage: React.FC = () => {
  // States pour gérer les modules
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isLeadDetailOpen, setIsLeadDetailOpen] = useState(false);
  const [isCallModuleOpen, setIsCallModuleOpen] = useState(false);
  const [isEmailModuleOpen, setIsEmailModuleOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isCreateLeadOpen, setIsCreateLeadOpen] = useState(false);
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

  const handleCreateLead = () => {
    setIsCreateLeadOpen(true);
  };

  const handleLeadCreated = () => {
    // Déclencher un rafraîchissement de la liste des leads
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <Layout className="min-h-screen bg-gray-50">
      <Content>
        {/* 📊 Affichage direct de LeadsHomePage avec navigation intégrée */}
        <LeadsHomePage 
          onViewLead={handleViewLead}
          onCallLead={handleCallLead}
          onEmailLead={handleEmailLead}
          onScheduleLead={handleScheduleLead}
          onCreateLead={handleCreateLead}
          refreshTrigger={refreshTrigger}
        />

        {/* Modals et Drawers pour les détails et actions */}
        <Drawer
          title="Détail du Lead"
          placement="right"
          width={800}
          open={isLeadDetailOpen}
          onClose={() => setIsLeadDetailOpen(false)}
        >
          {selectedLeadId && (
            <LeadDetail 
              leadId={selectedLeadId}
              onClose={() => setIsLeadDetailOpen(false)}
            />
          )}
        </Drawer>

        <Modal
          title="Module d'Appel"
          open={isCallModuleOpen}
          onCancel={() => setIsCallModuleOpen(false)}
          width={1000}
          footer={null}
        >
          {selectedLeadId && (
            <CallInterface 
              leadId={selectedLeadId}
              onCallComplete={() => {
                setIsCallModuleOpen(false);
                setRefreshTrigger(prev => prev + 1);
              }}
            />
          )}
        </Modal>

        <EmailComposer 
          open={isEmailModuleOpen}
          onClose={() => setIsEmailModuleOpen(false)}
          onSent={() => {
            setIsEmailModuleOpen(false);
            setRefreshTrigger(prev => prev + 1);
          }}
        />

        <Modal
          title="Planifier un RDV"
          open={isCalendarOpen}
          onCancel={() => setIsCalendarOpen(false)}
          width={1100}
          footer={null}
        >
          {selectedLeadId && (
            <CalendarWidget
              leadId={selectedLeadId}
              leadEmail="" // TODO: récupérer l'email du lead
              leadName="" // TODO: récupérer le nom du lead
              onEventCreated={() => {
                setIsCalendarOpen(false);
                setRefreshTrigger(prev => prev + 1);
              }}
            />
          )}
        </Modal>

        <CreateLeadModal
          isOpen={isCreateLeadOpen}
          onClose={() => setIsCreateLeadOpen(false)}
          onLeadCreated={handleLeadCreated}
        />
      </Content>
    </Layout>
  );
};

export default LeadsPage;
