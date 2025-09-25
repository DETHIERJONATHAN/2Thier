-- Script SQL pour ajouter le module Google Voice
INSERT INTO "Module" (id, key, label, feature, icon, route, description, page, "order", active, "organizationId") VALUES 
(
  'google-voice-module',
  'google_voice',
  'Google Voice',
  'GOOGLE_VOICE',
  'PhoneOutlined',
  '/google-voice',
  'Module de téléphonie Google Voice pour appels et SMS vers les leads',
  'GoogleVoicePage',
  15,
  true,
  NULL -- Module global disponible pour toutes les organisations
);

-- Permissions pour le module Google Voice
INSERT INTO "Permission" (id, "roleId", "organizationId", "moduleId", action, resource, allowed) VALUES 
(
  'perm-google-voice-admin',
  NULL, -- Sera assigné aux rôles admin
  NULL, -- Applicable à toutes les organisations
  'google-voice-module',
  'manage',
  'google_voice_config',
  true
),
(
  'perm-google-voice-user',
  NULL, -- Sera assigné aux rôles utilisateurs
  NULL, -- Applicable à toutes les organisations  
  'google-voice-module',
  'use',
  'google_voice_calls',
  true
),
(
  'perm-google-voice-calls',
  NULL,
  NULL,
  'google-voice-module',
  'create',
  'google_voice_calls',
  true
),
(
  'perm-google-voice-sms',
  NULL,
  NULL,
  'google-voice-module', 
  'create',
  'google_voice_sms',
  true
),
(
  'perm-google-voice-history',
  NULL,
  NULL,
  'google-voice-module',
  'read',
  'google_voice_history',
  true
);

-- Activation du module pour toutes les organisations existantes
INSERT INTO "OrganizationModuleStatus" (id, "organizationId", "moduleId", enabled, "enabledAt")
SELECT 
  'oms-' || o.id || '-google-voice',
  o.id,
  'google-voice-module',
  true,
  NOW()
FROM "Organization" o
WHERE NOT EXISTS (
  SELECT 1 FROM "OrganizationModuleStatus" oms 
  WHERE oms."organizationId" = o.id AND oms."moduleId" = 'google-voice-module'
);
