/**
 * ============================================================
 *  ROUTES ADMIN ZHIIVEMAIL — /api/zhiivemail/*
 * ============================================================
 *
 *  Interface d'administration pour le système email Zhiive.
 *  Gère :
 *    - Configuration SMTP globale (envoi via One.com / Postal)
 *    - Provisionnement des boîtes @zhiive.com par utilisateur
 *    - Configuration de boîtes externes (IMAP/SMTP perso)
 *    - Statut et diagnostics du système email
 *    - Test d'envoi SMTP
 *
 *  Accès : Super Admin uniquement.
 * ============================================================
 */

import { Router } from 'express';
import { authMiddleware, type AuthenticatedRequest } from '../middlewares/auth.js';
import { db } from '../lib/database.js';
import { SF } from '../components/zhiive/ZhiiveTheme';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { execSync } from 'child_process';

const router = Router();

// ─── Middleware Super Admin ─────────────────────────────────
function requireSuperAdmin(req: AuthenticatedRequest, res: any, next: any) {
  if (!req.user?.isSuperAdmin) {
    return res.status(403).json({ error: 'Accès réservé aux Super Admins' });
  }
  next();
}

// ─── Helper: Générer email Zhiive ───────────────────────────
function generateZhiiveEmail(firstName?: string | null, lastName?: string | null, fallbackEmail?: string): string {
  if (firstName && lastName) {
    const normalize = (s: string) =>
      s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
    return `${normalize(firstName)}.${normalize(lastName)}@zhiive.com`;
  }
  if (fallbackEmail) {
    const local = fallbackEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9.]/g, '');
    return `${local}@zhiive.com`;
  }
  return 'user@zhiive.com';
}

// ═════════════════════════════════════════════════════════════
//  GET /api/zhiivemail/status
//  Vue globale du système email : config SMTP, nb comptes, etc.
// ═════════════════════════════════════════════════════════════
router.get('/status', authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const smtpHost = process.env.POSTAL_SMTP_HOST || process.env.SMTP_HOST || '';
    const smtpPort = parseInt(process.env.POSTAL_SMTP_PORT || process.env.SMTP_PORT || '25', 10);
    const smtpUser = process.env.POSTAL_SMTP_USER || process.env.SMTP_USER || '';
    const smtpConfigured = !!(smtpHost && smtpUser);

    const postalUrl = process.env.POSTAL_API_URL || '';
    const postalKey = process.env.POSTAL_API_KEY || '';
    const postalConfigured = !!(postalUrl && postalKey);

    // Stats comptes
    const totalAccounts = await db.emailAccount.count();
    const postalAccounts = await db.emailAccount.count({ where: { mailProvider: 'postal' } });
    const gmailAccounts = await db.emailAccount.count({ where: { mailProvider: 'gmail' } });
    const totalEmails = await db.email.count();

    res.json({
      smtp: {
        configured: smtpConfigured,
        host: smtpHost,
        port: smtpPort,
        user: smtpUser,
        from: process.env.POSTAL_SMTP_USER || process.env.SMTP_FROM || smtpUser,
      },
      postal: {
        configured: postalConfigured,
        url: postalUrl || null,
      },
      stats: {
        totalAccounts,
        postalAccounts,
        gmailAccounts,
        totalEmails,
      },
      mode: postalConfigured ? 'postal-api' : smtpConfigured ? 'smtp' : 'non-configuré',
    });
  } catch (error) {
    console.error('❌ [ZHIIVEMAIL] Erreur status:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du statut' });
  }
});

