/**
 * ✍️ Routes Signature Électronique Avancée (eIDAS niveau avancé, 100% maison)
 * 
 * Flux complet :
 * 1. Initier une demande de signature → crée un ElectronicSignature en PENDING + génère token
 * 2. Envoyer OTP par email → hash OTP stocké, envoyé par SMTP org
 * 3. Vérifier OTP → status passe en OTP_VERIFIED
 * 4. Soumettre signature (canvas base64) → hash signature + hash PDF → status SIGNED
 * 5. Télécharger le PDF signé finalisé
 * 
 * Aussi : génération PDF du TBL + export
 */

import { Router, Request, Response } from 'express';
import { db } from '../lib/database';
import { authenticateToken } from '../middleware/auth';
import { z } from 'zod';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { decrypt } from '../utils/crypto.js';
import { generateTblPdf, generateTblPdfWithHash, hashPdf } from '../services/tblPdfGenerator';
import type { TblPdfData, TblPdfSection, TblPdfField, TblPdfSignatureInfo } from '../services/tblPdfGenerator';
import { GoogleGmailService } from '../google-auth/services/GoogleGmailService';
import { generateClientPdfBuffer } from './documents';
import { notify } from '../services/NotificationHelper';

const router = Router();

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════

function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

function addAuditEntry(existing: any[] | null, action: string, details: Record<string, any>, req: Request): any[] {
  const trail = Array.isArray(existing) ? [...existing] : [];
  trail.push({
    action,
    timestamp: new Date().toISOString(),
    ip: req.headers['x-forwarded-for'] as string || req.socket?.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
    ...details,
  });
  return trail;
}

async function getSmtpTransporter(organizationId: string) {
  // Trouver un compte email configuré pour cette organisation
  const emailAccount = await db.emailAccount.findFirst({
    where: { organizationId },
    orderBy: { createdAt: 'asc' },
  });

  if (!emailAccount || !emailAccount.encryptedPassword) {
    throw new Error('Aucun compte email configuré pour cette organisation');
  }

  const decryptedPassword = decrypt(emailAccount.encryptedPassword);
  
  // Déterminer le serveur SMTP
  let smtpHost = 'smtp.gmail.com';
  let smtpPort = 587;
  
  const provider = emailAccount.mailProvider || '';
  if (provider === 'gmail') { smtpHost = 'smtp.gmail.com'; smtpPort = 587; }
  else if (provider === 'outlook' || provider === 'hotmail') { smtpHost = 'smtp.office365.com'; smtpPort = 587; }
  else if (provider === 'one.com' || provider === 'one') { smtpHost = 'send.one.com'; smtpPort = 465; }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: emailAccount.emailAddress,
      pass: decryptedPassword,
    },
  });

  return { transporter, fromEmail: emailAccount.emailAddress };
}

/**
 * Construit les données PDF à partir d'un submissionId
 */
async function buildTblPdfData(submissionId: string, organizationId: string): Promise<TblPdfData> {
  // 1. Charger la submission
  const submission = await db.treeBranchLeafSubmission.findUnique({
    where: { id: submissionId },
  });
  if (!submission) throw new Error('Soumission non trouvée');

  // 2. Charger l'organisation
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true },
  });

  // 3. Charger le lead si présent
  let lead = null;
  if (submission.leadId) {
    lead = await db.lead.findUnique({
      where: { id: submission.leadId },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, company: true, data: true },
    });
  }

  // 4. Charger les données de la submission
  const dataRows = await db.treeBranchLeafSubmissionData.findMany({
    where: { submissionId },
    orderBy: { createdAt: 'asc' },
  });

  // 5. Charger les infos des nodes
  const nodeIds = [...new Set(dataRows.map(r => r.nodeId).filter(Boolean))];
  const nodes = nodeIds.length > 0
    ? await db.treeBranchLeafNode.findMany({
        where: { id: { in: nodeIds } },
        select: { id: true, label: true, type: true, fieldType: true, fieldSubType: true, parentId: true, order: true },
      })
    : [];
  const nodesMap = new Map(nodes.map(n => [n.id, n]));

  // 6. Charger l'arbre pour le nom
  const tree = submission.treeId
    ? await db.treeBranchLeafTree.findUnique({ where: { id: submission.treeId }, select: { id: true, name: true } })
    : null;

  // 7. Charger les sections (branches de niveau tab/section) pour structurer le PDF
  const allNodes = submission.treeId
    ? await db.treeBranchLeafNode.findMany({
        where: { treeId: submission.treeId },
        select: { id: true, label: true, type: true, parentId: true, order: true },
        orderBy: { order: 'asc' },
      })
    : [];

  // Construire les sections : les branches de premier niveau comme onglets
  const tabNodes = allNodes.filter(n => n.type === 'branch' && !n.parentId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  
  const sections: TblPdfSection[] = [];
  
  if (tabNodes.length > 0) {
    for (const tab of tabNodes) {
      const sectionFields: TblPdfField[] = [];
      
      // Chercher tous les descendants de ce tab qui ont des données
      const descendants = new Set<string>();
      const queue = [tab.id];
      while (queue.length > 0) {
        const current = queue.shift()!;
        descendants.add(current);
        for (const n of allNodes) {
          if (n.parentId === current && !descendants.has(n.id)) {
            queue.push(n.id);
          }
        }
      }

      for (const row of dataRows) {
        if (!descendants.has(row.nodeId)) continue;
        const node = nodesMap.get(row.nodeId);
        if (!node) continue;
        
        // Exclure les DISPLAY fields
        const isDisplay = node.fieldType === 'DISPLAY' || 
          (node.type === 'leaf_field' && ['display', 'DISPLAY'].includes(node.fieldSubType || ''));
        if (isDisplay) continue;

        sectionFields.push({
          nodeId: node.id,
          label: node.label || node.id,
          value: row.value,
          type: node.type || 'unknown',
          fieldType: node.fieldType || undefined,
          fieldSubType: node.fieldSubType || undefined,
          calculatedBy: row.operationSource || undefined,
        });
      }

      if (sectionFields.length > 0) {
        sections.push({
          title: tab.label || `Section ${tab.order ?? ''}`,
          fields: sectionFields,
        });
      }
    }
  }

  // Fallback : si pas de structure tab, mettre tout en une section
  if (sections.length === 0) {
    const allFields: TblPdfField[] = [];
    for (const row of dataRows) {
      const node = nodesMap.get(row.nodeId);
      if (!node) continue;
      const isDisplay = node.fieldType === 'DISPLAY' || 
        (node.type === 'leaf_field' && ['display', 'DISPLAY'].includes(node.fieldSubType || ''));
      if (isDisplay) continue;
      allFields.push({
        nodeId: node.id,
        label: node.label || node.id,
        value: row.value,
        type: node.type || 'unknown',
        fieldType: node.fieldType || undefined,
        calculatedBy: row.operationSource || undefined,
      });
    }
    if (allFields.length > 0) {
      sections.push({ title: 'Donnees du devis', fields: allFields });
    }
  }

  return {
    treeName: tree?.name || 'Devis TBL',
    submissionId,
    devisName: tree?.name || `Devis #${submissionId.substring(0, 8)}`,
    organizationName: org?.name || undefined,
    lead: lead ? {
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      fullAddress: (lead.data as any)?.address || null,
    } : null,
    sections,
    createdAt: submission.createdAt,
    updatedAt: submission.updatedAt,
    status: submission.status,
  };
}


