-- Insertion directe des statuts pour TOUTES les organisations
-- Script plus simple et plus robuste

-- 1. Insérer les 2 nouveaux call statuses pour chaque org
INSERT INTO "CallStatus" (id, name, value, "organizationId", "order", "isActive", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  '📞 Contacté – Non qualifié',
  'non_qualifie',
  o.id,
  5,
  true,
  NOW(),
  NOW()
FROM "Organization" o
WHERE NOT EXISTS (
  SELECT 1 FROM "CallStatus" cs 
  WHERE cs."organizationId" = o.id AND cs.value = 'non_qualifie'
);

INSERT INTO "CallStatus" (id, name, value, "organizationId", "order", "isActive", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  '📞 Contacté – Refus définitif',
  'refus_definitif',
  o.id,
  11,
  true,
  NOW(),
  NOW()
FROM "Organization" o
WHERE NOT EXISTS (
  SELECT 1 FROM "CallStatus" cs 
  WHERE cs."organizationId" = o.id AND cs.value = 'refus_definitif'
);

-- 2. Insérer le nouveau lead status pour chaque org
INSERT INTO "LeadStatus" (id, name, value, "organizationId", "order", "isActive", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  '⚠️ Non qualifié',
  'non_qualifie',
  o.id,
  10,
  true,
  NOW(),
  NOW()
FROM "Organization" o
WHERE NOT EXISTS (
  SELECT 1 FROM "LeadStatus" ls 
  WHERE ls."organizationId" = o.id AND ls.value = 'non_qualifie'
);

-- 3. Insérer les 2 nouveaux mappings pour chaque org
INSERT INTO "CallToLeadMapping" (id, "callStatusValue", "leadStatusValue", "organizationId", "isActive", "priority", "description", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  'non_qualifie',
  'non_qualifie',
  o.id,
  true,
  50,
  'Non qualifié → Non qualifié',
  NOW(),
  NOW()
FROM "Organization" o
WHERE NOT EXISTS (
  SELECT 1 FROM "CallToLeadMapping" ctlm 
  WHERE ctlm."organizationId" = o.id AND ctlm."callStatusValue" = 'non_qualifie' AND ctlm."leadStatusValue" = 'non_qualifie'
);

INSERT INTO "CallToLeadMapping" (id, "callStatusValue", "leadStatusValue", "organizationId", "isActive", "priority", "description", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  'refus_definitif',
  'refuse',
  o.id,
  true,
  51,
  'Refus définitif → Refusé',
  NOW(),
  NOW()
FROM "Organization" o
WHERE NOT EXISTS (
  SELECT 1 FROM "CallToLeadMapping" ctlm 
  WHERE ctlm."organizationId" = o.id AND ctlm."callStatusValue" = 'refus_definitif' AND ctlm."leadStatusValue" = 'refuse'
);

-- Vérification
SELECT 'CallStatus non_qualifie' as type, COUNT(*) as count FROM "CallStatus" WHERE value = 'non_qualifie'
UNION ALL
SELECT 'CallStatus refus_definitif' as type, COUNT(*) as count FROM "CallStatus" WHERE value = 'refus_definitif'
UNION ALL
SELECT 'LeadStatus non_qualifie' as type, COUNT(*) as count FROM "LeadStatus" WHERE value = 'non_qualifie'
UNION ALL
SELECT 'Mapping non_qualifie' as type, COUNT(*) as count FROM "CallToLeadMapping" WHERE "callStatusValue" = 'non_qualifie'
UNION ALL
SELECT 'Mapping refus_definitif' as type, COUNT(*) as count FROM "CallToLeadMapping" WHERE "callStatusValue" = 'refus_definitif';
