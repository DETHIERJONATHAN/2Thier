import React, { useState, useEffect, useCallback, useRef } from 'react';
import NotificationsBell from './NotificationsBell';
import ProfileMenu from './ProfileMenu';
import OrganizationSelector from './OrganizationSelector';
import { useAuth } from '../auth/useAuth';
import { FaExchangeAlt } from 'react-icons/fa';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { useAIAssistant } from './CallModule/hooks/useAIAssistant';
import { FiZap, FiMic, FiSend, FiVolume2, FiStopCircle } from 'react-icons/fi';

// Assistant IA étendu: suggestions + chat texte + mode vocal (reconnaissance & synthèse navigateur)
const AssistantAmeliorationIA: React.FC = () => {
  const { api } = useAuthenticatedApi();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Hook IA Coach (audits globaux)
  const {
    analysisLoading,
    codeAnalysis,
    analyzeCurrentPage,
    analyzeCurrentFeature,
    analyzeWorkspaceQuick,
    globalAnalysis
  } = useAIAssistant(null);
  const [showAnalysisDetails, setShowAnalysisDetails] = useState(false);
  type LeadLite = { id: string; firstName?: string | null; lastName?: string | null; company?: string | null; status: string; nextFollowUpDate?: string | null; updatedAt?: string };
  type SummaryContext = {
    organization: { id: string; name: string } | null;
    modules: { key: string; feature: string; label: string; route?: string; description?: string | null }[];
    leads: LeadLite[];
    upcomingEvents: { id: string; title: string; startDate: string }[];
    meta: { generatedAt: string };
  };
  interface Suggestion { id: string; label: string; category: string; action?: () => void }
  const [summary, setSummary] = useState<SummaryContext | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [lastFetched, setLastFetched] = useState<number | null>(null);

  // ---------------- Chat State ----------------
  interface ChatMessage { id: string; role: 'user' | 'assistant'; content: string; createdAt: number }
  const [tab, setTab] = useState<'suggestions' | 'chat'>('suggestions');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [lastSuggestions, setLastSuggestions] = useState<string[]>([]);
  const [voiceEnabled, setVoiceEnabled] = useState(false); // synthèse voix des réponses
  const [recording, setRecording] = useState(false);
  // Types limités pour API Web Speech (non standard TS)
  interface ISpeechRecognition extends EventTarget {
    lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
    start: () => void; stop: () => void;
    onresult: ((this: ISpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
    onerror: ((this: ISpeechRecognition, ev: { error?: string }) => void) | null;
    onend: (() => void) | null;
  }
  // @ts-expect-error: Type navigateur spécifique non présent dans lib DOM standard selon versions
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToEnd = () => {
    requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }));
  };
  useEffect(scrollToEnd, [messages]);

  // Initialise SpeechRecognition si dispo
  useEffect(() => {
  // @ts-expect-error: propriétés spécifiques navigateur
  const SR: { new(): ISpeechRecognition } | undefined = (window as unknown as { SpeechRecognition?: { new(): ISpeechRecognition }; webkitSpeechRecognition?: { new(): ISpeechRecognition } }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: { new(): ISpeechRecognition } }).webkitSpeechRecognition;
    if (SR) {
      const r = new SR();
      r.lang = 'fr-FR';
      r.continuous = false;
      r.interimResults = false;
      r.maxAlternatives = 1;
      r.onresult = (e: SpeechRecognitionEvent) => {
        // @ts-expect-error: results non typé selon versions
        const transcript = e.results?.[0]?.[0]?.transcript as string | undefined;
        if (transcript) {
          setInput(prev => prev ? prev + ' ' + transcript : transcript);
        }
      };
      r.onerror = (e: { error?: string }) => {
        if (e?.error) console.warn('[IA Coach] Erreur reconnaissance vocale', e.error);
        setRecording(false);
      };
      r.onend = () => setRecording(false);
      recognitionRef.current = r;
    }
  }, []);

  const toggleRecording = () => {
    const r = recognitionRef.current;
    if (!r) return alert('Reconnaissance vocale non supportée par ce navigateur.');
    if (recording) {
  try { r.stop(); } catch { /* ignore stop error */ }
      setRecording(false);
    } else {
      try { r.start(); setRecording(true); } catch (e) { console.warn(e); }
    }
  };

  const speak = (text: string) => {
    if (!voiceEnabled) return;
    const synth = window.speechSynthesis;
    if (!synth) return;
    const u = new SpeechSynthesisUtterance(text.slice(0, 800));
    u.lang = 'fr-FR';
    synth.speak(u);
  };

  const sendMessage = async () => {
    if (!input.trim() || chatLoading) return;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: input.trim(), createdAt: Date.now() };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setChatLoading(true);
    try {
      const payload = {
        message: userMsg.content,
        context: { currentModule: 'assistant_crm', currentPage: 'header', userRole: 'super_admin' },
        conversationHistory: history.map(m => ({ role: m.role, content: m.content }))
      };
      const res: unknown = await api.post('/api/ai/chat', payload);
      // res attendu: { success, data: { response, suggestions? } }
      let aiText = 'Réponse indisponible.';
      let sugg: string[] = [];
      if (res && typeof res === 'object') {
        const r = res as { data?: { response?: string; suggestions?: string[] } };
        aiText = r.data?.response || aiText;
        sugg = Array.isArray(r.data?.suggestions) ? r.data!.suggestions!.slice(0,6) : [];
      }
      const aiMsg: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: aiText, createdAt: Date.now() };
      setMessages(m => [...m, aiMsg]);
      if (sugg.length) setLastSuggestions(sugg);
      speak(aiText);
    } catch (e) {
      setMessages(m => [...m, { id: crypto.randomUUID(), role: 'assistant', content: 'Erreur IA: ' + (e as Error).message, createdAt: Date.now() }]);
    } finally {
      setChatLoading(false);
    }
  };
  const STALE_MS = 60_000; // 1 minute

  const computeSuggestions = useCallback((ctx: SummaryContext): Suggestion[] => {
    const out: Suggestion[] = [];
    const leads = ctx.leads || [];
    const events = ctx.upcomingEvents || [];
    const now = Date.now();
    if (leads.length) {
      const first = leads[0];
      out.push({ id: 'lead-prio', category: 'Relance', label: `Relancer ${first.firstName || first.company || 'lead'} (statut: ${first.status})` });
    }
    // Leads sans prochaine relance
    const leadsSansSuivi = leads.filter(l => !l.nextFollowUpDate);
    if (leadsSansSuivi.length) {
      out.push({ id: 'missing-followup', category: 'Organisation', label: `${leadsSansSuivi.length} lead(s) sans prochaine relance` });
    }
    // Événement imminent (<24h)
    const imminent = events.find(ev => (new Date(ev.startDate).getTime() - now) < 24*3600*1000);
    if (imminent) {
      out.push({ id: 'prep-event', category: 'Préparation', label: `Préparer événement: ${imminent.title}` });
    }
    // Trop de modules actifs (bruit potentiel)
    if (ctx.modules.length > 12) {
      out.push({ id: 'modules-clean', category: 'Hygiène', label: 'Réduire modules inactifs (>12 actifs)' });
    }
    if (!out.length) out.push({ id: 'none', category: 'Info', label: 'Aucune optimisation urgente détectée' });
    return out.slice(0,6);
  }, []);

  const fetchContext = useCallback(async (force = false) => {
    if (loading) return;
    if (!force && lastFetched && (Date.now() - lastFetched) < STALE_MS) return; // éviter spam
    try {
      setLoading(true); setError(null);
      const res = await api.get('/api/ai/context/summary');
      const incoming: SummaryContext | null = res.data?.data as SummaryContext | null;
      setSummary(incoming);
      if (incoming) setSuggestions(computeSuggestions(incoming));
      setLastFetched(Date.now());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [api, computeSuggestions, lastFetched, loading]);

  // Auto-fetch quand panneau ouvre (et données absentes ou périmées)
  useEffect(() => { if (open) fetchContext(); }, [open, fetchContext]);

  return (
    <div className="relative">
      <button onClick={() => setOpen(o=>!o)} className="flex items-center gap-1 text-sm px-2 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200">
        <FiZap className="text-indigo-500" /> IA Coach
        {loading && <span className="animate-pulse text-[10px] ml-1">…</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-96 bg-white border border-gray-200 rounded shadow-lg p-0 z-50 text-sm flex flex-col max-h-[520px]">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <div className="font-semibold">Assistant CRM Interne</div>
            <div className="flex gap-2 text-[11px]">
              <button onClick={() => setTab('suggestions')} className={"px-2 py-0.5 rounded " + (tab==='suggestions' ? 'bg-indigo-100 text-indigo-700':'bg-gray-100 hover:bg-gray-200')}>Optimisations</button>
              <button onClick={() => setTab('chat')} className={"px-2 py-0.5 rounded " + (tab==='chat' ? 'bg-indigo-100 text-indigo-700':'bg-gray-100 hover:bg-gray-200')}>Chat</button>
            </div>
          </div>
          {tab === 'suggestions' && (
            <div className="p-3 space-y-3 overflow-y-auto">
              {/* Barre d'actions d'audit */}
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  <button
                    onClick={() => analyzeCurrentPage?.()}
                    className="text-[11px] px-2 py-1 rounded border bg-gray-50 hover:bg-gray-100"
                  >Page</button>
                  <button
                    onClick={() => analyzeCurrentFeature?.()}
                    className="text-[11px] px-2 py-1 rounded border bg-gray-50 hover:bg-gray-100"
                  >Module</button>
                  <button
                    onClick={() => analyzeWorkspaceQuick?.()}
                    className="text-[11px] px-2 py-1 rounded border bg-gray-50 hover:bg-gray-100"
                  >CRM</button>
                </div>
                <div className="flex items-center gap-2">
                  {analysisLoading && <span className="text-[10px] text-gray-500 animate-pulse">Analyse en cours…</span>}
                  <button
                    onClick={() => setShowAnalysisDetails(s => !s)}
                    disabled={!codeAnalysis}
                    className={"text-[11px] px-2 py-1 rounded border " + (!codeAnalysis ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'bg-white hover:bg-gray-50')}
                  >
                    {showAnalysisDetails ? 'Masquer détails' : 'Voir détails analyse'}
                  </button>
                </div>
              </div>

              {/* Résumé global CRM si dispo */}
              {globalAnalysis && (
                <div className="border border-yellow-200 bg-yellow-50 rounded p-2 text-[12px]">
                  <div className="font-medium mb-1">Résumé global (échantillon)</div>
                  <div>Fichiers: {globalAnalysis.fileCount} • Lignes: {globalAnalysis.totalLines} • Moyenne/fichier: {globalAnalysis.avgLines} • Hooks: {globalAnalysis.totalHooks}</div>
                  <div>i18n: {Math.round(globalAnalysis.i18nCoverage*100)}% • AntD: {Math.round(globalAnalysis.antdUsageRate*100)}%</div>
                  {globalAnalysis.topFiles?.length ? (
                    <ul className="list-disc ml-5 mt-1">
                      {globalAnalysis.topFiles.map((f, i) => (
                        <li key={i}>{f.path} • {f.lines} lignes</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              )}

              {/* Détails d'analyse page/module */}
              {showAnalysisDetails && codeAnalysis && (
                <div className="border border-emerald-200 bg-emerald-50 rounded p-2 text-[12px] space-y-2">
                  {codeAnalysis.page && (
                    <div>
                      <div className="font-medium">Analyse page</div>
                      <div>Fichier: {codeAnalysis.page.path}</div>
                      <div>Lignes: {codeAnalysis.page.lines} • Score: {codeAnalysis.page.score}</div>
                      <div>Hooks: {codeAnalysis.page.hooks.total} (useEffect: {codeAnalysis.page.hooks.useEffect}) • AntD: {codeAnalysis.page.antd?.length || 0} • i18n: {codeAnalysis.page.i18n ? 'oui':'non'}</div>
                      {codeAnalysis.page.complexity?.length ? (
                        <ul className="list-disc ml-5 mt-1">
                          {codeAnalysis.page.complexity.slice(0,8).map((c,i)=>(<li key={i}>{c}</li>))}
                        </ul>
                      ) : null}
                      {codeAnalysis.page.suggestions?.length ? (
                        <ul className="list-disc ml-5 mt-1">
                          {codeAnalysis.page.suggestions.slice(0,8).map((s,i)=>(<li key={i}>{s}</li>))}
                        </ul>
                      ) : null}
                    </div>
                  )}
                  {codeAnalysis.feature && (
                    <div>
                      <div className="font-medium">Résumé module</div>
                      <div>Module: {codeAnalysis.feature.feature}</div>
                      <div>Fichiers: {codeAnalysis.feature.fileCount} • Lignes totales: {codeAnalysis.feature.totalLines} • Moyenne/fichier: {codeAnalysis.feature.avgLines}</div>
                      <div>Hooks totaux: {codeAnalysis.feature.totalHooks} • i18n: {Math.round(codeAnalysis.feature.i18nCoverage*100)}% • AntD: {Math.round(codeAnalysis.feature.antdUsageRate*100)}%</div>
                    </div>
                  )}
                  {codeAnalysis.excerpt && (
                    <div>
                      <div className="font-medium">Extrait</div>
                      <pre className="bg-white border border-emerald-200 rounded p-2 max-h-40 overflow-auto text-[11px] whitespace-pre-wrap">{codeAnalysis.excerpt}</pre>
                    </div>
                  )}
                </div>
              )}

              {loading && <div>Chargement contexte...</div>}
              {error && <div className="text-red-600">Erreur: {error}</div>}
              {summary && !loading && (
                <>
                  <div>
                    <div className="text-xs uppercase text-gray-500">Contexte</div>
                    <div className="mt-1 leading-snug">
                      Org: {summary.organization?.name || '—'}<br/>
                      Modules: {summary.modules.length} | Leads: {summary.leads.length} | Évts: {summary.upcomingEvents.length}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-gray-500 flex justify-between items-center">
                      <span>Suggestions</span>
                      <div className="flex gap-1">
                        <button onClick={() => fetchContext(true)} className="text-[10px] px-1 py-0.5 bg-gray-100 hover:bg-gray-200 rounded">↻</button>
                        <button onClick={() => { setSummary(null); setSuggestions([]); fetchContext(true); }} className="text-[10px] px-1 py-0.5 bg-gray-100 hover:bg-gray-200 rounded">Recalc</button>
                      </div>
                    </div>
                    <ul className="mt-1 space-y-1">
                      {suggestions.map(s => (
                        <li key={s.id} className="flex items-start gap-1">
                          <span className="text-[10px] mt-0.5 px-1 rounded bg-indigo-50 text-indigo-600 border border-indigo-100">{s.category}</span>
                          <button onClick={s.action || (()=> setTab('chat'))} className="text-left flex-1 hover:underline">
                            {s.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="text-[10px] text-gray-400">MAJ: {new Date(summary.meta.generatedAt).toLocaleTimeString()} • TTL 60s</div>
                </>
              )}
              {!summary && !loading && <div className="text-gray-500 text-xs">Ouvrez le panneau pour récupérer le contexte.</div>}
            </div>
          )}
          {tab === 'chat' && (
            <div className="flex flex-col flex-1 min-h-[320px]">
              <div className="px-3 py-2 border-b bg-gray-50 text-[11px] leading-snug">
                Discutez de l'évolution du CRM. Le modèle reste interne (pas d'envoi de données sensibles hors contexte minimal). Mode vocal disponible si supporté.
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
                {messages.map(m => (
                  <div key={m.id} className={"flex " + (m.role==='user' ? 'justify-end':'justify-start')}>
                    <div className={"rounded px-2 py-1 max-w-[75%] whitespace-pre-wrap text-xs " + (m.role==='user' ? 'bg-indigo-600 text-white':'bg-gray-100 text-gray-800')}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {(!messages.length && !chatLoading) && <div className="text-[11px] text-gray-400">Posez une première question pour commencer.</div>}
                {lastSuggestions.length > 0 && (
                  <div className="mt-2 text-[10px] text-gray-500">
                    <div className="uppercase mb-1">Suggestions liées</div>
                    <div className="flex flex-wrap gap-1">
                      {lastSuggestions.map(s => (
                        <button key={s} onClick={()=> { setInput(s); }} className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded text-indigo-700">{s}</button>
                      ))}
                    </div>
                  </div>
                )}
                {chatLoading && <div className="text-xs text-gray-400">Génération...</div>}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-2 border-t space-y-1">
                <div className="flex items-center gap-2">
                  <button onClick={toggleRecording} title="Reconnaissance vocale" className={"p-2 rounded border text-indigo-600 flex items-center justify-center " + (recording ? 'bg-red-50 border-red-300 text-red-600 animate-pulse':'bg-white border-gray-300 hover:bg-gray-50')}>
                    {recording ? <FiStopCircle /> : <FiMic />}
                  </button>
                  <input
                    value={input}
                    onChange={e=>setInput(e.target.value)}
                    onKeyDown={e=> { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder={recording ? 'Parlez...' : 'Votre question sur le CRM...'}
                    className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button onClick={sendMessage} disabled={!input.trim() || chatLoading} className="p-2 rounded bg-indigo-600 text-white text-xs hover:bg-indigo-700 disabled:opacity-40"><FiSend /></button>
                </div>
                <div className="flex items-center justify-between text-[10px] text-gray-500">
                  <label className="flex items-center gap-1 cursor-pointer select-none">
                    <input type="checkbox" checked={voiceEnabled} onChange={e=>setVoiceEnabled(e.target.checked)} className="scale-90" />
                    <FiVolume2 /> Voix IA
                  </label>
                  <span className="italic">Bêta – ne remplace pas une revue humaine.</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Header: React.FC = () => {
  const { 
    setImpersonation,
    isImpersonating,
    clearImpersonation,
    user
  } = useAuth();
  
  interface ImpUser { id: string }
  interface ImpOrg { id: string }
  const handleImpersonate = (user: ImpUser, organization: ImpOrg) => {
    setImpersonation(user, organization);
  };
  
  return (
    <header className="bg-white shadow-sm p-4 flex justify-between items-center">
      <div className="flex items-center space-x-4">
        {/* Composant de sélection/usurpation d'organisation */}
        <OrganizationSelector onImpersonateClick={handleImpersonate} />
        
        {/* Barre de notification d'usurpation */}
        {isImpersonating && (
          <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm flex items-center">
            <FaExchangeAlt className="mr-1" />
            Mode usurpation: {user?.firstName} {user?.lastName}
            <button 
              onClick={() => clearImpersonation()}
              className="ml-2 text-yellow-700 hover:text-yellow-900 font-medium"
            >
              Quitter
            </button>
          </div>
        )}
      </div>
      <div className="flex items-center space-x-4">
        <AssistantAmeliorationIA />
        <NotificationsBell />
        <ProfileMenu />
      </div>
    </header>
  );
};

export default Header;
