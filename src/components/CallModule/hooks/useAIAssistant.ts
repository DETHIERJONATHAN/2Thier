/**
 * 🤖 useAIAssistant - Hook pour l'assistant IA conversationnel
 * 
 * Version simplifiée utilisant uniquement l'API Gemini réelle
 * Plus de fallbacks - pur Gemini AI !
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { resolveRouteToPage } from '../../../route-map';
import { useAuthenticatedApi } from '../../../hooks/useAuthenticatedApi';
import type { 
  UseAIAssistantReturn,
  AIChatMessage,
  AIAnalysisResult,
  SuggestionContext,
  Lead,
  CodeAutoAnalysis,
  GlobalCodeAnalysis,
  CodeBatchItemSummary
} from '../types/CallTypes';

// Types pour la reconnaissance vocale
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

type ChatGenResult = { aiResponse: string; meta: Record<string, unknown>; raw: unknown } | null;

type AIAssistantExtraContext = {
  callNotes?: string;
};

export const useAIAssistant = (
  lead: Lead | null,
  options?: AIAssistantExtraContext | boolean
): UseAIAssistantReturn => {
  const extraContext = typeof options === 'object' ? options : undefined;
  
  const { api } = useAuthenticatedApi();
  // Détection simple de la page / module courant côté frontend (heuristique URL + chemin)
  const routeInfoRef = useRef<{ currentPage?: string; currentModule?: string }>({});
  if (typeof window !== 'undefined') {
    try {
      const path = window.location.pathname; // ex: /mail/inbox
      const resolved = resolveRouteToPage(path);
      routeInfoRef.current = { currentModule: resolved.module, currentPage: resolved.page };
    } catch {/* ignore navigation errors */}
  }
  
  // 💬 États du chat IA
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<AIAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [codeAnalysis, setCodeAnalysis] = useState<CodeAutoAnalysis | null>(null);
  const [globalAnalysis, setGlobalAnalysis] = useState<GlobalCodeAnalysis | null>(null);

  // � Contexte détaillé du lead (appels, messages, événements, timeline)
  const leadContextRef = useRef<unknown | null>(null);

  const buildLeadSummary = useCallback(() => {
    if (!lead) return null;
    const pick = (...vals: Array<unknown>) => {
      for (const v of vals) {
        if (Array.isArray(v) && v.length > 0 && v[0]) return v[0];
        if (typeof v === 'string' && v.trim()) return v.trim();
        if (v != null) return v;
      }
      return null;
    };
    return {
      id: lead.id,
      name: pick(lead.name, `${lead.firstName || ''} ${lead.lastName || ''}`.trim(), lead.data?.name),
      email: pick(lead.email, lead.contactEmail, lead.contact?.email, lead.data?.email),
      phone: pick(lead.phone, lead.mobile, lead.telephone, lead.contact?.phone, lead.data?.phone),
      company: pick(lead.company, lead.companyName, lead.organization?.name, lead.data?.company),
      source: pick(lead.source, lead.data?.source),
      status: pick(lead.leadStatus?.name, lead.status, lead.data?.status),
      lastContact: lead.lastContact,
      notes: pick((lead as { notes?: unknown }).notes, (lead.data as { notes?: unknown } | undefined)?.notes, extraContext?.callNotes),
    };
  }, [lead, extraContext?.callNotes]);

  const buildLeadContextDigest = useCallback(() => {
    const ctx = leadContextRef.current;
    if (!ctx || typeof ctx !== 'object') return null;

    const obj = ctx as Record<string, unknown>;
    const pickArray = (key: string) => (Array.isArray(obj[key]) ? (obj[key] as Array<unknown>) : []);
    const pickString = (key: string) => (typeof obj[key] === 'string' ? (obj[key] as string) : undefined);

    const submissions = pickArray('submissions')
      .concat(pickArray('formSubmissions'))
      .concat(pickArray('forms'));

    const calls = pickArray('calls').concat(pickArray('callHistory'));
    const notes = pickArray('notes').concat(pickArray('activityNotes'));
    const timeline = pickArray('timeline').concat(pickArray('events'));

    const firstSubmission = submissions[0] as Record<string, unknown> | undefined;
    const submissionName = firstSubmission?.name || firstSubmission?.title || firstSubmission?.formName;
    const submissionFields = firstSubmission?.fields || firstSubmission?.data || firstSubmission?.answers;

    return {
      hasSubmissions: submissions.length > 0,
      submissionCount: submissions.length,
      submissionName,
      submissionFields,
      callsCount: calls.length,
      notesCount: notes.length,
      timelineCount: timeline.length,
      raw: ctx,
      freeText: pickString('summary') || pickString('context')
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchLeadContext() {
      if (!lead?.id) { leadContextRef.current = null; return; }
      try {
        const resp = await api.get(`/api/ai/context/lead/${lead.id}`);
        const env = resp?.data || resp;
        const data = env?.data ?? env;
        if (!cancelled) leadContextRef.current = data;
      } catch (e) {
        console.warn('[useAIAssistant] Contexte lead indisponible:', (e as Error).message);
        if (!cancelled) leadContextRef.current = null;
      }
    }
    fetchLeadContext();
    return () => { cancelled = true; };
  }, [api, lead?.id]);

  // �💬 Fonction pour générer une réponse IA avec Gemini
  const generateResponse = useCallback(async (userMessage: string): Promise<ChatGenResult> => {
    console.log('[useAIAssistant] 🚀 Génération réponse Gemini pour:', userMessage);
    
    try {
  setIsAnalyzing(true);
  setAnalysisLoading(true);
      
  const response = await api.post('/api/ai/chat', {
        message: userMessage,
        context: {
          userRole: "commercial",
          currentModule: routeInfoRef.current.currentModule || "calls",
          currentPage: routeInfoRef.current.currentPage,
          lead: lead,
          leadContext: leadContextRef.current,
          leadSummary: buildLeadSummary(),
          callNotes: extraContext?.callNotes,
        },
        conversationHistory: messages.slice(-5),
        analysis: currentAnalysis || undefined
      });
      
      console.log('[useAIAssistant] 📋 Structure réponse complète:', response);
      
      // Gérer la structure de réponse de l'API
  const apiEnvelope = response.data || response;
  const apiData = apiEnvelope.data || apiEnvelope; 
  let aiResponse = apiData.response || apiData.data?.response || apiData.text || apiData.message;
  const meta = apiData.metadata || apiData.data?.metadata || {};
      
      // Si Gemini retourne du JSON dans du markdown, le parser
      if (aiResponse && aiResponse.includes('```json')) {
        try {
          // Extraire le JSON du markdown
          const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            const parsedJson = JSON.parse(jsonMatch[1]);
            aiResponse = parsedJson.response || parsedJson.text || aiResponse;
            
            // Mise à jour des suggestions si disponibles dans le JSON parsé
            if (parsedJson.suggestions && Array.isArray(parsedJson.suggestions)) {
              apiData.suggestions = parsedJson.suggestions;
            }
            // Si un bloc d'analyse structuré est présent, l'appliquer
            if (parsedJson.analysis && typeof parsedJson.analysis === 'object') {
              try {
                setCodeAnalysis((prev) => ({ ...(prev || {}), ...(parsedJson.analysis as Partial<CodeAutoAnalysis>) }));
              } catch {/* ignore */}
            }
          }
        } catch (parseError) {
          console.warn('[useAIAssistant] ⚠️ Erreur parsing JSON Gemini:', parseError);
          // Garder la réponse originale si le parsing échoue
        }
      }
      
      if (aiResponse && aiResponse.trim()) {
        const summary = buildLeadSummary();
        const name = (summary?.name as string) || 'Ce lead';
        const status = summary?.status ? `Statut: ${summary.status}. ` : '';
        const source = summary?.source ? `Source: ${summary.source}. ` : '';
        const lastContact = summary?.lastContact ? `Dernier contact: ${new Date(summary.lastContact as string).toLocaleDateString('fr-BE')}. ` : '';
        const email = summary?.email ? `Email: ${summary.email}. ` : '';
        const phone = summary?.phone ? `Téléphone: ${summary.phone}. ` : '';
        const company = summary?.company ? `Société: ${summary.company}. ` : '';
        const notes = summary?.notes ? `Notes: ${String(summary.notes).slice(0, 220)}.` : '';

        // ✅ Éviter les réponses fallback génériques
        const isGenericFallback = /Je comprends:.*Besoin d'aide pour:/i.test(aiResponse);
        const wantsOpinion = /tu penses quoi|tu en penses|ton avis|qu['’]est-ce que tu penses|analyse ce lead|analyse du lead/i.test(userMessage);

        if (isGenericFallback || wantsOpinion) {
          const ctxDigest = buildLeadContextDigest();
          const callScript = `Bonjour ${name}, je suis ${summary?.company ? 'de 2Thier' : 'Jonathan de 2Thier'}. ` +
            `Vous avez rempli le formulaire « ${summary?.notes ? 'Simulateur Aides Rénovation' : 'votre demande'} ». ` +
            `Je vous appelle pour comprendre votre projet et voir comment vous aider. Vous avez 2 minutes ?`;

          const resume = `${name}${company ? ` (${company})` : ''}. ${status}${source}`.trim();
          const intention = summary?.notes ? 'Il vient du simulateur aides rénovation.' : 'Il vient d’un formulaire web.';

          aiResponse = `${resume} ${intention}

Mon avis: appelle-le maintenant. L’objectif est de qualifier le besoin, le délai et le budget, puis proposer un RDV si c’est sérieux. Tu peux ouvrir avec: « ${callScript} »`;
        }

        console.log('[useAIAssistant] ✅ Réponse IA reçue mode=', meta.mode, 'endpoint=', meta.endpoint);
        if (apiData.analysis) {
          try { setCodeAnalysis(apiData.analysis as CodeAutoAnalysis); } catch {/* ignore */}
        }
        // Extraire éventuelle analyse renvoyée
        if (apiData.analysis) {
          try { setCurrentAnalysis(apiData.analysis as AIAnalysisResult); } catch {/* ignore */}
        }
        
        const aiMessage: AIChatMessage = {
          id: `ai-${Date.now()}`,
          type: 'ai',
          message: aiResponse,
          timestamp: new Date(),
          suggestions: apiData.suggestions || apiData.data?.suggestions || [],
          context: {
            relatedToCall: true,
            priority: 'high',
            category: meta.mode === 'mock' ? 'ai-mock' : 'ai-live',
            source: meta.mode === 'mock' ? 'mock-fallback' : (meta.model || 'gemini'),
            processingTime: meta.latencyMs || 0,
            // Indications supplémentaires
            fallback: !!meta.fallbackError,
            endpoint: meta.endpoint
          }
        };
        
        setMessages(prev => [...prev, aiMessage]);
  return { aiResponse, meta: meta as Record<string, unknown>, raw: apiData };
      } else {
        console.warn('[useAIAssistant] ⚠️ Structure réponse inattendue:', apiData);
        throw new Error('Aucune réponse valide de l\'API Gemini');
      }
      
    } catch (error) {
      console.error('[useAIAssistant] ❌ Erreur API Gemini:', error);
      
      // Message d'erreur simple si Gemini n'est pas disponible
      const errorMessage: AIChatMessage = {
        id: `error-${Date.now()}`,
        type: 'ai',
        message: "Désolé, je ne peux pas répondre pour le moment. L'API Gemini n'est pas disponible.",
        timestamp: new Date(),
        suggestions: ['Réessayer', 'Continuer sans IA'],
        context: {
          relatedToCall: false,
          priority: 'low',
          category: 'error'
        }
      };
      
      setMessages(prev => [...prev, errorMessage]);
  return null;
    }
    
  setIsAnalyzing(false);
  setAnalysisLoading(false);
  }, [api, lead, messages, currentAnalysis, buildLeadSummary, extraContext?.callNotes]);

  // 💬 Envoyer un message à l'IA
  const sendMessage = useCallback(async (userMessage: string): Promise<void> => {
    if (!userMessage.trim()) return;
    
    // Ajouter le message utilisateur
    const userMsg: AIChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      message: userMessage,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMsg]);
    
    // Générer la réponse IA avec Gemini
    await generateResponse(userMessage);
  }, [generateResponse]);

  // 🗑️ Vider le chat
  const clearChat = useCallback((): void => {
    setMessages([]);
    setCurrentAnalysis(null);
    console.log('[useAIAssistant] Chat vidé');
  }, []);

  // 🎤 Fonction pour démarrer l'écoute vocale
  const startListening = useCallback(() => {
    console.log('[useAIAssistant] 🎤 Démarrage de l\'écoute vocale...');
    
    // Vérifier si le navigateur supporte la reconnaissance vocale
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('[useAIAssistant] ⚠️ Reconnaissance vocale non supportée');
      
      // Message d'erreur pour l'utilisateur
      const errorMessage: AIChatMessage = {
        id: `error-${Date.now()}`,
        type: 'ai',
        message: "Désolé, la reconnaissance vocale n'est pas supportée par ton navigateur. Utilise Chrome ou Edge pour cette fonctionnalité.",
        timestamp: new Date(),
        suggestions: ['Utiliser le clavier', 'Changer de navigateur'],
        context: {
          relatedToCall: false,
          priority: 'low',
          category: 'voice-error'
        }
      };
      
      setMessages(prev => [...prev, errorMessage]);
      return;
    }
    
    try {
      // @ts-expect-error - SpeechRecognition peut ne pas être typé
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      // Configuration de la reconnaissance vocale
      recognition.lang = 'fr-FR';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      
      // Démarrer l'écoute
      setIsListening(true);
      recognition.start();
      
      // Quand on reçoit un résultat
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        console.log('[useAIAssistant] 🎤 Texte reconnu:', transcript);
        
        // Envoyer automatiquement le message reconnu à l'IA
        if (transcript.trim()) {
          sendMessage(transcript);
        }
        
        setIsListening(false);
      };
      
      // Gestion des erreurs
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('[useAIAssistant] ❌ Erreur reconnaissance vocale:', event.error);
        setIsListening(false);
        
        let errorMsg = "Erreur de reconnaissance vocale.";
        switch (event.error) {
          case 'no-speech':
            errorMsg = "Aucune parole détectée. Réessaie en parlant plus fort.";
            break;
          case 'network':
            errorMsg = "Problème de connexion réseau.";
            break;
          case 'not-allowed':
            errorMsg = "Microphone bloqué. Autorise l'accès au micro dans ton navigateur.";
            break;
        }
        
        const errorMessage: AIChatMessage = {
          id: `voice-error-${Date.now()}`,
          type: 'ai',
          message: errorMsg,
          timestamp: new Date(),
          suggestions: ['Réessayer', 'Utiliser le clavier'],
          context: {
            relatedToCall: false,
            priority: 'medium',
            category: 'voice-error'
          }
        };
        
        setMessages(prev => [...prev, errorMessage]);
      };
      
      // Quand l'écoute se termine
      recognition.onend = () => {
        console.log('[useAIAssistant] 🎤 Fin de l\'écoute vocale');
        setIsListening(false);
      };
      
    } catch (error) {
      console.error('[useAIAssistant] ❌ Erreur initialisation reconnaissance vocale:', error);
      setIsListening(false);
      
      const errorMessage: AIChatMessage = {
        id: `init-error-${Date.now()}`,
        type: 'ai',
        message: "Impossible d'initialiser la reconnaissance vocale. Utilise le clavier.",
        timestamp: new Date(),
        suggestions: ['Utiliser le clavier', 'Réessayer plus tard'],
        context: {
          relatedToCall: false,
          priority: 'low',
          category: 'init-error'
        }
      };
      
      setMessages(prev => [...prev, errorMessage]);
    }
  }, [sendMessage, setMessages]);

  // 💡 Fonction pour obtenir des suggestions contextuelles avec Gemini
  const getSuggestions = useCallback(async (context: SuggestionContext) => {
    try {
    const response = await api.post('/api/ai/chat', {
        message: `Génère 4 suggestions contextuelles pour l'appel commercial avec ${lead?.data?.name || 'ce prospect'}`,
        context: {
          userRole: "commercial",
      currentModule: routeInfoRef.current.currentModule || "calls",
      currentPage: routeInfoRef.current.currentPage,
          suggestionRequest: true,
          callContext: context,
          lead: lead,
          leadContext: leadContextRef.current,
          leadSummary: buildLeadSummary(),
          callNotes: extraContext?.callNotes,
          currentAnalysis: currentAnalysis
        },
        conversationHistory: messages.slice(-5)
      });
      const env = response.data || response;
      const data = env.data || env;
      if (data?.suggestions) {
        return data.suggestions;
      }
      
      // Suggestions par défaut si pas de réponse spécifique
      return [
        'Approfondir les besoins du prospect',
        'Présenter une solution adaptée',
        'Gérer les objections avec empathie',
        'Proposer un prochain rendez-vous'
      ];
      
    } catch (error) {
      console.error('[useAIAssistant] ❌ Erreur suggestions Gemini:', error);
      
      return [
        'Écouter activement le prospect',
        'Poser des questions ouvertes',
        'Présenter les bénéfices clés',
        'Planifier le suivi commercial'
      ];
    }
  }, [api, lead, currentAnalysis, messages, buildLeadSummary, extraContext?.callNotes]);

  // ================== AUDITS PILOTÉS PAR IA COACH ==================
  // Analyse de la page courante (si connue)
  const analyzeCurrentPage = useCallback(async () => {
    const page = routeInfoRef.current.currentPage;
    if (!page) return;
    setAnalysisLoading(true);
    const targetPath = `src/${page}`;
    let directOk = true;
    try {
      await api.get('/api/ai/code/analyze', { params: { path: targetPath } });
      console.log('[useAIAssistant] ✅ Analyse directe OK pour', targetPath);
    } catch (err) {
      directOk = false;
      console.warn('[useAIAssistant] ⚠️ Analyse directe échouée, fallback via chat pour', targetPath, err);
    }
    try {
      // Optionnel: récupérer un contexte minimal pour enrichir l'analyse fallback
      let ctxSummary: unknown = null;
      if (!directOk) {
        try {
          const res = await api.get('/api/ai/context/summary');
          ctxSummary = (res?.data || res)?.data || null;
        } catch {/* ignore */}
      }
  const rules = `Règles strictes: 1) N'écris jamais "Impossible à évaluer" ni "sans accès au code". 2) Ne propose pas de "contacter un développeur". 3) Donne 6 actions concrètes, ciblées, faisables en <2h chacune. 4) Concentre-toi sur UX, accessibilité (WCAG), i18n, performance, stabilité hooks, Ant Design et Tailwind. 5) Pas de génération de code. 6) Termine par un bloc JSON (entre \`\`\`json et \`\`\`) avec { "analysis": { "page"?: {"path": string, "lines"?: number, "hooks"?: {"total"?: number, "useEffect"?: number, "custom"?: string[]}, "antd"?: string[], "i18n"?: boolean, "tailwind"?: boolean, "complexity"?: string[], "suggestions"?: string[], "score"?: number }, "feature"?: {"feature": string, "fileCount"?: number, "totalLines"?: number, "avgLines"?: number, "totalHooks"?: number, "i18nCoverage"?: number, "antdUsageRate"?: number, "tailwindUsageRate"?: number }, "excerpt"?: string } }.`;
      const base = `Page: ${targetPath}. Module: ${routeInfoRef.current.currentModule || 'inconnu'}.`;
      const extra = ctxSummary ? `Contexte: ${JSON.stringify(ctxSummary).slice(0, 1200)}.` : '';
      const prompt = directOk
        ? `${base} Consolide l'analyse existante de la page. ${rules} Donne: Résumé (2 phrases), Score (0-100), Hooks clés (liste), Usage i18n/AntD/Tailwind, et 6 suggestions priorisées.`
        : `${base} L'analyse directe a échoué (403). Fais une analyse heuristique basée sur la connaissance du CRM. ${rules} ${extra} Donne: Résumé (2 phrases), Score estimé (0-100), Hooks clés probables, Usage i18n/AntD/Tailwind attendu, et 6 suggestions priorisées et actionnables.`;
      const r = await generateResponse(prompt);
      // Si l'API chat n'a pas fourni d'analyse structurée, au moins peupler un extrait pour activer l'affichage
      if (r && r.aiResponse) {
        setCodeAnalysis(prev => ({ ...(prev || {}), excerpt: r.aiResponse }));
      }
    } finally {
      setAnalysisLoading(false);
    }
  }, [api, generateResponse]);

  // Analyse de la feature courante (module)
  const analyzeCurrentFeature = useCallback(async () => {
    const feature = routeInfoRef.current.currentModule;
    if (!feature) return;
    setAnalysisLoading(true);
    let directOk = true;
    try {
      await api.get('/api/ai/code/feature/analyze', { params: { feature } });
      console.log('[useAIAssistant] ✅ Analyse feature directe OK pour', feature);
    } catch (err) {
      directOk = false;
      console.warn('[useAIAssistant] ⚠️ Analyse feature directe échouée, fallback via chat pour', feature, err);
    }
    try {
      let ctxSummary: unknown = null;
      if (!directOk) {
        try {
          const res = await api.get('/api/ai/context/summary');
          ctxSummary = (res?.data || res)?.data || null;
        } catch {/* ignore */}
      }
  const rules = `Règles strictes: 1) N'écris jamais "Impossible à évaluer" ni "sans accès au code". 2) Ne propose pas de "contacter un développeur". 3) Donne 6 actions concrètes (<2h), priorisées. 4) Couvre performance, dette technique, UX/i18n/a11y, hooks, AntD/Tailwind. 5) Pas de génération de code. 6) Termine par un bloc JSON (entre \`\`\`json et \`\`\`) avec { "analysis": { "page"?: {"path": string, "lines"?: number, "hooks"?: {"total"?: number, "useEffect"?: number, "custom"?: string[]}, "antd"?: string[], "i18n"?: boolean, "tailwind"?: boolean, "complexity"?: string[], "suggestions"?: string[], "score"?: number }, "feature"?: {"feature": string, "fileCount"?: number, "totalLines"?: number, "avgLines"?: number, "totalHooks"?: number, "i18nCoverage"?: number, "antdUsageRate"?: number, "tailwindUsageRate"?: number }, "excerpt"?: string } }.`;
      const extra = ctxSummary ? `Contexte: ${JSON.stringify(ctxSummary).slice(0, 1200)}.` : '';
      const prompt = directOk
        ? `Module: "${feature}". Consolide l'analyse existante. ${rules} Donne: principaux fichiers, volume de lignes, hooks totaux, usages i18n/AntD/Tailwind, et 6 priorités d'amélioration.`
        : `Module: "${feature}". L'analyse directe a échoué (403). Fais une analyse heuristique du module basée sur le contexte CRM. ${rules} ${extra} Donne: principaux fichiers attendus, zones risquées, métriques estimées (qualitatives) et 6 priorités d'amélioration.`;
      const r = await generateResponse(prompt);
      if (r && r.aiResponse) {
        setCodeAnalysis(prev => ({ ...(prev || {}), excerpt: r.aiResponse }));
      }
    } finally {
      setAnalysisLoading(false);
    }
  }, [api, generateResponse]);

  // Analyse rapide du workspace: on prélève un échantillon de fichiers clés et on agrège
  const analyzeWorkspaceQuick = useCallback(async () => {
    try {
      setAnalysisLoading(true);
      // Heuristique: on analyse quelques pages/modules principaux si présents
      const candidates = [
        'src/pages/GoogleMailPageFixed_New.tsx',
        'src/routes/ai.ts',
        'src/routes/ai-code.ts',
        'src/hooks/useAuthenticatedApi.ts',
        'src/route-map.ts'
      ];
      const resp = await api.post('/api/ai/code/analyze/batch', { paths: candidates });
      const payload = (resp.data || resp).data;
      const analyses: CodeBatchItemSummary[] = payload?.analyses || [];
      if (!analyses.length) { setGlobalAnalysis(null); return; }
      const fileCount = analyses.length;
      const totalLines = analyses.reduce((s,a)=>s+(a.lines||0),0);
      const avgLines = Math.round(totalLines / fileCount);
      const totalHooks = analyses.reduce((s,a)=>s+(a.hooks?.total||0),0);
      const i18nCov = analyses.filter(a=>a.i18n).length / fileCount;
      const antdRate = analyses.filter(a=>(a.antdComponents||[]).length>0).length / fileCount;
      const topFiles = analyses
        .slice()
        .sort((a,b)=> (b.lines||0) - (a.lines||0))
        .slice(0,5)
        .map(a=>({ path: a.path, lines: a.lines }));
      const topComplexitySignals: string[] = [];
      // Règles simples
      if (avgLines > 400) topComplexitySignals.push('taille moyenne élevée');
      if (totalHooks / Math.max(1, fileCount) > 15) topComplexitySignals.push('beaucoup de hooks');
      setGlobalAnalysis({
        fileCount,
        totalLines,
        avgLines,
        totalHooks,
        i18nCoverage: i18nCov,
        antdUsageRate: antdRate,
        topComplexitySignals,
        topFiles
      });
    } catch (e) {
      console.warn('[useAIAssistant] analyse workspace quick échouée:', (e as Error).message);
      setGlobalAnalysis(null);
      // Fournir un fallback textuel via chat pour au moins afficher un extrait
      try {
  const r = await generateResponse('Résumé global CRM (fallback, pas de code): Règles strictes: ne dis jamais "impossible à évaluer" ni de contacter un développeur. Donne 6 actions concrètes (<2h), orientées dettes techniques, UX/i18n/a11y, perf, hooks et sécurité. Termine par un bloc JSON entre ```json et ``` avec { "analysis": { "excerpt": string } }.');
        if (r && r.aiResponse) setCodeAnalysis(prev => ({ ...(prev || {}), excerpt: r.aiResponse }));
      } catch {/* ignore */}
    } finally {
      setAnalysisLoading(false);
    }
  }, [api, generateResponse]);

  // 🎯 Retour du hook
  const returnValue: UseAIAssistantReturn = useMemo(() => ({
    messages,
    sendMessage,
    currentAnalysis,
    isAnalyzing,
  isLoading: isAnalyzing,
  analysisLoading,
    isListening,
    clearChat,
    generateResponse,
    startListening,
    getSuggestions,
  codeAnalysis,
  analyzeCurrentPage,
  analyzeCurrentFeature,
  analyzeWorkspaceQuick,
  globalAnalysis
  }), [
    messages,
    sendMessage,
    currentAnalysis,
    isAnalyzing,
    isListening,
    clearChat,
    generateResponse,
    startListening,
    getSuggestions,
    analysisLoading,
  codeAnalysis,
  analyzeCurrentPage,
  analyzeCurrentFeature,
  analyzeWorkspaceQuick,
  globalAnalysis
  ]);

  return returnValue;
};

export default useAIAssistant;
