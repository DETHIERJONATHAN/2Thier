// Script de diagnostic et correction des routes d'API manquantes
import { PrismaClient } from '@prisma/client';
import express from 'express';
import fs from 'fs';
import path from 'path';

// Création du client Prisma
const prisma = new PrismaClient();

// Configuration de l'application Express
const app = express();
app.use(express.json());

// Fonction de diagnostic
async function diagnoseApiIssues() {
  try {
    console.log("=== DIAGNOSTIC DES ROUTES API ===");
    
    // 1. Vérifier si la route permissions existe
    const routesDir = path.join(process.cwd(), 'src', 'routes');
    const files = fs.readdirSync(routesDir);
    
    console.log("\n1. Fichiers routes disponibles:");
    files.forEach(file => console.log(`   - ${file}`));
    
    // 2. Vérifier si le fichier permissions.ts est importé dans index.ts
    const indexContent = fs.readFileSync(path.join(routesDir, 'index.ts'), 'utf8');
    const hasPermissionsImport = indexContent.includes("import permissionsRouter from './permissions");
    const hasPermissionsRoute = indexContent.includes("apiRouter.use('/permissions', permissionsRouter)");
    
    console.log("\n2. Configuration des routes:");
    console.log(`   - Import de permissionsRouter: ${hasPermissionsImport ? '✅ Présent' : '❌ Manquant'}`);
    console.log(`   - Montage de la route /permissions: ${hasPermissionsRoute ? '✅ Présent' : '❌ Manquant'}`);
    
    // 3. Vérifier le contenu du fichier permissions.ts
    if (fs.existsSync(path.join(routesDir, 'permissions.ts'))) {
      const permissionsContent = fs.readFileSync(path.join(routesDir, 'permissions.ts'), 'utf8');
      const hasPostMethod = permissionsContent.includes('router.post(');
      const hasBulkMethod = permissionsContent.includes('router.post(\'/bulk\'');
      const hasRootPostMethod = permissionsContent.includes('router.post(\'/\'');
      
      console.log("\n3. Méthodes dans permissions.ts:");
      console.log(`   - Méthode POST: ${hasPostMethod ? '✅ Présent' : '❌ Manquant'}`);
      console.log(`   - Méthode POST /bulk: ${hasBulkMethod ? '✅ Présent' : '❌ Manquant'}`);
      console.log(`   - Méthode POST / (racine): ${hasRootPostMethod ? '✅ Présent' : '❌ Manquant'}`);
      
      if (hasBulkMethod && !hasRootPostMethod) {
        console.log("\n⚠️ ERREUR DÉTECTÉE: La route POST /permissions sans suffixe manque, mais POST /permissions/bulk existe");
        console.log("   Le frontend essaie d'appeler /api/permissions directement en POST, mais seul /api/permissions/bulk est implémenté");
      }
    } else {
      console.log("\n❌ Le fichier permissions.ts n'existe pas dans le dossier routes!");
    }
    
    console.log("\n=== SOLUTION RECOMMANDÉE ===");
    console.log("Ajouter une route POST / dans le fichier permissions.ts qui fait la même chose que POST /bulk");
    
  } catch (error) {
    console.error("Erreur lors du diagnostic:", error);
  }
}

// Exécution
diagnoseApiIssues()
  .then(() => {
    console.log("\nDiagnostic terminé.");
    process.exit(0);
  })
  .catch(error => {
    console.error("Erreur:", error);
    process.exit(1);
  });
