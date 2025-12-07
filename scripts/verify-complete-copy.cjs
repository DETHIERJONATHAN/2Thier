/**
 * 🔍 DIAGNOSTIC COMPLET: Vérification de TOUT ce qui doit être copié
 * 
 * Pour chaque nœud copié, vérifie que TOUTES les entités liées ont été copiées avec le suffixe:
 * - TreeBranchLeafNodeFormula (formules)
 * - TreeBranchLeafNodeCondition (conditions)
 * - TreeBranchLeafNodeTable (tables)
 * - TreeBranchLeafNodeVariable (variables)
 * - TreeBranchLeafSelectConfig (configurations select)
 * - TreeBranchLeafNumberConfig (configurations number)
 * - Etc.
 * 
 * Usage: node scripts/verify-complete-copy.cjs
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('═'.repeat(100));
  console.log('🔍 VÉRIFICATION COMPLÈTE: Tout ce qui doit être copié avec suffixe');
  console.log('═'.repeat(100));

  // Trouver tous les nœuds copiés (contiennent un suffixe comme -1, -2, etc)
  const allNodes = await prisma.treeBranchLeafNode.findMany({
    select: {
      id: true,
      label: true,
      type: true,
      subType: true,
      hasFormula: true,
      hasCondition: true,
      hasTable: true,
      hasData: true,
      linkedFormulaIds: true,
      linkedConditionIds: true,
      linkedTableIds: true,
      linkedVariableIds: true,
      table_activeId: true,
      metadata: true
    }
  });

  // Identifier originaux et copies
  const copies = allNodes.filter(n => /-\d+$/.test(n.id));
  const originals = allNodes.filter(n => !/-\d+$/.test(n.id));
  
  console.log(`\n📊 Statistiques:`);
  console.log(`   - Nœuds originaux: ${originals.length}`);
  console.log(`   - Nœuds copiés: ${copies.length}`);

  const problems = [];

  console.log(`\n\n📋 VÉRIFICATION DE CHAQUE COPIE`);
  console.log('═'.repeat(100));

  for (const copy of copies) {
    // Extraire l'ID original et le suffixe
    const match = copy.id.match(/^(.+?)(-\d+)$/);
    if (!match) continue;
    
    const originalId = match[1];
    const suffix = match[2];
    
    // Trouver l'original correspondant
    const original = originals.find(o => o.id === originalId);
    if (!original) {
      console.log(`\n⚠️ Original introuvable pour copie ${copy.id}`);
      continue;
    }

    console.log(`\n┌─────────────────────────────────────────────────────────────────────────────`);
    console.log(`│ 📋 COPIE: "${copy.label}" (${copy.id})`);
    console.log(`│ 📍 ORIGINAL: "${original.label}" (${original.id})`);
    console.log(`│ 🏷️ SUFFIXE: ${suffix}`);
    console.log(`│`);

    // 1. VÉRIFIER LES FORMULES
    console.log(`│ 📐 FORMULES:`);
    const originalFormulas = await prisma.treeBranchLeafNodeFormula.findMany({
      where: { nodeId: originalId }
    });
    const copyFormulas = await prisma.treeBranchLeafNodeFormula.findMany({
      where: { nodeId: copy.id }
    });

    if (originalFormulas.length > 0) {
      console.log(`│    Original: ${originalFormulas.length} formule(s)`);
      console.log(`│    Copie: ${copyFormulas.length} formule(s)`);
      
      for (const origFormula of originalFormulas) {
        const expectedCopyId = `${origFormula.id}${suffix}`;
        const found = copyFormulas.find(f => f.id === expectedCopyId);
        if (found) {
          console.log(`│    ✅ ${origFormula.name || origFormula.id} -> ${found.id}`);
        } else {
          console.log(`│    ❌ MANQUANT: ${origFormula.name || origFormula.id} (attendu: ${expectedCopyId})`);
          problems.push({ type: 'formula', originalId: origFormula.id, expectedCopyId, copyNodeId: copy.id });
        }
      }
    } else {
      console.log(`│    ⏭️ Pas de formules`);
    }

    // 2. VÉRIFIER LES CONDITIONS
    console.log(`│`);
    console.log(`│ 📊 CONDITIONS:`);
    const originalConditions = await prisma.treeBranchLeafNodeCondition.findMany({
      where: { nodeId: originalId }
    });
    const copyConditions = await prisma.treeBranchLeafNodeCondition.findMany({
      where: { nodeId: copy.id }
    });

    if (originalConditions.length > 0) {
      console.log(`│    Original: ${originalConditions.length} condition(s)`);
      console.log(`│    Copie: ${copyConditions.length} condition(s)`);
      
      for (const origCond of originalConditions) {
        const expectedCopyId = `${origCond.id}${suffix}`;
        const found = copyConditions.find(c => c.id === expectedCopyId);
        if (found) {
          console.log(`│    ✅ ${origCond.name || origCond.id} -> ${found.id}`);
        } else {
          console.log(`│    ❌ MANQUANT: ${origCond.name || origCond.id} (attendu: ${expectedCopyId})`);
          problems.push({ type: 'condition', originalId: origCond.id, expectedCopyId, copyNodeId: copy.id });
        }
      }
    } else {
      console.log(`│    ⏭️ Pas de conditions`);
    }

    // 3. VÉRIFIER LES TABLES (TreeBranchLeafNodeTable)
    console.log(`│`);
    console.log(`│ 🗂️ TABLES (NodeTable):`);
    const originalTables = await prisma.treeBranchLeafNodeTable.findMany({
      where: { nodeId: originalId }
    });
    const copyTables = await prisma.treeBranchLeafNodeTable.findMany({
      where: { nodeId: copy.id }
    });

    if (originalTables.length > 0) {
      console.log(`│    Original: ${originalTables.length} table(s)`);
      console.log(`│    Copie: ${copyTables.length} table(s)`);
      
      for (const origTable of originalTables) {
        const expectedCopyId = `${origTable.id}${suffix}`;
        const found = copyTables.find(t => t.id === expectedCopyId);
        if (found) {
          console.log(`│    ✅ ${origTable.name || origTable.id} -> ${found.id}`);
        } else {
          console.log(`│    ❌ MANQUANT: ${origTable.name || origTable.id} (attendu: ${expectedCopyId})`);
          problems.push({ type: 'nodeTable', originalId: origTable.id, expectedCopyId, copyNodeId: copy.id });
        }
      }
    } else {
      console.log(`│    ⏭️ Pas de tables`);
    }

    // 4. VÉRIFIER LES VARIABLES
    console.log(`│`);
    console.log(`│ 🔗 VARIABLES:`);
    const originalVariables = await prisma.treeBranchLeafNodeVariable.findMany({
      where: { nodeId: originalId }
    });
    const copyVariables = await prisma.treeBranchLeafNodeVariable.findMany({
      where: { nodeId: copy.id }
    });

    if (originalVariables.length > 0) {
      console.log(`│    Original: ${originalVariables.length} variable(s)`);
      console.log(`│    Copie: ${copyVariables.length} variable(s)`);
      
      for (const origVar of originalVariables) {
        const expectedCopyId = `${origVar.id}${suffix}`;
        const found = copyVariables.find(v => v.id === expectedCopyId);
        if (found) {
          console.log(`│    ✅ ${origVar.displayName || origVar.id} -> ${found.id}`);
        } else {
          console.log(`│    ❌ MANQUANT: ${origVar.displayName || origVar.id} (attendu: ${expectedCopyId})`);
          problems.push({ type: 'variable', originalId: origVar.id, expectedCopyId, copyNodeId: copy.id });
        }
      }
    } else {
      console.log(`│    ⏭️ Pas de variables`);
    }

    // 5. VÉRIFIER LES SELECT CONFIGS
    console.log(`│`);
    console.log(`│ 📊 SELECT CONFIG:`);
    const originalSelectConfig = await prisma.treeBranchLeafSelectConfig.findUnique({
      where: { nodeId: originalId }
    });
    const copySelectConfig = await prisma.treeBranchLeafSelectConfig.findUnique({
      where: { nodeId: copy.id }
    });

    if (originalSelectConfig) {
      console.log(`│    Original: ✅ Existe (tableReference: ${originalSelectConfig.tableReference})`);
      if (copySelectConfig) {
        const expectedTableRef = originalSelectConfig.tableReference ? `${originalSelectConfig.tableReference}${suffix}` : null;
        if (copySelectConfig.tableReference === expectedTableRef) {
          console.log(`│    Copie: ✅ Existe avec bon tableReference: ${copySelectConfig.tableReference}`);
        } else {
          console.log(`│    Copie: ⚠️ Existe mais tableReference incorrect!`);
          console.log(`│           Actuel: ${copySelectConfig.tableReference}`);
          console.log(`│           Attendu: ${expectedTableRef}`);
          problems.push({ type: 'selectConfig_tableRef', originalId, copyNodeId: copy.id, actual: copySelectConfig.tableReference, expected: expectedTableRef });
        }
      } else {
        console.log(`│    Copie: ❌ MANQUANT!`);
        problems.push({ type: 'selectConfig', originalId, copyNodeId: copy.id });
      }
    } else {
      console.log(`│    ⏭️ Pas de select config`);
    }

    // 6. VÉRIFIER LES NUMBER CONFIGS
    console.log(`│`);
    console.log(`│ 🔢 NUMBER CONFIG:`);
    const originalNumberConfig = await prisma.treeBranchLeafNumberConfig.findUnique({
      where: { nodeId: originalId }
    });
    const copyNumberConfig = await prisma.treeBranchLeafNumberConfig.findUnique({
      where: { nodeId: copy.id }
    });

    if (originalNumberConfig) {
      console.log(`│    Original: ✅ Existe`);
      if (copyNumberConfig) {
        console.log(`│    Copie: ✅ Existe`);
      } else {
        console.log(`│    Copie: ❌ MANQUANT!`);
        problems.push({ type: 'numberConfig', originalId, copyNodeId: copy.id });
      }
    } else {
      console.log(`│    ⏭️ Pas de number config`);
    }

    // 7. VÉRIFIER LES LINKED IDs
    console.log(`│`);
    console.log(`│ 🔗 LINKED IDs:`);
    
    // linkedFormulaIds
    if (original.linkedFormulaIds && original.linkedFormulaIds.length > 0) {
      const expectedLinkedFormulas = original.linkedFormulaIds.map(id => `${id}${suffix}`);
      const actualLinkedFormulas = copy.linkedFormulaIds || [];
      const missing = expectedLinkedFormulas.filter(id => !actualLinkedFormulas.includes(id));
      if (missing.length === 0) {
        console.log(`│    linkedFormulaIds: ✅ ${actualLinkedFormulas.length} correctement mis à jour`);
      } else {
        console.log(`│    linkedFormulaIds: ❌ ${missing.length} manquant(s)`);
        problems.push({ type: 'linkedFormulaIds', copyNodeId: copy.id, missing });
      }
    }

    // linkedConditionIds
    if (original.linkedConditionIds && original.linkedConditionIds.length > 0) {
      const expectedLinkedConditions = original.linkedConditionIds.map(id => `${id}${suffix}`);
      const actualLinkedConditions = copy.linkedConditionIds || [];
      const missing = expectedLinkedConditions.filter(id => !actualLinkedConditions.includes(id));
      if (missing.length === 0) {
        console.log(`│    linkedConditionIds: ✅ ${actualLinkedConditions.length} correctement mis à jour`);
      } else {
        console.log(`│    linkedConditionIds: ❌ ${missing.length} manquant(s)`);
        problems.push({ type: 'linkedConditionIds', copyNodeId: copy.id, missing });
      }
    }

    // linkedTableIds
    if (original.linkedTableIds && original.linkedTableIds.length > 0) {
      const expectedLinkedTables = original.linkedTableIds.map(id => `${id}${suffix}`);
      const actualLinkedTables = copy.linkedTableIds || [];
      const missing = expectedLinkedTables.filter(id => !actualLinkedTables.includes(id));
      if (missing.length === 0) {
        console.log(`│    linkedTableIds: ✅ ${actualLinkedTables.length} correctement mis à jour`);
      } else {
        console.log(`│    linkedTableIds: ❌ ${missing.length} manquant(s)`);
        problems.push({ type: 'linkedTableIds', copyNodeId: copy.id, missing });
      }
    }

    // linkedVariableIds
    if (original.linkedVariableIds && original.linkedVariableIds.length > 0) {
      const expectedLinkedVars = original.linkedVariableIds.map(id => `${id}${suffix}`);
      const actualLinkedVars = copy.linkedVariableIds || [];
      const missing = expectedLinkedVars.filter(id => !actualLinkedVars.includes(id));
      if (missing.length === 0) {
        console.log(`│    linkedVariableIds: ✅ ${actualLinkedVars.length} correctement mis à jour`);
      } else {
        console.log(`│    linkedVariableIds: ❌ ${missing.length} manquant(s)`);
        problems.push({ type: 'linkedVariableIds', copyNodeId: copy.id, missing });
      }
    }

    // table_activeId
    if (original.table_activeId) {
      const expectedTableActiveId = `${original.table_activeId}${suffix}`;
      if (copy.table_activeId === expectedTableActiveId) {
        console.log(`│    table_activeId: ✅ ${copy.table_activeId}`);
      } else {
        console.log(`│    table_activeId: ❌ Incorrect`);
        console.log(`│           Actuel: ${copy.table_activeId}`);
        console.log(`│           Attendu: ${expectedTableActiveId}`);
        problems.push({ type: 'table_activeId', copyNodeId: copy.id, actual: copy.table_activeId, expected: expectedTableActiveId });
      }
    }

    console.log(`└─────────────────────────────────────────────────────────────────────────────`);
  }

  // RÉSUMÉ DES PROBLÈMES
  console.log('\n\n' + '═'.repeat(100));
  console.log('📊 RÉSUMÉ DES PROBLÈMES');
  console.log('═'.repeat(100));

  if (problems.length === 0) {
    console.log('\n✅ Aucun problème détecté! Toutes les copies sont complètes.');
  } else {
    console.log(`\n❌ ${problems.length} PROBLÈME(S) DÉTECTÉ(S):\n`);

    // Grouper par type
    const byType = {};
    for (const p of problems) {
      if (!byType[p.type]) byType[p.type] = [];
      byType[p.type].push(p);
    }

    for (const [type, items] of Object.entries(byType)) {
      console.log(`\n📌 ${type.toUpperCase()}: ${items.length} problème(s)`);
      for (const item of items.slice(0, 5)) {
        console.log(`   - ${item.copyNodeId}: ${item.originalId || ''} ${item.expected ? `(attendu: ${item.expected})` : ''}`);
      }
      if (items.length > 5) {
        console.log(`   ... et ${items.length - 5} de plus`);
      }
    }

    console.log(`\n\n📝 ACTIONS REQUISES:`);
    console.log(`   1. Vérifier que deep-copy-service.ts copie TOUTES les entités liées`);
    console.log(`   2. Vérifier que les suffixes sont appliqués à TOUS les IDs`);
    console.log(`   3. Vérifier que les SELECT configs sont dupliquées avec le bon tableReference`);
  }

  console.log('\n' + '═'.repeat(100));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
