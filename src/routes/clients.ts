import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { db } from '../lib/database';

const router = Router();
const prisma = db;

// Appliquer l'authentification à toutes les routes
router.use(authenticateToken);

// GET /api/clients - Récupérer tous les clients (basé sur les leads)
router.get('/', async (req, res) => {
  try {
    console.log('[CLIENTS] Récupération des clients pour l\'organisation:', req.organizationId);
    
    // Récupérer les leads qui peuvent être considérés comme des clients
    // (par exemple, leads avec statut "converti" ou "client")
    const leads = await prisma.lead.findMany({
      where: {
        organizationId: req.organizationId,
        // Filtrer pour obtenir les leads qui sont devenus des clients
        OR: [
          { status: { contains: 'client', mode: 'insensitive' } },
          { status: { contains: 'converti', mode: 'insensitive' } },
          { status: { contains: 'actif', mode: 'insensitive' } }
        ]
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

    // Transformer les leads en format client pour l'agenda
    const clients = leads.map(lead => {
      const data = lead.data as any || {};
      return {
        id: lead.id,
        name: data.company || data.name || `Lead ${lead.id.slice(0, 8)}`,
        email: data.email || data.contactEmail || '',
        phone: data.phone || data.phoneNumber || '',
        company: data.company || '',
        status: lead.status,
        assignedTo: lead.assignedTo,
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt
      };
    });

    console.log(`[CLIENTS] ${clients.length} clients trouvés`);
    res.json(clients);

  } catch (error) {
    console.error('[CLIENTS] Erreur lors de la récupération des clients:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des clients',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// GET /api/clients/:id - Récupérer un client spécifique
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('[CLIENTS] Récupération du client:', id);

    const lead = await prisma.lead.findFirst({
      where: {
        id,
        organizationId: req.organizationId
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
      return res.status(404).json({ error: 'Client non trouvé' });
    }

    const data = lead.data as any || {};
    const client = {
      id: lead.id,
      name: data.company || data.name || `Lead ${lead.id.slice(0, 8)}`,
      email: data.email || data.contactEmail || '',
      phone: data.phone || data.phoneNumber || '',
      company: data.company || '',
      status: lead.status,
      assignedTo: lead.assignedTo,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
      data: lead.data
    };

    res.json(client);

  } catch (error) {
    console.error('[CLIENTS] Erreur lors de la récupération du client:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération du client',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// POST /api/clients - Créer un nouveau client
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, company } = req.body;
    console.log('[CLIENTS] Création d\'un nouveau client:', { name, email, company });

    // Créer un lead avec le statut "client"
    const lead = await prisma.lead.create({
      data: {
        organizationId: req.organizationId,
        status: 'client',
        data: {
          name,
          email,
          phone,
          company,
          source: 'manuel'
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
        }
      }
    });

    const client = {
      id: lead.id,
      name: company || name,
      email,
      phone,
      company,
      status: lead.status,
      assignedTo: lead.assignedTo,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt
    };

    res.status(201).json(client);

  } catch (error) {
    console.error('[CLIENTS] Erreur lors de la création du client:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la création du client',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

export default router;
