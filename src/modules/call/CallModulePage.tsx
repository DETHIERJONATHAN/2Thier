import React from 'react';
import { useParams } from 'react-router-dom';
import { CallInterface } from './components/CallInterface';
import { CallScript } from './components/CallScript';
import { CallNotes } from './components/CallNotes';
import { CallStatus } from './components/CallStatus';

const CallModulePage: React.FC = () => {
  const { leadId } = useParams<{ leadId: string }>();

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interface d'appel */}
        <div className="space-y-6">
          <CallInterface leadId={leadId} />
          <CallStatus leadId={leadId} />
        </div>
        
        {/* Script et notes */}
        <div className="space-y-6">
          <CallScript leadId={leadId} />
          <CallNotes leadId={leadId} />
        </div>
      </div>
    </div>
  );
};

export default CallModulePage;
