/**
 * 📞 TYPES CALLMODULE RÉVOLUTIONNAIRE
 * 
 * Définitions TypeScript pour le module d'appel avec IA intégrée
 */

import type { Lead } from '../../../types/leads';
import type { Dayjs } from 'dayjs';

// ===== CALL STATUS =====
export interface CallStatus {
  id: string;
  name: string;
  color: string;
  description: string;
  icon?: string;
}

export type CallStatusType = 
  | 'answered' 
  | 'no_answer' 
  | 'busy' 
  | 'voicemail' 
  | 'meeting_scheduled' 
  | 'refused' 
  | 'callback';

// ===== CALL STATE =====
export interface CallState {
  isInProgress: boolean;
  startTime: Date | null;
  duration: number; // en secondes
  status: CallStatusType | '';
  notes: string;
  isFormValid: boolean;
}

// ===== TELNYX INTEGRATION =====
export interface TelnyxCallData {
  callId: string;
  to: string;
  from: string;
  status: 'ringing' | 'answered' | 'busy' | 'no_answer' | 'completed';
  duration?: number;
  recordingUrl?: string;
}

export interface TelnyxResponse {
  success: boolean;
  callId?: string;
  error?: string;
  data?: TelnyxCallData;
}

// ===== AI ANALYSIS =====
export interface AIAnalysisResult {
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number; // 0-100
  interestLevel: number; // 0-100
  objections: string[];
  opportunities: string[];
  nextActions: string[];
  recommendedApproach: string;
  emotionalState: 'excited' | 'hesitant' | 'interested' | 'resistant' | 'neutral';
  keyTopics: string[];
  timeline?: {
    urgency: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
    decisionDate?: string;
  };
}

// ===== CODE ANALYSIS (UI/UX/Qualité) =====
export interface CodePageAnalysis {
  path: string;
  lines: number;
  hooks: { total: number; useEffect: number; custom: string[] };
  antd: string[];
  i18n: boolean;
  tailwind: boolean;
  complexity: string[];
  suggestions: string[];
  score: number;
}
export interface CodeFeatureSummary {
  feature: string;
  fileCount: number;
  totalLines: number;
  avgLines: number;
  totalHooks: number;
  i18nCoverage: number;
  antdUsageRate: number;
  tailwindUsageRate: number;
}
export interface CodeAutoAnalysis {
  page?: CodePageAnalysis;
  feature?: CodeFeatureSummary;
  truncated?: boolean;
  size?: number;
  excerpt?: string;
}

// ===== GLOBAL CODE ANALYSIS (agrégée via /ai/code/analyze/batch) =====
export interface CodeBatchItemSummary {
  path: string;
  lines: number;
  hooks: { total: number; useEffect: number; custom: string[] };
  jsxStructure?: { maxDepth: number; tagCount: number; densityPer100Lines: number } | null;
  i18n?: boolean;
  antdComponents?: string[];
}

export interface GlobalCodeAnalysis {
  fileCount: number;
  totalLines: number;
  avgLines: number;
  totalHooks: number;
  i18nCoverage: number; // 0..1
  antdUsageRate: number; // 0..1
  tailwindUsageRate?: number; // optionnel si calculé ailleurs
  topComplexitySignals: string[];
  topFiles: Array<{ path: string; lines: number }>;
}

export interface VoiceTranscription {
  id: string;
  text: string;
  confidence: number;
  timestamp: Date;
  speaker?: SpeakerDetection;
  duration: number;
  language: string;
}

// Types pour l'analyse vocale avancée
export interface TranscriptionState {
  isActive: boolean;
  isListening: boolean;
  currentText: string;
  transcriptionHistory: VoiceTranscription[];
  currentSpeaker: SpeakerDetection | null;
  confidence: number;
  wordCount: number;
  duration: number;
}

export interface VoiceAnalysis {
  sentiment: 'positive' | 'neutral' | 'negative';
  emotionalState: string;
  confidence: number;
  keyTopics: string[];
  urgencyLevel: number;
  interestLevel: number;
  objections: string[];
  opportunities: string[];
  nextActions: string[];
}

