import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 [ANALYSIS] Recherche de la section "Versant"...\n');
    
    // Trouver la section "Versant"
    const versantSection = await prisma.treebranchleafnode.findFirst({
      where: {
        OR: [
          { label: { contains: 'Versant' } },
          { label: { contains: 'versant' } }
        ],
        type: 'leaf_section'
      }
    });

    if (!versantSection) {
      console.log('❌ Section "Versant" non trouvée');
      return;
    }

    console.log(`✅ Section trouvée: "${versantSection.label}" (${versantSection.id})\n`);

    // Chercher le cascader dans cette section
    const cascaderField = await prisma.treebranchleafnode.findFirst({
      where: {
        parentId: versantSection.id,
        OR: [
          { fieldType: 'leaf_cascader' },
          { fieldType: 'LEAF_CASCADER' },
          { type: { contains: 'cascader' } }
        ]
      }
    });

    if (!cascaderField) {
      console.log('❌ Cascader non trouvé dans cette section');
      return;
    }

    console.log(`✅ Cascader trouvé: "${cascaderField.label}" (${cascaderField.id})\n`);

    // ÉTAPE 1: Chercher TOUTES les options du cascader (à l'infini)
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 ÉTAPE 1: TOUTES les options du cascader (à l\'infini)');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const getAllCascaderOptions = async (parentId: string, level: number = 0): Promise<Array<{ id: string; label: string; level: number; sharedReferenceIds: string[] }>> => {
      const children = await prisma.treebranchleafnode.findMany({
        where: { parentId },
        orderBy: { label: 'asc' }
      });

      const results: Array<{ id: string; label: string; level: number; sharedReferenceIds: string[] }> = [];
      for (const child of children) {
        const indent = '  '.repeat(level);
        console.log(`${indent}├─ "${child.label}" (${child.id})`);
        
        const sharedRefIds = Array.isArray((child as any).sharedReferenceIds) ? (child as any).sharedReferenceIds : [];
        if (sharedRefIds.length > 0) {
          console.log(`${indent}│  └─ sharedReferenceIds: [${sharedRefIds.join(', ')}]`);
        }
        
        results.push({
          id: child.id,
          label: child.label,
          level,
          sharedReferenceIds: sharedRefIds
        });

        // Récursivité: chercher les enfants de cette option
        const grandchildren = await getAllCascaderOptions(child.id, level + 1);
        results.push(...grandchildren);
      }

      return results;
    };

    const allOptions = await getAllCascaderOptions(cascaderField.id);

    console.log(`\n✅ Total d'options trouvées: ${allOptions.length}\n`);

    // ÉTAPE 2: Chercher tous les champs dans la MÊME section qui ont sharedReferenceId
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🔗 ÉTAPE 2: Champs de la section avec sharedReferenceId');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const sectionFields = await prisma.treebranchleafnode.findMany({
      where: {
        parentId: versantSection.id,
        NOT: { id: cascaderField.id }
      }
    });

    console.log(`📋 Total de champs directs dans la section: ${sectionFields.length}\n`);

    const fieldsWithSharedRef = sectionFields.filter(f => {
      const sharedRefIds = Array.isArray((f as any).sharedReferenceIds) ? (f as any).sharedReferenceIds : [];
      return sharedRefIds.length > 0;
    });

    console.log(`✅ Champs avec sharedReferenceId: ${fieldsWithSharedRef.length}\n`);

    fieldsWithSharedRef.forEach((field, idx) => {
      const sharedRefIds = Array.isArray((field as any).sharedReferenceIds) ? (field as any).sharedReferenceIds : [];
      console.log(`${idx + 1}. "${field.label}" (${field.id})`);
      console.log(`   └─ sharedReferenceIds: [${sharedRefIds.join(', ')}]`);
    });

    // ÉTAPE 3: MAPPING COMPLET
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('🎯 ÉTAPE 3: MAPPING COMPLET - Option ↔ Champs');
    console.log('═══════════════════════════════════════════════════════════════\n');

    let totalMappings = 0;
    let optionsWithFields = 0;

    allOptions.forEach((option, idx) => {
      console.log(`${idx + 1}. Option: "${option.label}" (${option.id})`);
      console.log(`   Level: ${option.level}`);
      
      if (option.sharedReferenceIds.length === 0) {
        console.log(`   ❌ Aucun sharedReferenceId dans cette option`);
      } else {
        console.log(`   ✅ sharedReferenceIds: [${option.sharedReferenceIds.join(', ')}]`);

        // Chercher les champs dont le sharedReferenceId correspond à l'ID dans la section
        const matchingFields = fieldsWithSharedRef.filter(f => {
          const fieldSharedRefIds = Array.isArray((f as any).sharedReferenceIds) ? (f as any).sharedReferenceIds : [];
          // Un champ matchne si son ID est dans la liste des sharedReferenceIds de l'option
          return option.sharedReferenceIds.includes(f.id);
        });

        if (matchingFields.length > 0) {
          optionsWithFields++;
          totalMappings += matchingFields.length;
          console.log(`   📌 Champs à afficher (${matchingFields.length}):`);
          matchingFields.forEach(field => {
            const fieldSharedRefIds = Array.isArray((field as any).sharedReferenceIds) ? (field as any).sharedReferenceIds : [];
            console.log(`      └─ "${field.label}" (${field.id})`);
            console.log(`         sharedReferenceIds: [${fieldSharedRefIds.join(', ')}]`);
          });
        } else {
          console.log(`   ⚠️  Aucun champ ne corresponds à ces IDs`);
        }
      }
      console.log();
    });

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 RÉSUMÉ');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Total d'options: ${allOptions.length}`);
    console.log(`Options avec sharedReferenceIds: ${allOptions.filter(o => o.sharedReferenceIds.length > 0).length}`);
    console.log(`Options avec champs correspondants: ${optionsWithFields}`);
    console.log(`Total de mappages (option → champ): ${totalMappings}\n`);

  } catch (error) {
    console.error('❌ Erreur:', error);
    if (error instanceof Error) {
      console.error(error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
