-- 📊 DIAGNOSTIC DE COHÉRENCE DB - REPEATER COPIES
-- Vérifier l'état actuel des copies dans la base

-- Trouver toutes les copies du repeater 'toit'
SELECT 
    id,
    name,
    CASE 
        WHEN id LIKE '%-1' THEN 'SUFFIX_1'
        WHEN id LIKE '%-2' THEN 'SUFFIX_2'  
        WHEN id LIKE '%-3' THEN 'SUFFIX_3'
        ELSE 'ORIGINAL'
    END as suffix_type,
    "createdAt",
    "updatedAt"
FROM "TreeBranchLeafNode"
WHERE 
    id IN (
        'adbd88c5-e8c3-4faa-a7e2-1b0d6e9985dd',
        'adf12dbb-076d-4e69-8500-efe648593e1e', 
        '772692ef-c2b7-4630-b45c-12e8355547aa',
        '1203df47-e87e-42fd-b178-31afd89b9c83',
        'a2538f3a-0f05-434e-b5bd-9474944fc939',
        'a556b552-1869-4cfb-a64d-1ac1b6d8278c',
        '49e03a8e-73a5-415f-a6d6-6835829f4dfc',
        '9c9f42b2-e0df-4726-8a81-997c0dee71bc',
        '54adf56b-ee04-44bf-be20-9636be4383d6',
        'dd3a4c6b-26b8-40b9-aa9a-67b1e5a01e5b',
        'adbf2827-d5d7-4ef1-9b38-67f76e9129a6'
    )
    OR id LIKE 'adbd88c5-e8c3-4faa-a7e2-1b0d6e9985dd-%'
    OR id LIKE 'adf12dbb-076d-4e69-8500-efe648593e1e-%'
    OR id LIKE '772692ef-c2b7-4630-b45c-12e8355547aa-%'
    OR id LIKE '1203df47-e87e-42fd-b178-31afd89b9c83-%'
    OR id LIKE 'a2538f3a-0f05-434e-b5bd-9474944fc939-%'
    OR id LIKE 'a556b552-1869-4cfb-a64d-1ac1b6d8278c-%'
    OR id LIKE '49e03a8e-73a5-415f-a6d6-6835829f4dfc-%'
    OR id LIKE '9c9f42b2-e0df-4726-8a81-997c0dee71bc-%'
    OR id LIKE '54adf56b-ee04-44bf-be20-9636be4383d6-%'
    OR id LIKE 'dd3a4c6b-26b8-40b9-aa9a-67b1e5a01e5b-%'
    OR id LIKE 'adbf2827-d5d7-4ef1-9b38-67f76e9129a6-%'
ORDER BY 
    suffix_type, 
    "createdAt";