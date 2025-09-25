import LeadCreatorModalAdvanced from '../../../components/TreeBranchLeaf/lead-integration/LeadCreatorModalAdvanced';

interface AddLeadModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
}

// Wrapper qui réutilise le même module de création avancée que TBL
const AddLeadModal: React.FC<AddLeadModalProps> = ({ open, onCancel, onSuccess }) => {
  return (
    <LeadCreatorModalAdvanced
      open={open}
      onClose={onCancel}
      onLeadCreated={() => {
        onSuccess?.();
        onCancel();
      }}
      // Dans le module Leads, aucune soumission TBL à créer: no-op
      onCreateLead={async () => { /* no-op for Leads page */ }}
    />
  );
};

export default AddLeadModal;
