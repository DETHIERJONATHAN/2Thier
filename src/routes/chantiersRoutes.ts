import { Router } from 'express';
import { db } from '../lib/database';
import { authenticateToken, isAdmin } from '../middleware/auth';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { sendTransitionNotifications } from './chantier-workflow';

const router = Router();

// Schéma de validation pour créer un chantier
const createChantierSchema = z.object({
  leadId: z.string().optional(),
  statusId: z.string().optional(),
  responsableId: z.string().optional(),
  commercialId: z.string().optional(),
  productValue: z.string().min(1, 'Le produit est requis'),
  productLabel: z.string().min(1, 'Le label produit est requis'),
  productIcon: z.string().optional(),
  productColor: z.string().optional(),
  customLabel: z.string().optional(),
  clientName: z.string().optional(),
  siteAddress: z.string().optional(),
  notes: z.string().optional(),
  amount: z.number().optional(),
  signedAt: z.string().optional(), // ISO date string
  documentUrl: z.string().optional(),
  documentName: z.string().optional(),
});

// Schéma pour mise à jour
const updateChantierSchema = createChantierSchema.partial();

/**
 * GET /api/chantiers
 * Récupère tous les chantiers de l'organisation (avec filtres optionnels)
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const { statusId, productValue, leadId, responsableId } = req.query;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'ID d\'organisation requis'
      });
    }

    // SuperAdmin voit tout
    const user = (req as any).user;
    const isSuperAdmin = user?.role === 'super_admin' || user?.isSuperAdmin === true;

    const where: any = {};
    if (!isSuperAdmin) {
      where.organizationId = organizationId;
    }
    if (statusId) where.statusId = statusId as string;
    if (productValue) where.productValue = productValue as string;
    if (leadId) where.leadId = leadId as string;
    if (responsableId) where.responsableId = responsableId as string;

    const chantiers = await db.chantier.findMany({
      where,
      include: {
        Lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
            email: true,
            phone: true,
          }
        },
        ChantierStatus: true,
        Responsable: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        Commercial: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        Organization: {
          select: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: chantiers
    });
  } catch (error) {
    console.error('[Chantiers] Erreur GET /:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
});

/**
 * GET /api/chantiers/by-lead/:leadId
 * Récupère tous les chantiers liés à un lead
 */
router.get('/by-lead/:leadId', authenticateToken, async (req, res) => {
  try {
    const { leadId } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'ID d\'organisation requis'
      });
    }

    const chantiers = await db.chantier.findMany({
      where: { leadId, organizationId },
      include: {
        ChantierStatus: true,
        Responsable: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
        Commercial: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
        GeneratedDocument: {
          select: {
            id: true,
            title: true,
            documentNumber: true,
            type: true,
            status: true,
            submissionId: true,
            pdfUrl: true,
          }
        },
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: chantiers
    });
  } catch (error) {
    console.error('[Chantiers] Erreur GET /by-lead/:leadId:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
});

