import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function executeImport() {
  console.log('🚀 IMPORTATION AUTOMATIQUE DE VOS DONNÉES...\n');

  try {
    // 1. Nettoyer la base
    console.log('🗑️ Nettoyage de la base...');
    await prisma.$executeRaw`DELETE FROM "Notification"`;
    await prisma.$executeRaw`DELETE FROM "Lead"`;
    await prisma.$executeRaw`DELETE FROM "Permission"`;
    await prisma.$executeRaw`DELETE FROM "Role"`;
    await prisma.$executeRaw`DELETE FROM "User"`;
    await prisma.$executeRaw`DELETE FROM "Module"`;
    await prisma.$executeRaw`DELETE FROM "Organization"`;
    console.log('✅ Base nettoyée');

    // 2. Importer vos organisations
    console.log('🏢 Import des organisations...');
    await prisma.$executeRaw`
      INSERT INTO "Organization" (id, name, "createdAt", "updatedAt", features, status) VALUES
      ('717a2b14-0d9c-48f6-b7ef-79dc0a0cc8de', '2Thier CRM', '2025-06-18T06:42:24.724Z', '2025-07-14T16:39:34.305Z', '{"active"}', 'active'),
      ('7635b650-470c-4f90-b8c7-302530134198', 'a', '2025-07-15T13:49:21.832Z', '2025-07-15T13:49:21.832Z', '{}', 'active')
    `;
    console.log('✅ Organisations importées');

    // 3. Importer vos modules
    console.log('📦 Import des modules...');
    await prisma.$executeRaw`
      INSERT INTO "Module" (id, name, "organizationId", status, "createdAt", "updatedAt") VALUES
      ('e4b13c7a-8c24-4b29-8d7e-5f3a2b1c9d8e', 'Leads', '717a2b14-0d9c-48f6-b7ef-79dc0a0cc8de', 'active', NOW(), NOW()),
      ('f5c24d8b-9d35-5c3a-9e8f-6g4b3c2d0e9f', 'Users', '717a2b14-0d9c-48f6-b7ef-79dc0a0cc8de', 'active', NOW(), NOW()),
      ('g6d35e9c-0e46-6d4b-0f9g-7h5c4d3e1f0g', 'Mail', '717a2b14-0d9c-48f6-b7ef-79dc0a0cc8de', 'active', NOW(), NOW()),
      ('h7e46f0d-1f57-7e5c-1g0h-8i6d5e4f2g1h', 'Forms', '717a2b14-0d9c-48f6-b7ef-79dc0a0cc8de', 'active', NOW(), NOW())
    `;
    console.log('✅ Modules importés');

    // 4. Importer vos utilisateurs
    console.log('👥 Import des utilisateurs...');
    await prisma.$executeRaw`
      INSERT INTO "User" (id, email, "createdAt", "updatedAt", "passwordHash", status, address, "avatarUrl", "firstName", "lastName", "phoneNumber", "vatNumber", role) VALUES
      ('c8eba369-99f4-4c1a-9d71-85e582787590', 'dethier.jls@gmail.com', '2025-06-18T06:53:15.266Z', '2025-06-26T15:17:48.511Z', '$2b$10$GVoVAPfEIsg7bvuCts/svOSBAtg99nMha5.PsGuABxq2oKDvxRc5y', 'active', 'Rue de floreffe 37, 5150 Franiere (Floreffe)', NULL, 'Jonathan', 'Dethier', '0470/29.50.77', NULL, 'super_admin'),
      ('067f312c-b85c-4d18-9216-2da412662b71', 'jonathan.dethier@unitedfocus.be', '2025-07-03T08:10:07.949Z', '2025-07-03T08:10:16.680Z', '$2b$10$NNPPdigQljJxcwuyLx316e/YJVI2HVtpq0xnoWXpHRcD/Lv8p/KRu', 'active', 'Rue voie de Liège 14', NULL, 'santamaria', 'Johan', '042400107', '', 'user')
    `;
    console.log('✅ Utilisateurs importés');

    // 5. Créer les rôles
    console.log('🔐 Import des rôles...');
    await prisma.$executeRaw`
      INSERT INTO "Role" (id, name, "organizationId", status, "createdAt", "updatedAt") VALUES
      ('role-admin-2thier', 'admin', '717a2b14-0d9c-48f6-b7ef-79dc0a0cc8de', 'active', NOW(), NOW()),
      ('role-user-2thier', 'user', '717a2b14-0d9c-48f6-b7ef-79dc0a0cc8de', 'active', NOW(), NOW())
    `;
    console.log('✅ Rôles importés');

    // 6. Créer les permissions
    console.log('⚡ Import des permissions...');
    await prisma.$executeRaw`
      INSERT INTO "Permission" (id, name, description, "organizationId", "createdAt", "updatedAt") VALUES
      ('perm-leads-read', 'leads:read', 'Voir les leads', '717a2b14-0d9c-48f6-b7ef-79dc0a0cc8de', NOW(), NOW()),
      ('perm-leads-write', 'leads:write', 'Modifier les leads', '717a2b14-0d9c-48f6-b7ef-79dc0a0cc8de', NOW(), NOW()),
      ('perm-users-read', 'users:read', 'Voir les utilisateurs', '717a2b14-0d9c-48f6-b7ef-79dc0a0cc8de', NOW(), NOW()),
      ('perm-users-write', 'users:write', 'Modifier les utilisateurs', '717a2b14-0d9c-48f6-b7ef-79dc0a0cc8de', NOW(), NOW())
    `;
    console.log('✅ Permissions importées');

    console.log('\n🎉 IMPORTATION TERMINÉE AVEC SUCCÈS !');
    console.log('\n✅ MAINTENANT DANS VOTRE NAVIGATEUR :');
    console.log('1. Appuyez sur F12');
    console.log('2. Onglet Console');
    console.log('3. Tapez : localStorage.clear()');
    console.log('4. Appuyez sur Entrée');
    console.log('5. Rechargez la page (F5)');
    console.log('6. Connectez-vous avec : dethier.jls@gmail.com');
    console.log('7. Votre mot de passe habituel');
    console.log('\n🏢 Organisation : 2Thier CRM');
    console.log('🆔 ID Org : 717a2b14-0d9c-48f6-b7ef-79dc0a0cc8de');

  } catch (error) {
    console.error('❌ ERREUR :', error);
  } finally {
    await prisma.$disconnect();
  }
}

executeImport();
