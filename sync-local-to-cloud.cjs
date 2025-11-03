#!/usr/bin/env node
/**
 * Copier TOUTES les données de local → Cloud en respectant les dépendances
 * Approche: Désactiver les FK, copier, réactiver les FK
 */

const { PrismaClient } = require('@prisma/client');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const CLOUD_PROJECT = 'thiernew';
const CLOUD_IP = '34.52.233.213';

(async () => {
  try {
    console.log('🚀 COPIE ROBUSTE: Local → Google Cloud (avec dépendances)\n');

    // Récupérer le mot de passe
    const { stdout: password } = await execAsync(
      `gcloud secrets versions access latest --secret=crm-postgres-password --project=${CLOUD_PROJECT}`
    );
    const CLOUD_PASSWORD = encodeURIComponent(password.trim());

    // Créer les clients Prisma
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

    console.log('1️⃣  Connexion aux BD...');
    await prismaLocal.$queryRaw`SELECT 1`;
    await prismaCloud.$queryRaw`SELECT 1`;
    console.log('✅\n');

    // Désactiver les contraintes FK
    console.log('2️⃣  Désactivation des contraintes FK sur Cloud...');
    const tables = [
      'TreeBranchLeafNodeFormula', 'TreeBranchLeafNodeCondition', 'TreeBranchLeafNodeVariable',
      'TreeBranchLeafNodeTable', 'TreeBranchLeafNodeTableColumn', 'TreeBranchLeafNodeTableRow',
      'TreeBranchLeafNode', 'TreeBranchLeafTree', 'TreeBranch'
    ];
    for (const t of tables) {
      try {
        await prismaCloud.$executeRawUnsafe(`ALTER TABLE IF EXISTS "${t}" DISABLE TRIGGER ALL`);
      } catch (e) {}
    }
    console.log('✅\n');

    // Vider les tables Cloud
    console.log('3️⃣  Vidage des tables Cloud...');
    const tablesToCopy = [
      'TreeBranchLeafNodeCondition',
      'TreeBranchLeafNodeFormula',
      'TreeBranchLeafNodeVariable',
      'TreeBranchLeafNodeTableRow',
      'TreeBranchLeafNodeTableColumn',
      'TreeBranchLeafNodeTable',
      'TreeBranchLeafNode',
      'TreeBranchLeafTree',
    ];

    for (const table of tablesToCopy) {
      try {
        await prismaCloud.$executeRawUnsafe(`DELETE FROM "${table}"`);
      } catch (e) {
        // Silencieux
      }
    }
    console.log('✅\n');

    // Copier les données table par table
    console.log('4️⃣  Copie des données...\n');
    
    let totalCopied = 0;

    for (const table of tablesToCopy) {
      try {
        // Obtenir les données
        const records = await prismaLocal.$queryRawUnsafe(`
          SELECT * FROM "${table}"
        `);

        if (records.length === 0) {
          console.log(`   ${table}: 0 enregistrements`);
          continue;
        }

        // Insérer en une seule requête (COPY is better but using INSERT for Prisma compatibility)
        const columns = Object.keys(records[0]);
        const columnList = columns.join('", "');
        const columnRefs = '("' + columnList + '")';

        // Utiliser COPY ou multi-row INSERT pour la performance
        const values = records.map(r => {
          return '(' + columns.map(col => {
            const v = r[col];
            if (v === null) return 'NULL';
            if (v === true) return 'true';
            if (v === false) return 'false';
            if (typeof v === 'number') return v.toString();
            if (typeof v === 'object') {
              const jsonStr = JSON.stringify(v).replace(/'/g, "''");
              return `'${jsonStr}'`;
            }
            const str = (v + '').replace(/'/g, "''");
            return `'${str}'`;
          }).join(', ') + ')';
        }).join(',');

        const sql = `INSERT INTO "${table}" ${columnRefs} VALUES ${values} ON CONFLICT DO NOTHING`;
        
        await prismaCloud.$executeRawUnsafe(sql);
        console.log(`   ✅ ${table}: ${records.length} enregistrements`);
        totalCopied += records.length;
      } catch (e) {
        console.log(`   ⚠️  ${table}: ${e.message.substring(0, 60)}`);
      }
    }

    // Réactiver les FK
    console.log('\n5️⃣  Réactivation des contraintes FK...');
    for (const t of tables) {
      try {
        await prismaCloud.$executeRawUnsafe(`ALTER TABLE IF EXISTS "${t}" ENABLE TRIGGER ALL`);
      } catch (e) {}
    }
    console.log('✅\n');

    // Vérification
    console.log('6️⃣  VÉRIFICATION:\n');
    const checks = [
      { table: 'TreeBranchLeafNode', expected: 134 },
      { table: 'TreeBranchLeafNodeTableRow', expected: 43186 }
    ];

    for (const check of checks) {
      const local = await prismaLocal.$queryRawUnsafe(`SELECT COUNT(*) as c FROM "${check.table}"`);
      const cloud = await prismaCloud.$queryRawUnsafe(`SELECT COUNT(*) as c FROM "${check.table}"`);
      const lCount = local[0]?.c || 0;
      const cCount = cloud[0]?.c || 0;
      const ok = lCount === cCount ? '✅' : '⚠️';
      console.log(`${ok} ${check.table}:`);
      console.log(`   Local: ${lCount} | Cloud: ${cCount}\n`);
    }

    console.log('='.repeat(60));
    console.log('✨ SYNC COMPLÉTÉE!');
    console.log('='.repeat(60));

    await prismaLocal.$disconnect();
    await prismaCloud.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    process.exit(1);
  }
})();
