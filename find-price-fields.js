// Trouver tous les champs pour identifier le champ texte du prix
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findAllPriceFields() {
  try {
    console.log('=== RECHERCHE DE TOUS LES CHAMPS PRIX ===');
    
    // Chercher tous les champs de la même section
    const allFields = await prisma.field.findMany({
      orderBy: { order: 'asc' }
    });
    
    console.log('Tous les champs par ordre:');
    allFields.forEach((field, index) => {
      console.log(`${index + 1}. ${field.label} (${field.type}) - ID: ${field.id}`);
      if (field.placeholder) {
        console.log(`   Placeholder: ${field.placeholder}`);
      }
    });
    
    console.log('\n=== CHAMPS CONTENANT "PRIX" ===');
    const priceFields = allFields.filter(f => 
      f.label?.toLowerCase().includes('prix') || 
      f.placeholder?.toLowerCase().includes('prix')
    );
    
    priceFields.forEach(field => {
      console.log(`- ${field.label} (${field.type})`);
      console.log(`  ID: ${field.id}`);
      console.log(`  Placeholder: ${field.placeholder || 'Aucun'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

findAllPriceFields();