// ═══════════════════════════════════════════════════
// 📄 PDF GENERATION
// ═══════════════════════════════════════════════════

/**
 * POST /api/e-signature/tbl/:submissionId/pdf
 * Génère et télécharge le PDF d'un devis TBL
 */
router.post('/tbl/:submissionId/pdf', authenticateToken, async (req: any, res: Response) => {
  try {
    const { submissionId } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organisation requise' });

    const pdfData = await buildTblPdfData(submissionId, organizationId);
    
    // Ajouter les signatures existantes au PDF si demandé
    if (req.body.includeSignatures) {
      const signatures = await db.electronicSignature.findMany({
        where: { submissionId, status: 'SIGNED' },
        orderBy: { signedAt: 'asc' },
      });
      pdfData.signatures = signatures.map(s => ({
        signerName: s.signerName,
        signerRole: s.signerRole,
        signatureData: s.signatureData,
        signedAt: s.signedAt!,
        legalText: s.legalText || undefined,
        ipAddress: s.ipAddress || undefined,
      }));
    }

    const { buffer, hash } = await generateTblPdfWithHash(pdfData);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="devis-${submissionId.substring(0, 8)}.pdf"`);
    res.setHeader('X-PDF-Hash', hash);
    res.setHeader('Content-Length', buffer.length);
    return res.send(buffer);
  } catch (error) {
    console.error('[E-Signature] Erreur génération PDF:', error);
    return res.status(500).json({ success: false, message: 'Erreur génération PDF', error: String(error) });
  }
});

/**
 * GET /api/e-signature/tbl/:submissionId/pdf/preview
 * Prévisualisation du PDF (inline, pas download)
 */
router.get('/tbl/:submissionId/pdf/preview', authenticateToken, async (req: any, res: Response) => {
  try {
    const { submissionId } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organisation requise' });

    const pdfData = await buildTblPdfData(submissionId, organizationId);
    const buffer = await generateTblPdf(pdfData);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="preview-${submissionId.substring(0, 8)}.pdf"`);
    res.setHeader('Content-Length', buffer.length);
    return res.send(buffer);
  } catch (error) {
    console.error('[E-Signature] Erreur prévisualisation PDF:', error);
    return res.status(500).json({ success: false, message: 'Erreur prévisualisation PDF', error: String(error) });
  }
});


// ═══════════════════════════════════════════════════
// ✍️ SIGNATURE WORKFLOW
// ═══════════════════════════════════════════════════

/**
 * POST /api/e-signature/initiate
 * Initialiser une demande de signature
 */
const initiateSchema = z.object({
  submissionId: z.string().min(1),
  documentId: z.string().optional(),
  leadId: z.string().optional(),
  signatureType: z.enum(['DEVIS', 'RECTIFICATION', 'CONTRAT', 'PV_RECEPTION']).default('DEVIS'),
  signerRole: z.enum(['CLIENT', 'COMMERCIAL', 'TECHNICIEN']),
  signerName: z.string().min(1),
  signerEmail: z.string().email(),
  signerPhone: z.string().optional(),
  legalText: z.string().optional(),
  expiresInHours: z.number().int().min(1).max(720).default(72), // 3 jours par défaut
});

router.post('/initiate', authenticateToken, async (req: any, res: Response) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const userId = req.user?.id || req.user?.userId;
    if (!organizationId) return res.status(400).json({ success: false, message: 'Organisation requise' });

    const validation = initiateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, message: 'Données invalides', errors: validation.error.errors });
    }

    const data = validation.data;
    const accessToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + data.expiresInHours * 60 * 60 * 1000);

    const legalText = data.legalText || `En signant ce document, je, ${data.signerName}, confirme avoir pris connaissance de l'integralite du devis ci-joint et accepte les termes et conditions qui y sont decrits. Cette signature electronique a la meme valeur juridique qu'une signature manuscrite conformement au reglement europeen eIDAS. Date: ${new Date().toLocaleDateString('fr-BE')}`;

    const signature = await db.electronicSignature.create({
      data: {
        submissionId: data.submissionId,
        documentId: data.documentId || null,
        leadId: data.leadId || null,
        organizationId,
        signatureType: data.signatureType,
        signerRole: data.signerRole,
        signerName: data.signerName,
        signerEmail: data.signerEmail,
        signerPhone: data.signerPhone || null,
        signatureData: '', // Sera rempli lors de la signature
        signatureHash: '', // Sera rempli lors de la signature
        legalText,
        accessToken,
        tokenExpiresAt: expiresAt,
        expiresAt,
        status: 'PENDING',
        createdBy: userId || null,
        auditTrail: addAuditEntry(null, 'INITIATED', {
          initiatedBy: userId,
          signerEmail: data.signerEmail,
          signatureType: data.signatureType,
        }, req),
      },
    });

    console.log(`[E-Signature] ✍️ Demande initiée: ${signature.id} pour ${data.signerEmail} (${data.signerRole})`);

    return res.json({
      success: true,
      signatureId: signature.id,
      accessToken,
      signUrl: `/sign/${accessToken}`,
      expiresAt,
    });
  } catch (error) {
    console.error('[E-Signature] Erreur initiation:', error);
    return res.status(500).json({ success: false, message: 'Erreur initiation signature' });
  }
});

