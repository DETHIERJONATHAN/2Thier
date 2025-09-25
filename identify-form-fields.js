// Script pour identifier tous les champs du formulaire de devis
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function identifyFormFields() {
  try {
    console.log('=== IDENTIFICATION DES CHAMPS DU FORMULAIRE ===');
    
    // Chercher tous les champs qui contiennent "prix" ou "consommation"
    const fields = await prisma.field.findMany({
      where: {
        OR: [
          { label: { contains: 'prix', mode: 'insensitive' } },
          { label: { contains: 'kw', mode: 'insensitive' } },
          { label: { contains: 'consommation', mode: 'insensitive' } }
        ]
      },
      include: {
        FieldOption: true
      }
    });
    
    console.log(`\nTrouvé ${fields.length} champs pertinents:\n`);
    
    fields.forEach((field, index) => {
      console.log(`--- Champ ${index + 1} ---`);
      console.log(`ID: ${field.id}`);
      console.log(`Nom: ${field.name || 'N/A'}`);
      console.log(`Label: ${field.label}`);
      console.log(`Type: ${field.type}`);
      
      if (field.FieldOption && field.FieldOption.length > 0) {
        console.log(`Options:`);
        field.FieldOption.forEach(opt => {
          console.log(`  - ${opt.value} (${opt.label})`);
        });
      }
      
      console.log('');
    });
    
    // Chercher spécifiquement le champ avec l'ID qu'on connaît
    console.log('=== CHAMPS CONNUS ===');
    
    const knownFields = [
      '52c7f63b-7e57-4ba8-86da-19a176f09220', // Prix Kw/h - Défini
      'aa448cfa-3d97-4c23-8995-8e013577e27d'  // Consommation annuelle
    ];
    
    for (const fieldId of knownFields) {
      const field = await prisma.field.findUnique({
        where: { id: fieldId },
        include: { FieldOption: true }
      });
      
      if (field) {
        console.log(`\n🎯 CHAMP CONNU: ${field.name || field.label || 'Sans nom'}`);
        console.log(`ID: ${field.id}`);
        console.log(`Type: ${field.type}`);
        
        if (field.FieldOption && field.FieldOption.length > 0) {
          console.log(`Options disponibles:`);
          field.FieldOption.forEach(opt => {
            console.log(`  - Valeur: "${opt.value}"`);
            console.log(`    Label: "${opt.label}"`);
            console.log(`    ID: ${opt.id}`);
          });
        }
      }
    }
    
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

identifyFormFields();