/**
 * GET /api/chantiers/:id
 * Récupère un chantier par son ID
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'ID d\'organisation requis'
      });
    }

    const chantier = await db.chantier.findFirst({
      where: { id, organizationId },
      include: {
        Lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
            email: true,
            phone: true,
            data: true,
          }
        },
        ChantierStatus: true,
        Responsable: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          }
        },
        Commercial: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          }
        },
        Organization: {
          select: {
            id: true,
            name: true,
          }
        },
        GeneratedDocument: {
          select: {
            id: true,
            title: true,
            documentNumber: true,
            type: true,
            status: true,
            pdfUrl: true,
            submissionId: true,
            dataSnapshot: true,
            paymentAmount: true,
            createdAt: true,
          }
        },
        TreeBranchLeafSubmission: {
          select: {
            id: true,
            treeId: true,
            summary: true,
            status: true,
          }
        },
      }
    });

    if (!chantier) {
      return res.status(404).json({
        success: false,
        message: 'Chantier non trouvé'
      });
    }

    // Lazy-compute : si le montant est null et qu'on a un document lié, résoudre via formules TBL
    let computedAmount: number | null = null;
    if (!chantier.amount && chantier.generatedDocumentId && chantier.submissionId) {
      try {
        const docTemplate = await db.generatedDocument.findUnique({
          where: { id: chantier.generatedDocumentId },
          select: {
            DocumentTemplate: {
              select: {
                DocumentSection: {
                  select: { type: true, config: true }
                }
              }
            }
          }
        });
        if (docTemplate?.DocumentTemplate?.DocumentSection) {
          const { interpretReference } = await import('../components/TreeBranchLeaf/treebranchleaf-new/api/operation-interpreter.js');

          // Helper: chercher totalTVACSource / totalHTVASource dans config ET dans modules imbriqués (MODULAR_PAGE)
          const findTotalSourceInConfig = (config: any): string | null => {
            if (config.totalTVACSource) return config.totalTVACSource;
            if (config.totalHTVASource) return config.totalHTVASource;
            if (Array.isArray(config.modules)) {
              for (const mod of config.modules) {
                const mc = mod.config || mod;
                if (mc.totalTVACSource) return mc.totalTVACSource;
                if (mc.totalHTVASource) return mc.totalHTVASource;
              }
            }
            return null;
          };

          for (const section of docTemplate.DocumentTemplate.DocumentSection) {
            const sConfig = (section.config || {}) as any;
            const totalSource = findTotalSourceInConfig(sConfig);
            if (totalSource) {
              const evalRef = totalSource.startsWith('node-formula:')
                ? totalSource.replace('node-formula:', 'formula:')
                : totalSource;
              const result = await interpretReference(evalRef, chantier.submissionId, db);
              if (result?.result !== null && result?.result !== undefined) {
                const cleaned = String(result.result).replace(/[\s\u00A0]/g, '').replace(',', '.');
                const val = parseFloat(cleaned);
                if (!isNaN(val) && val > 0) {
                  computedAmount = val;
                  // Mettre à jour le chantier en DB pour ne plus recalculer
                  await db.chantier.update({
                    where: { id: chantier.id },
                    data: { amount: val, updatedAt: new Date() }
                  });
                  console.log(`[Chantiers] ✅ Montant lazy-résolu pour ${chantier.id}: ${val}€`);
                  break;
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn('[Chantiers] ⚠️ Lazy-compute montant échoué:', (err as Error).message);
      }
    }

    res.json({
      success: true,
      data: {
        ...chantier,
        amount: chantier.amount || computedAmount
      }
    });
  } catch (error) {
    console.error('[Chantiers] Erreur GET /:id:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
});

/**
 * POST /api/chantiers
 * Crée un nouveau chantier (généralement déclenché par upload doc dans onglet "Gagné")
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const user = (req as any).user;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'ID d\'organisation requis'
      });
    }

    const validation = createChantierSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: validation.error.errors
      });
    }

    const data = validation.data;

    // Toujours placer les nouveaux chantiers dans la première colonne (order le plus bas)
    let statusId = data.statusId;
    if (!statusId) {
      const firstStatus = await db.chantierStatus.findFirst({
        where: { organizationId },
        orderBy: { order: 'asc' }
      });
      if (!firstStatus) {
        // Créer les statuts par défaut s'ils n'existent pas
        const { randomUUID } = await import('crypto');
        const created = await db.chantierStatus.create({
          data: {
            id: randomUUID(),
            organizationId,
            name: 'Nouveau',
            color: '#1677ff',
            order: 0,
            isDefault: true,
            updatedAt: new Date()
          }
        });
        statusId = created.id;
      } else {
        statusId = firstStatus.id;
      }
    }

    // Dériver le clientName depuis le lead si pas fourni
    let clientName = data.clientName;
    if (!clientName && data.leadId) {
      const lead = await db.lead.findUnique({
        where: { id: data.leadId },
        select: { firstName: true, lastName: true, company: true }
      });
      if (lead) {
        clientName = lead.company || [lead.firstName, lead.lastName].filter(Boolean).join(' ') || 'Client inconnu';
      }
    }

    const { randomUUID } = await import('crypto');
    const chantier = await db.chantier.create({
      data: {
        id: randomUUID(),
        organizationId,
        leadId: data.leadId || null,
        statusId,
        responsableId: data.responsableId || null,
        commercialId: data.commercialId || user?.id || null,
        productValue: data.productValue,
        productLabel: data.productLabel,
        productIcon: data.productIcon || null,
        productColor: data.productColor || null,
        customLabel: data.customLabel || null,
        clientName: clientName || null,
        siteAddress: data.siteAddress || null,
        notes: data.notes || null,
        amount: data.amount || null,
        signedAt: data.signedAt ? new Date(data.signedAt) : new Date(),
        documentUrl: data.documentUrl || null,
        documentName: data.documentName || null,
        uploadedById: user?.id || null,
        updatedAt: new Date()
      },
      include: {
        Lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
          }
        },
        ChantierStatus: true,
        Responsable: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
        Commercial: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: chantier,
      message: `Chantier "${data.productLabel}" créé avec succès`
    });
  } catch (error) {
    console.error('[Chantiers] Erreur POST /:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
});

/**
 * POST /api/chantiers/from-lead-document
 * Crée un chantier à partir d'un upload de document signé depuis l'onglet "Gagné" du lead
 * Inclut l'upload du fichier
 */
