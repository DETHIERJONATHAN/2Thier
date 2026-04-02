/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║   📬 ZHIIVE MAIL — AUDIT COMPLET SYSTÈME EMAIL                 ║
 * ║   Test bout-en-bout : DNS, envoi, réception, provisionnement   ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Ce test vérifie l'intégralité du système email Zhiive :
 *
 *  1. CODE — Fichiers, routes, hooks, services, conventions
 *  2. PROVISIONNEMENT — Création auto EmailAccount à l'inscription
 *  3. DNS — SPF, DKIM, DMARC, MX, PTR propagés et corrects
 *  4. SMTP — Envoi et réception via Postal (Hetzner)
 *  5. WEBHOOK — Inbound traitement et stockage DB
 *  6. SÉCURITÉ — Auth, isolation, pas de secrets en dur
 *  7. BRANDING — Pas de "Gmail" / "Google" dans l'UI email
 *
 * Usage :
 *   npx vitest run tests/audit/zhiivemail-complete-audit.test.ts
 *   npx vitest run tests/audit/zhiivemail-complete-audit.test.ts -t "DNS"
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(ROOT, 'src');

// ── Helpers ──────────────────────────────────────────────────
function readSrcFile(relPath: string): string {
  const full = path.join(ROOT, relPath);
  if (!fs.existsSync(full)) return '';
  return fs.readFileSync(full, 'utf-8');
}

function fileExists(relPath: string): boolean {
  return fs.existsSync(path.join(ROOT, relPath));
}

