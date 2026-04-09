#!/usr/bin/env npx tsx
/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║   🐝 ZHIIVE — AUDIT COMPLET PUSH NOTIFICATIONS                ║
 * ║   Vérifie TOUTE la chaîne push en mode réel                    ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Usage :
 *   npx tsx tests/audit/push-notifications-audit.ts
 *   npx tsx tests/audit/push-notifications-audit.ts --section=env
 *   npx tsx tests/audit/push-notifications-audit.ts --section=api
 *   npx tsx tests/audit/push-notifications-audit.ts --section=db
 *   npx tsx tests/audit/push-notifications-audit.ts --section=code
 *   npx tsx tests/audit/push-notifications-audit.ts --section=deploy
 *   npx tsx tests/audit/push-notifications-audit.ts --section=all
 *
 * Sections :
 *   env     — Vérification des clés VAPID et config env
 *   api     — Test en live des endpoints push (serveur doit tourner)
 *   db      — État des souscriptions PushSubscription en BDD
 *   code    — Audit statique : tous les NotificationHelper/push sont branchés
 *   deploy  — Vérification config deployment (GH Actions / cloudbuild)
 *   sw      — Vérification du Service Worker
 *   all     — Tout (défaut)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(ROOT, 'src');

// ── Args ──
const args = process.argv.slice(2);
const sectionArg = args.find(a => a.startsWith('--section='))?.split('=')[1] || 'all';

// ── Counters ──
let passed = 0;
let failed = 0;
let warnings = 0;

function ok(msg: string) { passed++; console.log(`  ✅ ${msg}`); }
function fail(msg: string) { failed++; console.log(`  ❌ ${msg}`); }
function warn(msg: string) { warnings++; console.log(`  ⚠️  ${msg}`); }
function header(title: string) { console.log(`\n${'═'.repeat(60)}\n  ${title}\n${'═'.repeat(60)}`); }

// ═══════════════════════════════════════════════════════════════
//  SECTION 1 : VAPID KEYS & ENVIRONNEMENT
// ═══════════════════════════════════════════════════════════════
function auditEnvironment() {
  header('🔑 SECTION 1 — VAPID KEYS & ENVIRONNEMENT');

  // Check .env file
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) {
    fail('.env file not found — VAPID keys cannot be loaded');
    return;
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');

  // VAPID_PUBLIC_KEY
  const pubMatch = envContent.match(/^VAPID_PUBLIC_KEY=(.+)$/m);
  if (pubMatch && pubMatch[1].length > 20) {
    ok(`VAPID_PUBLIC_KEY present (${pubMatch[1].length} chars, starts ${pubMatch[1].slice(0, 8)}...)`);
  } else {
    fail('VAPID_PUBLIC_KEY manquante ou trop courte dans .env');
  }

  // VAPID_PRIVATE_KEY
  const privMatch = envContent.match(/^VAPID_PRIVATE_KEY=(.+)$/m);
  if (privMatch && privMatch[1].length > 20) {
    ok(`VAPID_PRIVATE_KEY present (${privMatch[1].length} chars)`);
  } else {
    fail('VAPID_PRIVATE_KEY manquante ou trop courte dans .env');
  }

  // VAPID_SUBJECT
  const subjMatch = envContent.match(/^VAPID_SUBJECT=(.+)$/m);
  if (subjMatch && subjMatch[1].startsWith('mailto:')) {
    ok(`VAPID_SUBJECT OK: ${subjMatch[1]}`);
  } else {
    fail('VAPID_SUBJECT manquante ou ne commence pas par mailto:');
  }

  // Verify VAPID key format (base64url)
  if (pubMatch) {
    const valid = /^[A-Za-z0-9_-]+$/.test(pubMatch[1]);
    valid ? ok('VAPID_PUBLIC_KEY est en format base64url valide') : fail('VAPID_PUBLIC_KEY contient des caractères invalides');
  }
  if (privMatch) {
    const valid = /^[A-Za-z0-9_-]+$/.test(privMatch[1]);
    valid ? ok('VAPID_PRIVATE_KEY est en format base64url valide') : fail('VAPID_PRIVATE_KEY contient des caractères invalides');
  }

  // Check .env.example
  const examplePath = path.join(ROOT, '.env.example');
  if (fs.existsSync(examplePath)) {
    const exampleContent = fs.readFileSync(examplePath, 'utf-8');
    if (exampleContent.includes('VAPID_PUBLIC_KEY') && exampleContent.includes('VAPID_PRIVATE_KEY')) {
      ok('.env.example documente les VAPID keys');
    } else {
      warn('.env.example ne documente pas les VAPID keys');
    }
  }
}

