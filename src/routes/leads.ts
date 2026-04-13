import { Router, Request, Response } from "express";
import { authMiddleware, AuthenticatedRequest } from "../middlewares/auth";
import { impersonationMiddleware } from "../middlewares/impersonation";
import { prisma } from '../lib/prisma';
import { createBusinessAutoPost } from '../services/business-auto-post';
import { logger } from '../lib/logger';

const router = Router();

router.use(authMiddleware, impersonationMiddleware);

// Route de débogage pour lister toutes les organisations
router.get('/debug-orgs', async (_req: Request, res: Response): Promise<void> => {
    try {
        const organizations = await prisma.organization.findMany();
        res.json({ success: true, message: 'Liste des organisations pour débogage',
            count: organizations.length,
            organizations: organizations.map(o => ({ id: o.id, name: o.name }))
        });
    } catch (error) {
        logger.error('[DEBUG] Erreur lors de la liste des organisations:', error);
        res.status(500).json({ success: false, message: 'Impossible de lister les organisations' });
    }
});

// GET /api/leads - Récupérer tous les leads de l'organisation
router.get('/', async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
        res.status(401).json({ success: false, message: 'Authentification requise.' });
        return;
    }
    
    // 🐛 Debug logs pour comprendre le problème SuperAdmin
    logger.info('[LEADS] 🔍 Utilisateur connecté:', {
        id: authReq.user.id,
        email: authReq.user.email,
        role: authReq.user.role,
        isSuperAdmin: authReq.user.isSuperAdmin,
        organizationId: authReq.user.organizationId
    });
    
    // SuperAdmin logic: can see ALL leads - amélioration des conditions
    const isSuperAdmin = authReq.user.role === 'super_admin' || 
                        authReq.user.isSuperAdmin === true ||
                        authReq.user.role?.toLowerCase().includes('super');
    
    logger.info('[LEADS] 👑 Vérification SuperAdmin:', { 
        isSuperAdmin, 
        conditions: {
            roleCheck: authReq.user.role === 'super_admin',
            booleanCheck: authReq.user.isSuperAdmin === true,
            roleIncludesSuper: authReq.user.role?.toLowerCase().includes('super')
        }
    });
    
    if (isSuperAdmin) {
        logger.info('[LEADS] 🌍 SuperAdmin détecté - récupération de TOUS les leads');
        try {
                                    // Filtres optionnels
                                    const { from, to, source, status, statusId, assignedTo, origin } = req.query as Record<string, string | undefined>;
            const dateFilter = from || to ? {
              gte: from ? new Date(from) : undefined,
              lte: to ? new Date(to) : undefined
            } : undefined;
                                    // Filtre d'origine des leads (D1M vs CRM)
                                    const originWhere = origin === 'd1m'
                                        ? {
                                                OR: [
                                                    { NOT: { sourceId: null } }, // depuis une campagne (LeadSource)
                                                    { source: { in: ['public-form', 'd1m', 'devis1minute', 'landing'] } }
                                                ]
                                            }
                                        : undefined;

            const allLeads = await prisma.lead.findMany({
                where: {
                    createdAt: dateFilter,
                    source: source ? String(source) : undefined,
                    status: status ? String(status) : undefined,
                                        statusId: statusId ? String(statusId) : undefined,
                    assignedToId: assignedTo ? String(assignedTo) : undefined,
                                                    ...(originWhere || {})
                    // Note: recherche plein-texte basique sur champs fréquents dans data
                    // Prisma JSON filter: contains recherche exacte; pour un LIKE, prévoir une colonne indexée à part si besoin.
                },
                include: {
                    assignedTo: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        }
                    },
                    leadStatus: true,
                    organization: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });
            
            logger.info('[LEADS] 📊 Total leads récupérés pour SuperAdmin:', allLeads.length);
            logger.info('[LEADS] 📋 Leads par organisation:', allLeads.reduce((acc, lead) => {
                const orgName = lead.organization?.name || 'Sans organisation';
                acc[orgName] = (acc[orgName] || 0) + 1;
                return acc;
            }, {} as Record<string, number>));
            
            res.json({ success: true, data: allLeads });
            return;
        } catch (error) {
            logger.error('[LEADS] Erreur lors de la récupération des leads pour SuperAdmin:', error);
            res.status(500).json({ success: false, message: 'Impossible de récupérer les leads.' });
            return;
        }
    }

    // Normal user: filter by organization
    if (!authReq.user.organizationId) {
        res.status(401).json({ success: false, message: 'Organization ID requis pour les utilisateurs non-SuperAdmin.' });
        return;
    }
    const { organizationId } = authReq.user;
    
    logger.info('[LEADS] 👤 Utilisateur normal - filtrage par organisation:', organizationId);

    try {
                        const { from, to, source, status, statusId, assignedTo, origin, q } = req.query as Record<string, string | undefined>;
        const dateFilter = from || to ? {
          gte: from ? new Date(from) : undefined,
          lte: to ? new Date(to) : undefined
        } : undefined;
                        const originWhere = origin === 'd1m'
                            ? {
                                    OR: [
                                        { NOT: { sourceId: null } },
                                        { source: { in: ['public-form', 'd1m', 'devis1minute', 'landing'] } }
                                    ]
                                }
                            : undefined;

        const leads = await prisma.lead.findMany({
            where: {
                organizationId,
                createdAt: dateFilter,
                source: source ? String(source) : undefined,
                status: status ? String(status) : undefined,
                                statusId: statusId ? String(statusId) : undefined,
                assignedToId: assignedTo ? String(assignedTo) : undefined,
                                        ...(originWhere || {})
            },
            include: {
                assignedTo: { // Inclure les informations de l'utilisateur assigné
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    }
                },
                leadStatus: true // Inclure les informations du statut
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        // Filtre texte basique côté serveur (fallback):
        const textFilter = q ? q.toLowerCase() : undefined;
        const filteredLeads = textFilter ? leads.filter((l) => {
            const d = (l.data || {}) as Record<string, unknown>;
            const hay = [l.source, l.status, l.leadStatus?.name, d.firstName, d.lastName, d.email, d.phone, d.name]
              .filter(Boolean)
              .join(' ')
              .toLowerCase();
            return hay.includes(textFilter);
        }) : leads;

        logger.info('[LEADS] 📊 Total leads pour organisation:', filteredLeads.length);
        logger.info('[LEADS] 📋 IDs des leads:', leads.map(l => l.id.slice(0,8)));
        
        res.json({ success: true, data: filteredLeads });
    } catch (error) {
        logger.error('Erreur lors de la récupération des leads:', error);
        res.status(500).json({ success: false, message: 'Impossible de récupérer les leads.' });
    }
});