// ═════════════════════════════════════════════════════════════
//  POST /api/zhiivemail/test-smtp
//  Teste la connexion SMTP en envoyant un email test.
// ═════════════════════════════════════════════════════════════
router.post('/test-smtp', authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const { to } = req.body;
  const recipient = to || req.user?.email || process.env.SMTP_USER;

  if (!recipient) {
    return res.status(400).json({ error: 'Destinataire requis' });
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost || !smtpUser || !smtpPass) {
    return res.status(400).json({ error: 'Configuration SMTP manquante (SMTP_HOST, SMTP_USER, SMTP_PASS)' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    // Vérifier la connexion
    await transporter.verify();

    // Envoyer un test
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || smtpUser,
      to: recipient,
      subject: '✅ Test ZhiiveMail - Connexion SMTP OK',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: ${SF.primary};">🐝 ZhiiveMail - Test SMTP</h2>
          <p>La connexion SMTP fonctionne correctement.</p>
          <ul>
            <li><strong>Serveur:</strong> ${smtpHost}:${smtpPort}</li>
            <li><strong>Expéditeur:</strong> ${process.env.SMTP_FROM || smtpUser}</li>
            <li><strong>Date:</strong> ${new Date().toLocaleString('fr-BE')}</li>
          </ul>
          <p style="color: #65676b; font-size: 12px;">Ce message a été envoyé depuis l'interface d'administration ZhiiveMail.</p>
        </div>
      `,
    });


    res.json({
      success: true,
      messageId: info.messageId,
      recipient,
    });
  } catch (error) {
    console.error('❌ [ZHIIVEMAIL] Test SMTP échoué:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur SMTP inconnue',
    });
  }
});

// ═════════════════════════════════════════════════════════════
//  GET /api/zhiivemail/accounts
//  Liste tous les comptes email Zhiive (avec info user).
// ═════════════════════════════════════════════════════════════
router.get('/accounts', authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const accounts = await db.emailAccount.findMany({
      include: {
        User: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    // Map User → user for frontend compatibility
    res.json(accounts.map((a: any) => ({ ...a, user: a.User, User: undefined })));
  } catch (error) {
    console.error('❌ [ZHIIVEMAIL] Erreur liste comptes:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des comptes' });
  }
});

// ═════════════════════════════════════════════════════════════
//  POST /api/zhiivemail/provision
//  Provisionne un compte @zhiive.com pour un utilisateur.
// ═════════════════════════════════════════════════════════════
router.post('/provision', authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId requis' });
  }

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true, email: true, organizationId: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Vérifier s'il a déjà un compte
    const existing = await db.emailAccount.findUnique({ where: { userId } });
    if (existing) {
      return res.status(400).json({ error: 'Cet utilisateur a déjà un compte email', account: existing });
    }

    const zhiiveEmail = generateZhiiveEmail(user.firstName, user.lastName, user.email);

    const account = await db.emailAccount.create({
      data: {
        id: crypto.randomUUID(),
        emailAddress: zhiiveEmail,
        encryptedPassword: '',
        mailProvider: 'postal',
        userId: user.id,
        organizationId: user.organizationId || '',
        updatedAt: new Date(),
      },
      include: {
        User: { select: { id: true, firstName: true, lastName: true, email: true, role: true } }
      }
    });


    // Provisionner la boîte sur le serveur Postal
    try {
      const { getPostalService } = await import('../services/PostalEmailService.js');
      const postal = getPostalService();
      await postal.createMailbox(zhiiveEmail, `${user.firstName || ''} ${user.lastName || ''}`.trim());
    } catch (postalErr) {
      console.error(`⚠️ [ZHIIVEMAIL] Erreur provisionnement Postal (non bloquant):`, postalErr);
    }

    res.json({ success: true, account: { ...account, user: (account as any).User, User: undefined } });
  } catch (error) {
    console.error('❌ [ZHIIVEMAIL] Erreur provisionnement:', error);
    res.status(500).json({ error: 'Erreur lors du provisionnement' });
  }
});

// ═════════════════════════════════════════════════════════════
//  POST /api/zhiivemail/provision-all
//  Provisionne les comptes @zhiive.com pour TOUS les users
//  qui n'en ont pas encore.
// ═════════════════════════════════════════════════════════════
router.post('/provision-all', authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    // Récupérer tous les users sans EmailAccount
    const usersWithoutEmail = await db.user.findMany({
      where: {
        emailAccounts: { none: {} }
      },
      select: { id: true, firstName: true, lastName: true, email: true, organizationId: true }
    });

    let created = 0;
    const results: Array<{ userId: string; email: string; status: string }> = [];

    for (const user of usersWithoutEmail) {
      try {
        const zhiiveEmail = generateZhiiveEmail(user.firstName, user.lastName, user.email);
        await db.emailAccount.create({
          data: {
            id: crypto.randomUUID(),
            emailAddress: zhiiveEmail,
            encryptedPassword: '',
            mailProvider: 'postal',
            userId: user.id,
            organizationId: user.organizationId || '',
            updatedAt: new Date(),
          }
        });
        // Provisionner sur Postal
        try {
          const { getPostalService } = await import('../services/PostalEmailService.js');
          const postal = getPostalService();
          await postal.createMailbox(zhiiveEmail, `${user.firstName || ''} ${user.lastName || ''}`.trim());
        } catch (postalErr) {
          console.error(`⚠️ [ZHIIVEMAIL] Erreur provisionnement Postal pour ${zhiiveEmail}:`, postalErr);
        }
        results.push({ userId: user.id, email: zhiiveEmail, status: 'created' });
        created++;
      } catch (e) {
        results.push({ userId: user.id, email: user.email || '', status: 'error' });
      }
    }


    res.json({
      success: true,
      total: usersWithoutEmail.length,
      created,
      results,
    });
  } catch (error) {
    console.error('❌ [ZHIIVEMAIL] Erreur provisionnement masse:', error);
    res.status(500).json({ error: 'Erreur lors du provisionnement en masse' });
  }
});

// ═════════════════════════════════════════════════════════════
//  DELETE /api/zhiivemail/accounts/:id
//  Supprime un compte email.
// ═════════════════════════════════════════════════════════════
router.delete('/accounts/:id', authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;

  try {
    await db.emailAccount.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('❌ [ZHIIVEMAIL] Erreur suppression:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

// ═════════════════════════════════════════════════════════════
//  PATCH /api/zhiivemail/accounts/:id
//  Modifie un compte email (adresse, provider).
// ═════════════════════════════════════════════════════════════
router.patch('/accounts/:id', authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { emailAddress, mailProvider } = req.body;

  try {
    const updated = await db.emailAccount.update({
      where: { id },
      data: {
        ...(emailAddress && { emailAddress }),
        ...(mailProvider && { mailProvider }),
        updatedAt: new Date(),
      },
      include: {
        User: { select: { id: true, firstName: true, lastName: true, email: true, role: true } }
      }
    });

    res.json({ success: true, account: { ...updated, user: (updated as any).User, User: undefined } });
  } catch (error) {
    console.error('❌ [ZHIIVEMAIL] Erreur mise à jour:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

// ═════════════════════════════════════════════════════════════
//  POSTAL SERVER — Connexion directe Hetzner via SSH
// ═════════════════════════════════════════════════════════════

const POSTAL_SSH_HOST = process.env.POSTAL_SSH_HOST || '46.225.180.8';
const POSTAL_SSH_USER = process.env.POSTAL_SSH_USER || 'root';
const POSTAL_SSH_PASS = process.env.POSTAL_SSH_PASS || '';
const POSTAL_MYSQL_USER = process.env.POSTAL_MYSQL_USER || 'postal';
const POSTAL_MYSQL_PASS = process.env.POSTAL_MYSQL_PASSWORD || 'postal';

/** Exécute une requête MySQL sur le serveur Postal via SSH */
function postalQuery(database: string, sql: string): string {
  if (!POSTAL_SSH_PASS) return '';
  try {
    // Use double quotes for SSH, single quotes for SQL, -D for database name
    const escapedSql = sql.replace(/'/g, "''");
    const cmd = `sshpass -p '${POSTAL_SSH_PASS}' ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 ${POSTAL_SSH_USER}@${POSTAL_SSH_HOST} "mysql -u ${POSTAL_MYSQL_USER} -p${POSTAL_MYSQL_PASS} -D '${database}' -e '${escapedSql}' --batch 2>/dev/null"`;
    return execSync(cmd, { timeout: 15000, encoding: 'utf-8' }).trim();
  } catch {
    return '';
  }
}

/** Exécute une commande SSH sur le serveur Postal */
function postalSSH(command: string): string {
  if (!POSTAL_SSH_PASS) return '';
  try {
    const cmd = `sshpass -p '${POSTAL_SSH_PASS}' ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 ${POSTAL_SSH_USER}@${POSTAL_SSH_HOST} '${command.replace(/'/g, "'\\''")}'`;
    return execSync(cmd, { timeout: 15000, encoding: 'utf-8' }).trim();
  } catch {
    return '';
  }
}

