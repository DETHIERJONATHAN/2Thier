/**
 * 🤖 AIAssistantChat - Assistant IA vocal conversationnel
 * 
 * Fonctionnalités révolutionnaires :
 * - 🎙️ Reconnaissance vocale temps réel (Speech-to-Text)
 * - 🔊 Synthèse vocale (Text-to-Speech) 
 * - 💬 Chat conversationnel avec IA
 * - 🧠 Analyse contextuelle du prospect
 * - 💡 Suggestions intelligentes
 * - 🎯 Recommandations d'actions
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Card, 
  Space, 
  Button, 
  Input, 
  Typography, 
  Avatar, 
  Badge,
  Tooltip,
  Switch,
  Slider,
  Tag,
  Spin
} from 'antd';
import { 
  RobotOutlined,
  UserOutlined,
  AudioOutlined,
  AudioMutedOutlined,
  SoundOutlined,
  BulbOutlined,
  SendOutlined,
  CustomerServiceOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { useAIAssistant } from '../hooks/useAIAssistant';
import type { Lead, CallState } from '../types/CallTypes';
import { logger } from '../../../lib/logger';

const { TextArea } = Input;
const { Text } = Typography;

interface AIAssistantChatProps {
  lead: Lead;
  callState: CallState;
  callNotes: string;
  onNotesUpdate: (notes: string) => void;
  onSuggestionSelect: (suggestion: string) => void;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  isVoice?: boolean;
}

interface VoiceSettings {
  enabled: boolean;
  autoSpeak: boolean;
  volume: number;
  rate: number;
  voice: string;
}

export const AIAssistantChat: React.FC<AIAssistantChatProps> = ({
  lead,
  callState,
  callNotes,
  onSuggestionSelect
}) => {
  
  // 🎣 Hooks IA et transcription
  const { 
    messages: aiMessages,
    sendMessage: sendAIMessage,
    getSuggestions,
    isLoading: aiLoading,
    isListening,
  startListening
  } = useAIAssistant(lead, { callNotes });
  
  // 📝 États du chat
  const [currentInput, setCurrentInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const hasSeededContextRef = useRef(false);
  
  logger.debug('[AIAssistantChat] 📨 Messages de useAIAssistant:', aiMessages.length, aiMessages);
  
  // 🔊 États vocaux
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    enabled: true,
    autoSpeak: true,
    volume: 0.8,
    rate: 1.0,
    voice: 'fr-FR'
  });
  
  const [isSpeaking, setIsSpeaking] = useState(false);
  // (auto-open analysis supprimé)
  
  // 📚 Références
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // 🔊 Synthèse vocale pour faire parler l'IA
  const speakMessage = useCallback((text: string) => {
    if (!voiceSettings.enabled || !voiceSettings.autoSpeak || !synthesisRef.current) {
      return;
    }

    // Arrêter toute lecture en cours
    synthesisRef.current.cancel();
    
    // Créer l'énoncé vocal
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = voiceSettings.volume;
    utterance.rate = voiceSettings.rate;
    utterance.lang = 'fr-FR';
    
    // Événements de synthèse
    utterance.onstart = () => {
      setIsSpeaking(true);
      logger.debug('[AIAssistantChat] 🔊 Début de la synthèse vocale');
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
      logger.debug('[AIAssistantChat] 🔊 Fin de la synthèse vocale');
    };
    
    utterance.onerror = (error) => {
      setIsSpeaking(false);
      logger.error('[AIAssistantChat] Erreur synthèse vocale:', error);
    };
    
    // Sélectionner une voix française si disponible
    const voices = synthesisRef.current.getVoices();
    const frenchVoice = voices.find(voice => 
      voice.lang.startsWith('fr') || voice.name.toLowerCase().includes('french')
    );
    if (frenchVoice) {
      utterance.voice = frenchVoice;
    }
    
    // Lancer la synthèse
    synthesisRef.current.speak(utterance);
  }, [voiceSettings]);

  // 🔇 Arrêter la synthèse vocale
  const stopSpeaking = useCallback(() => {
    if (synthesisRef.current) {
      synthesisRef.current.cancel();
      setIsSpeaking(false);
    }
  }, []);
  
  // 🎙️ Initialisation des API vocales
  useEffect(() => {
    // Web Speech API - Synthèse vocale
    if ('speechSynthesis' in window) {
      synthesisRef.current = window.speechSynthesis;
      
      const loadVoices = () => {
        const voices = synthesisRef.current!.getVoices();
        // Garder seulement les voix françaises ou les premières disponibles
        logger.debug('[AIAssistantChat] 🔊 Voix disponibles:', voices.length);
      };
      
      loadVoices();
      synthesisRef.current.onvoiceschanged = loadVoices;
    }
    
    return () => {
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
    };
  }, []);
  
  // 🎯 Scroll automatique vers le bas
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [aiMessages]);

  // (Analyse code retirée de ce module)
  
  // Supprimer la gestion manuelle de transcript car intégrée dans useAIAssistant
  
  // 🧠 Analyse contextuelle automatique
  const generateContextualSuggestions = useCallback(async () => {
    try {
      const newSuggestions = await getSuggestions({
        callDuration: callState.duration,
        callNotes,
        leadData: lead.data,
        conversationContext: aiMessages.slice(-3)
      });
      
      setSuggestions(newSuggestions.slice(0, 4)); // Max 4 suggestions
    } catch (error) {
      logger.warn('[AIAssistantChat] Erreur suggestions:', error);
    }
  }, [callState.duration, callNotes, lead.data, aiMessages, getSuggestions]);

  // (Suggestions Gmail liées à l'analyse supprimées ici)
  
  useEffect(() => {
    if (callState.isInProgress && callState.duration > 30) {
      generateContextualSuggestions();
    }
  }, [callState.isInProgress, callState.duration, generateContextualSuggestions]);
  
  // 🔊 Écouter les nouveaux messages IA pour la synthèse vocale
  useEffect(() => {
    const aiMessagesFiltered = aiMessages.filter(msg => msg.type === 'ai');
    if (aiMessagesFiltered.length > 0 && voiceSettings.autoSpeak) {
      const lastMessage = aiMessagesFiltered[aiMessagesFiltered.length - 1];
      // Éviter de relire le même message
      const messageAge = Date.now() - lastMessage.timestamp.getTime();
      if (messageAge < 5000) { // Message de moins de 5 secondes
        speakMessage(lastMessage.message);
      }
    }
  }, [aiMessages, voiceSettings.autoSpeak, speakMessage]);
  
  //  Envoyer message à l'IA
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;
    
    logger.debug('[AIAssistantChat] 💬 Envoi message:', content);
    
    setCurrentInput('');
    setIsTyping(true);
    
    try {
      // Utiliser directement le hook useAIAssistant pour envoyer le message
      await sendAIMessage(content);
      
      // Générer nouvelles suggestions
      generateContextualSuggestions();
      
    } catch (error) {
      logger.error('[AIAssistantChat] Erreur IA:', error);
    } finally {
      setIsTyping(false);
    }
  }, [sendAIMessage, generateContextualSuggestions]);

  
  // 🎙️ Toggle reconnaissance vocale
  const toggleVoiceRecognition = useCallback(() => {
    if (isListening) {
      // L'écoute se termine automatiquement après reconnaissance
      logger.debug('[AIAssistantChat] 🎤 Écoute en cours...');
    } else {
      startListening();
    }
  }, [isListening, startListening]);
  
  // 📤 Envoyer message via Enter
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(currentInput);
    }
  }, [currentInput, sendMessage]);
  
  // 💡 Utiliser suggestion
  const handleSuggestionClick = useCallback((suggestion: string) => {
    onSuggestionSelect(suggestion);
    sendMessage(`Utilise cette suggestion: ${suggestion}`);
  }, [onSuggestionSelect, sendMessage]);
  
  // 🎨 Conversion des messages IA vers format chat
  const chatMessages: ChatMessage[] = aiMessages.map(msg => ({
    id: msg.id,
    type: msg.type,
    content: msg.message,
    timestamp: msg.timestamp,
    isVoice: false
  }));
  
  logger.debug('[AIAssistantChat] 🎨 Messages convertis pour affichage:', chatMessages.length, chatMessages);
  
  return (
    <Card 
      title={
        <Space>
          <RobotOutlined style={{ color: '#1890ff' }} />
          <span>Assistant IA Vocal</span>
          <Badge 
            status={callState.isInProgress ? 'processing' : 'default'} 
            text={callState.isInProgress ? 'Actif' : 'Veille'}
          />
        </Space>
      }
      extra={
        <Space>
          <Tooltip title={voiceSettings.enabled ? 'Désactiver voix' : 'Activer voix'}>
            <Switch 
              checked={voiceSettings.enabled}
              onChange={(enabled) => setVoiceSettings(prev => ({ ...prev, enabled }))}
              checkedChildren={<SoundOutlined />}
              unCheckedChildren={<AudioMutedOutlined />}
              size="small"
            />
          </Tooltip>
        </Space>
      }
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column', padding: 16 } }}
    >
      
      {/* 🎛️ Contrôles vocaux */}
      {voiceSettings.enabled && (
        <div style={{ 
          marginBottom: 16, 
          padding: 12, 
          backgroundColor: '#fafafa', 
          borderRadius: 6 
        }}>
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            <Space>
              <Text type="secondary" style={{ fontSize: 12 }}>Volume:</Text>
              <Slider 
                min={0} 
                max={1} 
                step={0.1}
                value={voiceSettings.volume}
                onChange={(volume) => setVoiceSettings(prev => ({ ...prev, volume }))}
                style={{ width: 80 }}
                size="small"
              />
              <Text type="secondary" style={{ fontSize: 12 }}>Vitesse:</Text>
              <Slider 
                min={0.5} 
                max={2} 
                step={0.1}
                value={voiceSettings.rate}
                onChange={(rate) => setVoiceSettings(prev => ({ ...prev, rate }))}
                style={{ width: 80 }}
                size="small"
              />
            </Space>
            
            <Space>
              <Switch 
                checked={voiceSettings.autoSpeak}
                onChange={(autoSpeak) => setVoiceSettings(prev => ({ ...prev, autoSpeak }))}
                size="small"
              />
              <Text type="secondary" style={{ fontSize: 12 }}>Lecture automatique</Text>
              
              {isSpeaking && (
                <Badge status="processing" text="Parle..." />
              )}
              
              {/* Bouton pour arrêter la voix */}
              {isSpeaking && (
                <Button 
                  size="small" 
                  type="text" 
                  danger
                  onClick={stopSpeaking}
                  icon={<AudioMutedOutlined />}
                >
                  Stop
                </Button>
              )}
            </Space>
          </Space>
        </div>
      )}

  {/* (Audit global retiré de ce module) */}
      
      {/* 💬 Zone de chat */}
      <div 
        ref={chatContainerRef}
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          marginBottom: 16,
          maxHeight: 300
        }}
      >
        {/* Liste des messages */}
        {chatMessages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: '#666' }}>
            <RobotOutlined style={{ fontSize: 24, marginBottom: 8 }} />
            <div>Aucun message pour le moment</div>
            <div style={{ fontSize: 12 }}>Tapez votre message ou utilisez la voix</div>
          </div>
        ) : (
          <div>
            {chatMessages.map((message) => (
              <div key={message.id} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  {/* Avatar */}
                  <div>
                    {message.type === 'ai' ? 
                      <Avatar icon={<RobotOutlined />} style={{ backgroundColor: '#1890ff' }} /> :
                      message.type === 'user' ? 
                        <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#52c41a' }} /> :
                        <Avatar icon={<CustomerServiceOutlined />} style={{ backgroundColor: '#faad14' }} />
                    }
                  </div>
                  
                  {/* Contenu du message */}
                  <div style={{ flex: 1 }}>
                    {/* Header avec nom et timestamp */}
                    <div style={{ marginBottom: 4 }}>
                      <Text strong style={{ marginRight: 8 }}>
                        {message.type === 'ai' ? 'Assistant IA' :
                         message.type === 'user' ? 'Vous' : 'Système'}
                      </Text>
                      {message.isVoice && (
                        <Tag color="blue" size="small" style={{ marginRight: 4 }}>
                          <AudioOutlined /> Vocal
                        </Tag>
                      )}
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {message.timestamp.toLocaleTimeString()}
                      </Text>
                    </div>
                    
                    {/* Message content */}
                    <div style={{ 
                      backgroundColor: message.type === 'ai' ? '#f0f8ff' : 
                                     message.type === 'user' ? '#f6ffed' : '#fffbf0',
                      padding: 8,
                      borderRadius: 6,
                      border: '1px solid ' + (message.type === 'ai' ? '#d9f0ff' : 
                                                message.type === 'user' ? '#d9f7be' : '#fff1b8')
                    }}>
                      <Text>{message.content}</Text>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {isTyping && (
          <div style={{ textAlign: 'center', padding: 8 }}>
            <Spin size="small" />
            <Text type="secondary" style={{ marginLeft: 8 }}>
              L'IA réfléchit...
            </Text>
          </div>
        )}
      </div>

  {/* (Modal d'analyse retiré de ce module) */}
      
      {/* 💡 Suggestions intelligentes */}
      {suggestions.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary" style={{ fontSize: 12, marginBottom: 8 }}>
            <BulbOutlined /> Suggestions:
          </Text>
          <Space wrap style={{ marginTop: 4 }}>
            {suggestions.map((suggestion, index) => (
              <Tag 
                key={index}
                color="blue"
                style={{ cursor: 'pointer', fontSize: 11 }}
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <ThunderboltOutlined /> {suggestion}
              </Tag>
            ))}
          </Space>
        </div>
      )}
      
      {/* ✍️ Zone de saisie */}
      <div>
        <Space.Compact style={{ width: '100%' }}>
          <TextArea
            ref={inputRef}
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isListening ? 
              "🎙️ En écoute... Parlez maintenant !" : 
              "Tapez votre message ou utilisez la voix..."
            }
            rows={2}
            style={{ resize: 'none' }}
            disabled={aiLoading}
          />
        </Space.Compact>
        
        <Space style={{ marginTop: 8, width: '100%', justifyContent: 'space-between' }}>
          <Space>
            {/* Bouton reconnaissance vocale */}
            <Tooltip title={isListening ? 'Arrêter l\'écoute' : 'Parler à l\'IA'}>
              <Button
                icon={<AudioOutlined />}
                onClick={toggleVoiceRecognition}
                type={isListening ? 'primary' : 'default'}
                danger={isListening}
                loading={isListening}
                disabled={!voiceSettings.enabled}
                size="small"
              >
                {isListening ? 'Stop' : 'Parler'}
              </Button>
            </Tooltip>
            
            {/* Indicateur d'écoute vocale */}
            {isListening && (
              <Tag color="blue" size="small">
                🎤 Écoute...
              </Tag>
            )}
          </Space>
          
          {/* Bouton d'envoi */}
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={() => sendMessage(currentInput)}
            disabled={!currentInput.trim() || aiLoading}
            loading={aiLoading}
            size="small"
          >
            Envoyer
          </Button>
        </Space>
      </div>
      
    </Card>
  );
};

export default AIAssistantChat;
