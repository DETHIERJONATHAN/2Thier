import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { db } from '../lib/database';

const router = Router();
const prisma = db;

// Appliquer l'authentification à toutes les routes
router.use(authenticateToken);

// Interface pour les données de projet stockées dans le JSON
interface ProjectData {
  name?: string;
  description?: string;
  status?: string;
  clientId?: string;
  clientName?: string;
  budget?: number;
  deadline?: string;
  priority?: string;
}

// GET /api/projects - Récupérer tous les projets
router.get('/', async (req, res) => {
  try {
    console.log('[PROJECTS] Récupération des projets pour l\'organisation:', req.organizationId);
    
    // Pour l'instant, on utilise les leads avec un statut de projet
    // Plus tard, on pourra créer un modèle Project dédié
    const projectLeads = await prisma.lead.findMany({
      where: {
        organizationId: req.organizationId,
        OR: [
          { status: { contains: 'projet', mode: 'insensitive' } },
          { status: { contains: 'en cours', mode: 'insensitive' } },
          { status: { contains: 'development', mode: 'insensitive' } }
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

    // Transformer en format projet pour l'agenda
    const projects = projectLeads.map(lead => {
      const data = lead.data as ProjectData || {};
      return {
        id: lead.id,
        name: data.name || `Projet ${lead.id.slice(0, 8)}`,
        description: data.description || '',
        status: lead.status,
        client: data.clientName || '',
        assignedTo: lead.assignedTo,
        budget: data.budget || 0,
        deadline: data.deadline || null,
        priority: data.priority || 'medium',
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt
      };
    });

    // Si aucun projet trouvé, retourner quelques exemples pour démonstration
    if (projects.length === 0) {
      const sampleProjects = [
        {
          id: 'sample-1',
          name: 'Site web entreprise',
          description: 'Développement du site vitrine',
          status: 'en cours',
          client: 'Client Exemple',
          assignedTo: null,
          budget: 5000,
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          priority: 'high',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'sample-2',
          name: 'Application mobile',
          description: 'App iOS/Android',
          status: 'planifié',
          client: 'Autre Client',
          assignedTo: null,
          budget: 15000,
          deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          priority: 'medium',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      console.log('[PROJECTS] Aucun projet trouvé, retour d\'exemples');
      return res.json(sampleProjects);
    }

    console.log(`[PROJECTS] ${projects.length} projets trouvés`);
    res.json(projects);

  } catch (error) {
    console.error('[PROJECTS] Erreur lors de la récupération des projets:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des projets',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// GET /api/projects/:id - Récupérer un projet spécifique
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('[PROJECTS] Récupération du projet:', id);

    // Vérifier s'il s'agit d'un exemple
    if (id.startsWith('sample-')) {
      const sampleProject = {
        id,
        name: id === 'sample-1' ? 'Site web entreprise' : 'Application mobile',
        description: id === 'sample-1' ? 'Développement du site vitrine' : 'App iOS/Android',
        status: 'en cours',
        client: 'Client Exemple',
        assignedTo: null,
        budget: id === 'sample-1' ? 5000 : 15000,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        priority: 'high',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      return res.json(sampleProject);
    }

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
        }
      }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Projet non trouvé' });
    }

    const data = lead.data as ProjectData || {};
    const project = {
      id: lead.id,
      name: data.name || `Projet ${lead.id.slice(0, 8)}`,
      description: data.description || '',
      status: lead.status,
      client: data.clientName || '',
      assignedTo: lead.assignedTo,
      budget: data.budget || 0,
      deadline: data.deadline || null,
      priority: data.priority || 'medium',
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
      data: lead.data
    };

    res.json(project);

  } catch (error) {
    console.error('[PROJECTS] Erreur lors de la récupération du projet:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération du projet',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// POST /api/projects - Créer un nouveau projet
router.post('/', async (req, res) => {
  try {
    const { name, description, clientName, budget, deadline, priority } = req.body;
    console.log('[PROJECTS] Création d\'un nouveau projet:', { name, clientName });

    const lead = await prisma.lead.create({
      data: {
        organizationId: req.organizationId,
        status: 'projet',
        data: {
          name,
          description,
          clientName,
          budget: budget ? parseFloat(budget) : 0,
          deadline,
          priority: priority || 'medium',
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

    const project = {
      id: lead.id,
      name,
      description,
      status: lead.status,
      client: clientName,
      assignedTo: lead.assignedTo,
      budget: budget ? parseFloat(budget) : 0,
      deadline,
      priority: priority || 'medium',
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt
    };

    res.status(201).json(project);

  } catch (error) {
    console.error('[PROJECTS] Erreur lors de la création du projet:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la création du projet',
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

export default router;
