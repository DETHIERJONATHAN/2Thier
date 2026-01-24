#!/usr/bin/env node
/**
 * SCRIPT SIMPLE pour trouver l'ID du champ "Puissance WC-1"
 */
import { db } from './src/lib/database.js';

async function findPuissanceWC1() {
  console.log('\n🔍 RECHERCHE: Champ "Puissance WC-1"\n');

  try {
    // Chercher par label (pas name)
    const field = await db.treeBranchLeafNode.findFirst({
      where: {
        label: {
          contains: 'Puissance WC-1'
        }
      },
      select: {
        id: true,
        label: true,
        type: true,
        fieldType: true,
        hasTable: true,
        metadata: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (field) {
      console.log('✅ TROUVÉ:\n');
      console.log(`   ID: ${field.id}`);
      console.log(`   Label: ${field.label}`);
      console.log(`   Type: ${field.type}`);
      console.log(`   FieldType: ${field.fieldType}`);
      console.log(`   HasTable: ${field.hasTable}`);
      console.log(`   Créé: ${field.createdAt}`);
      console.log(`   Modifié: ${field.updatedAt}`);
      console.log(`\n📋 Metadata:`, JSON.stringify(field.metadata, null, 2));

      // Maintenant chercher la config SelectConfig
      console.log('\n\n🔗 RECHERCHE: SelectConfig pour ce champ\n');
      const selectConfig = await db.treeBranchLeafSelectConfig.findUnique({
        where: { nodeId: field.id }
      });

      if (selectConfig) {
        console.log('✅ SelectConfig TROUVÉ:\n');
        console.log(`   ID: ${selectConfig.id}`);
        console.log(`   NodeID: ${selectConfig.nodeId}`);
        console.log(`   TableReference: ${selectConfig.tableReference}`);
        console.log(`   DisplayColumn: ${selectConfig.displayColumn || '(NULL)'}`);
        console.log(`   KeyColumn: ${selectConfig.keyColumn}`);
        console.log(`   ValueColumn: ${selectConfig.valueColumn}`);
        console.log(`   OptionsSource: ${selectConfig.optionsSource}`);
        console.log(`   Updatedè: ${selectConfig.updatedAt}`);
      } else {
        console.log('❌ SelectConfig NON TROUVÉ!');
      }

      // Afficher le code pour tester Stage 4
      console.log('\n\n═══════════════════════════════════════════════════════════');
      console.log('📝 COMMANDE POUR TESTER STAGE 4 MANUELLEMENT:\n');
      console.log(`node verify-stage4-db.mjs ${field.id}`);
      console.log('\n═══════════════════════════════════════════════════════════\n');

    } else {
      console.log('❌ Champ "Puissance WC-1" NON TROUVÉ');
      
      // Afficher tous les champs Puissance
      console.log('\n📋 Champs disponibles contenant "Puissance":\n');
      const allPuissance = await db.treeBranchLeafNode.findMany({
        where: {
          label: {
            contains: 'Puissance'
          }
        },
        select: {
          id: true,
          label: true,
          fieldType: true,
          hasTable: true
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      });

      allPuissance.forEach(p => {
        console.log(`   - ${p.label} (ID: ${p.id})`);
      });
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    process.exit(0);
  }
}

findPuissanceWC1();
