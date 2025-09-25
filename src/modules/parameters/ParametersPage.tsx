import React, { useState } from 'react';
import { Tabs } from 'antd';
import { StatusMapping } from './components/StatusMapping';
import { SourcesConfig } from './components/SourcesConfig';
import { APIConfig } from './components/APIConfig';
import { UsersConfig } from './components/UsersConfig';
import { EmailTemplates } from './components/EmailTemplates';
import { CallScripts } from './components/CallScripts';

const ParametersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('status');

  const tabItems = [
    {
      key: 'status',
      label: '🔄 Statuts',
      children: <StatusMapping />
    },
    {
      key: 'sources',
      label: '📥 Sources',
      children: <SourcesConfig />
    },
    {
      key: 'api',
      label: '🔌 API',
      children: <APIConfig />
    },
    {
      key: 'users',
      label: '👥 Commerciaux',
      children: <UsersConfig />
    },
    {
      key: 'email-templates',
      label: '📧 Templates Emails',
      children: <EmailTemplates />
    },
    {
      key: 'call-scripts',
      label: '📞 Scripts d\'appels',
      children: <CallScripts />
    }
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Paramètres</h1>
          <p className="text-gray-600 mt-1">Configuration du CRM et personnalisation</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            size="large"
            className="p-6"
          />
        </div>
      </div>
    </div>
  );
};

export default ParametersPage;
