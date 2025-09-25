import React, { useState } from 'react';
import { useAuthenticatedApi } from '../hooks/useAuthenticatedApi';
import { useAuth } from '../auth/useAuth';

interface Snapshot {
  timestamp: string;
  modules: { key: string; label: string | null; route: string | null }[];
  prismaModels: { name: string; fields: string[] }[];
  apiRoutes: { file: string; methods: string[] }[];
  metrics: { users: number; leads: number; events: number };
}

interface AnalyzeResult { snapshotTimestamp: string; issues: string[]; recommendations: string[]; metrics: { users: number; leads: number; events: number }; counts: { models: number; routes: number; modules: number } }

interface MemoryEntry { id: string; createdAt: string; topic: string | null; tags: string[]; content: string }
interface Plan { objective: string; area: string | null; generatedAt: string; steps: { id: string; title: string; description: string; effort: number; impact: number; risk: string; prerequisites: string[]; diffSketch?: string }[]; nextActions: string[]; effortTotal: number }

const ArchitectIAPanel: React.FC = () => {
  const { api } = useAuthenticatedApi();
  const { isSuperAdmin } = useAuth();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);
  const [loadingSnap, setLoadingSnap] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'overview' | 'memory' | 'plan'>('overview');
  // Mémoire
  const [memory, setMemory] = useState<MemoryEntry[]>([]);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [memoryContent, setMemoryContent] = useState('');
  const [memoryTopic, setMemoryTopic] = useState('');
  const [memoryTags, setMemoryTags] = useState('');
  // Plan
  const [planObjective, setPlanObjective] = useState('');
  const [planArea, setPlanArea] = useState('');
  const [plan, setPlan] = useState<Plan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);

  if (!isSuperAdmin) return null;

  const loadSnapshot = async () => {
    setLoadingSnap(true); setError(null);
    try {
      const res = await api.get('/api/ai/internal/snapshot');
      setSnapshot(res.data?.data);
    } catch (e) { setError((e as Error).message); } finally { setLoadingSnap(false); }
  };
  const loadAnalysis = async () => {
    setLoadingAnalysis(true); setError(null);
    try {
      const res = await api.get('/api/ai/internal/analyze');
      setAnalysis(res.data?.data);
    } catch (e) { setError((e as Error).message); } finally { setLoadingAnalysis(false); }
  };

  const loadMemory = async () => {
    setMemoryLoading(true); setError(null);
    try {
      const res = await api.get('/api/ai/internal/memory?limit=100');
      setMemory(res.data?.data || []);
    } catch (e) { setError((e as Error).message); } finally { setMemoryLoading(false); }
  };
  const addMemory = async () => {
    if (!memoryContent.trim()) return;
    try {
      await api.post('/api/ai/internal/memory', { content: memoryContent.trim(), topic: memoryTopic.trim() || undefined, tags: memoryTags.split(',').map(t=>t.trim()).filter(Boolean) });
      setMemoryContent(''); setMemoryTopic(''); setMemoryTags('');
      loadMemory();
    } catch (e) { setError((e as Error).message); }
  };
  const generatePlan = async () => {
    if (!planObjective.trim()) return;
    setPlanLoading(true); setError(null);
    try {
      const res = await api.post('/api/ai/internal/plan', { objective: planObjective.trim(), area: planArea.trim() || undefined });
      setPlan(res.data?.data || null);
    } catch (e) { setError((e as Error).message); } finally { setPlanLoading(false); }
  };

  return (
    <div className="border rounded p-4 bg-white space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">🧠 Architecte IA (Interne)</h2>
        <div className="flex gap-2 text-xs">
          <button onClick={()=>setTab('overview')} className={"px-2 py-1 rounded "+(tab==='overview'?'bg-indigo-600 text-white':'bg-gray-200 hover:bg-gray-300')}>Vue</button>
          <button onClick={()=>{ setTab('memory'); loadMemory(); }} className={"px-2 py-1 rounded "+(tab==='memory'?'bg-indigo-600 text-white':'bg-gray-200 hover:bg-gray-300')}>Mémoire</button>
          <button onClick={()=>setTab('plan')} className={"px-2 py-1 rounded "+(tab==='plan'?'bg-indigo-600 text-white':'bg-gray-200 hover:bg-gray-300')}>Plan</button>
        </div>
      </div>
      {error && <div className="text-red-600 text-sm">Erreur: {error}</div>}
      {tab==='overview' && (
        <div className="space-y-4">
          <div className="flex gap-2 text-xs">
            <button onClick={loadSnapshot} disabled={loadingSnap} className="px-2 py-1 rounded bg-indigo-600 text-white disabled:opacity-40">Snapshot</button>
            <button onClick={loadAnalysis} disabled={loadingAnalysis} className="px-2 py-1 rounded bg-emerald-600 text-white disabled:opacity-40">Analyse</button>
          </div>
          {snapshot && (
        <div className="text-xs grid grid-cols-2 gap-4">
          <div>
            <div className="font-semibold mb-1">Modules ({snapshot.modules.length})</div>
            <ul className="space-y-0.5 max-h-40 overflow-y-auto pr-2">
              {snapshot.modules.slice(0,50).map(m => <li key={m.key} className="truncate">• {m.key} <span className="text-gray-400">{m.route || ''}</span></li>)}
            </ul>
          </div>
          <div>
            <div className="font-semibold mb-1">Modèles Prisma ({snapshot.prismaModels.length})</div>
            <ul className="space-y-0.5 max-h-40 overflow-y-auto pr-2">
              {snapshot.prismaModels.map(m => <li key={m.name}>• {m.name} <span className="text-gray-400">({m.fields.length})</span></li>)}
            </ul>
          </div>
          <div className="col-span-2">
            <div className="font-semibold mb-1">Routes API ({snapshot.apiRoutes.length})</div>
            <div className="flex flex-wrap gap-1 text-[10px] max-h-28 overflow-y-auto border p-1 rounded">
              {snapshot.apiRoutes.map(r => <span key={r.file} className="px-1 py-0.5 bg-gray-100 rounded border">{r.file}:{r.methods.join(',')}</span>)}
            </div>
          </div>
          <div className="col-span-2 text-[11px] text-gray-600">Snapshot: {new Date(snapshot.timestamp).toLocaleTimeString()} • Users:{snapshot.metrics.users} | Leads:{snapshot.metrics.leads} | Events:{snapshot.metrics.events}</div>
        </div>) }
          {analysis && (
        <div className="text-xs space-y-3 border-t pt-3">
          <div className="font-semibold">Analyse ({analysis.snapshotTimestamp})</div>
          <div>
            <div className="text-[11px] uppercase text-gray-500">Problèmes</div>
            {analysis.issues.length ? (
              <ul className="list-disc ml-4 space-y-0.5 mt-1">
                {analysis.issues.map((i, idx) => <li key={idx}>{i}</li>)}
              </ul>
            ) : <div className="text-emerald-600">Aucun problème de base détecté</div>}
          </div>
          <div>
            <div className="text-[11px] uppercase text-gray-500">Recommandations</div>
            <ul className="list-disc ml-4 space-y-0.5 mt-1">
              {analysis.recommendations.map((r, idx) => <li key={idx}>{r}</li>)}
            </ul>
          </div>
          <div className="text-[10px] text-gray-500">Modèles:{analysis.counts.models} Routes:{analysis.counts.routes} Modules:{analysis.counts.modules}</div>
        </div>) }
          {!snapshot && !analysis && <div className="text-xs text-gray-500">Clique sur Snapshot ou Analyse pour commencer.</div>}
        </div>
      )}
      {tab==='memory' && (
        <div className="space-y-3 text-xs">
          <div className="flex gap-2">
            <input value={memoryTopic} onChange={e=>setMemoryTopic(e.target.value)} placeholder="Topic" className="border px-2 py-1 rounded flex-1" />
            <input value={memoryTags} onChange={e=>setMemoryTags(e.target.value)} placeholder="tags (csv)" className="border px-2 py-1 rounded flex-1" />
          </div>
          <textarea value={memoryContent} onChange={e=>setMemoryContent(e.target.value)} placeholder="Contenu à mémoriser..." className="border w-full rounded p-2 h-24" />
          <div className="flex gap-2">
            <button onClick={addMemory} disabled={!memoryContent.trim()} className="px-2 py-1 rounded bg-indigo-600 text-white disabled:opacity-40">Ajouter</button>
            <button onClick={loadMemory} className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300">Rafraîchir</button>
          </div>
          {memoryLoading && <div>Chargement...</div>}
          <ul className="space-y-2 max-h-64 overflow-y-auto border rounded p-2">
            {memory.map(m => (
              <li key={m.id} className="bg-gray-50 p-2 rounded border">
                <div className="font-medium text-[11px]">{m.topic || '(sans topic)'} <span className="text-gray-400 ml-1">{new Date(m.createdAt).toLocaleTimeString()}</span></div>
                <div className="mt-1 whitespace-pre-wrap text-[11px] leading-snug">{m.content}</div>
                {m.tags.length>0 && <div className="mt-1 flex flex-wrap gap-1">{m.tags.map(t=> <span key={t} className="px-1 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[10px]">{t}</span>)}</div>}
              </li>
            ))}
            {!memory.length && !memoryLoading && <li className="text-gray-400 text-[11px]">Aucune entrée.</li>}
          </ul>
        </div>
      )}
      {tab==='plan' && (
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <input value={planObjective} onChange={e=>setPlanObjective(e.target.value)} placeholder="Objectif (ex: Refactor module leads)" className="border px-2 py-1 rounded col-span-2" />
            <input value={planArea} onChange={e=>setPlanArea(e.target.value)} placeholder="Zone / Domaine" className="border px-2 py-1 rounded" />
            <button onClick={generatePlan} disabled={!planObjective.trim() || planLoading} className="px-2 py-1 rounded bg-indigo-600 text-white disabled:opacity-40">Générer Plan</button>
          </div>
          {planLoading && <div>Génération...</div>}
          {plan && (
            <div className="space-y-3">
              <div className="font-semibold">Plan – Effort total: {plan.effortTotal}</div>
              <ul className="space-y-2">
                {plan.steps.map(s => (
                  <li key={s.id} className="border rounded p-2 bg-gray-50">
                    <div className="flex justify-between text-[11px] font-medium">
                      <span>{s.id} – {s.title}</span>
                      <span>Effort:{s.effort} Impact:{s.impact} Risque:{s.risk}</span>
                    </div>
                    <div className="mt-1 leading-snug whitespace-pre-wrap">{s.description}</div>
                    {s.diffSketch && <details className="mt-1"><summary className="cursor-pointer text-indigo-600">Diff esquisse</summary><pre className="bg-white border p-2 overflow-x-auto text-[10px]">{s.diffSketch}</pre></details>}
                  </li>
                ))}
              </ul>
              <div>
                <div className="text-[11px] uppercase text-gray-500">Actions Suivantes</div>
                <ul className="list-disc ml-4 mt-1 space-y-0.5">
                  {plan.nextActions.map((a,i)=><li key={i}>{a}</li>)}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ArchitectIAPanel;
