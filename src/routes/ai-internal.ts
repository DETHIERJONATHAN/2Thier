import express from 'express';
import fs from 'fs';
import path from 'path';
import { db } from '../lib/database';
import { authMiddleware, requireSuperAdmin } from '../middlewares/auth';
import type { AuthenticatedRequest } from '../middlewares/auth';
import { randomUUID } from 'crypto';

// NOTE: On utilise authMiddleware + requireSuperAdmin pour protéger strictement.
const prisma = db;
const router = express.Router();

router.use(authMiddleware);
router.use(requireSuperAdmin);

// ---------- Logging interne (réutilise table AiUsageLog SANS migration) ----------
let internalLogTableEnsured: Promise<void> | null = null;
async function ensureAiLog() {
  if (!internalLogTableEnsured) {
    internalLogTableEnsured = (async () => {
      try {
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
      } catch (e) {
        console.warn('[AI-INT] Impossible de garantir AiUsageLog:', (e as Error).message);
      }
    })();
  }
  return internalLogTableEnsured;
}

async function logInternal(type: string, meta: Record<string, unknown>, content?: string) {
  try {
    await ensureAiLog();
    await prisma.$executeRawUnsafe(
      'INSERT INTO "AiUsageLog" (id, type, success, meta, "errorMessage") VALUES ($1,$2,$3,$4,$5);',
      randomUUID(), type, true, JSON.stringify(meta), content || null
    );
  } catch (e) {
    console.warn('[AI-INT] logInternal failed:', (e as Error).message);
  }
}

// ---------- Helpers Snapshot ----------
interface ModuleLite { id: string; key: string; feature: string | null; label: string | null; route: string | null; isGlobal: boolean }
interface SystemSnapshot { timestamp: string; modules: ModuleLite[]; prismaModels: { name: string; fields: string[] }[]; apiRoutes: { file: string; methods: string[]; }[]; metrics: { users: number; leads: number; events: number }; versions: { node: string; packages: { [k: string]: string } }; hash?: string }

function parsePrismaSchema(schemaPath: string): { name: string; fields: string[] }[] {
  try {
    const content = fs.readFileSync(schemaPath, 'utf8');
    const models: { name: string; fields: string[] }[] = [];
    const modelRegex = /model\s+(\w+)\s+{([\s\S]*?)}/g;
    let match: RegExpExecArray | null;
    while ((match = modelRegex.exec(content))) {
      const name = match[1];
      const body = match[2];
      const fields = body.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//') && !l.startsWith('@@')).map(l => l.split(/\s+/)[0]);
      models.push({ name, fields });
    }
    return models;
  } catch {
    return []; // silencieux: snapshot partiel acceptable
  }
}

function scanRoutes(dir: string): { file: string; methods: string[] }[] {
  const out: { file: string; methods: string[] }[] = [];
  try {
    const files = fs.readdirSync(dir); // simple, pas de récursivité profonde MVP
    for (const f of files) {
      if (!f.endsWith('.ts') && !f.endsWith('.js')) continue;
      const full = path.join(dir, f);
      const content = fs.readFileSync(full, 'utf8');
      const methods = Array.from(new Set([...content.matchAll(/router\.(get|post|put|delete|patch)\(/g)].map(m => m[1])));
      if (methods.length) out.push({ file: f, methods });
    }
  } catch {
    // ignore échec scan routes
  }
  return out;
}

async function buildSnapshot(): Promise<SystemSnapshot> {
  const timestamp = new Date().toISOString();
  // Modules actifs (organisation null = global) – MVP: sans filtrer organisation spécifique
  const modules = await prisma.module.findMany({ select: { id: true, key: true, feature: true, label: true, route: true, isGlobal: true } });
  const prismaModels = parsePrismaSchema(path.join(process.cwd(), 'prisma', 'schema.prisma'));
  const apiRoutes = scanRoutes(path.join(process.cwd(), 'src', 'routes'));
  // Compteurs rapides
  const [users, leads, events] = await Promise.all([
    prisma.user.count(), prisma.lead.count(), prisma.calendarEvent.count()
  ]);
  let packages: { [k: string]: string } = {};
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
    packages = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  } catch { /* ignore lecture package.json */ }
  const versions = { node: process.version, packages };
  return { timestamp, modules, prismaModels, apiRoutes, metrics: { users, leads, events }, versions };
}

// ---------- /snapshot ----------
router.get('/snapshot', async (req: AuthenticatedRequest, res) => {
  try {
    const snap = await buildSnapshot();
    res.json({ success: true, data: snap });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Snapshot failed', details: (e as Error).message });
  }
});

// ---------- /analyze ----------
router.get('/analyze', async (_req, res) => {
  try {
    const snap = await buildSnapshot();
    // Heuristiques simples MVP
    const issues: string[] = [];
    // Modules sans route associée
    const routeNames = new Set(snap.apiRoutes.map(r => r.file.replace(/\.(ts|js)$/,'').toLowerCase()));
    const modulesSansRoute = snap.modules.filter(m => m.route && !Array.from(routeNames).some(r => m.route?.toLowerCase().includes(r)));
    if (modulesSansRoute.length) issues.push(`${modulesSansRoute.length} module(s) avec route potentiellement absente: ${modulesSansRoute.map(m=>m.key).join(', ')}`);
    // Modèles sans champs (rare/anormal)
    const emptyModels = snap.prismaModels.filter(m => m.fields.length === 0);
    if (emptyModels.length) issues.push(`Modèles vides: ${emptyModels.map(m=>m.name).join(',')}`);
    // Taille base approximative (counts) -> alerte si > 10k leads
    if (snap.metrics.leads > 10000) issues.push('Volume leads > 10k: prévoir index / archivage');

    const recommendations: string[] = [];
    if (!issues.length) recommendations.push('Structure saine au niveau des heuristiques de base.');
    if (snap.metrics.events === 0) recommendations.push('Activer la capture d\'événements planning pour enrichir l\'IA.');

    res.json({ success: true, data: { snapshotTimestamp: snap.timestamp, issues, recommendations, metrics: snap.metrics, counts: { models: snap.prismaModels.length, routes: snap.apiRoutes.length, modules: snap.modules.length } } });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Analyze failed', details: (e as Error).message });
  }
});

