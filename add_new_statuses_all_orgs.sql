-- Ajouter les nouveaux statuts à TOUTES les organisations existantes
-- 2 nouveaux call statuses + 1 nouveau lead status + 2 nouveaux mappings

-- Variables pour les IDs des nouveaux statuts
-- On va les insérer et récupérer les IDs

DO $$
DECLARE
  org_id UUID;
  new_call_status_1_id UUID;
  new_call_status_2_id UUID;
  new_lead_status_id UUID;
  org_cursor CURSOR FOR SELECT id FROM "Organization";
BEGIN
  
  -- Boucler sur TOUTES les organisations
  OPEN org_cursor;
  LOOP
    FETCH org_cursor INTO org_id;
    EXIT WHEN NOT FOUND;
    
    -- Insérer "📞 Contacté – Non qualifié" (order 5)
    INSERT INTO "CallStatus" (id, name, value, "organizationId", "order", "isActive", "createdAt", "updatedAt")
    VALUES (
      gen_random_uuid(),
      '📞 Contacté – Non qualifié',
      'non_qualifie',
      org_id,
      5,
      true,
      NOW(),
      NOW()
    ) ON CONFLICT DO NOTHING;
    
    -- Insérer "📞 Contacté – Refus définitif" (order 11)
    INSERT INTO "CallStatus" (id, name, value, "organizationId", "order", "isActive", "createdAt", "updatedAt")
    VALUES (
      gen_random_uuid(),
      '📞 Contacté – Refus définitif',
      'refus_definitif',
      org_id,
      11,
      true,
      NOW(),
      NOW()
    ) ON CONFLICT DO NOTHING;
    
    -- Insérer "⚠️ Non qualifié" lead status (order 10)
    INSERT INTO "LeadStatus" (id, name, value, "organizationId", "order", "isActive", "createdAt", "updatedAt")
    VALUES (
      gen_random_uuid(),
      '⚠️ Non qualifié',
      'non_qualifie',
      org_id,
      10,
      true,
      NOW(),
      NOW()
    ) ON CONFLICT DO NOTHING;
    
    -- Insérer les 2 nouveaux mappings
    INSERT INTO "CallToLeadMapping" (
      id, 
      "callStatusValue", 
      "leadStatusValue", 
      "organizationId", 
      "isActive", 
      "priority",
      "description",
      "createdAt", 
      "updatedAt"
    )
    VALUES (
      gen_random_uuid(),
      'non_qualifie',
      'non_qualifie',
      org_id,
      true,
      50,
      'Non qualifié → Non qualifié',
      NOW(),
      NOW()
    ) ON CONFLICT DO NOTHING;
    
    INSERT INTO "CallToLeadMapping" (
      id, 
      "callStatusValue", 
      "leadStatusValue", 
      "organizationId", 
      "isActive", 
      "priority",
      "description",
      "createdAt", 
      "updatedAt"
    )
    VALUES (
      gen_random_uuid(),
      'refus_definitif',
      'refuse',
      org_id,
      true,
      51,
      'Refus définitif → Refusé',
      NOW(),
      NOW()
    ) ON CONFLICT DO NOTHING;
    
  END LOOP;
  CLOSE org_cursor;
  
  RAISE NOTICE 'Statuts ajoutés à toutes les organisations !';
END $$;

-- Vérifier que les statuts ont été ajoutés
SELECT 
  o.name as "Organisation",
  COUNT(DISTINCT CASE WHEN cs.value IN ('non_qualifie', 'refus_definitif') THEN cs.id END) as "Nouveaux CallStatuses",
  COUNT(DISTINCT CASE WHEN ls.value = 'non_qualifie' THEN ls.id END) as "Nouveaux LeadStatuses",
  COUNT(DISTINCT CASE WHEN ctlm."callStatusValue" IN ('non_qualifie', 'refus_definitif') THEN ctlm.id END) as "Nouveaux Mappings"
FROM "Organization" o
LEFT JOIN "CallStatus" cs ON cs."organizationId" = o.id
LEFT JOIN "LeadStatus" ls ON ls."organizationId" = o.id
LEFT JOIN "CallToLeadMapping" ctlm ON ctlm."organizationId" = o.id
GROUP BY o.id, o.name
ORDER BY o.name;
