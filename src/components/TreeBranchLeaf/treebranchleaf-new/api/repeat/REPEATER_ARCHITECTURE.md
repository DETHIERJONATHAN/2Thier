/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * 🔄 SYSTÈME DE DUPLICATION DE REPEATER - GUIDE D'ARCHITECTURE
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *
 * Ce document explique le système complet de duplication des repeaters et comment
 * les variables LIÉES sont gérées correctement pour maintenir la structure hiérarchique.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * 1. CONCEPTS FONDAMENTAUX
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *
 * VARIABLE DIRECTE (Direct):
 *   - Appartient à UN nœud spécifique (nodeId = propriétaire)
 *   - Exemple: "Longueur" appartient au nœud "Mesure"
 *   - Duplication: copie simple du nœud et de sa variable
 *
 * VARIABLE LIÉE (Linked):
 *   - Appartient à UN nœud, mais est RÉFÉRENCÉE par plusieurs nœuds via linkedVariableIds
 *   - Exemple: "Orientation - inclinaison" 
 *     * Appartient au nœud "Orientation - inclinaison" (propriétaire)
 *     * Est LIÉE aux nœuds template "Inclinaison" et "Orientation"
 *   - Duplication: doit créer PLUSIEURS copies (une par template qui la lie)
 *
 * NŒUD TEMPLATE:
 *   - Nœud qui sera dupliqué dans un repeater
 *   - Peut LIER des variables externes via linkedVariableIds
 *   - Dans le repeater "toit": Inclinaison, Orientation, Charpente, etc.
 *
 * NŒUD D'INSTANCE:
 *   - Copie du nœud template (ex: Inclinaison-1, Orientation-1)
 *   - Créé lors de chaque duplication du repeater
 *
 * NŒUD D'AFFICHAGE (Display Node):
 *   - Nœud représentant VISUELLEMENT une variable dans l'UI
 *   - DOIT avoir le MÊME PARENT que le nœud PROPRIÉTAIRE de la variable
 *   - Permet l'affichage du champ dans la section appropriée
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * 2. FLUX DE DUPLICATION - ÉTAPE PAR ÉTAPE
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *
 * ÉTAPE 1: CONSTRUCTION DU BLUEPRINT (repeat-blueprint-builder.ts)
 * ────────────────────────────────────────────────────────────────
 *
 *   Input: repeaterNodeId (ex: toit)
 *   
 *   Action 1a - Variables DIRECTES:
 *     - Cherche toutes les variables où nodeId ∈ templateNodeIds
 *     - Ajoute chacune au blueprint avec: primaryTargetNodeId = nodeId
 *   
 *   Action 1b - Variables LIÉES:
 *     - Pour chaque template node, cherche ses linkedVariableIds
 *     - Pour CHAQUE variable liée:
 *       * Crée ONE entrée de variable PER template node qui la lie
 *       * Ajoute: primaryTargetNodeId = templateNodeId (le template qui la lie)
 *   
 *   Output: Blueprint avec VARIABLES EXPANDUES
 *   Exemple pour "Orientation - inclinaison":
 *     - Entry 1: variableId=..., primaryTargetNodeId=Inclinaison
 *     - Entry 2: variableId=..., primaryTargetNodeId=Orientation
 *
 * ÉTAPE 2: CRÉATION DU PLAN (repeat-instantiator.ts)
 * ────────────────────────────────────────────────────
 *
 *   Input: Blueprint + options (suffix, perTemplateSuffixes)
 *   
 *   Pour chaque variable dans le blueprint:
 *     - Resolve suffix pour le template: perTemplateSuffixes[primaryTargetNodeId]
 *     - targetNodeId = `${primaryTargetNodeId}-${suffix}` (ex: Inclinaison-1)
 *     - plannedVariableId = `${variableId}-${suffix}`
 *   
 *   Output: Plan d'instantiation avec IDs déterministes
 *   VariableCopyPlan {
 *     templateVariableId: "...",
 *     targetNodeId: "Inclinaison-1",  // ← IMPORTANT: template node ID + suffix
 *     plannedVariableId: "...-1",
 *     plannedSuffix: 1
 *   }
 *
 * ÉTAPE 3: EXÉCUTION DE LA DUPLICATION (repeat-executor.ts)
 * ────────────────────────────────────────────────────────────
 *
 *   Phase A - Duplication des nœuds:
 *     1. Pour chaque template node dans le plan:
 *        - Duplique le nœud (ex: Inclinaison → Inclinaison-1)
 *        - Sauvegarde dans plannedNodeIdToRealNodeId mapping
 *     2. Build mapping: plannedNodeId → realNodeId
 *
 *   Phase B - Copie des variables:
 *     1. Pour chaque variable dans le plan:
 *        a. Récupère le targetNodeId (ex: Inclinaison-1 - théorique)
 *        b. Cherche le vrai ID dans plannedNodeIdToRealNodeId
 *        c. Appelle copyVariableWithCapacities(
 *             templateVariableId,
 *             suffix,
 *             realTargetNodeId,  // ← Le vrai ID créé
 *             {
 *               autoCreateDisplayNode: true,
 *               isFromRepeaterDuplication: true,
 *               repeatContext: { repeaterNodeId, templateNodeId, ... }
 *             }
 *           )
 *
 * ÉTAPE 4: COPIE DE LA VARIABLE (variable-copy-engine.ts)
 * ─────────────────────────────────────────────────────────
 *
 *   Input:
 *     - templateVariableId: ID de la variable originale
 *     - suffix: le suffix à appliquer (ex: 1)
 *     - newNodeId: ID du nœud INSTANCE qui reçoit la variable (ex: Inclinaison-1)
 *     - options: { autoCreateDisplayNode: true, isFromRepeaterDuplication: true }
 *
 *   Action 4a - Chercher le nœud PROPRIÉTAIRE:
 *     - originalVar = await findVariable(templateVariableId)
 *     - originalOwnerNode = await findNode(originalVar.nodeId)
 *     - Récupère: originalOwnerNode.parentId = parent du propriétaire
 *
 *   Action 4b - Chercher le DISPLAY NODE ORIGINAL:
 *     - Cherche d'abord via metadata.fromVariableId
 *     - Si pas trouvé:
 *       * Cherche dans linkedVariableIds BUT
 *       * EXCLUT les nœuds template eux-mêmes ⚠️ CRITIQUE!
 *       * Récupère: originalDisplayNode.parentId (si trouve)
 *
 *   Action 4c - DÉTERMINER LE PARENT DU DISPLAY NODE COPIÉ:
 *     - PRIORITÉ 1: parentId du display node original (si trouvé)
 *     - PRIORITÉ 2: parentId du nœud PROPRIÉTAIRE original ✅
 *     - PRIORITÉ 3: displayParentId (options)
 *     - PRIORITÉ 4: parentId du nœud dupliqué
 *     - PRIORITÉ 5: null
 *
 *   ⚠️ RÈGLE CRITIQUE:
 *      Le display node DOIT avoir le MÊME parent que le nœud propriétaire original
 *      Raison: C'est où visuellement le champ apparaît dans l'UI
 *      Exemple:
 *        Original: "Orientation-inclinaison" ∈ Nouveau Section
 *        Copié-1: "Orientation-inclinaison-1" ∈ Nouveau Section (SAME parent!)
 *
 *   Action 4d - CRÉER LE DISPLAY NODE:
 *     - displayNodeId = `${originalVar.nodeId}-${suffix}-display`
 *     - Créer le nœud avec:
 *       * parentId = resolvedParentId (déterminé en 4c)
 *       * metadata.fromVariableId = `${templateVariableId}-${suffix}`
 *       * linkedVariableIds = [`${templateVariableId}-${suffix}`]
 *
 *   Output: Nouvelle variable et nœud d'affichage correctement positionné
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * 3. PIÈGES À ÉVITER
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *
 * ❌ PIÈGE 1: Utiliser templateNodeId au lieu de newNodeId pour la copie
 *    Conséquence: Les variables sont attachées au mauvais nœud
 *    Solution: repeat-instantiator.ts fournit targetNodeId avec le suffix appliqué
 *             repeat-executor.ts mappe ce théorique ID au vrai ID créé
 *
 * ❌ PIÈGE 2: Récupérer le parent du nœud TEMPLATE au lieu du PROPRIÉTAIRE
 *    Conséquence: Affichage dans la mauvaise section (Mesure au lieu de Nouveau Section)
 *    Solution: Utiliser originalOwnerNode.parentId (priorité 2)
 *
 * ❌ PIÈGE 3: Trouver le nœud template lui-même en cherchant linkedVariableIds
 *    Conséquence: Le display node n'est pas créé (le template a la variable)
 *    Solution: EXCLURE les nœuds template quand on cherche le display node original
 *             (requête avec: id: { notIn: Array.from(templateIds) })
 *
 * ❌ PIÈGE 4: Ne pas gérer les variables LIÉES différemment des directes
 *    Conséquence: Duplication incomplète (manque de copies pour templates multiples)
 *    Solution: expand linked variables dans blueprint-builder
 *             créer ONE variable entry PER template node qui la lie
 *
 * ❌ PIÈGE 5: Oublier le skip des "Lookup Table" variables
 *    Conséquence: Création de champs inutiles et dupliqués
 *    Solution: repeat-executor.ts vérifie: !displayName.includes('Lookup Table')
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * 4. CHECKLIST DE VALIDATION
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *
 * Avant de considérer la duplication comme réussie:
 *
 * ✅ Blueprint contient les variables liées EXPANDUES
 *    - Pour une variable liée à 2 templates: 2 entries dans blueprint.variables
 *
 * ✅ Plan contient les IDs corrects
 *    - targetNodeId = `${templateNodeId}-${suffix}` (template + suffix)
 *    - plannedVariableId = `${variableId}-${suffix}`
 *
 * ✅ Instances sont créées avec le bon suffix
 *    - Nœuds template créés: Inclinaison-1, Orientation-1, etc.
 *
 * ✅ Variables sont copiées aux bonnes instances
 *    - Chaque variable copie attache au newNodeId correct
 *
 * ✅ Display nodes ont le bon parent
 *    - parentId = parent du nœud PROPRIÉTAIRE original (Nouveau Section)
 *    - ≠ parent du nœud template (Mesure)
 *
 * ✅ Structure hiérarchique correcte
 *    - Variable ORIGINALE et copie dans MÊME section
 *    - Copie affichée sous la section, pas sous l'instance template
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * 5. EXEMPLES CONCRETS
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *
 * EXEMPLE: Variable liée "Orientation - inclinaison"
 *
 * STRUCTURE ORIGINALE:
 *   Nouveau Section (parent)
 *   ├─ Orientation - inclinaison (variable, nœud propriétaire)
 *
 *   Mesure (section avec templates)
 *   ├─ Inclinaison (template node)
 *   │  └─ linkedVariableIds: [Orientation-inclinaison]
 *   ├─ Orientation (template node)
 *      └─ linkedVariableIds: [Orientation-inclinaison]
 *
 * BLUEPRINT GÉNÉRÉ:
 *   variables: [
 *     {
 *       variableId: 10cc7755-...,
 *       nodeId: 440d696a-... (Orientation - inclinaison owner),
 *       primaryTargetNodeId: 7d3dc335-... (Inclinaison template)
 *     },
 *     {
 *       variableId: 10cc7755-...,
 *       nodeId: 440d696a-... (SAME variable),
 *       primaryTargetNodeId: f81b2ace-... (Orientation template)
 *     }
 *   ]
 *
 * PLAN GÉNÉRÉ (avec suffix=1):
 *   variables: [
 *     {
 *       templateVariableId: 10cc7755-...,
 *       targetNodeId: "7d3dc335-...-1" (Inclinaison-1),
 *       plannedVariableId: "10cc7755-...-1"
 *     },
 *     {
 *       templateVariableId: 10cc7755-...,
 *       targetNodeId: "f81b2ace-...-1" (Orientation-1),
 *       plannedVariableId: "10cc7755-...-1" (SAME variable ID)
 *     }
 *   ]
 *
 * RÉSULTAT APRÈS DUPLICATION:
 *   Nouveau Section (parent)
 *   ├─ Orientation - inclinaison (originale)
 *   └─ Orientation - inclinaison-1 (COPIE) ✅
 *      └─ parentId = Nouveau Section (MÊME que l'originale)
 *      └─ linkedVariableIds: [10cc7755-...-1]
 *
 *   Mesure (section avec instances)
 *   ├─ Inclinaison-1 (instance)
 *   ├─ Orientation-1 (instance)
 *   │  └─ linkedVariableIds: [10cc7755-...-1] (lié à la copie)
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════
 */
