# 🏷️ GUIDE NOMENCLATURE & CONVENTIONS CRM

## 📋 CONVENTIONS DE NOMMAGE OFFICIELLES

### 🎯 Objectif
Établir une **nomenclature cohérente et intuitive** pour maintenir la qualité du code et faciliter la collaboration en équipe.

---

## 📁 NOMENCLATURE DOSSIERS

### 🗂️ **Structure par type :**

```bash
# ✅ CORRECT - Organisation par fonctionnalité
src/
├── components/CallModule/        # Module fonctionnel
├── components/LeadsModule/       # Module fonctionnel
├── hooks/                        # Hooks globaux
├── services/                     # Services métier
├── api/                          # APIs externes
├── utils/                        # Utilitaires
└── types/                        # Types TypeScript

# ❌ INCORRECT - Mélange incohérent
src/
├── callModule/                   # camelCase incorrect
├── Leads-Module/                 # kebab-case incorrect  
├── HOOKS/                        # UPPERCASE incorrect
```

### 🎨 **Règles dossiers composants :**

```bash
# ✅ Format : PascalCase + suffixe descriptif
components/
├── CallModule/                   # Module principal
├── LeadsModule/                  # Module principal
├── AIAssistantChat/              # Composant spécialisé
├── SmartCalendar/                # Composant intelligent
└── VoiceAnalysisPanel/           # Panneau d'analyse

# Structure interne standardisée :
CallModule/
├── CallModule.tsx                # Composant principal
├── hooks/                        # Hooks spécifiques
├── components/                   # Sous-composants
├── services/                     # Services dédiés
└── types/                        # Types locaux
```

---

## 📄 NOMENCLATURE FICHIERS

### 🎯 **Composants React :**

| Type | Pattern | Exemple | Description |
|------|---------|---------|-------------|
| **Module principal** | `[Module].tsx` | `CallModule.tsx` | Point d'entrée module |
| **Composant UI** | `[Descriptif].tsx` | `AIAssistantChat.tsx` | Interface utilisateur |
| **Panneau/Section** | `[Name]Panel.tsx` | `VoiceAnalysisPanel.tsx` | Section d'interface |
| **Formulaire** | `[Name]Form.tsx` | `CallNotesForm.tsx` | Formulaires |
| **Modal/Dialog** | `[Name]Modal.tsx` | `MeetingScheduleModal.tsx` | Fenêtres modales |

### 🎣 **Hooks :**

| Pattern | Exemple | Usage |
|---------|---------|-------|
| `use[Functionnality].ts` | `useCallLogic.ts` | Logique métier |
| `use[Service].ts` | `useGoogleCalendar.ts` | Intégration service |
| `use[AI][Feature].ts` | `useAIAssistant.ts` | Fonctionnalités IA |
| `use[Data]Logic.ts` | `useLeadsLogic.ts` | Gestion données |

### 🛠️ **Services :**

| Pattern | Exemple | Responsabilité |
|---------|---------|----------------|
| `[Domain]Service.ts` | `CalendarService.ts` | Service métier |
| `AI[Feature]Engine.ts` | `VoiceAnalysisEngine.ts` | Moteur IA |
| `[External]Integration.ts` | `TelnyxIntegration.ts` | Intégration externe |

### 🔌 **APIs :**

| Pattern | Exemple | Type |
|---------|---------|------|
| `[resource].ts` | `calendar.ts` | Ressource REST |
| `[service]Auth.ts` | `googleAuth.ts` | Authentification |
| `[service]Webhooks.ts` | `telnyxWebhooks.ts` | Webhooks |

---

## 🏷️ PRÉFIXES SÉMANTIQUES

### 🤖 **Intelligence Artificielle :**

```typescript
// Composants IA
AIAssistantChat.tsx           // Chat IA
AIRecommendationsPanel.tsx    // Recommandations
VoiceAnalysisEngine.ts        // Analyse vocale

// Hooks IA  
useAIAssistant.ts            // Assistant IA
useAIAnalysis.ts             // Analyse IA
useVoiceTranscription.ts     // Transcription

// Services IA
AIOrchestrator.ts            // Orchestrateur principal
ConversationalAI.ts          // IA conversationnelle
RecommendationEngine.ts      // Moteur recommandations
```

### 📅 **Calendrier & Planning :**

```typescript
// Composants calendrier
SmartCalendar.tsx            // Calendrier intelligent
CalendarEventCard.tsx        // Carte événement
MeetingScheduler.tsx         // Planificateur RDV

// Services calendrier
CalendarService.ts           // Service Google Calendar
CalendarIntelligence.ts      // IA calendrier
EventManagement.ts           // Gestion événements
```

### 📞 **Appels & Communication :**

```typescript
// Composants appels
TelnyxInterface.tsx          // Interface Telnyx
CallControlPanel.tsx         // Panneau contrôle
CallHistoryList.tsx          // Historique appels

// Hooks appels
useCallLogic.ts              // Logique appels
useTelnyxIntegration.ts      // Intégration Telnyx
useCallRecording.ts          // Enregistrement
```

---

## 🎨 CONVENTIONS CODE

### 📝 **Variables et fonctions :**

