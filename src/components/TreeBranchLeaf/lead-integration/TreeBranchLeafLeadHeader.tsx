/**
 * 🎯 TreeBranchLeafLeadHeader - En-tête avec gestion des leads
 * 
 * Affiche le nom du lead sélectionné avec boutons pour charger/créer des leads
 */

import React, { useState } from 'react';
import { Button, Space, Typography, Tooltip, Tag } from 'antd';
import { 
  UserOutlined, 
  LoadingOutlined, 
  FolderOpenOutlined, 
  PlusOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import LeadSelectorModal from './LeadSelectorModal';
import LeadCreatorModal from './LeadCreatorModal';
import type { TreeBranchLeafLeadHeaderProps, TBLLead, CreateLeadData } from './types/lead-types';

const { Text, Title } = Typography;

const TreeBranchLeafLeadHeader: React.FC<TreeBranchLeafLeadHeaderProps> = ({
  selectedLead,
  isSaving,
  hasUnsavedChanges,
  onSelectLead,
  onCreateLead,
  disabled = false
}) => {
  const [showLeadSelector, setShowLeadSelector] = useState(false);
  const [showLeadCreator, setShowLeadCreator] = useState(false);

  // Nom affiché pour le lead
  const getLeadDisplayName = (lead: TBLLead | null): string => {
    if (!lead) return 'Aucun lead sélectionné';
    return lead.name || 'Lead sans nom';
  };

  // Couleur et icône pour l'indicateur de sauvegarde
  const getSaveStatus = () => {
    if (isSaving) {
      return {
        icon: <LoadingOutlined />,
        color: 'blue',
        text: 'Sauvegarde...'
      };
    }
    
    if (hasUnsavedChanges) {
      return {
        icon: <ExclamationCircleOutlined />,
        color: 'orange',
        text: 'Modifications non sauvées'
      };
    }
    
    return {
      icon: <CheckCircleOutlined />,
      color: 'green',
      text: 'Sauvegardé'
    };
  };

  const saveStatus = getSaveStatus();

  const handleLeadSelect = (lead: TBLLead) => {
    setShowLeadSelector(false);
    onSelectLead(lead);
  };

  const handleLeadCreate = async (leadData: CreateLeadData) => {
    try {
      await onCreateLead(leadData);
      setShowLeadCreator(false);
    } catch (error) {
      // Erreur gérée par le parent
      console.error('Erreur création lead:', error);
    }
  };

  return (
    <>
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          padding: '12px 16px',
          backgroundColor: '#fafafa',
          borderBottom: '1px solid #d9d9d9',
          minHeight: '60px'
        }}
      >
        {/* Section gauche - Informations lead */}
        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <UserOutlined 
            style={{ 
              fontSize: '18px', 
              color: selectedLead ? '#1890ff' : '#8c8c8c',
              marginRight: '8px' 
            }} 
          />
          
          <div style={{ marginRight: '16px' }}>
            <Title 
              level={4} 
              style={{ 
                margin: 0, 
                color: selectedLead ? '#262626' : '#8c8c8c',
                fontSize: '16px'
              }}
            >
              {getLeadDisplayName(selectedLead)}
            </Title>
            
            {selectedLead && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {selectedLead.email || 'Aucun email'} 
                {selectedLead.phone && ` • ${selectedLead.phone}`}
              </Text>
            )}
          </div>

          {/* Indicateur de soumission existante */}
          {selectedLead?.hasSubmission && (
            <Tag color="green" style={{ margin: 0 }}>
              Devis existant
            </Tag>
          )}
        </div>

        {/* Section droite - Actions et statut */}
        <Space size="middle">
          {/* Indicateur de sauvegarde */}
          {selectedLead && (
            <Tooltip title={saveStatus.text}>
              <Tag 
                icon={saveStatus.icon} 
                color={saveStatus.color}
                style={{ 
                  margin: 0,
                  borderRadius: '4px',
                  cursor: 'help'
                }}
              >
                {isSaving ? 'Sauvegarde...' : (hasUnsavedChanges ? 'Non sauvé' : 'Sauvé')}
              </Tag>
            </Tooltip>
          )}

          {/* Boutons d'action */}
          <Space>
            <Button
              icon={<FolderOpenOutlined />}
              onClick={() => setShowLeadSelector(true)}
              disabled={disabled || isSaving}
              type="default"
            >
              Charger
            </Button>
            
            <Button
              icon={<PlusOutlined />}
              onClick={() => setShowLeadCreator(true)}
              disabled={disabled || isSaving}
              type="primary"
            >
              Nouveau
            </Button>
          </Space>
        </Space>
      </div>

      {/* Modals */}
      <LeadSelectorModal
        open={showLeadSelector}
        onClose={() => setShowLeadSelector(false)}
        onSelectLead={handleLeadSelect}
        currentLeadId={selectedLead?.id}
      />

      <LeadCreatorModal
        open={showLeadCreator}
        onClose={() => setShowLeadCreator(false)}
        onLeadCreated={handleLeadSelect}
        onCreateLead={handleLeadCreate}
      />
    </>
  );
};

export default TreeBranchLeafLeadHeader;