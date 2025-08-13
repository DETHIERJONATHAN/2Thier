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
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';

// 🎣 Hooks centralisés
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { NotificationManager } from '../../components/Notifications';

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

interface CallModuleProps {
  leadId?: string; // Prop optionnelle pour utilisation en Modal
  onClose?: () => void; // Callback pour fermer le Modal
}

export default function CallModule({ leadId: propLeadId, onClose }: CallModuleProps = {}): React.ReactElement {
  const { leadId: urlLeadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  
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
      const leadData = await api.get(`/leads/${leadId}`);
      setLead(leadData);
    } catch (error) {
      console.error('Erreur lors du chargement du lead:', error);
      NotificationManager.error('Erreur lors du chargement du lead');
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

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      
      {/* 🎯 Header simple */}
      <div className="bg-white p-4 mb-6 rounded-lg shadow">
        <div className="flex justify-between items-center">
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
              Retour
            </Button>
            <Title level={3} className="mb-0">
              📞 Module d'Appel - {lead.data?.name}
            </Title>
          </Space>
        </div>
      </div>

      {/* 🎯 Layout principal - 3 colonnes */}
      <Row gutter={[16, 16]}>
        
        {/* Colonne 1: Lead + IA */}
        <Col span={8}>
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
        <Col span={8}>
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
        <Col span={8}>
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
