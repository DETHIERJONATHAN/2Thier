/**
 * 🤖 ROUTES API INTELLIGENCE ARTIFICIELLE
 * Routes pour l'assistant IA vocal et les recommandations intelligentes
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { authenticateToken } from '../middleware/auth';
import GoogleGeminiService from '../services/GoogleGeminiService';
import { PrismaClient } from '@prisma/client';
import type { AuthenticatedRequest } from '../middlewares/auth';
import { randomUUID } from 'crypto';

// Instance unique réutilisable (évite recréations coûteuses)
const geminiSingleton = new GoogleGeminiService();
const prisma = new PrismaClient();

const router = express.Router();

// Middleware d'authentification pour toutes les routes IA
router.use(authenticateToken);

// ------------------------ Logging usage IA (non destructif) ------------------------
let aiUsageTableEnsured: Promise<void> | null = null;
async function ensureAiUsageLogTable() {
  if (!aiUsageTableEnsured) {
    aiUsageTableEnsured = (async () => {
      try {
        // Création préventive si la migration n'a pas été appliquée (non destructive)
        // On crée la table avec le schéma correspondant au modèle Prisma (si migrations non appliquées)
        await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "AiUsageLog" (
          id TEXT PRIMARY KEY,
          "userId" TEXT NULL,
          "organizationId" TEXT NULL,
          type TEXT NOT NULL,
          model TEXT NULL,
          "tokensPrompt" INTEGER DEFAULT 0,
          "tokensOutput" INTEGER DEFAULT 0,
          "latencyMs" INTEGER NULL,
          success BOOLEAN DEFAULT true,
          "errorCode" TEXT NULL,
          "errorMessage" TEXT NULL,
          meta JSONB NULL,
          "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`);
        await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "AiUsageLog_userId_idx" ON "AiUsageLog"("userId");');
        await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "AiUsageLog_orgId_idx" ON "AiUsageLog"("organizationId");');
        await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "AiUsageLog_type_idx" ON "AiUsageLog"(type);');
        await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "AiUsageLog_createdAt_idx" ON "AiUsageLog"("createdAt");');
      } catch (e) {
        console.warn('⚠️ Impossible de garantir la table AiUsageLog (continuation sans log):', (e as Error).message);
      }
    })();
  }
  return aiUsageTableEnsured;
}

interface AiUsageParams {
  req: express.Request;
  endpoint: string; // Nom interne de la route
  success: boolean;
  latencyMs?: number;
  model?: string | null;
  mode?: string | null; // live/mock/context/analysis
  tokensPrompt?: number | null;
  tokensOutput?: number | null;
  error?: string | null;
  extraMeta?: Record<string, unknown>;
}

function mapEndpointToType(endpoint: string): string {
  switch (endpoint) {
    case 'generate-response':
    case 'chat':
      return 'chat';
    case 'schedule-recommendations':
      return 'schedule_rec';
    case 'schedule-explain':
      return 'schedule_explain';
    case 'analyze-conversation':
      return 'conversation_analysis';
    case 'context-summary':
      return 'context_summary';
    case 'context-lead':
      return 'context_lead';
    case 'context-leads-batch':
      return 'context_leads_batch';
    case 'ultimate-recommendation':
      return 'ultimate_recommendation';
    default:
      return endpoint.replace(/[^a-z0-9_]/gi, '_');
  }
}

async function logAiUsage(params: AiUsageParams) {
  try {
    await ensureAiUsageLogTable();
    const authReq = params.req as unknown as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId || null;
    const userId = authReq.user?.userId || null;
    const type = mapEndpointToType(params.endpoint);
    const meta = {
      endpoint: params.endpoint,
      mode: params.mode,
      rawError: params.error,
      tokensOutputRaw: params.tokensOutput,
      ...(params.extraMeta || {})
    };
    await prisma.aiUsageLog?.create?.({
      data: {
        id: randomUUID(),
        organizationId: organizationId || undefined,
        userId: userId || undefined,
        type,
        model: params.model || undefined,
        tokensPrompt: params.tokensPrompt ?? undefined,
        tokensOutput: params.tokensOutput ?? undefined,
        latencyMs: params.latencyMs,
        success: params.success,
        errorCode: params.error ? 'ERR_AI' : undefined,
        errorMessage: params.error || undefined,
        meta
      }
    }).catch(async () => {
      // Fallback SQL brut
      await prisma.$executeRawUnsafe(
        'INSERT INTO "AiUsageLog" (id, "userId", "organizationId", type, model, "tokensPrompt", "tokensOutput", "latencyMs", success, "errorCode", "errorMessage", meta) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12);',
        randomUUID(), userId, organizationId, type, params.model, params.tokensPrompt || 0, params.tokensOutput || 0, params.latencyMs || null, params.success, params.error ? 'ERR_AI' : null, params.error || null, JSON.stringify(meta)
      );
    });
  } catch (e) {
    // Ne jamais interrompre la réponse utilisateur pour un problème de log
    console.warn('⚠️ Log AI usage échoué:', (e as Error).message);
  }
}

/**
 * 💬 POST /api/ai/generate-response
 * Génère une réponse de l'assistant IA
 */
router.post('/generate-response', async (req, res) => {
  await handleChatLike(req, res, 'generate-response');
});

/**
 * 💬 POST /api/ai/chat (alias moderne)
 */
router.post('/chat', async (req, res) => {
  await handleChatLike(req, res, 'chat');
});

// -------- Helpers Prompt & Fallback ---------
interface PromptContext { currentModule?: string; currentPage?: string; userRole?: string; [k: string]: unknown }
interface HistoryMsg { type?: string; role?: string; message?: string; content?: string }
interface ChatPromptInput { message: string; context?: PromptContext; conversationHistory?: HistoryMsg[]; analysis?: unknown; memory?: string }
function buildChatPrompt({ message, context, conversationHistory, analysis, memory }: ChatPromptInput): string {
  // Lead/context summarization (kept concise to preserve tokens)
  function summarizeLeadFromContext(ctx?: PromptContext): string {
    try {
      if (!ctx) return '';
      const ctxUnknown = ctx as unknown as Record<string, unknown>;
      const leadBasic = (ctxUnknown?.lead as unknown) || null;
      const lc = (ctxUnknown?.leadContext as unknown as { lead?: unknown; calls?: unknown[]; messages?: unknown[]; upcomingEvents?: unknown[] }) || null;
      const lead = (lc && (lc as { lead?: unknown }).lead) || leadBasic || null;
      if (!lead && !lc) return '';
      const name = [lead?.firstName || lead?.data?.firstName, lead?.lastName || lead?.data?.lastName, lead?.name].filter(Boolean).join(' ').trim();
      const company = lead?.company || lead?.data?.company || '';
      const status = lead?.status || lead?.data?.status || '';
      const notes: string = (lead?.notes || lead?.data?.notes || '').toString();
      const calls = lc?.calls || [];
      const messages = lc?.messages || [];
      const events = lc?.upcomingEvents || [];
  // const timeline = lc?.timeline || [];
      const lastCall = Array.isArray(calls) && calls.length ? calls[0] : null;
      const lastMsg = Array.isArray(messages) && messages.length ? messages[0] : null;
      const nextEvent = Array.isArray(events) && events.length ? events[0] : null;
      const parts: string[] = [];
      if (name) parts.push(`Nom: ${name}${company ? ' • '+company : ''}`);
      if (status) parts.push(`Statut: ${status}`);
      const counts: string[] = [];
      if (Array.isArray(calls)) counts.push(`${calls.length} appels récents`);
      if (Array.isArray(messages)) counts.push(`${messages.length} messages`);
      if (Array.isArray(events)) counts.push(`${events.length} RDV à venir`);
      if (counts.length) parts.push(`Activité: ${counts.join(', ')}`);
      if (lastCall) parts.push(`Dernier appel: ${lastCall.status || 'n/a'}${lastCall.duration ? ` (${lastCall.duration}s)` : ''}`);
      if (lastMsg) parts.push(`Dernier message: ${lastMsg.type || 'n/a'} ${lastMsg.sentAt ? `(${new Date(lastMsg.sentAt).toLocaleDateString('fr-FR')})` : ''}`);
      if (nextEvent) parts.push(`Prochain évènement: ${nextEvent.title || 'RDV'} le ${nextEvent.startDate ? new Date(nextEvent.startDate).toLocaleString('fr-FR') : 'bientôt'}`);
      if (notes) parts.push(`Notes: ${(notes.replace(/\s+/g,' ').slice(0,140))}${notes.length>140?'…':''}`);
      return parts.length ? ('\nLEAD_CONTEXT:\n' + parts.join('\n')) : '';
    } catch { return ''; }
  }
  const hist = (conversationHistory || []).slice(-8).map((m, i) => `#${i+1} ${m.type || m.role || 'user'}: ${(m.message || m.content || '').slice(0,400)}`).join('\n');
  const analysisBlock = analysis ? `\nANALYSE_PRECEDENTE:\n${JSON.stringify(analysis).slice(0,800)}` : '';
  const memoryBlock = memory ? `\nMEMOIRE_SYSTEME_RECENTE:\n${memory}` : '';
  const leadBlock = summarizeLeadFromContext(context as PromptContext);
  return `Tu es un assistant commercial CRM francophone spécialisé en prospection, qualification et planification de RDV.
ContexteModule: ${context?.currentModule || 'inconnu'}
Page: ${context?.currentPage || 'n/a'}
RôleUtilisateur: ${context?.userRole || 'commercial'}
Objectif: aider rapidement avec pertinence, proposer des actions concrètes.
${leadBlock}
Historique:
${hist || 'Aucun'}
MessageUtilisateur: ${message}
${analysisBlock}
${memoryBlock}
Règles de réponse: commence par saluer en citant le prénom/nom du lead si disponibles. Fais 1 phrase d'état (appels/messages/RDV). Puis propose: 1) une phrase d'ouverture d'appel adaptée, 2) deux questions de qualification courtes, 3) la prochaine action claire. Si aucune activité, encourage à appeler et propose un angle. Réponds en français, concis, structuré, ≤140 mots.`;
}

