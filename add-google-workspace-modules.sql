-- Script SQL pour ajouter les modules Google Workspace au CRM
-- À exécuter dans la base de données PostgreSQL

-- 1. GMAIL MODULE
INSERT INTO modules (name, feature, icon, route, active, description) 
VALUES (
  'Gmail', 
  'GMAIL', 
  'MdEmail', 
  '/gmail', 
  true, 
  'Gestion des emails intégrée avec Gmail'
) ON CONFLICT (name) DO UPDATE SET 
  feature = EXCLUDED.feature,
  icon = EXCLUDED.icon,
  route = EXCLUDED.route,
  active = EXCLUDED.active,
  description = EXCLUDED.description;

-- 2. GOOGLE CALENDAR MODULE  
INSERT INTO modules (name, feature, icon, route, active, description) 
VALUES (
  'Google Calendar', 
  'GOOGLE_CALENDAR', 
  'AiOutlineCalendar', 
  '/google-calendar', 
  true, 
  'Planification et gestion des rendez-vous avec Google Calendar'
) ON CONFLICT (name) DO UPDATE SET 
  feature = EXCLUDED.feature,
  icon = EXCLUDED.icon,
  route = EXCLUDED.route,
  active = EXCLUDED.active,
  description = EXCLUDED.description;

-- 3. GOOGLE DRIVE MODULE
INSERT INTO modules (name, feature, icon, route, active, description) 
VALUES (
  'Google Drive', 
  'GOOGLE_DRIVE', 
  'AiOutlineCloudServer', 
  '/google-drive', 
  true, 
  'Stockage et partage de fichiers avec Google Drive'
) ON CONFLICT (name) DO UPDATE SET 
  feature = EXCLUDED.feature,
  icon = EXCLUDED.icon,
  route = EXCLUDED.route,
  active = EXCLUDED.active,
  description = EXCLUDED.description;

-- 4. GOOGLE MEET MODULE
INSERT INTO modules (name, feature, icon, route, active, description) 
VALUES (
  'Google Meet', 
  'GOOGLE_MEET', 
  'BiVideo', 
  '/google-meet', 
  true, 
  'Visioconférences et réunions avec Google Meet'
) ON CONFLICT (name) DO UPDATE SET 
  feature = EXCLUDED.feature,
  icon = EXCLUDED.icon,
  route = EXCLUDED.route,
  active = EXCLUDED.active,
  description = EXCLUDED.description;

-- 5. GOOGLE DOCS MODULE
INSERT INTO modules (name, feature, icon, route, active, description) 
VALUES (
  'Google Docs', 
  'GOOGLE_DOCS', 
  'AiOutlineFileText', 
  '/google-docs', 
  true, 
  'Documents collaboratifs avec Google Docs'
) ON CONFLICT (name) DO UPDATE SET 
  feature = EXCLUDED.feature,
  icon = EXCLUDED.icon,
  route = EXCLUDED.route,
  active = EXCLUDED.active,
  description = EXCLUDED.description;

-- 6. GOOGLE SHEETS MODULE
INSERT INTO modules (name, feature, icon, route, active, description) 
VALUES (
  'Google Sheets', 
  'GOOGLE_SHEETS', 
  'AiOutlineTable', 
  '/google-sheets', 
  true, 
  'Tableurs partagés avec Google Sheets'
) ON CONFLICT (name) DO UPDATE SET 
  feature = EXCLUDED.feature,
  icon = EXCLUDED.icon,
  route = EXCLUDED.route,
  active = EXCLUDED.active,
  description = EXCLUDED.description;

-- 7. Activer les modules pour toutes les organisations existantes
-- (Optionnel - à adapter selon vos besoins)
INSERT INTO organization_modules (organization_id, module_id, is_active)
SELECT 
  o.id as organization_id,
  m.id as module_id,
  true as is_active
FROM organizations o
CROSS JOIN modules m 
WHERE m.feature IN ('GMAIL', 'GOOGLE_CALENDAR', 'GOOGLE_DRIVE', 'GOOGLE_MEET', 'GOOGLE_DOCS', 'GOOGLE_SHEETS')
ON CONFLICT (organization_id, module_id) DO UPDATE SET 
  is_active = EXCLUDED.is_active;

-- 8. Ajouter les permissions nécessaires (si elles n'existent pas)
INSERT INTO permissions (name, description, category) VALUES 
('google_workspace:read', 'Consulter Google Workspace', 'google_workspace'),
('google_workspace:write', 'Utiliser Google Workspace', 'google_workspace'),
('gmail:read', 'Consulter Gmail', 'gmail'),
('gmail:write', 'Utiliser Gmail', 'gmail'),
('google_calendar:read', 'Consulter Google Calendar', 'google_calendar'),
('google_calendar:write', 'Utiliser Google Calendar', 'google_calendar'),
('google_drive:read', 'Consulter Google Drive', 'google_drive'),
('google_drive:write', 'Utiliser Google Drive', 'google_drive'),
('google_meet:read', 'Consulter Google Meet', 'google_meet'),
('google_meet:write', 'Utiliser Google Meet', 'google_meet'),
('google_docs:read', 'Consulter Google Docs', 'google_docs'),
('google_docs:write', 'Utiliser Google Docs', 'google_docs'),
('google_sheets:read', 'Consulter Google Sheets', 'google_sheets'),
('google_sheets:write', 'Utiliser Google Sheets', 'google_sheets')
ON CONFLICT (name) DO NOTHING;

-- 9. Donner les permissions au rôle Admin (adapter l'ID selon votre base)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  r.id as role_id,
  p.id as permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Admin' 
AND p.name IN (
  'google_workspace:read', 'google_workspace:write',
  'gmail:read', 'gmail:write',
  'google_calendar:read', 'google_calendar:write',
  'google_drive:read', 'google_drive:write',
  'google_meet:read', 'google_meet:write',
  'google_docs:read', 'google_docs:write',
  'google_sheets:read', 'google_sheets:write'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 10. Vérification des modules ajoutés
SELECT 
  m.name,
  m.feature,
  m.icon,
  m.route,
  m.active,
  m.description
FROM modules m 
WHERE m.feature IN ('GMAIL', 'GOOGLE_CALENDAR', 'GOOGLE_DRIVE', 'GOOGLE_MEET', 'GOOGLE_DOCS', 'GOOGLE_SHEETS')
ORDER BY m.name;
