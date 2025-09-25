// Script pour voir les vraies valeurs encodées dans les champs
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getFieldValues() {
  try {
    console.log('=== VALEURS ENCODÉES DANS LES CHAMPS ===');
    
    // IDs des champs identifiés
    const fieldIds = [
      'c8a2467b-9cf1-4dba-aeaf-77240adeedd5', // Prix Kw/h (advanced_select)
      '52c7f63b-7e57-4ba8-86da-19a176f09220', // Prix Kw/h - Défini (calculé)
      'aa448cfa-3d97-4c23-8995-8e013577e27d', // Consommation annuelle Kw/h
    ];
    
    for (const fieldId of fieldIds) {
      const field = await prisma.field.findUnique({
        where: { id: fieldId }
      });
      
      if (field) {
        console.log(`\n--- ${field.name || field.label} ---`);
        console.log(`ID: ${field.id}`);
        console.log(`Type: ${field.type}`);
        
        // Chercher la valeur par défaut ou exemple
        if (field.defaultValue) {
          console.log(`Valeur par défaut: ${field.defaultValue}`);
        }
        
        if (field.placeholder) {
          console.log(`Placeholder: ${field.placeholder}`);
        }
      }
    }
    
    console.log('\n=== RECHERCHE DE VALEURS DANS LES DONNÉES ===');
    
    // Chercher dans les tables qui pourraient contenir les données
    try {
      // Chercher dans les leads ou autres tables de données
      const leads = await prisma.lead.findMany({
        take: 5,
        select: { id: true }
      });
      
      console.log(`Leads trouvés: ${leads.length}`);
      
    } catch (e) {
      console.log('Pas de données de leads disponibles');
    }
    
  } catch (error) {
    console.error('Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

getFieldValues();
