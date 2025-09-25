import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import { PrismaClient } from '@prisma/client';

/*
 * Script de test rapide pour vérifier:
 * 1. Endpoint /api/ai/generate-response (actuellement mock)
 * 2. Endpoint /api/calendar/ai-suggestions (génération dynamique)
 * 3. Endpoint /api/calendar/events (liste)
 *
 * Usage: npm run test:ai
 * Pré-requis: serveur dev lancé (npm run dev) et variable JWT_SECRET identique côté serveur.
 */

const BASE = process.env.BASE_URL || 'http://localhost:4000';
// IMPORTANT: Utiliser le même secret que le serveur (JWT_SECRET)
// ATTENTION: le middleware authenticateToken utilise un default 'your-secret-key'
// tandis que authController utilise 'development-secret-key'. On prend la valeur env si présente, sinon celui du middleware.
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Adaptation: seed utilise user.id & email; on forge un token simple (pas d'organisation mais routes calendar la requièrent via auth.ts ?)
// Pour calendar.ts (dans routes calendar), on utilise req.user!.organizationId => donc pour test calendrier on devrait passer un header x-organization-id ou intégrer dans token
// Ici on se limite aux tests AI (qui ne nécessitent pas organizationId) et suggestions calendrier échoueront si organizationId requis.

async function main() {
  // Token fake (userId/email arbitraires). Pour routes nécessitant organisationId, ajuster.
  const prisma = new PrismaClient();
  // Récupérer un utilisateur réel (seed) + organisation + un lead
  const user = await prisma.user.findFirst({ where: { email: 'dethier.jls@gmail.com' } });
  if (!user) throw new Error('Utilisateur seed introuvable');
  const org = await prisma.organization.findFirst({ where: { name: '2Thier CRM' } });
  if (!org) throw new Error('Organisation seed introuvable');
  const lead = await prisma.lead.findFirst({ where: { organizationId: org.id } });
  if (!lead) throw new Error('Aucun lead trouvé');

  // Le middleware attend userId + (optionnel) organizationId
  const token = jwt.sign({ userId: user.id, email: user.email, organizationId: org.id }, JWT_SECRET, { expiresIn: '15m' });
  const headers: any = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  console.log('🔎 Test 1: /api/ai/generate-response');
  const aiRes = await fetch(`${BASE}/api/ai/generate-response`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message: 'Test de connexion IA', context: { currentPage: 'test' }, conversationHistory: [] })
  });
  const aiJson = await aiRes.json();
  console.log('➡️ Status:', aiRes.status);
  console.log('➡️ Body:', aiJson);

  console.log('\n🔎 Test 2: /api/ai/test');
  const testRes = await fetch(`${BASE}/api/ai/test`, { headers });
  const testJson = await testRes.json();
  console.log('➡️ Status:', testRes.status);
  console.log('➡️ Body:', testJson);

  console.log(`\n🔎 Test 3: /api/calendar/ai-suggestions (lead=${lead.id})`);
  const calRes = await fetch(`${BASE}/api/calendar/ai-suggestions?leadId=${lead.id}`, { headers });
  console.log('➡️ Status:', calRes.status);
  let calJson: any = null; try { calJson = await calRes.json(); } catch {}
  console.log('➡️ Body:', calJson);

  console.log('\n✅ Tests terminés');
  await prisma.$disconnect();
}

main().catch(err => { console.error('❌ Erreur script test:', err); process.exit(1); });