/** Parse le résultat MySQL TSV en tableau d'objets */
function parseMysqlResult(raw: string): Record<string, string>[] {
  if (!raw) return [];
  const lines = raw.split('\n').filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split('\t');
  return lines.slice(1).map(line => {
    const values = line.split('\t');
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      const v = values[i] || '';
      obj[h] = v === 'NULL' ? '' : v;
    });
    return obj;
  });
}

// ═════════════════════════════════════════════════════════════
//  GET /api/zhiivemail/server-overview
//  Vue complète du serveur Postal : Docker, DNS, disque, stats
// ═════════════════════════════════════════════════════════════
router.get('/server-overview', authMiddleware, requireSuperAdmin, async (_req: AuthenticatedRequest, res) => {
  try {
    // Docker containers
    const dockerRaw = postalSSH('docker ps --format "{{.Names}}\\t{{.Status}}" 2>/dev/null');
    const containers = dockerRaw ? dockerRaw.split('\n').map(line => {
      const [name, ...statusParts] = line.split('\t');
      return { name, status: statusParts.join('\t') };
    }).filter(c => c.name.includes('postal')) : [];

    // Disk usage
    const diskRaw = postalSSH('df -h / | tail -1');
    const diskParts = diskRaw ? diskRaw.split(/\s+/) : [];
    const disk = diskParts.length >= 5 ? {
      total: diskParts[1], used: diskParts[2], available: diskParts[3], percentage: diskParts[4],
    } : null;

    // DNS checks
    const [mxResult, spfResult, ptrResult, dkimResult, dmarcResult] = await Promise.all([
      new Promise<string>(r => { try { r(execSync('dig +short MX zhiive.com @8.8.8.8', { timeout: 5000, encoding: 'utf-8' }).trim()); } catch { r(''); } }),
      new Promise<string>(r => { try { r(execSync('dig +short TXT zhiive.com @8.8.8.8', { timeout: 5000, encoding: 'utf-8' }).trim()); } catch { r(''); } }),
      new Promise<string>(r => { try { r(execSync('dig +short -x 46.225.180.8 @1.1.1.1', { timeout: 5000, encoding: 'utf-8' }).trim()); } catch { r(''); } }),
      new Promise<string>(r => { try { r(execSync('dig +short TXT DBqoDR._domainkey.zhiive.com @8.8.8.8', { timeout: 5000, encoding: 'utf-8' }).trim()); } catch { r(''); } }),
      new Promise<string>(r => { try { r(execSync('dig +short TXT _dmarc.zhiive.com @8.8.8.8', { timeout: 5000, encoding: 'utf-8' }).trim()); } catch { r(''); } }),
    ]);

    // Return Path check
    const rpResult = await new Promise<string>(r => { try { r(execSync('dig +short CNAME psrp.zhiive.com @8.8.8.8', { timeout: 5000, encoding: 'utf-8' }).trim()); } catch { r(''); } });

    const spfHasHardfail = spfResult.includes('-all');
    const dmarcHasPolicy = dmarcResult.includes('p=quarantine') || dmarcResult.includes('p=reject');

    const dns = {
      mx: { value: mxResult, ok: mxResult.includes('mx.postal.zhiive.com'), status: 'ok' as string },
      spf: {
        value: spfResult,
        ok: spfResult.includes('ip4:46.225.180.8') && spfHasHardfail,
        status: !spfResult.includes('ip4:46.225.180.8') ? 'error' : !spfHasHardfail ? 'warning' : 'ok',
        fix: !spfHasHardfail ? 'Changer ~all en -all pour un hardfail SPF (anti-spam)' : undefined,
      },
      ptr: { value: ptrResult, ok: ptrResult.includes('postal.zhiive.com'), status: ptrResult.includes('postal.zhiive.com') ? 'ok' : 'error' },
      dkim: { value: dkimResult.substring(0, 80) + '...', ok: dkimResult.includes('v=DKIM1'), status: dkimResult.includes('v=DKIM1') ? 'ok' : 'error' },
      dmarc: {
        value: dmarcResult,
        ok: dmarcResult.includes('v=DMARC1') && dmarcHasPolicy,
        status: !dmarcResult.includes('v=DMARC1') ? 'error' : !dmarcHasPolicy ? 'warning' : 'ok',
        fix: !dmarcHasPolicy ? 'Changer p=none en p=quarantine pour renforcer DMARC' : undefined,
      },
      returnPath: {
        value: rpResult || 'Non configuré',
        ok: !!rpResult,
        status: rpResult ? 'ok' : 'warning',
        fix: !rpResult ? 'Ajouter CNAME psrp.zhiive.com → rp.postal.mx chez One.com' : undefined,
      },
    };

    // IP Pool & Address
    const ipRaw = postalQuery('postal', 'SELECT ip.ipv4, ip.hostname, p.name as pool_name FROM ip_addresses ip LEFT JOIN ip_pools p ON ip.ip_pool_id = p.id');
    const ipAddresses = parseMysqlResult(ipRaw);

    // Suppressions count
    const suppRaw = postalQuery('postal-server-1', 'SELECT COUNT(*) as total FROM suppressions');
    const suppressions = parseMysqlResult(suppRaw);

    res.json({
      connected: !!POSTAL_SSH_PASS,
      server: {
        host: POSTAL_SSH_HOST,
        containers,
        disk,
      },
      dns,
      ipAddresses,
      suppressions: suppressions[0]?.total ? parseInt(suppressions[0].total) : 0,
    });
  } catch (error) {
    console.error('❌ [ZHIIVEMAIL] server-overview error:', error);
    res.status(500).json({ error: 'Erreur récupération état serveur' });
  }
});

