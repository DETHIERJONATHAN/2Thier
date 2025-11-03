#!/usr/bin/env node
/**
 * Script pour réinitialiser la base de données Google Cloud SQL
 * ⚠️  ATTENTION: Ceci supprime TOUTES les données de la Cloud BD!
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const CLOUD_INSTANCE = 'crm-db';
const CLOUD_PROJECT = 'thiernew';
const CLOUD_DB = '2thier';
const CLOUD_USER = 'postgres';

(async () => {
  try {
    console.log('🗑️  Réinitialisation de Google Cloud SQL...\n');

    // Étape 1: Vérifier que l'instance existe
    console.log('1️⃣  Vérification de l\'instance Cloud SQL...');
    const { stdout: instances } = await execAsync(
      `gcloud sql instances list --project=${CLOUD_PROJECT} --filter="name:${CLOUD_INSTANCE}" --format="value(name)"`
    );
    
    if (!instances.includes(CLOUD_INSTANCE)) {
      console.error(`❌ Instance '${CLOUD_INSTANCE}' introuvable!`);
      process.exit(1);
    }
    console.log(`✅ Instance trouvée: ${CLOUD_INSTANCE}`);

    // Étape 2: Récupérer le mot de passe Cloud SQL
    console.log('\n2️⃣  Récupération du mot de passe Cloud SQL...');
    const { stdout: secretValue } = await execAsync(
      `gcloud secrets versions access latest --secret=crm-postgres-password --project=${CLOUD_PROJECT}`
    );
    const CLOUD_PASSWORD = secretValue.trim();
    console.log(`✅ Mot de passe récupéré (${CLOUD_PASSWORD.length} caractères)`);

    // Étape 2b: Se connecter et tuer les connexions
    console.log('\n2️⃣ Suppression de la base de données Cloud...');
    console.log('  Étape 2a: Fermeture des connexions existantes...');
    try {
      // Utiliser Cloud SQL Proxy ou psql direct
      const { stdout: proxyIP } = await execAsync(
        `gcloud sql instances describe ${CLOUD_INSTANCE} --project=${CLOUD_PROJECT} --format="value(ipAddresses[0].ipAddress)"`
      );
      const IP = proxyIP.trim();
      
      // Tenter de tuer les connexions via SQL
      const psqlCmd = `PGPASSWORD="${CLOUD_PASSWORD}" psql -h ${IP} -U ${CLOUD_USER} -d 2thier -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '2thier' AND pid <> pg_backend_pid();"`;
      
      try {
        const { stdout: killResult } = await execAsync(psqlCmd);
        console.log(`  ✅ Connexions fermées`);
      } catch (psqlErr) {
        console.log(`  ⚠️  Impossible de tuer les connexions via psql (peut être normal)`);
      }
    } catch (err) {
      console.log(`  ⚠️  Erreur lors de la fermeture des connexions`);
    }

    // Étape 2c: Suppression
    console.log('  Étape 2b: Suppression de la base de données...');
    try {
      await execAsync(
        `gcloud sql databases delete ${CLOUD_DB} --instance=${CLOUD_INSTANCE} --project=${CLOUD_PROJECT} --quiet`
      );
      console.log(`✅ Base de données '${CLOUD_DB}' supprimée`);
    } catch (e) {
      if (e.stderr.includes('does not exist')) {
        console.log(`⚠️  Base de données '${CLOUD_DB}' n'existait pas`);
      } else {
        throw e;
      }
    }

    // Étape 3: Recréer la base de données
    console.log('\n3️⃣  Création de la base de données Cloud...');
    await execAsync(
      `gcloud sql databases create ${CLOUD_DB} --instance=${CLOUD_INSTANCE} --project=${CLOUD_PROJECT}`
    );
    console.log(`✅ Base de données '${CLOUD_DB}' créée`);

    // Étape 4: Afficher les infos de connexion
    console.log('\n4️⃣  Récupération des informations de connexion...');
    const { stdout: instanceInfo } = await execAsync(
      `gcloud sql instances describe ${CLOUD_INSTANCE} --project=${CLOUD_PROJECT} --format="value(ipAddresses[0].ipAddress,databaseVersion)"`
    );
    const [ipAddress, dbVersion] = instanceInfo.trim().split('\n');
    
    console.log(`✅ IP publique: ${ipAddress}`);
    console.log(`✅ Version: ${dbVersion}`);

    console.log('\n' + '='.repeat(60));
    console.log('✨ Prochaines étapes:');
    console.log('='.repeat(60));
    console.log('\n1. CONNECTION STRING pour Prisma:');
    console.log(`   PostgreSQL: postgresql://${CLOUD_USER}:PASSWORD@${ipAddress}:5432/${CLOUD_DB}`);
    console.log('\n2. Depuis votre local, exécuter:');
    console.log(`   DATABASE_URL="postgresql://${CLOUD_USER}:PASSWORD@${ipAddress}:5432/${CLOUD_DB}" npx prisma migrate deploy`);
    console.log('\n3. Puis optionnellement:');
    console.log(`   DATABASE_URL="postgresql://${CLOUD_USER}:PASSWORD@${ipAddress}:5432/${CLOUD_DB}" npx prisma db seed`);
    console.log('\n⚠️  Remplacez PASSWORD par votre mot de passe PostgreSQL Cloud');
    console.log('='.repeat(60));

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (error.stderr) {
      console.error('Details:', error.stderr);
    }
    process.exit(1);
  }
})();