/**
 * POST /api/e-signature/:id/send-otp
 * Envoyer un code OTP par email au signataire
 */
router.post('/:id/send-otp', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;

    const signature = await db.electronicSignature.findUnique({ where: { id } });
    if (!signature) return res.status(404).json({ success: false, message: 'Signature non trouvée' });
    if (signature.organizationId !== organizationId) return res.status(403).json({ success: false, message: 'Accès refusé' });
    if (['SIGNED', 'REVOKED', 'EXPIRED'].includes(signature.status)) {
      return res.status(400).json({ success: false, message: `Impossible d'envoyer un OTP: statut ${signature.status}` });
    }

    // Générer l'OTP
    const otp = generateOtp();
    const otpHashed = hashOtp(otp);

    // Envoyer l'OTP par email
    let emailSent = false;
    try {
      const { transporter, fromEmail } = await getSmtpTransporter(organizationId);
      
      await transporter.sendMail({
        from: fromEmail,
        to: signature.signerEmail,
        subject: `🔐 Code de vérification signature - ${otp}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1677ff, #4096ff); color: white; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
              <h2 style="margin: 0; font-size: 20px;">Signature Electronique</h2>
              <p style="margin: 5px 0 0; opacity: 0.9; font-size: 13px;">Verification d'identite</p>
            </div>
            <div style="padding: 30px; border: 1px solid #e8e8e8; border-top: none; border-radius: 0 0 12px 12px; background: #fff;">
              <p style="font-size: 15px; color: #333;">Bonjour <strong>${signature.signerName}</strong>,</p>
              <p style="font-size: 14px; color: #555;">Voici votre code de verification pour signer le document :</p>
              <div style="background: #f0f5ff; border: 2px solid #1677ff; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
                <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1677ff;">${otp}</span>
              </div>
              <p style="font-size: 12px; color: #8c8c8c; text-align: center;">
                Ce code est valable <strong>10 minutes</strong>. Ne le partagez avec personne.
              </p>
              <hr style="border: none; border-top: 1px solid #f0f0f0; margin: 20px 0;">
              <p style="font-size: 11px; color: #bfbfbf; text-align: center;">
                Si vous n'avez pas demande ce code, ignorez cet email.
                <br>Verification de signature electronique — 2Thier CRM
              </p>
            </div>
          </div>
        `,
      });
      emailSent = true;
    } catch (emailErr) {
      console.error('[E-Signature] Erreur envoi email OTP:', emailErr);
      // En mode développement : fallback — on log le code OTP et on continue
      if (process.env.NODE_ENV !== 'production') {
        console.log(`\n╔══════════════════════════════════════════╗`);
        console.log(`║  🔐 [DEV] CODE OTP: ${otp}                  ║`);
        console.log(`║  📧 Pour: ${signature.signerEmail}`);
        console.log(`╚══════════════════════════════════════════╝\n`);
      } else {
        return res.status(500).json({ success: false, message: 'Erreur envoi email OTP. Vérifiez la configuration SMTP.' });
      }
    }

    // Stocker le hash de l'OTP
    await db.electronicSignature.update({
      where: { id },
      data: {
        otpCode: otpHashed,
        otpSentAt: new Date(),
        otpAttempts: 0,
        status: 'OTP_SENT',
        auditTrail: addAuditEntry(signature.auditTrail as any[], 'OTP_SENT', {
          method: 'EMAIL',
          to: signature.signerEmail,
        }, req),
      },
    });

    console.log(`[E-Signature] 📧 OTP ${emailSent ? 'envoyé par email' : '(DEV: affiché dans les logs)'} pour ${signature.signerEmail}`);
    return res.json({ success: true, message: emailSent ? 'Code de vérification envoyé par email' : `[DEV] Code OTP affiché dans les logs serveur` });
  } catch (error) {
    console.error('[E-Signature] Erreur envoi OTP:', error);
    return res.status(500).json({ success: false, message: 'Erreur envoi OTP' });
  }
});

/**
 * POST /api/e-signature/:id/verify-otp
 * Vérifier le code OTP
 */
const verifyOtpSchema = z.object({
  otp: z.string().length(6),
});

router.post('/:id/verify-otp', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validation = verifyOtpSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, message: 'Code OTP invalide (6 chiffres requis)' });
    }

    const signature = await db.electronicSignature.findUnique({ where: { id } });
    if (!signature) return res.status(404).json({ success: false, message: 'Signature non trouvée' });
    
    if (signature.status !== 'OTP_SENT') {
      return res.status(400).json({ success: false, message: `Statut inattendu: ${signature.status}` });
    }

    // Vérifier l'expiration de l'OTP (10 minutes)
    if (signature.otpSentAt && Date.now() - signature.otpSentAt.getTime() > 10 * 60 * 1000) {
      await db.electronicSignature.update({
        where: { id },
        data: {
          auditTrail: addAuditEntry(signature.auditTrail as any[], 'OTP_EXPIRED', {}, req),
        },
      });
      return res.status(410).json({ success: false, message: 'Code expiré. Demandez un nouveau code.' });
    }

    // Vérifier le nombre de tentatives (max 5)
    if (signature.otpAttempts >= 5) {
      await db.electronicSignature.update({
        where: { id },
        data: {
          status: 'EXPIRED',
          auditTrail: addAuditEntry(signature.auditTrail as any[], 'OTP_MAX_ATTEMPTS', { attempts: signature.otpAttempts }, req),
        },
      });
      return res.status(429).json({ success: false, message: 'Trop de tentatives. La demande de signature est annulée.' });
    }

    // Comparer le hash
    const inputHash = hashOtp(validation.data.otp);
    if (inputHash !== signature.otpCode) {
      await db.electronicSignature.update({
        where: { id },
        data: {
          otpAttempts: signature.otpAttempts + 1,
          auditTrail: addAuditEntry(signature.auditTrail as any[], 'OTP_FAILED', { attempt: signature.otpAttempts + 1 }, req),
        },
      });
      return res.status(400).json({ 
        success: false, 
        message: 'Code incorrect',
        remainingAttempts: 5 - (signature.otpAttempts + 1),
      });
    }

    // OTP vérifié !
    await db.electronicSignature.update({
      where: { id },
      data: {
        otpVerifiedAt: new Date(),
        status: 'OTP_VERIFIED',
        auditTrail: addAuditEntry(signature.auditTrail as any[], 'OTP_VERIFIED', {}, req),
      },
    });

    console.log(`[E-Signature] ✅ OTP vérifié pour ${signature.signerEmail}`);
    return res.json({ success: true, message: 'Identité vérifiée' });
  } catch (error) {
    console.error('[E-Signature] Erreur vérification OTP:', error);
    return res.status(500).json({ success: false, message: 'Erreur vérification OTP' });
  }
});

