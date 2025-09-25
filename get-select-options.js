// Script pour voir les options du champ advanced_select
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getSelectFieldOptions() {
  try {
    console.log('=== CHAMP ADVANCED_SELECT Prix Kw/h ===');
    
    // Champ advanced_select Prix Kw/h
    const selectField = await prisma.field.findUnique({
      where: { id: 'c8a2467b-9cf1-4dba-aeaf-77240adeedd5' },
      include: { 
        FieldOption: true,
        optionNodes: true
      }
    });
    
    console.log('ID:', selectField.id);
    console.log('Label:', selectField.label);
    console.log('Type:', selectField.type);
    
    if (selectField.FieldOption && selectField.FieldOption.length > 0) {
      console.log('\n📋 Options dans FieldOption:');
      selectField.FieldOption.forEach((opt, i) => {
        console.log(`${i+1}. Valeur: "${opt.value}"`);
        console.log(`   Label: "${opt.label}"`);
        console.log(`   ID: ${opt.id}`);
        console.log('');
      });
    }
    
    if (selectField.optionNodes && selectField.optionNodes.length > 0) {
      console.log('\n🌳 Options dans optionNodes:');
      selectField.optionNodes.forEach((node, i) => {
        console.log(`${i+1}. Valeur: "${node.value}"`);
        console.log(`   Label: "${node.label}"`);
        console.log(`   ID: ${node.id}`);
        console.log('');
      });
    }
    
    if ((!selectField.FieldOption || selectField.FieldOption.length === 0) && 
        (!selectField.optionNodes || selectField.optionNodes.length === 0)) {
      console.log('❌ Aucune option trouvée !');
    }
    
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getSelectFieldOptions();
