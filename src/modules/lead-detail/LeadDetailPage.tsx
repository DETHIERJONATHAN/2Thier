import React from 'react';
import { useParams } from 'react-router-dom';
import { LeadInfo } from './components/LeadInfo';
import { LeadHistory } from './components/LeadHistory';
import { LeadActions } from './components/LeadActions';
import { LeadNotes } from './components/LeadNotes';
import { LeadDocuments } from './components/LeadDocuments';
import { AIInsights } from './components/AIInsights';

const LeadDetailPage: React.FC = () => {
  const { leadId } = useParams<{ leadId: string }>();

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-6">
          <LeadInfo leadId={leadId} />
          <LeadHistory leadId={leadId} />
          <LeadNotes leadId={leadId} />
          <LeadDocuments leadId={leadId} />
        </div>
        
        {/* Colonne latérale */}
        <div className="space-y-6">
          <LeadActions leadId={leadId} />
          <AIInsights leadId={leadId} />
        </div>
      </div>
    </div>
  );
};

export default LeadDetailPage;
