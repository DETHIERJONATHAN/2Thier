/**
 * 📞 CALLMODULE RÉVOLUTIONNAIRE - VERSION PRODUCTION
 * 
 * 🚀 Centre de commande d'appel IA avec interconnexion complète :
 * - 🎯 Interface Telnyx avec contrôles avancés
 * - 🤖 Assistant IA vocal conversationnel temps réel
 * - 🎙️ Analyse vocale et transcription live
 * - 📅 Calendrier intelligent avec optimisation géographique
 * - 📝 Formulaire de notes avec validation intelligente
 * - 📧 Génération d'emails avec prévisualisation IA
 * - 🔄 Synchronisation temps réel de tous les composants
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Button, 
  Space, 
  Typography, 
  Row,
  Col,
  Alert,
  Grid,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';

// 🎣 Hooks centralisés
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { NotificationManager } from '../../components/Notifications';
import { getErrorMessage, getErrorResponseDetails } from '../../utils/errorHandling';
import { unwrapApiData } from '../../utils/apiResponse';
import type { LeadApiResponse } from '../../types/leads';

// 📞 Composants CallModule existants
import { LeadInfoPanel } from '../../components/CallModule/components/LeadInfoPanel';
import { AIAssistantChat } from '../../components/CallModule/components/AIAssistantChat';
import { TelnyxInterface } from '../../components/CallModule/components/TelnyxInterface';
import { VoiceAnalysisPanel } from '../../components/CallModule/components/VoiceAnalysisPanel';
import { CallNotesForm } from '../../components/CallModule/components/CallNotesForm';
import { SmartCalendar } from '../../components/CallModule/components/SmartCalendar';

// 🎣 Hooks CallModule existants
import { useCallLogic } from '../../components/CallModule/hooks/useCallLogic';

// 🎯 Types TypeScript complets
import type { Lead } from '../../types/leads';

const { Title } = Typography;
const { useBreakpoint } = Grid;

interface CallModuleProps {
  leadId?: string; // Prop optionnelle pour utilisation en Modal
  onClose?: () => void; // Callback pour fermer le Modal
}

export default function CallModule({ leadId: propLeadId, onClose }: CallModuleProps = {}): React.ReactElement {
  const { leadId: urlLeadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const isMobile = !screens.lg;

  
  // Utilise le leadId des props si disponible, sinon celui de l'URL
  const leadId = propLeadId || urlLeadId;
  
  const { api } = useAuthenticatedApi();
  
  // États principaux
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 🎣 Hook principal qui gère toute la logique des appels
  const {
    callState,
    startCall,
    endCall,
    updateNotes,
    updateStatus,
    isLoading: callLoading
  } = useCallLogic(leadId!, lead, onClose);
  
  // Fonction pour gérer la fermeture/navigation
  const handleBack = useCallback(() => {
    if (onClose) {
      onClose(); // Si on est dans un Modal, utilise la callback
    } else {
      navigate(`/leads/details/${leadId}`); // Sinon navigation normale
    }
  }, [onClose, navigate, leadId]);
  
  // 📊 Récupération des détails du lead
  const fetchLeadDetail = useCallback(async () => {
    if (!leadId) return;
    
    try {
  const leadResponse = await api.get<LeadApiResponse>(`/api/leads/${leadId}`);
  setLead(unwrapApiData(leadResponse));
    } catch (error) {
      const errorMessage = getErrorMessage(error, 'Erreur lors du chargement du lead');
      const errorDetails = getErrorResponseDetails(error);
      console.error('Erreur lors du chargement du lead:', {
        error,
        status: errorDetails.status,
        data: errorDetails.data,
      });
      NotificationManager.error(errorMessage);
      navigate('/leads/home');
    } finally {
      setLoading(false);
    }
  }, [leadId, api, navigate]);

  // 🔄 Chargement initial
  useEffect(() => {
    fetchLeadDetail();
  }, [fetchLeadDetail]);

  // États d'erreur
  if (loading) return <div className="p-8 text-center">Chargement...</div>;
  if (!lead) return <Alert message="Lead non trouvé" type="error" />;

  // 🎯 Nom d'affichage du lead (priorité aux champs racines)
  const displayName = lead.name || 
    (lead.firstName && lead.lastName ? `${lead.firstName} ${lead.lastName}` : '') ||
    lead.data?.name || 
    'Nom non renseigné';

  return (
    <div
      className="min-h-screen bg-gray-50"
      style={{ padding: isMobile ? '16px' : '24px' }}
    >
      
      {/* 🎯 Header simple */}
      <div
        className="bg-white mb-6 rounded-lg shadow"
        style={{ padding: isMobile ? '16px' : '24px' }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            gap: isMobile ? 12 : 24,
          }}
        >
          <Space wrap size={isMobile ? 12 : 16}>
            <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
              Retour
            </Button>
            <Title level={3} className="mb-0">
              📞 Module d'Appel - {displayName}
            </Title>
          </Space>
        </div>
      </div>

      {/* 🎯 Layout principal - 3 colonnes */}
      <Row gutter={[16, 16]} align="stretch">
        
        {/* Colonne 1: Lead + IA */}
        <Col xs={24} md={12} xl={8} style={{ order: isMobile ? 1 : 0 }}>
          <div className="space-y-4">
            <LeadInfoPanel 
              lead={lead} 
              callInProgress={callState.isInProgress} 
            />
            <AIAssistantChat
              lead={lead}
              callState={callState}
              callNotes={callState.notes}
              onNotesUpdate={updateNotes}
              onSuggestionSelect={(suggestion) => 
                updateNotes(prev => `${prev}\n[IA] ${suggestion}`)
              }
            />
          </div>
        </Col>

        {/* Colonne 2: Appel + Analyse */}
        <Col xs={24} md={12} xl={8} style={{ order: isMobile ? 0 : 0 }}>
          <div className="space-y-4">
            <TelnyxInterface
              lead={lead}
              callState={callState}
              onStartCall={startCall}
              onEndCall={endCall}
              isLoading={callLoading}
            />
            <VoiceAnalysisPanel
              lead={lead}
              callInProgress={callState.isInProgress}
            />
          </div>
        </Col>

        {/* Colonne 3: Notes + Calendrier */}
        <Col xs={24} md={12} xl={8} style={{ order: isMobile ? 2 : 0 }}>
          <div className="space-y-4">
            <CallNotesForm
              callState={callState}
              onUpdateNotes={updateNotes}
              onUpdateStatus={updateStatus}
              onEndCall={endCall}
              isLoading={callLoading}
              canSave={callState.isFormValid}
            />
            {callState.status === 'meeting_scheduled' && (
              <SmartCalendar
                lead={lead}
                onSlotSelected={(slot) => 
                  console.log('Créneau sélectionné:', slot)
                }
              />
            )}
          </div>
        </Col>

      </Row>
    </div>
  );
}