/**
 * POST /api/e-signature/:id/sign
 * Soumettre la signature (après vérification OTP)
 */
const signSchema = z.object({
  signatureData: z.string().min(1, 'Signature requise'), // base64 PNG du canvas
  legalAccepted: z.boolean(),
});

router.post('/:id/sign', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ip = req.headers['x-forwarded-for'] as string || req.socket?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    const validation = signSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, message: 'Données signature invalides', errors: validation.error.errors });
    }

    const data = validation.data;

    if (!data.legalAccepted) {
      return res.status(400).json({ success: false, message: 'Vous devez accepter les conditions juridiques' });
    }

    const signature = await db.electronicSignature.findUnique({ where: { id } });
    if (!signature) return res.status(404).json({ success: false, message: 'Signature non trouvée' });

    if (signature.status === 'SIGNED') {
      return res.status(409).json({ success: false, message: 'Ce document a déjà été signé' });
    }

    if (signature.status !== 'OTP_VERIFIED') {
      return res.status(400).json({ success: false, message: 'Vérification OTP requise avant de signer' });
    }

    // Vérifier expiration
    if (signature.expiresAt && signature.expiresAt < new Date()) {
      return res.status(410).json({ success: false, message: 'Demande de signature expirée' });
    }

    // Hash de la signature visuelle
    const signatureHash = crypto.createHash('sha256').update(data.signatureData).digest('hex');

    // Générer le PDF final avec signature intégrée
    let documentHash: string | null = null;
    let signedPdfUrl: string | null = null;

    if (signature.submissionId) {
      try {
        const pdfData = await buildTblPdfData(signature.submissionId, signature.organizationId);
        
        // Charger toutes les signatures validées pour ce document
        const allSignatures = await db.electronicSignature.findMany({
          where: { submissionId: signature.submissionId, status: 'SIGNED' },
        });

        pdfData.signatures = [
          // Signatures existantes
          ...allSignatures.map(s => ({
            signerName: s.signerName,
            signerRole: s.signerRole,
            signatureData: s.signatureData,
            signedAt: s.signedAt!,
            legalText: s.legalText || undefined,
            ipAddress: s.ipAddress || undefined,
          })),
          // + la signature actuelle
          {
            signerName: signature.signerName,
            signerRole: signature.signerRole,
            signatureData: data.signatureData,
            signedAt: new Date(),
            legalText: signature.legalText || undefined,
            ipAddress: ip,
          }
        ];

        const pdfResult = await generateTblPdfWithHash(pdfData);
        documentHash = pdfResult.hash;
        // En production, on stockerait le buffer dans un storage (GCS, S3...)
        // Pour l'instant on stocke juste le hash — le PDF sera régénéré à la demande
        signedPdfUrl = `/api/e-signature/${id}/download-signed-pdf`;
      } catch (pdfErr) {
        console.error('[E-Signature] Erreur génération PDF signé (non bloquant):', pdfErr);
      }
    }

    // Snapshot du document au moment de la signature
    const documentSnapshot = {
      signedAt: new Date().toISOString(),
      submissionId: signature.submissionId,
      signerName: signature.signerName,
      signerEmail: signature.signerEmail,
      ipAddress: ip,
      userAgent,
      documentHash,
      signatureHash,
    };

    // Sceller la signature
    await db.electronicSignature.update({
      where: { id },
      data: {
        signatureData: data.signatureData,
        signatureHash,
        documentHash,
        documentSnapshot: documentSnapshot as any,
        legalAccepted: true,
        legalAcceptedAt: new Date(),
        ipAddress: ip,
        userAgent,
        status: 'SIGNED',
        signedAt: new Date(),
        signedPdfUrl,
        signedPdfHash: documentHash,
        auditTrail: addAuditEntry(signature.auditTrail as any[], 'SIGNED', {
          signatureHash,
          documentHash,
          legalAccepted: true,
        }, req),
      },
    });

    console.log(`[E-Signature] ✅ Document signé par ${signature.signerName} (${signature.signerRole})`);

    // 🔔 Notification: document signé
    if (signature.organizationId) {
      notify.documentSigned(
        signature.organizationId,
        { signerName: signature.signerName, signerEmail: signature.signerEmail, documentId: signature.documentId || undefined }
      );
    }

    return res.json({
      success: true,
      message: 'Document signé avec succès',
      signatureId: id,
      signatureHash,
      documentHash,
      signedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[E-Signature] Erreur signature:', error);
    return res.status(500).json({ success: false, message: 'Erreur lors de la signature' });
  }
});

/**
 * GET /api/e-signature/:id/download-signed-pdf
 * Télécharger le vrai PDF client avec la signature intégrée
 */
