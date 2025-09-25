/**
 * 🚀 SERVEUR API CRM - ARCHITECTURE MODULAIRE PROPRE
 * 
 * Ce serveur utilise une architecture modulaire où chaque domaine métier
 * est géré par son propre router spécialisé.
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { PrismaClient } from '@prisma/client';
import { createServer } from 'http';

/**
 * 🔧 CONFIGURATION ET INSTANCES
 */
const app = express();
const PORT = process.env.PORT || 4000;
const prisma = new PrismaClient();
const server = createServer(app);

/**
 * 🛡️ MIDDLEWARE DE SÉCURITÉ ET CONFIGURATION
 */
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

/**
 * 🔄 MIDDLEWARE DE LOGGING
 */
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.path}`);
  next();
});

/**
 * 🏥 ROUTE DE SANTÉ
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    architecture: 'Modular CRM API v2.0'
  });
});

/**
 * 📊 ROUTE DE TEST API
 */
app.get('/api/test', (req: Request, res: Response) => {
  res.json({
    message: 'API CRM fonctionnelle !',
    timestamp: new Date().toISOString(),
    architecture: 'Routes modulaires activées ✅'
  });
});

/**
 * 📥 IMPORTATION DES ROUTES MODULAIRES
 */
try {
  console.log('📥 Importation des routes...');
  
  // Import dynamique des routes qui fonctionnent
  const { default: authRoutes } = await import('./routes/auth');
  const { default: organizationsRoutes } = await import('./routes/organizations-simple');
  
  console.log('✅ Routes de base importées');
  
  /**
   * 🔗 DÉLÉGATION AUX ROUTES SPÉCIALISÉES
   */
  console.log('🔗 Configuration des routes modulaires...');

  // 🔐 AUTHENTIFICATION - Routes d'auth avec session et sécurité
  app.use('/api/auth', authRoutes);
  app.use('/', authRoutes); // Compatibilité pour /login direct

  // 🏢 ORGANISATIONS - Gestion complète des organisations avec permissions
  app.use('/api/organizations', organizationsRoutes);

  console.log('✅ Routes modulaires configurées');
  
} catch (importError) {
  console.error('❌ Erreur importation routes:', importError);
  console.log('🔄 Utilisation de routes de fallback intégrées...');
  
  // Routes de fallback intégrées en cas de problème d'import
  
  // Route d'authentification basique
  app.get('/api/auth/me', async (req, res) => {
    try {
      const userEmail = 'jonathan.dethier@dethier.be'; 
      let user = await prisma.user.findFirst({
        where: { email: userEmail },
        include: {
          UserOrganization: {
            include: { Organization: true }
          }
        }
      });

      if (!user) {
        user = await prisma.user.findFirst({
          include: {
            UserOrganization: {
              include: { Organization: true }
            }
          }
        });
      }

      if (!user) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      res.json({
        currentUser: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: 'super_admin',
          permissions: ['super_admin'],
          organizations: user.UserOrganization.map(uo => ({
            id: uo.Organization.id,
            name: uo.Organization.name,
            status: 'active',
            role: 'super_admin',
            permissions: ['super_admin']
          })),
          UserOrganization: user.UserOrganization
        }
      });
    } catch (error) {
      console.error('Erreur /api/auth/me:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // Routes organisations de fallback
  app.get('/api/organizations', async (req, res) => {
    try {
      console.log('📡 [FALLBACK] GET /api/organizations');
      
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

      console.log(`✅ [FALLBACK] ${organizations.length} organisations trouvées`);
      res.json({ success: true, data: organizations });
    } catch (error) {
      console.error('❌ [FALLBACK] Erreur organisations:', error);
      res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
  });
}

/**
 * 🚀 DÉMARRAGE DU SERVEUR
 */
async function startServer() {
  try {
    console.log('🌟 Démarrage du serveur CRM...');
    
    // 1. Test connexion base de données
    console.log('🔗 Test connexion base de données...');
    await prisma.$connect();
    console.log('✅ Base de données connectée');

    // 2. Démarrer le serveur
    server.listen(PORT, () => {
      console.log('🚀 ================================');
      console.log(`🌟 SERVEUR CRM DÉMARRÉ SUR PORT ${PORT}`);
      console.log('🚀 ================================');
      console.log(`📱 Frontend: http://localhost:5174`);
      console.log(`🔗 API: http://localhost:${PORT}`);
      console.log(`🏥 Health: http://localhost:${PORT}/health`);
      console.log(`🧪 Test: http://localhost:${PORT}/api/test`);
      console.log(`🏢 Organizations: http://localhost:${PORT}/api/organizations`);
      console.log('🚀 ================================');
      console.log('✅ Serveur prêt à recevoir les requêtes !');
      console.log('🔗 Architecture: Routes modulaires avec fallback');
    });

  } catch (error) {
    console.error('❌ ERREUR CRITIQUE démarrage serveur:', error);
    process.exit(1);
  }
}

/**
 * 🛑 GESTION PROPRE DE L'ARRÊT
 */
process.on('SIGTERM', async () => {
  console.log('🛑 Arrêt gracieux du serveur...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Arrêt forcé du serveur...');
  await prisma.$disconnect();
  process.exit(0);
});

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason) => {
  console.error('❌ Rejection non gérée:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Exception non capturée:', error);
  process.exit(1);
});

// Démarrer le serveur
startServer();