// POST /api/leads - Créer un nouveau lead
router.post('/', async (req: Request, res: Response): Promise<void> => {
    logger.info('[TS-LEADS] POST /api/leads - Requête reçue:', req.body);
    logger.info('[TS-LEADS] Headers:', req.headers);
    
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user || !authReq.user.organizationId) {
        logger.info('[TS-LEADS] Erreur: Utilisateur non authentifié ou sans organisation');
        res.status(401).json({ success: false, message: 'Authentification requise.' });
        return;
    }
    
    logger.info('[TS-LEADS] Utilisateur authentifié:', { 
        userId: authReq.user.userId,
        role: authReq.user.role,
        orgId: authReq.user.organizationId
    });
    
    const organizationId = authReq.user.organizationId;
    const { status, data, assignedToId, source } = req.body;

    logger.info('[TS-LEADS] Données extraites:', { status, data, source, assignedToId, organizationId });

    if (!status) {
        logger.info('[TS-LEADS] Erreur: Status manquant');
        res.status(400).json({ success: false, message: 'Le statut est requis.' });
        return;
    }
    
    // Vérifier que l'organisation existe
    try {
        logger.info('[TS-LEADS] Vérification de l\'existence de l\'organisation:', organizationId);
        
        // Vérification de la validité de l'organizationId
        if (!organizationId || typeof organizationId !== 'string' || organizationId.trim() === '') {
            logger.info('[TS-LEADS] ID d\'organisation invalide ou manquant');
            res.status(400).json({ success: false, message: 'ID d\'organisation invalide ou manquant.' });
            return;
        }
        
        // Recherche de l'organisation spécifiée
        const organization = await prisma.organization.findUnique({
            where: { id: organizationId }
        });
        
        if (!organization) {
            logger.info('[TS-LEADS] Organisation non trouvée:', organizationId);
            res.status(400).json({ success: false, message: 'Organisation non trouvée.' });
            return;
        }
        
        logger.info('[TS-LEADS] Organisation trouvée:', organization.name);
        
        // Vérifier l'assignedToId s'il est fourni
        let finalAssignedToId = assignedToId;
        if (assignedToId) {
            const user = await prisma.user.findUnique({
                where: { id: assignedToId }
            });
            if (!user) {
                logger.info('[TS-LEADS] Utilisateur assigné non trouvé:', assignedToId);
                finalAssignedToId = null; // Ignorer l'assignation si l'utilisateur n'existe pas
            } else {
                logger.info('[TS-LEADS] Utilisateur assigné trouvé:', user.email);
            }
        } else {
            // Si pas d'assignation, utiliser l'utilisateur actuel
            finalAssignedToId = authReq.user.userId; // Correction: userId au lieu de id
            logger.info('[TS-LEADS] Assignation au créateur du lead:', finalAssignedToId);
            
            // En production, on vérifie toujours que l'utilisateur existe réellement dans la DB
            const existingUser = await prisma.user.findUnique({
                where: { id: finalAssignedToId }
            });
            
            if (!existingUser) {
                logger.info('[TS-LEADS] L\'utilisateur assigné n\'existe pas, recherche d\'un utilisateur valide...');
                const anyUser = await prisma.user.findFirst({
                    where: {
                        UserOrganization: {
                            some: {
                                organizationId
                            }
                        }
                    }
                });
                
                if (anyUser) {
                    finalAssignedToId = anyUser.id;
                    logger.info('[TS-LEADS] Utilisateur trouvé dans l\'organisation:', { id: finalAssignedToId, email: anyUser.email });
                } else {
                    finalAssignedToId = null; // Si aucun utilisateur n'est trouvé, mettre null
                    logger.info('[TS-LEADS] Aucun utilisateur trouvé dans l\'organisation, assignedToId=null');
                }
            }
        }
        
        logger.info('[TS-LEADS] Tentative de création du lead avec:', {
            organizationId,
            status,
            source: source || (data && data.source ? data.source : 'direct'), // Utiliser source explicite ou extraire de data
            data: data || {},
            assignedToId: finalAssignedToId
        });
        
        const newLead = await prisma.lead.create({
            data: {
                organizationId,
                status,
                source: source || (data && data.source ? data.source : 'direct'), // Définir la source explicitement
                data: data || {},
                assignedToId: finalAssignedToId,
            },
        });
        
        logger.info('[TS-LEADS] Lead créé avec succès:', { id: newLead.id, status: newLead.status });

        // 🐝 Auto-post social : nouveau client (si statut client)
        if (status === 'client' || status === 'converti') {
          const leadData = (data || {}) as Record<string, unknown>;
          createBusinessAutoPost({
            orgId: organizationId,
            userId: authReq.user?.userId || authReq.user?.id,
            eventType: 'new_client',
            entityId: newLead.id,
            entityLabel: leadData.company || leadData.name || 'Nouveau client',
            clientName: leadData.name || leadData.company || undefined,
          }).catch(err => logger.error('[TS-LEADS] Auto-post error:', err));
        }

        res.status(201).json(newLead);
    } catch (error: unknown) {
        logger.error('[TS-LEADS] Erreur détaillée lors de la création du lead:', error);
        const errObj = (typeof error === 'object' && error !== null) ? (error as Record<string, unknown>) : {};
        logger.error('[TS-LEADS] Message d\'erreur:', String(errObj['message'] || ''));
        logger.error('[TS-LEADS] Stack trace:', String(errObj['stack'] || ''));
        
        // Détection plus précise du type d'erreur pour un meilleur message
        let errorMessage = 'Impossible de créer le lead.';
        if (errObj['code'] === 'P2003') {
            errorMessage = 'Violation de contrainte de clé étrangère. Vérifiez que l\'organisation et l\'utilisateur assigné existent bien.';
        } else if (errObj['code'] === 'P2002') {
            errorMessage = 'Un lead similaire existe déjà.';
        }
        
        res.status(500).json({ success: false, message: errorMessage, 
            details: String(errObj['message'] || ''),
            code: (errObj['code'] as string) || 'UNKNOWN',
            stack: String(errObj['stack'] || '')
        });
    }
});

