import { Router } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth.js';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Appliquer l'authentification à toutes les routes
router.use(authMiddleware);

// GET /api/leads
router.get('/', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const organizationId = authReq.user?.organizationId;
    
    console.log('[LEADS] Récupération des leads pour l\'organisation:', organizationId);
    
    const leads = await prisma.lead.findMany({
      where: {
        organizationId: organizationId
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        leadStatus: true
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Transformer les données pour le frontend
    const formattedLeads = leads.map(lead => {
      // Utiliser d'abord les colonnes dédiées, puis fallback sur data JSON si nécessaire
      const data = lead.data || {};
      
      console.log(`[LEADS] Formatage lead ${lead.id}:`);
      console.log(`[LEADS] - firstName: "${lead.firstName}" (${typeof lead.firstName})`);
      console.log(`[LEADS] - lastName: "${lead.lastName}" (${typeof lead.lastName})`);
      console.log(`[LEADS] - data.name: "${data.name}"`);
      
      const formattedName = lead.firstName && lead.lastName ? `${lead.firstName} ${lead.lastName}` : 
            (lead.firstName || lead.lastName || data.name || `Lead ${lead.id.slice(0, 8)}`);
      
      console.log(`[LEADS] - Nom final: "${formattedName}"`);
      
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
        assignedTo: lead.assignedTo,
        leadStatus: lead.leadStatus,
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt,
        statusId: lead.statusId,
        organizationId: lead.organizationId,
        assignedToId: lead.assignedToId,
        // Données additionnelles pour la compatibilité
        data: lead.data
      };
    });

    console.log(`[LEADS] ${leads.length} leads trouvés`);
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
    
    // Créer le lead
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
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        leadStatus: true
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
      assignedTo: newLead.assignedTo,
      leadStatus: newLead.leadStatus,
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
    
    if (!organizationId) {
      return res.status(400).json({ 
        error: 'Organisation non spécifiée' 
      });
    }
    
    console.log('[LEADS] Récupération du lead:', id, 'pour organisation:', organizationId);
    
    const lead = await prisma.lead.findFirst({
      where: {
        id,
        organizationId // Sécurité: s'assurer que le lead appartient à l'organisation
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        leadStatus: true
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
      assignedTo: lead.assignedTo,
      leadStatus: lead.leadStatus,
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
    
    console.log('[LEADS] Lead trouvé et formaté:', formattedLead.name);
    res.json(formattedLead);
    
  } catch (error) {
    console.error('[LEADS] Erreur lors de la récupération du lead:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération du lead',
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
    
    console.log('[LEADS] Modification du lead:', id, 'données:', req.body);
    
    // Vérifier que le lead existe et appartient à l'organisation
    const existingLead = await prisma.lead.findFirst({
      where: {
        id,
        organizationId
      }
    });
    
    if (!existingLead) {
      console.log('[LEADS] Lead non trouvé pour modification:', id);
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
    
    // Mettre à jour le lead
    const updatedLead = await prisma.lead.update({
      where: { id },
      data: updateData,
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        leadStatus: true
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
      assignedTo: updatedLead.assignedTo,
      leadStatus: updatedLead.leadStatus,
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
router.delete('/:id', (req, res) => {
  console.log('[ROUTE] DELETE /api/leads/:id atteint', req.params.id);
  // Logique de placeholder
  res.status(204).send();
});

export default router;