// ═══════════════════════════════════════════════════════════════
//  SECTION 2 : API ENDPOINTS (LIVE TEST)
// ═══════════════════════════════════════════════════════════════
async function auditApiEndpoints() {
  header('🌐 SECTION 2 — API ENDPOINTS PUSH (test live)');

  const baseUrl = process.env.API_URL || 'http://localhost:4000';

  // Test VAPID public key endpoint
  try {
    const resp = await fetch(`${baseUrl}/api/push/vapid-key`);
    if (resp.ok) {
      const data = await resp.json();
      if (data.publicKey && data.publicKey.length > 20) {
        ok(`GET /api/push/vapid-key → publicKey OK (${data.publicKey.slice(0, 12)}...)`);
      } else {
        fail(`GET /api/push/vapid-key → publicKey vide ou manquante: ${JSON.stringify(data)}`);
      }
    } else {
      fail(`GET /api/push/vapid-key → HTTP ${resp.status}`);
    }
  } catch (err: any) {
    fail(`GET /api/push/vapid-key → Serveur injoignable (${baseUrl}). Démarrez l'API d'abord.`);
    return; // pas la peine de continuer les tests API
  }

  // Test subscribe endpoint (should require auth)
  try {
    const resp = await fetch(`${baseUrl}/api/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: 'test', keys: { p256dh: 'x', auth: 'x' } }),
    });
    if (resp.status === 401 || resp.status === 403) {
      ok('POST /api/push/subscribe protégé par auth (401/403 sans token)');
    } else {
      warn(`POST /api/push/subscribe retourne ${resp.status} sans token (attendu 401)`);
    }
  } catch (err: any) {
    fail(`POST /api/push/subscribe → erreur: ${err.message}`);
  }

  // Test unsubscribe endpoint (should require auth)
  try {
    const resp = await fetch(`${baseUrl}/api/push/unsubscribe`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: 'test' }),
    });
    if (resp.status === 401 || resp.status === 403) {
      ok('DELETE /api/push/unsubscribe protégé par auth (401/403 sans token)');
    } else {
      warn(`DELETE /api/push/unsubscribe retourne ${resp.status} sans token (attendu 401)`);
    }
  } catch (err: any) {
    fail(`DELETE /api/push/unsubscribe → erreur: ${err.message}`);
  }

  // Test health endpoint
  try {
    const resp = await fetch(`${baseUrl}/api/health`);
    if (resp.ok) {
      ok('GET /api/health → serveur en fonctionnement');
    } else {
      warn(`GET /api/health → HTTP ${resp.status}`);
    }
  } catch {
    warn('GET /api/health → injoignable');
  }
}

// ═══════════════════════════════════════════════════════════════
//  SECTION 3 : BASE DE DONNÉES — PushSubscription
// ═══════════════════════════════════════════════════════════════
async function auditDatabase() {
  header('🗄️ SECTION 3 — BASE DE DONNÉES (PushSubscription)');

  try {
    // Dynamic import to avoid crashes if db not available
    const { db } = await import('../../src/lib/database');

    // Check PushSubscription table
    const totalSubs = await db.pushSubscription.count();
    if (totalSubs > 0) {
      ok(`PushSubscription table: ${totalSubs} souscription(s) enregistrée(s)`);
    } else {
      warn('PushSubscription table: 0 souscriptions — aucun utilisateur n\'a encore autorisé les notifications');
    }

    // Active vs inactive
    const activeSubs = await db.pushSubscription.count({ where: { isActive: true } });
    const inactiveSubs = totalSubs - activeSubs;
    ok(`Souscriptions actives: ${activeSubs}, inactives: ${inactiveSubs}`);

    // Check for unique users
    const uniqueUsers = await db.pushSubscription.groupBy({
      by: ['userId'],
      where: { isActive: true },
    });
    ok(`Utilisateurs avec push actif: ${uniqueUsers.length}`);

    // Check for stale/invalid endpoints
    const subs = await db.pushSubscription.findMany({
      where: { isActive: true },
      select: { endpoint: true, userId: true, createdAt: true },
      take: 5,
    });
    for (const sub of subs) {
      const age = Math.floor((Date.now() - new Date(sub.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      if (age > 90) {
        warn(`Souscription de ${sub.userId?.slice(0, 8)} vieille de ${age} jours — peut être expirée`);
      }
    }

    // Check Notification table for push-related types
    const recentNotifs = await db.notification.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    ok(`Notifications créées dernières 24h: ${recentNotifs}`);

    await (db as any).$disconnect?.();
  } catch (err: any) {
    fail(`Connexion BDD impossible: ${err.message}. Vérifiez que le proxy Cloud SQL tourne.`);
  }
}

// ═══════════════════════════════════════════════════════════════
//  SECTION 4 : AUDIT CODE STATIQUE (tous les ponts push branchés)
// ═══════════════════════════════════════════════════════════════
function auditCode() {
  header('🔍 SECTION 4 — AUDIT CODE (ponts push branchés)');

  // ── 4a. push.ts — Le cœur du système
  const pushFile = path.join(SRC, 'routes', 'push.ts');
  if (!fs.existsSync(pushFile)) {
    fail('src/routes/push.ts INTROUVABLE — le système push n\'existe pas');
    return;
  }
  const pushContent = fs.readFileSync(pushFile, 'utf-8');

  // VAPID setup
  pushContent.includes('webPush.setVapidDetails')
    ? ok('push.ts configure VAPID via webPush.setVapidDetails')
    : fail('push.ts ne configure pas VAPID');

  pushContent.includes('sendPushToUser')
    ? ok('push.ts exporte sendPushToUser()')
    : fail('push.ts n\'exporte pas sendPushToUser');

  pushContent.includes('/vapid-key')
    ? ok('push.ts expose GET /vapid-key')
    : fail('push.ts ne fournit pas /vapid-key');

  pushContent.includes('/subscribe')
    ? ok('push.ts expose POST /subscribe')
    : fail('push.ts ne fournit pas /subscribe');

  // ── 4b. NotificationHelper — pont central
  const helperFile = path.join(SRC, 'services', 'NotificationHelper.ts');
  if (fs.existsSync(helperFile)) {
    const helperContent = fs.readFileSync(helperFile, 'utf-8');
    helperContent.includes('sendPushToUser')
      ? ok('NotificationHelper.ts importe et utilise sendPushToUser')
      : fail('NotificationHelper.ts ne branche PAS sendPushToUser — notifications silencieuses !');
  } else {
    warn('NotificationHelper.ts introuvable');
  }

  // ── 4c. routes qui envoient des push
  const routeChecks = [
    { file: 'routes/friends.ts', name: 'Friends (demandes/acceptations d\'amis)' },
    { file: 'routes/wall.ts', name: 'Wall (réactions/commentaires)' },
    { file: 'routes/chantier-workflow.ts', name: 'Chantier workflow (8 transitions)' },
    { file: 'routes/chantiersRoutes.ts', name: 'Chantiers (rectification)' },
  ];

  for (const { file, name } of routeChecks) {
    const fullPath = path.join(SRC, file);
    if (!fs.existsSync(fullPath)) {
      warn(`${file} introuvable`);
      continue;
    }
    const content = fs.readFileSync(fullPath, 'utf-8');
    content.includes('sendPushToUser')
      ? ok(`${name} → sendPushToUser branché`)
      : fail(`${name} → sendPushToUser ABSENT — notifications silencieuses !`);
  }

  // ── 4d. CalendarNotificationService
  const calFile = path.join(SRC, 'services', 'CalendarNotificationService.ts');
  if (fs.existsSync(calFile)) {
    const calContent = fs.readFileSync(calFile, 'utf-8');
    const pushCount = (calContent.match(/sendPushToUser/g) || []).length;
    if (pushCount >= 4) {
      ok(`CalendarNotificationService → ${pushCount} appels sendPushToUser (invitation, rappel, update, annulation)`);
    } else if (pushCount > 0) {
      warn(`CalendarNotificationService → seulement ${pushCount} appels sendPushToUser (attendu ≥ 4)`);
    } else {
      fail('CalendarNotificationService → sendPushToUser ABSENT');
    }
  }

  // ── 4e. usePushNotifications hook (enregistrement global)
  const hookFile = path.join(SRC, 'hooks', 'usePushNotifications.ts');
  if (fs.existsSync(hookFile)) {
    const hookContent = fs.readFileSync(hookFile, 'utf-8');
    hookContent.includes('PushManager')
      ? ok('usePushNotifications.ts utilise PushManager (inscription browser)')
      : fail('usePushNotifications.ts ne gère pas PushManager');
    hookContent.includes('/api/push/subscribe')
      ? ok('usePushNotifications.ts envoie la souscription au serveur')
      : fail('usePushNotifications.ts ne contacte pas /api/push/subscribe');
  } else {
    fail('usePushNotifications.ts INTROUVABLE — les utilisateurs ne sont pas inscrits au push !');
  }

  // ── 4f. MainLayoutNew monte le hook
  const layoutFile = path.join(SRC, 'pages', 'page2thier', 'MainLayoutNew.tsx');
  if (fs.existsSync(layoutFile)) {
    const layoutContent = fs.readFileSync(layoutFile, 'utf-8');
    layoutContent.includes('usePushNotifications')
      ? ok('MainLayoutNew.tsx monte usePushNotifications (inscription globale)')
      : fail('MainLayoutNew.tsx ne monte PAS usePushNotifications — push inscription mort !');
    layoutContent.includes('PWAInstallPrompt')
      ? ok('MainLayoutNew.tsx inclut PWAInstallPrompt')
      : warn('MainLayoutNew.tsx ne contient pas PWAInstallPrompt');
  }

  // ── 4g. PWAInstallPrompt
  const pwaFile = path.join(SRC, 'components', 'PWAInstallPrompt.tsx');
  if (fs.existsSync(pwaFile)) {
    ok('PWAInstallPrompt.tsx existe (bannière d\'installation PWA)');
    const pwaContent = fs.readFileSync(pwaFile, 'utf-8');
    pwaContent.includes('beforeinstallprompt')
      ? ok('PWAInstallPrompt gère l\'événement beforeinstallprompt')
      : warn('PWAInstallPrompt ne gère pas beforeinstallprompt');
  } else {
    warn('PWAInstallPrompt.tsx introuvable');
  }

  // ── 4h. Routes push montées dans le serveur (via routes/index.ts ou api-server-clean.ts)
  const routesIndex = path.join(SRC, 'routes', 'index.ts');
  const serverFile = path.join(SRC, 'api-server-clean.ts');
  let pushMounted = false;
  if (fs.existsSync(routesIndex)) {
    const routesContent = fs.readFileSync(routesIndex, 'utf-8');
    if (routesContent.includes("pushRoutes") || routesContent.includes("'/push'")) {
      pushMounted = true;
    }
  }
  if (!pushMounted && fs.existsSync(serverFile)) {
    const serverContent = fs.readFileSync(serverFile, 'utf-8');
    if (serverContent.includes('push') && (serverContent.includes('/api/push') || serverContent.includes("'/push'"))) {
      pushMounted = true;
    }
  }
  pushMounted
    ? ok('Routes push montées dans le serveur (via routes/index.ts)')
    : fail('Routes push NON montées — endpoints /api/push/* inaccessibles !');
}

// ═══════════════════════════════════════════════════════════════
//  SECTION 5 : DEPLOYMENT CONFIG
// ═══════════════════════════════════════════════════════════════
function auditDeployment() {
  header('🚀 SECTION 5 — DEPLOYMENT CONFIG');

  // GitHub Actions
  const ghActionPath = path.join(ROOT, '.github', 'workflows', 'deploy-cloud-run.yml');
  if (fs.existsSync(ghActionPath)) {
    const ghContent = fs.readFileSync(ghActionPath, 'utf-8');
    ghContent.includes('VAPID_PUBLIC_KEY')
      ? ok('GitHub Actions deploy-cloud-run.yml → VAPID_PUBLIC_KEY configuré')
      : fail('GitHub Actions deploy-cloud-run.yml → VAPID_PUBLIC_KEY MANQUANT');
    ghContent.includes('VAPID_PRIVATE_KEY')
      ? ok('GitHub Actions → VAPID_PRIVATE_KEY configuré')
      : fail('GitHub Actions → VAPID_PRIVATE_KEY MANQUANT');
    ghContent.includes('VAPID_SUBJECT')
      ? ok('GitHub Actions → VAPID_SUBJECT configuré')
      : fail('GitHub Actions → VAPID_SUBJECT MANQUANT');
  } else {
    warn('.github/workflows/deploy-cloud-run.yml introuvable');
  }

  // cloudbuild.yaml
  const cloudbuildPath = path.join(ROOT, 'cloudbuild.yaml');
  if (fs.existsSync(cloudbuildPath)) {
    const cloudContent = fs.readFileSync(cloudbuildPath, 'utf-8');
    cloudContent.includes('VAPID_PUBLIC_KEY')
      ? ok('cloudbuild.yaml → VAPID_PUBLIC_KEY configuré')
      : fail('cloudbuild.yaml → VAPID_PUBLIC_KEY MANQUANT');
    cloudContent.includes('VAPID_PRIVATE_KEY')
      ? ok('cloudbuild.yaml → VAPID_PRIVATE_KEY configuré')
      : fail('cloudbuild.yaml → VAPID_PRIVATE_KEY MANQUANT');
  } else {
    warn('cloudbuild.yaml introuvable');
  }

  // Dockerfile
  const dockerfilePath = path.join(ROOT, 'Dockerfile');
  if (fs.existsSync(dockerfilePath)) {
    ok('Dockerfile présent');
  }

  // Prisma schema — PushSubscription model
  const schemaPath = path.join(ROOT, 'prisma', 'schema.prisma');
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    schema.includes('model PushSubscription')
      ? ok('Prisma schema contient le modèle PushSubscription')
      : fail('Prisma schema ne contient PAS le modèle PushSubscription !');
  }
}

// ═══════════════════════════════════════════════════════════════
//  SECTION 6 : SERVICE WORKER
// ═══════════════════════════════════════════════════════════════
function auditServiceWorker() {
  header('⚙️ SECTION 6 — SERVICE WORKER');

  const swPath = path.join(ROOT, 'public', 'sw.js');
  if (!fs.existsSync(swPath)) {
    fail('public/sw.js INTROUVABLE — push notifications ne fonctionneront pas sur mobile !');
    return;
  }

  const swContent = fs.readFileSync(swPath, 'utf-8');

  // Check push event handler
  swContent.includes("addEventListener('push'") || swContent.includes('addEventListener("push"')
    ? ok('sw.js gère l\'événement push')
    : fail('sw.js ne gère PAS l\'événement push');

  // Check notification click handler
  swContent.includes("addEventListener('notificationclick'") || swContent.includes('addEventListener("notificationclick"')
    ? ok('sw.js gère notificationclick (navigation au clic)')
    : warn('sw.js ne gère pas notificationclick');

  // Check if it shows notifications
  swContent.includes('showNotification')
    ? ok('sw.js appelle showNotification()')
    : fail('sw.js n\'appelle pas showNotification — les push seront silencieux');

  // Check for call handling
  if (swContent.includes('call') || swContent.includes('CALL') || swContent.includes('incoming-call')) {
    ok('sw.js gère les appels entrants (incoming call actions)');
  } else {
    warn('sw.js ne semble pas gérer les appels entrants');
  }

  // Check for sound
  if (swContent.includes('audio') || swContent.includes('Audio') || swContent.includes('.mp3') || swContent.includes('.wav')) {
    ok('sw.js gère les sons de notification');
  } else {
    warn('sw.js ne gère pas les sons');
  }

  // File size sanity
  const sizekb = Math.round(fs.statSync(swPath).size / 1024);
  ok(`sw.js taille: ${sizekb} KB`);
}

// ═══════════════════════════════════════════════════════════════
//  RÉSUMÉ FINAL
// ═══════════════════════════════════════════════════════════════
async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║   🐝 ZHIIVE — AUDIT COMPLET PUSH NOTIFICATIONS                ║
║   ${new Date().toLocaleString('fr-BE')}                                ║
╚══════════════════════════════════════════════════════════════════╝
`);

  const sections = sectionArg === 'all'
    ? ['env', 'api', 'db', 'code', 'deploy', 'sw']
    : [sectionArg];

  for (const section of sections) {
    switch (section) {
      case 'env': auditEnvironment(); break;
      case 'api': await auditApiEndpoints(); break;
      case 'db': await auditDatabase(); break;
      case 'code': auditCode(); break;
      case 'deploy': auditDeployment(); break;
      case 'sw': auditServiceWorker(); break;
      default: console.log(`Section inconnue: ${section}`);
    }
  }

  // Summary
  console.log(`
${'═'.repeat(60)}
  📊 RÉSUMÉ AUDIT PUSH NOTIFICATIONS
${'═'.repeat(60)}
  ✅ Réussis  : ${passed}
  ❌ Échoués  : ${failed}
  ⚠️  Warnings : ${warnings}
  ─────────────────────────
  Total tests : ${passed + failed + warnings}
  Résultat    : ${failed === 0 ? '🎉 TOUT EST OK !' : `⛔ ${failed} PROBLÈME(S) À CORRIGER`}
${'═'.repeat(60)}
`);

  if (failed > 0) {
    console.log('  💡 Actions recommandées :');
    console.log('     1. Corrigez tous les ❌ ci-dessus');
    console.log('     2. Relancez : npx tsx tests/audit/push-notifications-audit.ts');
    console.log('     3. Testez en vrai : ouvrez l\'app, acceptez les notifications, envoyez un message');
    console.log('');
  }

  if (failed === 0 && warnings > 0) {
    console.log('  💡 Les ⚠️  sont des recommandations, pas des bloqueurs.');
    console.log('');
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Erreur fatale audit:', err);
  process.exit(2);
});
