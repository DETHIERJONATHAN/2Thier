#!/usr/bin/env node

const { Client } = require('pg');

async function findRepeaters() {
  const client = new Client({
    connectionString: 'postgresql://postgres:Jlsl2022%40@localhost:5432/2thier'
  });

  try {
    await client.connect();
    
    const result = await client.query(`
      SELECT id, label, "fieldType", "subType"
      FROM "TreeBranchLeafNode"
      WHERE "fieldType" = 'repeater'
      OR label ILIKE '%repeater%'
      OR label ILIKE '%versant%'
      LIMIT 10
    `);

    console.log(`\n📦 ${result.rows.length} nœud(s) trouvé(s):\n`);
    result.rows.forEach((r, i) => {
      console.log(`${i + 1}. ${r.label}`);
      console.log(`   ID: ${r.id}`);
      console.log(`   fieldType: ${r.fieldType}`);
      console.log(`   subType: ${r.subType}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await client.end();
  }
}

findRepeaters();
