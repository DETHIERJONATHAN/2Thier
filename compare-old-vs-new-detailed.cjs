/**
 * 🔍 Comparaison: Ancien "Orientation - Inclinaison" (fonctionne) VS Nouveau "M² de la toiture" (ne fonctionne pas)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function compare() {
  try {
    console.log('\n🔍 ===== COMPARAISON DÉTAILLÉE =====\n');

    // ANCIEN QUI FONCTIONNE
    const oldId = 'cc8bf34e-3461-426e-a16d-2c1db4ff8a76'; // Orientation - Inclinaison
    const oldField = await prisma.treeBranchLeafNode.findUnique({
      where: { id: oldId },
      include: {
        TreeBranchLeafNodeVariable: true,
        TreeBranchLeafNodeFormula: true,
        TreeBranchLeafNodeCondition: true
      }
    });

    // NOUVEAU QUI NE FONCTIONNE PAS
    const newId = '965b1e18-3f0e-483f-ba03-81b4dd2d6236'; // M² de la toiture
    const newField = await prisma.treeBranchLeafNode.findUnique({
      where: { id: newId },
      include: {
        TreeBranchLeafNodeVariable: true,
        TreeBranchLeafNodeFormula: true,
        TreeBranchLeafNodeCondition: true
      }
    });

    console.log('✅ ===== ANCIEN CHAMP QUI FONCTIONNE =====');
    console.log(`Label: "${oldField.label}"`);
    console.log(`ID: ${oldField.id}`);
    console.log(`\n📊 CONFIGURATION COMPLÈTE:`);
    console.log(JSON.stringify({
      tbl_capacity: oldField.tbl_capacity,
      tbl_code: oldField.tbl_code,
      type: oldField.type,
      hasData: oldField.hasData,
      hasFormula: oldField.hasFormula,
      hasCondition: oldField.hasCondition,
      fieldConfig: oldField.fieldConfig,
      capabilities: oldField.capabilities,
      properties: oldField.properties,
      variable: oldField.TreeBranchLeafNodeVariable ? {
        sourceRef: oldField.TreeBranchLeafNodeVariable.sourceRef,
        sourceType: oldField.TreeBranchLeafNodeVariable.sourceType,
        exposedKey: oldField.TreeBranchLeafNodeVariable.exposedKey
      } : null,
      formulas: oldField.TreeBranchLeafNodeFormula.map(f => ({
        id: f.id,
        name: f.name,
        tokens: f.tokens
      }))
    }, null, 2));

    console.log('\n\n❌ ===== NOUVEAU CHAMP QUI NE FONCTIONNE PAS =====');
    console.log(`Label: "${newField.label}"`);
    console.log(`ID: ${newField.id}`);
    console.log(`\n📊 CONFIGURATION COMPLÈTE:`);
    console.log(JSON.stringify({
      tbl_capacity: newField.tbl_capacity,
      tbl_code: newField.tbl_code,
      type: newField.type,
      hasData: newField.hasData,
      hasFormula: newField.hasFormula,
      hasCondition: newField.hasCondition,
      fieldConfig: newField.fieldConfig,
      capabilities: newField.capabilities,
      properties: newField.properties,
      variable: newField.TreeBranchLeafNodeVariable ? {
        sourceRef: newField.TreeBranchLeafNodeVariable.sourceRef,
        sourceType: newField.TreeBranchLeafNodeVariable.sourceType,
        exposedKey: newField.TreeBranchLeafNodeVariable.exposedKey
      } : null,
      formulas: newField.TreeBranchLeafNodeFormula.map(f => ({
        id: f.id,
        name: f.name,
        tokens: f.tokens
      }))
    }, null, 2));

    // ANALYSE DES DIFFÉRENCES
    console.log('\n\n🔎 ===== DIFFÉRENCES CRITIQUES =====\n');

    const diffs = [];

    if (oldField.tbl_capacity !== newField.tbl_capacity) {
      diffs.push({
        field: 'tbl_capacity',
        old: oldField.tbl_capacity,
        new: newField.tbl_capacity,
        critical: true
      });
    }

    if (oldField.tbl_code !== newField.tbl_code) {
      diffs.push({
        field: 'tbl_code',
        old: oldField.tbl_code,
        new: newField.tbl_code,
        critical: false
      });
    }

    if (JSON.stringify(oldField.fieldConfig) !== JSON.stringify(newField.fieldConfig)) {
      diffs.push({
        field: 'fieldConfig',
        old: oldField.fieldConfig,
        new: newField.fieldConfig,
        critical: true
      });
    }

    if (JSON.stringify(oldField.capabilities) !== JSON.stringify(newField.capabilities)) {
      diffs.push({
        field: 'capabilities',
        old: oldField.capabilities,
        new: newField.capabilities,
        critical: true
      });
    }

    if (JSON.stringify(oldField.properties) !== JSON.stringify(newField.properties)) {
      diffs.push({
        field: 'properties',
        old: oldField.properties,
        new: newField.properties,
        critical: false
      });
    }

    diffs.forEach((diff, i) => {
      console.log(`${diff.critical ? '🔥' : '⚠️'} DIFFÉRENCE ${i + 1}: ${diff.field}`);
      console.log(`   ANCIEN (qui fonctionne):`, JSON.stringify(diff.old, null, 2));
      console.log(`   NOUVEAU (ne fonctionne pas):`, JSON.stringify(diff.new, null, 2));
      console.log('');
    });

    console.log('\n💡 ===== SOLUTION =====\n');
    console.log('Pour corriger "M² de la toiture", il faut:');
    diffs.filter(d => d.critical).forEach((diff, i) => {
      console.log(`${i + 1}. Copier ${diff.field} de l'ancien champ`);
    });

    console.log('\n🛠️ Commande SQL pour corriger:');
    console.log(`UPDATE "TreeBranchLeafNode" SET`);
    if (diffs.some(d => d.field === 'tbl_capacity')) {
      console.log(`  tbl_capacity = 2,`);
    }
    console.log(`WHERE id = '${newId}';`);

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

compare();
