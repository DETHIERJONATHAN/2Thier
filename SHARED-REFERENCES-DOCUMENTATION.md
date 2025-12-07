/**
 * DOCUMENTATION COMPLÈTE: PROBLÈME DE DUPLICATION DES CHAMPS D'AFFICHAGE
 * =========================================================================
 * 
 * Date d'analyse: 30 novembre 2025
 * Analyste: Assistant IA
 * 
 * PROBLÈME INITIAL:
 * - Les champs "Longueur toiture" et "Rampant toiture" ne créent pas de copies
 *   dans les champs d'affichage lors de la duplication (bouton repeat)
 * - Le champ "Orientation-Inclinaison" fonctionne correctement et crée "Orientation-Inclinaison-1"
 * 
 * CAUSE RACINE IDENTIFIÉE: SHARED REFERENCES NON GÉRÉES
 * =====================================================
 * 
 * Les nœuds problématiques utilisent des SHARED REFERENCES dans leurs formules:
 * 
 * 1. LONGUEUR TOITURE (ID: adbf2827-d5d7-4ef1-9b38-67f76e9129a6)
 *    ✅ linkedFormulaIds correctement configurés: [
 *        "bfb8cdcf-8cac-44d0-9c88-a448257ffa7c", // PLAN
 *        "93039906-5a5b-490e-bb4b-4382c37e732c"   // Longueu
 *    ]
 *    ✅ linkedVariableIds correctement configurés: ["f2444f70-2854-47a0-ac7e-559d2cbd4ad4"]
 *    ❌ Formules utilisent shared references:
 *       - "PLAN": tokens = ["(","@value.shared-ref-1764095668124-l53956","-","@value.shared-ref-1764095679973-fad7d7",")"]
 *       - "Longueu": tokens = ["@value.shared-ref-1764093355187-f83m8h"]
 * 
 * 2. RAMPANT TOITURE (ID: 9c9f42b2-e0df-4726-8a81-997c0dee71bc)
 *    ✅ linkedFormulaIds correctement configurés: [
 *        "e3ce3679-f3cc-4a68-9483-e4be044567ce", // Formule inclinaison toiture
 *        "a4a07345-a0a3-4703-9468-34300b8e73e1"  // Formule plan toiture
 *    ]
 *    ✅ linkedConditionIds correctement configurés: [
 *        "0495c186-505f-4760-9e4d-aa1330f561bc", // Mesure finale toiture
 *        "0dc9f7a8-a89d-424a-9d02-79b65ef5fafb"  // Mesure première étape toiture
 *    ]
 *    ✅ linkedVariableIds correctement configurés: ["25309ba4-dcba-4757-95c0-6f601f98ce49"]
 *    ❌ Formules utilisent multiples shared references:
 *       - "Formule inclinaison toiture": contient @value.shared-ref-1764093957109-52vog
 *       - "Formule plan toiture": contient @value.shared-ref-1764095668124-l53956, @value.shared-ref-1764095679973-fad7d7
 * 
 * 3. ORIENTATION-INCLINAISON (ID: 54adf56b-ee04-44bf-be20-9636be4383d6) - FONCTIONNE ✅
 *    ✅ linkedVariableIds correctement configurés: ["ac81b3a7-5e5a-4c13-90f5-51503aadc748"]
 *    ✅ N'utilise PAS de shared references: sourceRef = "@table.0d6cf685-fdce-4efc-ab99-ef9847e18f8e"
 *    ✅ Duplication réussie: "Orientation-Inclinaison-1" créé avec autoCreatedDisplayNode=true
 * 
 * SHARED REFERENCES IDENTIFIÉES:
 * ==============================
 * 
 * Les shared references sont des nœuds spéciaux avec:
 * - IDs au format "shared-ref-{timestamp}-{code}"
 * - isSharedReference: true
 * - Utilisées dans les formules via @value.{shared-ref-id}
 * 
 * Exemples trouvés:
 * - shared-ref-1764093355187-f83m8h (Longueur)
 * - shared-ref-1764095668124-l53956 (Hauteur total)
 * - shared-ref-1764095679973-fad7d7 (Hauteur corniche)
 * - shared-ref-1764093957109-52vog (Base)
 * - shared-ref-1764094032592-fj0uj (Rampant)
 * 
 * MÉCANISME DE DUPLICATION ACTUEL:
 * ===============================
 * 
 * 1. API POST /nodes/:nodeId/duplicate-templates
 * 2. Appel à deepCopyNodeInternal
 * 3. copyVariableWithCapacities(autoCreateDisplayNode: true)
 * 4. Création du displayField avec metadata.autoCreatedDisplayNode = true
 * 
 * Le problème: copyVariableWithCapacities ne gère pas les shared references
 * dans les tokens des formules, causant l'échec de la duplication.
 * 
 * SOLUTION TECHNIQUE REQUISE:
 * ===========================
 * 
 * 1. Modifier copyVariableWithCapacities pour:
 *    - Détecter les shared references dans les tokens des formules
 *    - Soit dupliquer les shared references avec des nouveaux IDs
 *    - Soit mapper les références vers les copies existantes
 * 
 * 2. Assurer que les linkedIds sont correctement mis à jour lors de la duplication:
 *    - linkedFormulaIds doivent pointer vers les nouvelles formules
 *    - linkedVariableIds doivent pointer vers les nouvelles variables
 * 
 * 3. Mettre à jour les tokens des formules pour référencer les bonnes shared references
 * 
 * STATUT DES RÉPARATIONS:
 * ======================
 * 
 * ✅ COMPLÉTÉ:
 * - Réparation des linkedFormulaIds pour "Longueur toiture" et "Rampant toiture"
 * - Réparation des linkedConditionIds pour "Rampant toiture"
 * - linkedVariableIds étaient déjà corrects
 * 
 * ❌ EN ATTENTE:
 * - Gestion des shared references dans le mécanisme de duplication
 * - Test de la duplication après correction
 * 
 * COMMANDES DE TEST:
 * ==================
 * 
 * Pour tester la duplication:
 * 1. Aller sur l'interface utilisateur
 * 2. Cliquer sur le bouton "repeat" pour "Longueur toiture"
 * 3. Vérifier si "Longueur toiture-1" apparaît dans les champs d'affichage
 * 4. Répéter pour "Rampant toiture"
 * 
 * FICHIERS IMPACTÉS:
 * ==================
 * 
 * - src/components/TreeBranchLeaf/treebranchleaf-new/api/treebranchleaf-routes.ts
 *   → API de duplication POST /nodes/:nodeId/duplicate-templates
 * 
 * - Fonction copyVariableWithCapacities (à localiser)
 *   → Logique de copie des variables et capacités
 * 
 * - Fonction deepCopyNodeInternal (à localiser)
 *   → Logique de copie en profondeur des nœuds
 */

// Cette documentation doit être intégrée dans le code principal
export const SHARED_REFERENCES_DOCUMENTATION = {
  problemIdentified: '30/11/2025',
  rootCause: 'Shared references not handled in duplication mechanism',
  affectedNodes: [
    'adbf2827-d5d7-4ef1-9b38-67f76e9129a6', // Longueur toiture
    '9c9f42b2-e0df-4726-8a81-997c0dee71bc'  // Rampant toiture
  ],
  workingNode: '54adf56b-ee04-44bf-be20-9636be4383d6', // Orientation-Inclinaison
  sharedReferencesFound: [
    'shared-ref-1764093355187-f83m8h', // Longueur
    'shared-ref-1764095668124-l53956', // Hauteur total
    'shared-ref-1764095679973-fad7d7', // Hauteur corniche
    'shared-ref-1764093957109-52vog',  // Base
    'shared-ref-1764094032592-fj0uj'   // Rampant
  ],
  solutionRequired: 'Update copyVariableWithCapacities to handle shared references in formula tokens'
};