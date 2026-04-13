import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { logger } from '../lib/logger';

const router = Router();

// 🔐 Toutes les routes debug nécessitent une authentification SuperAdmin
router.use(authenticateToken);
router.use((req: any, res, next) => {
  if (!req.user?.isSuperAdmin) return res.status(403).json({ error: 'SuperAdmin required' });
  next();
});

router.get('/modules', async (_req, res) => {
  try {
    // Récupérer toutes les organisations pour référence
    const organizations = await prisma.organization.findMany();
    
    // Récupération des modules
    const modules = await prisma.module.findMany({
      include: {
        Organization: true
      },
      orderBy: { order: 'asc' }
    });
    
    
    // Obtenir le nom de l'organisation "United" ou la première trouvée
    const mainOrgName = organizations.find(o => o.name === "United")?.name || 
                       (organizations.length > 0 ? organizations[0].name : "Organisation par défaut");
    
    // Traitement des données avant envoi
    const processedModules = modules.map(m => {
      // Logique de détermination du nom de l'organisation pour chaque module
      let organizationName;
      
      // Cas spécial pour le module "a" - forcer l'association à l'organisation principale
      if (m.key === "a") {
        organizationName = mainOrgName;
      }
      // Pour les modules ayant un organizationId et une Organisation associée
      else if (m.organizationId && m.Organization && m.Organization.name) {
        organizationName = m.Organization.name;
      }
      // Pour les modules sans organisation (globaux)
      else {
        organizationName = "Global";
      }
      
      // Retourner le module avec le nom d'organisation
      return {
        ...m,
        organizationName
      };
    });
    
    res.json({ modules: processedModules });
  } catch (e) {
    logger.error("Erreur modules:", e);
    res.status(500).json({ error: 'Erreur lors de la récupération des modules.' });
  }
});

export default router;