export default router;

// ---------- Mémoire Système (utilise AiUsageLog.type = system_memory) ----------
// POST /api/ai/internal/memory { content, topic?, tags?[] }
router.post('/memory', async (req: AuthenticatedRequest, res) => {
  const t0 = Date.now();
  try {
    const { content, topic, tags } = req.body || {};
    if (!content || typeof content !== 'string') return res.status(400).json({ success: false, error: 'Champ content requis' });
    const meta = { kind: 'memory', topic: topic || null, tags: Array.isArray(tags) ? tags.slice(0,8) : [], length: content.length };
    await logInternal('system_memory', { ...meta, op: 'add', ms: Date.now() - t0 }, content.slice(0,5000));
    res.json({ success: true, data: { stored: true } });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Memory add failed', details: (e as Error).message });
  }
});

// GET /api/ai/internal/memory?limit=&q=&tag=
router.get('/memory', async (req, res) => {
  try {
    await ensureAiLog();
    const rawLimit = parseInt(String(req.query.limit || '50'), 10);
    const limit = Math.min(200, Math.max(1, isNaN(rawLimit) ? 50 : rawLimit));
    const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
    const tag = typeof req.query.tag === 'string' ? req.query.tag.trim().toLowerCase() : '';
    // Simple query
  interface MemoryRow { id: string; createdAt: string; meta: { topic?: string; tags?: string[] } | null; errorMessage?: string | null }
  const rows = await prisma.$queryRawUnsafe<MemoryRow[]>(
      `SELECT id, "createdAt", meta, "errorMessage" FROM "AiUsageLog" WHERE type='system_memory' ORDER BY "createdAt" DESC LIMIT ${limit}`
    );
    const filtered = rows.filter(r => {
      const meta = r.meta || {}; const content: string = r.errorMessage || '';
      if (q && !content.toLowerCase().includes(q) && !(meta.topic || '').toLowerCase().includes(q)) return false;
      if (tag) {
        const tags = (meta.tags || []).map((t: string) => t.toLowerCase());
        if (!tags.includes(tag)) return false;
      }
      return true;
    });
    res.json({ success: true, data: filtered.map(r => ({ id: r.id, createdAt: r.createdAt, topic: r.meta?.topic || null, tags: r.meta?.tags || [], content: r.errorMessage })) });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Memory list failed', details: (e as Error).message });
  }
});

// ---------- Générateur de plan ----------
// POST /api/ai/internal/plan { objective: string, area?: string }
router.post('/plan', async (req, res) => {
  const t0 = Date.now();
  try {
    const { objective, area } = req.body || {};
    if (!objective || typeof objective !== 'string') return res.status(400).json({ success: false, error: 'objective requis' });
    const snap = await buildSnapshot();
    // Heuristique effort/impact
    function estimateEffort(step: string) {
      const l = step.length;
      return l > 120 ? 5 : l > 80 ? 4 : l > 50 ? 3 : l > 30 ? 2 : 1;
    }
    const baseSteps = [
      `Analyse détaillée de la zone ${area || 'générale'} et identification des points de friction`,
      `Conception technique (schéma données / patterns) pour: ${objective.slice(0,80)}`,
      'Préparation patch(s) et refactor minimal sécurisé',
      'Tests unitaires + scénarios de régression critiques',
      'Déploiement progressif + monitoring + rollback plan documenté'
    ];
    const steps = baseSteps.map((s, i) => ({
      id: 'S' + (i+1),
      title: s.split(':')[0].slice(0,60),
      description: s,
      effort: estimateEffort(s),
      impact: Math.min(5, 3 + i),
      risk: i === 2 ? 'medium' : i === 4 ? 'low' : 'medium',
      prerequisites: i === 0 ? [] : ['S' + i],
      diffSketch: i === 2 ? `*** Begin Patch\n*** Update File: path/to/file.ts\n@@\n-old code\n+// TODO: Implémentation ${objective.slice(0,40)}\n*** End Patch` : undefined
    }));
    const plan = {
      objective,
      area: area || null,
      generatedAt: new Date().toISOString(),
      stats: { models: snap.prismaModels.length, routes: snap.apiRoutes.length, modules: snap.modules.length },
      steps,
      nextActions: ['Valider le périmètre', 'Créer branche feature', 'Démarrer implémentation étape S1'],
      effortTotal: steps.reduce((a,b)=>a+b.effort,0)
    };
    await logInternal('system_plan_generate', { ms: Date.now()-t0, objective: objective.slice(0,80), area: area || null }, JSON.stringify(plan).slice(0,4000));
    res.json({ success: true, data: plan });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Plan generation failed', details: (e as Error).message });
  }
});
