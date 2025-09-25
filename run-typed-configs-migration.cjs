const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function runMigration() {
  console.log('🚀 Début de la migration des tables de configuration typées...');
  
  try {
    // Lire le fichier SQL
    const sqlPath = path.join(__dirname, 'add-typed-field-configs.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Diviser le SQL en commandes séparées
    const sqlCommands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`📝 Exécution de ${sqlCommands.length} commandes SQL...`);
    
    // Exécuter chaque commande
    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i];
      if (command) {
        console.log(`   ${i + 1}/${sqlCommands.length}: ${command.substring(0, 50)}...`);
        try {
          await prisma.$executeRawUnsafe(command);
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(`   ⚠️  Table déjà existante, ignorée`);
          } else {
            throw error;
          }
        }
      }
    }
    
    console.log('✅ Migration SQL terminée avec succès !');
    
    // Régénérer le client Prisma
    console.log('🔄 Régénération du client Prisma...');
    const { exec } = require('child_process');
    
    await new Promise((resolve, reject) => {
      exec('npx prisma generate', (error, stdout, stderr) => {
        if (error) {
          console.error('❌ Erreur lors de la génération Prisma:', error);
          reject(error);
        } else {
          console.log('✅ Client Prisma régénéré !');
          console.log(stdout);
          resolve();
        }
      });
    });
    
    // Test de la nouvelle structure
    console.log('🧪 Test de la nouvelle structure...');
    
    const nodeCount = await prisma.treeBranchLeafNode.count();
    console.log(`📊 Nombre de nœuds existants: ${nodeCount}`);
    
    const configCounts = await Promise.all([
      prisma.treeBranchLeafTextConfig.count(),
      prisma.treeBranchLeafNumberConfig.count(),
      prisma.treeBranchLeafSelectConfig.count(),
      prisma.treeBranchLeafDateConfig.count(),
      prisma.treeBranchLeafFormulaConfig.count(),
    ]);
    
    console.log(`📊 Configurations typées:`);
    console.log(`   - Text: ${configCounts[0]}`);
    console.log(`   - Number: ${configCounts[1]}`);
    console.log(`   - Select: ${configCounts[2]}`);
    console.log(`   - Date: ${configCounts[3]}`);
    console.log(`   - Formula: ${configCounts[4]}`);
    
    console.log('🎉 Migration complète terminée avec succès !');
    console.log('');
    console.log('💡 Prochaines étapes:');
    console.log('   1. Vous pouvez maintenant créer des configurations typées');
    console.log('   2. Les anciennes configurations JSON restent compatibles');
    console.log('   3. Migrez progressivement vers les nouvelles tables');
    
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Fonction utilitaire pour migrer les données existantes
async function migrateExistingData() {
  console.log('🔄 Migration des données existantes...');
  
  try {
    // Migrer les champs texte
    const textNodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        type: 'leaf',
        subType: 'field',
        fieldConfig: {
          path: ['inputType'],
          equals: 'text'
        }
      }
    });
    
    console.log(`📝 Migration de ${textNodes.length} champs texte...`);
    
    for (const node of textNodes) {
      const fieldConfig = node.fieldConfig;
      await prisma.treeBranchLeafTextConfig.upsert({
        where: { nodeId: node.id },
        create: {
          nodeId: node.id,
          maxLength: fieldConfig?.maxLength ? parseInt(fieldConfig.maxLength) : null,
          minLength: fieldConfig?.minLength ? parseInt(fieldConfig.minLength) : null,
          placeholder: fieldConfig?.placeholder || null,
          validation: fieldConfig?.pattern || null,
          isMultiline: fieldConfig?.multiline || false,
        },
        update: {
          maxLength: fieldConfig?.maxLength ? parseInt(fieldConfig.maxLength) : null,
          minLength: fieldConfig?.minLength ? parseInt(fieldConfig.minLength) : null,
          placeholder: fieldConfig?.placeholder || null,
          validation: fieldConfig?.pattern || null,
          isMultiline: fieldConfig?.multiline || false,
        }
      });
    }
    
    // Migrer les champs numériques
    const numberNodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        type: 'leaf',
        subType: 'field',
        fieldConfig: {
          path: ['inputType'],
          equals: 'number'
        }
      }
    });
    
    console.log(`🔢 Migration de ${numberNodes.length} champs numériques...`);
    
    for (const node of numberNodes) {
      const fieldConfig = node.fieldConfig;
      await prisma.treeBranchLeafNumberConfig.upsert({
        where: { nodeId: node.id },
        create: {
          nodeId: node.id,
          min: fieldConfig?.min ? parseFloat(fieldConfig.min) : null,
          max: fieldConfig?.max ? parseFloat(fieldConfig.max) : null,
          decimals: fieldConfig?.decimals ? parseInt(fieldConfig.decimals) : 2,
          step: fieldConfig?.step ? parseFloat(fieldConfig.step) : 1,
          unit: fieldConfig?.unit || null,
          prefix: fieldConfig?.prefix || null,
          suffix: fieldConfig?.suffix || null,
        },
        update: {
          min: fieldConfig?.min ? parseFloat(fieldConfig.min) : null,
          max: fieldConfig?.max ? parseFloat(fieldConfig.max) : null,
          decimals: fieldConfig?.decimals ? parseInt(fieldConfig.decimals) : 2,
          step: fieldConfig?.step ? parseFloat(fieldConfig.step) : 1,
          unit: fieldConfig?.unit || null,
          prefix: fieldConfig?.prefix || null,
          suffix: fieldConfig?.suffix || null,
        }
      });
    }
    
    console.log('✅ Migration des données terminée !');
    
  } catch (error) {
    console.error('❌ Erreur lors de la migration des données:', error);
  }
}

// Exécution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--migrate-data')) {
    migrateExistingData().then(() => {
      console.log('🎉 Migration des données terminée !');
      process.exit(0);
    });
  } else {
    runMigration().then(() => {
      console.log('🎉 Migration structurelle terminée !');
      process.exit(0);
    });
  }
}

module.exports = { runMigration, migrateExistingData };
