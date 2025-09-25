import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

/*
 * Garde de build: si AI_MODE=force-live mais /api/ai/chat retourne mode mock => échec.
 * Usage: npm run test:ai:guard (ex: intégré CI)
 */

const BASE = process.env.BASE_URL || 'http://localhost:4000';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

async function buildAuthHeader() {
  const prisma = new PrismaClient();
  const user = await prisma.user.findFirst();
  if (!user) throw new Error('Aucun user pour auth');
  const org = await prisma.organization.findFirst();
  if (!org) throw new Error('Aucune organisation');
  const token = jwt.sign({ userId: user.id, email: user.email, organizationId: org.id }, JWT_SECRET, { expiresIn: '5m' });
  await prisma.$disconnect();
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } as Record<string,string>;
}

async function main() {
  const aiMode = process.env.AI_MODE || 'auto';
  const headers = await buildAuthHeader();
  const chatRes = await fetch(`${BASE}/api/ai/chat`, { method: 'POST', headers, body: JSON.stringify({ message: 'Ping guard', context: { currentPage: 'guard' } }) });
  const json = await chatRes.json();
  const mode = json?.data?.metadata?.mode;
  console.log('Guard check: AI_MODE=', aiMode, 'responseMode=', mode);
  if (aiMode === 'force-live' && mode !== 'live') {
    console.error('❌ Guard: attendu live mais obtenu', mode);
    process.exit(1);
  }
  console.log('✅ Guard OK');
}

main().catch(e => { console.error('❌ Guard erreur', e); process.exit(1); });
