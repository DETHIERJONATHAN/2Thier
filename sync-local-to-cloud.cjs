#!/usr/bin/env node
/**
 * Synchronise toutes les données de la base locale vers Cloud SQL
 */
const { PrismaClient } = require('@prisma/client');

const LOCAL_URL = 'postgresql://postgres:Jlsl2022%40@localhost:5432/2thier';
const CLOUD_URL = 'postgresql://postgres:Jlsl2022%40@34.52.131.199:5432/2thier';

async function sync() {
  console.log('🚀 SYNCHRONISATION: Base locale → Cloud SQL\n');

  const local = new PrismaClient({
    datasources: { db: { url: LOCAL_URL } }
  });

  const cloud = new PrismaClient({
    datasources: { db: { url: CLOUD_URL } }
  });

  try {
    await local.$connect();
    console.log('✅ Base locale connectée');

    await cloud.$connect();
    console.log('✅ Cloud SQL connecté\n');

    // Tables à synchroniser dans l'ordre (respect des foreign keys)
    const syncTasks = [
      { name: 'Organization', model: 'organization' },
      { name: 'User', model: 'user' },
      { name: 'Role', model: 'role' },
      { name: 'UserOrganization', model: 'userOrganization' },
      { name: 'Permission', model: 'permission' },
      { name: 'Module', model: 'module' },
      { name: 'OrganizationModule', model: 'organizationModule' },
      { name: 'Section', model: 'section' },
      { name: 'LeadStatus', model: 'leadStatus' },
      { name: 'Lead', model: 'lead' },
      { name: 'TreeBranch', model: 'treeBranch' },
      { name: 'TreeBranchLeaf', model: 'treeBranchLeaf' },
      { name: 'TreeBranchLeafNode', model: 'treeBranchLeafNode' },
      { name: 'NodeFormula', model: 'nodeFormula' },
      { name: 'NodeVariable', model: 'nodeVariable' },
      { name: 'NodeCondition', model: 'nodeCondition' },
      { name: 'Submission', model: 'submission' },
      { name: 'DocumentTemplate', model: 'documentTemplate' },
      { name: 'DocumentTheme', model: 'documentTheme' },
      { name: 'DocumentSection', model: 'documentSection' },
    ];

    for (const task of syncTasks) {
      try {
        // Récupérer données locales
        const data = await local[task.model].findMany();
        
        if (data.length === 0) {
          console.log(`⏭️  ${task.name}: vide`);
          continue;
        }

        // Supprimer données cloud existantes
        await cloud[task.model].deleteMany();
        
        // Insérer nouvelles données
        let inserted = 0;
        for (const record of data) {
          try {
            await cloud[task.model].create({ data: record });
            inserted++;
          } catch (e) {
            // Ignorer les erreurs de contrainte (données déjà présentes)
          }
        }
        
        console.log(`✅ ${task.name}: ${inserted}/${data.length} synchronisés`);
      } catch (e) {
        console.log(`❌ ${task.name}: ${e.message.substring(0, 60)}`);
      }
    }

    console.log('\n🎉 Synchronisation terminée!');

  } finally {
    await local.$disconnect();
    await cloud.$disconnect();
  }
}

sync().catch(e => {
  console.error('❌ Erreur fatale:', e.message);
  process.exit(1);
});
