/**
 * 🎙️ VoiceAnalysisPanel - Panneau d'analyse vocale en temps réel
 * 
 * Fonctionnalités révolutionnaires :
 * - 🎤 Transcription vocale live (agent + prospect)
 * - 🧠 Analyse sentiment en temps réel
 * - 🎯 Détection de mots-clés métier
 * - 📊 Métriques vocales (ton, débit, pauses)
 * - 💡 Suggestions contextuelles pendant l'appel
 * - 📝 Résumé automatique de l'appel
 */

import React, { useMemo, useCallback, useState } from 'react';
import { Card, Typography, Space, Progress, Tag, Button, List, Badge, Alert, Spin } from 'antd';
import {
  AudioOutlined,
  SoundOutlined,
  MutedOutlined,
  RobotOutlined,
  HeartOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  BulbOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined
} from '@ant-design/icons';
import { useVoiceTranscription } from '../hooks/useVoiceTranscription';
import type { 
  Lead, 
  TranscriptionState, 
  VoiceAnalysis, 
  KeywordDetection, 
  TranscriptionStats 
} from '../types/CallTypes';

const { Title, Text } = Typography;

interface VoiceAnalysisPanelProps {
  lead?: Lead;
  callInProgress: boolean;
  transcriptionState?: TranscriptionState;
  voiceAnalysis?: VoiceAnalysis;
  keywordDetections?: KeywordDetection[];
  transcriptionStats?: TranscriptionStats;
  onStartTranscription?: () => void;
  onStopTranscription?: () => void;
  isLoading?: boolean;
  className?: string;
  onSuggestionApply?: (suggestion: string) => void;
}