router.get('/:id/download-signed-pdf', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const wantBase64 = req.query.format === 'base64';
    
    // Helper: envoyer le PDF (binaire ou base64 JSON selon ?format=base64)
    const sendPdf = (buffer: Buffer, filename: string, extra?: Record<string, string>) => {
      if (wantBase64) {
        return res.json({
          success: true,
          pdfBase64: buffer.toString('base64'),
          filename,
          size: buffer.length,
        });
      }
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      if (extra) Object.entries(extra).forEach(([k, v]) => res.setHeader(k, v));
      return res.send(buffer);
    };

    const signature = await db.electronicSignature.findUnique({ where: { id } });
    if (!signature) return res.status(404).json({ success: false, message: 'Signature non trouvée' });
    if (signature.status !== 'SIGNED') {
      return res.status(400).json({ success: false, message: 'Le document n\'a pas encore été signé' });
    }

    // Récupérer toutes les signatures pour ce document
    const whereClause: any = { status: 'SIGNED' };
    if (signature.documentId) whereClause.documentId = signature.documentId;
    else if (signature.submissionId) whereClause.submissionId = signature.submissionId;
    else whereClause.id = id;

    const allSignatures = await db.electronicSignature.findMany({
      where: whereClause,
      orderBy: { signedAt: 'asc' },
    });

    const electronicSignatures = allSignatures.map(s => ({
      signerName: s.signerName,
      signerRole: s.signerRole,
      signatureData: s.signatureData,
      signedAt: s.signedAt!,
    }));

    // Utiliser le documentId pour générer le VRAI PDF client avec signatures
    if (signature.documentId) {
      const { buffer, filename } = await generateClientPdfBuffer(signature.documentId, { electronicSignatures });
      const signedFilename = filename.replace('.pdf', '-signé.pdf');
      
      return sendPdf(buffer, signedFilename, { 'X-Signature-Count': allSignatures.length.toString() });
    }

    // Fallback si pas de documentId : utiliser le PDF TBL interne
    if (!signature.submissionId) {
      return res.status(400).json({ success: false, message: 'Pas de document lié à cette signature' });
    }

    const pdfData = await buildTblPdfData(signature.submissionId, signature.organizationId);
    pdfData.signatures = allSignatures.map(s => ({
      signerName: s.signerName,
      signerRole: s.signerRole,
      signatureData: s.signatureData,
      signedAt: s.signedAt!,
      legalText: s.legalText || undefined,
      ipAddress: s.ipAddress || undefined,
    }));

    const { buffer, hash } = await generateTblPdfWithHash(pdfData);
    const tblFilename = `devis-signe-${signature.submissionId.substring(0, 8)}.pdf`;
    
    return sendPdf(buffer, tblFilename, { 'X-PDF-Hash': hash, 'X-Signature-Count': allSignatures.length.toString() });
  } catch (error) {
    console.error('[E-Signature] Erreur download PDF signé:', error);
    return res.status(500).json({ success: false, message: 'Erreur téléchargement PDF signé' });
  }
});

/**
 * GET /api/e-signature/submission/:submissionId/status
 * Récupérer le statut de toutes les signatures pour un devis
 */
router.get('/submission/:submissionId/status', authenticateToken, async (req: any, res: Response) => {
  try {
    const { submissionId } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;

    const signatures = await db.electronicSignature.findMany({
      where: { submissionId, organizationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        signatureType: true,
        signerRole: true,
        signerName: true,
        signerEmail: true,
        status: true,
        signedAt: true,
        createdAt: true,
        expiresAt: true,
        otpVerifiedAt: true,
        signatureHash: true,
        documentHash: true,
      },
    });

    return res.json({
      success: true,
      signatures,
      totalSigned: signatures.filter(s => s.status === 'SIGNED').length,
      totalPending: signatures.filter(s => !['SIGNED', 'EXPIRED', 'REVOKED'].includes(s.status)).length,
    });
  } catch (error) {
    console.error('[E-Signature] Erreur statut signatures:', error);
    return res.status(500).json({ success: false, message: 'Erreur récupération statut' });
  }
});

/**
 * GET /api/e-signature/:id/audit-trail
 * Récupérer la piste d'audit complète d'une signature
 */
router.get('/:id/audit-trail', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    
    const signature = await db.electronicSignature.findUnique({
      where: { id },
      select: {
        id: true,
        signerName: true,
        signerEmail: true,
        signerRole: true,
        signatureType: true,
        status: true,
        signedAt: true,
        createdAt: true,
        signatureHash: true,
        documentHash: true,
        ipAddress: true,
        userAgent: true,
        legalText: true,
        legalAccepted: true,
        legalAcceptedAt: true,
        auditTrail: true,
        otpSentAt: true,
        otpVerifiedAt: true,
        otpMethod: true,
        otpAttempts: true,
      },
    });

    if (!signature) return res.status(404).json({ success: false, message: 'Signature non trouvée' });

    return res.json({ success: true, ...signature });
  } catch (error) {
    console.error('[E-Signature] Erreur audit trail:', error);
    return res.status(500).json({ success: false, message: 'Erreur récupération audit trail' });
  }
});

/**
 * POST /api/e-signature/:id/revoke
 * Révoquer une signature (admin uniquement)
 */
const revokeSchema = z.object({
  reason: z.string().min(1, 'Raison de révocation requise'),
});

router.post('/:id/revoke', authenticateToken, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?.userId;
    const organizationId = req.headers['x-organization-id'] as string;

    const validation = revokeSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, message: 'Raison requise' });
    }

    const signature = await db.electronicSignature.findUnique({ where: { id } });
    if (!signature) return res.status(404).json({ success: false, message: 'Signature non trouvée' });
    if (signature.organizationId !== organizationId) return res.status(403).json({ success: false, message: 'Accès refusé' });

    await db.electronicSignature.update({
      where: { id },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revokedReason: validation.data.reason,
        auditTrail: addAuditEntry(signature.auditTrail as any[], 'REVOKED', {
          revokedBy: userId,
          reason: validation.data.reason,
        }, req),
      },
    });

    console.log(`[E-Signature] 🚫 Signature ${id} révoquée par ${userId}: ${validation.data.reason}`);
    return res.json({ success: true, message: 'Signature révoquée' });
  } catch (error) {
    console.error('[E-Signature] Erreur révocation:', error);
    return res.status(500).json({ success: false, message: 'Erreur révocation' });
  }
});

/**
 * GET /api/e-signature/sign/:token
 * Page publique de signature (accès par token, sans login)
 */
router.get('/sign/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const signature = await db.electronicSignature.findUnique({
      where: { accessToken: token },
      select: {
        id: true,
        signerName: true,
        signerEmail: true,
        signerRole: true,
        signatureType: true,
        status: true,
        legalText: true,
        expiresAt: true,
        tokenExpiresAt: true,
        submissionId: true,
        organizationId: true,
      },
    });

    if (!signature) {
      return res.status(404).json({ success: false, message: 'Lien de signature invalide' });
    }

    if (signature.tokenExpiresAt && signature.tokenExpiresAt < new Date()) {
      return res.status(410).json({ success: false, message: 'Ce lien de signature a expiré' });
    }

    if (signature.status === 'SIGNED') {
      return res.json({ success: true, alreadySigned: true, signatureId: signature.id });
    }

    return res.json({
      success: true,
      signatureId: signature.id,
      signerName: signature.signerName,
      signerEmail: signature.signerEmail,
      signerRole: signature.signerRole,
      signatureType: signature.signatureType,
      legalText: signature.legalText,
      status: signature.status,
      submissionId: signature.submissionId,
    });
  } catch (error) {
    console.error('[E-Signature] Erreur accès token:', error);
    return res.status(500).json({ success: false, message: 'Erreur accès' });
  }
});