// ═════════════════════════════════════════════════════════════
//  GET /api/zhiivemail/postal-stats
//  Statistiques d'envoi/réception Postal (daily + hourly)
// ═════════════════════════════════════════════════════════════
router.get('/postal-stats', authMiddleware, requireSuperAdmin, async (_req: AuthenticatedRequest, res) => {
  try {
    // Message status counts
    const statusRaw = postalQuery('postal-server-1', 'SELECT status, COUNT(*) as cnt FROM messages GROUP BY status');
    const statusCounts = parseMysqlResult(statusRaw);

    // Daily stats (last 30 days)
    const dailyRaw = postalQuery('postal-server-1', 'SELECT time, incoming, outgoing, spam, bounces, held FROM stats_daily ORDER BY time DESC LIMIT 30');
    const daily = parseMysqlResult(dailyRaw).map(row => ({
      date: new Date(parseInt(row.time) * 1000).toISOString().split('T')[0],
      incoming: parseInt(row.incoming) || 0,
      outgoing: parseInt(row.outgoing) || 0,
      spam: parseInt(row.spam) || 0,
      bounces: parseInt(row.bounces) || 0,
      held: parseInt(row.held) || 0,
    }));

    // Hourly stats (last 48h)
    const hourlyRaw = postalQuery('postal-server-1', 'SELECT time, incoming, outgoing, spam, bounces FROM stats_hourly ORDER BY time DESC LIMIT 48');
    const hourly = parseMysqlResult(hourlyRaw).map(row => ({
      time: new Date(parseInt(row.time) * 1000).toISOString(),
      incoming: parseInt(row.incoming) || 0,
      outgoing: parseInt(row.outgoing) || 0,
      spam: parseInt(row.spam) || 0,
      bounces: parseInt(row.bounces) || 0,
    }));

    // Total messages
    const totalRaw = postalQuery('postal-server-1', 'SELECT COUNT(*) as total FROM messages');
    const total = parseMysqlResult(totalRaw);

    res.json({
      messageStatuses: Object.fromEntries(statusCounts.map(r => [r.status, parseInt(r.cnt)])),
      totalMessages: total[0]?.total ? parseInt(total[0].total) : 0,
      daily,
      hourly,
    });
  } catch (error) {
    console.error('❌ [ZHIIVEMAIL] postal-stats error:', error);
    res.status(500).json({ error: 'Erreur récupération stats' });
  }
});

