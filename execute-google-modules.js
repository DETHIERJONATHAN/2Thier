import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function executeGoogleModules() {
  try {
    console.log('🚀 Début de l\'exécution du script Google Workspace...');
    
    // Lire le fichier SQL
    const sqlContent = fs.readFileSync(path.join(__dirname, 'add-google-workspace-modules.sql'), 'utf8');
    
    // Diviser en requêtes individuelles
    const queries = sqlContent
      .split(';')
      .map(q => q.trim())
      .filter(q => q.length > 0 && !q.startsWith('--'))
      .filter(q => !q.toLowerCase().includes('select')); // Exclure les SELECT de vérification
    
    console.log(`📝 ${queries.length} requêtes à exécuter...`);
    
    // Exécuter chaque requête
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      if (query.trim()) {
        try {
          console.log(`⚡ Exécution de la requête ${i + 1}/${queries.length}...`);
          await prisma.$executeRawUnsafe(query);
        } catch (error) {
          console.warn(`⚠️ Requête ${i + 1} ignorée (probablement déjà existante):`, error.message);
        }
      }
    }
    
    // Vérification des modules ajoutés
    console.log('✅ Vérification des modules Google Workspace...');
    const googleModules = await prisma.modules.findMany({
      where: {
        feature: {
          in: ['GMAIL', 'GOOGLE_CALENDAR', 'GOOGLE_DRIVE', 'GOOGLE_MEET', 'GOOGLE_DOCS', 'GOOGLE_SHEETS']
        }
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    console.log(`🎉 ${googleModules.length} modules Google Workspace trouvés :`);
    googleModules.forEach(module => {
      console.log(`  📱 ${module.name} (${module.feature}) - ${module.active ? '✅ Actif' : '❌ Inactif'}`);
    });
    
    console.log('🏁 Script terminé avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'exécution du script:', error);
  } finally {
    await prisma.$disconnect();
  }
}

executeGoogleModules();
