import { db } from '../src/lib/database';
import { randomUUID } from 'crypto';

const ZHIIVE_ORG_ID = 'zhiive-global-org';
const ZHIIVE_USER_ROLE_ID = 'zhiive-global-user-role';

async function setup() {
  // 1. Create Zhiive organization
  const org = await db.organization.upsert({
    where: { id: ZHIIVE_ORG_ID },
    update: {},
    create: {
      id: ZHIIVE_ORG_ID,
      name: 'Zhiive',
      description: 'Organisation par défaut de la ruche Zhiive. Tous les membres du réseau y appartiennent.',
      status: 'ACTIVE',
      updatedAt: new Date(),
    }
  });
  console.log('✅ Organisation Zhiive créée:', org.id, org.name);

  // 2. Create user role for Zhiive
  const role = await db.role.upsert({
    where: { id: ZHIIVE_USER_ROLE_ID },
    update: {},
    create: {
      id: ZHIIVE_USER_ROLE_ID,
      name: 'user',
      label: 'Membre Zhiive',
      organizationId: ZHIIVE_ORG_ID,
      updatedAt: new Date(),
    }
  });
  console.log('✅ Rôle user Zhiive créé:', role.id, role.name);

  // 3. Assign all orphan users (non-super-admin without any org)
  const orphanUsers = await db.user.findMany({
    where: { UserOrganization: { none: {} }, role: { not: 'super_admin' } },
    select: { id: true, email: true, firstName: true }
  });
  console.log('\nUtilisateurs orphelins à assigner:', orphanUsers.length);

  for (const user of orphanUsers) {
    const existing = await db.userOrganization.findFirst({
      where: { userId: user.id, organizationId: ZHIIVE_ORG_ID }
    });
    if (existing) {
      console.log('  ⏭️', user.firstName, '- déjà dans Zhiive');
      continue;
    }
    await db.userOrganization.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        organizationId: ZHIIVE_ORG_ID,
        roleId: ZHIIVE_USER_ROLE_ID,
        status: 'ACTIVE',
        updatedAt: new Date(),
      }
    });
    console.log('  ✅', user.firstName, '-', user.email, '→ Zhiive');
  }

  console.log('\n🎉 Terminé !');
  await db.$disconnect();
}

setup().catch(e => { console.error(e); process.exit(1); });
