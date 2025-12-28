
import * as dotenv from 'dotenv';
console.log('🔍 [DEBUG] Chargement dotenv...');
dotenv.config();
console.log('✅ [DEBUG] Dotenv chargé');

import express, { type NextFunction, type Request, type Response } from 'express';
import path from 'path';
import fs from 'fs';
console.log('✅ [DEBUG] Express importé');
import cors from 'cors';
console.log('✅ [DEBUG] CORS importé');
import session from 'express-session';
console.log('✅ [DEBUG] Session importée');
import cookieParser from 'cookie-parser';
console.log('✅ [DEBUG] CookieParser importé');
import passport from 'passport';
console.log('✅ [DEBUG] Passport importé');
import { prisma } from './lib/prisma'; // 🎯 INSTANCE PRISMA CENTRALISÉE
console.log('✅ [DEBUG] Prisma centralisé importé');
import mainApiRouter from './routes/index'; // ✅ Router principal complet
import aiInternalRouter from './routes/ai-internal';
import aiFieldGeneratorRouter from './routes/ai-field-generator'; // 🤖 IA GÉNÉRATION DE CONTENU
import treebranchleafRouter from './components/TreeBranchLeaf/treebranchleaf-new/api/treebranchleaf-routes';
import centralizedOperationsRouter from './components/TreeBranchLeaf/treebranchleaf-new/api/centralized-operations-routes';
import tblSubmissionEvaluatorRouter from './components/TreeBranchLeaf/tbl-bridge/routes/tbl-submission-evaluator';
import calculatedValueController from './controllers/calculatedValueController'; // 🎯 VALEURS CALCULÉES
import websitesRouter from './api/websites'; // 🌐 GESTION DES SITES WEB
import imageUploadRouter from './api/image-upload'; // 📸 UPLOAD D'IMAGES
import documentsRouter from './routes/documents'; // 📄 GESTION DES TEMPLATES DE DOCUMENTS
console.log('✅ [DEBUG] Router minimal importé');
// import analyticsRouter from './routes/analytics.ts'; // 📊 ANALYTICS - FUTUR
import { setupSecurity } from './middlewares/security';
console.log('✅ [DEBUG] Security importé');

// 🔄 GOOGLE TOKEN REFRESH SCHEDULER
import { googleTokenScheduler } from './services/GoogleTokenRefreshScheduler';
console.log('✅ [DEBUG] Google Token Scheduler importé');

//  AUTO-SYNC DÉSACTIVÉ - Mode IMAP bidirectionnel pur
// import { autoMailSync } from './services/AutoMailSyncService.js';

console.log('🚀 [DEBUG] Création de l\'app Express...');
const app = express();
console.log('✅ [DEBUG] App Express créée');

// 🔧 Trust proxy pour Codespaces/reverse proxy - permet d'utiliser X-Forwarded-Proto
app.set('trust proxy', 1);
console.log('✅ [DEBUG] Trust proxy activé');

const port = process.env.PORT || 8080;
console.log(`🔧 [DEBUG] Port configuré: ${port}`);

console.log('🔧 [DEBUG] Configuration CORS...');
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
}));
console.log('✅ [DEBUG] CORS configuré');

console.log('🔧 [DEBUG] Configuration JSON parser...');
app.use(express.json());
console.log('✅ [DEBUG] JSON parser configuré');

console.log('🔧 [DEBUG] Configuration Cookie parser...');
app.use(cookieParser());
console.log('✅ [DEBUG] Cookie parser configuré');

const publicDir = path.resolve(process.cwd(), 'public');
const uploadsDir = path.join(publicDir, 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use('/uploads', express.static(uploadsDir));
console.log('✅ [DEBUG] Statics configurés');

// Configuration de la session
console.log('🔧 [DEBUG] Configuration sessions...');
app.use(session({
    secret: process.env.SESSION_SECRET || 'default_secret',
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
    },
}));
console.log('✅ [DEBUG] Sessions configurées');

// Initialiser Passport.js pour l'authentification
console.log('🔧 [DEBUG] Configuration Passport...');
app.use(passport.initialize());
app.use(passport.session());
console.log('✅ [DEBUG] Passport configuré');