// ═════════════════════════════════════════════════════════════
//  GET /api/zhiivemail/postal-messages
//  Messages récents sur le serveur Postal
// ═════════════════════════════════════════════════════════════
router.get('/postal-messages', authMiddleware, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const status = req.query.status as string || '';

    let sql = 'SELECT id, rcpt_to, mail_from, subject, status, timestamp, spam, spam_score FROM messages';
    if (status) sql += ` WHERE status='${status.replace(/[^a-zA-Z]/g, '')}'`;
    sql += ` ORDER BY id DESC LIMIT ${limit}`;

    const raw = postalQuery('postal-server-1', sql);
    const messages = parseMysqlResult(raw).map(row => ({
      id: parseInt(row.id),
      to: row.rcpt_to,
      from: row.mail_from,
      subject: row.subject,
      status: row.status,
      timestamp: row.timestamp ? new Date(parseFloat(row.timestamp) * 1000).toISOString() : '',
      spamScore: parseFloat(row.spam_score) || 0,
    }));

    res.json(messages);
  } catch (error) {
    console.error('❌ [ZHIIVEMAIL] postal-messages error:', error);
    res.status(500).json({ error: 'Erreur récupération messages' });
  }
});

// ═════════════════════════════════════════════════════════════
//  GET /api/zhiivemail/postal-domains
//  Domaines configurés sur Postal
// ═════════════════════════════════════════════════════════════
router.get('/postal-domains', authMiddleware, requireSuperAdmin, async (_req: AuthenticatedRequest, res) => {
  try {
    const raw = postalQuery('postal', 'SELECT id, name, verified_at, spf_status, dkim_status, mx_status, return_path_status, outgoing, incoming FROM domains');
    const domains = parseMysqlResult(raw).map(row => ({
      id: parseInt(row.id),
      name: row.name,
      verified: !!row.verified_at,
      spf: row.spf_status || 'unchecked',
      dkim: row.dkim_status || 'unchecked',
      mx: row.mx_status || 'unchecked',
      returnPath: row.return_path_status || 'unchecked',
      outgoing: row.outgoing === '1',
      incoming: row.incoming === '1',
    }));

    res.json(domains);
  } catch (error) {
    console.error('❌ [ZHIIVEMAIL] postal-domains error:', error);
    res.status(500).json({ error: 'Erreur récupération domaines' });
  }
});

