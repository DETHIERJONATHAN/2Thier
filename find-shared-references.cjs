const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function findSharedReferencesInBranches() {
  try {
    console.log('🔍 === RECHERCHE RÉFÉRENCES PARTAGÉES DANS LES BRANCHES ===\n');

    // Trouver tous les champs avec des sharedReferenceIds
    const fieldsWithSharedRefs = await prisma.tBLField.findMany({
      where: {
        sharedReferenceIds: {
          not: null
        }
      },
      select: {
        id: true,
        fieldLabel: true,
        sharedReferenceIds: true,
        fieldType: true
      }
    });

    console.log(`📊 Champs avec sharedReferenceIds: ${fieldsWithSharedRefs.length}\n`);

    for (const field of fieldsWithSharedRefs) {
      console.log(`🎯 "${field.fieldLabel}" (${field.fieldType}): [${field.sharedReferenceIds.join(', ')}]`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Trouver toutes les options avec des sharedReferenceIds
    const optionsWithSharedRefs = await prisma.tBLFieldOption.findMany({
      where: {
        sharedReferenceIds: {
          not: null
        }
      },
      include: {
        field: {
          select: {
            fieldLabel: true,
            fieldType: true
          }
        },
        parentOption: {
          select: {
            optionLabel: true,
            optionValue: true
          }
        },
        childOptions: {
          select: {
            optionLabel: true,
            optionValue: true,
            sharedReferenceIds: true
          }
        }
      }
    });

    console.log(`📊 Options avec sharedReferenceIds: ${optionsWithSharedRefs.length}\n`);

    for (const option of optionsWithSharedRefs) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`🎯 OPTION: "${option.optionLabel}" (${option.optionValue})`);
      console.log(`   🏷️  Champ parent: "${option.field.fieldLabel}" (${option.field.fieldType})`);
      console.log(`   🔗 Parent option: ${option.parentOption ? `"${option.parentOption.optionLabel}"` : 'racine'}`);
      console.log(`   ✅ SharedReferenceIds: [${option.sharedReferenceIds.join(', ')}]`);
      
      if (option.childOptions.length > 0) {
        console.log(`   👶 Enfants (${option.childOptions.length}):`);
        for (const child of option.childOptions) {
          const hasSharedRefs = child.sharedReferenceIds && child.sharedReferenceIds.length > 0;
          console.log(`      - "${child.optionLabel}" ${hasSharedRefs ? `✅ [${child.sharedReferenceIds.join(', ')}]` : '❌'}`);
        }
      }
      console.log('');
    }

    // Construire un mapping des références partagées
    console.log('\n🗺️ === MAPPING COMPLET DES RÉFÉRENCES PARTAGÉES ===\n');
    
    const sharedRefMap = new Map();
    
    // Ajouter les champs
    for (const field of fieldsWithSharedRefs) {
      for (const refId of field.sharedReferenceIds) {
        if (!sharedRefMap.has(refId)) {
          sharedRefMap.set(refId, { fields: [], options: [] });
        }
        sharedRefMap.get(refId).fields.push({
          id: field.id,
          label: field.fieldLabel,
          type: field.fieldType
        });
      }
    }

    // Ajouter les options
    for (const option of optionsWithSharedRefs) {
      for (const refId of option.sharedReferenceIds) {
        if (!sharedRefMap.has(refId)) {
          sharedRefMap.set(refId, { fields: [], options: [] });
        }
        sharedRefMap.get(refId).options.push({
          id: option.id,
          label: option.optionLabel,
          value: option.optionValue,
          fieldLabel: option.field.fieldLabel,
          parentLabel: option.parentOption?.optionLabel
        });
      }
    }

    // Afficher le mapping
    for (const [refId, data] of sharedRefMap.entries()) {
      console.log(`🔗 Référence partagée: ${refId}`);
      
      if (data.fields.length > 0) {
        console.log(`   📋 Utilisée dans ${data.fields.length} champ(s):`);
        for (const field of data.fields) {
          console.log(`      - "${field.label}" (${field.type})`);
        }
      }
      
      if (data.options.length > 0) {
        console.log(`   🎯 Utilisée dans ${data.options.length} option(s):`);
        for (const option of data.options) {
          const path = option.parentLabel ? `${option.fieldLabel} → ${option.parentLabel} → ${option.label}` : `${option.fieldLabel} → ${option.label}`;
          console.log(`      - ${path}`);
        }
      }
      
      console.log('');
    }

  } catch (error) {
    console.error('❌ Erreur lors de la recherche:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Script pour analyser les références d'un champ spécifique
async function analyzeFieldReferences(fieldLabel) {
  try {
    console.log(`🎯 === ANALYSE RÉFÉRENCES DU CHAMP: ${fieldLabel} ===\n`);

    const field = await prisma.tBLField.findFirst({
      where: {
        fieldLabel: fieldLabel
      },
      include: {
        fieldOptions: {
          include: {
            parentOption: true,
            childOptions: true
          }
        }
      }
    });

    if (!field) {
      console.log(`❌ Champ "${fieldLabel}" introuvable`);
      return;
    }

    console.log(`📊 Champ: "${field.fieldLabel}" (${field.fieldType})`);
    console.log(`🔗 SharedReferenceIds du champ: ${field.sharedReferenceIds ? `[${field.sharedReferenceIds.join(', ')}]` : 'aucune'}\n`);

    if (field.fieldOptions.length === 0) {
      console.log(`❌ Aucune option trouvée`);
      return;
    }

    console.log(`📊 Analyse de ${field.fieldOptions.length} options:\n`);

    let optionsWithRefs = 0;
    for (const option of field.fieldOptions) {
      const hasRefs = option.sharedReferenceIds && option.sharedReferenceIds.length > 0;
      if (hasRefs) optionsWithRefs++;

      console.log(`${hasRefs ? '✅' : '❌'} "${option.optionLabel}" (${option.optionValue})`);
      if (hasRefs) {
        console.log(`   🔗 References: [${option.sharedReferenceIds.join(', ')}]`);
      }
      console.log(`   🏷️  Parent: ${option.parentOptionId ? `ID ${option.parentOptionId}` : 'racine'}`);
      console.log(`   👶 Enfants: ${option.childOptions.length}`);
      console.log('');
    }

    console.log(`📊 Résumé: ${optionsWithRefs}/${field.fieldOptions.length} options ont des références partagées`);

  } catch (error) {
    console.error('❌ Erreur lors de l\'analyse du champ:', error);
  }
}

// Execution
const args = process.argv.slice(2);
if (args.length === 0) {
  findSharedReferencesInBranches();
} else {
  const fieldLabel = args[0];
  analyzeFieldReferences(fieldLabel);
}