function buildMockResponse(message: string, context?: PromptContext): string {
  const page = (context?.currentPage || '').toLowerCase();
  const moduleKey = (context?.currentModule || '').toLowerCase();
  const mentionsGmail = /gmail|mail|email|inbox|délivrabi|deliverab/i.test(message) || page.includes('mail') || page.includes('gmail') || moduleKey.includes('mail') || moduleKey.includes('gmail');
  if (mentionsGmail) {
    return [
      `Analyse rapide de la page Mail (réponse simplifiée):`,
      `• Lisibilité: vérifiez la hiérarchie (sujet, expéditeur, labels).`,
      `• Actions clés visibles: répondre, transférer, étoile, supprimer, labels.`,
      `• États: chargement, erreurs, boîte vide, pagination/scroll.`,
      `• Recherche/filtres: champs, tri par date/expéditeur, labels.`,
      `• Sécurité: si HTML d'email rendu, utiliser DOMPurify (anti-XSS).`,
      `• Liaison CRM: lien vers Lead/Opportunité/Tâches, suivi/relances.`,
      `Prochaine étape: dites “audite la page mail” ou “propose 3 quick wins UI”.`
    ].join('\n');
  }
  return `Je comprends: "${message}". (Réponse simplifiée) Besoin d'aide pour: planifier un RDV, analyser un lead, générer un email, ou définir la prochaine action ? Précisez votre objectif en une phrase.`;
}

function defaultSuggestions(): string[] {
  return [
    'Script d’ouverture d’appel',
    'Questions de qualification',
    'Prochaine action commerciale',
    'Planifier un rendez-vous'
  ];
}

function deriveSuggestions(content: string): string[] {
  const lower = content.toLowerCase();
  const s = new Set<string>();
  if (lower.includes('email')) s.add('Générer un email');
  if (lower.includes('rdv') || lower.includes('rendez')) s.add('Planifier un rendez-vous');
  if (lower.includes('analyse')) s.add('Analyser le lead');
  s.add('Prochaine action commerciale');
  return Array.from(s).slice(0,6);
}

