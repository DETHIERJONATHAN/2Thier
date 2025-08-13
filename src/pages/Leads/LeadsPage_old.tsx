import React, { useState } from 'react';
import { Layout, Drawer, Modal, Tabs } from 'antd';
import { TableOutlined, ProjectOutlined, SettingOutlined, DashboardOutlined } from '@ant-design/icons';

// Composants existants du CRM
import LeadsHomePage from './LeadsHomePage';
import LeadsKanban from './LeadsKanban';
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
        {/* � MENU DE NAVIGATION PRINCIPAL */}
        <Tabs 
          activeKey={activeTab}
          onChange={setActiveTab}
          size="large"
          className="bg-white px-6 py-2"
          items={[
            {
              key: 'liste',
              label: (
                <span>
                  <TableOutlined />
                  Liste des Leads
                </span>
              ),
              children: (
                <LeadsHomePage 
                  onViewLead={handleViewLead}
                  onCallLead={handleCallLead}
                  onEmailLead={handleEmailLead}
                  onScheduleLead={handleScheduleLead}
                  onCreateLead={handleCreateLead}
                  refreshTrigger={refreshTrigger}
                />
              )
            },
            {
              key: 'kanban',
              label: (
                <span>
                  <ProjectOutlined />
                  Vue Kanban
                </span>
              ),
              children: (
                <LeadsKanban 
                  onViewLead={handleViewLead}
                  onCallLead={handleCallLead}
                  onEmailLead={handleEmailLead}
                  onScheduleLead={handleScheduleLead}
                  refreshTrigger={refreshTrigger}
                />
              )
            },
            {
              key: 'dashboard',
              label: (
                <span>
                  <DashboardOutlined />
                  Dashboard
                </span>
              ),
              children: (
                <div className="p-6 text-center">
                  <h2>📊 Dashboard Commercial</h2>
                  <p className="text-gray-500">Métriques et statistiques commerciales</p>
                  <p className="text-sm text-blue-500">🚧 À implémenter selon le cahier des charges</p>
                </div>
              )
            },
            {
              key: 'parametres',
              label: (
                <span>
                  <SettingOutlined />
                  Paramètres
                </span>
              ),
              children: (
                <div className="p-6 text-center">
                  <h2>⚙️ Paramètres des Leads</h2>
                  <p className="text-gray-500">Mapping statuts, sources, délais, etc.</p>
                  <p className="text-sm text-blue-500">🚧 À implémenter selon le cahier des charges</p>
                </div>
              )
            }
          ]}
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
              }}
            />
          )}
        </Modal>

        {/* 📋 MODAL CRÉATION DE LEAD */}
        <CreateLeadModal
          visible={isCreateLeadOpen}
          onClose={() => setIsCreateLeadOpen(false)}
          onLeadCreated={handleLeadCreated}
        />
      </Content>
    </Layout>
  );
};

export default LeadsPage;
