import express from 'express';
import prisma from '../prisma';

const router = express.Router();

/**
 * 🏢 ROUTES ORGANIZATIONS - VERSION SIMPLE POUR DEBUG
 * 🚀 CACHE EN MÉMOIRE pour performances (TTL 60s)
 */

// 🚀 CACHE MÉMOIRE SIMPLE (alternative légère à Redis)
interface CacheEntry<T> {
  data: T;
  expiry: number;
}
const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 60_000; // 60 secondes

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL_MS });
}

function invalidateCache(pattern?: string): void {
  if (!pattern) {
    cache.clear();
  } else {
    for (const key of cache.keys()) {
      if (key.includes(pattern)) cache.delete(key);
    }
  }
}

// GET /api/organizations - Récupérer toutes les organisations
router.get('/', async (req, res) => {
  try {
    const cacheKey = 'organizations:all';
    
    // 🚀 Vérifier le cache d'abord
    const cached = getCached<unknown[]>(cacheKey);
    if (cached) {
      console.log(`⚡ [GET /api/organizations] Cache HIT (${cached.length} orgs)`);
      return res.json({ success: true, data: cached, cached: true });
    }
    
    console.log('📡 [GET /api/organizations] Récupération des organisations...');
    
    const organizations = await prisma.organization.findMany({
      include: {
        UserOrganization: {
          include: {
            User: {
              select: { id: true, email: true, firstName: true, lastName: true }
            }
          }
        }
      }
    });

    // 🚀 Mettre en cache
    setCache(cacheKey, organizations);
    
    console.log(`✅ [GET /api/organizations] ${organizations.length} organisations trouvées (cached)`);
    res.json({ success: true, data: organizations });
  } catch (error) {
    console.error('❌ [GET /api/organizations] Erreur:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// GET /api/organizations/:id - Récupérer une organisation spécifique
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `organizations:${id}`;
    
    // 🚀 Vérifier le cache d'abord
    const cached = getCached<unknown>(cacheKey);
    if (cached) {
      console.log(`⚡ [GET /api/organizations/${id}] Cache HIT`);
      return res.json({ success: true, data: cached, cached: true });
    }
    
    console.log(`📡 [GET /api/organizations/${id}] Récupération organisation...`);
    
    const organization = await prisma.organization.findUnique({
      where: { id },
      include: {
        UserOrganization: {
          include: {
            User: {
              select: { id: true, email: true, firstName: true, lastName: true }
            }
          }
        }
      }
    });

    if (!organization) {
      console.log(`❌ [GET /api/organizations/${id}] Organisation non trouvée`);
      return res.status(404).json({ success: false, error: 'Organisation non trouvée' });
    }

    // 🚀 Mettre en cache
    setCache(cacheKey, organization);

    console.log(`✅ [GET /api/organizations/${id}] Organisation trouvée: ${organization.name}`);
    res.json({ success: true, data: organization });
  } catch (error) {
    console.error(`❌ [GET /api/organizations/${req.params.id}] Erreur:`, error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// POST /api/organizations - Créer une nouvelle organisation
router.post('/', async (req, res) => {
  try {
    console.log('📡 [POST /api/organizations] Création organisation...');
    const organizationData = req.body;
    
    const newOrganization = await prisma.organization.create({
      data: {
        name: organizationData.name,
        status: organizationData.status || 'active',
      },
      include: {
        UserOrganization: {
          include: {
            User: {
              select: { id: true, email: true, firstName: true, lastName: true }
            }
          }
        }
      }
    });

    // 🚀 Invalider le cache
    invalidateCache('organizations');

    console.log(`✅ [POST /api/organizations] Organisation créée: ${newOrganization.name}`);
    res.json({ success: true, data: newOrganization });
  } catch (error) {
    console.error('❌ [POST /api/organizations] Erreur:', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la création de l\'organisation' });
  }
});

// PUT /api/organizations/:id - Mettre à jour une organisation
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📡 [PUT /api/organizations/${id}] Mise à jour organisation...`);
    const organizationData = req.body;

    // 🔍 DEBUG - Afficher les données reçues
    console.log('📝 [PUT Organizations] Données reçues:', JSON.stringify(organizationData, null, 2));
    console.log('🔑 [PUT Organizations] Clés reçues:', Object.keys(organizationData));

    const updatedOrganization = await prisma.organization.update({
      where: { id },
      data: {
        name: organizationData.name,
        status: organizationData.status,
        website: organizationData.website || null, // Gérer le website optionnel
      },
      include: {
        UserOrganization: {
          include: {
            User: {
              select: { id: true, email: true, firstName: true, lastName: true }
            }
          }
        }
      }
    });

    // 🚀 Invalider le cache
    invalidateCache('organizations');

    console.log(`✅ [PUT /api/organizations/${id}] Organisation mise à jour: ${updatedOrganization.name}`);
    res.json({ success: true, data: updatedOrganization });
  } catch (error) {
    console.error(`❌ [PUT /api/organizations/${req.params.id}] Erreur:`, error);

    // 🔍 Plus de détails sur l'erreur
    if (error instanceof Error) {
      console.error("❌ Message d'erreur:", error.message);
      console.error('❌ Stack trace:', error.stack);
    }

    res.status(400).json({
      success: false,
      error: "Erreur lors de la mise à jour de l'organisation",
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// DELETE /api/organizations/:id - Supprimer une organisation
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📡 [DELETE /api/organizations/${id}] Suppression organisation...`);
    
    await prisma.organization.delete({ where: { id } });
    
    // 🚀 Invalider le cache
    invalidateCache('organizations');
    
    console.log(`✅ [DELETE /api/organizations/${id}] Organisation supprimée`);
    res.json({ success: true, message: 'Organisation supprimée avec succès' });
  } catch (error) {
    console.error(`❌ [DELETE /api/organizations/${req.params.id}] Erreur:`, error);
    res.status(500).json({ success: false, error: 'Erreur lors de la suppression de l\'organisation' });
  }
});

export default router;
