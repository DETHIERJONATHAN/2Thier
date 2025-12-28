/**
 * Script de restauration des sections de website depuis le backup
 * 
 * ATTENTION: Ce script va mettre à jour le contenu des sections existantes
 * avec les données du backup de production
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const db = new PrismaClient();

async function restoreSections() {
  console.log('🔄 Démarrage de la restauration des sections...');
  
  // Lire les sections extraites du backup
  const sectionsData = JSON.parse(fs.readFileSync('./Backup/sections-extracted.json', 'utf8'));
  
  console.log(`📦 ${sectionsData.length} sections à restaurer`);
  
  // D'abord, trouver le site actuel
  const currentSite = await db.websites.findFirst({
    where: { slug: 'site-vitrine-2thier' }
  });
  
  if (!currentSite) {
    console.error('❌ Site "site-vitrine-2thier" non trouvé');
    process.exit(1);
  }
  
  console.log(`🌐 Site trouvé: ${currentSite.name} (ID: ${currentSite.id})`);
  
  // Supprimer les anciennes sections
  await db.website_sections.deleteMany({
    where: { websiteId: currentSite.id }
  });
  console.log('🗑️  Anciennes sections supprimées');
  
  // Créer les nouvelles sections avec les données du backup
  for (const section of sectionsData) {
    try {
      const content = JSON.parse(section.content);
      
      await db.website_sections.create({
        data: {
          websiteId: currentSite.id,
          key: section.key,
          type: section.type,
          name: section.name,
          content: content,
          displayOrder: parseInt(section.id) % 100, // Utiliser une partie de l'ID comme ordre
          isActive: true,
          isLocked: false,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      console.log(`✅ Section "${section.name}" (${section.type}) restaurée`);
    } catch (e) {
      console.error(`❌ Erreur pour la section ${section.type}:`, e.message);
    }
  }
  
  console.log('\n🎉 Restauration terminée !');
}

restoreSections()
  .then(() => process.exit(0))
  .catch(e => {
    console.error('Erreur:', e);
    process.exit(1);
  });