export const VoiceAnalysisPanel: React.FC<VoiceAnalysisPanelProps> = ({
  lead,
  callInProgress,
  transcriptionState: propTranscriptionState,
  voiceAnalysis: propVoiceAnalysis,
  keywordDetections: propKeywordDetections,
  transcriptionStats: propTranscriptionStats,
  onStartTranscription: propStartTranscription,
  onStopTranscription: propStopTranscription,
  isLoading: propIsLoading,
  className,
  onSuggestionApply
}) => {
  
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);
  
  // 🎙️ Hook transcription vocale (si pas fourni via props)
  const hookData = useVoiceTranscription(
    lead?.id || '',
    lead || null,
    callInProgress,
    (transcription) => {
      console.log('[VoiceAnalysisPanel] 📝 Nouvelle transcription:', transcription.text);
    }
  );
  
  // 🎯 Utiliser les props ou les données du hook
  const transcriptionState = propTranscriptionState || hookData.transcriptionState;
  const voiceAnalysis = propVoiceAnalysis || hookData.voiceAnalysis;
  const keywordDetections = propKeywordDetections || hookData.keywordDetections;
  const transcriptionStats = propTranscriptionStats || hookData.transcriptionStats;
  const startTranscription = propStartTranscription || hookData.startTranscription;
  const stopTranscription = propStopTranscription || hookData.stopTranscription;
  const isLoading = propIsLoading !== undefined ? propIsLoading : hookData.isLoading;
  const error = hookData.error; // Variable error manquante ajoutée
  const toggleTranscription = useCallback(() => {
    if (transcriptionState?.isActive) {
      stopTranscription?.();
    } else {
      startTranscription?.();
    }
  }, [transcriptionState?.isActive, startTranscription, stopTranscription]);

  // 🎨 Couleur du sentiment
  const getSentimentColor = useCallback((sentiment: string): string => {
    switch (sentiment) {
      case 'positive': return '#52c41a';
      case 'negative': return '#ff4d4f';
      case 'neutral': return '#fadb14';
      default: return '#d9d9d9';
    }
  }, []);

  // 🎯 Icône du sentiment
  const getSentimentIcon = useCallback((sentiment: string) => {
    switch (sentiment) {
      case 'positive': return <HeartOutlined style={{ color: '#52c41a' }} />;
      case 'negative': return <ThunderboltOutlined style={{ color: '#ff4d4f' }} />;
      case 'neutral': return <EyeOutlined style={{ color: '#fadb14' }} />;
      default: return <RobotOutlined />;
    }
  }, []);

  // 📊 Métriques vocales formatées
  const voiceMetrics = useMemo(() => {
    if (!voiceAnalysis) return null;

    return {
      sentiment: {
        value: voiceAnalysis.sentiment,
        confidence: Math.round(voiceAnalysis.confidence * 100),
        color: getSentimentColor(voiceAnalysis.sentiment),
        icon: getSentimentIcon(voiceAnalysis.sentiment)
      },
      tone: {
        level: voiceAnalysis.tone,
        description: voiceAnalysis.tone === 'professional' ? 'Professionnel' :
                    voiceAnalysis.tone === 'friendly' ? 'Amical' :
                    voiceAnalysis.tone === 'assertive' ? 'Assertif' : 'Neutre'
      },
      energy: {
        level: voiceAnalysis.energyLevel || 0.5,
        description: (voiceAnalysis.energyLevel || 0.5) > 0.7 ? 'Énergique' :
                    (voiceAnalysis.energyLevel || 0.5) > 0.4 ? 'Modéré' : 'Calme'
      },
      engagement: {
        score: voiceAnalysis.engagementScore || 0.6,
        level: (voiceAnalysis.engagementScore || 0.6) > 0.7 ? 'Élevé' :
               (voiceAnalysis.engagementScore || 0.6) > 0.4 ? 'Moyen' : 'Faible'
      }
    };
  }, [voiceAnalysis, getSentimentColor, getSentimentIcon]);

  // 💡 Suggestions contextuelles basées sur l'analyse
  const contextualSuggestions = useMemo(() => {
    if (!voiceAnalysis || !transcriptionState.currentText) return [];

    const suggestions: string[] = [];
    
    // Suggestions basées sur le sentiment
    if (voiceAnalysis.sentiment === 'negative') {
      suggestions.push("Le prospect semble réticent. Posez une question ouverte pour comprendre ses préoccupations.");
      suggestions.push("Réorientez vers les bénéfices qui correspondent à ses besoins exprimés.");
    } else if (voiceAnalysis.sentiment === 'positive') {
      suggestions.push("Le prospect est engagé ! C'est le moment parfait pour proposer une démo.");
      suggestions.push("Profitez de cet élan positif pour aborder les aspects commerciaux.");
    }

    // Suggestions basées sur les mots-clés détectés
    const budgetKeywords = ['budget', 'prix', 'coût', 'tarif'];
    const timeKeywords = ['urgent', 'rapidement', 'délai', 'planning'];
    const competitionKeywords = ['concurrent', 'alternative', 'comparaison'];

    if (budgetKeywords.some(kw => transcriptionState.currentText.toLowerCase().includes(kw))) {
      suggestions.push("Budget évoqué - Présentez la valeur ROI avant les tarifs.");
    }

    if (timeKeywords.some(kw => transcriptionState.currentText.toLowerCase().includes(kw))) {
      suggestions.push("Urgence détectée - Proposez un planning d'implémentation rapide.");
    }

    if (competitionKeywords.some(kw => transcriptionState.currentText.toLowerCase().includes(kw))) {
      suggestions.push("Concurrence mentionnée - Mettez en avant vos avantages différenciants.");
    }

    return suggestions.slice(0, 3); // Max 3 suggestions
  }, [voiceAnalysis, transcriptionState.currentText]);

  // 📝 Dernières transcriptions formatées
  const recentTranscriptions = useMemo(() => {
    return transcriptionState.transcriptionHistory
      .slice(-5) // 5 dernières
      .reverse()
      .map((trans, index) => ({
        ...trans,
        id: `trans_${index}`,
        timeAgo: `Il y a ${Math.round((Date.now() - trans.timestamp) / 1000)}s`,
        speakerLabel: trans.speaker?.type === 'agent' ? 'Vous' : 'Prospect',
        speakerColor: trans.speaker?.type === 'agent' ? '#1890ff' : '#52c41a'
      }));
  }, [transcriptionState.transcriptionHistory]);

  return (
    <Card 
      title={
        <Space>
          <AudioOutlined style={{ color: '#1890ff' }} />
          <span>Analyse Vocale IA</span>
          {transcriptionState.isActive && (
            <Badge status="processing" text="En cours" />
          )}
        </Space>
      }
      className={className}
      extra={
        <Space>
          <Button
            type={transcriptionState.isActive ? 'default' : 'primary'}
            icon={transcriptionState.isActive ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            onClick={toggleTranscription}
            loading={isLoading}
            disabled={!callInProgress}
            size="small"
          >
            {transcriptionState.isActive ? 'Pause' : 'Démarrer'}
          </Button>
          
          <Button
            type="link"
            size="small"
            onClick={() => setShowDetailedAnalysis(!showDetailedAnalysis)}
          >
            {showDetailedAnalysis ? 'Masquer' : 'Détails'}
          </Button>
        </Space>
      }
    >
      
      {/* 🚨 Erreurs */}
      {error && (
        <Alert
          message="Erreur d'analyse vocale"
          description={error}
          type="error"
          closable
          style={{ marginBottom: 16 }}
        />
      )}

      {/* ⏳ Loading */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: 20 }}>
          <Spin size="large" />
          <div style={{ marginTop: 12 }}>
            <Text type="secondary">Initialisation de l'analyse vocale...</Text>
          </div>
        </div>
      )}

      {/* 📊 Métriques principales */}
      {voiceMetrics && (
        <div style={{ marginBottom: 20 }}>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            
            {/* Sentiment */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Space>
                  {voiceMetrics.sentiment.icon}
                  <Text strong>Sentiment</Text>
                </Space>
                <Tag color={voiceMetrics.sentiment.color}>
                  {voiceMetrics.sentiment.confidence}% confiance
                </Tag>
              </div>
              <Progress
                percent={voiceMetrics.sentiment.confidence}
                strokeColor={voiceMetrics.sentiment.color}
                showInfo={false}
                size="small"
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {voiceMetrics.sentiment.value.toUpperCase()}
              </Text>
            </div>

            {/* Engagement */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Space>
                  <RobotOutlined style={{ color: '#722ed1' }} />
                  <Text strong>Engagement</Text>
                </Space>
                <Text type="secondary">{voiceMetrics.engagement.level}</Text>
              </div>
              <Progress
                percent={Math.round(voiceMetrics.engagement.score * 100)}
                strokeColor="#722ed1"
                showInfo={false}
                size="small"
              />
            </div>

          </Space>
        </div>
      )}

      {/* 💡 Suggestions contextuelles */}
      {contextualSuggestions.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <Title level={5} style={{ marginBottom: 12 }}>
            <BulbOutlined style={{ color: '#fadb14' }} />
            <span style={{ marginLeft: 8 }}>Suggestions IA</span>
          </Title>
          
          <Space direction="vertical" style={{ width: '100%' }}>
            {contextualSuggestions.map((suggestion, index) => (
              <Card
                key={index}
                size="small"
                style={{ 
                  backgroundColor: '#fffbe6',
                  border: '1px solid #fadb14',
                  borderRadius: 6
                }}
                bodyStyle={{ padding: 12 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Text style={{ flex: 1, fontSize: 13 }}>
                    {suggestion}
                  </Text>
                  {onSuggestionApply && (
                    <Button
                      type="link"
                      size="small"
                      onClick={() => onSuggestionApply(suggestion)}
                      style={{ padding: 0, marginLeft: 8 }}
                    >
                      Appliquer
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </Space>
        </div>
      )}

      {/* 🎯 Mots-clés détectés */}
      {keywordDetections.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <Title level={5} style={{ marginBottom: 12 }}>
            <ThunderboltOutlined style={{ color: '#ff7a45' }} />
            <span style={{ marginLeft: 8 }}>Mots-clés détectés</span>
          </Title>
          
          <Space wrap>
            {keywordDetections.slice(0, 8).map((keyword, index) => (
              <Tag 
                key={index}
                color="orange"
                style={{ marginBottom: 4 }}
              >
                {keyword.keyword} ({keyword.count})
              </Tag>
            ))}
          </Space>
        </div>
      )}

      {/* 📝 Transcriptions récentes */}
      {recentTranscriptions.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <Title level={5} style={{ marginBottom: 12 }}>
            <SoundOutlined style={{ color: '#1890ff' }} />
            <span style={{ marginLeft: 8 }}>Transcription Live</span>
          </Title>
          
          <List
            size="small"
            dataSource={recentTranscriptions}
            renderItem={(trans) => (
              <List.Item style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Tag color={trans.speakerColor} size="small">
                      {trans.speakerLabel}
                    </Tag>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {trans.timeAgo}
                    </Text>
                  </div>
                  
                  <Text style={{ fontSize: 13 }}>
                    {trans.text}
                  </Text>
                  
                  {trans.confidence && (
                    <div style={{ marginTop: 4 }}>
                      <Progress
                        percent={Math.round(trans.confidence * 100)}
                        size="small"
                        showInfo={false}
                        strokeColor="#d9d9d9"
                      />
                    </div>
                  )}
                </div>
              </List.Item>
            )}
          />
        </div>
      )}

      {/* 📊 Statistiques détaillées */}
      {showDetailedAnalysis && transcriptionStats && (
        <div style={{ 
          marginTop: 20, 
          padding: 16, 
          backgroundColor: '#fafafa', 
          borderRadius: 8,
          border: '1px solid #e8e8e8' 
        }}>
          <Title level={5} style={{ marginBottom: 16 }}>
            📊 Statistiques de l'appel
          </Title>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
            gap: 16 
          }}>
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary">Transcriptions</Text>
              <div>
                <Text strong style={{ fontSize: 18, color: '#1890ff' }}>
                  {transcriptionStats.totalTranscriptions}
                </Text>
              </div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary">Agent</Text>
              <div>
                <Text strong style={{ fontSize: 18, color: '#1890ff' }}>
                  {transcriptionStats.agentMessages}
                </Text>
              </div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary">Prospect</Text>
              <div>
                <Text strong style={{ fontSize: 18, color: '#52c41a' }}>
                  {transcriptionStats.prospectMessages}
                </Text>
              </div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary">Mots</Text>
              <div>
                <Text strong style={{ fontSize: 18, color: '#722ed1' }}>
                  {transcriptionStats.wordCount}
                </Text>
              </div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary">Précision</Text>
              <div>
                <Text strong style={{ fontSize: 18, color: '#fadb14' }}>
                  {transcriptionStats.avgConfidence}%
                </Text>
              </div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary">Mots-clés</Text>
              <div>
                <Text strong style={{ fontSize: 18, color: '#ff7a45' }}>
                  {transcriptionStats.keywordsDetected}
                </Text>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🎤 État microphone */}
      <div style={{ 
        marginTop: 16, 
        textAlign: 'center',
        padding: 12,
        backgroundColor: transcriptionState.isActive ? '#f6ffed' : '#fff2e8',
        borderRadius: 6,
        border: `1px solid ${transcriptionState.isActive ? '#b7eb8f' : '#ffd591'}`
      }}>
        <Space>
          {transcriptionState.isActive ? (
            <SoundOutlined style={{ color: '#52c41a' }} />
          ) : (
            <MutedOutlined style={{ color: '#faad14' }} />
          )}
          
          <Text style={{ 
            color: transcriptionState.isActive ? '#52c41a' : '#faad14',
            fontWeight: 500
          }}>
            {transcriptionState.isActive 
              ? 'Analyse vocale active' 
              : 'Analyse vocale en pause'
            }
          </Text>
        </Space>
      </div>

    </Card>
  );
};

export default VoiceAnalysisPanel;