export interface SpeakerDetection {
  type: 'agent' | 'prospect' | 'unknown';
  confidence: number;
}

export interface KeywordDetection {
  keyword: string;
  confidence: number;
  timestamp: Date;
  context: string;
  category: 'positive' | 'negative' | 'neutral' | 'action';
}

export interface TranscriptionStats {
  totalTranscriptions: number;
  agentMessages: number;
  prospectMessages: number;
  avgConfidence: number;
  wordCount: number;
  duration: number;
  keywordsDetected: number;
}

// ===== AI CHAT ASSISTANT =====
export interface AIChatMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  message: string;
  timestamp: Date;
  suggestions?: string[];
  confidence?: number;
  actionable?: boolean;
  context?: {
    relatedToCall?: boolean;
    priority?: 'low' | 'medium' | 'high';
    category?: 'advice' | 'warning' | 'opportunity' | 'next_action';
  };
}

export interface AIAssistantContext {
  lead: Lead;
  callStatus: CallStatusType | '';
  callDuration: number;
  selectedDate?: Dayjs | null;
  recentTranscription: string;
  currentAnalysis?: AIAnalysisResult;
}

// ===== CALENDAR INTEGRATION =====
export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO date
  end: string; // ISO date
  color?: string;
  attendees?: Array<{
    email: string;
    displayName: string;
    responseStatus?: 'accepted' | 'declined' | 'tentative' | 'needsAction';
  }>;
  location?: string;
  description?: string;
  meetLink?: string;
}

export interface FreeSlot {
  start: string; // HH:mm format
  end: string; // HH:mm format
  duration: number; // minutes
  score?: number; // 0-100 AI score for optimal timing
  reason?: string; // AI explanation for the score
}

export interface MeetingDetails {
  title: string;
  duration: number; // minutes
  type: 'visio' | 'physique';
  description?: string;
  location?: string;
}

export interface AICalendarRecommendation {
  recommendedSlots: Array<{
    slot: string;
    reason: string;
    score: number;
    travelTime?: number; // minutes if physical meeting
    optimalForProspect?: boolean;
  }>;
  analysis: string;
  travelConsiderations: string[];
  prospectPreferences: string[];
  conflictWarnings?: string[];
  bestDayOfWeek?: {
    day: string;
    reason: string;
  };
}

// ===== COMPONENT PROPS =====
export interface CallModuleProps {
  leadId?: string;
  onClose?: () => void;
  mode?: 'standalone' | 'modal';
}

export interface LeadInfoPanelProps {
  lead: Lead;
  isCallInProgress: boolean;
}

export interface TelnyxInterfaceProps {
  lead: Lead;
  callState: CallState;
  onStartCall: () => Promise<void>;
  onEndCall: () => Promise<void>;
  isLoading?: boolean;
}

export interface AIAssistantChatProps {
  messages: AIChatMessage[];
  onSendMessage: (message: string) => Promise<void>;
  context: AIAssistantContext;
  isLoading?: boolean;
  currentAnalysis?: AIAnalysisResult;
}

export interface SmartCalendarProps {
  selectedDate: Dayjs | null;
  selectedTime: Dayjs | null;
  onDateChange: (date: Dayjs | null) => void;
  onTimeSelect: (time: Dayjs) => void;
  meetingDetails: MeetingDetails;
  onMeetingDetailsChange: (details: Partial<MeetingDetails>) => void;
  availableSlots: FreeSlot[];
  existingEvents: CalendarEvent[];
  aiRecommendations?: AICalendarRecommendation;
  isLoading?: boolean;
}

export interface VoiceAnalysisPanelProps {
  transcription: VoiceTranscription[];
  currentAnalysis?: AIAnalysisResult;
  isListening: boolean;
  onToggleListening: () => void;
  confidence?: number;
}

export interface CallNotesFormProps {
  notes: string;
  onNotesChange: (notes: string) => void;
  callStatus: CallStatusType | '';
  onStatusChange: (status: CallStatusType) => void;
  availableStatuses: CallStatus[];
  isFormValid: boolean;
  currentAnalysis?: AIAnalysisResult;
}