// GET /api/leads/:id - Récupérer un lead spécifique
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user || !authReq.user.organizationId) {
        res.status(401).json({ success: false, message: 'Authentification requise.' });
        return;
    }
    const { organizationId } = authReq.user;
    const { id } = req.params;

    try {
        const lead = await prisma.lead.findFirst({
            where: {
                id,
                organizationId
            },
            include: { 
                assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
                timelineEvents: { orderBy: { createdAt: 'asc' } }
            }
        });

        if (!lead) {
            res.status(404).json({ success: false, message: 'Lead non trouvé ou non autorisé.' });
            return;
        }
        res.json({ success: true, data: lead });
    } catch (error) {
        logger.error(`Erreur lors de la récupération du lead ${id}:`, error);
        res.status(500).json({ success: false, message: 'Impossible de récupérer le lead.' });
    }
});

// PUT /api/leads/:id - Mettre à jour un lead
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user || !authReq.user.organizationId) {
        res.status(401).json({ success: false, message: 'Authentification requise.' });
        return;
    }

    const { organizationId } = authReq.user;
    const { status, statusId, data, assignedToId, source } = req.body;

    try {
        // Vérifier que le lead appartient à l'organisation avant de le mettre à jour
        const existingLead = await prisma.lead.findFirst({
            where: { id, organizationId }
        });

        if (!existingLead) {
            res.status(404).json({ success: false, message: 'Lead non trouvé ou non autorisé.' });
            return;
        }

        // 🔒 Rétrogradation lock: bloquer si le lead a des chantiers signés et le nouveau statut est inférieur
        if (statusId && existingLead.statusId && statusId !== existingLead.statusId) {
            const isSuperAdmin = authReq.user.role === 'SUPER_ADMIN';
            if (!isSuperAdmin) {
                const chantiersCount = await prisma.chantier.count({
                    where: { leadId: id, organizationId }
                });
                if (chantiersCount > 0) {
                    const [currentStatus, targetStatus] = await Promise.all([
                        prisma.leadStatus.findUnique({ where: { id: existingLead.statusId } }),
                        prisma.leadStatus.findUnique({ where: { id: statusId } })
                    ]);
                    if (currentStatus && targetStatus && targetStatus.order < currentStatus.order) {
                        res.status(403).json({
                            success: false,
                            message: 'Ce lead a des produits signés (chantiers). Impossible de rétrograder le statut.'
                        });
                        return;
                    }
                }
            }
        }

        // Mapping des anciens statuts vers les nouveaux noms de statuts
        const statusMapping: Record<string, string> = {
            'new': 'Nouveau',
            'contacted': 'Contacté',
            'meeting': 'RDV Programmé',
            'proposal': 'Devis Envoyé',
            'negotiation': 'En Négociation',
            'won': 'Gagné',
            'lost': 'Perdu',
            'installation': 'Installation',
            'completed': 'Terminé',
            'in_progress': 'En cours',
            'closed': 'Fermé'
        };

        let finalStatusId = statusId;
        let finalStatus = status;

        // Si un status est fourni, trouver le statusId correspondant
        if (status && !statusId) {
            const statusName = statusMapping[status] || status;
            const leadStatus = await prisma.leadStatus.findFirst({
                where: {
                    organizationId,
                    name: statusName
                }
            });

            if (leadStatus) {
                finalStatusId = leadStatus.id;
                finalStatus = status; // Garder l'ancien status pour compatibilité
                logger.info(`[LEADS] Conversion status: "${status}" -> statusId: ${leadStatus.id} (${leadStatus.name})`);
            } else {
                logger.warn(`[LEADS] Statut non trouvé pour: "${status}" -> "${statusName}"`);
            }
        }

        const updatedLead = await prisma.lead.update({
            where: { id },
            data: {
                status: finalStatus,
                statusId: finalStatusId,
                source,
                data,
                assignedToId
            },
            include: {
                assignedTo: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    }
                },
                leadStatus: true // Inclure les informations du statut mis à jour
            }
        });
        res.json({ success: true, data: updatedLead });
    } catch (error) {
        logger.error(`Erreur lors de la mise à jour du lead ${id}:`, error);
        res.status(500).json({ success: false, message: 'Impossible de mettre à jour le lead.' });
    }
});

// DELETE /api/leads/:id - Supprimer un lead
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user || !authReq.user.organizationId) {
        res.status(401).json({ success: false, message: 'Authentification requise.' });
        return;
    }
    const { organizationId } = authReq.user;
    const { id } = req.params;

    try {
        // Vérifier que le lead appartient à l'organisation avant de le supprimer
        const existingLead = await prisma.lead.findFirst({
            where: { id, organizationId }
        });

        if (!existingLead) {
            res.status(404).json({ success: false, message: 'Lead non trouvé ou non autorisé.' });
            return;
        }

        await prisma.lead.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        logger.error(`Erreur lors de la suppression du lead ${id}:`, error);
        res.status(500).json({ success: false, message: 'Impossible de supprimer le lead.' });
    }
});

export default router;
