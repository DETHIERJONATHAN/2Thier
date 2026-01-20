-- FORCER l'insertion des nouveaux statuts pour 2Thier CRM
-- Utilise les IDs, pas de colonne "value"

-- 1. Call Status: Non qualifié
INSERT INTO "CallStatus" (id, name, "organizationId", "order", "isActive", "createdAt", "updatedAt")
VALUES (
  '1757366075154-cs-non-qualifie',
  '📞 Contacté – Non qualifié',
  '1757366075154-i554z93kl',
  5,
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 2. Call Status: Refus définitif
INSERT INTO "CallStatus" (id, name, "organizationId", "order", "isActive", "createdAt", "updatedAt")
VALUES (
  '1757366075154-cs-refus-definitif',
  '📞 Contacté – Refus définitif',
  '1757366075154-i554z93kl',
  11,
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 3. Lead Status: Non qualifié
INSERT INTO "LeadStatus" (id, name, "organizationId", "order", "isActive", "createdAt", "updatedAt")
VALUES (
  '1757366075154-ls-non-qualifie',
  '⚠️ Non qualifié',
  '1757366075154-i554z93kl',
  10,
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 4. Récupérer l'ID du lead status "Refusé" existant
DO $$
DECLARE
  lead_refuse_id TEXT;
BEGIN
  -- Chercher le lead status "Refusé"
  SELECT id INTO lead_refuse_id FROM "LeadStatus" 
  WHERE "organizationId" = '1757366075154-i554z93kl' 
    AND name LIKE '%Refusé%' OR name LIKE '%refusé%' OR name LIKE '%refuse%'
  LIMIT 1;
  
  -- 5. Mapping: Non qualifié → Non qualifié
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
  
  -- 6. Mapping: Refus définitif → Refusé (utilise l'ID trouvé)
  IF lead_refuse_id IS NOT NULL THEN
    INSERT INTO "CallToLeadMapping" (id, "callStatusId", "leadStatusId", "organizationId", "isActive", "priority", "description", "createdAt", "updatedAt")
    VALUES (
      gen_random_uuid(),
      '1757366075154-cs-refus-definitif',
      lead_refuse_id,
      '1757366075154-i554z93kl',
      true,
      51,
      'Refus définitif → Refusé',
      NOW(),
      NOW()
    ) ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Vérification immédiate
SELECT '✅ CALL STATUSES' as type, name, id FROM "CallStatus" 
WHERE "organizationId" = '1757366075154-i554z93kl' AND name LIKE '%Non qualifié%' OR name LIKE '%Refus définitif%'
UNION ALL
SELECT '✅ LEAD STATUSES' as type, name, id FROM "LeadStatus" 
WHERE "organizationId" = '1757366075154-i554z93kl' AND name LIKE '%Non qualifié%'
UNION ALL
SELECT '✅ MAPPINGS' as type, "callStatusId", "leadStatusId" FROM "CallToLeadMapping" 
WHERE "organizationId" = '1757366075154-i554z93kl' AND "callStatusId" IN ('1757366075154-cs-non-qualifie', '1757366075154-cs-refus-definitif');
