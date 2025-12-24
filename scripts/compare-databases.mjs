// Script de comparaison des bases de données Local vs Cloud SQL
// Usage: node scripts/compare-databases.mjs

import pkg from 'pg';
const { Client } = pkg;

const LOCAL_CONFIG = {
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'Jlsl2022@',
  database: '2thier'
};

const CLOUD_CONFIG = {
  host: '34.52.131.199',
  port: 5432,
  user: 'postgres',
  password: 'Jlsl2022@',
  database: '2thier'
};

async function getTableCounts(client, dbName) {
  // Liste toutes les tables
  const tablesResult = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  
  const counts = {};
  for (const row of tablesResult.rows) {
    const tableName = row.table_name;
    try {
      const countResult = await client.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
      counts[tableName] = parseInt(countResult.rows[0].count);
    } catch (e) {
      counts[tableName] = `ERROR: ${e.message}`;
    }
  }
  return counts;
}

async function main() {
  console.log('🔍 COMPARAISON DES BASES DE DONNÉES\n');
  console.log('='.repeat(70));
  
  const localClient = new Client(LOCAL_CONFIG);
  const cloudClient = new Client(CLOUD_CONFIG);
  
  try {
    console.log('\n📊 Connexion aux bases de données...');
    await localClient.connect();
    console.log('  ✅ Local (localhost) connecté');
    await cloudClient.connect();
    console.log('  ✅ Cloud SQL (34.52.131.199) connecté');
    
    console.log('\n📊 Récupération des comptages...\n');
    
    const localCounts = await getTableCounts(localClient, 'Local');
    const cloudCounts = await getTableCounts(cloudClient, 'Cloud');
    
    // Toutes les tables
    const allTables = [...new Set([...Object.keys(localCounts), ...Object.keys(cloudCounts)])].sort();
    
    console.log('='.repeat(70));
    console.log(`${'TABLE'.padEnd(40)} | ${'LOCAL'.padStart(8)} | ${'CLOUD'.padStart(8)} | STATUS`);
    console.log('='.repeat(70));
    
    let identical = 0;
    let different = 0;
    let errors = 0;
    
    for (const table of allTables) {
      const local = localCounts[table] ?? 'MISSING';
      const cloud = cloudCounts[table] ?? 'MISSING';
      
      let status = '';
      if (typeof local === 'string' && local.startsWith('ERROR')) {
        status = '❌ ERROR';
        errors++;
      } else if (typeof cloud === 'string' && cloud.startsWith('ERROR')) {
        status = '❌ ERROR';
        errors++;
      } else if (local === cloud) {
        status = '✅ OK';
        identical++;
      } else {
        status = '⚠️ DIFF';
        different++;
      }
      
      const localStr = typeof local === 'number' ? local.toString().padStart(8) : local.toString().substring(0, 8).padStart(8);
      const cloudStr = typeof cloud === 'number' ? cloud.toString().padStart(8) : cloud.toString().substring(0, 8).padStart(8);
      
      console.log(`${table.padEnd(40)} | ${localStr} | ${cloudStr} | ${status}`);
    }
    
    console.log('='.repeat(70));
    console.log(`\n📊 RÉSUMÉ:`);
    console.log(`   Total tables: ${allTables.length}`);
    console.log(`   ✅ Identiques: ${identical}`);
    console.log(`   ⚠️ Différentes: ${different}`);
    console.log(`   ❌ Erreurs: ${errors}`);
    
    if (different === 0 && errors === 0) {
      console.log('\n🎉 LES DEUX BASES SONT IDENTIQUES !');
    } else {
      console.log('\n⚠️ LES BASES SONT DIFFÉRENTES - RESYNC NÉCESSAIRE');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await localClient.end();
    await cloudClient.end();
  }
}

main();
