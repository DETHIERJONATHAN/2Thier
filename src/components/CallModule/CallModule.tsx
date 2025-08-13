/**
 * 📞 CallModule - Module d'appel révolutionnaire avec IA intégrée
 * 
 * Architecture modulaire complète :
 * - 🎯 Orchestration complète de l'appel avec statuts standardisés
 * - 🤖 Assistant IA conversationnel intégré
 * - 📅 Calendrier Google intelligent
 * - 🎙️ Transcription vocale temps réel
 * - 📊 Analytics d'appel en direct // 🎯 Affichage automatique du Smart Agenda quand le statut est "meeting_scheduled"
  useEffect(() => {
    if (callLogic.callState.status === CALL_STATUSES.MEETING_SCHEDULED && !googleCalendar.calendarState.isVisible) {
      googleCalendar.toggleCalendar();
    }
  }, [callLogic.callState.status, googleCalendar]);

  // 🎯 États dérivés pour l'UI
  const uiState = useMemo(() => ({
    canStartCall: !callLogic.callState.isInProgress && !callLogic.isLoading && lead?.data?.phone,
    showCalendar: googleCalendar.calendarState.isVisible,
    showAIAssistant: aiAssistant.aiState?.isVisible,
    showVoiceAnalysis: voiceTranscription.transcriptionState.isActive,
    callDuration: callLogic.formatDuration(callLogic.callState.duration),
    aiConfidence: aiAssistant.overallConfidence || 0,
    transcriptionActive: voiceTranscription.transcriptionState.isActive,
    // Ajout de l'état pour le RDV
    isSchedulingMeeting: callLogic.callState.status === CALL_STATUSES.MEETING_SCHEDULED
  }), [
    callLogic,
    lead?.data?.phone,
    googleCalendar.calendarState.isVisible,
    aiAssistant.aiState?.isVisible,
    aiAssistant.overallConfidence,
    voiceTranscription.transcriptionState.isActive
  ]);appels
 * - 🤖 Assistant IA conversationnel intégré
 * - 📅 Calendrier Google intelligent
 * - 🎙️ Transcription vocale temps réel
 * - 📊 Analytics appel en live
 * - ⚡ Interface utilisateur moderne et intuitive
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, Row, Col, Space, Button, Typography, Badge, Divider, Tooltip } from 'antd';
import { CALL_STATUSES } from '../../constants/callStatuses';
import { 
  RobotOutlined, 
  CalendarOutlined,
  AudioOutlined,
  BarChartOutlined,
  CloseOutlined,
  UserOutlined,
  MailOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';

// 🎣 Hooks métier
import { useCallLogic } from './hooks/useCallLogic';
import { useGoogleCalendar } from './hooks/useGoogleCalendar';
import { useAIAssistant } from './hooks/useAIAssistant';
import { useVoiceTranscription } from './hooks/useVoiceTranscription';
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';

// 🎨 Composants UI spécialisés
import { LeadInfoPanel } from './components/LeadInfoPanel';
import { TelnyxInterface } from './components/TelnyxInterface';
import { AIAssistantChat } from './components/AIAssistantChat';
import { SmartCalendar } from './components/SmartCalendar';
import { VoiceAnalysisPanel } from './components/VoiceAnalysisPanel';
import { CallNotesForm } from './components/CallNotesForm';

// 📋 Types
import type { Lead } from '../../types/leads';
import type { CallModuleProps } from './types/CallTypes';

const { Title, Text } = Typography;

export const CallModule: React.FC<CallModuleProps> = ({
  leadId: propLeadId,
  onClose
}) => {
  
  const { id: paramLeadId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { api } = useAuthenticatedApi();
  
  // 🎯 ID du lead (prop ou URL)
  const leadId = propLeadId || paramLeadId || '';
  
  // 📊 États principaux
  const [lead, setLead] = useState<Lead | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  
  // 🎣 Hooks métier spécialisés
  const callLogic = useCallLogic(leadId, lead, () => {
    console.log('[CallModule] 🎉 Appel terminé avec succès');
    // Optionnel: fermer le module après un appel réussi
  });
  
  const googleCalendar = useGoogleCalendar(leadId, lead);
  
  const aiAssistant = useAIAssistant(lead, callLogic.callState.isInProgress);
  
  const voiceTranscription = useVoiceTranscription(
    leadId,
    lead,
    callLogic.callState.isInProgress,
    (transcription) => {
      // 🔄 Synchroniser transcription avec l'IA
      aiAssistant.analyzeVoiceTranscription?.(
        transcription.text,
        transcription.speaker?.type === 'agent' ? 'agent' : 'prospect'
      );
    }
  );
  
  // 📞 Charger les données du lead
  useEffect(() => {
    if (!leadId) {
      setError('ID lead manquant');
      setIsLoading(false);
      return;
    }
    
    const loadLead = async () => {
      try {
        setIsLoading(true);
        console.log('[CallModule] 📊 Chargement lead:', leadId);
        
        const response = await api.get<{ success: boolean, data: Lead }>(`/api/leads/${leadId}`);
        
        if (response.success && response.data) {
          setLead(response.data);
          console.log('[CallModule] ✅ Lead chargé:', response.data.firstName, response.data.lastName);
        } else {
          throw new Error('Lead non trouvé');
        }
        
      } catch (error: unknown) {
        console.error('[CallModule] ❌ Erreur chargement lead:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erreur de chargement';
        setError(errorMessage);
        
      } finally {
        setIsLoading(false);
      }
    };
    
    loadLead();
  }, [leadId, api]);
  
  // 🎯 Affichage automatique du Smart Agenda quand RDV fixé
  useEffect(() => {
    if (!googleCalendar) return;

    if (callLogic.callState.status === CALL_STATUSES.MEETING_SCHEDULED) {
      // Force l'affichage du calendrier quand statut = RDV fixé
      if (!googleCalendar.calendarState.isVisible) {
        console.log('[CallModule] 📅 Affichage automatique du Smart Calendar - RDV fixé');
        googleCalendar.toggleCalendar();
      }
    } else {
      // Cache le calendrier si on change pour un autre statut
      if (googleCalendar.calendarState.isVisible) {
        console.log('[CallModule] 📅 Masquage automatique du Smart Calendar - Statut changé');
        googleCalendar.toggleCalendar();
      }
    }
  }, [callLogic.callState.status, googleCalendar]);

  // 🎯 Fermer le module
  const handleClose = useCallback(() => {
    if (callLogic.callState.isInProgress) {
      // Demander confirmation si appel en cours
      if (window.confirm('Un appel est en cours. Êtes-vous sûr de vouloir fermer ?')) {
        voiceTranscription.stopTranscription();
        onClose?.();
        if (!propLeadId) navigate('/leads');
      }
    } else {
      onClose?.();
      if (!propLeadId) navigate('/leads');
    }
  }, [callLogic.callState.isInProgress, voiceTranscription, onClose, propLeadId, navigate]);
  
  // 📊 États dérivés pour l'UI
  const uiState = useMemo(() => ({
    canStartCall: !callLogic.callState.isInProgress && !callLogic.isLoading && lead?.data?.phone,
    showCalendar: googleCalendar.calendarState.isVisible,
    showAIAssistant: aiAssistant.aiState?.isVisible,
    showVoiceAnalysis: voiceTranscription.transcriptionState.isActive,
    callDuration: callLogic.formatDuration(callLogic.callState.duration),
    aiConfidence: aiAssistant.overallConfidence || 0,
    transcriptionActive: voiceTranscription.transcriptionState.isActive
  }), [
    callLogic,
    lead?.data?.phone,
    googleCalendar.calendarState.isVisible,
    aiAssistant.aiState?.isVisible,
    aiAssistant.overallConfidence,
    voiceTranscription.transcriptionState.isActive
  ]);
  
  // 🎯 Actions rapides intelligentes
  const quickActions = useMemo(() => [
    {
      key: 'ai-assistant',
      label: 'Assistant IA',
      icon: <RobotOutlined />,
      active: uiState.showAIAssistant,
      onClick: aiAssistant.toggleAssistant || (() => {}),
      badge: aiAssistant.messages?.length || 0,
      tooltip: 'Chat intelligent avec recommandations IA'
    },
    {
      key: 'calendar',
      label: 'Calendrier',
      icon: <CalendarOutlined />,
      active: uiState.showCalendar,
      onClick: googleCalendar.toggleCalendar,
      badge: googleCalendar.calendarStats.todayFreeSlots,
      tooltip: 'Planifier un RDV pendant l\'appel'
    },
    {
      key: 'voice-analysis',
      label: 'Transcription',
      icon: <AudioOutlined />,
      active: uiState.transcriptionActive,
      onClick: voiceTranscription.toggleTranscription,
      badge: voiceTranscription.transcriptionStats.totalTranscriptions,
      tooltip: 'Transcription vocale temps réel'
    }
  ], [uiState, aiAssistant, googleCalendar, voiceTranscription]);
  
  // 🚨 Loading & Error states
  if (isLoading) {
    return (
      <Card loading style={{ margin: 20 }}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Text>Chargement des informations du lead...</Text>
        </div>
      </Card>
    );
  }
  
  if (error || !lead) {
    return (
      <Card style={{ margin: 20 }}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Text type="danger">❌ {error || 'Lead non trouvé'}</Text>
          <br /><br />
          <Button onClick={handleClose}>Retour</Button>
        </div>
      </Card>
    );
  }
  
  return (
    <div style={{ padding: 20, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      
      {/* 🎯 En-tête avec actions principales */}
      <Card 
        style={{ marginBottom: 20 }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Space size="middle">
              <UserOutlined style={{ fontSize: 24, color: '#1890ff' }} />
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  {lead.data?.name}
                </Title>
                <Text type="secondary">
                  {lead.data?.company} • {lead.source}
                </Text>
              </div>
              
              {callLogic.callState.isInProgress && (
                <Badge 
                  status="processing" 
                  text={`En cours • ${uiState.callDuration}`}
                  style={{ marginLeft: 20 }}
                />
              )}
            </Space>
            
            <Space>
              {/* Actions rapides */}
              {quickActions.map(action => (
                <Tooltip key={action.key} title={action.tooltip}>
                  <Button
                    type={action.active ? 'primary' : 'default'}
                    icon={action.icon}
                    onClick={action.onClick}
                    size="large"
                  >
                    {action.label}
                    {action.badge > 0 && (
                      <Badge count={action.badge} size="small" offset={[10, -5]} />
                    )}
                  </Button>
                </Tooltip>
              ))}
              
              <Divider type="vertical" style={{ height: 40 }} />
              
              <Tooltip title="Fermer le module">
                <Button 
                  icon={<CloseOutlined />} 
                  onClick={handleClose}
                  danger={callLogic.callState.isInProgress}
                />
              </Tooltip>
            </Space>
          </div>
        }
      >
        
        {/* 📊 Interface principale d'appel */}
        <Row gutter={[16, 16]}>
          
          {/* 📞 Interface Telnyx */}
          <Col span={8}>
            <TelnyxInterface
              lead={lead}
              callState={callLogic.callState}
              onStartCall={callLogic.startCall}
              onEndCall={callLogic.endCall}
              isLoading={callLogic.isLoading}
              error={callLogic.error}
            />
          </Col>
          
          {/* 📊 Panneau central avec tabs conditionnels */}
          <Col span={16}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              
              {/* 🤖 Assistant IA Chat (si actif) */}
              {uiState.showAIAssistant && (
                <AIAssistantChat
                  lead={lead}
                  callInProgress={callLogic.callState.isInProgress}
                  messages={aiAssistant.messages || []}
                  onSendMessage={aiAssistant.sendMessage}
                  isAnalyzing={aiAssistant.isAnalyzing}
                  currentAnalysis={aiAssistant.currentAnalysis}
                  onClearChat={aiAssistant.clearChat}
                />
              )}
              

              
              {/* 🎙️ Analyse vocale (si active) */}
              {uiState.showVoiceAnalysis && (
                <VoiceAnalysisPanel
                  transcriptionState={voiceTranscription.transcriptionState}
                  voiceAnalysis={voiceTranscription.voiceAnalysis}
                  keywordDetections={voiceTranscription.keywordDetections}
                  transcriptionStats={voiceTranscription.transcriptionStats}
                  onStartTranscription={voiceTranscription.startTranscription}
                  onStopTranscription={voiceTranscription.stopTranscription}
                  isLoading={voiceTranscription.isLoading}
                />
              )}
              
            </Space>
          </Col>
          
        </Row>
        
      </Card>
      
      {/* 📄 Panels annexes en bas */}
      <Row gutter={[16, 16]}>
        
        {/* 📋 Informations Lead */}
        <Col span={12}>
          <LeadInfoPanel 
            lead={lead}
            callInProgress={callLogic.callState.isInProgress}
          />
        </Col>
        
        {/* 📝 Formulaire notes d'appel et Smart Calendar */}
        <Col span={12}>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <CallNotesForm
              callState={callLogic.callState}
              onUpdateNotes={callLogic.updateNotes}
              onUpdateStatus={callLogic.updateStatus}
              onEndCall={callLogic.endCall}
              isLoading={callLogic.isLoading}
              canSave={callLogic.callState.isFormValid}
            />
            
            {/* 📅 Smart Calendar (apparaît sous les notes quand statut = RDV fixé) */}
            {callLogic.callState.status === CALL_STATUSES.MEETING_SCHEDULED && (
              <Card style={{ marginTop: 16 }}>
                <Title level={4}>📅 Smart Calendar - Planification du rendez-vous</Title>
                <SmartCalendar
                  lead={lead}
                  onSelectSlot={(date) => {
                    if (googleCalendar && googleCalendar.createMeeting) {
                      // Le nouveau SmartCalendar retourne un objet Dayjs.
                      // Nous créons un objet "slot" compatible avec une durée par défaut.
                      const slot = {
                        start: date.toDate(),
                        end: date.add(30, 'minutes').toDate(),
                        duration: 30,
                      };
                      googleCalendar.createMeeting(slot, {
                        title: `RDV Commercial - ${lead?.data?.name}`,
                        description: `Rendez-vous commercial programmé via CRM.\n\nClient: ${lead?.data?.name}\nSociété: ${lead?.data?.company || 'N/A'}\nTéléphone: ${lead?.data?.phone || 'N/A'}`,
                        duration: 30 // Durée en minutes
                      });
                    }
                  }}
                />
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary">
                    ℹ️ Sélectionnez un créneau pour planifier automatiquement le rendez-vous
                  </Text>
                </div>
                <div style={{ marginTop: 16 }}>
                  <Button type="primary" icon={<MailOutlined />} onClick={() => navigate(`/mail?leadId=${leadId}&intent=meeting_confirmation`)}>
                    Envoyer email de confirmation
                  </Button>
                </div>
              </Card>
            )}
          </Space>
        </Col>
        
      </Row>
      
      {/* 📊 Statistiques et indicateurs (si appel en cours) */}
      {callLogic.callState.isInProgress && (
        <Card 
          style={{ marginTop: 20 }}
          title={
            <Space>
              <BarChartOutlined />
              <span>Analytics Appel en Temps Réel</span>
            </Space>
          }
          size="small"
        >
          <Row gutter={16}>
            <Col span={6}>
              <div style={{ textAlign: 'center' }}>
                <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
                  {uiState.callDuration}
                </Title>
                <Text type="secondary">Durée</Text>
              </div>
            </Col>
            <Col span={6}>
              <div style={{ textAlign: 'center' }}>
                <Title level={4} style={{ margin: 0, color: '#52c41a' }}>
                  {uiState.aiConfidence}%
                </Title>
                <Text type="secondary">Confiance IA</Text>
              </div>
            </Col>
            <Col span={6}>
              <div style={{ textAlign: 'center' }}>
                <Title level={4} style={{ margin: 0, color: '#722ed1' }}>
                  {voiceTranscription.transcriptionStats.wordCount}
                </Title>
                <Text type="secondary">Mots transcrits</Text>
              </div>
            </Col>
            <Col span={6}>
              <div style={{ textAlign: 'center' }}>
                <Title level={4} style={{ margin: 0, color: '#fa8c16' }}>
                  {googleCalendar.calendarStats.todayFreeSlots}
                </Title>
                <Text type="secondary">Créneaux libres</Text>
              </div>
            </Col>
          </Row>
        </Card>
      )}
      
    </div>
  );
};

export default CallModule;
