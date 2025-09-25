import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import { PrismaClient } from '@prisma/client';

/*
 * Test étendu AI
 * Vérifie:
 * 1. /api/ai/status
 * 2. /api/ai/chat (alias moderne)
 * 3. /api/ai/generate-response (legacy compatibility)
 * 4. /api/ai/schedule-explain
 * 5. /api/calendar/ai-suggestions (référentiel heuristique)
 *
 * Usage: npm run test:ai:extended
 */

const BASE = process.env.BASE_URL || 'http://localhost:4000';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

async function main() {
  const prisma = new PrismaClient();
  const user = await prisma.user.findFirst({ where: { email: 'dethier.jls@gmail.com' } });
  if (!user) throw new Error('Utilisateur seed introuvable');
  const org = await prisma.organization.findFirst({ where: { name: '2Thier CRM' } });
  if (!org) throw new Error('Organisation seed introuvable');
  const lead = await prisma.lead.findFirst({ where: { organizationId: org.id } });
  if (!lead) throw new Error('Aucun lead trouvé');

  const token = jwt.sign({ userId: user.id, email: user.email, organizationId: org.id }, JWT_SECRET, { expiresIn: '10m' });
  const headers: Record<string,string> = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  // 1. Status
  console.log('🔎 Test 1: /api/ai/status');
  const statusRes = await fetch(`${BASE}/api/ai/status`, { headers });
  const statusJson = await statusRes.json();
  console.log('➡️ Status:', statusRes.status); console.log('➡️ Body:', statusJson);

  // 2. Chat alias
  console.log('\n🔎 Test 2: /api/ai/chat');
  const chatRes = await fetch(`${BASE}/api/ai/chat`, { method: 'POST', headers, body: JSON.stringify({ message: 'Peux-tu me proposer une prochaine action ?', context: { currentPage: 'call-module' } }) });
  const chatJson = await chatRes.json();
  console.log('➡️ Status:', chatRes.status); console.log('➡️ Body:', chatJson);

  // 3. Legacy generate-response
  console.log('\n🔎 Test 3: /api/ai/generate-response (legacy)');
  const legacyRes = await fetch(`${BASE}/api/ai/generate-response`, { method: 'POST', headers, body: JSON.stringify({ message: 'Test compatibilité ancienne route', context: { currentPage: 'legacy-test' } }) });
  const legacyJson = await legacyRes.json();
  console.log('➡️ Status:', legacyRes.status); console.log('➡️ Body:', legacyJson);

  // 4. Schedule explain
  console.log('\n🔎 Test 4: /api/ai/schedule-explain');
  const now = new Date();
  const slot1 = new Date(now.getTime() + 3600_000).toISOString();
  const slot2 = new Date(now.getTime() + 7200_000).toISOString();
  const explainRes = await fetch(`${BASE}/api/ai/schedule-explain`, { method: 'POST', headers, body: JSON.stringify({ objective: 'planifier une démonstration', lead: { name: lead.name, sector: lead.sector }, slots: [ { start: slot1, end: new Date(new Date(slot1).getTime() + 1800000).toISOString() }, { start: slot2, end: new Date(new Date(slot2).getTime() + 1800000).toISOString() } ] }) });
  const explainJson = await explainRes.json();
  console.log('➡️ Status:', explainRes.status); console.log('➡️ Body:', explainJson);

  // 5. Heuristic calendar suggestions
  console.log(`\n🔎 Test 5: /api/calendar/ai-suggestions (lead=${lead.id})`);
  const suggRes = await fetch(`${BASE}/api/calendar/ai-suggestions?leadId=${lead.id}`, { headers });
  const suggJson = await suggRes.json();
  console.log('➡️ Status:', suggRes.status); console.log('➡️ Count:', Array.isArray(suggJson.data) ? suggJson.data.length : 'n/a');

  // Résumé
  console.log('\n📄 Résumé:');
  console.log('Mode IA:', statusJson?.data?.mode, '| Model:', statusJson?.data?.model, '| hasKey:', statusJson?.data?.hasApiKey);
  const endpoints = [chatJson, legacyJson, explainJson];
  const fallbackCount = endpoints.filter(e => e?.data?.metadata?.mode === 'mock' || e?.data?.mode === 'mock').length;
  console.log('Endpoints en fallback mock:', fallbackCount, '/3');

  await prisma.$disconnect();
  console.log('\n✅ Test étendu terminé');
}

main().catch(err => { console.error('❌ Erreur script test étendu:', err); process.exit(1); });