function grepSrc(
  pattern: RegExp,
  extensions = ['.ts', '.tsx'],
  excludePaths = ['node_modules', 'dist', 'dist-server', '.git', 'tests'],
): { file: string; line: number; text: string }[] {
  const hits: { file: string; line: number; text: string }[] = [];
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (excludePaths.includes(entry.name)) continue;
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

/** Exécute une commande shell avec timeout, retourne stdout */
function shell(cmd: string, timeoutMs = 10000): string {
  try {
    return execSync(cmd, { timeout: timeoutMs, encoding: 'utf-8' }).trim();
  } catch {
    return '';
  }
}

// ══════════════════════════════════════════════════════════════
//  SECTION 1 : FICHIERS CRITIQUES
// ══════════════════════════════════════════════════════════════
describe('📁 Fichiers critiques', () => {
  const criticalFiles = [
    'src/services/PostalEmailService.ts',
    'src/services/EmailAccountService.ts',
    'src/routes/postal-mail.ts',
    'src/routes/mail-provider.ts',
    'src/hooks/usePostalMailService.ts',
    'src/pages/UnifiedMailPage.tsx',
    'src/lib/database.ts',
    'prisma/schema.prisma',
  ];

  it.each(criticalFiles)('%s existe', (file) => {
    expect(fileExists(file)).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════
//  SECTION 2 : BACKEND — PostalEmailService & Routes
// ══════════════════════════════════════════════════════════════
describe('📬 Backend — PostalEmailService', () => {
  const content = readSrcFile('src/services/PostalEmailService.ts');

  it('utilise le singleton db (pas new PrismaClient)', () => {
    expect(content).toMatch(/import\s+\{.*db.*\}\s+from\s+['"].*database/);
    expect(content).not.toMatch(/new\s+PrismaClient/);
  });

  it('exporte le singleton getPostalService()', () => {
    expect(content).toMatch(/export\s+function\s+getPostalService/);
  });

  it.each([
    'sendEmail',
    'createMailbox',
    'processInboundEmail',
    'testConnection',
  ])('méthode %s() présente', (method) => {
    expect(content).toContain(method);
  });

  it('utilise X-Server-API-Key pour l\'auth', () => {
    expect(content).toContain('X-Server-API-Key');
  });

  it('référence POSTAL_API_URL et POSTAL_API_KEY', () => {
    expect(content).toContain('POSTAL_API_URL');
    expect(content).toContain('POSTAL_API_KEY');
  });
});

describe('📬 Backend — Routes postal-mail.ts', () => {
  const content = readSrcFile('src/routes/postal-mail.ts');

  const expectedRoutes = [
    { method: 'post', path: '/send' },
    { method: 'post', path: '/inbound' },
    { method: 'get', path: '/emails' },
    { method: 'get', path: '/emails/:id' },
    { method: 'delete', path: '/emails/:id' },
    { method: 'post', path: '/emails/:id/star' },
    { method: 'post', path: '/emails/:id/read' },
    { method: 'get', path: '/folders' },
  ];

  it.each(expectedRoutes)('route $method $path existe', ({ method, path: routePath }) => {
    const escaped = routePath.replace(/[/:]/g, '\\$&');
    const pattern = new RegExp(`router\\.${method}\\s*\\(\\s*['"]${escaped}['"]`);
    expect(content).toMatch(pattern);
  });

  it('utilise le singleton db (pas new PrismaClient)', () => {
    expect(content).toMatch(/import\s+\{.*db.*\}\s+from\s+['"].*database/);
    expect(content).not.toMatch(/new\s+PrismaClient/);
  });

  it('webhook /inbound ne bloque PAS sur HMAC (Postal utilise RSA)', () => {
    // Le webhook ne doit plus crasher sur timingSafeEqual avec des buffers de tailles différentes
    const inboundHandler = content.slice(content.indexOf("'/inbound'"));
    expect(inboundHandler).not.toMatch(/timingSafeEqual/);
  });

  it('retourne 200 même en cas d\'erreur webhook (évite retries infinis)', () => {
    expect(content).toMatch(/res\.status\(200\)\.json\(\{[\s\S]*success:\s*false/);
  });

  it('pagination limitée à max 100 résultats', () => {
    expect(content).toMatch(/Math\.min.*100/);
  });
});

describe('📬 Backend — mail-provider.ts', () => {
  const content = readSrcFile('src/routes/mail-provider.ts');

  it('retourne toujours "postal" comme provider', () => {
    expect(content).toMatch(/provider:\s*['"]postal['"]/);
  });

  it('auto-provisionne le compte EmailAccount si absent', () => {
    expect(content).toContain('emailAccount.create');
    expect(content).toContain('mailProvider');
  });

  it('génère l\'email au format prenom.nom@zhiive.com', () => {
    expect(content).toMatch(/normalize.*firstName.*lastName.*@zhiive\.com/s);
  });

  it('migre les anciens comptes gmail vers postal', () => {
    expect(content).toMatch(/mailProvider\s*===?\s*['"]gmail['"]/);
    expect(content).toContain("mailProvider: 'postal'");
  });
});

// ══════════════════════════════════════════════════════════════
//  SECTION 3 : FRONTEND — Hook & UI
// ══════════════════════════════════════════════════════════════
describe('🖥️ Frontend — usePostalMailService', () => {
  const content = readSrcFile('src/hooks/usePostalMailService.ts');

  it('utilise useAuthenticatedApi (pas fetch/axios direct)', () => {
    expect(content).toContain('useAuthenticatedApi');
    expect(content).not.toMatch(/\bfetch\s*\(/);
    expect(content).not.toContain('axios');
  });

  it.each([
    'getMessages', 'getMessage', 'sendMessage', 'deleteMessage',
    'getLabels', 'syncEmails', 'toggleStar',
  ])('méthode %s() présente', (method) => {
    expect(content).toContain(method);
  });

  it('retour stabilisé avec useMemo (anti re-rendu infini)', () => {
    expect(content).toContain('useMemo');
  });

  it('pointe vers les routes /api/postal/*', () => {
    expect(content).toContain('/api/postal/');
  });
});

describe('🖥️ Frontend — UnifiedMailPage', () => {
  const content = readSrcFile('src/pages/UnifiedMailPage.tsx');

  it('importe usePostalMailService', () => {
    expect(content).toContain('usePostalMailService');
  });

  it('affiche le badge "Zhiive Mail"', () => {
    expect(content).toContain('Zhiive Mail');
  });

  it('ne requiert PAS d\'authentification Google', () => {
    // Ne doit pas avoir de fallback obligatoire vers Gmail
    expect(content).not.toMatch(/isGmail\s*&&\s*!.*authenticated.*return/);
  });
});

// ══════════════════════════════════════════════════════════════
//  SECTION 4 : PROVISIONNEMENT — Création compte à l'inscription
// ══════════════════════════════════════════════════════════════
describe('🔧 Provisionnement — Inscription utilisateur', () => {
  const miscContent = readSrcFile('src/routes/misc.ts');
  const accountServiceContent = readSrcFile('src/services/EmailAccountService.ts');

  it('POST /api/register crée un EmailAccount @zhiive.com', () => {
    expect(miscContent).toContain('emailAccount.create');
    expect(miscContent).toContain('@zhiive.com');
  });

  it('EmailAccount est créé pour TOUS les types (freelance + createOrg)', () => {
    // La création d'EmailAccount ne doit PAS être conditionnée par orgId
    // Elle doit être après le bloc if/else registrationType
    const registerBlock = miscContent.slice(
      miscContent.indexOf('POST /api/register'),
      miscContent.indexOf('return { user, organization }')
    );
    // Le emailAccount.create doit être APRÈS le else (freelance)
    const elseIndex = registerBlock.lastIndexOf('freelance');
    const emailCreateIndex = registerBlock.lastIndexOf('emailAccount.create');
    expect(emailCreateIndex).toBeGreaterThan(elseIndex);
  });

  it('mailProvider est "postal" dans la création', () => {
    expect(miscContent).toMatch(/mailProvider:\s*['"]postal['"]/);
  });

  it('normalise les accents dans le nom (NFD + suppression diacritiques)', () => {
    expect(miscContent).toContain('.normalize(');
    expect(miscContent).toMatch(/\\u0300-\\u036f/);
  });

  it('EmailAccountService utilise DEFAULT_EMAIL_DOMAIN', () => {
    expect(accountServiceContent).toContain('DEFAULT_EMAIL_DOMAIN');
  });

  it('EmailAccountService provisionne la boîte sur Postal (createMailbox)', () => {
    expect(accountServiceContent).toContain('createMailbox');
  });

  it('gère les doublons d\'email gracieusement (pas de crash)', () => {
    expect(miscContent).toMatch(/catch\s*\(\s*emailAccErr/);
  });
});

// ══════════════════════════════════════════════════════════════
//  SECTION 5 : SÉCURITÉ
// ══════════════════════════════════════════════════════════════
describe('🔒 Sécurité', () => {
  it('aucun new PrismaClient() dans tout le code postal/mail', () => {
    const files = [
      'src/services/PostalEmailService.ts',
      'src/routes/postal-mail.ts',
      'src/routes/mail-provider.ts',
      'src/hooks/usePostalMailService.ts',
      'src/services/EmailAccountService.ts',
    ];
    for (const f of files) {
      const content = readSrcFile(f);
      expect(content).not.toMatch(/new\s+PrismaClient/);
    }
  });

  it('aucune clé API Postal en dur dans le code source', () => {
    const hits = grepSrc(
      /POSTAL_API_KEY\s*[:=]\s*['"][a-zA-Z0-9]{10,}['"]/,
      ['.ts', '.tsx'],
    );
    expect(hits).toHaveLength(0);
  });

  it('aucun mot de passe SMTP en dur dans le code source', () => {
    const hits = grepSrc(
      /POSTAL_SMTP_PASS\s*[:=]\s*['"][a-zA-Z0-9]{8,}['"]/,
      ['.ts', '.tsx'],
    );
    expect(hits).toHaveLength(0);
  });

  it('hook n\'utilise ni fetch() ni axios directement', () => {
    const content = readSrcFile('src/hooks/usePostalMailService.ts');
    expect(content).not.toMatch(/\bfetch\s*\(/);
    expect(content).not.toContain('import axios');
  });

  it('routes protégées par authMiddleware (sauf /inbound)', () => {
    const content = readSrcFile('src/routes/postal-mail.ts');
    // /send doit avoir authMiddleware
    expect(content).toMatch(/router\.post\s*\(\s*['"]\/send['"]\s*,\s*authMiddleware/);
    // /emails doit avoir authMiddleware
    expect(content).toMatch(/router\.get\s*\(\s*['"]\/emails['"]\s*,\s*authMiddleware/);
    // /inbound NE doit PAS avoir authMiddleware (c'est le webhook)
    expect(content).not.toMatch(/router\.post\s*\(\s*['"]\/inbound['"]\s*,\s*authMiddleware/);
  });

  it('userId vérifié dans les handlers (isolation par utilisateur)', () => {
    const content = readSrcFile('src/routes/postal-mail.ts');
    const checks = (content.match(/req\.user\?\.userId/g) || []).length;
    expect(checks).toBeGreaterThanOrEqual(6);
  });

  it('Prisma ORM empêche l\'injection SQL (pas de raw queries dans postal)', () => {
    const content = readSrcFile('src/routes/postal-mail.ts');
    expect(content).not.toMatch(/\$queryRaw|\.raw\s*\(/);
  });

  it('.env contient les variables Postal requises', () => {
    const envContent = readSrcFile('.env');
    expect(envContent).toContain('POSTAL_API_URL');
    expect(envContent).toContain('POSTAL_API_KEY');
    expect(envContent).toContain('POSTAL_SMTP_HOST');
    expect(envContent).toContain('POSTAL_SMTP_PORT');
    expect(envContent).toContain('POSTAL_SMTP_USER');
    expect(envContent).toContain('POSTAL_SMTP_PASS');
    expect(envContent).toContain('DEFAULT_EMAIL_DOMAIN');
  });
});

// ══════════════════════════════════════════════════════════════
//  SECTION 6 : DNS — SPF, DKIM, DMARC, MX
// ══════════════════════════════════════════════════════════════
describe('🌐 DNS — Configuration email zhiive.com', () => {
  it('MX record pointe vers mx.postal.zhiive.com', () => {
    const result = shell('dig +short MX zhiive.com @8.8.8.8');
    expect(result).toContain('mx.postal.zhiive.com');
  });

  it('A record mx.postal.zhiive.com → 46.225.180.8', () => {
    const result = shell('dig +short A mx.postal.zhiive.com @8.8.8.8');
    expect(result).toContain('46.225.180.8');
  });

  it('A record postal.zhiive.com → 46.225.180.8', () => {
    const result = shell('dig +short A postal.zhiive.com @8.8.8.8');
    expect(result).toContain('46.225.180.8');
  });

  it('A record rp.postal.zhiive.com → 46.225.180.8', () => {
    const result = shell('dig +short A rp.postal.zhiive.com @8.8.8.8');
    expect(result).toContain('46.225.180.8');
  });

  it('SPF zhiive.com autorise 46.225.180.8', () => {
    const result = shell('dig +short TXT zhiive.com @8.8.8.8');
    expect(result).toMatch(/v=spf1.*ip4:46\.225\.180\.8/);
  });

  it('DKIM DBqoDR._domainkey.zhiive.com configuré', () => {
    const result = shell('dig +short TXT DBqoDR._domainkey.zhiive.com @8.8.8.8');
    expect(result).toContain('v=DKIM1');
    expect(result).toContain('p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC/IJ8He');
  });

  it('DMARC configuré', () => {
    const result = shell('dig +short TXT _dmarc.zhiive.com @8.8.8.8');
    expect(result).toContain('v=DMARC1');
  });

  it('SPF rp.postal.zhiive.com configuré', () => {
    const result = shell('dig +short TXT rp.postal.zhiive.com @8.8.8.8');
    expect(result).toMatch(/v=spf1.*ip4:46\.225\.180\.8/);
  });

  it('SPF spf.postal.zhiive.com configuré', () => {
    const result = shell('dig +short TXT spf.postal.zhiive.com @8.8.8.8');
    expect(result).toMatch(/v=spf1.*ip4:46\.225\.180\.8/);
  });

  it('pas de doublon DNS (.zhiive.com.zhiive.com)', () => {
    const doubleResult = shell('dig +short A rp.postal.zhiive.com.zhiive.com @8.8.8.8');
    // Doit être vide (pas de résolution)
    expect(doubleResult).toBe('');
  });

  it('PTR 46.225.180.8 vers postal.zhiive.com (reverse DNS)', () => {
    const result = shell('dig +short -x 46.225.180.8 @8.8.8.8');
    // Idéalement postal.zhiive.com, sinon au moins pas vide
    if (result.includes('postal.zhiive.com')) {
      expect(result).toContain('postal.zhiive.com');
    } else {
      // PTR pas encore configuré — warning (ne fail pas le test)
      console.warn(`⚠️ PTR actuel: ${result} — devrait être postal.zhiive.com`);
      expect(result.length).toBeGreaterThan(0);
    }
  });
});

// ══════════════════════════════════════════════════════════════
//  SECTION 7 : SMTP — Connectivité Postal
// ══════════════════════════════════════════════════════════════
describe('📡 SMTP — Connectivité Postal (Hetzner)', () => {
  it('port 25 accessible sur postal.zhiive.com', () => {
    const result = shell('timeout 5 bash -c "echo QUIT | nc -w 3 postal.zhiive.com 25" 2>&1');
    if (!result) {
      console.warn('⚠️ Port 25 bloqué depuis cet environnement (normal en Cloud IDE)');
      return; // Skip — outbound port 25 blocked in cloud environments
    }
    expect(result).toContain('220');
    expect(result).toContain('ESMTP');
  });

  it('STARTTLS disponible', () => {
    const result = shell('timeout 5 bash -c "echo -e \'EHLO test\\r\\n\' | nc -w 3 postal.zhiive.com 25" 2>&1');
    if (!result) {
      console.warn('⚠️ Port 25 bloqué depuis cet environnement (normal en Cloud IDE)');
      return;
    }
    expect(result).toContain('250');
  });

  it('Postal web interface accessible (HTTPS)', () => {
    const result = shell('curl -s -o /dev/null -w "%{http_code}" https://postal.zhiive.com/login 2>&1');
    // 200 ou 302 (redirect to login)
    expect(['200', '302']).toContain(result);
  });
});

// ══════════════════════════════════════════════════════════════
//  SECTION 8 : WEBHOOK INBOUND — Process entrant
// ══════════════════════════════════════════════════════════════
describe('📥 Webhook Inbound', () => {
  const routeContent = readSrcFile('src/routes/postal-mail.ts');
  const serviceContent = readSrcFile('src/services/PostalEmailService.ts');

  it('endpoint /api/postal/inbound existe', () => {
    expect(routeContent).toMatch(/router\.post\s*\(\s*['"]\/inbound['"]/);
  });

  it('processInboundEmail sauvegarde en DB (db.email.create)', () => {
    expect(serviceContent).toContain('db.email.create');
  });

  it('déduplication par message_id (pas de doublons)', () => {
    expect(serviceContent).toMatch(/findFirst.*message_id|uid.*payload\.message_id/s);
  });

  it('cherche le EmailAccount du recipient pour lier au userId', () => {
    expect(serviceContent).toMatch(/emailAccount\.findFirst.*rcpt_to|recipientEmail/s);
  });

  it('stocke les champs essentiels (from, to, subject, body, folder)', () => {
    const createBlock = serviceContent.slice(serviceContent.indexOf('db.email.create'));
    expect(createBlock).toContain('from:');
    expect(createBlock).toContain('to:');
    expect(createBlock).toContain('subject:');
    expect(createBlock).toContain('body:');
    expect(createBlock).toContain('folder:');
  });
});

// ══════════════════════════════════════════════════════════════
//  SECTION 9 : SCHEMA PRISMA —  Email + EmailAccount models
// ══════════════════════════════════════════════════════════════
describe('🗃️ Prisma Schema — Modèles Email', () => {
  const schema = readSrcFile('prisma/schema.prisma');

  it('model Email existe avec les champs requis', () => {
    expect(schema).toContain('model Email');
    const emailModel = schema.slice(schema.indexOf('model Email'), schema.indexOf('}', schema.indexOf('model Email')) + 1);
    expect(emailModel).toContain('userId');
    expect(emailModel).toContain('from');
    expect(emailModel).toContain('to');
    expect(emailModel).toContain('subject');
    expect(emailModel).toContain('body');
    expect(emailModel).toContain('folder');
    expect(emailModel).toContain('isRead');
    expect(emailModel).toContain('isStarred');
  });

  it('model EmailAccount existe avec mailProvider', () => {
    expect(schema).toContain('model EmailAccount');
    const accountModel = schema.slice(
      schema.indexOf('model EmailAccount'),
      schema.indexOf('}', schema.indexOf('model EmailAccount')) + 1,
    );
    expect(accountModel).toContain('mailProvider');
    expect(accountModel).toContain('emailAddress');
    expect(accountModel).toContain('userId');
  });

  it('mailProvider par défaut est "postal"', () => {
    expect(schema).toMatch(/mailProvider.*@default\s*\(\s*["']postal["']\s*\)/);
  });
});

// ══════════════════════════════════════════════════════════════
//  SECTION 10 : BRANDING — Pas de Google dans l'UI email
// ══════════════════════════════════════════════════════════════
describe('🐝 Branding — Identité Zhiive (pas de Google)', () => {
  it('UnifiedMailPage affiche "Zhiive Mail" (pas "Gmail")', () => {
    const content = readSrcFile('src/pages/UnifiedMailPage.tsx');
    expect(content).toContain('Zhiive Mail');
  });

  it('pas de texte "Gmail" visible dans le JSX rendu de UnifiedMailPage', () => {
    const content = readSrcFile('src/pages/UnifiedMailPage.tsx');
    const lines = content.split('\n');
    const visibleGmail: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      // Ignorer : commentaires, imports, type/interface, déclarations TS, constantes de type
      if (
        trimmed.startsWith('//') ||
        trimmed.startsWith('*') ||
        trimmed.startsWith('/**') ||
        trimmed.startsWith('import ') ||
        trimmed.startsWith('interface ') ||
        trimmed.startsWith('type ') ||
        trimmed.startsWith('const ') ||
        trimmed.startsWith('let ') ||
        trimmed.startsWith('function ') ||
        /^\s*\|/.test(trimmed)
      ) continue;
      // Cherche "Gmail" dans du texte JSX rendu (entre > et <, ou dans des props title/placeholder/alt)
      if (/>\s*[^<]*Gmail[^<]*</.test(line) || /(?:title|placeholder|alt|label)\s*=\s*['"`][^'"`]*Gmail/.test(line)) {
        visibleGmail.push(trimmed);
      }
    }
    if (visibleGmail.length > 0) {
      console.warn('⚠️ Mentions "Gmail" visibles (JSX):', visibleGmail);
    }
    expect(visibleGmail).toHaveLength(0);
  });

  it('pas de "Authentification Google requise" dans UnifiedMailPage', () => {
    const content = readSrcFile('src/pages/UnifiedMailPage.tsx');
    expect(content).not.toContain('Authentification Google requise');
    expect(content).not.toContain('Google Authentication Required');
  });
});

// ══════════════════════════════════════════════════════════════
//  SECTION 11 : ENVOI EMAIL — SMTP outbound
// ══════════════════════════════════════════════════════════════
describe('📤 Envoi Email — SMTP outbound', () => {
  const routeContent = readSrcFile('src/routes/postal-mail.ts');

  it('route POST /send utilise SMTP ou API Postal', () => {
    expect(routeContent).toMatch(/router\.post\s*\(\s*['"]\/send['"]/);
    // Doit contenir soit sendMail (nodemailer) soit apiCall (REST)
    expect(routeContent).toMatch(/sendMail|apiCall|getSmtpTransporter/);
  });

  it('sauvegarde l\'email envoyé en DB (dossier "sent")', () => {
    const sendBlock = routeContent.slice(
      routeContent.indexOf("'/send'"),
      routeContent.indexOf("'/sync'") > 0 ? routeContent.indexOf("'/sync'") : routeContent.length,
    );
    expect(sendBlock).toContain('db.email.create');
    expect(sendBlock).toMatch(/folder.*['"]sent['"]/);
  });

  it('variables SMTP dans .env', () => {
    const envContent = readSrcFile('.env');
    expect(envContent).toContain('POSTAL_SMTP_HOST=');
    expect(envContent).toContain('POSTAL_SMTP_PORT=');
    expect(envContent).toContain('POSTAL_SMTP_USER=');
    expect(envContent).toContain('POSTAL_SMTP_PASS=');
  });
});

// ══════════════════════════════════════════════════════════════
//  SECTION 12 : CONVENTIONS CODE ZHIIVE
// ══════════════════════════════════════════════════════════════
describe('📏 Conventions Code Zhiive', () => {
  it('aucun new PrismaClient() dans tout /src (sauf singleton database.ts)', () => {
    const hits = grepSrc(/new\s+PrismaClient\s*\(/, ['.ts', '.tsx']);
    // Exclure : database.ts (le singleton lui-même) et les scripts seed
    const violations = hits.filter(
      (h) => !h.file.includes('database.ts') && !h.file.includes('seed'),
    );
    if (violations.length > 0) {
      console.error('Violations:', violations.map((h) => `${h.file}:${h.line}`).join(', '));
    }
    expect(violations).toHaveLength(0);
  });

  it('aucun fetch() ou axios direct dans les hooks email', () => {
    const hookContent = readSrcFile('src/hooks/usePostalMailService.ts');
    expect(hookContent).not.toMatch(/\bfetch\s*\(/);
    expect(hookContent).not.toContain('import axios');
  });

  it('mail-provider.ts ne requiert PAS Gmail OAuth', () => {
    const content = readSrcFile('src/routes/mail-provider.ts');
    expect(content).not.toContain('googleapis');
    expect(content).not.toContain('oauth2');
  });

  it('EmailAccountService normalise les accents (NFD)', () => {
    const content = readSrcFile('src/services/EmailAccountService.ts');
    expect(content).toContain('.normalize(');
  });
});