// ---------- Facteur commun chat/generate-response ----------
// Index fichiers & symboles pour enrichissement code lorsque l'utilisateur pose des questions techniques
let __AI_CODE_INDEX: string[] | null = null;
let __AI_SYMBOL_INDEX: Record<string,string> | null = null;
// Cache simple en mémoire pour micro-summaries et analyses (TTL 90s)
interface CachedSummary { ts: number; summary: string }
const __AI_FILE_SUMMARY_CACHE: Record<string, CachedSummary> = {};
const __AI_FILE_SUMMARY_TTL = 90_000;
function __aiBuildCodeIndex() {
  if (__AI_CODE_INDEX) return __AI_CODE_INDEX;
  const base = path.join(process.cwd(), 'src');
  const acc: string[] = [];
  function walk(dir: string, depth = 0) {
    if (depth > 6) return;
    let entries: string[] = [];
    try { entries = fs.readdirSync(dir); } catch { return; }
    for (const e of entries) {
      const full = path.join(dir, e);
      if (/node_modules|\.git|dist|build/.test(full)) continue;
      let st: fs.Stats; try { st = fs.statSync(full); } catch { continue; }
      if (st.isDirectory()) walk(full, depth + 1);
      else if (/\.(ts|tsx|js|cjs|mjs)$/.test(e)) acc.push(full.substring(base.length + 1).replace(/\\/g,'/'));
    }
  }
  walk(base);
  __AI_CODE_INDEX = acc;
  return acc;
}
function __aiBuildSymbolIndex() {
  if (__AI_SYMBOL_INDEX) return __AI_SYMBOL_INDEX;
  const idx = __aiBuildCodeIndex();
  const m: Record<string,string> = {};
  for (const rel of idx.slice(0, 1200)) {
    try {
      const abs = path.join(process.cwd(),'src',rel);
      const content = fs.readFileSync(abs,'utf8');
      const regexes = [
        /export\s+class\s+([A-Za-z0-9_]+)/g,
        /export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/g,
        /export\s+const\s+([A-Za-z0-9_]+)/g,
        /export\s+interface\s+([A-Za-z0-9_]+)/g,
        /export\s+type\s+([A-Za-z0-9_]+)/g,
        /export\s+enum\s+([A-Za-z0-9_]+)/g,
      ];
      for (const r of regexes) { let match: RegExpExecArray | null; while ((match = r.exec(content))) { if (!m[match[1]]) m[match[1]] = rel; } }
      const brace = /export\s+{([^}]+)}/g; let b: RegExpExecArray | null;
      while ((b = brace.exec(content))) { b[1].split(',').map(s=>s.trim().split(/\s+as\s+/i)[0]).filter(Boolean).forEach(sym=> { if (!m[sym]) m[sym]=rel; }); }
    } catch {/* ignore */}
  }
  __AI_SYMBOL_INDEX = m; return m;
}
function __aiExtractReferencedFiles(message: string): string[] {
  const explicit = Array.from(message.matchAll(/([A-Za-z0-9_-]+\.(?:tsx?|jsx?|cjs|mjs))/g)).map(m=>m[1]);
  const extra: string[] = [];
  const hooks = Array.from(message.matchAll(/use[A-Z][A-Za-z0-9]+/g)).map(m=>m[0] + '.ts');
  extra.push(...hooks);
  const symbolTokens = Array.from(message.matchAll(/\b[A-Z][A-Za-z0-9_]{2,}\b/g)).map(m=>m[0]).slice(0,30);
  const symIdx = __aiBuildSymbolIndex();
  for (const t of symbolTokens) if (symIdx[t]) extra.push(symIdx[t]);
  const candidates = Array.from(new Set([...explicit, ...extra]));
  if (!candidates.length) return [];
  const index = __aiBuildCodeIndex();
  const resolved: string[] = [];
  for (const c of candidates) {
    if (c.includes('/')) { if (index.includes(c)) resolved.push(c); }
    else { const hit = index.find(p => p.endsWith('/'+c) || p === c); if (hit) resolved.push(hit); }
    if (resolved.length >= 5) break;
  }
  return resolved.slice(0,5);
}
function __aiSummarizeFile(rel: string): string | null {
  try {
    const now = Date.now();
    const cached = __AI_FILE_SUMMARY_CACHE[rel];
    if (cached && now - cached.ts < __AI_FILE_SUMMARY_TTL) return cached.summary;
    const abs = path.join(process.cwd(),'src',rel);
    if (!fs.existsSync(abs)) return null;
    const content = fs.readFileSync(abs,'utf8');
    const lines = content.split(/\r?\n/);
    const first = lines.slice(0, 80).join('\n');
    const importMatches = Array.from(content.matchAll(/import\s+[^;]+from\s+['"]([^'".][^'"/]*)['"]/g)).map(m=>m[1]).slice(0,8);
    const internalImports = Array.from(content.matchAll(/import\s+[^;]+from\s+['"](\.{1,2}\/[^'"]+)['"]/g)).map(m=>m[1]).slice(0,6);
    const exportMatches = Array.from(content.matchAll(/export\s+(?:default\s+)?(function|const|class)\s+([A-Za-z0-9_]+)/g)).map(m=>m[2]).slice(0,10);
    const hasDefault = /export\s+default\s+/.test(content);
    const hooksCount = (content.match(/\buse(State|Effect|Memo|Callback|Ref|Context|Reducer)\b/g)||[]).length;
    const useEffectCount = (content.match(/\buseEffect\b/g)||[]).length;
    const hasI18n = /\bt\(['"][^)]*\)/.test(content) || /i18n/.test(content);
    const jsxTags = (content.match(/<[A-Z][A-Za-z0-9]+\b/g)||[]).length;
    const size = lines.length;
  const risk: string[] = [];
    if (size > 800) risk.push('very_large'); else if (size > 400) risk.push('large');
    if (hooksCount > 18) risk.push('many_hooks');
    if (!hasI18n) risk.push('no_i18n');
    const summaryObj = {
      file: rel,
      lines: size,
      exports: exportMatches,
      defaultExport: hasDefault,
      importsExt: importMatches,
      importsInt: internalImports,
      hooks: { total: hooksCount, useEffect: useEffectCount },
      jsxTags,
      i18n: hasI18n,
      risks: risk
    };
    const summaryStr = 'FILE_SUMMARY '+rel+'\n'+JSON.stringify(summaryObj)+'\nFIRST_LINES:\n'+first.slice(0,1800);
    __AI_FILE_SUMMARY_CACHE[rel] = { ts: now, summary: summaryStr };
    return summaryStr;
  } catch { return null; }
}
async function handleChatLike(req: express.Request, res: express.Response, endpoint: string) {
  const t0 = Date.now();
  try {
    // Sécuriser le parsing du body (évite text/plain 500 + réponse JSON uniforme)
    let message: unknown, context: unknown, conversationHistory: unknown, analysis: unknown;
    try {
      ({ message, context = {}, conversationHistory = [], analysis } = req.body || {});
    } catch (parseErr) {
      return res.status(400).json({ success: false, error: 'Corps de requête invalide', details: (parseErr as Error).message });
    }
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: 'Paramètre "message" requis' });
    }
    console.log(`🤖 [AI] ${endpoint} message=`, message.slice(0,160));
    interface HistMsg { type?: string; role?: string; message?: string; content?: string }
    const historyPreview = (conversationHistory as HistMsg[]).slice(-6).map((m) => `${m.type || m.role}: ${(m.message || m.content || '').slice(0,100)}`);
    console.log('📚 [AI] History(last<=6)=', historyPreview);

    // Récupération mémoire système récente (SuperAdmin uniquement) – non bloquant
    let memoryString = '';
    try {
      const authReq = req as unknown as AuthenticatedRequest;
  interface MaybeSuperUser { isSuperAdmin?: boolean; roles?: string[] }
  const u = authReq.user as unknown as MaybeSuperUser | undefined;
  const isSuper = !!(u?.isSuperAdmin || u?.roles?.includes?.('super_admin'));
      if (isSuper) {
        const orgId = authReq.user?.organizationId || null;
        const memEntries = await prisma.aiUsageLog.findMany({
          where: { type: 'system_memory', ...(orgId ? { organizationId: orgId } : {}) },
          orderBy: { createdAt: 'desc' },
          take: 8,
          select: { errorMessage: true, meta: true, createdAt: true }
        });
        memoryString = memEntries.map(m => {
          const metaObj = m.meta as (Record<string, unknown> | null) ?? null;
          const topic = typeof metaObj?.topic === 'string' ? metaObj.topic : 'Mémo';
          return `- ${topic}: ${(m.errorMessage || '').replace(/\s+/g,' ').slice(0,180)}`;
        }).join('\n');
      }
    } catch (memErr) {
      console.warn('[AI] Mémoire système indisponible:', (memErr as Error).message);
    }

    // Enrichissement contexte fonctionnel interne dynamique
    let internalFunctionalContext = '';
    try {
      // Si la question mentionne gmail / email / délivrabilité -> récupérer état modules Google
      if (/gmail|email|mail|délivrabi|deliverab/i.test(message)) {
        const googleModules = await prisma.module.findMany({
          where: { key: { in: ['google_gmail', 'google_drive', 'google_calendar'] } },
          select: { key: true, label: true, route: true, feature: true }
        });
        const activated = googleModules.map(m => `${m.label || m.key}${m.route ? '(/'+m.route.replace(/^\//,'')+')' : ''}`).join(', ') || 'Aucun module Google activé';
        // Mode AUDIT PAGE Gmail: centrer la réponse sur la page actuelle (UI/UX), pas sur Gmail en général
        internalFunctionalContext = `AUDIT_PAGE_GMAIL: Concentre ta réponse sur l'audit de la page Gmail du CRM (UI/UX/flows), pas sur Gmail en général.
ModulesGoogleActifs: ${activated}
Checklist d'audit (prioriser concret et actionnable):
- Structure & lisibilité (layout, densité, hiérarchie visuelle)
- États (chargement/erreur/empty), feedbacks et affordances
- Actions clés: composer, répondre, transférer, étoiler, supprimer, naviguer par labels
- Recherche/tri/filtres/pagination ou scroll infini
- Accessibilité (A11y), raccourcis clavier, focus management
- Internationalisation (i18n), responsive/mobile
- Sécurité rendu HTML (sanitiser si HTML injecté)
- Liaison CRM: liens Lead/Opportunité/Tâches, suivi/relances
Restitue: Points forts, Problèmes, Améliorations, Ajouts à envisager, À retirer, Quick wins (priorisés).`;
      }
    } catch (ctxErr) {
      console.warn('[AI] Contexte fonctionnel Gmail non disponible:', (ctxErr as Error).message);
    }

    // Contexte code si question technique
    let codeContext = '';
    try {
      if (/(analyse|regarde|inspecte|code|fichier|hook|component|classe|fonction|page|gmail|module|google mail)/i.test(message)) {
        const referenced = __aiExtractReferencedFiles(message);
        if (referenced.length) {
          codeContext = referenced.map(r => __aiSummarizeFile(r) || (`// ${r} (lecture impossible)`)).join('\n\n');
        }
      }
    } catch (e) { console.warn('[AI] Contexte code échoué:', (e as Error).message); }

    // Analyse automatique (page & feature) – heuristique légère pour alimenter le raisonnement sans surcoût externe
    interface AutoPageAnalysis { path: string; lines: number; hooks: { total: number; useEffect: number; custom: string[] }; antd: string[]; i18n: boolean; tailwind: boolean; complexity: string[]; suggestions: string[]; score: number }
    interface AutoFeatureSummary { feature: string; fileCount: number; totalLines: number; avgLines: number; totalHooks: number; i18nCoverage: number; antdUsageRate: number; tailwindUsageRate: number }
    let autoAnalysis: { page?: AutoPageAnalysis; feature?: AutoFeatureSummary } | null = null;
    try {
  const ctxObj = (context || {}) as { currentPage?: string; currentModule?: string };
  const maybePage = ctxObj.currentPage;
  const maybeModule = ctxObj.currentModule;
      const lowerMsg = message.toLowerCase();
      const wantAnalysis = /(analyse|audite|qualité|amélior|refactor|optimis|structure|complexité|lisibilité|accessibilité|ux|ui)/i.test(message);
      // Local helper to find a page file
      function resolvePageFile(name?: string): string | null {
        if (!name) return null;
        const base = path.join(process.cwd(),'src','pages');
        // If name already looks like path relative to src/pages
        if (name.endsWith('.tsx') && fs.existsSync(path.join(process.cwd(),'src',name))) return name;
        // Try direct
        const candidate = path.join(base, name.endsWith('.tsx')? name : name + '.tsx');
        if (fs.existsSync(candidate)) return 'pages/' + path.basename(candidate); // shortened path not ideal; fallback search
        // Shallow search
        try {
          const entries = fs.readdirSync(base);
          const hit = entries.find(e => e.toLowerCase() === (name.toLowerCase().endsWith('.tsx')? name.toLowerCase(): name.toLowerCase()+'.tsx'));
          if (hit) return 'pages/' + hit;
        } catch {/* ignore */}
        return null;
      }
      // Attempt detect feature from message or context
      let featureKey: string | null = null;
      const featureMapPath = path.join(process.cwd(),'src','feature-map.json');
      let featureMap: Record<string, { primaryPages?: string[]; relatedServices?: string[] }> | null = null;
      if (fs.existsSync(featureMapPath)) {
        try { featureMap = JSON.parse(fs.readFileSync(featureMapPath,'utf8')); } catch {/* ignore */}
      }
      if (featureMap) {
        for (const k of Object.keys(featureMap)) {
          if (lowerMsg.includes(k) || (maybeModule && maybeModule.toLowerCase().includes(k))) { featureKey = k; break; }
        }
        // heuristiques sémantiques simples
        if (!featureKey) {
          if (/gmail|email|inbox/.test(lowerMsg)) featureKey = 'mail';
          else if (/lead/.test(lowerMsg)) featureKey = 'leads';
          else if (/agenda|calendar|calendrier/.test(lowerMsg)) featureKey = 'agenda';
        }
      }
      let pagePath: string | null = null;
      if (maybePage) pagePath = resolvePageFile(maybePage);
      if (!pagePath && /(page|mailpage|googlemailpage|inbox)/i.test(message)) {
        // Try guess one of main mail pages
        const guess = [ 'pages/GoogleMailPageFixed_New.tsx','pages/GoogleMailPageFixed.tsx','pages/GoogleMailPage.tsx','pages/MailPage.tsx' ];
        pagePath = guess.find(g => fs.existsSync(path.join(process.cwd(),'src',g))) || null;
      }
      if ((wantAnalysis || featureKey || pagePath) && (featureKey || pagePath)) {
        autoAnalysis = {};
        // Page analysis
        if (pagePath && fs.existsSync(path.join(process.cwd(),'src',pagePath))) {
          try {
            const absPage = path.join(process.cwd(),'src',pagePath);
            const content = fs.readFileSync(absPage,'utf8');
            const linesArr = content.split(/\r?\n/);
            const hooksCount = (content.match(/\buse(State|Effect|Memo|Callback|Ref|Context|Reducer)\b/g) || []).length;
            const useEffectCount = (content.match(/\buseEffect\b/g) || []).length;
            const customHooks = (content.match(/\buse[A-Z][A-Za-z0-9_]*/g) || []).filter(h => !/use(State|Effect|Memo|Callback|Ref|Context|Reducer)/.test(h));
            const antdComponents = Array.from(new Set(((content.match(/<([A-Z][A-Za-z0-9]+)\b/g) || []).map(m=>m.slice(1))).filter(n=>/^(Button|Table|Form|Modal|Input|Select|DatePicker|Tabs|Tag|Tooltip|Dropdown|Menu|Layout|Card|Space|Flex|Grid|Alert|Avatar|Badge)$/.test(n)))).sort();
            const hasI18n = /\bt\(['"][^)]*\)/.test(content) || /i18n/.test(content);
            const usesTailwind = /className="[^"]*(flex|grid|px-|py-|text-|bg-|rounded|shadow)/.test(content);
            const large = linesArr.length > 400;
            const veryLarge = linesArr.length > 800;
            const complexity: string[] = [];
            if (large) complexity.push('taille>400');
            if (veryLarge) complexity.push('taille>800');
            if (hooksCount > 18) complexity.push('hooks>18');
            if (useEffectCount > 7) complexity.push('useEffect>7');
            const suggestions: string[] = [];
            if (large) suggestions.push('Scinder en sous-composants logiques');
            if (!hasI18n) suggestions.push('Internationaliser textes statiques');
            if (!/Skeleton|Spin|isLoading/.test(content) && /api\.(get|post|put|delete)/.test(content)) suggestions.push('Afficher état de chargement (Skeleton/Spin)');
            if (!/ErrorBoundary|ErrorFallback/.test(content) && useEffectCount > 0) suggestions.push('Ajouter ErrorBoundary');
            if (antdComponents.includes('Table') && !/pagination/i.test(content)) suggestions.push('Ajouter pagination / tri sur Table');
            if (/dangerouslySetInnerHTML/.test(content)) suggestions.push('Sanitiser le contenu HTML (DOMPurify) pour éviter le XSS');
            let score = 85; if (large) score -=5; if (veryLarge) score -=8; if (hooksCount>18) score -=5; if (!hasI18n) score -=4; score = Math.max(30, Math.min(95, score));
            autoAnalysis.page = { path: pagePath, lines: linesArr.length, hooks: { total: hooksCount, useEffect: useEffectCount, custom: Array.from(new Set(customHooks)).slice(0,25) }, antd: antdComponents, i18n: hasI18n, tailwind: usesTailwind, complexity, suggestions: suggestions.slice(0,20), score };
          } catch (e) { console.warn('[AI] Analyse page échouée:', (e as Error).message); }
        }
        // Feature aggregate
        if (featureKey && featureMap && featureMap[featureKey]) {
          try {
            const def = featureMap[featureKey];
            const files = [...(def.primaryPages||[]), ...(def.relatedServices||[])].filter(Boolean).slice(0,30);
            let totalLines=0, totalHooks=0, i18nYes=0, antdYes=0, tailwindYes=0, count=0;
            for (const f of files) {
              const absF = path.join(process.cwd(),f);
              if (!fs.existsSync(absF)) continue;
              count++;
              const content = fs.readFileSync(absF,'utf8');
              const linesArr = content.split(/\r?\n/); totalLines += linesArr.length;
              const hooksCount = (content.match(/\buse(State|Effect|Memo|Callback|Ref|Context|Reducer)\b/g) || []).length; totalHooks += hooksCount;
              const hasI18n = /\bt\(['"][^)]*\)/.test(content) || /i18n/.test(content); if (hasI18n) i18nYes++;
              if (/from ['"]antd['"]/g.test(content)) antdYes++;
              if (/className="[^"]*(flex|grid|px-|py-|text-|bg-|rounded|shadow)/.test(content)) tailwindYes++;
            }
            if (count) {
              autoAnalysis.feature = { feature: featureKey, fileCount: count, totalLines, avgLines: Math.round(totalLines / count), totalHooks, i18nCoverage: i18nYes / count, antdUsageRate: antdYes / count, tailwindUsageRate: tailwindYes / count };
            }
          } catch (e) { console.warn('[AI] Analyse feature échouée:', (e as Error).message); }
        }
      }
    } catch (e) { console.warn('[AI] Auto-analysis failed:', (e as Error).message); }

    const memoryCombined = memoryString ? memoryString + (internalFunctionalContext ? '\n'+internalFunctionalContext : '') : internalFunctionalContext;
    // Fusionner éventuelle analyse existante (fourni côté client) et autoAnalysis
    const mergedAnalysis = (() => {
      if (analysis && autoAnalysis) return { client: analysis, auto: autoAnalysis };
      if (autoAnalysis) return { auto: autoAnalysis };
      if (analysis) return analysis;
      return null;
    })();
  const prompt = buildChatPrompt({ message, context, conversationHistory, analysis: mergedAnalysis, memory: (memoryCombined + (codeContext ? '\nCODE_CONTEXT:\n'+codeContext.slice(0,6000) : '')).trim() });

    // Appel service public
  const serviceResp = await geminiSingleton.chat({ prompt });
  const isLive = serviceResp.mode === 'live';
  // En mode simulé, générer un mock contextuel local au lieu du message générique du service
  const aiText = isLive ? (serviceResp.content || buildMockResponse(message, context as PromptContext)) : buildMockResponse(message, context as PromptContext);
    let suggestions: string[] = [];
    try {
      suggestions = isLive ? deriveSuggestions(aiText) : defaultSuggestions();
    } catch (sugErr) {
      console.warn('⚠️ [AI] Erreur génération suggestions:', sugErr);
      suggestions = defaultSuggestions();
    }

    const latency = Date.now() - t0;
    // Préparer une version condensée de l'analyse pour le frontend
    let analysisPayload: unknown = null;
    if (mergedAnalysis) {
      try {
        const str = JSON.stringify(mergedAnalysis);
        if (str.length > 12000) {
          analysisPayload = { truncated: true, size: str.length, excerpt: str.slice(0,6000) };
        } else {
          analysisPayload = mergedAnalysis;
        }
      } catch { analysisPayload = { error: 'serialization_failed' }; }
    }
    // Standardiser le champ data.analysis pour éviter de dépendre du parsing markdown côté client
    const standardizedAnalysis = (() => {
      // Si on a déjà une analyse côté serveur (mergedAnalysis), la renvoyer (ou sa version tronquée)
      if (analysisPayload) return analysisPayload;
      // Sinon, fournir au minimum un squelette avec excerpt de la réponse AI
      const minimal = { excerpt: aiText.slice(0, 1800) };
      return { auto: minimal };
    })();

    res.json({
      success: true,
      data: {
        response: aiText,
        suggestions,
        confidence: 0.92,
        analysis: standardizedAnalysis,
        metadata: {
          model: isLive ? (process.env.GEMINI_MODEL || 'gemini-1.5-flash') : 'mock',
          generatedAt: new Date().toISOString(),
      latencyMs: latency,
          mode: serviceResp.mode,
          context: context?.currentPage || 'unknown',
          fallbackError: serviceResp.error,
          endpoint
        }
      }
    });
  void logAiUsage({
      req,
      endpoint,
      success: true,
      latencyMs: latency,
      model: isLive ? (process.env.GEMINI_MODEL || 'gemini-1.5-flash') : 'mock',
      mode: serviceResp.mode,
      error: serviceResp.error ? String(serviceResp.error) : null,
      extraMeta: {
        conversationPreview: {
          lastUserMessage: message.slice(0,200),
          aiResponse: aiText.slice(0,200),
          suggestions,
          memoryUsed: !!memoryString,
          memoryChars: memoryString.length
        }
      }
    });
  } catch (error) {
    console.error(`❌ Erreur route ${endpoint}:`, error);
    res.status(500).json({ success: false, error: `Erreur IA (${endpoint})`, details: (error as Error).message });
  void logAiUsage({ req, endpoint, success: false, latencyMs: Date.now() - t0, model: null, mode: null, error: (error as Error).message });
  }
}

/**
 * 📅 POST /api/ai/schedule-recommendations
 * Génère des recommandations de créneaux intelligentes
 */
router.post('/schedule-recommendations', async (req, res) => {
  const t0 = Date.now();
  try {
    const { leadId, targetDate, preferences, constraints } = req.body;
    
    console.log('📅 [AI] Génération recommandations planning pour lead:', leadId);
    console.log('📆 [AI] Date cible:', targetDate);
    console.log('⚙️ [AI] Préférences:', preferences);
    console.log('🚫 [AI] Contraintes:', constraints);
    
    // Simulation de recommandations intelligentes (à remplacer par l'API Gemini)
    const mockRecommendations = [
      {
        id: 'rec-1',
        type: 'optimal',
        datetime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Demain
        duration: 60,
        confidence: 0.92,
        reasoning: "Créneau optimal basé sur l'historique des rendez-vous réussis",
        priority: 'high',
        metadata: {
          leadScore: 85,
          bestTimeWindow: '09:00-11:00',
          sectoralInsight: 'Les prospects B2B répondent mieux le matin'
        }
      },
      {
        id: 'rec-2',
        type: 'alternative',
        datetime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Après-demain
        duration: 45,
        confidence: 0.78,
        reasoning: "Alternative solide avec disponibilité confirmée",
        priority: 'medium',
        metadata: {
          leadScore: 85,
          bestTimeWindow: '14:00-16:00',
          sectoralInsight: 'Bon taux de conversion en début d\'après-midi'
        }
      },
      {
        id: 'rec-3',
        type: 'backup',
        datetime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Dans 3 jours
        duration: 30,
        confidence: 0.65,
        reasoning: "Option de secours si les autres créneaux ne conviennent pas",
        priority: 'low',
        metadata: {
          leadScore: 85,
          bestTimeWindow: '16:00-17:00',
          sectoralInsight: 'Fin de journée acceptable pour ce secteur'
        }
      }
    ];
    
    // Délai simulé pour l'API
    await new Promise(resolve => setTimeout(resolve, 800));
    
  const latency = Date.now() - t0;
  res.json({
      success: true,
      data: {
        recommendations: mockRecommendations,
        totalOptions: mockRecommendations.length,
        analysisDate: new Date().toISOString(),
        metadata: {
          leadId,
          targetDate,
          analysisModel: "gemini-pro-scheduling",
          factors: [
            "Historique des rendez-vous",
            "Préférences du lead",
            "Analyse sectorielle",
            "Optimisation conversion"
          ]
        }
      }
    });
  void logAiUsage({ req, endpoint: 'schedule-recommendations', success: true, latencyMs: latency, model: 'mock', mode: 'mock' });
    
  } catch (error) {
    console.error('❌ Erreur route schedule-recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération des recommandations',
      details: error.message
    });
  void logAiUsage({ req, endpoint: 'schedule-recommendations', success: false, latencyMs: Date.now() - t0, model: null, mode: null, error: (error as Error).message });
  }
});

/**
 * 🗓️ POST /api/ai/schedule-explain
 * Fournit une explication IA (ou mock) d'une sélection de créneaux proposés / choisis.
 * Body: { slots: [{ start: string, end: string }], objective?: string, lead?: { name?: string, sector?: string } }
 */
router.post('/schedule-explain', async (req, res) => {
  const t0 = Date.now();
  try {
    const { slots = [], objective = 'planifier un rendez-vous', lead = {} } = req.body || {};
    if (!Array.isArray(slots) || slots.length === 0) {
      return res.status(400).json({ success: false, error: 'Aucun créneau fourni' });
    }
    const norm = slots.slice(0,6).map((s) => ({ start: s.start, end: s.end }));
    const prompt = `Analyse les créneaux suivants pour ${objective} avec le lead ${lead.name || 'inconnu'} (${lead.sector || 'secteur standard'}).
Créneaux ISO:
${norm.map((c,i)=>`#${i+1} ${c.start} -> ${c.end}`).join('\n')}
Tâches:
1. Identifier le meilleur créneau (justifier).
2. Donner 3 facteurs clés (brefs).
3. Indiquer si un autre créneau serait à éviter.
Réponds en français concis (<=110 mots).`;
    const serviceResp = await geminiSingleton.chat({ prompt });
    const explanation = serviceResp.content || 'Analyse simulée: créneau central recommandé pour maximiser disponibilité et énergie.';
  const latency = Date.now() - t0;
  res.json({
      success: true,
      data: {
        explanation,
        mode: serviceResp.mode,
        model: serviceResp.mode === 'live' ? (process.env.GEMINI_MODEL || 'gemini-1.5-flash') : 'mock',
    latencyMs: latency,
        slots: norm,
        fallbackError: serviceResp.error
      }
    });
  void logAiUsage({ req, endpoint: 'schedule-explain', success: true, latencyMs: latency, model: serviceResp.mode === 'live' ? (process.env.GEMINI_MODEL || 'gemini-1.5-flash') : 'mock', mode: serviceResp.mode, error: serviceResp.error ? String(serviceResp.error) : null });
  } catch (error) {
    console.error('❌ Erreur route schedule-explain:', error);
  res.status(500).json({ success: false, error: 'Erreur explication planning', details: (error as Error).message });
  void logAiUsage({ req, endpoint: 'schedule-explain', success: false, latencyMs: Date.now() - t0, model: null, mode: null, error: (error as Error).message });
  }
});

/**
 * 🎯 POST /api/ai/analyze-conversation
 * Analyse une conversation vocale transcrite
 */
router.post('/analyze-conversation', async (req, res) => {
  const t0 = Date.now();
  try {
    const { transcription, context, speakers } = req.body;
    
    console.log('🎯 [AI] Analyse conversation vocale');
    console.log('📝 [AI] Transcription longueur:', transcription?.length || 0, 'caractères');
    console.log('🎯 [AI] Contexte:', context);
    console.log('👥 [AI] Interlocuteurs:', speakers?.length || 0);
    
    // Simulation d'analyse de conversation
    const mockAnalysis = {
      sentiment: {
        overall: 'positive',
        score: 0.75,
        confidence: 0.88
      },
      keyPoints: [
        "Intérêt exprimé pour la solution",
        "Questions sur les prix",
        "Demande de démonstration"
      ],
      actionItems: [
        "Envoyer proposition commerciale",
        "Planifier démonstration produit",
        "Suivre dans 3 jours"
      ],
      leadScore: 78,
      nextSteps: [
        {
          action: "send_proposal",
          priority: "high",
          deadline: new Date(Date.now() + 24 * 60 * 60 * 1000)
        },
        {
          action: "schedule_demo",
          priority: "medium",
          deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        }
      ]
    };
    
  const latency = Date.now() - t0;
  res.json({
      success: true,
      data: mockAnalysis
    });
  void logAiUsage({ req, endpoint: 'analyze-conversation', success: true, latencyMs: latency, model: 'mock', mode: 'mock' });
    
  } catch (error) {
    console.error('❌ Erreur route analyze-conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'analyse de la conversation',
      details: error.message
    });
  void logAiUsage({ req, endpoint: 'analyze-conversation', success: false, latencyMs: Date.now() - t0, model: null, mode: null, error: (error as Error).message });
  }
});

/**
 * 🧪 GET /api/ai/test
 * Route de test pour vérifier la connexion IA
 */
router.get('/test', async (req, res) => {
  try {
    console.log('🧪 [AI] Test de connexion IA');
    
    res.json({
      success: true,
      message: 'Service IA opérationnel',
      timestamp: new Date().toISOString(),
      features: [
        'Génération de réponses',
        'Recommandations de planning',
        'Analyse de conversations',
        'Assistant vocal'
      ]
    });
  } catch (error) {
    console.error('❌ Erreur test IA:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du test IA',
      error: error.message
    });
  }
});

/**
 * ⚙️ GET /api/ai/status
 * Expose l'état courant (live/mock) pour le frontend.
 */
router.get('/status', async (_req, res) => {
  try {
  // @ts-expect-error accès method optionnel au runtime
    const status = geminiSingleton.getStatus?.() || { mode: geminiSingleton.isLive() ? 'live':'mock' };
    res.json({
      success: true,
      data: {
        ...status,
        aiModeFlag: process.env.AI_MODE || 'auto',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erreur status IA', details: (error as Error).message });
  }
});

/**
 * 📦 GET /api/ai/context/summary
 * Résumé contextuel léger pour alimenter l'assistant (R1). Limite volontaire pour rester < token budget.
 * Fournit: user, organization, modules actifs, 5 leads récents, 5 prochains événements.
 */
router.get('/context/summary', async (req, res) => {
  const t0 = Date.now();
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const orgId = authReq.user?.organizationId || null;
    const userId = authReq.user?.userId || null;
    const fieldsParam = (req.query.fields as string | undefined)?.toLowerCase();
    // Par défaut on retourne tout (modules, leads, events) – permet backward compatibility
    const wanted = new Set((fieldsParam ? fieldsParam.split(',') : ['modules','leads','events']).map(s=>s.trim()).filter(Boolean));
    if (!userId) return res.status(401).json({ success: false, error: 'Non authentifié' });
    if (!orgId) {
      return res.json({
        success: true,
        data: {
      user: { id: userId, role: authReq.user?.role, superAdmin: authReq.user?.isSuperAdmin },
          organization: null,
      modules: wanted.has('modules') ? [] : undefined,
      leads: wanted.has('leads') ? [] : undefined,
      upcomingEvents: wanted.has('events') ? [] : undefined,
      meta: { generatedAt: new Date().toISOString(), orgContext: false, version: 1, filtered: Array.from(wanted) }
        }
      });
    }

    // Requêtes parallèles minimales
    const [organization, moduleStatuses, leads, events] = await Promise.all([
  prisma.organization.findUnique({ where: { id: orgId }, select: { id: true, name: true } }),
  wanted.has('modules') ? prisma.organizationModuleStatus.findMany({
        where: { organizationId: orgId, active: true },
        include: { Module: { select: { key: true, feature: true, label: true, route: true, description: true } } },
        orderBy: { createdAt: 'asc' }
  }) : Promise.resolve([]),
  wanted.has('leads') ? prisma.lead.findMany({
        where: { organizationId: orgId },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true, firstName: true, lastName: true, company: true, status: true,
          nextFollowUpDate: true, updatedAt: true, assignedToId: true
        }
  }) : Promise.resolve([]),
  wanted.has('events') ? prisma.calendarEvent.findMany({
        where: { organizationId: orgId, startDate: { gte: new Date() } },
        orderBy: { startDate: 'asc' },
        take: 5,
        select: { id: true, title: true, startDate: true, endDate: true, type: true, status: true, linkedLeadId: true, ownerId: true }
  }) : Promise.resolve([])
    ]);

    const modules = moduleStatuses.map(ms => ({
      key: ms.Module.key,
      feature: ms.Module.feature,
      label: ms.Module.label,
      route: ms.Module.route,
      description: ms.Module.description
    }));

  const latency = Date.now() - t0;
  res.json({
      success: true,
      data: {
  user: { id: userId, role: authReq.user?.role, superAdmin: authReq.user?.isSuperAdmin },
  organization,
  modules: wanted.has('modules') ? modules : undefined,
  leads: wanted.has('leads') ? leads : undefined,
  upcomingEvents: wanted.has('events') ? events : undefined,
  meta: { generatedAt: new Date().toISOString(), counts: { modules: modules.length, leads: leads.length, events: events.length }, version: 1, filtered: Array.from(wanted) }
      }
    });
  void logAiUsage({ req, endpoint: 'context-summary', success: true, latencyMs: latency, model: 'internal', mode: 'context' });
  } catch (error) {
    console.error('❌ Erreur /api/ai/context/summary:', error);
  res.status(500).json({ success: false, error: 'Erreur récupération contexte IA', details: (error as Error).message });
  void logAiUsage({ req, endpoint: 'context-summary', success: false, latencyMs: Date.now() - t0, model: null, mode: 'context', error: (error as Error).message });
  }
});

/**
 * 🔍 GET /api/ai/context/lead/:id
 * Contexte détaillé d'un lead (R2). Inclut méta, derniers appels / messages, prochains événements, timeline récente.
 */
router.get('/context/lead/:id', async (req, res) => {
  const leadId = req.params.id;
  interface ReqUser { organizationId?: string | null }
  const orgId = (req as express.Request & { user?: ReqUser }).user?.organizationId || null;
  if (!orgId) return res.status(400).json({ success: false, error: 'Organisation requise' });
  const t0 = Date.now();
  try {
    const fieldsParam = (req.query.fields as string | undefined)?.toLowerCase();
    const wanted = new Set((fieldsParam ? fieldsParam.split(',') : ['calls','messages','events','timeline']).map(s=>s.trim()).filter(Boolean));
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId: orgId },
      select: {
        id: true, firstName: true, lastName: true, company: true, email: true, phone: true,
        status: true, source: true, nextFollowUpDate: true, updatedAt: true, createdAt: true,
        assignedToId: true, notes: true
      }
    });
    if (!lead) return res.status(404).json({ success: false, error: 'Lead introuvable' });

    const [calls, messages, upcomingEvents, timeline] = await Promise.all([
      wanted.has('calls') ? prisma.telnyxCall.findMany({
        where: { leadId, organizationId: orgId },
        orderBy: { startedAt: 'desc' },
        take: 5,
        select: { id: true, direction: true, status: true, duration: true, startedAt: true }
      }) : Promise.resolve([]),
      wanted.has('messages') ? prisma.telnyxMessage.findMany({
        where: { leadId, organizationId: orgId },
        orderBy: { sentAt: 'desc' },
        take: 5,
        select: { id: true, direction: true, type: true, status: true, sentAt: true, text: true }
      }) : Promise.resolve([]),
      wanted.has('events') ? prisma.calendarEvent.findMany({
        where: { linkedLeadId: leadId, organizationId: orgId, startDate: { gte: new Date() } },
        orderBy: { startDate: 'asc' },
        take: 3,
        select: { id: true, title: true, startDate: true, endDate: true, type: true, status: true }
      }) : Promise.resolve([]),
      wanted.has('timeline') ? prisma.timelineEvent.findMany({
        where: { leadId, organizationId: orgId },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: { id: true, eventType: true, createdAt: true }
      }) : Promise.resolve([])
    ]);

    // Score heuristique (simplifié) pour priorisation IA
    const activityScore = calls.length * 2 + messages.length + (upcomingEvents.length * 3);

  const latency = Date.now() - t0;
  res.json({
      success: true,
      data: {
        lead,
        calls: wanted.has('calls') ? calls : undefined,
        messages: wanted.has('messages') ? messages : undefined,
        upcomingEvents: wanted.has('events') ? upcomingEvents : undefined,
        timeline: wanted.has('timeline') ? timeline : undefined,
        metrics: { activityScore },
        meta: { generatedAt: new Date().toISOString(), version: 1, filtered: Array.from(wanted) }
      }
    });
  void logAiUsage({ req, endpoint: 'context-lead', success: true, latencyMs: latency, model: 'internal', mode: 'context' });
  } catch (error) {
    console.error('❌ Erreur /api/ai/context/lead/:id', error);
  res.status(500).json({ success: false, error: 'Erreur contexte lead', details: (error as Error).message });
  void logAiUsage({ req, endpoint: 'context-lead', success: false, latencyMs: Date.now() - t0, model: null, mode: 'context', error: (error as Error).message });
  }
});

/**
 * 📦 GET /api/ai/context/leads (batch) ?ids=id1,id2&id2
 * Limité à 10 IDs pour éviter surcharge.
 */
router.get('/context/leads', async (req, res) => {
  interface ReqUser { organizationId?: string | null }
  const orgId = (req as express.Request & { user?: ReqUser }).user?.organizationId || null;
  if (!orgId) return res.status(400).json({ success: false, error: 'Organisation requise' });
  const idsParam = (req.query.ids as string | undefined) || '';
  const ids = Array.from(new Set(idsParam.split(',').map(s=>s.trim()).filter(Boolean))).slice(0,10);
  if (!ids.length) return res.status(400).json({ success: false, error: 'Paramètre ids requis' });
  const t0 = Date.now();
  try {
    const leads = await prisma.lead.findMany({
      where: { id: { in: ids }, organizationId: orgId },
      select: { id: true, firstName: true, lastName: true, company: true, status: true, updatedAt: true, nextFollowUpDate: true }
    });
    const latency = Date.now() - t0;
    res.json({
      success: true,
      data: {
        count: leads.length,
        leads,
        missing: ids.filter(id => !leads.some(l => l.id === id)),
        meta: { generatedAt: new Date().toISOString(), version: 1 }
      }
    });
  void logAiUsage({ req, endpoint: 'context-leads-batch', success: true, latencyMs: latency, model: 'internal', mode: 'context' });
  } catch (error) {
    console.error('❌ Erreur /api/ai/context/leads (batch)', error);
    res.status(500).json({ success: false, error: 'Erreur contexte leads batch', details: (error as Error).message });
  void logAiUsage({ req, endpoint: 'context-leads-batch', success: false, latencyMs: Date.now() - t0, model: null, mode: 'context', error: (error as Error).message });
  }
});

/**
 * 🧠 POST /api/ai/ultimate-recommendation
 * Génère une analyse ultime et intelligente pour proposer la meilleure date de RDV
 */
router.post('/ultimate-recommendation', async (req, res) => {
  const t0 = Date.now();
  try {
    const { lead, context } = req.body;
    
    console.log('🧠 [AI Ultimate] Analyse pour:', lead.name);
    console.log('📊 [AI Ultimate] RDV existants:', context.existingAppointments?.length || 0);
    console.log('📞 [AI Ultimate] Transcriptions:', context.callTranscriptions?.length || 0);
    console.log('📝 [AI Ultimate] Notes:', context.notes?.length || 0);
    
    // Simulation d'analyse intelligente basée sur l'expérience commerciale mondiale
    const mockAnalysis = {
      // Analyse des patterns comportementaux
      behavioralPattern: analyzeCallBehavior(context.callTranscriptions),
      // Optimisation géographique des déplacements
      geographicalOptimization: optimizeGeography(context.existingAppointments, lead),
      // Insights sectoriels 
      sectoralInsights: getSectoralInsights(lead.sector),
      // Expérience commerciale accumulée
      commercialWisdom: getCommercialWisdom(lead, context)
    };

    // Calcul de la date optimale
    const optimalDate = calculateOptimalDate(mockAnalysis, context);
    
    const ultimateRecommendation = {
      proposedDate: optimalDate,
      reasoning: `📊 **ANALYSE COMMERCIALE EXPERTE** 

🎯 **Date recommandée**: ${optimalDate.toLocaleDateString('fr-FR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}

💡 **Justification stratégique**:
${mockAnalysis.commercialWisdom.primaryReason}

🔍 **Facteurs analysés**:
• **Historique comportemental**: ${mockAnalysis.behavioralPattern}
• **Optimisation trajets**: ${mockAnalysis.geographicalOptimization}  
• **Intelligence sectorielle**: ${mockAnalysis.sectoralInsights}
• **Expérience terrain**: ${mockAnalysis.commercialWisdom.experience}

⚡ **Pourquoi cette date maximise vos chances**:
${mockAnalysis.commercialWisdom.successFactors.join('\n• ')}

🎯 **Taux de réussite estimé**: ${mockAnalysis.commercialWisdom.successRate}%`,
      
      confidence: mockAnalysis.commercialWisdom.confidence,
      factors: {
        callHistory: mockAnalysis.behavioralPattern,
        notes: `${context.notes?.length || 0} notes analysées`,
        geographicalOptimization: mockAnalysis.geographicalOptimization,
        behavioralPattern: "Pattern de réceptivité détecté",
        sectoralInsight: mockAnalysis.sectoralInsights,
        commercialExperience: mockAnalysis.commercialWisdom.experience
      },
      alternatives: [
        {
          date: new Date(optimalDate.getTime() + 24 * 60 * 60 * 1000),
          reason: "Alternative si conflit de dernière minute"
        },
        {
          date: new Date(optimalDate.getTime() + 48 * 60 * 60 * 1000), 
          reason: "Option de repli avec très bon potentiel"
        }
      ]
    };

    // Délai simulé pour l'analyse complexe
    await new Promise(resolve => setTimeout(resolve, 1500));

  const latency = Date.now() - t0;
  res.json({
      success: true,
      data: {
        recommendation: ultimateRecommendation,
        analysisMetadata: {
          processingTime: "1.2s",
          factorsAnalyzed: 127,
          dataPoints: context.callTranscriptions?.length * 15 + context.notes?.length * 8,
          confidenceLevel: "Très élevé"
        }
      }
    });
  void logAiUsage({ req, endpoint: 'ultimate-recommendation', success: true, latencyMs: latency, model: 'mock', mode: 'analysis' });

  } catch (error) {
    console.error('❌ Erreur route ultimate-recommendation:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'analyse ultime',
      details: error.message
    });
  void logAiUsage({ req, endpoint: 'ultimate-recommendation', success: false, latencyMs: Date.now() - t0, model: null, mode: 'analysis', error: (error as Error).message });
  }
});

// Fonctions d'analyse (simulation d'IA avancée)
function analyzeCallBehavior(transcriptions) {
  if (!transcriptions?.length) return "Aucun historique d'appel à analyser";
  
  // Simulation d'analyse des patterns de communication
  return `${transcriptions.length} appels analysés - Réceptivité optimale détectée en matinée`;
}

function optimizeGeography(appointments: { startDate?: Date }[] | undefined) {
  if (!appointments?.length) return "Premier RDV dans le secteur";
  
  // Simulation d'optimisation géographique
  return `Optimisation trajets: 23 min économisées vs planning classique`;
}

function getSectoralInsights(sector) {
  const insights = {
    'technology': "Secteur tech: +47% de conversion en début de semaine",
    'healthcare': "Santé: Éviter vendredi après-midi (-23% taux réponse)",
    'finance': "Finance: Mardi-Jeudi matin optimal (+31% signature)",
    'retail': "Commerce: Lundi/Mardi hors périodes saisonnières",
    'default': "Secteur standard: Mardi-Jeudi 9h-11h optimaux"
  };
  
  return insights[sector] || insights['default'];
}

function getCommercialWisdom(lead: { name?: string }) {
  return {
    primaryReason: `Créneau optimal identifié grâce à l'analyse de 50,000+ RDV commerciaux similaires. Cette plage horaire présente 67% de taux de conversion supérieur pour le profil "${lead.name}".`,
    
    experience: "15 ans d'expérience commerciale B2B analysée",
    
    successFactors: [
      "Moment de réceptivité maximale selon le profil comportemental",
      "Absence de conflits avec les pics de charge du prospect", 
      "Timing optimal pour la prise de décision dans ce secteur",
      "Fenêtre de disponibilité mentale favorable (post-caffé, pré-rush)"
    ],
    
    successRate: Math.floor(75 + Math.random() * 20), // 75-95%
    confidence: 0.89
  };
}

function calculateOptimalDate() {
  // Simulation de calcul intelligent de date
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + 2); // Dans 2 jours par défaut
  baseDate.setHours(10, 0, 0, 0); // 10h optimal pour B2B
  
  // Éviter les vendredis après-midi et lundis matin
  if (baseDate.getDay() === 5 && baseDate.getHours() > 14) {
    baseDate.setDate(baseDate.getDate() + 3); // Reporter au lundi
    baseDate.setHours(10, 0, 0, 0);
  }
  
  if (baseDate.getDay() === 1 && baseDate.getHours() < 10) {
    baseDate.setHours(10, 0, 0, 0); // Pas avant 10h le lundi
  }
  
  return baseDate;
}

/**
 * 📈 GET /api/ai/usage/recent
 * Récupère les derniers logs d'usage IA (non sensible). Filtrage basique.
 * Query: limit (1-200, défaut 30), type, success (true/false)
 */
router.get('/usage/recent', async (req, res) => {
  const t0 = Date.now();
  try {
    await ensureAiUsageLogTable();
    const rawLimit = parseInt(String(req.query.limit || '30'), 10);
    const limit = Math.min(200, Math.max(1, isNaN(rawLimit) ? 30 : rawLimit));
    const type = typeof req.query.type === 'string' ? req.query.type : undefined;
    const successFilter = typeof req.query.success === 'string' ? req.query.success === 'true' : undefined;
    // Préparation filtre Prisma si modèle disponible
  interface RawLogMeta { endpoint?: string; mode?: string; [k: string]: unknown }
  interface RawLog { id: string; type: string; model?: string | null; tokensPrompt?: number | null; tokensOutput?: number | null; latencyMs?: number | null; success: boolean; errorCode?: string | null; errorMessage?: string | null; createdAt: Date; meta?: RawLogMeta | null }
  let logs: RawLog[] = [];
    let usedPrisma = false;
    try {
      if (prisma.aiUsageLog) {
        logs = await prisma.aiUsageLog.findMany({
          where: {
            ...(type ? { type } : {}),
            ...(successFilter !== undefined ? { success: successFilter } : {})
          },
            orderBy: { createdAt: 'desc' },
            take: limit,
          select: {
            id: true, type: true, model: true, tokensPrompt: true, tokensOutput: true,
            latencyMs: true, success: true, errorCode: true, errorMessage: true,
            createdAt: true, meta: true
          }
        });
        usedPrisma = true;
      }
    } catch (e) {
      console.warn('⚠️ Lecture via Prisma aiUsageLog échouée, fallback SQL:', (e as Error).message);
    }
    if (!usedPrisma) {
      // Fallback SQL brut (meta JSONB -> text)
      const conditions: string[] = [];
  const params: unknown[] = [];
      let idx = 1;
      if (type) { conditions.push(`type = $${idx++}`); params.push(type); }
      if (successFilter !== undefined) { conditions.push(`success = $${idx++}`); params.push(successFilter); }
      const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
      const sql = `SELECT id, type, model, "tokensPrompt", "tokensOutput", "latencyMs", success, "errorCode", "errorMessage", "createdAt", meta FROM "AiUsageLog" ${where} ORDER BY "createdAt" DESC LIMIT ${limit}`;
      // @ts-expect-error raw
      logs = await prisma.$queryRawUnsafe(sql, ...params);
    }
    // Stats rapides
    const total = logs.length;
    const successCount = logs.filter(l => l.success).length;
    const avgLatency = logs.length ? Math.round(logs.reduce((s,l)=> s + (l.latencyMs || 0),0)/logs.length) : 0;
    res.json({
      success: true,
      data: {
        logs: logs.map(l => ({
          id: l.id,
          type: l.type,
          endpoint: l.meta?.endpoint || undefined,
          mode: l.meta?.mode || undefined,
          model: l.model,
          latencyMs: l.latencyMs,
          tokensPrompt: l.tokensPrompt ?? l.tokens_prompt ?? 0,
          tokensOutput: l.tokensOutput ?? l.tokens_output ?? 0,
          success: l.success,
          errorCode: l.errorCode || l.error_code || undefined,
          errorMessage: l.errorMessage || l.error_message || undefined,
          createdAt: l.createdAt,
        })),
        meta: {
          count: total,
          successRate: total ? +(successCount / total * 100).toFixed(1) : 0,
          avgLatencyMs: avgLatency,
          filtered: { type: type || null, success: successFilter ?? null },
          generatedAt: new Date().toISOString(),
          durationMs: Date.now() - t0
        }
      }
    });
  } catch (error) {
    console.error('❌ Erreur /api/ai/usage/recent:', error);
    res.status(500).json({ success: false, error: 'Erreur récupération logs IA', details: (error as Error).message });
  }
});

export default router;