router.post('/from-lead-document', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;
    const user = (req as any).user;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'ID d\'organisation requis'
      });
    }

    const { leadId, productValue, productLabel, productIcon, productColor, customLabel, amount, generatedDocumentId, submissionId } = req.body;

    if (!productValue || !productLabel) {
      return res.status(400).json({
        success: false,
        message: 'productValue et productLabel sont requis'
      });
    }

    // Vérifier le lead
    let clientName = '';
    let commercialId = user?.id;
    let siteAddress: string | null = null;
    if (leadId) {
      const lead = await db.lead.findFirst({
        where: { id: leadId, organizationId },
        select: {
          firstName: true,
          lastName: true,
          company: true,
          assignedToId: true,
          data: true,
        }
      });
      if (lead) {
        clientName = lead.company || [lead.firstName, lead.lastName].filter(Boolean).join(' ') || '';
        commercialId = lead.assignedToId || user?.id;

        // Extraire l'adresse depuis lead.data
        const leadData = (lead.data as any) || {};
        const addressParts = [];
        const street = leadData.street || leadData.address || '';
        const number = leadData.number || '';
        const box = leadData.box || leadData.boite || '';
        const postalCode = leadData.postalCode || leadData.zipCode || leadData.zip || '';
        const city = leadData.city || leadData.ville || '';
        if (street) {
          let streetPart = street;
          if (number) streetPart += ' ' + number;
          if (box) streetPart += ' ' + box;
          addressParts.push(streetPart);
        }
        if (postalCode || city) {
          addressParts.push([postalCode, city].filter(Boolean).join(' '));
        }
        if (addressParts.length > 0) {
          siteAddress = addressParts.join(', ');
        }
      }
    }

    // Extraire le montant depuis le GeneratedDocument (dataSnapshot.quote.totalTTC)
    let autoAmount: number | null = null;
    if (generatedDocumentId) {
      try {
        const genDoc = await db.generatedDocument.findUnique({
          where: { id: generatedDocumentId },
          select: {
            dataSnapshot: true,
            paymentAmount: true,
            DocumentTemplate: {
              select: {
                DocumentSection: {
                  select: { type: true, config: true }
                }
              }
            }
          }
        });
        if (genDoc) {
          const snapshot = (genDoc.dataSnapshot as any) || {};
          const quote = snapshot.quote || {};
          // Priorité 1 : quote.totalTTC dans le dataSnapshot (si déjà stocké)
          const ttc = quote.totalTTC || snapshot.totalTTC || null;
          if (ttc && !isNaN(Number(ttc))) {
            autoAmount = Number(ttc);
          } else if (genDoc.paymentAmount) {
            autoAmount = Number(genDoc.paymentAmount);
          }

          // Priorité 2 : Résoudre les formules TBL depuis le template pricing sections/modules
          if (!autoAmount && submissionId && genDoc.DocumentTemplate?.DocumentSection) {
            try {
              const { interpretReference } = await import('../components/TreeBranchLeaf/treebranchleaf-new/api/operation-interpreter.js');
              
              // Helper: chercher totalTVACSource/totalHTVASource dans config ou dans ses modules imbriqués
              const findTotalSource = (config: any): string | null => {
                if (config.totalTVACSource) return config.totalTVACSource;
                if (config.totalHTVASource) return config.totalHTVASource;
                // Chercher dans les modules imbriqués (MODULAR_PAGE)
                if (Array.isArray(config.modules)) {
                  for (const mod of config.modules) {
                    const mc = mod.config || mod;
                    if (mc.totalTVACSource) return mc.totalTVACSource;
                    if (mc.totalHTVASource) return mc.totalHTVASource;
                  }
                }
                return null;
              };
              
              for (const section of genDoc.DocumentTemplate.DocumentSection) {
                const sConfig = (section.config || {}) as any;
                const totalSource = findTotalSource(sConfig);
                if (totalSource) {
                  const evalRef = totalSource.startsWith('node-formula:')
                    ? totalSource.replace('node-formula:', 'formula:')
                    : totalSource;
                  const result = await interpretReference(evalRef, submissionId, db);
                  if (result?.result !== null && result?.result !== undefined) {
                    const cleaned = String(result.result).replace(/[\s\u00A0]/g, '').replace(',', '.');
                    const val = parseFloat(cleaned);
                    if (!isNaN(val) && val > 0) {
                      autoAmount = val;
                      console.log(`[Chantiers] ✅ Montant résolu via formule TBL: ${val}€ (source: ${totalSource})`);
                      break;
                    }
                  }
                }
              }
            } catch (formulaErr) {
              console.warn('[Chantiers] ⚠️ Impossible de résoudre le montant via formules TBL:', (formulaErr as Error).message);
            }
          }

          // Si pas d'adresse, essayer depuis le snapshot lead
          if (!siteAddress && snapshot.lead) {
            const sl = snapshot.lead;
            const parts = [];
            const addr = sl.address || '';
            if (addr) {
              parts.push(addr);
            } else {
              const s = sl.street || '';
              const n = sl.number || '';
              if (s) parts.push(s + (n ? ' ' + n : ''));
              if (sl.postalCode || sl.city) parts.push([sl.postalCode, sl.city].filter(Boolean).join(' '));
            }
            if (parts.length > 0) siteAddress = parts.join(', ');
          }
        }
      } catch (err) {
        console.warn('[Chantiers] Impossible de lire le dataSnapshot du GeneratedDocument:', (err as Error).message);
      }
    }

    // Récupérer ou construire l'URL du document uploadé (via express-fileupload)
    let documentUrl: string | null = null;
    let documentName: string | null = null;
    const uploadedFile = (req as any).files?.document;
    if (uploadedFile) {
      const timestamp = Date.now();
      const safeName = uploadedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filename = `${timestamp}-${safeName}`;
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'chantiers');
      fs.mkdirSync(uploadDir, { recursive: true });
      const filePath = path.join(uploadDir, filename);
      await uploadedFile.mv(filePath);
      documentUrl = `/uploads/chantiers/${filename}`;
      documentName = uploadedFile.name;
    }

    // Toujours placer les nouveaux chantiers dans la première colonne (order le plus bas)
    let statusId: string | undefined;
    const firstStatus = await db.chantierStatus.findFirst({
      where: { organizationId },
      orderBy: { order: 'asc' }
    });
    if (firstStatus) {
      statusId = firstStatus.id;
    } else {
      // Auto-créer les statuts
      const { randomUUID: uuid } = await import('crypto');
      const created = await db.chantierStatus.create({
        data: {
          id: uuid(),
          organizationId,
          name: 'Nouveau',
          color: '#1677ff',
          order: 0,
          isDefault: true,
          updatedAt: new Date()
        }
      });
      statusId = created.id;
    }

    const { randomUUID } = await import('crypto');

    // Si un GeneratedDocument est lié, le marquer comme SIGNED
    if (generatedDocumentId) {
      await db.generatedDocument.update({
        where: { id: generatedDocumentId },
        data: {
          status: 'SIGNED',
          signedAt: new Date(),
          updatedAt: new Date()
        }
      }).catch(err => {
        console.warn('[Chantiers] Impossible de mettre à jour le GeneratedDocument:', err.message);
      });
    }

    const chantier = await db.chantier.create({
      data: {
        id: randomUUID(),
        organizationId,
        leadId: leadId || null,
        statusId,
        responsableId: null,
        commercialId: commercialId || null,
        generatedDocumentId: generatedDocumentId || null,
        submissionId: submissionId || null,
        productValue,
        productLabel,
        productIcon: productIcon || null,
        productColor: productColor || null,
        customLabel: customLabel || null,
        clientName: clientName || null,
        siteAddress: siteAddress || null,
        notes: null,
        amount: amount ? parseFloat(amount) : (autoAmount || null),
        signedAt: new Date(),
        documentUrl,
        documentName,
        uploadedById: user?.id || null,
        updatedAt: new Date()
      },
      include: {
        Lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
          }
        },
        ChantierStatus: true,
        GeneratedDocument: {
          select: {
            id: true,
            title: true,
            documentNumber: true,
            type: true,
            status: true,
            submissionId: true,
            pdfUrl: true,
          }
        },
      }
    });

    res.status(201).json({
      success: true,
      data: chantier,
      message: `🏗️ Chantier "${productLabel}" créé à partir du document signé`
    });
  } catch (error) {
    console.error('[Chantiers] Erreur POST /from-lead-document:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
});

