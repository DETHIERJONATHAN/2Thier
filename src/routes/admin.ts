import express, { Request, Response } from 'express';
import { db } from '../lib/database';
import { encrypt } from '../utils/crypto';
import { requireRole } from '../middlewares/requireRole';
import { authMiddleware } from '../middlewares/auth';
import { impersonationMiddleware } from '../middlewares/impersonation';
import { logger } from '../lib/logger';
import { listAllGCSFiles, deleteFile } from '../lib/storage';

const prisma = db;
const router = express.Router();

router.use(authMiddleware, impersonationMiddleware);

// Route pour récupérer un utilisateur par son ID (pour restaurer l'impersonation)
router.get('/users/:id', requireRole(['super_admin']), async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: { id: id },
      select: { // On ne sélectionne que les champs nécessaires
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
      }
    });

    if (!user) {
      res.status(404).json({ error: 'Utilisateur non trouvé' });
      return;
    }
    res.json(user);
  } catch (error) {
    logger.error(`Erreur lors de la récupération de l'utilisateur ${id}:`, error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Route pour récupérer le statut mail de tous les utilisateurs (pour l'admin)
router.get('/users/mail-status', requireRole(['super_admin']), async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      include: {
        mailSettings: true,
      },
    });

    const usersWithMailStatus = users.map(user => {
      return {
        id: user.id,
        email: user.email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        isMailConfigured: user.mailSettings?.isVerified ?? false,
      };
    });

    res.json(usersWithMailStatus);
  } catch (error) {
    logger.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Route pour définir/mettre à jour le mot de passe mail d'un utilisateur
router.post('/mail/settings', requireRole(['super_admin']), async (req: Request, res: Response): Promise<void> => {
  const { userId, password } = req.body;

  if (!userId || !password) {
    res.status(400).json({ error: "L'ID de l'utilisateur et le mot de passe sont requis." });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: 'Utilisateur non trouvé.' });
      return;
    }

    const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    if (!userName) {
        res.status(400).json({ error: "Le nom de l'utilisateur n'est pas défini, impossible de créer l'adresse email." });
        return;
    }

    const encryptedPassword = encrypt(password);
    const userEmail = `${userName.replace(/\s+/g, '.').toLowerCase()}@2thier.be`;

    await prisma.mailSettings.upsert({
      where: { userId },
      update: {
        encryptedPassword: encryptedPassword,
        isVerified: true,
      },
      create: {
        userId,
        emailAddress: userEmail,
        encryptedPassword: encryptedPassword,
        imapHost: 'imap.one.com',
        imapPort: 993,
        smtpHost: 'mail.one.com',
        smtpPort: 465,
        isVerified: true,
      },
    });

    res.status(200).json({ message: 'Configuration mail mise à jour avec succès.' });
  } catch (error) {
    logger.error('Erreur lors de la mise à jour de la configuration mail:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Route pour récupérer les paramètres mail d'un utilisateur
router.get('/mail/settings', async (req: Request, res: Response): Promise<void> => {
  try {
    // Récupère l'ID de l'utilisateur à partir du token JWT
    const userId = req.user?.userId; // ✅ FIX: C'est .userId, pas .id
    
    if (!userId) {
      res.status(401).json({ error: 'Utilisateur non authentifié.' });
      return;
    }

    // Récupère les paramètres mail de l'utilisateur
    const mailSettings = await prisma.mailSettings.findUnique({
      where: { userId },
    });

    if (!mailSettings) {
      res.status(404).json({ error: 'Aucune configuration mail trouvée pour cet utilisateur.' });
      return;
    }

    // Masque le mot de passe dans la réponse
  const { encryptedPassword: _encryptedPassword, ...settings } = mailSettings;
    
    res.status(200).json(settings);
  } catch (error) {
    logger.error('Erreur lors de la récupération des paramètres mail:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// ============================================================================
// #42 — GCS ORPHAN CLEANUP
// ============================================================================

const GCS_URL_PREFIX = 'https://storage.googleapis.com/crm-2thier-uploads/';

/**
 * GET /api/admin/storage/orphans — List GCS files not referenced in DB.
 * Super admin only. Returns orphan file keys.
 */
router.get('/storage/orphans', requireRole(['super_admin']), async (_req: Request, res: Response): Promise<void> => {
  try {
    // 1. Get all GCS files
    const gcsFiles = await listAllGCSFiles();
    logger.info(`[GCS-CLEANUP] Found ${gcsFiles.length} files in bucket`);

    // 2. Collect all referenced URLs from DB
    const referencedKeys = new Set<string>();

    const addUrl = (url: string | null | undefined) => {
      if (!url) return;
      if (url.startsWith(GCS_URL_PREFIX)) {
        referencedKeys.add(url.slice(GCS_URL_PREFIX.length));
      } else if (url.startsWith('/uploads/')) {
        referencedKeys.add(url.slice('/uploads/'.length));
      }
    };

    const addJsonUrls = (json: unknown) => {
      if (!json) return;
      const str = typeof json === 'string' ? json : JSON.stringify(json);
      const matches = str.match(/https?:\/\/storage\.googleapis\.com\/crm-2thier-uploads\/[^"'\s,\]]+/g);
      if (matches) matches.forEach(m => addUrl(m));
    };

    // Query all models with file URL fields (batched)
    const [users, orgs, leads, stories, wallPosts, wallComments, messages, 
           photos, docs, chantiers, invoices, timeEntries, signatures, 
           sparks, battles, capsules, events, moments, expenses] = await Promise.all([
      prisma.user.findMany({ select: { avatarUrl: true, coverUrl: true } }),
      prisma.organization.findMany({ select: { logoUrl: true, coverUrl: true } }),
      prisma.lead.findMany({ select: { id: true } }), // lead has no direct file urls
      prisma.story.findMany({ select: { mediaUrl: true, musicUrl: true } }),
      prisma.wallPost.findMany({ select: { mediaUrls: true } }),
      prisma.wallComment.findMany({ select: { mediaUrl: true } }),
      prisma.message.findMany({ select: { mediaUrls: true } }),
      prisma.userPhoto.findMany({ select: { url: true } }),
      prisma.generatedDocument.findMany({ select: { pdfUrl: true, signatureUrl: true } }),
      prisma.chantier.findMany({ select: { documentUrl: true } }),
      prisma.chantierInvoice.findMany({ select: { documentUrl: true, peppolXmlUrl: true } }),
      prisma.timeEntry.findMany({ select: { clockInPhotoUrl: true, clockOutPhotoUrl: true } }),
      prisma.electronicSignature.findMany({ select: { signedPdfUrl: true } }),
      prisma.spark.findMany({ select: { mediaUrl: true } }),
      prisma.battleEntry.findMany({ select: { mediaUrl: true } }),
      prisma.timeCapsule.findMany({ select: { mediaUrl: true } }),
      prisma.socialEvent.findMany({ select: { coverUrl: true } }),
      prisma.hiveLiveMomentMedia.findMany({ select: { url: true } }),
      prisma.expense.findMany({ select: { receiptUrl: true } }),
    ]);

    // Extract URLs
    users.forEach(u => { addUrl(u.avatarUrl); addUrl(u.coverUrl); });
    orgs.forEach(o => { addUrl(o.logoUrl); addUrl(o.coverUrl); });
    stories.forEach(s => { addUrl(s.mediaUrl); addUrl(s.musicUrl); });
    wallPosts.forEach(p => addJsonUrls(p.mediaUrls));
    wallComments.forEach(c => addUrl(c.mediaUrl));
    messages.forEach(m => addJsonUrls(m.mediaUrls));
    photos.forEach(p => addUrl(p.url));
    docs.forEach(d => { addUrl(d.pdfUrl); addUrl(d.signatureUrl); });
    chantiers.forEach(c => addUrl(c.documentUrl));
    invoices.forEach(i => { addUrl(i.documentUrl); addUrl(i.peppolXmlUrl); });
    timeEntries.forEach(t => { addUrl(t.clockInPhotoUrl); addUrl(t.clockOutPhotoUrl); });
    signatures.forEach(s => addUrl(s.signedPdfUrl));
    sparks.forEach(s => addUrl(s.mediaUrl));
    battles.forEach(b => addUrl(b.mediaUrl));
    capsules.forEach(c => addUrl(c.mediaUrl));
    events.forEach(e => addUrl(e.coverUrl));
    moments.forEach(m => addUrl(m.url));
    expenses.forEach(e => addUrl(e.receiptUrl));

    // 3. Find orphans
    const orphans = gcsFiles.filter(key => !referencedKeys.has(key));

    logger.info(`[GCS-CLEANUP] ${referencedKeys.size} referenced keys, ${orphans.length} orphans detected`);

    res.json({
      totalGCSFiles: gcsFiles.length,
      referencedFiles: referencedKeys.size,
      orphanCount: orphans.length,
      orphans: orphans.slice(0, 200), // limit response size
    });
  } catch (error) {
    logger.error('[GCS-CLEANUP] Error listing orphans:', error);
    res.status(500).json({ error: 'Failed to list orphans' });
  }
});

/**
 * DELETE /api/admin/storage/orphans — Delete orphan files from GCS.
 * Body: { keys: string[] } — list of keys to delete.
 */
router.delete('/storage/orphans', requireRole(['super_admin']), async (req: Request, res: Response): Promise<void> => {
  const { keys } = req.body as { keys?: string[] };
  if (!keys || !Array.isArray(keys) || keys.length === 0) {
    res.status(400).json({ error: 'keys array is required' });
    return;
  }

  // Safety limit
  if (keys.length > 500) {
    res.status(400).json({ error: 'Maximum 500 keys per request' });
    return;
  }

  const results = { deleted: 0, failed: 0 };
  for (const key of keys) {
    try {
      await deleteFile(key);
      results.deleted++;
    } catch {
      results.failed++;
    }
  }

  logger.info(`[GCS-CLEANUP] Deleted ${results.deleted} orphans (${results.failed} failed)`);
  res.json(results);
});

export default router;