// Middleware de logging global pour debug
console.log('🔧 [DEBUG] Configuration logging middleware...');
app.use((req, res, next) => {
    console.log(`[SERVER] ${req.method} ${req.url}`);
    console.log(`[SERVER] Headers:`, req.headers.authorization ? 'Authorization present' : 'No auth');
    console.log(`[SERVER] Cookies:`, req.cookies?.token ? 'Token cookie present' : 'No token cookie');
    next();
});
console.log('✅ [DEBUG] Logging middleware configuré');

// 🧹 ROUTE DE NETTOYAGE FORCÉ DES COOKIES (pour résoudre les 401)
app.get('/clear-auth', (_req, res) => {
    console.log('🧹 [CLEAR-AUTH] Nettoyage forcé des cookies d\'authentification...');
    
    // Nettoyer tous les cookies possibles avec toutes les configurations
    const cookieOptions = [
        { path: '/' },
        { path: '/', domain: 'localhost' },
        { path: '/', domain: '.localhost' },
        { path: '/', httpOnly: true },
        { path: '/', secure: false },
        { path: '/', sameSite: 'lax' as const },
        { path: '/', sameSite: 'none' as const },
        { path: '/', sameSite: 'strict' as const }
    ];
    
    // Nettoyer le cookie 'token' avec toutes les variantes possibles
    cookieOptions.forEach(options => {
        res.clearCookie('token', options);
    });
    
    // Aussi supprimer d'autres cookies potentiels
    ['auth', 'session', 'user', 'jwt', 'access_token'].forEach(cookieName => {
        cookieOptions.forEach(options => {
            res.clearCookie(cookieName, options);
        });
    });
    
    console.log('✅ [CLEAR-AUTH] Cookies nettoyés - redirection vers le frontend');
    
    // Retourner du HTML avec script de nettoyage automatique
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>🧹 Nettoyage en cours...</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
                .container { background: white; padding: 30px; border-radius: 10px; max-width: 500px; margin: 0 auto; }
                h1 { color: #27ae60; }
                .loading { animation: spin 1s linear infinite; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🧹 Nettoyage en cours...</h1>
                <div class="loading">⟳</div>
                <p>Cache et cookies supprimés. Redirection automatique...</p>
                <p><a href="http://localhost:5173">Aller au CRM maintenant</a></p>
            </div>
            <script>
                // Nettoyer complètement le cache côté client
                console.log('🧹 Nettoyage côté client...');
                
                localStorage.clear();
                sessionStorage.clear();
                
                // Supprimer tous les cookies côté client aussi
                document.cookie.split(';').forEach(function(c) { 
                    document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/'); 
                });
                
                console.log('✅ Nettoyage terminé');
                
                // Redirection automatique après 3 secondes
                setTimeout(() => {
                    window.location.href = 'http://localhost:5173?cleared=1';
                }, 3000);
            </script>
        </body>
        </html>
    `);
});

// 🔥 NETTOYAGE RADICAL FORCÉ
app.get('/force-clean', (_req, res) => {
    console.log('🔥 [FORCE-CLEAN] Nettoyage radical demandé');
    
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>🔥 Nettoyage Radical</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #e74c3c; color: white; }
                .container { background: rgba(0,0,0,0.8); padding: 30px; border-radius: 10px; max-width: 500px; margin: 0 auto; }
                h1 { color: #fff; }
                .loading { animation: spin 1s linear infinite; font-size: 2em; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🔥 NETTOYAGE RADICAL EN COURS...</h1>
                <div class="loading">⚡</div>
                <p>Suppression COMPLÈTE de tous les tokens et cookies...</p>
                <p>Redirection automatique vers la page de connexion...</p>
            </div>
            <script src="/force-clean.js"></script>
        </body>
        </html>
    `);
});

// 🔧 ENDPOINT TEMPORAIRE POUR MISE À JOUR DES SERVICES
app.post('/update-services-temp', async (req, res) => {
    try {
        console.log('🔄 Mise à jour du contenu de la section Services...');

        // Trouver la section Services
        const section = await prisma.websiteSection.findFirst({
            where: {
                websiteId: 11,
                type: 'services'
            }
        });

        if (!section) {
            console.error('❌ Section Services non trouvée !');
            return res.status(404).json({ error: 'Section Services non trouvée' });
        }

        console.log(`✅ Section trouvée : ID ${section.id}`);

        // Nouveau contenu avec les 8 vrais services de 2Thier
        const newContent = {
            title: '🏠 Nos Services',
            subtitle: 'Des solutions complètes pour votre habitat et votre autonomie énergétique',
            items: [
                {
                    icon: 'ThunderboltOutlined',
                    iconColor: '#f59e0b',
                    iconSize: '36px',
                    title: 'Panneaux Photovoltaïques',
                    description: 'Installation de panneaux solaires haute performance pour produire votre propre électricité verte et réduire vos factures.',
                    features: [
                        'Installation professionnelle',
                        'Rendement optimal',
                        'Garantie 25 ans',
                        'Maintenance incluse'
                    ],
                    ctaText: 'En savoir plus',
                    ctaUrl: '/services/photovoltaique'
                },
                {
                    icon: 'HomeOutlined',
                    iconColor: '#10b981',
                    iconSize: '36px',
                    title: 'Isolation (Murs, Sols, Toits)',
                    description: 'Isolation thermique et acoustique de qualité pour améliorer votre confort et réaliser jusqu\'à 40% d\'économies d\'énergie.',
                    features: [
                        'Isolation par l\'extérieur',
                        'Isolation par l\'intérieur',
                        'Matériaux écologiques',
                        'Primes disponibles'
                    ],
                    ctaText: 'Découvrir',
                    ctaUrl: '/services/isolation'
                },
                {
                    icon: 'FireOutlined',
                    iconColor: '#ef4444',
                    iconSize: '36px',
                    title: 'Pompes à Chaleur',
                    description: 'Systèmes de chauffage et climatisation économiques et écologiques avec un rendement jusqu\'à 4 fois supérieur.',
                    features: [
                        'Air-eau et air-air',
                        'Économies jusqu\'à 70%',
                        'Primes énergie',
                        'Installation rapide'
                    ],
                    ctaText: 'Demander un devis',
                    ctaUrl: '/services/pompes-chaleur'
                },
                {
                    icon: 'BuildOutlined',
                    iconColor: '#3b82f6',
                    iconSize: '36px',
                    title: 'Toitures',
                    description: 'Rénovation, réparation et pose de toitures neuves avec des matériaux durables et une garantie décennale.',
                    features: [
                        'Tous types de couverture',
                        'Étanchéité garantie',
                        'Isolation intégrée',
                        'Zinguerie incluse'
                    ],
                    ctaText: 'Voir nos réalisations',
                    ctaUrl: '/services/toitures'
                },
                {
                    icon: 'WindowsOutlined',
                    iconColor: '#8b5cf6',
                    iconSize: '36px',
                    title: 'Châssis',
                    description: 'Châssis PVC, aluminium et bois sur mesure pour une isolation optimale et un confort thermique et acoustique.',
                    features: [
                        'Triple vitrage',
                        'Sur mesure',
                        'Pose professionnelle',
                        'Excellent rapport qualité-prix'
                    ],
                    ctaText: 'Configurateur',
                    ctaUrl: '/services/chassis'
                },
                {
                    icon: 'BulbOutlined',
                    iconColor: '#f59e0b',
                    iconSize: '36px',
                    title: 'Électricité Générale',
                    description: 'Installation, rénovation et dépannage électrique pour votre maison ou entreprise, en conformité avec les normes.',
                    features: [
                        'Conformité RGIE',
                        'Domotique',
                        'Bornes de recharge',
                        'Intervention rapide'
                    ],
                    ctaText: 'Demander un électricien',
                    ctaUrl: '/services/electricite'
                },
                {
                    icon: 'ToolOutlined',
                    iconColor: '#64748b',
                    iconSize: '36px',
                    title: 'Gros Œuvre',
                    description: 'Travaux de construction, extension et transformation de bâtiments avec une équipe expérimentée et qualifiée.',
                    features: [
                        'Extensions',
                        'Transformations',
                        'Fondations',
                        'Maçonnerie générale'
                    ],
                    ctaText: 'Nos chantiers',
                    ctaUrl: '/services/gros-oeuvre'
                },
                {
                    icon: 'CloudOutlined',
                    iconColor: '#06b6d4',
                    iconSize: '36px',
                    title: 'Traitement de l\'Eau',
                    description: 'Solutions de filtration, adoucissement et purification pour une eau saine et de qualité dans toute votre habitation.',
                    features: [
                        'Adoucisseurs',
                        'Filtration complète',
                        'Osmose inverse',
                        'Entretien régulier'
                    ],
                    ctaText: 'Analyse gratuite',
                    ctaUrl: '/services/traitement-eau'
                }
            ],
            layout: {
                grid: {
                    columns: {
                        mobile: 1,
                        tablet: 2,
                        desktop: 4
                    },
                    gap: '24px',
                    alignment: 'stretch',
                    justifyContent: 'start'
                },
                cardStyle: 'elevated',
                maxWidth: '1400px'
            },
            style: {
                backgroundColor: '#f9fafb',
                padding: '80px 24px',
                titleColor: '#111827',
                titleFontSize: '42px',
                subtitleColor: '#64748b',
                subtitleFontSize: '18px',
                cardBackground: '#ffffff',
                cardBorderRadius: '16px',
                cardBorder: '1px solid #f1f5f9',
                cardPadding: '24px',
                serviceTitleColor: '#111827',
                serviceTitleFontSize: '20px',
                serviceDescriptionColor: '#64748b',
                serviceDescriptionFontSize: '15px',
                featureCheckColor: '#10b981',
                ctaBackgroundColor: '#10b981',
                ctaBorderColor: '#10b981',
                ctaTextColor: '#ffffff'
            }
        };

        // Mettre à jour la section
        await prisma.websiteSection.update({
            where: {
                id: section.id
            },
            data: {
                content: newContent as any
            }
        });

        console.log('✅ Contenu mis à jour avec succès !');
        console.log(`📝 ${newContent.items.length} services ont été ajoutés`);

        res.json({ 
            success: true, 
            message: 'Services mis à jour avec succès',
            services: newContent.items.map(s => s.title)
        });

    } catch (error) {
        console.error('❌ Erreur lors de la mise à jour:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour', details: error });
    }
});

