const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAllTables() {
  try {
    console.log('🔍 Vérification des tables de la base de données...\n');
    
    // Lister toutes les tables TreeBranchLeaf
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%TreeBranch%'
      ORDER BY table_name
    `;
    
    console.log(`📊 Tables TreeBranchLeaf existantes: ${tables.length}`);
    tables.forEach((table, index) => {
      console.log(`  ${index + 1}. ${table.table_name}`);
    });
    
    // Vérifier les triggers existants
    console.log('\n🔧 Triggers existants:');
    const triggers = await prisma.$queryRaw`
      SELECT trigger_name, event_object_table, action_timing, event_manipulation
      FROM information_schema.triggers 
      WHERE event_object_table LIKE '%TreeBranch%'
      ORDER BY trigger_name
    `;
    
    triggers.forEach((trigger, index) => {
      console.log(`  ${index + 1}. ${trigger.trigger_name} sur ${trigger.event_object_table} (${trigger.action_timing} ${trigger.event_manipulation})`);
    });
    
    // Vérifier les fonctions existantes
    console.log('\n🔧 Fonctions PostgreSQL existantes:');
    const functions = await prisma.$queryRaw`
      SELECT proname, prokind
      FROM pg_proc 
      WHERE proname LIKE '%auto%' 
      OR proname LIKE '%populate%'
      OR proname LIKE '%tree%'
      ORDER BY proname
    `;
    
    functions.forEach((func, index) => {
      console.log(`  ${index + 1}. ${func.proname} (type: ${func.prokind})`);
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllTables();