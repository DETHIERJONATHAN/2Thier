/**
 * 🔴 EXPLICATION DU PROBLÈME: Pourquoi le code crée -1-1
 * 
 * FLUX PROBLÉMATIQUE:
 * 
 * 1. Bouton "Ajouter Toit" est cliqué
 *    → API endpoint appelé
 *    → Function: runRepeatExecution()
 * 
 * 2. repeat-executor.ts ligne 64-69 récupère les templates:
 *    const templateNodeIds = plan.nodes.length
 *      ? Array.from(new Set(plan.nodes.map(nodePlan => nodePlan.templateNodeId)))
 *      : blueprint.templateNodeIds;
 * 
 *    ⚠️ PROBLÈME: plan.nodes peut contenir des IDs suffixés!
 *    Exemple: ["6817ee20-5782-4b03-a7b1-0687cc5b4d58-1"]
 * 
 * 3. loadTemplateNodesWithFallback() charge ces nœuds:
 *    const scoped = await prisma.treeBranchLeafNode.findMany({
 *      where: { id: { in: templateNodeIds } }
 *    })
 * 
 *    ✅ Trouve "Rampant toiture-1" (qui est déjà une copie)
 *    ❌ Mais le code la traite comme un template!
 * 
 * 4. deepCopyNodeInternal() crée une copie:
 *    newId = templateId + '-' + suffix
 *    newId = "6817ee20-5782-4b03-a7b1-0687cc5b4d58-1" + '-' + "2"
 *    newId = "6817ee20-5782-4b03-a7b1-0687cc5b4d58-1-2"
 * 
 *    Mais wait... peut-être que le suffix est "1" pas "2"?
 *    Cela créerait "6817ee20-5782-4b03-a7b1-0687cc5b4d58-1-1" ❌
 * 
 * 📊 DIAGRAMME:
 * 
 *   repeater_templateNodeIds:
 *   [
 *     "6817ee20-5782-4b03-a7b1-0687cc5b4d58"  ← Template original (CORRECT)
 *   ]
 * 
 *   Enfants actuels du repeater:
 *   - "Rampant toiture" (uuid)              ← Template
 *   - "Rampant toiture-1" (uuid-1)          ← Copie (correcte)
 *   - "Rampant toiture-1-1" (uuid-1-1)      ← Copie de copie (MAUVAISE!)
 * 
 *   Question: Pourquoi -1-1 existe si repeater_templateNodeIds contient juste uuid?
 * 
 *   Réponse possible: Le plan.nodes contient "uuid-1" au lieu de "uuid"!
 */

// Test d'où vient le plan.nodes
console.log('🎯 DIAGNOSTIC: D\'où vient le plan.nodes ?\n');
console.log('repeat-executor.ts ligne 52-54 extrait le plan de execution:');
console.log('  const { repeaterNodeId, scopeId, plan, blueprint } = execution;\n');

console.log('Le plan vient de repeat-service.ts qui crée:');
console.log('  repeat-instantiator.ts → crée RepeatInstantiationPlan');
console.log('  repeat-executor.ts → utilise plan.nodes et plan.variables\n');

console.log('='.repeat(100) + '\n');

console.log('🔍 SCÉNARIO: Première action de l\'utilisateur\n');
console.log('1. Utilisateur clique "Ajouter Toit" (add button)');
console.log('2. Frontend envoie POST /repeat/:repeaterNodeId');
console.log('3. Backend: repeat-service.ts → createRepeatInstanceAsync()');
console.log('4. Génère RepeatInstantiationPlan via repeat-instantiator.ts\n');

console.log('❓ QUESTION CRITIQUE: Quand le plan.nodes contient "uuid-1"?\n');

console.log('Réponse: Si le repeater_templateNodeIds stocké contient "uuid-1"');
console.log('  → Le plan.nodes héritera de "uuid-1"');
console.log('  → Puis deepCopyNodeInternal l\'utilisera');
console.log('  → Créera "uuid-1-X"\n');

console.log('='.repeat(100) + '\n');

console.log('✅ SOLUTION PROPOSÉE:\n');

console.log('Dans repeat-executor.ts, ligne 64-75:');
console.log('Ajouter un FILTRE pour nettoyer les IDs suffixés\n');

console.log('AVANT:');
console.log(`  const templateNodeIds = plan.nodes.length
    ? Array.from(new Set(plan.nodes.map(nodePlan => nodePlan.templateNodeId)))
    : blueprint.templateNodeIds;\n`);

console.log('APRÈS:');
console.log(`  const hasCopySuffix = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(-\\d+)+$/i;
  const rawIds = plan.nodes.length
    ? Array.from(new Set(plan.nodes.map(nodePlan => nodePlan.templateNodeId)))
    : blueprint.templateNodeIds;
  
  // 🔴 FILTRE CRITIQUE: Retirer les IDs suffixés
  // Les templates ne doivent JAMAIS avoir de suffixes
  const templateNodeIds = rawIds
    .filter(id => !hasCopySuffix.test(id))  // ← AJOUT
    .map(id => id.replace(/(-\\d+)+$/, '')); // ← NETTOYAGE\n`);

console.log('='.repeat(100) + '\n');

console.log('🧪 RÉSULTAT ATTENDU APRÈS LE FIX:\n');
console.log('Avant:');
console.log('  templateNodeIds = ["6817ee20-5782-4b03-a7b1-0687cc5b4d58-1"]');
console.log('  → Charge "Rampant toiture-1" comme template');
console.log('  → Crée "Rampant toiture-1-1" ❌\n');

console.log('Après:');
console.log('  templateNodeIds = ["6817ee20-5782-4b03-a7b1-0687cc5b4d58"]');
console.log('  → Charge "Rampant toiture" comme template');
console.log('  → Crée "Rampant toiture-2" ✅\n');
