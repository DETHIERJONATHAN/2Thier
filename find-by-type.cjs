#!/usr/bin/env node

const { Client } = require('pg');

async function findByType() {
  const client = new Client({
    connectionString: 'postgresql://postgres:Jlsl2022%40@localhost:5432/2thier'
  });

  try {
    await client.connect();
    
    const result = await client.query(`
      SELECT id, label, type, "subType", "fieldType"
      FROM "TreeBranchLeafNode"
      WHERE type LIKE '%repeat%' OR "subType" LIKE '%repeat%' OR "fieldType" LIKE '%repeat%'
      LIMIT 20
    `);

    console.log(`\n📦 ${result.rows.length} nœud(s) avec "repeat":\n`);
    result.rows.forEach((r, i) => {
      console.log(`${i + 1}. ${r.label}`);
      console.log(`   type: ${r.type}`);
      console.log(`   subType: ${r.subType}`);
      console.log(`   fieldType: ${r.fieldType}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await client.end();
  }
}

findByType();