// Utiliser le routeur principal pour TOUTES les routes /api
// Ce routeur contient maintenant les routes gmail, qui seront donc protégées
// par les mêmes middlewares d'authentification que les autres.
app.use('/api', mainApiRouter);
app.use('/api/ai/internal', aiInternalRouter);
app.use('/api/ai', aiFieldGeneratorRouter); // 🤖 IA GÉNÉRATION INTELLIGENTE DE CONTENU
app.use('/api/treebranchleaf', treebranchleafRouter);
app.use('/api/treebranchleaf-ops', centralizedOperationsRouter);
app.use('/api/tbl', tblSubmissionEvaluatorRouter); // 🔥 TBL PRISMA EVALUATOR
app.use('/api/image-upload', imageUploadRouter); // 📸 UPLOAD D'IMAGES
app.use('/api/documents', documentsRouter); // 📄 TEMPLATES DE DOCUMENTS (ADMIN + GÉNÉRATION)
console.log('✅ Routes TreeBranchLeaf NOUVEAU système montées sur /treebranchleaf');
console.log('✅ Routes TreeBranchLeaf Opérations Centralisées montées sur /treebranchleaf-ops');
console.log('✅ Routes IA Génération de Contenu montées sur /api/ai');

// ✅ PAGE D'ACCUEIL: Simple page d'accueil de l'API
app.get('/', (req, res) => {
  return res.send(`
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="utf-8" />
        <title>2Thier CRM API</title>
      </head>
      <body>
        <h1>🚀 2Thier CRM API</h1>
        <p>API en fonctionnement sur le port ${port}</p>
        <p><a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}">Accéder au CRM</a></p>
      </body>
    </html>
  `);
});

