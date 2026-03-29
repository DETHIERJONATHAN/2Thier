-- ============================================================
-- Migration: Add "Hive Social Settings" module to Admin category
-- Run after start-local.sh with:
--   npx tsx -e "import {db} from './src/lib/database'; ..."
-- ============================================================

-- 1. Insert the module into the Admin category
INSERT INTO "Module" (
    id, key, label, feature, icon, route, description, page,
    "order", active, "categoryId",
    "createdAt", "updatedAt", "superAdminOnly"
)
SELECT
    'module-hive-social-' || gen_random_uuid()::text,
    'hive-social-settings',
    'Hive Social Settings',
    'hive_social_settings',
    'FaUsers',
    '/admin/social-settings',
    'Configuration complète du réseau social Zhiive : apps, feed, modération, interactions, follow, confidentialité, notifications, analytics',
    'SocialSettingsAdminPage',
    75,
    true,
    c.id,
    NOW(),
    NOW(),
    true
FROM "Category" c
WHERE c.name = 'Admin'
LIMIT 1
ON CONFLICT (key) DO UPDATE SET
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    route = EXCLUDED.route,
    icon = EXCLUDED.icon,
    page = EXCLUDED.page,
    "order" = EXCLUDED."order",
    "superAdminOnly" = EXCLUDED."superAdminOnly",
    "updatedAt" = NOW();

-- 2. Activate for all existing organizations
INSERT INTO "OrganizationModuleStatus" (
    id, "organizationId", "moduleId", active, "createdAt", "updatedAt"
)
SELECT
    'oms-hive-social-' || gen_random_uuid()::text,
    o.id,
    m.id,
    true,
    NOW(),
    NOW()
FROM "Organization" o
CROSS JOIN "Module" m
WHERE m.key = 'hive-social-settings'
ON CONFLICT ("organizationId", "moduleId") DO NOTHING;
