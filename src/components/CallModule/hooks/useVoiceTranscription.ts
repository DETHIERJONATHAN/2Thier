/**
 * 🎙️ useVoiceTranscription - Hook pour la transcription vocale en temps réel
 * 
 * Fonctionnalités avancées :
 * - 🎤 Transcription live pendant l'appel
 * - 🗣️ Détection du locuteur (agent/prospect)
 * - 🧠 Analyse sentiment temps réel
 * - 📝 Génération automatique de notes
 * - 🎯 Détection de mots-clés importants
 * - 🔄 Synchronisation avec l'IA assistant
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useAuthenticatedApi } from '../../../hooks/useAuthenticatedApi';
import { NotificationManager } from '../../../components/Notifications';
import type { 
  UseVoiceTranscriptionReturn,
  VoiceTranscription,
  TranscriptionState,
  VoiceAnalysis,
  SpeakerDetection,
  KeywordDetection,
  Lead
} from '../types/CallTypes';
import { logger } from '../../../lib/logger';

// Types pour Speech Recognition API
declare global {
  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    start(): void;
    stop(): void;
    onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
    onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  }

  interface SpeechRecognitionEvent extends Event {
    resultIndex: number;
    results: SpeechRecognitionResultList;
  }

  interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message: string;
  }

  interface SpeechRecognitionResultList {
    length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
  }

  interface SpeechRecognitionResult {
    length: number;
    isFinal: boolean;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
  }

  interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
  }

  var SpeechRecognition: {
    prototype: SpeechRecognition;
    new(): SpeechRecognition;
  };

  var webkitSpeechRecognition: {
    prototype: SpeechRecognition;
    new(): SpeechRecognition;
  };
}

// Type pour le stream avec timer
interface MediaStreamWithTimer extends MediaStream {
  timer?: NodeJS.Timeout;
}

export const useVoiceTranscription = (
  leadId: string,
  lead: Lead | null,
  callInProgress: boolean = false,
  onTranscriptionUpdate?: (transcription: VoiceTranscription) => void
): UseVoiceTranscriptionReturn => {
  
  const { api } = useAuthenticatedApi();
  const streamRef = useRef<MediaStreamWithTimer | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  // 🎙️ État principal de la transcription
  const [transcriptionState, setTranscriptionState] = useState<TranscriptionState>({
    isActive: false,
    isListening: false,
    currentText: '',
    transcriptionHistory: [],
    currentSpeaker: null,
    confidence: 0,
    wordCount: 0,
    duration: 0
  });
  
  const [voiceAnalysis, setVoiceAnalysis] = useState<VoiceAnalysis | null>(null);
  const [keywordDetections, setKeywordDetections] = useState<KeywordDetection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  
  // 🗣️ Détection basique du locuteur (à améliorer avec IA)
  const detectSpeaker = useCallback((transcript: string): SpeakerDetection => {
    // Mots-clés agent commercial
    const agentKeywords = [
      'bonjour', 'madame', 'monsieur', 'société', 'proposition', 'offre',
      'rendez-vous', 'rdv', 'présenter', 'expliquer', 'service', 'solution'
    ];
    
    // Mots-clés prospect
    const prospectKeywords = [
      'intéressé', 'prix', 'tarif', 'budget', 'réfléchir', 'collègues',
      'décision', 'patron', 'déjà', 'actuellement', 'satisfait'
    ];
    
    const lowerTranscript = transcript.toLowerCase();
    const agentScore = agentKeywords.filter(word => lowerTranscript.includes(word)).length;
    const prospectScore = prospectKeywords.filter(word => lowerTranscript.includes(word)).length;
    
    if (agentScore > prospectScore) {
      return {
        type: 'agent',
        confidence: Math.min(0.9, 0.5 + (agentScore * 0.1))
      };
    } else if (prospectScore > agentScore) {
      return {
        type: 'prospect',
        confidence: Math.min(0.9, 0.5 + (prospectScore * 0.1))
      };
    } else {
      return {
        type: 'unknown',
        confidence: 0.3
      };
    }
  }, []);
  
  // 🧠 Analyser le contenu avec l'IA
  const analyzeTranscriptContent = useCallback(async (
    transcription: VoiceTranscription
  ): Promise<void> => {
    try {
      const response = await api.post<{
        analysis: VoiceAnalysis;
        keywords: KeywordDetection[];
        sentiment: 'positive' | 'neutral' | 'negative';
        recommendations: string[];
      }>('/api/ai/analyze-voice-content', {
        transcription,
        leadId: leadId,
        leadData: lead?.data,
        conversationContext: transcriptionState.transcriptionHistory.slice(-5)
      });
      
      if (response.analysis) {
        setVoiceAnalysis(response.analysis);
        
        // Ajouter les nouveaux mots-clés détectés
        if (response.keywords) {
          setKeywordDetections(prev => [...prev, ...response.keywords]);
        }
        
        logger.debug('[useVoiceTranscription] 🧠 Analyse IA terminée - Sentiment:', response.sentiment);
      }
      
    } catch (error: unknown) {
      logger.warn('[useVoiceTranscription] ⚠️ Erreur analyse contenu:', error);
    }
  }, [api, leadId, lead, transcriptionState.transcriptionHistory]);
  
  // 📝 Traiter une transcription finale
  const processFinalTranscription = useCallback(async (
    transcript: string,
    confidence: number
  ): Promise<void> => {
    if (transcript.trim().length < 3) return;
    
    const transcriptionEntry: VoiceTranscription = {
      id: `transcription_${Date.now()}`,
      text: transcript.trim(),
      timestamp: new Date(),
      speaker: detectSpeaker(transcript), // Détection basique du locuteur
      confidence: confidence || 0.8,
      duration: 0, // Calculé côté serveur
      language: 'fr-FR'
    };
    
    // Ajouter à l'historique
    setTranscriptionState(prev => ({
      ...prev,
      transcriptionHistory: [...prev.transcriptionHistory, transcriptionEntry],
      currentText: '',
      wordCount: prev.wordCount + transcript.split(' ').length
    }));
    
    // Notifier le parent
    onTranscriptionUpdate?.(transcriptionEntry);
    
    // Analyser le contenu avec l'IA
    try {
      await analyzeTranscriptContent(transcriptionEntry);
    } catch (error) {
      logger.warn('[useVoiceTranscription] ⚠️ Erreur analyse IA:', error);
    }
  }, [onTranscriptionUpdate, analyzeTranscriptContent, detectSpeaker]);
  
  // 🎤 Initialiser la reconnaissance vocale Web Speech API
  const initializeSpeechRecognition = useCallback((): boolean => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Reconnaissance vocale non supportée par ce navigateur');
      NotificationManager.error('Reconnaissance vocale non supportée');
      return false;
    }
    
    try {
      const SpeechRecognition = (window as { webkitSpeechRecognition?: unknown; SpeechRecognition?: unknown })
        .webkitSpeechRecognition || (window as { SpeechRecognition?: unknown }).SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      // Configuration de base
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'fr-FR';
      recognition.maxAlternatives = 3;
      
      // Événements de reconnaissance
      recognition.onstart = () => {
        logger.debug('[useVoiceTranscription] 🎤 Reconnaissance vocale démarrée');
        setTranscriptionState(prev => ({ ...prev, isListening: true }));
      };
      
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          const confidence = event.results[i][0].confidence;
          
          if (event.results[i].isFinal) {
            // Traiter la transcription finale
            processFinalTranscription(transcript, confidence);
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Mettre à jour le texte courant
        setTranscriptionState(prev => ({
          ...prev,
          currentText: interimTranscript,
          confidence: event.results[event.results.length - 1]?.[0]?.confidence || 0
        }));
      };
      
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        logger.error('[useVoiceTranscription] ❌ Erreur reconnaissance:', event.error);
        if (event.error === 'no-speech') {
          // Pas de problème, pas de parole détectée
          return;
        }
        setError(`Erreur reconnaissance vocale: ${event.error}`);
      };
      
      recognition.onend = () => {
        logger.debug('[useVoiceTranscription] 🔚 Reconnaissance vocale terminée');
        setTranscriptionState(prev => ({ ...prev, isListening: false }));
        
        // Redémarrer automatiquement si toujours actif
        if (transcriptionState.isActive && callInProgress) {
          setTimeout(() => {
            recognition.start();
          }, 100);
        }
      };
      
      recognitionRef.current = recognition;
      return true;
      
    } catch (error: unknown) {
      logger.error('[useVoiceTranscription] ❌ Erreur initialisation:', error);
      setError('Impossible d\'initialiser la reconnaissance vocale');
      return false;
    }
  }, [transcriptionState.isActive, callInProgress, processFinalTranscription]);
  
  // 🎤 Démarrer la transcription
  const startTranscription = useCallback(async (): Promise<void> => {
    if (!callInProgress) {
      NotificationManager.warning('Démarrez un appel pour activer la transcription');
      return;
    }
    
    setIsLoading(true);
    setError(undefined);
    
    try {
      // Demander permission microphone
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      streamRef.current = stream;
      
      // Initialiser la reconnaissance vocale
      if (initializeSpeechRecognition()) {
        recognitionRef.current?.start();
        
        setTranscriptionState(prev => ({
          ...prev,
          isActive: true,
          transcriptionHistory: [],
          wordCount: 0,
          duration: 0
        }));
        
        // Démarrer le timer
        const startTime = Date.now();
        const timer = setInterval(() => {
          setTranscriptionState(prev => ({
            ...prev,
            duration: Math.floor((Date.now() - startTime) / 1000)
          }));
        }, 1000);
        
        // Sauvegarder le timer pour le cleanup
        if (streamRef.current) {
          streamRef.current.timer = timer;
        }
        
        logger.debug('[useVoiceTranscription] ✅ Transcription démarrée');
        NotificationManager.success('🎤 Transcription vocale activée');
      }
      
    } catch (error: unknown) {
      logger.error('[useVoiceTranscription] ❌ Erreur démarrage:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur d\'accès au microphone';
      setError(errorMessage);
      NotificationManager.error('Impossible d\'accéder au microphone');
      
    } finally {
      setIsLoading(false);
    }
  }, [callInProgress, initializeSpeechRecognition]);
  
  // 🛑 Arrêter la transcription
  const stopTranscription = useCallback((): void => {
    try {
      // Arrêter la reconnaissance
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      
      // Arrêter le stream microphone
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        
        // Arrêter le timer
        if (streamRef.current?.timer) {
          clearInterval(streamRef.current.timer);
        }
        
        streamRef.current = null;
      }
      
      setTranscriptionState(prev => ({
        ...prev,
        isActive: false,
        isListening: false,
        currentText: ''
      }));
      
      logger.debug('[useVoiceTranscription] 🛑 Transcription arrêtée');
      NotificationManager.info('Transcription vocale arrêtée');
      
    } catch (error: unknown) {
      logger.error('[useVoiceTranscription] ❌ Erreur arrêt:', error);
    }
  }, []);
  
  // 🔄 Toggle transcription
  const toggleTranscription = useCallback((): void => {
    if (transcriptionState.isActive) {
      stopTranscription();
    } else {
      startTranscription();
    }
  }, [transcriptionState.isActive, stopTranscription, startTranscription]);
  
  // 📊 Statistiques de transcription
  const transcriptionStats = useMemo(() => {
    const totalTranscriptions = transcriptionState.transcriptionHistory.length;
    const agentMessages = transcriptionState.transcriptionHistory.filter(
      t => t.speaker?.type === 'agent'
    ).length;
    const prospectMessages = transcriptionState.transcriptionHistory.filter(
      t => t.speaker?.type === 'prospect'
    ).length;
    
    const avgConfidence = transcriptionState.transcriptionHistory.length > 0
      ? transcriptionState.transcriptionHistory.reduce((acc, t) => acc + t.confidence, 0) / totalTranscriptions
      : 0;
    
    return {
      totalTranscriptions,
      agentMessages,
      prospectMessages,
      avgConfidence: Math.round(avgConfidence * 100),
      wordCount: transcriptionState.wordCount,
      duration: transcriptionState.duration,
      keywordsDetected: keywordDetections.length
    };
  }, [transcriptionState, keywordDetections]);
  
  // 🧹 Cleanup lors du démontage
  useEffect(() => {
    return () => {
      if (transcriptionState.isActive) {
        stopTranscription();
      }
    };
  }, [transcriptionState.isActive, stopTranscription]);
  
  // 🔄 Auto-arrêt si l'appel se termine
  useEffect(() => {
    if (!callInProgress && transcriptionState.isActive) {
      stopTranscription();
    }
  }, [callInProgress, transcriptionState.isActive, stopTranscription]);
  
  // 🎯 Retour du hook avec toutes les fonctionnalités
  const returnValue: UseVoiceTranscriptionReturn = useMemo(() => ({
    transcriptionState,
    voiceAnalysis,
    keywordDetections,
    startTranscription,
    stopTranscription,
    toggleTranscription,
    transcriptionStats,
    isLoading,
    error
  }), [
    transcriptionState,
    voiceAnalysis,
    keywordDetections,
    startTranscription,
    stopTranscription,
    toggleTranscription,
    transcriptionStats,
    isLoading,
    error
  ]);
  
  return returnValue;
};

export default useVoiceTranscription;
