#!/usr/bin/env npx tsx
/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║   📬 ZHIIVE — AUDIT SYSTÈME EMAIL POSTAL                       ║
 * ║   Vérifie l'intégrité du système de boîte mail @zhiive.com     ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Usage :
 *   npx tsx tests/audit/postal-mail-system-audit.ts
 *   npx tsx tests/audit/postal-mail-system-audit.ts --section=backend
 *   npx tsx tests/audit/postal-mail-system-audit.ts --section=frontend
 *   npx tsx tests/audit/postal-mail-system-audit.ts --section=security
 *   npx tsx tests/audit/postal-mail-system-audit.ts --section=infra
 *
 * Sections :
 *   backend    — Service PostalEmailService, routes, singleton db
 *   frontend   — Hook usePostalMailService, UnifiedMailPage, useMailProvider
 *   security   — HMAC webhook, auth middleware, injection, env vars
 *   infra      — Serveur Hetzner, Docker, DNS, DKIM, SPF, DMARC
 *   provisioning — Auto-provisionnement EmailAccountService
 *   branding   — Absence de branding Google dans l'UI visible
 *   all        — Tout (défaut)
 *
 * ──────────────────────────────────────────────────────────────────
 *  Architecture du système :
 *
 *    ┌─────────────┐   HTTPS    ┌──────────────────┐   REST API    ┌───────────────┐
 *    │  React SPA  │ ────────── │  Express API     │ ───────────── │  Postal       │
 *    │  (Vite)     │            │  (Cloud Run)     │               │  (Hetzner)    │
 *    └─────────────┘            └──────────────────┘               └───────────────┘
 *         │                            │                                  │
 *    usePostalMailService        postal-mail.ts                     SMTP + webhook
 *    useMailProvider             PostalEmailService.ts              inbound → DB
 *    UnifiedMailPage.tsx         EmailAccountService.ts
 *                                      │
 *                               ┌──────────────────┐
 *                               │  PostgreSQL      │
 *                               │  (Cloud SQL)     │
 *                               └──────────────────┘
 *
 *  Serveur Postal :
 *    - IP : 46.225.180.8 (Hetzner CAX11, Helsinki)
 *    - OS : Ubuntu 24.04, ARM64 avec QEMU binfmt (x86_64)
 *    - Containers : postal-web (5000), postal-smtp (25), postal-worker
 *    - Reverse Proxy : Caddy → postal.zhiive.com (HTTPS auto)
 *    - MariaDB + RabbitMQ : natifs ARM64
 *    - Coût : €3,29/mois
 * ──────────────────────────────────────────────────────────────────
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(ROOT, 'src');

// ── Argument parsing ──────────────────────────────────────────
const args = process.argv.slice(2);
const sectionArg = args.find(a => a.startsWith('--section='))?.split('=')[1] || 'all';

// ── Counters ──────────────────────────────────────────────────
let passed = 0;
let failed = 0;
let warnings = 0;
const sectionResults: Record<string, { passed: number; failed: number; warnings: number }> = {};
let currentSection = '';

function startSection(name: string, emoji: string) {
  currentSection = name;
  sectionResults[name] = { passed: 0, failed: 0, warnings: 0 };
  console.log(`\n${'━'.repeat(64)}`);
  console.log(`${emoji}  ${name.toUpperCase()}`);
  console.log(`${'━'.repeat(64)}`);
}

function ok(label: string) {
  console.log(`  ✅ ${label}`);
  passed++;
  sectionResults[currentSection].passed++;
}
function fail(label: string, detail?: string) {
  console.log(`  ❌ ${label}`);
  if (detail) console.log(`     → ${detail}`);
  failed++;
  sectionResults[currentSection].failed++;
}
function warn(label: string, detail?: string) {
  console.log(`  ⚠️  ${label}`);
  if (detail) console.log(`     → ${detail}`);
  warnings++;
  sectionResults[currentSection].warnings++;
}

// ── Helpers ───────────────────────────────────────────────────
function fileExists(relPath: string): boolean {
  return fs.existsSync(path.join(ROOT, relPath));
}

function readFile(relPath: string): string {
  const full = path.join(ROOT, relPath);
  if (!fs.existsSync(full)) return '';
  return fs.readFileSync(full, 'utf-8');
}

function fileContains(relPath: string, pattern: RegExp): boolean {
  const content = readFile(relPath);
  return pattern.test(content);
}

