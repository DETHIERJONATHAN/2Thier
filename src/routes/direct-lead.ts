// Route API spéciale pour ajouter directement un lead, en contournant l'architecture normale
import express from 'express';
import { PrismaClient } from '@prisma/client';
import bodyParser from 'body-parser';

const router = express.Router();
const prisma = new PrismaClient();

// Middleware pour analyser les requêtes JSON
router.use(bodyParser.json());

interface DirectLeadRequest {
  status: string;
  data: {
    name: string;
    [key: string]: any;
  };
  organizationId: string;
}

router.post('/add-lead-direct', async (req, res) => {
  console.log('[DIRECT] Requête de création directe de lead reçue:', req.body);
  
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
      console.error(`[DIRECT] Organisation non trouvée: ${organizationId}`);
      return res.status(404).json({ error: 'Organisation non trouvée' });
    }
    
    console.log(`[DIRECT] Organisation trouvée: ${organization.name} (${organizationId})`);
    
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
      console.log(`[DIRECT] Lead sera assigné à l'utilisateur: ${anyUser?.email} (${assignedToId})`);
    } else {
      console.log('[DIRECT] Lead ne sera pas assigné (aucun utilisateur trouvé)');
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
    
    console.log('[DIRECT] Lead créé avec succès:', { id: lead.id, status: lead.status });
    res.status(201).json(lead);
  } catch (error: any) {
    console.error('[DIRECT] Erreur lors de la création directe du lead:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la création directe du lead',
      message: error.message,
      stack: error.stack
    });
  }
});

export default router;
