-- ============================================================
-- Zhiive Swipe Modules — Unifie les apps sociales et CRM
-- en un seul système de modules "The Hive"
-- ============================================================

-- 1. Créer la catégorie Zhiive Apps (order=1 pour qu'elle soit en premier)
INSERT INTO "Category" (id, name, description, icon, "iconColor", "order", active, "superAdminOnly")
VALUES ('zhiive-apps-category', 'Zhiive Apps', 'Applications principales du Hive', '🐝', '#F5A623', 1, true, false)
ON CONFLICT (id) DO NOTHING;

-- 2. Créer les 7 nouveaux modules swipe (mur, explore, reels, flow, universe, mail, stats)
INSERT INTO "Module" (id, key, label, feature, icon, route, description, "order", active, "createdAt", "updatedAt", "categoryId", "superAdminOnly", placement, "tabColor", "tabIcon")
VALUES
  ('zhiive-mod-mur',      'mur',      'Hive',     'zhiive_hive',     'HomeOutlined',        '/dashboard?tab=mur',      'Le mur social du Hive',    1, true, NOW(), NOW(), 'zhiive-apps-category', false, 'swipe', '#F5A623', 'wall'),
  ('zhiive-mod-explore',  'explore',  'Scout',    'zhiive_scout',    'CompassOutlined',     '/dashboard?tab=explore',  'Explorer et découvrir',    2, true, NOW(), NOW(), 'zhiive-apps-category', false, 'swipe', '#00CEC9', 'compass'),
  ('zhiive-mod-reels',    'reels',    'Reels',    'zhiive_reels',    'VideoCameraOutlined', '/dashboard?tab=reels',    'Vidéos courtes',           3, true, NOW(), NOW(), 'zhiive-apps-category', false, 'swipe', '#e84393', 'clapperboard'),
  ('zhiive-mod-flow',     'flow',     'Flow',     'zhiive_flow',     'SwapOutlined',        '/dashboard?tab=flow',     'Flux et activité',         4, true, NOW(), NOW(), 'zhiive-apps-category', false, 'swipe', '#6C5CE7', 'flow-wave'),
  ('zhiive-mod-universe', 'universe', 'Universe', 'zhiive_universe', 'GlobalOutlined',      '/dashboard?tab=universe', 'L''univers Zhiive',        5, true, NOW(), NOW(), 'zhiive-apps-category', false, 'swipe', '#FD79A8', 'universe'),
  ('zhiive-mod-mail',     'mail',     'Mail',     'zhiive_mail_app', 'MailOutlined',        '/dashboard?tab=mail',     'Messagerie intégrée',      6, true, NOW(), NOW(), 'zhiive-apps-category', false, 'swipe', '#00B894', 'mail'),
  ('zhiive-mod-stats',    'stats',    'Stats',    'zhiive_stats',    'BarChartOutlined',    '/dashboard?tab=stats',    'Statistiques et analytics',8, true, NOW(), NOW(), 'zhiive-apps-category', false, 'swipe', '#FDCB6E', 'bar-chart')
ON CONFLICT (id) DO NOTHING;

-- 3. Mettre à jour le module agenda existant pour dual placement (swipe + sidebar)
UPDATE "Module"
SET placement = 'both',
    "tabColor" = '#0984E3',
    "tabIcon"  = 'calendar',
    "order"    = 7
WHERE key = 'agenda';
