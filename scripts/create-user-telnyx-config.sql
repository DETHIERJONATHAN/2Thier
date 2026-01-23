-- Créer la configuration Telnyx pour Jonathan Dethier
-- Date: 2026-01-23

-- 1. Trouver ton userId et organizationId
-- 2. Trouver un numéro disponible
-- 3. Créer ta config avec permission d'appeler

-- Vérifier d'abord ton user ID
SELECT id, email, "firstName", "lastName", "organizationId" 
FROM "User" 
WHERE email IN ('dethier.jls@gmail.com', 'jonathan.dethier@2thier.be');

-- Vérifier les numéros disponibles
SELECT "phoneNumber", "assignedUserId", status 
FROM "TelnyxPhoneNumber" 
WHERE "organizationId" = (
  SELECT "organizationId" FROM "User" 
  WHERE email IN ('dethier.jls@gmail.com', 'jonathan.dethier@2thier.be') 
  LIMIT 1
);

-- CRÉER TA CONFIG UTILISATEUR (remplace les valeurs si nécessaire)
INSERT INTO "TelnyxUserConfig" (
  id,
  "userId",
  "organizationId",
  "assignedNumber",
  "canMakeCalls",
  "canSendSms",
  "monthlyLimit",
  "createdAt",
  "updatedAt"
)
SELECT 
  'telnyx-usercfg-' || u.id,
  u.id,
  u."organizationId",
  (SELECT "phoneNumber" FROM "TelnyxPhoneNumber" WHERE "organizationId" = u."organizationId" LIMIT 1),
  true,  -- ✅ PEUT APPELER
  true,  -- ✅ PEUT ENVOYER SMS
  NULL,  -- Pas de limite mensuelle
  NOW(),
  NOW()
FROM "User" u
WHERE u.email IN ('dethier.jls@gmail.com', 'jonathan.dethier@2thier.be')
ON CONFLICT (id) DO UPDATE SET
  "canMakeCalls" = true,
  "canSendSms" = true,
  "updatedAt" = NOW();

-- Assigner le numéro à ton userId
UPDATE "TelnyxPhoneNumber"
SET "assignedUserId" = (
  SELECT id FROM "User" 
  WHERE email IN ('dethier.jls@gmail.com', 'jonathan.dethier@2thier.be') 
  LIMIT 1
),
"updatedAt" = NOW()
WHERE "organizationId" = (
  SELECT "organizationId" FROM "User" 
  WHERE email IN ('dethier.jls@gmail.com', 'jonathan.dethier@2thier.be') 
  LIMIT 1
)
AND "assignedUserId" IS NULL
LIMIT 1;

-- Vérifier le résultat
SELECT * FROM "TelnyxUserConfig" 
WHERE "userId" = (
  SELECT id FROM "User" 
  WHERE email IN ('dethier.jls@gmail.com', 'jonathan.dethier@2thier.be') 
  LIMIT 1
);
