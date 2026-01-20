-- VERSION FINALE CORRECTE - Insertion statuts 2Thier CRM

-- 1. Call Status: Non qualifié (EXISTS)
-- 2. Call Status: Refus définitif (EXISTS)  ✅ Déjà créés !

-- 3. Lead Status: Non qualifié (BESOIN DE color, pas isActive)
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

-- 4. Récupérer l'ID du lead status "Refusé" existant
DO $$
DECLARE
  lead_refuse_id TEXT;
BEGIN
  -- Chercher le lead status "Refusé"
  SELECT id INTO lead_refuse_id FROM "LeadStatus" 
  WHERE "organizationId" = '1757366075154-i554z93kl' 
    AND (name LIKE '%Refusé%' OR name LIKE '%refusé%' OR name LIKE '%refuse%' OR name LIKE '%Refuse%')
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
  );
  
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
    );
  ELSE
    RAISE NOTICE 'Lead Status "Refusé" non trouvé - mapping 2 ignoré';
  END IF;
END $$;

-- Vérification
SELECT '✅ CALL' as type, name FROM "CallStatus" 
WHERE "organizationId" = '1757366075154-i554z93kl' AND id IN ('1757366075154-cs-non-qualifie', '1757366075154-cs-refus-definitif')
UNION ALL
SELECT '✅ LEAD' as type, name FROM "LeadStatus" 
WHERE "organizationId" = '1757366075154-i554z93kl' AND id = '1757366075154-ls-non-qualifie'
UNION ALL
SELECT '✅ MAP' as type, description FROM "CallToLeadMapping" 
WHERE "organizationId" = '1757366075154-i554z93kl' AND "callStatusId" IN ('1757366075154-cs-non-qualifie', '1757366075154-cs-refus-definitif');
