/**
 * Script pour insérer les permissions fines des 4 rôles terrain
 * sur le module Chantiers.
 *
 * Usage: npx tsx insert-terrain-permissions.ts
 */
import { db } from './src/lib/database';

const CHANTIERS_MODULE_ID = 'module-chantiers-87ba0db4-2eb9-4096-8bbb-2259da444c2e';

const roles = {
  technicien: { id: '1757366075159-kynarmgsg', orgId: null as string | null },
  chefEquipe: { id: 'role_1773175806398_5go9vqz7u', orgId: '1757366075154-i554z93kl' },
  contremaitre: { id: 'role_1773176045984_peqbfeyyk', orgId: '1757366075154-i554z93kl' },
  soustraitant: { id: 'role_1773175845870_2v4589rgg', orgId: '1757366075154-i554z93kl' },
};

// Matrix: action -> scope per role
// Technicien: view(own), planning(own), pointage(own)
// Chef d'équipe: view(team), edit(team), assign(*), planning(team), pointage(team), team_panel(*)
// Contremaître: ALL actions with scope 'all'
// Sous-traitant: view(own), planning(own), pointage(own)

type RoleKey = keyof typeof roles;

const permissionMatrix: Record<string, Partial<Record<RoleKey, string>>> = {
  view:       { technicien: 'own', chefEquipe: 'team', contremaitre: 'all', soustraitant: 'own' },
  create:     { contremaitre: 'all' },
  edit:       { chefEquipe: 'team', contremaitre: 'all' },
  delete:     { contremaitre: 'all' },
  assign:     { chefEquipe: '*', contremaitre: 'all' },
  validate:   { contremaitre: 'all' },
  finances:   { contremaitre: 'all' },
  planning:   { technicien: 'own', chefEquipe: 'team', contremaitre: 'all', soustraitant: 'own' },
  pointage:   { technicien: 'own', chefEquipe: 'team', contremaitre: 'all', soustraitant: 'own' },
  team_panel: { chefEquipe: '*', contremaitre: '*' },
  settings:   { contremaitre: '*' },
};

async function main() {
  const permissionsToCreate: Array<{
    id: string;
    roleId: string;
    organizationId: string | null;
    moduleId: string;
    action: string;
    resource: string;
    allowed: boolean;
    createdAt: Date;
    updatedAt: Date;
  }> = [];

  for (const [action, roleScopes] of Object.entries(permissionMatrix)) {
    for (const [roleKey, scope] of Object.entries(roleScopes) as Array<[RoleKey, string]>) {
      const role = roles[roleKey];
      permissionsToCreate.push({
        id: `perm_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        roleId: role.id,
        organizationId: role.orgId,
        moduleId: CHANTIERS_MODULE_ID,
        action,
        resource: scope,
        allowed: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  console.log(`Inserting ${permissionsToCreate.length} permissions...`);

  // Delete existing chantiers permissions for these roles first
  const roleIds = Object.values(roles).map(r => r.id);
  const deleted = await db.permission.deleteMany({
    where: {
      roleId: { in: roleIds },
      moduleId: CHANTIERS_MODULE_ID,
    },
  });
  console.log(`Deleted ${deleted.count} existing chantiers permissions for these roles.`);

  // Also give module access permission (action='access') so the module shows up
  for (const [roleKey, role] of Object.entries(roles) as Array<[RoleKey, typeof roles[RoleKey]]>) {
    permissionsToCreate.push({
      id: `perm_${Date.now()}_${Math.random().toString(36).slice(2, 10)}_acc`,
      roleId: role.id,
      organizationId: role.orgId,
      moduleId: CHANTIERS_MODULE_ID,
      action: 'access',
      resource: '*',
      allowed: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  await db.permission.createMany({
    data: permissionsToCreate,
    skipDuplicates: true,
  });

  console.log(`✅ ${permissionsToCreate.length} permissions created successfully!`);

  // Verify
  for (const [roleKey, role] of Object.entries(roles) as Array<[RoleKey, typeof roles[RoleKey]]>) {
    const count = await db.permission.count({
      where: { roleId: role.id, moduleId: CHANTIERS_MODULE_ID },
    });
    console.log(`  ${roleKey}: ${count} chantiers permissions`);
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