/**
 * POST /api/e-signature/sign/:token/send-otp
 * Envoyer OTP via le token public (sans login)
 */
router.post('/sign/:token/send-otp', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const signature = await db.electronicSignature.findUnique({
      where: { accessToken: token },
    });

    if (!signature) return res.status(404).json({ success: false, message: 'Lien invalide' });
    if (signature.tokenExpiresAt && signature.tokenExpiresAt < new Date()) {
      return res.status(410).json({ success: false, message: 'Lien expiré' });
    }
    if (signature.status === 'SIGNED') {
      return res.status(409).json({ success: false, message: 'Déjà signé' });
    }

    const otp = generateOtp();
    const otpHashed = hashOtp(otp);

    try {
      const { transporter, fromEmail } = await getSmtpTransporter(signature.organizationId);
      
      await transporter.sendMail({
        from: fromEmail,
        to: signature.signerEmail,
        subject: `Code de verification: ${otp}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1677ff; text-align: center;">Verification d'identite</h2>
            <p>Bonjour <strong>${signature.signerName}</strong>,</p>
            <p>Votre code de verification :</p>
            <div style="background: #f0f5ff; border: 2px solid #1677ff; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
              <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1677ff;">${otp}</span>
            </div>
            <p style="font-size: 12px; color: #999; text-align: center;">Valable 10 minutes.</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error('[E-Signature] Erreur envoi OTP (token):', emailErr);
      return res.status(500).json({ success: false, message: 'Erreur envoi email' });
    }

    await db.electronicSignature.update({
      where: { id: signature.id },
      data: {
        otpCode: otpHashed,
        otpSentAt: new Date(),
        otpAttempts: 0,
        status: 'OTP_SENT',
        auditTrail: addAuditEntry(signature.auditTrail as any[], 'OTP_SENT_VIA_TOKEN', {
          method: 'EMAIL',
          to: signature.signerEmail,
        }, req),
      },
    });

    return res.json({ success: true, message: 'Code envoyé' });
  } catch (error) {
    console.error('[E-Signature] Erreur send-otp token:', error);
    return res.status(500).json({ success: false, message: 'Erreur' });
  }
});

/**
 * POST /api/e-signature/sign/:token/verify-otp
 * Vérifier OTP via token public
 */
router.post('/sign/:token/verify-otp', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { otp } = req.body;
    if (!otp || typeof otp !== 'string' || otp.length !== 6) {
      return res.status(400).json({ success: false, message: 'Code à 6 chiffres requis' });
    }

    const signature = await db.electronicSignature.findUnique({ where: { accessToken: token } });
    if (!signature) return res.status(404).json({ success: false, message: 'Lien invalide' });
    if (signature.status !== 'OTP_SENT') {
      return res.status(400).json({ success: false, message: `Statut inattendu: ${signature.status}` });
    }

    if (signature.otpSentAt && Date.now() - signature.otpSentAt.getTime() > 10 * 60 * 1000) {
      return res.status(410).json({ success: false, message: 'Code expiré' });
    }
    if (signature.otpAttempts >= 5) {
      await db.electronicSignature.update({ where: { id: signature.id }, data: { status: 'EXPIRED' } });
      return res.status(429).json({ success: false, message: 'Trop de tentatives' });
    }

    const inputHash = hashOtp(otp);
    if (inputHash !== signature.otpCode) {
      await db.electronicSignature.update({
        where: { id: signature.id },
        data: { otpAttempts: signature.otpAttempts + 1 },
      });
      return res.status(400).json({ success: false, message: 'Code incorrect', remainingAttempts: 5 - (signature.otpAttempts + 1) });
    }

    await db.electronicSignature.update({
      where: { id: signature.id },
      data: {
        otpVerifiedAt: new Date(),
        status: 'OTP_VERIFIED',
        auditTrail: addAuditEntry(signature.auditTrail as any[], 'OTP_VERIFIED_VIA_TOKEN', {}, req),
      },
    });

    return res.json({ success: true, signatureId: signature.id });
  } catch (error) {
    console.error('[E-Signature] Erreur verify-otp token:', error);
    return res.status(500).json({ success: false, message: 'Erreur' });
  }
});

/**
 * POST /api/e-signature/sign/:token/submit
 * Soumettre la signature via token public
 */
router.post('/sign/:token/submit', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const ip = req.headers['x-forwarded-for'] as string || req.socket?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    const validation = signSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, message: 'Données invalides', errors: validation.error.errors });
    }

    const signature = await db.electronicSignature.findUnique({ where: { accessToken: token } });
    if (!signature) return res.status(404).json({ success: false, message: 'Lien invalide' });
    if (signature.status === 'SIGNED') return res.status(409).json({ success: false, message: 'Déjà signé' });
    if (signature.tokenExpiresAt && signature.tokenExpiresAt < new Date()) {
      return res.status(410).json({ success: false, message: 'Ce lien de signature a expiré' });
    }
    // Signature via lien email : pas besoin d'OTP (le lien dans l'email = vérification d'identité)
    const isEmailLink = signature.otpMethod === 'EMAIL_LINK';
    if (!isEmailLink && signature.status !== 'OTP_VERIFIED') {
      return res.status(400).json({ success: false, message: 'Vérification OTP requise' });
    }
    if (!validation.data.legalAccepted) {
      return res.status(400).json({ success: false, message: 'Clause juridique non acceptée' });
    }

    const signatureHash = crypto.createHash('sha256').update(validation.data.signatureData).digest('hex');

    let documentHash: string | null = null;
    // Générer le hash du PDF client (vrai devis) si documentId disponible
    if (signature.documentId) {
      try {
        const { buffer } = await generateClientPdfBuffer(signature.documentId, {
          electronicSignatures: [{
            signerName: signature.signerName,
            signerRole: signature.signerRole,
            signatureData: validation.data.signatureData,
            signedAt: new Date(),
          }]
        });
        documentHash = crypto.createHash('sha256').update(buffer).digest('hex');
      } catch (pdfErr) {
        console.error('[E-Signature] Erreur hash PDF client (non bloquant):', pdfErr);
      }
    } else if (signature.submissionId) {
      // Fallback : TBL PDF interne
      try {
        const pdfData = await buildTblPdfData(signature.submissionId, signature.organizationId);
        const existingSigs = await db.electronicSignature.findMany({
          where: { submissionId: signature.submissionId, status: 'SIGNED' },
        });
        pdfData.signatures = [
          ...existingSigs.map(s => ({
            signerName: s.signerName,
            signerRole: s.signerRole,
            signatureData: s.signatureData,
            signedAt: s.signedAt!,
            legalText: s.legalText || undefined,
            ipAddress: s.ipAddress || undefined,
          })),
          {
            signerName: signature.signerName,
            signerRole: signature.signerRole,
            signatureData: validation.data.signatureData,
            signedAt: new Date(),
            legalText: signature.legalText || undefined,
            ipAddress: ip,
          }
        ];
        const pdfResult = await generateTblPdfWithHash(pdfData);
        documentHash = pdfResult.hash;
      } catch (pdfErr) {
        console.error('[E-Signature] Erreur PDF (non bloquant):', pdfErr);
      }
    }

    await db.electronicSignature.update({
      where: { id: signature.id },
      data: {
        signatureData: validation.data.signatureData,
        signatureHash,
        documentHash,
        documentSnapshot: {
          signedAt: new Date().toISOString(),
          ip, userAgent, signatureHash, documentHash,
        } as any,
        legalAccepted: true,
        legalAcceptedAt: new Date(),
        ipAddress: ip,
        userAgent,
        status: 'SIGNED',
        signedAt: new Date(),
        signedPdfUrl: `/api/e-signature/${signature.id}/download-signed-pdf`,
        signedPdfHash: documentHash,
        auditTrail: addAuditEntry(signature.auditTrail as any[], isEmailLink ? 'SIGNED_VIA_EMAIL_LINK' : 'SIGNED_VIA_TOKEN', {
          signatureHash, documentHash, method: isEmailLink ? 'EMAIL_LINK' : 'OTP',
        }, req),
      },
    });

    console.log(`[E-Signature] ✅ Signé via token par ${signature.signerName}`);

    // 📧 Envoi PDF signé par email au client ET au commercial (asynchrone, non bloquant)
    if (signature.organizationId) {
      (async () => {
        try {
          // Générer le PDF signé une seule fois
          let pdfBuffer: Buffer | null = null;
          let pdfFilename = 'devis-signe.pdf';
          try {
            const electronicSignatures = [{
              signerName: signature.signerName,
              signerRole: signature.signerRole,
              signatureData: validation.data.signatureData,
              signedAt: new Date(),
            }];
            if (signature.documentId) {
              const { buffer, filename } = await generateClientPdfBuffer(signature.documentId, { electronicSignatures });
              pdfBuffer = buffer;
              pdfFilename = filename.replace('.pdf', '-signé.pdf');
            } else if (signature.submissionId) {
              const pdfData = await buildTblPdfData(signature.submissionId, signature.organizationId);
              pdfData.signatures = electronicSignatures.map(s => ({ ...s, legalText: undefined, ipAddress: undefined }));
              const { buffer } = await generateTblPdfWithHash(pdfData);
              pdfBuffer = buffer;
              pdfFilename = `devis-signe-${signature.submissionId.substring(0, 8)}.pdf`;
            }
          } catch (pdfErr) {
            console.warn('[E-Signature] ⚠️ Erreur génération PDF pour email:', pdfErr);
          }

          // PDF généré pour l'email
          if (pdfBuffer) {
            console.log(`[E-Signature] PDF généré pour ${signature.id}`);
          }

          const attachments = pdfBuffer ? [{ filename: pdfFilename, content: pdfBuffer, mimeType: 'application/pdf' }] : [];
          const signedDate = new Date().toLocaleString('fr-BE');

          // 📧 1) Email au CLIENT avec copie du devis signé
          if (signature.signerEmail) {
            try {
              // Utiliser le createdBy pour envoyer via Gmail du commercial
              const senderId = signature.createdBy || undefined;
              const gmailClient = senderId
                ? await GoogleGmailService.create(signature.organizationId, senderId)
                : null;

              if (gmailClient) {
                await gmailClient.sendEmail({
                  to: signature.signerEmail,
                  subject: `📄 Votre devis signé — Confirmation`,
                  body: `
                    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
                      <div style="background: #f6ffed; border: 1px solid #b7eb8f; border-radius: 8px; padding: 20px;">
                        <h2 style="color: #52c41a; margin: 0 0 12px;">✅ Signature confirmée</h2>
                        <p>Bonjour <strong>${signature.signerName}</strong>,</p>
                        <p>Nous confirmons la bonne réception de votre signature électronique.</p>
                        <p>Vous trouverez ci-joint une copie de votre devis signé pour vos archives.</p>
                        <p style="font-size: 13px; color: #666;">
                          📅 Date de signature : ${signedDate}<br/>
                          🔐 Référence : ${signatureHash.substring(0, 12)}...
                        </p>
                        <p style="margin-top: 16px;">Cordialement,<br/>L'équipe commerciale</p>
                      </div>
                    </div>`,
                  isHtml: true,
                  attachments,
                });
                console.log(`[E-Signature] 📧 Copie PDF envoyée au client: ${signature.signerEmail}`);
              } else {
                console.warn('[E-Signature] Gmail non dispo pour email client');
              }
            } catch (clientEmailErr) {
              console.warn('[E-Signature] ⚠️ Échec email client:', clientEmailErr);
            }
          }

          // 📧 2) Email au COMMERCIAL avec copie du devis signé
          if (signature.createdBy) {
            try {
              const creator = await db.user.findUnique({ where: { id: signature.createdBy }, select: { email: true, firstName: true } });
              if (creator?.email) {
                const gmailCommercial = await GoogleGmailService.create(signature.organizationId, signature.createdBy);
                if (gmailCommercial) {
                  await gmailCommercial.sendEmail({
                    to: creator.email,
                    subject: `✅ Devis signé par ${signature.signerName}`,
                    body: `
                      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
                        <div style="background: #f6ffed; border: 1px solid #b7eb8f; border-radius: 8px; padding: 20px;">
                          <h2 style="color: #52c41a; margin: 0 0 12px;">✅ Signature reçue !</h2>
                          <p>Bonjour${creator.firstName ? ` ${creator.firstName}` : ''},</p>
                          <p>Le client <strong>${signature.signerName}</strong> (${signature.signerEmail}) vient de signer le devis.</p>
                          <p style="font-size: 13px; color: #666;">
                            📅 Signé le : ${signedDate}<br/>
                            🔐 Hash : ${signatureHash.substring(0, 16)}...
                          </p>
                          <p>Le PDF signé est en pièce jointe.</p>
                        </div>
                      </div>`,
                    isHtml: true,
                    attachments,
                  });
                  console.log(`[E-Signature] 📧 Copie PDF envoyée au commercial: ${creator.email}`);
                }
              }
            } catch (adminEmailErr) {
              console.warn('[E-Signature] ⚠️ Échec email commercial:', adminEmailErr);
            }
          }
        } catch (notifErr) {
          console.warn('[E-Signature] ⚠️ Échec envoi emails (non bloquant):', notifErr);
        }
      })();
    }

    // 🏗️ Auto-création de chantiers par produit dans l'onglet Gagné (asynchrone, non bloquant)
    if (signature.documentId && signature.organizationId) {
      (async () => {
        try {
          const genDoc = await db.generatedDocument.findUnique({
            where: { id: signature.documentId! },
            select: {
              dataSnapshot: true,
              submissionId: true,
              leadId: true,
              documentNumber: true,
              paymentAmount: true,
              DocumentTemplate: {
                select: { DocumentSection: { select: { type: true, config: true } } }
              }
            }
          });
          if (!genDoc) return;

          const snapshot = (genDoc.dataSnapshot as any) || {};
          const selectedProducts = snapshot.selectedProducts as Array<{value: string, label: string, icon?: string, color?: string}> | undefined;

          if (!selectedProducts || selectedProducts.length === 0) {
            console.log('[E-Signature] 🏗️ Pas de produits sélectionnés → pas de chantier auto-créé');
            return;
          }

          // Infos du lead
          let clientName = signature.signerName || '';
          let siteAddress: string | null = null;
          let commercialId = signature.createdBy;
          const leadId = genDoc.leadId || signature.leadId;

          if (leadId) {
            const lead = await db.lead.findFirst({
              where: { id: leadId, organizationId: signature.organizationId },
              select: { firstName: true, lastName: true, company: true, assignedToId: true, data: true }
            });
            if (lead) {
              clientName = lead.company || [lead.firstName, lead.lastName].filter(Boolean).join(' ') || clientName;
              commercialId = lead.assignedToId || signature.createdBy;
              const leadData = (lead.data as any) || {};
              const parts: string[] = [];
              const street = leadData.street || leadData.address || '';
              const number = leadData.number || '';
              if (street) parts.push(street + (number ? ' ' + number : ''));
              const postalCode = leadData.postalCode || leadData.zipCode || '';
              const city = leadData.city || '';
              if (postalCode || city) parts.push([postalCode, city].filter(Boolean).join(' '));
              if (parts.length > 0) siteAddress = parts.join(', ');
            }
          }

          // Résoudre le montant
          let autoAmount: number | null = null;
          const quote = snapshot.quote || {};
          const ttc = quote.totalTTC || snapshot.totalTTC;
          if (ttc && !isNaN(Number(ttc))) autoAmount = Number(ttc);
          else if (genDoc.paymentAmount) autoAmount = Number(genDoc.paymentAmount);

          // Première colonne de chantier
          let statusId: string | undefined;
          const firstStatus = await db.chantierStatus.findFirst({
            where: { organizationId: signature.organizationId },
            orderBy: { order: 'asc' }
          });
          if (firstStatus) {
            statusId = firstStatus.id;
          } else {
            const newStatusId = crypto.randomUUID();
            const created = await db.chantierStatus.create({
              data: { id: newStatusId, organizationId: signature.organizationId, name: 'Nouveau', color: '#1677ff', order: 0, isDefault: true, updatedAt: new Date() }
            });
            statusId = created.id;
          }

          // Marquer le document comme SIGNED
          await db.generatedDocument.update({
            where: { id: signature.documentId! },
            data: { status: 'SIGNED', signedAt: new Date(), updatedAt: new Date() }
          }).catch(err => console.warn('[E-Signature] ⚠️ Erreur update doc SIGNED:', err));

          // Créer un chantier par produit
          for (const product of selectedProducts) {
            try {
              await db.chantier.create({
                data: {
                  id: crypto.randomUUID(),
                  organizationId: signature.organizationId,
                  leadId: leadId || null,
                  statusId,
                  commercialId: commercialId || null,
                  generatedDocumentId: signature.documentId,
                  submissionId: genDoc.submissionId || signature.submissionId || null,
                  productValue: product.value,
                  productLabel: product.label,
                  productIcon: product.icon || null,
                  productColor: product.color || null,
                  clientName: clientName || null,
                  siteAddress,
                  amount: autoAmount,
                  signedAt: new Date(),
                  documentUrl: `/api/e-signature/${signature.id}/download-signed-pdf`,
                  documentName: `${genDoc.documentNumber || 'devis'}-signé.pdf`,
                  updatedAt: new Date(),
                }
              });
              console.log(`[E-Signature] 🏗️ Chantier "${product.label}" créé automatiquement`);
            } catch (chantierErr) {
              console.warn(`[E-Signature] ⚠️ Erreur création chantier "${product.label}":`, chantierErr);
            }
          }
          console.log(`[E-Signature] 🏗️ ${selectedProducts.length} chantier(s) créé(s) pour la signature ${signature.id}`);
        } catch (err) {
          console.warn('[E-Signature] ⚠️ Erreur auto-création chantiers (non bloquant):', err);
        }
      })();
    }

    return res.json({
      success: true,
      message: 'Document signé',
      signatureHash,
      documentHash,
      signatureId: signature.id,
      signedPdfUrl: `/api/e-signature/${signature.id}/download-signed-pdf`,
    });
  } catch (error) {
    console.error('[E-Signature] Erreur submit token:', error);
    return res.status(500).json({ success: false, message: 'Erreur' });
  }
});

export default router;
