/**
 * Script de diagnostic : Vérifier si les capacités sont copiées lors de la duplication
 */

const { PrismaClient } = require('../node_modules/.prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 DIAGNOSTIC COPIE DE CAPACITÉS\n');

  // 1. Chercher toutes les variables avec suffix -1
  const variablesCopiees = await prisma.treeBranchLeaf.findMany({
    where: {
      id: {
        endsWith: '-1'
      },
      type: 'leaf'
    },
    select: {
      id: true,
      label: true,
      sourceRef: true,
      parentId: true
    }
  });

  console.log(`📊 ${variablesCopiees.length} variables copiées trouvées (-1):\n`);

  for (const variable of variablesCopiees) {
    console.log(`\n🔹 Variable: ${variable.label} (${variable.id})`);
    console.log(`   sourceRef: ${variable.sourceRef}`);
    console.log(`   parentId: ${variable.parentId}`);

    if (!variable.sourceRef) {
      console.log('   ⚠️  Pas de sourceRef');
      continue;
    }

    // Extraire l'ID de capacité du sourceRef
    let capacityId = null;
    let capacityType = null;

    if (variable.sourceRef.startsWith('node-formula:')) {
      capacityType = 'formula';
      capacityId = variable.sourceRef.replace('node-formula:', '');
    } else if (variable.sourceRef.startsWith('condition:')) {
      capacityType = 'condition';
      capacityId = variable.sourceRef.replace('condition:', '');
    } else if (variable.sourceRef.startsWith('@table.')) {
      capacityType = 'table';
      capacityId = variable.sourceRef.replace('@table.', '');
    }

    if (capacityId) {
      console.log(`   🎯 Capacité détectée: ${capacityType} (${capacityId})`);

      // Vérifier si la capacité existe
      let exists = false;

      if (capacityType === 'formula') {
        const formula = await prisma.nodeFormula.findUnique({
          where: { id: capacityId },
          select: { id: true, name: true }
        });
        if (formula) {
          console.log(`   ✅ Formule EXISTE: ${formula.name}`);
          exists = true;
        } else {
          console.log(`   ❌ Formule INTROUVABLE !`);
        }
      } else if (capacityType === 'condition') {
        const condition = await prisma.nodeCondition.findUnique({
          where: { id: capacityId },
          select: { id: true, name: true }
        });
        if (condition) {
          console.log(`   ✅ Condition EXISTE: ${condition.name}`);
          exists = true;
        } else {
          console.log(`   ❌ Condition INTROUVABLE !`);
        }
      } else if (capacityType === 'table') {
        const table = await prisma.tableDedicatedStorage.findUnique({
          where: { id: capacityId },
          select: { id: true, name: true }
        });
        if (table) {
          console.log(`   ✅ Table EXISTE: ${table.name}`);
          exists = true;
        } else {
          console.log(`   ❌ Table INTROUVABLE !`);
        }
      }

      if (!exists) {
        // Chercher la capacité originale (sans -1)
        const originalCapacityId = capacityId.replace(/-1$/, '');
        console.log(`   🔍 Recherche de l'original: ${originalCapacityId}`);

        if (capacityType === 'formula') {
          const originalFormula = await prisma.nodeFormula.findUnique({
            where: { id: originalCapacityId },
            select: { id: true, name: true, tokens: true }
          });
          if (originalFormula) {
            console.log(`   ✅ Formule originale TROUVÉE: ${originalFormula.name}`);
            console.log(`      Tokens: ${JSON.stringify(originalFormula.tokens)}`);
          }
        } else if (capacityType === 'table') {
          const originalTable = await prisma.tableDedicatedStorage.findUnique({
            where: { id: originalCapacityId },
            select: { id: true, name: true }
          });
          if (originalTable) {
            console.log(`   ✅ Table originale TROUVÉE: ${originalTable.name}`);
          }
        }
      }
    }
  }

  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📈 RÉSUMÉ');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`Total variables copiées: ${variablesCopiees.length}`);

  // Compter les capacités manquantes
  let formulasMissing = 0;
  let conditionsMissing = 0;
  let tablesMissing = 0;

  for (const variable of variablesCopiees) {
    if (!variable.sourceRef) continue;

    let capacityId = null;
    if (variable.sourceRef.startsWith('node-formula:')) {
      capacityId = variable.sourceRef.replace('node-formula:', '');
      const exists = await prisma.nodeFormula.findUnique({ where: { id: capacityId } });
      if (!exists) formulasMissing++;
    } else if (variable.sourceRef.startsWith('condition:')) {
      capacityId = variable.sourceRef.replace('condition:', '');
      const exists = await prisma.nodeCondition.findUnique({ where: { id: capacityId } });
      if (!exists) conditionsMissing++;
    } else if (variable.sourceRef.startsWith('@table.')) {
      capacityId = variable.sourceRef.replace('@table.', '');
      const exists = await prisma.tableDedicatedStorage.findUnique({ where: { id: capacityId } });
      if (!exists) tablesMissing++;
    }
  }

  console.log(`❌ Formules manquantes: ${formulasMissing}`);
  console.log(`❌ Conditions manquantes: ${conditionsMissing}`);
  console.log(`❌ Tables manquantes: ${tablesMissing}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
