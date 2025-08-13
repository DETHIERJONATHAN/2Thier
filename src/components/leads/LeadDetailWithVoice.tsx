import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Divider, Badge, Space, Button, Tooltip } from 'antd';
import { PhoneOutlined, MessageOutlined, UserOutlined, HistoryOutlined } from '@ant-design/icons';
import GoogleVoiceWidget from './GoogleVoiceWidget';
import LeadCallHistory from './LeadCallHistory';
import { useGoogleVoiceIntegration } from '../../hooks/useGoogleVoiceIntegration';

interface Lead {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  status?: string;
}

interface LeadDetailWithVoiceProps {
  lead: Lead;
  onLeadUpdate?: (updatedLead: Lead) => void;
}

const LeadDetailWithVoice: React.FC<LeadDetailWithVoiceProps> = ({ lead, onLeadUpdate }) => {
  const [voiceStatus, setVoiceStatus] = useState({
    hasVoiceNumber: false,
    voiceNumber: null,
    isConfigured: false
  });
  const [showHistory, setShowHistory] = useState(false);
  
  const { getUserVoiceStatus } = useGoogleVoiceIntegration();

  useEffect(() => {
    checkVoiceStatus();
  }, []);

  const checkVoiceStatus = async () => {
    const status = await getUserVoiceStatus();
    setVoiceStatus(status);
  };

  const handleCallComplete = (callData: any) => {
    console.log('Appel terminé:', callData);
    // Ici on pourrait mettre à jour le statut du lead ou ajouter une note
    if (onLeadUpdate) {
      onLeadUpdate({
        ...lead,
        // Ajouter une propriété pour indiquer la dernière interaction
        lastContact: new Date().toISOString()
      } as Lead);
    }
  };

  const getLeadDisplayName = () => {
    return `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Lead sans nom';
  };

  if (!lead.phone) {
    return (
      <Card title="Contact" className="mb-4">
        <div className="text-center py-8 text-gray-500">
          <PhoneOutlined className="text-4xl mb-2" />
          <div>Aucun numéro de téléphone disponible</div>
          <div className="text-sm">Ajoutez un numéro pour utiliser Google Voice</div>
        </div>
      </Card>
    );
  }

  return (
    <div>
      {/* Informations du lead */}
      <Card title="Informations du contact" className="mb-4">
        <Row gutter={16}>
          <Col span={12}>
            <div className="mb-2">
              <strong>Nom:</strong> {getLeadDisplayName()}
            </div>
            <div className="mb-2">
              <strong>Email:</strong> {lead.email || 'Non renseigné'}
            </div>
          </Col>
          <Col span={12}>
            <div className="mb-2">
              <strong>Entreprise:</strong> {lead.company || 'Non renseignée'}
            </div>
            <div className="mb-2">
              <strong>Statut:</strong> 
              <Badge 
                status={lead.status === 'active' ? 'success' : 'default'} 
                text={lead.status || 'Nouveau'} 
                className="ml-2"
              />
            </div>
          </Col>
        </Row>
      </Card>

      {/* Widget Google Voice */}
      {voiceStatus.isConfigured ? (
        <GoogleVoiceWidget
          leadPhone={lead.phone}
          leadName={getLeadDisplayName()}
          leadId={lead.id}
          onCallComplete={handleCallComplete}
        />
      ) : (
        <Card title="Google Voice" className="mb-4">
          <div className="text-center py-4">
            <PhoneOutlined className="text-2xl text-gray-400 mb-2" />
            <div className="text-gray-500">Google Voice non configuré</div>
            <div className="text-sm text-gray-400">
              Contactez votre administrateur pour activer la téléphonie
            </div>
          </div>
        </Card>
      )}

      {/* Toggle pour l'historique */}
      <div className="mb-4">
        <Space>
          <Button 
            icon={<HistoryOutlined />}
            onClick={() => setShowHistory(!showHistory)}
            type={showHistory ? 'primary' : 'default'}
          >
            {showHistory ? 'Masquer l\'historique' : 'Afficher l\'historique'}
          </Button>
          
          {voiceStatus.hasVoiceNumber && (
            <Tooltip title={`Votre numéro Google Voice: ${voiceStatus.voiceNumber}`}>
              <Badge status="success" text={`Voice: ${voiceStatus.voiceNumber}`} />
            </Tooltip>
          )}
        </Space>
      </div>

      {/* Historique des appels (conditionnel) */}
      {showHistory && (
        <LeadCallHistory
          leadId={lead.id}
          leadPhone={lead.phone}
        />
      )}
    </div>
  );
};

export default LeadDetailWithVoice;