/**
 * PUT /api/chantiers/:id
 * Met à jour un chantier
 */
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'ID d\'organisation requis'
      });
    }

    const existing = await db.chantier.findFirst({
      where: { id, organizationId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Chantier non trouvé'
      });
    }

    const validation = updateChantierSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: validation.error.errors
      });
    }

    const data = validation.data;
    // ⚠️ Le statusId ne passe PAS par le PUT général — il doit passer par PUT /:id/status
    // pour respecter les transitions workflow, l'historique et les notifications
    const { statusId: _ignoredStatusId, ...safeData } = data;
    const chantier = await db.chantier.update({
      where: { id },
      data: {
        ...(safeData.responsableId !== undefined && { responsableId: safeData.responsableId }),
        ...(safeData.commercialId !== undefined && { commercialId: safeData.commercialId }),
        ...(safeData.customLabel !== undefined && { customLabel: safeData.customLabel }),
        ...(safeData.clientName !== undefined && { clientName: safeData.clientName }),
        ...(safeData.siteAddress !== undefined && { siteAddress: safeData.siteAddress }),
        ...(safeData.notes !== undefined && { notes: safeData.notes }),
        ...(safeData.amount !== undefined && { amount: safeData.amount }),
        updatedAt: new Date()
      },
      include: {
        Lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
          }
        },
        ChantierStatus: true,
        Responsable: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
        Commercial: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    });

    res.json({
      success: true,
      data: chantier,
      message: 'Chantier mis à jour avec succès'
    });
  } catch (error) {
    console.error('[Chantiers] Erreur PUT /:id:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
});