// 📊 ANALYTICS ROUTES - FUTURES FONCTIONNALITÉS
// app.use('/api/analytics', analyticsRouter);

// Gestion des erreurs
// Middleware d'erreurs (signature à 4 args conservée pour Express)
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    console.error('Erreur serveur:', err);
    res.status(500).json({ error: 'Une erreur est survenue sur le serveur.' });
});

console.log('🔧 [DEBUG] Configuration sécurité...');
setupSecurity(app);
console.log('✅ [DEBUG] Sécurité configurée');

console.log('🚀 [DEBUG] Démarrage du serveur...');

// =============================================================================
// 🚀 INITIALISATION DES SERVICES CENTRALISÉS TREEBRANCHLEAF
// =============================================================================

// Import des services centralisés
import { getBackgroundJobService, setupGracefulShutdown } from './services/TreeBranchLeafBackgroundJobService';

app.listen(port, () => {
    console.log(`🎉 [SUCCESS] Server is running on port ${port}`);
    console.log(`🌐 [SUCCESS] Health check: http://localhost:${port}/health`);
    
    // 🔄 Démarrage du scheduler de refresh automatique des tokens Google
    console.log('🔄 [SCHEDULER] Démarrage du scheduler de refresh automatique des tokens Google...');
    googleTokenScheduler.start();
    console.log('✅ [SCHEDULER] Scheduler de refresh automatique démarré');
    
    // 🌳 Initialisation des services TreeBranchLeaf
    console.log('🔧 [TREEBRANCHLEAF] Initialisation des services centralisés...');
    const backgroundJobService = getBackgroundJobService(prisma);
    backgroundJobService.start(15); // Toutes les 15 minutes
    console.log('✅ [TREEBRANCHLEAF] Services d\'arrière-plan démarrés');
    
    // Configuration pour arrêt propre
    setupGracefulShutdown();
    console.log('✅ [TREEBRANCHLEAF] Gestionnaire d\'arrêt propre configuré');
});

