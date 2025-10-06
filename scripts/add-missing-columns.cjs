// Script pour ajouter les colonnes manquantes
const { Client } = require('pg');

async function addMissingColumns() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('✅ Connecté à la base de données');

    // Colonne 1
    console.log('📋 Ajout de text_helpTooltipType...');
    await client.query(`
      ALTER TABLE "TreeBranchLeafNode" 
      ADD COLUMN IF NOT EXISTS "text_helpTooltipType" TEXT DEFAULT 'none'
    `);

    // Colonne 2
    console.log('📋 Ajout de text_helpTooltipText...');
    await client.query(`
      ALTER TABLE "TreeBranchLeafNode" 
      ADD COLUMN IF NOT EXISTS "text_helpTooltipText" TEXT
    `);

    // Colonne 3
    console.log('📋 Ajout de text_helpTooltipImage...');
    await client.query(`
      ALTER TABLE "TreeBranchLeafNode" 
      ADD COLUMN IF NOT EXISTS "text_helpTooltipImage" TEXT
    `);

    // Vérification
    const result = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'TreeBranchLeafNode'
      AND column_name LIKE 'text_help%'
      ORDER BY column_name
    `);

    console.log('✅ Colonnes ajoutées:');
    console.table(result.rows);

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

addMissingColumns();