/**
 * PUT /api/chantiers/:id/status
 * Change le statut d'un chantier (drag & drop Kanban)
 * Respecte les transitions configurées et les rôles autorisés
 */
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { statusId } = req.body;
    const organizationId = req.headers['x-organization-id'] as string;
    const user = (req as any).user;
    const userRole = user?.role || 'commercial';
    const isSuperAdmin = user?.isSuperAdmin === true;

    if (!organizationId || !statusId) {
      return res.status(400).json({
        success: false,
        message: 'organizationId et statusId requis'
      });
    }

    const existing = await db.chantier.findFirst({
      where: { id, organizationId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Chantier non trouvé'
      });
    }

    const oldStatusId = existing.statusId;

    // Vérifier les transitions configurées (sauf SuperAdmin qui bypass tout)
    if (!isSuperAdmin && oldStatusId) {
      const transitions = await db.chantierStatusTransition.findMany({
        where: {
          organizationId,
          fromStatusId: oldStatusId,
          toStatusId: statusId,
          isActive: true,
        }
      });

      // Si des transitions existent, vérifier les rôles autorisés
      if (transitions.length > 0) {
        const allowed = transitions.some(t => {
          const roles = t.allowedRoles as string[] | null;
          if (!roles || roles.length === 0) return true;
          return roles.includes(userRole);
        });

        if (!allowed) {
          return res.status(403).json({
            success: false,
            message: `Votre rôle "${userRole}" n'est pas autorisé pour cette transition`
          });
        }
      }
      // Si aucune transition configurée → autorise par défaut (backward compatible)
    }

    const chantier = await db.chantier.update({
      where: { id },
      data: {
        statusId,
        updatedAt: new Date()
      },
      include: {
        ChantierStatus: true,
      }
    });

    // Historique du changement de statut
    try {
      await db.chantierHistory.create({
        data: {
          id: crypto.randomUUID(),
          chantierId: id,
          action: 'DRAG_DROP',
          fromValue: oldStatusId || null,
          toValue: statusId,
          userId: user?.userId || user?.id,
          data: { method: 'kanban_drag_drop' },
        }
      });
    } catch (histErr) {
      console.error('[Chantiers] Erreur historique (non bloquant):', histErr);
    }

    // Envoyer les notifications configurées pour cette transition (réutilise la logique partagée avec emails)
    if (oldStatusId) {
      try {
        const transitions = await db.chantierStatusTransition.findMany({
          where: {
            organizationId,
            fromStatusId: oldStatusId,
            toStatusId: statusId,
            isActive: true,
          }
        });
        for (const t of transitions) {
          if (t.notifyRoles) {
            const roles = t.notifyRoles as string[];
            await sendTransitionNotifications(id, organizationId, oldStatusId, statusId, roles, t.sendEmail);
          }
        }
      } catch (notifErr) {
        console.error('[Chantiers] Erreur notifications (non bloquant):', notifErr);
      }
    }

    // ── Auto-création des factures depuis les templates pour ce nouveau statut ──
    try {
      const templates = await db.chantierInvoiceTemplate.findMany({
        where: { organizationId, statusId, isActive: true },
        orderBy: { order: 'asc' },
      });
      if (templates.length > 0) {
        // Récupérer le montant du chantier pour calculer les pourcentages
        const chantierFull = await db.chantier.findUnique({
          where: { id },
          select: { amount: true, GeneratedDocument: { select: { dataSnapshot: true, paymentAmount: true } } },
        });
        const chantierAmount = chantierFull?.amount
          || (chantierFull?.GeneratedDocument?.dataSnapshot as any)?.quote?.totalTTC
          || chantierFull?.GeneratedDocument?.paymentAmount
          || null;

        // Vérifier quelles factures de ce type existent déjà pour ce chantier
        const existingInvoices = await db.chantierInvoice.findMany({
          where: { chantierId: id },
          select: { type: true, label: true },
        });

        for (const tpl of templates) {
          // Ne pas re-créer si une facture de même type+label existe déjà
          const alreadyExists = existingInvoices.some(
            inv => inv.type === tpl.type && inv.label === tpl.label
          );
          if (alreadyExists) continue;

          const amount = tpl.percentage && chantierAmount
            ? Math.round((Number(chantierAmount) * tpl.percentage / 100) * 100) / 100
            : (tpl as any).fixedAmount || 0;

          await db.chantierInvoice.create({
            data: {
              id: crypto.randomUUID(),
              chantierId: id,
              organizationId,
              type: tpl.type,
              label: tpl.label,
              amount,
              percentage: tpl.percentage,
              status: 'DRAFT',
              order: tpl.order,
              updatedAt: new Date(),
            },
          });

          // Historique
          await db.chantierHistory.create({
            data: {
              id: crypto.randomUUID(),
              chantierId: id,
              action: 'INVOICE_CREATED',
              toValue: tpl.label,
              userId: user?.userId || user?.id,
              data: { autoCreated: true, templateId: tpl.id, type: tpl.type, amount },
            },
          });
        }
      }
    } catch (autoInvErr) {
      console.error('[Chantiers] Erreur auto-création factures (non bloquant):', autoInvErr);
    }

    res.json({
      success: true,
      data: chantier,
      message: `Statut changé vers "${chantier.ChantierStatus?.name}"`
    });
  } catch (error) {
    console.error('[Chantiers] Erreur PUT /:id/status:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
});

