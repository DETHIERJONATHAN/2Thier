-- Script de diagnostic pour vérifier les variables et les données
-- Fichier: diagnostic_variables.sql

-- =========================================================================
-- DIAGNOSTIC COMPLET DES VARIABLES ET DONNÉES
-- =========================================================================

-- 1. Vérifier combien de variables existent
SELECT 
    'Variables dans TreeBranchLeafNodeVariable' as table_name,
    COUNT(*) as count
FROM "TreeBranchLeafNodeVariable";

-- 2. Voir quelques exemples de variables
SELECT 
    'Exemples de variables' as info,
    "nodeId", 
    "exposedKey", 
    "displayName", 
    "unit"
FROM "TreeBranchLeafNodeVariable" 
LIMIT 5;

-- 3. Vérifier les données de soumission
SELECT 
    'Données TreeBranchLeafSubmissionData' as table_name,
    COUNT(*) as total_count,
    COUNT("fieldLabel") as with_field_label,
    COUNT("variableKey") as with_variable_key,
    COUNT(CASE WHEN "isVariable" = true THEN 1 END) as is_variable_true,
    COUNT(CASE WHEN "isVariable" = false THEN 1 END) as is_variable_false,
    COUNT(CASE WHEN "isVariable" IS NULL THEN 1 END) as is_variable_null
FROM "TreeBranchLeafSubmissionData";

-- 4. Vérifier si certains nodeId de submission ont des variables associées
SELECT 
    'Correspondance nodeId' as info,
    COUNT(DISTINCT sd."nodeId") as submission_nodes,
    COUNT(DISTINCT v."nodeId") as variable_nodes,
    COUNT(DISTINCT sd."nodeId") FILTER (WHERE v."nodeId" IS NOT NULL) as matching_nodes
FROM "TreeBranchLeafSubmissionData" sd
LEFT JOIN "TreeBranchLeafNodeVariable" v ON sd."nodeId" = v."nodeId";

-- 5. Exemple concret de correspondance
SELECT 
    'Exemple de correspondance' as info,
    sd."id" as submission_id,
    sd."nodeId",
    sd."value",
    sd."fieldLabel",
    sd."variableKey",
    sd."isVariable",
    v."exposedKey",
    v."displayName",
    v."unit"
FROM "TreeBranchLeafSubmissionData" sd
LEFT JOIN "TreeBranchLeafNodeVariable" v ON sd."nodeId" = v."nodeId"
WHERE v."nodeId" IS NOT NULL
LIMIT 3;