// ===== API RESPONSES =====
export interface GoogleCalendarResponse {
  events: CalendarEvent[];
  freeSlots: FreeSlot[];
  nextSyncToken?: string;
}

export interface AIAnalysisResponse {
  analysis: AIAnalysisResult;
  recommendations: string[];
  nextActions: string[];
  confidence: number;
}

export interface CallSaveResponse {
  success: boolean;
  callId: string;
  leadUpdated: boolean;
  calendarEventId?: string;
  emailSent?: boolean;
}

// ===== HOOKS RETURN TYPES =====
export interface UseCallLogicReturn {
  callState: CallState;
  startCall: () => Promise<void>;
  endCall: () => Promise<void>;
  updateNotes: (notes: string) => void;
  updateStatus: (status: CallStatusType) => void;
  formatDuration: (seconds: number) => string;
  isLoading: boolean;
  error?: string;
}

export interface UseAIAssistantReturn {
  messages: AIChatMessage[];
  sendMessage: (message: string) => Promise<void>;
  currentAnalysis: AIAnalysisResult | null;
  isAnalyzing: boolean;
  isLoading: boolean;
  isListening: boolean;
  startListening: () => void;
  getSuggestions: (ctx: SuggestionContext) => Promise<string[]>;
  clearChat: () => void;
  analysisLoading: boolean;
  codeAnalysis?: CodeAutoAnalysis | null;
  // Actions d'analyse pilotées par l'IA Coach
  analyzeCurrentPage?: () => Promise<void>;
  analyzeCurrentFeature?: () => Promise<void>;
  analyzeWorkspaceQuick?: () => Promise<void>;
  globalAnalysis?: GlobalCodeAnalysis | null;
}

export interface UseGoogleCalendarReturn {
  selectedDate: Dayjs | null;
  selectedTime: Dayjs | null;
  availableSlots: FreeSlot[];
  existingEvents: CalendarEvent[];
  meetingDetails: MeetingDetails;
  aiRecommendations: AICalendarRecommendation | null;
  setSelectedDate: (date: Dayjs | null) => void;
  setSelectedTime: (time: Dayjs | null) => void;
  updateMeetingDetails: (details: Partial<MeetingDetails>) => void;
  createCalendarEvent: () => Promise<boolean>;
  fetchAvailableSlots: (date: Dayjs) => Promise<void>;
  fetchCalendarEvents: (date: Dayjs) => Promise<void>;
  isLoading: boolean;
}

export interface UseVoiceTranscriptionReturn {
  transcriptionState: TranscriptionState;
  voiceAnalysis: VoiceAnalysis | null;
  keywordDetections: KeywordDetection[];
  startTranscription: () => Promise<void>;
  stopTranscription: () => void;
  toggleTranscription: () => void;
  transcriptionStats: TranscriptionStats;
  isLoading: boolean;
  error?: string;
}

// ===== CONSTANTS =====
export const CALL_STATUSES: CallStatus[] = [
  { 
    id: 'answered', 
    name: '✅ Répondu', 
    color: 'green', 
    description: 'Contact établi avec succès',
    icon: '✅'
  },
  { 
    id: 'no_answer', 
    name: '📵 Pas de réponse', 
    color: 'orange', 
    description: 'Aucune réponse obtenue',
    icon: '📵'
  },
  { 
    id: 'busy', 
    name: '📞 Occupé', 
    color: 'red', 
    description: 'Ligne occupée',
    icon: '📞'
  },
  { 
    id: 'voicemail', 
    name: '📧 Répondeur', 
    color: 'blue', 
    description: 'Message laissé sur répondeur',
    icon: '📧'
  },
  { 
    id: 'meeting_scheduled', 
    name: '📅 RDV fixé', 
    color: 'purple', 
    description: 'Rendez-vous planifié',
    icon: '📅'
  },
  { 
    id: 'refused', 
    name: '❌ Refusé', 
    color: 'red', 
    description: 'Prospect a refusé',
    icon: '❌'
  },
  { 
    id: 'callback', 
    name: '🔄 Rappeler', 
    color: 'orange', 
    description: 'Demande de rappel',
    icon: '🔄'
  }
];

export default {};