// Récupération des conditions TreeBranchLeaf
app.get('/api/treebranchleaf/conditions/:conditionId', async (req, res) => {
  try {
    const { conditionId } = req.params;
    
    console.log('🔍 [API] GET condition:', conditionId);

    // Chercher la condition dans la base de données (SANS include pour débugger)
    const condition = await prisma.treeBranchLeafNodeCondition.findUnique({
      where: { id: conditionId }
    });

    if (!condition) {
      console.log('❌ [API] Condition non trouvée:', conditionId);
      return res.status(404).json({ error: 'Condition non trouvée' });
    }

    console.log('✅ [API] Condition trouvée:', condition.id);
    res.json(condition);

  } catch (error) {
    console.error('❌ [API] Erreur récupération condition:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération de la condition' });
  }
});

// 🎯 NOUVEAU: Récupération des formules d'un nœud spécifique (avec targetProperty!)
app.get('/api/treebranchleaf/nodes/:nodeId/formulas', async (req, res) => {
  try {
    const { nodeId } = req.params;
    
    console.log('🔍 [API] GET formulas for node:', nodeId);

    // Récupérer toutes les formules de ce nœud
    const formulas = await prisma.treeBranchLeafNodeFormula.findMany({
      where: { nodeId },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`✅ [API] ${formulas.length} formule(s) trouvée(s) pour node ${nodeId}`);
    
    // Log les formules avec targetProperty pour debug
    const constraintFormulas = formulas.filter(f => f.targetProperty);
    if (constraintFormulas.length > 0) {
      console.log(`🎯 [API] Formules de contrainte:`, constraintFormulas.map(f => ({
        id: f.id,
        name: f.name,
        targetProperty: f.targetProperty,
        tokens: f.tokens
      })));
    }

    res.json({ formulas });

  } catch (error) {
    console.error('❌ [API] Erreur récupération formules du nœud:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des formules' });
  }
});

// Récupération des formules TreeBranchLeaf
app.get('/api/treebranchleaf/formulas/:formulaId', async (req, res) => {
  try {
    const { formulaId } = req.params;
    
    console.log('🔍 [API] GET formula:', formulaId);

    // Chercher la formule dans la base de données
    const formula = await prisma.treeBranchLeafNodeFormula.findUnique({
      where: { id: formulaId },
      include: {
        node: true,
        Organization: true
      }
    });

    if (!formula) {
      console.log('❌ [API] Formule non trouvée:', formulaId);
      return res.status(404).json({ error: 'Formule non trouvée' });
    }

    console.log('✅ [API] Formule trouvée:', formula.id);
    res.json(formula);

  } catch (error) {
    console.error('❌ [API] Erreur récupération formule:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération de la formule' });
  }
});

