-- INSERTION COMPLÈTE - Tous les statuts manquants

-- 1. Lead Status: Non qualifié (si pas déjà créé)
INSERT INTO "LeadStatus" (id, name, "organizationId", "order", "color", "isDefault", "createdAt", "updatedAt")
VALUES (
  '1757366075154-ls-non-qualifie',
  '⚠️ Non qualifié',
  '1757366075154-i554z93kl',
  10,
  '#f97316',
  false,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 2. Lead Status: Refusé (NOUVEAU)
INSERT INTO "LeadStatus" (id, name, "organizationId", "order", "color", "isDefault", "createdAt", "updatedAt")
VALUES (
  '1757366075154-ls-refuse',
  '❌ Refusé',
  '1757366075154-i554z93kl',
  11,
  '#dc2626',
  false,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 3. Mappings avec les bons IDs
INSERT INTO "CallToLeadMapping" (id, "callStatusId", "leadStatusId", "organizationId", "isActive", "priority", "description", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  '1757366075154-cs-non-qualifie',
  '1757366075154-ls-non-qualifie',
  '1757366075154-i554z93kl',
  true,
  50,
  'Non qualifié → Non qualifié',
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

INSERT INTO "CallToLeadMapping" (id, "callStatusId", "leadStatusId", "organizationId", "isActive", "priority", "description", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  '1757366075154-cs-refus-definitif',
  '1757366075154-ls-refuse',
  '1757366075154-i554z93kl',
  true,
  51,
  'Refus définitif → Refusé',
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- Vérification complète
SELECT '✅ CALL' as type, name FROM "CallStatus" 
WHERE "organizationId" = '1757366075154-i554z93kl' AND id IN ('1757366075154-cs-non-qualifie', '1757366075154-cs-refus-definitif')
UNION ALL
SELECT '✅ LEAD' as type, name FROM "LeadStatus" 
WHERE "organizationId" = '1757366075154-i554z93kl' AND id IN ('1757366075154-ls-non-qualifie', '1757366075154-ls-refuse')
UNION ALL
SELECT '✅ MAP' as type, description FROM "CallToLeadMapping" 
WHERE "organizationId" = '1757366075154-i554z93kl' AND "callStatusId" IN ('1757366075154-cs-non-qualifie', '1757366075154-cs-refus-definitif');
