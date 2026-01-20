import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth.js';
import { prisma } from '../lib/prisma';
import { generateFormResponsePdf } from '../services/formResponsePdfGenerator';

const router = Router();

// Appliquer l'authentification à toutes les routes
router.use(authMiddleware);

// GET /api/leads
router.get('/', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    
    // SuperAdmin logic: can see ALL leads
    const isSuperAdmin = authReq.user?.role === 'super_admin' || 
                        authReq.user?.isSuperAdmin === true ||
                        authReq.user?.role?.toLowerCase().includes('super');
    
    if (isSuperAdmin) {
      try {
        const allLeads = await prisma.lead.findMany({
          include: {
            User: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              }
            },
            LeadStatus: true,
            Organization: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            updatedAt: 'desc'
          }
        });
        
        // Formatter les leads pour SuperAdmin (même logique que les utilisateurs normaux)
        const formattedLeads = allLeads.map(lead => {
          const data = lead.data || {};
          
          const formattedName = lead.firstName && lead.lastName ? `${lead.firstName} ${lead.lastName}` : 
                (lead.firstName || lead.lastName || data.name || `Lead ${lead.id.slice(0, 8)}`);
          
          return {
            id: lead.id,
            name: formattedName,
            firstName: lead.firstName || data.firstName || '',
            lastName: lead.lastName || data.lastName || '',
            email: lead.email || data.email || '',
            phone: lead.phone || data.phone || '',
            company: lead.company || data.company || '',
            status: lead.status,
            source: lead.source || 'unknown',
            assignedTo: lead.User,
            leadStatus: lead.LeadStatus,
            createdAt: lead.createdAt,
            updatedAt: lead.updatedAt,
            statusId: lead.statusId,
            organizationId: lead.organizationId,
            assignedToId: lead.assignedToId,
            // Données additionnelles pour la compatibilité
            data: lead.data,
            // Information organisation pour SuperAdmin
            organization: lead.Organization
          };
        });
        
        res.json({ success: true, data: formattedLeads });
        return;
      } catch (error) {
        console.error('[LEADS] Erreur lors de la récupération des leads pour SuperAdmin:', error);
        res.status(500).json({ 
          success: false,
          error: 'Erreur lors de la récupération des leads pour SuperAdmin',
          message: error instanceof Error ? error.message : 'Erreur inconnue'
        });
        return;
      }
    }
    
    // Normal user: filter by organization
    const organizationId = authReq.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ 
        error: 'Organisation non spécifiée pour utilisateur non-SuperAdmin' 
      });
    }
    
    console.log('[LEADS] 👤 Utilisateur normal - Récupération des leads pour l\'organisation:', organizationId);
    
    const leads = await prisma.lead.findMany({
      where: {
        organizationId: organizationId
      },
      include: {
        User: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        LeadStatus: true
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Transformer les données pour le frontend
    const formattedLeads = leads.map(lead => {
      // Utiliser d'abord les colonnes dédiées, puis fallback sur data JSON si nécessaire
      const data = lead.data || {};
      
      const formattedName = lead.firstName && lead.lastName ? `${lead.firstName} ${lead.lastName}` : 
            (lead.firstName || lead.lastName || data.name || `Lead ${lead.id.slice(0, 8)}`);
      
      return {
        id: lead.id,
        name: formattedName,
        firstName: lead.firstName || data.firstName || '',
        lastName: lead.lastName || data.lastName || '',
        email: lead.email || data.email || '',
        phone: lead.phone || data.phone || '',
        company: lead.company || data.company || '',
        status: lead.status,
        source: lead.source || 'unknown',
        assignedTo: lead.User,
        leadStatus: lead.LeadStatus,
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt,
        statusId: lead.statusId,
        organizationId: lead.organizationId,
        assignedToId: lead.assignedToId,
        // Données additionnelles pour la compatibilité
        data: lead.data
      };
    });

    res.json({ success: true, data: formattedLeads });

  } catch (error) {
    console.error('[LEADS] Erreur lors de la récupération des leads:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de la récupération des leads',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// POST /api/leads
router.post('/', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ 
        error: 'Organisation non spécifiée' 
      });
    }
    
    console.log('[LEADS] POST - Création d\'un nouveau lead');
    console.log('[LEADS] Données reçues:', req.body);
    console.log('[LEADS] Organisation:', organizationId);
    
    const { 
      firstName, 
      lastName, 
      email, 
      phone, 
      company, 
      source, 
      status = 'new',
      statusId,
      notes,
      website,
      linkedin,
      data 
    } = req.body;
    
    // Validation des champs requis
    if (!firstName || !lastName || !email || !company) {
      return res.status(400).json({ 
        error: 'Les champs prénom, nom, email et société sont requis' 
      });
    }
    
    // Vérifier si le statut existe
    let finalStatusId = statusId;
    if (statusId) {
      const statusExists = await prisma.leadStatus.findUnique({
        where: { id: statusId }
      });
      if (!statusExists) {
        console.log('[LEADS] Statut non trouvé, utilisation du statut par défaut');
        finalStatusId = null;
      }
    }
    
    // Si pas de statusId, utiliser le statut par défaut de l'organisation
    if (!finalStatusId) {
      const defaultStatus = await prisma.leadStatus.findFirst({
        where: {
          organizationId,
          isDefault: true
        }
      });
      if (defaultStatus) {
        finalStatusId = defaultStatus.id;
        console.log('[LEADS] Statut par défaut assigné:', defaultStatus.name);
      }
    }
    
    // Créer le lead (timestamps explicites car updatedAt n'a pas de défaut dans le schéma)
    const now = new Date();
    const newLead = await prisma.lead.create({
      data: {
        firstName,
        lastName,
        email,
        phone: phone || null,
        company,
        source: source || 'manual',
        status,
        statusId: finalStatusId,
        notes: notes || null,
        website: website || null,
        linkedin: linkedin || null,
        createdAt: now,
        updatedAt: now,
        organizationId,
        assignedToId: authReq.user?.userId || null,
        // Données JSON pour compatibilité
        data: data || {
          name: `${firstName} ${lastName}`,
          email,
          phone: phone || '',
          company,
          notes: notes || '',
          website: website || '',
          linkedin: linkedin || '',
          source: source || 'manual'
        }
      },
      include: {
        User: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        LeadStatus: true
      }
    });
    
    console.log('[LEADS] Lead créé avec succès:', newLead.id);
    
    // Formatter la réponse comme pour GET
    const formattedLead = {
      id: newLead.id,
      name: `${newLead.firstName} ${newLead.lastName}`,
      firstName: newLead.firstName,
      lastName: newLead.lastName,
      email: newLead.email,
      phone: newLead.phone,
      company: newLead.company,
      status: newLead.status,
      source: newLead.source,
      assignedTo: newLead.User,
      leadStatus: newLead.LeadStatus,
      createdAt: newLead.createdAt,
      updatedAt: newLead.updatedAt,
      statusId: newLead.statusId,
      organizationId: newLead.organizationId,
      assignedToId: newLead.assignedToId,
      data: newLead.data
    };
    
    res.status(201).json(formattedLead);
    
  } catch (error) {
    console.error('[LEADS] Erreur lors de la création du lead:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la création du lead',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// GET /api/leads/:id
router.get('/:id', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const organizationId = authReq.user?.organizationId;
    
    // SuperAdmin logic: can access ANY lead
    const isSuperAdmin = authReq.user?.role === 'super_admin' || 
                        authReq.user?.isSuperAdmin === true ||
                        authReq.user?.role?.toLowerCase().includes('super');
    
    let whereCondition;
    
    if (isSuperAdmin) {
      whereCondition = { id }; // SuperAdmin peut accéder à n'importe quel lead
    } else {
      if (!organizationId) {
        return res.status(400).json({ 
          error: 'Organisation non spécifiée' 
        });
      }
      whereCondition = {
        id,
        organizationId // Sécurité: s'assurer que le lead appartient à l'organisation
      };
    }
    
    const lead = await prisma.lead.findFirst({
      where: whereCondition,
      include: {
        User: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        LeadStatus: true,
        Organization: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    if (!lead) {
      console.log('[LEADS] Lead non trouvé:', id);
      return res.status(404).json({ 
        error: 'Lead non trouvé ou non autorisé' 
      });
    }
    
    // Transformer pour le frontend (même logique que la liste)
    const data = lead.data || {};
    const formattedLead = {
      id: lead.id,
      name: lead.firstName && lead.lastName ? `${lead.firstName} ${lead.lastName}` : 
            (lead.firstName || lead.lastName || data.name || `Lead ${lead.id.slice(0, 8)}`),
      firstName: lead.firstName || data.firstName || '',
      lastName: lead.lastName || data.lastName || '',
      email: lead.email || data.email || '',
      phone: lead.phone || data.phone || '',
      company: lead.company || data.company || '',
      status: lead.status,
      source: lead.source || 'unknown',
      assignedTo: lead.User,
      leadStatus: lead.LeadStatus,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
      statusId: lead.statusId,
      organizationId: lead.organizationId,
      assignedToId: lead.assignedToId,
      notes: lead.notes || data.notes || '',
      website: lead.website || data.website || '',
      linkedin: lead.linkedin || data.linkedin || '',
      lastContactDate: lead.lastContactDate,
      nextFollowUpDate: lead.nextFollowUpDate,
      // Données additionnelles pour la compatibilité
      data: lead.data
    };
    
    res.json(formattedLead);
    
  } catch (error) {
    console.error('[LEADS] Erreur lors de la récupération du lead:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération du lead',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// POST /api/leads/:id/form-pdf/regenerate - Régénérer le PDF du formulaire pour un lead
router.post('/:id/form-pdf/regenerate', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const organizationId = authReq.user?.organizationId;

    const isSuperAdmin = authReq.user?.role === 'super_admin' ||
      authReq.user?.isSuperAdmin === true ||
      authReq.user?.role?.toLowerCase().includes('super');

    let whereCondition;
    if (isSuperAdmin) {
      whereCondition = { id };
    } else {
      if (!organizationId) {
        return res.status(400).json({ error: 'Organisation non spécifiée' });
      }
      whereCondition = { id, organizationId };
    }

    const lead = await prisma.lead.findFirst({ where: whereCondition });
    if (!lead) {
      return res.status(404).json({ error: 'Lead non trouvé ou non autorisé' });
    }

    const latestSubmission = await prisma.website_form_submissions.findFirst({
      where: { leadId: lead.id },
      orderBy: { createdAt: 'desc' },
      include: {
        form: {
          include: {
            questions: {
              orderBy: { order: 'asc' }
            }
          }
        }
      }
    });

    if (!latestSubmission || !latestSubmission.form) {
      return res.status(404).json({ error: 'Aucune soumission de formulaire trouvée pour ce lead' });
    }

    const form = latestSubmission.form;
    const pdfData = {
      formName: form.name,
      formSlug: form.slug,
      submittedAt: latestSubmission.createdAt,
      contact: {
        firstName: lead.firstName || undefined,
        lastName: lead.lastName || undefined,
        email: lead.email || undefined,
        phone: lead.phone || undefined,
        civility: (lead.data as any)?.civility
      },
      answers: (latestSubmission.formData as Record<string, unknown>) || {},
      questions: (form.questions || []).map((q) => ({
        questionKey: q.questionKey,
        title: q.title,
        subtitle: q.subtitle || undefined,
        icon: q.icon || undefined,
        questionType: q.questionType,
        options: q.options || undefined
      })),
      leadNumber: lead.leadNumber || undefined
    };

    const pdfBuffer = await generateFormResponsePdf(pdfData);

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'form-responses');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const pdfFileName = `formulaire-${form.slug}-${lead.id.substring(0, 8)}-${Date.now()}.pdf`;
    const pdfPath = path.join(uploadsDir, pdfFileName);
    fs.writeFileSync(pdfPath, pdfBuffer);

    const pdfUrl = `/uploads/form-responses/${pdfFileName}`;

    const existingData = (typeof lead.data === 'object' && lead.data) ? (lead.data as Record<string, unknown>) : {};
    const updatedLead = await prisma.lead.update({
      where: { id: lead.id },
      data: {
        data: {
          ...existingData,
          formPdfUrl: pdfUrl,
          formSlug: form.slug,
          formName: form.name
        }
      }
    });

    return res.json({
      success: true,
      pdfUrl,
      formName: form.name,
      formSlug: form.slug,
      leadId: updatedLead.id
    });
  } catch (error) {
    console.error('[LEADS] Erreur régénération PDF formulaire:', error);
    return res.status(500).json({
      error: 'Erreur lors de la régénération du PDF',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// PUT /api/leads/:id - Modifier un lead
router.put('/:id', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const organizationId = authReq.user?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ 
        error: 'Organisation non spécifiée' 
      });
    }
    
    // Vérifier que le lead existe et appartient à l'organisation
    const existingLead = await prisma.lead.findFirst({
      where: {
        id,
        organizationId
      }
    });
    
    if (!existingLead) {
      return res.status(404).json({ 
        error: 'Lead non trouvé ou non autorisé' 
      });
    }
    
    // Extraire les champs à mettre à jour
    const {
      firstName,
      lastName,
      email,
      phone,
      company,
      source,
      status,
      statusId,
      notes,
      website,
      linkedin,
      assignedToId,
      nextFollowUpDate,
      data
    } = req.body;
    
    // Préparer les données de mise à jour
    const updateData: Partial<{
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      company: string;
      source: string;
      status: string;
      statusId: string;
      notes: string;
      website: string;
      linkedin: string;
      assignedToId: string;
      nextFollowUpDate: Date | null;
      data: object | null;
    }> = {};
    
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (company !== undefined) updateData.company = company;
    if (source !== undefined) updateData.source = source;
    
    // Validation et normalisation du statut
    if (status !== undefined) {
      const validStatuses = ['new', 'contacted', 'meeting', 'proposal', 'won', 'lost'];
      
      // Mapping des anciens statuts vers les nouveaux
      const statusMapping: Record<string, string> = {
        'nouveau': 'new',
        'en_cours': 'contacted',
        'contacte': 'contacted',
        'contacté': 'contacted',
        'rdv': 'meeting',
        'rendez_vous': 'meeting',
        'devis': 'proposal',
        'gagne': 'won',
        'gagné': 'won',
        'perdu': 'lost',
        'termine': 'won',
        'terminé': 'won'
      };
      
      const normalizedStatus = statusMapping[status.toLowerCase()] || status;
      
      if (!validStatuses.includes(normalizedStatus)) {
        console.warn('[LEADS] Statut invalide:', status, '- utilisation de "new" par défaut');
        updateData.status = 'new';
      } else {
        updateData.status = normalizedStatus;
      }
    }
    
    if (statusId !== undefined) updateData.statusId = statusId;
    if (notes !== undefined) updateData.notes = notes;
    if (website !== undefined) updateData.website = website;
    if (linkedin !== undefined) updateData.linkedin = linkedin;
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId;
    if (nextFollowUpDate !== undefined) updateData.nextFollowUpDate = nextFollowUpDate ? new Date(nextFollowUpDate) : null;
    if (data !== undefined) updateData.data = data;
    
    // Mettre à jour le lead (forcer updatedAt)
    const updatedLead = await prisma.lead.update({
      where: { id },
      data: { 
        ...updateData,
        updatedAt: new Date()
      },
      include: {
        User: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        LeadStatus: true
      }
    });
    
    console.log('[LEADS] Lead modifié avec succès:', updatedLead.id);
    
    // Formatter la réponse
    const formattedLead = {
      id: updatedLead.id,
      name: updatedLead.firstName && updatedLead.lastName ? `${updatedLead.firstName} ${updatedLead.lastName}` : 
            (updatedLead.firstName || updatedLead.lastName || updatedLead.data?.name || `Lead ${updatedLead.id.slice(0, 8)}`),
      firstName: updatedLead.firstName || '',
      lastName: updatedLead.lastName || '',
      email: updatedLead.email || '',
      phone: updatedLead.phone || '',
      company: updatedLead.company || '',
      status: updatedLead.status,
      source: updatedLead.source || 'unknown',
      assignedTo: updatedLead.User,
      leadStatus: updatedLead.LeadStatus,
      createdAt: updatedLead.createdAt,
      updatedAt: updatedLead.updatedAt,
      statusId: updatedLead.statusId,
      organizationId: updatedLead.organizationId,
      assignedToId: updatedLead.assignedToId,
      notes: updatedLead.notes || '',
      website: updatedLead.website || '',
      linkedin: updatedLead.linkedin || '',
      nextFollowUpDate: updatedLead.nextFollowUpDate,
      data: updatedLead.data
    };
    
    res.json(formattedLead);
    
  } catch (error) {
    console.error('[LEADS] Erreur lors de la modification du lead:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la modification du lead',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// DELETE /api/leads/:id
router.delete('/:id', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;

    console.log('[LEADS] 🗑️ Demande de suppression du lead:', id, 'par utilisateur:', {
      id: authReq.user?.userId || authReq.user?.id,
      email: authReq.user?.email,
      role: authReq.user?.role,
      isSuperAdmin: authReq.user?.isSuperAdmin,
      organizationId: authReq.user?.organizationId
    });

    // Détection SuperAdmin (même logique que GET/PUT)
    const isSuperAdmin = authReq.user?.role === 'super_admin' ||
                         authReq.user?.isSuperAdmin === true ||
                         authReq.user?.role?.toLowerCase().includes('super');

    // Pour les utilisateurs non-superadmin, on exige l'organisation et on vérifie l'appartenance
  const whereCondition: { id: string; organizationId?: string } = { id };
    if (!isSuperAdmin) {
      const organizationId = authReq.user?.organizationId;
      if (!organizationId) {
        return res.status(400).json({ error: 'Organisation non spécifiée' });
      }
      whereCondition.organizationId = organizationId;
    }

    // Vérifier l'existence et l'autorisation
    const existing = await prisma.lead.findFirst({ where: whereCondition });
    if (!existing) {
      console.log('[LEADS] ❌ Lead non trouvé ou non autorisé pour suppression:', id);
      return res.status(404).json({ error: 'Lead non trouvé ou non autorisé' });
    }

    // Supprimer le lead
    await prisma.lead.delete({ where: { id } });
    console.log('[LEADS] ✅ Lead supprimé avec succès:', id);
    // 204 No Content pour simplifier la gestion côté client (converti en {success:true})
    return res.status(204).send();
  } catch (error) {
    console.error('[LEADS] Erreur lors de la suppression du lead:', error);
    // Conflits potentiels liés aux contraintes d’intégrité (FK)
    return res.status(500).json({
      error: 'Erreur lors de la suppression du lead',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// Historique du lead (GET): lecture depuis lead.data.history
router.get('/:id/history', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;

    const isSuperAdmin = authReq.user?.role === 'super_admin' || 
      authReq.user?.isSuperAdmin === true ||
      authReq.user?.role?.toLowerCase().includes('super');

    const whereCond = isSuperAdmin
      ? { id }
      : { id, organizationId: authReq.user?.organizationId };

    const lead = await prisma.lead.findFirst({ where: whereCond });
    if (!lead) return res.status(404).json({ success: false, error: 'Lead non trouvé ou non autorisé' });

    type HistoryItem = { type: string; content: string; author: string; createdAt: string };
    type LeadDataShape = { history?: HistoryItem[] } & Record<string, unknown>;
    const dataObj: LeadDataShape = (lead.data as object | null) as LeadDataShape || {};
    const history: HistoryItem[] = Array.isArray(dataObj.history) ? dataObj.history : [];
    return res.json({ success: true, data: history });
  } catch (e) {
    console.error('[LEADS] GET history error', e);
    return res.status(500).json({ success: false, error: 'Erreur lors du chargement de l\'historique' });
  }
});

// Ajout d'une entrée d'historique (POST): append dans lead.data.history
router.post('/:id/history', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const organizationId = authReq.user?.organizationId;

    const isSuperAdmin = authReq.user?.role === 'super_admin' || 
      authReq.user?.isSuperAdmin === true ||
      authReq.user?.role?.toLowerCase().includes('super');

    const whereCond = isSuperAdmin
      ? { id }
      : { id, organizationId };

    const lead = await prisma.lead.findFirst({ where: whereCond });
    if (!lead) return res.status(404).json({ success: false, error: 'Lead non trouvé ou non autorisé' });

    const { type = 'internal', content = '', author } = (req.body || {}) as Partial<{ type: string; content: string; author: string }>;
    const historyItem = {
      type,
      content,
      author: author || (authReq.user?.email ?? 'system'),
      createdAt: new Date().toISOString(),
    };

    type HistoryItem = typeof historyItem;
    type LeadDataShape = { history?: HistoryItem[] } & Record<string, unknown>;
    const dataObj: LeadDataShape = (lead.data as object | null) as LeadDataShape || {};
    const existing: HistoryItem[] = Array.isArray(dataObj.history) ? dataObj.history : [];
    dataObj.history = [historyItem, ...existing];

    await prisma.lead.update({ where: { id: lead.id }, data: { data: dataObj } });
    return res.status(201).json({ success: true, item: historyItem });
  } catch (e) {
    console.error('[LEADS] POST history error', e);
    return res.status(500).json({ success: false, error: 'Erreur lors de l\'ajout à l\'historique' });
  }
});

// Documents du lead (GET): lecture depuis lead.data.documents
router.get('/:id/documents', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;

    const isSuperAdmin = authReq.user?.role === 'super_admin' || 
      authReq.user?.isSuperAdmin === true ||
      authReq.user?.role?.toLowerCase().includes('super');

    const whereCond = isSuperAdmin
      ? { id }
      : { id, organizationId: authReq.user?.organizationId };

    const lead = await prisma.lead.findFirst({ where: whereCond });
    if (!lead) return res.status(404).json({ success: false, error: 'Lead non trouvé ou non autorisé' });

    type LeadDoc = { id: string; name: string; type?: string; url?: string | null; createdAt?: string; meta?: unknown };
    type LeadDataShape = { documents?: LeadDoc[] } & Record<string, unknown>;
    const dataObj: LeadDataShape = (lead.data as object | null) as LeadDataShape || {};
    const docs: LeadDoc[] = Array.isArray(dataObj.documents) ? dataObj.documents : [];
    return res.json({ success: true, data: docs });
  } catch (e) {
    console.error('[LEADS] GET documents error', e);
    return res.status(500).json({ success: false, error: 'Erreur lors du chargement des documents' });
  }
});

// Ajout d'un document lié (POST): append dans lead.data.documents
router.post('/:id/documents', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const organizationId = authReq.user?.organizationId;

    const isSuperAdmin = authReq.user?.role === 'super_admin' || 
      authReq.user?.isSuperAdmin === true ||
      authReq.user?.role?.toLowerCase().includes('super');

    const whereCond = isSuperAdmin
      ? { id }
      : { id, organizationId };

    const lead = await prisma.lead.findFirst({ where: whereCond });
    if (!lead) return res.status(404).json({ success: false, error: 'Lead non trouvé ou non autorisé' });

  const body = (req.body || {}) as Partial<{ id: string; name: string; type: string; url: string; meta: unknown }>;
    // Normaliser l'élément document minimal
    const newDoc = {
      id: body.id || cryptoRandomId(),
      name: body.name || 'Document',
      type: body.type || 'devis',
      url: body.url || null,
      createdAt: new Date().toISOString(),
      meta: body.meta || {}
    };

  type LeadDoc = { id: string; name: string; type?: string; url?: string | null; createdAt?: string; meta?: unknown };
  type LeadDataShape = { documents?: LeadDoc[] } & Record<string, unknown>;
  const dataObj: LeadDataShape = (lead.data as object | null) as LeadDataShape || {};
  const existingDocs: LeadDoc[] = Array.isArray(dataObj.documents) ? dataObj.documents : [];
    const updatedDocs = [newDoc, ...existingDocs];
    dataObj.documents = updatedDocs;

    await prisma.lead.update({ where: { id: lead.id }, data: { data: dataObj } });
    return res.status(201).json({ success: true, item: newDoc });
  } catch (e) {
    console.error('[LEADS] POST documents error', e);
    return res.status(500).json({ success: false, error: 'Erreur lors de l\'ajout du document' });
  }
});

export default router;
