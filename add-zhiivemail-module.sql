-- ============================================================
-- Migration: Add "ZhiiveMail" module to Admin category
-- ============================================================

-- 1. Insert the module into the Admin category
INSERT INTO "Module" (
    id, key, label, feature, icon, route, description, page,
    "order", active, "categoryId",
    "createdAt", "updatedAt", "superAdminOnly"
)
SELECT
    'module-zhiivemail-' || gen_random_uuid()::text,
    'zhiivemail',
    'ZhiiveMail',
    'zhiivemail',
    'MailOutlined',
    '/admin/zhiivemail',
    'Gestion complète du système email Zhiive : comptes @zhiive.com, SMTP, provisionnement, diagnostics',
    'ZhiiveMailAdminPage',
    80,
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
    'oms-zhiivemail-' || gen_random_uuid()::text,
    o.id,
    m.id,
    true,
    NOW(),
    NOW()
FROM "Organization" o
CROSS JOIN "Module" m
WHERE m.key = 'zhiivemail'
ON CONFLICT ("organizationId", "moduleId") DO NOTHING;