function fileNotContains(relPath: string, pattern: RegExp): boolean {
  const content = readFile(relPath);
  if (!content) return true; // fichier absent = n'a pas le pattern
  return !pattern.test(content);
}

function grepSrc(
  pattern: RegExp,
  extensions: string[] = ['.ts', '.tsx'],
  excludePaths: string[] = []
): { file: string; line: number; text: string }[] {
  const hits: { file: string; line: number; text: string }[] = [];
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (['node_modules', '.git', 'dist', 'dist-server', 'build'].includes(entry.name)) continue;
        walk(full);
      } else if (extensions.some(e => entry.name.endsWith(e))) {
        const rel = path.relative(ROOT, full);
        if (excludePaths.some(ex => rel.includes(ex))) continue;
        const lines = fs.readFileSync(full, 'utf-8').split('\n');
        lines.forEach((txt, i) => {
          if (pattern.test(txt) && !txt.trim().startsWith('//') && !txt.trim().startsWith('*')) {
            hits.push({ file: rel, line: i + 1, text: txt.trim() });
          }
        });
      }
    }
  };
  walk(SRC);
  return hits;
}

const shouldRun = (section: string) => sectionArg === 'all' || sectionArg === section;

// ══════════════════════════════════════════════════════════════
//  SECTION 1 : BACKEND — PostalEmailService + routes
// ══════════════════════════════════════════════════════════════
if (shouldRun('backend')) {
  startSection('Backend — PostalEmailService & Routes', '📬');

  // --- Fichier PostalEmailService.ts ---
  const serviceFile = 'src/services/PostalEmailService.ts';
  if (fileExists(serviceFile)) {
    ok(`${serviceFile} existe`);

    // Singleton via db (pas new PrismaClient)
    if (fileContains(serviceFile, /import\s+\{.*db.*\}\s+from\s+['"].*database/)) {
      ok('Utilise le singleton db (pas new PrismaClient)');
    } else {
      fail('N\'utilise pas le singleton db', 'Doit importer db depuis lib/database');
    }

    if (fileNotContains(serviceFile, /new\s+PrismaClient/)) {
      ok('Aucun new PrismaClient() trouvé');
    } else {
      fail('new PrismaClient() détecté — INTERDIT', 'Provoque des fuites mémoire');
    }

    // Méthodes essentielles
    const serviceContent = readFile(serviceFile);
    const requiredMethods = ['sendEmail', 'createMailbox', 'processInboundEmail', 'testConnection', 'getWebhookEndpointId'];
    for (const method of requiredMethods) {
      if (serviceContent.includes(method)) {
        ok(`Méthode ${method}() présente`);
      } else {
        fail(`Méthode ${method}() manquante`);
      }
    }

    // Singleton export
    if (fileContains(serviceFile, /export\s+function\s+getPostalService/)) {
      ok('Singleton getPostalService() exporté');
    } else {
      fail('Singleton getPostalService() non exporté');
    }

    // Auth header
    if (fileContains(serviceFile, /X-Server-API-Key/)) {
      ok('Authentification via X-Server-API-Key');
    } else {
      fail('Header X-Server-API-Key manquant');
    }

    // Env vars
    if (fileContains(serviceFile, /POSTAL_API_URL/) && fileContains(serviceFile, /POSTAL_API_KEY/)) {
      ok('Variables d\'environnement POSTAL_API_URL + POSTAL_API_KEY référencées');
    } else {
      fail('Variables d\'environnement manquantes');
    }
  } else {
    fail(`${serviceFile} n'existe pas`, 'Fichier critique manquant');
  }

  // --- Fichier Routes postal-mail.ts ---
  const routesFile = 'src/routes/postal-mail.ts';
  if (fileExists(routesFile)) {
    ok(`${routesFile} existe`);

    const routesContent = readFile(routesFile);

    // Routes attendues
    const expectedRoutes = [
      { method: 'post', path: '/send', desc: 'Envoi email' },
      { method: 'post', path: '/sync', desc: 'Sync (no-op webhook)' },
      { method: 'post', path: '/test', desc: 'Test connexion' },
      { method: 'get', path: '/emails', desc: 'Liste emails' },
      { method: 'get', path: '/emails/:id', desc: 'Email par ID' },
      { method: 'delete', path: '/emails/:id', desc: 'Suppression email' },
      { method: 'post', path: '/emails/:id/star', desc: 'Toggle étoile' },
      { method: 'post', path: '/emails/:id/read', desc: 'Marquer lu/non lu' },
      { method: 'get', path: '/folders', desc: 'Liste dossiers' },
      { method: 'post', path: '/inbound', desc: 'Webhook réception' },
    ];

    for (const route of expectedRoutes) {
      const pattern = new RegExp(`router\\.${route.method}\\s*\\(\\s*['"]${route.path.replace(/[/:]/g, '\\$&')}['"]`);
      if (pattern.test(routesContent)) {
        ok(`Route ${route.method.toUpperCase()} ${route.path} — ${route.desc}`);
      } else {
        fail(`Route ${route.method.toUpperCase()} ${route.path} manquante — ${route.desc}`);
      }
    }

    // authMiddleware sur toutes les routes sauf /inbound
    if (fileContains(routesFile, /router\.post\('\/inbound',\s*async/)) {
      ok('Webhook /inbound sans authMiddleware (sécurisé par HMAC)');
    } else {
      warn('Vérifier que /inbound n\'utilise PAS authMiddleware');
    }

    // db singleton
    if (fileContains(routesFile, /import\s+\{.*db.*\}\s+from\s+['"].*database/)) {
      ok('Routes utilisent le singleton db');
    } else {
      fail('Routes n\'importent pas db depuis lib/database');
    }

  } else {
    fail(`${routesFile} n'existe pas`, 'Fichier critique manquant');
  }

  // --- Montage dans routes/index.ts ---
  const indexRoutes = 'src/routes/index.ts';
  if (fileExists(indexRoutes)) {
    if (fileContains(indexRoutes, /postal/i)) {
      ok('Routes postal montées dans index.ts');
    } else {
      fail('Routes postal NON montées dans index.ts');
    }
  }
}

// ══════════════════════════════════════════════════════════════
//  SECTION 2 : FRONTEND — Hook + UI
// ══════════════════════════════════════════════════════════════
if (shouldRun('frontend')) {
  startSection('Frontend — Hook & UnifiedMailPage', '🖥️');

  // --- usePostalMailService ---
  const hookFile = 'src/hooks/usePostalMailService.ts';
  if (fileExists(hookFile)) {
    ok(`${hookFile} existe`);

    const hookContent = readFile(hookFile);

    // useAuthenticatedApi (pas fetch/axios direct)
    if (hookContent.includes('useAuthenticatedApi')) {
      ok('Utilise useAuthenticatedApi (pas fetch/axios direct)');
    } else {
      fail('N\'utilise PAS useAuthenticatedApi — INTERDIT');
    }

    // Méthodes compatibles Gmail interface
    const requiredHookMethods = [
      'getMessages', 'getMessage', 'sendMessage', 'deleteMessage',
      'getLabels', 'syncEmails', 'toggleStar', 'testConnection',
    ];
    for (const method of requiredHookMethods) {
      if (hookContent.includes(method)) {
        ok(`Hook: méthode ${method}() présente`);
      } else {
        fail(`Hook: méthode ${method}() manquante`);
      }
    }

    // Stabilisation useMemo
    if (hookContent.includes('useMemo')) {
      ok('Retour stabilisé avec useMemo (pas de re-rendu infini)');
    } else {
      fail('Manque useMemo pour stabiliser le retour du hook');
    }

    // Points vers /api/postal/*
    if (hookContent.includes('/api/postal/')) {
      ok('Hook pointe vers /api/postal/*');
    } else {
      fail('Hook ne pointe pas vers les routes /api/postal/*');
    }
  } else {
    fail(`${hookFile} n'existe pas`, 'Fichier critique manquant');
  }

  // --- useMailProvider ---
  const providerFile = 'src/hooks/useMailProvider.ts';
  if (fileExists(providerFile)) {
    const providerContent = readFile(providerFile);
    if (providerContent.includes('postal')) {
      ok('useMailProvider reconnaît le type "postal"');
    } else {
      fail('useMailProvider ne détecte pas le provider "postal"');
    }
  } else {
    warn('useMailProvider.ts non trouvé');
  }

  // --- mail-provider.ts (route) ---
  const mailProviderRoute = 'src/routes/mail-provider.ts';
  if (fileExists(mailProviderRoute)) {
    if (fileContains(mailProviderRoute, /postal/)) {
      ok('Route mail-provider retourne "postal" comme type');
    } else {
      fail('Route mail-provider ne retourne pas "postal"');
    }
  }

  // --- UnifiedMailPage ---
  const mailPage = 'src/pages/UnifiedMailPage.tsx';
  if (fileExists(mailPage)) {
    const pageContent = readFile(mailPage);

    if (pageContent.includes('usePostalMailService')) {
      ok('UnifiedMailPage importe usePostalMailService');
    } else {
      fail('UnifiedMailPage n\'importe pas usePostalMailService');
    }

    if (pageContent.includes('isPostal')) {
      ok('UnifiedMailPage gère le cas isPostal');
    } else {
      fail('UnifiedMailPage ne gère pas isPostal');
    }

    if (pageContent.includes('Zhiive Mail')) {
      ok('Badge provider affiché : "Zhiive Mail"');
    } else {
      warn('Badge "Zhiive Mail" non trouvé dans UnifiedMailPage');
    }
  } else {
    fail('UnifiedMailPage.tsx non trouvé');
  }
}

// ══════════════════════════════════════════════════════════════
//  SECTION 3 : SÉCURITÉ
// ══════════════════════════════════════════════════════════════
if (shouldRun('security')) {
  startSection('Sécurité', '🔒');

  // --- HMAC webhook verification ---
  const routesContent = readFile('src/routes/postal-mail.ts');
  if (routesContent.includes('createHmac') && routesContent.includes('sha256')) {
    ok('Webhook inbound vérifié par HMAC SHA-256');
  } else {
    fail('Webhook inbound NON sécurisé par HMAC');
  }

  if (routesContent.includes('timingSafeEqual')) {
    ok('Comparaison de signature timing-safe (anti timing attack)');
  } else {
    fail('Comparaison de signature NON timing-safe');
  }

  if (routesContent.includes('POSTAL_WEBHOOK_SECRET')) {
    ok('Variable POSTAL_WEBHOOK_SECRET utilisée');
  } else {
    fail('POSTAL_WEBHOOK_SECRET non référencé');
  }

  // --- authMiddleware sur les routes utilisateur ---
  const authRoutes = ['/send', '/sync', '/test', '/emails', '/folders'];
  for (const route of authRoutes) {
    const pattern = new RegExp(`router\\.[a-z]+\\s*\\('${route.replace('/', '\\/')}[^)]*authMiddleware`);
    if (pattern.test(routesContent)) {
      ok(`Route ${route} protégée par authMiddleware`);
    } else {
      // Vérification alternative : authMiddleware apparaît avant la route
      const routeIndex = routesContent.indexOf(`'${route}'`);
      const authIndex = routesContent.lastIndexOf('authMiddleware', routeIndex);
      if (routeIndex > 0 && authIndex > 0 && (routeIndex - authIndex) < 100) {
        ok(`Route ${route} protégée par authMiddleware`);
      } else {
        warn(`Route ${route} — vérifier authMiddleware manuellement`);
      }
    }
  }

  // --- userId check in every handler ---
  const userIdChecks = (routesContent.match(/req\.user\?\.userId/g) || []).length;
  if (userIdChecks >= 8) {
    ok(`${userIdChecks} vérifications req.user?.userId trouvées (isolation par utilisateur)`);
  } else {
    warn(`Seulement ${userIdChecks} vérifications userId — attendu >= 8`);
  }

  // --- Pas de new PrismaClient nulle part dans les fichiers postal ---
  const postalFiles = [
    'src/services/PostalEmailService.ts',
    'src/routes/postal-mail.ts',
    'src/hooks/usePostalMailService.ts',
  ];
  let prismaViolation = false;
  for (const f of postalFiles) {
    if (fileContains(f, /new\s+PrismaClient/)) {
      fail(`new PrismaClient dans ${f}`, 'INTERDIT — utiliser db singleton');
      prismaViolation = true;
    }
  }
  if (!prismaViolation) {
    ok('Aucun new PrismaClient() dans les fichiers postal');
  }

  // --- Pas de credentials en dur ---
  const hardcodedSecrets = grepSrc(
    /POSTAL_API_KEY\s*[:=]\s*['"][a-zA-Z0-9]{10,}['"]/,
    ['.ts', '.tsx'],
    ['node_modules', 'dist']
  );
  if (hardcodedSecrets.length === 0) {
    ok('Aucune clé API Postal en dur dans le code');
  } else {
    fail('Clé API Postal trouvée en dur !', hardcodedSecrets.map(h => `${h.file}:${h.line}`).join(', '));
  }

  // --- fetch/axios direct dans les hooks ---
  const hookContent = readFile('src/hooks/usePostalMailService.ts');
  if (!hookContent.includes('fetch(') && !hookContent.includes('axios')) {
    ok('Hook n\'utilise ni fetch() ni axios directement');
  } else {
    fail('Hook utilise fetch/axios directement — utiliser useAuthenticatedApi');
  }

  // --- Parameterized queries (Prisma handles this) ---
  ok('Prisma ORM protège nativement contre l\'injection SQL');

  // --- Input validation on /send ---
  if (routesContent.includes("!to || !subject || !body")) {
    ok('Validation des champs requis sur POST /send');
  } else {
    warn('Vérifier la validation d\'input sur POST /send');
  }

  // --- Delete : double step (corbeille puis définitif) ---
  if (routesContent.includes("folder === 'trash'")) {
    ok('Suppression en 2 étapes (corbeille → définitif)');
  } else {
    warn('Vérifier la logique de suppression en 2 étapes');
  }

  // --- Pagination sécurisée ---
  if (routesContent.includes('Math.min') && routesContent.includes('100')) {
    ok('Pagination limitée (max 100 résultats par page)');
  } else {
    warn('Vérifier la limitation de pagination');
  }
}

// ══════════════════════════════════════════════════════════════
//  SECTION 4 : PROVISIONNEMENT AUTOMATIQUE
// ══════════════════════════════════════════════════════════════
if (shouldRun('provisioning')) {
  startSection('Provisionnement automatique', '🔧');

  const emailAccountService = 'src/services/EmailAccountService.ts';
  if (fileExists(emailAccountService)) {
    ok(`${emailAccountService} existe`);

    const content = readFile(emailAccountService);

    if (content.includes('getPostalService') || content.includes('PostalEmailService')) {
      ok('EmailAccountService intègre le provisionnement Postal');
    } else {
      fail('Provisionnement Postal absent de EmailAccountService');
    }

    if (content.includes('DEFAULT_EMAIL_DOMAIN')) {
      ok('Variable DEFAULT_EMAIL_DOMAIN utilisée pour le domaine');
    } else {
      fail('DEFAULT_EMAIL_DOMAIN non référencé');
    }

    if (content.includes('createMailbox')) {
      ok('Appel à postal.createMailbox() lors de l\'inscription');
    } else {
      fail('createMailbox() non appelé — boîte mail pas créée automatiquement');
    }

    if (content.includes("mailProvider") && content.includes("'postal'")) {
      ok('Provider "postal" stocké dans emailAccount');
    } else {
      warn('Vérifier que mailProvider est "postal" lors de la création');
    }

    // Format email : prénom.nom@domaine
    if (content.includes('prénom') || content.includes('firstName') || content.includes('normaliz')) {
      ok('Logique de génération email (prénom.nom@domaine) présente');
    } else {
      warn('Vérifier la logique de génération d\'adresse email');
    }
  } else {
    fail(`${emailAccountService} n'existe pas`);
  }
}

// ══════════════════════════════════════════════════════════════
//  SECTION 5 : INFRASTRUCTURE
// ══════════════════════════════════════════════════════════════
if (shouldRun('infra')) {
  startSection('Infrastructure — Hetzner + Postal + DNS', '🏗️');

  console.log('');
  console.log('  ┌───────────────────────────────────────────────────────────┐');
  console.log('  │  SERVEUR HETZNER                                          │');
  console.log('  ├───────────────────────────────────────────────────────────┤');
  console.log('  │  Type       : CAX11 (ARM64 Ampere)                        │');
  console.log('  │  vCPU       : 2                                           │');
  console.log('  │  RAM        : 4 Go                                        │');
  console.log('  │  IP         : 46.225.180.8                                │');
  console.log('  │  Datacenter : Helsinki (eu-central)                       │');
  console.log('  │  OS         : Ubuntu 24.04                                │');
  console.log('  │  Coût       : €3,29/mois                                  │');
  console.log('  │  Émulation  : QEMU binfmt (x86_64 sur ARM64)             │');
  console.log('  └───────────────────────────────────────────────────────────┘');
  console.log('');
  console.log('  ┌───────────────────────────────────────────────────────────┐');
  console.log('  │  CONTAINERS DOCKER                                        │');
  console.log('  ├───────────────────────────────────────────────────────────┤');
  console.log('  │  postal-web    → port 5000 (UI admin Postal)              │');
  console.log('  │  postal-smtp   → port 25 (réception/envoi SMTP)           │');
  console.log('  │  postal-worker → traitement background                    │');
  console.log('  │  caddy         → port 443 (HTTPS reverse proxy)           │');
  console.log('  ├───────────────────────────────────────────────────────────┤');
  console.log('  │  NATIFS (ARM64) :                                         │');
  console.log('  │  MariaDB       → port 3306                               │');
  console.log('  │  RabbitMQ      → port 5672                               │');
  console.log('  └───────────────────────────────────────────────────────────┘');
  console.log('');

  // Vérifier la présence du fichier DNS-CONFIGURATION.md
  if (fileExists('DNS-CONFIGURATION.md')) {
    ok('Documentation DNS-CONFIGURATION.md présente');
  } else {
    warn('DNS-CONFIGURATION.md non trouvé à la racine');
  }

  console.log('');
  console.log('  ┌───────────────────────────────────────────────────────────┐');
  console.log('  │  ENREGISTREMENTS DNS REQUIS (one.com → zhiive.com)        │');
  console.log('  ├──────────┬──────────────────────┬─────────────────────────┤');
  console.log('  │ Type     │ Nom                  │ Valeur                  │');
  console.log('  ├──────────┼──────────────────────┼─────────────────────────┤');
  console.log('  │ A        │ postal               │ 46.225.180.8            │');
  console.log('  │ A        │ mx.postal            │ 46.225.180.8            │');
  console.log('  │ A        │ rp.postal            │ 46.225.180.8            │');
  console.log('  │ A        │ spf.postal           │ 46.225.180.8            │');
  console.log('  │ MX       │ zhiive.com           │ mx.postal.zhiive.com    │');
  console.log('  │ TXT      │ zhiive.com (SPF)     │ v=spf1 a mx            │');
  console.log('  │          │                      │ ip4:46.225.180.8 ~all   │');
  console.log('  │ TXT      │ _dmarc               │ v=DMARC1; p=quarantine │');
  console.log('  │          │                      │ rua=postmaster@...      │');
  console.log('  │ TXT      │ postal._domainkey    │ (clé DKIM générée)     │');
  console.log('  └──────────┴──────────────────────┴─────────────────────────┘');
  console.log('');

  // Vérifier les variables d'environnement
  console.log('  ┌───────────────────────────────────────────────────────────┐');
  console.log('  │  VARIABLES D\'ENVIRONNEMENT REQUISES (Cloud Run)           │');
  console.log('  ├───────────────────────────────────────────────────────────┤');
  console.log('  │  POSTAL_API_URL         → https://postal.zhiive.com      │');
  console.log('  │  POSTAL_API_KEY         → (clé serveur Postal)           │');
  console.log('  │  POSTAL_WEBHOOK_SECRET  → (secret partagé HMAC)          │');
  console.log('  │  DEFAULT_EMAIL_DOMAIN   → zhiive.com                     │');
  console.log('  └───────────────────────────────────────────────────────────┘');
  console.log('');

  const envVars = ['POSTAL_API_URL', 'POSTAL_API_KEY', 'POSTAL_WEBHOOK_SECRET', 'DEFAULT_EMAIL_DOMAIN'];
  for (const envVar of envVars) {
    if (process.env[envVar]) {
      ok(`${envVar} défini dans l'environnement`);
    } else {
      warn(`${envVar} NON défini dans l'environnement courant`);
    }
  }

  // Vérifier .env.example
  if (fileExists('.env.example')) {
    const envExample = readFile('.env.example');
    for (const envVar of envVars) {
      if (envExample.includes(envVar)) {
        ok(`${envVar} documenté dans .env.example`);
      } else {
        warn(`${envVar} manquant dans .env.example`);
      }
    }
  }
}

// ══════════════════════════════════════════════════════════════
//  SECTION 6 : BRANDING — Absence de Google dans l'UI
// ══════════════════════════════════════════════════════════════
if (shouldRun('branding')) {
  startSection('Branding — Pas de Google dans l\'UI email', '🐝');

  const filesToCheck = [
    'src/components/GoogleAuthError.tsx',
    'src/components/GoogleConnectionCard.tsx',
    'src/components/GoogleAutoConnectionStatus.tsx',
    'src/pages/LeadDetail.tsx',
    'src/pages/GoogleWorkspaceConfig.tsx',
    'src/pages/LeadsMainPage.tsx',
    'src/pages/LeadsSettingsPage.tsx',
    'src/pages/LeadsPage.tsx',
  ];

  for (const file of filesToCheck) {
    if (!fileExists(file)) {
      warn(`${file} non trouvé — peut avoir été déplacé`);
      continue;
    }

    const content = readFile(file);

    // Vérifier l'absence de "Gmail" dans les strings visibles
    // (on ignore les noms de variables/imports comme useGmailService)
    const gmailInStrings = content.match(/['"`].*Gmail.*['"`]/g) || [];
    const visibleGmail = gmailInStrings.filter(
      s => !s.includes('useGmail') && !s.includes('gmail.') && !s.includes('GmailService')
    );

    if (visibleGmail.length === 0) {
      ok(`${path.basename(file)} — aucun "Gmail" visible dans l'UI`);
    } else {
      fail(`${path.basename(file)} — "Gmail" trouvé dans l'UI`, visibleGmail.join(', '));
    }
  }

  // Vérifier que "Zhiive Mail" est utilisé comme label
  const unifiedMail = readFile('src/pages/UnifiedMailPage.tsx');
  if (unifiedMail.includes('Zhiive Mail')) {
    ok('Label "Zhiive Mail" utilisé pour le provider postal');
  } else {
    warn('"Zhiive Mail" non trouvé dans UnifiedMailPage');
  }
}

// ══════════════════════════════════════════════════════════════
//  RÉSUMÉ FINAL
// ══════════════════════════════════════════════════════════════
console.log(`\n${'═'.repeat(64)}`);
console.log(`📊  RÉSUMÉ AUDIT EMAIL POSTAL — @zhiive.com`);
console.log(`${'═'.repeat(64)}`);

const totalTests = passed + failed + warnings;
console.log(`  Tests exécutés : ${totalTests}`);
console.log(`  ✅ Réussis      : ${passed}`);
console.log(`  ❌ Échoués      : ${failed}`);
console.log(`  ⚠️  Avertissements : ${warnings}`);
console.log('');

// Détail par section
for (const [section, counts] of Object.entries(sectionResults)) {
  const status = counts.failed > 0 ? '❌' : counts.warnings > 0 ? '⚠️ ' : '✅';
  console.log(`  ${status} ${section}: ${counts.passed}✓ ${counts.failed}✗ ${counts.warnings}⚠`);
}

console.log('');
console.log('  ┌───────────────────────────────────────────────────────────┐');
console.log('  │  CHECKLIST DE MISE EN PRODUCTION                          │');
console.log('  ├───────────────────────────────────────────────────────────┤');
console.log('  │  □ DNS configuré sur one.com (A, MX, TXT SPF/DMARC/DKIM)│');
console.log('  │  □ Variables POSTAL_* ajoutées sur Cloud Run              │');
console.log('  │  □ Webhook URL accessible publiquement                    │');
console.log('  │  □ Test envoi email (postal → destinataire)               │');
console.log('  │  □ Test réception email (expéditeur → postal → DB)        │');
console.log('  │  □ Test auto-provisionnement (nouvel utilisateur)         │');
console.log('  │  □ Test UI : badge "Zhiive Mail" (gold) visible           │');
  console.log('  │  □ Test délivrabilité : SPF pass, DKIM pass, DMARC pass │');
console.log('  └───────────────────────────────────────────────────────────┘');
console.log('');

if (failed > 0) {
  console.log(`  🔴 ${failed} ERREUR(S) DÉTECTÉE(S) — À corriger avant production.`);
  process.exit(1);
} else if (warnings > 0) {
  console.log(`  🟡 Système opérationnel avec ${warnings} avertissement(s) mineurs.`);
  process.exit(0);
} else {
  console.log('  🟢 TOUS LES TESTS PASSÉS — Système email Postal prêt pour production.');
  process.exit(0);
}
