// Route API spéciale pour ajouter directement un lead, en contournant l'architecture normale
import express from 'express';
import bodyParser from 'body-parser';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

const router = express.Router();

// Middleware pour analyser les requêtes JSON
router.use(bodyParser.json());

interface DirectLeadRequest {
  status: string;
  data: {
    name: string;
    [key: string]: unknown;
  };
  organizationId: string;
}

router.post('/add-lead-direct', async (req, res) => {
  
  try {
    const { status, data, organizationId } = req.body as DirectLeadRequest;
    
    if (!organizationId) {
      return res.status(400).json({ error: 'organizationId est requis' });
    }
    
    if (!status) {
      return res.status(400).json({ error: 'status est requis' });
    }
    
    if (!data || !data.name) {
      return res.status(400).json({ error: 'data.name est requis' });
    }
    
    // Vérifier que l'organisation existe
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId }
    });
    
    if (!organization) {
      logger.error(`[DIRECT] Organisation non trouvée: ${organizationId}`);
      return res.status(404).json({ error: 'Organisation non trouvée' });
    }
    
    
    // Trouver un utilisateur à assigner (facultatif)
    const anyUser = await prisma.user.findFirst({
      where: {
        UserOrganization: {
          some: {
            organizationId
          }
        }
      }
    });
    
    const assignedToId = anyUser ? anyUser.id : null;
    if (assignedToId) {
    } else {
    }
    
    // Créer le lead directement avec Prisma
    const lead = await prisma.lead.create({
      data: {
        status,
        data,
        organizationId,
        assignedToId,
      }
    });
    
    res.status(201).json(lead);
  } catch (error: unknown) {
    logger.error('[DIRECT] Erreur lors de la création directe du lead:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la création directe du lead',
      message: error.message,
      stack: error.stack
    });
  }
});

export default router;
