import React from 'react';
import type { Lead } from '../../../types/lead';
import LeadCreatorModalAdvanced from '../../../components/TreeBranchLeaf/lead-integration/LeadCreatorModalAdvanced';

interface EditLeadModalProps {
  open: boolean;
  lead: Lead;
  onCancel: () => void;
  onSuccess?: () => void;
}

const EditLeadModal: React.FC<EditLeadModalProps> = ({ open, lead, onCancel, onSuccess }) => {
  return (
    <LeadCreatorModalAdvanced
      open={open}
      onClose={onCancel}
      onLeadCreated={() => onSuccess?.()}
      onCreateLead={async () => { /* en édition, pas de création TBL à enchaîner */ }}
      mode="edit"
      initialLead={{
        id: lead.id,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        source: lead.source,
        website: lead.website,
        notes: lead.notes,
        nextFollowUpDate: lead.nextFollowUpDate,
        data: (lead.data as Record<string, unknown>) || null,
        status: lead.status,
        assignedToId: lead.assignedToId || null
      }}
    />
  );
};

export default EditLeadModal;
