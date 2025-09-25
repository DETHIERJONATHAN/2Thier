/*
  Script: attach-users-to-current-org.cjs
  Objet: Rattacher des utilisateurs cibles à l'organisation de l'utilisateur d'ancrage
         et leur attribuer le rôle super_admin, sans reset Prisma.

  Utilisation (PowerShell/Windows):
    node scripts/attach-users-to-current-org.cjs

  Variables optionnelles:
    ANCHOR_EMAIL  - Email de l'utilisateur d'ancrage (par défaut: jonathan.dethier@2thier.be)
    TARGET_EMAILS - Liste d'emails séparés par des virgules à rattacher
                    (par défaut: super.admin@2thier.be,dethier.jls@gmail.com)
*/

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DEFAULT_ANCHOR_EMAIL = 'jonathan.dethier@2thier.be';
const DEFAULT_TARGET_EMAILS = [
  'super.admin@2thier.be',
  'dethier.jls@gmail.com',
];

async function findSuperAdminRole(orgId) {
  // Essayer label EXACT, puis name EXACT, puis recherche partielle
  let role = await prisma.role.findFirst({ where: { organizationId: orgId, label: 'super_admin' } });
  if (!role) role = await prisma.role.findFirst({ where: { organizationId: orgId, name: 'super_admin' } });
  if (!role) {
    role = await prisma.role.findFirst({
      where: {
        organizationId: orgId,
        OR: [
          { label: { contains: 'super', mode: 'insensitive' } },
          { name: { contains: 'super', mode: 'insensitive' } },
        ],
      },
    });
  }
  if (!role) {
    // Créer un rôle Super Admin minimal si absent
    role = await prisma.role.create({
      data: {
        id: `${Date.now()}-super-admin-${Math.random().toString(36).slice(2, 8)}`,
        name: 'super_admin',
        label: 'Super Admin',
        description: 'Rôle Super Admin (créé automatiquement)',
        organizationId: orgId,
        isDetached: false,
        isGlobal: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log(`[ATTACH] Rôle super_admin créé: ${role.id}`);
  }
  return role;
}

async function main() {
  const anchorEmail = process.env.ANCHOR_EMAIL || DEFAULT_ANCHOR_EMAIL;
  const targetEmails = (process.env.TARGET_EMAILS
    ? process.env.TARGET_EMAILS.split(',').map((e) => e.trim()).filter(Boolean)
    : DEFAULT_TARGET_EMAILS);

  console.log(`[ATTACH] Anchor email: ${anchorEmail}`);
  console.log(`[ATTACH] Target emails: ${targetEmails.join(', ')}`);

  const anchorUser = await prisma.user.findUnique({
    where: { email: anchorEmail },
    include: { UserOrganization: true },
  });

  if (!anchorUser || anchorUser.UserOrganization.length === 0) {
    throw new Error(`Utilisateur d'ancrage introuvable ou sans organisation: ${anchorEmail}`);
  }

  const orgId = anchorUser.UserOrganization[0].organizationId;
  console.log(`[ATTACH] Organisation d'ancrage: ${orgId}`);

  const superRole = await findSuperAdminRole(orgId);
  console.log(`[ATTACH] Rôle super_admin: ${superRole.id} (${superRole.label || superRole.name})`);

  for (const email of targetEmails) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.warn(`[ATTACH] Utilisateur introuvable, ignoré: ${email}`);
      continue;
    }

    const existing = await prisma.userOrganization.findFirst({
      where: { userId: user.id, organizationId: orgId },
    });

    if (existing) {
      const updated = await prisma.userOrganization.update({
        where: { id: existing.id },
        data: { status: 'ACTIVE', roleId: superRole.id, updatedAt: new Date() },
      });
      console.log(`[ATTACH] Mise à jour relation: ${email} → org ${orgId} (status=${updated.status}, role=${superRole.id})`);
    } else {
      const created = await prisma.userOrganization.create({
        data: {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          userId: user.id,
          organizationId: orgId,
          roleId: superRole.id,
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      console.log(`[ATTACH] Relation créée: ${email} → org ${orgId} (id=${created.id})`);
    }
  }

  console.log('[ATTACH] Terminé.');
}

main()
  .catch((e) => {
    console.error('[ATTACH] Erreur:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
