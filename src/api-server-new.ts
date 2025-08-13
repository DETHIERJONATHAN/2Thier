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
import authRoutes from './routes/auth';
import organizationsRoutes from './routes/organizations';
import usersRoutes from './routes/users';
import modulesRoutes from './routes/modules';
import rolesRoutes from './routes/roles';
import permissionsRoutes from './routes/permissions';
import adminRoutes from './routes/admin';
import notificationsRoutes from './routes/notifications';
import blocksRoutes from './routes/blocks';

/**
 * 🔗 DÉLÉGATION AUX ROUTES SPÉCIALISÉES
 * Chaque domaine métier est géré par son propre fichier de routes
 */
console.log('🔗 Configuration des routes modulaires...');

// 🔐 AUTHENTIFICATION - Routes d'auth avec session et sécurité
app.use('/api/auth', authRoutes);
app.use('/', authRoutes); // Compatibilité pour /login direct

// 🏢 ORGANISATIONS - Gestion complète des organisations avec permissions
app.use('/api/organizations', organizationsRoutes);

// 👥 UTILISATEURS - CRUD utilisateurs avec relations organisations
app.use('/api/users', usersRoutes);

// 📋 MODULES - Gestion des modules système et organisation
app.use('/api/modules', modulesRoutes);

// 🎭 RÔLES - Système de rôles hiérarchiques
app.use('/api/roles', rolesRoutes);

// 🔐 PERMISSIONS - Gestion fine des permissions
app.use('/api/permissions', permissionsRoutes);

// 🔧 ADMIN - Fonctionnalités d'administration avancées
app.use('/api/admin', adminRoutes);

// 📧 NOTIFICATIONS - Système de notifications intelligent
app.use('/api/notifications', notificationsRoutes);

// 📝 BLOCKS/FORMULAIRES - Gestion des blocs et formulaires dynamiques
app.use('/api/blocks', blocksRoutes);

console.log('✅ Routes modulaires configurées');

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
      console.log(`📱 Frontend: http://localhost:5173`);
      console.log(`🔗 API: http://localhost:${PORT}`);
      console.log(`🏥 Health: http://localhost:${PORT}/health`);
      console.log('🚀 ================================');
      console.log('✅ Serveur prêt à recevoir les requêtes !');
      console.log('🔗 Architecture: Routes modulaires activées');
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