// Création dynamique de formules
app.post('/api/treebranchleaf/nodes/:nodeId/formulas', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { name, description, tokens, targetProperty } = req.body;
    
    console.log('➕ [API] POST nouvelle formule:', { nodeId, name, tokensCount: tokens?.length || 0, targetProperty });

    // Vérifier que le nœud existe
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: nodeId }
    });

    if (!node) {
      return res.status(404).json({ error: 'Nœud non trouvé' });
    }

    // Créer la nouvelle formule
    const newFormula = await prisma.treeBranchLeafNodeFormula.create({
      data: {
        nodeId,
        organizationId: node.organizationId,
        name: name || 'Nouvelle formule',
        description: description || '',
        tokens: tokens || [],
        targetProperty: targetProperty ? String(targetProperty) : null
      }
    });

    // 🎯 ACTIVATION AUTOMATIQUE : Configurer hasFormula ET formula_activeId
    console.log('➕ [API] Activation automatique de la formule créée');
    await prisma.treeBranchLeafNode.update({
      where: { id: nodeId },
      data: { 
        hasFormula: true,
        formula_activeId: newFormula.id  // 🎯 NOUVEAU : Activer automatiquement la formule
      }
    });

    console.log('✅ [API] Formule créée avec succès:', newFormula.id);
    res.status(201).json(newFormula);

  } catch (error) {
    console.error('❌ [API] Erreur création formule:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la création',
      details: error.message
    });
  }
});

// Mise à jour dynamique de formules
app.put('/api/treebranchleaf/nodes/:nodeId/formulas/:formulaId', async (req, res) => {
  try {
    const { nodeId, formulaId } = req.params;
    const { name, description, tokens, targetProperty } = req.body;
    
    console.log('✏️ [API] PUT mise à jour formule:', { nodeId, formulaId, name, tokensCount: tokens?.length || 0, targetProperty });

    // Vérifier que la formule existe
    const existingFormula = await prisma.treeBranchLeafNodeFormula.findUnique({
      where: { id: formulaId }
    });

    if (!existingFormula) {
      return res.status(404).json({ error: 'Formule non trouvée' });
    }

    if (existingFormula.nodeId !== nodeId) {
      return res.status(400).json({ error: 'Formule ne correspond pas au nœud' });
    }

    // Mettre à jour la formule de manière dynamique
    const updatedFormula = await prisma.treeBranchLeafNodeFormula.update({
      where: { id: formulaId },
      data: {
        name: name !== undefined ? name : existingFormula.name,
        description: description !== undefined ? description : existingFormula.description,
        tokens: tokens !== undefined ? tokens : existingFormula.tokens,
        targetProperty: targetProperty !== undefined ? (targetProperty ? String(targetProperty) : null) : existingFormula.targetProperty
      }
    });

    console.log('✅ [API] Formule mise à jour avec succès');
    res.json(updatedFormula);

  } catch (error) {
    console.error('❌ [API] Erreur mise à jour formule:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la mise à jour',
      details: error.message
    });
  }
});
;

// Suppression dynamique de formules
app.delete('/api/treebranchleaf/nodes/:nodeId/formulas/:formulaId', async (req, res) => {
  try {
    const { nodeId, formulaId } = req.params;
    
    console.log('🗑️ [API] DELETE formule:', { nodeId, formulaId });

    // Vérifier que la formule existe
    const formula = await prisma.treeBranchLeafNodeFormula.findUnique({
      where: { id: formulaId }
    });

    if (!formula) {
      return res.status(404).json({ error: 'Formule non trouvée' });
    }

    if (formula.nodeId !== nodeId) {
      return res.status(400).json({ error: 'Formule ne correspond pas au nœud' });
    }

    // Compter les formules restantes pour ce nœud
    const remainingCount = await prisma.treeBranchLeafNodeFormula.count({
      where: { 
        nodeId,
        id: { not: formulaId }
      }
    });

    console.log('🗑️ [API] Formules restantes après suppression:', remainingCount);

    // Supprimer la formule
    await prisma.treeBranchLeafNodeFormula.delete({
      where: { id: formulaId }
    });

    // Mise à jour dynamique du flag hasFormula si plus de formules
    if (remainingCount === 0) {
      console.log('🗑️ [API] Plus de formules, mise à jour hasFormula = false');
      await prisma.treeBranchLeafNode.update({
        where: { id: nodeId },
        data: { hasFormula: false }
      });
    }

    console.log('✅ [API] Formule supprimée avec succès');
    res.json({ 
      success: true, 
      message: 'Formule supprimée',
      remainingFormulas: remainingCount,
      nodeHasFormula: remainingCount > 0
    });

  } catch (error) {
    console.error('❌ [API] Erreur suppression formule:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la suppression',
      details: error.message
    });
  }
});

console.log('✅ [DEBUG] Fin du script principal');
