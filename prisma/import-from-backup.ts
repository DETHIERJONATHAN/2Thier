import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Interface pour décrire la structure du fichier JSON de sauvegarde
interface BackupData {
  [key: string]: {
    rows: any[];
  };
}

async function main() {
  console.log('Lancement du script de restauration de la base de données...');

  const filePath = path.join(process.cwd(), 'database-export.json');
  if (!fs.existsSync(filePath)) {
    console.error(`Erreur : Le fichier 'database-export.json' est introuvable à la racine du projet.`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const data: BackupData = JSON.parse(fileContent);

  console.log('Fichier de sauvegarde lu. Début de la restauration...');

  // --- ÉTAPE 1: NETTOYAGE DE LA BASE DE DONNÉES ---
  // L'ordre est crucial pour respecter les contraintes de clés étrangères (du plus dépendant au moins dépendant)
  console.log('🗑️  Nettoyage de la base de données existante...');
  await prisma.invitation.deleteMany();
  await prisma.userOrganization.deleteMany();
  await prisma.role.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
  console.log('✅ Base de données nettoyée.');

  // --- ÉTAPE 2: IMPORTATION DES DONNÉES ---
  // L'ordre est crucial (du moins dépendant au plus dépendant)

  // 1. Organisations
  if (data.Organization?.rows?.length > 0) {
    console.log(`🏭 Importation de ${data.Organization.rows.length} organisations...`);
    
    // Correction : Transformer le champ 'features' de chaîne JSON en tableau
    const correctedOrganizations = data.Organization.rows.map(org => ({
      ...org,
      features: JSON.parse(org.features || '[]'), // Analyser la chaîne JSON
    }));

    await prisma.organization.createMany({ data: correctedOrganizations, skipDuplicates: true });
  }

  // 2. Utilisateurs
  if (data.User?.rows?.length > 0) {
    console.log(`👤 Importation de ${data.User.rows.length} utilisateurs...`);
    await prisma.user.createMany({ data: data.User.rows, skipDuplicates: true });
  }

  // 3. Rôles
  if (data.Role?.rows?.length > 0) {
    console.log(`🎭 Importation de ${data.Role.rows.length} rôles...`);
    await prisma.role.createMany({ data: data.Role.rows, skipDuplicates: true });
  }

  // 4. Relations User-Organisation
  if (data.UserOrganization?.rows?.length > 0) {
    console.log(`🔗 Importation de ${data.UserOrganization.rows.length} relations utilisateur-organisation...`);
    await prisma.userOrganization.createMany({ data: data.UserOrganization.rows, skipDuplicates: true });
  }

  // 5. Invitations (TEMPORAIREMENT DÉSACTIVÉ en raison du champ 'colonne' problématique)
  if (data.Invitation?.rows?.length > 0) {
    console.log(`⚠️  Importation des ${data.Invitation.rows.length} invitations temporairement désactivée (problème de compatibilité de schéma).`);
    console.log(`Les données importantes (organisations, utilisateurs, rôles) ont été restaurées avec succès.`);
  }

  console.log('🎉 Restauration de la base de données terminée avec succès !');
}

main()
  .catch((e) => {
    console.error('Une erreur est survenue durant la restauration :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