// ═════════════════════════════════════════════════════════════
//  GET /api/zhiivemail/postal-credentials
//  Credentials SMTP/API sur Postal
// ═════════════════════════════════════════════════════════════
router.get('/postal-credentials', authMiddleware, requireSuperAdmin, async (_req: AuthenticatedRequest, res) => {
  try {
    const raw = postalQuery('postal', 'SELECT id, server_id, name, type, hold, last_used_at FROM credentials');
    const credentials = parseMysqlResult(raw).map(row => ({
      id: parseInt(row.id),
      name: row.name,
      type: row.type,
      hold: row.hold === '1',
      lastUsed: row.last_used_at || null,
    }));

    res.json(credentials);
  } catch (error) {
    console.error('❌ [ZHIIVEMAIL] postal-credentials error:', error);
    res.status(500).json({ error: 'Erreur récupération credentials' });
  }
});

// ═════════════════════════════════════════════════════════════
//  GET /api/zhiivemail/postal-routes
//  Routes de routage email Postal
// ═════════════════════════════════════════════════════════════
router.get('/postal-routes', authMiddleware, requireSuperAdmin, async (_req: AuthenticatedRequest, res) => {
  try {
    const raw = postalQuery('postal', 'SELECT r.id, r.name, r.mode, d.name as domain_name, e.name as endpoint_name, e.url as endpoint_url FROM routes r LEFT JOIN domains d ON r.domain_id = d.id LEFT JOIN http_endpoints e ON r.endpoint_id = e.id');
    const routes = parseMysqlResult(raw);

    res.json(routes);
  } catch (error) {
    console.error('❌ [ZHIIVEMAIL] postal-routes error:', error);
    res.status(500).json({ error: 'Erreur récupération routes' });
  }
});

// ═════════════════════════════════════════════════════════════
//  POST /api/zhiivemail/clear-suppressions
//  Vide la liste de suppression Postal
// ═════════════════════════════════════════════════════════════
router.post('/clear-suppressions', authMiddleware, requireSuperAdmin, async (_req: AuthenticatedRequest, res) => {
  try {
    postalQuery('postal-server-1', 'DELETE FROM suppressions');
    const raw = postalQuery('postal-server-1', 'SELECT COUNT(*) as total FROM suppressions');
    const result = parseMysqlResult(raw);
    const remaining = result[0]?.total ? parseInt(result[0].total) : 0;

    res.json({ success: true, remaining });
  } catch (error) {
    console.error('❌ [ZHIIVEMAIL] clear-suppressions error:', error);
    res.status(500).json({ error: 'Erreur suppression' });
  }
});

// ═════════════════════════════════════════════════════════════
//  POST /api/zhiivemail/postal-restart
//  Redémarre les containers Postal
// ═════════════════════════════════════════════════════════════
router.post('/postal-restart', authMiddleware, requireSuperAdmin, async (_req: AuthenticatedRequest, res) => {
  try {
    postalSSH('cd /opt/postal && docker compose restart');
    // Attendre 5s pour le redémarrage
    await new Promise(r => setTimeout(r, 5000));
    const dockerRaw = postalSSH('docker ps --format "{{.Names}}\\t{{.Status}}" 2>/dev/null');
    const containers = dockerRaw ? dockerRaw.split('\n').filter(l => l.includes('postal')).map(line => {
      const [name, ...sp] = line.split('\t');
      return { name, status: sp.join('\t') };
    }) : [];

    res.json({ success: true, containers });
  } catch (error) {
    console.error('❌ [ZHIIVEMAIL] restart error:', error);
    res.status(500).json({ error: 'Erreur redémarrage' });
  }
});

export default router;
