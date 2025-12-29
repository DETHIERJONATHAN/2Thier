import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

const userId = '1757366075163-2vdibc2ve';
const orgId = 'org-2thier-1766916379383';

// 1. Vérifier/ajouter UserOrganization
const existingMembership = await db.userOrganization.findFirst({
  where: { userId, organizationId: orgId }
});

if (existingMembership) {
  console.log('✅ Utilisateur déjà membre de 2Thier');
} else {
  console.log('Ajout à l organisation 2Thier...');
  await db.userOrganization.create({
    data: {
      id: `uo-${Date.now()}`,
      User: { connect: { id: userId } },
      Organization: { connect: { id: orgId } },
      role: 'admin'
    }
  });
  console.log('✅ Utilisateur ajouté');
}

// 2. Vérifier/créer tokens Google
const existingToken = await db.googleToken.findFirst({
  where: { organizationId: orgId }
});

if (existingToken) {
  console.log('✅ Tokens Google existent déjà pour 2Thier');
} else {
  const crmToken = await db.googleToken.findFirst({
    where: { organizationId: '1757366075154-i554z93kl' }
  });
  
  if (crmToken) {
    console.log('Copie des tokens...');
    await db.googleToken.create({
      data: {
        id: `gt-${Date.now()}`,
        Organization: { connect: { id: orgId } },
        accessToken: crmToken.accessToken,
        refreshToken: crmToken.refreshToken,
        tokenType: crmToken.tokenType,
        expiresAt: crmToken.expiresAt,
        scope: crmToken.scope
      }
    });
    console.log('✅ Tokens copiés');
  } else {
    console.log('⚠️ Pas de tokens source à copier');
  }
}

// 3. Vérifier GoogleWorkspaceConfig
const existingConfig = await db.googleWorkspaceConfig.findFirst({
  where: { organizationId: orgId }
});

if (existingConfig) {
  console.log('✅ GoogleWorkspaceConfig existe déjà');
} else {
  const crmConfig = await db.googleWorkspaceConfig.findFirst({
    where: { organizationId: '1757366075154-i554z93kl' }
  });
  
  if (crmConfig) {
    console.log('Création GoogleWorkspaceConfig...');
    await db.googleWorkspaceConfig.create({
      data: {
        id: `gwc-${Date.now()}`,
        Organization: { connect: { id: orgId } },
        domain: crmConfig.domain,
        adminEmail: crmConfig.adminEmail,
        enabledModules: crmConfig.enabledModules
      }
    });
    console.log('✅ GoogleWorkspaceConfig créé');
  }
}

console.log('\n🎉 Configuration terminée ! Rafraîchissez la page Gmail.');
process.exit(0);
