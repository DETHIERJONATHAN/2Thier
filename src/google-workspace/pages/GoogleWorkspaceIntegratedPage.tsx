import React from 'react';
import { Card, Typography, Row, Col, Divider, Space } from 'antd';
import { 
  GoogleOutlined,
  MailOutlined,
  CalendarOutlined,
  FileOutlined,
  TableOutlined,
  FileTextOutlined,
  VideoCameraOutlined,
  PhoneOutlined
} from '@ant-design/icons';

// Import des widgets Google Workspace
import GmailWidget from '../components/leads/GmailWidget';
import CalendarWidget from '../components/leads/CalendarWidget';
import DriveWidget from '../components/leads/DriveWidget';
import SheetsWidget from '../components/leads/SheetsWidget';
import DocsWidget from '../components/leads/DocsWidget';
import MeetWidget from '../components/leads/MeetWidget';
import GoogleVoiceWidget from '../components/leads/GoogleVoiceWidget';

const { Title, Text } = Typography;

interface GoogleWorkspaceIntegratedPageProps {
  leadId: string;
  leadName: string;
  leadEmail: string;
  leadPhone?: string;
}

const GoogleWorkspaceIntegratedPage: React.FC<GoogleWorkspaceIntegratedPageProps> = ({
  leadId,
  leadName,
  leadEmail,
  leadPhone
}) => {

  const handleActivityUpdate = (activityData: {
    type: string;
    leadId: string;
    timestamp: Date;
    [key: string]: unknown;
  }) => {
    console.log('Nouvelle activité Google Workspace:', activityData);
    // Ici on pourrait mettre à jour un tableau d'activités central
    // ou déclencher une notification
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* En-tête */}
      <Card className="mb-6">
        <div className="flex items-center justify-between">
          <Space size="large">
            <GoogleOutlined className="text-4xl text-blue-500" />
            <div>
              <Title level={2} className="mb-0">
                Google Workspace - {leadName}
              </Title>
              <Text type="secondary" className="text-lg">
                Suite complète d'outils collaboratifs intégrés
              </Text>
            </div>
          </Space>
          
          <div className="text-right">
            <div className="text-sm text-gray-600">Contact principal</div>
            <div className="font-medium">{leadEmail}</div>
            {leadPhone && <div className="text-sm text-gray-500">{leadPhone}</div>}
          </div>
        </div>
      </Card>

      {/* Applications Google Workspace */}
      <Row gutter={[24, 24]}>
        
        {/* COLONNE 1: Communication & Collaboration */}
        <Col xs={24} lg={12}>
          
          {/* Google Voice - Téléphonie */}
          <GoogleVoiceWidget
            leadId={leadId}
            leadName={leadName}
            leadEmail={leadEmail}
            leadPhone={leadPhone}
            onCallMade={handleActivityUpdate}
            onSMSSent={handleActivityUpdate}
          />

          {/* Gmail - Emails */}
          <GmailWidget
            leadId={leadId}
            leadName={leadName}
            leadEmail={leadEmail}
            onEmailSent={handleActivityUpdate}
          />

          {/* Google Meet - Visioconférence */}
          <MeetWidget
            leadId={leadId}
            leadName={leadName}
            leadEmail={leadEmail}
            onMeetCreated={handleActivityUpdate}
          />

          {/* Google Calendar - Agenda */}
          <CalendarWidget
            leadId={leadId}
            leadName={leadName}
            leadEmail={leadEmail}
            onEventCreated={handleActivityUpdate}
          />

        </Col>

        {/* COLONNE 2: Documents & Productivité */}
        <Col xs={24} lg={12}>

          {/* Google Drive - Stockage */}
          <DriveWidget
            leadId={leadId}
            leadName={leadName}
            leadEmail={leadEmail}
            onFileShared={handleActivityUpdate}
          />

          {/* Google Docs - Documents */}
          <DocsWidget
            leadId={leadId}
            leadName={leadName}
            leadEmail={leadEmail}
            onDocumentCreated={handleActivityUpdate}
          />

          {/* Google Sheets - Tableurs */}
          <SheetsWidget
            leadId={leadId}
            leadName={leadName}
            leadEmail={leadEmail}
            onSheetCreated={handleActivityUpdate}
          />

        </Col>
      </Row>

      {/* Résumé des intégrations */}
      <Card className="mt-6">
        <Title level={4}>
          🚀 Applications Google Workspace Intégrées
        </Title>
        
        <Row gutter={[16, 16]} className="mt-4">
          <Col xs={12} sm={8} md={6}>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <PhoneOutlined className="text-2xl text-blue-500 mb-2" />
              <div className="font-medium">Google Voice</div>
              <div className="text-sm text-gray-500">Téléphonie</div>
            </div>
          </Col>
          
          <Col xs={12} sm={8} md={6}>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <MailOutlined className="text-2xl text-red-500 mb-2" />
              <div className="font-medium">Gmail</div>
              <div className="text-sm text-gray-500">Emails</div>
            </div>
          </Col>
          
          <Col xs={12} sm={8} md={6}>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <CalendarOutlined className="text-2xl text-green-500 mb-2" />
              <div className="font-medium">Calendar</div>
              <div className="text-sm text-gray-500">Agenda</div>
            </div>
          </Col>
          
          <Col xs={12} sm={8} md={6}>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <VideoCameraOutlined className="text-2xl text-purple-500 mb-2" />
              <div className="font-medium">Meet</div>
              <div className="text-sm text-gray-500">Visio</div>
            </div>
          </Col>
          
          <Col xs={12} sm={8} md={6}>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <FileOutlined className="text-2xl text-yellow-600 mb-2" />
              <div className="font-medium">Drive</div>
              <div className="text-sm text-gray-500">Stockage</div>
            </div>
          </Col>
          
          <Col xs={12} sm={8} md={6}>
            <div className="text-center p-4 bg-indigo-50 rounded-lg">
              <FileTextOutlined className="text-2xl text-indigo-500 mb-2" />
              <div className="font-medium">Docs</div>
              <div className="text-sm text-gray-500">Documents</div>
            </div>
          </Col>
          
          <Col xs={12} sm={8} md={6}>
            <div className="text-center p-4 bg-teal-50 rounded-lg">
              <TableOutlined className="text-2xl text-teal-500 mb-2" />
              <div className="font-medium">Sheets</div>
              <div className="text-sm text-gray-500">Tableurs</div>
            </div>
          </Col>
        </Row>

        <Divider />
        
        <Text type="secondary" className="text-center block">
          🎯 <strong>Écosystème Google Workspace complet</strong> : 
          Communication, collaboration, productivité et téléphonie - 
          Tout intégré dans votre CRM pour une expérience utilisateur optimale.
        </Text>
      </Card>
    </div>
  );
};

export default GoogleWorkspaceIntegratedPage;