```typescript
// ✅ CORRECT - camelCase descriptif
const callInProgress = true;
const selectedDateTime = dayjs();
const aiAnalysisResult = await analyzeCall();

const handleStartCall = () => {};
const fetchCalendarEvents = async () => {};
const generateAIRecommendations = () => {};

// ❌ INCORRECT
const call_in_progress = true;      // snake_case
const CallInProgress = true;        // PascalCase pour variable
const selecteddt = dayjs();         // Abréviation confuse
```

### 🏗️ **Interfaces et Types :**

```typescript
// ✅ CORRECT - PascalCase + Interface/Type
interface CallModuleProps {
  leadId?: string;
  onClose?: () => void;
}

type AIAnalysisResult = {
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
}

type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
}

// ❌ INCORRECT
interface callModuleProps { }       // camelCase incorrect
type aiAnalysisresult = { }         // Manque majuscule
```

### 🎯 **Constantes :**

```typescript
// ✅ CORRECT - UPPER_SNAKE_CASE
const CALL_STATUSES = {
  ANSWERED: 'answered',
  NO_ANSWER: 'no_answer',
  BUSY: 'busy'
} as const;

const AI_CONFIDENCE_THRESHOLD = 0.85;
const MAX_CALL_DURATION_MINUTES = 120;

// ❌ INCORRECT
const callStatuses = { };           // camelCase pour constante
const AI_confidence_threshold = 0.85; // Mélange conventions
```

---

## 📊 ORGANISATION IMPORTS

### 🎯 **Ordre standardisé :**

```typescript
// 1. ✅ React et dépendances externes
import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Space } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

// 2. ✅ Hooks internes (du plus général au plus spécifique)
import { useAuthenticatedApi } from '../../hooks/useAuthenticatedApi';
import { useAuth } from '../../auth/useAuth';
import { useCallLogic } from './hooks/useCallLogic';
import { useAIAssistant } from './hooks/useAIAssistant';

// 3. ✅ Composants internes
import { LeadInfoPanel } from './components/LeadInfoPanel';
import { TelnyxInterface } from './components/TelnyxInterface';
import { AIAssistantChat } from './components/AIAssistantChat';

// 4. ✅ Services
import { CalendarService } from './services/CalendarService';
import { AIAnalysisService } from './services/AIAnalysisService';

// 5. ✅ Types et interfaces
import type { Lead } from '../../types/leads';
import type { CallModuleProps } from './types/CallTypes';

// 6. ✅ Utilitaires et constantes
import { formatDuration } from '../../utils/formatters';
import { CALL_STATUSES } from './constants';
```

---

## 🎪 CONVENTIONS COMMENTAIRES

### 📝 **Documentation composants :**

```typescript
/**
 * 🤖 AIAssistantChat - Assistant IA conversationnel
 * 
 * Fonctionnalités :
 * - Chat temps réel avec IA
 * - Suggestions contextuelles
 * - Analyse sentiment prospect
 * - Recommandations actions
 * 
 * @param leadData - Données du lead en cours
 * @param callStatus - Statut actuel de l'appel
 * @param onSuggestionSelect - Callback sélection suggestion
 */
export const AIAssistantChat: React.FC<AIAssistantChatProps> = ({
  leadData,
  callStatus,
  onSuggestionSelect
}) => {
  // Implémentation...
}
```

### 🏷️ **Tags sémantiques :**

```typescript
// 🎯 État principal
const [callInProgress, setCallInProgress] = useState(false);

// 🤖 IA et analyse
const aiAnalysis = useAIAnalysis(voiceTranscription);

// 📅 Calendrier et planification
const { events, freeSlots } = useGoogleCalendar(selectedDate);

// 🔌 Intégrations externes
const telnyxStatus = useTelnyxIntegration();

// 🛠️ Utilitaires
const formattedDuration = formatDuration(callDuration);

// ⚠️ TODO: À implémenter
// TODO: Ajouter analyse émotionnelle avancée

// 🚨 FIXME: Bug à corriger
// FIXME: Problème synchronisation calendrier
```

---

## 🎯 VALIDATION ET CONTRÔLE QUALITÉ

### ✅ **Checklist nommage :**

- [ ] **Dossiers** : PascalCase pour modules, camelCase pour types
- [ ] **Fichiers** : Extension cohérente (.tsx, .ts)
- [ ] **Variables** : camelCase descriptif
- [ ] **Fonctions** : camelCase avec verbe d'action
- [ ] **Interfaces** : PascalCase + suffixe Props/Type
- [ ] **Constantes** : UPPER_SNAKE_CASE
- [ ] **Imports** : Ordre standardisé respecté
- [ ] **Commentaires** : Tags sémantiques utilisés

### 🛠️ **Outils de validation :**

```json
// .eslintrc.json - Règles nommage
{
  "rules": {
    "camelcase": ["error", { "properties": "always" }],
    "@typescript-eslint/naming-convention": [
      "error",
      { "selector": "interface", "format": ["PascalCase"] },
      { "selector": "typeAlias", "format": ["PascalCase"] }
    ]
  }
}
```

---

## 🚀 ÉVOLUTION DE LA NOMENCLATURE

Cette nomenclature **évoluera** avec le projet pour s'adapter aux nouveaux besoins tout en **maintenant la cohérence** existante.

**Toute modification** de ces conventions doit être **documentée** et **validée par l'équipe** ! 📚✨
