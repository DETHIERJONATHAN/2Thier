// Trouver TOUS les champs du formulaire pour identifier le champ texte prix
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findAllPriceFields() {
  try {
    console.log('=== TOUS LES CHAMPS DU FORMULAIRE ===');
    
    // Trouver tous les champs liés au même formulaire/section
    const fields = await prisma.field.findMany({
      orderBy: { order: 'asc' }
    });
    
    console.log(`Total champs trouvés: ${fields.length}`);
    
    // Grouper par section pour mieux comprendre la structure
    const fieldsBySection = {};
    
    for (const field of fields) {
      const sectionId = field.sectionId || 'no-section';
      if (!fieldsBySection[sectionId]) {
        fieldsBySection[sectionId] = [];
      }
      fieldsBySection[sectionId].push(field);
    }
    
    // Afficher par section
    for (const [sectionId, sectionFields] of Object.entries(fieldsBySection)) {
      console.log(`\n=== Section ${sectionId} ===`);
      
      sectionFields.forEach(field => {
        console.log(`- ${field.label} (${field.type}) - ID: ${field.id}`);
        
        if (field.label && field.label.toLowerCase().includes('prix')) {
          console.log(`  🎯 CHAMP PRIX DÉTECTÉ !`);
          if (field.type === 'number' || field.type === 'text') {
            console.log(`  ⭐ CHAMP TEXTE/NUMBER POUR PRIX !`);
          }
        }
        
        if (field.placeholder) {
          console.log(`    Placeholder: ${field.placeholder}`);
        }
      });
    }
    
    console.log('\n=== CHAMPS SPÉCIFIQUES IDENTIFIÉS ===');
    console.log('Advanced_select: c8a2467b-9cf1-4dba-aeaf-77240adeedd5');
    console.log('Consommation: aa448cfa-3d97-4c23-8995-8e013577e27d');
    console.log('Calculé: 52c7f63b-7e57-4ba8-86da-19a176f09220');
    console.log('CHAMP TEXTE PRIX À IDENTIFIER: ???');
    
  } catch (error) {
    console.error('Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

findAllPriceFields();