/**
 * DELETE /api/chantiers/:id
 * Supprime un chantier
 */
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.headers['x-organization-id'] as string;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'ID d\'organisation requis'
      });
    }

    const existing = await db.chantier.findFirst({
      where: { id, organizationId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Chantier non trouvé'
      });
    }

    // Supprimer le fichier associé s'il existe
    if (existing.documentUrl) {
      const filePath = path.join(process.cwd(), 'public', existing.documentUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await db.chantier.delete({ where: { id } });

    res.json({
      success: true,
      message: 'Chantier supprimé avec succès'
    });
  } catch (error) {
    console.error('[Chantiers] Erreur DELETE /:id:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
});

/**
 * GET /api/chantiers/stats/overview
 * Statistiques des chantiers pour le dashboard
 */
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const organizationId = req.headers['x-organization-id'] as string;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'ID d\'organisation requis'
      });
    }

    const [total, byStatus, byProduct, totalAmount] = await Promise.all([
      db.chantier.count({ where: { organizationId } }),
      db.chantier.groupBy({
        by: ['statusId'],
        where: { organizationId },
        _count: true,
      }),
      db.chantier.groupBy({
        by: ['productValue'],
        where: { organizationId },
        _count: true,
      }),
      db.chantier.aggregate({
        where: { organizationId },
        _sum: { amount: true },
      }),
    ]);

    // Enrichir byStatus avec les noms des statuts
    const statuses = await db.chantierStatus.findMany({
      where: { organizationId },
      orderBy: { order: 'asc' }
    });

    const byStatusEnriched = byStatus.map(s => {
      const status = statuses.find(st => st.id === s.statusId);
      return {
        statusId: s.statusId,
        statusName: status?.name || 'Sans statut',
        statusColor: status?.color || '#999',
        count: s._count,
      };
    });

    res.json({
      success: true,
      data: {
        total,
        totalAmount: totalAmount._sum.amount || 0,
        byStatus: byStatusEnriched,
        byProduct: byProduct.map(p => ({
          productValue: p.productValue,
          count: p._count,
        })),
      }
    });
  } catch (error) {
    console.error('[Chantiers] Erreur GET /stats/overview:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
});

export default router;
