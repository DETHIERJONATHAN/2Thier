#!/usr/bin/env node
/**
 * COPIER TOUTES LES DONNÉES de la BD locale vers Google Cloud SQL
 * Tables: Users, Organizations, TreeBranch, nodes, rows, columns, variables, formulas, ETC!
 */

const { PrismaClient } = require('@prisma/client');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const CLOUD_PROJECT = 'thiernew';
const CLOUD_IP = '34.52.233.213';

(async () => {
  try {
    console.log('🚀 COPIE COMPLÈTE: Local → Google Cloud SQL\n');

    // ÉTAPE 1: Récupérer le mot de passe Cloud
    console.log('1️⃣  Récupération du mot de passe Cloud SQL...');
    const { stdout: password } = await execAsync(
      `gcloud secrets versions access latest --secret=crm-postgres-password --project=${CLOUD_PROJECT}`
    );
    const CLOUD_PASSWORD = encodeURIComponent(password.trim());
    console.log('✅\n');

    // ÉTAPE 2: Créer les clients Prisma (local + cloud)
    console.log('2️⃣  Connexion aux bases de données...');
    const prismaLocal = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'postgresql://postgres:Jlsl2022%40@localhost:5432/2thier'
        }
      }
    });

    const prismaCloud = new PrismaClient({
      datasources: {
        db: {
          url: `postgresql://postgres:${CLOUD_PASSWORD}@${CLOUD_IP}:5432/2thier`
        }
      }
    });

    // Tester les connexions
    try {
      await prismaLocal.$queryRaw`SELECT 1`;
      console.log('   ✅ Connexion locale OK');
    } catch (e) {
      throw new Error('❌ Impossible de se connecter à la BD locale');
    }

    try {
      await prismaCloud.$queryRaw`SELECT 1`;
      console.log('   ✅ Connexion Cloud OK\n');
    } catch (e) {
      throw new Error('❌ Impossible de se connecter à Cloud SQL');
    }

    // ÉTAPE 3: Copier TOUTES les données
    console.log('3️⃣  COPIE DES DONNÉES...\n');

    // Liste complète des tables à copier (dans l'ordre de dépendance)
    const tablesToCopy = [
      { name: 'User', model: 'user' },
      { name: 'Organization', model: 'organization' },
      { name: 'TreeBranch', model: 'treeBranch' },
      { name: 'TreeBranchLeafTree', model: 'treeBranchLeafTree' },
      { name: 'TreeBranchLeafNode', model: 'treeBranchLeafNode' },
      { name: 'TreeBranchLeafNodeTable', model: 'treeBranchLeafNodeTable' },
      { name: 'TreeBranchLeafNodeTableColumn', model: 'treeBranchLeafNodeTableColumn' },
      { name: 'TreeBranchLeafNodeTableRow', model: 'treeBranchLeafNodeTableRow' },
      { name: 'TreeBranchLeafNodeVariable', model: 'treeBranchLeafNodeVariable' },
      { name: 'TreeBranchLeafNodeFormula', model: 'treeBranchLeafNodeFormula' },
      { name: 'TreeBranchLeafNodeCondition', model: 'treeBranchLeafNodeCondition' },
      { name: 'TreeBranchLeafSubmission', model: 'treeBranchLeafSubmission' },
    ];

    let totalCopied = 0;

    for (const table of tablesToCopy) {
      try {
        // Vider la table Cloud d'abord
        await prismaCloud.$executeRawUnsafe(`DELETE FROM "${table.name}"`);

        // Récupérer les données locales
        const localRecords = await prismaLocal.$queryRawUnsafe(`SELECT * FROM "${table.name}"`);
        
        if (localRecords.length === 0) {
          console.log(`   ⏭️  ${table.name}: vide (0 enregistrements)`);
          continue;
        }

        // Copier les données
        if (localRecords.length > 0) {
          // Construire l'INSERT
          const columns = Object.keys(localRecords[0]);
          const columnList = columns.map(c => `"${c}"`).join(', ');
          
          // Insérer par batch de 100
          const batchSize = 100;
          let inserted = 0;
          
          for (let i = 0; i < localRecords.length; i += batchSize) {
            const batch = localRecords.slice(i, i + batchSize);
            
            const values = batch.map(record => {
              return '(' + columns.map(col => {
                const val = record[col];
                if (val === null) return 'NULL';
                if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
                if (typeof val === 'boolean') return val ? 'true' : 'false';
                if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
                return val;
              }).join(', ') + ')';
            }).join(', ');

            const sql = `INSERT INTO "${table.name}" (${columnList}) VALUES ${values}`;
            
            try {
              await prismaCloud.$executeRawUnsafe(sql);
              inserted += batch.length;
            } catch (e) {
              console.log(`     ⚠️  Erreur lors de l'insertion du batch ${i}-${i+batchSize}`);
            }
          }

          console.log(`   ✅ ${table.name}: ${inserted} enregistrements copiés`);
          totalCopied += inserted;
        }
      } catch (e) {
        console.log(`   ⚠️  ${table.name}: ${e.message.substring(0, 50)}`);
      }
    }

    console.log(`\n4️⃣  RÉSUMÉ:\n`);
    console.log(`✅ Total enregistrements copiés: ${totalCopied}`);

    // Vérifier les counts
    console.log(`\n5️⃣  VÉRIFICATION DES DONNÉES:\n`);
    const checkTables = ['User', 'Organization', 'TreeBranchLeafNode', 'TreeBranchLeafNodeTableRow'];
    
    for (const tableName of checkTables) {
      const localCount = await prismaLocal.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${tableName}"`);
      const cloudCount = await prismaCloud.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${tableName}"`);
      
      const localNum = localCount[0]?.count || 0;
      const cloudNum = cloudCount[0]?.count || 0;
      const match = localNum === cloudNum ? '✅' : '⚠️';
      
      console.log(`${match} ${tableName}:`);
      console.log(`   Local: ${localNum}`);
      console.log(`   Cloud: ${cloudNum}\n`);
    }

    console.log('='.repeat(60));
    console.log('✨ COPIE COMPLÉTÉE!');
    console.log('='.repeat(60));

    await prismaLocal.$disconnect();
    await prismaCloud.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    process.exit(1);
  }
})();
